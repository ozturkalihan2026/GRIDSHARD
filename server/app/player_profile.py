from dataclasses import dataclass, field

from .game.battle_pool import default_battle_pool, validate_battle_pool


DEFAULT_RATING = 1000
XP_PER_LEVEL = 1000


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
                "Savaş Havuzu",
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
