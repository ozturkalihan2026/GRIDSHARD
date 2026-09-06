from .catalog import PLAYER_SELECTABLE_MODULE_IDS
from ..arena_canon import STARTER_IDS
from .models import BattlePool


BATTLE_POOL_SIZE = 6
DECK_EXCLUDED_MODULE_IDS = frozenset({"core", "generator"})
DEFAULT_BATTLE_POOL_IDS = STARTER_IDS


class BattlePoolValidationError(ValueError):
    pass


def validate_battle_pool(module_definition_ids: list[str] | tuple[str, ...]) -> BattlePool:
    module_ids = tuple(module_definition_ids)

    if len(module_ids) != BATTLE_POOL_SIZE:
        raise BattlePoolValidationError(
            f"Savaş Havuzu tam olarak {BATTLE_POOL_SIZE} modül içermelidir."
        )

    if len(set(module_ids)) != BATTLE_POOL_SIZE:
        raise BattlePoolValidationError(
            "Savaş Havuzu aynı modülü birden fazla kez içeremez."
        )

    selectable = set(PLAYER_SELECTABLE_MODULE_IDS) - DECK_EXCLUDED_MODULE_IDS
    invalid = [module_id for module_id in module_ids if module_id not in selectable]
    if invalid:
        raise BattlePoolValidationError(
            "Savaş Havuzu yalnızca oyuncu-seçilebilir modüllerden oluşabilir: "
            + ", ".join(sorted(invalid))
        )

    return BattlePool(module_definition_ids=module_ids)


def default_battle_pool() -> BattlePool:
    return validate_battle_pool(DEFAULT_BATTLE_POOL_IDS)


def migrate_battle_pool(
    module_definition_ids: list[str] | tuple[str, ...] | None,
) -> BattlePool:
    """Project legacy 18-card pools to a valid six-card deck without data loss."""
    selectable = set(PLAYER_SELECTABLE_MODULE_IDS) - DECK_EXCLUDED_MODULE_IDS
    selected: list[str] = []
    for module_id in module_definition_ids or ():
        clean = str(module_id)
        if clean in selectable and clean not in selected:
            selected.append(clean)
        if len(selected) == BATTLE_POOL_SIZE:
            break
    for module_id in DEFAULT_BATTLE_POOL_IDS:
        if len(selected) >= BATTLE_POOL_SIZE:
            break
        if module_id not in selected:
            selected.append(module_id)
        if len(selected) == BATTLE_POOL_SIZE:
            break
    return validate_battle_pool(selected)
