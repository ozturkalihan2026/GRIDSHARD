from dataclasses import dataclass

from .game.models import BattleState, BattleStatus
from .meta_progression import (
    MetaProgressionService,
    arena_floor_for_rating,
    rank_stage_for_rating,
    trophy_delta,
)
from .player_profile import PlayerProfileService


WIN_RATING_DELTA = 20
LOSS_RATING_DELTA = -20
DRAW_RATING_DELTA = 0

WIN_XP = 120
LOSS_XP = 70
DRAW_XP = 90
AI_REWARD_RATIO = 0.5


def match_circuit_credit_reward(
    rank: dict,
    *,
    won: bool,
    draw: bool,
    match_type: str,
) -> int:
    """Return the persistent Devre Kredisi granted after a completed battle.

    Arena 4 pays the 50-credit victory shown by the canonical result design.
    Rewards rise gently with progression, while a loss still gives a small
    consolation so a player is never locked out of module upgrades.
    """
    if match_type == "local_test":
        return 0
    stage_index = int(rank.get("index", 1))
    if rank.get("kind") != "arena":
        stage_index += 12
    victory_reward = min(100, 35 + max(0, stage_index - 1) * 5)
    reward = (
        victory_reward
        if won
        else max(12, round(victory_reward * (0.5 if draw else 0.3)))
    )
    if match_type == "unranked_ai":
        reward = max(1, round(reward * AI_REWARD_RATIO))
    return int(reward)

MATCH_LABELS_TR = {
    "arena_ai": "Arena Savaşı",
    "ranked_pvp": "Dereceli PvP",
    "unranked_ai": "Derecesiz AI",
    "local_test": "Yerel Test",
}


@dataclass(slots=True, frozen=True)
class ProgressionResult:
    player_id: str
    rating_before: int
    rating_after: int
    rating_delta: int
    circuit_credits_awarded: int
    xp_awarded: int
    level_after: int
    experience_after: int
    season_xp_awarded: int
    season_xp_after: int
    match_type: str
    match_label_tr: str
    ranked_eligible: bool
    tier_before: int
    tier_after: int
    tier_advanced: dict | None
    rank_before: dict
    rank_after: dict
    chest_awarded: dict | None

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "rating_before": self.rating_before,
            "rating_after": self.rating_after,
            "rating_delta": self.rating_delta,
            "circuit_credits_awarded": self.circuit_credits_awarded,
            "xp_awarded": self.xp_awarded,
            "level_after": self.level_after,
            "experience_after": self.experience_after,
            "season_xp_awarded": self.season_xp_awarded,
            "season_xp_after": self.season_xp_after,
            "match_type": self.match_type,
            "match_label_tr": self.match_label_tr,
            "ranked_eligible": self.ranked_eligible,
            "tier_before": self.tier_before,
            "tier_after": self.tier_after,
            "tier_advanced": self.tier_advanced,
            "rank_before": self.rank_before,
            "rank_after": self.rank_after,
            "chest_awarded": self.chest_awarded,
        }


class PlayerProgressionError(ValueError):
    pass


