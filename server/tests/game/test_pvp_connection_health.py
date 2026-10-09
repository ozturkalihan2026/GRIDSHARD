import asyncio
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter

class Clock:
    def __init__(self): self.value=100.0
    def now(self): return self.value
    def advance(self,s): self.value+=s

class FakeSocket:
    def __init__(self,incoming=None):
        self.incoming=list(incoming or []); self.sent=[]
    async def accept(self): pass
    async def receive_json(self): return self.incoming.pop(0)
    async def send_json(self,data): self.sent.append(data)
    async def close(self,code=1000): pass

def service():
    s=PvPSessionService(); s.create_session("m")
    s.join("m","a"); s.join("m","b"); s.start("m")
    return s

def test_heartbeat_updates_last_seen_and_echoes_foreign_clock_without_fake_rtt():
    async def scenario():
        c=Clock(); s=service()
        sock=FakeSocket([{
            "version":1,"type":"heartbeat","session_id":"m",
            "player_id":"a","request_id":"hb",
            "payload":{"sent_at_ms":1791400000000.0},
        }])
        a=PvPWebSocketAdapter(s,now_func=c.now,silent_timeout_seconds=12,grace_period_seconds=15)
        conn=await a.connect(connection_id="c1",session_id="m",player_id="a",socket=sock)
        c.advance(.125)
        r=await a.handle_one("c1")
        assert r["type"]=="heartbeat_ack"
        assert r["payload"]["sent_at_ms"] == 1791400000000.0
        assert not hasattr(conn, "last_rtt_ms")
        assert conn.last_seen_at==c.now()
    asyncio.run(scenario())

def test_silent_connection_enters_grace_instead_of_immediate_disconnect():
    async def scenario():
        c=Clock(); s=service()
        a=PvPWebSocketAdapter(s,now_func=c.now,silent_timeout_seconds=10,grace_period_seconds=15)
        await a.connect(connection_id="c1",session_id="m",player_id="a",socket=FakeSocket())
        c.advance(11)
        result=await a.sweep_connection_health()
        assert result["timed_out_connections"]==1
        assert s.get_session("m").slots["a"].connected is True
    asyncio.run(scenario())

def test_reconnect_inside_grace_cancels_pending_disconnect():
    async def scenario():
        c=Clock(); s=service()
        a=PvPWebSocketAdapter(
            s,now_func=c.now,
            silent_timeout_seconds=100,
            grace_period_seconds=15,
        )
        await a.connect(connection_id="c1",session_id="m",player_id="a",socket=FakeSocket())
        await a.connection_lost("c1")
        c.advance(5)
        await a.connect(connection_id="c2",session_id="m",player_id="a",socket=FakeSocket())
        c.advance(20)
        await a.sweep_connection_health()
        assert s.get_session("m").slots["a"].connected is True
        assert ("m","a") not in a.pending_disconnect_deadlines
    asyncio.run(scenario())

def test_grace_expiry_marks_player_disconnected():
    async def scenario():
        c=Clock(); s=service()
        a=PvPWebSocketAdapter(s,now_func=c.now,grace_period_seconds=15)
        await a.connect(connection_id="c1",session_id="m",player_id="a",socket=FakeSocket())
        await a.connection_lost("c1")
        c.advance(16)
        result=await a.sweep_connection_health()
        assert result["grace_expired_players"]==1
        assert s.get_session("m").slots["a"].connected is False
    asyncio.run(scenario())

def test_default_zero_grace_keeps_legacy_immediate_disconnect():
    async def scenario():
        s=service(); a=PvPWebSocketAdapter(s)
        await a.connect(connection_id="c1",session_id="m",player_id="a",socket=FakeSocket())
        await a.connection_lost("c1")
        assert s.get_session("m").slots["a"].connected is False
    asyncio.run(scenario())


def test_deleted_session_during_grace_does_not_kill_sweep():
    async def scenario():
        clock = Clock()
        s = service()
        adapter = PvPWebSocketAdapter(s, now_func=clock.now, grace_period_seconds=30)
        await adapter.connect(connection_id="c1", session_id="m", player_id="a", socket=FakeSocket())
        await adapter.connection_lost("c1")
        s.delete_session("m")  # TTL cleanup happens while grace is still pending.
        clock.advance(31)
        await adapter.sweep_connection_health()
        assert not adapter.pending_disconnect_deadlines
        await adapter.connection_lost("c1")  # Late route-finally is harmless too.
        await adapter.sweep_connection_health()
    asyncio.run(scenario())


def test_finished_transport_close_cannot_recreate_grace_deadline():
    from app.game.models import BattleStatus
    async def scenario():
        s = service()
        adapter = PvPWebSocketAdapter(s, grace_period_seconds=30)
        await adapter.connect(connection_id="c1", session_id="m", player_id="a", socket=FakeSocket())
        s.get_session("m").engine.state.status = BattleStatus.FINISHED
        await adapter.close_finished_session_connections("m")
        await adapter.connection_lost("c1")
        assert not adapter.pending_disconnect_deadlines
    asyncio.run(scenario())


def test_finished_ttl_300_intersects_old_disconnect_grace_30_safely():
    from app.game.models import BattleStatus
    async def scenario():
        clock = Clock()
        s = PvPSessionService(now_func=clock.now, finished_ttl_seconds=300)
        session = s.create_session("ttl-match")
        s.join("ttl-match", "a")
        s.join("ttl-match", "b")
        adapter = PvPWebSocketAdapter(s, now_func=clock.now, grace_period_seconds=30)
        await adapter.connect(connection_id="ttl-c", session_id="ttl-match", player_id="a", socket=FakeSocket())
        session.engine.state.status = BattleStatus.FINISHED
        session.finished_at = clock.now()
        clock.advance(295)
        await adapter.connection_lost("ttl-c")
        assert not adapter.pending_disconnect_deadlines
        # Also tolerate an old pending deadline created before the terminal
        # close, whose 30 seconds extend beyond the 300 second session TTL.
        adapter.pending_disconnect_deadlines[("ttl-match", "a")] = clock.now() + 30
        clock.advance(6)
        assert s.cleanup_expired_sessions() == ("ttl-match",)
        clock.advance(25)
        await adapter.sweep_connection_health()
        await adapter.sweep_connection_health()
        assert not adapter.pending_disconnect_deadlines
    asyncio.run(scenario())
