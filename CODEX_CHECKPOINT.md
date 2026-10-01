# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 1 Ekim 2026

Bu dosya güncel çalışma paketini ve korunması gereken önceki kararları içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Aktif paket — sunucu geçişi: yerel uygulama tamam, gerçek dağıtım kapıları açık (1 Ekim 2026)

**Devam ederken bu bölüm esas alınır.** Aşağıdaki 30 Eylül ve daha eski bölümler aşama tarihçesidir; oradaki eski test sayıları ve açık kod görevleri güncel durum değildir. Eski oyuncu, takım, kimlik, platform, makbuz ve analitik verileri yeni sunucuya **aktarılmayacak**. Kaynak `server/data` ve eski Docker birimleri korunur. Yeni üretim PostgreSQL'i ve runtime birimi boş başlar.

### Tamamlanan kod ve yerel doğrulama

1. `[x]` SERVER-1/2/3/4 ortak kalıcılık: PostgreSQL oyuncu/kimlik/platform/takım/preset/telemetri/analitik yolu üretimde zorunlu; `PersistentState` tek worker canlı nesnelerini kilitler ve ortak SQL commit/rollback sağlar. Sosyal davet/DM/outbox, takım üyeliği/bağış/turnuva ve hesap silme aynı sınırdadır. Sağlayıcı ağ çağrıları transaction dışında; eski işlem makbuzu sonraki üyelik/engel kararını canlandıramaz. `014_economic_operations.sql` ekonomi isteklerini oyuncuya kapsamlı işlem kimliği ve payload özetiyle tekilleştirir; çelişkili tekrar 409 olur, eski bakiye geri yazılmaz.
2. `[x]` SERVER-5 kalıcı sonuç defteri: `013` terminal niyeti önce `pending`, sonra profiller/istatistikler/turnuva ayağı/katılımcılar ve `applied` işaretini tek commit kaydeder. RAM kaybından sonra tekrar işleme ve hata rollback'i gerçek PostgreSQL'de geçti. Bekleyen sonuçlar sonraki sezon/gün/ödül mutasyonundan önce tamamlanır; sonuç tarihi korunur. 27 Eylül–2 Kasım uzun kesinti fixture'ı haftalık/sezon hesaplarını sınar. PvP, ödülsüz arkadaş antrenmanı ve takım turnuvası hesapları ayrıdır. **Aktif RAM maçları süreç kaybından sonra devam etmez; terminal niyet kaydından önce süreç kaybına sıfır veri kaybı garantisi verilmez.**
3. `[x]` SERVER-6/7 ownership ve reconnect kodu: PostgreSQL tek-worker advisory kilidi + Redis süreli sahiplik token'ı; lease kaybında runner/API/WS fail-closed, presence süreli, Redis rate-limit hatasında yerel fallback yok. Kimlik iptali/ownership kontrolü event loop'u engellemeyen thread'de; terminal auth kapanışında istemci komut kuyruğunu temizler ve yeniden bağlanmaz. Aynı süreçte iki tarayıcıyla gerçek PvP/yeniden bağlanma **2/2 geçti**. Gerçek Redis ve süreçler arası dağıtım doğrulaması aşağıda açık; çok-worker/HA desteği ilan edilmez.
4. `[x]` SERVER-8 güvenli native sır deposu kodu: pinli Capacitor secure-storage, doğrulanmış güvenli yazımdan sonra eski plaintext temizliği, RAM access token ve kesintide kurtarmayı koruyan iki aşamalı recovery kaydı. Üretim native'de plaintext fallback yok; Android backup dışlaması korunur. Yeni plugin'i içeren APK ve gerçek cihaz testi henüz yapılmadı.
5. `[x]` SERVER-0/9/10 dağıtım hazırlığı: izin listeli, UID 10001, salt okunur tek-worker image; ayrı `docker-compose.production.yml`, iç PostgreSQL 17/Redis ağı, yalnız Caddy 80/443, HTTPS/WSS exact-origin/host kontrolü, sır dosyaları, temiz kurulum UUID'si. `tools/provision_server_secrets.py` yalnız yeni dış Linux dizinine sır üretir, üzerine yazmaz ve içerikleri basmaz. QA/test çıktıları, eski runtime, anahtarlar ve sağlayıcı özel dosyaları paket sınırından dışlanır. Sunucu açılış/profil/içerik/hesap adımlarına bağlı yükleme ekranı ve hata/yeniden deneme çalışır.
6. `[x]` SERVER-11 yedek/kurtarma aracı: canlı worker varken yedek reddi, yeni hedef/kurulum UUID'si/şema checksum/kayıt sayısı/SHA-256 doğrulaması ve yalnız boş DB/runtime'a geri yükleme gerçek PostgreSQL 16'da geçti. `deploy/Dockerfile.maintenance` bakım profili ve `docs/SERVER_PRODUCTION_RUNBOOK.md` güvenli kurulum/geri dönüş rehberi eklendi. Otomatik dış alarm, şifreli uzak yedek ve WAL/PITR kuruldu anlamına gelmez.
7. `[x]` Güncel test sözleşmesi: kaldırılmış generator/taşıma/swap/laboratuvar/özel hücre ve eski `/web-test/*` yönetim API'lerine bağlı **67 tarihsel test dosyası silinmeden** `docs/archive/server-test-contracts-20261001/` altında korunur. Manifest/README her dosyanın nedenini ve güncel karşılığını açıklar. Yeni aktif negatif testler eski komutların reddini, eski HTTP yüzeylerinin 410 dönmesini ve veri değiştirmemesini sınar. Geçerli ekonomi/UI/ses/paket testleri arşivlenmedi, güncel sözleşmeye uyarlandı. Bu işlem eski testlerin aynen geçtiği veya sessiz `skip/xfail` ile kapatıldığı iddiası değildir.
8. `[x]` Son yerel sonuçlar: izole PostgreSQL 16 + şema **014** ile tam aktif sunucu **988 geçti, 1 atlandı**; tek atlama gerçek Redis URL/servisinin bulunmaması. Tam istemci **77/77**, production build sözleşmeleri **8/8**, Python operatör/paket araçları **5/5**. Paket denetimi büyük/küçük harfli özel dosyaları da dışlar; izlenen symlink veya checkout dışına çözülen yol varsa paketlemeyi reddeder. Masaüstü Chromium + Android Chrome/iPhone WebKit emülasyonunda başlangıç/menü/güncel sezon/savaş/ses/FCT/mobil düzen **12/12**, ayrıca gerçek iki istemci PvP **2/2**. `pnpm build:web` build ID: `d2e19155aa306804`. Testler eski oyun verilerinden ve birbirlerinden izole; tarayıcı emülasyonu native/sağlayıcı testi değildir.
9. `[x]` Temiz **kaynak** paketi `artifacts/server-transition-20261001/GRIDSHARD-2.1.0-beta.72-signatures-social.zip` altında üretildi; yanında SHA-256 dosyası vardır. ZIP bütünlüğü, yalnız iki statik arena JSON'u, 67 tarihsel test kaynağının korunması ve özel/runtime/QA çıktılarının dışarıda kalması denetlendi. Bu bir APK veya üretim hazır onayı değildir; Docker runtime ayrıca yalnız izin listesindeki kodu alır. Paket çalışma ağacındaki değişiklikleri içerir; henüz commit/push yapılmadı.

### Açık kapılar — sıradaki çalışma

1. `[ ]` **SERVER-6/10/11 gerçek altyapı kapısı:** çalışan Docker Engine ve gerçek Redis üzerinde `quality.yml` migration job'ındaki PostgreSQL 17 + Redis + image/yeniden başlatma + Caddy + bakım image testlerini çalıştır. CI tanımı hazır, **uzak CI çalıştırılmadı ve push yapılmadı**. Bu bilgisayarda Docker/Podman/redis-cli komutu ve çalışan Docker/Redis servisi bulunmadı. Kullanıcıdan Docker Desktop'ı açması veya yetkili Linux test sunucusu seçmesi istenmiştir; yanıt beklenir. Docker motoru kullanıma açılmadan gerçek image geçti denmez.
2. `[ ]` **SERVER-10 staging:** kullanıcıyla hosting/alan adı seçimi ve Linux/SSH/DNS yetkisi; rehberdeki yeni boş kurulum, gerçek HTTPS/WSS, iki cihaz oturumu, token iptali/reconnect, kalıcı profil ve sıfır çift ödül denemesi. Satın alma veya uzak sunucuya yazma bu turda yapılmadı; sırları sohbete/Git'e koyma.
3. `[ ]` **SERVER-8 native/sağlayıcı:** kalıcı application ID + yeni imzalı test paketi; secure-storage/recovery, tam ekran/arka plan ses duruşu, HTTPS/WSS gerçek telefon. OAuth/Google Play/Apple, ödeme-iade/ödüllü reklam, e-posta ve push için gerçek sağlayıcı hesabı/sırlarıyla uçtan uca kanıt. Sağlayıcı yapılandırılmamışken sahte hazır/başarı açma.
4. `[ ]` **SERVER-11 işletim:** gerçek image'dan alınan yedeği ayrı boş Compose projesine geri yükle; dış sağlık/disk/yedek yaşı alarmı, şifreli uzak kopya ve saklama politikası. Birimleri silme, `down -v`, eski JSON import veya canlı DB'ye restore yapma.

