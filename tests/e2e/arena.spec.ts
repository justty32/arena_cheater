import { expect, test, type Page, type Locator } from '@playwright/test';
import { createArena, findPayment, toggleArena, advanceArena } from '../../src/arena/engine';
import { CARDS, type ArenaState } from '../../src/arena/model';
import { createProjection, project } from '../../src/arena/projection';
import { observeErrors } from './helpers';

async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.goto('/');
  // The document load event does not wait for the mode’s dynamic import.
  await expect(page.getByTestId('arena-canvas')).toBeVisible({ timeout: 15_000 });
  await page.clock.pauseAt(new Date('2026-11-17T01:00:00Z'));
}
const hand = (page: Page) => page.locator('button[data-hand-card]');
const stones = (page: Page) => page.locator('button[data-stone]');
const cardButton = (page: Page, id: number) => page.locator(`button[data-hand-card="${id}"]`);
const nearGateFighter = (state: ArenaState, side: -1 | 1) =>
  state.fighters.find(fighter => fighter.y > 0 && fighter.x * side > 1)!;
async function inventory(page: Page) {
  return { hand: await hand(page).evaluateAll(es => es.map(e => e.getAttribute('data-hand-card'))), stones: await stones(page).evaluateAll(es => es.map(e => e.getAttribute('data-stone'))) };
}
async function paused(page: Page) {
  await page.getByTestId('arena-start').click();
  await page.getByTestId('arena-start').click();
}
async function center(page: Page) {
  const canvas = page.getByTestId('arena-canvas');
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
}
async function dragCard(page: Page, card: Locator, destination: { x: number; y: number }) {
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 8 });
  await page.mouse.up();
}
async function seek(page: Page, predicate: (state: ArenaState) => boolean) {
  let seed = 73021;
  while (!predicate(createArena(seed))) {
    expect(seed).toBeLessThan(73121);
    await page.getByTestId('arena-reset').click();
    seed++;
  }
  return createArena(seed);
}

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

