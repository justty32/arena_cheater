import { CHEAT_COST } from '../game/rules';
import { ROLE_NAMES, TEAM_NAMES } from '../game/model';
import type { BattleState, Unit } from '../game/model';
import { TEAM_COLORS } from './board';
import { icon } from './icons';
import { actionLabel, targetLabel, targetOf } from './presentation';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function cheatHint(state: BattleState, unit: Unit | undefined): string {
  if (state.status === 'finished') return '戰鬥已結束，下一場再找機會。';
  if (state.status !== 'running') return '開戰後，選擇受傷的翠綠旗友軍。';
  if (!unit || unit.team !== 0) return '先選擇一名翠綠旗友軍。';
  if (unit.hp <= 0) return '這名鬥士已倒下，請選擇其他友軍。';
  if (unit.hp >= unit.maxHp) return '這名鬥士生命全滿，先等待出手機會。';
  if (state.influence < CHEAT_COST) return '影響力不足，等待它慢慢恢復。';
  return '時機到了。遞送藥劑，幫他再撐一會。';
}

export class InterfaceView {
  private lastStatus = '';
  private lastLog = -1;
  private lastSelected = '';
  private teamCounts = '';

  reset(state: BattleState): void {
    this.lastStatus = '';
    this.lastLog = -1;
    this.lastSelected = '';
    this.teamCounts = '';
    $('team-list').innerHTML = Array.from({ length: state.mode === 'duel' ? 2 : 4 }, (_, team) => `<div class="team-row" style="--team-color:${TEAM_COLORS[team]}"><span class="team-banner">${['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][team]}</span><div><strong>${TEAM_NAMES[team]}</strong><small>${team === 0 ? '你的隊伍' : '對手隊伍'}</small></div><span id="team-count-${team}" class="team-count">3 <small>/ 3</small></span></div>`).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    $('cheat-feedback').textContent = '';
  }

  render(state: BattleState, selectedId: string): void {
    const unit = state.units.find((candidate) => candidate.id === selectedId);
    $('battle-time').textContent = formatTime(state.elapsed);
    $('battle-time').dataset.seconds = state.elapsed.toFixed(2);
    const statusKey = `${state.status}:${state.winner}`;
    if (this.lastStatus !== statusKey) {
      this.lastStatus = statusKey;
      const statusText = { ready: '等待開戰', running: '戰鬥進行中', paused: '戰鬥已暫停', finished: '戰鬥結束' };
      $('battle-status').textContent = statusText[state.status];
      $('battle-status').dataset.status = state.status;
      $('status-light').className = state.status;
      const buttonText = { ready: '開始戰鬥', running: '暫停戰鬥', paused: '繼續戰鬥', finished: '再戰一場' };
      $('start-button').innerHTML = `${icon(state.status === 'running' ? 'pause' : 'play')}<span>${buttonText[state.status]}</span>`;
      $('battle-result').hidden = state.status !== 'finished';
      if (state.status === 'finished') {
        $('result-title').textContent = state.winner === null ? '本場平局' : `${TEAM_NAMES[state.winner]}獲勝`;
        $('result-summary').textContent = `交戰 ${formatTime(state.elapsed)} · 暗中介入 ${state.cheatCount} 次`;
      }
    }
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === state.speed)));
    this.renderTeams(state);
    if (unit) this.renderUnit(unit, state);
    const canCheat = state.status === 'running' && unit?.team === 0 && unit.hp > 0 && unit.hp < unit.maxHp && state.influence >= CHEAT_COST;
    $<HTMLButtonElement>('cheat-button').disabled = !canCheat;
    $('cheat-hint').textContent = cheatHint(state, unit);
    $('influence-value').textContent = `${Math.floor(state.influence)} / ${state.maxInfluence}`;
    $('influence-value').dataset.value = state.influence.toFixed(2);
    $('influence-bar').style.width = `${state.influence / state.maxInfluence * 100}%`;
    this.renderLog(state);
  }

  private renderUnit(unit: Unit, state: BattleState): void {
    if (this.lastSelected !== unit.id) {
      this.lastSelected = unit.id;
      $('unit-portrait').innerHTML = icon(unit.role);
      $('unit-portrait').style.setProperty('--team-color', TEAM_COLORS[unit.team]);
      $('unit-team').textContent = `${TEAM_NAMES[unit.team]}${unit.team === 0 ? ' · 友軍' : ' · 對手'}`;
      $('unit-name').textContent = ROLE_NAMES[unit.role];
      $('unit-attack').textContent = String(unit.attack);
      $('unit-armor').textContent = String(unit.armor);
      $('unit-range').textContent = `${unit.range} 格`;
    }
    $('unit-coordinate').textContent = `${'ABCDEFGH'[unit.x]}${8 - unit.y}`;
    const target = targetOf(state, unit);
    $('unit-action').textContent = actionLabel(unit, state);
    $('unit-target').textContent = target ? `目標：${targetLabel(target)}` : '';
    $('unit-target').dataset.target = target?.id ?? '';
    for (const [key, amount, max] of [['hp', unit.hp, unit.maxHp], ['mana', unit.mana, unit.maxMana], ['stamina', unit.stamina, unit.maxStamina]] as const) {
      $(`${key}-value`).textContent = `${Math.ceil(amount)} / ${max}`;
      $(`${key}-value`).dataset.value = amount.toFixed(2);
      $(`${key}-bar`).style.width = `${max ? amount / max * 100 : 0}%`;
    }
  }

  private renderTeams(state: BattleState): void {
    const counts = Array.from({ length: state.mode === 'duel' ? 2 : 4 }, (_, team) => state.units.filter((unit) => unit.team === team && unit.hp > 0).length);
    const key = counts.join(',');
    if (this.teamCounts === key) return;
    this.teamCounts = key;
    counts.forEach((count, team) => {
      $(`team-count-${team}`).innerHTML = `${count} <small>/ 3</small>`;
      $(`team-count-${team}`).parentElement?.classList.toggle('eliminated', count === 0);
    });
  }

  private renderLog(state: BattleState): void {
    const newest = state.events.at(-1)?.id ?? -1;
    if (this.lastLog === newest) return;
    this.lastLog = newest;
    const list = $('battle-log');
    list.replaceChildren();
    for (const event of state.events.slice(-5).reverse()) {
      const row = document.createElement('li');
      row.className = `log-event ${event.kind}`;
      const time = document.createElement('time');
      time.textContent = formatTime(event.time);
      const text = document.createElement('span');
      text.textContent = event.text;
      row.append(time, text);
      list.append(row);
    }
  }
}
