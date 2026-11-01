"""Main game: pressure economy, non-stacking repair, real core outcomes and bots."""
from dataclasses import replace
import pytest
from app.game.engine import BattleEngine
from app.game.economy import CircuitCreditConfig
from app.game.models import BattleState,ModuleStatus,Position
from app.game.battle_actions_v2 import hit,heal
from app.game.ai_archetypes import AI_ARCHETYPES
from app.arena_canon import BOTS,unlocked_module_ids


def battle(level=1):
    e=BattleEngine(BattleState('readable-v4'),CircuitCreditConfig())
    for side in ('a','b'):
        e.add_player(side);e.state.players[side].core_level=level
        e.state.player_upgrade_levels[side]={'laser':level-1,'barrier':level-1}
        e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    a=put(e,'a','laser',0,0);b=put(e,'b','barrier',0,0)
    e.start();return e,a,b


def put(e,side,key,x,y):
    uid=f'{side}-{key}-{len(e.state.players[side].modules)}'
    u=e.grant_module(side,uid,key);u.status=ModuleStatus.ACTIVE;u.position=Position(x,y);return u


def use(e,power):
    p=e.state.players['a'];p.core_type=power;p.core_power_charge=100
    e._cmd_use_core_power('a',{'request_id':'actual-core'})
    return next(x.data for x in reversed(e.state.events) if x.type=='core_power_used')


def test_pressure_uses_only_new_hp_loss_and_never_repaired_hp_twice():
    e,gun,target=battle();p=e.state.players['a'];p.circuit_credits=0
    hit(e,'a',gun,'b',target,50);assert p.damage_current_progress==50
    heal(e,'b',target,target,50);hit(e,'a',gun,'b',target,50)
    assert p.damage_current_progress==50 and p.circuit_credits==0
    hit(e,'a',gun,'b',target,150);assert p.circuit_credits==0
    d=put(e,'a','barrier',1,0)
    e.apply_damage('a',d.instance_id,50,source_player_id='b',source_module_id='b-core')
    assert p.circuit_credits==1
    assert p.damage_current_earned==1


def test_paired_income_has_no_wait_and_clears_both_banks_at_cap():
    e,gun,target=battle();p=e.state.players['a'];p.circuit_credits=0
    target.definition=replace(target.definition,max_hp=10000);target.hp=10000
    d=put(e,'a','barrier',1,0)
    hit(e,'a',gun,'b',target,500)
    e.apply_damage('a',d.instance_id,250,source_player_id='b',source_module_id='b-core')
    assert p.circuit_credits==5 and p.damage_current_progress==p.defense_current_progress==0
    assert e.state.elapsed_ms==0
    p.circuit_credits=12;hit(e,'a',gun,'b',target,500)
    assert p.circuit_credits==12 and p.damage_current_progress==p.defense_current_progress==0


def test_overkill_and_reflection_are_not_damage_income():
    e,gun,target=battle();p=e.state.players['a'];p.circuit_credits=0;target.hp=20
    hit(e,'a',gun,'b',target,10000);assert p.damage_current_progress==20
    reflector=put(e,'b','reflector',1,0);before=e.state.players['b'].damage_current_progress
    hit(e,'a',gun,'b',reflector,20)
    assert e.state.players['b'].damage_current_progress==before


@pytest.mark.parametrize('level',(1,15))
def test_current_damage_threshold_is_visible_hp_at_every_level(level):
    e,gun,target=battle(level);p=e.state.players['a'];p.circuit_credits=0
    hit(e,'a',gun,'b',target,100)
    assert p.damage_current_progress==100 and p.circuit_credits==0
    d=put(e,'a','barrier',1,0)
    e.apply_damage('a',d.instance_id,50,source_player_id='b',source_module_id='b-core')
    assert p.circuit_credits==1


def test_passive_income_is_preserved_without_attacking():
    e,_,_=battle();p=e.state.players['a'];p.circuit_credits=0
    for side in e.state.players.values():
        for u in side.modules.values():
            if u.definition.id!='core':u.status=ModuleStatus.DESTROYED
    for _ in range(30):e.step()
    assert p.circuit_credits==1 and p.damage_current_earned==0


def test_repair_is_three_pulses_and_multiple_repairers_do_not_stack_on_one_ally():
    e,gun,_=battle();gun.hp-=100;before=gun.hp
    put(e,'a','repair',1,0);put(e,'a','repair',3,0)
    e.step();assert gun.hp-before==5
    for _ in range(20):e.step()
    assert gun.hp-before==15
    assert 'v4_repair' in gun.persistent_effects
















def test_small_repair_talent_bonuses_accumulate_instead_of_rounding_away():
    e,gun,_=battle();barrier=put(e,'a','barrier',1,0);barrier.hp-=200
    parameters=dict(barrier.definition.runtime_parameters);parameters['healing_received_multiplier']=1.03
    barrier.definition=replace(barrier.definition,runtime_parameters=parameters)
    before=barrier.hp
    for _ in range(20):heal(e,'a',gun,barrier,5)
    assert barrier.hp-before==103


def test_every_live_bot_deck_is_unlocked_at_its_rating_and_all_styles_differ():
    assert len(BOTS)==240 and len({x.battle_pool_ids for x in AI_ARCHETYPES.values()})==len(AI_ARCHETYPES)
    for bot in BOTS:
        assert len(set(bot['battle_pool_ids']))==6
        assert set(bot['battle_pool_ids'])<=set(unlocked_module_ids(bot['rating']))


def test_new_core_telemetry_keeps_opponent_current_private():
    from app.game.pvp_session import PvPSessionService
    e,_,_=battle();e.state.players['a'].circuit_credits=10
    e._emit('core_power_used',{'player_id':'a','effects':[{'kind':'current','value':2}]})
    from app.game.core_impact import record
    record(e,'a','current',2,'a','a-core','count')
    service=PvPSessionService()
    event=next(x for x in e.state.events if x.type=='core_power_used')
    assert service._event_for_viewer(event,'a')['data']['effects'][0]['value']==2
    assert service._event_for_viewer(event,'b')['data']['effects']==[]
    private=next(x for x in e.state.events if x.type=='core_contribution')
    assert service._event_for_viewer(private,'b') is None
    result={'a':{'current_from_damage':3,'core_contributions':{'current':2,'damage_boosted':12}}}
    public=service._result_summary_for_viewer(result,'b')['a']
    assert 'current_from_damage' not in public and 'current' not in public['core_contributions']
    assert public['core_contributions']['damage_boosted']==12
