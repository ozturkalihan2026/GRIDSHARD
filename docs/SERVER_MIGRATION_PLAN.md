# GRIDSHARD sunucu geçişi — uygulama ve doğrulama kapıları

## Güncel durum — 1 Ekim 2026

**Bu bölüm güncel karar ve ilerleme kaydıdır.** Aşağıdaki 30 Eylül veri haritası uygulama tarihçesidir; oradaki "hazırlık", "atomik değil" veya "henüz sınanmadı" ifadeleri o günkü aşamayı anlatır. Güncel kodun kaynağı ve devam sırası `CODEX_CHECKPOINT.md` üst bölümüdür; operatör komutları `SERVER_PRODUCTION_RUNBOOK.md` içindedir.

Eski oyuncu/kimlik/takım/platform/makbuz/analitik verileri **aktarılmaz**. Eski `server/data` ve Docker birimleri korunur; üretim yeni boş PostgreSQL ve runtime birimiyle başlar. `001`–`014` migration dosyaları aynı sürümün parçasıdır; checksum'ları değiştirilerek geçmiş şema düzeltilmez.

| Kapı | Yerel uygulama / kanıt | Henüz gerekli dış doğrulama |
| --- | --- | --- |
| SERVER-0 paket/sır sınırı | Gerçek runtime image build/açılışı geçti; izin listeli iki statik arena JSON'u, UID 10001, eski oyuncu/QA/anahtar/özel dosyalar dışarıda ve tek worker | Geçmişte paylaşılmış anahtarların operatör değerlendirmesi |
| SERVER-1/2/3 veri/sosyal/takım | PostgreSQL kanonik; ortak `PersistentState` unit-of-work, row lock/revision, sosyal/outbox/üyelik/bağış/silme atomik, gerçek PG commit/rollback testleri | Gerçek provider/push teslimi ve staging yükü; çok-worker desteği yok |
| SERVER-4 ekonomi | `014` oyuncu kapsamlı işlem kimliği/payload çatışması; mağaza makbuzu/bakiye/iade ortak commit | Gerçek ödeme/iade ve reklam sağlayıcısı |
| SERVER-5 sonuç | `013` pending → atomik applied; RAM kaybı/tekrar/uzun kesinti/dönem hesabı PG'de geçti | Terminal niyet öncesi süreç kaybı aktif RAM maçı keser; sıfır kayıp/HA garantisi yok |
| SERVER-6/7 koordinasyon | PostgreSQL tek-worker kilidi, gerçek Redis owner token/TTL/presence ve fail-closed testleri; Docker yeniden başlatma ve önceki iki gerçek tarayıcı PvP/reconnect 2/2 geçti | Uzak iki cihaz WSS ve süreç/servis kesinti denemesi |
| SERVER-8 kimlik/native | Dosya sırları, auth iptali, native secure-storage/recovery ve no-backup kodu/testleri | Yeni plugin'li APK, gerçek cihaz ve OAuth/mağaza hesabı |
| SERVER-9 temiz kurulum | PostgreSQL 17 + gerçek image ile boş DB/runtime, kurulum ve profil/token korunarak yeniden açılış geçti; eski kayıt içe alınmadı | Hedef Linux staging üzerinde aynı kurulum |
| SERVER-10 dağıtım | Ana/bakım image build, standalone Compose ve gerçek Caddy config doğrulaması geçti; gerçek adımlı açılış ekranı ve önceki 12/12 tarayıcı | Uzak CI, hosting/SSH/DNS, gerçek TLS ve mobil imzalı paket |
| SERVER-11 kurtarma/işletim | Gerçek PG17/bakım image'ıyla durmuş image yedeği, ayrı boş DB/runtime'a restore, aynı token/profil ile açılış geçti; worker kilidi/checksum/UUID/kayıt doğrulaması sınandı | Staging'de ayrı Compose projesine restore, dış izleme/şifreli uzak yedek/saklama; WAL/PITR kurulmadı |

