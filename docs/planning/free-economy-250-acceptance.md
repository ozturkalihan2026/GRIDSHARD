# 2.5.0 / ECON-02 — beş ödül kanalının uygulaması

16 Kasım 2026. Yeni para miktarları sunucu ve istemci akışlarına bağlandı.
Bu yerel dal kabulüdür; canlı sunucu geçişi S1 kapanışı/ödül teslimi sonrasıdır.
Sürüm numarası veya canlı ayar değiştirilmedi; son AAB/cihaz/yayın kabulü ayrıdır.

## Uygulanan miktarlar

| Kaynak | Yeni revision |
| --- | --- |
| Altı temel günlük emir | Toplam 105 Akı + 120 Devre Kredisi |
| Mevcut 4/6 savaş günlük emirleri | Her birine 5 Akı + 30 kredi; aktif sezonda bütün günlük emirler 115 Akı + 180 kredi |
| On iki sezonluk emir | Toplam 600 Akı + 3.000 kredi; mevcut 1.800 XP aynı |
| Giriş takvimi | Akı 3, kredi 2 katı; kaçırılan gün sonradan verilmez |
| Ücretsiz sezon yolu | Akı ve kredi 2 katı; XP, parça, kozmetik ve premium hattı aynı |
| Uygun maç sonucu | Kredi 1,5 katı; ilk 6 uygun maçta 2 Akı, en çok 12 Akı/UTC günü |

Arena 1 örneği: galibiyet 35→52, mağlubiyet 12→18 kredi. Eski Savaş Premium
hakkının çarpanı ve XP davranışı korunur; yeni ekonomi XP çarpanı eklemez.
Yeni ayrı günlük/haftalık para desteği, reklam adımı veya gerçek para ürünü yoktur.

## Yürürlük ve eski hakların korunması

`server/app/free_economy_rewards.py`, çalışma verisini yalnız sürümlü
`server/data/free_economy_rewards_v1.json` ve ödül kataloğundan okur; docs
runtime girdisi değildir. `tools/prepare_reward_definitions.py --check`
karar, katalog ve rollout verisinin tutarlılığını denetler.

- En az sunucu 2.5.0 ve açık `GRIDSHARD_FREE_ECONOMY_FROM` gerekir. Tarih saat
  dilimli, UTC gece yarısı ve S1 bitişinden önce olmayacak şekilde doğrulanır.
  Geçersiz yürürlük sunucu başlangıcında reddedilir. Örnek/Compose ayarı boştur.
- Sezon bütçesi ayrıca yayımlanmış yeni sezon manifestinde
  `free_economy_revision: 1` ister. Derlenmiş onay listesi şu anda boştur.
  Yayımlanmış S1 kimliği açıkça dışlanır; eski/başlamış dönem yeniden fiyatlanmaz.
- Yeni onaylı dönem ilk kez bağlanırken 82 giriş/yol/ek emir para tanımı
  profile sabitlenir. Bu, 82 ödül verildiği anlamına gelmez; her kazanım kendi
  gerçek koşulunu sağlamalıdır. Sezon revisionu ve tanımlar sonradan aktif
  katalogdan yeniden seçilmez. Başlamış eski profil/dönem legacy olarak kalır.
- Yeni günlük tanımlar UTC günü başında sabitlenir; gerçekten tamamlanan
  emir hakkı kazanım zamanı ve o dönemin XP bilgisiyle kaydedilir. Eski gün
  ve eski makbuz üzerine yeni miktar yazılmaz. Eski snapshotsız gün için
  geriye dönük toplu telafi yapılmaz.
- Yürürlük ayarını boşaltmak yeni günlük/maç rollout'unu ve yeni dönem
  kabulünü kapatır. Daha önce onaylanıp sabitlenmiş dönem bütçesi ile
  kazanılmış hakları iptal etmez. Sezonun açık/kapalı kapısı ayrıca korunur.
- Sezon arasında temel günlük emir ve uygun maç geliri sürer. Giriş/yol/
  sezonluk emir toplama kapalıdır; temel emir satırı kazanılmayacak XP'yi
  göstermez. Boş giriş dönemi hak anahtarı üretmez veya görünümü bozmaz.

## Tek teslim ve kalıcılık

Özel `free_economy_state`, mevcut PostgreSQL oyuncu JSON'u içinde saklanır;
public profil yanıtında dönmez. DATA-01'in değişmez hak/makbuz doğrulaması
yeniden kullanılır. Bu adım yeni SQL gerektirmez; eski SQL baytları korunur.

