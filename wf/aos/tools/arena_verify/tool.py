#!/usr/bin/env python3
"""tool-python 骨架 - 最小、合格、能跑的工具：把兩個數相加。抄出去改 @fn.tool 底下那個函數（名字、docstring、參數、內容）就是新工具（說明看 README.md）。"""
# ---- setup: find the aos package (keep these lines as they are) ----
import os, sys
sys.dont_write_bytecode = True
_d = os.path.dirname(os.path.realpath(__file__))
_found = [_d]
if os.environ.get("AOS_HOME"):
    _found.append(os.path.join(os.environ["AOS_HOME"], "lib"))
sys.path[:0] = _found
try:
    from aos.py import fn
except ModuleNotFoundError as _e:
    if _e.name != "aos":
        raise
    if os.environ.get("AOS_HOME"):
        _line = "%s: error: ModuleMissing %s not found (under $AOS_HOME/lib, or next to tool.py)\n" % (os.path.basename(_found[0]), _e.name)
    else:
        _line = "%s: error: HomeMissing AOS_HOME is not set (set it, or copy the %s package folder next to tool.py)\n" % (os.path.basename(_found[0]), _e.name)
    sys.stderr.write(_line)
    sys.stdout.write(_line)
    sys.exit(1)
# ---- your tool: change the lines below ----


