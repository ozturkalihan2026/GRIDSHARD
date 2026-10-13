"""Modül yetenekleri (Faz 3, 12 Ekim 2026).

Her modülün dört yetenek eşiği vardır; her eşikte iki daldan biri seçilir.
Kayıtlı seçimler bozulmasın diye dal kimlikleri eskisi gibidir ("power" sol
dal, "resilience" sağ dal); anlamları eşiğe göre değişir:

- Eşik 1 ("0") Temel uzmanlık: güç +%3 ya da CAN +%5.
- Eşik 2 ("1") İmza yeteneği: modüle özel iki yetenekten biri. Yetenek düz bir
  artış değildir; savaşta ayrı bir kural olarak çalışır.
- Eşik 3 ("2") İnce ayar: hız (bekleme −%4; beklemesi olmayan modülde etki
  +%4) ya da verim (enerji tüketimi −%12).
- Eşik 4 ("3") Ustalık: seçilen imza yeteneğini güçlendirir ya da CAN +%8.

İmza yetenekleri az sayıda ortak kancayla tanımlanır; motor yalnız kancaları
bilir (engine.py). Bu dosya veri ve saf hesaptır; başka modülü içe aktarmaz.
"""
from __future__ import annotations

TIER_BASIC = "0"
TIER_SIGNATURE = "1"
TIER_TUNING = "2"
TIER_MASTERY = "3"
CHOICE_LEFT = "power"
CHOICE_RIGHT = "resilience"

BASIC_POWER_BONUS = 0.03
BASIC_HP_BONUS = 0.05
TUNING_COOLDOWN_MULTIPLIER = 0.96
TUNING_EFFECT_BONUS = 0.04
TUNING_ENERGY_MULTIPLIER = 0.88
MASTERY_HP_BONUS = 0.08
MASTERY_MULTIPLIER = 1.5
KILL_RELOAD_MASTERY_BONUS = 0.30
# Akım kazandıran yetenekler oyuncu başına bu aralıktan sık Akım vermez.
CURRENT_TAP_PLAYER_GAP_MS = 8_000

TALENT_LEVELS = {
    "common": (5, 8, 11, 14),
    "rare": (6, 9, 12, 15),
    "epic": (7, 10, 13, 15),
    "legendary": (8, 11, 14, 15),
}
TALENT_FLUX_COSTS = (15, 30, 45, 60)

BASIC_POWER_COPY = {
    "saldırı": ("Hasar +%3", "Damage +3%", "Bu modülün verdiği hasarı kalıcı olarak %3 artırır.",
                "Permanently increases this module's damage by 3%."),
    "savunma": ("Savunma etkisi +%3", "Defense effect +3%", "Bu modülün savunma etkisini kalıcı olarak %3 artırır.",
                "Permanently increases this module's defense effect by 3%."),
    "destek": ("Destek etkisi +%3", "Support effect +3%", "Bu modülün destek etkisini kalıcı olarak %3 artırır.",
               "Permanently increases this module's support effect by 3%."),
    "sabotaj": ("Kontrol etkisi +%3", "Control effect +3%", "Bu modülün kontrol etkisini kalıcı olarak %3 artırır.",
                "Permanently increases this module's control effect by 3%."),
    "sistem": ("Sistem etkisi +%3", "System effect +3%", "Bu modülün sistem etkisini kalıcı olarak %3 artırır.",
               "Permanently increases this module's system effect by 3%."),
}


def _percent(value: float) -> int:
    return int(round(float(value) * 100))


def _seconds(milliseconds: float) -> str:
    return f"{float(milliseconds) / 1000:g}".replace(".", ",")


def _seconds_en(milliseconds: float) -> str:
    return f"{float(milliseconds) / 1000:g}"