test('暫停投送先驗目標、取消與拖曳；成功只消耗當張牌一次', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(h => h.cardId === 'sword'));
  const sword = state.hand.find(h => h.cardId === 'sword')!;
  const payment = findPayment(state, CARDS.find(c => c.id === sword.cardId)!.cost)!;
  await paused(page);
  const before = await inventory(page);
  await cardButton(page, sword.id).click();
  const canvas = page.getByTestId('arena-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const hoverBox = (await canvas.boundingBox())!;
  const projection = createProjection(hoverBox.width, hoverBox.height);
  const preview = page.getByTestId('arena-throw-range');
  // The near-right and near-left gates each have a clear path from the throw seat.
  for (const side of [1, -1] as const) {
    const fighter = nearGateFighter(state, side);
    const point = project(fighter.x, fighter.y, projection);
    await page.mouse.move(hoverBox.x + point.x, hoverBox.y + point.y);
    await page.clock.runFor(32);
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('data-intercept-id', fighter.id);
  }
  await page.mouse.move(2, 2);
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-aimed', 'false');
  expect(await inventory(page)).toEqual(before);
  await canvas.click({ position: { x: 3, y: 3 } });
  await expect(preview).toHaveAttribute('data-valid', 'false');
  await expect(preview).toHaveAttribute('data-intercept-id', '');
  expect(await inventory(page)).toEqual(before);
  await page.locator('[data-cancel]').click();
  expect(await inventory(page)).toEqual(before);
  const card = cardButton(page, sword.id);
  await dragCard(page, card, { x: 5, y: 5 });
  expect(await inventory(page)).toEqual(before);
  await expect(page.getByTestId('arena-feedback')).toContainText('取消');
  const canvasBox = await page.getByTestId('arena-canvas').boundingBox();
  const destination = { x: canvasBox!.x + canvasBox!.width / 2, y: canvasBox!.y + canvasBox!.height / 2 };
  const recent = page.getByTestId('arena-recent-throw');
  const recentBefore = await recent.evaluate(element => ({ ...element.dataset }));
  await card.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down(); await page.mouse.move(destination.x, destination.y, { steps: 8 });
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-drag-label]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-drag-label]')).toBeHidden();
  await page.mouse.move(destination.x + 5, destination.y, { steps: 2 }); await page.mouse.up();
  expect(await inventory(page)).toEqual(before);
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-drag-label]')).toBeHidden();
  expect(await recent.evaluate(element => ({ ...element.dataset }))).toEqual(recentBefore);
  await dragCard(page, card, destination);
  await expect(card).toHaveCount(0);
  for (const id of payment) await expect(page.locator(`[data-stone="${id}"]`)).toHaveCount(0);
  await expect(page.getByTestId('arena-feedback')).toContainText('直劍');
  for (const other of state.hand.filter(h => h.id !== sword.id)) await expect(cardButton(page, other.id)).toHaveCount(1);
  await expect(hand(page)).toHaveCount(3);
  const after = await inventory(page);
  await center(page);
  expect(await inventory(page)).toEqual(after);
  await page.clock.runFor(100);
  const canvasImage = () => page.getByTestId('arena-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const pausedImage = await canvasImage();
  await page.clock.runFor(3000);
  expect(await canvasImage()).toBe(pausedImage);
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
  expect(await inventory(page)).toEqual(after);
  await page.getByTestId('arena-start').click(); await page.clock.runFor(1500);
  await expect(page.getByTestId('arena-time')).not.toHaveText('00:00');
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

test('裝備投送拾取後更新詳情', async ({ page }, info) => {
  const id = 'bow', name = '弓', counter = 'arena-ammo';
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(h => h.cardId === id && findPayment(s, CARDS.find(c => c.id === id)!.cost)));
  const instance = state.hand.find(h => h.cardId === id)!;
  const forecast = createArena(state.seed); toggleArena(forecast); advanceArena(forecast, 1.5);
  await paused(page); await cardButton(page, instance.id).click();
  const canvas = page.getByTestId('arena-canvas'); const box = await canvas.boundingBox();
  const fighter = forecast.fighters[0];
  await canvas.click({ position: project(fighter.x, fighter.y, createProjection(box!.width, box!.height)) });
  await expect(cardButton(page, instance.id)).toHaveCount(0);
  const recent = page.getByTestId('arena-recent-throw');
  await expect(recent).toBeVisible();
  await expect(recent).toHaveAttribute('data-item-kind', id);
  const itemId = await recent.getAttribute('data-item-id');
  expect(itemId).toBeTruthy();
  await page.getByTestId('arena-start').click();
  for (let i = 0; i < 20 && await recent.getAttribute('data-phase') !== 'picked-up'; i++) await page.clock.runFor(250);
  await expect(recent).toHaveAttribute('data-phase', 'picked-up');
  await expect(recent).toHaveAttribute('data-item-id', itemId!);
  const pickerId = await recent.getAttribute('data-picker-id');
  expect(pickerId).toBeTruthy();
  await page.getByTestId('arena-start').click();
  await page.locator(`[data-fighter="${pickerId}"]`).click();
  await expect(page.getByTestId('arena-equipment')).toContainText(`${name}（雙手）`);
  const remaining = Number(await page.getByTestId(counter).innerText());
  expect(remaining).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath(`arena-${id}.png`), fullPage: true });
  await page.getByTestId('arena-reset').click();
  await expect(recent).toBeHidden();
  expect(errors).toEqual([]);
});

