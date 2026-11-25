// @ts-nocheck
// Sandbox report writes JSON via Node; no Node type dependency is added to the repo.
import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createArena, toggleArena, advanceArena } from '../../src/arena/sim/engine';

it('reports 100 deterministic no-intervention matches', () => {
  const results = [];
  for (let seed = 1; seed <= 100; seed++) {
    const state = createArena(seed);
    const initial = state.fighters.map(f => ({ species: f.species, x: f.x, y: f.y, facing: f.facing,
      nextAttack: f.nextAttack, weapon: f.weapon, shield: f.shield, hp: f.hp, stamina: f.stamina }));
    toggleArena(state);
    let ticks = 0;
    while (state.status === 'running' && ticks < 9003) { advanceArena(state, 1 / 30); ticks++; }
    expect(state.status).toBe('finished');
    expect(state.time).toBeLessThanOrEqual(300 + 1 / 30 + 1e-8);
    const naturalWinner = state.fighters.find(f => f.id === state.winnerId)?.species ?? null;
    const alive = state.fighters.filter(f=>f.hp>0);
    let winner = naturalWinner;
    let resolution = naturalWinner ? 'natural' : 'draw';
    if (!naturalWinner && true) {
      let best = [];
      for (const f of alive) {
        const compare = best.length ? Math.round(f.hp*100)*Math.round(best[0].maxHp*100)-Math.round(best[0].hp*100)*Math.round(f.maxHp*100) : 1;
        if (compare>0) best=[f]; else if(compare===0) best.push(f);
      }
      if(best.length===1) {winner=best[0].species;resolution='adjudicated';}
    }
    results.push({ seed, resolution, naturalWinner, time: state.time, ticks, winner, draw: winner === null,
      reached300: state.time >= 300 - 1e-8, successfulInterventions: 0, initial,
      final: state.fighters.map(f => ({ species: f.species, hp: f.hp, maxHp: f.maxHp, stamina: f.stamina })) });
  }
  const times = results.map(r => Math.min(300, r.time)).sort((a, b) => a - b);
  const decided = results.filter(r => r.winner !== null).map(r => r.time).sort((a, b) => a - b);
  const median = (numbers) => numbers.length ? (numbers[Math.floor((numbers.length - 1) / 2)] + numbers[Math.floor(numbers.length / 2)]) / 2 : null;
  const wins = Object.fromEntries(['wolf', 'bear', 'elephant', 'bull', 'porcupine', 'snake', 'deer'].map(s => [s, results.filter(r => r.winner === s).length]));
  const report = { seeds: '1..100', games: 100, dt: 1 / 30, limitSeconds: 300,
    policy: 'No card plays, redraws, equipment seeding or other interventions; default supported fighter is wolf.',
    initialEquipment: 'All fighters fists, no shields, no ground equipment',
    successfulInterventions: 0, meanCappedSeconds: times.reduce((a, b) => a + b, 0) / 100,
    medianCappedSeconds: median(times), decidedGames: decided.length,
    decidedMeanSeconds: decided.length ? decided.reduce((a, b) => a + b, 0) / decided.length : null,
    decidedMedianSeconds: median(decided), wins, winPercent: wins,
    draws: results.filter(r => r.draw).length, timedOutDraws: results.filter(r => r.draw && r.reached300).length,
    naturalGames:results.filter(r=>r.resolution==='natural').length, adjudicatedGames:results.filter(r=>r.resolution==='adjudicated').length, trueDraws:results.filter(r=>r.resolution==='draw').length, results };
  writeFileSync('sandbox-results.json', JSON.stringify(report, null, 2) + '\n');
}, 240_000);
