import { type ArenaState, type Fighter } from './model';
import { canEquip } from './equipment';
import { fireArrow } from './engine-arrows';
import { advanceControl, attackDamage, clampFighter, damageFighter, distance, hasBuff, log, syncStamina } from './engine-damage';
export { clampFighter, distance, effect, hasBuff, log, syncStamina } from './engine-damage';

export function hit(state: ArenaState, fighter: Fighter): void {
  if (fighter.hp <= 0) return;
  const target = state.fighters.find(other => other.id === fighter.targetId && other.id !== fighter.id && other.hp > 0);
  if (!target) return;
  if (fighter.weapon === 'bow') { fireArrow(state, fighter); return; }
  if (distance(fighter, target) > fighter.radius + target.radius + 0.8) return;
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
  if (state.time - fighter.lastAttack >= 2) {
    const recovery = state.time - fighter.lastMoved >= 2.5 ? 22 : 10;
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
  const threat = target.pose === 'attack' && target.targetId === fighter.id && target.poseUntil - state.time <= 0.2;
  if (fighter.shield && threat && fighter.stamina >= 10 && state.time >= fighter.nextParry &&
      Math.cos(targetAngle - fighter.facing) >= 0.5 && distance(fighter, target) <= fighter.radius + target.radius + 1) {
    fighter.parryUntil = state.time + 0.22; fighter.nextParry = state.time + 2.4;
    fighter.pose = 'parry'; fighter.poseUntil = fighter.parryUntil;
    return;
  }
  let destination: { x: number; y: number } = target;
  const available = state.items.filter(item => item.landed && canEquip(fighter, item.weapon));
  const item = available.sort((a, b) => distance(fighter, a) - distance(fighter, b))[0];
  if (item && distance(fighter, item) < 3) destination = item;
  const dx = destination.x - fighter.x, dy = destination.y - fighter.y;
  const angle = Math.atan2(dy, dx);
  const delta = Math.atan2(Math.sin(angle - fighter.facing), Math.cos(angle - fighter.facing));
  fighter.facing += Math.max(-dt * 5, Math.min(dt * 5, delta));
  const reach = fighter.weapon === 'bow' ? 5.5 : fighter.radius + target.radius + (fighter.weapon === 'sword' ? 0.5 : 0.3);
  if (destination === target && distance(fighter, target) <= reach) {
    if (state.time >= fighter.nextAttack && fighter.stamina >= 12 && Math.abs(delta) < 0.65) {
      fighter.stamina -= 12; fighter.lastAttack = state.time;
      fighter.pose = 'attack'; fighter.poseUntil = state.time + (fighter.weapon === 'club' ? 0.55 : fighter.weapon === 'bow' ? 0.45 : 0.3);
      fighter.nextAttack = state.time + (fighter.weapon === 'club' ? 1.8 : fighter.weapon === 'bow' ? 1.6 : 1.15);
    }
    return;
  }
  if (fighter.stamina < 12) return;
  const speed = fighter.speed * (hasBuff(fighter, 'haste') ? 1.65 : 1);
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
