# GRIDSHARD 2.0 — YOL HARİTASI

**Güncel Sürüm:** `2.0.0-beta.32-fix.1`
**Paket:** Beta.32 Fix.1 — Sabit Port/Simgeler + Belirgin Güçlendiriciler
**Kanonik Dosya:** `docs/YOL_HARITASI.md`

> Bu dosya GRIDSHARD 2.0 için tek kanonik geliştirme kaydıdır. Kaynak karar belgesi ile kod tabanı yeniden karşılaştırılmıştır. Buradaki `[x]`, `[~]`, `[ ]` işaretleri artık yalnızca kodda ve testlerde doğrulanabilen gerçek durumu gösterir.

## Durum İşaretleri

- `[x]` Uygulandı ve otomatik test/kod kanıtı mevcut.
- `[~]` Altyapısı veya önemli bölümü uygulandı; gerçek kullanım, geniş ölçekli test ya da kalan alt parçalar var.
- `[ ]` Henüz uygulanmadı.

---

# 1. Değişmeyecek Tasarım Kararları

Aşağıdaki kararlar sabittir ve bundan sonraki geliştirmeler bunları bozamaz:

- [x] Savaş başladıktan sonra oyuncu müdahaleleri nedeniyle **hiçbir zaman durmayacak**.
- [x] Motor sunucu otoriteli, gerçek zamanlı ve `10 Hz / 100 ms` sabit tick tabanlıdır.
- [x] İstemci savaş gerçeğini belirlemez; yalnızca oyuncu niyetini/komutunu gönderir.
- [x] Modül yönetiminin temel yöntemi sürükle-bıraktır.
- [x] Ayrı `Satın Al / Sat / Değiştir / Onayla` savaş düğmeleri kullanılmaz.
- [x] Devre Kredisi ile enerji birbirinden ayrı sistemlerdir.
- [x] Modül müdahalesi ilk 15 saniye kilitlidir; savaş bu sırada akmaya devam eder.
- [x] 15. saniyeden sonra modül değişikliklerinde yapay cooldown yoktur.
- [x] Aktif modül kapasitesi zamanla `4 → 5 → 6 → 7 → 8 → 9 → 10` açılır.
- [x] Yasal dört modüllük başlangıçtan sonra 5. modül 15. saniyede, sonraki yuvalar 15 saniyelik aralıklarla açılır; aktif modülün başka bir rezerv modülle değiştirilmesinde yapay sınır yoktur.
- [x] Devreden çıkarılan modül Can değerini korur; diğer maç içi durumlar da savaş saatiyle korunacak şekilde modellenmiştir.
- [x] Sürüklenmekte olan aktif modül, bırakma komutu motor tarafından kabul edilene kadar savaşta kalır.
- [x] 24 global seçenekten 18 modüllük Savaş Havuzu kullanılır; maksimum 10 aktif modül vardır.
- [x] Çekirdek, Jeneratör, enerji akışı, port bağlantıları ve devre kurma GRIDSHARD kimliğinin temelidir.
- [x] Varsayılan oyun dili Türkçedir; Ayarlardan İngilizce seçildiğinde menüler, durumlar ve modül adları İngilizce karşılıklarına çevrilir.
- [x] Tek kanonik geliştirme kaydı bu dosyadır.

---

# 2. İlk Sürüm Kapsam Kilidi

## Şu anda geliştirilen ana alanlar

- [x] Oyna
- [x] Profil — temel gerekli alt veriler; kozmetik yok
- [x] İstatistikler
- [x] Ayarlar

## İlk sürümde geliştirilmeyecek alanlar

- [ ] Mağaza
- [ ] Kozmetik ekranları
- [ ] Sezon
- [ ] Battle Pass
- [ ] Görev merkezi
- [ ] Etkinlik ekranı
- [ ] Turnuva
- [ ] Klan
- [ ] Sosyal alanlar
- [ ] Arkadaş sistemi
- [ ] Diğer yan menüler

## Eğitim kararı

Beta.25 sonrası mobil hazırlık önceliği kapsamında eski erteleme kararı kaldırıldı:

- [x] Dengeli 18 modüllük yerleşik `Başlangıç Devresi` eklendi.
- [x] Hazır havuzu yükleten, sunucu otoriteli AI maçını başlatan ve dokun-seç/yerleştir kontrolünü anlatan üç adımlı eğitim eklendi.
- [x] Eğitim ilk çalıştırmada açılır, atlanabilir ve Ayarlar ekranından yeniden başlatılabilir.

---

# 3. Kaynak Yol Haritası ↔ Kod Tabanı Yeniden Denetimi

## FAZ 0 — Proje Temeli

- [x] Sunucu yapısı mevcut.
- [x] Savaş motoru paketi mevcut.
- [x] Python test altyapısı mevcut.
- [x] Web istemcisi mevcut.
- [x] `docs/YOL_HARITASI.md` tek kanonik dosya olarak kullanılıyor.
- [x] Beta.6 ile VS Code görevleri, Docker seçeneği ve tek komut QA zinciri eklendi.

**Durum:** Tamamlandı.

## FAZ 1 — Gerçek Zamanlı Savaş Motoru

- [x] `10 Hz` sabit tick / `100 ms` zaman adımı.
- [x] Komut kuyruğu.
- [x] Savaşın oyuncu işlemleriyle pause edilmemesi.
- [x] Sunucu otoriteli doğrulama.
- [x] Zaman, hücre, bağlantı, aktif kapasite ve Devre Kredisi doğrulamaları motor tarafında.

**Durum:** Tamamlandı.

## FAZ 2 — Dinamik Modül Sistemi

- [x] Modül ekleme.
- [x] Modül çıkarma/rezerve alma.
- [x] Modül değiştirme.
- [x] Modül taşıma.
- [x] Modül döndürme.
- [x] İşlem motor tick akışında uygulanıyor.

**Durum:** Motor tarafı tamamlandı; masaüstü ve mobil emülasyon tarayıcı matrisi sürüm bazında kanıtlanır.

## FAZ 3 — Modül Rafı ve Sürükle-Bırak

- [x] Savaş alanıyla aynı ekranda Modül Rafı yapısı var.
- [x] İlk 15 saniye kilit kuralı var.
- [x] Raftan sahaya sürükle-bırak komutu var.
- [x] Sahadan rafa alma var.
- [x] Hücreler arası taşıma var.
- [x] Modül üzerine bırakıp değiştirme komutu var.
- [x] Ayrı ekonomik onay düğmeleri yok.
- [x] 18 modülün Android Chrome ve iPhone Safari emülasyonunda raf kullanılabilirliği otomatik test ediliyor.
- [~] Fiziksel telefon UX kanıtı dış cihaz girdisi bekliyor.

**Durum:** İşlevsel altyapı tamam; kullanılabilirlik doğrulaması sürüyor.

## FAZ 4 — Zaman Bazlı Aktif Modül Kapasitesi

- [x] `0–15 sn`: başlangıç düzeni.
- [x] `0–15 sn`: yasal 4 modüllük başlangıç.
- [x] `15–30 sn`: en fazla 5.
- [x] `30–45 sn`: en fazla 6.
- [x] `45–60 sn`: en fazla 7.
- [x] `60–75 sn`: en fazla 8.
- [x] `75–90 sn`: en fazla 9.
- [x] `90 sn+`: en fazla 10.
- [x] Kapasite artışı modül koymayı zorunlu kılmıyor.

**Durum:** Tamamlandı.

## FAZ 5 — Modül Durum Kalıcılığı

- [x] Can kalıcılığı.
- [x] Isı durumu modeli.
- [x] Depolanmış enerji modeli.
- [x] Süreli zayıflatma/etkiler savaş saati üzerinden ilerliyor.
- [x] Bekleme süreleri savaş saatine bağlı.
- [x] Geçici güçlendirici etkileri modül rezervdeyken savaş saatiyle ilerliyor.

**Durum:** Temel kararlar uygulandı.

## FAZ 6 — Devre Kredisi Motoru

- [x] Enerjiden ayrı Devre Kredisi.
- [x] Başlangıç kredisi ve pasif gelir.
- [x] Gerçek zamanlı artış/azalış.
- [x] Modül maliyetleri.
- [x] Bırakma anındaki güncel krediyle doğrulama.
- [x] Yetersiz kredi işlemi reddediyor ve savaş devam ediyor.
- [~] Savaş performansı / modül yok etme / savunma başarısı gibi kredi gelirlerinin nihai denge kuralları henüz sabit değil.
- [ ] Snowball / comeback ekonomisi geniş simülasyonla doğrulanmadı.

**Durum:** Çekirdek ekonomi tamam; nihai denge gelir modeli bekliyor.

## FAZ 7 — Otomatik Modül İşlem Ekonomisi

- [x] Yerleştirme maliyeti motor tarafından uygulanıyor.
- [x] Çıkarma/rezerve alma kuralı motor tarafından uygulanıyor.
- [x] Değiştirme maliyeti motor tarafından uygulanıyor.
- [x] Taşıma maliyeti motor tarafından uygulanıyor.
- [x] Yeniden devreye alma maliyeti motor tarafından uygulanıyor.
- [x] Kullanıcı ekonomik işlem türü seçmiyor.

**Durum:** Tamamlandı.

## FAZ 8 — 24 Modüllük Ekosistem

Önceki `docs/YOL_HARITASI.md` bu fazı yanlışlıkla eksik gösteriyordu. Kod yeniden denetlendi:

- [x] Oyuncu seçimine açık **24 modül** tanımlı (`Çekirdek` hariç).
- [x] Enerji: Jeneratör, Batarya, Dağıtıcı, Kapasitör.
- [x] Saldırı: Lazer, Darbe Topu, Ray Topu, Füze Fırlatıcı, Dron Üssü, Ark Topu.
- [x] Savunma: Kalkan, Zırh, Yansıtıcı, Bariyer.
- [x] Destek: Onarım Modülü, Soğutucu, Güçlendirici, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı.
- [x] Sabotaj: EMP, Sinyal Bozucu, Virüs, Enerji Sömürücü, Kesici.
- [x] Can, maliyet, kategori, stratejik rol, port ve temel karşı/sinerji metadata'ları tanımlı.
- [~] 24 modülün tüm davranışlarının rekabetçi denge kalitesi geniş ölçekli simülasyonla henüz doğrulanmadı.

**Durum:** Katalog ve temel davranış ekosistemi tamam; meta dengesi bekliyor.

## FAZ 9 — 18 Modüllük Savaş Havuzu

- [x] `BATTLE_POOL_SIZE = 18` sunucuda uygulanmış durumda.
- [x] İstemci 24 seçilebilir modülden 18 seçim yapabiliyor.
- [x] Jeneratör zorunlu havuz elemanı olarak korunuyor.
- [x] `24 → 18 → maksimum 10 aktif` zinciri kodda mevcut.
- [~] Gerçek oyuncularla farklı havuz stratejilerinin denge testi bekliyor.

**Durum:** Sistem tamam; meta testi bekliyor.

## FAZ 10 — Yeni Stratejik Savaş Alanı

- [x] Merkez Çekirdek korunuyor.
- [x] 21 toplam hücreli, Çekirdek hariç **20 yerleştirilebilir konum** mevcut.
- [x] Dört Jeneratör kapısı tanımlı.
- [x] Maksimum aktif modül 10.
- [x] Büyük alan konumsal strateji için kullanılıyor.

**Durum:** Hedeflenen 18–24 hücre aralığı karşılandı.

## FAZ 11 — Özel Hücreler

- [x] 6 özel hücre mevcut: Saldırı, Savunma, Enerji, Soğutma, Onarım, Sinyal.
- [x] Bonus metadata/effect değerleri motor tarafında tanımlı.
- [~] Her özel hücrenin stratejik bedel/risk yarattığının denge testleri henüz tamamlanmadı.

**Durum:** Mekanik tamam; risk/ödül dengesi bekliyor.

## FAZ 12 — Geçici Güçlendiriciler

- [x] Aşırı Yük Çipi.
- [x] Acil Onarım.
- [x] Çift Port Adaptörü.
- [x] Oyuncu hedef modülü seçiyor.
- [x] Seçim savaşı durdurmuyor.
- [x] Küçük oyun içi seçim alanı kullanılıyor; tam ekran modal gerekmiyor.

**Durum:** İlk üçlü sistem uygulandı.

## FAZ 13 — 105+ Saniye Güçlendirici Döngüsü

- [x] İlk teklif `105.000 ms` — ilk 105 saniye temel devre mücadelesine ayrılır.
- [x] Sonraki teklifler `30.000 ms` aralıkla — sonraki teklifler 30 saniye ritmini korur.
- [x] 3 seçenekten 1 seçim.
- [x] Hedef modül seçimi.
- [x] Savaş saati seçim sırasında devam ediyor.

**Durum:** Tamamlandı.

## FAZ 14 — Yapay Zekâ ve Simülasyon

- [x] Otomatik savaş/simülasyon kod altyapısı mevcut.
- [x] Adaptif simülasyon ve AI komut üretimi mevcut.
- [ ] 10.000 maçlık resmi denge raporu henüz kanonik olarak çalıştırılıp kaydedilmedi.
- [ ] 50.000 maçlık resmi denge raporu henüz yok.
- [ ] 100.000+ maç benchmark'ı henüz yok.
- [~] Modül/kredi/maç süresi gibi metrikleri ölçme altyapısı parça parça mevcut; tek büyük denge raporu eksik.

**Durum:** Altyapı var; hedef ölçek doğrulanmadı. Önceki “M7 tamamlandı” işareti bu nedenle düzeltilmiştir.

## FAZ 15 — Savaş Okunabilirliği

- [x] Modül Can/enerji/durum bilgileri gösterilebiliyor.
- [x] Olay Günlüğü mevcut.
- [x] Özel hücreler görsel sınıflara sahip.
- [x] 10+10 aktif modül görünümü `1366×630`, `1366×768` ve `1920×1080` masaüstü viewportlarında kart/hücre ve sayfa taşması için otomatik test edilir.
- [~] 20 aktif modüllü uzun süreli fiziksel cihaz PvP karmaşa/performans soak testi tamamlanmadı.
- [x] Saldırı kaynak/hedef efektleri, hedef merkezine ulaşan silah profilleri ve her vuruşta ayrı çarpma geri bildirimiyle gerçek tarayıcıda doğrulandı.

**Durum:** Kısmi.

## FAZ 16 — Yapay Zekâ Rakipler

- [x] AI savaş komutu altyapısı var.
- [x] Tek oyunculu test için yerel AI akışı var.
- [ ] Saldırgan arketip ayrı ürünleşmiş AI olarak tamamlanmadı.
- [ ] Savunmacı arketip tamamlanmadı.
- [ ] Dengeli arketip tamamlanmadı.
- [ ] Sabotaj Odaklı arketip tamamlanmadı.
- [ ] Ekonomi Odaklı arketip tamamlanmadı.

**Durum:** Kısmi. Arketip sistemi yapılacak.

## FAZ 17 — Online PvP

- [x] Matchmaking endpoint'leri mevcut.
- [x] PvP oturum/gateway yapısı mevcut.
- [x] WebSocket bağlantı ve savaş durum protokolü mevcut.
- [x] Sunucu savaş zamanı, modül, Can, ekonomi ve sonuç için otorite sahibidir.
- [x] İki bağımsız Chromium bağlamıyla eşleştirme, WebSocket, hazır olma, savaş sonucu ve oyuncuya özel olay gizliliği E2E testi mevcut.
- [x] Aktif savaşta bağlantı kopması, `last_command_sequence` korunarak yeniden bağlanma ve savaşa devam etme E2E testi eklendi.
- [x] Biten maçtan sonra iki oyuncunun yeni ve temiz bir oturumda yeniden eşleştiği rematch E2E testi eklendi.
- [x] 50 ardışık bitmiş PvP oturumunun TTL temizliğiyle sızıntısız kaldırılması kabul kapısına bağlandı.
- [~] Uzun süreli fiziksel cihaz PvP soak testi henüz tamamlanmadı.

