# 2.5.0 — ücretsiz ekonomi ilk karşılaştırması

> Planlama adayı; canlı ödüller ve oyuncu bakiyeleri değişmedi. Sandık paraları beklenen değerdir, garanti bakiye değildir.

[Tasarım ve üretim planı](release-250-design-and-production.md) · [Aday miktarlar](free-economy-250-v1.json) · [Makine raporu](free-economy-250-report.json) · [Deste/parça/çekirdek ve birlikte harcama](free-economy-250-progression-report.md)

Hesap mevcut altı emri, +4/+6 savaş XP emirlerini ve sezonluk XP hedeflerini birlikte okur. Reklam, yeni premium veya gerçek para geliri yok. Beş mevcut kaynağın para miktarı artar; XP ve 12.240 XP eşiği korunur. Her satırın emir/hediye/zafer varsayımı JSON’da açıktır; maç sayısı tek başına bütün emirleri garanti etmez.

## 28 günlük Akı / Devre Kredisi karşılaştırması

| Senaryo | Mevcut Akı | Aday Akı | Mevcut kredi | Aday kredi | Ek miktarın Akı / kredisi | Kademe (iki modelde aynı) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Yalnız giriş | 134.00 | 402.00 | 2678.00 | 5356.00 | 268 / 2678 | 0 |
| 2 savaş / 3 emir | 1614.72 | 2879.72 | 10532.00 | 19274.00 | 1265 / 8742 | 20 |
| 4 savaş / 6 emir | 2916.44 | 5179.44 | 18296.00 | 33072.00 | 2263 / 14776 | 33 |
| 6 savaş / 6 emir | 3091.16 | 5769.16 | 23290.00 | 40970.00 | 2678 / 17680 | 39 |
| 8 savaş / 6 emir | 3267.88 | 6010.88 | 28014.00 | 46988.00 | 2743 / 18974 | 40 |
| 4 mağlubiyet / 5 emir | 2209.00 | 4138.00 | 10362.00 | 22042.00 | 1929 / 11680 | 28 |
| Haftada 4 gün / 4 savaş | 1605.68 | 2839.68 | 9096.00 | 17012.00 | 1234 / 7916 | 22 |
| Arena 6 / 4 savaş | 2916.44 | 5179.44 | 20032.00 | 35704.00 | 2263 / 15672 | 33 |
| Sezon arası / 4 savaş | 2491.44 | 3555.44 | 11508.00 | 16156.00 | 1064 / 4648 | 0 |

Sezon arası satırında mevcut günlük emir Akısı sürer; sezon girişi/yolu ve sezon XP’si yoktur. Sezon arasında adayın yalnız günlük temel emir ve uygun maç artışları çalışır; kapalı sezonun giriş/yol/sezonluk emir ödülü verilmez. Haftada dört gün satırında kaçırılan giriş günü ödülleri sonradan eklenmez. Yalnız giriş kendi artırılmış ödülünü alır, görev veya savaş geliri kazanmaz. Ayrı günlük/haftalık destek bu adayla birikmez.

## Kaynak koddan okunan harcama yükü

| Bağımsız harcama örneği | Devre Kredisi | Akı |
| --- | ---: | ---: |
| Sıradan modül 1→5 | 1300 | 0 |
| Altı sıradan modül 1→8 | 40800 | 0 |
| Efsanevi modül 14→15 | 80000 | 10000 |
| Efsanevi ilk yetenek | 10000 | 1000 |
| Efsanevi modülün dört yeteneği | 100000 | 10000 |
| Efsanevi çekirdeğin üç yeteneği | 90000 | 9000 |
| Tek yetenek seçimini sıfırlama | 0 | 25 |
| Altın sandık | 0 | 500 |
| Elmas sandık | 0 | 1000 |

Parçalar, arena ve gereken modül seviyesi ayrıca sağlanmalıdır. Bir yükseltme, yetenek ve sandık aynı bakiyeyi tüketir; örnekler birbirinden bağımsız alternatiflerdir. Günlük gelir artışı yüksek seviye maliyetini ortadan kaldırmaz. Tam deste, gerçek parça dağılımı ve çekirdek harcaması bağlı birlikte-harcama raporunda aynı cüzdanla hesaplanır.

## Sınırlar ve tekrar üretim

- 1/7/28 gün kaynak dökümü, ara kontrol noktaları, ayrı harcama sonrası kalan bakiye ve hash’ler JSON içindedir.
- Mevcut S1 yayımlanmış katalogları, eski haklar ve kaynak maliyet tabloları değişmedi.
- Bu rapor para beklentisidir; bağlı ilerleme raporu gerçek sandık çözümleyicisiyle parça ve ortak cüzdan hesabını tamamlar. Gerçek oyuncu davranışı veya son savaş dengesi kabulü değildir.
- `python tools/simulate_liveops_economy.py --write` raporları üretir; `--check` kaynak kaymasını yakalar.
