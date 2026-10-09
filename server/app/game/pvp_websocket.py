from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Protocol, Callable, Awaitable

from .pvp_protocol import protocol_error_envelope
from .pvp_protocol_handler import PvPProtocolHandler
from .pvp_session import PvPSessionError, PvPSessionService
from .models import BattleStatus


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
    recent_message_times: deque[float] = field(default_factory=deque)
    authorize: Callable[[], Awaitable[None]] | None = None
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    pending_broadcasts: set[str] = field(default_factory=set)
    broadcast_task: asyncio.Task | None = None
    coalesced_snapshots: int = 0


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

    def prune_disconnected(
        self,
        *,
        now: float,
        retention_seconds: float = 60.0,
    ) -> int:
        stale_ids = [
            connection_id
            for connection_id, connection in self.connections.items()
            if not connection.connected
            and now - connection.last_seen_at >= retention_seconds
        ]
        for connection_id in stale_ids:
            self.connections.pop(connection_id, None)
        return len(stale_ids)


class PvPWebSocketAdapter:
    def __init__(
        self,
        service: PvPSessionService,
        registry: PvPConnectionRegistry | None = None,
        *,
        now_func=time.monotonic,
        silent_timeout_seconds: float = 12.0,
        grace_period_seconds: float = 0.0,
        max_messages_per_second: int = 60,
        send_timeout_seconds: float = 2.0,
        background_broadcasts: bool = False,
    ):
        self.service = service
        self.handler = PvPProtocolHandler(service)
        self.registry = registry or PvPConnectionRegistry()
        self.now_func = now_func
        self.silent_timeout_seconds = silent_timeout_seconds
        self.grace_period_seconds = grace_period_seconds
        self.max_messages_per_second = max(1, int(max_messages_per_second))
        self.send_timeout_seconds = max(.01, float(send_timeout_seconds))
        self.background_broadcasts = background_broadcasts
        self.pending_disconnect_deadlines: dict[tuple[str,str],float] = {}

    async def connect(
        self,
        *,
        connection_id: str,
        session_id: str,
        player_id: str,
        socket: WebSocketConnection,
        authorize: Callable[[], Awaitable[None]] | None = None,
    ) -> PvPConnection:
        if authorize is not None:
            await authorize()
        session = self.service.get_session(session_id)
        session.slot_for(player_id)

        await socket.accept()

        connection = PvPConnection(
            connection_id=connection_id,
            session_id=session_id,
            player_id=player_id,
            socket=socket,
            last_seen_at=self.now_func(),
            authorize=authorize,
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
        connection.last_seen_at = self.now_func()
        await self._stop_broadcasts(connection)

        # Aynı oyuncunun başka aktif bağlantısı yoksa slot disconnected olur.
        remaining = self.registry.active_for_player(
            connection.session_id,
            connection.player_id,
        )
        if not remaining:
            try:
                self.service.disconnect(connection.session_id, connection.player_id)
            except PvPSessionError:
                pass  # Session retention can expire before transport teardown.

        await asyncio.wait_for(connection.socket.close(code=close_code), timeout=self.send_timeout_seconds)

    async def connection_lost(
        self,
        connection_id: str,
    ) -> None:
        connection = self.registry.get(connection_id)
        if not connection.connected:
            return
        self.registry.unbind(connection_id)
        connection.last_seen_at = self.now_func()
        await self._stop_broadcasts(connection)
        remaining = self.registry.active_for_player(
            connection.session_id,
            connection.player_id,
        )
        if remaining:
            return

        try:
            session = self.service.get_session(connection.session_id)
        except PvPSessionError:
            self.pending_disconnect_deadlines.pop((connection.session_id, connection.player_id), None)
            return
        if session.engine.state.status == BattleStatus.FINISHED:
            self.pending_disconnect_deadlines.pop((connection.session_id, connection.player_id), None)
            session.slot_for(connection.player_id).connected = False
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
    ) -> None:
        connection=self.registry.get(connection_id)
        now=self.now_func()
        connection.last_seen_at=now

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
            self.pending_disconnect_deadlines.pop(key,None)
            if not self.registry.active_for_player(session_id,player_id):
                try:
                    self.service.disconnect(session_id,player_id)
                except PvPSessionError:
                    continue  # Already deleted by the session TTL sweep.
                grace_expired+=1

        return {
            "timed_out_connections":timed_out,
            "grace_expired_players":grace_expired,
            "pruned_connections":self.registry.prune_disconnected(
                now=now,
            ),
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

        # Taşıyıcı kapanışları burada protokol hatasına çevrilmemelidir. Starlette,
        # kapanmış sokete tekrar send_json çağrılmasına izin vermez; hata üstteki
        # bağlantı yaşam döngüsüne kadar yükseltilir.
        raw = await connection.socket.receive_json()
        # Recheck after receiving: an idle connection may have been revoked or
        # its worker fenced while waiting for the next command.
        if connection.authorize is not None:
            await connection.authorize()
        if not connection.connected:
            raise PvPSessionError("Kapalı bağlantı mesaj işleyemez.")
        connection.messages_received += 1

        now = self.now_func()
        cutoff = now - 1.0
        while (
            connection.recent_message_times
            and connection.recent_message_times[0] <= cutoff
        ):
            connection.recent_message_times.popleft()
        if len(connection.recent_message_times) >= self.max_messages_per_second:
            response = protocol_error_envelope(
                "WebSocket mesaj hızı sınırı aşıldı.",
                code="rate_limited",
            ).to_dict()
            await self._send_response(connection, response)
            return response
        connection.recent_message_times.append(now)

        # Heartbeats echo the client's timestamp. Different machines' clocks
        # cannot be subtracted to infer RTT; the client measures the round trip.
        self.mark_seen(connection_id)

        response = self.handler.handle(
            raw,
            authenticated_player_id=connection.player_id,
            expected_session_id=connection.session_id,
        )

        await self._send_response(connection, response)
        return response

    async def _deliver_locked(self, connection: PvPConnection, response: dict) -> dict:
        if not connection.connected:
            raise PvPSessionError("Kapalı bağlantıya mesaj gönderilemez.")
        await asyncio.wait_for(connection.socket.send_json(response), timeout=self.send_timeout_seconds)
        connection.messages_sent += 1
        payload = response.get("payload", {})
        cursor = None
        if response.get("type") == "reconnect_state":
            cursor = payload.get("event_cursor")
        elif response.get("type") == "events":
            cursor = payload.get("cursor")
        if cursor is not None:
            # This is a delivered cursor, never an enqueue cursor.
            connection.last_pushed_event_cursor = max(connection.last_pushed_event_cursor, cursor)
        return response

    async def _send_response(self, connection: PvPConnection, response: dict) -> dict:
        async with connection.send_lock:
            return await self._deliver_locked(connection, response)

    async def send_reconnect_state(self, connection_id: str, *, request_id="server-connect") -> dict:
        connection = self.registry.get(connection_id)
        async with connection.send_lock:
            return await self._deliver_locked(connection, {
                "version": 1, "type": "reconnect_state", "request_id": request_id,
                "payload": self.service.reconnect_payload(connection.session_id, connection.player_id),
            })

    async def _stop_broadcasts(self, connection: PvPConnection) -> None:
        connection.pending_broadcasts.clear()
        task = connection.broadcast_task
        if task is not None and task is not asyncio.current_task():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    async def _pump_broadcasts(self, connection: PvPConnection) -> None:
        try:
            while connection.connected and connection.pending_broadcasts:
                pending = set(connection.pending_broadcasts)
                connection.pending_broadcasts.clear()
                if "events" in pending:
                    await self.send_live_events(connection.connection_id)
                if "snapshot" in pending:
                    await self.send_snapshot(connection.connection_id, request_id="server-live-snapshot")
        except asyncio.CancelledError:
            raise
        except Exception:
            await self.connection_lost(connection.connection_id)
            try:
                await asyncio.wait_for(connection.socket.close(code=1013), timeout=self.send_timeout_seconds)
            except Exception:
                pass  # Release a failed transport without delaying another socket.
        finally:
            if connection.broadcast_task is asyncio.current_task():
                connection.broadcast_task = None

    def _queue_broadcast(self, session_id: str, kind: str) -> int:
        queued = 0
        for connection in tuple(self.registry.connections.values()):
            if not connection.connected or connection.session_id != session_id:
                continue
            if kind == "snapshot" and kind in connection.pending_broadcasts:
                connection.coalesced_snapshots += 1
            # At most two dirty flags per socket, not one envelope per tick.
            # Build events/snapshots at delivery time from the latest state;
            # reliable events remain in the engine until successfully sent.
            connection.pending_broadcasts.add(kind)
            if connection.broadcast_task is None:
                connection.broadcast_task = asyncio.create_task(self._pump_broadcasts(connection))
            queued += 1
        return queued

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

        async with connection.send_lock:
            response = {
                "version": 1,
                "type": "snapshot",
                "request_id": request_id,
                "payload": self.service.snapshot(connection.session_id, connection.player_id),
            }

            return await self._deliver_locked(connection, response)

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

        await self._send_response(connection, response)
        return response

    async def send_live_events(
        self,
        connection_id: str,
    ) -> dict[str, Any] | None:
        connection = self.registry.get(connection_id)
        async with connection.send_lock:
            page = self.service.events_since(connection.session_id, connection.player_id, connection.last_pushed_event_cursor)
            if not page["events"]:
                # Invisible events still advance this socket's scan position.
                connection.last_pushed_event_cursor = page["cursor"]
                return None
            return await self._deliver_locked(connection, {
                "version": 1, "type": "events", "request_id": "server-live-events", "payload": page,
            })

    async def broadcast_live_events(self, session_id: str) -> int:
        if self.background_broadcasts:
            return self._queue_broadcast(session_id, "events")
        return await self._broadcast(session_id, self.send_live_events)

    async def _broadcast(self, session_id: str, send, **kwargs) -> int:
        async def deliver(connection):
            try:
                result = await asyncio.wait_for(
                    send(connection.connection_id, **kwargs), timeout=self.send_timeout_seconds,
                )
                return int(result is not None)
            except Exception:
                # A dead/slow socket must not stop the opponent's simulation.
                # The normal grace/reconnect path supplies authoritative state.
                await self.connection_lost(connection.connection_id)
                return 0
        connections = [c for c in list(self.registry.connections.values())
                       if c.connected and c.session_id == session_id]
        return sum(await asyncio.gather(*(deliver(c) for c in connections)))

    async def broadcast_snapshot(self, session_id: str) -> int:
        if self.background_broadcasts:
            return self._queue_broadcast(session_id, "snapshot")
        return await self._broadcast(session_id, self.send_snapshot, request_id="server-live-snapshot")

    async def send_match_finished(
        self,
        connection_id: str,
    ) -> dict[str, Any]:
        connection = self.registry.get(connection_id)
        # Terminal delivery drains this socket only. A slow opponent must not
        # postpone the healthy client's result. _broadcast bounds the drain.
        task = connection.broadcast_task
        if task is not None:
            try:
                await asyncio.shield(task)
            except asyncio.CancelledError:
                # Disconnect cancels the writer, not the terminal runner.
                # An actual cancellation of this sender must still propagate.
                if asyncio.current_task().cancelling():
                    raise
                if not connection.connected:
                    raise PvPSessionError("Sonuç gönderilirken bağlantı kapandı.") from None
                raise
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
        await self._send_response(connection, response)
        return response

    async def broadcast_match_finished(
        self,
        session_id: str,
    ) -> int:
        return await self._broadcast(session_id, self.send_match_finished)

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
            connection.last_seen_at = self.now_func()
            await self._stop_broadcasts(connection)
            try:
                await asyncio.wait_for(connection.socket.close(code=close_code), timeout=self.send_timeout_seconds)
            except Exception:
                pass  # A failed close must not prevent closing other sockets.
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
