"""Beta.72: ücretli geçiş sütunu ve mesaj kutusu okundu izleri.

Oyuncu kaydının ``profile.meta_progression_state`` bölümüne dört alan eklenir:
ücretli geçişin etkin olduğu sezon, alınan ücretli kademeler, görülen mesaj
kutusu duyuruları ve doğrudan mesajların son görülme zamanı. Yükleyici eksik
alanları zaten varsayılanla okur; göç kayıtları güncel biçime yazar.
"""

from copy import deepcopy

NEW_FIELDS = {
    "season_premium_pass_season_id": "",
    "claimed_premium_season_tiers": [],
    "seen_inbox_notice_ids": [],
    "direct_messages_seen_at": 0,
}


def _meta_states(payload):
    if not isinstance(payload, dict):
        return
    for record in payload.values():
        if not isinstance(record, dict):
            continue
        profile = record.get("profile")
        if not isinstance(profile, dict):
            continue
        meta = profile.get("meta_progression_state")
        if meta is None:
            meta = profile["meta_progression_state"] = {}
        if isinstance(meta, dict):
            yield meta


def up(payload):
    for meta in _meta_states(payload):
        for key, default in NEW_FIELDS.items():
            meta.setdefault(key, deepcopy(default))
    return payload


def down(payload):
    for meta in _meta_states(payload):
        for key in NEW_FIELDS:
            meta.pop(key, None)
    return payload
