# S1 — ödül kasaları, açılış ve XP emirleri

**4 Kasım 2026 kullanıcı yönlendirmesi.** 2.4.0 uygulama planıdır; günlük/sezonluk emirlerin ilk kod dilimi hazır. Kasa teslimi/açılışı ilk kod dilimindedir; yayın ve cihaz kabulü checklistte izlenir. Mevcut XP açığı bilinçli ilerleme hedefidir; 40. kademe eşiği korunur. [2.4.0 briefi](releases/2.4.0.md) · [Baz çizgisi](economy-baseline.md) · [XP tanımı](season-1-engagement-v1.json) · [Emir uygulaması/kabulü](release-240-mission-acceptance.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md)

## 1. Mevcut ödüller nasıl kullanılacak?

- Haftalık ilk üç, takım turnuvası hak sahipleri ve sezon lider panosu ilk 10 için hak anında sabitlenmiş ödül kasası oluşturulur. Kasa mevcut Kredi, Akı, uygun mevcut modül/çekirdek parçası ve o kaynağa ayrılmış kozmetikleri taşıyabilir. Her kasanın bütün türleri vermesi gerekmez.
- Her kasanın kimliği, kaynak/dönem/sıra, miktarlar, parça hedefleri, kozmetik kimlikleri ve içerik revision/hash’i hak anında sabitlenir. Açılışta mağaza sandığının rastgele içeriği eklenmez; aynı sandık görünümü bir ikinci ödül değildir.
- Mevcut sahiplik ve satın alınmış/kazanılmış haklar korunur. Döneme ayrılan aurora/solar/abyss oyuncu çiftleri başka kanala kopyalanmaz. Diğer sıralar kaynak/prestij alabilir; her ilk-10 kasasına yeni bir kozmetik vaat edilmez.
- Modül parçası için `module_definition_id/module_shards`; çekirdek için `core_type_id/core_shards` birlikte sabitlenir. **REWARD-06** ilk diliminde çekirdek teslimi ve tüm içeriğin mutasyondan önce doğrulanması kodlandı. Yayın profiline bağlama/kalıcılık kabulü devam eder. Çekirdek miktarı otomatik artırılmaz; ilk S1’de mevcut 25 giriş parçası bütçesi korunur. Yarışma kasalarına ek çekirdek miktarı konacaksa per-sıra/per-üye toplamı baz çizgisine ayrıca yazılmadan yayınlanmaz.
- Takım kozmetiği takıma, kişisel kaynak yalnız hak kazanmış üyelere gider. Takım profiline bir defa verilen öğe bütün üyelere ayrı takım ödülü diye çoğaltılmaz; üyelik/katkı ve kişi başı tavan kapanış anında sabitlenir. Takım açılışı ayrı katılım kapısını korur.

## 2. Topla ve açılış animasyonu — UI-08 / 2.4.0

Hedef akış: **Mesaj kutusu → Topla → aynı sandığı güvenli teslim al/aç → açılış animasyonu ve ses → gerçek makbuzdaki ödüller → devam.** Oyuncu ayrıca mağazada sandık aramak zorunda kalmaz.

1. Topla, sunucuda mesaj kimliğiyle aynı sandığı envantere alır; aynı istek ikinci sandık yaratmaz.
2. İstemci yalnız bu sandık kimliği için açma ister. İçerik sunucu makbuzuyla kesinleşir; görsel/animasyon ödül sonucunu belirlemez. Mevcut sandık açılış bileşeni yeniden kullanılır.
3. Kısa açılış, kasa türüne uygun ses ve Kredi/Akı/parça/kozmetik sonuç kartları gösterilir. Atla ve azaltılmış hareket hızlı sonucu açar. Ses kapalı tercihi korunur.
4. Topla sonrası bağlantı kesilirse sandık envanterde kalır; açılış sonrası yanıt kaybında aynı makbuz kurtarılır. Yeniden animasyon oynatılması ikinci teslim yapmaz.
5. Topla Tümü sunucuda seri/tekil işlemleri kullanır; kasalar sırayla gösterilir veya tek toplu özetle atlanır. Yanlış kasa kimliği, çift tıklama, hesap değiştirme, kapanış ve restart senaryoları test edilir. Gerçek TR/EN 320/393 px ve Android animasyon/ses kabulü alınır.

Önceki UI-03, 2.5 seçim kasası ve genel sonuç ekranı işiydi. S1 sıralama kasalarının Topla açılışı şimdi **ayrı zorunlu UI-08 / 2.4.0** işidir; seçim kasasını beklemez.

## 3. XP hedefi ve günlük emirler — SEASON-01

40. kademe **12240 XP** olarak kalır. Mevcut altı günlük emir 135 XP/75 Akı vermeye devam eder. İki yeni emir yalnız sezon XP’si verir; günlük parça/Kredi/Akı enflasyonu yaratmaz.

| Yeni günlük emir | Normal Arena savaşı | Ek XP |
| --- | --- | --- |
| Devreye Devam | 4 tamamla | 15 |
| Sonraki Hamle | 6 tamamla | 15 |

4 savaş eşiğinde ilk +15, 6 savaş eşiğinde ayrıca +15: toplam günlük tavan **165 görev XP**. Bunlar mevcut görevlerin üstüne eklenir. Yeni emirlerin hakları yalnız Arena AI/dereceli PvP bitmiş maç olaylarından ilerler; arkadaş/antrenman/yeniden eğitim/takım bacağı ve derecesiz AI bu yeni sayaçlara eklenmez. Mevcut altı emrin uygunluk davranışı değişmez.

