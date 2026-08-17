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
    assert body["persistence"]["ready"] is False
    assert body["persistence"]["state"]=="corrupt"
    assert body["web_test"]["ready"] is False

    release=client.get(
        "/web-test/release-check"
    ).json()

    assert release["ready"] is False
    assert (
        release["checks"][
            "player_data_persistence"
        ]
        is False
    )

    manifest=client.get(
        "/web-test/manifest"
    ).json()

    assert (
        manifest[
            "player_data_persistence_ready"
        ]
        is False
    )
    assert manifest["release_ready"] is False
