from dataclasses import dataclass
from .battle_pool import BattlePoolValidationError, validate_battle_pool
from .models import Direction

INITIAL_ACTIVE_MODULE_COUNT = 1

@dataclass(slots=True, frozen=True)
class InitialModulePlacement:
    instance_id: str
    definition_id: str
    x: int
    y: int
    direction: Direction = Direction.UP

@dataclass(slots=True, frozen=True)
class PvPSetupPayload:
    battle_pool_ids: tuple[str, ...]
    initial_modules: tuple[InitialModulePlacement, ...]

class PvPSetupValidationError(ValueError):
    pass

def validate_setup_payload(payload: PvPSetupPayload) -> None:
    try:
        pool = validate_battle_pool(payload.battle_pool_ids)
    except BattlePoolValidationError as exc:
        raise PvPSetupValidationError(str(exc)) from exc

    if len(payload.initial_modules) != INITIAL_ACTIVE_MODULE_COUNT:
        raise PvPSetupValidationError(
            f"Başlangıç devresi tam olarak {INITIAL_ACTIVE_MODULE_COUNT} aktif modül içermelidir."
        )

    instance_ids = [item.instance_id for item in payload.initial_modules]
    if len(instance_ids) != len(set(instance_ids)):
        raise PvPSetupValidationError(
            "Başlangıç modül örnek kimlikleri benzersiz olmalıdır."
        )

    definition_ids = [item.definition_id for item in payload.initial_modules]
    if definition_ids.count("core") != 1:
        raise PvPSetupValidationError(
            "Başlangıç devresinde tam bir Çekirdek bulunmalıdır."
        )
    for definition_id in definition_ids:
        if definition_id != "core":
            raise PvPSetupValidationError(
                "Başlangıç devresinde yalnızca Çekirdek bulunabilir: "
                f"{definition_id}"
            )
    from .board import get_default_board
    core = payload.initial_modules[0]
    position = get_default_board().core_position
    if (core.x, core.y) != (position.x, position.y):
        raise PvPSetupValidationError("Çekirdek 2. satır 3. hücrede olmalıdır.")
