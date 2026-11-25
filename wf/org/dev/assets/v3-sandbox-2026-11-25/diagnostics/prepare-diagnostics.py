from pathlib import Path
import shutil, sys
sys.path.insert(0, 'wf/tools')
from tabledb import load
root = Path('/tmp/aos/arena_cheater/dev')
for variant in ['diagnostic', 'long', 'weapon']:
    dest = root / ('v3-' + variant)
    assert not dest.exists()
    shutil.copytree(root / 'v3-a', dest, symlinks=True)
    shutil.rmtree(dest / 'tests')
    (dest / 'tests/simulation').mkdir(parents=True)
    if variant == 'long':
        table = load(str(dest / 'src/arena/data/arena-balance.json'))
        table.update(next(i for i, r in enumerate(table.rows) if r['id'] == 'world.matchDuration'), value=900)
        table.save()
    p = dest / 'src/arena/sim/engine-combat.ts'
    s = p.read_text().replace('  syncStamina(fighter, state.time);', '''  const diagnostic = (state as any).diagnostic?.[fighter.id];
  if (diagnostic) diagnostic.aliveSeconds += dt;
  syncStamina(fighter, state.time);''')
    s = s.replace('    if (state.time >= fighter.nextAttack && fighter.stamina >= staminaCost', '''    if (diagnostic && state.time >= fighter.nextAttack && Math.abs(delta) < B.attackAngle) {
      diagnostic.readySeconds += dt;
      if (fighter.stamina < staminaCost) diagnostic.insufficientSeconds += dt;
    }
    if (state.time >= fighter.nextAttack && fighter.stamina >= staminaCost''')
    p.write_text(s)
    p = dest / 'src/arena/sim/engine-damage.ts'; s = p.read_text()
    s = s.replace("    target.stamina -= B.parryStamina; target.lastAttack", "    if ((state as any).diagnostic) (state as any).diagnostic[target.id].parries++;\n    target.stamina -= B.parryStamina; target.lastAttack")
    s = s.replace('  applyHealthDamage(state, target, damage, sourceFighterId);', '''  if ((state as any).diagnostic) {
    if (blocked) (state as any).diagnostic[target.id].blocks++;
    if (sourceFighterId && (state as any).diagnostic[sourceFighterId]) {
      const counter = (state as any).diagnostic[sourceFighterId];
      counter.hits++; counter.damage += damage; counter.effectiveDamage += Math.min(target.hp, damage);
    }
  }
  applyHealthDamage(state, target, damage, sourceFighterId);''')
    p.write_text(s)
    runner = '''// @ts-nocheck
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createArena, toggleArena, advanceArena } from '../../src/arena/sim/engine';
import { equip } from '../../src/arena/items/equipment';
const variant = 'VARIANT';
const limit = LIMIT;
it('records deterministic diagnostic matches', () => {
 const results = [];
 for (let seed=1; seed<=100; seed++) {
  const state = createArena(seed);
  // Dedicated equipment RNG never advances the simulation RNG.
  let random = (seed ^ 0x51ed270b) >>> 0;
  const next = () => { random = (Math.imul(random,1664525)+1013904223)>>>0; return random / 4294967296; };
  if (variant === 'weapon') for (const f of state.fighters) equip(f, ['sword','spear','hatchet','club'][Math.floor(next()*4)]);
  const initial = state.fighters.map(f=>({species:f.species,weapon:f.weapon,durability:f.durability}));
  state.diagnostic = Object.fromEntries(state.fighters.map(f=>[f.id,{species:f.species,hits:0,damage:0,effectiveDamage:0,blocks:0,parries:0,aliveSeconds:0,readySeconds:0,insufficientSeconds:0}]));
  toggleArena(state);
  let ticks=0;
  while(state.status==='running' && ticks < limit*30+3) { advanceArena(state,1/30);ticks++; }
  expect(state.status).toBe('finished');
  results.push({seed,time:state.time,winner:state.fighters.find(f=>f.id===state.winnerId)?.species??null,initial,
   alive:state.fighters.filter(f=>f.hp>0).length,totalHp:state.fighters.reduce((n,f)=>n+f.hp,0),
   final:state.fighters.map(f=>({species:f.species,hp:f.hp,stamina:f.stamina})),diagnostic:Object.values(state.diagnostic)});
 }
 const stats = values => { const a=values.slice().sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,min:a[0],p10:a[9],median:(a[49]+a[50])/2,p90:a[89],max:a[99]}; };
 const species=['wolf','bear','elephant','bull','porcupine','snake','deer'];
 const report={variant,limit,seeds:'1..100',dt:1/30,successfulInterventions:0,
  times:stats(results.map(r=>Math.min(limit,r.time))),
  alive:stats(results.map(r=>r.alive)),totalHp:stats(results.map(r=>r.totalHp)),
  timedOut:results.filter(r=>!r.winner&&r.time>=limit-1e-8).length,
  wins:Object.fromEntries(species.map(s=>[s,results.filter(r=>r.winner===s).length])),
  perSpecies:Object.fromEntries(species.map(s=>[s,Object.fromEntries(['hits','damage','effectiveDamage','blocks','parries','aliveSeconds','readySeconds','insufficientSeconds','insufficientAliveRatio','insufficientReadyRatio'].map(key=>[key,stats(results.map(r=>{const d=r.diagnostic.find(d=>d.species===s);return key==='insufficientAliveRatio'?d.insufficientSeconds/d.aliveSeconds:key==='insufficientReadyRatio'?(d.readySeconds?d.insufficientSeconds/d.readySeconds:0):d[key];}))]))])),results};
 writeFileSync('diagnostic-results.json',JSON.stringify(report,null,2)+'\\n');
},240_000);
'''.replace('VARIANT',variant).replace('LIMIT',str(900 if variant=='long' else 180))
    (dest / 'tests/simulation/diagnostic.test.ts').write_text(runner)
print('prepared diagnostic/long/weapon')
