import { ROLE_NAMES, TEAM_NAMES } from '../game/model';
import type { BattleState, Unit } from '../game/model';

export function unitPosition(unit: Unit): { x: number; y: number } {
  const action = unit.action;
  if (action.kind !== 'move' || action.duration <= 0) return { x: unit.x, y: unit.y };
  const progress = Math.max(0, Math.min(1, 1 - action.remaining / action.duration));
  const fromX = action.fromX ?? unit.x;
  const fromY = action.fromY ?? unit.y;
  return { x: fromX + (unit.x - fromX) * progress, y: fromY + (unit.y - fromY) * progress };
}

export function targetOf(state: BattleState, unit: Unit): Unit | undefined {
  const projectile = state.projectiles.find((shot) => shot.sourceId === unit.id);
  const id = unit.action.targetId ?? projectile?.targetId;
  return state.units.find((other) => other.id === id && other.hp > 0);
}

export function actionLabel(unit: Unit, state: BattleState): string {
  if (unit.hp <= 0) return '倒下';
  if (unit.action.kind === 'recover' && state.projectiles.some((shot) => shot.sourceId === unit.id)) return '出手';
  if (unit.action.kind === 'attack') return unit.role === 'guard' ? '揮擊準備' : '瞄準';
  if (unit.action.kind === 'power') return unit.role === 'guard' ? '重擊蓄力' : '強弓蓄力';
  return { idle: '觀察', move: '移動', cast: '火球詠唱', recover: '收招' }[unit.action.kind];
}

export function targetLabel(unit: Unit): string {
  return `${TEAM_NAMES[unit.team]}・${ROLE_NAMES[unit.role]}`;
}
