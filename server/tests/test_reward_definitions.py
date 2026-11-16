from copy import deepcopy
from datetime import datetime, timezone
import json

import pytest

from app import reward_definitions as definitions
from app import meta_progression as meta
from app.player_profile import PlayerProfileService
from app.reward_delivery import collect_chest, public_chest


def fixed(amount=10, revision=1, minimum='0.0.0'):
    return definitions.seal(identity='test.fixed',revision=revision,kind='fixed',
        payload={'circuit_credits':amount,'flux_shards':2},minimum_server_version=minimum)


def profile():
    return PlayerProfileService().get_or_create('reward-definition-fixture')


def test_fixed_revisions_are_separate_and_earned_snapshot_survives_catalog_replacement():
    old,new=fixed(),fixed(100,2,'2.5.0')
    catalog=definitions.RewardCatalog({'schema_version':1,'definitions':[old,new]})
    snapshot=catalog.freeze('test.fixed',server_version='2.4.0')
    assert snapshot['revision']==1
    assert catalog.freeze('test.fixed',server_version='2.5.0')['revision']==2
    replacement=definitions.RewardCatalog({'schema_version':1,'definitions':[new]})
    assert replacement.freeze('test.fixed',server_version='2.5.0')['payload']['circuit_credits']==100
    assert definitions.snapshot_contents(snapshot)['circuit_credits']==10
    snapshot['payload']['circuit_credits']=999
    assert catalog.freeze('test.fixed',server_version='2.4.0')['payload']['circuit_credits']==10
    with pytest.raises(definitions.RewardDefinitionError):definitions.snapshot_contents(snapshot)


def test_catalog_rejects_duplicate_id_and_revision():
    row=fixed()
    with pytest.raises(definitions.RewardDefinitionError):
        definitions.RewardCatalog({'schema_version':1,'definitions':[row,row]})


def test_choice_contains_three_frozen_options_and_never_a_client_supplied_amount():
    payload={'options':[{'option_id':name,'contents':{'flux_shards':amount}}
                        for name,amount in [('attack',10),('defense',20),('tactical',30)]]}
    snapshot=definitions.seal(identity='test.choice',revision=1,kind='choice',payload=payload)
    payload['options'][0]['contents']['flux_shards']=9999
    assert definitions.snapshot_contents(snapshot,expected_kind='choice',option_id='attack')=={'flux_shards':10}
    with pytest.raises(definitions.RewardDefinitionError):definitions.snapshot_contents(snapshot,option_id='foreign')
    with pytest.raises(definitions.RewardDefinitionError):definitions.snapshot_contents(snapshot)


@pytest.mark.parametrize('contents',[{'flux_shards':True},{'circuit_credits':-1},
    {'module_shards':10},{'core_shards':10},{'season_xp':999999}, {'unexpected':10}])
def test_invalid_fixed_definitions_do_not_become_reward_snapshots(contents):
    with pytest.raises(definitions.RewardDefinitionError):
        definitions.seal(identity='test.invalid',revision=1,kind='fixed',payload=contents)


def test_250_currency_rows_are_unavailable_to_the_current_240_runtime():
    catalog=definitions.catalog()
    identity='free250.daily_orders.complete_battles'
    with pytest.raises(definitions.RewardDefinitionError):catalog.freeze(identity,server_version='2.4.0')
    row=catalog.freeze(identity,server_version='2.5.0')
    assert definitions.snapshot_contents(row)=={'flux_shards':15,'circuit_credits':15}


def test_earned_gift_uses_frozen_table_even_if_current_chest_constants_change(monkeypatch):
    p=profile();service=meta.MetaProgressionService()
    receipt=service.claim_gift_chest(p,'field_3h','gift-definition')
    chest=p.chest_slots[-1]
    assert 'reward_definition_snapshot' in chest
    assert 'reward_definition_snapshot' not in receipt['chest']
    original=deepcopy(meta.CHEST_DEFINITIONS['field_3h'])
    monkeypatch.setitem(meta.CHEST_DEFINITIONS,'field_3h',{**original,'coins':(99999,99999),'flux':(99999,99999)})
    result=service.open_chest(p,chest['chest_id'],'open-definition')
    assert original['coins'][0]<=result['rewards']['circuit_credits']<=original['coins'][1]
    assert original['flux'][0]<=result['rewards']['flux_shards']<=original['flux'][1]
    assert result['reward_definition_revision']==1
    balance=p.circuit_credits,p.flux_shards
    assert service.open_chest(p,chest['chest_id'],'open-definition')==result
    assert (p.circuit_credits,p.flux_shards)==balance


