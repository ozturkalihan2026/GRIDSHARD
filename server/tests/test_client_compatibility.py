from fastapi.testclient import TestClient

from app import main as gateway
from app.client_compatibility import health_release_fields


def test_future_runtime_reports_truth_and_preserves_both_installed_client_aliases(monkeypatch):
    monkeypatch.setattr(gateway, "VERSION", "2.4.0")
    response = TestClient(gateway.app).get("/health")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["runtime_release_version"] == "2.4.0"
    assert body["server_release_version"] == "2.3.0"
    assert body["release_version"] == "2.2.1"
    assert body["version"] == "2.1.0-beta.72"
    policy = body["client_compatibility"]
    assert policy["minimum_client_version"] == "2.2.1"
    assert policy["supported_client_versions"] == ["2.2.1", "2.3.0", "2.4.0"]
    assert {"game.v1", "profile.v1", "season.stock.v1", "season.missions.v1", "reward-inbox.open.v1"} <= set(policy["capabilities"])
    assert body["pvp_protocol_version"] == 2


def test_compatibility_response_is_detached_and_cannot_change_server_policy():
    body = health_release_fields("2.4.0")
    body["client_compatibility"]["supported_client_versions"].clear()
    body["client_compatibility"]["capabilities"].clear()
    assert health_release_fields("2.4.0")["client_compatibility"]["supported_client_versions"] == ["2.2.1", "2.3.0", "2.4.0"]


def test_patch_build_keeps_reviewed_client_lines_and_supports_its_own_build():
    body = health_release_fields("2.4.1")
    assert body["runtime_release_version"] == "2.4.1"
    assert "2.4.1" in body["client_compatibility"]["supported_client_versions"]
    assert body["client_compatibility"]["supported_client_release_lines"] == ["2.2", "2.3", "2.4"]