Son Linux/PostgreSQL 17/Redis koşusunda **1019 sunucu/operatör testi geçti**; tek eksik rapor fixture'ı test ortamına bağlandıktan sonra ilgili küme **4/4 geçti** (1020 ayrı sözleşmenin tamamı doğrulandı; gerçek PG/Redis testleri atlanmadı). Son istemci **77/77**; gerçek Docker image istemci build ID **b20ec7c35515e357**. 67 kaldırılmış test sözleşmesinin kaynakları ve yerine geçen kanıtlar `archive/server-test-contracts-20261001/` manifestinde korunur; eski testleri aynen geçti saymıyoruz. Yeni aktif testler kaldırılmış komut/yüzeyleri reddetme ve veri değişmemesini doğrular.

CI PostgreSQL 17 + gerçek Redis + production/maintenance image + Caddy, image restore ve tarayıcı işlerini tanımlar; **uzak CI henüz çalıştırılmadı**. Yerel Docker doğrulaması tamamlandı, test kapsayıcı/ağ/yeni geçici Redis birimi temizlendi; eski dosya/birimler korundu. Sıradaki dış adım kullanıcının Linux staging sunucusu/SSH ve alan adı/DNS bilgisidir; ardından gerçek sağlayıcı/native doğrulama gelir. Bu kapılar açıkken "üretim hazır" veya "geçiş tamam" onayı verilmez.

## Tarihsel veri haritası ve aşamalar — 30 Eylül 2026

Durum: 30 Eylül 2026. **Yeni ürün kararı: temiz kurulum.** Önceki oyuncu, kimlik, takım, platform, makbuz veya analitik kayıtları yeni sunucuya **taşınmayacak**. Bu belge kod ve `Sunucu Geçişi.md` karşılaştırmasının uygulama planıdır; eski canlı JSON'ları değiştirmez, üretim hazır onayı değildir.

### Temiz kurulum sınırı

`006_clean_installation.sql` yeni veritabanında tek kurulum kimliği tutar. Üretim başlangıcı bu kimlik ilk kez yazılmadan önce oyuncu/kimlik, sosyal, platform ve mağaza tablolarının tamamının boş olduğunu doğrular; dolu ve sahiplenilmemiş bir veritabanını reddeder. Sonraki açılışlar aynı kurulum kimliğiyle sürer. Üretimde `GRIDSHARD_RUNTIME_DATA_DIR` mutlak yol olarak zorunludur ve proje kaynak ağacının dışında olmalıdır; JSON depo yolları bu dizinden kaçamaz. Ayrı veri dizini ilk açılışta boş olmalı ve veritabanı kurulum kimliğiyle eşlenen bir işaret alır. İşaret yokken dolu dizin veya başka veritabanına ait işaret reddedilir. Bu kapı hiçbir eski dosyayı silmez veya içe almaz.

`docker-compose.yml` artık `./server/data` bağını kullanmaz; yeni `gridshard-postgres-clean`, `gridshard-redis-clean` ve `gridshard-runtime-clean` adlandırılmış birimlerini kullanır. Eski birimler ve yerel JSON dosyaları yerinde kalır. Üretim yolunda platform, takım, savaş havuzu presetleri, operasyonel telemetri ve rızaya bağlı ürün analitiği `007`–`011` şemalarıyla PostgreSQL'dedir; runtime birimi yalnız kurulum işareti gibi işlem dışı dosyalar içindir. Bu **veri aktarımı değildir**: boş depoda yeni kayıtlar oluşur. Çoklu worker, tüm çapraz-kayıt atomikliği ve üretim yayını için aşağıdaki SERVER-2..11 işleri bitmeden kurulum üretim hazır sayılmaz.

Eski sosyal JSON envanteri ve `Kesici` ad çakışması artık **taşıma engeli değildir**, çünkü bu kayıtlar yeni kurulumun kapsamı dışındadır. Önceki salt okunur denetim ve hazırlık kodu tarihçe/teşhis olarak korunur; yeni sunucuya hiçbir kayıt aktarılmayacaktır.

## Mevcut kalıcılık

