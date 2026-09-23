# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 23 Eylül 2026

Bu dosya güncel çalışma paketini ve korunması gereken önceki kararları içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Aktif paket — Beta.72 üretim istemci derlemesi

1. `[x]` Son Öneriler / üretim istemci derleme hattının kodunu tamamla
   - `pnpm build:web` ile web, mevcut `pnpm build:mobile:web` ile mobil aynı `tools/build-client.js` hattını kullanır. Sabit `esbuild 0.28.2` ve platform paketleri kilit dosyasına alındı; diğer bağımlılıklar güncellenmedi.
   - `index.html` içindeki açık derleme blokları JS yürütme sırasını ve `styles.css → canon.css` sırasını belirler. JS/CSS birleştirilip küçültülür; SHA-256 içerik özeti taşıyan dosya adları HTML'e otomatik yazılır. Global istemci bağlantıları, fonksiyon/sınıf adları ve ayrı runtime API yapılandırması korunur.
   - Çıktıda yalnız uygulama HTML'i, JS/CSS paketleri, ikon/manifest/ses varlıkları ve genel API ayarı vardır; testler, kaynak haritaları ve geliştirme dosyaları kopyalanmaz. Paket önce geçici dizinde hazırlanır; derleme/kopyalama hatası önceki `dist/` çıktısını silmez.
2. `[x]` Üretim ve geliştirme statik servislerini ayır
   - Geliştirme varsayılan `client/` ve no-cache davranışında kalır. Üretim varsayılan `dist/` veya `GRIDSHARD_CLIENT_DIR` dizinini kullanır; eksik web manifesti ya da uyumsuz JS/CSS dosya özeti açılışı durdurur. Mobil çıktı yanlışlıkla web yayını olarak sunulamaz.
   - Yalnız manifestteki doğrulanmış içerik özetli JS/CSS bir yıl immutable önbelleğe alınabilir. Ana HTML, runtime ayarı ve derleme manifesti `no-store`; sabit adlı ses/ikon varlıkları ETag ile yeniden doğrulanır.
3. `[x]` Docker ve CI paketlemeye bağla
   - Docker ayrı Node derleme katmanından yalnız `dist/` içeriğini Python imajına taşır. Yerel ortam/sır dosyaları, Node bağımlılıkları ve eski çıktılar Docker bağlamından dışlanır.
   - Quality iş akışına derleme sözleşmeleri, web paketi üretimi ve commit SHA ile artifact eklendi. İncelemede `.github/workflows/quality.yml` dosyasının hâlâ Git ignore kapsamına girdiği görüldü; yalnız workflow YAML dosyalarını açan istisnalar düzeltildi. Commit/push veya CI çalıştırma yapılmadı.
   - Kullanım ve yayın/önbellek sınırları `docs/CLIENT_BUILD.md` dosyasına eklendi; mobil yayın belgesi ortak hattı gösterecek şekilde güncellendi.

Doğrulama: Kullanıcının önceki kararı korunarak test, derleme, Docker, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Yalnız bağımlılık sürümü/kilit dosyası güncellendi ve kod/diff statik incelendi. Derleme sırası, içerik özeti, başarısız derlemede eski paketin korunması, mobil API zorunluluğu ve HTTP önbellek davranışı için sözleşmeler yazıldı; çalıştırılmadı. Gerçek CI ve cihaz sonucu yayın öncesi bekler. `server/data/platform_state.json` içindeki çalışma zamanı değişikliklerine dokunulmadı.

Sonraki kod paketi: Son Öneriler kuyruğunda WAV→OGG/AAC dönüşümü ve savaş müzik katmanları; ardından JSON migration günlüğü açık. Gerçek cihaz/oynanış doğrulaması kullanıcıda kalır. Tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

## Aktif paket — Beta.71 kart kaydırma, benzersiz ad ve veri yetkisi

1. `[x]` Kart ayrıntılarındaki sağ/sol okları kaldır, sürüklemeyi koru
   - Modül ve Çekirdek pencerelerinde ok düğmeleri ve eski stilleri kaldırıldı. Ortak `screens/card-swipe.js`, parmak/fare ile yatay sürüklemede kart değiştirir; dikey kaydırma ve işlem düğmeleri korunur.
   - İptal edilen/çoklu dokunuş hareketi geçiş üretmez; tamamlanan sürüklemenin yanlışlıkla seçim/yükseltme tıklamasına dönüşmesi engellenir. Klavyede sağ/sol ok desteği korunur.
2. `[x]` Sunucu otoriteli kullanıcı adı benzersizliği
   - Unicode NFKC, fazla boşluk ve harf büyüklüğü normalleştirilir; `I/İ/ı/i` aynı ad anahtarına karşılık gelir. Görünmez/kontrol karakterleri reddedilir. AI adları da ayrılmıştır.
   - JSON dosya kilidi ve PostgreSQL transaction advisory lock altında kalıcı kayıtlar kontrol edilir; çevrimdışı oyuncu adı veya eşzamanlı iki istek kontrolü aşamaz. Başarısız kalıcı yazıda bellekteki ad geri alınır; dolu ad HTTP `409` döner.
   - Mevcut veride 28 oyuncu ve bir yinelenen ad grubu (`Kesici`, iki hesap) salt okunur olarak tespit edildi. Eski hesaplar zorla yeniden adlandırılmadı; yeni ad talepleri bu adı alamaz. Eski çakışmaların temizlenmesi ayrı kullanıcı kararıdır ve alakasız ilerleme kayıtlarını durdurmaz.
3. `[x]` Kişisel veri kopyasını oyun kaydından ayır
   - Dışa aktarım artık kayıt yazmaz; sunucunun verisinden salt okunur, `restorable:false` kişisel kopya üretir. HMAC-SHA256 bütünlük imzası sunucu anahtarından ayrı bağlamla türetilir; istemciye anahtar verilmez. Yanıt önbelleğe alınmaz.
   - Eski `/player-data/{id}/save`, `/load` ve doğrudan silme uçları `410` ile kapatıldı. Oyuncu gönderdiği JSON ile ilerleme geri yükleyemez; normal maç/ödül/yükseltme kaydı ve açık onaylı hesap silme akışı korunur.
   - İsim/deste/kozmetik/yükseltme/Çekirdek isteklerine fazladan alan eklenmesi reddedilir. Üretimde kimlik denetimi ortam değişkeniyle kapatılamaz.
   - Kart parçası aktarımı da içerdiğinden takım uçları ortak Bearer/oyuncu sahipliği denetimine alındı; istemci takım isteklerinde de belirteç gönderir.
   - İndirilen dosyanın bilgisayarda düzenlenmesi engellenemez; güvenlik, dosyanın ilerleme kaynağı olarak kabul edilmemesidir. Sunucu dosyalarını/DB'yi doğrudan değiştirebilen makine yöneticisine karşı istemci güvenliği garantisi verilmez.
4. `[~]` Son Öneriler / yerel mobil portre kilidi
   - Android MainActivity ve iOS Info.plist yönleri için tekrar çalıştırılabilir `configure-native-orientation.js` eklendi; mobil proje oluşturma komutları ve Capacitor sync sonrası kancaya bağlandı.
   - Depoda henüz `android/` veya `ios/` projesi yok; kalıcı paket kimliği belirlendikten sonra üretilecek projelere uygulanır. Proje/şablon bulunmadığında açık hata verir. Büyük ekran/pencere modu istisnaları ve gerçek cihaz doğrulaması yayın belgesinde ayrıştırıldı.

Doğrulama: Kullanıcının isteği gereği otomatik test, derleme, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Kod ve diff statik olarak incelendi. İsim çakışması, dosya imzası ve takım sahipliği regresyon sözleşmeleri yazıldı/güncellendi, çalıştırılmadı. Gerçek cihaz ve oynanış sonuçları tamamlanmış sayılmadı.

Devam durumu: Üretim istemci derleme hattının kodu Beta.72'de tamamlandı; mobil ses dönüşümü/müzik katmanları açık. Portre kilidinin cihaz doğrulaması ile mevcut yinelenen adların değiştirilmesi kullanıcı tarafında bekliyor.

## Aktif paket — Beta.70 AI savaş gücü adaleti

1. `[~]` AI modüllerinin oyuncuya göre aşırı güçlü görünmesini incele
   - Kullanıcı otomatik yerleşimin çalıştığını doğruladı; deneme savaşında kendi modülleri hızla yok olurken AI modüllerini yok edemediğini bildirdi.
   - `[x]` Modül üretimi, seviye/nadirlik/yetenek çarpanları, günlük meta, başlangıç Akımı, enerji baskısı, hasar ve destek yolları koddan karşılaştırıldı. AI'ye özel ek CAN/hasar veya ücretsiz kart üretimi bulunmadı. AI ile insan aynı kanonik modül hesaplamasını ve kompozisyon sınırlarını kullanıyor.
   - `[x]` Sabotajda kimlik sırasından gelen ilk hamle avantajı giderildi. Önceden `local-ai-...` kimliği `wt-...` kimliğinden önce işlendiği için aynı tick'te hazır olan insan sabotajı hiç çalışmadan devre dışı kalabiliyordu. İki tarafın hedefi, direnci ve etkisi artık aynı başlangıç durumundan planlanıp sonra uygulanıyor. Aynı taraftaki sabotajların ayrı hedeflere yönelmesi korunuyor; doğrudan saldırı zaten iki aşamalıydı.
   - `[x]` AI modül seviyesi, eski kayıtlı `preferred_battle_pool_ids` yerine iki taraf hazır olduğunda oyuncunun gerçekten gönderdiği altılı destenin ortalama yükseltme seviyesinden hesaplanıyor. Çekirdek seviyesi de aynı noktada oyuncunun maça bağlı Çekirdek seviyesiyle eşleniyor. Yuvarlama, seviye sınırı, botun kart/Çekirdek türü ve günlük meta kuralları değiştirilmedi. Bu eşleme yalnız eşleştirme botlarına uygulanır; sabit eğitim AI'sı ve insan–insan maçları etkilenmez.
   - `[x]` AI eşleşmesi telemetrisindeki daima `0` yazılan kupa farkı gerçek eşleşme farkına düzeltildi.
   - `[ ]` Kullanıcının bildirdiği güç farkının yeni maçta doğrulanması bekliyor. Mevcut kalıcı telemetri maç sonucu/süresini ve harcamaları tutuyor; o maçın anlık CAN, enerji, destek ve hasar durumlarını içeren tekrar kaydı yok. Bu nedenle bildirimin tamamı iki kod hatasına bağlanmadı ve genel modül dengesi gelişigüzel düşürülmedi.

Doğrulama: Kullanıcının kararı gereği otomatik test, sunucu başlatma, tarayıcı veya savaş denemesi çalıştırılmadı. Kod yolları ve diff statik olarak incelendi; `git diff --check` temiz (yalnız Windows satır sonu uyarıları). `server/data/platform_state.json` içindeki önceden var olan çalışma zamanı değişikliklerine dokunulmadı.

Devam notu: Bu iki düzeltme yeni oluşturulan savaşlar içindir; çalışan sunucu yeni kodu yüklemelidir. Oynanış doğrulaması kullanıcıda kalır. Son Öneriler kuyruğundaki kod işleri aşağıda korunuyor; eski manuel hücre seçimi geri getirilmeyecek.

