from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_metrics import (
    WebTestKpiService,
)
from app.web_test_go_no_go import (
    build_go_no_go,
)
from app.web_test_run import (
    build_test_run_summary,
)


def launch_event(
    event_id,
    ready,
    *,
    run_id="run-a",
):
    return TelemetryEvent(
        event_id=event_id,
        event_type=
            "web_test_launch_attempted",
        timestamp_ms=1,
        player_id="p",
        metadata={
            "test_run_id":
                run_id,
            "launch_ready":
                ready,
            "failed_checks":
                []
                if ready
                else ["data_health"],
        },
    )


def test_launch_ready_kpi_counts_attempts_and_rate():
    telemetry=InMemoryTelemetryService()
    telemetry.record(
        launch_event("l1",True)
    )
    telemetry.record(
        launch_event("l2",True)
    )
    telemetry.record(
        launch_event("l3",False)
    )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["launch_attempts"]==3
    assert kpis["launch_ready_attempts"]==2
    assert kpis["launch_ready_rate"]==0.666667


def test_test_run_summary_filters_launch_kpis_by_run():
    telemetry=InMemoryTelemetryService()
    telemetry.record(
        launch_event(
            "a-ready",
            True,
            run_id="run-a",
        )
    )
    telemetry.record(
        launch_event(
            "b-not-ready",
            False,
            run_id="run-b",
        )
    )

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="run-a",
    )

    assert summary["launch_attempts"]==1
    assert summary["launch_ready_attempts"]==1
    assert summary["launch_ready_rate"]==1.0


def test_launch_ready_go_no_go_signal_is_behavior_only():
    result=build_go_no_go(
        operation_readiness={
            "ready":True,
            "checks":{},
            "warnings":[],
        },
        min_sample=10,
        kpis={
            "launch_attempts":3,
            "launch_ready_rate":0.333333,
        },
    )

    signal=result[
        "behavior_signals"
    ][
        "launch_ready"
    ]

    assert signal["status"]=="insufficient_data"
    assert signal["sample"]==3
    assert signal["value"]==0.333333
    assert result["decision"]=="GO"
    assert result["behavior_blocks_release"] is False
