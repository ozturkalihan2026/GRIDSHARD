"""Fixed, paired placement policies on the real engine; not human win rates."""
from pathlib import Path
import sys,json,hashlib,itertools,statistics,time,argparse
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app.game.engine import BattleEngine
from app.game.models import BattleState,BattleCommand,ModuleStatus
from app.game.ai import should_use_core_power
from app.module_roster import MODULE_SPECS
DECKS={
 'attack':[
 ('laser','pulse_cannon','burst_cannon','missile_launcher','railgun','drone_bay'),
 ('arc_cannon','plasma_mortar','quantum_repeater','shield_breaker','laser','railgun'),
 ('burst_cannon','drone_bay','arc_cannon','missile_launcher','plasma_mortar','quantum_repeater')],
 'defense':[
 ('shield','armor','barrier','reflector','guardian_dome','laser'),
 ('armor','guardian_dome','phase_armor','buffer_shield','last_bastion','laser'),
 ('shield','reflector','buffer_shield','phase_armor','last_bastion','laser')],
 'mixed':[
 ('laser','pulse_cannon','shield','armor','repair','amplifier'),
 ('arc_cannon','plasma_mortar','guardian_dome','buffer_shield','cleanser','speed_relay'),
 ('quantum_repeater','shield_breaker','phase_armor','last_bastion','emp','virus')],
}
CORES=('core_resonance','core_guardian','core_overdrive')
THIRD_CANDIDATES={
 'sustain':('quantum_repeater','drone_bay','phase_armor','last_bastion','repair','virus'),
 'buffer':('quantum_repeater','drone_bay','armor','buffer_shield','repair','virus'),
 'boost':('quantum_repeater','shield_breaker','guardian_dome','buffer_shield','amplifier','cleanser'),
}
if '--mixed-third' in sys.argv:DECKS['mixed'][2]=THIRD_CANDIDATES[sys.argv[sys.argv.index('--mixed-third')+1]]
if '--all-cores' in sys.argv:CORES+=('core_disruptor','core_phoenix','core_quantum','core_capacitor')
if '--shared-deck' in sys.argv:
 for policy in ('attack','defense'):DECKS[policy]=DECKS['mixed']

def choose(e,side,policy,seed):
 p=e.state.players[side];alive=[u for u in p.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and u.definition.id!='core']
 counts={c:sum(u.definition.combat_class==c for u in alive) for c in ('saldırı','savunma','taktik')}
 deck=p.battle_pool.module_definition_ids
 eligible=[k for k in deck if policy=='mixed' or MODULE_SPECS[k]['category']==('saldırı' if policy=='attack' else 'savunma')]
 candidates=[]
 for k in eligible:
  spec=MODULE_SPECS[k];cat=spec['category']
  role=0
  if policy=='mixed':
   enemy=next(v for key,v in e.state.players.items() if key!=side)
   enemy_live=[u for u in enemy.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and u.definition.id!='core']
   enemy_weapons=sum(u.definition.combat_class=='saldırı' for u in enemy_live)
   camping=enemy_weapons==0 or (enemy_weapons<=1 and len(enemy_live)>=4)
   desired={'saldırı':.75,'savunma':.15,'taktik':.10} if camping else {'saldırı':.5,'savunma':.3,'taktik':.2}
   role=(desired[cat]*(len(alive)+1)-counts[cat])*4
   if counts['saldırı']==0:role+=8 if cat=='saldırı' else -8
   if cat=='taktik' and counts['saldırı']<1:role-=8
   if k=='repair' and not any(u.hp<u.definition.max_hp for u in alive):role-=5
   if k=='cleanser' and not any(u.debuffs for u in alive):role-=6
  copies=sum(u.definition.id==k for u in alive)
  deployed=sum(u.definition.id==k for u in p.modules.values())
  tie=int(hashlib.sha256(f'{seed}:{len(p.modules)}:{k}'.encode()).hexdigest()[:8],16)/2**32
  candidates.append((role-copies*.8-deployed*.10+tie,k))
 if not candidates:return None
 if policy=='mixed' and counts['saldırı']==0:
  candidates=[v for v in candidates if MODULE_SPECS[v[1]]['category']=='saldırı']
 best=max(candidates)[1]
 return best if MODULE_SPECS[best]['current_cost']<=p.circuit_credits else None

