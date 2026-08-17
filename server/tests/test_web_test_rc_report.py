from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)
from app.telemetry import TelemetryEvent
from app.web_test_rc_report import build_rc_report


client=TestClient(app)


def test_rc_report_combines_manifest_release_and_kpis():
    telemetry_service.clear()
    telemetry_service.record(
        TelemetryEvent(
            event_id="open",
            event_type="game_opened",
            timestamp_ms=1,
            player_id="a",
        )
    )

    report=build_rc_report(
        version="2.0.0-alpha.80",
        telemetry_service=telemetry_service,
    )

    assert report["version"]=="2.0.0-alpha.80"
    assert report["build"]=="web-test-alpha.80"
    assert report["ready"] is True
    assert report["critical_failures"]==[]
    assert report["manifest"]["pvp_protocol_version"]==1
    assert report["release_check"]["ready"] is True
    assert report["kpis"]["game_opened"]==1
    assert report["scope"]["menu_areas"]==[
        "Oyna",
        "Profil",
        "İstatistikler",
        "Ayarlar",
    ]
    assert report["scope"]["education_deferred"] is True


def test_rc_report_endpoint():
    response=client.get(
        "/web-test/rc-report"
    )

    assert response.status_code==200
    body=response.json()
    assert body["version"]=="2.0.0-alpha.80"
    assert "kpis" in body
    assert "release_check" in body
    assert "manifest" in body
