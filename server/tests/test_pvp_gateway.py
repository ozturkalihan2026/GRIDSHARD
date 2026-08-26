from fastapi.testclient import TestClient
import app.main as main_module

from app.main import (
    app,
    player_progression_service,
    pvp_service,
    pvp_websocket_adapter,
)
from app.game.models import Direction
from app.game.pvp_session import PvPSessionService


client = TestClient(app)


def reset_gateway():
    pvp_service._sessions.clear()
    pvp_websocket_adapter.registry.connections.clear()


def create_and_join(session_id="web", players=("a", "b")):
    response = client.post(
        "/pvp/sessions",
        json={"session_id": session_id},
    )
    assert response.status_code == 200

    for player in players:
        response = client.post(
            f"/pvp/sessions/{session_id}/join",
            json={"player_id": player},
        )
        assert response.status_code == 200



def valid_setup_body(player):
    from app.game.battle_pool import default_battle_pool
    return {
        "player_id": player,
        "battle_pool_ids": list(default_battle_pool().module_definition_ids),
        "initial_modules": [
            {"instance_id": f"{player}-core", "definition_id": "core", "x": 2, "y": 2, "direction": "up"},
            {"instance_id": f"{player}-gen", "definition_id": "generator", "x": 2, "y": 3, "direction": "up"},
            {"instance_id": f"{player}-splitter", "definition_id": "splitter", "x": 2, "y": 1, "direction": "down"},
            {"instance_id": f"{player}-laser", "definition_id": "laser", "x": 1, "y": 1, "direction": "right"},
        ],
    }

def ready_two(session_id="web"):
    for player in ("a", "b"):
        assert client.post(f"/pvp/sessions/{session_id}/setup",json=valid_setup_body(player)).status_code == 200
        assert client.post(f"/pvp/sessions/{session_id}/ready",json={"player_id":player,"ready":True}).status_code == 200

def test_health_exposes_version():
    reset_gateway()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "2.0.0-beta.36"


def test_post_match_lazily_recovers_a_finished_session(monkeypatch):
    reset_gateway()
    battle_id = "lazy-post-match"
    players = ("lazy-a", "lazy-b")
    session = pvp_service.create_session(battle_id)
    for player_id in players:
        pvp_service.join(battle_id, player_id)
        session.engine.grant_module(player_id, f"{player_id}-core", "core")
        session.engine.grant_module(player_id, f"{player_id}-gen", "generator")
        session.engine.set_initial_active_module(
            player_id,
            f"{player_id}-core",
            2,
            2,
        )
        session.engine.set_initial_active_module(
            player_id,
            f"{player_id}-gen",
            2,
            3,
            Direction.UP,
        )
    session.engine.start()
    session.engine._finish_battle(
        winner_player_id=players[0],
        loser_player_id=players[1],
        is_draw=False,
        reason="core_destroyed",
    )

    monkeypatch.setattr(
        main_module.telemetry_service,
        "ingest_finished_battle",
        lambda _state: None,
    )
    monkeypatch.setattr(main_module, "persist_player_data", lambda _player_id: None)

    assert player_progression_service.player_result(battle_id, players[0]) is None
    response = client.get(f"/post-match/{battle_id}/{players[0]}")

    assert response.status_code == 200
    assert response.json()["progression"]["player_id"] == players[0]


def test_create_join_and_start_session():
    reset_gateway()
    create_and_join()
    ready_two()

    response = client.post(
        "/pvp/sessions/web/start"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_session_cannot_start_with_one_player():
    reset_gateway()
    create_and_join(
        session_id="solo",
        players=("a",),
    )

    response = client.post(
        "/pvp/sessions/solo/start"
    )

    assert response.status_code == 409


def test_third_join_is_rejected():
    reset_gateway()
    create_and_join()

    response = client.post(
        "/pvp/sessions/web/join",
        json={"player_id": "c"},
    )

    assert response.status_code == 409


def test_snapshot_endpoint_is_viewer_scoped():
    reset_gateway()
    create_and_join()

    response = client.get(
        "/pvp/sessions/web/snapshot",
        params={"player_id": "a"},
    )

    assert response.status_code == 200
    body = response.json()

    assert body["viewer_player_id"] == "a"
    assert "circuit_credits" in body["players"]["a"]
    assert "circuit_credits" not in body["players"]["b"]


def test_websocket_connect_sends_reconnect_state():
    reset_gateway()
    create_and_join()

    with client.websocket_connect(
        "/ws/pvp/web?player_id=a"
    ) as websocket:
        first = websocket.receive_json()

        assert first["type"] == "reconnect_state"
        assert (
            first["payload"]["snapshot"]["viewer_player_id"]
            == "a"
        )


def test_websocket_protocol_round_trip_snapshot():
    reset_gateway()
    create_and_join()

    with client.websocket_connect(
        "/ws/pvp/web?player_id=a"
    ) as websocket:
        websocket.receive_json()  # connect reconnect_state

        websocket.send_json(
            {
                "version": 1,
                "type": "request_snapshot",
                "session_id": "web",
                "player_id": "a",
                "request_id": "snap-1",
                "payload": {},
            }
        )

        response = websocket.receive_json()

        assert response["type"] == "snapshot"
        assert response["request_id"] == "snap-1"
        assert response["payload"]["viewer_player_id"] == "a"


def test_websocket_identity_spoof_returns_protocol_error():
    reset_gateway()
    create_and_join()

    with client.websocket_connect(
        "/ws/pvp/web?player_id=a"
    ) as websocket:
        websocket.receive_json()

        websocket.send_json(
            {
                "version": 1,
                "type": "request_snapshot",
                "session_id": "web",
                "player_id": "b",
                "request_id": "spoof",
                "payload": {},
            }
        )

        response = websocket.receive_json()

        assert response["type"] == "error"


def test_websocket_disconnect_marks_player_disconnected():
    reset_gateway()
    create_and_join()

    with client.websocket_connect(
        "/ws/pvp/web?player_id=a"
    ) as websocket:
        websocket.receive_json()
        assert (
            pvp_service
            .get_session("web")
            .slots["a"]
            .connected
            is True
        )

    assert (
        pvp_service
        .get_session("web")
        .slots["a"]
        .connected
        is True
    )
