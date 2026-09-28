from datetime import datetime, timezone

import pytest

from app import main as gateway
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import (
    COSMETIC_UNLOCK_SOURCES,
    FREE_BATTLE_EMOJI_IDS,
    SEASON_REWARD_TRACK,
    PlayerProfileError,
)
from app.season_competition import LEADERBOARD_PRIZES, TEAM_PRIZES
from app.team_service import (
    InMemoryTeamRepository,
    TEAM_APPEARANCE_DEFAULTS,
    TeamService,
    TeamServiceError,
    team_appearance,
    team_appearance_unlocked,
)

LEADERBOARD_SPECIALS = {
    "unlocked_avatar_ids": {"season_champion", "season_finalist", "rank_spark"},
    "unlocked_avatar_frame_ids": {"season_crown", "season_silver", "frequency_cyan"},
    "unlocked_profile_background_ids": {"rank_crown", "rank_prism", "rank_frequency", "rank_relay"},
    "unlocked_battle_emoji_ids": {"victory_pulse", "respect_signal", "core_burst", "glitch_wave", "overload_flash"},
}


def _clear(*player_ids: str) -> None:
    for player_id in player_ids:
        gateway.player_profile_service._profiles.pop(player_id, None)


def test_leaderboard_specials_start_locked_and_are_not_on_the_season_road():
    profile = gateway.player_profile_service.get_or_create("beta72-cosmetic-fresh")
    try:
        for attribute, specials in LEADERBOARD_SPECIALS.items():
            assert not specials & set(getattr(profile, attribute))
        season_road_cosmetics = {
            reward[key]
            for reward in SEASON_REWARD_TRACK
            for key in ("avatar_id", "avatar_frame_id", "emoji_id")
            if reward.get(key)
        }
        leaderboard_cosmetics = {
            prize[key]
            for prize in LEADERBOARD_PRIZES
            for key in ("avatar_id", "avatar_frame_id", "emoji_id", "profile_background_id")
            if prize.get(key)
        }
        # Sıralama özel ödülleri sezon yolundan açılamaz.
        assert not season_road_cosmetics & leaderboard_cosmetics
        assert COSMETIC_UNLOCK_SOURCES["avatar_frame"]["season_crown"] == [
            {"kind": "leaderboard", "position": 1}
        ]
        with pytest.raises(PlayerProfileError):
            gateway.player_profile_service.set_cosmetics(
                profile.player_id, avatar_frame_id="season_crown"
            )
    finally:
        _clear("beta72-cosmetic-fresh")


def test_leaderboard_chest_claim_unlocks_its_special_cosmetics(monkeypatch):
    player_id = "beta72-leaderboard-winner"
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    _clear(player_id)
    try:
        profile = gateway.player_profile_service.get_or_create(player_id)
        prize = dict(LEADERBOARD_PRIZES[0])
        profile.reward_inbox.append({
            "message_id": "season_leaderboard:2026-08:" + player_id,
            "source": "season_leaderboard",
            "period_id": "2026-08",
            "position": 1,
            "status": "unclaimed",
            "chest": prize,
        })
        gateway.claim_reward_inbox_item(
            player_id,
            "season_leaderboard:2026-08:" + player_id,
            gateway.MetaOperationRequest(request_id="beta72-leaderboard-claim"),
        )
        assert prize["avatar_id"] in profile.unlocked_avatar_ids
        assert prize["avatar_frame_id"] == "season_crown"
        assert prize["avatar_frame_id"] in profile.unlocked_avatar_frame_ids
        assert prize["profile_background_id"] in profile.unlocked_profile_background_ids
        assert prize["emoji_id"] in profile.unlocked_battle_emoji_ids
        assert prize["badge_id"] in profile.unlocked_badge_ids
        assert prize["rank_trophy_id"] in profile.unlocked_rank_trophy_ids
        # Kazanılan özel ödül artık seçilebilir.
        gateway.player_profile_service.set_cosmetics(player_id, avatar_frame_id="season_crown")
        assert profile.selected_avatar_frame_id == "season_crown"
    finally:
        _clear(player_id)


