import pytest
from fastapi import HTTPException

from app import main as gateway
from app.player_data_store import InMemoryPlayerDataRepository
from app.team_service import (
    InMemoryTeamRepository,
    TEAM_DESCRIPTION_MAX_LENGTH,
    TeamService,
    TeamServiceError,
)


def test_team_stores_description_and_trophy_requirement():
    service = TeamService(InMemoryTeamRepository())

    created = service.create_team(
        "alpha",
        "Akım Birliği",
        "create",
        description="  Her   akşam turnuva  ",
        min_trophies=300,
    )

    assert created["team"]["description"] == "Her akşam turnuva"
    assert created["team"]["min_trophies"] == 300
    with pytest.raises(TeamServiceError, match="en fazla"):
        service.create_team("beta", "Uzun", "long", description="x" * (TEAM_DESCRIPTION_MAX_LENGTH + 1))
    with pytest.raises(TeamServiceError, match="Kupa şartı"):
        service.create_team("beta", "Şartlı", "odd", min_trophies=123)


def test_name_only_creation_keeps_the_legacy_receipt_fingerprint():
    service = TeamService(InMemoryTeamRepository())

    first = service.create_team("alpha", "Grid", "same-request")
    replay = service.create_team("alpha", "Grid", "same-request", description="", min_trophies=0)

    assert replay["replayed"] is True
    assert replay["team_id"] == first["team_id"]


def test_application_respects_trophy_requirement_and_can_be_withdrawn():
    service = TeamService(InMemoryTeamRepository())
    team_id = service.create_team("alpha", "Seçkinler", "create", min_trophies=600)["team_id"]

    with pytest.raises(TeamServiceError, match="en az 600 kupa"):
        service.join_team("beta", team_id, "join-low", trophies=599)
    applied = service.join_team("beta", team_id, "join-ok", trophies=600)
    assert applied["application_pending"] is True
    assert service.get_team(team_id)["application_ids"] == ["beta"]

    withdrawn = service.withdraw_application("beta", team_id, "withdraw")
    replay = service.withdraw_application("beta", team_id, "withdraw")
    assert withdrawn["withdrawn"] is True
    assert replay["replayed"] is True
    assert service.get_team(team_id)["application_ids"] == []
    with pytest.raises(TeamServiceError, match="Bekleyen takım başvurusu"):
        service.withdraw_application("beta", team_id, "withdraw-again")
    # Geri çekilen başvurudan sonra başka takıma başvurulabilir.
    other = service.create_team("gamma", "Diğer", "create-other")["team_id"]
    assert service.join_team("beta", other, "join-other", trophies=0)["application_pending"] is True


@pytest.fixture
def team_gateway(monkeypatch):
    players = [f"team-directory-{index}" for index in range(4)]
    repository = InMemoryPlayerDataRepository()
    service = TeamService(InMemoryTeamRepository())
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "team_service", service)

    def forget():
        for player_id in players:
            gateway.player_profile_service._profiles.pop(player_id, None)
            gateway.player_statistics_service._statistics.pop(player_id, None)
            gateway.player_settings_service._settings.pop(player_id, None)

    forget()
    try:
        profiles = [gateway.player_profile_service.get_or_create(player_id) for player_id in players]
        # Yeni hesabın kredisi kurma bedeline yetmez; kurucu testlerde ayrıca fonlanır.
        for profile in profiles:
            profile.circuit_credits = gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS
        yield profiles, service
    finally:
        forget()


def test_a_new_account_cannot_afford_a_team():
    from app.player_profile import PlayerProfileService

    assert gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS == 3000
    starter = PlayerProfileService().get_or_create("team-fee-starter")
    assert starter.circuit_credits < gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS


def test_creating_a_team_charges_the_fee_once(team_gateway):
    (alpha, beta, *_), service = team_gateway
    cost = gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS
    alpha.circuit_credits = cost + 40
    request = gateway.TeamCreateRequest(
        player_id=alpha.player_id,
        name="Bedelli",
        request_id="paid-create",
        description="Haftalık turnuva takımı",
        min_trophies=100,
    )

    created = gateway.create_team(request)
    replay = gateway.create_team(request)

    assert created["joined"] is True
    assert created["description"] == "Haftalık turnuva takımı"
    assert created["min_trophies"] == 100
    assert replay["replayed"] is True
    assert alpha.circuit_credits == 40

    beta.circuit_credits = cost - 1
    with pytest.raises(HTTPException, match="Devre Kredisi gerekli"):
        gateway.create_team(gateway.TeamCreateRequest(
            player_id=beta.player_id,
            name="Parasız",
            request_id="poor-create",
        ))
    assert beta.circuit_credits == cost - 1
    assert service.team_for_player(beta.player_id) is None


