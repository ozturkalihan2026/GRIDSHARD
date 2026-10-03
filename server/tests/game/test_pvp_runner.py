import asyncio
from app.game.battle_pool import default_battle_pool
from app.game.models import BattleStatus,ModuleStatus,Position
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter

def destroy_core(engine, player_id):
    # Savaş yalnız bir Çekirdek yok olunca biter.
    for module in engine.state.players[player_id].modules.values():
        if module.definition.id == "core":
            module.hp = 0


class FakeSocket:
    def __init__(self):
        self.sent=[]; self.accepted=False; self.closed=False
    async def accept(self): self.accepted=True
    async def receive_json(self): raise RuntimeError("not used")
    async def send_json(self,data): self.sent.append(data)
    async def close(self,code=1000): self.closed=True

def running_service():
    service=PvPSessionService()
    session=service.create_session("match")
    for p in ("a","b"):
        service.join("match",p)
        session.engine.grant_module(p,f"{p}-core","core")
        session.engine.set_initial_active_module(p,f"{p}-core",2,1)
    service.start("match")
    return service,session

def test_runner_interval_is_real_10hz():
    s,x=running_service()
    r=PvPTickRunner(s,PvPWebSocketAdapter(s))
    assert r.tick_interval_seconds==0.1


def test_broken_socket_does_not_stop_opponents_terminal_result():
    async def scenario():
        s, session = running_service()
        adapter = PvPWebSocketAdapter(s, grace_period_seconds=30)
        class BrokenSocket(FakeSocket):
            async def send_json(self, data):
                raise RuntimeError("closed transport")
        bad, good = BrokenSocket(), FakeSocket()
        await adapter.connect(connection_id="bad", session_id="match", player_id="b", socket=bad)
        await adapter.connect(connection_id="good", session_id="match", player_id="a", socket=good)
        destroy_core(session.engine, "b")
        runner = PvPTickRunner(s, adapter)
        await runner.run_single_tick("match")
        assert any(m["type"] == "match_finished" for m in good.sent)
        assert good.closed
        assert not adapter.pending_disconnect_deadlines
    asyncio.run(scenario())


def test_slow_projection_and_socket_are_bounded_at_match_end():
    async def scenario():
        s, session = running_service()
        adapter = PvPWebSocketAdapter(s, send_timeout_seconds=.02)
        class SlowSocket(FakeSocket):
            async def send_json(self, data):
                await asyncio.Event().wait()
        good = FakeSocket()
        await adapter.connect(connection_id="slow", session_id="match", player_id="b", socket=SlowSocket())
        await adapter.connect(connection_id="good", session_id="match", player_id="a", socket=good)
        async def blocked_projection(state):
            await asyncio.Event().wait()
        destroy_core(session.engine, "b")
        runner = PvPTickRunner(s, adapter, match_finished_callback=blocked_projection, completion_timeout_seconds=.02)
        await asyncio.wait_for(runner.run_single_tick("match"), timeout=.5)
        assert any(m["type"] == "match_finished" for m in good.sent)
        assert runner.stats_for("match").match_finished_callback_failures == 1
    asyncio.run(scenario())

def test_run_ticks_advances_engine_without_client_step():
    async def scenario():
        s,x=running_service()
        r=PvPTickRunner(s,PvPWebSocketAdapter(s))
        before=x.engine.state.tick
        assert await r.run_ticks("match",5)==5
        assert x.engine.state.tick==before+5
        assert x.engine.state.elapsed_ms==500
    asyncio.run(scenario())

def test_live_events_broadcast_to_connected_player():
    async def scenario():
        s,x=running_service(); a=PvPWebSocketAdapter(s); sock=FakeSocket()
        await a.connect(connection_id="c1",session_id="match",player_id="a",socket=sock)
        r=PvPTickRunner(s,a,snapshot_every_ticks=100)
        await r.run_single_tick("match")
        assert any(m["type"]=="events" for m in sock.sent)
    asyncio.run(scenario())

def test_snapshot_is_broadcast_on_configured_interval():
    async def scenario():
        s,x=running_service(); a=PvPWebSocketAdapter(s); sock=FakeSocket()
        await a.connect(connection_id="c1",session_id="match",player_id="a",socket=sock)
        r=PvPTickRunner(s,a,snapshot_every_ticks=2)
        assert await r.run_ticks("match",2)==2
        assert any(
            m["type"]=="snapshot" and m["request_id"]=="server-live-snapshot"
            for m in sock.sent
        )
    asyncio.run(scenario())

def test_live_event_cursor_prevents_duplicate_pushes():
    async def scenario():
        s,x=running_service(); a=PvPWebSocketAdapter(s); sock=FakeSocket()
        c=await a.connect(connection_id="c1",session_id="match",player_id="a",socket=sock)
        x.engine._emit("custom",{"value":1})
        assert await a.send_live_events("c1") is not None
        assert await a.send_live_events("c1") is None
        assert c.last_pushed_event_cursor==len(x.engine.state.events)
    asyncio.run(scenario())

def test_runner_stops_when_match_finished():
    async def scenario():
        s,x=running_service(); r=PvPTickRunner(s,PvPWebSocketAdapter(s))
        x.engine.state.status=BattleStatus.FINISHED
        assert await r.run_ticks("match",5)==0
    asyncio.run(scenario())


def test_terminal_result_is_broadcast_even_if_projection_callback_fails():
    async def scenario():
        service, session = running_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeSocket()
        await adapter.connect(
            connection_id="terminal",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        def failing_callback(_state):
            raise RuntimeError("projection unavailable")

        runner = PvPTickRunner(
            service,
            adapter,
            match_finished_callback=failing_callback,
        )
        destroy_core(session.engine, "b")
        assert await runner.run_single_tick("match") is True
        assert session.engine.state.status == BattleStatus.FINISHED
        assert any(message["type"] == "match_finished" for message in socket.sent)
        assert socket.closed is True
        assert runner.stats_for("match").match_finished_callback_failures == 1

    asyncio.run(scenario())


def test_runner_executes_marked_ai_player_decisions():
    async def scenario():
        service, session = running_service()
        engine = session.engine
        ai = engine.state.players["b"]
        opponent = engine.state.players["a"]
        ai.battle_pool = default_battle_pool()
        ai.circuit_credits = 1000

        armor = engine.grant_module("a", "a-armor", "armor")
        armor.status = ModuleStatus.ACTIVE
        armor.position = Position(1, 2)
        opponent.circuit_credits = 1000

        service.mark_ai_player("match", "b", first_decision_at_ms=0)
        before = sum(
            module.status == ModuleStatus.ACTIVE
            for module in ai.modules.values()
        )

        runner = PvPTickRunner(service, PvPWebSocketAdapter(service))
        assert await runner.run_single_tick("match") is True
        after = sum(
            module.status == ModuleStatus.ACTIVE
            for module in ai.modules.values()
        )
        assert runner.stats_for("match").ai_decisions == 1
        assert after == before + 1

    asyncio.run(scenario())
