from .models import ModuleDefinition


BASIC_MODULE_DEFINITIONS: dict[str, ModuleDefinition] = {
    "core": ModuleDefinition(
        id="core",
        name_tr="Çekirdek",
        category="çekirdek",
        max_hp=300,
        circuit_credit_cost=0,
        strategic_role="Ana hedef ve devre merkezi",
        description_tr="Devrenin ana merkezidir. Yok edilmesi savaşın sonucunu belirleyen temel hedeflerden biridir.",
        energy_generation=0.0,
        energy_consumption=0.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=4,
        movable=False,
        removable=False,
        rotatable=False,
    ),
    "generator": ModuleDefinition(
        id="generator",
        name_tr="Jeneratör",
        category="enerji",
        max_hp=150,
        circuit_credit_cost=0,
        strategic_role="Ana enerji kaynağı",
        description_tr="Devreye sürekli enerji sağlar ve aktif modüllerin çalışmasını mümkün kılar.",
        energy_generation=8.0,
        energy_consumption=0.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=3,
        movable=False,
        removable=False,
        rotatable=False,
    ),
    "laser": ModuleDefinition(
        id="laser",
        name_tr="Lazer",
        category="saldırı",
        max_hp=100,
        circuit_credit_cost=90,
        strategic_role="Sürekli tek hedef hasarı",
        description_tr="Düşük-orta enerji tüketimiyle düzenli hasar üretir.",
        energy_consumption=3.0,
        base_damage=12.0,
        cooldown_ms=1000,
        port_count=1,
    ),
    "shield": ModuleDefinition(
        id="shield",
        name_tr="Kalkan",
        category="savunma",
        max_hp=140,
        circuit_credit_cost=100,
        strategic_role="Aktif hasar emme",
        description_tr="Enerji kullanarak devreyi gelen saldırılara karşı korur.",
        energy_consumption=2.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=2,
    ),
    "battery": ModuleDefinition(
        id="battery",
        name_tr="Batarya",
        category="enerji",
        max_hp=120,
        circuit_credit_cost=70,
        strategic_role="Enerji rezervi ve ani yük desteği",
        description_tr="Üretilen enerjiyi depolayarak yüksek tüketimli anlarda devreyi destekler.",
        energy_consumption=0.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=2,
    ),
    "amplifier": ModuleDefinition(
        id="amplifier",
        name_tr="Güçlendirici",
        category="destek",
        max_hp=90,
        circuit_credit_cost=85,
        strategic_role="Bağlı saldırı modülünü güçlendirme",
        description_tr="Bağlı saldırı hattının etkinliğini yükseltir ancak ek enerji yükü oluşturur.",
        energy_consumption=1.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=2,
    ),
    "cooler": ModuleDefinition(
        id="cooler",
        name_tr="Soğutucu",
        category="destek",
        max_hp=100,
        circuit_credit_cost=65,
        strategic_role="Isı kontrolü",
        description_tr="Bağlı modüllerin ısı yükünü azaltarak daha istikrarlı çalışmasını destekler.",
        energy_consumption=1.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=2,
    ),
    "repair": ModuleDefinition(
        id="repair",
        name_tr="Onarım Modülü",
        category="destek",
        max_hp=100,
        circuit_credit_cost=80,
        strategic_role="Sürdürülebilirlik ve Can onarımı",
        description_tr="Hasar görmüş bağlı modüllerin savaşta daha uzun süre kalmasına yardımcı olur.",
        energy_consumption=2.0,
        base_damage=0.0,
        cooldown_ms=2000,
        port_count=2,
    ),
    "splitter": ModuleDefinition(
        id="splitter",
        name_tr="Dağıtıcı",
        category="enerji",
        max_hp=85,
        circuit_credit_cost=60,
        strategic_role="Enerji hattını dallandırma",
        description_tr="Tek enerji hattını birden fazla kola ayırarak devre geometrisini esnek hale getirir.",
        energy_generation=0.0,
        energy_consumption=0.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=3,
    ),
    "pulse_cannon": ModuleDefinition(
        id="pulse_cannon",
        name_tr="Darbe Topu",
        category="saldırı",
        max_hp=115,
        circuit_credit_cost=120,
        strategic_role="Yüksek ani hasar",
        description_tr="Yüksek enerji karşılığında seyrek fakat güçlü darbeler üretir.",
        energy_consumption=5.0,
        base_damage=32.0,
        cooldown_ms=2500,
        port_count=1,
    ),
    "armor": ModuleDefinition(
        id="armor",
        name_tr="Zırh",
        category="savunma",
        max_hp=180,
        circuit_credit_cost=95,
        strategic_role="Pasif dayanıklılık",
        description_tr="Enerji tüketmeden yüksek dayanıklılık sağlar; aktif Kalkan'a ekonomik bir alternatiftir.",
        energy_consumption=0.0,
        base_damage=0.0,
        cooldown_ms=0,
        port_count=2,
    ),
    "emp": ModuleDefinition(
        id="emp",
        name_tr="EMP",
        category="sabotaj",
        max_hp=80,
        circuit_credit_cost=110,
        strategic_role="Geçici sistem bozma",
        description_tr="Rakibin enerji veya destek hattını geçici olarak aksatmak için kullanılan sabotaj modülüdür.",
        energy_consumption=4.0,
        base_damage=0.0,
        cooldown_ms=6000,
        port_count=1,
    ),
}


PLAYER_SELECTABLE_MODULE_IDS: tuple[str, ...] = tuple(
    module_id
    for module_id in BASIC_MODULE_DEFINITIONS
    if module_id != "core"
)


def get_module_definition(definition_id: str) -> ModuleDefinition:
    try:
        return BASIC_MODULE_DEFINITIONS[definition_id]
    except KeyError as exc:
        raise ValueError(f"Bilinmeyen modül tanımı: {definition_id}") from exc


def get_module_definitions_by_category(category: str) -> tuple[ModuleDefinition, ...]:
    return tuple(
        definition
        for definition in BASIC_MODULE_DEFINITIONS.values()
        if definition.category == category
    )
