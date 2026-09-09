from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app import main as gateway
from app.meta_progression import CHEST_DEFINITIONS, MetaProgressionError, MetaProgressionService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import (
    PlayerProfileService,
    SEASON_REWARD_TRACK,
    operator_title_progression,
)
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


def test_free_season_road_has_40_steps_and_full_month_experience_curve():
    assert len(SEASON_REWARD_TRACK) == 40
    assert SEASON_REWARD_TRACK[0]["required_xp"] == 150
    assert SEASON_REWARD_TRACK[9]["required_xp"] == 1860
    assert SEASON_REWARD_TRACK[-1]["required_xp"] == 12240
    assert all(
        current["required_xp"] < following["required_xp"]
        for current, following in zip(SEASON_REWARD_TRACK, SEASON_REWARD_TRACK[1:])
    )
    assert [item["tier"] for item in SEASON_REWARD_TRACK if item["is_major"]] == [10, 20, 30, 40]
    assert all(item["season_xp_reward"] == 0 for item in SEASON_REWARD_TRACK)


def test_season_claim_spends_no_sxp_and_unlocks_major_cosmetic():
    service = PlayerProfileService()
    profile = service.record_battle_engagement(
        "season-player",
        season_xp_awarded=SEASON_REWARD_TRACK[9]["required_xp"],
        damage_dealt=0,
        circuit_actions=0,
    )
    credits_before = profile.circuit_credits

    claimed = service.claim_season_tier("season-player", 10)

    assert claimed.season_xp == SEASON_REWARD_TRACK[9]["required_xp"]
    assert claimed.circuit_credits > credits_before
    assert "circuit_scout" in claimed.unlocked_avatar_ids


def test_monthly_login_reward_resets_by_month_and_persists_real_currency_and_cards():
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    clock = [now]
    service = PlayerProfileService(now_func=lambda: clock[0])
    profile = service.get_or_create("monthly-login-player")
    credits_before = profile.circuit_credits

    receipt = service.claim_monthly_login(profile.player_id, 8)

    assert receipt["month"] == "2026-09"
    assert receipt["module_shards"] > 0
    assert profile.circuit_credits > credits_before
    assert profile.claimed_monthly_login_days == (8,)
    assert len(profile.engagement_view()["daily_login"]["rewards"]) == 30

    clock[0] = datetime(2026, 10, 1, tzinfo=timezone.utc)
    service.get_or_create(profile.player_id)
    assert profile.monthly_login_month == "2026-10"
    assert profile.claimed_monthly_login_days == ()
    assert len(profile.engagement_view()["daily_login"]["rewards"]) == 31


def test_operator_title_requires_both_trophies_and_wins():
    assert operator_title_progression(1200, 2)["current"]["title_tr"] == "Devre Çırağı"
    assert operator_title_progression(1200, 10)["current"]["title_tr"] == "İletken Ustası"


def test_cosmetic_selection_roundtrips_through_player_store():
    profiles = PlayerProfileService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=repository,
    )
    profile = profiles.get_or_create("cosmetic-player")
    profile.unlocked_avatar_ids = ("default", "circuit_scout")
    profile.unlocked_avatar_frame_ids = ("none", "neon_cyan")
    profile.monthly_login_month = "2026-09"
    profile.claimed_monthly_login_days = (1, 2, 8)
    profiles.set_cosmetics(
        profile.player_id,
        avatar_id="circuit_scout",
        avatar_frame_id="neon_cyan",
    )
    store.save_player(profile.player_id)
    profiles._profiles.clear()

    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    assert restored.selected_avatar_id == "circuit_scout"
    assert restored.selected_avatar_frame_id == "neon_cyan"
    assert restored.monthly_login_month == "2026-09"
    assert restored.claimed_monthly_login_days == (1, 2, 8)


def test_every_owned_chest_can_open_immediately_even_if_it_was_saved_with_a_timer():
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService().get_or_create("instant-chest-player")
    profile.chest_slots = [{
        "chest_id": "legacy-timed-chest",
        "definition_id": "field_3h",
        "unlocks_at": (now + timedelta(hours=3)).isoformat(),
    }]

    receipt = service.open_chest(profile, "legacy-timed-chest", "instant-open")

    assert receipt["rewards"]["circuit_credits"] > 0
    assert profile.chest_slots == []


