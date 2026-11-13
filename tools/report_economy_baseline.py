"""Read-only 2.4 baseline and S1 budget proposal; no runtime state or live prices."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import date, timedelta
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app import arena_canon as canon
from app import meta_progression as meta
from app import player_profile as profile
from app import player_progression as progression
from app import season_competition as competition
from app import store_catalog as store
from app.match_accounting import applies_to_profile_progression, contributes_to_weekly_tournament

REPORT = ROOT / 'docs/planning/economy-baseline.json'
DOCUMENT = ROOT / 'docs/planning/economy-baseline.md'
RESOURCES = ('circuit_credits', 'flux_shards', 'module_shards', 'core_shards', 'universal_module_shards')
SOURCES = (
    'server/app/player_profile.py', 'server/app/player_progression.py', 'server/app/meta_progression.py',
    'server/app/season_competition.py', 'server/app/reward_delivery.py', 'server/app/store_catalog.py',
    'server/app/arena_canon.py', 'server/app/match_accounting.py', 'server/app/competition_control.py',
    'server/app/season_missions.py', 'docs/planning/season-1-engagement-v1.json',
    'server/app/season_entitlements.py', 'server/app/first_season_profile.py',
    'server/app/main.py', 'server/app/cosmetic_releases.py',
    'server/data/first_season_launch_v1.json',
    'server/data/cosmetic_releases_v1.json', 'docs/planning/release_calendar_v1.json',
)


def totals(rows):
    return {key: sum(int(row.get(key, 0) or 0) for row in rows) for key in RESOURCES}


def chest_value(definition_id):
    """Currency expectation only; piece identity/rarity fallback is not approximated."""
    d = meta.CHEST_DEFINITIONS[definition_id]
    return {'circuit_credits': sum(d['coins']) / 2, 'flux_shards': sum(d['flux']) / 2}


def scenario(*, days, rating, wins, losses, mission_ids, gifts, mode='ranked_pvp',
             season_premium=False, battle_premium=False, ad_wins=0):
    """Fixed rating/roster, no draws/spend/road rewards; claims and wins are assumptions."""
    if not 1 <= days <= 28 or not 0 <= ad_wins <= wins:
        raise ValueError('Invalid horizon or ad count')
    if len(set(mission_ids)) != len(mission_ids):
        raise ValueError('Duplicate mission')
    missions = {m['id']: m for m in profile.DAILY_MISSIONS}
    if set(mission_ids) - missions.keys():
        raise ValueError('Unknown mission')
    if not applies_to_profile_progression(mode) or mode == 'local_test':
        raise ValueError('Scenario requires a progression mode')
    rank = meta.rank_stage_for_rating(rating)
    win_credit = progression.match_circuit_credit_reward(rank, won=True, draw=False, match_type=mode)
    loss_credit = progression.match_circuit_credit_reward(rank, won=False, draw=False, match_type=mode)
    win_xp, loss_xp = progression.WIN_XP, progression.LOSS_XP
    if mode == 'unranked_ai':
        win_xp = max(1, round(win_xp * progression.AI_REWARD_RATIO))
        loss_xp = max(1, round(loss_xp * progression.AI_REWARD_RATIO))
    if battle_premium:
        win_credit, loss_credit, win_xp, loss_xp = map(progression.battle_premium_amount,
                                                    (win_credit, loss_credit, win_xp, loss_xp))
    mission_xp = sum(missions[i]['season_xp_reward'] for i in mission_ids)
    xp = days * (wins * win_xp + losses * loss_xp + mission_xp + ad_wins * win_xp)
    rows = [r for r in profile.SEASON_REWARD_TRACK if r['required_xp'] <= xp]
    premium_rows = [r for r in profile.SEASON_PREMIUM_REWARD_TRACK if r['required_xp'] <= xp] if season_premium else []
    credits = days * (wins * win_credit + losses * loss_credit + ad_wins * win_credit)
    flux = days * sum(missions[i]['flux_shard_reward'] for i in mission_ids)
    currencies = {'matches_and_ads': {'circuit_credits': credits, 'flux_shards': 0},
                  'missions': {'circuit_credits': 0, 'flux_shards': flux}}
    currencies['login'] = totals(profile.LOGIN_PERIOD_REWARDS[:days])
    currencies['free_road'] = totals(rows)
    currencies['premium_road_extra'] = totals(premium_rows)
    # Each eligible win awards one ordinary chest; its fixed competition names do not add a roll.
    weights, previous = [], 0
    for upper, identity in meta.BATTLE_CHEST_DROP_THRESHOLDS:
        weights.append((upper - previous, identity))
        previous = upper
    chest_wins = wins if mode in {'ranked_pvp', 'arena_ai'} else 0
    currencies['victory_chests_expected'] = {
        k: days * chest_wins * sum(p * chest_value(identity)[k] for p, identity in weights)
        for k in ('circuit_credits', 'flux_shards')}
    currencies['gift_chests_expected'] = {
        k: days * gifts * chest_value(meta.GIFT_CHEST_ID)[k] for k in ('circuit_credits', 'flux_shards')}
    return dict(days=days, rating=rating, wins_per_day=wins, losses_per_day=losses, mission_ids=mission_ids,
                gift_claims_per_day=gifts, mode=mode, season_premium=season_premium, battle_premium=battle_premium,
                ad_wins_per_day=ad_wins, season_xp=xp, reached_tier=len(rows), sources=currencies,
                credits_expected=round(sum(r['circuit_credits'] for r in currencies.values()), 2),
                flux_expected=round(sum(r['flux_shards'] for r in currencies.values()), 2),
                eligible_modules=list(canon.unlocked_reward_module_ids(rating)),
                weekly_eligible=contributes_to_weekly_tournament(mode))


def build_report():
    calendar = json.loads((ROOT / SOURCES[-1]).read_text(encoding='utf-8'))
    release = next(r for r in calendar['releases'] if r['version'] == '2.4.0')
    free, premium = deepcopy(profile.SEASON_REWARD_TRACK), deepcopy(profile.SEASON_PREMIUM_REWARD_TRACK)
    all_missions = [m['id'] for m in profile.DAILY_MISSIONS]
    configs = {
        'new_free': dict(rating=0, wins=1, losses=1, gifts=1,
                         mission_ids=['complete_battles', 'circuit_actions', 'win_battles']),
        'regular_free': dict(rating=0, wins=2, losses=2, gifts=2, mission_ids=all_missions),
        'season_pass_only': dict(rating=0, wins=2, losses=2, gifts=2, mission_ids=all_missions, season_premium=True),
        'both_premiums': dict(rating=0, wins=2, losses=2, gifts=2, mission_ids=all_missions,
                              season_premium=True, battle_premium=True),
        'unranked_ai': dict(rating=0, wins=2, losses=2, gifts=2, mission_ids=all_missions, mode='unranked_ai'),
        'regular_arena_6': dict(rating=canon.ARENA_MINIMUM_RATING_BY_INDEX[6], wins=2, losses=2,
                                gifts=2, mission_ids=all_missions),
    }
    scenarios = {name: {str(days): scenario(days=days, **cfg) for days in (1, 28)} for name, cfg in configs.items()}
    # Fixed proposal: reuse weekly credit/flux and existing common-shard tier amounts.
    # This is explicitly an incremental shard budget, not already-funded runtime income.
    weeks = []
    first = date.fromisoformat(release['season']['starts_on'])
    for index, module_id in enumerate(('laser', 'shield', 'pulse_cannon', None)):
        start = first + timedelta(days=index * 7)
        prizes = []
        for source, shard_tier in zip(competition.WEEKLY_PRIZES, (35, 15, 5)):
            reward = {k: deepcopy(source[k]) for k in ('position', 'circuit_credits', 'flux_shards', 'chest_tier')}
            if module_id:
                assert canon.MODULES[module_id]['rarity'] == 'common' and module_id in canon.unlocked_module_ids(0)
                reward.update(module_definition_id=module_id, module_shards=free[shard_tier - 1]['module_shards'])
            if index == 3 and reward['position'] == 1:
                reward.update(avatar_frame_id='abyss_frame', profile_background_id='abyss_banner')
            prizes.append(reward)
        weeks.append(dict(starts_on=start.isoformat(), ends_on=(start + timedelta(days=7)).isoformat(),
                          period_id=f'{start.isocalendar().year}-W{start.isocalendar().week:02d}',
                          reward_kind='resource_only' if index < 3 else 'cosmetic_set', prizes=prizes))
    cosmetics = [dict(source='season_road', slot=40, items=['aurora_frame', 'aurora_banner']),
                 dict(source='season_leaderboard', slot=1, items=['solar_frame', 'solar_banner']),
                 dict(source='weekly_tournament', period_id=weeks[-1]['period_id'], slot=1,
                      items=['abyss_frame', 'abyss_banner'])]
    catalog = json.loads((ROOT / 'server/data/cosmetic_releases_v1.json').read_text(encoding='utf-8'))
    assert {i for r in cosmetics for i in r['items']} <= {i['id'] for i in catalog['items']}
    return dict(schema_version=1, planning_only=True, runtime_changed=False, as_of='2026-11-04',
                limitations=['Fixed rating/roster and daily claims are assumptions, not telemetry.',
                             'Chest currency expectations are not guaranteed balances.',
                             'module_shards in template totals are common-base units, not per-card or universal shards.',
                             'Road/title/team transfers, purchases, spend and competition wins are separate.',
                             'No automatic publication or adjustment of prices/XP/rewards.'],
                scenario_reward_policy='s1_fixed_road_draft_excluding_legacy_api_extra_chests',
                current_legacy_api_has_additional_road_chests=True,
                source_hashes={p: hashlib.sha256((ROOT / p).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for p in SOURCES},
                season=release['season'], free_track=free, premium_extra_track=premium,
                free_totals=totals(free), premium_extra_totals=totals(premium),
                login_days=deepcopy(profile.LOGIN_PERIOD_REWARDS), login_totals=totals(profile.LOGIN_PERIOD_REWARDS),
                daily_missions=deepcopy(profile.DAILY_MISSIONS),
                chests=[dict(**deepcopy(d), price=meta.STORE_CHEST_PRICES[i], limit=meta.STORE_CHEST_DAILY_LIMITS[i])
                        for i, d in meta.CHEST_DEFINITIONS.items()],
                sale_discount_percent=meta.STORE_SALE_DISCOUNT_PERCENT,
                paid_products=deepcopy(store.PAID_PRODUCTS), weekly_current=deepcopy(competition.WEEKLY_PRIZES),
                leaderboard_current=deepcopy(competition.LEADERBOARD_PRIZES), team_current=deepcopy(competition.TEAM_PRIZES),
                scenarios=scenarios,
                ad_sensitivity=scenario(days=28, **configs['regular_free'], ad_wins=1),
                s1_proposal=dict(status='implementation_proposal_not_published', preserve_current_40_tier_resource_amounts=True,
                                 season_chest_tags_are_not_extra_chests=True, weekly=weeks, cosmetics=cosmetics,
                                 added_common_module_shards_across_all_weekly_winners=sum(totals(w['prizes'])['module_shards'] for w in weeks)),
                upgrade_totals={rarity: {k: sum(meta.rarity_upgrade_cost(rarity, n)[k] for n in range(14))
                                        for k in ('circuit_credits', 'flux_shards', 'shards')}
                                for rarity in meta.MODULE_UPGRADE_CREDIT_CURVES})


def render(r):
    fmt = lambda reward: ' / '.join(str(reward.get(k, 0)) for k in RESOURCES[:4])
    lines = ['# 2.4.0 / BASE-01 — ekonomi baz çizgisi ve ilk sezon bütçesi', '',
             '**4 Kasım 2026.** Kaynak kod anlık görüntüsüdür; oyuncu telemetrisi, canlı fiyat sorgusu veya denge simülasyonu değildir. '
             'S1 önerileri yayımlanmadı; oyun verisi ve fiyatlar değiştirilmedi.', '',
             '[2.4.0 briefi](releases/2.4.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#base-01) · '
             '[Makine raporu](economy-baseline.json) · [Takvim](release_calendar_v1.json)', '',
             '`python tools/report_economy_baseline.py --write` kaynaklardan bu iki dosyayı üretir; `--check` kaymayı denetler.', '',
             '## 1. Temel bulgular ve S1 kararı', '',
             f"- 40. kademe **{r['free_track'][-1]['required_xp']} sezon XP** ister. Altı görev birlikte "
             f"**{sum(m['season_xp_reward'] for m in r['daily_missions'])} XP / {sum(m['flux_shard_reward'] for m in r['daily_missions'])} Akı/gün** verir.",
             '- Dört maç/gün, iki galibiyet ve mevcut altı görev varsayımıyla (SEASON-01 ekleri hariç) ücretsiz oyuncu '
             f"28 günde **{r['scenarios']['regular_free']['28']['season_xp']} XP / {r['scenarios']['regular_free']['28']['reached_tier']} kademe** açar. "
             'Ücretli sezon geçişi XP kazandırmaz; Savaş Premium maç XP/kredisini %50 artırır.',
             '- **S1 hedef sözleşmesi: sandık etiketi ≠ ek teslim.** Servis katmanı doğrudan kaynak verir; '
             'eski API ise etiketli kademelere ayrıca rastgele mağaza sandığı ekler. Bu fark gerçek API testinde doğrulandı. '
             'Yayınlanmış ilk sezon profili yeni haklarda ek sandık sayısını sıfırlar; mevcut eski sandık hakları korunur. '
             'Bu rapordaki S1 tablolarına sezon yolundan rastgele sandık geliri eklenmedi; eski API toplam geliri diye okunmamalıdır. '
             'Turnuva/sıralama kasaları ise sabit içeriği taşır; Elmas görünümü bir de rastgele Elmas ödülü doğurmaz.',
             '- S1 uygulama önerisi: mevcut 40 kademe kaynak miktarı ve XP eşikleri korunur; eksik sandık '
             'vaadini ekran/sunucu sözleşmesinde kaldır veya mevcut kaynakları tek sabit pakete taşı. Ek rastgele sandık açılışı '
             'bu bütçeye dahil değildir. Eski kazanılmış hak ve satın alma/iade kökenleri korunur.',
             '- Kullanıcı 4 Kasımda XP açığının bilinçli olduğunu teyit etti: 12.240 XP eşiği korunur. '
             'Mevcut altı görev ve reklamsız %50 zafer varsayımıyla bitirme yükü yaklaşık 9,3 maç/gündür. '
             'Yeni günlük/sezonluk emirler ve reklam katkısının ayrı uygulama planı '
             '[S1 ödül ve XP sözleşmesindedir](season-1-rewards-and-xp.md). '
             'Aşağıdaki tablolar altı görevli karşılaştırma baz çizgisidir; kodlanan +30 günlük / +1.800 sezonluk '
             'ek emir bütçesi bu tablolara katılmaz. Ekli güncel iş yükü hesapları bağlantıdaki S1 raporundadır.', '',
             '## 2. Sandık, hediye ve satın alma baz çizgisi', '',
             '| Sandık / kimlik | Bedel | UTC günlük alım limiti | Kredi / Akı garantisi | Modül düşüşü | Çekirdek düşüşü |',
             '| --- | --- | --- | --- | --- | --- |']
    for d in r['chests']:
        lines.append(f"| {d['name_tr']} / `{d['id']}` | {d['price'][1]} {d['price'][0]} | {d['limit']} | "
                     f"{d['coins'][0]}–{d['coins'][1]} / {d['flux'][0]}–{d['flux'][1]} | {d['module_drop_chance']*100:g}% | "
                     f"{d['core_drop_chance']*100:g}% × {d['core_drop_shards']} parça |")
    lines += ['', 'Kredi ve Akı her normal sandıkta verilir; modül ve çekirdek düşüşleri ayrı olaylardır. '
              'Hediye yalnız Bronz, 8 saat cooldown; teorik tavan 3/gün, senaryoda 1 veya 2/gün. '
              f"Mağaza indirimi ayda sunucunun belirlediği bir UTC gününde %{r['sale_discount_percent']}; "
              '`3h/8h/24h` kimlikleri açma beklemesi değildir (`unlock_hours=0`). '
              'Galibiyet sandığı dağılımı Bronz %65, Gümüş %23, Altın %9, Elmas %3. '
              'Düşen modülün enderlik/arena uygunluğu aktif havuza bağlıdır; tam olasılık tablosu JSON raporundadır.', '',
              '| Ürün | Kaynak miktarı / hak | Kodda fiyat (kuruş) |', '| --- | --- | --- |']
    for p in r['paid_products']:
        lines.append(f"| `{p['id']}` | {str(p.get('amount', p['kind']))} {p.get('currency', '')} | {p['price_kurus']} |")
    lines += ['', 'Fiyatlar kaynak kaydıdır; kullanıcıya gösterilen gerçek mağaza fiyatı Billing bilgisinden gelir. '
              'Gerçek para alımları senaryo gelirine katılmadı. Premium geçiş **ek ×2** kaynak hattıdır; '
              'ücretsiz + premium birlikte **×3** doğrudan kademe kaynağı eder. Savaş Premium ayrı üründür.', '',
              '## 3. Kırk kademe — mevcut tutarlar ve S1 sunumu', '',
              'Dört sayı sırası: **Kredi / Akı / modül parçası tabanı / çekirdek parçası**. '
              'Modül tabanı sıradan kart eşdeğeridir; enderlikte %100/%75/%35/%15 ve ödül başına yuvarlama uygulanır. '
              'Bu sayıyı her karta verilmiş veya evrensel parça sayma. '
              'Sezon premium hattı tabanı da ayrı enderlik dönüşümünden geçer.', '',
              '| Kademe | Gerekli XP | Ücretsiz kaynak | Premium ek kaynak | Mevcut etiket (ek sandık değil) | S1 yeni dönem öğesi |',
              '| --- | --- | --- | --- | --- | --- |']
    for f, p in zip(r['free_track'], r['premium_extra_track']):
        lines.append(f"| {f['tier']} | {f['required_xp']} | {fmt(f)} | {fmt(p)} | {f['chest_tier'] or '—'} | "
                     f"{'Kutup Işığı çerçeve + zemin, ücretsiz' if f['tier']==40 else '—'} |")
    lines += ['', '**40 kademe toplamı:** ' + fmt(r['free_totals']) + ' ücretsiz; ' + fmt(r['premium_extra_totals']) +
              ' premium ek. Premium yeni dönem kozmetiğini ikinci kez vermez. '
              'Mevcut tekrar eden avatar/emoji/çerçeve alanları yeni dönem tahsisinden ayrı denetlenir; '
              'eski sahiplik silinmez, eski özel koleksiyon yeni sezon ödülü diye tekrarlanmaz.', '',
              '## 4. Günlük görevler ve giriş takvimi', '',
              '| Görev | Hedef | Sezon XP | Akı |', '| --- | --- | --- | --- |']
    for m in r['daily_missions']:
        lines.append(f"| {m['id']} | {m['target']} | {m['season_xp_reward']} | {m['flux_shard_reward']} |")
    lines += ['', '| Giriş günü | Kredi | Akı | Modül tabanı | Çekirdek parçası |', '| --- | --- | --- | --- | --- |']
    for d in r['login_days']:
        lines.append(f"| {d['day']} | {d['circuit_credits']} | {d['flux_shards']} | {d['module_shards']} | {d['core_shards']} |")
    lines += ['', 'Giriş toplamı: ' + fmt(r['login_totals']) + '. Yalnız bugünün giriş ödülü alınır; '
              'kaçırılan günler sonradan toplanmış sayılmadı. Çekirdek parçası doğrudan girişte desteklenir; '
              'Sabit posta kasasının `apply_fixed_contents` işlemi artık doğrulanmış core_type_id/core_shards '
              'içeriğini teslim eder. Bu teknik destek yeni çekirdek ödülü miktarı eklemez; '
              'yarışma bütçesine ek tutar yazılmadan girişteki 25 parça dışında yeni kaynak açılmaz.', '',
              '## 5. Bir gün / 28 gün kaynak senaryoları', '',
              'Bütün senaryolar sezonun ilk gününde başlar, rating sabit kalır, belirtilen galibiyet/mağlubiyet ve görev '
              'teslimleri her gün gerçekleşir; kaçırma yoktur. Bunlar gözlenen oyuncu davranışı değildir. '
              'Yeni: 1 galibiyet + 1 mağlubiyet, 3 görev ve 1 hediye/gün. Diğerleri 2+2 maç, 6 görev ve '
              '2 hediye/gün. Görev hasar/imha/çekirdek hedefleri ayrıca sağlanmış varsayılır; dört maç bunu garanti etmez. '
              'Rastgele sandıklardaki para ortalama beklentidir; garanti oyuncu bakiyesi değildir.', '',
              '| Senaryo | Gün | Sezon XP | Kademe | Kredi beklentisi | Akı beklentisi |', '| --- | --- | --- | --- | --- | --- |']
    for name, horizons in r['scenarios'].items():
        for s in horizons.values():
            lines.append(f"| {name} | {s['days']} | {s['season_xp']} | {s['reached_tier']} | {s['credits_expected']:.2f} | {s['flux_expected']:.2f} |")
    ad = r['ad_sensitivity']
    lines += ['', f"Reklam duyarlılığı: regular_free her gün bir kazanılmış maçın doğrulanmış reklamını da alırsa "
              f"28 günde {ad['season_xp']} XP / {ad['reached_tier']} kademe, {ad['credits_expected']:.2f} Kredi / {ad['flux_expected']:.2f} Akı. "
              'Reklam bir maçın ödenmiş kredi/XP tutarını bir kez daha verir; kupa/sandık/turnuva puanı vermez. '
              'Reklam erişimi/tamamlama garantisi yoktur; ana senaryolarda reklam sıfırdır.', '',
              'Derecesiz AI kredi/XP’yi yarıya indirir (tek maçta yuvarlanır), galibiyet sandığı/haftalık puan vermez; Arena AI normal ilerlemeye ve '
              'haftalık sıralamaya katkı sağlayabilir. Yapay bot hesapları ve operatör hesabı yarışma katılımından '
              'hariçtir. Arkadaş/antrenman/yeniden eğitim ve takım turnuvası normal ilerlemeye sayılmaz. '
              'Takım turnuvasının kendi ödülü ayrı bütçedir. Devre Yolu/unvan/bağış gibi tek seferlik veya '
              'oyuncu kararına bağlı gelirler, alım/harcama ve sıralama kazanımı bu düzenli gelir tablosuna eklenmedi.', '',
              '## 6. S1 haftaları — uygulanacak sabit paket önerisi', '',
              'Miktarlar yayınlanmamış ilk sezon taslağında doğrulanır. Kredi/Akı mevcut haftalık ilk üç ödülünden korunur; '
              'ilk üç haftaya eklenecek sıradan modül parçaları mevcut 35/15/5. kademe tabanlarından '
              '36/24/18 olarak alınır. Her modül Arena 1’de uygundur; seçim hakkı veya yeni kart yoktur. '
              'Tekil sabit paket kutusu içeriği taşır; rastgele mağaza sandığına ek açılış değildir.', '',
              '| Dönem (bitiş hariç) | Tür | Sıra | Kredi | Akı | Sabit modül/parça | Yeni koleksiyon |',
              '| --- | --- | --- | --- | --- | --- | --- |']
    for w in r['s1_proposal']['weekly']:
        for p in w['prizes']:
            lines.append(f"| {w['starts_on']}–{w['ends_on']} 03.00 TR / {w['period_id']} | {w['reward_kind']} | "
                         f"{p['position']} | {p['circuit_credits']} | {p['flux_shards']} | "
                         f"{p.get('module_definition_id','—')} / {p.get('module_shards',0)} | "
                         f"{'Derin Akım çerçeve + zemin' if p.get('avatar_frame_id') else '—'} |")
    lines += ['', f"**Ek parça tavanı:** bütün ilk üç ödülleri toplamında {r['s1_proposal']['added_common_module_shards_across_all_weekly_winners']} "
              'sıradan parça/sezon; aynı oyuncu ilk üç haftayı kazanırsa en çok 108. Bu ek kaynak artışıdır; '
              'mevcut bütçenin içinde varmış gibi gösterilmedi. Katılma bedeli haftada 100 Kredi; dört kez '
              'katılan oyuncuda 400 Kredi çıkış. Varsayılan en az dört gerçek katılımcı eşiği ve owner/bot hariçliği '
              'korunur; yetersiz katılımla dağıtım yapılmaz. Her ödül oyuncu+kaynak+dönem+sıra ile bir kez teslim edilir.', '',
              '## 7. Sezon sıralaması ve takım ayrımı', '',
              '| Sıra | Sabit Kredi | Akı | Evrensel modül parçası | S1 koleksiyon |', '| --- | --- | --- | --- | --- |']
    for p in r['leaderboard_current']:
        lines.append(f"| {p['position']} | {p['circuit_credits']} | {p['flux_shards']} | {p['universal_module_shards']} | "
                     f"{'Güneş Ocağı çerçeve + zemin' if p['position']==1 else 'yeni dönem öğesi yok'} |")
    rank_total = totals(r['leaderboard_current'])
    weekly_total = totals([p for w in r['s1_proposal']['weekly'] for p in w['prizes']])
    lines += ['', f"Sıralama tüm ilk 10 toplamı: {rank_total['circuit_credits']} Kredi / {rank_total['flux_shards']} Akı / "
              f"{rank_total['universal_module_shards']} evrensel parça. Dört haftalık ilk üçlerin toplamı: "
              f"{weekly_total['circuit_credits']} Kredi / {weekly_total['flux_shards']} Akı / {weekly_total['module_shards']} modül parçası. "
              'Bu tutarlar tek bir oyuncunun garantili geliri değildir; birden fazla hak sahibine dağılır.', '',
              'Takım turnuvası kişisel S1 bütçesine dahil değildir; yeterli katılım ve hazır içerikle '
              'sezon ve haftalık turnuvayla aynı 30 Kasım 03.00 TR başlangıcına hazırlanır. Mevcut 1./2./3. ödül tutarları '
              '1500/950/620 Kredi ve 110/70/45 Akı; takım kozmetiği bir takım hakkıdır. '
              'Kişisel üyelik/katılım dağıtım kuralı doğrulanmadan bunlar oyuncu başına veya bütün üyelerle '
              'çarpılarak raporlanmaz. Girişteki 25 çekirdek parçası dışında yeni sabit çekirdek paketi vaat edilmez.', '',
              '## 8. Harcama baz çizgisi ve uygulama kabulü', '',
              '| Enderlik | Modül Sv1→15 Kredi | İlgili modül parçası | Akı |', '| --- | --- | --- | --- |']
    for rarity, cost in r['upgrade_totals'].items():
        lines.append(f"| {rarity} | {cost['circuit_credits']} | {cost['shards']} | {cost['flux_shards']} |")
    lines += ['', 'Maliyetler kaynak eğrilerinin toplamıdır; oyuncunun bütün kaynaklarını tek karta ayırdığı veya '
              'rastgele parçaların o karta geldiği varsayılmaz. Yetenek yükseltme/sıfırlama, mağaza alımı ve '
              'takım katılımı ayrıca harcamadır. Bunlar net bakiye/ilerleme süresi simülasyonuna ECON-01’de girer.', '',
              '- [ ] SEASON-00: bu tutarları, paket kimliği/revision ve premium kökeniyle gerçek teslim akışına bağla; '
              'önizleme/sandık etiketi tutarsızlığını gider.',
              '- [ ] Kullanıcı kararıyla 12.240 XP eşiğini koru; SEASON-01 günlük/sezonluk emirleri ve '
              'reklam katkısını ayrı plan hesabıyla doğrula. Kaynak miktarı/eşik değişirse bu baz çizgisini yenile.',
              '- [ ] Kaynak/kozmetik dönem türünü açık şema yap; eski koleksiyon fallback’ini kapat; '
              '40. kademe, sezon 1.si ve son hafta 1.si dışında yeni dönem koleksiyonunu vaat etme.',
              '- [ ] 234 ek sıradan parça tavanını kaynak bütçesi kapısında doğrula; farklı miktar kararı alınırsa '
              'rapor/profil/önizleme/teslim birlikte değişsin.',
              '- [ ] Kapanış/geç dönüş/çift istek/restore ve bağımsız takım kapıları kanıtlansın. '
              'BASE-01 raporunun hazır olması SEASON-00 veya RELEASE-01 tamamlandı anlamına gelmez.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build_report()
    for path, content in ((REPORT, json.dumps(report, ensure_ascii=False, indent=2) + '\n'), (DOCUMENT, render(report))):
        if args.write:
            path.write_text(content, encoding='utf-8')
        elif not path.is_file() or path.read_text(encoding='utf-8') != content:
            raise ValueError(f'Baseline differs from sources: {path}; run --write')
    print(json.dumps({'tiers': len(report['free_track']), 'scenarios': len(report['scenarios']),
                      'last_tier_xp': report['free_track'][-1]['required_xp'], 'runtime_changed': False}))


if __name__ == '__main__':
    main()
