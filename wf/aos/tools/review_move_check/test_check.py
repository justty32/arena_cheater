"""Run with python3 -B -m unittest discover -s <tool folder>."""
import pathlib
from unittest.mock import patch
import tempfile
import unittest
from check import compare, run
from scan import scan, cycles


class CheckTests(unittest.TestCase):
    def test_import_body_and_literal_preservation(self):
        a = "import { x } from './a';\nexport const answer = 'import x from y';\n"
        b = "import { x } from '../a';\nexport const answer = 'import x from y';\n"
        self.assertEqual(scan(a)['body'], scan(b)['body'])
        self.assertNotEqual(scan(a)['body'], scan(b.replace('answer', 'wrong'))['body'])

    def test_exports(self):
        text = 'export { a, b as c, type D }; export type E = string; export default 2; export * as ns from "./n";'
        self.assertEqual(scan(text)['exports'], ['D', 'E', 'a', 'c', 'default', 'ns'])

    def test_dynamic_inline_and_reexport(self):
        text = 'type A = import("./a").A; const b = import("./b"); export { c } from "./c";'
        self.assertEqual([r[0] for r in scan(text)['refs']], ['./a', './b', './c'])
        self.assertIn('nonliteral_import', scan('import(name)')['warnings'])
        self.assertIn('unterminated_static_import', scan('import x from "./a"')['warnings'])

    def test_export_without_semicolon_does_not_capture_next_import(self):
        result = scan('export const a = 1\nimport {b} from "./b";')
        self.assertEqual([(r[0], r[3]) for r in result['refs']], [('./b', 'static')])
        self.assertFalse(result['warnings'])
        self.assertEqual(scan('export const a = 1\nconst from = "./not-a-module";')['refs'], [])

    def test_real_reexport_clauses(self):
        for clause in ('{ b }', 'type { B }', '*', '* as ns', 'type *', 'type * as ns'):
            with self.subTest(clause=clause):
                result = scan('export ' + clause + ' from "./b"\nimport {c} from "./c";')
                self.assertEqual([(r[0], r[3]) for r in result['refs']],
                                 [('./b', 'reexport'), ('./c', 'static')])
        result = scan('export { b }\nimport {c} from "./c";')
        self.assertEqual([(r[0], r[3]) for r in result['refs']], [('./c', 'static')])

    def test_computed_import_not_literal(self):
        for expr in ('"./x" + suffix', 'name', '`./${name}`', '"./x", { with: { type: "json" } }'):
            with self.subTest(expr=expr):
                result = scan('const p = import(' + expr + ');')
                self.assertEqual(result['refs'], [])
                self.assertIn('nonliteral_import', result['warnings'])
        self.assertEqual(scan('const p = import("./x");')['refs'][0][0], './x')

    def test_import_without_semicolon_keeps_code(self):
        result = scan('import x from "./a"\nexport const y = 2;')
        self.assertIn('unsupported_import_tail', result['warnings'])
        self.assertIn('export const y = 2;', result['body'])

    def test_binding_changes_visible(self):
        a = {'a.ts': 'import {x} from "./b";\nexport {x};', 'b.ts': 'export const x = 1;'}
        b = dict(a, **{'a.ts': a['a.ts'].replace('{x} from', '{y as x} from')})
        report = compare(a, b, {})['comparisons'][0]
        self.assertTrue(report['body_equal'])
        self.assertFalse(report['import_bindings_equal'])

    def test_facade_still_reported(self):
        before = {'a.ts': 'export const a = 1;'}
        after = {'a.ts': 'export { a } from "./sub/a";', 'sub/a.ts': before['a.ts']}
        report = compare(before, after, {})
        self.assertEqual(len(report['comparisons']), 2)
        self.assertTrue(next(r for r in report['comparisons'] if r['after'] == 'sub/a.ts')['body_equal'])
        self.assertFalse(next(r for r in report['comparisons'] if r['after'] == 'a.ts')['body_equal'])

    def test_cycles(self):
        self.assertEqual(cycles({'a': ['b'], 'b': ['a'], 'c': ['c']}), [['a', 'b'], ['c']])

    def test_wrong_reference_not_hidden(self):
        old = {'a.ts': 'export const x = 1;', 'b.ts': 'export const y = 2;',
               'c.ts': 'import { x } from "./a";\nexport { x };'}
        new = dict(old, **{'c.ts': old['c.ts'].replace('./a', './b')})
        report = compare(old, new, {})['comparisons'][0]
        self.assertTrue(report['body_equal'])
        self.assertFalse(report['references_equal'])

    def test_missing_and_explicit_move(self):
        old = {'a.ts': 'export const x = 1;', 'b.ts': 'import {x} from "./a";\nexport {x};'}
        new = {'sub/a.ts': old['a.ts'], 'b.ts': old['b.ts'].replace('./a', './sub/a')}
        report = compare(old, new, {'a.ts': 'sub/a.ts'})
        self.assertFalse(report['graph_after']['missing'])
        self.assertTrue(all(r['references_equal'] for r in report['comparisons']))
        new['b.ts'] = old['b.ts']
        self.assertEqual(compare(old, new, {})['graph_after']['missing'][0]['specifier'], './a')
        self.assertTrue(compare(old, new, {'no.ts': 'also-no.ts'})['invalid_moves'])

    def test_worktree_readonly(self):
        # Fixture creation is test-only, never part of the production tool.
        with tempfile.TemporaryDirectory(prefix='review-move-', dir='/tmp/aos/arena_cheater/review') as folder:
            root = pathlib.Path(folder)
            (root / 'a.ts').write_text('export const a = 2;')
            before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}
            responses = [b'fixture-commit\n', b'a.ts\0', b'export const a = 1;', b'a.ts\0']
            with patch('check.git', side_effect=responses):
                report = run(folder, 'HEAD', 'WORKTREE', '.', {})
            after = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}
            self.assertEqual(before, after)
            self.assertFalse(report['comparisons'][0]['body_equal'])
            with self.assertRaises(ValueError):
                run(folder, 'HEAD', 'WORKTREE', '../', {})


if __name__ == '__main__':
    unittest.main()
