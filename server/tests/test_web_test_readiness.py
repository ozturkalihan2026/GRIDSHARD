from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client = TestClient(app)


def test_health_exposes_web_test_readiness():
    telemetry_service.clear()

    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()

    assert body["status"] == "ok"
    assert body["version"] == "2.0.0-alpha.76"
    assert body["web_test"]["ready"] is True
    assert (
        body["web_test"]["build"]
        == "web-test-alpha.76"
    )
    assert (
        "server_tick"
        in body["web_test"][
            "release_checks"
        ]
    )


def test_web_test_status_has_required_capabilities():
    response = client.get(
        "/web-test/status"
    )

    assert response.status_code == 200
    body = response.json()

    assert body["ready"] is True
    assert all(
        body["capabilities"].values()
    )
    assert body["release_checks"] == [
        "health",
        "matchmaking",
        "setup",
        "ready",
        "server_tick",
        "match_result",
        "telemetry",
    ]