## Aktif paket — Beta.69 otomatik yerleşim ve devre kompozisyonu

Hotfix: Savaş saldırı döngüsünün Devre Gerilimi çarpanında kullandığı `effective_elapsed_ms` yeniden tanımlandı. Tick döngüsünü durduran `NameError` giderildi; bu değişken yalnız saldırı çarpanını hesaplar ve süreyle Çekirdek açma davranışını geri getirmez.

1. `[x]` Tek dokunuşla sunucu yerleşimini geri getir
   - Raf kartına dokunmak artık hücre seçimi başlatmıyor; istemci yalnız modül kimliğini gönderiyor ve sunucu uygun boş hücreyi deterministik olarak seçiyor.
   - Koordinatlı `deploy_module` istemci yolu, seçili kart/hücre vurgusu ve devre hücrelerindeki yerleştirme tıklamaları kaldırıldı.
   - Eski Relay `beginDrag/dropOnCell` yolu artık komut üretmiyor. Sunucu, eski istemciden `x/y` gelse bile oyuncu seçimini kullanmıyor; bütün yeni kopyalar `server_automatic` yerleşim moduyla üretiliyor.
2. `[x]` Kalkan Akım maliyetini kanonik `2` değeriyle eşleştir
   - Sunucu kanonu zaten `2` idi; istemcide kalmış `3` değeri ve kanon belgesindeki eski satırlar `2` olarak düzeltildi.
3. `[x]` Kırılamayan yardımcı-modül yığınını kompozisyon kurallarıyla engelle
   - Savunma, Destek, Sistem ve Sabotaj sınıflarının her biri sahada en fazla `3` aktif modül taşıyabilir.
   - Bu dört sınıfta aynı karttan aynı anda en fazla `2` aktif kopya bulunabilir.
   - Saldırı dışı aktif modül sayısı, aktif Saldırı sayısını en fazla `2` aşabilir; örneğin iki yardımcı karttan sonra üçüncü yardımcı kart için önce Saldırı modülü gerekir.
   - Aynı kurallar insan ve AI yerleşim kararında sunucu tarafından uygulanır; eski yerleştirme/değiştirme komutları da sınırı aşamaz.
4. `[x]` Destek etkilerinin üst üste binmesini sınırla
   - Aynı hedef aynı destek adımında yalnız bir Onarım, bir Soğutma ve bir Aşırı Hızlandırma etkisi alabilir.
   - Bir Saldırı modülü komşu Güçlendirici, Hedefleme Bilgisayarı ve Aşırı Hızlandırıcı arasından yalnız en güçlü tek saldırı desteğini kullanır.
5. `[x]` Süreyle Çekirdek açma ve eritme kuralını kaldır
   - `03:30` sonrası doğrudan Çekirdek hedefleme ile `04:00` sonrası otomatik Çekirdek hasarı kaldırıldı.
   - `03:00` Devre Gerilimi yalnız modül hattındaki saldırı/onarım dengesini hızlandırır; Çekirdek ancak diğer yaşayan modüller ve sistem hattı temizlendikten sonra normal hedef sırasıyla vurulabilir.
   - Verilen hasardan Akım kazanımı, öndeki oyuncuya ek kartopu etkisi yaratacağı için eklenmedi; yardımcı kartların CAN ve enerji değerleri de kompozisyon sınırıyla birlikte topluca cezalandırılmadı.

Doğrulama: Kullanıcının isteği gereği otomatik test, tarayıcı veya savaş denemesi çalıştırılmadı. Değişiklikler kod, kanonik veri ve kural belgeleri üzerinden statik olarak incelendi.

## Aktif paket — Beta.68 üretim kimliği ve yayın sınırı

1. `[x]` Apple ile giriş dönüşünü üretim güvenliğiyle tamamla
   - Apple yetkilendirmesi `form_post`, süreli `state` ve tek kullanımlık `nonce` ile başlatılıyor.
   - Apple client secret, Team ID + Key ID + P-256 özel anahtardan ES256 olarak sunucuda imzalanıyor; hazır istemci sırrı kullanımı da kontrollü dağıtımlar için korunuyor.
   - Apple kimlik belirteci Apple JWKS anahtarından RS256 ile doğrulanıyor; issuer, audience, süre ve nonce talepleri kabulden önce denetleniyor.
   - Hesap bağlama başka bir oyuncuya ait sağlayıcı kimliğini devralmıyor; giriş modu ise mevcut bağlı hesabı bulup güvenli cihaz değişimine yönlendiriyor.

2. `[x]` Google/Apple hesabını gerçek çoklu cihaz oturumuna dönüştür
   - Sağlayıcı dönüşü erişim belirteci taşımayan, beş dakika geçerli ve tek kullanımlık bir değişim kodu üretiyor.
   - Yeni cihaz kendi cihaz kimliği ve kendi yerel sırrıyla bağımsız doğrulayıcı alıyor; eski cihazın sırrı kopyalanmıyor veya üzerine yazılmıyor.
   - JSON ve PostgreSQL kimlik depoları cihaz bazlı doğrulayıcı haritasına geçirildi. Eski tek-sır kayıtları ilk başarılı girişte geriye uyumlu biçimde taşınıyor.
   - Cihaz oturumu iptal edildiğinde hem etkin belirteçler hem o cihazın yeniden giriş doğrulayıcısı kaldırılıyor; hesap kurtarma yalnız kurtaran cihaz için yeni sır kuruyor.

3. `[x]` Üretimde tanılama rotalarını kapat
   - `GRIDSHARD_RUNTIME_MODE=production` altında `/web-test` ve bütün `/web-test/*` istekleri rota çalışmadan açık `404 Not Found` alıyor.

4. `[x]` Çalışma zamanı verilerini Git indeksinden güvenle çıkar
   - `.gitignore`, bütün `server/data/web_test_*` JSON/BAK/TMP türevlerini kapsıyor.
   - Önceden izlenen sekiz JSON/BAK dosyası yalnız Git indeksinden çıkarıldı; dosyaların tamamının çalışma dizininde kaldığı ayrıca doğrulandı.

5. `[x]` Eski HTML5 drag-and-drop istemci yolunu kaldır
   - Modül yerleşimi ve güçlendirici hedefi masaüstü/mobil ayrımı olmadan dokun-seç/yerleştir akışını kullanıyor.
   - `dragstart`, `drop`, `dataTransfer`, sürükleme hayaleti ve bunlara ait ölü CSS kuralları istemciden çıkarıldı.
   - Gerçek Android/iOS uzun basma, kaydırma, iptal ve performans doğrulaması kullanıcının cihaz testinde bekliyor; bu nedenle aşağıdaki birleşik yayın maddesi tamamen kapatılmadı.

6. `[x]` Test bağımlılığı listesini düzelt
   - Kodda ve testlerde kullanımı olmayan `httpx2` kaldırıldı; FastAPI test istemcisinin kullandığı gerçek `httpx` bağımlılığı korundu.

7. `[x]` CI iş akışlarını sürüm kontrolüne al
   - `.github/workflows` genel gizli-klasör ignore kuralından güvenli istisna olarak çıkarıldı.
   - GitHub Actions; Python 3.12 sunucu sözleşmelerini, Node 22/pnpm istemci sözleşmelerini ve ikisi geçtikten sonra release guard + kaynak ZIP/SHA-256 paketini çalıştırıyor.
   - Üretilen kaynak adayı commit SHA ile adlandırılan, 14 gün saklanan CI artifact'i olarak yükleniyor.

8. `[x]` Uygulama içi satın alma karar kapısını kapat
   - Bu yayın için gerçek para, ücretli sezon yolu ve IAP kapsam dışı bırakıldı; mevcut teklifler yalnız kazanılan oyun içi para birimlerini kullanıyor.
   - Mobil yayın belgesi, Billing/StoreKit SDK'sı ve mağaza ürün kimliği eklenmemesini açıkça kaydediyor. Karar değişirse makbuz doğrulama, idempotent teslim ve iade/iptal işleme tamamlanmadan UI fiyatı açılamaz.

9. `[~]` PostgreSQL şema geçişlerini sürümlendir
   - Numaralı ileri/geri SQL dosyaları `schema_migrations` tablosunda SHA-256 checksum ile izleniyor; uygulanmış migration değişirse sunucu açılışı duruyor.
   - Çoklu cihaz alanı geçmiş `001` dosyasını değiştirmek yerine `002_identity_devices` migration'ına ayrıldı.
   - Eşzamanlı uygulama PostgreSQL advisory lock ile tekilleştirildi. `status`, dağıtım öncesi `check`, `up` ve yalnız `--allow-destructive` onaylı `down` operatör aracı eklendi.
   - PostgreSQL bölümü tamamlandı. Dosya tabanlı JSON depolarının ortak şema sürümü/ileri-geri migration kaydı henüz eklenmediği için ana kuyruk maddesi açık kalıyor.

Doğrulama: Kullanıcının talebi gereği otomatik test, tarayıcı veya gerçek cihaz denemesi çalıştırılmadı. Kod ve dağıtım farkları statik olarak incelendi; gerçek Apple/Google sağlayıcı anahtarları dağıtım ortamında girilmelidir.

## Aktif paket — Beta.67 gerçek telefon savaş ve profil yerleşimi

Kaynak doğrulama: Aynı Wi‑Fi ağında `192.168.1.104:8879` üzerinden açılan Android/Chrome portre görünümünün dört ekran görüntüsü incelendi. Aşağıdaki kararların kod uygulaması tamamlandı; gerçek cihaz yerleşim doğrulaması kullanıcıda bekliyor.

1. `[x]` Mobil savaşta oyuncu ve rakip devrelerini aynı arena görünümünde göster
   - Telefon görünümündeki `Devrem` / `Rakip` devre geçişi kaldırılmalı; rakip devresi üstte, oyuncu devresi altta ve `VS` ayracı ortada olacak şekilde iki taraf aynı anda görünmelidir.
   - Kullanıcı rakibin saldırısını, iki Çekirdeğin CAN durumunu, Akım animasyonlarını ve kendi devresinin sonucunu sekme değiştirmeden izleyebilmelidir.
   - İki devre mevcut boş dikey alanı kullanarak portre ekrana birlikte sığdırılmalı; kart oranları, dokunma hedefleri, isim/CAN bilgisi ve sabit alt el–Akım–Çekirdek gücü alanı okunabilir kalmalıdır.
   - `data-mobile-battle-panel="player|enemy"` ile bir tarafı gizleyen eski mobil kural ve buna bağlı Devrem/Rakip düğmeleri kaldırılmalı. Modül rafı gerekiyorsa devre görünürlüğünü bozmayan ayrı alt el davranışı olarak kalmalıdır.
   - Yerel AI, normal PvP, arkadaş maçı ve takım turnuvası aynı çift-devre mobil bileşenini kullanmalı; tek bir maç türü eski sekmeli düzene geri düşmemelidir.
   - Eski mobil savaş sekmeleri, `data-mobile-battle-panel` görünürlük kuralı ve kullanılmayan mobil panel denetleyicisi kaldırıldı. Ortak savaş DOM'u portrede rakibi üstte, oyuncuyu altta ve sabit rafı en altta birlikte gösteriyor.

