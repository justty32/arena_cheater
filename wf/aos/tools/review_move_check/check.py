"""Read-only git snapshots and comparison reports."""
import hashlib
import pathlib
import subprocess
from scan import scan, resolve, cycles

SUFFIXES = ('.ts', '.tsx', '.js', '.css', '.json')


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], timeout=30)


def snapshot(root, revision, scope):
    if revision == 'WORKTREE':
        paths = git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', scope).decode().split('\0')
        result = {}
        for name in sorted(set(paths) - {''}):
            path = root / name
            if name.endswith(SUFFIXES) and path.is_file():
                if path.is_symlink() or not path.resolve().is_relative_to(root):
                    raise ValueError('symlink outside snapshot contract: ' + name)
                result[name] = path.read_bytes().decode('utf-8')
        return result
    commit = git(root, 'rev-parse', '--verify', '--end-of-options', revision + '^{commit}').decode().strip()
    names = git(root, 'ls-tree', '-r', '--name-only', '-z', commit, '--', scope).decode().split('\0')
    return {p: git(root, 'show', commit + ':' + p).decode('utf-8')
            for p in names if p.endswith(SUFFIXES)}


def analyze(files):
    parsed, graph, missing = {}, {}, []
    for path, text in sorted(files.items()):
        if not path.endswith(('.ts', '.tsx', '.js')):
            continue
        parsed[path] = scan(text)
        graph[path] = []
        for spec, _, _, kind in parsed[path]['refs']:
            target = resolve(path, spec, files)
            if target is False:
                missing.append({'file': path, 'specifier': spec, 'kind': kind})
            elif target:
                graph[path].append(target)
    return parsed, {'cycles': cycles(graph), 'missing': missing,
                    'warnings': [{'file': p, 'warnings': d['warnings']} for p, d in parsed.items() if d['warnings']],
                    'nodes': len(graph), 'edges': sum(map(len, graph.values()))}


def compare(before, after, moves):
    old, old_graph = analyze(before)
    new, new_graph = analyze(after)
    mapping = dict(moves)
    inferred = []
    # Include facade-to-implementation extraction when the original still exists.
    for path in sorted(after.keys() - before.keys()):
        candidates = [p for p in before if pathlib.PurePosixPath(p).name == pathlib.PurePosixPath(path).name]
        if len(candidates) == 1 and candidates[0] not in mapping:
            mapping[candidates[0]] = path
            inferred.append({'before': candidates[0], 'after': path})
    pairs = {(p, mapping.get(p, p)) for p in before
             if mapping.get(p, p) in after and (p in mapping or before[p] != after[mapping.get(p, p)])}
    pairs.update((p, p) for p in mapping if p in before and p in after and before[p] != after[p])
    reports = []
    for left, right in sorted(pairs):
        a, b = old.get(left), new.get(right)
        report = {'before': left, 'after': right,
                  'bytes_equal': before[left] == after[right]}
        if a and b:
            def references(path, data, files, remap):
                values = []
                for spec, _, _, kind in data['refs']:
                    target = resolve(path, spec, files)
                    values.append((kind, remap.get(target, target) if target else spec))
                return sorted(values)
            report.update(body_equal=a['body'] == b['body'],
                          import_bindings_equal=a['import_bindings'] == b['import_bindings'],
                          exports_before=a['exports'], exports_after=b['exports'],
                          exports_equal=a['exports'] == b['exports'],
                          references_equal=references(left, a, before, mapping) == references(right, b, after, {}),
                          warnings_before=a['warnings'], warnings_after=b['warnings'])
        reports.append(report)
    digest = lambda files: hashlib.sha256(''.join(p + '\0' + files[p] + '\0' for p in sorted(files)).encode()).hexdigest()
    return {'comparisons': reports, 'inferred_moves': inferred,
            'invalid_moves': [{'before': a, 'after': b} for a, b in moves.items() if a not in before or b not in after],
            'added': sorted(after.keys() - before.keys()), 'deleted': sorted(before.keys() - after.keys()),
            'graph_before': old_graph, 'graph_after': new_graph,
            'snapshot_sha256': {'before': digest(before), 'after': digest(after)},
            'limitations': ['Lexical evidence only; not a TypeScript semantic or API equivalence proof.',
                            'Static imports require semicolons; export names are lexical hints, not resolved star exports.',
                            'Template literals are opaque; regex literals, JSX and computed imports require manual review.',
                            'Graph includes type-only references; external packages are not resolved; scope limits resolution.',
                            'Automatic same-basename mappings require human confirmation; added/deleted files remain visible.']}


def run(repo, base, target, scope, moves):
    root = pathlib.Path(repo).resolve()
    if not isinstance(moves, dict) or not all(isinstance(a, str) and isinstance(b, str) for a, b in moves.items()):
        raise ValueError('moves must map string paths to string paths')
    if len(set(moves.values())) != len(moves):
        raise ValueError('move targets must be unique')
    if scope.startswith('/') or '..' in pathlib.PurePosixPath(scope).parts or scope.startswith(':'):
        raise ValueError('scope must be a literal repo-relative directory')
    if base == 'WORKTREE':
        raise ValueError('base must be a commit')
    literal_scope = ':(literal)' + scope
    return compare(snapshot(root, base, literal_scope), snapshot(root, target, literal_scope), moves)