Yerel PostgreSQL 16 test kümesi `gridshard-pg-transition-20260930` başarıyla durduruldu; yalnız doğrulanmış temp dizini kaldırıldı. Canlı veriler/sırlar değişmedi. Sunucu geçişi hedefi gerçek dış kapılar kapanmadan **tamamlandı sayılmaz**. Yeni çalışmada önce bu kapılardan ilerlenebilir olanı seç; eski tarihçe görevlerini tekrar uygulama.

## Tarihçe — eski kayıt taşımadan temiz sunucu kurulumu (30 Eylül 2026)

Kullanıcının son kararı: **eski oyuncu, takım, platform, makbuz veya analitik kayıtlarından hiçbiri yeni sunucuya taşınmayacak.** Kaynak `server/data` ve eski Docker birimleri yerinde korunur; yeni kurulum boş PostgreSQL ve ayrı boş runtime birimiyle başlar. `Kesici` ad çakışması artık yeni kurulumun engeli değildir. Eski JSON → PostgreSQL veri aktarımı ve ad uzlaştırma çalışması iptal edildi.

1. `[~]` SERVER-9 temiz başlangıç sınırı: `006_clean_installation.sql` tek kurulum kimliği ekledi. Üretim açılışı kimlik ilk kez yazılırken tüm kalıcı PostgreSQL uygulama tablolarının boş olmasını ister; dolu eski veritabanını reddeder. `GRIDSHARD_RUNTIME_DATA_DIR` üretimde zorunlu ve kaynak ağacının dışında. İlk açılışta dizin boş olmalı; kurulum işareti veritabanı kimliğiyle eşleşir. `docker-compose.yml` eski `./server/data` bağını kaldırıp yeni `*-clean` adlı PostgreSQL/Redis/runtime birimleri kullanır. Eski dosya veya birim **silinmedi**. Sentetik temiz kurulum/yol testleri geçti. Gerçek Docker/PG açılışı henüz doğrulanmadı.
2. `[~]` SERVER-1/2/3 üretim depo geçişi: oyuncu ve kimlik PostgreSQL yoluna ek olarak `007`–`011` ile platform, takım, savaş havuzu presetleri, telemetri ve rızaya bağlı analitik PostgreSQL'e bağlandı. Üretim artık bu kayıtlar için JSON dosyası kullanmaz. Platform belgesi satır kilitli; takım belgesi revision/CAS korumalı. Bunlar eski kayıtlardan veri aktarmaz. Gerçek izole PostgreSQL çalıştırması `GRIDSHARD_TEST_DATABASE_URL` eksik olduğu için bekliyor; yalnız sentetik repo testleri geçti.
3. `[~]` SERVER-4 mağaza alımı/iadesi: `PostgresPool.transaction()` aynı istekteki oyuncu profili ve `platform_document` makbuz durumunu tek commit/rollback'e bağlar; makbuz tekrar kontrolü kilit altında, hata sonrası önbellek kalıcı kayıttan yüklenir. İade bildirimi kimliği aynı transaction içinde kaydedilir; henüz eşleşmeyen makbuz 503 ile sağlayıcıya yeniden denetilir. Google Play tüketim onayı ayrı, tekrar denenebilir adımdır. Diğer ekonomi, bağış ve maç sonucu yazımları hâlâ çapraz-kayıt atomik değil; bu kısmi kazanım üretim hazır onayı değildir.
4. `[~]` SERVER-3/4 takım modül bağışı: üretimde takım satırı ve ilgili iki oyuncu satırı kilitlenip takım isteği, bağışçı eksi parça ve alıcı artı parça tek PostgreSQL transaction'ında yazılır; hata sonrası önbellek disk kaydına döner. Diğer takım üyelik/turnuva ekonomi yolları aynı güvenceye alınmadı.
5. `[~]` SERVER-4 eşzamanlı profil yazısı: `012_player_revision.sql` oyuncu sürümünü ekledi. PostgreSQL repository mevcut sürümü karşılaştırarak günceller; eski sürüm sessizce yeni kupa/parça/bakiyeyi ezmek yerine hata verir. Hazırlık sosyal SQL yazıcısı da sürümü artırır. Aynı süreçte farklı işlemlerin paylaştığı canlı profil nesnesi için tüm mutasyonları kapsayan kilitleme/yeniden deneme hâlâ açık.
6. `[x]` SERVER-2 arkadaşlık alt paketi: üretimde istek/kabul/ret/iptal/engelleme/engeli kaldırma API yolları iki profil, ilişkisel arkadaş/istek/blok kenarları, gerçek `platform_document` blok aynası ve işlem makbuzunu ortak PostgreSQL commit/rollback'e bağlar. Kilit sırası platform → sabit kimlik sıralı oyuncular; önkoşullar kalıcı kayıttan kontrol edilir, önbellek yalnız commit sonrası güncel revision ile yüklenir. İşlem kimliği oyuncuya göre kapsamlanır; farklı hedef/eylemle yeniden kullanımı 409, tekrar teslimi mevcut sonucu verir. Eski bir iptal/kabul/blok paketi daha sonraki kararı geri çevirmez. Kabul anında 100 arkadaş sınırı ve iki tarafın engeli yeniden kontrol edilir. Üretim blok API'si artık `request_id` ister; mevcut istemci gönderir, eski istemci kimliksiz istekle 422 alır. Geliştirme JSON yolu korunur; hiçbir eski kayıt aktarılmaz. Arkadaş savaşı/davet kodu, DM-bildirim/outbox ve hesap silme bu kazanımın dışında.
7. `[x]` SERVER-2 sosyal iş akışı kodu: `PostgresSocialRuntime` arkadaş savaşı oluşturma/kabul/ret/tamamlanma, davet kodu tüketimi, DM ve okundu işlemlerini gerçek `platform_document` bildirimi/push iş kuyruğu, ilgili profiller ve idempotency makbuzlarıyla aynı transaction'a bağlar. Davet eski süreçten kaldığında sona erer; tamamlanmış davet tekrar kabul edilerek savaş canlandırılmaz. Aktif davetler geçmiş sınırı yüzünden budanmaz. `PostgresAccountErasure` soğuk profillerdeki sosyal bağlantıları, bildirim/push kaynaklarını, kimliği, analitiği ve takım üyeliği/yönetici devrini atomik temizler. Gerçek push sağlayıcısı/cihaz teslimi bu kod testinin yerine geçmez.
10. `[~]` SERVER-3/4 ortak işlem paketi: `PersistentState` tek worker üretimde eşzamanlı canlı profil mutasyonlarını sıralar; ilgili profilleri kalıcı kayıttan alır, platform/takım/profil/preset yazıcılarını ortak transaction'a bağlar ve hata sonrası önbelleği geri yükler. Sync profil/ekonomi/takım/sosyal handler'ları açıkça bu sınırda; sağlayıcı ağ çağrıları dışarıda. Okuma sırasında sezon/gün değişimi de kaydedilir. İlk yetkili giriş yeni profili kimlik/cihaz kaydıyla birlikte oluşturur. Eski takım kabul/ayrılma makbuzu sonraki üyeliği geri çeviremez. Takım üyeliği yazısından sonra hata, paralel bakiye değişimi ve ayar/analitik hata rollback testleri gerçek PostgreSQL'de geçti. Tüm ekonomi isteği türlerinde bağımsız işlem kimliği/payload çatışması denetimi ve gerçek HTTP yük senaryoları hâlâ denetlenmeli.
11. `[~]` SERVER-5 sonuç defteri: `013_battle_results.sql` bitiş olgularını önce `pending` kaydeder; profil, istatistik, turnuva ayağı ve katılımcı sonucu ile `applied` işareti tek commit olur. Hata sonrası RAM dedup işaretleri temizlenir; başlangıç/bakım yeniden denemesi RAM kaybından sonra pending sonucu tamamlar. Maç başına defter kilidi tekrar ödülü önler; farklı sonuçla aynı kimlik reddedilir. Maç sonrası ve geçmiş API'leri PostgreSQL sonucunu okur. Silinen katılımcı hayalet profil olarak geri oluşturulmaz. Tick callback'i DB işini ayrı thread'de yürütür. Odaklı gerçek PG/oyun kümesi **39/39 geçti** (son ek otomatik kayıt kontrolünde eski `coins` fixture'ı kanonik `circuit_credits` ile güncellendi; yeni toplu koşu bekliyor). Çok dönemli uzun kesinti, terminal kayıt yazılmadan süreç kaybı ve HTTP reconnect uçtan uca hâlâ ayrı kapılar.
12. `[ ]` Sıradaki SERVER-6/7 kapısı: tek worker yaşam döngüsü/ownership lease, Redis presence ve süreç kaybı/reconnect kurallarını tamamla; ardından SERVER-8 güvenli native sır deposu, SERVER-10/11 dağıtım/HTTPS/geri yükleme/CI kapıları. Docker komutu Windows PATH'te ve beklenen kurulum yolunda yok. WSL'de yalnız `docker-desktop` kaydı bulundu; distro içindeki CLI bu kullanımın desteklenmediğini bildirdi, gerçek motor/image doğrulanmadı. Yerel Redis hizmeti de bulunmadı. Uzak sunucu/alan adı satın alma yetkisi ve gerçek sağlayıcı bilgileri alınmadan bunlar tamamlandı sayılamaz.
13. Çalışma sürüyor: yalnız bu tura ait izole PostgreSQL 16 kümesi `C:\Users\S-A\AppData\Local\Temp\gridshard-pg-transition-20260930`, port `55444`, DB `gridshard_test` açıktır; eski verilere bağlı değildir. İş bitince `pg_ctl -m fast -w stop`, sonra doğrulanmış yalnız bu temp hedefi temizlenmeli. Önceki paket kümesi kapatılmıştı; bu yeni kümeyi onunla karıştırma. Kullanıcının “bitirene kadar durma” hedefi aktiftir; dış yetki gerektirmeyen işleri sürdür.
8. `[~]` Önceki paket: odaklı gerçek PostgreSQL + depo/mağaza bildirimi/takım testleri **30/30**, ek oyuncu kalıcılığı/sosyal/mağaza doğrulama testleri **34/34** geçti. İzinli ağ erişimiyle kilit dosyasındaki pnpm bağımlılıkları kuruldu, `pnpm build:web` geçti ve derlenmiş istemciyle üretim modülü içe aktarıldı (sahte bağlantı adresleriyle, servis açılışı değil). Eski kayıtlardan ayrı geçici PostgreSQL 16 kümesinde `012` dâhil gerçek SQL entegrasyon testleri **5/5 geçti**; profil+makbuz ortak commit/rollback'i, sürüm çatışması ve temiz kurulum kimliği/aynı dizinle yeniden açılış doğrulandı. Geçici test kümesi durdurulup yalnız kendi temp dizini kaldırıldı; eski oyun verilerine dokunulmadı. Tam sunucu test toplaması kaldırılmış eski oyun API'lerine bağlı 12 tarihsel içe aktarım hatasında duruyor; ayrı test borcu. Docker komutu kurulu değil; gerçek kapsayıcı/Redis/HTTPS/cihaz/sağlayıcı dağıtımı henüz doğrulanmadı.
9. `[x]` Arkadaşlık alt paketi doğrulaması: odaklı sunucu kümesi **70/70**, bunun içinde ayrı geçici PostgreSQL 16 üzerindeki gerçek entegrasyonlar **13/13** geçti. `test_postgres_social_api.py` üretim handler'larını gerçek DB ile sınar: ortak commit, platform yazısından sonra enjekte edilen hatada iki profil/kenar/makbuz/ayna rollback'i, eşzamanlı aynı ve çapraz istekler, uzun istemci kimliği, farklı hedefte kimlik çakışması, tekrar teslimde eski kararın canlanmaması, hayalet oyuncu oluşturmama ve eski önbellekle kalıcı arkadaş sınırını aşmama. `pnpm test:client` **68/68**, `pnpm build:web` ve `git diff --check` geçti. Geçici test PostgreSQL kümesi durduruldu ve yalnız bu paketin doğrulanmış test dizinleri kaldırıldı; canlı veriler/sırlar değiştirilmedi. Bunlar HTTP/cihaz/Redis/sağlayıcı uçtan uca veya üretim hazır onayı değildir.

