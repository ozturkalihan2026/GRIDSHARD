import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.auth import JsonIdentityRepository, ParticipantAuthService
from app.game.models import BattleCommand, BattleStatus
from app.game.pvp_session import PvPSessionService
from app.main import app


def _auth_headers(client: TestClient, player_id: str, secret: str) -> dict[str, str]:
    response = client.post(
        "/auth/session",
        json={"player_id": player_id, "device_secret": secret},
    )
    assert response.status_code == 200
    return {"authorization": f"Bearer {response.json()['access_token']}"}


def test_access_token_is_signed_expiring_and_bound_to_identity(tmp_path: Path):
    now = [1_000.0]
    service = ParticipantAuthService(
        JsonIdentityRepository(tmp_path / "identities.json"),
        b"test-signing-key-that-is-longer-than-thirty-two-bytes",
        now_func=lambda: now[0],
        access_token_ttl_seconds=60,
    )
    session = service.register_or_login("player-a", "a" * 32)
    identity = service.verify_access_token(session["access_token"])
    assert identity.player_id == "player-a"

    now[0] = 1_061.0
    try:
        service.verify_access_token(session["access_token"])
    except ValueError as exc:
        assert "süresi doldu" in str(exc)
    else:
        raise AssertionError("Süresi dolan belirteç kabul edilmemeliydi.")


def test_http_identity_cannot_read_or_mutate_another_player(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(app)
    player_a = "auth-player-a"
    player_b = "auth-player-b"
    headers_a = _auth_headers(client, player_a, "a" * 40)
    headers_b = _auth_headers(client, player_b, "b" * 40)

    assert client.post(
        f"/participants/{player_a}/bootstrap",
        headers=headers_a,
    ).status_code == 200
    assert client.post(
        f"/participants/{player_b}/bootstrap",
        headers=headers_b,
    ).status_code == 200
    assert client.get(f"/profile/{player_b}", headers=headers_a).status_code == 403
    assert client.put(
        f"/settings/{player_b}",
        headers=headers_a,
        json={
            "sound_volume": 10,
            "music_volume": 10,
            "sound_muted": False,
            "music_muted": False,
            "vibration_enabled": True,
            "graphics_quality": "orta",
            "language": "tr",
        },
    ).status_code == 403
    assert client.post(
        "/matchmaking/join",
        headers=headers_a,
        json={"player_id": player_b},
    ).status_code == 403


def test_body_player_id_is_checked_for_every_json_content_type(monkeypatch):
    # FastAPI gövdeyi `+json` türlerinde ve büyük harfli yazımda da çözer;
    # kimlik denetimi içerik türüne göre atlanmamalı.
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(app)
    player_a = "auth-ctype-player-a"
    player_b = "auth-ctype-player-b"
    headers_a = _auth_headers(client, player_a, "a" * 40)
    headers_b = _auth_headers(client, player_b, "b" * 40)
    for player_id, headers in ((player_a, headers_a), (player_b, headers_b)):
        assert client.post(f"/participants/{player_id}/bootstrap", headers=headers).status_code == 200

    for content_type in (
        "application/json",
        "application/vnd.api+json",
        "APPLICATION/JSON",
        "application/json; charset=utf-8",
        "text/plain",
    ):
        for path, body in (
            ("/matchmaking/join", {"player_id": player_b}),
            ("/teams/any-team/leave", {"player_id": player_b, "request_id": "ctype-leave-1"}),
            ("/events/weekly/register", {"player_id": player_b, "request_id": "ctype-event-1"}),
        ):
            response = client.post(
                path,
                headers={**headers_a, "content-type": content_type},
                content=json.dumps(body).encode("utf-8"),
            )
            assert response.status_code == 403, (content_type, path, response.text)

    # Dize olmayan kimlik de başka oyuncu sayılır.
    assert client.post(
        "/matchmaking/join",
        headers={**headers_a, "content-type": "application/json"},
        content=b'{"player_id": ["auth-ctype-player-b"]}',
    ).status_code == 403
    # Kendi kimliğiyle istek her yazımda kabul edilir.
    own = client.post(
        "/matchmaking/join",
        headers={**headers_a, "content-type": "application/vnd.api+json"},
        content=json.dumps({"player_id": player_a}).encode("utf-8"),
    )
    assert own.status_code == 200, own.text
    client.delete(f"/matchmaking/{player_a}", headers=headers_a)


def test_http_private_routes_reject_missing_token(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    response = TestClient(app).get("/profile/no-token-player")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_pvp_events_and_reserve_modules_are_private_to_owner():
    service = PvPSessionService()
    session = service.create_session("privacy")
    service.join("privacy", "player-a")
    service.join("privacy", "player-b")
    engine = session.engine
    engine.add_player("player-a") if "player-a" not in engine.state.players else None
    engine.add_player("player-b") if "player-b" not in engine.state.players else None
    engine.set_battle_pool("player-a", [
        "battery", "laser", "pulse_cannon", "shield", "repair", "targeting_computer",
    ])

    player_a_events = service.events_since("privacy", "player-a")["events"]
    player_b_events = service.events_since("privacy", "player-b")["events"]
    assert any(event["type"] == "battle_pool_set" for event in player_a_events)
    assert not any(event["type"] == "battle_pool_set" for event in player_b_events)

    snapshot = service.snapshot("privacy", "player-b")
    assert snapshot["players"]["player-a"]["modules"] == []


def test_command_payload_and_private_result_fields_do_not_leak():
    service = PvPSessionService()
    session = service.create_session("events")
    service.join("events", "player-a")
    service.join("events", "player-b")
    session.engine.state.status = BattleStatus.RUNNING
    session.engine.state.events.clear()
    session.engine.enqueue_command(BattleCommand(
        player_id="player-a",
        kind="unknown-secret-command",
        payload={"secret": "do-not-leak"},
    ))
    session.engine.step()

    own = service.events_since("events", "player-a")["events"]
    opponent = service.events_since("events", "player-b")["events"]
    assert any(event["type"] == "command_received" for event in own)
    assert not any(event["type"] in {"command_received", "command_rejected"} for event in opponent)


def test_telemetry_endpoints_require_identity_and_stay_private(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(app)
    payload = {
        "event_id": "telemetry-private-1",
        "event_type": "game_opened",
        "timestamp_ms": 1,
        "metadata": {"platform": "web"},
    }
    assert client.post("/telemetry/events", json=payload).status_code == 401
    assert client.get("/telemetry/events").status_code == 401

    player_a = "telemetry-player-a"
    player_b = "telemetry-player-b"
    headers_a = _auth_headers(client, player_a, "a" * 40)
    headers_b = _auth_headers(client, player_b, "b" * 40)
    # Başkası adına olay yazılamaz; kimliksiz olay belirtecin sahibine yazılır.
    assert client.post(
        "/telemetry/events", headers=headers_a, json={**payload, "player_id": player_b},
    ).status_code == 403
    assert client.post("/telemetry/events", headers=headers_a, json=payload).status_code == 200
    assert client.post(
        "/telemetry/events",
        headers=headers_b,
        json={**payload, "event_id": "telemetry-private-2", "player_id": player_b},
    ).status_code == 200

    own = client.get("/telemetry/events", headers=headers_a).json()["events"]
    assert {item["player_id"] for item in own} == {player_a}
    assert client.get(
        "/telemetry/events", headers=headers_a, params={"player_id": player_b},
    ).status_code == 403

    oversized = {**payload, "event_id": "telemetry-private-3", "metadata": {"blob": "x" * 5000}}
    assert client.post("/telemetry/events", headers=headers_a, json=oversized).status_code == 413
