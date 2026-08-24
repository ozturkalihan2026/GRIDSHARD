from app.game.ai import (
    build_ai_decision,
    build_threat_profile,
    choose_booster,
    choose_counter_module,
)
from app.game.battle_pool import validate_battle_pool
from app.game.catalog import PLAYER_SELECTABLE_MODULE_IDS
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
)


def make_engine():
    engine = BattleEngine(
        BattleState(battle_id="ai")
    )
    ai = engine.add_player("ai")
    opponent = engine.add_player("opponent")

    ai.battle_pool = validate_battle_pool(
        PLAYER_SELECTABLE_MODULE_IDS[:18]
    )
    ai.circuit_credits = 500

    return engine, ai, opponent


def activate(
    engine,
    player_id,
    iid,
    definition_id,
    x,
    y,
):
    module = engine.grant_module(
        player_id,
        iid,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_threat_profile_counts_categories():
    engine, ai, opponent = make_engine()

    activate(
        engine,
        "opponent",
        "shield",
        "shield",
        1,
        1,
    )
    activate(
        engine,
        "opponent",
        "laser",
        "laser",
        3,
        1,
    )

    profile = build_threat_profile(opponent)

    assert profile.attack_count == 1
    assert profile.defense_count == 1
    assert set(
        profile.active_definition_ids
    ) == {"shield", "laser"}


def test_ai_prefers_real_counter_metadata():
    engine, ai, opponent = make_engine()

    activate(
        engine,
        "opponent",
        "armor",
        "armor",
        1,
        1,
    )

    candidate = choose_counter_module(
        ai,
        opponent,
    )

    assert candidate is not None
    assert candidate.score > 0
    assert "armor" in candidate.strong_hits


def test_ai_never_selects_active_duplicate_definition():
    engine, ai, opponent = make_engine()

    activate(
        engine,
        "ai",
        "laser-active",
        "laser",
        1,
        1,
    )
    activate(
        engine,
        "opponent",
        "armor",
        "armor",
        3,
        1,
    )

    candidate = choose_counter_module(
        ai,
        opponent,
    )

    assert candidate is not None
    assert candidate.module_definition_id != "laser"


def test_ai_builds_two_attack_foundation_before_over_defending():
    engine, ai, opponent = make_engine()
    activate(engine, "ai", "ai-laser", "laser", 1, 1)
    activate(engine, "opponent", "enemy-laser", "laser", 1, 1)
    activate(engine, "opponent", "enemy-pulse", "pulse_cannon", 3, 1)

    candidate = choose_counter_module(ai, opponent)

    assert candidate is not None
    assert candidate.module_definition_id == "pulse_cannon"


def test_ai_uses_defensive_counter_after_attack_foundation_is_ready():
    engine, ai, opponent = make_engine()
    activate(engine, "ai", "ai-laser", "laser", 1, 1)
    activate(engine, "ai", "ai-pulse", "pulse_cannon", 3, 1)
    activate(engine, "opponent", "enemy-laser", "laser", 1, 1)
    activate(engine, "opponent", "enemy-pulse", "pulse_cannon", 3, 1)

    candidate = choose_counter_module(ai, opponent)

    assert candidate is not None
    assert candidate.module_definition_id == "reflector"


def test_ai_respects_circuit_credit_budget():
    engine, ai, opponent = make_engine()
    ai.circuit_credits = 0

    activate(
        engine,
        "opponent",
        "armor",
        "armor",
        1,
        1,
    )

    assert choose_counter_module(
        ai,
        opponent,
    ) is None


def test_ai_prefers_emergency_repair_booster_for_damaged_module():
    engine, ai, opponent = make_engine()

    target = activate(
        engine,
        "ai",
        "shield",
        "shield",
        1,
        1,
    )
    target.hp = 30

    from app.game.models import BoosterOffer

    ai.pending_booster_offer = BoosterOffer(
        id="offer",
        booster_ids=(
            "overcharge_chip",
            "emergency_repair",
            "dual_port_adapter",
        ),
        created_at_ms=85_000,
    )

    booster_id, target_id = choose_booster(ai)

    assert booster_id == "emergency_repair"
    assert target_id == "shield"


def test_ai_decision_is_deterministic():
    engine, ai, opponent = make_engine()

    activate(
        engine,
        "opponent",
        "armor",
        "armor",
        1,
        1,
    )
    activate(
        engine,
        "opponent",
        "shield",
        "shield",
        3,
        1,
    )

    first = build_ai_decision(
        ai,
        opponent,
    )
    second = build_ai_decision(
        ai,
        opponent,
    )

    assert first == second
