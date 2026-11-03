from copy import deepcopy
from types import SimpleNamespace

import pytest

from app import main as gateway
from app.game.battle_pool import DEFAULT_BATTLE_POOL_IDS
from app.meta_progression import current_most_used_decks
from app.player_profile import PlayerProfileService
from app.release_updates import INBOX_UPDATE_NOTICES, update_notices


def test_retired_deck_history_cannot_hide_real_current_decks_and_is_preserved():
    current = "|".join(DEFAULT_BATTLE_POOL_IDS)
    new_cards = "|".join(("burst_cannon", "shield_breaker", "buffer_shield", "last_bastion", "cleanser", "speed_relay"))
    history = {"laser|battery|cooler|repair|armor|shield": 100, current: 2, new_cards: 3}
    original = deepcopy(history)
    assert current_most_used_decks(SimpleNamespace(lifetime_stats={"decks": history})) == [
        {"module_ids": new_cards.split("|"), "matches": 3},
        {"module_ids": list(DEFAULT_BATTLE_POOL_IDS), "matches": 2},
    ]
    assert history == original
    assert current_most_used_decks(SimpleNamespace(lifetime_stats={"decks": {next(iter(history)): 100}})) == []


def test_both_own_and_visited_profile_fall_back_to_actual_active_deck(monkeypatch):
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("release221-profile")
    profile.lifetime_stats["decks"] = {"laser|battery|cooler|repair|armor|shield": 100}
    monkeypatch.setattr(gateway, "player_profile_service", profiles)
    monkeypatch.setattr(gateway, "_team_member_profile", lambda _: profile)
    own = gateway.meta_progression_service.view(profile)
    public = gateway._public_player_profile_view(profile.player_id)
    assert own["statistics"]["most_used_decks"] == []
    assert public["featured_deck"] == {"module_ids": list(profile.preferred_battle_pool_ids), "matches": 0}
    current = "|".join(DEFAULT_BATTLE_POOL_IDS)
    profile.lifetime_stats["decks"][current] = 4
    own = gateway.meta_progression_service.view(profile)
    public = gateway._public_player_profile_view(profile.player_id)
    assert own["statistics"]["most_used_decks"][0] == public["featured_deck"]
    assert public["featured_deck"]["matches"] == 4


def test_new_release_does_not_rearm_old_notice_or_resurrect_dismissed_notice(monkeypatch):
    monkeypatch.setattr(gateway, "_events_view", lambda: {})
    profile = PlayerProfileService().get_or_create("release221-inbox")
    profile.seen_inbox_notice_ids = ("update-2-1-1", "update-2-2-0")
    first = gateway._inbox_notices(profile)
    assert [item["version"] for item in first] == ["2.3.0", "2.2.1", "2.2.0", "2.1.1"]
    assert [item["seen"] for item in first] == [False, False, True, True]
    assert len({item["notice_id"] for item in first}) == len(first)
    profile.dismissed_inbox_notice_ids = ("update-2-2-0",)
    profile.seen_inbox_notice_ids += ("update-2-2-1", "update-2-3-0")
    for _ in range(3):
        result = gateway._inbox_notices(profile)
        assert [item["version"] for item in result] == ["2.3.0", "2.2.1", "2.1.1"]
        assert all(item["seen"] for item in result)


def test_release_registry_requires_current_bilingual_notes_and_stable_unique_ids():
    assert INBOX_UPDATE_NOTICES[-1]["version"] == "2.3.0"
    note = {"version": "2.2.1", "body_tr": "Düzeltmeler", "body_en": "Fixes"}
    future = {**note, "version": "2.3.0"}
    assert len(update_notices([future, note], "2.2.1")) == 1
    for entries in ([note, note], [{**note, "body_en": ""}], [future]):
        with pytest.raises(ValueError):
            update_notices(entries, "2.2.1")
