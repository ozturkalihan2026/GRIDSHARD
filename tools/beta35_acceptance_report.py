from __future__ import annotations

import json
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta35_acceptance_report.json"
EXPECTED_VERSION = "2.0.0-beta.35"


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def contains(path: str, *values: str) -> bool:
    text = source(path)
    return all(value in text for value in values)


def tier_audio_ok() -> bool:
    path = ROOT / "client/assets/audio/tier_up.wav"
    if not path.exists():
        return False
    with wave.open(str(path), "rb") as reader:
        duration = reader.getnframes() / reader.getframerate()
        return (
            reader.getnchannels() == 2
            and reader.getsampwidth() == 2
            and 1.0 <= duration <= 2.5
        )


def main() -> int:
    checks = {
        "version_identity": source("server/app/version.py").strip()
        == f'VERSION = "{EXPECTED_VERSION}"',
        "canonical_match_types": contains(
            "server/app/game/models.py",
            'match_type: str = "ranked_pvp"',
            "ranked_eligible: bool = True",
            "account_player_ids",
        ),
        "ai_unranked_provisioning": contains(
            "server/app/main.py",
            'match_type="unranked_ai"',
            "ranked_eligible=False",
        ),
        "ranked_only_rating": contains(
            "server/app/player_progression.py",
            "if not state.ranked_eligible",
            "AI_REWARD_RATIO = 0.5",
        ),
        "segmented_statistics": contains(
            "server/app/player_statistics.py",
            "match_type_records",
            '"ranked_matches"',
            '"unranked_ai_matches"',
        ),
        "atomic_booster_command": contains(
            "server/app/game/engine.py",
            '"use_booster": self._cmd_use_booster',
            "consumed_booster_offer_ids",
        ) and contains(
            "client/src/app.js",
            'kind:"use_booster"',
            "offer_id:serverBoosterOfferId",
        ),
        "server_eligible_targets": contains(
            "server/app/game/pvp_session.py",
            '"eligible_target_module_ids"',
            "eligible_booster_target_ids",
        ),
        "ineffective_target_rejection": contains(
            "server/app/game/boosters.py",
            "module.hp >= module.definition.max_hp",
            "effective_port_count(module) >= 4",
        ),
        "accessible_booster_interaction": contains(
            "client/src/app.js",
            'button.addEventListener("dragstart"',
            'card.addEventListener("drop"',
            'card.addEventListener(\n      "keydown"',
        ),
        "tier_event_and_audio": contains(
            "server/app/player_progression.py",
            '"tier_advanced"',
        ) and contains(
            "client/src/app.js",
            "presentTierCelebration",
            'triggerGridshardCue("tier_up")',
        ) and tier_audio_ok(),
        "stronger_combat_feedback": contains(
            "client/src/app.js",
            "explosion-shockwave-secondary",
            "const particleCount = core ? 30 : 16",
        ),
        "uppercase_and_reduced_motion": contains(
            "client/src/styles.css",
            "text-transform:uppercase",
            "@media (prefers-reduced-motion:reduce)",
            ".tier-celebration-halo",
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
    print(f"Beta.35 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
