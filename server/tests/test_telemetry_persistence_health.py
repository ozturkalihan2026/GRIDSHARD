from app.telemetry import (
    JsonFileTelemetryRepository,
    TelemetryEvent,
)


def test_missing_telemetry_file_is_healthy_if_path_writable(tmp_path):
    repo=JsonFileTelemetryRepository(
        tmp_path/"nested"/"telemetry.json"
    )

    health=repo.health()

    assert health["ready"] is True
    assert health["state"]=="empty"
    assert health["event_count"]==0


def test_valid_telemetry_health_reports_event_count(tmp_path):
    repo=JsonFileTelemetryRepository(
        tmp_path/"telemetry.json"
    )
    repo.save([
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=1,
        )
    ])

    health=repo.health()

    assert health["ready"] is True
    assert health["state"]=="ready"
    assert health["event_count"]==1


def test_corrupt_telemetry_file_is_unhealthy(tmp_path):
    path=tmp_path/"telemetry.json"
    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    repo=JsonFileTelemetryRepository(
        path
    )
    health=repo.health()

    assert health["ready"] is False
    assert health["state"]=="corrupt"
    assert health["event_count"]==0