def choose_economy_aware(e,side,policy,seed):
 # No game quota: this bot budgets its opening instead of assuming future
 # passive income. Apply the SAME policy to both paired economy variants.
 p=e.state.players[side];deck=p.battle_pool.module_definition_ids
 alive=[u for u in p.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and u.definition.id!='core']
 affordable=[k for k in deck if MODULE_SPECS[k]['current_cost']<=p.circuit_credits]
 def cheapest(keys):return min(keys,key=lambda k:(MODULE_SPECS[k]['current_cost'],k)) if keys else None
 if policy=='mixed':
  counts={c:sum(u.definition.combat_class==c for u in alive) for c in ('saldırı','savunma')}
  needed='saldırı' if not counts['saldırı'] else 'savunma' if not counts['savunma'] else None
  if needed:
   keys=[k for k in affordable if MODULE_SPECS[k]['category']==needed]
   if keys:return cheapest(keys)
 else:
  affordable=[k for k in affordable if MODULE_SPECS[k]['category']==('saldırı' if policy=='attack' else 'savunma')]
 selected=choose(e,side,policy,seed)
 return selected or cheapest(affordable)


def run(left,right,index,core,level,seed,swap=False,talent=None,limit=900,regen=3000,threshold=100,economy_aware=False,starting=7,defense_threshold=50):
 from app.game.economy import CircuitCreditConfig
 e=BattleEngine(BattleState(battle_id=f'policy-v8-{seed}-{index}-{core}-{level}-{swap}'),circuit_credit_config=CircuitCreditConfig(
  starting_credits=starting,current_regen_interval_ms=regen,damage_current_threshold=threshold,defense_current_threshold=defense_threshold))
 policies={'a':right if swap else left,'b':left if swap else right}
 for side,policy in policies.items():
  p=e.add_player(side);p.core_type=core;p.core_level=level;deck=DECKS[policy][index]
  e.state.player_upgrade_levels[side]={k:level-1 for k in deck}
  if talent:
   thresholds={'common':(5,8,11,14),'rare':(6,9,12,15),'epic':(7,10,13,15),'legendary':(8,11,14,15)}
   e.state.player_module_talents[side]={k:{str(i):talent for i,t in enumerate(thresholds[MODULE_SPECS[k]['rarity']]) if level>=t} for k in deck}
  e.set_battle_pool(side,deck);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
 e.start();cursor=0;first_loss=None;placements={'a':{},'b':{}};born={};core_uses={'a':0,'b':0};income_times={'a':[],'b':[]};last_placement={'a':0,'b':0}
 for _ in range(limit*10):
  if e.state.tick%5==0:
   for side,enemy in (('a','b'),('b','a')):
    p=e.state.players[side]
    if should_use_core_power(p,e.state.players[enemy]):e.enqueue_command(BattleCommand(side,'use_core_power',{'request_id':f'{side}:{e.state.tick}'}))
    key=(choose_economy_aware if economy_aware else choose)(e,side,policies[side],seed)
    if key:e.enqueue_command(BattleCommand(side,'deploy_module',{'definition_id':key}))
  e.step()
  for event in e.state.events[cursor:]:
   d=event.data
   if event.type=='module_placed':
    side=d['player_id'];k=d['definition_id'];placements[side][k]=placements[side].get(k,0)+1;born[d['module_id']]=event.at_ms;last_placement[side]=event.at_ms
   if event.type=='circuit_credits_awarded':income_times[d['player_id']].append(event.at_ms/1000)
   if event.type=='module_destroyed' and d['module_id'] in born and first_loss is None:first_loss=event.at_ms/1000
   if event.type=='core_power_used':core_uses[d['player_id']]+=1
  cursor=len(e.state.events)
  if e.state.status.value=='finished':break
 winner=e.state.winner_player_id
 return {'policies':policies,'deck_index':index,'decks':{s:DECKS[p][index] for s,p in policies.items()},'core':core,'level':level,'seed':seed,'swapped':swap,'talents':talent,
  'winner_policy':policies.get(winner),'winner_side':winner,'finished':e.state.status.value=='finished','seconds':e.state.elapsed_ms/1000,
  'first_loss_seconds':first_loss,'placements':placements,'core_uses':core_uses,
  'core_contributions':{s:p.core_contributions for s,p in e.state.players.items()},'damage_current':{s:p.damage_current_earned for s,p in e.state.players.items()},
  'income_times':income_times,'last_placement_seconds':{s:v/1000 for s,v in last_placement.items()},
  'survivors':{s:[{'id':u.definition.id,'hp':u.hp,'max_hp':u.definition.max_hp}
   for u in p.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0] for s,p in e.state.players.items()},
  'economy_end':{s:{'balance':p.circuit_credits,'earned':p.total_circuit_credits_earned,'spent':p.total_circuit_credits_spent,
   'damage_total':p.attack_current_total,'damage_progress':p.damage_current_progress,
   'received_total':p.defense_current_total,
   'received_progress':p.defense_current_progress} for s,p in e.state.players.items()}}

