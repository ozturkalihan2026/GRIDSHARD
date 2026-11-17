"""Real-engine candidate acceptance; no live roster or player ownership bypass."""
from copy import deepcopy
import pytest

from app.game.recoil_cannon import definition,stats,tree,fire
from app.game.models import BattleModule,ModuleStatus,TimedModuleEffect
from app.game.battle_actions_v2 import tick,shield,heal,hit
from app.game.board import get_default_board
from app.game.result import damage_by_module_from_events
from test_main_current_only_v2 import battle,place,advance


def candidate(e,side='a',level=0,selections=None,instance='recoil-test'):
    player=e.state.players[side];gun=BattleModule.create(instance,definition(level,selections));gun.status=ModuleStatus.ACTIVE
    occupied={u.position for u in player.modules.values() if u.status==ModuleStatus.ACTIVE}
    gun.position=next(p for p in get_default_board().placeable_positions if p not in occupied)
    player.modules[instance]=gun
    return gun


def test_candidate_is_not_a_live_card_or_free_reward_before_release_acceptance():
    from app.game.catalog import get_module_definition
    from app.module_roster import MODULE_SPECS
    from app.game.battle_pool import validate_battle_pool,BattlePoolValidationError
    assert len(MODULE_SPECS)==24 and 'recoil_cannon' not in MODULE_SPECS
    with pytest.raises(ValueError):get_module_definition('recoil_cannon')
    with pytest.raises(BattlePoolValidationError):validate_battle_pool(('recoil_cannon','laser','shield','armor','repair','amplifier'))


def test_real_shot_hits_once_and_costs_sixteen_without_current_or_damage_farming():
    e=battle();gun=candidate(e);target=place(e,'b','shield');target.cooldowns_ready_at_ms['block']=100000
    before=target.hp;tick(e)
    assert gun.hp==224 and target.hp==before-50
    attacks=[v for v in e.state.events if v.type=='attack_performed' and v.data['attacker_module_id']==gun.instance_id]
    assert len(attacks)==1
    assert len([v for v in e.state.events if v.type=='module_recoil'])==1
    assert not any(v.type=='module_damaged' and v.data['module_id']==gun.instance_id for v in e.state.events)
    assert e.state.players['a'].attack_current_total==50
    assert e.state.players['a'].defense_current_total==0
    assert e.state.players['b'].attack_current_total==0
    own=next(r for r in damage_by_module_from_events(e.state.players['a'],e.state.events) if r['definition_id']=='recoil_cannon')
    assert own['damage']==50
    tick(e);assert gun.hp==224


def test_recoil_never_kills_and_bypasses_own_shield_without_spending_it():
    e=battle();gun=candidate(e);target=place(e,'b','armor');gun.hp=5
    shield(e,'a',gun,gun,100);tick(e)
    assert gun.hp==1 and gun.status==ModuleStatus.ACTIVE
    assert gun.persistent_effects['v2_shield_guard'].data['shield_hp']==100
    e.state.elapsed_ms=3000;tick(e);assert gun.hp==1
    hit(e,'b',target,'a',gun,1000);assert gun.status==ModuleStatus.DESTROYED


def test_emp_suppresses_shot_and_fee_and_phase_blocks_damage_without_refunding_fee():
    e=battle();gun=candidate(e);target=place(e,'b','phase_armor')
    gun.debuffs['emp_disabled']=TimedModuleEffect('emp_disabled','EMP',1000,{})
    tick(e);assert gun.hp==240 and not any(v.type=='module_recoil' for v in e.state.events)
    e.state.elapsed_ms=target.definition.cooldown_ms;before=target.hp;tick(e)
    assert gun.hp==224 and target.hp==before


def test_destroyed_or_obsolete_intent_cannot_fire_or_charge_and_replay_has_no_second_shot():
    e=battle();gun=candidate(e);target=place(e,'b','armor');target.hp=0
    assert not fire(e,'a',gun,target) and gun.hp==240
    target.hp=100;gun.hp=0;gun.status=ModuleStatus.DESTROYED
    assert not fire(e,'a',gun,target)
    gun.hp=240;gun.status=ModuleStatus.ACTIVE
    assert fire(e,'a',gun,target);saved=deepcopy(gun.mechanic_state)
    assert not fire(e,'a',gun,target) and gun.hp==224
    gun.mechanic_state=deepcopy(saved);assert not fire(e,'a',gun,target)


@pytest.mark.parametrize('level',range(15))
def test_hp_damage_and_recoil_share_one_level_multiplier_without_changing_cost_or_cadence(level):
    s=stats(level);scale=1.04**level
    assert s['max_hp']==round(240*scale) and s['base_damage']==round(50*scale,2)
    assert s['recoil_hp']==round(16*scale) and s['current_cost']==4 and s['cooldown_ms']==3000


