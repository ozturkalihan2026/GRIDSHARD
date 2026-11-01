"""Existing wallet contract + actual effects in the new main battle engine."""
from copy import deepcopy
import json
from pathlib import Path
import pytest
import re
from app.arena_canon import module_stats,module_talent_options
from app.catalog_migration import migrate_profile_roster
from app.game.catalog import get_module_definition
from app.game.engine import BattleEngine
from app.game.models import BattleState,ModuleStatus
from app.game.battle_actions_v2 import hit,heal,params,restart
from app.game.module_talents_v3 import SPECIALIZATIONS
from app.module_roster import MODULE_SPECS
from app.meta_progression import MetaProgressionService,MetaProgressionError
from app.player_profile import PlayerProfileService

DOCUMENT=json.loads((Path(__file__).parents[1]/'fixtures/level_costs_seviye_20261025.json').read_text(encoding='utf8'))
IDS=tuple(MODULE_SPECS)
OLD_THRESHOLDS={'common':(5,8,11,14),'rare':(6,9,12,15),'epic':(7,10,13,15),'legendary':(8,11,14,15)}


def wallet():
    p=PlayerProfileService().get_or_create('module-talents-v3')
    p.rating=p.highest_rating=10000;p.circuit_credits=2000000;p.flux_shards=200000
    p.module_upgrade_levels.update({key:14 for key in IDS})
    return p


def battlefield(key='laser',picks=None):
    e=BattleEngine(BattleState('talents-v3'))
    for side in ('a','b'):
        e.add_player(side);e.grant_module(side,side+'-core','core');e.set_initial_active_module(side,side+'-core',2,1)
    e.state.player_module_talents['a']={key:dict(picks or {})}
    u=e.grant_module('a','chosen',key);e.set_initial_active_module('a','chosen',0,0)
    target=e.grant_module('b','victim','barrier');e.set_initial_active_module('b','victim',0,0)
    e.start();return e,u,target


@pytest.mark.parametrize('key',IDS)
def test_every_card_has_four_two_way_choices_at_unchanged_document_prices(key):
    nodes=module_talent_options(key);rarity=MODULE_SPECS[key]['rarity']
    assert len(nodes)==4 and key in SPECIALIZATIONS
    for tier,(node,source) in enumerate(zip(nodes,DOCUMENT['module_talents'][rarity])):
        assert node['circuit_credits_cost']==source['circuit_credits_cost']
        assert node['flux_cost']==source['flux_cost']
        assert node['level']==OLD_THRESHOLDS[rarity][tier]
        assert [c['id'] for c in node['choices']]==['power','resilience']
        for c in node['choices']:
            assert c['description_tr'] and c['description_en']
            assert not re.search(r'\b(enerji|energy|ısı|heat)\b',(c['description_tr']+' '+c['description_en']).lower())


@pytest.mark.parametrize('key',IDS)
@pytest.mark.parametrize('choice',('power','resilience'))
def test_each_specialization_changes_a_real_stat_and_preview_matches_live(key,choice):
    before=module_stats(get_module_definition(key),0)
    selected=module_stats(get_module_definition(key),0,{'1':choice})
    e,u,_=battlefield(key,{'1':choice})
    assert (selected['max_hp'],selected['base_damage'],selected['cooldown_ms'],selected['parameters']) != (before['max_hp'],before['base_damage'],before['cooldown_ms'],before['parameters'])
    assert u.hp==selected['max_hp'] and u.definition.base_damage==selected['base_damage']
    assert u.definition.cooldown_ms==selected['cooldown_ms'] and params(u)==selected['parameters']
    assert u.definition.current_cost==get_module_definition(key).current_cost


