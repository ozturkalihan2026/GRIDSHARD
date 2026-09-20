"""Daily meta catalog, canonical AI population and tournament read models.

The event hub deliberately derives its seeded AI standings from stable hashes.
This gives the beta a repeatable six-team competition without writing synthetic
accounts into the real player repository.  Human rows are merged by the HTTP
gateway and use their server-owned weekly/monthly counters.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib


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


def _monthly_period(moment: datetime) -> dict:
    current = moment.astimezone(timezone.utc)
    starts = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if current.month == 12:
        next_month = starts.replace(year=current.year + 1, month=1)
    else:
        next_month = starts.replace(month=current.month + 1)
    return {"id": f"{current.year}-{current.month:02d}", "starts_at": _iso(starts), "ends_at": _iso(next_month - timedelta(seconds=1))}


WEEKLY_PRIZES: tuple[dict, ...] = (
    {"position": 1, "circuit_credits": 1200, "flux_shards": 90, "chest_tier": "weekly_first", "chest_visual_id": "weekly_circuit_crown", "chest_name_tr": "Haftalık Şampiyon Kasası", "avatar_id": "weekly_champion", "avatar_frame_id": "weekly_gold", "emoji_id": "victory_pulse"},
    {"position": 2, "circuit_credits": 760, "flux_shards": 55, "chest_tier": "weekly_second", "chest_visual_id": "weekly_prism", "chest_name_tr": "Haftalık Finalist Kasası", "avatar_id": "weekly_finalist", "avatar_frame_id": "weekly_silver"},
    {"position": 3, "circuit_credits": 420, "flux_shards": 30, "chest_tier": "weekly_third", "chest_visual_id": "weekly_pulse", "chest_name_tr": "Haftalık Üçüncülük Kasası", "avatar_id": "weekly_finalist"},
)
TEAM_PRIZES: tuple[dict, ...] = (
    {"position": 1, "circuit_credits": 1500, "flux_shards": 110, "chest_tier": "team_first", "chest_visual_id": "team_reactor_crown", "chest_name_tr": "Takım Şampiyonu Relik Kasası", "team_avatar_id": "team_champion", "team_frame_id": "team_gold", "team_name_frame_id": "team_name_gold", "team_bar_background_id": "team_champion_grid", "emoji_id": "team_beacon"},
    {"position": 2, "circuit_credits": 950, "flux_shards": 70, "chest_tier": "team_second", "chest_visual_id": "team_prism_relay", "chest_name_tr": "Takım Finalisti Relik Kasası", "team_avatar_id": "team_finalist", "team_frame_id": "team_silver", "team_bar_background_id": "team_finalist_grid"},
    {"position": 3, "circuit_credits": 620, "flux_shards": 45, "chest_tier": "team_third", "chest_visual_id": "team_signal_cache", "chest_name_tr": "Takım Üçüncüsü Relik Kasası", "team_avatar_id": "team_finalist"},
)

LEADERBOARD_PRIZES: tuple[dict, ...] = (
    {"position": 1, "chest_tier": "diamond", "chest_name_tr": "Taç Kasası", "chest_visual_id": "rank_crown", "circuit_credits": 2400, "flux_shards": 180, "universal_module_shards": 12, "rank_trophy_id": "season_first", "badge_id": "season_champion", "avatar_id": "season_champion", "avatar_frame_id": "season_gold", "emoji_id": "victory_pulse", "profile_background_id": "rank_crown", "cosmetics": ["1.lik Kupası", "Şampiyon Rozeti", "Avatar", "Avatar Çerçevesi", "Profil Çubuğu", "Savaş Emojisi"]},
    {"position": 2, "chest_tier": "gold", "chest_name_tr": "Prizma Kasası", "chest_visual_id": "rank_prism", "circuit_credits": 1800, "flux_shards": 130, "universal_module_shards": 9, "rank_trophy_id": "season_second", "badge_id": "season_second", "avatar_frame_id": "season_silver", "emoji_id": "respect_signal", "profile_background_id": "rank_prism", "cosmetics": ["2.lik Kupası", "İkincilik Rozeti", "Avatar Çerçevesi", "Profil Çubuğu", "Savaş Emojisi"]},
    {"position": 3, "chest_tier": "gold", "chest_name_tr": "Reaktör Kasası", "chest_visual_id": "rank_reactor", "circuit_credits": 1400, "flux_shards": 100, "universal_module_shards": 7, "rank_trophy_id": "season_third", "badge_id": "season_third", "avatar_id": "season_finalist", "cosmetics": ["3.lük Kupası", "Üçüncülük Rozeti", "Avatar"]},
    {"position": 4, "chest_tier": "silver", "chest_name_tr": "Frekans Kasası", "chest_visual_id": "rank_frequency", "circuit_credits": 1000, "flux_shards": 75, "universal_module_shards": 5, "badge_id": "season_top10", "cosmetics": ["İlk 10 Rozeti"]},
    {"position": 5, "chest_tier": "silver", "chest_name_tr": "Devre Kasası", "chest_visual_id": "rank_circuit", "circuit_credits": 750, "flux_shards": 55, "universal_module_shards": 4, "badge_id": "season_top10", "cosmetics": ["İlk 10 Rozeti"]},
    {"position": 6, "chest_tier": "bronze", "chest_name_tr": "Akım Kasası", "chest_visual_id": "rank_current", "circuit_credits": 620, "flux_shards": 45, "universal_module_shards": 4, "cosmetics": []},
    {"position": 7, "chest_tier": "bronze", "chest_name_tr": "Nöron Kasası", "chest_visual_id": "rank_neuron", "circuit_credits": 520, "flux_shards": 38, "universal_module_shards": 3, "cosmetics": []},
    {"position": 8, "chest_tier": "bronze", "chest_name_tr": "Röle Kasası", "chest_visual_id": "rank_relay", "circuit_credits": 430, "flux_shards": 32, "universal_module_shards": 3, "cosmetics": []},
    {"position": 9, "chest_tier": "bronze", "chest_name_tr": "İletken Kasası", "chest_visual_id": "rank_conductor", "circuit_credits": 350, "flux_shards": 26, "universal_module_shards": 2, "cosmetics": []},
    {"position": 10, "chest_tier": "bronze", "chest_name_tr": "Kıvılcım Kasası", "chest_visual_id": "rank_spark", "circuit_credits": 280, "flux_shards": 20, "universal_module_shards": 2, "cosmetics": []},
)

WEEKLY_ENTRY_FEE = 100


def _round_robin_pairs(team_ids: list[str], round_index: int) -> list[tuple[str, str]]:
    participants = list(dict.fromkeys(team_ids))
    if len(participants) % 2:
        participants.append("__bye__")
    if len(participants) < 2:
        return []
    rotations = max(1, len(participants) - 1)
    for _ in range(round_index % rotations):
        participants = [participants[0], participants[-1], *participants[1:-1]]
    pairs = []
    half = len(participants) // 2
    for index in range(half):
        left, right = participants[index], participants[-(index + 1)]
        if "__bye__" not in {left, right}:
            pairs.append((left, right))
    return pairs


def build_events_view(players: list[dict], moment: datetime | None = None) -> dict:
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    week = _weekly_period(current)
    month = _monthly_period(current)

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

    week_of_month = min(5, ((current.day - 1) // 7) + 1)
    grouped: dict[str, dict] = {}
    for player in players:
        team_id = str(player.get("team_id") or "").strip()
        team_name = str(player.get("team_name") or "").strip()
        if not team_id or not team_name:
            continue
        team = grouped.setdefault(
            team_id,
            {"team_id": team_id, "team_name": team_name, "members": [], "registered": False},
        )
        team["members"].append(player)
        team["registered"] = bool(
            team["registered"]
            or player.get("is_bot")
            or player.get("team_registered_period") == month["id"]
        )

    team_rows = []
    for team in grouped.values():
        if not team["registered"]:
            continue
        members = []
        for player in sorted(team["members"], key=lambda row: (-int(row.get("rating", 0)), row["display_name"].casefold())):
            seed = f"{month['id']}:{team['team_id']}:{player['player_id']}"
            matches = week_of_month * 2 if player.get("is_bot") else (
                max(0, int(player.get("team_tournament_matches", 0)))
                if player.get("team_tournament_period") == month["id"]
                else 0
            )
            wins = _stable_int(seed + ":wins", matches + 1) if player.get("is_bot") else min(matches, max(0, int(player.get("team_tournament_wins", 0))))
            wins = min(matches, wins)
            contribution_points = (
                wins
                if player.get("is_bot")
                else min(
                    matches,
                    max(0, int(player.get("team_tournament_points", wins))),
                )
            )
            members.append({
                "player_id": player["player_id"],
                "display_name": player["display_name"],
                "rating": int(player.get("rating", 0)),
                "matches": matches,
                "wins": wins,
                "contribution_points": contribution_points,
                "reward_eligible": contribution_points >= 5,
            })
        team_rows.append({
            "team_id": team["team_id"],
            "team_name": team["team_name"],
            "member_count": len(members),
            "points": sum(member["contribution_points"] for member in members),
            "qualified_member_count": sum(member["reward_eligible"] for member in members),
            "members": members,
        })
    team_rows.sort(key=lambda row: (-row["points"], -row["qualified_member_count"], row["team_name"].casefold()))
    for position, row in enumerate(team_rows, start=1):
        row["position"] = position

    team_by_id = {team["team_id"]: team for team in team_rows}
    week_starts = datetime.fromisoformat(week["starts_at"].replace("Z", "+00:00"))
    scheduled_at = week_starts + timedelta(days=5, hours=18)
    check_in_opens_at = scheduled_at - timedelta(minutes=15)
    check_in_closes_at = scheduled_at + timedelta(minutes=30)
    schedule_status = (
        "upcoming"
        if current < check_in_opens_at
        else "live"
        if current <= check_in_closes_at
        else "completed"
    )
    fixtures = []
    for home_id, away_id in _round_robin_pairs(list(team_by_id), week_of_month - 1):
        home = team_by_id[home_id]
        away = team_by_id[away_id]
        home_members = sorted(home["members"], key=lambda row: -row["rating"])
        away_members = sorted(away["members"], key=lambda row: -row["rating"])
        fixture_id = f"{month['id']}-w{week_of_month}-{home_id}-{away_id}"
        pairings = [
            {
                "home_player_id": left["player_id"],
                "home_player_name": left["display_name"],
                "away_player_id": right["player_id"],
                "away_player_name": right["display_name"],
                "rating_difference": abs(left["rating"] - right["rating"]),
                "legs": 2,
                "battle_session_id": f"team-event-{fixture_id}-{index + 1}",
            }
            for index, (left, right) in enumerate(zip(home_members, away_members))
        ]
        fixtures.append({
            "fixture_id": fixture_id,
            "home_team_id": home_id,
            "home_team_name": home["team_name"],
            "away_team_id": away_id,
            "away_team_name": away["team_name"],
            "member_pairings": pairings,
            "matches_per_player": 2,
            "scheduled_at": _iso(scheduled_at),
            "check_in_opens_at": _iso(check_in_opens_at),
            "check_in_closes_at": _iso(check_in_closes_at),
            "status": schedule_status,
        })

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
        "team_tournament": {
            "name_tr": "Aylık Takımlar Arası Turnuva",
            "period": month,
            "week": week_of_month,
            "rules_tr": "Takım lideri ücretsiz kaydeder. Sistem her cumartesi 21.00'de (Türkiye) yakın kupalı üyeleri canlı eşleştirir. Galibiyet 1 puan; ödül için en az 5 katkı puanı gerekir.",
            "registration_fee": 0,
            "scheduled_at": _iso(scheduled_at),
            "schedule_status": schedule_status,
            "minimum_reward_points": 5,
            "prizes": [dict(item) for item in TEAM_PRIZES],
            "standings": team_rows,
            "fixtures": fixtures,
        },
        "ai_population": {
            "total": sum(bool(player.get("is_bot")) for player in players),
            "team_count": len(AI_TEAM_DEFINITIONS),
            "team_members": sum(bool(player.get("is_bot")) and bool(player.get("team_id")) for player in players),
        },
    }