# Kanca → (Türkçe açıklama, İngilizce açıklama) üreten işlevler.
def _describe(hook: str, p: dict) -> tuple[str, str]:
    if hook == "splash_window":
        return (
            f"Her {_seconds(p['period_ms'])} saniyede bir {_seconds(p['window_ms'])} saniye boyunca her atış, "
            f"hedefin yanındaki modüllere hasarın %{_percent(p['ratio'])} kadarını da verir.",
            f"Every {_seconds_en(p['period_ms'])} sec, for {_seconds_en(p['window_ms'])} sec, each shot also deals "
            f"{_percent(p['ratio'])}% of its damage to the modules next to the target.",
        )
    if hook == "execute":
        return (
            f"CAN'ı %{_percent(p['threshold'])} altındaki hedeflere %{_percent(p['bonus'])} daha çok hasar verir.",
            f"Deals {_percent(p['bonus'])}% more damage to targets below {_percent(p['threshold'])}% HP.",
        )
    if hook == "nth_shot":
        return (
            f"Her {p['every']}. atış %{_percent(p['bonus'])} daha çok hasar verir.",
            f"Every {p['every']}th shot deals {_percent(p['bonus'])}% more damage.",
        )
    if hook == "core_breaker":
        return (
            f"Çekirdeğe %{_percent(p['bonus'])} daha çok hasar verir.",
            f"Deals {_percent(p['bonus'])}% more damage to the Core.",
        )
    if hook == "armor_break":
        return (
            f"Hedefin savunma azaltımının %{_percent(p['ratio'])} kadarını yok sayar.",
            f"Ignores {_percent(p['ratio'])}% of the target's damage reduction.",
        )
    if hook == "free_shot":
        return (
            f"Her {p['every']}. atış enerji harcamaz ve modülü ısıtmaz.",
            f"Every {p['every']}th shot spends no energy and builds no heat.",
        )
    if hook == "kill_reload":
        extra_tr = f" O atış %{_percent(p['bonus'])} daha çok hasar verir." if p.get("bonus") else ""
        extra_en = f" That shot deals {_percent(p['bonus'])}% more damage." if p.get("bonus") else ""
        return (
            "Bir modülü yok ettiğinde beklemeden yeniden ateş eder." + extra_tr,
            "After destroying a module it fires again without waiting." + extra_en,
        )
    if hook == "first_strike":
        return (
            f"Yerleştikten sonraki ilk atışı ve her yok edişten sonraki ilk atışı %{_percent(p['bonus'])} daha çok hasar verir.",
            f"Its first shot after deployment and the first shot after each kill deal {_percent(p['bonus'])}% more damage.",
        )
    if hook == "last_stand":
        return (
            f"CAN'ı %{_percent(p['threshold'])} altına düşünce aldığı hasar %{_percent(p['reduction'])} azalır.",
            f"Below {_percent(p['threshold'])}% HP it takes {_percent(p['reduction'])}% less damage.",
        )
    if hook == "thorns":
        return (
            f"Aldığı hasarın %{_percent(p['ratio'])} kadarını saldıran modüle geri verir.",
            f"Returns {_percent(p['ratio'])}% of the damage it takes to the attacking module.",
        )
    if hook == "death_ward":
        return (
            f"Yok olduğunda devredeki diğer modülleri {int(p['amount'])} CAN onarır.",
            f"When destroyed, repairs every other module in the circuit by {int(p['amount'])} HP.",
        )
    if hook == "periodic_block":
        return (
            f"Her {_seconds(p['period_ms'])} saniyede bir, gelen bir vuruşu tamamen engeller.",
            f"Every {_seconds_en(p['period_ms'])} sec it fully blocks one incoming hit.",
        )
    if hook == "fortify":
        return (
            f"Yerleştikten sonraki {_seconds(p['window_ms'])} saniye boyunca %{_percent(p['reduction'])} daha az hasar alır.",
            f"For {_seconds_en(p['window_ms'])} sec after deployment it takes {_percent(p['reduction'])}% less damage.",
        )
    if hook == "pulse_window":
        return (
            f"Her {_seconds(p['period_ms'])} saniyede bir {_seconds(p['window_ms'])} saniye boyunca etkisi %{_percent(p['bonus'])} artar.",
            f"Every {_seconds_en(p['period_ms'])} sec, for {_seconds_en(p['window_ms'])} sec, its effect rises by {_percent(p['bonus'])}%.",
        )
    if hook == "current_tap":
        return (
            f"Her {_seconds(p['period_ms'])} saniyede bir +1 Akım kazandırır.",
            f"Grants +1 Current every {_seconds_en(p['period_ms'])} sec.",
        )
    if hook == "deploy_repair":
        return (
            f"Yerleştiği anda devredeki diğer modülleri {int(p['amount'])} CAN onarır.",
            f"On deployment, repairs every other module in the circuit by {int(p['amount'])} HP.",
        )
    if hook == "death_current":
        return (
            f"Yok olduğunda +{int(p['amount'])} Akım kazandırır.",
            f"When destroyed, grants +{int(p['amount'])} Current.",
        )
    if hook == "shock":
        return (
            f"Sabotajı hedefe ayrıca {int(p['amount'])} hasar verir.",
            f"Its sabotage also deals {int(p['amount'])} damage to the target.",
        )
    raise ValueError(f"Bilinmeyen yetenek kancası: {hook}")


