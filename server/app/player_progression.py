from dataclasses import dataclass

from .game.models import BattleState, BattleStatus
from .player_profile import PlayerProfileService


WIN_RATING_DELTA = 20
LOSS_RATING_DELTA = -20
DRAW_RATING_DELTA = 0

WIN_XP = 120
LOSS_XP = 70
DRAW_XP = 90
AI_REWARD_RATIO = 0.5

MATCH_LABELS_TR = {
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

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "rating_before": self.rating_before,
            "rating_after": self.rating_after,
            "rating_delta": self.rating_delta,
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
        }


class PlayerProgressionError(ValueError):
    pass


class PlayerProgressionService:
    def __init__(
        self,
        profile_service: PlayerProfileService,
    ):
        self.profile_service = profile_service
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
        for player_id in account_player_ids:
            profile = self.profile_service.get_or_create(
                player_id
            )
            rating_before = profile.rating
            tier_before = int(profile.engagement_view()["current_tier"])

            if state.is_draw:
                rating_delta = DRAW_RATING_DELTA
                xp_awarded = DRAW_XP
            elif state.winner_player_id == player_id:
                rating_delta = WIN_RATING_DELTA
                xp_awarded = WIN_XP
            else:
                rating_delta = LOSS_RATING_DELTA
                xp_awarded = LOSS_XP

            if not state.ranked_eligible:
                rating_delta = 0
            if state.match_type == "unranked_ai":
                xp_awarded = max(1, round(xp_awarded * AI_REWARD_RATIO))

            rating_after = max(
                0,
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
                    "module_moved",
                    "module_replaced",
                    "modules_swapped",
                    "module_rotated",
                }
            )
            updated = self.profile_service.record_battle_engagement(
                player_id,
                season_xp_awarded=xp_awarded,
                damage_dealt=int(summary.get("damage_dealt", 0)),
                circuit_actions=circuit_actions,
            )
            tier_after = int(updated.engagement_view()["current_tier"])
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

            battle_results[player_id] = (
                ProgressionResult(
                    player_id=player_id,
                    rating_before=rating_before,
                    rating_after=updated.rating,
                    rating_delta=(
                        updated.rating
                        - rating_before
                    ),
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
