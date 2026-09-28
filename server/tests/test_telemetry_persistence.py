from app.telemetry import (
    InMemoryTelemetryService,
    JsonFileTelemetryRepository,
    TelemetryEvent,
)


def test_telemetry_survives_service_restart(tmp_path):
    path=tmp_path/"telemetry.json"

    first=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )
    first.record(
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=10,
            player_id="a",
        )
    )

    restarted=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )

    events=restarted.events()

    assert len(events)==1
    assert events[0]["event_id"]=="e1"


def test_event_id_deduplication_survives_restart(tmp_path):
    path=tmp_path/"telemetry.json"
    event=TelemetryEvent(
        event_id="same-event",
        event_type="rematch_requested",
        timestamp_ms=10,
        player_id="a",
    )

    first=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )
    assert first.record(event) is True

    restarted=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )

    assert restarted.record(event) is False
    assert len(
        restarted.events()
    )==1


def test_clear_persists_empty_telemetry(tmp_path):
    path=tmp_path/"telemetry.json"
    service=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )
    service.record(
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=10,
        )
    )
    service.clear()

    restarted=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )

    assert restarted.events()==[]
