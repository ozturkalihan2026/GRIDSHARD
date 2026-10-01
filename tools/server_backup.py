"""Offline production backup and restore into an EMPTY database only.

The worker session lock prevents a live GRIDSHARD worker from writing while
the dump is taken. Redis/RAM simulations and credentials are not exported.
Archives contain personal data: keep them outside the source/package tree.
Only restore an operator-trusted archive; SHA-256 is not a signature.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

import psycopg
from app.clean_install import PERSISTENT_TABLES, ensure_clean_runtime_directory
from app.postgres_worker_guard import WORKER_LOCK_ID
from app.production_config import environment_secret
from app.schema_migrations import migration_status
from app.version import VERSION


class BackupError(RuntimeError):
    pass


def _binary(name, pg_bin):
    if pg_bin:
        result = Path(pg_bin) / (name + ".exe" if os.name == "nt" else name)
        if result.is_file():
            return str(result)
    result = shutil.which(name)
    if not result:
        raise BackupError("PostgreSQL pg_dump/pg_restore araçları bulunamadı.")
    return result


def _run(name, arguments, database_url, pg_bin):
    env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
    # Connection credentials never become argv, an archive field or console output.
    fields = psycopg.conninfo.conninfo_to_dict(database_url)
    keys = {"dbname": "PGDATABASE", "host": "PGHOST", "hostaddr": "PGHOSTADDR", "port": "PGPORT",
            "user": "PGUSER", "password": "PGPASSWORD", "sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT",
            "sslcert": "PGSSLCERT", "sslkey": "PGSSLKEY", "channel_binding": "PGCHANNELBINDING",
            "target_session_attrs": "PGTARGETSESSIONATTRS", "service": "PGSERVICE", "options": "PGOPTIONS",
            "application_name": "PGAPPNAME", "connect_timeout": "PGCONNECT_TIMEOUT"}
    if set(fields) - set(keys):
        raise BackupError("Yedek aracı bu bağlantı seçeneğini desteklemiyor; açık libpq ayarı gerekir.")
    env.update({keys[key]: value for key, value in fields.items()})
    env["PGCONNECT_TIMEOUT"] = "10"
    result = subprocess.run([_binary(name, pg_bin), "--no-password", *arguments], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=600)
    if result.returncode:
        raise BackupError(f"{name} başarısız; hedefi değiştirmeden bağlantı ve araç sürümünü kontrol edin.")


def _hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _lock(connection):
    if not connection.execute("SELECT pg_try_advisory_lock(%s)", (WORKER_LOCK_ID,)).fetchone()[0]:
        raise BackupError("Sunucu worker'ı çalışıyor; önce güvenli bakım duruşu gerekir.")


def _summary(connection):
    row = connection.execute("SELECT installation_id FROM server_installation WHERE singleton = TRUE").fetchone()
    if not row:
        raise BackupError("Veritabanının temiz kurulum kimliği yok.")
    counts = {table: connection.execute(f"SELECT COUNT(*) FROM public.{table}").fetchone()[0] for table in PERSISTENT_TABLES}
    status = migration_status(connection, ROOT / "server" / "migrations")
    return {"installation_id": str(row[0]), "counts": counts,
            "migrations": [{key: item[key] for key in ("version", "name", "checksum")} for item in status["applied"]]}


def backup(database_url, output_dir, pg_bin=None):
    destination = Path(output_dir)
    if not destination.is_absolute():
        raise BackupError("Yedek hedefi mutlak yol olmalıdır.")
    if destination.resolve().is_relative_to(ROOT):
        raise BackupError("Kişisel veri içeren yedek kaynak/paket ağacının dışında olmalıdır.")
    # Never merge with or replace an existing backup.
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    archive = destination / "database.dump"
    with psycopg.connect(database_url, autocommit=True) as connection:
        _lock(connection)
        summary = _summary(connection)
        _run("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", str(archive)], database_url, pg_bin)
        if os.name != "nt":
            archive.chmod(0o600)
        metadata = {"format": 1, "version": VERSION, "created_at": datetime.now(timezone.utc).isoformat(),
                    "archive_sha256": _hash(archive), **summary}
        # Metadata is the success marker. Partial dumps are never valid backups.
        with (destination / "backup.json").open("x", encoding="utf-8") as handle:
            json.dump(metadata, handle, sort_keys=True, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
    return metadata


def restore(database_url, backup_dir, runtime_dir, confirm_installation_id, pg_bin=None):
    directory = Path(backup_dir)
    archive = directory / "database.dump"
    metadata = json.loads((directory / "backup.json").read_text(encoding="utf-8"))
    installation_id = str(UUID(metadata["installation_id"]))
    if metadata.get("format") != 1 or confirm_installation_id != installation_id:
        raise BackupError("Geri yükleme için doğru kurulum kimliği açıkça onaylanmalıdır.")
    if metadata["archive_sha256"] != _hash(archive):
        raise BackupError("Yedek özeti uyuşmuyor; geri yükleme reddedildi.")
    runtime = Path(runtime_dir)
    if not runtime.is_absolute() or runtime.resolve().is_relative_to(ROOT):
        raise BackupError("Yeni runtime dizini mutlak ve kaynak ağacının dışında olmalıdır.")
    if runtime.exists() and any(runtime.iterdir()):
        raise BackupError("Geri yükleme runtime hedefi boş olmalıdır.")
    with psycopg.connect(database_url, autocommit=True) as connection:
        _lock(connection)
        occupied = connection.execute(
            "SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname != 'information_schema' "
            "AND c.relkind IN ('r','p','v','m','S','f'))"
        ).fetchone()[0]
        if occupied:
            raise BackupError("Geri yükleme yalnız boş veritabanında yapılabilir; mevcut veriler silinmez.")
        _run("pg_restore", ["--single-transaction", "--exit-on-error", "--no-owner", "--no-acl",
                            "--no-tablespaces", "--dbname", "", str(archive)], database_url, pg_bin)
        actual = _summary(connection)
        if any(actual[key] != metadata[key] for key in ("installation_id", "counts", "migrations")):
            raise BackupError("Geri yükleme doğrulaması başarısız; sunucuyu açmayın.")
        ensure_clean_runtime_directory(runtime, installation_id)
    return actual


def main():
    parser = argparse.ArgumentParser(description="Durdurulmuş GRIDSHARD sunucusunun yedeği/boş hedef geri yüklemesi.")
    parser.add_argument("command", choices=("backup", "restore"))
    parser.add_argument("--directory", required=True)
    parser.add_argument("--pg-bin")
    parser.add_argument("--runtime-dir")
    parser.add_argument("--confirm-installation-id")
    args = parser.parse_args()
    try:
        url = environment_secret("DATABASE_URL", os.environ)
        if not url:
            raise BackupError("DATABASE_URL veya DATABASE_URL_FILE zorunludur.")
        if args.command == "backup":
            result = backup(url, args.directory, args.pg_bin)
        else:
            if not args.runtime_dir or not args.confirm_installation_id:
                raise BackupError("Yeni runtime ve kurulum kimliği onayı zorunludur.")
            result = restore(url, args.directory, args.runtime_dir, args.confirm_installation_id, args.pg_bin)
        print(json.dumps({"ok": True, "installation_id": result["installation_id"]}))
        return 0
    except (BackupError, OSError, ValueError, psycopg.Error, subprocess.SubprocessError):
        # Deliberately suppress driver/CLI errors that can contain connection secrets.
        print("Yedek/geri yükleme tamamlanmadı. Boş hedef, kurulum kimliği, izinler ve PostgreSQL araçlarını kontrol edin.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