2. `[x]` Yerleşmiş modüle dokununca açılan eski taşıma/iptal akışını kaldır
   - Devrede aktif olan bir modüle dokunmak `... seçildi · hedef hücreye dokun`, `Rafa Al` veya `Seçimi Kaldır` araç çubuğunu açmamalıdır.
   - Yerleşmiş modül yeniden taşınmamalı, başka hücreyle değiştirilmemeli ve savaş sırasında rafa geri alınmamalıdır; eski `beginDrag → dropOnCell/dropOnShelf` mobil yeniden yerleştirme yolu aktif kartlar için kapatılmalıdır.
   - Yeni modül yerleştirme alt elde/rafta bulunan uygun karta tek dokunuşla başlamalı; oyuncu hücre seçmemeli, sunucu uygun boş hücreyi otomatik belirlemelidir.
   - Yerleşmiş karta dokunma davranışı gerekiyorsa yalnız salt okunur savaş bilgisi veya hedef seçimi gibi güncel işlemlere ayrılmalı; taşıma vurgusu ve eski karar düğmeleri üretmemelidir.
   - Aktif modül için `beginDrag`, hücre taşıma/takas ve rafa alma istemci katmanında reddediliyor. Beta.69 ile raf kartı tek dokunuşta koordinatsız `deploy_module` gönderiyor ve sunucu uygun hücreyi otomatik seçiyor.

3. `[x]` Profil alt sekmesini Sezon Geçmişi ve İstatistikler içeriğinin üzerinden kaldır
   - Portre görünümünde `PROFİL / KOZMETİK / ÖDÜLLER / ARKADAŞ / AYARLAR` çubuğu kaydırılan profil içeriğinin ortasına yapışmamalı ve Sezon Geçmişi/İstatistik kartlarını kapatmamalıdır.
   - Alt sekme çubuğu profil terminal çerçevesinin gerçek alt kenarına sabitlenmeli; içerik alanına çubuğun yüksekliği ve cihaz güvenli alanı kadar alt boşluk verilmelidir.
   - Sayfa kaydırıldığında Sezon Geçmişi kartı, üç sezon özeti ve bütün istatistik kartları sekmenin arkasından görünmeden tamamen okunup dokunulabilmelidir.
   - Aynı düzeltme beş profil alt ekranında ve `360–430 px` telefon genişliklerinde doğrulanmalı; ana alt gezinme ile profil alt gezinmesi üst üste binmemelidir.
   - Beş düğmeli terminal çubuğu telefon görünümünde ana gezinmenin hemen üstündeki ayrılmış sabit alana taşındı. Profil, Kozmetik, Ödüller, Arkadaş ve Ayarlar içeriklerine çubuk yüksekliği ile güvenli alan kadar alt kaydırma boşluğu eklendi.

4. `[ ]` Beta.67 için gerçek cihaz regresyon kapsamı ekle
   - Portre telefon testinde aynı karede hem oyuncu hem rakip devresi bulunduğu, aktif modüle dokunmanın taşıma araçlarını açmadığı ve profil sekmesinin sezon/istatistik içeriğini kapatmadığı doğrulanmalıdır.
   - Tarayıcı performans göstergesi açıkken ve kapalıyken yerleşim değişmemeli; Android Chrome güvenli alanı ve alt sistem gezinme çubuğu ayrıca kontrol edilmelidir.
   - `[x]` DOM/CSS ve istemci komut sözleşmesini koruyan `beta67-mobile-battle-profile.test.js` eklendi; eski Relay taşıma beklentileri yeni sabit modül kararına uyarlandı.
   - `[ ]` Kullanıcının isteği gereği çalıştırmalı test ve tarayıcı/telefon denemesi yapılmadı. `360–430 px` Android Chrome, performans göstergesi ve sistem gezinme çubuğu kontrolleri kullanıcı doğrulamasına bırakıldı.

Doğrulama: Kullanıcının açık talebi nedeniyle test paketi ve tarayıcı çalıştırılmadı. Yalnız statik sözleşme kapsamı eklendi ve metin/diff tutarlılığı incelendi.

## Aktif paket — Beta.66 meta yüzdesi, sağlayıcı hesabı ve favicon

1. `[x]` Günlük meta kartında seçimin sayısal etkisini göster
   - Etkinlik Merkezi kartı artık sade açıklamayı korurken seçilen metanın `effect_tr` değerini de aynı satırda gösteriyor; örneğin `Destek etkisi +%12` kaybolmuyor.
2. `[x]` Çark durduğunda dilim yazılarının yerinden kaymasını engelle
   - Dilim üzerindeki radyal yerleşim dış kapsayıcıya, yazıyı düz tutan ters dönüş iç öğeye ayrıldı. Karşı dönüş artık konum dönüşümünü ezemediği için sonuç görünümünde başlıklar kendi dilim merkezlerinde kalıyor.
3. `[x]` E-posta doğrulamasını gerçek teslim adaptörüne bağla
   - SMTP/STARTTLS teslimi eklendi; Gmail veya Google Workspace gönderimi gerekli ortam değişkenleri girildiğinde doğrulama kodunu gerçekten gönderiyor.
   - Yerel geliştirmede açığa çıkarılan kod hem ilk açılışta hem Ayarlar ekranında doğrulama alanına otomatik yerleştiriliyor; artık yalnız `istek kaydedildi` çıkmazında kalmıyor.
4. `[x]` Google hesap bağlantısının OAuth dönüşünü tamamla
   - Google yetkilendirme adresi, süreli `state`, sunucuda kod-belirteç değişimi, UserInfo doğrulanmış e-posta kontrolü ve hesaba kalıcı bağlantı eklendi.
   - Başarı, iptal ve hata dönüşleri oyuna geri yönleniyor; Docker Compose sağlayıcı ortam değişkenlerini sunucuya aktarıyor. Gerçek bağlantı için Google Cloud'dan web OAuth istemci kimliği/gizli anahtarı ile kayıtlı callback URI girilmesi zorunlu; anahtar yokken sahte başarı üretilmiyor.
5. `[x]` Mağaza ikonunu tarayıcı faviconu olarak kullan
   - Mağaza ikonundan `32×32` ve `192×192` favicon türevleri eklendi; HTML bağlantılarına Beta.66 önbellek anahtarı verildi.
6. `[x]` `Son Öneriler.docx` raporunu güncel kodla karşılaştır
   - Rapor görev komutu olarak değil, eski Beta.43 durumuna göre hazırlanmış değerlendirme kaynağı olarak ele alındı.
   - Zaten tamamlanmış hesap kurtarma, cihaz oturumu/iptali, belirteç iptali, istemci push köprüsü, mağaza ikonu ve düzeltilmiş eski test maddeleri aşağıdaki kuyruğa yeniden eklenmedi.

Doğrulama: Tam istemci paketi `47/47`, platform servis paketi `7/7` geçti. `platform_services.py` ile `main.py` Python sözdizimi temizdir. `git diff --check` yalnız Windows satır sonu uyarıları verdi.

## Son Öneriler'den kalan gerçek görevler

### Yayın engelleyicileri

1. `[x]` Apple ile giriş dönüşünü ve üretim anahtar imzalama akışını tamamla
   - Apple client secret/JWT üretimi, form-post callback, kimlik belirteci doğrulaması ve hesap çakışması kuralları Google akışıyla aynı güvenlik düzeyine getirilmeli.
2. `[x]` Sağlayıcı hesabını gerçek çoklu cihaz oturumuna dönüştür
   - Google/Apple kimliğiyle başka cihazda mevcut oyuncu hesabını bulup yeni cihaza bağımsız kimlik bilgisi verilmesi gerekiyor; mevcut cihaz sırrını kopyalamak veya tek sırla değiştirmek yeterli değil.
3. `[x]` Üretimde `/web-test/*` rotalarını kapat
   - `GRIDSHARD_RUNTIME_MODE=production` altında tanılama rotaları kayıt edilmemeli veya açıkça `404` vermeli; istemci tarafındaki gizleme güvenlik sınırı sayılmamalı.
4. `[x]` Çalışma zamanı JSON/BAK/TMP dosyalarını Git geçmişinden güvenli biçimde çıkar
   - `.gitignore` desenleri hazır olsa da önceden izlenmiş `server/data/web_test_*` dosyaları hâlâ sürüm kontrolünde. Kullanıcı verisi silinmeden `git rm --cached` ve dağıtım veri dizini geçişi planlanmalı.
5. `[ ]` Mobil dokunma/işaretçi akışını gerçek cihazlarda doğrula ve eski HTML5 drag-and-drop yolunu kaldır
   - Birincil tek dokunuşla sunucunun otomatik hücreye yerleştirdiği akış korunmalı; manuel hücre seçimi geri getirilmemeli. iOS/Android uzun basma, kaydırma ve iptal davranışları kullanıcı tarafından doğrulanmalı.
   - `[x]` Kod tarafındaki HTML5 drag-and-drop ve ölü stil yolu kaldırıldı.
   - `[ ]` Gerçek Android/iOS uzun basma, kaydırma, iptal ve FPS kontrolü kullanıcı doğrulamasında bekliyor.

### Ürün ve altyapı

6. `[ ]` Savaş seslerini mobil biçimlere dönüştür ve müzik katmanlarını etkinleştir
   - Büyük WAV dosyaları OGG/AAC türevlerine taşınmalı; `GRIDSHARD_BATTLE_MUSIC_ENABLED` üretimde açılmalı ve farklı savaş durumlarının aynı dosyayı tekrar kullanması giderilmeli.
7. `[~]` Dikey ekran kilidini yerel mobil kabuğa ekle
   - CSS medya sorgusuna ek olarak Capacitor/Android/iOS yapılandırmasında portrait orientation kilidi tanımlanmalı.
   - `[x]` Beta.71: Android MainActivity ve iOS Info.plist için portre yapılandırıcısı mobil add/sync akışına bağlandı; beklenmeyen şablonda sessiz başarı vermez.
   - `[ ]` Gerçek paket kimliğiyle yerel projeleri üretme ve cihazda dönüş/güvenli alan doğrulaması bekliyor. Mevcut depoda native projeler yok.
8. `[ ]` Gerçek cihaz performans bütçesi ve FPS ölçümü oluştur
   - Düşük/orta seviye cihazlarda savaş DOM güncellemeleri, efekt yoğunluğu, bellek ve kare süresi kaydedilmeli; kabul eşikleri release check'e bağlanmalı.
9. `[ ]` JSON/PostgreSQL şema geçişlerini sürümlü migration sistemine taşı
   - Üretim veri değişiklikleri için Alembic benzeri ileri/geri migration, şema sürümü ve dağıtım öncesi kontrol eklenmeli.
   - `[x]` PostgreSQL numaralı migration, checksum, advisory lock, status/check/up ve onaylı down akışı tamamlandı.
   - `[ ]` JSON depoları için ortak dosya şema sürümü ve geri alınabilir migration günlüğü bekliyor.
10. `[ ]` Gerçek FCM/APNs gönderim adaptörlerini tamamla
   - İstemci izin/token kaydı hazır; sunucu teslim sağlayıcısı, kimlik bilgileri, token yenileme/hata temizliği ve imzalı mobil yapılandırma hâlâ gerekli.
