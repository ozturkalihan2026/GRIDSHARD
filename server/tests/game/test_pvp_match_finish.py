import asyncio

from app.game.engine import BATTLE_TIME_LIMIT_MS
from app.game.models import Direction
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import (
    PvPSessionError,
    PvPSessionService,
)
from app.game.pvp_websocket import PvPWebSocketAdapter


class FakeSocket:
    def __init__(self):
        self.sent=[]
        self.closed=False
        self.close_code=None
    async def accept(self): pass
    async def receive_json(self): raise RuntimeError("unused")
    async def send_json(self,data): self.sent.append(data)
    async def close(self,code=1000):
        self.closed=True
        self.close_code=code


def running_match():
    service=PvPSessionService()
    session=service.create_session("m")
    for p in ("a","b"):
        service.join("m",p)
        session.engine.grant_module(p,f"{p}-core","core")
        session.engine.grant_module(p,f"{p}-gen","generator")
        session.engine.set_initial_active_module(
            p,f"{p}-core",2,2
        )
        session.engine.set_initial_active_module(
            p,f"{p}-gen",2,3,Direction.UP
        )
    service.start("m")
    return service,session


def test_final_result_rejected_before_finish():
    service,session=running_match()
    try:
        service.final_result_payload("m","a")
    except PvPSessionError:
        pass
    else:
        raise AssertionError("Bitmemiş maç sonucu reddedilmeliydi.")


def test_runner_broadcasts_final_result_and_closes_connections():
    async def scenario():
        service,session=running_match()
        adapter=PvPWebSocketAdapter(service)
        sockets={}

        for p in ("a","b"):
            sockets[p]=FakeSocket()
            await adapter.connect(
                connection_id=f"c-{p}",
                session_id="m",
                player_id=p,
                socket=sockets[p],
            )

        session.engine.state.elapsed_ms = (
            BATTLE_TIME_LIMIT_MS - 100
        )

        runner=PvPTickRunner(
            service,
            adapter,
            snapshot_every_ticks=1000,
        )
        await runner.run_single_tick("m")

        assert session.engine.state.status.value=="finished"
        for p in ("a","b"):
            assert any(
                message["type"]=="match_finished"
                for message in sockets[p].sent
            )
            assert sockets[p].closed is True
            assert session.slots[p].connected is False

        stats=runner.stats_for("m")
        assert stats.match_finished_broadcasts==2
        assert stats.closed_connections==2

    asyncio.run(scenario())


def test_reconnect_after_finish_contains_final_result():
    service,session=running_match()
    session.engine.state.elapsed_ms=BATTLE_TIME_LIMIT_MS-100
    session.engine.step()

    payload=service.reconnect_payload("m","a")

    assert payload["final_result"] is not None
    assert payload["final_result"]["status"]=="finished"
    assert (
        payload["final_result"]["finish_reason"]
        == session.engine.state.finish_reason
    )


def test_terminal_snapshot_keeps_server_result():
    service,session=running_match()
    session.engine.state.elapsed_ms=BATTLE_TIME_LIMIT_MS-100
    session.engine.step()

    snap=service.snapshot("m","a")

    assert snap["status"]=="finished"
    assert snap["finish_reason"] is not None
    assert (
        snap["result_summary"]["a"]
        == session.engine.state.result_summary["a"]
    )
    assert "circuit_credits" not in snap["result_summary"]["b"]
    assert "forfeit_credit_penalty" not in snap["result_summary"]["b"]
    assert (
        snap["result_summary"]["b"]["core_hp"]
        == session.engine.state.result_summary["b"]["core_hp"]
    )
