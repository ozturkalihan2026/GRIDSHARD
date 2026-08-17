from app.player_data_store import (
    JsonFilePlayerDataRepository,
    PlayerDataStoreService,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.player_settings import (
    PlayerSettingsService,
)
from app.player_statistics import (
    PlayerStatisticsService,
)


def make_store(path):
    profiles=PlayerProfileService()
    statistics=PlayerStatisticsService()
    settings=PlayerSettingsService()
    store=PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=statistics,
        settings_service=settings,
        repository=(
            JsonFilePlayerDataRepository(
                path
            )
        ),
    )
    return (
        profiles,
        statistics,
        settings,
        store,
    )


def test_player_snapshot_restores_after_process_restart(tmp_path):
    path=tmp_path/"players.json"

    (
        profiles,
        statistics,
        settings,
        store,
    )=make_store(path)

    profiles.set_display_name(
        "wt-restart-123456",
        "Kalıcı Oyuncu",
    )
    profiles.set_rating(
        "wt-restart-123456",
        1325,
    )
    settings.update(
        "wt-restart-123456",
        sound_volume=37,
        language="en",
    )
    stats=statistics.get_or_create(
        "wt-restart-123456"
    )
    stats.total_matches=7
    stats.wins=4
    stats.losses=2
    stats.draws=1

    store.save_player(
        "wt-restart-123456"
    )

    (
        new_profiles,
        new_statistics,
        new_settings,
        restarted_store,
    )=make_store(path)

    restarted_store.load_player(
        "wt-restart-123456"
    )

    assert (
        new_profiles
        .get_or_create(
            "wt-restart-123456"
        )
        .display_name
        == "Kalıcı Oyuncu"
    )
    assert (
        new_profiles
        .get_or_create(
            "wt-restart-123456"
        )
        .rating
        == 1325
    )
    assert (
        new_statistics
        .get_or_create(
            "wt-restart-123456"
        )
        .total_matches
        == 7
    )
    assert (
        new_settings
        .get_or_create(
            "wt-restart-123456"
        )
        .sound_volume
        == 37
    )
    assert (
        new_settings
        .get_or_create(
            "wt-restart-123456"
        )
        .language
        == "en"
    )
