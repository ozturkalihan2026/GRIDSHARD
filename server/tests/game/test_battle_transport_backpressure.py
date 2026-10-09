"""Real asyncio backpressure, serialization and socket/session isolation."""
import asyncio

import pytest

from app.game.models import BattleStatus
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter


class Socket:
    def __init__(self, *, blocked=False, incoming=()):
        self.gate = asyncio.Event()
        if not blocked:
            self.gate.set()
        self.started = asyncio.Event()
        self.sent = []
        self.incoming = list(incoming)
        self.sending = 0
        self.peak_sending = 0
        self.closed = False

    async def accept(self):
        pass

    async def receive_json(self):
        return self.incoming.pop(0)

    async def send_json(self, data):
        self.sending += 1
        self.peak_sending = max(self.peak_sending, self.sending)
        self.started.set()
        try:
            await self.gate.wait()
            await asyncio.sleep(0)
            self.sent.append(data)
        finally:
            self.sending -= 1

    async def close(self, code=1000):
        self.closed = True


def service():
    value = PvPSessionService(countdown_seconds=0)
    for match in ("match", "other"):
        session = value.create_session(match)
        for player in ("a", "b"):
            value.join(match, player)
            session.engine.grant_module(player, player + "-core", "core")
            session.engine.set_initial_active_module(player, player + "-core", 2, 1)
        value.start(match)
    return value


async def connect(adapter, player, socket):
    return await adapter.connect(connection_id=player, session_id="match", player_id=player, socket=socket)


def test_blocked_socket_cannot_delay_ticks_or_build_unbounded_snapshot_queue():
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value, background_broadcasts=True, send_timeout_seconds=2)
        slow, healthy = Socket(blocked=True), Socket()
        connection = await connect(adapter, "a", slow)
        await connect(adapter, "b", healthy)
        runner = PvPTickRunner(value, adapter, snapshot_every_ticks=1)
        await runner.run_single_tick("match")
        await slow.started.wait()
        assert connection.last_pushed_event_cursor == 0
        # A stalled send would take two seconds in the old runner.
        await asyncio.wait_for(runner.run_ticks("match", 40), timeout=.2)
        assert value.get_session("match").engine.state.tick == 41
        assert len(connection.pending_broadcasts) <= 2
        assert connection.coalesced_snapshots >= 39
        assert connection.messages_sent == 0
        await asyncio.wait_for(adapter.registry.get("b").broadcast_task, timeout=.2)
        assert healthy.sent[-1]["payload"]["tick"] == 41
        slow.gate.set()
        await asyncio.wait_for(connection.broadcast_task, timeout=.2)
        assert slow.sent[-1]["payload"]["tick"] == 41
        assert sum(item["type"] == "snapshot" for item in slow.sent) <= 2
        assert connection.last_pushed_event_cursor == len(value.get_session("match").engine.state.events)
        await adapter.disconnect("a")
        await adapter.disconnect("b")
    asyncio.run(scenario())


def test_control_responses_and_broadcasts_use_one_writer_and_cancel_on_disconnect():
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value, background_broadcasts=True)
        socket = Socket(blocked=True)
        connection = await connect(adapter, "a", socket)
        await adapter.broadcast_live_events("match")
        await socket.started.wait()
        reconnect = asyncio.create_task(adapter.send_reconnect_state("a"))
        await asyncio.sleep(0)
        assert socket.peak_sending == 1
        socket.gate.set()
        await reconnect
        if connection.broadcast_task:
            await connection.broadcast_task
        assert socket.peak_sending == 1
        assert connection.last_pushed_event_cursor == len(value.get_session("match").engine.state.events)
        socket.gate.clear()
        socket.started.clear()
        await adapter.broadcast_snapshot("match")
        await socket.started.wait()
        await adapter.disconnect("a")
        assert connection.broadcast_task is None
        assert not connection.pending_broadcasts
        assert socket.sending == 0
    asyncio.run(scenario())


def test_writer_timeout_uses_idempotent_grace_without_self_await_or_cursor_advance():
    async def scenario():
        adapter = PvPWebSocketAdapter(service(), background_broadcasts=True,
                                      send_timeout_seconds=.02, grace_period_seconds=30)
        slow = Socket(blocked=True)
        connection = await connect(adapter, "a", slow)
        await adapter.broadcast_live_events("match")
        await asyncio.wait_for(connection.broadcast_task, timeout=.2)
        assert not connection.connected
        assert connection.last_pushed_event_cursor == 0
        deadline = adapter.pending_disconnect_deadlines[("match", "a")]
        await adapter.connection_lost("a")
        assert adapter.pending_disconnect_deadlines[("match", "a")] == deadline
        assert connection.broadcast_task is None
    asyncio.run(scenario())


