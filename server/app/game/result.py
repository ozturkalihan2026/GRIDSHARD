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
    circuit_credits: int
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


def damage_dealt_from_events(
    player_id: str,
    events: list[BattleEvent],
) -> int:
    total = 0

    for event in events:
        data = event.data

        if (
            event.type == "attack_performed"
            and data.get("attacker_player_id") == player_id
        ):
            total += int(data.get("damage", 0))

        elif (
            event.type == "damage_reflected"
            and data.get("source_player_id") == player_id
        ):
            total += int(data.get("damage", 0))

        elif (
            event.type == "virus_damage"
            and data.get("source_player_id") == player_id
        ):
            total += int(data.get("damage", 0))

    return total


def build_player_summary(
    player: PlayerBattleState,
    events: list[BattleEvent],
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

    return PlayerBattleSummary(
        player_id=player.player_id,
        core_hp=core_hp(player),
        living_module_count=len(living),
        remaining_hp=remaining_hp,
        total_max_hp=total_max_hp,
        hp_ratio=hp_ratio,
        damage_dealt=damage_dealt_from_events(
            player.player_id,
            events,
        ),
        circuit_credits=player.circuit_credits,
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
        "circuit_credits": summary.circuit_credits,
        "energy_generated_total": round(
            summary.energy_generated_total,
            6,
        ),
        "energy_consumed_total": round(
            summary.energy_consumed_total,
            6,
        ),
    }
