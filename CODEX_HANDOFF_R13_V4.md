# Codex için devir notu — sunucu r13 ve Android paketi (sürüm kodu 4)

**Yazan:** Claude, 7 Ekim 2026, iş bilgisayarı. **Neden:** Claude'un haftalık kullanım hakkı dolmak üzere; kullanıcı yayın işini Codex ile sürdürecek. Bu dosya o iş için tek başına yeterli olacak şekilde yazıldı; ayrıntı gerekirse `CLAUDE_CHECKPOINT.md` (özellikle "6 Ekim akşamı (ev bilgisayarı): kalite denetimi yeşil, sunucu r12 canlıda" bölümü) ve `docs/SERVER_PRODUCTION_RUNBOOK.md`, `docs/MOBILE_RELEASE_RUNBOOK.md`.

**İstenen iş:** (1) canlı sunucuyu r12'den r13'e güncellemek, (2) yeni imzalı APK/AAB üretmek. Kullanıcı sohbette "v3 apk ve aab" dedi; sürüm kodu 3 Play'in dahili test kanalına yüklendiği için yeni paket **sürüm kodu 4** olmalıdır (Play aynı kodu ikinci kez kabul etmez). Kullanıcıya bunu teyit ettir.

## 1. Nerede yapılır

**Ev bilgisayarında.** İş bilgisayarında Android imza anahtarı yok, Docker motoru kapalı ve aşağıdaki r12 betikleri yok. Evde olması gerekenler (içerikleri ekrana ya da dosyaya yazdırılmaz):

