import { describe,expect,it } from 'vitest';
import { advanceArena,createArena,playCard,toggleArena } from '../../src/arena/engine';
import { advanceItems } from '../../src/arena/engine-items';
import { applyHealthDamage,attackDamage,syncStamina } from '../../src/arena/engine-damage';
import { advanceArrows } from '../../src/arena/engine-arrows';
import { CARDS,isThrowableTarget,type ThrownItem,type ThrownKind } from '../../src/arena/model';
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
describe('V2 thrown hits and fighter traits',()=>{
 it('stops at the first live body, deals one hit and leaves equipment pickable',()=>{
  const state=arena(),[first,second,dead]=state.fighters;state.fighters=[first,second,dead];
  first.x=0;first.y=0;second.x=1;second.y=0;dead.x=-1;dead.y=0;dead.hp=0;
  state.items=[flight(900)];const hp=first.hp,otherHp=second.hp;state.time=1;advanceItems(state);
  expect(first.hp).toBe(hp-1);expect(second.hp).toBe(otherHp);expect(first.weapon).toBe('sword');expect(state.items).toEqual([]);
  advanceItems(state);expect(first.hp).toBe(hp-1);
 });
 it('resolves an early body hit before a later item collision, and early item collision before body hits',()=>{
  for(const earlyBody of [true,false]){
   const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=earlyBody?-.8:1;target.y=0;target.weapon='club';
   state.items=[flight(900),flight(901,'shield',0,-2,0,2)];const hp=target.hp;state.time=1;advanceItems(state);
   expect(target.hp).toBe(hp-(earlyBody?1:0));
   expect(state.items.every(item=>item.landed)).toBe(true);
   expect(state.logs.some(text=>text.includes('半空相撞'))).toBe(!earlyBody);
  }
 });
 it('uses remaining live candidates after another thrown item kills the nearer body',()=>{
  const state=arena(),[near,far]=state.fighters;state.fighters=[near,far];near.x=0;near.y=0;near.hp=1;far.x=1;far.y=0;
  near.weapon='club';far.weapon='club';const hp=far.hp;
  state.items=[flight(900,'stone',-1,0,2,0),flight(901,'stone',-2,0,2,0)];
  // Separate launch times prevent an item-item contact while the first stone is ahead.
  state.items[0].landsAt=.5;
  state.time=1;advanceItems(state);expect(near.hp).toBe(0);expect(far.hp).toBe(hp-1);expect(state.items).toEqual([]);
 });
 it('parries physical throws without a melee attacker and lets pots bypass defense',()=>{
  for(const kind of ['stone','pot','club','shield'] as const){
   const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;target.shield=true;target.weapon='club';target.facing=Math.PI;target.parryUntil=2;
   const hp=target.hp,stamina=target.stamina;state.items=[flight(900,kind)];state.time=1;advanceItems(state);
   expect(target.hp).toBe(hp-(kind==='pot'?3:0));
   expect(target.stamina).toBe(stamina-(['stone','club'].includes(kind)?10:0));
   expect(state.items.every(item=>item.landed)).toBe(true);
  }
 });
 it('blocks a physical thrown club, stops it and applies only reduced damage',()=>{
  const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;target.shield=true;target.facing=Math.PI;target.weapon='club';
  const hp=target.hp,stamina=target.stamina;state.items=[flight(900,'club')];state.time=1;advanceItems(state);
  expect(target.hp).toBe(hp-2);expect(target.stamina).toBe(stamina-6);expect(state.items[0].landed).toBe(true);
 });
 it('rejects out-of-range throws without any mutation and keeps disposable objects out of equipment',()=>{
  for(const [kind,range] of [['stone',5],['pot',2]] as const){
   const state=arena();state.hand=[{id:900,cardId:kind}];state.stones=[{id:901,color:'blue'},{id:902,color:'blue'}];
   const ids=state.stones.slice(0,kind==='pot'?2:1).map(s=>s.id),before=structuredClone(state);
   expect(playCard(state,900,{x:0,y:7.5-range-.01},ids)).toBe(false);expect(state).toEqual(before);
   expect(isThrowableTarget(CARDS.find(c=>c.id===kind)!,{x:0,y:7.5-range})).toBe(true);
   expect(playCard(state,900,{x:0,y:7.5-range},ids)).toBe(true);
   state.time=1;advanceItems(state);expect(state.items).toEqual([]);expect(state.fighters.every(f=>f.weapon==='fists')).toBe(true);
   expect(state.effects.some(e=>e.kind==='impact'&&e.itemKind===kind)).toBe(true);
  }
 });
 it('does not award supported stones or wolf frenzy for wizard thrown kills',()=>{
  const state=arena(),[wolf,target]=state.fighters;state.fighters=[wolf,target];target.x=0;target.y=0;target.hp=1;
  const stones=structuredClone(state.stones);state.items=[flight(900,'pot')];state.time=1;advanceItems(state);
  expect(target.hp).toBe(0);expect(wolf.buffs).toEqual([]);expect(state.stones).toEqual(stones);
 });
 it('refreshes living wolf frenzy on fighter kills, expires it, and makes deer fastest',()=>{
  const state=createArena(42),[wolf,a,b]=state.fighters;const base=attackDamage(wolf);
  expect(wolf.speed).toBe(1.35);const deer=state.fighters.find(f=>f.species==='deer')!;expect(deer.speed).toBe(1.75);expect(state.fighters.every(f=>f.speed<=deer.speed)).toBe(true);
  applyHealthDamage(state,a,999,wolf.id);expect(attackDamage(wolf)).toBeCloseTo(base*1.65);
  state.time=2;applyHealthDamage(state,b,999,wolf.id);expect(wolf.buffs).toEqual([{kind:'fury',until:10}]);
  syncStamina(wolf,10);expect(attackDamage(wolf)).toBe(base);
 });
 it('does not grant frenzy to a dead wolf whose final arrow kills',()=>{
  const state=arena(),[wolf,target]=state.fighters;state.fighters=[wolf,target];wolf.hp=0;target.x=1;target.y=0;target.hp=1;
  state.arrows=[{id:900,ownerId:wolf.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];advanceArrows(state,.2);
  expect(target.hp).toBe(0);expect(wolf.hp).toBe(0);expect(wolf.buffs).toEqual([]);
 });
 it('freezes a final thrown flight while paused and waits for its lethal impact to resolve a draw',()=>{
  const state=arena(),target=state.fighters[0];state.fighters=[target];target.hp=1;target.x=0;target.y=0;state.items=[flight(900,'pot')];
  toggleArena(state);const paused=structuredClone(state);advanceArena(state,2);expect(state).toEqual(paused);
  toggleArena(state);advanceArena(state,.1);expect(state.status).toBe('running');advanceArena(state,1);
  expect(target.hp).toBe(0);expect(state.status).toBe('finished');expect(state.winnerId).toBeUndefined();
 });
 it('drains harmless flights after timeout rather than leaving a permanent resolving state',()=>{
  const state=arena();state.time=179.99;const item=flight(900,'shield');item.launched=179.99;item.landsAt=180.99;state.items=[item];
  advanceArena(state,.1);expect(state.status).toBe('running');advanceArena(state,1);expect(state.status).toBe('finished');expect(state.items.every(i=>i.landed)).toBe(true);
 });
});
