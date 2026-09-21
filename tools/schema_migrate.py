from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
MIGRATIONS = SERVER / "migrations"
sys.path.insert(0, str(SERVER))

from app.schema_migrations import (  # noqa: E402
    SchemaMigrationError,
    apply_pending_migrations,
    migration_status,
    rollback_latest_migration,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GRIDSHARD PostgreSQL şema migration aracı."
    )
    parser.add_argument("command", choices=("status", "check", "up", "down"))
    parser.add_argument(
        "--allow-destructive",
        action="store_true",
        help="Yalnız down komutunda veri değiştiren geri almayı açıkça onaylar.",
    )
    args = parser.parse_args()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        parser.error("DATABASE_URL zorunludur.")

    try:
        import psycopg
        with psycopg.connect(database_url) as connection:
            if args.command == "up":
                result = apply_pending_migrations(connection, MIGRATIONS)
            elif args.command == "down":
                result = rollback_latest_migration(
                    connection,
                    MIGRATIONS,
                    allow_destructive=args.allow_destructive,
                )
            else:
                result = migration_status(connection, MIGRATIONS)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if args.command == "check" and not result["ready"]:
            return 2
        return 0
    except (SchemaMigrationError, OSError, ValueError) as exc:
        print(f"Şema migration hatası: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
