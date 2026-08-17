from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_run import (
    build_test_run_catalog,
)


def test_catalog_lists_runs_without_player_details():
    telemetry=InMemoryTelemetryService()

    for run_id,audit,player in (
        ("run-a","a1","player-a"),
        ("run-b","b1","player-b"),
    ):
        telemetry.record(
            TelemetryEvent(
                event_id=audit,
                event_type=
                    "web_test_session_started",
                timestamp_ms=1,
                player_id=player,
                metadata={
                    "test_run_id":
                        run_id,
                },
            )
        )

    catalog=build_test_run_catalog(
        telemetry_service=telemetry,
        active_test_run_id="run-b",
    )

    assert catalog["run_count"]==2
    assert {
        item["test_run_id"]
        for item in catalog["runs"]
    }=={"run-a","run-b"}

    active=[
        item
        for item in catalog["runs"]
        if item["active"]
    ]
    assert len(active)==1
    assert active[0]["test_run_id"]=="run-b"

    for item in catalog["runs"]:
        assert "player_id" not in item
        assert "players" not in item


def test_catalog_includes_active_empty_run():
    telemetry=InMemoryTelemetryService()

    catalog=build_test_run_catalog(
        telemetry_service=telemetry,
        active_test_run_id="active-empty",
    )

    assert catalog["run_count"]==1
    assert catalog["runs"][0][
        "test_run_id"
    ]=="active-empty"
    assert catalog["runs"][0][
        "audit_session_starts"
    ]==0
