import { describe, expect, it } from 'vitest';
import { advanceArena, createArena, playCard } from '../../src/arena/sim/engine';
import { act } from '../../src/arena/sim/engine-combat';
import { fireArrow } from '../../src/arena/sim/engine-arrows';
import { formatHp } from '../../src/arena/shared/format';

function timeout() {
  const state = createArena(42);
  state.status = 'running'; state.time = 299.99;
  state.fighters = state.fighters.slice(0, 2);
  state.fighters.forEach((fighter, i) => Object.assign(fighter, {
    x: i * 4, y: 0, speed: 0, nextAttack: Infinity, hp: 50, maxHp: 100,
  }));
  return state;
}

describe('V3 terminal resolution', () => {
  it('selects the unique highest ratio, not highest HP, without kill rewards', () => {
    const state = timeout(), [a, b] = state.fighters;
    a.hp = 60; a.maxHp = 100; b.hp = 75; b.maxHp = 150;
    const stones = structuredClone(state.stones);
    advanceArena(state, 1 / 30);
    expect(state.winnerId).toBe(a.id); expect(state.resultReason).toBe('hp-ratio');
    expect(b.hp).toBe(75); expect(a.buffs).toEqual([]);
    expect(state.stones).toEqual(stones); expect(state.supportKillRewardStones).toBe(0);
    expect(state.logs[0]).toContain('時限裁決：剩餘生命比例最高');
  });
  it('ties exactly equal ratios despite different absolute HP', () => {
    const state = timeout(); state.fighters[1].hp = 75; state.fighters[1].maxHp = 150;
    advanceArena(state, 1 / 30);
    expect(state.winnerId).toBeUndefined(); expect(state.resultReason).toBe('draw');
  });
  it('does not round ratios to display percentages before comparing', () => {
    const state = timeout(); state.fighters[1].hp = 50.01;
    advanceArena(state, 1 / 30);
    expect(state.winnerId).toBe(state.fighters[1].id);
  });
  it('waits for arrows and uses the changed final leader after cleanup', () => {
    const state = timeout(), [a, b] = state.fighters;
    a.hp = 50.01; a.weapon = 'bow'; a.ammo = 1; a.targetId = b.id;
    fireArrow(state, a);
    Object.assign(state.arrows[0], { ownerId: b.id, x: 3, y: 0, vx: -12, vy: 0, damage: 1 });
    advanceArena(state, 1 / 30);
    expect(state.status).toBe('running'); expect(state.winnerId).toBeUndefined();
    expect(playCard(state, state.hand[0].id, {}, [])).toBe(false);
    advanceArena(state, 1);
    expect(state.status).toBe('finished'); expect(state.time).toBeGreaterThan(300);
    expect(state.winnerId).toBe(b.id); expect(state.resultReason).toBe('hp-ratio');
  });
  it('waits for a throw and all dung ticks before selecting the final ratio', () => {
    const state = timeout(), [a, b] = state.fighters;
    a.hp = 55;
    state.items.push({ id: 900, weapon: 'dung', x: a.x, y: a.y,
      fromX: a.x, fromY: a.y, toX: a.x, toY: a.y,
      launched: state.time, landsAt: 301, landed: false });
    advanceArena(state, 1 / 30);
    expect(state.status).toBe('running'); expect(a.hp).toBe(54);
    advanceArena(state, 4.9); expect(state.status).toBe('running');
    advanceArena(state, 0.2);
    expect(a.hp).toBe(49); expect(state.winnerId).toBe(b.id);
    expect(state.resultReason).toBe('hp-ratio');
  });
  it.each([0, 1])('preserves natural results with %s living fighters', count => {
    const state = timeout(); state.time = 1;
    state.fighters.forEach((fighter, i) => { fighter.hp = i < count ? 1 : 0; });
    advanceArena(state, 1 / 30);
    expect(state.resultReason).toBe(count ? 'last-survivor' : 'draw');
    expect(state.winnerId).toBe(count ? state.fighters[0].id : undefined);
  });
});

it('formats HP and damage at hundredth precision without trailing zeros', () => {
  expect([9.72, 9.7, 10, 0.01, 0, 1.2000000000000028].map(formatHp))
    .toEqual(['9.72', '9.7', '10', '0.01', '0', '1.2']);
});

it('does not swing a club without two stamina and never spends below zero', () => {
  const state = timeout(), [a, b] = state.fighters; state.time = 0;
  Object.assign(a, { weapon: 'club', stamina: 1.99, lastAttack: 0, nextAttack: 0, facing: 0 });
  b.x = 1;
  act(state, a, 1 / 30); expect(a.pose).toBe('idle'); expect(a.stamina).toBe(1.99);
  a.stamina = 2;
  act(state, a, 1 / 30); expect(a.pose).toBe('attack'); expect(a.stamina).toBe(0);
});
