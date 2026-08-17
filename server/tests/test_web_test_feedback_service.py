import pytest

from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_feedback import (
    build_feedback_summary,
    normalize_feedback_note,
    validate_feedback_rating,
)


def test_feedback_validation_and_note_limit():
    assert validate_feedback_rating(
        5,
        field_name="x",
    )==5

    with pytest.raises(ValueError):
        validate_feedback_rating(
            0,
            field_name="x",
        )

    assert normalize_feedback_note(
        "  güzel  "
    )=="güzel"

    with pytest.raises(ValueError):
        normalize_feedback_note(
            "x"*501
        )


def test_feedback_summary_is_aggregate():
    telemetry=InMemoryTelemetryService()

    for index,(u,c,b,m,note) in enumerate([
        (5,4,3,2,True),
        (3,2,4,5,False),
    ]):
        telemetry.record(
            TelemetryEvent(
                event_id=f"f{index}",
                event_type=
                    "web_test_feedback_submitted",
                timestamp_ms=index,
                metadata={
                    "test_run_id":"r",
                    "usability":u,
                    "connection":c,
                    "battle_balance":b,
                    "module_booster_balance":m,
                    "has_note":note,
                    "note":"x" if note else "",
                },
            )
        )

    result=build_feedback_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )

    assert result["feedback_count"]==2
    assert result["average_ratings"]["usability"]==4.0
    assert result["low_score_counts"]["connection"]==1
    assert result["note_count"]==1
    assert result["contains_personal_profile_data"] is False
