"""Conservative lexical evidence, not a TypeScript parser."""
import posixpath
import re

TOKEN = re.compile(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\s+|.', re.S)
STRING = re.compile(r'''^["']''')


def scan(text):
    tokens = [(m.group(), m.start(), m.end()) for m in TOKEN.finditer(text)
              if not m.group().isspace() and not m.group().startswith(('//', '/*'))]
    refs, imports, exports, warnings, bindings = [], [], [], [], []
    words = [t[0] for t in tokens]
    for i, (word, start, end) in enumerate(tokens):
        if word not in ('import', 'export'):
            continue
        following = words[i + 1:i + 3]
        if word == 'import' and following[:1] == ['.']:
            continue
        if word == 'import' and following[:1] == ['(']:
            if len(following) > 1 and STRING.match(following[1]) and words[i + 3:i + 4] == [')']:
                refs.append((following[1][1:-1], tokens[i + 2][1], tokens[i + 2][2], 'dynamic_or_type'))
            else:
                warnings.append('nonliteral_import')
            continue
        stop = next((j for j in range(i + 1, len(tokens)) if words[j] == ';'), None)
        if word == 'import':
            if stop is None:
                warnings.append('unterminated_static_import')
                continue
            segment = words[i + 1:stop]
            spec = i + 1 if segment and STRING.match(segment[0]) else None
            for j in range(i + 1, stop):
                if words[j] == 'from' and j + 1 < stop and STRING.match(words[j + 1]):
                    spec = j + 1
            if spec is None:
                warnings.append('unsupported_static_import')
            else:
                refs.append((words[spec][1:-1], tokens[spec][1], tokens[spec][2], 'static'))
                tail = words[spec + 1:stop]
                if tail and not (tail[0] in ('with', 'assert') and tail[1:2] == ['{'] and tail[-1:] == ['}']):
                    warnings.append('unsupported_import_tail')
                    continue
                imports.append((start, tokens[stop][2]))
                bindings.append([w if j != spec else '<module>' for j, w in enumerate(words[i:stop + 1], i)])
        else:
            if following[:1] == ['default']:
                exports.append('default')
            elif following[:1] == ['*']:
                exports.append(words[i + 3] if words[i + 2:i + 3] == ['as'] else '*')
            elif following[:1] in (['{'], ['type']):
                brace = i + 1 if words[i + 1] == '{' else i + 2
                if brace < len(words) and words[brace] == '{':
                    close = next((j for j in range(brace + 1, len(words)) if words[j] == '}'), None)
                    if close:
                        groups = [[]]
                        for name in words[brace + 1:close]:
                            if name == ',':
                                groups.append([])
                            else:
                                groups[-1].append(name)
                        for names in groups:
                            if names:
                                exports.append(names[-1])
            j = i + 1
            while j < len(words) and words[j] in ('declare', 'abstract', 'async'):
                j += 1
            if j + 1 < len(words) and words[j] in ('const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'namespace'):
                if words[j + 1] != '{':
                    exports.append(words[j + 1])
            # A re-export clause must immediately follow export [type].
            # Never search a declaration body or the next statement for `from`.
            clause = i + 1
            if words[clause:clause + 1] == ['type']:
                clause += 1
            after_clause = None
            if words[clause:clause + 1] == ['*']:
                after_clause = clause + 1
                if words[after_clause:after_clause + 1] == ['as']:
                    after_clause += 2
            elif words[clause:clause + 1] == ['{']:
                close = next((j for j in range(clause + 1, len(words)) if words[j] == '}'), None)
                if close is not None:
                    after_clause = close + 1
            if (after_clause is not None and words[after_clause:after_clause + 1] == ['from']
                    and after_clause + 1 < len(words) and STRING.match(words[after_clause + 1])):
                spec = after_clause + 1
                refs.append((words[spec][1:-1], tokens[spec][1], tokens[spec][2], 'reexport'))
    edits = [(a, b, '') for a, b in imports]
    # Preserve all non-import bytes; only module literals are normalized.
    edits.extend((a, b, '"<module>"') for _, a, b, _ in refs
                 if not any(x <= a < y for x, y in imports))
    for a, b, replacement in sorted(set(edits), reverse=True):
        text = text[:a] + replacement + text[b:]
    return {'body': text, 'refs': refs, 'exports': sorted(set(exports)), 'import_bindings': bindings,
            'warnings': sorted(set(warnings))}


def resolve(path, spec, files):
    if not spec.startswith('.'):
        return None
    base = posixpath.normpath(posixpath.join(posixpath.dirname(path), spec))
    candidates = [base, base + '.ts', base + '.tsx', base + '.js', base + '.json',
                  base + '.css', base + '/index.ts', base + '/index.tsx']
    if base.endswith('.js'):
        candidates.extend([base[:-3] + '.ts', base[:-3] + '.tsx'])
    return next((p for p in candidates if p in files), False)


def cycles(graph):
    # Tarjan SCCs: return cyclic groups, not an exponential list of paths.
    counter, stack, active, indices, low, result = [0], [], set(), {}, {}, []

    def visit(node):
        indices[node] = low[node] = counter[0]
        counter[0] += 1
        stack.append(node)
        active.add(node)
        for target in graph.get(node, []):
            if target not in indices:
                visit(target)
                low[node] = min(low[node], low[target])
            elif target in active:
                low[node] = min(low[node], indices[target])
        if low[node] == indices[node]:
            group = []
            while True:
                target = stack.pop()
                active.remove(target)
                group.append(target)
                if target == node:
                    break
            if len(group) > 1 or node in graph.get(node, []):
                result.append(sorted(group))

    for node in sorted(graph):
        if node not in indices:
            visit(node)
    return sorted(result)