11. `[x]` CI iş akışlarını sürüm kontrolüne al
   - `.github/` genel ignore kapsamından çıkarılmalı; istemci, sunucu ve paketleme doğrulamaları için gerçek workflow dosyaları eklenmeli.
   - Beta.72: mevcut dosyanın Git tarafından hâlâ yok sayıldığı saptanıp workflow YAML istisnaları düzeltildi; üretim web paketi ve artifact adımları eklendi. Uzak CI çalıştırılmadı.
12. `[x]` Test bağımlılığındaki `httpx2` paketini doğrula ve gereksizse kaldır
   - `server/requirements-test.txt` içindeki `httpx` yanında bulunan `httpx2>=2.4,<3.0` kaynağı ve kullanımı doğrulanmalı.

### Bakım kuyruğu

13. `[~]` Büyük istemci ve sunucu dosyalarını alan modüllerine böl
   - `client/src/app.js` ve `server/app/main.py` ekran/rota alanlarına ayrılmalı; davranış önce sözleşme testleriyle sabitlenmeli.
   - Beta.71: kart sürükleme, ad normalleştirme/benzersizlik ve kişisel dışa aktarım ayrı alan modüllerine alındı. Büyük dosyaların kalan ekran/rota ayrıştırması henüz yapılmadı.
14. `[x]` Üretim istemci derleme hattı kur
   - Beta.72: ortak web/mobil JS-CSS paketleme, küçültme, SHA-256 dosya adları, otomatik HTML güncellemesi, üretim önbelleği, Docker derleme katmanı ve CI artifact'i eklendi.
   - Kullanıcının talebiyle derleme/test çalıştırılmadı; kod uygulaması tamamlandı, CI/gerçek cihaz yayın doğrulaması bekliyor. İşletim ayrıntıları `docs/CLIENT_BUILD.md` içinde.
15. `[ ]` `canon.css` ve `styles.css` sahipliğini uzlaştır
   - Tekrarlanan kurallar ve yüksek sayıdaki `!important` kullanımı ekran bazında azaltılmalı; görsel regresyon testleriyle korunmalı.
16. `[ ]` Türkçe/İngilizce yerelleştirmeyi tamamla
   - Kod içine gömülü kalan metinler anahtar sözlüğüne taşınmalı; çoğul, sayı/tarih ve hata mesajı kapsaması eklenmeli.
17. `[ ]` Ürün analitiğini mahremiyet kontrollü biçimde ekle
   - Huni, savaş sonucu, elde tutma ve performans olayları için açık şema, onay/opt-out ve veri saklama politikası tanımlanmalı.
18. `[x]` Uygulama içi satın alma karar kapısını kapat
   - Para kazanma kapsamdaysa mağaza makbuz doğrulama ve ürün kataloğu tasarlanmalı; kapsam dışıysa release belgelerinde açıkça ertelenmeli.

## Aktif paket — Beta.65 hesap açılışı, Devre Koleksiyonu ve mağaza ikonu

1. `[x]` Günlük meta çarkındaki başlıkları her durumda düz tut
   - Dilim başlıkları çarkın dönüşünü eş zamanlı ters yönde dengeliyor; çark dönerken ve seçilen metada durduğunda yazılar baş aşağı kalmıyor.
   - Sabit çentik dönme katmanının dışında kalmaya devam ediyor.
2. `[x]` Profilin ilk kartını bütünüyle başarı koleksiyonuna ayır
   - Kart içindeki tekrarlanan avatar, oyuncu adı, unvan, ilerleme ve mevcut kupa satırı kaldırıldı.
   - Başlık `DEVRE KOLEKSİYONU` olarak değiştirildi ve ortalandı; kartın tamamı kalıcı sıralama kupaları ile rozetlerin sergilendiği alan oldu.
3. `[x]` Hareketli emoji ve rekabet ödülü çeşitliliğini artır
   - Savaş emoji çizicisi gliflerin yanında GIF/görsel kaynağını da güvenli `<img>` öğesiyle destekliyor.
   - Çekirdek Patlaması, Glitch Dalgası ve Aşırı Yük hareketli emojileri eklendi; ilk 10 sezon kasalarında yeni avatar, çerçeve ve profil çubuğu ödülleri dağıtıldı.
   - Yeni profil arka planları ve avatar çerçeveleri seçim ekranı ile üst profil barında kendi görsel stillerine sahip.
4. `[x]` İlk açılış hesap kaydı ekranını göster
   - Anonim cihaz oturumu oluşturulduktan sonra kalıcı e-posta/OAuth kimliği olmayan oyuncuya Google, Apple, e-posta doğrulama ve misafir seçenekleri sunuluyor.
   - E-posta kod isteme/doğrulama mevcut hesap API'sine bağlı; geliştirme modunda kod güvenli biçimde varsayılan olarak açılıyor ve giriş alanına otomatik taşınıyor. Üretim modunda bu davranış varsayılan olarak kapalı.
   - Google/Apple yapılandırılmadığında düğmeler açıkça hazır olmadığını söylüyor ve sahte başarı üretmiyor. Beta.66 ile Google callback/kod değişimi ve SMTP teslim adaptörü tamamlandı; Apple dönüşü ile dağıtım kimlik bilgileri hâlâ bekliyor.
5. `[x]` GRIDSHARD mağaza ikonunu üret ve projeye bağla
   - Özgün kırık cam Çekirdek, altın Akım halkası ve devre geometrisinden oluşan metinsiz ikon üretildi.
   - Kaynak, `1024x1024` mağaza/Apple ve `512x512` Android/PWA sürümleri `client/assets/branding/` altına eklendi.
   - Web manifesti ve Apple dokunma ikonu bağlantısı etkinleştirildi; köşeler mağaza maskeleri için görsele işlenmedi.

Doğrulama: JavaScript ve Python sözdizimi temiz; tam istemci paketi `46/46` test dosyası ve Relay alt paketi `176/176` geçti. Beta.61/Beta.62/Beta.65 sunucu paketi `11/11` geçti. `git diff --check` yalnız mevcut Windows satır sonu uyarılarını verdi, içerik hatası yoktur.

## Aktif paket — Beta.64 ödül önizleme katmanı ve profil başarı vitrini

1. `[x]` Liderlik ödül önizlemesini diğer sandıkların üstünde tut
   - Sandık parıltısının oluşturduğu ayrı CSS katmanı kaldırıldı; aynı görünüm `box-shadow` ile korunuyor.
   - Üzerine gelinen veya klavye odağı alan liderlik satırı listenin en üst katmanına taşınıyor; alttaki sıraların sandıkları açık önizlemenin önüne geçmiyor.
2. `[x]` Profil kimlik kartına gerçek kupa ve rozet koleksiyonu ekle
   - Kimlik kartı içinde `Kupa ve Rozet Vitrini` oluşturuldu; sıralama kupaları ile rozetler ayrı koleksiyonlarda gösteriliyor.
   - Vitrin yalnız sunucuda kalıcı olarak açılmış `unlocked_rank_trophy_ids` ve `unlocked_badge_ids` öğelerini kullanıyor; ödül kasası açıldığında profil yenilenerek vitrin de anında güncelleniyor.
   - Henüz kazanım yoksa iki koleksiyon da anlaşılır boş durum metni gösteriyor; bilinmeyen gelecek ödül kimlikleri de güvenli bir genel görünümle sergileniyor.

Doğrulama: Beta.64 hedef istemci testi geçti; tam istemci paketi `33/33` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.63 liderlik ödül önizlemesi ve sade meta kartı

1. `[x]` Liderlik ödüllerini sandık önizlemesine taşı
   - Genel Kupa ilk 10 satırında sandık adı ve evrensel parça özeti artık oyuncu adının altında sürekli görünmüyor.
   - Sandık üzerine gelindiğinde veya klavyeyle/mobil dokunmayla odaklandığında Devre Kredisi, Akı, evrensel kart parçası ve o sıraya ait bütün kozmetikler tek önizleme kartında gösteriliyor.
   - Önizleme ilk üç sırada aşağı, diğer sıralarda yukarı açılarak görünür listenin kenarlarında daha az kırpılıyor.
2. `[x]` Etkinlik Merkezi meta kartını sadeleştir
   - Tekrarlanan `ETKİNLİK MERKEZİ`, `BUGÜNÜN METASI`, ayrı sayısal etki ve AI/etkinlik programı ayrıntıları kaldırıldı.
   - Kartta yalnız seçilen meta adı ile tek cümlelik anlaşılır meta açıklaması kalıyor; seçim yapılmadıysa kısa çark yönlendirmesi gösteriliyor.

Doğrulama: Beta.59/Beta.61/Beta.62 hedef istemci paketi `3/3`; tam istemci paketi `44/44` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.62 görünüm düzeltmeleri, nadirlik dengesi ve platform altyapısı

1. `[x]` Günlük meta çarkını sonuç durumunda da okunabilir tut
   - Sabit üst çentik çarkla dönmüyor; dilim yazıları dilim merkezlerine bağlı kalıyor.
   - Sonuç ekranında çark küçülürken yazı yarıçapı da birlikte küçülüyor; başlıklar çemberin dışına taşmıyor.
2. `[x]` Lider Panosu kapsamını oyuncunun bulunduğu gruba sabitle ve sekmeleri kalıcı tut
   - `GRUP` görünümü arena/lig seçicisini kaldırdı; sunucunun oturum sahibi için döndürdüğü `viewer_trophy_group` otomatik kullanılıyor.
   - `KUPA`, `ÇEKİRDEK` ve `TAKIM` alt gezinmesi bütün sıralama türlerinde görünür kalan sabit alt satıra taşındı.
3. `[x]` Savaş Akım rotasını ve kart ayrıntısı gezinmesini düzelt
   - Akım önce çekirdek satırında beslenen bütün sütunlara ulaşıyor, ardından her sütunda yukarı/aşağı yerleşik modüllere ayrı dikey dal çiziyor.
   - Modül ve çekirdek önceki/sonraki okları kart ayrıntısının dikey orta çizgisine alındı.
4. `[x]` Takım yönetimini sayfa içine taşı; çıkarma ve ayrılmayı çalışır hale getir
   - Yönetim artık modal açmıyor; Takım ekranının normal içerik alanında geri dönüşlü ayrı panel olarak açılıyor.
   - Lider diğer üyeleri çıkarabiliyor; her oyuncu kendi satırında takımdan ayrılabiliyor. Lider ayrılırsa sıradaki üyeye yöneticilik aktarılıyor, son üye ayrılırsa takım dağılıyor.
5. `[x]` Modül ve çekirdek nadirlik eğrilerini savaş değerlerine uygula
   - Mevcut modül eğrisi CAN, saldırı, etki/onarım/sabotaj, bekleme ve Akım verimini Yaygın < Nadir < Epik < Efsanevi biçiminde koruyor.
   - Çekirdeklere de ayrı CAN, aktif etki, enerji üretimi ve güç dolumu çarpanları eklendi; laboratuvar gösterimi ile canlı savaş aynı enerji sözleşmesini kullanıyor.
