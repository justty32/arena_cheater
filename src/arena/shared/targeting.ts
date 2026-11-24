import type { Card, Fighter } from './types';
import { ARENA_RADIUS, THROW_ORIGIN, THROW_TARGET_RADIUS } from './rules';

export function isThrowableTarget(card: Card, target: {x:number;y:number}): boolean {
 return card.target === 'ground' && Number.isFinite(target.x) && Number.isFinite(target.y) &&
  Math.hypot(target.x,target.y) <= THROW_TARGET_RADIUS &&
  (card.throwRange === undefined || Math.hypot(target.x-THROW_ORIGIN.x,target.y-THROW_ORIGIN.y) <= card.throwRange);
}
export function isTrapTarget(card: Card, target: {x:number;y:number}): boolean {
 return card.target === 'trap' && Number.isFinite(target.x) && Number.isFinite(target.y) &&
  Math.hypot(target.x,target.y) <= THROW_TARGET_RADIUS;
}
export function isAreaSpellTarget(card: Card, point: {x:number;y:number}): boolean {
 return card.target === 'area' && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.hypot(point.x,point.y) <= ARENA_RADIUS;
}
export function areaSpellTargets(fighters: readonly Fighter[], card: Card, point: {x:number;y:number}): Fighter[] {
 if (card.target !== 'area' || !isAreaSpellTarget(card,point)) return [];
 return fighters.filter(fighter => fighter.hp > 0 && Math.hypot(fighter.x-point.x,fighter.y-point.y) <= card.areaRadius);
}
