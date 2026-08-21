from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER_ROOT = ROOT / "server"
sys.path.insert(0, str(SERVER_ROOT))

from app.game.engine import BattleEngine  # noqa: E402
from app.game.models import BattleCommand, BattleState  # noqa: E402


OUTPUT = ROOT / "qa_reports" / "beta25_acceptance_report.json"
VERSION = "2.0.0-beta.25"


def forfeit_check() -> dict:
    engine = BattleEngine(BattleState(battle_id="beta25-acceptance"))
    engine.add_player("player")
    engine.add_player("opponent")
    for player_id in ("player", "opponent"):
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id,
            f"{player_id}-core",
            2,
            2,
        )
    engine.start()
    for _ in range(20):
        engine.step()
    tick_before = engine.state.tick
    engine.enqueue_command(
        BattleCommand("player", "forfeit_battle", {})
    )
    engine.step()
    player = engine.state.players["player"]
    return {
        "ok": (
            engine.state.finish_reason == "player_forfeit"
            and engine.state.winner_player_id == "opponent"
            and player.forfeit_credit_penalty == 20
            and player.circuit_credits == 200
            and engine.state.tick == tick_before
        ),
        "credit_penalty": player.forfeit_credit_penalty,
        "remaining_credits": player.circuit_credits,
        "winner_player_id": engine.state.winner_player_id,
        "clock_frozen_on_tick": engine.state.tick == tick_before,
    }


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    audio = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    audio_files = (
        "menu_shardglass_v5.wav",
        "pool_flux_v5.wav",
        "battle_fracture_v5.wav",
        "critical_shard_v5.wav",
    )
    checks = {
        "version_label": VERSION in html,
        "wordmark_geometry": 'class="lobby-wordmark"' in html,
        "forfeit_control": 'id="battle-forfeit-button"' in html,
        "preparation_return_control": 'id="return-preparation-button"' in html,
        "preparation_action_pinned": (
            ".battle-pool-actions" in css and "position:sticky" in css
        ),
        "shardglass_palette": (
            "--gs-arc-cyan:#35E5D2" in css
            and "--gs-reactor-gold:#FFCC66" in css
        ),
        "audio_runtime_v5": 'version:"shardglass-mix-v5"' in audio,
        "audio_assets_v5": all(
            (ROOT / "client" / "assets" / "audio" / name).exists()
            and name in audio
            for name in audio_files
        ),
    }
    forfeit = forfeit_check()
    checks["server_authoritative_forfeit"] = forfeit["ok"]
    browser_path = ROOT / "qa_reports" / "beta25_browser_viewports.json"
    browser = None
    if browser_path.exists():
        browser = json.loads(browser_path.read_text(encoding="utf-8"))
    browser_verified = bool(browser and browser.get("ok"))
    payload = {
        "version": VERSION,
        "ok": all(checks.values()) and browser_verified,
        "checks": checks,
        "forfeit": forfeit,
        "required_viewports": [
            {"width": 1366, "height": 768},
            {"width": 1366, "height": 630},
        ],
        "browser_viewports_verified": browser_verified,
        "browser_evidence": browser,
        "browser_note": (
            "1366×768 ve 1366×630 gerçek tarayıcı kontrolleri doğrulandı."
            if browser_verified
            else "Gerçek tarayıcı koşusu sonrasında güncellenir."
        ),
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.25 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
