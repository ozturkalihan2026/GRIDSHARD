from __future__ import annotations

from pathlib import Path
from contextlib import contextmanager, nullcontext
from threading import local
from typing import Any

from .auth import AuthenticationError
from .display_names import DisplayNameError, ensure_display_name_available
from .player_data_store import PlayerDataSnapshot, PlayerDataStoreError
from .schema_migrations import apply_pending_migrations


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def _load_psycopg():
    try:
        from psycopg.types.json import Jsonb
        from psycopg_pool import ConnectionPool
    except ImportError as exc:
        raise RuntimeError(
            "PostgreSQL için psycopg[pool] kurulmalıdır."
        ) from exc
    return ConnectionPool, Jsonb


class PostgresPool:
    def __init__(
        self,
        database_url: str,
        *,
        min_size: int = 1,
        max_size: int = 8,
        max_waiting: int = 64,
    ):
        ConnectionPool, _ = _load_psycopg()
        self.pool = ConnectionPool(
            database_url,
            min_size=min_size,
            max_size=max_size,
            max_waiting=max_waiting,
            timeout=5.0,
            open=False,
            name="gridshard-player-data",
        )
        self._opened = False
        self._transaction_state = local()

    def open(self) -> None:
        if self._opened:
            return
        self.pool.open(wait=True, timeout=10.0)
        try:
            with self.pool.connection() as connection:
                apply_pending_migrations(connection, MIGRATIONS_DIR)
        except Exception:
            self.pool.close(timeout=5.0)
            raise
        self._opened = True

    def close(self) -> None:
        if self._opened:
            self.pool.close(timeout=5.0)
            self._opened = False

    def connection(self):
        active = getattr(self._transaction_state, "connection", None)
        if active is not None:
            return nullcontext(active)
        if not self._opened:
            self.open()
        return self.pool.connection()

    @contextmanager
    def transaction(self):
        """Share one PostgreSQL transaction across repository calls on this thread.

        Callers must let failures escape this scope so the outer connection
        context rolls back all player and platform writes together.
        """
        if getattr(self._transaction_state, "connection", None) is not None:
            raise RuntimeError("İç içe PostgreSQL transaction desteklenmez.")
        if not self._opened:
            self.open()
        with self.pool.connection() as connection:
            self._transaction_state.connection = connection
            try:
                yield connection
            finally:
                del self._transaction_state.connection

    @property
    def in_transaction(self) -> bool:
        return getattr(self._transaction_state, "connection", None) is not None

    @contextmanager
    def joined_transaction(self):
        """Compose a domain operation with an existing outer unit of work.

        Unlike transaction(), this deliberately does not own a nested commit.
        Exceptions must propagate to the outer owner for rollback.
        """
        if self.in_transaction:
            yield self._transaction_state.connection
        else:
            with self.transaction() as connection:
                yield connection

    def health(self) -> dict:
        try:
            with self.connection() as connection:
                row = connection.execute(
                    "SELECT COUNT(*) FROM player_data"
                ).fetchone()
            return {
                "ready": True,
                "state": "ready",
                "backend": "postgresql",
                "player_count": int(row[0]),
                "error": None,
                "pool": self.pool.get_stats(),
            }
        except Exception as exc:
            return {
                "ready": False,
                "state": "unavailable",
                "backend": "postgresql",
                "player_count": 0,
                "error": str(exc),
                "pool": self.pool.get_stats(),
            }


