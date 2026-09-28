from app.arena_canon import MODULES, module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS, SIGNATURE_MECHANICS
from app.game.catalog_view import build_module_catalog_view
from app.meta_progression import MetaProgressionService
from app.player_profile import PlayerProfileService


def test_every_card_has_a_signature_or_names_the_behavior_it_shares():
    for module_id in MODULES:
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        if definition.signature_mechanic:
            continue
        # Henüz ayrışmamış kart başka bir kartın davranışını kullanır; bu
        # durum arayüzde açıkça gösterilebilsin diye kaynak kart bilinmelidir.
        assert definition.mechanic_id != module_id, module_id
        assert definition.mechanic_id in BASIC_MODULE_DEFINITIONS, module_id


def test_signature_copy_only_names_live_player_cards():
    assert set(SIGNATURE_MECHANICS) <= set(BASIC_MODULE_DEFINITIONS)


def test_rarer_card_with_shared_behavior_has_no_hidden_stat_edge():
    shield = BASIC_MODULE_DEFINITIONS["shield"]
    prism = BASIC_MODULE_DEFINITIONS["prism_shield"]
    assert prism.mechanic_id == shield.mechanic_id
    assert (
        module_stats(prism, 6)["effect_multiplier"]
        == module_stats(shield, 6)["effect_multiplier"]
    )


def test_catalog_view_publishes_rarity_identity_fields():
    modules = {item["id"]: item for item in build_module_catalog_view()["modules"]}
    laser = modules["laser"]
    assert laser["rarity"] == "common"
    assert laser["signature_mechanic"] == SIGNATURE_MECHANICS["laser"]
    assert "telegraph_tr" in laser and "counterplay_tr" in laser


def test_module_collection_marks_shared_behavior_for_player_ui():
    service = MetaProgressionService()
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("beta72-identity")
    collection = {
        item["definition_id"]: item
        for item in service.view(profile)["module_collection"]
    }
    # Her kartın kendi imza mekaniği var; ortak davranış etiketi boş kalır.
    assert collection["prism_shield"]["shared_behavior_tr"] == ""
    assert collection["prism_shield"]["signature_mechanic"]
    assert collection["laser"]["shared_behavior_tr"] == ""
    assert "rarity_bonuses" not in collection["laser"]["stats"]
