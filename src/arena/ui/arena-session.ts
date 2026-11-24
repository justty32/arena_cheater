import { createArena } from '../sim/engine';

export function createArenaSession() {
  const state = createArena(73021);
  return {
    state,
    round: 1,
    lastFrame: 0,
    selectedId: state.fighters[0]?.id ?? '',
    activeHandId: undefined as number | undefined,
    exchanging: false,
    aim: undefined as { x: number; y: number } | undefined,
    aimChanged: false,
    renderedPixelRatio: 0,
    canvasSizeChanged: true,
    exchangeStones: new Set<number>(),
    paymentStones: new Set<number>(),
    paymentHandId: undefined as number | undefined,
    cancelCardDrag: undefined as (() => void) | undefined,
    returnAfterSupport: false,
    lastLogs: '',
    feedback: '選一位鬥士支持，然後開始這場混戰。',
  };
}

export type ArenaSession = ReturnType<typeof createArenaSession>;

export interface ArenaContext {
  session: ArenaSession;
  root: HTMLElement;
  el: <T extends HTMLElement = HTMLElement>(selector: string) => T;
  canvas: HTMLCanvasElement;
  view: import('../scene/view').ArenaView;
  handView: ReturnType<typeof import('./hand-view').createHandView>;
  mobilePanels: ReturnType<typeof import('./mobile-panels').createMobilePanels>;
  renderSupport: ReturnType<typeof import('./support-hud').createSupportHud>;
  renderThrowFeedback: ReturnType<typeof import('./throw-feedback').createThrowFeedback>;
  renderDetails: (fighter: import('../model').Fighter) => void;
  throwPreview: HTMLElement;
  trapPreview: HTMLElement;
  start: HTMLButtonElement;
  selfPay: HTMLButtonElement;
  deliberationHeading: HTMLElement;
  deliberationResume: HTMLElement;
  support: HTMLButtonElement;
  supportChange: HTMLButtonElement;
  rows: HTMLButtonElement[];
  currentCard: () => import('../model').Card | undefined;
  canAct: () => boolean;
  canCastFromRoster: (card: import('../model').Card | undefined) => boolean;
  pixelRatio: () => number;
  render: () => void;
  clearSelection: () => void;
  refreshPaymentFeedback: () => void;
  clearStartIntent: () => void;
  clearResultIntent: () => void;
  attemptPlay: (target: import('../engine').CardTarget) => void;
  select: (handId: number) => void;
  selectDeliberation: (offer: NonNullable<ArenaSession['state']['pendingDeliberation']>, index: number) => void;
  bindCard: (button: HTMLButtonElement, handId: number) => void;
  updateAim: (clientX: number, clientY: number) => boolean;
}
