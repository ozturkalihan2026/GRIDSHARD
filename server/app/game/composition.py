"""Authoritative live-battle deck composition limits.

The six-card deck stays expressive, while repeated utility cards cannot fill
the whole circuit and turn a match into an unbreakable repair loop.
"""

from .models import BattleModule, ModuleDefinition, ModuleStatus, PlayerBattleState


UTILITY_CATEGORIES = frozenset({"savunma", "destek", "enerji", "sabotaj"})
CATEGORY_ACTIVE_LIMITS = {
    "savunma": 3,
    "destek": 3,
    "enerji": 3,
    "sabotaj": 3,
}
MAX_ACTIVE_UTILITY_COPIES_PER_DEFINITION = 2
UTILITY_LEAD_OVER_ATTACK = 2


def active_deployable_modules(player: PlayerBattleState) -> tuple[BattleModule, ...]:
    return tuple(
        module
        for module in player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.hp > 0
        and module.definition.id not in {"core", "generator"}
    )


def deployment_rejection_reason(
    player: PlayerBattleState,
    definition: ModuleDefinition,
    *,
    ignored_instance_id: str | None = None,
) -> str | None:
    """Return a player-facing reason when a new live copy would break limits."""
    active = tuple(
        module
        for module in active_deployable_modules(player)
        if module.instance_id != ignored_instance_id
    )
    category = definition.category

    if category not in UTILITY_CATEGORIES:
        return None

    same_definition_count = sum(
        module.definition.id == definition.id
        for module in active
    )
    if same_definition_count >= MAX_ACTIVE_UTILITY_COPIES_PER_DEFINITION:
        return (
            f"{definition.name_tr} için aynı anda en fazla "
            f"{MAX_ACTIVE_UTILITY_COPIES_PER_DEFINITION} kopya kullanılabilir."
        )

    category_limit = CATEGORY_ACTIVE_LIMITS[category]
    category_count = sum(
        module.definition.category == category
        for module in active
    )
    if category_count >= category_limit:
        category_label = {
            "savunma": "Savunma",
            "destek": "Destek",
            "enerji": "Sistem",
            "sabotaj": "Sabotaj",
        }[category]
        return f"{category_label} sınırı dolu: {category_count}/{category_limit}."

    attack_count = sum(
        module.definition.category == "saldırı"
        for module in active
    )
    utility_count = sum(
        module.definition.category in UTILITY_CATEGORIES
        for module in active
    )
    if utility_count + 1 > attack_count + UTILITY_LEAD_OVER_ATTACK:
        return (
            "Devre dengesi için önce bir Saldırı modülü yerleştir. "
            "Saldırı dışı modüller, Saldırı sayısını en fazla 2 aşabilir."
        )

    return None
