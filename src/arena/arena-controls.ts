import { createArena, toggleArena } from './engine';
import type { ArenaContext } from './arena-session';

export function createArenaControls(context: Pick<ArenaContext, 'session' | 'root' | 'el' | 'start' | 'rows' | 'support' | 'supportChange' | 'mobilePanels' | 'currentCard' | 'canCastFromRoster' | 'attemptPlay' | 'handView' | 'render' | 'clearSelection'>) {
  const { session, root, el, start, rows, support, supportChange, mobilePanels, currentCard, canCastFromRoster, attemptPlay, handView, render, clearSelection } = context;
  type StartIntent = { arena: typeof session.state; phase: typeof session.state.status };
  let startPointer: (StartIntent & { pointerId: number }) | undefined;
  let startSpace: StartIntent | undefined;
  const sameStartIntent = (intent: StartIntent): boolean => intent.arena === session.state && intent.phase === session.state.status;
  const clearStartIntent = (): void => { startPointer = undefined; startSpace = undefined; };

  function reset(retry = false): void {
    clearStartIntent();
    clearResultIntent();
    session.returnAfterSupport = false;
    const { seed, speed, supportedId } = session.state;
    session.state = createArena(retry ? seed : 73021 + session.round++);
    session.state.speed = speed;
    if (retry) session.state.supportedId = supportedId;
    session.selectedId = session.state.supportedId;
    session.lastFrame = performance.now();
    clearSelection();
    // IDs restart with each round, so reset keyed nodes at this explicit lifecycle boundary.
    handView.reset();
    session.feedback = retry ? '鬥士已重新入場。可調整支持對象，再開始本場。' : '新一場鬥士已入場。選擇你的支持對象。';
    render();
  }
  document.addEventListener('pointerdown', clearStartIntent, true);
  start.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) startPointer = {pointerId:event.pointerId,arena:session.state,phase:session.state.status};
  });
  document.addEventListener('pointerup', (event) => {
    if (!start.contains(event.target as Node)) startPointer = undefined;
  });
  document.addEventListener('pointercancel', clearStartIntent);
  window.addEventListener('blur', clearStartIntent);
  start.addEventListener('keydown', (event) => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      return;
    }
    if (event.key === ' ') startSpace = {arena:session.state,phase:session.state.status};
    if (event.key === 'Escape') clearStartIntent();
  });
  start.addEventListener('keyup', (event) => {
    if (event.key === ' ' && (!startSpace || !sameStartIntent(startSpace))) {
      event.preventDefault(); startSpace = undefined;
    }
  });
  start.addEventListener('blur', () => { startSpace = undefined; });
  start.addEventListener('click', (event) => {
    const intent = event.detail === 0 ? startSpace : startPointer;
    const valid = event.detail === 0
      ? !intent || sameStartIntent(intent)
      : event instanceof PointerEvent && startPointer?.pointerId === event.pointerId && sameStartIntent(startPointer);
    clearStartIntent();
    if (!valid || session.state.pendingDeliberation) return;
    session.returnAfterSupport = false;
    if (session.state.status === 'finished') reset();
    toggleArena(session.state);
    if (session.state.status === 'running') session.lastFrame = performance.now();
    session.feedback = session.state.status === 'running' ? '戰鬥開始。點牌再點目標；滑鼠也可拖牌進場。' : '戰鬥已暫停，仍可出牌；效果倒數、換石冷卻與動畫保持停止。';
    render();
  });
  el('[data-testid="arena-reset"]').addEventListener('click', () => reset());

  type ResultIntent = StartIntent & { button: HTMLButtonElement };
  let resultPointer: (ResultIntent & { pointerId: number }) | undefined;
  let resultKey: ResultIntent | undefined;
  function clearResultIntent(): void {
    resultPointer = undefined;
    resultKey = undefined;
  }
  document.addEventListener('pointerdown', clearResultIntent, true);
  document.addEventListener('pointerup', (event) => {
    if (resultPointer?.pointerId === event.pointerId && !resultPointer.button.contains(event.target as Node)) resultPointer = undefined;
  });
  document.addEventListener('pointercancel', clearResultIntent);
  window.addEventListener('blur', clearResultIntent);

  function bindResultAction(button: HTMLButtonElement, retry: boolean): void {
    const canActivate = (): boolean => !retry || session.state.status === 'finished';
    button.addEventListener('pointerdown', (event) => {
      if (event.isPrimary && event.button === 0 && canActivate()) {
        resultPointer = { pointerId: event.pointerId, button, arena: session.state, phase: session.state.status };
      }
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') clearResultIntent();
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.repeat || !canActivate()) {
        event.preventDefault();
        return;
      }
      resultKey = { button, arena: session.state, phase: session.state.status };
    });
    button.addEventListener('keyup', (event) => {
      if (event.key === ' ' && (!resultKey || resultKey.button !== button || !sameStartIntent(resultKey))) {
        event.preventDefault();
        resultKey = undefined;
      }
    });
    button.addEventListener('blur', () => {
      if (resultKey?.button === button) resultKey = undefined;
    });
    button.addEventListener('click', (event) => {
      // A newly appearing result panel must not turn an in-progress cast into a reset.
      const intent = event.detail === 0 ? resultKey ?? resultPointer : resultPointer;
      const validIntent = !intent || (intent.button === button && sameStartIntent(intent));
      const validPointer = event.detail === 0 || (event instanceof PointerEvent && resultPointer?.pointerId === event.pointerId);
      clearResultIntent();
      if (!canActivate() || !validIntent || !validPointer) return;
      reset(retry);
      if (retry) start.focus({ preventScroll: true });
    });
  }
  bindResultAction(el('[data-result-reset]'), false);
  bindResultAction(el('[data-result-retry]'), true);
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
    button.addEventListener('click', () => {
      session.state.speed = Number(button.dataset.speed);
      root.querySelectorAll('[data-speed]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      render();
    });
  });
  rows.forEach((row) => row.addEventListener('click', () => {
    session.selectedId = row.dataset.fighter!;
    if (canCastFromRoster(currentCard())) attemptPlay({ fighterId: session.selectedId });
    render();
  }));
  supportChange.addEventListener('click', () => {
    if (session.state.status !== 'ready') return;
    session.returnAfterSupport = true;
    mobilePanels.open('fighters'); mobilePanels.open('detail');
    el('[data-mobile-panel="fighters"]').scrollIntoView({block:'start'});
    rows.find(row => row.dataset.fighter === session.selectedId)?.focus({preventScroll:true});
  });
  support.addEventListener('click', () => {
    if (session.state.status !== 'ready' || session.state.supportedId === session.selectedId) return;
    session.state.supportedId = session.selectedId;
    session.feedback = `你選擇支持${session.state.fighters.find((f) => f.id === session.selectedId)?.name}。準備好就開戰。`;
    const returnToStage = session.returnAfterSupport;
    session.returnAfterSupport = false;
    render();
    if (returnToStage) {
      el('.arena-stage').scrollIntoView({block:'start'});
      start.focus({preventScroll:true});
    }
  });
  return { clearStartIntent };
}
