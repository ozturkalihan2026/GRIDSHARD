import asyncio

import pytest

from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.game.pvp_websocket import (
    PvPConnectionRegistry,
    PvPWebSocketAdapter,
)


class FakeWebSocket:
    def __init__(self, incoming=None):
        self.incoming = list(incoming or [])
        self.sent = []
        self.accepted = False
        self.closed = False
        self.close_code = None

    async def accept(self):
        self.accepted = True

    async def receive_json(self):
        if not self.incoming:
            raise RuntimeError("fake socket empty")
        return self.incoming.pop(0)

    async def send_json(self, data):
        self.sent.append(data)

    async def close(self, code=1000):
        self.closed = True
        self.close_code = code


def setup_service():
    service = PvPSessionService()
    service.create_session("match")
    service.join("match", "a")
    service.join("match", "b")
    service.start("match")
    return service


def request_snapshot_message():
    return {
        "version": 1,
        "type": "request_snapshot",
        "session_id": "match",
        "player_id": "a",
        "request_id": "r1",
        "payload": {},
    }


def test_connect_accepts_socket_and_binds_identity():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        connection = await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        assert socket.accepted is True
        assert connection.player_id == "a"
        assert connection.session_id == "match"
        assert service.get_session("match").slots["a"].connected is True

    asyncio.run(scenario())


def test_connect_rejects_player_not_in_session():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        with pytest.raises(PvPSessionError):
            await adapter.connect(
                connection_id="c1",
                session_id="match",
                player_id="eve",
                socket=socket,
            )

    asyncio.run(scenario())


def test_duplicate_active_connection_id_is_rejected():
    async def scenario():
        service = setup_service()
        registry = PvPConnectionRegistry()
        adapter = PvPWebSocketAdapter(
            service,
            registry,
        )

        await adapter.connect(
            connection_id="same",
            session_id="match",
            player_id="a",
            socket=FakeWebSocket(),
        )

        with pytest.raises(PvPSessionError):
            await adapter.connect(
                connection_id="same",
                session_id="match",
                player_id="a",
                socket=FakeWebSocket(),
            )

    asyncio.run(scenario())


def test_handle_one_routes_message_through_protocol_handler():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket(
            [request_snapshot_message()]
        )

        connection = await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        response = await adapter.handle_one("c1")

        assert response["type"] == "snapshot"
        assert response["payload"]["viewer_player_id"] == "a"
        assert socket.sent[-1] == response
        assert connection.messages_received == 1
        assert connection.messages_sent == 1

    asyncio.run(scenario())


def test_transport_identity_cannot_be_spoofed():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)

        message = request_snapshot_message()
        message["player_id"] = "b"

        socket = FakeWebSocket([message])

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        response = await adapter.handle_one("c1")
        assert response["type"] == "error"

    asyncio.run(scenario())


def test_transport_disconnect_is_not_sent_back_to_closed_socket():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        with pytest.raises(RuntimeError, match="fake socket empty"):
            await adapter.handle_one("c1")
        assert socket.sent == []

    asyncio.run(scenario())


def test_disconnect_marks_slot_disconnected_when_last_socket_closes():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )
        await adapter.disconnect("c1")

        assert socket.closed is True
        assert service.get_session("match").slots["a"].connected is False

    asyncio.run(scenario())


def test_second_connection_keeps_player_connected_when_first_closes():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=FakeWebSocket(),
        )
        await adapter.connect(
            connection_id="c2",
            session_id="match",
            player_id="a",
            socket=FakeWebSocket(),
        )

        await adapter.disconnect("c1")

        assert service.get_session("match").slots["a"].connected is True

    asyncio.run(scenario())


def test_server_can_push_viewer_scoped_snapshot():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        response = await adapter.send_snapshot("c1")

        assert response["type"] == "snapshot"
        assert response["payload"]["viewer_player_id"] == "a"
        assert "circuit_credits" not in response["payload"]["players"]["b"]

    asyncio.run(scenario())


def test_server_can_push_events_from_ack_cursor():
    async def scenario():
        service = setup_service()
        adapter = PvPWebSocketAdapter(service)
        socket = FakeWebSocket()

        await adapter.connect(
            connection_id="c1",
            session_id="match",
            player_id="a",
            socket=socket,
        )

        baseline = len(
            service.get_session("match").engine.state.events
        )
        service.acknowledge_events(
            "match",
            "a",
            baseline,
        )
        service.get_session("match").engine._emit(
            "after-ack",
            {"value": 1},
        )

        response = await adapter.send_events_since_ack("c1")

        assert response["type"] == "events"
        assert len(response["payload"]["events"]) == 1
        assert response["payload"]["events"][0]["type"] == "after-ack"

    asyncio.run(scenario())
