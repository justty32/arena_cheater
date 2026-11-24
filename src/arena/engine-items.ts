import { CARDS } from './shared/card-catalog';
import { ARENA_RADIUS, THROW_TARGET_RADIUS, THROW_ORIGIN, THROW_PROFILES } from './shared/rules';
import { areaSpellTargets, isThrowableTarget, isTrapTarget } from './shared/targeting';
import { isResolvingArena } from './shared/status';
import type { ArenaState, Card, Fighter, ThrownItem, ThrowImpact, ThrownKind, Weapon, TrapKind } from './shared/types';
import { canEquip, equip } from './equipment';
import { sweptCircleTime, type Point } from './geometry';
import { canPayCost, findPayment, consumeCard, drawCard, drawStones, beginDeliberation, revealUpcomingCards } from './engine-cards';
import { placeTrap } from './engine-traps';
import { applyDungStatus, applyHealthDamage, damageFighter, distance, effect, log } from './engine-damage';

function sweptThrowFighterTime(from: Point, to: Point, fighter: Fighter): number | undefined {
  return sweptCircleTime(from, to, fighter, fighter, fighter.radius + 0.11);
}

/** First contact along the aim path using the fighters' current positions. */
export function previewThrowContact(card: Card, aim: Point | undefined, fighters: readonly Fighter[]): Fighter | undefined {
  if (!aim || !isThrowableTarget(card, aim)) return undefined;
  let first: Fighter | undefined;
  let firstTime = Infinity;
  for (const fighter of fighters) {
    if (fighter.hp <= 0) continue;
    const time = sweptThrowFighterTime(THROW_ORIGIN, aim, fighter);
    if (time === undefined) continue;
    if (!first || time < firstTime || (time === firstTime && fighter.id.localeCompare(first.id) < 0)) {
      first = fighter;
      firstTime = time;
    }
  }
  return first;
}

export interface CardTarget { fighterId?: string; x?: number; y?: number }
export type CardPlayRejection = 'not-started' | 'finished' | 'resolving' | 'card-missing' |
  'target-required' | 'target-missing' | 'target-dead' | 'target-full-health' | 'invalid-point' |
  'outside-arena' | 'out-of-range' | 'empty-area' | 'deliberation-pending' | 'empty-deck' | 'insufficient-stones' | 'invalid-payment';