class PostgresPlayerDataRepository:
    def __init__(self, pool: PostgresPool):
        self.database = pool
        _, self.Jsonb = _load_psycopg()

    def save(self, snapshot: PlayerDataSnapshot) -> int:
        try:
            with self.database.connection() as connection:
                # All profile writers share this transaction lock, including
                # separate workers. A check followed by an unlocked UPSERT
                # would allow two accounts to claim the same name.
                connection.execute("SELECT pg_advisory_xact_lock(71407101)")
                previous = connection.execute(
                    "SELECT profile ->> 'display_name' FROM player_data WHERE player_id = %s",
                    (snapshot.player_id,),
                ).fetchone()
                name = str(snapshot.profile.get("display_name", snapshot.player_id))
                if previous is None or previous[0] != name:
                    names = connection.execute(
                        "SELECT player_id, profile ->> 'display_name' FROM player_data"
                    ).fetchall()
                    ensure_display_name_available(
                        snapshot.player_id, name,
                        ((str(owner), str(other or owner)) for owner, other in names),
                        previous_name=previous[0] if previous else None,
                    )
                values = (
                    snapshot.player_id,
                    self.Jsonb(snapshot.profile),
                    self.Jsonb(snapshot.statistics),
                    self.Jsonb(snapshot.settings),
                )
                if snapshot.revision is None:
                    row = connection.execute(
                        """INSERT INTO player_data (player_id, profile, statistics, settings)
                           VALUES (%s, %s, %s, %s)
                           ON CONFLICT (player_id) DO NOTHING RETURNING revision""",
                        values,
                    ).fetchone()
                else:
                    row = connection.execute(
                        """UPDATE player_data
                           SET profile = %s, statistics = %s, settings = %s,
                               revision = revision + 1, updated_at = NOW()
                           WHERE player_id = %s AND revision = %s
                           RETURNING revision""",
                        (values[1], values[2], values[3], snapshot.player_id, snapshot.revision),
                    ).fetchone()
                if row is None:
                    raise PlayerDataStoreError(
                        "Oyuncu kaydı eşzamanlı değişti; yeniden yükleyip deneyin."
                    )
                return int(row[0])
        except DisplayNameError:
            raise
        except PlayerDataStoreError:
            raise
        except Exception as exc:
            raise PlayerDataStoreError("PostgreSQL oyuncu verisi yazılamadı.") from exc

    def load(self, player_id: str) -> PlayerDataSnapshot | None:
        try:
            with self.database.connection() as connection:
                row = connection.execute(
                    """
                    SELECT player_id, profile, statistics, settings, revision
                    FROM player_data
                    WHERE player_id = %s
                    """,
                    (player_id,),
                ).fetchone()
        except Exception as exc:
            raise PlayerDataStoreError("PostgreSQL oyuncu verisi okunamadı.") from exc
        if row is None:
            return None
        return PlayerDataSnapshot(
            player_id=str(row[0]),
            profile=dict(row[1]),
            statistics=dict(row[2]),
            settings=dict(row[3]),
            revision=int(row[4]),
        )

    def list_snapshots(self) -> list[PlayerDataSnapshot]:
        try:
            with self.database.connection() as connection:
                rows = connection.execute(
                    """
                    SELECT player_id, profile, statistics, settings, revision
                    FROM player_data
                    ORDER BY updated_at DESC
                    """
                ).fetchall()
        except Exception as exc:
            raise PlayerDataStoreError("PostgreSQL oyuncu verileri okunamadı.") from exc
        return [
            PlayerDataSnapshot(
                player_id=str(row[0]),
                profile=dict(row[1]),
                statistics=dict(row[2]),
                settings=dict(row[3]),
                revision=int(row[4]),
            )
            for row in rows
        ]

    def delete(self, player_id: str) -> bool:
        try:
            with self.database.connection() as connection:
                cursor = connection.execute(
                    "DELETE FROM player_data WHERE player_id = %s",
                    (player_id,),
                )
                return cursor.rowcount > 0
        except Exception as exc:
            raise PlayerDataStoreError("PostgreSQL oyuncu verisi silinemedi.") from exc

    def health(self) -> dict:
        return self.database.health()

    def backup_health(self) -> dict:
        return {
            "available": False,
            "ready": False,
            "backend": "postgresql",
            "managed_externally": True,
            "error": None,
        }

    def restore_backup(self) -> bool:
        return False


class PostgresIdentityRepository:
    def __init__(self, pool: PostgresPool):
        self.database = pool

    def get(self, player_id: str) -> dict[str, Any] | None:
        try:
            with self.database.connection() as connection:
                row = connection.execute(
                    """
                    SELECT salt, verifier, devices,
                           EXTRACT(EPOCH FROM created_at)::BIGINT
                    FROM participant_identities
                    WHERE player_id = %s
                    """,
                    (player_id,),
                ).fetchone()
        except Exception as exc:
            raise AuthenticationError("PostgreSQL kimlik kaydı okunamadı.") from exc
        if row is None:
            return None
        return {
            "salt": row[0],
            "verifier": row[1],
            "devices": dict(row[2] or {}),
            "created_at": int(row[3]),
        }

    def create(self, player_id: str, record: dict) -> None:
        _, Jsonb = _load_psycopg()
        try:
            with self.database.connection() as connection:
                connection.execute(
                    """
                    INSERT INTO participant_identities
                        (player_id, salt, verifier, devices)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        player_id,
                        str(record["salt"]),
                        str(record["verifier"]),
                        Jsonb(dict(record.get("devices") or {})),
                    ),
                )
        except Exception as exc:
            raise AuthenticationError("Oyuncu kimliği zaten kayıtlı veya yazılamadı.") from exc

    def update(self, player_id: str, record: dict) -> None:
        _, Jsonb = _load_psycopg()
        try:
            with self.database.connection() as connection:
                cursor = connection.execute(
                    """
                    UPDATE participant_identities
                    SET salt = %s, verifier = %s, devices = %s
                    WHERE player_id = %s
                    """,
                    (
                        str(record["salt"]),
                        str(record["verifier"]),
                        Jsonb(dict(record.get("devices") or {})),
                        player_id,
                    ),
                )
                if cursor.rowcount < 1:
                    raise AuthenticationError("Oyuncu kimliği bulunamadı.")
        except AuthenticationError:
            raise
        except Exception as exc:
            raise AuthenticationError("PostgreSQL kimlik kaydı güncellenemedi.") from exc

    def delete(self, player_id: str) -> bool:
        try:
            with self.database.connection() as connection:
                cursor = connection.execute(
                    "DELETE FROM participant_identities WHERE player_id = %s",
                    (player_id,),
                )
                return cursor.rowcount > 0
        except Exception as exc:
            raise AuthenticationError("PostgreSQL kimlik kaydı silinemedi.") from exc
