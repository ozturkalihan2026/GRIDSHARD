from fastapi.testclient import TestClient

from app.main import (
    app,
    pvp_service,
    pvp_websocket_adapter,
)
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


def test_health_exposes_version():
    reset_gateway()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "2.0.0-alpha.35"


def test_create_join_and_start_session():
    reset_gateway()
    create_and_join()

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
        is False
    )
