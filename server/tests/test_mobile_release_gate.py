import json
from pathlib import Path

from app.mobile_release_gate import evaluate_release_gate


def _write_json(path: Path, payload: dict) -> Path:
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _device_evidence(path: Path, target: str, commit_sha: str) -> Path:
    return _write_json(path, {
        "target": target,
        "device_kind": "real",
        "passed": True,
        "commit_sha": commit_sha,
        "browserstack_session_id": "session-123",
    })


def test_android_gate_accepts_signed_candidate_and_matching_real_device_evidence(tmp_path):
    artifact = tmp_path / "gridshard.aab"
    artifact.write_bytes(b"signed-candidate")
    report = evaluate_release_gate(
        stage="android",
        artifact=artifact,
        device_evidence=_device_evidence(tmp_path / "android.json", "android-chrome", "abc123"),
        commit_sha="abc123",
        app_id="com.gridshard.arena",
        api_base_url="https://api.gridshard.example",
        cors_origins=("https://localhost",),
    )
    assert report["ready"] is True
    assert report["next_action"] == "google_play_closed_test_upload"


def test_ios_gate_stays_closed_until_android_closed_test_is_proven(tmp_path):
    artifact = tmp_path / "gridshard.ipa"
    artifact.write_bytes(b"signed-candidate")
    report = evaluate_release_gate(
        stage="ios",
        artifact=artifact,
        device_evidence=_device_evidence(tmp_path / "ios.json", "iphone-safari", "abc123"),
        commit_sha="abc123",
        app_id="com.gridshard.arena",
        api_base_url="https://api.gridshard.example",
        cors_origins=("capacitor://localhost",),
    )
    assert report["ready"] is False
    assert any("Android kapalı test" in blocker for blocker in report["blockers"])


def test_ios_gate_opens_after_matching_android_closed_test_evidence(tmp_path):
    artifact = tmp_path / "gridshard.ipa"
    artifact.write_bytes(b"signed-candidate")
    android = _write_json(tmp_path / "android-closed.json", {
        "stage": "android_closed_test",
        "passed": True,
        "app_id": "com.gridshard.arena",
        "commit_sha": "abc123",
    })
    report = evaluate_release_gate(
        stage="ios",
        artifact=artifact,
        device_evidence=_device_evidence(tmp_path / "ios.json", "iphone-safari", "abc123"),
        android_closed_test_evidence=android,
        commit_sha="abc123",
        app_id="com.gridshard.arena",
        api_base_url="https://api.gridshard.example",
        cors_origins=("capacitor://localhost",),
    )
    assert report["ready"] is True
    assert report["next_action"] == "app_store_connect_testflight_upload"
