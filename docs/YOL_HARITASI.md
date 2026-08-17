# Project Relay 2.0 — YOL HARİTASI

**Güncel Sürüm:** `2.0.0-alpha.121`  
**Paket:** Test Koşusu Operasyon Geçmişi Agregat Özeti  
**Kanonik Dosya:** `docs/YOL_HARITASI.md`

> Bu dosya Project Relay 2.0 için tek kanonik geliştirme kaydıdır. Her paket tamamlandığında sürüm numarası artırılır; **Tamamlananlar** ve **Yapılacaklar** bu dosyada güncellenir. Sonraki geliştirme paketi bu dosya okunarak başlatılır.

---

## Tamamlananlar — Kümülatif

### Proje ve sürüm altyapısı

- [x] Project Relay 2.0 için yeni sunucu proje iskeleti oluşturuldu.
- [x] `server/app/` oyun uygulama yapısı oluşturuldu.
- [x] `server/app/game/` savaş motoru paketi oluşturuldu.
- [x] `server/tests/game/` temel savaş motoru test alanı oluşturuldu.
- [x] Tek kanonik yol haritası olarak `docs/YOL_HARITASI.md` kullanımı başlatıldı.
- [x] Sürüm bilgisi `server/app/version.py` içinde `2.0.0-alpha.1` olarak tanımlandı.
- [x] `pytest` test yapılandırması eklendi.

### Kesintisiz savaş durumu modeli

- [x] Savaş durumları `WAITING`, `RUNNING`, `FINISHED` olarak tanımlandı.
- [x] Savaş motorunda `PAUSED` durumu tanımlanmadı.
- [x] `BattleState` temel savaş durumu modeli oluşturuldu.
- [x] `BattleCommand` oyuncu komutu modeli oluşturuldu.
- [x] `BattleEvent` savaş olayı modeli oluşturuldu.
- [x] Savaş kimliği, tick sayısı, geçen süre ve olay kayıtları için temel alanlar oluşturuldu.

### Gerçek zamanlı savaş motoru

- [x] Savaş motoru `10 Hz` sabit tick hızıyla çalışacak şekilde kuruldu.
- [x] Her tick `100 ms` savaş zamanını temsil edecek şekilde tanımlandı.
- [x] Savaş başladıktan sonra `step()` çağrılarıyla zamanın kesintisiz ilerlemesi sağlandı.
- [x] Savaş saati tick sayısından deterministik olarak hesaplanıyor.
- [x] Oyuncu komutlarının savaş motorunu durdurmaması için komut kuyruğu oluşturuldu.
- [x] Bekleyen komutların savaş akışı içinde işlenmesi için temel komut işleme hattı oluşturuldu.
- [x] Komut işlenirken savaş durumunun `RUNNING` olarak kalması sağlandı.
- [x] `battle_started`, `command_received` ve `battle_finished` temel olay kayıtları oluşturuldu.
- [x] Savaş `FINISHED` durumuna geçtiğinde savaş saatinin ilerlemeyi bırakması sağlandı.

### Gerçek zamanlı çalıştırıcı

- [x] `asyncio` tabanlı `BattleRunner` oluşturuldu.
- [x] Runner savaş `RUNNING` durumundayken motoru kesintisiz çalıştıracak şekilde kuruldu.
- [x] Tick süresi için hedef zaman takibi eklendi.
- [x] Tick işleme süresinin savaş zamanında sürekli kayma üretmesini azaltmak için hedef zaman bazlı bekleme kullanıldı.
- [x] Motor geç kaldığında yapay ek bekleme eklenmemesi sağlandı.

### Testler

- [x] Savaşın `RUNNING` durumunda başladığı test edildi.
- [x] `150 tick = 15.000 ms` olduğu test edildi.
- [x] Tek oyuncu komutunun savaş saatini durdurmadığı test edildi.
- [x] Çoklu oyuncu komutlarının savaş saatini durdurmadığı test edildi.
- [x] Bitmiş savaşın artık ilerlemediği test edildi.
- [x] Toplam **5 test başarılı**.


### 2.0.0-alpha.6 — Devre Kredisi Motoru

