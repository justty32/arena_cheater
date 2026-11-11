import { ARENA_RADIUS } from './model';
export interface Projection { cx: number; cy: number; scale: number }
export const FORESHORTENING = Math.SQRT1_2;
export function createProjection(width: number, height: number): Projection {
  return { cx: width / 2, cy: height * 0.53, scale: Math.max(1, Math.min((width - 40) / 19, (height - 35) / 14.5)) };
}
export function project(x: number, y: number, p: Projection): { x: number; y: number } {
  return { x: p.cx + x * p.scale, y: p.cy + y * p.scale * FORESHORTENING };
}
export function unproject(x: number, y: number, p: Projection): { x: number; y: number } {
  return { x: (x - p.cx) / p.scale, y: (y - p.cy) / (p.scale * FORESHORTENING) };
}
export function insideArena(x: number, y: number): boolean { return Math.hypot(x, y) <= ARENA_RADIUS; }
