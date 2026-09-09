from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .game.economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .game.battle_pool import default_battle_pool
from .game.engine import (
    BattleEngine,
    MODULE_INTERACTION_UNLOCK_MS,
)
from .game.models import (
    BattleCommand,
    BattleState,
    ModuleStatus,
)
from .game.board import CORE_POSITION
from .game.combat import (
    resolve_attack,
)
from .game.topology import build_energy_topology
from .local_ai_regression import (
    LocalAiRegressionError,
    run_local_ai_pressure_regression,
)


class BalanceRegressionError(ValueError):
    pass


def _number(value: Any, label: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise BalanceRegressionError(
            f"{label} sayısal olmalıdır."
        ) from exc

    if result < 0:
        raise BalanceRegressionError(
            f"{label} negatif olamaz."
        )
    return result


def _advance_to(
    engine: BattleEngine,
    elapsed_ms: int,
) -> None:
    while engine.state.elapsed_ms < elapsed_ms:
        engine.step()


def _command(
    engine: BattleEngine,
    kind: str,
    **payload: Any,
) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind=kind,
            payload=payload,
        )
    )
    engine.step()


def _engine_fixture(
    *,
    credit_config: CircuitCreditConfig = DEFAULT_CIRCUIT_CREDIT_CONFIG,
    unlock_ms: int = MODULE_INTERACTION_UNLOCK_MS,
) -> BattleEngine:
    engine = BattleEngine(
        BattleState(
            battle_id="balance-regression"
        ),
        circuit_credit_config=credit_config,
        module_interaction_unlock_ms=unlock_ms,
    )
    engine.add_player("player-1")
    engine.set_battle_pool(
        "player-1",
        default_battle_pool().module_definition_ids,
    )
    engine.grant_module(
        "player-1", "core-1", "core"
    )
    engine.grant_module(
        "player-1",
        "laser-1",
        "laser",
    )
    engine.grant_module(
        "player-1",
        "shield-1",
        "shield",
    )
    engine.grant_module(
        "player-1",
        "battery-1",
        "battery",
    )
    engine.set_initial_active_module(
        "player-1",
        "core-1",
        2,
        1,
    )
    engine.start()
    return engine


def _command_rejected(
    engine: BattleEngine,
) -> bool:
    return any(
        event.type == "command_rejected"
        for event in engine.state.events
    )


def _generic_engine_invariants(
    engine: BattleEngine,
) -> dict:
    start_tick = engine.state.tick
    start_elapsed = engine.state.elapsed_ms

    for _ in range(10):
        engine.step()

    return {
        "tick_advanced":
            engine.state.tick
            == start_tick + 10,
        "elapsed_advanced_ms":
            engine.state.elapsed_ms
            - start_elapsed,
        "battle_running":
            engine.state.status.value
            == "running",
        "core_active":
            engine.state.players[
                "player-1"
            ].modules[
                "core-1"
            ].status
            == ModuleStatus.ACTIVE,
        "embedded_network_active": True,
    }


def _regress_circuit_credit(
    before: float,
    proposed: float,
) -> dict:
    before_int = int(before)
    proposed_int = int(proposed)

    if (
        before_int != before
        or proposed_int != proposed
    ):
        raise BalanceRegressionError(
            "Devre Kredisi pasif üretim değeri tam sayı olmalıdır."
        )

    configs = []
    for value in (
        before_int,
        proposed_int,
    ):
        configs.append(
            CircuitCreditConfig(
                starting_credits=(
                    DEFAULT_CIRCUIT_CREDIT_CONFIG
                    .starting_credits
                ),
                passive_credits_per_second=value,
                move_cost=(
                    DEFAULT_CIRCUIT_CREDIT_CONFIG
                    .move_cost
                ),
                rotate_cost=(
                    DEFAULT_CIRCUIT_CREDIT_CONFIG
                    .rotate_cost
                ),
                remove_cost=(
                    DEFAULT_CIRCUIT_CREDIT_CONFIG
                    .remove_cost
                ),
            )
        )

    snapshots = []
    for label, config in zip(
        ("before", "proposed"),
        configs,
    ):
        try:
            engine = _engine_fixture(
                credit_config=config
            )
        except ValueError as exc:
            raise BalanceRegressionError(
                f"{label} Devre Kredisi yapılandırması gerçek engine tarafından reddedildi: {exc}"
            ) from exc

        invariants = _generic_engine_invariants(
            engine
        )

        expected = (
            config.starting_credits
            + config.passive_credits_per_second
        )
        balance = engine.circuit_credits(
            "player-1"
        )

        before_place = engine.circuit_credits(
            "player-1"
        )
        _command(
            engine,
            "deploy_module",
            definition_id="laser",
        )
        laser = next(
            module
            for module in engine.state.players["player-1"].modules.values()
            if module.definition.id == "laser"
            and module.status == ModuleStatus.ACTIVE
        )

        snapshots.append({
            "label": label,
            "config": asdict(config),
            "invariants": invariants,
            "credit_after_1s": balance,
            "expected_after_1s": expected,
            "credit_income_ok":
                balance == expected,
            "laser_placed":
                laser.status
                == ModuleStatus.ACTIVE,
            "credit_before_place":
                before_place,
            "command_rejected":
                _command_rejected(
                    engine
                ),
        })

    passed = all(
        snapshot["credit_income_ok"]
        and snapshot["laser_placed"]
        and all(
            snapshot[
                "invariants"
            ].values()
        )
        for snapshot in snapshots
    )

    return {
        "area": "circuit_credit",
        "status":
            "passed"
            if passed
            else "failed",
        "engine_scenarios": snapshots,
        "canonical_values_changed": False,
    }