- [x] Devre Kredisi oyuncunun gerçek zamanlı maç kaynağı olarak motor modeline eklendi.
- [x] Enerji ile Devre Kredisi ayrı sistemler olarak tutuldu; modülün depolanmış enerjisi kredi bakiyesinden bağımsızdır.
- [x] Yapılandırılabilir başlangıç Devre Kredisi eklendi (`200 DK` alpha denge değeri).
- [x] Yapılandırılabilir pasif Devre Kredisi geliri eklendi (`10 DK/sn` alpha denge değeri).
- [x] Devre Kredisi savaş tick'leri boyunca anlık güncelleniyor.
- [x] İlk 8 temel modül için alpha Devre Kredisi maliyetleri tanımlandı.
- [x] Modül Rafı'ndan sahaya yerleştirme maliyeti motor tarafından otomatik düşülüyor.
- [x] Aktif modülü rafa geri çekme ayrı bir satış işlemi oluşturmuyor; alpha.6'da maliyet/iade `0 DK`.
- [x] Modül taşıma için yapılandırılabilir işlem maliyeti eklendi (`10 DK` alpha değeri).
- [x] Modül değiştirmede sahaya giren modülün maliyeti motor tarafından otomatik uygulanıyor.
- [x] Rezervdeki modül tekrar sahaya sürüklendiğinde yerleştirme maliyeti yeniden motor tarafından uygulanıyor.
- [x] Modül döndürme alpha.6'da `0 DK`; motor ekonomik kuralı üzerinden geçiyor.
- [x] İşlemin gerçekleştiği tick'teki güncel Devre Kredisi bakiyesi esas alınıyor.
- [x] Kredi yetersizse komut savaş durmadan reddediliyor ve modül/konum durumu değiştirilmeden kalıyor.
- [x] Başarısız değiştirme işleminin atomik kalması sağlandı; çıkan/giren modül durumu bozulmuyor.
- [x] Kredi kazanımı için ileride savaş performansı kaynaklarına bağlanabilecek genel ödül kancası (`award_circuit_credits`) eklendi.
- [x] Pasif kredi artışı olay günlüğünü her tick doldurmadan motor durumunda güncelleniyor.
- [x] İstemcide `Devre Kredisi: ... DK` göstergesi eklendi.
- [x] Modül kartlarında alpha Devre Kredisi maliyeti gösteriliyor.
- [x] İstemci yalnızca sunucudan gelen ekonomi durumunu göstermeye uygun `applyServerEconomyState` arayüzüne sahip.
- [x] Görsel demo katmanında yetersiz kredi için savaş durdurmayan kısa uyarı eklendi.
- [x] Ayrı Satın Al / Sat / Değiştir / Onayla düğmeleri oluşturulmadı.
- [x] Devre Kredisi ve otomatik modül maliyetleri için yeni sunucu testleri eklendi.
- [x] İstemci Devre Kredisi durumunu doğrulayan yeni testler eklendi.
- [x] Oyun tanıtımı amaçlı `README.md` dosyaları bu paket kapsamından çıkarıldı.

### Sonraki Fazlar — Sabit Yol Haritası

#### FAZ 0 — Proje Temeli: kalan işler

- [ ] Temel istemci projesi oluşturulacak.
- [ ] İlk kullanıcı arayüzü yalnızca `Oyna`, `Profil`, `İstatistikler`, `Ayarlar` kapsamıyla kurulacak.
- [ ] Profil altında gerekli alt menüler oluşturulacak; kozmetik bölümü eklenmeyecek.

#### FAZ 1 — Gerçek Zamanlı Savaş Motoru: tamamlanacak sunucu otoritesi

- [ ] Sunucu otoriteli gerçek kural doğrulama katmanı modül, zaman, hücre, bağlantı ve ekonomi kurallarıyla genişletilecek.
- [ ] İstemcinin yalnızca oyuncu niyetini/komutunu gönderdiği yapı kurulacak.
- [ ] Gerçek savaş sonucunun yalnızca motor/sunucu tarafından belirlenmesi garanti altına alınacak.

#### FAZ 2 — Dinamik Modül Sistemi

