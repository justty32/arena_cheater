import { describe, expect, it } from 'vitest';
import { advanceBattle, createBattle, toggleBattle } from '../../src/game/engine.ts';
import type { BattleMode, BattleState, Speed } from '../../src/game/model.ts';
import { MANA_REGEN, STAMINA_REGEN } from '../../src/game/rules.ts';
import { arenaPair, run } from './helpers';

function assertValid(state: BattleState): void {
  const occupied = new Set<string>();
  for (const unit of state.units) {
    expect(Number.isInteger(unit.x) && unit.x >= 0 && unit.x < 8).toBe(true);
    expect(Number.isInteger(unit.y) && unit.y >= 0 && unit.y < 8).toBe(true);
    expect(unit.hp).toBeGreaterThanOrEqual(0);
    expect(unit.hp).toBeLessThanOrEqual(unit.maxHp);
    expect(unit.mana).toBeGreaterThanOrEqual(0);
    expect(unit.mana).toBeLessThanOrEqual(unit.maxMana);
    expect(unit.stamina).toBeGreaterThanOrEqual(0);
    expect(unit.stamina).toBeLessThanOrEqual(unit.maxStamina);
    if (unit.hp <= 0) continue;
    const key = `${unit.x},${unit.y}`;
    expect(occupied.has(key)).toBe(false);
    occupied.add(key);
  }
  expect(state.events.length).toBeLessThanOrEqual(50);
}

describe('battle simulation', () => {
  it.each(['duel', 'melee'] as BattleMode[])('%s completes a legal battle for several seeds', mode => {
    for (const seed of [1, 42, 20261029]) {
      const state = createBattle(mode, seed);
      expect(state.units).toHaveLength(mode === 'duel' ? 6 : 12);
      toggleBattle(state);
      for (let i = 0; i < 180 && state.status !== 'finished'; i++) {
        run(state, 1);
        assertValid(state);
      }
      expect(state.status).toBe('finished');
      expect(state.winner).not.toBeNull();
      expect(state.elapsed).toBeLessThan(100);
      expect(new Set(state.units.filter(unit => unit.hp > 0).map(unit => unit.team)).size).toBe(1);
      const completed = structuredClone(state);
      toggleBattle(state);
      advanceBattle(state, 10);
      expect(state).toEqual(completed);
    }
  });

  it('replays the same seed and produces different damage sequences for a different seed', () => {
    const first = createBattle('melee', 7);
    const second = createBattle('melee', 7);
    const third = createBattle('melee', 8);
    for (const state of [first, second, third]) {
      toggleBattle(state);
      run(state, 15);
    }
    expect(first).toEqual(second);
    expect(first.events).not.toEqual(third.events);
  });

  it('slow and fast speeds preserve identical combat at equivalent game times', () => {
    const speeds: Speed[] = [0.25, 0.5, 1, 2, 3];
    const states = speeds.map(() => createBattle('melee'));
    states.forEach((state, index) => {
      state.speed = speeds[index];
      toggleBattle(state);
      run(state, 12 / state.speed);
    });
    for (const state of states.slice(1)) {
      expect(state.elapsed).toBe(states[0].elapsed);
      expect(state.units).toEqual(states[0].units);
      expect(state.events).toEqual(states[0].events);
      expect(state.projectiles).toEqual(states[0].projectiles);
      expect(state.influence).toBe(states[0].influence);
    }
  });

  it('ready and paused battles do not spend time, move, or regenerate resources', () => {
    const state = createBattle('duel');
    const ready = structuredClone(state);
    advanceBattle(state, 5);
    expect(state).toEqual(ready);
    toggleBattle(state);
    run(state, 2);
    toggleBattle(state);
    const paused = structuredClone(state);
    advanceBattle(state, 50);
    expect(state).toEqual(paused);
    toggleBattle(state);
    advanceBattle(state, 1);
    expect(state.elapsed).toBeGreaterThan(paused.elapsed);
  });

  it('regenerates energy at the specified rates without natural healing', () => {
    const state = createBattle('duel');
    for (const unit of state.units) unit.action = { kind: 'recover', duration: 10, remaining: 10 };
    const unit = state.units[0];
    unit.hp -= 30;
    unit.mana = 0;
    unit.stamina = 0;
    toggleBattle(state);
    run(state, 2);
    expect(unit.hp).toBe(unit.maxHp - 30);
    expect(unit.mana).toBeCloseTo(MANA_REGEN * 2);
    expect(unit.stamina).toBeCloseTo(STAMINA_REGEN * 2);
  });

  it('spends magic on windup, hits after casting, then enters recovery', () => {
    const state = arenaPair('mage');
    const [mage, enemy] = state.units;
    advanceBattle(state, 1 / 30);
    expect(mage.action.kind).toBe('cast');
    expect(mage.mana).toBe(mage.maxMana - 26);
    expect(enemy.hp).toBe(enemy.maxHp);
    run(state, 1);
    expect(enemy.hp).toBe(enemy.maxHp);
    run(state, 0.3);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(state.projectiles[0]?.kind).toBe('fireball');
    run(state, 0.3);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    expect(mage.action.kind).toBe('recover');
    expect(state.events.some(event => event.kind === 'cast')).toBe(true);
  });

  it('uses a free basic attack when magic or stamina is insufficient', () => {
    for (const role of ['mage', 'guard'] as const) {
      const state = arenaPair(role);
      const unit = state.units[0];
      unit.mana = 0;
      unit.stamina = 0;
      advanceBattle(state, 1 / 30);
      expect(unit.action.kind).toBe('attack');
      run(state, 1.2);
      expect(state.units[1].hp).toBeLessThan(state.units[1].maxHp);
    }
  });

  it('spends stamina on a visible weapon-skill preparation', () => {
    const state = arenaPair('guard');
    advanceBattle(state, 1 / 30);
    expect(state.units[0].action.kind).toBe('power');
    expect(state.units[0].stamina).toBe(40);
    expect(state.units[1].hp).toBe(state.units[1].maxHp);
    run(state, 1);
    expect(state.events.some(event => event.kind === 'power')).toBe(true);
  });

  it('ignores invalid time deltas', () => {
    const state = createBattle('duel');
    toggleBattle(state);
    const before = structuredClone(state);
    for (const delta of [-1, 0, Infinity, NaN]) advanceBattle(state, delta);
    expect(state).toEqual(before);
  });
});
