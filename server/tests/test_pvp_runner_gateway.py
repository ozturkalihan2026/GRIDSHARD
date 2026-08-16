import asyncio
from app.game.models import Direction
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter

def test_ensure_started_is_idempotent():
    async def scenario():
        s=PvPSessionService(); x=s.create_session("m")
        for p in ("a","b"):
            s.join("m",p)
            x.engine.grant_module(p,f"{p}-core","core")
            x.engine.grant_module(p,f"{p}-gen","generator")
            x.engine.set_initial_active_module(p,f"{p}-core",2,2)
            x.engine.set_initial_active_module(p,f"{p}-gen",2,3,Direction.UP)
        s.start("m")
        async def controlled_sleep(_): await asyncio.sleep(0)
        r=PvPTickRunner(s,PvPWebSocketAdapter(s),sleep_func=controlled_sleep)
        await r.ensure_started("m")
        first=r._tasks["m"]
        await r.ensure_started("m")
        assert first is r._tasks["m"]
        await r.stop_session("m")
        assert r.is_running("m") is False
    asyncio.run(scenario())
