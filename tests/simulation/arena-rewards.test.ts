import { describe, expect, it } from 'vitest';
import { createArena, playCard, toggleArena } from '../../src/arena/sim/engine';
import { applyHealthDamage, attackDamage, damageFighter, syncStamina } from '../../src/arena/sim/engine-damage';
import { advanceArrows } from '../../src/arena/sim/engine-arrows';
import { advanceItems } from '../../src/arena/items/engine-items';
import { type ArenaState, type CardId, type StoneColor, type ThrownItem, type ThrownKind } from '../../src/arena/model';
function ready(cardId:CardId='lightning', colors:StoneColor[]=['red','blue','green']):ArenaState {
 const state=createArena(42);toggleArena(state);
 state.hand=[{id:state.nextId++,cardId}];state.stones=colors.map(color=>({id:state.nextId++,color}));return state;
}
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
describe('V2 cards and stones',()=>{
 it('does not reward kills made by an unsupported melee fighter or archer',()=>{
  const state=ready(),[,attacker,meleeTarget,arrowTarget]=state.fighters;
  const stones=structuredClone(state.stones);
  meleeTarget.hp=1;damageFighter(state,meleeTarget,20,attacker,attacker);
  expect(meleeTarget.hp).toBe(0);expect(state.stones).toEqual(stones);
  state.fighters=[attacker,arrowTarget];arrowTarget.hp=1;arrowTarget.x=1;arrowTarget.y=0;
  state.arrows=[{id:state.nextId++,ownerId:attacker.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];
  advanceArrows(state,0.2);expect(arrowTarget.hp).toBe(0);expect(state.stones).toEqual(stones);
  expect(state.supportKillRewardStones).toBe(0);
 });
 it('accumulates support rewards independently of spell payment and starts each round at zero',()=>{
  const state=ready(),[a,b]=state.fighters;b.hp=1;
  expect(state.supportKillRewardStones).toBe(0);
  damageFighter(state,b,20,a,a);
  expect(state.stones).toHaveLength(6);expect(state.supportKillRewardStones).toBe(3);
  expect(state.logs[0]).toContain('獲得 3 顆魔法石');
  damageFighter(state,b,20,a,a);
  expect(state.stones).toHaveLength(6);expect(state.supportKillRewardStones).toBe(3);

  const c=state.fighters[2];c.hp=1;
  const payment=state.stones[0].id;
  expect(playCard(state,state.hand[0].id,{fighterId:c.id},[payment])).toBe(true);
  expect(c.hp).toBe(0);expect(state.stones.some(stone=>stone.id===payment)).toBe(false);
  expect(state.stones).toHaveLength(7);expect(state.supportKillRewardStones).toBe(3);

  a.hp=0;const d=state.fighters[3];d.hp=1;d.x=1;d.y=0;
  state.fighters=[a,d];state.arrows=[{id:state.nextId++,ownerId:a.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];
  advanceArrows(state,0.2);expect(d.hp).toBe(0);expect(state.stones).toHaveLength(10);
  expect(state.supportKillRewardStones).toBe(6);
  expect(createArena(state.seed + 1).supportKillRewardStones).toBe(0);
 });
});
describe('V2 thrown hits and fighter traits',()=>{
 it('does not award supported stones or wolf frenzy for wizard thrown kills',()=>{
  const state=arena(),[wolf,target]=state.fighters;state.fighters=[wolf,target];target.x=0;target.y=0;target.hp=1;
  const stones=structuredClone(state.stones);state.items=[flight(900,'pot')];state.time=1;advanceItems(state);
  expect(target.hp).toBe(0);expect(wolf.buffs).toEqual([]);expect(state.stones).toEqual(stones);
 });
 it('refreshes living wolf frenzy on fighter kills, expires it, and makes deer fastest',()=>{
  const state=createArena(42),[wolf,a,b]=state.fighters;const base=attackDamage(wolf);
  expect(wolf.speed).toBe(1);const deer=state.fighters.find(f=>f.species==='deer')!;expect(deer.speed).toBe(1.2);expect(state.fighters.every(f=>f.speed<=deer.speed)).toBe(true);
  applyHealthDamage(state,a,999,wolf.id);expect(attackDamage(wolf)).toBeCloseTo(base+3);
  state.time=2;applyHealthDamage(state,b,999,wolf.id);expect(wolf.buffs).toEqual([{kind:'fury',until:7}]);
  syncStamina(wolf,7);expect(attackDamage(wolf)).toBe(base);
 });
 it('does not grant frenzy to a dead wolf whose final arrow kills',()=>{
  const state=arena(),[wolf,target]=state.fighters;state.fighters=[wolf,target];wolf.hp=0;target.x=1;target.y=0;target.hp=1;
  state.arrows=[{id:900,ownerId:wolf.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];advanceArrows(state,.2);
  expect(target.hp).toBe(0);expect(wolf.hp).toBe(0);expect(wolf.buffs).toEqual([]);
 });
});
