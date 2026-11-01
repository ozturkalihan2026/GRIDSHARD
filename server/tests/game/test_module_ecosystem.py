from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
    get_module_definition,
    get_module_definitions_by_category,
)


REMOVED_LEGACY_MODULE_IDS = {"generator", "splitter", "energy_leech"}


def test_catalog_is_the_24_card_canon_plus_core():
    assert len(BASIC_MODULE_DEFINITIONS) == 25
    assert "core" in BASIC_MODULE_DEFINITIONS
    assert not REMOVED_LEGACY_MODULE_IDS & set(BASIC_MODULE_DEFINITIONS)


def test_catalog_covers_all_role_categories():
    categories = {
        definition.category
        for definition in BASIC_MODULE_DEFINITIONS.values()
    }
    assert {"saldırı", "savunma", "taktik", "çekirdek"} == {d.combat_class for d in BASIC_MODULE_DEFINITIONS.values()}


def test_core_modules_have_distinct_strategic_roles():
    module_ids = ("repair", "pulse_cannon", "armor", "emp")
    roles = {
        get_module_definition(module_id).strategic_role
        for module_id in module_ids
    }
    assert len(roles) == 4
    assert all(roles)


def test_role_metadata_contains_damage_cadence_and_current_cost():
    for d in BASIC_MODULE_DEFINITIONS.values():
        if d.id=='core':continue
        assert d.max_hp>0 and d.current_cost>0 and d.cooldown_ms>=0
        assert not hasattr(d,'action_energy_cost')


def test_player_selectable_list_is_24_cards_without_core():
    assert "core" not in PLAYER_SELECTABLE_MODULE_IDS
    assert len(PLAYER_SELECTABLE_MODULE_IDS) == 24
    assert len(set(PLAYER_SELECTABLE_MODULE_IDS)) == 24


def test_category_query_returns_only_requested_category():
    attack_modules = get_module_definitions_by_category("saldırı")
    assert {m.id for m in attack_modules} == {'laser','pulse_cannon','railgun','missile_launcher','drone_bay','arc_cannon','plasma_mortar','quantum_repeater','burst_cannon','shield_breaker'}
    assert all(module.category == "saldırı" for module in attack_modules)


def test_player_facing_module_names_are_unique_and_legacy_names_are_gone():
    names = [definition.name_tr for definition in BASIC_MODULE_DEFINITIONS.values()]
    assert len(names) == len(set(names))
    assert not {"Jeneratör", "Dağıtıcı", "Enerji Sömürücü"} & set(names)
