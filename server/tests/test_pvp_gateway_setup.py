from fastapi.testclient import TestClient
from app.main import app,pvp_service,pvp_websocket_adapter
from app.game.battle_pool import default_battle_pool

client=TestClient(app)

def reset_gateway():
    pvp_service._sessions.clear()
    pvp_websocket_adapter.registry.connections.clear()

def setup_body(player):
    return {
        "player_id":player,
        "battle_pool_ids":list(default_battle_pool().module_definition_ids),
        "initial_modules":[
            {"instance_id":f"{player}-core","definition_id":"core","x":2,"y":2,"direction":"up"},
            {"instance_id":f"{player}-gen","definition_id":"generator","x":2,"y":3,"direction":"up"},
            {"instance_id":f"{player}-splitter","definition_id":"splitter","x":2,"y":1,"direction":"down"},
            {"instance_id":f"{player}-laser","definition_id":"laser","x":1,"y":1,"direction":"right"},
        ],
    }

def create_two():
    assert client.post("/pvp/sessions",json={"session_id":"strict"}).status_code==200
    for p in ("a","b"):
        assert client.post("/pvp/sessions/strict/join",json={"player_id":p}).status_code==200

def test_gateway_session_requires_setup_and_ready():
    reset_gateway(); create_two()
    assert client.post("/pvp/sessions/strict/start").status_code==409

def test_gateway_setup_ready_start_flow():
    reset_gateway(); create_two()
    for p in ("a","b"):
        assert client.post("/pvp/sessions/strict/setup",json=setup_body(p)).status_code==200
        assert client.post("/pvp/sessions/strict/ready",json={"player_id":p,"ready":True}).status_code==200
    response=client.post("/pvp/sessions/strict/start")
    assert response.status_code==200
    assert response.json()["status"]=="running"

def test_gateway_rejects_short_pool():
    reset_gateway(); create_two()
    body=setup_body("a")
    body["battle_pool_ids"]=body["battle_pool_ids"][:-1]
    assert client.post("/pvp/sessions/strict/setup",json=body).status_code==422
