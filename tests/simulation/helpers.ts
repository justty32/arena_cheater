import { advanceBattle, createBattle, toggleBattle } from '../../src/game/engine.ts';
import type { BattleState, Unit } from '../../src/game/model.ts';

export function run(state: BattleState, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 30); i++) advanceBattle(state, 1 / 30);
}

export function arenaPair(role: Unit['role']): BattleState {
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
