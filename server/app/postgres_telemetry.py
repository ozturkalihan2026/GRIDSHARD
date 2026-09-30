"""Bounded PostgreSQL operational telemetry for a clean installation."""

from __future__ import annotations

from psycopg.types.json import Jsonb

from .telemetry import TelemetryError, TelemetryEvent


class PostgresTelemetryRepository:
    def __init__(self, pool, *, max_events: int = 50000):
        if max_events < 1:
            raise TelemetryError("Telemetri retention limiti en az 1 olmalıdır.")
        self.pool = pool
        self.max_events = int(max_events)

    def load(self) -> list[TelemetryEvent]:
        with self.pool.connection() as connection:
            rows = connection.execute(
                """SELECT event_id, event_type, timestamp_ms, player_id,
                          session_id, metadata FROM telemetry_events
                   ORDER BY sequence DESC LIMIT %s""",
                (self.max_events,),
            ).fetchall()
        return [
            TelemetryEvent(
                event_id=row[0], event_type=row[1], timestamp_ms=int(row[2]),
                player_id=row[3], session_id=row[4], metadata=dict(row[5]),
            ) for row in reversed(rows)
        ]

    def append(self, events: list[TelemetryEvent]) -> None:
        if not events:
            return
        with self.pool.connection() as connection:
            self._insert(connection, events)
            self._prune(connection)

    def save(self, events: list[TelemetryEvent]) -> None:
        with self.pool.connection() as connection:
            connection.execute("DELETE FROM telemetry_events")
            self._insert(connection, events[-self.max_events:])

    @staticmethod
    def _insert(connection, events: list[TelemetryEvent]) -> None:
        for event in events:
            connection.execute(
                """INSERT INTO telemetry_events
                   (event_id, event_type, timestamp_ms, player_id, session_id, metadata)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   ON CONFLICT (event_id) DO NOTHING""",
                (
                    event.event_id, event.event_type, event.timestamp_ms,
                    event.player_id, event.session_id, Jsonb(event.metadata),
                ),
            )

    def _prune(self, connection) -> None:
        cutoff = connection.execute(
            "SELECT sequence FROM telemetry_events ORDER BY sequence DESC OFFSET %s LIMIT 1",
            (self.max_events,),
        ).fetchone()
        if cutoff is not None:
            connection.execute("DELETE FROM telemetry_events WHERE sequence <= %s", (cutoff[0],))

    def clear(self) -> None:
        with self.pool.connection() as connection:
            connection.execute("DELETE FROM telemetry_events")

    def health(self) -> dict:
        try:
            with self.pool.connection() as connection:
                count = connection.execute("SELECT COUNT(*) FROM telemetry_events").fetchone()[0]
            return {
                "ready": True, "state": "ready", "backend": "postgresql",
                "event_count": int(count), "retention_limit": self.max_events,
                "retention_active": int(count) >= self.max_events, "error": None,
                "backup": {"available": False, "ready": False, "managed_by": "database_backup"},
            }
        except Exception:
            return {
                "ready": False, "state": "unavailable", "backend": "postgresql",
                "event_count": 0, "retention_limit": self.max_events,
                "retention_active": False, "error": "telemetry_database_unavailable",
                "backup": {"available": False, "ready": False, "managed_by": "database_backup"},
            }
