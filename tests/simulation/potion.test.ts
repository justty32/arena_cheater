import { describe, expect, it } from 'vitest';
import { createBattle, toggleBattle, useCheat } from '../../src/game/engine.ts';
import { CHEAT_COST } from '../../src/game/rules.ts';
import { run } from './helpers';

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

  it('caps restoration at maximum health and stamina', () => {
    const capped = createBattle('duel');
    capped.units[0].hp -= 3;
    toggleBattle(capped);
    useCheat(capped, capped.units[0].id);
    expect(capped.units[0].hp).toBe(capped.units[0].maxHp);
    expect(capped.units[0].stamina).toBe(capped.units[0].maxStamina);
  });
});
