from app.game.catalog import BASIC_MODULE_DEFINITIONS, get_counter_summary, get_module_definition

def test_six_new_alpha8_modules_exist():
    expected = {
        "capacitor":"Kapasitör","railgun":"Ray Topu","reflector":"Yansıtıcı",
        "barrier":"Bariyer","targeting_computer":"Hedefleme Bilgisayarı","jammer":"Sinyal Bozucu"
    }
    for module_id, name in expected.items():
        assert get_module_definition(module_id).name_tr == name

def test_alpha8_has_18_global_modules():
    assert len(BASIC_MODULE_DEFINITIONS) == 25

def test_new_modules_have_unique_roles():
    ids=("capacitor","railgun","reflector","barrier","targeting_computer","jammer")
    roles=[get_module_definition(i).strategic_role for i in ids]
    assert len(set(roles)) == 6

def test_representative_counter_relations():
    assert "armor" in get_counter_summary("laser")["strong_against"]
    assert "shield" in get_counter_summary("laser")["weak_against"]
    assert "shield" in get_counter_summary("pulse_cannon")["strong_against"]
    assert "armor" in get_counter_summary("pulse_cannon")["weak_against"]
    assert "targeting_computer" in get_counter_summary("jammer")["strong_against"]

def test_support_sabotage_counter_pair():
    assert "jammer" in get_counter_summary("targeting_computer")["weak_against"]
    assert "targeting_computer" in get_counter_summary("jammer")["strong_against"]

def test_synergy_relations():
    assert "railgun" in get_counter_summary("capacitor")["synergy_with"]
    assert "amplifier" in get_counter_summary("laser")["synergy_with"]
    assert "battery" in get_counter_summary("shield")["synergy_with"]

def test_all_non_core_modules_have_roles():
    for mid, d in BASIC_MODULE_DEFINITIONS.items():
        if mid != "core":
            assert d.strategic_role.strip()
