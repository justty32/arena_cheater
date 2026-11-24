import { CARDS } from './shared/card-catalog';
import type { CardTarget } from './items/engine-items';
import type { ArenaContext } from './arena-session';

export function createArenaInput(context: Pick<ArenaContext, 'session' | 'el' | 'canvas' | 'view' | 'currentCard' | 'attemptPlay' | 'render' | 'clearSelection' | 'select'>) {
  const { session, el, canvas, view, currentCard, attemptPlay, render, clearSelection, select } = context;
  function cast(clientX: number, clientY: number, touch = false): void {
    const card = currentCard();
    const fighter = view.pick(clientX, clientY, session.state, card?.target === 'fighter');
    if (!card || card.target === 'self' || session.exchanging || session.state.pendingDeliberation) { if (fighter) session.selectedId = fighter.id; render(); return; }
    if (!touch || (card.target !== 'ground' && card.target !== 'trap')) updateAim(clientX, clientY);
    const target: CardTarget = card.target === 'fighter' ? (fighter ? { fighterId: fighter.id } : {}) : view.point(clientX, clientY);
    attemptPlay(target);
    render();
  }
  function updateAim(clientX: number, clientY: number): boolean {
    if (session.state.status === 'finished') return false;
    const rect = canvas.getBoundingClientRect();
    const next = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom ? view.point(clientX, clientY) : undefined;
    const changed = session.aim?.x !== next?.x || session.aim?.y !== next?.y;
    session.aim = next;
    return changed;
  }
  function hasAimPreview(): boolean {
    const card = currentCard();
    return !session.exchanging && (card?.target === 'area' || card?.target === 'ground' || card?.target === 'trap');
  }
  function clearPointerAim(): void {
    if (session.aim && hasAimPreview()) session.aimChanged = true;
    session.aim = undefined;
  }
  function bindCanvas(): void {
    canvas.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.pointerType !== 'touch' || !hasAimPreview()) return;
      updateAim(event.clientX, event.clientY); render();
  }, {passive:true});
  canvas.addEventListener('pointermove', (event) => {
    if (event.isPrimary && hasAimPreview() && updateAim(event.clientX, event.clientY)) session.aimChanged = true;
  }, {passive:true});
  canvas.addEventListener('pointerup', (event) => {
    const target = currentCard()?.target;
    if (event.isPrimary && event.pointerType === 'touch' && (target === 'ground' || target === 'trap')) clearPointerAim();
  }, {passive:true});
  canvas.addEventListener('pointercancel', (event) => {
    if (event.isPrimary) clearPointerAim();
  }, {passive:true});
  canvas.addEventListener('pointerleave', (event) => {
    if (event.isPrimary) clearPointerAim();
  }, {passive:true});
  canvas.addEventListener('click', (event) => cast(event.clientX, event.clientY, event instanceof PointerEvent && event.pointerType === 'touch'));
  }
  function bindCard(button: HTMLButtonElement, handId: number): void {
    const selfCard = CARDS.some(card => card.id === button.dataset.card && card.target === 'self');
    let dragStart: { x: number; y: number; pointerId: number } | undefined;
    let moved = false;
    let suppressClick = false;
    function stopDrag(cancelled: boolean): void {
      if (cancelled && dragStart) suppressClick = true;
      dragStart = undefined; moved = false;
      button.classList.remove('is-dragging');
      el('[data-drag-label]').hidden = true;
      if (session.cancelCardDrag === cancelThisDrag) session.cancelCardDrag = undefined;
      // Keep capture until pointerup: the cancelled gesture's click belongs to this button.
    }
    function cancelThisDrag(): void { stopDrag(true); }
    button.addEventListener('click', (event) => {
      if (event.detail > 0 && suppressClick) { suppressClick = false; return; }
      select(handId);
    });
    button.addEventListener('pointerdown', (event) => {
      if (session.state.status === 'finished' || session.state.pendingDeliberation) return;
      // Touch cards scroll natively; taps select a card and the next target casts it.
      if (event.pointerType === 'touch') { suppressClick = false; return; }
      if (event.button !== 0 || session.exchanging || selfCard) return;
      session.cancelCardDrag?.();
      dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      moved = false; suppressClick = false; session.cancelCardDrag = cancelThisDrag;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', (event) => {
      if (!dragStart || dragStart.pointerId !== event.pointerId || session.exchanging) return;
      if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 9) {
        moved = true; session.activeHandId = handId;
        updateAim(event.clientX, event.clientY);
        button.classList.add('is-dragging');
        el('[data-drag-label]').hidden = false;
        el('[data-drag-label]').textContent = currentCard()?.name ?? '';
        el('[data-drag-label]').style.transform = `translate(${event.clientX + 12}px, ${event.clientY - 28}px)`;
        render();
      }
    });
    button.addEventListener('pointerup', (event) => {
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      const wasMoved = moved;
      stopDrag(false);
      if (!wasMoved) return;
      suppressClick = true;
      const rect = canvas.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) cast(event.clientX, event.clientY);
      else { clearSelection(); session.feedback = '投送已取消，沒有消耗資源。'; render(); }
    });
    const cancelPointer = (event: PointerEvent): void => {
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      clearSelection(); render();
    };
    button.addEventListener('pointercancel', cancelPointer);
    button.addEventListener('lostpointercapture', cancelPointer);
  }
  function bindKeyboard(): void {
    document.addEventListener('keydown', (event) => {
      if (session.state.status === 'finished' || session.state.pendingDeliberation) return;
      if (event.key === 'Escape') { clearSelection(); session.feedback = '已取消，沒有消耗資源。'; render(); }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
      const index = Number(event.key) - 1;
      if (/^[1-3]$/.test(event.key) && session.state.hand[index]) { event.preventDefault(); select(session.state.hand[index].id); }
  });
  }
  return { bindCard, bindCanvas, bindKeyboard };
}
