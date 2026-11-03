# GRIDSHARD — gelişim projesi teknik tasarımı

Tarih: **3 Kasım 2026**. Durum: uygulamaya hazırlık tasarımı.
[Kontrol listesi](GRIDSHARD_GELISIM_CHECKLIST_20261103.md) hangi parçanın
mevcut, dalda hazır veya yapılacak olduğunu izler.
Bu dosyadaki yeni servis/rotalar/tablo isimleri **öneridir**; kodda mevcut
oldukları veya canlıda çalıştıkları anlamına gelmez.

**Yayın ayrımı:** 2.3.0 mevcut 15 kozmetiğin kilitli katalog/önizleme paketidir;
dönem tahsisi ve başlangıcı açılmaz. Bu belgedeki tam stok, yeni modül,
birleşik takvim ve ödül açılışı 2.4.0; yeni mağaza/seçim kasası 2.5.0;
günlük deney 2.6.0 kapsamıdır. İki dönemlik üretim stoğu 2.3.0 önizlemesinin
önkoşulu değildir. Sonraki yayınlar gelişim planı §9 ve checklist'te tanımlıdır.

## 1. Mevcut sistemin sınırları

| Alan | Doğrulanmış kaynak | Kullanılacak temel / eksik |
| --- | --- | --- |
| Gerçek para ürünleri | `server/app/store_catalog.py`, `store_verification.py` | Sezon ve Savaş Premium, dörder Akı/kredi paketi; doğrulanmış makbuz akışı var. Yeni kozmetik IAP kataloğu yok. |
| Sandık | `server/app/meta_progression.py` | Dört aile, hediye, alım sınırı, oran önizlemesi, stok ve açma var. Seçim kasası ayrı bir yeni hak türü gerektirir. |
| Ödül teslimi | `server/app/reward_delivery.py` | Mesaj → stok → açma, sabit turnuva içeriği ve premium kökeni var. Yeni seçim/hak kapanışı bununla birleştirilecek. |
| Ekonomi | `postgres_economic_operations.py`, `premium_reward_recovery.py`, `store_refund_policy.py` | Kalıcı tekrar koruması ve iade sözleşmeleri var; yeni paralel cüzdan kurulmaz. |
| Dönem kozmetiği | `cosmetic_releases.py`, `cosmetic_releases_v1.json` | Dalda 15 kilitli öğe ve dört kaynak; canlı 2.2.1'e dahil değil. Yeni mağaza kaynağı henüz desteklenmiyor. |
| Dönem/yeni kart | `competition_cycle.py`, `competition_control.py`, `season_module_releases.py` | Takvim ve en az bir yeni modül/sezon politikası var; planlanan dört kartın çalışma kodu hazır sayılmaz. |
| Analiz | `product_analytics.py`, `tools/product_analytics_report.py` | Onaylı sınırlı olaylar ve rapor var. Yeni shop/reward/event olayları henüz şemada yok. |
| Sunum | `client/index.html`, `client/src/app.js`, `shop-rewards-v6.css`, `visual-polish-v9.css` | Mevcut boyalı tasarım ailesi ve ekranlar korunur. Yeni mantık mümkün oldukça ayrı modüllere çıkarılır. |

Mevcut sandık anlık görüntüsü (kaynak, canlı fiyat doğrulaması değildir):

| Aile | Alım bedeli | UTC günlük sınır | Modül düşüşü | Çekirdek düşüşü |
| --- | --- | --- | --- | --- |
| Bronz | 1.000 Devre Kredisi | 5 | %35 | %1; çıktığında 1 parça |
| Gümüş | 2.000 Devre Kredisi | 3 | %35 | %3; 2 parça |
| Altın | 500 Akı | 2 | %50 | %5; 3 parça |
| Elmas | 1.000 Akı | 1 | %53 | %10; 5 parça |

Kredi ve Akı mevcut tanımlarda garantilidir. Tablo para paketi TL fiyatı veya
yeni denge önerisi değildir. Kaynak kimliklerindeki `3h/8h/24h` metinleri gerçek
bekleme süresi değildir: `unlock_hours=0`; Bronz hediye yenilenmesi 8 saattir.
Yeni arayüz eski kimliklerden süre türetmemeli. İndirim/alım hakları korunur.

