from fastapi.testclient import TestClient

from app.main import app, telemetry_service

client=TestClient(app)


def finish_run():
    start=client.post(
        "/web-test/test-run/start",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )
    assert start.status_code==200

    finish=client.post(
        "/web-test/test-run/finish",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )
    assert finish.status_code==200


def test_feedback_requires_finished_run():
    telemetry_service.clear()

    response=client.post(
        "/web-test/feedback",
        json={
            "test_run_id":
                "web-test-beta.13",
            "submitted_at_ms":1000,
            "usability":5,
            "connection":5,
            "battle_balance":4,
            "module_booster_balance":4,
            "note":"iyi",
        },
    )

    assert response.status_code==409


def test_feedback_submission_and_summary():
    telemetry_service.clear()
    finish_run()

    response=client.post(
        "/web-test/feedback",
        json={
            "test_run_id":
                "web-test-beta.13",
            "submitted_at_ms":2000,
            "usability":5,
            "connection":4,
            "battle_balance":3,
            "module_booster_balance":2,
            "note":"Modül dengesi tekrar bakılabilir.",
        },
    )

    assert response.status_code==200
    assert response.json()["accepted"] is True

    summary=client.get(
        "/web-test/feedback/summary"
    ).json()

    assert summary["feedback_count"]==1
    assert summary["average_ratings"]["usability"]==5.0
    assert summary["low_score_counts"]["module_booster_balance"]==1
    assert summary["contains_personal_profile_data"] is False

    events=telemetry_service.events(
        event_type=
            "web_test_feedback_submitted",
    )
    assert events[0]["player_id"] is None
    assert "profile" not in events[0]["metadata"]
