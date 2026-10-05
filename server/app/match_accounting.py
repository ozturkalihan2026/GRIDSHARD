"""Canonical account-impact rules for every battle mode."""

RANKED_PVP_MATCH_TYPES = frozenset({"arena_ai", "ranked_pvp"})
# İlk oyun deneyimi Ayarlar'dan yeniden başlatıldığında oynanan yönetmenli
# savaş. İlk savaşın aksine hesaba hiçbir etkisi yoktur (bkz. game/tutorial.py).
TUTORIAL_TRAINING_MATCH_TYPE = "tutorial_training"
PROFILE_NEUTRAL_MATCH_TYPES = frozenset(
    {"friend_battle", "team_training", TUTORIAL_TRAINING_MATCH_TYPE}
)
TOURNAMENT_ONLY_MATCH_TYPES = frozenset({"team_tournament"})
PROFILE_EXCLUDED_MATCH_TYPES = (
    PROFILE_NEUTRAL_MATCH_TYPES | TOURNAMENT_ONLY_MATCH_TYPES
)


def applies_to_profile_progression(match_type: str) -> bool:
    """Return whether a battle may mutate normal player progression/stats."""
    return match_type not in PROFILE_EXCLUDED_MATCH_TYPES


def contributes_to_weekly_tournament(match_type: str) -> bool:
    """Weekly standings count only trophies won in normal ranked PvP."""
    return match_type in RANKED_PVP_MATCH_TYPES
