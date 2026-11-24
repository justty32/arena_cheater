import { describe, expect, it } from 'vitest';
import { createArena, findPayment, playCard, redrawStones, toggleArena } from '../../src/arena/engine';
import { drawCard, drawStones } from '../../src/arena/engine-cards';
import { applyHealthDamage } from '../../src/arena/engine-damage';
import { CARDS } from '../../src/arena/model';

describe('resource command sequence compatibility', () => {
  it.each([42, 2026])('preserves complete state checkpoints for seed %s', seed => {
    const state = createArena(seed);
    toggleArena(state);
    const checkpoints = [structuredClone(state)];

    // Exercise recycling and stone draws on the same random stream.
    state.discard.push(...state.deck.splice(0));
    drawCard(state);
    drawStones(state, 3);
    checkpoints.push(structuredClone(state));

    expect(redrawStones(state, state.hand[0].id, state.stones.slice(0, 2).map(stone => stone.id))).toBe(true);
    checkpoints.push(structuredClone(state));

    const [supported, victim, spellVictim] = state.fighters;
    state.supportedId = supported.id;
    victim.hp = 1;
    applyHealthDamage(state, victim, 1, supported.id);
    checkpoints.push(structuredClone(state));
    // Repeated damage must not award a second kill or consume randomness.
    applyHealthDamage(state, victim, 1, supported.id);
    checkpoints.push(structuredClone(state));

    state.hand.push({ id: state.nextId++, cardId: 'lightning' });
    state.stones.push({ id: state.nextId++, color: 'red' });
    const lightning = CARDS.find(card => card.id === 'lightning')!;
    spellVictim.hp = 1;
    expect(playCard(state, state.hand.at(-1)!.id, { fighterId: spellVictim.id }, findPayment(state, lightning.cost)!)).toBe(true);
    checkpoints.push(structuredClone(state));

    expect(checkpoints).toMatchSnapshot();
  });
});
