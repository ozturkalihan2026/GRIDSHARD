"""Earned road contents survive a new template, season, restore and refund."""
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from app import first_season_profile as first, player_profile as profiles_module, main
from app import cosmetic_releases, season_entitlements as rights
from app import store_catalog
from app.cosmetic_releases import CosmeticReleaseRegistry
from app.meta_progression import MetaProgressionService, MetaProgressionError, archive_and_soft_reset_season
from app.player_profile import PlayerProfileService, SEASON_REWARD_TRACK
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_statistics import PlayerStatisticsService
from app.player_settings import PlayerSettingsService
from app.reward_delivery import collect_chest, mailbox_messages
from app.store_catalog import process_purchase, revoke_purchase, restore_refunded_purchase
from app.premium_reward_recovery import POLICY_VERSION, wallet_snapshot
from app.season_module_releases import validate_season_release
from app.season_competition import build_events_view, WEEKLY_PRIZES
from app.liveops_content import content_coverage


@pytest.fixture
def s1(monkeypatch):
    now = datetime(2026, 11, 30, tzinfo=timezone.utc)
    clock = [now]
    registry = CosmeticReleaseRegistry(cosmetic_releases.REGISTRY.document)
    document = deepcopy(first.PROFILE)
    for index, allocation in enumerate(document['cosmetic_allocations']):
        identity = f'fixture-s1-{index}'
        registry = registry.reserve(allocation['source'], allocation['period_id'], identity)
        registry = registry.publish(identity, now=now - timedelta(days=26))
    for index, week in enumerate(document['resource_weeks']):
        placements = [dict(slot=p['position'], cosmetics={}, resources={k:v for k,v in p.items() if k != 'position'})
                      for p in week['prizes']]
        registry = registry.reserve_resources(week['period_id'], f'fixture-resources-{index}', placements)
        registry = registry.publish(f'fixture-resources-{index}', now=now - timedelta(days=26))
    document['status'] = 'published'
    document['release_checks'] = {k: True for k in document['release_checks']}
    document['content_hash'] = cosmetic_releases.fingerprint(document)
    monkeypatch.setattr(first, 'PROFILE', document)
    monkeypatch.setattr(first, 'REGISTRY', registry)
    monkeypatch.setattr(cosmetic_releases, 'REGISTRY', registry)
    monkeypatch.setenv('GRIDSHARD_SEASON_STARTS_AT', document['starts_at'])
    monkeypatch.delenv('GRIDSHARD_OWNER_PLAYER_ID', raising=False)
    original_descriptor = profiles_module.season_descriptor
    original_launch = profiles_module.launch_status
    monkeypatch.setattr(profiles_module, 'launch_status', lambda moment=None: original_launch(moment or clock[0]))
    monkeypatch.setattr(store_catalog, 'launch_status', lambda moment=None: original_launch(moment or clock[0]))
    monkeypatch.setattr(profiles_module, 'season_descriptor', lambda moment=None: original_descriptor(moment or clock[0]))
    service = PlayerProfileService(now_func=lambda: clock[0])
    profile = service.get_or_create('earned-player')
    meta = MetaProgressionService(now_func=lambda: clock[0])
    return clock, service, profile, meta


def earn(s1, tier=5, *, premium=False):
    clock, service, profile, _ = s1
    profile.season_xp = SEASON_REWARD_TRACK[tier - 1]['required_xp']
    purchase = None
    if premium:
        purchase = process_purchase(profile, 'season_pass_premium', 'test', 's1-order',
            test_mode=True, now_iso=clock[0].isoformat(), premium_refund_policy=POLICY_VERSION)
    service.get_or_create(profile.player_id)
    return purchase


def close(s1):
    clock, service, profile, _ = s1
    clock[0] += timedelta(days=28)
    service.get_or_create(profile.player_id)
    return profile.season_archives[-1]


def open_mail(profile, meta, message):
    receipt = collect_chest(profile, message, 'collect-' + message['message_id'], '2026-12-28T00:00:00Z')
    return meta.open_chest(profile, receipt['chest']['chest_id'], 'open-' + message['message_id'])


def store(service, repository=None):
    return PlayerDataStoreService(profile_service=service, statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(), repository=repository or InMemoryPlayerDataRepository())


