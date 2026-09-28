from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
sys.path.insert(0, str(SERVER))

from app.json_schema_migrations import (  # noqa: E402
    MIGRATIONS_DIR,
    JsonSchemaMigrationError,
    apply_pending_json_migrations,
    discover_json_migrations,
    json_store_paths,
    json_store_status,
    rollback_latest_json_migration,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GRIDSHARD JSON dosya deposu şema göç aracı."
    )
    parser.add_argument("command", choices=("status", "check", "up", "down"))
    parser.add_argument(
        "--store",
        help="Yalnız bu depo (down için zorunlu).",
    )
    parser.add_argument(
        "--allow-destructive",
        action="store_true",
        help="Yalnız down komutunda veri değiştiren geri almayı açıkça onaylar.",
    )
    args = parser.parse_args()
    if args.command == "down" and not args.store:
        parser.error("down için --store zorunludur.")

    if args.command != "down" and args.allow_destructive:
        parser.error("--allow-destructive yalnız down için kullanılır.")

    postgres = bool(os.environ.get("DATABASE_URL", "").strip())
    try:
        paths = json_store_paths(SERVER / "data", postgres=postgres)
    except JsonSchemaMigrationError as exc:
        parser.error(str(exc))
    if args.store and args.store not in paths:
        parser.error(f"Bu çalışma modunda {args.store} JSON deposu kullanılmıyor.")
    selected = {args.store: paths[args.store]} if args.store else paths

    try:
        discovered = discover_json_migrations(MIGRATIONS_DIR)
        # İlk yazımdan önce seçili bütün depoların geçmişi ve zinciri doğrulanır.
        before = {
            store: json_store_status(store, path, discovered.get(store, []))
            for store, path in selected.items()
        }
        results = {}
        for store, path in selected.items():
            migrations = discovered.get(store, [])
            if args.command == "up":
                results[store] = apply_pending_json_migrations(store, path, migrations)
            elif args.command == "down":
                results[store] = rollback_latest_json_migration(
                    store,
                    path,
                    migrations,
                    allow_destructive=args.allow_destructive,
                )
            else:
                results[store] = before[store]
        print(json.dumps(results, ensure_ascii=False, indent=2))
        # check: bekleyen göç veya değişmiş göç yedeği varsa çıkış kodu 2.
        if args.command == "check" and not all(
            item["ready"] and item["intact"] for item in results.values()
        ):
            return 2
        return 0
    except (JsonSchemaMigrationError, OSError, ValueError) as exc:
        print(f"JSON şema göç hatası: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
