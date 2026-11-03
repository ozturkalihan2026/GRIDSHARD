"""Content capacity and channel isolation; no production data or launch writes."""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys

import pytest

from app.cosmetic_releases import CATALOG_PATH, CosmeticReleaseError, CosmeticReleaseRegistry
from app.liveops_content import (
    SOURCES_PATH, ContentPlanError, ContentSourceRegistry, calendar_periods,
    content_coverage, load_sources,
)


ROOT = Path(__file__).resolve().parents[2]


def registry():
    return CosmeticReleaseRegistry(json.loads(CATALOG_PATH.read_text(encoding="utf-8")))


def task(report, field="avatar_frame_id", pool="competition"):
    return next(row for row in report["content_tasks"] if row["field"] == field and row["stock_pool"] == pool)


def test_aligned_two_cycle_budget_preserves_the_30_item_baseline_and_18_item_shortfall():
    report = content_coverage(registry(), starts_at="2027-01-04T00:00:00Z", team_starts_at="2027-01-04T00:00:00Z")
    assert {r["source"]: r["period_count"] for r in report["sources"]} == {
        "season_road":2, "season_leaderboard":2, "weekly_tournament":8, "team_tournament":2}
    assert sum(r["required"] for r in report["content_tasks"]) == 30
    assert sum(r["create_and_review"] for r in report["content_tasks"]) == 18
    assert not report["stock_ready"] and not report["publication_ready"]


def test_midweek_calendar_counts_the_partial_weeks_once_and_requires_extra_art():
    report = content_coverage(registry(), starts_at="2027-01-06T12:00:00Z", team_starts_at="2027-01-06T12:00:00Z")
    weekly = next(r for r in report["sources"] if r["source"] == "weekly_tournament")
    assert weekly["period_count"] == len(set(weekly["period_ids"])) == 9
    assert weekly["period_ids"][0] == "2027-W01" and weekly["period_ids"][-1] == "2027-W09"
    assert sum(r["required"] for r in report["content_tasks"]) == 32
    assert sum(r["create_and_review"] for r in report["content_tasks"]) == 20


def test_iso_year_rollover_and_exclusive_end_are_not_calendar_year_arithmetic():
    periods = calendar_periods(starts_at="2026-12-28T00:00:00Z", cycles=1)
    assert periods["weekly_tournament"] == ["2026-W53","2027-W01","2027-W02","2027-W03"]
    assert periods["season_road"] == ["gridshard_2026_12_28"]


def test_equivalent_timezone_anchors_produce_identical_ids():
    assert calendar_periods(starts_at="2027-01-04T03:00:00+03:00", cycles=2) == calendar_periods(starts_at="2027-01-04T00:00:00Z", cycles=2)


def test_team_launch_is_independent_and_absent_anchor_means_no_team_calendar():
    first = "2027-01-04T00:00:00Z"
    assert calendar_periods(starts_at=first, cycles=2)["team_tournament"] == []
    assert calendar_periods(starts_at=first, cycles=2, team_starts_at="2027-02-01T00:00:00Z")["team_tournament"] == ["2027-02-01"]
    assert calendar_periods(starts_at=first, cycles=2, team_starts_at="2027-03-01T00:00:00Z")["team_tournament"] == []
    with pytest.raises(ContentPlanError, match="precede"):
        calendar_periods(starts_at=first, cycles=2, team_starts_at="2027-01-03T00:00:00Z")


@pytest.mark.parametrize("cycles", [0, 13, True, 1.5])
def test_invalid_horizons_are_rejected(cycles):
    with pytest.raises(ContentPlanError):
        content_coverage(registry(), cycles=cycles)


def test_naive_dates_and_team_only_calendar_do_not_silently_use_local_time():
    with pytest.raises(ContentPlanError, match="UTC offset"):
        content_coverage(registry(), starts_at="2027-01-04T00:00:00")
    with pytest.raises(ContentPlanError, match="season calendar"):
        content_coverage(registry(), team_starts_at="2027-01-04T00:00:00Z")


def test_projection_is_marked_as_an_estimate_and_does_not_rewrite_catalog():
    r=registry(); before=deepcopy(r.document)
    report=content_coverage(r)
    assert not report["calendar_bound"] and not report["production_changed"]
    assert all(row["period_ids"] is None for row in report["sources"])
    assert r.document == before and not r.releases and not r.used


