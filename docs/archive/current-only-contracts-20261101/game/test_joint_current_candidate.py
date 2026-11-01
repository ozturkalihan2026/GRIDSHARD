"""Opt-in 150 attack AND 100 protection economy; live defaults stay V7.1."""
from dataclasses import replace
import pytest
from app.game.engine import BattleEngine
from app.game.economy import CircuitCreditConfig,DEFAULT_CIRCUIT_CREDIT_CONFIG
from app.game.models import BattleState
from app.game.battle_actions_v2 import hit,heal,shield,params
from test_main_current_only_v2 import place


def battle():
    e=BattleEngine(BattleState('joint-current'),CircuitCreditConfig(
        current_regen_interval_ms=0,damage_current_threshold=150,
        damage_current_min_interval_ms=0,joint_absorption_threshold=100))
    for s in ('a','b'):
        p=e.add_player(s);e.grant_module(s,s+'-core','core');e.set_initial_active_module(s,s+'-core',2,1)
        p.circuit_credits=0
    e.start()
    a=place(e,'a','laser');b=place(e,'b','laser');phase=place(e,'a','phase_armor')
    b.definition=replace(b.definition,max_hp=10000);b.hp=10000
    return e,a,b,phase


@pytest.mark.parametrize('order',('attack_first','defense_first'))
def test_both_thresholds_required_in_either_order(order):
    e,a,b,phase=battle();p=e.state.players['a']
    actions=[lambda:hit(e,'a',a,'b',b,150),lambda:hit(e,'b',b,'a',phase,100)]
    if order=='defense_first':actions.reverse()
    actions[0]();assert p.circuit_credits==0
    actions[1]();assert p.circuit_credits==1 and p.damage_current_earned==1
    assert p.damage_current_progress==p.joint_absorption_progress==0


def test_surplus_carries_and_multiple_pairs_pay_without_a_wait():
    e,a,b,phase=battle();p=e.state.players['a']
    hit(e,'a',a,'b',b,460);hit(e,'b',b,'a',phase,250)
    assert p.circuit_credits==2 and p.damage_current_progress==160 and p.joint_absorption_progress==50
    hit(e,'b',b,'a',phase,50)
    assert p.circuit_credits==3 and e.state.elapsed_ms==0
    assert p.damage_current_progress==10 and p.joint_absorption_progress==0


def test_passive_income_and_daily_meta_are_disabled_in_candidate():
    e,_,_,_=battle();e.state.player_daily_meta_ids['a']='current_support'
    for _ in range(1000):e._apply_passive_circuit_credit_income()
    assert all(p.circuit_credits==0 for p in e.state.players.values())


def test_damage_alone_and_absorption_alone_never_pay():
    e,a,b,phase=battle();p=e.state.players['a']
    hit(e,'a',a,'b',b,1000)
    assert p.circuit_credits==0 and p.joint_damage_total==1000
    e,a,b,phase=battle();p=e.state.players['a']
    hit(e,'b',b,'a',phase,1000)
    assert p.circuit_credits==0 and p.joint_absorption_total==phase.hp


def test_repaired_hp_cannot_fill_attack_counter_twice():
    e,a,b,_=battle();p=e.state.players['a']
    hit(e,'a',a,'b',b,100);heal(e,'b',b,b,100);hit(e,'a',a,'b',b,100)
    assert p.damage_current_progress==100
    hit(e,'a',a,'b',b,50);assert p.damage_current_progress==150


def test_core_attack_and_core_own_guard_do_not_replace_module_roles():
    e,a,b,_=battle();p=e.state.players['a'];core=p.modules['a-core']
    hit(e,'a',core,'b',b,200);assert p.damage_current_progress==0
    p.core_signature_state['v5_mode']={'kind':'fortress','ends_at_ms':6000,'reduction':.6}
    hit(e,'b',b,'a',core,100);assert p.joint_absorption_total==0
    shield(e,'a',core,a,100);hit(e,'b',b,'a',a,100)
    assert p.joint_absorption_total==0