- Günlük/giriş/ek emir hakları hesap+kaynak+dönem+düğüm bağlamına, tam ödül
  snapshot'ına ve revision/hash'e bağlıdır. XP kazanım kaydı da hash ile doğrulanır.
  Yeni request_id aynı hakkı ikinci kez ödemez; farklı ödülde request_id tekrar
  kullanımı kalıcı ekonomik işlem defterinde reddedilir.
- Cüzdan, hak makbuzu, günlük sayaç ve API işlem makbuzu aynı mevcut oyuncu
  transaction'ında kaydedilir. Kaydetme sonrası hata tümünü geri alır;
  bellek kaybından sonra kalıcı profil yeniden yüklenir.
- Maç artışı gerçek hesap katılımcısı, kesinleşmiş ranked_pvp/arena_ai
  sonucu ve oyuncu uygunluğu ister. Pes etme/teslim olma, hareketsizlikle
  biten maç, bot/operatör ve nötr modlar yeni artışı almaz. Temel emirlerin
  eski ilerleme uygunluğu değiştirilmez.
- Maçın para tanımı ve altı maç sayacı terminal maç defteriyle aynı işlemde
  yazılır. PostgreSQL battle_id defteri tekrar oynatmayı engeller; günlük
  UTC sınırı tarih bazında tutulur. Yeni istek veya worker yeniden başlatma
  yeni kota/ikinci ödeme oluşturmaz.
- Yeni günlük kazanımları UTC devirde, ek emirler mevcut gün/sezon kapanış
  yolunda bir kez tamamlanır. Ücretsiz yolun tam kazanım snapshot'ı mevcut
  sabit kasa yoluyla kapanışta Mesaj Kutusu'na aktarılır; kuyruk sınırı hakkı silmez.
  Premium iade kökeni ve eski kasa davranışı korunur.

## İstemci ve yerel kabul

Emir satırları XP/Akı/krediyi sunucu miktarıyla gösterir. Giriş ve yol önizlemesi
aynı sabit miktarı okur. Maç sonucunda doğrudan Akı ve günlük maç sayacı için
ayrı kart vardır; kota dolunca +0 ve 6/6 görünür. Eski sunucu yanıtında yeni
kart açılmaz. Dört ödül kartı dar ekranda iki sütun kullanır.

- Tam yerel sunucu regresyonu ve gerçek PostgreSQL kabul günlükleri
  `.audit-runtime/free-economy-server-final.log` ve
  `.audit-runtime/free-economy-postgres-final.log` içindedir.
- Son sunucu regresyonu **2.103 PASS / 69 SKIP**. Dört ek kanalın gerçek
  işlem/rollback/replay kabulünü de içeren ayrı PostgreSQL koşusu **24 PASS**.
  Dış altyapı skip'leri bu sonuçla tamamlanmış sayılmaz.
- Gerçek PostgreSQL 16.14: paralel farklı talepler, aynı makbuz, cüzdan/
  işlem/maç sayacı rollback'i, yeniden yükleme, gerçek dump/restore ve UTC
  devir; geçici loopback kümesi dışında veritabanı kullanılmadı. CI PostgreSQL17
  işine test dosyası eklendi; uzak CI sonucu burada varsayılmaz.
- `e2e/free-economy.spec.js`, yalnız izole yerel fixture'da gerçek sunucu
  miktarları/claim'i ve TR/EN 320/393 px görünümünü doğrular. Dönem/oyuncu
  hazırlığı üretim API'sine eklenmez. Test yardımcısı üretim derlemesinden çıkar.
- Android Chrome öykünmesinde TR/EN × 320/393 px **4 PASS**; emir/giriş/yol/
  maç görüntüleri `test-results/free-economy-*` altında. TR320 maç ve EN393
  emir görüntüleri ayrıca gözle incelendi. İstemci sözleşmeleri 6, paketleme
  sözleşmeleri 14 testte geçti. Tarayıcı logu `.audit-runtime/free-economy-browser-final.log`.
- Ekonomi/karar/katalog/bağlı plan/paket sınırı araç sözleşmeleri **59 PASS**;
  bağlı üretici kontrolleri ve 512 dosyanın import taraması geçti. Geçici
  PostgreSQL kümesi ve tarayıcı sunucusu kapatıldı.
- Gerçek kaynaklardan web derlemesi alındı; `__GRIDSHARD_TEST_API` ve
  `previewEconomyResult` üretim JavaScript'inde bulunmadı. Bu doğrulama son
  imzalı 2.5.0 AAB veya fiziksel Android kabulü değildir.

[Beş kaynak kararı](free-economy-250-v1.json) ·
[Ortak cüzdan hesabı](free-economy-250-progression-report.md) ·
[Ödül kalıcılığı](reward-persistence-migration.md) ·
[2.5.0 briefi](releases/2.5.0.md) ·
[Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#econ-02).
