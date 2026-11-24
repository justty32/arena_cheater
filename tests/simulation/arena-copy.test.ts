import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/arena/shared/card-catalog';
import { BALANCE as B } from '../../src/arena/shared/balance';
import arrowsSource from '../../src/arena/sim/engine-arrows.ts?raw';
import trapsSource from '../../src/arena/items/engine-traps.ts?raw';
import actionsSource from '../../src/arena/ui/card-actions.ts?raw';
import layoutSource from '../../src/arena/ui/layout.ts?raw';
import hudSource from '../../src/arena/ui/arena-hud.ts?raw';
import detailsSource from '../../src/arena/ui/fighter-details.ts?raw';
import feedbackSource from '../../src/arena/ui/throw-feedback.ts?raw';
import paymentSource from '../../src/arena/ui/payment-ui.ts?raw';
import { ORIGINAL_DESCRIPTIONS } from './arena-copy-values';

const description = (id: string): string => CARDS.find(card => card.id === id)!.description;
const numbers = (text: string): number[] => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const capture = (source: string, pattern: RegExp): string => {
  const match = source.match(pattern);
  expect(match, pattern.source).not.toBeNull();
  return match![1];
};

describe('unchanged text agrees with current gameplay', () => {
  it('preserves every card description byte for byte', () => {
    expect(Object.fromEntries(CARDS.map(c => [c.id, c.description]))).toEqual(ORIGINAL_DESCRIPTIONS);
  });
  it('keeps all card-face damage, duration, range and area numerals consistent', () => {
    expect(numbers(description('lightning-rain'))).toEqual([B.cardLightningRainAreaRadius * 2, B.cardLightningRainDamage]);
    expect(numbers(description('divine-wrath'))).toEqual([B.cardDivineWrathAreaRadius * 2, B.cardDivineWrathDamage]);
    expect(numbers(description('stone'))).toEqual([B.throwStoneDamage, B.cardStoneThrowRange]);
    expect(numbers(description('pot'))).toEqual([B.throwPotDamage, B.cardPotThrowRange]);
    expect(numbers(description('dung'))).toEqual([B.cardDungThrowRange, B.throwDungDamage, B.dungDuration, B.dungDamage]);
    expect(B.dungInterval).toBe(1); // The copy says 每秒, not a variable tick interval.
    expect(numbers(description('spike-pit'))).toEqual([B.trapArm, B.spikeDamage, B.trapLifetime]);
    expect(numbers(description('bear-trap'))).toEqual([B.trapArm, B.bearTrapDamage, B.trapRoot, B.trapLifetime]);
    expect(numbers(description('lightning'))).toEqual([B.lightningDamage]);
    expect(numbers(description('bloodlust'))).toEqual([B.bloodlustDamage, B.bloodlustDuration]);
    expect(numbers(description('growth'))).toEqual([B.growthHeal]);
  });
  it('keeps Chinese card counts and derived card subtitles consistent', () => {
    expect(description('club')).toContain('兩次有效命中'); expect(B.clubDurability).toBe(2);
    expect(description('bow')).toContain('三支箭'); expect(B.bowAmmo).toBe(3);
    expect(description('deliberate')).toContain('最多三張，選一張'); expect(B.deliberateCount).toBe(3);
    expect(description('intuition')).toContain('最多兩張'); expect(B.intuitionCount).toBe(2);
    expect(layoutSource).toContain('card.areaRadius * 2');
    expect(layoutSource).toContain('${card.throwRange}m');
  });
  it('ties the elephant trait percentage to its club multiplier', () => {
    const percent = capture(detailsSource, /case 'elephant': return '持木棍近戰時，傷害提高 (\d+)%/);
    expect(Number(percent)).toBeCloseTo((B.elephantClubMultiplier - 1) * 100);
  });
  it('ties the HUD redraw preview bonus to the resource rule', () => {
    const bonus = capture(hudSource, /arena-redraw-preview"\]'\)\.textContent = `棄 \$\{session.exchangeStones.size\} 石 → 抽 \$\{session.exchangeStones.size \+ (\d+)\} 石，補一張牌`/);
    expect(Number(bonus)).toBe(B.redrawBonus);
  });
  it('ties the dynamic HUD hand heading to the initial hand size', () => {
    const count = capture(hudSource, /el\('\[data-card-prompt\]'\)\.textContent = [^\n]* : '([^張]+)張手牌，改寫勝負';/);
    expect(count).toBe('三');
    expect(B.initialHand).toBe(3);
  });
  it('ties the initial layout hand heading to the initial hand size', () => {
    const count = capture(layoutSource, /<h2 data-card-prompt>([^張]+)張手牌，改寫勝負<\/h2>/);
    expect(count).toBe('三');
    expect(B.initialHand).toBe(3);
  });
  it('ties the layout play reward explanation to the stone rule', () => {
    const count = capture(layoutSource, /成功出牌後補([^顆]+)顆石頭與一張牌/);
    expect(count).toBe('兩');
    expect(B.playStones).toBe(2);
  });
  it('ties the layout payment button to the deliberate offer count', () => {
    const count = capture(layoutSource, /data-testid="arena-deliberation-pay" hidden>支付藍石，抽([^選]+)選一<\/button>/);
    expect(count).toBe('三');
    expect(B.deliberateCount).toBe(3);
  });
  it('ties the layout deliberate card subtitle to its offer count', () => {
    const count = capture(layoutSource, /card.id === 'deliberate' \? '抽([^選]+)選一'/);
    expect(count).toBe('三');
    expect(B.deliberateCount).toBe(3);
  });
  it('ties the payment action copy to the deliberate offer count', () => {
    const count = capture(paymentSource, /return card.id === 'intuition' \? '查看牌序' : '抽([^選]+)選一';/);
    expect(count).toBe('三');
    expect(B.deliberateCount).toBe(3);
  });
  it('keeps the arrow and rooting combat logs consistent with their rules', () => {
    expect(arrowsSource).toContain('用盡三支箭，改以徒手戰鬥'); expect(B.bowAmmo).toBe(3);
    expect(trapsSource).toContain('，定身 3 秒'); expect(B.trapRoot).toBe(3);
    expect(trapsSource).toContain('受到 ${damage} 點傷害');
  });
  it('keeps repeated HUD and feedback numbers tied to their current values', () => {
    expect(actionsSource).toContain('0.6 遊戲秒後生效');
    expect(hudSource).toContain('布置後 0.6 遊戲秒生效'); expect(B.trapArm).toBe(0.6);
    expect(detailsSource).toContain('每秒 1 點');
    expect(feedbackSource).toContain('虛弱 5 秒、每秒 1 點持傷');
    expect([B.dungDuration, B.dungInterval, B.dungDamage]).toEqual([5, 1, 1]);
    expect(layoutSource).toContain('起手三張牌、三顆魔法石');
    expect([B.initialHand, B.initialStones]).toEqual([3, 3]);
    expect(layoutSource).toContain('擊殺，再獲得三顆魔法石'); expect(B.killReward).toBe(3);
    expect(actionsSource).toContain('已補兩顆魔法石與一張牌');
    expect(hudSource).toContain('補兩顆魔法石與一張手牌'); expect(B.playStones).toBe(2);
    expect(actionsSource).toContain('已補兩顆魔法石。請選一張');
    expect(actionsSource).toContain('${count + 1} 顆魔法石及一張新牌'); expect(B.redrawBonus).toBe(1);
    expect(hudSource).toContain('${REDRAW_COOLDOWN} 秒');
  });
});
