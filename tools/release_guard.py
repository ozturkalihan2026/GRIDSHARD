from __future__ import annotations

from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
EXPECTED_VERSION="2.0.0-beta.31"


def fail(message:str)->None:
    print(
        f"[GRIDSHARD][KAYNAK HATASI] {message}",
        file=sys.stderr,
    )
    print(
        "[GRIDSHARD] Eski klasörün üzerine karışık kopyalama yapmayın. "
        "ZIP'i boş bir klasöre çıkarıp BASLAT_WEB_TEST.bat dosyasını oradan çalıştırın.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def main()->None:
    sys.path.insert(
        0,
        str(ROOT/"server"),
    )

    from app.version import VERSION
    from app.manual_battle_report import (
        build_manual_battle_report,
    )

    if VERSION != EXPECTED_VERSION:
        fail(
            f"Beklenen sürüm {EXPECTED_VERSION}, çalışan kaynak {VERSION}."
        )

    html=(
        ROOT/"client/index.html"
    ).read_text(
        encoding="utf-8"
    )
    if EXPECTED_VERSION not in html:
        fail(
            "UI build etiketi sunucu sürümüyle eşleşmiyor."
        )

    source_path=(
        ROOT
        / "server"
        / "app"
        / "manual_battle_report.py"
    )
    source=source_path.read_text(
        encoding="utf-8"
    )

    if "event.player_id" in source:
        fail(
            "manual_battle_report.py eski nesne erişimi içeriyor (event.player_id)."
        )

    if "def _event_value" not in source:
        fail(
            "manual_battle_report.py dict/nesne uyumluluk katmanı eksik."
        )

    probe={
        "event_id":"release-guard",
        "event_type":
            "local_battle_completed",
        "timestamp_ms":1,
        "player_id":
            "release-guard-player",
        "metadata":{
            "won":True,
            "duration_ms":60_000,
            "credits_spent":0,
            "generator_moves":0,
            "damage_dealt":0,
            "damage_received":0,
            "shield_mitigated":0,
            "module_changes":0,
        },
    }

    report=build_manual_battle_report(
        events=[probe],
        player_id=
            "release-guard-player",
    )

    if report.get("battle_count") != 1:
        fail(
            "Dict telemetri probe'u manuel savaş raporuna ulaşamadı."
        )

    print(
        "[GRIDSHARD] Kaynak bütünlüğü doğrulandı: "
        f"{EXPECTED_VERSION} · dict telemetri uyumlu."
    )


if __name__=="__main__":
    main()