test('手機一屏可選牌改選付款與換石，倍速及重置仍可操作', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); const errors = observeErrors(page);
  await open(page);
  const opening = await seek(page, state => state.hand.some(card => card.cardId === 'bow') &&
    state.hand.filter(card => CARDS.find(definition => definition.id === card.cardId)!.target === 'ground').length >= 2);
  const openingBow = opening.hand.find(card => card.cardId === 'bow')!;
  const logToggle = page.getByTestId('arena-log-toggle');
  const latestLog = logToggle.locator('[data-log-latest]');
  const firstLog = page.locator('[data-log] > li').first();
  const panCard = opening.hand.find(card => card.id !== openingBow.id && CARDS.find(definition => definition.id === card.cardId)!.target === 'ground')!;
  const hud = page.getByTestId('arena-support-hud');
  const supportedId = await hud.getAttribute('data-fighter-id');
  expect(supportedId).toBeTruthy();
  const changeSupport = page.getByTestId('arena-support-change');
  await changeSupport.tap();
  await expect(page.getByTestId('arena-fighters-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('arena-detail-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`[data-fighter="${supportedId}"]`)).toBeFocused();
  const otherFighter = page.locator(`[data-fighter]:not([data-fighter="${supportedId}"])`).first();
  const nextSupportedId = await otherFighter.getAttribute('data-fighter');
  await otherFighter.tap();
  await expect(otherFighter).toHaveAttribute('aria-pressed', 'true');
  await expect(hud).toHaveAttribute('data-fighter-id', supportedId!);
  await page.locator('[data-support]').tap();
  await expect(hud).toHaveAttribute('data-fighter-id', nextSupportedId!);
  await expect(page.getByTestId('arena-start')).toBeFocused();
  await expect(page.getByTestId('arena-canvas')).toBeInViewport({ ratio: 1 });
  await page.getByTestId('arena-start').tap();
  await expect(changeSupport).toBeHidden();
  await page.getByTestId('arena-start').tap();
  await page.setViewportSize({ width: 390, height: 740 });
  await page.clock.runFor(32);
  await cardButton(page, openingBow.id).tap();
  await page.evaluate(() => scrollTo(0, 0));
  const canvas = page.getByTestId('arena-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const holdBox = (await canvas.boundingBox())!;
  const intercept = nearGateFighter(opening, 1);
  const hold = project(intercept.x, intercept.y, createProjection(holdBox.width, holdBox.height));
  const preview = page.getByTestId('arena-throw-range');
  const beforeHold = await inventory(page);
  const touch = await context.newCDPSession(page);
  const holdPoint = { x: holdBox.x + hold.x, y: holdBox.y + hold.y };
  const scrollBeforeHold = await page.evaluate(() => scrollY);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [holdPoint] });
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-intercept-id', intercept.id);
  expect(await inventory(page)).toEqual(beforeHold);
  for (let step = 1; step <= 8; step++) {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: holdPoint.x, y: holdPoint.y - step * 12 }],
    });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBeforeHold);
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-aimed', 'false');
  await expect(preview).toHaveAttribute('data-intercept-id', '');
  expect(await inventory(page)).toEqual(beforeHold);
  await canvas.tap({ position: hold });
  await expect(cardButton(page, openingBow.id)).toHaveCount(0);
  await expect(page.getByTestId('arena-recent-throw')).toBeVisible();
  await expect(logToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(latestLog).toBeVisible();
  await expect(latestLog).toContainText(CARDS.find(card => card.id === openingBow.cardId)!.name);
  await expect(latestLog).toHaveText(await firstLog.textContent() ?? '');
  await logToggle.tap();
  await expect(latestLog).toBeHidden();
  await expect(firstLog).toBeVisible();
  await logToggle.tap();
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport); await page.clock.runFor(32);
    await page.evaluate(() => scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByTestId('arena-canvas')).toBeInViewport({ ratio: 1 });
    await expect(hand(page)).toHaveCount(3);
    for (const card of await hand(page).all()) await expect(card).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('arena-stone-summary')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('arena-support-hud')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('arena-recent-throw')).toBeInViewport({ ratio: 1 });
  }
  const before = await inventory(page);
  const scrollingCard = cardButton(page, panCard.id);
  await scrollingCard.tap();
  await page.getByTestId('arena-effect-toggle').tap();
  await expect(page.getByTestId('arena-card-detail')).toBeVisible();
  await page.getByTestId('arena-effect-toggle').tap();
  await page.getByTestId('arena-payment-toggle').tap();
  await expect(page.getByTestId('arena-payment-toggle')).toHaveAttribute('aria-expanded', 'true');
  const selected = await stones(page).first().getAttribute('aria-pressed');
  await stones(page).first().tap();
  await expect(stones(page).first()).toHaveAttribute('aria-pressed', String(selected !== 'true'));
  expect(await inventory(page)).toEqual(before);
  await stones(page).first().tap();
  await expect(page.getByTestId('arena-payment')).toHaveAttribute('data-valid', 'true');
  const chosenStones = await stones(page).evaluateAll(nodes => nodes.filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.getAttribute('data-stone')));
  await scrollingCard.scrollIntoViewIfNeeded();
  const panBox = await scrollingCard.boundingBox();
  const panPoint = { x: panBox!.x + panBox!.width / 2, y: panBox!.y + panBox!.height / 2 };
  const scrollBefore = await page.evaluate(() => scrollY);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [panPoint] });
  for (let step = 1; step <= 8; step++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: panPoint.x, y: panPoint.y - step * 12 }] });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
  expect(await inventory(page)).toEqual(before);
  await expect(scrollingCard).toHaveAttribute('aria-pressed', 'true');
  expect(await stones(page).evaluateAll(nodes => nodes.filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.getAttribute('data-stone')))).toEqual(chosenStones);
  await expect(page.locator('[data-drag-label]')).toBeHidden();
  await canvas.scrollIntoViewIfNeeded();
  const canvasBox = await canvas.boundingBox();
  await canvas.tap({ position: project(0, 6, createProjection(canvasBox!.width, canvasBox!.height)) });
  await expect(scrollingCard).toHaveCount(0);
  await page.locator('[data-speed="2"]').tap(); await page.getByTestId('arena-start').tap();
  // Use one frame per 100 ms jump to advance the same fixed simulation steps.
  for (let i = 0; i < 20; i++) await page.clock.fastForward(100);
  const time = await page.getByTestId('arena-time').innerText();
  expect(Number(time.split(':')[1])).toBeGreaterThanOrEqual(3);
  await page.getByTestId('arena-start').tap();
  const discarded = await hand(page).first().getAttribute('data-hand-card');
  await hand(page).first().tap();
  await page.getByTestId('arena-exchange-toggle').tap();
  await page.getByTestId('arena-redraw').tap();
  await expect(page.getByTestId('arena-stones')).toHaveAttribute('data-mode', 'exchange');
  await expect(page.getByTestId('arena-payment-toggle')).toHaveAttribute('aria-expanded', 'true');
  await stones(page).first().tap(); await page.getByTestId('arena-redraw-confirm').tap();
  await expect(page.locator(`[data-hand-card="${discarded}"]`)).toHaveCount(0);
  await page.getByTestId('arena-reset').tap();
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
  await expect(latestLog).toBeHidden();
  await expect(latestLog).toBeEmpty();
  await expect(changeSupport).toBeVisible();
  await expect(page.locator('[data-speed="2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('arena-mobile.png'), fullPage: true });
  expect(errors).toEqual([]); await context.close();
});

