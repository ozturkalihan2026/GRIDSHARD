from __future__ import annotations

from typing import Any

from .telemetry import InMemoryTelemetryService


RATING_FIELDS = (
    "usability",
    "connection",
    "battle_balance",
    "module_booster_balance",
)


def validate_feedback_rating(
    value: int,
    *,
    field_name: str,
) -> int:
    rating = int(value)

    if not 1 <= rating <= 5:
        raise ValueError(
            f"{field_name} puanı 1 ile 5 arasında olmalıdır."
        )

    return rating


def normalize_feedback_note(
    note: str | None,
) -> str:
    normalized = (
        str(note or "")
        .strip()
    )

    if len(normalized) > 500:
        raise ValueError(
            "Geri bildirim notu en fazla 500 karakter olabilir."
        )

    return normalized


def build_feedback_summary(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
) -> dict[str, Any]:
    events = [
        event
        for event in telemetry_service.events(
            event_type=
                "web_test_feedback_submitted",
        )
        if event.get(
            "metadata",
            {},
        ).get(
            "test_run_id"
        )
        == test_run_id
    ]

    ratings: dict[str, list[int]] = {
        name:[]
        for name in RATING_FIELDS
    }

    note_count = 0

    for event in events:
        metadata = event.get(
            "metadata",
            {},
        )

        for name in RATING_FIELDS:
            value = metadata.get(name)
            if isinstance(value, int):
                ratings[name].append(value)

        if metadata.get(
            "has_note"
        ):
            note_count += 1

    averages = {
        name:(
            round(
                sum(values)
                / len(values),
                3,
            )
            if values
            else None
        )
        for name,values
        in ratings.items()
    }

    low_score_counts = {
        name:sum(
            1
            for value in values
            if value <= 2
        )
        for name,values
        in ratings.items()
    }

    return {
        "test_run_id":
            test_run_id,
        "feedback_count":
            len(events),
        "average_ratings":
            averages,
        "low_score_counts":
            low_score_counts,
        "note_count":
            note_count,
        "contains_personal_profile_data":
            False,
    }
