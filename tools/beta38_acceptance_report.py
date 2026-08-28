from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta38_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.38"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    app = source("client/src/app.js")
    css = source("client/src/styles.css")
    html = source("client/index.html")
    booster_schedule = source("server/app/game/booster_schedule.py")
    qa = source("tools/qa.py")
    module_swap_e2e = source("e2e/battle-module-swap.spec.js")
    checks = {
        "version_identity": (
            source("server/app/version.py").strip() == f'VERSION = "{EXPECTED_VERSION}"'
            and json.loads(source("package.json"))["version"] == EXPECTED_VERSION
            and EXPECTED_VERSION in html
        ),
        "three_rotating_boosters": (
            "BOOSTER_OPTIONS_PER_OFFER=3" in booster_schedule
            and "rotated[:BOOSTER_OPTIONS_PER_OFFER]" in booster_schedule
            and "const BOOSTER_OPTIONS_PER_OFFER = 3" in app
            and "rotatingBoosterOfferIds(nextBoosterOfferIndex)" in app
        ),
        "booster_drag_isolated_from_module_drag": (
            'const BOOSTER_DRAG_TYPE = "application/x-gridshard-booster"' in app
            and "function draggedBoosterId" in app
            and "cancelBoosterTargetingForModuleDrag()" in app
            and 'getData("text/plain")\n        || selectedBoosterId' not in app
        ),
        "connected_circuit_board": (
            "GRIDSHARD Beta.38 — connected circuit board" in css
            and "gap:0 !important" in css
            and "aspect-ratio:auto !important" in css
            and "width:100%;\n  height:100%;" in css
        ),
        "centered_account_screen_headings": all(
            selector in css
            for selector in (
                ".profile-summary-panel > .panel-title-row",
                ".statistics-summary-panel > .panel-title-row",
                ".settings-summary-panel > .panel-title-row",
            )
        ),
        "settings_auto_save_card_removed": (
            'id="settings-save"' not in html
            and 'id="settings-save-status"' not in html
            and 'id="settings-persistence-status"' in html
        ),
        "occupied_cell_swap_regression": (
            "occupiedTargetCard.dispatchEvent(\"dragover\"" in module_swap_e2e
            and "occupiedTargetCard.dispatchEvent(\"drop\"" in module_swap_e2e
        ),
        "root_manifest_hygiene": not (ROOT / "RELEASE_MANIFEST.json").exists(),
        "qa_includes_beta38_regression": (
            '"client_beta38_regression"' in qa
            and "tools/beta38_acceptance_report.py" in qa
        ),
    }
    payload = {
        "project": "GRIDSHARD",
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.38 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
