"""Failure injection for the step-to-step cleanup gate; no Node is launched."""
import os
from pathlib import Path
import runpy
import subprocess
import shutil
import tempfile
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


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.root = Path('/tmp/aos/arena_cheater/dev/workspace-tests')
        self.root.mkdir(parents=True, exist_ok=True)
        self.directory = tempfile.TemporaryDirectory(dir=self.root)
        self.copy = Path(self.directory.name)
        self.repo = Path(__file__).resolve().parents[4]
        for name in ('package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'src/main.ts'):
            target = self.copy / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self.repo / name, target)
        for name in ('src/arena', 'tests/simulation'):
            (self.copy / name).mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        self.directory.cleanup()

    def rejected(self, workspace):
        with patch.object(fn, 'fail', side_effect=ValueError) as fail, patch('subprocess.Popen') as launcher:
            with self.assertRaises(ValueError):
                verify(workspace=str(workspace))
            self.assertEqual(fail.call_args.args[0], 'ArgumentsBad')
            launcher.assert_not_called()

    def test_rejects_outside_missing_and_lookalike_prefix(self):
        for path in ('/tmp', '/tmp/aos/arena_cheater-not-repo', self.copy / 'missing'):
            with self.subTest(path=path):
                self.rejected(path)

    def test_rejects_symlink_escape(self):
        link = self.copy / 'escape'
        link.symlink_to('/tmp', target_is_directory=True)
        self.rejected(link)

    def test_rejects_non_repo_and_changed_toolchain(self):
        self.rejected(self.copy / 'src')
        (self.copy / 'package.json').write_text('{}')
        self.rejected(self.copy)

    def test_rejects_extra_or_changed_config(self):
        for name in ('vitest.config.ts', 'vitest.config.js', 'vite.config.js', 'tsconfig.extra.json'):
            with self.subTest(name=name):
                path = self.copy / name
                path.write_text('export default { root: "/tmp" };')
                self.rejected(self.copy)
                path.unlink()
        (self.copy / 'vite.config.ts').write_text('export default {};')
        self.rejected(self.copy)

    def test_rejects_source_and_test_symlink_escapes(self):
        for name, target in (('src/arena', self.repo / 'src/arena'),
                             ('tests', self.repo / 'tests'),
                             ('src/arena/escape.ts', self.repo / 'src/main.ts'),
                             ('tests/simulation/escape.ts', self.repo / 'src/main.ts')):
            with self.subTest(name=name):
                path = self.copy / name
                backup = path.with_name(path.name + '-backup')
                existed = path.exists()
                if existed:
                    path.rename(backup)
                path.symlink_to(target, target_is_directory=target.is_dir())
                self.rejected(self.copy)
                path.unlink()
                if existed:
                    backup.rename(path)

    def test_rejects_internal_and_two_stage_symlinks(self):
        shared = self.copy / 'shared-arena'
        shared.mkdir()
        arena = self.copy / 'src/arena'
        arena.rmdir()
        arena.symlink_to(shared, target_is_directory=True)
        self.rejected(self.copy)
        for name, target in (('escape.ts', self.repo / 'src/main.ts'),
                             ('escape-dir', self.repo / 'src/arena')):
            path = shared / name
            path.symlink_to(target, target_is_directory=target.is_dir())
            self.rejected(self.copy)
            path.unlink()
        arena.unlink()
        arena.mkdir()
        (arena / 'local.ts').write_text('export {};')
        (arena / 'alias.ts').symlink_to(arena / 'local.ts')
        self.rejected(self.copy)

    def test_accepts_copy_and_resolves_symlink(self):
        link = self.root / (self.copy.name + '-link')
        link.symlink_to(self.copy, target_is_directory=True)
        try:
            process = Mock(returncode=0)
            process.poll.return_value = 0
            process.wait.return_value = 0
            control = subprocess.CompletedProcess([], 0, 'LoadState=not-found\nActiveState=inactive\n', '')
            with patch('subprocess.Popen', return_value=process) as launch, patch('subprocess.run', return_value=control):
                result = verify(workspace=str(link), log_dir=str(self.copy / 'logs'), step='test')
            self.assertTrue(result['ok'])
            self.assertEqual(result['project'], str(self.copy.resolve()))
            self.assertEqual(launch.call_args.kwargs['cwd'], self.copy.resolve())
        finally:
            link.unlink()


if __name__ == "__main__":
    unittest.main()