for (const target of ['名單', '場上'] as const) {
  test(`暫停可從${target}施法並更新目標詳情`, async ({ page }) => {
    await open(page);
    const state = await seek(page, s => s.hand.some(h => h.cardId === 'bloodlust' && findPayment(s, CARDS.find(c => c.id === h.cardId)!.cost)));
    const instance = state.hand.find(h => h.cardId === 'bloodlust')!;
    await paused(page); await cardButton(page, instance.id).click();
    if (target === '名單') await page.locator('[data-fighter]').first().click();
    else {
      const canvas = page.getByTestId('arena-canvas'); const box = await canvas.boundingBox();
      const projection = createProjection(box!.width, box!.height);
      const fighter = state.fighters[0]; const point = project(fighter.x, fighter.y, projection);
      await canvas.click({ position: { x: point.x, y: point.y - 30 * projection.scale / 38 } });
    }
    await expect(cardButton(page, instance.id)).toHaveCount(0);
    await expect(page.locator('[data-detail-buffs]')).toContainText('殺紅眼');
  });
}

test('射程投擲拒絕遠處目標，合法投擲後顯示戰報', async ({ page }) => {
  const id = 'pot', name = '陶罐';
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(h => h.cardId === id));
  const instance = state.hand.find(h => h.cardId === id)!;
  await paused(page);
  await cardButton(page, instance.id).click();
  await expect(page.getByTestId('arena-card-detail')).toBeVisible();
  const before = await inventory(page);
  const canvas = page.getByTestId('arena-canvas'); const box = await canvas.boundingBox();
  const projection = createProjection(box!.width, box!.height);
  // The center is inside the arena but beyond the pot’s reach from the player’s seat.
  await canvas.click({ position: project(0, 0, projection) });
  await expect(page.getByTestId('arena-feedback')).toHaveAttribute('data-reason', 'out-of-range');
  await expect(page.getByTestId('arena-throw-range')).toHaveAttribute('data-intercept-id', '');
  expect(await inventory(page)).toEqual(before);
  await expect(cardButton(page, instance.id)).toHaveAttribute('aria-pressed', 'true');
  await canvas.click({ position: project(0, 6, projection) });
  await expect(cardButton(page, instance.id)).toHaveCount(0);
  await expect(hand(page)).toHaveCount(3);
  await expect(page.locator('[data-log]')).toContainText(`投擲${name}`);
  await page.getByTestId('arena-start').click(); await page.clock.runFor(900);
  await expect(page.locator('[data-log]')).toContainText(new RegExp(`${name}(命中|落地|碎裂)`));
  await expect(page.locator('[data-log]')).not.toContainText(`拾取${name}`);
  expect(errors).toEqual([]);
});

