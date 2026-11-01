"""Exercise all 42 core choices alongside fully upgraded module talents."""
import json,statistics,time
from probe_main_roster_v2 import ROOT,CORES,run

rows=[];start=time.time()
for core in CORES:
    for branch,card_branch in (('energy','power'),('charge','resilience')):
        for seed,(left,right) in enumerate((('starter','burst'),('repeat','chain'),('pierce','fortress'))):
            picks={side:tuple(f'{i}_{branch}' for i in range(3)) for side in ('a','b')}
            modules={side:dict.fromkeys(map(str,range(4)),card_branch) for side in ('a','b')}
            rows.append({'branch':branch,**run(left,right,15,core,seed,talents=modules,core_skills=picks)})
summary={'scenarios':len(rows),'finished':sum(r['finished'] for r in rows),'timeouts_900s':sum(not r['finished'] for r in rows),
    'seconds_min':min(r['seconds'] for r in rows),'seconds_median':statistics.median(r['seconds'] for r in rows),
    'seconds_max':max(r['seconds'] for r in rows),'runtime_seconds':round(time.time()-start,2)}
out=ROOT/'artifacts/core-roles-v5'
(out/'core-talents-battles.json').write_text(json.dumps({'summary':summary,'rows':rows},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary))
