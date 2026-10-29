import { describe, expect, it } from 'vitest';
import { advanceBattle, toggleBattle } from '../../src/game/engine.ts';
import { arenaPair, run } from './helpers';

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
