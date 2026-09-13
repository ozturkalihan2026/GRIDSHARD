from app.player_profile import DAILY_MISSIONS, PlayerProfileService


def test_daily_command_reward_claim_is_receipted_and_idempotent():
    service = PlayerProfileService()
    mission = next(item for item in DAILY_MISSIONS if item["id"] == "deal_damage")
    day_key = "2026-09-12"

    before = service.record_battle_engagement(
        "beta48-daily-command",
        season_xp_awarded=0,
        damage_dealt=int(mission["target"]),
        circuit_actions=0,
        day_key=day_key,
    )
    request_id = "beta48-daily-command-claim"
    claimed = service.claim_daily_mission(
        before.player_id,
        mission["id"],
        day_key=day_key,
        request_id=request_id,
    )
    season_xp_after_claim = claimed.season_xp
    flux_after_claim = claimed.flux_shards

    replayed = service.claim_daily_mission(
        before.player_id,
        mission["id"],
        day_key=day_key,
        request_id=request_id,
    )

    assert mission["id"] in replayed.claimed_daily_missions
    assert replayed.season_xp == season_xp_after_claim
    assert replayed.flux_shards == flux_after_claim
    assert replayed.engagement_claim_receipts[request_id] == {
        "kind": "missions",
        "mission_id": mission["id"],
        "day": day_key,
    }


def test_daily_command_reward_can_be_claimed_again_on_the_next_day():
    service = PlayerProfileService()
    mission = next(item for item in DAILY_MISSIONS if item["id"] == "deal_damage")
    player_id = "beta49-daily-command-reset"

    first_day = "2026-09-12"
    first_progress = service.record_battle_engagement(
        player_id,
        season_xp_awarded=0,
        damage_dealt=int(mission["target"]),
        circuit_actions=0,
        day_key=first_day,
    )
    first_claim = service.claim_daily_mission(
        first_progress.player_id,
        mission["id"],
        day_key=first_day,
        request_id=f"daily-mission:{first_day}:{mission['id']}",
    )
    first_season_xp = first_claim.season_xp
    first_flux_shards = first_claim.flux_shards

    second_day = "2026-09-13"
    second_progress = service.record_battle_engagement(
        player_id,
        season_xp_awarded=0,
        damage_dealt=int(mission["target"]),
        circuit_actions=0,
        day_key=second_day,
    )
    second_claim = service.claim_daily_mission(
        second_progress.player_id,
        mission["id"],
        day_key=second_day,
        request_id=f"daily-mission:{second_day}:{mission['id']}",
    )

    assert mission["id"] in second_claim.claimed_daily_missions
    assert second_claim.season_xp > first_season_xp
    assert second_claim.flux_shards > first_flux_shards
    assert len(second_claim.engagement_claim_receipts) == 2
