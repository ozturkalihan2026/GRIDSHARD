"""Read-only SERVER-2/4 inventory for legacy player and platform snapshots.

Reports contain counts and issue codes only. Player IDs, names, message bodies,
receipt keys and tokens must never be emitted by this module.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping

from .display_names import display_name_key


SOCIAL_FIELDS = (
    "friend_ids",
    "incoming_friend_request_ids",
    "outgoing_friend_request_ids",
    "blocked_player_ids",
)


def _mapping(value: object) -> Mapping:
    return value if isinstance(value, Mapping) else {}


def _items(value: object) -> list:
    return value if isinstance(value, list) else []


def _known_player(value: object, player_ids: set[str]) -> bool:
    return isinstance(value, str) and value in player_ids


def audit_legacy_social(players: Mapping, platform: Mapping) -> dict:
    """Inspect two already-loaded snapshots without mutating either one."""
    if not isinstance(players, Mapping) or not isinstance(platform, Mapping):
        raise ValueError("Player and platform snapshots must be JSON objects.")

    issues: Counter[str] = Counter()
    counts: Counter[str] = Counter()
    profiles: dict[str, Mapping] = {}
    social: dict[str, dict[str, set[str]]] = {}
    battle_invites: dict[str, dict[str, Mapping]] = {}
    name_owners: dict[str, str] = {}

    for outer_id, snapshot in players.items():
        counts["player_rows"] += 1
        if not isinstance(outer_id, str) or not isinstance(snapshot, Mapping):
            issues["invalid_player_row"] += 1
            continue
        if snapshot.get("player_id") != outer_id:
            issues["player_id_mismatch"] += 1
        profile = snapshot.get("profile")
        if not isinstance(profile, Mapping):
            issues["invalid_profile"] += 1
            continue
        profiles[outer_id] = profile
        name = profile.get("display_name")
        if isinstance(name, str) and name.strip():
            key = display_name_key(name)
            if key in name_owners and name_owners[key] != outer_id:
                issues["duplicate_display_name"] += 1
            else:
                name_owners[key] = outer_id
        if "meta_progression_state" in profile and not isinstance(profile["meta_progression_state"], Mapping):
            issues["invalid_meta_progression_state"] += 1
        meta = _mapping(profile.get("meta_progression_state"))
        social[outer_id] = {}
        battle_invites[outer_id] = {}
        for field in SOCIAL_FIELDS:
            raw = meta.get(field, [])
            if not isinstance(raw, list):
                issues["invalid_social_list"] += 1
                raw = []
            values = [item for item in raw if isinstance(item, str) and item]
            if len(values) != len(raw):
                issues["invalid_social_id"] += len(raw) - len(values)
            if len(values) != len(set(values)):
                issues["duplicate_social_edge"] += len(values) - len(set(values))
            social[outer_id][field] = set(values)
            counts[field] += len(values)
        raw_invites = meta.get("social_battle_invites", [])
        if not isinstance(raw_invites, list):
            issues["invalid_battle_invite_list"] += 1
            raw_invites = []
        for invite in raw_invites:
            counts["social_battle_invites"] += 1
            row = _mapping(invite)
            invite_id = row.get("invite_id")
            if not isinstance(invite_id, str) or not invite_id:
                issues["invalid_battle_invite_id"] += 1
                continue
            if invite_id in battle_invites[outer_id]:
                issues["duplicate_battle_invite"] += 1
            battle_invites[outer_id][invite_id] = row

    player_ids = set(profiles)
    for owner, invites in battle_invites.items():
        for invite_id, row in invites.items():
            challenger = row.get("challenger_id")
            opponent = row.get("opponent_id")
            if not _known_player(challenger, player_ids) or not _known_player(opponent, player_ids):
                issues["orphan_battle_invite"] += 1
                continue
            if owner not in (challenger, opponent) or challenger == opponent:
                issues["invalid_battle_invite_participant"] += 1
                continue
            peer = opponent if owner == challenger else challenger
            mirror = battle_invites[peer].get(invite_id)
            if row.get("status") == "pending" and mirror is None:
                issues["missing_pending_battle_invite_mirror"] += 1
            elif mirror is not None and mirror.get("status") != row.get("status"):
                issues["battle_invite_status_mismatch"] += 1
    for owner, edges in social.items():
        friends = edges["friend_ids"]
        outgoing = edges["outgoing_friend_request_ids"]
        incoming = edges["incoming_friend_request_ids"]
        blocked = edges["blocked_player_ids"]
        for field, targets in edges.items():
            for target in targets:
                if target == owner:
                    issues["self_social_edge"] += 1
                elif target not in player_ids:
                    issues["orphan_social_edge"] += 1
                elif field == "friend_ids" and owner not in social[target]["friend_ids"]:
                    issues["asymmetric_friendship"] += 1
                elif field == "outgoing_friend_request_ids" and owner not in social[target]["incoming_friend_request_ids"]:
                    issues["asymmetric_request"] += 1
                elif field == "incoming_friend_request_ids" and owner not in social[target]["outgoing_friend_request_ids"]:
                    issues["asymmetric_request"] += 1
        issues["friend_block_conflict"] += len(friends & blocked)
        issues["friend_request_conflict"] += len(friends & (outgoing | incoming))

    expected_sections = {
        "accounts": Mapping,
        "invites": Mapping,
        "messages": list,
        "reports": list,
        "store_receipts": Mapping,
        "store_receipt_tokens": Mapping,
        "store_notifications": Mapping,
    }
    for section, expected_type in expected_sections.items():
        if section in platform and not isinstance(platform[section], expected_type):
            issues["invalid_platform_section"] += 1

    accounts = _mapping(platform.get("accounts"))
    counts["platform_accounts"] = len(accounts)
    notification_ids: set[str] = set()
    for owner, account in accounts.items():
        if not isinstance(owner, str) or not isinstance(account, Mapping):
            issues["invalid_platform_account"] += 1
            continue
        if not _known_player(owner, player_ids):
            issues["orphan_platform_account"] += 1
        platform_blocks = account.get("blocked_player_ids", [])
        if not isinstance(platform_blocks, list):
            issues["invalid_platform_block_list"] += 1
            platform_blocks = []
        valid_blocks = [value for value in platform_blocks if isinstance(value, str) and value]
        if len(valid_blocks) != len(platform_blocks):
            issues["invalid_platform_block_id"] += len(platform_blocks) - len(valid_blocks)
        if len(valid_blocks) != len(set(valid_blocks)):
            issues["duplicate_platform_block"] += len(valid_blocks) - len(set(valid_blocks))
        if owner in social and set(valid_blocks) != social[owner]["blocked_player_ids"]:
            issues["block_source_mismatch"] += 1
        for notification in _items(account.get("notifications")):
            counts["notifications"] += 1
            notification_id = _mapping(notification).get("notification_id")
            if not isinstance(notification_id, str) or not notification_id:
                issues["invalid_notification_id"] += 1
            elif notification_id in notification_ids:
                issues["duplicate_notification_id"] += 1
            else:
                notification_ids.add(notification_id)
        counts["push_subscriptions"] += len(_mapping(account.get("push_subscriptions")))

    for owner, edges in social.items():
        if edges["blocked_player_ids"] and owner not in accounts:
            issues["missing_platform_block_mirror"] += 1

    message_ids: set[str] = set()
    for message in _items(platform.get("messages")):
        counts["direct_messages"] += 1
        row = _mapping(message)
        message_id = row.get("message_id")
        if not isinstance(message_id, str) or not message_id:
            issues["invalid_message_id"] += 1
        elif message_id in message_ids:
            issues["duplicate_message_id"] += 1
        else:
            message_ids.add(message_id)
        if not _known_player(row.get("sender_id"), player_ids) or not _known_player(row.get("recipient_id"), player_ids):
            issues["orphan_message"] += 1
        if row.get("sender_id") == row.get("recipient_id"):
            issues["self_message"] += 1

    invites = _mapping(platform.get("invites"))
    counts["invite_codes"] = len(invites)
    for code, invite in invites.items():
        if _mapping(invite).get("code") != code:
            issues["invite_code_mismatch"] += 1
        if not _known_player(_mapping(invite).get("inviter_id"), player_ids):
            issues["orphan_invite"] += 1

    reports = _items(platform.get("reports"))
    counts["player_reports"] = len(reports)
    report_ids: set[str] = set()
    for report in reports:
        row = _mapping(report)
        report_id = row.get("report_id")
        if not isinstance(report_id, str) or not report_id:
            issues["invalid_report_id"] += 1
        elif report_id in report_ids:
            issues["duplicate_report_id"] += 1
        else:
            report_ids.add(report_id)
        if not _known_player(row.get("reporter_id"), player_ids) or not _known_player(row.get("target_id"), player_ids):
            issues["orphan_report"] += 1

    receipts = _mapping(platform.get("store_receipts"))
    counts["store_receipts"] = len(receipts)
    token_owners: dict[str, str] = {}
    for key, receipt in receipts.items():
        row = _mapping(receipt)
        if row.get("key") != key:
            issues["receipt_key_mismatch"] += 1
        if not _known_player(row.get("player_id"), player_ids):
            issues["orphan_receipt"] += 1
        digest = row.get("token_sha256")
        if isinstance(digest, str) and digest:
            if digest in token_owners and token_owners[digest] != key:
                issues["duplicate_receipt_token"] += 1
            else:
                token_owners[digest] = key
    token_index = _mapping(platform.get("store_receipt_tokens"))
    for digest, key in token_index.items():
        if not isinstance(key, str) or key not in receipts or _mapping(receipts[key]).get("token_sha256") != digest:
            issues["receipt_token_index_mismatch"] += 1
    for digest, key in token_owners.items():
        if token_index.get(digest) != key:
            issues["receipt_token_index_mismatch"] += 1
    counts["store_notifications"] = len(_mapping(platform.get("store_notifications")))

    return {
        "schema_version": 1,
        "read_only": True,
        "safe_to_migrate": not any(issues.values()),
        "counts": dict(sorted(counts.items())),
        "issues": dict(sorted((key, value) for key, value in issues.items() if value)),
    }
