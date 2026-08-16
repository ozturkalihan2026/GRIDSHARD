from dataclasses import dataclass

from .ai import enqueue_ai_actions, prepare_ai_reserve_modules
from .battle_pool import validate_battle_pool
from .catalog import PLAYER_SELECTABLE_MODULE_IDS
from .engine import BattleEngine
from .models import BattleState, Direction


@dataclass(slots=True, frozen=True)
class AdaptiveMatchResult:
    winner_player_id: str | None
    is_draw: bool
    timed_out: bool
    elapsed_ms: int
    ai_action_count: int
    finish_reason: str | None


def build_symmetric_ai_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="adaptive-ai"))
    pool = validate_battle_pool(PLAYER_SELECTABLE_MODULE_IDS[:18])

    for player_id in ("a", "b"):
        player = engine.add_player(player_id)
        player.battle_pool = pool
        initial = (
            (f"{player_id}-core", "core", 2, 2, Direction.UP),
            (f"{player_id}-gen", "generator", 2, 3, Direction.UP),
            (f"{player_id}-splitter", "splitter", 2, 1, Direction.DOWN),
            (f"{player_id}-laser", "laser", 1, 1, Direction.RIGHT),
        )
        for instance_id, definition_id, x, y, direction in initial:
            engine.grant_module(player_id, instance_id, definition_id)
            engine.set_initial_active_module(
                player_id, instance_id, x, y, direction
            )
        prepare_ai_reserve_modules(engine, player_id)

    engine.start()
    return engine


def run_symmetric_ai_match(
    *,
    max_ticks: int = 1800,
    decision_interval_ms: int = 5000,
) -> AdaptiveMatchResult:
    engine = build_symmetric_ai_engine()
    action_count = 0

    for _ in range(max_ticks):
        if engine.state.status.value == "finished":
            break

        if (
            engine.state.elapsed_ms >= 15_000
            and engine.state.elapsed_ms % decision_interval_ms == 0
        ):
            for player_id, opponent_id in (("a", "b"), ("b", "a")):
                plan = enqueue_ai_actions(
                    engine, player_id, opponent_id
                )
                if plan is not None:
                    action_count += 1

        engine.step()

    return AdaptiveMatchResult(
        winner_player_id=engine.state.winner_player_id,
        is_draw=engine.state.is_draw,
        timed_out=engine.state.status.value != "finished",
        elapsed_ms=engine.state.elapsed_ms,
        ai_action_count=action_count,
        finish_reason=engine.state.finish_reason,
    )
