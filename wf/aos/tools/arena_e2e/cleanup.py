"""Independent cleanup stages; unknown scope state never counts as collected."""
import signal
import socket
import subprocess
import time
import os


class CleanupError(RuntimeError):
    pass


def collected(query):
    props = dict(line.split('=', 1) for line in query.stdout.splitlines() if '=' in line)
    # systemctl returns 0 for show of a not-found unit on this system.
    return query.returncode == 0 and props.get('LoadState') == 'not-found' and props.get('ActiveState') == 'inactive'


def cleanup(proc, unit, result):
    errors = []
    previous = signal.signal(signal.SIGTERM, signal.SIG_IGN)
    def attempt(label, action):
        try:
            return action()
        except Exception as exc:
            errors.append(label + ': ' + str(exc))
    def stop():
        command = subprocess.run(['systemctl', '--user', 'stop', unit], capture_output=True, text=True, timeout=20)
        result['scope_stop'] = dict(exit_code=command.returncode, stderr=command.stderr)
    def kill(sig):
        if proc is None:
            return
        try:
            os.killpg(proc.pid, sig)
        except ProcessLookupError:
            pass
    def verify():
        deadline = time.monotonic() + 10
        while True:
            query = subprocess.run(['systemctl', '--user', 'show', unit, '-p', 'LoadState', '-p', 'ActiveState'],
                                   capture_output=True, text=True, timeout=5)
            result['scope_after'] = query.stdout.strip()
            result['scope_query_exit_code'] = query.returncode
            if collected(query):
                result['scope_cleaned'] = True
                return
            if time.monotonic() >= deadline:
                raise CleanupError('scope not confirmed collected: ' + repr(query.stdout) + query.stderr)
            time.sleep(0.2)
    def port():
        with socket.socket() as sock:
            sock.settimeout(2)
            result['port_closed'] = sock.connect_ex(('127.0.0.1', result['port'])) != 0
        if not result['port_closed']:
            raise CleanupError('server port remains open')
    try:
        try:
            attempt('scope_stop', stop)
        finally:
            try:
                attempt('group_term', lambda: kill(signal.SIGTERM))
                attempt('group_kill', lambda: kill(signal.SIGKILL))
                attempt('reap', lambda: proc.wait(timeout=10) if proc is not None else None)
            finally:
                try:
                    attempt('scope_verify', verify)
                finally:
                    attempt('port_verify', port)
    finally:
        signal.signal(signal.SIGTERM, previous)
    result['cleanup_errors'] = errors
    if errors:
        raise CleanupError('; '.join(errors))