- [x] Modül ekleme, çıkarma, değiştirme, taşıma ve döndürmenin sunucu motoru temeli gerçek savaş tick akışına bağlandı.
- [x] İlk 8 temel modül tanımıyla dinamik modül motoru birim testlerinde doğrulandı.
- [ ] 24 modüle geçmeden önce dinamik savaş yapısı test edilecek.

#### FAZ 3 — Modül Rafı ve Sürükle-Bırak

- [x] Modül Rafı savaş boyunca görünür olacak şekilde istemci temeli oluşturuldu; 18 modüllük tam Savaş Havuzu FAZ 9'da bağlanacak.
- [x] Modül Rafı ilk 15 saniyede görünür fakat kilitli.
- [x] 15. saniyede Modül Rafı istemci tarafında otomatik aktif oluyor.
- [x] Raftan sahaya sürükle-bırak ile modül yerleştirme komutu üretimi hazırlandı.
- [x] Sahadan rafa sürükle-bırak ile modül çıkarma komutu üretimi hazırlandı.
- [x] Hücreler arasında sürükle-bırak ile modül taşıma komutu üretimi hazırlandı.
- [x] Rezerv modülün aktif modül üzerine bırakılmasıyla değiştirme komutu üretimi hazırlandı.
- [x] Ayrı `Satın Al`, `Sat`, `Değiştir`, `Onayla` düğmeleri oluşturulmadı.
- [x] Modül Rafı savaş boyunca görünür kalıyor.
- [ ] 18 modül için kompakt ve kaydırılabilir raf arayüzü oluşturulacak.

#### FAZ 4 — Zaman Bazlı Aktif Modül Kapasitesi

- [x] 0–15 sn başlangıç düzeni uygulanacak.
- [x] 15–25 sn maksimum 4 aktif modül uygulanacak.
- [x] 25–35 sn maksimum 5 aktif modül uygulanacak.
- [x] 35–45 sn maksimum 6 aktif modül uygulanacak.
- [x] 45–55 sn maksimum 7 aktif modül uygulanacak.
- [x] 55–65 sn maksimum 8 aktif modül uygulanacak.
- [x] 65–75 sn maksimum 9 aktif modül uygulanacak.
- [x] 75–85 sn maksimum 10 aktif modül uygulanacak.
- [x] 85 sn ve sonrasında maksimum 10 aktif modül korunacak.
- [x] Kapasite sınırı gerçek savaş saatinden anlık hesaplanacak.
- [x] Kapasite artışı oyuncuyu yeni modül koymaya zorlamayacak.
- [x] Modül değişimi için yapay cooldown eklenmeyecek.

#### FAZ 5 — Modül Durum Kalıcılığı

- [x] Devreden çıkan modül Can değerini koruyor.
- [x] Tekrar devreye alınan modül aynı Can değeriyle dönüyor.
- [x] Isı rezervde aynen korunuyor; bu pakette pasif rezerv soğuması uygulanmıyor.
- [x] Depolanmış enerji rezervde aynen korunuyor.
- [x] Zayıflatmalar modüle bağlı kalıyor; süreli olanlar savaş saatiyle rezervde de sona eriyor.
- [x] Kalıcı maç etkileri modüle bağlı kalıyor; süreli olanlar savaş saatiyle ilerliyor.
- [x] Bekleme süreleri mutlak savaş saatine bağlı ve rezervde de ilerliyor.
- [x] Geçici güçlendirici durumları rezervde kalıyor ancak süreleri savaş saatiyle işlemeye devam ediyor.
- [x] Motor tarafında modül, çıkarma/değiştirme komutu uygulanana kadar Aktif durumda kalıyor; istemci sürükleme davranışı FAZ 3'te bağlanacak.

#### FAZ 6 — Devre Kredisi Motoru

- [x] Devre Kredisi gerçek zamanlı savaş kaynağı olarak oluşturuldu.
- [x] Enerji ve Devre Kredisi tamamen ayrı sistemler olarak tutuluyor.
- [x] Anlık Devre Kredisi değişimi destekleniyor.
- [x] Pasif Devre Kredisi geliri eklendi.
- [ ] Savaş performansı kaynaklı gerçek gelir kuralları saldırı/savunma motoru geliştikçe bağlanacak; genel kredi ödül kancası hazır.
- [ ] Modül yok etme ve savunma başarısı gelirleri gerçek savaş/denge fazında belirlenecek.
- [ ] Snowball etkisi otomatik savaş simülasyonu fazında ölçülüp dengelenecek.
- [x] İlk 8 temel modül için alpha maliyetleri oluşturuldu.
- [x] Modül komutu uygulandığı tick içinde güncel Devre Kredisi yeniden doğrulanıyor.
- [x] Kredi yetersizse motor işlemi reddediyor; istemci savaş durmadan kısa uyarı gösterebiliyor.

