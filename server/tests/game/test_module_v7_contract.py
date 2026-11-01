"""Approved document versus independent live stats, persistence and UI data."""
from pathlib import Path
from itertools import product
import importlib.util,json
import pytest
from app.arena_canon import module_stats
from app.game.catalog import get_module_definition
from app.meta_progression import MetaProgressionService
from app.catalog_migration import migrate_profile_roster
from app.player_profile import PlayerProfileService

ROOT=Path(__file__).resolve().parents[3]
doc=json.loads((ROOT/'docs/NIHAI_MODUL_ENDERLIK_YETENEK_V7.json').read_text(encoding='utf8'))
loader=importlib.util.spec_from_file_location('v7_design_math',ROOT/'tools/document_module_decisions_v7.py')
design=importlib.util.module_from_spec(loader);loader.loader.exec_module(design)

@pytest.mark.parametrize('m',doc['modules'],ids=lambda m:m['id'])
def test_every_approved_tree_reaches_live_parameters_and_same_level_scaling(m):
 for picks in product(('power','resilience'),repeat=4):
  expected=design.effective(m,picks,15)
  actual=module_stats(get_module_definition(m['id']),14,dict(zip(map(str,range(4)),picks)))
  assert actual['base_damage']==pytest.approx(expected['damage'],abs=.02)
  assert actual['max_hp']==pytest.approx(round(expected['hp']),abs=1)
  assert actual['cooldown_ms']==round(expected['period_ms'])
  for field,value in actual['parameters'].items():
   if field in {'charged_damage','shield_hp','core_shield_hp','ally_shield_total','heal'}:assert value*actual['effect_multiplier']==pytest.approx(expected[field])
   else:assert value==pytest.approx(expected[field]) if isinstance(value,(float,int)) else value==expected[field]

def old_profile():
 p=PlayerProfileService().get_or_create('v7-old');p.rating=p.highest_rating=10000
 p.module_upgrade_levels['plasma_mortar']=14;p.module_talents['plasma_mortar']={'0':'power','1':'resilience'}
 p.circuit_credits=100000;p.flux_shards=10000
 p.retired_rules_archive.pop('module_v7_migrated',None)
 return p

def test_one_time_reselection_preserves_old_paid_tiers_without_rebilling():
 p=old_profile();service=MetaProgressionService();old=(p.circuit_credits,p.flux_shards)
 assert migrate_profile_roster(p)
 assert p.module_talents['plasma_mortar']=={'0':'power','1':'resilience'}
 card=next(c for c in service.view(p)['module_collection'] if c['definition_id']=='plasma_mortar')
 assert card['talent_transition_reselection'] and card['talent_reset_cost_flux']==0
 first=service.reset_module_talents(p,'plasma_mortar','v7-reset')
 assert service.reset_module_talents(p,'plasma_mortar','v7-reset')==first
 assert (p.circuit_credits,p.flux_shards)==old
 for tier in ('0','1'):
  receipt=service.choose_module_talent(p,'plasma_mortar',tier,'power','v7-'+tier)
  assert receipt['transition_free'] and receipt['circuit_credits_spent']==receipt['flux_shards_spent']==0
 assert (p.circuit_credits,p.flux_shards)==old
 assert not migrate_profile_roster(p)
 service.reset_module_talents(p,'plasma_mortar','ordinary-reset')
 assert p.flux_shards==old[1]-50
 receipt=service.choose_module_talent(p,'plasma_mortar','1','resilience','paid-again')
 assert not receipt['transition_free'] and receipt['circuit_credits_spent']==20000

def test_reselection_cannot_buy_an_unowned_tier_for_free():
 p=old_profile();service=MetaProgressionService();migrate_profile_roster(p)
 service.reset_module_talents(p,'plasma_mortar','reset')
 receipt=service.choose_module_talent(p,'plasma_mortar','2','power','new-tier')
 assert receipt['circuit_credits_spent']==30000 and receipt['flux_shards_spent']==2000

def test_reselection_free_tiers_and_consumed_flag_survive_normal_save_load():
 from app.player_data_store import PlayerDataStoreService,InMemoryPlayerDataRepository
 from app.player_statistics import PlayerStatisticsService
 from app.player_settings import PlayerSettingsService
 profiles=PlayerProfileService();p=profiles.get_or_create('saved-v7');p.rating=p.highest_rating=10000
 p.module_upgrade_levels['virus']=14;p.module_talents['virus']={'1':'power'}
 p.retired_rules_archive.pop('module_v7_migrated',None);p.flux_shards=0;p.circuit_credits=0
 migrate_profile_roster(p);service=MetaProgressionService();service.reset_module_talents(p,'virus','saved-reset')
 store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),settings_service=PlayerSettingsService(),repository=InMemoryPlayerDataRepository())
 store.save_player(p.player_id);profiles._profiles.clear();store.load_player('saved-v7');p=profiles.get('saved-v7')
 receipt=service.choose_module_talent(p,'virus','1','resilience','free-after-reload')
 assert receipt['transition_free'] and p.flux_shards==p.circuit_credits==0
 assert not p.retired_rules_archive['module_v7_reselection']['virus']['available']