## Tarihçe — eski veri için salt okunur sosyal geçiş hazırlığı (artık kullanılmıyor)

0. `[~]` `005_social_transactions.sql` ile işlem makbuzu, arkadaş savaşı daveti ve push outbox tabloları **additive** eklendi; `PostgresSocialTransactionRepository` arkadaşlık/istek/blok iki profil+ilişkisel kenar+platform blok aynasını, davette iki profil+bildirim+outbox'ı tek transaction'da hazırlar. Aynı operasyon kimliği tekrarı/idempotency ve çelişkili kimlik reddi vardır. **Canlı API'ye bağlanmadı; eski JSON veri aktarılmayacak.** Saf sosyal durum geçişi+envanter ve açık boş-platform CLI testleri 14/14 geçti, gerçek PostgreSQL entegrasyon testi ortamda `GRIDSHARD_TEST_DATABASE_URL` olmadığı için bekliyor. Eski oyuncu JSON'unda iki `Kesici` adı tespit edilmişti; artık aktarım dışıdır. İsim değişikliği veya silme yapılmadı.
1. `[x]` Sosyal/platform için geçerli işlem sınırı `docs/SERVER_MIGRATION_PLAN.md` içine açıkça yazıldı: arkadaş/istek/blok alanlarının kanonik kaydı oyuncu profilinde, platform blok alanı ayna; hedefte iki profil, sosyal tablolar, blok aynası ve outbox aynı PostgreSQL transaction'ında olmalı. Mağaza makbuzu/bakiye/iade ayrı SERVER-4 atomiklik kapısıdır. Mevcut endpoint kilitleri ve ayrı kayıt yazımları bu garantiyi sağlamaz.
2. `[x]` `server/app/social_migration_audit.py` ve `tools/audit_social_migration.py` eski verinin yalnız salt okunur envanteri için yazıldı. Üretim temiz kurulumunda kullanılmaz; hiçbir veri aktarılmadı veya yazılmadı.
3. `[ ]` Sıradaki kapı: ortak PostgreSQL transaction/idempotency/outbox uygulamasını gerçek sosyal API ve hesap silmeye bağla. Eski verinin denetimi, ad çakışması uzlaştırması ve içe alma artık yapılmayacak. `003`/`004` hazırlık tabloları canlı sosyal/mağaza API'sinin kaynak kaydı değildir.

## Aktif paket — istemci test triage ve PostgreSQL makbuz defteri (30 Eylül 2026)

1. `[x]` Tam `pnpm test:client` kümesindeki 15 kırık sınıflandırıldı. Eski metin/ses/sürüm/CSS kaynak eşleşmeleri, eski akım yolu beklentileri, kaldırılmış öğretici `runAction` API'si ve sahte DOM eksikliği güncel sözleşmeye uyarlandı. Mağaza testi gerçek native/test sağlayıcı ayrımını, öğretici testi bağlamla ilerlemeyi kontrol ediyor. **Tam küme 68/68 geçti.** Paketleme testi de 8/8 geçti; ilk deneme Windows geçici klasörü sandbox erişiminden dolayı başarısız olmuştu, izinli yeniden koşuda geçti. Bu, gerçek cihaz/E2E ve mağaza sağlayıcısı doğrulaması değildir.
2. `[~]` SERVER-2/4 hazırlığı: `004_store_ledger.sql` ile makbuz ve işlenmiş mağaza bildirimi tabloları, `PostgresStoreLedgerRepository` ile ilk makbuzu koruma, token özeti tekilliği, iade geçmişi ve bildirim idempotency kaydı eklendi. İzole PostgreSQL 16'daki oyuncu/kimlik/sosyal/makbuz entegrasyonu **3/3**, mevcut JSON makbuz/iade seçili regresyonu **2/2** geçti. Geçici PostgreSQL kümesi durdurulup kaldırıldı. **Canlı `PlatformService` hâlâ JSON kullanıyor; repository bağlanmadı ve hiçbir oyuncu verisi taşınmadı.** Bakiyeyle makbuz kaydının atomik transaction sınırı, önceki JSON kayıtlarının denetimli aktarımı ve iade/silme bağlantısı çözülmeden anahtarlama yapılmamalı.
3. `[ ]` Sıradaki geçiş kapısı: platform/sosyal repository sınırını profil içindeki arkadaş/blok yazılarıyla tutarlı tek işlem sözleşmesine indir; canlı JSON için salt okunur çakışma/envanter denetimi hazırla. Takım ve preset JSON'larına dokunulmadı. Docker image, gerçek ödeme/iade/AdMob ve uzak sunucu dağıtımı henüz doğrulanmadı.

