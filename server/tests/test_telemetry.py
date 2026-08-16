from fastapi.testclient import TestClient

from app.game.engine import BattleEngine
from app.game.models import BattleState, BattleStatus
from app.main import (
    app,
    matchmaking_service,
    player_profile_service,
    pvp_service,
    telemetry_service,
)
from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryError,
    TelemetryEvent,
)


client = TestClient(app)


def test_event_id_deduplicates():
    service = InMemoryTelemetryService()
    event = TelemetryEvent(
        event_id="e1",
        event_type="game_opened",
        timestamp_ms=1,
        player_id="a",
    )

    assert service.record(event) is True
    assert service.record(event) is False
    assert len(service.events()) == 1


def test_invalid_type_rejected():
    service = InMemoryTelemetryService()

    try:
        service.record(
            TelemetryEvent(
                event_id="e1",
                event_type="invalid",
                timestamp_ms=1,
            )
        )
    except TelemetryError:
        pass
    else:
        raise AssertionError("Geçersiz telemetri tipi reddedilmeliydi.")


def test_summary_counts_credit_spending():
    service = InMemoryTelemetryService()

    service.record(TelemetryEvent(
        event_id="e1",
        event_type="circuit_credit_spent",
        timestamp_ms=1,
        player_id="a",
        metadata={"amount": 90},
    ))
    service.record(TelemetryEvent(
        event_id="e2",
        event_type="module_changed",
        timestamp_ms=2,
        player_id="a",
    ))

    summary = service.summary(player_id="a")
    assert summary["event_count"] == 2
    assert summary["counts_by_type"]["module_changed"] == 1
    assert summary["total_circuit_credits_spent"] == 90


def synthetic_finished_battle():
    engine = BattleEngine(BattleState(battle_id="telemetry-battle"))
    engine.add_player("a")
    engine.add_player("b")

    engine.state.status = BattleStatus.FINISHED
    engine.state.is_draw = True
    engine.state.finish_reason = "time_limit_draw"
    engine.state.finished_at_ms = 180000

    engine._emit("battle_started", {})
    engine._emit("circuit_credits_spent", {
        "player_id": "a",
        "amount": 90,
        "reason": "modul_yerlestir:laser",
        "balance": 110,
    })
    engine._emit("module_replaced", {
        "player_id": "a",
        "outgoing_module_id": "old",
        "incoming_module_id": "new",
    })
    engine._emit("booster_applied", {
        "player_id": "a",
        "booster_id": "overcharge_chip",
        "target_module_id": "new",
    })
    return engine.state


def test_finished_battle_generates_verified_telemetry():
    service = InMemoryTelemetryService()
    state = synthetic_finished_battle()

    assert service.ingest_finished_battle(state) == 7
    assert service.ingest_finished_battle(state) == 0

    types = [
        item["event_type"]
        for item in service.events(session_id="telemetry-battle")
    ]
    assert types.count("match_started") == 2
    assert types.count("match_completed") == 2
    assert "module_changed" in types
    assert "circuit_credit_spent" in types
    assert "booster_used" in types


def reset_gateway():
    telemetry_service.clear()
    matchmaking_service._queue.clear()
    player_profile_service._profiles.clear()
    pvp_service._sessions.clear()


def test_telemetry_endpoint_deduplicates():
    reset_gateway()
    payload = {
        "event_id": "client-open-1",
        "event_type": "game_opened",
        "timestamp_ms": 12345,
        "player_id": "a",
        "metadata": {"platform": "web"},
    }

    first = client.post("/telemetry/events", json=payload)
    second = client.post("/telemetry/events", json=payload)

    assert first.status_code == 200
    assert first.json()["accepted"] is True
    assert second.json()["duplicate"] is True


def test_matchmaking_records_start_and_match():
    reset_gateway()

    first = client.post("/matchmaking/join", json={"player_id": "a"})
    second = client.post("/matchmaking/join", json={"player_id": "b"})

    assert first.status_code == 200
    assert second.json()["matched"] is True

    a_started = client.get(
        "/telemetry/events",
        params={"player_id": "a", "event_type": "matchmaking_started"},
    ).json()["events"]
    assert len(a_started) == 1

    session_id = second.json()["session_id"]
    matched = client.get(
        "/telemetry/events",
        params={"session_id": session_id, "event_type": "matchmaking_matched"},
    ).json()["events"]
    assert {e["player_id"] for e in matched} == {"a", "b"}
