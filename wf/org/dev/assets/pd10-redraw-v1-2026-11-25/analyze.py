from pathlib import Path
import json, collections, statistics
root=Path('/tmp/aos/arena_cheater/dev/pd10-redraw-v1-2026-11-25')
base=Path('/tmp/aos/arena_cheater/dev/pd10-2026-11-25-raw/pd10-new-all-results.json')
raw=root/'new/pd10-new-all-redraw-v1-results.json'
def table(rows):return {'contract':'wf-table/1','columns':list(rows[0]) if rows else [],'rows':rows}
def dist(vals):
 x=[v for v in vals if v is not None]
 return {'samples':len(vals),'occurred':len(x),'notOccurred':len(vals)-len(x),'mean':statistics.mean(x) if x else None,'median':statistics.median(x) if x else None,'min':min(x) if x else None,'max':max(x) if x else None}
def metric(games, schedules=None):
 ws=[w for g in games for w in g['windows'] if w['executed'] and (schedules is None or w['scheduled'] in schedules[g['seed']])]
 causes=dict(collections.Counter(w['mainCause'] for w in ws))
 return {'windows':len(ws),'causes':causes,'colorFraction':causes.get('colored-stones',0)/len(ws) if ws else None,'normalPlays':sum(w['mainCause']=='success' for w in ws),'successGames':sum(any(w['executed'] and w['mainCause']=='success' and (schedules is None or w['scheduled'] in schedules[g['seed']]) for w in g['windows']) for g in games)}
a=json.loads(base.read_text());b=json.loads(raw.read_text());rows=[]
for old,new in zip(a['rows'],b['rows']):
 assert old['seed']==new['seed']
 def one(g):
  ws=[w for w in g['windows'] if w['executed']];rs=[w for w in ws if w.get('redraw',{}).get('success')];plays=[w for w in ws if w['mainCause']=='success']
  tails=0
  for w in reversed(ws):
   if w['mainCause']!='colored-stones':break
   tails+=1
  after=[]
  for w in rs:
   p=next((p for p in plays if p['scheduled']>w['scheduled']),None)
   after.append({'redrawSchedule':w['scheduled'],'firstNormalPlayTime':p['time'] if p else None,'delay':p['time']-w['time'] if p else None})
  income=collections.defaultdict(collections.Counter);expense=collections.defaultdict(collections.Counter)
  for e in g['events']:
   if e['kind'] in ('income','expense'):
    for s in e['stones']:(income if e['kind']=='income' else expense)[e['source']][s['color']]+=1
  return {'windows':len(ws),'colorWindows':sum(w['mainCause']=='colored-stones' for w in ws),'normalPlays':len(plays),'firstNormalPlay':g['firstSuccess'],'redrawAttempts':sum('redraw' in w for w in ws),'redrawSuccesses':len(rs),'redrawRejectReasons':dict(collections.Counter(w['redraw']['reason'] for w in ws if 'redraw' in w and not w['redraw']['success'])),'zeroEffectiveActions':not plays and not rs,'lastWindowColorBlocked':bool(ws and ws[-1]['mainCause']=='colored-stones'),'trailingColorWindows':tails,'lastWindowRedrawWithoutFurtherWindow':bool(ws and ws[-1].get('redraw',{}).get('success')),'matchLength':g['time'],'wolfInterventionDuration':g['wolfInterventionDuration'],'incomeByColor':{k:dict(v) for k,v in income.items()},'expenseByColor':{k:dict(v) for k,v in expense.items()},'redrawFollowups':table(after),'initial':g['initial'],'final':g['final']}
 x=one(old);y=one(new);common=sorted({w['scheduled'] for w in old['windows'] if w['executed']}&{w['scheduled'] for w in new['windows'] if w['executed']})
 rows.append({'seed':new['seed'],'baseline':x,'redraw':y,'pairedSchedules':common,'deltaNormalPlays':y['normalPlays']-x['normalPlays'],'deltaColorWindows':y['colorWindows']-x['colorWindows'],'deltaMatchLength':y['matchLength']-x['matchLength']})
schedules={r['seed']:r['pairedSchedules'] for r in rows}
out={'revision':b['config']['revision'],'baseline':metric(a['rows']),'redraw':metric(b['rows']),'pairedBaseline':metric(a['rows'],schedules),'pairedRedraw':metric(b['rows'],schedules)}
for tag,games in [('baseline',a['rows']),('redraw',b['rows'])]:
 data=[r[tag] for r in rows];stats=out[tag]
 stats.update(lastWindowColorBlockedGames=sum(d['lastWindowColorBlocked'] for d in data),zeroNormalPlayGames=sum(d['normalPlays']==0 for d in data),zeroEffectiveActionGames=sum(d['zeroEffectiveActions'] for d in data),redrawAttempts=sum(d['redrawAttempts'] for d in data),redrawSuccesses=sum(d['redrawSuccesses'] for d in data),redrawRejectReasons=dict(sum((collections.Counter(d['redrawRejectReasons']) for d in data),collections.Counter())),lastWindowRedrawWithoutFurtherWindowGames=sum(d['lastWindowRedrawWithoutFurtherWindow'] for d in data),matchLength=dist([g['time'] for g in games]),wolfInterventionDuration=dist([g['wolfInterventionDuration'] for g in games]),firstNormalPlay=dist([g['firstSuccess'] for g in games]),redrawFollowupDelay=dist([f['delay'] for d in data for f in d['redrawFollowups']['rows']]),successByCard=dict(collections.Counter(w['selected']['cardId'] for g in games for w in g['windows'] if w.get('selected'))))
 events=[e for g in games for e in g['events']];totals=collections.defaultdict(collections.Counter)
 for e in events:
  if e['kind'] in ('income','expense'):
   for stone in e['stones']:totals[e['kind']+':'+e['source']][stone['color']]+=1
 stats['stones']={k:dict(v) for k,v in totals.items()}
out['originalSixZeroPlaySeeds']=table([r for r in rows if r['seed'] in [9,20,28,29,46,61]])
out['perGame']=table(rows)
(root/'comparison-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k not in ['perGame','originalSixZeroPlaySeeds']},ensure_ascii=False,indent=2))
for r in out['originalSixZeroPlaySeeds']['rows']:print(r['seed'],r['redraw']['normalPlays'],r['redraw']['redrawSuccesses'],r['redraw']['firstNormalPlay'])
