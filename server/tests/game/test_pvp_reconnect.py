import pytest

from app.game.models import BattleCommand
from app.game.pvp_session import PvPSessionError, PvPSessionService


def service_with_running_session():
    service = PvPSessionService()
    session = service.create_session("match")
    service.join("match", "a")
    service.join("match", "b")
    service.start("match")
    return service, session


def test_sequenced_command_accepts_monotonic_sequence():
    service, session = service_with_running_session()
    service.submit_sequenced_command(
        "match", "a", 1,
        BattleCommand("a", "unknown_command_for_queue_test", {}),
    )
    assert session.slots["a"].last_command_sequence == 1


def test_duplicate_or_old_command_sequence_is_rejected():
    service, session = service_with_running_session()
    command = BattleCommand("a", "unknown_command_for_queue_test", {})
    service.submit_sequenced_command("match", "a", 5, command)

    with pytest.raises(PvPSessionError):
        service.submit_sequenced_command("match", "a", 5, command)
    with pytest.raises(PvPSessionError):
        service.submit_sequenced_command("match", "a", 4, command)


def test_snapshot_revision_tracks_engine_tick():
    service, session = service_with_running_session()
    before = service.snapshot("match", "a")["snapshot_revision"]
    service.step("match")
    after = service.snapshot("match", "a")["snapshot_revision"]
    assert after == before + 1


def test_event_ack_cursor_cannot_move_backward():
    service, session = service_with_running_session()
    session.engine._emit("one", {})
    session.engine._emit("two", {})
    cursor = len(session.engine.state.events)
    service.acknowledge_events("match", "a", cursor)

    with pytest.raises(PvPSessionError):
        service.acknowledge_events("match", "a", cursor - 1)


def test_event_ack_cursor_cannot_exceed_event_count():
    service, session = service_with_running_session()
    with pytest.raises(PvPSessionError):
        service.acknowledge_events("match", "a", 999)


def test_reconnect_returns_snapshot_and_only_unacked_events():
    service, session = service_with_running_session()

    baseline = len(session.engine.state.events)
    session.engine._emit("one", {"n": 1})
    first_cursor = len(session.engine.state.events)
    session.engine._emit("two", {"n": 2})

    service.acknowledge_events("match", "a", first_cursor)
    service.disconnect("match", "a")

    payload = service.reconnect_payload("match", "a")

    assert session.slots["a"].connected is True
    assert payload["snapshot"]["viewer_player_id"] == "a"
    assert len(payload["events"]) == 1
    assert payload["events"][0]["type"] == "two"
    assert payload["acknowledged_event_cursor"] == first_cursor
    assert first_cursor == baseline + 1


def test_reconnect_preserves_last_command_sequence():
    service, session = service_with_running_session()
    service.submit_sequenced_command(
        "match", "a", 7,
        BattleCommand("a", "unknown_command_for_queue_test", {}),
    )
    service.disconnect("match", "a")
    payload = service.reconnect_payload("match", "a")
    assert payload["last_command_sequence"] == 7


def test_events_page_reports_from_cursor_and_revision():
    service, session = service_with_running_session()
    baseline = len(session.engine.state.events)
    session.engine._emit("event", {})

    page = service.events_since("match", "a", baseline)

    assert page["from_cursor"] == baseline
    assert page["cursor"] == baseline + 1
    assert page["snapshot_revision"] == session.engine.state.tick
    assert len(page["events"]) == 1