def test_reservations_outside_the_calendar_are_consumed_and_inside_are_credited_once():
    r=registry().reserve("weekly_tournament","2027-W01","in-plan")
    r=r.reserve("weekly_tournament","2026-W50","old-plan")
    report=content_coverage(r,cycles=1,starts_at="2027-01-04T00:00:00Z")
    row=task(report)
    assert row["required"] == 6 and row["reserved_for_calendar"] == 1
    assert row["ready_unassigned"] == 1 and row["create_and_review"] == 4
    doc=deepcopy(r.document)
    doc["releases"][0]["placements"].append({**deepcopy(doc["releases"][0]["placements"][0]),"slot":2})
    assert task(content_coverage(CosmeticReleaseRegistry(doc),cycles=1,starts_at="2027-01-04T00:00:00Z"))["reserved_for_calendar"] == 1


def test_shop_inventory_is_not_competition_stock_or_a_reservation_candidate():
    doc=registry().document
    for item in doc["items"]:
        if item["id"].startswith("aurora_"):
            item["inventory_pool"]="shop"
    r=CosmeticReleaseRegistry(doc)
    report=content_coverage(r,extra_periods={"shop_collection":2})
    assert task(report)["ready_unassigned"] == 2
    assert task(report,pool="shop")["required"] == 2
    assert task(report,pool="shop")["ready_unassigned"] == 1
    assert report["unimplemented_sources"] == ["shop_collection"] and not report["stock_ready"]
    reserved=r.reserve("weekly_tournament","2027-W01","competition")
    assert set(reserved.used) == {"solar_frame","solar_banner"}
    bad=deepcopy(reserved.document)
    bad["releases"][0]["placements"][0]["cosmetics"]["avatar_frame_id"]="aurora_frame"
    with pytest.raises(CosmeticReleaseError,match="channel pool"):
        CosmeticReleaseRegistry(bad)


def test_unknown_pool_and_only_shop_stock_fail_closed_in_runtime_reservation():
    doc=registry().document
    doc["items"][0]["inventory_pool"]="invented"
    with pytest.raises(CosmeticReleaseError,match="Unknown cosmetic inventory pool"):
        CosmeticReleaseRegistry(doc)
    for item in doc["items"]:
        item["inventory_pool"]="shop"
    with pytest.raises(CosmeticReleaseError,match="exhausted"):
        CosmeticReleaseRegistry(doc).reserve("weekly_tournament","2027-W01","no-competition-stock")


@pytest.mark.parametrize("mutation", ["activate_planned","change_pool","reduce_budget","unknown_source","duplicate_source"])
def test_json_cannot_install_a_handler_change_channels_or_hide_stock_demand(mutation):
    doc=json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    if mutation=="activate_planned":doc["sources"][-2]["state"]="supported"
    if mutation=="change_pool":doc["sources"][0]["stock_pool"]="shop"
    if mutation=="reduce_budget":doc["sources"][0]["cosmetics_per_period"]["avatar_frame_id"]=0
    if mutation=="unknown_source":doc["sources"][0]["id"]="instant_reward"
    if mutation=="duplicate_source":doc["sources"].append(deepcopy(doc["sources"][0]))
    with pytest.raises(ContentPlanError):ContentSourceRegistry(doc)
    with pytest.raises(ContentPlanError,match="runtime adapter"):
        load_sources().require_supported("shop_collection")


@pytest.mark.parametrize("extra", [{"season_road":1},{"unknown":2},{"shop_collection":True},{"shop_collection":-1}])
def test_extra_demand_cannot_override_real_calendar_or_add_unknown_sources(extra):
    with pytest.raises(ContentPlanError):content_coverage(registry(),extra_periods=extra)


def test_stock_cli_reports_shortfall_and_rejects_planned_reservation_without_writes():
    before=CATALOG_PATH.read_bytes()
    args=[sys.executable,str(ROOT/"tools/prepare_liveops_rewards.py")]
    result=subprocess.run(args+["coverage","--check-stock","--starts-at","2027-01-04T00:00:00Z"],cwd=ROOT,capture_output=True,text=True,encoding="utf-8")
    assert result.returncode == 2 and not json.loads(result.stdout)["stock_ready"]
    result=subprocess.run(args+["reserve","--source","shop_collection","--period-id","2027-01-04","--release-id","no-handler"],cwd=ROOT,capture_output=True,text=True,encoding="utf-8")
    assert result.returncode == 2 and "runtime adapter" in result.stderr
    assert CATALOG_PATH.read_bytes() == before
