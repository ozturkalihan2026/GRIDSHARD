"""Read-only inventory for the SERVER-2/9 social/platform migration gate.

No defaults point at runtime files. This command never calls PostgresPool.open
(which applies migrations) and never prints personal or payment data.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.app.social_migration_audit import audit_legacy_social


STAGED_TABLES = (
    "platform_accounts",
    "friend_requests",
    "friendships",
    "player_blocks",
    "direct_messages",
    "direct_message_reads",
    "notifications",
    "push_subscriptions",
    "player_reports",
    "invite_codes",
    "oauth_exchanges",
    "store_receipts",
    "store_notifications",
    "social_operation_receipts",
    "social_battle_invites",
    "social_push_outbox",
)


def _reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate_json_key")
        result[key] = value
    return result


def _read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle, object_pairs_hook=_reject_duplicate_keys)
    if not isinstance(data, dict):
        raise ValueError("invalid_json_root")
    return data


def _read_postgres(database_url: str) -> tuple[dict, dict]:
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("psycopg_missing") from exc

    players: dict = {}
    table_counts: dict[str, int | None] = {}
    # A direct read-only connection is intentional: PostgresPool.open applies
    # pending schema migrations and is therefore unsuitable for an audit.
    with psycopg.connect(
        database_url,
        options="-c default_transaction_read_only=on",
        connect_timeout=5,
    ) as connection:
        connection.execute("SET TRANSACTION READ ONLY")
        present = connection.execute(
            "SELECT to_regclass('public.player_data') IS NOT NULL"
        ).fetchone()[0]
        if not present:
            raise ValueError("player_data_table_missing")
        for player_id, profile in connection.execute(
            "SELECT player_id, profile FROM public.player_data"
        ):
            players[player_id] = {"player_id": player_id, "profile": profile}
        for table in STAGED_TABLES:
            present = connection.execute(
                "SELECT to_regclass(%s) IS NOT NULL", (f"public.{table}",)
            ).fetchone()[0]
            # The identifier comes only from the fixed STAGED_TABLES tuple.
            table_counts[table] = (
                connection.execute(f"SELECT COUNT(*) FROM public.{table}").fetchone()[0]
                if present else None
            )
        connection.rollback()
    return players, table_counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    players = parser.add_mutually_exclusive_group(required=True)
    players.add_argument("--players-json", type=Path)
    players.add_argument(
        "--postgres-url-env",
        metavar="ENV_NAME",
        help="Read PostgreSQL player profiles via the named environment variable",
    )
    platform_source = parser.add_mutually_exclusive_group(required=True)
    platform_source.add_argument("--platform-json", type=Path)
    platform_source.add_argument(
        "--platform-empty", action="store_true",
        help="Explicitly treat the unavailable legacy platform snapshot as empty",
    )
    args = parser.parse_args()

    try:
        platform = {} if args.platform_empty else _read_json(args.platform_json)
        table_counts = None
        if args.players_json is not None:
            player_rows = _read_json(args.players_json)
            source = "json"
        else:
            database_url = os.environ.get(args.postgres_url_env)
            if not database_url:
                raise ValueError("postgres_url_env_missing")
            player_rows, table_counts = _read_postgres(database_url)
            source = "postgresql"
        report = audit_legacy_social(player_rows, platform)
        report["player_source"] = source
        report["platform_source"] = "declared_empty" if args.platform_empty else "json"
        if table_counts is not None:
            report["staged_postgres_table_counts"] = table_counts
            # Never interpret already populated destination tables as safe to
            # overwrite. A separate reconciliation plan is required.
            if any(value for value in table_counts.values() if value is not None):
                report["safe_to_migrate"] = False
                report["issues"]["nonempty_staged_tables"] = 1
    except Exception as exc:
        # Even database driver failures must not print DSNs, paths, duplicate
        # keys, or values from a personal-data snapshot.
        code = str(exc) if str(exc) in {
            "duplicate_json_key", "invalid_json_root", "psycopg_missing",
            "player_data_table_missing", "postgres_url_env_missing",
        } else "audit_input_unavailable"
        print(json.dumps({"read_only": True, "error_code": code}))
        return 2

    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0 if report["safe_to_migrate"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
