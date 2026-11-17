import { describe, expect, it } from 'vitest';
import { advanceArena, canPayCost, createArena, findPayment, paymentStatus, validateCardPlay, playCard, redrawStones, toggleArena } from '../../src/arena/engine';
import { applyHealthDamage, attackDamage, damageFighter } from '../../src/arena/engine-damage';
import { advanceArrows } from '../../src/arena/engine-arrows';
import { drawCard } from '../../src/arena/engine-cards';
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
  const all=[...a.hand.map(c=>c.cardId),...a.deck];for(const card of CARDS)expect(all.filter(id=>id===card.id)).toHaveLength(2);
 });
 it('requires exact distinct payment with the specified colors',()=>{
  const state=ready('bloodlust');const cost=CARDS.find(c=>c.id==='bloodlust')!.cost;
  const ids=state.stones.map(s=>s.id);
  expect(canPayCost(state,cost,[ids[0],ids[1]])).toBe(true);
  for(const payment of [[ids[1],ids[2]],[ids[0],ids[0]],[999,ids[0]],ids,[]])expect(canPayCost(state,cost,payment)).toBe(false);
  expect(findPayment(state,cost)).toEqual([ids[0],ids[1]]);
 });
 it('reports actionable payment deficits without replacing the selected stones',()=>{
  const state=ready('bloodlust',['red','blue','blue']);const cost=CARDS.find(c=>c.id==='bloodlust')!.cost;
  const [red,blue,otherBlue]=state.stones.map(stone=>stone.id),before=structuredClone(state);
  expect(paymentStatus(state,cost,[blue,otherBlue])).toMatchObject({valid:false,missingColors:{red:1},missingGeneric:0,excessCount:1});
  expect(paymentStatus(state,cost,[red])).toMatchObject({valid:false,missingColors:{},missingGeneric:1});
  expect(paymentStatus(state,cost,[red,otherBlue])).toMatchObject({valid:true,missingGeneric:0,excessCount:0});
  expect(paymentStatus(state,cost,[red,red])).toMatchObject({valid:false,invalidSelection:true});
  expect(state).toEqual(before);
 });
 it('distinguishes dead and missing targets and revalidates a previously accepted target on submission',()=>{
  const state=ready(),target=state.fighters[0],id=state.hand[0].id,payment=[state.stones[0].id];
  const before=structuredClone(state);expect(validateCardPlay(state,id,{fighterId:target.id},payment)).toEqual({ok:true});expect(state).toEqual(before);
  target.hp=0;const afterDeath=structuredClone(state);
  expect(validateCardPlay(state,id,{fighterId:target.id},payment)).toEqual({ok:false,reason:'target-dead'});
  expect(validateCardPlay(state,id,{fighterId:'missing'},payment)).toEqual({ok:false,reason:'target-missing'});
  expect(playCard(state,id,{fighterId:target.id},payment)).toBe(false);expect(state).toEqual(afterDeath);
 });
 it('separates unavailable resources from an invalid exact payment without changing state',()=>{
  const state=ready(),id=state.hand[0].id,target={fighterId:state.fighters[0].id};
  expect(validateCardPlay(state,id,target,[state.stones[1].id])).toEqual({ok:false,reason:'invalid-payment'});
  state.stones=state.stones.filter(stone=>stone.color!=='red');const before=structuredClone(state);
  expect(validateCardPlay(state,id,target,[state.stones[0].id])).toEqual({ok:false,reason:'insufficient-stones'});
  expect(state).toEqual(before);
 });
 it('spends once, draws two stones and one card and bypasses physical defense',()=>{
  const state=ready();const target=state.fighters[0];target.shield=true;target.parryUntil=10;
  const hp=target.hp, stamina=target.stamina, oldId=state.hand[0].id;
  expect(cast(state)).toBe(true);expect(target.hp).toBe(hp-3);expect(target.stamina).toBe(stamina);
  expect(state.stones).toHaveLength(4);expect(state.hand).toHaveLength(1);expect(state.hand[0].id).not.toBe(oldId);expect(state.discard).toEqual(['lightning']);
  const before=structuredClone(state);expect(playCard(state,oldId,{fighterId:target.id},[])).toBe(false);expect(state).toEqual(before);
 });
 it('adds three attack and caps healing',()=>{
  const state=ready('bloodlust');const fighter=state.fighters[0],damage=attackDamage(fighter);
  expect(cast(state)).toBe(true);expect(attackDamage(fighter)).toBe(damage+3);expect(fighter.buffs).toEqual([{kind:'bloodlust',until:5}]);
  state.hand=[{id:state.nextId++,cardId:'growth'}];state.stones=['green','blue','red'].map(color=>({id:state.nextId++,color:color as StoneColor}));
  fighter.hp=fighter.maxHp-2;expect(cast(state)).toBe(true);expect(fighter.hp).toBe(fighter.maxHp);
 });
 it('rejects healing a full-health target without spending cards, stones or random draws',()=>{
  const state=ready('growth');const before=structuredClone(state);
  expect(cast(state)).toBe(false);expect(state).toEqual(before);
 });
 it('refreshes bloodlust without stacking, freezes while paused and restores attack after expiry',()=>{
  const state=ready('bloodlust'),fighter=state.fighters[0],base=attackDamage(fighter);
  for(const value of state.fighters){value.speed=0;value.nextAttack=Infinity;}
  expect(cast(state)).toBe(true);
  advanceArena(state,2);
  state.hand=[{id:state.nextId++,cardId:'bloodlust'}];
  state.stones=[{id:state.nextId++,color:'red'},{id:state.nextId++,color:'blue'}];
  expect(cast(state)).toBe(true);expect(attackDamage(fighter)).toBe(base+3);
  expect(fighter.buffs).toHaveLength(1);expect(fighter.buffs[0].until).toBeCloseTo(7);
  toggleArena(state);const paused=structuredClone(state);advanceArena(state,20);expect(state).toEqual(paused);
  toggleArena(state);advanceArena(state,4.9);expect(attackDamage(fighter)).toBe(base+3);
  advanceArena(state,0.2);expect(fighter.buffs).toEqual([]);expect(attackDamage(fighter)).toBe(base);
 });
 it('rejects all invalid commands without changing any state',()=>{
  for(const status of ['ready','finished','paused','running'] as const){
   const state=ready();state.status=status;if(status==='paused')state.time=180;
   const before=structuredClone(state),id=state.hand[0].id,stone=state.stones[0].id;
   expect(playCard(state,id,{fighterId:'missing'},[stone])).toBe(false);
   expect(playCard(state,id,{fighterId:state.fighters[0].id},[999])).toBe(false);
   expect(redrawStones(state,id,[])).toBe(false);expect(redrawStones(state,id,[stone,stone])).toBe(false);expect(redrawStones(state,id,[999])).toBe(false);
   if(status!=='running')expect(redrawStones(state,id,[stone])).toBe(false);
   expect(state).toEqual(before);
  }
 });
 it('refuses payable spells, deliveries and redraws outside active combat, including paused final arrows',()=>{
  for (const phase of ['ready','finished','survivor','timeout'] as const) {
   const statuses = phase === 'ready' || phase === 'finished' ? [phase] : ['running','paused'] as const;
   for (const status of statuses) for (const cardId of ['lightning','sword'] as const) {
    const state=ready(cardId);state.status=status;
    if(phase==='survivor')state.fighters.slice(1).forEach(f=>{f.hp=0;});
    if(phase==='timeout')state.time=180;
    if(phase==='survivor'||phase==='timeout')state.arrows=[{id:state.nextId++,ownerId:state.fighters[0].id,x:0,y:0,vx:1,vy:0,damage:10,expiresAt:state.time+2}];
    const context=`${phase}/${status}/${cardId}`;
    expect(findPayment(state,CARDS.find(card=>card.id===cardId)!.cost),context).toBeDefined();
    const before=structuredClone(state);
    expect(cast(state),context).toBe(false);
    expect(redrawStones(state,state.hand[0].id,[state.stones[0].id]),context).toBe(false);
    expect(state,context).toEqual(before);
   }
  }
 });
 it('keeps stone income tied to commands and kills rather than elapsed time',()=>{
  const state=ready();const stones=structuredClone(state.stones);advanceArena(state,0.5);expect(state.stones).toEqual(stones);
 });
 it('replays card and stone draws across matching command sequences',()=>{
  const a=ready('bow'),b=ready('bow');
  for(const state of [a,b]){expect(cast(state)).toBe(true);expect(redrawStones(state,state.hand[0].id,[state.stones[0].id])).toBe(true);}
  expect(a).toEqual(b);
 });
 it('exchanges N stones for N+1 and a replacement card, with a frozen paused cooldown',()=>{
  const state=ready();toggleArena(state);const ids=state.stones.slice(0,2).map(s=>s.id);
  expect(redrawStones(state,state.hand[0].id,ids)).toBe(true);expect(state.stones).toHaveLength(4);expect(state.hand).toHaveLength(1);expect(state.redrawAvailableAt).toBe(3);
  const before=structuredClone(state);expect(redrawStones(state,state.hand[0].id,[state.stones[0].id])).toBe(false);advanceArena(state,10);expect(state).toEqual(before);
  toggleArena(state);advanceArena(state,3.1);expect(redrawStones(state,state.hand[0].id,[state.stones[0].id])).toBe(true);
 });
 it('recycles only discarded cards when the deck runs dry',()=>{
  const state=ready();state.deck=[];state.discard=['bow','sword'];state.hand=[];
  drawCard(state);drawCard(state);expect(state.hand.map(c=>c.cardId).sort()).toEqual(['bow','sword']);expect(state.discard).toEqual([]);
 });
 it('conserves two copies of every card over repeated discard reshuffles',()=>{
  const state=createArena(42);toggleArena(state);let reshuffles=0;
  for(let i=0;i<55;i++){
   const wasEmpty=state.deck.length===0;
   expect(redrawStones(state,state.hand[0].id,[state.stones[0].id])).toBe(true);
   if(wasEmpty)reshuffles++;
   const all=[...state.deck,...state.discard,...state.hand.map(card=>card.cardId)];
   expect(all).toHaveLength(CARDS.length*2);
   for(const card of CARDS)expect(all.filter(id=>id===card.id)).toHaveLength(2);
   expect(new Set(state.hand.map(card=>card.id)).size).toBe(3);
   state.time+=3;
  }
  expect(reshuffles).toBeGreaterThanOrEqual(2);
 });
 it('does not reward kills made by an unsupported melee fighter or archer',()=>{
  const state=ready(),[,attacker,meleeTarget,arrowTarget]=state.fighters;
  const stones=structuredClone(state.stones);
  meleeTarget.hp=1;damageFighter(state,meleeTarget,20,attacker,attacker);
  expect(meleeTarget.hp).toBe(0);expect(state.stones).toEqual(stones);
  state.fighters=[attacker,arrowTarget];arrowTarget.hp=1;arrowTarget.x=1;arrowTarget.y=0;
  state.arrows=[{id:state.nextId++,ownerId:attacker.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];
  advanceArrows(state,0.2);expect(arrowTarget.hp).toBe(0);expect(state.stones).toEqual(stones);
 });
 it('rewards supported melee and dead archers exactly once, with no spell kill reward',()=>{
  const state=ready(),[a,b]=state.fighters;b.hp=1;
  damageFighter(state,b,20,a,a);expect(state.stones).toHaveLength(6);expect(state.logs[0]).toContain('獲得 3 顆魔法石');damageFighter(state,b,20,a,a);expect(state.stones).toHaveLength(6);
  const c=state.fighters[2];c.hp=1;applyHealthDamage(state,c,3);expect(state.stones).toHaveLength(6);
  a.hp=0;const d=state.fighters[3];d.hp=1;d.x=1;d.y=0;
  state.fighters=[a,d];state.arrows=[{id:state.nextId++,ownerId:a.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];
  advanceArrows(state,0.2);expect(d.hp).toBe(0);expect(state.stones).toHaveLength(9);
 });
 it('does not stun a distant archer when its arrow is parried',()=>{
  const state=ready(),[a,b]=state.fighters;state.fighters=[a,b];a.pose='idle';b.x=1;b.y=0;b.facing=Math.PI;b.shield=true;b.parryUntil=1;
  state.arrows=[{id:state.nextId++,ownerId:a.id,x:0,y:0,vx:12,vy:0,damage:10,expiresAt:2}];advanceArrows(state,0.2);expect(a.pose).toBe('idle');expect(b.hp).toBe(b.maxHp);
 });
});
