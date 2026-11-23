import { expect, test } from '@playwright/test';
import { findPayment } from '../../src/arena/engine';
import { CARDS } from '../../src/arena/model';
import { createProjection, project } from '../../src/arena/projection';
import { observeErrors } from './helpers';
import { open, cardButton, inventory, paused, seek } from './arena-helpers';

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
