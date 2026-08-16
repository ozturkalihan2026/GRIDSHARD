from __future__ import annotations

import asyncio
import time
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
    last_pushed_event_cursor: int = 0
    last_seen_at: float = 0.0
    last_rtt_ms: float | None = None


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
        *,
        now_func=time.monotonic,
        silent_timeout_seconds: float = 12.0,
        grace_period_seconds: float = 0.0,
    ):
        self.service = service
        self.handler = PvPProtocolHandler(service)
        self.registry = registry or PvPConnectionRegistry()
        self.now_func = now_func
        self.silent_timeout_seconds = silent_timeout_seconds
        self.grace_period_seconds = grace_period_seconds
        self.pending_disconnect_deadlines: dict[tuple[str,str],float] = {}

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
            last_seen_at=self.now_func(),
        )
        self.registry.bind(connection)

        # Bağlantı açıldığında slot yeniden aktif kabul edilir.
        self.service.join(
            session_id,
            player_id,
        )
        self.pending_disconnect_deadlines.pop(
            (session_id,player_id),
            None,
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
        if remaining:
            return

        if self.grace_period_seconds > 0:
            self.pending_disconnect_deadlines[
                (connection.session_id,connection.player_id)
            ] = self.now_func()+self.grace_period_seconds
            return

        self.service.disconnect(
            connection.session_id,
            connection.player_id,
        )

    def mark_seen(
        self,
        connection_id: str,
        *,
        heartbeat_sent_at_ms: float | None = None,
    ) -> None:
        connection=self.registry.get(connection_id)
        now=self.now_func()
        connection.last_seen_at=now
        if heartbeat_sent_at_ms is not None:
            connection.last_rtt_ms=max(
                0.0,
                (now*1000.0)-heartbeat_sent_at_ms,
            )

    async def sweep_connection_health(self) -> dict[str,int]:
        now=self.now_func()
        timed_out=0
        grace_expired=0

        for connection in list(self.registry.connections.values()):
            if not connection.connected:
                continue
            if now-connection.last_seen_at <= self.silent_timeout_seconds:
                continue
            await self.connection_lost(connection.connection_id)
            timed_out+=1

        for key,deadline in list(self.pending_disconnect_deadlines.items()):
            if now < deadline:
                continue
            session_id,player_id=key
            if not self.registry.active_for_player(session_id,player_id):
                self.service.disconnect(session_id,player_id)
                grace_expired+=1
            self.pending_disconnect_deadlines.pop(key,None)

        return {
            "timed_out_connections":timed_out,
            "grace_expired_players":grace_expired,
        }

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

            heartbeat_sent_at_ms=None
            if (
                isinstance(raw,dict)
                and raw.get("type")=="heartbeat"
                and isinstance(raw.get("payload"),dict)
            ):
                value=raw["payload"].get("sent_at_ms")
                if isinstance(value,(int,float)):
                    heartbeat_sent_at_ms=float(value)

            self.mark_seen(
                connection_id,
                heartbeat_sent_at_ms=heartbeat_sent_at_ms,
            )

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

    async def send_live_events(
        self,
        connection_id: str,
    ) -> dict[str, Any] | None:
        connection = self.registry.get(connection_id)
        page = self.service.events_since(
            connection.session_id,
            connection.player_id,
            connection.last_pushed_event_cursor,
        )
        if not page["events"]:
            return None
        response = {
            "version": 1,
            "type": "events",
            "request_id": "server-live-events",
            "payload": page,
        }
        await connection.socket.send_json(response)
        connection.messages_sent += 1
        connection.last_pushed_event_cursor = page["cursor"]
        return response

    async def broadcast_live_events(self, session_id: str) -> int:
        sent = 0
        for connection in list(self.registry.connections.values()):
            if not connection.connected or connection.session_id != session_id:
                continue
            if await self.send_live_events(connection.connection_id) is not None:
                sent += 1
        return sent

    async def broadcast_snapshot(self, session_id: str) -> int:
        sent = 0
        for connection in list(self.registry.connections.values()):
            if not connection.connected or connection.session_id != session_id:
                continue
            await self.send_snapshot(
                connection.connection_id,
                request_id="server-live-snapshot",
            )
            sent += 1
        return sent

    async def send_match_finished(
        self,
        connection_id: str,
    ) -> dict[str, Any]:
        connection = self.registry.get(connection_id)
        payload = self.service.final_result_payload(
            connection.session_id,
            connection.player_id,
        )
        response = {
            "version": 1,
            "type": "match_finished",
            "request_id": "server-match-finished",
            "payload": payload,
        }
        await connection.socket.send_json(response)
        connection.messages_sent += 1
        return response

    async def broadcast_match_finished(
        self,
        session_id: str,
    ) -> int:
        sent = 0
        for connection in list(
            self.registry.connections.values()
        ):
            if (
                not connection.connected
                or connection.session_id != session_id
            ):
                continue
            await self.send_match_finished(
                connection.connection_id
            )
            sent += 1
        return sent

    async def close_finished_session_connections(
        self,
        session_id: str,
        *,
        close_code: int = 1000,
    ) -> int:
        closed = 0
        session = self.service.get_session(
            session_id
        )

        for connection in list(
            self.registry.connections.values()
        ):
            if (
                not connection.connected
                or connection.session_id != session_id
            ):
                continue

            connection.connected = False
            await connection.socket.close(
                code=close_code
            )
            closed += 1

        for slot in session.slots.values():
            slot.connected = False

        for key in list(
            self.pending_disconnect_deadlines
        ):
            if key[0] == session_id:
                self.pending_disconnect_deadlines.pop(
                    key,
                    None,
                )

        return closed
