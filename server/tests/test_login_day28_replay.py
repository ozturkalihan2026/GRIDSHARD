"""The calendar's large day-28 reward is legitimate, and cannot be awarded twice."""
from copy import deepcopy
from datetime import datetime, timezone

import pytest

from app.player_profile import PlayerProfileError, PlayerProfileService, LOGIN_PERIOD_REWARDS


def balances(profile):
    return deepcopy((profile.circuit_credits, profile.flux_shards,
                     profile.module_shards, profile.core_shards_by_type))


def test_day28_reward_matches_preview_and_retries_cannot_duplicate_it():
    service = PlayerProfileService(now_func=lambda: datetime(2026, 10, 25, 7, tzinfo=timezone.utc))
    profile = service.get_or_create("calendar-day28-replay")
    # The last Sunday of the shared 28-day calendar, not a 28-login streak.
    assert profile.login_period_day == 28
    assert LOGIN_PERIOD_REWARDS[27]["module_shards"] == 42
    preview = profile.engagement_view()["daily_login"]["rewards"][27]
    before = balances(profile)
    receipt = service.claim_login_reward(profile.player_id, 28, "day28-original")
    module = receipt["module_definition_id"]
    assert receipt["module_shards"] == preview["module_shards"]
    assert receipt["module_definition_id"] == preview["module_definition_id"]
    assert profile.module_shards[module] - before[2][module] == receipt["module_shards"]
    awarded = balances(profile)
    assert service.claim_login_reward(profile.player_id, 28, "day28-original") == receipt
    assert balances(profile) == awarded
    for request in ("day28-another-request", None):
        with pytest.raises(PlayerProfileError, match="daha önce alındı"):
            service.claim_login_reward(profile.player_id, 28, request)
        assert balances(profile) == awarded
    for day in (27, 29):
        with pytest.raises(PlayerProfileError, match="bugünün"):
            service.claim_login_reward(profile.player_id, day, f"other-{day}")
        assert balances(profile) == awarded
