from app.game.catalog_view import build_module_catalog_view
from app.game.engine import BattleEngine
from app.game.models import BattleState
from app.game.pvp_session import PvPSessionService


def test_capacity_view_exposes_slots_and_next_unlock() -> None:
    engine = BattleEngine(BattleState(battle_id="beta37-capacity"))
    engine.add_player("player")
    positions = ((2, 2), (2, 3), (1, 3), (3, 3))
    for index, definition_id in enumerate(("core", "generator", "laser", "shield")):
        module = engine.grant_module("player", f"module-{index}", definition_id)
        engine.set_initial_active_module(
            "player", module.instance_id, *positions[index]
        )

    assert engine.module_capacity_view("player") == {
        "active_module_count": 4,
        "active_module_limit": 4,
        "available_module_slots": 0,
        "next_module_slot_at_ms": 15_000,
        "next_module_slot_in_ms": 15_000,
    }

    engine.state.elapsed_ms = 30_000
    assert engine.module_capacity_view("player") == {
        "active_module_count": 4,
        "active_module_limit": 6,
        "available_module_slots": 2,
        "next_module_slot_at_ms": 45_000,
        "next_module_slot_in_ms": 15_000,
    }


def test_pvp_snapshot_publishes_authoritative_capacity() -> None:
    service = PvPSessionService()
    session = service.create_session("beta37-snapshot")
    service.join(session.session_id, "a")
    service.join(session.session_id, "b")

    capacity = service.snapshot(session.session_id, "a")["players"]["a"][
        "module_capacity"
    ]
    assert capacity["active_module_limit"] == 4
    assert capacity["next_module_slot_in_ms"] == 15_000


def test_catalog_has_complete_english_copy_for_all_24_modules() -> None:
    view = build_module_catalog_view()
    assert len(view["modules"]) == 24
    assert view["category_labels_en"]["saldırı"] == "Attack"
    for module in view["modules"]:
        assert module["strategic_role_en"]
        assert module["description_en"]
        assert module["effect_lines_en"]
        assert all(line for line in module["effect_lines_en"])