def test_earned_targets_amounts_hash_and_preview_are_pinned_before_claim(s1, monkeypatch):
    _, service, profile, _ = s1
    earn(s1)
    snapshot = rights.earned(profile, 5)
    profile.rating = profile.highest_rating = 10000
    changed = tuple(dict(r, circuit_credits=99999, module_shards=9999) for r in SEASON_REWARD_TRACK)
    monkeypatch.setattr(profiles_module, 'SEASON_REWARD_TRACK', changed)
    before = wallet_snapshot(profile)
    service.claim_season_tier(profile.player_id, 5, 'claim-five')
    receipt = profile.engagement_claim_receipts['claim-five']
    assert receipt['module_definition_id'] == snapshot['reward']['module_definition_id']
    assert receipt['module_shards'] == snapshot['reward']['module_shards']
    assert receipt['reward_content_hash'] == snapshot['content_hash']
    assert profile.circuit_credits - before['circuit_credits'] == snapshot['reward']['circuit_credits']
    assert profile.engagement_view()['reward_track'][4]['module_shards'] == receipt['module_shards']


def test_rollover_queues_only_earned_unclaimed_fixed_contents_and_cosmetics(s1):
    _, service, profile, meta = s1
    earn(s1, 40, premium=True)
    service.claim_season_tier(profile.player_id, 1, 'already-free')
    service.claim_premium_season_tier(profile.player_id, 2, 'already-paid')
    before = wallet_snapshot(profile)
    archive = close(s1)
    assert len(archive['queued_earned_rewards']) == 78
    assert len(profile.reward_inbox) == 78 and not profile.chest_slots
    assert wallet_snapshot(profile) == before and profile.season_xp == 0
    assert 'reward_state' not in profile.to_view()['season_summary']['previous']
    last = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:40'))
    receipt = open_mail(profile, meta, last)
    assert receipt['rewards']['avatar_frame_id'] == 'aurora_frame'
    assert 'aurora_frame' in profile.unlocked_avatar_frame_ids and 'aurora_banner' in profile.unlocked_profile_background_ids
    assert receipt['reward_content_hash'] == archive['reward_state']['earned']['free:40']['content_hash']
    count = len(profile.reward_inbox)
    service.get_or_create(profile.player_id)
    assert len(profile.reward_inbox) == count
    # Only the actually opened fixed package is granted, no random bonus chest.
    assert len(profile.chest_receipts) == 1 and not profile.chest_slots


def test_new_period_api_grants_exact_fixed_budget_for_both_tracks(s1, monkeypatch):
    _, service, profile, meta = s1
    earn(s1, premium=True)
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'player_profile_service', service)
    monkeypatch.setattr(main, 'meta_progression_service', meta)
    monkeypatch.setattr(main, 'persist_player_data', lambda _: None)
    before = wallet_snapshot(profile)
    free = rights.earned(profile, 5)['reward']
    paid = rights.earned(profile, 5, True)['reward']
    result = main.claim_season_tier_reward(profile.player_id, 5, main.MetaOperationRequest(request_id='free'), chest_delivery='stock-v1')
    premium = main.claim_premium_season_tier_reward(profile.player_id, 5, main.MetaOperationRequest(request_id='paid'), chest_delivery='stock-v1')
    assert result['season_chest_receipt'] is None and result['season_chest_delivery'] is None
    assert premium['season_chest_receipts'] == [] and premium['season_chest_deliveries'] == []
    assert profile.circuit_credits - before['circuit_credits'] == free['circuit_credits'] + paid['circuit_credits']
    assert profile.flux_shards - before['flux_shards'] == free['flux_shards'] + paid['flux_shards']
    assert not profile.reward_inbox and not profile.chest_slots and not profile.chest_receipts


def test_old_season_premium_queue_remains_refundable_and_restorable(s1):
    clock, _, profile, meta = s1
    purchase = earn(s1, premium=True)
    old = profile.active_meta_season_id
    close(s1)
    paid = next(m for m in profile.reward_inbox if m['message_id'].endswith(':premium:5'))
    free = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:5'))
    baseline = wallet_snapshot(profile)
    revoke_purchase(profile, purchase, now_iso=clock[0].isoformat())
    assert paid['message_id'] not in {m['message_id'] for m in mailbox_messages(profile)[0]}
    assert free['message_id'] in {m['message_id'] for m in mailbox_messages(profile)[0]}
    restore_refunded_purchase(profile, purchase, now_iso=clock[0].isoformat())
    open_mail(profile, meta, paid)
    assert profile.premium_reward_recovery[old]['claims']
    revoke_purchase(profile, purchase, now_iso=clock[0].isoformat())
    assert wallet_snapshot(profile) == baseline


