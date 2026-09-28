"""Çekirdek kimliği: enderlik bir güç eğrisi değil, imza mekaniğidir (Beta.72).

Beta.62'deki enderlik eğrisi (CAN, güç etkisi, enerji ve dolum çarpanı)
kaldırıldı; aynı seviyedeki bütün çekirdekler aynı sayısal temeli kullanır.
Modüllerde olduğu gibi enderlik mekanik kimliği belirler: Yaygın tek iş, Nadir
oyuncunun kurduğu bir koşul, Destansı zamanla biriken durum ya da risk–ödül,
Efsanevi savaşın bir kuralını değiştiren imza.
"""

CORE_POWER_FULL_CHARGE = 100.0

# Muhafız · Son Hat: Çekirdek CAN'ı bu oranın altındayken kalkan güçlenir.
LAST_STAND_HP_RATIO = 0.50
LAST_STAND_MODULE_MULTIPLIER = 1.5
LAST_STAND_CORE_MULTIPLIER = 3.0

# Aşırı Yük · Zincir: güç sürerken yok edilen her rakip modül süreyi uzatır.
OVERDRIVE_CHAIN_EXTENSION_MS = 1_000
OVERDRIVE_CHAIN_MAX = 2

# Kesinti · Statik Birikim: dolduktan sonra bekletilen süre kesintiyi uzatır.
STATIC_CHARGE_INTERVAL_MS = 4_000
STATIC_CHARGE_BONUS_MS = 500
STATIC_CHARGE_MAX_STACKS = 4

# Kapasitör · Deşarj: rezervin tamamı boşalır; rezerv en az yarı doluysa
# bir indirimli yerleştirme daha verir.
DISCHARGE_BASE_DEPLOYMENTS = 2
DISCHARGE_FULL_DEPLOYMENTS = 3
DISCHARGE_FULL_RESERVE_RATIO = 0.50

# Anka · Küllerden Doğuş: dolum tamken Çekirdek maçta bir kez yok olmaz.
EMBER_REBIRTH_HP_RATIO = 0.25

# Kuantum · Yarım Faz: güç yarım dolumda da kullanılabilir (yalnız kalkan).
HALF_PHASE_CHARGE = 50.0


CORE_SIGNATURES: dict[str, dict[str, str]] = {
    "core_resonance": {
        "signature_id": "single_pulse",
        "name_tr": "Tek Darbe",
        "signature_tr": "Tek iş: Çekirdeğe 45, modüllere 15 CAN onarım darbesi. Devre tam canlıyken kullanılamaz, dolum korunur.",
        "telegraph_tr": "Dolum halkası dolunca Çekirdek parlar; darbe kablolar boyunca yayılır.",
        "counterplay_tr": "Onarım bir kerelik darbedir; ani yüklenme onarımdan sonra açılan boşluğu cezalandırır.",
    },
    "core_guardian": {
        "signature_id": "last_stand",
        "name_tr": "Son Hat",
        "signature_tr": "Koşul: Çekirdek CAN'ı yarının altındayken kalkan modül başına 20 yerine 30, Çekirdeğe 60 olur.",
        "telegraph_tr": "Koşul sağlandığında Çekirdekte ◆ rozeti yanar; iki taraf da görür.",
        "counterplay_tr": "Çekirdeği yarının altına indiren vuruşu kalkan bittikten sonraya sakla.",
    },
    "core_overdrive": {
        "signature_id": "overdrive_chain",
        "name_tr": "Zincir",
        "signature_tr": "Koşul: Aşırı Yük sürerken yok edilen her rakip modül gücü 1 sn uzatır (en fazla +2 sn).",
        "telegraph_tr": "Uzama olduğunda Çekirdekte ⛓ rozeti ve ZİNCİR etiketi görünür.",
        "counterplay_tr": "Güç açıkken zayıf modülleri korumaya al ya da kısa süreli savunmayla zinciri kır.",
    },
    "core_disruptor": {
        "signature_id": "static_charge",
        "name_tr": "Statik Birikim",
        "signature_tr": "Birikim: güç dolduktan sonra bekletilen her 4 sn kesintiye 0,5 sn ekler (en fazla +2 sn).",
        "telegraph_tr": "Biriken yük rakibe de görünür: Çekirdekte ⚡n/4 rozeti.",
        "counterplay_tr": "Yük birikirken destekleri geç bas; kesinti gelince yeni destek yerleştir.",
    },
    "core_capacitor": {
        "signature_id": "reserve_discharge",
        "name_tr": "Deşarj",
        "signature_tr": "Risk–ödül: güç Çekirdek rezervinin tamamını boşaltır; rezerv en az yarı doluysa 2 yerine 3 yerleştirme 1 Akım indirimli olur.",
        "telegraph_tr": "Deşarjdan sonra saldırılar rezerv dolana kadar enerji bekleyebilir.",
        "counterplay_tr": "Deşarjın hemen ardından baskı kur; boş rezerv ağır saldırıları geciktirir.",
    },
    "core_phoenix": {
        "signature_id": "ember_rebirth",
        "name_tr": "Küllerden Doğuş",
        "signature_tr": "Kural: dolum tamken Çekirdek yok olacak vuruşu alırsa %25 CAN ile ayakta kalır ve dolum sıfırlanır. Maçta bir kez.",
        "telegraph_tr": "Doğuş hazırken Çekirdekte ✹ rozeti yanar; iki taraf da görür.",
        "counterplay_tr": "Rozet yanarken son vuruşu değil, doğuştan sonraki ikinci dalgayı hazırla ya da gücü erken harcamaya zorla.",
    },
    "core_quantum": {
        "signature_id": "half_phase",
        "name_tr": "Yarım Faz",
        "signature_tr": "Kural: güç %50 dolumda da kullanılabilir; yarım dolumda yalnız 4 sn kalkan, tam dolumda onarım ve kalkan birlikte.",
        "telegraph_tr": "Yarım kullanımda Çekirdekten yalnız kalkan dalgası çıkar; güç göstergesi YARIM yazar.",
        "counterplay_tr": "Yarım kalkan kısa ve onarımsızdır; kalkan bitince aynı hedefe yüklen.",
    },
}


def core_signature(core_type: str) -> dict[str, str]:
    return dict(CORE_SIGNATURES.get(str(core_type), CORE_SIGNATURES["core_resonance"]))


def core_power_threshold(core_type: str) -> float:
    return HALF_PHASE_CHARGE if core_type == "core_quantum" else CORE_POWER_FULL_CHARGE


def static_charge_stacks(held_ms: int) -> int:
    return max(0, min(STATIC_CHARGE_MAX_STACKS, int(held_ms) // STATIC_CHARGE_INTERVAL_MS))
