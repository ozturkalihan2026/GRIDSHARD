from app.telemetry import (
    JsonFileTelemetryRepository,
    TelemetryEvent,
)


def event(event_id):
    return TelemetryEvent(
        event_id=event_id,
        event_type="game_opened",
        timestamp_ms=1,
    )


def test_second_write_preserves_previous_telemetry_as_backup(tmp_path):
    path=tmp_path/"telemetry.json"
    repo=JsonFileTelemetryRepository(
        path
    )

    repo.save([event("e1")])
    repo.save([
        event("e1"),
        event("e2"),
    ])

    assert repo.backup_path.exists()

    backup=JsonFileTelemetryRepository(
        repo.backup_path
    ).load()

    assert [
        item.event_id
        for item in backup
    ]==["e1"]


def test_health_reports_good_backup_when_main_corrupt(tmp_path):
    path=tmp_path/"telemetry.json"
    repo=JsonFileTelemetryRepository(
        path
    )
    repo.save([event("e1")])
    repo.save([
        event("e1"),
        event("e2"),
    ])

    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    health=repo.health()

    assert health["ready"] is False
    assert health["state"]=="corrupt"
    assert health["backup"]["available"] is True
    assert health["backup"]["ready"] is True
    assert health["backup"]["event_count"]==1


def test_explicit_restore_recovers_last_good_telemetry(tmp_path):
    path=tmp_path/"telemetry.json"
    repo=JsonFileTelemetryRepository(
        path
    )
    repo.save([event("e1")])
    repo.save([
        event("e1"),
        event("e2"),
    ])
    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    assert repo.restore_backup() is True

    restored=repo.load()

    assert [
        item.event_id
        for item in restored
    ]==["e1"]
    assert repo.health()["ready"] is True


def test_save_does_not_overwrite_corrupt_main_or_backup(tmp_path):
    path=tmp_path/"telemetry.json"
    repo=JsonFileTelemetryRepository(
        path
    )
    repo.save([event("e1")])
    repo.save([
        event("e1"),
        event("e2"),
    ])
    backup_before=repo.backup_path.read_text(
        encoding="utf-8"
    )
    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    try:
        repo.save([event("e3")])
    except Exception:
        pass

    assert (
        path.read_text(
            encoding="utf-8"
        )
        == "{broken"
    )
    assert (
        repo.backup_path.read_text(
            encoding="utf-8"
        )
        == backup_before
    )
