import { expect, test } from '@playwright/test';
import { advanceArena, createArena, playCard, toggleArena } from '../../src/arena/engine';
import { createProjection, project } from '../../src/arena/projection';
import { open, seek, paused, cardButton, inventory, stones } from './arena-helpers';
import { observeErrors } from './helpers';

function trapScenario(seed: number) {
  const state = createArena(seed);
  const card = state.hand.find(item => item.cardId === 'bear-trap');
  if (!card) return;
  const forecast = createArena(seed);
  toggleArena(forecast);
  advanceArena(forecast, .6);
  const supported = forecast.fighters.find(fighter => fighter.id === state.supportedId)!;
  const point = { x: supported.x, y: supported.y };
  toggleArena(state);
  playCard(state, card.id, point, state.stones.slice(0, 2).map(stone => stone.id));
  advanceArena(state, .8);
  const caught = state.fighters.find(fighter => fighter.rootedUntil !== undefined);
  if (caught?.id !== state.supportedId) return;
  return { card, point, caughtId: caught.id };
}

for (const width of [1440, 320, 390]) {
 test(`捕獸夾 ${width}px 暫停布置與定身、解除及同場重試`, async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: { width, height: width === 1440 ? 1000 : 740 }, isMobile: width !== 1440, hasTouch: width !== 1440 });
  const page = await context.newPage();
  test.setTimeout(90_000);
  const errors = observeErrors(page);
  await open(page);
  const opening = await seek(page, state => Boolean(trapScenario(state.seed)));
  const scenario = trapScenario(opening.seed)!;
  info.annotations.push({ type: 'seed', description: String(opening.seed) });
  await paused(page);
  await page.screenshot({ path: info.outputPath(`bear-trap-${width}-hand.png`), fullPage: true });
  const before = await inventory(page);
  const recent = page.getByTestId('arena-recent-throw');
  const recentBefore = await recent.evaluate(element => ({ ...element.dataset }));
  await cardButton(page, scenario.card.id).click();
  await expect(page.getByTestId('arena-payment')).toHaveAttribute('data-valid', 'true');
  const paid = await stones(page).evaluateAll(nodes => nodes.filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.getAttribute('data-stone')));
  expect(paid).toHaveLength(2);
  const canvas = page.getByTestId('arena-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const point = project(scenario.point.x, scenario.point.y, createProjection(box.width, box.height));
  await canvas.click({ position: point });
  await expect(page.getByTestId('arena-feedback')).toContainText('捕獸夾');
  await expect(page.getByTestId('arena-feedback')).not.toContainText('刺洞');
  await expect(cardButton(page, scenario.card.id)).toHaveCount(0);
  const after = await inventory(page);
  expect(after.hand).toHaveLength(before.hand.length);
  expect(after.stones).toHaveLength(before.stones.length);
  for (const id of paid) expect(after.stones).not.toContain(id);
  for (const id of before.stones.filter(id => !paid.includes(id))) expect(after.stones).toContain(id);
  expect(await recent.evaluate(element => ({ ...element.dataset }))).toEqual(recentBefore);
  await canvas.click({ position: point });
  expect(await inventory(page)).toEqual(after);
  const image = () => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.clock.runFor(32);
  await page.screenshot({ path: info.outputPath(`bear-trap-${width}-placed.png`), fullPage: true });
  const frozen = await image();
  // Advancing the browser clock while paused must not arm or expire the trap.
  await page.clock.runFor(5000);
  expect(await image()).toBe(frozen);
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
  await page.getByTestId('arena-start').click();
  await page.clock.runFor(800);
  await page.getByTestId('arena-start').click();
  if (width !== 1440) {
    const fighters = page.getByTestId('arena-fighters-toggle');
    if (await fighters.getAttribute('aria-expanded') !== 'true') await fighters.click();
    const detail = page.getByTestId('arena-detail-toggle');
    if (await detail.getAttribute('aria-expanded') !== 'true') await detail.click();
  }
  await page.locator(`[data-fighter="${scenario.caughtId}"]`).click();
  const buffs = page.locator('[data-detail-buffs]');
  await expect(buffs).toContainText('定身（仍可攻防）');
  await page.screenshot({ path: info.outputPath(`bear-trap-${width}-rooted.png`), fullPage: true });
  const rooted = await buffs.innerText();
  await page.clock.runFor(4000);
  await expect(buffs).toHaveText(rooted);
  await page.getByTestId('arena-start').click();
  await page.clock.runFor(3500);
  await expect(buffs).not.toContainText('定身');
  await page.screenshot({ path: info.outputPath(`bear-trap-${width}-released.png`), fullPage: true });
  await page.locator('[data-speed="3"]').click();
  const result = page.locator('[data-result]');
  for (let i = 0; i < 620 && !await result.isVisible(); i++) await page.clock.fastForward(100);
  await expect(result).toBeVisible();
  await page.screenshot({ path: info.outputPath('bear-trap-result-desktop.png'), fullPage: true });
  await page.locator('[data-result-retry]').click();
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
  await expect(cardButton(page, scenario.card.id)).toHaveCount(1);
  if (width !== 1440) {
    const fighters = page.getByTestId('arena-fighters-toggle');
    if (await fighters.getAttribute('aria-expanded') !== 'true') await fighters.click();
    const detail = page.getByTestId('arena-detail-toggle');
    if (await detail.getAttribute('aria-expanded') !== 'true') await detail.click();
  }
  await page.locator(`[data-fighter="${scenario.caughtId}"]`).click();
  await expect(buffs).not.toContainText('定身');
  await expect(page.locator('[data-log]')).not.toContainText('踩中捕獸夾');
  expect(errors).toEqual([]);
  await context.close();
 });
}

