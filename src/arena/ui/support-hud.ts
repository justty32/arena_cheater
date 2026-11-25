import { formatHp } from '../shared/format';
import type { Fighter } from '../shared/types';

/** A persistent view of the supported fighter, independent of the inspected target. */
export function createSupportHud(root: HTMLElement) {
  const hud = root.querySelector<HTMLElement>('[data-testid="arena-support-hud"]')!;
  const name = hud.querySelector('[data-testid="arena-support-name"]')!;
  const hp = hud.querySelector('[data-testid="arena-support-hp"]')!;
  const status = hud.querySelector('[data-testid="arena-support-state"]')!;
  const reward = hud.querySelector<HTMLElement>('[data-support-reward]')!;
  const bar = hud.querySelector<HTMLElement>('[data-support-health]')!;
  const fill = bar.querySelector<HTMLElement>('i')!;
  const announcement = hud.querySelector('[data-support-announcement]')!;
  let previousId: string | undefined;
  let previousRewardStones = 0;
  let wasDead = false;
  return (fighter: Fighter | undefined, rewardStones: number): void => {
    const dead = Boolean(fighter && fighter.hp <= 0);
    const health = fighter ? Number(formatHp(fighter.hp)) : 0;
    hud.dataset.fighterId = fighter?.id ?? '';
    hud.dataset.state = fighter ? dead ? 'dead' : 'alive' : 'unset';
    name.textContent = fighter?.name ?? '尚未選擇';
    hp.textContent = fighter ? `${health} / ${formatHp(fighter.maxHp)}` : '—';
    status.textContent = dead ? '已陣亡' : '支持';
    bar.setAttribute('aria-valuemax', String(fighter?.maxHp ?? 0));
    bar.setAttribute('aria-valuenow', String(health));
    fill.style.width = `${fighter ? Math.max(0, fighter.hp / fighter.maxHp * 100) : 0}%`;
    if (rewardStones !== previousRewardStones) {
      reward.hidden = rewardStones === 0;
      reward.textContent = rewardStones > 0 ? `擊殺累計 +${rewardStones} 石` : '';
      previousRewardStones = rewardStones;
    }
    if (fighter?.id !== previousId || !dead) announcement.textContent = '';
    else if (!wasDead) announcement.textContent = `你支持的${fighter!.name}已陣亡。`;
    previousId = fighter?.id;
    wasDead = dead;
  };
}
