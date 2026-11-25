// @ts-nocheck
// Isolated measurement runner only; Node types are not added to production dependencies.
import { it, expect } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { createArena, toggleArena, advanceArena, findPayment, validateCardPlay, playCard, chooseDeliberation, redrawStones } from '../../src/arena/sim/engine';
import { CARDS } from '../../src/arena/shared/card-catalog';
import { BALANCE as B } from '../../src/arena/shared/balance';
import { ARENA_RADIUS, THROW_TARGET_RADIUS } from '../../src/arena/shared/rules';
import { isResolvingArena } from '../../src/arena/shared/status';
import { isThrowableTarget, isTrapTarget, areaSpellTargets } from '../../src/arena/shared/targeting';
import { auditEvents } from '../../src/arena/shared/audit';

const config = JSON.parse(readFileSync('pd10-config.json', 'utf8'));
const COLORS = ['yellow', 'blue', 'green', 'black', 'red'];
const count = stones => Object.fromEntries(COLORS.map(color => [color, stones.filter(s => s.color === color).length]));
const copy = value => JSON.parse(JSON.stringify(value));
const direct = ['lightning', 'lightning-rain', 'divine-wrath'];
const grid = [];
for (let y = -Math.ceil(ARENA_RADIUS); y <= ARENA_RADIUS; y++) {
  for (let x = -Math.ceil(ARENA_RADIUS); x <= ARENA_RADIUS; x++) {
    if (x*x + y*y <= ARENA_RADIUS*ARENA_RADIUS) grid.push({x,y});
  }
}
function orderedEnemies(state) {
  return state.fighters.filter(f => f.hp > 0 && f.id !== state.supportedId).sort((a,b) => {
    if (a.species === 'bear' || b.species === 'bear') return a.species === b.species ? 0 : a.species === 'bear' ? -1 : 1;
    return b.hp * a.maxHp - a.hp * b.maxHp;
  });
}
function targets(state, card) {
  const wolf = state.fighters.find(f => f.id === state.supportedId);
  const alive = state.fighters.filter(f => f.hp > 0);
  const enemies = orderedEnemies(state);
  if (card.target === 'self') return [{}];
  if (config.policy === 'direct') {
    const f = enemies[0];
    return !f ? [] : card.target === 'fighter' ? [{fighterId:f.id}] : [{x:f.x,y:f.y}];
  }
  if (card.target === 'fighter') {
    const fighters = card.id === 'growth'
      ? [wolf, ...alive.filter(f => f.id !== wolf.id).sort((a,b) => (1-b.hp/b.maxHp)-(1-a.hp/a.maxHp))].filter(f => f.hp < f.maxHp)
      : card.id === 'bloodlust' ? [wolf,...alive.filter(f => f.id !== wolf.id)] : enemies;
    return fighters.map(f => ({fighterId:f.id}));
  }
  if (card.target === 'area') return enemies.map(f => ({x:f.x,y:f.y}));
  const disposable = ['stone','pot','dung'].includes(card.id);
  const fighters = card.target === 'trap' || disposable
    ? [...enemies,...alive.filter(f => !enemies.includes(f))]
    : [wolf,...alive.filter(f => f.id !== wolf.id)];
  const points = [...fighters.map(f => ({x:f.x,y:f.y})),...grid];
  const seen = new Set();
  return points.filter(p => { const key = `${p.x},${p.y}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function targetReason(state, card, target) {
  if (card.target === 'self') return state.deck.length || state.discard.length ? null : 'empty-deck';
  if (card.target === 'fighter') {
    const f = state.fighters.find(f => f.id === target.fighterId);
    if (!f) return 'target-missing';
    if (f.hp <= 0) return 'target-dead';
    return card.id === 'growth' && f.hp >= f.maxHp ? 'target-full-health' : null;
  }
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return 'invalid-point';
  if (card.target === 'area') {
    if (Math.hypot(target.x,target.y) > ARENA_RADIUS) return 'outside-arena';
    return areaSpellTargets(state.fighters,card,target).length ? null : 'empty-area';
  }
  if (card.target === 'trap') return isTrapTarget(card,target) ? null : 'outside-arena';
  if (Math.hypot(target.x,target.y) > THROW_TARGET_RADIUS) return 'outside-arena';
  return isThrowableTarget(card,target) ? null : 'out-of-range';
}
function diagnose(state) {
  const inventory = count(state.stones);
  const checks = [];
  let selected;
  // Analyze the whole hand even after finding the policy's first executable action.
  for (const instance of state.hand) {
    const card = CARDS.find(c => c.id === instance.cardId);
    if (config.policy === 'direct' && !direct.includes(card.id)) continue;
    const payment = findPayment(state,card.cost);
    const requiredTotal = card.cost.generic + Object.values(card.cost.colored).reduce((a,b)=>a+b,0);
    const totalEnough = state.stones.length >= requiredTotal;
    const coloredEnough = COLORS.every(c => inventory[c] >= (card.cost.colored[c] ?? 0));
    const checked = [];
    let legal;
    for (const target of targets(state,card)) {
      const reason = targetReason(state,card,target);
      const validation = validateCardPlay(state,instance.id,target,payment ?? []);
      checked.push({target, targetReason:reason, apiReason:validation.ok ? null : validation.reason});
      if (!reason) { legal = target; break; }
    }
    const row = {handId:instance.id,cardId:card.id,cost:card.cost,requiredTotal,totalEnough,coloredEnough,
      missingColors:Object.fromEntries(COLORS.filter(c => inventory[c] < (card.cost.colored[c] ?? 0)).map(c => [c,(card.cost.colored[c]??0)-inventory[c]])),
      targetLegal:!!legal,cooldown:false,checked, candidateSearchExhausted:!legal};
    checks.push(row);
    if (!selected && legal && payment) {
      const v = validateCardPlay(state,instance.id,legal,payment);
      if (v.ok) selected={handId:instance.id,cardId:card.id,target:legal,payment};
    }
  }
  const legal = checks.filter(c => c.targetLegal);
  const mainCause = selected ? 'success' : !checks.length ? 'no-policy-card' : !legal.length ? 'no-legal-policy-target'
    : legal.every(c => c.cooldown) ? 'cooldown' : legal.every(c => !c.totalEnough) ? 'total-stones'
    : legal.some(c => c.totalEnough && !c.coloredEnough) ? 'colored-stones' : 'other';
  return {checks,selected,mainCause};
}
function snapshot(state) {
  return {phase:state.status,wolfHp:state.fighters[0].hp,wolfAlive:state.fighters[0].hp>0,
    hand:copy(state.hand),stones:copy(state.stones),inventory:count(state.stones)};
}
function normalizeEvents(state, startingEventCount, windows) {
  const events = auditEvents(state);
  // Income is captured inside drawStones, not inferred from net inventory changes.
  events.forEach((e,i) => {
    if (e.kind !== 'income') return;
    expect(['initial','successful-play','supported-kill','redraw-income']).toContain(e.source);
    expect(e.source === 'initial').toBe(i < startingEventCount);
  });
  const balance = Object.fromEntries(COLORS.map(c => [c,0]));
  for (const e of events) {
    if (!['income','expense'].includes(e.kind)) continue;
    expect(count(e.before)).toEqual(balance);
    for (const s of e.stones) balance[s.color] += e.kind === 'income' ? 1 : -1;
    expect(count(e.after)).toEqual(balance);
  }
  expect(balance).toEqual(count(state.stones));
  expect(events.filter(e=>e.kind==='expense' && e.source==='card-payment').length).toBe(windows.filter(w=>w.executed && w.mainCause==='success').length);
  expect(events.filter(e=>e.kind==='expense' && e.source==='redraw-payment').length).toBe(windows.filter(w=>w.redraw?.success).length);
  return events;
}
it('PD10 sequential 100-seed instrumented policy report', () => {
  const games=[];
  for (let seed=1;seed<=100;seed++) {
    const state=createArena(seed);
    const initial=snapshot(state);
    const initialFighters=copy(state.fighters);
    const startingEventCount=auditEvents(state).length;
    toggleArena(state);
    let scheduled=5, ticks=0, consecutiveColor=0;
    const windows=[];
    while (state.status==='running' && ticks<36000) {
      advanceArena(state,1/30);ticks++;
      while (state.time+1e-8>=scheduled && scheduled<=B.matchDuration) {
        const before=snapshot(state);
        const skip = state.status==='finished' ? 'finished' : !before.wolfAlive ? 'wolf-dead'
          : isResolvingArena(state) ? 'resolving' : state.status!=='running' ? 'not-running' : null;
        const w={scheduled,time:state.time,executed:!skip,skipReason:skip,before};
        scheduled+=5;
        if (!skip) {
          Object.assign(w,diagnose(state));
          if (w.selected) {
            consecutiveColor=0;
            const action=w.selected;
            const hpBefore=state.fighters.map(f=>f.hp);
            expect(playCard(state,action.handId,action.target,action.payment)).toBe(true);
            if (state.pendingDeliberation) expect(chooseDeliberation(state,state.pendingDeliberation,0)).toBe(true);
            expect(state.status).toBe('running');
            w.immediateEnemyDamage=state.fighters.reduce((sum,f,i)=>sum+(f.id!==state.supportedId?Math.max(0,hpBefore[i]-f.hp):0),0);
            w.immediateFriendlyDamage=Math.max(0,hpBefore[0]-state.fighters[0].hp);
          } else {
            consecutiveColor = w.mainCause === 'colored-stones' ? consecutiveColor+1 : 0;
            if (consecutiveColor >= 2) {
              const hand=state.hand[0], stone=state.stones[0];
              const reason = state.time < state.redrawAvailableAt ? 'cooldown' : !hand ? 'no-hand' : !stone ? 'no-stone' : null;
              const beforeAttempt=JSON.stringify(state);
              const success=redrawStones(state,hand?.id ?? -1,stone ? [stone.id] : []);
              if (!success) expect(JSON.stringify(state)).toBe(beforeAttempt);
              if (success) consecutiveColor=0;
              w.redraw={attempted:true,success,reason:success?null:(reason??'native-rejection'),hand:copy(hand??null),stone:copy(stone??null)};
            }
          }
          w.consecutiveColor=consecutiveColor;
        }
        w.after=snapshot(state);windows.push(w);
      }
    }
    expect(state.status).toBe('finished');
    // Future scheduled windows are explicit skips and never join the failure denominator.
    while (scheduled<=B.matchDuration) {
      windows.push({scheduled,time:null,executed:false,skipReason:'finished',terminalTime:state.time});scheduled+=5;
    }
    const events=normalizeEvents(state,startingEventCount,windows);
    const deaths=events.filter(e=>e.kind==='death');
    const wolfDeath=deaths.find(e=>e.targetId===state.supportedId)?.time??null;
    const success=windows.filter(w=>w.executed && w.mainCause==='success');
    const supportedKills=deaths.filter(e=>e.supportedKill);
    games.push({seed,version:config.version,policy:config.policy,initial,initialFighters,time:state.time,ticks,
      winner:state.fighters.find(f=>f.id===state.winnerId)?.species??null,
      resultReason:state.resultReason??(state.winnerId?'last-survivor':'draw'),wolfDeath,
      wolfInterventionDuration:Math.min(wolfDeath??state.time,state.time,B.matchDuration),
      firstSuccess:success[0]?.time??null,successCount:success.length,
      firstDeath:deaths[0]?.time??null,firstSupportedKill:supportedKills[0]?.time??null,
      deathCount:deaths.length,supportedKillCount:supportedKills.length,
      final:snapshot(state),finalFighters:copy(state.fighters),events,windows});
  }
  const report={contract:'wf-table/1',columns:['seed','version','policy','initial','initialFighters','time','ticks','winner','resultReason','wolfDeath','wolfInterventionDuration','firstSuccess','successCount','firstDeath','firstSupportedKill','deathCount','supportedKillCount','final','finalFighters','events','windows'],rows:games,
    config,runnerVersion:'pd10-redraw-v1',dt:1/30,limit:B.matchDuration,grid:{spacing:1,order:'y ascending outer; x ascending inner; x²+y²<=arenaRadius²',points:grid},
    assertions:'native finish; per-event and terminal per-color accounting; expense count equals successful windows; deliberation resumes running'};
  writeFileSync(`pd10-${config.version}-${config.policy}-results.json`,JSON.stringify(report)+'\n');
},240000);
