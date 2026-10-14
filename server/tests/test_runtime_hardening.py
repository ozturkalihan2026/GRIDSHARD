import asyncio

import pytest
from fastapi.testclient import TestClient

from app.game.engine import BattleEngine, CommandRejected
from app.game.models import BattleCommand, BattleState, BattleStatus
from app.game.pvp_session import PvPSessionService
from app.main import app
from app.runtime_coordination import InMemoryRateLimiter


def test_command_queue_has_global_and_per_player_backpressure():
    engine = BattleEngine(
        BattleState(battle_id="queue"),
        max_pending_commands=3,
        max_pending_commands_per_player=2,
        max_commands_per_tick=1,
    )
    engine.add_player("a")
    engine.add_player("b")
    engine.state.status = BattleStatus.RUNNING
    engine.enqueue_command(BattleCommand("a", "unknown", {}))
    engine.enqueue_command(BattleCommand("a", "unknown", {}))
    with pytest.raises(CommandRejected, match="oyuncunun bekleyen komut sınırı|Oyuncunun bekleyen komut sınırı"):
        engine.enqueue_command(BattleCommand("a", "unknown", {}))
    engine.enqueue_command(BattleCommand("b", "unknown", {}))
    with pytest.raises(CommandRejected, match="kuyruğu dolu"):
        engine.enqueue_command(BattleCommand("b", "unknown", {}))

    engine.step()
    assert engine.pending_command_count == 2


def test_session_cleanup_respects_status_and_disconnect_state():
    now = [100.0]
    service = PvPSessionService(
        now_func=lambda: now[0],
        waiting_ttl_seconds=10,
        disconnected_ttl_seconds=5,
        finished_ttl_seconds=3,
    )
    service.create_session("waiting")
    now[0] = 111.0
    assert service.cleanup_expired_sessions() == ("waiting",)

    session = service.create_session("running")
    service.join("running", "a")
    service.join("running", "b")
    session.engine.state.status = BattleStatus.RUNNING
    service.disconnect("running", "a")
    service.disconnect("running", "b")
    now[0] += 6.0
    assert service.cleanup_expired_sessions() == ("running",)

    finished = service.create_session("finished")
    finished.engine.state.status = BattleStatus.FINISHED
    finished.finished_at = now[0]
    now[0] += 4.0
    assert service.cleanup_expired_sessions() == ("finished",)


def test_in_memory_rate_limiter_returns_retry_after():
    now = [10.0]
    limiter = InMemoryRateLimiter(now_func=lambda: now[0])

    async def scenario():
        first = await limiter.check("auth:ip", limit=2, window_seconds=10)
        second = await limiter.check("auth:ip", limit=2, window_seconds=10)
        blocked = await limiter.check("auth:ip", limit=2, window_seconds=10)
        return first, second, blocked

    first, second, blocked = asyncio.run(scenario())
    assert first.allowed and second.allowed
    assert not blocked.allowed
    assert blocked.retry_after_seconds >= 1


def test_auth_endpoint_is_rate_limited(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_RATE_LIMIT_REQUIRED", "1")
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(app)
    statuses = []
    for index in range(11):
        response = client.post(
            "/auth/session",
            json={
                "player_id": f"rate-player-{index}",
                "device_secret": str(index) * 40,
            },
        )
        statuses.append(response.status_code)
    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429


def test_auth_rate_limit_cannot_be_bypassed_by_authorization_header(monkeypatch):
    # Giriş ucu belirteç istemez; başlık anahtar olursa her istek yeni kova açar.
    monkeypatch.setenv("GRIDSHARD_RATE_LIMIT_REQUIRED", "1")
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    from app import main
    monkeypatch.setattr(main.runtime_coordinator, "local_limiter", InMemoryRateLimiter())
    client = TestClient(app)
    statuses = [
        client.post(
            "/auth/session",
            headers={"authorization": f"Bearer changing-{index}"},
            json={"player_id": f"rate-header-player-{index}", "device_secret": "h" * 40},
        ).status_code
        for index in range(11)
    ]
    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429


def test_auth_rate_limit_is_per_forwarded_client_behind_proxy(monkeypatch):
    # Vekil arkasında TCP eşi herkes için vekildir; kova istemci adresine göre ayrılır.
    from app import main
    from app.client_address import client_address

    assert client_address("172.18.0.5", {"x-forwarded-for": "203.0.113.7"}, environ={}) == "203.0.113.7"
    assert client_address("172.18.0.5", {"x-forwarded-for": "198.51.100.1, 203.0.113.9"}, environ={}) == "203.0.113.9"
    assert client_address("172.18.0.5", {}, environ={}) == "172.18.0.5"
    assert client_address("172.18.0.5", {"x-forwarded-for": "not-an-ip"}, environ={}) == "172.18.0.5"
    # Doğrudan gelen genel adres kendi yazdığı başlıkla değiştirilemez.
    assert client_address("8.8.4.4", {"x-forwarded-for": "203.0.113.7"}, environ={}) == "8.8.4.4"
    assert client_address(
        "8.8.4.4", {"cf-connecting-ip": "203.0.113.7"},
        environ={"GRIDSHARD_CLIENT_IP_HEADER": "CF-Connecting-IP"},
    ) == "8.8.4.4"
    # Uç ağın yazdığı başlık yalnız yapılandırılınca okunur.
    edge_headers = {"cf-connecting-ip": "203.0.113.50", "x-forwarded-for": "172.70.1.1"}
    assert client_address("172.18.0.5", edge_headers, environ={}) == "172.70.1.1"
    assert client_address(
        "172.18.0.5", edge_headers, environ={"GRIDSHARD_CLIENT_IP_HEADER": "CF-Connecting-IP"},
    ) == "203.0.113.50"
    assert client_address(None, {}, environ={}) == "unknown"
    assert client_address("testclient", {"x-forwarded-for": "203.0.113.7"}, environ={}) == "testclient"

    monkeypatch.setenv("GRIDSHARD_RATE_LIMIT_REQUIRED", "1")
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    monkeypatch.setattr(main.runtime_coordinator, "local_limiter", InMemoryRateLimiter())
    client = TestClient(app, client=("172.18.0.5", 50000))

    def login(index: int, forwarded: str) -> int:
        return client.post(
            "/auth/session",
            headers={"x-forwarded-for": forwarded},
            json={"player_id": f"rate-proxy-player-{forwarded.replace('.', '-')}-{index}", "device_secret": "p" * 40},
        ).status_code

    assert [login(index, "203.0.113.7") for index in range(10)] == [200] * 10
    assert login(10, "203.0.113.7") == 429
    assert login(0, "203.0.113.8") == 200


def test_auth_rate_limit_has_a_global_ceiling(monkeypatch):
    from app import main

    monkeypatch.setenv("GRIDSHARD_RATE_LIMIT_REQUIRED", "1")
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    monkeypatch.setenv("GRIDSHARD_AUTH_GLOBAL_RATE_LIMIT", "3")
    monkeypatch.setattr(main.runtime_coordinator, "local_limiter", InMemoryRateLimiter())
    client = TestClient(app, client=("172.18.0.5", 50000))
    statuses = [
        client.post(
            "/auth/session",
            headers={"x-forwarded-for": f"203.0.113.{index + 1}"},
            json={"player_id": f"rate-global-player-{index}", "device_secret": "g" * 40},
        ).status_code
        for index in range(4)
    ]
    assert statuses == [200, 200, 200, 429]
