from dataclasses import replace
from ..arena_canon import MODULES
from .models import ModuleDefinition


BASIC_MODULE_DEFINITIONS: dict[str, ModuleDefinition] = {
    "core": ModuleDefinition(id="core", name_tr="Çekirdek", category="çekirdek", max_hp=300,
        strategic_role="Ana hedef ve devre merkezi", description_tr="Devrenin ana merkezidir."),
    "battery": ModuleDefinition(id="battery", name_tr="Batarya", category="enerji", max_hp=120,
        strategic_role="Enerji besleme ve rezervi", description_tr="Devreye sürekli enerji verir ve ani yükler için enerji depolar.",
        energy_generation=3.0,
        synergy_with=("pulse_cannon","shield")),
    "capacitor": ModuleDefinition(id="capacitor", name_tr="Kapasitör", category="enerji", max_hp=90,
        strategic_role="Kısa süreli güç boşaltımı", description_tr="Ani enerji desteği sağlar.", cooldown_ms=2500,
        synergy_with=("pulse_cannon","railgun")),

    "laser": ModuleDefinition(id="laser", name_tr="Lazer", category="saldırı", max_hp=100,
        strategic_role="Sürekli tek hedef hasarı", description_tr="Düzenli hasar üretir.", energy_consumption=3.0,
        base_damage=12.0, cooldown_ms=1000, strong_against=("armor",), weak_against=("shield","reflector"),
        synergy_with=("amplifier","targeting_computer")),
    "pulse_cannon": ModuleDefinition(id="pulse_cannon", name_tr="Darbe Topu", category="saldırı", max_hp=115,
        strategic_role="Yüksek ani hasar", description_tr="Seyrek fakat güçlü darbeler üretir.", energy_consumption=5.0,
        base_damage=32.0, cooldown_ms=2500, strong_against=("shield",), weak_against=("armor","jammer"),
        synergy_with=("battery","capacitor","targeting_computer")),
    "railgun": ModuleDefinition(id="railgun", name_tr="Ray Topu", category="saldırı", max_hp=95,
        strategic_role="Yüksek delici hasar", description_tr="Zırhlı hedeflere karşı delici hasar üretir.", energy_consumption=6.0,
        base_damage=40.0, cooldown_ms=3200, strong_against=("armor","barrier"), weak_against=("jammer",),
        synergy_with=("capacitor","cooler","targeting_computer")),

    "shield": ModuleDefinition(id="shield", name_tr="Kalkan", category="savunma", max_hp=140,
        strategic_role="Aktif hasar emme", description_tr="Enerji kullanarak hasarı emer.", energy_consumption=2.0,
        strong_against=("laser",), weak_against=("pulse_cannon","emp"), synergy_with=("battery","repair")),
    "armor": ModuleDefinition(id="armor", name_tr="Zırh", category="savunma", max_hp=180,
        strategic_role="Pasif dayanıklılık", description_tr="Enerji tüketmeden dayanıklılık sağlar.",
        strong_against=("pulse_cannon",), weak_against=("railgun","laser"), synergy_with=("repair",)),
    "reflector": ModuleDefinition(id="reflector", name_tr="Yansıtıcı", category="savunma", max_hp=110,
        strategic_role="Enerji saldırısını geri çevirme", description_tr="Enerji tabanlı saldırıları kısmen geri yönlendirir.",
        energy_consumption=2.0, cooldown_ms=1800, strong_against=("laser",), weak_against=("railgun","emp"),
        synergy_with=("cooler",)),
    "barrier": ModuleDefinition(id="barrier", name_tr="Bariyer", category="savunma", max_hp=165,
        strategic_role="Savunma hattını koruma", description_tr="Kritik devre hücrelerini korur.", energy_consumption=1.0,
        strong_against=("emp",), weak_against=("railgun",), synergy_with=("repair",)),

    "repair": ModuleDefinition(id="repair", name_tr="Onarım Modülü", category="destek", max_hp=100,
        strategic_role="Can onarımı", description_tr="En düşük CAN oranındaki tek modülü onarır.", energy_consumption=2.0, cooldown_ms=2000,
        strong_against=("virus",), weak_against=("jammer",), synergy_with=("shield","armor","barrier")),
    "cooler": ModuleDefinition(id="cooler", name_tr="Soğutucu", category="destek", max_hp=100,
        strategic_role="Isı kontrolü", description_tr="Devredeki en sıcak iki modülün ısısını düşürür; aşırı ısınıp susmuş modülü hızla toparlar.", energy_consumption=1.0,
        synergy_with=("railgun","reflector")),
    "amplifier": ModuleDefinition(id="amplifier", name_tr="Güçlendirici", category="destek", max_hp=90,
        strategic_role="Saldırı hattını güçlendirme", description_tr="Devredeki saldırı modüllerinin hasarını artırır; toplam %30 pay saldırılar arasında bölünür, tek saldırıya en fazla %15.", energy_consumption=1.0,
        weak_against=("jammer",), synergy_with=("laser","pulse_cannon")),
    "targeting_computer": ModuleDefinition(id="targeting_computer", name_tr="Hedefleme Bilgisayarı", category="destek", max_hp=85,
        strategic_role="Hedefleme desteği", description_tr="Devredeki saldırı modüllerinin bekleme süresini kısaltır; toplam %30 pay saldırılar arasında bölünür, tek saldırıya en fazla %15.", energy_consumption=1.0,
        weak_against=("jammer",), synergy_with=("laser","pulse_cannon","railgun")),

    "emp": ModuleDefinition(id="emp", name_tr="EMP", category="sabotaj", max_hp=80,
        strategic_role="Geçici sistem bozma", description_tr="Enerji ve destek hatlarını geçici aksatır.", energy_consumption=4.0, cooldown_ms=6000,
        strong_against=("shield","reflector"), weak_against=("barrier",)),
    "jammer": ModuleDefinition(id="jammer", name_tr="Sinyal Bozucu", category="sabotaj", max_hp=85,
        strategic_role="Destek hatlarını bozma", description_tr="Hedefleme ve destek modüllerini zayıflatır.", energy_consumption=3.0, cooldown_ms=5000,
        strong_against=("targeting_computer","amplifier","repair"), weak_against=("barrier",)),

"missile_launcher": ModuleDefinition(
    id="missile_launcher", name_tr="Füze Fırlatıcı", category="saldırı",
    max_hp=105,
    strategic_role="Gecikmeli yüksek alan baskısı",
    description_tr="Hazırlık süresi karşılığında yüksek baskı oluşturan ağır saldırı modülüdür.",
    energy_consumption=5.0, base_damage=28.0, cooldown_ms=3000,
    strong_against=("barrier","repair"), weak_against=("shield","jammer"),
    synergy_with=("targeting_computer","battery"),
),
"drone_bay": ModuleDefinition(
    id="drone_bay", name_tr="Dron Üssü", category="saldırı",
    max_hp=110,
    strategic_role="Dağıtık ve sürekli baskı",
    description_tr="Çoklu küçük saldırılarla rakip savunmasını yıpratır.",
    energy_consumption=4.0, base_damage=8.0, cooldown_ms=900,
    strong_against=("reflector",), weak_against=("armor","jammer"),
    synergy_with=("targeting_computer",),
),
"arc_cannon": ModuleDefinition(
    id="arc_cannon", name_tr="Ark Topu", category="saldırı",
    max_hp=100,
    strategic_role="Zincirleme çoklu hedef hasarı",
    description_tr="Yakın bağlantılı hedefler arasında sıçrayabilen enerji saldırıları üretir.",
    energy_consumption=5.0, base_damage=20.0, cooldown_ms=1800,
    strong_against=("repair",), weak_against=("barrier","emp"),
    synergy_with=("amplifier","capacitor"),
),
"overclock_unit": ModuleDefinition(
    id="overclock_unit", name_tr="Aşırı Hızlandırıcı", category="destek",
    max_hp=80,
    strategic_role="Yüksek performans karşılığında ısı riski",
    description_tr="Devredeki en ağır saldırı modülünü hızlandırır ve güçlendirir; karşılığında o modül daha hızlı ısınır.",
    energy_consumption=2.0,
    weak_against=("cooler","emp"), synergy_with=("laser","railgun","repair"),
),
"virus": ModuleDefinition(
    id="virus", name_tr="Virüs", category="sabotaj",
    max_hp=70,
    strategic_role="Zamanla yayılan sistem zayıflatması",
    description_tr="Rakip destek ve kontrol hatlarında zamanla etkisini artıran zayıflatma uygular.",
    energy_consumption=3.0, cooldown_ms=7000,
    strong_against=("repair","targeting_computer"), weak_against=("repair","barrier"),
    synergy_with=("jammer",),
),
"disruptor": ModuleDefinition(
    id="disruptor", name_tr="Kesici", category="sabotaj",
    max_hp=80,
    strategic_role="Kritik bağlantıyı geçici kesme",
    description_tr="Rakibin seçili bağlantı hattını kısa süreli devre dışı bırakmaya odaklanır.",
    energy_consumption=4.0, cooldown_ms=6500,
    strong_against=("amplifier","targeting_computer"), weak_against=("barrier",),
    synergy_with=("jammer","emp"),
),
}