6. `[x]` Hesap güvenliği ve veri hakları yüzeylerini kur
   - Süreli e-posta/telefon doğrulama kodu, deneme sınırı, hesap kurtarma, cihaz oturumu listeleme/iptal, belirteç iptali, veri dışa aktarma ve doğrulama metinli hesap silme uçtan uca bağlandı.
   - Google/Apple OAuth başlatma durum/nonce sözleşmesi ve Ayarlar düğmeleri eklendi; sağlayıcı yapılandırılmadığında sistem sahte başarı üretmiyor.
7. `[x]` Sosyal platform ve mobil köprüleri kur
   - Davet kodu, web bağlantısı ve QR içeriği; bağlantı açıldığında daveti kabul eden web/özel şema deep-link tüketimi; DM, engelleme, şikâyet ve profil paylaşımı eklendi.
   - Mobil `appUrlOpen` köprüsü ve PushNotifications eklentisi bulunduğunda izin/token kaydı eklendi; bildirimler hedef deep-link ile kalıcı kuyruğa yazılıyor.
8. `[x]` Savaş emojilerini gerçek zamanlı savaş kanalına bağla
   - Seçili ve kazanılmış emoji, üç saniyelik bekleme sınırıyla sunucu WebSocket komutu olarak doğrulanıyor.
   - Olay iki savaş istemcisine yayımlanıyor ve ilgili devrenin üzerinde süreli emoji balonu olarak gösteriliyor.

Üretim etkinleştirme notu: Google kod değişimi ve SMTP e-posta teslim kodu Beta.66'da tamamlandı; çalışmaları için gerçek sağlayıcı kimlik bilgileri dağıtım ortamına girilmelidir. Apple kod değişimi, SMS teslimi ve FCM/APNs gönderimi ile mobil imzalama hâlâ bekliyor. Kod bu değerler yokken başarı taklidi yapmaz.

Doğrulama: Beta.58–62 geniş sunucu paketi `38/38`; Beta.62 seçili paket `15/15`; istemci paketi `44/44` test dosyası ve Relay istemci alt paketi `176/176` geçti. JavaScript/Python sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.61 sosyal maç kapanışı, rekabet ödülleri ve takım yönetimi

1. `[x]` Biten arkadaş ve takım antrenman savaşlarının girişini kalıcı olarak kapat
   - Savaşın oturum kimliği terminal callback'te doğru `battle_id` alanından okunuyor; iki taraftaki arkadaş davetleri ve takım antrenman kayıtları `completed` durumuna geçiriliyor.
   - Okuma anındaki terminal durum uzlaştırması eski kabul kayıtlarını da kapatıyor; tamamlanan savaşta `SAVAŞ ALANINA GİR` düğmesi yeniden görünmüyor.
2. `[x]` Günlük meta çarkının sabit işaretçisini ve dilim yazılarını düzelt
   - Üst çentik dönen çarkın dışına taşındı; yalnız çark ve dilimler dönüyor.
   - Yedi başlık eşit açılarla, kendi diliminin merkezine dönük ve okunabilir yönde yerleştirildi.
3. `[x]` Çekirdekten yukarı/aşağı Akım omurgasını görünür yap
   - Besleme rotası önce çekirdeğin merkez sütununda hedef satıra, ardından yatay kola ilerliyor; sağ/sol bağlantılara ek olarak üst ve alt satırlarda da hareketli Akım çizgisi oluşuyor.
4. `[x]` Kart ayrıntıları arasında oklarla gezinme ekle
   - Modül ve çekirdek bilgi pencerelerine önceki/sonraki okları eklendi; pencere kapanmadan koleksiyonun tamamı döngüsel gezilebiliyor.
5. `[x]` Lider Panosunu Genel/Grup sıralaması ve ilk 10 kasasıyla genişlet
   - Alt sekmeler `KUPA`, `ÇEKİRDEK`, `TAKIM` adlarını gösteriyor; Kupa sıralamasında `GENEL` ve arena bazlı `GRUP` kapsamları bulunuyor.
   - Genel ilk 10 için konuma göre azalan Devre Kredisi, Akı ve evrensel modül parçası; seçili sıralarda kupa, rozet, avatar, çerçeve, savaş emojisi ve profil çubuğu arka planı tanımlandı.
   - Sıra yanındaki sandıklar mevcut sandık görsel dilini kullanıyor ve sezon kasası kimliğini önizliyor.
6. `[x]` Sezon/hafta/takım turnuvası ödüllerini mesaj kutusuna teslim et
   - Üst profil çubuğuna zarf düğmesi eklendi; alınmamış hediye varsa sarı yanıp sönüyor.
   - Kapanan sezon ilk 10, haftalık ilk 3 ve katkı şartını sağlayan takım turnuvası ilk 3 ödülleri tekil kimlikle kuyruğa alınır; `AL VE AÇ` işlemi kredi, Akı, evrensel parça ve kozmetiği kalıcı envantere işler.
   - Yeni dönem kaydı veya ilk yeni dönem maçı eski sayaçları sıfırlamadan önce ödül uzlaştırması çalışır; aynı ödül iki kez üretilemez veya alınamaz.
7. `[x]` Kozmetik ekranını emoji ve profil çubuğu arka planlarıyla tamamla
   - `AVATAR` alt sekmesi `KOZMETİK` oldu; avatar ve çerçevelerin altına savaş emojileri ile profil çubuğu arka planları eklendi.
   - Seçimler oyuncu profiline kalıcı yazılıyor; seçili profil arka planı üst profil çubuğunda ve profil kimliğinde uygulanıyor.
8. `[x]` Takım katılımını yönetici onaylı başvuruya ve takım profil barını yönetim alanına dönüştür
   - `KATIL` yerine `BAŞVUR` kullanılıyor; aday yönetici kabul edene kadar üye sayılmıyor ve aynı anda başka takıma başvuramıyor.
   - Takım başlığında avatar, çerçeve, isim çerçevesi ve profil çubuğu arka planını taşıyan kimlik kartı bulunuyor. Yönetici bu karttan başvuruları kabul/ret, üye çıkarma, yöneticilik devri ve takım kozmetiği seçimini yapabiliyor.
9. `[x]` Haftalık ve takım turnuvası ilk üç sandıklarını ayrı aileler olarak dengele
   - Haftalık 1. sandık Akı, Devre Kredisi, avatar, çerçeve ve savaş emojisi; 2. sandık emojisi çıkarılmış ve azaltılmış; 3. sandık emoji/çerçevesi çıkarılmış daha düşük pakettir.
   - Takım ilk üç sandığı normal sandıklardan farklı görsel kimlik kullanır; 1. takım avatarı, çerçevesi, isim çerçevesi ve takım barı arka planını birlikte verir, 2. ve 3. paketler kademeli azalır. En az `5` katkı puanı şartı korunur.

Doğrulama: Beta.58–61 seçili sunucu paketi `31/31`; Beta.61 sunucu paketi `4/4`; istemci paketi `43/43` test dosyası ve Relay istemci alt paketi `176/176` geçti. Python/JavaScript sözdizimi ve `git diff --check` temizdir. Takım başvurusu/onayı, bitiş callback kimliği, haftalık ödülün tekil teslimi ve kalıcı açılması, ilk 10/ilk 3 sandık sözleşmeleri, sabit çark işaretçisi, dikey Akım rotası ve yeni ekran yüzeyleri regresyon kapsamına alındı.

## Önceki aktif paket — Beta.60 maç türüne göre bağımsız hesaplama

1. `[x]` Normal PvP ilerlemesini arkadaş ve takım turnuvası maçlarından ayır
   - `ranked_pvp` ve dereceli `arena_ai` normal profil akışını kullanır; kupa, deneyim, Devre Yolu, Devre Kredisi, sandık, günlük emir ve kalıcı savaş istatistikleri yalnız bu normal ilerleme yolunda işlenir.
   - `friend_battle` ve `team_training` tamamen antrenman sayılır; profil, kupa, deneyim, Devre Yolu, kredi, sandık, günlük emir ve kalıcı istatistiklere hiçbir katkı yapmaz.
2. `[x]` Takım turnuvasını kendi puan defterine taşı
   - `team_tournament` normal profil ilerlemesine dokunmaz ve kupa hesaplamaz; yalnız turnuva maç/galibiyet sayacı ile galibiyet başına `1` takım katkı puanı işler.
   - Katkı puanı kalıcı oyuncu verisine eklendi; aylık takım sıralaması ve en az `5` puanlık ödül uygunluğu artık bu açık sayaçtan okunur.
3. `[x]` Haftalık Devre Turnuvasını yalnız kazanılmış PvP kupalarıyla sırala
   - Haftalık kayıt sonrasında sadece `ranked_pvp` ve dereceli `arena_ai` maçlarında kazanılan pozitif kupa ayrı haftalık toplamda birikir.
   - Arkadaş savaşı, takım antrenmanı ve takım turnuvası haftalık maç/galibiyet/kupa sayaçlarını değiştirmez.
4. `[x]` Maç sonu ekranında hesap türünü görünür kıl
   - Takım turnuvasında normal ödül kartları yerine takım katkı puanı gösterilir ve kupa/profil ilerlemesi olmadığı açıklanır.
   - Arkadaş ve takım antrenmanında ödül kartları gizlenir; maçın profil, kupa ve Devre Yolu bakımından nötr olduğu yazılır.

Doğrulama: Beta.60 sunucu paketi `7/7`; Beta.60/Beta.59/Beta.58 seçili sunucu paketi `23/23`; istemci paketi `42/42` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaş/antrenman nötrlüğü, takım turnuvasının yalnız kendi katkı puanını işlemesi, puanın kalıcılığı, haftalık sıralamanın yalnız normal dereceli PvP kupalarını toplaması ve ayrı maç sonu sunumları regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.59 etkinlikler, sosyal ağ ve kupasız savaş alanları

1. `[x]` Etkinlik merkezini günlük meta ve okunabilir ödül kartları etrafında yeniden düzenle
   - Ana ekrandaki büyük `Turnuvalar` başlığı kaldırıldı; günlük meta doğrudan etkinlik başlığına yerleştirildi.
   - İlk üç ödülü artık madalya, sandık görseli/adı, Devre Kredisi, Akı ve kozmetik içeriklerini ayrı etiketlerle gösteriyor.
   - Haftalık turnuvaya `100 Devre Kredisi` ile oyuncu katılımı, aylık takım turnuvasına yalnız liderin ücretsiz kayıt akışı eklendi.
2. `[x]` Haftalık sıralamayı kayıt sonrası kazanılan normal Arena kupalarına bağla
   - Kayıtsız gerçek oyuncular haftalık sıralamaya alınmıyor; kayıt anında haftalık sayaçlar sıfırlanıyor.
   - Kayıttan sonra yalnız `arena_ai` ve `ranked_pvp` maçlarında kazanılan pozitif kupa haftalık skora ekleniyor.
3. `[x]` AI zaferlerinde `+0 Kupa` üreten eşleştirme sapmasını kaldır
   - Normal AI eşleştirmesi artık sessizce takım turnuvası oturumuna çevrilmiyor; `arena_ai` dereceli ve kupa uygunluğu açık kuruluyor.
   - Arkadaş savaşı ve takım antrenmanı ise açıkça kupasız, ödülsüz ve normalleştirilmiş ayrı oturum türleri olarak kalıyor.
