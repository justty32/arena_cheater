import type { BattleState } from '../../game/model';
import { targetOf } from '../presentation';
import { center, svg } from './svg';

export class TargetsView {
  readonly layer = svg('g', 'target-effects');
  private aims = new Map<string, SVGPathElement>();

  reset(): void {
    this.aims.clear();
    this.layer.replaceChildren();
  }

  render(state: BattleState, selectedId: string): void {
    const active = new Set<string>();
    for (const unit of state.units) {
      const target = targetOf(state, unit);
      if (unit.hp <= 0 || !target) continue;
      active.add(unit.id);
      let path = this.aims.get(unit.id);
      if (!path) {
        path = svg('path', 'target-line');
        this.aims.set(unit.id, path);
        this.layer.append(path);
      }
      const from = center(unit);
      const to = center(target);
      path.setAttribute('d', `M${from.x},${from.y} L${to.x},${to.y}`);
      path.dataset.source = unit.id;
      path.dataset.target = target.id;
      path.dataset.selected = String(unit.id === selectedId);
      path.classList.toggle('selected-target-line', unit.id === selectedId);
    }
    for (const [id, path] of this.aims) {
      if (!active.has(id)) { path.remove(); this.aims.delete(id); }
    }
  }
}
