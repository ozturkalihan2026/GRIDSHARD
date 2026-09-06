from dataclasses import dataclass

from .models import BattleEvent, ModuleStatus, PlayerBattleState


@dataclass(slots=True, frozen=True)
class PlayerBattleSummary:
    player_id: str
    core_hp: int
    living_module_count: int
    remaining_hp: int
    total_max_hp: int
    hp_ratio: float
    damage_dealt: int
    damage_by_module: tuple[dict, ...]
    core_type: str
    core_level: int
    circuit_credits: int
    forfeit_credit_penalty: int
    energy_generated_total: float
    energy_consumed_total: float


def core_hp(player: PlayerBattleState) -> int:
    cores = [
        module
        for module in player.modules.values()
        if module.definition.id == "core"
    ]
    if not cores:
        return 0
    return max(0, cores[0].hp)


def damage_by_module_from_events(
    player: PlayerBattleState,
    events: list[BattleEvent],
    upgrade_levels: dict[str, int] | None = None,
) -> tuple[dict, ...]:
    upgrade_levels = upgrade_levels or {}
    damage: dict[str, int] = {}

    if player.battle_pool is not None:
        for definition_id in player.battle_pool.module_definition_ids:
            damage.setdefault(definition_id, 0)

    for event in events:
        data = event.data
        if event.type != "module_damaged":
            continue
        if data.get("source_player_id") != player.player_id:
            continue
        if data.get("player_id") == player.player_id:
            continue
        source = player.modules.get(str(data.get("source_module_id", "")))
        if source is None:
            continue
        definition_id = source.definition.id
        damage[definition_id] = damage.get(definition_id, 0) + int(data.get("damage", 0))

    rows = []
    for definition_id, amount in damage.items():
        module = next((item for item in player.modules.values() if item.definition.id == definition_id), None)
        if module is None:
            continue
        rows.append({
            "definition_id": definition_id,
            "name_tr": module.definition.name_tr,
            "damage": amount,
            "level": 1 + int(upgrade_levels.get(definition_id, 0)),
        })
    rows.sort(key=lambda row: (-row["damage"], row["name_tr"]))
    return tuple(rows)


def build_player_summary(
    player: PlayerBattleState,
    events: list[BattleEvent],
    upgrade_levels: dict[str, int] | None = None,
) -> PlayerBattleSummary:
    modules = list(player.modules.values())

    living = [
        module
        for module in modules
        if module.status == ModuleStatus.ACTIVE
        and module.hp > 0
    ]
    remaining_hp = sum(
        max(0, module.hp)
        for module in modules
    )
    total_max_hp = sum(
        module.definition.max_hp
        for module in modules
    )
    hp_ratio = (
        remaining_hp / total_max_hp
        if total_max_hp > 0
        else 0.0
    )

    module_damage = damage_by_module_from_events(player, events, upgrade_levels)
    return PlayerBattleSummary(
        player_id=player.player_id,
        core_hp=core_hp(player),
        living_module_count=len(living),
        remaining_hp=remaining_hp,
        total_max_hp=total_max_hp,
        hp_ratio=hp_ratio,
        damage_dealt=sum(row["damage"] for row in module_damage),
        damage_by_module=module_damage,
        core_type=player.core_type,
        core_level=player.core_level,
        circuit_credits=player.circuit_credits,
        forfeit_credit_penalty=player.forfeit_credit_penalty,
        energy_generated_total=player.energy_generated_total,
        energy_consumed_total=player.energy_consumed_total,
    )


def summary_rank(summary: PlayerBattleSummary) -> tuple:
    return (
        summary.core_hp,
        summary.living_module_count,
        round(summary.hp_ratio, 9),
        summary.damage_dealt,
    )


def summary_to_dict(summary: PlayerBattleSummary) -> dict:
    return {
        "player_id": summary.player_id,
        "core_hp": summary.core_hp,
        "living_module_count": summary.living_module_count,
        "remaining_hp": summary.remaining_hp,
        "total_max_hp": summary.total_max_hp,
        "hp_ratio": round(summary.hp_ratio, 6),
        "damage_dealt": summary.damage_dealt,
        "damage_by_module": [dict(row) for row in summary.damage_by_module],
        "core_type": summary.core_type,
        "core_level": summary.core_level,
        "circuit_credits": summary.circuit_credits,
        "forfeit_credit_penalty": summary.forfeit_credit_penalty,
        "energy_generated_total": round(
            summary.energy_generated_total,
            6,
        ),
        "energy_consumed_total": round(
            summary.energy_consumed_total,
            6,
        ),
    }
