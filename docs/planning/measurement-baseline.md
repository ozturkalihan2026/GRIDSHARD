# BASE-02 — Ölçüm ve ilk deneyim planı

16 Kasım 2026 · hedef 2.5.0 · kaynak `codex/develop-2.5.0`

Bu belge tasarım teslimidir. Yeni olay, kohort raporu veya canlı veri toplama
açmaz. Gerçek uygulama sürümü 2.4.0 ve yayımlanmış S1 değişmez. Kaynak denetimi
yereldir; üretim oyuncu kayıtları okunmadı ve aşağıda gerçek oyuncu oranı yoktur.

## 1. Kaynakta doğrulanan davranış

| Konu | Mevcut davranış ve dayanak |
| --- | --- |
| Varsayılan izin | `server/app/player_settings.py`: kapalı. `analytics_enabled` yalnız kayıtlı `analytics_consent=true` ve `analytics_age_gate=adult` ile açılır. `main.py` sağlayıcısı kalıcı hesap ayarını okur; istemci kutusu yetki değildir. |
| Yaş | Açmak isteyene doğum yılı sorulur. Sunucu UTC takvim yılı farkıyla 18 eşiği uygular; tam doğum tarihi doğrulaması değildir. Doğum yılı saklanmaz; yalnız adult/minor sonucu ve sorulan yıl kalır. Minor yanıtı aynı yıl yeniden denenerek aşılamaz. Eski, yaş yanıtı olmayan izin yeterli değildir. |
| Kapatma ve silme | Ayar kapatılınca ham olaylar silinir. `ProductAnalyticsService.record` depolama kilidi içinde izni tekrar kontrol eder. `main.py` hesap silme ve `postgres_account_erasure.py` kalıcı hesap silme yolu aynı silme hizmetine bağlıdır. Silme başarısızlığı başarılı temizleme olarak bildirilmez. |
| Kendi verisine erişim | `/analytics/my-events` GET/DELETE Bearer kimliği ister; dışa aktarım hesabın kendi olaylarını içerir. Yalnız olay silme onayı kapatmaz: yeniden olay istemeyen oyuncu izin kutusunu da kapatır. |
| Veri minimizasyonu | `product_analytics.py` kapalı olay/alan/enum listesi kullanır. Subject, sunucu anahtarıyla HMAC türetilmiş takma kimliktir; anonim veri değildir. İsim, e-posta, sohbet, IP, cihaz kimliği, serbest metin ve modül/deste listesi bu şemada yoktur. |
| Saklama ve kapasite | Olaylar 30 günlük pencereye süzülür; okuma/yazma ve bakım temizliği vardır. Bakım döngüsü saatlik denetler; servis kesintisinde fiziksel silmenin duvar saati garantisi değildir. En çok 20.000 olay tutulur; yoğunlukta 30 günden önce kayıt kaybı mümkündür. |
| PostgreSQL | `postgres_product_analytics.py`, aynı hizmet sözleşmesini `product_analytics_document` satır kilidiyle uygular. JSON dosyası üretim PG kaynağının eşleniği sayılmaz. |
| Rapor bastırması | `aggregate_product_events`: tüm rapor için en az 5 ayrı subject; huni hücrelerinde en az 5 oyuncu; sonuç/FPS hücrelerinde de ayrı oyuncu eşiği. Mevcut D1/D7 bölümünde yalnız uygun payda >=5 denetlenir; küçük dönen grup ayrıca bastırılmaz. Bu eksik aşağıdaki yayın kapısına alınmıştır. |
| Oyun devamlılığı | Analitik isteği veya sonucu yazılamazsa oyun/ödül işlemi analitik için geri alınmaz. Analitik makbuzu ödül teslim kanıtı değildir. |

Denetlenen kaynaklar: `server/app/product_analytics.py`,
`server/app/postgres_product_analytics.py`, `server/app/player_settings.py`,
`server/app/main.py`, `server/app/postgres_account_erasure.py`,
`client/src/app.js`, `tools/product_analytics_report.py`.

## 2. Bugünkü raporun sınırı

- Var olan olaylar: `session_started`, `screen_view`, `matchmaking_started`,
  `matchmaking_matched`, `battle_completed`, `performance_sample`.
- Session, başarılı hesap yüklemesinde ve kapalı iznin açılmasında gönderilir.
  Dolayısıyla hesap oluşturma, kurulum veya uygulamanın ilk açılışı değildir.
