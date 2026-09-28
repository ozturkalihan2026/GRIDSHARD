"""Daily meta catalog, canonical AI population and tournament read models.

The event hub deliberately derives its seeded AI standings from stable hashes.
This gives the beta a repeatable six-team competition without writing synthetic
accounts into the real player repository.  Human weekly rows are merged by the
HTTP gateway from server-owned counters; the team tournament (four-week cycle,
see team_tournament.py) reads its registrations and match legs from the team
store.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib

from .team_tournament import build_team_tournament_view, period_id_for


DAILY_META_DEFINITIONS: tuple[dict, ...] = (
    {"id": "damage", "meta_name_tr": "Hasar Metası", "category_tr": "Hasar", "glyph": "⚡", "accent": "#ff6c80", "description_tr": "Saldırı modülleri bugün daha yüksek baskı kurar.", "effect_tr": "Saldırı modülü hasarı +%10", "modifier": {"category": "saldırı", "stat": "damage", "multiplier": 1.10}},
    {"id": "defense", "meta_name_tr": "Savunma Metası", "category_tr": "Savunma", "glyph": "⬡", "accent": "#77b5ff", "description_tr": "Savunma modülleri bugün daha dayanıklı bir hat kurar.", "effect_tr": "Savunma CAN ve etkisi +%10", "modifier": {"category": "savunma", "stat": "defense", "multiplier": 1.10}},
    {"id": "support", "meta_name_tr": "Destek Metası", "category_tr": "Destek", "glyph": "✚", "accent": "#8aef85", "description_tr": "Onarım ve destek zincirleri bugün güçlenir.", "effect_tr": "Destek etkisi +%12", "modifier": {"category": "destek", "stat": "support", "multiplier": 1.12}},
    {"id": "sabotage", "meta_name_tr": "Sabotaj Metası", "category_tr": "Sabotaj", "glyph": "◉", "accent": "#c783ff", "description_tr": "Kesinti ve bozucu etkiler bugün daha kuvvetlidir.", "effect_tr": "Sabotaj etkisi +%10", "modifier": {"category": "sabotaj", "stat": "sabotage", "multiplier": 1.10}},
    {"id": "system", "meta_name_tr": "Sistem Metası", "category_tr": "Sistem", "glyph": "▣", "accent": "#57e8d9", "description_tr": "Sistem modülleri bugün daha verimli çalışır.", "effect_tr": "Sistem etkisi +%10", "modifier": {"category": "sistem", "stat": "system", "multiplier": 1.10}},
    {"id": "core", "meta_name_tr": "Çekirdek Metası", "category_tr": "Çekirdek", "glyph": "◇", "accent": "#ffe06d", "description_tr": "Çekirdek bugün daha yüksek dayanıklılıkla savaşa girer.", "effect_tr": "Çekirdek CAN +%10", "modifier": {"category": "çekirdek", "stat": "core_hp", "multiplier": 1.10}},
    {"id": "current_support", "meta_name_tr": "Akım Desteği Metası", "category_tr": "Akım Desteği", "glyph": "ϟ", "accent": "#67f5ee", "description_tr": "Akım üretimi ve depolama bugün daha verimlidir.", "effect_tr": "Akım modülü etkisi +%15", "modifier": {"category": "sistem", "stat": "current", "multiplier": 1.15}},
)


AI_TEAM_DEFINITIONS: tuple[dict, ...] = (
    {"team_id": "ai-team-anka", "name": "Anka Devresi", "strategy_tr": "Hızlı baskı"},
    {"team_id": "ai-team-kutup", "name": "Kutup Hattı", "strategy_tr": "Savunma ve soğutma"},
    {"team_id": "ai-team-prizma", "name": "Prizma Birliği", "strategy_tr": "Dengeli karşı-meta"},
    {"team_id": "ai-team-poyraz", "name": "Poyraz Akımı", "strategy_tr": "Akım ekonomisi"},
    {"team_id": "ai-team-miras", "name": "Miras Çekirdeği", "strategy_tr": "Sürdürülebilirlik"},
    {"team_id": "ai-team-gece", "name": "Gece Frekansı", "strategy_tr": "Kontrol ve sabotaj"},
)


_NEW_AI_FIRST_NAMES = (
    "Ayaz", "Defne", "Gökçe", "Kuzey", "Yağmur", "Poyraz",
    "Eylül", "Toprak", "Cemre", "Alara", "Alp", "İdil",
    "Buğra", "Hazal", "Kıvanç", "Naz", "Batu", "Miray",
    "Cenk", "Nil", "Ulaş", "İpek", "Yaman", "Beliz",
)
_NEW_AI_SURNAMES = ("Kaya", "Demir", "Yılmaz", "Aydın", "Koç")
_LEGACY_SUFFIX_SURNAMES = {"Nova": "", "Volt": "Yalçın", "Arc": "Aydemir"}


def _stable_int(key: str, modulo: int) -> int:
    return int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:12], 16) % modulo


def _clean_legacy_name(value: str) -> str:
    clean = str(value or "Oyuncu").strip()
    for suffix, surname in _LEGACY_SUFFIX_SURNAMES.items():
        if clean.endswith(suffix):
            first_name = clean[:-len(suffix)].strip() or "Oyuncu"
            return f"{first_name} {surname}".strip()
    return clean


def build_ai_population(base_bots: list[dict]) -> list[dict]:
    """Return 120 cleaned legacy bots plus 120 new, team-backed bots."""
    legacy: list[dict] = []
    for bot in base_bots:
        row = dict(bot)
        row["display_name"] = _clean_legacy_name(row.get("display_name", ""))
        row["is_bot"] = True
        row["core_damage"] = max(
            0,
            int(row.get("rating", 0)) * (18 + _stable_int(str(row.get("id")), 35)),
        )
        legacy.append(row)

    generated_names = [
        f"{first_name} {surname}"
        for first_name in _NEW_AI_FIRST_NAMES
        for surname in _NEW_AI_SURNAMES
    ]
    additions: list[dict] = []
    for index, display_name in enumerate(generated_names):
        source = dict(legacy[index % len(legacy)])
        arena = int(source.get("arena", (index // 10) + 1))
        slot = (index % 10) + 1
        team = AI_TEAM_DEFINITIONS[index // 20]
        minimum = (arena - 1) * 300
        maximum = minimum + 299
        rating = min(maximum, max(minimum, int(source.get("rating", minimum)) + ((slot % 3) - 1) * 9))
        source.update({
            "id": f"bot_b{arena:02d}_{slot:02d}",
            "display_name": display_name,
            "rating": rating,
            "team_id": team["team_id"],
            "team_name": team["name"],
            "is_bot": True,
            "core_damage": max(0, rating * (22 + _stable_int(display_name, 41))),
            "decision_delay_ms": max(620, int(source.get("decision_delay_ms", 1100)) - 80 + _stable_int(display_name, 180)),
            "mistake_rate": round(max(0.025, min(0.18, float(source.get("mistake_rate", .1)) + ((_stable_int(display_name, 5) - 2) * .01))), 3),
        })
        additions.append(source)
    return [*legacy, *additions]


def daily_meta_by_id(meta_id: str) -> dict | None:
    """Return a detached daily-meta definition safe for API responses."""
    match = next(
        (item for item in DAILY_META_DEFINITIONS if item["id"] == str(meta_id)),
        None,
    )
    if match is None:
        return None
    return {**match, "modifier": dict(match["modifier"])}


def daily_meta_catalog_view(moment: datetime | None = None) -> dict:
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    next_day = (current + timedelta(days=1)).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    return {
        "day": current.date().isoformat(),
        "resets_at": _iso(next_day),
        "dice_sides": len(DAILY_META_DEFINITIONS),
        "probability_per_meta": round(1 / len(DAILY_META_DEFINITIONS), 8),
        "selection_rule_tr": "Her oyuncu için günde bir kez, yedi eşit olasılıktan biri seçilir.",
        "options": [daily_meta_by_id(item["id"]) for item in DAILY_META_DEFINITIONS],
    }


def daily_meta_for_seed(player_id: str, moment: datetime | None = None) -> dict:
    """Give non-interactive AI players a stable, evenly distributed daily meta."""
    catalog = daily_meta_catalog_view(moment)
    index = _stable_int(f"{catalog['day']}:{player_id}:daily-meta", catalog["dice_sides"])
    return daily_meta_by_id(DAILY_META_DEFINITIONS[index]["id"]) or {}


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _weekly_period(moment: datetime) -> dict:
    current = moment.astimezone(timezone.utc)
    starts = (current - timedelta(days=current.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    ends = starts + timedelta(days=7) - timedelta(seconds=1)
    year, week, _ = current.isocalendar()
    return {"id": f"{year}-W{week:02d}", "starts_at": _iso(starts), "ends_at": _iso(ends)}


WEEKLY_PRIZES: tuple[dict, ...] = (
    {"position": 1, "circuit_credits": 1200, "flux_shards": 90, "chest_tier": "weekly_first", "chest_visual_id": "weekly_circuit_crown", "chest_name_tr": "Haftalık Şampiyon Kasası", "avatar_id": "weekly_champion", "avatar_frame_id": "weekly_gold", "emoji_id": "victory_pulse"},
    {"position": 2, "circuit_credits": 760, "flux_shards": 55, "chest_tier": "weekly_second", "chest_visual_id": "weekly_prism", "chest_name_tr": "Haftalık Finalist Kasası", "avatar_id": "weekly_finalist", "avatar_frame_id": "weekly_silver"},
    {"position": 3, "circuit_credits": 420, "flux_shards": 30, "chest_tier": "weekly_third", "chest_visual_id": "weekly_pulse", "chest_name_tr": "Haftalık Üçüncülük Kasası", "avatar_id": "weekly_finalist"},
)
# Takım turnuvası özel ödülleri takım profilindeki görünüm seçenekleridir
# (amblem, çerçeve, isim rengi). Takım bu seçenekleri kilitli başlar; ödül
# zaten açıksa sıradaki kilitli seçenek açılır (team_service).
TEAM_PRIZES: tuple[dict, ...] = (
    {"position": 1, "circuit_credits": 1500, "flux_shards": 110, "chest_tier": "team_first", "chest_visual_id": "team_reactor_crown", "chest_name_tr": "Takım Şampiyonu Relik Kasası", "team_emblem_id": "crown", "team_frame_id": "gold", "team_name_color_id": "gold", "emoji_id": "team_beacon"},
    {"position": 2, "circuit_credits": 950, "flux_shards": 70, "chest_tier": "team_second", "chest_visual_id": "team_prism_relay", "chest_name_tr": "Takım Finalisti Relik Kasası", "team_emblem_id": "star", "team_frame_id": "royal", "team_name_color_id": "violet"},
    {"position": 3, "circuit_credits": 620, "flux_shards": 45, "chest_tier": "team_third", "chest_visual_id": "team_signal_cache", "chest_name_tr": "Takım Üçüncüsü Relik Kasası", "team_emblem_id": "bolt", "team_name_color_id": "red"},
)

LEADERBOARD_PRIZES: tuple[dict, ...] = (
    {"position": 1, "chest_tier": "diamond", "chest_name_tr": "Taç Kasası", "chest_visual_id": "rank_crown", "circuit_credits": 2400, "flux_shards": 180, "universal_module_shards": 12, "rank_trophy_id": "season_first", "badge_id": "season_champion", "avatar_id": "season_champion", "avatar_frame_id": "season_crown", "emoji_id": "victory_pulse", "profile_background_id": "rank_crown", "cosmetics": ["1.lik Kupası", "Şampiyon Rozeti", "Avatar", "Avatar Çerçevesi", "Profil Çubuğu", "Savaş Emojisi"]},
    {"position": 2, "chest_tier": "gold", "chest_name_tr": "Prizma Kasası", "chest_visual_id": "rank_prism", "circuit_credits": 1800, "flux_shards": 130, "universal_module_shards": 9, "rank_trophy_id": "season_second", "badge_id": "season_second", "avatar_frame_id": "season_silver", "emoji_id": "respect_signal", "profile_background_id": "rank_prism", "cosmetics": ["2.lik Kupası", "İkincilik Rozeti", "Avatar Çerçevesi", "Profil Çubuğu", "Savaş Emojisi"]},
    {"position": 3, "chest_tier": "gold", "chest_name_tr": "Reaktör Kasası", "chest_visual_id": "rank_reactor", "circuit_credits": 1400, "flux_shards": 100, "universal_module_shards": 7, "rank_trophy_id": "season_third", "badge_id": "season_third", "avatar_id": "season_finalist", "cosmetics": ["3.lük Kupası", "Üçüncülük Rozeti", "Avatar"]},
    {"position": 4, "chest_tier": "silver", "chest_name_tr": "Frekans Kasası", "chest_visual_id": "rank_frequency", "circuit_credits": 1000, "flux_shards": 75, "universal_module_shards": 5, "badge_id": "season_top10", "profile_background_id": "rank_frequency", "cosmetics": ["İlk 10 Rozeti", "Frekans Profil Çubuğu"]},
    {"position": 5, "chest_tier": "silver", "chest_name_tr": "Devre Kasası", "chest_visual_id": "rank_circuit", "circuit_credits": 750, "flux_shards": 55, "universal_module_shards": 4, "badge_id": "season_top10", "emoji_id": "core_burst", "cosmetics": ["İlk 10 Rozeti", "Hareketli Çekirdek Patlaması Emojisi"]},
    {"position": 6, "chest_tier": "bronze", "chest_name_tr": "Akım Kasası", "chest_visual_id": "rank_current", "circuit_credits": 620, "flux_shards": 45, "universal_module_shards": 4, "emoji_id": "glitch_wave", "cosmetics": ["Hareketli Glitch Dalgası Emojisi"]},
    {"position": 7, "chest_tier": "bronze", "chest_name_tr": "Nöron Kasası", "chest_visual_id": "rank_neuron", "circuit_credits": 520, "flux_shards": 38, "universal_module_shards": 3, "avatar_frame_id": "frequency_cyan", "cosmetics": ["Frekans Akımı Avatar Çerçevesi"]},
    {"position": 8, "chest_tier": "bronze", "chest_name_tr": "Röle Kasası", "chest_visual_id": "rank_relay", "circuit_credits": 430, "flux_shards": 32, "universal_module_shards": 3, "profile_background_id": "rank_relay", "cosmetics": ["Röle Profil Çubuğu"]},
    {"position": 9, "chest_tier": "bronze", "chest_name_tr": "İletken Kasası", "chest_visual_id": "rank_conductor", "circuit_credits": 350, "flux_shards": 26, "universal_module_shards": 2, "emoji_id": "overload_flash", "cosmetics": ["Hareketli Aşırı Yük Emojisi"]},
    {"position": 10, "chest_tier": "bronze", "chest_name_tr": "Kıvılcım Kasası", "chest_visual_id": "rank_spark", "circuit_credits": 280, "flux_shards": 20, "universal_module_shards": 2, "avatar_id": "rank_spark", "cosmetics": ["Kıvılcım Operatörü Avatarı"]},
)

WEEKLY_ENTRY_FEE = 100


def build_events_view(
    players: list[dict],
    moment: datetime | None = None,
    *,
    team_tournament_state: dict | None = None,
) -> dict:
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    week = _weekly_period(current)

    weekly_rows = []
    for player in players:
        is_bot = bool(player.get("is_bot"))
        registered = is_bot or player.get("weekly_registered_period") == week["id"]
        if not registered:
            continue
        seed = f"{week['id']}:{player.get('player_id')}"
        matches = (
            5 + _stable_int(seed + ":matches", 8)
            if is_bot
            else (
                max(0, int(player.get("weekly_matches", 0)))
                if player.get("weekly_period") == week["id"]
                else 0
            )
        )
        wins = (
            min(matches, 2 + _stable_int(seed + ":wins", max(1, matches)))
            if is_bot
            else min(matches, max(0, int(player.get("weekly_wins", 0))))
        )
        trophies_earned = (
            70 + _stable_int(seed + ":trophies", 240)
            if is_bot
            else max(0, int(player.get("weekly_trophies_earned", 0)))
        )
        weekly_rows.append({
            "player_id": player["player_id"],
            "display_name": player["display_name"],
            "rating": int(player.get("rating", 0)),
            "matches": matches,
            "wins": wins,
            "losses": max(0, matches - wins),
            "points": trophies_earned,
            "trophies_earned": trophies_earned,
            "is_bot": is_bot,
            "registered": True,
        })
    weekly_rows.sort(key=lambda row: (-row["points"], -row["wins"], -row["rating"], row["display_name"].casefold()))
    for position, row in enumerate(weekly_rows, start=1):
        row["position"] = position

    # Takım turnuvası (team_tournament.py): kayıtlar ve oynanan maç ayakları
    # dışarıdan gelir; AI takımları her ay kendiliğinden katılır.
    ai_teams: dict[str, dict] = {}
    for player in players:
        team_id = str(player.get("team_id") or "").strip()
        if not player.get("is_bot") or not team_id:
            continue
        team = ai_teams.setdefault(
            team_id,
            {"team_name": str(player.get("team_name") or "AI Takımı"), "roster": []},
        )
        team["roster"].append({
            "player_id": player["player_id"],
            "display_name": player["display_name"],
            "rating": int(player.get("rating", 0)),
        })
    state = team_tournament_state or {}
    team_view = build_team_tournament_view(
        period_id_for(current),
        current,
        registrations=state.get("registrations") or {},
        ai_teams=ai_teams,
        legs=state.get("legs") or {},
    )
    team_view["prizes"] = [dict(item) for item in TEAM_PRIZES]

    return {
        "daily_meta_catalog": daily_meta_catalog_view(current),
        "weekly_tournament": {
            "name_tr": "Haftalık Devre Turnuvası",
            "period": week,
            "rules_tr": "100 Devre Kredisi ile katıl. Katıldıktan sonra normal Arena savaşlarında kazandığın kupalar haftalık sıralamaya eklenir; sıralama pazartesi yenilenir.",
            "entry_fee": WEEKLY_ENTRY_FEE,
            "prizes": [dict(item) for item in WEEKLY_PRIZES],
            "standings": weekly_rows,
        },
        "team_tournament": team_view,
        "ai_population": {
            "total": sum(bool(player.get("is_bot")) for player in players),
            "team_count": len(AI_TEAM_DEFINITIONS),
            "team_members": sum(bool(player.get("is_bot")) and bool(player.get("team_id")) for player in players),
        },
    }
