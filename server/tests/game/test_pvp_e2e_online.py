import asyncio

from app.game.battle_pool import default_battle_pool
from app.game.engine import BATTLE_TIME_LIMIT_MS
from app.game.models import Direction
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_setup import (
    InitialModulePlacement,
    PvPSetupPayload,
)
from app.game.pvp_websocket import PvPWebSocketAdapter


class FakeSocket:
    def __init__(self):
        self.sent=[]
        self.closed=False
    async def accept(self): pass
    async def receive_json(self): raise RuntimeError("unused")
    async def send_json(self,data): self.sent.append(data)
    async def close(self,code=1000): self.closed=True


def payload(p):
    return PvPSetupPayload(
        battle_pool_ids=default_battle_pool().module_definition_ids,
        initial_modules=(
            InitialModulePlacement(f"{p}-core","core",2,2),
            InitialModulePlacement(f"{p}-gen","generator",2,3,Direction.UP),
            InitialModulePlacement(f"{p}-split","splitter",2,1,Direction.DOWN),
            InitialModulePlacement(f"{p}-laser","laser",1,1,Direction.RIGHT),
        ),
    )


def test_two_player_online_flow_reaches_server_authoritative_result():
    async def scenario():
        service=PvPSessionService()
        session=service.create_session(
            "e2e",
            setup_required=True,
            auto_start_when_ready=True,
        )

        for p in ("a","b"):
            service.join("e2e",p)
            service.submit_setup("e2e",p,payload(p))

        adapter=PvPWebSocketAdapter(service)
        sockets={}

        for p in ("a","b"):
            sockets[p]=FakeSocket()
            await adapter.connect(
                connection_id=f"c-{p}",
                session_id="e2e",
                player_id=p,
                socket=sockets[p],
            )

        service.set_ready("e2e","a",True)
        service.set_ready("e2e","b",True)
        assert session.engine.state.status.value=="running"

        session.engine.state.elapsed_ms=BATTLE_TIME_LIMIT_MS-100

        runner=PvPTickRunner(service,adapter)
        await runner.run_single_tick("e2e")

        assert session.engine.state.status.value=="finished"
        assert session.engine.state.finish_reason is not None
        assert session.engine.state.result_summary
        assert all(
            any(m["type"]=="match_finished" for m in sockets[p].sent)
            for p in ("a","b")
        )

    asyncio.run(scenario())
