from app.balance_regression import (
    run_balance_regression,
)
from app.local_ai_regression import (
    run_local_ai_pressure_regression,
)


def test_generator_route_structural_regression_covers_all_four_gates():
    result=run_balance_regression(
        area="generator_route"
    )

    assert result["status"]=="passed"
    assert result["adapter"]=="battle_engine_structural"
    assert len(result["engine_scenarios"])==4
    assert all(
        item["core_connected"]
        for item in result["engine_scenarios"]
    )
    assert all(
        item["special_side_access_count"]>=1
        for item in result["engine_scenarios"]
    )
    assert result["canonical_values_changed"] is False


def test_defense_usage_structural_regression_verifies_powered_shield_reduction():
    result=run_balance_regression(
        area="defense_usage"
    )

    assert result["status"]=="passed"
    scenario=result["engine_scenarios"][0]
    assert scenario["shield_powered"] is True
    assert scenario["powered_reduced_damage"]>0
    assert (
        scenario["powered_final_damage"]
        < scenario["unpowered_final_damage"]
    )


def test_local_ai_pressure_has_separate_server_side_adapter():
    result=run_local_ai_pressure_regression(
        before_value=8,
        proposed_value=9,
    )

    assert result["status"]=="passed"
    assert result["adapter"]=="server_side_local_ai"
    assert (
        result["proposed"]["raw_pressure"]
        > result["before"]["raw_pressure"]
    )
    assert result["canonical_values_changed"] is False
