import { ARENA_RADIUS, DUNG_TICK_EPSILON } from './shared/rules';
import type { ArenaState, Fighter } from './shared/types';
import { drawStones } from './shared/resources';

export function log(state: ArenaState, message: string): void {
  state.logs.unshift(message);
  state.logs.length = Math.min(state.logs.length, 10);
}
export function effect(state: ArenaState, point: { x: number; y: number }, text: string, color: string, kind: 'hit' | 'spell' | 'pickup' = 'hit'): void {
  state.effects.push({ id: state.nextId++, x: point.x, y: point.y, text, color, at: state.time, kind });
}
export function hasBuff(fighter: Fighter, kind: Fighter['buffs'][number]['kind']): boolean {
  return fighter.buffs.some(buff => buff.kind === kind);
}
export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function clampFighter(fighter: Pick<Fighter, 'x' | 'y' | 'radius'>): void {
  const radius = Math.hypot(fighter.x, fighter.y);
  const limit = ARENA_RADIUS - fighter.radius;
  if (radius > limit) { fighter.x *= limit / radius; fighter.y *= limit / radius; }
}
export function syncStamina(fighter: Fighter, time: number): void {
  fighter.buffs = fighter.buffs.filter(buff => buff.until > time);
  fighter.maxStamina = fighter.baseMaxStamina * (hasBuff(fighter, 'weakness') ? 0.6 : 1);
  fighter.stamina = Math.min(fighter.stamina, fighter.maxStamina);
}
const DUNG_DURATION = 5;
const DUNG_TICK_INTERVAL = 1;
const DUNG_TICK_DAMAGE = 1;

export function applyDungStatus(state: ArenaState, target: Fighter): void {
  const until = state.time + DUNG_DURATION;
  const previous = target.dungDamage;
  const nextTickAt = previous && state.time <= previous.until + DUNG_TICK_EPSILON
    ? previous.nextTickAt : state.time + DUNG_TICK_INTERVAL;
  target.dungDamage = { nextTickAt, until };

  let weaknessUntil = until;
  target.buffs = target.buffs.filter(buff => {
    if (buff.kind !== 'weakness') return true;
    weaknessUntil = Math.max(weaknessUntil, buff.until);
    return false;
  });
  target.buffs.push({ kind: 'weakness', until: weaknessUntil });
  syncStamina(target, state.time);
}

