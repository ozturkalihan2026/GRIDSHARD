from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta36_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.38.1"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def contains(path: str, *values: str) -> bool:
    text = source(path)
    return all(value in text for value in values)


def main() -> int:
    checks = {
        "version_identity": source("server/app/version.py").strip()
        == f'VERSION = "{EXPECTED_VERSION}"',
        "laboratory_catalog_and_economy": contains(
            "server/app/laboratory.py",
            "LABORATORY_MAX_LEVEL = 3",
            "LABORATORY_LEVEL_COSTS = (25, 75, 150)",
            "build_laboratory_view",
        ),
        "atomic_purchase_and_replay_protection": contains(
            "server/app/laboratory.py",
            "laboratory_receipts.get(clean_request_id)",
            '"replayed": True',
            "profile.flux_shards -= cost",
        ),
        "free_refund_reset": contains(
            "server/app/laboratory.py",
            "reset_calibrations",
            '"free_beta_reset"',
            "profile.flux_shards += refund",
        ),
        "persistent_profile_state": contains(
            "server/app/player_data_store.py",
            'profile_data["laboratory"]',
            'data.get("laboratory", {}).get("module_levels", {})',
            'data.get("laboratory", {}).get("receipts", {})',
        ),
        "ranked_normalization_guard": contains(
            "server/app/game/pvp_session.py",
            "normalized = bool(normalized or ranked_eligible)",
            "and not ranked_eligible",
        ) and contains(
            "server/app/game/engine.py",
            "calibration_applied = bool",
            "not self.state.ranked_eligible",
        ),
        "experimental_feature_flag": contains(
            "server/app/main.py",
            "GRIDSHARD_EXPERIMENTAL_LAB_EFFECTS",
            "laboratory_effects_enabled=EXPERIMENTAL_LAB_EFFECTS_ENABLED",
        ),
        "active_laboratory_ui": contains(
            "client/index.html",
            'data-open-screen="laboratory"',
            'id="laboratory-module-list"',
            'id="laboratory-transaction-list"',
        ) and "data-roadmap-feature=\"store\"" not in source("client/index.html"),
        "before_after_and_history": contains(
            "client/src/app.js",
            "function renderLaboratory()",
            "laboratory-current-efficiency",
            "laboratory-transaction-list",
        ),
        "localized_and_responsive": contains(
            "client/src/i18n.js",
            '"Devre Laboratuvarı":"Circuit Laboratory"',
        ) and contains(
            "client/src/styles.css",
            "Beta.36 — Devre Laboratuvarı V1",
            "@media (max-width:680px)",
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
    print(f"Beta.36 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