| Veri | Bugünkü kaynak | Üretim sınırı |
| --- | --- | --- |
| Oyuncu profil/ilerleme/istatistik/ayar ve ekonomi alanları; arkadaş kimlikleri, istekleri, bloklar ve sosyal savaş davetleri | `PostgresPlayerDataRepository` (`DATABASE_URL` varsa), aksi halde oyuncu JSON'u; `player_data` içinde `profile`, `statistics`, `settings` JSONB ve `revision` | Üretimde PostgreSQL zorunlu. `012` eski snapshot yazısını reddeder. Arkadaş isteği/kabul/ret/iptal/blok iki profili ortak transaction'da yazar; sosyal savaş davetleri ve kalan çapraz işlemler açık. |
| Cihaz kimlikleri | `PostgresIdentityRepository` veya kimlik JSON'u; `participant_identities` ve `devices` JSONB | Üretimde PostgreSQL zorunlu; JWT imza anahtarı ortam sırrı olmalı. |
| Hesap bağlantıları, DM/okundu işaretleri, bildirim, davet kodları, rapor, push outbox, mağaza makbuzları | Üretimde `PostgresPlatformService` → `platform_document` JSONB; geliştirmede eski JSON | Tek platform belgesi satır kilidiyle atomik yazılır. Arkadaşlık işlemleri blok aynasını iki profil/ilişkisel kenar/makbuzla aynı transaction'da günceller. DM-bildirim/davet kodu ve sosyal savaş/outbox çapraz işlemleri açık. |
| Takım, üye/başvuru, sohbet, modül bağışı, antrenman, turnuva | Üretimde `PostgresTeamRepository` → `team_document` JSONB, revision CAS | Modül bağışı takım isteği ve iki oyuncu profilini tek transaction'da yazar. Diğer oyuncu bakiyesi/üyelik değişiklikleri ortak transaction'da değil; çoklu worker takım işlemlerinde CAS çatışmasını yeniden deneme gerekir. |
| Battle pool presetleri | Üretimde `PostgresBattlePoolPresetRepository` → oyuncu başına satır | Geliştirmede JSON yolu kalır; gerçek PostgreSQL davranışı izole test DB'sinde doğrulanmalı. |
| Telemetri ve izinli ürün analitiği | Üretimde `telemetry_events` ve `product_analytics_document` | Ürün analitiğinde mevcut onay/opt-out/silme ve saklama politikası korunur; operasyonel olaylar sınırlandırılır. Gerçek DB ve geri yükleme testi bekliyor. |
| Aktif PvP savaşları | `PvPSessionService` belleği; Redis eşleştirme/koordinasyon | İlk üretimde tek FastAPI worker. 10 Hz simülasyon Redis/PostgreSQL'e taşınmamalı; ownership/routing ve yeniden bağlanma kuralı gerekir. |
| Statik arena kuralları/bot profilleri | `server/data/arena_progression_v1.json`, `arena_bot_profiles_v1.json` | Kaynak/Docker paketinde izinli iki `server/data` dosyası; oyuncu verisi değil. |

`server/app/main.py` üretim modunda `DATABASE_URL`, `REDIS_URL`, `GRIDSHARD_AUTH_SIGNING_KEY` ve ayrılmış `GRIDSHARD_RUNTIME_DATA_DIR` ister. Üretimde oyuncu, kimlik, platform, takım, preset, telemetri ve analitik için dosya fallback'i yoktur. `server/data` içindeki iki arena JSON'u yalnız statik oyun içeriğidir. Bu, çapraz-belge iş kurallarının tamamının atomik olduğu anlamına gelmez.

Compose dosyasındaki `gridshard-local-only` PostgreSQL parolası yalnız yerel geliştirme örneğidir; üretim modu bu değeri açılışta reddeder. Gerçek dağıtımda ayrı güçlü parola, TLS/erişim sınırları ve sır yönetimi zorunludur.

`GRIDSHARD_RUNTIME_MODE` artık yalnız `development` veya `production` kabul eder; `prod` gibi bir yazım hatası geliştirme fallback'ine sessiz geçiş yapmaz. Ortam değişkeni hiç verilmezse yerel geliştirme varsayılanı sürer; dağıtım manifesti üretim değerini açıkça vermelidir.

30 Eylül doğrulaması: kilitli istemci bağımlılıkları kurularak web paketi derlendi; üretim Python modülü, gerçek servislere bağlanmadan başarılı içe aktarıldı. Tamamen ayrı geçici PostgreSQL 16 kümesinde `012` dâhil güncel SQL göçleri ve entegrasyon testleri 5/5 geçti; profil ile platform makbuzunun ortak commit/rollback'i ve eski oyuncu sürümünün reddi gerçek DB'de görüldü. Boş DB + boş runtime dizininde kurulum kimliğinin ilk ve tekrar açılışı da geçti. Bu testler gerçek Docker image, Redis oturumu, HTTPS, mağaza sağlayıcısı, çoklu worker veya yedekten geri yükleme yerine geçmez; Docker bu makinede kurulu değildir.