## 2. Hedef mimari

**İçerik kaynağı → inceleme/doğrulama → sürümlü yayın → oyuncuya uygun önizleme
→ sunucu işlemi → kalıcı hak/makbuz → mevcut cüzdan/envanter → istemci sonucu.**

- Statik içerik Git'te; oyuncu sahipliği ve harcama PostgreSQL'de kalır.
- Redis kalıcı ödül hakkının tek kaynağı olamaz.
- Önizleme ödül vermez; istemci miktar, fiyat, rastgele sonuç veya başarı belirlemez.
- Yeni mod kuralı sürümlenir; normal arenanın Akım/yerleşim/hedef öncelikleri değişmez.
- Hazır olmayan özellik kaynakta kapalı kalır; yayın listesi olmadan otomatik açılmaz.
- Yeni servisler mevcut profil işlemi ve ekonomik işlem kaydını çağırır.

## 3. İçerik sözleşmeleri — önerilen

### Teklif yayını

Önerilen `server/data/shop_offers_v1.json`:

| Alan | Sözleşme |
| --- | --- |
| `schema_version`, `release_id`, `content_hash` | Şema doğrulanır; yayınlanmış içerik değiştirilemez. |
| `offer_id`, `revision` | Görünen teklifin kalıcı kimliği; rotasyon sonradan eski alımı değiştirmez. |
| `starts_at`, `ends_at` | UTC, başlangıç dahil/bitiş hariç; sunucu saati belirleyici. |
| `audience` | Açık arena/katalog uygunluğu; kişisel harcama veya ürün analitiği onayı fiyatı etkilemez. |
| `price` | Ya mevcut oyun parası+miktar ya kayıtlı mağaza product_id. İstemciden bedel kabul edilmez. |
| `reward_ref` | Yayınlanmış ödül sürümü; yeni kartlar için aktif katalog/arena kapısı. |
| `purchase_limit`, `limit_period` | Hesap bazında, istek anahtarından bağımsız kalıcı limit. |
| `art_ref`, `localization_key` | Mevcut varlık/iki dilli metin; eksikse yayın reddedilir. |
| `availability_policy` | Sahip olunan tekil kozmetik satılamaz; yayın durdurma yeni satışları keser. |

Önerilen servisler: `shop_offers.py`, `shop_transactions.py`.
Önerilen `GET /shop/offers`, `POST /shop/offers/{offer_id}/purchase`.
Satın alma gövdesi yalnız `request_id`, `offer_revision` gibi kimlikleri taşır;
alınacak ödül sunucudan çözülür. Sürüm değişmişse ödeme yapılmadan
`OFFER_CHANGED` ile yeni önizleme istenir. Süre bitmişse `OFFER_EXPIRED`.

Yeni oyuncuya özel rotalar Bearer kimliği ve hak sahipliğini doğrular.
`server/app/main.py` korunan prefix listesi ile
`client/src/auth-session.js` native API yönlendirmesi birlikte güncellenir;
Android WebView'in bu yolları localhost'a göndermesi önlenir. İstemci kimliği
veya ödül sahibi URL/gövde alanından güvenilerek alınmaz.

Gerçek para yeni bir teklif akışına eklendiğinde mevcut mağaza makbuz doğrulaması,
hesap bağlama ve iade zinciri kullanılır. İçerik JSON'u tek başına IAP ürünü
oluşturmaz. Yerelleştirilmiş ücret Android Billing ürün bilgisinden gelir;
bilgi yoksa satın alma düğmesi açılmaz. İlk pilot oyun parasıyla garantili
teklif ve kozmetiktir; yeni gerçek para paketi sonraki kapıya bağlıdır.

### Ödül tanımı ve seçim hakkı

Önerilen `server/data/reward_definitions_v1.json`, `reward_choices.py`:

- Türler: `fixed`, `choice`, `random`. İlk pilot mevcut rastgele sandık oranlarını değiştirmez.
- Her tanım `reward_id`, `revision`, `source`, `contents/options`, `content_hash` taşır.
- Seçim hakkı doğarken uygun güncel kartlar, miktar ve seçenek kimlikleri sabitlenir.
- Önerilen `GET /rewards/choices`, `POST /rewards/choices/{entitlement_id}/claim`.
- Oyuncu yalnız `option_id` yollar. Hak sahibi ve uygun seçenek sunucuda doğrulanır.
- Aynı hak farklı request_id ile tekrar verilmez; aynı talebin tekrarı aynı seçimi döndürür.
- Başka seçeneğe tekrar talep `CHOICE_ALREADY_CLAIMED`; hak kaybolmadan bağlantı kurtarılır.
- Kullanılmamış seçenek oyun kataloğundan çıkarsa yeni rastgele seçim yapılmaz: sürümlü dönüşüm politikası veya inceleme kaydı gerekir.
- Kazanılmış seçim hakları yayın kapansa da korunur; yeni hak üretimi durdurulabilir.

Önerilen kalıcı kayıtlar: `reward_entitlements` (hak sahibi/kaynak/dönem/sabit
içerik/durum) ve `shop_offer_purchases` (oyuncu/teklif/dönem/hak/makbuz bağı).
Ekonomik teslim, mevcut `player_economic_operations` ile **aynı transaction**
içinde olur. Alan/indeks SQL'i uygulama sırasında mevcut şema ile kesinleştirilir;
bu aşamada migration numarası ayrılmaz ve uygulanmış SQL dosyaları düzenlenmez.

Önerilen eşsizlikler:

| Hak | Kalıcı eşsizlik |
| --- | --- |
| Dönem ödülü | oyuncu + kaynak + dönem + ödül düğümü |
| Seçim teslimi | entitlement_id; request_hash ayrıca mevcut işlem tablosunda |
| Limitli teklif | oyuncu + offer_id + limit dönemi + alım sıra numarası |
| Gerçek para | sağlayıcı + doğrulanmış işlem kimliği; mevcut sözleşme |
| Takım ödülü | takım + dönem + ödül kimliği; üyelik politikası hak anında sabit |

Limit kontrolü ve cüzdan düşümü atomiktir. İki eşzamanlı alımdan limit üstündeki
reddedilir. Ödeme sonrası başarısız istemci yanıtı ikinci kez ücret düşürmez.
Yeni önizleme sorguları geçmiş makbuzdaki bakiyeyi yeniden uygulamaz.

## 4. Sabit içerik ve rastgele sandık farkı

Mevcut turnuva kasası `fixed_reward` ile içeriği saklar. Sıradan sandık açılışı
ise mevcut `CHEST_DEFINITIONS` tablosunu açma anında okur; bütün sıradan
sandıkların tam içerik sürümünü önceden dondurduğunu varsayamayız.

İlk iş, yeni ürünlerin tanım/olasılık sürümünü hak anında sabitlemek ve eski
stoğun davranışını testle belgelemektir. Eski sandıkları yeni oranlara sessizce
taşımak veya kullanıcıya yeni garanti vaat etmek kapsam dışıdır. Eski içerik
tanımları makbuz/haklar sonuçlanana kadar saklanır.

İleride bir rastgele ürün eklenirse; kategoriler arası bağımsız düşüşler,
koşullu enderlik ve eşya bazında olasılıklar aynı kaynaktan hesaplanır.
`module_drop_chance × conditional_rarity × eligible_item_weight` gibi tam
zincir doğrulanır; “enderlik tablosu” tek başına her kartın olasılığı diye
gösterilmez. Tercih/seçim, havuz uygunluğu ve varsa tekrar dönüşümü açıkça görünür.

## 5. Dönem içeriği ve kapasite

Mevcut dört ödül kaynağı korunur. Mağaza için yeni `shop_collection`, yeni
modlar için ayrı kaynaklar tasarlanacak; `SOURCES` kapısı kod/test olmadan
JSON'a yeni ad yazılarak geçilemez. Mağazaya ayrılan görsel dönem ödülü stoğunu
tüketmez; aynı ID/tasarım başka döneme veya kanala yeniden ayrılmaz.