# New cards reuse explicit V1 mechanics, retaining their own identity and stats.
CANON_MECHANICS = {
    "current_balancer": "battery", "plasma_mortar": "missile_launcher",
    "guardian_dome": "shield", "nano_medic": "repair", "quantum_repeater": "laser",
    "chrono_relay": "overclock_unit", "ion_spear": "railgun", "phase_armor": "armor",
    "swarm_fabricator": "drone_bay", "precision_matrix": "targeting_computer",
    "quantum_cannon": "pulse_cannon", "phoenix_repair": "repair", "prism_shield": "shield",
    "singularity_projector": "disruptor", "omega_amplifier": "amplifier",
}
# Kartın bugün motorda gerçekten yaptığı işin kısa adı. Henüz kendi
# mekaniğine ayrışmamış kartlar (behavior_id başka bir karta işaret eder)
# burada yer almaz; arayüz onlar için ortak temel davranışı gösterir.
SIGNATURE_MECHANICS = {
    "laser": "Sürekli tek hedef ateşi",
    "pulse_cannon": "Seyrek ağır darbe",
    "railgun": "Savunmanın %40'ını delen ağır atış",
    "missile_launcher": "Hedefe kilitlenip ateşleyen füze",
    "drone_bay": "Sık atış, sıradaki hedefe %25 sıçrama",
    "arc_cannon": "Sıradaki hedefe %45 zincir",
    "plasma_mortar": "Kilitlenen plazma, %35 alan sıçraması",
    "quantum_repeater": "Aynı hedefe 4. vuruşta kuantum yankısı",
    "ion_spear": "Savunmanın %60'ını delme, %55 arka hedef",
    "swarm_fabricator": "Dron biriktirip üç hedefe sürü salma",
    "quantum_cannon": "Boşa giden enerjiyi kuantum yüküne çevirme",
    "shield": "Enerjiyle hasar emme",
    "armor": "Pasif dayanıklılık",
    "reflector": "Hasarın bir kısmını geri yansıtma",
    "barrier": "Saldırıları kendine çekme",
    "guardian_dome": "Tüm devreye koruma kubbesi",
    "phase_armor": "Periyodik faz: saldırıyı tamamen boşa çıkarma",
    "prism_shield": "Engellenen hasarı enerjiye çevirme",
    "repair": "En yaralı modülü onarma",
    "nano_medic": "İki modüle dağıtılmış onarım",
    "phoenix_repair": "Yok edilen modülü yeniden devreye alma",
    "cooler": "Devredeki en sıcak iki modülü soğutma",
    "amplifier": "Tüm saldırılara paylaşılan hasar desteği",
    "targeting_computer": "Tüm saldırılara paylaşılan hız desteği",
    "overclock_unit": "En ağır saldırıya ısı karşılığında hız ve hasar",
    "chrono_relay": "Hızlanma penceresi ve zaman borcu",
    "precision_matrix": "Aynı hedefte odak yığını",
    "omega_amplifier": "Sınıf çeşitliliğiyle büyüyen rezonans",
    "emp": "Hedef sistemi susturma",
    "jammer": "Destek ve kontrol kartını bozma",
    "virus": "Her tikte artan enfeksiyon hasarı",
    "disruptor": "Hat kesme ve ikinci sisteme yankı",
    "singularity_projector": "Uzun tekillik kesintisi ve güçlü yankı",
    "battery": "Sürekli enerji ve rezerv",
    "capacitor": "Ani enerji rezervi",
    "current_balancer": "Aksiyon ve bakım maliyetini azaltma",
}

