# 28 Ekim — telefon köşeleri, rakip alanı ve sonuç boşlukları

Kullanıcının başka telefonla çektiği fotoğraflar, dikdörtgen viewport içinde
taşma olmamasının fiziksel yuvarlak köşelere sığmak için yeterli olmadığını
gösterdi. Önceki native testteki CDP görüntü bozulması ayrı bir konuydu;
bu istek gerçek ekranın kenar paylarını düzeltiyor.

- Rakip adı ve altındaki altı kartın arkasında tekrarlanan uçurum blokları
  kaldırıldı. Kimlik alanı arena zeminiyle aynı `#0a1933`; asıl devre
  resmi, bize bakan blokları ve canlı hücreler korundu.
- Ana ekran dahil savaş dışı dock iki yandan 16 px, alttan 12 px içeride.
  Kaydırılan ana içerikte dock için ayrılan alt alan da artırıldı.
- Savaş rafı iki yandan yaklaşık 16 px içeride. Savaş düzeninin alt dolgusu
  artırıldı; fiziksel ölçümde altta yaklaşık 19,9 px pay var.
- Sonuç ekranında ödül aşaması görünürken grid düzeni etkinleştirildi.
  Önceden tanımlanmış 12 px boşluk artık ödül, Premium ve reklam bölmeleri
  arasında uygulanıyor. Kısa ekranda taşan içeriğin başı erişilebilir ve
  kapsayıcı kaydırılabilir. Galibiyet/mağlubiyet ortak bileşeni değişti.

## Doğrulama

- İlgili 6 istemci ve 10 web paketleme kontrolü: **16 geçti**.
- Android tarayıcı öykünmesinde savaş ve beş ekranlı dock kontrolü: **2 geçti**.
- WebKit savaş testi: **1 geçti**. Gerçek iPhone ölçümü değildir.
- Ek gerçek sunuculu dar ekran kontrolü: 320×568, 375×771, 393×852.
  Dock payları 16/16/12 px; gerçek maç sonrası ödül bölümleri arasında
  12/12 px; yatay taşma yok, kısa ekranda ilk ödül erişilebilir.
- Güncel APK bağlı telefondaki `com.gridshard.localdebug` paketine veri
  silmeden yüklendi. Yalıtılmış sunucu ve mevcut test misafiri korundu.
- Gerçek Android WebView son kısa kontrolü: dock sol16/sağ15,62/alt11,92;
  savaş rafı sol16/sağ15,62/alt19,92 px. Üst zemin `rgb(10,25,51)`, ek
  uçurum katmanı yok. Gerçek maç sonrası grid ve 12/12 px boşluk doğrulandı;
  JS hatası0. Doğrudan ADB ekran görüntüleri görsel olarak incelendi.

Uzun birleşik cihaz kontrolleri önce ekran kilidi, sonra USB bağlantısının
yenilenmesiyle kesildi; bunlar başarılı koşum olarak sayılmadı. USB yönlendirme
yenilendi ve son dar fiziksel yerleşim kontrolü başarılı tamamlandı.
Kontrol sırasında USB'de ekranı açık tutma ayarı geçici kullanıldı, önceki
`stay_on_while_plugged_in=0` değeri geri yüklendi.

Mobil build `fd3a984261b54fae`; APK SHA256
`2D16EA4C40130BE5BD253420B0985C67ED2E424130D6C4829FBA325F72C24DE9`.
AssembleDebug ve 671 dosyalı APK içerik/API/ağ/güvenli depo denetimi geçti.
Uygulama adı **GRIDSHARD TEST**. Canlı sunucu/Play yayını değiştirilmedi.
Kullanıcı denemesi için yerel 8891 sunucusu ve USB reverse açık bırakıldı.

Kanıt: `artifacts/phone-ui-fixes-20261028/`; fiziksel son ölçüm
`native/layout-result.json`, görüntüler `native/phone-home-final.png`,
`native/phone-battle-final.png`, `native/phone-rewards-final.png`.
Dar ekran ölçümleri `narrow-layouts.json`; tarayıcı koşumları `browser/`,
WebKit `webkit/`. CDP yerine gerçek ekranı gösteren `phone-*.png` kullanılır.
