"""Non-Node fault injection for cleanup ordering and strict state validation."""
import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('cleanup', Path(__file__).with_name('cleanup.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


class CleanupTests(unittest.TestCase):
    def test_only_known_collected_state(self):
        for code, text in [(1, ''), (0, ''), (0, 'LoadState=loaded\nActiveState=deactivating'),
                           (1, 'LoadState=not-found\nActiveState=inactive')]:
            self.assertFalse(c.collected(subprocess.CompletedProcess([], code, text, '')))
        self.assertTrue(c.collected(subprocess.CompletedProcess([], 0, 'LoadState=not-found\nActiveState=inactive', '')))

    def test_stop_timeout_does_not_skip_fallback(self):
        proc = Mock(pid=123456)
        result = {'port': 12345}
        def command(args, **kwargs):
            if 'stop' in args:
                raise subprocess.TimeoutExpired(args, 20)
            return subprocess.CompletedProcess(args, 0, 'LoadState=not-found\nActiveState=inactive', '')
        with patch.object(c.subprocess, 'run', side_effect=command), patch.object(c.os, 'killpg') as kill, \
                patch.object(c.socket, 'socket') as sock:
            sock.return_value.__enter__.return_value.connect_ex.return_value = 111
            with self.assertRaises(c.CleanupError):
                c.cleanup(proc, 'fake.scope', result)
            self.assertEqual(kill.call_count, 2)
            proc.wait.assert_called_once()
            self.assertTrue(result['scope_cleaned'])
            self.assertTrue(result['port_closed'])
            self.assertIn('scope_stop', result['cleanup_errors'][0])


if __name__ == '__main__':
    unittest.main()