# Rakibin bu karta nasıl karşılık verebileceği. Temel kartlarda karşılıklar
# İstatistik sekmesindeki "Zayıf olduğu" listesinde zaten görünür.
COUNTERPLAY_TR = {
    "railgun": "Isısı ve enerji maliyeti yüksektir; Sinyal Bozucu ile susturulur.",
    "missile_launcher": "Kilit sürerken hedef yok olursa ya da değişirse kilit baştan başlar; Kalkan hasarı azaltır.",
    "drone_bay": "Sıçrama hasarı da hedefin savunmasından geçer; Zırh ve Sinyal Bozucu verimini düşürür.",
    "arc_cannon": "Zincir hasarı da savunmadan geçer; Bariyer ve EMP ile karşılanır.",
    "plasma_mortar": "Kilit süresi uzundur; hedef değişirse kilit baştan başlar.",
    "quantum_repeater": "Hedef değişince sayaç sıfırlanır; Kalkan ve Yansıtıcı hasarı azaltır.",
    "ion_spear": "Enerji ve ısı maliyeti çok yüksektir; Sinyal Bozucu ile susturulur.",
    "swarm_fabricator": "Birikim sürerken susturmak sürüyü geciktirir; Zırh sürü hasarını azaltır.",
    "quantum_cannon": "Devresinde enerji fazlası yoksa yük birikmez; Zırh ve Sinyal Bozucu etkilidir.",
    "guardian_dome": "Kubbenin kendisini yok etmek devre korumasını kaldırır; Darbe Topu ve EMP etkilidir.",
    "phase_armor": "Faz penceresi dışındaki 5 saniyede vurulur; Ray Topu ve Lazer etkilidir.",
    "prism_shield": "Darbe Topu ve EMP etkilidir; susturulmuş Prizma enerji üretmez.",
    "nano_medic": "Tek hedefe yoğun ateş, iki modüle yayılan küçük onarımı aşar; Sinyal Bozucu keser.",
    "phoenix_repair": "Anka'yı önce yok etmek ya da susturmak diriltmeyi engeller; her modül yalnız bir kez dirilir.",
    "amplifier": "Sahibi çok saldırı modülü kullandıkça payı düşer; Sinyal Bozucu keser.",
    "targeting_computer": "Sahibi çok saldırı modülü kullandıkça payı düşer; Sinyal Bozucu keser.",
    "overclock_unit": "Hedefi hızla ısınır; Soğutucu yoksa susar. EMP ile kesilir.",
    "chrono_relay": "Zaman borcu penceresinde sahibinin saldırıları yavaşlar; baskıyı o anda kurun.",
    "precision_matrix": "Hedef değişimi odağı sıfırlar; Sinyal Bozucu keser.",
    "omega_amplifier": "Tek sınıfa dayalı destede rezonans zayıftır; Sinyal Bozucu keser.",
    "virus": "Onarım Modülü virüsü temizler; Bariyer süreyi kısaltır.",
    "disruptor": "Enerjili Bariyer süreyi kısaltır ve yankıyı engelleyebilir.",
    "singularity_projector": "Enerji maliyeti ve bekleme süresi yüksektir; Bariyer süreyi kısaltır.",
}

