import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/arena/engine';
import { advanceTraps, placeTrap, trapMovementStart } from '../../src/arena/engine-traps';
import { SPIKE_PIT_RADIUS, type ArenaState, type TrapKind } from '../../src/arena/model';

function setup(kind: TrapKind = 'bear-trap') {
  const state = createArena(42);
  state.fighters.forEach((f, i) => Object.assign(f, { x: 4, y: i * .2, speed: 0 }));
  placeTrap(state, { x: 0, y: 0 }, kind);
  return state;
}
function resolve(state: ArenaState, end: number, move?: () => void) {
  const start = state.time;
  state.time = end;
  const positions = trapMovementStart(state, start);
  move?.();
  advanceTraps(state, start, positions);
}

describe('shared ground traps', () => {
  it.each(['spike-pit', 'bear-trap'] as const)('keeps %s arming and expiry boundaries', kind => {
    const state = setup(kind), f = state.fighters[0]; f.x = 0;
    resolve(state, .6 - 1e-6);
    expect(f.hp).toBe(f.maxHp);
    resolve(state, .6);
    expect(f.hp).toBe(f.maxHp - (kind === 'bear-trap' ? 1 : 3));
    expect(state.traps).toEqual([]);
    const expired = setup(kind); resolve(expired, 12.6);
    expect(expired.traps).toEqual([]);
    const atExpiry = setup(kind); atExpiry.time = 12.6 - 1 / 30;
    resolve(atExpiry, 12.6, () => atExpiry.fighters[0].x = SPIKE_PIT_RADIUS);
    expect(atExpiry.fighters[0].hp).toBe(atExpiry.fighters[0].maxHp);
    const beforeExpiry = setup(kind); beforeExpiry.time = 12.5;
    beforeExpiry.fighters[0].x = 0;
    resolve(beforeExpiry, 12.6 - 1e-6);
    expect(beforeExpiry.fighters[0].hp).toBeLessThan(beforeExpiry.fighters[0].maxHp);
  });
  it.each([0, SPIKE_PIT_RADIUS, SPIKE_PIT_RADIUS + .00001])('tests center distance %s without adding fighter radius', x => {
    const state = setup(), f = state.fighters[0]; f.x = x;
    resolve(state, .6);
    expect(f.hp).toBe(f.maxHp - (x <= SPIKE_PIT_RADIUS ? 1 : 0));
  });
  it('uses earliest swept contact even when both endpoints are outside', () => {
    const state = setup(), [later, first] = state.fighters;
    state.time = .6; later.x = -3; later.y = 0; first.x = 1.5; first.y = 0;
    resolve(state, .7, () => { later.x = 3; first.x = -2; });
    expect(first.hp).toBe(first.maxHp - 1);
    expect(later.hp).toBe(later.maxHp);
    expect(first.rootedUntil).toBe(3.7);
  });
  it('breaks simultaneous ties by fighter id regardless of array order and supporter', () => {
    const state = setup(), [first, second] = state.fighters;
    state.fighters.reverse(); first.x = second.x = 0; first.y = second.y = 0;
    state.supportedId = first.id;
    resolve(state, .6);
    expect(first.hp).toBe(first.maxHp - 1);
    expect(second.hp).toBe(second.maxHp);
    expect(state.supportKillRewardStones).toBe(0);
  });
  it.each([0, 1, 2, 3, 4, 5, 6])('allows fighter %s of every species to trigger', index => {
    const state = setup(), f = state.fighters[index]; f.x = f.y = 0;
    resolve(state, .6); expect(f.hp).toBe(f.maxHp - 1);
  });
  it('skips dead and airborne fighters, but accepts touchdown, fallen and rising', () => {
    for (const pose of ['airborne', 'fallen', 'rising'] as const) {
      const state = setup(), [f, dead] = state.fighters;
      Object.assign(f, { x: 0, y: 0, pose }); Object.assign(dead, { x: 0, y: 0, hp: 0 });
      resolve(state, .6);
      if (pose === 'airborne') {
        expect(f.hp).toBe(f.maxHp);
        resolve(state, .7, () => f.pose = 'fallen');
      }
      expect(f.hp).toBe(f.maxHp - 1);
      expect(f.rootedUntil).toBe(state.time + 3);
      expect(dead.hp).toBe(0);
    }
  });
  it('processes mixed traps in placement order, never hitting a corpse twice', () => {
    const state = setup('spike-pit'), [first, second] = state.fighters;
    first.x = second.x = first.y = second.y = 0; first.hp = 3;
    placeTrap(state, { x: 0, y: 0 }, 'bear-trap');
    resolve(state, .6);
    expect(first.hp).toBe(0); expect(first.rootedUntil).toBeUndefined();
    expect(second.hp).toBe(second.maxHp - 1); expect(second.rootedUntil).toBe(3.6);
    expect(state.traps).toEqual([]);
  });
  it('bypasses shields without granting kill rewards or wolf fury, and never roots the dead', () => {
    const state = setup(), [wolf, victim] = state.fighters;
    state.supportedId = wolf.id; wolf.species = 'wolf';
    Object.assign(victim, { x: 0, y: 0, hp: 1, shield: true, parryUntil: 5, rootedUntil: 2 });
    const stones = structuredClone(state.stones), stamina = victim.stamina;
    resolve(state, .6);
    expect(victim.hp).toBe(0); expect(victim.pose).toBe('dead');
    expect(victim.rootedUntil).toBeUndefined(); expect(victim.stamina).toBe(stamina);
    expect(wolf.buffs).toEqual([]); expect(state.stones).toEqual(stones);
    expect(state.supportKillRewardStones).toBe(0);
  });
  it('refreshes from the processing time without stacking and deals damage each time', () => {
    const state = setup(), f = state.fighters[0]; f.x = 0;
    resolve(state, .6); expect(f.rootedUntil).toBe(3.6);
    placeTrap(state, f, 'bear-trap');
    resolve(state, 1.2);
    expect(f.hp).toBe(f.maxHp - 2); expect(f.rootedUntil).toBe(4.2);
    expect(state.logs.some(line => line.includes('捕獸夾'))).toBe(true);
  });
});
