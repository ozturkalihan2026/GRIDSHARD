from __future__ import annotations

import os
from urllib.parse import urlsplit
from uuid import uuid4

import pytest

from app.player_data_store import PlayerDataSnapshot, PlayerDataStoreError
from app.postgres_repository import (
    MIGRATIONS_DIR,
    PostgresIdentityRepository,
    PostgresPlayerDataRepository,
    PostgresPool,
)
from app.schema_migrations import migration_status
from app.postgres_store_ledger import PostgresStoreLedgerRepository, StoreLedgerError
from app.postgres_social_transactions import (
    PostgresSocialTransactionRepository, SocialTransactionError,
)
from app.postgres_platform import PostgresPlatformService


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
        assert restored_player.revision == 1
        revised = PlayerDataSnapshot(
            player_id=player_id,
            profile={**snapshot.profile, "rating": 43},
            statistics=snapshot.statistics,
            settings=snapshot.settings,
            revision=restored_player.revision,
        )
        assert players.save(revised) == 2
        with pytest.raises(PlayerDataStoreError, match="eşzamanlı"):
            players.save(revised)
        assert players.load(player_id).profile["rating"] == 43
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
            "store_receipts", "store_notifications", "social_operation_receipts",
            "social_battle_invites", "social_push_outbox", "server_installation",
            "platform_document", "team_document", "battle_pool_presets",
            "product_analytics_document", "telemetry_events",
        }
        with pool.connection() as connection:
            rows = connection.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()"
            ).fetchall()
            status = migration_status(connection, MIGRATIONS_DIR)
        assert expected <= {row[0] for row in rows}
        assert status["latest_version"] == "012"
        assert status["ready"] is True
    finally:
        pool.close()


def test_store_profile_and_receipt_commit_or_rollback_together(tmp_path) -> None:
    pool = PostgresPool(_test_database_url(), min_size=1, max_size=2)
    pool.open()
    players = PostgresPlayerDataRepository(pool)
    platform = PostgresPlatformService(pool, path=tmp_path / "unused-platform.json")
    suffix = uuid4().hex
    player_id = f"store-atomic-{suffix}"
    key = f"google_play:store-atomic-{suffix}"
    snapshot = PlayerDataSnapshot(
        player_id=player_id,
        profile={"display_name": player_id, "circuit_credits": 150},
        statistics={}, settings={},
    )
    receipt = {
        "provider": "google_play", "product_id": "test-product",
        "transaction_id": f"store-atomic-{suffix}",
        "granted": {"circuit_credits": 100},
    }
    try:
        with pytest.raises(RuntimeError, match="abort"):
            with pool.transaction():
                with platform._lock:
                    players.save(snapshot)
                    platform.record_store_receipt(key, player_id=player_id, receipt=receipt)
                    raise RuntimeError("abort")
        assert players.load(player_id) is None
        assert platform.store_receipt(key) is None

        with pool.transaction():
            with platform._lock:
                players.save(snapshot)
                platform.record_store_receipt(key, player_id=player_id, receipt=receipt)
        assert players.load(player_id).profile["circuit_credits"] == 150
        assert platform.store_receipt(key)["player_id"] == player_id
        assert not (tmp_path / "unused-platform.json").exists()
    finally:
        players.delete(player_id)
        with platform._lock:
            data = platform._read()
            data.get("store_receipts", {}).pop(key, None)
            platform._write(data)
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


