"""Reproducible in-memory battle profiling; no network, database or live data.

Run from the repository root with the server environment's Python:
    python tools/battle_profile.py --ticks 600 --transport-ticks 20
The JSON is measurements, not native-device FPS or a production capacity claim.
"""
from __future__ import annotations

import argparse
import asyncio
import cProfile
import itertools
import json
from pathlib import Path
import pstats
import statistics
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
from app.game.pvp_runner import PvPTickRunner  # noqa: E402
from app.game.pvp_session import PvPSessionService  # noqa: E402
from app.game.pvp_websocket import PvPWebSocketAdapter  # noqa: E402
from app.game.simulation import DEFAULT_SIMULATION_LAYOUTS, _install_layout  # noqa: E402


def summary(samples: list[float]) -> dict:
    ordered = sorted(samples)
    if not ordered:
        return {"samples": 0}
    return {"samples": len(ordered), "mean_ms": round(statistics.mean(ordered), 3),
            "p95_ms": round(ordered[min(len(ordered) - 1, int(len(ordered) * .95))], 3),
            "max_ms": round(ordered[-1], 3)}


def new_match(layout_a=DEFAULT_SIMULATION_LAYOUTS[0], layout_b=DEFAULT_SIMULATION_LAYOUTS[1]):
    service = PvPSessionService(countdown_seconds=0)
    session = service.create_session("profile-only")
    for player, layout in (("a", layout_a), ("b", layout_b)):
        service.join(session.session_id, player)
        _install_layout(session.engine, player, layout)
    service.start(session.session_id)
    return service, session


def engine_profile(ticks: int) -> dict:
    steps, snapshots, payload_sizes = [], [], []
    profiler = cProfile.Profile()
    for layout_a, layout_b in itertools.product(DEFAULT_SIMULATION_LAYOUTS, repeat=2):
        service, session = new_match(layout_a, layout_b)
        for tick in range(ticks):
            if session.engine.state.status.value == "finished":
                break
            start = time.perf_counter()
            profiler.enable()
            session.engine.step()
            profiler.disable()
            steps.append((time.perf_counter() - start) * 1000)
            if tick % 10 == 0:
                for player in ("a", "b"):
                    start = time.perf_counter()
                    payload = json.dumps(service.snapshot(session.session_id, player), separators=(",", ":"))
                    snapshots.append((time.perf_counter() - start) * 1000)
                    payload_sizes.append(len(payload.encode("utf8")))
    stats = pstats.Stats(profiler)
    hotspots = sorted(stats.stats.items(), key=lambda item: item[1][3], reverse=True)
    return {"fixture": "16 ordered pairs, four canonical six-module layouts; no deployments",
            "step_including_profiler_overhead": summary(steps), "snapshot_plus_json": summary(snapshots),
            "snapshot_bytes_max": max(payload_sizes, default=0),
            "hotspots_cumulative": [{"file": Path(key[0]).name, "line": key[1], "function": key[2],
                                     "calls": value[1], "cumulative_ms": round(value[3] * 1000, 3)}
                                    for key, value in hotspots[:12]]}


class DelayedSocket:
    def __init__(self, delay: float):
        self.delay = delay
        self.sent = 0

    async def accept(self):
        pass

    async def send_json(self, data):
        await asyncio.sleep(self.delay)
        self.sent += 1

    async def close(self, code=1000):
        pass


async def transport_profile(*, background: bool, ticks: int) -> dict:
    service, session = new_match()
    adapter = PvPWebSocketAdapter(service, background_broadcasts=background)
    for player, delay in (("a", .05), ("b", 0)):
        await adapter.connect(connection_id=player, session_id=session.session_id,
                              player_id=player, socket=DelayedSocket(delay))
    runner = PvPTickRunner(service, adapter, snapshot_every_ticks=1)
    times = []
    start = time.perf_counter()
    for _ in range(ticks):
        before = time.perf_counter()
        await runner.run_single_tick(session.session_id)
        times.append((time.perf_counter() - before) * 1000)
    admission_ms = (time.perf_counter() - start) * 1000
    pending_peak = max(len(adapter.registry.get(player).pending_broadcasts) for player in ("a", "b"))
    for player in ("a", "b"):
        task = adapter.registry.get(player).broadcast_task
        if task is not None:
            await task
    slow = adapter.registry.get("a")
    result = {"mode": "background_latest" if background else "legacy_awaited",
              "synthetic_send_delay_ms": 50, "ticks": ticks,
              "admission_total_ms": round(admission_ms, 3), "tick_admission": summary(times),
              "slow_socket_sent": slow.messages_sent, "slow_snapshot_coalesced": slow.coalesced_snapshots,
              "pending_flags_at_burst_end": pending_peak}
    await adapter.disconnect("a")
    await adapter.disconnect("b")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ticks", type=int, default=600)
    parser.add_argument("--transport-ticks", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.ticks <= 1800 or not 1 <= args.transport_ticks <= 100:
        parser.error("Bounded local fixtures require ticks 1..1800 and transport-ticks 1..100")
    report = {"schema_version": 1, "scope": "synthetic in-memory; not live evidence",
              "engine": engine_profile(args.ticks),
              "transport": [asyncio.run(transport_profile(background=background, ticks=args.transport_ticks))
                            for background in (False, True)]}
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
