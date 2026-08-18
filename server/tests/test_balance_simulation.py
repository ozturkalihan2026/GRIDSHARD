import pytest

from app.balance_simulation import (
    BalanceSimulationError,
    run_balance_simulation,
)


def test_local_ai_pressure_simulation_is_isolated():
    result=run_balance_simulation(
        area="local_ai_pressure",
        before_value=8,
        proposed_value=9,
    )

    assert result["status"]=="passed"
    assert result["metrics_before"]["raw_damage"]==240
    assert result["metrics_proposed"]["raw_damage"]==270
    assert result["isolated"] is True
    assert result["canonical_values_changed"] is False


def test_circuit_credit_simulation_compares_60_second_income():
    result=run_balance_simulation(
        area="circuit_credit",
        before_value=10,
        proposed_value=12,
    )

    assert result["metrics_before"]["credits_generated"]==600
    assert result["metrics_proposed"]["credits_generated"]==720
    assert result["canonical_values_changed"] is False


def test_module_interaction_simulation_compares_unlock_window():
    result=run_balance_simulation(
        area="module_interaction",
        before_value=15,
        proposed_value=12,
    )

    assert result["metrics_before"]["unlock_second"]==15
    assert result["metrics_proposed"]["unlock_second"]==12
    assert (
        result["metrics_proposed"]["battle_time_available_after_unlock"]
        >
        result["metrics_before"]["battle_time_available_after_unlock"]
    )


def test_unsupported_review_area_never_mutates_balance():
    with pytest.raises(
        BalanceSimulationError
    ):
        run_balance_simulation(
            area="generator_route",
            before_value=1,
            proposed_value=2,
        )