def _mastered(hook: str, params: dict) -> dict:
    """Ustalık seçilince kancanın güçlenen hali."""
    p = dict(params)
    if hook in {"splash_window", "armor_break", "thorns"}:
        p["ratio"] = min(0.9, round(p["ratio"] * MASTERY_MULTIPLIER, 4))
    elif hook in {"execute", "nth_shot", "core_breaker", "first_strike", "pulse_window"}:
        p["bonus"] = round(p["bonus"] * MASTERY_MULTIPLIER, 4)
    elif hook == "free_shot":
        p["every"] = max(2, int(p["every"]) - 1)
    elif hook == "kill_reload":
        p["bonus"] = KILL_RELOAD_MASTERY_BONUS
    elif hook == "last_stand":
        p["reduction"] = min(0.75, round(p["reduction"] * MASTERY_MULTIPLIER, 4))
    elif hook in {"death_ward", "deploy_repair", "shock"}:
        p["amount"] = int(round(p["amount"] * MASTERY_MULTIPLIER))
    elif hook in {"periodic_block", "current_tap"}:
        p["period_ms"] = int(round(p["period_ms"] / MASTERY_MULTIPLIER / 100.0) * 100)
    elif hook == "fortify":
        p["window_ms"] = int(round(p["window_ms"] * MASTERY_MULTIPLIER))
    elif hook == "death_current":
        p["amount"] = int(p["amount"]) + 1
    return p


def _signature(hook: str, name_tr: str, name_en: str, **params) -> dict:
    _describe(hook, params)  # tanım hatasını içe aktarmada yakalar
    return {"hook": hook, "name_tr": name_tr, "name_en": name_en, "params": params}


