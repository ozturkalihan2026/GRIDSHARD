from types import SimpleNamespace

from app import main as gateway
from app.player_data_store import InMemoryPlayerDataRepository
from app.season_competition import LEADERBOARD_PRIZES, TEAM_PRIZES, WEEKLY_PRIZES
from app.team_service import InMemoryTeamRepository, TeamService


def _clear_players(*player_ids: str) -> None:
    for player_id in player_ids:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)


def test_team_join_is_an_application_until_owner_accepts_it():
    service = TeamService(InMemoryTeamRepository())
    created = service.create_team("owner", "Başvuru Devresi", "create")
    team_id = created["team_id"]

    application = service.join_team("candidate", team_id, "apply")

    assert application["application_pending"] is True
    assert application["team"]["member_ids"] == ["owner"]
    assert application["team"]["application_ids"] == ["candidate"]
    assert service.team_for_player("candidate") is None

    accepted = service.review_application(
        team_id=team_id,
        owner_id="owner",
        applicant_id="candidate",
        accept=True,
        request_id="accept",
    )

    assert accepted["accepted"] is True
    assert accepted["team"]["application_ids"] == []
    assert accepted["team"]["member_ids"] == ["owner", "candidate"]
    assert service.team_for_player("candidate")["team_id"] == team_id


def test_member_can_leave_and_owner_exit_transfers_or_dissolves_team():
    service = TeamService(InMemoryTeamRepository())
    team_id = service.create_team("owner", "Ayrılma Devresi", "create-leave")["team_id"]
    for player_id in ("member-b", "member-a"):
        service.join_team(player_id, team_id, f"apply-{player_id}")
        service.review_application(
            team_id=team_id,
            owner_id="owner",
            applicant_id=player_id,
            accept=True,
            request_id=f"accept-{player_id}",
        )

    member_exit = service.leave_team(
        team_id=team_id,
        player_id="member-b",
        request_id="leave-member",
    )
    assert member_exit["dissolved"] is False
    assert service.team_for_player("member-b") is None

    owner_exit = service.leave_team(
        team_id=team_id,
        player_id="owner",
        request_id="leave-owner",
    )
    assert owner_exit["successor_id"] == "member-a"
    assert owner_exit["team"]["owner_id"] == "member-a"

    final_exit = service.leave_team(
        team_id=team_id,
        player_id="member-a",
        request_id="leave-final",
    )
    assert final_exit["dissolved"] is True
    assert service.list_teams() == []


def test_finished_battle_callback_closes_social_entries_by_battle_id(monkeypatch):
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        gateway.player_statistics_service,
        "process_finished_battle",
        lambda _state: None,
    )
    monkeypatch.setattr(
        gateway.player_progression_service,
        "process_finished_battle",
        lambda _state: None,
    )
    monkeypatch.setattr(
        gateway.telemetry_service,
        "ingest_finished_battle",
        lambda _state: None,
    )
    monkeypatch.setattr(
        gateway,
        "_complete_social_battle_invites",
        lambda battle_id: calls.append(("friend", battle_id)),
    )
    monkeypatch.setattr(
        gateway.team_service,
        "complete_training_challenge",
        lambda battle_id: calls.append(("team", battle_id)),
    )

    gateway.process_completed_pvp_battle(
        SimpleNamespace(
            battle_id="social-session-61",
            match_type="friend_battle",
            account_player_ids=(),
            players={},
        )
    )

    assert calls == [
        ("friend", "social-session-61"),
        ("team", "social-session-61"),
    ]


def test_weekly_reward_is_queued_once_and_claim_unlocks_inventory(monkeypatch):
    winner_id = "beta61-weekly-winner"
    runner_up_id = "beta61-weekly-runner-up"
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    _clear_players(winner_id, runner_up_id)

    try:
        winner = gateway.player_profile_service.get_or_create(winner_id)
        runner_up = gateway.player_profile_service.get_or_create(runner_up_id)
        for profile, trophies in ((winner, 91), (runner_up, 54)):
            profile.weekly_tournament_period = "2026-W01"
            profile.weekly_tournament_registered_period = "2026-W01"
            profile.weekly_tournament_trophies_earned = trophies
            profile.weekly_tournament_wins = trophies // 10

        before_credits = winner.circuit_credits
        first = gateway.get_reward_inbox(winner_id)
        second = gateway.get_reward_inbox(winner_id)

        assert first["unclaimed_count"] == 1
        assert len(second["messages"]) == 1
        message = first["messages"][0]
        assert message["source"] == "weekly_tournament"
        assert message["position"] == 1
        assert message["chest"]["chest_visual_id"] == "weekly_circuit_crown"

        claimed = gateway.claim_reward_inbox_item(
            winner_id,
            message["message_id"],
            gateway.MetaOperationRequest(request_id="claim-beta61-weekly"),
        )

        assert claimed["unclaimed_count"] == 0
        assert winner.circuit_credits == before_credits + WEEKLY_PRIZES[0]["circuit_credits"]
        assert WEEKLY_PRIZES[0]["avatar_id"] in winner.unlocked_avatar_ids
        assert WEEKLY_PRIZES[0]["avatar_frame_id"] in winner.unlocked_avatar_frame_ids
        assert WEEKLY_PRIZES[0]["emoji_id"] in winner.unlocked_battle_emoji_ids
        snapshot = repository.load(winner_id)
        assert snapshot is not None
        inbox = snapshot.profile["meta_progression_state"]["reward_inbox"]
        assert inbox[0]["status"] == "claimed"
    finally:
        _clear_players(winner_id, runner_up_id)


def test_ranked_and_tournament_chests_have_descending_distinct_contracts():
    assert len(LEADERBOARD_PRIZES) == 10
    assert [item["position"] for item in LEADERBOARD_PRIZES] == list(range(1, 11))
    assert [item["chest_tier"] for item in LEADERBOARD_PRIZES[:6]] == [
        "diamond", "gold", "gold", "silver", "silver", "bronze"
    ]
    assert all(item["universal_module_shards"] > 0 for item in LEADERBOARD_PRIZES)
    assert LEADERBOARD_PRIZES[0]["circuit_credits"] > LEADERBOARD_PRIZES[-1]["circuit_credits"]

    assert WEEKLY_PRIZES[0]["chest_visual_id"].startswith("weekly_")
    assert WEEKLY_PRIZES[0].get("emoji_id")
    assert not WEEKLY_PRIZES[1].get("emoji_id")
    assert not WEEKLY_PRIZES[2].get("emoji_id")
    assert not WEEKLY_PRIZES[2].get("avatar_frame_id")

    assert TEAM_PRIZES[0]["chest_visual_id"].startswith("team_")
    assert TEAM_PRIZES[0].get("team_avatar_id")
    assert TEAM_PRIZES[0].get("team_frame_id")
    assert TEAM_PRIZES[0].get("team_name_frame_id")
    assert TEAM_PRIZES[0].get("team_bar_background_id")
    assert not TEAM_PRIZES[2].get("team_frame_id")
