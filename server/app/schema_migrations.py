from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import re


MIGRATION_PATTERN = re.compile(r"^(?P<version>\d{3})_[^.]+\.sql$")
MIGRATION_LOCK_ID = 4_752_419_621


class SchemaMigrationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class SchemaMigration:
    version: str
    name: str
    path: Path
    checksum: str
    down_path: Path | None

    @property
    def sql(self) -> str:
        return self.path.read_text(encoding="utf-8")


def discover_migrations(directory: Path) -> list[SchemaMigration]:
    directory = Path(directory)
    migrations: list[SchemaMigration] = []
    seen_versions: set[str] = set()
    for path in sorted(directory.glob("*.sql")):
        if path.name.endswith(".down.sql"):
            continue
        matched = MIGRATION_PATTERN.fullmatch(path.name)
        if not matched:
            continue
        version = matched.group("version")
        if version in seen_versions:
            raise SchemaMigrationError(
                f"Yinelenen şema migration sürümü: {version}."
            )
        seen_versions.add(version)
        payload = path.read_bytes()
        candidate_down = path.with_name(f"{path.stem}.down.sql")
        migrations.append(SchemaMigration(
            version=version,
            name=path.stem,
            path=path,
            checksum=hashlib.sha256(payload).hexdigest(),
            down_path=candidate_down if candidate_down.exists() else None,
        ))
    if not migrations:
        raise SchemaMigrationError("Uygulanabilir şema migration dosyası bulunamadı.")
    return migrations


def _ensure_history(connection) -> None:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(16) PRIMARY KEY,
            name TEXT NOT NULL,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)


def _applied(connection) -> dict[str, dict]:
    rows = connection.execute("""
        SELECT version, name, checksum, applied_at
        FROM schema_migrations
        ORDER BY version
    """).fetchall()
    return {
        str(row[0]): {
            "version": str(row[0]),
            "name": str(row[1]),
            "checksum": str(row[2]),
            "applied_at": row[3].isoformat(),
        }
        for row in rows
    }


def migration_status(connection, directory: Path) -> dict:
    migrations = discover_migrations(directory)
    _ensure_history(connection)
    applied = _applied(connection)
    known = {migration.version: migration for migration in migrations}
    unknown = sorted(set(applied) - set(known))
    if unknown:
        raise SchemaMigrationError(
            "Veritabanında kaynakta bulunmayan migration sürümleri var: "
            + ", ".join(unknown)
        )
    changed = [
        migration.version
        for migration in migrations
        if migration.version in applied
        and applied[migration.version]["checksum"] != migration.checksum
    ]
    if changed:
        raise SchemaMigrationError(
            "Uygulanmış migration dosyasının checksum değeri değişmiş: "
            + ", ".join(changed)
        )
    pending = [
        migration
        for migration in migrations
        if migration.version not in applied
    ]
    return {
        "current_version": max(applied, default=None),
        "latest_version": migrations[-1].version,
        "applied": list(applied.values()),
        "pending": [
            {
                "version": migration.version,
                "name": migration.name,
                "checksum": migration.checksum,
            }
            for migration in pending
        ],
        "ready": not pending,
    }


def apply_pending_migrations(connection, directory: Path) -> dict:
    _ensure_history(connection)
    connection.execute(
        "SELECT pg_advisory_xact_lock(%s)",
        (MIGRATION_LOCK_ID,),
    )
    status = migration_status(connection, directory)
    migrations = {
        migration.version: migration
        for migration in discover_migrations(directory)
    }
    for pending in status["pending"]:
        migration = migrations[pending["version"]]
        connection.execute(migration.sql)
        connection.execute(
            """
            INSERT INTO schema_migrations (version, name, checksum)
            VALUES (%s, %s, %s)
            """,
            (migration.version, migration.name, migration.checksum),
        )
    return migration_status(connection, directory)


def rollback_latest_migration(
    connection,
    directory: Path,
    *,
    allow_destructive: bool = False,
) -> dict:
    if not allow_destructive:
        raise SchemaMigrationError(
            "Geri migration için açık --allow-destructive onayı gerekir."
        )
    _ensure_history(connection)
    connection.execute(
        "SELECT pg_advisory_xact_lock(%s)",
        (MIGRATION_LOCK_ID,),
    )
    status = migration_status(connection, directory)
    current = status["current_version"]
    if current is None:
        raise SchemaMigrationError("Geri alınacak migration yok.")
    migration = next(
        item for item in discover_migrations(directory)
        if item.version == current
    )
    if migration.down_path is None:
        raise SchemaMigrationError(
            f"{migration.version} migration için geri alma dosyası yok."
        )
    connection.execute(migration.down_path.read_text(encoding="utf-8"))
    connection.execute(
        "DELETE FROM schema_migrations WHERE version = %s",
        (migration.version,),
    )
    return migration_status(connection, directory)
