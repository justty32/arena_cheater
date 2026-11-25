import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/arena/sim/engine';
import { act, separateFighters } from '../../src/arena/sim/engine-combat';
import { advanceControl, applyHealthDamage, damageFighter } from '../../src/arena/sim/engine-damage';
import { advanceItems } from '../../src/arena/items/engine-items';
import { equip } from '../../src/arena/items/equipment';

function pair() {
  const state = createArena(42); state.fighters = state.fighters.slice(0, 2);
  const [a, b] = state.fighters;
  Object.assign(a, { x: 0, y: 0, facing: 0, rootedUntil: 3, nextAttack: 0 });
  Object.assign(b, { x: 1, y: 0, facing: Math.PI });
  return { state, a, b };
}
function item(state: ReturnType<typeof createArena>, x: number) {
  state.items.push({ id: state.nextId++, weapon: 'sword', x, y: 0, fromX: x, fromY: 0, toX: x, toY: 0, launched: 0, landsAt: 0, landed: true });
}

describe('root restricts voluntary movement only', () => {
  it('cannot chase until the exact expiry, but turns and restores stamina', () => {
    const { state, a, b } = pair(); b.x = -4; a.stamina = 2;
    state.time = 2.999;
    act(state, a, .1);
    expect(a.x).toBe(0); expect(a.y).toBe(0); expect(a.pose).toBe('idle');
    expect(a.facing).not.toBe(0); expect(a.stamina).toBeGreaterThan(2);
    state.time = 3; act(state, a, .1);
    expect(a.x).toBeLessThan(0); expect(a.pose).toBe('walk');
  });
  it('cannot walk to equipment but still picks up equipment already within reach', () => {
    const { state, a, b } = pair(); b.x = 5;
    item(state, 2); act(state, a, .1);
    expect(a.x).toBe(0); expect(a.weapon).toBe('fists');
    advanceItems(state); expect(a.weapon).toBe('fists');
    state.items[0].x = .1; advanceItems(state);
    expect(a.weapon).toBe('sword'); expect(state.items).toEqual([]);
  });
  it.each(['fists', 'bow'] as const)('prepares and lands a %s attack while rooted', weapon => {
    const { state, a, b } = pair(); equip(a, weapon);
    if (weapon === 'bow') b.x = 4;
    act(state, a, 1 / 30); expect(a.pose).toBe('attack');
    state.time = a.poseUntil;
    act(state, a, 1 / 30);
    if (weapon === 'bow') { expect(state.arrows).toHaveLength(1); expect(a.ammo).toBe(2); }
    else expect(b.hp).toBeLessThan(b.maxHp);
    expect(a.x).toBe(0);
  });
  it('does not cancel an already prepared hit when root begins during windup', () => {
    const { state, a, b } = pair(); a.rootedUntil = undefined;
    act(state, a, 1 / 30); a.rootedUntil = 3;
    state.time = a.poseUntil; act(state, a, 1 / 30);
    expect(b.hp).toBeLessThan(b.maxHp);
  });
  it('keeps shield blocks, parry windows and their stamina costs', () => {
    const { state, a, b } = pair(); equip(a, 'shield');
    const stamina = a.stamina;
    damageFighter(state, a, 20, b);
    expect(a.hp).toBe(a.maxHp - 10); expect(a.stamina).toBe(stamina - 0.5);
    a.pose = 'idle'; a.poseUntil = 0;
    Object.assign(b, { pose: 'attack', poseUntil: .1, targetId: a.id });
    act(state, a, 1 / 30); expect(a.pose).toBe('parry');
    const beforeParry = a.stamina;
    damageFighter(state, a, 20, b);
    expect(a.hp).toBe(a.maxHp - 10); expect(a.stamina).toBe(beforeParry - 1);
  });
  it('preserves knockback, fallen and rising controls while the root clock runs', () => {
    const { state, a, b } = pair();
    damageFighter(state, a, 10, b, b, true);
    expect(a.pose).toBe('airborne');
    state.time = .2; act(state, a, 1 / 30);
    expect(a.x).toBeLessThan(0); expect(a.rootedUntil).toBe(3);
    state.time = .36; act(state, a, 1 / 30); expect(a.pose).toBe('fallen');
    state.time = 2.65; act(state, a, 1 / 30); expect(a.pose).toBe('rising');
    state.time = 3; a.rootedUntil = 4; b.x = 5;
    const position = a.x; act(state, a, 1 / 30);
    expect(a.pose).toBe('idle'); expect(a.x).toBe(position);
    state.time = 4; act(state, a, 1 / 30); expect(a.x).toBeGreaterThan(position);
  });
  it('allows separation and boundary correction instead of locking world coordinates', () => {
    const { state, a, b } = pair(); a.x = b.x = 8;
    separateFighters(state);
    expect(a.x).not.toBe(8); expect(Math.hypot(a.x, a.y) + a.radius).toBeLessThanOrEqual(7.5 + 1e-9);
    expect(a.rootedUntil).toBe(3);
  });
  it('never revives a dead rooted fighter at expiry', () => {
    const { state, a } = pair(); applyHealthDamage(state, a, a.hp);
    expect(a.rootedUntil).toBeUndefined();
    state.time = 4; act(state, a, .1); advanceControl(state, a);
    expect(a.pose).toBe('dead'); expect(a.hp).toBe(0);
  });
});
