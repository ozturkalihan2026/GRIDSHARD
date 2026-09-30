from __future__ import annotations

import os
from urllib.parse import urlsplit
from uuid import uuid4

import pytest

from app.player_data_store import PlayerDataSnapshot
from app.postgres_repository import (
    MIGRATIONS_DIR,
    PostgresIdentityRepository,
    PostgresPlayerDataRepository,
    PostgresPool,
)
from app.schema_migrations import migration_status
from app.postgres_store_ledger import PostgresStoreLedgerRepository, StoreLedgerError


def _test_database_url() -> str:
    url = os.environ.get("GRIDSHARD_TEST_DATABASE_URL", "").strip()
    if not url:
        pytest.skip("İzole PostgreSQL test veritabanı tanımlı değil.")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.path != "/gridshard_test":
        pytest.fail("Test yalnız yerel gridshard_test veritabanında çalışabilir.")
    return url


def test_postgres_player_and_identity_round_trip_preserves_creation_time() -> None:
    pool = PostgresPool(_test_database_url(), min_size=1, max_size=2)
    pool.open()
    player_id = f"pg-test-{uuid4().hex}"
    identity = PostgresIdentityRepository(pool)
    players = PostgresPlayerDataRepository(pool)
    try:
        identity.create(player_id, {
            "salt": "test-salt",
            "verifier": "test-verifier",
            "devices": {},
        })
        with pool.connection() as connection:
            connection.execute(
                "UPDATE participant_identities SET created_at = TIMESTAMPTZ '2020-01-02 03:04:05+00' WHERE player_id = %s",
                (player_id,),
            )
        identity.update(player_id, {
            "salt": "new-test-salt",
            "verifier": "new-test-verifier",
            "devices": {"test-device": {"name": "local"}},
        })
        restored_identity = identity.get(player_id)
        assert restored_identity is not None
        assert restored_identity["created_at"] == 1577934245
        assert restored_identity["devices"]["test-device"]["name"] == "local"

        snapshot = PlayerDataSnapshot(
            player_id=player_id,
            profile={"display_name": f"Test {player_id}", "rating": 42},
            statistics={"wins": 3},
            settings={"language": "tr"},
        )
        players.save(snapshot)
        restored_player = players.load(player_id)
        assert restored_player is not None
        assert restored_player.profile == snapshot.profile
        assert restored_player.statistics == snapshot.statistics
        assert restored_player.settings == snapshot.settings
        assert players.health()["ready"] is True
    finally:
        players.delete(player_id)
        identity.delete(player_id)
        pool.close()


def test_social_schema_is_additive_and_ready() -> None:
    pool = PostgresPool(_test_database_url(), min_size=1, max_size=2)
    pool.open()
    try:
        expected = {
            "platform_accounts", "friend_requests", "friendships", "player_blocks",
            "direct_messages", "direct_message_reads", "notifications",
            "push_subscriptions", "player_reports", "invite_codes", "oauth_exchanges",
            "store_receipts", "store_notifications",
        }
        with pool.connection() as connection:
            rows = connection.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()"
            ).fetchall()
            status = migration_status(connection, MIGRATIONS_DIR)
        assert expected <= {row[0] for row in rows}
        assert status["latest_version"] == "004"
        assert status["ready"] is True
    finally:
        pool.close()


def test_store_ledger_is_idempotent_and_rejects_token_reuse() -> None:
    pool = PostgresPool(_test_database_url(), min_size=1, max_size=2)
    pool.open()
    ledger = PostgresStoreLedgerRepository(pool)
    suffix = uuid4().hex
    key = f"google_play:test-{suffix}"
    other_key = f"google_play:other-{suffix}"
    notification_id = f"test-{suffix}"
    token = f"token-{suffix}"
    receipt = {
        "provider": "google_play", "product_id": "test-product",
        "transaction_id": f"test-{suffix}", "granted": {"circuit_credits": 100},
        "environment": "Test", "purchased_at": "2026-09-29T00:00:00Z",
    }
    try:
        first = ledger.record(key, player_id="test-a", receipt=receipt, purchase_token=token)
        repeated = ledger.record(
            key, player_id="test-b",
            receipt={**receipt, "granted": {"circuit_credits": 999}},
            purchase_token=token,
        )
        assert repeated == first
        assert ledger.find("google_play", transaction_id=receipt["transaction_id"]) == first
        assert ledger.find("google_play", purchase_token=token) == first
        assert ledger.find("app_store", purchase_token=token) is None
        with pytest.raises(StoreLedgerError):
            ledger.record(other_key, player_id="test-b", receipt=receipt, purchase_token=token)
        assert ledger.get(other_key) is None

        ledger.mark_refunded(key, refunded=True, source="test", at="2026-09-29T01:00:00Z")
        changed = ledger.get(key)
        assert changed is not None
        assert changed["refunded"] is True
        assert changed["refund_history"][-1]["source"] == "test"

        assert ledger.notification_seen(notification_id) is False
        ledger.remember_notification(notification_id, seen_at=123)
        ledger.remember_notification(notification_id, seen_at=456)
        assert ledger.notification_seen(notification_id) is True
        with pool.connection() as connection:
            seen_at = connection.execute(
                "SELECT seen_at FROM store_notifications WHERE notification_id = %s",
                (notification_id,),
            ).fetchone()[0]
        assert seen_at == 123
    finally:
        with pool.connection() as connection:
            connection.execute("DELETE FROM store_receipts WHERE receipt_key IN (%s, %s)", (key, other_key))
            connection.execute("DELETE FROM store_notifications WHERE notification_id = %s", (notification_id,))
        pool.close()