@fn.tool(meta={"side_effect": True, "deterministic": False, "timeout_ms": 900000})
def arena_verify(log_dir: str = "/tmp/aos/arena_cheater/dev/verify/", step: str = "all", timeout_s: int = 300, lock_timeout_s: int = 120) -> dict:
    """持有共享 Node flock，依序跑 npm test／npm run build，回傳退出碼、耗時與 log 摘要。不執行 E2E。驗證失敗仍回 JSON，請讀 ok。

    Args:
      log_dir: log 存放目錄；每次建立獨立子目錄，避免覆寫。
      step: all、test 或 build；all 即使 test 失敗仍執行 build。
      timeout_s: 每一步執行秒數上限，1 至 300。
      lock_timeout_s: 等待 Node 鎖的秒數上限，1 至 180。
    """
    import errno
    import fcntl
    import pathlib
    import re
    import signal
    import subprocess
    import tempfile
    import time
    import uuid

    MEMORY_MAX = "4G"
    CPU_QUOTA = "400%"
    TASKS_MAX = "256"

    if step not in ("all", "test", "build"):
        fn.fail("ArgumentsBad", "step must be all, test or build")
    if not 1 <= timeout_s <= 300 or not 1 <= lock_timeout_s <= 180:
        fn.fail("ArgumentsBad", "timeout_s must be 1..300; lock_timeout_s must be 1..180")
    directory = pathlib.Path(log_dir).expanduser().resolve()
    allowed_root = pathlib.Path("/tmp/aos/arena_cheater").resolve()
    if not directory.is_relative_to(allowed_root):
        fn.fail("ArgumentsBad", "log_dir must resolve under /tmp/aos/arena_cheater/")

    cancelled = False

    def request_cancel(signum, frame):
        nonlocal cancelled
        cancelled = True

    previous_sigterm = signal.signal(signal.SIGTERM, request_cancel)
    started = time.monotonic()
    project = pathlib.Path(__file__).resolve().parents[4]
    commands = {"test": ["npm", "test"], "build": ["npm", "run", "build"]}
    result = {"ok": False, "project": str(project), "steps": {}, "lock_wait_seconds": 0.0}
    lock_path = pathlib.Path("/tmp/aos/arena_cheater/locks/node.lock")
    try:
        directory.mkdir(parents=True, exist_ok=True)
        run_dir = pathlib.Path(tempfile.mkdtemp(prefix="verify-", dir=directory))
        result["log_dir"] = str(run_dir)
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        with lock_path.open("a") as lock:
            waiting = time.monotonic()
            while True:
                if cancelled:
                    result["cancelled"] = True
                    return result
                try:
                    # Same advisory flock as the CLI; retain the descriptor across both steps.
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except OSError as error:
                    if error.errno not in (errno.EACCES, errno.EAGAIN):
                        raise
                    if time.monotonic() - waiting >= lock_timeout_s:
                        result["error"] = "lock_timeout"
                        result["lock_wait_seconds"] = round(time.monotonic() - waiting, 3)
                        return result
                    time.sleep(0.05)
            result["lock_wait_seconds"] = round(time.monotonic() - waiting, 3)
            try:
                for name in (commands if step == "all" else [step]):
                    if cancelled:
                        break
                    path = run_dir / (name + ".log")
                    before = time.monotonic()
                    unit = "arena-verify-" + name + "-" + uuid.uuid4().hex + ".scope"
                    scoped_command = ["systemd-run", "--user", "--scope", "--collect", "--unit=" + unit,
                                      "-p", "MemoryMax=" + MEMORY_MAX, "-p", "CPUQuota=" + CPU_QUOTA,
                                      "-p", "TasksMax=" + TASKS_MAX, "--", *commands[name]]
                    entry = {"command": commands[name], "scope_command": scoped_command, "unit": unit,
                             "exit_code": None, "timed_out": False, "log_path": str(path)}
                    process = None
                    with path.open("w", encoding="utf-8") as output:
                        try:
                            process = subprocess.Popen(scoped_command, cwd=project, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
                            deadline = before + timeout_s
                            while process.poll() is None and not cancelled:
                                remaining = deadline - time.monotonic()
                                if remaining <= 0:
                                    entry["timed_out"] = True
                                    break
                                try:
                                    process.wait(timeout=min(0.1, remaining))
                                except subprocess.TimeoutExpired:
                                    pass
                        except OSError as error:
                            entry["error"] = str(error)
                            output.write(str(error) + "\n")
                        finally:
                            # Cancellation only sets a flag; every cleanup phase retains the lock.
                            errors = []
                            try:
                                try:
                                    stopped = subprocess.run(["systemctl", "--user", "stop", unit],
                                                             capture_output=True, text=True, timeout=15)
                                    entry["stop_exit_code"] = stopped.returncode
                                except (OSError, subprocess.TimeoutExpired) as error:
                                    errors.append("stop: " + str(error))
                            finally:
                                try:
                                    if process is not None:
                                        try:
                                            if process.poll() is None:
                                                os.killpg(process.pid, signal.SIGKILL)
                                        except ProcessLookupError:
                                            pass
                                        except OSError as error:
                                            errors.append("kill: " + str(error))
                                        try:
                                            process.wait(timeout=15)
                                        except (OSError, subprocess.TimeoutExpired) as error:
                                            errors.append("reap: " + str(error))
                                        entry["exit_code"] = process.returncode
                                finally:
                                    entry["scope_cleaned"] = False
                                    try:
                                        status = subprocess.run(["systemctl", "--user", "show", unit,
                                                                 "-p", "LoadState", "-p", "ActiveState"],
                                                                capture_output=True, text=True, timeout=15)
                                        entry["scope_status"] = status.stdout.strip()
                                        entry["scope_cleaned"] = "LoadState=not-found" in status.stdout
                                        if not entry["scope_cleaned"]:
                                            errors.append("scope: " + (status.stderr or status.stdout).strip())
                                    except (OSError, subprocess.TimeoutExpired) as error:
                                        errors.append("scope: " + str(error))
                            if errors:
                                entry["cleanup_error"] = "; ".join(errors)
                    entry["duration_seconds"] = round(time.monotonic() - before, 3)
                    if name == "test":
                        text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", path.read_text(encoding="utf-8", errors="replace"))
                        for key, label in (("test_files", "Test Files"), ("test_cases", "Tests")):
                            match = re.search(r"^\s*" + label + r"\s+.*?\((\d+)\)\s*$", text, re.MULTILINE)
                            entry[key] = int(match.group(1)) if match else None
                    result["steps"][name] = entry
                    if not entry.get("scope_cleaned") or entry.get("cleanup_error"):
                        if step == "all" and name == "test":
                            result["skipped_steps"] = {"build": {"reason": "previous_step_cleanup_failed", "after": name}}
                        break
                result["ok"] = not cancelled and all(item["exit_code"] == 0 and not item["timed_out"] and item.get("scope_cleaned", False) and not item.get("cleanup_error") for item in result["steps"].values())
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)
    except OSError as error:
        result["error"] = str(error)
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)
        if cancelled:
            result["cancelled"] = True
        result["duration_seconds"] = round(time.monotonic() - started, 3)
    return result


fn.main(arena_verify)
