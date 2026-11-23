"""Fixed-project E2E runner; not an OS sandbox."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tarfile
import time
import uuid
import importlib.util

_cleanup_spec = importlib.util.spec_from_file_location("arena_cleanup", Path(__file__).with_name("cleanup.py"))
_cleanup_module = importlib.util.module_from_spec(_cleanup_spec)
_cleanup_spec.loader.exec_module(_cleanup_module)
cleanup = _cleanup_module.cleanup
_comparison_spec = importlib.util.spec_from_file_location("arena_comparison", Path(__file__).with_name("comparison.py"))
_comparison_module = importlib.util.module_from_spec(_comparison_spec)
_comparison_spec.loader.exec_module(_comparison_module)

REPO = Path('/mnt/c/code/mine/arena_cheater')
ROOT = Path('/tmp/aos/arena_cheater/qa')
LOCK = Path('/tmp/aos/arena_cheater/locks/node.lock')
MEMORY_MAX = '4G'
CPU_QUOTA = '400%'
TASKS_MAX = 256


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def capture(args, cwd=REPO, timeout=30):
    return subprocess.check_output(args, cwd=cwd, stderr=subprocess.STDOUT, timeout=timeout).decode()


def execute(args, cwd, env, stdout, stderr, timeout, unit, result, cancelled):
    # Own a process group so timeout/error cleanup includes Vite and browser children.
    proc = None
    try:
        check_cancelled(cancelled)
        proc = subprocess.Popen(args, cwd=cwd, env=env, stdout=stdout, stderr=stderr,
                                start_new_session=True)
        check_cancelled(cancelled)
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            check_cancelled(cancelled)
            show = subprocess.run(['systemctl', '--user', 'show', unit, '-p', 'MemoryMax',
                                   '-p', 'CPUQuotaPerSecUSec', '-p', 'TasksMax', '-p', 'ActiveState'],
                                  capture_output=True, text=True, timeout=10)
            props = dict(line.split('=', 1) for line in show.stdout.splitlines() if '=' in line)
            if props.get('ActiveState') == 'active':
                result['scope_properties'] = props
                if (props.get('MemoryMax') != '4294967296' or props.get('TasksMax') != '256'
                        or props.get('CPUQuotaPerSecUSec') != '4s'):
                    raise RuntimeError('scope resource properties do not match requested limits')
                break
            if proc.poll() is not None:
                raise RuntimeError('systemd scope failed before limits could be verified')
            time.sleep(0.1)
        else:
            raise RuntimeError('scope resource verification timed out')
        deadline = time.monotonic() + timeout
        while True:
            check_cancelled(cancelled)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise subprocess.TimeoutExpired(args, timeout)
            try:
                return proc.wait(timeout=min(0.2, remaining))
            except subprocess.TimeoutExpired:
                pass
    finally:
        cleanup(proc, unit, result)


def check_cancelled(cancelled):
    if cancelled[0]:
        raise RuntimeError('cancelled by SIGTERM')


def run(source, baseline, preflight_only, comparison_mode='full_name'):
    started = time.monotonic()
    ROOT.mkdir(parents=True, exist_ok=True)
    folder = ROOT / ('e2e-' + uuid.uuid4().hex)
    folder.mkdir(exist_ok=False)
    result = dict(status='BLOCKED', source=source, source_hash=None, exit_code=None,
                  started_at=now(), passed=0, failed=0, skipped=0, failures=[],
                  failure_stage='preflight', artifacts={'directory': str(folder)})
    stage = 'preflight'
    cancelled = [False]
    def cancel(signum, frame):
        cancelled[0] = True
    previous_sigterm = signal.signal(signal.SIGTERM, cancel)
    try:
        _comparison_module.validate_cases([], comparison_mode)
        baseline_data = None
        if baseline:
            target = Path(baseline).resolve()
            if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
                raise ValueError('baseline must be an existing qa temporary result.json')
            baseline_data = json.loads(target.read_text())
            if baseline_data.get('status') != 'DONE' or not isinstance(baseline_data.get('cases'), list):
                raise ValueError('baseline must be a successful arena_e2e result with cases')
            _comparison_module.validate_cases(baseline_data['cases'], comparison_mode)
        if source != 'workspace':
            if not source or source.startswith('-'):
                raise ValueError('invalid commit identifier')
            commit = capture(['git', 'rev-parse', '--verify', source + '^{commit}']).strip()
        else:
            commit = capture(['git', 'rev-parse', 'HEAD']).strip()
        result['source_hash'] = commit
        for binary in ('node', 'npm'):
            import shutil
            if not shutil.which(binary):
                raise RuntimeError(binary + ' unavailable')
        if not (REPO / 'node_modules/@playwright/test').is_dir():
            raise RuntimeError('project Playwright dependency unavailable')
        cache = Path(os.environ.get('PLAYWRIGHT_BROWSERS_PATH', str(Path.home() / '.cache/ms-playwright')))
        browsers = list(cache.glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'))
        if not browsers:
            raise RuntimeError('Chromium headless shell unavailable')
        library_checks = {}
        for browser in browsers:
            check = subprocess.run(['ldd', str(browser)], capture_output=True, text=True, timeout=15)
            library_checks[str(browser)] = check.stdout + check.stderr
            if check.returncode or 'not found' in check.stdout:
                raise RuntimeError('Chromium system libraries unavailable: ' + str(browser) + '\n' + check.stdout)
        (folder / 'preflight.json').write_text(json.dumps(library_checks, indent=2))
        if preflight_only:
            result.update(status='DONE', failure_stage=None, preflight_only=True)
            return finish(result, folder, started)
        check_cancelled(cancelled)
        stage = 'lock'
        LOCK.parent.mkdir(parents=True, exist_ok=True)
        with LOCK.open('a') as lock:
            deadline = time.monotonic() + 300
            while True:
                check_cancelled(cancelled)
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Node task lock wait exceeded 300 seconds')
                    time.sleep(0.25)
            stage = 'snapshot'
            if source == 'workspace':
                work = REPO
                files = capture(['git', 'ls-files', '-co', '--exclude-standard', '-z']).split('\0')
                digest = hashlib.sha256()
                for name in sorted(set(files) - {''}):
                    path = REPO / name
                    digest.update(name.encode() + b'\0')
                    if path.is_file():
                        digest.update(path.read_bytes())
                result['workspace_fingerprint'] = digest.hexdigest()
            else:
                work = folder / 'source'
                work.mkdir(exist_ok=False)
                archive = folder / 'source.tar'
                with archive.open('wb') as output:
                    subprocess.run(['git', 'archive', commit], cwd=REPO, stdout=output,
                                   stderr=subprocess.PIPE, check=True, timeout=30)
                with tarfile.open(archive) as tar:
                    tar.extractall(work, filter='data')
                (work / 'node_modules').symlink_to(REPO / 'node_modules', target_is_directory=True)
            # Force a new server; port allocation races fail rather than reusing another source.
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            result['port'] = port
            config = folder / 'playwright.config.ts'
            config.write_text('import base from ' + json.dumps(str(work / 'playwright.config.ts')) + ';\n'
                              'export default { ...base, testDir: ' + json.dumps(str(work / 'tests/e2e')) + ', '
                              'outputDir: ' + json.dumps(str(folder / 'test-results')) + ', '
                              'reporter: [["json"]], webServer: {...base.webServer, cwd: ' + json.dumps(str(work)) + ', reuseExistingServer: false} };\n')
            stage = 'scope'
            unit = 'arena-e2e-' + uuid.uuid4().hex + '.scope'
            result['scope_unit'] = unit
            result['scope_limits'] = dict(MemoryMax=MEMORY_MAX, CPUQuota=CPU_QUOTA, TasksMax=TASKS_MAX)
            env = dict(os.environ, ARENA_E2E_PORT=str(port), FORCE_COLOR='0', RAYON_NUM_THREADS='2')
            env.pop('PLAYWRIGHT_JSON_OUTPUT_NAME', None)
            env.pop('PLAYWRIGHT_JSON_OUTPUT_DIR', None)
            env['PLAYWRIGHT_JSON_OUTPUT_FILE'] = str(folder / 'playwright.json')
            with (folder / 'stdout.txt').open('w') as out, (folder / 'stderr.txt').open('w') as err:
                result['exit_code'] = execute(['systemd-run', '--user', '--scope', '--collect',
                    '--unit=' + unit, '-p', 'MemoryMax=' + MEMORY_MAX, '-p', 'CPUQuota=' + CPU_QUOTA,
                    '-p', 'TasksMax=' + str(TASKS_MAX), '--', 'npm', 'run', 'test:e2e', '--', '--config', str(config)],
                    work, env, out, err, 420, unit, result, cancelled)
            stage = 'report'
            report = json.loads((folder / 'playwright.json').read_text())
            cases, result['failures'] = _comparison_module.extract_cases(report)
            result['cases'] = cases
            result.update(passed=sum(c['status'] == 'expected' for c in cases),
                          failed=sum(c['status'] not in ('expected', 'skipped') for c in cases),
                          skipped=sum(c['status'] == 'skipped' for c in cases))
            result['report_errors'] = report.get('errors', [])
            result['status'] = 'DONE' if result['exit_code'] == 0 and not result['failed'] and cases else 'FAILED'
            result['failure_stage'] = None if result['status'] == 'DONE' else 'e2e'
            if not cases:
                result.update(status='BLOCKED', failure_stage='startup_or_discovery')
            if baseline_data:
                stage = 'comparison'
                result['comparison'] = dict(baseline=baseline, **_comparison_module.compare_cases(
                    baseline_data['cases'], cases, comparison_mode))
                if not result['comparison']['identical'] and result['status'] == 'DONE':
                    result.update(status='FAILED', failure_stage='comparison')
    except Exception as exc:
        result.update(status='BLOCKED', failure_stage='cleanup' if result.get('cleanup_errors') else stage, error=str(exc))
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)
    return finish(result, folder, started)


def finish(result, folder, started):
    result['ended_at'] = now()
    result['duration_s'] = round(time.monotonic() - started, 3)
    result['artifacts'].update(result=str(folder / 'result.json'), report=str(folder / 'playwright.json'),
                               stdout=str(folder / 'stdout.txt'), stderr=str(folder / 'stderr.txt'))
    (folder / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result
