import { expect, test } from '@playwright/test';
import { createArena, toggleArena, advanceArena } from '../../src/arena/engine';
import { type ArenaState } from '../../src/arena/model';
import { createProjection, project } from '../../src/arena/projection';
import { observeErrors } from './helpers';
import { open, hand, stones, cardButton, paused, seek } from './arena-helpers';

test('工程事件fixture：結算層接住舊觸控不重開，新手勢與鍵盤可重開', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await open(page);
  // DOM-only event fixture: freeze RAF and reveal the real overlay between touchStart and touchEnd.
  // This isolates browser click retargeting; it is not evidence of a naturally completed battle.
  const overlay = page.locator('[data-result]');
  const restart = page.locator('[data-result-reset]');
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await restart.scrollIntoViewIfNeeded();
  const box = await restart.boundingBox();
  const point = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  await restart.evaluate((button: HTMLElement) => {
    button.addEventListener('click', () => { button.dataset.fixtureClick = 'received'; });
  });
  await overlay.evaluate((element: HTMLElement) => { element.hidden = true; });
  const round = await page.locator('[data-round]').innerText();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(restart).toHaveAttribute('data-fixture-click', 'received');
  await expect(page.locator('[data-round]')).toHaveText(round);
  await restart.tap();
  await expect(page.locator('[data-round]')).not.toHaveText(round);
  const nextRound = await page.locator('[data-round]').innerText();
  await overlay.evaluate((element: HTMLElement) => { element.hidden = false; });
  await restart.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-round]')).not.toHaveText(nextRound);
  await context.close();
});

