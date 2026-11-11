import { describe, expect, it } from 'vitest';
import { advanceArena, createArena, playCard, toggleArena } from '../../src/arena/engine';
import { act, hit, syncStamina } from '../../src/arena/engine-combat';
import { advanceArrows, fireArrow } from '../../src/arena/engine-arrows';
import { advanceControl, damageFighter } from '../../src/arena/engine-damage';
import { equip } from '../../src/arena/equipment';

function pair() {
  const state = createArena(42); toggleArena(state); state.fighters = state.fighters.slice(0, 2);
  const [a, b] = state.fighters;
  a.x = 0; a.y = 0; a.facing = 0; a.targetId = b.id;
  b.x = 1; b.y = 0; b.facing = Math.PI; b.targetId = a.id;
  return { state, a, b };
}

describe('P3 equipment combat', () => {
  it('fires three real arrows, preserves launch damage and returns to fists', () => {
    const { state, a, b } = pair(); b.x = 4;
    equip(a, 'bow'); a.buffs.push({ kind: 'fury', until: 8 });
    fireArrow(state, a); fireArrow(state, a); fireArrow(state, a);
    expect(a.ammo).toBe(0); expect(a.weapon).toBe('fists');
    expect(state.arrows).toHaveLength(3); expect(b.hp).toBe(b.maxHp);
    const damage = state.arrows[0].damage;
    a.buffs = []; a.attack = 1;
    expect(damage).toBeGreaterThan(20);
    state.time = 0.4; advanceArrows(state, 0.4);
    expect(b.hp).toBeLessThan(b.maxHp - 50);
    expect(state.arrows).toHaveLength(0);
  });
  it('hits the first crossed body and misses targets that move off the fixed flight', () => {
    const { state, a, b } = pair(); equip(a, 'bow'); b.x = 3;
    fireArrow(state, a); b.y = 2;
    state.time = 0.4; advanceArrows(state, 0.4);
    expect(b.hp).toBe(b.maxHp);
    b.y = 0; b.x = 6;
    state.time = 0.6; advanceArrows(state, 0.2);
    expect(b.hp).toBeLessThan(b.maxHp);
  });
  it('waits for a dead archer’s last arrow and can resolve a draw', () => {
    const { state, a, b } = pair(); b.x = 4; b.hp = 1;
    equip(a, 'bow'); fireArrow(state, a); a.hp = 0; a.pose = 'dead';
    advanceArena(state, 1 / 30);
    expect(state.status).toBe('running');
    advanceArena(state, 1);
    expect(b.hp).toBe(0); expect(state.status).toBe('finished'); expect(state.winnerId).toBeUndefined();
  });
  it('does not fire an extra prepared arrow after the last enemy dies in the same tick', () => {
    const { state, a, b } = pair();
    equip(a, 'bow'); b.hp = 1;
    a.pose = 'attack'; a.poseUntil = 1 / 30;
    state.arrows.push({ id: state.nextId++, ownerId: a.id, x: 0.7, y: 0, vx: 12, vy: 0, damage: 10, expiresAt: 2 });
    advanceArena(state, 1 / 30);
    expect(b.hp).toBe(0); expect(a.ammo).toBe(3);
    expect(state.arrows).toHaveLength(0); expect(state.status).toBe('finished');
    hit(state, a); expect(a.ammo).toBe(3);
  });
  it('drains arrows after timeout without creating new attacks', () => {
    const { state, a, b } = pair(); b.x = 5; a.ammo = 3; a.weapon = 'bow';
    state.time = 179.99; fireArrow(state, a);
    a.pose = 'attack'; a.poseUntil = 180; a.nextAttack = 0;
    advanceArena(state, 0.05);
    expect(state.status).toBe('running'); expect(a.ammo).toBe(2);
    advanceArena(state, 2);
    expect(state.status).toBe('finished'); expect(a.ammo).toBe(2);
  });
  it('breaks a club on its second effective hit after applying knockback damage', () => {
    const { state, a, b } = pair(); equip(a, 'club'); b.hp = 1000;
    hit(state, a);
    expect(a.durability).toBe(1); expect(a.weapon).toBe('club'); expect(b.pose).toBe('airborne');
    const health = b.hp; hit(state, a);
    expect(b.hp).toBeLessThan(health); expect(a.weapon).toBe('fists'); expect(a.durability).toBe(0);
    expect(b.knockback).toBeDefined();
  });
  it('does not spend club durability for a miss or parry and preserves interrupted attack pose', () => {
    const { state, a, b } = pair(); equip(a, 'club'); b.x = 4;
    hit(state, a); expect(a.durability).toBe(2);
    b.x = 1; b.shield = true; b.parryUntil = 1;
    a.pose = 'attack'; a.poseUntil = 0; a.nextAttack = 10;
    act(state, a, 1 / 30);
    expect(a.durability).toBe(2); expect(b.hp).toBe(b.maxHp); expect(a.pose).toBe('hit');
    expect(b.stamina).toBe(b.maxStamina - 10);
  });
  it('counts a damaging block as a club hit, but empty stamina and side attacks cannot block', () => {
    const { state, a, b } = pair(); equip(a, 'club'); b.shield = true;
    const health = b.hp; hit(state, a);
    const blocked = health - b.hp;
    expect(a.durability).toBe(1); expect(b.stamina).toBe(b.maxStamina - 6);
    b.hp = health; b.pose = 'idle'; b.knockback = undefined; b.stamina = 0;
    damageFighter(state, b, a.attack * 1.9, a);
    expect(health - b.hp).toBeGreaterThan(blocked);
    b.hp = health; b.pose = 'idle'; b.stamina = b.maxStamina; b.facing = Math.PI / 2;
    damageFighter(state, b, 20, a);
    expect(health - b.hp).toBe(20); expect(b.stamina).toBe(b.maxStamina);
  });
  it('moves through airborne, fallen and rising poses within the boundary; death wins', () => {
    const { state, a, b } = pair(); a.x = 6; b.x = 7;
    equip(a, 'club'); hit(state, a);
    const origin = b.x;
    state.time = 0.2; advanceControl(state, b);
    expect(b.x).toBeGreaterThan(origin); expect(b.x + b.radius).toBeLessThanOrEqual(7.5);
    state.time = 0.36; advanceControl(state, b); expect(b.pose).toBe('fallen');
    state.time = 1.2; advanceControl(state, b); expect(b.pose).toBe('rising');
    state.time = 1.6; advanceControl(state, b); expect(b.pose).toBe('idle');
    b.hp = 0; b.pose = 'airborne'; advanceControl(state, b); expect(b.pose).toBe('dead');
    expect(b.knockback).toBeUndefined();
  });
  it('applies the elephant blunt bonus and lets the first intercepted body take an arrow', () => {
    const { state, a, b } = pair(); equip(a, 'club');
    a.species = 'elephant'; b.hp = 1000;
    hit(state, a);
    expect(1000 - b.hp).toBe(Math.round(a.attack * 1.9 * 1.2));
    const blocker = { ...b, id: 'blocker', x: 2, y: 0, hp: 100, maxHp: 100, pose: 'idle' as const, knockback: undefined };
    b.x = 4; b.hp = 100; b.pose = 'idle'; b.knockback = undefined;
    state.fighters.push(blocker); a.weapon = 'fists'; equip(a, 'bow');
    fireArrow(state, a); state.time = 0.5; advanceArrows(state, 0.5);
    expect(blocker.hp).toBeLessThan(100); expect(b.hp).toBe(100);
  });
  it('refreshes weakness without multiplying caps, expires without free stamina, and freezes while paused', () => {
    const { state, a } = pair();
    expect(playCard(state, 'weakness', { fighterId: a.id })).toBe(true);
    expect(a.maxStamina).toBe(a.baseMaxStamina * 0.6); expect(a.stamina).toBe(a.maxStamina);
    expect(playCard(state, 'weakness', { fighterId: a.id })).toBe(true);
    expect(a.maxStamina).toBe(a.baseMaxStamina * 0.6);
    toggleArena(state); const paused = structuredClone(state); advanceArena(state, 20); expect(state).toEqual(paused);
    const stamina = a.stamina; syncStamina(a, 8);
    expect(a.maxStamina).toBe(a.baseMaxStamina); expect(a.stamina).toBe(stamina);
  });
});