**Durum:** Teknik altyapı ve tarayıcı senaryoları tamam; fiziksel cihaz uzun soak kanıtı bekliyor.

## FAZ 18 — Eşleştirme

- [x] Temel derece/rating tabanlı eşleştirme mevcut.
- [x] Rating farkı ve kabul penceresi altyapısı mevcut.
- [~] Lig/performans/deneyim gibi ileri etkenler henüz gerekmiyor ve uygulanmadı.

**Durum:** İlk sürüm hedefi tamam.

## FAZ 19 — Profil

- [x] Temel oyuncu profili mevcut.
- [x] Görünen oyuncu adı ve ilerleme/savaş havuzu verileri destekleniyor.
- [x] Kozmetik alanı eklenmedi.
- [~] Gerçek kullanıcı UX ince ayarı devam ediyor.

## FAZ 20 — İstatistikler

- [x] Temel maç istatistikleri ve sunucu verisi mevcut.
- [x] Toplam maç, galibiyet oranı, ortalama süre, toplam hasar, modül değişimi ve güçlendirici kullanımı kartlarla sunulur.
- [x] En sık kullanılan sekiz modül kanonik simgesi ve kullanım sayısıyla gösterilir.
- [x] Boş veri durumu ve dar ekran düzeni desteklenir.

## FAZ 21 — Ayarlar

- [x] Ses.
- [x] Müzik.
- [x] Titreşim.
- [x] Grafik kalitesi.
- [x] Dil.

**Durum:** İlk sürüm hedefi tamam.

## FAZ 22 — Eğitim

- [x] Üç adımlı ilk maç eğitimi uygulandı.
- [x] Yerleşik 18 modüllük Başlangıç Devresi tek dokunuşla yükleniyor.
- [x] Eğitim tamamlanma durumu cihazda tutuluyor ve Ayarlar'dan yeniden başlatılabiliyor.

## FAZ 23 — Web Test Sürümü

- [x] FastAPI aynı origin üzerinden Web istemcisini servis ediyor.
- [x] Health / preflight / launch-readiness / operation monitoring altyapısı mevcut.
- [x] Telemetri ve test-run audit altyapısı mevcut.
- [x] Beta geri bildirim ve bulgu katmanları mevcut.
- [x] Tek oyunculu oynanabilir test modu mevcut.
- [x] Kimlik doğrulama, oyuncuya özel olay/snapshot gizliliği ve WebSocket token doğrulaması eklendi.
- [x] PostgreSQL + Redis üretim modu, oturum temizleme, rate limit ve komut backpressure eklendi.
- [x] Desktop Chromium, Android Chrome emülasyonu ve iPhone Safari emülasyonu CI matrisine eklendi.
- [x] Gerçek Android Chrome + iPhone Safari BrowserStack iş akışı ve kanıt şeması eklendi.
- [x] **Beta.5'te ana menüyü tamamen kilitleyen gerçek JS başlangıç hatası Beta.6'da düzeltildi:** `PORT_COUNT_BY_NAME`, tanımlanmadan önce kullanılıyordu.
- [x] İkinci başlangıç sırası riski düzeltildi: telemetri callback'i `telemetryStatus` tanımlanmadan tetiklenebiliyordu.
- [x] Beta.6 ile gerçek `app.js` başlangıç yürütme testi eklendi; dört ana menünün click-handler bağlanması otomatik kontrol ediliyor.
- [x] Tek komutla Python + JS + startup + gerçek Uvicorn HTTP smoke QA zinciri eklendi.
- [x] Beta.23–29 kullanıcı geri bildirimleri ve tarayıcı bulguları kaynak paketlerine işlendi.
- [~] Her yeni sürümün dış Windows/Chrome kanıtı ayrıca üretilip içe aktarılmalıdır.

**Durum:** Stabilizasyon sonrası gerçek test için yeniden hazır.

## FAZ 24 — Android ve iOS

- [x] Capacitor tabanlı mobil web paketleme altyapısı ve HTTPS backend runtime yapılandırması eklendi.
- [x] Android kapalı testten önce gerçek Android cihaz kanıtını zorunlu kılan yayın kapısı eklendi.
- [x] Android kapalı test kanıtı olmadan iOS/TestFlight kapısını açmayan sıra kilidi eklendi.
- [~] Gerçek mağaza yüklemeleri; kalıcı bundle id, üretim HTTPS adresi, imza anahtarları, mağaza hesapları ve tester grupları sağlandığında yapılacak.

---

# 4. Beta.5 Hatası — Kök Neden ve Düzeltme

Kullanıcı testinde ana sayfa HTML/CSS olarak açıldı ancak **Oyna, Profil, İstatistikler ve Ayarlar dahil hiçbir menü tepki vermedi**.

Kök neden kod seviyesinde doğrulandı:

1. `client/src/app.js` başlangıcında `moduleDefinitions.map(...)`, `PORT_COUNT_BY_NAME` sabiti oluşturulmadan önce ona erişiyordu.
2. JavaScript `const` Temporal Dead Zone nedeniyle uygulama `ReferenceError` ile daha ilk yüklemede duruyordu.
3. Menü event listener'ları dosyanın daha aşağısında olduğu için hiçbir click handler bağlanamıyordu.
4. Var olan testler çoğunlukla kaynak metni ve `relay-client.js` sınıflarını kontrol ediyor, **gerçek `app.js` başlangıç yürütmesini test etmiyordu**.
5. Ayrıca bazı client testleri yalnızca `client/` klasöründen çalıştırıldığında geçiyor; proje kökünden çalıştırıldığında göreli dosya yolları nedeniyle bozuluyordu.

Beta.6 düzeltmeleri:

- [x] `PORT_COUNT_BY_NAME` tanımı `moduleDefinitions` oluşturulmadan önceye taşındı.
- [x] Telemetri DOM referansı callback tetiklenmeden önce oluşturulacak sıraya taşındı.
- [x] `client/tests/app-startup.test.js` eklendi.
- [x] Startup testi gerçek `app.js` dosyasını VM ortamında yürütüyor ve dört menünün click handler'larını doğruluyor.
- [x] Profil menüsünün router seviyesinde gerçekten açıldığı otomatik test ediliyor.
- [x] Client test dosya yolları çalışma klasöründen bağımsız hale getirildi.

---

# 5. Geliştirme ve Test Ortamı — Beta.6

## Zorunlu günlük kalite kapısı

`TEST_ET.bat`

tek komutta:

1. tüm Python `pytest` testlerini,
2. `app.js` sözdizimi kontrolünü,
3. `relay-client.js` sözdizimi kontrolünü,
4. client birim/regresyon testlerini,
5. gerçek `app.js` startup + menü handler testini,
6. gerçek Uvicorn süreci üzerinden HTTP smoke testini

çalıştırır.

Detaylı makine-okunur rapor:

`qa_reports/latest.json`

olarak üretilir.

## Docker

- [x] Opsiyonel `Dockerfile` eklendi.
- [x] Opsiyonel `docker-compose.yml` eklendi.
- [x] Healthcheck eklendi.
- [x] Docker **zorunlu değil**; Windows'ta `.venv` ile geliştirme daha hızlı olabilir.

## VS Code

- [x] `.vscode/tasks.json`: Tam QA, sunucu, pytest, client test görevleri.
- [x] `.vscode/settings.json`: pytest ve Python analiz ayarları.

## Veritabanı Şema Geçişi

- [x] PostgreSQL üretim deposu ve JSONB oyuncu verisi kalıcılığı mevcut.
- [ ] Açık şema sürümü, ileri/geri geçiş ve yedekleme–geri yükleme prosedürü henüz ürünleştirilmedi.

**Karar:** Alembic araç olarak zorunlu değildir; üretim yayını öncesinde kullanılan PostgreSQL deposuna uygun, test edilen bir migration ve rollback mekanizması zorunludur.

---

# 6. Ana Kilometre Taşları — Gerçek Durum

### M1 — Kesintisiz Savaş
- [x] Tamamlandı.

### M2 — Dinamik Devre
- [x] Motor/istemci komut altyapısı tamamlandı.
- [x] Sürükle-bırak ve mobil seç–yerleştir akışları otomatik tarayıcı kapsamındadır.

### M3 — Devre Ekonomisi
- [x] Çekirdek ekonomi tamamlandı.
- [~] Nihai savaş-performansı gelir dengesi bekliyor.

### M4 — 24 Modüllük Meta
- [x] 24 seçilebilir modül kataloğu mevcut.
- [x] 18 Savaş Havuzu mevcut.
- [~] Karşı strateji/meta dengesi geniş simülasyon ve gerçek oyuncu testi bekliyor.

### M5 — Stratejik Savaş Alanı
- [x] 20 yerleştirilebilir konum.
- [x] Maksimum 10 aktif modül.
- [x] 6 özel hücre.
- [~] Risk/ödül dengesi gerçek test bekliyor.

### M6 — Güçlendirici Savaşı
- [x] 105 saniye ilk teklif + 30 saniye tekrar döngüsü.
- [x] 3 seçenekten 1 seçim.
- [x] Hedef modül.
- [x] Savaş durmadan uygulama.

### M7 — Rekabetçi Çekirdek
- [~] Simülasyon altyapısı var; 10k/50k/100k raporları eksik.
- [~] AI var; beş ayrı arketip eksik.
- [x] Online PvP iki istemci sonuç, reconnect ve rematch senaryolarına sahiptir.
- [~] Fiziksel cihaz ve uzun süreli dağıtık PvP soak kanıtı eksiktir.

**M7 henüz “stabil/tamamlandı” kabul edilmeyecek.**

### M8 — GRIDSHARD 2.0 Beta
- [x] Oyna.
- [x] Profil.
- [x] İstatistikler.
- [x] Ayarlar.
- [x] Telemetri/Web test altyapısı.
- [x] Kısa etkileşimli ilk maç eğitimi ve yerleşik başlangıç havuzu.
- [~] Otomatik Web matrisi sürüm bazında çalıştırılır; fiziksel cihaz ve gerçek kullanıcı kanıtı ayrıca toplanır.

---

# 7. Tamamlanan Son Paket

## 2.0.0-beta.23 — Stabilizasyon + Kanonik Yol Haritası Denetimi + QA Zinciri

- [x] Kaynak `Yol Haritası.txt`, mevcut kanonik yol haritası ve kod yeniden karşılaştırıldı.
- [x] Eski yol haritasındaki 24 modül, 18 Savaş Havuzu, stratejik alan, güçlendirici ve PvP durumlarına ait eski/yanlış işaretlemeler gerçek koda göre düzeltildi.
- [x] Beta.5 ana menü kilitlenmesinin kök nedeni bulundu ve düzeltildi.
- [x] İkinci startup sırası/telemetri TDZ riski düzeltildi.
- [x] Gerçek `app.js` başlangıç testi eklendi.
- [x] Menü handler bağlama regresyon testi eklendi.
- [x] Client testleri proje kökünden de çalışacak hale getirildi.
- [x] Tek komut tam QA zinciri eklendi.
- [x] JSON QA raporu eklendi.
- [x] Opsiyonel Docker/Compose ortamı eklendi.
- [x] VS Code test/çalıştırma görevleri eklendi.
- [x] Alembic'in neden henüz gerekli olmadığı belgelenmiş durumda.

---

# 8. Yapılacaklar — Öncelik Sırası

## P0 — Beta.30 Sürüm Kanıtı

- [x] Tek-komut kaynak, sunucu, istemci, ses ve HTTP smoke kalite kapısı korunur.
- [x] PvP reconnect, temiz rematch ve 50 oturumluk yaşam döngüsü testleri eklenir.
- [x] Gelişmiş İstatistikler ekranı sunucu verileriyle doğrulanır.
- [x] 10+10 aktif modül masaüstü viewport kapısı eklenir.
- [x] Beta.30 gerçek Chrome/WebKit Playwright matrisi yerelde `8/8` geçti: masaüstü `4/4`, Android Chrome `2/2`, iPhone Safari/WebKit `2/2`.

## P1 — Gerçek Tarayıcı E2E

- [x] Yerel geliştirme makinesinde Playwright/Chromium E2E kuruldu.
- [x] Ana Menü → Oyna / Profil / İstatistikler / Ayarlar ve geri dönüş otomatik navigasyon testi tamamlandı.
- [x] Tek Oyunculu Test Maçı ve dokun-seç/yerleştir testi eklendi.
- [x] Tarayıcı `pageerror` çıktıları test başarısızlığı sayılıyor.

> Masaüstü Chromium navigasyon senaryosu Playwright projesine ve gerçek tarayıcı doğrulamasına bağlandı. Mobil emülasyon ve çift istemci PvP testleri ayrı projelerde korunur.

## P2 — Online PvP Gerçek Çift İstemci Testi

- [x] İki bağımsız tarayıcı bağlamı/iki oyuncu eşleştirme testi.
- [x] Aynı savaş durumunun iki istemcide senkronizasyon ve sonuç testi.
- [x] Yeniden bağlanma testi.
- [x] Maç sonucu ve temiz rematch testi.

## P3 — Rekabetçi Denge

- [ ] 10.000 otomatik maç raporu.
- [ ] 50.000 otomatik maç raporu.
- [ ] Gerekirse 100.000+ benchmark.
- [ ] Modül seçim/kazanma oranları.
- [ ] Devre Kredisi ve comeback/snowball analizi.
- [ ] Özel hücre kullanım oranları.
- [ ] Güçlendirici tercihleri.

## P4 — AI Arketipleri

- [ ] Saldırgan.
- [ ] Savunmacı.
- [ ] Dengeli.
- [ ] Sabotaj Odaklı.
- [ ] Ekonomi Odaklı.

## P5 — Savaş Okunabilirliği

- [x] 20 aktif modüllü PvP ekranının üç masaüstü viewportunda taşma testi.
- [~] 20 aktif modüllü uzun fiziksel cihaz PvP performans/karmaşa soak testi.
- [x] Enerji alan ve enerjisiz modüller canlı akış / `ENERJİ YOK` ayrımıyla görünür; hasar ve güçlendirme durumları mevcut kart katmanlarında korunur.
- [x] Saldırı kaynağı, hedefe kadar ilerleyen atış ve hedef merkezindeki çarpma geri bildirimi ayrı okunur.
- [x] Android Chrome ve iPhone Safari emülasyonunda dar ekran/telefon Modül Rafı testi.
- [~] Fiziksel Android/iPhone raf testi dış cihaz kanıtı bekliyor.

## Daha Sonra

- [x] Eğitim ve başlangıç havuzu uygulandı.
- [~] Android kapalı test altyapısı hazır; hesap, imzalı AAB, gerçek cihaz kanıtı ve tester grubu bekliyor.
- [~] iOS/TestFlight altyapısı hazır; Android kapalı test kanıtı ve Apple imzalama ortamı bekliyor.

---

# 7.1 — 2.0.0-beta.23 Gerçek Kullanıcı Test Bulguları ve Düzeltmeleri

Bu paket Beta.6'nın gerçek Windows/PowerShell ve tarayıcı testi sonucunda oluşturuldu; varsayımsal UX çalışması değildir.

## Doğrulanan kullanıcı test bulguları