## Aktif paket — Android tam ekran/ses yaşam döngüsü ve sunucu geçişi kapısı (29 Eylül 2026)

Kullanıcının telefon ekranında Android durum ve gezinme çubukları görünüyordu; uygulama arka plana alındığında müzik sürüyordu. İkinci ekran görüntüsü yalnız gelecekteki uzak sunucu açılış/karşılama akışı için referanstır; üçüncü taraf görseli/markası kullanılmayacaktır. Hosting ve alan adı **son aşama**; henüz satın alınmadı veya uzak sunucu kurulmadı.

1. `[x]` Native Capacitor `SystemBars.hidden` ve açılış/öne dönüşte `SystemBars.hide()` eklendi; `viewport-fit=cover` ayarlandı. Android sistem çubukları kenar hareketiyle geçici olarak açılabilir. Yeni yerel debug APK `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk` üretildi; geçici kimliği `com.gridshard.localdebug`, gömülü API adresi `http://192.168.1.105:8879`. Ağ adresi değişirse yeniden derlenmeli. APK paket denetimi geçti. **Kullanıcı telefon denemesini tamamladı ve sorun kalmadığını bildirdi.**
2. `[x]` Ses yöneticisi `visibilitychange`, `pagehide/pageshow`, native `blur/focus` ile arka planda müzik katmanlarını, sonuç sesini ve efektleri durdurup Web Audio bağlamını askıya alır; öne dönünce güncel oyun durumuna göre müziği geri kurar. **Kullanıcı telefon denemesinde sorun olmadığını bildirdi.**
3. `[x]` Sunucu geçişi SERVER-0 paket/gizli veri sınırı: `server/data/` içinde yalnız iki statik arena JSON'u kaynak ve Docker paketinde izinli. Daha önce Git tarafından izlenen beş çalışma zamanı JSON/geçici dosyası yalnız Git indeksinden çıkarıldı; **diskteki kopyaları yerinde bırakıldı**, oyuncu verisi silinmedi. Eski Git geçmişindeki kopyalar bu işlemle temizlenmez; yayımlanmış sır/kişisel veri varsa ayrıca olay incelemesi ve anahtar rotasyonu gerekir. `tools/package_release.py` yalnız statik arena dosyalarını paketler. Docker kuralları bu iki zorunlu statik dosyayı yeniden dahil eder; Docker ikilisi bu makinede olmadığı için image doğrulaması bekler.
4. `[x]` SERVER-1 ilk koruma: `GRIDSHARD_RUNTIME_MODE` yalnız `development`/`production` kabul eder; `prod` gibi yazım hatası artık sessizce geliştirme/JSON yoluna düşmez. Üretimde `DATABASE_URL` zorunluluğu korunur; iki negatif başlangıç testi geçti. İzole yerel PostgreSQL 16 kümesinde oyuncu/kimlik yazma-okuma testi geçti. Kimlik güncellemesinin `created_at` değerini yeniden yazma hatası düzeltildi ve gerçek DB testinde doğrulandı. Test kümesi kapatılıp yalnız kendi geçici dosyaları temizlendi. Platform/takım gibi diğer JSON depoları henüz PostgreSQL'e taşınmadı.
5. `[~]` SERVER-2 şema hazırlığı: `003_social_runtime.sql` ile sosyal hesap, arkadaşlık/istek, blok, DM/okundu, bildirim, push aboneliği, rapor, davet ve OAuth değişim tabloları eklendi; ayrı, açık onay gerektiren yıkıcı geri alma dosyası var. İzole PostgreSQL 16'da gerçek migration/şema testi geçti; geçici küme kapatılıp temizlendi. **Henüz repository bağlanmadı ve canlı JSON verisi taşınmadı.** Mevcut `PostgresPool.open` bekleyen SQL migration'larını açılışta uyguladığından, bu eklemeler sonraki PostgreSQL açılışında boş tablolar oluşturur; iş akışını değiştirmez.
6. `[~]` Doğrulama: odaklı mobil yaşam döngüsü ve ses testleri, web derlemesi, paketleme testleri, Gradle debug derlemesi ve APK içerik denetimi geçti. Kullanıcı gerçek telefonda iki hata için sorun kalmadığını doğruladı. SERVER-1/2 gerçek PostgreSQL entegrasyonu 30 Eylül'de 3/3; tam `pnpm test:client` 68/68 geçti. Buna rağmen gerçek mağaza/ödeme, E2E, Docker image ve üretim dağıtım kapıları **yeşil değil**.

### Sunucu geçişi sırası ve açık kapılar

`D:\Projects\Düzeltmeler\Sunucu Geçişi.md` içindeki faz sırası korunur; mevcut koddan çıkarılmış veri envanteri ve üretim engelleri `docs/SERVER_MIGRATION_PLAN.md` içindedir. SERVER-0 **yalnız paket sınırı düzeyinde ilerledi**, tamamlandı sayılmaz. Sır denetimi, sürüm kaydı ve Docker image testi bekliyor.

- `[ ]` SERVER-1: Mevcut PostgreSQL oyuncu/kimlik kalıcılığını üretim tek kaynak kuralına bağla; oyuncu `JSONB` yapısını ilk sürümde koru, sessiz JSON fallback bırakma.
- `[ ]` SERVER-2: Arkadaşlık, DM, bildirim, engelleme, rapor, davet, push ve mağaza makbuz defterini PostgreSQL'e taşı.
- `[ ]` SERVER-3: Takım, başvuru, sohbet, istek/bağış, antrenman ve turnuva kayıtlarını PostgreSQL'e taşı.
- `[ ]` SERVER-4: Ekonomi, satın alma/iade, kupa, ödül, bağış ve yükseltmelerde tek transaction/idempotency sınırı kur.
- `[ ]` SERVER-5: Bitmiş maç sonuç/katılımcı defteri ve geçmişi; profil/ödül kaydıyla tutarlı atomik işlem.
- `[ ]` SERVER-6: Redis presence/oturum/ownership yönlendirmesi; savaş simülasyonunu RAM'de tut.
- `[ ]` SERVER-7: PvP reconnect, süreç kesintisi ve tek worker üretim sertleştirmesi.
- `[ ]` SERVER-8: Kimlik/cihaz güvenliği; mobil gizli veriyi güvenli depoya taşı ve OAuth üretim sağlayıcılarını doğrula.
- `[~]` SERVER-9: Eski JSON → PostgreSQL aktarımı iptal. Yeni boş veritabanı ve ayrı boş runtime birimiyle kurulum kimliği doğrulandı; gerçek dağıtımda boş kaynak/geri yükleme provası ve yeniden açılış doğrulaması bekliyor. Eski canlı verileri değiştirme.
- `[ ]` SERVER-10: HTTPS/WSS staging ve üretim dağıtımı. Uzak API ile gerçek açılış/profil geri getirme adımlarına bağlı özgün GRIDSHARD yükleme ekranı bu aşamada yapılacak; sahte yüzde veya üçüncü taraf sanat kullanılmayacak.
- `[ ]` SERVER-11: İzleme, geri yükleme tatbikatı, CI/yayın kapıları; istemci birim kümesi geçti, E2E/gerçek mağaza/geri yükleme kapıları bekler. Bunlar geçince hosting/alan adı için kullanıcı seçimi ve yetkisi alınır.

## Aktif paket — GRIDSHARD2.1 tur 13–14 seçici aktarımı (29 Eylül 2026)

Kaynağın son checkpoint'i tur 14'e ilerledi. Önceki tur 10–12 aktarımı hedefte **henüz commit edilmemişti**; bu farklar korunarak yalnız yeni kanonik değişiklikler birleştirildi. Kaynağın kendi `CODEX_CHECKPOINT.md` dosyası kopyalanmadı; canlı oyuncu/kimlik/takım/telemetri verileri ve sırlar değiştirilmedi.

