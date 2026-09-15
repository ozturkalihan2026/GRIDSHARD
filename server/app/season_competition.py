"""Season identity, canonical AI population and tournament read models.

The event hub deliberately derives its seeded AI standings from stable hashes.
This gives the beta a repeatable six-team competition without writing synthetic
accounts into the real player repository.  Human rows are merged by the HTTP
gateway and use their server-owned weekly/monthly counters.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib


SEASON_META_ROTATION: tuple[dict, ...] = (
    {"meta_name_tr": "Kalkan Duvarı", "description_tr": "Savunma ve yansıtma zincirleri öne çıkar.", "featured_archetype_tr": "Savunma", "featured_modules": ("shield", "armor", "reflector")},
    {"meta_name_tr": "Aşırı Akım", "description_tr": "Akım üretimi ve enerji verimliliği sezonun merkezindedir.", "featured_archetype_tr": "Akım Ekonomisi", "featured_modules": ("battery", "capacitor", "current_balancer")},
    {"meta_name_tr": "Keskin Frekans", "description_tr": "Tek hedef baskısı ve hızlı saldırı döngüleri öne çıkar.", "featured_archetype_tr": "Hızlı Baskı", "featured_modules": ("laser", "pulse_cannon", "ion_spear")},
    {"meta_name_tr": "Onarım Ağı", "description_tr": "Onarım zamanlaması ile sürdürülebilir devreler öne çıkar.", "featured_archetype_tr": "Sürdürülebilirlik", "featured_modules": ("repair", "phoenix_repair", "barrier")},
    {"meta_name_tr": "Sessiz Devre", "description_tr": "EMP, kesinti ve karşı hamle planları öne çıkar.", "featured_archetype_tr": "Kontrol", "featured_modules": ("emp", "jammer", "disruptor")},
    {"meta_name_tr": "Hızlı Kurulum", "description_tr": "Düşük maliyetli kurulum ve tempo yönetimi öne çıkar.", "featured_archetype_tr": "Dengeli", "featured_modules": ("battery", "laser", "repair")},
    {"meta_name_tr": "Isı Dalgası", "description_tr": "Ağır hasar ile soğutma arasındaki denge öne çıkar.", "featured_archetype_tr": "Ağır Hasar", "featured_modules": ("railgun", "cooler", "overclock_unit")},
    {"meta_name_tr": "Sürü Protokolü", "description_tr": "Çoklu hedef baskısı ve üretim zincirleri öne çıkar.", "featured_archetype_tr": "Alan Hasarı", "featured_modules": ("swarm_fabricator", "pulse_cannon", "targeting_computer")},
    {"meta_name_tr": "Rezonans Kırılması", "description_tr": "Çekirdek baskısı ve karşı-meta seçimleri öne çıkar.", "featured_archetype_tr": "Karşı Meta", "featured_modules": ("disruptor", "amplifier", "ion_spear")},
    {"meta_name_tr": "Kuantum Sapması", "description_tr": "Sabotaj ve yön değiştiren savunma planları öne çıkar.", "featured_archetype_tr": "Kontrol", "featured_modules": ("virus", "reflector", "jammer")},
    {"meta_name_tr": "Çekirdek Avı", "description_tr": "Çekirdeğe giden hattı açan saldırı kombinasyonları öne çıkar.", "featured_archetype_tr": "Ağır Hasar", "featured_modules": ("railgun", "ion_spear", "targeting_computer")},
    {"meta_name_tr": "Soğuk Devre", "description_tr": "Soğutma, dayanıklılık ve uzun savaş planları öne çıkar.", "featured_archetype_tr": "Destek Zinciri", "featured_modules": ("cooler", "shield", "phoenix_repair")},
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


def season_meta_for(moment: datetime | None = None) -> dict:
    current = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    meta = dict(SEASON_META_ROTATION[current.month - 1])
    return {
        "id": f"meta_{current.year}_{current.month:02d}",
        **meta,
        "featured_modules": list(meta["featured_modules"]),
        "weekly_scoring_tr": "Galibiyet 3 puan · çekirdek yıkımı 1 ek puan",
    }


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
    {"position": 1, "circuit_credits": 1200, "flux_shards": 90, "chest_tier": "diamond"},
    {"position": 2, "circuit_credits": 800, "flux_shards": 60, "chest_tier": "gold"},
    {"position": 3, "circuit_credits": 500, "flux_shards": 40, "chest_tier": "silver"},
)
TEAM_PRIZES: tuple[dict, ...] = (
    {"position": 1, "circuit_credits": 1500, "flux_shards": 110, "chest_tier": "diamond"},
    {"position": 2, "circuit_credits": 1000, "flux_shards": 75, "chest_tier": "gold"},
    {"position": 3, "circuit_credits": 700, "flux_shards": 50, "chest_tier": "silver"},
)


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
    meta = season_meta_for(current)

    weekly_rows = []
    for player in players:
        is_bot = bool(player.get("is_bot"))
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
        core_bonus = (
            min(wins, _stable_int(seed + ":core", max(1, wins + 1)))
            if is_bot
            else wins
        )
        weekly_rows.append({
            "player_id": player["player_id"],
            "display_name": player["display_name"],
            "rating": int(player.get("rating", 0)),
            "matches": matches,
            "wins": wins,
            "losses": max(0, matches - wins),
            "points": (wins * 3) + core_bonus,
            "is_bot": is_bot,
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
        grouped.setdefault(team_id, {"team_id": team_id, "team_name": team_name, "members": []})["members"].append(player)

    team_rows = []
    for team in grouped.values():
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
            members.append({
                "player_id": player["player_id"],
                "display_name": player["display_name"],
                "rating": int(player.get("rating", 0)),
                "matches": matches,
                "wins": wins,
                "contribution_points": wins,
                "reward_eligible": wins >= 5,
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
    fixtures = []
    for home_id, away_id in _round_robin_pairs(list(team_by_id), week_of_month - 1):
        home = team_by_id[home_id]
        away = team_by_id[away_id]
        home_members = sorted(home["members"], key=lambda row: -row["rating"])
        away_members = sorted(away["members"], key=lambda row: -row["rating"])
        pairings = [
            {
                "home_player_id": left["player_id"],
                "home_player_name": left["display_name"],
                "away_player_id": right["player_id"],
                "away_player_name": right["display_name"],
                "rating_difference": abs(left["rating"] - right["rating"]),
                "legs": 2,
            }
            for left, right in zip(home_members, away_members)
        ]
        fixtures.append({
            "home_team_id": home_id,
            "home_team_name": home["team_name"],
            "away_team_id": away_id,
            "away_team_name": away["team_name"],
            "member_pairings": pairings,
            "matches_per_player": 2,
        })

    return {
        "season_meta": meta,
        "weekly_tournament": {
            "name_tr": "Haftalık Devre Turnuvası",
            "period": week,
            "rules_tr": "Galibiyet 3 puan, çekirdek yıkımı 1 ek puan. Sıralama her pazartesi yenilenir.",
            "prizes": [dict(item) for item in WEEKLY_PRIZES],
            "standings": weekly_rows,
        },
        "team_tournament": {
            "name_tr": "Aylık Takımlar Arası Turnuva",
            "period": month,
            "week": week_of_month,
            "rules_tr": "Her hafta farklı rakip takım; yakın kupa eşleşmesiyle rövanşlı 2 maç. Galibiyet 1, mağlubiyet 0 takım puanı. Ödül için en az 5 katkı puanı gerekir.",
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
