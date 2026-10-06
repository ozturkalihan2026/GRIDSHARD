"""Çocuk hedef kitle kararı: hazır mesajlar ve ad süzgeci.

Karar ve gerekçe: docs/CHILD_AUDIENCE_AUDIT.md. Serbest yazı hiçbir oyuncu
için açık değildir; sunucu yalnız hazır mesaj kimliği kabul eder ve eski
serbest metinleri hiçbir görünümde göstermez.
"""

import pytest
from fastapi import HTTPException

from app import main as gateway
from app.platform_services import PlatformService, PlatformServiceError
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileError, PlayerProfileService
from app.safe_chat import (
    PRESET_MESSAGES,
    TEAM_DESCRIPTION_PRESETS,
    preset_message_text,
    visible_message,
)
from app.team_service import InMemoryTeamRepository, TeamService, TeamServiceError
from app.text_safety import public_name_rejection


FREE_TEXT = "Okulum Atatürk Ortaokulu, 0555 111 22 33'ten yaz"


def test_catalog_has_unique_ids_and_short_texts():
    assert len(PRESET_MESSAGES) >= 25
    assert all(item["id"] == key and item["text"] for key, item in PRESET_MESSAGES.items())
    assert all(len(item["text"]) <= 40 for item in PRESET_MESSAGES.values())
    assert len({item["text"] for item in PRESET_MESSAGES.values()}) == len(PRESET_MESSAGES)
    assert {item["group"] for item in PRESET_MESSAGES.values()} == {"selam", "cevap", "savas", "takim", "tepki"}
    assert all(TEAM_DESCRIPTION_PRESETS.values())


# -- Takım sohbeti --------------------------------------------------------------

def team_with_two_members() -> tuple[TeamService, str]:
    service = TeamService(InMemoryTeamRepository())
    team_id = service.create_team("alpha", "Grid", "create")["team_id"]
    service.join_team("beta", team_id, "join", trophies=0)
    service.review_application(
        team_id=team_id, owner_id="alpha", applicant_id="beta", accept=True, request_id="accept",
    )
    return service, team_id


def test_team_chat_accepts_only_preset_ids():
    service, team_id = team_with_two_members()

    sent = service.post_message(
        team_id=team_id, player_id="beta", preset_id="tournament_ready", request_id="m1",
    )["message"]
    assert (sent["preset_id"], sent["text"]) == ("tournament_ready", "Turnuvaya hazır mıyız?")

    for attempt, value in enumerate((FREE_TEXT, "", "bilinmeyen", "Selam!")):
        with pytest.raises(TeamServiceError, match="hazır mesaj"):
            service.post_message(
                team_id=team_id, player_id="beta", preset_id=value, request_id=f"free-{attempt}",
            )
    # Reddedilen deneme kayıt bırakmaz.
    assert [item["preset_id"] for item in service.get_team(team_id)["messages"]] == ["tournament_ready"]


@pytest.fixture
def team_gateway(monkeypatch):
    players = [f"safe-chat-{index}" for index in range(2)]
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
        for profile in profiles:
            profile.circuit_credits = gateway.TEAM_CREATION_COST_CIRCUIT_CREDITS
        team_id = gateway.create_team(gateway.TeamCreateRequest(
            player_id=players[0], name="Güvenli", request_id="create",
        ))["team_id"]
        yield players, service, team_id
    finally:
        forget()


def test_gateway_rejects_free_text_team_message_from_an_old_client(team_gateway):
    (alpha, _), service, team_id = team_gateway

    with pytest.raises(HTTPException) as rejected:
        gateway.post_team_message(team_id, gateway.TeamMessageRequest(
            player_id=alpha, message=FREE_TEXT, request_id="old-client",
        ))
    assert rejected.value.status_code == 422
    assert "hazır mesaj" in rejected.value.detail
    assert service.get_team(team_id)["messages"] == []

    view = gateway.post_team_message(team_id, gateway.TeamMessageRequest(
        player_id=alpha, preset_id="hello", request_id="new-client",
    ))
    assert [(item["preset_id"], item["text"], item["is_own"]) for item in view["messages"]] == [
        ("hello", "Selam!", True),
    ]


def test_team_view_hides_stored_free_text_and_never_trusts_stored_wording(team_gateway):
    (alpha, _), service, team_id = team_gateway
    gateway.post_team_message(team_id, gateway.TeamMessageRequest(
        player_id=alpha, preset_id="hello", request_id="first",
    ))

    # Karardan önce yazılmış serbest metin ve metni değiştirilmiş hazır mesaj.
    messages = service.repository.payload["teams"][team_id]["messages"]
    messages.insert(0, {
        "message_id": "legacy", "author_id": alpha, "text": FREE_TEXT,
        "created_at": "2026-09-01T10:00:00Z", "visibility": "visible",
    })
    messages[1]["text"] = FREE_TEXT

    shown = gateway.get_player_team(alpha)["messages"]
    assert [(item["message_id"] != "legacy", item["text"]) for item in shown] == [(True, "Selam!")]
    assert FREE_TEXT not in str(shown)


# -- Özel mesaj ------------------------------------------------------------------

