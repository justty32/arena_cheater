import type { BattleState, Projectile } from '../../game/model';
import { center, clamp, svg } from './svg';

export class ProjectilesView {
  readonly layer = svg('g', 'projectile-effects');
  private shots = new Map<number, SVGGElement>();

  constructor(private motion: MediaQueryList) {}

  reset(): void {
    this.shots.clear();
    this.layer.replaceChildren();
  }

  render(state: BattleState): void {
    const active = new Set<number>();
    for (const shot of state.projectiles) {
      active.add(shot.id);
      let group = this.shots.get(shot.id);
      if (!group) {
        group = this.createProjectile(shot);
        this.shots.set(shot.id, group);
        this.layer.append(group);
      }
      const target = state.units.find((unit) => unit.id === shot.targetId);
      const from = { x: (shot.fromX + 0.5) * 100, y: (shot.fromY + 0.5) * 100 };
      const to = target ? center(target) : { x: (shot.toX + 0.5) * 100, y: (shot.toY + 0.5) * 100 };
      const progress = clamp((state.elapsed - shot.startedAt) / shot.duration);
      const visualProgress = this.motion.matches ? 0.55 : progress;
      const x = from.x + (to.x - from.x) * visualProgress;
      const y = from.y + (to.y - from.y) * visualProgress;
      const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
      group.dataset.progress = progress.toFixed(4);
      group.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
      const trail = group.querySelector<SVGLineElement>('.motion-trail')!;
      trail.setAttribute('x1', String(this.motion.matches ? -Math.hypot(to.x - from.x, to.y - from.y) * .55 : -70));
      trail.setAttribute('x2', String(this.motion.matches ? Math.hypot(to.x - from.x, to.y - from.y) * .45 : -12));
    }
    for (const [id, element] of this.shots) {
      if (!active.has(id)) { element.remove(); this.shots.delete(id); }
    }
  }

  private createProjectile(shot: Projectile): SVGGElement {
    const group = svg('g', `projectile ${shot.kind}`);
    group.dataset.testid = `projectile-${shot.id}`;
    group.dataset.kind = shot.kind;
    group.dataset.id = String(shot.id);
    group.dataset.sourceId = shot.sourceId;
    group.dataset.targetId = shot.targetId;
    group.dataset.source = shot.sourceId;
    group.dataset.target = shot.targetId;
    const trail = '<line class="motion-trail" x1="-70" y1="0" x2="-12" y2="0" />';
    if (shot.kind === 'arrow') {
      group.innerHTML = `${trail}<path class="arrow-shaft" d="M-34 0 H12 M-30 -7 L-21 0 -30 7"/><path class="arrow-head" d="m18 0-15-7 4 7-4 7Z"/>`;
    } else if (shot.kind === 'fireball') {
      group.innerHTML = `${trail}<path class="fire-tail" d="M10 0Q-20-20-59-10L-34 0-59 10Q-20 20 10 0Z"/><circle class="fire-glow" r="22"/><circle class="fire-body" r="13"/><circle class="fire-core" cx="4" cy="-2" r="7"/><circle class="fire-spark" cx="-39" cy="-15" r="3"/><circle class="fire-spark" cx="-53" cy="9" r="2"/>`;
    } else {
      group.innerHTML = `${trail}<path class="bolt-tail" d="M-46-6-25 1-10-3M-38 9-20 4-9 5"/><circle class="bolt-glow" r="17"/><path class="bolt-core" d="m13 0-13-8-12 8 12 8Z"/>`;
    }
    return group;
  }
}
