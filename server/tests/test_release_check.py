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


def test_historical_release_builder_is_an_offline_utility():
    telemetry_service.clear()

    result=build_release_check(
        version="2.0.0-beta.23",
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

    assert response.status_code==410
    assert "ready" not in response.json()


def test_retired_release_check_does_not_mislabel_current_store_cosmetics_and_season():
    body=client.get(
        "/web-test/release-check"
    ).json()

    assert "deferred_areas" not in body
    html=client.get("/").text
    assert 'data-shell-screen="shop"' in html
    assert 'data-screen-panel="avatar"' in html
    assert 'data-screen-panel="rewards"' in html
