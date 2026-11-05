"""Collect-and-open uses one account transaction and one durable crate receipt."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

import pytest
from fastapi import HTTPException

from app import main
from app.meta_progression import MetaProgressionError
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.reward_delivery import premium_origin, queue_chest
from app.store_catalog import revoke_purchase
from test_reward_delivery import fixture, buy


def setup(monkeypatch, reward=None):
    profiles, player, meta = fixture()
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'player_profile_service', profiles)
    monkeypatch.setattr(main, 'meta_progression_service', meta)
    monkeypatch.setattr(main, 'persist_player_data', lambda player_id: None)
    player.reward_inbox.append(dict(message_id='rank-one', source='season_leaderboard', status='unclaimed',
        chest=reward or dict(chest_tier='gold', circuit_credits=100, flux_shards=5,
                            core_type_id='core_resonance', core_shards=3)))
    return player, meta


def claim(player, identity, delivery='open'):
    return main.claim_reward_inbox_item(player.player_id, 'rank-one',
        main.MetaOperationRequest(request_id=identity), chest_delivery=delivery)


def test_legacy_collect_then_new_open_and_new_request_replays_never_duplicate(monkeypatch):
    player, meta = setup(monkeypatch)
    credits = player.circuit_credits
    old = claim(player, 'legacy', '')
    assert 'opened_receipt' not in old and len(player.chest_slots) == 1
    assert player.circuit_credits == credits
    opened = claim(player, 'new-open')
    assert not player.chest_slots and player.core_shards_by_type['core_resonance'] == 3
    assert player.circuit_credits == credits + 100
    settled = deepcopy(player)
    for identity in ('new-open', 'different-request'):
        replay = claim(player, identity)
        assert replay['opened_receipt'] == opened['opened_receipt']
        assert player.circuit_credits == credits + 100
        assert player.core_shards_by_type['core_resonance'] == 3
        assert player == settled
    assert len(player.chest_receipts) == 1
    assert set(player.reward_inbox_receipts) == {'legacy'}


def test_collect_replay_recovers_a_crate_already_opened_in_inventory(monkeypatch):
    player, meta = setup(monkeypatch)
    collected = claim(player, 'legacy', '')
    opened = meta.open_chest(player, collected['receipt']['chest']['chest_id'], 'inventory-open')
    result = claim(player, 'new-open')
    assert result['opened_receipt'] == opened and len(player.chest_receipts) == 1
    assert player.core_shards_by_type['core_resonance'] == 3


@pytest.mark.parametrize('extra', [dict(core_type_id='unknown'), dict(core_type_id='core_quantum'),
    dict(core_shards=-1), dict(core_shards=True), dict(module_definition_id='unknown', module_shards=2)])
def test_invalid_fixed_target_preserves_every_resource_and_unclaimed_message(monkeypatch, extra):
    reward = dict(chest_tier='gold', circuit_credits=100, flux_shards=5,
                  core_type_id='core_resonance', core_shards=3)
    reward.update(extra)
    player, meta = setup(monkeypatch, reward)
    before = deepcopy(player)
    with pytest.raises(HTTPException) as error:
        claim(player, 'invalid')
    assert error.value.status_code == 422
    assert player == before


def test_concurrent_claims_issue_one_receipt(monkeypatch):
    player, meta = setup(monkeypatch)
    credits = player.circuit_credits
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda n: claim(player, f'parallel-{n}'), range(8)))
    assert len({r['opened_receipt']['chest_id'] for r in results}) == 1
    assert len(player.chest_receipts) == 1 and not player.chest_slots
    assert player.circuit_credits == credits + 100 and player.core_shards_by_type['core_resonance'] == 3


def test_invalid_fixed_payload_does_not_partially_change_wallet_when_opened_in_inventory(monkeypatch):
    player, meta = setup(monkeypatch, dict(chest_tier='gold', circuit_credits=100,
                                          core_type_id='unknown', core_shards=2))
    collected = claim(player, 'collect', '')
    before = deepcopy(player)
    with pytest.raises(MetaProgressionError):
        meta.open_chest(player, collected['receipt']['chest']['chest_id'], 'bad-open')
    assert player == before


def test_opened_core_receipt_and_replay_survive_profile_reload(monkeypatch):
    player, meta = setup(monkeypatch)
    opened = claim(player, 'durable-open')['opened_receipt']
    profiles = main.player_profile_service
    data = PlayerDataStoreService(profile_service=profiles, statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(), repository=InMemoryPlayerDataRepository())
    data.save_player(player.player_id)
    profiles._profiles.clear()
    data.load_player(player.player_id)
    restored = profiles.get(player.player_id)
    assert claim(restored, 'retry-after-restart')['opened_receipt'] == opened
    assert restored.core_shards_by_type['core_resonance'] == 3


def test_fixed_core_fragments_remain_in_the_premium_refund_ledger(monkeypatch):
    player, meta = setup(monkeypatch)
    player.reward_inbox.clear()
    purchase = buy(player)
    chest = dict(chest_id='premium-core-crate', definition_id='core_24h', name_tr='Çekirdek Kasası',
        premium_origin=premium_origin(player), fixed_reward=dict(core_type_id='core_resonance', core_shards=3))
    queue_chest(player, chest, message_id='rank-one', title='Çekirdek')
    claim(player, 'premium-open')
    assert player.core_shards_by_type['core_resonance'] == 3
    revoke_purchase(player, purchase, now_iso='2026-10-11T06:00:00Z')
    assert player.core_shards_by_type['core_resonance'] == 0
