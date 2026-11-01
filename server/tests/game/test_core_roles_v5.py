"""Direct core roles, counterplay, paid choices and Current use the live engine."""
from dataclasses import replace
from copy import deepcopy
import pytest
from app.game.engine import BattleEngine,CommandRejected
from app.game.models import BattleState,ModuleStatus,Position,BattlePool,TimedModuleEffect
from app.game.battle_actions_v2 import hit,shield
from app.game.core_talents_v5 import effective_settings,description
from app.game.core_actions_v5 import settings
from app.game.core_balance import CORE_ROLES_V5
from app.module_roster import STARTER_IDS


def battle(power='core_overdrive',skills=(),level=1):
    e=BattleEngine(BattleState('core-v5'))
    for side in ('a','b'):
        p=e.add_player(side);p.core_level=level
        if side=='a':p.core_type=power;p.core_skills=skills
        p.battle_pool=BattlePool(STARTER_IDS) if side=='a' and power=='core_capacitor' else None
        e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    e.start();return e


def put(e,side,key,x=0,y=0):
    p=e.state.players[side];pool=p.battle_pool;p.battle_pool=None
    u=e.grant_module(side,f'{side}-{key}-{len(p.modules)}',key)
    p.battle_pool=pool
    u.status=ModuleStatus.ACTIVE;u.position=Position(x,y);return u


def core(e,side='a'):return e.state.players[side].modules[side+'-core']
def use(e,request='use'):
    e.state.players['a'].core_power_charge=100
    e._cmd_use_core_power('a',{'request_id':request})