## 4. Sezonluk Devre Emirleri

Görevler ekranında **Günlük / Sezonluk** sekmeleri; sezon kimliği, gerçek bitiş tarihi, ilerleme, alınabilir/alındı ve hak koruma durumu görünür. Günlük sayaçlar UTC’de yenilenir; sezonluk sayaçlar S1’in 28 günü boyunca birikir. Sonraki eşik önceki hedefe ek savaş istemez (20 → toplam 40 → toplam 80 → toplam 120).

| Hedef | Toplam eşik | Bir defalık XP |
| --- | --- | --- |
| Arena savaşı tamamla | 20 | 150 |
| Arena savaşı tamamla | 40 | 200 |
| Arena savaşı tamamla | 80 | 250 |
| Arena savaşı tamamla | 120 | 300 |
| Arena zaferi | 10 | 100 |
| Arena zaferi | 25 | 150 |
| Arena zaferi | 40 | 200 |
| Aktif savaş günü | 7 | 100 |
| Aktif savaş günü | 14 | 100 |
| Aktif savaş günü | 21 | 100 |
| Doğrulanmış çekirdek gücü kullanımı | 20 | 50 |
| Doğrulanmış çekirdek gücü kullanımı | 50 | 100 |

12 sezonluk emrin toplam tavanı **1800 XP**. Aktif gün sayılması için o UTC gününde en az bir uygun maç tamamlanır; yalnız giriş yapmak XP vermez. Çekirdek kullanımı buton tıklamasından değil motorun kabul ettiği olaydan sayılır. Kupa, sınıf kotası, yeni modül sahipliği veya ödeme şartı eklenmez.

## 5. Reklam ve çalışma yükü hesabı

Mevcut doğrulanmış maç sonrası reklam, o maçın kredi/XP ödülünü bir kez daha verir. Yeni reklam ürünü veya reklam izleme emri yoktur; aynı maç için ikinci reklam hakkı yaratılmaz. Maç yapılmadan reklam XP’si birikmez. Savaş Premium yalnız mevcut maç/reklam etkisini korur; yeni emir XP’sini çarpmaz. Aşağıdaki tüm hesaplar **ücretsiz oyuncu** içindir.

| 28 günlük senaryo | Maç/gün | Reklam/gün | XP | Kademe | İlk bitiriş günü |
| --- | --- | --- | --- | --- | --- |
| login_only | 0 | 0 | 0 | 0 | bitmez |
| two_battles_three_missions | 2 | 0 | 4830 | 21 | bitmez |
| four_battles_no_ads | 4 | 0 | 9340 | 33 | bitmez |
| four_battles_two_ads | 4 | 2 | 11160 | 37 | bitmez |
| six_battles_no_ads | 6 | 0 | 11880 | 39 | bitmez |
| six_battles_one_ad | 6 | 1 | 12790 | 40 | 27 |
| eight_battles_no_ads | 8 | 0 | 13700 | 40 | 25 |

Varsayımlar: her gün aynı maç sayısı, %50 zafer, belirtilen görevler tamamlanmış ve haklar alınmış; iki çekirdek kullanımı/gün. İki maç senaryosu yalnız mevcut üç emrin 70 XP’sini alır. Diğer savaş senaryoları mevcut altı emrin tamamını varsayar; maç sayısı hasar/imha hedeflerini kendiliğinden garanti etmez. Reklam XP’si eşit zafer/mağlubiyet karışımının beklentisidir; tek gerçek makbuz tam sayı tutarı verir. İlk bitiriş günleri bu varsayıma bağlıdır, oyuncuya garanti süre değildir.

Hedef: altı maç ve düzenli tek reklamla ay sonuna doğru tamamlamak; reklam almayan oyuncu daha fazla savaşla açığı kapatabilir. Dört maç/iki reklam veya yalnız giriş sezonu otomatik bitirmez. Bir günün bütün görevlerini kaçırmak telafi gerektirir; bitirme sözü verilmez. Daha kısa oyun süresinde reklamın XP katkısı anlamlı kalır.

## 6. Kalıcılık ve yayın kabulü

- Her ilerleme oyuncu+sezon+maç/olay ile tek kez; her emir ödülü oyuncu+sezon+[UTC gün]+görev kimliğiyle tek kez. Request_id değiştirmek hakkı yenilemez.
- Görev listesinin/revision’ın sezon ortasında değiştirilmesi birikmiş ilerlemeyi veya kazanılmış hakkı silmez. Gün/sezon sınırında maçın hangi döneme ait olduğu sunucu bitiş zamanı ve mevcut muhasebe sözleşmesiyle sabitlenir.
- Sezon kapanışında kazanılmış/alınmamış emir XP’si kapanan sezon yolunu doğru sırayla sonlandırır; XP yeni sezona taşmaz. Hedefi daha önce geçmişken görev ekranını açmamış oyuncunun hakkı kaybolmaz. Premium kökeni ve restore/çift talep kabulü korunur.
- CORE teslimi, UI-08 animasyonu ve SEASON-01 emirleri RELEASE-01 bağımlılığıdır. 23 Kasım/30 Kasım hedefleri şimdilik korunur; ek yük 6 Kasım kapasite kontrolüne girer. Kapsam kapanışına sığmıyorsa tarih yeniden karara bağlanır; yeni iş sessizce tamamlandı sayılmaz.

`python tools/plan_season_xp.py --write` bu belgeyi XP tanımı ve mevcut eşiklerden üretir; `--check` tutarlılığı denetler. Bu bir oyun motoru/oyuncu telemetrisi simülasyonu değildir.
