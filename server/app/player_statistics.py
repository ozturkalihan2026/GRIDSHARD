from dataclasses import dataclass, field

from .game.models import BattleState, BattleStatus


HABIT_EXCLUDED_DEFINITION_IDS = frozenset({"core", "generator"})


@dataclass(slots=True)
class PlayerStatistics:
    player_id: str
    total_matches: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    total_match_duration_ms: int = 0
    total_damage_dealt: int = 0
    module_replacements: int = 0
    boosters_used: int = 0
    module_usage: dict[str, int] = field(
        default_factory=dict
    )
    match_type_records: dict[str, dict[str, int]] = field(default_factory=dict)

    @property
    def win_rate(self) -> float:
        if self.total_matches == 0:
            return 0.0
        return self.wins / self.total_matches

    @property
    def average_match_duration_ms(self) -> int:
        if self.total_matches == 0:
            return 0
        return round(
            self.total_match_duration_ms
            / self.total_matches
        )

    def to_view(self) -> dict:
        most_used = sorted(
            (
                item
                for item in self.module_usage.items()
                if item[0] not in HABIT_EXCLUDED_DEFINITION_IDS
            ),
            key=lambda item: (
                -item[1],
                item[0],
            ),
        )

        return {
            "player_id": self.player_id,
            "total_matches": self.total_matches,
            "wins": self.wins,
            "losses": self.losses,
            "draws": self.draws,
            "win_rate": round(
                self.win_rate,
                6,
            ),
            "average_match_duration_ms": (
                self.average_match_duration_ms
            ),
            "total_damage_dealt": (
                self.total_damage_dealt
            ),
            "module_replacements": (
                self.module_replacements
            ),
            "boosters_used": self.boosters_used,
            "most_used_modules": [
                {
                    "definition_id": definition_id,
                    "matches_used": count,
                }
                for definition_id, count in most_used
            ],
            "by_match_type": {
                match_type: dict(record)
                for match_type, record in sorted(self.match_type_records.items())
            },
            "ranked_matches": self.match_type_records.get(
                "ranked_pvp", {}
            ).get("matches", 0),
            "unranked_ai_matches": self.match_type_records.get(
                "unranked_ai", {}
            ).get("matches", 0),
            "local_test_matches": self.match_type_records.get(
                "local_test", {}
            ).get("matches", 0),
        }


class PlayerStatisticsError(ValueError):
    pass


class PlayerStatisticsService:
    def __init__(self):
        self._statistics: dict[
            str,
            PlayerStatistics,
        ] = {}
        self._processed_battle_ids: set[str] = set()

    def get_or_create(
        self,
        player_id: str,
    ) -> PlayerStatistics:
        if not player_id:
            raise PlayerStatisticsError(
                "Oyuncu kimliği boş olamaz."
            )
        return self._statistics.setdefault(
            player_id,
            PlayerStatistics(
                player_id=player_id
            ),
        )

    def process_finished_battle(
        self,
        state: BattleState,
    ) -> bool:
        if state.status != BattleStatus.FINISHED:
            raise PlayerStatisticsError(
                "Yalnızca tamamlanmış maç istatistiğe işlenebilir."
            )

        if state.battle_id in self._processed_battle_ids:
            return False

        account_player_ids = (
            state.account_player_ids
            if state.account_player_ids
            else tuple(state.players)
        )
        for player_id in account_player_ids:
            player = state.players[player_id]
            stats = self.get_or_create(
                player_id
            )

            stats.total_matches += 1
            match_record = stats.match_type_records.setdefault(
                state.match_type,
                {"matches": 0, "wins": 0, "losses": 0, "draws": 0},
            )
            match_record["matches"] += 1

            if state.is_draw:
                stats.draws += 1
                match_record["draws"] += 1
            elif state.winner_player_id == player_id:
                stats.wins += 1
                match_record["wins"] += 1
            else:
                stats.losses += 1
                match_record["losses"] += 1

            stats.total_match_duration_ms += int(
                state.finished_at_ms
                if state.finished_at_ms is not None
                else state.elapsed_ms
            )

            summary = state.result_summary.get(
                player_id,
                {},
            )
            stats.total_damage_dealt += int(
                summary.get(
                    "damage_dealt",
                    0,
                )
            )

            stats.module_replacements += sum(
                1
                for event in state.events
                if event.type == "module_replaced"
                and event.data.get("player_id")
                == player_id
            )

            stats.boosters_used += sum(
                1
                for event in state.events
                if event.type == "booster_applied"
                and event.data.get("player_id")
                == player_id
            )

            for definition_id in self._used_definition_ids(
                state,
                player_id,
            ):
                stats.module_usage[definition_id] = (
                    stats.module_usage.get(
                        definition_id,
                        0,
                    )
                    + 1
                )

        self._processed_battle_ids.add(
            state.battle_id
        )
        return True

    def _used_definition_ids(
        self,
        state: BattleState,
        player_id: str,
    ) -> set[str]:
        player = state.players[player_id]
        instance_to_definition = {
            module.instance_id:
                module.definition.id
            for module in player.modules.values()
        }

        used: set[str] = set()

        for module in player.modules.values():
            if module.status.value in {
                "active",
                "destroyed",
            }:
                used.add(
                    module.definition.id
                )

        for event in state.events:
            if event.data.get("player_id") != player_id:
                continue

            candidate_ids = (
                event.data.get("module_id"),
                event.data.get(
                    "incoming_module_id"
                ),
                event.data.get(
                    "outgoing_module_id"
                ),
            )

            for instance_id in candidate_ids:
                definition_id = (
                    instance_to_definition.get(
                        instance_id
                    )
                )
                if definition_id:
                    if definition_id not in HABIT_EXCLUDED_DEFINITION_IDS:
                        used.add(definition_id)

        return used - HABIT_EXCLUDED_DEFINITION_IDS
