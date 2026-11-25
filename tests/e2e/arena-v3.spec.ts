import { expect, test } from '@playwright/test';
import { openV3Fixture, isolateFighters } from './arena-v3-fixture';

for (const width of [1440, 320, 390]) {
  test(`V3 ${width}px 生命精度、不換行與象加值文案（工程fixture）`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 740 });
    const state = await openV3Fixture(page, state => {
      isolateFighters(state, 7);
      state.fighters[0].hp = 99.99;
      state.fighters[0].maxHp = 100;
      state.fighters[1].hp = 9.72;
    });
    const detail = page.getByTestId('arena-detail-toggle');
    if (width !== 1440 && await detail.getAttribute('aria-expanded') !== 'true') await detail.click();
    const roster = page.getByTestId('arena-fighters-toggle');
    if (width !== 1440 && await roster.getAttribute('aria-expanded') !== 'true') await roster.click();
    const hp = page.locator('[data-detail-hp]');
    await expect(hp).toHaveText('99.99 / 100');
    await expect(page.getByTestId('arena-support-hp')).toHaveText('99.99 / 100');
    const bar = page.locator('[data-support-health]');
    await expect(bar).toHaveAttribute('aria-valuenow', '99.99');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    await expect(page.locator(`[data-fighter="${state.fighters[1].id}"] [data-row-status]`)).toHaveText('9.72 HP');
    for (const node of [hp, page.getByTestId('arena-support-hp')]) {
      const metrics = await node.evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return { lines: range.getClientRects().length, width: element.clientWidth, content: element.scrollWidth };
      });
      expect(metrics.lines).toBe(1);
      expect(metrics.content).toBeLessThanOrEqual(metrics.width + 1);
    }
    await page.locator(`[data-fighter="${state.fighters[2].id}"]`).click();
    await expect(page.getByTestId('arena-trait')).toHaveText('持木棍近戰時，傷害增加 2 點。');
    await page.screenshot({ path: info.outputPath(`v3-${width}-hp-trait.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const [value, text] of [[100, '100'], [9.7, '9.7'], [10, '10'], [0.01, '0.01'], [0, '0']] as const) {
  test(`V3 生命 ${text} 去尾零（工程fixture）`, async ({ page }) => {
    await openV3Fixture(page, state => { state.fighters[0].hp = value; });
    await expect(page.locator('[data-detail-hp]')).toHaveText(`${text} / 100`);
    await expect(page.getByTestId('arena-support-hp')).toHaveText(`${text} / 100`);
    if (value > 0) await expect(page.getByTestId('arena-support-hud')).toHaveAttribute('data-state', 'alive');
  });
}

for (const reason of ['last-survivor', 'hp-ratio', 'draw'] as const) {
  test(`V3 ${reason} 終局理由與戰報（工程fixture）`, async ({ page }, info) => {
    const state = await openV3Fixture(page, state => {
      isolateFighters(state, reason === 'last-survivor' ? 1 : 2);
      state.time = reason === 'last-survivor' ? 12 : 299.9;
      if (reason === 'hp-ratio') state.fighters[1].hp = 75;
    });
    await page.getByTestId('arena-start').click();
    await page.clock.runFor(300);
    await expect(page.locator('[data-result]')).toBeVisible();
    if (reason === 'draw') {
      await expect(page.locator('[data-result-title]')).toHaveText('本場平局');
      await expect(page.locator('[data-result-copy]')).toContainText('時限裁決：最高剩餘生命比例同分，本場平局。');
      await expect(page.locator('[data-log]')).toContainText('最高剩餘生命比例同分');
    } else {
      await expect(page.locator('[data-result-title]')).toHaveText(`${state.fighters[0].name} 勝出`);
      await expect(page.locator('[data-result-copy]')).toContainText(reason === 'hp-ratio' ? '時限裁決：剩餘生命比例最高。' : '你的鬥士站到了最後。');
      await expect(page.locator('[data-log]')).toContainText(reason === 'hp-ratio' ? '時限裁決：剩餘生命比例最高' : '贏得競技場');
      if (reason === 'last-survivor') await expect(page.locator('[data-result-copy]')).not.toContainText('時限裁決');
    }
    if (reason !== 'last-survivor') await expect(page.getByTestId('arena-time')).toHaveText('05:00');
    await page.screenshot({ path: info.outputPath(`v3-result-${reason}.png`), fullPage: true });
  });
}

test('V3 完整失控三秒後恢復移動（工程fixture）', async ({ page }) => {
  await openV3Fixture(page, state => {
    isolateFighters(state, 2);
    state.fighters[0].pose = 'airborne';
    state.fighters[0].poseUntil = 0.35;
  });
  const pose = page.locator('[data-detail-pose]');
  await expect(pose).toHaveText('遭到擊飛');
  await page.getByTestId('arena-start').click();
  await page.clock.runFor(500);
  await expect(pose).toHaveText('倒地');
  await page.clock.runFor(2300);
  await expect(pose).toHaveText('正在起身');
  await page.clock.runFor(400);
  await expect(pose).toHaveText('尋找對手');
});
