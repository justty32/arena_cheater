import type { ArenaState, StoneColor } from './types';

export const COLORS: StoneColor[] = ['yellow', 'blue', 'green', 'black', 'red'];
export function random(state: ArenaState): number {
  state.randomState = (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}
export function drawStones(state: ArenaState, count: number): void {
  for (let i = 0; i < count; i++) state.stones.push({ id: state.nextId++, color: COLORS[Math.floor(random(state) * COLORS.length)] });
}