def test_direct_message_stores_only_presets_and_hides_stored_free_text(tmp_path):
    platform = PlatformService(tmp_path / "platform.json")

    with pytest.raises(PlatformServiceError, match="hazır mesaj"):
        platform.send_message("player-a", "player-b", FREE_TEXT)
    assert platform.messages("player-a", "player-b") == []

    with platform._lock:
        data = platform._read()
        data.setdefault("messages", []).append({
            "message_id": "legacy", "sender_id": "player-b", "recipient_id": "player-a",
            "text": FREE_TEXT, "sent_at": 900,
        })
        platform._write(data)
    # Yalnız eski serbest metin içeren sohbet listede görünmez.
    assert platform.messages("player-a", "player-b") == []
    assert platform.conversations("player-a") == []

    sent = platform.send_message("player-b", "player-a", "battle")
    assert (sent["preset_id"], sent["text"]) == ("battle", "Savaşalım mı?")
    conversation = platform.conversations("player-a")[0]
    assert conversation["message_count"] == 1 and conversation["unread_count"] == 1
    assert conversation["last_message"]["preset_id"] == "battle"
    assert FREE_TEXT not in str(platform.messages("player-a")) + str(platform.conversations("player-a"))


def test_gateway_rejects_free_text_direct_message_before_any_write(tmp_path, monkeypatch):
    players = ("safe-dm-alpha", "safe-dm-beta")
    repository = InMemoryPlayerDataRepository()
    platform = PlatformService(tmp_path / "platform.json")
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "platform_service", platform)
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", False)
    for player_id in players:
        gateway.player_profile_service._profiles.pop(player_id, None)
    try:
        alpha, beta = (gateway.player_profile_service.get_or_create(player_id) for player_id in players)
        alpha.friend_ids = (beta.player_id,)
        beta.friend_ids = (alpha.player_id,)

        with pytest.raises(HTTPException) as rejected:
            gateway.send_direct_message(alpha.player_id, gateway.DirectMessageRequest(
                player_id=alpha.player_id, recipient_id=beta.player_id, text=FREE_TEXT,
            ))
        assert rejected.value.status_code == 422
        assert platform.messages(beta.player_id) == []
        assert platform.notification_view(beta.player_id)["notifications"] == []

        sent = gateway.send_direct_message(alpha.player_id, gateway.DirectMessageRequest(
            player_id=alpha.player_id, recipient_id=beta.player_id, preset_id="good_luck",
        ))["message"]
        assert sent["text"] == preset_message_text("good_luck") == "İyi oyunlar!"
        assert len(platform.notification_view(beta.player_id)["notifications"]) == 1
    finally:
        for player_id in players:
            gateway.player_profile_service._profiles.pop(player_id, None)


def test_visible_message_reads_wording_from_the_catalog():
    assert visible_message({"preset_id": "hello", "text": FREE_TEXT})["text"] == "Selam!"
    assert visible_message({"text": "Selam!"}) is None
    assert visible_message({"preset_id": "yok", "text": "Selam!"}) is None


# -- Herkese görünen adlar ---------------------------------------------------------

@pytest.mark.parametrize("name", [
    "Kıvılcım", "Klasik Takım", "Oynayarak Kazan", "Nazım", "Sıkı Dostlar", "Sık Atan",
    "Epic Grape", "Ali2010", "Kara Şimşek 7", "Instant Win", "Müzik Devresi", "Eksik Parça",
    "Çekirdek Avcıları", "Ş", "x_Dark_x",
])
def test_ordinary_names_are_accepted(name):
    assert public_name_rejection(name) is None


@pytest.mark.parametrize("name, reason", [
    ("Ara 05551112233", "rakam"),
    ("0555 111 22", "rakam"),
    ("ali@okul", "e-posta"),
    ("benim.sitem.com", "e-posta"),
    ("insta ali_k", "sosyal ağ"),
    ("Instagram Ali", "sosyal ağ"),
    ("whatsapp yaz", "sosyal ağ"),
    ("D i s c o r d", "sosyal ağ"),
    ("Siktir Git", "uygun değil"),
    ("s1kt1r", "uygun değil"),
    ("siiiiktir", "uygun değil"),
    ("S İ K", "uygun değil"),
    ("Orospu", "uygun değil"),
    ("amk", "uygun değil"),
    ("AMINAKOYIM", "uygun değil"),
    ("fuuuck you", "uygun değil"),
    ("B1TCH", "uygun değil"),
    ("sex", "uygun değil"),
    ("Nazi", "uygun değil"),
])
def test_names_with_contact_details_or_profanity_are_rejected(name, reason):
    rejection = public_name_rejection(name, label="Oyuncu adı")
    assert rejection is not None and reason in rejection
    assert rejection.startswith("Oyuncu adı")


def test_unsafe_display_name_is_rejected_without_spending_the_single_rename():
    service = PlayerProfileService()
    profile = service.get_or_create("safe-name-player")
    original = profile.display_name

    with pytest.raises(PlayerProfileError, match="rakam"):
        service.set_display_name(profile.player_id, "Ara 05551112233")
    assert (profile.display_name, profile.display_name_changes) == (original, 0)

    assert service.set_display_name(profile.player_id, "Kıvılcım").display_name == "Kıvılcım"
    assert profile.display_name_changes == 1


def test_unsafe_team_name_is_rejected_before_the_team_exists():
    service = TeamService(InMemoryTeamRepository())

    with pytest.raises(TeamServiceError, match="Takım adı"):
        service.create_team("alpha", "insta ali_k", "create")
    assert service.team_for_player("alpha") is None
    assert service.create_team("alpha", "Kıvılcım Birliği", "create-2")["team"]["name"] == "Kıvılcım Birliği"