- [x] Ana sistem açıldı.
- [x] Oyna, Profil, İstatistikler ve Ayarlar ekranları açıldı.
- [x] Savaş Havuzu seçimi çalıştı.
- [x] Online eşleştirme rakip olmadığı durumda doğru biçimde bekledi.
- [x] Tek oyunculu testte yaklaşık 20 kullanılabilir hücreli savaş alanı görüntülendi.
- [x] Jeneratör başlangıçta otomatik yerleştirildi.
- [!] Jeneratör istemci yerel testinde sürüklenebiliyor/taşınabiliyordu; sabit başlangıç modülü kuralıyla çelişiyordu.
- [!] Ayarlar PUT isteği sunucuda 200 dönmesine rağmen kullanıcıya görünür kaydetme sonucu/dil değişimi yansımıyordu.
- [!] Windows üzerinde eşzamanlı operation/stability telemetri snapshot yazımları `.tmp/.bak.tmp` yarışına girerek WinError 5/32 ve HTTP 500 oluşturuyordu.
- [!] Savaş Havuzu seçim ekranı stratejik karar vermek için yetersizdi; modül ayrıntısı ve seçilmiş havuz ayrımı yoktu.
- [!] Tek oyunculu mod havuz oluşturma aşamasını atlayarak doğrudan yerel maça giriyordu; Online ve Yerel akış birbirinden gereksiz ayrışıyordu.

## Tamamlanan Beta.7 düzeltmeleri

- [x] Savaş Havuzu ekranı üç sütunlu oluşturucuya dönüştürüldü: kaydırılabilir Global Modül listesi → modül ayrıntısı → seçilen 18 modüllük havuz.
- [x] Modül listesinde bir öğeye tıklamak artık doğrudan seçmek yerine ayrıntı panelini açıyor.
- [x] Ayrıntı panelinde sınıf, Can, Devre Kredisi maliyeti, port sayısı, stratejik rol ve açıklama gösteriliyor.
- [x] Ayrıntı panelinin altında `Seç / Havuzdan Çıkar` işlemi bulunuyor.
- [x] Jeneratör zorunlu olarak seçili ve havuzdan çıkarılamıyor.
- [x] Sağ panelde seçilmiş Savaş Havuzu ayrı ve okunabilir biçimde gösteriliyor.
- [x] 18 modül tamamlanmadan Eşleştir düğmesi etkinleşmiyor.
- [x] Tek Oyunculu Test Maçı da önce aynı 18 modüllük Savaş Havuzu oluşturucusunu kullanıyor.
- [x] Tek oyunculu havuz tamamlanınca `AI ile Eşleştir ve Savaşa Başla` düğmesi yerel AI savaşına doğrudan geçiyor; gerçek oyuncu beklemiyor.
- [x] Online PvP'de aynı havuz oluşturucu `Eşleştir` ile gerçek matchmaking kuyruğuna giriyor.
- [x] Yerel savaşın Modül Rafı yalnızca seçilen 18 Savaş Havuzu modülünü gösteriyor.
- [x] Çekirdek ve Jeneratör istemcide sabit modül olarak işaretlendi.
- [x] Jeneratör drag işlemi istemcide reddediliyor; sunucudaki taşınamaz/çıkarılamaz kuralıyla istemci davranışı eşitlendi.
- [x] Ayarlar ekranına kaydetme durumu eklendi.
- [x] Dil kaydı başarıyla döndüğünde `document.lang` ve temel menü/ayar başlıkları anında güncelleniyor.
- [x] Modül adları sabit tasarım kararı gereği Türkçe kalmaya devam ediyor.
- [x] Kalıcı telemetri yazımı süreç içi kilit (`RLock`) ile seri hale getirildi.
- [x] Telemetri geçici dosyaları PID + thread kimliği ile benzersiz hale getirildi.
- [x] Windows WinError 5/32 için kısa süreli atomik replace retry mekanizması eklendi.
- [x] Telemetri servisindeki event listesi eşzamanlı record çağrılarına karşı kilitlendi.
- [x] 80 eşzamanlı kalıcı telemetri kaydı regresyon testi eklendi.
- [x] `TEST_ET` QA smoke zinciri çalışan Uvicorn üzerinde 24 eşzamanlı operation/stability audit POST isteği yapacak şekilde güçlendirildi.

---

# 7.2 — 2.0.0-beta.23 Yerel AI Oynanış Doğrulama Paketi

Beta.8'de denge değerleri varsayımla değiştirilmedi. Amaç Beta.7'nin kullanıcıya açtığı oynanış zincirini otomatik testte daha ileri taşımak ve gerçek savaş ekranını okunabilir hale getirmektir.

## Tamamlananlar

- [x] QA startup testi artık yalnız menü açılmasını değil `Oyna → Tek Oyunculu → 18 modüllük Savaş Havuzu → AI ile Eşleştir → yerel savaş` zincirini gerçek `app.js` üzerinde doğruluyor.
- [x] 18 modül tamamlanmadan savaş başlatılamadığı otomatik testle korunuyor.
- [x] Yerel AI savaşına geçildiğinde `localStatus=battle` oluşması test ediliyor.
- [x] Oyna ekranı Online PvP operasyon kapısı hazır olmasa bile Tek Oyunculu Test Maçı için erişilebilir; Online PvP kendi girişinde readiness kontrolüyle korunuyor.
- [x] Savaş alanına Çekirdek / Kapı / normal hücre açıklamaları eklendi.
- [x] Özel hücrelerin mevcut bonus etiketleri korunuyor.
- [x] Modül kartındaki uzun tek satır bilgi yığını HP / DK / Enerji rozetlerine ayrıldı.
- [x] Enerjisiz modül uyarısı ayrı ve görünür durum rozeti oldu.
- [x] Modülün stratejik rolü hover/title bilgisinde korunuyor.
- [x] Çekirdek ve Jeneratörün sabit başlangıç modülü görünümü korunuyor.
- [x] Savaş ekranına kısa Çekirdek / Jeneratör / Kapı / Özel Hücre açıklama şeridi eklendi.
- [x] Ayarlar kaydından sonra istemci aynı ayarı sunucudan yeniden GET ederek kalıcılığı doğruluyor.
- [x] Ayarlar ekranına `Kalıcılık: Sunucuda doğrulandı` / hata durumu eklendi.
- [x] Sunucu testinde `PUT settings → servis belleğini temizle → participant bootstrap → kalıcı ayarın geri gelmesi` zinciri eklendi.
- [x] Windows telemetri concurrency testi ve 24 eşzamanlı audit smoke testi korunuyor.
- [x] AI saldırı/hasar ve Devre Kredisi denge değerleri gerçek manuel savaş verisi oluşmadan değiştirilmedi.

---

# 7.3 — 2.0.0-beta.23 Oyna Erişimi ve Stratejik Modül Seçimi

Bu paket doğrudan gerçek kullanıcı geri bildirimine dayanır: Oyna butonunun pasif kalması ve Savaş Havuzu oluştururken modül mekaniklerinin karar vermeye yetmeyecek kadar az gösterilmesi.

## Tamamlananlar

- [x] Ana menüde `Oyna` butonu artık Web test / Online PvP readiness durumundan bağımsız olarak aktif kalır.
- [x] Tek Oyunculu Test Maçı her durumda Oyna ekranından erişilebilir.
- [x] Online PvP readiness kontrolü kaldırılmadı; yalnız `Online PvP` girişinde uygulanıyor.
- [x] Sol Global Modül listesi Enerji → Saldırı → Savunma → Destek → Sabotaj sınıf sırasına göre gruplandı.
- [x] Her sınıfın kendi başlığı ve kendi modül listesi bulunuyor.
- [x] Sağdaki seçilmiş 18 modüllük Savaş Havuzu da aynı sınıf düzenine göre gruplandı.
- [x] Sunucuya `/game/module-catalog` kanonik modül bilgi endpoint'i eklendi.
- [x] Savaş Havuzu ayrıntı ekranındaki sayısal değerler artık `server/app/game/catalog.py` ve motor sabitlerinden üretiliyor; istemci tarafından tahmin edilmiyor.
- [x] Ayrıntı paneline HP, DK, port, enerji üretimi, enerji tüketimi, temel hasar ve bekleme süresi eklendi.
- [x] Her modül için `Ne işe yarar?` bölümü eklendi.
- [x] Lazer / Darbe Topu / Ray Topu / Füze / Dron / Ark Topu gibi saldırı modüllerinde gerçek temel hasar ve saldırı aralığı gösteriliyor.
- [x] Kalkan, Zırh, Yansıtıcı ve Bariyerin gerçek motor hasar azaltma oranları açıklanıyor.
- [x] Onarım, Soğutucu, Güçlendirici, Hedefleme Bilgisayarı ve Aşırı Hızlandırıcı gerçek motor destek değerleriyle açıklanıyor.
- [x] EMP, Sinyal Bozucu, Virüs, Enerji Sömürücü ve Kesici için gerçek etki süresi / hasar / üretim azaltma / hat kesme değerleri gösteriliyor.
- [x] Batarya ve Kapasitörün gerçek depolama ve şarj/deşarj değerleri gösteriliyor.
- [x] Dağıtıcının gerçek enerji dağıtım verimliliği gösteriliyor.
- [x] Güçlü olduğu, zayıf olduğu ve sinerji kurduğu modüller Türkçe isimleriyle gösteriliyor.
- [x] Motorun sayısal değer yayınlamadığı bir mekanik için istemci değer uydurmuyor; bu durum açıkça belirtiliyor.
- [x] Otomatik startup testi Oyna butonunun pasif olmadığını ve sınıf-gruplu katalog üzerinden 18 modül seçilip yerel AI savaşına girilebildiğini doğruluyor.

---

# 7.4 — 2.0.0-beta.23 Oyun Lobisi, Kapılar Arası Jeneratör ve Etki Görselleştirmesi

## Jeneratör
- [x] Jeneratör başlangıçta Çekirdek kapılarından birinde yer alır.
- [x] Savaş sırasında sürükle-bırak ile dört Çekirdek kapısı arasında taşınabilir.
- [x] Normal/özel hücreye taşınamaz; rafa alınamaz; başka modülle replace edilemez.
- [x] Sunucu motoru kuralı otoriter olarak doğrular.
- [x] Bu sayede oyuncu farklı kapıya geçerek farklı dış hat/özel hücre rotaları kurabilir.

## Menü / lobby
- [x] Ana sayfa oyun lobisi kompozisyonuna geçirildi.
- [x] Oyna ana CTA, Profil/İstatistikler/Ayarlar ikincil lobby navigasyonu oldu.
- [x] GRIDSHARD'e özgü çekirdek/devre görsel odağı CSS ile oluşturuldu; başka oyunun grafiği kopyalanmadı.
- [x] Profil, İstatistikler ve Ayarlar aynı rekabetçi arayüz diline yaklaştırıldı.

## Savaş etki görünürlüğü
- [x] Yerel AI baskısı, Kalkan etkisi, raf açılışı ve Jeneratör kuralı savaş HUD şeridinde gösteriliyor.
- [x] Hasar alan modülde kırmızı darbe animasyonu, Kalkan azaltmasında mavi savunma animasyonu var.
- [x] Çekirdek kapıları GATE etiketiyle daha belirgin.
- [x] Yeni gerçek denge verisi olmadığı için sayısal AI / Devre Kredisi dengesi değiştirilmedi.

---

# 7.5 — 2.0.0-beta.23 Manuel Savaş Telemetrisi ve Denge Hazırlığı

- [x] Tek Oyunculu gerçek manuel maç başlangıç/bitiş telemetrisi eklendi.
- [x] Maç süresi, sonuç, Devre Kredisi harcaması, modül müdahalesi, verilen/alınan hasar ve Kalkan azaltması ölçülüyor.
- [x] Jeneratörün hangi kapıdan hangi kapıya taşındığı kaydediliyor.
- [x] Jeneratör taşımasında bağlı modül sayısı ve enerjili özel hücre sayısı telemetriye yazılıyor.
- [x] Maç sonucu ekranına Manuel Savaş Raporu eklendi.
- [x] `/telemetry/manual-battle-report` gerçek maç örneklerini toplu raporluyor.
- [x] İlk denge incelemesi için minimum 3 manuel maç eşiği konuldu.
- [x] 3 maçtan önce rapor `insufficient_manual_battles`, sonrasında `review_ready` oluyor.
- [x] Sistem sayısal dengeyi otomatik değiştirmiyor; `numeric_balance_changed=false`.
- [x] Yeni gerçek manuel veri bulunmadığı için AI hasarı, DK ekonomisi ve taşıma maliyeti bu pakette değiştirilmedi.

---

# 7.6 — 2.0.0-beta.23 Denge İnceleme Merkezi ve Jeneratör Rota Analizi

Bu paket Beta.11 telemetrisini karar destek katmanına taşır. Paket oluşturulurken kullanıcıdan üç yeni manuel maç verisi bulunmadığı için sayısal denge değiştirilmemiştir.

- [x] Manuel savaş raporu artık `battles_remaining` sayısını yayınlıyor.
- [x] Jeneratör için kapı ziyaretleri ve kapıdan-kapıya geçişler analiz ediliyor.
- [x] En çok tercih edilen Jeneratör kapısı raporlanıyor.
- [x] Jeneratör taşındıktan sonraki ortalama bağlı modül sayısı hesaplanıyor.
- [x] Jeneratör taşındıktan sonraki ortalama enerjili özel hücre sayısı hesaplanıyor.
- [x] Maç sonucu ekranına Denge İnceleme Merkezi eklendi.
- [x] Kuzey / Doğu / Güney / Batı kapı kullanım sayaçları oyuncuya gösteriliyor.
- [x] Gerçek maçlardan güvenli `review_candidates` üreten analiz katmanı eklendi.
- [x] Kısa/uzun maç, aşırı yüksek/düşük galibiyet oranı, düşük DK kullanımı, düşük modül müdahalesi, etkisiz Jeneratör rotası ve kullanılmayan Kalkan gibi alanlar yalnız inceleme adayı olarak işaretlenebiliyor.
- [x] Öneriler doğrudan denge değerlerini değiştirmiyor.
- [x] Her öneride `automatic_change=false`; raporda `numeric_balance_changed=false`.
- [x] Üç gerçek maç tamamlanmadan rapor yalnız veri toplamaya devam ediyor.
- [x] Üç maçtan sonra `review_ready` olur fakat nihai değişiklik yine manuel değerlendirme gerektirir.

---

# 7.7 — 2.0.0-beta.23 Hazır Savaş Havuzları, HP Görselleştirmesi ve Review-Ready Kapısı

## Savaş Havuzu kullanılabilirliği
- [x] Orta ayrıntı panelindeki büyük `Seç / Havuzdan Çıkar` düğmesi kaldırıldı.
- [x] Her Global Modül hücresine küçük `+ / ✓` seçim kontrolü eklendi.
- [x] Modül hücresinin ana alanına tıklamak ayrıntıyı açar; küçük seçim kontrolü havuza ekler/çıkarır.
- [x] Jeneratör zorunlu modül olarak seçili kalır ve çıkarılamaz.
- [x] Sağdaki seçilmiş Savaş Havuzu sınıf bazlı görünümünü korur.

## Hazır Savaş Havuzu preset sistemi
- [x] Oyuncu tam 18 modüllük mevcut havuzuna isim verip kaydedebilir.
- [x] Örn. `Saldırı`, `Savunma`, `Sabotaj` gibi oyuncu tanımlı isimler desteklenir.
- [x] Kayıtlı hazır havuzlar oyuncu kimliğine göre kalıcı JSON deposunda tutulur.
- [x] Oyuncu kayıtlı havuzu yüklediğinde 18 modül doğrudan sağdaki seçilmiş alana gelir.
- [x] Hazır havuz yüklendikten sonra oyuncu istediği modülleri değiştirebilir.
- [x] Hazır havuz silinebilir.
- [x] Hazır havuz sunucu tarafında gerçek `validate_battle_pool` kuralından geçmeden kaydedilemez.
- [x] CRUD ve kalıcılık regresyon testleri eklendi.

