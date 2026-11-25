import sys, shutil, re, json, hashlib
from pathlib import Path
sys.path.insert(0, 'wf/tools')
from tabledb import load
root = Path('/tmp/aos/arena_cheater/dev')
base = root / 'v3-sandbox'
proposal = load('wf/org/design/assets/data/v3-first-slice-proposal.json')
(root / 'v3-proposal-frozen.json').write_bytes(Path(proposal.path).read_bytes())
(root / 'v3-spec-frozen.md').write_bytes(Path('wf/org/design/assets/specs/v3-first-slice.md').read_bytes())
newkeys = {'weapon.club.staminaCost':'clubStaminaCost', 'weapon.sword.damageBonus':'swordBonus', 'weapon.spear.damageBonus':'spearBonus', 'weapon.hatchet.damageBonus':'hatchetBonus', 'weapon.club.damageBonus':'clubBonus', 'weapon.bow.damageBonus':'bowBonus', 'fighter.elephant.clubBonus':'elephantClubBonus', 'buff.fury.damageBonus':'furyBonus'}
for variant in ['baseline', 'a', 'b']:
    dest = root / ('v3-' + variant)
    assert not dest.exists(), dest
    shutil.copytree(base, dest, symlinks=True)
    # This exported sandbox runs only the reporting and directed candidate tests.
    shutil.rmtree(dest / 'tests')
    (dest / 'tests/simulation').mkdir(parents=True)
    if variant == 'baseline': continue
    table = load(str(dest / 'src/arena/data/arena-balance.json'))
    meta = load(str(dest / 'src/arena/data/arena-balance-meta.json'))
    original = {r['id']: r.copy() for r in table.rows}
    schemafile = dest / 'src/arena/shared/balance-schema.ts'
    schema = schemafile.read_text()
    for change in proposal.rows:
        id = change['id']; action = change['action']
        matches = [i for i,r in enumerate(table.rows) if r['id'] == id]
        if action != 'add':
            assert len(matches) == 1, id
            assert original[id]['value'] == change['old_value'], (id, original[id], change)
            assert original[id]['unit'] == change['old_unit'], id
        if action == 'keep':
            assert original[id]['value'] == change['candidate_' + variant], id
            continue
        if action == 'remove':
            table.delete(matches[0]); meta.delete(next(i for i,r in enumerate(meta.rows) if r['id'] == id))
            schema, count = re.subn(r'^  \w+: \[\'' + re.escape(id) + r"'.*\n", '', schema, flags=re.M)
            assert count == 1, id
            continue
        value = change['candidate_' + variant]
        if action == 'update': table.update(matches[0], value=value, unit=change['unit'])
        else:
            table.add({'id':id, 'value':value, 'unit':change['unit']})
            line = f"  {newkeys[id]}: ['{id}', '{change['unit']}', 'number'],\n"
            schema = schema.replace('export const BALANCE_SCHEMA = {\n', 'export const BALANCE_SCHEMA = {\n' + line)
            meta.add({'id':id, 'source_path':'src/arena/sim/engine-damage.ts', 'source_locator':'Sandbox only: v3-first-slice proposal', 'source_revision':'7d9b7bbc621e3bb2728fe02154cb78adcdd77992', 'decision':'暫定（2026-11-25 使用者照 main 推薦；待遊戲策劃確認）', 'rationale':change['rationale']})
        for i,row in enumerate(meta.rows):
            if row['id'] == id: meta.update(i, decision='暫定（2026-11-25 使用者照 main 推薦；待遊戲策劃確認）')
    table.save(); meta.save(); schemafile.write_text(schema)
    damagefile = dest / 'src/arena/sim/engine-damage.ts'
    text = damagefile.read_text()
    start = text.index('  const isSwordOrSpear =')
    end = text.index("  if (hasBuff(fighter, 'weakness'))", start)
    text = text[:start] + """  const bonuses = { fists: 0, shield: 0, sword: B.swordBonus, spear: B.spearBonus,
    hatchet: B.hatchetBonus, club: B.clubBonus, bow: B.bowBonus };
  let damage = fighter.attack + bonuses[fighter.weapon];
  if (fighter.species === 'elephant' && fighter.weapon === 'club') damage += B.elephantClubBonus;
  if (hasBuff(fighter, 'fury')) damage += B.furyBonus;
""" + text[end:]
    text = text.replace('damage = Math.max(1, Math.round(damage));', 'damage = damage > 0 ? Math.max(0.01, Math.round((damage + Number.EPSILON) * 100) / 100) : 0;')
    text = text.replace('target.hp = Math.max(0, target.hp - damage);', 'target.hp = Math.max(0, Math.round((target.hp - damage + Number.EPSILON) * 100) / 100);')
    text = text.replace("fighter.knockback = undefined; fighter.pose = 'fallen'; fighter.poseUntil = state.time + B.fallenDuration;", "fighter.knockback = undefined; fighter.pose = 'fallen'; fighter.poseUntil += B.fallenDuration;")
    text = text.replace("    return true;\n  }\n  if (fighter.pose === 'fallen')", "    if (fighter.pose === 'airborne') return true;\n  }\n  if (fighter.pose === 'fallen')")
    text = text.replace("fighter.pose = 'rising'; fighter.poseUntil = state.time + B.risingDuration;", "fighter.pose = 'rising'; fighter.poseUntil += B.risingDuration;")
    text = text.replace("    return true;\n  }\n  if (fighter.pose === 'rising')", "    if (fighter.pose === 'fallen') return true;\n  }\n  if (fighter.pose === 'rising')")
    damagefile.write_text(text)
    combatfile = dest / 'src/arena/sim/engine-combat.ts'
    text = combatfile.read_text().replace('cooldown: B.clubCooldown },', 'cooldown: B.clubCooldown, staminaCost: B.clubStaminaCost },')
    combatfile.write_text(text)
    # No UI is exercised; keep the obsolete display reference type-safe for build verification.
    details = dest / 'src/arena/ui/fighter-details.ts'
    details.write_text(details.read_text().replace('傷害提高 20%', '傷害增加 2 點'))
    manifest = {'variant':variant, 'baseline_commit':'7d9b7bbc621e3bb2728fe02154cb78adcdd77992', 'proposal_sha256':hashlib.sha256(Path(proposal.path).read_bytes()).hexdigest(), 'values':table.rows, 'changes':proposal.rows}
    (dest / 'sandbox-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Prepared baseline/a/b, no Node executed')
