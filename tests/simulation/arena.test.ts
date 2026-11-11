import { describe, expect, it } from 'vitest';
import { advanceArena, createArena, playCard, toggleArena } from '../../src/arena/engine';
import { act, hit } from '../../src/arena/engine-combat';
import { advanceItems } from '../../src/arena/engine-items';
import type { ArenaState } from '../../src/arena/model';

function run(state: ArenaState, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 30); i++) advanceArena(state, 1 / 30);
}
function running(): ArenaState { const state = createArena(42); toggleArena(state); return state; }

describe('circular arena simulation', () => {
  it('spawns seven distinct fighters within the circular arena and resolves battles', () => {
    for (const seed of [1, 42, 73021]) {
      const state = createArena(seed);
      expect(new Set(state.fighters.map(fighter => fighter.species)).size).toBe(7);
      toggleArena(state);
      run(state, 181);
      expect(state.status).toBe('finished');
      for (const fighter of state.fighters) {
        expect(Math.hypot(fighter.x, fighter.y) + fighter.radius).toBeLessThanOrEqual(7.50001);
        expect(fighter.hp).toBeGreaterThanOrEqual(0);
        expect(fighter.stamina).toBeGreaterThanOrEqual(0);
        expect(fighter.stamina).toBeLessThanOrEqual(fighter.maxStamina);
      }
    }
  });
  it('replays the same seed and remains equivalent at different speeds', () => {
    const a = running(), b = running(), c = running();
    c.speed = 3;
    run(a, 9); run(b, 9); run(c, 3);
    expect(a).toEqual(b);
    expect(c.time).toBe(a.time);
    expect(c.fighters).toEqual(a.fighters);
    expect(c.mana).toBe(a.mana);
    expect(c.logs).toEqual(a.logs);
    expect(createArena(1).fighters).not.toEqual(createArena(2).fighters);
  });
  it('freezes battle, resources and flights while paused, and rejects invalid elapsed times', () => {
    const state = running();
    playCard(state, 'sword', { x: 0, y: 0 });
    run(state, 0.3); toggleArena(state);
    const paused = structuredClone(state);
    advanceArena(state, 10);
    expect(state).toEqual(paused);
    toggleArena(state);
    const resumed = structuredClone(state);
    for (const value of [0, -1, NaN, Infinity]) advanceArena(state, value);
    expect(state).toEqual(resumed);
    run(state, 1);
    expect(state.time).toBeGreaterThan(paused.time);
  });
  it('never spends resources on invalid targets or unavailable funds, and refreshes one buff', () => {
    const state = running();
    const original = state.mana;
    expect(playCard(state, 'fury', { fighterId: 'missing' })).toBe(false);
    expect(state.mana).toBe(original);
    expect(playCard(state, 'sword', { x: 99, y: 0 })).toBe(false);
    expect(state.gold).toBe(75);
    const target = state.fighters[0];
    expect(playCard(state, 'fury', { fighterId: target.id })).toBe(true);
    expect(state.mana).toBe(original - 24);
    expect(target.buffs).toHaveLength(1);
    expect(playCard(state, 'fury', { fighterId: target.id })).toBe(true);
    expect(target.buffs).toHaveLength(1);
    state.mana = 0;
    expect(playCard(state, 'trip', { fighterId: target.id })).toBe(false);
  });
  it('waits two seconds after attack before stamina regeneration and rewards standing still', () => {
    const state = running(), fighter = state.fighters[0];
    state.fighters = [fighter];
    fighter.stamina = 0; fighter.lastAttack = 0; fighter.lastMoved = 0;
    state.time = 1.99; act(state, fighter, 0.1);
    expect(fighter.stamina).toBe(0);
    state.time = 2; act(state, fighter, 0.1);
    expect(fighter.stamina).toBe(1);
    state.time = 3; act(state, fighter, 0.1);
    expect(fighter.stamina).toBeCloseTo(3.2);
  });
  it('lands a thrown weapon before exactly one fighter can pick it up', () => {
    const state = running();
    const fighter = state.fighters[0]; fighter.x = 0; fighter.y = 0;
    expect(playCard(state, 'sword', { x: 0, y: 0 })).toBe(true);
    const flight = state.items[0];
    state.time = flight.landsAt - 0.01; advanceItems(state);
    expect(fighter.weapon).toBe('fists');
    expect(state.items).toHaveLength(1);
    state.time = flight.landsAt; advanceItems(state);
    expect(fighter.weapon).toBe('sword');
    expect(state.items).toHaveLength(0);
    advanceItems(state);
    expect(state.fighters.filter(other => other.weapon === 'sword')).toHaveLength(1);
  });
  it('drops colliding deliveries without creating duplicates', () => {
    const state = running();
    playCard(state, 'sword', { x: 0, y: 0 });
    playCard(state, 'shield', { x: 0, y: 0 });
    state.time = 0.4; advanceItems(state);
    expect(state.items).toHaveLength(2);
    expect(state.items.every(item => item.landed)).toBe(true);
  });
  it('applies front shields and back attack bonuses from target facing', () => {
    const state = running(), [attacker, target] = state.fighters;
    attacker.x = 0; attacker.y = 0; target.x = 0.7; target.y = 0;
    attacker.targetId = target.id;
    target.facing = Math.PI; target.shield = true;
    const health = target.hp; hit(state, attacker);
    const frontDamage = health - target.hp;
    target.hp = health; target.pose = 'idle'; target.facing = 0; hit(state, attacker);
    expect(health - target.hp).toBeGreaterThan(frontDamage * 2);
  });
  it('allows trip to interrupt an attack and removes an expired spell', () => {
    const state = running(), target = state.fighters[0];
    target.pose = 'attack'; target.poseUntil = 0.1;
    playCard(state, 'trip', { fighterId: target.id });
    expect(target.pose).toBe('fallen');
    expect(target.poseUntil).toBe(2);
    playCard(state, 'haste', { fighterId: target.id });
    state.time = 9; act(state, target, 1 / 30);
    expect(target.buffs).toHaveLength(0);
    expect(target.pose).not.toBe('fallen');
  });
});
