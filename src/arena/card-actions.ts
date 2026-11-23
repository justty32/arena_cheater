import { chooseDeliberation, findPayment, keepDeliberationPaused, paymentStatus, validateCardPlay, type CardTarget, playCard, redrawStones } from './engine';
import { areaSpellTargets } from './model';
import { cardPlayFailure, paymentProblem, selfPaymentAction } from './payment-ui';
import type { ArenaContext } from './arena-session';

export function createCardActions(context: Pick<ArenaContext, 'session' | 'el' | 'currentCard' | 'canAct' | 'mobilePanels' | 'render' | 'selfPay' | 'deliberationHeading' | 'handView' | 'clearStartIntent'>) {
  const { session, el, currentCard, canAct, mobilePanels, render, selfPay, deliberationHeading, handView, clearStartIntent } = context;
  function refreshPaymentFeedback(): void {
    const card = currentCard();
    if (!card) return;
    const status = paymentStatus(session.state, card.cost, [...session.paymentStones]);
    if (!status.valid && (card.target === 'ground' || card.target === 'trap')) session.aim = undefined;
    session.feedback = status.valid ? card.target === 'self' ? `支付用石已備妥，可${selfPaymentAction(card)}。` : card.target === 'trap' ? '支付用石已備妥，點場內地面布置。' : '支付用石已備妥，點目標施放。' : `${paymentProblem(status)}；請調整支付用石。`;
    el('[data-testid="arena-feedback"]').dataset.reason = '';
  }

  function clearSelection(): void {
    session.cancelCardDrag?.();
    el('[data-testid="arena-feedback"]').dataset.reason = '';
    session.activeHandId = undefined;
    session.aim = undefined;
    session.exchanging = false;
    session.exchangeStones.clear();
    session.paymentStones.clear(); session.paymentHandId = undefined;
    el('[data-drag-label]').hidden = true;
  }


  function select(handId: number): void {
    if (session.state.status === 'finished' || session.state.pendingDeliberation) return;
    el('[data-testid="arena-feedback"]').dataset.reason = '';
    session.activeHandId = session.activeHandId === handId ? undefined : handId;
    session.aim = undefined;
    const card = currentCard();
    if (card?.target === 'self' && !session.exchanging) mobilePanels.open('payment');
    const punctuation = card && !/[。！？.!?…]$/.test(card.description) ? '。' : '';
    session.feedback = card ? session.exchanging ? `將放棄${card.name}。請選擇要重抽的石頭。` : `${card.name}：${card.description}${punctuation}${canAct() ? '' : '開始戰鬥後施放。'}` : '已取消選牌。';
    render();
  }
  function attemptPlay(target: CardTarget): void {
    const card = currentCard();
    if (!card || card.target === 'self' || session.activeHandId === undefined || session.exchanging || session.state.pendingDeliberation) return;
    const payment = [...session.paymentStones];
    const validation = validateCardPlay(session.state, session.activeHandId, target, payment);
    el('[data-testid="arena-feedback"]').dataset.reason = validation.ok ? '' : validation.reason;
    if (!validation.ok) {
      session.feedback = cardPlayFailure(validation.reason, card, paymentStatus(session.state, card.cost, payment));
      return;
    }
    const affected = card.target === 'area' ? areaSpellTargets(session.state.fighters, card, { x: target.x!, y: target.y! }) : [];
    if (playCard(session.state, session.activeHandId, target, payment)) {
      if (card.target === 'trap') {
        session.feedback = `${card.name}已布置，0.6 遊戲秒後生效。已補兩顆魔法石與一張牌。`;
        clearSelection();
        return;
      }
      const targetName = target.fighterId ? session.state.fighters.find((f) => f.id === target.fighterId)?.name : undefined;
      session.feedback = `${card.name}${card.target === 'area' ? `已施放，命中 ${affected.length} 位鬥士${affected.some(f => f.id === session.state.supportedId) ? '，包含你支持的鬥士' : ''}` : targetName ? `已施放於${targetName}` : session.state.status === 'paused' ? '已排入投送，繼續戰鬥後飛向場內' : card.throwRange ? '已投出，沿途命中或落地後消耗，不會被拾取' : '已投出，任何鬥士都能拾取'}。已補兩顆魔法石與一張牌。`;
      if (target.fighterId) session.selectedId = target.fighterId;
      clearSelection();
    }
  }

  function selectDeliberation(offer: NonNullable<typeof session.state.pendingDeliberation>, index: number): void {
    const previousHand = new Set(session.state.hand.map(card => card.id));
    if (!chooseDeliberation(session.state, offer, index)) return;
    if (session.state.status === 'running') session.lastFrame = performance.now();
    session.feedback = '已將選中的牌加入手牌。';
    render();
    focusReplacement(previousHand);
  }

  function focusReplacement(previousHand: ReadonlySet<number>): void {
    const replacement = session.state.hand.find(card => !previousHand.has(card.id));
    if (replacement) handView.focusCard(replacement.id);
  }

  function bindRedraw(): void {
    el('[data-testid="arena-redraw"]').addEventListener('click', () => {
      if (!canAct() || session.state.time < session.state.redrawAvailableAt) return;
      session.exchanging = true; session.exchangeStones.clear();
      session.aim = undefined;
      mobilePanels.open('payment');
      session.feedback = '選一張要放棄的手牌，再點選要重抽的魔法石。確認前不會消耗。';
      render();
  });
  el('[data-testid="arena-redraw-confirm"]').addEventListener('click', () => {
    if (session.activeHandId === undefined || session.state.pendingDeliberation) return;
    const count = session.exchangeStones.size;
    if (redrawStones(session.state, session.activeHandId, [...session.exchangeStones])) {
      clearSelection(); session.feedback = `已放棄一張牌與 ${count} 顆石頭，抽得 ${count + 1} 顆魔法石及一張新牌。`;
    } else session.feedback = '未能換石：請選一張手牌、至少一顆石頭，並等待冷卻結束。';
    render();
  });
  }

  function bindSelfPay(): void {
    selfPay.addEventListener('click', () => {
      const card = currentCard();
      if (card?.target !== 'self' || session.activeHandId === undefined || session.exchanging || !canAct()) return;
      const payment = [...session.paymentStones];
      const validation = validateCardPlay(session.state, session.activeHandId, {}, payment);
      el('[data-testid="arena-feedback"]').dataset.reason = validation.ok ? '' : validation.reason;
      if (!validation.ok) {
        session.feedback = cardPlayFailure(validation.reason, card, paymentStatus(session.state, card.cost, payment));
        render();
        return;
      }
      const previousHand = new Set(session.state.hand.map(card => card.id));
      if (!playCard(session.state, session.activeHandId, {}, payment)) return;
      clearSelection();
      if (session.state.pendingDeliberation) {
        if (document.hidden) keepDeliberationPaused(session.state);
        clearStartIntent();
        session.feedback = '已補兩顆魔法石。請選一張加入手牌。';
        render();
        deliberationHeading.focus();
        return;
      }
      session.feedback = '已補兩顆魔法石與一張牌，接下來的牌序已揭示。';
      render();
      focusReplacement(previousHand);
  });

  }

  function bindPayment(): void {
    el('[data-testid="arena-payment-auto"]').addEventListener('click', () => {
      const card = currentCard();
      if (!card || session.exchanging) return;
      session.paymentStones.clear();
      for (const id of findPayment(session.state, card.cost) ?? []) session.paymentStones.add(id);
      refreshPaymentFeedback();
      render();
  });
  el('[data-cancel]').addEventListener('click', () => { clearSelection(); session.feedback = '已取消，沒有消耗資源。'; render(); });
  }
  return { refreshPaymentFeedback, clearSelection, select, attemptPlay, selectDeliberation, bindRedraw, bindSelfPay, bindPayment };
}
