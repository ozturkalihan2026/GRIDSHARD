from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
    get_module_definition,
    get_module_definitions_by_category,
)


REMOVED_LEGACY_MODULE_IDS = {"generator", "splitter", "energy_leech"}


def test_catalog_is_the_36_card_canon_plus_core():
    assert len(BASIC_MODULE_DEFINITIONS) == 37
    assert "core" in BASIC_MODULE_DEFINITIONS
    assert not REMOVED_LEGACY_MODULE_IDS & set(BASIC_MODULE_DEFINITIONS)


def test_catalog_covers_all_role_categories():
    categories = {
        definition.category
        for definition in BASIC_MODULE_DEFINITIONS.values()
    }
    assert {"enerji", "saldırı", "savunma", "destek", "sabotaj"} <= categories


def test_core_modules_have_distinct_strategic_roles():
    module_ids = ("battery", "pulse_cannon", "armor", "emp")
    roles = {
        get_module_definition(module_id).strategic_role
        for module_id in module_ids
    }
    assert len(roles) == 4
    assert all(roles)


def test_role_metadata_contains_energy_damage_and_cooldown():
    pulse = get_module_definition("pulse_cannon")
    # Saldırılar enerjiyi atış anında öder; sürekli bakım enerjileri yoktur.
    assert pulse.energy_consumption == 0.0
    assert pulse.action_energy_cost == 5.0
    assert pulse.base_damage == 32.0
    assert pulse.cooldown_ms == 2500

    armor = get_module_definition("armor")
    # Pasif zırh küçük bir bakım enerjisi öder.
    assert armor.energy_consumption == 0.5
    assert armor.max_hp == 180

    emp = get_module_definition("emp")
    assert emp.category == "sabotaj"
    assert emp.cooldown_ms == 6000


def test_player_selectable_list_is_36_cards_without_core():
    assert "core" not in PLAYER_SELECTABLE_MODULE_IDS
    assert len(PLAYER_SELECTABLE_MODULE_IDS) == 36
    assert len(set(PLAYER_SELECTABLE_MODULE_IDS)) == 36


def test_category_query_returns_only_requested_category():
    attack_modules = get_module_definitions_by_category("saldırı")
    assert {module.id for module in attack_modules} == {
        "laser",
        "pulse_cannon",
        "railgun",
        "missile_launcher",
        "drone_bay",
        "arc_cannon",
        "plasma_mortar",
        "quantum_repeater",
        "ion_spear",
        "swarm_fabricator",
        "quantum_cannon",
    }
    assert all(module.category == "saldırı" for module in attack_modules)


def test_player_facing_module_names_are_unique_and_legacy_names_are_gone():
    names = [definition.name_tr for definition in BASIC_MODULE_DEFINITIONS.values()]
    assert len(names) == len(set(names))
    assert not {"Jeneratör", "Dağıtıcı", "Enerji Sömürücü"} & set(names)
