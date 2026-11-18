import { findPayment } from './engine';
import { CARDS, type ArenaState, type Card } from './model';
import { deliberationChoiceMarkup, drawCardArt, handCardMarkup, STONE_COLORS, STONE_NAMES } from './layout';

type Deliberation = NonNullable<ArenaState['pendingDeliberation']>;

/** Reconcile only changed instances so animation frames preserve focus and pointer capture. */
export function createHandView(root: HTMLElement, bindCard: (button: HTMLButtonElement, handId: number) => void, onStoneToggle: (stoneId: number) => void, onDeliberationChoice: (offer: Deliberation, index: number) => void) {
  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const cardNodes = new Map<number, HTMLButtonElement>();
  const stoneNodes = new Map<number, HTMLButtonElement>();
  let lastHand = '';
  let lastStones: string | undefined;
  let lastStoneControls = '';
  let shownOffer: Deliberation | undefined;

  function renderDeliberation(offer: Deliberation | undefined): void {
    if (offer === shownOffer) return;
    shownOffer = offer;
    el('[data-hand-list]').hidden = Boolean(offer);
    el('[data-testid="arena-deliberation"]').hidden = !offer;
    const choices = el('[data-deliberation-choices]');
    choices.innerHTML = offer?.candidates.map((id, index) => deliberationChoiceMarkup(CARDS.find(card => card.id === id)!, index)).join('') ?? '';
    if (!offer) return;
    choices.querySelectorAll<HTMLButtonElement>('[data-deliberation-choice]').forEach((button, index) => {
      button.addEventListener('click', () => onDeliberationChoice(offer, index));
    });
  }

  function renderHand(state: ArenaState, activeHandId: number | undefined, exchanging: boolean): void {
    const list = el('[data-hand-list]');
    const finished = state.status === 'finished';
    const focused = document.activeElement;
    let focusIndex = -1;
    for (const [id, node] of cardNodes) {
      if (!state.hand.some((hand) => hand.id === id && hand.cardId === node.dataset.card)) {
        if (focused === node) focusIndex = [...list.children].indexOf(node);
        node.remove(); cardNodes.delete(id);
      }
    }
    state.hand.forEach((hand, index) => {
      const card = CARDS.find((entry) => entry.id === hand.cardId)!;
      let node = cardNodes.get(hand.id);
      if (!node) {
        const template = document.createElement('template');
        template.innerHTML = handCardMarkup(card, hand.id, index);
        node = template.content.firstElementChild as HTMLButtonElement;
        cardNodes.set(hand.id, node);
        list.append(node);
        drawCardArt(node.querySelector('canvas')!, card);
        bindCard(node, hand.id);
      }
      // Preserve the same node during animation frames, pointer capture and keyboard focus.
      if (list.children[index] !== node) list.insertBefore(node, list.children[index] ?? null);
      const shortcut = node.querySelector('kbd')!;
      shortcut.textContent = String(index + 1);
      shortcut.hidden = finished;
      const affordable = !finished && findPayment(state, card.cost) !== undefined;
      node.classList.toggle('is-selected', activeHandId === hand.id);
      node.classList.toggle('is-unaffordable', !finished && !affordable);
      node.setAttribute('aria-pressed', String(activeHandId === hand.id));
      // Keep focus and pointer capture until an in-progress gesture ends.
      node.setAttribute('aria-disabled', String(finished || Boolean(state.pendingDeliberation)));
      node.querySelector('[data-affordability]')!.textContent = finished ? '' : exchanging && activeHandId === hand.id ? '將放棄這張牌' : affordable ? '費用足夠' : '缺少魔法石';
    });
    if (focusIndex >= 0) (list.children[Math.min(focusIndex, list.children.length - 1)] as HTMLElement | undefined)?.focus({ preventScroll: true });
    el('[data-hand-count]').textContent = `手牌 ${state.hand.length} 張`;
  }

  function renderStones(state: ArenaState, key: string, activeCard: Card | undefined, exchanging: boolean, exchangeStones: Set<number>, paymentStones: Set<number>): void {
    const tray = el('[data-testid="arena-stones"]');
    if (key !== lastStones) {
      lastStones = key;
      for (const [id, node] of stoneNodes) {
        const stone = state.stones.find((entry) => entry.id === id);
        if (stone?.color === node.dataset.color) continue;
        node.remove();
        stoneNodes.delete(id);
        if (!stone) { exchangeStones.delete(id); paymentStones.delete(id); }
      }
      for (const stone of state.stones) {
        if (stoneNodes.has(stone.id)) continue;
        const button = document.createElement('button');
        button.className = 'stone-token';
        button.dataset.testid = 'arena-stone'; button.dataset.stone = String(stone.id); button.dataset.color = stone.color;
        button.innerHTML = `<span class="stone-gem" aria-hidden="true">◆</span><span>${STONE_NAMES[stone.color]}</span>`;
        button.setAttribute('aria-label', `${STONE_NAMES[stone.color]}色魔法石`);
        button.addEventListener('click', () => {
          onStoneToggle(stone.id);
        });
        stoneNodes.set(stone.id, button); tray.append(button);
      }
      el('[data-stone-summary]').innerHTML = STONE_COLORS.map((color) => `<span data-color="${color}">${STONE_NAMES[color]} <b>${state.stones.filter((stone) => stone.color === color).length}</b></span>`).join('');
    }
    const mode = exchanging ? 'exchange' : activeCard ? 'payment' : 'idle';
    const selected = exchanging ? exchangeStones : paymentStones;
    const controlsKey = JSON.stringify([key, state.status, mode, activeCard?.target, [...selected]]);
    if (controlsKey === lastStoneControls) return;
    lastStoneControls = controlsKey;
    tray.dataset.mode = mode;
    for (const [id, button] of stoneNodes) {
      button.disabled = mode === 'idle';
      button.setAttribute('aria-pressed', String(selected.has(id)));
      button.classList.toggle('is-payment', mode === 'payment' && paymentStones.has(id));
      button.setAttribute('aria-label', `${STONE_NAMES[button.dataset.color as keyof typeof STONE_NAMES]}色魔法石${mode === 'payment' ? selected.has(id) ? '，已選支付' : '，保留' : mode === 'exchange' ? selected.has(id) ? '，將放棄' : '，保留' : ''}`);
    }
    el('[data-stone-total]').textContent = `${state.stones.length} 顆`;
    el('[data-stone-mode]').textContent = exchanging ? '放棄的石頭' : activeCard ? '支付用石 · 勾選才花費' : '持有魔法石';
    el('[data-stone-help]').hidden = state.status === 'finished';
    el('[data-stone-help]').textContent = exchanging ? '目前是換石：選中的石頭會被放棄，確認換石才消耗。' : activeCard ? activeCard.target === 'self' ? '可取消或改選藍石，確認抽牌時才付款。' : '點石頭可取消或改選，保留需要的顏色；點目標才付款。' : '選卡後可改選支付用石；數字費用可用任意色。';
  }

  return {
    render(state: ArenaState, activeHandId: number | undefined, exchanging: boolean, exchangeStones: Set<number>, paymentStones: Set<number>): void {
      const card = CARDS.find((entry) => entry.id === state.hand.find((hand) => hand.id === activeHandId)?.cardId);
      renderDeliberation(state.pendingDeliberation);
      const stonesKey = state.stones.map((stone) => `${stone.id}:${stone.color}`).join('|');
      const handKey = JSON.stringify([state.hand.map((hand) => `${hand.id}:${hand.cardId}`), stonesKey,
        state.status, activeHandId, exchanging, Boolean(state.pendingDeliberation)]);
      if (handKey !== lastHand) {
        lastHand = handKey;
        renderHand(state, activeHandId, exchanging);
      }
      renderStones(state, stonesKey, card, exchanging, exchangeStones, paymentStones);
    },
    focusCard(id: number): void {
      const node = cardNodes.get(id);
      node?.addEventListener('keydown', (event) => {
        if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
      });
      node?.focus();
    },
    reset(): void {
      cardNodes.clear(); stoneNodes.clear();
      lastHand = ''; lastStones = undefined; lastStoneControls = '';
      renderDeliberation(undefined);
      el('[data-hand-list]').replaceChildren(); el('[data-testid="arena-stones"]').replaceChildren();
    },
  };
}
