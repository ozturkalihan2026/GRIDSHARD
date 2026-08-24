from __future__ import annotations

import json
import math
import struct
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.game.booster_schedule import (  # noqa: E402
    BOOSTER_FIRST_OFFER_MS,
    BOOSTER_OFFER_INTERVAL_MS,
)
from app.game.engine import max_active_modules_for_elapsed_ms  # noqa: E402
from app.matchmaking import MatchmakingService  # noqa: E402
from app.version import VERSION  # noqa: E402


OUTPUT = ROOT / "qa_reports" / "beta28_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.28"
ENSEMBLE_AUDIO = ("menu_ensemble_v6.wav", "pool_ensemble_v6.wav")


class Clock:
    value = 0.0

    def now(self) -> float:
        return self.value


def ai_fallback_is_intact() -> bool:
    clock = Clock()
    service = MatchmakingService(now_func=clock.now)
    service.enqueue(
        "beta28-acceptance-player",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    clock.value = 10.0
    pair = service.match_with_ai("beta28-acceptance-player")
    return pair.opponent_type == "ai" and pair.match_id.startswith(
        "local-ai-match-"
    )


def ensemble_audio_is_valid() -> bool:
    for filename in ENSEMBLE_AUDIO:
        path = ROOT / "client" / "assets" / "audio" / filename
        if not path.exists():
            return False
        with wave.open(str(path), "rb") as reader:
            if (
                reader.getnchannels() != 2
                or reader.getsampwidth() != 2
                or reader.getframerate() != 22_050
                or reader.getnframes() / reader.getframerate() != 32.0
            ):
                return False
            raw = reader.readframes(reader.getnframes())
        samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
        peak_dbfs = 20 * math.log10(max(abs(value) for value in samples) / 32_767)
        if not -6.1 <= peak_dbfs <= -5.9:
            return False
    return True


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(
        encoding="utf-8"
    )
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    i18n = (ROOT / "client" / "src" / "i18n.js").read_text(encoding="utf-8")
    audio = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    engine = (ROOT / "server" / "app" / "game" / "engine.py").read_text(
        encoding="utf-8"
    )
    snapshot = (
        ROOT / "server" / "app" / "game" / "pvp_session.py"
    ).read_text(encoding="utf-8")
    launcher = (ROOT / "BASLAT_WEB_TEST.bat").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")

    checks = {
        "version_integrity": (
            VERSION == EXPECTED_VERSION
            and EXPECTED_VERSION in html
            and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap
        ),
        "beta26_and_beta27_foundation_preserved": (
            ai_fallback_is_intact()
            and "presentOnlineMatchFinished" in app
            and "emitDuelImpactEffect" in app
            and "weaponCue" in app
            and "GRIDSHARD_WEB_PORT" in launcher
        ),
        "ghost_bridge_and_move_guard": (
            "excluded.position = None" in engine
            and "exclude_module_id=module.instance_id" in engine
            and "Jeneratöre uzanan çalışan bir port" in engine
        ),
        "server_power_truth_and_effective_ports": (
            '"power_reason"' in snapshot
            and '"ports"' in snapshot
            and "effective_port_count(module)" in snapshot
            and "serverModule.power_reason" in relay
            and "serverModule.ports" in relay
        ),
        "stable_energy_ui_and_tooltip": (
            "gs-energy-presence" in css
            and "power-state-tooltip" in css
            and "energy-disconnected" in css
            and "gs-energy-current" not in css
            and "powerReason" in app
        ),
        "lower_pressure_pacing": (
            [
                max_active_modules_for_elapsed_ms(value)
                for value in (15_000, 30_000, 45_000, 60_000, 75_000, 90_000)
            ]
            == [5, 6, 7, 8, 9, 10]
            and BOOSTER_FIRST_OFFER_MS == 105_000
            and BOOSTER_OFFER_INTERVAL_MS == 30_000
        ),
        "ensemble_menu_music": (
            ensemble_audio_is_valid()
            and 'version:"shardglass-ensemble-v6"' in audio
            and all(filename in audio for filename in ENSEMBLE_AUDIO)
        ),
        "english_menu_localization": (
            "GridshardI18n" in app
            and "MutationObserver" in i18n
            and '"Hazırlık Ekranına Dön":"Return to Preparation"' in i18n
            and '"Enerji":"Energy"' in i18n
            and "./src/i18n.js" in html
        ),
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "package_scope": (
            "Enerji Motoru Doğruluğu · Sade Güç Durumu · 15 sn Karar Ritmi · "
            "30 sn Güçlendirici Ritmi · Ensemble Menü Müziği · İngilizce Menü"
        ),
        "external_evidence_not_claimed": [
            "fiziksel Android/iPhone",
            "gerçek kullanıcı telemetrisi",
            "20 aktif modüllü uzun süreli gerçek PvP soak testi",
        ],
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.28 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