İki 28 günlük döngü için mevcut bütçe: altı oyuncu paketi + bir takım paketi
her döngüde. Toplam **24 oyuncu + 6 takım = 30 öğe** gerekir. Eldeki 15 öğe
6 oyuncu/9 takım olduğundan **18 yeni oyuncu öğesi** daha gerekir; üç takım
öğesi artar. Dört bağımsız mağaza kozmetiği açılacaksa bunlar ayrıca üretilir:
ilk hazırlık hedefi **18 + 4 = 22 yeni öğe**. Bu bir kapasite planıdır, sipariş
verilmiş veya çizilmiş sanat sayısı değildir.

Bu hesabın 18 öğelik kısmı 2.4.0 dönem açılışı, ayrı dört mağaza tasarımı
2.5.0 içindir. İlk kilitli önizleme yayını 2.3.0 hazır 15 öğeyi kullanır.

İlk mod takvimi mevcut ödül kaynaklarına ek yeni ödül isteyecekse bu 30 öğe
hesabı yeterli değildir. Her yeni kaynak için `coverage` girdisi ve stok
talebi genişletilir. Mevcut araç henüz genel bir etkinlik stok planlayıcısı değil.

Sezon başına en az bir yeni modül politikası ayrıca vardır. İlk iki dönem için
iki modülün çalışma kodu, çizimi, karşı oyunu, arena açılışı ve ücretsiz kazanımı
hazır olmalıdır. `echo_relay` ve `ember_launcher` mevcut manifestte yalnız
planlıdır. Kalite yetişmezse sezon başlangıcı yeniden planlanır; kart hazırmış
gibi gösterilmez veya mevcut politika sessizce kaldırılmaz.

### Genişletilecek içerik portföyü

| İçerik | İlk ürün fikri | Yeni altyapı / yayın sırası |
| --- | --- | --- |
| Oyuncu çerçevesi/zemin | İki dönem için dokuzar özgün tasarım; ör. manyetik köprü, bakır örgü, kırık halka gibi ayırt edilebilir yapılar | Mevcut sahiplik; yeni motif için renderer/şema genişler. R1. |
| Mağaza koleksiyonu | İki çerçeve+zemin seti, dönem ödüllerinden ayrı tasarımlar | Teklif/sahiplik/kanal tahsisi. R2. |
| Takım arması/çerçevesi/isim rengi | Mevcut üç temanın ilerideki dönemlere özel takım paketleri | İlk iki döngüde stok yeterli; üyelik/hak kuralı korunur. R1. |
| Seçim kasası | Üç uygun modülden birine garantili parça | Kalıcı seçim hakkı ve tek teslim. R2. |
| Ustalık unvanı/rozeti | Bir modülün mekanik hedefini tamamlayan oyuncuya kalıcı prestij | Yeni hedef sayacı, sahiplik ve profil vitrini. R3. |
| Sefer bölüm paketi | Üç farklı rakip dizisi, farklı koşul/karşı oyun ve ana ödül | Kayıtlı PvE koşusu, sefer içerik üretim araçları. R4. |
| Takım vitrini | Ortak hedefin tamamlanmasını gösteren dönem hatırası | Takım hakları ve tarihsel gösterim; yeni yarışmada eski ödül verilmez. R4. |
| Avatar/emoji | Savaş dışı kişilik ve koleksiyon teması | Boyalı sanat, küçük ekran okunabilirliği, sahiplik ve tema bütçesi. CARD-03 fizibilitesi. |
| Çekirdek dış görünümü | Mevcut çekirdeğin mekaniğini değiştirmeyen kaplama | Savaşta siluet/efekt eşdeğerliği, yükleme/perf ve tüm ekran bağları. İleri aşama. |
| Arena/zafer sunumu | Döneme özgü çevre veya kısa zafer imzası | Rakibin okunabilirliği, azaltılmış hareket ve ağ/performans bütçesi. İleri aşama. |

İlk sürümde bu kategorilerin hepsi açılmaz. Kart ve para ödülü çeşitliliği,
yeni isimli aynı sandıklarla artırılmış sayılmaz. Her yeni kategorinin anlamlı
oyuncu kullanım yeri, görünür kazanım yolu ve sürdürülebilir üretim yükü olmalı.

## 6. Ekonomi incelemesi

