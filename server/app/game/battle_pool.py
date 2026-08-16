from .catalog import PLAYER_SELECTABLE_MODULE_IDS
from .models import BattlePool


BATTLE_POOL_SIZE = 18


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

    selectable = set(PLAYER_SELECTABLE_MODULE_IDS)
    invalid = [module_id for module_id in module_ids if module_id not in selectable]
    if invalid:
        raise BattlePoolValidationError(
            "Savaş Havuzu yalnızca oyuncu-seçilebilir modüllerden oluşabilir: "
            + ", ".join(sorted(invalid))
        )

    return BattlePool(module_definition_ids=module_ids)


def default_battle_pool() -> BattlePool:
    return validate_battle_pool(PLAYER_SELECTABLE_MODULE_IDS[:BATTLE_POOL_SIZE])
