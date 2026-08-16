from dataclasses import dataclass


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
    vibration_enabled: bool = True
    graphics_quality: str = "yuksek"
    language: str = "tr"

    def to_view(self) -> dict:
        return {
            "player_id": self.player_id,
            "sound_volume": self.sound_volume,
            "music_volume": self.music_volume,
            "vibration_enabled": (
                self.vibration_enabled
            ),
            "graphics_quality": (
                self.graphics_quality
            ),
            "language": self.language,
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
        vibration_enabled: bool | None = None,
        graphics_quality: str | None = None,
        language: str | None = None,
    ) -> PlayerSettings:
        settings = self.get_or_create(
            player_id
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

        return settings

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