#### FAZ 7 — Otomatik Modül İşlem Ekonomisi

- [x] Modül yerleştirme maliyeti motor tarafından otomatik hesaplanıyor.
- [x] Modül çıkarma/rezerve alma ekonomik kuralı otomatik uygulanıyor; alpha.6 değeri 0 DK ve satış/iade yok.
- [x] Modül değiştirme ekonomik kuralı otomatik uygulanıyor.
- [x] Modül taşıma ekonomik kuralı otomatik uygulanıyor.
- [x] Rezervden yeniden devreye alma ekonomik kuralı otomatik uygulanıyor.
- [x] Kullanıcı ekonomik işlem türü seçmiyor; sürükle-bırak komutlarının maliyetini motor hesaplıyor.
- [x] Devre Kredisi istemci arayüzünde savaş boyunca anlık gösteriliyor.

#### FAZ 8 — 24 Modüllük Ekosistem

- [ ] Modül sayısı önce 8'e, sonra 12'ye, 18'e ve yaklaşık 24'e genişletilecek. **12 modül aşaması tamamlandı; sırada 18 modül var.**
- [ ] Enerji modülleri: Jeneratör, Batarya, Dağıtıcı, Kapasitör. **Jeneratör, Batarya ve Dağıtıcı mevcut; Kapasitör bekliyor.**
- [ ] Saldırı modülleri: Lazer, Darbe Topu, Ray Topu, Füze Fırlatıcı, Dron Üssü, Ark Topu. **Lazer ve Darbe Topu mevcut.**
- [ ] Savunma modülleri: Kalkan, Zırh, Yansıtıcı, Bariyer. **Kalkan ve Zırh mevcut.**
- [ ] Destek modülleri: Onarım Modülü, Soğutucu, Güçlendirici, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı.
- [ ] Sabotaj modülleri: EMP, Sinyal Bozucu, Virüs, Enerji Sömürücü, Kesici. **EMP mevcut.**
- [ ] Her modülün diğerlerinden farklı stratejik amacı olacak. **İlk 12 modül için stratejik rol metadatası oluşturuldu; 18/24 genişlemesi bekliyor.**
- [ ] Modüller için Can, enerji, hasar/etki, port, maliyet ve karşı strateji verileri tanımlanacak. **İlk 12 modül için Can, kredi maliyeti, enerji, temel hasar/bekleme ve port tanım temeli hazır; gerçek karşı strateji/simülasyon bekliyor.**
- [ ] Kullanıcıya görünen modül ve sistem adları Türkçe olacak.

#### FAZ 9 — 18 Modüllük Savaş Havuzu

- [ ] Oyuncu yaklaşık 24 global modülden 18 tanesini maç öncesinde seçecek.
- [ ] `24 Global Modül → 18 Savaş Havuzu → Maksimum 10 Aktif Modül` kuralı uygulanacak.
- [ ] Savaş Havuzu hazırlama akışı `Oyna`/`Profil` kapsamıyla uyumlu tasarlanacak.
- [ ] Farklı saldırı, savunma, kontrol ve dengeli havuz stratejileri desteklenecek.

#### FAZ 10 — Yeni Stratejik Savaş Alanı

- [ ] Merkezde Çekirdek kimliği korunacak.
- [ ] Yaklaşık 18–24 kullanılabilir yerleşim hücresi hazırlanacak.
- [ ] Maksimum aktif modül sayısı 10 olarak kalacak.
- [ ] Büyük alan daha fazla modül için değil, farklı geometri ve konumsal strateji için kullanılacak.
- [ ] Jeneratör, enerji akışı ve port bağlantıları Project Relay kimliğinin temel parçası olarak korunacak.

#### FAZ 11 — Özel Hücreler

