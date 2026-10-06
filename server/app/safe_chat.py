"""Hazır mesajlar: çocuk hedef kitle kararı (docs/CHILD_AUDIENCE_AUDIT.md).

Oyunun hedef kitlesinde 9–12 yaş vardır ve oyuncunun yaşı sorulmaz; bu yüzden
herkes çocuk güvenli kurallarla oynar. Takım sohbetinde ve özel mesajda
serbest yazı yoktur: oyuncu yalnız bu listeden seçer, sunucu yalnız kimliği
kabul eder. Takım açıklaması da hazır seçeneklerden biridir.

Metin sunucuda Türkçe tutulur; istemci aynı listeyi kendi dilinde gösterir
(client/src/social/safe-chat.js, bu dosyayla aynı kimlikler). Liste dışında
kalan eski serbest metinler silinmez ama hiçbir görünümde gösterilmez.
"""

from __future__ import annotations


class SafeChatError(ValueError):
    pass


# (kimlik, grup, metin). Sıra, istemcideki seçim ekranının sırasıdır.
_MESSAGES: tuple[tuple[str, str, str], ...] = (
    ("hello", "selam", "Selam!"),
    ("welcome", "selam", "Hoş geldin!"),
    ("good_luck", "selam", "İyi oyunlar!"),
    ("see_you", "selam", "Sonra görüşürüz!"),
    ("thanks", "selam", "Teşekkürler!"),
    ("sorry", "selam", "Kusura bakma."),
    ("yes", "cevap", "Evet."),
    ("no", "cevap", "Hayır."),
    ("okay", "cevap", "Tamam."),
    ("ready", "cevap", "Hazırım!"),
    ("wait", "cevap", "Birazdan geliyorum."),
    ("later", "cevap", "Şimdi olmaz, sonra."),
    ("battle", "savas", "Savaşalım mı?"),
    ("rematch", "savas", "Rövanş yapalım mı?"),
    ("training", "savas", "Antrenman maçı yapalım mı?"),
    ("good_game", "savas", "Güzel maçtı!"),
    ("congrats", "savas", "Tebrikler!"),
    ("i_won", "savas", "Kazandım!"),
    ("i_lost", "savas", "Bu sefer olmadı."),
    ("nice_deck", "savas", "Desten çok iyi!"),
    ("which_deck", "savas", "Hangi desteyi kullanıyorsun?"),
    ("need_shards", "takim", "Modül parçasına ihtiyacım var."),
    ("sent_shards", "takim", "Parça gönderdim."),
    ("tournament_ready", "takim", "Turnuvaya hazır mıyız?"),
    ("tournament_play", "takim", "Turnuva maçlarını oynayalım!"),
    ("join_team", "takim", "Takımıma katılmak ister misin?"),
    ("great_team", "takim", "Harika takımız!"),
    ("thumbs_up", "tepki", "👍"),
    ("fire", "tepki", "🔥"),
    ("strong", "tepki", "💪"),
    ("party", "tepki", "🎉"),
    ("laugh", "tepki", "😄"),
    ("wow", "tepki", "😮"),
)

_TEAM_DESCRIPTIONS: tuple[tuple[str, str], ...] = (
    ("open", "Herkese açığız."),
    ("active", "Aktif oyuncular arıyoruz."),
    ("daily", "Her gün oynuyoruz."),
    ("tournament", "Turnuva için oynuyoruz."),
    ("climbing", "Sıralamada yükseliyoruz."),
    ("newcomers", "Yeni oyunculara yardım ediyoruz."),
    ("friends", "Arkadaş takımıyız."),
    ("relaxed", "Keyfine oynuyoruz."),
)

PRESET_MESSAGES: dict[str, dict] = {
    preset_id: {"id": preset_id, "group": group, "text": text}
    for preset_id, group, text in _MESSAGES
}
TEAM_DESCRIPTION_PRESETS: dict[str, str] = dict(_TEAM_DESCRIPTIONS)

FREE_TEXT_CLOSED_MESSAGE = "Serbest yazı kapalı: hazır mesajlardan birini seç."
FREE_DESCRIPTION_CLOSED_MESSAGE = "Takım açıklaması hazır seçeneklerden seçilir."


def preset_message_text(preset_id: object) -> str | None:
    """Hazır mesajın metni; kimlik listede yoksa None."""
    item = PRESET_MESSAGES.get(str(preset_id or ""))
    return item["text"] if item else None


def require_preset_message(preset_id: object) -> dict:
    """Geçerli hazır mesajı döndürür; değilse SafeChatError."""
    item = PRESET_MESSAGES.get(str(preset_id or "").strip())
    if item is None:
        raise SafeChatError(FREE_TEXT_CLOSED_MESSAGE)
    return dict(item)


def team_description_text(description_id: object) -> str:
    """Hazır takım açıklamasının metni; kimlik listede yoksa boş."""
    return TEAM_DESCRIPTION_PRESETS.get(str(description_id or ""), "")


def require_team_description_id(description_id: object) -> str:
    """Boş (açıklama yok) ya da listedeki bir kimlik; değilse SafeChatError."""
    clean = str(description_id or "").strip()
    if clean and clean not in TEAM_DESCRIPTION_PRESETS:
        raise SafeChatError(FREE_DESCRIPTION_CLOSED_MESSAGE)
    return clean


def visible_message(row: dict) -> dict | None:
    """Kayıtlı mesajın gösterilebilir hâli; eski serbest metin için None.

    Metin kayıttan değil listeden alınır: kayıtlı metin değiştirilmiş olsa da
    oyuncuya yalnız hazır cümle gider.
    """
    text = preset_message_text(row.get("preset_id"))
    if text is None:
        return None
    return {**row, "text": text}
