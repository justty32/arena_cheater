import type { BattleState, Projectile, Unit } from './model.ts';
import { distance } from './pathfinding.ts';
import { addEvent, idleAction, random } from './rules.ts';

type AttackKind = Projectile['attackKind'];

export function rollDamage(state: BattleState, source: Unit, target: Unit, kind: AttackKind): number {
  const base = kind === 'cast' ? 28 : source.attack * (kind === 'power' ? 1.7 : 1);
  const armor = kind === 'cast' ? target.armor * 0.3 : target.armor;
  return Math.max(1, Math.round(base * (0.88 + random(state) * 0.24) - armor));
}

export function applyDamage(
  state: BattleState, source: Unit, target: Unit, kind: AttackKind, damage: number,
): void {
  if (target.hp <= 0) return;
  const actualDamage = Math.min(target.hp, damage);
  target.hp -= actualDamage;
  target.hitUntil = state.elapsed + 0.35;
  const verb = kind === 'cast' ? '的火球擊中' : kind === 'power' ? '使出武技擊中'
    : source.role === 'ranger' ? '的箭矢擊中' : source.role === 'mage' ? '的魔力彈擊中' : '揮劍擊中';
  addEvent(state, {
    kind, text: `${source.name}${verb}${target.name}，造成 ${actualDamage} 傷害。`,
    sourceId: source.id, targetId: target.id, amount: actualDamage,
  });
  if (target.hp <= 0) {
    target.action = idleAction();
    addEvent(state, { kind: 'death', text: `${target.name}倒下。`, targetId: target.id });
  }
}

export function launchProjectile(
  state: BattleState, source: Unit, target: Unit, kind: AttackKind, damage: number,
): void {
  const projectileKind = source.role === 'ranger' ? 'arrow' : kind === 'cast' ? 'fireball' : 'bolt';
  state.projectiles.push({
    id: state.nextProjectileId++, kind: projectileKind, attackKind: kind,
    sourceId: source.id, targetId: target.id, fromX: source.x, fromY: source.y,
    toX: target.x, toY: target.y, startedAt: state.elapsed,
    duration: Math.min(0.65, 0.2 + distance(source, target) * 0.15), damage,
  });
  const verb = projectileKind === 'arrow' ? '射出箭矢' : projectileKind === 'fireball' ? '施放火球' : '發射魔力彈';
  addEvent(state, {
    kind: 'launch', text: `${source.name}向${target.name}${verb}。`,
    sourceId: source.id, targetId: target.id,
  });
}

export function advanceProjectiles(state: BattleState): void {
  const arrived = state.projectiles.filter(projectile =>
    state.elapsed - projectile.startedAt + 1e-9 >= projectile.duration);
  state.projectiles = state.projectiles.filter(projectile =>
    state.elapsed - projectile.startedAt + 1e-9 < projectile.duration);
  for (const projectile of arrived) {
    const source = state.units.find(unit => unit.id === projectile.sourceId);
    const target = state.units.find(unit => unit.id === projectile.targetId);
    if (source && target) applyDamage(state, source, target, projectile.attackKind, projectile.damage);
  }
}
