# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 10 Eylül 2026

Bu dosya, sohbet geçmişi kaybolduğunda veya kullanım kredisi bittiğinde GRIDSHARD geliştirmesine aynı noktadan devam etmek için kanonik çalışma kaydıdır. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya okunmalı, ardından `git status --short` çalıştırılmalı ve aşağıdaki açık işler yeni bir kullanıcı isteği yoksa belirtilen sırayla ele alınmalıdır.

## Kaynakların önceliği

Kararlar şu sırayla yorumlanır:

1. Kullanıcının en yeni açık mesajı.
2. `C:\Users\S-A\Desktop\Yapılacaklar.docx` içindeki 10 Eylül 2026 tarihli yapılacaklar listesi ve işaretli ekran görüntüleri.
3. `docs/YOL_HARITASI.md` dosyasındaki 1972. satırdan başlayan `28. Mobil Ürün Yönü — Beta.39 Çalışma Planı` ve sonraki bölümler.
4. Daha eski belgeler ve tarihsel testler.

`YOL_HARITASI.md` içindeki bölümler kendi aralarında da kronolojik yorumlanır. Beta.42 kanonik ürün geçişi, Beta.39-41 içindeki çelişen port, yön, özel hücre ve Jeneratör zorunluluğu kararlarının yerine geçer. Eski testlerin varlığı eski davranışı yeniden etkinleştirme gerekçesi değildir.

## İncelenen Yapılacaklar belgesi

- Kaynak: `C:\Users\S-A\Desktop\Yapılacaklar.docx`
- Son değiştirilme: 10 Eylül 2026 00:03:23
- SHA256: `B326C91D2E289FEF78D71601E04768D51631EF1846FAA1EA2798A7776F006E1C`
- İçerik: 40 paragraf, 20 anlamlı geliştirme maddesi, 5 işaretli ekran görüntüsü.
- Belge değiştirilmedi. Metin, paket yapısı ve gömülü beş görsel incelendi.
- Paketli ortamda LibreOffice bulunmadığı için DOCX sayfa render'ı üretilemedi. Bu, içerik analizini engellemedi; bütün metin python-docx ile okundu ve beş gömülü görsel özgün çözünürlükte ayrı ayrı incelendi.

## Depo durumu

- Dal: `main`
- Analiz başlangıcındaki HEAD: `ae1b9491b86fbf4e7899824d0d7d8a2530e7cae4`
- `ae1b949` yalnız önceki checkpoint'i silmiş ve yerel web test verilerini güncellemiştir.
- Son kapsamlı kod paketi: `4945b30 GRIDSHARD 2.1`
- 10 Eylül 2026 checkpoint UI paketinde sezon ödül yolu gezinmesi, ortak modül hero hizası ve çekirdek renk kimliği güncellendi.
- 10 Eylül 2026 ödül bütünlüğü paketinde Devre Yolu hedef denetimi, ortak açılmış-modül havuzu, tür kimlikli ödül makbuzları ve ortak istemci ödül satırı tamamlandı.
- Aynı gün kalıcı bildirim zinciri, tür bazlı sandık envanteri/`HEPSİNİ AÇ`, gerçek motor etki satırları, 36 modüllük denge matrisi ve beş bölümlü Takım merkezi tamamlandı.
- Değişen ana dosyalar: `client/index.html`, `client/src/app.js`, `client/src/canon.css`, `client/tests/checkpoint-ui-pass.test.js`, `client/tests/beta433-runtime-resilience.test.js`, `server/app/arena_canon.py`, `server/app/game/energy.py`, `server/app/meta_progression.py`, `server/app/player_profile.py`, `server/app/player_data_store.py`, `server/app/team_service.py`, `server/app/main.py`, `server/tests/test_reward_integrity.py`, `server/tests/test_checkpoint_energy_balance.py`, `server/tests/test_checkpoint_notifications_chest_inventory.py`, `server/tests/test_checkpoint_team_system.py`, `server/tests/test_beta43_2_profile_season_chests.py`, `tools/beta43_module_balance_matrix.py` ve `qa_reports/beta43_module_balance_matrix.json`.
- Kullanıcıya ait `server/data/web_test_*.json` çalışma zamanı verileri korunmalıdır. Toplu geri alma, `git reset --hard` veya profil/telemetri verilerini temizleme yapılmamalıdır.

## Korunacak tamamlanmış temel