def test_social_pair_commit_and_idempotency_share_one_transaction() -> None:
    pool = PostgresPool(_test_database_url(), min_size=1, max_size=2)
    pool.open()
    suffix = uuid4().hex
    actor_id, target_id = f"social-a-{suffix}", f"social-b-{suffix}"
    op_request, op_accept, op_block, op_invite = (
        f"{name}-{suffix}" for name in ("request", "accept", "block", "invite")
    )
    players = PostgresPlayerDataRepository(pool)
    social = PostgresSocialTransactionRepository(pool)
    base_meta = {
        "friend_ids": [], "incoming_friend_request_ids": [],
        "outgoing_friend_request_ids": [], "blocked_player_ids": [],
        "circuit_credits": 17,
    }
    try:
        for player_id in (actor_id, target_id):
            players.save(PlayerDataSnapshot(
                player_id=player_id,
                profile={"display_name": player_id, "meta_progression_state": dict(base_meta)},
                statistics={}, settings={},
            ))
        first = social.apply_friend_operation("request", actor_id, target_id, op_request)
        assert first == {"transition": "pending_request", "changed": True, "replayed": False}
        assert social.apply_friend_operation("request", actor_id, target_id, op_request)["replayed"] is True
        with pool.connection() as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM friend_requests WHERE requester_id = %s AND recipient_id = %s",
                (actor_id, target_id),
            ).fetchone()[0] == 1
        social.apply_friend_operation("accept", target_id, actor_id, op_accept)
        assert target_id in players.load(actor_id).profile["meta_progression_state"]["friend_ids"]
        invitation = social.create_battle_invite(actor_id, target_id, op_invite)
        assert invitation["changed"] is True
        assert social.create_battle_invite(actor_id, target_id, op_invite)["replayed"] is True
        with pool.connection() as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM social_battle_invites WHERE invite_id = %s",
                (invitation["invite_id"],),
            ).fetchone()[0] == 1
            assert connection.execute(
                "SELECT COUNT(*) FROM social_push_outbox WHERE operation_id = %s", (op_invite,),
            ).fetchone()[0] == 1
        social.apply_friend_operation("block", actor_id, target_id, op_block)
        actor = players.load(actor_id).profile["meta_progression_state"]
        target = players.load(target_id).profile["meta_progression_state"]
        assert actor["blocked_player_ids"] == [target_id]
        assert actor["friend_ids"] == target["friend_ids"] == []
        assert actor["circuit_credits"] == 17
        with pool.connection() as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM friendships WHERE player_a_id = %s AND player_b_id = %s",
                tuple(sorted((actor_id, target_id))),
            ).fetchone()[0] == 0
            assert connection.execute(
                "SELECT account -> 'blocked_player_ids' FROM platform_accounts WHERE player_id = %s",
                (actor_id,),
            ).fetchone()[0] == [target_id]
        with pytest.raises(SocialTransactionError, match="blocked_relation"):
            social.apply_friend_operation("request", actor_id, target_id, f"failed-{suffix}")
        with pool.connection() as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM social_operation_receipts WHERE operation_id = %s",
                (f"failed-{suffix}",),
            ).fetchone()[0] == 0
    finally:
        with pool.connection() as connection:
            connection.execute("DELETE FROM social_push_outbox WHERE operation_id = %s", (op_invite,))
            connection.execute("DELETE FROM notifications WHERE player_id = %s", (target_id,))
            connection.execute(
                "DELETE FROM social_battle_invites WHERE challenger_id = %s AND opponent_id = %s",
                (actor_id, target_id),
            )
            connection.execute(
                "DELETE FROM social_operation_receipts WHERE operation_id IN (%s, %s, %s, %s, %s)",
                (op_request, op_accept, op_block, op_invite, f"failed-{suffix}"),
            )
            connection.execute(
                "DELETE FROM friend_requests WHERE requester_id IN (%s, %s) OR recipient_id IN (%s, %s)",
                (actor_id, target_id, actor_id, target_id),
            )
            connection.execute(
                "DELETE FROM friendships WHERE player_a_id IN (%s, %s) OR player_b_id IN (%s, %s)",
                (actor_id, target_id, actor_id, target_id),
            )
            connection.execute(
                "DELETE FROM player_blocks WHERE owner_id IN (%s, %s) OR target_id IN (%s, %s)",
                (actor_id, target_id, actor_id, target_id),
            )
            connection.execute("DELETE FROM platform_accounts WHERE player_id IN (%s, %s)", (actor_id, target_id))
        players.delete(actor_id)
        players.delete(target_id)
        pool.close()