export type CardPlayValidation = { ok: true } | { ok: false; reason: CardPlayRejection };
/** Pure preflight shared by feedback and the authoritative command. */
export function validateCardPlay(state: ArenaState, handCardId: number, target: CardTarget, stoneIds: readonly number[]): CardPlayValidation {
  if (state.status === 'ready') return {ok:false,reason:'not-started'};
  if (state.status === 'finished') return {ok:false,reason:'finished'};
  if (state.pendingDeliberation) return {ok:false,reason:'deliberation-pending'};
  if (isResolvingArena(state)) return {ok:false,reason:'resolving'};
  const instance = state.hand.find(value => value.id === handCardId);
  const card = CARDS.find(value => value.id === instance?.cardId);
  if (!card) return {ok:false,reason:'card-missing'};
  if (card.target === 'self') {
    if (target.x !== undefined || target.y !== undefined || target.fighterId !== undefined) return {ok:false,reason:'invalid-point'};
    if (!state.deck.length && !state.discard.length) return {ok:false,reason:'empty-deck'};
  } else if (card.target === 'fighter') {
    if (target.fighterId === undefined) return {ok:false,reason:'target-required'};
    const fighter = state.fighters.find(value => value.id === target.fighterId);
    if (!fighter) return {ok:false,reason:'target-missing'};
    if (fighter.hp <= 0) return {ok:false,reason:'target-dead'};
    if (card.id === 'growth' && fighter.hp >= fighter.maxHp) return {ok:false,reason:'target-full-health'};
  } else {
    const {x,y} = target;
    if (x === undefined || y === undefined) return {ok:false,reason:'target-required'};
    if (!Number.isFinite(x) || !Number.isFinite(y)) return {ok:false,reason:'invalid-point'};
    const insideArena = card.target === 'trap'
      ? isTrapTarget(card, {x,y})
      : Math.hypot(x,y) <= (card.target === 'area' ? ARENA_RADIUS : THROW_TARGET_RADIUS);
    if (!insideArena) return {ok:false,reason:'outside-arena'};
    if (card.target === 'area') {
      if (!areaSpellTargets(state.fighters,card,{x,y}).length) return {ok:false,reason:'empty-area'};
    } else if (card.target === 'ground' && !isThrowableTarget(card,{x,y})) return {ok:false,reason:'out-of-range'};
  }
  if (!findPayment(state,card.cost)) return {ok:false,reason:'insufficient-stones'};
  if (!canPayCost(state,card.cost,stoneIds)) return {ok:false,reason:'invalid-payment'};
  return {ok:true};
}
export function playCard(state: ArenaState, handCardId: number, target: CardTarget, stoneIds: number[]): boolean {
  if (!validateCardPlay(state,handCardId,target,stoneIds).ok) return false;
  const instance = state.hand.find(value => value.id === handCardId)!;
  const card = CARDS.find(value => value.id === instance.cardId)!;
  if (card.id === 'deliberate') {
    beginDeliberation(state, handCardId, stoneIds);
    return true;
  }
  const fighter = state.fighters.find(value => value.id === target.fighterId);
  const {x,y} = target;
  const areaTargets = card.target === 'area' ? areaSpellTargets(state.fighters,card,{x:x!,y:y!}) : [];
  consumeCard(state, handCardId, stoneIds);
  if (card.target === 'fighter' && fighter) {
    if (card.id === 'lightning') applyHealthDamage(state, fighter, 3);
    if (card.id === 'bloodlust') {
      fighter.buffs = fighter.buffs.filter(buff => buff.kind !== 'bloodlust');
      fighter.buffs.push({ kind: 'bloodlust', until: state.time + 5 });
    }
    if (card.id === 'growth') fighter.hp = Math.min(fighter.maxHp, fighter.hp + 10);
    effect(state, fighter, card.name, card.color, 'spell');
    log(state, `${card.name} → ${fighter.name}`);
  } else if (card.target === 'area') {
    for (const target of areaTargets) {
      applyHealthDamage(state,target,card.damage);
      effect(state,target,`−${card.damage}`,'#f0a393');
    }
    state.effects.push({id:state.nextId++,x:x!,y:y!,at:state.time,kind:'area',areaRadius:card.areaRadius,cardId:card.id,text:card.name,color:card.color});
    log(state,`${card.name}命中 ${areaTargets.length} 名鬥士`);
  } else if (card.target === 'trap') {
    placeTrap(state, {x:x!, y:y!}, card.id as TrapKind);
  } else if (card.target === 'ground') {
    const {x:fromX,y:fromY} = THROW_ORIGIN;
    const itemId = state.nextId++;
    state.items.push({ id: itemId, weapon: card.id as ThrownKind, x: fromX, y: fromY, fromX, fromY,
      toX: x!, toY: y!, launched: state.time, landsAt: state.time + Math.hypot(x! - fromX, y! - fromY) / 9 + 0.35, landed: false });
    state.latestThrow = {itemId,handCardId,itemKind:card.id as ThrownKind,launchedAt:state.time};
    log(state, THROW_PROFILES[card.id as ThrownKind].disposable ? `投擲${card.name}` : `投送${card.name}，任何鬥士都能搶走它`);
  }
  drawStones(state, 2);
  drawCard(state);
  if (card.id === 'intuition') revealUpcomingCards(state);
  return true;
}

function positionAt(item: ThrownItem, time: number): { x: number; y: number } {
  const duration = item.landsAt - item.launched;
  const progress = duration <= 0 ? 1 : Math.max(0, Math.min(1, (time - item.launched) / duration));
  return { x: item.fromX + (item.toX - item.fromX) * progress, y: item.fromY + (item.toY - item.fromY) * progress };
}

function previousTime(item: ThrownItem): number {
  const dx = item.toX - item.fromX, dy = item.toY - item.fromY;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared > 0 ? ((item.x - item.fromX) * dx + (item.y - item.fromY) * dy) / lengthSquared : 0;
  return item.launched + Math.max(0, Math.min(1, progress)) * (item.landsAt - item.launched);
}