Aşağıdaki davranışlar önceki turlarda uygulanmıştır ve yeni bir karar açıkça değiştirmedikçe geri alınmamalıdır:

- Eşleştirme iptali ve yeniden başlatma yerel arayüzü kilitlemez; AI eşleşme yedeği bulunur.
- Profil adı, ödül, sandık, modül ve çekirdek işlemlerinde sunucu makbuzu ve `request_id` tekrar koruması kullanılır.
- Ödüller profile sunucu onayıyla kalıcı işlenir; hediye sandığı talep ve açma tek tekrar-güvenli işlem olarak çalışır.
- EV ekranında çekirdek arkada, altı modül önde ve SAVAŞ düğmesi aşağıda bulunur.
- Profilde En Çok Kullanılan Deste aynı çekirdek/modül kompozisyonunu kullanır; görünen Klan metinleri Takım olarak değiştirilmiştir.
- Sezon yolu 40 kademedir ve yaklaşık bir aya yayılacak Deneyim eğrisi kullanır. Görünen SXP metinleri Deneyim olarak değiştirilmiştir.
- Maç sonu hasar ekranından ödül ekranına, oradan tek DEVAM düğmesiyle EV ekranına dönülür.
- Devre Yolu geri ve Lider Panosu düğmeleri alt çubukta görünür ve yol içeriği kayarken sabit kalır.
- Savaş tahtası 5x3'tür; Çekirdek merkezde sabittir. Port, yön, döndürme, özel hücre ve Jeneratör zorunluluğu aktif kanondan çıkarılmıştır.
- Raftaki modüllerde CAN çubuğu gizlidir ve Akım maliyeti görünür. Tahtaya yerleşen modüllerde canlı CAN çubuğu gösterilir.
- Modül hasar ve onarım olayları kısa süreli kırmızı/yeşil yükselen savaş metni üretir.
- Çekirdek gücü kullanıldığında ilgili tahtada `core-wave` geri bildirimi ve hedef üzerinde güç türüne uygun savaş metni görünür.
- Devre Yolu modül parçası durakları gerçek modül simgesini ve sınıf rengini kullanır.
- Avatar seçimi üst profil şeridine anında yansır.
- Günlük, sezon, arena ve mağaza ödüllerinden sonra gereksiz başarı cümleleri gösterilmez; hata mesajları korunur.

## Yapılacaklar belgesi durum analizi

Durum işaretleri:

- `[x]` Kodda mevcut; yalnız kullanıcı görsel/oyun kabulü gerekebilir.
- `[~]` Kısmen mevcut; eksik kapsam tamamlanmalı ve regresyon testi eklenmeli.
- `[ ]` Henüz uygulanmadı.
- `[!]` Diğer işler tamamlandıktan sonra yapılacak güvenlik hassasiyetli temizlik.

### A Arayüz ve savaş okunabilirliği

1. `[x]` Sezon Ödülleri geri düğmesi
   - Yeni istek: `← ÖDÜL BÖLÜMLERİ` düğmesi sabit kalmamalı; sezon ödül listesinin gerçek sonunda bulunmalı ve kullanıcı sayfanın en altına kaydırınca görünmeli.
   - Düğme `season-reward-panel` içine, `season-reward-track` sonrasına taşındı; yalnız ödül paneli kayıyor ve profil alt sekmeleri ayrı sabit satırda kalıyor.
   - Boş başarı metni gizli kalıyor; gerçek hata oluşursa panel üstünde yapışkan durum satırı olarak görülebiliyor.

2. `[x]` Modül bilgi penceresi simge konumu
   - Lazer örneğinde büyük simge modül adı ve nadirlik metninin üzerine geliyor.
   - Ortak modül hero görseli alt merkeze hizalandı ve üst başlık/nadirlik alanından 42 piksel güvenli boşlukla ayrıldı.
   - Düzeltme tek modüle özel değildir; `#module-detail-dialog` içindeki bütün modüllere uygulanır.

3. `[x]` Sistem, Destek, Savunma ve Sabotaj katkı değerleri
   - `server/app/meta_progression.py::_module_view`, `build_module_catalog_view()` tarafından üretilen gerçek motor `effect_lines` satırlarını koleksiyon yanıtına taşıyor.
   - Modül bilgi penceresinin Genel ve İstatistik sekmeleri aynı satırları gösteriyor; kalkan, onarım, yansıtma, enerji ve sabotaj değerleri istemcide sabitlenmiyor.
   - 36 modülün tamamının koleksiyon satırlarının motor kataloğuyla birebir olduğu regresyon testinde doğrulandı.