def test_shield_pays_for_actual_protection_not_creation_or_overkill():
    e,a,b,_=battle();p=e.state.players['a'];source=place(e,'a','buffer_shield')
    shield(e,'a',source,a,60,5000,'buffer');assert p.joint_absorption_total==0
    hit(e,'b',b,'a',a,100)
    assert p.joint_absorption_total==60
    a.hp=1;shield(e,'a',source,a,60,5000,'buffer');hit(e,'b',b,'a',a,1000)
    assert p.joint_absorption_total==60


def test_armor_and_dome_credit_effective_marginal_prevention_once():
    e,a,b,_=battle();p=e.state.players['a'];armor=place(e,'a','armor');dome=place(e,'a','guardian_dome')
    before=armor.hp;hit(e,'b',b,'a',armor,100)
    assert p.joint_absorption_total==100-(before-armor.hp)
    assert p.joint_absorption_total>round(100*params(armor)['reduction'])
    # Both stages reduce an overkill hit but the target still dies: no new credit.
    armor.hp=1;e.state.elapsed_ms=10000;prior=p.joint_absorption_total
    hit(e,'b',b,'a',armor,10000);assert p.joint_absorption_total==prior


def test_destroyed_bastion_can_still_supply_real_shield_protection():
    e,a,b,_=battle();p=e.state.players['a'];source=place(e,'a','last_bastion')
    e.apply_damage('a',source.instance_id,source.hp)
    core=p.modules['a-core'];before=core.hp;hit(e,'b',b,'a',core,50)
    assert core.hp==before and p.joint_absorption_total==50


def test_reflection_and_friendly_damage_do_not_mint_income():
    e,a,b,phase=battle();p=e.state.players['a'];reflector=place(e,'b','reflector')
    source=place(e,'a','buffer_shield');shield(e,'a',source,a,100)
    hit(e,'a',a,'b',reflector,100)
    assert p.joint_absorption_total==0
    before=p.joint_damage_total;hit(e,'a',a,'a',phase,100)
    assert p.joint_absorption_total==0 and p.joint_damage_total==before


def test_stripping_a_shield_is_not_absorbed_damage():
    e,a,_,_=battle();breaker=place(e,'b','shield_breaker');source=place(e,'a','buffer_shield')
    shield(e,'a',source,a,60,5000,'buffer');hit(e,'b',breaker,'a',a,100)
    assert e.state.players['a'].joint_absorption_total==10


def test_current_cap_discards_both_banks():
    e,a,b,phase=battle();p=e.state.players['a'];p.circuit_credits=11
    hit(e,'a',a,'b',b,600);hit(e,'b',b,'a',phase,400)
    assert p.circuit_credits==12 and p.damage_current_earned==1
    assert p.damage_current_progress==p.joint_absorption_progress==0
    p.circuit_credits=0;hit(e,'a',a,'b',b,1);assert p.circuit_credits==0


def test_execution_talent_cannot_bypass_the_only_income_source():
    from app.game.models import TimedModuleEffect
    from app.game.core_actions_v5 import tick_effects
    e,_,target,_=battle();p=e.state.players['a'];p.core_type='core_disruptor'
    target.hp=50
    target.debuffs['core_execution']=TimedModuleEffect('core_execution','Execution',None,
        {'source_player_id':'a','execute_at_ms':0,'execution_current':1})
    tick_effects(e)
    assert target.hp==0 and p.circuit_credits==0 and p.joint_damage_total==0


def test_defaults_and_invalid_config_remain_protected():
    c=CircuitCreditConfig()
    assert (c.current_regen_interval_ms,c.damage_current_threshold,c.damage_current_min_interval_ms,c.joint_absorption_threshold)==(2500,200,6000,0)
    for config in (replace(c,current_regen_interval_ms=0),replace(c,damage_current_min_interval_ms=0),
                   replace(c,joint_absorption_threshold=-1),replace(c,joint_absorption_threshold=100,damage_current_threshold=0)):
        with pytest.raises(ValueError):BattleEngine(BattleState('invalid'),config)
