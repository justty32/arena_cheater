import { expect, test } from '@playwright/test';
import { clockSeconds, observeErrors, openArena } from './helpers';

test('雙方對戰可開始、暫停、切換倍速及重置', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await openArena(page);
  await expect(page.locator('.board-cell')).toHaveCount(64);
  await expect(page.locator('.unit-piece')).toHaveCount(6);
  await expect(page.getByTestId('start-button')).toHaveText('開始戰鬥');
  await expect(page.getByTestId('cheat-button')).toBeDisabled();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    const start = await page.getByTestId('start-button').boundingBox();
    expect(start).not.toBeNull();
    expect(start!.y + start!.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width === 1440) {
      const board = await page.getByTestId('board').boundingBox();
      expect(board!.width).toBeGreaterThanOrEqual(800);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('desktop-compact.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('desktop-ready.png'), fullPage: true });

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
  await page.getByRole('button', { name: '3 倍速', exact: true }).click();
  await expect(page.getByRole('button', { name: '3 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('reset-button').click();
  await expect(page.getByTestId('battle-time')).toHaveText('00:00');
  await expect(page.getByTestId('start-button')).toHaveText('開始戰鬥');
  expect(errors).toEqual([]);
});

test('慢速按鈕調整遊戲時間並在重置與切換模式後保留', async ({ page }) => {
  const errors = observeErrors(page);
  await openArena(page);
  await page.getByRole('button', { name: '0.25 倍速', exact: true }).click();
  await page.getByTestId('start-button').click();
  await page.clock.runFor(8_000);
  const quarterTime = await clockSeconds(page);
  expect(quarterTime).toBeGreaterThanOrEqual(1);
  expect(quarterTime).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: '0.5 倍速', exact: true }).click();
  await page.clock.runFor(8_000);
  const halfElapsed = await clockSeconds(page) - quarterTime;
  expect(halfElapsed).toBeGreaterThanOrEqual(3);
  expect(halfElapsed).toBeLessThanOrEqual(4);
  await page.getByTestId('start-button').click();
  const pausedTime = await clockSeconds(page);
  await page.clock.runFor(1_000);
  expect(await clockSeconds(page)).toBe(pausedTime);
  await page.getByTestId('reset-button').click();
  await expect(page.getByRole('button', { name: '0.5 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-mode="melee"]').click();
  await expect(page.getByRole('button', { name: '0.5 倍速', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('受傷友軍可接受偷渡藥劑，消耗影響力並恢復生命', async ({ page }, testInfo) => {
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
  await page.screenshot({ path: testInfo.outputPath('desktop-cheat.png'), fullPage: true });
  expect(errors).toEqual([]);
});

for (const mode of ['duel', 'melee']) {
  test(`${mode === 'duel' ? '雙方' : '四方'}對戰可完成結算與再戰`, async ({ page }, testInfo) => {
    const errors = observeErrors(page);
    await openArena(page);
    await page.locator(`[data-mode="${mode}"]`).click();
    await expect(page.locator('.unit-piece')).toHaveCount(mode === 'duel' ? 6 : 12);
    await page.getByRole('button', { name: '3 倍速', exact: true }).click();
    await page.getByTestId('start-button').click();
    for (let step = 0; step < 20; step += 1) {
      await page.clock.runFor(4_000);
      if (await page.locator('#battle-result').isVisible()) break;
    }
    await expect(page.locator('#battle-result')).toBeVisible();
    await expect(page.locator('#result-title')).not.toBeEmpty();
    await expect(page.getByTestId('cheat-button')).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath(`${mode}-result.png`), fullPage: true });
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('battle-time')).toHaveText('00:00');
    await expect(page.getByTestId('start-button')).toHaveText('暫停戰鬥');
    expect(errors).toEqual([]);
  });
}

test('手機版棋盤與控制不橫向溢位，支援觸控操作', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = observeErrors(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByTestId('board')).toBeVisible();
  await expect(page.locator('.board-cell')).toHaveCount(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const board = await page.getByTestId('board').boundingBox();
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(0);
  expect(board!.x + board!.width).toBeLessThanOrEqual(390);
  await page.getByTestId('start-button').tap();
  await expect(page.getByTestId('start-button')).toHaveText('暫停戰鬥');
  for (const speed of [0.25, 0.5, 1, 2, 3]) {
    const button = page.getByRole('button', { name: `${speed} 倍速`, exact: true });
    await button.tap();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('start-button').tap();
  await page.screenshot({ path: testInfo.outputPath('mobile-battle.png'), fullPage: true });
  expect(errors).toEqual([]);
  await context.close();
});