4. `[x]` Tahta CAN çubukları ve uçan savaş değerleri
   - Rafta CAN çubukları gizli, tahtada görünür.
   - `module_damaged`, onarım ve diğer savaş olayları büyüklüğe göre kısa süreli renkli yükselen metin üretir.
   - Kullanıcı görsel testinde okunabilirlik ve aynı anda çok olay olduğunda üst üste binme kontrol edilmeli.

5. `[x]` Çekirdek görsel renk tutarlılığı
   - Aşırı Yük Çekirdeği koleksiyonda kırmızı, bilgi penceresinde mavi görünüyor.
   - Yedi çekirdeğin simge ve vurgu rengi `client/src/app.js` içindeki tek `CORE_VISUALS` kaynağında toplandı.
   - Koleksiyon kartı, EV/profil aktif çekirdeği, bilgi penceresi, savaş çekirdek düğmesi, tahta güç dalgası ve maç sonu çekirdek kartı aynı `--core-accent` token'ını kullanıyor.
   - Aşırı Yük Çekirdeği bütün bu yüzeylerde `#ff6e82` kırmızı kimliğiyle gösteriliyor.

6. `[x]` Çekirdek özel gücü görsel geri bildirimi
   - Kullanımda devre tahtasına `core-wave` sınıfı uygulanıyor ve hedefte güç türüne uygun geri bildirim çıkıyor.
   - Yedi çekirdek türü için görsel tonun ayırt edilebilirliği kullanıcı testinde doğrulanmalı.

### B Ödül bütünlüğü ve yönlendirme

7. `[x]` Tüm arenalarda otomatik koleksiyon açılışı ve Devre Yolu parça havuzu
   - Başlangıç destesi yalnız tarihsel `unlock_trophies == 0` olan altı `STARTER_IDS` modülünden üretilmeye devam ediyor; deste açılışı ile koleksiyon açılışı birbirinden ayrıldı.
   - Arena 1-12 içindeki her modül, ait olduğu arenanın giriş kupa eşiğinde koleksiyonda otomatik açılıyor; bir önceki kupada kapalı olduğu tüm arena/modül matrisiyle doğrulandı.
   - Devre Yolu hedefli düğümleri kart açmıyor, yalnız ulaşılan arenada zaten açılmış gerçek modüle parça veriyor. Her arenadaki bütün `module_shard_target` değerlerinin o arena modül kümesinin alt kümesi olduğu sunucu yükleme denetimi ve regresyon testiyle sabitlendi.
   - Arena 1 Darbe Topu ve Arena 5 Ray Topu yalnız örnektir; doğrulama 12 arenanın ve 36 modülün tamamını kapsar.

8. `[x]` Günlük, sezon ve sandık ödüllerinde açılmamış modül yasağı
   - `unlocked_reward_module_ids` bütün adayları önce `unlocked_module_ids(max(rating, highest_rating))` kümesinden kuruyor.
   - Günlük giriş ve sezon ödüllerinde tercih edilen deste yalnız bu kümeyi daraltabiliyor; kaldırılmış kimliklerden veya sonraki arena kartlarından oluşan bozuk/eski deste güvenli biçimde açılmış modül havuzuna düşüyor.
   - Genel Devre Yolu ödülleri, sandıklar ve mağaza teklifleri de aynı yardımcı üzerinden seçim yapıyor. Nadirlik seçimi uygun aday bulamazsa yalnız aynı açılmış havuz içinde geri düşüyor.

9. `[x]` Ödül parçasının gerçek adı ve görseli
   - Günlük giriş, sezon, arena, sandık ve mağaza makbuzları ilgili ödül bulunduğunda `module_definition_id` ve `core_type_id` taşıyor.
   - Sezon çekirdek parçaları artık eski genel sayaç yerine makbuzdaki gerçek çekirdek türünün kalıcı parça bakiyesine yazılıyor.
   - Günlük ve sezon önizlemeleri aynı deterministik kimlikleri içeriyor; alınmış ödüllerde kalıcı makbuz kimliği korunuyor.
   - İstemcideki ortak `createRewardRows` bileşeni sandık, günlük ve sezon yüzeylerinde gerçek modül/çekirdek adını, sınıf/tür rengini, glifini ve miktarını gösteriyor. Devre Yolu çekirdek ödülü de gerçek çekirdek rengini kullanıyor.

