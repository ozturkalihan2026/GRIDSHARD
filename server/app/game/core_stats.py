"""Shared core durability for the battle engine and collection preview."""

CORE_BASE_HP = 300
CORE_HP_PER_LEVEL = 1.08


def core_max_hp(level: int) -> int:
    level = max(1, min(15, int(level)))
    return round(CORE_BASE_HP * CORE_HP_PER_LEVEL ** (level - 1))
