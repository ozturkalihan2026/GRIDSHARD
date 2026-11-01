"""Main-engine diagnostic battles, not estimates of human win rates."""
from pathlib import Path
import sys,json,itertools,statistics,time
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app.game.engine import BattleEngine
from app.game.models import BattleState,BattleCommand,ModuleStatus
from app.game.ai import enqueue_ai_actions,should_use_core_power
from app.module_roster import STARTER_IDS
DECKS={
 'starter':STARTER_IDS,
 'burst':('burst_cannon','pulse_cannon','shield','buffer_shield','amplifier','speed_relay'),
 'pierce':('railgun','shield_breaker','armor','barrier','repair','emp'),
 'chain':('arc_cannon','plasma_mortar','guardian_dome','buffer_shield','cleanser','amplifier'),
 'repeat':('quantum_repeater','drone_bay','phase_armor','last_bastion','virus','repair'),
 'control':('laser','pulse_cannon','emp','virus','cleanser','barrier'),
 'fortress':('laser','railgun','armor','guardian_dome','reflector','repair'),
 'missiles':('missile_launcher','pulse_cannon','barrier','last_bastion','speed_relay','cleanser'),
}
CORES=('core_resonance','core_guardian','core_overdrive','core_disruptor','core_capacitor','core_phoenix','core_quantum')


def run(left,right,level,core,seed,talents=None,core_powers=None,config=None,core_skills=None):
 from app.game.economy import DEFAULT_CIRCUIT_CREDIT_CONFIG
 e=BattleEngine(BattleState(battle_id='roster-v2-'+str(seed)),circuit_credit_config=config or DEFAULT_CIRCUIT_CREDIT_CONFIG)
 for side,deck,power in (('a',DECKS[left],core),('b',DECKS[right],CORES[(CORES.index(core)+3)%7])):
  p=e.add_player(side);p.core_type=power;p.core_level=level
  p.core_skills=tuple((core_skills or {}).get(side,()))
  e.state.player_upgrade_levels[side]={key:level-1 for key in deck}
  if talents:
   e.state.player_module_talents[side]={key:dict(talents[side]) for key in deck}
  e.set_battle_pool(side,deck);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
 e.start();cursor=0;first_loss=None;peak=0;used=set();core_uses={'a':0,'b':0};lives=[];born={}
 for _ in range(9000):
  if e.state.tick%5==0:
   for side,enemy in (('a','b'),('b','a')):
    if (core_powers or {}).get(side,True) and should_use_core_power(e.state.players[side],e.state.players[enemy]):e.enqueue_command(BattleCommand(side,'use_core_power',{'request_id':f'{side}:{e.state.tick}'}))
    enqueue_ai_actions(e,side,enemy)
  e.step()
  for event in e.state.events[cursor:]:
   d=event.data
   if event.type=='module_placed':used.add(d['definition_id']);born[d['module_id']]=event.at_ms
   if event.type=='module_destroyed' and d['module_id'] in born:
    first_loss=event.at_ms if first_loss is None else first_loss
    lives.append((event.at_ms-born[d['module_id']])/1000)
   if event.type=='core_power_used':core_uses[d['player_id']]+=1
  cursor=len(e.state.events)
  peak=max(peak,*[sum(u.status==ModuleStatus.ACTIVE and u.definition.id!='core' for u in p.modules.values()) for p in e.state.players.values()])
  if e.state.status.value=='finished':break
 return {'left':left,'right':right,'level':level,'core':core,'seconds':e.state.elapsed_ms/1000,'winner':e.state.winner_player_id,
         'finished':e.state.status.value=='finished','first_loss_seconds':first_loss/1000 if first_loss else None,
         'median_module_life_seconds':statistics.median(lives) if lives else None,'peak_modules':peak,'cards_used':sorted(used),'core_uses':core_uses,
         'core_contributions':{s:p.core_contributions for s,p in e.state.players.items()},
         'current_from_damage':{s:p.damage_current_earned for s,p in e.state.players.items()},
         'total_current':{s:p.total_circuit_credits_earned for s,p in e.state.players.items()},
         'deployments':len(born)}


if __name__=='__main__':
 rows=[];start=time.time()
 for level in (1,15):
  for index,(left,right) in enumerate(itertools.combinations(DECKS,2)):
   rows.append(run(left,right,level,CORES[index%7],index))
 out=ROOT/'artifacts/main-roster-v2';out.mkdir(exist_ok=True)
 (out/'balance.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 durations=[r['seconds'] for r in rows if r['finished']]
 summary={'scenarios':len(rows),'finished':len(durations),'timeouts_900s':len(rows)-len(durations),'seconds_min':min(durations,default=0),
          'seconds_median':statistics.median(durations) if durations else 0,'seconds_max':max(durations,default=0),
          'observed_cards':sorted({c for r in rows for c in r['cards_used']}),'core_uses':sum(sum(r['core_uses'].values()) for r in rows),
          'runtime_seconds':round(time.time()-start,2)}
 (out/'balance-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(summary,ensure_ascii=False))
