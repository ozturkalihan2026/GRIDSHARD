from datetime import datetime, timezone

from app import main as gateway
from app.game.pvp_session import PvPSessionService
from app.matchmaking import MatchmakingPair
from app.player_data_store import InMemoryPlayerDataRepository
from app.season_competition import LEADERBOARD_PRIZES, build_events_view


class _TelemetryStub:
    def record_now(self, **_payload):
        return None


def _clear_players(*player_ids: str) -> None:
    for player_id in player_ids:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)


def test_registered_tournaments_expose_rich_prizes_and_live_player_pairing():
    moment = datetime(2026, 9, 19, 18, 5, tzinfo=timezone.utc)
    view = build_events_view(
        [
            {
                "player_id": "human-owner",
                "display_name": "İnsan Lider",
                "rating": 750,
                "weekly_registered_period": "2026-W38",
                "weekly_period": "2026-W38",
                "weekly_matches": 3,
                "weekly_wins": 2,
                "weekly_trophies_earned": 31,
                "team_id": "human-team",
                "team_name": "İnsan Devresi",
                "team_registered_period": "2026-09",
                "is_bot": False,
            },
            {
                "player_id": "unregistered-human",
                "display_name": "Kayıtsız",
                "rating": 800,
                "is_bot": False,
            },
            {
                "player_id": "bot-rival",
                "display_name": "Bot Rakip",
                "rating": 740,
                "team_id": "bot-team",
                "team_name": "Bot Devresi",
                "is_bot": True,
            },
        ],
        moment,
    )

    weekly = view["weekly_tournament"]
    assert weekly["entry_fee"] == 100
    assert next(row for row in weekly["standings"] if row["player_id"] == "human-owner")["points"] == 31
    assert all(row["player_id"] != "unregistered-human" for row in weekly["standings"])
    assert weekly["prizes"][0]["avatar_id"]
    assert weekly["prizes"][0]["avatar_frame_id"]
    assert weekly["prizes"][0]["emoji_id"]

    team = view["team_tournament"]
    assert team["registration_fee"] == 0
    assert team["schedule_status"] == "live"
    fixture = team["fixtures"][0]
    assert fixture["status"] == "live"
    assert fixture["scheduled_at"] == "2026-09-19T18:00:00Z"
    assert fixture["member_pairings"][0]["battle_session_id"].startswith("team-event-")
    assert team["prizes"][0]["team_avatar_id"]
    assert team["prizes"][0]["team_frame_id"]
    assert len({prize["chest_visual_id"] for prize in LEADERBOARD_PRIZES}) == 10


def test_friend_request_and_friend_battle_are_persisted_and_unranked(monkeypatch):
    left_id = "beta59-social-left"
    right_id = "beta59-social-right"
    repository = InMemoryPlayerDataRepository()
    pvp = PvPSessionService()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "pvp_service", pvp)
    _clear_players(left_id, right_id)

    try:
        gateway.player_profile_service.get_or_create(left_id).display_name = "Sol Oyuncu"
        gateway.player_profile_service.get_or_create(right_id).display_name = "Sağ Oyuncu"
        gateway.send_friend_request(
            left_id,
            gateway.FriendRequestOperation(
                player_id=left_id,
                target_player_id=right_id,
                request_id="friend-request",
            ),
        )
        gateway.accept_friend_request(
            right_id,
            gateway.FriendDecisionOperation(
                player_id=right_id,
                requester_id=left_id,
                request_id="friend-accept",
            ),
        )
        gateway.create_social_battle_invite(
            left_id,
            gateway.SocialBattleInviteOperation(
                player_id=left_id,
                opponent_id=right_id,
                request_id="battle-invite",
            ),
        )
        invite = gateway.get_social_view(right_id)["battle_invites"][0]
        accepted = gateway.accept_social_battle_invite(
            right_id,
            invite["invite_id"],
            gateway.EventRegistrationOperation(
                player_id=right_id,
                request_id="battle-accept",
            ),
        )

        assert right_id in gateway.player_profile_service.get(left_id).friend_ids
        assert left_id in gateway.player_profile_service.get(right_id).friend_ids
        assert accepted["battle"]["ranked_eligible"] is False
        assert accepted["battle"]["rewards_enabled"] is False
        session = pvp.get_session(accepted["battle"]["session_id"])
        assert session.engine.state.match_type == "friend_battle"
        assert session.engine.state.ranked_eligible is False
        assert session.engine.state.normalized is True
        left_snapshot = repository.load(left_id)
        assert left_snapshot is not None
        assert right_id in left_snapshot.profile["meta_progression_state"]["friend_ids"]
    finally:
        _clear_players(left_id, right_id)


def test_matchmaking_ai_session_is_a_ranked_arena_battle(monkeypatch):
    player_id = "beta59-ranked-ai-player"
    session_id = "beta59-ranked-ai-session"
    pvp = PvPSessionService()
    monkeypatch.setattr(gateway, "pvp_service", pvp)
    monkeypatch.setattr(gateway, "telemetry_service", _TelemetryStub())
    _clear_players(player_id)

    try:
        gateway.player_profile_service.set_rating(player_id, 900)
        bot = dict(gateway.BOTS[0])
        pair = MatchmakingPair(
            match_id=session_id,
            player_a_id=player_id,
            player_b_id=str(bot["id"]),
            rating_difference=0,
            opponent_type="ai",
        )
        gateway._create_matchmaking_ai_session(pair, bot_override=bot)

        state = pvp.get_session(session_id).engine.state
        assert state.match_type == "arena_ai"
        assert state.ranked_eligible is True
    finally:
        _clear_players(player_id)