10. `[x]` Profil avatarından başlayan kırmızı bildirim yolu
    - Günlük giriş, tamamlanan günlük görev, alınabilir sezon kademesi ve açılmış avatar/çerçeve için kararlı bildirim anahtarları sunucuda üretiliyor.
    - Profil kökü, Avatar/Ödüller sekmeleri ve Günlük/Sezon son ekranına kadar bildirim sınıfları aynı sunucu durumundan besleniyor.
    - Görülme anahtarları profile kalıcı yazılıyor; yalnız açılan son bölüm temizleniyor, yenileme ve başka bölümün görülmesi bildirimi yanlışlıkla kaldırmıyor.

11. `[x]` Sandık türü adetleri ve Hepsini Aç
    - Mağaza her sandık türünü tek kartta adet, açılabilir adet ve kilitli adetle grupluyor; eylem `HEPSİNİ AÇ` olarak görünüyor.
    - Toplu açma yalnız `unlocks_at` zamanı gelmiş sandıkları işler ve her sandık için deterministik alt `request_id` makbuzu üretir.
    - Kısmi hatada açılanların makbuzları, kalan envanter ve kilitli sandıklar korunur; aynı toplu işlem yinelendiğinde ödül ikinci kez verilmez.

### C Modül rolü ve denge

12. `[x]` Soğutucu ve düşük etkili modüllerin rol incelemesi
    - 120 kanonik bot ve 360 eşleşmede Soğutucu 204 deste görünümü ve `%40,20` deste kazanma oranı üretti; Soğutucusuz deste tabanı `%53,88` oldu.
    - `%5 daha hızlı ateş` doğrudan uygulanmadı. Soğutucu mevcut ısı/kontrol rolünde bırakıldı; gerçek oyuncu telemetrisi yeterli olduğunda yeniden değerlendirilecek.

13. `[x]` Saldırı modülü yığılmasına karşı karma deste dengesi
    - İlk ölçümde bot destelerinde 2-3 saldırılı grup `%74,85`, 0-1 saldırılı grup `%27,51` kazandı. Bağlantı/topolojiye uygun yerleşim düzeltmesinden sonra bile altı saldırılı sentetik dizilim 10/10 kazanıyordu.
    - Kök neden enerji yükü basamaklarındaydı: yük `>1,4` olduğunda hasar `%90`a inerken `>1,6` dalı hasarı yanlışlıkla `%100`e geri çıkarıyordu. Ağır aşırı yük artık hız `%60`, hasar `%75`, destek `%75` uygular; daha ağır yükün önceki basamaktan güçlü olamayacağı regresyonla sabitlendi.
    - Düzeltme sonrası sentetik saf saldırı `%100 → %60`, dengeli `%60 → %80`, savunma `%40 → %60`, sabotaj `%80` oldu. Saldırı yasaklanmadı ve karma/savunma seçenekleri rekabetçi hale geldi; enerji ve saf destek dizilimleri kendi başlarına saldırı destesi yerine geçecek arketipler olarak yorumlanmadı.
    - Ayrı `%5/%7,5/%10` hasar ve rol yüzdesi adayları kanona alınmadı; 360 bot çapraz kontrolünde genel saldırı yüzdesi değişikliklerinin arketip korelasyonunu çözmediği raporda tutuldu.

14. `[x]` Yeni kanona göre tüm modüllerin denge testi
    - `tools/beta43_module_balance_matrix.py` 36 modülü seviye 1/8/15; hasar, CAN, bekleme, enerji tüketimi, Akım maliyeti, nadirlik ve gerçek etki satırlarıyla tarıyor.
    - 120 sabit bot, 360 akran eşleşmesi ve altı sentetik arketip karşılaştırması `qa_reports/beta43_module_balance_matrix.json` dosyasına yazıldı. Zaman aşımı ve beraberlik oranı `%0` oldu.
    - Bot destelerinde 35/36 modül temsil edildi; `singularity_projector` bot kimlikleri değiştirilmeden tam statik matriste tutuldu. Rapor kodu otomatik değiştirmiyor ve üç adayın ayrı sonuçlarını insan incelemesine sunuyor.

### D Takım sistemi

