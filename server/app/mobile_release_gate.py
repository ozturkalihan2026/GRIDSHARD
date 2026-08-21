from __future__ import annotations

import json
from pathlib import Path


PLACEHOLDER_APP_IDS = {"", "com.example.gridshard"}


def _load_json(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Kanıt okunamadı: {path}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Kanıt JSON nesnesi olmalıdır: {path}")
    return payload


def evaluate_release_gate(
    *,
    stage: str,
    artifact: Path,
    device_evidence: Path,
    commit_sha: str,
    app_id: str,
    api_base_url: str,
    cors_origins: tuple[str, ...],
    android_closed_test_evidence: Path | None = None,
) -> dict:
    blockers: list[str] = []
    expected_target = "android-chrome" if stage == "android" else "iphone-safari"
    expected_suffix = ".aab" if stage == "android" else ".ipa"
    required_origin = "https://localhost" if stage == "android" else "capacitor://localhost"

    if app_id in PLACEHOLDER_APP_IDS or app_id.count(".") < 2:
        blockers.append("Kalıcı GRIDSHARD_APP_ID seçilmedi.")
    if not api_base_url.startswith("https://"):
        blockers.append("GRIDSHARD_API_BASE_URL geçerli bir HTTPS adresi değil.")
    if required_origin not in cors_origins:
        blockers.append(f"Backend CORS listesinde {required_origin} yok.")
    if artifact.suffix.lower() != expected_suffix or not artifact.is_file():
        blockers.append(f"İmzalı {expected_suffix} adayı bulunamadı: {artifact}")
    elif artifact.stat().st_size == 0:
        blockers.append(f"Mobil aday boş: {artifact}")

    try:
        evidence = _load_json(device_evidence)
    except ValueError as exc:
        blockers.append(str(exc))
    else:
        if evidence.get("target") != expected_target:
            blockers.append(f"Gerçek cihaz hedefi {expected_target} değil.")
        if evidence.get("device_kind") != "real" or evidence.get("passed") is not True:
            blockers.append("Gerçek cihaz E2E kanıtı başarılı değil.")
        if not evidence.get("browserstack_session_id"):
            blockers.append("Gerçek cihaz oturum kimliği eksik.")
        if evidence.get("commit_sha") != commit_sha:
            blockers.append("Gerçek cihaz kanıtı yayın commit'i ile eşleşmiyor.")

    if stage == "ios":
        if android_closed_test_evidence is None:
            blockers.append("Android kapalı test kanıtı verilmedi; TestFlight kapısı açılamaz.")
        else:
            try:
                android_evidence = _load_json(android_closed_test_evidence)
            except ValueError as exc:
                blockers.append(str(exc))
            else:
                if android_evidence.get("stage") != "android_closed_test":
                    blockers.append("Ön koşul kanıtı Android kapalı test aşamasına ait değil.")
                if android_evidence.get("passed") is not True:
                    blockers.append("Android kapalı test başarıyla tamamlanmadı.")
                if android_evidence.get("app_id") != app_id:
                    blockers.append("Android kapalı test app id'si iOS adayıyla eşleşmiyor.")
                if android_evidence.get("commit_sha") != commit_sha:
                    blockers.append("Android kapalı test kanıtı yayın commit'i ile eşleşmiyor.")

    return {
        "schema_version": 1,
        "stage": stage,
        "commit_sha": commit_sha,
        "app_id": app_id,
        "artifact": str(artifact),
        "device_evidence": str(device_evidence),
        "ready": not blockers,
        "next_action": (
            "google_play_closed_test_upload"
            if stage == "android"
            else "app_store_connect_testflight_upload"
        ),
        "blockers": blockers,
    }
