"""Long observation and opening diagnostics for the opt-in joint economy.

Does not update live defaults, APKs, servers, profiles or deck/placement rules.
Run the paired probe_strategy_v7 matrices first (see the dated report).
"""
import json,itertools,statistics
from pathlib import Path
import probe_strategy_v7 as probe

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/joint-current-diagnostics'
probe.DECKS['mixed'][2]=probe.THIRD_CANDIDATES['buffer']


def read(name):return json.loads((ROOT/'artifacts'/name/'battles.json').read_text(encoding='utf8'))


def main():
    OUT.mkdir(exist_ok=True)
    rows=read('joint-budgeted-150-100');selected=[]
    for core,level in itertools.product(probe.CORES+('core_disruptor','core_phoenix','core_quantum'),(1,8,15)):
        candidates=[r for r in rows if not r['finished'] and r['core']==core and r['level']==level]
        # At most two per core/level, different opponent policy pair when possible.
        seen=set()
        for r in candidates:
            pair=tuple(sorted(r['policies'].values()))
            if pair in seen:continue
            selected.append(r);seen.add(pair)
            if len(seen)==2:break
    extended=[]
    for r in selected:
        left,right=sorted(r['policies'].values(),key=list(probe.DECKS).index)
        replay=probe.run(left,right,r['deck_index'],r['core'],r['level'],r['seed'],r['swapped'],
            limit=3600,regen=0,threshold=150,joint_absorption=100,economy_aware=True)
        extended.append(replay)
    (OUT/'extended-battles.json').write_text(json.dumps(extended,ensure_ascii=False,indent=2),encoding='utf8')
    # Takviye can summon an Attack card despite a Defense-only placement policy;
    # keep these matches separate from the strict three-policy matrix.
    reinforcement=[probe.run(left,right,0,'core_capacitor',level,1701,swap,
        regen=0,threshold=150,joint_absorption=100,economy_aware=True)
        for level,(left,right),swap in itertools.product((1,8,15),itertools.combinations(probe.DECKS,2),(False,True))]
    (OUT/'reinforcement-battles.json').write_text(json.dumps(reinforcement,ensure_ascii=False,indent=2),encoding='utf8')
    summary={'extended':{'games':len(extended),'finished_by_3600s':sum(r['finished'] for r in extended),
        'still_running_at_3600s':sum(not r['finished'] for r in extended),'forced_end':False},
        'reinforcement_separate':probe.summarize(reinforcement),
        'opening_costs':[{ 'deck':deck,
            'cheapest_attack':min(probe.MODULE_SPECS[k]['current_cost'] for k in deck if probe.MODULE_SPECS[k]['category']=='saldırı'),
            'cheapest_defense':min(probe.MODULE_SPECS[k]['current_cost'] for k in deck if probe.MODULE_SPECS[k]['category']=='savunma')}
            for deck in probe.DECKS['mixed']]}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(summary,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
