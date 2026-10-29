import { describe, expect, it } from 'vitest';
import { advanceBattle, createBattle, toggleBattle, useCheat } from '../src/game/engine.ts';
import type { BattleMode, BattleState, Speed, Unit } from '../src/game/model.ts';
import { CHEAT_COST, MANA_REGEN, STAMINA_REGEN } from '../src/game/rules.ts';

function run(state: BattleState, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 30); i++) advanceBattle(state, 1 / 30);
}

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

function arenaPair(role: Unit['role']): BattleState {
  const state = createBattle('duel');
  state.units = [state.units.find(unit => unit.team === 0 && unit.role === role)!, state.units[3]];
  state.units[0].x = 3;
  state.units[0].y = 3;
  state.units[1].x = 4;
  state.units[1].y = 3;
  state.units[1].action = { kind: 'recover', duration: 100, remaining: 100 };
  toggleBattle(state);
  return state;
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

describe('sideline potion', () => {
  it('rejects full-health, missing, enemy, dead, paused and unaffordable targets without spending', () => {
    const state = createBattle('duel');
    const ally = state.units[0];
    toggleBattle(state);
    for (const target of [ally.id, 'missing', state.units[3].id]) {
      expect(useCheat(state, target)).toBe(false);
    }
    ally.hp = 0;
    expect(useCheat(state, ally.id)).toBe(false);
    ally.hp = 50;
    toggleBattle(state);
    expect(useCheat(state, ally.id)).toBe(false);
    toggleBattle(state);
    state.influence = CHEAT_COST - 1;
    expect(useCheat(state, ally.id)).toBe(false);
    expect(state.influence).toBe(CHEAT_COST - 1);
    expect(state.cheatCount).toBe(0);
    expect(ally.hp).toBe(50);
  });

  it('heals and restores stamina while spending a regenerating energy bar', () => {
    const state = createBattle('duel');
    const ally = state.units[0];
    ally.hp = 50;
    ally.stamina = 0;
    toggleBattle(state);
    expect(useCheat(state, ally.id)).toBe(true);
    expect(ally.hp).toBe(78);
    expect(ally.stamina).toBe(18);
    expect(state.influence).toBe(65);
    expect(state.cheatCount).toBe(1);
    expect(state.events.at(-1)?.kind).toBe('cheat');
    run(state, 1);
    expect(state.influence).toBeCloseTo(67);
  });

  it('caps restoration and can alter a real battle outcome', () => {
    const capped = createBattle('duel');
    capped.units[0].hp -= 3;
    toggleBattle(capped);
    useCheat(capped, capped.units[0].id);
    expect(capped.units[0].hp).toBe(capped.units[0].maxHp);
    expect(capped.units[0].stamina).toBe(capped.units[0].maxStamina);

    const baseline = arenaPair('guard');
    baseline.units[1].action = { kind: 'idle', duration: 0, remaining: 0 };
    baseline.units[0].hp = 42;
    baseline.units[1].hp = 60;
    const helped = structuredClone(baseline);
    expect(useCheat(helped, helped.units[0].id)).toBe(true);
    run(baseline, 60);
    run(helped, 60);
    expect(baseline.status).toBe('finished');
    expect(helped.status).toBe('finished');
    expect(baseline.winner).toBe(1);
    expect(helped.winner).toBe(0);
  });
});

describe('projectile flight', () => {
  it('launches arrows and magic bolts before dealing damage', () => {
    for (const role of ['ranger', 'mage'] as const) {
      const state = arenaPair(role);
      state.units[0].mana = 0;
      run(state, role === 'ranger' ? 1.1 : 0.8);
      expect(state.projectiles).toHaveLength(1);
      expect(state.projectiles[0].kind).toBe(role === 'ranger' ? 'arrow' : 'bolt');
      expect(state.units[1].hp).toBe(state.units[1].maxHp);
      run(state, 0.5);
      expect(state.units[1].hp).toBeLessThan(state.units[1].maxHp);
    }
  });

  it('freezes an airborne projectile during pause and resumes the same flight', () => {
    const state = arenaPair('mage');
    run(state, 1.3);
    expect(state.projectiles).toHaveLength(1);
    toggleBattle(state);
    const frozen = structuredClone(state);
    advanceBattle(state, 10);
    expect(state).toEqual(frozen);
    toggleBattle(state);
    run(state, 0.1);
    expect(state.units[1].hp).toBe(state.units[1].maxHp);
    run(state, 0.3);
    expect(state.units[1].hp).toBeLessThan(state.units[1].maxHp);
    expect(state.projectiles).toHaveLength(0);
  });

  it('discards an arriving projectile whose target already died without a second hit', () => {
    const state = arenaPair('mage');
    run(state, 1.3);
    state.units[1].hp = 0;
    const before = state.events.length;
    run(state, 0.1);
    expect(state.status).toBe('running');
    run(state, 0.3);
    expect(state.status).toBe('finished');
    expect(state.projectiles).toHaveLength(0);
    expect(state.events.slice(before).filter(event => event.kind === 'cast' || event.kind === 'death')).toHaveLength(0);
  });

  it('settles both final projectiles even after their casters die, allowing a draw', () => {
    const state = arenaPair('mage');
    state.units[1].role = 'mage';
    state.units[1].action = { kind: 'idle', duration: 0, remaining: 0 };
    for (const unit of state.units) unit.hp = 1;
    run(state, 1.3);
    expect(state.projectiles).toHaveLength(2);
    expect(state.units.map(unit => unit.hp)).toEqual([1, 1]);
    run(state, 0.4);
    expect(state.status).toBe('finished');
    expect(state.winner).toBeNull();
    expect(state.units.map(unit => unit.hp)).toEqual([0, 0]);
    expect(state.events.filter(event => event.kind === 'death')).toHaveLength(2);
  });
});
