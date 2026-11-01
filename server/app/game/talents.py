"""Stable paid tier IDs, costs and AI picks. Active module/core trees have one owner.

Old energy/heat hooks are intentionally not imported into current battles.
"""

TIER_BASIC = "0"


TIER_SIGNATURE = "1"


TIER_TUNING = "2"


TIER_MASTERY = "3"


CHOICE_LEFT = "power"


CHOICE_RIGHT = "resilience"


TALENT_LEVELS = {
    "common": (5, 8, 11, 14),
    "rare": (6, 9, 12, 15),
    "epic": (7, 10, 13, 15),
    "legendary": (8, 11, 14, 15),
}


TALENT_COSTS = {
    "common": ((1000, 0), (2000, 0), (4000, 0), (8000, 1000)),
    "rare": ((2000, 0), (4000, 0), (10000, 1000), (20000, 2000)),
    "epic": ((10000, 0), (20000, 1000), (30000, 2000), (40000, 3000)),
    "legendary": ((10000, 1000), (20000, 2000), (30000, 3000), (40000, 4000)),
}


CORE_TALENT_COSTS = {
    "common": ((2000, 0), (5000, 0), (10000, 1000)),
    "rare": ((4000, 0), (10000, 0), (20000, 2000)),
    "epic": ((10000, 0), (20000, 2000), (30000, 3000)),
    "legendary": ((20000, 2000), (30000, 3000), (40000, 4000)),
}


def talent_cost(rarity: str, threshold: int, *, core: bool = False) -> dict[str, int]:
    credits, flux = (CORE_TALENT_COSTS if core else TALENT_COSTS)[rarity][threshold]
    return {"circuit_credits_cost": credits, "flux_cost": flux}


def default_ai_talents(module_id: str, rarity: str, upgrade_level: int) -> dict[str, str]:
    """AI rakip, ulaştığı eşiklerde modül kimliğine bağlı kararlı bir dal seçer."""
    level = int(upgrade_level) + 1
    seed = sum(ord(character) for character in module_id)
    picks: dict[str, str] = {}
    for index, threshold in enumerate(TALENT_LEVELS[rarity]):
        if level < threshold:
            continue
        tier = str(index)
        # Ustalıkta iş gücü dalı; diğer eşiklerde kimliğe bağlı iki dal.
        picks[tier] = CHOICE_LEFT if tier == TIER_MASTERY or (seed + index) % 2 == 0 else CHOICE_RIGHT
    return picks


CORE_TALENT_LEVELS = (5, 9, 13)
