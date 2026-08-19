# GRIDSHARD 2.0 — YOL HARİTASI

**Güncel Sürüm:** `2.0.0-beta.21`  
**Paket:** Gerçek Windows E2E Sonuç İçe Aktarımı + UX Etkileşim Matrisi + Denge Review Karar Akışı  
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
- [x] Devreden çıkarılan modül Can değerini korur; diğer maç içi durumlar da savaş saatiyle korunacak şekilde modellenmiştir.
- [x] Sürüklenmekte olan aktif modül, bırakma komutu motor tarafından kabul edilene kadar savaşta kalır.
- [x] 24 global seçenekten 18 modüllük Savaş Havuzu kullanılır; maksimum 10 aktif modül vardır.
- [x] Çekirdek, Jeneratör, enerji akışı, port bağlantıları ve devre kurma GRIDSHARD kimliğinin temelidir.
- [x] Kullanıcıya görünen oyun/modül terimleri Türkçedir.
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

Kaynak yol haritasında ileriki bir `FAZ 22 — Eğitim` vardır; ancak ilk sürüm kapsam kararı yalnızca **Oyna / Profil / İstatistikler / Ayarlar** alanlarına zaman ayrılmasını söyler. Bu nedenle:

- [ ] Eğitim henüz uygulanmayacak.
- [x] Beta Web testi için Eğitim alanı bilinçli olarak kapsam dışında tutuluyor.

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

**Durum:** Motor tarafı tamamlandı; gerçek tarayıcı oynanış doğrulaması Beta.6 sonrası yeniden yapılacak.

## FAZ 3 — Modül Rafı ve Sürükle-Bırak

- [x] Savaş alanıyla aynı ekranda Modül Rafı yapısı var.
- [x] İlk 15 saniye kilit kuralı var.
- [x] Raftan sahaya sürükle-bırak komutu var.
- [x] Sahadan rafa alma var.
- [x] Hücreler arası taşıma var.
- [x] Modül üzerine bırakıp değiştirme komutu var.
- [x] Ayrı ekonomik onay düğmeleri yok.
- [~] 18 modülün gerçek telefon/dar ekran kullanılabilirliği manuel UX testi bekliyor.

**Durum:** İşlevsel altyapı tamam; kullanılabilirlik doğrulaması sürüyor.

## FAZ 4 — Zaman Bazlı Aktif Modül Kapasitesi

- [x] `0–15 sn`: başlangıç düzeni.
- [x] `15–25 sn`: 4.
- [x] `25–35 sn`: 5.
- [x] `35–45 sn`: 6.
- [x] `45–55 sn`: 7.
- [x] `55–65 sn`: 8.
- [x] `65–75 sn`: 9.
- [x] `75 sn+`: 10.
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

## FAZ 13 — 85+ Saniye Güçlendirici Döngüsü

- [x] İlk teklif `85.000 ms`.
- [x] Sonraki teklifler `10.000 ms` aralıkla.
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
- [~] 20 aktif modüllü gerçek PvP ekranında karmaşa/taşma testi tamamlanmadı.
- [~] Saldırı kaynak/hedef efektlerinin gerçek tarayıcı okunabilirliği manuel test bekliyor.

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
- [~] İki gerçek tarayıcı/iki gerçek oyuncu ile uzun süreli stabilite testi henüz kanonik olarak tamamlanmadı.

**Durum:** Teknik altyapı tamam; gerçek çift istemci doğrulaması bekliyor.

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
- [~] En sık kullanılan modüller, toplam hasar, değişim/booster kullanımının ürün ekranındaki nihai sunumu geliştirilmeye açık.

## FAZ 21 — Ayarlar

- [x] Ses.
- [x] Müzik.
- [x] Titreşim.
- [x] Grafik kalitesi.
- [x] Dil.

**Durum:** İlk sürüm hedefi tamam.

## FAZ 22 — Eğitim

- [ ] Bilinçli olarak ertelendi. İlk sürüm kapsam kilidi nedeniyle şu anda geliştirilmeyecek.

## FAZ 23 — Web Test Sürümü

