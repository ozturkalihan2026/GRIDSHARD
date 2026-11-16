"""Closing transfers actual earned rights, never just a matching mail ID."""
from copy import deepcopy
from datetime import timedelta

import pytest

from app import season_entitlements as rights, first_season_profile as first
from app import season_missions, reward_choices as choices, free_economy_rewards as economy
from app.meta_progression import archive_and_soft_reset_season
from app.period_reward_closeout import prepare_period_closeout
from app.player_profile import SEASON_REWARD_TRACK, PlayerProfileService
from app.reward_delivery import collect_chest, mailbox_messages, MAILBOX_AREA_LIMIT
from app.premium_reward_recovery import wallet_snapshot
from app.store_catalog import revoke_purchase, restore_refunded_purchase
from test_season_entitlements import s1, earn, store, open_mail  # noqa: F401
from test_reward_choices import earn as earn_choice


def test_conflicting_already_queued_reward_blocks_reset_without_mutation(s1):
    clock, _, profile, _ = s1
    earn(s1, tier=2)
    rights.queue_unclaimed(profile, now_iso=clock[0].isoformat())
    profile.reward_inbox[0]['inventory_chest']['fixed_reward']['circuit_credits'] += 1
    before = deepcopy(profile)
    with pytest.raises(rights.SeasonEntitlementError, match='aktar'):
        archive_and_soft_reset_season(profile, 'next-season', archived_at=clock[0].isoformat())
    assert profile == before


@pytest.mark.parametrize('conflict', ['hash', 'origin', 'definition', 'duplicate', 'status'])
def test_other_transfer_conflicts_preserve_all_counters_and_rights(s1, conflict):
    clock, _, profile, _ = s1
    earn(s1, tier=2)
    rights.queue_unclaimed(profile, now_iso=clock[0].isoformat())
    message = profile.reward_inbox[0]
    if conflict == 'duplicate':
        profile.reward_inbox.append(deepcopy(message))
    elif conflict == 'status':
        message['status'] = 'deleted'
    else:
        field = {'hash': 'reward_content_hash', 'origin': 'premium_origin', 'definition': 'definition_id'}[conflict]
        message['inventory_chest'][field] = 'conflicting-transfer'
    before = deepcopy(profile)
    with pytest.raises(rights.SeasonEntitlementError, match='aktar'):
        archive_and_soft_reset_season(profile, 'next-season', archived_at=clock[0].isoformat())
    assert profile == before


def test_prepare_is_private_and_repeat_closing_transfers_each_unclaimed_tier_once(s1):
    clock, service, profile, _ = s1
    earn(s1, tier=5)
    service.claim_season_tier(profile.player_id, 1, 'claimed-before-close')
    before = deepcopy(profile)
    prepared, queued = prepare_period_closeout(profile, closed_at=clock[0].isoformat())
    assert profile == before and len(queued) == 4
    assert len(prepared.reward_inbox) == 4
    archived = archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
    assert len(archived['queued_earned_rewards']) == 4
    after = deepcopy(profile)
    assert archive_and_soft_reset_season(profile, 'gridshard_waiting') is None
    assert profile == after


def test_final_completed_mission_unlocks_and_freezes_road_before_reset(s1):
    clock, _, profile, _ = s1
    threshold = SEASON_REWARD_TRACK[1]['required_xp']
    profile.season_xp = threshold - 1
    state = season_missions._state(profile)
    state['progress']['completed_battles'] = 20
    old = profile.active_meta_season_id
    archive = archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
    assert archive['season_xp'] == threshold - 1 + 150
    assert archive['mission_state']['rewards']['seasonal::season_battles_20']['automatic']
    assert 'free:2' in archive['reward_state']['earned']
    assert any(m['message_id'] == f'season-road:{old}:{profile.player_id}:free:2' for m in profile.reward_inbox)
    assert profile.season_xp == 0 and not profile.season_mission_state


