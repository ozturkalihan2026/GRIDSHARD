from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_repository,
)


client=TestClient(app)


def test_corrupt_telemetry_degrades_health(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"telemetry.json"
    path.write_text(
        "{broken",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        telemetry_repository,
        "path",
        path,
    )

    health=client.get(
        "/health"
    ).json()

    assert health["status"]=="degraded"
    assert (
        health["persistence"][
            "telemetry"
        ]["ready"]
        is False
    )
