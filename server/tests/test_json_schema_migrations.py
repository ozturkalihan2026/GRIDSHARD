import hashlib
import json

import pytest

from app.json_schema_migrations import (
    JsonSchemaMigrationError,
    JsonStoreSpec,
    apply_pending_migration,
    assert_supported_schema,
    migration_status,
    rollback_latest_migration,
    schema_path,
)


def test_json_schema_adoption_and_rollback_keep_new_player_progress(tmp_path):
    path = tmp_path / "players.json"
    original = b'{"player-1":{"trophies":125}}\n'
    path.write_bytes(original)
    spec = JsonStoreSpec("players", path, dict)

    assert migration_status(spec)["pending"] is True
    adopted = apply_pending_migration(spec)
    assert adopted["schema_version"] == 1
    assert path.read_bytes() == original
    assert adopted["journal_entries"] == 1
    metadata = json.loads(schema_path(path).read_text(encoding="utf-8"))
    backup = path.with_name(metadata["journal"][0]["backup"])
    assert backup.read_bytes() == original
    assert metadata["journal"][0]["payload_sha256"] == hashlib.sha256(original).hexdigest()

    backup.write_bytes(b"changed")
    with pytest.raises(JsonSchemaMigrationError, match="yedeği değişmiş"):
        migration_status(spec)
    backup.write_bytes(original)

    path.write_text('{"player-1":{"trophies":300}}\n', encoding="utf-8")
    assert apply_pending_migration(spec)["journal_entries"] == 1
    with pytest.raises(JsonSchemaMigrationError):
        rollback_latest_migration(spec)
    rolled_back = rollback_latest_migration(spec, allow_destructive=True)
    assert rolled_back["schema_version"] == 0
    assert rolled_back["journal_entries"] == 2
    assert json.loads(path.read_text(encoding="utf-8"))["player-1"]["trophies"] == 300
    assert apply_pending_migration(spec)["journal_entries"] == 3


def test_json_schema_rejects_wrong_roots_tampered_history_and_future_version(tmp_path):
    path = tmp_path / "telemetry.json"
    spec = JsonStoreSpec("telemetry", path, list)
    path.write_text("{}", encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="kökü"):
        apply_pending_migration(spec)
    assert not schema_path(path).exists()

    path.write_text("[]", encoding="utf-8")
    apply_pending_migration(spec)
    metadata = json.loads(schema_path(path).read_text(encoding="utf-8"))
    metadata["journal"][0]["payload_sha256"] = "bad"
    schema_path(path).write_text(json.dumps(metadata), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="günlüğü"):
        migration_status(spec)
    with pytest.raises(JsonSchemaMigrationError):
        assert_supported_schema(path, "telemetry", list)

    metadata["version"] = 2
    schema_path(path).write_text(json.dumps(metadata), encoding="utf-8")
    with pytest.raises(JsonSchemaMigrationError, match="sürümü"):
        assert_supported_schema(path, "telemetry", list)


def test_json_schema_new_store_has_version_without_creating_payload(tmp_path):
    path = tmp_path / "teams.json"
    spec = JsonStoreSpec("teams", path, dict)
    result = apply_pending_migration(spec)
    assert result["schema_version"] == 1
    assert result["exists"] is False
    assert not path.exists()
    assert assert_supported_schema(path, "teams", dict) == 1