15. `[x]` Takım oluşturma ve takıma katılma
    - Yer tutucu kaldırıldı; takım oluşturma ve açık takıma katılma sunucu tarafı kalıcı `web_test_teams.json` modeliyle çalışıyor.
    - İşlemler `request_id` makbuzuyla tekrar güvenli; benzersiz ad ve 30 üye kapasitesi sunucuda doğrulanıyor. Profildeki `team_id`/`team_name` yetkili takım kaydıyla eşleniyor.
    - Takım ana kartında takım adı, üye sayısı/üst sınır ve üyelerin toplam kupa sayısı gösteriliyor.

16. `[x]` Üyeler sekmesi
    - Üyeler sunucuda kupa sayısına göre azalan sıralanıyor; satırlarda ad, kupa, lider rolü ve çevrimiçi durumu bulunuyor.

17. `[x]` İstek sekmesi
    - İstemci yalnız koleksiyonda açılmış modülleri listeliyor; sunucu ayrıca oyuncunun en yüksek arena açılımını doğruluyor.
    - Haftalık sınır ve istek miktarı common/rare/epic/legendary nadirliğine göre sunucu politikasında uygulanıyor.
    - Kendi ve diğer üyelerin istekleri aynı akışta; bir parçalık bağış hem takım kaydında hem iki oyuncunun kalıcı envanterinde işleniyor ve aynı `request_id` ikinci aktarımı yapmıyor.

18. `[x]` Sohbet sekmesi
    - Son 200 takım mesajı kalıcı tutuluyor. Mesajlar yazar/zaman bilgisiyle birlikte `visibility`, `moderation_status` ve `reports` alanlarını taşıyor; kullanıcı metni DOM'a `textContent` ile yazılıyor.

19. `[x]` Savaş sekmesi
    - Yalnız çevrimiçi görünen takım üyeleri davet seçicisinde sunuluyor; sunucu hedef çevrimiçi değilse yeni daveti reddediyor.
    - Davet ve kabul kalıcı/tekrar güvenli. Kayıt `team_training_v1`, `match_type=team_training`, `ranked=false` ve `rewards_enabled=false` sözleşmesiyle normal dereceli ödül protokolünden ayrılıyor.

### E Son temizlik

20. `[~]` Legacy kod ve dosya temizliği
    - 1-19 tamamlandı ve ilk aktif referans envanteri `qa_reports/beta43_legacy_inventory.md` altında çıkarıldı.
    - Kullanıcının güncel sürükle-bırak/değişim ve üçlü güçlendirici davranışları, kablo komşuluk yönleri, ses/CSS yön terimleri ve eski profil göçünü taşıyan Jeneratör uyumluluğu temizlik hedefinden ayrıldı.
    - İlk küçük grupta kullanılmayan `CircuitCreditConfig.rotate_cost`, bunu kopyalayan denge regresyon satırı ve eski “modül döndür” çeviri sözleşmesi kaldırıldı.
    - Kalan ana borç üretim kodu değil, `Direction`/port API'sini bekleyen tarihsel testlerin güncel yönsüz kurulumlara taşınmasıdır. Güncel davranışı sınayan testler dönüştürülmeden toplu dosya silinmeyecek.
    - Kullanıcı çalışma zamanı verileri, güncel QA raporları ve kanonik belgeler korunmaya devam ediyor.

## Önerilen uygulama sırası

1. Görsel hızlı düzeltmeler: madde 1, 2 ve 5.
2. Ödül bütünlüğü: madde 7, 8 ve 9.
3. Bildirim ve sandık envanteri: madde 10 ve 11.
4. Modül açıklamaları ve denge: madde 3, 12, 13 ve 14.
5. Tamamlanmış savaş geri bildirimlerinin kullanıcı kabulü: madde 4 ve 6.
6. Takım sistemi: madde 15-19.
7. En son legacy temizlik: madde 20.

## En yakın devam noktası

Kullanıcının yeni bir öncelik vermemesi halinde sıradaki çalışma paketi madde 20 için güvenli legacy envanteri ve küçük temizlik gruplarıdır:

1. `qa_reports/beta43_legacy_inventory.md` listesindeki `Direction` testlerini geçerli oyun davranışı ve yalnız eski port/yön davranışı olarak dosya bazında ayır.
2. Geçerli savaş/enerji/destek/sabotaj testlerini yönsüz `Position` kurulum yardımcısına taşı; eşdeğer kanıt geçmeden eski dosyayı silme.
3. `test_balance_regression.py` ve gateway eşini güncel 2500 ms / azami 12 Akım sözleşmesine geçir.
4. Dönüşümden sonra tam sunucu koleksiyonunu yeniden topla; yalnız eşdeğeri oluşturulmuş salt port/döndürme testlerini kesin hedef listesiyle temizle.