# Modül → (sol dal, sağ dal). Laser'in sol dalı kullanıcının kendi örneğidir.
MODULE_SIGNATURES: dict[str, tuple[dict, dict]] = {
    # --- Saldırı --------------------------------------------------------------
    "laser": (
        _signature("splash_window", "Yayılım Işını", "Spreading Beam", period_ms=30_000, window_ms=5_000, ratio=0.30),
        _signature("execute", "Bitirici Işın", "Finishing Beam", threshold=0.35, bonus=0.25),
    ),
    "pulse_cannon": (
        _signature("nth_shot", "Üçüncü Darbe", "Third Pulse", every=3, bonus=0.60),
        _signature("armor_break", "Zırh Kıran", "Armor Breaker", ratio=0.30),
    ),
    "missile_launcher": (
        _signature("core_breaker", "Çekirdek Avcısı", "Core Hunter", bonus=0.30),
        _signature("kill_reload", "Seri Fırlatma", "Rapid Launch"),
    ),
    "arc_cannon": (
        _signature("splash_window", "Fırtına Arkı", "Storm Arc", period_ms=20_000, window_ms=4_000, ratio=0.35),
        _signature("free_shot", "Süper İletken", "Superconductor", every=4),
    ),
    "drone_bay": (
        _signature("execute", "Avcı Sürü", "Hunter Swarm", threshold=0.40, bonus=0.30),
        _signature("free_shot", "Otonom Dronlar", "Autonomous Drones", every=5),
    ),
    "railgun": (
        _signature("first_strike", "İlk Kurşun", "First Round", bonus=0.50),
        _signature("core_breaker", "Çekirdek Delici", "Core Piercer", bonus=0.35),
    ),
    "plasma_mortar": (
        _signature("splash_window", "Plazma Yağmuru", "Plasma Rain", period_ms=25_000, window_ms=6_000, ratio=0.30),
        _signature("nth_shot", "Yoğun Plazma", "Dense Plasma", every=3, bonus=0.50),
    ),
    "quantum_repeater": (
        _signature("execute", "Kuantum İnfaz", "Quantum Execution", threshold=0.30, bonus=0.35),
        _signature("kill_reload", "Kuantum Sıçrama", "Quantum Leap"),
    ),
    "swarm_fabricator": (
        _signature("free_shot", "Kendini Üreten Sürü", "Self-Building Swarm", every=3),
        _signature("armor_break", "Delici Sürü", "Piercing Swarm", ratio=0.25),
    ),
    "ion_spear": (
        _signature("first_strike", "İyon Açılışı", "Ion Opening", bonus=0.60),
        _signature("nth_shot", "Aşırı Yüklü Mızrak", "Overcharged Spear", every=4, bonus=0.80),
    ),
    "quantum_cannon": (
        _signature("core_breaker", "Tekil Vuruş", "Singular Strike", bonus=0.40),
        _signature("splash_window", "Kuantum Şok Dalgası", "Quantum Shockwave", period_ms=30_000, window_ms=5_000, ratio=0.40),
    ),
    # --- Savunma --------------------------------------------------------------
    "shield": (
        _signature("periodic_block", "Tam Blok", "Full Block", period_ms=12_000),
        _signature("thorns", "Geri Tepen Kalkan", "Recoil Shield", ratio=0.15),
    ),
    "armor": (
        _signature("last_stand", "Son Katman", "Last Layer", threshold=0.40, reduction=0.30),
        _signature("death_ward", "Parçalanan Zırh", "Shattering Armor", amount=25),
    ),
    "barrier": (
        _signature("fortify", "Taze Bariyer", "Fresh Barrier", window_ms=8_000, reduction=0.40),
        _signature("thorns", "Elektrikli Bariyer", "Charged Barrier", ratio=0.20),
    ),
    "reflector": (
        _signature("thorns", "Odaklı Yansıma", "Focused Reflection", ratio=0.25),
        _signature("periodic_block", "Ayna Anı", "Mirror Moment", period_ms=10_000),
    ),
    "guardian_dome": (
        _signature("death_ward", "Son Kubbe", "Final Dome", amount=30),
        _signature("last_stand", "Sıkışan Kubbe", "Tightening Dome", threshold=0.50, reduction=0.25),
    ),
    "phase_armor": (
        _signature("fortify", "Faz Girişi", "Phase Entry", window_ms=10_000, reduction=0.50),
        _signature("periodic_block", "Ek Faz", "Extra Phase", period_ms=9_000),
    ),
    "prism_shield": (
        _signature("thorns", "Prizma Kırılması", "Prism Refraction", ratio=0.18),
        _signature("last_stand", "Yoğun Prizma", "Dense Prism", threshold=0.40, reduction=0.35),
    ),
    # --- Destek ---------------------------------------------------------------
    "repair": (
        _signature("pulse_window", "Acil Onarım", "Emergency Repair", period_ms=20_000, window_ms=5_000, bonus=0.60),
        _signature("deploy_repair", "Saha Kurulumu", "Field Setup", amount=20),
    ),
    "cooler": (
        _signature("pulse_window", "Derin Dondurma", "Deep Freeze", period_ms=18_000, window_ms=5_000, bonus=0.80),
        _signature("current_tap", "Isı Geri Kazanımı", "Heat Recovery", period_ms=20_000),
    ),
    "amplifier": (
        _signature("pulse_window", "Rezonans Dalgası", "Resonance Wave", period_ms=20_000, window_ms=6_000, bonus=0.50),
        _signature("death_current", "Son Yük", "Final Charge", amount=2),
    ),
    "targeting_computer": (
        _signature("pulse_window", "Kilitlenme Modu", "Lock-On Mode", period_ms=20_000, window_ms=6_000, bonus=0.50),
        _signature("fortify", "Sağlam Kurulum", "Hardened Setup", window_ms=10_000, reduction=0.50),
    ),
    "nano_medic": (
        _signature("deploy_repair", "Nano Bulut", "Nano Cloud", amount=15),
        _signature("pulse_window", "Yoğun Bakım", "Intensive Care", period_ms=20_000, window_ms=5_000, bonus=0.60),
    ),
    "overclock_unit": (
        _signature("pulse_window", "Tavan Devri", "Redline", period_ms=16_000, window_ms=4_000, bonus=0.60),
        _signature("death_current", "Enerji Boşalımı", "Energy Dump", amount=2),
    ),
    "chrono_relay": (
        _signature("current_tap", "Zaman Kârı", "Time Dividend", period_ms=18_000),
        _signature("pulse_window", "Derin Zaman", "Deep Time", period_ms=20_000, window_ms=5_000, bonus=0.50),
    ),
    "precision_matrix": (
        _signature("pulse_window", "Keskin Odak", "Sharp Focus", period_ms=20_000, window_ms=6_000, bonus=0.60),
        _signature("last_stand", "Korunan Matris", "Guarded Matrix", threshold=0.50, reduction=0.30),
    ),
    "phoenix_repair": (
        _signature("death_ward", "Son Kıvılcım", "Last Ember", amount=30),
        _signature("deploy_repair", "Anka Girişi", "Phoenix Arrival", amount=25),
    ),
    "omega_amplifier": (
        _signature("pulse_window", "Omega Tepe Noktası", "Omega Peak", period_ms=24_000, window_ms=6_000, bonus=0.60),
        _signature("current_tap", "Omega Akımı", "Omega Current", period_ms=20_000),
    ),
    # --- Sabotaj --------------------------------------------------------------
    "emp": (
        _signature("shock", "Şok Darbesi", "Shock Pulse", amount=12),
        _signature("pulse_window", "Uzun Dalga", "Long Wave", period_ms=24_000, window_ms=8_000, bonus=0.40),
    ),
    "jammer": (
        _signature("shock", "Parazit Yükü", "Static Load", amount=10),
        _signature("current_tap", "Sinyal Hırsızı", "Signal Thief", period_ms=22_000),
    ),
    "virus": (
        _signature("pulse_window", "Mutasyon", "Mutation", period_ms=20_000, window_ms=6_000, bonus=0.50),
        _signature("shock", "Zararlı Yük", "Malicious Payload", amount=14),
    ),
    "disruptor": (
        _signature("shock", "Kesik Akım", "Cut Current", amount=16),
        _signature("pulse_window", "Geniş Kesinti", "Wide Outage", period_ms=24_000, window_ms=8_000, bonus=0.40),
    ),
    "singularity_projector": (
        _signature("shock", "Çöküş", "Collapse", amount=20),
        _signature("pulse_window", "Olay Ufku", "Event Horizon", period_ms=26_000, window_ms=8_000, bonus=0.45),
    ),
    # --- Sistem ---------------------------------------------------------------
    "battery": (
        _signature("pulse_window", "Güç Dalgası", "Power Surge", period_ms=20_000, window_ms=5_000, bonus=0.40),
        _signature("current_tap", "Akım Dönüştürücü", "Current Converter", period_ms=25_000),
    ),
    "capacitor": (
        _signature("death_current", "Acil Boşalım", "Emergency Discharge", amount=3),
        _signature("pulse_window", "Hızlı Dolum", "Fast Charge", period_ms=18_000, window_ms=5_000, bonus=0.50),
    ),
    "current_balancer": (
        _signature("current_tap", "Akım Geri Kazanımı", "Current Recovery", period_ms=20_000),
        _signature("pulse_window", "Dengeli Tepe", "Balanced Peak", period_ms=20_000, window_ms=6_000, bonus=0.50),
    ),
}


