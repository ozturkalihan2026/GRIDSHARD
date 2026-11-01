"""Compare deterministic real battles before/after structural cleanup, not balance."""
from pathlib import Path
import sys,json,hashlib,argparse,importlib.util
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
if '--before-source' in sys.argv:
    # Isolated in-memory reference replay; never swap live source files.
    source=Path(sys.argv[sys.argv.index('--before-source')+1])
    for name in ('models','talents','core_balance','economy','pressure_current','module_cycles','heat','operations','energy','combat','sabotage','support','catalog','result','engine','battle_actions_v2'):
        full='app.game.'+name
        spec=importlib.util.spec_from_file_location(full,source/(name+'.py'))
        module=importlib.util.module_from_spec(spec);sys.modules[full]=module;spec.loader.exec_module(module)
from app.game.engine import BattleEngine
from app.game.models import BattleState,BattleCommand
from app.game.ai import choose_deploy_definition,should_use_core_power
from app.module_roster import MODULE_SPECS

def normalized(value):
    if isinstance(value,dict):
        retired={'heat_reduced','energy_saved','energy_waits','overheat_events','thermal_saves','energy_generated','energy_consumed','energy_discharged','energy_generated_total','energy_consumed_total'}
        assert all(v in (0,0.0,None) for k,v in value.items() if k in retired),value
        return {k:normalized(v) for k,v in value.items() if k not in retired|{'is_powered','operational'}}
    if isinstance(value,(list,tuple)):return [normalized(v) for v in value]
    return value

def replay():
    classes={c:[k for k,m in MODULE_SPECS.items() if m['category']==c] for c in ('saldırı','savunma','taktik')}
    cores=('core_resonance','core_guardian','core_overdrive','core_disruptor','core_capacitor','core_phoenix','core_quantum')
    rows=[]
    for level in (1,15):
      for ci,core in enumerate(cores):
       for deck_index in range(5):
        name=f'cleanup-{level}-{core}-{deck_index}'
        e=BattleEngine(BattleState(battle_id=name))
        for side,offset in (('a',0),('b',1)):
            deck=tuple(classes[c][(2*deck_index+offset+i)%len(classes[c])] for c in classes for i in range(2))
            p=e.add_player(side);p.core_type=core if side=='a' else cores[(ci+3)%7];p.core_level=level
            e.state.player_upgrade_levels[side]={k:level-1 for k in deck}
            e.set_battle_pool(side,deck);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
        e.start()
        for tick in range(600):
            if e.state.status.value=='finished':break
            if tick%5==0:
                for side,enemy in (('a','b'),('b','a')):
                    p=e.state.players[side];opponent=e.state.players[enemy]
                    card=choose_deploy_definition(p,opponent)
                    if card:e.enqueue_command(BattleCommand(side,'deploy_module',{'definition_id':card}))
                    if should_use_core_power(p,opponent):e.enqueue_command(BattleCommand(side,'use_core_power',{'request_id':f'{side}-{tick}'}))
            e.step()
        events=[{'type':v.type,'at_ms':v.at_ms,'data':normalized(v.data)} for v in e.state.events]
        digest=hashlib.sha256(json.dumps(events,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        rows.append({'battle':name,'events':len(events),'sha256':digest})
    return rows

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('output',type=Path);p.add_argument('--compare',type=Path);p.add_argument('--before-source',type=Path);args=p.parse_args()
    rows=replay();args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8')
    if args.compare:
        old=json.loads(args.compare.read_text(encoding='utf8'))
        assert rows==old,[(a['battle'],a['sha256'],b['sha256']) for a,b in zip(old,rows) if a!=b]
    print(f'{len(rows)} deterministic combat replays '+('unchanged' if args.compare else 'recorded'))
