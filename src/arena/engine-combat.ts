import { ARENA_RADIUS, type ArenaState, type Fighter } from './model';

export function log(state: ArenaState, message: string): void {
  state.logs.unshift(message);
  state.logs.length = Math.min(state.logs.length, 10);
}
export function effect(state: ArenaState, fighter: Pick<Fighter, 'x' | 'y'>, text: string, color: string, kind: 'hit' | 'spell' | 'pickup' = 'hit'): void {
  state.effects.push({ id: state.nextId++, x: fighter.x, y: fighter.y, text, color, at: state.time, kind });
}
export function hasBuff(fighter: Fighter, kind: Fighter['buffs'][number]['kind']): boolean {
  return fighter.buffs.some(buff => buff.kind === kind);
}
export function distance(a: Pick<Fighter, 'x' | 'y'>, b: Pick<Fighter, 'x' | 'y'>): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function hit(state: ArenaState, fighter: Fighter): void {
  const target = state.fighters.find(other => other.id === fighter.targetId && other.hp > 0);
  if (!target || distance(fighter, target) > fighter.radius + target.radius + 0.8) return;
  const toAttacker = Math.atan2(fighter.y - target.y, fighter.x - target.x);
  const facingDot = Math.cos(toAttacker - target.facing);
  let damage = fighter.attack * (fighter.weapon === 'sword' ? 1.65 : fighter.weapon === 'club' ? 1.9 : 1);
  if (fighter.species === 'elephant' && fighter.weapon === 'club') damage *= 1.2;
  if (hasBuff(fighter, 'fury')) damage *= 1.65;
  if (hasBuff(fighter, 'weakness')) damage *= 0.55;
  if (facingDot < -0.5) damage *= 1.2;
  if (target.shield && facingDot > 0.5 && target.pose !== 'fallen') damage *= 0.5;
  damage = Math.max(1, Math.round(damage));
  target.hp = Math.max(0, target.hp - damage);
  effect(state, target, `−${damage}`, '#f0a393');
  if (target.hp <= 0) {
    target.pose = 'dead'; target.poseUntil = Infinity;
    log(state, `${target.name} 倒下了`);
  } else if (fighter.weapon === 'club') {
    target.pose = 'fallen'; target.poseUntil = state.time + 1.15;
  } else if (target.pose !== 'attack' && target.pose !== 'fallen') {
    target.pose = 'hit'; target.poseUntil = state.time + 0.18;
  }
}
export function act(state: ArenaState, fighter: Fighter, dt: number): void {
  if (fighter.hp <= 0) return;
  fighter.buffs = fighter.buffs.filter(buff => buff.until > state.time);
  if (state.time - fighter.lastAttack >= 2) {
    const recovery = state.time - fighter.lastMoved >= 2.5 ? 22 : 10;
    fighter.stamina = Math.min(fighter.maxStamina, fighter.stamina + recovery * dt);
  }
  if (fighter.pose === 'attack' && state.time >= fighter.poseUntil) {
    hit(state, fighter); fighter.pose = 'idle';
  }
  if (['attack', 'hit', 'fallen'].includes(fighter.pose) && state.time < fighter.poseUntil) return;
  fighter.pose = 'idle';
  const enemies = state.fighters.filter(other => other.id !== fighter.id && other.hp > 0);
  const target = enemies.sort((a, b) => distance(fighter, a) - distance(fighter, b))[0];
  if (!target) return;
  fighter.targetId = target.id;
  let destination: { x: number; y: number } = target;
  const available = state.items.filter(item => item.landed && (item.weapon === 'shield' ? !fighter.shield : fighter.weapon === 'fists'));
  const item = available.sort((a, b) => distance(fighter, a) - distance(fighter, b))[0];
  if (item && distance(fighter, item) < 3) destination = item;
  const dx = destination.x - fighter.x, dy = destination.y - fighter.y;
  const angle = Math.atan2(dy, dx);
  const delta = Math.atan2(Math.sin(angle - fighter.facing), Math.cos(angle - fighter.facing));
  fighter.facing += Math.max(-dt * 5, Math.min(dt * 5, delta));
  const reach = fighter.radius + target.radius + (fighter.weapon === 'sword' ? 0.5 : 0.3);
  if (destination === target && distance(fighter, target) <= reach) {
    if (state.time >= fighter.nextAttack && fighter.stamina >= 12 && Math.abs(delta) < 0.65) {
      fighter.stamina -= 12; fighter.lastAttack = state.time;
      fighter.pose = 'attack'; fighter.poseUntil = state.time + (fighter.weapon === 'club' ? 0.55 : 0.3);
      fighter.nextAttack = state.time + (fighter.weapon === 'club' ? 1.8 : 1.15);
    }
    return;
  }
  if (fighter.stamina < 12) return;
  const speed = fighter.speed * (hasBuff(fighter, 'haste') ? 1.65 : 1);
  const step = Math.min(speed * dt, Math.hypot(dx, dy));
  fighter.x += Math.cos(angle) * step; fighter.y += Math.sin(angle) * step;
  fighter.pose = 'walk'; fighter.lastMoved = state.time;
}
export function clampFighter(fighter: Fighter): void {
  const radius = Math.hypot(fighter.x, fighter.y);
  const limit = ARENA_RADIUS - fighter.radius;
  if (radius > limit) { fighter.x *= limit / radius; fighter.y *= limit / radius; }
}
export function separateFighters(state: ArenaState): void {
  const alive = state.fighters.filter(fighter => fighter.hp > 0);
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
