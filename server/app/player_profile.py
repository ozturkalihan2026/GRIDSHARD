from dataclasses import dataclass, field
from datetime import datetime, timezone

from .game.battle_pool import default_battle_pool, validate_battle_pool


DEFAULT_RATING = 1000
XP_PER_LEVEL = 1000
CURRENT_SEASON_ID = "core_awakening_s0"
CURRENT_SEASON_NAME_TR = "Sezon Sıfır · Çekirdek Uyanışı"

DAILY_MISSIONS = (
    {
        "id": "complete_battles",
        "name_tr": "Devreyi Ateşle",
        "description_tr": "2 savaş tamamla.",
        "target": 2,
        "season_xp_reward": 80,
        "flux_shard_reward": 10,
    },
    {
        "id": "deal_damage",
        "name_tr": "Çekirdeğe Baskı",
        "description_tr": "Rakip devrelere toplam 1000 hasar ver.",
        "target": 1000,
        "season_xp_reward": 100,
        "flux_shard_reward": 15,
    },
    {
        "id": "circuit_actions",
        "name_tr": "Canlı Strateji",
        "description_tr": "Savaşta 3 modül taşı, değiştir, takas et veya döndür.",
        "target": 3,
        "season_xp_reward": 90,
        "flux_shard_reward": 15,
    },
)

SEASON_REWARD_TRACK = (
    {"tier": 1, "required_xp": 100, "flux_shards": 25, "title_tr": None},
    {"tier": 2, "required_xp": 250, "flux_shards": 30, "title_tr": "Devre Öncüsü"},
    {"tier": 3, "required_xp": 400, "flux_shards": 35, "title_tr": None},
    {"tier": 4, "required_xp": 575, "flux_shards": 40, "title_tr": None},
    {"tier": 5, "required_xp": 750, "flux_shards": 50, "title_tr": "Kırık Avcısı"},
    {"tier": 6, "required_xp": 950, "flux_shards": 55, "title_tr": None},
    {"tier": 7, "required_xp": 1150, "flux_shards": 60, "title_tr": None},
    {"tier": 8, "required_xp": 1375, "flux_shards": 70, "title_tr": "Çekirdek Muhafızı"},
    {"tier": 9, "required_xp": 1600, "flux_shards": 80, "title_tr": None},
    {"tier": 10, "required_xp": 1900, "flux_shards": 100, "title_tr": "GRIDSHARD"},
)


def utc_day_key() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@dataclass(slots=True)
class PlayerProfile:
    player_id: str
    display_name: str
    level: int = 1
    experience: int = 0
    rating: int = DEFAULT_RATING
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
    unlocked_titles: tuple[str, ...] = ("Devre Çırağı",)
    equipped_title: str = "Devre Çırağı"

    @property
    def league_name_tr(self) -> str:
        rating = self.rating
        if rating < 900:
            return "Bronz"
        if rating < 1100:
            return "Gümüş"
        if rating < 1300:
            return "Altın"
        if rating < 1500:
            return "Platin"
        return "Elmas"

    @property
    def experience_into_level(self) -> int:
        return self.experience % XP_PER_LEVEL

    @property
    def experience_to_next_level(self) -> int:
        return XP_PER_LEVEL - self.experience_into_level

    def to_view(self) -> dict:
        return {
            "player_id": self.player_id,
            "display_name": self.display_name,
            "level": self.level,
            "experience": self.experience,
            "experience_into_level": self.experience_into_level,
            "experience_to_next_level": self.experience_to_next_level,
            "rating": self.rating,
            "league_name_tr": self.league_name_tr,
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
        }

    def engagement_view(self) -> dict:
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

        return {
            "season_id": CURRENT_SEASON_ID,
            "season_name_tr": CURRENT_SEASON_NAME_TR,
            "season_xp": self.season_xp,
            "current_tier": current_tier,
            "max_tier": len(SEASON_REWARD_TRACK),
            "tier_progress": progress,
            "tier_progress_required": span,
            "flux_shards": self.flux_shards,
            "claimed_season_tiers": list(self.claimed_season_tiers),
            "equipped_title": self.equipped_title,
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
            "reward_track": [
                {
                    **reward,
                    "claimed": reward["tier"] in claimed_tiers,
                    "claimable": (
                        self.season_xp >= reward["required_xp"]
                        and reward["tier"] not in claimed_tiers
                    ),
                }
                for reward in SEASON_REWARD_TRACK
            ],
        }


class PlayerProfileError(ValueError):
    pass


class PlayerProfileService:
    def __init__(self):
        self._profiles: dict[str, PlayerProfile] = {}

    def get_or_create(
        self,
        player_id: str,
        *,
        display_name: str | None = None,
    ) -> PlayerProfile:
        if not player_id:
            raise PlayerProfileError(
                "Oyuncu kimliği boş olamaz."
            )

        profile = self._profiles.get(player_id)
        if profile is not None:
            self._sync_daily_missions(profile)
            return profile

        profile = PlayerProfile(
            player_id=player_id,
            display_name=(
                display_name
                if display_name
                else player_id
            ),
        )
        self._profiles[player_id] = profile
        self._sync_daily_missions(profile)
        return profile

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
        return profile

    def _sync_daily_missions(
        self,
        profile: PlayerProfile,
        day_key: str | None = None,
    ) -> None:
        current_day = day_key or utc_day_key()
        if profile.daily_mission_day == current_day:
            return
        profile.daily_mission_day = current_day
        profile.daily_mission_progress = {
            mission["id"]: 0
            for mission in DAILY_MISSIONS
        }
        profile.claimed_daily_missions = ()

    def record_battle_engagement(
        self,
        player_id: str,
        *,
        season_xp_awarded: int,
        damage_dealt: int,
        circuit_actions: int,
        day_key: str | None = None,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
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
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
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
        return profile

    def claim_season_tier(
        self,
        player_id: str,
        tier: int,
    ) -> PlayerProfile:
        profile = self.get_or_create(player_id)
        reward = next(
            (item for item in SEASON_REWARD_TRACK if item["tier"] == tier),
            None,
        )
        if reward is None:
            raise PlayerProfileError("Bilinmeyen sezon kademesi.")
        if tier in profile.claimed_season_tiers:
            raise PlayerProfileError("Bu kademe ödülü daha önce alındı.")
        if profile.season_xp < reward["required_xp"]:
            raise PlayerProfileError("Bu sezon kademesi henüz açılmadı.")
        profile.flux_shards += int(reward["flux_shards"])
        profile.claimed_season_tiers = tuple(
            sorted({*profile.claimed_season_tiers, tier})
        )
        title = reward.get("title_tr")
        if title:
            profile.unlocked_titles = tuple(
                dict.fromkeys((*profile.unlocked_titles, title))
            )
            profile.equipped_title = title
        return profile
