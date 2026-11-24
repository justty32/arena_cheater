import { hasPendingDungTick } from './shared/status';
import type { ArenaState, Fighter } from './shared/types';

const poseLabels = { idle: '伺機而動', walk: '尋找對手', attack: '發起攻擊', hit: '受到攻擊', fallen: '倒地', airborne: '遭到擊飛', rising: '正在起身', block: '盾牌格擋', parry: '成功招架', dead: '已出局' };
const weaponLabels = { fists: '徒手', sword: '直劍（單手）', spear: '長矛（單手）', hatchet: '短斧（單手）', club: '木棍（雙手）', shield: '圓盾（單手）', bow: '長弓（雙手）' };

function fighterTrait(fighter: Fighter): string {
  switch (fighter.species) {
    case 'wolf': return '獵殺狂熱：擊殺後提升攻擊力。';
    case 'deer': return `迅捷：移動速度較高（${fighter.speed.toFixed(2)} m/s）。`;
    case 'elephant': return '持木棍近戰時，傷害提高 20%。';
    case 'bear': return `生命較高（生命上限 ${fighter.maxHp}）。`;
    case 'bull': return `體力較高（基礎體力上限 ${fighter.baseMaxStamina}）。`;
    default: return '';
  }
}

export function createFighterDetails(el: <T extends HTMLElement = HTMLElement>(selector: string) => T, support: HTMLButtonElement, getState: () => ArenaState) {
  function renderDetails(f: Fighter): void {
    el('[data-detail-name]').textContent = f.name;
    el('[data-detail-summary]').textContent = f.name;
    el('[data-detail-pose]').textContent = poseLabels[f.pose];
    el('[data-detail-hp]').textContent = `${Math.max(0, Math.ceil(f.hp))} / ${f.maxHp}`;
    el('[data-detail-stamina]').textContent = `${Math.floor(f.stamina)} / ${f.maxStamina}`;
    el('[data-detail-health-bar]').style.width = `${Math.max(0, f.hp / f.maxHp * 100)}%`;
    el('[data-detail-stamina-bar]').style.width = `${f.stamina / f.maxStamina * 100}%`;
    el('[data-detail-weapon]').textContent = `${weaponLabels[f.weapon]}${f.shield ? ' ＋ 圓盾（單手）' : ''}`;
    el('[data-testid="arena-ammo"]').textContent = f.weapon === 'bow' ? String(f.ammo) : '—';
    el('[data-testid="arena-durability"]').textContent = f.weapon === 'club' ? String(f.durability) : '—';
    el('[data-detail-defense]').textContent = f.shield ? '正面格擋 · 短窗招架' : '無盾牌';
    const statusEffects = f.hp > 0 ? f.buffs.map((b) => `${({ bloodlust: '殺紅眼', fury: '狂熱', haste: '興奮', weakness: '虛弱' }[b.kind])} ${Math.max(0, b.until - getState().time).toFixed(1)}秒`) : [];
    if (f.dungDamage && hasPendingDungTick(f)) {
      statusEffects.push(`持續傷害（每秒 1 點） ${Math.max(0, f.dungDamage.until - getState().time).toFixed(1)}秒`);
    }
    if (f.hp > 0 && f.rootedUntil !== undefined && getState().time < f.rootedUntil) {
      statusEffects.push(`定身（仍可攻防） ${(f.rootedUntil - getState().time).toFixed(1)}秒`);
    }
    const statusText = statusEffects.join(' · ') || '無附加狀態';
    const detailEffects = el('[data-detail-buffs]');
    if (detailEffects.textContent !== statusText) detailEffects.textContent = statusText;
    const trait = el('[data-testid="arena-trait"]');
    const traitText = fighterTrait(f);
    trait.hidden = !traitText;
    trait.textContent = traitText;
    support.textContent = getState().supportedId === f.id ? '◆ 你支持的鬥士' : '支持這位鬥士';
    support.disabled = getState().status !== 'ready' || getState().supportedId === f.id;
    support.style.setProperty('--fighter-color', f.color);
  }

  return renderDetails;
}
