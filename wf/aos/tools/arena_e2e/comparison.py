"""Structured Playwright case identities and multiplicity-preserving comparisons."""
from collections import Counter, defaultdict

MODES = ('full_name', 'title_project')


def validate_cases(cases, mode):
    if mode not in MODES:
        raise ValueError('unknown comparison_mode: ' + str(mode))
    if not isinstance(cases, list):
        raise ValueError('cases must be a list')
    for case in cases:
        if not isinstance(case, dict) or not isinstance(case.get('name'), str) or not isinstance(case.get('status'), str):
            raise ValueError('cases require string name/status')
        if mode == 'title_project':
            path = case.get('title_path')
            if (not isinstance(path, list) or not path or not all(isinstance(s, str) for s in path)
                    or not isinstance(case.get('project'), str)):
                raise ValueError('title_project requires structured title_path/project; legacy baseline unsupported; create a new baseline')


def extract_cases(report):
    cases, failures = [], []

    def walk(suites, parents=(), titles=(), depth=0):
        for suite in suites:
            prefix = parents + (suite.get('title', ''),)
            # Playwright JSON top-level suites represent files, not describe groups.
            title_prefix = titles if depth == 0 else titles + (suite.get('title', ''),)
            for spec in suite.get('specs', []):
                for test in spec.get('tests', []):
                    project = test.get('projectName', '')
                    name = ' / '.join(prefix + (spec['title'], project))
                    status = test.get('status')
                    cases.append(dict(name=name, status=status,
                                      title_path=list(title_prefix + (spec['title'],)), project=project))
                    if status not in ('expected', 'skipped'):
                        failures.append(dict(name=name, status=status,
                                             errors=[r.get('error', {}) for r in test.get('results', [])]))
            walk(suite.get('suites', []), prefix, title_prefix, depth + 1)

    walk(report.get('suites', []))
    return cases, failures


def compare_cases(before_cases, after_cases, mode='full_name'):
    validate_cases(before_cases, mode)
    validate_cases(after_cases, mode)

    def index(cases):
        result = defaultdict(Counter)
        for case in cases:
            key = case['name'] if mode == 'full_name' else (tuple(case['title_path']), case['project'])
            result[key][case['status']] += 1
        return result

    def label(key):
        if mode == 'full_name':
            return key
        return dict(title_path=list(key[0]), project=key[1])

    def ordered(keys):
        return [label(key) for key in sorted(keys)]

    def duplicates(index):
        return [dict(identity=label(key), count=sum(index[key].values()), statuses=dict(index[key]))
                for key in sorted(index) if sum(index[key].values()) > 1]

    before, after = index(before_cases), index(after_cases)
    return dict(mode=mode, identical=before == after,
                added=ordered(after.keys() - before.keys()),
                removed=ordered(before.keys() - after.keys()),
                changed=ordered(k for k in before.keys() & after.keys() if before[k] != after[k]),
                duplicates=dict(before=duplicates(before), after=duplicates(after)))
