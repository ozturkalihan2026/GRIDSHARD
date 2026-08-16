from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .player_profile import (
    PlayerProfile,
    PlayerProfileService,
)
from .player_settings import (
    PlayerSettings,
    PlayerSettingsService,
)
from .player_statistics import (
    PlayerStatistics,
    PlayerStatisticsService,
)


@dataclass(slots=True, frozen=True)
class PlayerDataSnapshot:
    player_id: str
    profile: dict
    statistics: dict
    settings: dict

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "profile": dict(self.profile),
            "statistics": dict(
                self.statistics
            ),
            "settings": dict(self.settings),
        }


class PlayerDataRepository(Protocol):
    def save(
        self,
        snapshot: PlayerDataSnapshot,
    ) -> None: ...

    def load(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot | None: ...

    def delete(
        self,
        player_id: str,
    ) -> bool: ...


class InMemoryPlayerDataRepository:
    def __init__(self):
        self._snapshots: dict[
            str,
            PlayerDataSnapshot,
        ] = {}

    def save(
        self,
        snapshot: PlayerDataSnapshot,
    ) -> None:
        self._snapshots[
            snapshot.player_id
        ] = PlayerDataSnapshot(
            player_id=snapshot.player_id,
            profile=dict(snapshot.profile),
            statistics=dict(
                snapshot.statistics
            ),
            settings=dict(snapshot.settings),
        )

    def load(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot | None:
        snapshot = self._snapshots.get(
            player_id
        )
        if snapshot is None:
            return None

        return PlayerDataSnapshot(
            player_id=snapshot.player_id,
            profile=dict(snapshot.profile),
            statistics=dict(
                snapshot.statistics
            ),
            settings=dict(snapshot.settings),
        )

    def delete(
        self,
        player_id: str,
    ) -> bool:
        return self._snapshots.pop(
            player_id,
            None,
        ) is not None


class PlayerDataStoreError(ValueError):
    pass


class PlayerDataStoreService:
    def __init__(
        self,
        *,
        profile_service: PlayerProfileService,
        statistics_service: PlayerStatisticsService,
        settings_service: PlayerSettingsService,
        repository: PlayerDataRepository,
    ):
        self.profile_service = profile_service
        self.statistics_service = (
            statistics_service
        )
        self.settings_service = (
            settings_service
        )
        self.repository = repository

    def build_snapshot(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        profile = (
            self.profile_service
            .get_or_create(player_id)
        )
        statistics = (
            self.statistics_service
            .get_or_create(player_id)
        )
        settings = (
            self.settings_service
            .get_or_create(player_id)
        )

        return PlayerDataSnapshot(
            player_id=player_id,
            profile=profile.to_view(),
            statistics=statistics.to_view(),
            settings=settings.to_view(),
        )

    def save_player(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        snapshot = self.build_snapshot(
            player_id
        )
        self.repository.save(snapshot)
        return snapshot

    def load_player(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        snapshot = self.repository.load(
            player_id
        )

        if snapshot is None:
            raise PlayerDataStoreError(
                "Kayıtlı oyuncu verisi bulunamadı."
            )

        self._restore_profile(
            snapshot.profile
        )
        self._restore_statistics(
            snapshot.statistics
        )
        self._restore_settings(
            snapshot.settings
        )

        return snapshot

    def _restore_profile(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]
        profile=PlayerProfile(
            player_id=player_id,
            display_name=data[
                "display_name"
            ],
            level=int(data["level"]),
            experience=int(
                data["experience"]
            ),
            rating=int(data["rating"]),
            preferred_battle_pool_ids=tuple(
                data[
                    "preferred_battle_pool_ids"
                ]
            ),
        )
        self.profile_service._profiles[
            player_id
        ] = profile

    def _restore_statistics(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]
        usage = {
            item["definition_id"]:
                int(item["matches_used"])
            for item
            in data.get(
                "most_used_modules",
                [],
            )
        }

        stats=PlayerStatistics(
            player_id=player_id,
            total_matches=int(
                data["total_matches"]
            ),
            wins=int(data["wins"]),
            losses=int(data["losses"]),
            draws=int(data["draws"]),
            total_match_duration_ms=(
                int(
                    data[
                        "average_match_duration_ms"
                    ]
                )
                * int(
                    data["total_matches"]
                )
            ),
            total_damage_dealt=int(
                data[
                    "total_damage_dealt"
                ]
            ),
            module_replacements=int(
                data[
                    "module_replacements"
                ]
            ),
            boosters_used=int(
                data["boosters_used"]
            ),
            module_usage=usage,
        )

        self.statistics_service._statistics[
            player_id
        ] = stats

    def _restore_settings(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]

        self.settings_service._settings[
            player_id
        ] = PlayerSettings(
            player_id=player_id,
            sound_volume=int(
                data["sound_volume"]
            ),
            music_volume=int(
                data["music_volume"]
            ),
            vibration_enabled=bool(
                data[
                    "vibration_enabled"
                ]
            ),
            graphics_quality=str(
                data[
                    "graphics_quality"
                ]
            ),
            language=str(
                data["language"]
            ),
        )
