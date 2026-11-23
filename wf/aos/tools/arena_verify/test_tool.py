"""Failure injection for the step-to-step cleanup gate; no Node is launched."""
import os
from pathlib import Path
import runpy
import subprocess
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, os.environ["AOS_HOME"] + "/lib")
from aos.py import fn

with patch.object(fn, "main"):
    verify = runpy.run_path(str(Path(__file__).with_name("tool.py")))["arena_verify"]


class CleanupGateTests(unittest.TestCase):
    def run_case(self, failure=None, test_exit=0):
        def launch(*args, **kwargs):
            process = Mock()
            process.returncode = test_exit if launcher.call_count == 1 else 0
            process.poll.return_value = process.returncode
            process.wait.return_value = process.returncode
            return process

        def control(command, **kwargs):
            if command[2] == "stop" and failure == "stop_timeout":
                raise subprocess.TimeoutExpired(command, 15)
            if command[2] == "show":
                if failure == "show_error":
                    raise OSError("injected query failure")
                state = "loaded" if failure == "scope_remaining" else "not-found"
                return subprocess.CompletedProcess(command, 0, "LoadState=" + state + "\nActiveState=inactive\n", "")
            return subprocess.CompletedProcess(command, 0, "", "")

        with patch("subprocess.Popen", side_effect=launch) as launcher, patch("subprocess.run", side_effect=control):
            result = verify(log_dir="/tmp/aos/arena_cheater/dev/cleanup-gate-tests", step="all")
        return result, launcher.call_count

    def test_cleanup_failures_skip_build(self):
        for failure in ("stop_timeout", "show_error", "scope_remaining"):
            with self.subTest(failure=failure):
                result, count = self.run_case(failure)
                self.assertEqual(count, 1)
                self.assertFalse(result["ok"])
                self.assertNotIn("build", result["steps"])
                self.assertEqual(result["skipped_steps"]["build"], {
                    "reason": "previous_step_cleanup_failed", "after": "test"})

    def test_failed_test_with_successful_cleanup_still_builds(self):
        result, count = self.run_case(test_exit=7)
        self.assertEqual(count, 2)
        self.assertEqual(result["steps"]["test"]["exit_code"], 7)
        self.assertEqual(result["steps"]["build"]["exit_code"], 0)
        self.assertFalse(result["ok"])
        self.assertNotIn("skipped_steps", result)


if __name__ == "__main__":
    unittest.main()
