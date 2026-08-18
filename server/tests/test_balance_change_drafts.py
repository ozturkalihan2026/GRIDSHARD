from pathlib import Path
import pytest

from app.balance_change_drafts import (
    BalanceChangeDraftError,
    BalanceChangeDraftService,
    JsonBalanceChangeDraftRepository,
)


def ready_plan():
    return {
        "status":"plan_ready",
        "review_ready":True,
        "items":[
            {
                "area":"local_ai_pressure",
                "reason":"Galibiyet oranı yüksek.",
                "suggestion":"AI baskısını incele.",
                "requires_manual_value":True,
                "requires_simulation":True,
                "requires_regression":True,
                "approved":False,
            }
        ],
    }


def test_draft_is_blocked_without_review_ready(
    tmp_path:Path,
):
    service=BalanceChangeDraftService(
        JsonBalanceChangeDraftRepository(
            tmp_path/"draft.json"
        )
    )

    with pytest.raises(
        BalanceChangeDraftError
    ):
        service.update_item(
            player_id="p1",
            plan={
                "status":
                    "blocked_waiting_for_review_ready",
                "review_ready":False,
                "items":[],
            },
            area="local_ai_pressure",
            before_value=8,
            proposed_value=9,
            approved=True,
            simulation_status="pending",
            regression_status="pending",
        )


def test_draft_never_exposes_apply_until_checks_pass(
    tmp_path:Path,
):
    service=BalanceChangeDraftService(
        JsonBalanceChangeDraftRepository(
            tmp_path/"draft.json"
        )
    )

    draft=service.update_item(
        player_id="p1",
        plan=ready_plan(),
        area="local_ai_pressure",
        before_value=8,
        proposed_value=9,
        approved=True,
        simulation_status="pending",
        regression_status="pending",
    )

    item=draft["items"][0]
    assert item["approved"] is True
    assert item["ready_for_apply"] is False
    assert draft["automatic_apply"] is False
    assert draft["apply_endpoint_available"] is False
    assert draft["numeric_balance_changed"] is False


def test_draft_can_be_ready_but_still_has_no_apply_endpoint(
    tmp_path:Path,
):
    service=BalanceChangeDraftService(
        JsonBalanceChangeDraftRepository(
            tmp_path/"draft.json"
        )
    )

    draft=service.update_item(
        player_id="p1",
        plan=ready_plan(),
        area="local_ai_pressure",
        before_value=8,
        proposed_value=9,
        approved=True,
        simulation_status="passed",
        regression_status="passed",
    )

    assert draft["items"][0]["ready_for_apply"] is True
    assert draft["apply_endpoint_available"] is False
    assert draft["numeric_balance_changed"] is False
