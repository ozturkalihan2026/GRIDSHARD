# GRIDSHARD sunucu geçişi — mevcut veri haritası ve geçiş kapıları

Durum: 30 Eylül 2026. Bu belge kod ve `Sunucu Geçişi.md` karşılaştırmasının uygulama planıdır; canlı JSON'ları taşımaz, üretim hazır onayı değildir.

## Mevcut kalıcılık

| Veri | Bugünkü kaynak | Üretim sınırı |
| --- | --- | --- |
| Oyuncu profil/ilerleme/istatistik/ayar ve ekonomi alanları; arkadaş kimlikleri, istekleri, bloklar ve sosyal savaş davetleri | `PostgresPlayerDataRepository` (`DATABASE_URL` varsa), aksi halde oyuncu JSON'u; `player_data` içinde `profile`, `statistics`, `settings` JSONB | Üretimde PostgreSQL zorunlu; ilk aşamada JSONB korunabilir. İki oyuncuyu değiştiren sosyal işlem şu an ayrı kayıt yazıyor; atomik değil. |
| Cihaz kimlikleri | `PostgresIdentityRepository` veya kimlik JSON'u; `participant_identities` ve `devices` JSONB | Üretimde PostgreSQL zorunlu; JWT imza anahtarı ortam sırrı olmalı. |
| Hesap bağlantıları, DM/okundu işaretleri, bildirim, davet kodları, rapor, push outbox, mağaza makbuzları | `PlatformService` → `platform_state.json` | Üretimde halen JSON; çoklu sunucuda ortak/atomik kaynak değil. Arkadaş/blok kimliklerinin kaynak kaydı oyuncu profilindedir; blokların ayrıca platform görünümü de tutuluyor. Sosyal tablolar ve makbuz/idempotency defteri gerekli. |
| Takım, üye/başvuru, sohbet, modül bağışı, antrenman, turnuva | `JsonTeamRepository` → `web_test_teams.json` | Üretimde halen JSON; oyuncu kaydıyla ortak transaction yok. |
| Battle pool presetleri | `JsonBattlePoolPresetRepository` → `web_test_battle_pool_presets.json` | Kullanıcıya ait taslak/preset kalıcılığı için PostgreSQL veya açıkça gerekçelendirilmiş başka üretim deposu gerekli. |
| Telemetri ve izinli ürün analitiği | `web_test_telemetry.json`, `product_analytics.json` | İzin/silme/saklama süresi denetimleri korunarak üretim depolama ve erişim sınırı seçilmeli. |
| Aktif PvP savaşları | `PvPSessionService` belleği; Redis eşleştirme/koordinasyon | İlk üretimde tek FastAPI worker. 10 Hz simülasyon Redis/PostgreSQL'e taşınmamalı; ownership/routing ve yeniden bağlanma kuralı gerekir. |
| Statik arena kuralları/bot profilleri | `server/data/arena_progression_v1.json`, `arena_bot_profiles_v1.json` | Kaynak/Docker paketinde izinli iki `server/data` dosyası; oyuncu verisi değil. |

`server/app/main.py` üretim modunda `DATABASE_URL`, `REDIS_URL` ve `GRIDSHARD_AUTH_SIGNING_KEY` ister. Bu kontrol yalnız oyuncu ve kimlik deposunun PostgreSQL'e geçmesini sağlar; platform/takım/preset/telemetri/analitik hâlâ dosya kullanır. Üretim için tüm JSON fallback'lerin çözüldüğü varsayılmamalıdır.

`GRIDSHARD_RUNTIME_MODE` artık yalnız `development` veya `production` kabul eder; `prod` gibi bir yazım hatası geliştirme fallback'ine sessiz geçiş yapmaz. Ortam değişkeni hiç verilmezse yerel geliştirme varsayılanı sürer; dağıtım manifesti üretim değerini açıkça vermelidir.

Oyuncu ve kimlik repository'leri izole yerel PostgreSQL 16 kümesinde yazma/okuma ile doğrulandı. `PostgresIdentityRepository.update` artık hesabın `created_at` alanını değiştirmez. Tekrar koşulabilir test yalnız `GRIDSHARD_TEST_DATABASE_URL` verildiğinde ve adres `localhost`/`127.0.0.1` üzerindeki `/gridshard_test` veritabanı olduğunda çalışır; aksi halde atlar veya güvenlik hatası verir. Bu test sosyal/takım JSON geçişini veya çoklu işlem atomikliğini doğrulamaz.

