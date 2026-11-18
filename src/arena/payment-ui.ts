import type { CardPlayRejection, PaymentStatus } from './engine';
import type { ArenaState, Card } from './model';
import { costText, STONE_COLORS, STONE_NAMES } from './layout';

export function paymentProblem(status: PaymentStatus): string {
  if (status.invalidSelection) return '石頭已變動，請重新選石';
  const parts = STONE_COLORS.filter(color => status.missingColors[color]).map(color => `缺${STONE_NAMES[color]} ${status.missingColors[color]}`);
  if (status.missingGeneric) parts.push(`尚需任意色 ${status.missingGeneric}`);
  if (status.excessCount) parts.push(`請取消 ${status.excessCount} 顆多選的石頭`);
  return parts.join('；') || '費用已備妥';
}

export function paymentReadout(state: ArenaState, card: Card, ids: readonly number[], status: PaymentStatus): string {
  const colors = STONE_COLORS.map(color => ({ color, count: state.stones.filter(stone => stone.color === color && ids.includes(stone.id)).length }))
    .filter(({ count }) => count).map(({ color, count }) => `${STONE_NAMES[color]} ${count}`).join(' ＋ ');
  return `支付 ${status.selectedCount} / ${status.requiredCount} 顆${colors ? `（${colors}）` : ''} · ${status.valid ? '點目標施放，可先點石頭改選' : paymentProblem(status)} · 費用：${costText(card.cost)}`;
}

const rejectionText: Record<Exclude<CardPlayRejection, 'target-required'>, string> = {
  'not-started': '請先開始戰鬥，再施放卡牌。',
  finished: '這場戰鬥已結束，請開新一場。',
  resolving: '正在結算在途投擲物與箭，本場不再接受出牌。',
  'card-missing': '這張牌已不在手中，請重新選牌。',
  'target-missing': '找不到這位鬥士，請重新選擇目標。',
  'target-dead': '這位鬥士已陣亡，請選擇仍存活的鬥士。',
  'target-full-health': '這位鬥士的生命已滿，野性成長需要受傷鬥士。',
  'invalid-point': '無法辨識這個落點，請重新點選場地。',
  'outside-arena': '這個位置在可用場界外，請點選場內。',
  'out-of-range': '超出這張投擲卡的射程，請點選亮區。',
  'empty-area': '範圍內沒有存活鬥士，請將圓心移向鬥士。',
  'insufficient-stones': '持有的魔法石不足以支付這張牌，可棄牌換石。',
  'invalid-payment': '目前選取的石頭不符合費用，請調整支付用石。',
};

const targetRequiredText: Record<Card['target'], string> = {
  fighter: '請點選存活鬥士的身體。',
  ground: '請點選場地落點。',
  area: '請點選範圍圓心。',
};

export function cardPlayFailure(reason: CardPlayRejection, card: Card, status: PaymentStatus): string {
  const message = reason === 'target-required' ? targetRequiredText[card.target] : rejectionText[reason];
  const detail = reason === 'invalid-payment' ? ` ${paymentProblem(status)}。` : reason === 'out-of-range' ? ` 射程 ${card.throwRange}m。` : '';
  return `${message}${detail}沒有消耗資源。`;
}
