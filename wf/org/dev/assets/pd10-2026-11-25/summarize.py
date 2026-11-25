from pathlib import Path
import json, collections, statistics
root=Path('/tmp/aos/arena_cheater/dev/pd10-2026-11-25')
def distribution(values):
 vals=[v for v in values if v is not None]; vals.sort()
 return {'samples':len(values),'occurred':len(vals),'notOccurred':len(values)-len(vals),'meanAmongOccurred':statistics.mean(vals) if vals else None,'medianAmongOccurred':statistics.median(vals) if vals else None,'min':min(vals) if vals else None,'max':max(vals) if vals else None,'p90AmongOccurred':vals[max(0,(len(vals)*9+9)//10-1)] if vals else None}
def stone_totals(events):
 counts=collections.defaultdict(collections.Counter)
 for e in events:
  if e['kind'] in ('income','expense'):
   for s in e['stones']: counts[e['kind']+':'+e['source']][s['color']]+=1
 return {k:{c:v[c] for c in ['yellow','blue','green','black','red']} for k,v in counts.items()}
def window_stats(ws):
 ws=[w for w in ws if w['executed']];n=len(ws)
 causes=collections.Counter(w['mainCause'] for w in ws)
 return {'executed':n,'mainCauses':dict(causes),'mainCauseFractions':{k:v/n if n else None for k,v in causes.items()},'successByCard':dict(collections.Counter(w['selected']['cardId'] for w in ws if w.get('selected'))),
 'immediateEnemyDamage':sum(w.get('immediateEnemyDamage',0) for w in ws),'immediateFriendlyDamage':sum(w.get('immediateFriendlyDamage',0) for w in ws),
 'policyTargetExhaustedCandidates':sum(not c['targetLegal'] for w in ws for c in w['checks']),
 'multiConditions':dict(collections.Counter('target='+str(c['targetLegal'])+';total='+str(c['totalEnough'])+';color='+str(c['coloredEnough']) for w in ws for c in w['checks']))}
all_games={}
for version in ['new','old']:
 for policy in ['direct','all']:
  f=root/version/f'pd10-{version}-{policy}-results.json'
  if not f.exists():continue
  data=json.loads(f.read_text());games=data['rows'];all_games[version,policy]=games
  ws=[w for g in games for w in g['windows']]
  per_game=[]
  for g in games:
   kills=[e['time'] for e in g['events'] if e['kind']=='death' and e['supportedKill']]
   deaths=[e['time'] for e in g['events'] if e['kind']=='death']
   per_game.append({'seed':g['seed'],'time':g['time'],'winner':g['winner'],'resultReason':g['resultReason'],'wolfDeath':g['wolfDeath'],'wolfInterventionDuration':g['wolfInterventionDuration'],'successCount':g['successCount'],'firstSuccess':g['firstSuccess'],'firstSupportedKill':g['firstSupportedKill'],'deathCount':g['deathCount'],'supportedKillCount':g['supportedKillCount'],'supportedKillIntervals':[b-a for a,b in zip(kills,kills[1:])],'deathIntervals':[b-a for a,b in zip(deaths,deaths[1:])], 'full':window_stats(g['windows']),'early':window_stats([w for w in g['windows'] if w['scheduled']<=180]), 'stones':stone_totals(g['events']),'initialInventory':g['initial']['inventory'],'finalInventory':g['final']['inventory']})
  summary={'version':version,'policy':policy,'revision':data['config']['revision'],'games':len(games),'full':window_stats(ws),'early180':window_stats([w for w in ws if w['scheduled']<=180]),'skips':dict(collections.Counter(w['skipReason'] for w in ws if not w['executed'])), 'successGames':sum(g['successCount']>0 for g in games),'noSuccessGames':sum(g['successCount']==0 for g in games), 'firstSuccess':distribution([g['firstSuccess'] for g in games]),'firstDeath':distribution([g['firstDeath'] for g in games]),'firstSupportedKill':distribution([g['firstSupportedKill'] for g in games]),'wolfDeath':distribution([g['wolfDeath'] for g in games]),'wolfInterventionDuration':distribution([g['wolfInterventionDuration'] for g in games]),'matchLength':distribution([g['time'] for g in games]),'deathCount':distribution([g['deathCount'] for g in games]),'supportedKillCount':distribution([g['supportedKillCount'] for g in games]),'deathIntervals':distribution([v for g in per_game for v in g['deathIntervals']]),'supportedKillIntervals':distribution([v for g in per_game for v in g['supportedKillIntervals']]),'wins':dict(collections.Counter(g['winner'] for g in games)),'resultReasons':dict(collections.Counter(g['resultReason'] for g in games)),'stones':stone_totals([e for g in games for e in g['events']]),'early180Stones':stone_totals([e for g in games for e in g['events'] if e['time']<=180+1e-8]),'perGame':{'contract':'wf-table/1','columns':list(per_game[0]),'rows':per_game}}
  (root/f'{version}-{policy}-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
  print(version,policy,summary['full']['executed'],summary['full']['mainCauses'],summary['successGames'])
comparisons=[]
for policy in ['direct','all']:
 if ('new',policy) not in all_games or ('old',policy) not in all_games:continue
 paired=[]
 for a,b in zip(all_games['new',policy],all_games['old',policy]):
  assert a['seed']==b['seed']
  aw={w['scheduled']:w for w in a['windows'] if w['executed']};bw={w['scheduled']:w for w in b['windows'] if w['executed']}
  common=sorted(aw.keys()&bw.keys());wa=[aw[t] for t in common];wb=[bw[t] for t in common]
  paired.append({'seed':a['seed'],'pairedSchedules':common,'new':window_stats(wa),'old':window_stats(wb),'deltaSuccess':sum(w['mainCause']=='success' for w in wa)-sum(w['mainCause']=='success' for w in wb),'deltaGameLength':a['time']-b['time'],'deltaWolfInterventionDuration':a['wolfInterventionDuration']-b['wolfInterventionDuration'],'deltaSuccessFull':a['successCount']-b['successCount'],'bothHadFirstSuccess':a['firstSuccess'] is not None and b['firstSuccess'] is not None,'deltaFirstSuccessWhenBoth':a['firstSuccess']-b['firstSuccess'] if a['firstSuccess'] is not None and b['firstSuccess'] is not None else None})
 # Re-select pooled windows using the exact same seed/scheduled intersection.
 pooled_new=[];pooled_old=[]
 for a,b,p in zip(all_games['new',policy],all_games['old',policy],paired):
  pooled_new.extend(w for w in a['windows'] if w['executed'] and w['scheduled'] in p['pairedSchedules'])
  pooled_old.extend(w for w in b['windows'] if w['executed'] and w['scheduled'] in p['pairedSchedules'])
 comparisons.append({'policy':policy,'pairedNew':window_stats(pooled_new),'pairedOld':window_stats(pooled_old),'pairedGamesWithWindows':sum(bool(p['pairedSchedules']) for p in paired),'newGamesWithPairedSuccess':sum(p['new']['mainCauses'].get('success',0)>0 for p in paired),'oldGamesWithPairedSuccess':sum(p['old']['mainCauses'].get('success',0)>0 for p in paired),'deltaGameLength':distribution([p['deltaGameLength'] for p in paired]),'deltaWolfInterventionDuration':distribution([p['deltaWolfInterventionDuration'] for p in paired]),'deltaSuccessFull':distribution([p['deltaSuccessFull'] for p in paired]),'pairedGames':{'contract':'wf-table/1','columns':list(paired[0]),'rows':paired}})
(root/'comparisons.json').write_text(json.dumps({'comparisons':comparisons},ensure_ascii=False,indent=2)+'\n')