def summarize(rows):
 summary={}
 for policy in DECKS:
  games=[r for r in rows if policy in r['policies'].values()]
  wins=sum(r['winner_policy']==policy for r in games);timeouts=sum(not r['finished'] for r in games)
  summary[policy]={'games':len(games),'wins':wins,'losses':len(games)-wins-timeouts,'timeouts':timeouts,'win_pct_all_games':round(100*wins/len(games),2) if games else None}
 pairs={}
 for left,right in itertools.combinations(DECKS,2):
  games=[r for r in rows if set(r['policies'].values())=={left,right}]
  pairs[f'{left}_vs_{right}']={'games':len(games),'left_wins':sum(r['winner_policy']==left for r in games),'right_wins':sum(r['winner_policy']==right for r in games),'timeouts':sum(not r['finished'] for r in games)}
 return {'policies':summary,'pairs':pairs,'games':len(rows),'finished':sum(r['finished'] for r in rows),'timeouts':sum(not r['finished'] for r in rows),
  'seconds_median_finished':statistics.median(r['seconds'] for r in rows if r['finished']) if any(r['finished'] for r in rows) else None,
  'human_win_rate_estimate':False,'forced_end_in_game':False,'observation_limit_seconds':900,
  'interpretation':'Equal-level fixed bots; each policy faces the other two equally. Defense plays no attack card but uses the same offensive core. Pair table is primary; aggregate depends on this opponent population.'}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--quick',action='store_true');parser.add_argument('--talent',choices=['power','resilience']);parser.add_argument('--regen',type=int,default=3000);parser.add_argument('--threshold',type=int,default=100);parser.add_argument('--seeds',type=int,default=1);parser.add_argument('--all-cores',action='store_true');parser.add_argument('--shared-deck',action='store_true');parser.add_argument('--mixed-third',choices=THIRD_CANDIDATES);parser.add_argument('--seed-base',type=int,default=19)
 parser.add_argument('--defense-threshold',type=float,default=50)
 parser.add_argument('--starting',type=int,default=7)
 parser.add_argument('--deck-index',type=int,choices=range(3))
 parser.add_argument('--economy-aware',action='store_true')
 args=parser.parse_args()
 out=ROOT/'artifacts'/args.output;out.mkdir(parents=True,exist_ok=True)
 rows=[];started=time.time()
 for index,core,level,(left,right),swap,seed_index in itertools.product((args.deck_index,) if args.deck_index is not None else range(1 if args.quick else 3),CORES[:1] if args.quick else CORES,(1,) if args.quick else ((15,) if args.talent else (1,8,15)),itertools.combinations(DECKS,2),(False,True),range(args.seeds)):
  rows.append(run(left,right,index,core,level,args.seed_base+index+seed_index*101,swap,args.talent,regen=args.regen,threshold=args.threshold,economy_aware=args.economy_aware,starting=args.starting,defense_threshold=args.defense_threshold))
  (out/'battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
  if len(rows)%6==0:print(json.dumps({'completed':len(rows),'elapsed_seconds':round(time.time()-started,1)}),flush=True)
 result=summarize(rows);result['runtime_seconds']=round(time.time()-started,2)
 result.update(policy_version='adaptive_mixed_v3',passive_current_ms=args.regen,damage_current_threshold=args.threshold)
 result.update(shared_deck=args.shared_deck,seeds=args.seeds,cores=CORES,mixed_third=args.mixed_third,seed_base=args.seed_base)
 result.update(starting_current=args.starting,defense_current_threshold=args.defense_threshold)
 if args.deck_index is not None:result['deck_index_shard']=args.deck_index
 if args.economy_aware:result['policy_version']='budgeted_opening_v1'
 (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False),flush=True)