# Temel kartın davranışını devralıp üzerine imza mekaniği ekleyen kartların
# kendi rol ve açıklamaları.
CARD_COPY = {
    "guardian_dome": ("Devre koruması", "Kendisine gelen hasarı %32 azaltır; yaşadığı sürece devredeki diğer modüllere gelen hasarı ayrıca %12 azaltır."),
    "prism_shield": ("Prizmatik dönüşüm", "Kendisine gelen hasarı %30 azaltır; engellediği hasarın dörtte birini Çekirdek rezervine enerji olarak ekler."),
    "phase_armor": ("Periyodik faz", "Her 6 saniyenin ilk saniyesinde saldırıları tamamen boşa çıkarır; diğer anlarda hasarı %18 azaltır."),
    "nano_medic": ("Dağıtık onarım", "En yaralı iki modülü aynı anda, her birini temel onarımın %62'si kadar onarır."),
    "phoenix_repair": ("Yeniden devreye alma", "30 saniyede bir, sınıf sınırlarına uyarak yok edilmiş bir modülü %30 CAN ile geri getirir (10 enerji); her modül maçta yalnız bir kez dirilir. Diriltecek modül yoksa güçlü bir tek hedef onarımı yapar."),
    "quantum_repeater": ("Kuantum tekrar", "Aynı hedefe dördüncü ardışık vuruşta, son hasarın %65'i kadar kuantum yankısı üretir."),
    "plasma_mortar": ("Gecikmeli plazma alanı", "Hedefe 1,2 sn kilitlenip ateşler; sıradaki hedefe %35 alan hasarı sıçrar."),
    "ion_spear": ("İyonik deliş", "Savunma azaltımının %60'ını yok sayar; arkadaki hedefe %55 hasar taşar."),
    "swarm_fabricator": ("Sürü birikimi", "Her atışta bir dron biriktirir; dördüncü atışta üç hedefe sürü salar."),
    "quantum_cannon": ("Kuantum yük", "Devrenin boşa giden enerjisini yük olarak toplar; dolu yük sıradaki atışa %80'e kadar hasar ekler."),
    "chrono_relay": ("Zaman borcu", "4 sn boyunca tüm saldırıları hızlandırır; ardından 2,5 sn zaman borcu saldırıları yavaşlatır."),
    "precision_matrix": ("Odak yığını", "Aynı hedefe art arda vuran saldırılar 4 kademeye kadar hasar ve hız kazanır."),
    "omega_amplifier": ("Uyarlanabilir rezonans", "Devredeki her farklı sınıf, saldırılara paylaşılan hasar desteğini büyütür."),
    "singularity_projector": ("Tekillik alanı", "Hedef sistemi 4,5 sn keser; ikinci bir sisteme %65 süreli yankı uygular."),
}