4. `[x]` Çekirdek patlamasından önce CAN göstergesini kesin olarak sıfırla
   - Terminal sonuç son savaş snapshot'ından önce gelse bile yok edilen çekirdek istemci modelinde ve görünen devrede `0 CAN / destroyed` durumuna sabitleniyor.
   - 2–3 saniyelik patlama sunumu boyunca kırmızı CAN artığı görünmüyor.
5. `[x]` Takım alt sekmelerinin dikey büyümesini durdur
   - Takım merkezi yalnız içerik ve sabit alt sekme satırından oluşan iki satırlı ızgaraya geçirildi; beş sekme 38 piksel yükseklikte sabitlendi.
6. `[x]` Profil altına Arkadaşlar alanı ve oyuncu profiline arkadaş eylemi ekle
   - Oyuncu arama, istek gönderme, kabul/ret, 100 arkadaş sınırı ve iki yönlü kalıcılık sunucu sözleşmesine bağlandı.
   - Herkese açık gerçek oyuncu profilinde ilişki durumuna göre `Arkadaş`, `İstek Gönderildi` veya `İsteği Kabul Et` eylemi gösteriliyor; AI profilleri sosyal istek almıyor.
7. `[x]` Arkadaş ve takım antrenman savaşlarını kupa hesabından ayır
   - Arkadaşlar sayfasından kupasız savaş daveti gönderme/kabul etme ve hazırlanmış savaş alanına iki tarafın yeniden girebilmesi eklendi.
   - Takım Savaş sekmesindeki antrenman daveti kabul edildiğinde de aynı ödülsüz özel PvP oturumu kuruluyor; kupa, deneyim, kredi ve sandık verilmez.
8. `[x]` Takım turnuvasına sistem saatli canlı eşleşme alanı kur
   - Takım liderinin aylık kaydı sonrası sistem cumartesi `18.00 UTC / 21.00 Türkiye` için yakın kupalı üye eşleşmeleri ve tekil savaş oturumları üretir.
   - Giriş penceresi maçtan 15 dakika önce açılır ve 30 dakika sonra kapanır; fikstürde oyuncunun rakibi, yerel saat ve canlı giriş düğmesi gösterilir.
   - İlk üç takım ödülünde üye uygunluğu en az `5` katkı puanına bağlıdır; takım avatarı ve takım çerçevesi ödül tanımlarına eklendi.
9. `[x]` Genel liderlik ilk beş kasa kararını görünür veri sözleşmesine geçir
   - İlk beş sıra için birbirinden farklı kasa adı/görsel kimliği, kredi, Akı, evrensel modül parçası ve kozmetik paketleri tanımlandı.
   - Lider panosunda kasa adı ile yapboz parçası simgeli evrensel parça önizlemesi gösteriliyor.

Doğrulama: Beta.59/Beta.58 seçili sunucu paketi `16/16`; istemci paketi `41/41` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaşlık kalıcılığı, kupasız savaş oturumu, normal AI savaşının dereceli kalması, haftalık kayıt filtresi, canlı takım fikstürü, zengin ödül sözleşmesi ve ilgili istemci yüzeyleri regresyon testleriyle kapsandı.

### Belge incelemesinden kalan altyapı kuyruğu

- `[x]` E-posta/telefon doğrulaması, hesap kurtarma, çoklu cihaz ve GDPR silme/veri dışa aktarma ürün akışları kuruldu; Google/Apple OAuth sağlayıcı etkinleştirmesi dağıtım kimlik bilgilerini bekliyor.
- `[x]` Davet linki/kod/QR içeriği, deep-link tüketimi, doğrudan mesaj, engelleme/şikâyet ve paylaşım tamamlandı; gerçek push teslimi FCM/APNs sağlayıcı anahtarlarını bekliyor.
- `[x]` Kazanılan savaş emojileri sunucu doğrulamalı WebSocket sosyal ifade paketiyle rakip istemciye iletiliyor.

## Önceki aktif paket — Beta.58 takım Profil sekmesi ve günlük meta çarkı

1. `[x]` Takım ekranını Profil sekmesiyle aç
   - Daha önce kaldırılan `Genel` konumu `Profil` adıyla geri getirildi ve Takım ekranının varsayılan ilk alt sekmesi yapıldı.
   - Herkese açık takım profilindeki takım kimliği; toplam/ortalama kupa, toplam maç, galibiyet oranı, turnuva sırası ve turnuva puanı aynı sunucu özetiyle bu sekmeye taşındı.
   - `Profil`, `Üyeler`, `İstek`, `Sohbet`, `Savaş` sıralı beş alt sekmeli düzen kuruldu.
2. `[x]` Sezonluk metayı oyuncu bazlı günlük metaya dönüştür
   - Hasar, Savunma, Destek, Sabotaj, Sistem, Çekirdek ve Akım Desteği olmak üzere yedi eşit olasılıklı meta tanımlandı.
   - Her oyuncunun seçimi UTC günü boyunca sunucuda saklanıyor; aynı gün yenileme veya yinelenen istek sonucu değiştirmiyor.
   - Günün ilk başarılı girişinde kapatılamayan çark ekranı açılıyor; `METAYI BELİRLE` sonucunda seçilen meta gösteriliyor ve ertesi güne kadar sabitleniyor.
   - Çark animasyonu artık sunucunun seçtiği dilimde duruyor; görsel sonuç ile kaydedilen günlük meta birbiriyle eşleşiyor.
   - Seçilen meta ilgili modül sınıfının savaş değerlerine uygulanıyor; etkileşimsiz AI oyuncular için gün ve oyuncu kimliğine bağlı kararlı günlük meta üretiliyor.
   - Eşleştirme AI'ları geçici maç slotu yerine kanonik bot kimliğiyle, yerel AI ise kanonik arşetip kimliğiyle tohumlanıyor; aynı UTC gününde yeni maç açmak metayı değiştirmiyor.
   - Etkinlik merkezindeki sezon metası kartı `Bugünün Metası` kartına dönüştürüldü.

Doğrulama: İstemci paketi `40/40` test (`176` Relay istemci kontrolü dâhil), Beta.58 takım/meta ve ilişkili oyun paketi `67/67` geçti. Yedi eşit seçenek, UTC yenilenmesi, aynı gün değişmezliği ve kalıcılık, yedi metanın gerçek savaş eksenlerine etkisi, sistem/akım metasının gerçek enerji üretimi, takım Profil özeti ile herkese açık takım özeti eşitliği ve istemci açılış/çark sözleşmeleri otomatik regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.57 takım profilleri ve etkinlik alt sayfaları

1. `[x]` Takımları herkese açık profil olarak görüntülenebilir yap
   - Oyuncunun kendi profilindeki takım adı, Takım Merkezi başlığı, takım lider panosu ve takım turnuvası sıralamasındaki takım adları takım profiline bağlandı.
   - Gerçek oyuncu takımları ile altı AI takımı aynı profil sözleşmesini kullanıyor; toplam/ortalama kupa, takım maçları, galibiyet oranı, aylık turnuva sırası ve puanı gösteriliyor.
   - Takım üyeleri kupa sırasıyla listeleniyor; üye adına tıklanınca yalnız herkese açık oyuncu profili açılıyor.
2. `[x]` AI profil galibiyet oranını tek veri sözleşmesine geçir
   - AI profillerinin yüzde değerini oran gibi yeniden yüzdeye çeviren çift dönüşüm kaldırıldı; sunucu gerçek oyuncularla aynı `0..1` oranını gönderiyor.
   - İstemci eski veya bozuk veri gelse bile galibiyet oranını `%0..%100` aralığında sınırlıyor; `%6600` benzeri gösterimler artık üretilemiyor.
3. `[x]` Etkinlik merkezini ayrı etkinlik sayfalarına böl
   - Ana Etkinlik ekranı aktif etkinlik adlarını listeliyor; isme/karta tıklanınca haftalık bireysel turnuva veya aylık takım turnuvasının ayrı ekranı açılıyor.
   - Haftalık etkinlikte `Genel`, `Sıralama`, `Ödüller`; takım etkinliğinde `Genel`, `Sıralama`, `Eşleşmeler`, `Ödüller` alt sekmeleri bulunuyor.
   - Takım sıralaması ve fikstürdeki takım adları da doğrudan takım profiline bağlandı.

Doğrulama: Kullanıcının önceki açık tercihi doğrultusunda çalıştırmalı test veya tarayıcı denemesi yapılmadı; yalnız kod, rota, görünüm ve veri sözleşmesi incelemesi uygulandı.

## Önceki aktif paket — Beta.56 takım, etkinlik ve sezon rekabeti

1. `[x]` Takım ekranını doğrudan Üyeler görünümünde aç
   - `Genel` sekmesi ve tekrar eden özet paneli kaldırıldı; Takım ekranına her girişte `Üyeler` sekmesi seçiliyor.
   - İstek, Sohbet ve ödülsüz antrenman savaşı işlevleri korunarak alt sekme düzeni dört sütuna indirildi.
2. `[x]` Oyuncu adlarının ilk harf ucunun/gölgesinin kırpılmasını oyun genelinde çöz
   - Oyuncu adı bağlantıları ve profil/savaş/takım/liderlik kimlikleri taşma kutusu içinde güvenli yatay pay kullanıyor.
   - Uzun adlarda üç nokta davranışı korunurken Orbitron benzeri gliflerin sol ucu artık kesilmiyor.
3. `[x]` Profil çekirdek alışkanlığı başlığını sadeleştir
   - Kendi profilinde ve açık oyuncu profilinde çekirdek adının üzerindeki `AKTİF ÇEKİRDEK` metni kaldırıldı; çekirdek adı ve seviyesi kaldı.
4. `[x]` Mağaza özel tekliflerini haftalık döngüye geçir
   - Teklifler artık pazartesi UTC 00:00'da yenileniyor; mevcut teklif kimlikleri ve eski makbuzlar geriye dönük uyumluluk için korunuyor.
   - Arayüz `Haftalık Özel Teklifler` başlığını ve bir sonraki pazartesi sıfırlamasını gösteriyor.
5. `[x]` Her takvim sezonuna ayrı stratejik meta tanımla
   - On iki aylık döngü için ayrı meta adı, açıklama, öne çıkan oyun planı ve üç özellikli modül tanımlandı.
   - Etkinlik merkezi aktif sezon metasını ve öne çıkan modülleri gösteriyor.
6. `[x]` Haftalık bireysel turnuva ve ilk üç ödülünü kur
   - Galibiyet `3`, çekirdek yıkımı `+1` puan sözleşmesiyle pazartesi yenilenen sıralama eklendi.
   - İlk üç için Elmas/Altın/Gümüş sandık ile Devre Kredisi ve Akı ödül paketleri tanımlandı; gerçek oyuncuların haftalık savaş sayaçları sunucu profilinde tutuluyor.
7. `[x]` Aylık takımlar arası turnuvayı kur
   - Takımlar round-robin programla her hafta farklı rakiple eşleşiyor; üyeler en yakın kupa değerine göre eşleniyor ve kişi başı rövanşlı iki maç yapıyor.
   - Galibiyet `1`, mağlubiyet `0` takım katkı puanı; ilk üç takım ödülü için üye başına en az `5` katkı puanı şartı uygulanıyor.
   - Takım üyesinin haftadaki ilk iki uygun arena eşleşmesi otomatik olarak programdaki rakip AI takımın en yakın kupalı üyesine yönlendiriliyor ve takım turnuvası olarak kaydediliyor.
