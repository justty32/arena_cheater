import { advanceArena, keepDeliberationPaused, toggleArena } from './engine';
import type { ArenaContext } from './arena-session';

export function startArenaLoop(context: Pick<ArenaContext, 'session' | 'canvas' | 'render' | 'clearSelection' | 'pixelRatio'>): void {
  const { session, canvas, render, clearSelection, pixelRatio } = context;
  document.addEventListener('visibilitychange', () => {
    session.lastFrame = performance.now();
    if (document.hidden && session.state.pendingDeliberation) {
      keepDeliberationPaused(session.state);
      render();
    }
    if (document.hidden && session.state.status === 'running') { toggleArena(session.state); session.feedback = '離開頁面時已自動暫停。'; render(); }
  });
  new ResizeObserver(() => {
    session.canvasSizeChanged = true;
    // The previous pointer position was projected using the old canvas dimensions.
    session.aim = undefined;
    render();
  }).observe(canvas);
  session.lastFrame = performance.now();
  function frame(now: number): void {
    const elapsed = Math.max(0, Math.min((now - session.lastFrame) / 1000, 0.1));
    session.lastFrame = now;
    const previousStatus = session.state.status;
    advanceArena(session.state, elapsed);
    if (previousStatus !== 'finished' && session.state.status === 'finished') {
      clearSelection();
      session.feedback = '本場已結束。查看戰果，或準備下一場。';
    }
    if (previousStatus === 'running' || session.aimChanged || pixelRatio() !== session.renderedPixelRatio) render();
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
}
