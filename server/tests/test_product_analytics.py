import json

import pytest

from app.product_analytics import (
    ProductAnalyticsError,
    ProductAnalyticsService,
    aggregate_product_events,
)


def test_analytics_requires_server_side_consent_and_erases_on_opt_out(tmp_path):
    consent = {"player-a": False}
    now = [1_780_000_000.0]
    service = ProductAnalyticsService(
        tmp_path / "analytics.json", b"private-test-key",
        lambda player_id: consent.get(player_id) is True,
        now_func=lambda: now[0],
    )
    assert service.record("player-a", "session_started", {}) is False
    assert not service.path.exists()

    consent["player-a"] = True
    assert service.record("player-a", "session_started", {}, request_id="a" * 32) is True
    assert service.record("player-a", "session_started", {}, request_id="a" * 32) is False
    stored = json.loads(service.path.read_text(encoding="utf-8"))["events"]
    assert len(stored) == 1
    assert "player-a" not in json.dumps(stored)
    assert service.events_for("player-a")[0]["type"] == "session_started"
    assert "subject" not in service.events_for("player-a")[0]

    consent["player-a"] = False
    assert service.erase_player("player-a") == 1
    assert service.events_for("player-a") == []


def test_analytics_rejects_custom_properties_and_client_battle_results(tmp_path):
    service = ProductAnalyticsService(tmp_path / "analytics.json", b"private-test-key", lambda _: True)
    with pytest.raises(ProductAnalyticsError):
        service.record("player-a", "screen_view", {"screen": "profile", "name": "Alice"})
    with pytest.raises(ProductAnalyticsError):
        service.record("player-a", "screen_view", {"screen": "unlisted"})
    with pytest.raises(ProductAnalyticsError):
        service.record("player-a", "battle_completed", {"result": "win", "mode": "arena", "duration": "under_60s"})


def test_analytics_retention_and_small_cohort_suppression(tmp_path):
    now = [1_780_000_000.0]
    service = ProductAnalyticsService(
        tmp_path / "analytics.json", b"private-test-key", lambda _: True, now_func=lambda: now[0],
    )
    service.record("player-a", "session_started", {})
    raw = json.loads(service.path.read_text(encoding="utf-8"))["events"]
    report = aggregate_product_events(raw, now_ms=round(now[0] * 1000))
    assert report["suppressed"] is True
    assert report["funnel_unique_players"] is None
    now[0] += 31 * 24 * 60 * 60
    assert service.prune_expired() == 1
    assert service.events_for("player-a") == []


def test_analytics_aggregate_has_no_subjects_and_requires_five_players_per_cell(tmp_path):
    now = [1_780_000_000.0]
    service = ProductAnalyticsService(
        tmp_path / "analytics.json", b"private-test-key", lambda _: True, now_func=lambda: now[0],
    )
    for number in range(5):
        player_id = f"player-{number}"
        service.record(player_id, "session_started", {})
        service.record(player_id, "battle_completed", {"result": "win", "mode": "arena", "duration": "under_60s"}, client=False)
    events = json.loads(service.path.read_text(encoding="utf-8"))["events"]
    report = aggregate_product_events(events, now_ms=round(now[0] * 1000))
    assert report["suppressed"] is False
    assert report["funnel_unique_players"]["session_started"] == 5
    assert report["battle_results"]["win"] == 5
    assert report["battle_results"]["loss"] is None
    assert "subject" not in json.dumps(report)
