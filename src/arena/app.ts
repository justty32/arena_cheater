import { advanceArena, createArena, playCard, toggleArena } from './engine';
import { CARDS, isResolvingArena } from './model';
import type { Card, Fighter } from './model';
import { ArenaView } from './view';
import { arenaLayout, drawCardArt } from './layout';
import './arena.css';

const poseLabels = { idle: '伺機而動', walk: '尋找對手', attack: '發起攻擊', hit: '受到攻擊', fallen: '倒地', airborne: '遭到擊飛', rising: '正在起身', block: '盾牌格擋', parry: '成功招架', dead: '已出局' };
const weaponLabels = { fists: '徒手', sword: '直劍（單手）', club: '木棍（雙手）', shield: '圓盾（單手）', bow: '弓（雙手）' };

export function mountArena(root: HTMLElement): void {
  let round = 1;
  let state = createArena(73021);
  let selectedId = state.fighters[0]?.id ?? '';
  let activeCard: Card | undefined;
  let lastLogs = '';
  let feedback = '選一位鬥士支持，然後開始這場混戰。';
  document.title = '詐賭競技場 · 場邊的你，才是變數';
  root.innerHTML = arenaLayout(state.fighters);
  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const canvas = el<HTMLCanvasElement>('[data-testid="arena-canvas"]');
  const view = new ArenaView(canvas);
  const start = el<HTMLButtonElement>('[data-testid="arena-start"]');
  const support = el<HTMLButtonElement>('[data-support]');
  const cards = [...root.querySelectorAll<HTMLButtonElement>('[data-card]')];
  const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-fighter]')];
  root.querySelectorAll<HTMLCanvasElement>('[data-card-art]').forEach((art) => drawCardArt(art, CARDS.find((c) => c.id === art.dataset.cardArt)!));

  function render(): void {
    view.render(state, selectedId, activeCard?.target ?? null);
    el('[data-testid="arena-time"]').textContent = `${Math.floor(state.time / 60).toString().padStart(2, '0')}:${Math.floor(state.time % 60).toString().padStart(2, '0')}`;
    el('[data-testid="arena-mana"]').textContent = Math.floor(state.mana).toString();
    el('[data-testid="arena-gold"]').textContent = Math.floor(state.gold).toString();
    el('[data-mana-fill]').style.width = `${Math.min(100, state.mana)}%`;
    el('[data-alive]').textContent = state.fighters.filter((f) => f.hp > 0).length.toString();
    el('[data-round]').textContent = `第 ${round.toString().padStart(2, '0')} 場`;
    el('[data-status]').textContent = state.status === 'running' && isResolvingArena(state) ? '等待飛行箭結算' : { ready: '入場就緒', running: '激戰中', paused: '戰鬥暫停', finished: '本場結束' }[state.status];
    start.textContent = { ready: '開始混戰', running: 'Ⅱ 暫停', paused: '▶ 繼續', finished: '再戰一場' }[state.status];
    el('[data-testid="arena-feedback"]').textContent = feedback;
    el('[data-card-prompt]').textContent = activeCard ? `${activeCard.name} · ${activeCard.target === 'fighter' ? '點選場上的鬥士施法' : '點選場地投送裝備'}` : '選擇一張牌，左右這場勝負';
    el('[data-cancel]').hidden = !activeCard;
    canvas.classList.toggle('is-targeting', Boolean(activeCard));
    for (const button of cards) {
      const card = CARDS.find((c) => c.id === button.dataset.card)!;
      button.classList.toggle('is-selected', activeCard?.id === card.id);
      button.disabled = state.status === 'finished' || isResolvingArena(state) || state[card.currency] < card.cost;
      button.setAttribute('aria-pressed', String(activeCard?.id === card.id));
    }
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
      const list = el('[data-log]');
      list.replaceChildren(...state.logs.slice(0, 5).map((text) => {
        const entry = document.createElement('li'); entry.textContent = text; return entry;
      }));
    }
    const winner = state.fighters.find((f) => f.id === state.winnerId);
    const result = el('[data-result]');
    result.hidden = state.status !== 'finished';
    if (state.status === 'finished') {
      el('[data-result-title]').textContent = winner ? `${winner.name} 勝出` : '本場平局';
      el('[data-result-copy]').textContent = winner?.id === state.supportedId ? '你的鬥士站到了最後。這場勝利，有你的手筆。' : '競技場從不保證公平。下一場，換你改寫結局。';
    }
  }

  function renderDetails(f: Fighter): void {
    el('[data-detail-name]').textContent = f.name;
    el('[data-detail-pose]').textContent = poseLabels[f.pose];
    el('[data-detail-hp]').textContent = `${Math.max(0, Math.ceil(f.hp))} / ${f.maxHp}`;
    el('[data-detail-stamina]').textContent = `${Math.floor(f.stamina)} / ${f.maxStamina}`;
    el('[data-detail-health-bar]').style.width = `${Math.max(0, f.hp / f.maxHp * 100)}%`;
    el('[data-detail-stamina-bar]').style.width = `${f.stamina / f.maxStamina * 100}%`;
    el('[data-detail-weapon]').textContent = `${weaponLabels[f.weapon]}${f.shield ? ' ＋ 圓盾（單手）' : ''}`;
    el('[data-testid="arena-ammo"]').textContent = f.weapon === 'bow' ? String(f.ammo) : '—';
    el('[data-testid="arena-durability"]').textContent = f.weapon === 'club' ? String(f.durability) : '—';
    el('[data-detail-defense]').textContent = f.shield ? '正面格擋 · 短窗招架' : '無盾牌';
    el('[data-detail-buffs]').textContent = f.buffs.map((b) => CARDS.find((c) => c.id === b.kind)?.name).join(' · ') || '無附加狀態';
    support.textContent = state.supportedId === f.id ? '◆ 你支持的鬥士' : '支持這位鬥士';
    support.disabled = state.status !== 'ready' || state.supportedId === f.id;
    support.style.setProperty('--fighter-color', f.color);
  }

  function reset(): void {
    const speed = state.speed;
    state = createArena(73021 + round++);
    state.speed = speed;
    selectedId = state.fighters[0]?.id ?? '';
    activeCard = undefined;
    feedback = '新一場鬥士已入場。選擇你的支持對象。';
    render();
  }
  start.addEventListener('click', () => {
    if (state.status === 'finished') reset();
    toggleArena(state);
    feedback = state.status === 'running' ? '戰鬥開始。把卡牌拖進競技場，或先選卡再點目標。' : '戰鬥已暫停，仍可施法或投送；時間、資源恢復與動畫保持停止。';
    render();
  });
  el('[data-testid="arena-reset"]').addEventListener('click', reset);
  el('[data-result-reset]').addEventListener('click', reset);
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
    button.addEventListener('click', () => {
      state.speed = Number(button.dataset.speed);
      root.querySelectorAll('[data-speed]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      render();
    });
  });
  rows.forEach((row) => row.addEventListener('click', () => {
    selectedId = row.dataset.fighter!;
    if (activeCard?.target === 'fighter') {
      if (isResolvingArena(state)) feedback = '正在結算在途箭，本場不再接受出牌。';
      else if (state.status !== 'running' && state.status !== 'paused') feedback = '請先開始新戰鬥，再施放卡牌。';
      else if (playCard(state, activeCard.id, { fighterId: selectedId })) {
        feedback = `${activeCard.name}已施放於${state.fighters.find((f) => f.id === selectedId)?.name}。`;
        activeCard = undefined;
      } else feedback = '未能施放：請檢查資源與目標狀態。';
    }
    render();
  }));
  support.addEventListener('click', () => {
    if (state.status !== 'ready') return;
    state.supportedId = selectedId;
    feedback = `你選擇支持${state.fighters.find((f) => f.id === selectedId)?.name}。準備好就開戰。`;
    render();
  });
  function select(card: Card): void {
    activeCard = activeCard?.id === card.id ? undefined : card;
    feedback = activeCard ? `${card.name}：${card.description}。${state.status === 'ready' || state.status === 'finished' ? '開始新戰鬥後施放。' : state.status === 'paused' ? '暫停中可施放，效果倒數與投送會在續戰後進行。' : ''}` : '已取消選牌。';
    render();
  }
  function cast(clientX: number, clientY: number): void {
    const fighter = view.pick(clientX, clientY, state);
    if (!activeCard) { if (fighter) selectedId = fighter.id; render(); return; }
    if (isResolvingArena(state)) { feedback = '正在結算在途箭，本場不再接受出牌。'; render(); return; }
    if (state.status !== 'running' && state.status !== 'paused') { feedback = '請先開始新戰鬥，再施放卡牌。'; render(); return; }
    const point = view.ground(clientX, clientY);
    const target = activeCard.target === 'fighter' ? (fighter ? { fighterId: fighter.id } : undefined) : point;
    if (!target) { feedback = activeCard.target === 'fighter' ? '法術需要命中一位存活的鬥士。' : '請將裝備投向競技場內。'; render(); return; }
    if (playCard(state, activeCard.id, target)) {
      feedback = activeCard.target === 'fighter' ? `${activeCard.name}已施放於${fighter!.name}。` : state.status === 'paused' ? `${activeCard.name}已排入投送，繼續戰鬥後飛向場內。` : `${activeCard.name}正在飛向場內，任何鬥士都能搶先拾取。`;
      if (fighter) selectedId = fighter.id;
      activeCard = undefined;
    } else feedback = '未能施放：請檢查資源與目標狀態。';
    render();
  }
  canvas.addEventListener('click', (event) => cast(event.clientX, event.clientY));
  el('[data-cancel]').addEventListener('click', () => { activeCard = undefined; feedback = '已取消選牌。'; render(); });
  cards.forEach((button) => {
    const card = CARDS.find((c) => c.id === button.dataset.card)!;
    let dragStart: { x: number; y: number } | undefined;
    let moved = false;
    let suppressClick = false;
    button.addEventListener('click', () => { if (suppressClick) { suppressClick = false; return; } select(card); });
    button.addEventListener('pointerdown', (event) => {
      if (button.disabled || event.button !== 0) return;
      dragStart = { x: event.clientX, y: event.clientY }; moved = false;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', (event) => {
      if (!dragStart) return;
      if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 9) {
        moved = true; activeCard = card;
        button.classList.add('is-dragging');
        el('[data-drag-label]').hidden = false;
        el('[data-drag-label]').textContent = card.name;
        el('[data-drag-label]').style.transform = `translate(${event.clientX + 12}px, ${event.clientY - 28}px)`;
        render();
      }
    });
    button.addEventListener('pointerup', (event) => {
      if (!dragStart) return;
      dragStart = undefined;
      button.classList.remove('is-dragging');
      el('[data-drag-label]').hidden = true;
      if (moved) {
        suppressClick = true;
        const rect = canvas.getBoundingClientRect();
        if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) cast(event.clientX, event.clientY);
        else { activeCard = undefined; feedback = '投送已取消，沒有消耗資源。'; render(); }
      }
    });
    button.addEventListener('pointercancel', () => {
      dragStart = undefined; activeCard = undefined; button.classList.remove('is-dragging'); el('[data-drag-label]').hidden = true; render();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { activeCard = undefined; render(); }
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < CARDS.length && !cards[index]?.disabled) select(CARDS[index]);
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
