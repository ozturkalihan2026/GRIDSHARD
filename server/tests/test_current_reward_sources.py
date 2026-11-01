"""Every newly generated entitlement uses the active roster, including stock/mail."""
from copy import deepcopy
from datetime import datetime, timezone

import pytest

from app.arena_canon import ARENAS, RANK_STAGES, unlocked_module_ids
from app.catalog_migration import award_module_shards
from app.meta_progression import (
    CHEST_DEFINITIONS, STORE_CHEST_PRICES, MetaProgressionService,
    _select_reward_module,
)
from app.module_roster import MODULE_SPECS, RETIRED_MODULE_IDS
from app.player_profile import (
    DAILY_MISSIONS, LOGIN_PERIOD_REWARDS, SEASON_REWARD_TRACK,
    SEASON_PREMIUM_REWARD_TRACK, PlayerProfileService, _profile_reward_identity,
)
from app.reward_delivery import collect_chest, current_reward_contents
from app.season_competition import LEADERBOARD_PRIZES, TEAM_PRIZES, WEEKLY_PRIZES

NOW = datetime(2026, 10, 10, 12, tzinfo=timezone.utc)


def fixture(rating=5400):
    profiles = PlayerProfileService(now_func=lambda: NOW)
    profile = profiles.get_or_create('current-reward-audit')
    profile.rating = profile.highest_rating = rating
    return profiles, profile, MetaProgressionService(now_func=lambda: NOW)


def assert_current(profile, rewards):
    identity = rewards.get('module_definition_id')
    if identity:
        assert identity in MODULE_SPECS
        assert identity in unlocked_module_ids(profile.highest_rating)
    assert RETIRED_MODULE_IDS.isdisjoint(profile.module_shards)


def test_entire_road_claims_active_cards_and_keeps_all_new_arena_cards_reachable():
    _, p, meta = fixture(max(n["trophies"] for stage in (*ARENAS,*RANK_STAGES) for n in stage.get("nodes",())))
    awarded = set()
    for stage in (*ARENAS, *RANK_STAGES):
        for node in stage.get('nodes', ()):
            receipt = meta.claim_arena_reward(p, node['id'])
            assert_current(p, receipt['rewards'])
            assert set(receipt['module_shards']) <= MODULE_SPECS.keys()
            awarded.update(receipt['module_shards'])
            before = dict(p.module_shards)
            assert meta.claim_arena_reward(p, node['id'])['replayed']
            assert p.module_shards == before
    # Every card added after the starter arena has a targeted road stop.
    assert {k for k, m in MODULE_SPECS.items() if m['unlock_arena'] > 1} <= awarded


@pytest.mark.parametrize('rating', [a['minimum_rating'] for a in ARENAS])
def test_login_and_both_season_tracks_only_select_current_unlocked_cards(rating):
    _, p, _ = fixture(rating)
    for source, track in [('login', LOGIN_PERIOD_REWARDS),
                          ('season', SEASON_REWARD_TRACK),
                          ('premium', SEASON_PREMIUM_REWARD_TRACK)]:
        for index, reward in enumerate(track):
            actual = _profile_reward_identity(p, reward, f'{source}:{index}:{rating}')
            assert_current(p, actual)
    # Daily orders currently grant XP/Flux; they must not hide a retired shard grant.
    for mission in DAILY_MISSIONS:
        assert not any(k in mission for k in ('module_definition_id', 'module_id', 'module_shards'))


@pytest.mark.parametrize('definition', tuple(CHEST_DEFINITIONS))
@pytest.mark.parametrize('source', ('season-free', 'season-premium', 'event', 'gift', 'stock'))
def test_every_random_chest_tier_and_delivery_source_opens_active_contents(definition, source):
    _, p, meta = fixture()
    if source == 'stock':
        receipt = meta.stock_reward_chest(p, definition, source, 'stock')
        opened = meta.open_chest(p, receipt['chest']['chest_id'], 'open-stock')
    else:
        opened = meta.award_instant_chest(p, definition, source, 'instant')
    assert_current(p, opened['rewards'])
    before = dict(p.module_shards)
    assert meta.open_chest(p, opened['chest_id'], opened['request_id']) == opened
    assert p.module_shards == before


@pytest.mark.parametrize('definition', tuple(STORE_CHEST_PRICES))
def test_each_shop_chest_purchases_only_current_contents(definition):
    _, p, meta = fixture()
    p.circuit_credits = p.flux_shards = 100000
    bought = meta.purchase_store_chest(p, definition, 'shop-current')
    assert_current(p, bought['rewards'])
    before = dict(p.module_shards)
    assert meta.purchase_store_chest(p, definition, 'shop-current') == bought
    assert p.module_shards == before


def test_actual_victory_mail_collect_open_uses_current_catalog():
    _, p, meta = fixture()
    meta.award_battle_chest(p, 'victory-current', True)
    collected = collect_chest(p, p.reward_inbox[0], 'collect', NOW.isoformat())
    opened = meta.open_chest(p, collected['chest']['chest_id'], 'victory-open')
    assert_current(p, opened['rewards'])


@pytest.mark.parametrize('prize', (*WEEKLY_PRIZES, *TEAM_PRIZES, *LEADERBOARD_PRIZES))
def test_ranking_and_tournament_fixed_crates_preserve_contents_without_retired_cards(prize):
    _, p, meta = fixture()
    # The competition service fixes amounts/cosmetics before mailbox delivery.
    message = {'message_id': 'competition-current', 'source': 'team_tournament',
               'status': 'unclaimed', 'chest': deepcopy(prize)}
    collected = collect_chest(p, message, 'collect-competition', NOW.isoformat())
    opened = meta.open_chest(p, collected['chest']['chest_id'], 'open-competition')
    assert opened['rewards'] == prize
    assert_current(p, opened['rewards'])


@pytest.mark.parametrize('retired', sorted(RETIRED_MODULE_IDS))
def test_unopened_historical_fixed_entitlement_converts_once_and_receipt_has_no_old_card(retired):
    _, p, meta = fixture()
    old = {'module_definition_id': retired, 'module_rarity': 'rare',
           'module_shards': 17, 'universal_module_shards': 3, 'circuit_credits': 10}
    p.chest_slots.append({'chest_id': 'legacy-fixed', 'definition_id': 'field_3h',
                          'fixed_reward': deepcopy(old)})
    before = p.universal_module_shards
    opened = meta.open_chest(p, 'legacy-fixed', 'legacy-open')
    assert p.universal_module_shards == before + 20
    assert opened['rewards'] == {'universal_module_shards': 20, 'circuit_credits': 10}
    assert_current(p, opened['rewards'])
    assert meta.open_chest(p, 'legacy-fixed', 'legacy-open') == opened
    assert p.universal_module_shards == before + 20
    assert current_reward_contents(old) == opened['rewards']  # input remains historical
    assert old['module_definition_id'] == retired


def test_new_cards_are_in_the_reward_pool_and_unknown_grants_fail_before_mutation():
    _, p, _ = fixture()
    eligible = {k for k in MODULE_SPECS if k in unlocked_module_ids(p.highest_rating)}
    # Deterministic coverage, with explicit rarity draws (no flaky chance assertion).
    selected = {_select_reward_module(p, f'coverage:{seed}', rarity=rarity)[0]
                for rarity in ('common', 'rare', 'epic', 'legendary') for seed in range(250)}
    assert selected == eligible
    before = deepcopy(p.module_shards)
    with pytest.raises(ValueError):
        award_module_shards(p, 'unknown-retired-or-typo', 10)
    assert p.module_shards == before
