export type BattleMode = 'duel' | 'melee';
export type BattleStatus = 'ready' | 'running' | 'paused' | 'finished';
export type UnitRole = 'guard' | 'ranger' | 'mage';
export type ActionKind = 'idle' | 'move' | 'attack' | 'cast' | 'power' | 'recover';
export type Speed = 1 | 2 | 3;

export interface Action {
  kind: ActionKind;
  duration: number;
  remaining: number;
  targetId?: string;
  fromX?: number;
  fromY?: number;
}

export interface Unit {
  id: string;
  name: string;
  team: number;
  role: UnitRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  attack: number;
  armor: number;
  range: number;
  action: Action;
  hitUntil: number;
}

export interface BattleEvent {
  id: number;
  time: number;
  kind: 'attack' | 'cast' | 'power' | 'launch' | 'cheat' | 'death' | 'system';
  text: string;
  sourceId?: string;
  targetId?: string;
  amount?: number;
}

export interface Projectile {
  id: number;
  kind: 'arrow' | 'fireball' | 'bolt';
  attackKind: 'attack' | 'cast' | 'power';
  sourceId: string;
  targetId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  duration: number;
  damage: number;
}

export interface BattleState {
  mode: BattleMode;
  status: BattleStatus;
  speed: Speed;
  elapsed: number;
  accumulator: number;
  seed: number;
  rng: number;
  units: Unit[];
  events: BattleEvent[];
  nextEventId: number;
  projectiles: Projectile[];
  nextProjectileId: number;
  winner: number | null;
  influence: number;
  maxInfluence: number;
  cheatCount: number;
}

export const BOARD_SIZE = 8;
export const TEAM_NAMES = ['翠綠旗', '赤焰旗', '蒼藍旗', '紫羅旗'];
export const ROLE_NAMES: Record<UnitRole, string> = { guard: '衛士', ranger: '遊俠', mage: '法師' };
