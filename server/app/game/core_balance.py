"""Canonical rarity curve shared by Core UI and live battle systems.

Core rarity used to affect unlock speed only.  These deliberately bounded
multipliers make the slower-to-obtain Core types stronger without allowing a
single legendary active power to decide an otherwise healthy battle.
"""

CORE_RARITY_BY_TYPE = {
    "core_resonance": "common",
    "core_guardian": "rare",
    "core_overdrive": "rare",
    "core_disruptor": "epic",
    "core_capacitor": "epic",
    "core_phoenix": "legendary",
    "core_quantum": "legendary",
}

CORE_RARITY_PROFILES = {
    "common": {"hp": 1.00, "effect": 1.00, "energy": 1.00, "charge": 1.00},
    "rare": {"hp": 1.08, "effect": 1.10, "energy": 1.04, "charge": 1.03},
    "epic": {"hp": 1.18, "effect": 1.24, "energy": 1.08, "charge": 1.06},
    "legendary": {"hp": 1.30, "effect": 1.40, "energy": 1.12, "charge": 1.10},
}


def core_rarity(core_type: str) -> str:
    return CORE_RARITY_BY_TYPE.get(str(core_type), "common")


def core_rarity_profile(core_type: str) -> dict[str, float]:
    return dict(CORE_RARITY_PROFILES[core_rarity(core_type)])
