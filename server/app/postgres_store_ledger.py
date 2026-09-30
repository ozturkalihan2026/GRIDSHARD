"""Staged PostgreSQL store ledger; not wired to live purchases before migration.

This repository enforces receipt/token uniqueness. It does not make the player
balance update atomic by itself; SERVER-4 must join those writes in one
transaction before the production switch.
"""

from __future__ import annotations

import hashlib
from typing import Any

from .postgres_repository import PostgresPool, _load_psycopg


class StoreLedgerError(RuntimeError):
    pass


class PostgresStoreLedgerRepository:
    def __init__(self, pool: PostgresPool):
        self.database = pool
        _, self.Jsonb = _load_psycopg()

    @staticmethod
    def token_digest(purchase_token: str) -> str | None:
        token = str(purchase_token or "").strip()
        return hashlib.sha256(token.encode("utf-8")).hexdigest() if token else None

    @staticmethod
    def _entry(row: tuple | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {
            "key": row[0], "player_id": row[1], "provider": row[2],
            "product_id": row[3], "transaction_id": row[4],
            "granted": dict(row[5]), "environment": row[6],
            "purchased_at": row[7], "token_sha256": row[8] or "",
            "refunded": row[9], "refund_history": list(row[10]),
        }

    _SELECT = """
        SELECT receipt_key, player_id, provider, product_id, transaction_id,
               granted, environment, purchased_at, token_sha256, refunded,
               refund_history
        FROM store_receipts
    """

    def record(self, key: str, *, player_id: str, receipt: dict,
               purchase_token: str = "") -> dict:
        digest = self.token_digest(purchase_token)
        try:
            with self.database.connection() as connection:
                # A repeated request must return the original grant. Different
                # keys with the same token fail on the UNIQUE constraint.
                connection.execute(
                    """
                    INSERT INTO store_receipts
                        (receipt_key, player_id, provider, product_id,
                         transaction_id, granted, environment, purchased_at,
                         token_sha256)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (receipt_key) DO NOTHING
                    """,
                    (key, str(player_id), str(receipt.get("provider") or ""),
                     str(receipt.get("product_id") or ""),
                     str(receipt.get("transaction_id") or ""),
                     self.Jsonb(dict(receipt.get("granted") or {})),
                     str(receipt.get("environment") or ""),
                     str(receipt.get("purchased_at") or ""), digest),
                )
                row = connection.execute(
                    self._SELECT + " WHERE receipt_key = %s", (key,)
                ).fetchone()
        except Exception as exc:
            raise StoreLedgerError("Mağaza makbuzu PostgreSQL defterine yazılamadı.") from exc
        entry = self._entry(row)
        if entry is None:
            raise StoreLedgerError("Mağaza makbuzu kaydedilemedi.")
        return entry

    def get(self, key: str) -> dict | None:
        with self.database.connection() as connection:
            row = connection.execute(
                self._SELECT + " WHERE receipt_key = %s", (key,)
            ).fetchone()
        return self._entry(row)

    def find(self, provider: str, *, transaction_id: str = "",
             purchase_token: str = "") -> dict | None:
        digest = self.token_digest(purchase_token)
        if not transaction_id and not digest:
            return None
        with self.database.connection() as connection:
            if transaction_id:
                row = connection.execute(
                    self._SELECT + " WHERE receipt_key = %s AND provider = %s",
                    (f"{provider}:{transaction_id}", provider),
                ).fetchone()
            else:
                row = None
            if row is None and digest:
                row = connection.execute(
                    self._SELECT + " WHERE token_sha256 = %s AND provider = %s",
                    (digest, provider),
                ).fetchone()
        return self._entry(row)

    def mark_refunded(self, key: str, *, refunded: bool,
                      source: str, at: str) -> None:
        history_item = self.Jsonb({
            "refunded": bool(refunded), "source": str(source), "at": str(at),
        })
        with self.database.connection() as connection:
            connection.execute(
                """
                UPDATE store_receipts
                SET refunded = %s,
                    refund_history = (
                        SELECT COALESCE(jsonb_agg(value ORDER BY ordinal), '[]'::jsonb)
                        FROM (
                            SELECT value, ordinal
                            FROM jsonb_array_elements(refund_history || jsonb_build_array(%s))
                                WITH ORDINALITY AS entries(value, ordinal)
                            ORDER BY ordinal DESC LIMIT 10
                        ) recent
                    ),
                    updated_at = NOW()
                WHERE receipt_key = %s
                """,
                (bool(refunded), history_item, key),
            )

    def notification_seen(self, notification_id: str) -> bool:
        with self.database.connection() as connection:
            row = connection.execute(
                "SELECT 1 FROM store_notifications WHERE notification_id = %s",
                (notification_id,),
            ).fetchone()
        return row is not None

    def remember_notification(self, notification_id: str, *, seen_at: int) -> None:
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO store_notifications (notification_id, seen_at)
                VALUES (%s, %s) ON CONFLICT (notification_id) DO NOTHING
                """,
                (notification_id, int(seen_at)),
            )
