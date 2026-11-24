import { BALANCE as B } from '../shared/balance';
import { ARENA_RADIUS } from '../shared/rules';
import { hasPendingDungDamage } from '../shared/status';
import type { ArenaState, Fighter, Species } from '../shared/types';
import { act, separateFighters } from './engine-combat';
import { advanceItems } from '../items/engine-items';
import { advanceTraps, trapMovementStart } from '../items/engine-traps';
import { advanceArrows } from './engine-arrows';
import { advanceControl, advanceDungDamage, log, syncStamina } from './engine-damage';
import { initializeCards } from '../items/engine-cards';
export { REDRAW_COOLDOWN, redrawStones, findPayment, canPayCost, paymentStatus, chooseDeliberation, keepDeliberationPaused, knownUpcomingCards, type PaymentStatus } from '../items/engine-cards';
export { playCard, validateCardPlay, previewThrowContact, type CardTarget, type CardPlayRejection, type CardPlayValidation } from '../items/engine-items';

const STEP = 1 / 30;
const SPECIES: { species: Species; name: string; color: string; hp: number; stamina: number; speed: number; attack: number; radius: number }[] = [
  { species: 'wolf', name: '灰牙・狼鬥士', color: '#75b6c7', hp: B.wolfHp, stamina: B.wolfStamina, speed: B.wolfSpeed, attack: B.wolfAttack, radius: B.wolfRadius },
  { species: 'bear', name: '鐵掌・熊鬥士', color: '#c9956c', hp: B.bearHp, stamina: B.bearStamina, speed: B.bearSpeed, attack: B.bearAttack, radius: B.bearRadius },
  { species: 'elephant', name: '碎岩・象鬥士', color: '#a2a6bc', hp: B.elephantHp, stamina: B.elephantStamina, speed: B.elephantSpeed, attack: B.elephantAttack, radius: B.elephantRadius },
  { species: 'bull', name: '赤角・牛鬥士', color: '#bd7773', hp: B.bullHp, stamina: B.bullStamina, speed: B.bullSpeed, attack: B.bullAttack, radius: B.bullRadius },
  { species: 'porcupine', name: '棘背・豪豬鬥士', color: '#bca96f', hp: B.porcupineHp, stamina: B.porcupineStamina, speed: B.porcupineSpeed, attack: B.porcupineAttack, radius: B.porcupineRadius },
  { species: 'snake', name: '青鱗・蛇鬥士', color: '#86b18b', hp: B.snakeHp, stamina: B.snakeStamina, speed: B.snakeSpeed, attack: B.snakeAttack, radius: B.snakeRadius },
  { species: 'deer', name: '暮枝・鹿鬥士', color: '#d3b58f', hp: B.deerHp, stamina: B.deerStamina, speed: B.deerSpeed, attack: B.deerAttack, radius: B.deerRadius },
];
export function createArena(seed = 73021): ArenaState {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const gates = [1, 2, 3, 4, 5, 6, 7];
  for (let i = gates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [gates[i], gates[j]] = [gates[j], gates[i]]; }
  const fighters: Fighter[] = SPECIES.map((spec, i) => {
    const angle = -Math.PI / 2 + gates[i] * Math.PI / 4;
    return { ...spec, id: `fighter-${i}`, x: Math.cos(angle) * B.entryRadius, y: Math.sin(angle) * B.entryRadius,
      facing: angle + Math.PI, maxHp: spec.hp, maxStamina: spec.stamina, baseMaxStamina: spec.stamina, weapon: 'fists', shield: false,
      pose: 'idle', poseUntil: 0, lastAttack: -10, lastMoved: -10, nextAttack: random() * B.entryAttackJitter, buffs: [], ammo: 0, durability: 0, parryUntil: 0, nextParry: 0 };
  });
  const state: ArenaState = { seed, time: 0, accumulator: 0, status: 'ready', speed: 1, fighters, items: [], traps: [], arrows: [], effects: [],
    logs: ['七位鬥士已入場。選擇你的支持者，準備暗中出手。'], hand: [], stones: [], randomState: (seed ^ 0x9e3779b9) >>> 0, deck: [], discard: [], redrawAvailableAt: 0, knownUpcomingCount: 0, supportedId: fighters[0].id, supportKillRewardStones: 0, nextId: 1 };
  initializeCards(state);
  return state;
}
export function toggleArena(state: ArenaState): void {
  if (state.status === 'finished' || state.pendingDeliberation) return;
  state.status = state.status === 'running' ? 'paused' : 'running';
}
function step(state: ArenaState): void {
  const startedAt = state.time;
  state.time += STEP;
  advanceItems(state, STEP);
  advanceArrows(state, STEP);
  advanceDungDamage(state);
  const mayAct = state.time < B.matchDuration && state.fighters.filter(fighter => fighter.hp > 0).length > 1;
  const trapMovement = mayAct && state.traps.length ? trapMovementStart(state, startedAt) : undefined;
  for (const fighter of state.fighters) {
    if (mayAct) act(state, fighter, STEP);
    else {
      syncStamina(fighter, state.time);
      advanceControl(state, fighter);
      if (fighter.pose === 'attack') fighter.pose = 'idle';
    }
  }
  separateFighters(state);
  if (mayAct && state.traps.length) advanceTraps(state, startedAt, trapMovement);
  state.effects = state.effects.filter(effect => state.time - effect.at < 1.8);
  const alive = state.fighters.filter(fighter => fighter.hp > 0);
  if ((!mayAct || alive.length <= 1) && state.traps.length) state.traps = [];
  if ((alive.length <= 1 || state.time >= B.matchDuration) && state.arrows.length === 0 && state.items.every(item => item.landed) && !hasPendingDungDamage(state)) {
    state.status = 'finished';
    state.winnerId = alive.length === 1 ? alive[0].id : undefined;
    log(state, alive.length === 1 ? `${alive[0].name} 贏得競技場！` : '本場平局');
  }
}
export function advanceArena(state: ArenaState, elapsedSeconds: number): void {
  if (state.status !== 'running' || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0 || !Number.isFinite(state.speed) || state.speed <= 0) return;
  state.accumulator += elapsedSeconds * state.speed;
  while (state.accumulator + 1e-9 >= STEP && state.status === 'running') {
    state.accumulator = Math.max(0, state.accumulator - STEP);
    step(state);
  }
  if ((state.status as ArenaState['status']) === 'finished') state.accumulator = 0;
}
export { ARENA_RADIUS };
