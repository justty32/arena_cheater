import { describe,expect,it } from 'vitest';
import { createArena,playCard,toggleArena } from '../../src/arena/sim/engine';
import { advanceItems } from '../../src/arena/items/engine-items';
import { type ThrownItem,type ThrownKind } from '../../src/arena/model';
function flight(id:number,weapon:ThrownKind='sword',fromX=-2,fromY=0,toX=2,toY=0):ThrownItem {
 return {id,weapon,x:fromX,y:fromY,fromX,fromY,toX,toY,launched:0,landsAt:1,landed:false};
}
function arena(){const state=createArena(42);toggleArena(state);state.fighters.forEach(f=>{f.x=6;f.y=3;f.speed=0;f.nextAttack=Infinity;});return state;}
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
  expect(state.latestThrow.impact).toMatchObject({reason:'fighter',fighterId:target.id,damage:1.2});
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
