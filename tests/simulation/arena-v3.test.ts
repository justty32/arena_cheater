import { expect, it } from 'vitest';
import { createArena } from '../../src/arena/sim/engine';
import { attackDamage, damageFighter, advanceControl, applyHealthDamage } from '../../src/arena/sim/engine-damage';
import { fireArrow } from '../../src/arena/sim/engine-arrows';
import { BALANCE as B } from '../../src/arena/shared/balance';

it('checks candidate formula, decimal damage, arrows and control deadlines', () => {
  const state = createArena(1);
  const wolf = state.fighters.find(f => f.species === 'wolf')!;
  const elephant = state.fighters.find(f => f.species === 'elephant')!;
  const bear = state.fighters.find(f => f.species === 'bear')!;
  elephant.weapon = 'club'; bear.weapon = 'club';
  expect(attackDamage(elephant)).toBe(6);
  expect(attackDamage(bear)).toBe(5);
  wolf.weapon = 'sword';
  wolf.buffs = [{ kind: 'fury', until: 5 }, { kind: 'weakness', until: 5 }, { kind: 'bloodlust', until: 5 }];
  expect(attackDamage(wolf)).toBe(5.75);
  wolf.weapon = 'bow'; wolf.ammo = 3;
  fireArrow(state, wolf);
  expect(state.arrows[0].damage).toBe(5.75);
  wolf.buffs = [];
  expect(state.arrows[0].damage).toBe(5.75);
  const target = state.fighters.find(f => f.species === 'bull')!;
  target.x = 0; target.y = 0; target.facing = 0; target.hp = 100; target.shield = true; target.stamina = 12;
  damageFighter(state, target, 0.55, { x: 1, y: 0 });
  expect(target.hp).toBe(99.72);
  target.shield = false;
  damageFighter(state, target, 1, { x: -1, y: 0 });
  expect(target.hp).toBe(98.52);
  damageFighter(state, target, 0, { x: 1, y: 0 });
  expect(target.hp).toBe(98.52);
  target.hp = 0.3; applyHealthDamage(state, target, 0.1); applyHealthDamage(state, target, 0.2);
  expect(target.hp).toBe(0); expect(target.pose).toBe('dead');
  elephant.pose = 'airborne'; elephant.poseUntil = 0.35;
  state.time = 2.7;
  expect(advanceControl(state, elephant)).toBe(true);
  expect(elephant.pose).toBe('rising'); expect(elephant.poseUntil).toBeCloseTo(3);
  state.time = 3;
  expect(advanceControl(state, elephant)).toBe(false);
  expect(elephant.pose).toBe('idle');
  expect(B.bullStamina).toBe(12);
  expect(B.clubStaminaCost).toBe(2);
});

it('keeps positive sub-hundredth damage visible and zero damage at zero', () => {
  const state = createArena(1), target = state.fighters[0];
  target.x = target.y = target.facing = 0;
  damageFighter(state, target, 0.001, { x: 1, y: 0 });
  expect(target.hp).toBe(target.maxHp - 0.01);
  damageFighter(state, target, 0, { x: 1, y: 0 });
  expect(target.hp).toBe(target.maxHp - 0.01);
});

it('uses approved punches and additive weapon bonuses with elephant club only', () => {
  const state = createArena(1);
  expect(state.fighters.map(f => attackDamage(f))).toEqual([1, 2, 1, 1, 1, 1, 1]);
  const elephant = state.fighters[2];
  for (const [weapon, damage] of [['fists', 1], ['shield', 1], ['sword', 2], ['spear', 2], ['hatchet', 3], ['club', 6], ['bow', 2]] as const) {
    elephant.weapon = weapon;
    expect(attackDamage(elephant)).toBe(damage);
  }
});

it('crosses every control deadline on a late update and recovers within one simulation tick', () => {
  for (const dt of [1 / 30, 0.07]) {
    const state = createArena(1), target = state.fighters[0];
    target.pose = 'airborne'; target.poseUntil = 0.35;
    let t = 0;
    while (t < 3) {
      state.time = t;
      expect(advanceControl(state, target)).toBe(true);
      t += dt;
    }
    state.time = t;
    expect(advanceControl(state, target)).toBe(false);
    expect(target.pose).toBe('idle'); expect(t).toBeLessThanOrEqual(3 + dt);
  }
  const state = createArena(2), target = state.fighters[0];
  target.pose = 'airborne'; target.poseUntil = 0.35; state.time = 10;
  expect(advanceControl(state, target)).toBe(false); expect(target.pose).toBe('idle');
});