## HP / Can görselleştirmesi
- [x] Savaş alanındaki aktif modül kartlarına HP çubuğu eklendi.
- [x] HP durumu sağlıklı → uyarı → kritik için yeşil / sarı / kırmızı görsel tona ilerler.
- [x] Modül arka planına HP durumuna göre hafif renk tonu eklenir; bilgi okunabilirliği korunur.
- [x] HP 0 olduğunda modül soluklaşır ve etkileşim dışı görünür.
- [x] Global Modül ve seçilmiş havuz kartlarında modülün maksimum dayanıklılığı aynı HP görsel diliyle gösterilir.

## Review-Ready denge uygulama kapısı
- [x] `/telemetry/balance-change-plan` endpoint'i eklendi.
- [x] Manuel savaş raporu `review_ready` olmadan değişiklik planı `blocked_waiting_for_review_ready` durumundadır.
- [x] Review-ready olduğunda yalnız review/observe adaylarından manuel değişiklik planı satırları üretilir.
- [x] Her değişiklik satırında önce/değişecek değer alanı başlangıçta boştur.
- [x] Her satır `requires_manual_value=true`, `requires_simulation=true`, `requires_regression=true`, `approved=false` ile başlar.
- [x] Sistem sayısal değer uygulamaz; `automatic_apply=false`, `numeric_balance_changed=false`.
- [x] Gerçek üç maç verisi olmadan AI, DK veya modül dengesi değiştirilmedi.

---

# 7.8 — 2.0.0-beta.23 GRIDSHARD Identity Foundation

Beta.14'ten önce oyun kimliği sabitlenmiştir.

## İsim / marka
- [x] Kullanıcı-facing oyun adı `Project Relay` yerine `GRIDSHARD` oldu.
- [x] Türkçe slogan `Devreni Kur. Çekirdeği Kır.` olarak sabitlendi.
- [x] İngilizce slogan `Build the Circuit. Break the Core.` olarak dokümante edildi.
- [x] Browser title, ana lobby ve server identity metadata GRIDSHARD kullanıyor.
- [x] Dahili `Relay*` sınıf adları ve API route isimleri backward compatibility için bu pakette topluca rename edilmedi.

## Görsel kimlik
- [x] `docs/BRAND_IDENTITY.md` oluşturuldu.
- [x] Merkezi GRIDSHARD CSS token sistemi eklendi.
- [x] Void Navy / Reactor Blue / Alloy Navy / Circuit Steel taban yüzeyleri sabitlendi.
- [x] Arc Cyan enerji, Reactor Gold seçim, Ion Green sağlık, Charge Amber uyarı, Overload Red kritik, Interference Violet sabotaj dili sabitlendi.
- [x] Enerji / Saldırı / Savunma / Destek / Sabotaj sınıflarının renk rolleri sabitlendi.
- [x] Ana lobby için özgün dört kapılı `Shard Core` CSS sembolü eklendi.
- [x] Ana lobby slogan ve GRIDSHARD Core Arena kimliğine geçirildi.
- [x] Profil, İstatistikler, Ayarlar, Savaş Havuzu ve Savaş panelleri ortak GRIDSHARD yüzey renklerine bağlandı.
- [x] 1920×1080 ana tasarım hedefi; 1366×768–2560×1440 responsive aralık dokümante edildi ve yüksek çözünürlük media kuralları eklendi.

## Ses / müzik kimliği
- [x] `docs/AUDIO_DIRECTION.md` oluşturuldu.
- [x] Menü `92–100 BPM`, havuz `105–112`, matchmaking `115–120`, savaş `126–132 BPM` yönü sabitlendi.
- [x] 4–6 notalık ortak leitmotif prensibi dokümante edildi.
- [x] Menü / Havuz / Matchmaking / Battle / Pressure / Critical Core / Victory / Defeat audio state modeli eklendi.
- [x] `client/src/gridshard-audio.js` dinamik audio director temeli eklendi.
- [x] Henüz stock veya lisansı belirsiz müzik dosyası eklenmedi; nihai müzikler özgün üretilecek.

## Güvenli geçiş
- [x] `/identity` endpoint'i GRIDSHARD marka, slogan ve palette metadata yayınlıyor.
- [x] Existing gameplay / server-authoritative motor davranışı değiştirilmedi.
- [x] Beta.14 bundan sonra GRIDSHARD adıyla devam edecek.

---

# 7.9 — GRIDSHARD 2.0.0-beta.23 Hazır Havuz Yönetimi ve Denge Onay Akışı

## Hazır Savaş Havuzu yönetimi
- [x] Yüklenen hazır havuz `Aktif hazır havuz` olarak görünür.
- [x] Aktif havuzun yanında `Kayıtla aynı / Değiştirildi` durumu gösterilir.
- [x] Hazır havuzdan modül değiştirildiğinde dirty durumu otomatik oluşur.
- [x] Değiştirilmiş aktif havuz `Değişiklikleri Üzerine Kaydet` ile aynı isim üzerine güvenli biçimde kaydedilebilir.
- [x] Yeni isim yazılırsa mevcut seçim ayrı bir hazır havuz olarak kaydedilebilir.
- [x] Hazır havuz yeniden adlandırma endpoint'i ve UI'si eklendi.
- [x] Yeniden adlandırmada başka mevcut preset isminin üzerine sessizce yazılmaz.
- [x] Aktif preset yeniden adlandırılırsa aktif durum yeni isimle devam eder.
- [x] Aktif preset silinirse aktif/dirty state temizlenir.
- [x] Preset rename + overwrite + kalıcılık regresyon testleri eklendi.

## Review-Ready manuel denge taslağı
- [x] `balance_change_drafts.py` kalıcı taslak deposu eklendi.
- [x] `/telemetry/balance-change-draft` GET/PUT/DELETE akışı eklendi.
- [x] Gerçek rapor `review_ready` değilse taslak düzenleme sunucu tarafından reddedilir.
- [x] Taslak yalnız mevcut review-ready `balance-change-plan` alanlarında oluşturulabilir.
- [x] Her taslak satırında mevcut değer, önerilen değer ve manuel onay alanı bulunur.
- [x] Simülasyon ve regresyon durumları `pending / passed / failed` olarak takip edilir.
- [x] `ready_for_apply` yalnız manuel onay + önerilen değer + simülasyon passed + regresyon passed olduğunda true olabilir.
- [x] Beta.14'te hiçbir `apply` endpoint'i yoktur.
- [x] `automatic_apply=false`, `apply_endpoint_available=false`, `numeric_balance_changed=false` korunur.
- [x] Denge İnceleme Merkezi içine Manuel Değişiklik Taslağı UI'si eklendi.
- [x] Gerçek 3 maç review-ready verisi bulunmadığı için AI, DK veya modül sayısal dengesi değiştirilmedi.

## GRIDSHARD kimliği
- [x] `BRAND_IDENTITY.md` kanonik görsel kimlik kaynağı olarak korunuyor.
- [x] `AUDIO_DIRECTION.md` kanonik ses/müzik yönü olarak korunuyor.
- [x] Beta.14 kullanıcı-facing alanlarda GRIDSHARD markasıyla devam ediyor.

---

# 7.10 — GRIDSHARD 2.0.0-beta.23 Karar Tamamlama, Preset Kartları ve İzole Simülasyon

## Karar metni denetimi
- [x] `docs/KARAR_UYGULAMA_KONTROLU.md` oluşturuldu.
- [x] GRIDSHARD isim / palette / Shard Core / responsive kararlarının uygulanmış olduğu doğrulandı.
- [x] Eksik kalan 20 hücre lobby geometrisi tamamlandı.
- [x] Lobby Shard Core + grid için hafif pointer parallax eklendi.
- [x] OYNA alt metni `Tek Oyunculu · Dereceli PvP` oldu.
- [x] Oyuncu kartında Sezon / Lig / RP birlikte görünür.
- [x] `Operatör Terminali / Savaş Arşivi / Sistem Konsolu` alt ekran dili tamamlandı.

## Özgün GRIDSHARD müzik / SFX prototipi
- [x] Stock müzik kullanılmadan özgün prosedürel audio prototipleri üretildi.
- [x] Menü, Havuz, Matchmaking, Battle, Victory ve Defeat WAV assetleri eklendi.
- [x] Ortak D–F–A–C–B motif ailesi kullanıldı.
- [x] Port, Enerji, Lazer, Kalkan, EMP, Virüs, Jeneratör ve Çekirdek SFX assetleri eklendi.
- [x] `GridshardAudioDirector` state assetlerini ve SFX cue'larını runtime'da yönetiyor.
- [x] Jeneratör hareketi, modül yerleştirme, yerel saldırı, Kalkan ve Çekirdek hasarı uygun cue'lara bağlandı.

## Modül seçim kontrolü
- [x] Seçilmemiş modülde `+` = Savaş Havuzuna ekle.
- [x] Seçilmiş modülde `−` = Savaş Havuzundan çıkar.
- [x] Zorunlu Jeneratörde `◆` kilit işareti vardır; çıkarma engellenir.
- [x] Add / remove / required kontrol durumları ayrı GRIDSHARD renkleriyle gösterilir.

## Preset kartları / savaş öncesi loadout
- [x] Hazır havuz select kutusu görsel UX'ten çıkarıldı; gizli compatibility katmanı olarak kaldı.
- [x] Hazır Savaş Havuzları kart galerisi eklendi.
- [x] Kartta isim, 18 modül sayısı ve son kullanım zamanı gösterilir.
- [x] Favori yıldızı eklendi.
- [x] Favoriler ve son kullanılan presetler sunucuda kalıcı metadata olarak tutulur.
- [x] Eski Beta.13/14 list-only preset JSON formatı geriye dönük okunur.
- [x] Karttan `Yükle` ile savaş öncesi loadout tek tıkla aktif olur.
- [x] Aktif preset / dirty / rename / overwrite / delete davranışları korunur.

## Review-ready izole simülasyon koşucusu
- [x] `balance_simulation.py` eklendi.
- [x] `/telemetry/balance-change-simulate` endpoint'i eklendi.
- [x] Simülasyon yalnız review-ready raporda ve kaydedilmiş before/proposed taslak değerlerinde çalışır.
- [x] Yerel AI baskısı adapterı 60 saniyelik ham saldırı baskısını karşılaştırır.
- [x] Devre Kredisi adapterı 60 saniyelik pasif üretimi karşılaştırır.
- [x] Modül müdahale adapterı kilit açılış zamanının kullanılabilir savaş süresine etkisini karşılaştırır.
- [x] Simülasyon kanonik sabitleri değiştirmez.
- [x] Başarılı dry-run `simulation_status=passed`, unsupported/invalid dry-run `failed` olur.
- [x] Regresyon ayrı zorunlu kapı olarak kalır.
- [x] Otomatik denge apply endpoint'i hâlâ yoktur.
- [x] Gerçek review-ready verisi olmadan sayısal denge değişikliği yapılmadı.

---

# 7.11 — GRIDSHARD 2.0.0-beta.23 BattleEngine Regresyonu, Audio Settings ve Hızlı Loadout

## Review-ready ikinci güvenlik koşucusu
- [x] `balance_regression.py` eklendi.
- [x] `/telemetry/balance-change-regression` endpoint'i eklendi.
- [x] Regresyon yalnız gerçek manuel rapor `review_ready` olduğunda çalışır.
- [x] Regresyondan önce taslak `simulation_status=passed` olmak zorundadır.
- [x] Devre Kredisi before/proposed değerleri gerçek `BattleEngine + CircuitCreditConfig` ile çalıştırılır.
- [x] Devre Kredisi regresyonunda tick akışı, pasif gelir, modül yerleştirme ve temel engine invariants kontrol edilir.
- [x] Modül müdahale kilidi before/proposed değerleri gerçek BattleEngine instance'larında test edilir.
- [x] `BattleEngine` modül müdahale kilidini izole test için constructor üzerinden alabilir; varsayılan 15 saniyelik kanonik davranış değişmemiştir.
- [x] Kapasite zaman çizelgesi kilit anına göre göreli hale getirildi; varsayılan 15/25/35/... davranışı aynen korunuyor.
- [x] Gerçek engine adapterı bulunmayan alan regression passed olamaz ve güvenlik amacıyla bloke edilir.
- [x] `simulation_status=passed + regression_status=passed + manuel onay` yine yalnız `ready_for_apply` adayı üretir.
- [x] Herhangi bir apply endpoint'i hâlâ bulunmaz.
- [x] `canonical_values_changed=false`, `automatic_apply=false` korunur.
- [x] Review-ready → simülasyon → gerçek BattleEngine regresyon zinciri gateway testinde doğrulandı.
- [x] Telemetri API'sinin dict çıktısı ile manuel rapor arasında bulunan uyumluluk problemi giderildi.

## GRIDSHARD Audio Settings gerçek runtime entegrasyonu
- [x] Ayarlar ekranına `Sesi Sessize Al` eklendi.
- [x] Ayarlar ekranına `Müziği Sessize Al` eklendi.
- [x] Ses slider'ı gerçek SFX gain değerine bağlandı.
- [x] Müzik slider'ı gerçek music gain değerine bağlandı.
- [x] Slider ve mute kontrolleri canlı önizleme sağlar.
- [x] `sound_muted` ve `music_muted` sunucu oyuncu ayarlarında kalıcıdır.
- [x] Eski oyuncu veri kayıtları mute alanları olmadan geriye dönük yüklenebilir.
- [x] Audio Director aktif track volume/mute durumunu runtime'da uygular.
- [x] SFX mute gameplay eventlerini durdurmaz; yalnız ses cue'sunu atlar.

## Savaş öncesi Hızlı Loadout
- [x] Oyna ekranına `Hızlı Loadout` bölümü eklendi.
- [x] Sunucunun favori + son kullanılan sıralamasındaki ilk üç hazır havuz burada gösterilir.
- [x] Kartta preset adı, favori işareti, modül sayısı ve son kullanım bilgisi bulunur.
- [x] Her hızlı karttan doğrudan `Tek Oyunculu` veya `PvP` hazırlığı seçilebilir.
- [x] Hızlı seçim preset'i yükler, aktif loadout yapar ve normal 18/18 doğrulama akışını korur.
- [x] Böylece oyuncu her maçta yeniden 18 modül seçmek zorunda kalmaz.

## Denge durumu
- [x] Bu geliştirme paketinde kanonik AI / DK / modül sayısal dengesi değiştirilmedi.
- [x] Gerçek kullanıcı `review_ready` verisi oluşmadan değişiklik uygulanmayacaktır.

---

# 7.12 — GRIDSHARD 2.0.0-beta.23 Engine Regresyon Kapsamı, Audio Mix V2 ve Loadout Son Dokunuşları

## PowerShell hata düzeltmesi / kaynak bütünlüğü
- [x] Kullanıcının iki PowerShell çıktısındaki ortak `manual-battle-report 500` hatası incelendi.
- [x] Kök neden eski `event.player_id` erişimidir; TelemetryService olayları API katmanında dict olabilir.
- [x] Beta.16 teslim ZIP'inin gerçek kaynağında `_event_value` düzeltmesinin mevcut olduğu doğrulandı.
- [x] Çalıştırılan klasörün eski/karışık kaynak taşımasını yakalamak için `tools/release_guard.py` eklendi.
- [x] `BASLAT_WEB_TEST.bat/.sh` Uvicorn'dan önce release guard çalıştırır.
- [x] `TEST_ET.bat` QA'dan önce release guard çalıştırır.
- [x] Release guard sürüm, kaynak imzası ve dict telemetri probe'unu doğrular.
- [x] QA canlı smoke testine `/telemetry/manual-battle-report` çağrısı eklendi.
- [x] Gerçek `TelemetryService.events()` dict çıktısını kullanan endpoint regresyon testi eklendi.