def test_full_inbox_late_return_and_restart_keep_hidden_right_openable_once(s1):
    clock, service, profile, meta = s1
    earn(s1, tier=5)
    old = profile.active_meta_season_id
    clock[0] += timedelta(days=60)
    service.get_or_create(profile.player_id)
    for index in range(MAILBOX_AREA_LIMIT + 5):
        meta.deliver_reward_chest(profile, 'field_3h', 'later', f'later-{index}')
    message_id = f'season-road:{old}:{profile.player_id}:free:5'
    assert message_id not in {m['message_id'] for m in mailbox_messages(profile)[0]}
    data = store(service)
    data.save_player(profile.player_id)
    replacement = PlayerProfileService(now_func=lambda: clock[0])
    store(replacement, data.repository).load_player(profile.player_id)
    restored = replacement.get_or_create(profile.player_id)
    for public in list(mailbox_messages(restored)[0]):
        message = next(m for m in restored.reward_inbox if m['message_id'] == public['message_id'])
        collect_chest(restored, message, 'collect-' + public['message_id'], clock[0].isoformat())
    assert message_id in {m['message_id'] for m in mailbox_messages(restored)[0]}
    message = next(m for m in restored.reward_inbox if m['message_id'] == message_id)
    receipt = open_mail(restored, meta, message)
    after = wallet_snapshot(restored)
    assert open_mail(restored, meta, message) == receipt
    assert wallet_snapshot(restored) == after and len(restored.season_archives) == 1
    replacement.get_or_create(restored.player_id)
    assert sum(m['message_id'] == message_id for m in restored.reward_inbox) == 1


@pytest.mark.parametrize('legacy', [False, True])
def test_refund_before_close_suspends_premium_and_restore_discharges_old_right_once(s1, monkeypatch, legacy):
    clock, _, profile, meta = s1
    if legacy:
        document = deepcopy(first.PROFILE)
        document['status'] = 'draft'
        monkeypatch.setattr(first, 'PROFILE', document)
    purchase = earn(s1, tier=5, premium=True)
    origin_season = profile.active_meta_season_id
    revoke_purchase(profile, purchase, now_iso=clock[0].isoformat())
    archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
    paid = next(m for m in profile.reward_inbox if m['message_id'].endswith(':premium:5'))
    assert paid['message_id'] not in {m['message_id'] for m in mailbox_messages(profile)[0]}
    assert any(m['message_id'].endswith(':free:5') for m in mailbox_messages(profile)[0])
    restore_refunded_purchase(profile, purchase, now_iso=clock[0].isoformat())
    assert paid['message_id'] in {m['message_id'] for m in mailbox_messages(profile)[0]}
    first_receipt = open_mail(profile, meta, paid)
    after = wallet_snapshot(profile)
    assert open_mail(profile, meta, paid) == first_receipt
    assert wallet_snapshot(profile) == after
    assert profile.premium_reward_recovery[origin_season]['claims']
    if legacy:
        extras = [m for m in profile.reward_inbox if m['message_id'].startswith('season-premium-tier:')]
        assert len(extras) == 2 and all(m['inventory_chest']['premium_origin']['season_id'] == origin_season for m in extras)


@pytest.mark.parametrize('already_claimed', [False, True])
def test_earned_choice_is_not_selected_reset_or_rebound_by_season_close(s1, monkeypatch, already_claimed):
    clock, _, profile, _ = s1
    monkeypatch.setattr(economy, 'enabled', lambda _: True)
    identity = earn_choice(profile, clock[0])
    if already_claimed:
        choices.claim(profile, identity, 'attack', request_id='old-choice', moment=clock[0])
    saved = deepcopy(profile.reward_choice_state)
    archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
    assert profile.reward_choice_state == saved
    monkeypatch.setattr(economy, 'enabled', lambda _: False)
    later = clock[0] + timedelta(days=60)
    pending = choices.view(profile, moment=later)['pending']
    if already_claimed:
        assert not pending
    else:
        assert pending[0]['entitlement_id'] == identity
    receipt = choices.claim(profile, identity, 'attack', request_id='old-choice', moment=later)
    after = wallet_snapshot(profile)
    assert choices.claim(profile, identity, 'attack', request_id='retry-choice', moment=later) == receipt
    assert wallet_snapshot(profile) == after


def test_conflicting_legacy_random_crate_blocks_the_whole_reset(s1, monkeypatch):
    clock, _, profile, _ = s1
    document = deepcopy(first.PROFILE)
    document['status'] = 'draft'
    monkeypatch.setattr(first, 'PROFILE', document)
    earn(s1, tier=5, premium=True)
    rights.queue_unclaimed(profile, now_iso=clock[0].isoformat())
    extra = next(m for m in profile.reward_inbox if m['message_id'].startswith('season-premium-tier:'))
    extra['inventory_chest']['reward_definition_snapshot']['content_hash'] = 'wrong-snapshot'
    before = deepcopy(profile)
    with pytest.raises(rights.SeasonEntitlementError, match='aktar'):
        archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
    assert profile == before
