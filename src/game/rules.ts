import { ROLE_NAMES, TEAM_NAMES } from './model.ts';
import type { Action, BattleEvent, BattleMode, BattleState, Unit, UnitRole } from './model.ts';

export const STEP = 1 / 30;
export const MAX_BATTLE_SECONDS = 180;
export const CHEAT_COST = 35;
export const CHEAT_HEAL = 28;
export const CHEAT_STAMINA = 18;
export const MANA_REGEN = 2;
export const STAMINA_REGEN = 8;
export const INFLUENCE_REGEN = 2;

export function idleAction(): Action {
  return { kind: 'idle', duration: 0, remaining: 0 };
}

export function random(state: BattleState): number {
  state.rng = (Math.imul(1664525, state.rng) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

export function addEvent(state: BattleState, event: Omit<BattleEvent, 'id' | 'time'>): void {
  state.events.push({ ...event, id: state.nextEventId++, time: state.elapsed });
  if (state.events.length > 50) state.events.splice(0, state.events.length - 50);
}

const STATS: Record<UnitRole, { hp: number; mana: number; attack: number; armor: number; range: number }> = {
  guard: { hp: 220, mana: 30, attack: 16, armor: 4, range: 1 },
  ranger: { hp: 160, mana: 45, attack: 13, armor: 2, range: 3 },
  mage: { hp: 145, mana: 80, attack: 9, armor: 1, range: 3 },
};

export function createUnits(mode: BattleMode): Unit[] {
  const positions = mode === 'duel'
    ? [[[3, 2], [2, 1], [4, 1]], [[4, 5], [5, 6], [3, 6]]]
    : [[[2, 2], [1, 1], [2, 0]], [[5, 5], [6, 6], [5, 7]],
      [[5, 2], [6, 1], [7, 2]], [[2, 5], [1, 6], [0, 5]]];
  const roles: UnitRole[] = ['guard', 'ranger', 'mage'];
  return positions.flatMap((teamPositions, team) => roles.map((role, index) => {
    const stats = STATS[role];
    const [x, y] = teamPositions[index];
    return {
      id: `team-${team}-${role}`, name: `${TEAM_NAMES[team]}・${ROLE_NAMES[role]}`,
      team, role, x, y, hp: stats.hp, maxHp: stats.hp, mana: stats.mana,
      maxMana: stats.mana, stamina: 70, maxStamina: 70, attack: stats.attack,
      armor: stats.armor, range: stats.range, action: idleAction(), hitUntil: 0,
    };
  }));
}
