import { advanceArena, createArena, findPayment, paymentStatus, validateCardPlay, type CardTarget, playCard, redrawStones, REDRAW_COOLDOWN, toggleArena } from './engine';
import { CARDS, isResolvingArena, isAreaSpellTarget, areaSpellTargets } from './model';
import type { Card, Fighter } from './model';
import { ArenaView } from './view';
import { createHandView } from './hand-view';
import { createThrowFeedback } from './throw-feedback';
import { createSupportHud } from './support-hud';
import { createMobilePanels } from './mobile-panels';
import { cardPlayFailure, paymentProblem, paymentReadout } from './payment-ui';
import { arenaLayout } from './layout';
import './arena.css';
import './hand.css';
import './mobile.css';

const poseLabels = { idle: '伺機而動', walk: '尋找對手', attack: '發起攻擊', hit: '受到攻擊', fallen: '倒地', airborne: '遭到擊飛', rising: '正在起身', block: '盾牌格擋', parry: '成功招架', dead: '已出局' };
const weaponLabels = { fists: '徒手', sword: '直劍（單手）', club: '木棍（雙手）', shield: '圓盾（單手）', bow: '長弓（雙手）' };

export function mountArena(root: HTMLElement): void {
  let round = 1;
  let state = createArena(73021);
  let selectedId = state.fighters[0]?.id ?? '';
  let activeHandId: number | undefined;
  let exchanging = false;
  let aim: { x: number; y: number } | undefined;
  const exchangeStones = new Set<number>();
  const paymentStones = new Set<number>();
  let paymentHandId: number | undefined;
  let cancelCardDrag: (() => void) | undefined;
  let returnAfterSupport = false;
  let lastLogs = '';
  let feedback = '選一位鬥士支持，然後開始這場混戰。';
  document.title = '詐賭競技場 · 場邊的你，才是變數';
  root.innerHTML = arenaLayout(state.fighters);
  const mobilePanels = createMobilePanels(root);
  const renderSupport = createSupportHud(root);
  const renderThrowFeedback = createThrowFeedback(root);
  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const canvas = el<HTMLCanvasElement>('[data-testid="arena-canvas"]');
  const view = new ArenaView(canvas);
  const start = el<HTMLButtonElement>('[data-testid="arena-start"]');
  const support = el<HTMLButtonElement>('[data-support]');
  const supportChange = el<HTMLButtonElement>('[data-support-change]');
  const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-fighter]')];
  const handView = createHandView(root, bindCard, (id) => {
    if (!exchanging && !currentCard()) return;
    const selected = exchanging ? exchangeStones : paymentStones;
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    if (!exchanging) refreshPaymentFeedback();
    render();
  });
  const currentCard = (): Card | undefined => CARDS.find((card) => card.id === state.hand.find((hand) => hand.id === activeHandId)?.cardId);
  const canAct = (): boolean => (state.status === 'running' || state.status === 'paused') && !isResolvingArena(state);

  function refreshPaymentFeedback(): void {
    const card = currentCard();
    if (!card) return;
    const status = paymentStatus(state, card.cost, [...paymentStones]);
    feedback = status.valid ? '支付用石已備妥，點目標施放。' : `${paymentProblem(status)}；請調整支付用石。`;
    el('[data-testid="arena-feedback"]').dataset.reason = '';
  }

  function clearSelection(): void {
    cancelCardDrag?.();
    el('[data-testid="arena-feedback"]').dataset.reason = '';
    activeHandId = undefined;
    aim = undefined;
    exchanging = false;
    exchangeStones.clear();
    paymentStones.clear(); paymentHandId = undefined;
    el('[data-drag-label]').hidden = true;
  }


  function render(): void {
    const resolving = (state.status === 'running' || state.status === 'paused') && isResolvingArena(state);
    const resolvingTitle = state.status === 'paused' ? '結算暫停' : '結算中';
    const resolvingMessage = resolving ? state.status === 'paused'
      ? '結算已暫停；按「繼續」完成結算。本場不可再出牌或換石。'
      : '正在結算在途投擲物與箭，本場不可再出牌或換石。' : '';
    if (activeHandId !== undefined && !state.hand.some((hand) => hand.id === activeHandId)) clearSelection();
    const activeCard = currentCard();
    if (activeHandId !== paymentHandId) {
      paymentStones.clear();
      if (activeCard) for (const id of findPayment(state, activeCard.cost) ?? []) paymentStones.add(id);
      paymentHandId = activeHandId;
    }
    handView.render(state, activeHandId, exchanging, exchangeStones, paymentStones);
    renderSupport(state.fighters.find(f => f.id === state.supportedId));
    supportChange.hidden = state.status !== 'ready';
    renderThrowFeedback(state);
    const payment = [...paymentStones];
    const paymentCheck = activeCard ? paymentStatus(state, activeCard.cost, payment) : undefined;
    view.render(state, selectedId, exchanging ? null : activeCard?.target ?? null, exchanging ? undefined : activeCard, aim);
    el('[data-testid="arena-time"]').textContent = `${Math.floor(state.time / 60).toString().padStart(2, '0')}:${Math.floor(state.time % 60).toString().padStart(2, '0')}`;
    el('[data-alive]').textContent = state.fighters.filter((f) => f.hp > 0).length.toString();
    el('[data-round]').textContent = `第 ${round.toString().padStart(2, '0')} 場`;
    el('[data-status]').textContent = resolving ? resolvingTitle : { ready: '入場就緒', running: '激戰中', paused: '戰鬥暫停', finished: '本場結束' }[state.status];
    start.textContent = { ready: '開始混戰', running: 'Ⅱ 暫停', paused: '▶ 繼續', finished: '直接再戰' }[state.status];
    el('[data-testid="arena-feedback"]').textContent = resolvingMessage || feedback;
    el('[data-card-prompt]').textContent = resolving ? resolvingTitle : exchanging ? '放棄一張牌，換一手魔法石' : activeCard ? `${activeCard.name} · ${activeCard.target === 'area' ? '點選範圍圓心' : activeCard.throwRange ? '點亮區投擲' : activeCard.target === 'fighter' ? '點選鬥士施法' : '點選場地投送'}` : '三張手牌，改寫勝負';
    const deliveryDescription = activeCard && ['sword', 'club', 'bow'].includes(activeCard.id)
      ? '投送途中可能傷到任何鬥士，包含你支持的鬥士；碰撞會使裝備提前落地，之後可能被其他鬥士拾取。'
      : activeCard?.id === 'shield' ? '投送途中命中鬥士會截停並落地，不造成投擲傷害；落地後可能被其他鬥士拾取。' : '';
    el('[data-selected-description]').textContent = activeCard ? `${activeCard.description}${activeCard.id === 'growth' ? '；需要受傷鬥士。' : ''}${deliveryDescription ? ` ${deliveryDescription}` : ''}` : resolvingMessage || '選牌後點擊鬥士施法，或點擊場地投送武器。';
    el('[data-testid="arena-payment"]').textContent = resolvingMessage || (exchanging ? (activeCard ? `將放棄：${activeCard.name}` : '請選一張要放棄的手牌。') : activeCard && paymentCheck ? paymentReadout(state, activeCard, payment, paymentCheck) : '每次成功出牌，補兩顆魔法石與一張手牌。');
    el('[data-testid="arena-payment"]').dataset.valid = String(!exchanging && Boolean(paymentCheck?.valid));
    el('[data-testid="arena-payment-auto"]').hidden = !activeCard || exchanging;
    el('[data-testid="arena-card-detail"]').classList.toggle('is-empty', !activeCard);
    el('[data-payment-toggle-label]').textContent = exchanging ? '選擇要放棄的石頭' : '改選支付石';
    el('[data-payment-brief]').textContent = exchanging ? `已選 ${exchangeStones.size} 顆` : paymentCheck ? `${paymentCheck.selectedCount}/${paymentCheck.requiredCount} 顆 · ${paymentCheck.valid ? '已備妥' : '待調整'}` : '選牌後可改選';
    el('[data-testid="arena-throw-range"]').hidden = !activeCard?.throwRange || exchanging;
    el('[data-testid="arena-throw-range"]').textContent = activeCard?.throwRange ? `從下方投擲席投出，射程 ${activeCard.throwRange}m。只能投向亮區；沿途碰到鬥士或其他投擲物會提前落下。` : '';
    const areaPreview = el('[data-testid="arena-area-preview"]');
    areaPreview.hidden = activeCard?.target !== 'area' || exchanging;
    const affected = activeCard?.target === 'area' && aim ? areaSpellTargets(state.fighters, activeCard, aim) : [];
    areaPreview.dataset.targetCount = String(affected.length);
    areaPreview.dataset.valid = String(Boolean(activeCard?.target === 'area' && aim && isAreaSpellTarget(activeCard, aim) && affected.length));
    areaPreview.textContent = activeCard?.target === 'area' ? `直徑 ${activeCard.areaRadius * 2}m · ${!aim ? '點場內施放；按住不移動可先看範圍。所有鬥士都會受傷。' : !isAreaSpellTarget(activeCard, aim) ? '圓心必須在場內，不會消耗資源。' : !affected.length ? '圈內沒有存活鬥士，不會消耗資源。' : `命中 ${affected.length} 位鬥士${affected.some(f => f.id === state.supportedId) ? '，包括你支持的鬥士！' : '，不限陣營。'}`}` : '';
    el('[data-cancel]').hidden = !activeCard && !exchanging;
    canvas.classList.toggle('is-targeting', Boolean(activeCard) && !exchanging);
    el('[data-redraw-controls]').hidden = !exchanging;
    const remaining = Math.max(0, state.redrawAvailableAt - state.time);
    el<HTMLButtonElement>('[data-testid="arena-redraw"]').disabled = !canAct() || remaining > 0;
    el<HTMLButtonElement>('[data-testid="arena-redraw"]').hidden = exchanging;
    el('[data-redraw-help]').textContent = remaining > 0 ? `再等 ${remaining.toFixed(1)} 秒${state.status === 'paused' ? '，繼續戰鬥後倒數' : ''}` : `棄至少一顆石頭，補一張牌；換石後等待 ${REDRAW_COOLDOWN} 秒。`;
    el('[data-testid="arena-redraw-preview"]').textContent = `棄 ${exchangeStones.size} 石 → 抽 ${exchangeStones.size + 1} 石，補一張牌`;
    el<HTMLButtonElement>('[data-testid="arena-redraw-confirm"]').disabled = !canAct() || !activeCard || exchangeStones.size < 1 || remaining > 0;
    for (const row of rows) {
      const fighter = state.fighters.find((f) => f.id === row.dataset.fighter);
      if (!fighter) continue;
      row.classList.toggle('is-selected', fighter.id === selectedId);
      row.classList.toggle('is-dead', fighter.hp <= 0);
      row.setAttribute('aria-pressed', String(fighter.id === selectedId));
      row.querySelector<HTMLElement>('[data-row-hp]')!.style.width = `${Math.max(0, fighter.hp / fighter.maxHp * 100)}%`;
      row.querySelector('[data-row-status]')!.textContent = fighter.hp <= 0 ? '出局' : fighter.id === state.supportedId ? '你的鬥士' : `${Math.ceil(fighter.hp)} HP`;
      row.querySelector('[data-row-badge]')!.textContent = fighter.id === state.supportedId ? '◆' : '';
    }
    const selected = state.fighters.find((f) => f.id === selectedId);
    if (selected) renderDetails(selected);
    const logKey = state.logs.join('|');
    if (logKey !== lastLogs) {
      lastLogs = logKey;
      el('[data-log]').replaceChildren(...state.logs.slice(0, 5).map((text) => {
        const entry = document.createElement('li'); entry.textContent = text; return entry;
      }));
    }
    const winner = state.fighters.find((f) => f.id === state.winnerId);
    el('[data-result]').hidden = state.status !== 'finished';
    if (state.status === 'finished') {
      el('[data-result-title]').textContent = winner ? `${winner.name} 勝出` : '本場平局';
      el('[data-result-copy]').textContent = winner?.id === state.supportedId ? '你的鬥士站到了最後。這場勝利，有你的手筆。' : '競技場從不保證公平。下一場，換你改寫結局。';
    }
  }
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
    el('[data-detail-buffs]').textContent = f.buffs.map((b) => `${({ bloodlust: '殺紅眼', fury: '狂熱', haste: '興奮', weakness: '虛弱' }[b.kind])} ${Math.max(0, b.until - state.time).toFixed(1)}秒`).join(' · ') || '無附加狀態';
    const trait = el('[data-testid="arena-trait"]');
    trait.hidden = f.species !== 'wolf' && f.species !== 'deer';
    trait.textContent = f.species === 'wolf' ? '獵殺狂熱：擊殺後提升攻擊力。' : f.species === 'deer' ? `迅捷：移動速度較高（${f.speed.toFixed(2)} m/s）。` : '';
    support.textContent = state.supportedId === f.id ? '◆ 你支持的鬥士' : '支持這位鬥士';
    support.disabled = state.status !== 'ready' || state.supportedId === f.id;
    support.style.setProperty('--fighter-color', f.color);
  }

  type StartIntent = { arena: typeof state; phase: typeof state.status };
  let startPointer: (StartIntent & { pointerId: number }) | undefined;
  let startSpace: StartIntent | undefined;
  const sameStartIntent = (intent: StartIntent): boolean => intent.arena === state && intent.phase === state.status;
  const clearStartIntent = (): void => { startPointer = undefined; startSpace = undefined; };

  function reset(): void {
    clearStartIntent();
    returnAfterSupport = false;
    const speed = state.speed;
    state = createArena(73021 + round++);
    state.speed = speed;
    selectedId = state.fighters[0]?.id ?? '';
    clearSelection();
    // IDs restart with each round, so reset keyed nodes at this explicit lifecycle boundary.
    handView.reset();
    feedback = '新一場鬥士已入場。選擇你的支持對象。';
    render();
  }
  document.addEventListener('pointerdown', clearStartIntent, true);
  start.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) startPointer = {pointerId:event.pointerId,arena:state,phase:state.status};
  });
  document.addEventListener('pointerup', (event) => {
    if (!start.contains(event.target as Node)) startPointer = undefined;
  });
  document.addEventListener('pointercancel', clearStartIntent);
  window.addEventListener('blur', clearStartIntent);
  start.addEventListener('keydown', (event) => {
    if (event.key === ' ' && !event.repeat) startSpace = {arena:state,phase:state.status};
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
    if (!valid) return;
    returnAfterSupport = false;
    if (state.status === 'finished') reset();
    toggleArena(state);
    feedback = state.status === 'running' ? '戰鬥開始。點牌再點目標；滑鼠也可拖牌進場。' : '戰鬥已暫停，仍可出牌；效果倒數、換石冷卻與動畫保持停止。';
    render();
  });
  el('[data-testid="arena-reset"]').addEventListener('click', reset);
  const resultReset = el<HTMLButtonElement>('[data-result-reset]');
  let resultResetPointer: number | undefined;
  document.addEventListener('pointerdown', () => { resultResetPointer = undefined; }, true);
  resultReset.addEventListener('pointerdown', (event) => {
    if (event.isPrimary && event.button === 0) resultResetPointer = event.pointerId;
  });
  document.addEventListener('pointerup', (event) => {
    if (!resultReset.contains(event.target as Node)) resultResetPointer = undefined;
  });
  document.addEventListener('pointercancel', () => { resultResetPointer = undefined; });
  window.addEventListener('blur', () => { resultResetPointer = undefined; });
  resultReset.addEventListener('click', (event) => {
    // A newly appearing result panel must not turn an in-progress cast into a reset.
    const sameGesture = event instanceof PointerEvent && event.pointerId === resultResetPointer;
    resultResetPointer = undefined;
    if (event.detail === 0 || sameGesture) reset();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
    button.addEventListener('click', () => {
      state.speed = Number(button.dataset.speed);
      root.querySelectorAll('[data-speed]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      render();
    });
  });
  rows.forEach((row) => row.addEventListener('click', () => {
    selectedId = row.dataset.fighter!;
    if (canAct() && currentCard()?.target === 'fighter' && !exchanging) attemptPlay({ fighterId: selectedId });
    render();
  }));
  supportChange.addEventListener('click', () => {
    if (state.status !== 'ready') return;
    returnAfterSupport = true;
    mobilePanels.open('fighters'); mobilePanels.open('detail');
    el('[data-mobile-panel="fighters"]').scrollIntoView({block:'start'});
    rows.find(row => row.dataset.fighter === selectedId)?.focus({preventScroll:true});
  });
  support.addEventListener('click', () => {
    if (state.status !== 'ready' || state.supportedId === selectedId) return;
    state.supportedId = selectedId;
    feedback = `你選擇支持${state.fighters.find((f) => f.id === selectedId)?.name}。準備好就開戰。`;
    const returnToStage = returnAfterSupport;
    returnAfterSupport = false;
    render();
    if (returnToStage) {
      el('.arena-stage').scrollIntoView({block:'start'});
      start.focus({preventScroll:true});
    }
  });
  el('[data-testid="arena-redraw"]').addEventListener('click', () => {
    if (!canAct() || state.time < state.redrawAvailableAt) return;
    exchanging = true; exchangeStones.clear();
    mobilePanels.open('payment');
    feedback = '選一張要放棄的手牌，再點選要重抽的魔法石。確認前不會消耗。';
    render();
  });
  el('[data-testid="arena-redraw-confirm"]').addEventListener('click', () => {
    if (activeHandId === undefined) return;
    const count = exchangeStones.size;
    if (redrawStones(state, activeHandId, [...exchangeStones])) {
      clearSelection(); feedback = `已放棄一張牌與 ${count} 顆石頭，抽得 ${count + 1} 顆魔法石及一張新牌。`;
    } else feedback = '未能換石：請選一張手牌、至少一顆石頭，並等待冷卻結束。';
    render();
  });
  function select(handId: number): void {
    el('[data-testid="arena-feedback"]').dataset.reason = '';
    activeHandId = activeHandId === handId ? undefined : handId;
    const card = currentCard();
    feedback = card ? exchanging ? `將放棄${card.name}。請選擇要重抽的石頭。` : `${card.name}：${card.description}。${canAct() ? '' : '開始戰鬥後施放。'}` : '已取消選牌。';
    render();
  }
  function attemptPlay(target: CardTarget): void {
    const card = currentCard();
    if (!card || activeHandId === undefined || exchanging) return;
    const payment = [...paymentStones];
    const validation = validateCardPlay(state, activeHandId, target, payment);
    el('[data-testid="arena-feedback"]').dataset.reason = validation.ok ? '' : validation.reason;
    if (!validation.ok) {
      feedback = cardPlayFailure(validation.reason, card, paymentStatus(state, card.cost, payment));
      return;
    }
    const affected = card.target === 'area' ? areaSpellTargets(state.fighters, card, { x: target.x!, y: target.y! }) : [];
    if (playCard(state, activeHandId, target, payment)) {
      const targetName = target.fighterId ? state.fighters.find((f) => f.id === target.fighterId)?.name : undefined;
      feedback = `${card.name}${card.target === 'area' ? `已施放，命中 ${affected.length} 位鬥士${affected.some(f => f.id === state.supportedId) ? '，包含你支持的鬥士' : ''}` : targetName ? `已施放於${targetName}` : state.status === 'paused' ? '已排入投送，繼續戰鬥後飛向場內' : card.throwRange ? '已投出，沿途命中或落地後消耗，不會被拾取' : '已投出，任何鬥士都能拾取'}。已補兩顆魔法石與一張牌。`;
      if (target.fighterId) selectedId = target.fighterId;
      clearSelection();
    }
  }

  function cast(clientX: number, clientY: number): void {
    const card = currentCard();
    const fighter = view.pick(clientX, clientY, state, card?.target === 'fighter');
    if (!card || exchanging) { if (fighter) selectedId = fighter.id; render(); return; }
    updateAim(clientX, clientY);
    const target: CardTarget = card.target === 'fighter' ? (fighter ? { fighterId: fighter.id } : {}) : view.point(clientX, clientY);
    attemptPlay(target);
    render();
  }
  function updateAim(clientX: number, clientY: number): void {
    const rect = canvas.getBoundingClientRect();
    aim = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom ? view.point(clientX, clientY) : undefined;
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.pointerType !== 'touch' || exchanging || currentCard()?.target !== 'area') return;
    updateAim(event.clientX, event.clientY); render();
  }, {passive:true});
  canvas.addEventListener('pointercancel', (event) => {
    if (!event.isPrimary || event.pointerType !== 'touch') return;
    aim = undefined; render();
  }, {passive:true});
  canvas.addEventListener('pointermove', (event) => { updateAim(event.clientX, event.clientY); });
  canvas.addEventListener('pointerleave', () => { aim = undefined; });
  canvas.addEventListener('click', (event) => cast(event.clientX, event.clientY));
  el('[data-testid="arena-payment-auto"]').addEventListener('click', () => {
    const card = currentCard();
    if (!card || exchanging) return;
    paymentStones.clear();
    for (const id of findPayment(state, card.cost) ?? []) paymentStones.add(id);
    refreshPaymentFeedback();
    render();
  });
  el('[data-cancel]').addEventListener('click', () => { clearSelection(); feedback = '已取消，沒有消耗資源。'; render(); });
  function bindCard(button: HTMLButtonElement, handId: number): void {
    let dragStart: { x: number; y: number; pointerId: number } | undefined;
    let moved = false;
    let suppressClick = false;
    function stopDrag(cancelled: boolean): void {
      if (cancelled && dragStart) suppressClick = true;
      dragStart = undefined; moved = false;
      button.classList.remove('is-dragging');
      el('[data-drag-label]').hidden = true;
      if (cancelCardDrag === cancelThisDrag) cancelCardDrag = undefined;
      // Keep capture until pointerup: the cancelled gesture's click belongs to this button.
    }
    function cancelThisDrag(): void { stopDrag(true); }
    button.addEventListener('click', (event) => {
      if (event.detail > 0 && suppressClick) { suppressClick = false; return; }
      select(handId);
    });
    button.addEventListener('pointerdown', (event) => {
      // Touch cards scroll natively; taps select a card and the next target casts it.
      if (event.pointerType === 'touch') { suppressClick = false; return; }
      if (event.button !== 0 || exchanging) return;
      cancelCardDrag?.();
      dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      moved = false; suppressClick = false; cancelCardDrag = cancelThisDrag;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', (event) => {
      if (!dragStart || dragStart.pointerId !== event.pointerId || exchanging) return;
      if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 9) {
        moved = true; activeHandId = handId;
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
      else { clearSelection(); feedback = '投送已取消，沒有消耗資源。'; render(); }
    });
    const cancelPointer = (event: PointerEvent): void => {
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      clearSelection(); render();
    };
    button.addEventListener('pointercancel', cancelPointer);
    button.addEventListener('lostpointercapture', cancelPointer);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { clearSelection(); feedback = '已取消，沒有消耗資源。'; render(); }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
    const index = Number(event.key) - 1;
    if (/^[1-3]$/.test(event.key) && state.hand[index]) { event.preventDefault(); select(state.hand[index].id); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.status === 'running') { toggleArena(state); feedback = '離開頁面時已自動暫停。'; render(); }
  });
  new ResizeObserver(() => render()).observe(canvas);
  let lastFrame = performance.now();
  function frame(now: number): void {
    const elapsed = Math.max(0, Math.min((now - lastFrame) / 1000, 0.1));
    lastFrame = now;
    advanceArena(state, elapsed);
    render();
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
}
