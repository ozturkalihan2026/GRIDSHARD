"""Main-game contracts for the approved three-class 24-card release."""
from dataclasses import replace
import pytest
from app.game.engine import BattleEngine,CommandRejected
from app.game.models import BattleState,ModuleStatus,TimedModuleEffect
from app.game.catalog import BASIC_MODULE_DEFINITIONS,get_module_definition
from app.game.catalog_view import build_module_catalog_view
from app.game.board import get_default_board
from app.module_roster import MODULE_SPECS,RETIRED_MODULE_IDS,STARTER_IDS


def battle():
    e=BattleEngine(BattleState(battle_id='main-v2'))
    for side in ('a','b'):
        e.add_player(side);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    e.start();return e


def place(e,side,key):
    p=e.state.players[side];u=e.grant_module(side,f'{side}-{key}-{len(p.modules)}',key)
    used={x.position for x in p.modules.values() if x.status==ModuleStatus.ACTIVE}
    u.status=ModuleStatus.ACTIVE;u.position=next(pos for pos in get_default_board().placeable_positions if pos not in used)
    return u


def advance(e,ms):
    for _ in range(ms//100):e.step()


def test_main_catalog_has_only_approved_modules_and_three_public_classes():
    data=build_module_catalog_view()
    assert len(data['modules'])==len(MODULE_SPECS)==24
    assert len(BASIC_MODULE_DEFINITIONS)==25
    assert set(data['category_order'])=={'saldırı','savunma','taktik'}
    assert set(c['category'] for c in data['modules'])==set(data['category_order'])
    assert not set(MODULE_SPECS)&RETIRED_MODULE_IDS
    assert len(STARTER_IDS)==6 and set(STARTER_IDS)<=set(MODULE_SPECS)
    for key in RETIRED_MODULE_IDS:
        with pytest.raises(ValueError):get_module_definition(key)


def test_main_deploy_allows_fourteen_identical_defenses_without_attacks():
    e=battle();p=e.state.players['a']
    from app.game.models import BattlePool
    p.battle_pool=BattlePool(STARTER_IDS)
    for _ in range(14):
        p.circuit_credits=12;e._cmd_deploy_module('a',{'definition_id':'shield'})
    assert len([u for u in p.modules.values() if u.definition.id=='shield'])==14
    with pytest.raises(CommandRejected):e._cmd_deploy_module('a',{'definition_id':'shield'})


@pytest.mark.parametrize('key',[k for k,s in MODULE_SPECS.items() if s['category']=='saldırı'])
def test_every_attack_card_operates_with_zero_energy_and_no_heat(key):
    e=battle();u=place(e,'a',key);target=place(e,'b','barrier')
    advance(e,5000)
    assert target.hp<target.definition.max_hp
    assert not any(hasattr(u,k) for k in ("heat","energy_waiting","is_powered"))
    assert not any('energy' in x.type or 'heat' in x.type for x in e.state.events)


def test_burst_has_three_distinct_hits_not_one_invisible_multiplier():
    e=battle();u=place(e,'a','burst_cannon');target=place(e,'b','barrier');advance(e,500)
    hits=[x for x in e.state.events if x.type=='attack_performed' and x.data['attacker_module_id']==u.instance_id]
    assert [x.data['damage'] for x in hits]==[8,8,8]
    assert target.hp==target.definition.max_hp-24


def test_block_breaker_has_no_hidden_armor_bypass():
    e=battle();place(e,'a','shield_breaker');target=place(e,'b','shield');e.step()
    assert target.hp==target.definition.max_hp-20
    e=battle();place(e,'a','shield_breaker');target=place(e,'b','armor');e.step()
    assert target.hp==target.definition.max_hp-round(20*.75)


def test_cleanser_removes_one_effect_and_has_no_extra_repair():
    e=battle();target=place(e,'a','laser');place(e,'a','cleanser')
    target.hp-=10
    target.debuffs['emp_disabled']=TimedModuleEffect('emp_disabled','Kesinti',5000)
    target.debuffs['virus']=TimedModuleEffect('virus','Yavaş',5000)
    e.step();assert len(target.debuffs)==1 and target.hp==target.definition.max_hp-10


def test_speed_relay_and_amplifier_are_visible_single_shot_charges():
    e=battle();u=place(e,'a','laser');place(e,'a','amplifier');place(e,'a','speed_relay')
    target=place(e,'b','barrier');e.step()
    assert target.hp==target.definition.max_hp-15
    assert u.cooldowns_ready_at_ms['attack']==800
    assert not u.mechanic_state.get('v2_damage_charge') and not u.mechanic_state.get('v2_speed_charge')
    from app.game.result import damage_by_module_from_events
    rows={r['definition_id']:r for r in damage_by_module_from_events(e.state.players['a'],e.state.events)}
    assert rows['amplifier']['support_value']==3
    assert rows['speed_relay']['support_value']==.2


def test_buffer_shield_is_consumed_and_last_bastion_preserves_core_wreck():
    e=battle();u=place(e,'a','barrier');place(e,'a','buffer_shield');e.step()
    before=u.hp;e.apply_damage('a',u.instance_id,50)
    assert u.hp==before-15
    e.apply_damage('a',u.instance_id,20);assert u.hp==before-21
    bastion=place(e,'a','last_bastion');e.apply_damage('a',bastion.instance_id,bastion.hp)
    core=e.state.players['a'].modules['a-core'];e.apply_damage('a','a-core',75)
    assert core.hp==core.definition.max_hp
    e.apply_damage('a','a-core',core.hp+100)
    assert core.hp==0 and core.position==get_default_board().core_position


@pytest.mark.parametrize('power',['core_resonance','core_guardian','core_overdrive','core_disruptor','core_capacitor','core_phoenix','core_quantum'])
def test_all_seven_core_powers_are_automatic_and_operational(power):
    e=battle();p=e.state.players['a'];p.core_type=power;p.core_power_charge=100
    u=place(e,'a','laser');u.hp-=80;place(e,'b','laser')
    if power=='core_capacitor':
        from app.game.models import BattlePool
        p.battle_pool=BattlePool(STARTER_IDS)
    e._cmd_use_core_power('a',{'request_id':'power'})
    assert p.core_power_uses==1 and p.core_power_charge==0
    assert any(x.type=='core_power_used' for x in e.state.events)


def test_first_core_charge_twenty_seconds_then_thirty_five():
    e=battle();p=e.state.players['a'];p.core_type='core_guardian';advance(e,20000)
    assert p.core_power_charge==pytest.approx(100)
    e._cmd_use_core_power('a',{'request_id':'one'});advance(e,35000)
    assert p.core_power_charge==pytest.approx(100)


def test_no_elapsed_time_pressure_or_forced_240_second_end():
    e=battle();advance(e,300000)
    assert e.state.status.value=='running'
    assert all(p.modules[s+'-core'].hp==450 for s,p in e.state.players.items())