def test_restore_roundtrip_keeps_old_queue_targets_and_receipts(s1):
    clock, service, profile, meta = s1
    earn(s1)
    close(s1)
    data = store(service)
    data.save_player(profile.player_id)
    replacement = PlayerProfileService(now_func=lambda: clock[0])
    replacement_store = store(replacement, data.repository)
    replacement_store.load_player(profile.player_id)
    restored = replacement.get_or_create(profile.player_id)
    assert restored.reward_inbox == profile.reward_inbox
    message = next(m for m in restored.reward_inbox if m['message_id'].endswith(':free:5'))
    receipt = open_mail(restored, meta, message)
    replacement_store.save_player(restored.player_id)
    replacement._profiles.clear()
    replacement_store.load_player(restored.player_id)
    restored = replacement.get_or_create(profile.player_id)
    assert restored.chest_receipts[receipt['request_id']] == receipt
    assert len(restored.season_archives) == 1 and len(restored.reward_inbox) == 5


def test_failed_rollover_leaves_every_profile_field_unchanged(s1, monkeypatch):
    _, _, profile, _ = s1
    earn(s1)
    before = deepcopy(profile)
    from app import reward_delivery
    original = reward_delivery.queue_chest
    calls = []
    def fail_after_first(*args, **kwargs):
        calls.append(kwargs['message_id'])
        if len(calls) == 2:
            raise RuntimeError('interrupted closing')
        return original(*args, **kwargs)
    monkeypatch.setattr(reward_delivery, 'queue_chest', fail_after_first)
    with pytest.raises(RuntimeError, match='interrupted closing'):
        archive_and_soft_reset_season(profile, 'next-season')
    assert profile == before


def test_corrupt_snapshot_or_fixed_crate_never_partially_grants(s1):
    _, _, profile, meta = s1
    earn(s1)
    entry = profile.season_reward_state['earned']['free:5']
    entry['reward']['flux_shards'] += 1
    before = deepcopy(profile)
    with pytest.raises(rights.SeasonEntitlementError):
        archive_and_soft_reset_season(profile, 'next-season')
    assert profile == before
    entry['reward']['flux_shards'] -= 1
    close(s1)
    message = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:5'))
    collected = collect_chest(profile, message, 'corrupt-collect', '2026-12-28T00:00:00Z')
    profile.chest_slots[0]['fixed_reward']['flux_shards'] += 1
    before = deepcopy(profile)
    with pytest.raises(MetaProgressionError, match='doğrulanamadı'):
        meta.open_chest(profile, collected['chest']['chest_id'], 'corrupt-open')
    assert profile == before


def test_first_season_exception_does_not_relax_second_season_module_gate(s1):
    assert validate_season_release(dict(season_number=1, season_id=first.PROFILE['season_id'], modules=[]),
                                   launch_profile=first.PROFILE) == ()
    for release in (dict(season_number=2, season_id='gridshard_2026_12_28', modules=[]),
                    dict(season_number=1, season_id='gridshard_2026_12_28', modules=[])):
        with pytest.raises(ValueError, match='yeni modül'):
            validate_season_release(release, launch_profile=first.PROFILE)


def test_draft_or_incomplete_profile_cannot_change_road_delivery(s1, monkeypatch):
    document = deepcopy(first.PROFILE)
    document['status'] = 'draft'
    monkeypatch.setattr(first, 'PROFILE', document)
    assert not first.fixed_road_for(document['season_id'])
    with pytest.raises(ValueError):
        validate_season_release(dict(season_number=1, season_id=document['season_id'], modules=[]), launch_profile=document)
    document['status'] = 'published'
    document['release_checks']['android_acceptance'] = False
    document['content_hash'] = cosmetic_releases.fingerprint({k:v for k,v in document.items() if k != 'content_hash'})
    with pytest.raises(ValueError, match='kabulü eksik'):
        first.validate_profile(document)
    document['cosmetic_allocations'] = []
    with pytest.raises(ValueError, match='tekil'):
        first.validate_profile(document)


