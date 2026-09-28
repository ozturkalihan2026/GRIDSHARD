from datetime import datetime, timedelta, timezone
from itertools import count

from app import main as gateway
from app import platform_services
from app.platform_services import PlatformService
from app.player_data_store import InMemoryPlayerDataRepository
from app.team_service import InMemoryTeamRepository, TeamService


def ticking_platform(tmp_path) -> PlatformService:
    clock = count(1000)
    return PlatformService(tmp_path / "platform.json", now_func=lambda: next(clock))


def test_each_conversation_keeps_its_own_history(tmp_path, monkeypatch):
    monkeypatch.setattr(platform_services, "DIRECT_MESSAGE_THREAD_LIMIT", 3)
    platform = ticking_platform(tmp_path)
    platform.send_message("player-c", "player-a", "C'den tek mesaj")
    for index in range(5):
        sender, recipient = (("player-a", "player-b"), ("player-b", "player-a"))[index % 2]
        platform.send_message(sender, recipient, f"AB {index}")

    with_b = platform.messages("player-a", "player-b")
    with_c = platform.messages("player-a", "player-c")

    # Yoğun A–B sohbeti yalnız kendi eski mesajlarını budar; C sohbeti kalır.
    assert [item["text"] for item in with_b] == ["AB 2", "AB 3", "AB 4"]
    assert [item["text"] for item in with_c] == ["C'den tek mesaj"]
    assert platform.messages("player-b", "player-c") == []


def test_conversations_count_unread_per_peer_and_mark_seen(tmp_path):
    platform = ticking_platform(tmp_path)
    platform.send_message("player-b", "player-a", "B1")
    platform.send_message("player-b", "player-a", "B2")
    platform.send_message("player-c", "player-a", "C1")
    platform.send_message("player-a", "player-b", "A1")

    conversations = platform.conversations("player-a")
    assert [item["peer_id"] for item in conversations] == ["player-b", "player-c"]
    assert {item["peer_id"]: item["unread_count"] for item in conversations} == {
        "player-b": 2,
        "player-c": 1,
    }
    assert conversations[0]["last_message"]["text"] == "A1"
    assert conversations[0]["message_count"] == 3

    assert platform.mark_conversation_seen("player-a", "player-b") == 1
    # Değişmeyen işaret yeniden yazılmaz.
    assert platform.mark_conversation_seen("player-a", "player-b") == 0
    unread = {item["peer_id"]: item["unread_count"] for item in platform.conversations("player-a")}
    assert unread == {"player-b": 0, "player-c": 1}

    platform.send_message("player-b", "player-a", "B3")
    unread = {item["peer_id"]: item["unread_count"] for item in platform.conversations("player-a")}
    assert unread == {"player-b": 1, "player-c": 1}

    assert platform.mark_conversation_seen("player-a") == 2
    assert all(item["unread_count"] == 0 for item in platform.conversations("player-a"))


def test_legacy_seen_time_and_trimmed_marker(tmp_path, monkeypatch):
    monkeypatch.setattr(platform_services, "DIRECT_MESSAGE_THREAD_LIMIT", 2)
    platform = ticking_platform(tmp_path)
    first = platform.send_message("player-b", "player-a", "eski")
    platform.send_message("player-b", "player-a", "yeni")

    # İşaret yokken eski tek okundu zamanı geçerlidir.
    legacy = platform.conversations("player-a", legacy_seen_at=first["sent_at"])
    assert legacy[0]["unread_count"] == 1

    platform.mark_conversation_seen("player-a", "player-b")
    platform.send_message("player-b", "player-a", "1")
    platform.send_message("player-b", "player-a", "2")
    # İşaretli mesaj sınır yüzünden silindi; kalan iki mesaj ondan yenidir.
    assert platform.conversations("player-a")[0]["unread_count"] == 2


def test_team_view_reports_weekly_module_request_availability():
    now = [datetime(2026, 9, 10, 12, tzinfo=timezone.utc)]
    service = TeamService(InMemoryTeamRepository(), now_func=lambda: now[0])
    team_id = service.create_team("alpha", "Grid", "create")["team_id"]

    assert service.module_request_available(service.get_team(team_id), "alpha") is True
    service.create_module_request(
        team_id=team_id,
        player_id="alpha",
        module_id="laser",
        rarity="common",
        request_id="weekly-request",
    )
    assert service.module_request_available(service.get_team(team_id), "alpha") is False
    assert service.module_request_available(service.get_team(team_id), "beta") is True

    now[0] += timedelta(days=7)
    assert service.module_request_available(service.get_team(team_id), "alpha") is True


def test_social_view_lists_conversations_and_marks_one_thread_seen(tmp_path, monkeypatch):
    players = ("beta72-dm-alpha", "beta72-dm-beta", "beta72-dm-gamma")
    repository = InMemoryPlayerDataRepository()
    platform = ticking_platform(tmp_path)
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "platform_service", platform)
    for player_id in players:
        gateway.player_profile_service._profiles.pop(player_id, None)
    try:
        alpha, beta, gamma = (
            gateway.player_profile_service.get_or_create(player_id)
            for player_id in players
        )
        alpha.friend_ids = (beta.player_id, gamma.player_id)
        beta.friend_ids = (alpha.player_id,)
        gamma.friend_ids = (alpha.player_id,)
        gateway.send_direct_message(beta.player_id, gateway.DirectMessageRequest(
            player_id=beta.player_id, recipient_id=alpha.player_id, text="Selam",
        ))
        gateway.send_direct_message(gamma.player_id, gateway.DirectMessageRequest(
            player_id=gamma.player_id, recipient_id=alpha.player_id, text="Maç?",
        ))

        view = gateway.get_social_view(alpha.player_id)
        assert view["notifications"]["unread_messages"] == 2
        assert [item["peer_id"] for item in view["conversations"]] == [
            gamma.player_id,
            beta.player_id,
        ]
        assert view["conversations"][0]["peer"]["display_name"] == gamma.display_name
        assert view["conversations"][0]["is_friend"] is True

        seen = gateway.mark_direct_messages_seen(
            alpha.player_id,
            gateway.DirectMessageSeenRequest(player_id=alpha.player_id, peer_id=beta.player_id),
        )
        assert seen["notifications"]["unread_messages"] == 1
        assert {
            item["peer_id"]: item["unread_count"] for item in seen["conversations"]
        } == {beta.player_id: 0, gamma.player_id: 1}

        thread = gateway.get_direct_messages(alpha.player_id, peer_id=gamma.player_id)
        assert [item["text"] for item in thread["messages"]] == ["Maç?"]
    finally:
        for player_id in players:
            gateway.player_profile_service._profiles.pop(player_id, None)
