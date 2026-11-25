// @ts-nocheck
// Sandbox report writes JSON via Node; no Node type dependency is added to the repo.
import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createArena, toggleArena, advanceArena, findPayment, validateCardPlay, playCard } from '../../src/arena/sim/engine';

import { CARDS } from '../../src/arena/shared/card-catalog';

it('reports 100 deterministic no-intervention matches', () => {
  const results = [];
  for (let seed = 1; seed <= 100; seed++) {
    const state = createArena(seed);
    const initial = state.fighters.map(f => ({ species: f.species, x: f.x, y: f.y, facing: f.facing,
      nextAttack: f.nextAttack, weapon: f.weapon, shield: f.shield, hp: f.hp, stamina: f.stamina }));
    toggleArena(state);
    let ticks = 0; let nextAttempt = 5; const interventions = [];
    while (state.status === 'running' && ticks < 9003) {
      advanceArena(state, 1 / 30); ticks++;
      const support = state.fighters.find(f=>f.id===state.supportedId);
      if (state.status === 'running' && state.time+1e-8 >= nextAttempt && support.hp>0) {
        const scheduled=nextAttempt; nextAttempt+=5;
        const enemies=state.fighters.filter(f=>f.hp>0 && f.id!==support.id);
        let target=enemies.find(f=>f.species==='bear');
        if(!target) for(const f of enemies) if(!target || Math.round(f.hp*100)*Math.round(target.maxHp*100)>Math.round(target.hp*100)*Math.round(f.maxHp*100)) target=f;
        const attempt={scheduled,time:state.time,success:false,enemyDamage:0,friendlyDamage:0,rejections:[]};
        if(target) for(const instance of state.hand) {
          if(!['lightning','lightning-rain','divine-wrath'].includes(instance.cardId)) continue;
          const card=CARDS.find(c=>c.id===instance.cardId);
          const payment=findPayment(state,card.cost);
          if(!payment) {attempt.rejections.push({card:card.id,reason:'insufficient-stones'});continue;}
          const aim=card.target==='fighter'?{fighterId:target.id}:{x:target.x,y:target.y};
          const validation=validateCardPlay(state,instance.id,aim,payment);
          if(!validation.ok) {attempt.rejections.push({card:card.id,reason:validation.reason});continue;}
          const before=state.fighters.map(f=>f.hp);
          expect(playCard(state,instance.id,aim,payment)).toBe(true);
          attempt.success=true; attempt.card=card.id;attempt.target=target.species;
          state.fighters.forEach((f,i)=>{const damage=Math.max(0,before[i]-f.hp);if(f.id===support.id)attempt.friendlyDamage+=damage;else attempt.enemyDamage+=damage;});
          break;
        }
        interventions.push(attempt);
      }
    }
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
      reached300: state.time >= 300 - 1e-8, successfulInterventions: interventions.filter(x=>x.success).length, interventions, initial,
      final: state.fighters.map(f => ({ species: f.species, hp: f.hp, maxHp: f.maxHp, stamina: f.stamina })) });
  }
  const times = results.map(r => Math.min(300, r.time)).sort((a, b) => a - b);
  const decided = results.filter(r => r.winner !== null).map(r => r.time).sort((a, b) => a - b);
  const median = (numbers) => numbers.length ? (numbers[Math.floor((numbers.length - 1) / 2)] + numbers[Math.floor(numbers.length / 2)]) / 2 : null;
  const wins = Object.fromEntries(['wolf', 'bear', 'elephant', 'bull', 'porcupine', 'snake', 'deer'].map(s => [s, results.filter(r => r.winner === s).length]));
  const report = { seeds: '1..100', games: 100, dt: 1 / 30, limitSeconds: 300,
    policy: 'Direct spells only, every 5 seconds while wolf lives; normal payment/deck; bear priority then highest exact hp ratio. No throws or delayed damage.',
    initialEquipment: 'All fighters fists, no shields, no ground equipment',
    successfulInterventions: results.reduce((n,r)=>n+r.successfulInterventions,0), meanCappedSeconds: times.reduce((a, b) => a + b, 0) / 100,
    medianCappedSeconds: median(times), decidedGames: decided.length,
    decidedMeanSeconds: decided.length ? decided.reduce((a, b) => a + b, 0) / decided.length : null,
    decidedMedianSeconds: median(decided), wins, winPercent: wins,
    draws: results.filter(r => r.draw).length, timedOutDraws: results.filter(r => r.draw && r.reached300).length,
    naturalGames:results.filter(r=>r.resolution==='natural').length, adjudicatedGames:results.filter(r=>r.resolution==='adjudicated').length, trueDraws:results.filter(r=>r.resolution==='draw').length, results };
  writeFileSync('sandbox-results.json', JSON.stringify(report, null, 2) + '\n');
}, 240_000);
