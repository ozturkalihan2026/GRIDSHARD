# Project Relay 2.0 — YOL HARİTASI

**Güncel Sürüm:** `2.0.0-alpha.2`  
**Paket:** Dinamik Modül Temeli  
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


### 2.0.0-alpha.3 — Modül Rafı ve Sürükle-Bırak Temeli

- [ ] Temel istemci projesi oluşturulacak.
- [ ] İlk savaş ekranı yalnızca gerekli savaş bileşenleri için hazırlanacak.
- [ ] Modül Rafı savaş alanıyla birlikte sürekli görünür olacak.
- [ ] Modül Rafı ilk 15 saniyede görünür fakat pasif/kilitli olacak.
- [ ] Modül kartlarında Türkçe isim, Can ve gerekli temel bilgiler gösterilecek.
- [ ] Raftan savaş alanına sürükle-bırak komut akışı hazırlanacak.
- [ ] Sahadaki modülü rafa geri sürükleme komut akışı hazırlanacak.
- [ ] Hücreler arasında taşıma sürükle-bırak akışı hazırlanacak.
- [ ] Bir modülü diğerinin üzerine bırakma ile değiştirme akışı hazırlanacak.
- [ ] Sürükleme sırasında savaşın ve aktif modülün kesintisiz devam ettiği istemci davranışı korunacak.
- [ ] Ayrı Satın Al / Sat / Değiştir / Onayla düğmeleri oluşturulmayacak.
- [ ] Bu pakette Devre Kredisi maliyet hesabı henüz uygulanmayacak; ekonomik doğrulama sonraki fazda motor tarafından eklenecek.

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

- [ ] 18 modüllük Savaş Havuzu savaş boyunca ekranda görünen **Modül Rafı** içinde gösterilecek.
- [ ] Modül Rafı ilk 15 saniyede görünür fakat kilitli olacak.
- [ ] 15. saniyede Modül Rafı otomatik aktif olacak.
- [ ] Raftan sahaya sürükle-bırak ile modül yerleştirme yapılacak.
- [ ] Sahadan rafa sürükle-bırak ile modül rezerve alınacak.
- [ ] Hücreler arasında sürükle-bırak ile modül taşıma yapılacak.
- [ ] Modülün başka modül üzerine bırakılmasıyla değiştirme yapılacak.
- [ ] Ayrı `Satın Al`, `Sat`, `Değiştir`, `Onayla` düğmeleri oluşturulmayacak.
- [ ] Modül Rafı savaş boyunca görünür kalacak.
- [ ] 18 modül için kompakt ve kaydırılabilir raf arayüzü oluşturulacak.

#### FAZ 4 — Zaman Bazlı Aktif Modül Kapasitesi

- [ ] 0–15 sn başlangıç düzeni uygulanacak.
- [ ] 15–25 sn maksimum 4 aktif modül uygulanacak.
- [ ] 25–35 sn maksimum 5 aktif modül uygulanacak.
- [ ] 35–45 sn maksimum 6 aktif modül uygulanacak.
- [ ] 45–55 sn maksimum 7 aktif modül uygulanacak.
- [ ] 55–65 sn maksimum 8 aktif modül uygulanacak.
- [ ] 65–75 sn maksimum 9 aktif modül uygulanacak.
- [ ] 75–85 sn maksimum 10 aktif modül uygulanacak.
- [ ] 85 sn ve sonrasında maksimum 10 aktif modül korunacak.
- [ ] Kapasite sınırı gerçek savaş saatinden anlık hesaplanacak.
- [ ] Kapasite artışı oyuncuyu yeni modül koymaya zorlamayacak.
- [ ] Modül değişimi için yapay cooldown eklenmeyecek.

#### FAZ 5 — Modül Durum Kalıcılığı

- [x] Devreden çıkan modül Can değerini koruyor.
- [x] Tekrar devreye alınan modül aynı Can değeriyle dönüyor.
- [ ] Isı durumunun rezervde nasıl korunacağı belirlenecek.
- [ ] Depolanmış enerjinin rezervde nasıl korunacağı belirlenecek.
- [ ] Zayıflatmaların rezervde nasıl korunacağı belirlenecek.
- [ ] Kalıcı maç etkilerinin rezervde nasıl korunacağı belirlenecek.
- [ ] Bekleme sürelerinin rezervde nasıl korunacağı belirlenecek.
- [ ] Geçici güçlendiricilerin rezerv durumundaki davranışı belirlenecek.
- [x] Motor tarafında modül, çıkarma/değiştirme komutu uygulanana kadar Aktif durumda kalıyor; istemci sürükleme davranışı FAZ 3'te bağlanacak.

