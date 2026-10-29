import { expect, test, type Locator, type Page } from '@playwright/test';
import { observeErrors, openArena } from './helpers';

async function findProjectile(page: Page, kind: string, fresh = false): Promise<Locator> {
  for (let step = 0; step < 160; step += 1) {
    const projectiles = page.locator(`.projectile[data-kind="${kind}"]`);
    for (let index = 0; index < await projectiles.count(); index += 1) {
      const projectile = projectiles.nth(index);
      const progress = Number(await projectile.getAttribute('data-progress'));
      if (!fresh || progress < 0.35) {
        const id = await projectile.getAttribute('data-testid');
        expect(id).toBeTruthy();
        return page.getByTestId(id!);
      }
    }
    await page.clock.runFor(50);
  }
  throw new Error(`未看到 ${kind} 投射物`);
}

async function findImpact(page: Page, kind?: string): Promise<Locator> {
  for (let step = 0; step < 120; step += 1) {
    const impacts = page.locator(kind ? `.impact-effect[data-kind="${kind}"]` : '.impact-effect:not(.heal)');
    for (let index = 0; index < await impacts.count(); index += 1) {
      const impact = impacts.nth(index);
      if (Number(await impact.getAttribute('data-progress')) < 0.25) {
        const id = await impact.getAttribute('data-testid');
        if (id) return page.getByTestId(id);
      }
    }
    await page.clock.runFor(50);
  }
  throw new Error('未看到命中特效與傷害數字');
}

async function expectReadableProjectile(projectile: Locator, minimumSize: number): Promise<void> {
  await expect(projectile).toBeVisible();
  const bounds = await projectile.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.max(bounds!.width, bounds!.height)).toBeGreaterThan(minimumSize);
}

test('箭矢與火球可辨讀，投射物與目標指示隨暫停及倍速同步', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await openArena(page);
  await page.getByTestId('start-button').click();
  const arrow = await findProjectile(page, 'arrow');
  await expectReadableProjectile(arrow, 12);
  await page.screenshot({ path: testInfo.outputPath('desktop-arrow.png'), fullPage: true });

  const fireball = await findProjectile(page, 'fireball', true);
  await expectReadableProjectile(fireball, 12);
  const source = await fireball.getAttribute('data-source');
  const target = await fireball.getAttribute('data-target');
  expect(source).toBeTruthy();
  expect(target).toBeTruthy();
  await page.getByTestId(`unit-${source}`).click();
  await expect(page.locator('#unit-target')).not.toBeEmpty();
  const targetLine = page.locator(`.target-line[data-source="${source}"][data-target="${target}"][data-selected="true"]`);
  // An axis-aligned SVG path has a zero-area bounding box even when its stroke is visible.
  await expect(targetLine).toBeAttached();
  expect(await targetLine.evaluate((element) => {
    const style = getComputedStyle(element);
    return (element as SVGPathElement).getTotalLength() > 0 && Number.parseFloat(style.strokeWidth) > 0
      && Number(style.opacity) > 0 && style.visibility === 'visible' && style.display !== 'none';
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('desktop-fireball.png'), fullPage: true });

  await page.getByTestId('start-button').click();
  const pausedTransform = await fireball.getAttribute('transform');
  const pausedProgress = Number(await fireball.getAttribute('data-progress'));
  await page.clock.runFor(1_200);
  expect(await fireball.getAttribute('transform')).toBe(pausedTransform);
  expect(Number(await fireball.getAttribute('data-progress'))).toBe(pausedProgress);

  await page.getByRole('button', { name: '0.25 倍速', exact: true }).click();
  await page.getByTestId('start-button').click();
  await page.clock.runFor(160);
  const quarterProgress = Number(await fireball.getAttribute('data-progress'));
  expect(quarterProgress).toBeGreaterThan(pausedProgress);
  await page.getByRole('button', { name: '0.5 倍速', exact: true }).click();
  await page.clock.runFor(160);
  const halfProgress = Number(await fireball.getAttribute('data-progress'));
  expect(halfProgress - quarterProgress).toBeGreaterThan(quarterProgress - pausedProgress);

  await page.getByRole('button', { name: '2 倍速', exact: true }).click();
  await page.clock.runFor(32);
  const twiceProgress = Number(await fireball.getAttribute('data-progress'));
  expect(twiceProgress).toBeGreaterThan(pausedProgress);
  expect(await fireball.getAttribute('transform')).not.toBe(pausedTransform);
  await page.getByRole('button', { name: '3 倍速', exact: true }).click();
  await page.clock.runFor(32);
  const thriceProgress = Number(await fireball.getAttribute('data-progress'));
  expect(thriceProgress).toBeGreaterThan(twiceProgress);
  expect(thriceProgress - twiceProgress).toBeGreaterThanOrEqual(twiceProgress - halfProgress - 0.02);

  await findImpact(page);
  await expect(page.locator('.damage-number:not(.healing)').first()).toContainText(/\d/);
  await page.screenshot({ path: testInfo.outputPath('desktop-impact.png'), fullPage: true });
  const slash = await findImpact(page, 'slash');
  const struckId = await slash.getAttribute('data-target');
  await expect(page.getByTestId(`unit-${struckId}`)).toHaveClass(/hit/);
  await expect(slash.locator('.damage-number')).toContainText(/\d/);
  await page.screenshot({ path: testInfo.outputPath('desktop-melee.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('手機畫面可辨認飛行火球與傷害數字', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openArena(page);
  await page.getByTestId('start-button').click();
  const fireball = await findProjectile(page, 'fireball');
  await expectReadableProjectile(fireball, 8);
  await page.screenshot({ path: testInfo.outputPath('mobile-fireball.png'), fullPage: true });
  await findImpact(page);
  await expect(page.locator('.damage-number:not(.healing)').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-impact.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('降低動態效果時仍顯示飛行物、命中與傷害資訊', async ({ page }, testInfo) => {
  const errors = observeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openArena(page);
  await page.getByTestId('start-button').click();
  const fireball = await findProjectile(page, 'fireball');
  await expectReadableProjectile(fireball, 12);
  await findImpact(page);
  await expect(page.locator('.impact-effect').first()).toBeVisible();
  await expect(page.locator('.damage-number:not(.healing)').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reduced-motion-impact.png'), fullPage: true });
  expect(errors).toEqual([]);
});
