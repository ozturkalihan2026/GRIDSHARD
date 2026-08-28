from .models import BattleModule, BoosterDefinition, ModuleStatus
from .topology import effective_port_count

BOOSTER_DEFINITIONS: dict[str, BoosterDefinition] = {
    "overcharge_chip": BoosterDefinition(
        id="overcharge_chip",
        name_tr="Aşırı Yük Çipi",
        description_tr="Seçilen saldırı modülüne geçici saldırı artışı uygular.",
        duration_ms=15000,
        target_categories=("saldırı",),
        effect_data={"attack_multiplier": 1.25},
    ),
    "emergency_repair": BoosterDefinition(
        id="emergency_repair",
        name_tr="Acil Onarım",
        description_tr="Seçilen aktif modülü anlık olarak onarır.",
        duration_ms=0,
        effect_data={"instant_repair_ratio": 0.25},
    ),
    "dual_port_adapter": BoosterDefinition(
        id="dual_port_adapter",
        name_tr="Çift Port Adaptörü",
        description_tr="Seçilen modüle geçici ek port sağlar.",
        duration_ms=15000,
        effect_data={"extra_port_count": 1},
    ),
    "cooling_burst": BoosterDefinition(
        id="cooling_burst",
        name_tr="Soğutma Darbesi",
        description_tr="Seçilen aktif modülün ısısını sıfırlar.",
        duration_ms=0,
        effect_data={"reset_heat": True},
    ),
    "signal_cleanser": BoosterDefinition(
        id="signal_cleanser",
        name_tr="Sinyal Temizleyici",
        description_tr="Seçilen aktif modül üzerindeki geçici sabotaj etkilerini temizler.",
        duration_ms=0,
        effect_data={"cleanse_debuffs": True},
    ),
}

def get_booster_definition(booster_id: str) -> BoosterDefinition:
    try:
        return BOOSTER_DEFINITIONS[booster_id]
    except KeyError as exc:
        raise ValueError(f"Bilinmeyen güçlendirici: {booster_id}") from exc


def booster_target_rejection_reason(
    booster: BoosterDefinition,
    module: BattleModule,
) -> str | None:
    """Teklif tüketilmeden önce sunucudaki kanonik hedef doğrulaması."""
    if module.status != ModuleStatus.ACTIVE or module.hp <= 0:
        return "Güçlendirici yalnızca yaşayan aktif bir modüle uygulanabilir."
    if (
        booster.target_categories
        and module.definition.category not in booster.target_categories
    ):
        return f"{booster.name_tr}, {module.definition.name_tr} modülüne uygulanamaz."
    if booster.id == "emergency_repair" and module.hp >= module.definition.max_hp:
        return "Acil Onarım yalnızca hasar almış bir modüle uygulanabilir."
    if booster.id == "cooling_burst" and module.heat <= 0:
        return "Soğutma Darbesi yalnızca ısınmış bir modüle uygulanabilir."
    if booster.id == "signal_cleanser" and len(module.debuffs) == 0:
        return "Sinyal Temizleyici yalnızca sabotaj etkisi altındaki bir modüle uygulanabilir."
    if booster.id == "dual_port_adapter" and effective_port_count(module) >= 4:
        return "Çift Port Adaptörü dört portlu bir modüle uygulanamaz."
    if (
        booster.id == "overcharge_chip"
        and (
            module.definition.category != "saldırı"
            or module.definition.base_damage <= 0
        )
    ):
        return "Aşırı Yük Çipi yalnızca yaşayan bir saldırı modülüne uygulanabilir."
    return None
