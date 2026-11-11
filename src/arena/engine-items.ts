import { ARENA_RADIUS, CARDS, type ArenaState, type CardId, type Weapon } from './model';
import { distance, effect, log } from './engine-combat';

export interface CardTarget { fighterId?: string; x?: number; y?: number }
export function playCard(state: ArenaState, cardId: CardId, target: CardTarget): boolean {
  if (state.status !== 'running' && state.status !== 'paused') return false;
  const card = CARDS.find(value => value.id === cardId);
  if (!card || state[card.currency] < card.cost) return false;
  const fighter = state.fighters.find(value => value.id === target.fighterId && value.hp > 0);
  if (card.target === 'fighter') {
    if (!fighter) return false;
    state[card.currency] -= card.cost;
    if (cardId === 'trip') { fighter.pose = 'fallen'; fighter.poseUntil = state.time + 2; }
    else if (cardId === 'fury' || cardId === 'haste' || cardId === 'weakness') {
      fighter.buffs = fighter.buffs.filter(buff => buff.kind !== cardId);
      fighter.buffs.push({ kind: cardId, until: state.time + (cardId === 'weakness' ? 7 : 8) });
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
export function advanceItems(state: ArenaState): void {
  for (const item of state.items) {
    if (item.landed) continue;
    const t = Math.min(1, (state.time - item.launched) / (item.landsAt - item.launched));
    item.x = item.fromX + (item.toX - item.fromX) * t;
    item.y = item.fromY + (item.toY - item.fromY) * t;
    if (t >= 1) item.landed = true;
  }
  for (let i = 0; i < state.items.length; i++) {
    const a = state.items[i];
    if (a.landed || state.time - a.launched < 0.15) continue;
    for (const b of state.items.slice(i + 1)) {
      if (b.landed || state.time - b.launched < 0.15 || distance(a, b) > 0.22) continue;
      // A collision cancels both flights and leaves exactly one ground entity per item.
      for (const item of [a, b]) { item.landed = true; item.toX = item.x; item.toY = item.y; item.landsAt = state.time; }
      log(state, '投送物在半空相撞，掉落競技場');
    }
  }
  state.items = state.items.filter(item => {
    if (!item.landed) return true;
    const fighter = state.fighters.find(value => value.hp > 0 && value.pose !== 'fallen' &&
      distance(value, item) <= value.radius + 0.35 && (item.weapon === 'shield' ? !value.shield : value.weapon === 'fists'));
    if (!fighter) return true;
    if (item.weapon === 'shield') fighter.shield = true;
    else fighter.weapon = item.weapon;
    const name = CARDS.find(card => card.id === item.weapon)?.name ?? '裝備';
    effect(state, fighter, `拾取${name}`, '#ebc982', 'pickup');
    log(state, `${fighter.name} 拾取${name}`);
    return false;
  });
}
