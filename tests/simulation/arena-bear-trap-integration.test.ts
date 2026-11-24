import { describe, expect, it } from 'vitest';
import { advanceArena, createArena, playCard, toggleArena } from '../../src/arena/sim/engine';

function scene(seed = 42) {
  const state = createArena(seed); toggleArena(state);
  state.fighters = state.fighters.slice(0, 2);
  const [a, b] = state.fighters;
  Object.assign(a, { x: 0, y: 0, speed: 0, nextAttack: Infinity });
  Object.assign(b, { x: 5, y: 0, speed: 0, nextAttack: Infinity });
  state.hand = [{ id: state.nextId++, cardId: 'bear-trap' }];
  state.stones = [{ id: state.nextId++, color: 'green' }, { id: state.nextId++, color: 'red' }];
  return { state, a, b };
}
function place(state: ReturnType<typeof createArena>) {
  return playCard(state, state.hand[0].id, { x: 0, y: 0 }, state.stones.map(s => s.id));
}

describe('bear trap lifecycle integration', () => {
  it('accepts paused placement, freezes arming, lifetime and root, then resumes in game time', () => {
    const { state, a } = scene(); toggleArena(state);
    expect(place(state)).toBe(true);
    const paused = structuredClone(state); advanceArena(state, 30); expect(state).toEqual(paused);
    toggleArena(state); advanceArena(state, .6);
    expect(a.hp).toBe(a.maxHp - 1); expect(a.rootedUntil).toBeCloseTo(3.6);
    toggleArena(state); const rooted = structuredClone(state);
    advanceArena(state, 20); expect(state).toEqual(rooted);
    toggleArena(state); a.speed = 1;
    advanceArena(state, 2.9); expect(a.x).toBe(0);
    advanceArena(state, .2); expect(a.x).toBeGreaterThan(0);
  });
  it('does not overwrite the most recent delivery with a ground placement', () => {
    const { state } = scene();
    state.latestThrow = { itemId: -1, handCardId: -2, itemKind: 'sword', launchedAt: 0 };
    const delivery = structuredClone(state.latestThrow);
    expect(place(state)).toBe(true); expect(state.latestThrow).toEqual(delivery);
    expect(state.items).toEqual([]);
  });
  it('clears roots and traps on retry or a new seed', () => {
    const { state, a } = scene(); expect(place(state)).toBe(true);
    advanceArena(state, .6); expect(a.rootedUntil).toBeDefined();
    for (const seed of [state.seed, state.seed + 1]) {
      const fresh = createArena(seed);
      expect(fresh.traps).toEqual([]);
      expect(fresh.fighters.every(f => f.rootedUntil === undefined)).toBe(true);
    }
  });
  it('does not delay final settlement and rejects placement while only an arrow is draining', () => {
    const { state, a, b } = scene();
    expect(place(state)).toBe(true); advanceArena(state, .6);
    b.hp = 0;
    state.arrows.push({ id: state.nextId++, ownerId: b.id, x: -6, y: -6, vx: 0, vy: 0, damage: 1, expiresAt: 1 });
    state.hand = [{ id: state.nextId++, cardId: 'bear-trap' }];
    state.stones = [{ id: state.nextId++, color: 'red' }, { id: state.nextId++, color: 'blue' }];
    const before = structuredClone(state);
    expect(place(state)).toBe(false); expect(state).toEqual(before);
    advanceArena(state, .5);
    expect(state.status).toBe('finished'); expect(state.winnerId).toBe(a.id);
    expect(state.time).toBeLessThan(a.rootedUntil!);
    expect(state.traps).toEqual([]);
  });
  it('clears an untriggered trap at settlement without waiting for expiry', () => {
    const { state, a, b } = scene(); a.x = -5;
    expect(place(state)).toBe(true); b.hp = 0;
    advanceArena(state, 1 / 30);
    expect(state.status).toBe('finished'); expect(state.traps).toEqual([]);
  });
  it('replays identical seeded commands and is equivalent at double speed', () => {
    const one = scene(), two = scene(), fast = scene();
    for (const { state } of [one, two, fast]) expect(place(state)).toBe(true);
    advanceArena(one.state, 1); advanceArena(two.state, 1);
    fast.state.speed = 2; advanceArena(fast.state, .5); fast.state.speed = 1;
    expect(two.state).toEqual(one.state); expect(fast.state).toEqual(one.state);
  });
});