def _choice(choice_id: str, name_tr: str, name_en: str, description_tr: str, description_en: str, **extra) -> dict:
    return {"id": choice_id, "name_tr": name_tr, "name_en": name_en,
            "description_tr": description_tr, "description_en": description_en, **extra}


def module_talent_tree(module_id: str, category: str, rarity: str, has_cooldown: bool) -> tuple[dict, ...]:
    """Bir modülün dört yetenek eşiği (koleksiyon görünümü ve seçim doğrulaması)."""
    levels = TALENT_LEVELS[rarity]
    power = BASIC_POWER_COPY[category]
    left, right = MODULE_SIGNATURES[module_id]

    def signature_choice(choice_id: str, spec: dict) -> dict:
        description_tr, description_en = _describe(spec["hook"], spec["params"])
        return _choice(choice_id, spec["name_tr"], spec["name_en"], description_tr, description_en, hook=spec["hook"])

    def mastery_copy() -> tuple[str, str]:
        parts_tr, parts_en = [], []
        for spec in (left, right):
            description_tr, description_en = _describe(spec["hook"], _mastered(spec["hook"], spec["params"]))
            parts_tr.append(f"{spec['name_tr']}: {description_tr}")
            parts_en.append(f"{spec['name_en']}: {description_en}")
        return (
            "2. eşikte seçtiğin imza yeteneğini güçlendirir. " + " ".join(parts_tr),
            "Strengthens the signature talent you picked at the 2nd threshold. " + " ".join(parts_en),
        )

    mastery_tr, mastery_en = mastery_copy()
    tuning_left = (
        _choice(CHOICE_LEFT, "Hız: bekleme −%4", "Speed: cooldown −4%",
                "Bu modülün bekleme süresini kalıcı olarak %4 kısaltır.",
                "Permanently shortens this module's cooldown by 4%.")
        if has_cooldown else
        _choice(CHOICE_LEFT, "Yoğunluk: etki +%4", "Intensity: effect +4%",
                "Bu modülün etkisini kalıcı olarak %4 artırır.",
                "Permanently increases this module's effect by 4%.")
    )
    return (
        {"tier": TIER_BASIC, "level": levels[0], "flux_cost": TALENT_FLUX_COSTS[0], "kind": "basic", "choices": [
            _choice(CHOICE_LEFT, power[0], power[1], power[2], power[3]),
            _choice(CHOICE_RIGHT, "CAN +%5", "HP +5%",
                    "Bu modülün azami CAN değerini kalıcı olarak %5 artırır.",
                    "Permanently increases this module's max HP by 5%."),
        ]},
        {"tier": TIER_SIGNATURE, "level": levels[1], "flux_cost": TALENT_FLUX_COSTS[1], "kind": "signature", "choices": [
            signature_choice(CHOICE_LEFT, left),
            signature_choice(CHOICE_RIGHT, right),
        ]},
        {"tier": TIER_TUNING, "level": levels[2], "flux_cost": TALENT_FLUX_COSTS[2], "kind": "tuning", "choices": [
            tuning_left,
            _choice(CHOICE_RIGHT, "Verim: enerji −%12", "Efficiency: energy −12%",
                    "Bu modülün enerji tüketimini kalıcı olarak %12 azaltır.",
                    "Permanently reduces this module's energy use by 12%."),
        ]},
        {"tier": TIER_MASTERY, "level": levels[3], "flux_cost": TALENT_FLUX_COSTS[3], "kind": "mastery", "choices": [
            _choice(CHOICE_LEFT, "İmza Ustalığı", "Signature Mastery", mastery_tr, mastery_en),
            _choice(CHOICE_RIGHT, "CAN +%8", "HP +8%",
                    "Bu modülün azami CAN değerini kalıcı olarak %8 artırır.",
                    "Permanently increases this module's max HP by 8%."),
        ]},
    )


