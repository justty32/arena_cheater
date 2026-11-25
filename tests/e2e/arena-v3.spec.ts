import { expect, test, type Page } from '@playwright/test';
import type { ArenaState } from '../../src/arena/model';
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


for (const width of [1440, 320, 390]) {
  test(`V3 ${width}px 滿生命 100 / 100 單行（工程fixture）`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 740 });
    await openV3Fixture(page, state => { state.fighters[0].hp = state.fighters[0].maxHp = 100; });
    const toggle = page.getByTestId('arena-detail-toggle');
    if (width !== 1440 && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    for (const node of [page.locator('[data-detail-hp]'), page.getByTestId('arena-support-hp')]) {
      await expect(node).toBeVisible();
      await expect(node).toHaveText('100 / 100');
      const metrics = await node.evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return { lines: range.getClientRects().length, width: element.clientWidth, content: element.scrollWidth };
      });
      expect(metrics.lines).toBe(1);
      expect(metrics.content).toBeLessThanOrEqual(metrics.width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('V3 全滅平局標題、理由與戰報（工程fixture）', async ({ page }) => {
  await openV3Fixture(page, state => { isolateFighters(state, 0); });
  await page.getByTestId('arena-start').click();
  await page.clock.runFor(100);
  await expect(page.locator('[data-result]')).toBeVisible();
  await expect(page.locator('[data-result-title]')).toHaveText('本場平局');
  await expect(page.locator('[data-result-copy]')).toHaveText('競技場從不保證公平。下一場，換你改寫結局。重試會保留起手牌與入場位置。');
  await expect(page.locator('[data-log]')).toContainText('本場平局');
  await expect(page.locator('[data-alive]')).toHaveText('0');
  await expect(page.getByTestId('arena-time')).toHaveText('00:00');
});

// The optional response-only getter returns a detached copy: tests cannot mutate the live state.
async function v3Snapshot(page: Page): Promise<ArenaState> {
  return page.evaluate(() => (window as typeof window & { __qaV3Snapshot: () => ArenaState }).__qaV3Snapshot());
}

test('V3 正式木棍命中觸發三秒失控，起身後恢復位移（開局工程fixture）', async ({ page }) => {
  await openV3Fixture(page, state => {
    isolateFighters(state, 2);
    state.items = [];
    const [target, attacker] = state.fighters;
    target.x = 0; target.y = 0; target.shield = false;
    attacker.x = target.radius + attacker.radius + 0.05; attacker.y = 0;
    attacker.facing = Math.PI; attacker.weapon = 'club'; attacker.durability = 1;
    attacker.nextAttack = 0; attacker.speed = 0;
  }, true);
  const pose = page.locator('[data-detail-pose]');
  await expect(pose).toHaveText('伺機而動');
  const initial = await v3Snapshot(page);
  await page.getByTestId('arena-start').click();
  let snapshot = await v3Snapshot(page);
  for (let frame = 0; frame < 125 && snapshot.fighters[0].pose !== 'airborne'; frame++) {
    await page.clock.runFor(16);
    snapshot = await v3Snapshot(page);
  }
  const launched = snapshot.fighters[0];
  expect(launched.pose).toBe('airborne');
  expect(launched.hp).toBeLessThan(initial.fighters[0].hp);
  expect(launched.knockback).toBeDefined();
  expect(snapshot.fighters[1].weapon).toBe('fists');
  await expect(pose).toHaveText('遭到擊飛');
  const launchTime = launched.knockback!.start;
  async function afterLaunch(seconds: number) {
    // Advance the real browser RAF; only read state to place assertions on simulation time.
    for (let frame = 0; snapshot.time < launchTime + seconds && frame < 250; frame++) {
      await page.clock.runFor(16);
      snapshot = await v3Snapshot(page);
    }
    expect(snapshot.time - launchTime + 1e-9).toBeGreaterThanOrEqual(seconds);
    expect(snapshot.time - launchTime).toBeLessThan(seconds + 0.04);
    return snapshot.fighters[0];
  }
  expect((await afterLaunch(0.30)).pose).toBe('airborne');
  const fallen = await afterLaunch(0.40);
  expect(fallen.pose).toBe('fallen');
  await expect(pose).toHaveText('倒地');
  const rising = await afterLaunch(2.70);
  expect(rising.pose).toBe('rising');
  await expect(pose).toHaveText('正在起身');
  const held = await afterLaunch(2.95);
  expect(held.pose).toBe('rising');
  expect(held.x).toBeCloseTo(fallen.x, 8);
  expect(held.y).toBeCloseTo(fallen.y, 8);
  expect(held.lastMoved).toBe(fallen.lastMoved);
  const recovered = await afterLaunch(3.05);
  expect(recovered.pose).toBe('walk');
  expect(recovered.lastMoved - launchTime).toBeGreaterThanOrEqual(3);
  expect(Math.hypot(recovered.x - held.x, recovered.y - held.y)).toBeGreaterThan(0.001);
  await expect(pose).toHaveText('尋找對手');
});
