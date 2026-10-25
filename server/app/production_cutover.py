"""Pure profile conversion for the one-time beta→production operation."""
from copy import deepcopy

from .arena_canon import MODULES, ARENAS, RANK_STAGES, GRIDSHARD_SUMMIT_RATING
from .player_profile import PlayerProfileService, SEASON_REWARD_TRACK, COSMETIC_UNLOCK_SOURCES, OPERATOR_TITLE_STAGES
from .player_statistics import PlayerStatisticsService
from .player_settings import PlayerSettingsService
from .player_data_store import PlayerDataStoreService, InMemoryPlayerDataRepository
from .meta_progression import CORE_TYPES
from .season_competition import LEADERBOARD_PRIZES, WEEKLY_PRIZES, TEAM_PRIZES


def reset_snapshot(player_id, old_profile, old_settings, *, owner=False):
    meta = dict(old_profile.get("meta_progression_state") or {})
    receipts = deepcopy(meta.get("purchase_receipts") or {})
    if any(r.get("environment") == "production" or r.get("test") is False for r in receipts.values()):
        raise ValueError("Real purchase migration must be planned before resetting this account")
    profiles, stats = PlayerProfileService(), PlayerStatisticsService()
    p = profiles.get_or_create(player_id, display_name=old_profile["display_name"])
    p.team_id, p.team_name = old_profile.get("team_id"), old_profile.get("team_name")
    p.purchase_receipts = receipts  # Keep deduplication; test grants are reset.
    if owner:
        p.rating = p.highest_rating = GRIDSHARD_SUMMIT_RATING
        p.circuit_credits, p.flux_shards = 1_000_000, 1_000_000
        p.module_upgrade_levels = {key:14 for key in MODULES}
        p.module_talents = {key:{str(i):"power" for i in range(4)} for key in MODULES}
        p.core_upgrade_levels = {c["id"]:14 for c in CORE_TYPES}
        p.core_skills = {c["id"]:tuple(f"{i}_energy" for i in range(3)) for c in CORE_TYPES}
        p.arena_reward_claims = tuple(dict.fromkeys(n["id"] for s in (*ARENAS,*RANK_STAGES) for n in s.get("nodes", ())))
        p.operator_title_claims = tuple(s["id"] for s in OPERATOR_TITLE_STAGES)
        p.unlocked_titles = tuple(s["title_tr"] for s in OPERATOR_TITLE_STAGES)
        p.equipped_title = OPERATOR_TITLE_STAGES[-1]["title_tr"]
        p.season_xp = SEASON_REWARD_TRACK[-1]["required_xp"]
        p.claimed_season_tiers = p.claimed_premium_season_tiers = tuple(range(1,41))
        p.claimed_login_period_days = tuple(range(1,29))
        mappings = {"avatar":"unlocked_avatar_ids", "avatar_frame":"unlocked_avatar_frame_ids",
                    "battle_emoji":"unlocked_battle_emoji_ids", "profile_background":"unlocked_profile_background_ids"}
        for kind,attr in mappings.items():
            setattr(p,attr,tuple(dict.fromkeys((*getattr(p,attr), *COSMETIC_UNLOCK_SOURCES[kind]))))
        prizes = (*LEADERBOARD_PRIZES,*WEEKLY_PRIZES,*TEAM_PRIZES)
        p.unlocked_badge_ids = tuple(dict.fromkeys(prize["badge_id"] for prize in prizes if prize.get("badge_id")))
        p.unlocked_rank_trophy_ids = tuple(dict.fromkeys(prize["rank_trophy_id"] for prize in prizes if prize.get("rank_trophy_id")))
        wins = max(s["required_wins"] for s in OPERATOR_TITLE_STAGES)
        stats.get_or_create(player_id).total_matches = wins
        stats.get_or_create(player_id).wins = wins
        p.lifetime_stats = {"wins":wins,"matches":wins}
    service = PlayerDataStoreService(profile_service=profiles, statistics_service=stats,
                                    settings_service=PlayerSettingsService(), repository=InMemoryPlayerDataRepository())
    snapshot = service.build_snapshot(player_id)
    return {"profile":snapshot.profile, "statistics":snapshot.statistics, "settings":deepcopy(old_settings)}