- `secrets\android-release\gridshard-upload.p12` ve `credential.dpapi.xml` (paket imzası; DPAPI kaydı o Windows hesabına bağlıdır).
- `artifacts/server-aws-20261006-child-safety-r12-candidate/` — r12'de kullanılan betikler (kaynak paketi hazırlama, yalıtılmış doğrulama, `deploy.sh`) ve `server-receipts/` altında makbuzlar ile üç adımın günlükleri. Git'te izlenmez. **r13 bu betiklerin uyarlamasıyla yapılır; önce okuyun.** (Bu notu yazan oturum o betikleri iş bilgisayarından göremedi; aşağıdaki adımlar Claude'un ev oturumunun kaydına dayanır.)
- `artifacts/play-review-access/ssh/known_hosts` — sunucunun sabitlenmiş açık anahtar kaydı; `artifacts/play-review-access/server-receipts/` — r11 kayıtları.
- Docker (r12'de 29.6.2 ile çalışıldı).

## 2. Başlangıç durumu (7 Ekim'de doğrulandı)

- Depo: `main` = `origin/main` = `f8b24fe`, çalışma ağacı temizdi. GitHub kalite denetimi bu commit için **yeşil** (PostgreSQL 17, gerçek Redis, imaj derlemesi ve imaj duman testi dahil). Bu dosya ve `CLAUDE_CHECKPOINT.md` sonradan eklendi; kullanıcı commit + push edecek. Başlamadan önce `git pull`, `git status --short`, ve son commit için denetim sonucu: `https://api.github.com/repos/ozturkalihan2026/GRIDSHARD/actions/runs` (depo herkese açık; oturum gerekmez).
- Canlı sunucu: **r12**, imaj `gridshard-production-relay-web:child-safety-r12-20261006`, sürüm klasörü `/opt/gridshard/releases/aws-20261006-child-safety-r12`. Compose katmanı **dört** tanedir: production + cloudflare + play-games + play-review. Kullanıcı adı `ubuntu`.
- Play: dahili testte **v3** (sürüm kodu 3, sürüm adı `2.1.0-beta.72`). `config/android-production.json` ve `android/app/build.gradle` içinde sürüm kodu şu an 3.
- r12 kaynağından (`60d0cbb` içeriği) bugüne sunucu farkı: yalnız `server/app` altında dört dosya (`main.py`, `player_settings.py`, `player_data_store.py`, `meta_progression.py`). `server/migrations`, Compose dosyaları, `Dockerfile` ve bağımlılık dosyalarında `git diff 60d0cbb HEAD` boş. Yine de r12'deki gibi iki kaynak paketi karşılaştırılarak doğrulanmalı.

## 3. Bu sürümle gelenler

Sunucu (r13):

- **Analitik yaş sorusu:** analitik izni kapalı gelir; açmak isteyene doğum yılı sorulur, kararı sunucu verir (eşik 18), doğum yılı saklanmaz. Sonuç oyuncunun ayar belgesine yazılır; tablo/şema değişmez.
- **Mağaza sandıkları:** günlük alım sınırı (Bronz 5, Gümüş 3, Altın 2, Elmas 1; UTC gün dönümünde yenilenir; `STORE_CHEST_DAILY_LIMITS`) ve yeni fiyatlar (Bronz 1000, Gümüş 2000 Devre Kredisi; Altın 500, Elmas 1000 Akı; `STORE_CHEST_PRICES`). Sayım mevcut mağaza makbuzlarından yapılır; kayıt biçimi değişmez. Hediye Bronz Sandık (8 saatte bir) sınıra girmez.
- İmajın içindeki web arayüzü de yenilenir (aşağıdaki istemci değişiklikleri).

**Slogan (7 Ekim, kullanıcı kararı; bu not yazıldıktan sonra eklendi):** "Devreni kur. Stratejini konuştur." / "Build your circuit. Make your strategy count." Açılış ekranı, sayfa başlığı, web bildirimi ve `/identity` uç noktası değişti; eski slogan ("…Çekirdeği Kır.") hiçbir yerde kalmamalı. Kaynak paketini bu değişikliği içeren commit'ten üretin ve denetim yeşil olmadan başlamayın.

İstemci (web arayüzü ve yeni paket): analitik yaş sorusu ekranı; mağazada hediye düğmesi yerine tek açma düğmesi ("HEDİYE SANDIK AÇ" → "SANDIK AÇ"), kartta "Günlük alım hakkı x / y", "ÖDÜL LİSTESİ" sekmesi; Kartlar'da Bilgi / Seç kutusu; takım isteği kutucukları.

**Play'deki v3, r13 ile çalışmaya devam eder:** yeni fiyatları gösterir (fiyat sunucudan gelir); sınırı aşan alımda sunucunun iletisini görür ("Bugünkü alım sınırına ulaştın: …"); analitiği hiç açamaz (sunucu güncelleme ister). Kalan hak satırı, tek düğme ve yaş sorusu yeni pakette görünür.

## 4. Değişmez kurallar (kullanıcı kararları)

1. **Gizli bilgi sohbete ve dosyaya yazılmaz.** Depo herkese açıktır: sunucunun IP adresi ve SSH anahtarının yolu izlenen hiçbir dosyaya yazılmaz; ikisini de kullanıcı sohbette verir.
2. **Canlı geçişten hemen önce kullanıcının açık onayı alınır.** Önceki bir onay yeni geçiş için geçerli değildir.
3. Bağlanmadan önce sunucunun ED25519 anahtarı `CODEX_CHECKPOINT.md` içindeki kayıtlı parmak iziyle ve sabitlenmiş `known_hosts` kaydıyla karşılaştırılır; eşleşmezse bağlanılmaz. Sıkı anahtar denetimiyle bağlanılır.
4. Gerçek reklam ve gerçek ödeme açılmaz; test kipleri kapalı kalır.
5. Oyuncu verisi sıfırlanmaz. Kullanıcının "Uç" hesabına ve inceleme (demo) hesabına dokunulmaz.
6. Telefona USB ile APK kurulmaz (Play imzası farklıdır). AAB'yi kullanıcı Play'e yükler.
7. Commit ve push'u kullanıcı yapar.
8. Play Console'daki beyanlar ve yasal uyum kutusu kullanıcının kararıdır; teknik denetim hukuki uyum belgesi değildir. Denenmemiş bir şey "denendi" diye yazılmaz.
9. `CLAUDE_CHECKPOINT.md` Claude'un devir notudur; Codex sonucu kendi `CODEX_CHECKPOINT.md` dosyasına yazar. Bu dosyanın sonuna kısa bir "sonuç" bölümü eklenmesi Claude'un sonraki oturumuna yeter.

## 5. Sunucu r13 — adımlar (r12 ile aynı yöntem)

1. **Kaynak paketi:** `python tools/release_guard.py`, sonra `python tools/package_release.py`. SHA-256 değerini kaydet. r12 kaynak paketiyle karşılaştır: fark yalnız `server/app` (ve istemci dosyaları) olmalı; Compose, Dockerfile, bağımlılık ve `server/migrations` aynı kalmalı. Fark çıkarsa dur ve kullanıcıya bildir.
2. **Salt okunur denetim:** çalışan Compose projesi, dört katman, imaj etiketi ve özeti, sağlıklı kapsayıcılar, aktif maç/bağlantı sayısı, disk alanı.
3. **Yeni sürüm klasörü:** `/opt/gridshard/releases/` altında r13 için ayrı klasör; özel ortam dosyası çalışan (r12) sürümden kopyalanır, içeriği gösterilmez. İmaj ve bakım imajı yeni etiketle derlenir. Çalışan r12 imajına geri dönüş etiketi verilir (r12'de `before-child-safety-r12-20261006` idi).
4. **Yalıtılmış doğrulama (canlıya bağlanmadan):** ayrı PostgreSQL 17 / Redis 7 ile tam sunucu test paketi (r12'de 1230 geçti, 1 atlandı; bugün yerelde PostgreSQL'siz 1208 geçti) ve `tools/production_container_smoke.py` (inceleme girişi, `--soak-seconds 330`, yeniden başlatma, boş hedefe yedek/geri yükleme). Bu ortamda ayrıca yeni davranışı sına: mağaza görünümünde `daily_limit` / `remaining_today` / `limit_resets_at` alanları ve fiyatlar (1000 / 2000 / 500 / 1000); sınırı aşan alımın 422 ile reddi. Deneme kapsayıcıları ve ağı temizlenir; makbuz yazılır.
5. **Kullanıcının açık onayı.**
6. **Geçiş (`deploy.sh` uyarlaması):** aktif maç ve bağlantı yokken; API ve Caddy durur (r12'de kesinti bir dakikanın altındaydı); taze çevrimdışı yedek `/var/backups/gridshard-production/` altına alınır ve doğrulanır (kurulum kimliği, kayıt sayıları, dosya özeti, izinler, `pg_restore --list`); yeni imaj açılır.
7. **Geçişten sonra:** profil, kimlik ve savaş sonucu sayıları ile profil/kimlik/takım satır özetleri geçişten öncekiyle aynı; inceleme hesabının satırları yerinde; kapsayıcı içinde Play Games sırrı ve inceleme doğrulayıcısı salt okunur bağlı, reklam ve ödül kapalı, test kipleri kapalı, sohbet yalnız hazır mesaj kabul ediyor; dışarıdan HTTPS `/health` sağlıklı, yeni web arayüzü sunuluyor (sayfada `chest-store-limit-note` ve `analytics-age-panel` kimlikli öğeler var), imzasız reklam geri çağrısı 403; 330 saniyelik canlı sağlık denetimi; günlükte kritik işaret yok.
8. **Geri dönüş:** önceki imajı ve ayarı açmaktır; veritabanını eski yedeğe döndürmek değildir. r12 imajı, r12 sürüm klasörü ve yeni yedek saklanır.
9. Makbuzlar sürüm klasörüne ve `artifacts/` altına (izlenmeyen) yazılır.

## 6. Android paketi — sürüm kodu 4

1. `config/android-production.json` içinde `versionCode` 3 → 4. Sürüm adı kullanıcı aksini söylemedikçe `2.1.0-beta.72` kalır (değişirse `server/app/version.py` ve `tools/release_guard.py` içindeki beklenen sürüm de değişir). Derleme betiği `android/app/build.gradle` dosyasını bu ayardan günceller; iki dosya da commit edilir.
2. Kullanıcının "üret" demesiyle: `tools/build-android-production.ps1 -Offline` (v3 böyle üretildi). Çıktı izlenmeyen bir klasöre (ör. `artifacts/android-production-<tarih>-v4/`).
3. Denetim: `tools/audit-android-review-release.ps1 -Directory <klasör> -VersionCode 4`. Beklenenler: imza sertifikası v2 ve v3 ile aynı; APK ve AAB imzaları geçerli; sürüm kodu 4; hata ayıklama kapalı; reklam kimliği izni yok; manifestte Firebase otomatik başlatma ve analitik toplama kapalı; 9 yazı tipi dosyası pakette, Google yazı tipi adresi yok; uzak web adresi ve inceleme sırları pakette yok; paketteki web dosyaları `dist/` ile birebir aynı.
4. Pakette yeni arayüzün bulunduğuna bak: `SANDIK AÇ`, `Günlük alım hakkı`, yaş sorusu ekranı.
5. **Sıra:** önce sunucu r13, sonra paket. Yeni paket yaş sorusu ve sınır alanları için r13'e ihtiyaç duyar; r12'ye karşı çalışır ama bu özellikler görünmez.
6. Açık soru (karar verilmedi, değiştirmeyin): web görünümünde otomatik doldurmanın kapatılması.

## 7. Site paketi (aynı oturumda yapılabilir)

Gizlilik metni (`public-site/content.js`) yaş sorusunu ve kısmi veri silmeyi anlatıyor; canlı sitede eski metin var. `node -e "require('./tools/build-public-site.js').buildPublicSite()"`, `node tools/check-public-site.js`, sonra `build/public-site` içeriği kökte `index.html` olacak şekilde ziplenir. Kullanıcı Cloudflare'de gridshard-public → Create deployment → Production ile yükler; **r13 canlıya geçtikten sonra**.

## 8. Bittiğinde

- Kullanıcıda: AAB'yi Play'e yüklemek (dahili ya da kapalı test), cihazda denemek (mağaza: fiyatlar, günlük hak satırı, beşinci Bronz alımından sonra "SINIR DOLDU", tek açma düğmesinin üç hali; Ayarlar'da analitik yaş sorusu; menü müziği; bildirim), siteyi yüklemek, commit + push.
- Play Console'da sırada **kapalı test** var (kanal "Etkin değil"; görevler: ülke seç, test kullanıcılarını seç, yeni sürüm oluştur, önizle ve onayla, incelemeye gönder). Mağaza girişi metinleri ve görselleri hazır: `docs/PLAY_STORE_LISTING.md` (görseller yalnız iş bilgisayarında, `artifacts/play-store-listing-20261007/`).
- Kayda geçirilecekler: kaynak paketi özeti, imaj etiketi ve özeti, yedek klasörü, geçiş saati, önce/sonra sayıları, paket dosyalarının SHA-256 değerleri, denetim sonucu; ve **denenmeyenler** (gerçek cihaz, canlıda inceleme hesabıyla giriş).

## 9. Bilinen tuzaklar

- İmaj duman testi yedek klasörünü kapsayıcının kendi kullanıcısıyla okur ve temizler (`864ebc9` düzeltmesi); Linux'ta sıradan kullanıcıyla dosyaya doğrudan erişmeye çalışmayın.
- Uçtan uca testler izlenen `qa_reports/startup-*.png` dosyalarının üzerine yazar; koşudan sonra `git restore qa_reports/startup-*.png`.
- Hiç maç oynamamış hesapta yapay zekâ rakip ilk hamlesini 15 saniye sonra yapar (ilk maç kolaylığı); canlıda yeni hesapla yapılan bir denemede bu hata sanılmasın.
- Bu notun r12 ile ilgili sayıları (sürüm klasörü, etiketler, test sayıları) Claude'un 6 Ekim ev oturumunun kaydından alınmıştır; sunucudaki gerçek durum salt okunur denetimle teyit edilmelidir.

## 10. Codex sonucu — 7 Ekim, iş bilgisayarı

Kullanıcı son sürüm/kapalı test öncesinde savaş sonu reklamını açmak istedi;
4. maddedeki reklamı kalıcı kapalı tutma kararı bununla değişti. Gerçek ödeme
ve doğrulanmamış canlı geçiş açılmadı; yeni canlı onay şartı korunuyor.
Geciken SSV/bağlantıda ikinci reklam yerine ödül kontrolü eklendi; test
reklamı gerçek ödül üretmez. Kaynak versionCode artık 4 (config + Gradle),
imzalı APK/AAB henüz yok. Tam istemci 246, PostgreSQL 17 dahil reklam/ödül
alt kümesi 73, build sözleşmesi 9 test geçti; yerel web build üretildi.
Gerçek Android/SSV ve tam r13 imaj smoke/backup/restore bu değişikliklerle
henüz denenmedi. Ayrıntı `CODEX_CHECKPOINT.md` ve `docs/REWARDED_AD_LAUNCH.md`.
Docker işte çalışıyor; Java/Android SDK, upload anahtarı ve r12 özel
betik/known_hosts kayıtları beklenen konumlarda bulunamadı. AdMob sınırlı
sunum gösteriyor: tüm reklamların engellendiği sonucunu çıkarmayın; tam
sunum mağaza/doğrulama bekliyor, doluluk garanti değil. Commit/push kullanıcıda.

Son kullanıcı mesajı canlı reklam rollout'u için açık yetki verdi; tam r13
imaj geçişinin hemen öncesindeki ayrı onay/yedek kapıları korunur. Son erişim
kontrolünde TCP 22 yanıtsız, iş ağında HTTPS `MEB Erişim Engeli / games`;
canlı ayar uygulanmadı. Kullanıcı upload anahtarına şu anda erişemiyor,
dolayısıyla burada imzalı v4 henüz yok. Build/audit araç yolları iş/ev için
parametreli hale getirildi; JDK/SDK çözümleyicisinin dört testi geçti, araç
kurulmadı. Güncel devam noktası `CODEX_CHECKPOINT.md` en üst bölümüdür.

**En son sonuç — canlı reklam açıldı:** Dar SSH izni sonrası güvenilen
ED25519 eşleşti. Mevcut r12 imajında yalnız özel rollout `live`; SSV1 ve
test0/UMP/kalıcı tek-ödül korumaları sürer. Taze offline yedek + değişmeyen
kalıcı fingerprint/sayılar (12profil/12kimlik/65savaş),34 iç ve331s/34 dış
health/unsignedSSV403/son audit geçti. R1 Cloudflare-egress403 nedeniyle
disabled'a güvenli döndü; R2 bağımsız dış witness ile success/0. Cloudflare
değiştirilmedi, DB restore/silme yok. R13 geçişinde mevcut **live** ayarını
koruyun; eski kapalı reklam talimatı güncel karar değil. **R13 dağıtılmadı,
imzalı v4 ve gerçek cihaz/Google SSV ödül testi hâlâ yok**; aynı upload
anahtarı kullanıcıya işte erişilebilir değil. Checkpoint en üstü günceldir.

## 11. Evde devam — ödeme paneli, r13 ve v4 (7 Ekim)

**Kullanıcı kararı:** iş bilgisayarında dur; yarım kalan ödeme işini, r13
sunucu güncellemesini ve imzalı v4 APK/AAB'yi ev bilgisayarında sürdür.
Bu bölüm önceki "ürünler/API henüz yok" ve "sürüm kodu 3" durumlarını
günceller; önceki r12 reklam canlı açılış sonucu korunur. Bu not ödeme
açma veya yeni canlı dağıtım için otomatik onay değildir.

### Panelde tamamlananlar ve kanıt sınırı

- **Cloud projesi:** My First Project; numara `376018782491`,
  ID `project-37a84396-b930-4141-b4d`. Dashboard numarası ve mevcut
  OAuth client ID önekleri eşleşiyor. Clients ekranında **GRIDSHARD Play
  Hybrid PQC**, **GRIDSHARD Play Hybrid Classical**, **GRIDSHARD Play**,
  **GRIDSHARD Android Release**, **GRIDSHARD Play Games Server** (Web),
  **GRIDSHARD TEST Android** var. Audience altında eski test kullanıcıları
  da görüldü (adresler redakte; bu nota alınmadı). Yeni proje/OAuth
  istemcisi veya test listesi açma, eski çalışan girişi değiştirme.
- **API etkinliği bağımsız ekran kanıtı:** Google Play Android Developer
  API / `androidpublisher.googleapis.com` / **API Enabled**.
- **Hizmet hesabı:** oluşturulduğu ve Play'de davet düğmesine basıldığı
  kullanıcı teyidi. Önerilen hesap adı GRIDSHARD Play Billing,
  ID `gridshard-play-billing` idi; **gerçek e-posta/ID henüz okunmadı**.
  Cloud tarafında Owner/Editor veya gereksiz proje rolü verilmemesi istendi.
  Play izin modalında yalnız **GRIDSHARD** için finansal verileri görüntüleme
  ve siparişleri/abonelikleri yönetme seçiliydi; yönetici ve diğer izinler
  kapalıydı. `Uygula` zorunlu temel erişim seçilmediği için kapalıydı;
  **Uygulama bilgilerini görüntüleme (salt okunur)** da seçilmesi söylendi.
  Kullanıcı ardından davete bastığını bildirdi. **Son kullanıcı listesi,
  davetin durumu ve nihai üç izin henüz bağımsız görülmedi.** İlk devamda
  mevcut hizmet hesabı/Play kaydını kontrol et; tekrar hesap/davet oluşturma.
- **Lisans testi:** kullanıcı hesap düzeyindeki listeyi kaydettiğini
  bildirdi; liste/telefondaki gerçek Play kurulum hesabı henüz okunmadı.
  OAuth Audience, Play Games Testers, kapalı test ve lisans testi ayrı
  erişim kapılarıdır; birindeki kayıt diğerinin yerine geçmez.
- **Ürün listesi:** 10/10 tam kimlikler ekranla eşleşti, her üründe etkin
  satın alma seçeneği/teklif **0**. İlk ürünün ayrıntısında `standard`,
  Satın al, Türkiye, **Taslak**, eski sürümlerle uyumlu etiketi görüldü.
  Nihai Türkiye fiyatı **29,99 TL** ayrı tablo görüntüsüyle doğrulandı.
  Diğer dokuz ürünün ayrıntı/fiyat/ülke ayarı tek tek doğrulanmadı.

### Ürünlerde hedeflenen ayarlar (satış açma talimatı değildir)

| Ürün kimliği | İçerik | Hedef nihai Türkiye fiyatı |
| --- | --- | --- |
| `gridshard.flux_120` | 120 Akı | 29,99 TL |
| `gridshard.flux_260` | 260 Akı | 59,99 TL |
| `gridshard.flux_480` | 480 Akı | 99,99 TL |
| `gridshard.flux_1050` | 1.050 Akı | 199,99 TL |
| `gridshard.credits_1000` | 1.000 Devre Kredisi | 29,99 TL |
| `gridshard.credits_2200` | 2.200 Devre Kredisi | 59,99 TL |
| `gridshard.credits_4000` | 4.000 Devre Kredisi | 99,99 TL |
| `gridshard.credits_9000` | 9.000 Devre Kredisi | 199,99 TL |
| `gridshard.season_pass_premium` | Mevcut sezon premium ödül hattı | 99,99 TL |
| `gridshard.battle_rewards_premium` | Mevcut sezon savaş kredi/XP +%50; kupa hariç | 99,99 TL |

Tek seferlik ürün, tek normal seçenek `standard` / **Satın al**, içerik
**Dijital içerik**, çoklu miktar kapalı, simge/etiketler boş bırakılabilir.
Sezon ürünleri otomatik yenilenen abonelik değildir. Hak sunucuda sezon
başına tutulur; başka sezon tekrar alım tüketilebilir işlemle mümkündür.

Bu hazırlıkta **yalnız Türkiye kullanılabilir**, diğer bölgeler kullanılamaz
olacak şekilde yönlendirildi. İlk ürün bu kapsamda taslak kaydedildi;
diğer dokuzunun kapsamını ayrıca denetle. Bölgesel nihai fiyatı esas al:
toplu fiyat aracına 29,99 girilince ekranda %20 vergiyle **35,99** çıktı;
Türkiye satırının fiyatı doğrudan **29,99** olarak düzeltildi. Tüm bölgeler
kullanılabilir ama çoğunun fiyatı boşken **taslak kaydı da hata verdi**;
diğer bölgeler kullanılamaz yapılınca ilk kayıt başarıyla taslakta göründü.
Ürün ayrıntısındaki ABD yaş derecesi **Belirtilmemiş** yalnız taslak hazırlık
olarak bırakıldı; hedef kitle 13+ olması ürünün ABD yaş derecesini otomatik
belirlemez. ABD satış/uyum doğrulanmadı ve etkinleştirilmez.

### Henüz yapılmayan ödeme işleri

1. **Hizmet hesabı JSON anahtarı oluşturulmadı veya indirilmedi.** Önce
   mevcut hesabın e-postasını, proje/Play uygulama kapsamını ve güvenli
   aktarım yolunu doğrula. Anahtarı sohbet/Git/APK/kaynak ZIP'e koyma;
   içerik/token/makbuz/private key basma. Cloud rol genişletme veya güvenlik
   politikasını atlatma yok. Anahtar oluşturma/kapsam genişletme adımında
   kullanıcı bilgilendirilip açık onayı alınır; tek gerekli anahtar kullanılır.
2. **Canlı Google Play sağlayıcısı henüz kurulmadı.** Kaynak doğrulayıcı
   `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME=com.gridshardgame.app` ve
   `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` bekliyor. JSON sunucunun
   repo/image dışı özel sır alanında, uygun kullanıcı/izinlerle read-only
   mount edilmelidir. Ham `.env`/sır dosyası basılmadan merge/preflight
   denetlenir. Sırf fake purchase test modu 0 olması Google sağlayıcısını
   açmaz. R13'e ödeme mount/env değişiklikleri sessizce eklenmez; izole
   doğrulama ve canlı uygulamadan önce ayrı onay gerekir.
3. **Kimlik doğrulamalı Pub/Sub RTDN + iade mutabakatı bekliyor.** Gerekli
   topic/abonelik/kimlik/audience/paket eşleşmeleri, gerçek test bildirimi,
   voided-purchase takibi kaynak ve runbook üzerinden yeniden doğrulanır;
   dış hizmet entegrasyonu çalışmış varsayılmaz. Ayrıntı
   `docs/STORE_PURCHASES.md` ve `docs/ANDROID_PRODUCTION_SETUP.md`.
4. **Ödeme profili/mağaza hazır oluşu doğrulanmadı.** Ürün oluşturulabilmesi
   banka/vergi/merchant kurulumunun tamamlandığının kanıtı değildir;
   hassas banka/vergi verileri yalnız Google'ın ilgili ekranında kullanıcıca
   girilir, repo/sohbet içine alınmaz.
5. **Satın alma/iade uçtan uca denenmedi:** lisans test hesabıyla test ödeme
   ibaresi, fiyat/tek seçenek, pending ödeme, uygulama kapanması/ağ kesilmesi,
   hesap bağı, tek kalıcı teslimat, yeniden gönderim, tüketme/onay ve iade
   sonrası geri alma kontrolü gerekir. Test ödeme profili görülmeden
   deneme düğmesine basma; test kanalı tek başına ücretsiz ödeme değildir.
   Test için gerekli ürün etkinleştirme ve gerçek satış açma ayrı kullanıcı
   kararlarıdır. Başarılı cihaz ödemesi görülmeden hazır/çalışıyor deme.

### Evde çalışma sırası ve korunacak durum

- Not yazılmadan önce işte yerel HEAD **`dd76af8` / add admob**, çalışma
  ağacı temizdi. Bu belge değişikliklerini **kullanıcı commit/push eder**.
  Evde güncel kaynak, çalışma ağacı ve son CI doğrulanır; yerel değişiklik
  varsa korunur. Otomatik reset/restore veya kullanıcının dosyalarını silme yok.
- Evde aynı upload anahtarı/yerel DPAPI kaydı, JDK/SDK, Docker ve önceki
  özel deploy/audit dosyaları bulunur. İşte anahtara erişilemedi; yeniden
  anahtar üretme. Config ve Gradle **versionCode 4** / **2.1.0-beta.72**
  olarak bu tur okunup doğrulandı. **İmzalı v4 APK/AAB henüz üretilmedi.**
- Son iş-PC bağlantısı strict pinned host-key ile **banner exchange
  timeout** verdi. Yeni sunucu denetimi/ayar değişikliği yapılmadı.
  IP ve özel SSH anahtar yolu izlenen belgelere yazılmaz; evde kullanıcıdan
  güncel erişim alınıp mevcut güvenilir fingerprint/known_hosts eşleşmesi
  sağlanır. SSH Her yer'e açılmaz, host-key kontrolü kapatılmaz.
- **r12 reklam `live` korunur.** Kullanıcı v3 ile reklam oynattığını bildirdi;
  bu bağımsız Google SSV/ekonomik ödül/ledger kanıtı değildir. AdMob paneli
  en son sınırlı sunum gösteriyordu; tam sunum ve doluluk garanti edilmez.
  Yeni r13 geçişinde mevcut mount/PGS/demo giriş/UMP/SSV/test0 ve oyuncu
  ilerlemesi korunur. Gerçek ödeme bu panel adımlarıyla açılmadı.
- Önce **r13 yalıtılmış test + smoke/backup-restore + canlı ön kontrol**;
  ardından kullanıcıdan geçiş öncesi ayrı onay, taze doğrulanmış yedek ve
  veriyi koruyan canlı geçiş. Yeni ödeme ayarları ayrıca doğrulanıp
  onaylanır; test kapıları hazır değilse gerçek satış kapalı kalır.
- Sonra **aynı signer ile v4 APK/AAB + binary audit**. Mevcut Play v3'e
  USB'den yerel APK yükleme yok; AAB'yi kullanıcı test kanalına yükler.
  Kapalı testin ülke/hedefleme ve gerçek opt-in durumunu kontrol et;
  önceki kayıtta 10 kişi seçilmiş, iki kişi daha eklenecekti. Listeye kişi
  eklemek 12 gerçek katılımcı/aralıksız 14 gün koşulunun sağlandığı kanıtı
  değildir. Süre veya test yayını başlamış varsayılmaz.
- Site/politika paketi için 7. bölüm geçerli: yeni davranışları anlatan
  metin, r13 davranışı doğrulanmadan yayımlanmaz. Diğer araca/ev makinesine
  devam için bu bölüm ve `CODEX_CHECKPOINT.md` en üst kayıt birlikte okunur.

**Bu not turunun kapsamı:** yalnız iki Markdown devir dosyası; kod, ürünler,
Cloud/Play/AWS ayarları, canlı veri ve sırlar değişmedi. Build/deploy,
anahtar oluşturma, ödeme/ürün etkinleştirme, commit/push yapılmadı.
