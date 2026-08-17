from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_repository,
    telemetry_service,
)
from app.telemetry import (
    TelemetryEvent,
)


client=TestClient(app)


def event(
    event_id,
    event_type="game_opened",
    *,
    session_id=None,
):
    return TelemetryEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp_ms=1,
        player_id="a",
        session_id=session_id,
        metadata=(
            {
                "duration_ms":90000,
                "winner_player_id":"a",
                "is_draw":False,
            }
            if event_type
            == "match_completed"
            else {}
        ),
    )


def prepare(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"telemetry.json"
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        path,
    )

    telemetry_repository.save([
        event("start","match_started",session_id="s1"),
        event("complete","match_completed",session_id="s1"),
    ])
    telemetry_repository.save([
        event("start","match_started",session_id="s1"),
        event("complete","match_completed",session_id="s1"),
        event("open"),
    ])

    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    monkeypatch.setenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        "secret",
    )
    return path


def test_telemetry_restore_requires_correct_admin_token(
    tmp_path,
    monkeypatch,
):
    prepare(
        tmp_path,
        monkeypatch,
    )

    response=client.post(
        "/web-test/telemetry/restore-backup",
        headers={
            "x-relay-admin-token":
                "wrong",
        },
    )

    assert response.status_code==403


def test_telemetry_restore_reloads_memory_and_kpis(
    tmp_path,
    monkeypatch,
):
    prepare(
        tmp_path,
        monkeypatch,
    )

    response=client.post(
        "/web-test/telemetry/restore-backup",
        headers={
            "x-relay-admin-token":
                "secret",
        },
    )

    assert response.status_code==200
    body=response.json()

    assert body["restored"] is True
    assert body["before"]["ready"] is False
    assert body["after"]["ready"] is True
    assert body["event_count"]==2
    assert body["kpis"]["started_matches"]==1
    assert body["kpis"]["completed_matches"]==1

    assert len(
        telemetry_service.events()
    )==2


def test_telemetry_restore_rejected_when_main_healthy(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"telemetry.json"
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        path,
    )
    telemetry_repository.save([
        event("open")
    ])
    monkeypatch.setenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        "secret",
    )

    response=client.post(
        "/web-test/telemetry/restore-backup",
        headers={
            "x-relay-admin-token":"secret",
        },
    )

    assert response.status_code==409