def test_resource_weeks_are_explicit_and_preview_equals_frozen_delivery(s1):
    clock, service, _, _ = s1
    total = 0
    for index, week in enumerate(first.PROFILE['resource_weeks']):
        now = clock[0] + timedelta(days=7 * index)
        rows = build_events_view([], now)['weekly_tournament']['prizes']
        assert len(rows) == 3
        for row, expected in zip(rows, week['prizes']):
            profile = service.get_or_create(f'weekly-{index}-{row["position"]}')
            assert row['reward_kind'] == 'resource_only'
            assert all(row[k] == v for k,v in expected.items())
            assert not any(row.get(k) for k in cosmetic_releases.COSMETIC_FIELDS)
            assert main._queue_competition_reward(profile, source='weekly_tournament', period_id=week['period_id'],
                position=row['position'], prize=WEEKLY_PRIZES[row['position'] - 1])
            message = profile.reward_inbox[-1]
            assert message['chest'] == row and message['reward_content_hash']
            total += row['module_shards']
    assert total == 234
    report = content_coverage(cosmetic_releases.REGISTRY, cycles=1, starts_at=first.PROFILE['starts_at'])
    weekly = next(r for r in report['sources'] if r['source'] == 'weekly_tournament')
    assert weekly['period_count'] == 4 and weekly['cosmetic_period_count'] == 1
    assert len(weekly['resource_only_periods']) == 3 and report['stock_ready']


def test_second_season_waits_for_content_but_old_mail_stays_openable(s1):
    clock, service, profile, meta = s1
    earn(s1)
    archive = close(s1)
    assert profile.active_meta_season_id == 'gridshard_waiting'
    assert profiles_module.season_descriptor(clock[0])['status'] == 'waiting_for_content'
    assert not profile.premium_pass_active()
    service.record_battle_engagement(profile.player_id, battle_id='while-closed', match_type='arena_ai',
        season_xp_awarded=50, damage_dealt=0, circuit_actions=0)
    assert profile.season_xp == 0
    events = build_events_view([], clock[0])
    assert events['weekly_tournament']['prizes'] == [] and not events['weekly_tournament']['registration_open']
    message = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:5'))
    open_mail(profile, meta, message)
    assert archive['season_xp'] > 0 and profile.season_xp == 0


def test_cross_season_request_replay_never_delivers_new_period_stock(s1, monkeypatch):
    _, service, profile, meta = s1
    earn(s1, premium=True)
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'player_profile_service', service)
    monkeypatch.setattr(main, 'meta_progression_service', meta)
    monkeypatch.setattr(main, 'persist_player_data', lambda _: None)
    free = main.MetaOperationRequest(request_id='before-close-free')
    paid = main.MetaOperationRequest(request_id='before-close-paid')
    original = main.claim_season_tier_reward(profile.player_id, 5, free, chest_delivery='stock-v1')
    original_paid = main.claim_premium_season_tier_reward(profile.player_id, 5, paid, chest_delivery='stock-v1')
    close(s1)
    before = wallet_snapshot(profile)
    count = len(profile.reward_inbox)
    assert main.claim_season_tier_reward(profile.player_id, 5, free, chest_delivery='stock-v1')['season_reward_receipt'] == original['season_reward_receipt']
    assert main.claim_premium_season_tier_reward(profile.player_id, 5, paid, chest_delivery='stock-v1')['season_reward_receipt'] == original_paid['season_reward_receipt']
    assert len(profile.reward_inbox) == count and not profile.chest_slots and wallet_snapshot(profile) == before


def test_legacy_extra_chests_keep_the_old_period_and_remain_single_delivery(s1, monkeypatch):
    _, service, profile, meta = s1
    # Deliberately exercise the older API policy, independently of S1 publication.
    document = deepcopy(first.PROFILE)
    document['status'] = 'draft'
    monkeypatch.setattr(first, 'PROFILE', document)
    earn(s1, premium=True)
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'player_profile_service', service)
    monkeypatch.setattr(main, 'meta_progression_service', meta)
    monkeypatch.setattr(main, 'persist_player_data', lambda _: None)
    free = main.MetaOperationRequest(request_id='legacy-free')
    paid = main.MetaOperationRequest(request_id='legacy-paid')
    main.claim_season_tier_reward(profile.player_id, 5, free, chest_delivery='stock-v1')
    main.claim_premium_season_tier_reward(profile.player_id, 5, paid, chest_delivery='stock-v1')
    assert len(profile.chest_slots) == 3
    for chest in list(profile.chest_slots):
        meta.open_chest(profile, chest['chest_id'], 'open-' + chest['chest_id'])
    archive_and_soft_reset_season(profile, 'gridshard_waiting')
    before = wallet_snapshot(profile)
    # The real service would reopen S1 here; hold the synchronized result for
    # this direct handler replay so it cannot alter the controlled period.
    monkeypatch.setattr(service, '_sync_season', lambda _: False)
    main.claim_season_tier_reward(profile.player_id, 5, free, chest_delivery='stock-v1')
    main.claim_premium_season_tier_reward(profile.player_id, 5, paid, chest_delivery='stock-v1')
    assert not profile.chest_slots and wallet_snapshot(profile) == before
    assert len(profile.chest_receipts) == 3


