from app.game.catalog import BASIC_MODULE_DEFINITIONS, PLAYER_SELECTABLE_MODULE_IDS, get_module_definition, get_module_definitions_by_category

def test_24_selectable_plus_core():
    assert len(PLAYER_SELECTABLE_MODULE_IDS) == 24
    assert len(BASIC_MODULE_DEFINITIONS) == 25
    assert "core" not in PLAYER_SELECTABLE_MODULE_IDS

def test_final_seven_modules():
    expected={"missile_launcher":"Füze Fırlatıcı","drone_bay":"Dron Üssü","arc_cannon":"Ark Topu",
              "overclock_unit":"Aşırı Hızlandırıcı","virus":"Virüs","energy_leech":"Enerji Sömürücü","disruptor":"Kesici"}
    for mid,name in expected.items():
        assert get_module_definition(mid).name_tr == name

def test_planned_category_counts():
    assert len(get_module_definitions_by_category("enerji")) == 4
    assert len(get_module_definitions_by_category("saldırı")) == 6
    assert len(get_module_definitions_by_category("savunma")) == 4
    assert len(get_module_definitions_by_category("destek")) == 5
    assert len(get_module_definitions_by_category("sabotaj")) == 5

def test_unique_selectable_names_and_roles():
    defs=[get_module_definition(mid) for mid in PLAYER_SELECTABLE_MODULE_IDS]
    assert len({d.name_tr for d in defs}) == 24
    assert all(d.strategic_role.strip() for d in defs)

def test_new_attack_roles_are_distinct():
    roles={get_module_definition(mid).strategic_role for mid in ("missile_launcher","drone_bay","arc_cannon")}
    assert len(roles)==3

def test_new_sabotage_targets_different_layers():
    assert "repair" in get_module_definition("virus").strong_against
    assert "generator" in get_module_definition("energy_leech").strong_against
    assert "splitter" in get_module_definition("disruptor").strong_against

def test_overclock_has_heat_risk_counter():
    d=get_module_definition("overclock_unit")
    assert "cooler" in d.weak_against
    assert "laser" in d.synergy_with
