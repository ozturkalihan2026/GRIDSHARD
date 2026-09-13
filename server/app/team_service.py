"""Persistent team social state for GRIDSHARD 2.1.

Team battles deliberately use a separate, reward-free protocol contract.  The
service owns social state and idempotency receipts; player economy transfers
remain in the profile layer used by the HTTP gateway.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
from threading import RLock
from uuid import uuid4


TEAM_MEMBER_LIMIT = 30
TEAM_NAME_MAX_LENGTH = 24
CHAT_MESSAGE_MAX_LENGTH = 240
REQUEST_POLICY = {
    # A player may open one module request per week.  The requested piece
    # count is determined by the selected module's rarity.
    "common": {"weekly_limit": 1, "amount": 4},
    "rare": {"weekly_limit": 1, "amount": 3},
    "epic": {"weekly_limit": 1, "amount": 2},
    "legendary": {"weekly_limit": 1, "amount": 1},
}


class TeamServiceError(ValueError):
    pass


class JsonTeamRepository:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = RLock()

    @property
    def backup_path(self) -> Path:
        return self.path.with_name(self.path.name + ".bak")

    def load(self) -> dict:
        with self._lock:
            if not self.path.exists():
                return {"teams": {}, "receipts": {}}
            try:
                raw = self.path.read_text(encoding="utf-8")
                payload = json.loads(raw) if raw.strip() else {}
            except (OSError, json.JSONDecodeError) as exc:
                raise TeamServiceError("Takım verisi okunamadı.") from exc
            if not isinstance(payload, dict):
                raise TeamServiceError("Takım veri kökü nesne olmalıdır.")
            return {
                "teams": dict(payload.get("teams") or {}),
                "receipts": dict(payload.get("receipts") or {}),
            }

    def save(self, payload: dict) -> None:
        with self._lock:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                if self.path.exists():
                    backup_tmp = self.backup_path.with_name(
                        self.backup_path.name + ".tmp"
                    )
                    shutil.copy2(self.path, backup_tmp)
                    os.replace(backup_tmp, self.backup_path)
                tmp = self.path.with_name(self.path.name + ".tmp")
                tmp.write_text(
                    json.dumps(
                        payload,
                        ensure_ascii=False,
                        indent=2,
                        sort_keys=True,
                    ) + "\n",
                    encoding="utf-8",
                )
                os.replace(tmp, self.path)
            except OSError as exc:
                raise TeamServiceError("Takım verisi yazılamadı.") from exc


class InMemoryTeamRepository:
    def __init__(self):
        self.payload = {"teams": {}, "receipts": {}}
        self._lock = RLock()

    def load(self) -> dict:
        with self._lock:
            return json.loads(json.dumps(self.payload))

    def save(self, payload: dict) -> None:
        with self._lock:
            self.payload = json.loads(json.dumps(payload))


class TeamService:
    def __init__(self, repository, now_func=None):
        self.repository = repository
        self._now_func = now_func or (lambda: datetime.now(timezone.utc))
        self._lock = RLock()

    def _now(self) -> datetime:
        value = self._now_func()
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _timestamp(self) -> str:
        return self._now().isoformat()

    def _week_key(self) -> str:
        year, week, _ = self._now().isocalendar()
        return f"{year}-W{week:02d}"

    @staticmethod
    def _fingerprint(kind: str, actor_id: str, values: dict) -> str:
        raw = json.dumps(
            {"kind": kind, "actor_id": actor_id, **values},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _clean_request_id(request_id: str) -> str:
        clean = str(request_id or "").strip()
        if not clean or len(clean) > 120:
            raise TeamServiceError("Geçerli bir işlem kimliği gerekli.")
        return clean

    @staticmethod
    def _clean_team_name(name: str) -> str:
        clean = " ".join(str(name or "").strip().split())
        if not clean:
            raise TeamServiceError("Takım adı boş olamaz.")
        if len(clean) > TEAM_NAME_MAX_LENGTH:
            raise TeamServiceError(
                f"Takım adı en fazla {TEAM_NAME_MAX_LENGTH} karakter olabilir."
            )
        if not re.search(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]", clean):
            raise TeamServiceError("Takım adı en az bir harf veya rakam içermelidir.")
        return clean

    @staticmethod
    def _find_team_for_player(payload: dict, player_id: str) -> dict | None:
        for team in payload["teams"].values():
            if player_id in team.get("member_ids", []):
                return team
        return None

    def _mutate(
        self,
        *,
        request_id: str,
        fingerprint: str,
        operation,
    ) -> dict:
        receipt_id = self._clean_request_id(request_id)
        with self._lock:
            payload = self.repository.load()
            receipt = payload["receipts"].get(receipt_id)
            if receipt is not None:
                if receipt.get("fingerprint") != fingerprint:
                    raise TeamServiceError(
                        "İşlem kimliği farklı bir takım işlemi için kullanılmış."
                    )
                return {**dict(receipt["result"]), "replayed": True}
            result = operation(payload)
            stored = {**result, "replayed": False}
            payload["receipts"][receipt_id] = {
                "fingerprint": fingerprint,
                "result": stored,
                "created_at": self._timestamp(),
            }
            self.repository.save(payload)
            return stored

    def team_for_player(self, player_id: str) -> dict | None:
        payload = self.repository.load()
        team = self._find_team_for_player(payload, player_id)
        return json.loads(json.dumps(team)) if team else None

    def get_team(self, team_id: str) -> dict:
        payload = self.repository.load()
        team = payload["teams"].get(str(team_id))
        if team is None:
            raise TeamServiceError("Takım bulunamadı.")
        return json.loads(json.dumps(team))

    def list_teams(self) -> list[dict]:
        payload = self.repository.load()
        teams = [json.loads(json.dumps(item)) for item in payload["teams"].values()]
        teams.sort(key=lambda item: str(item.get("name", "")).casefold())
        return teams

    def create_team(self, player_id: str, name: str, request_id: str) -> dict:
        clean_name = self._clean_team_name(name)
        fingerprint = self._fingerprint("create", player_id, {"name": clean_name})

        def operation(payload: dict) -> dict:
            if self._find_team_for_player(payload, player_id):
                raise TeamServiceError("Oyuncu zaten bir takımda.")
            if any(
                str(team.get("name", "")).casefold() == clean_name.casefold()
                for team in payload["teams"].values()
            ):
                raise TeamServiceError("Bu takım adı zaten kullanılıyor.")
            team_id = "team-" + hashlib.sha1(
                f"{player_id}:{request_id}:{clean_name}".encode("utf-8")
            ).hexdigest()[:12]
            team = {
                "team_id": team_id,
                "name": clean_name,
                "owner_id": player_id,
                "member_limit": TEAM_MEMBER_LIMIT,
                "member_ids": [player_id],
                "created_at": self._timestamp(),
                "module_requests": [],
                "messages": [],
                "training_challenges": [],
            }
            payload["teams"][team_id] = team
            return {"team_id": team_id, "team": team}

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def join_team(self, player_id: str, team_id: str, request_id: str) -> dict:
        clean_team_id = str(team_id or "").strip()
        fingerprint = self._fingerprint(
            "join", player_id, {"team_id": clean_team_id}
        )

        def operation(payload: dict) -> dict:
            current = self._find_team_for_player(payload, player_id)
            if current:
                if current.get("team_id") == clean_team_id:
                    return {"team_id": clean_team_id, "team": current}
                raise TeamServiceError("Oyuncu zaten başka bir takımda.")
            team = payload["teams"].get(clean_team_id)
            if team is None:
                raise TeamServiceError("Takım bulunamadı.")
            members = list(team.get("member_ids", []))
            if len(members) >= int(team.get("member_limit", TEAM_MEMBER_LIMIT)):
                raise TeamServiceError("Takımın üye kapasitesi dolu.")
            members.append(player_id)
            team["member_ids"] = members
            return {"team_id": clean_team_id, "team": team}

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def create_module_request(
        self,
        *,
        team_id: str,
        player_id: str,
        module_id: str,
        rarity: str,
        request_id: str,
    ) -> dict:
        policy = REQUEST_POLICY.get(str(rarity))
        if policy is None:
            raise TeamServiceError("Modül nadirliği desteklenmiyor.")
        fingerprint = self._fingerprint(
            "module_request",
            player_id,
            {"team_id": team_id, "module_id": module_id, "rarity": rarity},
        )

        def operation(payload: dict) -> dict:
            team = payload["teams"].get(team_id)
            if team is None or player_id not in team.get("member_ids", []):
                raise TeamServiceError("Modül isteği için takım üyeliği gerekli.")
            week_key = self._week_key()
            used = sum(
                1
                for item in team.get("module_requests", [])
                if item.get("requester_id") == player_id
                and item.get("week_key") == week_key
            )
            if used >= 1:
                raise TeamServiceError(
                    "Bu hafta zaten bir modül parçası isteği oluşturdun."
                )
            item = {
                "request_id": "module-request-" + uuid4().hex,
                "requester_id": player_id,
                "module_id": module_id,
                "rarity": rarity,
                "requested_amount": int(policy["amount"]),
                "donated_amount": 0,
                "donors": {},
                "week_key": week_key,
                "created_at": self._timestamp(),
                "fulfilled": False,
            }
            team.setdefault("module_requests", []).append(item)
            return {
                "team_id": team_id,
                "module_request": item,
                "weekly_limit": int(policy["weekly_limit"]),
                "weekly_used": used + 1,
            }

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def donate_module_shard(
        self,
        *,
        team_id: str,
        player_id: str,
        module_request_id: str,
        request_id: str,
        available_amount: int,
    ) -> dict:
        fingerprint = self._fingerprint(
            "donate",
            player_id,
            {
                "team_id": team_id,
                "module_request_id": module_request_id,
            },
        )

        def operation(payload: dict) -> dict:
            if int(available_amount) < 1:
                raise TeamServiceError("Bağışlanacak modül parçası yok.")
            team = payload["teams"].get(team_id)
            if team is None or player_id not in team.get("member_ids", []):
                raise TeamServiceError("Bağış için takım üyeliği gerekli.")
            item = next(
                (
                    candidate
                    for candidate in team.get("module_requests", [])
                    if candidate.get("request_id") == module_request_id
                ),
                None,
            )
            if item is None:
                raise TeamServiceError("Modül isteği bulunamadı.")
            if item.get("requester_id") == player_id:
                raise TeamServiceError("Kendi modül isteğine bağış yapılamaz.")
            policy = REQUEST_POLICY.get(str(item.get("rarity", "")))
            requested_amount = int(item.get("requested_amount", 0) or 0)
            if policy:
                requested_amount = min(requested_amount, int(policy["amount"]))
                item["requested_amount"] = requested_amount
            remaining = requested_amount - int(item["donated_amount"])
            if remaining <= 0:
                raise TeamServiceError("Modül isteği zaten tamamlandı.")
            item["donated_amount"] = int(item["donated_amount"]) + 1
            donors = item.setdefault("donors", {})
            donors[player_id] = int(donors.get(player_id, 0)) + 1
            item["fulfilled"] = item["donated_amount"] >= requested_amount
            return {
                "team_id": team_id,
                "module_request_id": module_request_id,
                "module_id": item["module_id"],
                "requester_id": item["requester_id"],
                "donor_id": player_id,
                "amount": 1,
                "fulfilled": bool(item["fulfilled"]),
            }

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def post_message(
        self,
        *,
        team_id: str,
        player_id: str,
        message: str,
        request_id: str,
    ) -> dict:
        clean = " ".join(str(message or "").strip().split())
        if not clean:
            raise TeamServiceError("Sohbet mesajı boş olamaz.")
        if len(clean) > CHAT_MESSAGE_MAX_LENGTH:
            raise TeamServiceError(
                f"Sohbet mesajı en fazla {CHAT_MESSAGE_MAX_LENGTH} karakter olabilir."
            )
        fingerprint = self._fingerprint(
            "message", player_id, {"team_id": team_id, "message": clean}
        )

        def operation(payload: dict) -> dict:
            team = payload["teams"].get(team_id)
            if team is None or player_id not in team.get("member_ids", []):
                raise TeamServiceError("Takım sohbeti için üyelik gerekli.")
            item = {
                "message_id": "message-" + uuid4().hex,
                "author_id": player_id,
                "text": clean,
                "created_at": self._timestamp(),
                "visibility": "visible",
                "moderation_status": "pending",
                "reports": [],
            }
            messages = team.setdefault("messages", [])
            messages.append(item)
            if len(messages) > 200:
                del messages[:-200]
            return {"team_id": team_id, "message": item}

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def create_training_challenge(
        self,
        *,
        team_id: str,
        player_id: str,
        opponent_id: str,
        request_id: str,
    ) -> dict:
        fingerprint = self._fingerprint(
            "training_challenge",
            player_id,
            {"team_id": team_id, "opponent_id": opponent_id},
        )

        def operation(payload: dict) -> dict:
            team = payload["teams"].get(team_id)
            members = team.get("member_ids", []) if team else []
            if player_id not in members or opponent_id not in members:
                raise TeamServiceError("Antrenman için iki oyuncu da takım üyesi olmalı.")
            if opponent_id == player_id:
                raise TeamServiceError("Oyuncu kendisine antrenman isteği gönderemez.")
            item = {
                "challenge_id": "training-" + uuid4().hex,
                "challenger_id": player_id,
                "opponent_id": opponent_id,
                "status": "pending",
                "created_at": self._timestamp(),
                "protocol": "team_training_v1",
                "match_type": "team_training",
                "ranked": False,
                "rewards_enabled": False,
            }
            team.setdefault("training_challenges", []).append(item)
            return {"team_id": team_id, "challenge": item}

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )

    def accept_training_challenge(
        self,
        *,
        team_id: str,
        player_id: str,
        challenge_id: str,
        request_id: str,
    ) -> dict:
        fingerprint = self._fingerprint(
            "training_accept",
            player_id,
            {"team_id": team_id, "challenge_id": challenge_id},
        )

        def operation(payload: dict) -> dict:
            team = payload["teams"].get(team_id)
            if team is None or player_id not in team.get("member_ids", []):
                raise TeamServiceError("Antrenman kabulü için takım üyeliği gerekli.")
            item = next(
                (
                    candidate
                    for candidate in team.get("training_challenges", [])
                    if candidate.get("challenge_id") == challenge_id
                ),
                None,
            )
            if item is None:
                raise TeamServiceError("Antrenman isteği bulunamadı.")
            if item.get("opponent_id") != player_id:
                raise TeamServiceError("Bu antrenman isteği başka bir üyeye ait.")
            if item.get("status") != "pending":
                raise TeamServiceError("Antrenman isteği artık beklemede değil.")
            item["status"] = "accepted"
            item["accepted_at"] = self._timestamp()
            return {"team_id": team_id, "challenge": item}

        return self._mutate(
            request_id=request_id,
            fingerprint=fingerprint,
            operation=operation,
        )
