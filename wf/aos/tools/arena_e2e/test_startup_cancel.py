"""Cancellation during Popen must clean before the caller releases its lock."""
import fcntl
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('runner', Path(__file__).with_name('runner.py'))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class StartupCancelTests(unittest.TestCase):
    def test_cancel_during_popen_keeps_lock_until_cleanup(self):
        cancelled = [False]
        child = Mock()
        events = []
        with tempfile.TemporaryDirectory(prefix='cancel-', dir='/tmp/aos/arena_cheater/qa') as temp:
            lockpath = Path(temp) / 'lock'
            with lockpath.open('a') as owner:
                fcntl.flock(owner, fcntl.LOCK_EX)
                def spawn(*args, **kwargs):
                    cancelled[0] = True
                    events.append('spawn')
                    return child
                def clean(proc, unit, result):
                    self.assertIs(proc, child)
                    with lockpath.open('a') as contender:
                        with self.assertRaises(BlockingIOError):
                            fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    events.append('cleanup_while_locked')
                with patch.object(r.subprocess, 'Popen', side_effect=spawn), patch.object(r, 'cleanup', side_effect=clean):
                    with self.assertRaisesRegex(RuntimeError, 'cancelled'):
                        r.execute([], '.', {}, None, None, 1, 'fake.scope', {}, cancelled)
            with lockpath.open('a') as contender:
                fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertEqual(events, ['spawn', 'cleanup_while_locked'])

    def test_popen_error_still_cleans(self):
        with patch.object(r.subprocess, 'Popen', side_effect=OSError('spawn error')), patch.object(r, 'cleanup') as clean:
            with self.assertRaises(OSError):
                r.execute([], '.', {}, None, None, 1, 'fake.scope', {}, [False])
            clean.assert_called_once_with(None, 'fake.scope', {})


if __name__ == '__main__':
    unittest.main()
