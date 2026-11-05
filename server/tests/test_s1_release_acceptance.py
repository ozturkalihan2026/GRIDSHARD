"""S1 delivery acceptance against real fixed rights and disposable PostgreSQL."""
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from app import main as gateway, first_season_profile as first, season_entitlements as rights
from app.player_profile import SEASON_REWARD_TRACK
from app.premium_reward_recovery import wallet_snapshot
from app.reward_delivery import collect_chest
from app.season_competition import LEADERBOARD_PRIZES, WEEKLY_PRIZES
from test_season_entitlements import s1, earn, close, store  # noqa: F401 -- isolated published fixture
from test_postgres_social_api import social_db  # noqa: F401 -- guarded disposable DB
from test_server_backup import empty_database_pair, backup_tool  # noqa: F401


def test_all_eighty_road_claims_match_frozen_budget_without_random_chests(s1, monkeypatch):
    _, service, profile, meta = s1
    earn(s1, 40, premium=True)
    expected = [rights.earned(profile, tier, premium)['reward']
                for premium in (False, True) for tier in range(1, 41)]
    before = wallet_snapshot(profile)
    monkeypatch.setattr(gateway, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(gateway, 'player_profile_service', service)
    monkeypatch.setattr(gateway, 'meta_progression_service', meta)
    monkeypatch.setattr(gateway, 'persist_player_data', lambda _: None)
    for premium in (False, True):
        handler = gateway.claim_premium_season_tier_reward if premium else gateway.claim_season_tier_reward
        for tier in range(1, 41):
            request = gateway.MetaOperationRequest(request_id=f'acceptance-{premium}-{tier}')
            handler(profile.player_id, tier, request, chest_delivery='inbox-v1')
            settled = wallet_snapshot(profile)
            handler(profile.player_id, tier, request, chest_delivery='inbox-v1')
            assert wallet_snapshot(profile) == settled
    for resource in ('circuit_credits', 'flux_shards', 'universal_module_shards'):
        assert getattr(profile, resource) - before[resource] == sum(r.get(resource, 0) for r in expected)
    expected_pieces = sum(r.get('module_shards', 0) for r in expected)
    actual_pieces = sum(v - before.get(k, 0) for k, v in wallet_snapshot(profile).items() if k.startswith('module_shards:'))
    assert actual_pieces == expected_pieces
    assert len(profile.claimed_season_tiers) == len(profile.claimed_premium_season_tiers) == 40
    assert 'aurora_frame' in profile.unlocked_avatar_frame_ids
    assert not profile.reward_inbox and not profile.chest_slots and not profile.chest_receipts


def test_every_s1_competition_crate_opens_exactly_its_preview_and_unique_pair(s1):
    _, service, _, meta = s1
    cases = [('weekly_tournament', week['period_id'], prize) for week in first.PROFILE['resource_weeks'] for prize in WEEKLY_PRIZES]
    cases += [('weekly_tournament', '2026-W52', prize) for prize in WEEKLY_PRIZES]
    cases += [('season_leaderboard', first.PROFILE['season_id'], prize) for prize in LEADERBOARD_PRIZES]
    pairs = []
    for index, (source, period, prize) in enumerate(cases):
        profile = service.get_or_create(f'acceptance-competition-{index}')
        profile.rating = profile.highest_rating = 10000
        assert gateway._queue_competition_reward(profile, source=source, period_id=period, position=prize['position'], prize=prize)
        message = profile.reward_inbox[-1]
        expected = deepcopy(message['chest'])
        before = wallet_snapshot(profile)
        collected = collect_chest(profile, message, 'collect', '2026-12-28T00:00:00Z')
        receipt = meta.open_chest(profile, collected['chest']['chest_id'], 'open')
        for field in ('circuit_credits', 'flux_shards', 'module_shards', 'universal_module_shards'):
            assert receipt['rewards'].get(field, 0) == expected.get(field, 0)
        assert profile.circuit_credits - before['circuit_credits'] == expected.get('circuit_credits', 0)
        assert receipt['reward_content_hash'] == message['reward_content_hash']
        settled = wallet_snapshot(profile)
        assert meta.open_chest(profile, collected['chest']['chest_id'], 'open') == receipt
        assert wallet_snapshot(profile) == settled
        if expected.get('avatar_frame_id') in {'solar_frame', 'abyss_frame'}:
            pairs.append(expected['avatar_frame_id'])
    assert sorted(pairs) == ['abyss_frame', 'solar_frame']


def test_published_s1_pg_rollover_failure_then_reload_preserves_all_eighty_rights(social_db, s1, monkeypatch):
    _, players, _, (player, _, _) = social_db
    clock, _, _, _ = s1
    profiles = gateway.player_profile_service
    monkeypatch.setattr(profiles, '_now_func', lambda: clock[0])
    with gateway._store_economy_transaction(player):
        profile = profiles.get_or_create(player)
        profile.season_xp = SEASON_REWARD_TRACK[-1]['required_xp']
        from app.store_catalog import process_purchase
        from app.premium_reward_recovery import POLICY_VERSION
        process_purchase(profile, 'season_pass_premium', 'test', uuid4().hex,
                         test_mode=True, now_iso=clock[0].isoformat(), premium_refund_policy=POLICY_VERSION)
        profiles.get_or_create(player)
        gateway.persist_player_data(player)
    before = deepcopy(players.load(player).profile)
    clock[0] += timedelta(days=28)
    with monkeypatch.context() as patch:
        def fail(*args):
            raise RuntimeError('injected published S1 close failure')
        patch.setattr(gateway.player_data_store_service, 'save_player', fail)
        with pytest.raises(RuntimeError, match='published S1 close failure'):
            gateway.get_profile(player)
    assert players.load(player).profile == before
    gateway.get_profile(player)
    profiles._profiles.clear()
    gateway.player_data_store_service.load_player(player)
    profile = profiles.get_or_create(player)
    assert len([m for m in profile.reward_inbox if m['message_id'].startswith('season-road:'+first.PROFILE['season_id']+':')]) == 80
    target = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:40'))
    request = gateway.MetaOperationRequest(request_id='s1-aurora-open')
    opened = gateway.claim_reward_inbox_item(player, target['message_id'], request, chest_delivery='open')
    profiles._profiles.clear()
    gateway.player_data_store_service.load_player(player)
    replay = gateway.claim_reward_inbox_item(player, target['message_id'], request, chest_delivery='open')
    assert replay['opened_receipt'] == opened['opened_receipt']
    assert opened['opened_receipt']['rewards']['avatar_frame_id'] == 'aurora_frame'
    assert len(profiles.get_or_create(player).chest_receipts) == 1


def test_eighty_s1_rights_survive_real_database_dump_and_restore(s1, empty_database_pair, tmp_path):
    from app.postgres_repository import PostgresPool, PostgresPlayerDataRepository
    from app.clean_install import ensure_clean_postgres_installation
    (source, target), pg_bin = empty_database_pair
    _, service, profile, _ = s1
    earn(s1, 40, premium=True)
    close(s1)
    assert len(profile.reward_inbox) == 80
    pool = PostgresPool(source)
    pool.open()
    installation = ensure_clean_postgres_installation(pool)
    repository = PostgresPlayerDataRepository(pool)
    store(service, repository).save_player(profile.player_id)
    expected = deepcopy(repository.load(profile.player_id).profile)
    pool.close()
    # Backup policy correctly forbids even test player data under the repo.
    with TemporaryDirectory(prefix='gridshard-s1-restore-') as directory:
        backup_root = Path(directory)
        backup_tool.backup(source, backup_root/'backup', pg_bin)
        backup_tool.restore(target, backup_root/'backup', backup_root/'restored-runtime', installation, pg_bin)
    restored = PostgresPool(target)
    restored.open()
    try:
        actual = PostgresPlayerDataRepository(restored).load(profile.player_id).profile
        assert actual == expected
        assert len(actual['meta_progression_state']['reward_inbox']) == 80
    finally:
        restored.close()