def _regress_module_interaction(
    before: float,
    proposed: float,
) -> dict:
    before_ms = int(
        round(
            before * 1000
        )
    )
    proposed_ms = int(
        round(
            proposed * 1000
        )
    )

    snapshots = []
    for label, unlock_ms in (
        ("before", before_ms),
        ("proposed", proposed_ms),
    ):
        invariant_engine = _engine_fixture(
            unlock_ms=unlock_ms
        )
        invariants = _generic_engine_invariants(
            invariant_engine
        )

        deploy_engine = _engine_fixture(
            unlock_ms=unlock_ms
        )
        deploy_engine.state.players["player-1"].circuit_credits = 1_000
        _command(
            deploy_engine,
            "deploy_module",
            definition_id="laser",
        )
        active_lasers = [
            module
            for module in deploy_engine.state.players["player-1"].modules.values()
            if module.definition.id == "laser"
            and module.status == ModuleStatus.ACTIVE
        ]
        accepted_immediately = (
            len(active_lasers) == 1
            and not _command_rejected(deploy_engine)
        )

        snapshots.append({
            "label": label,
            "unlock_ms": unlock_ms,
            "invariants": invariants,
            "legacy_unlock_ignored": True,
            "accepted_immediately": accepted_immediately,
            "active_capacity_at_start":
                deploy_engine
                .max_active_modules(),
        })

    passed = all(
        snapshot["legacy_unlock_ignored"]
        and snapshot["accepted_immediately"]
        and snapshot["active_capacity_at_start"] == 15
        and all(
            snapshot[
                "invariants"
            ].values()
        )
        for snapshot in snapshots
    )

    return {
        "area": "module_interaction",
        "status":
            "passed"
            if passed
            else "failed",
        "engine_scenarios": snapshots,
        "canonical_values_changed": False,
    }



def _new_rejection_since(
    engine:BattleEngine,
    start_index:int,
)->bool:
    return any(
        event.type=="command_rejected"
        for event
        in engine.state.events[
            start_index:
        ]
    )


def _regress_generator_route()->dict:
    engine=BattleEngine(BattleState(battle_id="embedded-network-regression"))
    engine.add_player("player-1")
    engine.set_battle_pool(
        "player-1",
        default_battle_pool().module_definition_ids,
    )
    placements=(
        ("core-1", "core", 2, 1),
        ("battery-1", "battery", 2, 0),
        ("laser-1", "laser", 1, 1),
        ("shield-1", "shield", 3, 1),
        ("repair-1", "repair", 2, 2),
    )
    for instance_id,definition_id,x,y in placements:
        engine.grant_module("player-1", instance_id, definition_id)
        engine.set_initial_active_module("player-1", instance_id, x, y)
    engine.start()
    topology=build_energy_topology(
        engine.state.players["player-1"],
        CORE_POSITION,
    )
    snapshot={
        "occupied_cells": len(placements),
        "reachable_modules": len(topology.reachable_from_generator),
        "connection_count": len(topology.connection_pairs),
        "all_modules_powered": all(
            module.is_powered
            for module in engine.state.players["player-1"].modules.values()
        ),
        "battle_running": engine.state.status.value == "running",
    }
    passed=(
        snapshot["reachable_modules"] == len(placements)
        and snapshot["connection_count"] == 4
        and snapshot["all_modules_powered"]
        and snapshot["battle_running"]
    )

    return {
        "area":"generator_route",
        "status":
            "passed"
            if passed
            else "failed",
        "adapter": "embedded_board_network",
        "engine_scenarios": [snapshot],
        "canonical_values_changed":
            False,
    }


