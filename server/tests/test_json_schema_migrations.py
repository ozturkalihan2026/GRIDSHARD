from pathlib import Path
import json

import pytest

from app.json_schema_migrations import (
    JsonSchemaMigrationError,
    _entry_digest,
    apply_json_store_migrations,
    apply_pending_json_migrations,
    discover_json_migrations,
    history_path,
    json_store_paths,
    json_store_status,
    rollback_latest_json_migration,
    snapshot_path,
)


ROOT = Path(__file__).resolve().parents[2]

RENAME_UP = '''
def up(payload):
    payload["teams"] = payload.pop("team_list")
    return payload


def down(payload):
    payload["team_list"] = payload.pop("teams")
    return payload
'''

ADD_FLAG_NO_DOWN = '''
def up(payload):
    payload["flag"] = True
    return payload
'''


def write_migration(directory: Path, store: str, name: str, source: str) -> Path:
    path = directory / store / f"{name}.py"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")
    return path


def test_existing_file_without_history_runs_pending_migrations_with_snapshot(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {"t1": {}}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["teams"]

    pending = json_store_status("teams", store, migrations)
    assert pending["ready"] is False
    assert pending["current_version"] is None

    result = apply_pending_json_migrations("teams", store, migrations)
    assert result["ready"] is True
    assert result["current_version"] == "001"
    assert json.loads(store.read_text(encoding="utf-8")) == {"teams": {"t1": {}}}
    snapshot = snapshot_path(store, "001")
    assert json.loads(snapshot.read_text(encoding="utf-8")) == {"team_list": {"t1": {}}}
    entry = json.loads(history_path(store).read_text(encoding="utf-8"))["applied"][0]
    assert entry["transformed"] is True
    assert entry["snapshot"] == snapshot.name
    assert not store.with_name(store.name + ".schema.lock").exists()

    # Tekrar çalıştırmak aynı göçü ikinci kez uygulamaz.
    assert apply_pending_json_migrations("teams", store, migrations)["applied"] == result["applied"]


def test_missing_store_is_marked_current_without_transform(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    migrations = discover_json_migrations(migrations_dir)["teams"]

    result = apply_pending_json_migrations("teams", store, migrations)
    assert result["ready"] is True
    assert result["applied"][0]["transformed"] is False
    assert not store.exists()


def test_changed_or_unknown_applied_migration_stops_startup(tmp_path):
    migrations_dir = tmp_path / "migrations"
    path = write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {}}), encoding="utf-8")
    apply_pending_json_migrations("teams", store, discover_json_migrations(migrations_dir)["teams"])

    path.write_text(RENAME_UP + "\n# düzenlendi\n", encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="değişmiş"):
        json_store_status("teams", store, discover_json_migrations(migrations_dir)["teams"])

    path.unlink()
    with pytest.raises(JsonSchemaMigrationError, match="kaynakta bulunmayan"):
        apply_json_store_migrations({"teams": store}, migrations_dir)


def test_crlf_checkout_does_not_change_checksum(tmp_path):
    lf_dir = tmp_path / "lf"
    crlf_dir = tmp_path / "crlf"
    write_migration(lf_dir, "teams", "001_rename_team_list", RENAME_UP)
    crlf = crlf_dir / "teams" / "001_rename_team_list.py"
    crlf.parent.mkdir(parents=True)
    crlf.write_bytes(RENAME_UP.replace("\n", "\r\n").encode("utf-8"))
    assert (
        discover_json_migrations(lf_dir)["teams"][0].checksum
        == discover_json_migrations(crlf_dir)["teams"][0].checksum
    )


