from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

import pytest

from app.account_export import build_personal_export, verify_personal_export
from app.display_names import DisplayNameError, display_name_key, normalize_display_name
from app.player_data_store import JsonFilePlayerDataRepository, PlayerDataSnapshot


def snapshot(player_id, name):
    return PlayerDataSnapshot(player_id, {"player_id": player_id, "display_name": name, "rating": 42}, {}, {})


def test_name_normalization_does_not_allow_case_spacing_or_unicode_duplicates():
    assert normalize_display_name("  Devre   Ustası  ") == "Devre Ustası"
    assert display_name_key("DEVRE USTASI") == display_name_key("Devre Ustası")
    assert display_name_key("ＩＯＮ") == display_name_key("İon")
    for value in ("", "x" * 25, "Devre\u200b", "Devre\nUstası"):
        with pytest.raises(DisplayNameError):
            normalize_display_name(value)


def test_two_repository_instances_cannot_claim_the_same_name(tmp_path):
    path = tmp_path / "players.json"

    def claim(player_id):
        try:
            JsonFilePlayerDataRepository(path).save(snapshot(player_id, "Özgün Devre 71"))
            return True
        except DisplayNameError as error:
            assert error.code == "taken"
            return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(claim, ("name-a", "name-b")))
    assert sorted(outcomes) == [False, True]
    assert len(JsonFilePlayerDataRepository(path).list_snapshots()) == 1


def test_offline_names_are_reserved_and_owners_can_keep_their_name(tmp_path):
    path = tmp_path / "players.json"
    JsonFilePlayerDataRepository(path).save(snapshot("name-a", "Özgün Devre 71"))
    restarted = JsonFilePlayerDataRepository(path)
    with pytest.raises(DisplayNameError):
        restarted.save(snapshot("name-b", "ÖZGÜN DEVRE 71"))
    restarted.save(snapshot("name-a", "Özgün Devre 71"))


def test_export_tampering_is_detected_without_an_import_capability():
    key = b"isolated-test-signing-key-not-a-production-secret"
    player = {"player_id": "export-a", "profile": {"rating": 42, "module_shards": {"laser": 0}}}
    document = build_personal_export(player, {}, key)
    assert document["restorable"] is False
    assert verify_personal_export(document, key)
    assert not verify_personal_export(document, b"a-different-signing-key")
    for field, value in (("rating", 99999), ("module_shards", {"laser": 99999})):
        edited = deepcopy(document)
        edited["player_data"]["profile"][field] = value
        assert not verify_personal_export(edited, key)
    assert player["profile"]["rating"] == 42
