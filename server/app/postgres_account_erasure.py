"""Atomic account removal for the clean PostgreSQL runtime.

This is a technical erasure operation, not a legal retention-policy assertion.
Cold profiles and live delivery jobs are covered, not only process caches.
"""

from copy import deepcopy

from psycopg.types.json import Jsonb


def _redact_team_history(value, player_id):
    if isinstance(value, dict):
        return {key: _redact_team_history(item, player_id) for key, item in value.items() if key != player_id}
    if isinstance(value, list):
        return [_redact_team_history(item, player_id) for item in value]
    return "deleted-player" if value == player_id else value


class PostgresAccountErasure:
    def __init__(self, pool, platform, teams, players, identities, analytics):
        self.pool, self.platform, self.teams = pool, platform, teams
        self.players, self.identities, self.analytics = players, identities, analytics

    def erase(self, player_id):
        affected = []
        with self.pool.joined_transaction() as connection:
            with self.platform._lock, self.teams._lock:
                connection.execute("SELECT revision FROM team_document WHERE singleton = TRUE FOR UPDATE")
                team_state = self.teams.repository.load()
                changed = False
                for team_id, team in list(team_state["teams"].items()):
                    previous = deepcopy(team)
                    team["member_ids"] = [value for value in team.get("member_ids", []) if value != player_id]
                    team["application_ids"] = [value for value in team.get("application_ids", []) if value != player_id]
                    if not team["member_ids"]:
                        del team_state["teams"][team_id]
                        changed = True
                        continue
                    if team.get("owner_id") == player_id:
                        team["owner_id"] = sorted(team["member_ids"])[0]
                    for key, owner_keys in (
                        ("messages", ("player_id", "sender_id")),
                        ("module_requests", ("requester_id",)),
                        ("training_challenges", ("challenger_id", "opponent_id")),
                    ):
                        team[key] = [item for item in team.get(key, []) if not any(item.get(key) == player_id for key in owner_keys)]
                    changed |= previous != team
                # Preserve idempotency receipts and non-personal aggregate
                # results: deleting a teammate's old receipt could regrant loot.
                redacted = _redact_team_history(team_state, player_id)
                changed |= redacted != team_state
                if changed:
                    self.teams.repository.save(redacted)
                rows = connection.execute(
                    "SELECT player_id, profile FROM player_data WHERE player_id = %s "
                    "OR profile -> 'meta_progression_state' -> 'friend_ids' ? %s "
                    "OR profile -> 'meta_progression_state' -> 'incoming_friend_request_ids' ? %s "
                    "OR profile -> 'meta_progression_state' -> 'outgoing_friend_request_ids' ? %s "
                    "OR profile -> 'meta_progression_state' -> 'blocked_player_ids' ? %s "
                    "OR profile -> 'meta_progression_state' -> 'social_battle_invites' @> %s "
                    "OR profile -> 'meta_progression_state' -> 'social_battle_invites' @> %s "
                    "ORDER BY player_id FOR UPDATE",
                    (player_id, player_id, player_id, player_id, player_id,
                     Jsonb([{"challenger_id": player_id}]), Jsonb([{"opponent_id": player_id}])),
                ).fetchall()
                for owner_id, stored in rows:
                    if owner_id == player_id:
                        continue
                    profile = deepcopy(stored)
                    meta = profile.get("meta_progression_state", {})
                    for key in ("friend_ids", "incoming_friend_request_ids", "outgoing_friend_request_ids", "blocked_player_ids"):
                        if key in meta:
                            meta[key] = [value for value in meta[key] if value != player_id]
                    if "social_battle_invites" in meta:
                        meta["social_battle_invites"] = [
                            item for item in meta["social_battle_invites"]
                            if player_id not in {item.get("challenger_id"), item.get("opponent_id")}
                        ]
                    if profile != stored:
                        connection.execute("UPDATE player_data SET profile = %s, revision = revision + 1, updated_at = NOW() WHERE player_id = %s", (Jsonb(profile), owner_id))
                        affected.append(owner_id)
                for table, left, right in (
                    ("friend_requests", "requester_id", "recipient_id"),
                    ("friendships", "player_a_id", "player_b_id"),
                    ("player_blocks", "owner_id", "target_id"),
                    ("direct_messages", "sender_id", "recipient_id"),
                    ("direct_message_reads", "owner_id", "peer_id"),
                    ("social_operation_receipts", "actor_id", "target_id"),
                    ("social_battle_invites", "challenger_id", "opponent_id"),
                ):
                    connection.execute(f"DELETE FROM {table} WHERE {left} = %s OR {right} = %s", (player_id, player_id))
                for table, column in (
                    ("platform_accounts", "player_id"), ("notifications", "player_id"),
                    ("push_subscriptions", "player_id"), ("invite_codes", "inviter_id"),
                    ("oauth_exchanges", "player_id"), ("store_receipts", "player_id"),
                    ("social_push_outbox", "recipient_id"), ("battle_pool_presets", "player_id"),
                    ("telemetry_events", "player_id"),
                ):
                    connection.execute(f"DELETE FROM {table} WHERE {column} = %s", (player_id,))
                connection.execute("DELETE FROM social_push_outbox WHERE payload ->> 'source_player_id' = %s", (player_id,))
                connection.execute("UPDATE player_reports SET reporter_id = 'deleted-player' WHERE reporter_id = %s", (player_id,))
                connection.execute("UPDATE player_reports SET target_id = 'deleted-player' WHERE target_id = %s", (player_id,))
                connection.execute("DELETE FROM battle_participant_results WHERE player_id = %s", (player_id,))
                # No pending result can recreate an erased profile. Keep other
                # players' applied projections, but remove raw terminal facts.
                connection.execute(
                    """UPDATE battle_results SET
                         status = CASE WHEN status = 'pending' THEN 'aborted' ELSE status END,
                         abort_reason = CASE WHEN status = 'pending' THEN 'participant_erased' ELSE abort_reason END,
                         terminal = NULL, account_player_ids = array_remove(account_player_ids, %s),
                         summary = summary || jsonb_build_object(
                           'winner_player_id', CASE WHEN summary ->> 'winner_player_id' = %s THEN NULL ELSE summary ->> 'winner_player_id' END,
                           'loser_player_id', CASE WHEN summary ->> 'loser_player_id' = %s THEN NULL ELSE summary ->> 'loser_player_id' END)
                       WHERE %s = ANY(account_player_ids)""",
                    (player_id, player_id, player_id, player_id),
                )
                self.analytics.erase_player(player_id)
                self.platform.erase(player_id)
                deleted = self.players.delete(player_id)
                identity_deleted = self.identities.delete(player_id)
        return {"deleted": bool(deleted or identity_deleted), "identity_deleted": identity_deleted, "affected_player_ids": affected}
