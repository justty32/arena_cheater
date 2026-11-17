import { CARDS, isResolvingArena, type ArenaState, type CardId, type StoneColor, type StoneCost } from './model';

export const REDRAW_COOLDOWN = 3;
const COLORS: StoneColor[] = ['yellow', 'blue', 'green', 'black', 'red'];
function random(state: ArenaState): number {
  state.randomState = (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}
function shuffle(state: ArenaState, cards: CardId[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}
export function drawStones(state: ArenaState, count: number): void {
  for (let i = 0; i < count; i++) state.stones.push({ id: state.nextId++, color: COLORS[Math.floor(random(state) * COLORS.length)] });
}
export function drawCard(state: ArenaState): void {
  if (!state.deck.length && state.discard.length) {
    state.deck = state.discard.splice(0);
    shuffle(state, state.deck);
  }
  const cardId = state.deck.pop();
  if (cardId) state.hand.push({ id: state.nextId++, cardId });
}
export function initializeCards(state: ArenaState): void {
  state.deck = CARDS.flatMap(card => [card.id, card.id]);
  shuffle(state, state.deck);
  for (let i = 0; i < 3; i++) drawCard(state);
  drawStones(state, 3);
}
export function canUseCards(state: ArenaState): boolean {
  return (state.status === 'running' || state.status === 'paused') && !isResolvingArena(state);
}
export function findPayment(state: ArenaState, cost: StoneCost): number[] | undefined {
  const selected: number[] = [];
  for (const color of COLORS) {
    const matches = state.stones.filter(stone => stone.color === color).slice(0, cost.colored[color] ?? 0);
    if (matches.length !== (cost.colored[color] ?? 0)) return undefined;
    selected.push(...matches.map(stone => stone.id));
  }
  const extra = state.stones.filter(stone => !selected.includes(stone.id)).slice(0, cost.generic);
  if (extra.length !== cost.generic) return undefined;
  return [...selected, ...extra.map(stone => stone.id)];
}
export interface PaymentStatus {
  valid: boolean; selectedCount: number; requiredCount: number;
  missingColors: Partial<Record<StoneColor,number>>; missingGeneric: number; excessCount: number; invalidSelection: boolean;
}
export function paymentStatus(state: ArenaState, cost: StoneCost, stoneIds: readonly number[]): PaymentStatus {
  const ids = new Set(stoneIds);
  const stones = state.stones.filter(stone => ids.has(stone.id));
  const invalidSelection = ids.size !== stoneIds.length || stones.length !== ids.size;
  const missingColors: Partial<Record<StoneColor,number>> = {};
  let coloredCount = 0, matched = 0;
  for (const color of COLORS) {
    const required = cost.colored[color] ?? 0;
    const available = stones.filter(stone => stone.color === color).length;
    coloredCount += required; matched += Math.min(required,available);
    if (available < required) missingColors[color] = required-available;
  }
  const unallocated = stones.length-matched;
  const missingGeneric = Math.max(0,cost.generic-unallocated);
  const excessCount = Math.max(0,unallocated-cost.generic);
  return {valid: !invalidSelection && !Object.keys(missingColors).length && !missingGeneric && !excessCount,
    selectedCount:stoneIds.length,requiredCount:cost.generic+coloredCount,missingColors,missingGeneric,excessCount,invalidSelection};
}
export function canPayCost(state: ArenaState, cost: StoneCost, stoneIds: readonly number[]): boolean {
  return paymentStatus(state,cost,stoneIds).valid;
}
export function consumeCard(state: ArenaState, handCardId: number, stoneIds: readonly number[]): void {
  const index = state.hand.findIndex(card => card.id === handCardId);
  state.discard.push(state.hand[index].cardId);
  state.hand.splice(index, 1);
  state.stones = state.stones.filter(stone => !stoneIds.includes(stone.id));
}
export function redrawStones(state: ArenaState, handCardId: number, stoneIds: number[]): boolean {
  if (!stoneIds.length || !canUseCards(state) || state.time < state.redrawAvailableAt || !state.hand.some(card => card.id === handCardId) ||
      new Set(stoneIds).size !== stoneIds.length || stoneIds.some(id => !state.stones.some(stone => stone.id === id))) return false;
  consumeCard(state, handCardId, stoneIds);
  drawStones(state, stoneIds.length + 1);
  drawCard(state);
  state.redrawAvailableAt = state.time + REDRAW_COOLDOWN;
  return true;
}