- [x] İlk savaş alanında 6 özel hücre tanımlandı.
- [x] Saldırı Hücresi tasarlandı.
- [x] Savunma Hücresi tasarlandı.
- [x] Enerji Hücresi tasarlandı.
- [x] Soğutma Hücresi tasarlandı.
- [x] Onarım Hücresi tasarlandı.
- [x] Sinyal Hücresi tasarlandı.
- [ ] Bonusların ücretsiz güç olmaması için her özel hücreye konumsal/bağlantısal risk veya bedel eklenecek.

#### FAZ 12 — Geçici Güçlendiriciler

- [ ] Geçici güçlendirici sistemi oluşturulacak.
- [ ] Güçlendirici savaş devam ederken seçilecek.
- [ ] Oyuncu güçlendiricinin uygulanacağı modülü kendisi belirleyecek.
- [ ] Aşırı Yük Çipi benzeri istatistik güçlendiricileri test edilecek.
- [ ] Acil Onarım benzeri acil durum güçlendiricileri test edilecek.
- [ ] Çift Port Adaptörü benzeri modül davranışını değiştiren güçlendiriciler önceliklendirilecek.
- [ ] Güçlendirici seçimi hiçbir zaman savaşı durdurmayacak.

#### FAZ 13 — 85+ Saniye Güçlendirici Döngüsü

- [ ] 85. saniyede ilk güçlendirici seçimi açılacak.
- [ ] 95, 105, 115, 125... saniyelerde seçim tekrar edecek.
- [ ] Her seçimde 3 seçenek gösterilecek ve 1 tanesi seçilecek.
- [ ] Seçilen güçlendirici için hedef modül belirlenecek.
- [ ] Seçim arayüzü modal olmayacak.
- [ ] Güçlendirici seçimi sırasında saldırılar, enerji, Can ve kredi akışı devam edecek.

#### FAZ 14 — Yapay Zekâ ve Simülasyon

- [ ] Otomatik savaş simülasyon altyapısı oluşturulacak.
- [ ] 10.000 maçlık testler çalıştırılacak.
- [ ] 50.000 maçlık testler çalıştırılacak.
- [ ] 100.000+ maçlık testler destekleyecek.
- [ ] Modül seçim oranı ölçülecek.
- [ ] Modül kazanma oranı ölçülecek.
- [ ] Devre Kredisi kullanımı ölçülecek.
- [ ] Modül değiştirme sıklığı ölçülecek.
- [ ] Güçlendirici tercihleri ölçülecek.
- [ ] Özel hücre kullanımı ölçülecek.
- [ ] Ortalama maç süresi ölçülecek.
- [ ] Geri dönüş oranı ölçülecek.
- [ ] İlk oyuncu avantajı ölçülecek.

#### FAZ 15 — Savaş Okunabilirliği

- [ ] İki oyuncuda toplam 20'ye kadar aktif modül varken ekranın okunabilirliği sağlanacak.
- [ ] Enerjisiz modüller açıkça anlaşılacak.
- [ ] Hasarlı modüller açıkça anlaşılacak.
- [ ] Aktif güçlendiriciler açıkça anlaşılacak.
- [ ] Özel hücre bonusları açıkça anlaşılacak.
- [ ] Saldırı kaynağı ve hedefi açıkça anlaşılacak.
- [ ] Savaş ekranında tam ekran/modal işlemlerden kaçınılacak.

#### FAZ 16 — Yapay Zekâ Rakipler

- [ ] Saldırgan yapay zekâ hazırlanacak.
- [ ] Savunmacı yapay zekâ hazırlanacak.
- [ ] Dengeli yapay zekâ hazırlanacak.
- [ ] Sabotaj Odaklı yapay zekâ hazırlanacak.
- [ ] Ekonomi Odaklı yapay zekâ hazırlanacak.

#### FAZ 17 — Online PvP

- [x] Gerçek oyuncular arasında online PvP oluşturuldu.
- [x] Savaş zamanı sunucu tarafından yönetiliyor.
- [x] Devre Kredisi sunucu tarafından yönetiliyor.
- [x] Modüller ve Can değerleri sunucu tarafından yönetiliyor.
- [x] Bağlantılar sunucu tarafından doğrulanıyor.
- [x] Güçlendiriciler sunucu tarafından doğrulanıyor.
- [x] Savaş sonucu sunucu tarafından belirleniyor.

