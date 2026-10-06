"""Ebeveyn denetimi: sosyal özellikleri şifreyle kapatma ve yeniden açma.

Karar ve gerekçe: docs/CHILD_AUDIENCE_AUDIT.md. Yetişkin, hesabın takım
sohbetini, özel mesajını ve arkadaşlık isteklerini 4 haneli bir şifreyle
kapatır. Karar sunucuda durur; istemcinin göndereceği hiçbir alan şifresiz
açamaz.
"""

import pytest
from fastapi import HTTPException

from app import main as gateway
from app.platform_services import PlatformService, PlatformServiceError
from app.player_data_store import InMemoryPlayerDataRepository
from app.team_service import InMemoryTeamRepository, TeamService


PIN = "4826"


class Clock:
    def __init__(self, now: int = 1000):
        self.now = now

    def __call__(self) -> int:
        return self.now


def make_platform(tmp_path, clock=None) -> PlatformService:
    return PlatformService(
        tmp_path / "platform.json",
        now_func=clock or Clock(),
        expose_codes=True,
        web_base_url="https://play.gridshard.test",
    )


# -- Şifre ve kilit ---------------------------------------------------------------

def test_social_features_are_open_until_an_adult_closes_them(tmp_path):
    platform = make_platform(tmp_path)

    assert platform.social_closed("child") is False
    assert platform.parental_view("child") == {"social_closed": False, "locked_until": 0}

    assert platform.close_social_features("child", PIN) == {"social_closed": True, "locked_until": 0}
    assert platform.social_closed("child") is True
    assert platform.social_closed("someone-else") is False
    with pytest.raises(PlatformServiceError, match="zaten kapalı"):
        platform.close_social_features("child", "0000")


@pytest.mark.parametrize("pin", ["", "123", "12345", "12a4", "١٢٣٤", None])
def test_the_pin_must_be_exactly_four_digits(tmp_path, pin):
    platform = make_platform(tmp_path)
    with pytest.raises(PlatformServiceError, match="4 rakam"):
        platform.close_social_features("child", pin)
    assert platform.social_closed("child") is False


def test_the_pin_is_never_stored_or_returned_in_plain_text(tmp_path):
    platform = make_platform(tmp_path)
    platform.close_social_features("child", PIN)

    stored = platform._read()["accounts"]["child"]["parental"]
    assert PIN not in str(stored)
    assert stored["pin_hash"] and stored["pin_salt"]
    for view in (platform.account_view("child"), platform.export_data("child"), platform.parental_view("child")):
        assert "pin" not in str(view)
    assert platform.account_view("child")["parental"] == {"social_closed": True, "locked_until": 0}
    assert platform.export_data("child")["account"]["parental_controls"] == {"social_closed": True}


def test_only_the_right_pin_reopens_and_repeated_guesses_lock(tmp_path):
    clock = Clock()
    platform = make_platform(tmp_path, clock)
    platform.close_social_features("child", PIN)

    for _attempt in range(PlatformService.PARENTAL_PIN_ATTEMPTS - 1):
        with pytest.raises(PlatformServiceError, match="yanlış"):
            platform.open_social_features("child", "0000")
    assert platform.parental_view("child")["locked_until"] == 0
    with pytest.raises(PlatformServiceError, match="yanlış"):
        platform.open_social_features("child", "0000")

    locked_until = platform.parental_view("child")["locked_until"]
    assert locked_until == clock.now + PlatformService.PARENTAL_LOCK_SECONDS
    # Kilitliyken doğru şifre de açmaz.
    with pytest.raises(PlatformServiceError, match="Çok fazla"):
        platform.open_social_features("child", PIN)
    assert platform.social_closed("child") is True

    clock.now = locked_until + 1
    assert platform.open_social_features("child", PIN) == {"social_closed": False, "locked_until": 0}
    assert platform.social_closed("child") is False
    assert "pin_hash" not in platform._read()["accounts"]["child"]["parental"]
    with pytest.raises(PlatformServiceError, match="zaten açık"):
        platform.open_social_features("child", PIN)