export function advanceDungDamage(state: ArenaState): void {
  for (const target of state.fighters) {
    const damage = target.dungDamage;
    if (!damage || target.hp <= 0) continue;
    while (target.hp > 0 && damage.nextTickAt <= Math.min(state.time, damage.until) + DUNG_TICK_EPSILON) {
      damage.nextTickAt += DUNG_TICK_INTERVAL;
      applyHealthDamage(state, target, DUNG_TICK_DAMAGE);
      effect(state, target, `−${DUNG_TICK_DAMAGE}`, '#ad907a');
    }
    if (target.hp > 0 && damage.until - state.time <= DUNG_TICK_EPSILON) {
      target.dungDamage = undefined;
      syncStamina(target, Math.max(state.time, damage.until));
    }
  }
}
export function attackDamage(fighter: Fighter): number {
  const isSwordOrSpear = fighter.weapon === 'sword' || fighter.weapon === 'spear';
  const isClubOrHatchet = fighter.weapon === 'club' || fighter.weapon === 'hatchet';
  let damage = fighter.attack * (isSwordOrSpear ? 1.65 : isClubOrHatchet ? 1.9 : fighter.weapon === 'bow' ? 1.35 : 1);
  if (fighter.species === 'elephant' && fighter.weapon === 'club') damage *= 1.2;
  if (hasBuff(fighter, 'fury')) damage *= 1.65;
  if (hasBuff(fighter, 'weakness')) damage *= 0.55;
  if (hasBuff(fighter, 'bloodlust')) damage += 3;
  return damage;
}
function launchFighter(state: ArenaState, target: Fighter, origin: { x: number; y: number }): void {
  const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const landing = { x: target.x + Math.cos(angle) * 1.3, y: target.y + Math.sin(angle) * 1.3, radius: target.radius };
  clampFighter(landing);
  target.knockback = { fromX: target.x, fromY: target.y, toX: landing.x, toY: landing.y, start: state.time, until: state.time + 0.35 };
  target.pose = 'airborne'; target.poseUntil = target.knockback.until;
}
/** Returns false only when there was no effective hit (including a successful parry). */
export function damageFighter(state: ArenaState, target: Fighter, rawDamage: number, origin: { x: number; y: number }, attacker?: Fighter, knockback = false, sourceFighterId = attacker?.id): boolean {
  if (target.hp <= 0) return false;
  const facingDot = Math.cos(Math.atan2(origin.y - target.y, origin.x - target.x) - target.facing);
  const canDefend = target.shield && facingDot >= 0.5 && !['airborne', 'fallen', 'rising', 'dead'].includes(target.pose);
  if (canDefend && target.parryUntil > state.time && target.stamina >= 10) {
    target.stamina -= 10; target.lastAttack = state.time;
    target.pose = 'parry'; target.poseUntil = state.time + 0.22;
    target.parryUntil = 0;
    if (attacker && attacker.hp > 0) { attacker.pose = 'hit'; attacker.poseUntil = state.time + 0.45; attacker.nextAttack = Math.max(attacker.nextAttack, attacker.poseUntil); }
    effect(state, target, '招架', '#e7d29c');
    return false;
  }
  let damage = rawDamage * (facingDot < -0.5 ? 1.2 : 1);
  let blocked = false;
  if (canDefend && target.stamina >= 6) {
    target.stamina -= 6; target.lastAttack = state.time;
    damage *= 0.5; blocked = true;
  }
  damage = Math.max(1, Math.round(damage));
  applyHealthDamage(state, target, damage, sourceFighterId);
  const shieldBroken = blocked && attacker?.weapon === 'hatchet';
  if (shieldBroken) {
    target.shield = false;
    target.parryUntil = 0;
    log(state, `${target.name} 的盾牌被短斧打碎了`);
  }
  const hitLabel = shieldBroken ? '破盾 ' : blocked ? '格擋 ' : '';
  effect(state, target, `${hitLabel}−${damage}`, blocked ? '#e7d29c' : '#f0a393');
  if (target.hp > 0) {
    if (knockback) launchFighter(state, target, origin);
    else if (blocked) { target.pose = 'block'; target.poseUntil = state.time + 0.2; }
    else if (!['attack', 'airborne', 'fallen', 'rising'].includes(target.pose)) {
      target.pose = 'hit'; target.poseUntil = state.time + 0.18;
    }
  }
  return true;
}
/** Direct spells bypass directional defense, but share the single death transition. */
export function applyHealthDamage(state: ArenaState, target: Fighter, damage: number, sourceFighterId?: string): void {
  if (target.hp <= 0) return;
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp === 0) {
    target.pose = 'dead'; target.poseUntil = Infinity; target.knockback = undefined;
    target.dungDamage = undefined; target.rootedUntil = undefined;
    log(state, `${target.name} 倒下了`);
    const killer = state.fighters.find(fighter => fighter.id === sourceFighterId && fighter.id !== target.id);
    if (killer && killer.hp > 0 && killer.species === 'wolf') {
      killer.buffs = killer.buffs.filter(buff => buff.kind !== 'fury');
      killer.buffs.push({kind:'fury',until:state.time+8});
      effect(state,killer,'擊殺狂熱','#df776a','spell');
    }
    if (sourceFighterId === state.supportedId && sourceFighterId !== target.id) {
      const rewardStones = 3;
      drawStones(state, rewardStones);
      state.supportKillRewardStones += rewardStones;
      const source = state.fighters.find(fighter => fighter.id === sourceFighterId);
      log(state, `支持的鬥士${source?.name ?? sourceFighterId}擊殺，獲得 ${rewardStones} 顆魔法石`);
    }
  }
}
/** Control poses own movement and prevent attacks until the complete recovery sequence ends. */
export function advanceControl(state: ArenaState, fighter: Fighter): boolean {
  if (fighter.hp <= 0) { fighter.pose = 'dead'; fighter.knockback = undefined; return true; }
  if (fighter.pose === 'airborne') {
    const flight = fighter.knockback;
    if (flight) {
      const progress = Math.min(1, Math.max(0, (state.time - flight.start) / (flight.until - flight.start)));
      fighter.x = flight.fromX + (flight.toX - flight.fromX) * progress;
      fighter.y = flight.fromY + (flight.toY - flight.fromY) * progress;
      clampFighter(fighter);
    }
    if (state.time >= fighter.poseUntil) {
      fighter.knockback = undefined; fighter.pose = 'fallen'; fighter.poseUntil = state.time + 0.8;
    }
    return true;
  }
  if (fighter.pose === 'fallen') {
    if (state.time >= fighter.poseUntil) { fighter.pose = 'rising'; fighter.poseUntil = state.time + 0.35; }
    return true;
  }
  if (fighter.pose === 'rising') {
    if (state.time < fighter.poseUntil) return true;
    fighter.pose = 'idle';
  }
  return false;
}
