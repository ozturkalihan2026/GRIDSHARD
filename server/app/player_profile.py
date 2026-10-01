from dataclasses import dataclass, field
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
from threading import RLock, local

from .display_names import (
    DisplayNameError, normalize_display_name, ensure_display_name_available,
    default_operator_name, is_automatic_player_id,
)

from .arena_canon import MODULES, unlocked_reward_module_ids
from .competition_cycle import CYCLE_EPOCH, CYCLE_LENGTH, competition_cycle, cycle_for_id
from .season_competition import LEADERBOARD_PRIZES, TEAM_PRIZES, WEEKLY_PRIZES
from .game.battle_pool import default_battle_pool, validate_battle_pool
from .store_catalog import BATTLE_PREMIUM_BONUS_PERCENT, PRODUCTS_BY_ID, price_label_tr


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


def season_descriptor(moment: datetime | None = None) -> dict:
    """Anı içeren sezon: Pazartesi başlayan dört haftalık döngü.

    Döngüler 28 Eylül 2026'da başlar (competition_cycle.py). Daha önceki anlar
    eski takvim ayı sezonunda kalır; Eylül 2026 sezonu geçiş için 27 Eylül
    Pazar 23:59:59'da biter.
    """
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    if current < CYCLE_EPOCH:
        starts_at = datetime(current.year, current.month, 1, tzinfo=timezone.utc)
        if current.month == 12:
            next_starts_at = datetime(current.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            next_starts_at = datetime(current.year, current.month + 1, 1, tzinfo=timezone.utc)
        return {
            "id": f"gridshard_{current.year}_{current.month:02d}",
            "name_tr": f"{TURKISH_MONTH_NAMES[current.month]} {current.year} Sezonu",
            "starts_at": _iso_utc(starts_at),
            "ends_at": _iso_utc(min(next_starts_at, CYCLE_EPOCH) - timedelta(seconds=1)),
        }
    cycle = competition_cycle(current)
    return {
        "id": f"gridshard_{cycle['id'].replace('-', '_')}",
        "name_tr": f"Sezon {cycle['number']}",
        "starts_at": _iso_utc(cycle["starts_at"]),
        "ends_at": _iso_utc(cycle["ends_at"] - timedelta(seconds=1)),
    }


_CURRENT_SEASON = season_descriptor()
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
    {
        "id": "win_battles",
        "name_tr": "Zafer Sinyali",
        "description_tr": "1 savaş kazan.",
        "target": 1,
        "season_xp_reward": 25,
        "flux_shard_reward": 15,
    },
    {
        "id": "destroy_modules",
        "name_tr": "Devre Kesici",
        "description_tr": "Rakibin 4 modülünü yok et.",
        "target": 4,
        "season_xp_reward": 20,
        "flux_shard_reward": 10,
    },
    {
        "id": "core_power",
        "name_tr": "Çekirdek Nabzı",
        "description_tr": "Çekirdek gücünü 2 kez kullan.",
        "target": 2,
        "season_xp_reward": 20,
        "flux_shard_reward": 10,
    },
)

