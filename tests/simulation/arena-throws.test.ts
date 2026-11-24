import { describe,expect,it } from 'vitest';
import { advanceArena,createArena,playCard,previewThrowContact,toggleArena } from '../../src/arena/engine';
import { advanceItems } from '../../src/arena/engine-items';
import { CARDS,isThrowableTarget,type ThrownItem,type ThrownKind } from '../../src/arena/model';
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
describe('V2 thrown hits and fighter traits',()=>{
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
 it('previews and hits the first live fighter once, then leaves the equipment pickable',()=>{
  const state=arena(),[far,near,dead]=state.fighters;state.fighters=[far,near,dead];
  Object.assign(far,{x:0,y:1});Object.assign(near,{x:0,y:4});Object.assign(dead,{x:0,y:6,hp:0});
  const sword=CARDS.find(card=>card.id==='sword')!,aim={x:0,y:0};
  const before=structuredClone(state);
  expect(previewThrowContact(sword,aim,state.fighters)).toBe(near);
  expect(state).toEqual(before);
  state.items=[flight(900,'sword',0,7.5,aim.x,aim.y)];
  state.time=1;advanceItems(state);
  const hp=before.fighters[1].hp;
  expect(near.hp).toBe(hp-1);expect(far.hp).toBe(before.fighters[0].hp);
  expect(near.weapon).toBe('sword');expect(state.items).toEqual([]);
  advanceItems(state);expect(near.hp).toBe(hp-1);
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
  for(const [kind,range] of [['stone',5],['pot',2],['dung',5]] as const){
   const state=arena();state.hand=[{id:900,cardId:kind}];state.stones=[{id:901,color:'blue'},{id:902,color:'blue'}];
   const ids=state.stones.slice(0,kind==='pot'?2:1).map(s=>s.id);
   if(kind==='dung'){
    const noBlack=structuredClone(state);
    expect(playCard(state,900,{x:0,y:7.5-range},ids)).toBe(false);expect(state).toEqual(noBlack);
    state.stones[0].color='black';
   }
   const before=structuredClone(state);
   expect(playCard(state,900,{x:0,y:7.5-range-.01},ids)).toBe(false);expect(state).toEqual(before);
   expect(isThrowableTarget(CARDS.find(c=>c.id===kind)!,{x:0,y:7.5-range})).toBe(true);
   expect(playCard(state,900,{x:0,y:7.5-range},ids)).toBe(true);
   state.time=1;advanceItems(state);expect(state.items).toEqual([]);expect(state.fighters.every(f=>f.weapon==='fists')).toBe(true);
   expect(state.effects.some(e=>e.kind==='impact'&&e.itemKind===kind)).toBe(true);
   expect(state.fighters).toEqual(before.fighters);
  }
 });
 it('discards dung after a midair collision without applying its status to a fighter downrange',()=>{
  const state=arena(),[target]=state.fighters;Object.assign(target,{x:1,y:0});
  const health=target.hp;
  state.items=[flight(900,'dung'),flight(901,'shield',0,-2,0,2)];
  state.time=1;advanceItems(state);
  expect(state.logs.some(text=>text.includes('半空相撞'))).toBe(true);
  expect(state.items.map(item=>item.weapon)).toEqual(['shield']);
  expect(target.hp).toBe(health);expect(target.dungDamage).toBeUndefined();
  expect(target.buffs).toEqual([]);
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
