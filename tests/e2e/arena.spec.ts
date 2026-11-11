import { expect, test } from '@playwright/test';
import { observeErrors } from './helpers';

async function open(page: import('@playwright/test').Page) {
  await page.clock.install({ time: new Date('2026-11-11T00:00:00Z') });
  await page.goto('/');
  await expect(page.getByTestId('arena-canvas')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-11T01:00:00Z'));
}

test('圓場卡牌、暫停、倍速與重開可操作', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await open(page);
  await expect(page.locator('[data-card]')).toHaveCount(7);
  await expect(page.locator('[data-fighter]')).toHaveCount(7);
  await page.screenshot({ path: testInfo.outputPath('arena-desktop.png'), fullPage: true });
  await page.getByTestId('arena-start').click();
  await page.locator('[data-card="fury"]').click();
  await page.locator('[data-fighter]').first().click();
  await expect(page.getByTestId('arena-feedback')).toContainText('怪力');
  await expect(page.getByTestId('arena-mana')).toContainText('56');
  await page.clock.runFor(2000);
  await page.getByTestId('arena-start').click();
  const time = await page.getByTestId('arena-time').innerText();
  const mana = await page.getByTestId('arena-mana').innerText();
  await page.clock.runFor(2000);
  await expect(page.getByTestId('arena-time')).toHaveText(time);
  await expect(page.getByTestId('arena-mana')).toHaveText(mana);
  await page.getByTestId('arena-start').click();
  await page.locator('[data-card="sword"]').click();
  const canvas = page.getByTestId('arena-canvas');
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(page.getByTestId('arena-feedback')).toContainText('直劍');
  await page.clock.runFor(1500);
  await page.screenshot({ path: testInfo.outputPath('arena-playing.png'), fullPage: true });
  await page.getByTestId('arena-reset').click();
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
  expect(errors).toEqual([]);
});

test('窄畫面沒有橫向溢出且卡牌可觸控選取', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('arena-start').click();
  await page.locator('[data-card="haste"]').click();
  await page.locator('[data-fighter]').first().click();
  await expect(page.getByTestId('arena-feedback')).toContainText('興奮');
  await page.screenshot({ path: testInfo.outputPath('arena-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('拖曳卡牌取消不扣費，投進場內只扣一次', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  await page.getByTestId('arena-start').click();
  const card = page.locator('[data-card="shield"]');
  await card.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();
  const canvasBox = await page.getByTestId('arena-canvas').boundingBox();
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('arena-gold')).toHaveText('75');
  await expect(page.getByTestId('arena-feedback')).toContainText('取消');
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('arena-gold')).toHaveText('55');
  await expect(page.getByTestId('arena-feedback')).toContainText('圓盾');
  expect(errors).toEqual([]);
});

test('手機從卡面水平滑動可看到後方卡牌', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  const hand = page.locator('.arena-cards');
  await hand.scrollIntoViewIfNeeded();
  const box = await hand.boundingBox();
  const x = box!.x + box!.width - 25;
  const y = box!.y + box!.height / 2;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 25, y }] });
    await page.waitForTimeout(20);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => hand.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(page.getByTestId('arena-gold')).toHaveText('75');
  await context.close();
});
