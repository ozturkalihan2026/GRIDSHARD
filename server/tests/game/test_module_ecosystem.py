from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
    get_module_definition,
    get_module_definitions_by_category,
)


def test_catalog_contains_exactly_18_alpha8_definitions():
    assert len(BASIC_MODULE_DEFINITIONS) == 18


def test_four_new_alpha7_modules_exist_with_turkish_names():
    assert get_module_definition("splitter").name_tr == "Dağıtıcı"
    assert get_module_definition("pulse_cannon").name_tr == "Darbe Topu"
    assert get_module_definition("armor").name_tr == "Zırh"
    assert get_module_definition("emp").name_tr == "EMP"


def test_alpha7_catalog_covers_all_planned_role_categories():
    categories = {
        definition.category
        for definition in BASIC_MODULE_DEFINITIONS.values()
    }
    assert {"enerji", "saldırı", "savunma", "destek", "sabotaj"} <= categories


def test_new_modules_have_distinct_strategic_roles():
    module_ids = ("splitter", "pulse_cannon", "armor", "emp")
    roles = {
        get_module_definition(module_id).strategic_role
        for module_id in module_ids
    }
    assert len(roles) == 4
    assert all(roles)


def test_role_metadata_contains_energy_damage_cooldown_and_ports():
    pulse = get_module_definition("pulse_cannon")
    assert pulse.energy_consumption == 5.0
    assert pulse.base_damage == 32.0
    assert pulse.cooldown_ms == 2500
    assert pulse.port_count == 1

    splitter = get_module_definition("splitter")
    assert splitter.base_damage == 0.0
    assert splitter.port_count == 3

    armor = get_module_definition("armor")
    assert armor.energy_consumption == 0.0
    assert armor.max_hp == 180

    emp = get_module_definition("emp")
    assert emp.category == "sabotaj"
    assert emp.cooldown_ms == 6000


def test_player_selectable_list_excludes_core_and_keeps_generator():
    assert "core" not in PLAYER_SELECTABLE_MODULE_IDS
    assert "generator" in PLAYER_SELECTABLE_MODULE_IDS
    assert len(PLAYER_SELECTABLE_MODULE_IDS) == 17


def test_category_query_returns_only_requested_category():
    attack_modules = get_module_definitions_by_category("saldırı")
    assert {module.id for module in attack_modules} == {
        "laser",
        "pulse_cannon",
        "railgun",
    }
    assert all(module.category == "saldırı" for module in attack_modules)


def test_all_player_facing_module_names_are_turkish_or_established_abbreviation():
    names = {definition.name_tr for definition in BASIC_MODULE_DEFINITIONS.values()}
    expected = {
        "Çekirdek",
        "Jeneratör",
        "Lazer",
        "Kalkan",
        "Batarya",
        "Güçlendirici",
        "Soğutucu",
        "Onarım Modülü",
        "Dağıtıcı",
        "Darbe Topu",
        "Zırh",
        "EMP",
        "Kapasitör",
        "Ray Topu",
        "Yansıtıcı",
        "Bariyer",
        "Hedefleme Bilgisayarı",
        "Sinyal Bozucu",
    }
    assert names == expected
