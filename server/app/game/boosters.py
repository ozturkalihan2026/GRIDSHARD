from .models import BoosterDefinition

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
}

def get_booster_definition(booster_id: str) -> BoosterDefinition:
    try:
        return BOOSTER_DEFINITIONS[booster_id]
    except KeyError as exc:
        raise ValueError(f"Bilinmeyen güçlendirici: {booster_id}") from exc
