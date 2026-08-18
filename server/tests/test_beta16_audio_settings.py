from app.player_settings import (
    PlayerSettingsService,
)


def test_audio_mute_preferences_persist_in_settings_view():
    service=PlayerSettingsService()
    settings=service.update(
        "p1",
        sound_volume=44,
        music_volume=31,
        sound_muted=True,
        music_muted=True,
    )

    view=settings.to_view()
    assert view["sound_volume"]==44
    assert view["music_volume"]==31
    assert view["sound_muted"] is True
    assert view["music_muted"] is True
