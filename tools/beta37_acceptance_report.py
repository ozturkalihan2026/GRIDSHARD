from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta37_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.37"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def contains(path: str, *values: str) -> bool:
    text = source(path)
    return all(value in text for value in values)


def main() -> int:
    balance = json.loads(source("qa_reports/beta37_balance_report.json"))
    checks = {
        "version_identity": source("server/app/version.py").strip()
        == f'VERSION = "{EXPECTED_VERSION}"',
        "four_panel_preparation": contains(
            "client/index.html",
            'class="initial-circuit-picker"',
            'id="battle-pool-preset-open"',
            'class="selected-pool-heading"',
        ) and 'id="battle-pool-title"' not in source("client/index.html"),
        "single_matchmaking_action": (
            'id="battle-pool-confirm"' in source("client/index.html")
            and 'id="matchmaking-cancel"' not in source("client/index.html")
            and contains(
                "client/src/app.js",
                "function isOnlineMatchmakingCancelable",
                'localizedUiText("İptal Et")',
            )
        ),
        "complete_bilingual_module_catalog": contains(
            "server/app/game/catalog_view.py",
            "MODULE_COPY_EN",
            '"description_en"',
            '"effect_lines_en"',
        ) and contains("client/src/app.js", "catalog?.effect_lines_en"),
        "profile_booster_and_result_localization": contains(
            "client/src/i18n.js",
            '"TAKIM":"TEAM"',
            '"Aşırı Yük Çipi":"Overcharge Chip"',
            '"Derece puanı değişmedi":"Rating unchanged"',
        ),
        "authoritative_module_capacity": contains(
            "server/app/game/engine.py",
            "def module_capacity_view",
            '"available_module_slots"',
            '"next_module_slot_in_ms"',
        ) and contains(
            "server/app/game/pvp_session.py",
            '"module_capacity": session.engine.module_capacity_view',
        ),
        "visible_capacity_hud": (
            'id="capacity-indicator" role="status"' in source("client/index.html")
            and "battle-capacity-hidden" not in source("client/index.html")
            and contains("client/src/app.js", "Devrede ${active} · Boş Hak ${available}")
        ),
        "requested_icons": contains(
            "client/index.html",
            "lobby-dock-trophy",
            "dock-core-crack",
            "lobby-feature-icon-daily",
            "lobby-feature-icon-reward",
        ),
        "balance_screening": (
            balance["version"] == EXPECTED_VERSION
            and balance["method"]["screening_trials_per_variant"] == 10_000
            and balance["method"]["finalist_trials_per_variant"] == 50_000
            and len(balance["top_two"]) == 2
            and balance["decision"]["canonical_change_applied"] is False
        ),
    }
    payload = {
        "project": "GRIDSHARD",
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Beta.37 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