def stat_modifiers(talents: dict | None, has_cooldown: bool) -> dict[str, float]:
    """Seçilen dalların sayısal etkisi (imza yeteneği burada yer almaz)."""
    picks = dict(talents or {})
    tuning = picks.get(TIER_TUNING)
    return {
        "power": 1 + BASIC_POWER_BONUS * (picks.get(TIER_BASIC) == CHOICE_LEFT),
        "hp": (1 + BASIC_HP_BONUS * (picks.get(TIER_BASIC) == CHOICE_RIGHT))
        * (1 + MASTERY_HP_BONUS * (picks.get(TIER_MASTERY) == CHOICE_RIGHT)),
        "cooldown": TUNING_COOLDOWN_MULTIPLIER if tuning == CHOICE_LEFT and has_cooldown else 1.0,
        "effect": 1 + TUNING_EFFECT_BONUS * (tuning == CHOICE_LEFT and not has_cooldown),
        "energy": TUNING_ENERGY_MULTIPLIER if tuning == CHOICE_RIGHT else 1.0,
    }


def module_signature(module_id: str, talents: dict | None) -> dict | None:
    """Oyuncunun seçtiği imza yeteneği; ustalık seçildiyse güçlenmiş haliyle."""
    picks = dict(talents or {})
    choice = picks.get(TIER_SIGNATURE)
    pair = MODULE_SIGNATURES.get(module_id)
    if pair is None or choice not in (CHOICE_LEFT, CHOICE_RIGHT):
        return None
    spec = pair[0] if choice == CHOICE_LEFT else pair[1]
    mastered = picks.get(TIER_MASTERY) == CHOICE_LEFT
    params = _mastered(spec["hook"], spec["params"]) if mastered else dict(spec["params"])
    return {"hook": spec["hook"], "name_tr": spec["name_tr"], "name_en": spec["name_en"],
            "mastered": mastered, **params}


def default_ai_talents(module_id: str, rarity: str, upgrade_level: int) -> dict[str, str]:
    """AI rakip, ulaştığı eşiklerde modül kimliğine bağlı kararlı bir dal seçer."""
    level = int(upgrade_level) + 1
    seed = sum(ord(character) for character in module_id)
    picks: dict[str, str] = {}
    for index, threshold in enumerate(TALENT_LEVELS[rarity]):
        if level < threshold:
            continue
        tier = str(index)
        # Ustalık imza yeteneğini güçlendirir; AI onu her zaman seçer.
        picks[tier] = CHOICE_LEFT if tier == TIER_MASTERY or (seed + index) % 2 == 0 else CHOICE_RIGHT
    return picks


# --- Çekirdek yetenekleri (D12) -------------------------------------------------
# Çekirdek üç eşikte (seviye 5, 9, 13) iki daldan birini seçer. Kayıtlı seçimler
# bozulmasın diye kimlikler eskisi gibidir: "<eşik>_energy" sol dal,
# "<eşik>_charge" sağ dal. Eski düz artışların (enerji +%3, dolum +%3) yerini
# çekirdeğe özel kurallar aldı; her çekirdeğin altı yeteneği birbirinden farklıdır.
CORE_TALENT_LEVELS = (5, 9, 13)
CORE_TALENT_FLUX_COSTS = (25, 50, 75)
CORE_SLOT_LEFT = "energy"
CORE_SLOT_RIGHT = "charge"