8. `[x]` Liderlik ve turnuva için 240 kişilik AI nüfusu oluştur
   - Önceki 120 AI oyuncunun `Nova`, `Volt` ve `Arc` takıları gerçek ad biçimine dönüştürüldü.
   - Arenaların tamamına dağıtılmış, farklı deste/arşetip kararları kullanan 120 yeni benzersiz AI oyuncu eklendi.
   - Yeni oyuncular 20'şer üyeli altı takıma dağıtıldı; AI oyuncular ve takımlar genel liderlik ile etkinlik sıralamalarına katılıyor ve AI açık profilleri görüntülenebiliyor.

Doğrulama: Kullanıcının açık isteği doğrultusunda bu paket için tarayıcı denetimi veya çalıştırmalı test yapılmadı; yalnız kod ve sözleşme incelemesi uygulandı.

## Önceki aktif paket — Beta.55 profil, koleksiyon ve savaş tutarlılığı

1. `[x]` Seçili avatar çerçevesini üst profil çubuğunda görünür kıl
   - Üst bardaki genel avatar gölgesinin seçili `neon_cyan` ve `season_gold` çerçevelerini ezmesi engellendi; halka ve parıltı üst barda da korunuyor.
2. `[x]` Lider tablosundaki ad kırpılmasını düzelt; ilk üç sırada altın, gümüş ve bronz madalya göster
   - İsim bağlantısına güvenli iç boşluk verildi; ilk üç sıra erişilebilir sıra etiketiyle `🥇`, `🥈`, `🥉` madalyalarını gösteriyor.
3. `[x]` Çekirdek hızlı işlem kartını seçilen karta ortala; detay görselini nadirlik yazısından aşağı taşı
   - Hızlı işlem kutusunun kart genişliğine ulaşmasını engelleyen üst sınır kaldırıldı; detay görseli 14 piksel aşağı alındı.
4. `[x]` Sezon yolu deneyim şartını bir kademe büyüt ve kartın alt kenarına yaklaştır
   - Şart metni `.38rem` yerine `.44rem` ve daha alçak alt hizayla çiziliyor.
5. `[x]` Savaş modüllerindeki eski üst CAN çubuğunu kaldır; maç sonundaki anlık Akım sıçramasını engelle
   - Savaş kartlarında eski CAN çubuğu DOM'u artık üretilmiyor; yalnız alt kenardaki tek CAN katmanı kullanılıyor.
   - Çevrimdışı savaş Akımı sunucuyla aynı `6/12`, `2,5 sn +1` sözleşmesine geçti; eski `saniye × 10` hesabı kaldırıldı.
6. `[x]` Kalkan Akım maliyetini `2` yap ve bütün modül Akım maliyetlerini fayda/güç ölçeğine göre yeniden dengele
   - Yaygın kartlar `2`, nadir kartlar faydasına göre `2–4`, epikler `4`, efsaneviler `5` Akım bandında; Kalkan `2` oldu.
7. `[x]` Nadirlik artışının CAN, hasar, onarım, modül desteği ve devre katkısına savaş motorunda eksiksiz yansımasını doğrula ve tamamla
   - CAN, saldırı, bekleme süresi ve enerji verimine ek olarak onarım/destek, batarya-depolama, soğutma, savunma ve sabotaj dirençleri de nadirlik etki çarpanını kullanıyor.
8. `[x]` Sabotaj veya enerji kesintisi altındaki modülü hedef çekme dâhil bütün faaliyetlerden çıkar
   - Tek bir operasyonel-modül kuralı saldırı, hedefleme, savunma, destek, sabotaj ve enerji üretim/dağıtımına uygulandı; etki temizlenince faaliyet geri geliyor.

Doğrulama: `39/39` istemci paketi (`176` Relay istemci testi dâhil) ve seçili sunucu oyun/denge paketi `114/114` geçti.

## Son değerlendirme — Sandık.docx oranları

1. `[x]` Belge önerisini canlı sandık sözleşmesiyle karşılaştır
   - Savaşta sandık gelme dağılımı iki düzende de aynıdır: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Garanti Devre Kredisi ve Akı aralıkları da aynıdır; fark yalnız modül parçası olasılıklarındadır.
   - Belge önerisinin ağırlıklı sandık başına modül parçası beklentisi yaklaşık `0,576`, mevcut düzeninki yaklaşık `0,712` parçadır.
2. `[x]` Mevcut oranları koru
   - Belge Bronz/Gümüş modül düşüşünü `%30`, Altın düşüşünü `%35`, Elmas düşüşünü `%38` seviyesine indiriyor; mevcut değerler sırasıyla `%35`, `%35`, `%50`, `%53`.
   - Daha düşük belge oranları, yüksek seviye yükseltmelerdeki `74–200` parça gereksinimi ve parçaların uygun modüller arasında dağılması nedeniyle ilerlemeyi gereksiz yere yavaşlatıyor.
   - Belgenin Elmas sandık satırında Çekirdek Parçası yüzdesi boş bırakılmıştır; mevcut yalnız-Elmas `%6` bağımsız çekirdek parçası ihtimali korunmuştur.
   - Sonuç olarak `server/app/meta_progression.py` sandık değerlerinde değişiklik yapılmadı.

## Tamamlanan düzeltme — Savaş CAN görünürlüğü ve maç sonu yerleşimi

1. `[x]` Devre üzerindeki CAN çubuğunu bağımsız görünür katmana taşı
   - Oyuncu ve rakip tarafındaki yerleşik kartlar artık `battle-module-card` olarak işaretleniyor.
   - Alt kenardaki CAN katmanı eski genel çubuk yerleşiminden bağımsız çiziliyor; doluluk gerçek CAN yüzdesini, renk ise yeşil/sarı/kırmızı eşiklerini izliyor.
2. `[x]` Mağlubiyet ödüllerini sadeleştir
   - Ödül kartlarında kaynak adı zaten bulunduğu için değerlerden `Kupa`, `DK` ve `Deneyim` tekrarları kaldırıldı.
   - Kupa kartındaki taç simgesi gerçek kupa simgesiyle değiştirildi.
3. `[x]` Hasar istatistiği ile Devam düğmesini ayır
   - Maç sonu istatistik alanı ile `DEVAM` düğmesi arasına görünür boşluk eklendi; düğme artık kartın alt çizgisine binmiyor.

## Tamamlanan düzeltme — Savaş alanı modül CAN çubukları

1. `[x]` Yerleşik modüllerin CAN çubuğunu alt kenara geri getir
   - Oyuncu ve rakip tarafındaki her yerleşik modülün CAN çubuğu kartın tam alt kenarına taşındı.
   - Çubuk `%67–100` aralığında yeşil, `%34–66` aralığında sarı ve `%1–33` aralığında kırmızı gösteriliyor; doluluk gerçek CAN oranını izliyor.
   - Sağlık çubuğunun yerini alabilmesi için modül kartının alt kenar çizgisi kaldırıldı.
2. `[x]` Yerleşik hücrenin altındaki dikey kablo parçasını kaldır
   - Hücreler arasındaki kablo ağı ve akım animasyonu korunurken, yalnız modül yerleştirilmiş hücrenin altından çıkan kısa dikey bağlantı çizilmiyor.

## Tamamlanan düzeltme — Sezon kozmetik görünürlüğü ve kredi metni

1. `[x]` Kozmetik ödül önizlemesinin gizlenmesini engelle
   - Ödül adlarını gizleyen seçici avatar ve avatar çerçevesi önizlemelerini artık kapsamıyor; kozmetik görseli `×1` miktarının yanında görünür kalıyor.
2. `[x]` Görsel Devre Kredisi ödüllerinden `DK` tekrarını kaldır
   - Devre Kredisi simgesi bulunan ödül satırları yalnız `+miktar` gösteriyor; para birimi artık simgeyle ifade ediliyor.

## Tamamlanan düzeltme — Sezon yolu kozmetik önizlemeleri

1. `[x]` Avatar ve avatar çerçevesi ödüllerini gerçek görselleriyle göster
   - `Avatar` ve `Avatar Çerçevesi` metinleri kaldırıldı; ilgili kademede kazanılacak kozmetiğin gerçek profil önizlemesi ve `×1` miktarı gösteriliyor.
   - Avatar çerçevesi, standart avatar üzerinde kendi neon veya sezon çerçevesiyle sunuluyor.
2. `[x]` Kademe deneyim şartını eylem alanına taşı
   - `... Deneyim ile açılır` bilgisi kartın sol altından kaldırıldı.
   - Deneyim şartı sağ tarafta `Kilitli`, `Al` veya `Alındı` eyleminin hemen altında gösteriliyor.

## Tamamlanan düzeltme — Sezon yolu ödül ızgarası

1. `[x]` Kademe ödüllerini görsel ve iki sütunlu düzene geçir
   - Kademe numarası solda, ödüller sağda iki sütunlu simge + miktar ızgarasında gösteriliyor.
   - Sandık aynı ızgaraya `×1` miktarıyla katıldı; Akı, Devre Kredisi ve parça ödülleriyle aynı görsel ağırlığa getirildi.
   - `Modül Parçası ve Akı` gibi toplu metin başlıkları kaldırıldı; ödül adları erişilebilir etiket ve bilgi balonu olarak korunuyor.
   - Modül kartı parçası simgesi, modül kimliğini koruyan puzzle parçası görünümüne dönüştürüldü.

## Tamamlanan düzeltme — Sezon yolu sandık ölçüsü

1. `[x]` Sandık ödülünü diğer sezon ödülleriyle aynı görsel ölçüye getir
   - Sezon sandığına ayrılan tam genişlikte vitrin kutusu kaldırıldı.
   - Sandık simgesi diğer ödül simgeleriyle uyumlu kompakt ölçüye indirildi.
   - Büyük ödül kademesinin altın çerçevesi ile sandık nadirlik rengi korundu.

## Tamamlanan düzeltme — Çekirdek ölümüne bağlı maç sonu

1. `[x]` Süre/hasar hakemliğini kaldır
   - `03:00` sonunda çalışan `time_limit_tiebreak` ve `time_limit_draw` üretimi kaldırıldı.
   - Maç artık yalnız bir Çekirdek yok edildiğinde veya oyuncu savaştan çekildiğinde galibiyet/mağlubiyet üretir; iki Çekirdek aynı adımda yok edilirse berabere biter.
2. `[x]` Sonsuz savunma çıkmazını Devre Gerilimi ile çöz
   - `03:00` Devre Gerilimi başlangıcıdır: saldırı hasarı artar, onarım verimi düşer ve bu fark her 30 saniyede büyür.
   - Beta.69 kararıyla süreye bağlı doğrudan Çekirdek hedefleme ve otomatik Çekirdek hasarı kaldırıldı; gerilim yalnız yaşayan modül hattının çözülmesini hızlandırır.
