import asyncio

import pytest

from app.game.models import BattleCommand
from app.game.pvp_protocol_handler import PvPProtocolHandler
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService, PvPSessionError
from app.game.pvp_websocket import PvPWebSocketAdapter


def make_service(countdown=3):
    clock = [100.0]
    service = PvPSessionService(now_func=lambda: clock[0], countdown_seconds=countdown)
    session = service.create_session("match")
    for player in ("a", "b"):
        service.join("match", player)
        session.engine.grant_module(player, player + "-core", "core")
        session.engine.set_initial_active_module(player, player + "-core", 2, 1)
    service.start("match")
    return service, session, clock


def test_server_countdown_freezes_combat_and_rejects_early_actions_without_reset_on_reconnect():
    service, session, clock = make_service()
    assert service.snapshot("match", "a")["countdown_remaining_ms"] == 3000
    for _ in range(50):
        service.step("match")
    assert session.engine.state.tick == 0
    with pytest.raises(PvPSessionError, match="geri sayım"):
        service.submit_command("match", "a", BattleCommand(player_id="a", kind="use_core_power", payload={}))
    clock[0] += 1
    service.start("match")  # Idempotent start cannot extend the deadline.
    assert service.reconnect_payload("match", "a")["snapshot"]["countdown_remaining_ms"] == 2000
    clock[0] += 2
    service.step("match")
    assert session.engine.state.tick == 1
    assert service.snapshot("match", "b")["countdown_remaining_ms"] == 0


def test_runner_does_not_make_ai_decisions_during_countdown():
    async def scenario():
        service, session, clock = make_service()
        runner = PvPTickRunner(service, PvPWebSocketAdapter(service))
        await runner.run_single_tick("match")
        assert runner.stats_for("match").ticks_executed == 0
        assert session.engine.state.elapsed_ms == 0
        clock[0] += 3
        await runner.run_single_tick("match")
        assert runner.stats_for("match").ticks_executed == 1
    asyncio.run(scenario())


def test_heartbeat_acknowledges_cursor_without_event_feedback_loop_and_checks_bounds():
    service, session, _ = make_service(0)
    handler = PvPProtocolHandler(service)
    cursor = len(session.engine.state.events)
    request = dict(version=1, type="heartbeat", session_id="match", player_id="a", request_id="hb", payload={"sent_at_ms":123,"event_cursor":cursor})
    assert handler.handle(request, "a")["type"] == "heartbeat_ack"
    assert session.slots["a"].acknowledged_event_cursor == cursor
    assert service.reconnect_payload("match", "a")["events"] == []
    for invalid in (-1, True, cursor + 1):
        request["payload"]["event_cursor"] = invalid
        assert handler.handle(request, "a")["type"] == "error"


def test_reconnect_delivery_advances_live_cursor_without_replaying_full_history():
    async def scenario():
        service, session, _ = make_service(0)
        class Socket:
            sent = []
            async def accept(self): pass
            async def send_json(self, data): self.sent.append(data)
            async def receive_json(self):
                return dict(version=1,type="reconnect",session_id="match",player_id="a",request_id="r",payload={})
        adapter = PvPWebSocketAdapter(service)
        socket = Socket()
        connection = await adapter.connect(connection_id="c", session_id="match", player_id="a", socket=socket)
        await adapter.handle_one("c")
        assert connection.last_pushed_event_cursor == len(session.engine.state.events)
        assert await adapter.send_live_events("c") is None
        session.engine._emit("custom", {"value":1})
        page = await adapter.send_live_events("c")
        assert len(page["payload"]["events"]) == 1
        assert page["payload"]["events"][0]["cursor"] == len(session.engine.state.events)
    asyncio.run(scenario())
