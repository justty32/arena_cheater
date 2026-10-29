import { expect, type Page } from '@playwright/test';

const clockStart = new Date('2026-10-29T00:00:00Z');

export async function openArena(page: Page): Promise<void> {
  await page.clock.install({ time: clockStart });
  await page.goto('/');
  await expect(page.getByTestId('board')).toBeVisible();
  await page.clock.pauseAt(new Date(clockStart.getTime() + 3_600_000));
}

export function observeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function clockSeconds(page: Page): Promise<number> {
  const text = await page.getByTestId('battle-time').innerText();
  const [minutes, seconds] = text.split(':').map(Number);
  return minutes * 60 + seconds;
}