def advance(e,ms):
    for _ in range(ms//100):e.step()
def hits(e):return [x for x in e.state.events if x.type=='attack_performed' and x.data.get('core_attack')]


@pytest.mark.parametrize('skills,count,duration',[((),12,6000),(('1_charge',),14,7000)])
def test_flame_is_real_core_fire_without_allied_weapons_and_stops(skills,count,duration):
    e=battle(skills=skills);use(e);advance(e,duration+1000)
    assert len(hits(e))==count
    assert e.state.players['a'].core_contributions['direct_damage']==count*18
    assert core(e,'b').hp==450-count*18
    assert 'v5_mode' not in e.state.players['a'].core_signature_state
    e._cmd_use_core_power('a',{'request_id':'use'})
    assert e.state.players['a'].core_power_uses==1


def test_dead_core_and_finished_battle_cannot_keep_firing():
    e=battle();use(e);e.apply_damage('a','a-core',450);advance(e,1000)
    assert not hits(e)
    e=battle();use(e);e._cmd_forfeit_battle('a',{});advance(e,1000)
    assert not hits(e)


def test_interrupted_core_does_not_bank_fast_catchup_shots():
    e=battle();use(e)
    core(e).debuffs['emp_disabled']=TimedModuleEffect('emp_disabled','EMP',2000)
    advance(e,2100)
    assert len(hits(e))==1
    advance(e,400);assert len(hits(e))==1
    advance(e,100);assert len(hits(e))==2


def test_fortress_fires_and_only_protects_its_own_core():
    e=battle('core_guardian');ally=put(e,'a','laser');attacker=put(e,'b','laser');use(e)
    before=ally.hp;hit(e,'b',attacker,'a',ally,100)
    assert before-ally.hp==100
    hit(e,'b',attacker,'a',core(e),100)
    assert core(e).hp==410
    assert e.state.players['a'].core_contributions['damage_blocked']==60
    # Isolate core fire from the two ordinary weapons.
    ally.status=attacker.status=ModuleStatus.DESTROYED
    advance(e,6100);assert len(hits(e))==6
    hit(e,'b',attacker,'a',core(e),100);assert core(e).hp==310


def test_wave_uses_shared_priority_and_damages_at_most_three_targets():
    from app.game.combat import selectable_targets
    e=battle('core_resonance')
    for i,k in enumerate(('laser','barrier','armor','repair')):put(e,'b',k,i,0)
    targets=selectable_targets(e.state.players['b'])[:3];before={t.instance_id:t.hp for t in targets}
    use(e)
    assert [x.data['target_module_id'] for x in hits(e)]==[t.instance_id for t in targets]
    assert hits(e)[0].data['raw_damage']==90
    assert [x.data['raw_damage'] for x in hits(e)[1:]]==[45,45]
    assert e.state.players['a'].core_contributions['direct_damage']==sum(before[t.instance_id]-t.hp for t in targets)


def test_execution_targets_cost_not_core_and_resolves_once_after_warning():
    e=battle('core_disruptor',('1_charge',));put(e,'b','laser');target=put(e,'b','railgun',1,0)
    p=e.state.players['a'];p.circuit_credits=0;use(e);advance(e,1500)
    assert target.hp>0 and 'core_execution' in target.debuffs
    e.step();assert target.hp==0 and core(e,'b').hp==450
    assert p.core_contributions['executions']==1
    assert p.damage_current_earned==0  # Core HP damage does not fill the weapon/Defense bonus.
    assert p.circuit_credits==1  # The purchased execution yield remains a real benefit.
    assert p.core_contributions['current']==1
    advance(e,1000);assert p.core_contributions['executions']==1


def test_execution_yield_at_full_current_does_not_claim_an_unearned_resource():
    e=battle('core_disruptor',('1_charge',));put(e,'b','railgun');use(e)
    e.state.players['a'].circuit_credits=12;advance(e,1600)
    p=e.state.players['a'];assert p.circuit_credits==12
    assert p.core_contributions['executions']==1 and not p.core_contributions.get('current')


@pytest.mark.parametrize('counter',['cleanser','phase','death'])
def test_execution_has_real_counterplay(counter):
    e=battle('core_disruptor');target=put(e,'b','phase_armor' if counter=='phase' else 'barrier')
    if counter=='cleanser':put(e,'b','cleanser',1,0)
    use(e)
    if counter=='phase':
        # Keep the genuine phase window open through the 1.5s execution.
        target.definition=replace(target.definition,runtime_parameters={**target.definition.runtime_parameters,'phase_ms':2000})
    if counter=='death':e.apply_damage('a','a-core',450)
    advance(e,1800)
    assert target.hp>0 and not e.state.players['a'].core_contributions.get('executions')
    if counter!='death':assert 'core_execution' not in target.debuffs


@pytest.mark.parametrize('power',['core_disruptor','core_quantum'])
def test_execution_and_fracture_cannot_hit_enemy_core(power):
    e=battle(power)
    with pytest.raises(CommandRejected):use(e)
    assert e.state.players['a'].core_power_charge==100 and core(e,'b').hp==450


def test_free_summon_is_from_own_deck_level_and_talents_with_hp_in_event():
    e=battle('core_capacitor',('0_energy','1_charge'))
    p=e.state.players['a'];p.circuit_credits=0
    e.state.player_upgrade_levels['a']={k:14 for k in STARTER_IDS}
    e.state.player_module_talents['a']={k:{'0':'resilience'} for k in STARTER_IDS}
    use(e);summoned=[u for u in p.modules.values() if u.definition.id!='core']
    assert len(summoned)==1 and summoned[0].definition.id in STARTER_IDS
    assert p.circuit_credits==0 and summoned[0].position!=Position(2,1)
    event=next(x for x in reversed(e.state.events) if x.type=='module_placed')
    assert event.data['hp']==summoned[0].hp==summoned[0].definition.max_hp
    assert p.core_contributions['reinforcements']==1
    baseline=battle('core_capacitor');baseline.state.player_upgrade_levels['a']={k:14 for k in STARTER_IDS}
    baseline.state.player_module_talents['a']={k:{'0':'resilience'} for k in STARTER_IDS};use(baseline)
    other=next(u for u in baseline.state.players['a'].modules.values() if u.definition.id!='core')
    assert summoned[0].definition.id==other.definition.id
    assert summoned[0].hp==round(other.hp*1.08*1.20)


def test_full_board_retains_charge_and_failed_summon_does_not_reroll():
    e=battle('core_capacitor');p=e.state.players['a']
    from app.game.board import get_default_board
    for pos in get_default_board().placeable_positions:
        if pos!=Position(2,1):put(e,'a','barrier',pos.x,pos.y)
    with pytest.raises(CommandRejected):use(e)
    assert p.core_power_charge==100 and p.core_power_uses==0
    assert 'use' not in p.consumed_core_power_request_ids
    for u in p.modules.values():
        if u.definition.id!='core':u.status=ModuleStatus.DESTROYED;u.position=None
    e.state.elapsed_ms=900;use(e)
    chosen=next(x.data['definition_id'] for x in reversed(e.state.events) if x.type=='module_placed')
    fresh=battle('core_capacitor');use(fresh)
    assert chosen==next(x.data['definition_id'] for x in reversed(fresh.state.events) if x.type=='module_placed')


def test_phoenix_heals_own_core_by_actual_hp_loss_without_overkill_or_shield_credit():
    e=battle('core_phoenix');target=put(e,'b','laser');target.hp=40;core(e).hp=100
    ally=put(e,'a','laser');ally.hp=100;use(e)
    assert core(e).hp==140 and ally.hp==100
    assert e.state.players['a'].core_contributions=={'direct_damage':40,'repair':40}
    e=battle('core_phoenix');target=put(e,'b','laser');core(e).hp=100
    shield(e,'b',core(e,'b'),target,200);use(e)
    assert core(e).hp==100 and not e.state.players['a'].core_contributions


def test_phoenix_cannot_heal_itself_back_from_reflected_death():
    e=battle('core_phoenix');target=put(e,'b','reflector');core(e).hp=1;use(e)
    assert core(e).hp==0 and core(e).status==ModuleStatus.DESTROYED
    assert not e.state.players['a'].core_contributions.get('repair')


def test_fracture_bypasses_armor_and_shield_but_not_phase():
    e=battle('core_quantum');target=put(e,'b','armor');before=target.hp
    shield(e,'b',core(e,'b'),target,500);use(e)
    assert target.hp==before-round(before*.5)
    assert target.persistent_effects['v2_shield_guard'].data['shield_hp']==500
    e=battle('core_quantum');target=put(e,'b','phase_armor');before=target.hp;use(e)
    assert target.hp==before


def test_fracture_talent_can_change_target_from_hp_to_cost():
    for skills,expected in (((),'barrier'),(('1_charge',),'railgun')):
        e=battle('core_quantum',skills);put(e,'b','barrier');put(e,'b','railgun',1,0)
        use(e);chosen=hits(e)[0].data['target_module_id'];assert expected in chosen


@pytest.mark.parametrize('power',tuple(CORE_ROLES_V5))
def test_hp_charge_and_collection_values_match_live_talents(power):
    from app.meta_progression import MetaProgressionService
    from app.player_profile import PlayerProfileService
    picks=('0_charge','1_energy','2_charge');e=battle(power,picks,15)
    profile=PlayerProfileService().get_or_create('core-values');profile.rating=profile.highest_rating=10000
    profile.core_upgrade_levels[power]=14;profile.core_skills[power]=picks
    view=next(c for c in MetaProgressionService().view(profile)['cores']['types'] if c['id']==power)
    assert view['max_hp']==core(e).hp
    assert view['power_values']['kind']==settings(e.state.players['a'])['kind']
    assert view['signature_mechanic']==description(power,picks,15)
    assert view['signature_mechanic_en']==description(power,picks,15,True)
    e=battle(power,('2_energy',));advance(e,18000)
    assert e.state.players['a'].core_power_charge==pytest.approx(100)


def test_paid_archived_choices_restore_once_without_spending_and_survive_save_load():
    from app.catalog_migration import migrate_profile_roster
    from app.player_profile import PlayerProfileService
    from app.player_data_store import PlayerDataStoreService,InMemoryPlayerDataRepository
    from app.player_statistics import PlayerStatisticsService
    from app.player_settings import PlayerSettingsService
    profiles=PlayerProfileService();p=profiles.get_or_create('core-archive')
    p.retired_rules_archive={'core_skills':{'core_overdrive':['0_energy','1_charge','2_energy','1_energy']}}
    p.core_receipts={'old-paid':{'circuit_credits_spent':20000}}
    before=deepcopy((p.circuit_credits,p.flux_shards,p.core_receipts))
    migrate_profile_roster(p)
    assert p.core_skills['core_overdrive']==('0_energy','1_charge','2_energy')
    assert not migrate_profile_roster(p)
    assert (p.circuit_credits,p.flux_shards,p.core_receipts)==before
    store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),settings_service=PlayerSettingsService(),repository=InMemoryPlayerDataRepository())
    store.save_player(p.player_id);profiles._profiles.clear();store.load_player('core-archive')
    assert profiles.get('core-archive').core_skills['core_overdrive']==('0_energy','1_charge','2_energy')