3. `[x]` Çoklu Onarım Modülü yığılmasını sınırla
   - Bir Onarım Modülü artık her aktivasyonda bütün hasarlı modülleri değil yalnız en düşük CAN oranındaki tek modülü iyileştirir.
   - Aynı destek adımında aynı hedef yalnız bir kez onarılabilir; çok sayıda Onarım Modülü odak hasarı üst üste silmez.
   - İstemci Aşırı Yük, Çekirdek açılması ve Çekirdek kararsızlığı aşamalarını canlı savaş bildirimiyle gösterir; savaş saati Aşırı Yükte renk değiştirir.

## Tamamlanan düzeltme — Açık profil Bearer oturumu

1. `[x]` Açık profil isteğine görüntüleyen oyuncunun Bearer belirtecini ekle
   - Kök neden, sunucudaki `/public-profiles/{player_id}` rotasının oturum doğrulaması istemesine rağmen istemci oturum katmanının `/public-profiles/` önekini korumalı API rotası olarak tanımamasıydı.
   - `/public-profiles/` istemcinin korumalı rota listesine eklendi; istekler artık mevcut oyuncunun kayıtlı oturumuyla imzalanıyor ve özel API adresi yapılandırılmışsa doğru sunucu köküne yönlendiriliyor.
   - URL içindeki oyuncu kimliği hedef profildir; oturum açan oyuncu olarak yorumlanmaz. Böylece görüntüleyen oyuncunun mevcut kimliği korunur ve başka kayıtlı oyuncuların salt okunur profili açılabilir.
2. `[x]` Açık profil sınırlarını koru
   - Sunucudaki endpoint anonim erişime açılmadı; kimliği doğrulanmış oyuncu oturumu gerektirmeye devam ediyor.
   - Başka oyuncu görünümünde yalnız Profil ana sayfasındaki deste alışkanlığı, takım, sezon ve istatistikler gösterilir; Avatar, Ödüller ve Ayarlar sekmeleri üretilmez.
3. `[x]` Açık profil üst bilgisini sadeleştir
   - Başlığın altındaki `Yalnız profil sayfası görüntülenir.` açıklaması kaldırıldı.
   - Yükleme tamamlandıktan sonra gösterilen `Salt okunur profil · Avatar, Ödüller ve Ayarlar gizlidir.` ayrıntısı kaldırıldı; boş durum satırı artık yer kaplamıyor, gerçek yükleme ve hata mesajları gösterilmeye devam ediyor.

## Tamamlanan paket — Sandık ekonomisi ve toplu açılış

1. `[x]` Sandık ödül sözleşmesini yeniden dengele
   - Savaş zaferi sandık dağılımı toplam `%100` olacak şekilde korundu: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Devre Kredisi ve Akı bütün sandıklarda garanti ödül olarak kalır; modül ve çekirdek parçaları bunlardan bağımsız olasılıklardır.
   - Bronz: `45–75 DK`, `2–4 Akı`; `%35 Yaygın`, `1–2` parça.
   - Gümüş: `90–145 DK`, `3–6 Akı`; `%25 Yaygın (2–3)` veya `%10 Nadir (1–2)` parça.
   - Altın: `175–280 DK`, `5–9 Akı`; `%30 Yaygın (3–4)`, `%15 Nadir (2–3)` veya `%5 Epik (1–2)` parça.
   - Elmas: `320–480 DK`, `10–15 Akı`; `%25 Yaygın (4–5)`, `%15 Nadir (3–4)`, `%10 Epik (2–3)` veya `%3 Efsanevi (1)` parça. Bunlardan bağımsız `%6` çekirdek parçası şansı vardır.
   - Nadirlik yüzdeleri API içinde mutlak olasılık olarak ayrıca yayımlanıyor; açma işleminin kullandığı koşullu nadirlik dağılımı bu mutlak tablodan normalize edildi.
2. `[x]` Günlük özel teklif sandıklarını aynı kurala bağla
   - Bronz, Gümüş ve Altın günlük teklifler artık ayrı ve zamanla sapabilecek bir ödül tablosu taşımıyor.
   - Her teklif kendi sandık tanımından kredi, Akı, modül parçası miktarı ve nadirlik olasılığını doğrudan türetiyor.
   - Satın alma bedelleri korunmuştur: `120 / 400 / 900 DK`.
3. `[x]` Sandık biriktirme ve toplu açılışı ölçekle
   - Dört yuva sınırı savaş ve hediye sandığı kazanımından kaldırıldı; oyuncu onlarca veya yüzlerce sandık biriktirebilir.
   - `Hepsini Aç` işlemi sunucuda her sandığı idempotent makbuzla işler ve ayrıca tek bir `reward_totals` özeti üretir.
   - Toplu sonuç ekranı sandıkları tek tek uzayan listede göstermek yerine toplam DK, Akı ve modül/çekirdek türü başına birleştirilmiş parçaları tek görünümde gösterir.
4. `[x]` Hediye sandığına eylem önceliği ver
   - Aynı türden birikmiş sandıklar olsa bile `HEDİYE SANDIK AÇ` eylemi kartta ilk sırada kalır.
   - Hediye bekleme süresindeyse sayaçlı ve devre dışıdır; altında açılabilir envanter için `HEPSİNİ AÇ` ayrı eylem olarak görünür.

## Önceki tamamlanan paket — Herkese açık profil ve koleksiyon ekonomisi

1. `[x]` Diğer oyuncular için salt okunur profil
   - Lider panosu, takım üye listesi, modül istekleri, takım sohbeti, antrenman davetleri, canlı savaş rakip adı ve maç sonucu adları profil bağlantısına dönüştürüldü.
   - `/public-profiles/{player_id}` yalnız Profil ilk sayfasına gereken kimlik, seçili kozmetik, deste/çekirdek, takım, sezon ve savaş istatistiği alanlarını döndürüyor.
   - Başka oyuncu görünümünde Avatar, Ödüller ve Ayarlar sekmeleri üretilmiyor; özel hesap ilerlemesi ve ayarlar API yanıtına dahil edilmiyor.
   - Herkese açık profil çağrısı oturum doğrulaması gerektiriyor fakat oturum sahibinin başka bir kayıtlı oyuncuyu okumasına izin veriyor.
2. `[x]` Yeni hesaplarda tüm modül parçalarını sıfırla
   - Yeni Arena 1 profili açık ve kilitli bütün modüller için `0` kart parçası ile başlıyor.
   - Eski kayıtlardaki kazanılmış miktarlar korunuyor; eski kayıtta hiç bulunmayan modül anahtarları `0` ile tamamlanıyor.
   - Arena erişimi kartı koleksiyonda açmaya devam ediyor; seviye yükseltmek için parçanın oyun/ödül yollarından kazanılması gerekiyor.
3. `[x]` Modül yeteneklerini Akı ile sıfırla
   - Seçilmiş her yetenek için `25 Akı` sıfırlama bedeli tanımlandı.
   - Modül Yetenekler sekmesi seçili yetenek sayısını, toplam bedeli ve `YETENEKLERİ SIFIRLA` eylemini gösteriyor.
   - Sunucu işlemi idempotent makbuzla Akıyı düşürüyor ve o modülün bütün dal seçimlerini temizliyor.
4. `[x]` Devre Yolu kupa metnini mutlak eşiğe çevir
   - Görsel metin artık arena içi farkı değil `mevcut toplam kupa / sonraki aşamanın toplam kupa eşiği` biçimini kullanıyor.
   - Örnek: Arena 2 içinde 375 kupalı oyuncu `375 / 600 Kupa` görür.
5. `[x]` Çekirdekleri nadirlik gruplarına ayır
   - Rezonans: Yaygın.
   - Muhafız ve Aşırı Yük: Nadir.
   - Kesinti ve Kapasitör: Epik.
   - Anka ve Kuantum: Efsanevi.
   - Kartlar > Çekirdek sayfası bu dört nadirlik başlığı altında ayrı koleksiyon grupları gösteriyor; detay ekranına da nadirlik etiketi eklendi.

## Önceki paketten korunan tamamlanmış işler

- Sezon yolundaki sandık ödülleri metin yerine gerçek sandık görseliyle gösteriliyor.
- Enerji açığı bağlı modüllere oransal dağıtılıyor; sıranın sonundaki saldırı modülü keyfi biçimde enerjisiz kalmıyor. Yalnız EMP/Sinyal Bozucu gibi açık devre dışı bırakma etkileri modülü kapatabiliyor.

## Doğrulama

- Kullanıcı test ve denemeleri kendisinin yapacağını belirtti; bu pakette otomatik test, sözdizimi kontrol komutu veya tarayıcı denetimi çalıştırılmadı.
- Açık profil 401 düzeltmesi de istek akışı ve kod farkı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı test yapılmadı.
- Çekirdek ölümüne bağlı maç sonu ve Aşırı Yük paketi kod akışı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı savaş/test yapılmadı.
- `Sandık.docx` içindeki tek sayfalık önerinin metin ve tablo içeriği okundu. Paketlenmiş çalışma ortamında LibreOffice bulunmadığı için kaynak DOCX PNG olarak render edilemedi; belge içeriği `python-docx` ve OOXML sayfa bilgisi üzerinden incelendi.
- Değişiklikler kod farkları ve hedef dosya kesitleri üzerinden gözden geçirildi.

## Devam notu

- Çalışma dizini: `D:\Projects\GRIDSHARD`
- Kullanıcı çalışma zamanı verileri korunmalıdır; `server/data/web_test_*.json` ve `.bak` dosyaları geri alınmamalı veya düzenlenmemelidir.
- Beta.68 değişiklikleri: `.env.example`, `.gitignore`, `.github/workflows/quality.yml`, `client/src/app.js`, `client/src/auth-session.js`, `client/src/i18n.js`, `client/src/styles.css`, `docker-compose.yml`, `docs/GELISTIRME_ORTAMI.md`, `docs/MOBILE_RELEASE_RUNBOOK.md`, `server/app/auth.py`, `server/app/main.py`, `server/app/platform_services.py`, `server/app/postgres_repository.py`, `server/app/schema_migrations.py`, `server/migrations/*`, `server/requirements*.txt`, `tools/schema_migrate.py` ve bu checkpoint.
- Git durumunda `server/data/web_test_*.json(.bak)` dosyalarının `D` görünmesi kasıtlı indeks kaldırmadır; dosyalar diskte bulunur ve ignore edilir. `server/data/platform_state.json` kullanıcı/çalışma zamanı değişikliği olarak korunmuş, bu pakette düzenlenmemiştir.
- Önceki ürün paketinde değişen dosyalar: `client/index.html`, `client/src/app.js`, `client/src/auth-session.js`, `client/src/canon.css`, `client/src/styles.css`, `server/app/balance_simulation.py`, `server/app/game/catalog.py`, `server/app/game/catalog_view.py`, `server/app/game/combat.py`, `server/app/game/engine.py`, `server/app/game/energy.py`, `server/app/game/pvp_session.py`, `server/app/main.py`, `server/app/meta_progression.py`, `server/app/player_data_store.py`, `server/app/player_profile.py`, `server/app/web_test.py`, `docs/GRIDSHARD_2_1_KANONIK_TASARIM.md` ve bu checkpoint.
- Önceki paketten çalışma ağacında kalan dosya: `server/app/game/energy.py`.
