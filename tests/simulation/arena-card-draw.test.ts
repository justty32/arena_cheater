import { describe, expect, it } from 'vitest';
import { advanceArena, chooseDeliberation, createArena, findPayment, keepDeliberationPaused, knownUpcomingCards, validateCardPlay, playCard, redrawStones, toggleArena } from '../../src/arena/engine';
import { drawCard, drawStones } from '../../src/arena/engine-cards';
import { CARDS, type ArenaState, type CardId, type StoneColor } from '../../src/arena/model';
function ready(cardId:CardId='lightning', colors:StoneColor[]=['red','blue','green']):ArenaState {
 const state=createArena(42);toggleArena(state);
 state.hand=[{id:state.nextId++,cardId}];state.stones=colors.map(color=>({id:state.nextId++,color}));return state;
}
function cast(state:ArenaState):boolean {
 const card=CARDS.find(card=>card.id===state.hand[0].cardId)!;
 return playCard(state,state.hand[0].id,{fighterId:state.fighters[0].id,x:0,y:0},findPayment(state,card.cost)??[]);
}
describe('V2 cards and stones',()=>{
 it('deals three cards and three stones from a reproducible finite deck',()=>{
  const a=createArena(42);expect(a).toEqual(createArena(42));expect(a.hand).toHaveLength(3);expect(a.stones).toHaveLength(3);
  const all=[...a.hand.map(c=>c.cardId),...a.deck];expect(all).toHaveLength(CARDS.length * 2);
  for(const card of CARDS)expect(all.filter(id=>id===card.id)).toHaveLength(2);
 });
 it('reveals the real draw order across recycling, equipment play and stone exchange',()=>{
  const state=ready('intuition'), [red,blue]=state.stones;
  const intuition=state.hand[0];
  state.deck=['bow','spear'];state.discard=['shield'];
  expect(playCard(state,intuition.id,{},[blue.id])).toBe(true);
  const spear=state.hand[0];
  expect(spear.cardId).toBe('spear');
  expect(state.status).toBe('running');
  expect(state.stones).toHaveLength(4);
  const [first,second]=knownUpcomingCards(state);
  expect(first).toBe('bow');
  expect(['intuition','shield']).toContain(second);
  expect(state.discard).toEqual([]);

  expect(playCard(state,spear.id,{x:0,y:0},[red.id])).toBe(true);
  const bow=state.hand[0];
  expect(bow.cardId).toBe(first);
  expect(knownUpcomingCards(state)).toEqual([second]);
  expect(state.discard).toEqual(['spear']);
  const afterFirst=structuredClone(state);
  expect(redrawStones(state,bow.id,[])).toBe(false);
  expect(state).toEqual(afterFirst);
  expect(redrawStones(state,bow.id,[state.stones[0].id])).toBe(true);
  expect(state.hand[0].cardId).toBe(second);
  expect(knownUpcomingCards(state)).toEqual([]);
  expect(state.discard).toEqual(['spear','bow']);
 });
 it('keeps intuition preflight pure and consumes known cards when deliberation reveals them',()=>{
  const state=ready('intuition',['blue','blue','red']);
  state.deck=['sword','bow','shield','deliberate'];state.discard=[];
  const spell=state.hand[0], [blue,otherBlue,red]=state.stones;
  const before=structuredClone(state);
  expect(knownUpcomingCards(state)).toEqual([]);
  expect(validateCardPlay(state,spell.id,{},[blue.id])).toEqual({ok:true});
  expect(playCard(state,spell.id,{x:0,y:0},[blue.id])).toBe(false);
  expect(playCard(state,spell.id,{},[red.id])).toBe(false);
  expect(playCard(state,spell.id + 999,{},[blue.id])).toBe(false);
  expect(state).toEqual(before);
  const onlyStoneDraws=structuredClone(state);
  drawStones(onlyStoneDraws,2);
  expect(playCard(state,spell.id,{},[blue.id])).toBe(true);
  expect(state.randomState).toBe(onlyStoneDraws.randomState);
  expect(knownUpcomingCards(state)).toEqual(['shield','bow']);
  expect(knownUpcomingCards(createArena(state.seed + 1))).toEqual([]);

  expect(playCard(state,state.hand[0].id,{},[otherBlue.id])).toBe(true);
  const offer=state.pendingDeliberation!;
  expect(offer.candidates).toEqual(['shield','bow','sword']);
  expect(knownUpcomingCards(state)).toEqual([]);
  const pending=structuredClone(state);
  expect(chooseDeliberation(state,{...offer},0)).toBe(false);
  expect(state).toEqual(pending);
  expect(chooseDeliberation(state,offer,1)).toBe(true);
  expect(state.hand[0].cardId).toBe('bow');
  expect(knownUpcomingCards(state)).toEqual([]);
 });
 it('rejects intuition without blue or a draw pile and reveals just one card when available',()=>{
  const state=ready('intuition',['red']);
  const spell=state.hand[0], red=state.stones[0].id;
  const noBlue=structuredClone(state);
  expect(validateCardPlay(state,spell.id,{},[red])).toEqual({ok:false,reason:'insufficient-stones'});
  expect(playCard(state,spell.id,{},[red])).toBe(false);
  expect(state).toEqual(noBlue);

  state.stones[0].color='blue';state.deck=[];state.discard=[];
  const noCards=structuredClone(state);
  expect(validateCardPlay(state,spell.id,{},[red])).toEqual({ok:false,reason:'empty-deck'});
  expect(playCard(state,spell.id,{},[red])).toBe(false);
  expect(state).toEqual(noCards);

  state.deck=['spear'];toggleArena(state);
  expect(playCard(state,spell.id,{},[red])).toBe(true);
  expect(state.status).toBe('paused');
  expect(state.hand[0].cardId).toBe('spear');
  expect(knownUpcomingCards(state)).toEqual(['intuition']);

  const recycled=ready('intuition');
  recycled.deck=[];recycled.discard=['bow'];
  const [played]=recycled.hand;
  expect(playCard(recycled,played.id,{},[recycled.stones[1].id])).toBe(true);
  expect(recycled.hand[0].id).not.toBe(played.id);
  expect([recycled.hand[0].cardId,...knownUpcomingCards(recycled)].sort()).toEqual(['bow','intuition']);
  const after=structuredClone(recycled);
  expect(playCard(recycled,played.id,{},[recycled.stones[0].id])).toBe(false);
  expect(recycled).toEqual(after);
 });
 it('pays once, holds all candidates until one is chosen, and resumes a running arena',()=>{
  const state=ready('deliberate');
  state.hand.push({id:state.nextId++,cardId:'sword'});
  state.deck=['stone','bow','bow'];state.discard=[];
  const [spell,sword]=state.hand,[red,blue]=state.stones;
  const before=structuredClone(state);
  expect(validateCardPlay(state,spell.id,{},[blue.id])).toEqual({ok:true});
  expect(playCard(state,spell.id,{},[red.id])).toBe(false);
  expect(state).toEqual(before);

  expect(playCard(state,spell.id,{},[blue.id])).toBe(true);
  const offer=state.pendingDeliberation!;
  expect([...offer.candidates].sort()).toEqual(['bow','bow','stone']);
  expect(state.deck).toEqual([]);expect(state.discard).toEqual(['deliberate']);
  expect(state.status).toBe('paused');expect(state.hand).toEqual([sword]);
  expect(state.stones).toHaveLength(4);
  expect(state.stones.some(stone=>stone.id===blue.id)).toBe(false);
  const pending=structuredClone(state);
  expect(validateCardPlay(state,sword.id,{x:0,y:0},[red.id])).toEqual({ok:false,reason:'deliberation-pending'});
  expect(playCard(state,spell.id,{},[blue.id])).toBe(false);
  expect(redrawStones(state,sword.id,[red.id])).toBe(false);
  expect(chooseDeliberation(state,offer,3)).toBe(false);
  toggleArena(state);advanceArena(state,1);
  expect(state).toEqual(pending);

  expect(chooseDeliberation(state,offer,offer.candidates.lastIndexOf('bow'))).toBe(true);
  expect(state.pendingDeliberation).toBeUndefined();expect(state.status).toBe('running');
  expect(state.hand.map(card=>card.cardId)).toEqual(['sword','bow']);
  expect([...state.deck,...state.discard,...state.hand.map(card=>card.cardId)].sort())
   .toEqual([...before.deck,...before.discard,...before.hand.map(card=>card.cardId)].sort());
  expect(state.stones).toEqual(pending.stones);
  const chosen=structuredClone(state);
  expect(chooseDeliberation(state,offer,0)).toBe(false);expect(state).toEqual(chosen);
 });
 it('recycles only cards already discarded and protects an outstanding offer from old choices',()=>{
  const state=ready('deliberate');toggleArena(state);
  state.deck=[];state.discard=['deliberate'];
  expect(playCard(state,state.hand[0].id,{},[state.stones[1].id])).toBe(true);
  const oldOffer=state.pendingDeliberation!;
  expect(oldOffer.candidates).toEqual(['deliberate']);
  expect(chooseDeliberation(state,oldOffer,0)).toBe(true);
  expect(state.status).toBe('paused');expect(state.discard).toEqual(['deliberate']);

  const next=ready('deliberate');
  next.deck=[];next.discard=['deliberate'];
  expect(playCard(next,next.hand[0].id,{},[next.stones[1].id])).toBe(true);
  const pending=structuredClone(next);
  expect(createArena(next.seed+1).pendingDeliberation).toBeUndefined();
  expect(chooseDeliberation(next,oldOffer,0)).toBe(false);expect(next).toEqual(pending);
  keepDeliberationPaused(next);
  expect(chooseDeliberation(next,next.pendingDeliberation!,0)).toBe(true);
  expect(next.status).toBe('paused');
 });
 it('rejects deliberation without candidates before spending a card, stones, or random draws',()=>{
  const state=ready('deliberate');state.deck=[];state.discard=[];
  const before=structuredClone(state),id=state.hand[0].id,payment=[state.stones[1].id];
  expect(validateCardPlay(state,id,{},payment)).toEqual({ok:false,reason:'empty-deck'});
  expect(playCard(state,id,{},payment)).toBe(false);
  expect(state).toEqual(before);
 });
 it('recycles only discarded cards when the deck runs dry',()=>{
  const castFromEmpty=ready();castFromEmpty.deck=[];castFromEmpty.discard=[];
  const used=castFromEmpty.hand[0];
  expect(cast(castFromEmpty)).toBe(true);
  expect(castFromEmpty.hand[0]).toMatchObject({cardId:used.cardId});
  expect(castFromEmpty.hand[0].id).not.toBe(used.id);
  const state=ready();state.deck=[];state.discard=['bow','sword'];state.hand=[];
  drawCard(state);drawCard(state);expect(state.hand.map(c=>c.cardId).sort()).toEqual(['bow','sword']);expect(state.discard).toEqual([]);
 });
 it('conserves two copies of every card over repeated discard reshuffles',()=>{
  const state=createArena(42);toggleArena(state);let reshuffles=0;
  state.discard=state.deck.splice(0,state.deck.length-1);
  while(reshuffles<2){
   const wasEmpty=state.deck.length===0;
   expect(redrawStones(state,state.hand[0].id,[state.stones[0].id])).toBe(true);
   if(wasEmpty)reshuffles++;
   const all=[...state.deck,...state.discard,...state.hand.map(card=>card.cardId)];
   expect(all).toHaveLength(CARDS.length*2);
   for(const card of CARDS)expect(all.filter(id=>id===card.id)).toHaveLength(2);
   expect(new Set(state.hand.map(card=>card.id)).size).toBe(3);
   state.time+=3;
  }
 });
});
