from fastapi.testclient import TestClient
from app.main import app,pvp_service,pvp_websocket_adapter
client=TestClient(app)

def reset():
    pvp_service._sessions.clear()
    pvp_websocket_adapter.registry.connections.clear()

def test_lobby_endpoint_reports_slots_and_auto_start():
    reset()
    assert client.post("/pvp/sessions",json={
        "session_id":"lobby","auto_start_when_ready":True
    }).status_code==200
    for p in ("a","b"):
        assert client.post("/pvp/sessions/lobby/join",json={"player_id":p}).status_code==200
    body=client.get("/pvp/sessions/lobby/lobby").json()
    assert body["auto_start_when_ready"] is True
    assert body["player_count"]==2