def test_four_existing_talent_thresholds_and_signature_tradeoff_have_no_new_currency():
    assert [r['level'] for r in tree()]==[6,9,12,15]
    assert all(set(r)>={'circuit_credits_cost','flux_cost','choices'} for r in tree())
    damage=stats(14,{'1':'power'});soft=stats(14,{'1':'resilience'})
    assert damage['base_damage']>soft['base_damage'] and damage['recoil_hp']>soft['recoil_hp']
    with pytest.raises(ValueError):stats(0,{'1':'power'})


def test_live_stat_preview_uses_the_same_candidate_formula_once():
    from app.arena_canon import module_stats
    result=module_stats(definition(),14,{'0':'power','1':'resilience','2':'power','3':'power'})
    expected=stats(14,{'0':'power','1':'resilience','2':'power','3':'power'})
    assert result['max_hp']==expected['max_hp']
    assert result['base_damage']==expected['base_damage']
    assert result['parameters']['recoil_hp']==expected['recoil_hp']
    assert result['specials'][0]['value']==expected['recoil_hp']


def test_repair_and_reflection_do_not_turn_self_wear_into_enemy_damage_or_invulnerability():
    e=battle();gun=candidate(e);reflector=place(e,'b','reflector');repair=place(e,'a','repair')
    gun.hp=40;tick(e)
    reflected=[v for v in e.state.events if v.type=='damage_reflected']
    assert len(reflected)==1
    repaired=sum(v.data['repair'] for v in e.state.events if v.type=='module_repaired' and v.data['target_module_id']==gun.instance_id)
    assert gun.hp==40+repaired-16-reflected[0].data['damage']
    assert e.state.players['b'].attack_current_total==0
    before=gun.hp;assert heal(e,'a',repair,gun,10)==10 and gun.hp==before+10
    e.state.elapsed_ms=3000;tick(e)
    assert len([v for v in e.state.events if v.type=='module_recoil'])==2


def test_intent_source_killed_earlier_in_the_tick_cannot_retaliate():
    e=battle();killer=place(e,'a','laser');gun=candidate(e,'b')
    gun.hp=1
    tick(e)
    assert gun.status==ModuleStatus.DESTROYED
    assert not any(v.type=='module_recoil' for v in e.state.events)
    assert not any(v.type=='attack_performed' and v.data['attacker_module_id']==gun.instance_id for v in e.state.events)


@pytest.mark.parametrize('defense',['shield','armor','barrier','guardian_dome','buffer_shield','phase_armor'])
def test_candidate_respects_the_existing_defense_path_exactly(defense):
    """Compare equal raw hits, rather than reimplementing each defense formula."""
    actual=battle();gun=candidate(actual);target=place(actual,'b',defense)
    reference=battle();ordinary=place(reference,'a','laser');other=place(reference,'b',defense)
    if defense=='buffer_shield':
        shield(actual,'b',target,target,100)
        shield(reference,'b',other,other,100)
    hit(reference,'a',ordinary,'b',other,50)
    tick(actual)
    assert gun.hp==224
    assert target.hp==other.hp
    assert actual.state.players['a'].attack_current_total==reference.state.players['a'].attack_current_total


def test_all_sixteen_talent_combinations_stay_within_recorded_design_bounds():
    from itertools import product
    rows=[stats(14,dict(zip(('0','1','2','3'),picks))) for picks in product(('power','resilience'),repeat=4)]
    base=stats(14)
    assert len(rows)==16
    assert all(r['current_cost']==4 and r['max_hp']>=base['max_hp'] and r['base_damage']>=base['base_damage'] for r in rows)
    assert {r['cooldown_ms'] for r in rows}=={2880,3000}
    assert {r['recoil_hp'] for r in rows}=={round(16*1.04**14),round(12*1.04**14)}


def test_existing_random_deployment_and_candidate_catalog_cleanup_on_exception():
    from tools.recoil_cannon_candidate import candidate_catalog
    from app.game import battle_pool,catalog
    from app.game.engine import BattleEngine
    from app.game.models import BattleState
    original_ids=battle_pool.PLAYER_SELECTABLE_MODULE_IDS
    original_catalog=dict(catalog.BASIC_MODULE_DEFINITIONS)
    e=BattleEngine(BattleState(battle_id='candidate-deployment'))
    for side in ('a','b'):
        e.add_player(side)
        e.grant_module(side,side+'-core','core')
        e.set_initial_active_module(side,side+'-core',2,1)
    with pytest.raises(RuntimeError,match='diagnostic stopped'):
        with candidate_catalog():
            e.set_battle_pool('a',('recoil_cannon','laser','shield','armor','repair','amplifier'))
            e.start()
            e.state.players['a'].circuit_credits=12
            e._cmd_deploy_module('a',{'definition_id':'recoil_cannon'})
            gun=next(u for u in e.state.players['a'].modules.values() if u.definition.id=='recoil_cannon')
            assert gun.position in get_default_board().placeable_positions
            assert gun.status==ModuleStatus.ACTIVE and gun.hp==240
            assert e.state.players['a'].circuit_credits==8
            raise RuntimeError('diagnostic stopped')
    assert battle_pool.PLAYER_SELECTABLE_MODULE_IDS is original_ids
    assert catalog.BASIC_MODULE_DEFINITIONS==original_catalog