Mevcut fiyatlar ve oranlar bu proje belgesiyle değişmez. Önce üç senaryo çıkar:
yeni oyuncu, düzenli ücretsiz oyuncu, mevcut premium oyuncu. Her biri için
bir gün ve 28 günde savaş, görev, hediye, sezon, turnuva, reklam ve yeni
mod kaynak girişleri; seviye/mağaza kaynak çıkışları hesaplanır.

Önerilen `tools/simulate_liveops_economy.py`, sunucu tanımlarını kullanan
deterministik rapor üretir: seans varsayımı, yeni kartı ücretsiz açma süresi,
hedef altılı destenin gelişim süresi, biriken Akı/kredi ve ek teklif bütçesi.
Henüz mevcut değildir. Yeni ürün fiyatı ve kaynak miktarı bu rapordan sonra
ürün kararı olur; tahmini bir “%300 değer” etiketi üretilemez.

Koleksiyon kozmetiği savaş gücü vermez. Mevcut Savaş Premium'un +%50 kredi/XP
bonusunu yok sayarak oyunu kozmetik dışında tamamen eşit diye tanıtma.
Yeni modlarda seviye eşitleme/premium kaynak bütçesi ayrıca tanımlanır.

## 7. Ekran ve bileşen sözleşmeleri

| Ekran | Öncelik ve akış | Durumlar / kabul |
| --- | --- | --- |
| Ana ekran | Profil/kaynak → deste/çekirdek → SAVAŞ → bugünün hedefi → tek etkinlik | İlk görünümde tek ana eylem; varsa hak rozeti, boş etkinlikte doğru açıklama |
| Mağaza | Dört bölüm seçimi → ürün → önizleme → onay → makbuz | Hediye alınabilir/bekliyor, yetersiz kaynak, sahip olunan, stok/limit dolu, süre bitmiş |
| Ürün detayı | Büyük resim → garanti/olasılık → miktar/fiyat → limit/son tarih → al | Kaynak türü metinle açık; gerçek para/oyun parası birbirine benzeyen düğme değil |
| Sandık | Kaynak etiketi → kısa açılış → sonuç → gelişime katkı | Atla/azaltılmış hareket, toplu açmada özet; sonuç makbuzla aynı |
| Seçim kasası | Üç kart ve parça katkısı → seçili durum → onay → teslim | Çıkışta hak korunur; farklı cihazda sonuç aynı; seçimden önce harcama yok |
| Sezon/etkinlik | Ana ödül vitrini → ücretsiz/premium/katkı yolu → haklar | Kilit nedeni, tam koşul, gerçek bitiş; geçmiş sezon arşivi |
| Koleksiyon/profil | Tema → gerçek oyuncu/takım önizlemesi → kaynak → kuşan | Sahip olunan/kilitli/gelecek/tarihsel durumları; sadece renk ile ayrım yok |
| Maç sonrası | Sonuç → anlamlı tek neden → ödül → tekrar/deneme | Doğrulanmamış karşı taraf gizli verisi ifşa edilmez; satın alma penceresi otomatik açılmaz |

Önerilen ortak parçalar: `OfferCard`, `RewardPreview`, `SourceBadge`,
`EligibilityHint`, `CurrencyPrice`, `PeriodHeader`, `CosmeticPreview`,
`ClaimStatus`. İsimler sorumluluk tarifidir; yeni framework zorunluluğu değildir.
Client bağları önerisi: `client/src/shop/offer-view.js`,
`client/src/rewards/choice-view.js`, `client/src/liveops/event-view.js`.
Mevcut `app.js` ilk anda bütünüyle yeniden yazılmaz.

Dar ekranda dört mağaza bölümünü sıkışık tek satıra zorlamayız: prototipte
2×2 bölüm seçici ile kısa, yatay kaydırılabilir sekme karşılaştırılır. Seçili
bölüm ve dokunma hedefi her iki dilde belirgin olmalı; sayfanın tamamı yatay
taşmamalı. Kalıcı beşli alt dock'a yeni ikon eklenmez.

Görsel standart: mevcut onaylı dock/sandıklar korunur, büyük siluet ve tutarlı
ışık kullanılır. Her sanat paketi en fazla 10 benzersiz parça olarak
önizlenir; eski görsel planın kabul akışı uygulanır. Prototip/önizleme
hazırlamak için ek izin aranmaz; yeni sanatın oyuna bağlanmasında mevcut görsel
kabul kaydı izlenir. Her ekran 320×568 ve 393×852, TR/EN, uzun ad, düşük kaynak,
yükleniyor/boş/hata/çevrimdışı/yeniden deneme durumlarıyla incelenir.