test('真實結算防止舊手勢，重試保留開局與支持，新局仍向前', async ({ page }) => {
  // This case plays two full battles through the browser before checking the result controls.
  test.setTimeout(90_000);
  const errors = observeErrors(page);
  await open(page);
  const opening = await seek(page, state => state.hand.some(card => card.cardId === 'spear'));
  const spear = opening.hand.find(card => card.cardId === 'spear')!;
  const supported = opening.fighters.find(fighter => fighter.y > 6 && Math.abs(fighter.x) < 1)!;
  const start = page.getByTestId('arena-start');
  const result = page.locator('[data-result]');
  const round = page.locator('[data-round]');
  const timer = page.getByTestId('arena-time');
  const canvas = page.getByTestId('arena-canvas');
  const hud = page.getByTestId('arena-support-hud');
  const recent = page.getByTestId('arena-recent-throw');
  const row = (id: string) => page.locator(`[data-fighter="${id}"]`);
  const dealt = async () => ({
    cards: await hand(page).evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.card)),
    colors: await stones(page).evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.color)),
  });
  async function inspectGate(fighter: ArenaState['fighters'][number]) {
    const box = (await canvas.boundingBox())!;
    const projection = createProjection(box.width, box.height);
    const point = project(fighter.x, fighter.y, projection);
    await canvas.click({ position: { x: point.x, y: point.y - projection.scale * .75 } });
    await expect(row(fighter.id)).toHaveAttribute('aria-pressed', 'true');
  }

  async function advanceToResult() {
    // Each jump runs at most one frame, and 100 ms fits the simulation frame delta cap.
    for (let elapsed = 0; elapsed < 61_000; elapsed += 100) {
      await page.clock.fastForward(100);
      if ((elapsed + 100) % 1000 === 0 && await result.isVisible()) return;
    }
    throw new Error('3× 戰鬥推進 61 秒測試時鐘後仍未結算');
  }

  const firstRound = await round.innerText();
  const firstDeal = await dealt();
  await row(supported.id).click();
  await page.locator('[data-support]').click();
  await expect(hud).toHaveAttribute('data-fighter-id', supported.id);
  const tripleSpeed = page.locator('[data-speed="3"]');
  await tripleSpeed.click();
  await paused(page);
  await cardButton(page, spear.id).click();
  const forecast = createArena(opening.seed);
  toggleArena(forecast);
  advanceArena(forecast, .55);
  const destination = forecast.fighters.find(fighter => fighter.id === supported.id)!;
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: project(destination.x, destination.y, createProjection(box.width, box.height)) });
  await expect(cardButton(page, spear.id)).toHaveCount(0);
  await expect(stones(page)).toHaveCount(firstDeal.colors.length + 1);
  await start.click();
  for (let i = 0; i < 10 && await recent.getAttribute('data-phase') !== 'picked-up'; i++) await page.clock.runFor(100);
  await expect(recent).toHaveAttribute('data-phase', 'picked-up');
  const pickerId = (await recent.getAttribute('data-picker-id'))!;
  await row(pickerId).click();
  await expect(page.getByTestId('arena-equipment')).toContainText('長矛');

  const firstCard = hand(page).first();
  await firstCard.click();
  await expect(firstCard).toHaveAttribute('aria-pressed', 'true');
  const unselectedStones = stones(page).and(page.locator('[aria-pressed="false"]'));
  const stone = await unselectedStones.count() ? unselectedStones.first() : stones(page).first();
  const stoneId = await stone.getAttribute('data-stone');
  const wasSelected = await stone.getAttribute('aria-pressed');
  await stone.click();
  await expect(page.locator(`[data-stone="${stoneId}"]`)).toHaveAttribute('aria-pressed', String(wasSelected !== 'true'));

  await start.scrollIntoViewIfNeeded();
  const startBox = (await start.boundingBox())!;
  await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
  await page.mouse.down();
  await advanceToResult();
  await page.mouse.up();
  await expect(result).toBeVisible();
  await expect(round).toHaveText(firstRound);
  await expect(start).toHaveText('直接開新局');
  await expect(timer).not.toHaveText('00:00');
  const pressed = page.locator('[aria-pressed="true"]');
  await expect(hand(page).or(stones(page)).and(pressed)).toHaveCount(0);
  await page.keyboard.press('1');
  await expect(hand(page).and(pressed)).toHaveCount(0);

  const retry = page.locator('[data-result-retry]');
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(result).toBeHidden();
  await expect(start).toBeFocused();
  await expect(page.locator('[data-status]')).toHaveText('入場就緒');
  await expect(round).toHaveText(firstRound);
  await expect(timer).toHaveText('00:00');
  await expect(hud).toHaveAttribute('data-fighter-id', supported.id);
  await expect(tripleSpeed).toHaveAttribute('aria-pressed', 'true');
  expect(await dealt()).toEqual(firstDeal);
  await expect(hand(page).or(stones(page)).and(pressed)).toHaveCount(0);
  await expect(recent).toBeHidden();
  await inspectGate(opening.fighters.find(fighter => fighter.id !== supported.id)!);
  await row(pickerId).click();
  await expect(page.getByTestId('arena-equipment')).toHaveText('徒手');
  await expect(page.locator('[data-alive]')).toHaveText(String(opening.fighters.length));

  await start.focus();
  await page.keyboard.press('Enter');
  await expect(start).toContainText('暫停');
  await page.keyboard.press('Space');
  await expect(start).toContainText('繼續');
  const pausedTime = await timer.innerText();
  await page.clock.runFor(300);
  await expect(timer).toHaveText(pausedTime);
  await page.keyboard.press('Space');
  await expect(start).toContainText('暫停');

  await page.keyboard.down('Space');
  await advanceToResult();
  await page.keyboard.down('Space'); // A repeat must retain the initial running intent.
  await page.keyboard.up('Space');
  await expect(result).toBeVisible();
  await expect(round).toHaveText(firstRound);
  await expect(start).toHaveText('直接開新局');

  await start.click();
  const next = createArena(opening.seed + 1);
  const nextRound = Number(firstRound.match(/\d+/)![0]) + 1;
  await expect(result).toBeHidden();
  await expect(round).toHaveText(`第 ${String(nextRound).padStart(2, '0')} 場`);
  await expect(page.locator('[data-status]')).toHaveText('激戰中');
  await expect(start).toContainText('暫停');
  await expect(timer).toHaveText('00:00');
  await expect(hud).toHaveAttribute('data-fighter-id', next.supportedId);
  await expect(tripleSpeed).toHaveAttribute('aria-pressed', 'true');
  expect(await dealt()).toEqual({
    cards: next.hand.map(card => card.cardId),
    colors: next.stones.map(stone => stone.color),
  });
  await inspectGate(next.fighters.find(fighter => fighter.id !== next.supportedId)!);
  expect(errors).toEqual([]);
});
