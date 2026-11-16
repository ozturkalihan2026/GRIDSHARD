"""Deterministic, read-only 2.5.0 free-economy projections; never grants rewards.

Chest currencies are expected values, not a seeded playthrough or a guaranteed
wallet. Existing mission completion and gift collection are explicit assumptions.
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app import arena_canon as canon, meta_progression as meta, player_profile as profile
from app import player_progression as progression
from app.game.talents import TALENT_COSTS, CORE_TALENT_COSTS

POLICY = ROOT / 'docs/planning/free-economy-250-v1.json'
REPORT = ROOT / 'docs/planning/free-economy-250-report.json'
DOCUMENT = ROOT / 'docs/planning/free-economy-250-report.md'
ENGAGEMENT = ROOT / 'docs/planning/season-1-engagement-v1.json'
CURRENCIES = ('circuit_credits', 'flux_shards')
SOURCES = ('server/app/arena_canon.py', 'server/app/meta_progression.py',
           'server/app/player_profile.py', 'server/app/player_progression.py',
           'server/app/game/talents.py', 'docs/planning/season-1-engagement-v1.json',
           'docs/planning/free-economy-250-v1.json', 'tools/simulate_liveops_economy.py',
           'server/app/free_economy_rewards.py', 'server/data/free_economy_rewards_v1.json')


def load_policy():
    policy = json.loads(POLICY.read_text(encoding='utf-8'))
    if (policy.get('planning_only') is not True or policy.get('runtime_changed') is not False
            or policy.get('release') != '2.5.0' or policy.get('preserve_existing_xp') is not True
            or policy.get('preserve_published_s1') is not True):
        raise ValueError('Free-economy policy must remain a read-only proposal')
    engagement = json.loads(ENGAGEMENT.read_text(encoding='utf-8'))
    if (policy.get('strategy') != 'rebalance_existing_five_channels'
            or policy.get('separate_daily_weekly_support') is not False
            or set(policy['daily_orders']) != {m['id'] for m in profile.DAILY_MISSIONS}
            or set(policy['daily_extra_orders']) != {m['id'] for m in engagement['daily_extra']}
            or set(policy['seasonal_orders']) != {m['id'] for m in engagement['seasonal']}):
        raise ValueError('Currency proposal must cover the existing mission identities')
    for row in [*policy['daily_orders'].values(), *policy['daily_extra_orders'].values(),
                *policy['seasonal_orders'].values()]:
        if any(type(row[k]) is not int or row[k] < 0 for k in CURRENCIES):
            raise ValueError('Invalid currency proposal')
    for multipliers in (policy['login_multiplier'], policy['free_season_road_multiplier']):
        if any(type(multipliers[k]) is not int or multipliers[k] < 1 for k in CURRENCIES):
            raise ValueError('Invalid reward multiplier')
    match = policy['match_rewards']
    if (type(match['credit_multiplier_numerator']) is not int or match['credit_multiplier_numerator'] < 1
            or type(match['credit_multiplier_denominator']) is not int or match['credit_multiplier_denominator'] < 1
            or type(match['daily_flux_battle_cap']) is not int or match['daily_flux_battle_cap'] < 0
            or type(match['flux_per_completed_battle']) is not int or match['flux_per_completed_battle'] < 0
            or match['increase_xp'] is not False or match['increase_chest_or_trophy_rewards'] is not False):
        raise ValueError('Invalid match currency revision')
    return policy


def currencies(credits=0, flux=0):
    return dict(zip(CURRENCIES, (credits, flux)))


def chest_value(identity):
    row = meta.CHEST_DEFINITIONS[identity]
    return currencies(sum(row['coins']) / 2, sum(row['flux']) / 2)


def module_cost(rarity, level):
    rows = [meta.rarity_upgrade_cost(rarity, i) for i in range(level - 1)]
    return {key: sum(row[key] for row in rows) for key in (*CURRENCIES, 'shards')}


def cost_probes():
    probes = {
        'common_level_1_to_5': module_cost('common', 5),
        'six_common_level_1_to_8': {k: v * 6 for k, v in module_cost('common', 8).items()},
        'legendary_level_14_to_15': meta.rarity_upgrade_cost('legendary', 13),
        'legendary_first_talent': currencies(*TALENT_COSTS['legendary'][0]),
        'legendary_all_talents': currencies(*map(sum, zip(*TALENT_COSTS['legendary']))),
        'legendary_core_all_talents': currencies(*map(sum, zip(*CORE_TALENT_COSTS['legendary']))),
        'single_talent_reset': currencies(0, meta.MODULE_TALENT_RESET_COST_PER_SELECTION),
    }
    for identity in ('core_24h', 'diamond_24h'):
        key, amount = meta.STORE_CHEST_PRICES[identity]
        probes[identity] = {**currencies(), key: amount}
    return probes


def simulate(case, *, days=28, proposed=False, policy=None):
    policy = policy or load_policy()
    if not 1 <= days <= 28:
        raise ValueError('Use a 1–28 day planning horizon')
    battles, wins = case['battles'], case['wins']
    if any(type(v) is not int or v < 0 for v in (battles, wins, case['gifts'], case['core_uses'])) or wins > battles:
        raise ValueError('Invalid battle/collection assumptions')
    mode = case.get('mode', 'ranked_pvp')
    if mode not in ('ranked_pvp', 'arena_ai', 'unranked_ai'):
        raise ValueError('Neutral matches must not imply economic rewards')
    weekdays = case.get('login_weekdays', list(range(7)))
    if len(set(weekdays)) != len(weekdays) or any(type(d) is not int or not 0 <= d < 7 for d in weekdays):
        raise ValueError('Invalid login weekdays')
    missions = {m['id']: m for m in profile.DAILY_MISSIONS}
    ids = case['missions']
    if ids == 'all': ids = list(missions)
    if ids == 'without_win': ids = [k for k in missions if k != 'win_battles']
    if (not isinstance(ids, list) or len(ids) != len(set(ids)) or set(ids) - missions.keys()
            or ('win_battles' in ids and not wins) or (ids and not battles)):
        raise ValueError('Impossible or duplicate mission assumptions')
    if 'complete_battles' in ids and battles < missions['complete_battles']['target']:
        raise ValueError('Daily completed-battle mission target not met')
    if 'core_power' in ids and case['core_uses'] < missions['core_power']['target']:
        raise ValueError('Daily core-use mission target not met')
    rating = case.get('rating', canon.ARENA_MINIMUM_RATING_BY_INDEX[case.get('rating_arena', 1)])
    rank = canon.rank_stage_for_rating(rating)
    engagement = json.loads(ENGAGEMENT.read_text(encoding='utf-8'))
    season_active = case.get('season_active', True)
    qualified = mode in policy['eligible_modes'] and not case.get('forfeit', False)
    win_credit = progression.match_circuit_credit_reward(rank, won=True, draw=False, match_type=mode)
    loss_credit = progression.match_circuit_credit_reward(rank, won=False, draw=False, match_type=mode)
    win_xp, loss_xp = progression.WIN_XP, progression.LOSS_XP
    if mode == 'unranked_ai':
        win_xp, loss_xp = [max(1, round(x * progression.AI_REWARD_RATIO)) for x in (win_xp, loss_xp)]
    victory_chest = currencies()
    previous = 0
    for upper, identity in meta.BATTLE_CHEST_DROP_THRESHOLDS:
        value = chest_value(identity)
        for key in CURRENCIES: victory_chest[key] += (upper - previous) * value[key]
        previous = upper
    sources = {name: currencies() for name in ('matches', 'daily_orders', 'login', 'season_road',
                'victory_chests_expected', 'gift_chests_expected', 'seasonal_orders')}
    bonuses = {name: currencies() for name in ('matches', 'daily_orders', 'login', 'season_road', 'seasonal_orders')}
    counters = dict(completed_battles=0, wins=0, active_days=0, core_uses=0)
    earned_seasonal_orders = set()
    xp = daily_xp = seasonal_xp = claimed_tiers = active_days = 0
    trajectory = []
    start = date.fromisoformat(policy['simulation_starts_on'])
    for offset in range(days):
        today = start + timedelta(days=offset)
        logged_in = today.weekday() in weekdays
        old_seasonal_xp = seasonal_xp
        if logged_in:
            if battles: active_days += 1
            sources['matches']['circuit_credits'] += wins * win_credit + (battles - wins) * loss_credit
            sources['daily_orders']['flux_shards'] += sum(missions[i]['flux_shard_reward'] for i in ids)
            if proposed:
                for identity in ids:
                    reward = policy['daily_orders'][identity]
                    delta = currencies(reward['circuit_credits'], reward['flux_shards'] - missions[identity]['flux_shard_reward'])
                    for key in CURRENCIES:
                        sources['daily_orders'][key] += delta[key]
                        bonuses['daily_orders'][key] += delta[key]
                if qualified:
                    match = policy['match_rewards']
                    multiplier = match['credit_multiplier_numerator'] / match['credit_multiplier_denominator']
                    extra_credit = (wins * (round(win_credit * multiplier) - win_credit)
                        + (battles - wins) * (round(loss_credit * multiplier) - loss_credit))
                    extra_flux = min(battles, match['daily_flux_battle_cap']) * match['flux_per_completed_battle']
                    for key, amount in currencies(extra_credit, extra_flux).items():
                        sources['matches'][key] += amount
                        bonuses['matches'][key] += amount
            for key in CURRENCIES:
                sources['gift_chests_expected'][key] += case['gifts'] * chest_value(meta.GIFT_CHEST_ID)[key]
                if mode in ('ranked_pvp', 'arena_ai'):
                    sources['victory_chests_expected'][key] += wins * victory_chest[key]
            if season_active:
                for key in CURRENCIES:
                    base = profile.LOGIN_PERIOD_REWARDS[offset][key]
                    extra = base * (policy['login_multiplier'][key] - 1) if proposed else 0
                    sources['login'][key] += base + extra
                    bonuses['login'][key] += extra
                daily_xp += wins * win_xp + (battles - wins) * loss_xp
                daily_xp += sum(missions[i]['season_xp_reward'] for i in ids)
                if mode in engagement['eligible_modes']:
                    counters['completed_battles'] += battles
                    counters['wins'] += wins
                    counters['active_days'] += int(battles > 0)
                    counters['core_uses'] += case['core_uses']
                    daily_xp += sum(m['xp'] for m in engagement['daily_extra'] if battles >= m['target'])
                    seasonal_xp = sum(m['xp'] for m in engagement['seasonal'] if counters[m['metric']] >= m['target'])
                    if proposed and qualified:
                        for mission in engagement['daily_extra']:
                            if battles >= mission['target']:
                                for key in CURRENCIES:
                                    amount = policy['daily_extra_orders'][mission['id']][key]
                                    sources['daily_orders'][key] += amount
                                    bonuses['daily_orders'][key] += amount
                        for mission in engagement['seasonal']:
                            if mission['id'] not in earned_seasonal_orders and counters[mission['metric']] >= mission['target']:
                                earned_seasonal_orders.add(mission['id'])
                                for key in CURRENCIES:
                                    amount = policy['seasonal_orders'][mission['id']][key]
                                    sources['seasonal_orders'][key] += amount
                                    bonuses['seasonal_orders'][key] += amount
                xp = daily_xp + seasonal_xp
                available = [r for r in profile.SEASON_REWARD_TRACK if r['required_xp'] <= xp]
                for row in available[claimed_tiers:]:
                    for key in CURRENCIES:
                        extra = row[key] * (policy['free_season_road_multiplier'][key] - 1) if proposed else 0
                        sources['season_road'][key] += row[key] + extra
                        bonuses['season_road'][key] += extra
                claimed_tiers = len(available)
        total = {key: round(sum(row[key] for row in sources.values()), 2) for key in CURRENCIES}
        trajectory.append(dict(day=offset + 1, date=today.isoformat(), logged_in=logged_in,
            season_xp=xp, new_seasonal_xp=seasonal_xp - old_seasonal_xp, tier=claimed_tiers, **total))
    total = {key: round(sum(row[key] for row in sources.values()), 2) for key in CURRENCIES}
    extra = {key: sum(row[key] for row in bonuses.values()) for key in CURRENCIES}
    return dict(id=case['id'], name_tr=case['name_tr'], days=days, active_battle_days=active_days,
        season_active=season_active, reached_tier=claimed_tiers, season_xp=xp,
        proposed=proposed, sources=sources, total_expected=total, extra_from_rebalance=extra,
        bonus_by_source=bonuses, seasonal_currency_claims=len(earned_seasonal_orders), trajectory=trajectory,
        currency_coverage={name: {**cost,
            'currency_only_affordable': all(total[key] >= cost[key] for key in CURRENCIES),
            'remaining_after_currency_spend': {key: round(total[key] - cost[key], 2) for key in CURRENCIES}}
            for name, cost in cost_probes().items()})


def build_report():
    policy = load_policy()
    rows = []
    for case in policy['scenarios']:
        for days in (1, 7, 28):
            def summary(value):
                # Retain review checkpoints rather than duplicating three full
                # daily trajectories and the same cost table in every scenario.
                output = {k: v for k, v in value.items() if k not in ('trajectory', 'currency_coverage')}
                output['checkpoints'] = [r for r in value['trajectory'] if r['day'] in (1, 7, 14, 21, 28)]
                if days == 28:
                    output['spend_alternatives'] = {name: {k: cost[k] for k in
                        ('currency_only_affordable', 'remaining_after_currency_spend')}
                        for name, cost in value['currency_coverage'].items()}
                return output
            rows.append(dict(id=case['id'], days=days,
                current=summary(simulate(case, days=days, policy=policy)),
                candidate=summary(simulate(case, days=days, proposed=True, policy=policy))))
    return dict(schema_version=1, release='2.5.0', planning_only=True, runtime_changed=False,
        policy_status=policy['status'], no_ads=True, no_purchases=True, no_new_premium=True,
        currency_values_are_expectations=True, cost_probes=cost_probes(),
        assumptions=['Fixed rating, explicit wins and mission completions; not player telemetry.',
            'Logged-in days claim all specified gifts/orders and earned free tiers.',
            'Synthetic 28-day active season uses current free-track amounts and extra mission XP.',
            'Synthetic dates are not a season opening or deployment decision.',
            'No starting wallet, road/title one-off awards, competition wins, donations or premium rights.',
            'Shard/arena/level eligibility is not inferred from currency affordability.',
            'Cost probes are independent alternatives; they do not spend the same wallet together.',
            'Candidate uses existing five channels, with no additional daily/weekly support campaign.',
            'Match currency boosts exclude forfeits/neutral matches; existing basic-order eligibility is retained.',
            'Season-dependent login/order/road revisions are a new-season candidate; published S1 is unchanged.',
            'All new amounts are a tuning candidate, not an implemented or approved runtime grant.'],
        source_hashes={name: hashlib.sha256((ROOT/name).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for name in SOURCES},
        scenarios=rows)


def render(report):
    lines = ['# 2.5.0 — ücretsiz ekonomi ilk karşılaştırması', '',
        '> Planlama adayı; canlı ödüller ve oyuncu bakiyeleri değişmedi. Sandık paraları beklenen değerdir, garanti bakiye değildir.', '',
        '[Tasarım ve üretim planı](release-250-design-and-production.md) · [Aday miktarlar](free-economy-250-v1.json) · [Makine raporu](free-economy-250-report.json) · [Deste/parça/çekirdek ve birlikte harcama](free-economy-250-progression-report.md)', '',
        'Hesap mevcut altı emri, +4/+6 savaş XP emirlerini ve sezonluk XP hedeflerini birlikte okur. '
        'Reklam, yeni premium veya gerçek para geliri yok. Beş mevcut kaynağın para miktarı artar; XP ve 12.240 XP eşiği korunur. '
        'Her satırın emir/hediye/zafer varsayımı JSON’da açıktır; maç sayısı tek başına bütün emirleri garanti etmez.', '',
        '## 28 günlük Akı / Devre Kredisi karşılaştırması', '',
        '| Senaryo | Mevcut Akı | Aday Akı | Mevcut kredi | Aday kredi | Ek miktarın Akı / kredisi | Kademe (iki modelde aynı) |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for row in report['scenarios']:
        if row['days'] != 28: continue
        a,b = row['current'], row['candidate']
        lines.append(f"| {a['name_tr']} | {a['total_expected']['flux_shards']:.2f} | {b['total_expected']['flux_shards']:.2f} | {a['total_expected']['circuit_credits']:.2f} | {b['total_expected']['circuit_credits']:.2f} | {b['extra_from_rebalance']['flux_shards']} / {b['extra_from_rebalance']['circuit_credits']} | {a['reached_tier']} |")
    lines += ['', 'Sezon arası satırında mevcut günlük emir Akısı sürer; sezon girişi/yolu ve sezon XP’si yoktur. '
        'Sezon arasında adayın yalnız günlük temel emir ve uygun maç artışları çalışır; kapalı sezonun giriş/yol/sezonluk emir ödülü verilmez. '
        'Haftada dört gün satırında kaçırılan giriş günü ödülleri sonradan eklenmez. Yalnız giriş kendi artırılmış ödülünü alır, '
        'görev veya savaş geliri kazanmaz. Ayrı günlük/haftalık destek bu adayla birikmez.', '',
        '## Kaynak koddan okunan harcama yükü', '',
        '| Bağımsız harcama örneği | Devre Kredisi | Akı |', '| --- | ---: | ---: |']
    labels = dict(common_level_1_to_5='Sıradan modül 1→5', six_common_level_1_to_8='Altı sıradan modül 1→8',
        legendary_level_14_to_15='Efsanevi modül 14→15', legendary_first_talent='Efsanevi ilk yetenek',
        legendary_all_talents='Efsanevi modülün dört yeteneği', legendary_core_all_talents='Efsanevi çekirdeğin üç yeteneği',
        single_talent_reset='Tek yetenek seçimini sıfırlama', core_24h='Altın sandık', diamond_24h='Elmas sandık')
    for identity,cost in report['cost_probes'].items():
        lines.append(f"| {labels[identity]} | {cost['circuit_credits']} | {cost['flux_shards']} |")
    lines += ['', 'Parçalar, arena ve gereken modül seviyesi ayrıca sağlanmalıdır. Bir yükseltme, yetenek '
        've sandık aynı bakiyeyi tüketir; örnekler birbirinden bağımsız alternatiflerdir. Günlük gelir '
        'artışı yüksek seviye maliyetini ortadan kaldırmaz. Tam deste, gerçek parça dağılımı ve '
        'çekirdek harcaması bağlı birlikte-harcama raporunda aynı cüzdanla hesaplanır.', '',
        '## Sınırlar ve tekrar üretim', '',
        '- 1/7/28 gün kaynak dökümü, ara kontrol noktaları, ayrı harcama sonrası kalan bakiye ve hash’ler JSON içindedir.',
        '- Mevcut S1 yayımlanmış katalogları, eski haklar ve kaynak maliyet tabloları değişmedi.',
        '- Bu rapor para beklentisidir; bağlı ilerleme raporu gerçek sandık çözümleyicisiyle parça ve ortak cüzdan hesabını tamamlar. Gerçek oyuncu davranışı veya son savaş dengesi kabulü değildir.',
        '- `python tools/simulate_liveops_economy.py --write` raporları üretir; `--check` kaynak kaymasını yakalar.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build_report()
    outputs = {REPORT: json.dumps(report, ensure_ascii=False, indent=2) + '\n', DOCUMENT: render(report)}
    for path, expected in outputs.items():
        if args.write: path.write_text(expected, encoding='utf-8')
        elif not path.exists() or path.read_text(encoding='utf-8') != expected:
            raise ValueError('Free-economy report differs; run tools/simulate_liveops_economy.py --write')
    print(json.dumps(dict(scenarios=len(report['scenarios']), no_ads=True, no_purchases=True, runtime_changed=False)))


if __name__ == '__main__': main()
