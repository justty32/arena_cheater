import type { BattleState } from '../game/model';
import { ImpactsView } from './effects/impacts';
import { ProjectilesView } from './effects/projectiles';
import { TargetsView } from './effects/targets';

export class EffectsView {
  private motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private targets = new TargetsView();
  private projectiles = new ProjectilesView(this.motion);
  private impacts = new ImpactsView(this.motion);

  constructor(private layer: SVGSVGElement) {
    layer.append(this.targets.layer, this.projectiles.layer, this.impacts.layer);
  }

  reset(): void {
    this.targets.reset();
    this.projectiles.reset();
    this.impacts.reset();
  }

  render(state: BattleState, selectedId: string): void {
    this.layer.dataset.reducedMotion = String(this.motion.matches);
    this.targets.render(state, selectedId);
    this.projectiles.render(state);
    this.impacts.render(state);
  }
}
