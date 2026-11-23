import { describe, expect, it } from 'vitest';
import { createArena, playCard, toggleArena } from '../../src/arena/engine';
import { drawCard } from '../../src/arena/engine-cards';
import { CARDS, THROW_TARGET_RADIUS } from '../../src/arena/model';

function prepared() {
  const state = createArena(42);
  toggleArena(state);
  state.hand = [{ id: state.nextId++, cardId: 'bear-trap' }];
  state.stones = ['green', 'red', 'blue'].map((color) => ({ id: state.nextId++, color: color as 'green' | 'red' | 'blue' }));
  return { state, spell: state.hand[0].id, payment: state.stones.slice(0, 2).map(s => s.id) };
}

describe('bear trap cards', () => {
  it('adds exactly two copies and conserves every card through recycling', () => {
    const state = createArena(42);
    const count = () => [...state.hand.map(c => c.cardId), ...state.deck, ...state.discard];
    expect(count()).toHaveLength(CARDS.length * 2);
    expect(count().filter(id => id === 'bear-trap')).toHaveLength(2);
    for (let i = 0; i < CARDS.length * 6; i++) {
      state.discard.push(state.hand.shift()!.cardId);
      drawCard(state);
      for (const card of CARDS) expect(count().filter(id => id === card.id)).toHaveLength(2);
    }
  });
  it('places on empty ground immediately, pays once and replenishes two stones and one card', () => {
    const { state, spell, payment } = prepared();
    const before = structuredClone(state);
    expect(playCard(state, spell, { x: 0, y: 0 }, payment)).toBe(true);
    expect(state.traps).toHaveLength(1);
    expect(state.traps[0].kind).toBe('bear-trap');
    expect(state.traps[0].armedAt).toBe(.6);
    expect(state.traps[0].expiresAt).toBe(12.6);
    expect(state.items).toEqual([]);
    expect(state.latestThrow).toBeUndefined();
    expect(state.stones).toHaveLength(before.stones.length);
    expect(state.stones.some(s => payment.includes(s.id))).toBe(false);
    expect(state.hand).toHaveLength(1);
    expect(state.hand[0].id).not.toBe(spell);
    const once = structuredClone(state);
    expect(playCard(state, spell, { x: 0, y: 0 }, payment)).toBe(false);
    expect(state).toEqual(once);
  });
  it.each(['short', 'extra', 'duplicate', 'missing', 'outside', 'invalid', 'cancel', 'ready', 'finished', 'resolving'])(
    'rejects %s atomically including RNG and deck', reason => {
      const { state, spell, payment } = prepared();
      let target: { x?: number; y?: number } = { x: 0, y: 0 };
      let pay = payment;
      if (reason === 'short') pay = payment.slice(0, 1);
      if (reason === 'extra') pay = state.stones.map(s => s.id);
      if (reason === 'duplicate') pay = [payment[0], payment[0]];
      if (reason === 'missing') pay = [payment[0], -1];
      if (reason === 'outside') target.x = THROW_TARGET_RADIUS + .001;
      if (reason === 'invalid') target.x = NaN;
      if (reason === 'cancel') target = {};
      if (reason === 'ready' || reason === 'finished') state.status = reason;
      if (reason === 'resolving') state.fighters.slice(1).forEach(f => f.hp = 0);
      const before = structuredClone(state);
      expect(playCard(state, spell, target, pay)).toBe(false);
      expect(state).toEqual(before);
    });
  it('rejects insufficient funds without drawing or advancing random state', () => {
    const { state, spell } = prepared(); state.stones = state.stones.slice(0, 1);
    const before = structuredClone(state);
    expect(playCard(state, spell, { x: 0, y: 0 }, state.stones.map(s => s.id))).toBe(false);
    expect(state).toEqual(before);
  });
});