def test_terminal_result_drains_own_state_before_result_without_waiting_for_opponent():
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value, background_broadcasts=True, send_timeout_seconds=.08)
        slow, healthy = Socket(blocked=True), Socket()
        await connect(adapter, "a", slow)
        await connect(adapter, "b", healthy)
        session = value.get_session("match")
        session.engine._emit("battle_finished", {})
        session.engine.state.status = BattleStatus.FINISHED
        session.engine.state.finish_reason = "draw"
        await adapter.broadcast_live_events("match")
        await adapter.broadcast_snapshot("match")
        terminal = asyncio.create_task(adapter.broadcast_match_finished("match"))
        for _ in range(30):
            if any(message["type"] == "match_finished" for message in healthy.sent):
                break
            await asyncio.sleep(.001)
        assert [message["type"] for message in healthy.sent] == ["events", "snapshot", "match_finished"]
        assert not terminal.done()  # Only the failed socket remains outstanding.
        await asyncio.wait_for(terminal, timeout=.2)
        await adapter.close_finished_session_connections("match")
        assert all(connection.broadcast_task is None for connection in adapter.registry.connections.values())
        assert not adapter.pending_disconnect_deadlines
    asyncio.run(scenario())


@pytest.mark.parametrize("kind,payload", [
    ("command", {"sequence": 1, "kind": "use_core_power", "payload": {}}),
    ("ack_events", {"cursor": 1}),
    ("heartbeat", {"sent_at_ms": 123, "event_cursor": 1}),
    ("reconnect", {}), ("request_snapshot", {}), ("request_lobby", {}),
    ("set_ready", {"ready": True}), ("submit_setup", {"modules": []}),
])
def test_socket_cannot_read_or_mutate_another_session(kind, payload):
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value)
        socket = Socket(incoming=[dict(version=1, type=kind, session_id="other", player_id="a",
                                       request_id="cross", payload=payload)])
        connection = await connect(adapter, "a", socket)
        other = value.get_session("other")
        before = (other.slots["a"].acknowledged_event_cursor, len(other.engine.state.events))
        response = await adapter.handle_one("a")
        assert response["type"] == "error"
        assert "oturumu" in response["payload"]["message"]
        assert before == (other.slots["a"].acknowledged_event_cursor, len(other.engine.state.events))
        assert connection.last_pushed_event_cursor == 0
    asyncio.run(scenario())


@pytest.mark.parametrize("costs,expected", [([.01] * 4, [.09] * 3), ([.35, .01, .01, .01], [.1, .09, .09])])
def test_runner_subtracts_work_from_tick_interval_without_catchup_bursts(costs, expected):
    async def scenario():
        value = service()
        clock = [100.0]
        sleeps = []
        async def sleep(delay):
            sleeps.append(delay)
            clock[0] += delay
        runner = PvPTickRunner(value, PvPWebSocketAdapter(value), sleep_func=sleep, clock_func=lambda:clock[0])
        async def tick(_session_id):
            clock[0] += costs.pop(0)
            if not costs:
                value.get_session("match").engine.state.status = BattleStatus.FINISHED
            return True
        runner.run_single_tick = tick
        await runner._run_loop("match")
        assert sleeps == pytest.approx(expected)
    asyncio.run(scenario())


def test_disconnect_during_terminal_drain_cannot_cancel_opponents_result_or_close():
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value, background_broadcasts=True, send_timeout_seconds=1)
        slow, healthy = Socket(blocked=True), Socket()
        await connect(adapter, "a", slow)
        await connect(adapter, "b", healthy)
        value.get_session("match").engine.state.players["a"].modules["a-core"].hp = 0
        runner = PvPTickRunner(value, adapter, snapshot_every_ticks=1)
        terminal = asyncio.create_task(runner.run_single_tick("match"))
        await slow.started.wait()
        for _ in range(20):
            if any(message["type"] == "match_finished" for message in healthy.sent):
                break
            await asyncio.sleep(.001)
        await adapter.disconnect("a")
        assert await asyncio.wait_for(terminal, timeout=.2)
        assert healthy.closed
        assert runner.stats_for("match").match_finished_broadcasts == 1
    asyncio.run(scenario())


def test_final_snapshot_and_reconnect_cannot_authorize_rewards_before_projection_finishes():
    async def scenario():
        value = service()
        adapter = PvPWebSocketAdapter(value, background_broadcasts=True)
        healthy = Socket()
        await connect(adapter, "a", healthy)
        entered, release = asyncio.Event(), asyncio.Event()
        async def project(_state):
            entered.set()
            await release.wait()
        value.get_session("match").engine.state.players["b"].modules["b-core"].hp = 0
        runner = PvPTickRunner(value, adapter, snapshot_every_ticks=1, match_finished_callback=project)
        terminal = asyncio.create_task(runner.run_single_tick("match"))
        await entered.wait()
        if adapter.registry.get("a").broadcast_task:
            await adapter.registry.get("a").broadcast_task
        snapshot = next(message["payload"] for message in healthy.sent if message["type"] == "snapshot")
        assert snapshot["status"] == "finished"
        assert snapshot["result_delivery_pending"] is True
        assert value.reconnect_payload("match", "a")["final_result"] is None
        assert not any(message["type"] == "match_finished" for message in healthy.sent)
        release.set()
        await terminal
        assert value.reconnect_payload("match", "a")["final_result"] is not None
        assert any(message["type"] == "match_finished" for message in healthy.sent)
    asyncio.run(scenario())
