import { ARENA_RADIUS, CARDS, isResolvingArena, type ArenaState, type CardId, type ThrownItem, type Weapon } from './model';
import { distance, effect, log, syncStamina } from './engine-combat';
import { canEquip, equip } from './equipment';
import { sweptCircleTime } from './geometry';

export interface CardTarget { fighterId?: string; x?: number; y?: number }
export function playCard(state: ArenaState, cardId: CardId, target: CardTarget): boolean {
  if ((state.status !== 'running' && state.status !== 'paused') || isResolvingArena(state)) return false;
  const card = CARDS.find(value => value.id === cardId);
  if (!card || state[card.currency] < card.cost) return false;
  const fighter = state.fighters.find(value => value.id === target.fighterId && value.hp > 0);
  if (card.target === 'fighter') {
    if (!fighter || (cardId === 'trip' && fighter.pose === 'airborne')) return false;
    state[card.currency] -= card.cost;
    if (cardId === 'trip') { fighter.pose = 'fallen'; fighter.poseUntil = state.time + 2; }
    else if (cardId === 'fury' || cardId === 'haste' || cardId === 'weakness') {
      fighter.buffs = fighter.buffs.filter(buff => buff.kind !== cardId);
      fighter.buffs.push({ kind: cardId, until: state.time + (cardId === 'weakness' ? 7 : 8) });
      syncStamina(fighter, state.time);
    }
    effect(state, fighter, card.name, card.color, 'spell');
    log(state, `${card.name} → ${fighter.name}`);
    return true;
  }
  const { x, y } = target;
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > ARENA_RADIUS - 0.2) return false;
  state[card.currency] -= card.cost;
  const fromX = 0, fromY = ARENA_RADIUS;
  state.items.push({ id: state.nextId++, weapon: cardId as Weapon, x: fromX, y: fromY, fromX, fromY,
    toX: x, toY: y, launched: state.time, landsAt: state.time + Math.hypot(x - fromX, y - fromY) / 9 + 0.35, landed: false });
  log(state, `投送${card.name}，任何鬥士都能搶走它`);
  return true;
}
function positionAt(item: ThrownItem, time: number): { x: number; y: number } {
  const progress = Math.max(0, Math.min(1, (time - item.launched) / (item.landsAt - item.launched)));
  return { x: item.fromX + (item.toX - item.fromX) * progress, y: item.fromY + (item.toY - item.fromY) * progress };
}

function previousTime(item: ThrownItem): number {
  const dx = item.toX - item.fromX, dy = item.toY - item.fromY;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared > 0 ? ((item.x - item.fromX) * dx + (item.y - item.fromY) * dy) / lengthSquared : 0;
  return item.launched + Math.max(0, Math.min(1, progress)) * (item.landsAt - item.launched);
}

export function advanceItems(state: ArenaState, _dt?: number): void {
  const flying = state.items.filter(item => !item.landed);
  const contacts: { a: ThrownItem; b: ThrownItem; time: number }[] = [];
  for (let i = 0; i < flying.length; i++) {
    const a = flying[i];
    for (const b of flying.slice(i + 1)) {
      // Share one real-time interval: geometric paths crossing at different times do not collide.
      const start = Math.max(previousTime(a), previousTime(b), a.launched + 0.15, b.launched + 0.15);
      const end = Math.min(state.time, a.landsAt, b.landsAt);
      if (end < start) continue;
      const t = sweptCircleTime(positionAt(a, start), positionAt(a, end), positionAt(b, start), positionAt(b, end), 0.22);
      if (t !== undefined) contacts.push({ a, b, time: start + (end - start) * t });
    }
  }
  contacts.sort((a, b) => a.time - b.time || a.a.id - b.a.id || a.b.id - b.b.id);
  for (const contact of contacts) {
    if (contact.a.landed || contact.b.landed) continue;
    for (const item of [contact.a, contact.b]) {
      Object.assign(item, positionAt(item, contact.time));
      item.landed = true; item.toX = item.x; item.toY = item.y; item.landsAt = contact.time;
    }
    log(state, '投送物在半空相撞，掉落競技場');
  }
  for (const item of flying) {
    if (item.landed) continue;
    Object.assign(item, positionAt(item, state.time));
    if (state.time >= item.landsAt) item.landed = true;
  }
  state.items = state.items.filter(item => {
    if (!item.landed) return true;
    const fighter = state.fighters.filter(value => value.hp > 0 && !['fallen', 'airborne', 'rising'].includes(value.pose) &&
      distance(value, item) <= value.radius + 0.35 && canEquip(value, item.weapon))
      .sort((a, b) => distance(a, item) - distance(b, item) || a.id.localeCompare(b.id))[0];
    if (!fighter) return true;
    equip(fighter, item.weapon);
    const name = CARDS.find(card => card.id === item.weapon)?.name ?? '裝備';
    effect(state, fighter, `拾取${name}`, '#ebc982', 'pickup');
    log(state, `${fighter.name} 拾取${name}`);
    return false;
  });
}