def _core_describe(hook: str, p: dict) -> tuple[str, str]:
    if hook == "opening_charge":
        return (
            f"Savaşa %{int(p['amount'])} güç dolumuyla başlar.",
            f"Starts the battle with {int(p['amount'])}% power charge.",
        )
    if hook == "kill_charge":
        return (
            f"Yok edilen her rakip modül güç dolumuna %{int(p['amount'])} ekler.",
            f"Each enemy module destroyed adds {int(p['amount'])}% power charge.",
        )
    if hook == "loss_charge":
        return (
            f"Yok olan her dost modül güç dolumuna %{int(p['amount'])} ekler.",
            f"Each friendly module destroyed adds {int(p['amount'])}% power charge.",
        )
    if hook == "power_echo":
        return (
            f"Güç kullanıldıktan sonra dolum sıfırdan değil %{int(p['amount'])} dolumdan başlar.",
            f"After the power is used, charging restarts at {int(p['amount'])}% instead of zero.",
        )
    if hook == "power_current":
        return (
            f"Güç kullanıldığında +{int(p['amount'])} Akım kazandırır.",
            f"Using the power grants +{int(p['amount'])} Current.",
        )
    if hook == "emergency_shield":
        return (
            f"Çekirdek CAN değeri ilk kez %{_percent(p['threshold'])} altına düştüğünde "
            f"{_seconds(p['duration_ms'])} saniyeliğine {int(p['amount'])} kalkan kazanır (maçta bir kez).",
            f"The first time the Core drops below {_percent(p['threshold'])}% HP it gains a "
            f"{int(p['amount'])} HP shield for {_seconds_en(p['duration_ms'])} sec (once per battle).",
        )
    if hook == "thorned_core":
        return (
            f"Çekirdeğe vuran her saldırı, saldıran modüle {int(p['amount'])} hasar verir.",
            f"Every attack that hits the Core deals {int(p['amount'])} damage to the attacking module.",
        )
    if hook == "surplus_reactor":
        return (
            f"Çekirdek CAN değeri %{_percent(p['threshold'])} ve üstündeyken enerji üretimi %{_percent(p['bonus'])} artar.",
            f"While the Core is at {_percent(p['threshold'])}% HP or more, energy generation rises by {_percent(p['bonus'])}%.",
        )
    if hook == "overtime_resolve":
        return (
            f"Uzatmada Çekirdek %{_percent(p['reduction'])} daha az hasar alır.",
            f"In overtime the Core takes {_percent(p['reduction'])}% less damage.",
        )
    raise ValueError(f"Bilinmeyen çekirdek yeteneği kancası: {hook}")


def _core_talent(hook: str, name_tr: str, name_en: str, **params) -> dict:
    _core_describe(hook, params)
    return {"hook": hook, "name_tr": name_tr, "name_en": name_en, "params": params}


