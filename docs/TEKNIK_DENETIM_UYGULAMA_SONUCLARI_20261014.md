# Teknik denetim — uygulama ve kanıt kaydı

Tarih: 14 Ekim 2026. Başlangıç: `7f82db77fcc7a974ba60508d7a3c9536335f95f1`.
Durum: **Yerel kod ve otomatik kontroller hazır. Planın native/gerçek cihaz/canlı altyapı kapıları açık; yayın onayı değildir.**

Yetki: kullanıcı planın uygulanmasını ve yalnız yalıtılmış başsız tarayıcı testlerini istedi. Mevcut Chrome sekmesi/profili, canlı oyuncu hesabı, AWS/Cloud/Play ayarı kullanılmadı. Commit, push, deploy, imzalı APK/AAB veya gerçek satın alma yapılmadı.

## 1. Uygulanan paketler

| Alan | Yerel değişiklik / doğrulama |
| --- | --- |
| G1 | Capacitor Android/Core/iOS/CLI 8.5.1'e sabitlendi; kilit dosyası ve Android native bağımlılık yolları eşleştirildi. Native purchases 8.8.1 korundu. `pnpm audit --prod --audit-level high`: bilinen açık bulunmadı. Bu sorgu tüm uygulamanın güvenli olduğunu kanıtlamaz. |
| G2/G3 | Ağ/hata, sandık katalog adı ve kozmetik adları metin düğümleriyle yazılır. Simge şablonundaki ad izin listesi, ton güvenli token doğrulaması kullanır. Zararlı HTML, öznitelik enjeksiyonu ve prototype anahtarı regresyonları eklendi. Sabit SVG çizimleri kaldırılmadı. |
| T1/T2 | Normal Python modül alanları yanlış pozitif sayılmaz. 7 eski balance aracı etkin paketten tarihsel arşive taşındı; tam içerikleri ve yerlerine kullanılacak araçlar korundu. Aktif AST taraması 402 dosya / 0 sorun. Denetleyici CI'ye eklendi. |
| L1/L2 | Yerel AI kurulumunun hata/iptal yolları runner, istatistik ve oturumu geri alır. Yalnız sahibinin kapatabileceği idempotent yerel test oturumu DELETE yolu; istemcide reset/mod değişimi ve eski POST tamamlanması cleanup'ı. Dereceli maç bu yoldan silinemez. Arka plana geçmek teslim olma değildir. |
| L3 | Yerel snapshot da imha olayından eski durumu geri getirmez. Daha sonraki otoriter canlanma engellenmez. Gecikmiş tick, eski oturum, cursor ve yeniden bağlantı regresyonları korundu. |
| M2 | `sistem`/`enerji` aynı dağıtım kuralı kategorisidir; karma alias ile kopya/kategori/yardımcı denge sınırları istemci ve sunucuda test edildi. Wire şeması veya oyun dengesi göç ettirilmedi. |
| K1–K4 | Oyuncu/rakip aynı kalıcı kart güncelleyicisini kullanır. CAN, ısı, enerji, tooltip, rozet, ARIA, çekirdek hazır/hedefleme alanları yerinde güncellenir. Kart/SVG/FX overlay korunur; ikon yalnız gerçek artwork değişiminde yenilenir. Enkaz sayacı yerinde ve TR/EN güncellenir. |
| K1 etkileşim | Click, Enter ve Space mevcut instance kimliğiyle güncel `client.modules` nesnesini okur. Snapshot nesnesi değişince eski nesneye bağlı kalmaz. Force render kartı yeniden oluşturmaz; yeni hücre/savaş başka referans alır. |
| I1/I2 | Kaynağı Türkçe olan yeni DOM için ters çeviri regex yolu atlanır. Efekt düğümleri gözlemci taramasından çıkarıldı; görünür etiketler oluşturulurken ve dil değişiminde çevrilir. Dış İngilizce metnin açık `translateText` çağrısı korundu. |
| P1/P2 | Online/local snapshot'ın sunumu tek HUD geçişinde yapılır. Tamamlanmış eğitim normal oyuncuda context sorgusunu atlar; tekrar eğitim korunur. Değişmeyen Ev/modül/çekirdek koleksiyonu yeniden kurulmaz; içerik, filtre, deste, çekirdek ve dil değişimi cache'i yeniler. |
| P3/P4 | İmza efektleri bir rAF kuyruğunda önce çapa okumaları, sonra tek DOM ekleme yapar. Eski görsel nesil / gecikmiş efekt çizilmez. Günlük 200 kayıtta kalır; son 8 geçerli kaydı göstermek için tüm kayıtlar formatlanmaz. |
| S1 | Gizli olay önce elenir. Yalnız tamamı ilkel ve değişmez değer olan payload sığ kopyalanır; iç içe veya bilinmeyen nesneler derin kopya almaya devam eder. Kaynak veri, core özel alanları ve sonuç gizliliği testlidir. Event cursor/budama protokolü değiştirilmedi. |
| A1/L4 | Mevcut üç parçalı Android/Chrome menü listesi HTML ses ile akıtılıyor; üç decoded menü tamponu oluşturulmuyor. Web Audio fallback'te eski cache öğesi bırakılır, crossfade bitince kaynak ve timer/playback sahibi temizlenir. 20 ön/arka plan döngüsünde timer/sahip birikimi yok. Ses koduna gerekçesiz tampon silme veya yeni cue eklenmedi. |
| M1 | Ortak kart yolundan sonra çağrısız kalan 5 eski append helper'ı kaldırıldı. Koleksiyon/mağaza/görsel dil, CSS ve monolitler topluca yeniden yazılmadı. |

