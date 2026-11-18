import { describe,expect,it } from 'vitest';
import { advanceArena,createArena,playCard,previewThrowContact,toggleArena } from '../../src/arena/engine';
import { advanceItems } from '../../src/arena/engine-items';
import { applyHealthDamage,attackDamage,syncStamina } from '../../src/arena/engine-damage';
import { advanceArrows } from '../../src/arena/engine-arrows';
import { CARDS,isThrowableTarget,type ThrownItem,type ThrownKind } from '../../src/arena/model';
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
describe('V2 thrown hits and fighter traits',()=>{
 it('previews the same first live fighter the current path actually hits',()=>{
  const state=arena(),[far,near,dead]=state.fighters;state.fighters=[far,near,dead];
  Object.assign(far,{x:0,y:1});Object.assign(near,{x:0,y:4});Object.assign(dead,{x:0,y:6,hp:0});
  const sword=CARDS.find(card=>card.id==='sword')!, aim={x:0,y:0};
  const snapshot=structuredClone(state);
  expect(previewThrowContact(sword,aim,state.fighters)).toBe(near);
  expect(state).toEqual(snapshot);
  state.items=[flight(900,'sword',0,7.5,aim.x,aim.y)];
  state.time=1;advanceItems(state);
  expect(near.hp).toBe(snapshot.fighters[1].hp-1);
  expect(far.hp).toBe(snapshot.fighters[0].hp);
 });
 it('breaks equal preview contact times by fighter ID regardless of list order',()=>{
  const state=arena(),[first,second]=state.fighters;
  Object.assign(first,{x:-0.15,y:4,radius:0.4});
  Object.assign(second,{x:0.15,y:4,radius:0.4});
  const sword=CARDS.find(card=>card.id==='sword')!;
  expect(previewThrowContact(sword,{x:0,y:0},[second,first])).toBe(first);
 });
 it('does not preview missing, invalid, out-of-range or non-ground aims',()=>{
  const state=arena(),[fighter]=state.fighters;Object.assign(fighter,{x:0,y:5});
  const stone=CARDS.find(card=>card.id==='stone')!, sword=CARDS.find(card=>card.id==='sword')!;
  const lightning=CARDS.find(card=>card.id==='lightning')!;
  expect(previewThrowContact(stone,{x:0,y:2.5},[fighter])).toBe(fighter);
  expect(previewThrowContact(stone,{x:0,y:2.49},[fighter])).toBeUndefined();
  expect(previewThrowContact(sword,{x:0,y:-7.5},[fighter])).toBeUndefined();
  expect(previewThrowContact(sword,{x:0,y:NaN},[fighter])).toBeUndefined();
  expect(previewThrowContact(sword,undefined,[fighter])).toBeUndefined();
  expect(previewThrowContact(lightning,{x:0,y:0},[fighter])).toBeUndefined();
 });
 it('stops at the first live body, deals one hit and leaves equipment pickable',()=>{
  const state=arena(),[first,second,dead]=state.fighters;state.fighters=[first,second,dead];
  first.x=0;first.y=0;second.x=1;second.y=0;dead.x=-1;dead.y=0;dead.hp=0;
  state.items=[flight(900)];const hp=first.hp,otherHp=second.hp;state.time=1;advanceItems(state);
  expect(first.hp).toBe(hp-1);expect(second.hp).toBe(otherHp);expect(first.weapon).toBe('sword');expect(state.items).toEqual([]);
  advanceItems(state);expect(first.hp).toBe(hp-1);
 });
 it('delivers a pickable spear across the arena for one stone and deals one impact damage',()=>{
  const state=arena(),target=state.fighters[0];target.x=0;target.y=0;
  state.hand=[{id:900,cardId:'spear'}];state.stones=[{id:901,color:'blue'}];
  const hp=target.hp;
  expect(playCard(state,900,{x:0,y:0},[901])).toBe(true);
  expect(state.stones.some(stone=>stone.id===901)).toBe(false);
  expect(target.weapon).toBe('fists');
  state.time=state.items[0].landsAt;advanceItems(state);
  expect(target.hp).toBe(hp-1);expect(target.weapon).toBe('spear');expect(state.items).toEqual([]);
 });
 it('pays two any stones and one yellow to deliver a pickable hatchet without breaking a shield',()=>{
  const state=arena(),target=state.fighters[0];target.x=0;target.y=0;
  target.shield=true;target.facing=0;
  state.hand=[{id:900,cardId:'hatchet'}];
  state.stones=[{id:901,color:'blue'},{id:902,color:'red'},{id:903,color:'green'}];
  const before=structuredClone(state);
  expect(playCard(state,900,{x:0,y:0},[901,902,903])).toBe(false);
  expect(state).toEqual(before);
  state.stones.push({id:904,color:'yellow'});
  expect(playCard(state,900,{x:0,y:0},[901,902,904])).toBe(true);
  expect(state.stones.map(stone=>stone.id)).toContain(903);
  expect(state.stones.some(stone=>[901,902,904].includes(stone.id))).toBe(false);
  expect(state.stones).toHaveLength(3);
  expect(target.weapon).toBe('fists');
  const hp=target.hp;
  state.time=state.items[0].landsAt;advanceItems(state);
  expect(target.hp).toBe(hp-2);
  expect(target.weapon).toBe('hatchet');expect(target.shield).toBe(true);
  expect(state.items).toEqual([]);
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
 it('blocks physical equipment throws without breaking the shield',()=>{
  for(const [weapon,damage] of [['club',2],['hatchet',1]] as const){
   const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;target.shield=true;target.facing=Math.PI;target.weapon='club';
   const hp=target.hp,stamina=target.stamina;state.items=[flight(900,weapon)];state.time=1;advanceItems(state);
   expect(target.hp).toBe(hp-damage);expect(target.stamina).toBe(stamina-6);
   expect(target.shield).toBe(true);expect(state.items[0].landed).toBe(true);
  }
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

describe('latest delayed throw feedback',()=>{
 it('tracks the launched card instance without extra ids and preserves it across instant spells',()=>{
  const state=arena();state.hand=[{id:800,cardId:'sword'},{id:801,cardId:'lightning'}];
  state.stones=[{id:810,color:'blue'},{id:811,color:'blue'},{id:812,color:'red'}];
  const nextId=state.nextId;
  expect(playCard(state,800,{x:0,y:0},[810,811])).toBe(true);
  expect(state.latestThrow).toEqual({itemId:nextId,handCardId:800,itemKind:'sword',launchedAt:0});
  expect(state.nextId).toBe(nextId+4); // Existing item + two stones + replacement card only.
  const tracked=structuredClone(state.latestThrow);
  expect(playCard(state,801,{fighterId:state.fighters[0].id},[812])).toBe(true);expect(state.latestThrow).toEqual(tracked);
  expect(createArena(42).latestThrow).toBeUndefined();
 });
 it('retains both the exact damage and pickup after a same-tick hit and pickup',()=>{
  const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;
  state.items=[flight(900)];state.latestThrow={itemId:900,handCardId:800,itemKind:'sword',launchedAt:0};
  state.time=1;advanceItems(state);
  expect(state.latestThrow.impact).toMatchObject({reason:'fighter',fighterId:target.id,damage:1});
  expect(state.latestThrow.pickup).toEqual({at:1,fighterId:target.id});
  expect(state.latestThrow.impact!.at).toBeLessThan(state.latestThrow.pickup!.at);
  expect(target.weapon).toBe('sword');expect(state.items).toEqual([]);
 });
 it('does not let an old same-kind weapon pickup overwrite a newer flying throw',()=>{
  const state=arena(),target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;
  const old=flight(900);old.x=old.y=0;old.landed=true;
  state.items=[old,flight(901,'sword',-2,3,2,3)];
  state.latestThrow={itemId:901,handCardId:801,itemKind:'sword',launchedAt:0};const tracked=structuredClone(state.latestThrow);
  state.time=.1;advanceItems(state);expect(target.weapon).toBe('sword');expect(state.latestThrow).toEqual(tracked);
 });
 it('distinguishes a parried zero-damage hit, a miss and an item collision after disposables disappear',()=>{
  for(const outcome of ['parried','ground','collision'] as const){
   const state=arena();state.items=[flight(900,'stone')];
   state.latestThrow={itemId:900,handCardId:800,itemKind:'stone',launchedAt:0};
   if(outcome==='parried'){
    const target=state.fighters[0];state.fighters=[target];target.x=0;target.y=0;target.shield=true;target.facing=Math.PI;target.parryUntil=2;
   }else state.fighters=[];
   if(outcome==='collision')state.items.push(flight(901,'pot',0,-2,0,2));
   state.time=1;advanceItems(state);expect(state.items).toEqual([]);
   if(outcome==='parried')expect(state.latestThrow.impact).toMatchObject({reason:'fighter',damage:0});
   else if(outcome==='ground')expect(state.latestThrow.impact).toMatchObject({reason:'ground'});
   else expect(state.latestThrow.impact).toMatchObject({reason:'item',otherItemId:901});
   expect(state.latestThrow.pickup).toBeUndefined();
  }
 });
});