test('範圍法術預覽區分空圈與有效目標，點地施放後更新回饋', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, hasTouch: true });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await open(page);
  const state = await seek(page, s => s.hand.some(h => h.cardId === 'lightning-rain' && findPayment(s, CARDS.find(c => c.id === h.cardId)!.cost)));
  const instance = state.hand.find(h => h.cardId === 'lightning-rain')!;
  await paused(page);
  await cardButton(page, instance.id).click();
  const preview = page.getByTestId('arena-area-preview');
  await expect(preview).toBeVisible();
  const canvas = page.getByTestId('arena-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const projection = createProjection(box!.width, box!.height);
  const empty = project(0, 0, projection);
  await page.mouse.move(box!.x + empty.x, box!.y + empty.y);
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-valid', 'false');
  await expect(preview).toHaveAttribute('data-target-count', '0');
  const before = await inventory(page);
  await canvas.click({ position: empty });
  expect(await inventory(page)).toEqual(before);
  await expect(cardButton(page, instance.id)).toHaveAttribute('aria-pressed', 'true');
  const fighter = state.fighters[0];
  await canvas.scrollIntoViewIfNeeded();
  const targetBox = await canvas.boundingBox();
  const target = project(fighter.x, fighter.y, createProjection(targetBox!.width, targetBox!.height));
  await page.mouse.move(targetBox!.x + target.x, targetBox!.y + target.y);
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-valid', 'true');
  expect(Number(await preview.getAttribute('data-target-count'))).toBeGreaterThan(0);
  const feedback = await page.getByTestId('arena-feedback').innerText();
  const health = Number.parseFloat(await page.locator('[data-detail-hp]').innerText());
  // Clear the mouse aim before a real touchStart; stale hover must not satisfy the preview assertion.
  await page.mouse.move(1, 1); await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-target-count', '0');
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: targetBox!.x + target.x, y: targetBox!.y + target.y }] });
  await page.clock.runFor(32);
  await expect(preview).toHaveAttribute('data-valid', 'true');
  expect(Number(await preview.getAttribute('data-target-count'))).toBeGreaterThan(0);
  await expect(preview).toContainText('支持');
  expect(await inventory(page)).toEqual(before);
  await expect(cardButton(page, instance.id)).toHaveAttribute('aria-pressed', 'true');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(cardButton(page, instance.id)).toHaveCount(0);
  await expect(preview).toBeHidden();
  await expect(page.getByTestId('arena-feedback')).not.toHaveText(feedback);
  expect(Number.parseFloat(await page.locator('[data-detail-hp]').innerText())).toBeLessThan(health);
  expect(errors).toEqual([]);
  await context.close();
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

