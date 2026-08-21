from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.matchmaking import MatchmakingService  # noqa: E402
from app.version import VERSION  # noqa: E402


OUTPUT = ROOT / "qa_reports" / "beta26_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.26"


class Clock:
    value = 0.0

    def now(self) -> float:
        return self.value


def matchmaking_fallback_check() -> bool:
    clock = Clock()
    service = MatchmakingService(now_func=clock.now)
    service.enqueue(
        "acceptance-player",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    clock.value = 10.0
    pair = service.match_with_ai("acceptance-player")
    return (
        pair.opponent_type == "ai"
        and pair.match_id.startswith("local-ai-match-")
        and not service.queued("acceptance-player")
    )


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app_source = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay_source = (ROOT / "client" / "src" / "relay-client.js").read_text(
        encoding="utf-8"
    )
    engine_source = (ROOT / "server" / "app" / "game" / "engine.py").read_text(
        encoding="utf-8"
    )
    runner_source = (ROOT / "server" / "app" / "game" / "pvp_runner.py").read_text(
        encoding="utf-8"
    )
    launcher = (ROOT / "BASLAT_WEB_TEST.bat").read_text(encoding="utf-8")
    quick_launcher = (ROOT / "HIZLI_SAVAS_TESTI.bat").read_text(encoding="utf-8")

    checks = {
        "version": VERSION == EXPECTED_VERSION and EXPECTED_VERSION in html,
        "single_matchmaking_path": (
            'id="battle-prepare-local"' not in html
            and 'id="battle-prepare-online"' not in html
            and "10 sn sonra AI devralır" in html
            and matchmaking_fallback_check()
        ),
        "large_preset_manager": (
            'id="battle-pool-preset-dialog"' in html
            and 'id="battle-pool-preset-open"' in html
        ),
        "player_initial_module_choice": (
            'id="initial-module-picker"' in html
            and "initialBattleModuleIds" in app_source
            and "buildInitialOnlineSetup" in app_source
        ),
        "capacity_and_activation": (
            "max_active_modules_for_elapsed_ms" in engine_source
            and "_connected_direction_for_placement" in engine_source
            and "pendingPlacementModuleIds" in relay_source
        ),
        "live_ai_actions": (
            "enqueue_ai_actions" in runner_source
            and "ai_next_decision_at_ms" in runner_source
        ),
        "web_launcher_hardened": (
            "GRIDSHARD_WEB_PORT" in launcher
            and "import fastapi,uvicorn,redis,psycopg_pool" in launcher
        ),
        "quick_launcher_version_guard": (
            "GRIDSHARD_WEB_PORT" in quick_launcher
            and "/health" in quick_launcher
            and EXPECTED_VERSION in quick_launcher
            and 'start "" "http://127.0.0.1:8000/"' not in quick_launcher
        ),
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "package_scope": (
            "Canlı Telemetri Sertleştirmesi + Görsel Erişilebilirlik + "
            "Bağlantı Hata Akışı + Tek Eşleştirme/AI Devralma + Aktif Devre"
        ),
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.26 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
