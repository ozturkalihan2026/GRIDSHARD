"""Local, deterministic integer-wallet probes for the 2.5.0 economy decision.

Uses the real chest resolver and profile fragment targeting on synthetic objects.
Writes reports only. No player repository, network, runtime catalog or SQL writes.
Small fixed samples are reproducible examples, never statistical guarantees.
"""
from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools import simulate_liveops_economy as income
from app.reward_delivery import apply_fixed_contents
from app.reward_definitions import freeze_chest
from app.game.talents import TALENT_LEVELS
from app.module_roster import MODULE_SPECS, COMBAT_CLASSES

SOURCE = ROOT / 'docs/planning/free-economy-250-progression-v1.json'
REPORT = ROOT / 'docs/planning/free-economy-250-progression-report.json'
DOCUMENT = ROOT / 'docs/planning/free-economy-250-progression-report.md'


def load_policy():
    p = json.loads(SOURCE.read_text(encoding='utf-8'))
    if (p['schema_version'] != 1 or p['release'] != '2.5.0' or p['planning_only'] is not True
            or p['runtime_changed'] is not False or type(p['sample_count']) is not int
            or not 1 <= p['sample_count'] <= 32 or len(p['deck']) != 6 or len(set(p['deck'])) != 6
            or set(p['deck']) - income.canon.MODULES.keys()):
        raise ValueError('Invalid planning policy/deck')
    offer = p['guaranteed_offer_candidate']
    if (offer['currency'] != 'circuit_credits' or type(offer['price']) is not int or offer['price'] <= 0
            or type(offer['purchases_per_utc_week']) is not int or offer['purchases_per_utc_week'] < 1
            or any(type(offer['pieces_by_rarity'].get(r)) is not int or offer['pieces_by_rarity'][r] < 1
                   for r in income.meta.MODULE_UPGRADE_SHARD_CURVES)):
        raise ValueError('Invalid guaranteed-offer candidate')
    if (any(type(p[k]) is not int or not 1 <= p[k] <= 15 for k in ('deck_target_level', 'core_target_level'))
            or p['initial_wallet'] != income.currencies()
            or p['core_type_id'] not in {c['id'] for c in income.meta.CORE_TYPES}):
        raise ValueError('Invalid progression goal')
    choice = p['choice_crate_candidate']
    if (type(choice['completed_qualified_battles_per_utc_week']) is not int
            or choice['completed_qualified_battles_per_utc_week'] < 1
            or choice['rights_per_utc_week'] != 1 or choice['options'] != list(COMBAT_CLASSES)
            or any(type(choice['pieces_by_rarity'].get(r)) is not int or choice['pieces_by_rarity'][r] < 1
                   for r in income.meta.MODULE_UPGRADE_SHARD_CURVES)
            or offer['target_strategy'] != 'server_hash_player_week_from_eligible_pool_frozen_before_purchase'
            or offer['source'] != 'eligible_owned_arena_pool_only'
            or choice['target_selection'] != 'server_hash_of_player_week_and_class_from_eligible_pool_frozen_at_earn'
            or p['spend_priority'] != ['deck_upgrades_round_robin', 'core_upgrades', 'first_deck_talents', 'first_core_talent']
            or len(p['mixed_deck']) != 6 or len(set(p['mixed_deck'])) != 6
            or set(p['mixed_deck']) - set(income.canon.unlocked_reward_module_ids(600))):
        raise ValueError('Unsupported acquisition/spend assumptions')
    return p


def scenarios():
    cases = deepcopy(income.load_policy()['scenarios'])
    mixed = deepcopy(next(c for c in cases if c['id'] == 'regular_4'))
    mixed.update(id='arena3_mixed_4', name_tr='Arena 3 / nadir içeren deste / 4 savaş', rating=600, mixed_deck=True)
    return cases + [mixed]


def _new_profile(case, seed, policy):
    rating = case.get('rating', income.canon.ARENA_MINIMUM_RATING_BY_INDEX[case.get('rating_arena', 1)])
    p = income.profile.PlayerProfile(player_id=f'budget-{seed}', display_name='Synthetic budget',
        rating=rating, highest_rating=rating)
    p.circuit_credits = p.flux_shards = p.universal_module_shards = p.core_shards = 0
    p.module_shards = deepcopy(income.profile.STARTER_MODULE_SHARDS) if policy['include_starter_laser_pieces'] else {}
    p.core_shards_by_type = {}
    p.module_upgrade_levels = {}; p.core_upgrade_levels = {}
    p.module_talents = {}; p.core_skills = {}
    return p


