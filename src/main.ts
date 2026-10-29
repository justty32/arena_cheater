import { advanceBattle, createBattle, toggleBattle, useCheat } from './game/engine';
import type { BattleMode, Speed } from './game/model';
import { BoardView } from './ui/board';
import { mountLayout } from './ui/layout';
import { InterfaceView } from './ui/render';
import { EffectsView } from './ui/effects';
import './ui/base.css';
import './ui/board.css';
import './ui/effects.css';

const root = document.getElementById('app');
if (!root) throw new Error('找不到應用程式入口。');
mountLayout(root);

let seed = 73021;
let state = createBattle('duel', seed);
let selectedId = state.units[0]?.id ?? '';
const interfaceView = new InterfaceView();
const effects = new EffectsView(document.getElementById('battle-effects') as unknown as SVGSVGElement);
const board = new BoardView(document.getElementById('pieces')!, (id) => {
  selectedId = id;
  render();
});

function render(): void {
  board.render(state, selectedId);
  effects.render(state, selectedId);
  interfaceView.render(state, selectedId);
}

function reset(mode: BattleMode = state.mode): void {
  const speed = state.speed;
  state = createBattle(mode, ++seed);
  state.speed = speed;
  selectedId = state.units.find((unit) => unit.team === 0)?.id ?? '';
  board.reset(state.units);
  effects.reset();
  interfaceView.reset(state);
  render();
}

board.reset(state.units);
interfaceView.reset(state);
render();

document.getElementById('start-button')!.addEventListener('click', () => {
  if (state.status === 'finished') reset();
  toggleBattle(state);
  render();
});
document.getElementById('reset-button')!.addEventListener('click', () => reset());
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode as BattleMode;
    if (mode !== state.mode) reset(mode);
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    state.speed = Number(button.dataset.speed) as Speed;
    render();
  });
});
document.getElementById('cheat-button')!.addEventListener('click', () => {
  const target = state.units.find((unit) => unit.id === selectedId);
  if (useCheat(state, selectedId)) {
    document.getElementById('cheat-feedback')!.textContent = `藥劑已送達${target?.name ?? '友軍'}。生命與耐力恢復。`;
  }
  render();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running') {
    toggleBattle(state);
    render();
  }
});

let lastFrame = performance.now();
function frame(now: number): void {
  const elapsed = Math.max(0, Math.min((now - lastFrame) / 1000, 0.1));
  lastFrame = now;
  if (state.status === 'running') {
    advanceBattle(state, elapsed);
    render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
