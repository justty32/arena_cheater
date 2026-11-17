import { describe,expect,it } from 'vitest';
import { advanceArena,createArena,findPayment,playCard,toggleArena } from '../../src/arena/engine';
import { ARENA_RADIUS,CARDS,areaSpellTargets,isAreaSpellTarget,type CardId } from '../../src/arena/model';
function prepared(cardId:CardId='lightning-rain') {
 const state=createArena(42);toggleArena(state);
 state.hand=[{id:state.nextId++,cardId}];
 state.stones=Array.from({length:4},()=>({id:state.nextId++,color:'red' as const}));
 state.fighters.forEach(f=>{f.x=5;f.y=0;f.speed=0;f.nextAttack=Infinity;});
 const card=CARDS.find(card=>card.id===cardId)!;
 return {state,card,pay:()=>findPayment(state,card.cost)!};
}
describe('ground area spells',()=>{
 it('uses diameter-based center distance, includes the boundary and ignores dead bodies',()=>{
  const {state,card}=prepared(),[inside,edge,outside,dead]=state.fighters;
  inside.x=0;edge.x=1.5;outside.x=1.50001;dead.x=0;dead.hp=0;
  outside.radius=2; // Body overlap does not expand a center-based spell boundary.
  expect(areaSpellTargets(state.fighters,card,{x:0,y:0})).toEqual([inside,edge]);
  expect(isAreaSpellTarget(card,{x:0,y:ARENA_RADIUS})).toBe(true);
  expect(isAreaSpellTarget(card,{x:0,y:ARENA_RADIUS+.01})).toBe(false);
  expect(areaSpellTargets(state.fighters,CARDS.find(c=>c.id==='sword')!,{x:0,y:0})).toEqual([]);
 });
 it('hits all selected fighters instantly, bypasses shields and settles one card transaction',()=>{
  const {state,card,pay}=prepared(),[a,b]=state.fighters;a.x=0;b.x=1;
  a.shield=b.shield=true;a.parryUntil=b.parryUntil=10;a.facing=0;b.facing=Math.PI;
  const hp=[a.hp,b.hp],stamina=[a.stamina,b.stamina],id=state.hand[0].id;
  expect(playCard(state,id,{x:0,y:0},pay())).toBe(true);
  expect([a.hp,b.hp]).toEqual(hp.map(value=>value-1));expect([a.stamina,b.stamina]).toEqual(stamina);
  expect(state.stones).toHaveLength(5);expect(state.hand).toHaveLength(1);expect(state.discard).toEqual([card.id]);
  expect(state.items).toEqual([]);expect(state.arrows).toEqual([]);
  expect(state.effects.filter(effect=>effect.kind==='area')).toMatchObject([{x:0,y:0,at:0,areaRadius:1.5,cardId:card.id}]);
  const before=structuredClone(state);expect(playCard(state,id,{x:0,y:0},[])).toBe(false);expect(state).toEqual(before);
 });
 it('rejects empty, nonfinite and outside centers without spending or drawing',()=>{
  for(const point of [{x:0,y:0},{x:Infinity,y:0},{x:NaN,y:0},{x:0,y:7.50001}]){
   const {state,pay}=prepared();const before=structuredClone(state);
   expect(playCard(state,state.hand[0].id,point,pay())).toBe(false);expect(state).toEqual(before);
  }
 });
 it('allows edge-centered circles and freezes the new spell effect while paused',()=>{
  const {state,pay}=prepared();const target=state.fighters[0];target.x=0;target.y=7;
  toggleArena(state);expect(playCard(state,state.hand[0].id,{x:0,y:7.5},pay())).toBe(true);
  const paused=structuredClone(state);advanceArena(state,20);expect(state).toEqual(paused);
  toggleArena(state);advanceArena(state,2);expect(state.effects.some(effect=>effect.kind==='area')).toBe(false);
 });
 it('uses four red stones for the larger blast, kills all targets without fighter rewards and resolves a draw',()=>{
  const {state,card,pay}=prepared('divine-wrath');state.fighters=state.fighters.slice(0,2);
  for(const fighter of state.fighters){fighter.x=0;fighter.hp=3;}
  state.fighters[1].x=2.5;
  const before=structuredClone(state);expect(playCard(state,state.hand[0].id,{x:0,y:0},pay().slice(0,3))).toBe(false);expect(state).toEqual(before);
  expect(playCard(state,state.hand[0].id,{x:0,y:0},pay())).toBe(true);
  expect(state.fighters.every(f=>f.hp===0&&f.buffs.length===0)).toBe(true);
  expect(state.stones).toHaveLength(2);expect(state.effects.find(e=>e.kind==='area')?.areaRadius).toBe(2.5);
  expect(state.discard).toEqual([card.id]);advanceArena(state,1/30);expect(state.status).toBe('finished');expect(state.winnerId).toBeUndefined();
 });
 it('rejects payable area commands before battle and while final attacks are resolving',()=>{
  for(const phase of ['ready','finished','survivor','timeout'] as const){
   const {state,pay}=prepared();state.fighters[0].x=0;
   if(phase==='ready'||phase==='finished')state.status=phase;
   else if(phase==='timeout')state.time=180;
   else state.fighters.slice(1).forEach(f=>{f.hp=0;});
   const before=structuredClone(state);expect(playCard(state,state.hand[0].id,{x:0,y:0},pay())).toBe(false);expect(state).toEqual(before);
  }
 });
});
