import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app import main as gateway
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.telemetry import InMemoryTelemetryService, TelemetryEvent


def event(index):
    return TelemetryEvent(event_id=f"e{index}", event_type="game_opened", timestamp_ms=index)


def test_maintenance_releases_expired_runner_stats_and_preserves_live_stats(monkeypatch):
    now = [100.0]
    service = PvPSessionService(now_func=lambda: now[0], waiting_ttl_seconds=1)
    runner = PvPTickRunner(service, SimpleNamespace())
    for index in range(200):
        session_id = f"expired-{index}"
        service.create_session(session_id)
        runner.stats_for(session_id)
    now[0] = 102.0
    service.create_session("live")
    live_stats = runner.stats_for("live")
    coordinator = SimpleNamespace(
        redis=None, delete_session=AsyncMock(), touch_session=AsyncMock(),
        local_limiter=SimpleNamespace(cleanup=AsyncMock()),
    )
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", False)
    monkeypatch.setattr(gateway, "pvp_service", service)
    monkeypatch.setattr(gateway, "pvp_tick_runner", runner)
    monkeypatch.setattr(gateway, "pvp_websocket_adapter", SimpleNamespace(sweep_connection_health=AsyncMock()))
    monkeypatch.setattr(gateway, "runtime_coordinator", coordinator)
    monkeypatch.setattr(gateway, "matchmaking_service", SimpleNamespace(cleanup_expired=lambda: None))
    asyncio.run(gateway._runtime_maintenance_pass())
    assert list(service._sessions) == ["live"]
    assert runner._stats == {"live": live_stats}
    assert coordinator.delete_session.await_count == 200


def test_abandoned_tutorial_releases_runner_stats_even_if_socket_close_fails():
    service = PvPSessionService()
    runner = PvPTickRunner(service, SimpleNamespace(
        close_finished_session_connections=AsyncMock(side_effect=RuntimeError("socket gone"))))
    for index in range(100):
        session_id = f"tutorial-{index}"
        service.create_session(session_id)
        runner.stats_for(session_id)
        asyncio.run(runner._abandon_session(session_id))
    assert not service._sessions
    assert not runner._stats


def test_loaded_telemetry_obeys_smaller_memory_limit_without_deleting_persisted_events():
    persisted = [event(index) for index in range(50)]
    repository = SimpleNamespace(max_events=50, load=lambda: list(persisted), append=persisted.extend)
    service = InMemoryTelemetryService(repository=repository, max_events=10)
    assert len(service.events()) == 10
    assert len(service._event_ids) == 10
    for index in range(50, 90):
        service.record(event(index))
    assert len(service.events()) <= 11
    assert len(service._event_ids) == len(service.events())
    assert len(persisted) == 90
    assert service.events()[-1]["event_id"] == "e89"


def test_production_lifespan_keeps_memory_limit_when_rebinding_telemetry(monkeypatch):
    # Exercise the real startup rebinding, stopping before background tasks or
    # transports start. All persistence/lease collaborators are isolated fakes.
    repository = SimpleNamespace(max_events=50, load=lambda: [event(i) for i in range(50)])
    async def stop_after_rebind():
        assert gateway.telemetry_service.repository is repository
        assert gateway.telemetry_service.memory_max_events == 10
        assert len(gateway.telemetry_service.events()) == 10
        raise RuntimeError("startup checked")

    monkeypatch.setattr(gateway, "telemetry_service", None)
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", True)
    monkeypatch.setattr(gateway, "TELEMETRY_MEMORY_MAX_EVENTS", 10)
    monkeypatch.setattr(gateway, "telemetry_repository", repository)
    monkeypatch.setattr(gateway, "postgres_pool", SimpleNamespace(open=lambda: None, close=lambda: None))
    monkeypatch.setattr(gateway, "postgres_worker_guard", SimpleNamespace(acquire=lambda: None, release=lambda: None))
    monkeypatch.setattr(gateway, "ensure_clean_postgres_installation", lambda *_: "isolated")
    monkeypatch.setattr(gateway, "ensure_clean_runtime_directory", lambda *_: None)
    monkeypatch.setattr(gateway, "apply_json_store_migrations", lambda *_, **__: None)
    monkeypatch.setattr(gateway, "runtime_coordinator", SimpleNamespace(open=stop_after_rebind, close=AsyncMock()))
    monkeypatch.setattr(gateway, "pvp_tick_runner", SimpleNamespace(stop_all=AsyncMock()))
    monkeypatch.setattr(gateway, "platform_service", SimpleNamespace(push_sender=SimpleNamespace(close=lambda: None)))

    async def scenario():
        with pytest.raises(RuntimeError, match="startup checked"):
            async with gateway.application_lifespan(gateway.app):
                pytest.fail("must stop before serving")
    asyncio.run(scenario())