Oyuncu ve kimlik repository'leri izole yerel PostgreSQL 16 kümesinde yazma/okuma ile doğrulandı. `PostgresIdentityRepository.update` artık hesabın `created_at` alanını değiştirmez. Tekrar koşulabilir test yalnız `GRIDSHARD_TEST_DATABASE_URL` verildiğinde ve adres `localhost`/`127.0.0.1` üzerindeki `/gridshard_test` veritabanı olduğunda çalışır; aksi halde atlar veya güvenlik hatası verir. Bu test sosyal/takım JSON geçişini veya çoklu işlem atomikliğini doğrulamaz.

`003_social_runtime.sql` sosyal kayıtlar için ayrı PostgreSQL tablolarını **additive** oluşturur. Üretimde arkadaşlık/istek/blok işlemleri artık profil sosyal listeleriyle birlikte ilgili ilişkisel kenarları yazar; diğer sosyal tablolar hazırlık durumundadır. Geliştirme JSON yolu sürer. `PostgresPool.open` SQL migration'larını açılışta uygular; eski SQL dosyalarının checksum'ları değiştirilmez. Eski kayıt aktarılmaz; `down` dosyası ancak bağımsız yedek ve açık yıkıcı izinle kullanılmalıdır.

`004_store_ledger.sql` mağaza makbuzu ile işlenmiş bildirim kimlikleri için hazırlık tabloları ekler. `PostgresStoreLedgerRepository` üzerinde geçmişte izole PostgreSQL testi yapıldı; bu ayrı ilişkisel defter **canlı API'ye bağlı değildir**. Temiz kurulumda mevcut API makbuzlarını `platform_document` içinde tutar. Satın alma ve iade yolları artık ortak `PostgresPool.transaction()` ile oyuncu profili ve platform belgesini tek commit/rollback'e bağlar; aynı makbuz için platform satır kilidi altında yeniden denetim yapılır. İade bildirim kimliği, iade durumu ve oyuncu değişikliği aynı işlemde kaydedilir; henüz eşleşmeyen makbuz bildirimi 503 ile yeniden denetilir. Bunun kapsamı yalnız bu mağaza akışlarıdır. Diğer ekonomi/maç/bağış yazarlarının eşzamanlı profil değişiklikleri ve gerçek sağlayıcı bildirimleri henüz uçtan uca doğrulanmadı.

### Sosyal/platform işlem sınırı ve iptal edilmiş taşıma hazırlığı

Kanonik arkadaşlık, istek ve engelleme alanları `player_data.profile.meta_progression_state` içindedir. Üretimde `main._apply_postgres_friend_operation`, istek/kabul/ret/iptal/blok/engeli kaldırma için iki profili, ilişkisel kenarları, `social_operation_receipts` kaydını ve **gerçekte kullanılan** `platform_document.accounts[*].blocked_player_ids` aynasını ortak transaction'da yazar. `platform_accounts` tablosundaki sınırlı blok kopyası runtime hesap kaynağı değildir. Platform satırı önce, oyuncular sabit kimlik sırasıyla kilitlenir; mağaza işlem sınırıyla kilit sırası aynıdır. Önkoşullar DB'den okunur, canlı profil yalnız commit sonrası revision'ıyla yüklenir. Hata tüm yazıları geri alır; bilinmeyen oyuncu varsayılan profil oluşturmak yerine 404 alır.

İstemci `request_id` değeri kimliği doğrulanmış oyuncuya göre hash ile kapsamlanır; uzun istemci kimlikleri SQL alanına taşmaz, farklı oyuncuların aynı kimliği çakışmaz. Aynı oyuncunun aynı kimliği farklı hedef/eylemde kullanması 409'dur. Makbuz tekrarı yalnız sonucu döndürür; arada verilmiş bir engeli kaldırma/ret/kabul kararını geri çevirmez. Engelleme endpointi üretimde kimliksiz istekleri 422 ile reddeder; mevcut istemci işlem kimliğini gönderir. Kabul anında iki tarafın engeli ve 100 arkadaş sınırı yeniden kontrol edilir. Bu kapsam gerçek PostgreSQL ile commit, rollback ve eşzamanlı tekrar testlerinden geçti; tüm sosyal yolların atomik olduğu anlamına gelmez.

