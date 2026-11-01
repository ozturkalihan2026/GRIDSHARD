"""Controlled survival/effect/core probes, isolated from accounts and AI."""
from __future__ import annotations
from dataclasses import replace
import json
from pathlib import Path
from statistics import median
import audit_module_balance as old
from app.game.models import ModuleStatus

OUT=Path(__file__).resolve().parents[1]/'artifacts/durability-current-20261028'
ATTACKS=[k for k,d in old.DEFINITIONS.items() if d.category=='saldırı']

def defense_lab():
    rows=[]
    for level in (1,8,15):
        for key,d in old.DEFINITIONS.items():
            if d.category!='savunma':continue
            for threat in ATTACKS:
                for neutral in (False,True):
                    e=old.setup(level);gun=old.add(e,'b',threat,0,0);gun.hp=10_000_000
                    target=old.add(e,'a',key,0,0)
                    if neutral:
                        baseline='laser' if d.current_cost==3 else 'quantum_cannon'
                        hp=old.arena_canon.module_stats(old.DEFINITIONS[baseline],level-1)['max_hp']
                        target.definition=replace(target.definition,id='neutral',behavior_id='neutral',category='saldırı',max_hp=hp,
                            base_damage=0,cooldown_ms=0,energy_consumption=0,action_energy_cost=0)
                        target.hp=hp
                    e.start()
                    for _ in range(900):
                        e.step()
                        if target.hp<=0:break
                    hits=[ev for ev in e.state.events if ev.type=='attack_performed' and ev.data.get('target_module_id')==target.instance_id]
                    rows.append({'level':level,'defense':key,'threat':threat,'neutral':neutral,'hp':target.definition.max_hp,
                        'dead':target.hp<=0,'survival_ms':e.state.elapsed_ms,'hits':len(hits),
                        'blocked':sum(ev.data.get('reduced_damage',0) for ev in hits)})
    (OUT/'02-defense').mkdir(parents=True,exist_ok=True)
    (OUT/'02-defense/lab.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
    result={}
    for level in (1,8,15):
        result[level]={}
        for key in {r['defense'] for r in rows}:
            pairs=[(r,next(n for n in rows if n['level']==level and n['defense']==key and n['threat']==r['threat'] and n['neutral']))
                for r in rows if r['level']==level and r['defense']==key and not r['neutral']]
            result[level][key]={'median_survival_s':median(r['survival_ms']/1000 for r,n in pairs),
                'median_time_ratio':median(r['survival_ms']/n['survival_ms'] for r,n in pairs),
                'min_ratio':min(r['survival_ms']/n['survival_ms'] for r,n in pairs),
                'below_neutral':[r['threat'] for r,n in pairs if r['survival_ms']<n['survival_ms']],
                'censored_at_90s':sum(not r['dead'] for r,n in pairs)}
    (OUT/'02-defense/summary.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    print(json.dumps(result,indent=2),flush=True)

def core_lab():
    rows=[]
    for level in (1,8,15):
        for threat in ATTACKS:
            for copies in (1,2):
                for defense in (None,'shield','armor','barrier','prism_shield'):
                    e=old.setup(level)
                    for i in range(copies):old.add(e,'b',threat,i,0,f'b-gun-{i}').hp=10_000_000
                    core=e.state.players['a'].modules['a-core']
                    if defense:old.add(e,'a',defense,0,0)
                    e.start();first=None
                    for _ in range(1800):
                        e.step()
                        # Actual HP loss captures main, secondary, reflection etc.
                        if core.hp<core.definition.max_hp and first is None:first=e.state.elapsed_ms
                        if core.hp<=0:break
                    rows.append({'level':level,'threat':threat,'copies':copies,'defense':defense,
                        'core_max_hp':core.definition.max_hp,'core_destroyed':core.hp<=0,
                        'total_ms':e.state.elapsed_ms,'first_core_damage_ms':first,
                        'exposed_ms':e.state.elapsed_ms-first if first is not None else None})
    (OUT/'04-core').mkdir(parents=True,exist_ok=True)
    (OUT/'04-core/lab.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
    summary={}
    for level in (1,8,15):
        summary[level]={}
        for copies in (1,2):
            summary[level][copies]={str(defense):{'median_total_s':median(r['total_ms']/1000 for r in rows if r['level']==level and r['copies']==copies and r['defense']==defense),
                'min_total_s':min(r['total_ms']/1000 for r in rows if r['level']==level and r['copies']==copies and r['defense']==defense)}
                for defense in (None,'shield','armor','barrier','prism_shield')}
    (OUT/'04-core/summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
    print(json.dumps(summary,indent=2),flush=True)

def support_lab():
    rows=[]
    for level in (1,8,15):
        for key,d in old.DEFINITIONS.items():
            if d.category not in ('destek','enerji','sabotaj'):continue
            for threat in ('laser','pulse_cannon','quantum_cannon','ion_spear'):
                for copies in (1,2):
                    e=old.setup(level);subject=old.add(e,'a',key,0,0,'a-00-subject')
                    # Every support gets a relevant opportunity: hot/wounded
                    # friendly guns; sabotage gets its intended role targets.
                    buddies=[old.add(e,'a','quantum_cannon',1,0,'a-90-gun'),old.add(e,'a','laser',3,0,'a-91-gun')]
                    for i in range(copies):old.add(e,'b',threat,i,0,f'b-gun-{i}').hp=10_000_000
                    for k,x in [('battery',3),('repair',4)]:old.add(e,'b',k,x,2).hp=10_000_000
                    e.start()
                    for buddy in buddies:buddy.hp=round(buddy.hp*.6);buddy.heat=85
                    # Storage is tested at its actual opportunity: a charged
                    # reserve facing a burst while the core reserve is empty.
                    # Cold, unused storage is not evidence of insufficient HP.
                    if key=='capacitor':
                        subject.stored_energy=10*subject.definition.effect_multiplier
                        e.state.players['a'].energy_stock=0
                    first=None;seen=0;kinds=set()
                    for _ in range(600):
                        e.step()
                        if key=='capacitor' and e.state.players['a'].module_energy_discharged.get(key,0)>0:
                            first=e.state.elapsed_ms if first is None else first;kinds.add('actual_storage_discharge')
                        for ev in e.state.events[seen:]:
                            z=ev.data;source=z.get('source_module_id',z.get('attacker_module_id'))
                            value=z.get('value',z.get('repair',max(0,z.get('heat_before',0)-z.get('heat_after',0))))
                            good=(source==subject.instance_id and ev.type in ('module_repaired','module_cooled','module_contribution','sabotage_applied')
                                  and (value>0 or ev.type=='sabotage_applied'))
                            if ev.type=='attack_support_applied':
                                good=any(c.get('source_module_id')==subject.instance_id and c.get('value',0)>0 for c in z.get('contributions',[]))
                            if good:first=ev.at_ms if first is None else first;kinds.add(ev.type)
                        seen=len(e.state.events)
                        if subject.hp<=0 or e.state.status.value=='finished':break
                    rows.append({'level':level,'id':key,'threat':threat,'copies':copies,'hp':subject.definition.max_hp,
                        'condition':'charged_burst' if key=='capacitor' else 'relevant_role_targets',
                        'destroyed':subject.hp<=0,'survival_ms':e.state.elapsed_ms,'first_use_ms':first,'kinds':sorted(kinds)})
    dest=OUT/'03-support';dest.mkdir(parents=True,exist_ok=True)
    (dest/'opportunity-lab.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
    report={}
    for key in {r['id'] for r in rows}:
        rs=[r for r in rows if r['id']==key]
        report[key]={'trials':len(rs),'no_use':sum(r['first_use_ms'] is None for r in rs),
            'median_first_use_ms':median([r['first_use_ms'] for r in rs if r['first_use_ms'] is not None]) if any(r['first_use_ms'] is not None for r in rs) else None,
            'median_life_s':median(r['survival_ms']/1000 for r in rs),
            'no_use_cases':[{k:r[k] for k in ('level','threat','copies','survival_ms')} for r in rs if r['first_use_ms'] is None]}
    (dest/'opportunity-summary.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':
    import sys
    {'defense':defense_lab,'support':support_lab,'core':core_lab}[sys.argv[1]]()
