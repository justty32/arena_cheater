import { findPayment } from './engine';
import { CARDS, type ArenaState, type Card } from './model';
import { drawCardArt, handCardMarkup, STONE_COLORS, STONE_NAMES } from './layout';

/** Reconcile only changed instances so animation frames preserve focus and pointer capture. */
export function createHandView(root: HTMLElement, bindCard: (button: HTMLButtonElement, handId: number) => void, onStoneToggle: (stoneId: number) => void) {
  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const cardNodes = new Map<number, HTMLButtonElement>();
  const stoneNodes = new Map<number, HTMLButtonElement>();
  let lastStones = '';

  function renderHand(state: ArenaState, activeHandId: number | undefined, exchanging: boolean): void {
    const list = el('[data-hand-list]');
    const focused = document.activeElement;
    let focusIndex = -1;
    for (const [id, node] of cardNodes) {
      if (!state.hand.some((hand) => hand.id === id)) {
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
      node.querySelector('kbd')!.textContent = String(index + 1);
      const affordable = findPayment(state, card.cost) !== undefined;
      node.classList.toggle('is-selected', activeHandId === hand.id);
      node.classList.toggle('is-unaffordable', !affordable);
      node.setAttribute('aria-pressed', String(activeHandId === hand.id));
      node.querySelector('[data-affordability]')!.textContent = exchanging && activeHandId === hand.id ? '將放棄這張牌' : affordable ? '費用足夠' : '缺少魔法石';
    });
    if (focusIndex >= 0) (list.children[Math.min(focusIndex, list.children.length - 1)] as HTMLElement | undefined)?.focus({ preventScroll: true });
    el('[data-hand-count]').textContent = `手牌 ${state.hand.length} 張`;
  }

  function renderStones(state: ArenaState, activeCard: Card | undefined, exchanging: boolean, exchangeStones: Set<number>): void {
    const tray = el('[data-testid="arena-stones"]');
    const key = state.stones.map((stone) => `${stone.id}:${stone.color}`).join('|');
    if (key !== lastStones) {
      lastStones = key;
      for (const [id, node] of stoneNodes) {
        if (!state.stones.some((stone) => stone.id === id)) { node.remove(); stoneNodes.delete(id); exchangeStones.delete(id); }
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
    const payment = !exchanging && activeCard ? findPayment(state, activeCard.cost) : undefined;
    for (const [id, button] of stoneNodes) {
      button.disabled = !exchanging;
      button.setAttribute('aria-pressed', String(exchangeStones.has(id)));
      button.classList.toggle('is-payment', Boolean(payment?.includes(id)));
    }
    el('[data-stone-total]').textContent = `${state.stones.length} 顆`;
    el('[data-stone-help]').textContent = exchanging ? '點選要放棄的石頭，可再次點擊取消。' : '數字費用可用任意色；選牌後亮起預計支付的石頭。';
  }

  return {
    render(state: ArenaState, activeHandId: number | undefined, exchanging: boolean, exchangeStones: Set<number>): void {
      const card = CARDS.find((entry) => entry.id === state.hand.find((hand) => hand.id === activeHandId)?.cardId);
      renderHand(state, activeHandId, exchanging);
      renderStones(state, card, exchanging, exchangeStones);
    },
    reset(): void {
      cardNodes.clear(); stoneNodes.clear(); lastStones = '';
      el('[data-hand-list]').replaceChildren(); el('[data-testid="arena-stones"]').replaceChildren();
    },
  };
}