@pytest.mark.parametrize('rarity',('common','rare','epic','legendary'))
@pytest.mark.parametrize('tier',range(4))
def test_purchase_is_atomic_replay_safe_and_deducts_exact_old_costs(rarity,tier):
    service=MetaProgressionService();p=wallet();key=next(k for k,m in MODULE_SPECS.items() if m['rarity']==rarity)
    before=(p.circuit_credits,p.flux_shards);cost=DOCUMENT['module_talents'][rarity][tier]
    receipt=service.choose_module_talent(p,key,str(tier),'power','paid')
    assert (p.circuit_credits,p.flux_shards)==(before[0]-cost['circuit_credits_cost'],before[1]-cost['flux_cost'])
    assert service.choose_module_talent(p,key,str(tier),'power','paid')==receipt
    with pytest.raises(MetaProgressionError):service.choose_module_talent(p,key,str(tier),'resilience','other')
    assert p.module_talents[key][str(tier)]=='power'


def test_insufficient_wallet_and_locked_threshold_do_not_change_anything():
    service=MetaProgressionService();p=wallet();p.circuit_credits=999
    before=deepcopy((p.circuit_credits,p.flux_shards,p.module_talents,p.module_upgrade_receipts))
    with pytest.raises(MetaProgressionError):service.choose_module_talent(p,'laser','0','power','low')
    assert (p.circuit_credits,p.flux_shards,p.module_talents,p.module_upgrade_receipts)==before
    p.circuit_credits=2000000;p.module_upgrade_levels['laser']=0
    with pytest.raises(MetaProgressionError):service.choose_module_talent(p,'laser','0','power','locked')


@pytest.mark.parametrize('rarity',('common','rare','epic','legendary'))
@pytest.mark.parametrize('tier',range(4))
def test_missing_required_currency_never_partially_spends_other_currency(rarity,tier):
    key=next(k for k,m in MODULE_SPECS.items() if m['rarity']==rarity)
    cost=DOCUMENT['module_talents'][rarity][tier]
    for field,cost_key in (('circuit_credits','circuit_credits_cost'),('flux_shards','flux_cost')):
        if not cost[cost_key]:continue
        p=wallet();setattr(p,field,cost[cost_key]-1)
        before=deepcopy((p.circuit_credits,p.flux_shards,p.module_talents,p.module_upgrade_receipts))
        with pytest.raises(MetaProgressionError):MetaProgressionService().choose_module_talent(p,key,str(tier),'power','missing')
        assert (p.circuit_credits,p.flux_shards,p.module_talents,p.module_upgrade_receipts)==before


def test_archived_paid_choices_restore_once_without_recharging_and_reset_stays_reset():
    p=wallet();service=MetaProgressionService()
    p.retired_rules_archive={'module_talents':{'laser':{'0':'power','1':'resilience'},'battery':{'0':'power'}}}
    before=(p.circuit_credits,p.flux_shards)
    assert migrate_profile_roster(p)
    assert p.module_talents=={'laser':{'0':'power','1':'resilience'}}
    assert (p.circuit_credits,p.flux_shards)==before
    view=next(x for x in service.view(p)['module_collection'] if x['definition_id']=='laser')
    assert view['selected_talent_count']==2 and view['talent_reset_cost_flux']==50
    receipt=service.reset_module_talents(p,'laser','reset')
    assert service.reset_module_talents(p,'laser','reset')==receipt
    assert p.flux_shards==before[1]-50
    assert not migrate_profile_roster(p) and 'laser' not in p.module_talents


def test_paid_archive_restoration_and_later_reset_survive_save_load():
    from app.player_data_store import PlayerDataStoreService,InMemoryPlayerDataRepository
    from app.player_statistics import PlayerStatisticsService
    from app.player_settings import PlayerSettingsService
    profiles=PlayerProfileService();p=profiles.get_or_create('saved-talents')
    p.flux_shards=100
    p.retired_rules_archive={'module_talents':{'laser':{'0':'power'},'battery':{'0':'power'}}}
    store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),settings_service=PlayerSettingsService(),repository=InMemoryPlayerDataRepository())
    store.save_player(p.player_id);profiles._profiles.clear();store.load_player('saved-talents')
    p=profiles.get('saved-talents');assert p.module_talents=={'laser':{'0':'power'}}
    MetaProgressionService().reset_module_talents(p,'laser','reset-saved')
    store.save_player(p.player_id);profiles._profiles.clear();store.load_player('saved-talents')
    p=profiles.get('saved-talents');assert not p.module_talents and p.flux_shards==75