def _open(p, engine, definition, identity):
    chest = dict(chest_id='budget-' + hashlib.sha256(identity.encode()).hexdigest(),
        definition_id=definition, name_tr='Synthetic budget chest', source='budget')
    freeze_chest(chest)
    p.chest_slots.append(chest)
    return engine.open_chest(p, chest['chest_id'], identity)['rewards']


def _pieces(p, reward, identity):
    resolved = income.profile._profile_reward_identity(p, reward, identity)
    # Currencies have already been accounted for by the five-channel model.
    contents = {k: resolved[k] for k in ('module_definition_id', 'module_shards', 'core_type_id', 'core_shards') if k in resolved}
    apply_fixed_contents(p, contents)
    return contents


def _spend(p, policy, totals):
    def pay(cost, owned):
        if any(getattr(p, k) < cost[k] for k in income.CURRENCIES) or owned < cost.get('shards', 0):
            return False
        for k in income.CURRENCIES:
            setattr(p, k, getattr(p, k) - cost[k]); totals[k] += cost[k]
        return True

    eligible = set(income.canon.unlocked_reward_module_ids(p.rating, p.highest_rating))
    while True:
        changed = False
        for key in policy['deck']:
            if key not in eligible: continue
            level = p.module_upgrade_levels.get(key, 0) + 1
            if level >= policy['deck_target_level']: continue
            cost = income.meta.rarity_upgrade_cost(income.meta.MODULE_RARITY[key], level - 1)
            if pay(cost, p.module_shards.get(key, 0)):
                p.module_shards[key] -= cost['shards']; totals['module_pieces'][key] += cost['shards']
                p.module_upgrade_levels[key] = level; changed = True
        if not changed: break
    core = next(c for c in income.meta.CORE_TYPES if c['id'] == policy['core_type_id'])
    core_id = core['id']
    if p.rating >= income.meta.core_unlock_rating(core):
        while p.core_upgrade_levels.get(core_id, 0) + 1 < policy['core_target_level']:
            level = p.core_upgrade_levels.get(core_id, 0) + 1
            cost = income.meta.rarity_upgrade_cost(core['rarity'], level - 1)
            if not pay(cost, p.core_shards_by_type.get(core_id, 0)): break
            p.core_shards_by_type[core_id] -= cost['shards']; totals['core_pieces'][core_id] += cost['shards']
            p.core_upgrade_levels[core_id] = level
    if not policy['buy_first_talents']: return
    for key in policy['deck']:
        rarity = income.meta.MODULE_RARITY[key]
        if (key not in eligible or p.module_talents.get(key)
                or p.module_upgrade_levels.get(key, 0) + 1 < TALENT_LEVELS[rarity][0]): continue
        cost = income.currencies(*income.TALENT_COSTS[rarity][0])
        if pay(cost, 0): p.module_talents[key] = {'0': 'power'}
    if not p.core_skills.get(core_id) and p.core_upgrade_levels.get(core_id, 0) + 1 >= core['skills'][0]['level']:
        cost = income.currencies(core['skills'][0]['circuit_credits_cost'], core['skills'][0]['flux_cost'])
        if pay(cost, 0): p.core_skills[core_id] = (core['skills'][0]['id'],)