- D1/D7, elde kalan olaylardaki en eski session gününü başlangıç sayar. Eski
  oyuncu, geç izin veren veya önceki verisi süresi dolan oyuncu yeniymiş gibi
  görünebilir. Mevcut çıktı **gözlenen oturuma dönüş** olarak adlandırılmalı;
  yeni oyuncu retention, D28 veya sürümler arası başarı kıyası sayılmamalıdır.
- Huni mevcut haliyle bağımsız olay türlerinin tekil oyuncu sayısıdır; sıralı
  geçiş, ilk maç, aynı oturum veya dönüşüm oranını kanıtlamaz.
- `battle_completed` sunucu kaynaklıdır; istemci gönderemez. Ancak mevcut mod
  eşlemeleri arena/team/friend/training içerir; yalnız insan PvP değildir.
  Eğitim/bot/sıralamalı ayrımı için gereken bağlam bu olaydan tam çıkmaz.
- Deste kaydı/değişimi, ilk strateji kararı ve günün hedefi olayı yoktur.
- `tools/product_analytics_report.py` yerel JSON okur; PG sorgulamaz. Dosyanın
  olmamasıyla üretilen boş rapor canlıda hiç oyuncu olmadığı anlamına gelmez.

## 3. D1 / D7 / D28 sözleşmesi

### Uygunluk ve başlangıç

Yeni oyuncu kohortu yalnız yeni ölçüm sözleşmesinin başlangıcından sonra
oluşturulan gerçek oyuncu hesabıdır. İlk deneyim başlamadan önce kayıtlı izin
ve adult kapısı sağlanmış olmalıdır. Onaysız/çocuk/yaşı belirsiz hesap, bot,
operatör ve test hesabı ürün kohortuna girmez. İzin vermek ödül, modül veya
oynama hakkının koşulu olamaz; izin oranını artırmaya yönelik ödül verilmez.

Gelecek `ANALYT-01` uygulaması, uygun hesabın ilk ölçülebilir başlangıcında
sunucu kaynaklı, tekrar üretilemeyen bir kohort başlangıç olayı yazmalıdır.
Başlangıç zamanı sunucu UTC zamanıdır. Kategori sınırlı enum olur:
`new_player`, `existing_player`, `late_opt_in`; bunların oranları karıştırılmaz.
Mevcut hesaba güncelleme gelmesi veya yeni telefondan giriş yeni kohort açmaz.
Yaş/doğum yılı, kayıt tarihi ve geçmiş onaysız davranış olaylara kopyalanmaz;
sunucu yalnız uygun kategoriyi hesaplar. Onaysız geçmiş geriye doldurulmaz.

İzin geri çekme veya kendi olaylarını silme bütün ham başlangıcı da kaldırır.
Yeniden izin verme eski kohortu diriltmez; hesap yeni oyuncu sayılamaz.
Başlangıcı silinmiş/süresi dolmuş hesap `existing_player`/`late_opt_in`
akışında kalır; aynı oyuncuyu yeni saymak için gizli kalıcı takip indeksi kurulmaz.

### Gün hesabı ve payda

Raporun kesim anı `R`, kohort UTC günü `C`, hedef gün `C+N` olsun.
`N` yalnız 1, 7 veya 28'dir. Oyuncunun hedef UTC gününde en az bir uygun
`session_started` olayı varsa **tam gün dönüşü** sayılır; N gün içinde herhangi
bir dönüş veya ardışık gün şartı değildir. Aynı gün çok cihaz/çok session bir
oyuncu sayılır. TR görünümünde saat açıklanabilir; hesap UTC kalır.

- Payda: aynı kohortta başlangıcı kalan, hedef günü tamamen bitmiş ve gözlem
  kapsamı eksiksiz uygun tekil oyuncular. `C+N` gününün sonu `R`'yi geçemez.
- Pay: bu paydadaki, hedef günde geri dönen tekil oyuncular.
- Oran: pay / payda; payda sıfırsa oran yoktur. Olgunlaşmamış kohort sıfır
  dönüş değildir; **henüz uygun değil** yazılır.
- Ham başlangıç ve hedef gün kayıtları 30 günlük pencere içinde kalmalıdır.
  Tam günlük kohort için `C` başlangıcı >= `R−30 gün` olmalıdır. D28 bu nedenle
  yalnız dar bir olgun kohort aralığında ölçülür; saklama süresi uzatılmaz.
