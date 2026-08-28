from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
from statistics import mean, median
import sys

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
sys.path.insert(0, str(SERVER))

from app.game.ai import enqueue_ai_actions
from app.game.ai_archetypes import AI_ARCHETYPE_IDS, get_ai_archetype
from app.game.models import BattleStatus, Direction
from app.game.pvp_session import PvPSessionService
from app.game.pvp_setup import InitialModulePlacement, PvPSetupPayload

OUTPUT = ROOT / "qa_reports" / "beta37_ai_archetype_report.json"
VERSION = "2.0.0-beta.37"
DECISION_INTERVAL_MS = 5_000
FIRST_DECISION_MS = 15_000


def setup_payload(archetype_id: str, player_id: str, *, top: bool) -> PvPSetupPayload:
    archetype = get_ai_archetype(archetype_id)
    left, right = archetype.initial_module_ids
    if top:
        initial = (
            InitialModulePlacement(f"{player_id}-core", "core", 2, 2, Direction.UP),
            InitialModulePlacement(f"{player_id}-generator", "generator", 2, 1, Direction.DOWN),
            InitialModulePlacement(f"{player_id}-{left}", left, 1, 1, Direction.RIGHT),
            InitialModulePlacement(f"{player_id}-{right}", right, 3, 1, Direction.LEFT),
        )
    else:
        initial = (
            InitialModulePlacement(f"{player_id}-core", "core", 2, 2, Direction.UP),
            InitialModulePlacement(f"{player_id}-generator", "generator", 2, 3, Direction.UP),
            InitialModulePlacement(f"{player_id}-{left}", left, 1, 3, Direction.RIGHT),
            InitialModulePlacement(f"{player_id}-{right}", right, 3, 3, Direction.LEFT),
        )
    return PvPSetupPayload(archetype.battle_pool_ids, initial)


def run_match(a_id: str, b_id: str, trial: int) -> dict:
    service = PvPSessionService()
    session_id = f"ai-archetype:{a_id}:{b_id}:{trial}"
    session = service.create_session(
        session_id,
        setup_required=True,
        match_type="local_test",
        ranked_eligible=False,
    )
    for player_id in ("a", "b"):
        service.join(session_id, player_id)

    service.submit_setup(session_id, "a", setup_payload(a_id, "a", top=False))
    service.submit_setup(session_id, "b", setup_payload(b_id, "b", top=True))
    for player_id, archetype_id in (("a", a_id), ("b", b_id)):
        service.set_ready(session_id, player_id, True)
        service.mark_ai_player(session_id, player_id, archetype_id=archetype_id)
    service.start(session_id)

    next_decision = {"a": FIRST_DECISION_MS, "b": FIRST_DECISION_MS}
    actions = {"a": Counter(), "b": Counter()}
    while session.engine.state.status == BattleStatus.RUNNING:
        for player_id, opponent_id, archetype_id in (
            ("a", "b", a_id),
            ("b", "a", b_id),
        ):
            if session.engine.state.elapsed_ms < next_decision[player_id]:
                continue
            plan = enqueue_ai_actions(
                session.engine,
                player_id,
                opponent_id,
                archetype_id,
            )
            if plan is not None:
                actions[player_id][plan.kind] += 1
            next_decision[player_id] = session.engine.state.elapsed_ms + DECISION_INTERVAL_MS
        service.step(session_id)

    state = session.engine.state
    winner_archetype = None
    if state.winner_player_id == "a":
        winner_archetype = a_id
    elif state.winner_player_id == "b":
        winner_archetype = b_id

    return {
        "trial": trial,
        "a": a_id,
        "b": b_id,
        "winner_player": state.winner_player_id,
        "winner_archetype": winner_archetype,
        "draw": bool(state.is_draw),
        "finish_reason": state.finish_reason,
        "duration_ms": state.elapsed_ms,
        "actions": {side: dict(counter) for side, counter in actions.items()},
        "summary": state.result_summary,
    }


def summarize(rows: list[dict]) -> dict:
    by_archetype = {}
    for archetype_id in AI_ARCHETYPE_IDS:
        appearances = []
        wins = 0
        losses = 0
        draws = 0
        damage_dealt = []
        damage_received = []
        action_totals = Counter()
        for row in rows:
            for side, row_id, opponent_side in (("a", row["a"], "b"), ("b", row["b"], "a")):
                if row_id != archetype_id:
                    continue
                appearances.append(row["duration_ms"])
                if row["draw"]:
                    draws += 1
                elif row["winner_player"] == side:
                    wins += 1
                else:
                    losses += 1
                summary = row["summary"].get(side, {})
                opponent_summary = row["summary"].get(opponent_side, {})
                damage_dealt.append(float(summary.get("damage_dealt", 0)))
                damage_received.append(float(opponent_summary.get("damage_dealt", 0)))
                action_totals.update(row["actions"].get(side, {}))
        count = len(appearances)
        by_archetype[archetype_id] = {
            "name_tr": get_ai_archetype(archetype_id).name_tr,
            "appearances": count,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "win_rate_excluding_draws": round(wins / max(1, wins + losses), 4),
            "draw_rate": round(draws / max(1, count), 4),
            "median_duration_ms": int(median(appearances)) if appearances else 0,
            "avg_damage_dealt": round(mean(damage_dealt), 2) if damage_dealt else 0,
            "avg_damage_received": round(mean(damage_received), 2) if damage_received else 0,
            "actions": dict(action_totals),
        }

    matchups: dict[str, dict] = {}
    grouped: defaultdict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        grouped[(row["a"], row["b"])].append(row)
    for (a_id, b_id), items in sorted(grouped.items()):
        a_wins = sum(1 for item in items if item["winner_player"] == "a")
        b_wins = sum(1 for item in items if item["winner_player"] == "b")
        draws = sum(1 for item in items if item["draw"])
        matchups[f"{a_id}_vs_{b_id}"] = {
            "trials": len(items),
            "a_wins": a_wins,
            "b_wins": b_wins,
            "draws": draws,
            "median_duration_ms": int(median(item["duration_ms"] for item in items)),
        }

    return {
        "battle_count": len(rows),
        "draw_rate": round(sum(1 for row in rows if row["draw"]) / max(1, len(rows)), 4),
        "median_duration_ms": int(median(row["duration_ms"] for row in rows)) if rows else 0,
        "archetypes": by_archetype,
        "matchups": matchups,
    }


def build_report(trials_per_matchup: int) -> dict:
    rows = [
        run_match(a_id, b_id, trial)
        for a_id in AI_ARCHETYPE_IDS
        for b_id in AI_ARCHETYPE_IDS
        for trial in range(trials_per_matchup)
    ]
    return {
        "version": VERSION,
        "purpose": "AI archetype diversity smoke/baseline; not a final balance proof.",
        "trials_per_ordered_matchup": trials_per_matchup,
        "summary": summarize(rows),
        "matches": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials-per-matchup", type=int, default=3)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    trials = max(1, args.trials_per_matchup)
    report = build_report(trials)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"written: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
