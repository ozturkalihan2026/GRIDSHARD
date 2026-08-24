from __future__ import annotations

import hashlib
import json
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.matchmaking import MatchmakingService  # noqa: E402
from app.version import VERSION  # noqa: E402


OUTPUT = ROOT / "qa_reports" / "beta27_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.27"
WEAPON_AUDIO = (
    "laser_fire.wav",
    "pulse_cannon_fire.wav",
    "railgun_fire.wav",
    "missile_fire.wav",
    "drone_fire.wav",
    "arc_cannon_fire.wav",
)


class Clock:
    value = 0.0

    def now(self) -> float:
        return self.value


def ai_fallback_is_intact() -> bool:
    clock = Clock()
    service = MatchmakingService(now_func=clock.now)
    service.enqueue(
        "beta27-acceptance-player",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    clock.value = 10.0
    pair = service.match_with_ai("beta27-acceptance-player")
    return pair.opponent_type == "ai" and pair.match_id.startswith(
        "local-ai-match-"
    )


def audio_is_distinct_and_valid() -> bool:
    hashes = set()
    for filename in WEAPON_AUDIO:
        path = ROOT / "client" / "assets" / "audio" / filename
        if not path.exists():
            return False
        hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
        with wave.open(str(path), "rb") as reader:
            duration = reader.getnframes() / reader.getframerate()
            if reader.getframerate() != 44_100 or not 0.45 <= duration <= 0.85:
                return False
    return len(hashes) == len(WEAPON_AUDIO)


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(
        encoding="utf-8"
    )
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    audio = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    launcher = (ROOT / "BASLAT_WEB_TEST.bat").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")

    checks = {
        "version_integrity": (
            VERSION == EXPECTED_VERSION
            and EXPECTED_VERSION in html
            and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap
        ),
        "beta26_combat_foundation_preserved": (
            ai_fallback_is_intact()
            and "processLocalServerEvents" in app
            and "presentOnlineMatchFinished" in app
        ),
        "server_truth_energy_flow": (
            "serverModule.energy_received" in relay
            and "serverModule.energy_required" in relay
            and "appendEnergyFlowIndicator" in app
            and "gs-energy-current" in css
        ),
        "target_reaching_weapon_fx": (
            "emitDuelImpactEffect" in app
            and "duel-shot-projectile" in app
            and "duel-hit-impact" in app
            and "gs-projectile-travel" in css
            and "gs-hit-spark" in css
        ),
        "six_distinct_weapon_sounds": (
            audio_is_distinct_and_valid()
            and all(filename in audio for filename in WEAPON_AUDIO)
            and "weaponCue" in app
        ),
        "port_and_partial_venv_guard": (
            "GRIDSHARD_WEB_PORT" in launcher
            and 'if exist ".venv\\pyvenv.cfg"' in launcher
        ),
        "reduced_motion_preserved": (
            "prefers-reduced-motion:reduce" in css
            and ".duel-shot-projectile" in css
            and ".energy-flow-indicator i" in css
        ),
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "package_scope": (
            "P5 Savaş Okunabilirliği · Sunucu Gerçekliğinde Enerji Akışı · "
            "Hedefe Ulaşan Altı Silah Profili · Her Vuruşta Çarpma Geri Bildirimi · "
            "Altı Özgün Ateş Sesi"
        ),
        "balance_changed": False,
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
    print(f"Beta.27 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
