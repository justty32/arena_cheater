import { expect, type Page, type Locator } from '@playwright/test';
import { createArena } from '../../src/arena/engine';
import { type ArenaState } from '../../src/arena/model';

export async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-11-17T00:00:00Z') });
  await page.goto('/');
  // The document load event does not wait for the mode’s dynamic import.
  await expect(page.getByTestId('arena-canvas')).toBeVisible({ timeout: 15_000 });
  await page.clock.pauseAt(new Date('2026-11-17T01:00:00Z'));
}
export const hand = (page: Page) => page.locator('button[data-hand-card]');
export const stones = (page: Page) => page.locator('button[data-stone]');
export const cardButton = (page: Page, id: number) => page.locator(`button[data-hand-card="${id}"]`);
export const nearGateFighter = (state: ArenaState, side: -1 | 1) =>
  state.fighters.find(fighter => fighter.y > 0 && fighter.x * side > 1)!;
export async function inventory(page: Page) {
  return { hand: await hand(page).evaluateAll(es => es.map(e => e.getAttribute('data-hand-card'))), stones: await stones(page).evaluateAll(es => es.map(e => e.getAttribute('data-stone'))) };
}
export async function paused(page: Page) {
  await page.getByTestId('arena-start').click();
  await page.getByTestId('arena-start').click();
}
export async function center(page: Page) {
  const canvas = page.getByTestId('arena-canvas');
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
}
export async function dragCard(page: Page, card: Locator, destination: { x: number; y: number }) {
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 8 });
  await page.mouse.up();
}
export async function seek(page: Page, predicate: (state: ArenaState) => boolean) {
  let seed = 73021;
  while (!predicate(createArena(seed))) {
    expect(seed).toBeLessThan(73121);
    await page.getByTestId('arena-reset').click();
    seed++;
  }
  return createArena(seed);
}
