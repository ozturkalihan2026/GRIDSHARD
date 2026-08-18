from app.manual_battle_report import (
    build_manual_battle_report,
)
from app.telemetry import TelemetryEvent


def event(
    event_id,
    event_type,
    metadata,
):
    return TelemetryEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp_ms=1,
        player_id="p1",
        metadata=metadata,
    )


def battle(
    index,
    *,
    won=True,
    duration_ms=90000,
    credits_spent=120,
    generator_moves=2,
    damage_dealt=300,
    damage_received=110,
    shield_mitigated=20,
    module_changes=5,
):
    return event(
        f"battle-{index}",
        "local_battle_completed",
        {
            "won":won,
            "duration_ms":duration_ms,
            "credits_spent":credits_spent,
            "generator_moves":generator_moves,
            "damage_dealt":damage_dealt,
            "damage_received":damage_received,
            "shield_mitigated":shield_mitigated,
            "module_changes":module_changes,
        },
    )


def test_manual_report_waits_for_three_real_battles():
    report=build_manual_battle_report(
        events=[battle(1)],
        player_id="p1",
    )

    assert report["status"]=="insufficient_manual_battles"
    assert report["battle_count"]==1
    assert report["battles_remaining"]==2
    assert report["numeric_balance_changed"] is False
    assert report["review_candidates"][0]["severity"]=="waiting"


def test_manual_report_becomes_review_ready_without_auto_balance():
    events=[
        battle(1,won=True),
        battle(2,won=True),
        battle(3,won=False),
        event(
            "g1",
            "generator_gate_moved",
            {
                "from_gate":"south",
                "to_gate":"west",
                "connected_module_count":3,
                "powered_special_cell_count":1,
            },
        ),
        event(
            "g2",
            "generator_gate_moved",
            {
                "from_gate":"west",
                "to_gate":"north",
                "connected_module_count":4,
                "powered_special_cell_count":2,
            },
        ),
    ]

    report=build_manual_battle_report(
        events=events,
        player_id="p1",
    )

    assert report["status"]=="review_ready"
    assert report["battle_count"]==3
    assert report["numeric_balance_changed"] is False
    assert report["generator_route"]["move_count"]==2
    assert report["generator_route"]["visits"]["west"]==1
    assert report["generator_route"]["average_connected_modules_after_move"]==3.5


def test_report_produces_review_candidate_but_never_changes_balance():
    report=build_manual_battle_report(
        events=[
            battle(1,won=True,duration_ms=30000),
            battle(2,won=True,duration_ms=32000),
            battle(3,won=True,duration_ms=34000),
        ],
        player_id="p1",
    )

    areas={
        item["area"]
        for item in report["review_candidates"]
    }

    assert "match_duration" in areas
    assert "local_ai_pressure" in areas
    assert all(
        item["automatic_change"] is False
        for item in report["review_candidates"]
    )
    assert report["numeric_balance_changed"] is False