Hedef tek işlem sözleşmesi: arkadaşlık/istek/blok ve arkadaş savaşı daveti eylemi ilgili oyuncu satırlarını sabit kimlik sırasıyla kilitler, önkoşulları kilit altında yeniden doğrular, iki profilin kenarlarını/davet kopyalarını ve normalize sosyal tabloları aynı PostgreSQL transaction'ında değiştirir. Platform hesabındaki blok aynası kaldırılana kadar aynı transaction'da güncellenir. Bildirim ve push gönderimi transaction'a bağlı dayanıklı outbox kaydıyla yazılır; dış teslim commit sonrasında yapılır. Tekrarlanan istek için kararlı operasyon kimliği/benzersiz makbuz gerekir. Davet kodu tüketimi ile arkadaş isteği de bu sınırın içinde olmalıdır. Hata/iptalde hiçbir profil veya kenar kısmen kalmamalı; oyuncu silme tüm ilgili sosyal/platform satırlarını ve outbox işlerini kapsamlı biçimde ele almalıdır. Makbuz/bakiye/iade işlemleri bunun ayrı bir SERVER-4 transaction sınırıdır.

`tools/audit_social_migration.py` önceki taşıma tasarısından kalan **salt okunur tarihsel** araçtır. Temiz kurulum akışında kullanılmaz ve hiçbir eski JSON/SQL oyuncu kaydı içe alınmaz.

Önceki salt okunur denetimde varsayılan `server/data/platform_state.json` bulunmadığı için platform kaydı açık `--platform-empty` seçimiyle boş varsayılmıştı. Hedef oyuncu JSON'unda 40 oyuncu ve iki `Kesici` adı çakışması görülmüştü. **Bu denetim artık yalnız tarihçedir:** temiz kurulum kararında bu profillerin hiçbiri yeni sunucuya taşınmaz; ad sahipliği kararı ve eski JSON uzlaştırması gerekmez. Hiçbir profil silinmedi veya yeniden adlandırılmadı.

`005_social_transactions.sql` işlem makbuzu, arkadaş savaşı daveti ve push outbox tablolarını **additive** ekler. `PostgresSocialTransactionRepository.apply_friend_operation` üretim API'sine bağlandı; `create_battle_invite` hâlâ **hazırlık kodudur**. Bu davet yazıcısının ilişkisel bildirim/outbox'ı çalışan platform teslim yolu değildir; oluşturma/kabul/ret/tamamlanma, DM-okundu/bildirim-push, davet kodu tüketimi ve hesap silmenin yeni kenar/makbuz temizliği sonraki ortak transaction kapısıdır. Yalnız arkadaşlık alt paketinin tamamlanması SERVER-2'yi kapatmaz. `005` için yıkıcı `down` dosyası yalnız bağımsız yedek ve açık veri kaybı kararıyla kullanılabilir.

30 Eylül arkadaşlık doğrulaması: odaklı sunucu kümesi 70/70, bunun içinde tamamen ayrı geçici PostgreSQL 16 kümesindeki entegrasyonlar 13/13 geçti. Yeni `test_postgres_social_api.py` üretim handler'larını gerçek DB'de çağırarak commit/rollback, tekrarlanan ve çapraz eşzamanlı istekler, işlem kimliği kapsamı, eski paketle karar canlandırmama, bilinmeyen oyuncu ve eski önbelleğe rağmen arkadaş sınırını doğrular. İstemci 68/68 ve web derlemesi de geçti. Bu, gerçek HTTP/cihaz/Redis/push/ödeme sağlayıcısı veya çoklu worker testinin yerine geçmez. Eski veri yeni kurulumun kapsamı dışındadır; hiçbir eski depo silinmedi veya içe alınmadı.

## Öncelikli uygulama sırası

### 30 Eylül devamı — canlı işlem ve sonuç defteri

`PostgresSocialRuntime` artık arkadaş savaşı/davet kodu/DM/okundu yollarını gerçek platform bildirimi ve push işleriyle aynı commit'e bağlar. Hesap silme soğuk profillerin sosyal kenarlarını, takım üyeliğini, outbox kaynaklarını ve kimliği de temizler. Hazırlık ilişkisel outbox çalışan göndericinin yerine geçirilmedi.