def simulate(case, *, proposed, buy_offer=False, claim_choice=False, seed=0, policy=None):
    policy = deepcopy(policy or load_policy())
    if case.get('mixed_deck'): policy['deck'] = policy['mixed_deck']
    projection = income.simulate(case, proposed=proposed)
    p = _new_profile(case, seed, policy)
    starting_pieces = deepcopy(p.module_shards)
    engine = income.meta.MetaProgressionService(now_func=lambda: datetime(2030, 1, 1, tzinfo=timezone.utc))
    earned = income.currencies(); spent = dict(**income.currencies(), module_pieces=Counter(), core_pieces=Counter())
    earned_modules = Counter(); earned_cores = Counter(); weekly = Counter(); weekly_battles = Counter()
    purchases = []; choices = []; checkpoints = []; previous = income.currencies(); previous_tier = 0
    eligible = set(income.canon.unlocked_reward_module_ids(p.rating, p.highest_rating))
    pool = tuple(income.canon.unlocked_reward_module_ids(p.rating, p.highest_rating))
    core_id = policy['core_type_id']

    def record_pieces(reward):
        if reward.get('module_shards'): earned_modules[reward['module_definition_id']] += reward['module_shards']
        if reward.get('core_shards'): earned_cores[reward['core_type_id']] += reward['core_shards']

    for row in projection['trajectory']:
        day = row['day']; today = date.fromisoformat(row['date'])
        if row['logged_in']:
            # Replace every expected free chest with one actual integer roll.
            base = {k: row[k] - previous[k] for k in income.CURRENCIES}
            chests = [income.meta.GIFT_CHEST_ID] * case['gifts']
            if case.get('mode', 'ranked_pvp') in ('ranked_pvp', 'arena_ai'):
                for battle in range(case['wins']):
                    unit = income.meta._hash_unit(f'budget-{seed}:{day}:{battle}:victory')
                    chests.append(next(identity for upper, identity in income.meta.BATTLE_CHEST_DROP_THRESHOLDS if unit < upper))
                expected = _victory_value()
                for k in income.CURRENCIES: base[k] -= case['wins'] * expected[k]
            gift = income.chest_value(income.meta.GIFT_CHEST_ID)
            for k in income.CURRENCIES:
                base[k] -= case['gifts'] * gift[k]
                amount = round(base[k])
                if abs(base[k] - amount) > .011: raise ValueError('Non-integer non-chest income')
                setattr(p, k, getattr(p, k) + amount); earned[k] += amount
            for index, identity in enumerate(chests):
                reward = _open(p, engine, identity, f'{seed}:{day}:chest:{index}')
                for k in income.CURRENCIES: earned[k] += reward[k]
                record_pieces(reward)
            if projection['season_active']:
                record_pieces(_pieces(p, income.profile.LOGIN_PERIOD_REWARDS[day-1], f'{seed}:login:{day}'))
                for tier in range(previous_tier + 1, row['tier'] + 1):
                    reward = income.profile.SEASON_REWARD_TRACK[tier-1]
                    record_pieces(_pieces(p, reward, f'{seed}:road:{tier}'))
            if claim_choice and not case.get('forfeit') and case.get('mode', 'ranked_pvp') in ('ranked_pvp', 'arena_ai'):
                week = today.isocalendar()[:2]
                before = weekly_battles[week]; weekly_battles[week] += case['battles']
                threshold = policy['choice_crate_candidate']['completed_qualified_battles_per_utc_week']
                if before < threshold <= weekly_battles[week]:
                    # Three server-authored targets, independent of client choice.
                    options = []
                    for group in COMBAT_CLASSES:
                        members = sorted(k for k in pool if MODULE_SPECS[k]['category'] == group)
                        digest = income.meta._hash_range(f'{seed}:{week}:{group}', 0, len(members)-1)
                        target = members[digest]
                        amount = policy['choice_crate_candidate']['pieces_by_rarity'][income.meta.MODULE_RARITY[target]]
                        options.append(dict(option_id=group, module_definition_id=target, module_shards=amount))
                    picked = min(options, key=lambda o: (
                        o['module_definition_id'] not in policy['deck'],
                        p.module_upgrade_levels.get(o['module_definition_id'], 0),
                        p.module_shards.get(o['module_definition_id'], 0), o['option_id']))
                    apply_fixed_contents(p, picked); record_pieces(picked)
                    choices.append(dict(day=day, utc_week=list(week), options=options, selected=deepcopy(picked)))
            _spend(p, policy, spent)
            if buy_offer:
                offer = policy['guaranteed_offer_candidate']
                week = today.isocalendar()[:2]
                for _ in range(offer['purchases_per_utc_week'] - weekly[week]):
                    members = sorted(pool)
                    target = members[income.meta._hash_range(f'{seed}:{week}:offer',0,len(members)-1)]
                    if (target not in policy['deck'] or p.module_upgrade_levels.get(target,0)+1 >= policy['deck_target_level']
                            or p.circuit_credits < offer['price']): break
                    pieces = offer['pieces_by_rarity'][income.meta.MODULE_RARITY[target]]
                    p.circuit_credits -= offer['price']; spent['circuit_credits'] += offer['price']
                    p.module_shards[target] = p.module_shards.get(target, 0) + pieces
                    earned_modules[target] += pieces; weekly[week] += 1
                    purchases.append(dict(day=day, module_id=target, pieces=pieces, price=offer['price']))
                    _spend(p, policy, spent)
        previous = {k: row[k] for k in income.CURRENCIES}; previous_tier = row['tier']
        if day in (1, 7, 28):
            levels = {key: p.module_upgrade_levels.get(key, 0)+1 for key in policy['deck']}
            checkpoints.append(dict(day=day, earned=deepcopy(earned), spent={k: spent[k] for k in income.CURRENCIES},
                wallet={k: getattr(p, k) for k in income.CURRENCIES}, deck_levels=levels,
                deck_at_target=sum(v >= policy['deck_target_level'] for v in levels.values()),
                core_level=p.core_upgrade_levels.get(core_id, 0)+1,
                first_deck_talents=len(p.module_talents), first_core_talent=bool(p.core_skills.get(core_id)),
                remaining_module_pieces=dict(sorted(p.module_shards.items())),
                remaining_core_pieces=dict(sorted(p.core_shards_by_type.items())),
                cumulative_module_pieces=dict(sorted(earned_modules.items())),
                cumulative_core_pieces=dict(sorted(earned_cores.items())),
                cumulative_module_pieces_spent=dict(sorted(spent['module_pieces'].items())),
                cumulative_core_pieces_spent=dict(sorted(spent['core_pieces'].items())),
                choice_crates=len(choices), offer_purchases=len(purchases), offer_credits_spent=sum(r['price'] for r in purchases)))
    return dict(id=case['id'], proposed=proposed, strategy='with_choice_and_offer' if claim_choice else 'with_offer' if buy_offer else 'earned_only',
        seed=seed, fixed_rating=p.rating, eligible_module_pool=list(pool), starting_module_pieces=starting_pieces,
        checkpoints=checkpoints, purchases=purchases, choices=choices)


