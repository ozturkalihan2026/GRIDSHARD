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
