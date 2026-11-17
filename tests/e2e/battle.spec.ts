import { expect, test } from '@playwright/test';
import { clockSeconds, observeErrors, openArena } from './helpers';

test('雙方對戰可開始、暫停、切換倍速及重置', async ({ page }) => {
  const errors = observeErrors(page);
  await openArena(page);
  await expect(page.locator('.board-cell')).toHaveCount(64);
  await expect(page.locator('.unit-piece')).toHaveCount(6);
  await expect(page.getByTestId('start-button')).toHaveText('開始戰鬥');
  await expect(page.getByTestId('cheat-button')).toBeDisabled();
  await page.getByTestId('start-button').click();
  await page.clock.runFor(2_000);
  expect(await clockSeconds(page)).toBeGreaterThanOrEqual(1);
  await page.getByTestId('start-button').click();
  const pausedTime = await clockSeconds(page);
  const pausedHealth = await page.locator('.unit-piece').evaluateAll((units) => units.map((unit) => unit.getAttribute('data-hp')));
  await page.clock.runFor(2_000);
  expect(await page.locator('.unit-piece').evaluateAll((units) => units.map((unit) => unit.getAttribute('data-hp')))).toEqual(pausedHealth);
  expect(await clockSeconds(page)).toBe(pausedTime);
  await expect(page.getByTestId('start-button')).toHaveText('繼續戰鬥');

  await page.getByRole('button', { name: '2 倍速', exact: true }).click();
  await expect(page.getByRole('button', { name: '2 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start-button').click();
  await page.clock.runFor(2_000);
  expect(await clockSeconds(page) - pausedTime).toBeGreaterThanOrEqual(3);
  await page.getByTestId('reset-button').click();
  await expect(page.getByTestId('battle-time')).toHaveText('00:00');
  await expect(page.getByTestId('start-button')).toHaveText('開始戰鬥');
  await expect(page.getByRole('button', { name: '2 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-mode="melee"]').click();
  await expect(page.getByRole('button', { name: '2 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.unit-piece')).toHaveCount(12);
  expect(errors).toEqual([]);
});

test('受傷友軍可接受偷渡藥劑，消耗影響力並恢復生命', async ({ page }) => {
  const errors = observeErrors(page);
  await openArena(page);
  await page.getByTestId('start-button').click();
  let woundedId: string | null = null;
  for (let step = 0; step < 30 && !woundedId; step += 1) {
    await page.clock.runFor(500);
    woundedId = await page.locator('.unit-piece[data-team="0"]').evaluateAll((units) => {
      const wounded = units.find((unit) => {
        const hp = Number(unit.getAttribute('data-hp'));
        return hp > 0 && hp < Number(unit.getAttribute('data-max-hp'));
      });
      return wounded?.getAttribute('data-testid') ?? null;
    });
  }
  expect(woundedId).not.toBeNull();
  const unit = page.getByTestId(woundedId!);
  await unit.click();
  await expect(page.getByTestId('cheat-button')).toBeEnabled();
  const beforeHp = Number(await unit.getAttribute('data-hp'));
  const maxHp = Number(await unit.getAttribute('data-max-hp'));
  const beforeInfluence = Number((await page.getByTestId('influence-value').innerText()).split('/')[0].trim());
  await page.getByTestId('cheat-button').click();
  const afterHp = Number(await unit.getAttribute('data-hp'));
  const afterInfluence = Number((await page.getByTestId('influence-value').innerText()).split('/')[0].trim());
  expect(afterHp).toBeCloseTo(Math.min(maxHp, beforeHp + 28), 1);
  expect(beforeInfluence - afterInfluence).toBe(35);
  await expect(page.locator('#battle-log')).toContainText('藥劑');
  expect(errors).toEqual([]);
});

test('四方對戰可完成結算與再戰', async ({ page }) => {
  const errors = observeErrors(page);
  await openArena(page);
  await page.locator('[data-mode="melee"]').click();
  await expect(page.locator('.unit-piece')).toHaveCount(12);
  await page.getByRole('button', { name: '3 倍速', exact: true }).click();
  await page.getByTestId('start-button').click();
  for (let step = 0; step < 20; step += 1) {
    await page.clock.runFor(4_000);
    if (await page.locator('#battle-result').isVisible()) break;
  }
  await expect(page.locator('#battle-result')).toBeVisible();
  await expect(page.locator('#result-title')).not.toBeEmpty();
  await expect(page.getByTestId('cheat-button')).toBeDisabled();
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('battle-time')).toHaveText('00:00');
  await expect(page.getByTestId('start-button')).toHaveText('暫停戰鬥');
  expect(errors).toEqual([]);
});

test('手機版棋盤與控制不橫向溢位，支援觸控操作', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto('/?prototype=classic');
  await expect(page.getByTestId('board')).toBeVisible();
  await expect(page.locator('.board-cell')).toHaveCount(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const board = await page.getByTestId('board').boundingBox();
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(0);
  expect(board!.x + board!.width).toBeLessThanOrEqual(390);
  await page.getByTestId('start-button').tap();
  await expect(page.getByTestId('start-button')).toHaveText('暫停戰鬥');
  await page.getByRole('button', { name: '2 倍速', exact: true }).tap();
  await expect(page.getByRole('button', { name: '2 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('battle-time')).toBeVisible();
  await page.locator('.unit-piece').first().tap();
  await expect(page.getByTestId('selected-hp')).toBeVisible();
  await expect(page.getByTestId('selected-hp')).not.toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('start-button').tap();
  expect(errors).toEqual([]);
  await context.close();
});