- [x] FastAPI aynı origin üzerinden Web istemcisini servis ediyor.
- [x] Health / preflight / launch-readiness / operation monitoring altyapısı mevcut.
- [x] Telemetri ve test-run audit altyapısı mevcut.
- [x] Beta geri bildirim ve bulgu katmanları mevcut.
- [x] Tek oyunculu oynanabilir test modu mevcut.
- [x] **Beta.5'te ana menüyü tamamen kilitleyen gerçek JS başlangıç hatası Beta.6'da düzeltildi:** `PORT_COUNT_BY_NAME`, tanımlanmadan önce kullanılıyordu.
- [x] İkinci başlangıç sırası riski düzeltildi: telemetri callback'i `telemetryStatus` tanımlanmadan tetiklenebiliyordu.
- [x] Beta.6 ile gerçek `app.js` başlangıç yürütme testi eklendi; dört ana menünün click-handler bağlanması otomatik kontrol ediliyor.
- [x] Tek komutla Python + JS + startup + gerçek Uvicorn HTTP smoke QA zinciri eklendi.
- [~] Gerçek kullanıcı manuel oynanış testi Beta.6 ile yeniden başlatılacak.

**Durum:** Stabilizasyon sonrası gerçek test için yeniden hazır.

## FAZ 24 — Android ve iOS

- [ ] Web mekanikleri ve PvP doğrulanmadan Android'e geçilmeyecek.
- [ ] Android doğrulandıktan sonra iOS değerlendirilecek.

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

## Alembic

- [ ] Şimdilik eklenmedi.

**Gerekçe:** Mevcut Beta kalıcılık yapısı ilişkisel veritabanı migration'ı kullanmıyor. Kullanılmayan Alembic katmanı test hızını artırmaz. PostgreSQL/SQLAlchemy kalıcı veri katmanına geçildiğinde Alembic aynı geçiş paketinde kurulacak.

---

# 6. Ana Kilometre Taşları — Gerçek Durum

### M1 — Kesintisiz Savaş
- [x] Tamamlandı.

### M2 — Dinamik Devre
- [x] Motor/istemci komut altyapısı tamamlandı.
- [~] Gerçek kullanıcı sürükle-bırak testi Beta.6 ile yeniden doğrulanacak.

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
- [x] 85+ saniye döngüsü.
- [x] 3 seçenekten 1 seçim.
- [x] Hedef modül.
- [x] Savaş durmadan uygulama.

### M7 — Rekabetçi Çekirdek
- [~] Simülasyon altyapısı var; 10k/50k/100k raporları eksik.
- [~] AI var; beş ayrı arketip eksik.
- [~] Online PvP teknik olarak var; gerçek iki istemci stabilite testi eksik.

**M7 henüz “stabil/tamamlandı” kabul edilmeyecek.**

### M8 — GRIDSHARD 2.0 Beta
- [x] Oyna.
- [x] Profil.
- [x] İstatistikler.
- [x] Ayarlar.
- [x] Telemetri/Web test altyapısı.
- [ ] Eğitim — ilk sürüm kapsamı nedeniyle bilinçli olarak ertelendi.
- [~] Gerçek oynanabilir Web doğrulaması Beta.6 manuel testiyle devam edecek.

---

# 7. Tamamlanan Son Paket

## 2.0.0-beta.21 — Stabilizasyon + Kanonik Yol Haritası Denetimi + QA Zinciri

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

## P0 — Beta.6 Gerçek Manuel Oynanış Doğrulaması

- [ ] `TEST_ET.bat` kullanıcının bilgisayarında başarıyla çalıştırılacak.
- [ ] `BASLAT_WEB_TEST.bat` ile site açılacak.
- [ ] Oyna menüsüne giriş doğrulanacak.
- [ ] Profil menüsüne giriş doğrulanacak.
- [ ] İstatistikler menüsüne giriş doğrulanacak.
- [ ] Ayarlar menüsüne giriş doğrulanacak.
- [ ] Tek Oyunculu Test Maçı başlatılacak.
- [ ] 15. saniyede Modül Rafı açılışı gözlenecek.
- [ ] Sürükle-bırak yerleştirme/çıkarma/değiştirme gerçek tarayıcıda denenecek.
- [ ] Devre Kredisi değişimi gerçek oynanışta gözlenecek.
- [ ] 85+ saniye güçlendirici döngüsü gerçek oynanışta gözlenecek.
- [ ] Galibiyet/mağlubiyet ve Tekrar Maç akışı doğrulanacak.

## P1 — Gerçek Tarayıcı E2E

- [ ] Yerel geliştirme makinesinde Playwright/Chromium E2E kurulacak.
- [ ] Ana Menü → dört ekran otomatik navigasyon testi yapılacak.
- [ ] Tek Oyunculu Test Maçı başlatma testi yapılacak.
- [ ] Tarayıcı `pageerror` ve `console.error` çıktıları test başarısızlığı sayılacak.

> ChatGPT çalışma ortamındaki Chromium yerel sayfalara yönetici politikasıyla erişemediği için Playwright burada zorunlu QA kapısına eklenmedi. Startup VM testi bu boşluğu geçici olarak kapatır.

