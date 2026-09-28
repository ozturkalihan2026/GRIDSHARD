from .catalog import PLAYER_SELECTABLE_MODULE_IDS, get_module_definition
from ..arena_canon import STARTER_IDS
from .models import BattlePool


BATTLE_POOL_SIZE = 6
DECK_EXCLUDED_MODULE_IDS = frozenset({"core"})
DEFAULT_BATTLE_POOL_IDS = STARTER_IDS
ATTACK_CATEGORY = "saldırı"


def _is_attack_card(module_id: str) -> bool:
    return get_module_definition(module_id).category == ATTACK_CATEGORY


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

    # Sabotaj Çekirdeği hedefleyemez; saldırısız deste maçı hiç bitiremez.
    if not any(_is_attack_card(module_id) for module_id in module_ids):
        raise BattlePoolValidationError(
            "Savaş Destesi en az bir saldırı kartı içermelidir."
        )

    return BattlePool(module_definition_ids=module_ids)


def default_battle_pool() -> BattlePool:
    return validate_battle_pool(DEFAULT_BATTLE_POOL_IDS)


def migrate_battle_pool(
    module_definition_ids: list[str] | tuple[str, ...] | None,
) -> BattlePool:
    """Kayıtlı desteyi geçerli altılı desteye indirger; kaldırılmış kartları atıp varsayılanla tamamlar."""
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
    if not any(_is_attack_card(module_id) for module_id in selected):
        # Eski kayıtlı saldırısız desteler ilk varsayılan saldırı kartını alır.
        attack = next(module_id for module_id in DEFAULT_BATTLE_POOL_IDS if _is_attack_card(module_id))
        selected[-1] = attack
    return validate_battle_pool(selected)
