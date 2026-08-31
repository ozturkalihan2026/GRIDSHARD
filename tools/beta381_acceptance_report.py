from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta381_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.38.1"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    app = source("client/src/app.js")
    audio = source("client/src/gridshard-audio.js")
    events = source("client/src/battle/battle-event-bus.js")
    css = source("client/src/styles.css")
    html = source("client/index.html")
    qa = source("tools/qa.py")
    e2e = source("e2e/beta381-battle-events.spec.js")
    playwright_config = source("playwright.config.js")
    browser_evidence = json.loads(
        source("qa_reports/beta381_in_app_browser_evidence.json")
    )
    playwright_matrix = json.loads(
        source("qa_reports/beta381_playwright_matrix.json")
    )
    checks = {
        "version_identity": (
            source("server/app/version.py").strip()
            == f'VERSION = "{EXPECTED_VERSION}"'
            and json.loads(source("package.json"))["version"] == EXPECTED_VERSION
            and EXPECTED_VERSION in html
        ),
        "battle_event_bus_loaded": (
            './src/battle/battle-event-bus.js' in html
            and "class GridshardBattleEventBus" in events
            and 'GAME_EFFECT: "game_effect"' in events
            and 'AUDIO_STATE: "audio_state"' in events
            and 'BOOSTER_STATE: "booster_state"' in events
        ),
        "fct_aggregator": (
            "class GridshardBattleEffectAggregator" in events
            and "windowMs = 900" in events
            and "battleEffectAggregator.ingest" in app
            and "chip.dataset.lane" in app
            and "--feedback-lane-offset" in css
        ),
        "single_audio_owner_and_unlock": (
            "class GridshardAudioStateOwner" in events
            and 'requestOwnedAudioState("audio_director_ready"' in app
            and "setTerminalAudioState" in app
            and "bindUserGestureUnlock" in audio
            and "playbackStatus()" in audio
        ),
        "cancellable_booster_targeting": all(
            marker in app
            for marker in (
                'cancelBoosterTargeting("normal_module_click")',
                'cancelBoosterTargeting("escape_key")',
                'cancelBoosterTargeting("empty_battle_area")',
                "BOOSTER_OPTIONS_PER_OFFER = 3",
            )
        ),
        "real_browser_regression": (
            "+20 CAN · ONARIM" in e2e
            and 'data-audio-state", "battle"' in e2e
            and "selectBoosterForTest" in e2e
            and "beta381-battle-events" in playwright_config
            and browser_evidence.get("version") == EXPECTED_VERSION
            and browser_evidence.get("status") == "PASSED"
            and browser_evidence.get("checks", {}).get("booster_offer_count") == 3
            and browser_evidence.get("checks", {}).get("connected_board_gap") == "0px"
            and playwright_matrix.get("version") == EXPECTED_VERSION
            and playwright_matrix.get("status") == "PASSED"
            and playwright_matrix.get("summary", {}).get("passed") == 12
            and playwright_matrix.get("summary", {}).get("unexpected") == 0
        ),
        "qa_gate": all(
            marker in qa
            for marker in (
                '"client_battle_event_bus"',
                '"client_audio_unlock"',
                '"client_beta381_regression"',
                "tools/beta381_acceptance_report.py",
            )
        ),
        "package_identity": (
            'VERSION = "2.0.0-beta.38.1"' in source("tools/package_release.py")
            and 'PACKAGE_LABEL = "fix"' in source("tools/package_release.py")
        ),
    }
    payload = {
        "project":"GRIDSHARD",
        "version":EXPECTED_VERSION,
        "ok":all(checks.values()),
        "checks":checks,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.38.1 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