## P2 — Online PvP Gerçek Çift İstemci Testi

- [ ] İki tarayıcı/iki oyuncu eşleştirme testi.
- [ ] Aynı savaş durumunun iki istemcide senkronizasyon testi.
- [ ] Yeniden bağlanma testi.
- [ ] Maç sonucu ve rematch testi.

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

- [ ] Gerçek 20 aktif modüllü PvP ekran testi.
- [ ] Enerjisiz/hasarlı/güçlendirilmiş modül görsel ayrımı.
- [ ] Saldırı kaynak/hedef okunabilirliği.
- [ ] Dar ekran/telefon Modül Rafı testi.

## Daha Sonra

- [ ] Eğitim — ilk kapsam kilidi kaldırıldığında.
- [ ] Android — Web savaş/PvP doğrulamasından sonra.
- [ ] iOS — Android sonrası.

---

# 7.1 — 2.0.0-beta.21 Gerçek Kullanıcı Test Bulguları ve Düzeltmeleri

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

# 7.2 — 2.0.0-beta.21 Yerel AI Oynanış Doğrulama Paketi

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

# 7.3 — 2.0.0-beta.21 Oyna Erişimi ve Stratejik Modül Seçimi

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

# 7.4 — 2.0.0-beta.21 Oyun Lobisi, Kapılar Arası Jeneratör ve Etki Görselleştirmesi

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

# 7.5 — 2.0.0-beta.21 Manuel Savaş Telemetrisi ve Denge Hazırlığı

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

# 7.6 — 2.0.0-beta.21 Denge İnceleme Merkezi ve Jeneratör Rota Analizi

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

# 7.7 — 2.0.0-beta.21 Hazır Savaş Havuzları, HP Görselleştirmesi ve Review-Ready Kapısı

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

# 7.8 — 2.0.0-beta.21 GRIDSHARD Identity Foundation

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

# 7.9 — GRIDSHARD 2.0.0-beta.21 Hazır Havuz Yönetimi ve Denge Onay Akışı

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

# 7.10 — GRIDSHARD 2.0.0-beta.21 Karar Tamamlama, Preset Kartları ve İzole Simülasyon

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

# 7.11 — GRIDSHARD 2.0.0-beta.21 BattleEngine Regresyonu, Audio Settings ve Hızlı Loadout

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

# 7.12 — GRIDSHARD 2.0.0-beta.21 Engine Regresyon Kapsamı, Audio Mix V2 ve Loadout Son Dokunuşları

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

# 7.13 — GRIDSHARD 2.0.0-beta.21 Cache Güvenliği, Browser E2E, Audio Mix V3 ve İnsan Review Konsolu

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

# 7.14 — GRIDSHARD 2.0.0-beta.21 Browser E2E Sertleştirme, Savaş UX Telemetrisi ve Audio Mastering Hazırlığı

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

# 7.15 — GRIDSHARD 2.0.0-beta.21 Windows Browser E2E Kanıt Paketi, Savaş Etkileşim Profili ve Review Konsolu V2

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

# 7.16 — GRIDSHARD 2.0.0-beta.21 Gerçek Windows E2E İçe Aktarımı, UX Etkileşim Matrisi ve Review Karar Akışı

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

# 9. Sıradaki Paket

**`GRIDSHARD 2.0.0-beta.22 — Windows E2E Kanıt Geçmişi + UX Performans Eşikleri + Review Konsolu V3`**

Beta.22 hedefleri:

1. Birden fazla gerçek Windows Browser E2E kanıt paketini tarih/run-id bazlı geçmiş olarak saklayıp son koşuyla önceki koşuları karşılaştırmak.
2. UX matrix için platforma göre yalnız gözlem amaçlı performans eşikleri ve trend raporu oluşturmak; ölçüm verisi yoksa eşik sonucu uydurmamak.
3. Review Konsolu V3'te yerel karar durumunu aday bazında tutmak; adaylar arasında `beklet / reddet / ileride değerlendir` kararlarının birbirine karışmasını engellemek.
4. Audio mastering hedefi için yalnız karar seçeneklerini dokümante etmek; kullanıcı açıkça hedef seçmeden mastering target veya gain değişikliği uygulamamak.
5. Gerçek Windows E2E import sonucu yalnız bütünlük doğrulamasını geçmişse geçmişe eklenmelidir.

Kural:
- otomatik denge apply yok,
- review kararı canonical denge değişikliği değildir,
- gerçek browser ölçümü olmadan UX performans sonucu PASS ilan edilmez,
- mastering hedefi ayrı kullanıcı kararıdır.
