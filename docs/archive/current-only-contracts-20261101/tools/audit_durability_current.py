"""Read-only role durability and Current experiments; no gateway/player stores.

Candidates exist only in worker memory. The previous rejected balance proposal
is never applied; shared engine setup/decks are reused from the earlier audit.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import replace
import hashlib
from itertools import combinations
import json
from pathlib import Path
from statistics import median
import time
import audit_module_balance as old
from app.game.ai import enqueue_ai_actions, should_use_core_power
from app.game.economy import CircuitCreditConfig
from app.game.models import BattleCommand
from app.game.composition import deployment_rejection_reason
from app.game import core_stats
from app.game import heat as heat_rules
from app.game import ai_archetypes

ROOT=Path(__file__).resolve().parents[1]
BASE=dict(old.DEFINITIONS)
OUT=ROOT/'artifacts/durability-current-20261028'
# A named candidate is explicit and isolated; CLI may supply per-card HP.
HP={}
MAX_TICKS=2400
CORE_BASE_HP=core_stats.CORE_BASE_HP
BASE_ACTION_HEAT=heat_rules.HEAT_PER_ACTION_ENERGY
ECONOMIES={'current':(2500,12),'faster_2200':(2200,12),'faster_2000':(2000,12),
           'cap14':(2500,14),'cap16':(2500,16),'fast_cap14':(2200,14),
           'faster_1800':(1800,12),'fast2000_cap14':(2000,14),'fast_cap16':(2200,16)}

def formation_action(engine, owner, opponent):
    """A second diagnostic policy: build a frontline before the second gun.

    Same legal deck, Current and engine; never alters the actual product AI.
    """
    player=engine.state.players[owner]
    living=[m for m in player.modules.values() if m.hp>0 and m.status.value=='active']
    attacks=[m for m in living if m.definition.category=='saldırı']
    if attacks:
        present={m.definition.id for m in living}
        deck=player.battle_pool.module_definition_ids
        defense=[key for key in deck if BASE[key].category=='savunma']
        priorities=[]
        if not any(BASE[key].category=='savunma' for key in present if key in BASE):
            priorities+=defense
        if not any(key in present for key in ('repair','nano_medic','phoenix_repair')):
            priorities += [key for key in ('repair','nano_medic','phoenix_repair') if key in deck]
        if len(attacks)<2 and 'battery' in deck and 'battery' not in present:
            priorities.append('battery')
        for key in priorities:
            definition=old.DEFINITIONS[key]
            if deployment_rejection_reason(player,definition) is None:
                if player.circuit_credits>=definition.current_cost:
                    engine.enqueue_command(BattleCommand(owner,'deploy_module',{'definition_id':key}))
                return
    enqueue_ai_actions(engine,owner,opponent)

def initialize(hp=None,core_hp_multiplier=1.0,max_seconds=240,damage=None,action_heat=None,cost=None):
    global MAX_TICKS
    MAX_TICKS=round(max_seconds*10)
    core_stats.CORE_BASE_HP=round(CORE_BASE_HP*core_hp_multiplier)
    heat_rules.HEAT_PER_ACTION_ENERGY=BASE_ACTION_HEAT if action_heat is None else action_heat
    old.configure_decks(True)
    # Remove the built-in balanced bot's preferred-card bonuses when measuring
    # card strength. It otherwise favors repair/armor/pulse/targeting decks.
    ai_archetypes.AI_ARCHETYPES['audit_neutral']=replace(
        ai_archetypes.BALANCED_AI,id='audit_neutral',expansion_module_ids=())
    old.DEFINITIONS.clear();old.DEFINITIONS.update(BASE)
    for key,value in (hp or {}).items():old.DEFINITIONS[key]=replace(BASE[key],max_hp=value)
    for key,value in (damage or {}).items():old.DEFINITIONS[key]=replace(old.DEFINITIONS[key],base_damage=value)
    for key,value in (cost or {}).items():old.DEFINITIONS[key]=replace(old.DEFINITIONS[key],current_cost=value)

def stats(values):
    values=sorted(values)
    return {'n':len(values),'median':median(values) if values else None,
            'p10':values[int(.1*(len(values)-1))] if values else None,
            'p90':values[int(.9*(len(values)-1))] if values else None}

def fight(job):
    level,left,right,seed,economy,policy=job
    pair='|'.join(sorted((left,right)))
    digest=int(hashlib.sha256(f'{pair}:{seed}'.encode()).hexdigest()[:8],16)
    e=old.setup(level,talents=True,battle_id=f'durability:{pair}:{seed}',core_type=old.CORES[digest%len(old.CORES)])
    interval,cap=ECONOMIES[economy]
    e.circuit_credit_config=CircuitCreditConfig(current_regen_interval_ms=interval,maximum_current=cap)
    for owner,deck in [('a',left),('b',right)]:e.set_battle_pool(owner,old.DECKS[deck])
    e.start();born={};actions=Counter();useful=Counter();damage=Counter();first={};dead={};incoming=Counter()
    core_first={};core_hits=Counter();cap_ticks=Counter();empty_ticks=Counter();active_sum=Counter();active_peak=Counter()
    useful_kinds=Counter();seen=0;rejects=Counter();placements=[]
    active_samples=Counter();wait_samples=Counter();hot_samples=Counter();buildup=Counter();progress=[]
    def action(owner,mid,at,kind,amount=1):
        if owner not in e.state.players or mid not in e.state.players[owner].modules:return
        key=(owner,mid);useful[key]+=1;first.setdefault(key,at);useful_kinds[kind]+=1
        if kind=='damage':damage[key]+=amount
    for tick in range(MAX_TICKS):
        if e.state.status.value=='finished':break
        for owner,p in e.state.players.items():
            cap_ticks[owner]+=p.circuit_credits>=cap
            empty_ticks[owner]+=p.circuit_credits==0
            count=sum(m.hp>0 and m.status.value=='active' and m.definition.id!='core' for m in p.modules.values())
            active_sum[owner]+=count;active_peak[owner]=max(active_peak[owner],count)
            if count>=4:buildup.setdefault(owner,e.state.elapsed_ms)
            for m in p.modules.values():
                if m.hp>0 and m.status.value=='active' and m.definition.id!='core':
                    active_samples[owner]+=1;wait_samples[owner]+=bool(m.energy_waiting)
                    hot_samples[owner]+='overheated' in m.debuffs
        if tick%300==0:
            progress.append({'at_ms':e.state.elapsed_ms,'deployed':len(born),'destroyed':len(dead),
                'cores':{o:next(m.hp for m in p.modules.values() if m.definition.id=='core') for o,p in e.state.players.items()}})
        if tick%10==0:
            for owner,opponent in [('a','b'),('b','a')]:
                # An optional delayed reaction/bank policy supplements eager AI.
                if policy=='bank' and owner=='a' and tick<250:continue
                if policy=='quiet_bank' and tick<250:continue
                if policy=='slow' and owner=='a' and tick%30:continue
                p=e.state.players[owner]
                if should_use_core_power(p,e.state.players[opponent]):e.enqueue_command(BattleCommand(owner,'use_core_power',{'request_id':f'{owner}-{tick}'}))
                if policy=='formation' or policy=='formation_a' and owner=='a':
                    formation_action(e,owner,opponent)
                else:enqueue_ai_actions(e,owner,opponent,'audit_neutral' if policy=='neutral' else 'balanced')
        e.step()
        for ev in e.state.events[seen:]:
            d=ev.data
            if ev.type=='module_placed':
                k=(d['player_id'],d['module_id']);born[k]=ev.at_ms;placements.append({'owner':k[0],'id':d.get('definition_id'),'at':ev.at_ms})
            elif ev.type=='module_destroyed':dead[(d['player_id'],d['module_id'])]=ev.at_ms
            elif ev.type=='command_rejected':rejects[d.get('reason','unknown')]+=1
            elif ev.type=='attack_performed':
                k=(d['attacker_player_id'],d['attacker_module_id']);actions[k]+=1
                action(*k,ev.at_ms,'damage',d.get('damage',0))
                target=(d['target_player_id'],d['target_module_id']);incoming[target]+=1
                if e.state.players[target[0]].modules[target[1]].definition.id=='core':
                    core_first.setdefault(target[0],ev.at_ms);core_hits[target[0]]+=1
                if d.get('reduced_damage',0)>0:action(*target,ev.at_ms,'blocked')
            elif ev.type=='module_cycle_pulse':
                actions[(d.get('player_id'),d.get('module_id'))]+=1
                if d.get('blocked_damage',0)>0:action(d.get('player_id'),d.get('module_id'),ev.at_ms,'blocked')
            elif ev.type=='sabotage_applied':action(d.get('attacker_player_id'),d.get('attacker_module_id'),ev.at_ms,'sabotage')
            elif ev.type in ('module_repaired','module_cooled','module_contribution'):
                amount=d.get('value',d.get('repair',max(0,d.get('heat_before',0)-d.get('heat_after',0))))
                if amount>0:action(d.get('source_player_id',d.get('player_id')),d.get('source_module_id'),ev.at_ms,ev.type)
            elif ev.type=='attack_support_applied':
                for c in d.get('contributions',[]):action(d.get('player_id'),c.get('source_module_id',c.get('module_id')),ev.at_ms,'attack_support')
        seen=len(e.state.events)
    modules=[]
    for (owner,mid),birth in born.items():
        m=e.state.players[owner].modules[mid];death=dead.get((owner,mid));k=(owner,mid)
        modules.append({'id':m.definition.id,'owner':owner,'hp':m.definition.max_hp,'born_ms':birth,'death_ms':death,
            'exposure_ms':(death or e.state.elapsed_ms)-birth,'first_use_ms':first.get(k),
            'cycles':actions[k],'useful_events':useful[k],'damage':damage[k],'incoming_hits':incoming[k]})
    cores={owner:{'first_hit_ms':core_first.get(owner),'hits':core_hits[owner],
                  'hp':next(m.hp for m in p.modules.values() if m.definition.id=='core')}
           for owner,p in e.state.players.items()}
    ticks=max(1,e.state.tick)
    return {'level':level,'left':left,'right':right,'seed':seed,'economy':economy,'policy':policy,
        'winner':e.state.winner_player_id,'duration_ms':e.state.elapsed_ms,'timeout':e.state.status.value!='finished',
        'modules':modules,'cores':cores,'rejects':dict(rejects),
        'cap_fraction':{p:v/ticks for p,v in cap_ticks.items()},'empty_fraction':{p:v/ticks for p,v in empty_ticks.items()},
        'mean_active':{p:v/ticks for p,v in active_sum.items()},'peak_active':dict(active_peak),
        'four_modules_at_ms':dict(buildup),'progress':progress,'observation_limit_ms':MAX_TICKS*100,
        'energy_wait_fraction':{p:wait_samples[p]/max(1,v) for p,v in active_samples.items()},
        'overheated_fraction':{p:hot_samples[p]/max(1,v) for p,v in active_samples.items()},
        'spent':{o:p.total_circuit_credits_spent for o,p in e.state.players.items()},'placements':placements,
        'useful_event_kinds':dict(useful_kinds)}

def summarize(rows):
    groups={}
    for economy,policy,level in sorted({(r['economy'],r['policy'],r['level']) for r in rows}):
        games=[r for r in rows if (r['economy'],r['policy'],r['level'])==(economy,policy,level)]
        cards={}
        for key in BASE:
            if key=='core':continue
            ms=[m for g in games for m in g['modules'] if m['id']==key]
            deaths=[m for m in ms if m['death_ms'] is not None]
            cards[key]={'deployed':len(ms),'destroyed':len(deaths),
                'life_seconds':stats([m['exposure_ms']/1000 for m in deaths]),
                'dead_before_first_use':sum(m['first_use_ms'] is None for m in deaths),
                'dead_before_first_cycle':sum(m['cycles']==0 for m in deaths),
                'cycles':stats([m['cycles'] for m in deaths]),'incoming_hits':stats([m['incoming_hits'] for m in deaths]),
                'damage_per_current':stats([m['damage']/BASE[key].current_cost for m in ms])}
        decks={}
        for deck in old.DECKS:
            pairs=[(g,o) for g in games for o,side in [('a','left'),('b','right')] if g[side]==deck]
            if pairs:decks[deck]={'games':len(pairs),'wins':sum(g['winner']==o for g,o in pairs)}
        groups[f'{economy}:{policy}:L{level}']={'matches':len(games),'timeouts':sum(g['timeout'] for g in games),
            'seconds':stats([g['duration_ms']/1000 for g in games]),'cards':cards,'decks':decks,
            'mean_active':stats([v for g in games for v in g['mean_active'].values()]),
            'peak_active':stats([v for g in games for v in g['peak_active'].values()]),
            'four_modules_at_seconds':stats([v/1000 for g in games for v in g.get('four_modules_at_ms',{}).values()]),
            'players_reaching_four':sum(len(g.get('four_modules_at_ms',{})) for g in games),
            'energy_wait_fraction':stats([v for g in games for v in g.get('energy_wait_fraction',{}).values()]),
            'overheated_fraction':stats([v for g in games for v in g.get('overheated_fraction',{}).values()]),
            'destroyed_weapon_life_seconds':stats([m['exposure_ms']/1000 for g in games for m in g['modules'] if m['death_ms'] is not None and BASE[m['id']].category=='saldırı']),
            'destroyed_weapon_shots':stats([m['cycles'] for g in games for m in g['modules'] if m['death_ms'] is not None and BASE[m['id']].category=='saldırı']),
            'cap_fraction':stats([v for g in games for v in g['cap_fraction'].values()]),
            'empty_fraction':stats([v for g in games for v in g['empty_fraction'].values()]),
            'spent':stats([v for g in games for v in g['spent'].values()]),
            'loser_core_exposure_seconds':stats([(g['duration_ms']-g['cores'][g['winner'] and ('b' if g['winner']=='a' else 'a')]['first_hit_ms'])/1000
                for g in games if g['winner'] and g['cores']['b' if g['winner']=='a' else 'a']['first_hit_ms'] is not None])}
    return groups

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--hp-json');p.add_argument('--damage-json');p.add_argument('--workers',type=int,default=4)
    p.add_argument('--weapon-hp',type=float,default=1.0);p.add_argument('--defense-hp',type=float,default=1.0)
    p.add_argument('--support-hp',type=float,default=1.0);p.add_argument('--core-hp',type=float,default=1.0)
    p.add_argument('--max-seconds',type=int,default=240);p.add_argument('--brief',action='store_true')
    p.add_argument('--action-heat',type=float)
    p.add_argument('--cost-json')
    p.add_argument('--economies',nargs='+',default=['current'],choices=ECONOMIES);p.add_argument('--levels',nargs='+',type=int,default=[1,8,15])
    p.add_argument('--decks',nargs='+');p.add_argument('--policies',nargs='+',default=['eager'],choices=['eager','bank','slow','quiet_bank','formation','formation_a','neutral'])
    p.add_argument('--seeds',type=int,default=1);p.add_argument('--high-level-seeds',type=int);args=p.parse_args()
    hp={k:round(d.max_hp*({'saldırı':args.weapon_hp,'savunma':args.defense_hp}.get(d.category,args.support_hp)))
        for k,d in BASE.items() if k!='core'}
    damage=json.loads(args.damage_json or '{}')
    cost=json.loads(args.cost_json or '{}')
    hp.update(json.loads(args.hp_json or '{}'));initialize(hp,args.core_hp,args.max_seconds,damage,args.action_heat,cost)
    names=args.decks or list(old.DECKS)
    jobs=[(level,a,b,seed,economy,policy) for economy in args.economies for policy in args.policies for level in args.levels
          for first,second in combinations(names,2) for a,b in [(first,second),(second,first)]
          for seed in range(args.high_level_seeds if level==15 and args.high_level_seeds is not None else args.seeds)]
    dest=Path(args.output);dest.mkdir(parents=True,exist_ok=True)
    rows=[];start=time.monotonic()
    print(f'Starting {len(jobs)} fights; observation window {args.max_seconds}s; no gameplay timer added.',flush=True)
    with ProcessPoolExecutor(max_workers=args.workers,initializer=initialize,initargs=(hp,args.core_hp,args.max_seconds,damage,args.action_heat,cost)) as pool:
        for f in as_completed([pool.submit(fight,j) for j in jobs]):
            rows.append(f.result())
            if len(rows)%120==0:print(f'{len(rows)}/{len(jobs)} matches {time.monotonic()-start:.1f}s',flush=True)
    rows.sort(key=lambda r:(r['economy'],r['policy'],r['level'],r['left'],r['right'],r['seed']))
    (dest/'matches.json').write_text(json.dumps(rows),encoding='utf8')
    report=summarize(rows);(dest/'summary.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    (dest/'config.json').write_text(json.dumps({'hp':hp,'damage':damage,'action_heat':args.action_heat,'cost':cost,'core_hp_multiplier':args.core_hp,'max_seconds':args.max_seconds,
        'economies':{n:ECONOMIES[n] for n in args.economies},'jobs':len(jobs),
        'source_sha256':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [ROOT/'server/data/arena_progression_v1.json',ROOT/'server/app/game/economy.py',ROOT/'server/app/game/ai.py']}}),encoding='utf8')
    fields=('matches','timeouts','seconds','mean_active','destroyed_weapon_life_seconds','destroyed_weapon_shots','energy_wait_fraction','overheated_fraction','players_reaching_four')
    print(json.dumps({k:{a:b for a,b in v.items() if a in fields or not args.brief and a not in ('cards','decks')} for k,v in report.items()},indent=2),flush=True)

if __name__=='__main__':main()