Kullanıcı görsel kabulünde Takım ekranının beş sekmesi, bildirim noktaları, toplu sandık açılışı, sezon listesinin sonundaki geri düğmesi, modül bilgi penceresi ve yeni ödül satırlarının dar ekrandaki okunabilirliği kontrol edilmelidir.

## Son doğrulama

10 Eylül 2026 tarihinde son checkpoint paketi tamamlanırken:

- İstemci JavaScript sözdizimi denetimi geçti.
- İstemci test paketi ödül satırı değişiklikleri sonrasında 34/34 dosyada geçti.
- `client/tests/relay-client.test.js` içindeki 176 sözleşme testi geçti.
- Güncel sunucu enerji dengesi, Takım, bildirim/sandık, ödül, profil/sezon, kart/lider panosu, oyuncu akışı, meta ilerleme ve telemetri grubu: 57 test geçti; ek savaş dengesi duman paketi 2/2 geçti.
- Takım sisteminin kalıcılık, üyelik, haftalık nadirlik sınırı, bağış tekrar koruması, moderasyon alanları ve ödülsüz antrenman protokolü için 4 yeni test geçti.
- 36 modüllük denge aracı 120 bot, 360 temel akran eşleşmesi, topolojiye uygun sentetik dizilimler, sekiz aday taraması ve `%7,5` adayının ek 360 bot çapraz doğrulamasını tamamladı; rapor `qa_reports/beta43_module_balance_matrix.json` altında üretildi.
- Eski `test_beta33_engagement.py` ayrıca çalıştırıldığında artık geçerli olmayan `core_awakening_s0`, 100 Deneyim görev eşiği ve ödülün yeniden Deneyim vermesi sözleşmelerini bekleyen 6 test başarısız oldu; güncel aylık 40 kademe kanonunu geri çevirmemek için eski beklentiler uygulanmadı.
- Legacy envanteri sırasında denge regresyon testleri ayrıca çalıştırıldı: 9 test geçti, güncel 2500 ms Akım yenilemesi yerine eski saniyelik pasif kredi modelini bekleyen 3 test başarısız oldu. Bu uyuşmazlık ilk `rotate_cost` temizliğinden bağımsızdır ve sonraki test göçü grubuna kaydedildi.
- Tam `server/tests` koleksiyonu ayrıca denendi; aktif modelden kaldırılmış `Direction`/port API'sini içe aktaran 25 eski test dosyası koleksiyon aşamasında hata verdi. Beta.42 kanonuna göre bu API yeniden eklenmedi. Güncel seçili paket bu eski dosyalardan bağımsız olarak geçti.
- Proje `.venv` ortamında `pytest` kurulu değildi; sunucu testleri Codex paketli Python çalışma ortamıyla çalıştırıldı.

Tekrar komutları:

```powershell
Set-Location D:\Projects\GRIDSHARD\client
node --check src/app.js
node --check src/i18n.js
node --test tests/*.test.js

Set-Location D:\Projects\GRIDSHARD
& 'C:\Users\SERVER\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest -q server/tests/test_checkpoint_energy_balance.py server/tests/test_checkpoint_team_system.py server/tests/test_checkpoint_notifications_chest_inventory.py server/tests/test_reward_integrity.py server/tests/test_beta43_2_profile_season_chests.py server/tests/test_beta43_cards_leaderboards.py server/tests/test_beta42_1_player_flow_regressions.py server/tests/test_beta40_meta_progression.py server/tests/test_telemetry.py
```

## Checkpoint güncelleme kuralı

Her anlamlı geliştirme paketi tamamlandığında, kullanıcıya son yanıt verilmeden önce bu dosya güncellenmelidir:

1. İlgili madde `[x]`, `[~]`, `[ ]` veya `[!]` olarak güncellenir.
2. Değişen ana dosyalar ve önemli veri sözleşmeleri not edilir.
3. Çalıştırılan testler ve sonuçları yazılır; çalıştırılmayan testler geçmiş gibi gösterilmez.
4. Yeni açık hata, konsol mesajı veya görsel kabul notu eklenir.
5. `En yakın devam noktası` tek ve uygulanabilir bir sonraki paketi göstermelidir.
6. Kullanıcı açıkça istemedikçe bu dosya silinmez. Yeni checkpoint dosyaları oluşturulup bilgi bölünmez; tek kaynak bu dosyadır.

