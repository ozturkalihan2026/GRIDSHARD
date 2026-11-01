"""Camp-with-one-weapon versus varied main-game AI. No player placement quotas."""
from pathlib import Path
import sys,json,statistics
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app.game.engine import BattleEngine
from app.game.models import BattleState,ModuleStatus,BattleCommand
from app.game.ai import enqueue_ai_actions,should_use_core_power
from app.game.ai_archetypes import AI_ARCHETYPES
from app.game.economy import CircuitCreditConfig
from app.game.catalog import get_module_definition

CAMP=('pulse_cannon','shield','armor','barrier','guardian_dome','repair')

def run(style,seed,level=15,config=None):
    e=BattleEngine(BattleState(f'camp-v4-{seed}'),circuit_credit_config=config or CircuitCreditConfig())
    for side,deck in (('camp',CAMP),('ai',AI_ARCHETYPES[style].battle_pool_ids)):
        p=e.add_player(side);p.core_level=level;p.core_type='core_guardian' if side=='camp' else 'core_overdrive'
        e.state.player_upgrade_levels[side]={k:level-1 for k in deck}
        e.set_battle_pool(side,deck);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    e.start();rotation=0
    for _ in range(9000):
        if e.state.tick%5==0:
            for side,other in (('camp','ai'),('ai','camp')):
                if should_use_core_power(e.state.players[side],e.state.players[other]):
                    e.enqueue_command(BattleCommand(side,'use_core_power',{'request_id':f'{side}-{e.state.tick}'}))
            p=e.state.players['camp'];live=[u for u in p.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0]
            gun=any(u.definition.category=='saldırı' for u in live)
            card='pulse_cannon' if not gun and e.state.elapsed_ms>=30000 else CAMP[1+rotation%5]
            if e.state.elapsed_ms<30000 or gun or card=='pulse_cannon':
                if p.circuit_credits>=get_module_definition(card).current_cost and len(live)<15:
                    e.enqueue_command(BattleCommand('camp','deploy_module',{'definition_id':card}));rotation+=1
            enqueue_ai_actions(e,'ai','camp',style)
        e.step()
        if e.state.status.value=='finished':break
    return {'style':style,'seed':seed,'level':level,'winner':e.state.winner_player_id,'seconds':e.state.elapsed_ms/1000,
            'finished':e.state.status.value=='finished',
            'camp_guns_deployed':sum(u.definition.category=='saldırı' for u in e.state.players['camp'].modules.values()),
            'boards':{s:[(u.definition.id,u.hp) for u in p.modules.values() if u.status==ModuleStatus.ACTIVE] for s,p in e.state.players.items()},
            'current_from_damage':{s:getattr(p,'damage_current_earned',0) for s,p in e.state.players.items()}}

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--label',default='current');parser.add_argument('--no-pressure',action='store_true');args=parser.parse_args()
    config=CircuitCreditConfig(damage_current_threshold=0) if args.no_pressure else CircuitCreditConfig()
    rows=[run(style,seed,config=config) for style in AI_ARCHETYPES for seed in range(3)]
    out=ROOT/'artifacts/combat-readability-v4';out.mkdir(exist_ok=True)
    summary={'scenarios':len(rows),'camp_wins':sum(r['winner']=='camp' for r in rows),'finished':sum(r['finished'] for r in rows),
             'median_seconds':statistics.median(r['seconds'] for r in rows)}
    (out/(args.label+'.json')).write_text(json.dumps({'summary':summary,'battles':rows},ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(summary))
