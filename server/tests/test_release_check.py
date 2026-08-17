from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)
from app.release_check import (
    REQUIRED_MENU_AREAS,
    build_release_check,
)


client=TestClient(app)


def test_release_check_is_ready_for_current_scope():
    telemetry_service.clear()

    result=build_release_check(
        version="2.0.0-alpha.107",
        telemetry_service=telemetry_service,
    )

    assert result.ready is True
    assert result.menu_areas==(
        "Oyna",
        "Profil",
        "İstatistikler",
        "Ayarlar",
    )
    assert all(
        result.checks.values()
    )
    assert "Eğitim" in result.deferred_areas


def test_release_check_endpoint_exposes_locked_menu_scope():
    response=client.get(
        "/web-test/release-check"
    )

    assert response.status_code==200
    body=response.json()

    assert body["version"]=="2.0.0-alpha.107"
    assert body["ready"] is True
    assert body["menu_areas"]==list(
        REQUIRED_MENU_AREAS
    )
    assert body["checks"]["post_match_sync"] is True
    assert body["checks"]["telemetry_transport"] is True
    assert body["checks"]["web_test_kpis"] is True


def test_release_check_defers_out_of_scope_areas():
    body=client.get(
        "/web-test/release-check"
    ).json()

    assert "Eğitim" in body["deferred_areas"]
    assert "Mağaza" in body["deferred_areas"]
    assert "Kozmetik" in body["deferred_areas"]
    assert "Sezon" in body["deferred_areas"]
