"""Live social workflows: canonical profiles and platform outbox in one commit.

No legacy data is imported. The relational invite is an index of the matching
profile copies; notifications and delivery jobs use the actual platform worker.
"""

from copy import deepcopy
import hashlib
import json

from psycopg.types.json import Jsonb

from .postgres_social_transactions import (
    SocialTransactionError, create_battle_invite_pair, mutate_friend_pair,
)


def social_operation_id(actor_id: str, request_id: str | None) -> str:
    if not request_id or not request_id.strip() or len(request_id) > 256:
        raise SocialTransactionError("invalid_request_id")
    return "social:" + hashlib.sha256(f"{actor_id}\0{request_id}".encode()).hexdigest()


class PostgresSocialRuntime:
    def __init__(self, pool, platform, *, boot_id: str):
        self.pool = pool
        self.platform = platform
        self.boot_id = boot_id

    def _operation(self, kind, actor, target, request_id, payload, action, *, participants=None):
        operation_id = social_operation_id(actor, request_id)
        if not actor or not target or actor == target or max(len(actor), len(target)) > 72:
            raise SocialTransactionError("invalid_social_operation")
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with self.pool.joined_transaction() as connection:
            with self.platform._lock:
                connection.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (operation_id,))
                saved = connection.execute(
                    "SELECT actor_id, target_id, operation_type, result FROM social_operation_receipts WHERE operation_id = %s",
                    (operation_id,),
                ).fetchone()
                if saved:
                    if tuple(saved[:3]) != (actor, target, kind) or saved[3].get("fingerprint") != fingerprint:
                        raise SocialTransactionError("idempotency_conflict")
                    return {key: value for key, value in saved[3].items() if key != "fingerprint"} | {"replayed": True}
                profiles = {}
                for player_id in sorted(set(participants or (actor, target))):
                    row = connection.execute("SELECT profile FROM player_data WHERE player_id = %s FOR UPDATE", (player_id,)).fetchone()
                    if row is None:
                        raise SocialTransactionError("player_missing")
                    profiles[player_id] = deepcopy(row[0])
                result = action(connection, profiles, operation_id)
                result["affected_player_ids"] = list(profiles)
                connection.execute(
                    "INSERT INTO social_operation_receipts (operation_id, actor_id, target_id, operation_type, result) VALUES (%s, %s, %s, %s, %s)",
                    (operation_id, actor, target, kind, Jsonb({**result, "fingerprint": fingerprint})),
                )
                return {**result, "replayed": False}

    @staticmethod
    def _write_profiles(connection, profiles):
        for player_id, profile in profiles.items():
            connection.execute(
                "UPDATE player_data SET profile = %s, revision = revision + 1, updated_at = NOW() WHERE player_id = %s",
                (Jsonb(profile), player_id),
            )

    def _require_friends(self, actor, target, profiles):
        a, b = (profiles[value].get("meta_progression_state", {}) for value in (actor, target))
        if target not in a.get("friend_ids", []) or actor not in b.get("friend_ids", []):
            raise SocialTransactionError("friendship_required")
        if target in a.get("blocked_player_ids", []) or actor in b.get("blocked_player_ids", []) or self.platform.is_blocked(actor, target):
            raise SocialTransactionError("blocked_relation")

    def create_battle_invite(self, actor, target, request_id):
        def create(connection, profiles, operation_id):
            self._require_friends(actor, target, profiles)
            a, b, invite, created = create_battle_invite_pair(actor, target, operation_id, profiles[actor], profiles[target])
            if created:
                profiles.update({actor: a, target: b})
                self._write_profiles(connection, profiles)
                connection.execute(
                    "INSERT INTO social_battle_invites (invite_id, challenger_id, opponent_id, status, payload) VALUES (%s, %s, %s, 'pending', %s)",
                    (invite["invite_id"], actor, target, Jsonb(invite)),
                )
                self.platform.queue_notification(target, "Savaş daveti", f"{invite['challenger_name']} seni kupasız savaşa çağırdı.", "gridshard://inbox", source_player_id=actor)
            return {"invite_id": invite["invite_id"], "changed": created}
        return self._operation("battle_invite:create", actor, target, request_id, {}, create)

    def decide_battle_invite(self, actor, invite_id, request_id, *, accept):
        with self.pool.joined_transaction() as connection:
            with self.platform._lock:
                row = connection.execute("SELECT challenger_id, opponent_id FROM social_battle_invites WHERE invite_id = %s", (invite_id,)).fetchone()
                if row is None or row[1] != actor:
                    raise SocialTransactionError("invite_missing")
                target = row[0]
                def decide(connection, profiles, _operation_id):
                    row = connection.execute("SELECT status, payload FROM social_battle_invites WHERE invite_id = %s FOR UPDATE", (invite_id,)).fetchone()
                    if row[0] != "pending":
                        raise SocialTransactionError("invite_closed")
                    if accept:
                        self._require_friends(actor, target, profiles)
                    invite = dict(row[1])
                    invite["status"] = "accepted" if accept else "declined"
                    if accept:
                        invite["battle_session_id"] = f"social-{invite_id}"
                        invite["owner_boot_id"] = self.boot_id
                    self._update_invite(connection, profiles, invite)
                    return {"invite_id": invite_id, "changed": True}
                return self._operation(
                    "battle_invite:accept" if accept else "battle_invite:decline",
                    actor, target, request_id, {"invite_id": invite_id}, decide,
                )

    def _update_invite(self, connection, profiles, invite):
        for profile in profiles.values():
            copies = profile.get("meta_progression_state", {}).get("social_battle_invites", [])
            index = next((i for i, item in enumerate(copies) if item.get("invite_id") == invite["invite_id"]), None)
            if index is None:
                raise SocialTransactionError("inconsistent_battle_invite")
            copies[index] = dict(invite)
        self._write_profiles(connection, profiles)
        connection.execute("UPDATE social_battle_invites SET status = %s, payload = %s, updated_at = NOW() WHERE invite_id = %s", (invite["status"], Jsonb(invite), invite["invite_id"]))

    def close_sessions(self, *, session_id=None, stale_boot=False):
        affected = set()
        with self.pool.joined_transaction() as connection:
            with self.platform._lock:
                rows = connection.execute(
                    "SELECT payload FROM social_battle_invites WHERE status = 'accepted' "
                    "AND ((%s AND COALESCE(payload ->> 'owner_boot_id', '') <> %s) OR payload ->> 'battle_session_id' = %s) FOR UPDATE",
                    (stale_boot, self.boot_id, session_id),
                ).fetchall()
                for (payload,) in rows:
                    invite = dict(payload)
                    profiles = {}
                    for player_id in sorted((invite["challenger_id"], invite["opponent_id"])):
                        row = connection.execute("SELECT profile FROM player_data WHERE player_id = %s FOR UPDATE", (player_id,)).fetchone()
                        if row is not None:
                            profiles[player_id] = deepcopy(row[0])
                    invite["status"] = "expired" if stale_boot else "completed"
                    self._update_invite(connection, profiles, invite)
                    affected.update(profiles)
        return sorted(affected)

    def invite(self, actor, invite_id):
        with self.pool.connection() as connection:
            row = connection.execute("SELECT payload FROM social_battle_invites WHERE invite_id = %s AND (challenger_id = %s OR opponent_id = %s)", (invite_id, actor, actor)).fetchone()
        if row is None:
            raise SocialTransactionError("invite_missing")
        return dict(row[0])

    def send_message(self, actor, target, text, request_id):
        def send(_connection, profiles, _operation_id):
            self._require_friends(actor, target, profiles)
            message = self.platform.send_message(actor, target, text)
            self.platform.queue_notification(target, "Yeni mesaj", f"{profiles[actor]['display_name']} sana mesaj gönderdi.", f"gridshard://friends/messages/{actor}", source_player_id=actor)
            return {"message": message}
        return self._operation("message:send", actor, target, request_id, {"text": text}, send)

    def mark_seen(self, actor, peer, request_id):
        def seen(connection, profiles, _operation_id):
            changed = self.platform.mark_conversation_seen(actor, peer)
            if peer is None:
                profiles[actor].setdefault("meta_progression_state", {})["direct_messages_seen_at"] = int(self.platform.now_func())
                self._write_profiles(connection, profiles)
            return {"changed": changed}
        return self._operation("message:seen", actor, peer or "*", request_id, {}, seen, participants=(actor,))

    def accept_code(self, actor, code, request_id):
        code = str(code or "").strip().upper()
        with self.pool.joined_transaction():
            with self.platform._lock:
                item = self.platform._read().get("invites", {}).get(code)
                if not item:
                    raise SocialTransactionError("invite_code_missing")
                target = item["inviter_id"]
                def accept(connection, profiles, _operation_id):
                    result = self.platform.accept_invite(actor, code)
                    # The link grants friendship only within the same atomic
                    # limits/block checks as two mutually accepted requests.
                    a, b, _ = mutate_friend_pair("request", actor, target, profiles[actor], profiles[target])
                    b, a, _ = mutate_friend_pair("request", target, actor, b, a)
                    profiles.update({actor: a, target: b})
                    self._write_profiles(connection, profiles)
                    from .postgres_social_transactions import PostgresSocialTransactionRepository
                    PostgresSocialTransactionRepository(self.pool)._sync_pair(connection, actor, target, a, b)
                    self.platform.sync_social_blocks({value: profile["meta_progression_state"]["blocked_player_ids"] for value, profile in profiles.items()})
                    self.platform.queue_notification(target, "Davet kabul edildi", f"{profiles[actor]['display_name']} artık arkadaşın.", f"gridshard://profile/{actor}", source_player_id=actor)
                    return result
                return self._operation("invite_code:accept", actor, target, request_id, {"code": code}, accept)
