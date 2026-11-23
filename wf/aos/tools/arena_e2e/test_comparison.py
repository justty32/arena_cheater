"""Offline comparison tests; no Node or browser processes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


c = load('comparison')
r = load('runner')


def report(file='old.spec.ts', title='case / with slash', project='chromium', status='expected'):
    return {'suites': [{'title': file, 'file': file, 'suites': [
        {'title': 'group', 'file': file, 'specs': [
            {'title': title, 'tests': [{'projectName': project, 'status': status}]}]}]}]}


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        self.before = c.extract_cases(report())[0]

    def test_file_move_opt_in_and_legacy_default(self):
        after = c.extract_cases(report('new.spec.ts'))[0]
        self.assertFalse(c.compare_cases(self.before, after)['identical'])
        self.assertTrue(c.compare_cases(self.before, after, 'title_project')['identical'])
        legacy = [{k: v for k, v in case.items() if k in ('name', 'status')} for case in self.before]
        self.assertTrue(c.compare_cases(legacy, self.before)['identical'])

    def test_describe_path_and_slash_remain_structured(self):
        self.assertEqual(self.before[0]['title_path'], ['group', 'case / with slash'])
        changed = report()
        changed['suites'][0]['suites'][0]['title'] = 'other group'
        self.assertFalse(c.compare_cases(self.before, c.extract_cases(changed)[0], 'title_project')['identical'])

    def test_project_and_title_changes(self):
        for field in ({'project': 'firefox'}, {'title': 'renamed'}):
            result = c.compare_cases(self.before, c.extract_cases(report(**field))[0], 'title_project')
            self.assertFalse(result['identical'])
            self.assertEqual(len(result['added']), 1)
            self.assertEqual(len(result['removed']), 1)

    def test_status_and_duplicate_multiplicity(self):
        failed = c.extract_cases(report(status='unexpected'))[0]
        for mode in c.MODES:
            same = c.compare_cases(self.before * 2, self.before * 2, mode)
            self.assertTrue(same['identical'])
            self.assertEqual(same['duplicates']['before'][0]['count'], 2)
            for after in (self.before, self.before + failed, failed):
                result = c.compare_cases(self.before * 2, after, mode)
                self.assertFalse(result['identical'])
                self.assertEqual(len(result['changed']), 1)

    def test_empty_and_order_independent(self):
        self.assertTrue(c.compare_cases([], [], 'title_project')['identical'])
        other = c.extract_cases(report(title='other'))[0]
        self.assertTrue(c.compare_cases(self.before + other, other + self.before, 'title_project')['identical'])
        self.assertEqual(c.extract_cases({}), ([], []))

    def test_failures_keep_errors_and_legacy_names(self):
        data = report(status='unexpected')
        data['suites'][0]['suites'][0]['specs'][0]['tests'][0]['results'] = [{'error': {'message': 'oops'}}]
        cases, failures = c.extract_cases(data)
        self.assertEqual(cases[0]['name'], 'old.spec.ts / group / case / with slash / chromium')
        self.assertEqual(failures[0]['errors'], [{'message': 'oops'}])

    def test_invalid_mode_and_legacy_block_before_external_commands(self):
        with tempfile.TemporaryDirectory(dir='/tmp/aos/arena_cheater/qa') as temp:
            baseline = Path(temp) / 'result.json'
            baseline.write_text(json.dumps({'status': 'DONE', 'cases': [{'name': 'legacy', 'status': 'expected'}]}))
            for mode, path in [('unknown', ''), ('title_project', str(baseline))]:
                with patch.object(r, 'ROOT', Path(temp)), patch.object(r, 'capture') as capture, patch.object(r, 'execute') as execute:
                    result = r.run('workspace', path, False, mode)
                self.assertEqual(result['status'], 'BLOCKED')
                self.assertEqual(result['failure_stage'], 'preflight')
                capture.assert_not_called()
                execute.assert_not_called()

    def test_invalid_structured_fields(self):
        for update in ({'title_path': None}, {'title_path': []}, {'title_path': [1]}, {'project': None}):
            with self.assertRaises(ValueError):
                c.compare_cases([dict(self.before[0], **update)], self.before, 'title_project')


if __name__ == '__main__':
    unittest.main()
