"""Actual counter-card coverage against the observed Armor/Buffer stall."""
import sys,json,itertools
from pathlib import Path
import probe_strategy_v7 as p

OUT=p.ROOT/'artifacts/buffer-counters-v8'
BASE=('quantum_repeater','drone_bay','armor','buffer_shield','repair','virus')
CANDIDATES={
 'observed':BASE,
 'breaker':('quantum_repeater','shield_breaker','armor','buffer_shield','repair','virus'),
 'area':('quantum_repeater','plasma_mortar','armor','buffer_shield','repair','virus'),
 'breaker_area':('shield_breaker','plasma_mortar','armor','buffer_shield','repair','virus'),
 'arena7_single':('laser','drone_bay','armor','buffer_shield','repair','speed_relay'),
 'arena7_arc':('arc_cannon','drone_bay','armor','buffer_shield','repair','speed_relay'),
}


def main():
 OUT.mkdir(exist_ok=True);results={}
 p.DECKS['defense'][2]=BASE
 for name,deck in CANDIDATES.items():
  p.DECKS['defense'][2]=('laser','drone_bay','armor','buffer_shield','repair','speed_relay') if name.startswith('arena7_') else BASE
  if name.startswith('arena7_'):
   assert all(p.MODULE_SPECS[k]['unlock_arena']<=7 for k in deck+p.DECKS['defense'][2])
  p.DECKS['mixed'][2]=deck
  rows=[p.run('defense','mixed',2,core,level,849,swap,starting=7,regen=3000,threshold=100,defense_threshold=50)
        for core,level,swap in itertools.product(p.CORES+('core_disruptor','core_phoenix','core_quantum'),(1,8,15),(False,True))]
  (OUT/f'{name}-battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
  results[name]=p.summarize(rows)
  print(name,json.dumps(results[name]['pairs']['defense_vs_mixed']),flush=True)
 (OUT/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')


if __name__=='__main__':main()
