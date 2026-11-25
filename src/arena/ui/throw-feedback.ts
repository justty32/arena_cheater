import { formatHp } from '../shared/format';
import { CARDS } from '../shared/card-catalog';
import { THROW_PROFILES } from '../shared/rules';
import type { ArenaState } from '../shared/types';

/** Display only the tracked throw; never infer outcomes from translated battle logs. */
export function createThrowFeedback(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>('[data-testid="arena-recent-throw"]')!;
  const text = panel.querySelector('[data-throw-result]')!;
  return (state: ArenaState): void => {
    const result = state.latestThrow;
    panel.hidden = !result;
    panel.dataset.itemId = result ? String(result.itemId) : '';
    panel.dataset.itemKind = result?.itemKind ?? '';
    panel.dataset.pickerId = result?.pickup?.fighterId ?? '';
    if (!result) { panel.dataset.phase = ''; text.textContent = ''; return; }
    const name = CARDS.find(card => card.id === result.itemKind)?.name ?? '投擲物';
    const fighterName = (id: string): string => state.fighters.find(fighter => fighter.id === id)?.name ?? '鬥士';
    const disposable = THROW_PROFILES[result.itemKind].disposable;
    const { impact, pickup } = result;
    let phase: string;
    let outcome: string;
    if (!impact) {
      phase = state.status === 'paused' ? 'paused' : 'flying';
      outcome = phase === 'paused' ? '暫停在途，續戰後繼續' : '飛行中';
    } else if (impact.reason === 'fighter') {
      phase = 'hit';
      const damage = impact.damage > 0 ? `傷害 ${formatHp(impact.damage)}` : '未造成傷害';
      const initial = result.itemKind === 'dung' ? '初撞' : '';
      outcome = `命中${fighterName(impact.fighterId)}，${initial}${damage}`;
      if (impact.dungApplied) outcome += '；施加虛弱 5 秒、每秒 1 點持傷';
    } else if (impact.reason === 'item') {
      phase = 'collision';
      outcome = disposable ? `互撞後${result.itemKind === 'pot' ? '碎裂' : '消耗'}，未命中鬥士` : '互撞落地，等待拾取';
    } else {
      phase = disposable ? 'consumed' : 'landed';
      outcome = disposable ? `未命中鬥士，${result.itemKind === 'pot' ? '已碎裂' : '已消耗'}` : '已落地，等待拾取';
    }
    if (pickup) {
      phase = 'picked-up';
      const picked = `${fighterName(pickup.fighterId)}拾取`;
      outcome = impact?.reason === 'fighter' ? `${outcome}；${picked}` : impact?.reason === 'item' ? `互撞落地；${picked}` : picked;
    } else if (impact?.reason === 'fighter' && !disposable) outcome += '；等待拾取';
    panel.dataset.phase = phase;
    const nextText = `${name} · ${outcome}`;
    if (text.textContent !== nextText) text.textContent = nextText;
  };
}
