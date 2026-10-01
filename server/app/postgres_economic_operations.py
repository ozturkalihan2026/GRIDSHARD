"""Permanent economic deduplication; no stale profile snapshots are replayed."""

from copy import deepcopy
import hashlib
import json

from psycopg.types.json import Jsonb


class EconomicOperationConflict(ValueError):
    pass


class PostgresEconomicOperations:
    def __init__(self, pool):
        self.pool = pool

    def begin(self, player_id, request_id, kind, payload):
        if not self.pool.in_transaction:
            raise RuntimeError("Ekonomi makbuzu profil işlemi içinde yazılmalıdır.")
        key = hashlib.sha256(request_id.strip().encode("utf-8")).hexdigest()
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()
        with self.pool.connection() as connection:
            inserted = connection.execute(
                "INSERT INTO player_economic_operations (player_id, request_hash, operation_kind, payload_hash) "
                "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING request_hash",
                (player_id, key, kind, digest),
            ).fetchone()
            if inserted:
                return key, None
            previous = connection.execute(
                "SELECT operation_kind, payload_hash, outcome FROM player_economic_operations "
                "WHERE player_id = %s AND request_hash = %s FOR UPDATE", (player_id, key),
            ).fetchone()
            if previous[0] != kind or previous[1] != digest:
                raise EconomicOperationConflict("Talep kimliği farklı bir ekonomi işlemine ait.")
            if previous[2] is None:
                raise RuntimeError("Eksik ekonomi makbuzu; işlem güvenle yeniden uygulanamaz.")
            return key, deepcopy(previous[2])

    def complete(self, player_id, key, response, layout):
        # Balances/inventory/profile are refreshed at replay time. Only the
        # original award facts (including random chest contents) are retained.
        receipts = {name: value for name, value in response.items()
                    if name == "receipt" or name.endswith("_receipt") or name.endswith("_receipts")}
        outcome = {"layout": layout, "receipts": receipts,
                   "with_profile": "profile" in response}
        with self.pool.connection() as connection:
            connection.execute(
                "UPDATE player_economic_operations SET outcome = %s WHERE player_id = %s AND request_hash = %s",
                (Jsonb(outcome), player_id, key),
            )
