"""Atomic two-player social writes for the clean PostgreSQL installation.

Friend operations are used by the production API; battle invites remain staged.
Profile social lists, normalized edges and receipts share one transaction. The
API also updates the live platform document inside that transaction.
"""

from __future__ import annotations

from copy import deepcopy
import hashlib


class SocialTransactionError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


FRIEND_OPERATIONS = frozenset({"request", "accept", "reject", "cancel", "block", "unblock"})
SOCIAL_KEYS = (
    "friend_ids", "incoming_friend_request_ids", "outgoing_friend_request_ids",
    "blocked_player_ids",
)


def _social_lists(profile: dict) -> tuple[dict, dict[str, list[str]]]:
    if not isinstance(profile, dict):
        raise SocialTransactionError("invalid_profile_social_state")
    copy = deepcopy(profile)
    meta = copy.setdefault("meta_progression_state", {})
    if not isinstance(meta, dict):
        raise SocialTransactionError("invalid_profile_social_state")
    values = {}
    for key in SOCIAL_KEYS:
        raw = meta.get(key, [])
        if not isinstance(raw, list) or any(not isinstance(item, str) or not item for item in raw):
            raise SocialTransactionError("invalid_profile_social_state")
        if len(raw) != len(set(raw)):
            raise SocialTransactionError("invalid_profile_social_state")
        values[key] = list(raw)
    return copy, values


def _add(values: list[str], player_id: str) -> None:
    if player_id not in values:
        values.append(player_id)


def _remove(values: list[str], player_id: str) -> None:
    values[:] = [value for value in values if value != player_id]


def mutate_friend_pair(
    kind: str, actor_id: str, target_id: str, actor_profile: dict, target_profile: dict,
) -> tuple[dict, dict, str]:
    """Pure transition; errors leave the input snapshots unchanged."""
    if kind not in FRIEND_OPERATIONS or not actor_id or not target_id or actor_id == target_id:
        raise SocialTransactionError("invalid_social_operation")
    actor, a = _social_lists(actor_profile)
    target, b = _social_lists(target_profile)
    if (
        (target_id in a["friend_ids"]) != (actor_id in b["friend_ids"])
        or (target_id in a["outgoing_friend_request_ids"]) != (actor_id in b["incoming_friend_request_ids"])
        or (target_id in a["incoming_friend_request_ids"]) != (actor_id in b["outgoing_friend_request_ids"])
    ):
        raise SocialTransactionError("inconsistent_social_pair")
    transition = kind

    if kind == "request":
        if target_id in a["blocked_player_ids"] or actor_id in b["blocked_player_ids"]:
            raise SocialTransactionError("blocked_relation")
        if target_id in a["friend_ids"]:
            transition = "already_friends"
        elif len(a["friend_ids"]) >= 100 or len(b["friend_ids"]) >= 100:
            raise SocialTransactionError("friend_limit")
        elif actor_id in b["outgoing_friend_request_ids"]:
            _add(a["friend_ids"], target_id)
            _add(b["friend_ids"], actor_id)
            _remove(a["incoming_friend_request_ids"], target_id)
            _remove(b["outgoing_friend_request_ids"], actor_id)
            transition = "friendship"
        else:
            _add(a["outgoing_friend_request_ids"], target_id)
            _add(b["incoming_friend_request_ids"], actor_id)
            transition = "pending_request"
    elif kind == "accept":
        if target_id not in a["incoming_friend_request_ids"] and target_id not in a["friend_ids"]:
            raise SocialTransactionError("request_missing")
        if target_id in a["blocked_player_ids"] or actor_id in b["blocked_player_ids"]:
            raise SocialTransactionError("blocked_relation")
        if target_id not in a["friend_ids"] and (len(a["friend_ids"]) >= 100 or len(b["friend_ids"]) >= 100):
            raise SocialTransactionError("friend_limit")
        _add(a["friend_ids"], target_id)
        _add(b["friend_ids"], actor_id)
        _remove(a["incoming_friend_request_ids"], target_id)
        _remove(b["outgoing_friend_request_ids"], actor_id)
        transition = "friendship"
    elif kind == "reject":
        _remove(a["incoming_friend_request_ids"], target_id)
        _remove(b["outgoing_friend_request_ids"], actor_id)
    elif kind == "cancel":
        _remove(a["outgoing_friend_request_ids"], target_id)
        _remove(b["incoming_friend_request_ids"], actor_id)
    else:
        if kind == "block":
            _add(a["blocked_player_ids"], target_id)
        else:
            _remove(a["blocked_player_ids"], target_id)
        for left, right in ((a, target_id), (b, actor_id)):
            for key in ("friend_ids", "incoming_friend_request_ids", "outgoing_friend_request_ids"):
                _remove(left[key], right)

    if transition in {"friendship", "already_friends"}:
        for left, right in ((a, target_id), (b, actor_id)):
            for key in ("incoming_friend_request_ids", "outgoing_friend_request_ids"):
                _remove(left[key], right)

    actor["meta_progression_state"].update(a)
    target["meta_progression_state"].update(b)
    return actor, target, transition


