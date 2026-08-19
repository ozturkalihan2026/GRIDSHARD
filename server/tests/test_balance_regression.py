import pytest

from app.balance_regression import (
    BalanceRegressionError,
    run_balance_regression,
)


def test_credit_regression_uses_real_engine_and_never_mutates_canonical():
    result=run_balance_regression(
        area="circuit_credit",
        before_value=10,
        proposed_value=20,
    )

    assert result["status"]=="passed"
    assert len(
        result["engine_scenarios"]
    )==2
    assert result[
        "canonical_values_changed"
    ] is False
    assert result[
        "automatic_apply"
    ] is False


def test_credit_regression_rejects_engine_invalid_tick_income():
    with pytest.raises(
        BalanceRegressionError
    ):
        run_balance_regression(
            area="circuit_credit",
            before_value=10,
            proposed_value=12,
        )


def test_module_interaction_regression_uses_real_engine():
    result=run_balance_regression(
        area="module_interaction",
        before_value=15,
        proposed_value=12,
    )

    assert result["status"]=="passed"
    assert result[
        "engine_scenarios"
    ][1][
        "unlock_ms"
    ]==12_000
    assert result[
        "engine_scenarios"
    ][1][
        "accepted_at_unlock"
    ] is True
    assert result[
        "canonical_values_changed"
    ] is False


def test_local_ai_pressure_uses_separate_server_side_adapter():
    result=run_balance_regression(
        area="local_ai_pressure",
        before_value=8,
        proposed_value=9,
    )

    assert result["status"]=="passed"
    assert result["adapter"]=="server_side_local_ai"
    assert result["canonical_values_changed"] is False
    assert result["automatic_apply"] is False
