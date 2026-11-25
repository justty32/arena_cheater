import { expect, it } from 'vitest';
import { createArena } from '../../src/arena/sim/engine';
import { act, hit } from '../../src/arena/sim/engine-combat';
import { BALANCE as B } from '../../src/arena/shared/balance';

function pair() {
  const state = createArena(1); state.fighters = state.fighters.slice(0, 2);
  const [a, b] = state.fighters;
  Object.assign(a, { x: 0, y: 0, facing: 0, lastAttack: 0, nextAttack: 0, targetId: b.id });
  Object.assign(b, { x: 1, y: 0, facing: Math.PI });
  return { state, a, b };
}
it.each(['sword', 'spear', 'hatchet', 'club'] as const)('measures %s start and hit gaps from both body surfaces', weapon => {
  const start = B[`${weapon}StartGap`], reach = B[`${weapon}HitGap`];
  for (const radius of [0.2, 0.6]) {
    for (const offset of [0, 0.001]) {
      const { state, a, b } = pair(); a.weapon = weapon; a.durability = 2; a.radius = radius;
      b.x = a.radius + b.radius + start + offset;
      act(state, a, 0);
      expect(a.pose).toBe(offset ? 'walk' : 'attack');
      b.x = a.radius + b.radius + reach + offset;
      const hp = b.hp;
      hit(state, a);
      expect(b.hp < hp).toBe(offset === 0);
    }
  }
});
it('uses center distance for bow starts without adding body radii', () => {
  for (const offset of [0, 0.001]) {
    const { state, a, b } = pair(); a.weapon = 'bow'; a.ammo = 3;
    b.x = B.bowCenterReach + offset;
    act(state, a, 0);
    expect(a.pose).toBe(offset ? 'walk' : 'attack');
  }
});
it.each(['fists', 'sword', 'spear', 'hatchet', 'club', 'bow'] as const)('requires the exact %s stamina cost', weapon => {
  const cost = weapon === 'hatchet' ? 1.5 : weapon === 'club' ? 2 : 1;
  for (const offset of [-0.01, 0]) {
    const { state, a } = pair(); a.weapon = weapon; a.ammo = 3; a.stamina = cost + offset;
    act(state, a, 0);
    expect(a.pose).toBe(offset ? 'idle' : 'attack');
    expect(a.stamina).toBe(offset ? cost + offset : 0);
  }
});
it('moves on empty stamina but cannot attack, and recovers while fallen', () => {
  const { state, a, b } = pair(); a.stamina = 0; b.x = 4;
  act(state, a, 0.1); expect(a.pose).toBe('walk'); expect(a.x).toBeGreaterThan(0);
  a.pose = 'fallen'; a.poseUntil = 10; a.lastAttack = 0; a.lastMoved = 0;
  state.time = 1.999; act(state, a, 0.1); expect(a.stamina).toBe(0);
  state.time = 2; act(state, a, 0.1); expect(a.stamina).toBeCloseTo(0.1);
  state.time = 2.499; act(state, a, 0.1); expect(a.stamina).toBeCloseTo(0.2);
  state.time = 2.5; act(state, a, 0.1); expect(a.stamina).toBeCloseTo(0.4);
  expect(a.pose).toBe('fallen');
});
