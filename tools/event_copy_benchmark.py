"""Local event-copy component comparison, not a full server/load benchmark."""
from __future__ import annotations

import ast
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
from statistics import median
import subprocess
import sys
from time import perf_counter
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
BASE = "7f82db77fcc7a974ba60508d7a3c9536335f95f1"
sys.path.insert(0, str(ROOT / "server"))
from app.game.pvp_session import OWNER_ONLY_EVENT_TYPES, PvPSessionService


def previous_method():
    source = subprocess.check_output(
        ["git", "show", f"{BASE}:server/app/game/pvp_session.py"],
        cwd=ROOT, text=True, encoding="utf-8",
    )
    tree = ast.parse(source)
    owner = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "PvPSessionService")
    method = next(node for node in owner.body if isinstance(node, ast.FunctionDef) and node.name == "_event_for_viewer")
    namespace = {"deepcopy":deepcopy, "OWNER_ONLY_EVENT_TYPES":OWNER_ONLY_EVENT_TYPES}
    exec(compile(ast.Module(body=[method], type_ignores=[]), "baseline-event-method", "exec"), namespace)
    return namespace["_event_for_viewer"]


def main():
    service = PvPSessionService()
    methods = {"baseline":previous_method(), "current":PvPSessionService._event_for_viewer}
    cases = {
        "scalar":SimpleNamespace(type="module_damaged", at_ms=100,
            data={"player_id":"a", "target_module_id":"laser-1", "damage":10.2, "hp":80, "critical":False}),
        "nested":SimpleNamespace(type="module_deployed", at_ms=100,
            data={"player_id":"a", "module":{"id":"laser-1", "ports":[1,2,3], "stats":{"hp":100}}}),
        "private_filtered":SimpleNamespace(type=sorted(OWNER_ONLY_EVENT_TYPES)[0], at_ms=100,
            data={"player_id":"a", "private":{"cards":[str(i) for i in range(20)]}}),
    }
    iterations = 30000
    output = []
    for name, event in cases.items():
        original = deepcopy(event.data)
        assert methods["baseline"](service, event, "b") == methods["current"](service, event, "b")
        samples = {mode:[] for mode in methods}
        for repeat in range(5):
            for mode in (["current", "baseline"] if repeat % 2 else ["baseline", "current"]):
                method = methods[mode]
                for _ in range(1000):
                    method(service, event, "b")
                start = perf_counter()
                for _ in range(iterations):
                    method(service, event, "b")
                samples[mode].append(round((perf_counter() - start) * 1000, 2))
        assert event.data == original
        output.append({"case":name, "iterations":iterations, "samples_ms":samples,
            "median_ms":{mode:median(values) for mode, values in samples.items()}})
    print(json.dumps({"baseline":BASE, "measured_at":datetime.now(timezone.utc).isoformat(), "python":sys.version.split()[0],
        "platform":sys.platform, "kind":"event-copy component; not requests/s or full-match memory", "results":output}, indent=2))


if __name__ == "__main__":
    main()
