import { describe, expect, it } from 'vitest';
import { advanceArena, createArena, playCard, toggleArena } from '../../src/arena/sim/engine';
import { act, hit } from '../../src/arena/sim/engine-combat';
import { advanceItems } from '../../src/arena/items/engine-items';
import { CARDS, type CardId } from '../../src/arena/model';
import type { ArenaState } from '../../src/arena/model';

function run(state: ArenaState, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 30); i++) advanceArena(state, 1 / 30);
}
function running(): ArenaState { const state = createArena(42); toggleArena(state); return state; }

function play(state: ArenaState, cardId: CardId, target: {fighterId?:string;x?:number;y?:number}): boolean {
  const card = CARDS.find(card => card.id === cardId)!;
  const id = state.nextId++;
  state.hand.push({id,cardId});
  const payment: number[] = [];
  for (const [color, count] of Object.entries(card.cost.colored)) for (let i=0;i<count!;i++) {
    const stone = {id:state.nextId++,color:color as typeof state.stones[number]['color']}; state.stones.push(stone); payment.push(stone.id);
  }
  for(let i=0;i<card.cost.generic;i++) {const stone={id:state.nextId++,color:'blue' as const};state.stones.push(stone);payment.push(stone.id);}
  return playCard(state,id,target,payment);
}

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
    expect(c.stones).toEqual(a.stones);
    expect(c.logs).toEqual(a.logs);
    expect(createArena(1).fighters).not.toEqual(createArena(2).fighters);
  });
  it('freezes battle, resources and flights while paused, and rejects invalid elapsed times', () => {
    const state = running();
    play(state, 'sword', { x: 0, y: 0 });
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
  it('casts while paused and freezes durations and new deliveries until resumed', () => {
    const state = running(); toggleArena(state);
    const target = state.fighters[0];
    expect(play(state, 'bloodlust', { fighterId: target.id })).toBe(true);
    expect(play(state, 'sword', { x: 0, y: 0 })).toBe(true);
    for (const fighter of state.fighters) {fighter.x=6;fighter.y=0;fighter.speed=0;fighter.nextAttack=Infinity;}
    const paused = structuredClone(state);
    advanceArena(state, 10); expect(state).toEqual(paused);
    toggleArena(state); run(state, 0.5);
    expect(target.buffs[0].until - state.time).toBeCloseTo(4.5);
    expect(state.items[0].y).toBeLessThan(paused.items[0].y);
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
    const fighter = state.fighters[0];
    for(const value of state.fighters){value.x=6;value.y=0;}
    fighter.x=2;fighter.y=0;
    expect(play(state, 'sword', { x: 0, y: 0 })).toBe(true);
    const flight = state.items[0];
    state.time = flight.landsAt - 0.01; advanceItems(state);
    expect(fighter.weapon).toBe('fists');
    expect(state.items).toHaveLength(1);
    fighter.x=0;
    state.time = flight.landsAt; advanceItems(state);
    expect(fighter.weapon).toBe('sword');
    expect(state.items).toHaveLength(0);
    advanceItems(state);
    expect(state.fighters.filter(other => other.weapon === 'sword')).toHaveLength(1);
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
});
