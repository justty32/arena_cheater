import { expect, test, type Page, type Locator } from '@playwright/test';
import { createArena, findPayment, toggleArena, advanceArena } from '../../src/arena/engine';
import { CARDS, type ArenaState } from '../../src/arena/model';
import { createProjection, project } from '../../src/arena/projection';
import { observeErrors } from './helpers';

async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.goto('/');
  await expect(page.getByTestId('arena-canvas')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-17T01:00:00Z'));
}
const hand = (page: Page) => page.locator('button[data-hand-card]');
const stones = (page: Page) => page.locator('button[data-stone]');
const cardButton = (page: Page, id: number) => page.locator(`button[data-hand-card="${id}"]`);
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
  const state = await seek(page, s => s.hand.some(h => !findPayment(s, CARDS.find(c => c.id === h.cardId)!.cost)));
  await expect(hand(page)).toHaveCount(3);
  await expect(stones(page)).toHaveCount(3);
  await expect(page.locator('[data-fighter]')).toHaveCount(7);
  const unavailable = state.hand.find(h => !findPayment(state, CARDS.find(c => c.id === h.cardId)!.cost))!;
  const before = await inventory(page);
  await cardButton(page, unavailable.id).click();
  await expect(page.getByTestId('arena-card-detail')).toBeVisible();
  await paused(page);
  await page.locator('[data-fighter]').first().click();
  expect(await inventory(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath('arena-desktop.png'), fullPage: true });
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
  await page.getByTestId('arena-canvas').click({ position: { x: 3, y: 3 } });
  expect(await inventory(page)).toEqual(before);
  await page.locator('[data-cancel]').click();
  expect(await inventory(page)).toEqual(before);
  const card = cardButton(page, sword.id);
  await dragCard(page, card, { x: 5, y: 5 });
  expect(await inventory(page)).toEqual(before);
  await expect(page.getByTestId('arena-feedback')).toContainText('取消');
  const canvasBox = await page.getByTestId('arena-canvas').boundingBox();
  await dragCard(page, card, { x: canvasBox!.x + canvasBox!.width / 2, y: canvasBox!.y + canvasBox!.height / 2 });
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
  await hand(page).first().click(); await page.getByTestId('arena-redraw').click();
  await stones(page).first().click();
  await expect(stones(page).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('arena-redraw-preview')).toBeVisible();
  await page.locator('[data-cancel]').click();
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
  await page.getByTestId('arena-start').click();
  let pickup = '';
  for (let i = 0; i < 20 && !pickup; i++) {
    await page.clock.runFor(250);
    pickup = (await page.locator('[data-log] li').allTextContents()).find(t => t.includes('拾取長弓')) ?? '';
  }
  expect(pickup).not.toBe('');
  await page.getByTestId('arena-start').click();
  await page.locator('[data-fighter]').filter({ hasText: pickup.split(' 拾取')[0] }).click();
  await expect(page.getByTestId('arena-equipment')).toContainText(`${name}（雙手）`);
  const remaining = Number(await page.getByTestId(counter).innerText());
  expect(remaining).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath(`arena-${id}.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test('手機觸控選卡及取消不溢出，倍速與重置保留控制', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); const errors = observeErrors(page);
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await inventory(page);
  await hand(page).first().tap(); await expect(page.getByTestId('arena-card-detail')).toBeVisible();
  await page.locator('[data-cancel]').tap(); expect(await inventory(page)).toEqual(before);
  await page.locator('[data-speed="2"]').tap(); await page.getByTestId('arena-start').tap();
  await page.clock.runFor(2000);
  const time = await page.getByTestId('arena-time').innerText();
  expect(Number(time.split(':')[1])).toBeGreaterThanOrEqual(3);
  await page.getByTestId('arena-reset').tap();
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
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
