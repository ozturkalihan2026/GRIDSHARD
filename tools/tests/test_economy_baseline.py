"""Budget regressions: avoid fictional crates and premium/AI double accounting."""
from datetime import datetime, timezone
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('baseline', ROOT / 'tools/report_economy_baseline.py')
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


def config():
    return dict(days=28, rating=0, wins=2, losses=2, gifts=2,
                mission_ids=[m['id'] for m in baseline.profile.DAILY_MISSIONS])


def test_season_pass_is_additional_resources_not_extra_xp_or_random_chests():
    free = baseline.scenario(**config())
    paid = baseline.scenario(**config(), season_premium=True)
    assert paid['season_xp'] == free['season_xp'] == 7420
    assert paid['reached_tier'] == free['reached_tier'] == 28
    for key in ('circuit_credits', 'flux_shards'):
        assert paid['sources']['premium_road_extra'][key] == 2 * free['sources']['free_road'][key]
        assert paid['sources']['victory_chests_expected'][key] == free['sources']['victory_chests_expected'][key]
    expected = baseline.totals(baseline.profile.SEASON_REWARD_TRACK[:28])
    assert free['sources']['free_road'] == expected


def test_unranked_ai_has_no_victory_crates_and_rounds_each_match_xp():
    ai = baseline.scenario(**config(), mode='unranked_ai')
    assert ai['season_xp'] == 28 * (2 * 20 + 2 * 12 + 135)
    assert ai['sources']['victory_chests_expected'] == {'circuit_credits': 0, 'flux_shards': 0}
    assert ai['weekly_eligible'] is False
    assert baseline.scenario(**config(), mode='arena_ai')['weekly_eligible'] is True


def test_ad_adds_only_paid_match_currency_and_xp():
    free = baseline.scenario(**config())
    ad = baseline.scenario(**config(), ad_wins=1)
    assert ad['season_xp'] - free['season_xp'] == 28 * baseline.progression.WIN_XP
    assert ad['sources']['victory_chests_expected'] == free['sources']['victory_chests_expected']
    assert ad['sources']['matches_and_ads']['circuit_credits'] - free['sources']['matches_and_ads']['circuit_credits'] == 28 * 35


def test_planning_rewards_have_disjoint_cosmetics_and_arena_one_modules():
    report = baseline.build_report()
    weeks = report['s1_proposal']['weekly']
    assert len(weeks) == 4 and [w['reward_kind'] for w in weeks] == ['resource_only'] * 3 + ['cosmetic_set']
    assert sum(baseline.totals(w['prizes'])['module_shards'] for w in weeks) == 234
    ids = [i for placement in report['s1_proposal']['cosmetics'] for i in placement['items']]
    assert len(ids) == len(set(ids)) == 6
    for week in weeks[:3]:
        for reward in week['prizes']:
            assert reward['module_definition_id'] in baseline.canon.unlocked_module_ids(0)
            assert not any(k in reward for k in ('avatar_id', 'avatar_frame_id', 'profile_background_id', 'emoji_id'))


def test_actual_tier_claims_do_not_create_the_tagged_extra_chest(monkeypatch):
    p = baseline.profile
    monkeypatch.setattr(p, 'launch_status', lambda *a, **kw: {'active': True, 'starts_at': '2026-11-30T00:00:00Z'})
    season = dict(id='budget-test', active=True, starts_at='2026-11-30T00:00:00Z', ends_at='2026-12-28T00:00:00Z')
    monkeypatch.setattr(p, 'season_descriptor', lambda *a: season)
    service = p.PlayerProfileService(now_func=lambda: datetime(2026, 11, 30, tzinfo=timezone.utc))
    player = service.get_or_create('budget-test-player')
    player.active_meta_season_id = season['id']
    player.season_xp = p.SEASON_REWARD_TRACK[-1]['required_xp']
    player.season_premium_pass_season_id = season['id']
    before = (player.circuit_credits, len(player.chest_slots), len(player.reward_inbox))
    service.claim_season_tier(player.player_id, 40)
    service.claim_premium_season_tier(player.player_id, 40)
    assert player.circuit_credits - before[0] == 3 * p.SEASON_REWARD_TRACK[-1]['circuit_credits']
    assert len(player.chest_slots) == before[1] and len(player.reward_inbox) == before[2]


def test_invalid_scenario_cannot_imply_rewards_from_neutral_battles():
    with pytest.raises(ValueError):
        baseline.scenario(**config(), mode='friend_battle')