### Arşiv ve kaynak koruması

7 tarihsel araç `docs/archive/retired-balance-tools-20261014/` altında geri alınabilir; kullanıcı verisi silinmedi. Taşıma ve arşiv README'si testlidir. Eski araçları etkin sunucu paketine yeniden koymak eski import sorunlarını geri getirir.

Capacitor sync sonrası makine ayarı olmadan çalışan native hook'un değiştirdiği PGS/reklam ayarları başlangıç değerlerine geri alındı. Bu dosyaların son `git diff` içeriği boş; gerçek native kaynak farkı `android/capacitor.settings.gradle` içindeki 8.5.1 bağımlılık yollarıdır. Son mobil web varlıkları `cap copy android` ile yerel projeye kopyalandı. Kimlik, imza anahtarı, sürüm kodu, reklam modu veya canlı ücretlendirme seçimi değişmedi.

Yerel bağımlılıklar `.venv-technical-audit` içinde; sistem Python'u değişmedi. Test/derleme çıktıları ve geçici fixture'lar üretilmiş varlıklardır. `qa_reports/startup-desktop-chromium.png` ve `qa_reports/startup-android-chrome-emulated.png` otomatik başlangıç testleriyle yenilendi.

## 2. Son test sonuçları

| Kontrol | Sonuç / sınır |
| --- | --- |
| Sunucu + Python araçları | **1.596 geçti, 44 atlandı, 0 başarısız**. Son tam koşu 169,97 sn. 43 test yalıtılmış PostgreSQL adresi, 1 test gerçek Redis adresi bulunmadığı için atlandı. Bunlar CI'nin gerçek PostgreSQL/Redis işinde ayrıca koşmalıdır. |
| İstemci | **438 geçti, 2 atlandı, 0 başarısız** (440 test). İki atlama JDK ile native tanı/MainThread derleme fixture'larıdır. |
| Üretim web derleme sözleşmeleri | **9/9 geçti**. Hatalı CSS girdisi testinin beklenen hata çıktısı gerçek derleme başarısızlığı değildir. |
| Aktif Python import taraması | **402 dosya / 0 sorun**. |
| Kaynak release guard | **2.1.0-beta.72 doğrulandı**. Android native paket/yayın doğrulaması değildir. |
| Masaüstü başlangıç/gezinti/savaş yoğunluğu | **9/9 geçti**; daha sonraki menü/cache/olay tekrar kontrolü **4/4 geçti**. |
| İki bağımsız gerçek tarayıcı istemcisi | **3/3 geçti**: geri sayım, iki tarafta sonuç, reconnect/cursor ve rematch. Son kaynakta cache testiyle birlikte tekrar **4/4 geçti**. Fixture yerel ve insan eşleştirmesi açık, canlı oyuncu değildir. |
| Android Chrome ekran öykünmesi | **9/9 geçti**: başlangıç, eğitim, ayar, güvenli viewport ve dokunarak savaş yerleşimi. Gerçek Android WebView/telefon sayılmaz. |
| Koleksiyon cache'i gerçek DOM | Ayrı test **1/1**, son tekrar koşusunda da geçti. 20 içerikçe aynı meta nesnesi kart kimliğini korudu; modül, çekirdek, deste, dil değişince ilgili görünüm yenilendi. |
| CI gerçek DOM bileşen sözleşmeleri | Kart ve i18n `--assert-only` kontrolleri geçti; shallow Git checkout'ta tarihsel commit indirmeye gerek yok. |
| Son yerel paketler | Web build `c99f9e10aacab879`, mobil web `50e9aad1a68ab150`; Android web varlıklarına kopya başarılı. `dist/` son olarak mobil çıktıyı içerir; APK/AAB değildir. |

