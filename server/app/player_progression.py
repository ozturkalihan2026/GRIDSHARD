from dataclasses import dataclass

from .game.models import BattleState, BattleStatus
from .player_profile import PlayerProfileService


WIN_RATING_DELTA = 20
LOSS_RATING_DELTA = -20
DRAW_RATING_DELTA = 0

WIN_XP = 120
LOSS_XP = 70
DRAW_XP = 90


@dataclass(slots=True, frozen=True)
class ProgressionResult:
    player_id: str
    rating_before: int
    rating_after: int
    rating_delta: int
    xp_awarded: int
    level_after: int
    experience_after: int

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "rating_before": self.rating_before,
            "rating_after": self.rating_after,
            "rating_delta": self.rating_delta,
            "xp_awarded": self.xp_awarded,
            "level_after": self.level_after,
            "experience_after": self.experience_after,
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

        for player_id in state.players:
            profile = self.profile_service.get_or_create(
                player_id
            )
            rating_before = profile.rating

            if state.is_draw:
                rating_delta = DRAW_RATING_DELTA
                xp_awarded = DRAW_XP
            elif state.winner_player_id == player_id:
                rating_delta = WIN_RATING_DELTA
                xp_awarded = WIN_XP
            else:
                rating_delta = LOSS_RATING_DELTA
                xp_awarded = LOSS_XP

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
