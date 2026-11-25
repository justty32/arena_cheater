from pathlib import Path
import subprocess, tarfile, io, shutil, json
root=Path('/tmp/aos/arena_cheater/dev/pd10-2026-11-25')
revisions={'new':'03b15e1f05ad5701f6c47f7fb7fcc62460c39cfd','old':'7d9b7bbc621e3bb2728fe02154cb78adcdd77992'}
audit='''import type { ArenaState } from './types';
export interface AuditEvent { time: number; kind: string; [key: string]: unknown }
const events = new WeakMap<ArenaState, AuditEvent[]>();
export function record(state: ArenaState, kind: string, detail: Record<string, unknown>): void {
  if (!events.has(state)) events.set(state, []);
  events.get(state)!.push({ time: state.time, kind, ...detail });
}
export function auditEvents(state: ArenaState): AuditEvent[] { return events.get(state) ?? []; }
'''
def replace(p,a,b):
 s=p.read_text(); assert s.count(a)==1,(p,a);p.write_text(s.replace(a,b))
for version,revision in revisions.items():
 dest=root/version
 assert not dest.exists(),dest
 dest.mkdir()
 data=subprocess.check_output(['git','archive',revision])
 with tarfile.open(fileobj=io.BytesIO(data)) as t:t.extractall(dest,filter='data')
 shutil.rmtree(dest/'tests');(dest/'tests/simulation').mkdir(parents=True)
 (dest/'node_modules').symlink_to(Path('node_modules').resolve(),target_is_directory=True)
 for f in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','src/main.ts']:
  assert (dest/f).read_bytes()==Path(f).read_bytes(),f
 (dest/'src/arena/shared/audit.ts').write_text(audit)
 resources=dest/'src/arena/shared/resources.ts'
 resources.write_text("import { record } from './audit';\n"+resources.read_text())
 replace(resources, 'export function drawStones(state: ArenaState, count: number): void {', 'export function drawStones(state: ArenaState, count: number, source = "unknown"): void {')
 replace(resources,'  for (let i = 0; i < count; i++) state.stones.push({ id: state.nextId++, color: COLORS[Math.floor(random(state) * COLORS.length)] });', '''  const before = state.stones.map(s => ({...s}));
  for (let i = 0; i < count; i++) state.stones.push({ id: state.nextId++, color: COLORS[Math.floor(random(state) * COLORS.length)] });
  record(state, 'income', { source, stones: state.stones.slice(before.length).map(s => ({...s})), before, after: state.stones.map(s => ({...s})) });''')
 cards=dest/'src/arena/items/engine-cards.ts'
 cards.write_text("import { record } from '../shared/audit';\n"+cards.read_text())
 replace(cards,'  state.stones = state.stones.filter(stone => !stoneIds.includes(stone.id));', '''  const before = state.stones.map(s => ({...s}));
  const paid = state.stones.filter(stone => stoneIds.includes(stone.id)).map(s => ({...s}));
  state.stones = state.stones.filter(stone => !stoneIds.includes(stone.id));
  record(state, 'expense', { source: 'card-payment', cardId: card.cardId, stones: paid, before, after: state.stones.map(s => ({...s})) });''')
 replace(cards,'  if (cardId) state.hand.push({ id: state.nextId++, cardId });', '''  if (cardId) {
    state.hand.push({ id: state.nextId++, cardId });
    record(state, 'card-draw', { cardId, handId: state.hand[state.hand.length - 1].id });
  }''')
 replace(cards,"  state.pendingDeliberation = { candidates, resumeOnChoice: state.status === 'running' };", "  record(state, 'deliberation-offer', { candidates: [...candidates] });\n  state.pendingDeliberation = { candidates, resumeOnChoice: state.status === 'running' };")
 replace(cards,'  state.pendingDeliberation = undefined;',"  record(state, 'deliberation-choice', { candidates: [...offer.candidates], index, cardId: offer.candidates[index] });\n  state.pendingDeliberation = undefined;")
 damage=dest/'src/arena/sim/engine-damage.ts'
 damage.write_text("import { record } from '../shared/audit';\n"+damage.read_text())
 replace(damage,'  if (target.hp === 0) {',"  if (target.hp === 0) {\n    record(state, 'death', { targetId: target.id, targetSpecies: target.species, sourceFighterId: sourceFighterId ?? null, supportedKill: sourceFighterId === state.supportedId && sourceFighterId !== target.id });")
 for call, source in [('B.initialStones', 'initial'), ('B.playStones', 'successful-play'), ('stoneIds.length + B.redrawBonus', 'redraw')]:
  replace(cards, f'drawStones(state, {call});', f'drawStones(state, {call}, "{source}");')
 replace(damage, 'drawStones(state, rewardStones);', 'drawStones(state, rewardStones, "supported-kill");')
 items=dest/'src/arena/items/engine-items.ts'
 replace(items, 'drawStones(state, B.playStones);', 'drawStones(state, B.playStones, "successful-play");')
 shutil.copyfile(root/'runner.test.ts',dest/'tests/simulation/pd10.test.ts')
 (dest/'pd10-config.json').write_text(json.dumps({'version':version,'revision':revision,'policy':'direct'}))
 # Instrumentation source diff is saved separately; production source remains untouched.
 changed=['src/arena/shared/resources.ts','src/arena/items/engine-cards.ts','src/arena/sim/engine-damage.ts','src/arena/items/engine-items.ts']
 import difflib
 patch=''
 for f in changed:
  original=subprocess.check_output(['git','show',revision+':'+f]).decode()
  patch+=''.join(difflib.unified_diff(original.splitlines(True),(dest/f).read_text().splitlines(True),fromfile='a/'+f,tofile='b/'+f))
 (root/(version+'-instrumentation.patch')).write_text(patch)
(root/'audit.ts').write_text(audit)
print(revisions)
