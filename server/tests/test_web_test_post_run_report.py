from app.web_test_post_run import build_post_run_report


def test_post_run_report_calculates_duration():
    report=build_post_run_report(
        version="2.0.0-beta.5",
        build="web-test-beta.5",
        test_run_id="r",
        run_summary={
            "run_started":True,
            "run_finished":True,
            "run_started_at_ms":1000,
            "run_finished_at_ms":5500,
        },
        monitoring={
            "operation":{
                "state":"finished",
            },
        },
        operation_history={},
        operation_transitions={},
        stability_history={},
        data_health={
            "ready":True,
        },
    )

    assert report["status"]=="finished"
    assert report["run_duration_ms"]==4500
    assert report["human_test_completed"] is False
