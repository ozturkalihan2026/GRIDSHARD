"""Clean-install gates use temporary files and a synthetic SQL connection."""

import json

import pytest

from app.clean_install import (
    CleanInstallError,
    ensure_clean_postgres_installation,
    ensure_clean_runtime_directory,
    require_runtime_store_path,
    runtime_data_directory,
)


class _Rows:
    def __init__(self, value):
        self.value = value

    def fetchone(self):
        return self.value


class _Connection:
    def __init__(self, *, occupied=False):
        self.installation_id = None
        self.occupied = occupied
        self.insert_count = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        if "pg_advisory_xact_lock" in statement:
            return _Rows((None,))
        if statement.startswith("SELECT installation_id"):
            return _Rows((self.installation_id,) if self.installation_id else None)
        if statement.startswith("SELECT EXISTS"):
            return _Rows((self.occupied,))
        if statement.startswith("INSERT INTO server_installation"):
            self.installation_id = parameters[0]
            self.insert_count += 1
            return _Rows(None)
        raise AssertionError(statement)


class _Pool:
    def __init__(self, connection):
        self._connection = connection

    def connection(self):
        return self._connection


def test_greenfield_database_claim_is_idempotent():
    connection = _Connection()
    pool = _Pool(connection)
    installation_id = ensure_clean_postgres_installation(pool)
    assert installation_id == ensure_clean_postgres_installation(pool)
    assert connection.insert_count == 1


def test_existing_database_cannot_be_claimed_as_clean():
    connection = _Connection(occupied=True)
    with pytest.raises(CleanInstallError, match="Mevcut kayıt"):
        ensure_clean_postgres_installation(_Pool(connection))
    assert connection.insert_count == 0


def test_runtime_directory_requires_empty_first_boot_and_matching_identity(tmp_path):
    runtime_dir = tmp_path / "fresh"
    ensure_clean_runtime_directory(runtime_dir, "install-one")
    assert json.loads((runtime_dir / ".gridshard-installation.json").read_text())["installation_id"] == "install-one"
    ensure_clean_runtime_directory(runtime_dir, "install-one")
    with pytest.raises(CleanInstallError, match="ait değil"):
        ensure_clean_runtime_directory(runtime_dir, "install-two")

    legacy_dir = tmp_path / "legacy"
    legacy_dir.mkdir()
    (legacy_dir / "platform_state.json").write_text("{}", encoding="utf-8")
    with pytest.raises(CleanInstallError, match="boş değil"):
        ensure_clean_runtime_directory(legacy_dir, "install-one")
    assert (legacy_dir / "platform_state.json").exists()


def test_production_paths_cannot_point_into_source_tree_or_escape_runtime(tmp_path):
    source_dir = tmp_path / "project" / "server" / "data"
    runtime_dir = tmp_path / "runtime"
    with pytest.raises(CleanInstallError, match="zorunludur"):
        runtime_data_directory(source_dir, "production", {})
    with pytest.raises(CleanInstallError, match="kaynak ağacının dışında"):
        runtime_data_directory(source_dir, "production", {
            "GRIDSHARD_RUNTIME_DATA_DIR": str(source_dir),
        })
    assert runtime_data_directory(source_dir, "production", {
        "GRIDSHARD_RUNTIME_DATA_DIR": str(runtime_dir),
    }) == runtime_dir.resolve()
    with pytest.raises(CleanInstallError, match="dışında olamaz"):
        require_runtime_store_path(source_dir / "players.json", runtime_dir, "production")
