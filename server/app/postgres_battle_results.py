"""Immutable terminal projections, not serialized/resumable battle engines."""

from datetime import datetime, timezone
import hashlib
import json

from psycopg.types.json import Jsonb

from .game.models import (
    BattleEvent, BattleModule, BattleState, BattleStatus, ModuleDefinition,
    ModuleStatus, PlayerBattleState,
)


class BattleResultError(ValueError):
    pass


def terminal_projection(state):
    if state.status != BattleStatus.FINISHED:
        raise BattleResultError("Yalnız bitmiş savaş kalıcı sonuç defterine yazılabilir.")
    accounts = list(state.account_player_ids or tuple(state.players))
    if not accounts or any(owner not in state.players for owner in accounts):
        raise BattleResultError("Savaşın hesap katılımcıları geçersiz.")
    return {
        "version": 1, "battle_id": state.battle_id, "match_type": state.match_type,
        "season_id": state.season_id, "ranked_eligible": state.ranked_eligible,
        "account_player_ids": accounts, "player_match_ratings": state.player_match_ratings,
        "elapsed_ms": state.elapsed_ms, "finished_at_ms": state.finished_at_ms,
        "winner_player_id": state.winner_player_id, "loser_player_id": state.loser_player_id,
        "is_draw": state.is_draw, "finish_reason": state.finish_reason,
        "result_summary": state.result_summary,
        "events": [{"type": event.type, "at_ms": event.at_ms, "data": event.data} for event in state.events],
        "players": {owner: {
            "total_circuit_credits_spent": player.total_circuit_credits_spent,
            "core_power_uses": player.core_power_uses,
            "modules": [{"instance_id": module.instance_id, "definition_id": module.definition.id,
                         "status": module.status.value, "hp": module.hp}
                        for module in player.modules.values()],
        } for owner, player in state.players.items()},
    }


def restore_terminal(projection):
    if projection.get("version") != 1:
        raise BattleResultError("Kalıcı savaş sonucu sürümü desteklenmiyor.")
    state = BattleState(
        battle_id=projection["battle_id"], match_type=projection["match_type"],
        season_id=projection["season_id"], ranked_eligible=projection["ranked_eligible"],
        account_player_ids=tuple(projection["account_player_ids"]),
        player_match_ratings=dict(projection["player_match_ratings"]),
        status=BattleStatus.FINISHED, elapsed_ms=projection["elapsed_ms"],
        finished_at_ms=projection["finished_at_ms"], winner_player_id=projection["winner_player_id"],
        loser_player_id=projection["loser_player_id"], is_draw=projection["is_draw"],
        finish_reason=projection["finish_reason"], result_summary=projection["result_summary"],
        events=[BattleEvent(**event) for event in projection["events"]],
    )
    for owner, data in projection["players"].items():
        player = PlayerBattleState(
            player_id=owner, total_circuit_credits_spent=data["total_circuit_credits_spent"],
            core_power_uses=data["core_power_uses"],
        )
        for item in data["modules"]:
            definition = ModuleDefinition(id=item["definition_id"], name_tr="", category="", max_hp=0)
            player.modules[item["instance_id"]] = BattleModule(
                instance_id=item["instance_id"], definition=definition,
                hp=item["hp"], status=ModuleStatus(item["status"]),
            )
        state.players[owner] = player
    return state


class PostgresBattleResults:
    def __init__(self, pool):
        self.pool = pool

    def record_terminal(self, state):
        projection = terminal_projection(state)
        serialized = json.dumps(projection, sort_keys=True, separators=(",", ":"), allow_nan=False)
        fingerprint = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        summary = {key: projection[key] for key in (
            "match_type", "season_id", "winner_player_id", "loser_player_id", "is_draw", "finish_reason",
        )}
        summary["duration_ms"] = state.finished_at_ms if state.finished_at_ms is not None else state.elapsed_ms
        with self.pool.joined_transaction() as connection:
            connection.execute(
                """INSERT INTO battle_results (battle_id, input_hash, status, account_player_ids,
                       match_type, terminal, summary, completed_at)
                   VALUES (%s, %s, 'pending', %s, %s, %s, %s, %s)
                   ON CONFLICT (battle_id) DO NOTHING""",
                (state.battle_id, fingerprint, projection["account_player_ids"], state.match_type,
                 Jsonb(projection), Jsonb(summary), datetime.now(timezone.utc)),
            )
            row = connection.execute(
                "SELECT input_hash, status FROM battle_results WHERE battle_id = %s", (state.battle_id,),
            ).fetchone()
            if row[0] != fingerprint:
                raise BattleResultError("Aynı savaş kimliği farklı bitiş sonucuyla kullanılamaz.")
            return row[1]

    def pending(self, limit=50):
        with self.pool.connection() as connection:
            rows = connection.execute(
                "SELECT terminal FROM battle_results WHERE status = 'pending' ORDER BY created_at, battle_id LIMIT %s",
                (min(200, max(1, int(limit))),),
            ).fetchall()
        return [restore_terminal(row[0]) for row in rows]

    def lock(self, battle_id):
        if not self.pool.in_transaction:
            raise RuntimeError("Sonuç defteri kilidi ortak işlem içinde alınmalıdır.")
        with self.pool.connection() as connection:
            row = connection.execute(
                "SELECT status, completed_at, account_player_ids FROM battle_results WHERE battle_id = %s FOR UPDATE",
                (battle_id,),
            ).fetchone()
        if row is None:
            raise BattleResultError("Kalıcı bitiş kaydı bulunamadı.")
        return {"status": row[0], "completed_at": row[1], "account_player_ids": row[2]}

    def apply(self, battle_id, results):
        if not self.pool.in_transaction:
            raise RuntimeError("Sonuç defteri profillerle ortak işlem içinde yazılmalıdır.")
        with self.pool.connection() as connection:
            for owner, result in results.items():
                connection.execute(
                    "INSERT INTO battle_participant_results (battle_id, player_id, result) VALUES (%s, %s, %s)",
                    (battle_id, owner, Jsonb(result)),
                )
            connection.execute(
                "UPDATE battle_results SET status = 'applied', applied_at = NOW(), terminal = NULL WHERE battle_id = %s",
                (battle_id,),
            )

    def abort(self, battle_id, reason):
        with self.pool.connection() as connection:
            connection.execute(
                "UPDATE battle_results SET status = 'aborted', terminal = NULL, abort_reason = %s WHERE battle_id = %s AND status = 'pending'",
                (reason, battle_id),
            )

    def player_result(self, battle_id, player_id):
        with self.pool.connection() as connection:
            row = connection.execute(
                "SELECT result FROM battle_participant_results WHERE battle_id = %s AND player_id = %s",
                (battle_id, player_id),
            ).fetchone()
        return row[0] if row else None

    def history(self, player_id, limit=30):
        with self.pool.connection() as connection:
            rows = connection.execute(
                """SELECT b.battle_id, b.completed_at, b.summary, p.result FROM battle_results b
                   JOIN battle_participant_results p USING (battle_id) WHERE p.player_id = %s
                   ORDER BY b.completed_at DESC, b.battle_id LIMIT %s""", (player_id, min(100, max(1, limit))),
            ).fetchall()
        return [{"battle_id": row[0], "completed_at": row[1].isoformat(), "summary": row[2], "progression": row[3]}
                for row in rows]
