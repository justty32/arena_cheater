export type Species = 'wolf' | 'bear' | 'elephant' | 'bull' | 'porcupine' | 'snake' | 'deer';
export type Weapon = 'fists' | 'sword' | 'club' | 'shield';
export type CardId = 'fury' | 'haste' | 'weakness' | 'trip' | 'sword' | 'club' | 'shield';
export type Pose = 'idle' | 'walk' | 'attack' | 'hit' | 'fallen' | 'dead';
export interface Fighter {
 id: string; name: string; species: Species; color: string; x: number; y: number; facing: number;
 hp: number; maxHp: number; stamina: number; maxStamina: number; radius: number;
 speed: number; attack: number; weapon: Weapon; shield: boolean; pose: Pose; poseUntil: number;
 lastAttack: number; lastMoved: number; nextAttack: number; targetId?: string;
 buffs: { kind: 'fury' | 'haste' | 'weakness'; until: number }[];
}
export interface ThrownItem { id: number; weapon: Weapon; x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; launched: number; landsAt: number; landed: boolean }
export interface ArenaEffect { id: number; x: number; y: number; text: string; color: string; at: number; kind: 'hit' | 'spell' | 'pickup' }
export interface ArenaState {
 seed: number; time: number; accumulator: number; status: 'ready' | 'running' | 'paused' | 'finished'; speed: number;
 fighters: Fighter[]; items: ThrownItem[]; effects: ArenaEffect[]; logs: string[];
 mana: number; gold: number; supportedId: string; winnerId?: string; nextId: number;
}
export interface Card { id: CardId; name: string; subtitle: string; description: string; cost: number; currency: 'mana' | 'gold'; target: 'fighter' | 'ground'; color: string; icon: string }
export const ARENA_RADIUS = 7.5;
export const CARDS: Card[] = [
 { id:'fury',name:'怪力',subtitle:'力量增幅',description:'攻擊力提升 65%，持續 8 秒',cost:24,currency:'mana',target:'fighter',color:'#d9a24b',icon:'✦' },
 { id:'haste',name:'興奮',subtitle:'步伐加速',description:'移動速度提升 65%，持續 8 秒',cost:18,currency:'mana',target:'fighter',color:'#55c9b4',icon:'↗' },
 { id:'weakness',name:'虛弱',subtitle:'暗中作梗',description:'攻擊力降低 45%，持續 7 秒',cost:22,currency:'mana',target:'fighter',color:'#b293df',icon:'◈' },
 { id:'trip',name:'絆足咒',subtitle:'失去平衡',description:'讓鬥士跌倒 2 秒',cost:28,currency:'mana',target:'fighter',color:'#cf7e77',icon:'〰' },
 { id:'sword',name:'直劍',subtitle:'投送裝備',description:'落地後可被任何鬥士拾取',cost:25,currency:'gold',target:'ground',color:'#b7c9d0',icon:'†' },
 { id:'club',name:'木棍',subtitle:'投送裝備',description:'重擊使對手跌倒；原型暫無耐久',cost:30,currency:'gold',target:'ground',color:'#c59b72',icon:'╱' },
 { id:'shield',name:'圓盾',subtitle:'投送裝備',description:'拾取後減少正面受到的傷害',cost:20,currency:'gold',target:'ground',color:'#dfbc70',icon:'⛨' },
];
