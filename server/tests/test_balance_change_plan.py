from app.balance_change_plan import (
    build_balance_change_plan,
)


def test_balance_plan_blocks_without_review_ready():
    plan=build_balance_change_plan({
        "status":
            "insufficient_manual_battles",
        "review_candidates":[],
    })
    assert plan["review_ready"] is False
    assert plan["automatic_apply"] is False
    assert plan["items"]==[]


def test_balance_plan_requires_manual_numeric_values():
    plan=build_balance_change_plan({
        "status":"review_ready",
        "review_candidates":[
            {
                "area":"local_ai_pressure",
                "severity":"review",
                "reason":"Galibiyet yüksek.",
                "suggestion":"AI baskısını incele.",
            }
        ],
    })

    assert plan["status"]=="plan_ready"
    assert plan["automatic_apply"] is False
    assert plan["numeric_balance_changed"] is False
    assert plan["items"][0]["requires_manual_value"] is True
    assert plan["items"][0]["requires_simulation"] is True
    assert plan["items"][0]["approved"] is False
