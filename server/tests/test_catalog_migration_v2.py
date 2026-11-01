from copy import deepcopy
from app.catalog_migration import migrate_profile_roster, award_module_shards
from app.module_roster import MODULE_SPECS, RETIRED_MODULE_IDS
from app.player_profile import PlayerProfile, PlayerProfileService
from app.player_data_store import PlayerDataStoreService, InMemoryPlayerDataRepository
from app.player_statistics import PlayerStatisticsService
from app.player_settings import PlayerSettingsService


def legacy_profile():
    p=PlayerProfile(player_id='migration', display_name='Migration', module_roster_revision=1)
    p.module_shards={key:10 for key in RETIRED_MODULE_IDS}|{'laser':17}
    p.module_upgrade_levels={'battery':14,'cooler':8,'laser':6}
    p.module_talents={'laser':{'basic':'old-laser'},'battery':{'basic':'old-battery'}}
    p.core_skills={'core_resonance':('old-core-skill',)}
    p.preferred_battle_pool_ids=('laser','shield','battery','cooler','emp','amplifier')
    p.universal_module_shards=5
    p.module_upgrade_receipts={'historical':{'module_definition_id':'battery','level_after':14}}
    return p


def test_retired_balances_convert_exactly_once_and_history_remains_private():
    p=legacy_profile(); receipts=deepcopy(p.module_upgrade_receipts)
    assert migrate_profile_roster(p)
    assert p.universal_module_shards==185
    assert p.module_shards['laser']==17 and p.module_upgrade_levels=={'laser':6}
    assert not RETIRED_MODULE_IDS.intersection(p.module_shards)
    assert p.retired_module_archive['battery']['upgrade_level']==14
    assert p.retired_rules_archive['module_talents']['laser']['basic']=='old-laser'
    assert not p.module_talents and not p.core_skills
    assert p.module_upgrade_receipts==receipts
    assert len(set(p.preferred_battle_pool_ids))==6
    assert set(p.preferred_battle_pool_ids)<=MODULE_SPECS.keys()
    assert not migrate_profile_roster(p) and p.universal_module_shards==185


def test_signed_refund_debt_is_carried_instead_of_forgiven():
    p=legacy_profile();p.module_shards={'battery':-12,'cooler':20}
    migrate_profile_roster(p)
    assert p.universal_module_shards==13
    assert p.retired_module_archive['battery']['shards_converted_1_to_1']==-12
    award_module_shards(p,'battery',4)
    assert p.universal_module_shards==17 and 'battery' not in p.module_shards
    from app.premium_reward_recovery import _add
    _add(p,'module_shards:battery',-25)
    assert p.universal_module_shards==-8 and 'battery' not in p.module_shards


def test_save_load_keeps_archive_and_does_not_repeat_conversion():
    profiles=PlayerProfileService();repo=InMemoryPlayerDataRepository()
    store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),settings_service=PlayerSettingsService(),repository=repo)
    profiles._profiles['migration']=legacy_profile()
    store.save_player('migration')
    profiles._profiles.clear();store.load_player('migration');p=profiles.get('migration')
    assert p.module_roster_revision==2 and p.universal_module_shards==185
    assert p.retired_module_archive['cooler']['upgrade_level']==8
    store.save_player('migration');profiles._profiles.clear();store.load_player('migration')
    assert profiles.get('migration').universal_module_shards==185


def test_pre_revision_snapshot_is_migrated_on_restore_without_live_store():
    profiles=PlayerProfileService();repo=InMemoryPlayerDataRepository()
    store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),settings_service=PlayerSettingsService(),repository=repo)
    data=store.save_player('legacy').to_dict()['profile']
    meta=data['meta_progression_state'];meta.pop('module_roster_revision')
    meta['module_shards']={'battery':31,'laser':20};meta['module_upgrade_levels']={'battery':12,'laser':4}
    meta['universal_module_shards']=7
    store._restore_profile(data)
    p=profiles.get('legacy')
    assert p.universal_module_shards==38 and p.module_upgrade_levels=={'laser':4}
    assert p.retired_module_archive['battery']['upgrade_level']==12
