import asyncio
from app.game.models import Direction,BattleStatus
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter

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
        session.engine.grant_module(p,f"{p}-gen","generator")
        session.engine.set_initial_active_module(p,f"{p}-core",2,2)
        session.engine.set_initial_active_module(p,f"{p}-gen",2,3,Direction.UP)
    service.start("match")
    return service,session

def test_runner_interval_is_real_10hz():
    s,x=running_service()
    r=PvPTickRunner(s,PvPWebSocketAdapter(s))
    assert r.tick_interval_seconds==0.1

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