def _victory_value():
    result = income.currencies(); previous = 0
    for upper, identity in income.meta.BATTLE_CHEST_DROP_THRESHOLDS:
        for key, value in income.chest_value(identity).items(): result[key] += (upper-previous)*value
        previous = upper
    return result


def acquisition(case, policy):
    """Separate rated journey; fixed-rating income must never imply arena gain."""
    target = income.canon.ARENA_MINIMUM_RATING_BY_INDEX[policy['new_module']['arena_unlock']]
    rating = peak = max(0, case.get('rating', income.canon.ARENA_MINIMUM_RATING_BY_INDEX[case.get('rating_arena', 1)]))
    reached = 0 if peak >= target else None
    start = date.fromisoformat(income.load_policy()['simulation_starts_on'])
    weekdays = case.get('login_weekdays', range(7))
    battles = case['battles']; wins = case['wins']; played = 0
    for day in range(1, 29):
        if reached is not None: break
        if (start+timedelta(days=day-1)).weekday() not in weekdays or case.get('forfeit'): continue
        if case.get('mode', 'ranked_pvp') not in ('ranked_pvp', 'arena_ai'): continue
        for i in range(battles):
            # Evenly interleaved wins; equal-rating opponents, not telemetry.
            won = (i+1)*wins//battles > i*wins//battles
            rating = max(income.meta.arena_floor_for_rating(rating), rating+income.canon.trophy_delta(rating, rating, 1 if won else 0))
            peak = max(peak, rating); played += 1
            if peak >= target: reached = day; break
    return dict(id=case['id'], arena_unlock=policy['new_module']['arena_unlock'], required_peak_rating=target,
        arena_reached_day=reached, rated_battles_until_stop=played, final_rating=rating, highest_rating=peak,
        currency_price=income.currencies(), required_unlock_pieces=0,
        module_is_active=False, access_conditional_on_release_gates=True,
        level_1_to_5_cost=income.module_cost(policy['new_module']['rarity'], 5))