def create_battle_invite_pair(
    challenger_id: str, opponent_id: str, operation_id: str,
    challenger_profile: dict, opponent_profile: dict,
) -> tuple[dict, dict, dict, bool]:
    """Create matching profile copies, or return the existing pending invite."""
    if not challenger_id or not opponent_id or challenger_id == opponent_id or not operation_id:
        raise SocialTransactionError("invalid_social_operation")
    challenger, left = _social_lists(challenger_profile)
    opponent, right = _social_lists(opponent_profile)
    if opponent_id not in left["friend_ids"] or challenger_id not in right["friend_ids"]:
        raise SocialTransactionError("friendship_required")
    if opponent_id in left["blocked_player_ids"] or challenger_id in right["blocked_player_ids"]:
        raise SocialTransactionError("blocked_relation")
    for profile in (challenger, opponent):
        invites = profile["meta_progression_state"].setdefault("social_battle_invites", [])
        if not isinstance(invites, list) or any(not isinstance(item, dict) for item in invites):
            raise SocialTransactionError("invalid_profile_social_state")
    for item in challenger["meta_progression_state"]["social_battle_invites"]:
        if (
            item.get("status") == "pending"
            and item.get("challenger_id") == challenger_id
            and item.get("opponent_id") == opponent_id
        ):
            mirror = next(
                (value for value in opponent["meta_progression_state"]["social_battle_invites"]
                 if value.get("invite_id") == item.get("invite_id")),
                None,
            )
            if mirror is None or mirror.get("status") != "pending":
                raise SocialTransactionError("inconsistent_battle_invite")
            return challenger, opponent, dict(item), False
    invite_id = "friend-battle-" + hashlib.sha1(operation_id.encode("utf-8")).hexdigest()[:16]
    if any(
        item.get("invite_id") == invite_id
        for profile in (challenger, opponent)
        for item in profile["meta_progression_state"]["social_battle_invites"]
    ):
        raise SocialTransactionError("idempotency_conflict")
    item = {
        "invite_id": invite_id,
        "challenger_id": challenger_id,
        "challenger_name": str(challenger.get("display_name") or challenger_id),
        "opponent_id": opponent_id,
        "opponent_name": str(opponent.get("display_name") or opponent_id),
        "status": "pending",
        "match_type": "friend_battle",
        "ranked": False,
        "rewards_enabled": False,
    }
    for profile in (challenger, opponent):
        invites = profile["meta_progression_state"]["social_battle_invites"]
        if sum(value.get("status") in {"pending", "accepted"} for value in invites) >= 50:
            raise SocialTransactionError("battle_invite_limit")
        invites.append(dict(item))
        live = [value for value in invites if value.get("status") in {"pending", "accepted"}]
        terminal = [value for value in invites if value.get("status") not in {"pending", "accepted"}]
        # Never prune an accepted arena or its pending counterpart. Closing
        # those sessions must still be able to update both canonical copies.
        profile["meta_progression_state"]["social_battle_invites"] = terminal[-max(0, 50 - len(live)):] + live if len(live) < 50 else live
    return challenger, opponent, item, True


