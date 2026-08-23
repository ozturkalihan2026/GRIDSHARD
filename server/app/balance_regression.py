from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .game.economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .game.engine import (
    BattleEngine,
    MODULE_INTERACTION_UNLOCK_MS,
)
from .game.models import (
    BattleCommand,
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)
from .game.board import (
    CORE_POSITION,
    GENERATOR_GATE_POSITIONS,
    SPECIAL_CELLS,
)
from .game.combat import (
    resolve_attack,
)
from .game.topology import (
    DIRECTION_VECTOR,
    build_energy_topology,
    module_port_directions,
)
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
    engine.grant_module(
        "player-1", "core-1", "core"
    )
    engine.grant_module(
        "player-1",
        "generator-1",
        "generator",
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
        2,
    )
    engine.set_initial_active_module(
        "player-1",
        "generator-1",
        2,
        3,
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
        "generator_active":
            engine.state.players[
                "player-1"
            ].modules[
                "generator-1"
            ].status
            == ModuleStatus.ACTIVE,
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

        _advance_to(
            engine,
            15_000,
        )
        before_place = engine.circuit_credits(
            "player-1"
        )
        _command(
            engine,
            "place_module",
            module_id="laser-1",
            x=3,
            y=3,
        )
        laser = (
            engine.state.players[
                "player-1"
            ].modules[
                "laser-1"
            ]
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

        before_engine = _engine_fixture(
            unlock_ms=unlock_ms
        )
        before_target = max(
            0,
            unlock_ms - 100,
        )
        _advance_to(
            before_engine,
            before_target,
        )
        _command(
            before_engine,
            "place_module",
            module_id="laser-1",
            x=3,
            y=3,
        )
        rejected_before = _command_rejected(
            before_engine
        )
        reserve_before = (
            before_engine.state.players[
                "player-1"
            ].modules[
                "laser-1"
            ].status
            == ModuleStatus.RESERVE
        )

        after_engine = _engine_fixture(
            unlock_ms=unlock_ms
        )
        _advance_to(
            after_engine,
            unlock_ms,
        )
        _command(
            after_engine,
            "place_module",
            module_id="laser-1",
            x=3,
            y=3,
        )
        accepted_after = (
            after_engine.state.players[
                "player-1"
            ].modules[
                "laser-1"
            ].status
            == ModuleStatus.ACTIVE
        )

        snapshots.append({
            "label": label,
            "unlock_ms": unlock_ms,
            "invariants": invariants,
            "rejected_before_unlock":
                rejected_before,
            "reserve_before_unlock":
                reserve_before,
            "accepted_at_unlock":
                accepted_after,
            "active_capacity_at_unlock":
                after_engine
                .max_active_modules(),
        })

    passed = all(
        snapshot[
            "rejected_before_unlock"
        ]
        and snapshot[
            "reserve_before_unlock"
        ]
        and snapshot[
            "accepted_at_unlock"
        ]
        and snapshot[
            "active_capacity_at_unlock"
        ] == 5
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
    engine=_engine_fixture()
    _advance_to(
        engine,
        MODULE_INTERACTION_UNLOCK_MS,
    )

    player=engine.state.players[
        "player-1"
    ]
    generator=player.modules[
        "generator-1"
    ]

    snapshots=[]
    for gate in (
        GENERATOR_GATE_POSITIONS
    ):
        event_index=len(
            engine.state.events
        )
        _command(
            engine,
            "move_module",
            module_id="generator-1",
            x=gate.x,
            y=gate.y,
        )

        topology=build_energy_topology(
            player,
            CORE_POSITION,
        )
        pair=tuple(
            sorted(
                (
                    "core-1",
                    "generator-1",
                )
            )
        )
        core_connected=(
            pair
            in topology.connection_pairs
        )

        special_side_access=0
        for direction in (
            module_port_directions(
                generator,
                CORE_POSITION,
            )
        ):
            dx,dy=DIRECTION_VECTOR[
                direction
            ]
            position=Position(
                gate.x+dx,
                gate.y+dy,
            )
            if (
                position
                in SPECIAL_CELLS
            ):
                special_side_access+=1

        snapshots.append({
            "gate":{
                "x":gate.x,
                "y":gate.y,
            },
            "moved":
                generator.position==gate,
            "command_rejected":
                _new_rejection_since(
                    engine,
                    event_index,
                ),
            "core_connected":
                core_connected,
            "special_side_access_count":
                special_side_access,
            "battle_running":
                engine.state.status.value
                == "running",
        })

    passed=all(
        item["moved"]
        and not item[
            "command_rejected"
        ]
        and item[
            "core_connected"
        ]
        and item[
            "special_side_access_count"
        ] >= 1
        and item[
            "battle_running"
        ]
        for item in snapshots
    )

    return {
        "area":"generator_route",
        "status":
            "passed"
            if passed
            else "failed",
        "adapter":
            "battle_engine_structural",
        "engine_scenarios":
            snapshots,
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

    # Attacker: north generator + horizontal laser.
    for instance_id,definition_id in (
        ("core-a","core"),
        ("generator-a","generator"),
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
        2,2,
    )
    engine.set_initial_active_module(
        "player-1",
        "generator-a",
        2,1,
    )
    engine.set_initial_active_module(
        "player-1",
        "laser-a",
        3,1,
        direction=Direction.LEFT,
    )

    # Defender: south generator + horizontal shield.
    for instance_id,definition_id in (
        ("core-d","core"),
        ("generator-d","generator"),
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
        2,2,
    )
    engine.set_initial_active_module(
        "player-2",
        "generator-d",
        2,3,
    )
    engine.set_initial_active_module(
        "player-2",
        "shield-d",
        3,3,
        direction=Direction.LEFT,
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
