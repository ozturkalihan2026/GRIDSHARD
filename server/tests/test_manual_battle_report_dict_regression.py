from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def test_manual_report_accepts_dict_events_from_telemetry_service():
    telemetry_service.clear()

    accepted=telemetry_service.record_now(
        event_id="dict-regression-1",
        event_type="local_battle_completed",
        player_id="dict-regression-player",
        metadata={
            "won":True,
            "duration_ms":60_000,
            "credits_spent":10,
            "generator_moves":1,
            "damage_dealt":100,
            "damage_received":50,
            "shield_mitigated":5,
            "module_changes":2,
        },
    )
    assert accepted is True

    # TelemetryService.events() intentionally exposes JSON/dict-shaped events.
    events=telemetry_service.events(
        player_id=
            "dict-regression-player"
    )
    assert isinstance(
        events[0],
        dict,
    )

    response=client.get(
        "/telemetry/manual-battle-report",
        params={
            "player_id":
                "dict-regression-player",
        },
    )
    assert response.status_code==200

    body=response.json()
    assert body["battle_count"]==1
    assert body["wins"]==1
    assert (
        body["status"]
        == "insufficient_manual_battles"
    )

    telemetry_service.clear()
