from dataclasses import dataclass
from typing import Callable
from uuid import uuid4


BASE_RATING_WINDOW = 100
RATING_WINDOW_EXPANSION = 50
EXPANSION_INTERVAL_SECONDS = 10
MAX_RATING_WINDOW = 400


@dataclass(slots=True)
class MatchmakingEntry:
    player_id: str
    rating: int
    league_name_tr: str
    level: int
    joined_at: float


@dataclass(slots=True, frozen=True)
class MatchmakingPair:
    match_id: str
    player_a_id: str
    player_b_id: str
    rating_difference: int
    matched_at: float = 0.0
    opponent_type: str = "human"


class MatchmakingError(ValueError):
    pass


class MatchmakingService:
    def __init__(
        self,
        *,
        now_func: Callable[[], float],
    ):
        self.now_func = now_func
        self._queue: dict[str, MatchmakingEntry] = {}
        self._matches_by_player: dict[
            str,
            MatchmakingPair,
        ] = {}

    def enqueue(
        self,
        player_id: str,
        *,
        rating: int,
        league_name_tr: str,
        level: int,
    ) -> MatchmakingEntry:
        if not player_id:
            raise MatchmakingError(
                "Oyuncu kimliği boş olamaz."
            )
        if player_id in self._queue:
            return self._queue[player_id]

        entry = MatchmakingEntry(
            player_id=player_id,
            rating=max(0, int(rating)),
            league_name_tr=league_name_tr,
            level=max(1, int(level)),
            joined_at=self.now_func(),
        )
        self._queue[player_id] = entry
        return entry

    def cancel(
        self,
        player_id: str,
    ) -> bool:
        return self._queue.pop(
            player_id,
            None,
        ) is not None

    def queued(
        self,
        player_id: str,
    ) -> bool:
        return player_id in self._queue

    def accepted_rating_window(
        self,
        entry: MatchmakingEntry,
    ) -> int:
        waited = max(
            0.0,
            self.now_func() - entry.joined_at,
        )
        expansions = int(
            waited
            // EXPANSION_INTERVAL_SECONDS
        )
        return min(
            MAX_RATING_WINDOW,
            BASE_RATING_WINDOW
            + expansions
            * RATING_WINDOW_EXPANSION,
        )

    def try_match(
        self,
        player_id: str,
    ) -> MatchmakingPair | None:
        if player_id not in self._queue:
            raise MatchmakingError(
                "Oyuncu eşleştirme kuyruğunda değil."
            )

        source = self._queue[player_id]
        source_window = self.accepted_rating_window(
            source
        )

        candidates = []
        for candidate in self._queue.values():
            if candidate.player_id == player_id:
                continue

            candidate_window = (
                self.accepted_rating_window(
                    candidate
                )
            )
            difference = abs(
                source.rating
                - candidate.rating
            )

            if (
                difference <= source_window
                and difference
                <= candidate_window
            ):
                candidates.append(
                    (
                        difference,
                        candidate.joined_at,
                        candidate.player_id,
                        candidate,
                    )
                )

        if not candidates:
            return None

        candidates.sort(
            key=lambda item: (
                item[0],
                item[1],
                item[2],
            )
        )
        candidate = candidates[0][3]

        self._queue.pop(
            source.player_id,
            None,
        )
        self._queue.pop(
            candidate.player_id,
            None,
        )

        pair = MatchmakingPair(
            match_id=f"mm-{uuid4().hex}",
            player_a_id=source.player_id,
            player_b_id=candidate.player_id,
            rating_difference=abs(
                source.rating
                - candidate.rating
            ),
            matched_at=self.now_func(),
        )

        self._matches_by_player[
            pair.player_a_id
        ] = pair
        self._matches_by_player[
            pair.player_b_id
        ] = pair

        return pair

    def match_with_ai(
        self,
        player_id: str,
    ) -> MatchmakingPair:
        """10 saniyelik insan aramasından sonra kuyruğu AI rakiple kapatır."""
        if player_id not in self._queue:
            existing = self.matched_pair_for(player_id)
            if existing is not None:
                return existing
            raise MatchmakingError(
                "Oyuncu AI eşleştirmesi için kuyrukta değil."
            )

        source = self._queue.pop(player_id)
        match_id = f"local-ai-match-{uuid4().hex}"
        ai_player_id = f"{match_id}-opponent"
        pair = MatchmakingPair(
            match_id=match_id,
            player_a_id=source.player_id,
            player_b_id=ai_player_id,
            rating_difference=0,
            matched_at=self.now_func(),
            opponent_type="ai",
        )
        self._matches_by_player[pair.player_a_id] = pair
        self._matches_by_player[pair.player_b_id] = pair
        return pair

    def matched_pair_for(
        self,
        player_id: str,
    ) -> MatchmakingPair | None:
        return self._matches_by_player.get(
            player_id
        )

    def clear_match(
        self,
        player_id: str,
    ) -> None:
        pair = self._matches_by_player.get(
            player_id
        )
        if pair is None:
            return

        self._matches_by_player.pop(
            pair.player_a_id,
            None,
        )
        self._matches_by_player.pop(
            pair.player_b_id,
            None,
        )

    def cleanup_expired(
        self,
        *,
        queue_ttl_seconds: float = 180.0,
        match_ttl_seconds: float = 900.0,
    ) -> dict[str, int]:
        now = self.now_func()
        expired_queue = [
            player_id
            for player_id, entry in self._queue.items()
            if now - entry.joined_at >= queue_ttl_seconds
        ]
        for player_id in expired_queue:
            self._queue.pop(player_id, None)

        unique_pairs = {
            pair.match_id: pair
            for pair in self._matches_by_player.values()
        }
        expired_matches = [
            pair
            for pair in unique_pairs.values()
            if now - pair.matched_at >= match_ttl_seconds
        ]
        for pair in expired_matches:
            self.clear_match(pair.player_a_id)

        return {
            "queue_entries": len(expired_queue),
            "matches": len(expired_matches),
        }

    def queue_snapshot(
        self,
        player_id: str,
    ) -> dict:
        pair = self.matched_pair_for(
            player_id
        )
        if pair is not None:
            return {
                "queued": False,
                "matched": True,
                "player_id": player_id,
                "session_id": pair.match_id,
                "players": [
                    pair.player_a_id,
                    pair.player_b_id,
                ],
                "rating_difference": (
                    pair.rating_difference
                ),
                "opponent_type": pair.opponent_type,
            }

        entry = self._queue.get(
            player_id
        )
        if entry is None:
            return {
                "queued": False,
                "matched": False,
                "player_id": player_id,
            }

        waited_seconds = max(
            0,
            int(
                self.now_func()
                - entry.joined_at
            ),
        )

        return {
            "queued": True,
            "matched": False,
            "player_id": entry.player_id,
            "rating": entry.rating,
            "league_name_tr": (
                entry.league_name_tr
            ),
            "level": entry.level,
            "waited_seconds": (
                waited_seconds
            ),
            "accepted_rating_window": (
                self.accepted_rating_window(
                    entry
                )
            ),
        }
