from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_repository,
)


client=TestClient(app)


def test_corrupt_telemetry_degrades_health_and_release(
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
    assert (
        health["web_test"][
            "capabilities"
        ][
            "telemetry_persistence"
        ]
        is False
    )

    release=client.get(
        "/web-test/release-check"
    ).json()
    assert release["ready"] is False
    assert (
        release["checks"][
            "telemetry_persistence"
        ]
        is False
    )

    manifest=client.get(
        "/web-test/manifest"
    ).json()
    assert (
        manifest[
            "telemetry_persistence_ready"
        ]
        is False
    )
    assert manifest["release_ready"] is False
