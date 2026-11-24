import { BALANCE as B } from '../shared/balance';
import { ARENA_RADIUS } from '../shared/rules';
import type { ArenaState, Fighter } from '../shared/types';
import { attackDamage, damageFighter, log } from './engine-damage';
import { sweptCircleTime } from './geometry';

export function fireArrow(state: ArenaState, fighter: Fighter): void {
  if (fighter.ammo <= 0 || fighter.hp <= 0) return;
  const dx = Math.cos(fighter.facing), dy = Math.sin(fighter.facing);
  state.arrows.push({ id: state.nextId++, ownerId: fighter.id, x: fighter.x + dx * fighter.radius,
    y: fighter.y + dy * fighter.radius, vx: dx * B.arrowSpeed, vy: dy * B.arrowSpeed, damage: attackDamage(fighter), expiresAt: state.time + B.arrowLifetime });
  fighter.ammo--;
  if (fighter.ammo === 0) {
    fighter.weapon = 'fists';
    log(state, `${fighter.name} 用盡三支箭，改以徒手戰鬥`);
  }
}
export function advanceArrows(state: ArenaState, dt: number): void {
  state.arrows = state.arrows.filter(arrow => {
    const elapsed = Math.min(dt, Math.max(0, arrow.expiresAt - (state.time - dt)));
    const dx = arrow.vx * elapsed, dy = arrow.vy * elapsed;
    let first: Fighter | undefined, firstTime = Infinity;
    for (const fighter of state.fighters) {
      if (fighter.hp <= 0 || fighter.id === arrow.ownerId) continue;
      const t = sweptCircleTime(arrow, { x: arrow.x + dx, y: arrow.y + dy }, fighter, fighter, fighter.radius + B.arrowPadding);
      if (t !== undefined && t < firstTime) { first = fighter; firstTime = t; }
    }
    if (first) {
      // Impact direction comes from the fixed flight vector, not the archer's present position.
      damageFighter(state, first, arrow.damage, { x: first.x - arrow.vx, y: first.y - arrow.vy }, undefined, false, arrow.ownerId);
      return false;
    }
    arrow.x += dx; arrow.y += dy;
    return state.time < arrow.expiresAt && Math.hypot(arrow.x, arrow.y) <= ARENA_RADIUS + B.arrowBoundaryPadding;
  });
}