Etkileşim hedefi en az 44 CSS px; fiyat ve ana metin dar ekranda kırpılmaz.
Hareket azaltma, ses tercihi ve klavye/odak sırası korunur. Savaş süsleri
kapalıyken de oyun anlaşılır kalır. Mevcut Chromium/WebKit kare bütçesi
eşikleri düşürülmez; yeni animasyon için önce cihaz/boyut bütçesi ölçülür.

## 8. Yeni mod omurgası

Önerilen `liveops_calendar.py`, `challenge_rules.py` ve
`server/data/liveops_calendar_v1.json`: içerik/kural/ödül sürümü, UTC pencere,
uygunluk, günlük tavan ve kapatma durumu. Önerilen
`GET /liveops/events`, `POST /liveops/events/{event_id}/start`.
Tek yaşam döngüsü `draft → reviewed → published → active → closed → archived`;
bir yayın kaydı hazırlanması operatör başlangıç ayarlarını açmaz.

Devre Deneyi: gün/tohum/kural/deste sabit; sonucu mevcut motor hesaplar.
Ödül `oyuncu + event_period + reward_node` ile bir kez; tekrar denemeler
öğrenme/skor verir. Gün değişse de başlamış maç kendi sürümünü tamamlar.
Sunucu hak kaydını kalıcılaştırmadan istemci “başarılı” sonucu teslim sayılmaz.

PvE Seferi: üç durak, kalıcı koşu kimliği, durak arası kayıt, bir kez ilk
tamamlama ve sınırlı tekrar ödülü. Takım Ortak Hedefi aynı anda dört oyuncu
istemeyen katkı modeliyle başlar; takım değiştirme ve son anda katılma politikası
hak anında kaydedilir. Draft ve BO3 için yeterli aktif rakip ölçülmeden kalıcı
kuyruk açılmaz. 2v2 için ayrı protokol/perf araştırması gerekir.

## 9. Analiz ve operasyon

Yeni `offer_view`, `offer_purchase`, `choice_claim`, `event_start`,
`event_complete`, `cosmetic_equip` adları bugün otomatik kabul edilmez.
Mevcut izinli olay şeması genişletilir. Bounded enum/katalog doğrulaması,
kişisel veri içermeyen alanlar, yaş/onay/silme/retention sözleşmesi korunur.
Ürün olayı kaybı ödül işlemini bozamaz; ödeme/ödül muhasebesi analitik değildir.

İlk değerlendirme: ücretsiz/premium ayrımı, arena, AI/insan ve yeni/geri dönen
oyuncu kohortları; D1/D7/D28 için uygun kohort ve rapor bastırma kuralları.
Onay vermeyen oyuncuları analitik için izlemeyiz; yalnız onaylı örneklemin
yanlılığını raporlarız. Beş kişilik rapor alt sınırı deney için yeterli örneklem
anlamına gelmez. Önce baz çizgi, sonra hipotez/karar kuralı; garanti gelir veya
devamlılık artışı vaat edilmez.

Yayın sırası: kaynak doğrulama → preview → test → içerik yayını → uygulama
minor sürümü/güncelleme mesajı → CI/AAB → veri koruyan sunucu geçişi → kontrollü
etkinleştirme. Yeni teklifleri kapatmak kazanılmış hakları geri almaz.
Yeni migration varsa boş hedefe restore/uyumluluk denenir; eski SQL baytları
değiştirilmez. Canlı DB'ye otomatik restore veya hesap sıfırlama yapılmaz.

Mevcut `cosmetic_releases.py` kapısı eksik pakette talep sırasında hata verebilir;
bu tek başına bütün etkinliği açılıştan önce durduran genel planlayıcı değildir.
Bu nedenle takvim açılışına bağlanan birleşik içerik/ödül/uygunluk kontrolü
ayrı uygulama işidir. Süreç yalnız operatörün `coverage` komutunu hatırlamasına
dayanmamalıdır.
