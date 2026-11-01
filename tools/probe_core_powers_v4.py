"""Paired diagnostic battles: identical decks/seeds with and without own core."""
import json,statistics,time
from probe_main_roster_v2 import ROOT,CORES,run
rows=[];start=time.time()
for index,core in enumerate(CORES):
    for seed,(left,right) in enumerate((('starter','burst'),('burst','fortress'),('repeat','chain'),('pierce','missiles'))):
        for enabled in (False,True):
            rows.append({'enabled':enabled,**run(left,right,15,core,index*10+seed,core_powers={'a':enabled})})
out=ROOT/'artifacts/combat-readability-v4';out.mkdir(exist_ok=True)
summary={'scenarios':len(rows),'finished':sum(r['finished'] for r in rows),'runtime_seconds':round(time.time()-start,2),
         'by_core':{core:{'uses':sum(r['core_uses']['a'] for r in rows if r['core']==core and r['enabled']),
             'outcomes_changed':sum(rows[i]['winner']!=rows[i+1]['winner'] for i in range(0,len(rows),2) if rows[i]['core']==core),
             'actual_contributions':{kind:round(sum(r['core_contributions']['a'].get(kind,0) for r in rows if r['core']==core and r['enabled']),2)
                for kind in ('repair','damage_boosted','damage_blocked','revive','current','control_ms')}} for core in CORES}}
(out/'core-battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
(out/'core-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False))