test('工程事件fixture：結算層接住舊觸控不重開，新手勢與鍵盤可重開', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await open(page);
  // DOM-only event fixture: freeze RAF and reveal the real overlay between touchStart and touchEnd.
  // This isolates browser click retargeting; it is not evidence of a naturally completed battle.
  const overlay = page.locator('[data-result]');
  const restart = page.locator('[data-result-reset]');
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await restart.scrollIntoViewIfNeeded();
  const box = await restart.boundingBox();
  const point = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  await restart.evaluate((button: HTMLElement) => {
    button.addEventListener('click', () => { button.dataset.fixtureClick = 'received'; });
  });
  await overlay.evaluate((element: HTMLElement) => { element.hidden = true; });
  const round = await page.locator('[data-round]').innerText();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(restart).toHaveAttribute('data-fixture-click', 'received');
  await expect(page.locator('[data-round]')).toHaveText(round);
  await restart.tap();
  await expect(page.locator('[data-round]')).not.toHaveText(round);
  const nextRound = await page.locator('[data-round]').innerText();
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await restart.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-round]')).not.toHaveText(nextRound);
  await context.close();
});

test('真實結算防止舊手勢，重試保留開局與支持，新局仍向前', async ({ page }) => {
  // This case plays two full battles through the browser before checking the result controls.
  test.setTimeout(90_000);
  const errors = observeErrors(page);
  await open(page);
  const opening = await seek(page, state => state.hand.some(card => card.cardId === 'spear'));
  const spear = opening.hand.find(card => card.cardId === 'spear')!;
  const supported = opening.fighters.find(fighter => fighter.y > 6 && Math.abs(fighter.x) < 1)!;
  const start = page.getByTestId('arena-start');
  const result = page.locator('[data-result]');
  const round = page.locator('[data-round]');
  const timer = page.getByTestId('arena-time');
  const canvas = page.getByTestId('arena-canvas');
  const hud = page.getByTestId('arena-support-hud');
  const recent = page.getByTestId('arena-recent-throw');
  const row = (id: string) => page.locator(`[data-fighter="${id}"]`);
  const dealt = async () => ({
    cards: await hand(page).evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.card)),
    colors: await stones(page).evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.color)),
  });
  async function inspectGate(fighter: ArenaState['fighters'][number]) {
    const box = (await canvas.boundingBox())!;
    const projection = createProjection(box.width, box.height);
    const point = project(fighter.x, fighter.y, projection);
    await canvas.click({ position: { x: point.x, y: point.y - projection.scale * .75 } });
    await expect(row(fighter.id)).toHaveAttribute('aria-pressed', 'true');
  }

  async function advanceToResult() {
    // Each jump runs at most one frame, and 100 ms fits the simulation frame delta cap.
    for (let elapsed = 0; elapsed < 61_000; elapsed += 100) {
      await page.clock.fastForward(100);
      if ((elapsed + 100) % 1000 === 0 && await result.isVisible()) return;
    }
    throw new Error('3× 戰鬥推進 61 秒測試時鐘後仍未結算');
  }

  const firstRound = await round.innerText();
  const firstDeal = await dealt();
  await row(supported.id).click();
  await page.locator('[data-support]').click();
  await expect(hud).toHaveAttribute('data-fighter-id', supported.id);
  const tripleSpeed = page.locator('[data-speed="3"]');
  await tripleSpeed.click();
  await paused(page);
  await cardButton(page, spear.id).click();
  const forecast = createArena(opening.seed);
  toggleArena(forecast);
  advanceArena(forecast, .55);
  const destination = forecast.fighters.find(fighter => fighter.id === supported.id)!;
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: project(destination.x, destination.y, createProjection(box.width, box.height)) });
  await expect(cardButton(page, spear.id)).toHaveCount(0);
  await expect(stones(page)).toHaveCount(firstDeal.colors.length + 1);
  await start.click();
  for (let i = 0; i < 10 && await recent.getAttribute('data-phase') !== 'picked-up'; i++) await page.clock.runFor(100);
  await expect(recent).toHaveAttribute('data-phase', 'picked-up');
  const pickerId = (await recent.getAttribute('data-picker-id'))!;
  await row(pickerId).click();
  await expect(page.getByTestId('arena-equipment')).toContainText('長矛');

  const firstCard = hand(page).first();
  await firstCard.click();
  await expect(firstCard).toHaveAttribute('aria-pressed', 'true');
  const unselectedStones = stones(page).and(page.locator('[aria-pressed="false"]'));
  const stone = await unselectedStones.count() ? unselectedStones.first() : stones(page).first();
  const stoneId = await stone.getAttribute('data-stone');
  const wasSelected = await stone.getAttribute('aria-pressed');
  await stone.click();
  await expect(page.locator(`[data-stone="${stoneId}"]`)).toHaveAttribute('aria-pressed', String(wasSelected !== 'true'));

  await start.scrollIntoViewIfNeeded();
  const startBox = (await start.boundingBox())!;
  await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
  await page.mouse.down();
  await advanceToResult();
  await page.mouse.up();
  await expect(result).toBeVisible();
  await expect(round).toHaveText(firstRound);
  await expect(start).toHaveText('直接開新局');
  await expect(timer).not.toHaveText('00:00');
  const pressed = page.locator('[aria-pressed="true"]');
  await expect(hand(page).or(stones(page)).and(pressed)).toHaveCount(0);
  await page.keyboard.press('1');
  await expect(hand(page).and(pressed)).toHaveCount(0);

  const retry = page.locator('[data-result-retry]');
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(result).toBeHidden();
  await expect(start).toBeFocused();
  await expect(page.locator('[data-status]')).toHaveText('入場就緒');
  await expect(round).toHaveText(firstRound);
  await expect(timer).toHaveText('00:00');
  await expect(hud).toHaveAttribute('data-fighter-id', supported.id);
  await expect(tripleSpeed).toHaveAttribute('aria-pressed', 'true');
  expect(await dealt()).toEqual(firstDeal);
  await expect(hand(page).or(stones(page)).and(pressed)).toHaveCount(0);
  await expect(recent).toBeHidden();
  await inspectGate(opening.fighters.find(fighter => fighter.id !== supported.id)!);
  await row(pickerId).click();
  await expect(page.getByTestId('arena-equipment')).toHaveText('徒手');
  await expect(page.locator('[data-alive]')).toHaveText(String(opening.fighters.length));

  await start.focus();
  await page.keyboard.press('Enter');
  await expect(start).toContainText('暫停');
  await page.keyboard.press('Space');
  await expect(start).toContainText('繼續');
  const pausedTime = await timer.innerText();
  await page.clock.runFor(300);
  await expect(timer).toHaveText(pausedTime);
  await page.keyboard.press('Space');
  await expect(start).toContainText('暫停');

  await page.keyboard.down('Space');
  await advanceToResult();
  await page.keyboard.down('Space'); // A repeat must retain the initial running intent.
  await page.keyboard.up('Space');
  await expect(result).toBeVisible();
  await expect(round).toHaveText(firstRound);
  await expect(start).toHaveText('直接開新局');

  await start.click();
  const next = createArena(opening.seed + 1);
  const nextRound = Number(firstRound.match(/\d+/)![0]) + 1;
  await expect(result).toBeHidden();
  await expect(round).toHaveText(`第 ${String(nextRound).padStart(2, '0')} 場`);
  await expect(page.locator('[data-status]')).toHaveText('激戰中');
  await expect(start).toContainText('暫停');
  await expect(timer).toHaveText('00:00');
  await expect(hud).toHaveAttribute('data-fighter-id', next.supportedId);
  await expect(tripleSpeed).toHaveAttribute('aria-pressed', 'true');
  expect(await dealt()).toEqual({
    cards: next.hand.map(card => card.cardId),
    colors: next.stones.map(stone => stone.color),
  });
  await inspectGate(next.fighters.find(fighter => fighter.id !== next.supportedId)!);
  expect(errors).toEqual([]);
});