# Çekirdek → üç eşik → (sol dal, sağ dal).
CORE_TALENTS: dict[str, tuple[tuple[dict, dict], ...]] = {
    "core_resonance": (
        (_core_talent("surplus_reactor", "Kararlı Frekans", "Stable Frequency", threshold=0.70, bonus=0.10),
         _core_talent("opening_charge", "Hazır Rezonans", "Primed Resonance", amount=25)),
        (_core_talent("loss_charge", "Derin Rezonans", "Deep Resonance", amount=12),
         _core_talent("power_echo", "İkinci Darbe", "Second Pulse", amount=20)),
        (_core_talent("emergency_shield", "Koruyucu Yankı", "Guarding Echo", threshold=0.40, amount=60, duration_ms=6_000),
         _core_talent("power_current", "Akım Rezonansı", "Current Resonance", amount=2)),
    ),
    "core_guardian": (
        (_core_talent("thorned_core", "Dikenli Kabuk", "Thorned Shell", amount=4),
         _core_talent("opening_charge", "Nöbet Hazırlığı", "Watch Ready", amount=20)),
        (_core_talent("emergency_shield", "Bariyer Tohumu", "Barrier Seed", threshold=0.50, amount=70, duration_ms=6_000),
         _core_talent("loss_charge", "Kalkan Matrisi", "Shield Matrix", amount=15)),
        (_core_talent("overtime_resolve", "Son Direniş", "Last Resistance", reduction=0.20),
         _core_talent("power_echo", "Kesintisiz Nöbet", "Unbroken Watch", amount=25)),
    ),
    "core_overdrive": (
        (_core_talent("opening_charge", "Sıcak Başlangıç", "Hot Start", amount=30),
         _core_talent("surplus_reactor", "Yüksek Devir", "High Rev", threshold=0.70, bonus=0.10)),
        (_core_talent("kill_charge", "Enerji Sıçraması", "Energy Surge", amount=12),
         _core_talent("power_current", "Akım Patlaması", "Current Burst", amount=2)),
        (_core_talent("power_echo", "Kırmızı Hat", "Redline", amount=25),
         _core_talent("thorned_core", "Kızgın Çekirdek", "Scorching Core", amount=5)),
    ),
    "core_disruptor": (
        (_core_talent("loss_charge", "Statik Alan", "Static Field", amount=12),
         _core_talent("opening_charge", "Pusu", "Ambush", amount=25)),
        (_core_talent("power_echo", "Sinyal Kırılması", "Signal Break", amount=20),
         _core_talent("kill_charge", "Zincirleme Arıza", "Cascading Failure", amount=10)),
        (_core_talent("overtime_resolve", "Karartma", "Blackout", reduction=0.20),
         _core_talent("power_current", "Çalınan Akım", "Stolen Current", amount=2)),
    ),
    "core_capacitor": (
        (_core_talent("surplus_reactor", "Yedek Hücre", "Reserve Cell", threshold=0.70, bonus=0.12),
         _core_talent("power_current", "Deşarj Kazancı", "Discharge Gain", amount=2)),
        (_core_talent("opening_charge", "Hızlı Dolum", "Fast Charge", amount=25),
         _core_talent("emergency_shield", "Statik Kalkan", "Static Shield", threshold=0.40, amount=60, duration_ms=6_000)),
        (_core_talent("power_echo", "Taşma", "Overflow", amount=25),
         _core_talent("loss_charge", "Geri Besleme", "Feedback", amount=15)),
    ),
    "core_phoenix": (
        (_core_talent("emergency_shield", "Kor", "Ember", threshold=0.40, amount=60, duration_ms=6_000),
         _core_talent("loss_charge", "Küllerin Gücü", "Strength of Ashes", amount=12)),
        (_core_talent("power_echo", "Yeniden Doğuş", "Rebirth", amount=20),
         _core_talent("surplus_reactor", "Sıcak Yuva", "Warm Nest", threshold=0.70, bonus=0.10)),
        (_core_talent("overtime_resolve", "Güneş Kanadı", "Solar Wing", reduction=0.20),
         _core_talent("opening_charge", "Erken Kıvılcım", "Early Spark", amount=25)),
    ),
    "core_quantum": (
        (_core_talent("kill_charge", "Faz Tohumu", "Phase Seed", amount=10),
         _core_talent("opening_charge", "Hazır Faz", "Ready Phase", amount=20)),
        (_core_talent("power_current", "Olasılık Bükümü", "Probability Bend", amount=2),
         _core_talent("thorned_core", "Kuantum Tepkisi", "Quantum Backlash", amount=4)),
        (_core_talent("power_echo", "Tekillik", "Singularity", amount=25),
         _core_talent("emergency_shield", "Faz Kalkanı", "Phase Shield", threshold=0.40, amount=70, duration_ms=6_000)),
    ),
}


def core_skill_tree(core_type: str) -> tuple[dict, ...]:
    """Çekirdeğin altı yeteneği (üç eşik × iki dal); koleksiyon görünümü ve seçim."""
    skills: list[dict] = []
    for tier, pair in enumerate(CORE_TALENTS[core_type]):
        for slot, spec in zip((CORE_SLOT_LEFT, CORE_SLOT_RIGHT), pair, strict=True):
            description_tr, description_en = _core_describe(spec["hook"], spec["params"])
            skills.append({
                "id": f"{tier}_{slot}", "tier": str(tier), "level": CORE_TALENT_LEVELS[tier],
                "flux_cost": CORE_TALENT_FLUX_COSTS[tier], "hook": spec["hook"],
                "name_tr": spec["name_tr"], "name_en": spec["name_en"],
                "description_tr": description_tr, "description_en": description_en,
            })
    return tuple(skills)


def core_talents(core_type: str, core_skills) -> dict[str, dict]:
    """Oyuncunun seçtiği çekirdek yetenekleri: kanca → değerler."""
    tiers = CORE_TALENTS.get(str(core_type))
    if not tiers:
        return {}
    chosen: dict[str, dict] = {}
    for skill_id in core_skills or ():
        tier, _, slot = str(skill_id).partition("_")
        if not tier.isdigit() or int(tier) >= len(tiers) or slot not in (CORE_SLOT_LEFT, CORE_SLOT_RIGHT):
            continue
        spec = tiers[int(tier)][0 if slot == CORE_SLOT_LEFT else 1]
        chosen[spec["hook"]] = {**spec["params"], "name_tr": spec["name_tr"], "name_en": spec["name_en"]}
    return chosen


def core_generation_multiplier(core_type: str, core_skills, core_hp_ratio: float) -> float:
    """Çekirdek enerji üretimine yetenekten gelen çarpan."""
    reactor = core_talents(core_type, core_skills).get("surplus_reactor")
    if reactor and core_hp_ratio >= float(reactor["threshold"]):
        return 1 + float(reactor["bonus"])
    return 1.0
