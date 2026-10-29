import { ROLE_NAMES, TEAM_NAMES } from '../game/model';
import type { BattleState, Unit } from '../game/model';
import { icon } from './icons';
import { actionLabel, targetOf, unitPosition } from './presentation';

export const TEAM_COLORS = ['#82bd9b', '#d88e78', '#83b8d3', '#b19acc'];

interface PieceElements {
  button: HTMLButtonElement;
  hp: HTMLElement;
  mana: HTMLElement;
  stamina: HTMLElement;
  action: HTMLElement;
}

export class BoardView {
  private pieces = new Map<string, PieceElements>();

  constructor(private container: HTMLElement, private onSelect: (id: string) => void) {}

  reset(units: Unit[]): void {
    this.container.replaceChildren();
    this.pieces.clear();
    for (const unit of units) {
      const button = document.createElement('button');
      button.className = 'unit-piece';
      button.dataset.testid = `unit-${unit.id}`;
      button.dataset.team = String(unit.team);
      button.style.setProperty('--team-color', TEAM_COLORS[unit.team]);
      button.innerHTML = `<span class="piece-body">${icon(unit.role)}<span class="piece-role">${ROLE_NAMES[unit.role]}</span></span><span class="piece-bars"><span class="piece-bar hp"><i></i></span><span class="piece-bar mana"><i></i></span><span class="piece-bar stamina"><i></i></span></span><span class="piece-action"></span>`;
      button.addEventListener('click', () => this.onSelect(unit.id));
      this.container.append(button);
      this.pieces.set(unit.id, {
        button,
        hp: button.querySelector('.hp i')!,
        mana: button.querySelector('.mana i')!,
        stamina: button.querySelector('.stamina i')!,
        action: button.querySelector('.piece-action')!,
      });
    }
  }

  render(state: BattleState, selectedId: string): void {
    const selected = state.units.find((unit) => unit.id === selectedId);
    const selectedTarget = selected ? targetOf(state, selected)?.id : undefined;
    for (const unit of state.units) {
      const piece = this.pieces.get(unit.id);
      if (!piece) continue;
      const action = unit.action;
      const progress = action.duration > 0 ? Math.max(0, Math.min(1, 1 - action.remaining / action.duration)) : 1;
      const { x, y } = unitPosition(unit);
      piece.button.style.left = `${x * 12.5}%`;
      piece.button.style.top = `${y * 12.5}%`;
      piece.button.style.setProperty('--action-progress', `${progress * 100}%`);
      piece.button.classList.toggle('selected', selectedId === unit.id);
      piece.button.classList.toggle('targeted', selectedTarget === unit.id);
      piece.button.dataset.action = action.kind;
      piece.button.dataset.target = targetOf(state, unit)?.id ?? '';
      const hitRemaining = Math.max(0, unit.hitUntil - state.elapsed);
      const shake = hitRemaining > 0 ? Math.sin((.35 - hitRemaining) * 65) * hitRemaining / .35 * 3 : 0;
      piece.button.style.setProperty('--impact-x', `${shake.toFixed(2)}px`);
      piece.button.style.setProperty('--impact-y', `${(-shake * .4).toFixed(2)}px`);
      piece.button.classList.toggle('hit', unit.hitUntil > state.elapsed);
      piece.button.classList.toggle('casting', action.kind === 'cast');
      piece.button.classList.toggle('winding', action.kind === 'attack' || action.kind === 'power');
      piece.button.classList.toggle('fallen', unit.hp <= 0);
      piece.button.setAttribute('aria-pressed', String(selectedId === unit.id));
      piece.button.dataset.hp = unit.hp.toFixed(2);
      piece.button.dataset.maxHp = String(unit.maxHp);
      piece.button.disabled = unit.hp <= 0;
      const label = `${TEAM_NAMES[unit.team]} ${ROLE_NAMES[unit.role]}，生命 ${Math.ceil(unit.hp)} / ${unit.maxHp}，魔力 ${Math.floor(unit.mana)}，耐力 ${Math.floor(unit.stamina)}`;
      piece.button.setAttribute('aria-label', label);
      piece.button.title = label;
      piece.hp.style.width = `${unit.hp / unit.maxHp * 100}%`;
      piece.mana.style.width = `${unit.maxMana ? unit.mana / unit.maxMana * 100 : 0}%`;
      piece.stamina.style.width = `${unit.stamina / unit.maxStamina * 100}%`;
      piece.action.textContent = state.status === 'ready' || unit.hp <= 0 ? '' : actionLabel(unit, state);
    }
  }
}
