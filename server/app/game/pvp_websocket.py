from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Protocol

from .pvp_protocol import protocol_error_envelope
from .pvp_protocol_handler import PvPProtocolHandler
from .pvp_session import PvPSessionError, PvPSessionService


class WebSocketConnection(Protocol):
    async def accept(self) -> None: ...
    async def receive_json(self) -> dict[str, Any]: ...
    async def send_json(self, data: dict[str, Any]) -> None: ...
    async def close(self, code: int = 1000) -> None: ...


@dataclass(slots=True)
class PvPConnection:
    connection_id: str
    session_id: str
    player_id: str
    socket: WebSocketConnection
    connected: bool = True
    messages_received: int = 0
    messages_sent: int = 0


@dataclass(slots=True)
class PvPConnectionRegistry:
    connections: dict[str, PvPConnection] = field(default_factory=dict)

    def bind(self, connection: PvPConnection) -> None:
        old = self.connections.get(connection.connection_id)
        if old is not None and old.connected:
            raise PvPSessionError(
                "Aynı bağlantı kimliği zaten aktif."
            )
        self.connections[connection.connection_id] = connection

    def get(self, connection_id: str) -> PvPConnection:
        try:
            return self.connections[connection_id]
        except KeyError as exc:
            raise PvPSessionError(
                "WebSocket bağlantısı bulunamadı."
            ) from exc

    def unbind(self, connection_id: str) -> PvPConnection:
        connection = self.get(connection_id)
        connection.connected = False
        return connection

    def active_for_player(
        self,
        session_id: str,
        player_id: str,
    ) -> tuple[PvPConnection, ...]:
        return tuple(
            connection
            for connection in self.connections.values()
            if connection.connected
            and connection.session_id == session_id
            and connection.player_id == player_id
        )


class PvPWebSocketAdapter:
    def __init__(
        self,
        service: PvPSessionService,
        registry: PvPConnectionRegistry | None = None,
    ):
        self.service = service
        self.handler = PvPProtocolHandler(service)
        self.registry = registry or PvPConnectionRegistry()

    async def connect(
        self,
        *,
        connection_id: str,
        session_id: str,
        player_id: str,
        socket: WebSocketConnection,
    ) -> PvPConnection:
        session = self.service.get_session(session_id)
        session.slot_for(player_id)

        await socket.accept()

        connection = PvPConnection(
            connection_id=connection_id,
            session_id=session_id,
            player_id=player_id,
            socket=socket,
        )
        self.registry.bind(connection)

        # Bağlantı açıldığında slot yeniden aktif kabul edilir.
        self.service.join(
            session_id,
            player_id,
        )

        return connection

    async def disconnect(
        self,
        connection_id: str,
        *,
        close_code: int = 1000,
    ) -> None:
        connection = self.registry.unbind(connection_id)

        # Aynı oyuncunun başka aktif bağlantısı yoksa slot disconnected olur.
        remaining = self.registry.active_for_player(
            connection.session_id,
            connection.player_id,
        )
        if not remaining:
            self.service.disconnect(
                connection.session_id,
                connection.player_id,
            )

        await connection.socket.close(
            code=close_code
        )

    async def connection_lost(
        self,
        connection_id: str,
    ) -> None:
        connection = self.registry.unbind(connection_id)

        remaining = self.registry.active_for_player(
            connection.session_id,
            connection.player_id,
        )
        if not remaining:
            self.service.disconnect(
                connection.session_id,
                connection.player_id,
            )

    async def handle_one(
        self,
        connection_id: str,
    ) -> dict[str, Any]:
        connection = self.registry.get(connection_id)
        if not connection.connected:
            raise PvPSessionError(
                "Kapalı WebSocket bağlantısı mesaj işleyemez."
            )

        try:
            raw = await connection.socket.receive_json()
            connection.messages_received += 1

            response = self.handler.handle(
                raw,
                authenticated_player_id=connection.player_id,
            )

        except Exception as exc:
            response = protocol_error_envelope(
                str(exc),
                code="transport_error",
            ).to_dict()

        await connection.socket.send_json(response)
        connection.messages_sent += 1
        return response

    async def serve(
        self,
        connection_id: str,
    ) -> None:
        connection = self.registry.get(connection_id)

        while connection.connected:
            try:
                await self.handle_one(
                    connection_id
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                # Gerçek taşıyıcı bağlantıyı kapatmış olabilir.
                break

    async def send_snapshot(
        self,
        connection_id: str,
        *,
        request_id: str = "server-snapshot",
    ) -> dict[str, Any]:
        connection = self.registry.get(connection_id)

        response = {
            "version": 1,
            "type": "snapshot",
            "request_id": request_id,
            "payload": self.service.snapshot(
                connection.session_id,
                connection.player_id,
            ),
        }

        await connection.socket.send_json(response)
        connection.messages_sent += 1
        return response

    async def send_events_since_ack(
        self,
        connection_id: str,
        *,
        request_id: str = "server-events",
    ) -> dict[str, Any]:
        connection = self.registry.get(connection_id)
        session = self.service.get_session(
            connection.session_id
        )
        slot = session.slot_for(
            connection.player_id
        )

        payload = self.service.events_since(
            connection.session_id,
            connection.player_id,
            slot.acknowledged_event_cursor,
        )

        response = {
            "version": 1,
            "type": "events",
            "request_id": request_id,
            "payload": payload,
        }

        await connection.socket.send_json(response)
        connection.messages_sent += 1
        return response