def test_rollback_requires_confirmation_and_uses_down(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {"t1": {}}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["teams"]
    apply_pending_json_migrations("teams", store, migrations)

    with pytest.raises(JsonSchemaMigrationError, match="allow-destructive"):
        rollback_latest_json_migration("teams", store, migrations)

    result = rollback_latest_json_migration("teams", store, migrations, allow_destructive=True)
    assert result["current_version"] is None
    assert json.loads(store.read_text(encoding="utf-8")) == {"team_list": {"t1": {}}}


def test_rollback_without_down_restores_snapshot_only_if_unchanged(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "platform_state", "001_add_flag", ADD_FLAG_NO_DOWN)
    store = tmp_path / "platform_state.json"
    store.write_text(json.dumps({"accounts": {}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["platform_state"]

    apply_pending_json_migrations("platform_state", store, migrations)
    rollback_latest_json_migration("platform_state", store, migrations, allow_destructive=True)
    assert json.loads(store.read_text(encoding="utf-8")) == {"accounts": {}}

    apply_pending_json_migrations("platform_state", store, migrations)
    store.write_text(json.dumps({"accounts": {"p1": {}}, "flag": True}), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="güvenle"):
        rollback_latest_json_migration("platform_state", store, migrations, allow_destructive=True)
    assert json_store_status("platform_state", store, migrations)["current_version"] == "001"


def test_concurrent_migration_is_rejected_by_lock(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {}}), encoding="utf-8")
    store.with_name(store.name + ".schema.lock").write_text("123", encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="başka bir şema geçişi"):
        apply_pending_json_migrations("teams", store, discover_json_migrations(migrations_dir)["teams"])
    assert json.loads(store.read_text(encoding="utf-8")) == {"team_list": {}}


def test_unknown_store_directory_is_rejected(tmp_path):
    write_migration(tmp_path, "teams_typo", "001_x", ADD_FLAG_NO_DOWN)
    with pytest.raises(JsonSchemaMigrationError, match="Bilinmeyen JSON depo"):
        discover_json_migrations(tmp_path)


def test_startup_without_migrations_touches_no_store(tmp_path):
    paths = json_store_paths(tmp_path, {}, postgres=False)
    for path in paths.values():
        path.write_text("{}", encoding="utf-8")
    assert apply_json_store_migrations(paths, tmp_path / "missing") == {}
    assert sorted(item.name for item in tmp_path.iterdir()) == sorted(path.name for path in paths.values())


def test_registry_matches_main_store_environment_and_postgres_scope(tmp_path):
    main = (ROOT / "server" / "app" / "main.py").read_text(encoding="utf-8")
    registry = (ROOT / "server" / "app" / "json_schema_migrations.py").read_text(encoding="utf-8")
    for variable in (
        "GRIDSHARD_PLATFORM_STATE_PATH",
        "RELAY_TELEMETRY_PATH",
        "RELAY_BATTLE_POOL_PRESET_PATH",
        "RELAY_TEAM_DATA_PATH",
        "GRIDSHARD_AUTH_IDENTITY_PATH",
        "RELAY_PLAYER_DATA_PATH",
    ):
        assert f'"{variable}"' in registry or f'"{variable}"' in main
    assert "RUNTIME_STORE_PATHS = json_store_paths(" in main
    assert "apply_json_store_migrations(" in main

    json_only = json_store_paths(tmp_path, {}, postgres=False)
    with_postgres = json_store_paths(tmp_path, {}, postgres=True)
    assert {"identities", "players"} <= set(json_only)
    assert not {"identities", "players"} & set(with_postgres)
    custom = json_store_paths(tmp_path, {"RELAY_PLAYER_DATA_PATH": str(tmp_path / "x" / "p.json")}, postgres=False)
    assert custom["teams"] == tmp_path / "x" / "web_test_teams.json"


ADD_SECOND_FLAG = """
def up(payload):
    payload["second"] = True
    return payload


def down(payload):
    payload.pop("second", None)
    return payload
"""


def test_new_history_entries_are_hash_chained_and_tampering_stops_startup(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    write_migration(migrations_dir, "teams", "002_add_second_flag", ADD_SECOND_FLAG)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["teams"]
    apply_pending_json_migrations("teams", store, migrations)

    history = json.loads(history_path(store).read_text(encoding="utf-8"))
    first, second = history["applied"]
    assert first["previous_hash"] is None
    assert first["entry_hash"] == _entry_digest(first)
    assert second["previous_hash"] == first["entry_hash"]

    # Özet alanlarıyla oynanan kayıt açılışı durdurur.
    first["after_sha256"] = "0" * 64
    history_path(store).write_text(json.dumps(history), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="zinciri"):
        apply_json_store_migrations({"teams": store}, migrations_dir)


def test_legacy_unhashed_prefix_is_accepted_and_linked_by_next_migration(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"teams": {}}), encoding="utf-8")
    legacy = {
        "version": "001", "name": "001_rename_team_list",
        "checksum": discover_json_migrations(migrations_dir)["teams"][0].checksum,
        "applied_at": "2026-09-24T13:32:18+00:00", "transformed": False,
        "before_sha256": None, "after_sha256": None, "snapshot": None,
    }
    history_path(store).write_text(
        json.dumps({"store": "teams", "version": "001", "applied": [legacy]}), encoding="utf-8"
    )
    assert json_store_status("teams", store, discover_json_migrations(migrations_dir)["teams"])["ready"]

    write_migration(migrations_dir, "teams", "002_add_second_flag", ADD_SECOND_FLAG)
    result = apply_json_store_migrations({"teams": store}, migrations_dir)["teams"]
    assert result["current_version"] == "002"
    assert result["applied"][1]["previous_hash"] == _entry_digest(legacy)

    # Zincirli kayıttan sonra zincirsiz kayıt kabul edilmez.
    history = json.loads(history_path(store).read_text(encoding="utf-8"))
    history["applied"][1].pop("entry_hash")
    history_path(store).write_text(json.dumps(history), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="zinciri bozuk"):
        json_store_status("teams", store, discover_json_migrations(migrations_dir)["teams"])


def test_history_version_must_match_last_applied_entry(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    migrations = discover_json_migrations(migrations_dir)["teams"]
    apply_pending_json_migrations("teams", store, migrations)
    history = json.loads(history_path(store).read_text(encoding="utf-8"))
    history["version"] = "002"
    history_path(store).write_text(json.dumps(history), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="sürümü"):
        json_store_status("teams", store, migrations)


def test_snapshot_integrity_is_reported_and_blocks_snapshot_rollback(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "platform_state", "001_add_flag", ADD_FLAG_NO_DOWN)
    store = tmp_path / "platform_state.json"
    store.write_text(json.dumps({"accounts": {}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["platform_state"]
    result = apply_pending_json_migrations("platform_state", store, migrations)
    assert result["snapshots"] == [{"version": "001", "file": snapshot_path(store, "001").name, "state": "ok"}]
    assert result["intact"] is True

    snapshot_path(store, "001").write_text(json.dumps({"accounts": {"x": {}}}), encoding="utf-8")
    status = json_store_status("platform_state", store, migrations)
    assert status["snapshots"][0]["state"] == "changed" and status["intact"] is False
    with pytest.raises(JsonSchemaMigrationError, match="yedeği göçten sonra değişmiş"):
        rollback_latest_json_migration("platform_state", store, migrations, allow_destructive=True)
    assert json.loads(store.read_text(encoding="utf-8")) == {"accounts": {}, "flag": True}

    snapshot_path(store, "001").unlink()
    assert json_store_status("platform_state", store, migrations)["snapshots"][0]["state"] == "missing"


def test_rollback_is_kept_as_audit_record(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    store = tmp_path / "web_test_teams.json"
    store.write_text(json.dumps({"team_list": {}}), encoding="utf-8")
    migrations = discover_json_migrations(migrations_dir)["teams"]
    applied = apply_pending_json_migrations("teams", store, migrations)["applied"][0]
    result = rollback_latest_json_migration("teams", store, migrations, allow_destructive=True)
    assert result["rollbacks"] == 1
    record = json.loads(history_path(store).read_text(encoding="utf-8"))["rollbacks"][0]
    assert record["method"] == "down"
    assert record["entry_hash"] == applied["entry_hash"]
    # Yeniden uygulama zinciri baştan başlatır, iz korunur.
    again = apply_pending_json_migrations("teams", store, migrations)
    assert again["applied"][0]["previous_hash"] is None and again["rollbacks"] == 1


def test_production_startup_never_transforms_existing_data(tmp_path):
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "teams", "001_rename_team_list", RENAME_UP)
    write_migration(migrations_dir, "platform_state", "001_add_flag", ADD_FLAG_NO_DOWN)
    teams = tmp_path / "web_test_teams.json"
    teams.write_text(json.dumps({"team_list": {}}), encoding="utf-8")
    platform = tmp_path / "platform_state.json"

    with pytest.raises(JsonSchemaMigrationError, match="json_schema_migrate.py up"):
        apply_json_store_migrations(
            {"teams": teams, "platform_state": platform}, migrations_dir, auto_apply=False
        )
    assert json.loads(teams.read_text(encoding="utf-8")) == {"team_list": {}}
    assert not history_path(teams).exists()
    # Henüz oluşmamış depo dönüşümsüz kaydedilir; veri riski yoktur.
    platform_migrations = discover_json_migrations(migrations_dir)["platform_state"]
    assert json_store_status("platform_state", platform, platform_migrations)["ready"]

    apply_pending_json_migrations("teams", teams, discover_json_migrations(migrations_dir)["teams"])
    results = apply_json_store_migrations(
        {"teams": teams, "platform_state": platform}, migrations_dir, auto_apply=False
    )
    assert results["teams"]["ready"] and results["platform_state"]["ready"]


def test_two_stores_cannot_share_one_file(tmp_path):
    with pytest.raises(JsonSchemaMigrationError, match="aynı dosya"):
        json_store_paths(
            tmp_path, {"RELAY_TEAM_DATA_PATH": str(tmp_path / "platform_state.json")}, postgres=True
        )