1. `[x]` Tur 13: Sabotaj ve Ekonomi AI arketipleri Dengeli Kontrol ve Dengeli Ekonomi ile değiştirildi. Eski `sabotage`/`economy` kimlikleri sunucuda yeni arketiplere yönlenir; arena bot eşlemesi, istemci seçicisi ve TR/EN ad/açıklamalar güncellendi. Savunmacı ve Saldırgan desteleri de kaynak denge kararlarıyla eşlendi.
2. `[x]` Tur 14: Seviye 1 Çekirdek enerji üretimi **5,5 → 9/sn**, Batarya üretimi **3 → 4,5/sn**; Batarya tanımı ve iki dilde kart açıklaması aynı değere getirildi. 120 arena botunun sürümlenmiş deste tanımı (`arena_bot_profiles_v1.json`) ve açıklama belgesi eşlendi. Bu dosya statik oyun içeriğidir, oyuncu kaydı değildir.
3. `[x]` Savaş kartında eski enerji yok etiketinin `::after` seçicisi CAN barını yerinden oynatıyordu. Etiket savaş kartından dışlandı; CAN barının konum/kutu değerleri sabitlendi. Isı barına dokunulmadı.
4. `[x]` Kanonik tasarım ve yol haritası yeni değer/arketiplere güncellendi; ilgili Python/istemci test beklentileri taşındı, **çalıştırılmadı**. Kullanıcının önceki isteğiyle kaldırılan, çalışma akışında bağlantısı olmayan `tools/bot_balance_sim.py` **yeniden eklenmedi**.

Kalan: sunucu yeniden başlatıldığında ve kullanıcı denemesinde yeni enerji/CAN barı davranışı görülmeli. Bu aktarımda oyun, test, derleme, tarayıcı, ödeme, migration ve bot simülasyonu çalıştırılmadı. Önceki paketlerin yayın/doğrulama sınırları aşağıda geçerlidir.

## Aktif paket — GRIDSHARD2.1 tur 10–12 seçici aktarımı (29 Eylül 2026)

Kaynak `D:\Projects\GRIDSHARD2.1` ayrı bir Git dalı değil, dosya anlık görüntüsüdür. Hedef çalışma ağacı aktarım başında temizdi. Kaynak dizin, canlı `server/data` kayıtları, sırlar ve hedefin yerelleştirme/analitik altyapısı ezilmedi. Kullanıcı önceki “yalnız kilitli önizleme” kararını bu aktarım için açıkça değiştirdi: **ödeme akışı da alınacak**. Gerçek satın alma veya reklam izleme denenmedi.

