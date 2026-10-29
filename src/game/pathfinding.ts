import { BOARD_SIZE } from './model.ts';
import type { BattleState, Unit } from './model.ts';

type Point = { x: number; y: number };
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]];
const key = (point: Point) => point.y * BOARD_SIZE + point.x;

export function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function hasLineOfSight(state: BattleState, origin: Point, target: Unit, sourceId: string): boolean {
  const steps = distance(origin, target);
  for (let i = 1; i < steps; i++) {
    const x = Math.round(origin.x + (target.x - origin.x) * i / steps);
    const y = Math.round(origin.y + (target.y - origin.y) * i / steps);
    if (state.units.some(unit => unit.hp > 0 && unit.id !== sourceId && unit.id !== target.id
      && unit.x === x && unit.y === y)) return false;
  }
  return true;
}

export function canReachTarget(state: BattleState, unit: Unit, target: Unit): boolean {
  return distance(unit, target) <= unit.range && hasLineOfSight(state, unit, target, unit.id);
}

export function nextStep(state: BattleState, unit: Unit, target: Unit): Point | undefined {
  const occupied = new Set(state.units.filter(other => other.hp > 0 && other.id !== unit.id).map(key));
  const visited = new Set([key(unit)]);
  const queue: Array<{ point: Point; first?: Point }> = [{ point: unit }];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { point, first } = queue[cursor];
    if (first && distance(point, target) <= unit.range && hasLineOfSight(state, point, target, unit.id)) {
      return first;
    }
    for (const [dx, dy] of DIRECTIONS) {
      const next = { x: point.x + dx, y: point.y + dy };
      if (next.x < 0 || next.x >= BOARD_SIZE || next.y < 0 || next.y >= BOARD_SIZE
        || occupied.has(key(next)) || visited.has(key(next))) continue;
      visited.add(key(next));
      queue.push({ point: next, first: first ?? next });
    }
  }
  return undefined;
}