Son kaynak SHA-256 parmak izleri `qa_reports/technical-audit-source-20261014.json` içinde. PostgreSQL CI listesine mevcut runtime integration ve review-access PostgreSQL dosyaları da eklendi; uzak CI bu tur tetiklenmedi.

Tarayıcılar yeni, başsız, geçici profilli oturumlardı. E2E sunucusu `tools/e2e_server.py` üzerinden localhost 8879'da ayrı depolarla açıldı. Mevcut tarayıcı sekmelerine veya production hesaplarına erişilmedi. Çalışma sırasında sandbox atomik rename/hardlink izin sorunları için yalnız bu yalıtılmış testler yükseltilmiş izinle tekrarlandı; uygulama bu ortam sorununu gizlemek için değiştirilmedi.

Son cleanup kontrolü: localhost 8879'da dinleyici kalmadı; `qa_reports/e2e-server.pid.json` yok. Başsız tarayıcılar kendi `finally`/test teardown yollarıyla kapandı; kullanıcı tarayıcısı kapatılmadı.

İlk tam Python denemesinde Playwright'ın `test-results` temizliği aynı klasöre konmuş pytest fixture'larını sildi. Son iki tam koşu ayrı `.audit-runtime` alt klasörleri kullandı; son başarılı koşu yukarıdadır. Eski 314 fixture hatası ürün hatası/sonuç olarak sunulmaz.

## 3. Gerçek DOM kart bileşeni ölçümü

Ham kayıt: `qa_reports/technical-audit-card-20261014.json`.
Araç: `node tools/battle-card-benchmark.js`.
Windows / Node 24.19.0 / Chrome 155.0.8059.79. Her CPU oranında üç tekrar; sıra dönüşümlü. 14 kart, 100 CAN/ısı/rozet güncellemesi.

| Chrome CPU yavaşlatması | Eski hücreyi yeniden kurma, medyan script süresi | Kalıcı kart, medyan script süresi |
| --- | ---: | ---: |
| 1× | 60,2 ms | 15,5 ms |
| 2× | 146,3 ms | 36,0 ms |
| 4× | 396,3 ms | 85,0 ms |

Her koşuda eski yol başlangıç dahil **1.414 kart / 1.414 ikon mount**, yeni yol **14 kart / 14 mount**. Güncelleme aralığında eski yol 1.400 ekleme + 1.400 çıkarma; yeni yol **0 childList ekleme/çıkarma**, aynı kart ve SVG (`===`). Metin değerleri mevcut Text düğümünde değişir.

Karşılaştırma, başlangıç commit'indeki BoardView ile yeni BoardView'u **aynı yeni kart fabrikası** üzerinden çalıştırır; yeniden kurma/yerinde güncelleme farkını ayırır. Eski fabrikanın kaldırılan stats/meta üretiminin kazancını ölçmez. Minimal bileşen CSS'i vardır; tam savaş style/layout/paint/GC, ekran FPS'i veya Android hızı değildir. “Oyun 4 kat hızlandı” sonucu çıkarılamaz. Masaüstü CPU yavaşlatması belirli bir telefonu temsil etmez.

## 4. Çeviri gözlemcisi ölçümü

Ham kayıt: `qa_reports/technical-audit-i18n-20261014.json`.
Araç: `node tools/i18n-dom-check.js`.

100 yeni Türkçe UI metni/title ve 300 efekt parçacığı aynı gerçek DOM görevinde eklenir; gerçek MutationObserver çalışır. Yalnız testte `toTurkish` ve tree walker sayacı eklenir; üretim kaynağına sayaç girmez.

