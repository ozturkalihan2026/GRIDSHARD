from fastapi.testclient import TestClient

from app.build_manifest import (
    PVP_PROTOCOL_VERSION,
    build_manifest,
)
from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def test_manifest_has_version_protocol_menu_and_release_state():
    manifest=build_manifest(
        version="2.0.0-alpha.71",
        telemetry_service=telemetry_service,
    )

    assert manifest["server_version"]=="2.0.0-alpha.71"
    assert manifest["web_test_build"]=="web-test-alpha.71"
    assert manifest["pvp_protocol_version"]==PVP_PROTOCOL_VERSION
    assert manifest["menu_areas"]==[
        "Oyna",
        "Profil",
        "İstatistikler",
        "Ayarlar",
    ]
    assert manifest["release_ready"] is True
    assert manifest["release_failed_checks"]==[]


def test_manifest_endpoint():
    response=client.get(
        "/web-test/manifest"
    )

    assert response.status_code==200
    body=response.json()
    assert body["server_version"]=="2.0.0-alpha.71"
    assert body["pvp_protocol_version"]==1