@pytest.mark.parametrize('paid', [(),('0_energy',),('0_charge','1_energy','2_energy')])
def test_ai_matches_purchased_core_tiers_and_start_refreshes_hp(paid):
    from app.game.pvp_session import PvPSessionService
    from app.game.core_stats import core_max_hp
    service=PvPSessionService();session=service.create_session('core-ai')
    for side in ('a','b'):
        service.join('core-ai',side);p=session.engine.state.players[side]
        p.battle_pool=BattlePool(STARTER_IDS)
        session.engine.grant_module(side,side+'-core','core')
        session.engine.set_initial_active_module(side,side+'-core',2,1)
    reference=session.engine.state.players['a'];reference.core_level=15;reference.core_skills=paid
    ai=session.engine.state.players['b'];ai.core_type='core_guardian'
    session.ai_player_ids.add('b');session.ai_level_reference_player_ids['b']='a'
    service._sync_ai_progression(session)
    assert {s.split('_')[0] for s in ai.core_skills}=={s.split('_')[0] for s in paid}
    session.engine.start()
    assert core(session.engine,'b').hp==round(core_max_hp(15)*settings(ai)['hp_multiplier'])


def test_free_summon_avoids_debris_and_heavy_branch_uses_only_cost_three_or_more():
    from app.game.catalog import get_module_definition
    from app.game.board import get_default_board
    for seed in range(10):
        e=battle('core_capacitor',('1_energy',));e.state.battle_id=f'summon-{seed}'
        p=e.state.players['a']
        open_cell=Position(4,2)
        for pos in get_default_board().placeable_positions:
            if pos!=open_cell and pos!=Position(2,1):p.cell_debris_until_ms[e._position_key(pos)]=3000
        use(e);unit=next(u for u in p.modules.values() if u.definition.id!='core')
        assert unit.position==open_cell
        assert get_module_definition(unit.definition.id).current_cost>=3


