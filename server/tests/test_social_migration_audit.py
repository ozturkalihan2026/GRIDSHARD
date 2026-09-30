"""Synthetic-only checks; no runtime JSON or database is opened."""

import json
import sys

from server.app.social_migration_audit import audit_legacy_social
from tools.audit_social_migration import main as audit_cli_main


def _player(player_id, *, friends=(), incoming=(), outgoing=(), blocked=()):
    return {
        "player_id": player_id,
        "profile": {
            "display_name": player_id,
            "meta_progression_state": {
                "friend_ids": list(friends),
                "incoming_friend_request_ids": list(incoming),
                "outgoing_friend_request_ids": list(outgoing),
                "blocked_player_ids": list(blocked),
            },
        },
    }


def test_consistent_social_and_receipt_snapshot_is_safe():
    players = {
        "a": _player("a", friends=("b",)),
        "b": _player("b", friends=("a",)),
    }
    platform = {
        "accounts": {"a": {"blocked_player_ids": []}},
        "store_receipts": {"provider:one": {
            "key": "provider:one", "player_id": "a", "token_sha256": "digest",
        }},
        "store_receipt_tokens": {"digest": "provider:one"},
    }
    report = audit_legacy_social(players, platform)
    assert report["safe_to_migrate"] is True
    assert report["read_only"] is True
    assert report["issues"] == {}


def test_conflicts_are_counts_without_identifiers_or_tokens():
    players = {
        "a": _player("a", friends=("b",), blocked=("b",)),
        "b": _player("b"),
    }
    platform = {
        "accounts": {"a": {"blocked_player_ids": [["invalid"]]}},
        "store_receipts": {"secret-key": {
            "key": "secret-key", "player_id": "a", "token_sha256": "secret-digest",
        }},
        "store_receipt_tokens": {},
    }
    report = audit_legacy_social(players, platform)
    assert report["safe_to_migrate"] is False
    assert report["issues"]["asymmetric_friendship"] == 1
    assert report["issues"]["friend_block_conflict"] == 1
    assert report["issues"]["invalid_platform_block_id"] == 1
    assert report["issues"]["receipt_token_index_mismatch"] == 1
    assert "secret" not in str(report)


def test_request_symmetry_and_orphans_are_counted():
    players = {
        "a": _player("a", outgoing=("b", "missing")),
        "b": _player("b"),
    }
    report = audit_legacy_social(players, {})
    assert report["issues"]["asymmetric_request"] == 1
    assert report["issues"]["orphan_social_edge"] == 1


def test_malformed_platform_values_fail_closed_without_crashing():
    players = {"a": _player("a", blocked=("b",)), "b": _player("b")}
    platform = {
        "accounts": {"a": {"blocked_player_ids": [["bad"]]}},
        "messages": {"unexpected": "shape"},
        "store_receipt_tokens": {"digest": ["bad"]},
    }
    report = audit_legacy_social(players, platform)
    assert report["safe_to_migrate"] is False
    assert report["issues"]["invalid_platform_section"] == 1
    assert report["issues"]["invalid_platform_block_id"] == 1
    assert report["issues"]["receipt_token_index_mismatch"] == 1


def test_pending_friend_battle_requires_matching_profile_copy():
    players = {"a": _player("a"), "b": _player("b")}
    players["a"]["profile"]["meta_progression_state"]["social_battle_invites"] = [
        {"invite_id": "invite-1", "challenger_id": "a", "opponent_id": "b", "status": "pending"}
    ]
    report = audit_legacy_social(players, {})
    assert report["issues"]["missing_pending_battle_invite_mirror"] == 1


def test_cli_requires_explicit_empty_platform_choice(tmp_path, monkeypatch, capsys):
    players_path = tmp_path / "players.json"
    players_path.write_text(json.dumps({"a": _player("a")}), encoding="utf-8")
    monkeypatch.setattr(
        sys, "argv", ["audit_social_migration.py", "--players-json", str(players_path), "--platform-empty"]
    )

    assert audit_cli_main() == 0
    report = json.loads(capsys.readouterr().out)
    assert report["safe_to_migrate"] is True
    assert report["platform_source"] == "declared_empty"
    assert report["counts"]["player_rows"] == 1


def test_cli_missing_named_platform_input_fails_closed(tmp_path, monkeypatch, capsys):
    players_path = tmp_path / "players.json"
    players_path.write_text(json.dumps({"a": _player("a")}), encoding="utf-8")
    missing_path = tmp_path / "private-platform-snapshot.json"
    monkeypatch.setattr(
        sys, "argv", [
            "audit_social_migration.py", "--players-json", str(players_path),
            "--platform-json", str(missing_path),
        ]
    )

    assert audit_cli_main() == 2
    output = capsys.readouterr().out
    assert str(missing_path) not in output
    assert json.loads(output) == {"read_only": True, "error_code": "audit_input_unavailable"}
