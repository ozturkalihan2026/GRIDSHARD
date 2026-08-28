from app.game.ai import (
    build_ai_action_plan,
    enqueue_ai_actions,
    prepare_ai_reserve_modules,
)
from app.game.battle_pool import validate_battle_pool
from app.game.catalog import PLAYER_SELECTABLE_MODULE_IDS
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
    BoosterOffer,
    Direction,
    ModuleStatus,
)


def setup_engine():
    engine = BattleEngine(
        BattleState(battle_id="ai-actions")
    )

    ai = engine.add_player("ai")
    opponent = engine.add_player("opponent")

    ai.battle_pool = validate_battle_pool(
        PLAYER_SELECTABLE_MODULE_IDS[:18]
    )
    ai.circuit_credits = 1000

    # AI çekirdeği + jeneratörü.
    engine.grant_module(
        "ai",
        "ai-core",
        "core",
    )
    engine.grant_module(
        "ai",
        "ai-generator",
        "generator",
    )

    engine.set_initial_active_module(
        "ai",
        "ai-core",
        2,
        2,
    )
    engine.set_initial_active_module(
        "ai",
        "ai-generator",
        2,
        3,
    )

    # Rakip çekirdeği + jeneratörü + zırh tehdidi.
    engine.grant_module(
        "opponent",
        "op-core",
        "core",
    )
    engine.grant_module(
        "opponent",
        "op-generator",
        "generator",
    )
    engine.grant_module(
        "opponent",
        "op-armor",
        "armor",
    )

    engine.set_initial_active_module(
        "opponent",
        "op-core",
        2,
        2,
    )
    engine.set_initial_active_module(
        "opponent",
        "op-generator",
        2,
        3,
    )
    engine.set_initial_active_module(
        "opponent",
        "op-armor",
        2,
        1,
        Direction.DOWN,
    )

    prepare_ai_reserve_modules(
        engine,
        "ai",
    )

    engine.start()

    return engine


def test_ai_does_not_intervene_before_15_seconds():
    engine = setup_engine()
    engine.state.elapsed_ms = 14_900

    assert build_ai_action_plan(
        engine,
        "ai",
        "opponent",
    ) is None


def test_ai_builds_real_place_commands_after_unlock():
    engine = setup_engine()
    engine.state.elapsed_ms = 15_000

    plan = build_ai_action_plan(
        engine,
        "ai",
        "opponent",
    )

    assert plan is not None
    assert plan.kind == "place"
    assert plan.commands[0].kind == "place_module"


def test_ai_commands_are_processed_by_real_engine_queue():
    engine = setup_engine()
    engine.state.elapsed_ms = 15_000
    engine.state.tick = 150

    plan = enqueue_ai_actions(
        engine,
        "ai",
        "opponent",
    )

    assert plan is not None

    engine.step()

    active_definitions = {
        module.definition.id
        for module in engine.state.players["ai"].modules.values()
        if module.status == ModuleStatus.ACTIVE
    }

    assert len(active_definitions) >= 3


def test_ai_respects_credit_budget_before_enqueue():
    engine = setup_engine()
    engine.state.elapsed_ms = 15_000
    engine.state.players["ai"].circuit_credits = 0

    assert enqueue_ai_actions(
        engine,
        "ai",
        "opponent",
    ) is None


def test_ai_uses_replace_when_capacity_is_full():
    engine = setup_engine()
    ai_player = engine.state.players["ai"]

    splitter = next(
        module
        for module in ai_player.modules.values()
        if module.definition.id == "splitter"
    )
    shield = next(
        module
        for module in ai_player.modules.values()
        if module.definition.id == "shield"
    )
    battery = next(
        module
        for module in ai_player.modules.values()
        if module.definition.id == "battery"
    )

    splitter.status = ModuleStatus.ACTIVE
    splitter.position = type(engine.board.core_position)(x=2, y=1)
    splitter.direction = Direction.DOWN

    shield.status = ModuleStatus.ACTIVE
    shield.position = type(engine.board.core_position)(x=1, y=1)
    shield.direction = Direction.RIGHT

    battery.status = ModuleStatus.ACTIVE
    battery.position = type(engine.board.core_position)(x=3, y=1)
    battery.direction = Direction.LEFT

    engine.state.elapsed_ms = 15_000

    plan = build_ai_action_plan(
        engine,
        "ai",
        "opponent",
    )

    assert plan is not None
    assert plan.kind == "replace"
    assert plan.commands[0].kind == "replace_module"


def test_prepare_ai_reserves_only_before_match():
    engine = setup_engine()

    try:
        prepare_ai_reserve_modules(
            engine,
            "ai",
        )
    except ValueError:
        pass
    else:
        raise AssertionError(
            "Maç başladıktan sonra rezerv hazırlama engellenmeliydi."
        )


def test_ai_uses_atomic_booster_command_and_consumes_offer():
    engine = setup_engine()
    ai_player = engine.state.players["ai"]

    shield = engine.grant_module(
        "ai",
        "ai-shield",
        "shield",
    )
    shield.status = ModuleStatus.ACTIVE
    shield.position = type(engine.board.core_position)(x=1, y=3)
    shield.direction = Direction.RIGHT
    shield.hp = 30

    ai_player.pending_booster_offer = BoosterOffer(
        id="ai-offer",
        booster_ids=(
            "overcharge_chip",
            "emergency_repair",
            "dual_port_adapter",
        ),
        created_at_ms=30_000,
    )
    engine.state.elapsed_ms = 30_000

    plan = build_ai_action_plan(
        engine,
        "ai",
        "opponent",
    )

    assert plan is not None
    assert plan.kind == "booster"
    assert len(plan.commands) == 1
    assert plan.commands[0].kind == "use_booster"
    assert plan.commands[0].payload == {
        "offer_id": "ai-offer",
        "booster_id": "emergency_repair",
        "target_module_id": "ai-shield",
    }

    enqueue_ai_actions(
        engine,
        "ai",
        "opponent",
    )
    engine.step()

    assert ai_player.pending_booster_offer is None
    assert "ai-offer" in ai_player.consumed_booster_offer_ids
    assert shield.hp > 30
