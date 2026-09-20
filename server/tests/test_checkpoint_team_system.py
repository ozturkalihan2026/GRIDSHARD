from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app import main as gateway
from app.player_data_store import InMemoryPlayerDataRepository
from app.team_service import (
    InMemoryTeamRepository,
    JsonTeamRepository,
    TeamService,
    TeamServiceError,
)


def test_team_state_persists_and_membership_operations_are_idempotent(tmp_path):
    repository = JsonTeamRepository(tmp_path / "teams.json")
    service = TeamService(repository)

    created = service.create_team("alpha", "Akım Birliği", "create-once")
    replay = service.create_team("alpha", "Akım Birliği", "create-once")
    application = service.join_team("beta", created["team_id"], "join-once")
    joined = service.review_application(
        team_id=created["team_id"],
        owner_id="alpha",
        applicant_id="beta",
        accept=True,
        request_id="accept-once",
    )

    assert replay["replayed"] is True
    assert application["application_pending"] is True
    assert joined["team"]["member_ids"] == ["alpha", "beta"]
    assert TeamService(repository).team_for_player("beta")["name"] == "Akım Birliği"


def test_module_requests_allow_one_module_per_week_and_rarity_amounts():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    service = TeamService(InMemoryTeamRepository(), now_func=lambda: now)
    team_id = service.create_team("alpha", "Grid", "create")["team_id"]
    service.join_team("beta", team_id, "join")
    service.review_application(
        team_id=team_id,
        owner_id="alpha",
        applicant_id="beta",
        accept=True,
        request_id="accept",
    )

    created_request = service.create_module_request(
        team_id=team_id,
        player_id="alpha",
        module_id="laser",
        rarity="common",
        request_id="request-common",
    )
    assert created_request["module_request"]["requested_amount"] == 4
    assert created_request["weekly_limit"] == 1

    with pytest.raises(TeamServiceError, match="Bu hafta zaten"):
        service.create_module_request(
            team_id=team_id,
            player_id="alpha",
            module_id="emp",
            rarity="rare",
            request_id="request-over-limit",
        )

    module_request_id = created_request["module_request"]["request_id"]
    donation = service.donate_module_shard(
        team_id=team_id,
        player_id="beta",
        module_request_id=module_request_id,
        request_id="donate-once",
        available_amount=1,
    )
    replay = service.donate_module_shard(
        team_id=team_id,
        player_id="beta",
        module_request_id=module_request_id,
        request_id="donate-once",
        available_amount=0,
    )

    assert donation["amount"] == 1
    assert replay["replayed"] is True
    stored = service.get_team(team_id)["module_requests"][0]
    assert stored["donated_amount"] == 1
    assert stored["donors"] == {"beta": 1}


def test_chat_is_moderation_ready_and_training_is_explicitly_unranked():
    service = TeamService(InMemoryTeamRepository())
    team_id = service.create_team("alpha", "Grid", "create")["team_id"]
    service.join_team("beta", team_id, "join")
    service.review_application(
        team_id=team_id,
        owner_id="alpha",
        applicant_id="beta",
        accept=True,
        request_id="accept-member",
    )

    message = service.post_message(
        team_id=team_id,
        player_id="alpha",
        message="Hazır mısın?",
        request_id="message",
    )["message"]
    challenge = service.create_training_challenge(
        team_id=team_id,
        player_id="alpha",
        opponent_id="beta",
        request_id="training",
    )["challenge"]
    accepted = service.accept_training_challenge(
        team_id=team_id,
        player_id="beta",
        challenge_id=challenge["challenge_id"],
        request_id="accept",
    )["challenge"]

    assert message["moderation_status"] == "pending"
    assert message["visibility"] == "visible"
    assert message["reports"] == []
    assert accepted["protocol"] == "team_training_v1"
    assert accepted["match_type"] == "team_training"
    assert accepted["ranked"] is False
    assert accepted["rewards_enabled"] is False
    assert accepted["status"] == "accepted"


def test_gateway_team_view_sorts_trophies_and_transfers_one_unlocked_shard(monkeypatch):
    profiles = ("checkpoint-team-alpha", "checkpoint-team-beta")
    player_repository = InMemoryPlayerDataRepository()
    team_service = TeamService(InMemoryTeamRepository())
    monkeypatch.setattr(gateway, "player_data_repository", player_repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", player_repository)
    monkeypatch.setattr(gateway, "team_service", team_service)

    for player_id in profiles:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)

    try:
        alpha = gateway.player_profile_service.get_or_create(profiles[0])
        beta = gateway.player_profile_service.get_or_create(profiles[1])
        alpha.rating = 100
        beta.rating = 900
        beta.module_shards["laser"] = 2

        created = gateway.create_team(gateway.TeamCreateRequest(
            player_id=alpha.player_id,
            name="Checkpoint Grid",
            request_id="gateway-create",
        ))
        gateway.join_team(created["team_id"], gateway.TeamJoinRequest(
            player_id=beta.player_id,
            request_id="gateway-join",
        ))
        gateway.review_team_application(
            created["team_id"],
            gateway.TeamApplicationActionRequest(
                player_id=alpha.player_id,
                applicant_id=beta.player_id,
                accept=True,
                request_id="gateway-accept",
            ),
        )
        view = gateway.get_player_team(alpha.player_id)

        assert [member["player_id"] for member in view["members"]] == [
            beta.player_id,
            alpha.player_id,
        ]
        assert view["total_trophies"] == 1000

        with pytest.raises(HTTPException, match="açılmış"):
            gateway.create_team_module_request(
                created["team_id"],
                gateway.TeamModuleRequest(
                    player_id=alpha.player_id,
                    module_id="quantum_cannon",
                    request_id="locked-module",
                ),
            )

        requested = gateway.create_team_module_request(
            created["team_id"],
            gateway.TeamModuleRequest(
                player_id=alpha.player_id,
                module_id="laser",
                request_id="laser-request",
            ),
        )
        request_id = requested["operation"]["module_request"]["request_id"]
        action = gateway.TeamActionRequest(
            player_id=beta.player_id,
            request_id="gateway-donate",
        )
        gateway.donate_team_module_shard(created["team_id"], request_id, action)
        gateway.donate_team_module_shard(created["team_id"], request_id, action)

        assert beta.module_shards["laser"] == 1
        assert alpha.module_shards["laser"] == 1
        assert team_service.get_team(created["team_id"])["module_requests"][0]["donated_amount"] == 1
    finally:
        for player_id in profiles:
            gateway.player_profile_service._profiles.pop(player_id, None)
            gateway.player_statistics_service._statistics.pop(player_id, None)
            gateway.player_settings_service._settings.pop(player_id, None)
