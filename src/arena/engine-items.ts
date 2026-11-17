import { CARDS, areaSpellTargets, THROW_ORIGIN, THROW_PROFILES, isThrowableTarget, isResolvingArena, type ArenaState, type Fighter, type ThrownItem, type ThrownKind, type Weapon } from './model';
import { distance, effect, log } from './engine-combat';
import { canEquip, equip } from './equipment';
import { sweptCircleTime } from './geometry';
import { canPayCost, consumeCard, drawCard, drawStones } from './engine-cards';
import { applyHealthDamage, damageFighter } from './engine-damage';

export interface CardTarget { fighterId?: string; x?: number; y?: number }
export function playCard(state: ArenaState, handCardId: number, target: CardTarget, stoneIds: number[]): boolean {
  if ((state.status !== 'running' && state.status !== 'paused') || isResolvingArena(state)) return false;
  const instance = state.hand.find(value => value.id === handCardId);
  const card = CARDS.find(value => value.id === instance?.cardId);
  if (!card || !canPayCost(state, card.cost, stoneIds)) return false;
  const fighter = state.fighters.find(value => value.id === target.fighterId && value.hp > 0);
  const { x, y } = target;
  let areaTargets: Fighter[] = [];
  if (card.target === 'fighter') {
    if (!fighter || (card.id === 'growth' && fighter.hp >= fighter.maxHp)) return false;
  } else if (card.target === 'area') {
    if (x === undefined || y === undefined) return false;
    areaTargets = areaSpellTargets(state.fighters,card,{x,y});
    if (!areaTargets.length) return false;
  } else if (x === undefined || y === undefined || !isThrowableTarget(card,{x,y})) return false;
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
  } else {
    const {x:fromX,y:fromY} = THROW_ORIGIN;
    state.items.push({ id: state.nextId++, weapon: card.id as ThrownKind, x: fromX, y: fromY, fromX, fromY,
      toX: x!, toY: y!, launched: state.time, landsAt: state.time + Math.hypot(x! - fromX, y! - fromY) / 9 + 0.35, landed: false });
    log(state, THROW_PROFILES[card.id as ThrownKind].disposable ? `投擲${card.name}` : `投送${card.name}，任何鬥士都能搶走它`);
  }
  drawStones(state, 2);
  drawCard(state);
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

function landItem(state: ArenaState, item: ThrownItem, time: number): void {
  Object.assign(item, positionAt(item, time));
  item.landed = true; item.toX = item.x; item.toY = item.y; item.landsAt = time;
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
      const t = sweptCircleTime(positionAt(a,start),positionAt(a,end),fighter,fighter,fighter.radius+0.11);
      if (t !== undefined) contacts.push({a,fighter,time:start+(end-start)*t});
    }
  }
  contacts.sort((a,b) => a.time-b.time || Number(!a.b)-Number(!b.b) || a.a.id-b.a.id ||
    (a.b?.id ?? 0)-(b.b?.id ?? 0) || (a.fighter?.id ?? '').localeCompare(b.fighter?.id ?? ''));
  for (const contact of contacts) {
    if (contact.a.landed || contact.b?.landed || (contact.fighter && contact.fighter.hp <= 0)) continue;
    if (contact.b) {
      landItem(state,contact.a,contact.time);landItem(state,contact.b,contact.time);
      log(state,'投送物在半空相撞，掉落競技場');
    } else if (contact.fighter) {
      const item=contact.a, target=contact.fighter, profile=THROW_PROFILES[item.weapon];
      if (profile.damage > 0) {
        if (profile.bypassDefense) {
          applyHealthDamage(state,target,profile.damage);
          effect(state,target,`−${profile.damage}`,'#f0a393');
        } else damageFighter(state,target,profile.damage,{x:item.fromX,y:item.fromY});
      }
      log(state,`${CARDS.find(card=>card.id===item.weapon)?.name ?? '投送物'}命中${target.name}`);
      landItem(state,item,contact.time);
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
    const name = CARDS.find(card => card.id === item.weapon)?.name ?? '裝備';
    effect(state, fighter, `拾取${name}`, '#ebc982', 'pickup');
    log(state, `${fighter.name} 拾取${name}`);
    return false;
  });
}
