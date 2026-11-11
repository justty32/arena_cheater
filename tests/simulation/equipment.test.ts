import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/arena/engine';
import { advanceItems, playCard } from '../../src/arena/engine-items';
import { canEquip, equip } from '../../src/arena/equipment';
import { sweptCircleTime } from '../../src/arena/geometry';
import type { ThrownItem, Weapon } from '../../src/arena/model';

function flight(id: number, fromX: number, fromY: number, toX: number, toY: number, landsAt = 1, weapon: Weapon = 'sword'): ThrownItem {
  return { id, weapon, fromX, fromY, toX, toY, x: fromX, y: fromY, launched: 0, landsAt, landed: false };
}

function emptyArena() { const state = createArena(42); state.fighters = []; return state; }

describe('equipment slots and continuous delivery collisions', () => {
  it('allows sword plus shield in either order and forbids two-handed conflicts in both directions', () => {
    for (const first of ['sword', 'shield'] as const) {
      const fighter = createArena().fighters[0];
      equip(fighter, first); equip(fighter, first === 'sword' ? 'shield' : 'sword');
      expect(fighter.weapon).toBe('sword'); expect(fighter.shield).toBe(true);
      expect(canEquip(fighter, 'club')).toBe(false);
      expect(canEquip(fighter, 'bow')).toBe(false);
    }
    for (const weapon of ['club', 'bow'] as const) {
      const fighter = createArena().fighters[0];
      equip(fighter, weapon);
      expect(canEquip(fighter, 'shield')).toBe(false);
      equip(fighter, 'shield');
      expect(fighter.shield).toBe(false);
      expect(fighter.ammo).toBe(weapon === 'bow' ? 3 : 0);
      expect(fighter.durability).toBe(weapon === 'club' ? 2 : 0);
      const shielded = createArena().fighters[0]; equip(shielded, 'shield');
      expect(canEquip(shielded, weapon)).toBe(false);
    }
  });

  it('gives one ground item only to the nearest eligible fighter and preserves conflicting items', () => {
    const state = createArena();
    const [near, far] = state.fighters; state.fighters = [far, near];
    near.x = .1; near.y = 0; far.x = .5; far.y = 0;
    const item = flight(1, 0, 0, 0, 0); item.landed = true;
    state.items = [item]; advanceItems(state);
    expect(near.weapon).toBe('sword'); expect(far.weapon).toBe('fists');
    expect(state.items).toHaveLength(0);
    equip(near, 'shield'); equip(far, 'shield');
    state.items = [{ ...item, id: 2, weapon: 'bow' }];
    advanceItems(state);
    expect(state.items).toHaveLength(1);
    expect(near.weapon).toBe('sword'); expect(far.weapon).toBe('fists');
  });

  it('breaks equal-distance pickup ties by id and does not pick up distant equipment', () => {
    const state = createArena(); const [first, second] = state.fighters;
    state.fighters = [second, first]; first.x = -.2; first.y = 0; second.x = .2; second.y = 0;
    const item = flight(1, 0, 0, 0, 0); item.landed = true;
    state.items = [item]; advanceItems(state);
    expect(first.weapon).toBe('sword'); expect(second.weapon).toBe('fists');
    state.items = [{ ...item, id: 2, x: 6, y: 0, weapon: 'bow' }]; advanceItems(state);
    expect(state.items).toHaveLength(1);
  });

  it('detects fast crossing deliveries between samples and leaves exactly two ground entities', () => {
    const state = emptyArena();
    state.items = [flight(1, -1, 0, 1, 0), flight(2, 0, -1, 0, 1)];
    state.time = .8; advanceItems(state);
    expect(state.items).toHaveLength(2);
    expect(state.items.every(item => item.landed)).toBe(true);
    expect(state.items.every(item => Math.hypot(item.x, item.y) < .23)).toBe(true);
    const once = structuredClone(state.items); advanceItems(state);
    expect(state.items).toEqual(once);
  });

  it('does not confuse geometric crossing with same-time contact', () => {
    const state = emptyArena();
    state.items = [flight(1, -1, 0, 1, 0), flight(2, 0, -2, 0, 0)];
    state.time = .8; advanceItems(state);
    expect(state.items.every(item => !item.landed)).toBe(true);
    expect(state.logs.some(log => log.includes('相撞'))).toBe(false);
  });

  it('detects contact before one delivery lands during the current tick', () => {
    const state = emptyArena();
    state.items = [flight(1, -1, 0, 0, 0, .5), flight(2, 0, -2, 0, 2)];
    state.time = .6; advanceItems(state);
    expect(state.items.every(item => item.landed)).toBe(true);
    expect(state.items.every(item => item.landsAt < .5)).toBe(true);
  });

  it('ignores already-grounded items and agrees across coarse or fine flight steps', () => {
    const coarse = emptyArena(), fine = emptyArena();
    const items = [flight(1, -1, 0, 1, 0), flight(2, 0, -1, 0, 1)];
    coarse.items = structuredClone(items); fine.items = structuredClone(items);
    coarse.time = .8; advanceItems(coarse);
    for (let i = 1; i <= 24; i++) { fine.time = i / 30; advanceItems(fine); }
    for (let i = 0; i < 2; i++) {
      expect(coarse.items[i].x).toBeCloseTo(fine.items[i].x, 10);
      expect(coarse.items[i].y).toBeCloseTo(fine.items[i].y, 10);
      expect(coarse.items[i].landsAt).toBeCloseTo(fine.items[i].landsAt, 10);
    }
    const ground = emptyArena(); ground.items = structuredClone(items); ground.items[1].landed = true;
    ground.items[1].x = 0; ground.items[1].y = 0; ground.time = .8; advanceItems(ground);
    expect(ground.items[0].landed).toBe(false);
  });

  it('sweeps staggered launches from different previous progress after launch immunity expires', () => {
    const stepped = emptyArena(), coarse = emptyArena();
    const first = flight(1, -1, 0, 1, 0);
    const second = { ...flight(2, 0, -1, 0, 1, .7), launched: .3 };
    stepped.items = [first, second]; coarse.items = structuredClone(stepped.items);
    stepped.time = .4; advanceItems(stepped);
    expect(stepped.items.every(item => !item.landed)).toBe(true);
    expect(first.x).toBeCloseTo(-.2); expect(second.y).toBeCloseTo(-.5);
    stepped.time = .6; advanceItems(stepped);
    coarse.time = .6; advanceItems(coarse);
    for (let i = 0; i < 2; i++) {
      expect(stepped.items[i].landed).toBe(true);
      expect(stepped.items[i].landsAt).toBeGreaterThan(.45);
      expect(stepped.items[i].landsAt).toBeLessThan(.5);
      expect(stepped.items[i].x).toBeCloseTo(coarse.items[i].x, 10);
      expect(stepped.items[i].y).toBeCloseTo(coarse.items[i].y, 10);
    }
  });

  it('refuses new interventions while the last arrows resolve, including when paused', () => {
    for (const status of ['running', 'paused'] as const) {
      for (const reason of ['last-survivor', 'timeout']) {
        const state = createArena(); state.status = status;
        if (reason === 'last-survivor') state.fighters.slice(1).forEach(fighter => { fighter.hp = 0; });
        else state.time = 180;
        state.arrows = [{ id: 99, ownerId: 'fighter-1', x: 0, y: 0, vx: 1, vy: 0, damage: 10, expiresAt: state.time + 2 }];
        const before = structuredClone(state);
        expect(playCard(state, 'fury', { fighterId: state.fighters[0].id })).toBe(false);
        expect(playCard(state, 'bow', { x: 0, y: 0 })).toBe(false);
        expect(state).toEqual(before);
      }
    }
    const playablePause = createArena(); playablePause.status = 'paused';
    expect(playCard(playablePause, 'fury', { fighterId: playablePause.fighters[0].id })).toBe(true);
  });

  it('handles stationary and initially touching geometry without invalid roots', () => {
    expect(sweptCircleTime({x: 0,y: 0}, {x: 0,y: 0}, {x: 2,y: 0}, {x: 2,y: 0}, .2)).toBeUndefined();
    expect(sweptCircleTime({x: 0,y: 0}, {x: 1,y: 0}, {x: .1,y: 0}, {x: 2,y: 0}, .2)).toBe(0);
  });

  it('applies weakness immediately while paused, refreshes without multiplying and rejects trip in midair', () => {
    const state = createArena(); state.status = 'paused';
    const fighter = state.fighters[0], base = fighter.maxStamina;
    expect(playCard(state, 'weakness', { fighterId: fighter.id })).toBe(true);
    expect(fighter.maxStamina).toBeCloseTo(base * .6);
    expect(fighter.stamina).toBeCloseTo(base * .6);
    expect(playCard(state, 'weakness', { fighterId: fighter.id })).toBe(true);
    expect(fighter.maxStamina).toBeCloseTo(base * .6);
    expect(fighter.buffs).toHaveLength(1);
    fighter.pose = 'airborne'; const before = state.mana;
    expect(playCard(state, 'trip', { fighterId: fighter.id })).toBe(false);
    expect(fighter.pose).toBe('airborne'); expect(state.mana).toBe(before);
  });
});