| İş | Başlangıç | Yeni |
| --- | ---: | ---: |
| `toTurkish` çağrısı | 700 | 0 |
| Efekt kökünde tree walker | 300 | 0 |
| Observer callback | 1 | 1 |
| Mutation kayıtları | 400 | 400 |

Observer ortadan kaldırılmadı; gereksiz çeviri/tarama işi kaldırıldı. TR→EN→TR metin/title geri yükleme, EN sırasında yeni Türkçe kaynak yazma, görünür efekt etiketinin dil değiştirmesi ve `translateText("Settings","tr")` kontrol edildi. Bu çalışma FPS veya tüm DOM sorgu sayısı değildir.

## 5. Sunucu olay kopyalama ölçümü

Ham kayıt: `qa_reports/technical-audit-event-20261014.json`.
Araç: `.venv-technical-audit/Scripts/python.exe tools/event_copy_benchmark.py`.
Python 3.12.10 / Windows; her sentetik payload türü için 30.000 çağrı, beş tekrar ve dönüşümlü sıra. Baseline metodunun AST'si aynı service üzerinde çalıştırılır; iki yolun sonuçları eşit, kaynak payload değişmez kalır.

| Payload | Eski medyan | Yeni medyan |
| --- | ---: | ---: |
| Yalnız ilkel değer | 104,44 ms | 29,87 ms |
| İç içe nesne | 169,44 ms | 198,19 ms |
| Diğer oyuncudan gizlenen olay | 263,03 ms | 3,50 ms |

İç içe payload biraz **daha pahalıdır**: güvenli fast-path kontrolünden sonra hâlâ deepcopy yapılır. Bu maliyet gizlilik/değişmezlik uğruna korunur; gerçek trafik dağılımı ölçülmeden toplam sunucu CPU yüzdesi iddia edilmez. Çok maç/uzun maç event belleği ve toplam requests/s bu araçla ölçülmedi.

## 6. Açık kapılar / sonraki adım

1. **Native derleme:** `Resolve-GridshardAndroidToolchain` JDK 21 yok hatası verdi; PATH'te Java 8 var, javac yok. Sistem kurulumu, yeni imza anahtarı veya imzalı AAB denenmedi. Kurulu JDK 21 + Android SDK 36 bulunan makinede mevcut anahtar/kimlikle derleme gerekir.
2. **Gerçek telefon:** yamalı native pakette PGS giriş/hesap devamlılığı, lisans test Billing satın alma–iade–yeniden alım, ön/arka plan, iki taraflı PvP/reconnect ve dokunma doğrulaması. Masaüstü fixture bunu kapatmaz.
3. **Tam maç performansı:** aynı otoriter kayıtla 1×/2×/4× tam savaş + orta/düşük Android WebView p50/p95/p99/max, jank, style/layout/paint/GC ve bellek/ısı. Önceki evdeki 174 sn kayıt bu bilgisayarda yok; yeniden ölçülmüş sayılmadı. P7 örnekleme dışı uzun görev ve otomatik kademe politikası bu kanıtla değerlendirilir.
4. **G4 canlı origin/proxy:** gerçek AWS güvenlik grubu/origin erişim zinciri ve Cloudflare başlığı güveni operatörün salt okunur canlı doğrulamasını gerektirir. Ayar değiştirilmedi.
5. **Kalıcı altyapı CI:** yalıtılmış PostgreSQL/Redis ve container smoke job'ları yeşil olmalı. Yerelde 44 atlamayı “geçti” sayma yok.
6. **S1 geniş yük / L4 hesap yaşam döngüsü:** uzun maç ve çok maçta event tutulumu; gerçek cihazda hesap kurtarma/reload/tekrarlı oturum davranışı. Cursor budama, yeni event base-cursor/resync protokolü ayrı ve kanıt gerektirir.
7. **Koşullu işler:** Canvas yalnız K1 sonrası gerçek bütçe hâlâ aşılıyorsa deneydir. Büyük CSS/monolit bölme, yeni VFX/cue/kozmetik bu paketin tamamlanmış işi değildir; ihtiyaç ve görsel kararla ayrı teslim edilir.

Yerel kapıların geçmesi canlıya çıkma izni değildir. Sonraki uygulanabilir aşama, JDK/SDK bulunan makinede native paketi derlemek ve telefonu doğrulamaktır; cihaz/canlı kanıtı olmadan plan “tamamen bitti” diye kapatılmaz.
