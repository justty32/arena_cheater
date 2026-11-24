import { BALANCE as B } from '../shared/balance';
import { THROW_PROFILES } from '../shared/rules';
import type { ArenaState, Fighter, Weapon } from '../shared/types';
import { canEquip } from '../items/equipment';
import { fireArrow } from './engine-arrows';
import { advanceControl, attackDamage, clampFighter, damageFighter, distance, hasBuff, log, syncStamina } from './engine-damage';
export { clampFighter, distance, effect, hasBuff, log, syncStamina } from './engine-damage';

type AttackProfile = { windup: number; cooldown: number; staminaCost?: number } & (
  | { kind: 'melee'; startGap: number; hitGap: number }
  | { kind: 'ranged'; centerReach: number }
);

// Melee gaps are measured between the fighters' collision boundaries.
const ATTACK_PROFILES: Record<Weapon, AttackProfile> = {
  fists:  { kind: 'melee', startGap: B.fistsStartGap, hitGap: B.fistsHitGap, windup: B.fistsWindup, cooldown: B.fistsCooldown },
  sword:  { kind: 'melee', startGap: B.swordStartGap, hitGap: B.swordHitGap, windup: B.swordWindup, cooldown: B.swordCooldown },
  spear:  { kind: 'melee', startGap: B.spearStartGap, hitGap: B.spearHitGap, windup: B.spearWindup, cooldown: B.spearCooldown },
  hatchet: { kind: 'melee', startGap: B.hatchetStartGap, hitGap: B.hatchetHitGap, windup: B.hatchetWindup, cooldown: B.hatchetCooldown, staminaCost: B.hatchetStaminaCost },
  club:   { kind: 'melee', startGap: B.clubStartGap, hitGap: B.clubHitGap, windup: B.clubWindup, cooldown: B.clubCooldown },
  shield: { kind: 'melee', startGap: B.shieldStartGap, hitGap: B.shieldHitGap, windup: B.shieldWindup, cooldown: B.shieldCooldown },
  bow:    { kind: 'ranged', centerReach: B.bowCenterReach, windup: B.bowWindup, cooldown: B.bowCooldown },
};

export function hit(state: ArenaState, fighter: Fighter): void {
  if (fighter.hp <= 0) return;
  const target = state.fighters.find(other => other.id === fighter.targetId && other.id !== fighter.id && other.hp > 0);
  if (!target) return;
  const attack = ATTACK_PROFILES[fighter.weapon];
  if (attack.kind === 'ranged') { fireArrow(state, fighter); return; }
  if (distance(fighter, target) > fighter.radius + target.radius + attack.hitGap) return;
  const club = fighter.weapon === 'club';
  const connected = damageFighter(state, target, attackDamage(fighter), fighter, fighter, club);
  if (club && connected) {
    fighter.durability = Math.max(0, fighter.durability - 1);
    if (fighter.durability === 0) { fighter.weapon = 'fists'; log(state, `${fighter.name} 的木棍斷裂了`); }
  }
}
export function act(state: ArenaState, fighter: Fighter, dt: number): void {
  if (fighter.hp <= 0) { advanceControl(state, fighter); return; }
  syncStamina(fighter, state.time);
  if (state.time - fighter.lastAttack >= B.recoveryAttackDelay) {
    const recovery = state.time - fighter.lastMoved >= B.recoveryIdleDelay ? B.idleRecovery : B.movingRecovery;
    fighter.stamina = Math.min(fighter.maxStamina, fighter.stamina + recovery * dt);
  }
  if (advanceControl(state, fighter)) return;
  if (fighter.pose === 'attack' && state.time >= fighter.poseUntil) {
    hit(state, fighter);
    // A parry may have interrupted this attack; preserve the resulting recovery pose.
    if (fighter.pose === 'attack') fighter.pose = 'idle';
  }
  if (['attack', 'hit', 'block', 'parry'].includes(fighter.pose) && state.time < fighter.poseUntil) return;
  fighter.pose = 'idle';
  const enemies = state.fighters.filter(other => other.id !== fighter.id && other.hp > 0);
  const target = enemies.sort((a, b) => distance(fighter, a) - distance(fighter, b))[0];
  if (!target) return;
  fighter.targetId = target.id;
  const targetAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
  const threat = target.pose === 'attack' && target.targetId === fighter.id && target.poseUntil - state.time <= B.parryThreatWindow;
  if (fighter.shield && threat && fighter.stamina >= B.parryStamina && state.time >= fighter.nextParry &&
      Math.cos(targetAngle - fighter.facing) >= B.defendFacingDot && distance(fighter, target) <= fighter.radius + target.radius + B.parryGap) {
    fighter.parryUntil = state.time + B.parryWindow; fighter.nextParry = state.time + B.parryCooldown;
    fighter.pose = 'parry'; fighter.poseUntil = fighter.parryUntil;
    return;
  }
  let destination: { x: number; y: number } = target;
  const available = state.items.filter(item => item.landed && !THROW_PROFILES[item.weapon].disposable && canEquip(fighter, item.weapon as Weapon));
  const item = available.sort((a, b) => distance(fighter, a) - distance(fighter, b))[0];
  if (item && distance(fighter, item) < B.pickupPreference) destination = item;
  const dx = destination.x - fighter.x, dy = destination.y - fighter.y;
  const angle = Math.atan2(dy, dx);
  const delta = Math.atan2(Math.sin(angle - fighter.facing), Math.cos(angle - fighter.facing));
  fighter.facing += Math.max(-dt * B.turnRate, Math.min(dt * B.turnRate, delta));
  const attack = ATTACK_PROFILES[fighter.weapon];
  const reach = attack.kind === 'ranged' ? attack.centerReach : fighter.radius + target.radius + attack.startGap;
  if (destination === target && distance(fighter, target) <= reach) {
    const staminaCost = attack.staminaCost ?? B.attackStamina;
    if (state.time >= fighter.nextAttack && fighter.stamina >= staminaCost && Math.abs(delta) < B.attackAngle) {
      fighter.stamina -= staminaCost; fighter.lastAttack = state.time;
      fighter.pose = 'attack'; fighter.poseUntil = state.time + attack.windup;
      fighter.nextAttack = state.time + attack.cooldown;
    }
    return;
  }
  // Rooting blocks only voluntary translation, not attacks, turning or recovery above.
  if (fighter.stamina < B.moveStamina || (fighter.rootedUntil !== undefined && state.time < fighter.rootedUntil)) return;
  const speed = fighter.speed * (hasBuff(fighter, 'haste') ? B.hasteMultiplier : 1);
  const step = Math.min(speed * dt, Math.hypot(dx, dy));
  fighter.x += Math.cos(angle) * step; fighter.y += Math.sin(angle) * step;
  fighter.pose = 'walk'; fighter.lastMoved = state.time;
}
export function separateFighters(state: ArenaState): void {
  const alive = state.fighters.filter(fighter => fighter.hp > 0 && fighter.pose !== 'airborne');
  for (let pass = 0; pass < 3; pass++) {
    alive.forEach((a, i) => {
      for (const b of alive.slice(i + 1)) {
        const d = distance(a, b), minimum = a.radius + b.radius;
        if (d >= minimum) continue;
        const angle = d < 0.00001 ? i * 2.4 : Math.atan2(b.y - a.y, b.x - a.x);
        const correction = (minimum - d) / 2 + 0.00001;
        a.x -= Math.cos(angle) * correction; a.y -= Math.sin(angle) * correction;
        b.x += Math.cos(angle) * correction; b.y += Math.sin(angle) * correction;
      }
    });
    alive.forEach(clampFighter);
  }
}
