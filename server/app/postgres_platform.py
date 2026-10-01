"""PostgreSQL-backed platform service for a clean, single-worker install.

Every existing PlatformService operation holds one row lock for its complete
read-modify-write sequence. This removes runtime platform JSON files, but
player economy and social cross-document transactions still need SERVER-2/4.
"""

from __future__ import annotations

from pathlib import Path
import sys
from threading import local

from psycopg.types.json import Jsonb

from .platform_services import PlatformService, PlatformServiceError


class _PostgresPlatformLock:
    def __init__(self, pool):
        self.pool = pool
        self.state = local()

    def __enter__(self):
        depth = getattr(self.state, "depth", 0)
        if depth == 0:
            context = self.pool.connection()
            connection = context.__enter__()
            try:
                connection.execute(
                    "INSERT INTO platform_document (singleton) VALUES (TRUE) "
                    "ON CONFLICT (singleton) DO NOTHING"
                )
                connection.execute(
                    "SELECT state FROM platform_document WHERE singleton = TRUE FOR UPDATE"
                )
            except BaseException:
                context.__exit__(*sys.exc_info())
                raise
            self.state.context = context
            self.state.connection = connection
        self.state.depth = depth + 1
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        depth = self.state.depth - 1
        self.state.depth = depth
        if depth == 0:
            context = self.state.context
            del self.state.context
            del self.state.connection
            return context.__exit__(exc_type, exc_value, traceback)
        return False

    def connection(self):
        connection = getattr(self.state, "connection", None)
        if connection is None:
            raise PlatformServiceError("Platform işlemi transaction dışında çağrılamaz.")
        return connection


class PostgresPlatformService(PlatformService):
    def __init__(self, pool, *, path: Path, **kwargs):
        super().__init__(path, **kwargs)
        self._lock = _PostgresPlatformLock(pool)

    def _read(self) -> dict:
        row = self._lock.connection().execute(
            "SELECT state FROM platform_document WHERE singleton = TRUE"
        ).fetchone()
        if row is None or not isinstance(row[0], dict):
            raise PlatformServiceError("Platform veritabanı durumu geçersiz.")
        base = self._empty()
        base.update(row[0])
        return base

    def _write(self, data: dict) -> None:
        if not isinstance(data, dict):
            raise PlatformServiceError("Platform veritabanı durumu geçersiz.")
        self._lock.connection().execute(
            "UPDATE platform_document SET state = %s, updated_at = NOW() WHERE singleton = TRUE",
            (Jsonb(data),),
        )

    def sync_social_blocks(self, blocks_by_player: dict[str, list[str]]) -> None:
        """Mirror canonical profile blocks, preserving every other account field.

        The caller holds the platform lock before player row locks and shares
        its outer database transaction with the social repository.
        """
        with self._lock:
            data = self._read()
            changed = False
            for player_id, blocked_ids in blocks_by_player.items():
                account = self._account(data, player_id)
                values = sorted(set(blocked_ids))
                if account.get("blocked_player_ids", []) != values:
                    account["blocked_player_ids"] = values
                    changed = True
            if changed:
                self._write(data)