# Aksiyon başına harcanan enerji. Saldırı, onarım ve sabotaj işi yaptığı anda
# öder; enerji yoksa modül bekler ve beklemesi boşa gitmez.
ACTION_ENERGY_COSTS = {
    "laser": 1.2, "pulse_cannon": 5.0, "railgun": 6.0,
    "missile_launcher": 4.5, "drone_bay": 1.0, "arc_cannon": 3.5,
    "plasma_mortar": 5.5, "quantum_repeater": 2.8, "ion_spear": 7.0,
    "swarm_fabricator": 2.2, "quantum_cannon": 8.0,
    "repair": 2.5, "nano_medic": 3.0, "phoenix_repair": 5.0,
    "emp": 6.0, "jammer": 5.0, "virus": 6.0,
    "disruptor": 8.0, "singularity_projector": 8.0,
}

# Sürekli çalışan sistemlerin saniyelik bakım enerjisi. Pasif zırh da küçük
# bir bakım öder; yoksa tam savunma devresi enerji bedelsiz kalırdı.
PASSIVE_UPKEEP = {
    "shield": .8, "reflector": .6, "barrier": .5, "armor": .5,
    "guardian_dome": 1.0, "prism_shield": 1.0, "phase_armor": .5,
    "cooler": .25, "amplifier": .4, "targeting_computer": .4,
    "overclock_unit": .8, "precision_matrix": .6, "chrono_relay": .7,
    "omega_amplifier": .8, "current_balancer": .4,
}

SYSTEM_COPY = {
    "battery": ("Enerji besleme ve rezervi", "Devreye saniyede 3 enerji verir; ayrıca 20 enerji depolayarak ani yükleri karşılar."),
    "capacitor": ("Ani enerji rezervi", "Enerji üretmez; 10 enerjilik, çok hızlı dolup boşalan bir rezervdir ve açıkta Bataryadan önce boşalır."),
    "current_balancer": ("Devre verimliliği", "Aksiyon ve bakım enerjisi maliyetlerini %8 azaltır. Çoklu kopyalar en fazla %24 azaltım sağlar."),
}
for _module_id, _spec in MODULES.items():
    _base = BASIC_MODULE_DEFINITIONS[CANON_MECHANICS.get(_module_id, _module_id)]
    _role, _description = SYSTEM_COPY.get(
        _module_id,
        CARD_COPY.get(_module_id, (_base.strategic_role, _base.description_tr)),
    )
    BASIC_MODULE_DEFINITIONS[_module_id] = replace(
        _base, id=_module_id, name_tr=_spec["name_tr"],
        rarity=_spec["rarity"],
        max_hp=_spec["max_hp"],
        # Sabotaj kartları sabotaj motoruyla çalışır; devralınan hasar değeri
        # Tekillik Projektörü gibi kartları gizlice saldırı döngüsüne de sokardı.
        base_damage=0.0 if _spec["category"] == "sabotaj" else _spec["base_damage"],
        behavior_id=CANON_MECHANICS.get(_module_id, _module_id),
        current_cost=_spec["current_cost"],
        category="enerji" if _spec["category"] == "sistem" else _spec["category"],
        strategic_role=_role,
        description_tr=_description,
        strong_against=tuple(key for key in _base.strong_against if key in MODULES),
        weak_against=tuple(key for key in _base.weak_against if key in MODULES),
        synergy_with=tuple(key for key in _base.synergy_with if key in MODULES),
        signature_mechanic=SIGNATURE_MECHANICS.get(_module_id, ""),
        counterplay_tr=COUNTERPLAY_TR.get(_module_id, ""),
        energy_generation=_base.energy_generation if _module_id == "battery" else 0.0,
        energy_consumption=PASSIVE_UPKEEP.get(_module_id, 0.0),
        action_energy_cost=ACTION_ENERGY_COSTS.get(_module_id, 0.0),
    )

PLAYER_SELECTABLE_MODULE_IDS: tuple[str, ...] = tuple(MODULES)

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
