import { BALANCE as B } from './balance';
import type { ArenaState, Fighter } from './types';
import { DUNG_TICK_EPSILON } from './rules';

export function hasPendingDungTick(fighter: Fighter): boolean {
 const damage = fighter.dungDamage;
 return fighter.hp > 0 && damage !== undefined && damage.nextTickAt <= damage.until + DUNG_TICK_EPSILON;
}
export function hasPendingDungDamage(state: ArenaState): boolean {
 return state.fighters.some(hasPendingDungTick);
}

/** No new interventions once combat is only draining its last in-flight attacks. */
export function isResolvingArena(state: ArenaState): boolean {
 return state.time >= B.matchDuration || state.fighters.filter(fighter => fighter.hp > 0).length <= 1;
}