`PersistentState` ilk üretimdeki **tek worker** için ortak canlı profil kilidi ve SQL unit-of-work sağlar. Kilit sırası süreç → sosyal → platform → ad tekillik advisory kilidi → takım → oyunculardır. Sync handler'lar ilgili profilleri mutasyondan önce yükler; hata sonrası cache kalıcı kayda döner. Eski takım makbuzu tarihsel sonuçtur; güncel üyeliği tekrar yazma yetkisi değildir. Ağ/sağlayıcı çağrıları transaction dışında tutulur. Bütün handler türlerinin payload/idempotency ve gerçek HTTP yük kapısı henüz tamamlanmadı; çok worker desteği ilan edilmez.

`013_battle_results.sql` bitmiş savaş için değişmez terminal olgusu (simülasyon kaydı değil), `pending/applied/aborted` defteri ve katılımcı sonuçlarını ekler. Pending niyet önce commit edilir; ardından profiller, istatistikler, turnuva ayağı ve applied sonucu tek transaction'dadır. Başlangıç/bakım RAM kaybından sonra pending sonucu tekrar işler; silinmiş hesap canlandırılmaz. Applied kayıtta ayrıntılı terminal olayları kaldırılır; geçmiş özeti ve oyuncu sonucu kalır. Profil/maç sonrası API'leri RAM'den bağımsız sonuç verir. Gerçek PostgreSQL hata enjeksiyonu, RAM kaybı, tekrar teslim, çelişkili bitiş ve arkadaş/takım/haftalık hesap ayrımı sınandı. Uzun kesinti/dönem değişimi, aktif RAM savaşının süreç kaybı ve dağıtım/reconnect kapıları açıktır.

1. SERVER-0: Paket dışlama, izlenen runtime dosyaları, imza anahtarı ve sürüm bilgisini denetle. `server/data` içinde yalnız iki statik arena dosyasına izin verildi. Eski Git geçmişi ve daha önce paylaşılan paketler ayrıca incelenmeli. Docker image çalıştırma testi bu makinede Docker olmadığı için bekliyor.
2. SERVER-1: Mevcut oyuncu/kimlik PostgreSQL yolunu üretim tek kaynak olarak doğrula. Oyuncu JSONB'yi ilk sürümde normalize etmeye çalışma; tutarlılık/idempotency sınırını ayrıca belirle.
3. SERVER-2/3: Önce sosyal/platform, sonra takım için PostgreSQL repository ve şema ekle. API sözleşmelerini koru; eski JSON verisini otomatik veya sessizce silme. Outbox, makbuz ve takım işlem makbuzları benzersiz anahtarlarla tasarlanmalı.
4. SERVER-4/5: Oyuncu bakiyesi, kupa, parça, mağaza makbuzu, takım bağışı ve maç sonucunu tek transaction veya kanıtlanmış telafi/idempotency mekanizmasına al. Savaş bitişi tekrar iletilse de ödül yalnız bir kez verilmeli.
5. SERVER-6/7/8: Redis'i geçici presence/routing/limit verisi için kullan; PvP kopma/geri bağlanma ve auth/cihaz gizli verisi senaryolarını gerçek cihazda doğrula.
6. SERVER-9: Eski JSON içe alma iptal edildi. Yeni boş PostgreSQL ve ayrı boş runtime birimi kurulumu, kurulum kimliği eşleşmesi ve eski kayıtların okunmadığı doğrulanmalı. Eski `server/data` dosyalarını değiştirme; bunlar yeni dağıtıma bağlanmaz.
7. SERVER-10/11: Tek worker staging, HTTPS/WSS, gerçek sağlayıcılar, yedek/geri yükleme, izleme ve CI. Uygulama açılışında sunucu bağlanma/profil geri getirme/içerik hazır olma adımlarına bağlı özgün yükleme ekranını bu aşamada bağla. Son olarak barındırma ve alan adı seçimini kullanıcıyla yap.

Tam istemci test kümesindeki 15 tarihsel sözleşme/fixture kırığı incelenip güncel davranışa eşlendi; 30 Eylül'de `pnpm test:client` 68/68 geçti. Bu sonuç gerçek cihaz, E2E, ödeme/iade veya üretim dağıtım doğrulamasının yerini almaz.
