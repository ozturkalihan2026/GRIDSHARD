from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_metrics import (
    WebTestKpiService,
)


def test_audit_funnel_rates():
    telemetry=InMemoryTelemetryService()

    for audit,player in (
        ("a1","p1"),
        ("a2","p2"),
        ("a3","p3"),
    ):
        telemetry.record(
            TelemetryEvent(
                event_id=audit,
                event_type=
                    "web_test_session_started",
                timestamp_ms=1,
                player_id=player,
            )
        )

    for audit,player,session in (
        ("a1","p1","s1"),
        ("a2","p2","s2"),
    ):
        telemetry.record(
            TelemetryEvent(
                event_id=f"bound-{audit}",
                event_type=
                    "web_test_session_bound",
                timestamp_ms=2,
                player_id=player,
                session_id=session,
                metadata={
                    "audit_event_id":audit,
                },
            )
        )

    telemetry.record(
        TelemetryEvent(
            event_id="finish-a1",
            event_type=
                "web_test_session_finished",
            timestamp_ms=3,
            player_id="p1",
            session_id="s1",
            metadata={
                "audit_event_id":"a1",
                "technical_completed":True,
            },
        )
    )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["audit_session_starts"]==3
    assert kpis["audit_session_bounds"]==2
    assert kpis["audit_session_finishes"]==1
    assert kpis["audit_to_session_rate"]==0.666667
    assert kpis["audit_to_finish_rate"]==0.333333
    assert kpis["bound_to_finish_rate"]==0.5


def test_non_completed_finish_event_not_counted():
    telemetry=InMemoryTelemetryService()

    telemetry.record(
        TelemetryEvent(
            event_id="a1",
            event_type=
                "web_test_session_started",
            timestamp_ms=1,
            player_id="p1",
        )
    )
    telemetry.record(
        TelemetryEvent(
            event_id="f1",
            event_type=
                "web_test_session_finished",
            timestamp_ms=2,
            player_id="p1",
            session_id="s1",
            metadata={
                "audit_event_id":"a1",
                "technical_completed":False,
            },
        )
    )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["audit_session_finishes"]==0
    assert kpis["audit_to_finish_rate"]==0.0