- İki haftalık ilk değerlendirmede D28 sonucu üretilemez. D28'in olgunlaşması
  ayrıca beklenir; D7 veya yedi günlük seriden tahmin edilmez.
- Kapasite nedeniyle olay atılması, toplama kesintisi, şema değişimi veya
  eksik başlangıç varsa **ölçülemiyor/kapsam eksik** yazılır. Dönmeyen sayılmaz.
  Kesintiyi gizlemek için operasyon verisinden davranış geri doldurulmaz.
- İzni geri çeken/silen hesap paydanın da dışında kalır. Bu nedenle ölçüm,
  tüm oyuncuların retention'ı değil elde kalan onaylı örneklemin ölçümüdür;
  geçmiş yeniden hesaplama değişebilir. Silinmiş katkılar kalıcı raporlarla
  korunmaz; silinebilir kaynaklardan yeniden hesaplama esas alınır.

Kabul örneği (sentetik): C gününde başlayan 10 uygun hesapta hedef gün
bitmiş ve 6 hesap dönmüşse D7=6/10. Hedef gün sürüyorsa sonuç bekler;
1 hesap dönmüşse küçük grup kuralı nedeniyle sayılar/oran yayımlanmaz.

### Bastırma ve karar kalitesi

Her segment/kohort/gün için payda, dönen ve dönmeyen grup gizliliği birlikte
denetlenir. Boş veya 5'ten küçük alt grup varsa ilgili hücrenin payı, paydası
ve oranı birlikte bastırılır; toplam/diğer hücreden çıkarıma izin verilmez.
Huni adım kayıplarında da aynı tamamlayıcı bastırma uygulanır. Özel küçük
filtreler, oyuncu bazlı rapor veya subject dışa aktarımı eklenmez.

Beş oyuncu eşiği istatistiksel yeterlilik değildir. Onaylı yetişkin örneklemi
çocukları ve onaysız oyuncuları temsil etmez. `ANALYT-02` iki haftalık baz
çizgide örneklem/kapsam, payda ve belirsizliği belirtmeden artış iddiası veya
A/B kazananı açıklamaz. Başarı için uydurma hedef yüzdesi belirlenmez.

## 4. İlk maç → ilk deste değişimi hunisi

Bu akış **önerilen sözleşmedir**; aşağıdaki yeni olaylar bugün çalışmıyor.
BASE-03 ekran akışını, UI-01 bileşen/durumları kesinleştirdikten sonra
ANALYT-01 kapalı enum şemasını ve sunucu bağlarını uygular.

| Adım | Ölçülecek gerçek geçiş | Yetkili kaynak / ayrım |
| --- | --- | --- |
| 1 | Başlangıç ve ilk strateji kararının sunulması | Sunucu kohort başlangıcı + istemcinin görünür öğrenme adımı; açılmayan panel gösterilmiş sayılmaz. |
| 2 | Oyuncunun ilk strateji tercihini onaylaması | UI seçimi; seçilen modül/deck listesi gönderilmez. Sadece sınırlı adım/akış enum'u. |
| 3 | İlk eşleştirme talebinin kabulü ve savaşın başlaması | Sunucu kabulü; UI tıklaması ayrı yardımcı sinyaldir. Eğitim ve normal arena ayrı akış. |
| 4 | İlk savaşın kesinleşmesi | Sunucu tamamlanma olayı; eğitim/normal, insan/AI ve hükmen/normal tamamlanma sınırlı enum'larla ayrılır. Savaş ID'si olay boyutuna yazılmaz. |
| 5 | Savaş sonrası düzenleyicinin görünmesi | İstemci görünür adımı. Zorunlu değiştirme veya otomatik editör açılması gerekmez. |
| 6 | Önceki desteden farklı, geçerli ilk destenin kaydı | Yalnız sunucunun başarılı karşılaştırma/kayıt sonucu. Aynı deste, iptal, reddedilen veya tekrar istek sayılmaz; kart kimlikleri/hasar dizileri kaydedilmez. |
| 7 | Değiştirilmiş desteyle sonraki savaşın başlaması | Sunucu geçişi. Tamamlama ve yeniden giriş ayrı sonuçlardır; sırf düzenleyiciyi açmak başarı değildir. |
| 8 | Günün hedefinin görülmesi ve ilgili ödülün alınması | Görüntüleme istemciden, gerçek hak kazanma/teslim sunucudan; tıklama/animasyon teslim sayılmaz. |