OPERATOR_TITLE_STAGES = (
    {"id": "devre_ciragi", "title_tr": "Devre Çırağı", "required_trophies": 0, "required_wins": 0, "reward_circuit_credits": 0},
    {"id": "devre_teknisyeni", "title_tr": "Devre Teknisyeni", "required_trophies": 300, "required_wins": 3, "reward_circuit_credits": 100},
    {"id": "iletken_ustasi", "title_tr": "İletken Ustası", "required_trophies": 900, "required_wins": 10, "reward_circuit_credits": 150},
    {"id": "cekirdek_muhafizi", "title_tr": "Çekirdek Muhafızı", "required_trophies": 1800, "required_wins": 25, "reward_circuit_credits": 200},
    {"id": "arena_mimari", "title_tr": "Arena Mimarı", "required_trophies": 3000, "required_wins": 50, "reward_circuit_credits": 300},
    {"id": "gridshard_efsanesi", "title_tr": "GRIDSHARD Efsanesi", "required_trophies": 4200, "required_wins": 100, "reward_circuit_credits": 500},
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


def operator_title_view(rating: int, wins: int, claimed_ids=()) -> dict:
    """Resolve title progress and one-time reward eligibility."""
    progression = operator_title_progression(rating, wins)
    current_id = progression["current"]["id"]
    current_index = next(index for index, stage in enumerate(OPERATOR_TITLE_STAGES) if stage["id"] == current_id)
    claimed = set(claimed_ids)
    stages = []
    for index, stage in enumerate(progression["stages"]):
        reached = index <= current_index
        stages.append({
            **stage,
            "reached": reached,
            "claimed": stage["id"] in claimed,
            "claimable": reached and stage["reward_circuit_credits"] > 0 and stage["id"] not in claimed,
        })
    return {**progression, "stages": stages, "trophies": max(0, int(rating)), "wins": max(0, int(wins))}


# Herkese açık gerçek emojiler; savaşta ilk günden paylaşılabilir.
FREE_BATTLE_EMOJI_IDS: tuple[str, ...] = (
    "thumbs_up", "laugh", "wow", "cry", "angry", "good_game",
)
# Sezon yolunun ara kademelerinde kazanılan gerçek emojiler.
SEASON_ROAD_EMOJI_REWARDS: dict[int, str] = {
    5: "fire",
    15: "cool",
    25: "mind_blown",
    35: "crown",
}


def _season_reward_for_tier(tier: int) -> dict:
    # A full four-week path: three battles plus completed daily orders unlock
    # the final tier close to the season end instead of exhausting the path in
    # the first few play sessions.
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
        "emoji_id": SEASON_ROAD_EMOJI_REWARDS.get(tier),
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
        else "Anında Sandık + Savaş Emojisi"
        if reward["emoji_id"]
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


def _cosmetic_unlock_sources() -> dict[str, dict[str, list[dict]]]:
    """Kozmetik → onu açan ödül(ler). Kozmetik ekranı kilidin nedenini gösterir.

    Lider panosu, haftalık ve takım turnuvası özel ödülleri yalnız o sandık
    alınınca açılır; sezon yolu ödülleri kademe alınınca açılır.
    """
    sources: dict[str, dict[str, list[dict]]] = {
        "avatar": {}, "avatar_frame": {}, "battle_emoji": {}, "profile_background": {},
    }
    fields = {
        "avatar_id": "avatar",
        "avatar_frame_id": "avatar_frame",
        "emoji_id": "battle_emoji",
        "profile_background_id": "profile_background",
    }

    def add(kind: str, item_id: str | None, source: dict) -> None:
        if item_id:
            sources[kind].setdefault(item_id, []).append(source)

    for reward in SEASON_REWARD_TRACK:
        for field_name, kind in fields.items():
            add(kind, reward.get(field_name), {"kind": "season_road", "tier": reward["tier"]})
    for kind_name, prizes in (
        ("leaderboard", LEADERBOARD_PRIZES),
        ("weekly_tournament", WEEKLY_PRIZES),
        ("team_tournament", TEAM_PRIZES),
    ):
        for prize in prizes:
            for field_name, kind in fields.items():
                add(kind, prize.get(field_name), {"kind": kind_name, "position": prize["position"]})
    for emoji_id in FREE_BATTLE_EMOJI_IDS:
        add("battle_emoji", emoji_id, {"kind": "free"})
    return sources


COSMETIC_UNLOCK_SOURCES = _cosmetic_unlock_sources()

# Ücretli geçiş sütunu: her kademede ücretsiz ödülün iki katı kaynak ve iki
# sandık. Kozmetikler ücretsiz yolda kalır (aynı kozmetik iki kez açılmaz).
PREMIUM_PASS_MULTIPLIER = 2
PREMIUM_PASS_PRODUCT = PRODUCTS_BY_ID["season_pass_premium"]
PREMIUM_PASS_STATUS_TR = (
    f"Ücretli geçiş {price_label_tr(PREMIUM_PASS_PRODUCT['price_kurus'])}: bu sezonun "
    "premium ödül hattını açar; premium ödüller iki kattır."
)


def _premium_season_reward(base: dict) -> dict:
    reward = dict(base)
    for key in ("circuit_credits", "flux_shards", "module_shards", "core_shards"):
        reward[key] = int(base.get(key, 0) or 0) * PREMIUM_PASS_MULTIPLIER
    reward["chest_count"] = PREMIUM_PASS_MULTIPLIER if base.get("chest_tier") else 0
    reward["avatar_id"] = None
    reward["avatar_frame_id"] = None
    reward["emoji_id"] = None
    reward["title_tr"] = None
    reward["track"] = "premium"
    return reward


SEASON_PREMIUM_REWARD_TRACK = tuple(
    _premium_season_reward(reward)
    for reward in SEASON_REWARD_TRACK
)


def _login_period_reward(day: int) -> dict:
    # Dönem Pazartesi başlar; her haftanın 7. günü (Pazar) büyük ödüldür.
    weekly_bonus = day % 7 == 0
    return {
        "day": day,
        "circuit_credits": (120 + (day * 5)) if weekly_bonus else (35 + (day * 3)),
        "flux_shards": (10 + (day // 7)) if weekly_bonus else (2 + (day % 4)),
        "module_shards": (14 + day) if weekly_bonus else (3 + (day % 5)),
        "is_major": weekly_bonus,
    }


# Giriş takvimi sezonla aynı dört haftalık döngüdür (competition_cycle.py).
LOGIN_PERIOD_REWARDS = tuple(
    _login_period_reward(day)
    for day in range(1, CYCLE_LENGTH.days + 1)
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
    login_period_id: str = ""
    login_period_day: int = 1
    login_period_day_count: int = CYCLE_LENGTH.days
    claimed_login_period_days: tuple[int, ...] = ()
    # Idempotency receipts for reward buttons.  A lost HTTP response must not
    # turn a successful claim into a permanent "doğrulanıyor"/duplicate error.
    engagement_claim_receipts: dict[str, dict] = field(default_factory=dict)
    # Notification acknowledgements are persisted so a page refresh cannot
    # dismiss a newly unlocked reward or cosmetic.
    seen_notification_keys: tuple[str, ...] = ()
    unlocked_titles: tuple[str, ...] = ("Devre Çırağı",)
    equipped_title: str = "Devre Çırağı"
    operator_title_claims: tuple[str, ...] = ()
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
    # Ücretli geçişin açık olduğu sezon; başka sezonda geçiş etkin sayılmaz.
    season_premium_pass_season_id: str = ""
    claimed_premium_season_tiers: tuple[int, ...] = ()
    # Savaş Premium'un açık olduğu sezon: savaş sonu kredi ve deneyim artar (kupa hariç).
    battle_premium_season_id: str = ""
    # Gerçek para alımlarının makbuzları (sağlayıcı:işlem kimliği → makbuz).
    purchase_receipts: dict[str, dict] = field(default_factory=dict)
    # Reklamla ikiye katlanan savaş ödülleri (savaş kimliği → makbuz).
    ad_reward_receipts: dict[str, dict] = field(default_factory=dict)
    # AdMob SSV'nin imzasını doğruladığı reklam izlemeleri (işlem kimliği → kayıt).
    verified_ad_views: dict[str, dict] = field(default_factory=dict)
    # Mesaj kutusundaki duyurular ve doğrudan mesajlar için okundu izleri.
    seen_inbox_notice_ids: tuple[str, ...] = ()
    direct_messages_seen_at: int = 0
    daily_meta_day: str = ""
    daily_meta_id: str = ""
    unlocked_core_types: tuple[str, ...] = ("core_resonance",)
    selected_core_type: str = "core_resonance"
    core_skill_points: int = 1
    core_skills: dict[str, tuple[str, ...]] = field(default_factory=dict)
    core_receipts: dict[str, dict] = field(default_factory=dict)
    # Database concurrency token; never included in a client profile view.
    storage_revision: int | None = field(default=None, repr=False, compare=False)

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

        title_progression = operator_title_view(
            self.rating,
            int(self.lifetime_stats.get("wins", 0)),
            self.operator_title_claims,
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
                "unlocked_battle_emoji_ids": list(self.available_battle_emoji_ids),
                "selected_profile_background_id": self.selected_profile_background_id,
                "unlocked_profile_background_ids": list(self.unlocked_profile_background_ids),
                "unlocked_badge_ids": list(self.unlocked_badge_ids),
                "unlocked_rank_trophy_ids": list(self.unlocked_rank_trophy_ids),
                "unlock_sources": COSMETIC_UNLOCK_SOURCES,
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
            "battle_premium": {
                "active": self.battle_premium_active(),
                "bonus_percent": BATTLE_PREMIUM_BONUS_PERCENT,
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

    def premium_pass_active(self) -> bool:
        return bool(
            self.season_premium_pass_season_id
            and self.season_premium_pass_season_id == self.active_meta_season_id
        )

    def battle_premium_active(self) -> bool:
        return bool(
            self.battle_premium_season_id
            and self.battle_premium_season_id == self.active_meta_season_id
        )

    @property
    def available_battle_emoji_ids(self) -> tuple[str, ...]:
        """Savaşta paylaşılabilen emojiler: herkese açıklar + kazanılanlar."""
        return tuple(dict.fromkeys(
            emoji_id
            for emoji_id in (*FREE_BATTLE_EMOJI_IDS, *self.unlocked_battle_emoji_ids)
            if emoji_id and emoji_id != "none"
        ))

    def engagement_view(self) -> dict:
        season = season_descriptor()
        claimed_tiers = set(self.claimed_season_tiers)
        claimed_premium_tiers = set(self.claimed_premium_season_tiers)
        premium_active = self.premium_pass_active()
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
        try:
            login_cycle = cycle_for_id(self.login_period_id)
            login_period_bounds = {
                "starts_at": _iso_utc(login_cycle["starts_at"]),
                "ends_at": _iso_utc(login_cycle["ends_at"] - timedelta(seconds=1)),
            }
        except ValueError:
            login_period_bounds = {}

        def reward_view(reward: dict, kind: str, identity: int) -> dict:
            seed = (
                f"login:{self.login_period_id}:{self.player_id}:{identity}"
                if kind == "login"
                else f"season-premium:{self.active_meta_season_id}:{self.player_id}:{identity}"
                if kind == "premium-tiers"
                else f"season:{self.active_meta_season_id}:{self.player_id}:{identity}"
            )
            result = _profile_reward_identity(self, reward, seed)
            previous = next(
                (
                    receipt
                    for receipt in receipt_values
                    if receipt.get("kind") == kind
                    and int(receipt.get("day" if kind == "login" else "tier", -1)) == identity
                    and (
                        receipt.get("period") == self.login_period_id
                        if kind == "login"
                        else receipt.get("season_id", self.active_meta_season_id) == self.active_meta_season_id
                    )
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
                "period": self.login_period_id,
                **login_period_bounds,
                "today": self.login_period_day,
                "day_count": self.login_period_day_count,
                "claimed_days": list(self.claimed_login_period_days),
                "rewards": [
                    {
                        **reward_view(reward, "login", int(reward["day"])),
                        "claimed": reward["day"] in self.claimed_login_period_days,
                        "claimable": (
                            reward["day"] == self.login_period_day
                            and reward["day"] not in self.claimed_login_period_days
                        ),
                    }
                    for reward in LOGIN_PERIOD_REWARDS[:self.login_period_day_count]
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
            "premium_pass": {
                "active": premium_active,
                "purchasable": not premium_active,
                "product_id": PREMIUM_PASS_PRODUCT["id"],
                "price_label_tr": price_label_tr(PREMIUM_PASS_PRODUCT["price_kurus"]),
                "multiplier": PREMIUM_PASS_MULTIPLIER,
                "status_tr": (
                    "Ücretli geçiş etkin." if premium_active else PREMIUM_PASS_STATUS_TR
                ),
            },
            "claimed_premium_season_tiers": list(self.claimed_premium_season_tiers),
            "premium_reward_track": [
                {
                    **reward_view(reward, "premium-tiers", int(reward["tier"])),
                    "claimed": reward["tier"] in claimed_premium_tiers,
                    "unlocked": self.season_xp >= reward["required_xp"],
                    "claimable": (
                        premium_active
                        and self.season_xp >= reward["required_xp"]
                        and reward["tier"] not in claimed_premium_tiers
                    ),
                }
                for reward in SEASON_PREMIUM_REWARD_TRACK
            ],
        }

    def notification_keys_by_section(self) -> dict[str, tuple[str, ...]]:
        claimed_missions = set(self.claimed_daily_missions)
        claimed_tiers = set(self.claimed_season_tiers)
        claimed_login_days = set(self.claimed_login_period_days)
        daily_login_keys: list[str] = []
        if self.login_period_day not in claimed_login_days:
            daily_login_keys.append(
                f"daily-login:{self.login_period_id}:{self.login_period_day}"
            )
        daily_mission_keys = [
            f"daily-mission:{self.daily_mission_day}:{mission['id']}"
            for mission in DAILY_MISSIONS
            if mission["id"] not in claimed_missions
            and int(self.daily_mission_progress.get(mission["id"], 0))
            >= int(mission["target"])
        ]
        daily_keys = [*daily_login_keys, *daily_mission_keys]
        claimed_premium_tiers = set(self.claimed_premium_season_tiers)
        premium_active = self.premium_pass_active()
        season_keys = tuple(
            f"season-tier:{self.active_meta_season_id}:{reward['tier']}"
            for reward in SEASON_REWARD_TRACK
            if int(self.season_xp) >= int(reward["required_xp"])
            and int(reward["tier"]) not in claimed_tiers
        ) + tuple(
            f"season-premium-tier:{self.active_meta_season_id}:{reward['tier']}"
            for reward in SEASON_PREMIUM_REWARD_TRACK
            if premium_active
            and int(self.season_xp) >= int(reward["required_xp"])
            and int(reward["tier"]) not in claimed_premium_tiers
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


class PlayerProfileError(DisplayNameError):
    pass


class PlayerProfileService:
    def __init__(self, now_func=None):
        self._profiles: dict[str, PlayerProfile] = {}
        self.name_lock = RLock()
        self.persisted_display_names = lambda: ()
        self._now_func = now_func or (lambda: datetime.now(timezone.utc))
        self._settlement_clock = local()

    def now(self):
        return getattr(self._settlement_clock, "moment", None) or self._now_func()

    @contextmanager
    def settlement_time(self, moment):
        """Replay a committed result in its completion period, not reboot day.

        The gateway drains results before other profile operations/rollover.
        A thread-local override never changes unrelated request clocks.
        """
        previous = getattr(self._settlement_clock, "moment", None)
        self._settlement_clock.moment = moment
        try:
            yield
        finally:
            self._settlement_clock.moment = previous

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

        with self.name_lock:
            return self._get_or_create(player_id, display_name=display_name, day_key=day_key)

    def _default_display_name(self, player_id: str) -> str:
        if not is_automatic_player_id(player_id):
            return player_id
        return default_operator_name(player_id, (
            *self.persisted_display_names(),
            *((owner, other.display_name) for owner, other in self._profiles.items()),
        ))

    def _get_or_create(self, player_id: str, *, display_name=None, day_key=None) -> PlayerProfile:
        profile = self._profiles.get(player_id)
        if profile is not None:
            # Upgrade only the untouched auto-ID name, never a chosen name.
            # Normal persistence saves this with the other profile changes.
            if profile.display_name == player_id and is_automatic_player_id(player_id):
                profile.display_name = self._default_display_name(player_id)
            self._sync_season(profile)
            self._sync_daily_missions(profile, day_key)
            self._sync_login_period(profile)
            return profile

        profile = PlayerProfile(
            player_id=player_id,
            display_name=(
                display_name
                if display_name and display_name != player_id
                else self._default_display_name(player_id)
            ),
            active_meta_season_id=season_descriptor(self.now())["id"],
        )
        self._profiles[player_id] = profile
        self._sync_season(profile)
        self._sync_daily_missions(profile, day_key)
        self._sync_login_period(profile)
        return profile

    def _sync_season(self, profile: PlayerProfile) -> bool:
        season = season_descriptor(self.now())
        if profile.active_meta_season_id == season["id"]:
            return False
        if getattr(self._settlement_clock, "moment", None) is not None and any(
            item.get("season_id") == season["id"] for item in profile.season_archives
        ):
            raise PlayerProfileError("Tamamlanmamış savaşın dönemi önceden kapatılmış; otomatik geri sarma reddedildi.")

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
        with self.name_lock:
            profile = self.get_or_create(player_id)
            try:
                clean = normalize_display_name(display_name)
                ensure_display_name_available(
                    player_id, clean,
                    ((owner, other.display_name) for owner, other in self._profiles.items()),
                    previous_name=profile.display_name,
                )
            except DisplayNameError as exc:
                raise PlayerProfileError(str(exc), code=exc.code) from exc
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
            if clean_emoji != "none" and clean_emoji not in profile.available_battle_emoji_ids:
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
        current_day = day_key or utc_day_key(self.now())
        if profile.daily_mission_day == current_day:
            return
        profile.daily_mission_day = current_day
        profile.daily_mission_progress = {
            mission["id"]: 0
            for mission in DAILY_MISSIONS
        }
        profile.claimed_daily_missions = ()

    def _sync_login_period(self, profile: PlayerProfile) -> None:
        """Giriş takvimi sezonla aynı döngüdür: 28 gün, Pazartesi başlar."""
        now = self.now().astimezone(timezone.utc)
        cycle = competition_cycle(now)
        if profile.login_period_id != cycle["id"]:
            profile.login_period_id = cycle["id"]
            profile.claimed_login_period_days = ()
        profile.login_period_day = (now - cycle["starts_at"]).days + 1
        profile.login_period_day_count = len(LOGIN_PERIOD_REWARDS)

    def claim_login_reward(self, player_id: str, day: int, request_id: str | None = None) -> dict:
        profile = self.get_or_create(player_id)
        if request_id and request_id in profile.engagement_claim_receipts:
            return dict(profile.engagement_claim_receipts[request_id])
        self._sync_login_period(profile)
        if day != profile.login_period_day:
            raise PlayerProfileError("Yalnız bugünün giriş ödülü alınabilir.")
        if day in profile.claimed_login_period_days:
            raise PlayerProfileError("Bugünün giriş ödülü daha önce alındı.")
        reward = _profile_reward_identity(
            profile,
            LOGIN_PERIOD_REWARDS[day - 1],
            f"login:{profile.login_period_id}:{profile.player_id}:{day}",
        )
        module_id = reward["module_definition_id"]
        profile.circuit_credits += int(reward["circuit_credits"])
        profile.flux_shards += int(reward["flux_shards"])
        profile.module_shards[module_id] = (
            int(profile.module_shards.get(module_id, 0))
            + int(reward["module_shards"])
        )
        profile.claimed_login_period_days = tuple(
            sorted({*profile.claimed_login_period_days, day})
        )
        receipt = {
            **reward,
            "kind": "login",
            "period": profile.login_period_id,
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
        won: bool = False,
        modules_destroyed: int = 0,
        core_power_uses: int = 0,
        day_key: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id, day_key=day_key)
        self._sync_daily_missions(profile, day_key)
        profile.season_xp += max(0, int(season_xp_awarded))
        increments = {
            "complete_battles": 1,
            "deal_damage": max(0, int(damage_dealt)),
            "circuit_actions": max(0, int(circuit_actions)),
            "win_battles": 1 if won else 0,
            "destroy_modules": max(0, int(modules_destroyed)),
            "core_power": max(0, int(core_power_uses)),
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
        emoji_id = reward.get("emoji_id")
        if emoji_id:
            profile.unlocked_battle_emoji_ids = tuple(
                dict.fromkeys((*profile.unlocked_battle_emoji_ids, emoji_id))
            )
        title = reward.get("title_tr")
        if title:
            profile.unlocked_titles = tuple(
                dict.fromkeys((*profile.unlocked_titles, title))
            )
            profile.equipped_title = title
        return profile

    def claim_premium_season_tier(
        self,
        player_id: str,
        tier: int,
        request_id: str | None = None,
    ) -> PlayerProfile:
        """Ücretli geçiş sütunundaki kademe ödülünü (ücretsizin iki katı) verir."""
        profile = self.get_or_create(player_id)
        if request_id and request_id in profile.engagement_claim_receipts:
            return profile
        base_reward = next(
            (item for item in SEASON_PREMIUM_REWARD_TRACK if item["tier"] == tier),
            None,
        )
        if base_reward is None:
            raise PlayerProfileError("Bilinmeyen sezon kademesi.")
        if not profile.premium_pass_active():
            raise PlayerProfileError("Ücretli geçiş bu sezon için etkin değil.")
        if tier in profile.claimed_premium_season_tiers:
            raise PlayerProfileError("Bu ücretli kademe ödülü daha önce alındı.")
        if profile.season_xp < base_reward["required_xp"]:
            raise PlayerProfileError("Bu sezon kademesi henüz açılmadı.")
        reward = _profile_reward_identity(
            profile,
            base_reward,
            f"season-premium:{profile.active_meta_season_id}:{profile.player_id}:{tier}",
        )
        profile.circuit_credits += int(reward.get("circuit_credits", 0))
        profile.flux_shards += int(reward.get("flux_shards", 0))
        core_shards = int(reward.get("core_shards", 0))
        core_type_id = reward.get("core_type_id")
        if core_shards and core_type_id:
            profile.core_shards_by_type[core_type_id] = (
                int(profile.core_shards_by_type.get(core_type_id, 0)) + core_shards
            )
        module_shards = int(reward.get("module_shards", 0))
        if module_shards:
            module_id = reward["module_definition_id"]
            profile.module_shards[module_id] = int(profile.module_shards.get(module_id, 0)) + module_shards
        profile.claimed_premium_season_tiers = tuple(
            sorted({*profile.claimed_premium_season_tiers, tier})
        )
        if request_id:
            profile.engagement_claim_receipts[request_id] = {
                **reward,
                "kind": "premium-tiers",
                "tier": tier,
                "season_id": profile.active_meta_season_id,
            }
        return profile
