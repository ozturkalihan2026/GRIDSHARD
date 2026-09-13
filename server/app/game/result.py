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
    contribution: dict[str, dict[str, float]] = {}

    def bucket(definition_id: str) -> dict[str, float]:
        return contribution.setdefault(
            definition_id,
            {
                "damage": 0,
                "damage_absorbed": 0,
                "repair": 0,
                "heat_reduced": 0.0,
                "energy_saved": 0.0,
                "support_value": 0.0,
                "control_seconds": 0.0,
                "control_actions": 0,
                "support_actions": 0,
            },
        )

    if player.battle_pool is not None:
        for definition_id in player.battle_pool.module_definition_ids:
            bucket(definition_id)
    for module in player.modules.values():
        bucket(module.definition.id)

    for event in events:
        data = event.data
        if event.type == "module_damaged":
            if data.get("source_player_id") == player.player_id and data.get("player_id") != player.player_id:
                source = player.modules.get(str(data.get("source_module_id", "")))
                if source is not None:
                    bucket(source.definition.id)["damage"] += int(data.get("damage", 0))
        elif event.type == "attack_performed" and data.get("target_player_id") == player.player_id:
            target = player.modules.get(str(data.get("target_module_id", "")))
            if target is not None:
                bucket(target.definition.id)["damage_absorbed"] += max(
                    0,
                    int(data.get("reduced_damage", 0)),
                )
        elif event.type == "module_repaired" and data.get("player_id") == player.player_id:
            source = player.modules.get(str(data.get("source_module_id", "")))
            if source is not None:
                bucket(source.definition.id)["repair"] += int(data.get("repair", 0))
        elif event.type == "module_cooled" and data.get("player_id") == player.player_id:
            source = player.modules.get(str(data.get("source_module_id", "")))
            if source is not None:
                bucket(source.definition.id)["heat_reduced"] += max(
                    0.0,
                    float(data.get("heat_before", 0.0)) - float(data.get("heat_after", 0.0)),
                )
        elif event.type == "sabotage_applied":
            if data.get("attacker_player_id") != player.player_id:
                continue
            source = player.modules.get(str(data.get("attacker_module_id") or ""))
            if source is not None:
                values = bucket(source.definition.id)
                values["control_actions"] += 1
                values["control_seconds"] += max(
                    0.0,
                    float(data.get("duration_ms", 0.0)) / 1000,
                )
        elif event.type == "module_contribution":
            if data.get("source_player_id", data.get("player_id")) != player.player_id:
                continue
            source = player.modules.get(str(data.get("source_module_id") or ""))
            if source is None:
                continue
            values = bucket(source.definition.id)
            kind = str(data.get("contribution_kind") or "")
            value = max(0.0, float(data.get("value", 0.0)))
            if kind == "energy_saved":
                values["energy_saved"] += value
            elif data.get("category") == "destek":
                values["support_value"] += value
                values["support_actions"] += 1

    rows = []
    for definition_id, values in contribution.items():
        if definition_id == "core":
            continue
        module = next((item for item in player.modules.values() if item.definition.id == definition_id), None)
        if module is None:
            continue
        values["energy_consumed"] = round(float(player.module_energy_consumed.get(definition_id, 0.0)), 3)
        values["energy_discharged"] = round(float(player.module_energy_discharged.get(definition_id, 0.0)), 3)
        if definition_id == "generator":
            values["energy_generated"] = round(float(player.energy_generated_total), 3)
        else:
            values["energy_generated"] = 0.0
        rows.append({
            "definition_id": definition_id,
            "name_tr": module.definition.name_tr,
            "category": module.definition.category,
            **{key: (round(value, 3) if isinstance(value, float) else int(value)) for key, value in values.items()},
            "level": 1 + int(upgrade_levels.get(definition_id, 0)),
        })
    rows.sort(
        key=lambda row: (
            -(
                row["damage"]
                + row["damage_absorbed"]
                + row["repair"]
                + row["heat_reduced"]
                + row["energy_discharged"]
                + row["energy_saved"]
                + row["support_value"]
                + row["control_seconds"]
            ),
            row["name_tr"],
        )
    )
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