def cost_basket(deck, level, core_level, policy):
    """One combined price: pieces remain scoped to each module/core."""
    total = income.currencies(); modules = {}
    for key in deck:
        rarity = income.meta.MODULE_RARITY[key]
        upgrade = income.module_cost(rarity, level)
        modules[key] = upgrade['shards']
        talent = income.currencies(*income.TALENT_COSTS[rarity][0]) if level >= TALENT_LEVELS[rarity][0] else income.currencies()
        for k in income.CURRENCIES: total[k] += upgrade[k] + talent[k]
    core = next(c for c in income.meta.CORE_TYPES if c['id'] == policy['core_type_id'])
    upgrade = income.module_cost(core['rarity'], core_level)
    for k in income.CURRENCIES: total[k] += upgrade[k]
    if core_level >= core['skills'][0]['level']:
        total['circuit_credits'] += core['skills'][0]['circuit_credits_cost']; total['flux_shards'] += core['skills'][0]['flux_cost']
    return dict(**total, module_pieces=modules, core_pieces={core['id']:upgrade['shards']},
        includes_only_eligible_first_talents=True)


def build_report():
    policy = load_policy(); cases = scenarios()
    runs = [simulate(c, proposed=p, buy_offer=o, claim_choice=q, seed=s, policy=policy)
            for c in cases for p in (False, True) for o,q in ((False,False),(True,False),(True,True)) for s in range(policy['sample_count'])]
    sources = (*income.SOURCES, 'tools/simulate_progression_budget.py', SOURCE.relative_to(ROOT).as_posix(),
        'server/data/module_roster_v2.json', 'server/data/arena_progression_v1.json',
        'server/data/reward_definitions_v1.json', 'server/app/reward_definitions.py',
        'server/app/reward_delivery.py', 'server/app/catalog_migration.py', 'server/app/module_roster.py',
        'server/app/arena_canon.py', 'server/app/game/core_talents_v5.py')
    return dict(schema_version=1, release='2.5.0', planning_only=True, runtime_changed=False,
        sample_count=policy['sample_count'], policy=policy,
        assumptions=['Eight fixed synthetic seeds are examples, not confidence intervals or guarantees.',
            'All starting currency is zero; only the existing two starter laser pieces are retained.',
            'Same fixed rating and loot identities for current/candidate; XP and fragment amounts unchanged.',
            'Five-channel guaranteed income plus real integer chest rolls; all stated gifts and tiers collected.',
            'Round-robin deck upgrades, then core, then first talents, then optional weekly offer.',
            'One hashed eligible offer target per player/week; no deck filtering or target reroll. Ignore offers outside the goal deck.',
            'Three strategies are independent alternative wallets; purchases spend actual available credits.',
            'Offer is a planning candidate available in both counterfactual income models, not a live product.',
            'Choice candidate: twelve qualified completed battles in one UTC week, one fixed three-option right.',
            'No one-off road awards, legacy nested road chests, competitions, premium or donations.',
            'Rating journey is separate: equal-rating opponents and evenly interleaved stated wins.',
            'Recoil Cannon remains planned; arena access is conditional on all release gates.'],
        acquisition=[acquisition(c, policy) for c in cases], runs=runs,
        cost_baskets={
            'starter_six_level_5_core_5':cost_basket(policy['deck'],5,5,policy),
            'starter_six_level_8_core_9':cost_basket(policy['deck'],8,9,policy),
            'arena3_mixed_six_level_5_core_5':cost_basket(policy['mixed_deck'],5,5,policy),
            'arena3_mixed_six_level_8_core_9':cost_basket(policy['mixed_deck'],8,9,policy)},
        source_hashes={n: hashlib.sha256((ROOT/n).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for n in sources})


def render(report):
    lines = ['# 2.5.0 — birlikte harcanan ücretsiz ilerleme bütçesi', '',
        '> Yalnız yerel analiz. Canlı miktar, fiyat, oyuncu verisi veya modül kataloğu değişmez.', '',
        '[Ana ekonomi raporu](free-economy-250-report.md) · [Aday karar](free-economy-250-progression-v1.json) · [Tam hesap](free-economy-250-progression-report.json)', '',
        'Sekiz sabit sentetik kimlikte gerçek sandık çözümleyicisi ve parça hedeflemesi kullanılır. '
        'Her örnekte tek cüzdan harcanır: altılı başlangıç destesi 1→5, Rezonans çekirdeği 1→5, '
        'seviyesi yeten ilk yetenekler, ardından isteğe bağlı teklif. Her ikisi de sıfır para ve mevcut '
        'iki Lazer parçasıyla başlar. Parça ve kredi birlikte yeterli olmadan yükseltme yapılmaz.', '',
        '## Ortak cüzdanın toplam maliyeti', '',
        '| Sepet (uygun ilk yetenekler dahil) | Kredi | Akı | Modül parçaları toplamı (hedefler ayrı) | Rezonans parçası |',
        '| --- | ---: | ---: | ---: | ---: |']
    for key, basket in report['cost_baskets'].items():
        lines.append(f"| {key} | {basket['circuit_credits']} | {basket['flux_shards']} | {sum(basket['module_pieces'].values())} | {sum(basket['core_pieces'].values())} |")
    lines += ['', 'Bir kartın parçası diğer karta veya çekirdeğe harcanamaz. İlk yeteneği henüz açılmamış '
        'nadir kartın yetenek bedeli 5. seviye sepetine eklenmez. Eski maliyet tabloları aynen okunur; '
        'ileri seviye yetenekler, reset ve pahalı sandıkların bağımsız bedelleri ana ekonomi raporundadır.', '',
        '## 28 gün: yeni gelir adayıyla aynı cüzdandaki sonuçlar', '',
        '| Profil | Teklif | 5. seviyeye gelen kart (8 örnekte min–maks / 6) | Çekirdek seviyesi | Kalan kredi | Kalan Akı |',
        '| --- | --- | ---: | ---: | ---: | ---: |']
    for c in scenarios():
        for strategy in ('earned_only', 'with_offer', 'with_choice_and_offer'):
            rows = [r['checkpoints'][-1] for r in report['runs'] if r['id']==c['id'] and r['proposed'] and r['strategy']==strategy]
            def span(key):
                values = [key(r) for r in rows]
                return f'{min(values)}–{max(values)}'
            label = {'earned_only':'Yok','with_offer':'Teklif','with_choice_and_offer':'Teklif + seçim'}[strategy]
            lines.append(f"| {c['name_tr']} | {label} | {span(lambda r:r['deck_at_target'])} | {span(lambda r:r['core_level'])} | {span(lambda r:r['wallet']['circuit_credits'])} | {span(lambda r:r['wallet']['flux_shards'])} |")
    lines += ['', 'Aralıklar bu sekiz örneğin en düşük/en yüksek değeridir; garanti, olasılık yüzdesi veya '
        'gerçek oyuncu ölçümü değildir. 1/7/28 gün, bütün kimliklerde parça/çekirdek stokları, harcanan para '
        've teklif alımları JSON’dadır. Mevcut gelir ve yeni gelir aynı strateji/tohumla ayrıca karşılaştırılır.', '',
        '## Garantili teklif için uygulama adayı', '',
        '500 Devre Kredisi; oyuncu başına UTC haftasında en fazla iki alım. Açık arena havuzundan '
        'sunucunun sabitlediği hedef için sıradan12 / nadir6 / destansı3 / efsanevi1 parça. '
        'Bu fiyat bir başlangıç ayarıdır; rastgele sandık fiyatı veya mevcut olasılık tablosu değişmez. '
        'Hedef oyuncu/UTC haftası için açık havuzdan hash ile sabitlenir; deste hedefi aramak için '
        'yenilenmez. Örnek tüketici yalnız hedef desteye yarıyorsa alır; gerçek UI oyuncunun '
        'göreceği hedefi alımdan önce açıkça göstermelidir. SHOP-01/02/03 bu ürünü henüz uygulamadı.', '',
        'Satın alınan parçalar toplam parça kazanımına dahil; kredi fiyatı aynı cüzdandan düşülür. '
        'Dört tam UTC haftasında en fazla8 alım/4000 kredi; farklı başlangıç günü beş hafta kimliğine '
        'rastlayabilir. Bu kural ayrı günlük/haftalık para desteği üretmez.', '',
        '## Mühendis Kasası için uygulama adayı', '',
        'UTC haftasında 12 uygun, pes edilmemiş ranked_pvp/arena_ai savaşı: haftada bir hak. '
        'Zafer gerekmez; sezon arasında da kazanılabilir. Saldırı/savunma/taktik için yalnız açık '
        'havuzdan birer hedef hak anında sunucu hash’iyle sabitlenir. Üç seçenekten biri alınır: '
        'hedef sıradansa20 / nadirse10 / destansıysa4 / efsaneviyse2 parça. Para veya XP vermez. '
        'Örnek tüketici destedeki düşük seviyeli hedefi seçer; kaçırılan hafta telafi hakkı üretmez. '
        'Kazanılmış seçim kapanışta silinmez. REWARD-02/03 bu adayın gerçek kazanım, snapshot '
        've tek teslim işlemini uygulayacak; bu rapor API açmaz.', '',
        '## Geri Tepme Topu: para ödemeden erişim', '',
        'Mevcut kanonda kart sahipliği arena girişinde 1. seviyede açılır; parça satın almak '
        'sahiplik şartı değildir. Yeni nadir saldırı kartı Arena3 /600 zirve kupası adayıdır. '
        '1→5 için36 hedef parça ve2800 kredi ayrıca gerekir; ücretsiz erişim ile yükseltme ayrı hesaplanır. '
        'Kart hâlâ planned; aşağıdaki gün yalnız aynı kupa kuralıyla arenaya erişim örneğidir.', '',
        '| Profil | Arena3’e erişim günü (28 gün içinde) |', '| --- | ---: |']
    names = {c['id']:c['name_tr'] for c in scenarios()}
    for r in report['acquisition']:
        lines.append(f"| {names[r['id']]} | {r['arena_reached_day'] if r['arena_reached_day'] is not None else 'Ulaşmadı'} |")
    lines += ['', 'Sabit kupa gelir hesabı arenaya ilerleme sayılmaz. Ayrı kupa örneği eş kupalı rakip '
        've güne dengeli dağılan zaferler varsayar; eşleşme, beceri veya savaş sayısı başarı garantisi değildir.', '',
        '## Karar ve sınırlar', '',
        '- Beş kanallı para artışı uygulama adayı olarak korunur; XP, eski haklar, S1 kataloğu ve maliyet eğrileri değişmez.',
        '- Para artışı tek başına parça darboğazını çözmez. Garantili hedef parça teklifi seçim kasasıyla birlikte ilerleme aracıdır; yeni modülün 1. seviye sahipliğine ücret eklenmez.',
        '- Yüksek seviye altılı deste, çekirdek, yetenek ve kozmetik aynı cüzdanı paylaşır. Bu rapor son seviye hızlandırma veya sınırsız gelir gerekçesi değildir.',
        '- Teklif ve seçim miktarları bu hesapta açık uygulama adaylarıdır. REWARD-02/SHOP-01 katalog revisionu, uygunluk ve gerçek API kabulüyle sabitlenir; BALANCE-01 sonrası ayar gerekebilir.',
        '- Eski premium sahipleri için BASE-01 raporu ve iade hakları korunur; bu ücretsiz örneğe premium geliri eklenmez.',
        '- Ekonomi modelinin hazırlanması gerçek API, kullanıcı arayüzü, savaş dengesi veya cihaz kabulü değildir.',
        '- `python tools/simulate_progression_budget.py --write` üretir; `--check` kaynak veya karar kaymasını yakalar.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true'); group.add_argument('--check', action='store_true')
    args = parser.parse_args(); report = build_report()
    for path, value in ((REPORT, json.dumps(report, ensure_ascii=False, indent=2)+'\n'), (DOCUMENT, render(report))):
        if args.write: path.write_text(value, encoding='utf-8')
        elif not path.exists() or path.read_text(encoding='utf-8') != value: raise ValueError('Progression budget differs; run --write')
    print(json.dumps(dict(runs=len(report['runs']), samples=report['sample_count'], runtime_changed=False)))


if __name__ == '__main__': main()
