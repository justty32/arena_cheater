import { ARENA_RADIUS, type ArenaState, type Fighter, type Species } from './model';
import { act, log, separateFighters } from './engine-combat';
import { advanceItems } from './engine-items';
import { advanceArrows } from './engine-arrows';
import { advanceControl, syncStamina } from './engine-damage';
export { playCard } from './engine-items';

const STEP = 1 / 30;
const SPECIES: { species: Species; name: string; color: string; hp: number; stamina: number; speed: number; attack: number; radius: number }[] = [
  { species: 'wolf', name: '灰牙・狼鬥士', color: '#75b6c7', hp: 110, stamina: 75, speed: 1.75, attack: 11, radius: 0.35 },
  { species: 'bear', name: '鐵掌・熊鬥士', color: '#c9956c', hp: 155, stamina: 75, speed: 1.1, attack: 13, radius: 0.45 },
  { species: 'elephant', name: '碎岩・象鬥士', color: '#a2a6bc', hp: 135, stamina: 80, speed: 1.05, attack: 12, radius: 0.46 },
  { species: 'bull', name: '赤角・牛鬥士', color: '#bd7773', hp: 125, stamina: 110, speed: 1.2, attack: 12, radius: 0.42 },
  { species: 'porcupine', name: '棘背・豪豬鬥士', color: '#bca96f', hp: 115, stamina: 80, speed: 1.3, attack: 11, radius: 0.37 },
  { species: 'snake', name: '青鱗・蛇鬥士', color: '#86b18b', hp: 105, stamina: 80, speed: 1.4, attack: 12, radius: 0.32 },
  { species: 'deer', name: '暮枝・鹿鬥士', color: '#d3b58f', hp: 110, stamina: 80, speed: 1.5, attack: 11, radius: 0.35 },
];
export function createArena(seed = 73021): ArenaState {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const gates = [1, 2, 3, 4, 5, 6, 7];
  for (let i = gates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [gates[i], gates[j]] = [gates[j], gates[i]]; }
  const fighters: Fighter[] = SPECIES.map((spec, i) => {
    const angle = -Math.PI / 2 + gates[i] * Math.PI / 4;
    return { ...spec, id: `fighter-${i}`, x: Math.cos(angle) * 6.45, y: Math.sin(angle) * 6.45,
      facing: angle + Math.PI, maxHp: spec.hp, maxStamina: spec.stamina, baseMaxStamina: spec.stamina, weapon: 'fists', shield: false,
      pose: 'idle', poseUntil: 0, lastAttack: -10, lastMoved: -10, nextAttack: random() * 0.3, buffs: [], ammo: 0, durability: 0, parryUntil: 0, nextParry: 0 };
  });
  return { seed, time: 0, accumulator: 0, status: 'ready', speed: 1, fighters, items: [], arrows: [], effects: [],
    logs: ['七位鬥士已入場。選擇你的支持者，準備暗中出手。'], mana: 80, gold: 75, supportedId: fighters[0].id, nextId: 1 };
}
export function toggleArena(state: ArenaState): void {
  if (state.status === 'finished') return;
  state.status = state.status === 'running' ? 'paused' : 'running';
}
function step(state: ArenaState): void {
  state.time += STEP;
  const mayAdvance = state.time < 180 && state.fighters.filter(fighter => fighter.hp > 0).length > 1;
  if (mayAdvance) {
    state.mana = Math.min(100, state.mana + STEP * 5);
    state.gold = Math.min(100, state.gold + STEP * 1.5);
    advanceItems(state, STEP);
  }
  advanceArrows(state, STEP);
  const mayAct = state.time < 180 && state.fighters.filter(fighter => fighter.hp > 0).length > 1;
  for (const fighter of state.fighters) {
    if (mayAct) act(state, fighter, STEP);
    else {
      syncStamina(fighter, state.time);
      advanceControl(state, fighter);
      if (fighter.pose === 'attack') fighter.pose = 'idle';
    }
  }
  separateFighters(state);
  state.effects = state.effects.filter(effect => state.time - effect.at < 1.8);
  const alive = state.fighters.filter(fighter => fighter.hp > 0);
  if ((alive.length <= 1 || state.time >= 180) && state.arrows.length === 0) {
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