def test_closing_removes_the_players_outstanding_invite_codes(tmp_path):
    platform = make_platform(tmp_path)
    own = platform.create_invite("child")["code"]
    other = platform.create_invite("friend")["code"]

    platform.close_social_features("child", PIN)

    assert set(platform._read()["invites"]) == {other}
    with pytest.raises(PlatformServiceError):
        platform.accept_invite("friend", own)


# -- Sunucu kapısı -----------------------------------------------------------------

@pytest.fixture
def world(tmp_path, monkeypatch):
    """Üç oyuncu: child ve friend arkadaş ve aynı takımda, stranger yabancı."""
    players = {name: f"parental-{name}" for name in ("child", "friend", "stranger")}
    repository = InMemoryPlayerDataRepository()
    platform = make_platform(tmp_path)
    teams = TeamService(InMemoryTeamRepository())
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "platform_service", platform)
    monkeypatch.setattr(gateway, "team_service", teams)
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", False)

    def forget():
        for player_id in players.values():
            gateway.player_profile_service._profiles.pop(player_id, None)
            gateway.player_statistics_service._statistics.pop(player_id, None)
            gateway.player_settings_service._settings.pop(player_id, None)

    forget()
    try:
        profiles = {name: gateway.player_profile_service.get_or_create(player_id) for name, player_id in players.items()}
        profiles["child"].friend_ids = (players["friend"],)
        profiles["friend"].friend_ids = (players["child"],)
        profiles["child"].circuit_credits = gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS
        team_id = gateway.create_team(gateway.TeamCreateRequest(
            player_id=players["child"], name="Kıvılcım", request_id="create",
        ))["team_id"]
        teams.join_team(players["friend"], team_id, "join", trophies=0)
        teams.review_application(
            team_id=team_id, owner_id=players["child"], applicant_id=players["friend"],
            accept=True, request_id="accept",
        )
        gateway.post_team_message(team_id, gateway.TeamMessageRequest(
            player_id=players["friend"], preset_id="hello", request_id="hello",
        ))
        gateway.send_direct_message(players["friend"], gateway.DirectMessageRequest(
            player_id=players["friend"], recipient_id=players["child"], preset_id="battle",
        ))
        yield type("World", (), {"platform": platform, "team_id": team_id, **players})
    finally:
        forget()


def closed(call) -> str:
    with pytest.raises(HTTPException) as rejected:
        call()
    assert rejected.value.status_code == 422
    return rejected.value.detail


def test_parental_endpoints_close_and_reopen_with_the_pin(world):
    with pytest.raises(HTTPException) as forbidden:
        gateway.close_social_features(world.child, gateway.ParentalControlRequest(player_id=world.friend, pin=PIN))
    assert forbidden.value.status_code == 403

    view = gateway.close_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))
    assert view["account"]["parental"]["social_closed"] is True

    assert "yanlış" in closed(lambda: gateway.open_social_features(
        world.child, gateway.ParentalControlRequest(player_id=world.child, pin="0000"),
    ))
    # Şifresiz ya da sahte alanlarla açılamaz.
    assert "4 rakam" in closed(lambda: gateway.open_social_features(
        world.child, gateway.ParentalControlRequest(player_id=world.child),
    ))
    assert world.platform.social_closed(world.child) is True

    view = gateway.open_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))
    assert view["account"]["parental"]["social_closed"] is False


