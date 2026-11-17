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

async function findImpact(page: Page): Promise<Locator> {
  for (let step = 0; step < 120; step += 1) {
    const impacts = page.locator('.impact-effect:not(.heal)');
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

test('投射物演出可暫停、續飛並顯示命中資訊', async ({ page }) => {
  const errors = observeErrors(page);
  await openArena(page);
  await page.getByTestId('start-button').click();
  const projectile = await findProjectile(page, 'fireball', true);
  await expect(projectile).toBeVisible();
  await page.getByTestId('start-button').click();
  const pausedTransform = await projectile.getAttribute('transform');
  await page.clock.runFor(1200);
  expect(await projectile.getAttribute('transform')).toBe(pausedTransform);
  await page.getByTestId('start-button').click();
  await page.clock.runFor(32);
  await expect(projectile).toBeVisible();
  expect(await projectile.getAttribute('transform')).not.toBe(pausedTransform);
  await findImpact(page);
  await expect(page.locator('.damage-number:not(.healing)').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('降低動態效果時仍顯示飛行物、命中與傷害資訊', async ({ page }) => {
  const errors = observeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openArena(page);
  await page.getByTestId('start-button').click();
  const fireball = await findProjectile(page, 'fireball');
  await expect(fireball).toBeVisible();
  await findImpact(page);
  await expect(page.locator('.impact-effect').first()).toBeVisible();
  await expect(page.locator('.damage-number:not(.healing)').first()).toBeVisible();
  expect(errors).toEqual([]);
});