## Engine regresyon kapsamı
- [x] `generator_route` için gerçek BattleEngine yapısal regresyon adapterı eklendi.
- [x] Jeneratör Kuzey / Doğu / Güney / Batı kapılarının tamamına gerçek `move_module` komutuyla taşınır.
- [x] Her kapıda Jeneratör–Çekirdek enerji topolojisi bağlantısı doğrulanır.
- [x] Her kapıda en az bir özel hücre yönüne side-port erişimi doğrulanır.
- [x] `defense_usage` için gerçek engine state + combat çözümü kullanan Kalkan regresyonu eklendi.
- [x] Powered Kalkanın unpowered Kalkan'a göre gerçek hasarı azaltması doğrulanır.
- [x] `local_ai_pressure` ayrı `server_side_local_ai` adapterına taşındı.
- [x] Yerel AI adapterı mevcut 5 sn başlangıç / 2 sn saldırı / 8 ham / 5 Kalkanlı hasar referansını güvenli test metriği olarak kullanır.
- [x] Desteklenmeyen regression alanları hâlâ güvenlik amacıyla bloke edilir.

## İnsan değerlendirme kapısı
- [x] `/telemetry/balance-human-review` endpoint'i eklendi.
- [x] Sayısal aday yalnız manuel onay + simulation passed + regression passed + proposed value şartlarıyla kuyruğa girer.
- [x] Yapısal generator/defense adayları yalnız structural regression passed olduğunda kuyruğa girer.
- [x] İnsan değerlendirme kuyruğu UI'da görünür.
- [x] `human_decision_required=true`.
- [x] `automatic_apply=false`.
- [x] `apply_endpoint_available=false`.
- [x] Bu pakette hiçbir kanonik AI / DK / modül değeri değiştirilmedi.

## Audio Mix V2
- [x] Müzik WAV assetleri `-6 dBFS` peak hedefine normalize edildi.
- [x] SFX WAV assetleri `-3 dBFS` peak hedefine normalize edildi.
- [x] Runtime `GRIDSHARD_AUDIO_MIX` v2 metadata'sı eklendi.
- [x] Music state geçişlerinde `450 ms` crossfade eklendi.
- [x] `critical_core_layer.wav` özgün prosedürel katmanı eklendi.
- [x] Yerel savaşta oyuncu Çekirdeği `%33` veya altına düştüğünde Critical Core state/katmanı devreye girer.
- [x] Ayarlar / Sistem Konsolu'na `Müziği Önizle` eklendi.
- [x] Ayarlar / Sistem Konsolu'na `SFX Önizle` eklendi.
- [x] Önizlemeler mevcut volume/mute tercihlerini kullanır.

## Savaş öncesi Loadout son dokunuşları
- [x] Hızlı Loadout alanına `Tümü / Favoriler` filtresi eklendi.
- [x] Favori rozeti eklendi.
- [x] `Son Kullanılan` rozeti eklendi.
- [x] `Aktif` rozeti eklendi.
- [x] Aktif loadout adı, 18/18 sayısı, kayıtla aynı/değiştirildi durumu ve son kullanım zamanı savaş öncesinde gösterilir.
- [x] Tek Oyunculu / PvP hızlı seçim davranışı korunur.
- [x] Modül seçim açıklaması gerçek `+ / − / ◆` davranışıyla eşitlendi.

---

# 7.13 — GRIDSHARD 2.0.0-beta.23 Cache Güvenliği, Browser E2E, Audio Mix V3 ve İnsan Review Konsolu

## Web test cache güvenliği
- [x] `304 Not Modified` web test ortamında kaldırıldı.
- [x] HTML/JS/CSS statik yanıtları `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` ile servis edilir.
- [x] Conditional `If-None-Match / If-Modified-Since` istekleri web testinde yine `200 OK` döner.
- [x] `X-GRIDSHARD-Cache: disabled` tanılama header'ı eklendi.
- [x] 304 regresyon testi eklendi.

## Gerçek tarayıcı E2E
- [x] `tools/browser_e2e.py` Playwright/Chromium tabanlı gerçek tarayıcı koşucusu eklendi.
- [x] Akış: Ana Menü → Hızlı Loadout → Savaş Havuzu → Tek Oyunculu → Sonuç → Telemetri.
- [x] E2E yalnız `?e2e=1` altında yerel test saatini hızlandırır; normal oyun hızı değişmez.
- [x] QA zincirinde browser E2E opsiyonel çalışır; çalışma ortamı localhost/browser politikasını engellerse SKIPPED raporu üretir.
- [x] HTTP smoke ve startup VM testleri zorunlu kalır.

## Audio Mix V3
- [x] `GRIDSHARD_AUDIO_MIX` v3.
- [x] Crossfade korunur.
- [x] Critical Core katmanı saldırı baskısı arttıkça dinamik gain alır.
- [x] `docs/AUDIO_LOUDNESS_REPORT.json` pre-master peak/RMS raporu eklendi.
- [x] Fake browser Audio lifecycle testi eklendi.

## İnsan Denge İnceleme Konsolu
- [x] İnsan review alanına tek kanıt özeti eklendi.
- [x] Sayısal ve yapısal güvenlik kapılarından geçen aday sayıları görünür.
- [x] Otomatik apply yine yoktur.
- [x] Kanonik sayısal denge bu pakette değiştirilmedi.

## Build / kaynak görünürlüğü
- [x] Manifest `version`, `ui_build_label`, `static_cache_mode`, `browser_e2e` alanlarını yayınlar.
- [x] Lobby build etiketi manifestten runtime'da doğrulanır.
- [x] Release guard UI build etiketi ile server version eşleşmesini kontrol eder.

---

# 7.14 — GRIDSHARD 2.0.0-beta.23 Browser E2E Sertleştirme, Savaş UX Telemetrisi ve Audio Mastering Hazırlığı

## Browser E2E sertleştirme
- [x] `tools/browser_e2e.py` artifact toplayacak şekilde genişletildi.
- [x] `01-main-menu.png` screenshot.
- [x] `02-loadout-ready.png` screenshot.
- [x] `03-battle-started.png` screenshot.
- [x] `04-battle-result.png` screenshot.
- [x] `console.json` browser console artifact.
- [x] `network.json` HTTP/browser network artifact.
- [x] `checks.json` E2E kontrol artifact.
- [x] Çalışma ortamı localhost/browser politikasını bloke ederse `environment.txt` ve SKIPPED raporu oluşturulur.
- [x] Windows yerel çalışma için `TARAYICI_E2E_TEST.bat` eklendi.
- [x] Launcher Playwright eksikse gerekli kurulum komutlarını açıkça gösterir.
- [x] Browser E2E normal QA'dan ayrı tutulur; ortam bağımlılığı zorunlu server/client testlerini bozmaz.

## Savaş UX / pause telemetrisi
- [x] Yerel savaşta `requestAnimationFrame` frame sayısı ölçülür.
- [x] Maksimum frame gap ölçülür.
- [x] `1000 ms` üstü event-loop boşluğu pause violation olarak kaydedilir.
- [x] Savaş sırasında gerçek button/summary/module/board clickleri `battle_ui_interaction` olayı üretir.
- [x] UI etkileşim örnekleri maç metriklerinde saklanır.
- [x] Maç sonunda `battle_ux_timing_summary` telemetrisi gönderilir.
- [x] Browser E2E savaş devam ederken gerçek UI etkileşimi yapıp elapsed battle time'ın ilerlediğini doğrular.
- [x] Browser E2E finalde `pause_violation_count == 0` kontrolü yapar.
- [x] E2E debug için `window.__GRIDSHARD_BATTLE_UX` yalnız ölçüm görünümü sağlar; savaş otoritesini değiştirmez.

## İnsan Denge İnceleme kanıtları
- [x] `/telemetry/balance-human-review-evidence` endpoint'i eklendi.
- [x] Yalnız `human_review_ready` adayların ayrıntısı döndürülür.
- [x] Sayısal passed adaylarda simulation kanıtı tekrar hesaplanabilir.
- [x] Passed adaylarda regression kanıtı tekrar hesaplanabilir.
- [x] Yapısal adaylarda BattleEngine regression kanıtı gösterilebilir.
- [x] UI'da her aday açılır `<details>` kanıt kartı olarak görünür.
- [x] Gerekçe, öneri, before/proposed, simulation JSON ve regression JSON görünür.
- [x] Kanıt görüntüleme otomatik apply yapmaz.

## Audio mastering hazırlığı
- [x] `docs/AUDIO_MASTERING_PREP.json` eklendi.
- [x] Peak dBFS ölçülür.
- [x] RMS loudness proxy ölçülür.
- [x] Crest factor ölçülür.
- [x] DC offset proxy ölçülür.
- [x] Asset süre/sample-rate bilgisi raporlanır.
- [x] RMS proxy'nin LUFS olmadığı raporda ve dokümanda açıkça belirtilir.
- [x] Final mastering tamamlandı şeklinde işaretlenmez.
- [x] Critical Core pressure `low / medium / high` kademelerine ayrıldı.
- [x] Pressure kademesi critical layer gain ve hafif playback-rate yoğunluğunu yönetebilir.

---

# 7.15 — GRIDSHARD 2.0.0-beta.23 Windows Browser E2E Kanıt Paketi, Savaş Etkileşim Profili ve Review Konsolu V2

## Windows Browser E2E Kanıt Paketi
- [x] `tools/browser_e2e_evidence.py` eklendi.
- [x] Browser sonucu `PASSED / SKIPPED / FAILED / NOT_RUN` olarak açıkça sınıflandırılır.
- [x] `SKIPPED` hiçbir zaman `PASSED` sayılmaz.
- [x] `browser_e2e.json`, screenshot durumları, console, network ve checks artifactleri tek özet raporda birleştirilir.
- [x] `qa_reports/browser_e2e_evidence_summary.json` üretilir.
- [x] Kanıt özeti screenshot bütünlüğünü listeler.
- [x] Browser console error sayısını listeler.
- [x] Network response ve HTTP error sayısını listeler.
- [x] UX timing final metriklerini ve kategori sayılarını listeler.
- [x] `TARAYICI_E2E_TEST.bat` gerçek browser E2E sonunda kanıt özetini otomatik üretir.

## Savaş Etkileşim Profili
- [x] `module_place` ayrı kategori.
- [x] `module_move` ayrı kategori.
- [x] `generator_gate` ayrı kategori.
- [x] `booster` ayrı kategori.
- [x] `technical_drawer` ayrı kategori.
- [x] `other_ui` fallback kategorisi.
- [x] Başarılı modül yerleştirme komutu timing profiline yazılır.
- [x] Başarılı modül taşıma komutu timing profiline yazılır.
- [x] Jeneratör hareketi normal move yerine `generator_gate` olarak ayrılır.
- [x] Booster seçim ve uygulama etkileşimleri ayrı sayılır.
- [x] Teknik drawer clickleri ayrı kategoriye alınır.
- [x] Kategori toplamları `battle_ux_timing_summary` içinde yer alır.
- [x] Browser E2E UI etkileşimi sırasında battle elapsed time'ın ilerlemesini ve pause violation oluşmamasını kontrol etmeye devam eder.

## Review Konsolu V2
- [x] Simulation önce ve öneri metrikleri yan yana özetlenir.
- [x] Regression passed durumu ve scenario sayısı özetlenir.
- [x] Ham simulation/regression JSON kanıtları açılır kart içinde korunur.
- [x] `Yerel Karar Notu` alanı eklendi.
- [x] Karar notu yalnız browser `localStorage` içinde tutulur.
- [x] Not sunucuya gönderilmez.
- [x] Not hiçbir apply veya canonical değişiklik endpoint'ine bağlı değildir.
- [x] Kullanıcı notu temizleyebilir.

## Audio mastering / gerçek loudness ölçümü
- [x] `tools/audio_lufs_scan.py` eklendi.
- [x] ffmpeg ve `ebur128` mevcutsa gerçek EBU R128 / BS.1770 ailesi ölçümü çalışır.
- [x] `docs/AUDIO_BS1770_SCAN.json` üretilir.
- [x] Integrated LUFS ölçülebilir.
- [x] Loudness Range ölçülebilir.
- [x] True Peak ölçülebilir.
- [x] Araç bulunmazsa durum SKIPPED olur.
- [x] LUFS uydurulmaz.
- [x] `final_mastering_complete=false` korunur.

---

# 7.16 — GRIDSHARD 2.0.0-beta.23 Gerçek Windows E2E İçe Aktarımı, UX Etkileşim Matrisi ve Review Karar Akışı

## Gerçek Windows E2E sonuç içe aktarımı
- [x] `tools/import_browser_e2e_evidence.py` eklendi.
- [x] Kaynak klasör veya ZIP olabilir.
- [x] `browser_e2e.json` zorunludur.
- [x] `browser_e2e_artifacts/` zorunludur.
- [x] Dört ekran görüntüsü zorunludur.
- [x] `console.json`, `network.json`, `checks.json` zorunludur.
- [x] PNG signature doğrulaması yapılır.
- [x] Artifact SHA-256 hash manifesti oluşturulur.
- [x] Tüm checks `ok=true` olmadan `VERIFIED_PASSED` oluşmaz.
- [x] Console error varsa `VERIFIED_PASSED` oluşmaz.
- [x] HTTP 4xx/5xx network cevabı varsa `VERIFIED_PASSED` oluşmaz.
- [x] Kaynak `SKIPPED` ise import sonucu da `SKIPPED` kalır.
- [x] `automatic_pass_from_skip=false`.
- [x] Import sonucu `qa_reports/imported_browser_e2e.json`.
- [x] `WINDOWS_E2E_KANIT_ICERI_AKTAR.bat` eklendi.
- [x] `qa_reports/latest.json` varsa import sonucunu `external_windows_browser_e2e` alanında taşır.
- [x] Import sonucu çekirdek server/client QA sonucunu sahte biçimde değiştirmez.

## Taşınabilir Windows kanıt paketi
- [x] `tools/export_browser_e2e_evidence.py` eklendi.
- [x] Gerçek PASSED olmayan browser sonucu dışa aktarılamaz.
- [x] SKIPPED browser sonucu PASSED kanıt ZIP'i oluşturamaz.
- [x] Eksik artifact varsa export reddedilir.
- [x] Windows E2E launcher başarılı test sonunda taşınabilir ZIP oluşturur.
- [x] Çıktı: `qa_reports/gridshard-windows-browser-e2e-evidence.zip`.

## UX Etkileşim Matrisi
- [x] Her `battle_ui_interaction` örneğine kategori eklenir.
- [x] Her örneğe interaction anındaki `frame_gap_ms` eklenir.
- [x] Her örneğe aynı kategoride önceki interaction'a göre `battle_clock_delta_ms` eklenir.
- [x] `module_place` matrix.
- [x] `module_move` matrix.
- [x] `generator_gate` matrix.
- [x] `booster` matrix.
- [x] `technical_drawer` matrix.
- [x] `other_ui` matrix.
- [x] Her kategori `count`.
- [x] Her kategori `average_frame_gap_ms`.
- [x] Her kategori `max_frame_gap_ms`.
- [x] Her kategori `average_clock_delta_ms`.
- [x] Her kategori `max_clock_delta_ms`.
- [x] Matrix `window.__GRIDSHARD_BATTLE_UX` görünümüne eklenir.
- [x] Matrix maç sonu `battle_ux_timing_summary` içine eklenir.
- [x] `tools/ux_interaction_matrix.py` yalnız gerçek PASSED browser kanıtından rapor üretir.
- [x] Gerçek PASSED kanıt yoksa matrix durumu `SKIPPED`; değer uydurulmaz.
- [x] Çıktı: `qa_reports/ux_interaction_matrix.json`.

