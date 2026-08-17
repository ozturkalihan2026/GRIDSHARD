from app.telemetry import (
    InMemoryTelemetryService,
    JsonFileTelemetryRepository,
    TelemetryEvent,
)
from app.web_test_metrics import (
    WebTestKpiService,
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


def test_kpis_continue_after_telemetry_restart(tmp_path):
    path=tmp_path/"telemetry.json"

    first=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )
    first.record(
        TelemetryEvent(
            event_id="start",
            event_type="match_started",
            timestamp_ms=10,
            player_id="a",
            session_id="s1",
        )
    )
    first.record(
        TelemetryEvent(
            event_id="complete",
            event_type="match_completed",
            timestamp_ms=20,
            player_id="a",
            session_id="s1",
            metadata={
                "duration_ms":90000,
                "winner_player_id":"a",
                "is_draw":False,
            },
        )
    )

    restarted=InMemoryTelemetryService(
        repository=
            JsonFileTelemetryRepository(
                path
            )
    )
    kpis=WebTestKpiService(
        restarted
    ).snapshot(
        player_id="a"
    )

    assert kpis["started_matches"]==1
    assert kpis["completed_matches"]==1
    assert kpis["average_match_duration_ms"]==90000


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
