from app.balance_change_drafts import (
    build_human_review_queue,
)


def test_human_review_queue_only_exposes_passed_numeric_and_structural_candidates():
    draft={
        "review_ready":True,
        "items":[
            {
                "area":"circuit_credit",
                "approved":True,
                "before_value":10,
                "proposed_value":20,
                "simulation_status":"passed",
                "regression_status":"passed",
            },
            {
                "area":"local_ai_pressure",
                "approved":True,
                "before_value":8,
                "proposed_value":9,
                "simulation_status":"passed",
                "regression_status":"pending",
            },
            {
                "area":"generator_route",
                "approved":False,
                "before_value":None,
                "proposed_value":None,
                "simulation_status":"pending",
                "regression_status":"passed",
            },
        ],
    }

    queue=build_human_review_queue(
        draft
    )

    assert queue["candidate_count"]==2
    assert [
        item["area"]
        for item
        in queue["numeric_candidates"]
    ]==["circuit_credit"]
    assert [
        item["area"]
        for item
        in queue["structural_candidates"]
    ]==["generator_route"]
    assert queue["automatic_apply"] is False
    assert queue["apply_endpoint_available"] is False
