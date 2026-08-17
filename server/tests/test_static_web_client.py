from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_root_serves_project_relay_web_client():
    response=client.get("/")

    assert response.status_code==200
    assert "Project Relay 2.0" in response.text
    assert "Oyna" in response.text
    assert "Profil" in response.text
    assert "İstatistikler" in response.text
    assert "Ayarlar" in response.text


def test_client_assets_are_same_origin():
    app_js=client.get(
        "/src/app.js"
    )
    styles=client.get(
        "/src/styles.css"
    )

    assert app_js.status_code==200
    assert styles.status_code==200
    assert (
        "ensureWebTestRunStarted"
        in app_js.text
    )
