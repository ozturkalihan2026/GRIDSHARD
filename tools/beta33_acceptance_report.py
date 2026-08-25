from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.player_profile import PlayerProfileError, PlayerProfileService  # noqa: E402
from app.version import VERSION  # noqa: E402


EXPECTED_VERSION = "2.0.0-beta.35"
OUTPUT = ROOT / "qa_reports" / "beta33_acceptance_report.json"


def engagement_probe() -> dict:
    service = PlayerProfileService()
    service.record_battle_engagement(
        "acceptance",
        season_xp_awarded=250,
        damage_dealt=1000,
        circuit_actions=3,
        day_key="2026-08-25",
    )
    service.claim_daily_mission(
        "acceptance",
        "deal_damage",
        day_key="2026-08-25",
    )
    service.claim_season_tier("acceptance", 2)
    duplicate_rejected = False
    try:
        service.claim_season_tier("acceptance", 2)
    except PlayerProfileError:
        duplicate_rejected = True
    view = service.get("acceptance").to_view()["engagement"]
    return {
        "season_xp": view["season_xp"],
        "flux_shards": view["flux_shards"],
        "equipped_title": view["equipped_title"],
        "duplicate_rejected": duplicate_rejected,
        "ok": (
            view["season_xp"] == 380
            and view["flux_shards"] == 45
            and view["equipped_title"] == "Devre Öncüsü"
            and duplicate_rejected
        ),
    }


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(encoding="utf-8")
    styles = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    i18n = (ROOT / "client" / "src" / "i18n.js").read_text(encoding="utf-8")
    profile = (ROOT / "server" / "app" / "player_profile.py").read_text(encoding="utf-8")
    progression = (ROOT / "server" / "app" / "player_progression.py").read_text(encoding="utf-8")
    persistence = (ROOT / "server" / "app" / "player_data_store.py").read_text(encoding="utf-8")
    gateway = (ROOT / "server" / "app" / "main.py").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")
    probe = engagement_probe()

    checks = {
        "version_integrity": (
            VERSION == EXPECTED_VERSION
            and EXPECTED_VERSION in html
            and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap
        ),
        "server_authoritative_season_and_daily_missions": (
            "SEASON_REWARD_TRACK" in profile
            and "DAILY_MISSIONS" in profile
            and "record_battle_engagement" in progression
            and "claim_daily_mission_reward" in gateway
            and "claim_season_tier_reward" in gateway
            and probe["ok"]
        ),
        "season_tier_sxp_reward_is_authoritative": (
            '"season_xp_reward": 25' in profile
            and 'profile.season_xp += int(reward["season_xp_reward"])' in profile
            and "+${reward.season_xp_reward || 0} SXP" in app
        ),
        "engagement_persists_with_old_profile_defaults": (
            'data.get("engagement") or {}' in persistence
            and 'engagement.get("season_xp", 0)' in persistence
            and 'engagement.get("unlocked_titles", ["Devre Çırağı"])' in persistence
        ),
        "independent_engagement_pages": (
            'data-screen-panel="daily"' in html
            and 'data-screen-panel="rewards"' in html
            and "daily-mission-list" in html
            and "season-reward-track" in html
            and 'data-open-screen="daily"' in html
            and 'data-open-screen="rewards"' in html
            and "claimEngagementReward" in app
            and "dailyMissions" in relay
        ),
        "corelight_identity_and_starting_choice_emphasis": (
            "GRIDSHARD Beta.33 — Corelight visual identity" in styles
            and "--gs-corelight-cyan:#48F4E0" in styles
            and ".initial-circuit-picker::before" in styles
            and "BAŞLANGIÇ STRATEJİNİ SEÇ" in styles
        ),
        "turkish_english_season_localization": (
            '"Çekirdek Uyanışı":"Core Awakening"' in i18n
            and '"GÜNLÜK GÖREVLER":"DAILY MISSIONS"' in i18n
            and "Season XP" in i18n
        ),
        "beta32_fix_geometry_preserved": (
            "GRIDSHARD Beta.32 Fix.1 — invariant card geometry" in styles
            and "gs-card-impact-static" in styles
            and "position:absolute !important" in styles
        ),
        "roadmap_truth_pass": (
            "# 18. Güncel Paket — Beta.33" in roadmap
            and "ücretli geçiş eklenmedi" in roadmap
            and "Akı Parçası bu pakette yalnız kazanılır" in roadmap
        ),
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "engagement_probe": probe,
        "external_evidence_not_claimed": [
            "fiziksel Android/iPhone kanıtı",
            "gerçek oyuncu bağlılık ve sezon telemetrisi",
            "ücretli ekonomi veya mağaza dengesi",
        ],
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.33 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