def test_concurrent_return_after_close_creates_one_archive_and_one_entitlement_each(s1):
    clock, service, profile, _ = s1
    earn(s1, premium=True)
    clock[0] += timedelta(days=28)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: service.get_or_create(profile.player_id), range(8)))
    assert len(profile.season_archives) == 1
    assert len(profile.reward_inbox) == len({m['message_id'] for m in profile.reward_inbox}) == 10


def test_tampered_competition_payload_cannot_be_collected(s1):
    _, _, profile, _ = s1
    period = first.PROFILE['resource_weeks'][0]['period_id']
    main._queue_competition_reward(profile, source='weekly_tournament', period_id=period, position=1, prize=WEEKLY_PRIZES[0])
    message = profile.reward_inbox[-1]
    message['chest']['flux_shards'] += 1
    before = deepcopy(profile)
    with pytest.raises(ValueError, match='doğrulanamadı'):
        collect_chest(profile, message, 'corrupt-week', '2026-12-07T00:00:00Z')
    assert before == profile


def test_weekly_closing_freezes_all_three_winners_before_re_registration(s1, monkeypatch):
    clock, service, _, _ = s1
    participants = [service.get_or_create(f'weekly-ranked-{i}') for i in range(7)]
    for i, profile in enumerate(participants):
        profile.weekly_tournament_period = profile.weekly_tournament_registered_period = '2026-W49'
        profile.weekly_tournament_matches = 2
        profile.weekly_tournament_wins = 1
        profile.weekly_tournament_trophies_earned = 100 - i * 10
    clock[0] += timedelta(days=7)
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return clock[0]
    saved = []
    monkeypatch.setattr(main, 'datetime', Clock)
    monkeypatch.setattr(main, '_real_competition_profiles', lambda: participants)
    monkeypatch.setattr(main, '_team_tournament_periods_to_settle', lambda *a: [])
    monkeypatch.setattr(main, 'persist_player_data', saved.append)
    monkeypatch.setenv('GRIDSHARD_WEEKLY_MIN_PLAYERS', '4')
    main._settle_competition_rewards(participants[0].player_id)
    assert len(saved) == 7
    for position, profile in enumerate(participants[:3], 1):
        assert profile.reward_inbox[0]['position'] == position
    assert not participants[3].reward_inbox
    participants[0].weekly_tournament_period = participants[0].weekly_tournament_registered_period = '2026-W50'
    participants[0].weekly_tournament_trophies_earned = 0
    main._settle_competition_rewards(participants[1].player_id)
    assert len(saved) == 7 and participants[1].reward_inbox[0]['position'] == 2
    # Deleting all winning accounts must not make fourth place a new winner.
    remaining = participants[3:]
    monkeypatch.setattr(main, '_real_competition_profiles', lambda: remaining)
    main._settle_competition_rewards(remaining[0].player_id)
    assert len(saved) == 7 and not any(p.reward_inbox for p in remaining)


@pytest.mark.parametrize('change', [dict(module_shards=0), dict(module_shards=-1), dict(module_shards=True),
                                   dict(module_definition_id='unimplemented_card')])
def test_resource_only_period_rejects_silent_zero_or_unimplemented_rewards(s1, change):
    document = deepcopy(cosmetic_releases.REGISTRY.document)
    release = next(r for r in document['releases'] if r.get('reward_kind') == 'resource_only')
    release['placements'][0]['resources'].update(change)
    with pytest.raises(cosmetic_releases.CosmeticReleaseError):
        CosmeticReleaseRegistry(document)
