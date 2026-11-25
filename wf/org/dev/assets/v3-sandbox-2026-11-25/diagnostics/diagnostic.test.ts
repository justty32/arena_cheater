// @ts-nocheck
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createArena, toggleArena, advanceArena } from '../../src/arena/sim/engine';
import { equip } from '../../src/arena/items/equipment';
const variant = 'diagnostic';
const limit = 180;
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
 writeFileSync('diagnostic-results.json',JSON.stringify(report,null,2)+'\n');
},240_000);
