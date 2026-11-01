"""100 outgoing + 50 incoming HP, passive every 3s, start 7: opt-in only."""
from dataclasses import replace
import pytest
from app.game.engine import BattleEngine
from app.game.economy import CircuitCreditConfig,DEFAULT_CIRCUIT_CREDIT_CONFIG
from app.game.models import BattleState,ModuleStatus
from app.game.battle_actions_v2 import hit,shield,heal
from test_main_current_only_v2 import place


def battle():
    c=CircuitCreditConfig(starting_credits=7,current_regen_interval_ms=3000,
        damage_current_threshold=100,damage_current_min_interval_ms=0,joint_received_threshold=50)
    e=BattleEngine(BattleState('received-current'),c)
    for s in ('a','b'):
        e.add_player(s);e.grant_module(s,s+'-core','core');e.set_initial_active_module(s,s+'-core',2,1)
    e.start();a=place(e,'a','laser');b=place(e,'b','laser')
    for u in (a,b):u.definition=replace(u.definition,max_hp=10000);u.hp=10000
    return e,a,b


def test_start_7_and_passive_exactly_every_3_seconds():
    e,_,_=battle();p=e.state.players['a'];assert p.circuit_credits==7
    for _ in range(29):e._apply_passive_circuit_credit_income()
    assert p.circuit_credits==7
    e._apply_passive_circuit_credit_income();assert p.circuit_credits==8


@pytest.mark.parametrize('reverse',(False,True))
def test_both_thresholds_required_and_attack_only_can_qualify(reverse):
    e,a,b=battle();p=e.state.players['a']
    actions=[lambda:hit(e,'a',a,'b',b,100),lambda:hit(e,'b',b,'a',a,50)]
    if reverse:actions.reverse()
    actions[0]();assert p.circuit_credits==7
    actions[1]();assert p.circuit_credits==8 and p.damage_current_earned==1
    assert p.damage_current_progress==p.joint_received_progress==0
    assert all(u.definition.combat_class!='savunma' for u in p.modules.values())


def test_no_six_second_wait_and_surplus_is_preserved():
    e,a,b=battle();p=e.state.players['a'];p.circuit_credits=0
    hit(e,'a',a,'b',b,350);hit(e,'b',b,'a',a,125)
    assert p.circuit_credits==2 and p.damage_current_progress==150 and p.joint_received_progress==25
    hit(e,'b',b,'a',a,25)
    assert p.circuit_credits==3 and p.damage_current_progress==50 and p.joint_received_progress==0
    assert e.state.elapsed_ms==0


def test_absorbed_damage_is_not_received_hp_loss():
    e,a,b=battle();p=e.state.players['a'];source=place(e,'a','buffer_shield')
    hit(e,'a',a,'b',b,100);shield(e,'a',source,a,100)
    hit(e,'b',b,'a',a,100)
    assert p.circuit_credits==7 and p.joint_received_total==0
    hit(e,'b',b,'a',a,50);assert p.circuit_credits==8


def test_only_post_armor_hp_loss_counts():
    e,_,b=battle();armor=place(e,'a','armor');p=e.state.players['a'];before=armor.hp
    hit(e,'b',b,'a',armor,100)
    assert p.joint_received_total==before-armor.hp and 0<p.joint_received_total<100


def test_healing_and_redamaging_same_hp_does_not_farm_either_counter():
    e,a,b=battle();p=e.state.players['a']
    hit(e,'a',a,'b',b,80);heal(e,'b',b,b,80);hit(e,'a',a,'b',b,80)
    hit(e,'b',b,'a',a,40);heal(e,'a',a,a,40);hit(e,'b',b,'a',a,40)
    assert p.damage_current_progress==80 and p.joint_received_progress==40 and p.circuit_credits==7
    hit(e,'a',a,'b',b,20);hit(e,'b',b,'a',a,10)
    assert p.circuit_credits==8


def test_overkill_counts_actual_lost_hp_and_core_can_receive_damage():
    e,a,b=battle();p=e.state.players['a'];a.hp=20
    hit(e,'b',b,'a',a,10000);assert p.joint_received_total==20
    core=p.modules['a-core'];hit(e,'b',b,'a',core,30)
    assert p.joint_received_total==50


def test_core_own_attack_is_not_outgoing_bonus_but_enemy_core_can_hurt_you():
    e,a,b=battle();p=e.state.players['a']
    hit(e,'a',p.modules['a-core'],'b',b,100)
    assert p.damage_current_progress==0
    hit(e,'b',e.state.players['b'].modules['b-core'],'a',a,50)
    assert p.joint_received_total==50 and p.circuit_credits==7


def test_friendly_and_reflection_are_not_received_income():
    e,a,_=battle();p=e.state.players['a'];r=place(e,'b','reflector')
    hit(e,'a',a,'a',a,100);assert p.joint_received_total==0
    hit(e,'a',a,'b',r,100);assert p.joint_received_total==0


def test_dot_from_destroyed_enemy_weapon_is_still_real_received_damage():
    e,a,b=battle();p=e.state.players['a'];b.hp=0;b.status=ModuleStatus.DESTROYED
    hit(e,'b',b,'a',a,10,secondary=True,reflect=False,damage_kind='dot')
    assert p.joint_received_total==10


def test_passive_reaching_cap_clears_both_banks():
    e,a,b=battle();p=e.state.players['a'];p.circuit_credits=11
    hit(e,'a',a,'b',b,80);hit(e,'b',b,'a',a,40)
    assert p.damage_current_progress==80 and p.joint_received_progress==40
    for _ in range(30):e._apply_passive_circuit_credit_income()
    assert p.circuit_credits==12 and p.damage_current_progress==p.joint_received_progress==0
    p.circuit_credits=0;hit(e,'a',a,'b',b,20);hit(e,'b',b,'a',a,10)
    assert p.circuit_credits==0


def test_bonus_reaching_cap_drops_surplus_and_old_talent_cannot_add_extra_income():
    e,a,b=battle();p=e.state.players['a'];p.circuit_credits=11
    hit(e,'a',a,'b',b,500);hit(e,'b',b,'a',a,250)
    assert p.circuit_credits==12 and p.damage_current_earned==1
    assert p.damage_current_progress==p.joint_received_progress==0
    p.circuit_credits=0;e.award_circuit_credits('a',1,'core_execution_talent')
    assert p.circuit_credits==0


def test_candidate_is_exclusive_and_defaults_stay_unchanged():
    e,_,_=battle();c=e.circuit_credit_config
    for invalid in (replace(c,joint_absorption_threshold=100),replace(c,joint_received_threshold=-1)):
        with pytest.raises(ValueError):BattleEngine(BattleState('invalid'),invalid)
    d=DEFAULT_CIRCUIT_CREDIT_CONFIG
    assert (d.starting_credits,d.current_regen_interval_ms,d.joint_received_threshold)==(7,3000,50)