class PlayerProgressionService:
    def __init__(
        self,
        profile_service: PlayerProfileService,
        meta_progression_service: MetaProgressionService | None = None,
    ):
        self.profile_service = profile_service
        self.meta_progression_service = (
            meta_progression_service or MetaProgressionService()
        )
        self._processed_battle_ids: set[str] = set()
        self._results_by_battle_id: dict[
            str,
            dict[str, ProgressionResult],
        ] = {}

    def process_finished_battle(
        self,
        state: BattleState,
    ) -> bool:
        if state.status != BattleStatus.FINISHED:
            raise PlayerProgressionError(
                "Yalnızca tamamlanmış maç ilerlemeye işlenebilir."
            )

        if state.battle_id in self._processed_battle_ids:
            return False

        battle_results: dict[
            str,
            ProgressionResult,
        ] = {}

        account_player_ids = (
            state.account_player_ids
            if state.account_player_ids
            else tuple(state.players)
        )
        ratings_before = {
            player_id: self.profile_service.get_or_create(player_id).rating
            for player_id in account_player_ids
        }
        for player_id in account_player_ids:
            profile = self.profile_service.get_or_create(
                player_id
            )
            rating_before = profile.rating
            rank_before = rank_stage_for_rating(rating_before)
            tier_before = int(profile.engagement_view()["current_tier"])

            opponent_id = next(
                (candidate for candidate in account_player_ids if candidate != player_id),
                None,
            )
            opponent_rating = (
                ratings_before[opponent_id]
                if opponent_id is not None
                else next((rating for candidate, rating in state.player_match_ratings.items() if candidate != player_id), rating_before)
            )

            if state.is_draw:
                rating_delta = trophy_delta(rating_before, opponent_rating, 0.5)
                xp_awarded = DRAW_XP
            elif state.winner_player_id == player_id:
                rating_delta = trophy_delta(rating_before, opponent_rating, 1.0)
                xp_awarded = WIN_XP
            else:
                rating_delta = trophy_delta(rating_before, opponent_rating, 0.0)
                xp_awarded = LOSS_XP

            if not state.ranked_eligible and state.match_type != "arena_ai":
                rating_delta = 0
            if state.match_type == "unranked_ai":
                xp_awarded = max(1, round(xp_awarded * AI_REWARD_RATIO))

            rating_after = max(
                arena_floor_for_rating(max(rating_before, profile.highest_rating)),
                rating_before + rating_delta,
            )

            self.profile_service.set_rating(
                player_id,
                rating_after,
            )
            updated = (
                self.profile_service
                .add_experience(
                    player_id,
                    xp_awarded,
                )
            )
            summary = state.result_summary.get(player_id, {})
            circuit_actions = sum(
                1
                for event in state.events
                if event.data.get("player_id") == player_id
                and event.type in {
                    "module_placed",
                    "module_moved",
                    "module_replaced",
                    "modules_swapped",
                }
            )
            updated = self.profile_service.record_battle_engagement(
                player_id,
                season_xp_awarded=xp_awarded,
                damage_dealt=int(summary.get("damage_dealt", 0)),
                circuit_actions=circuit_actions,
            )
            tier_after = int(updated.engagement_view()["current_tier"])
            player = state.players[player_id]
            won = state.winner_player_id == player_id
            circuit_credits_awarded = match_circuit_credit_reward(
                rank_before,
                won=won,
                draw=state.is_draw,
                match_type=state.match_type,
            )
            updated.circuit_credits += circuit_credits_awarded
            stats = updated.lifetime_stats
            stats["matches"] = stats.get("matches", 0) + 1
            if state.is_draw:
                stats["draws"] = stats.get("draws", 0) + 1
            elif won:
                stats["wins"] = stats.get("wins", 0) + 1
            else:
                stats["losses"] = stats.get("losses", 0) + 1
            stats["current_streak"] = stats.get("current_streak", 0) + 1 if won else 0
            stats["longest_streak"] = max(stats.get("longest_streak", 0), stats["current_streak"])
            stats["peak_damage"] = max(stats.get("peak_damage", 0), int(summary.get("damage_dealt", 0)))
            core_damage = 0
            for event in state.events:
                data = event.data
                if event.type != "module_damaged":
                    continue
                if data.get("source_player_id") != player_id:
                    continue
                target_player_id = str(data.get("player_id", ""))
                if not target_player_id or target_player_id == player_id:
                    continue
                target_player = state.players.get(target_player_id)
                target_module = (
                    target_player.modules.get(str(data.get("module_id", "")))
                    if target_player is not None
                    else None
                )
                if target_module is not None and target_module.definition.id == "core":
                    core_damage += max(0, int(data.get("damage", 0)))
            stats["core_damage_dealt"] = stats.get("core_damage_dealt", 0) + core_damage
            stats["current_spent"] = stats.get("current_spent", 0) + player.total_circuit_credits_spent
            stats["core_power_uses"] = stats.get("core_power_uses", 0) + player.core_power_uses
            stats["deployments"] = stats.get("deployments", 0) + sum(1 for m in player.modules.values() if m.definition.id != "core" and m.status.value in {"active", "destroyed"})
            deck = "|".join(sorted(player.battle_pool.module_definition_ids)) if player.battle_pool else ""
            if deck:
                usage = stats.setdefault("decks", {})
                usage[deck] = usage.get(deck, 0) + 1
            cores = stats.setdefault("cores", {})
            cores[player.core_type] = cores.get(player.core_type, 0) + 1
            if tier_after > tier_before:
                updated.core_skill_points += tier_after - tier_before
            tier_advanced = (
                {
                    "event_id": (
                        f"{state.battle_id}:{player_id}:tier:{tier_after}"
                    ),
                    "season_id": state.season_id,
                    "tier_before": tier_before,
                    "tier_after": tier_after,
                }
                if tier_after > tier_before
                else None
            )
            chest_awarded = self.meta_progression_service.award_battle_chest(
                updated,
                state.battle_id,
                bool(
                    (state.ranked_eligible or state.match_type == "arena_ai")
                    and state.winner_player_id == player_id
                ),
            )

            battle_results[player_id] = (
                ProgressionResult(
                    player_id=player_id,
                    rating_before=rating_before,
                    rating_after=updated.rating,
                    rating_delta=(
                        updated.rating
                        - rating_before
                    ),
                    circuit_credits_awarded=circuit_credits_awarded,
                    xp_awarded=xp_awarded,
                    level_after=updated.level,
                    experience_after=(
                        updated.experience
                    ),
                    season_xp_awarded=xp_awarded,
                    season_xp_after=updated.season_xp,
                    match_type=state.match_type,
                    match_label_tr=MATCH_LABELS_TR.get(
                        state.match_type,
                        state.match_type,
                    ),
                    ranked_eligible=state.ranked_eligible,
                    tier_before=tier_before,
                    tier_after=tier_after,
                    tier_advanced=tier_advanced,
                    rank_before=rank_before,
                    rank_after=rank_stage_for_rating(updated.rating),
                    chest_awarded=chest_awarded,
                )
            )

        self._processed_battle_ids.add(
            state.battle_id
        )
        self._results_by_battle_id[
            state.battle_id
        ] = battle_results
        return True

    def battle_results(
        self,
        battle_id: str,
    ) -> dict[str, dict]:
        results = self._results_by_battle_id.get(
            battle_id,
            {},
        )
        return {
            player_id: result.to_dict()
            for player_id, result
            in results.items()
        }

    def player_result(
        self,
        battle_id: str,
        player_id: str,
    ) -> dict | None:
        result = self._results_by_battle_id.get(
            battle_id,
            {},
        ).get(player_id)

        return (
            result.to_dict()
            if result is not None
            else None
        )
