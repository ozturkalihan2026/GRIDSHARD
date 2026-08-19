from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_manifest_exposes_ui_build_and_cache_mode():
    response=client.get(
        "/web-test/manifest"
    )
    assert response.status_code==200
    body=response.json()
    assert body["version"]=="2.0.0-beta.21"
    assert body["ui_build_label"]=="GRIDSHARD 2.0.0-beta.21"
    assert body["static_cache_mode"]=="no-store"
    assert body["browser_e2e"]=="optional-real-browser"