class PostgresSocialTransactionRepository:
    def __init__(self, pool):
        from psycopg.types.json import Jsonb

        self.database = pool
        self.Jsonb = Jsonb

    def apply_friend_operation(
        self, kind: str, actor_id: str, target_id: str, operation_id: str,
    ) -> dict:
        if kind not in FRIEND_OPERATIONS or not all((actor_id, target_id, operation_id)):
            raise SocialTransactionError("invalid_social_operation")
        if actor_id == target_id or len(actor_id) > 72 or len(target_id) > 72 or len(operation_id) > 96:
            raise SocialTransactionError("invalid_social_operation")

        with self.database.connection() as connection:
            # A repeated request is serialized before locking player rows. All
            # operations subsequently lock players in deterministic ID order.
            connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (operation_id,)
            )
            receipt = connection.execute(
                """SELECT actor_id, target_id, operation_type, result
                   FROM social_operation_receipts WHERE operation_id = %s""",
                (operation_id,),
            ).fetchone()
            if receipt is not None:
                if tuple(receipt[:3]) != (actor_id, target_id, kind):
                    raise SocialTransactionError("idempotency_conflict")
                return {**dict(receipt[3]), "replayed": True}

            profiles = {}
            for player_id in sorted((actor_id, target_id)):
                row = connection.execute(
                    "SELECT profile FROM player_data WHERE player_id = %s FOR UPDATE",
                    (player_id,),
                ).fetchone()
                if row is None:
                    raise SocialTransactionError("player_missing")
                profiles[player_id] = dict(row[0])
            actor, target, transition = mutate_friend_pair(
                kind, actor_id, target_id, profiles[actor_id], profiles[target_id]
            )
            changed = actor != profiles[actor_id] or target != profiles[target_id]
            if changed:
                for player_id, profile in ((actor_id, actor), (target_id, target)):
                    connection.execute(
                        "UPDATE player_data SET profile = %s, revision = revision + 1, "
                        "updated_at = NOW() WHERE player_id = %s",
                        (self.Jsonb(profile), player_id),
                    )
            self._sync_pair(connection, actor_id, target_id, actor, target)
            result = {"transition": transition, "changed": changed}
            connection.execute(
                """INSERT INTO social_operation_receipts
                   (operation_id, actor_id, target_id, operation_type, result)
                   VALUES (%s, %s, %s, %s, %s)""",
                (operation_id, actor_id, target_id, kind, self.Jsonb(result)),
            )
            return {**result, "replayed": False}

    def create_battle_invite(
        self, challenger_id: str, opponent_id: str, operation_id: str,
    ) -> dict:
        kind = "battle_invite:create"
        if not all((challenger_id, opponent_id, operation_id)):
            raise SocialTransactionError("invalid_social_operation")
        if challenger_id == opponent_id or len(challenger_id) > 72 or len(opponent_id) > 72 or len(operation_id) > 96:
            raise SocialTransactionError("invalid_social_operation")
        with self.database.connection() as connection:
            connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (operation_id,)
            )
            receipt = connection.execute(
                """SELECT actor_id, target_id, operation_type, result
                   FROM social_operation_receipts WHERE operation_id = %s""",
                (operation_id,),
            ).fetchone()
            if receipt is not None:
                if tuple(receipt[:3]) != (challenger_id, opponent_id, kind):
                    raise SocialTransactionError("idempotency_conflict")
                return {**dict(receipt[3]), "replayed": True}
            profiles = {}
            for player_id in sorted((challenger_id, opponent_id)):
                row = connection.execute(
                    "SELECT profile FROM player_data WHERE player_id = %s FOR UPDATE", (player_id,)
                ).fetchone()
                if row is None:
                    raise SocialTransactionError("player_missing")
                profiles[player_id] = dict(row[0])
            challenger, opponent, invite, created = create_battle_invite_pair(
                challenger_id, opponent_id, operation_id,
                profiles[challenger_id], profiles[opponent_id],
            )
            if created:
                for player_id, profile in ((challenger_id, challenger), (opponent_id, opponent)):
                    connection.execute(
                        "UPDATE player_data SET profile = %s, revision = revision + 1, "
                        "updated_at = NOW() WHERE player_id = %s",
                        (self.Jsonb(profile), player_id),
                    )
                connection.execute(
                    """INSERT INTO social_battle_invites
                       (invite_id, challenger_id, opponent_id, status, payload)
                       VALUES (%s, %s, %s, 'pending', %s)""",
                    (invite["invite_id"], challenger_id, opponent_id, self.Jsonb(invite)),
                )
                digest = hashlib.sha256(operation_id.encode("utf-8")).hexdigest()[:24]
                notification_id = f"social-notice-{digest}"
                title = "Savaş daveti"
                body = f"{invite['challenger_name']} seni kupasız savaşa çağırdı."
                deep_link = "gridshard://inbox"
                connection.execute(
                    """INSERT INTO notifications
                       (notification_id, player_id, title, body, deep_link, created_at)
                       VALUES (%s, %s, %s, %s, %s, EXTRACT(EPOCH FROM NOW())::BIGINT)""",
                    (notification_id, opponent_id, title, body, deep_link),
                )
                connection.execute(
                    """INSERT INTO social_push_outbox
                       (outbox_id, operation_id, recipient_id, notification_id, payload)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (
                        f"social-push-{digest}", operation_id, opponent_id, notification_id,
                        self.Jsonb({
                            "title": title, "body": body, "deep_link": deep_link,
                            "source_player_id": challenger_id,
                        }),
                    ),
                )
            result = {"invite_id": invite["invite_id"], "changed": created}
            connection.execute(
                """INSERT INTO social_operation_receipts
                   (operation_id, actor_id, target_id, operation_type, result)
                   VALUES (%s, %s, %s, %s, %s)""",
                (operation_id, challenger_id, opponent_id, kind, self.Jsonb(result)),
            )
            return {**result, "replayed": False}

    def _sync_pair(self, connection, actor_id: str, target_id: str, actor: dict, target: dict) -> None:
        pair = tuple(sorted((actor_id, target_id)))
        connection.execute(
            """DELETE FROM friend_requests
               WHERE (requester_id = %s AND recipient_id = %s)
                  OR (requester_id = %s AND recipient_id = %s)""",
            (actor_id, target_id, target_id, actor_id),
        )
        connection.execute(
            "DELETE FROM friendships WHERE player_a_id = %s AND player_b_id = %s", pair
        )
        connection.execute(
            """DELETE FROM player_blocks
               WHERE (owner_id = %s AND target_id = %s)
                  OR (owner_id = %s AND target_id = %s)""",
            (actor_id, target_id, target_id, actor_id),
        )
        metas = {
            actor_id: actor["meta_progression_state"],
            target_id: target["meta_progression_state"],
        }
        for owner, peer in ((actor_id, target_id), (target_id, actor_id)):
            meta = metas[owner]
            if peer in meta["outgoing_friend_request_ids"]:
                connection.execute(
                    """INSERT INTO friend_requests (requester_id, recipient_id, created_at)
                       VALUES (%s, %s, EXTRACT(EPOCH FROM NOW())::BIGINT)""",
                    (owner, peer),
                )
            if peer in meta["blocked_player_ids"]:
                connection.execute(
                    """INSERT INTO player_blocks (owner_id, target_id, created_at)
                       VALUES (%s, %s, EXTRACT(EPOCH FROM NOW())::BIGINT)""",
                    (owner, peer),
                )
            connection.execute(
                """INSERT INTO platform_accounts (player_id, account)
                   VALUES (%s, %s)
                   ON CONFLICT (player_id) DO UPDATE SET
                       account = jsonb_set(platform_accounts.account, '{blocked_player_ids}',
                                           EXCLUDED.account -> 'blocked_player_ids', true),
                       updated_at = NOW()""",
                (owner, self.Jsonb({"blocked_player_ids": meta["blocked_player_ids"]})),
            )
        if target_id in metas[actor_id]["friend_ids"] and actor_id in metas[target_id]["friend_ids"]:
            connection.execute(
                """INSERT INTO friendships (player_a_id, player_b_id, created_at)
                   VALUES (%s, %s, EXTRACT(EPOCH FROM NOW())::BIGINT)""",
                pair,
            )
