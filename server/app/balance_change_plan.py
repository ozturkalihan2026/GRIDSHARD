from __future__ import annotations


def build_balance_change_plan(
    report:dict,
)->dict:
    ready=(
        report.get("status")
        == "review_ready"
    )

    candidates=list(
        report.get(
            "review_candidates",
            [],
        )
    )

    items=[]
    if ready:
        for candidate in candidates:
            if (
                candidate.get("severity")
                in {
                    "review",
                    "observe",
                }
            ):
                items.append({
                    "area":
                        candidate.get(
                            "area"
                        ),
                    "reason":
                        candidate.get(
                            "reason"
                        ),
                    "suggestion":
                        candidate.get(
                            "suggestion"
                        ),
                    "before_value":None,
                    "proposed_value":None,
                    "requires_manual_value":True,
                    "requires_simulation":True,
                    "requires_regression":True,
                    "approved":False,
                })

    return {
        "status":
            (
                "plan_ready"
                if ready
                else "blocked_waiting_for_review_ready"
            ),
        "review_ready":ready,
        "items":items,
        "automatic_apply":False,
        "numeric_balance_changed":False,
    }
