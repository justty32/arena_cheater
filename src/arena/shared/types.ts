export type Species = 'wolf' | 'bear' | 'elephant' | 'bull' | 'porcupine' | 'snake' | 'deer';
export type Weapon = 'fists' | 'sword' | 'spear' | 'hatchet' | 'club' | 'shield' | 'bow';
export type ThrownKind = Exclude<Weapon, 'fists'> | 'stone' | 'pot' | 'dung';
export type CardId = 'sword' | 'spear' | 'hatchet' | 'club' | 'shield' | 'bow' | 'lightning' | 'bloodlust' | 'growth' | 'stone' | 'pot' | 'lightning-rain' | 'divine-wrath' | 'deliberate' | 'intuition' | 'dung' | 'spike-pit' | 'bear-trap';
export type StoneColor = 'yellow' | 'blue' | 'green' | 'black' | 'red';
export interface MagicStone { id: number; color: StoneColor }
export interface HandCard { id: number; cardId: CardId }
export interface StoneCost { generic: number; colored: Partial<Record<StoneColor, number>> }
export type Pose = 'idle' | 'walk' | 'attack' | 'hit' | 'fallen' | 'airborne' | 'rising' | 'block' | 'parry' | 'dead';
export interface Fighter {
 id: string; name: string; species: Species; color: string; x: number; y: number; facing: number;
 hp: number; maxHp: number; stamina: number; maxStamina: number; baseMaxStamina: number; radius: number;
 speed: number; attack: number; weapon: Weapon; shield: boolean; pose: Pose; poseUntil: number;
 lastAttack: number; lastMoved: number; nextAttack: number; targetId?: string;
 ammo: number; durability: number; parryUntil: number; nextParry: number;
 knockback?: { fromX: number; fromY: number; toX: number; toY: number; start: number; until: number };
 rootedUntil?: number;
 dungDamage?: { nextTickAt: number; until: number };
 buffs: { kind: 'fury' | 'haste' | 'weakness' | 'bloodlust'; until: number }[];
}
export type TrapKind = 'spike-pit' | 'bear-trap';
export interface GroundTrap { kind: TrapKind; id: number; x: number; y: number; armedAt: number; expiresAt: number }
export interface ThrownItem { id: number; weapon: ThrownKind; x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; launched: number; landsAt: number; landed: boolean }
export type ThrowImpact = { at: number; x: number; y: number } & (
 { reason: 'fighter'; fighterId: string; damage: number; dungApplied?: boolean } |
 { reason: 'item'; otherItemId: number } | { reason: 'ground' }
);
export interface ThrowFeedback {
 itemId: number; handCardId: number; itemKind: ThrownKind; launchedAt: number;
 impact?: ThrowImpact; pickup?: { at: number; fighterId: string };
}
export interface Arrow { id: number; ownerId: string; x: number; y: number; vx: number; vy: number; damage: number; expiresAt: number }
export interface ArenaEffect { id: number; x: number; y: number; text: string; color: string; at: number; kind: 'hit' | 'spell' | 'pickup' | 'impact' | 'area'; itemKind?: ThrownKind; areaRadius?: number; cardId?: CardId }
export interface DeliberationOffer {
 readonly candidates: readonly CardId[];
 resumeOnChoice: boolean;
}
export interface ArenaState {
 seed: number; time: number; accumulator: number; status: 'ready' | 'running' | 'paused' | 'finished'; speed: number;
 pendingDeliberation?: DeliberationOffer;
 knownUpcomingCount: number;
 fighters: Fighter[]; latestThrow?: ThrowFeedback; items: ThrownItem[]; traps: GroundTrap[]; arrows: Arrow[]; effects: ArenaEffect[]; logs: string[];
 hand: HandCard[]; stones: MagicStone[]; randomState: number; deck: CardId[]; discard: CardId[]; redrawAvailableAt: number; supportedId: string; winnerId?: string; resultReason?: 'last-survivor' | 'hp-ratio' | 'draw'; nextId: number;
 supportKillRewardStones: number;
}
interface CardBase { id: CardId; name: string; subtitle: string; description: string; cost: StoneCost; throwRange?: number; color: string; icon: string }
export type Card = CardBase & ({ target: 'fighter' | 'ground' | 'self' | 'trap' } | { target: 'area'; areaRadius: number; damage: number });