Ölçüm birimi kohorttaki tekil oyuncudur. İlk uygun başlangıçtan sonraki
24 saatte sıralı geçen adımlar sayılır; en az 24 saat gözlenmemiş hesap o
raporun paydasına girmez. Eğitim kolu ile normal arena kolu ayrı tutulur;
eğitimi atlayan oyuncu eğitim başarısızlığı sayılmaz. Eğitim sonrası arena
ve deste değişimi ikinci bir sıralı alt huni olarak gösterilir. Adımlar sunucu
zamanıyla sıralanır; aynı zaman çözünürlüğündeki adımlar için sunucu geçiş
sırası gerekir. Mevcut bağımsız olay sayaçları birbirine bölünmez.

Yeni olaylar için yeniden denemede aynı request/transition kimliği kullanılır;
aynı kesinleşmiş savaş veya deste geçişi iki kez sayılmaz. Ödül para birimi,
fiyatı ve gerçek teslim makbuzu analitikten türetilmez. Analitik kaybı varsa
adım kapsamı eksik raporlanır; oyuncunun ödülü veya ilerlemesi etkilenmez.

Geri dönen oyuncu ayrı `existing_player` akışında sürüm özeti → isteğe bağlı
hatırlatma → bugünün hedefi → savaş ile ölçülür. İlerleme, ders durumu ve
kazanılmış haklar ölçüm için sıfırlanmaz; değişiklik okumamak cezalandırılmaz.

## 5. İş sırası ve kabul kapısı

| İş | Teslim / kabul |
| --- | --- |
| BASE-02 | Bu kaynak denetimi, kohort ve huni sözleşmesi. Planın hazır olması ölçümün canlı olduğu anlamına gelmez. |
| BASE-03 | İlk karar, eğitim/atlama, savaş sonrası düzenleme, geri dönüş ve günün hedefi ekran akışı. |
| UI-01 | Ortak sanat yönüyle görünür/boş/hata/çevrimdışı durumları ve olayların gerçek tetikleme noktaları. |
| ANALYT-01 | Onaylı kohort başlangıcı, sunucu destekli sıralı geçişler, idempotency, D28, tamamlayıcı küçük grup bastırması, saklama/kapasite kapsam sinyali ve PG kaynaklı güvenli toplu rapor yolu. Oyun bağlamı mevcut enum'lardan tahmin edilmez. |
| ANALYT-02 | Yayımdan sonra ilk iki haftalık onaylı örneklem baz çizgisi; D28 için ayrı olgunluk kontrolü. Önce kapsam/koruyucu göstergeler, sonra devam/düzelt/durdur kararı. |

ANALYT-01 kabulünde sentetik olaylarla şu durumlar zorunludur: onaysız/minor
hiç kayıt yok; izin çekme/silme ve eşzamanlı istek sonrası kayıt kalmaması;
UTC gün sınırı ve olgunlaşmamış D1/D7/D28; gerçek yeni/eski/geç izin ayrımı;
30 gün ve 20.000 kapasite kaybı; eksik/sırası bozuk/tekrar geçiş; eğitim/arena
ayrımı; küçük pay/payda/tamamlayıcı grup; PG/JSON eş davranış; raporda ham
subject olmaması; analitik arızasında savaş/ödülün başarıyla sürmesi.

Koruyucu göstergeler: analitik kabul/yazma hatası ve kapsam kesintisi,
eşleştirme/savaş akışı, performans kovaları ve ödül teslim tutarlılığı.
Operasyon güvenliği kayıtları oyun için kullanılabilir; onaysız oyuncunun
ürün yolculuğunu yeniden kurmak için analitikle birleştirilmez.

## 6. Bu teslimin yerel doğrulaması

- `python -m pytest server/tests/test_product_analytics.py server/tests/test_analytics_age_gate.py server/tests/test_postgres_product_analytics.py -q -p no:cacheprovider`: **19 PASS**.
- `node --test client/tests/analytics-age-gate.test.js`: **1 PASS**.
- PG adlı odaklı test sentetik bağlantı kullanır; bu tur gerçek PostgreSQL,
  üretim verisi, yeni AAB veya fiziksel cihaz kabulü yapılmadı.
- Mevcut testler yeni D28/sıralı huni uygulamasının kabulü sayılmaz; bunlar
  ANALYT-01'in açık işleridir. Kaynakta oyun davranışı değiştirilmedi.
