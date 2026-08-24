from __future__ import annotations

import json
import sys
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.game.engine import BattleEngine, MODULE_INTERACTION_UNLOCK_MS  # noqa: E402
from app.game.models import (  # noqa: E402
    BattleCommand,
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)
from app.game.pvp_session import PvPSessionService  # noqa: E402
from app.game.topology import build_energy_topology  # noqa: E402
from app.version import VERSION  # noqa: E402


EXPECTED_VERSION = "2.0.0-beta.31"
OUTPUT = ROOT / "qa_reports" / "beta31_acceptance_report.json"
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
    engine = BattleEngine(BattleState(battle_id="beta31-acceptance-swap"))
    engine.add_player("p1")
    engine.state.players["p1"].circuit_credits = 1_000
    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    first = active(engine, "laser-1", "laser", 3, 3, Direction.LEFT)
    second = active(engine, "shield-1", "shield", 4, 3, Direction.LEFT)
    engine.state.elapsed_ms = MODULE_INTERACTION_UNLOCK_MS
    engine._cmd_swap_modules(
        "p1",
        {"module_id": first.instance_id, "target_module_id": second.instance_id},
    )
    topology = build_energy_topology(
        engine.state.players["p1"],
        engine.board.core_position,
    )
    ok = (
        first.position == Position(4, 3)
        and second.position == Position(3, 3)
        and {first.instance_id, second.instance_id}.issubset(
            topology.reachable_from_generator
        )
        and engine.state.events[-1].type == "modules_swapped"
    )
    return {
        "ok": ok,
        "first_position": [first.position.x, first.position.y],
        "second_position": [second.position.x, second.position.y],
        "reachable": sorted(topology.reachable_from_generator),
    }


def fifty_session_soak() -> dict:
    now = [0.0]
    service = PvPSessionService(
        now_func=lambda: now[0],
        finished_ttl_seconds=5.0,
    )
    finished = 0
    for index in range(50):
        session_id = f"beta31-soak-{index:02d}"
        player_a = f"a-{index}"
        player_b = f"b-{index}"
        service.create_session(session_id)
        service.join(session_id, player_a)
        service.join(session_id, player_b)
        service.start(session_id)
        service.submit_sequenced_command(
            session_id,
            player_a,
            1,
            BattleCommand(player_a, "forfeit_battle", {}),
        )
        service.step(session_id)
        if service.get_session(session_id).engine.state.status.value == "finished":
            finished += 1
        now[0] += 0.01
    active_before = len(service.active_session_ids())
    now[0] += 6.0
    expired = len(service.cleanup_expired_sessions())
    active_after = len(service.active_session_ids())
    return {
        "requested_matches": 50,
        "finished_matches": finished,
        "expired_sessions": expired,
        "active_after_cleanup": active_after,
        "ok": finished == 50 and active_before == 50 and expired == 50 and active_after == 0,
    }


def audio_probe() -> dict:
    audio = ROOT / "client" / "assets" / "audio"
    valid = []
    for name in STEM_NAMES:
        path = audio / name
        if not path.exists():
            continue
        with wave.open(str(path), "rb") as reader:
            if (
                reader.getnchannels() == 2
                and reader.getframerate() == 22_050
                and reader.getnframes() / reader.getframerate() == 32.0
            ):
                valid.append(name)
    return {"expected": 7, "valid": len(valid), "files": valid, "ok": len(valid) == 7}


def main() -> int:
    html = (ROOT / "client" / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(encoding="utf-8")
    audio_source = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(encoding="utf-8")
    engine = (ROOT / "server" / "app" / "game" / "engine.py").read_text(encoding="utf-8")
    e2e = (ROOT / "e2e" / "battle-module-swap.spec.js").read_text(encoding="utf-8")
    roadmap = (ROOT / "docs" / "YOL_HARITASI.md").read_text(encoding="utf-8")
    swap = module_swap_probe()
    audio = audio_probe()
    soak = fifty_session_soak()

    checks = {
        "version_integrity": (
            VERSION == EXPECTED_VERSION
            and EXPECTED_VERSION in html
            and f"Güncel Sürüm:** `{EXPECTED_VERSION}`" in roadmap
        ),
        "server_authoritative_atomic_swap": (
            swap["ok"] and '"swap_modules": self._cmd_swap_modules' in engine
            and "_best_swap_directions" in engine
        ),
        "client_swap_vs_reserve_replace": (
            'kind: "swap_modules"' in relay
            and 'kind: "replace_module"' in relay
            and 'dispatchEvent("dragstart"' in e2e
            and 'dispatchEvent("drop"' in e2e
        ),
        "smart_port_and_click_rotation": (
            "len(reachable)" in engine
            and 'kind:"rotate_module"' in app
            and "port-dot" in e2e
        ),
        "seven_layer_adaptive_battle_music": (
            audio["ok"]
            and "GRIDSHARD_BATTLE_LAYERS" in audio_source
            and "_applyBattleLayerMix" in audio_source
            and 'version:"shardglass-seven-layer-v7"' in audio_source
        ),
        "beta30_resilience_preserved": soak["ok"],
        "roadmap_truth_pass": (
            "# 15. Güncel Paket — Beta.31" in roadmap
            and "16 yön kombinasyonu" in roadmap
            and "yedi ayrı özgün stem" in roadmap
        ),
    }
    payload = {
        "version": EXPECTED_VERSION,
        "ok": all(checks.values()),
        "checks": checks,
        "module_swap_probe": swap,
        "audio_probe": audio,
        "pvp_session_soak": soak,
        "browser_matrix_expected": {
            "desktop-chromium": 5,
            "android-chrome-emulated": 2,
            "iphone-safari-emulated": 2,
        },
        "external_evidence_not_claimed": [
            "fiziksel Android/iPhone uzun savaş testi",
            "kulaklık/hoparlör insan miks değerlendirmesi",
            "final LUFS/True Peak mastering kararı",
        ],
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Beta.31 acceptance report: {OUTPUT}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