#### FAZ 6 — Devre Kredisi Motoru

- [ ] Devre Kredisi gerçek zamanlı savaş kaynağı olarak oluşturulacak.
- [ ] Enerji ve Devre Kredisi tamamen ayrı sistemler olacak.
- [ ] Anlık Devre Kredisi değişimi destekleyecek.
- [ ] Pasif Devre Kredisi geliri eklenecek.
- [ ] Savaş performansı kaynaklı gelir kuralları tasarlanacak.
- [ ] Modül yok etme ve savunma başarısı gibi gelir kaynakları dengelenecek.
- [ ] Snowball etkisini önlemek için kredi dağılımı simülasyonla test edilecek.
- [ ] Modül maliyetleri oluşturulacak.
- [ ] Sürükle-bırak bırakma anında Devre Kredisi tekrar doğrulanacak.
- [ ] Kredi yetersizse işlem uygulanmayacak ve savaş durmadan kısa bildirim gösterilecek.

#### FAZ 7 — Otomatik Modül İşlem Ekonomisi

- [ ] Modül yerleştirme maliyeti motor tarafından otomatik hesaplanacak.
- [ ] Modül çıkarma/rezerve alma ekonomik kuralı motor tarafından otomatik uygulanacak.
- [ ] Modül değiştirme ekonomik kuralı otomatik uygulanacak.
- [ ] Modül taşıma ekonomik kuralı otomatik uygulanacak.
- [ ] Rezervden yeniden devreye alma ekonomik kuralı otomatik uygulanacak.
- [ ] Kullanıcı ekonomik işlem türü seçmeyecek; yalnızca sürükle-bırak yapacak.
- [ ] Devre Kredisi arayüzde savaş boyunca anlık güncellenecek.

#### FAZ 8 — 24 Modüllük Ekosistem

- [ ] Modül sayısı önce 8'e, sonra 12'ye, 18'e ve yaklaşık 24'e genişletilecek.
- [ ] Enerji modülleri: Jeneratör, Batarya, Dağıtıcı, Kapasitör.
- [ ] Saldırı modülleri: Lazer, Darbe Topu, Ray Topu, Füze Fırlatıcı, Dron Üssü, Ark Topu.
- [ ] Savunma modülleri: Kalkan, Zırh, Yansıtıcı, Bariyer.
- [ ] Destek modülleri: Onarım Modülü, Soğutucu, Güçlendirici, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı.
- [ ] Sabotaj modülleri: EMP, Sinyal Bozucu, Virüs, Enerji Sömürücü, Kesici.
- [ ] Her modülün diğerlerinden farklı stratejik amacı olacak.
- [ ] Modüller için Can, enerji, hasar/etki, port, maliyet ve karşı strateji verileri tanımlanacak.
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

- [ ] İlk savaş alanında yaklaşık 4–6 özel hücre test edilecek.
- [ ] Saldırı Hücresi tasarlanacak.
- [ ] Savunma Hücresi tasarlanacak.
- [ ] Enerji Hücresi tasarlanacak.
- [ ] Soğutma Hücresi tasarlanacak.
- [ ] Onarım Hücresi tasarlanacak.
- [ ] Sinyal Hücresi tasarlanacak.
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

- [ ] Gerçek oyuncular arasında online PvP oluşturulacak.
- [ ] Savaş zamanı sunucu tarafından yönetilecek.
- [ ] Devre Kredisi sunucu tarafından yönetilecek.
- [ ] Modüller ve Can değerleri sunucu tarafından yönetilecek.
- [ ] Bağlantılar sunucu tarafından doğrulanacak.
- [ ] Güçlendiriciler sunucu tarafından doğrulanacak.
- [ ] Savaş sonucu sunucu tarafından belirlenecek.

#### FAZ 18 — Eşleştirme

- [ ] Başlangıç derece puanı sistemi oluşturulacak.
- [ ] Gerekirse performans, lig ve oyuncu deneyimi gibi ek eşleştirme parametreleri değerlendirilecek.

#### FAZ 19 — Profil

- [ ] Profil ana alanı hazırlanacak.
- [ ] Gerekli Profil alt menüleri hazırlanacak.
- [ ] Kozmetik bölümü bu kapsamda oluşturulmayacak.

#### FAZ 20 — İstatistikler

- [ ] Toplam maç sayısı tutulacak.
- [ ] Galibiyet sayısı tutulacak.
- [ ] Mağlubiyet sayısı tutulacak.
- [ ] Galibiyet oranı hesaplanacak.
- [ ] Ortalama maç süresi tutulacak.
- [ ] En sık kullanılan modüller tutulacak.
- [ ] Toplam verilen hasar tutulacak.
- [ ] Modül değiştirme sayısı tutulacak.
- [ ] Kullanılan güçlendiriciler takip edilecek.