def test_unversioned_existing_stock_retains_legacy_revision_one(monkeypatch):
    p=profile();service=meta.MetaProgressionService()
    service.claim_gift_chest(p,'field_3h','legacy-gift')
    chest=p.chest_slots[-1];chest.pop('reward_definition_snapshot')
    monkeypatch.setitem(meta.CHEST_DEFINITIONS,'field_3h',{**meta.CHEST_DEFINITIONS['field_3h'],'coins':(99999,99999)})
    result=service.open_chest(p,chest['chest_id'],'legacy-open')
    assert 45<=result['rewards']['circuit_credits']<=75
    assert result['reward_definition_revision']==1


def test_corrupt_or_mismatched_snapshot_preserves_chest_and_wallet():
    p=profile();service=meta.MetaProgressionService()
    service.claim_gift_chest(p,'field_3h','corrupt-gift')
    chest=p.chest_slots[-1]
    before=p.circuit_credits,p.flux_shards,deepcopy(p.module_shards)
    chest['reward_definition_snapshot']['payload']['coins']=[9999,9999]
    with pytest.raises(meta.MetaProgressionError):service.open_chest(p,chest['chest_id'],'corrupt-open')
    assert (p.circuit_credits,p.flux_shards,p.module_shards)==before
    assert chest in p.chest_slots and 'corrupt-open' not in p.chest_receipts
    chest['reward_definition_snapshot']=definitions.catalog().freeze('legacy.chest.diamond_24h')
    with pytest.raises(meta.MetaProgressionError):service.open_chest(p,chest['chest_id'],'mismatch-open')
    assert (p.circuit_credits,p.flux_shards,p.module_shards)==before


def test_mailbox_and_json_roundtrip_keep_private_snapshot_without_exposing_it():
    p=profile();service=meta.MetaProgressionService()
    service.deliver_reward_chest(p,'core_24h','definition-reward','definition-message')
    message=json.loads(json.dumps(p.reward_inbox[-1]))
    snapshot=message['inventory_chest']['reward_definition_snapshot']
    assert snapshot['kind']=='random'
    receipt=collect_chest(p,message,'collect-definition',datetime.now(timezone.utc).isoformat())
    assert 'reward_definition_snapshot' not in receipt['chest']
    assert p.chest_slots[-1]['reward_definition_snapshot']==snapshot
    assert 'reward_definition_snapshot' not in public_chest(p.chest_slots[-1])


def test_fixed_competition_crates_keep_their_existing_frozen_contents_contract():
    chest={'definition_id':'diamond_24h','fixed_reward':{'circuit_credits':10,'flux_shards':2}}
    assert definitions.freeze_chest(chest)==chest
    assert 'reward_definition_snapshot' not in chest


def test_frozen_inventory_survives_a_real_json_restart_and_blank_target_restore(tmp_path):
    import shutil
    from app.player_data_store import JsonFilePlayerDataRepository,PlayerDataStoreService
    from app.player_settings import PlayerSettingsService
    from app.player_statistics import PlayerStatisticsService
    def store(path):
        profiles=PlayerProfileService()
        service=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),
            settings_service=PlayerSettingsService(),repository=JsonFilePlayerDataRepository(path))
        return service,profiles
    path=tmp_path/'source'/'players.json'
    source,profiles=store(path)
    p=profiles.get_or_create('definition-restore')
    meta.MetaProgressionService().claim_gift_chest(p,'field_3h','restore-gift')
    chest=deepcopy(p.chest_slots[-1])
    source.save_player(p.player_id)
    restarted,loaded=store(path)
    restarted.load_player(p.player_id)
    assert loaded.get(p.player_id).chest_slots[-1]==chest
    target=tmp_path/'restore'/'players.json'
    target.parent.mkdir()
    shutil.copy2(path,target)
    restored,profiles2=store(target)
    restored.load_player(p.player_id)
    p2=profiles2.get(p.player_id)
    assert p2.chest_slots[-1]==chest
    opened=meta.MetaProgressionService().open_chest(p2,chest['chest_id'],'restored-open')
    assert opened['reward_definition_hash']==chest['reward_definition_snapshot']['content_hash']


def test_random_schema_rejects_a_disclosure_that_does_not_match_the_actual_roll():
    body=deepcopy(meta.CHEST_DEFINITIONS['field_3h'])
    body['reward_odds']['module_shards']=.99
    with pytest.raises(definitions.RewardDefinitionError):
        definitions.seal(identity='test.random',revision=1,kind='random',payload=body)


def test_moving_an_already_frozen_chest_never_reads_a_replacement_catalog(monkeypatch):
    chest=definitions.freeze_chest({'definition_id':'field_3h'})
    original=deepcopy(chest)
    def unavailable():
        raise AssertionError('An earned snapshot must not consult the active catalog again')
    monkeypatch.setattr(definitions,'catalog',unavailable)
    assert definitions.freeze_chest(chest)==original
