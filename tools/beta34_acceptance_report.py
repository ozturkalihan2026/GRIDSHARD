from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta34_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.34"


def contains(path: str, value: str) -> bool:
    return value in (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    checks = {
        "version_identity": (
            (ROOT / "server/app/version.py").read_text(encoding="utf-8").strip()
            == f'VERSION = "{EXPECTED_VERSION}"'
        ),
        "instant_language_autosave": contains(
            "client/src/app.js",
            'settingsLanguageEl.addEventListener(',
        ) and contains("client/src/app.js", "await saveSettingsForm();"),
        "dynamic_bilingual_energy_labels": all(
            contains("client/src/i18n.js", label)
            for label in ("KAYNAK", "AKIŞ", "ENERJİ YOK", "Eşleştiriliyor")
        ),
        "sample_accurate_menu_loop": contains(
            "client/src/gridshard-audio.js",
            "class GridshardSeamlessLoopTrack",
        ) and contains("client/src/gridshard-audio.js", "createBufferSource"),
        "matchmaking_music_until_battle": contains(
            "client/src/app.js",
            '["matchmaking", "matched", "connecting", "readying"]',
        ),
        "module_topology_preview": contains(
            "client/index.html",
            'id="battle-pool-detail-preview"',
        ) and contains("client/src/styles.css", ".pool-detail-preview-card"),
        "collapsible_clean_shelf": all(
            contains("client/src/styles.css", selector)
            for selector in (
                ".shelf-category-list",
                ".shelf-module-tooltip",
                ".module-shelf .module-card > .port-dot",
            )
        ),
        "automatic_then_manual_port_control": contains(
            "server/app/game/engine.py",
            "_connected_direction_for_placement",
        ) and contains("client/src/app.js", 'kind:"rotate_module"'),
        "battery_two_port_identity": contains(
            "server/app/game/catalog.py",
            'id="battery"',
        ) and contains("server/app/game/catalog.py", "port_count=2"),
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
    print(f"Beta.34 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
