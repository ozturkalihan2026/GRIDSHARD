from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)
from app.telemetry import TelemetryEvent
from app.web_test_metrics import WebTestKpiService


client=TestClient(app)


def event(
    event_id,
    event_type,
    *,
    player_id="a",
    session_id=None,
    metadata=None,
):
    return TelemetryEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp_ms=1,
        player_id=player_id,
        session_id=session_id,
        metadata=metadata or {},
    )


def test_kpis_deduplicate_matches_by_session():
    telemetry_service.clear()

    for item in [
        event("s1a","match_started",session_id="s1",player_id="a"),
        event("s1b","match_started",session_id="s1",player_id="b"),
        event("c1a","match_completed",session_id="s1",player_id="a",metadata={"duration_ms":90000}),
        event("c1b","match_completed",session_id="s1",player_id="b",metadata={"duration_ms":90000}),
    ]:
        telemetry_service.record(item)

    kpi=WebTestKpiService(
        telemetry_service
    ).snapshot()

    assert kpi["started_matches"]==1
    assert kpi["completed_matches"]==1
    assert kpi["match_completion_rate"]==1.0
    assert kpi["average_match_duration_ms"]==90000


def test_kpis_measure_gameplay_signals():
    telemetry_service.clear()

    items=[
        event("start","match_started",session_id="s1"),
        event("complete","match_completed",session_id="s1",metadata={"duration_ms":120000}),
        event("change1","module_changed",session_id="s1"),
        event("change2","module_changed",session_id="s1"),
        event("credit","circuit_credit_spent",session_id="s1",metadata={"amount":125}),
        event("shelf","module_shelf_used",session_id="s1"),
        event("booster","booster_used",session_id="s1"),
        event("rematch","rematch_requested",session_id="s1"),
    ]
    for item in items:
        telemetry_service.record(item)

    kpi=WebTestKpiService(
        telemetry_service
    ).snapshot()

    assert kpi["module_changes"]==2
    assert kpi["average_module_changes_per_match"]==2.0
    assert kpi["total_circuit_credits_spent"]==125
    assert kpi["module_shelf_uses"]==1
    assert kpi["boosters_used"]==1
    assert kpi["rematch_requests"]==1
    assert kpi["rematch_request_rate"]==1.0


def test_kpi_player_filter_isolated():
    telemetry_service.clear()

    telemetry_service.record(
        event("a-open","game_opened",player_id="a")
    )
    telemetry_service.record(
        event("b-open","game_opened",player_id="b")
    )

    kpi=WebTestKpiService(
        telemetry_service
    ).snapshot(player_id="a")

    assert kpi["player_id"]=="a"
    assert kpi["game_opened"]==1


def test_kpi_endpoint():
    telemetry_service.clear()
    telemetry_service.record(
        event("open","game_opened")
    )

    response=client.get(
        "/telemetry/kpis",
        params={"player_id":"a"},
    )

    assert response.status_code==200
    body=response.json()
    assert body["game_opened"]==1
    assert "average_match_duration_ms" in body
    assert "match_completion_rate" in body
