"""Clean-install PostgreSQL team document with optimistic write protection."""

from __future__ import annotations

from copy import deepcopy

from psycopg.types.json import Jsonb

from .team_service import TeamServiceError


class PostgresTeamRepository:
    def __init__(self, pool):
        self.pool = pool

    def load(self) -> dict:
        with self.pool.connection() as connection:
            row = connection.execute(
                "SELECT state, revision FROM team_document WHERE singleton = TRUE"
            ).fetchone()
        if row is None:
            return {"teams": {}, "receipts": {}, "tournaments": {}, "_revision": 0}
        state, revision = row
        if not isinstance(state, dict):
            raise TeamServiceError("Takım veritabanı durumu geçersiz.")
        return {
            "teams": deepcopy(state.get("teams") or {}),
            "receipts": deepcopy(state.get("receipts") or {}),
            "tournaments": deepcopy(state.get("tournaments") or {}),
            "_revision": int(revision),
        }

    def save(self, payload: dict) -> None:
        if not isinstance(payload, dict) or type(payload.get("_revision")) is not int:
            raise TeamServiceError("Takım yazma sürümü eksik.")
        revision = payload["_revision"]
        state = {
            "teams": payload["teams"],
            "receipts": payload["receipts"],
            "tournaments": payload["tournaments"],
        }
        with self.pool.connection() as connection:
            if revision == 0:
                row = connection.execute(
                    """INSERT INTO team_document (singleton, state, revision)
                       VALUES (TRUE, %s, 1) ON CONFLICT (singleton) DO NOTHING
                       RETURNING revision""",
                    (Jsonb(state),),
                ).fetchone()
            else:
                row = connection.execute(
                    """UPDATE team_document SET state = %s, revision = revision + 1,
                           updated_at = NOW()
                       WHERE singleton = TRUE AND revision = %s RETURNING revision""",
                    (Jsonb(state), revision),
                ).fetchone()
            if row is None:
                raise TeamServiceError("Takım kaydı eşzamanlı değişti; işlemi yeniden dene.")
            payload["_revision"] = int(row[0])
