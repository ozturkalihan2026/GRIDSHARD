from .models import ModuleDefinition


BASIC_MODULE_DEFINITIONS: dict[str, ModuleDefinition] = {
    "core": ModuleDefinition(
        id="core",
        name_tr="Çekirdek",
        category="çekirdek",
        max_hp=300,
        movable=False,
        removable=False,
        rotatable=False,
    ),
    "generator": ModuleDefinition(
        id="generator",
        name_tr="Jeneratör",
        category="enerji",
        max_hp=150,
        movable=False,
        removable=False,
        rotatable=False,
    ),
    "laser": ModuleDefinition(
        id="laser",
        name_tr="Lazer",
        category="saldırı",
        max_hp=100,
    ),
    "shield": ModuleDefinition(
        id="shield",
        name_tr="Kalkan",
        category="savunma",
        max_hp=140,
    ),
    "battery": ModuleDefinition(
        id="battery",
        name_tr="Batarya",
        category="enerji",
        max_hp=120,
    ),
    "amplifier": ModuleDefinition(
        id="amplifier",
        name_tr="Güçlendirici",
        category="destek",
        max_hp=90,
    ),
    "cooler": ModuleDefinition(
        id="cooler",
        name_tr="Soğutucu",
        category="destek",
        max_hp=100,
    ),
    "repair": ModuleDefinition(
        id="repair",
        name_tr="Onarım Modülü",
        category="destek",
        max_hp=100,
    ),
}


def get_module_definition(definition_id: str) -> ModuleDefinition:
    try:
        return BASIC_MODULE_DEFINITIONS[definition_id]
    except KeyError as exc:
        raise ValueError(f"Bilinmeyen modül tanımı: {definition_id}") from exc
