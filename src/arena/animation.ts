import type { Fighter } from './model';
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
/** Rendering samples simulation time; no animation state or wall clock is advanced here. */
export function airborneHeight(fighter: Fighter, time: number): number {
  const motion = fighter.knockback;
  if (fighter.pose !== 'airborne' || !motion || motion.until <= motion.start) return 0;
  return Math.sin(clamp((time - motion.start) / (motion.until - motion.start)) * Math.PI) * 1.15;
}
export function riseProgress(fighter: Fighter, time: number): number {
  return fighter.pose === 'rising' ? clamp(1 - (fighter.poseUntil - time) / .35) : 0;
}
