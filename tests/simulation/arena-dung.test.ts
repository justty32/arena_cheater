import { describe,expect,it } from 'vitest';
import { advanceArena,chooseDeliberation,createArena,playCard,toggleArena } from '../../src/arena/sim/engine';
import { advanceItems } from '../../src/arena/items/engine-items';
import { attackDamage } from '../../src/arena/sim/engine-damage';
import { type ThrownItem,type ThrownKind } from '../../src/arena/model';
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
function dungFight(){
 const state=arena(),[target,other]=state.fighters;
 state.fighters=[target,other];
 Object.assign(target,{x:0,y:4});
 Object.assign(other,{x:-6,y:3});
 state.hand=[{id:900,cardId:'dung'},{id:901,cardId:'dung'},{id:902,cardId:'deliberate'}];
 state.stones=[{id:910,color:'black'},{id:911,color:'black'},{id:912,color:'blue'}];
 return {state,target,other,aim:{x:0,y:3}};
}
describe('V2 thrown hits and fighter traits',()=>{
 it('applies a shield-ignoring hit, five timed ticks and temporary weakness only to the impacted fighter',()=>{
  const {state,target,other,aim}=dungFight();
  target.shield=true;target.facing=Math.PI/2;target.parryUntil=2;target.pose='hit';target.poseUntil=2;
  other.buffs=[{kind:'weakness',until:7}];
  const health=target.hp,otherHealth=other.hp,baseDamage=attackDamage(target);
  expect(playCard(state,900,aim,[910])).toBe(true);
  advanceArena(state,.75);
  expect(target.hp).toBe(health-1);expect(target.parryUntil).toBe(2);expect(target.shield).toBe(true);
  expect(target.maxStamina).toBeCloseTo(target.baseMaxStamina*.6);
  expect(attackDamage(target)).toBeCloseTo(baseDamage*.55);
  expect(state.items).toEqual([]);
  advanceArena(state,.65);
  expect(target.hp).toBe(health-1);

  toggleArena(state);
  const paused=structuredClone(state);
  advanceArena(state,4);
  expect(state).toEqual(paused);
  toggleArena(state);
  expect(playCard(state,902,{},[912])).toBe(true);
  const offer=state.pendingDeliberation!;
  const selecting=structuredClone(state);
  advanceArena(state,4);
  expect(state).toEqual(selecting);
  expect(chooseDeliberation(state,offer,0)).toBe(true);

  const fast=structuredClone(state);fast.speed=2;
  advanceArena(state,4.1);advanceArena(fast,2.05);
  expect(fast.fighters[0].hp).toBe(target.hp);
  expect(fast.time).toBeCloseTo(state.time);
  expect(target.hp).toBe(health-5);
  target.stamina=2;target.lastAttack=state.time;
  advanceArena(state,.3);
  expect(target.hp).toBe(health-6);
  expect(target.buffs.some(buff=>buff.kind==='weakness')).toBe(false);
  expect(target.maxStamina).toBe(target.baseMaxStamina);
  expect(attackDamage(target)).toBe(baseDamage);
  expect(target.stamina).toBe(2);
  advanceArena(state,2);
  expect(target.hp).toBe(health-6);
  expect(other.hp).toBe(otherHealth);
 });
 it('keeps dung cadence after the last scheduled tick and preserves longer ordinary weakness',()=>{
  const {state,target}=dungFight();
  const health=target.hp;
  target.buffs=[{kind:'weakness',until:15}];
  function impact(){
   // Start this flight in contact so that impact occurs at the exact current game time.
   const item=flight(state.nextId++,'dung',target.x,target.y,target.x,target.y);
   item.launched=state.time;item.landsAt=state.time+1;
   state.items.push(item);advanceItems(state);
  }
  impact();
  expect(target.hp).toBe(health-1);
  advanceArena(state,2.4);
  expect(target.hp).toBe(health-3);
  impact();
  expect(target.hp).toBe(health-4);
  advanceArena(state,4.6);
  expect(state.time).toBeCloseTo(7);
  expect(target.hp).toBe(health-9);
  expect(target.buffs).toContainEqual({kind:'weakness',until:15});

  const lastSurvivor=structuredClone(state);
  lastSurvivor.fighters[1].hp=0;
  advanceArena(lastSurvivor,1/30);
  expect(lastSurvivor.status).toBe('finished');
  expect(lastSurvivor.winnerId).toBe(target.id);
  expect(lastSurvivor.fighters[0].hp).toBe(target.hp);

  advanceArena(state,.1);
  impact();
  expect(target.hp).toBe(health-10);
  advanceArena(state,.8);
  expect(target.hp).toBe(health-10);
  advanceArena(state,.1);
  expect(state.time).toBeCloseTo(8);
  expect(target.hp).toBe(health-11);
  advanceArena(state,4.2);
  expect(target.hp).toBe(health-15);
  expect(target.buffs).toContainEqual({kind:'weakness',until:15});
  expect(target.maxStamina).toBeCloseTo(target.baseMaxStamina*.6);
  advanceArena(state,3);
  expect(target.hp).toBe(health-15);
  expect(target.buffs.some(buff=>buff.kind==='weakness')).toBe(false);
 });
 it('waits for the last dung flight and lethal tick without rewarding or ticking a dead fighter',()=>{
  const {state,target,other,aim}=dungFight();
  target.hp=2;state.supportedId=other.id;
  expect(playCard(state,900,aim,[910])).toBe(true);
  const stones=structuredClone(state.stones);
  other.hp=0;
  advanceArena(state,.2);
  expect(state.status).toBe('running');expect(target.hp).toBe(2);
  advanceArena(state,.55);
  expect(state.status).toBe('running');expect(target.hp).toBe(1);
  advanceArena(state,1);
  expect(state.status).toBe('finished');expect(state.winnerId).toBeUndefined();expect(target.hp).toBe(0);
  expect(state.stones).toEqual(stones);expect(state.supportKillRewardStones).toBe(0);
  expect(target.dungDamage).toBeUndefined();
  const finished=structuredClone(state);
  advanceArena(state,7);
  expect(state).toEqual(finished);
 });
 it('drains a nonlethal dung throw and its fifth tick after the 300-second limit',()=>{
  const {state,target,aim}=dungFight();
  const health=target.hp;
  state.time=299.8;
  expect(playCard(state,900,aim,[910])).toBe(true);
  advanceArena(state,.3);
  expect(state.status).toBe('running');expect(target.hp).toBe(health);
  advanceArena(state,5);
  expect(state.status).toBe('running');expect(target.hp).toBe(health-5);
  advanceArena(state,.8);
  expect(state.status).toBe('finished');expect(target.hp).toBe(health-6);
 });
});