type ImpactContext = Omit<Extract<ThrowImpact,{reason:'fighter'}>, 'at'|'x'|'y'> | Omit<Extract<ThrowImpact,{reason:'item'}>, 'at'|'x'|'y'> | {reason:'ground'};
function landItem(state: ArenaState, item: ThrownItem, time: number, context: ImpactContext = {reason:'ground'}): void {
  Object.assign(item, positionAt(item, time));
  item.landed = true; item.toX = item.x; item.toY = item.y; item.landsAt = time;
  if (state.latestThrow?.itemId === item.id) state.latestThrow.impact = {...context,at:time,x:item.x,y:item.y};
  const name = CARDS.find(card => card.id === item.weapon)?.name ?? '裝備';
  if (THROW_PROFILES[item.weapon].disposable) log(state,item.weapon === 'pot' ? '陶罐碎裂' : `${name}落地`);
  state.effects.push({id:state.nextId++,x:item.x,y:item.y,at:time,kind:'impact',itemKind:item.weapon,
    text:item.weapon === 'pot' ? '陶罐碎裂' : `${name}落地`,color:item.weapon==='pot'?'#c58f67':'#c6b493'});
}
export function advanceItems(state: ArenaState, _dt?: number): void {
  const flying = state.items.filter(item => !item.landed);
  type Contact = {a:ThrownItem; b?:ThrownItem; fighter?:Fighter; time:number};
  const contacts: Contact[] = [];
  for (let i = 0; i < flying.length; i++) {
    const a = flying[i];
    for (const b of flying.slice(i + 1)) {
      const start = Math.max(previousTime(a), previousTime(b), a.launched + 0.15, b.launched + 0.15);
      const end = Math.min(state.time, a.landsAt, b.landsAt);
      if (end < start) continue;
      const t = sweptCircleTime(positionAt(a, start), positionAt(a, end), positionAt(b, start), positionAt(b, end), 0.22);
      if (t !== undefined) contacts.push({ a, b, time: start + (end - start) * t });
    }
    const start = Math.max(previousTime(a), a.launched);
    const end = Math.min(state.time,a.landsAt);
    if (end < start) continue;
    for (const fighter of state.fighters.filter(value => value.hp > 0)) {
      const t = sweptThrowFighterTime(positionAt(a,start),positionAt(a,end),fighter);
      if (t !== undefined) contacts.push({a,fighter,time:start+(end-start)*t});
    }
  }
  contacts.sort((a,b) => a.time-b.time || Number(!a.b)-Number(!b.b) || a.a.id-b.a.id ||
    (a.b?.id ?? 0)-(b.b?.id ?? 0) || (a.fighter?.id ?? '').localeCompare(b.fighter?.id ?? ''));
  for (const contact of contacts) {
    if (contact.a.landed || contact.b?.landed || (contact.fighter && contact.fighter.hp <= 0)) continue;
    if (contact.b) {
      landItem(state,contact.a,contact.time,{reason:'item',otherItemId:contact.b.id});
      landItem(state,contact.b,contact.time,{reason:'item',otherItemId:contact.a.id});
      log(state,'投送物在半空相撞，掉落競技場');
    } else if (contact.fighter) {
      const item=contact.a, target=contact.fighter, profile=THROW_PROFILES[item.weapon];
      const healthBefore = target.hp;
      if (profile.damage > 0) {
        if (profile.bypassDefense) {
          applyHealthDamage(state,target,profile.damage);
          effect(state,target,`−${profile.damage}`,'#f0a393');
        } else damageFighter(state,target,profile.damage,{x:item.fromX,y:item.fromY});
      }
      const dungApplied = item.weapon === 'dung' && target.hp > 0;
      if (dungApplied) applyDungStatus(state, target);
      log(state,`${CARDS.find(card=>card.id===item.weapon)?.name ?? '投送物'}命中${target.name}${dungApplied ? '，造成虛弱與持傷' : ''}`);
      landItem(state,item,contact.time,{
        reason:'fighter', fighterId:target.id, damage:healthBefore-target.hp,
        ...(dungApplied ? {dungApplied} : {}),
      });
    }
  }
  for (const item of flying) {
    if (item.landed) continue;
    if (state.time >= item.landsAt) landItem(state,item,item.landsAt);
    else Object.assign(item,positionAt(item,state.time));
  }
  state.items = state.items.filter(item => {
    if (!item.landed) return true;
    if (THROW_PROFILES[item.weapon].disposable) return false;
    const weapon=item.weapon as Weapon;
    const fighter = state.fighters.filter(value => value.hp > 0 && !['fallen', 'airborne', 'rising'].includes(value.pose) &&
      distance(value, item) <= value.radius + 0.35 && canEquip(value, weapon))
      .sort((a, b) => distance(a, item) - distance(b, item) || a.id.localeCompare(b.id))[0];
    if (!fighter) return true;
    equip(fighter,weapon);
    if (state.latestThrow?.itemId === item.id) state.latestThrow.pickup = {at:state.time,fighterId:fighter.id};
    const name = CARDS.find(card => card.id === item.weapon)?.name ?? '裝備';
    effect(state, fighter, `拾取${name}`, '#ebc982', 'pickup');
    log(state, `${fighter.name} 拾取${name}`);
    return false;
  });
}
