from app.web_test_review import build_review_candidates


def test_review_waits_for_real_data():
    result=build_review_candidates(
        findings={
            "test_run_id":"r",
            "status":"insufficient_data",
            "concerns":[],
        }
    )
    assert result["status"]=="waiting_for_real_data"
    assert result["candidate_count"]==0
    assert result["auto_apply"] is False
    assert result["human_approval_required"] is True


def test_review_prioritizes_high_severity_and_keeps_context():
    result=build_review_candidates(
        findings={
            "test_run_id":"r",
            "status":"sufficient",
            "concerns":[
                {
                    "area":"battle_balance",
                    "severity":"watch",
                    "reason":"low_scores_present",
                    "average":3.2,
                    "low_score_count":1,
                },
                {
                    "area":"module_booster_balance",
                    "severity":"high",
                    "reason":"average_below_3",
                    "average":2.1,
                    "low_score_count":2,
                },
            ],
            "gameplay_signals":{
                "completed_matches":4,
                "rematch_requests":1,
                "module_changes":8,
                "boosters_used":3,
                "module_shelf_uses":7,
                "total_circuit_credits_spent":420,
            },
        }
    )
    assert result["status"]=="review_required"
    assert result["candidate_count"]==2
    assert result["candidates"][0]["area"]=="module_booster_balance"
    assert result["candidates"][0]["technical_context"]["module_changes"]==8
    assert result["auto_apply"] is False


def test_review_reports_no_priority_issue():
    result=build_review_candidates(
        findings={
            "test_run_id":"r",
            "status":"sufficient",
            "concerns":[],
            "gameplay_signals":{},
        }
    )
    assert result["status"]=="no_priority_issue"
    assert result["candidate_count"]==0
