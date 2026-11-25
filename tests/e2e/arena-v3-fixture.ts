import { expect, type Page } from '@playwright/test';
import { createArena } from '../../src/arena/engine';
import type { ArenaState } from '../../src/arena/model';
import { open } from './arena-helpers';

// Browser-only engineering fixture. Patch the session module response, never files or DOM output.
// The real mount, simulation loop and HUD consume this state; it is not a naturally reached battle.
export async function openV3Fixture(page: Page, prepare: (state: ArenaState) => void, observe = false) {
  const state = createArena(73021);
  prepare(state);
  let injected = 0;
  await page.route(/\/src\/arena\/ui\/arena-session\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const source = await response.text();
    const marker = /const state = createArena\(73021\);/;
    expect(source.match(new RegExp(marker.source, 'g'))).toHaveLength(1);
    const observation = observe ? '\nwindow.__qaV3Snapshot = () => JSON.parse(JSON.stringify(state));' : '';
    await route.fulfill({ response, body: source.replace(marker, match => `${match}\nObject.assign(state, ${JSON.stringify(state)});${observation}`) });
    injected++;
  });
  await open(page);
  expect(injected).toBe(1);
  return state;
}

export function isolateFighters(state: ArenaState, count: number) {
  state.fighters.forEach((fighter, index) => {
    fighter.hp = index < count ? fighter.maxHp : 0;
    fighter.pose = index < count ? 'idle' : 'dead';
    fighter.nextAttack = 1000;
    fighter.x = index === 0 ? -5 : 5;
    fighter.y = 0;
  });
}
