"""Current-only behavior replaces retired supply/heat and 36-card contracts."""
import importlib.util
import pytest
from app.module_roster import MODULE_SPECS,RETIRED_MODULE_IDS
from app.game.engine import BattleEngine
from app.game.models import BattleState,ModuleStatus,TimedModuleEffect
from app.game.operations import module_is_operational
from app.game.combat import select_target
from app.game.battle_actions_v2 import hit
from app.game.pvp_session import PvPSessionService

def battle():
    e=BattleEngine(BattleState(battle_id='current-cleanup'))
    for side in ('a','b'):
        e.add_player(side);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    e.start();return e

def add(e,side,key,iid=None):
    p=e.state.players[side];u=e.grant_module(side,iid or key,key)
    used={m.position for m in p.modules.values() if m.status==ModuleStatus.ACTIVE}
    u.position=next(v for v in e.board.placeable_positions if v not in used);u.status=ModuleStatus.ACTIVE
    return u

@pytest.mark.parametrize('key',tuple(MODULE_SPECS))
def test_emp_interrupts_work_without_removing_any_cards_physical_presence(key):
    e=battle();u=add(e,'b',key)
    assert module_is_operational(u)
    e.add_debuff('b',key,'emp_disabled','EMP',1000)
    assert not module_is_operational(u)
    assert u in e.state.players['b'].modules.values() and u.position is not None
    assert select_target(e.state.players['b']) is u
    assert not any(hasattr(u,field) for field in ('heat','is_powered','stored_energy','energy_waiting'))

def test_two_same_tick_hits_consume_one_shield_block_then_recharge():
    e=battle();gun=add(e,'a','laser');target=add(e,'b','shield')
    before=target.hp
    hit(e,'a',gun,'b',target,100);hit(e,'a',gun,'b',target,100)
    assert before-target.hp==140
    e.state.elapsed_ms=target.cooldowns_ready_at_ms['block']
    before=target.hp;hit(e,'a',gun,'b',target,10)
    assert before-target.hp==4

def test_emp_suppresses_defense_and_reflection_without_a_supply_flag():
    e=battle();gun=add(e,'a','laser');target=add(e,'b','reflector')
    e.add_debuff('b',target.instance_id,'emp_disabled','EMP',1000)
    before=(gun.hp,target.hp);hit(e,'a',gun,'b',target,10)
    assert (gun.hp,target.hp)==(before[0],before[1]-10)

def test_current_target_priority_preserves_barrier_defense_tactic_and_attack_order():
    e=battle();units=[add(e,'b',key,iid) for key,iid in [('laser','a-gun'),('repair','a-repair'),('emp','a-emp'),('shield','a-shield'),('barrier','z-barrier')]]
    for expected in ('z-barrier','a-shield','a-emp','a-repair','a-gun','b-core'):
        u=select_target(e.state.players['b']);assert u.instance_id==expected
        e.apply_damage('b',expected,u.hp)
    assert select_target(e.state.players['b']) is None

def test_live_snapshot_contains_operational_status_and_no_removed_resources():
    service=PvPSessionService();session=service.create_session('cleanup-wire');service.join('cleanup-wire','a')
    u=add(session.engine,'a','laser');session.engine.add_debuff('a',u.instance_id,'emp_disabled','EMP',1000)
    p=service.snapshot('cleanup-wire','a')['players']['a'];view=next(m for m in p['modules'] if m['instance_id']==u.instance_id)
    assert view['operational'] is False
    assert not any('energy' in key or 'heat' in key or key in {'is_powered','power_reason'} for key in view)
    assert not any('energy' in key for key in p)

def test_retired_cards_and_engines_cannot_be_imported_back_into_battles():
    from app.game.catalog import get_module_definition
    for name in ('energy','heat','support','module_cycles','rarity_identity'):
        assert importlib.util.find_spec('app.game.'+name) is None
    for key in RETIRED_MODULE_IDS:
        with pytest.raises(ValueError):get_module_definition(key)
