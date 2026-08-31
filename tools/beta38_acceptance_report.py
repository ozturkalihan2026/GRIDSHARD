from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta38_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.38.1"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    app = source("client/src/app.js")
    css = source("client/src/styles.css")
    html = source("client/index.html")
    booster_schedule = source("server/app/game/booster_schedule.py")
    qa = source("tools/qa.py")
    module_swap_e2e = source("e2e/battle-module-swap.spec.js")
    packager = source("tools/package_release.py")
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
        "stable_non_battle_content_cell": (
            "Beta.38 Fix — one stable content cell" in css
            and "--gs-fix-shell-top:110px" in css
            and "--gs-fix-shell-bottom:88px" in css
        ),
        "dock_labels_only_on_active_item": (
            ".app-bottom-dock .menu-action.is-active .menu-action-title" in css
            and ".app-bottom-dock .menu-action > small" in css
        ),
        "matchmaking_cancel_restores_pool_music": (
            '["idle", "cancelled", "error", ""]' in app
            and 'requestOwnedAudioState("online_status_update")' in app
            and "GridshardAudioStateOwner" in app
        ),
        "placement_right_controls_module_shelf": (
            "function modulePlacementSlotState()" in app
            and 'shelf.dataset.placementReady = String(placement.ready)' in app
            and '"placement-locked"' in app
            and "Yeni modül hakkı · 15 sn" in html
        ),
        "magnitude_aware_floating_combat_text": (
            "updateFloatingFeedbackImportance" in app
            and "CAN · ONARIM" in app
            and "YANSITMA · YANSITICI" in app
            and "EMP · ENERJİ KESİLDİ" in app
            and "AŞIRI ISI!" in app
            and '.battle-floating-feedback[data-impact="large"]' in css
        ),
        "fix_package_identity": 'PACKAGE_LABEL = "fix"' in packager,
        "qa_includes_beta38_regression": (
            '"client_beta38_regression"' in qa
            and '"client_beta38_fix_regression"' in qa
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
