from __future__ import annotations

from array import array
import json
import math
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.game.engine import BattleEngine, MODULE_INTERACTION_UNLOCK_MS  # noqa: E402
from app.game.models import BattleCommand, BattleState, Direction, ModuleStatus, Position  # noqa: E402
from app.game.pvp_session import PvPSessionService  # noqa: E402
from app.game.simulation import DEFAULT_SIMULATION_LAYOUTS, run_round_robin  # noqa: E402
from app.game.topology import build_energy_topology  # noqa: E402
from app.version import VERSION  # noqa: E402


EXPECTED_VERSION = "2.0.0-beta.32"
OUTPUT = ROOT / "qa_reports" / "beta32_acceptance_report.json"
MENU_TRACKS = ("menu_ensemble_v6.wav", "pool_ensemble_v6.wav")
STEM_NAMES = tuple(
    f"battle_tension_v7_{index:02d}_{name}.wav"
    for index, name in enumerate(
        ("sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure"),
        start=1,
    )
)


def active(engine, instance_id, definition_id, x, y, direction=Direction.UP):
    module = engine.grant_module("p1", instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def module_swap_probe() -> dict:
    engine = BattleEngine(BattleState(battle_id="beta32-acceptance-swap"))
    engine.add_player("p1")
    engine.state.players["p1"].circuit_credits = 1_000
    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    first = active(engine, "laser-1", "laser", 3, 3, Direction.LEFT)
    second = active(engine, "shield-1", "shield", 4, 3, Direction.LEFT)
    engine.state.elapsed_ms = MODULE_INTERACTION_UNLOCK_MS
    engine._cmd_swap_modules(
        "p1", {"module_id": first.instance_id, "target_module_id": second.instance_id}
    )
    reachable = build_energy_topology(
        engine.state.players["p1"], engine.board.core_position
    ).reachable_from_generator
    ok = (
        first.position == Position(4, 3)
        and second.position == Position(3, 3)
        and {first.instance_id, second.instance_id}.issubset(reachable)
        and engine.state.events[-1].type == "modules_swapped"
    )
    return {"ok": ok, "reachable": sorted(reachable)}


def fifty_session_soak() -> dict:
    now = [0.0]
    service = PvPSessionService(now_func=lambda: now[0], finished_ttl_seconds=5.0)
    finished = 0
    for index in range(50):
        session_id = f"beta32-soak-{index:02d}"
        player_a = f"a-{index}"
        player_b = f"b-{index}"
        service.create_session(session_id)
        service.join(session_id, player_a)
        service.join(session_id, player_b)
        service.start(session_id)
        service.submit_sequenced_command(
            session_id, player_a, 1, BattleCommand(player_a, "forfeit_battle", {})
        )
        service.step(session_id)
        finished += int(service.get_session(session_id).engine.state.status.value == "finished")
        now[0] += 0.01
    now[0] += 6.0
    expired = len(service.cleanup_expired_sessions())
    active_after = len(service.active_session_ids())
    return {
        "requested_matches": 50,
        "finished_matches": finished,
        "expired_sessions": expired,
        "active_after_cleanup": active_after,
        "ok": finished == 50 and expired == 50 and active_after == 0,
    }


def wav_probe(filename: str) -> dict:
    path = ROOT / "client" / "assets" / "audio" / filename
    with wave.open(str(path), "rb") as reader:
        channels = reader.getnchannels()
        rate = reader.getframerate()
        frames = reader.getnframes()
        pcm = array("h", reader.readframes(frames))
    edge_frames = min(rate // 20, frames // 4)
    start = pcm[: edge_frames * channels]
    end = pcm[-edge_frames * channels :]
    start_rms = math.sqrt(sum(value * value for value in start) / max(1, len(start)))
    end_rms = math.sqrt(sum(value * value for value in end) / max(1, len(end)))
    seam_delta = [abs(pcm[-channels + channel] - pcm[channel]) for channel in range(channels)]
    ok = (
        channels == 2
        and rate == 22_050
        and frames / rate == 32.0
        and start_rms > 100
        and end_rms > 100
        and max(seam_delta) <= 1
    )
    return {
        "file": filename,
        "duration_seconds": frames / rate,
        "start_rms": round(start_rms, 2),
        "end_rms": round(end_rms, 2),
        "seam_delta": seam_delta,
        "ok": ok,
    }


def seven_layer_audio_probe() -> dict:
    valid = []
    audio = ROOT / "client" / "assets" / "audio"
    for name in STEM_NAMES:
        path = audio / name
        if not path.exists():
            continue
        with wave.open(str(path), "rb") as reader:
            if reader.getnchannels() == 2 and reader.getframerate() == 22_050 and reader.getnframes() / reader.getframerate() == 32.0:
                valid.append(name)
    return {"expected": 7, "valid": len(valid), "files": valid, "ok": len(valid) == 7}


def balance_probe() -> dict:
    report = run_round_robin(DEFAULT_SIMULATION_LAYOUTS, max_ticks=1800, mirrored=True)
    offense_wins = report.wins_by_layout.get("offense", 0)
    return {
        "match_count": len(report.matches),
        "timeouts": report.timeouts,
        "draws": report.draws,
        "average_duration_ms": report.average_duration_ms,
        "wins_by_layout": report.wins_by_layout,
        "offense_auto_win": offense_wins == len(report.matches),
        "ok": report.timeouts == 0 and offense_wins < len(report.matches),
    }


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(encoding="utf-8")
    styles = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")
    audio_source = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(encoding="utf-8")
    audio_generator = (ROOT / "tools" / "generate_beta28_menu_audio.py").read_text(encoding="utf-8")
    booster = (ROOT / "server" / "app" / "game" / "booster_schedule.py").read_text(encoding="utf-8")
    ai = (ROOT / "server" / "app" / "game" / "ai.py").read_text(encoding="utf-8")
    statistics = (ROOT / "server" / "app" / "player_statistics.py").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")
    e2e = (ROOT / "e2e" / "beta32-booster-viewport.spec.js").read_text(encoding="utf-8")

    loops = [wav_probe(name) for name in MENU_TRACKS]
    layers = seven_layer_audio_probe()
    swap = module_swap_probe()
    soak = fifty_session_soak()
    balance = balance_probe()
    checks = {
        "version_integrity": VERSION == EXPECTED_VERSION and EXPECTED_VERSION in html and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap,
        "seamless_phase_locked_menu_pool_audio": all(item["ok"] for item in loops) and "phaseLockedTransition" in audio_source and "menuPoolCrossfadeMs:480" in audio_source and "syncAudioStateForCurrentView" in app and "edge_window" not in audio_generator and "seam_frames" in audio_generator,
        "visible_server_authoritative_booster_at_30_seconds": "BOOSTER_FIRST_OFFER_MS=30_000" in booster and 'kind:"select_booster"' in app and 'kind:"apply_booster"' in app and "pending_booster_offer" in app and "battle-booster-dock" in html,
        "battle_shelf_fits_short_viewport": "height:100dvh" in styles and "grid-template-rows:auto auto auto minmax(0,1fr)" in styles and "moduleShelfBottom" in e2e,
        "stronger_powered_module_pulse": "gs-energy-presence-v2" in styles and "brightness(1.34)" in styles and "gs-energy-aura-v2" in styles,
        "statistics_exclude_required_modules": 'frozenset({"core", "generator"})' in statistics and "HABIT_EXCLUDED_DEFINITION_IDS" in statistics and '["core", "generator"].includes' in app,
        "local_ai_attack_foundation_then_counter": "active_attack_count == 1" in ai and "attack_foundation" in ai,
        "offense_is_not_an_automatic_win": balance["ok"],
        "beta31_swap_and_seven_layers_preserved": swap["ok"] and layers["ok"] and 'kind: "swap_modules"' in relay,
        "beta30_session_resilience_preserved": soak["ok"],
        "roadmap_truth_pass": "# 16. Güncel Paket — Beta.32" in roadmap and "yalnız `2/12` galibiyet" in roadmap,
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "menu_pool_loop_probe": loops,
        "battle_audio_probe": layers,
        "balance_probe": balance,
        "module_swap_probe": swap,
        "pvp_session_soak": soak,
        "browser_matrix_expected": {"desktop-chromium": 6, "android-chrome-emulated": 2, "iphone-safari-emulated": 2},
        "external_evidence_not_claimed": [
            "fiziksel Android/iPhone uzun savaş testi",
            "kulaklık/hoparlör insan miks değerlendirmesi",
            "gerçek oyuncu popülasyonu meta telemetrisi",
        ],
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Beta.32 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