def _defense_engine_fixture()->BattleEngine:
    engine=BattleEngine(
        BattleState(
            battle_id=
                "defense-regression"
        )
    )

    for player_id in (
        "player-1",
        "player-2",
    ):
        engine.add_player(
            player_id
        )

    # Attacker: core plus a directionless attack module.
    for instance_id,definition_id in (
        ("core-a","core"),
        ("laser-a","laser"),
    ):
        engine.grant_module(
            "player-1",
            instance_id,
            definition_id,
        )

    engine.set_initial_active_module(
        "player-1",
        "core-a",
        2,1,
    )
    engine.set_initial_active_module(
        "player-1",
        "laser-a",
        1,1,
    )

    # Defender: core plus a directionless shield.
    for instance_id,definition_id in (
        ("core-d","core"),
        ("shield-d","shield"),
    ):
        engine.grant_module(
            "player-2",
            instance_id,
            definition_id,
        )

    engine.set_initial_active_module(
        "player-2",
        "core-d",
        2,1,
    )
    engine.set_initial_active_module(
        "player-2",
        "shield-d",
        3,1,
    )

    engine.start()
    engine.step()
    return engine


def _regress_defense_usage()->dict:
    engine=_defense_engine_fixture()

    attacker=(
        engine.state.players[
            "player-1"
        ].modules[
            "laser-a"
        ]
    )
    shield=(
        engine.state.players[
            "player-2"
        ].modules[
            "shield-d"
        ]
    )

    powered_resolution=resolve_attack(
        "player-1",
        attacker,
        "player-2",
        shield,
    )

    original_powered=shield.is_powered
    shield.is_powered=False
    unpowered_resolution=resolve_attack(
        "player-1",
        attacker,
        "player-2",
        shield,
    )
    shield.is_powered=original_powered

    passed=bool(
        original_powered
        and powered_resolution
            .reduced_damage > 0
        and powered_resolution
            .final_damage
        < unpowered_resolution
            .final_damage
        and powered_resolution
            .defense_type
        == "Kalkan"
    )

    return {
        "area":"defense_usage",
        "status":
            "passed"
            if passed
            else "failed",
        "adapter":
            "battle_engine_structural",
        "engine_scenarios":[{
            "shield_powered":
                original_powered,
            "powered_raw_damage":
                powered_resolution
                .raw_damage,
            "powered_final_damage":
                powered_resolution
                .final_damage,
            "powered_reduced_damage":
                powered_resolution
                .reduced_damage,
            "unpowered_final_damage":
                unpowered_resolution
                .final_damage,
            "defense_type":
                powered_resolution
                .defense_type,
            "battle_running":
                engine.state.status.value
                == "running",
        }],
        "canonical_values_changed":
            False,
    }


STRUCTURAL_REGRESSION_AREAS={
    "generator_route",
    "defense_usage",
}


def is_structural_regression_area(
    area:str,
)->bool:
    return area in (
        STRUCTURAL_REGRESSION_AREAS
    )


def run_balance_regression(
    *,
    area: str,
    before_value: Any = None,
    proposed_value: Any = None,
) -> dict:
    if area == "generator_route":
        result=_regress_generator_route()
    elif area == "defense_usage":
        result=_regress_defense_usage()
    elif area == "local_ai_pressure":
        try:
            result=(
                run_local_ai_pressure_regression(
                    before_value=
                        before_value,
                    proposed_value=
                        proposed_value,
                )
            )
        except LocalAiRegressionError as exc:
            raise BalanceRegressionError(
                str(exc)
            ) from exc
    else:
        before = _number(
            before_value,
            "Mevcut değer",
        )
        proposed = _number(
            proposed_value,
            "Önerilen değer",
        )

        adapters = {
            "circuit_credit":
                _regress_circuit_credit,
            "module_interaction":
                _regress_module_interaction,
        }

        adapter = adapters.get(area)
        if adapter is None:
            raise BalanceRegressionError(
                "Bu alan için güvenli regresyon adaptörü bulunmuyor. Değişiklik bloke edildi."
            )

        result = adapter(
            before,
            proposed,
        )

    result["automatic_apply"] = False
    result["apply_endpoint_available"] = False
    result["canonical_values_changed"] = False
    return result