## Denge Review karar akışı
- [x] Yerel Review durum dropdown'u eklendi.
- [x] `Karar verilmedi`.
- [x] `Beklet`.
- [x] `Reddet`.
- [x] `İleride değerlendir`.
- [x] Durum + kullanıcı notu tek local draft JSON olarak tutulur.
- [x] Yerel draft `localStorage` içindedir.
- [x] Yerel draft sunucuya gönderilmez.
- [x] Yerel draft `canonical_balance_changed=false` olarak modellenir.
- [x] Review kararı otomatik apply yapmaz.
- [x] Kullanıcı yerel review taslağını temizleyebilir.

## Audio teknik referans / mastering hedefi
- [x] Gerçek BS.1770 ölçümleri korunur.
- [x] `docs/AUDIO_MASTERING_TARGET_DECISION.json` eklendi.
- [x] `mastering_target_selected=false`.
- [x] Hedef Integrated LUFS seçilmedi.
- [x] Hedef True Peak seçilmedi.
- [x] Platform mastering profili seçilmedi.
- [x] Ölçülen LUFS değerleri hedef değer olarak yorumlanmaz.
- [x] Otomatik audio gain değişikliği yok.
- [x] `final_mastering_complete=false`.

---

# 7.17 — GRIDSHARD 2.0.0-beta.22 Manuel Savaş Alanı, Windows E2E Geçmişi, UX Gözlemi ve Review Konsolu V3

## Manuel savaş alanı erişimi
- [x] `Savaş Alanını Hemen Aç` hızlı yerel savaş girişi Oyna ekranında bulunur.
- [x] Hızlı giriş 18/18 test savaş havuzunu otomatik doldurur.
- [x] Hızlı giriş matchmaking beklemeden Yerel AI savaşını başlatır.
- [x] Jeneratör zorunlu loadout modülüdür ve kapılar arasında taşınabilir.
- [x] `HIZLI_SAVAS_TESTI.bat` ve `docs/MANUEL_SAVAS_TESTI.md` eklendi.
- [x] Kanonik 15 sn Modül Rafı kilidi korunur.
- [x] Startup testi gerçek app.js akışında `localStatus=battle` durumuna geçişi doğrular.

## Windows E2E kanıt geçmişi
- [x] `tools/browser_e2e_history.py` yalnız `VERIFIED_PASSED` importları geçmişe ekler.
- [x] SKIPPED / REJECTED import geçmişe eklenmez.
- [x] Artifact hashlerinden deterministik run-id üretilir.
- [x] Duplicate kanıt tekrar history run oluşturmaz.
- [x] Son ve önceki doğrulanmış koşu karşılaştırması tutulur.

## UX performans gözlemi
- [x] `tools/ux_performance_thresholds.py` gözlem bantlarını üretir.
- [x] Gerçek MEASURED UX matrix yoksa `NOT_MEASURED` ve `performance_pass=null`.
- [x] Gerçek browser ölçümü olmadan performans PASS/FAIL uydurulmaz.
- [x] Ölçüm olduğunda kategori bazında OBSERVE / ATTENTION / HIGH_ATTENTION üretilir.

## Review Konsolu V3
- [x] Review kararları aday `area` değerine göre ayrı localStorage keylerinde tutulur.
- [x] Beklet / Reddet / İleride değerlendir kararları adaylar arasında karışmaz.
- [x] Aday kararı `local_only=true`, `canonical_balance_changed=false`, `automatic_apply=false`.

## Audio mastering kararı
- [x] Mastering hedefi seçilmedi.
- [x] Üç karar profili yalnız seçenek olarak dokümante edildi.
- [x] Kullanıcı açıkça hedef seçmeden LUFS / True Peak / gain değişikliği uygulanmaz.

---

# 7.18 — GRIDSHARD 2.0.0-beta.23 Gerçek Yerel Karşılıklı Savaş, Bağımsız Arena, Enerji Rebalansı ve Audio V4

## Kullanıcı geri bildirimiyle ana menü
- [x] Üst soldaki `GRIDSHARD 2.0` ibaresinden `2.0` kaldırıldı; marka yalnız `GRIDSHARD`.
- [x] Ana menünün ana başlığı `GRIDSHARD` oldu.
- [x] Profil / İstatistikler / Ayarlar satırlarındaki `01 / 02 / 03` indeksleri kaldırıldı.
- [x] Ana menüde savaş HUD bilgi barı gösterilmez.

## Bağımsız savaş sayfası / sabit HUD
- [x] Savaş başladıktan sonra setup ve Savaş Havuzu panelleri gizlenir.
- [x] Arena bağımsız savaş görünümü olarak çalışır.
- [x] Savaş HUD'ı yalnız aktif savaşta görünür ve `position: sticky` ile sayfa kaydırılırken üstte kalır.
- [x] HUD: oyuncu adı, Yerel AI eşleşme bilgisi, Devre Kredisi, ayarlar dişlisi ve süre sayacı içerir.
- [x] Ayarlar dişlisi savaş sırasında açılabilir; simulation clock durmaz.
- [x] Maç bittikten sonra Ana Menüye Dön kontrolü yeniden kullanılabilir.

## Karşılıklı devre / gerçek oynanabilir Yerel AI savaşı
- [x] Oyuncu ve rakip devresi savaş alanında yan yana render edilir.
- [x] Rakip devresinde Çekirdek, Jeneratör, Kalkan, Lazer ve Batarya görünür.
- [x] Oyuncu hızlı test başlangıcında Çekirdek + Jeneratör + Lazer + Darbe Topu ile gerçek aktif saldırı üretir.
- [x] Rakip AI, oyuncunun normal modüllerini bitirmeden Jeneratör/Çekirdeğe geçmez.
- [x] Oyuncu saldırıları rakip normal modüllerini bitirmeden Jeneratör/Çekirdeğe geçmez.
- [x] Karşılıklı hasar HP barlarında ve Olay Günlüğünde görünür.
- [x] Startup/VM testi savaşın 120 sn içinde sonuç verdiğini doğrular.

## Sayaç / 15 saniye Modül Rafı
- [x] Süre sayacı aktif savaşta gerçek requestAnimationFrame zamanından ilerler.
- [x] 15. saniyede `client.isShelfUnlocked()` aktif olur.
- [x] `Modül Rafı` etiketi `Kilitli → Aktif` değişir.
- [x] Startup testi 16. saniyede sayacın sıfırdan farklı olduğunu ve rafın `Aktif` olduğunu doğrular.

## Jeneratör enerji rebalansı
- [x] Jeneratör üretimi `8 → 11 Ü/sn` olarak değiştirildi.
- [x] Temel dağıtım (%90) kullanılabilir enerji `9.9 Ü/sn`.
- [x] Dağıtıcı ile (%98) kullanılabilir enerji `10.78 Ü/sn`.
- [x] `Lazer + Darbe Topu` (8 Ü/sn) temel hatta sürekli beslenebilir.
- [x] `Lazer + Darbe + Kalkan` (10 Ü/sn) Dağıtıcı ile beslenebilir; Dağıtıcının rolü anlamlıdır.
- [x] `Darbe + Ray Topu` (11 Ü/sn) yalnız Dağıtıcıyla tam karşılanmaz; Batarya/Kapasitör hâlâ anlamlıdır.
- [x] Enerji Sömürücü sonrası üretim düşüşü yeni üretim değerine göre test edildi.
- [x] Enerji Hücresi bonusu yeni üretim değeriyle test edildi.
- [x] Enerji önceliği testi yeni güç bütçesine göre yeniden kuruldu; saldırı rolü sabotajdan önce beslenir.
- [x] Enerji tüketen modüllerin 1–6 aktif tüketici kombinasyonları tarandı: `43.795` kombinasyon.
- [x] Ayrıntılı çıktı: `qa_reports/beta23_balance_report.json`.

## Çoklu savaş / sonuç regresyonu
- [x] 6 farklı devre arketipiyle mirrored round-robin çalıştırıldı.
- [x] 30 otomatik gerçek BattleEngine maçı çalıştırıldı.
- [x] Timeout: `0`.
- [x] Draw: `2` (sonuçlandırılmış, sonsuz simülasyon değil).
- [x] Ortalama süre: yaklaşık `52.6 sn`.
- [x] En az 4 farklı arketip maç kazanabildi; tek bir düzen tüm eşleşmeleri domine etmedi.
- [x] Hedef önceliği normal modül → Jeneratör → Çekirdek testleri korunuyor.

## Audio Mix V4
- [x] Menü, havuz, savaş ve kritik çekirdek için yeni `32 sn` stereo prototip trackler üretildi.
- [x] Yeni assetler: `menu_pulse_v4.wav`, `pool_pulse_v4.wav`, `battle_pulse_v4.wav`, `critical_core_layer_v4.wav`.
- [x] Trackler çok katmanlı bass/pad/pulse/accent yapısı kullanır; tek enstrüman tekrar hissi azaltıldı.
- [x] Loop bileşenleri 32 sn sınırında periyodik olacak şekilde üretildi.
- [x] Music state crossfade `450 ms → 1200 ms` yapıldı.
- [x] Audio lifecycle testi yeni crossfade süresiyle başarılıdır.
- [x] Final mastering tamamlandı iddiası yoktur.

## Test kapısı
- [x] Timer + 15 sn raf açılması + karşılıklı Yerel AI savaş sonucu istemci startup testinde doğrulanır.
- [x] Yeni çift devre markup testi vardır.
- [x] Audio V4 süre/stereo/loop-boundary testi vardır.
- [x] Jeneratör ve 30 maçlık denge regresyon testi vardır.

---

# 9.19 — GRIDSHARD 2.0.0-beta.24 Manuel Arena Geri Bildirimi, Sunucu Otoriteli Yerel AI ve Tek Viewport UX

## Paket tabanı ve kapsam kararı
- [x] `gridshard-2.0.0-beta.23.zip` mevcut bulundu ve Beta.24 doğrudan bu paket üzerine kuruldu.
- [x] Beta.23 eksikliği için Beta.22 geri dönüşüne ihtiyaç kalmadı.
- [x] Kullanıcı düzenleme belgesindeki maddeler bu kanonik dosyayla karşılaştırılarak Beta.24 kapsamına alındı.

## Ana menü sadeleştirmesi
- [x] Logonun üzerindeki `GRIDSHARD // CORE ARENA` satırı kaldırıldı.
- [x] `CORE ARENA`, ana `GRIDSHARD` logosunun altında sağa hizalı alt başlık oldu.
- [x] Çekirdek görseline yumuşak nefes alan glow animasyonu eklendi.
- [x] Sabit `Operatör / Oyuncu` metinleri yerine gerçek oyuncu adı ve hesap ayrıntıları gösterilir.
- [x] Oyna / Profil / İstatistikler / Ayarlar altındaki gereksiz açıklama yazıları kaldırıldı.

## Hazırlık ekranı ve havuzlar
- [x] `Oyna` doğrudan savaşı başlatmaz; tek ekranlık hazırlık akışını açar.
- [x] Hazırlık ekranı `Global Havuz / Modül Bilgisi / Savaş Havuzu` şeklinde üç kolonludur.
- [x] Global Havuz ve Savaş Havuzu sınıf bazlı gruplandırılır.
- [x] Savaş içi Modül Rafı sınıf bazlı gruplandırılır.
- [x] Menü, profil, istatistikler, ayarlar, hazırlık ve savaş görünümleri tek viewport sınırına uyarlanır; yoğun içerik kendi panelinde kayar.

## Savaş alanı okunabilirliği ve port etkileşimi
- [x] Aktif savaş hücrelerinde kart taşması engellendi.
- [x] Aktif devre modülleri yalnız simge ve Can barı ile gösterilir.
- [x] Dolu hücrelerde `Kapı` etiketi gizlenir.
- [x] Jeneratör port sayısı `3 → 4` oldu; dört ana yön kullanılabilir.
- [x] İlk 15 saniyelik kanonik kilitten sonra modül tıklaması port yönünü döndürme komutu gönderir.
- [x] Jeneratör kapı değişimi, normal modül taşıma ve rafa dönüş sunucu komut akışında korunur.
- [x] Enerji akışı, saldırı çizgisi ve kritik Çekirdek baskısı görsel olarak belirginleştirildi.

## Sunucu otoriteli Yerel AI köprüsü
- [x] Yerel AI oturumu sunucudaki gerçek `PvpSessionService / BattleEngine` ile başlatılır.
- [x] İstemci savaş durumu periyodik sunucu snapshot'larından güncellenir.
- [x] Oyuncu taşıma, rafa alma, yerleştirme ve port döndürme niyetleri sunucuya komut olarak gönderilir.
- [x] Sunucu ulaşılamazsa yalnız yerel geliştirme/test amacıyla açıkça işaretli istemci fallback'i korunur.
- [x] Yerel AI maçları normal oyuncu istatistiğini veya dereceli sonucu değiştirmez.

## Maç sonu ve ses
- [x] Sonuç paneli açılır modal olarak gösterilir.
- [x] Savaş analizi modal içinde açılır/kapanır ayrıntı kutusudur.
- [x] Maç sonuçlandığında sayaç sabitlenir.
- [x] Maç sonuçlandığında sürükle-bırak, port döndürme ve diğer modül hareketleri kapanır.
- [x] Zafer ve mağlubiyet için ayrı müzik durumları çalışır.

## Enerji / port doğrulaması ve test kapısı
- [x] Jeneratör üretimi Beta.23'teki `11 Ü/sn` değerinde tutuldu; Beta.24'te otomatik sayısal enerji dengesi değişikliği yapılmadı.
- [x] Onarım modülünün bağlıyken enerji aldığı motor testiyle doğrulandı.
- [x] Dört portlu Jeneratör sunucu katalog ve snapshot testleriyle doğrulandı.
- [x] Port döndürme, 15 saniye kilidi, savaş sonucu, sayaç donması ve maç sonu komut reddi gerçek istemci başlangıç testiyle doğrulandı.
- [x] 1–6 enerji tüketicili `43.795` kombinasyon yeniden tarandı.
- [x] 6 arketiple `30` mirrored BattleEngine maçı yeniden çalıştırıldı; timeout oluşmadı.
- [x] Ayrıntılı çıktı: `qa_reports/beta24_energy_port_report.json`.
- [x] Sunucu otomasyon paketi: `629` test başarılı.
- [x] 1366×768 gerçek tarayıcı kontrolünde ana menü, üç kolonlu hazırlık ve savaş görünümü sayfa taşması olmadan tek viewport'a sığdı.
- [x] Gerçek tarayıcı akışında Yerel AI otoritesi `server`, raf kilidi `Aktif`, port dönüşü `aşağı → sol`, sonuç modalı ve sabit kalan `01:06.0` savaş süresi doğrulandı.
- [x] Tarayıcı yenilemelerindeki eşzamanlı oyuncu bootstrap kayıtları dosya kilidiyle seri hale getirildi; Windows geçici dosya çakışması için regresyon testi eklendi.

---

# 9.20 — GRIDSHARD 2.0.0-beta.25 Shardglass Kimliği, Shard Pulse, Kısa Viewport UX ve Savaşı Bırakma

## Gereksinim ve referans araştırması
- [x] `Öneri ve Düzenleme.docx` paragraf içeriği ve üç gömülü Beta.24 ekran görüntüsü gereksinim verisi olarak incelendi.
- [x] Kanonik karar kaynağı bu `docs/YOL_HARITASI.md` dosyası olarak korundu.
- [x] Backpack Battles, FTL, Into the Breach ve Opus Magnum resmî ürün sayfaları; hazırlık/savaş ayrımı, grid okunabilirliği, enerji sistemleri ve bağlantı estetiği açısından karşılaştırıldı.
- [x] Referanslardan doğrudan tema/renk/müzik kopyalanmadı; ayrışma kararları `docs/BRAND_IDENTITY.md` içinde kaydedildi.

