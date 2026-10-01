"""A real dump/restore drill in two newly created, disposable local databases."""

import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import psycopg
from psycopg import sql
import pytest

from app.clean_install import ensure_clean_postgres_installation
from app.postgres_repository import PostgresPool
from app.postgres_worker_guard import WORKER_LOCK_ID

spec = importlib.util.spec_from_file_location("server_backup_tool", Path(__file__).resolve().parents[2] / "tools" / "server_backup.py")
backup_tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup_tool)


@pytest.fixture
def empty_database_pair():
    url = os.environ.get("GRIDSHARD_TEST_DATABASE_URL", "")
    if not url:
        pytest.skip("İzole PostgreSQL adresi yok.")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.path != "/gridshard_test":
        pytest.fail("Geri yükleme testi yalnız yerel gridshard_test kümesini kullanır.")
    pg_bin = os.environ.get("GRIDSHARD_TEST_PG_BIN", "")
    if not pg_bin and os.name == "nt":
        pg_bin = r"C:\Program Files\PostgreSQL\16\bin"
    if not (Path(pg_bin, "pg_dump.exe").is_file() if os.name == "nt" else shutil.which("pg_dump")):
        pytest.skip("PostgreSQL dump/restore araçları yok.")
    names = ["gridshard_restore_test_" + uuid4().hex for _ in range(2)]
    urls = [urlunsplit(parsed._replace(path="/" + name)) for name in names]
    with psycopg.connect(url, autocommit=True) as admin:
        for name in names:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    try:
        yield urls, pg_bin
    finally:
        # Exact databases created above only; never drop gridshard_test or user data.
        with psycopg.connect(url, autocommit=True) as admin:
            for name in names:
                assert name.startswith("gridshard_restore_test_") and len(name) == 55
                admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))


def test_real_backup_restore_preserves_installation_schema_and_pending_results(empty_database_pair):
    (source, target), pg_bin = empty_database_pair
    pool = PostgresPool(source)
    pool.open()
    installation = ensure_clean_postgres_installation(pool)
    with pool.connection() as connection:
        connection.execute("INSERT INTO player_data (player_id, profile, statistics, settings) VALUES ('restore-player', '{\"credits\":777}', '{}', '{}')")
        connection.execute("INSERT INTO battle_results (battle_id, input_hash, status, account_player_ids, match_type, terminal, summary, completed_at) VALUES ('restore-battle', %s, 'pending', ARRAY['restore-player'], 'ranked_pvp', '{\"pending\":true}', '{}', NOW())", ("a" * 64,))
    try:
        with tempfile.TemporaryDirectory(prefix="gridshard-restore-drill-") as directory:
            path = Path(directory)
            with psycopg.connect(source, autocommit=True) as held:
                held.execute("SELECT pg_advisory_lock(%s)", (WORKER_LOCK_ID,))
                with pytest.raises(backup_tool.BackupError, match="bakım"):
                    backup_tool.backup(source, path / "while-live", pg_bin)
            metadata = backup_tool.backup(source, path / "backup", pg_bin)
            assert metadata["installation_id"] == installation
            restored = backup_tool.restore(target, path / "backup", path / "runtime", installation, pg_bin)
            assert restored["counts"]["player_data"] == restored["counts"]["battle_results"] == 1
            with psycopg.connect(target) as connection:
                assert connection.execute("SELECT profile ->> 'credits' FROM player_data").fetchone()[0] == "777"
                assert connection.execute("SELECT status FROM battle_results").fetchone()[0] == "pending"
            assert json.loads((path / "runtime" / ".gridshard-installation.json").read_text())["installation_id"] == installation
            with pytest.raises(backup_tool.BackupError, match="boş veritabanında"):
                backup_tool.restore(target, path / "backup", path / "other-runtime", installation, pg_bin)
            with (path / "backup" / "database.dump").open("ab") as handle:
                handle.write(b"tamper")
            with pytest.raises(backup_tool.BackupError, match="özet"):
                backup_tool.restore(target, path / "backup", path / "other-runtime", installation, pg_bin)
    finally:
        pool.close()
