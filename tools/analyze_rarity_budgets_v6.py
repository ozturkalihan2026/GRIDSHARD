"""Analytic proposal budgets, NOT a simulation or active game rule change."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
proposal=json.loads((ROOT/'docs/MODUL_ENDERLIK_ADAYLARI_V6.json').read_text(encoding='utf8'))
live=json.loads((ROOT/'server/data/module_roster_v2.json').read_text(encoding='utf8'))
assert {m['id'] for m in proposal['modules']}=={m['id'] for m in live['modules']}
rows=[]
for count in (1,2,4,8,14):
    extra=count-1
    rows.append({'enemy_modules':count,'naive_total_for_100_damage':100*(1+.2*extra),
        'bounded_fourth_hit_wave_for_24_damage':round(24*min(.2*extra,.6),2),
        'quantum_average_dps':round((3*10+24*(1+min(.2*extra,.6)))/(4*1.4),3)})
absorptions=[]
for damage in (20,50,100,200,1000):
    absorbed=min(damage*.7,60)
    absorptions.append({'incoming_damage':damage,'absorbed':absorbed,'recipient_hp_loss':damage-absorbed,
        'max_proposed_heal_shared_total':absorbed*.4,'unbounded_full_conversion_net_board_hp':damage*.7-damage*.3})
result={'kind':'analytic_bounds_not_battle_simulation','reviewed_modules':len(proposal['modules']),
 'area_examples':rows,'absorption_examples':absorptions,
 'plasma':{'current_max_dps':round(32*1.6/3.6,3),'proposed_max_dps_before_defense':round(29*(1+.6+.15)/3.6,3),
   'dot_seconds':3,'dot_per_second_fraction':.05,'dot_total_fraction':.15},
 'shield':{'current_max_block_per_second':60/6,'proposed_block_plus_heal_per_second':(60+24)/8},
 'note':'Numbers assume valid targets/missing HP, before armor, phase, shields, interruption and rounding. No human win-rate claim.'}
assert all(r['bounded_fourth_hit_wave_for_24_damage']<=14.4 for r in rows)
assert all(r['max_proposed_heal_shared_total']<=24 for r in absorptions)
out=ROOT/'artifacts/core-hero-v6';out.mkdir(exist_ok=True)
(out/'rarity-budgets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False))
