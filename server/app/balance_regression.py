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
    ModuleStatus,
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
        ] == 4
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


def run_balance_regression(
    *,
    area: str,
    before_value: Any,
    proposed_value: Any,
) -> dict:
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
            "Bu alan henüz gerçek battle-engine regresyon adaptörüne bağlı değil. Değişiklik güvenlik amacıyla bloke edildi."
        )

    result = adapter(
        before,
        proposed,
    )
    result["automatic_apply"] = False
    result["apply_endpoint_available"] = False
    return result
