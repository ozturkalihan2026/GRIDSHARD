# 31 Ekim 2026 — V5 sürümünün telefona yüklenmesi

Son sürüm bağlı fiziksel telefondaki **GRIDSHARD TEST** uygulamasına `install -r`
ile başarıyla yüklendi. Paket `com.gridshard.localdebug`; mevcut test hesabı ve
uygulama verileri korundu. Mağaza uygulamasına veya Play yayınına işlem yapılmadı.

- Mobil build: `aec9becb22f16531`.
- Paket içindeki JS: `gridshard-eac52556788d5507.js`.
- APK: `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`.
- SHA256: `C1F2D2A134603AE50777678AE264BF4574512CF806B98051631EDB579A81AE35`.
- JDK21 / SDK36 / çevrimdışı Gradle `assembleDebug` başarılı.
- 511 web dosyası kaynak paketle eşleşti; paket/ağ/güvenli depo denetimi ve
  APK v2 imza kontrolü geçti. Test kancası bulunmuyor.
- Android paket güncellenme zamanı: 31 Ekim 2026 22:13:23.

## Bağlantı hatası ve düzeltme

İlk açılışta sunucu sağlıklı ve USB reverse açık olmasına rağmen telefon API
istekleri başarısız oldu. Gerçek WebView ağ kaydı `MissingAllowOriginHeader`
gösterdi: `https://localhost` kökeni için CORS izni eksikti.

`tools/e2e_server.py`, kalıcı native test verisi `--runtime-dir` ile çalışırken
artık yalnız `https://localhost` originine izin veriyor. Sunucu aynı test veri
diziniyle yeniden başlatıldı. Telefonun gerçek hesap ve koleksiyon istekleri
başarıyla geçti. Başka bir origin için Allow-Origin başlığı verilmediği ayrıca
kontrol edildi. Bu düzeltme üretim sunucusunun CORS ayarını değiştirmez.

## Gerçek cihaz doğrulaması

`tools/check_native_core_roles_v5.cjs` ile paket içindeki Capacitor WebView:

- Android native ortam, `https://localhost/`, API `http://127.0.0.1:8891`.
- 375×771 CSS px, DPR3,25; yatay taşma yok.
- 24 modül, 7 çekirdek ve 42 çekirdek yeteneği sunucudan geldi.
- Koleksiyonda gerçekten 24 kart; Rezonans istatistiğinde yeni doğrudan hasar
  açıklaması ve yetenek sekmesinde altı seçenek doğrulandı.
- JavaScript çalışma hatası ve eksik varlık yanıtı yok.
- Hiçbir yetenek satın alınmadı; kontrol betiği savaş başlatmadı, ilerlemeyi
  sıfırlamadı. Kontrol sonunda ana ekrana dönüldü.

Kanıt: `artifacts/core-roles-v5/phone-20261031/result.json`,
`phone-ready.png`, `phone-core-stats.png`, `phone-core-talents.png`.

## Kullanıcının denemesi

**USB bağlantısı ve bu bilgisayar açık kalmalı.** `adb reverse tcp:8891 tcp:8891`
açık bırakıldı. İnceleme için kullanılan `adb forward tcp:9224` kapatıldı.
Telefon sunucusu `127.0.0.1:8891` üzerinde çalışıyor; kalıcı izole veriler
`.mobile-debug/runtime-no-overtime-20261028` içinde. Eski test hesabı korunur.
Uygulama güncel 3 sınıf / 24 modül / yeni çekirdekler / 2,5sn Akım ve 200CAN
bonus kurallarıyla çalışır; ayrıntılar V5 denge raporunda.
