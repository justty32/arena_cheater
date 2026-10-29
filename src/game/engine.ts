import { TEAM_NAMES } from './model.ts';
import type { BattleMode, BattleState } from './model.ts';
import { chooseAction, finishAction } from './combat.ts';
import { advanceProjectiles } from './attacks.ts';
import {
  addEvent, CHEAT_COST, CHEAT_HEAL, CHEAT_STAMINA, createUnits, idleAction,
  INFLUENCE_REGEN, MANA_REGEN, MAX_BATTLE_SECONDS, STAMINA_REGEN, STEP,
} from './rules.ts';

export function createBattle(mode: BattleMode, seed = 20261029): BattleState {
  const normalizedSeed = Number.isFinite(seed) ? seed >>> 0 : 20261029;
  const state: BattleState = {
    mode, status: 'ready', speed: 1, elapsed: 0, accumulator: 0,
    seed: normalizedSeed, rng: normalizedSeed, units: createUnits(mode), events: [],
    nextEventId: 1, projectiles: [], nextProjectileId: 1, winner: null, influence: 100, maxInfluence: 100, cheatCount: 0,
  };
  addEvent(state, { kind: 'system', text: '隊伍已就位。選擇你的棋子，準備從場邊介入。' });
  return state;
}

export function toggleBattle(state: BattleState): void {
  if (state.status === 'finished') return;
  if (state.status === 'running') {
    state.status = 'paused';
  } else {
    if (state.status === 'ready') addEvent(state, { kind: 'system', text: '開戰！最後站立的陣營獲勝。' });
    state.status = 'running';
  }
}

function checkOutcome(state: BattleState): boolean {
  const teams = new Set(state.units.filter(unit => unit.hp > 0).map(unit => unit.team));
  if ((teams.size > 1 || state.projectiles.length > 0) && state.elapsed < MAX_BATTLE_SECONDS) return false;
  state.status = 'finished';
  state.winner = teams.size === 1 ? [...teams][0] : null;
  state.accumulator = 0;
  state.projectiles = [];
  for (const unit of state.units) unit.action = idleAction();
  addEvent(state, {
    kind: 'system', text: state.winner === null
      ? '對戰結束，各陣營未能分出勝負。' : `${TEAM_NAMES[state.winner]}取得勝利！`,
  });
  return true;
}

function stepBattle(state: BattleState): void {
  if (checkOutcome(state)) return;
  state.elapsed = (Math.round(state.elapsed / STEP) + 1) * STEP;
  advanceProjectiles(state);
  state.influence = Math.min(state.maxInfluence, state.influence + INFLUENCE_REGEN * STEP);
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    unit.mana = Math.min(unit.maxMana, unit.mana + MANA_REGEN * STEP);
    unit.stamina = Math.min(unit.maxStamina, unit.stamina + STAMINA_REGEN * STEP);
    if (unit.action.remaining > 0) {
      unit.action.remaining = Math.max(0, unit.action.remaining - STEP);
      if (unit.action.remaining <= 1e-9) finishAction(state, unit);
    }
    if (unit.action.kind === 'idle' && unit.action.remaining <= 0) chooseAction(state, unit);
  }
  checkOutcome(state);
}

export function advanceBattle(state: BattleState, realSeconds: number): void {
  if (state.status !== 'running' || !Number.isFinite(realSeconds) || realSeconds <= 0) return;
  state.accumulator += realSeconds * state.speed;
  while (state.accumulator + 1e-9 >= STEP && state.status === 'running') {
    state.accumulator = Math.max(0, state.accumulator - STEP);
    stepBattle(state);
  }
}

export function useCheat(state: BattleState, targetId: string): boolean {
  if (state.status !== 'running' || state.influence < CHEAT_COST) return false;
  const target = state.units.find(unit => unit.id === targetId);
  if (!target || target.team !== 0 || target.hp <= 0 || target.hp >= target.maxHp) return false;
  const healed = Math.min(CHEAT_HEAL, target.maxHp - target.hp);
  target.hp += healed;
  target.stamina = Math.min(target.maxStamina, target.stamina + CHEAT_STAMINA);
  state.influence -= CHEAT_COST;
  state.cheatCount++;
  addEvent(state, {
    kind: 'cheat', text: `偷渡藥劑成功！${target.name}恢復 ${healed} 生命與耐力。`,
    targetId: target.id, amount: healed,
  });
  return true;
}
