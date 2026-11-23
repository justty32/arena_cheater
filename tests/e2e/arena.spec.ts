import { expect, test } from '@playwright/test';
import { CARDS, type ArenaState } from '../../src/arena/model';
import { observeErrors } from './helpers';
import { open, hand, stones, cardButton, inventory, paused, center, seek } from './arena-helpers';

test('三張實例手牌與三石可檢視；缺色仍可選牌且不消耗', async ({ page }, info) => {
  const errors = observeErrors(page);
  await open(page);
  const missingRedSpell = (state: ArenaState) => state.hand.find(card =>
    (card.cardId === 'lightning' || card.cardId === 'bloodlust') && !state.stones.some(stone => stone.color === 'red'));
  const state = await seek(page, s => Boolean(missingRedSpell(s)));
  await expect(hand(page)).toHaveCount(3);
  await expect(stones(page)).toHaveCount(3);
  await expect(page.locator('[data-fighter]')).toHaveCount(7);
  const unavailable = missingRedSpell(state)!;
  const before = await inventory(page);
  await cardButton(page, unavailable.id).click();
  await expect(page.getByTestId('arena-card-detail')).toBeVisible();
  await paused(page);
  await page.locator('[data-fighter]').first().click();
  await expect(page.getByTestId('arena-feedback')).toHaveAttribute('data-reason', 'insufficient-stones');
  expect(await inventory(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath('arena-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('謹慎思考只由付款按鈕施放，選牌期間停鐘並在選完後續戰', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(card => card.cardId === 'deliberate') &&
    s.stones.some(stone => stone.color === 'blue'));
  const spell = state.hand.find(card => card.cardId === 'deliberate')!;
  const blue = state.stones.find(stone => stone.color === 'blue')!;
  const start = page.getByTestId('arena-start');
  const pay = page.getByTestId('arena-deliberation-pay');
  const offer = page.getByTestId('arena-deliberation');
  const timer = page.getByTestId('arena-time');
  await start.click();
  await cardButton(page, spell.id).click();
  const before = await inventory(page);
  const paymentStone = page.locator(`[data-stone="${blue.id}"]`);
  await expect(paymentStone).toHaveAttribute('aria-pressed', 'true');
  await paymentStone.click();
  await expect(pay).toBeDisabled();
  await paymentStone.click();
  await expect(pay).toBeEnabled();
  await center(page);
  await expect(offer).toBeHidden();
  expect(await inventory(page)).toEqual(before);
  await cardButton(page, spell.id).focus();
  for (const nextCard of state.hand.slice(state.hand.indexOf(spell) + 1)) {
    await page.keyboard.press('Tab');
    await expect(cardButton(page, nextCard.id)).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(pay).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(offer).toBeVisible();
  await expect(offer.getByRole('heading')).toBeFocused();
  await expect(start).toBeDisabled();
  await expect(cardButton(page, spell.id)).toHaveCount(0);
  await expect(hand(page)).toHaveCount(2);
  const pending = await inventory(page);
  expect(pending.stones).toHaveLength(before.stones.length + 1);
  expect(pending.stones).not.toContain(String(blue.id));
  for (const unspent of before.stones.filter(id => id !== String(blue.id))) expect(pending.stones).toContain(unspent);
  const pausedTime = await timer.innerText();
  await page.keyboard.press('Escape');
  await page.keyboard.press('1');
  await page.clock.runFor(1100);
  await expect(timer).toHaveText(pausedTime);
  expect(await inventory(page)).toEqual(pending);

  const choices = offer.getByTestId('arena-deliberation-choice');
  await expect(choices).toHaveCount(3);
  const choice = choices.nth(1);
  const chosenName = await choice.locator('strong').innerText();
  await page.keyboard.press('Tab');
  await expect(choices.first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(choice).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(offer).toBeHidden();
  await expect(start).toBeEnabled();
  await expect(hand(page)).toHaveCount(3);
  const after = await inventory(page);
  expect(after.stones).toEqual(pending.stones);
  expect(after.hand.filter(id => pending.hand.includes(id))).toEqual(pending.hand);
  const added = after.hand.filter(id => !pending.hand.includes(id));
  expect(added).toHaveLength(1);
  const replacement = cardButton(page, Number(added[0]));
  await expect(replacement.locator('.card-name')).toHaveText(chosenName);
  await expect(replacement).toBeFocused();
  await expect(replacement).toHaveAttribute('aria-pressed', 'false');
  await page.clock.runFor(1100);
  await expect(timer).not.toHaveText(pausedTime);
  expect(errors).toEqual([]);
});

test('直覺付款後保持交戰，依序換入兩張不同的預告牌', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  const payable = (s: ArenaState) => s.hand.some(card => card.cardId === 'intuition') &&
    s.stones.some(stone => stone.color === 'blue');
  const state = await seek(page, s => payable(s) && new Set(s.deck.slice(-3, -1)).size === 2);
  const spell = state.hand.find(card => card.cardId === 'intuition')!;
  const [discardFirst, discardSecond] = state.hand.filter(card => card.id !== spell.id);
  const start = page.getByTestId('arena-start');
  const pay = page.locator('[data-self-pay]');
  const preview = page.getByTestId('arena-known-order');
  const shown = preview.locator('[data-known-slot]:not([hidden]) [data-known-name]');
  const [replacement, first, second] = state.deck.slice(-3).reverse();
  const name = (id: typeof first) => CARDS.find(card => card.id === id)!.name;
  const blue = state.stones.find(stone => stone.color === 'blue')!;
  const initial = await inventory(page);

  await start.click();
  await cardButton(page, spell.id).click();
  await expect(preview).toBeHidden();
  await page.locator('[data-cancel]').click();
  await expect(preview).toBeHidden();
  expect(await inventory(page)).toEqual(initial);
  await cardButton(page, spell.id).click();
  await expect(page.locator(`[data-stone="${blue.id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await pay.click();

  await expect(shown).toHaveText([name(first), name(second)]);
  await expect(hand(page).last()).toHaveAttribute('data-card', replacement);
  await expect(cardButton(page, spell.id)).toHaveCount(0);
  await expect(stones(page)).toHaveCount(initial.stones.length + 1);
  await expect(page.locator(`[data-stone="${blue.id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-status]')).toHaveText('激戰中');

  await cardButton(page, discardFirst.id).click();
  await page.getByTestId('arena-redraw').click();
  await stones(page).first().click();
  await page.getByTestId('arena-redraw-confirm').click();
  await expect(hand(page).last()).toHaveAttribute('data-card', first);
  await expect(shown).toHaveText([name(second)]);
  await expect(stones(page)).toHaveCount(initial.stones.length + 2);

  const redraw = page.getByTestId('arena-redraw');
  await expect(redraw).toBeDisabled();
  await page.clock.runFor(3200);
  await expect(redraw).toBeEnabled();
  await cardButton(page, discardSecond.id).click();
  await redraw.click();
  await stones(page).first().click();
  await page.getByTestId('arena-redraw-confirm').click();
  await expect(hand(page).last()).toHaveAttribute('data-card', second);
  await expect(preview).toBeHidden();
  await expect(hand(page)).toHaveCount(3);
  await expect(stones(page)).toHaveCount(initial.stones.length + 3);
  await expect(page.locator('[data-status]')).toHaveText('激戰中');

  // Reopen the original seed sequence and reset while the preview still contains cards.
  await page.reload();
  await expect(page.getByTestId('arena-canvas')).toBeVisible();
  const next = await seek(page, payable);
  await start.click();
  await cardButton(page, next.hand.find(card => card.cardId === 'intuition')!.id).click();
  await pay.click();
  await expect(preview).toBeVisible();
  await page.getByTestId('arena-reset').click();
  await expect(preview).toBeHidden();
  await expect(page.locator('[data-status]')).toHaveText('入場就緒');
  expect(errors).toEqual([]);
});

test('換石可取消、鍵盤確認，暫停冷卻凍結且續戰後再開放', async ({ page }) => {
  await open(page); await paused(page);
  const before = await inventory(page);
  await hand(page).first().click();
  await expect(page.getByTestId('arena-stones')).toHaveAttribute('data-mode', 'payment');
  await page.getByTestId('arena-redraw').click();
  await expect(page.getByTestId('arena-stones')).toHaveAttribute('data-mode', 'exchange');
  await expect(stones(page).first()).toHaveAttribute('aria-pressed', 'false');
  await stones(page).first().click();
  await expect(stones(page).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('arena-redraw-preview')).toBeVisible();
  await page.locator('[data-cancel]').click();
  await expect(page.getByTestId('arena-stones')).toHaveAttribute('data-mode', 'idle');
  expect(await inventory(page)).toEqual(before);
  await hand(page).first().click(); await page.getByTestId('arena-redraw').click();
  await stones(page).first().focus(); await page.keyboard.press('Space');
  await page.getByTestId('arena-redraw-confirm').focus(); await page.keyboard.press('Enter');
  expect(await inventory(page)).not.toEqual(before);
  await expect(cardButton(page, Number(before.hand[0]))).toHaveCount(0);
  await hand(page).first().click();
  await expect(page.getByTestId('arena-redraw')).toBeDisabled();
  await page.clock.runFor(4000);
  await expect(page.getByTestId('arena-redraw')).toBeDisabled();
  await page.getByTestId('arena-start').click(); await page.clock.runFor(3200);
  await expect(page.getByTestId('arena-redraw')).toBeEnabled();
});

test('鍵盤自選付款可保留紅石，未湊齊時拒絕提交', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(h => ['sword', 'club', 'bow'].includes(h.cardId) &&
    s.stones.filter(stone => stone.color !== 'red').length >= CARDS.find(c => c.id === h.cardId)!.cost.generic) &&
    s.hand.some(h => h.cardId === 'lightning' || h.cardId === 'bloodlust') && s.stones.some(stone => stone.color === 'red'));
  const equipment = state.hand.find(h => ['sword', 'club', 'bow'].includes(h.cardId) &&
    state.stones.filter(stone => stone.color !== 'red').length >= CARDS.find(c => c.id === h.cardId)!.cost.generic)!;
  const spell = state.hand.find(h => h.cardId === 'lightning' || h.cardId === 'bloodlust')!;
  const red = state.stones.find(stone => stone.color === 'red')!;
  await paused(page);
  await cardButton(page, equipment.id).click();
  await expect(page.getByTestId('arena-stones')).toHaveAttribute('data-mode', 'payment');
  await page.getByTestId('arena-payment-auto').click();
  await expect(page.getByTestId('arena-payment')).toHaveAttribute('data-valid', 'true');
  for (const selected of await stones(page).evaluateAll(nodes => nodes.filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.getAttribute('data-stone')))) {
    await page.locator(`[data-stone="${selected}"]`).focus(); await page.keyboard.press('Space');
  }
  const redButton = page.locator(`[data-stone="${red.id}"]`);
  await redButton.focus(); await page.keyboard.press('Space');
  await expect(redButton).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(redButton).toHaveAttribute('aria-pressed', 'false');
  const before = await inventory(page);
  await center(page);
  await expect(page.getByTestId('arena-feedback')).toHaveAttribute('data-reason', 'invalid-payment');
  const rejectedFeedback = await page.getByTestId('arena-feedback').innerText();
  expect(await inventory(page)).toEqual(before);
  const nonRed = state.stones.filter(stone => stone.color !== 'red').slice(0, CARDS.find(c => c.id === equipment.cardId)!.cost.generic);
  for (const stone of nonRed) {
    await page.locator(`[data-stone="${stone.id}"]`).focus(); await page.keyboard.press('Space');
  }
  await expect(page.getByTestId('arena-payment')).toHaveAttribute('data-valid', 'true');
  await expect(page.getByTestId('arena-feedback')).toHaveAttribute('data-reason', '');
  await expect(page.getByTestId('arena-feedback')).not.toHaveText(rejectedFeedback);
  await center(page);
  await expect(cardButton(page, equipment.id)).toHaveCount(0);
  await expect(redButton).toHaveCount(1);
  for (const stone of nonRed) await expect(page.locator(`[data-stone="${stone.id}"]`)).toHaveCount(0);
  await cardButton(page, spell.id).click();
  await expect(redButton).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-fighter]').first().click();
  await expect(cardButton(page, spell.id)).toHaveCount(0);
  await expect(redButton).toHaveCount(0);
  expect(errors).toEqual([]);
});
