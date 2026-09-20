from datetime import datetime, timezone

import pytest

from app.game.engine import BattleEngine
from app.game.models import BattleState, BattleStatus
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_progression import PlayerProgressionService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.season_competition import build_events_view


def _periods() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    return f"{iso_year}-W{iso_week:02d}", f"{now.year}-{now.month:02d}"


def _finished_state(
    battle_id: str,
    match_type: str,
    *,
    winner: str = "a",
) -> BattleState:
    state = BattleState(
        battle_id=battle_id,
        match_type=match_type,
        ranked_eligible=match_type in {"arena_ai", "ranked_pvp"},
    )
    engine = BattleEngine(state)
    for player_id in ("a", "b"):
        engine.add_player(player_id)
    state.status = BattleStatus.FINISHED
    state.winner_player_id = winner
    state.loser_player_id = "b" if winner == "a" else "a"
    state.finish_reason = "core_destroyed"
    state.finished_at_ms = 120_000
    state.result_summary = {
        "a": {"damage_dealt": 900},
        "b": {"damage_dealt": 450},
    }
    return state


def _normal_profile_snapshot(profile) -> dict:
    return {
        "rating": profile.rating,
        "highest_rating": profile.highest_rating,
        "experience": profile.experience,
        "season_xp": profile.season_xp,
        "circuit_credits": profile.circuit_credits,
        "core_skill_points": profile.core_skill_points,
        "lifetime_stats": dict(profile.lifetime_stats),
        "daily_mission_progress": dict(profile.daily_mission_progress),
        "chest_slots": [dict(item) for item in profile.chest_slots],
    }


@pytest.mark.parametrize("match_type", ("friend_battle", "team_training"))
def test_training_modes_are_completely_profile_neutral(match_type):
    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    statistics = PlayerStatisticsService()
    profile = profiles.get_or_create("a")
    profile.rating = 1_240
    profile.highest_rating = 1_300
    profile.experience = 75
    profile.season_xp = 210
    profile.circuit_credits = 480
    profile.lifetime_stats = {"matches": 4, "wins": 3}
    before = _normal_profile_snapshot(profile)
    state = _finished_state(f"neutral-{match_type}", match_type)

    assert progression.process_finished_battle(state) is True
    assert statistics.process_finished_battle(state) is True

    assert _normal_profile_snapshot(profile) == before
    assert statistics.get_or_create("a").total_matches == 0
    result = progression.player_result(state.battle_id, "a")
    assert result["rating_delta"] == 0
    assert result["xp_awarded"] == 0
    assert result["season_xp_awarded"] == 0
    assert result["circuit_credits_awarded"] == 0
    assert result["chest_awarded"] is None
    assert result["profile_progression_applied"] is False


def test_team_tournament_only_awards_its_own_win_point():
    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    statistics = PlayerStatisticsService()
    profile = profiles.get_or_create("a")
    profile.rating = 1_100
    profile.experience = 45
    profile.season_xp = 160
    profile.circuit_credits = 390
    profile.lifetime_stats = {"matches": 7, "wins": 4}
    before = _normal_profile_snapshot(profile)
    state = _finished_state("team-tournament-win", "team_tournament")

    progression.process_finished_battle(state)
    statistics.process_finished_battle(state)

    _, month = _periods()
    assert _normal_profile_snapshot(profile) == before
    assert statistics.get_or_create("a").total_matches == 0
    assert profile.team_tournament_period == month
    assert profile.team_tournament_matches == 1
    assert profile.team_tournament_wins == 1
    assert profile.team_tournament_contribution_points == 1
    result = progression.player_result(state.battle_id, "a")
    assert result["rating_delta"] == 0
    assert result["xp_awarded"] == 0
    assert result["circuit_credits_awarded"] == 0
    assert result["chest_awarded"] is None
    assert result["profile_progression_applied"] is False
    assert result["team_tournament_points_awarded"] == 1
    assert result["team_tournament_points_after"] == 1


@pytest.mark.parametrize("ranked_match_type", ("ranked_pvp", "arena_ai"))
def test_weekly_tournament_counts_only_positive_ranked_pvp_trophies(
    ranked_match_type,
):
    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    week, _ = _periods()
    winner = profiles.get_or_create("a")
    winner.weekly_tournament_registered_period = week

    ranked = _finished_state(f"weekly-{ranked_match_type}", ranked_match_type)
    progression.process_finished_battle(ranked)
    trophies_after_ranked = winner.weekly_tournament_trophies_earned

    progression.process_finished_battle(
        _finished_state(f"weekly-friend-{ranked_match_type}", "friend_battle")
    )
    progression.process_finished_battle(
        _finished_state(f"weekly-team-{ranked_match_type}", "team_tournament")
    )

    assert winner.weekly_tournament_period == week
    assert winner.weekly_tournament_matches == 1
    assert winner.weekly_tournament_wins == 1
    assert trophies_after_ranked > 0
    assert winner.weekly_tournament_trophies_earned == trophies_after_ranked


def test_team_standings_read_explicit_contribution_points():
    moment = datetime(2026, 9, 19, 12, tzinfo=timezone.utc)
    events = build_events_view(
        [
            {
                "player_id": "p1",
                "display_name": "Kesici",
                "rating": 800,
                "team_id": "team-1",
                "team_name": "Kesici Takımı",
                "is_bot": False,
                "team_registered_period": "2026-09",
                "team_tournament_period": "2026-09",
                "team_tournament_matches": 6,
                "team_tournament_wins": 5,
                "team_tournament_points": 3,
            }
        ],
        moment,
    )

    member = events["team_tournament"]["standings"][0]["members"][0]
    assert member["wins"] == 5
    assert member["contribution_points"] == 3
    assert member["reward_eligible"] is False


def test_team_tournament_points_roundtrip_in_player_snapshot():
    profiles = PlayerProfileService()
    statistics = PlayerStatisticsService()
    settings = PlayerSettingsService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=statistics,
        settings_service=settings,
        repository=repository,
    )
    profile = profiles.get_or_create("a")
    profile.team_tournament_contribution_points = 4

    store.save_player("a")
    profiles._profiles.clear()
    restored = store.load_player("a")

    assert restored.profile["meta_progression_state"][
        "team_tournament_contribution_points"
    ] == 4
    assert profiles.get("a").team_tournament_contribution_points == 4
