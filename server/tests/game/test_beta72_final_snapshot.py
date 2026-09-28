import asyncio

from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter


class RecordingSocket:
    def __init__(self):
        self.sent = []
        self.closed = False

    async def accept(self):
        pass

    async def receive_json(self):
        raise RuntimeError("unused")

    async def send_json(self, data):
        self.sent.append(data)

    async def close(self, code=1000):
        self.closed = True


def _running_match():
    service = PvPSessionService()
    session = service.create_session("final")
    for player_id in ("a", "b"):
        service.join("final", player_id)
        session.engine.grant_module(player_id, f"{player_id}-core", "core")
        session.engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 1)
    service.start("final")
    return service, session


def test_battle_finished_between_snapshot_ticks_still_sends_final_board():
    async def scenario():
        service, session = _running_match()
        adapter = PvPWebSocketAdapter(service)
        socket = RecordingSocket()
        await adapter.connect(
            connection_id="viewer",
            session_id="final",
            player_id="a",
            socket=socket,
        )
        for module in session.engine.state.players["b"].modules.values():
            if module.definition.id == "core":
                module.hp = 0
        runner = PvPTickRunner(service, adapter, snapshot_every_ticks=1000)

        await runner.run_single_tick("final")

        types = [message["type"] for message in socket.sent]
        assert "snapshot" in types and "match_finished" in types
        final_snapshot = max(index for index, kind in enumerate(types) if kind == "snapshot")
        assert final_snapshot < types.index("match_finished")
        assert socket.sent[final_snapshot]["payload"]["status"] == "finished"

    asyncio.run(scenario())
