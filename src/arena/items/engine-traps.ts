import { BALANCE as B } from '../shared/balance';
import { applyHealthDamage, effect, log } from '../sim/engine-damage';
import { sweptCircleTime, type Point } from '../sim/geometry';
import { SPIKE_PIT_RADIUS } from '../shared/rules';
import type { ArenaState, Fighter, TrapKind } from '../shared/types';

const ARM_SECONDS = B.trapArm;
const ARMED_LIFETIME = B.trapLifetime;
const ROOT_SECONDS = B.trapRoot;
const CLOCK_EPSILON = 1e-9;

export function placeTrap(state: ArenaState, point: Point, kind: TrapKind): void {
  const armedAt = state.time + ARM_SECONDS;
  state.traps.push({ id: state.nextId++, kind, ...point, armedAt, expiresAt: armedAt + ARMED_LIFETIME });
  log(state, kind === 'bear-trap' ? '已布置捕獸夾' : '已布置刺洞');
}

export function trapMovementStart(state: ArenaState, startedAt: number): Map<Fighter, Point> | undefined {
  if (!state.traps.some(trap => state.time + CLOCK_EPSILON >= trap.armedAt && startedAt + CLOCK_EPSILON < trap.expiresAt)) return undefined;
  const positions = new Map<Fighter, Point>();
  for (const fighter of state.fighters) {
    if (fighter.hp > 0 && fighter.pose !== 'airborne') positions.set(fighter, { x: fighter.x, y: fighter.y });
  }
  return positions;
}

export function advanceTraps(state: ArenaState, startedAt: number, positions: ReadonlyMap<Fighter, Point> | undefined): void {
  const duration = state.time - startedAt;
  // The array stays in placement order, so multiple traps resolve by their IDs.
  state.traps = state.traps.filter(trap => {
    const activeFrom = Math.max(startedAt, Math.min(state.time, trap.armedAt));
    const activeUntil = Math.min(state.time, trap.expiresAt);
    const expired = state.time + CLOCK_EPSILON >= trap.expiresAt;
    if (!positions || state.time + CLOCK_EPSILON < trap.armedAt || activeUntil < activeFrom) return !expired;

    const fromFraction = (activeFrom - startedAt) / duration;
    const untilFraction = (activeUntil - startedAt) / duration;
    let first: Fighter | undefined;
    let firstTime = Infinity;
    for (const fighter of state.fighters) {
      if (fighter.hp <= 0 || fighter.pose === 'airborne') continue;
      const start = positions.get(fighter);
      let contactAt: number;
      if (start) {
        const from = fromFraction === 0 ? start : pointAlongStep(start, fighter, fromFraction);
        const until = untilFraction === 1 ? fighter : pointAlongStep(start, fighter, untilFraction);
        const time = sweptCircleTime(from, until, trap, trap, SPIKE_PIT_RADIUS);
        if (time === undefined) continue;
        contactAt = activeFrom + (activeUntil - activeFrom) * time;
      } else {
        // A fighter airborne at the start can only touch down at the end of this step.
        if (Math.hypot(fighter.x - trap.x, fighter.y - trap.y) > SPIKE_PIT_RADIUS) continue;
        contactAt = state.time;
      }
      if (contactAt + CLOCK_EPSILON >= trap.expiresAt) continue;
      if (!first || contactAt < firstTime || (contactAt === firstTime && fighter.id.localeCompare(first.id) < 0)) {
        first = fighter;
        firstTime = contactAt;
      }
    }
    if (!first) return !expired;
    const rooted = trap.kind === 'bear-trap';
    const damage = rooted ? B.bearTrapDamage : B.spikeDamage;
    const name = rooted ? '捕獸夾' : '刺洞';
    applyHealthDamage(state, first, damage);
    if (rooted && first.hp > 0) first.rootedUntil = state.time + ROOT_SECONDS;
    effect(state, first, `${name} −${damage}${rooted && first.hp > 0 ? ' · 定身' : ''}`, rooted ? '#87c6bd' : '#b59980');
    log(state, `${first.name}踩中${name}，受到 ${damage} 點傷害${rooted && first.hp > 0 ? '，定身 3 秒' : ''}`);
    return false;
  });
}

function pointAlongStep(from: Point, to: Point, fraction: number): Point {
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}
