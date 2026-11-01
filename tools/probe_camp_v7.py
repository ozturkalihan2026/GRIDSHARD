"""One-live-weapon camping stress policy; a bot choice, never a game quota."""
import sys,json,itertools,time
from pathlib import Path
import probe_strategy_v7 as probe
from app.game.models import ModuleStatus

probe.DECKS['mixed'][2]=probe.THIRD_CANDIDATES['buffer']
probe.DECKS['camp']=[
 ('laser','armor','guardian_dome','buffer_shield','repair','cleanser'),
 ('railgun','armor','guardian_dome','buffer_shield','repair','virus'),
 ('quantum_repeater','phase_armor','last_bastion','buffer_shield','repair','cleanser')]
original=probe.choose
def choose(e,side,policy,seed):
 if policy!='camp':return original(e,side,policy,seed)
 p=e.state.players[side];alive=[u for u in p.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and u.definition.id!='core']
 guns=[u for u in alive if u.definition.combat_class=='saldırı']
 deck=p.battle_pool.module_definition_ids
 if not guns:
  key=next(k for k in deck if probe.MODULE_SPECS[k]['category']=='saldırı')
  return key if p.circuit_credits>=probe.MODULE_SPECS[key]['current_cost'] else None
 candidates=[k for k in deck if probe.MODULE_SPECS[k]['category']!='saldırı']
 def score(k):
  value=-sum(u.definition.id==k for u in alive)
  if k=='repair' and not any(u.hp<u.definition.max_hp for u in alive):value-=4
  if k=='cleanser' and not any(u.debuffs for u in alive):value-=4
  return value,k
 key=max(candidates,key=score)
 return key if p.circuit_credits>=probe.MODULE_SPECS[key]['current_cost'] else None
probe.choose=choose

if __name__=='__main__':
 out=probe.ROOT/'artifacts/strategy-v7-camp';out.mkdir(exist_ok=True);rows=[];started=time.time()
 for index,core,level,swap in itertools.product(range(3),probe.CORES,(1,8,15),(False,True)):
  rows.append(probe.run('camp','mixed',index,core,level,907+index,swap))
 (out/'battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 result=probe.summarize(rows);result['runtime_seconds']=round(time.time()-started,2)
 (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False))
