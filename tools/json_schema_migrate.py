"""Inspect and adopt JSON repository schemas without importing the game server.

Stop every process writing the same JSON files before running up/down.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.json_schema_migrations import (  # noqa: E402
    JsonSchemaMigrationError,
    JsonStoreSpec,
    apply_pending_migration,
    migration_status,
    rollback_latest_migration,
)


def resolve_stores(data_dir: Path, environment: dict[str, str]) -> dict[str, JsonStoreSpec]:
    player_path = Path(environment.get("RELAY_PLAYER_DATA_PATH") or data_dir / "web_test_players.json")
    postgres = bool(environment.get("DATABASE_URL", "").strip())
    paths = {
        "platform": (Path(environment.get("GRIDSHARD_PLATFORM_STATE_PATH") or data_dir / "platform_state.json"), dict),
        "telemetry": (Path(environment.get("RELAY_TELEMETRY_PATH") or data_dir / "web_test_telemetry.json"), list),
        "battle_pool_presets": (Path(environment.get("RELAY_BATTLE_POOL_PRESET_PATH") or player_path.with_name("web_test_battle_pool_presets.json")), dict),
        "balance_drafts": (Path(environment.get("RELAY_BALANCE_CHANGE_DRAFT_PATH") or player_path.with_name("web_test_balance_change_drafts.json")), dict),
        "teams": (Path(environment.get("RELAY_TEAM_DATA_PATH") or player_path.with_name("web_test_teams.json")), dict),
    }
    if not postgres:
        paths["identities"] = (Path(environment.get("GRIDSHARD_AUTH_IDENTITY_PATH") or data_dir / "player_identities.json"), dict)
        paths["players"] = (player_path, dict)
    resolved = {name: JsonStoreSpec(name, path.resolve(), root_type) for name, (path, root_type) in paths.items()}
    if len({spec.path for spec in resolved.values()}) != len(resolved):
        raise JsonSchemaMigrationError("İki JSON deposu aynı dosya yoluna ayarlanmış.")
    return resolved


def main() -> int:
    parser = argparse.ArgumentParser(description="GRIDSHARD JSON şema migration aracı")
    parser.add_argument("command", choices=("status", "check", "up", "down"))
    parser.add_argument("--data-dir", type=Path, default=ROOT / "server" / "data")
    parser.add_argument("--store", help="Yalnız belirtilen JSON deposu")
    parser.add_argument("--allow-destructive", action="store_true", help="Yalnız down için açık onay")
    args = parser.parse_args()
    try:
        stores = resolve_stores(args.data_dir, dict(os.environ))
    except JsonSchemaMigrationError as exc:
        parser.error(str(exc))
    if args.store and args.store not in stores:
        parser.error(f"Etkin olmayan/bilinmeyen depo: {args.store}. Seçenekler: {', '.join(sorted(stores))}")
    if args.command == "down" and not args.store:
        parser.error("down için tek bir --store seçimi zorunludur")
    if args.command != "down" and args.allow_destructive:
        parser.error("--allow-destructive yalnız down için kullanılır")
    selected = [stores[args.store]] if args.store else list(stores.values())
    try:
        # All stores are validated before the first write. A retry after an
        # interrupted multi-store up remains idempotent.
        before = [migration_status(spec) for spec in selected]
        if args.command in {"status", "check"}:
            result = before
        elif args.command == "up":
            result = [apply_pending_migration(spec) for spec in selected]
        else:
            result = [rollback_latest_migration(selected[0], allow_destructive=args.allow_destructive)]
    except (JsonSchemaMigrationError, OSError) as exc:
        print(f"JSON migration hatası: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"stores": result}, ensure_ascii=False, indent=2))
    return 1 if args.command == "check" and any(item["pending"] for item in result) else 0


if __name__ == "__main__":
    raise SystemExit(main())