#### FAZ 18 — Eşleştirme

- [x] Başlangıç derece puanı sistemi oluşturuldu; varsayılan değer 1000 DP.
- [x] Derece yakınlığı ve bekleme süresi kontrollü genişleyen eşleştirme kuyruğuna bağlandı.
- [x] Lig ve oyuncu deneyimi metadata olarak tutuluyor; ek filtre ihtiyacı sonraki denge verilerine göre değerlendirilecek.

#### FAZ 19 — Profil

- [x] Profil ana alanı hazırlandı.
- [x] Profil alt bölümleri Genel, İlerleme ve Savaş Havuzu olarak hazırlandı.
- [x] Profil gerçek sunucu verisine bağlandı.
- [x] Kozmetik bölümü bu kapsamda oluşturulmadı.

#### FAZ 20 — İstatistikler

- [x] Toplam maç sayısı tutuluyor.
- [x] Galibiyet sayısı tutuluyor.
- [x] Mağlubiyet sayısı tutuluyor.
- [x] Beraberlik sayısı tutuluyor.
- [x] Galibiyet oranı hesaplanıyor.
- [x] Ortalama maç süresi tutuluyor.
- [x] En sık kullanılan modüller tutuluyor.
- [x] Toplam verilen hasar tutuluyor.
- [x] Modül değiştirme sayısı tutuluyor.
- [x] Kullanılan güçlendiriciler takip ediliyor.
- [x] İstatistikler gerçek sunucu verisine bağlandı.

#### FAZ 21 — Ayarlar

- [x] Ses ayarları hazırlandı.
- [x] Müzik ayarları hazırlandı.
- [x] Titreşim ayarları hazırlandı.
- [x] Grafik ayarları hazırlandı.
- [x] Dil ayarları hazırlandı.
- [x] İlk sürüm için gerekli temel oyun tercihleri hazırlandı.

#### FAZ 22 — Eğitim

- [ ] Çekirdek öğretilecek.
- [ ] Jeneratör öğretilecek.
- [ ] Enerji bağlantısı öğretilecek.
- [ ] Lazer öğretilecek.
- [ ] Kalkan öğretilecek.
- [ ] Modül Rafı öğretilecek.
- [ ] 15. saniye sonrası modül yerleştirme öğretilecek.
- [ ] Hasarlı modülü geri çekme öğretilecek.
- [ ] Modülü tekrar devreye alma öğretilecek.
- [ ] Devre Kredisi öğretilecek.
- [ ] Özel hücreler öğretilecek.
- [ ] Geçici güçlendiriciler öğretilecek.
- [ ] Eğitim mümkün olduğunca oynanarak yapılacak.

#### FAZ 23 — Web Test Sürümü

- [x] Web test sürümü için sağlık, sürüm ve uçtan uca smoke-test sözleşmesi hazırlandı.
- [ ] Eğitim tamamlama oranı ölçülecek.
- [x] İlk maç/maç tamamlama için başlayan ve tamamlanan session sayaçları ile tamamlama oranı ölçülüyor.
- [x] İkinci maça geçiş, ilk tamamlanmış maçtan sonraki yeni eşleştirme başlangıcı üzerinden ölçülüyor.
- [x] Maç başına modül değişimi ölçülüyor.
- [x] Devre Kredisi kullanımı ölçülüyor.
- [x] Modül Rafı kullanımı ölçülüyor.
- [x] Güçlendirici kullanımı ölçülüyor.
- [x] Ortalama maç süresi ölçülüyor.
- [x] Tekrar maç isteği sayısı ve tamamlanan maç başına oranı ölçülüyor.
- [x] Kaybeden oyuncunun tekrar maç isteği oranı maç sonucu + tekrar maç sinyali üzerinden ölçülüyor.

#### FAZ 24 — Android ve iOS

- [ ] Web mekanikleri doğrulandıktan sonra Android sürümü değerlendirilecek.
- [ ] Android sonrasında iOS sürümü değerlendirilecek.

---

## Şimdilik Kapsam Dışı — Yapılmayacak

