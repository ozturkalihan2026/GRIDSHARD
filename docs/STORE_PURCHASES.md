# Mağaza, ödeme ve reklam teslimi

Beta.72 kaynak projesinden aktarılan mağaza kataloğu bir **geliştirme prototipidir**. Fiyatlar ve ürün kimlikleri `server/app/store_catalog.py` içinde; satın alma ve reklam uçları `server/app/main.py` içindedir. Oyun içi sandıklar mevcut oyun paralarıyla alınır.

## Şu anki güvenlik sınırı

- `test` sağlayıcısı yalnız üretim dışı denemeler içindir. `GRIDSHARD_PURCHASE_TEST_MODE` ve `GRIDSHARD_AD_TEST_MODE` üretim ortamında varsayılan olarak kapalıdır; üretimde açılmamalıdır.
- `google_play` ve `app_store` istekleri doğrulama eksikliği nedeniyle reddedilir. Gerçek ödeme alınmaz, ürün teslim edilmez.
- Deneme reklamı 5 saniyelik istemci akışıdır; gerçek gösterim veya sunucu tarafı doğrulama (SSV) değildir.
- İşlem kimliğiyle tekrar teslimi önleyen kayıt vardır. Bu, gerçek mağaza makbuzu doğrulamasının yerini tutmaz.

## Yayın öncesi zorunlu işler

1. Kalıcı Android/iOS uygulama kimliği ve mağaza ürünlerini gerçek konsollarda oluştur; fiyat, vergi ve bölgesel görünümü doğrula.
2. Google Play Billing ve StoreKit istemcilerini bağla. İstemciden gelen ürün veya fiyat beyanına güvenme.
3. Sunucuda mağaza makbuzunu ilgili sağlayıcıyla doğrula; uygulama/ürün/hesap, işlem kimliği, imza, zaman ve satın alma durumunu kontrol et. Teslimi atomik ve idempotent yap.
4. İade, iptal, bekleyen satın alma, yeniden yükleme ve sezon değişimini işle; abonelik varsa ayrıca yaşam döngüsünü tasarla.
5. Ödüllü reklamı gerçek SDK ve sağlayıcı SSV bildirimiyle doğrula. İstemci zamanlayıcısını ödül kanıtı sayma.
6. Çocuk/ebeveyn, gizlilik ve mağaza politikalarını değerlendir; kapalı testte gerçek cihaz ve sunucu kayıtlarıyla doğrula.

Bu maddeler tamamlanmadan ücretli ürünleri veya reklam ödüllerini üretimde etkinleştirmeyin. Mobil yayın sırası için `docs/MOBILE_RELEASE_RUNBOOK.md` geçerlidir.
