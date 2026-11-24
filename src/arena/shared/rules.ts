import type { ThrownKind } from './types';

export const ARENA_RADIUS = 7.5;
export const SPIKE_PIT_RADIUS = 0.55;
export const THROW_TARGET_RADIUS = ARENA_RADIUS - 0.2;
export const THROW_ORIGIN = { x: 0, y: ARENA_RADIUS };
export const THROW_PROFILES: Record<ThrownKind, { damage: number; disposable: boolean; bypassDefense: boolean }> = {
 sword: {damage:1,disposable:false,bypassDefense:false}, spear: {damage:1,disposable:false,bypassDefense:false},
 hatchet: {damage:2,disposable:false,bypassDefense:false}, club: {damage:3,disposable:false,bypassDefense:false},
 bow: {damage:1,disposable:false,bypassDefense:false}, shield: {damage:0,disposable:false,bypassDefense:false},
 stone: {damage:1,disposable:true,bypassDefense:false}, pot: {damage:3,disposable:true,bypassDefense:true},
 dung: {damage:1,disposable:true,bypassDefense:true},
};
export const DUNG_TICK_EPSILON = 1e-9;