def test_free_and_season_road_emojis_are_available_in_battle():
    profile = gateway.player_profile_service.get_or_create("beta72-emoji-player")
    try:
        assert profile.available_battle_emoji_ids == FREE_BATTLE_EMOJI_IDS
        view = profile.to_view()["cosmetics"]
        assert set(FREE_BATTLE_EMOJI_IDS) <= set(view["unlocked_battle_emoji_ids"])
        assert "none" not in view["unlocked_battle_emoji_ids"]
        gateway.player_profile_service.set_cosmetics(profile.player_id, battle_emoji_id="laugh")
        assert profile.selected_battle_emoji_id == "laugh"

        tier_five = next(reward for reward in SEASON_REWARD_TRACK if reward["tier"] == 5)
        assert tier_five["emoji_id"] == "fire"
        profile.season_xp = tier_five["required_xp"]
        gateway.player_profile_service.claim_season_tier(profile.player_id, 5)
        assert "fire" in profile.available_battle_emoji_ids
        with pytest.raises(PlayerProfileError):
            gateway.player_profile_service.set_cosmetics(profile.player_id, battle_emoji_id="crown")
    finally:
        _clear("beta72-emoji-player")


def test_team_appearance_starts_with_defaults_and_unlocks_from_tournaments():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    service = TeamService(InMemoryTeamRepository(), now_func=lambda: now)
    team_id = service.create_team("owner", "Relik Devresi", "create")["team_id"]
    cosmetics = service.get_team(team_id)["cosmetics"]

    assert team_appearance_unlocked(cosmetics) == {
        key: [value] for key, value in TEAM_APPEARANCE_DEFAULTS.items()
    }
    with pytest.raises(TeamServiceError, match="henüz açılmadı"):
        service.set_cosmetics(
            team_id=team_id,
            owner_id="owner",
            selections={"emblem_id": "crown"},
            request_id="locked-crown",
        )

    first = service.grant_reward_cosmetics(team_id, TEAM_PRIZES[0], grant_id="team_tournament:2026-08:" + team_id)
    replay = service.grant_reward_cosmetics(team_id, TEAM_PRIZES[0], grant_id="team_tournament:2026-08:" + team_id)
    assert first == {"emblem_id": "crown", "frame_id": "gold", "name_color_id": "gold"}
    # Aynı ödülü takımın diğer üyeleri de alır; takım başına bir kez açılır.
    assert replay == {}

    # Ertesi ay aynı sıra: ödül zaten açık olduğundan sıradaki kilitli seçenek açılır.
    second = service.grant_reward_cosmetics(team_id, TEAM_PRIZES[0], grant_id="team_tournament:2026-09:" + team_id)
    assert second == {"emblem_id": "star", "frame_id": "royal", "name_color_id": "violet"}

    service.set_cosmetics(
        team_id=team_id,
        owner_id="owner",
        selections={"emblem_id": "crown", "frame_id": "gold", "name_color_id": "gold"},
        request_id="crowned",
    )
    assert team_appearance(service.get_team(team_id)["cosmetics"]) == {
        "emblem_id": "crown", "frame_id": "gold", "name_color_id": "gold",
    }


def test_team_view_reports_unlocked_appearance_and_prize_sources(monkeypatch):
    service = TeamService(InMemoryTeamRepository())
    monkeypatch.setattr(gateway, "team_service", service)
    owner = gateway.player_profile_service.get_or_create("beta72-team-owner")
    try:
        created = gateway.create_team(gateway.TeamCreateRequest(
            player_id=owner.player_id, name="Görünüm Devresi", request_id="beta72-create",
        ))
        view = gateway.get_player_team(owner.player_id)
        assert view["appearance_unlocked"]["emblem_id"] == ["shield"]
        assert view["appearance_unlock_sources"]["emblem_id"] == {"crown": 1, "star": 2, "bolt": 3}
        assert created["team_id"] == view["team_id"]
    finally:
        _clear("beta72-team-owner")