for (const width of [320, 390]) {
  test(`捕獸夾 ${width}px 觸控預覽不付款、捲動取消、點地布置`, async ({ browser, baseURL }, info) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 740 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = observeErrors(page);
    await open(page);
    const state = await seek(page, state => state.hand.some(card => card.cardId === 'bear-trap'));
    info.annotations.push({ type: 'seed', description: String(state.seed) });
    const card = state.hand.find(card => card.cardId === 'bear-trap')!;
    await paused(page);
    await cardButton(page, card.id).tap();
    await page.getByTestId('arena-payment-toggle').tap();
    await expect(page.getByTestId('arena-payment')).toHaveAttribute('data-valid', 'true');
    const before = await inventory(page);
    const canvas = page.getByTestId('arena-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const point = project(0, 0, createProjection(box.width, box.height));
    const touch = await context.newCDPSession(page);
    const screen = { x: box.x + point.x, y: box.y + point.y };
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [screen] });
    await page.clock.runFor(32);
    await expect(page.getByTestId('arena-trap-preview')).toBeVisible();
    expect(await inventory(page)).toEqual(before);
    for (let step = 1; step <= 8; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: screen.x, y: screen.y - step * 12 }] });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.clock.runFor(32);
    expect(await inventory(page)).toEqual(before);
    await expect(cardButton(page, card.id)).toHaveCount(1);
    await canvas.scrollIntoViewIfNeeded();
    const nextBox = (await canvas.boundingBox())!;
    await canvas.tap({ position: project(0, 0, createProjection(nextBox.width, nextBox.height)) });
    await expect(cardButton(page, card.id)).toHaveCount(0);
    await expect(page.getByTestId('arena-feedback')).toContainText('捕獸夾');
    await expect(page.getByTestId('arena-feedback')).not.toContainText('刺洞');
    await expect(page.locator('[data-log]')).toContainText('已布置捕獸夾');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(canvas).toBeInViewport({ ratio: 1 });
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.getByTestId('arena-support-hud')).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: info.outputPath(`bear-trap-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
    await context.close();
  });
}