1. `[x]` Savaş motorunun ısı/akım paketi: modeller, enerji kuyruğu, soğutucu/destek, saldırı/sabotaj, AI, PvP oturumu ve ilgili katalog açıklamaları kaynakla birleştirildi. Isı 0–100 ölçeğinde; eşikler ve Çekirdek üretimi kod kaynağından alındı (kaynak checkpoint'indeki bazı sayısal özetler kodla aynı değildi). İstemci ısı göstergesi, savaş müziği evreleri, ses geçişleri ve perspektif ayarı eklendi. Isı senaryosu beklentileri güncellendi; test çalıştırılmadı.
2. `[x]` Mağaza/ödeme altyapısı: Play Billing ve App Store makbuz doğrulama, sunucu makbuz defteri, iade bildirimleri, AdMob SSV, istemci native satın alma/kurtarma köprüsü, sağlayıcı ortam ayarları ve bağımlılık kilidi taşındı. Kaynaktaki mağaza doğrulama testi eklendi fakat çalıştırılmadı. **Gerçek ödeme hazır veya etkin sayılmaz:** sağlayıcı anahtarları, ürün kimlikleri, native Android/iOS projeleri, mağaza sunucusu bildirimleri ve cihaz/iadelerle doğrulama gerekir. Geliştirme/test bayrakları üretim makbuzu yerine kullanılmamalı.
3. `[x]` Yenilenmiş ilk maç eğitimi ve yeni savaş performansı örnekleyicisi, cihaz kanıtı/yayın bütçesi kapısı eklendi. Ayrıntılı FPS/bellek/DOM özeti yalnız yerel `window.__GRIDSHARD_PERF` kanıtındadır; hedefin varsayılan kapalı, 30 gün saklanan, kaba FPS kategorili rızaya bağlı ürün analitiği korundu. Kaynaktaki varsayılan açık ve ayrıntılı telemetri gönderimi **bilinçli olarak alınmadı**. İstemci `/telemetry/` istekleri de kimlik belirteciyle gider. Kaynaktaki bağımsız `tools/bot_balance_sim.py` aracı önce eklendi, fakat başka bir bağlantısı olmadığı için kullanıcı isteğiyle kaldırıldı.
4. `[x]` Hedefteki `i18n-catalog.js` köprüsü, `/analytics/*` hakları, kişisel veri dışa aktarımı/silme ve üretim paketinin varlık izin listesi/test kancası engeli korundu. Kaynaktaki gerekli yeni TR/EN metinleri seçici taşındı. Kaynak checkpoint dosyası hedefe kopyalanmadı; önceki açık görevler aşağıda geçerlidir.
5. `[~]` Statik inceleme: değişen JS dosyaları `node --check`, Python dosyaları AST ve `git diff --check` ile kontrol edildi. `tools/check_imports.py` 366 dosyada 24 eski/ayrı kanondan kalan içe aktarım sorunu gösteriyor; kaynağın temizlenmiş küçük dosya kümesinde 0 sorun var. Hedefteki eski test/rapor araçları özellikle `topology`, `laboratory`, eski `MODULE_INTERACTION_UNLOCK_MS` gibi kaldırılmış yüzeyleri hâlâ anıyor. **Otomatik test, derleme, sunucu, tarayıcı, cihaz, canlı ödeme/reklam ve migration çalıştırılmadı**; kullanıcı denemeleri kendisi yapacak. Bu nedenle aktarım yayın adayı olarak işaretlenmemeli.

Sonraki güvenli işler: eski test/rapor araçlarını güncel motor sözleşmesine ayırarak temizle; yerelleştirme/analitik kararlarının gerçek ekranda sürüp sürmediğini doğrula; sağlayıcı/natif kimlik bilgileri hazır olduğunda gerçek cihazda satın alma, iade ve SSV uçtan uca denemelerini kullanıcı koordinesinde yap. Tek tıkla otomatik modül yerleştirme kararı değişmedi.

## Aktif paket — Beta.78 GRIDSHARD2.1 kaynak aktarımı (28 Eylül 2026)

Kaynak: `D:\Projects\GRIDSHARD2.1` (Git deposu değil), hedef: bu Git deposu. Kaynak Beta.72 tur 9 durumunda ve kendi checkpoint'inde **yarım** işaretli. Hedef aktarım öncesinde temizdi. Kullanıcının "farklarımızı bul ve aktar" isteğiyle kaynakta daha yeni olan oyun/istemci kararları hedefe taşındı; kaynak çalışma dizini değiştirilmedi.

1. `[x]` Yeni kanon ve işlevler: kaynak `client/src`, `server/app`, ilgili testler ve araçlar, E2E kaynakları, istemci giriş sayfası, paket sürümü ve seçili yapılandırma dosyaları aktarıldı. 36 modül + Çekirdek, 15 hücre/otomatik yerleştirme, dört haftalık yarışma döngüsü, takım turnuvası, sosyal arayüz, günlük meta çarkı, mağaza/ödül denemesi ve güncel ses hattı kaynakla eşlendi. Kaynağın belgeleri ve `server/json_migrations` betikleri eklendi. Kanonik `server/data/arena_progression_v1.json` eşlendi.
2. `[x]` Eski ve yeni sesleri ayır: 27 sesin OGG/AAC türevleri ve manifest aktarıldı; kaynakta bulunmayan 10 v10/jeneratör türevi ve `generator_move.wav` kaldırıldı. Laboratuvar, topoloji/güçlendirici motor dosyaları ve bunları kullanan iki eski E2E akışı kaldırıldı. Silinen dosyalar Git geçmişinden geri alınabilir.
3. `[x]` Canlı veri sınırı: oyuncu, kimlik, takım, platform durumu, telemetri, imza anahtarı, sır dosyaları ve şema yan dosyaları **aktarılmadı / değiştirilmedi**. Kaynak ve hedefteki bu dosyalar farklı; hiçbir çalışma zamanı kaydı kaynakla ezilmemeli. PostgreSQL SQL migration dosyaları içerik olarak zaten aynıydı.
4. `[x]` Statik denetim: 366 Python dosyası AST ile ayrıştırıldı; istemci/araç JS dosyaları `node --check` ile geçti; sunucunun göreli içe aktarımlarında eksik dosya bulunmadı; HTML'nin 21 yerel referansı mevcut; 54 ses türevi manifest boyutlarıyla eşleşiyor; `git diff --check` temiz. Kullanıcının önceki sınırı korunarak **test, derleme, sunucu, tarayıcı, gerçek cihaz, migration ve ödeme/reklam akışı çalıştırılmadı**.

### Aktarım sonrası zorunlu uyum işleri

- `[~]` Beta.77 yerelleştirme köprüsü kodda yeniden bağlandı: `i18n-catalog.js` kaynak sözlükten önce yükleniyor; `t`, `formatNumber`, `formatDate` ve eksik düz metin çevirileri fallback olarak çalışacak biçimde eklendi. Devre Yolu'nun yalnız Türkçe gelen ödülleri İngilizcede ödül yükünden oluşturuluyor; aşama ve ödül etiketleri, yerel sayı biçimi ve dil değişiminde açık günlük meta penceresi yenileniyor. Kart koleksiyonu seçili dile göre sıralanıyor. Köprü için yeni sözleşme testi yazıldı; **çalıştırılmadı**. Eski hedefteki bütün ekran/erişilebilirlik metinlerinin birebir eşdeğeri henüz denetlenmedi; HTTP hata `code` sözleşmesi kaynak Beta.72 istemcisine taşınmadı. TR→EN→TR, ödül, sandık, savaş, dar mobil ekran ve ekran okuyucu akışı gerçek doğrulama bekler. **Beta.77 tamamen bitti sayılmamalı.**
- `[~]` Rızaya bağlı ürün analitiği kodu yeni sunucu/istemciye yeniden bağlandı: ayar varsayılan kapalı; sunucu her olayda kayıtlı izni denetler, opt-out ve hesap silmede kayıtları temizler, kişisel dışa aktarım ve `/analytics/*` uçları geri geldi. Savaş sonucu yalnız sunucudan; istemci yalnız izinli oturum/ekran/eşleştirme/kaba FPS kategorileri gönderir. Saatlik 30 gün temizliği korunur. İstemci ayar kutusu ve TR/EN açıklaması eklendi. **Test/gerçek akış çalıştırılmadı**; rıza→olay→silme→dışa aktarma ve sunucu yeniden başlatma kanıtı yayın öncesi gerekir. Hukuki/gizlilik metni ayrıca ürün sahibi tarafından onaylanmalı.
- `[~]` Eski tarayıcı senaryolarında seçici uyumu yenilendi: `menu-navigation` güncel alt gezintiyi, `mobile-battle` ana ekrandaki `SAVAŞ` → 15+15 hücre / aynı görünüm / sunucunun tek dokunuşlu yerleştirmesini, `battle-density` dikey arena düzenini izliyor. `beta381-battle-events` kısayolu artık kaldırılmış `Oyna` girişine bağımlı değil; geliştirme kısayolu savaş ekranını kendisi açıyor. `tools/browser_e2e.py` kaldırılmış 18 kart/hızlı loadout yerine 6 kartlık hızlı yerel savaş kullanıyor; `e2e/real-device-browserstack.js` de yeni ana ekran ve otomatik yerleştirmeyi izliyor. Playwright proje listesinde olmayan dosya adları çıkarıldı. **Bu E2E'lerin hiçbiri çalıştırılmadı; özellikle mobil gerçek cihaz ve eski test/denge modülleri ayrıca incelenmeli.** Kaynak checkpoint'inin tur 8(b) E2E `SAVAŞ` rotası kodda kısmen kapandı; tarayıcı/cihaz kanıtı olmadan tamamlandı sayılmamalı.
- `[~]` Kaynak Beta.72 tur 9: mağaza istemci sözleşme testi `client/tests/beta78-store-ui-contract.test.js` olarak yazıldı, **çalıştırılmadı**. Tur 10–12 aktarımında gerçek Play Billing / StoreKit makbuz doğrulaması, AdMob SSV ve iade/iptal kodu eklendi; sağlayıcı/natif yapılandırması ve gerçek cihaz doğrulaması hâlâ açık. `docs/STORE_PURCHASES.md` güncellendi; gerçek ödeme/reklam **yayına hazır değil**.
- `[ ]` Statik kontrollerden sonra izole testler ve üretim derlemesi için kullanıcı izni/uygun ortamla doğrulama yapılmalı; testler çalışmadan aktarım yayın adayı sayılmaz.

Beta.78 devam turu statik denetimi: değişen JS dosyaları `node --check`, değişen Python dosyaları AST ve `git diff --check` geçti. `pyflakes` bu iş bilgisayarının Python ortamında kurulu olmadığından çalıştırılamadı. Önceki kullanıcı sınırı gereği test, derleme, sunucu, tarayıcı ve migration çalıştırılmadı. `server/data/platform_state.json` bu tur içinde dış çalışma zamanı tarafından değişmiş görünüyor; **dokunulmadı**, geri alınmamalı. Sonraki güvenli iş: güncellenen E2E akışlarının yetkili/izole ortamda denenmesi, kalan eski test/denge modüllerinin kanon karşılaştırması ve gerçek sağlayıcı kurulumu.

Bu devam turunda yeni mağaza sözleşme testi ve değişen istemci/E2E/Playwright JS dosyaları `node --check`, `tools/browser_e2e.py` Python AST ile, çalışma ağacının izlenen farkları `git diff --check` ile statik denetlendi. Test dosyalarının kendisi, Playwright, gerçek tarayıcı/cihaz ve ödeme/reklam çalıştırılmadı.

## Aktif paket — Beta.77 Türkçe/İngilizce yerelleştirme denetimi

Kullanıcı yerelleştirme çalışmalarının yarım kaldığını belirtti; Beta.75'in tamamlandı işareti gerçek ekran doğrulaması olmadan kesin kabul edilmiyor.

1. `[x]` Kaynak ve sözlük taramasında bulunan dinamik açıkları gider
   - `client/index.html` görünen metinleri ile `aria-label`/`title`/`placeholder` değerleri ve istemcideki sabit Türkçe dizgeler sözlükle statik karşılaştırıldı. Sabit HTML'de yeni sözlük açığı bulunmadı; sabit anahtar kullanımlarında eksik mesaj anahtarı bulunmadı.
   - Devre Yolu arena/lig ödül düğümleri sunucudan çoğunlukla yalnız `description_tr` aldığından, İngilizce görünümde ödül yükünden miktarları, hedef modül parçalarını, sandıkları ve çoklu ödülleri üreten yerel açıklama eklendi. Lig adında sunucunun `name_en` alanı kullanılıyor.
   - Sandık açılış/ödül başlıkları, alınan sandığın hazır açıklaması, maç sonu modül/Çekirdek adları, savaş kartı/emoji erişilebilirlik etiketleri, arkadaş mesajı boş durumu, hazır havuz boş özeti/seçeneği ve eşleştirme iptali seçili dile bağlandı. Modül/havuz listeleri seçili dildeki adla sıralanıyor.
   - Dil değişiminde ana ekran, modül ve Çekirdek koleksiyonu ile açık günlük meta penceresi yeniden çiziliyor. Yeni çeviri anahtarları için regresyon beklentileri eklendi.
2. `[~]` Tamamlanma kapısı
   - Kullanıcının önceki doğrulama sınırı nedeniyle test, derleme, sunucu, tarayıcı veya cihaz çalıştırılmadı; yalnız statik kaynak/diff denetimi yapıldı. TR→EN→TR gerçek ekran geçişi, Devre Yolu ödülleri, savaş/sandık durumları, dar mobil görünüm ve sunucu kaynaklı nadir açıklamalar kullanıcı onaylı uçtan uca doğrulama bekliyor. Bu yapılmadan yerelleştirme işi tamamlandı olarak işaretlenmemeli.

## Aktif paket — Beta.76 FCM/APNs mobil bildirim teslimi

İş bilgisayarından devam: kayıtlı son yönlendirme olan gerçek push gönderim paketi ele alındı. Beta.75 yerelleştirme notları ve önceki mobil/otomatik yerleştirme kararları korundu.

1. `[x]` Gerçek gönderici ve kalıcı kuyruk kodu
   - Android FCM HTTP v1 / hizmet hesabı OAuth ve iOS APNs HTTP/2 / ES256 adaptörleri ayrı `push_delivery.py` dosyasında. Varsayılan kapalı; yalnız `GRIDSHARD_PUSH_ENABLED=1` ve doğrulanan sağlayıcı ayarıyla etkinleşir. Sahte başarı veya eski `GRIDSHARD_PUSH_PROVIDER` bayrağıyla hazır görünümü yok.
   - `push_outbox.py`, platform hesabında bildirimle aynı atomik yazıda iş kaydeder; yeniden başlatma, süreli claim/lease, en çok 6 deneme, Retry-After/üstel gecikme/jitter, sağlayıcı beklemesi ve 24 saatlik süre sınırı uygular. Gönderim savaş tick'inden ve veri kilidinden ayrı thread'de yapılır.
   - Tüm platform JSON işlemleri thread + OS dosya kilidi altında korunur. Yerel ortak dosyayı paylaşan worker'lar aynı işi birlikte claim etmez; bağımsız makinelerde farklı JSON kopyalarıyla dağıtık outbox garantisi verilmez. Kabul sonrası bağlantı/süreç kaybında tekrar teslim mümkün; `accepted` cihazda görüldü anlamına gelmez.
2. `[x]` Mobil kayıt, token yenileme ve iptal bağlantısı
   - Capacitor push plugin 8.1.2 bağımlılığı ve kilit dosyası eklendi. `native-push.js`: açık kullanıcı izni, tek dinleyici kurulumu, başlangıç/öne dönüşte token yenileme, kayıt hatası, çevrimdışı iptali yeniden iletme ve bildirimden doğru hesaptaki güvenli profil/mesaj ekranını açma.
   - Ayarlarda bu cihaz için kapatma düğmesi; izin/token yanıtı geç gelince iptal geri alınmaz. POST/DELETE, Bearer sahipliği yanında mevcut cihaz oturumunu denetler. Aynı tokenın hesap değişimi, cihaz iptali, hesap silme, engellenen oyuncu ve 30 günlük eski abonelikler kuyrukta gözetilir. Geçersiz eski token yanıtı yenilenmiş tokenı silemez.
   - Türkçe/İngilizce arayüz metinleri, üretim HTTP/2 bağımlılığı, ortam örneği/Compose aktarımı ve sır dosyası ignore kuralları güncellendi. Oyun savaş/ödül/kupa hesabına dokunulmadı.
3. `[~]` Canlı mobil teslimi etkinleştir ve cihazda doğrula
   - **Hâlâ bekliyor:** gerçek Firebase hizmet hesabı, APNs key/team/topic/ortam değerleri, kalıcı native paket kimliği, Android Firebase dosyası ve iOS capability/provisioning/registration callback'leri. Depoda Android/iOS projeleri henüz yok; bu adımlar uygulanmış sayılmadı. Anahtarları sohbete veya repoya koyma; sunucuya secret olarak bağla.
   - Ayar, native kurulum, veri/teslim sınırları ve yayın kontrol listesi `docs/PUSH_NOTIFICATIONS.md` içinde. Mevcut olaylar DM ve davet kabulü; yeni maç/etkinlik hatırlatma zamanlayıcısı bu pakette yok. LAN tarayıcısı Web Push kapsamına alınmadı.

Doğrulama sınırı: Kullanıcının önceki tercihi korundu; test, derleme, sunucu, tarayıcı, oyun, migration ve gerçek bildirim gönderimi çalıştırılmadı. İzole gönderici/kuyruk/mobil yaşam döngüsü testleri yazıldı; çalıştırılmadı. Yalnız bağımlılık kilidi `--lockfile-only --ignore-scripts` ile güncellendi ve kod/diff statik incelendi. Gerçek `server/data` kayıtlarına dokunulmadı. Canlı teslim tamamlandı diye işaretlenmedi.

Sonraki adım: Sağlayıcı/native bilgiler hazırsa yukarıdaki kurulum ve izinli gerçek cihaz doğrulaması; bunlar hazır değilse Son Öneriler bakım kuyruğu 13'te kalan ekran/rota modülerleştirmesi, ardından 15'te CSS sahipliği. Gerçek cihaz FPS/portre doğrulaması kullanıcıda bekler. Tek dokunuşta sunucunun otomatik modül yerleştirmesi değişmez.

## Önceki paket — Beta.74 JSON dosya şema geçişleri

1. `[x]` Yedi JSON deposunu ortak sürüm sözleşmesine bağla
   - Kimlik, platform, oyuncu, telemetri, hazır deste, denge taslağı ve takım depoları ortak şema kaydını okumadan veri okumaz/yazmaz. Şemasız eski dosya sürüm 0 olarak okunabilir; bilinmeyen/bozuk sürüm ve değiştirilmiş migration günlüğü reddedilir.
   - Nesne ve liste köklü dosyaların mevcut biçimi korunur. Sürüm 1, veri dosyasını yeniden yazmayan güvenli benimseme adımıdır. Sürüm ve SHA-256 zincirli ileri/geri günlük `<dosya>.schema.json` içinde birlikte atomik yazılır; mevcut verinin birebir migration yedeği ayrıca tutulur.
2. `[x]` Bakım ve dağıtım kapısını ekle
   - `tools/json_schema_migrate.py status/check/up/down` etkin JSON yollarını aynı sunucu ortam değişkenlerinden çözer. Çoklu `up` önce bütün depoları okur/doğrular, sonra idempotent uygular. `check` bekleyen migration için sıfır olmayan çıkış verir. PostgreSQL etkinse kimlik/oyuncu dosyaları atlanır, kalan JSON depoları yönetilir.
   - Üretim başlangıcı etkin JSON depolarında bekleyen migration varsa durur. `down` tek depo ve açık `--allow-destructive` ister; yalnız şema sürümünü geri alır, arada kazanılan oyuncu ilerlemesini eski yedekle ezmez.
   - Bakım sırası, sunucuyu durdurma zorunluluğu, bağımsız yedek, komutlar ve geri alma sınırı `docs/JSON_SCHEMA_MIGRATIONS.md` dosyasında açıklandı. İzole fixture senaryoları için sözleşme testleri yazıldı.

Doğrulama sınırı: Kullanıcının önceki tercihi gereği otomatik test, sunucu veya migration komutu çalıştırılmadı. Gerçek `server/data` dosyaları ve özellikle önceden değişmiş `platform_state.json` korunmuştur; üretimden önce operatörün sunucuyu durdurup `up` ve `check` çalıştırması gerekir. Bu turdaki v1 benimsemesi veri içeriğini değiştirmez.

Devam durumu: Son Öneriler kuyruğundaki FCM/APNs gönderim kodu Beta.76'da eklendi; canlı sağlayıcı/native kurulum ve cihaz kanıtı hâlâ bekliyor. Gerçek cihaz performans/FPS ve portre doğrulaması kullanıcı tarafında bekliyor; tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

## Aktif paket — Beta.73 mobil ses ve savaş müziği

1. `[x]` Kullanılan sesleri OGG/AAC biçimlerine dönüştür
   - 28 ses kimliği için OGG Vorbis ve AAC-LC türevleri `client/assets/audio/mobile/` altında manifest, boyut ve SHA-256 özetleriyle hazırlandı. WAV asılları korundu. Dört savaş durumu için yedi gövdeden ayrı 32 saniyelik yedek miks üretildi.
   - Karşılaştırılan toplam asıl/miks WAV boyutu 39.462.044 bayt; OGG 2.332.148, AAC 6.058.878 bayt. Kaynaklar tekrar `pnpm assets:audio` ile üretilebilir; araç FFmpeg gerektirir. Normal derleme hazır dosyaları kullanır.
2. `[x]` Savaş müziği katmanlarını ve durum geçişlerini aç
   - `GRIDSHARD_BATTLE_MUSIC_ENABLED` açık. Web Audio'da yedi gövde hazırlanıp aynı ses saatiyle başlar; giriş, normal savaş, baskı ve kritik Çekirdek durumları ayrı miks oranları kullanır. Web Audio yoksa her durumun kendi sıkıştırılmış ön miksi çalınır.
   - İstemci savaş süresi, baskı ve yerel/çevrimiçi Çekirdek CAN durumunu ses yöneticisine geçirir. SFX, menü ve sonuç sesleri de sıkıştırılmış biçimlerden yüklenir; desteklenen biçim oynatılamazsa diğer biçim denenir.
3. `[x]` Üretim paketini WAV'sız ve doğrulanır tut
   - Web/mobil derleme ses manifestindeki 28 kimliğin iki biçimini dosya boyutu ve SHA-256 ile denetler; WAV asıllarını `dist/` altına kopyalamaz. Yeniden üretme ve cihazda dinleme sınırları `docs/MOBILE_AUDIO.md` ve mobil yayın belgesine yazıldı.

Doğrulama sınırı: Varlık dönüştürme işlemi tamamlandı ve manifest üretildi. Kullanıcının önceki talebi gereği otomatik test, derleme, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Gerçek Android/iPhone ses çalma, senkronizasyon ve geçiş sonucu kullanıcı doğrulamasında bekliyor. `server/data/platform_state.json` içindeki çalışma zamanı değişikliklerine dokunulmadı.

Devam durumu: JSON depoları için ortak dosya şema sürümü ve geri alınabilir migration günlüğü Beta.74'te tamamlandı. Gerçek cihaz/oynanış görevleri kullanıcı doğrulamasında kalır; tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

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

Devam durumu: WAV→OGG/AAC dönüşümü ve savaş müzik katmanları Beta.73'te tamamlandı; ardından JSON migration günlüğü açık. Gerçek cihaz/oynanış doğrulaması kullanıcıda kalır. Tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

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

Devam durumu: Üretim istemci derleme hattının kodu Beta.72'de, mobil ses dönüşümü/müzik katmanları Beta.73'te tamamlandı. Portre kilidinin cihaz doğrulaması ile mevcut yinelenen adların değiştirilmesi kullanıcı tarafında bekliyor.

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

6. `[x]` Savaş seslerini mobil biçimlere dönüştür ve müzik katmanlarını etkinleştir
   - Beta.73: kullanılan 28 ses OGG/AAC türevleriyle manifestlendi, üretim paketi WAV'ları dışlıyor. Savaş katmanları açık; dört savaş durumu ayrı miks ve ayrı yedek ses kullanıyor. Gerçek cihazda dinleme ayrıca bekliyor.
7. `[~]` Dikey ekran kilidini yerel mobil kabuğa ekle
   - CSS medya sorgusuna ek olarak Capacitor/Android/iOS yapılandırmasında portrait orientation kilidi tanımlanmalı.
   - `[x]` Beta.71: Android MainActivity ve iOS Info.plist için portre yapılandırıcısı mobil add/sync akışına bağlandı; beklenmeyen şablonda sessiz başarı vermez.
   - `[ ]` Gerçek paket kimliğiyle yerel projeleri üretme ve cihazda dönüş/güvenli alan doğrulaması bekliyor. Mevcut depoda native projeler yok.
8. `[ ]` Gerçek cihaz performans bütçesi ve FPS ölçümü oluştur
   - Düşük/orta seviye cihazlarda savaş DOM güncellemeleri, efekt yoğunluğu, bellek ve kare süresi kaydedilmeli; kabul eşikleri release check'e bağlanmalı.
9. `[x]` JSON/PostgreSQL şema geçişlerini sürümlü migration sistemine taşı
   - Üretim veri değişiklikleri için Alembic benzeri ileri/geri migration, şema sürümü ve dağıtım öncesi kontrol eklenmeli.
   - `[x]` PostgreSQL numaralı migration, checksum, advisory lock, status/check/up ve onaylı down akışı tamamlandı.
   - `[x]` Beta.74: JSON depolarında ortak yan dosya sürümü, SHA-256 zincirli ileri/geri günlük, birebir veri yedeği, status/check/up/down ve üretim başlangıç kapısı tamamlandı. Gerçek veride `up` bu turda çalıştırılmadı; bakım penceresinde operatör adımı bekliyor.
10. `[~]` Gerçek FCM/APNs gönderim adaptörlerini tamamla
   - `[x]` Beta.76: FCM/APNs gönderici, kalıcı outbox/lease, retry/expiry, token yenileme ve güvenli hata temizliği, cihaz/hesap iptali, mobil plugin/izin/kapatma/deep-link bağlantısı eklendi. Sözleşme testleri yazıldı fakat kullanıcı tercihiyle çalıştırılmadı.
   - `[ ]` Gerçek sağlayıcı anahtarları, Firebase dosyası, imzalı native yapılandırma ve Android/iPhone teslim kanıtı bekliyor; `docs/PUSH_NOTIFICATIONS.md` izlenmeli. Yalnız kodun bulunması canlı teslimin tamamlandığı anlamına gelmez.
11. `[x]` CI iş akışlarını sürüm kontrolüne al
   - `.github/` genel ignore kapsamından çıkarılmalı; istemci, sunucu ve paketleme doğrulamaları için gerçek workflow dosyaları eklenmeli.
   - Beta.72: mevcut dosyanın Git tarafından hâlâ yok sayıldığı saptanıp workflow YAML istisnaları düzeltildi; üretim web paketi ve artifact adımları eklendi. Uzak CI çalıştırılmadı.
12. `[x]` Test bağımlılığındaki `httpx2` paketini doğrula ve gereksizse kaldır
   - `server/requirements-test.txt` içindeki `httpx` yanında bulunan `httpx2>=2.4,<3.0` kaynağı ve kullanımı doğrulanmalı.

### Bakım kuyruğu

13. `[~]` Büyük istemci ve sunucu dosyalarını alan modüllerine böl
   - `client/src/app.js` ve `server/app/main.py` ekran/rota alanlarına ayrılmalı; davranış önce sözleşme testleriyle sabitlenmeli.
   - Beta.71: kart sürükleme, ad normalleştirme/benzersizlik ve kişisel dışa aktarım ayrı alan modüllerine alındı. Büyük dosyaların kalan ekran/rota ayrıştırması henüz yapılmadı.
   - Beta.76: native bildirim yaşam döngüsü, sunucu göndericisi, kuyruk ve platform dosya kilidi ayrı modüllere alındı; mevcut sosyal/hesap rotalarının genel ayrıştırması açık.
14. `[x]` Üretim istemci derleme hattı kur
   - Beta.72: ortak web/mobil JS-CSS paketleme, küçültme, SHA-256 dosya adları, otomatik HTML güncellemesi, üretim önbelleği, Docker derleme katmanı ve CI artifact'i eklendi.
   - Kullanıcının talebiyle derleme/test çalıştırılmadı; kod uygulaması tamamlandı, CI/gerçek cihaz yayın doğrulaması bekliyor. İşletim ayrıntıları `docs/CLIENT_BUILD.md` içinde.
15. `[ ]` `canon.css` ve `styles.css` sahipliğini uzlaştır
   - Tekrarlanan kurallar ve yüksek sayıdaki `!important` kullanımı ekran bazında azaltılmalı; görsel regresyon testleriyle korunmalı.
16. `[~]` Türkçe/İngilizce yerelleştirmeyi tamamla
   - Beta.73: ana HTML ve istemcideki doğrudan Türkçe metinler genişletilmiş İngilizce sözlüğe alındı; çoğul, sayı, tarih ve hata mesajı için anahtarlı API eklendi; dil değişiminde özgün metni koruyan geri dönüş ve önemli ödül/ayar akışlarında anahtarlı kullanım eklendi. `docs/LOCALIZATION_AND_PRODUCT_ANALYTICS.md` sözleşmesi yazıldı.
   - Beta.74: `app.js` içindeki oyuncuya görünen değişkenli metinler, savaş/ödül/profil/havuz özetleri ve yönetici/beta durum metinleri TR/EN sabit anahtarlara taşındı; dil değişiminde ilgili paneller yeniden çiziliyor. HTTP hata yanıtlarına dil bağımsız `code` eklendi, istemci hata metnini `detail` yerine koddan seçiyor; savaş yerleştirme uyarısı da metin aramıyor. Dinamik HTML içine sunucu/oyuncu metni koyan birkaç alan güvenli metin düğümlerine çevrildi. Kullanıcının isteğiyle test/derleme çalıştırılmadı.
   - Beta.75: Profil ve herkese açık profil, kozmetikler, günlük/sezon ödülleri, etkinlikler, takım alt sekmeleri ile modül/çekirdek ve laboratuvar bilgi/önizleme panellerindeki kalan dinamik sabitler TR/EN anahtarlara taşındı. Sezon/görev/modül/yetenek/çekirdek/arena/laboratuvar/turnuva veri yanıtlarına İngilizce alanlar eklendi; açık bilgi pencereleri dil değişiminde yeniden çiziliyor. İlgili HTML bölümündeki çevirisiz sabit etiketler ve erişilebilirlik metinleri de sözlüğe eklendi. Kullanıcının isteğiyle test/derleme ve oyun denemesi çalıştırılmadı.
   - Beta.77: Kalan dinamik ödül ve savaş/sandık adları, dil değişiminde koleksiyon/meta yenilemesi ve dile göre sıralama ele alındı. Gerçek iki yönlü ekran/cihaz doğrulaması beklediği için bu madde yeniden açık.
17. `[x]` Ürün analitiğini mahremiyet kontrollü biçimde ekle
   - Beta.73: varsayılan kapalı sunucu onayı, ayarlardan opt-in/opt-out, opt-out ve hesap silmede ham olay temizliği, oyuncuya özel erişim/dışa aktarım, şema kısıtlı huni/savaş/retention/FPS olayları, 30 gün saklama, küçük kohort bastırmalı toplu rapor ve ayrı depo eklendi. Kullanıcı isteğiyle test/derleme çalıştırılmadı; üretim gizlilik bildirimi ürün/hukuk kontrolü bekliyor.
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