def test_shield_talent_blocks_more_actual_damage():
    for picks,damage in (({},40),({'1':'power'},32)):
        e,u,target=battlefield('shield',picks)
        gun=e.grant_module('b','gun','laser');gun.status=ModuleStatus.ACTIVE
        before=u.hp;hit(e,'b',gun,'a',u,100)
        assert before-u.hp==damage


def test_buffer_last_bastion_and_emp_talents_reach_actual_effects():
    e,u,target=battlefield('last_bastion',{'1':'power'})
    e.apply_damage('a',u.instance_id,u.hp)
    core=e.state.players['a'].modules['a-core'];before=core.hp
    e.apply_damage('a','a-core',90);assert core.hp==before
    e,u,target=battlefield('buffer_shield',{'1':'resilience'});e.step()
    assert u.persistent_effects['v2_shield_buffer'].expires_at_ms==5000
    assert u.persistent_effects['v2_shield_buffer'].data['shield_hp']==50
    assert u.persistent_effects['v2_shield_buffer'].data['conversion_ratio']==.60
    e,u,target=battlefield('emp',{'1':'power'});e.step()
    assert target.debuffs['emp_disabled'].expires_at_ms==1200


@pytest.mark.parametrize('key',('laser','pulse_cannon','missile_launcher','plasma_mortar'))
def test_speed_talent_causes_more_shots_not_just_a_smaller_display_number(key):
    counts=[]
    for picks in ({},{'2':'power'}):
        e,u,target=battlefield(key,picks);target.hp=100000
        for _ in range(601):e.step()
        counts.append(sum(event.type=='attack_performed' for event in e.state.events))
    assert counts[1]>counts[0]


def test_barrier_specialization_and_repair_bonus_change_received_damage_and_healing():
    e,u,_=battlefield('barrier',{'0':'power','1':'resilience'})
    gun=e.grant_module('b','gun','laser');gun.status=ModuleStatus.ACTIVE
    before=u.hp;hit(e,'b',gun,'a',u,100);assert before-u.hp==94
    assert heal(e,'a',u,u,50)==52


def test_virus_talent_controls_the_real_slow_interval():
    e,u,target=battlefield('virus',{'1':'power'});e.step()
    assert target.debuffs['virus'].data['interval_multiplier']==1.30
    restart(e,'b',target,period=1000)
    assert target.cooldowns_ready_at_ms['action']==e.state.elapsed_ms+1300


def test_tight_burst_keeps_three_rounds_and_finishes_sooner():
    times=[]
    for picks in ({},{'1':'power'}):
        e,u,target=battlefield('burst_cannon',picks)
        for _ in range(6):e.step()
        shots=[event.at_ms for event in e.state.events if event.type=='attack_performed']
        assert len(shots)==3
        times.append(shots)
    assert times==[[0,200,400],[0,200,300]]


def test_quantum_specialization_increases_fourth_hit_only():
    rows=[]
    for picks in ({},{'1':'power'}):
        e,u,target=battlefield('quantum_repeater',picks);target.hp=100000
        for _ in range(150):e.step()
        rows.append([event.data['raw_damage'] for event in e.state.events if event.type=='attack_performed'][:4])
    assert rows[0][:3]==rows[1][:3]
    assert rows[1][3]==round(rows[0][3]*1.25)


def test_retired_cards_stay_out_and_both_active_talent_trees_are_published():
    view=MetaProgressionService().view(wallet())
    assert len(view['module_collection'])==24
    assert all(len(m['talents'])==4 for m in view['module_collection'])
    assert all(len(core['skills'])==6 for core in view['cores']['types'])
