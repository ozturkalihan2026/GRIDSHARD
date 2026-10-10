from __future__ import annotations

from dataclasses import dataclass, replace
from copy import deepcopy
from pathlib import Path
from contextlib import contextmanager
import json
import os
import re
import shutil
from threading import RLock, get_ident
import time
from typing import Protocol

from .arena_canon import MODULES
from .display_names import ensure_display_name_available
from .game.battle_pool import migrate_battle_pool
from .player_profile import (
    CURRENT_SEASON_ID,
    PlayerProfile,
    PlayerProfileService,
)
from .player_settings import (
    ANALYTICS_AGE_ADULT,
    ANALYTICS_AGE_MINOR,
    PlayerSettings,
    PlayerSettingsService,
    analytics_enabled,
)
from .player_statistics import (
    PlayerStatistics,
    PlayerStatisticsService,
)


@dataclass(slots=True, frozen=True)
class PlayerDataSnapshot:
    player_id: str
    profile: dict
    statistics: dict
    settings: dict
    revision: int | None = None

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "profile": dict(self.profile),
            "statistics": dict(
                self.statistics
            ),
            "settings": dict(self.settings),
        }


class PlayerDataRepository(Protocol):
    def save(
        self,
        snapshot: PlayerDataSnapshot,
    ) -> int | None: ...

    def load(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot | None: ...

    def list_snapshots(self) -> list[PlayerDataSnapshot]: ...

    def list_display_names(self) -> list[tuple[str, str]]: ...

    def delete(
        self,
        player_id: str,
    ) -> bool: ...


class JsonFilePlayerDataRepository:
    def __init__(
        self,
        path: str | Path,
    ):
        self.path = Path(path)
        self._lock = RLock()

    @property
    def backup_path(self) -> Path:
        return self.path.with_name(
            self.path.name
            + ".bak"
        )

    def _temporary_path(
        self,
        base: Path,
        label: str,
    ) -> Path:
        return base.with_name(
            f"{base.name}.{label}.{os.getpid()}.{get_ident()}.tmp"
        )

    @property
    def write_lock_path(self) -> Path:
        return self.path.with_name(self.path.name + ".lock")

    @contextmanager
    def _interprocess_write_lock(self):
        """Serialize the read/modify/write cycle across test-server processes."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        deadline = time.monotonic() + 5.0
        descriptor: int | None = None
        while descriptor is None:
            try:
                descriptor = os.open(
                    self.write_lock_path,
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                )
                os.write(descriptor, f"{os.getpid()}\n".encode("ascii"))
            except FileExistsError:
                try:
                    stale = time.time() - self.write_lock_path.stat().st_mtime > 30
                    if stale:
                        self.write_lock_path.unlink(missing_ok=True)
                        continue
                except OSError:
                    pass
                if time.monotonic() >= deadline:
                    raise PlayerDataStoreError(
                        "Kalıcı oyuncu verisi başka bir sunucu işlemi tarafından kullanılıyor."
                    )
                time.sleep(0.01)
        try:
            yield
        finally:
            os.close(descriptor)
            try:
                self.write_lock_path.unlink(missing_ok=True)
            except OSError:
                pass

    @staticmethod
    def _replace_with_retry(
        source: Path,
        destination: Path,
        *,
        attempts: int = 8,
    ) -> None:
        last_error: OSError | None = None
        for attempt in range(attempts):
            try:
                os.replace(source, destination)
                return
            except OSError as exc:
                winerror = getattr(exc, "winerror", None)
                if not isinstance(exc, PermissionError) and winerror not in {5, 32}:
                    raise
                last_error = exc
                if attempt >= attempts - 1:
                    break
                time.sleep(0.01 * (attempt + 1))
        if last_error is not None:
            raise last_error

    def save(
        self,
        snapshot: PlayerDataSnapshot,
    ) -> None:
        with self._lock:
            with self._interprocess_write_lock():
                payload = self._read_all()
                ensure_display_name_available(
                    snapshot.player_id, str(snapshot.profile.get("display_name", snapshot.player_id)),
                    ((owner, str(item["profile"].get("display_name", owner))) for owner, item in payload.items()),
                    previous_name=payload.get(snapshot.player_id, {}).get("profile", {}).get("display_name"),
                )
                payload[
                    snapshot.player_id
                ] = snapshot.to_dict()
                self._write_all(payload)

    def load(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot | None:
        with self._lock:
            payload = self._read_all()
        data = payload.get(
            player_id
        )
        if data is None:
            return None

        return PlayerDataSnapshot(
            player_id=str(
                data["player_id"]
            ),
            profile=dict(
                data["profile"]
            ),
            statistics=dict(
                data["statistics"]
            ),
            settings=dict(
                data["settings"]
            ),
        )

    def list_snapshots(self) -> list[PlayerDataSnapshot]:
        with self._lock:
            payload = self._read_all()
        snapshots: list[PlayerDataSnapshot] = []
        for data in payload.values():
            if not isinstance(data, dict):
                continue
            try:
                snapshots.append(PlayerDataSnapshot(
                    player_id=str(data["player_id"]),
                    profile=dict(data["profile"]),
                    statistics=dict(data["statistics"]),
                    settings=dict(data["settings"]),
                ))
            except (KeyError, TypeError, ValueError):
                continue
        return snapshots

    def list_display_names(self) -> list[tuple[str, str]]:
        with self._lock:
            return [(owner, str(item["profile"].get("display_name", owner)))
                    for owner, item in self._read_all().items()]

    def backup_health(self) -> dict:
        # Windows does not allow the atomic backup replacement while another
        # thread has the old .bak file open.  The health endpoint is
        # polled frequently, so serialize that read with profile writes too.
        with self._lock:
            return self._backup_health_unlocked()

    def _backup_health_unlocked(self) -> dict:
        path = self.backup_path

        if not path.exists():
            return {
                "available": False,
                "ready": False,
                "path": str(path),
                "player_count": 0,
                "error": None,
            }

        try:
            raw = path.read_text(
                encoding="utf-8"
            )
            payload = json.loads(
                raw
            )
        except (
            OSError,
            json.JSONDecodeError,
        ) as exc:
            return {
                "available": True,
                "ready": False,
                "path": str(path),
                "player_count": 0,
                "error":
                    "Yedek oyuncu veri dosyası okunamadı.",
            }

        if not isinstance(
            payload,
            dict,
        ):
            return {
                "available": True,
                "ready": False,
                "path": str(path),
                "player_count": 0,
                "error":
                    "Yedek oyuncu veri dosyası nesne olmalıdır.",
            }

        return {
            "available": True,
            "ready": True,
            "path": str(path),
            "player_count": len(
                payload
            ),
            "error": None,
        }

    def restore_backup(self) -> bool:
        with self._lock:
            with self._interprocess_write_lock():
                health = self.backup_health()

                if not health["ready"]:
                    return False

                try:
                    self.path.parent.mkdir(
                        parents=True,
                        exist_ok=True,
                    )
                    restore_temp = (
                        self.path.with_name(
                            self.path.name
                            + ".restore.tmp"
                        )
                    )
                    shutil.copy2(
                        self.backup_path,
                        restore_temp,
                    )
                    os.replace(
                        restore_temp,
                        self.path,
                    )
                except OSError as exc:
                    raise PlayerDataStoreError(
                        "Kalıcı oyuncu veri yedeği geri yüklenemedi."
                    ) from exc

                return True

    def health(self) -> dict:
        # Keep both the main snapshot and its backup closed while save() does
        # the atomic Windows replacements.
        with self._lock:
            return self._health_unlocked()

    def _health_unlocked(self) -> dict:
        backup = self._backup_health_unlocked()

        if self.path.exists():
            try:
                payload = self._read_all()
            except PlayerDataStoreError as exc:
                return {
                    "ready": False,
                    "state": "corrupt",
                    "path": str(
                        self.path
                    ),
                    "player_count": 0,
                    "error": str(exc),
                    "backup": backup,
                }

            return {
                "ready": True,
                "state": "ready",
                "path": str(
                    self.path
                ),
                "player_count": len(
                    payload
                ),
                "error": None,
                "backup": backup,
            }

        parent = self.path.parent
        probe = parent

        while (
            not probe.exists()
            and probe != probe.parent
        ):
            probe = probe.parent

        writable = (
            probe.exists()
            and os.access(
                probe,
                os.W_OK,
            )
        )

        return {
            "ready": bool(
                writable
            ),
            "state":
                (
                    "empty"
                    if writable
                    else "unwritable"
                ),
            "path": str(
                self.path
            ),
            "player_count": 0,
            "error":
                (
                    None
                    if writable
                    else "Kalıcı oyuncu veri yolu yazılabilir değil."
                ),
            "backup": backup,
        }

    def delete(
        self,
        player_id: str,
    ) -> bool:
        with self._lock:
            with self._interprocess_write_lock():
                payload = self._read_all()
                if player_id not in payload:
                    return False

                payload.pop(
                    player_id,
                    None,
                )
                self._write_all(payload)
                return True

    def _read_all(self) -> dict:
        if not self.path.exists():
            return {}

        try:
            raw = self.path.read_text(
                encoding="utf-8"
            )
            if not raw.strip():
                return {}

            data = json.loads(raw)
        except (
            OSError,
            json.JSONDecodeError,
        ) as exc:
            raise PlayerDataStoreError(
                "Kalıcı oyuncu veri dosyası okunamadı."
            ) from exc

        if not isinstance(
            data,
            dict,
        ):
            raise PlayerDataStoreError(
                "Kalıcı oyuncu veri dosyası nesne olmalıdır."
            )

        return data

    def _write_all(
        self,
        payload: dict,
    ) -> None:
        try:
            self.path.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            if self.path.exists():
                # _write_all yalnızca _read_all başarıyla döndükten sonra
                # çağrılır; bu nedenle mevcut dosya son sağlam snapshot'tır.
                backup_temp = (
                    self._temporary_path(
                        self.backup_path,
                        "backup",
                    )
                )
                shutil.copy2(
                    self.path,
                    backup_temp,
                )
                self._replace_with_retry(
                    backup_temp,
                    self.backup_path,
                )

            temp_path = (
                self._temporary_path(
                    self.path,
                    "write",
                )
            )

            temp_path.write_text(
                json.dumps(
                    payload,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                + "\n",
                encoding="utf-8",
            )

            self._replace_with_retry(
                temp_path,
                self.path,
            )
        except OSError as exc:
            raise PlayerDataStoreError(
                "Kalıcı oyuncu veri dosyası yazılamadı."
            ) from exc


class InMemoryPlayerDataRepository:
    def __init__(self):
        self._lock = RLock()
        self._snapshots: dict[
            str,
            PlayerDataSnapshot,
        ] = {}

    def save(
        self,
        snapshot: PlayerDataSnapshot,
    ) -> None:
        with self._lock:
            previous = self._snapshots.get(snapshot.player_id)
            ensure_display_name_available(
                snapshot.player_id, str(snapshot.profile.get("display_name", snapshot.player_id)),
                ((owner, str(item.profile.get("display_name", owner))) for owner, item in self._snapshots.items()),
                previous_name=previous.profile.get("display_name") if previous else None,
            )
            self._snapshots[snapshot.player_id] = PlayerDataSnapshot(
                player_id=snapshot.player_id,
                profile=dict(snapshot.profile),
                statistics=dict(snapshot.statistics),
                settings=dict(snapshot.settings),
            )

    def load(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot | None:
        snapshot = self._snapshots.get(
            player_id
        )
        if snapshot is None:
            return None

        return PlayerDataSnapshot(
            player_id=snapshot.player_id,
            profile=dict(snapshot.profile),
            statistics=dict(
                snapshot.statistics
            ),
            settings=dict(snapshot.settings),
        )

    def list_snapshots(self) -> list[PlayerDataSnapshot]:
        return [
            PlayerDataSnapshot(
                player_id=snapshot.player_id,
                profile=dict(snapshot.profile),
                statistics=dict(snapshot.statistics),
                settings=dict(snapshot.settings),
            )
            for snapshot in self._snapshots.values()
        ]

    def list_display_names(self) -> list[tuple[str, str]]:
        with self._lock:
            return [(owner, str(item.profile.get("display_name", owner)))
                    for owner, item in self._snapshots.items()]

    def delete(
        self,
        player_id: str,
    ) -> bool:
        return self._snapshots.pop(
            player_id,
            None,
        ) is not None


class PlayerDataStoreError(ValueError):
    pass


# Devre Laboratuvarı kaldırıldı (Beta.72 tur 8). Eski kayıtta kalibrasyona
# yatırılmış Akı yüklemede iade edilir; laboratuvar bloğu bir sonraki kayıtta
# yazılmadığı için iade kalıcı olarak yalnız bir kez işlenir.
RETIRED_LABORATORY_LEVEL_COSTS = (25, 75, 150)


def retired_laboratory_refund(data: dict) -> int:
    levels = dict(dict(data.get("laboratory") or {}).get("module_levels") or {})
    refund = 0
    for level in levels.values():
        try:
            safe_level = max(0, min(len(RETIRED_LABORATORY_LEVEL_COSTS), int(level)))
        except (TypeError, ValueError):
            continue
        refund += sum(RETIRED_LABORATORY_LEVEL_COSTS[:safe_level])
    return refund


class PlayerDataStoreService:
    def __init__(
        self,
        *,
        profile_service: PlayerProfileService,
        statistics_service: PlayerStatisticsService,
        settings_service: PlayerSettingsService,
        repository: PlayerDataRepository,
    ):
        self.profile_service = profile_service
        self.statistics_service = (
            statistics_service
        )
        self.settings_service = (
            settings_service
        )
        self.repository = repository
        self.profile_service.persisted_display_names = lambda: self.repository.list_display_names()

    def build_snapshot(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        profile = (
            self.profile_service
            .get_or_create(player_id)
        )
        statistics = (
            self.statistics_service
            .get_or_create(player_id)
        )
        settings = (
            self.settings_service
            .get_or_create(player_id)
        )

        profile_data = profile.to_view()
        profile_data["meta_progression_state"] = {
            "progression_version": profile.progression_version,
            "highest_rating": max(profile.rating, profile.highest_rating),
            "arena_reward_claims": list(profile.arena_reward_claims),
            "operator_title_claims": list(profile.operator_title_claims),
            "active_season_id": profile.active_meta_season_id,
            "season_archives": [dict(item) for item in profile.season_archives],
            "coins": profile.coins,
            "circuit_credits": profile.circuit_credits,
            "core_shards": profile.core_shards,
            "core_shards_by_type": dict(profile.core_shards_by_type),
            "core_upgrade_levels": dict(profile.core_upgrade_levels),
            "module_talents": dict(profile.module_talents),
            "lifetime_stats": dict(profile.lifetime_stats),
            "module_shards": dict(profile.module_shards),
            "module_upgrade_levels": dict(profile.module_upgrade_levels),
            "module_upgrade_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.module_upgrade_receipts.items()
            },
            "chest_slots": [dict(item) for item in profile.chest_slots],
            "chest_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.chest_receipts.items()
            },
            "chest_batch_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.chest_batch_receipts.items()
            },
            "gift_chest_claim_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.gift_chest_claim_receipts.items()
            },
            "shop_purchase_day": profile.shop_purchase_day,
            "shop_purchased_offer_ids": list(profile.shop_purchased_offer_ids),
            "shop_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.shop_receipts.items()
            },
            "weekly_tournament_period": profile.weekly_tournament_period,
            "weekly_tournament_matches": profile.weekly_tournament_matches,
            "weekly_tournament_wins": profile.weekly_tournament_wins,
            "weekly_tournament_registered_period": profile.weekly_tournament_registered_period,
            "weekly_tournament_trophies_earned": profile.weekly_tournament_trophies_earned,
            "team_tournament_period": profile.team_tournament_period,
            "team_tournament_matches": profile.team_tournament_matches,
            "team_tournament_wins": profile.team_tournament_wins,
            "team_tournament_contribution_points": profile.team_tournament_contribution_points,
            "team_tournament_week_period": profile.team_tournament_week_period,
            "team_tournament_week_matches": profile.team_tournament_week_matches,
            "team_tournament_registered_period": profile.team_tournament_registered_period,
            "friend_ids": list(profile.friend_ids),
            "incoming_friend_request_ids": list(profile.incoming_friend_request_ids),
            "outgoing_friend_request_ids": list(profile.outgoing_friend_request_ids),
            "blocked_player_ids": list(profile.blocked_player_ids),
            "social_battle_invites": [dict(item) for item in profile.social_battle_invites],
            "season_premium_pass_season_id": profile.season_premium_pass_season_id,
            "claimed_premium_season_tiers": list(profile.claimed_premium_season_tiers),
            "season_premium_purchase_key": profile.season_premium_purchase_key,
            "premium_reward_recovery": deepcopy(profile.premium_reward_recovery),
            "battle_premium_season_id": profile.battle_premium_season_id,
            "purchase_receipts": {
                key: dict(receipt) for key, receipt in profile.purchase_receipts.items()
            },
            "ad_reward_receipts": {
                battle_id: dict(receipt) for battle_id, receipt in profile.ad_reward_receipts.items()
            },
            "verified_ad_views": {
                transaction_id: dict(view) for transaction_id, view in profile.verified_ad_views.items()
            },
            "seen_inbox_notice_ids": list(profile.seen_inbox_notice_ids),
            "direct_messages_seen_at": int(profile.direct_messages_seen_at),
            "universal_module_shards": profile.universal_module_shards,
            "reward_inbox": [dict(item) for item in profile.reward_inbox],
            "reward_inbox_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.reward_inbox_receipts.items()
            },
            "daily_meta_day": profile.daily_meta_day,
            "daily_meta_id": profile.daily_meta_id,
            "unlocked_core_types": list(profile.unlocked_core_types),
            "selected_core_type": profile.selected_core_type,
            "core_skill_points": profile.core_skill_points,
            "core_skills": {
                core_type_id: list(skill_ids)
                for core_type_id, skill_ids in profile.core_skills.items()
            },
            "core_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in profile.core_receipts.items()
            },
        }

        return PlayerDataSnapshot(
            player_id=player_id,
            profile=profile_data,
            statistics=statistics.to_view(),
            settings=settings.to_view(),
            revision=profile.storage_revision,
        )

    def save_player(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        snapshot = self.build_snapshot(
            player_id
        )
        revision = self.repository.save(snapshot)
        if type(revision) is int:
            self.profile_service._profiles[player_id].storage_revision = revision
            return replace(snapshot, revision=revision)
        return snapshot

    def load_player(
        self,
        player_id: str,
    ) -> PlayerDataSnapshot:
        snapshot = self.repository.load(
            player_id
        )

        if snapshot is None:
            raise PlayerDataStoreError(
                "Kayıtlı oyuncu verisi bulunamadı."
            )

        self._restore_profile(
            snapshot.profile
        )
        self.profile_service._profiles[player_id].storage_revision = snapshot.revision
        self._restore_statistics(
            snapshot.statistics
        )
        self._restore_settings(
            snapshot.settings
        )

        return snapshot

    def _restore_profile(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]
        engagement = dict(data.get("engagement") or {})
        meta = dict(data.get("meta_progression_state") or {})
        default_shards = {
            module_id: 0
            for module_id in MODULES
        }
        stored_shards = {
            str(module_id): int(amount)
            for module_id, amount in dict(
                meta.get("module_shards", {})
            ).items()
        }
        profile=PlayerProfile(
            player_id=player_id,
            display_name=data[
                "display_name"
            ],
            # Pre-policy custom names have already used their one change.
            # Automatic Pilot names and unchanged legacy IDs keep the right.
            display_name_changes=max(0, int(data.get("display_name_changes", int(
                data["display_name"] != player_id
                and re.fullmatch(r"Pilot-[A-F0-9]{8}", data["display_name"]) is None
            )))),
            team_id=(str(data["team_id"]) if data.get("team_id") else None),
            team_name=(str(data["team_name"]) if data.get("team_name") else None),
            level=int(data["level"]),
            experience=int(
                data["experience"]
            ),
            rating=int(data["rating"]),
            preferred_battle_pool_ids=(
                migrate_battle_pool(
                    data.get("preferred_battle_pool_ids")
                ).module_definition_ids
            ),
            season_xp=int(engagement.get("season_xp", 0)),
            flux_shards=int(engagement.get("flux_shards", 0))
            + retired_laboratory_refund(data),
            claimed_season_tiers=tuple(
                int(value)
                for value in engagement.get("claimed_season_tiers", [])
            ),
            daily_mission_day=str(engagement.get("daily_mission_day", "")),
            daily_mission_progress={
                str(item.get("id")): int(item.get("progress", 0))
                for item in engagement.get("daily_missions", [])
                if item.get("id")
            },
            claimed_daily_missions=tuple(
                str(item.get("id"))
                for item in engagement.get("daily_missions", [])
                if item.get("id") and item.get("claimed")
            ),
            # Eski kayıtta aylık "month" anahtarı durur; dönem kimliğiyle
            # eşleşmediği için ilk eşitlemede yeni döngüye geçilir.
            login_period_id=str(
                dict(engagement.get("daily_login") or {}).get("period")
                or dict(engagement.get("daily_login") or {}).get("month", "")
            ),
            login_period_day=int(
                dict(engagement.get("daily_login") or {}).get("today", 1)
            ),
            login_period_day_count=int(
                dict(engagement.get("daily_login") or {}).get("day_count", 28)
            ),
            claimed_login_period_days=tuple(
                int(value)
                for value in dict(engagement.get("daily_login") or {}).get(
                    "claimed_days", []
                )
            ),
            engagement_claim_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(
                    engagement.get("claim_receipts", {})
                ).items()
                if isinstance(receipt, dict)
            },
            seen_notification_keys=tuple(
                str(value)
                for value in engagement.get("seen_notification_keys", [])
            ),
            unlocked_titles=tuple(
                str(value)
                for value in engagement.get("unlocked_titles", ["Devre Çırağı"])
            ),
            equipped_title=str(engagement.get("equipped_title", "Devre Çırağı")),
            unlocked_avatar_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get(
                    "unlocked_avatar_ids", ["default"]
                )
            ),
            selected_avatar_id=str(
                dict(data.get("cosmetics") or {}).get("selected_avatar_id", "default")
            ),
            unlocked_avatar_frame_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get(
                    "unlocked_avatar_frame_ids", ["none"]
                )
            ),
            selected_avatar_frame_id=str(
                dict(data.get("cosmetics") or {}).get("selected_avatar_frame_id", "none")
            ),
            unlocked_battle_emoji_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get("unlocked_battle_emoji_ids", ["none"])
            ),
            selected_battle_emoji_id=str(
                dict(data.get("cosmetics") or {}).get("selected_battle_emoji_id", "none")
            ),
            unlocked_profile_background_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get("unlocked_profile_background_ids", ["default"])
            ),
            selected_profile_background_id=str(
                dict(data.get("cosmetics") or {}).get("selected_profile_background_id", "default")
            ),
            unlocked_badge_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get("unlocked_badge_ids", [])
            ),
            unlocked_rank_trophy_ids=tuple(
                str(value)
                for value in dict(data.get("cosmetics") or {}).get("unlocked_rank_trophy_ids", [])
            ),
            active_meta_season_id=str(
                meta.get("active_season_id", CURRENT_SEASON_ID)
            ),
            season_archives=[
                dict(item)
                for item in meta.get("season_archives", [])
                if isinstance(item, dict)
            ],
            coins=0,
            progression_version=2,
            highest_rating=max(int(data["rating"]), int(meta.get("highest_rating", 0))),
            arena_reward_claims=tuple(meta.get("arena_reward_claims", ())),
            operator_title_claims=tuple(meta.get("operator_title_claims", ())),
            circuit_credits=int(meta.get("circuit_credits", 350)) + (
                max(0, int(meta.get("coins", 600))) if int(meta.get("progression_version", 1)) < 2 else 0
            ),
            core_shards=int(meta.get("core_shards", 0)),
            # Signed fragment balances are prospective premium refund deficits.
            core_shards_by_type={str(k): int(v) for k, v in meta.get("core_shards_by_type", {}).items()},
            core_upgrade_levels={str(k): max(0, min(14, int(v))) for k, v in meta.get("core_upgrade_levels", {}).items()},
            module_talents={str(k): dict(v) for k, v in meta.get("module_talents", {}).items()},
            lifetime_stats=dict(meta.get("lifetime_stats", {})),
            module_shards={
                **default_shards,
                **stored_shards,
            },
            module_upgrade_levels={
                str(module_id): max(0, min(14, int(level)))
                for module_id, level in dict(
                    meta.get("module_upgrade_levels", {})
                ).items()
            },
            module_upgrade_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(
                    meta.get("module_upgrade_receipts", {})
                ).items()
                if isinstance(receipt, dict)
            },
            chest_slots=[
                dict(item)
                for item in meta.get("chest_slots", [])
                if isinstance(item, dict)
            ],
            chest_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(
                    meta.get("chest_receipts", {})
                ).items()
                if isinstance(receipt, dict)
            },
            chest_batch_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(
                    meta.get("chest_batch_receipts", {})
                ).items()
                if isinstance(receipt, dict)
            },
            gift_chest_claim_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(
                    meta.get("gift_chest_claim_receipts", {})
                ).items()
                if isinstance(receipt, dict)
            },
            shop_purchase_day=str(meta.get("shop_purchase_day", "")),
            shop_purchased_offer_ids=tuple(
                str(value) for value in meta.get("shop_purchased_offer_ids", [])
            ),
            shop_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(meta.get("shop_receipts", {})).items()
                if isinstance(receipt, dict)
            },
            weekly_tournament_period=str(meta.get("weekly_tournament_period", "")),
            weekly_tournament_matches=max(0, int(meta.get("weekly_tournament_matches", 0))),
            weekly_tournament_wins=max(0, int(meta.get("weekly_tournament_wins", 0))),
            weekly_tournament_registered_period=str(meta.get("weekly_tournament_registered_period", "")),
            weekly_tournament_trophies_earned=max(0, int(meta.get("weekly_tournament_trophies_earned", 0))),
            team_tournament_period=str(meta.get("team_tournament_period", "")),
            team_tournament_matches=max(0, int(meta.get("team_tournament_matches", 0))),
            team_tournament_wins=max(0, int(meta.get("team_tournament_wins", 0))),
            team_tournament_contribution_points=max(
                0,
                int(
                    meta.get(
                        "team_tournament_contribution_points",
                        meta.get("team_tournament_wins", 0),
                    )
                ),
            ),
            team_tournament_week_period=str(meta.get("team_tournament_week_period", "")),
            team_tournament_week_matches=max(0, int(meta.get("team_tournament_week_matches", 0))),
            team_tournament_registered_period=str(meta.get("team_tournament_registered_period", "")),
            friend_ids=tuple(str(value) for value in meta.get("friend_ids", [])),
            incoming_friend_request_ids=tuple(
                str(value) for value in meta.get("incoming_friend_request_ids", [])
            ),
            outgoing_friend_request_ids=tuple(
                str(value) for value in meta.get("outgoing_friend_request_ids", [])
            ),
            blocked_player_ids=tuple(
                str(value) for value in meta.get("blocked_player_ids", [])
            ),
            social_battle_invites=[
                dict(item)
                for item in meta.get("social_battle_invites", [])
                if isinstance(item, dict)
            ],
            season_premium_pass_season_id=str(meta.get("season_premium_pass_season_id", "")),
            claimed_premium_season_tiers=tuple(
                int(value) for value in meta.get("claimed_premium_season_tiers", [])
            ),
            season_premium_purchase_key=str(meta.get("season_premium_purchase_key", "")),
            premium_reward_recovery=deepcopy(dict(meta.get("premium_reward_recovery") or {})),
            battle_premium_season_id=str(meta.get("battle_premium_season_id", "")),
            purchase_receipts={
                str(key): dict(receipt)
                for key, receipt in dict(meta.get("purchase_receipts") or {}).items()
                if isinstance(receipt, dict)
            },
            ad_reward_receipts={
                str(battle_id): dict(receipt)
                for battle_id, receipt in dict(meta.get("ad_reward_receipts") or {}).items()
                if isinstance(receipt, dict)
            },
            verified_ad_views={
                str(transaction_id): dict(view)
                for transaction_id, view in dict(meta.get("verified_ad_views") or {}).items()
                if isinstance(view, dict)
            },
            seen_inbox_notice_ids=tuple(
                str(value) for value in meta.get("seen_inbox_notice_ids", [])
            ),
            direct_messages_seen_at=max(0, int(meta.get("direct_messages_seen_at", 0) or 0)),
            universal_module_shards=int(meta.get("universal_module_shards", 0)),
            reward_inbox=[
                dict(item)
                for item in meta.get("reward_inbox", [])
                if isinstance(item, dict)
            ],
            reward_inbox_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(meta.get("reward_inbox_receipts", {})).items()
                if isinstance(receipt, dict)
            },
            daily_meta_day=str(meta.get("daily_meta_day", "")),
            daily_meta_id=str(meta.get("daily_meta_id", "")),
            unlocked_core_types=tuple(
                str(value)
                for value in meta.get("unlocked_core_types", ["core_resonance"])
            ),
            selected_core_type=str(
                meta.get("selected_core_type", "core_resonance")
            ),
            core_skill_points=int(meta.get("core_skill_points", 1)),
            core_skills={
                str(core_type_id): tuple(str(value) for value in skill_ids)
                for core_type_id, skill_ids in dict(meta.get("core_skills", {})).items()
            },
            core_receipts={
                str(request_id): dict(receipt)
                for request_id, receipt in dict(meta.get("core_receipts", {})).items()
                if isinstance(receipt, dict)
            },
        )
        self.profile_service._profiles[
            player_id
        ] = profile

    def _restore_statistics(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]
        usage = {
            item["definition_id"]:
                int(item["matches_used"])
            for item
            in data.get(
                "most_used_modules",
                [],
            )
        }

        stats=PlayerStatistics(
            player_id=player_id,
            total_matches=int(
                data["total_matches"]
            ),
            wins=int(data["wins"]),
            losses=int(data["losses"]),
            draws=int(data["draws"]),
            total_match_duration_ms=(
                int(
                    data[
                        "average_match_duration_ms"
                    ]
                )
                * int(
                    data["total_matches"]
                )
            ),
            total_damage_dealt=int(
                data[
                    "total_damage_dealt"
                ]
            ),
            module_usage=usage,
            match_type_records={
                str(match_type): {
                    str(key): int(value)
                    for key, value in dict(record).items()
                }
                for match_type, record in dict(
                    data.get("by_match_type") or {}
                ).items()
            },
        )

        self.statistics_service._statistics[
            player_id
        ] = stats

    def _restore_settings(
        self,
        data: dict,
    ) -> None:
        player_id=data["player_id"]

        self.settings_service._settings[
            player_id
        ] = PlayerSettings(
            player_id=player_id,
            sound_volume=int(
                data["sound_volume"]
            ),
            music_volume=int(
                data["music_volume"]
            ),
            sound_muted=bool(
                data.get(
                    "sound_muted",
                    False,
                )
            ),
            music_muted=bool(
                data.get(
                    "music_muted",
                    False,
                )
            ),
            vibration_enabled=bool(
                data[
                    "vibration_enabled"
                ]
            ),
            graphics_quality=str(
                data[
                    "graphics_quality"
                ]
            ),
            language=str(
                data["language"]
            ),
            # Yaş sorusundan önce verilmiş izin geçerli sayılmaz; oyuncu
            # yeniden açmak isterse soru sorulur (player_settings.py).
            analytics_consent=analytics_enabled(data),
            analytics_age_gate=(
                data.get("analytics_age_gate")
                if data.get("analytics_age_gate") in (ANALYTICS_AGE_ADULT, ANALYTICS_AGE_MINOR)
                else ""
            ),
            analytics_age_asked_year=int(data.get("analytics_age_asked_year") or 0),
        )
