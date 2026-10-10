# Android v6 — Billing bağlantı sıralaması ve güvenli ürün tanılaması

Durum: **yerel imzalı aday hazır; commit/push, yeni exact-commit CI ve final
paket doğrulaması bekleniyor. Telefona kurulmadı, Play'e yüklenmedi/yayımlanmadı.**

Kullanıcı, bağlantı çakışmasının düzeltilmesini, güvenli ürün-bazlı hata
tanılamasının eklenmesini ve yeni AAB hazırlanmasını onayladı. Bu onay
yayınlama, diğer ürünlerin etkinleştirilmesi, sunucu geçişi veya veri silme
yetkisi değildir. Commit/push kullanıcı tarafından yapılır.

## Değişiklik ve sınırlar

- `client/src/native-store.js`: Android fiyat sorgusu, satın alma kurtarma,
  satın alma penceresi ve tüketme çağrıları native promise tamamlanana kadar
  aynı kuyrukta tutulur. Hata/iptal kuyruğu serbest bırakır; bekleyen native
  işlem sürerken sıradaki işlemi başlatacak JS timeout kullanılmaz.
- Satın alma, sırası geldiğinde güncel fiyat/teklifi tekrar doğrular. Eksik
  fiyatla ödeme, otomatik onay/tüketim veya istemci tarafından ürün verme yok.
  Önceki hesap bağlama, makbuz filtreleri ve sunucudan doğrulama korunur.
- `tools/configure-native-billing.js` ve Java şablonu: native-purchases
  **8.8.1 / Billing Library 9.1.0** için tam eşleşmeli, idempotent tanılama
  hazırlığı. Sürüm/şablon sapması hata verir. pnpm hard-link dosyasını yerinde
  değiştirmek yerine workspace entry atomik değiştirilir; paylaşılmış store
  inode'u korunur. Android sync sonrasında yeniden uygulanır.
- Yeni `GridshardBilling` tanılaması yalnız sayısal query kodu/sayıları ve
  10 bilinen INAPP ürün kimliğinin `UnfetchedProduct` status kodunu loglar.
  SDK serbest debug metni, hesap/offer/purchase token, makbuz veya fiyat
  okunmaz/yazılmaz. Bu, tüm üçüncü taraf vendor loglarının temizlendiği
  anlamına gelmez; cihazdan yalnız güvenli tag/alanlar okunmaya devam edilir.
- Android `versionCode` **6**; `versionName` **2.1.0-beta.72** ve canonical
  `com.gridshardgame.app` korunur. Sunucu/PGS/Ads kimlikleri, fiyatlar,
  ödeme sağlayıcısı, refund politikası veya oyuncu verileri değişmedi.
- Diğer 9 ürün DRAFT kalır. Son read-only katalog kanıtı 09:50:36 TR:
  yalnız `gridshard.flux_120` / standard / Türkiye / 29,99 TL ACTIVE.

## Kanıt ve belirsizlik

V5 cihazda 09:56:06 TR ürün sorgusu/kurtarma çakışması, bağlantı kapanması,
setup timeout ve `-1/SERVICE_DISCONNECTED` görüldü. Ancak 09:56:56.770 TR
çakışma görülmeyen query de 0/OK ve fetched0 döndü. Dolayısıyla kod kusuru
düzeltildi, fakat 120 Akı fiyat yokluğunun kesin tek nedeni veya yeni sürümde
telefon sorununun çözüldüğü henüz doğrulanmış değildir. Yeni neden kodları
telefon v6 ile güncellendikten sonra alınabilir; v5'e server-only geçiş yetmez.
[Google Billing ürün sorgusu ve hata kodları](https://developer.android.com/google/play/billing/integrate).

## Yerel doğrulama

- Odaklı fiyat/kuyruk/tanılama: **16/16 geçti**, atlama yok. Native callback
  ömrü, kurtarma/fiyat/tüketme çakışmaları, iptal, hata sonrası kuyruk devamı,
  eski fiyatla ödeme engeli, listener içinde tüketme ve iOS fiyat sıralaması.
- Tam istemci: **284/284 geçti**, atlama yok. Java helper ayrıca stub API ile
  javac/JVM'de çalıştı; bilinmeyen ID veya SUBS hata ayrıntısı yayımlamadı.
- Üretim web paketleme sözleşmeleri: **9/9 geçti**. Sandbox hard-link/rename
  izin hataları normal yerel test ortamında yeniden çalıştırılarak ayrıldı;
  başarısız ilk koşular gizlenmedi ve ürün hatası diye etiketlenmedi.
- JDK21+/SDK36 ile offline `assembleRelease bundleRelease`: **BUILD SUCCESSFUL**.
  Gerçek Billing9.1.0 API'siyle Java helper derlendi; `lintVitalRelease` geçti.
  Ek tam Billing modülü lint'i offline eksik sabit test bağımlılıklarına takıldı;
  normal Gradle repository erişimiyle tekrar **başarılı** tamamlandı. XML raporu:
  **0 hata, 3 uyarı**, yeni Java helper'da **0 bulgu**. Uyarılar
  AndroidGradlePluginVersion, GradleDependency, NewerVersionAvailable;
  bu kapsamda bağımlılık yükseltilmedi. FlatDir uyarıları da mevcut.
  Kanıt: aday klasöründeki `billing-lint-release.xml`.
- Audit: mevcut upload sertifikasıyla APK/AAB imzaları doğru; her pakette
  **74 web asset** dist ile SHA eşleşiyor ve **9 yerel font** var. Doğru HTTPS
  API, debug/remote web URL kapalı, private review materyali ve reklam-kimliği
  izinleri yok; Firebase otomatik init kapalı.
- Her iki pakette kuyruk kodu ve native tanılama sınıfı/tag'i ayrıca bulundu.
  Manifest gömülü; bundle manifest kimliği/sürüm kodu6 bağımsız doğrulandı.
- V5 APK/AAB SHA'ları önceki pinlerle aynı; dosyalar korunuyor.

## Aday dosyalar

Klasör: `artifacts/android-production-20261010-v6-candidate`.

| Dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v6.apk` | 28294148 | `3702ae9534abb3f36df59d861440eec3c2bbb0b5b06525cdaa41a40e20dc976c` |
| `GRIDSHARD-2.1.0-beta.72-v6.aab` | 27687251 | `aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb` |

`release-audit.json`, `release-provenance.json` ve okunabilir
`AndroidManifest.bundle.xml` aynı klasörde. XML ayrı Play yüklemesi değildir.
Çalışma ağacı aday build'de kirliydi; kaynak HEAD
`0db145d26c2576f0ba801acf0e324fde3b5bf051` yeni app değişikliklerini içermez.
Önceki a309 CI başarısı bu adayın exact-commit CI kanıtı değildir.

## Sonraki kapılar

1. Kullanıcı tüm app/tool/Java template/test/config değişiklikleri dahil
   commit/push yapar; agent commit/push yapmaz.
2. Yeni exact-commit CI doğrulanır; clean kaynak ve aday kaynak hashleri
   karşılaştırılır. Final paket aynı kaynaktan yeniden üretilip auditi yapılır.
3. Alpha taslak/yükleme/yayın için ayrıca kapsam onayı alınır; mevcut test
   kullanıcıları/ülkeler korunur. V6 telefon sürümü ayrıca doğrulanır.
4. Yalnız 120 Akı fiyatı ve güvenli `GridshardBilling` ürün-bazlı kodlar kontrol
   edilir. Test banner ve ücretsiz test ödeme yöntemi görülmeden ödeme onayı yok.
   Gerçek alım/teslim/tüketim/replay/iade henüz doğrulanmadı.
