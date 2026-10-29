import type { BattleEvent, BattleState, Unit } from '../../game/model';
import { center, clamp, svg } from './svg';

const DAMAGE_KINDS = new Set(['attack', 'cast', 'power', 'cheat']);
const IMPACT_DURATION = 1.05;

interface Impact {
  element: SVGGElement;
  burst: SVGGElement;
  number: SVGTextElement;
  time: number;
  x: number;
  y: number;
  angle: number;
}

export class ImpactsView {
  readonly layer = svg('g', 'impact-effects');
  private impacts = new Map<number, Impact>();
  private lastEventId = 0;

  constructor(private motion: MediaQueryList) {}

  reset(): void {
    this.impacts.clear();
    this.lastEventId = 0;
    this.layer.replaceChildren();
  }

  render(state: BattleState): void {
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
    this.layer.append(group);
    this.impacts.set(event.id, { element: group, burst, number, time: event.time, x: position.x, y: position.y,
      angle: Math.atan2(position.y - origin.y, position.x - origin.x) * 180 / Math.PI });
  }
}
