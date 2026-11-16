# 2.5.0 / DATA-01 — kalıcı ödül hakkı ve kurtarma uygulaması

16 Kasım 2026. REWARD-01'in değişmez snapshot sözleşmesi PostgreSQL'de
kalıcı bir hak defterine bağlandı. Kod dalda hazır; yeni API/ekonomi aktivasyonu
ve canlı migration yapılmadı. Oyuncuya ödül kazanma koşulunu bu katman vermez.

## Şema ve tekillik

Yeni `015_reward_entitlements.sql`, `player_reward_entitlements` tablosunu
ekler. Eski 001–014 SQL baytları korunur; mevcut profil, bakiye, sandık veya
satın alma makbuzu dönüştürülmez. Eski profillerin bu tabloda satırı olmaması normaldir.

- Hesap + kaynak + dönem + düğüm tekildir; deterministik entitlement_id aynı
  bağlamdan üretilir. Kazanılmış kayıt tanımın tam snapshot'ını, miktar/
  seçenekleri, revision/hash ve saat dilimli kazanım zamanını taşır.
- Aynı kaynak tekrar işlendiğinde eski kayıt döner; daha yeni katalog veya
  miktar eski hakkın üzerine yazılmaz. Kaynak kapansa veya aktif katalog
  değişse de earned_document kendine yeterlidir.
- İlk teslimin hesap+request_hash kaydı tekildir. Teslim zamanı, seçilen
  option_id ve tam makbuz birlikte boş veya birlikte doludur. Teslim edilmiş
  kayıt silinmez; tekrar talepleri para vermeden aynı makbuzu döndürür.
- Hesap silinince FK cascade hakkı da siler. Hakkın listesi sayfalıdır;
  sayfa sınırı bekleyen kayıtları silmez veya kalıcı olarak gizlemez.

## İşlem sırası

`PostgresRewardEntitlements` yazıları açık bir `PostgresPool.transaction()`
gerektirir. Önce player_data hesabı, sonra hak satırı kilitlenir; farklı
worker/istek/option_id yarışları aynı sıra ile işler.

1. Yetkili kaynak sunucuda snapshot üretir; earn yalnız bu sabit veriyi kaydeder.
2. Teslimde hesap sahipliği, bağlam/hash, seçeneğin sabit üçlüde bulunması ve
   daha önce kullanılmış talep kimliği doğrulanır.
3. grant callback yalnız çözümlenen sabit kaynakları alır. Cüzdanı aynı
   PostgresPool üzerinden yükler/kaydeder; farklı bağlantıda veya dış serviste
   para mutasyonu yapılmaz. Makbuz bu yazıyla aynı transaction'da tamamlanır.
4. İç savepoint, callback sonrası hata dış transaction içinde yakalansa bile
   cüzdan/teslim yazısını geri alır. Dış transaction'ın iptali de ikisini geri alır.
   Uygulama handler'ı hata sonrasında değişmiş bellek profilini bırakmaz;
   mevcut ekonomi UOW'nin yeniden yükleme davranışını kullanmalıdır.

Normal rastgele sandıklar mevcut motorlarında açılır. Bu yeni teslim yolu
fixed/choice kaynaklarını çözer; rastgele olasılık tablosunu cüzdana yazamaz.
HTTP çağrısı veya client payload'ı doğrudan earn yetkisi değildir; REWARD-02
hesap auth'u, uygun arena/havuz, gerçek kazanım ve ekonomik request defterini bağlayacak.

## Yedek, eski şema ve geri dönüş

- Yeni tablo temiz kurulum ve server_backup sayım listesine eklendi. Tam
  pg_dump zaten tabloyu kapsar; restore sayım/migration doğrulaması da kapsar.
- 014 şemasında henüz tablo yoksa backup özeti bu tabloyu eklemez. Eski yedek
  boş hedefe olduğu gibi geri yüklenir; 015 ayrıca uygulandığında boş tablo
  eklenir, eski profil/para değişmez. 015 uygulanmış görünüp tablo yoksa yedek
  kabulü durur; eksik haklar sıfır kayıt diye gizlenmez.
- 015 down dosyası, bekleyen **veya teslim edilmiş** herhangi bir satır varsa
  tabloyu düşürmez. Teslim tanıklarının silinmesi yeniden ödeme yaratabileceği
  için yalnız bekleyenleri kontrol etmek yeterli değildir.
- Kod geri dönüşü ve veri geri yükleme farklı işlemlerdir. Canlı eski yedekle
  ezilmez; yeni hak yazılmış şemayı bu kaydı bilmeyen eski koda indirgemek
  ayrıca değerlendirilir. Otomatik down/restore yoktur.

## Gerçek yerel kabul

PostgreSQL **16.14**, yalnız görev için açılmış loopback kümesi; sentetik
hesaplar. Hak deposu, mevcut PostgreSQL entegrasyonu ve yedek/restore için
**18 test PASS**, skip yok:

- 12 paralel kazanım bir hak; 12 paralel teslim bir cüzdan ödemesi.
- İki farklı seçenek yarışında yalnız biri; yabancı hesap ve başka hakka
  request_id tekrar kullanımı reddi.
- Cüzdan yazısından sonraki hata, içeride yakalanan hata ve dış transaction
  iptalinde sıfır kayıp/sıfır ikinci teslim.
- Yeni bağlantı havuzu, gerçek pg_dump/pg_restore ile boş veritabanı,
  bekleyen ve teslim edilmiş hakların aynı kalması; restore sonrası eski
  makbuz yeniden ödeme yapmıyor, bekleyen hak bir kez ödeniyor.
- Eski 014 yedeğinin restore'u ve sonra 015'e eklemeli geçiş; eski profil aynı.
- Hesap silme, bozuk içerik reddi, sayfalama ve dolu tabloda down engeli.

Yerel log `.audit-runtime/reward-entitlements-postgres-final.log`;
`tools/test-review-postgres.ps1 -TestPaths ...` taze fixture üretip sonunda
kapatır. Windows başlatıcı pg_ctl'yi gizli ayrı süreçte bekler; pytest geçici
dizini fixture içinde kalır. Gerçek üretim PostgreSQL17 kabulü burada yapılmadı;
CI'ın mevcut PostgreSQL17 işine yeni test dosyası eklendi.

Son kontrolde altı eski SQL dosyasındaki Windows checkout satır sonları,
yalnız satır sonu farkı olduğu doğrulanarak HEAD baytlarına geri yazıldı.
Eski 19 SQL dosyası HEAD ile birebir aynı; 18 PostgreSQL testi bu kanonik
dosyalarla taze kümede yeniden geçti. Ek model/temiz kurulum/transaction/
paket/plan sözleşmeleri **34 PASS**; dokuz bağlı üretici kontrolü de geçti.

Henüz yeni oyun ödülü veya seçim kasası API'si açılmadı. DATA-01 dal hazırlığı,
REWARD-02/ECON-02 entegrasyon ve son cihaz/yayın kabulü yerine geçmez.

[Ödül tanımları](reward-definitions-250-acceptance.md) ·
[2.5.0 briefi](releases/2.5.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#data-01).
