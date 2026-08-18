# Project Relay 2.0 — YOL HARİTASI

**Güncel Sürüm:** `2.0.0-beta.6`  
**Paket:** Stabilizasyon, Kanonik Yol Haritası Yeniden Denetimi ve QA Zinciri  
**Kanonik Dosya:** `docs/YOL_HARITASI.md`

> Bu dosya Project Relay 2.0 için tek kanonik geliştirme kaydıdır. Kaynak karar belgesi ile kod tabanı yeniden karşılaştırılmıştır. Buradaki `[x]`, `[~]`, `[ ]` işaretleri artık yalnızca kodda ve testlerde doğrulanabilen gerçek durumu gösterir.

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
- [x] Çekirdek, Jeneratör, enerji akışı, port bağlantıları ve devre kurma Project Relay kimliğinin temelidir.
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

### M8 — Project Relay 2.0 Beta
- [x] Oyna.
- [x] Profil.
- [x] İstatistikler.
- [x] Ayarlar.
- [x] Telemetri/Web test altyapısı.
- [ ] Eğitim — ilk sürüm kapsamı nedeniyle bilinçli olarak ertelendi.
- [~] Gerçek oynanabilir Web doğrulaması Beta.6 manuel testiyle devam edecek.

---

# 7. Tamamlanan Son Paket

## 2.0.0-beta.6 — Stabilizasyon + Kanonik Yol Haritası Denetimi + QA Zinciri

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

# 9. Sıradaki Paket

**`2.0.0-beta.7 — Gerçek Tarayıcı Oynanış Hataları ve İlk Kullanıcı Test Düzeltmeleri`**

Beta.6 önce kullanıcının bilgisayarında `TEST_ET.bat` ile doğrulanacak, ardından oyun gerçek tarayıcıda oynanacaktır. Beta.7 kapsamı varsayımla değil, bu gerçek testte görülen somut hata/UX/denge bulgularıyla belirlenecektir.
