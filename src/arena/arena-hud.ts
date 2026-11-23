import { findPayment, paymentStatus, previewThrowContact, REDRAW_COOLDOWN } from './engine';
import { THROW_PROFILES, hasPendingDungDamage, isResolvingArena, isAreaSpellTarget, isThrowableTarget, isTrapTarget, areaSpellTargets, type ThrownKind } from './model';
import { paymentReadout, selfPaymentAction } from './payment-ui';
import type { ArenaContext } from './arena-session';

export function createArenaHud(context: Pick<ArenaContext, 'session' | 'el' | 'handView' | 'renderSupport' | 'renderThrowFeedback' | 'supportChange' | 'currentCard' | 'canAct' | 'canCastFromRoster' | 'pixelRatio' | 'view' | 'canvas' | 'start' | 'selfPay' | 'deliberationResume' | 'throwPreview' | 'trapPreview' | 'rows' | 'renderDetails' | 'clearSelection'>) {
  const { session, el, handView, renderSupport, renderThrowFeedback, supportChange, currentCard, canAct, canCastFromRoster, pixelRatio, view, canvas, start, selfPay, deliberationResume, throwPreview, trapPreview, rows, renderDetails, clearSelection } = context;
  function render(): void {
    session.aimChanged = false;
    const finished = session.state.status === 'finished';
    const resolving = (session.state.status === 'running' || session.state.status === 'paused') && isResolvingArena(session.state);
    const resolvingTitle = session.state.status === 'paused' ? '結算暫停' : '結算中';
    const resolvingMessage = resolving ? session.state.status === 'paused'
      ? '結算已暫停；按「繼續」完成結算。本場不可再出牌或換石。'
      : hasPendingDungDamage(session.state)
        ? '正在結算剩餘持續傷害，本場不可再出牌或換石。'
        : '正在結算在途投擲物與箭，本場不可再出牌或換石。' : '';
    if (session.activeHandId !== undefined && !session.state.hand.some((hand) => hand.id === session.activeHandId)) clearSelection();
    const activeCard = currentCard();
    const pending = session.state.pendingDeliberation;
    const selfCard = activeCard?.target === 'self' && !session.exchanging;
    const rosterCasting = canCastFromRoster(activeCard);
    if (session.activeHandId !== session.paymentHandId) {
      session.paymentStones.clear();
      if (activeCard) for (const id of findPayment(session.state, activeCard.cost) ?? []) session.paymentStones.add(id);
      session.paymentHandId = session.activeHandId;
    }
    handView.render(session.state, session.activeHandId, session.exchanging, session.exchangeStones, session.paymentStones);
    renderSupport(session.state.fighters.find(f => f.id === session.state.supportedId), session.state.supportKillRewardStones);
    supportChange.hidden = session.state.status !== 'ready';
    renderThrowFeedback(session.state);
    const payment = [...session.paymentStones];
    const paymentCheck = activeCard ? paymentStatus(session.state, activeCard.cost, payment) : undefined;
    const fieldCard = session.exchanging || selfCard || (resolving && activeCard?.target === 'trap') ? undefined : activeCard;
    const ratio = pixelRatio();
    if (session.canvasSizeChanged || ratio !== session.renderedPixelRatio) {
      view.resize(ratio);
      session.canvasSizeChanged = false;
      session.renderedPixelRatio = ratio;
    }
    const throwCard = fieldCard?.target === 'ground' ? fieldCard : undefined;
    const trapCard = fieldCard?.target === 'trap' ? fieldCard : undefined;
    const throwAim = resolving ? undefined : session.aim;
    const throwContact = throwCard && throwAim ? previewThrowContact(throwCard, throwAim, session.state.fighters) : undefined;
    view.render(session.state, session.selectedId, fieldCard?.target ?? null, fieldCard, throwCard ? throwAim : session.aim, throwContact);
    start.disabled = Boolean(pending);
    selfPay.hidden = !selfCard;
    selfPay.disabled = !selfCard || !canAct() || !paymentCheck?.valid;
    if (selfCard) {
      const payLabel = `支付藍石，${selfPaymentAction(activeCard)}`;
      if (selfPay.textContent !== payLabel) selfPay.textContent = payLabel;
    }
    const resumeText = pending ? pending.resumeOnChoice ? '選完自動繼續' : '選完保持暫停' : '';
    if (deliberationResume.textContent !== resumeText) deliberationResume.textContent = resumeText;
    el('[data-testid="arena-time"]').textContent = `${Math.floor(session.state.time / 60).toString().padStart(2, '0')}:${Math.floor(session.state.time % 60).toString().padStart(2, '0')}`;
    el('[data-alive]').textContent = session.state.fighters.filter((f) => f.hp > 0).length.toString();
    el('[data-round]').textContent = `第 ${session.round.toString().padStart(2, '0')} 場`;
    el('[data-status]').textContent = resolving ? resolvingTitle : { ready: '入場就緒', running: '激戰中', paused: '戰鬥暫停', finished: '本場結束' }[session.state.status];
    start.textContent = pending ? '選牌中' : { ready: '開始混戰', running: 'Ⅱ 暫停', paused: '▶ 繼續', finished: '直接開新局' }[session.state.status];
    const feedbackNode = el('[data-testid="arena-feedback"]');
    const feedbackText = resolvingMessage || session.feedback;
    if (feedbackNode.textContent !== feedbackText) feedbackNode.textContent = feedbackText;
    const fighterPrompt = rosterCasting ? '點場內鬥士或名單施法' : '開戰後可施法';
    const trapPrompt = canAct() ? '點場內地面布置' : '開戰後可布置';
    el('[data-card-prompt]').textContent = finished ? '本場手牌' : pending ? '謹慎思考' : resolving ? resolvingTitle : session.exchanging ? '放棄一張牌，換一手魔法石' : activeCard ? `${activeCard.name} · ${activeCard.target === 'area' ? '點選範圍圓心' : activeCard.throwRange ? '點亮區投擲' : activeCard.target === 'fighter' ? fighterPrompt : selfCard ? selfPaymentAction(activeCard) : activeCard.target === 'trap' ? trapPrompt : '點選場地投送'}` : '三張手牌，改寫勝負';
    const rosterSummary = el('[data-testid="arena-fighters-toggle"]');
    const rosterSubtitle = el('[data-fighters-subtitle]');
    const summary = rosterCasting ? '鬥士名單 · 點名字直接施法' : '鬥士名單 · 點選查看';
    const subtitle = rosterCasting ? '點名字直接施法' : session.state.status === 'ready' ? '查看後可支持' : '點選查看';
    if (rosterSummary.textContent !== summary) rosterSummary.textContent = summary;
    if (rosterSubtitle.textContent !== subtitle) rosterSubtitle.textContent = subtitle;
    el('.hand-tip').hidden = finished || Boolean(pending) || selfCard;
    const delivery = activeCard?.target === 'ground' ? THROW_PROFILES[activeCard.id as ThrownKind] : undefined;
    const deliveryDescription = !delivery || delivery.disposable ? '' : delivery.damage > 0
      ? '投送途中可能傷到任何鬥士，包含你支持的鬥士；碰撞會使裝備提前落地，之後可能被其他鬥士拾取。'
      : '投送途中命中鬥士會截停並落地，不造成投擲傷害；落地後可能被其他鬥士拾取。';
    el('[data-selected-description]').textContent = finished ? '可以從鬥士名單查看鬥士詳情。' : activeCard ? `${activeCard.description}${activeCard.id === 'growth' ? '；需要受傷鬥士。' : ''}${deliveryDescription ? ` ${deliveryDescription}` : ''}` : pending ? '選一張加入手牌。' : resolvingMessage || '選牌後點擊鬥士施法，或點擊場地投送武器。';
    el('[data-testid="arena-payment"]').textContent = finished ? '本場出牌已結束。' : pending ? '已付款，選牌時無須再支付。' : resolvingMessage || (session.exchanging ? (activeCard ? `將放棄：${activeCard.name}` : '請選一張要放棄的手牌。') : activeCard && paymentCheck ? paymentReadout(session.state, activeCard, payment, paymentCheck) : '每次成功出牌，補兩顆魔法石與一張手牌。');
    el('[data-testid="arena-payment"]').dataset.valid = String(!session.exchanging && Boolean(paymentCheck?.valid));
    el('[data-testid="arena-payment-auto"]').hidden = !activeCard || session.exchanging;
    el('[data-testid="arena-card-detail"]').classList.toggle('is-empty', !activeCard);
    el('[data-payment-toggle-label]').textContent = finished || pending ? '查看剩餘魔法石' : session.exchanging ? '選擇要放棄的石頭' : '改選支付石';
    el('[data-payment-brief]').textContent = finished || pending ? '' : session.exchanging ? `已選 ${session.exchangeStones.size} 顆` : paymentCheck ? `${paymentCheck.selectedCount}/${paymentCheck.requiredCount} 顆 · ${paymentCheck.valid ? '已備妥' : '待調整'}` : '選牌後可改選';
    const rangeText = throwCard?.throwRange ? `從下方投擲席投出，射程 ${throwCard.throwRange}m。只能投向亮區；沿途碰到鬥士或其他投擲物${delivery?.disposable ? '即消耗' : '會提前落下'}。` : '';
    const contactText = throwContact ? `依目前站位，先經過${throwContact.name}。` : '';
    const previewText = rangeText && contactText ? `${rangeText} ${contactText}` : rangeText || contactText;
    const aimed = String(Boolean(throwCard && throwAim));
    const valid = String(Boolean(throwCard && throwAim && isThrowableTarget(throwCard, throwAim)));
    const interceptId = throwContact?.id ?? '';
    if (throwPreview.hidden !== !previewText) throwPreview.hidden = !previewText;
    if (throwPreview.textContent !== previewText) throwPreview.textContent = previewText;
    if (throwPreview.dataset.aimed !== aimed) throwPreview.dataset.aimed = aimed;
    if (throwPreview.dataset.valid !== valid) throwPreview.dataset.valid = valid;
    if (throwPreview.dataset.interceptId !== interceptId) throwPreview.dataset.interceptId = interceptId;
    const areaPreview = el('[data-testid="arena-area-preview"]');
    areaPreview.hidden = activeCard?.target !== 'area' || session.exchanging;
    const affected = activeCard?.target === 'area' && session.aim ? areaSpellTargets(session.state.fighters, activeCard, session.aim) : [];
    areaPreview.dataset.targetCount = String(affected.length);
    areaPreview.dataset.valid = String(Boolean(activeCard?.target === 'area' && session.aim && isAreaSpellTarget(activeCard, session.aim) && affected.length));
    areaPreview.textContent = activeCard?.target === 'area' ? `直徑 ${activeCard.areaRadius * 2}m · ${!session.aim ? '點場內施放；按住不移動可先看範圍。所有鬥士都會受傷。' : !isAreaSpellTarget(activeCard, session.aim) ? '圓心必須在場內，不會消耗資源。' : !affected.length ? '圈內沒有存活鬥士，不會消耗資源。' : `命中 ${affected.length} 位鬥士${affected.some(f => f.id === session.state.supportedId) ? '，包括你支持的鬥士！' : '，不限陣營。'}`}` : '';
    const trapAimed = Boolean(trapCard && session.aim);
    const trapValid = Boolean(trapCard && session.aim && isTrapTarget(trapCard, session.aim));
    const trapText = !trapCard ? '' : !session.aim ? `${trapPrompt}。按住場內可預覽位置。`
      : trapValid ? '布置後 0.6 遊戲秒生效。' : '布置點須在場界內。';
    if (trapPreview.hidden !== !trapCard) trapPreview.hidden = !trapCard;
    if (trapPreview.textContent !== trapText) trapPreview.textContent = trapText;
    if (trapPreview.dataset.aimed !== String(trapAimed)) trapPreview.dataset.aimed = String(trapAimed);
    if (trapPreview.dataset.valid !== String(trapValid)) trapPreview.dataset.valid = String(trapValid);
    el('[data-cancel]').hidden = !activeCard && !session.exchanging;
    canvas.classList.toggle('is-targeting', Boolean(fieldCard));
    el('[data-redraw-controls]').hidden = !session.exchanging;
    const remaining = Math.max(0, session.state.redrawAvailableAt - session.state.time);
    el<HTMLButtonElement>('[data-testid="arena-redraw"]').disabled = !canAct() || remaining > 0;
    el<HTMLButtonElement>('[data-testid="arena-redraw"]').hidden = session.exchanging;
    el('[data-redraw-help]').textContent = finished ? '下一場開戰後可換石。' : remaining > 0 ? `再等 ${remaining.toFixed(1)} 秒${session.state.status === 'paused' ? '，繼續戰鬥後倒數' : ''}` : `棄至少一顆石頭，補一張牌；換石後等待 ${REDRAW_COOLDOWN} 秒。`;
    el('[data-testid="arena-redraw-preview"]').textContent = `棄 ${session.exchangeStones.size} 石 → 抽 ${session.exchangeStones.size + 1} 石，補一張牌`;
    el<HTMLButtonElement>('[data-testid="arena-redraw-confirm"]').disabled = !canAct() || !activeCard || session.exchangeStones.size < 1 || remaining > 0;
    for (const row of rows) {
      const fighter = session.state.fighters.find((f) => f.id === row.dataset.fighter);
      if (!fighter) continue;
      row.classList.toggle('is-selected', fighter.id === session.selectedId);
      row.classList.toggle('is-dead', fighter.hp <= 0);
      row.setAttribute('aria-pressed', String(fighter.id === session.selectedId));
      row.querySelector<HTMLElement>('[data-row-hp]')!.style.width = `${Math.max(0, fighter.hp / fighter.maxHp * 100)}%`;
      row.querySelector('[data-row-status]')!.textContent = fighter.hp <= 0 ? '出局' : fighter.id === session.state.supportedId ? '你的鬥士' : `${Math.ceil(fighter.hp)} HP`;
      row.querySelector('[data-row-badge]')!.textContent = fighter.id === session.state.supportedId ? '◆' : '';
    }
    const selected = session.state.fighters.find((f) => f.id === session.selectedId);
    if (selected) renderDetails(selected);
    const logKey = session.state.logs.join('|');
    if (logKey !== session.lastLogs) {
      session.lastLogs = logKey;
      const latestLog = el('[data-log-latest]');
      const latestText = session.state.logs.length > 1 ? session.state.logs[0] : '';
      latestLog.hidden = !latestText;
      if (latestLog.textContent !== latestText) latestLog.textContent = latestText;
      el('[data-log]').replaceChildren(...session.state.logs.slice(0, 5).map((text) => {
        const entry = document.createElement('li'); entry.textContent = text; return entry;
      }));
    }
    const winner = session.state.fighters.find((f) => f.id === session.state.winnerId);
    el('[data-result]').hidden = !finished;
    if (finished) {
      el('[data-result-title]').textContent = winner ? `${winner.name} 勝出` : '本場平局';
      const resultCopy = winner?.id === session.state.supportedId ? '你的鬥士站到了最後。這場勝利，有你的手筆。' : '競技場從不保證公平。下一場，換你改寫結局。';
      el('[data-result-copy]').textContent = `${resultCopy}重試會保留起手牌與入場位置。`;
    }
  }
  return render;
}
