from dataclasses import dataclass, field
from calendar import monthrange
from datetime import datetime, timedelta, timezone
import hashlib

from .arena_canon import MODULES, unlocked_reward_module_ids
from .game.battle_pool import default_battle_pool, validate_battle_pool


DEFAULT_RATING = 0
XP_PER_LEVEL = 1000
TURKISH_MONTH_NAMES = (
    "",
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
)


def _iso_utc(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def monthly_season_descriptor(moment: datetime | None = None) -> dict:
    """Return the UTC calendar-month season containing ``moment``."""
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    starts_at = datetime(current.year, current.month, 1, tzinfo=timezone.utc)
    if current.month == 12:
        next_starts_at = datetime(current.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_starts_at = datetime(current.year, current.month + 1, 1, tzinfo=timezone.utc)
    ends_at = next_starts_at - timedelta(seconds=1)
    return {
        "id": f"gridshard_{current.year}_{current.month:02d}",
        "name_tr": f"{TURKISH_MONTH_NAMES[current.month]} {current.year} Sezonu",
        "starts_at": _iso_utc(starts_at),
        "ends_at": _iso_utc(ends_at),
    }


_CURRENT_SEASON = monthly_season_descriptor()
CURRENT_SEASON_ID = _CURRENT_SEASON["id"]
CURRENT_SEASON_NAME_TR = _CURRENT_SEASON["name_tr"]
CURRENT_SEASON_STARTS_AT = _CURRENT_SEASON["starts_at"]
CURRENT_SEASON_ENDS_AT = _CURRENT_SEASON["ends_at"]

DAILY_MISSIONS = (
    {
        "id": "complete_battles",
        "name_tr": "Devreyi Ateşle",
        "description_tr": "2 savaş tamamla.",
        "target": 2,
        "season_xp_reward": 20,
        "flux_shard_reward": 10,
    },
    {
        "id": "deal_damage",
        "name_tr": "Çekirdeğe Baskı",
        "description_tr": "Rakip devrelere toplam 1000 hasar ver.",
        "target": 1000,
        "season_xp_reward": 25,
        "flux_shard_reward": 15,
    },
    {
        "id": "circuit_actions",
        "name_tr": "Canlı Strateji",
        "description_tr": "Savaşta 3 modül yerleştir.",
        "target": 3,
        "season_xp_reward": 25,
        "flux_shard_reward": 15,
    },
)

OPERATOR_TITLE_STAGES = (
    {"title_tr": "Devre Çırağı", "required_trophies": 0, "required_wins": 0},
    {"title_tr": "Devre Teknisyeni", "required_trophies": 300, "required_wins": 3},
    {"title_tr": "İletken Ustası", "required_trophies": 900, "required_wins": 10},
    {"title_tr": "Çekirdek Muhafızı", "required_trophies": 1800, "required_wins": 25},
    {"title_tr": "Arena Mimarı", "required_trophies": 3000, "required_wins": 50},
    {"title_tr": "GRIDSHARD Efsanesi", "required_trophies": 4200, "required_wins": 100},
)


def operator_title_progression(rating: int, wins: int) -> dict:
    """Resolve the permanent operator title from trophies and verified wins."""
    trophies = max(0, int(rating))
    victories = max(0, int(wins))
    unlocked = [
        stage
        for stage in OPERATOR_TITLE_STAGES
        if trophies >= stage["required_trophies"]
        and victories >= stage["required_wins"]
    ]
    current = unlocked[-1]
    current_index = OPERATOR_TITLE_STAGES.index(current)
    next_stage = (
        OPERATOR_TITLE_STAGES[current_index + 1]
        if current_index + 1 < len(OPERATOR_TITLE_STAGES)
        else None
    )
    return {
        "current": dict(current),
        "next": dict(next_stage) if next_stage else None,
        "stages": [dict(stage) for stage in OPERATOR_TITLE_STAGES],
    }


def _season_reward_for_tier(tier: int) -> dict:
    # A full calendar-month path: three battles plus completed daily orders
    # unlock the final tier close to month end instead of exhausting the path
    # in the first few play sessions.
    required_xp = (tier * 150) + ((tier * (tier - 1) // 2) * 8)
    reward = {
        "tier": tier,
        "required_xp": required_xp,
        "season_xp_reward": 0,
        "circuit_credits": 0,
        "flux_shards": 0,
        "module_shards": 0,
        "core_shards": 0,
        "chest_tier": None,
        "avatar_id": None,
        "avatar_frame_id": None,
        "title_tr": None,
        "is_major": tier % 10 == 0,
    }
    if tier % 10 == 0:
        major_index = tier // 10
        reward.update(
            circuit_credits=250 + (major_index * 100),
            flux_shards=25 + (major_index * 10),
            module_shards=10 + (major_index * 3),
            chest_tier="diamond" if tier == 40 else "gold",
        )
        if tier == 10:
            reward["avatar_id"] = "circuit_scout"
        elif tier == 20:
            reward["avatar_frame_id"] = "neon_cyan"
        elif tier == 30:
            reward["avatar_id"] = "core_guardian"
        elif tier == 40:
            reward["avatar_frame_id"] = "season_gold"
    elif tier % 5 == 0:
        reward.update(
            circuit_credits=100 + (tier * 4),
            flux_shards=10 + tier,
            module_shards=5 + (tier // 5),
            chest_tier="silver",
        )
    elif tier % 3 == 0:
        reward.update(module_shards=3 + (tier // 6), flux_shards=5)
    elif tier % 2 == 0:
        reward.update(circuit_credits=50 + (tier * 5), flux_shards=4)
    else:
        reward.update(circuit_credits=35 + (tier * 5), module_shards=2 + (tier // 8))

    reward["reward_label_tr"] = (
        f"Büyük {reward['chest_tier'].title()} Sandık + Kozmetik"
        if reward["is_major"]
        else "Anında Sandık Ödülü"
        if reward["chest_tier"]
        else "Modül Parçası ve Akı"
        if reward["module_shards"]
        else "Devre Kredisi ve Akı"
    )
    return reward


SEASON_REWARD_TRACK = tuple(
    _season_reward_for_tier(tier)
    for tier in range(1, 41)
)


def _monthly_login_reward(day: int) -> dict:
    weekly_bonus = day % 7 == 0
    return {
        "day": day,
        "circuit_credits": (120 + (day * 5)) if weekly_bonus else (35 + (day * 3)),
        "flux_shards": (10 + (day // 7)) if weekly_bonus else (2 + (day % 4)),
        "module_shards": (14 + day) if weekly_bonus else (3 + (day % 5)),
        "is_major": weekly_bonus,
    }


MONTHLY_LOGIN_REWARDS = tuple(
    _monthly_login_reward(day)
    for day in range(1, 32)
)


def _profile_reward_identity(profile, reward: dict, seed: str) -> dict:
    """Attach deterministic, unlocked module/core identities to a reward."""
    enriched = dict(reward)
    if int(enriched.get("module_shards", 0)):
        pool = unlocked_reward_module_ids(
            profile.rating,
            profile.highest_rating,
            profile.preferred_battle_pool_ids,
        )
        roll = int(hashlib.sha256(f"{seed}:module".encode("utf-8")).hexdigest()[:12], 16)
        enriched["module_definition_id"] = pool[roll % len(pool)]
    if "core_shards" in enriched:
        # Imported lazily because meta progression also imports the season
        # constants in this module during application startup.
        from .meta_progression import core_reward_type_id

        enriched["core_type_id"] = core_reward_type_id(profile, seed)
    return enriched


def utc_day_key(moment: datetime | None = None) -> str:
    return (moment or datetime.now(timezone.utc)).astimezone(timezone.utc).date().isoformat()


@dataclass(slots=True)
class PlayerProfile:
    player_id: str
    display_name: str
    level: int = 1
    experience: int = 0
    rating: int = DEFAULT_RATING
    highest_rating: int = 0
    team_id: str | None = None
    team_name: str | None = None
    arena_reward_claims: tuple[str, ...] = ()
    progression_version: int = 2
    preferred_battle_pool_ids: tuple[str, ...] = field(
        default_factory=lambda: (
            default_battle_pool().module_definition_ids
        )
    )
    season_xp: int = 0
    flux_shards: int = 0
    claimed_season_tiers: tuple[int, ...] = ()
    daily_mission_day: str = ""
    daily_mission_progress: dict[str, int] = field(default_factory=dict)
    claimed_daily_missions: tuple[str, ...] = ()
    monthly_login_month: str = ""
    monthly_login_today: int = 1
    monthly_login_day_count: int = 31
    claimed_monthly_login_days: tuple[int, ...] = ()
    # Idempotency receipts for reward buttons.  A lost HTTP response must not
    # turn a successful claim into a permanent "doğrulanıyor"/duplicate error.
    engagement_claim_receipts: dict[str, dict] = field(default_factory=dict)
    # Notification acknowledgements are persisted so a page refresh cannot
    # dismiss a newly unlocked reward or cosmetic.
    seen_notification_keys: tuple[str, ...] = ()
    unlocked_titles: tuple[str, ...] = ("Devre Çırağı",)
    equipped_title: str = "Devre Çırağı"
    unlocked_avatar_ids: tuple[str, ...] = ("default",)
    selected_avatar_id: str = "default"
    unlocked_avatar_frame_ids: tuple[str, ...] = ("none",)
    selected_avatar_frame_id: str = "none"
    unlocked_battle_emoji_ids: tuple[str, ...] = ("none",)
    selected_battle_emoji_id: str = "none"
    unlocked_profile_background_ids: tuple[str, ...] = ("default",)
    selected_profile_background_id: str = "default"
    unlocked_badge_ids: tuple[str, ...] = ()
    unlocked_rank_trophy_ids: tuple[str, ...] = ()
    universal_module_shards: int = 0
    reward_inbox: list[dict] = field(default_factory=list)
    reward_inbox_receipts: dict[str, dict] = field(default_factory=dict)
    module_calibration_levels: dict[str, int] = field(default_factory=dict)
    laboratory_transactions: list[dict] = field(default_factory=list)
    laboratory_receipts: dict[str, dict] = field(default_factory=dict)
    laboratory_reset_count: int = 0
    active_meta_season_id: str = CURRENT_SEASON_ID
    season_archives: list[dict] = field(default_factory=list)
    coins: int = 0  # Legacy wallet; migrated into circuit_credits on restore.
    circuit_credits: int = 350
    core_shards: int = 0
    core_shards_by_type: dict[str, int] = field(default_factory=dict)
    core_upgrade_levels: dict[str, int] = field(default_factory=dict)
    module_talents: dict[str, dict[str, str]] = field(default_factory=dict)
    lifetime_stats: dict = field(default_factory=dict)
    module_shards: dict[str, int] = field(
        default_factory=lambda: {
            module_id: 0
            for module_id in MODULES
        }
    )
    module_upgrade_levels: dict[str, int] = field(default_factory=dict)
    module_upgrade_receipts: dict[str, dict] = field(default_factory=dict)
    chest_slots: list[dict] = field(default_factory=list)
    chest_receipts: dict[str, dict] = field(default_factory=dict)
    chest_batch_receipts: dict[str, dict] = field(default_factory=dict)
    gift_chest_claim_receipts: dict[str, dict] = field(default_factory=dict)
    shop_purchase_day: str = ""
    shop_purchased_offer_ids: tuple[str, ...] = ()
    shop_receipts: dict[str, dict] = field(default_factory=dict)
    weekly_tournament_period: str = ""
    weekly_tournament_matches: int = 0
    weekly_tournament_wins: int = 0
    weekly_tournament_registered_period: str = ""
    weekly_tournament_trophies_earned: int = 0
    team_tournament_period: str = ""
    team_tournament_matches: int = 0
    team_tournament_wins: int = 0
    team_tournament_contribution_points: int = 0
    team_tournament_week_period: str = ""
    team_tournament_week_matches: int = 0
    team_tournament_registered_period: str = ""
    friend_ids: tuple[str, ...] = ()
    incoming_friend_request_ids: tuple[str, ...] = ()
    outgoing_friend_request_ids: tuple[str, ...] = ()
    blocked_player_ids: tuple[str, ...] = ()
    social_battle_invites: list[dict] = field(default_factory=list)
    daily_meta_day: str = ""
    daily_meta_id: str = ""
    unlocked_core_types: tuple[str, ...] = ("core_resonance",)
    selected_core_type: str = "core_resonance"
    core_skill_points: int = 1
    core_skills: dict[str, tuple[str, ...]] = field(default_factory=dict)
    core_receipts: dict[str, dict] = field(default_factory=dict)

    @property
    def league_name_tr(self) -> str:
        from .arena_canon import rank_stage_for_rating
        return rank_stage_for_rating(self.rating)["name_tr"]

    @property
    def experience_into_level(self) -> int:
        return self.experience % XP_PER_LEVEL

    @property
    def experience_to_next_level(self) -> int:
        return XP_PER_LEVEL - self.experience_into_level

    def to_view(self) -> dict:
        from .meta_progression import rank_stage_for_rating

        title_progression = operator_title_progression(
            self.rating,
            int(self.lifetime_stats.get("wins", 0)),
        )
        current_title = title_progression["current"]["title_tr"]
        archives = [dict(item) for item in self.season_archives]
        previous_season = archives[-1] if archives else None
        best_season = max(
            archives,
            key=lambda item: int(item.get("final_rating", 0)),
            default=None,
        )

        return {
            "player_id": self.player_id,
            "display_name": self.display_name,
            "level": self.level,
            "experience": self.experience,
            "experience_into_level": self.experience_into_level,
            "experience_to_next_level": self.experience_to_next_level,
            "rating": self.rating,
            "highest_rating": max(self.rating, self.highest_rating),
            "team_id": self.team_id,
            "team_name": self.team_name,
            "league_name_tr": self.league_name_tr,
            "operator_title": current_title,
            "operator_title_progression": title_progression,
            "cosmetics": {
                "selected_avatar_id": self.selected_avatar_id,
                "selected_avatar_frame_id": self.selected_avatar_frame_id,
                "unlocked_avatar_ids": list(self.unlocked_avatar_ids),
                "unlocked_avatar_frame_ids": list(self.unlocked_avatar_frame_ids),
                "selected_battle_emoji_id": self.selected_battle_emoji_id,
                "unlocked_battle_emoji_ids": list(self.unlocked_battle_emoji_ids),
                "selected_profile_background_id": self.selected_profile_background_id,
                "unlocked_profile_background_ids": list(self.unlocked_profile_background_ids),
                "unlocked_badge_ids": list(self.unlocked_badge_ids),
                "unlocked_rank_trophy_ids": list(self.unlocked_rank_trophy_ids),
            },
            "season_summary": {
                "current_rating": self.rating,
                "current_league_name_tr": self.league_name_tr,
                "previous": previous_season,
                "best": best_season,
            },
            "preferred_battle_pool_ids": list(
                self.preferred_battle_pool_ids
            ),
            "profile_sections": [
                "Genel",
                "İlerleme",
                "Sezon",
                "Savaş Havuzu",
            ],
            "engagement": self.engagement_view(),
            "laboratory_summary": {
                "calibrated_module_count": sum(
                    1
                    for level in self.module_calibration_levels.values()
                    if int(level) > 0
                ),
                "reset_count": self.laboratory_reset_count,
                "ranked_normalized": True,
            },
            "meta_progression_summary": {
                "season_id": self.active_meta_season_id,
                "rank": rank_stage_for_rating(self.rating),
                "coins": self.coins,
                "circuit_credits": self.circuit_credits,
                "core_shards": self.core_shards,
                "upgraded_module_count": sum(
                    1
                    for level in self.module_upgrade_levels.values()
                    if int(level) > 0
                ),
                "chest_slot_count": len(self.chest_slots),
                "selected_core_type": self.selected_core_type,
                "core_skill_points": self.core_skill_points,
                "season_archive_count": len(self.season_archives),
                "ranked_normalized": True,
            },
        }

    def engagement_view(self) -> dict:
        season = monthly_season_descriptor()
        claimed_tiers = set(self.claimed_season_tiers)
        claimed_missions = set(self.claimed_daily_missions)
        completed_tiers = [
            reward["tier"]
            for reward in SEASON_REWARD_TRACK
            if self.season_xp >= reward["required_xp"]
        ]
        current_tier = max(completed_tiers, default=0)
        next_reward = next(
            (
                reward
                for reward in SEASON_REWARD_TRACK
                if self.season_xp < reward["required_xp"]
            ),
            None,
        )
        if next_reward is None:
            previous_required = SEASON_REWARD_TRACK[-1]["required_xp"]
            next_required = previous_required
            span = 1
            progress = 1
        else:
            previous_required = (
                SEASON_REWARD_TRACK[current_tier - 1]["required_xp"]
                if current_tier > 0
                else 0
            )
            next_required = next_reward["required_xp"]
            span = max(1, next_required - previous_required)
            progress = min(span, max(0, self.season_xp - previous_required))

        receipt_values = tuple(self.engagement_claim_receipts.values())

        def reward_view(reward: dict, kind: str, identity: int) -> dict:
            seed = (
                f"login:{self.monthly_login_month}:{self.player_id}:{identity}"
                if kind == "login"
                else f"season:{self.active_meta_season_id}:{self.player_id}:{identity}"
            )
            result = _profile_reward_identity(self, reward, seed)
            previous = next(
                (
                    receipt
                    for receipt in receipt_values
                    if receipt.get("kind") == kind
                    and int(receipt.get("day" if kind == "login" else "tier", -1)) == identity
                ),
                None,
            )
            if previous:
                for key in ("module_definition_id", "core_type_id"):
                    if previous.get(key):
                        result[key] = previous[key]
            return result

        notification_groups = self.notification_keys_by_section()
        seen_notifications = set(self.seen_notification_keys)
        unseen_notifications = {
            section: [key for key in keys if key not in seen_notifications]
            for section, keys in notification_groups.items()
        }

        return {
            "season_id": season["id"],
            "season_name_tr": season["name_tr"],
            "season_starts_at": season["starts_at"],
            "season_ends_at": season["ends_at"],
            "season_xp": self.season_xp,
            "current_tier": current_tier,
            "max_tier": len(SEASON_REWARD_TRACK),
            "tier_progress": progress,
            "tier_progress_required": span,
            "flux_shards": self.flux_shards,
            "claimed_season_tiers": list(self.claimed_season_tiers),
            "equipped_title": operator_title_progression(
                self.rating,
                int(self.lifetime_stats.get("wins", 0)),
            )["current"]["title_tr"],
            "unlocked_titles": list(self.unlocked_titles),
            "daily_mission_day": self.daily_mission_day,
            "daily_missions": [
                {
                    **mission,
                    "progress": min(
                        mission["target"],
                        int(self.daily_mission_progress.get(mission["id"], 0)),
                    ),
                    "completed": int(
                        self.daily_mission_progress.get(mission["id"], 0)
                    ) >= mission["target"],
                    "claimed": mission["id"] in claimed_missions,
                }
                for mission in DAILY_MISSIONS
            ],
            "daily_login": {
                "month": self.monthly_login_month,
                "today": self.monthly_login_today,
                "day_count": self.monthly_login_day_count,
                "claimed_days": list(self.claimed_monthly_login_days),
                "rewards": [
                    {
                        **reward_view(reward, "login", int(reward["day"])),
                        "claimed": reward["day"] in self.claimed_monthly_login_days,
                        "claimable": (
                            reward["day"] == self.monthly_login_today
                            and reward["day"] not in self.claimed_monthly_login_days
                        ),
                    }
                    for reward in MONTHLY_LOGIN_REWARDS[:self.monthly_login_day_count]
                ],
            },
            "claim_receipts": {
                request_id: dict(receipt)
                for request_id, receipt in self.engagement_claim_receipts.items()
            },
            "seen_notification_keys": list(self.seen_notification_keys),
            "notifications": {
                # Profile is the container screen; unread state is surfaced
                # by the Rewards child tab so the same dot is not rendered
                # twice in the terminal navigation.
                "profile": False,
                "rewards": bool(
                    unseen_notifications["daily"]
                    or unseen_notifications["season"]
                ),
                "daily": bool(unseen_notifications["daily"]),
                "daily_login": bool(unseen_notifications["daily-login"]),
                "daily_missions": bool(unseen_notifications["daily-missions"]),
                "season": bool(unseen_notifications["season"]),
                "avatar": bool(unseen_notifications["avatar"]),
                "unseen_keys": list(dict.fromkeys(
                    key
                    for keys in unseen_notifications.values()
                    for key in keys
                )),
            },
            "reward_track": [
                {
                    **reward_view(reward, "tiers", int(reward["tier"])),
                    "claimed": reward["tier"] in claimed_tiers,
                    "claimable": (
                        self.season_xp >= reward["required_xp"]
                        and reward["tier"] not in claimed_tiers
                    ),
                }
                for reward in SEASON_REWARD_TRACK
            ],
        }

    def notification_keys_by_section(self) -> dict[str, tuple[str, ...]]:
        claimed_missions = set(self.claimed_daily_missions)
        claimed_tiers = set(self.claimed_season_tiers)
        claimed_login_days = set(self.claimed_monthly_login_days)
        daily_login_keys: list[str] = []
        if self.monthly_login_today not in claimed_login_days:
            daily_login_keys.append(
                f"daily-login:{self.monthly_login_month}:{self.monthly_login_today}"
            )
        daily_mission_keys = [
            f"daily-mission:{self.daily_mission_day}:{mission['id']}"
            for mission in DAILY_MISSIONS
            if mission["id"] not in claimed_missions
            and int(self.daily_mission_progress.get(mission["id"], 0))
            >= int(mission["target"])
        ]
        daily_keys = [*daily_login_keys, *daily_mission_keys]
        season_keys = tuple(
            f"season-tier:{self.active_meta_season_id}:{reward['tier']}"
            for reward in SEASON_REWARD_TRACK
            if int(self.season_xp) >= int(reward["required_xp"])
            and int(reward["tier"]) not in claimed_tiers
        )
        avatar_keys = tuple(
            [
                f"avatar:{avatar_id}"
                for avatar_id in self.unlocked_avatar_ids
                if avatar_id != "default"
            ]
            + [
                f"avatar-frame:{frame_id}"
                for frame_id in self.unlocked_avatar_frame_ids
                if frame_id != "none"
            ]
        )
        return {
            "daily": tuple(daily_keys),
            "daily-login": tuple(daily_login_keys),
            "daily-missions": tuple(daily_mission_keys),
            "season": season_keys,
            "avatar": avatar_keys,
        }


class PlayerProfileError(ValueError):
    pass


class PlayerProfileService:
    def __init__(self, now_func=None):
        self._profiles: dict[str, PlayerProfile] = {}
        self._now_func = now_func or (lambda: datetime.now(timezone.utc))

    def get_or_create(
        self,
        player_id: str,
        *,
        display_name: str | None = None,
        day_key: str | None = None,
    ) -> PlayerProfile:
        if not player_id:
            raise PlayerProfileError(
                "Oyuncu kimliği boş olamaz."
            )

        profile = self._profiles.get(player_id)
        if profile is not None:
            self._sync_monthly_season(profile)
            self._sync_daily_missions(profile, day_key)
            self._sync_monthly_login(profile)
            return profile

        profile = PlayerProfile(
            player_id=player_id,
            display_name=(
                display_name
                if display_name
                else player_id
            ),
            active_meta_season_id=monthly_season_descriptor(self._now_func())["id"],
        )
        self._profiles[player_id] = profile
        self._sync_monthly_season(profile)
        self._sync_daily_missions(profile, day_key)
        self._sync_monthly_login(profile)
        return profile

    def _sync_monthly_season(self, profile: PlayerProfile) -> bool:
        season = monthly_season_descriptor(self._now_func())
        if profile.active_meta_season_id == season["id"]:
            return False

        from .meta_progression import archive_and_soft_reset_season

        archive_and_soft_reset_season(
            profile,
            season["id"],
            archived_at=season["starts_at"],
        )
        return True

    def get(self, player_id: str) -> PlayerProfile:
        try:
            return self._profiles[player_id]
        except KeyError as exc:
            raise PlayerProfileError(
                "Oyuncu profili bulunamadı."
            ) from exc

    def set_display_name(
        self,
        player_id: str,
        display_name: str,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        clean = display_name.strip()

        if not clean:
            raise PlayerProfileError(
                "Görünen oyuncu adı boş olamaz."
            )
        if len(clean) > 24:
            raise PlayerProfileError(
                "Görünen oyuncu adı en fazla 24 karakter olabilir."
            )

        profile.display_name = clean
        return profile

    def set_preferred_battle_pool(
        self,
        player_id: str,
        module_definition_ids,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        pool = validate_battle_pool(
            module_definition_ids
        )
        profile.preferred_battle_pool_ids = (
            pool.module_definition_ids
        )
        return profile

    def set_cosmetics(
        self,
        player_id: str,
        *,
        avatar_id: str | None = None,
        avatar_frame_id: str | None = None,
        battle_emoji_id: str | None = None,
        profile_background_id: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        if avatar_id is not None:
            clean_avatar = avatar_id.strip()
            if clean_avatar not in profile.unlocked_avatar_ids:
                raise PlayerProfileError("Bu avatar henüz açılmadı.")
            profile.selected_avatar_id = clean_avatar
        if avatar_frame_id is not None:
            clean_frame = avatar_frame_id.strip()
            if clean_frame not in profile.unlocked_avatar_frame_ids:
                raise PlayerProfileError("Bu avatar çerçevesi henüz açılmadı.")
            profile.selected_avatar_frame_id = clean_frame
        if battle_emoji_id is not None:
            clean_emoji = battle_emoji_id.strip()
            if clean_emoji not in profile.unlocked_battle_emoji_ids:
                raise PlayerProfileError("Bu savaş emojisi henüz açılmadı.")
            profile.selected_battle_emoji_id = clean_emoji
        if profile_background_id is not None:
            clean_background = profile_background_id.strip()
            if clean_background not in profile.unlocked_profile_background_ids:
                raise PlayerProfileError("Bu profil çubuğu arka planı henüz açılmadı.")
            profile.selected_profile_background_id = clean_background
        return profile

    def mark_notifications_seen(
        self,
        player_id: str,
        section: str,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        normalized = section.strip().lower()
        groups = profile.notification_keys_by_section()
        if normalized not in groups:
            raise PlayerProfileError("Bilinmeyen bildirim bölümü.")
        profile.seen_notification_keys = tuple(
            dict.fromkeys((*profile.seen_notification_keys, *groups[normalized]))
        )
        return profile

    def add_experience(
        self,
        player_id: str,
        amount: int,
    ) -> PlayerProfile:
        if amount < 0:
            raise PlayerProfileError(
                "Deneyim miktarı negatif olamaz."
            )

        profile = self.get_or_create(player_id)
        profile.experience += amount
        profile.level = (
            profile.experience // XP_PER_LEVEL
        ) + 1
        return profile

    def set_rating(
        self,
        player_id: str,
        rating: int,
    ) -> PlayerProfile:
        if rating < 0:
            raise PlayerProfileError(
                "Derece puanı negatif olamaz."
            )

        profile = self.get_or_create(player_id)
        profile.rating = int(rating)
        profile.highest_rating = max(profile.highest_rating, profile.rating)
        return profile

    def _sync_daily_missions(
        self,
        profile: PlayerProfile,
        day_key: str | None = None,
    ) -> None:
        current_day = day_key or utc_day_key(self._now_func())
        if profile.daily_mission_day == current_day:
            return
        profile.daily_mission_day = current_day
        profile.daily_mission_progress = {
            mission["id"]: 0
            for mission in DAILY_MISSIONS
        }
        profile.claimed_daily_missions = ()

    def _sync_monthly_login(self, profile: PlayerProfile) -> None:
        now = self._now_func().astimezone(timezone.utc)
        month_key = f"{now.year:04d}-{now.month:02d}"
        if profile.monthly_login_month != month_key:
            profile.monthly_login_month = month_key
            profile.claimed_monthly_login_days = ()
        profile.monthly_login_today = now.day
        profile.monthly_login_day_count = monthrange(now.year, now.month)[1]

    def claim_monthly_login(self, player_id: str, day: int, request_id: str | None = None) -> dict:
        profile = self.get_or_create(player_id)
        if request_id and request_id in profile.engagement_claim_receipts:
            return dict(profile.engagement_claim_receipts[request_id])
        self._sync_monthly_login(profile)
        if day != profile.monthly_login_today:
            raise PlayerProfileError("Yalnız bugünün giriş ödülü alınabilir.")
        if day in profile.claimed_monthly_login_days:
            raise PlayerProfileError("Bugünün giriş ödülü daha önce alındı.")
        reward = _profile_reward_identity(
            profile,
            MONTHLY_LOGIN_REWARDS[day - 1],
            f"login:{profile.monthly_login_month}:{profile.player_id}:{day}",
        )
        module_id = reward["module_definition_id"]
        profile.circuit_credits += int(reward["circuit_credits"])
        profile.flux_shards += int(reward["flux_shards"])
        profile.module_shards[module_id] = (
            int(profile.module_shards.get(module_id, 0))
            + int(reward["module_shards"])
        )
        profile.claimed_monthly_login_days = tuple(
            sorted({*profile.claimed_monthly_login_days, day})
        )
        receipt = {
            **reward,
            "kind": "login",
            "month": profile.monthly_login_month,
        }
        if request_id:
            profile.engagement_claim_receipts[request_id] = dict(receipt)
        return receipt

    def record_battle_engagement(
        self,
        player_id: str,
        *,
        season_xp_awarded: int,
        damage_dealt: int,
        circuit_actions: int,
        day_key: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id, day_key=day_key)
        self._sync_daily_missions(profile, day_key)
        profile.season_xp += max(0, int(season_xp_awarded))
        increments = {
            "complete_battles": 1,
            "deal_damage": max(0, int(damage_dealt)),
            "circuit_actions": max(0, int(circuit_actions)),
        }
        for mission in DAILY_MISSIONS:
            mission_id = mission["id"]
            profile.daily_mission_progress[mission_id] = min(
                mission["target"],
                int(profile.daily_mission_progress.get(mission_id, 0))
                + increments[mission_id],
            )
        return profile

    def claim_daily_mission(
        self,
        player_id: str,
        mission_id: str,
        *,
        day_key: str | None = None,
        request_id: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id, day_key=day_key)
        if request_id and request_id in profile.engagement_claim_receipts:
            return profile
        self._sync_daily_missions(profile, day_key)
        mission = next(
            (item for item in DAILY_MISSIONS if item["id"] == mission_id),
            None,
        )
        if mission is None:
            raise PlayerProfileError("Bilinmeyen günlük görev.")
        if mission_id in profile.claimed_daily_missions:
            raise PlayerProfileError("Bu görev ödülü daha önce alındı.")
        if profile.daily_mission_progress.get(mission_id, 0) < mission["target"]:
            raise PlayerProfileError("Görev henüz tamamlanmadı.")
        profile.season_xp += int(mission["season_xp_reward"])
        profile.flux_shards += int(mission["flux_shard_reward"])
        profile.claimed_daily_missions = tuple(
            sorted({*profile.claimed_daily_missions, mission_id})
        )
        if request_id:
            profile.engagement_claim_receipts[request_id] = {
                "kind": "missions",
                "mission_id": mission_id,
                "day": profile.daily_mission_day,
            }
        return profile

    def claim_season_tier(
        self,
        player_id: str,
        tier: int,
        request_id: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        if request_id and request_id in profile.engagement_claim_receipts:
            return profile
        base_reward = next(
            (item for item in SEASON_REWARD_TRACK if item["tier"] == tier),
            None,
        )
        if base_reward is None:
            raise PlayerProfileError("Bilinmeyen sezon kademesi.")
        if tier in profile.claimed_season_tiers:
            raise PlayerProfileError("Bu kademe ödülü daha önce alındı.")
        if profile.season_xp < base_reward["required_xp"]:
            raise PlayerProfileError("Bu sezon kademesi henüz açılmadı.")
        reward = _profile_reward_identity(
            profile,
            base_reward,
            f"season:{profile.active_meta_season_id}:{profile.player_id}:{tier}",
        )
        profile.circuit_credits += int(reward.get("circuit_credits", 0))
        profile.flux_shards += int(reward["flux_shards"])
        core_shards = int(reward.get("core_shards", 0))
        core_type_id = reward.get("core_type_id")
        if core_shards and core_type_id:
            profile.core_shards_by_type[core_type_id] = (
                int(profile.core_shards_by_type.get(core_type_id, 0)) + core_shards
            )
        elif core_type_id:
            profile.core_shards_by_type.setdefault(core_type_id, 0)
        module_shards = int(reward.get("module_shards", 0))
        if module_shards:
            module_id = reward["module_definition_id"]
            profile.module_shards[module_id] = int(profile.module_shards.get(module_id, 0)) + module_shards
        profile.claimed_season_tiers = tuple(
            sorted({*profile.claimed_season_tiers, tier})
        )
        if request_id:
            profile.engagement_claim_receipts[request_id] = {
                **reward,
                "kind": "tiers",
                "tier": tier,
                "season_id": profile.active_meta_season_id,
            }
        avatar_id = reward.get("avatar_id")
        if avatar_id:
            profile.unlocked_avatar_ids = tuple(
                dict.fromkeys((*profile.unlocked_avatar_ids, avatar_id))
            )
        avatar_frame_id = reward.get("avatar_frame_id")
        if avatar_frame_id:
            profile.unlocked_avatar_frame_ids = tuple(
                dict.fromkeys((*profile.unlocked_avatar_frame_ids, avatar_frame_id))
            )
        title = reward.get("title_tr")
        if title:
            profile.unlocked_titles = tuple(
                dict.fromkeys((*profile.unlocked_titles, title))
            )
            profile.equipped_title = title
        return profile