def test_closed_account_cannot_chat_message_or_befriend(world):
    gateway.close_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))
    messages_before = len(world.platform._read().get("messages", []))

    assert closed(lambda: gateway.post_team_message(world.team_id, gateway.TeamMessageRequest(
        player_id=world.child, preset_id="hello", request_id="closed-team",
    ))) == gateway.SOCIAL_CLOSED_MESSAGE
    assert closed(lambda: gateway.send_direct_message(world.child, gateway.DirectMessageRequest(
        player_id=world.child, recipient_id=world.friend, preset_id="hello",
    ))) == gateway.SOCIAL_CLOSED_MESSAGE
    assert closed(lambda: gateway.send_friend_request(world.child, gateway.FriendRequestOperation(
        player_id=world.child, target_player_id=world.stranger, request_id="closed-request",
    ))) == gateway.SOCIAL_CLOSED_MESSAGE
    assert closed(lambda: gateway.create_social_invite_code(
        world.child, gateway.InviteCodeRequest(player_id=world.child),
    )) == gateway.SOCIAL_CLOSED_MESSAGE
    code = world.platform.create_invite(world.stranger)["code"]
    assert closed(lambda: gateway.accept_social_invite_code(
        world.child, gateway.InviteCodeRequest(player_id=world.child, code=code),
    )) == gateway.SOCIAL_CLOSED_MESSAGE

    # Hiçbiri kayıt bırakmadı.
    assert len(world.platform._read().get("messages", [])) == messages_before
    assert gateway.player_profile_service.get_or_create(world.child).outgoing_friend_request_ids == ()
    assert gateway.player_profile_service.get_or_create(world.stranger).incoming_friend_request_ids == ()


def test_others_cannot_reach_a_closed_account(world):
    gateway.close_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))
    notifications_before = len(world.platform.notification_view(world.child)["notifications"])

    assert closed(lambda: gateway.send_direct_message(world.friend, gateway.DirectMessageRequest(
        player_id=world.friend, recipient_id=world.child, preset_id="hello",
    ))) == gateway.SOCIAL_CLOSED_PEER_MESSAGE
    assert closed(lambda: gateway.send_friend_request(world.stranger, gateway.FriendRequestOperation(
        player_id=world.stranger, target_player_id=world.child, request_id="to-closed",
    ))) == gateway.SOCIAL_CLOSED_PEER_MESSAGE

    assert len(world.platform.notification_view(world.child)["notifications"]) == notifications_before
    assert gateway.player_profile_service.get_or_create(world.child).incoming_friend_request_ids == ()


def test_closed_account_sees_no_chat_messages_or_requests_and_gets_them_back(world):
    # Kapatmadan önce gelen bir arkadaşlık isteği.
    gateway.send_friend_request(world.stranger, gateway.FriendRequestOperation(
        player_id=world.stranger, target_player_id=world.child, request_id="before",
    ))
    open_social = gateway.get_social_view(world.child)
    assert open_social["social_closed"] is False
    assert len(open_social["conversations"]) == 1 and len(open_social["incoming_requests"]) == 1
    assert len(gateway.get_player_team(world.child)["messages"]) == 1

    gateway.close_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))

    social = gateway.get_social_view(world.child)
    assert social["social_closed"] is True
    assert social["conversations"] == [] and social["incoming_requests"] == [] and social["outgoing_requests"] == []
    assert social["notifications"]["incoming_requests"] == 0 and social["notifications"]["unread_messages"] == 0
    # Arkadaş listesi durur: arkadaş savaşı gibi oyun özellikleri etkilenmez.
    assert [item["player_id"] for item in social["friends"]] == [world.friend]
    assert gateway.get_direct_messages(world.child, world.friend) == {"messages": []}
    team = gateway.get_player_team(world.child)
    assert team["social_closed"] is True and team["messages"] == [] and team["joined"] is True
    assert closed(lambda: gateway.accept_friend_request(world.child, gateway.FriendDecisionOperation(
        player_id=world.child, requester_id=world.stranger, request_id="closed-accept",
    ))) == gateway.SOCIAL_CLOSED_MESSAGE
    # Diğer üye sohbeti görmeye devam eder.
    friend_team = gateway.get_player_team(world.friend)
    assert friend_team["social_closed"] is False and len(friend_team["messages"]) == 1

    gateway.open_social_features(world.child, gateway.ParentalControlRequest(player_id=world.child, pin=PIN))

    reopened = gateway.get_social_view(world.child)
    assert reopened["social_closed"] is False
    assert len(reopened["conversations"]) == 1 and len(reopened["incoming_requests"]) == 1
    assert len(gateway.get_player_team(world.child)["messages"]) == 1
    assert len(gateway.get_direct_messages(world.child, world.friend)["messages"]) == 1