def test_daily_gift_endpoint_opens_and_persists_reward_in_one_request(monkeypatch):
    player_id = "instant-gift-endpoint-player"
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    gateway.player_profile_service._profiles.pop(player_id, None)
    gateway.player_statistics_service._statistics.pop(player_id, None)
    gateway.player_settings_service._settings.pop(player_id, None)
    client = TestClient(gateway.app)

    response = client.post(
        f"/profile/{player_id}/meta-progression/chests/gifts/field_3h/claim",
        json={"request_id": "instant-gift-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["receipt"]["rewards"]["circuit_credits"] > 0
    assert payload["meta_progression"]["chests"]["slots"] == []
    assert repository.load(player_id) is not None


def test_gift_chests_use_the_requested_server_cooldowns_and_reopen_after_expiry():
    expected_hours = {
        "field_3h": 3,
        "circuit_8h": 8,
        "core_24h": 16,
        "diamond_24h": 24,
    }
    assert {
        definition_id: definition["claim_cooldown_hours"]
        for definition_id, definition in CHEST_DEFINITIONS.items()
    } == expected_hours

    for definition_id, hours in expected_hours.items():
        clock = [datetime(2026, 9, 8, tzinfo=timezone.utc)]
        service = MetaProgressionService(now_func=lambda: clock[0])
        profile = PlayerProfileService().get_or_create(f"cooldown-{definition_id}")

        first = service.claim_and_open_gift_chest(
            profile,
            definition_id,
            f"{definition_id}-first",
        )
        replay = service.claim_and_open_gift_chest(
            profile,
            definition_id,
            f"{definition_id}-first",
        )
        assert replay == first
        assert profile.chest_slots == []

        view = service.view(profile)
        definition_view = next(
            item
            for item in view["chests"]["definitions"]
            if item["id"] == definition_id
        )
        assert definition_view["claim_available"] is False
        assert definition_view["claim_remaining_seconds"] == hours * 3600

        try:
            service.claim_and_open_gift_chest(
                profile,
                definition_id,
                f"{definition_id}-too-soon",
            )
        except MetaProgressionError:
            pass
        else:
            raise AssertionError("Cooldown dolmadan ikinci sandık açıldı.")

        clock[0] += timedelta(hours=hours, seconds=1)
        second = service.claim_and_open_gift_chest(
            profile,
            definition_id,
            f"{definition_id}-second",
        )
        assert second["definition_id"] == definition_id
        assert profile.chest_slots == []


def test_instant_shop_gift_does_not_fail_when_battle_chest_slots_are_full():
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService().get_or_create("full-slots-gift-player")
    profile.chest_slots = [
        {
            "chest_id": f"battle-{index}",
            "definition_id": "field_3h",
            "name_tr": "Bronz Sandık",
            "source_battle_id": f"battle-{index}",
            "awarded_at": now.isoformat(),
            "unlocks_at": now.isoformat(),
        }
        for index in range(4)
    ]

    receipt = service.claim_and_open_gift_chest(
        profile,
        "diamond_24h",
        "full-slot-diamond",
    )

    assert receipt["rewards"]["circuit_credits"] > 0
    assert [item["chest_id"] for item in profile.chest_slots] == [
        "battle-0", "battle-1", "battle-2", "battle-3"
    ]


def test_season_chest_tier_opens_real_chest_and_persists_reward(monkeypatch):
    player_id = "season-chest-endpoint-player"
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    gateway.player_profile_service._profiles.pop(player_id, None)
    gateway.player_statistics_service._statistics.pop(player_id, None)
    gateway.player_settings_service._settings.pop(player_id, None)
    profile = gateway.player_profile_service.get_or_create(player_id)
    profile.season_xp = SEASON_REWARD_TRACK[9]["required_xp"]
    client = TestClient(gateway.app)

    response = client.post(f"/profile/{player_id}/engagement/tiers/10/claim")

    assert response.status_code == 200
    payload = response.json()
    assert payload["season_chest_receipt"]["definition_id"] == "core_24h"
    assert payload["season_chest_receipt"]["rewards"]["circuit_credits"] > 0
    assert profile.chest_slots == []
    assert repository.load(player_id) is not None
