from .models import ModuleDefinition


BASIC_MODULE_DEFINITIONS: dict[str, ModuleDefinition] = {
    "core": ModuleDefinition(id="core", name_tr="Çekirdek", category="çekirdek", max_hp=300, circuit_credit_cost=0,
        strategic_role="Ana hedef ve devre merkezi", description_tr="Devrenin ana merkezidir.", port_count=4,
        movable=False, removable=False, rotatable=False),
    "generator": ModuleDefinition(id="generator", name_tr="Jeneratör", category="enerji", max_hp=150, circuit_credit_cost=0,
        strategic_role="Ana enerji kaynağı", description_tr="Devreye sürekli enerji sağlar. Savaş sırasında yalnızca dört Çekirdek kapısı arasında taşınabilir.", energy_generation=8.0, port_count=3,
        weak_against=("emp",), movable=True, removable=False, rotatable=False),
    "battery": ModuleDefinition(id="battery", name_tr="Batarya", category="enerji", max_hp=120, circuit_credit_cost=70,
        strategic_role="Enerji rezervi", description_tr="Ani yüklerde devreyi destekler.", port_count=2,
        synergy_with=("pulse_cannon","shield")),
    "splitter": ModuleDefinition(id="splitter", name_tr="Dağıtıcı", category="enerji", max_hp=85, circuit_credit_cost=60,
        strategic_role="Enerji hattını dallandırma", description_tr="Enerji hattını birden fazla kola ayırır.", port_count=3,
        synergy_with=("laser","shield","repair"), weak_against=("jammer",)),
    "capacitor": ModuleDefinition(id="capacitor", name_tr="Kapasitör", category="enerji", max_hp=90, circuit_credit_cost=75,
        strategic_role="Kısa süreli güç boşaltımı", description_tr="Ani enerji desteği sağlar.", cooldown_ms=2500, port_count=2,
        synergy_with=("pulse_cannon","railgun")),

    "laser": ModuleDefinition(id="laser", name_tr="Lazer", category="saldırı", max_hp=100, circuit_credit_cost=90,
        strategic_role="Sürekli tek hedef hasarı", description_tr="Düzenli hasar üretir.", energy_consumption=3.0,
        base_damage=12.0, cooldown_ms=1000, strong_against=("armor",), weak_against=("shield","reflector"),
        synergy_with=("amplifier","targeting_computer")),
    "pulse_cannon": ModuleDefinition(id="pulse_cannon", name_tr="Darbe Topu", category="saldırı", max_hp=115, circuit_credit_cost=120,
        strategic_role="Yüksek ani hasar", description_tr="Seyrek fakat güçlü darbeler üretir.", energy_consumption=5.0,
        base_damage=32.0, cooldown_ms=2500, strong_against=("shield",), weak_against=("armor","jammer"),
        synergy_with=("battery","capacitor","targeting_computer")),
    "railgun": ModuleDefinition(id="railgun", name_tr="Ray Topu", category="saldırı", max_hp=95, circuit_credit_cost=135,
        strategic_role="Yüksek delici hasar", description_tr="Zırhlı hedeflere karşı delici hasar üretir.", energy_consumption=6.0,
        base_damage=40.0, cooldown_ms=3200, strong_against=("armor","barrier"), weak_against=("jammer",),
        synergy_with=("capacitor","cooler","targeting_computer")),

    "shield": ModuleDefinition(id="shield", name_tr="Kalkan", category="savunma", max_hp=140, circuit_credit_cost=100,
        strategic_role="Aktif hasar emme", description_tr="Enerji kullanarak hasarı emer.", energy_consumption=2.0, port_count=2,
        strong_against=("laser",), weak_against=("pulse_cannon","emp"), synergy_with=("battery","repair")),
    "armor": ModuleDefinition(id="armor", name_tr="Zırh", category="savunma", max_hp=180, circuit_credit_cost=95,
        strategic_role="Pasif dayanıklılık", description_tr="Enerji tüketmeden dayanıklılık sağlar.", port_count=2,
        strong_against=("pulse_cannon",), weak_against=("railgun","laser"), synergy_with=("repair",)),
    "reflector": ModuleDefinition(id="reflector", name_tr="Yansıtıcı", category="savunma", max_hp=110, circuit_credit_cost=115,
        strategic_role="Enerji saldırısını geri çevirme", description_tr="Enerji tabanlı saldırıları kısmen geri yönlendirir.",
        energy_consumption=2.0, cooldown_ms=1800, port_count=2, strong_against=("laser",), weak_against=("railgun","emp"),
        synergy_with=("cooler",)),
    "barrier": ModuleDefinition(id="barrier", name_tr="Bariyer", category="savunma", max_hp=165, circuit_credit_cost=105,
        strategic_role="Bağlantı hattını koruma", description_tr="Kritik bağlantı noktalarını korur.", energy_consumption=1.0, port_count=2,
        strong_against=("emp",), weak_against=("railgun",), synergy_with=("splitter","repair")),

    "repair": ModuleDefinition(id="repair", name_tr="Onarım Modülü", category="destek", max_hp=100, circuit_credit_cost=80,
        strategic_role="Can onarımı", description_tr="Hasarlı modülleri onarır.", energy_consumption=2.0, cooldown_ms=2000, port_count=2,
        strong_against=("virus",), weak_against=("jammer",), synergy_with=("shield","armor","barrier")),
    "cooler": ModuleDefinition(id="cooler", name_tr="Soğutucu", category="destek", max_hp=100, circuit_credit_cost=65,
        strategic_role="Isı kontrolü", description_tr="Bağlı modüllerin ısısını düşürür.", energy_consumption=1.0, port_count=2,
        synergy_with=("railgun","reflector")),
    "amplifier": ModuleDefinition(id="amplifier", name_tr="Güçlendirici", category="destek", max_hp=90, circuit_credit_cost=85,
        strategic_role="Saldırı hattını güçlendirme", description_tr="Bağlı saldırı modülünü güçlendirir.", energy_consumption=1.0, port_count=2,
        weak_against=("jammer",), synergy_with=("laser","pulse_cannon")),
    "targeting_computer": ModuleDefinition(id="targeting_computer", name_tr="Hedefleme Bilgisayarı", category="destek", max_hp=85, circuit_credit_cost=90,
        strategic_role="Hedefleme desteği", description_tr="Hedef seçimini ve saldırı verimliliğini geliştirir.", energy_consumption=1.0, port_count=2,
        weak_against=("jammer",), synergy_with=("laser","pulse_cannon","railgun")),

    "emp": ModuleDefinition(id="emp", name_tr="EMP", category="sabotaj", max_hp=80, circuit_credit_cost=110,
        strategic_role="Geçici sistem bozma", description_tr="Enerji ve destek hatlarını geçici aksatır.", energy_consumption=4.0, cooldown_ms=6000,
        strong_against=("shield","reflector","generator"), weak_against=("barrier",)),
    "jammer": ModuleDefinition(id="jammer", name_tr="Sinyal Bozucu", category="sabotaj", max_hp=85, circuit_credit_cost=100,
        strategic_role="Destek hatlarını bozma", description_tr="Hedefleme ve destek modüllerini zayıflatır.", energy_consumption=3.0, cooldown_ms=5000,
        strong_against=("targeting_computer","amplifier","repair"), weak_against=("barrier",)),

"missile_launcher": ModuleDefinition(
    id="missile_launcher", name_tr="Füze Fırlatıcı", category="saldırı",
    max_hp=105, circuit_credit_cost=125,
    strategic_role="Gecikmeli yüksek alan baskısı",
    description_tr="Hazırlık süresi karşılığında yüksek baskı oluşturan ağır saldırı modülüdür.",
    energy_consumption=5.0, base_damage=28.0, cooldown_ms=3000, port_count=1,
    strong_against=("barrier","repair"), weak_against=("shield","jammer"),
    synergy_with=("targeting_computer","battery"),
),
"drone_bay": ModuleDefinition(
    id="drone_bay", name_tr="Dron Üssü", category="saldırı",
    max_hp=110, circuit_credit_cost=115,
    strategic_role="Dağıtık ve sürekli baskı",
    description_tr="Çoklu küçük saldırılarla rakip savunmasını yıpratır.",
    energy_consumption=4.0, base_damage=8.0, cooldown_ms=900, port_count=2,
    strong_against=("reflector",), weak_against=("armor","jammer"),
    synergy_with=("splitter","targeting_computer"),
),
"arc_cannon": ModuleDefinition(
    id="arc_cannon", name_tr="Ark Topu", category="saldırı",
    max_hp=100, circuit_credit_cost=130,
    strategic_role="Zincirleme çoklu hedef hasarı",
    description_tr="Yakın bağlantılı hedefler arasında sıçrayabilen enerji saldırıları üretir.",
    energy_consumption=5.0, base_damage=20.0, cooldown_ms=1800, port_count=1,
    strong_against=("splitter","repair"), weak_against=("barrier","emp"),
    synergy_with=("amplifier","capacitor"),
),
"overclock_unit": ModuleDefinition(
    id="overclock_unit", name_tr="Aşırı Hızlandırıcı", category="destek",
    max_hp=80, circuit_credit_cost=105,
    strategic_role="Yüksek performans karşılığında ısı riski",
    description_tr="Bağlı modülü hızlandırır ancak ısı ve enerji yükünü artırır.",
    energy_consumption=2.0, port_count=2,
    weak_against=("cooler","emp"), synergy_with=("laser","railgun","repair"),
),
"virus": ModuleDefinition(
    id="virus", name_tr="Virüs", category="sabotaj",
    max_hp=70, circuit_credit_cost=115,
    strategic_role="Zamanla yayılan sistem zayıflatması",
    description_tr="Rakip destek ve kontrol hatlarında zamanla etkisini artıran zayıflatma uygular.",
    energy_consumption=3.0, cooldown_ms=7000, port_count=1,
    strong_against=("repair","targeting_computer"), weak_against=("repair","barrier"),
    synergy_with=("jammer",),
),
"energy_leech": ModuleDefinition(
    id="energy_leech", name_tr="Enerji Sömürücü", category="sabotaj",
    max_hp=75, circuit_credit_cost=120,
    strategic_role="Rakibin enerji ekonomisini baskılama",
    description_tr="Rakibin enerji üretim ve depolama hattını zayıflatır.",
    energy_consumption=3.0, cooldown_ms=5500, port_count=1,
    strong_against=("generator","battery","capacitor"), weak_against=("barrier","armor"),
    synergy_with=("emp",),
),
"disruptor": ModuleDefinition(
    id="disruptor", name_tr="Kesici", category="sabotaj",
    max_hp=80, circuit_credit_cost=125,
    strategic_role="Kritik bağlantıyı geçici kesme",
    description_tr="Rakibin seçili bağlantı hattını kısa süreli devre dışı bırakmaya odaklanır.",
    energy_consumption=4.0, cooldown_ms=6500, port_count=1,
    strong_against=("splitter","amplifier","targeting_computer"), weak_against=("barrier",),
    synergy_with=("jammer","emp"),
),
}

PLAYER_SELECTABLE_MODULE_IDS: tuple[str, ...] = tuple(
    module_id for module_id in BASIC_MODULE_DEFINITIONS if module_id != "core"
)

def get_module_definition(definition_id: str) -> ModuleDefinition:
    try:
        return BASIC_MODULE_DEFINITIONS[definition_id]
    except KeyError as exc:
        raise ValueError(f"Bilinmeyen modül tanımı: {definition_id}") from exc

def get_module_definitions_by_category(category: str) -> tuple[ModuleDefinition, ...]:
    return tuple(d for d in BASIC_MODULE_DEFINITIONS.values() if d.category == category)

def get_counter_summary(definition_id: str) -> dict[str, tuple[str, ...]]:
    d = get_module_definition(definition_id)
    return {"strong_against": d.strong_against, "weak_against": d.weak_against, "synergy_with": d.synergy_with}
