# 2.4.0 / BASE-01 — ekonomi baz çizgisi ve ilk sezon bütçesi

**4 Kasım 2026.** Kaynak kod anlık görüntüsüdür; oyuncu telemetrisi, canlı fiyat sorgusu veya denge simülasyonu değildir. S1 önerileri yayımlanmadı; oyun verisi ve fiyatlar değiştirilmedi.

[2.4.0 briefi](releases/2.4.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#base-01) · [Makine raporu](economy-baseline.json) · [Takvim](release_calendar_v1.json)

`python tools/report_economy_baseline.py --write` kaynaklardan bu iki dosyayı üretir; `--check` kaymayı denetler.

## 1. Temel bulgular ve S1 kararı

- 40. kademe **12240 sezon XP** ister. Altı görev birlikte **135 XP / 75 Akı/gün** verir.
- Dört maç/gün, iki galibiyet ve mevcut altı görev varsayımıyla (SEASON-01 ekleri hariç) ücretsiz oyuncu 28 günde **7420 XP / 28 kademe** açar. Ücretli sezon geçişi XP kazandırmaz; Savaş Premium maç XP/kredisini %50 artırır.
- **S1 hedef sözleşmesi: sandık etiketi ≠ ek teslim.** Servis katmanı doğrudan kaynak verir; eski API ise etiketli kademelere ayrıca rastgele mağaza sandığı ekler. Bu fark gerçek API testinde doğrulandı. Yayınlanmış ilk sezon profili yeni haklarda ek sandık sayısını sıfırlar; mevcut eski sandık hakları korunur. Bu rapordaki S1 tablolarına sezon yolundan rastgele sandık geliri eklenmedi; eski API toplam geliri diye okunmamalıdır. Turnuva/sıralama kasaları ise sabit içeriği taşır; Elmas görünümü bir de rastgele Elmas ödülü doğurmaz.
- S1 uygulama önerisi: mevcut 40 kademe kaynak miktarı ve XP eşikleri korunur; eksik sandık vaadini ekran/sunucu sözleşmesinde kaldır veya mevcut kaynakları tek sabit pakete taşı. Ek rastgele sandık açılışı bu bütçeye dahil değildir. Eski kazanılmış hak ve satın alma/iade kökenleri korunur.
- Kullanıcı 4 Kasımda XP açığının bilinçli olduğunu teyit etti: 12.240 XP eşiği korunur. Mevcut altı görev ve reklamsız %50 zafer varsayımıyla bitirme yükü yaklaşık 9,3 maç/gündür. Yeni günlük/sezonluk emirler ve reklam katkısının ayrı uygulama planı [S1 ödül ve XP sözleşmesindedir](season-1-rewards-and-xp.md). Aşağıdaki tablolar altı görevli karşılaştırma baz çizgisidir; kodlanan +30 günlük / +1.800 sezonluk ek emir bütçesi bu tablolara katılmaz. Ekli güncel iş yükü hesapları bağlantıdaki S1 raporundadır.

## 2. Sandık, hediye ve satın alma baz çizgisi

| Sandık / kimlik | Bedel | UTC günlük alım limiti | Kredi / Akı garantisi | Modül düşüşü | Çekirdek düşüşü |
| --- | --- | --- | --- | --- | --- |
| Bronz Sandık / `field_3h` | 1000 circuit_credits | 5 | 45–75 / 2–4 | 35% | 1% × 1 parça |
| Gümüş Sandık / `circuit_8h` | 2000 circuit_credits | 3 | 90–145 / 3–6 | 35% | 3% × 2 parça |
| Altın Sandık / `core_24h` | 500 flux_shards | 2 | 175–280 / 5–9 | 50% | 5% × 3 parça |
| Elmas Sandık / `diamond_24h` | 1000 flux_shards | 1 | 320–480 / 10–15 | 53% | 10% × 5 parça |

Kredi ve Akı her normal sandıkta verilir; modül ve çekirdek düşüşleri ayrı olaylardır. Hediye yalnız Bronz, 8 saat cooldown; teorik tavan 3/gün, senaryoda 1 veya 2/gün. Mağaza indirimi ayda sunucunun belirlediği bir UTC gününde %40; `3h/8h/24h` kimlikleri açma beklemesi değildir (`unlock_hours=0`). Galibiyet sandığı dağılımı Bronz %65, Gümüş %23, Altın %9, Elmas %3. Düşen modülün enderlik/arena uygunluğu aktif havuza bağlıdır; tam olasılık tablosu JSON raporundadır.

| Ürün | Kaynak miktarı / hak | Kodda fiyat (kuruş) |
| --- | --- | --- |
| `season_pass_premium` | season_pass  | 19999 |
| `battle_rewards_premium` | battle_premium  | 19999 |
| `flux_120` | 120 flux_shards | 2999 |
| `flux_260` | 260 flux_shards | 5999 |
| `flux_480` | 480 flux_shards | 9999 |
| `flux_1050` | 1050 flux_shards | 19999 |
| `credits_1000` | 1000 circuit_credits | 2999 |
| `credits_2200` | 2200 circuit_credits | 5999 |
| `credits_4000` | 4000 circuit_credits | 9999 |
| `credits_9000` | 9000 circuit_credits | 19999 |

Fiyatlar kaynak kaydıdır; kullanıcıya gösterilen gerçek mağaza fiyatı Billing bilgisinden gelir. Gerçek para alımları senaryo gelirine katılmadı. Premium geçiş **ek ×2** kaynak hattıdır; ücretsiz + premium birlikte **×3** doğrudan kademe kaynağı eder. Savaş Premium ayrı üründür.

## 3. Kırk kademe — mevcut tutarlar ve S1 sunumu

Dört sayı sırası: **Kredi / Akı / modül parçası tabanı / çekirdek parçası**. Modül tabanı sıradan kart eşdeğeridir; enderlikte %100/%75/%35/%15 ve ödül başına yuvarlama uygulanır. Bu sayıyı her karta verilmiş veya evrensel parça sayma. Sezon premium hattı tabanı da ayrı enderlik dönüşümünden geçer.

| Kademe | Gerekli XP | Ücretsiz kaynak | Premium ek kaynak | Mevcut etiket (ek sandık değil) | S1 yeni dönem öğesi |
| --- | --- | --- | --- | --- | --- |
| 1 | 150 | 40 / 0 / 6 / 0 | 80 / 0 / 12 / 0 | — | — |
| 2 | 308 | 60 / 4 / 0 / 0 | 120 / 8 / 0 / 0 | — | — |
| 3 | 474 | 0 / 5 / 9 / 0 | 0 / 10 / 18 / 0 | — | — |
| 4 | 648 | 70 / 4 / 0 / 0 | 140 / 8 / 0 / 0 | — | — |
| 5 | 830 | 120 / 15 / 18 / 0 | 240 / 30 / 36 / 0 | silver | — |
| 6 | 1020 | 0 / 5 / 12 / 0 | 0 / 10 / 24 / 0 | — | — |
| 7 | 1218 | 70 / 0 / 6 / 0 | 140 / 0 / 12 / 0 | — | — |
| 8 | 1424 | 90 / 4 / 0 / 0 | 180 / 8 / 0 / 0 | — | — |
| 9 | 1638 | 0 / 5 / 12 / 0 | 0 / 10 / 24 / 0 | — | — |
| 10 | 1860 | 350 / 35 / 39 / 0 | 700 / 70 / 78 / 0 | gold | — |
| 11 | 2090 | 90 / 0 / 9 / 0 | 180 / 0 / 18 / 0 | — | — |
| 12 | 2328 | 0 / 5 / 15 / 0 | 0 / 10 / 30 / 0 | — | — |
| 13 | 2574 | 100 / 0 / 9 / 0 | 200 / 0 / 18 / 0 | — | — |
| 14 | 2828 | 120 / 4 / 0 / 0 | 240 / 8 / 0 / 0 | — | — |
| 15 | 3090 | 160 / 25 / 24 / 0 | 320 / 50 / 48 / 0 | silver | — |
| 16 | 3360 | 130 / 4 / 0 / 0 | 260 / 8 / 0 / 0 | — | — |
| 17 | 3638 | 120 / 0 / 12 / 0 | 240 / 0 / 24 / 0 | — | — |
| 18 | 3924 | 0 / 5 / 18 / 0 | 0 / 10 / 36 / 0 | — | — |
| 19 | 4218 | 130 / 0 / 12 / 0 | 260 / 0 / 24 / 0 | — | — |
| 20 | 4520 | 450 / 45 / 48 / 0 | 900 / 90 / 96 / 0 | gold | — |
| 21 | 4830 | 0 / 5 / 18 / 0 | 0 / 10 / 36 / 0 | — | — |
| 22 | 5148 | 160 / 4 / 0 / 0 | 320 / 8 / 0 / 0 | — | — |
| 23 | 5474 | 150 / 0 / 12 / 0 | 300 / 0 / 24 / 0 | — | — |
| 24 | 5808 | 0 / 5 / 21 / 0 | 0 / 10 / 42 / 0 | — | — |
| 25 | 6150 | 200 / 35 / 30 / 0 | 400 / 70 / 60 / 0 | silver | — |
| 26 | 6500 | 180 / 4 / 0 / 0 | 360 / 8 / 0 / 0 | — | — |
| 27 | 6858 | 0 / 5 / 21 / 0 | 0 / 10 / 42 / 0 | — | — |
| 28 | 7224 | 190 / 4 / 0 / 0 | 380 / 8 / 0 / 0 | — | — |
| 29 | 7598 | 180 / 0 / 15 / 0 | 360 / 0 / 30 / 0 | — | — |
| 30 | 7980 | 550 / 55 / 57 / 0 | 1100 / 110 / 114 / 0 | gold | — |
| 31 | 8370 | 190 / 0 / 15 / 0 | 380 / 0 / 30 / 0 | — | — |
| 32 | 8768 | 210 / 4 / 0 / 0 | 420 / 8 / 0 / 0 | — | — |
| 33 | 9174 | 0 / 5 / 24 / 0 | 0 / 10 / 48 / 0 | — | — |
| 34 | 9588 | 220 / 4 / 0 / 0 | 440 / 8 / 0 / 0 | — | — |
| 35 | 10010 | 240 / 45 / 36 / 0 | 480 / 90 / 72 / 0 | silver | — |
| 36 | 10440 | 0 / 5 / 27 / 0 | 0 / 10 / 54 / 0 | — | — |
| 37 | 10878 | 220 / 0 / 18 / 0 | 440 / 0 / 36 / 0 | — | — |
| 38 | 11324 | 240 / 4 / 0 / 0 | 480 / 8 / 0 / 0 | — | — |
| 39 | 11778 | 0 / 5 / 27 / 0 | 0 / 10 / 54 / 0 | — | — |
| 40 | 12240 | 650 / 65 / 66 / 0 | 1300 / 130 / 132 / 0 | diamond | Kutup Işığı çerçeve + zemin, ücretsiz |

**40 kademe toplamı:** 5680 / 419 / 636 / 0 ücretsiz; 11360 / 838 / 1272 / 0 premium ek. Premium yeni dönem kozmetiğini ikinci kez vermez. Mevcut tekrar eden avatar/emoji/çerçeve alanları yeni dönem tahsisinden ayrı denetlenir; eski sahiplik silinmez, eski özel koleksiyon yeni sezon ödülü diye tekrarlanmaz.

## 4. Günlük görevler ve giriş takvimi

| Görev | Hedef | Sezon XP | Akı |
| --- | --- | --- | --- |
| complete_battles | 2 | 20 | 10 |
| deal_damage | 1000 | 25 | 15 |
| circuit_actions | 3 | 25 | 15 |
| win_battles | 1 | 25 | 15 |
| destroy_modules | 4 | 20 | 10 |
| core_power | 2 | 20 | 10 |

| Giriş günü | Kredi | Akı | Modül tabanı | Çekirdek parçası |
| --- | --- | --- | --- | --- |
| 1 | 38 | 3 | 4 | 0 |
| 2 | 41 | 4 | 5 | 0 |
| 3 | 44 | 5 | 6 | 0 |
| 4 | 47 | 2 | 7 | 0 |
| 5 | 50 | 3 | 3 | 0 |
| 6 | 53 | 4 | 4 | 0 |
| 7 | 155 | 11 | 21 | 0 |
| 8 | 59 | 2 | 6 | 0 |
| 9 | 62 | 3 | 7 | 0 |
| 10 | 65 | 4 | 3 | 0 |
| 11 | 68 | 5 | 4 | 0 |
| 12 | 71 | 2 | 5 | 0 |
| 13 | 74 | 3 | 6 | 0 |
| 14 | 190 | 12 | 28 | 10 |
| 15 | 80 | 5 | 3 | 0 |
| 16 | 83 | 2 | 4 | 0 |
| 17 | 86 | 3 | 5 | 0 |
| 18 | 89 | 4 | 6 | 0 |
| 19 | 92 | 5 | 7 | 0 |
| 20 | 95 | 2 | 3 | 0 |
| 21 | 225 | 13 | 35 | 0 |
| 22 | 101 | 4 | 5 | 0 |
| 23 | 104 | 5 | 6 | 0 |
| 24 | 107 | 2 | 7 | 0 |
| 25 | 110 | 3 | 3 | 0 |
| 26 | 113 | 4 | 4 | 0 |
| 27 | 116 | 5 | 5 | 0 |
| 28 | 260 | 14 | 42 | 15 |

Giriş toplamı: 2678 / 134 / 244 / 25. Yalnız bugünün giriş ödülü alınır; kaçırılan günler sonradan toplanmış sayılmadı. Çekirdek parçası doğrudan girişte desteklenir; Sabit posta kasasının `apply_fixed_contents` işlemi artık doğrulanmış core_type_id/core_shards içeriğini teslim eder. Bu teknik destek yeni çekirdek ödülü miktarı eklemez; yarışma bütçesine ek tutar yazılmadan girişteki 25 parça dışında yeni kaynak açılmaz.

## 5. Bir gün / 28 gün kaynak senaryoları

Bütün senaryolar sezonun ilk gününde başlar, rating sabit kalır, belirtilen galibiyet/mağlubiyet ve görev teslimleri her gün gerçekleşir; kaçırma yoktur. Bunlar gözlenen oyuncu davranışı değildir. Yeni: 1 galibiyet + 1 mağlubiyet, 3 görev ve 1 hediye/gün. Diğerleri 2+2 maç, 6 görev ve 2 hediye/gün. Görev hasar/imha/çekirdek hedefleri ayrıca sağlanmış varsayılır; dört maç bunu garanti etmez. Rastgele sandıklardaki para ortalama beklentidir; garanti oyuncu bakiyesi değildir.

| Senaryo | Gün | Sezon XP | Kademe | Kredi beklentisi | Akı beklentisi |
| --- | --- | --- | --- | --- | --- |
| new_free | 1 | 135 | 0 | 243.50 | 49.99 |
| new_free | 28 | 3780 | 17 | 9952.00 | 1564.72 |
| regular_free | 1 | 265 | 1 | 489.00 | 91.98 |
| regular_free | 28 | 7420 | 28 | 17166.00 | 2852.44 |
| season_pass_only | 1 | 265 | 1 | 569.00 | 91.98 |
| season_pass_only | 28 | 7420 | 28 | 23126.00 | 3306.44 |
| both_premiums | 1 | 331 | 2 | 795.00 | 103.98 |
| both_premiums | 28 | 9268 | 33 | 27804.00 | 3498.44 |
| unranked_ai | 1 | 199 | 1 | 246.00 | 84.00 |
| unranked_ai | 28 | 5572 | 23 | 9792.00 | 2576.00 |
| regular_arena_6 | 1 | 265 | 1 | 551.00 | 91.98 |
| regular_arena_6 | 28 | 7420 | 28 | 18902.00 | 2852.44 |

Reklam duyarlılığı: regular_free her gün bir kazanılmış maçın doğrulanmış reklamını da alırsa 28 günde 8540 XP / 31 kademe, 19066.00 Kredi / 2907.44 Akı. Reklam bir maçın ödenmiş kredi/XP tutarını bir kez daha verir; kupa/sandık/turnuva puanı vermez. Reklam erişimi/tamamlama garantisi yoktur; ana senaryolarda reklam sıfırdır.

Derecesiz AI kredi/XP’yi yarıya indirir (tek maçta yuvarlanır), galibiyet sandığı/haftalık puan vermez; Arena AI normal ilerlemeye ve haftalık sıralamaya katkı sağlayabilir. Yapay bot hesapları ve operatör hesabı yarışma katılımından hariçtir. Arkadaş/antrenman/yeniden eğitim ve takım turnuvası normal ilerlemeye sayılmaz. Takım turnuvasının kendi ödülü ayrı bütçedir. Devre Yolu/unvan/bağış gibi tek seferlik veya oyuncu kararına bağlı gelirler, alım/harcama ve sıralama kazanımı bu düzenli gelir tablosuna eklenmedi.

## 6. S1 haftaları — uygulanacak sabit paket önerisi

Miktarlar yayınlanmamış ilk sezon taslağında doğrulanır. Kredi/Akı mevcut haftalık ilk üç ödülünden korunur; ilk üç haftaya eklenecek sıradan modül parçaları mevcut 35/15/5. kademe tabanlarından 36/24/18 olarak alınır. Her modül Arena 1’de uygundur; seçim hakkı veya yeni kart yoktur. Tekil sabit paket kutusu içeriği taşır; rastgele mağaza sandığına ek açılış değildir.

| Dönem (bitiş hariç) | Tür | Sıra | Kredi | Akı | Sabit modül/parça | Yeni koleksiyon |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-30–2026-12-07 03.00 TR / 2026-W49 | resource_only | 1 | 1200 | 90 | laser / 36 | — |
| 2026-11-30–2026-12-07 03.00 TR / 2026-W49 | resource_only | 2 | 760 | 55 | laser / 24 | — |
| 2026-11-30–2026-12-07 03.00 TR / 2026-W49 | resource_only | 3 | 420 | 30 | laser / 18 | — |
| 2026-12-07–2026-12-14 03.00 TR / 2026-W50 | resource_only | 1 | 1200 | 90 | shield / 36 | — |
| 2026-12-07–2026-12-14 03.00 TR / 2026-W50 | resource_only | 2 | 760 | 55 | shield / 24 | — |
| 2026-12-07–2026-12-14 03.00 TR / 2026-W50 | resource_only | 3 | 420 | 30 | shield / 18 | — |
| 2026-12-14–2026-12-21 03.00 TR / 2026-W51 | resource_only | 1 | 1200 | 90 | pulse_cannon / 36 | — |
| 2026-12-14–2026-12-21 03.00 TR / 2026-W51 | resource_only | 2 | 760 | 55 | pulse_cannon / 24 | — |
| 2026-12-14–2026-12-21 03.00 TR / 2026-W51 | resource_only | 3 | 420 | 30 | pulse_cannon / 18 | — |
| 2026-12-21–2026-12-28 03.00 TR / 2026-W52 | cosmetic_set | 1 | 1200 | 90 | — / 0 | Derin Akım çerçeve + zemin |
| 2026-12-21–2026-12-28 03.00 TR / 2026-W52 | cosmetic_set | 2 | 760 | 55 | — / 0 | — |
| 2026-12-21–2026-12-28 03.00 TR / 2026-W52 | cosmetic_set | 3 | 420 | 30 | — / 0 | — |

**Ek parça tavanı:** bütün ilk üç ödülleri toplamında 234 sıradan parça/sezon; aynı oyuncu ilk üç haftayı kazanırsa en çok 108. Bu ek kaynak artışıdır; mevcut bütçenin içinde varmış gibi gösterilmedi. Katılma bedeli haftada 100 Kredi; dört kez katılan oyuncuda 400 Kredi çıkış. Varsayılan en az dört gerçek katılımcı eşiği ve owner/bot hariçliği korunur; yetersiz katılımla dağıtım yapılmaz. Her ödül oyuncu+kaynak+dönem+sıra ile bir kez teslim edilir.

## 7. Sezon sıralaması ve takım ayrımı

| Sıra | Sabit Kredi | Akı | Evrensel modül parçası | S1 koleksiyon |
| --- | --- | --- | --- | --- |
| 1 | 2400 | 180 | 12 | Güneş Ocağı çerçeve + zemin |
| 2 | 1800 | 130 | 9 | yeni dönem öğesi yok |
| 3 | 1400 | 100 | 7 | yeni dönem öğesi yok |
| 4 | 1000 | 75 | 5 | yeni dönem öğesi yok |
| 5 | 750 | 55 | 4 | yeni dönem öğesi yok |
| 6 | 620 | 45 | 4 | yeni dönem öğesi yok |
| 7 | 520 | 38 | 3 | yeni dönem öğesi yok |
| 8 | 430 | 32 | 3 | yeni dönem öğesi yok |
| 9 | 350 | 26 | 2 | yeni dönem öğesi yok |
| 10 | 280 | 20 | 2 | yeni dönem öğesi yok |

Sıralama tüm ilk 10 toplamı: 9550 Kredi / 701 Akı / 51 evrensel parça. Dört haftalık ilk üçlerin toplamı: 9520 Kredi / 700 Akı / 234 modül parçası. Bu tutarlar tek bir oyuncunun garantili geliri değildir; birden fazla hak sahibine dağılır.

Takım turnuvası kişisel S1 bütçesine dahil değildir; yeterli katılım ve hazır içerikle sezon ve haftalık turnuvayla aynı 30 Kasım 03.00 TR başlangıcına hazırlanır. Mevcut 1./2./3. ödül tutarları 1500/950/620 Kredi ve 110/70/45 Akı; takım kozmetiği bir takım hakkıdır. Kişisel üyelik/katılım dağıtım kuralı doğrulanmadan bunlar oyuncu başına veya bütün üyelerle çarpılarak raporlanmaz. Girişteki 25 çekirdek parçası dışında yeni sabit çekirdek paketi vaat edilmez.

## 8. Harcama baz çizgisi ve uygulama kabulü

| Enderlik | Modül Sv1→15 Kredi | İlgili modül parçası | Akı |
| --- | --- | --- | --- |
| common | 174800 | 5436 | 0 |
| rare | 262300 | 3626 | 0 |
| epic | 347700 | 818 | 0 |
| legendary | 393400 | 478 | 27500 |

Maliyetler kaynak eğrilerinin toplamıdır; oyuncunun bütün kaynaklarını tek karta ayırdığı veya rastgele parçaların o karta geldiği varsayılmaz. Yetenek yükseltme/sıfırlama, mağaza alımı ve takım katılımı ayrıca harcamadır. Bunlar net bakiye/ilerleme süresi simülasyonuna ECON-01’de girer.

- [ ] SEASON-00: bu tutarları, paket kimliği/revision ve premium kökeniyle gerçek teslim akışına bağla; önizleme/sandık etiketi tutarsızlığını gider.
- [ ] Kullanıcı kararıyla 12.240 XP eşiğini koru; SEASON-01 günlük/sezonluk emirleri ve reklam katkısını ayrı plan hesabıyla doğrula. Kaynak miktarı/eşik değişirse bu baz çizgisini yenile.
- [ ] Kaynak/kozmetik dönem türünü açık şema yap; eski koleksiyon fallback’ini kapat; 40. kademe, sezon 1.si ve son hafta 1.si dışında yeni dönem koleksiyonunu vaat etme.
- [ ] 234 ek sıradan parça tavanını kaynak bütçesi kapısında doğrula; farklı miktar kararı alınırsa rapor/profil/önizleme/teslim birlikte değişsin.
- [ ] Kapanış/geç dönüş/çift istek/restore ve bağımsız takım kapıları kanıtlansın. BASE-01 raporunun hazır olması SEASON-00 veya RELEASE-01 tamamlandı anlamına gelmez.
