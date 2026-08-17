from app.web_test_monitoring import build_monitoring_summary


def test_monitoring_summary_combines_operation_stability_and_funnel():
    result=build_monitoring_summary(
        version="2.0.0-beta.4.3",
        build="web-test-beta.4.3",
        test_run_id="r",
        operation_status={
            "operational_state":"running",
            "preflight_ready":True,
            "run_started":True,
            "consistency_status":"consistent",
        },
        stability={
            "stability":"stable",
            "operation_running_rate":0.8,
            "running_to_other_regressions":0,
        },
        run_summary={
            "audit_session_starts":10,
            "audit_session_bounds":8,
            "audit_session_finishes":6,
            "audit_to_session_rate":0.8,
            "audit_to_finish_rate":0.6,
            "bound_to_finish_rate":0.75,
        },
        kpis={
            "operation_snapshots":5,
            "operation_running_rate":0.8,
            "stability_snapshots":4,
            "stability_stable_rate":0.75,
            "launch_attempts":10,
            "launch_ready_rate":0.9,
        },
    )

    assert result["operation"]["state"]=="running"
    assert result["stability"]["state"]=="stable"
    assert result["funnel"]["audit_session_finishes"]==6
    assert result["operational_kpis"]["launch_ready_rate"]==0.9
    assert result["observational_only"] is True
