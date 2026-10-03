import pytest
from concurrent.futures import ThreadPoolExecutor

from app.player_profile import PlayerProfileError, PlayerProfileService
from test_player_data_store import build_store


def test_only_one_change_and_lost_response_retry():
    service = PlayerProfileService()
    profile = service.get_or_create("wt-once-account")
    assert profile.to_view()["display_name_changes_remaining"] == 1
    service.set_display_name(profile.player_id, profile.display_name)
    assert profile.display_name_changes == 0
    service.set_display_name(profile.player_id, "Devre Bir")
    service.set_display_name(profile.player_id, " Devre   Bir ")
    with pytest.raises(PlayerProfileError, match="yalnız bir kez"):
        service.set_display_name(profile.player_id, "Devre İki")
    assert profile.display_name == "Devre Bir"
    assert profile.to_view()["display_name_changes_remaining"] == 0


def test_invalid_or_taken_name_does_not_consume_right():
    service = PlayerProfileService()
    service.set_display_name("other", "Alınmış")
    for name in ("", "Alınmış"):
        with pytest.raises(PlayerProfileError):
            service.set_display_name("fresh", name)
    assert service.get("fresh").display_name_changes == 0


def test_concurrent_changes_only_one_wins():
    service = PlayerProfileService()
    def rename(name):
        try:
            service.set_display_name("wt-concurrent-name", name)
            return True
        except PlayerProfileError:
            return False
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(rename, ("Devre A", "Devre B"))) == 1


def test_failed_persistence_rolls_back_name_and_right(monkeypatch):
    from app import main as gateway
    player = "wt-rollback-once"
    profile = gateway.player_profile_service.get_or_create(player)
    previous = profile.display_name
    def failed_save(_player):
        raise OSError("disposable persistence failure")
    monkeypatch.setattr(gateway, "persist_player_data", failed_save)
    with pytest.raises(OSError):
        gateway.update_profile_display_name(player, gateway.ProfileNameRequest(display_name="Yeni Ad"))
    assert profile.display_name == previous
    assert profile.display_name_changes == 0


def test_persisted_limit_survives_reload():
    store, profiles, _, _, _ = build_store()
    profiles.set_display_name("wt-reload-account", "Kalıcı Ad")
    store.save_player("wt-reload-account")
    profiles._profiles.clear()
    store.load_player("wt-reload-account")
    assert profiles.get("wt-reload-account").display_name_changes == 1
    with pytest.raises(PlayerProfileError):
        profiles.set_display_name("wt-reload-account", "İkinci Ad")


@pytest.mark.parametrize("custom", [False, True])
def test_legacy_custom_name_already_used_right(custom):
    store, profiles, _, _, repo = build_store()
    player = "wt-legacy-name"
    profiles.get_or_create(player)
    if custom:
        profiles.set_display_name(player, "Eski Özel Ad")
    store.save_player(player)
    repo._snapshots[player].profile.pop("display_name_changes")
    profiles._profiles.clear()
    store.load_player(player)
    assert profiles.get(player).display_name_changes == int(custom)
