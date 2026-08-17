from fastapi.testclient import TestClient

from app.main import (
    app,
    player_data_repository,
    telemetry_repository,
)
from app.player_data_store import (
    PlayerDataSnapshot,
)
from app.telemetry import (
    TelemetryEvent,
)


client=TestClient(app)


def player_snapshot():
    player_id="wt-health-123456"
    return PlayerDataSnapshot(
        player_id=player_id,
        profile={
            "player_id":player_id,
        },
        statistics={
            "player_id":player_id,
        },
        settings={
            "player_id":player_id,
        },
    )


def test_data_health_combines_player_and_telemetry_state(
    tmp_path,
    monkeypatch,
):
    player_path=tmp_path/"players.json"
    telemetry_path=tmp_path/"telemetry.json"

    monkeypatch.setattr(
        player_data_repository,
        "path",
        player_path,
    )
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        telemetry_path,
    )

    player_data_repository.save(
        player_snapshot()
    )
    telemetry_repository.save([
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=1,
        )
    ])

    body=client.get(
        "/web-test/data-health"
    ).json()

    assert body["ready"] is True
    assert body["player_data"]["ready"] is True
    assert body["player_data"]["player_count"]==1
    assert body["telemetry"]["ready"] is True
    assert body["telemetry"]["event_count"]==1
    assert body["telemetry"]["retention_limit"]>=1


def test_data_health_reports_independent_backup_states(
    tmp_path,
    monkeypatch,
):
    player_path=tmp_path/"players.json"
    telemetry_path=tmp_path/"telemetry.json"

    monkeypatch.setattr(
        player_data_repository,
        "path",
        player_path,
    )
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        telemetry_path,
    )

    player_data_repository.save(
        player_snapshot()
    )
    player_data_repository.save(
        player_snapshot()
    )

    telemetry_repository.save([
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=1,
        )
    ])
    telemetry_repository.save([
        TelemetryEvent(
            event_id="e1",
            event_type="game_opened",
            timestamp_ms=1,
        ),
        TelemetryEvent(
            event_id="e2",
            event_type="game_opened",
            timestamp_ms=2,
        ),
    ])

    body=client.get(
        "/web-test/data-health"
    ).json()

    assert (
        body["player_data"][
            "backup_available"
        ]
        is True
    )
    assert (
        body["player_data"][
            "backup_ready"
        ]
        is True
    )
    assert (
        body["telemetry"][
            "backup_available"
        ]
        is True
    )
    assert (
        body["telemetry"][
            "backup_ready"
        ]
        is True
    )


def test_data_health_ready_false_if_one_store_corrupt(
    tmp_path,
    monkeypatch,
):
    player_path=tmp_path/"players.json"
    telemetry_path=tmp_path/"telemetry.json"

    monkeypatch.setattr(
        player_data_repository,
        "path",
        player_path,
    )
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        telemetry_path,
    )

    player_data_repository.save(
        player_snapshot()
    )
    telemetry_path.write_text(
        "{broken",
        encoding="utf-8",
    )

    body=client.get(
        "/web-test/data-health"
    ).json()

    assert body["ready"] is False
    assert body["player_data"]["ready"] is True
    assert body["telemetry"]["ready"] is False
    assert body["telemetry"]["state"]=="corrupt"
