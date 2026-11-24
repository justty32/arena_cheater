import { CARDS } from '../shared/card-catalog';
import { isResolvingArena } from '../shared/status';
import type { ArenaState, CardId, DeliberationOffer, StoneColor, StoneCost } from '../shared/types';

import { COLORS, drawStones, random } from '../shared/resources';
export { drawStones } from '../shared/resources';

export const REDRAW_COOLDOWN = 3;
const INTUITION_CARD_COUNT = 2;
function shuffle(state: ArenaState, cards: CardId[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}
function takeTopCard(state: ArenaState): CardId | undefined {
  if (!state.deck.length && state.discard.length) {
    state.deck = state.discard.splice(0);
    shuffle(state, state.deck);
    state.knownUpcomingCount = 0;
  }
  const cardId = state.deck.pop();
  if (cardId !== undefined && state.knownUpcomingCount > 0) state.knownUpcomingCount--;
  return cardId;
}
export function drawCard(state: ArenaState): void {
  const cardId = takeTopCard(state);
  if (cardId) state.hand.push({ id: state.nextId++, cardId });
}
export function revealUpcomingCards(state: ArenaState): void {
  if (state.deck.length < INTUITION_CARD_COUNT && state.discard.length) {
    const recycled = state.discard.splice(0);
    shuffle(state, recycled);
    // Draws pop from the end, so the original top stays ahead of the recycled cards.
    state.deck = recycled.concat(state.deck);
  }
  state.knownUpcomingCount = Math.min(INTUITION_CARD_COUNT, state.deck.length);
}
export function knownUpcomingCards(state: ArenaState): readonly CardId[] {
  if (!state.knownUpcomingCount) return [];
  return state.deck.slice(-state.knownUpcomingCount).reverse();
}
export function initializeCards(state: ArenaState): void {
  state.deck = CARDS.flatMap(card => [card.id, card.id]);
  shuffle(state, state.deck);
  for (let i = 0; i < 3; i++) drawCard(state);
  drawStones(state, 3);
}
export function canUseCards(state: ArenaState): boolean {
  return (state.status === 'running' || state.status === 'paused') && !isResolvingArena(state) && !state.pendingDeliberation;
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
function spendCard(state: ArenaState, handCardId: number, stoneIds: readonly number[]): CardId {
  const index = state.hand.findIndex(card => card.id === handCardId);
  const [card] = state.hand.splice(index, 1);
  state.stones = state.stones.filter(stone => !stoneIds.includes(stone.id));
  return card.cardId;
}
export function consumeCard(state: ArenaState, handCardId: number, stoneIds: readonly number[]): void {
  state.discard.push(spendCard(state, handCardId, stoneIds));
}
/** The caller validates the payment and that at least one candidate exists. */
export function beginDeliberation(state: ArenaState, handCardId: number, stoneIds: readonly number[]): void {
  const playedCard = spendCard(state, handCardId, stoneIds);
  drawStones(state, 2);
  const candidates: CardId[] = [];
  for (let i = 0; i < 3; i++) {
    const cardId = takeTopCard(state);
    if (cardId === undefined) break;
    candidates.push(cardId);
  }
  // The spell joins the discard only after the candidates have been drawn.
  state.discard.push(playedCard);
  state.pendingDeliberation = { candidates, resumeOnChoice: state.status === 'running' };
  state.status = 'paused';
}
export function chooseDeliberation(state: ArenaState, offer: DeliberationOffer, index: number): boolean {
  if (!state.pendingDeliberation || state.pendingDeliberation !== offer || state.status !== 'paused' ||
      !Number.isInteger(index) || index < 0 || index >= offer.candidates.length) return false;
  state.hand.push({ id: state.nextId++, cardId: offer.candidates[index] });
  state.discard.push(...offer.candidates.filter((_, candidateIndex) => candidateIndex !== index));
  state.pendingDeliberation = undefined;
  if (offer.resumeOnChoice) state.status = 'running';
  return true;
}
export function keepDeliberationPaused(state: ArenaState): void {
  if (state.pendingDeliberation) state.pendingDeliberation.resumeOnChoice = false;
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
