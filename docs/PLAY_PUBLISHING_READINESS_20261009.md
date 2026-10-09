# PGS ve OAuth yayın hazırlığı — 9 Ekim 2026

## Amaç ve kapsam

Önce mevcut Play Games/OAuth yayın altyapısı hazırlanır. Kullanıcının bildirdiği
Play kapalı test v4 sürer; post-v4 uygulama değişiklikleri yerel commitlerde
korunur. Gerçek tester geri bildiriminden sonra sunucu/AAB ayrı hazırlanır.
Bu hazırlık canlı ödeme değişikliği, ürün etkinleştirme, satın alma veya
Cloud Billing/kart/deneme yetkisi değildir. Yeni OAuth istemcisi/anahtar,
geniş kapsam/izin veya yeni Google projesi oluşturulmaz.

## PGS özellikleri: ekran kanıtı ve sıradaki kayıt

- Proje/oyun kimliği 376018782491, kurulum 5/6; yayın adımı bekliyor.
- Son iki özellik ekranında görünen ad GRIDSHARD, TR/EN açıklamaları ve
  Strateji kategorisi kaydedilmiş görünüyor. Önceki boş alan kaydı güncel değil.
- Kullanıcı varsayılan dili Türkçe yaptığını ve kaydettiğini bildirdi;
  İngilizce ek çeviri olarak korunur. Son Yayınlama ekranındaki tr-TR ad
  gereklilikleri yeni varsayılan dil bilgisiyle tutarlı.
- Kullanıcı kontrollü dil geçişinde özellik grafiğini değiştirince diğer
  dilde de aynı son görselin göründüğünü açıkladı. Mevcut formdaki grafik
  alanı ortak olarak ele alınır. Önceki ayrı dil grafikleri/ters kaydedildi
  yorumu yanlıştı; aynı görseli dil değiştirerek tekrar tekrar yüklemeyin.
  Varsayılan Play mağaza girişindeki görselin aynısı kullanılır; Türkçe
  mağaza ana içeriği için mevcut Türkçe grafik tercih edilir. Bunun mevcut
  Play mağaza grafiğiyle eşleşmesi ayrıca kontrol edilir.
- Yeni nesil kimlikler AÇIK, Recall KAPALI, Kaydedilmiş oyunlar KAPALI;
  Firebase bağlı değil. Bunlar değiştirilmez. Aynı paket için birden fazla
  mevcut Android credential ve oyun sunucusu credential'ı silinmez.
- Son Yayınlama ekranı altı mevcut credential için **tr-TR yerel ayarında ad
  eksik** gösteriyor: beş Android ve bir oyun sunucusu. Yayınla pasif.
  Önce mevcut bir credential'ın formunu açıp Türkçe ad alanını doğrula;
  GRIDSHARD adını tamamla ve kaydet. Sonra diğer mevcut credential'larda
  aynı yerel ad eksikliği giderilir. OAuth client ID, paket/SHA, gizli değer,
  hesap kimliği değiştirilmez; credential silinmez/yeniden oluşturulmaz.
  Genel Özellikler ve tüm yayın engellerinin kalktığı sonraki tam Yayınlama
  ekranından doğrulanır. Yayın gerçekleştiği henüz doğrulanmadı.

Metin kaynağı `docs/PLAY_STORE_LISTING.md`; görseller
`artifacts/play-store-listing-20261007/en-US/feature-graphic-1024x500.png`,
`artifacts/play-store-listing-20261007/tr-TR/feature-graphic-1024x500.png` ve
`client/assets/branding/gridshard-store-icon-512.png`.

## OAuth/marka kontrolü

Cloud Branding ekranında GRIDSHARD ve mevcut destek/geliştirici iletişimi
var; logo, ana sayfa, gizlilik, şartlar ve yetkili alanlar boş.
TLS doğrulanmış salt-okunur kontrolde `https://gridshardgame.com/` ve
`https://gridshardgame.com/privacy/` HTTP200; `/terms/` HTTP404.
Olmayan kullanım şartları sayfasını varmış gibi girmeyin. Yeni yasal metin
ve kamuya yayını yayıncının inceleme/onayını gerektirir. Data Access gerçek
kapsamları ve gereken alan sahipliği kanıtı ayrıca bekliyor.

PGS yayını, OAuth Audience üretim durumu/marka doğrulaması ve Play uygulama
üretim dağıtımı farklı işlemlerdir. Henüz yayın gerçekleştiği doğrulanmadı.

## Korunan kod ve sonraki sürüm

HEAD `ea25c1c92489ff4de484f2700da50bcb41084b32`; server/app, client, android,
config ve public-site kaynaklarında HEAD'e göre kayıtsız değişiklik yok.
Kullanıcının diğer kirli dosyaları korunur; commit/push/reset yapılmaz.
Gelecek deploy öncesi taze onay, doğrulanmış yedek, yalıtılmış test ve oyuncu
hesabı/verisi koruma kapıları yeniden gerekir. AAB sürüm kodu güncel Play
kaydıyla karşılaştırılarak kullanılmamış daha yüksek bir değer seçilir.
Yeni sürüm tek başına kapalı test katılım/gerçek geri bildirim koşullarını
tamamlamaz; bunlar Play panelinden ayrıca doğrulanır.

## Resmî başvuru kaynakları

- https://developer.android.com/games/pgs/console/setup
- https://developer.android.com/games/pgs/console/publish
- https://support.google.com/googleplay/android-developer/answer/2990418?hl=en
- https://support.google.com/cloud/answer/15549049?hl=en
- https://support.google.com/cloud/answer/15549945?hl=en
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
