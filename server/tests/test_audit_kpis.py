from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_metrics import (
    WebTestKpiService,
)


def test_audit_to_session_rate_counts_only_started_audits():
    telemetry=InMemoryTelemetryService()

    telemetry.record(
        TelemetryEvent(
            event_id="audit-1",
            event_type=
                "web_test_session_started",
            timestamp_ms=1,
            player_id="a",
        )
    )
    telemetry.record(
        TelemetryEvent(
            event_id="audit-2",
            event_type=
                "web_test_session_started",
            timestamp_ms=2,
            player_id="b",
        )
    )
    telemetry.record(
        TelemetryEvent(
            event_id="bound-1",
            event_type=
                "web_test_session_bound",
            timestamp_ms=3,
            player_id="a",
            session_id="s1",
            metadata={
                "audit_event_id":
                    "audit-1",
            },
        )
    )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["audit_session_starts"]==2
    assert kpis["audit_session_bounds"]==1
    assert kpis["audit_to_session_rate"]==0.5


def test_unknown_bound_source_does_not_inflate_conversion():
    telemetry=InMemoryTelemetryService()

    telemetry.record(
        TelemetryEvent(
            event_id="audit-1",
            event_type=
                "web_test_session_started",
            timestamp_ms=1,
            player_id="a",
        )
    )
    telemetry.record(
        TelemetryEvent(
            event_id="bound-x",
            event_type=
                "web_test_session_bound",
            timestamp_ms=2,
            player_id="x",
            session_id="s-x",
            metadata={
                "audit_event_id":
                    "missing-audit",
            },
        )
    )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["audit_session_starts"]==1
    assert kpis["audit_session_bounds"]==0
    assert kpis["audit_to_session_rate"]==0.0


def test_audit_kpis_respect_player_filter():
    telemetry=InMemoryTelemetryService()

    for player,audit,session in (
        ("a","audit-a","s-a"),
        ("b","audit-b","s-b"),
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
        telemetry.record(
            TelemetryEvent(
                event_id=
                    f"bound-{player}",
                event_type=
                    "web_test_session_bound",
                timestamp_ms=2,
                player_id=player,
                session_id=session,
                metadata={
                    "audit_event_id":
                        audit,
                },
            )
        )

    kpis=WebTestKpiService(
        telemetry
    ).snapshot(
        player_id="a"
    )

    assert kpis["audit_session_starts"]==1
    assert kpis["audit_session_bounds"]==1
    assert kpis["audit_to_session_rate"]==1.0
