from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.matchmaking import MatchmakingService  # noqa: E402
from app.version import VERSION  # noqa: E402


OUTPUT = ROOT / "qa_reports" / "beta29_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.29"
RETIRED_AUDIO = {
    "battle_pulse.wav",
    "battle_pulse_v4.wav",
    "critical_core_layer.wav",
    "critical_core_layer_v4.wav",
    "menu_pulse.wav",
    "menu_pulse_v4.wav",
    "menu_shardglass_v5.wav",
    "pool_pulse.wav",
    "pool_pulse_v4.wav",
    "pool_flux_v5.wav",
}
RETIRED_ACCEPTANCE_RUNNERS = {
    "beta25_acceptance_report.py",
    "beta26_acceptance_report.py",
    "beta27_acceptance_report.py",
    "beta28_acceptance_report.py",
}


class Clock:
    value = 0.0

    def now(self) -> float:
        return self.value


def ai_fallback_is_intact() -> bool:
    clock = Clock()
    service = MatchmakingService(now_func=clock.now)
    service.enqueue(
        "beta29-acceptance-player",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    clock.value = 10.0
    pair = service.match_with_ai("beta29-acceptance-player")
    return pair.opponent_type == "ai" and pair.match_id.startswith(
        "local-ai-match-"
    )


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    audio_runtime = (
        ROOT / "client" / "src" / "gridshard-audio.js"
    ).read_text(encoding="utf-8")
    package_source = (ROOT / "tools" / "package_release.py").read_text(
        encoding="utf-8"
    )
    qa_source = (ROOT / "tools" / "qa.py").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")
    e2e_source = (ROOT / "e2e" / "menu-navigation.spec.js").read_text(
        encoding="utf-8"
    )
    playwright_config = (ROOT / "playwright.config.js").read_text(
        encoding="utf-8"
    )

    audio_dir = ROOT / "client" / "assets" / "audio"
    actual_audio = {path.name for path in audio_dir.glob("*.wav")}
    runtime_audio = set(re.findall(r"assets/audio/([^\"']+\.wav)", audio_runtime))

    checks = {
        "version_integrity": (
            VERSION == EXPECTED_VERSION
            and EXPECTED_VERSION in html
            and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap
        ),
        "compact_battle_icon_cards": (
            app.count('"module-icon pool-module-icon"') == 2
            and app.count("moduleIconFor(module)") >= 3
            and app.count('"pool-module-category"') == 2
            and '.pool-module-card[data-category="enerji"]' in css
            and "grid-template-columns:repeat(2,minmax(0,1fr))" in css
        ),
        "pool_interactions_preserved": (
            'selected ? "✓"' not in app
            and '"pool-choice-select"' in app
            and '"pool-selected-remove"' in app
            and '"required"' in app
            and '"remove"' in app
        ),
        "roadmap_menu_navigation_e2e": (
            all(label in e2e_source for label in ("Oyna", "Profil", "İstatistikler", "Ayarlar"))
            and "Ana Menüye Dön" in e2e_source
            and "menu-navigation" in playwright_config
            and "Ana Menü → Oyna / Profil / İstatistikler / Ayarlar" in roadmap
        ),
        "clean_runtime_audio_inventory": (
            runtime_audio <= actual_audio
            and not (actual_audio & RETIRED_AUDIO)
            and all(not (ROOT / "tools" / name).exists() for name in RETIRED_ACCEPTANCE_RUNNERS)
            and not (ROOT / "RELEASE_MANIFEST.json").exists()
        ),
        "clean_release_packager": (
            "GRIDSHARD-*.zip" in package_source
            and "GRIDSHARD-*.zip.sha256" in package_source
            and '"--output-dir"' in package_source
            and "is_generated_root_artifact" in package_source
            and "beta29_acceptance_report" in qa_source
        ),
        "combat_and_online_foundation_preserved": (
            ai_fallback_is_intact()
            and "presentOnlineMatchFinished" in app
            and "emitDuelImpactEffect" in app
            and "weaponCue" in app
            and "gs-energy-presence" in css
            and 'matchmaking:"./assets/audio/matchmaking_rise.wav"' in audio_runtime
        ),
    }

    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "runtime_audio_files": len(runtime_audio),
        "audio_files_after_cleanup": len(actual_audio),
        "retired_audio_files_removed": len(RETIRED_AUDIO),
        "package_scope": (
            "Kompakt Simgeli Hazırlık · Dört Ekran E2E · "
            "Temiz Ses Envanteri · Kaynak-Kirletmeyen Paketleme"
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
    print(f"Beta.29 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