@pytest.mark.parametrize('power',tuple(CORE_ROLES_V5))
@pytest.mark.parametrize('tier,level',[(0,5),(1,9),(2,13)])
def test_core_talents_require_level_and_only_one_paid_branch_per_tier(power,tier,level):
    from app.meta_progression import MetaProgressionService,MetaProgressionError
    from app.player_profile import PlayerProfileService
    service=MetaProgressionService();p=PlayerProfileService().get_or_create('core-gate')
    p.rating=p.highest_rating=10000;p.circuit_credits=p.flux_shards=1000000
    p.core_upgrade_levels[power]=level-2
    with pytest.raises(MetaProgressionError):service.unlock_core_skill(p,power,f'{tier}_charge','too-soon')
    assert (p.circuit_credits,p.flux_shards)==(1000000,1000000)
    p.core_upgrade_levels[power]=level-1
    receipt=service.unlock_core_skill(p,power,f'{tier}_charge','right-branch')
    before=(p.circuit_credits,p.flux_shards)
    assert service.unlock_core_skill(p,power,f'{tier}_charge','right-branch')==receipt
    with pytest.raises(MetaProgressionError):service.unlock_core_skill(p,power,f'{tier}_energy','other-branch')
    assert (p.circuit_credits,p.flux_shards)==before


@pytest.mark.parametrize('power,expected', [('core_resonance',104),('core_guardian',25),('core_overdrive',21),('core_phoenix',172)])
def test_damage_specializations_change_real_core_hits(power,expected):
    e=battle(power,('1_energy' if power!='core_guardian' else '1_charge',))
    target=put(e,'b','laser');target.hp=1000
    use(e);e.step()
    assert hits(e)[0].data['damage']==expected


def test_wider_wave_hurts_secondary_targets_more_without_adding_targets():
    e=battle('core_resonance',('1_charge',))
    for i in range(4):put(e,'b','laser',i,0)
    use(e);assert [h.data['damage'] for h in hits(e)]==[90,63,63]


def test_fortress_armor_specialization_blocks_seventy_percent():
    e=battle('core_guardian',('1_energy',));u=put(e,'b','laser');use(e)
    hit(e,'b',u,'a',core(e),100);assert core(e).hp==420
    assert e.state.players['a'].core_contributions['damage_blocked']==70


def test_swift_verdict_resolves_earlier_in_real_ticks():
    e=battle('core_disruptor',('1_energy',));target=put(e,'b','barrier');use(e)
    advance(e,1200);assert target.hp>0
    e.step();assert target.hp==0


def test_drain_specialization_heals_135_percent_of_real_damage_only():
    e=battle('core_phoenix',('1_charge',));core(e).hp=100
    target=put(e,'b','laser');use(e)
    assert target.hp==target.definition.max_hp-150
    assert core(e).hp==302 and e.state.players['a'].core_contributions['repair']==202


def test_deeper_fracture_removes_sixty_percent_of_current_hp():
    e=battle('core_quantum',('1_energy',));target=put(e,'b','laser');target.hp=200;use(e)
    assert target.hp==80 and e.state.players['a'].core_contributions['direct_damage']==120


def test_fatal_core_hit_preserves_target_cell_for_visible_impact():
    e=battle('core_resonance');target=put(e,'b','laser',3,2);target.hp=1;use(e)
    assert target.hp==0 and target.position is None
    event=next(h for h in hits(e) if h.data['target_module_id']==target.instance_id)
    assert event.data['target_position']=={'x':3,'y':2}
