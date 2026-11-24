import { startArenaLoop } from './arena-loop';
import { createArenaControls } from './arena-controls';
import { createArenaInput } from './arena-input';
import { createCardActions } from './card-actions';
import { createArenaHud } from './arena-hud';
import { createArenaSession } from './arena-session';
import { createFighterDetails } from './fighter-details';
import type { CardTarget } from '../items/engine-items';
import { CARDS } from '../shared/card-catalog';
import { isResolvingArena } from '../shared/status';
import type { Card } from '../shared/types';
import { ArenaView } from '../scene/view';
import { createHandView } from './hand-view';
import { createThrowFeedback } from './throw-feedback';
import { createSupportHud } from './support-hud';
import { createMobilePanels } from './mobile-panels';
import { arenaLayout } from './layout';
import './arena.css';
import './hand.css';
import './mobile.css';

export function mountArena(root: HTMLElement): void {
  const session = createArenaSession();
  document.title = '詐賭競技場 · 場邊的你，才是變數';
  root.innerHTML = arenaLayout(session.state.fighters);
  const mobilePanels = createMobilePanels(root);
  const renderSupport = createSupportHud(root);
  const renderThrowFeedback = createThrowFeedback(root);
  const el = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const canvas = el<HTMLCanvasElement>('[data-testid="arena-canvas"]');
  const view = new ArenaView(canvas);
  const throwPreview = el('[data-testid="arena-throw-range"]');
  const trapPreview = el('[data-testid="arena-trap-preview"]');
  const start = el<HTMLButtonElement>('[data-testid="arena-start"]');
  const selfPay = el<HTMLButtonElement>('[data-testid="arena-deliberation-pay"]');
  const deliberationHeading = el('[data-deliberation-heading]');
  const deliberationResume = el('[data-deliberation-resume]');
  const support = el<HTMLButtonElement>('[data-support]');
  const renderDetails = createFighterDetails(el, support, () => session.state);
  const supportChange = el<HTMLButtonElement>('[data-support-change]');
  const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-fighter]')];
  const handView = createHandView(root, bindCard, (id) => {
    if (session.state.pendingDeliberation || (!session.exchanging && !currentCard())) return;
    const selected = session.exchanging ? session.exchangeStones : session.paymentStones;
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    if (!session.exchanging) refreshPaymentFeedback();
    render();
  }, selectDeliberation);
  const currentCard = (): Card | undefined => CARDS.find((card) => card.id === session.state.hand.find((hand) => hand.id === session.activeHandId)?.cardId);
  const canAct = (): boolean => (session.state.status === 'running' || session.state.status === 'paused') && !isResolvingArena(session.state) && !session.state.pendingDeliberation;
  const canCastFromRoster = (card: Card | undefined): boolean => canAct() && card?.target === 'fighter' && !session.exchanging;
  const pixelRatio = (): number => Math.min(window.devicePixelRatio || 1, 2);

  const render = createArenaHud({ session, el, handView, renderSupport, renderThrowFeedback, supportChange, currentCard, canAct, canCastFromRoster, pixelRatio, view, canvas, start, selfPay, deliberationResume, throwPreview, trapPreview, rows, renderDetails, clearSelection: () => clearSelection() });

  const actions = createCardActions({ session, el, currentCard, canAct, mobilePanels, render, selfPay, deliberationHeading, handView, clearStartIntent: () => clearStartIntent() });
  function clearSelection(): void { actions.clearSelection(); }
  function refreshPaymentFeedback(): void { actions.refreshPaymentFeedback(); }
  function select(handId: number): void { actions.select(handId); }
  function attemptPlay(target: CardTarget): void { actions.attemptPlay(target); }
  function selectDeliberation(offer: NonNullable<typeof session.state.pendingDeliberation>, index: number): void { actions.selectDeliberation(offer, index); }

  const input = createArenaInput({ session, el, canvas, view, currentCard, attemptPlay, render, clearSelection, select });
  function bindCard(button: HTMLButtonElement, handId: number): void { input.bindCard(button, handId); }

  const controls = createArenaControls({ session, root, el, start, rows, support, supportChange, mobilePanels, currentCard, canCastFromRoster, attemptPlay, handView, render, clearSelection });
  function clearStartIntent(): void { controls.clearStartIntent(); }
  actions.bindRedraw();
  actions.bindSelfPay();

  input.bindCanvas();
  actions.bindPayment();
  input.bindKeyboard();
  startArenaLoop({ session, canvas, render, clearSelection, pixelRatio });
}
