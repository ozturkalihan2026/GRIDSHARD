from datetime import datetime, timedelta, timezone

from app.meta_progression import MetaProgressionService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService, SEASON_REWARD_TRACK
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


def _store(profiles: PlayerProfileService) -> PlayerDataStoreService:
    return PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=InMemoryPlayerDataRepository(),
    )


def test_notification_chain_is_section_scoped_and_survives_reload():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    profiles = PlayerProfileService(now_func=lambda: now)
    profile = profiles.get_or_create("notification-player")
    profile.season_xp = SEASON_REWARD_TRACK[9]["required_xp"]
    profile.unlocked_avatar_ids = ("default", "circuit_scout")

    notifications = profile.engagement_view()["notifications"]
    assert notifications == {
        "profile": False,
        "rewards": True,
        "daily": True,
        "daily_login": True,
        "daily_missions": False,
        "season": True,
        "avatar": True,
        "unseen_keys": notifications["unseen_keys"],
    }

    profiles.mark_notifications_seen(profile.player_id, "daily")
    after_daily = profile.engagement_view()["notifications"]
    assert after_daily["daily"] is False
    assert after_daily["season"] is True
    assert after_daily["avatar"] is True
    assert after_daily["profile"] is False

    store = _store(profiles)
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)

    assert restored.seen_notification_keys == profile.seen_notification_keys
    assert restored.engagement_view()["notifications"]["daily"] is False
    assert restored.engagement_view()["notifications"]["season"] is True


def test_login_and_mission_notifications_are_acknowledged_independently():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    profiles = PlayerProfileService(now_func=lambda: now)
    profile = profiles.get_or_create("notification-split-player")
    mission = profile.engagement_view()["daily_missions"][0]
    profile.daily_mission_progress[mission["id"]] = mission["target"]

    before = profile.engagement_view()["notifications"]
    assert before["daily_login"] is True
    assert before["daily_missions"] is True

    profiles.mark_notifications_seen(profile.player_id, "daily-login")
    after_login = profile.engagement_view()["notifications"]
    assert after_login["daily_login"] is False
    assert after_login["daily_missions"] is True

    profiles.mark_notifications_seen(profile.player_id, "daily-missions")
    after_missions = profile.engagement_view()["notifications"]
    assert after_missions["daily"] is False


def test_claimed_reward_disappears_without_clearing_other_notification_sections():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    profiles = PlayerProfileService(now_func=lambda: now)
    profile = profiles.get_or_create("notification-claim-player")
    profile.season_xp = SEASON_REWARD_TRACK[0]["required_xp"]
    profile.unlocked_avatar_frame_ids = ("none", "neon_cyan")

    profiles.claim_monthly_login(profile.player_id, 10, "notification-login")
    notifications = profile.engagement_view()["notifications"]

    assert notifications["daily"] is False
    assert notifications["season"] is True
    assert notifications["avatar"] is True


def test_chest_inventory_groups_counts_and_bulk_open_respects_unlock_time():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    meta = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService(now_func=lambda: now).get_or_create(
        "bulk-chest-player"
    )
    profile.chest_slots = [
        {
            "chest_id": "ready-bronze",
            "definition_id": "field_3h",
            "awarded_at": (now - timedelta(hours=1)).isoformat(),
            "unlocks_at": now.isoformat(),
        },
        {
            "chest_id": "locked-bronze",
            "definition_id": "field_3h",
            "awarded_at": now.isoformat(),
            "unlocks_at": (now + timedelta(hours=2)).isoformat(),
        },
    ]

    bronze = next(
        item
        for item in meta.view(profile)["chests"]["inventory"]
        if item["definition_id"] == "field_3h"
    )
    assert bronze["count"] == 2
    assert bronze["openable_count"] == 1
    assert bronze["locked_count"] == 1

    batch = meta.open_all_available_chests(
        profile,
        "field_3h",
        "bulk-open-bronze",
    )
    replay = meta.open_all_available_chests(
        profile,
        "field_3h",
        "bulk-open-bronze",
    )

    assert replay == batch
    assert batch["opened_count"] == 1
    assert batch["remaining_count"] == 1
    assert [item["chest_id"] for item in profile.chest_slots] == [
        "locked-bronze"
    ]
    assert len(profile.chest_receipts) == 1


def test_partial_bulk_open_keeps_completed_receipts_and_failed_inventory():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    meta = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService(now_func=lambda: now).get_or_create(
        "partial-bulk-player"
    )
    profile.chest_slots = [
        {
            "chest_id": "valid-silver",
            "definition_id": "circuit_8h",
            "awarded_at": now.isoformat(),
            "unlocks_at": now.isoformat(),
        },
        {
            "definition_id": "circuit_8h",
            "awarded_at": now.isoformat(),
            "unlocks_at": now.isoformat(),
        },
    ]

    batch = meta.open_all_available_chests(
        profile,
        "circuit_8h",
        "partial-open-silver",
    )

    assert batch["partial"] is True
    assert batch["opened_count"] == 1
    assert batch["remaining_count"] == 1
    assert batch["errors"]
    assert profile.chest_slots == [{
        "definition_id": "circuit_8h",
        "awarded_at": now.isoformat(),
        "unlocks_at": now.isoformat(),
    }]
    assert profile.chest_receipts[
        "partial-open-silver:valid-silver"
    ]["chest_id"] == "valid-silver"
    assert profile.chest_batch_receipts["partial-open-silver"] == batch
