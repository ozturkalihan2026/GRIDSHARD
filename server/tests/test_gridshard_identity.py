from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_identity_endpoint_exposes_gridshard_brand():
    response=client.get("/identity")
    assert response.status_code==200

    body=response.json()
    assert body["name"]=="GRIDSHARD"
    assert body["tagline_tr"]=="Devreni Kur. Çekirdeği Kır."
    assert body["palette"]["arc_cyan"]=="#48F4E0"
    assert body["palette"]["reactor_gold"]=="#FFD56A"


def test_home_exposes_gridshard_identity():
    html=client.get("/").text

    assert "GRIDSHARD" in html
    assert "GRIDSHARD // CORE ARENA" not in html
    assert '<span class="lobby-subtitle">CORE ARENA</span>' in html
    assert "Devreni Kur." in html
    assert "Çekirdeği Kır." in html
    assert "gridshard-audio.js" in html