def test_replayed_creation_is_answered_from_the_receipt_after_the_founder_left(team_gateway):
    (alpha, *_), service = team_gateway
    request = gateway.TeamCreateRequest(
        player_id=alpha.player_id, name="Ayrılan", request_id="create-then-leave",
    )
    team_id = gateway.create_team(request)["team_id"]
    gateway.leave_team(team_id, gateway.TeamActionRequest(
        player_id=alpha.player_id, request_id="leave",
    ))
    assert alpha.circuit_credits == 0

    # Kredisi kalmayan, takımsız kurucunun yinelenen isteği reddedilmez ve
    # yeniden takım kurmaz.
    replay = gateway.create_team(request)

    assert replay["replayed"] is True
    assert alpha.circuit_credits == 0
    assert service.team_for_player(alpha.player_id) is None
    # Yeni bir istek ise bedeli ister.
    with pytest.raises(HTTPException, match="Devre Kredisi gerekli"):
        gateway.create_team(gateway.TeamCreateRequest(
            player_id=alpha.player_id, name="Yeni", request_id="create-again",
        ))


def test_lobby_lists_full_teams_and_marks_the_pending_application(team_gateway):
    (alpha, beta, gamma, delta), service = team_gateway
    alpha.rating, beta.rating, gamma.rating = 100, 900, 50
    small = gateway.create_team(gateway.TeamCreateRequest(
        player_id=alpha.player_id, name="Küçük", request_id="create-small",
    ))["team_id"]
    big = gateway.create_team(gateway.TeamCreateRequest(
        player_id=beta.player_id, name="Büyük", request_id="create-big", min_trophies=300,
    ))["team_id"]
    # Kapasiteyi doldur: dolu takım listede kalır ama başvuruya kapalıdır.
    stored = service.repository.load()
    stored["teams"][small]["member_limit"] = 1
    service.repository.save(stored)

    lobby = gateway.get_player_team(gamma.player_id)

    assert lobby["joined"] is False
    assert [team["team_id"] for team in lobby["teams"]] == [big, small]
    assert {team["team_id"]: team["full"] for team in lobby["teams"]} == {big: False, small: True}
    assert [team["team_id"] for team in lobby["available_teams"]] == [big]
    assert lobby["creation"]["cost_circuit_credits"] == gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS
    assert lobby["viewer_trophies"] == 50

    with pytest.raises(HTTPException, match="en az 300 kupa"):
        gateway.join_team(big, gateway.TeamJoinRequest(player_id=gamma.player_id, request_id="join-low"))
    delta.rating = 400
    applied = gateway.join_team(big, gateway.TeamJoinRequest(player_id=delta.player_id, request_id="join-ok"))
    assert applied["application_pending"] is True
    assert applied["applied_team_id"] == big
    assert [team["team_id"] for team in applied["teams"]] == [big, small]

    withdrawn = gateway.withdraw_team_application(
        big, gateway.TeamJoinRequest(player_id=delta.player_id, request_id="withdraw"),
    )
    assert withdrawn["application_pending"] is False
    assert withdrawn["applied_team_id"] is None


def test_owner_inbox_reports_pending_team_applications(team_gateway):
    (alpha, beta, gamma, _delta), _service = team_gateway
    team_id = gateway.create_team(gateway.TeamCreateRequest(
        player_id=alpha.player_id, name="Bildirim", request_id="create-notify",
    ))["team_id"]
    gateway.join_team(team_id, gateway.TeamJoinRequest(player_id=beta.player_id, request_id="join-b"))
    gateway.join_team(team_id, gateway.TeamJoinRequest(player_id=gamma.player_id, request_id="join-g"))

    owner_inbox = gateway.get_reward_inbox(alpha.player_id)
    applicant_inbox = gateway.get_reward_inbox(beta.player_id)
    owner_view = gateway.get_player_team(alpha.player_id)

    assert owner_inbox["team"] == {"is_owner": True, "pending_applications": 2}
    assert applicant_inbox["team"] == {"is_owner": False, "pending_applications": 0}
    assert owner_view["pending_application_count"] == 2

    gateway.review_team_application(team_id, gateway.TeamApplicationActionRequest(
        player_id=alpha.player_id, applicant_id=beta.player_id, accept=True, request_id="accept-b",
    ))
    assert gateway.get_reward_inbox(alpha.player_id)["team"]["pending_applications"] == 1
    # Üye lider değildir; başvuru sayısı ona gösterilmez.
    assert gateway.get_reward_inbox(beta.player_id)["team"] == {"is_owner": False, "pending_applications": 0}
    assert gateway.get_player_team(beta.player_id)["pending_application_count"] == 0
