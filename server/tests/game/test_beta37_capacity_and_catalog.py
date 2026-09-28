from app.game.catalog_view import build_module_catalog_view
from app.game.pvp_session import PvPSessionService


def test_pvp_snapshot_publishes_authoritative_capacity() -> None:
    service = PvPSessionService()
    session = service.create_session("beta37-snapshot")
    service.join(session.session_id, "a")
    service.join(session.session_id, "b")

    capacity = service.snapshot(session.session_id, "a")["players"]["a"][
        "module_capacity"
    ]
    assert capacity["active_module_limit"] == 15
    assert "next_module_slot_in_ms" not in capacity


def test_catalog_has_complete_english_copy_for_all_36_modules() -> None:
    view = build_module_catalog_view()
    assert len(view["modules"]) == 36
    assert view["category_labels_en"]["saldırı"] == "Attack"
    for module in view["modules"]:
        assert module["strategic_role_en"]
        assert module["description_en"]
        assert module["effect_lines_en"]
        assert all(line for line in module["effect_lines_en"])
