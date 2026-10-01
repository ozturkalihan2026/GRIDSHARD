"""Fail-closed boundary for a new installation with no legacy player import.

The first production boot accepts only an empty PostgreSQL application schema
and an empty, dedicated runtime directory. Later boots must present the same
installation identity in both places. This never deletes or imports records.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Mapping
from uuid import uuid4


MARKER_NAME = ".gridshard-installation.json"
PERSISTENT_TABLES = (
    "player_data", "participant_identities", "platform_accounts",
    "friend_requests", "friendships", "player_blocks", "direct_messages",
    "direct_message_reads", "notifications", "push_subscriptions",
    "player_reports", "invite_codes", "oauth_exchanges", "store_receipts",
    "store_notifications", "social_operation_receipts", "social_battle_invites",
    "social_push_outbox",
    "platform_document", "team_document", "battle_pool_presets",
    "product_analytics_document",
    "telemetry_events",
    "battle_results", "battle_participant_results",
    "player_economic_operations",
)


class CleanInstallError(RuntimeError):
    pass


def runtime_data_directory(
    source_data_dir: Path, mode: str, environ: Mapping[str, str],
) -> Path:
    """Keep production state away from packaged static assets and old JSON."""
    configured = environ.get("GRIDSHARD_RUNTIME_DATA_DIR", "").strip()
    if not configured:
        if mode == "production":
            raise CleanInstallError("Üretimde GRIDSHARD_RUNTIME_DATA_DIR zorunludur.")
        return source_data_dir
    path = Path(configured)
    if not path.is_absolute():
        raise CleanInstallError("Çalışma zamanı veri dizini mutlak yol olmalıdır.")
    resolved = path.resolve()
    if mode == "production" and resolved.is_relative_to(source_data_dir.resolve().parents[1]):
        raise CleanInstallError("Üretim veri dizini proje kaynak ağacının dışında olmalıdır.")
    return resolved


def require_runtime_store_path(path: Path, runtime_dir: Path, mode: str) -> Path:
    resolved = Path(path).resolve()
    if mode == "production" and not resolved.is_relative_to(runtime_dir.resolve()):
        raise CleanInstallError("Üretim veri deposu ayrılmış çalışma zamanı dizininin dışında olamaz.")
    return resolved


def ensure_clean_postgres_installation(pool) -> str:
    """Claim a fresh database once; refuse an unclaimed database with any data."""
    with pool.connection() as connection:
        connection.execute("SELECT pg_advisory_xact_lock(7142662901390354521)")
        row = connection.execute(
            "SELECT installation_id FROM server_installation WHERE singleton = TRUE"
        ).fetchone()
        if row is not None:
            return str(row[0])
        for table in PERSISTENT_TABLES:
            # Identifiers come exclusively from the fixed tuple above.
            occupied = connection.execute(
                f"SELECT EXISTS (SELECT 1 FROM public.{table} LIMIT 1)"
            ).fetchone()[0]
            if occupied:
                raise CleanInstallError(
                    "Mevcut kayıt içeren veritabanı temiz kurulum olarak kullanılamaz."
                )
        installation_id = str(uuid4())
        connection.execute(
            "INSERT INTO server_installation (singleton, installation_id) VALUES (TRUE, %s::uuid)",
            (installation_id,),
        )
        return installation_id


def ensure_clean_runtime_directory(runtime_dir: Path, installation_id: str) -> None:
    """Bind a dedicated runtime volume to its database; never clear old files."""
    path = Path(runtime_dir)
    marker = path / MARKER_NAME
    if marker.exists():
        try:
            payload = json.loads(marker.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CleanInstallError("Kurulum kimliği okunamadı.") from exc
        if not isinstance(payload, dict) or payload.get("installation_id") != installation_id:
            raise CleanInstallError("Veri dizini bu veritabanı kurulumuna ait değil.")
        return
    if path.exists() and any(path.iterdir()):
        raise CleanInstallError("Veri dizini boş değil; eski kayıtlar otomatik taşınamaz.")
    path.mkdir(parents=True, exist_ok=True)
    try:
        with marker.open("x", encoding="utf-8") as handle:
            json.dump({"installation_id": installation_id}, handle, sort_keys=True)
            handle.flush()
            os.fsync(handle.fileno())
    except FileExistsError:
        # Another first-boot process may have claimed the same empty volume.
        ensure_clean_runtime_directory(path, installation_id)
