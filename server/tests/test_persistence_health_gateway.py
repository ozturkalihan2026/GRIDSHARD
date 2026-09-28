from fastapi.testclient import TestClient

from app.main import (
    app,
    player_data_repository,
)


client=TestClient(app)


def test_health_degrades_when_persistence_file_corrupt(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"players.json"
    path.write_text(
        "{broken",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        player_data_repository,
        "path",
        path,
    )

    body=client.get(
        "/health"
    ).json()

    assert body["status"]=="degraded"
    assert body["persistence"]["player_data"]["ready"] is False
    assert body["persistence"]["player_data"]["state"]=="corrupt"
