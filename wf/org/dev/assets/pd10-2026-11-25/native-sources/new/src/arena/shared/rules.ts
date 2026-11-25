import { BALANCE as B } from './balance';
import type { ThrownKind } from './types';

export const ARENA_RADIUS = B.arenaRadius;
export const SPIKE_PIT_RADIUS = B.trapRadius;
export const THROW_TARGET_RADIUS = ARENA_RADIUS - B.throwInset;
export const THROW_ORIGIN = { x: 0, y: ARENA_RADIUS };
export const THROW_PROFILES: Record<ThrownKind, { damage: number; disposable: boolean; bypassDefense: boolean }> = {
 sword: {damage:B.throwSwordDamage,disposable:B.throwSwordDisposable,bypassDefense:B.throwSwordBypassDefense}, spear: {damage:B.throwSpearDamage,disposable:B.throwSpearDisposable,bypassDefense:B.throwSpearBypassDefense},
 hatchet: {damage:B.throwHatchetDamage,disposable:B.throwHatchetDisposable,bypassDefense:B.throwHatchetBypassDefense}, club: {damage:B.throwClubDamage,disposable:B.throwClubDisposable,bypassDefense:B.throwClubBypassDefense},
 bow: {damage:B.throwBowDamage,disposable:B.throwBowDisposable,bypassDefense:B.throwBowBypassDefense}, shield: {damage:B.throwShieldDamage,disposable:B.throwShieldDisposable,bypassDefense:B.throwShieldBypassDefense},
 stone: {damage:B.throwStoneDamage,disposable:B.throwStoneDisposable,bypassDefense:B.throwStoneBypassDefense}, pot: {damage:B.throwPotDamage,disposable:B.throwPotDisposable,bypassDefense:B.throwPotBypassDefense},
 dung: {damage:B.throwDungDamage,disposable:B.throwDungDisposable,bypassDefense:B.throwDungBypassDefense},
};
export const DUNG_TICK_EPSILON = 1e-9;