Aşağıdaki alanlar ilk sürüm kapsamına dahil değildir ve mevcut yol haritasının erken geliştirme paketlerinde üzerinde çalışılmayacaktır:

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

> Bu liste “hemen yapılacak işler” değildir; bilinçli olarak **şimdilik kapsam dışı** bırakılmış alanları gösterir.

---

## İlk Geliştirme Sırası — Durum

1. [x] Proje iskeleti ve `YOL_HARITASI.md`
2. [x] Kesintisiz çalışan gerçek zamanlı savaş motorunun ilk çekirdeği
3. [x] Çekirdek + Jeneratör + 6–8 temel modül
4. [x] Modül Rafı
5. [x] Sürükle-bırak ile maç içi modül müdahalesi — **istemci komut üretimi tamamlandı; ekonomik doğrulama sonraki fazlarda eklenecek.**
6. [x] 15. saniye sonrası müdahale açılması — **istemci kilidi tamamlandı; motor tarafı alpha.4 kapasite kuralıyla bağlanacak.**
7. [x] 4 → 10 zaman bazlı aktif modül kapasitesi
8. [x] Modül Can ve durum kalıcılığı — **Can, ısı, depolanmış enerji, zayıflatmalar, kalıcı etkiler, cooldown ve geçici güçlendirici durum kuralları tanımlandı.**
9. [x] Gerçek zamanlı Devre Kredisi
10. [x] Otomatik modül maliyetleri

> Bu ilk on madde tamamlanmadan 24 modül, özel hücreler veya gelişmiş güçlendirici sistemine geçilmeyecektir.

---

## Sıradaki Paket

**`2.0.0-alpha.122 — Operasyon Geçmişinde Durum Geçiş Özeti`**

Agregat operasyon geçmişi hazır. Sıradaki paket snapshot sırasından yalnızca agregat durum geçişlerini çıkaracak: not_ready→ready_not_started, ready_not_started→running ve running→diğer durum geçiş sayıları raporlanacak. Oyuncu veya savaş bilgisi tutulmayacak.


---

## Ana Kilometre Taşları — Durum

### M1 — Kesintisiz Savaş

- [x] Savaş saati ve tick sistemi sürekli akıyor.
- [x] Sabit tick çekirdeği çalışıyor.
- [x] Kuyruğa alınan oyuncu komutları savaş saatini durdurmuyor.
- [x] Gerçek modül komutları ve sunucu otoriteli doğrulamalar tamamlandı.

### M2 — Dinamik Devre

- [x] Modül Rafı
- [x] Sürükle-bırak
- [x] Ekleme (motor)
- [x] Çıkarma (motor)
- [x] Değiştirme (motor)
- [x] Taşıma (motor)
- [x] Döndürme (motor)
- [x] Can kalıcılığı

### M3 — Devre Ekonomisi

- [x] Devre Kredisi
- [x] Gerçek zamanlı kredi değişimi
- [x] Otomatik maliyet hesabı
- [x] Modül işlemleri

### M4 — 24 Modüllük Meta

- [x] Yaklaşık 24 modül
- [x] 18 modüllük Savaş Havuzu
- [x] Karşı stratejiler

### M5 — Stratejik Savaş Alanı

- [x] Yeni alan
- [x] Maksimum 10 aktif modül
- [x] Özel hücreler
- [x] Konumsal strateji

### M6 — Güçlendirici Savaşı

- [x] 85+ saniye sistemi
- [x] Her 10 saniyede seçim
- [x] 3 seçenekten 1 seçim
- [x] Hedef modül seçimi
- [x] Savaş durmadan uygulama

### M7 — Rekabetçi Çekirdek

- [x] Simülasyon
- [x] Denge
- [x] Yapay zekâ
- [x] Online PvP

### M8 — Project Relay 2.0 Beta

- [x] Oyna
- [x] Profil
- [x] İstatistikler
- [x] Ayarlar
- [ ] Eğitim — **ilk Web test kapsamı dışında, bilinçli olarak ertelendi.**
- [x] Telemetri
- [x] Web test sürümü — **smoke-test ve sağlık sözleşmesi hazır; gerçek kullanıcı testi sonraki paketlerde yürütülecek.**

---
