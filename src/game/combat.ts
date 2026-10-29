import type { ActionKind, BattleState, Unit } from './model.ts';
import { canReachTarget, distance, nextStep } from './pathfinding.ts';
import { idleAction, random } from './rules.ts';
import { applyDamage, launchProjectile, rollDamage } from './attacks.ts';

const MANA_COST = 26;
const STAMINA_COST = 30;

export function chooseAction(state: BattleState, unit: Unit): void {
  const enemies = state.units.filter(other => other.hp > 0 && other.team !== unit.team);
  if (!enemies.length) return;
  const offset = Math.floor(random(state) * enemies.length);
  const ordered = [...enemies.slice(offset), ...enemies.slice(0, offset)]
    .sort((a, b) => distance(unit, a) - distance(unit, b));
  for (const target of ordered) {
    if (canReachTarget(state, unit, target)) {
      let kind: ActionKind = 'attack';
      let duration = unit.role === 'guard' ? 0.65 : 0.7;
      if (unit.role === 'mage' && unit.mana >= MANA_COST) {
        kind = 'cast';
        duration = 1.2;
        unit.mana -= MANA_COST;
      } else if (unit.role !== 'mage' && unit.stamina >= STAMINA_COST) {
        kind = 'power';
        duration = 0.95;
        unit.stamina -= STAMINA_COST;
      }
      unit.action = { kind, duration, remaining: duration, targetId: target.id };
      return;
    }
    const step = nextStep(state, unit, target);
    if (step) {
      unit.action = { kind: 'move', duration: 0.5, remaining: 0.5, fromX: unit.x, fromY: unit.y };
      unit.x = step.x;
      unit.y = step.y;
      return;
    }
  }
  unit.action = { kind: 'idle', duration: 0.25, remaining: 0.25 };
}

export function finishAction(state: BattleState, unit: Unit): void {
  const { kind, targetId } = unit.action;
  if (kind === 'move' || kind === 'recover' || kind === 'idle') {
    unit.action = idleAction();
    return;
  }
  const target = state.units.find(other => other.id === targetId);
  if (target && target.hp > 0 && canReachTarget(state, unit, target)) {
    const damage = rollDamage(state, unit, target, kind);
    if (unit.role === 'guard') applyDamage(state, unit, target, kind, damage);
    else launchProjectile(state, unit, target, kind, damage);
  }
  const duration = kind === 'cast' ? 0.8 : kind === 'power' ? 0.7 : 0.55;
  unit.action = { kind: 'recover', duration, remaining: duration };
}