#### FAZ 21 — Ayarlar

- [ ] Ses ayarları hazırlanacak.
- [ ] Müzik ayarları hazırlanacak.
- [ ] Titreşim ayarları hazırlanacak.
- [ ] Grafik ayarları hazırlanacak.
- [ ] Dil ayarları hazırlanacak.
- [ ] Gerekli diğer temel oyun tercihleri hazırlanacak.

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

- [ ] Web test sürümü hazırlanacak.
- [ ] Eğitim tamamlama oranı ölçülecek.
- [ ] İlk maç tamamlama oranı ölçülecek.
- [ ] İkinci maça geçiş ölçülecek.
- [ ] Maç başına modül değişimi ölçülecek.
- [ ] Devre Kredisi kullanımı ölçülecek.
- [ ] Modül Rafı kullanımı ölçülecek.
- [ ] Güçlendirici seçimi ölçülecek.
- [ ] Ortalama maç süresi ölçülecek.
- [ ] Tekrar maç başlatma oranı ölçülecek.
- [ ] Kaybeden oyuncunun tekrar maç açma oranı temel sinyallerden biri olacak.

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
4. [ ] Modül Rafı
5. [ ] Sürükle-bırak ile maç içi modül müdahalesi
6. [ ] 15. saniye sonrası müdahale açılması
7. [ ] 4 → 10 zaman bazlı aktif modül kapasitesi
8. [ ] Modül Can ve durum kalıcılığı — **Can tamamlandı; ısı/enerji/etkiler gibi diğer durumlar bekliyor.**
9. [ ] Gerçek zamanlı Devre Kredisi
10. [ ] Otomatik modül maliyetleri

> Bu ilk on madde tamamlanmadan 24 modül, özel hücreler veya gelişmiş güçlendirici sistemine geçilmeyecektir.

---

## Sıradaki Paket

**`2.0.0-alpha.3 — Modül Rafı ve Sürükle-Bırak Temeli`**

Bu pakette savaş motoru değiştirilmeden ilk istemci ve savaş içi Modül Rafı etkileşimi kurulacaktır. Modül Rafı savaş boyunca görünür kalacak; savaş hiçbir sürükle-bırak işlemi nedeniyle durmayacaktır. Devre Kredisi ve zaman bazlı 4→10 aktif modül sınırı kendi sonraki paketlerinde eklenecektir.

---

## Ana Kilometre Taşları — Durum

### M1 — Kesintisiz Savaş

- [x] Savaş saati ve tick sistemi sürekli akıyor.
- [x] Sabit tick çekirdeği çalışıyor.
- [x] Kuyruğa alınan oyuncu komutları savaş saatini durdurmuyor.
- [ ] Gerçek modül komutları ve tam sunucu otoriteli doğrulamalar eklendikten sonra M1 nihai olarak kapatılacak.

### M2 — Dinamik Devre

- [ ] Modül Rafı
- [ ] Sürükle-bırak
- [x] Ekleme (motor)
- [x] Çıkarma (motor)
- [x] Değiştirme (motor)
- [x] Taşıma (motor)
- [x] Döndürme (motor)
- [x] Can kalıcılığı

### M3 — Devre Ekonomisi

- [ ] Devre Kredisi
- [ ] Gerçek zamanlı kredi değişimi
- [ ] Otomatik maliyet hesabı
- [ ] Modül işlemleri

### M4 — 24 Modüllük Meta

- [ ] Yaklaşık 24 modül
- [ ] 18 modüllük Savaş Havuzu
- [ ] Karşı stratejiler

### M5 — Stratejik Savaş Alanı

- [ ] Yeni alan
- [ ] Maksimum 10 aktif modül
- [ ] Özel hücreler
- [ ] Konumsal strateji

### M6 — Güçlendirici Savaşı

- [ ] 85+ saniye sistemi
- [ ] Her 10 saniyede seçim
- [ ] 3 seçenekten 1 seçim
- [ ] Hedef modül seçimi
- [ ] Savaş durmadan uygulama

### M7 — Rekabetçi Çekirdek

- [ ] Simülasyon
- [ ] Denge
- [ ] Yapay zekâ
- [ ] Online PvP

### M8 — Project Relay 2.0 Beta

- [ ] Oyna
- [ ] Profil
- [ ] İstatistikler
- [ ] Ayarlar
- [ ] Eğitim
- [ ] Telemetri
- [ ] Web test sürümü

---