`003_social_runtime.sql` sosyal kayıtlar için ayrı PostgreSQL tablolarını **additive** olarak oluşturur. Eski JSON/profil yazıcıları hâlâ aktiftir: yeni tablolar boş başlar, uygulama henüz onlara geçmez. `PostgresPool.open` SQL migration'larını açılışta uyguladığı için PostgreSQL kullanan bir sonraki sunucu açılışında tablo oluşturma işlemi çalışır. Veri aktarımı ve repository anahtarlaması doğrulama olmadan yapılmayacaktır; `down` dosyası ancak bağımsız yedek ve açık yıkıcı izinle kullanılmalıdır.

`004_store_ledger.sql` mağaza makbuzu ile işlenmiş bildirim kimlikleri için **additive** tablolar ekler. `PostgresStoreLedgerRepository` makbuz anahtarı ve satın alma belirteci özetinde tekillik, ilk kaydı koruyan tekrar işleme, iade geçmişi ve bildirim tekilliği sağlar. İzole yerel PostgreSQL 16'da migration `004` ve gerçek defter testi 3/3 geçti. Bu sınıf **henüz canlı `PlatformService` veya satın alma akışına bağlanmadı**: profil bakiyesi/ürün verme ve makbuz defteri tek transaction içinde değilken bağlamak çift ödül veya eksik ödül riski doğurur. SERVER-4 atomiklik tasarımı ve SERVER-9 doğrulanmış JSON aktarımı tamamlanmadan kaynak anahtarlaması yapılmayacak. Geçici test kümesi durdurulup kaldırıldı.

## Öncelikli uygulama sırası

1. SERVER-0: Paket dışlama, izlenen runtime dosyaları, imza anahtarı ve sürüm bilgisini denetle. `server/data` içinde yalnız iki statik arena dosyasına izin verildi. Eski Git geçmişi ve daha önce paylaşılan paketler ayrıca incelenmeli. Docker image çalıştırma testi bu makinede Docker olmadığı için bekliyor.
2. SERVER-1: Mevcut oyuncu/kimlik PostgreSQL yolunu üretim tek kaynak olarak doğrula. Oyuncu JSONB'yi ilk sürümde normalize etmeye çalışma; tutarlılık/idempotency sınırını ayrıca belirle.
3. SERVER-2/3: Önce sosyal/platform, sonra takım için PostgreSQL repository ve şema ekle. API sözleşmelerini koru; eski JSON verisini otomatik veya sessizce silme. Outbox, makbuz ve takım işlem makbuzları benzersiz anahtarlarla tasarlanmalı.
4. SERVER-4/5: Oyuncu bakiyesi, kupa, parça, mağaza makbuzu, takım bağışı ve maç sonucunu tek transaction veya kanıtlanmış telafi/idempotency mekanizmasına al. Savaş bitişi tekrar iletilse de ödül yalnız bir kez verilmeli.
5. SERVER-6/7/8: Redis'i geçici presence/routing/limit verisi için kullan; PvP kopma/geri bağlanma ve auth/cihaz gizli verisi senaryolarını gerçek cihazda doğrula.
6. SERVER-9: Ayrı, salt okunur dry-run ile JSON sayım/bağlantı/çakışma denetimi, durdurulmuş sunucuda yedek, göç, yeniden sayım ve geri alma provası. Bu kapıdan önce canlı `server/data` dosyalarını değiştirme.
7. SERVER-10/11: Tek worker staging, HTTPS/WSS, gerçek sağlayıcılar, yedek/geri yükleme, izleme ve CI. Uygulama açılışında sunucu bağlanma/profil geri getirme/içerik hazır olma adımlarına bağlı özgün yükleme ekranını bu aşamada bağla. Son olarak barındırma ve alan adı seçimini kullanıcıyla yap.

Tam istemci test kümesindeki 15 tarihsel sözleşme/fixture kırığı incelenip güncel davranışa eşlendi; 30 Eylül'de `pnpm test:client` 68/68 geçti. Bu sonuç gerçek cihaz, E2E, ödeme/iade veya üretim dağıtım doğrulamasının yerini almaz.
