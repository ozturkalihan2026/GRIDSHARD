from dataclasses import dataclass
from datetime import datetime, timezone


# Ürün analitiği yaş sorusu. Oyun yaş sormaz; tek istisna, isteğe bağlı
# analitiği açmak isteyen oyuncudur. Doğum yılı yalnız kararı vermek için
# kullanılır ve saklanmaz: hesapta sonuç ("adult" / "minor") ve sorunun
# sorulduğu takvim yılı kalır. Yıl farkıyla hesaplandığı için eşiği geçen en
# genç oyuncu o yıl 18 yaşına giren oyuncudur.
ANALYTICS_MINIMUM_AGE = 18
ANALYTICS_AGE_ADULT = "adult"
ANALYTICS_AGE_MINOR = "minor"
ANALYTICS_AGE_REQUIRED_MESSAGE = (
    "Ürün analitiğini açmadan önce doğum yılı sorulur. Bunun için uygulamayı güncelle."
)
ANALYTICS_BIRTH_YEAR_INVALID_MESSAGE = "Doğum yılı geçersiz."
OLDEST_ACCEPTED_AGE = 120


def analytics_enabled(settings: dict | None) -> bool:
    """Saklanan ayar kaydı analitik kaydına izin veriyor mu?

    İzin tek başına yetmez: yaş sorusundan önce verilmiş eski izinler de dahil,
    yetişkin yanıtı olmayan hesaptan analitik kaydı alınmaz.
    """
    return bool(
        settings
        and settings.get("analytics_consent") is True
        and settings.get("analytics_age_gate") == ANALYTICS_AGE_ADULT
    )


GRAPHICS_QUALITIES = {
    "dusuk",
    "orta",
    "yuksek",
}

SUPPORTED_LANGUAGES = {
    "tr",
    "en",
}


@dataclass(slots=True)
class PlayerSettings:
    player_id: str
    sound_volume: int = 100
    music_volume: int = 70
    sound_muted: bool = False
    music_muted: bool = False
    vibration_enabled: bool = True
    graphics_quality: str = "yuksek"
    language: str = "tr"
    analytics_consent: bool = False
    analytics_age_gate: str = ""
    analytics_age_asked_year: int = 0

    def to_view(self) -> dict:
        return {
            "player_id": self.player_id,
            "sound_volume": self.sound_volume,
            "music_volume": self.music_volume,
            "sound_muted": self.sound_muted,
            "music_muted": self.music_muted,
            "vibration_enabled": (
                self.vibration_enabled
            ),
            "graphics_quality": (
                self.graphics_quality
            ),
            "language": self.language,
            "analytics_consent": self.analytics_consent,
            "analytics_age_gate": self.analytics_age_gate,
            "analytics_age_asked_year": self.analytics_age_asked_year,
        }


class PlayerSettingsError(ValueError):
    pass


class PlayerSettingsService:
    def __init__(self):
        self._settings: dict[
            str,
            PlayerSettings,
        ] = {}

    def get_or_create(
        self,
        player_id: str,
    ) -> PlayerSettings:
        if not player_id:
            raise PlayerSettingsError(
                "Oyuncu kimliği boş olamaz."
            )

        return self._settings.setdefault(
            player_id,
            PlayerSettings(
                player_id=player_id
            ),
        )

    def update(
        self,
        player_id: str,
        *,
        sound_volume: int | None = None,
        music_volume: int | None = None,
        sound_muted: bool | None = None,
        music_muted: bool | None = None,
        vibration_enabled: bool | None = None,
        graphics_quality: str | None = None,
        language: str | None = None,
        analytics_consent: bool | None = None,
        analytics_birth_year: int | None = None,
        current_year: int | None = None,
    ) -> PlayerSettings:
        settings = self.get_or_create(
            player_id
        )

        # Yaş kuralı hiçbir alan değişmeden önce denetlenir; sonuç en sonda yazılır.
        analytics = self._analytics_outcome(
            settings, analytics_consent, analytics_birth_year, current_year
        )

        if sound_volume is not None:
            settings.sound_volume = (
                self._validate_volume(
                    "Ses",
                    sound_volume,
                )
            )

        if music_volume is not None:
            settings.music_volume = (
                self._validate_volume(
                    "Müzik",
                    music_volume,
                )
            )

        if sound_muted is not None:
            if not isinstance(
                sound_muted,
                bool,
            ):
                raise PlayerSettingsError(
                    "Ses sessize alma tercihi boolean olmalıdır."
                )
            settings.sound_muted = sound_muted

        if music_muted is not None:
            if not isinstance(
                music_muted,
                bool,
            ):
                raise PlayerSettingsError(
                    "Müzik sessize alma tercihi boolean olmalıdır."
                )
            settings.music_muted = music_muted

        if vibration_enabled is not None:
            if not isinstance(
                vibration_enabled,
                bool,
            ):
                raise PlayerSettingsError(
                    "Titreşim tercihi boolean olmalıdır."
                )
            settings.vibration_enabled = (
                vibration_enabled
            )

        if graphics_quality is not None:
            if (
                graphics_quality
                not in GRAPHICS_QUALITIES
            ):
                raise PlayerSettingsError(
                    "Grafik kalitesi dusuk, orta veya yuksek olmalıdır."
                )
            settings.graphics_quality = (
                graphics_quality
            )

        if language is not None:
            if language not in SUPPORTED_LANGUAGES:
                raise PlayerSettingsError(
                    "Desteklenmeyen dil tercihi."
                )
            settings.language = language

        if analytics is not None:
            (
                settings.analytics_consent,
                settings.analytics_age_gate,
                settings.analytics_age_asked_year,
            ) = analytics

        return settings

    @staticmethod
    def _analytics_outcome(
        settings: PlayerSettings,
        consent: bool | None,
        birth_year: int | None,
        current_year: int | None,
    ) -> tuple[bool, str, int] | None:
        """İstenen analitik izninin sonucu: (izin, yaş sonucu, sorulduğu yıl)."""
        if consent is None:
            return None
        if not isinstance(consent, bool):
            raise PlayerSettingsError("Analitik izni doğru/yanlış olmalıdır.")
        gate, asked_year = settings.analytics_age_gate, settings.analytics_age_asked_year
        if not consent:
            return False, gate, asked_year
        if gate == ANALYTICS_AGE_ADULT:
            return True, gate, asked_year
        year = current_year if current_year is not None else datetime.now(timezone.utc).year
        if gate == ANALYTICS_AGE_MINOR and asked_year >= year:
            # Soru bu yıl yanıtlandı: yeniden sorulmaz, başka bir yıl denenemez.
            return False, gate, asked_year
        if birth_year is None:
            raise PlayerSettingsError(ANALYTICS_AGE_REQUIRED_MESSAGE)
        if (
            not isinstance(birth_year, int)
            or isinstance(birth_year, bool)
            or birth_year > year
            or birth_year < year - OLDEST_ACCEPTED_AGE
        ):
            raise PlayerSettingsError(ANALYTICS_BIRTH_YEAR_INVALID_MESSAGE)
        if year - birth_year >= ANALYTICS_MINIMUM_AGE:
            return True, ANALYTICS_AGE_ADULT, year
        return False, ANALYTICS_AGE_MINOR, year

    def _validate_volume(
        self,
        label: str,
        value: int,
    ) -> int:
        if (
            not isinstance(value, int)
            or isinstance(value, bool)
            or value < 0
            or value > 100
        ):
            raise PlayerSettingsError(
                f"{label} seviyesi 0–100 arasında tam sayı olmalıdır."
            )
        return value
