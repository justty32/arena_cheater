import type { BattleEvent, BattleState, Projectile, Unit } from '../game/model';
import { targetOf, unitPosition } from './presentation';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DAMAGE_KINDS = new Set(['attack', 'cast', 'power', 'cheat']);
const IMPACT_DURATION = 1.05;
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

function svg<K extends keyof SVGElementTagNameMap>(tag: K, className: string): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  element.setAttribute('class', className);
  return element;
}

function center(unit: Unit): { x: number; y: number } {
  const position = unitPosition(unit);
  return { x: (position.x + 0.5) * 100, y: (position.y + 0.5) * 100 };
}

interface Impact {
  element: SVGGElement;
  burst: SVGGElement;
  number: SVGTextElement;
  time: number;
  x: number;
  y: number;
  angle: number;
}

export class EffectsView {
  private shots = new Map<number, SVGGElement>();
  private impacts = new Map<number, Impact>();
  private aims = new Map<string, SVGPathElement>();
  private lastEventId = 0;
  private motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private targetLayer = svg('g', 'target-effects');
  private shotLayer = svg('g', 'projectile-effects');
  private impactLayer = svg('g', 'impact-effects');

  constructor(private layer: SVGSVGElement) {
    layer.append(this.targetLayer, this.shotLayer, this.impactLayer);
  }

  reset(): void {
    this.shots.clear();
    this.impacts.clear();
    this.aims.clear();
    this.lastEventId = 0;
    this.targetLayer.replaceChildren();
    this.shotLayer.replaceChildren();
    this.impactLayer.replaceChildren();
  }

  render(state: BattleState, selectedId: string): void {
    this.layer.dataset.reducedMotion = String(this.motion.matches);
    this.renderTargets(state, selectedId);
    this.renderProjectiles(state);
    this.renderImpacts(state);
  }

  private renderTargets(state: BattleState, selectedId: string): void {
    const active = new Set<string>();
    for (const unit of state.units) {
      const target = targetOf(state, unit);
      if (unit.hp <= 0 || !target) continue;
      active.add(unit.id);
      let path = this.aims.get(unit.id);
      if (!path) {
        path = svg('path', 'target-line');
        this.aims.set(unit.id, path);
        this.targetLayer.append(path);
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

  private renderProjectiles(state: BattleState): void {
    const active = new Set<number>();
    for (const shot of state.projectiles) {
      active.add(shot.id);
      let group = this.shots.get(shot.id);
      if (!group) {
        group = this.createProjectile(shot);
        this.shots.set(shot.id, group);
        this.shotLayer.append(group);
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

  private renderImpacts(state: BattleState): void {
    for (const event of state.events) {
      if (event.id <= this.lastEventId || !DAMAGE_KINDS.has(event.kind) || state.elapsed - event.time > IMPACT_DURATION) continue;
      const target = state.units.find((unit) => unit.id === event.targetId);
      if (target) this.createImpact(event, target, state);
    }
    this.lastEventId = state.events.at(-1)?.id ?? this.lastEventId;
    for (const [id, impact] of this.impacts) {
      const progress = clamp((state.elapsed - impact.time) / IMPACT_DURATION);
      if (progress >= 1) { impact.element.remove(); this.impacts.delete(id); continue; }
      const burstProgress = clamp((state.elapsed - impact.time) / .45);
      const scale = this.motion.matches ? 1 : .55 + burstProgress * 1.15;
      impact.burst.setAttribute('transform', `rotate(${impact.angle}) scale(${scale.toFixed(3)})`);
      impact.burst.setAttribute('opacity', String(Math.max(0, 1 - burstProgress)));
      impact.number.setAttribute('y', String(this.motion.matches ? -35 : -20 - progress * 48));
      impact.number.setAttribute('opacity', String(progress < .65 ? 1 : (1 - progress) / .35));
      impact.element.dataset.progress = progress.toFixed(4);
    }
  }

  private createImpact(event: BattleEvent, target: Unit, state: BattleState): void {
    const position = center(target);
    const source = state.units.find((unit) => unit.id === event.sourceId);
    const origin = source ? center(source) : position;
    const healing = event.kind === 'cheat';
    const melee = source?.role === 'guard' && !healing;
    const kind = healing ? 'heal' : melee ? 'slash' : event.kind === 'cast' ? 'fire' : source?.role === 'mage' ? 'arcane' : 'arrow';
    const group = svg('g', `impact-effect ${kind}`);
    group.dataset.testid = `impact-${event.id}`;
    group.dataset.kind = kind;
    group.dataset.target = target.id;
    group.dataset.source = source?.id ?? '';
    group.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`);
    const burst = svg('g', 'impact-burst');
    if (healing) {
      burst.innerHTML = '<circle class="healing-ring" r="29"/><path class="healing-cross" d="M-10 0h20M0-10v20"/>';
    } else if (melee) {
      burst.innerHTML = '<path class="slash-shadow" d="M-32-39Q53-14 29 38"/><path class="slash-core" d="M-32-39Q53-14 29 38"/><path class="hit-sparks" d="m-17-20-13-16M15-21l12-16M25 5l19 2M15 23l12 15"/>';
    } else {
      burst.innerHTML = '<circle class="impact-ring" r="25"/><path class="hit-sparks" d="M0-17v-20M12-12l14-14M17 0h20M12 12l14 14M0 17v20M-12 12l-14 14M-17 0h-20M-12-12l-14-14"/><circle class="impact-core" r="12"/>';
    }
    const number = svg('text', `damage-number${healing ? ' healing' : ''}`);
    number.dataset.amount = String(event.amount ?? 0);
    number.setAttribute('text-anchor', 'middle');
    number.setAttribute('x', String((event.id % 3 - 1) * 12));
    number.textContent = `${healing ? '+' : '−'}${event.amount ?? 0}`;
    group.append(burst, number);
    this.impactLayer.append(group);
    this.impacts.set(event.id, { element: group, burst, number, time: event.time, x: position.x, y: position.y,
      angle: Math.atan2(position.y - origin.y, position.x - origin.x) * 180 / Math.PI });
  }
}
