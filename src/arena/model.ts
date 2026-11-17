export type Species = 'wolf' | 'bear' | 'elephant' | 'bull' | 'porcupine' | 'snake' | 'deer';
export type Weapon = 'fists' | 'sword' | 'club' | 'shield' | 'bow';
export type CardId = 'sword' | 'club' | 'shield' | 'bow' | 'lightning' | 'bloodlust' | 'growth';
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
 buffs: { kind: 'fury' | 'haste' | 'weakness' | 'bloodlust'; until: number }[];
}
export interface ThrownItem { id: number; weapon: Weapon; x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; launched: number; landsAt: number; landed: boolean }
export interface Arrow { id: number; ownerId: string; x: number; y: number; vx: number; vy: number; damage: number; expiresAt: number }
export interface ArenaEffect { id: number; x: number; y: number; text: string; color: string; at: number; kind: 'hit' | 'spell' | 'pickup' }
export interface ArenaState {
 seed: number; time: number; accumulator: number; status: 'ready' | 'running' | 'paused' | 'finished'; speed: number;
 fighters: Fighter[]; items: ThrownItem[]; arrows: Arrow[]; effects: ArenaEffect[]; logs: string[];
 hand: HandCard[]; stones: MagicStone[]; randomState: number; deck: CardId[]; discard: CardId[]; redrawAvailableAt: number; supportedId: string; winnerId?: string; nextId: number;
}
export interface Card { id: CardId; name: string; subtitle: string; description: string; cost: StoneCost; target: 'fighter' | 'ground'; color: string; icon: string }
export const ARENA_RADIUS = 7.5;
export const CARDS: Card[] = [
 { id:'sword',name:'直劍',subtitle:'投送裝備',description:'單手劍；落地後可被任何鬥士拾取',cost:{generic:2,colored:{}},target:'ground',color:'#b7c9d0',icon:'†' },
 { id:'club',name:'木棍',subtitle:'投送裝備',description:'雙手重擊可擊飛，兩次有效命中後斷裂',cost:{generic:2,colored:{}},target:'ground',color:'#c59b72',icon:'╱' },
 { id:'shield',name:'圓盾',subtitle:'投送裝備',description:'單手盾；消耗體力格擋或短窗招架',cost:{generic:3,colored:{}},target:'ground',color:'#dfbc70',icon:'⛨' },
 { id:'bow',name:'長弓',subtitle:'雙手遠程',description:'雙手弓；附三支箭，射完後回到徒手',cost:{generic:1,colored:{}},target:'ground',color:'#9eb98c',icon:'⌒' },
 { id:'lightning',name:'閃電劍',subtitle:'紅色法術',description:'目標受到 3 點傷害，無視盾與方向',cost:{generic:0,colored:{red:1}},target:'fighter',color:'#df776a',icon:'ϟ' },
 { id:'bloodlust',name:'殺紅眼',subtitle:'紅色法術',description:'攻擊力 +3，持續 5 秒',cost:{generic:1,colored:{red:1}},target:'fighter',color:'#df776a',icon:'✦' },
 { id:'growth',name:'野性成長',subtitle:'綠色法術',description:'恢復 10 點生命，不超過生命上限',cost:{generic:2,colored:{green:1}},target:'fighter',color:'#86b18b',icon:'✚' },
];

/** No new interventions once combat is only draining its last in-flight arrows. */
export function isResolvingArena(state: ArenaState): boolean {
 return state.time >= 180 || state.fighters.filter(fighter => fighter.hp > 0).length <= 1;
}