## Shardglass görsel kimliği
- [x] Kimlik adı `Shardglass Relay` olarak sabitlendi.
- [x] Obsidyen cam yüzey, mint flux, diyagonal kırık dikişi ve reactor-gold CTA oranı tanımlandı.
- [x] Modül sınıf renkleri semantik olarak korunurken ana enerji rengi `#35E5D2` mint flux'a taşındı.
- [x] Panel köşe dili `3px / 18px` diyagonal Shardglass geometrisine bağlandı.
- [x] Azaltılmış hareket tercihi mevcut kritik animasyonları durdurmaya devam eder.

## Ana menü geometri düzeltmesi
- [x] Shard Core merkezi ve yörüngeler aynı `top:50%` eksenine sabitlendi.
- [x] Çekirdek pulse animasyonu `translate(-50%,-50%)` dönüşümünü bütün keyframe'lerde korur; merkez karesi aşağı kaymaz.
- [x] `GRIDSHARD` ve `CORE ARENA` tek wordmark kutusuna alındı.
- [x] `CORE ARENA` sağ kenarı wordmark genişliğiyle sınırlıdır; `GRIDSHARD` içindeki `D` harfini geçmez.

## Hazırlık ekranı kısa viewport kabulü
- [x] Hazırlık shell'i masaüstünde `100dvh` flex çalışma alanıdır.
- [x] Üç kolon kendi içinde küçülür/kayar; sayfanın tamamı aşağı taşmaz.
- [x] `Eşleştir` aksiyon satırı panel tabanına sticky olarak sabitlendi.
- [x] Zorunlu gerçek tarayıcı hedefleri `1366×768` ve `1366×630` olarak belirlendi.

## Savaşı bırakma ve ceza
- [x] `Savaşı Bırak` oyuncu adının altında savaş HUD'ına eklendi.
- [x] Komut Online PvP ve sunucu otoriteli Yerel AI için normal motor komut kuyruğundan `forfeit_battle` olarak ilerler.
- [x] Bırakan oyuncu otomatik kaybeder; rakip kazanan olarak sonuç snapshot'ına yazılır.
- [x] Ceza, `toplam kazanılan Devre Kredisi - başlangıç kredisi` ile hesaplanır.
- [x] Mevcut bakiye cezadan düşükse bakiye sıfırda kalır; negatif kredi üretilmez.
- [x] Kaçış komutunun kabul edildiği tick'ten sonra savaş, gelir ve saat ilerlemez.
- [x] Kaçış cezası private snapshot, sonuç özeti, olay kaydı ve maç analizinde görünür/audit edilebilir.

## Sonuç akışı
- [x] `Hazırlık Ekranına Dön` sonuç analizinin altında eklendi; mevcut 18 modüllük seçim korunarak hazırlığa döner.
- [x] `Tekrar Maç` doğrudan rematch davranışını korur.
- [x] Yerel offline geliştirme fallback'i aynı kayıp/ceza davranışını simüle eder; ürün gerçeği sunucu otoritesi olarak kalır.

## Özgün müzik kimliği
- [x] `Shard Pulse` ses imzası `3+3+2` kapı ritmi ve `D–A–C–F` Shard motifiyle tanımlandı.
- [x] Menü, hazırlık, savaş ve kritik Çekirdek için dört özgün 32 sn stereo V5 katmanı üretildi.
- [x] Runtime `shardglass-mix-v5` dosyalarına bağlandı; 1200 ms crossfade korundu.
- [x] Peak headroom ve loop seam otomatik testle doğrulanır.
- [x] Final LUFS/True Peak mastering hedefi seçildi iddiası yoktur.

## Beta.25 kalite kapısı
- [x] Motor kaçış cezası, negatif olmayan bakiye, kazanan/kaybeden ve saat donması testleri eklendi.
- [x] HTML/CSS/istemci handler ve sonuç→hazırlık regresyon testleri eklendi.
- [x] Shardglass V5 ses dosyası/runtime testleri eklendi.
- [x] `qa_reports/beta25_acceptance_report.json` kabul raporu eklendi.
- [x] Tam Python + JavaScript + startup + HTTP smoke zinciri başarıyla çalıştırıldı; `qa_reports/latest.json` güncellendi.
- [x] `1366×768` ve `1366×630` gerçek tarayıcı viewport kanıtı `qa_reports/beta25_browser_viewports.json` olarak kaydedildi.

---

# 9.21 — Beta.25 Sonrası Mobil Üretim Hazırlığı

Kullanıcı tarafından belirlenen yedi adım sırasıyla işlendi:

1. [x] HMAC erişim token'ı, cihaz kimliği, HTTP/WebSocket kimlik doğrulaması ve oyuncuya özel PvP olay/snapshot redaksiyonu eklendi.
2. [x] Mobil savaş portre/yatay tek viewport düzene alındı; sürükle-bırak korunurken dokun-seç/yerleştir, döndür, rafa al ve seçim iptali eklendi.
3. [x] PostgreSQL veri katmanı, Redis koordinasyonu, periyodik oturum temizleme, HTTP rate limit ve motor komut backpressure eklendi. Üretim modu bu bağımlılıklar olmadan başlamaz.
4. [x] İki bağımsız istemcili PvP Playwright testi, Android Chrome/iPhone Safari emülasyon matrisi ve BrowserStack gerçek cihaz iş akışı eklendi.
5. [x] İstemci ekran denetleyicisi ile savaş board/module/mobile bileşenleri ayrı dosyalara çıkarıldı.
6. [x] Yerleşik Başlangıç Devresi ve üç adımlı etkileşimli eğitim eklendi.
7. [x] Capacitor mobil paket katmanı, HTTPS API yönlendirmesi, CORS yapılandırması ve Android kapalı test → iOS/TestFlight sıra kapısı eklendi.

Kanıt sınırı:

- [x] Yerel gerçek Chromium çift istemci PvP testi geçti.
- [x] Android Chrome emülasyonunda mobil savaş ve eğitim E2E kapsamı eklendi.
- [~] Fiziksel Android/iPhone iş akışı kodda hazırdır; BrowserStack secrets olmadan kanıt üretmez.
- [~] Mağaza yüklemesi kodla tamamlanmış sayılamaz; kalıcı app id, üretim HTTPS backend'i, imzalı AAB/IPA, geliştirici hesapları ve tester grupları dış girdidir.
- [x] `tools/mobile_release_gate.py`, Android kapalı test kanıtı bulunmadan TestFlight adımını reddeder.
- [x] Dürüst yerel/harici kanıt özeti `qa_reports/beta25_mobile_readiness_implementation.json` içinde kaydedildi.

Ayrıntılı operasyon akışı: `docs/MOBILE_RELEASE_RUNBOOK.md`.

---

# 10. Beta.26 Paketi

**`GRIDSHARD 2.0.0-beta.26 — Canlı Telemetri Sertleştirmesi + Görsel Erişilebilirlik + Bağlantı Hata Akışı`**

Bu paket, başlıktaki telemetri/erişilebilirlik/bağlantı çalışmalarına ek olarak 21 Ağustos 2026 hazırlık ve savaş geri bildirimlerini içerir:

1. [x] Hazırlık ekranındaki `Yerel AI Testi / Online PvP` ayrımı kaldırıldı; `Oyna` tek çevrimiçi hazırlık akışını açar.
2. [x] İnsan rakip araması 10 saniye sürer; bulunamazsa sunucu normal iki oyunculu PvP oturumuna AI slotu bağlar. AI maçı istemci sahte savaşı değil aynı `BattleEngine` ve PvP protokolünü kullanır.
3. [x] Canlı tick koşucusu işaretli AI oyuncular için 5 saniyelik karar aralığında gerçek `place_module / replace_module / booster` komutları üretir; AI ilk devresi de normal enerji ve saldırı simülasyonunda çalışır.
4. [x] Hazır Savaş Havuzları küçük, yüksekliği kısıtlı şeritten geniş modal yönetim alanına taşındı.
5. [x] Başlangıç devresi dört aktiftir: Çekirdek ve Jeneratör sistem tarafından sabitlenir, diğer iki modülü oyuncu 18'lik havuzundan seçer. Aynı seçim hem çevrimiçi hem sunucu AI maçına gönderilir.
6. [x] `15–25: 4`, `25–35: 5`, `35–45: 6` kapasite çizelgesi sunucu ve istemci tarafında birlikte uygulanır. Bekleyen yerleştirme komutları istemcide kapasiteye dahil edilir; böylece aynı aralıkta sınırsız raf sürükleme kuyruğu oluşmaz.
7. [x] Yeni yerleştirilen/değiştirilen modül çalışan enerji hattına otomatik yöneltilir. Enerji hattına port bağlantısı kurulamıyorsa sessizce etkisiz kalmak yerine komut açıklamalı olarak reddedilir.
8. [x] Modül değişimi kapasiteyi artırmadığı için aynı zaman diliminde, Devre Kredisi yettiği sürece sınırsız kalır.
9. [x] `BASLAT_WEB_TEST.bat` Python bulma, eksik bağımlılık tamamlama, sürüm bütünlüğü ve port çakışması tanısıyla sertleştirildi.
10. [x] Beta.26 kabul raporu; tek eşleştirme, AI devralma, geniş havuz yöneticisi, başlangıç seçimi, kapasite/aktivasyon ve web başlatıcı kontrollerini kapsar.

Doğrulama sınırı:

- [x] Sunucu/istemci birim ve entegrasyon testleri bu kuralları kapsar.
- [x] Yerel Windows üzerinde gerçek Chromium iki istemcili PvP; Android Chrome ve iPhone WebKit/Safari emülasyonunda mobil savaş + eğitim/AI devralma matrisi `5/5` geçti. Kanıt: `qa_reports/browser_e2e_evidence_summary.json`.
- [ ] Fiziksel Android/iPhone ile başka makineden içe aktarılan harici Windows/Chrome kanıtı ayrıca üretilmelidir; emülasyon fiziksel cihaz kanıtı sayılmaz.
- [ ] Gerçek kullanıcı telemetrisi oluşmadan sayısal enerji dengesi otomatik değiştirilmez.

Kural:
- savaş başladıktan sonra hiçbir UI etkileşimi simulation clock'u durduramaz,
- online PvP ve Yerel AI için nihai savaş gerçeği sunucu otoritelidir,
- sayısal denge ve mastering hedefleri ayrı kullanıcı kararlarıdır.

---

# 11. Güncel Paket

**`GRIDSHARD 2.0.0-beta.27 — P5 Savaş Okunabilirliği · Canlı Enerji Akışı · Silah Kimliği`**

Beta.27, Beta.26'nın tek eşleştirme, sunucu AI devralma, combat/pool hotfix, Redis koordinasyonu, maç sonucu/analiz akışı ve port guard temellerini korur. Sayısal savaş veya enerji dengesi değiştirilmeden aşağıdaki okunabilirlik katmanı eklenmiştir:

1. [x] Oyuncu ve rakip kartları, sunucunun `is_powered / energy_received / energy_required` snapshot gerçeğini kullanır; çevrimiçi oyuncu aktarımındaki eksik enerji alanları tamamlandı.
2. [x] Enerji alan modüllerde hareketli mint akım taneleri, çevre hattı, güçlenen simge ve anlık `AKIŞ n Ü` rozeti görünür. Jeneratör `KAYNAK n Ü`, enerjisiz tüketici `ENERJİ YOK` olarak ayrılır.
3. [x] Lazer, Darbe Topu, Ray Topu, Füze Fırlatıcı, Dron Üssü ve Ark Topu için ayrı renk, hız, mermi/ışın biçimi ve namlu geri bildirimi tanımlandı.
4. [x] Her atış gerçek kaynak kartın merkezinden çıkar, hedef kartın hesaplanan merkezine kadar ilerler ve ulaşma anında ayrı flaş, halka, kıvılcım ile hedef kart darbesi üretir.
5. [x] Altı saldırı modülü için birbirinden farklı, deterministik olarak yeniden üretilebilir özgün ateş sesleri eklendi; dosyalar `44.1 kHz`, kısa SFX ve yaklaşık `-3 dBFS` tepe hedefindedir.
6. [x] Azaltılmış hareket tercihi enerji, mermi ve çarpma animasyonlarını da kapsar.
7. [x] Yarım kalmış `.venv` klasörü artık yalnız `python.exe` varlığıyla hazır sayılmaz; `pyvenv.cfg` doğrulamasıyla başlatıcı akışı güvenli biçimde tamamlar.
8. [x] Beta.27 kabul raporu sürüm bütünlüğü, Beta.26 savaş temelleri, enerji akışı, hedefe ulaşan efektler, altı ayrı ses, port/venv guard ve azaltılmış hareket kontrollerini kapsar.

Doğrulama sınırı:

- [x] Sunucu/istemci birim ve entegrasyon testleri ile gerçek masaüstü Chromium savaş akışı doğrulandı.
- [~] Gerçek 20 aktif modüllü uzun süreli PvP karmaşa/soak testi ayrıca genişletilecektir; mevcut tipik savaş yükü doğrulanmıştır.
- [ ] Fiziksel Android/iPhone kanıtı harici cihaz ve hesap girdileri olmadan tamamlanmış sayılmaz.
- [ ] Gerçek kullanıcı telemetrisi oluşmadan sayısal enerji dengesi otomatik değiştirilmez.

---

# 12. Güncel Paket — Beta.28

**`GRIDSHARD 2.0.0-beta.28 — Enerji Motoru Doğruluğu · Dengeli Tempo · Ensemble Menü Kimliği`**

Beta.28, önceki port guard ve sunucu otoriteli savaş temelini korurken kullanıcı denemesindeki enerji bağlantısı, görsel tempo, müzik ve dil bulgularını kaynakta çözer:

1. [x] Taşıma/değiştirme doğrulamasındaki eski modülü enerji topolojisinde tutan “hayalet köprü” kaldırıldı. Modül yeni hücrede Jeneratöre gerçekten erişemiyorsa komut kredi harcanmadan reddedilir; erişebiliyorsa doğru porta otomatik yönelir.
2. [x] Snapshot, tanımın sabit port sayısı yerine güçlendiriciler dahil gerçek port sayısını ve yönlerini gönderir. İstemci motorun gönderdiği portları kullanır.
3. [x] Sunucu her aktif tüketici için `powered`, `port_disconnected`, `insufficient_supply`, `emp_disabled` veya `line_disrupted` enerji nedenini üretir.
4. [x] Hareketli port/çevre akım taneleri kaldırıldı. Enerjili kart sabit konumda yumuşak parlama/sönme yapar; enerjisiz kart kırmızıya döner. Üzerine gelme/klavye odağı, enerjisizlik nedenini ve ihtiyaç/gelen enerji miktarını açıklar.
5. [x] 5. modül 15. saniyede korunur; 6–10. yuvalar `30/45/60/75/90`. saniyelerde açılır. İlk güçlendirici 105. saniyede, sonraki teklifler 30 saniyede bir gelir ve bekleyen teklif yığılmaz.
6. [x] Menü ve hazırlık müzikleri; pad, bass, reactor kick, clap, hi-hat, glass arpeggio ve synth lead katmanlı özgün 32 saniyelik stereo V6 ensemble düzenlemelere taşındı.
7. [x] Türkçe varsayılan dil korunurken İngilizce menü, hazırlık, savaş, sonuç, durum ve modül terimleri için iki yönlü yerelleştirme katmanı eklendi; sonradan üretilen arayüz metinleri de seçili dile çevrilir.
8. [x] Beta.27 saldırı mermisi/çarpma efektleri, altı ayrı ateş sesi, galibiyet kutlama müziği, Redis eşleştirme, post-match/analiz ve Beta.26 port guard korunur.

Doğrulama sınırı:

- [x] Hayalet köprü reddi, otomatik yön/enerji alma, gerçek port snapshot'ı, enerji nedeni, 15 saniyelik kapasite ritmi, 30 saniyelik güçlendirici ritmi, V6 ses dosyaları ve çeviri sözlüğü otomatik test kapsamındadır.
- [x] Tam otomasyon `685` sunucu testi ile istemci, startup, bileşen, ses ve i18n testlerini geçti; tek-komut QA zincirindeki `20` adımın tamamı başarılıdır.
- [x] Gerçek Chromium'da İngilizce ana menü/Ayarlar/hazırlık akışı ile canlı savaşta `0` hareketli enerji göstergesi, `none` port animasyonu ve sabit `gs-energy-presence` parlama durumu doğrulandı.
- [~] 20 aktif modüllü uzun süreli PvP karmaşa/soak testi genişletilmeye devam edecektir.
- [ ] Fiziksel Android/iPhone kanıtı harici cihaz ve hesap girdileri olmadan tamamlanmış sayılmaz.
- [ ] Gerçek kullanıcı telemetrisi olmadan enerji üretim/tüketim sayıları otomatik değiştirilmez.

---

# 13. Güncel Paket — Beta.29

**`GRIDSHARD 2.0.0-beta.29 — Kompakt Simgeli Hazırlık · Yol Haritası E2E · Temiz Kaynak Paketi`**

Beta.29, Beta.28 enerji motoru, tempo, çok katmanlı müzik, port guard, Redis eşleştirme, sonuç/analiz ve savaş FX temellerini koruyarak hazırlık okunabilirliğini ve sürüm hijyenini ilerletir:

1. [x] Global Modüller ve Seçilen Savaş Havuzu, savaş alanıyla aynı kanonik modül simgesi sözlüğünü kullanır.
2. [x] Her iki havuz kategori içinde iki sütunlu kompakt kartlara dönüştürüldü; isim, sınıf, HP çizgisi ve `+ / ✓ / ◆ / −` eylem dili korunur.
3. [x] Dar ekranlarda kart düzeni kontrollü biçimde tek sütuna iner; açılır-kapanır sınıf yapısı ve klavye/erişilebilirlik adları korunur.
4. [x] Yol haritasındaki Ana Menü → Oyna / Profil / İstatistikler / Ayarlar ve geri dönüş senaryosu masaüstü Chromium E2E kapsamına eklendi.
5. [x] Çalışma zamanında referansı kalmayan 10 eski V1–V5 ses kopyası, eski sürüme bağlı dört kabul koşucusu, V4 ses testi ve kök üretim manifesti temizlendi; yaklaşık 18,36 MB gereksiz kaynak çıkarıldı.
6. [x] Paketleyici tüm eski/kalan sürüm ZIP'lerini desenle dışlar ve `--output-dir` ile kaynak klasörünü kirletmeden teslim klasörüne paket üretebilir.
7. [x] Beta.29 kabul kapısı kompakt simge kartlarını, dört ekran E2E kaynağını, temiz ses envanterini, sürüm bütünlüğünü ve önceki savaş temellerini birlikte denetler.

Doğrulama sınırı:

- [x] İstemci/sunucu otomasyonu, gerçek masaüstü Chromium hazırlık görünümü ve paket içeriği doğrulanır.
- [~] 20 aktif modüllü uzun süreli PvP karmaşa/soak testi genişletilmeye devam edecektir.
- [ ] Fiziksel Android/iPhone kanıtı harici cihaz ve hesap girdileri olmadan tamamlanmış sayılmaz.
- [ ] Gerçek kullanıcı telemetrisi olmadan sayısal enerji dengesi otomatik değiştirilmez.

---

# 14. Güncel Paket — Beta.30

**`GRIDSHARD 2.0.0-beta.30 — PvP Dayanıklılığı · 10+10 Okunabilirlik · Gelişmiş İstatistikler · Kanonik Yol Haritası`**

Beta.30, Beta.29'un temiz kaynak ve kompakt hazırlık temellerini koruyarak yayın öncesi güvenilirlik ve oyuncu geri bildirimi katmanını tamamlar:

1. [x] Aktif PvP savaşında WebSocket kopması, yeniden bağlanma snapshot'ı, son komut sıra numarası ve kaldığı yerden devam gerçek iki tarayıcı senaryosuna bağlandı.
2. [x] Maç sonucu sonrasında iki oyuncunun eski sonuç/kurulum durumunu taşımadan yeni oturum kimliğiyle yeniden eşleşmesi doğrulandı.
3. [x] 50 ardışık PvP bitiş/TTL temizlik döngüsü sızıntısız oturum yaşam kapısına eklendi.
4. [x] İki devrede 10'ar aktif modülün sunucu snapshot'ında görünmesi ve üç masaüstü viewportunda kart/hücre/sayfa taşması otomatik test edilir.
5. [x] İstatistikler ekranı; maç kaydı, galibiyet oranı, ortalama süre, toplam hasar, modül değişimi, güçlendirici kullanımı ve simgeli en çok kullanılan modüllerle genişletildi.
6. [x] Kanonik yol haritasındaki Beta.6 kontrol listesi, eski `85 + 10 sn` güçlendirici bilgisi, PvP/mobil doğrulama ve PostgreSQL migration durumu çalışan kaynaklarla eşleştirildi.
7. [x] Beta.30 kabul raporu sürüm bütünlüğünü, özellik kaynaklarını, tarayıcı senaryolarını ve 50 oturumluk soak sonucunu tek makine-okunur raporda birleştirir.

Doğrulama sınırı:

- [x] Beta.30 Playwright matrisi gerçek Chrome/WebKit süreçlerinde `8/8` geçti ve makine-okunur kanıt raporuna bağlandı.
- [ ] Fiziksel Android/iPhone kanıtı harici cihaz ve hesap girdileri olmadan tamamlanmış sayılmaz.
- [ ] Gerçek kullanıcı telemetrisi olmadan sayısal enerji/kredi dengesi otomatik değiştirilmez.

---

# 15. Güncel Paket — Beta.31

**`GRIDSHARD 2.0.0-beta.31 — Savaş İçi Modül Takası · Akıllı Port Yönlendirme · 7 Katmanlı Gerilim Müziği`**

Beta.31, Beta.30'un PvP dayanıklılığı, 10+10 okunabilirliği, gelişmiş istatistikleri ve önceki tüm savaş/sonuç temellerini koruyarak savaş içi devre müdahalesini ve müzik yoğunluğunu geliştirir:

1. [x] Oyuncunun bir aktif modülü başka bir aktif modülün üzerine bırakması, iki kartı rezerv durumuna geçirmeden konumlarını atomik olarak değiştirir.
2. [x] Rezerv modülün aktif modül üzerine bırakılması önceki davranışı korur: gelen modül devreye alınır, çıkan modül Can değerini koruyarak rafa döner.
3. [x] Çekirdek ve Jeneratör normal modül takasının dışındadır; sabit/özel konum kuralları istemci ve sunucuda birlikte korunur.
4. [x] Takas sırasında iki modülün 16 yön kombinasyonu sunucuda sınanır; ikisini de Jeneratöre bağlayan, en çok modülü ve çalışan port çiftini koruyan düzen otomatik seçilir. Geçersiz takas kredi veya konum değişmeden reddedilir.
5. [x] Normal yerleştirme, taşıma ve rezerv değişiminde de port seçimi yalnız ilk çalışan yönü değil, Jeneratörden erişilebilen en geniş devreyi koruyan yönü seçer.
6. [x] Savaş alanındaki döndürülebilir aktif modüle tıklama, 15. saniyelik kanonik kilitten sonra saat yönünde port dönüş komutu gönderir; sürükleme takas davranışından ayrıdır.
7. [x] Savaş müziği 128 BPM ve 32 saniyelik ortak döngüde yedi ayrı özgün stem'e ayrıldı: sub, reaktör pulse, endüstriyel perküsyon, ostinato, shard transient, disonans ve pressure.
8. [x] Yedi stem savaş başlangıcında eşzamanlı başlar; savaş baskısı, kritik Çekirdek ve ses ayarları katman kazançlarını çalışma zamanında yönetir. Menü, hazırlık, galibiyet, mağlubiyet ve saldırı modülü SFX kimlikleri korunur.
9. [x] Sunucu motor testi atomik takası/geri almayı ve Jeneratör erişimini; istemci testi komut ayrımını; gerçek masaüstü tarayıcı testi sürükle-takas ve tıkla-döndür akışını doğrular.

Doğrulama sınırı:

- [x] Yedi stem kaynak üreticisi ve WAV biçim/uzunluk/peak-headroom kontrolleri otomatik test kapsamındadır.
- [x] Beta.30'un yeniden bağlanma, rematch, 50 oturumluk yaşam döngüsü ve 10+10 viewport kapıları korunur.
- [x] Birleşik kalite kapısı `694/694` sunucu ve `176/176` istemci testini geçti.
- [x] Gerçek Chrome/WebKit Playwright matrisi `9/9` geçti: masaüstü `5/5`, Android Chrome `2/2`, iPhone Safari/WebKit `2/2`.
- [ ] Fiziksel Android/iPhone üzerinde uzun savaş ve kulaklık/hoparlör miks değerlendirmesi harici cihaz kanıtı olmadan tamamlanmış sayılmaz.
- [ ] Final LUFS/True Peak mastering hedefi insan kararı olmadan tamamlanmış sayılmaz.

---

# 16. Güncel Paket — Beta.32

**`GRIDSHARD 2.0.0-beta.32 — Kesintisiz Müzik · Erişilebilir Güçlendirici · Dengeli Yerel AI · Sabit Savaş Rafı`**

Beta.32, Beta.31'in atomik modül takası, akıllı port yönlendirme ve yedi katmanlı savaş müziğini korurken oyuncu denemesindeki ses geçişi, güçlendirici erişimi, savaş yerleşimi, enerji okunabilirliği ve istatistik bulgularını çözer:

1. [x] Ana Menü ve hazırlık müzikleri aynı 32 saniyelik tempo/loop ızgarasına taşındı; ekran geçişinde çalan parça fazı korunur, yarışan ses fade zamanlayıcıları iptal edilir ve “plak takılması” benzeri üst üste binme engellenir.
2. [x] Menü/hazırlık WAV üretimindeki sessiz başlangıç-bitiş penceresi kaldırıldı. Son örnek ilk örneğe dikişlenerek yeniden başlatmada duyulur boşluk bırakmayan gerçek sürekli döngü üretildi.
3. [x] Güçlendirici paneli savaşta gizlenen bağımsız alandan modül rafının görünür üst bölümüne alındı. İlk teklif `30.` saniyede, devam teklifleri 30 saniyede bir açılır; seçim ve uygulama gerçek sunucu komutlarıyla işlenir.
4. [x] Masaüstü savaş kabuğu viewport yüksekliğine kilitlendi; modül rafı kendi içinde kayar ve 1366×630 gibi kısa ekranlarda alt tarafı ekran dışına taşmaz.
5. [x] Enerji alan modüllerin parlama/sönme genliği artırıldı; kırmızı enerjisiz durum ve açıklayıcı hover/odak bilgisi korunur. Hareketli port animasyonu geri getirilmedi.
6. [x] İstatistiklerde zorunlu Çekirdek ve Jeneratör “Devre Alışkanlığı” listesinden hem yeni kayıt hem eski kalıcı veri gösteriminde çıkarıldı.
7. [x] Yerel AI, tek saldırı modülünde savunmaya aşırı yığılmadan önce ikinci çalışan saldırı temelini kurar; sonrasında rakip tehdidine karşı savunma/sabotaj karşılıklarını kullanmaya devam eder.
8. [x] Dört kanonik düzenin 12 maçlık aynalı motor taramasında tüm maçlar çözüldü; saldırı ağırlıklı düzen yalnız `2/12` galibiyet aldı. Bu nedenle genel hasar/HP sayılarına kanıtsız küresel müdahale yapılmadı; gözlenen kısa maçların ana nedeni zayıf yerel AI açılışı ve 105. saniyelik erişilemez güçlendirici zamanlaması olarak düzeltildi.

Doğrulama sınırı:

- [x] Sürüm bütünlüğü, loop dikişi, 30 saniyelik sunucu güçlendiricisi, gerçek booster komutları, istatistik filtresi, iki saldırılı AI temeli, enerji pulse CSS'i ve kısa viewport rafı otomatik kapsam altındadır.
- [x] Beta.31'in modül takası, tıkla döndürme, akıllı port ve yedi senkron savaş müziği katmanı korunur.
- [x] Birleşik kalite kapısı `697/697` sunucu, `176/176` istemci ve `20/20` QA adımını geçti; gerçek tarayıcı matrisi masaüstü `6/6`, Android Chrome `2/2`, iPhone Safari/WebKit `2/2` olmak üzere `10/10` başarılıdır.
- [ ] Fiziksel Android/iPhone uzun savaş ve kulaklık/hoparlör miks değerlendirmesi harici cihaz kanıtı olmadan tamamlanmış sayılmaz.
- [ ] Gerçek oyuncu telemetrisi oluşmadan küresel hasar, Can veya enerji değerleri otomatik değiştirilmez.

---

# 17. Beta.32 Fix.1

**`GRIDSHARD 2.0.0-beta.32-fix.1 — Sabit Port/Simgeler · Belirgin Güçlendiriciler`**

Beta.32 Fix.1, Beta.32'nin motor, müzik, AI, güçlendirici zamanlaması ve viewport iyileştirmelerini koruyan hedefli bir savaş görünümü düzeltmesidir:

1. [x] Enerji parlamasının doğrudan kart çocuklarına `position:relative` uygulaması kaldırıldı. Portlar enerji varken/yokken her zaman kart kenarına bağlı mutlak konumda kalır.
2. [x] Üst/sağ/alt/sol port merkezleri kartın ilgili kenar orta noktasına `translate` tabanlı kesin koordinatla sabitlendi; güçlendiriciyle eklenen portlar da aynı geometriyi kullanır.
3. [x] Modül simgesi tek ve sabit grid hücresine kilitlendi. Enerji rozeti, enerjisiz bilgi katmanı ve HP değişimi simgenin akış konumunu değiştirmez.
4. [x] Hasar ve ateş animasyonlarındaki kartı ölçekleyen/yatay taşıyan dönüşümler kaldırıldı. Enerji, darbe ve ateş geri bildirimi artık yalnız parlaklık, doygunluk ve gölgeyle verilir; kart, simge ve port geometrisi hareket etmez.
5. [x] Güçlendirici paneli ve seçenekleri büyütüldü. Kilitli durum daha okunur; teklif açıldığında altın çerçeve/gölge, `HAZIR` durumu ve tam opak büyük düğmeler; hedef seçiminde turkuaz seçili vurgusu gösterilir.
6. [x] 1366×630 gerçek tarayıcı regresyonu enerji aç/kapat, hasar ve ateş anlarında kart/simge/port koordinat farkını en fazla `0,75 px` olarak doğrular; dört portun ilgili kenar merkezinde olduğunu ve güçlendirici düğmelerinin en az 40 px yüksekliğini denetler.

Doğrulama sınırı:

- [x] Beta.32 kabul kapıları ve önceki tüm motor testleri korunur.
- [ ] Fiziksel cihaz piksel yoğunluğu ve tarayıcı ölçek ayarları harici cihaz kanıtı olmadan tamamlanmış sayılmaz.
