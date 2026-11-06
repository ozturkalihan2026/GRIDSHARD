# Fiziksel Android — S1 TEST hazırlığı, 6 Kasım 2026

Kullanıcı telefonu bağladı ve test paketinin kurulmasını istedi. Ayrı
`com.gridshard.localdebug` paketi **GRIDSHARD S1 TEST** adıyla veri silmeden
güncellendi. Play'den kurulu `com.gridshardgame.app` değiştirilmedi.

- Cihaz Android 16; gerçek WebView 375×771, Android platformu.
- APK: `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`.
  Derleme başarılı; denetim 582 web dosyası, test hook'u/gizli dosya yok.
  İlk paket web içerik özeti `eb7152c64351e435`; bu mağaza AAB’si değildir.
- API yalnız bilgisayarın `127.0.0.1:8897` adresindeki izole fixture sunucusu.
  USB `adb reverse tcp:8897 tcp:8897` gerekir. Kablo ve bilgisayardaki test
  sunucusu açık kalmalı; internet üzerindeki üretim API’si kullanılmaz.
- Yerel hesap ve güvenli oturumu korundu. Normal bootstrap, 40 sezon kademesi
  ve üç açılmamış kabul kasası WebView üzerinden doğrulandı. Gerçek oyun
  talep handler'ları kullanılır; fazladan çekirdek kasası yalnız test örneğidir.
- Kullanıcı isteğiyle aynı yerel hesapta 24 modülün tamamı mevcut unlock hakkı
  üzerinden açıldı. Kupa, cüzdan, seviyeler, ödül kutusu ve seçili deste
  değiştirilmedi. Kartlar ekranında 24 modül doğrulandı ve ekran açık bırakıldı.
- Kullanıcı altılı desteyi değiştirip farklı modüllerin seslerini, ardından
  üç kasayı Topla ile açmayı ve turnuvaların ÖDÜLLER sekmesini deneyebilir.
  Hoparlör/kulaklık, kendi dokunma deneyimi ve işitilen ses kalitesi henüz
  kabul edilmiş sayılmaz. `android_acceptance=false` kalır.

Yerel kanıtlar `qa_reports/native-s1-20261106/` altında; kimlik özel dosyada
kalır ve Git'e alınmaz. `phone-preparation.json`, `all-modules-unlocked.json`,
APK denetimi ve gerçek WebView ekran görüntüleri yeniden üretilebilir.

Telefon sunucusu `tools/e2e_server.py --runtime-dir
D:/Projects/GRIDSHARD/.mobile-debug/runtime-s1-20261106` ile çalışır.
Yalnız bu fixture'da `GRIDSHARD_E2E_S1_ACCEPTANCE=1` ve
`GRIDSHARD_E2E_S1_BOTS=1` kullanılır; simülasyon tarihi 12 Aralık’tır.
Üretim tarihi veya başlangıç ayarı değiştirilmez. Yeni süreçte eski çalışma
verisini silme veya `prepare` endpoint’ini aynı hesapta yeniden çağırma.

Paralel tarayıcı temizliğinin telefon sunucusunu kapattığı bir hazırlık hatası
bulundu. PID kanıtları ve teardown artık port başına ayrı dosya kullanır;
8899’daki üç tarayıcı testi bittikten sonra 8897’deki fiziksel hesap denetimi
ve 24 modül açılışı geçti. Başka test sunucusunun süreci kapatılmaz.

## v20 ses düzeltmesi — aynı gün güncellenen paket

Kullanıcı v19’da Rezonans etkinleşmesini ve yeni silahları duymadı; müzik
kapatılınca efektleri çok kısık duydu. Dosya yokluğu değil, duyulabilirlik ve
miks dengesi sorunu saptandı. Yeni sentezler düşük gövdeyi koruyup telefonun
orta bandına fazı sürekli bir katman ekler; ham RMS/tepe tavanları büyümez.

Savaş SFX çarpanı 0,42→0,90; savaş müziği 2,85→1,65. Core aktivasyon/atış
trimleri0,78/0,58; yeni saldırı trimleri0,70. Menü/result müzik, kullanıcı
ses sliderları, üç rutin ses/420ms, öncelik/tekrar kuralları korunur.

23 WAV kaynağı ve46 OGG/AAC türevi güncellendi; 105 sesin hash denetimi geçti.
23 telefon bandı/kaynak testi ve çekirdek motoruyla birlikte85 odaklı Python
testi geçti. 779 istemci ve11 build testi geçti. Chromium/Android gerçek
codec ve dört saniyelik yoğun miks testinde tepe yaklaşık0,609305, kırpılan
örnek0; bunlar fiziksel duyma kabulü değildir.

Yeni APK aynı kimlik ve imzayla veri silmeden kuruldu. Web hash
`291b3fcd28a2b17e`; gerçek telefonda mix v20, beş yeni paket sesinin SHA-256
özeti, aynı yerel hesap ve24 açık modül doğrulandı. Kanıt
`qa_reports/native-s1-20261106/native-v20-install-proof.json`; APK denetimi
`apk-v20-audit.log`. Test API yeniden başlatılmadı ve mevcut kayıt silinmedi.
Kullanıcıdan yeni savaşta duyulabilirlik/cızırtı yanıtı bekleniyor;
`android_acceptance=false` korunur. Tüm bu tur henüz commit/push edilmedi.

## v21 — görev sesleri ve kahraman çekirdek adayı

V20 duyulabilirliği kullanıcı tarafından doğrulandı; müzik geride kaldı ve
çekirdeğin karakteri yeterli bulunmadı. Yeni aday [ses yönü briefi](audio-direction-circuit-forge-v21.md)
24 modül ve yedi çekirdeği birlikte tanımlar. Bütün 44 kaynak ve88 codec
üretildi. Güçlendirici UI sesinden, Zırh/Kalkan birbirinden ayrıldı. Hedefin
adı artık tek başına savunma sesi oluşturmaz; gerçek blok/emme bilgisi gerekir.

V21 müzik/SFX çarpanları2,35/0,70; müzik besteleri ve kişisel ayarlar korunur.
781 istemci,99 Python/araç,11 build ve iki tarayıcıda38 yönlendirme PASS.
Yoğun miks tepe0,782263, kırpılma0. 492 import ve105 codec hash kontrolü PASS.
Bunlar fiziksel kalite kabulü değildir.

Yeni APK build/audit PASS; web hash`9bbe2b39a6c8c44f`, aynı S1 TEST kimliği.
**Telefona kuruldu ve doğrulandı:** Kullanıcı USB’yi bağladı; aynı test
paketi `adb install -r` ile veri silmeden güncellendi. Kısa USB kesilmesi
sonrasında bağlantı yeniden sağlandı. Native WebView’de v21 miks, 44 OGG
dosyasının SHA-256 eşitliği, aynı yerel hesap ve24 açık modül doğrulandı;
Rezonans seçili ve uygulama menüde. Kanıt
`qa_reports/native-s1-20261106/native-v21-install-proof.json`. APK kaydı
`qa_reports/native-s1-20261106/apk-v21-ready.json`; `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`.
Kısa karşılaştırma `qa_reports/audio-v21-theme-preview.wav` ve zaman listesi
aynı adlıJSON. Eski v20 kaynaklarının70 dosyalık yerel yedeği
`qa_reports/audio-v21-baseline/` içinde; Git’e girmez.

Eski yerel API süreci kapanmış bulundu; aynı retained runtime silinmeden
PID13628 ile yeniden açıldı ve health200 doğrulandı. Yeniden kullanmadan
`server-process.json` ve süreç komut satırını kontrol et. Hesap yeniden
seed edilmedi; 24 modül hakkı ve aynı test hesabı korunur. USB reverse8897
etkin. Kullanıcıdan yeni savaşta müzik/çekirdek/modül seslerinin fiziksel
kalite geri bildirimi bekleniyor; `android_acceptance=false` korunur.

## 2.4.0 sürüm bilgisi, mağaza hediyesi ve sade başlangıç

Kullanıcı açılıştaki eski 2.3.0 etiketini bildirdi. İstemci sürümü artık
`package.json` içinde 2.4.0 / `gridshard.androidVersionCode=15`. Açılış ve
ayarlar etiketleri derlemede bu kaynakla karşılaştırılır; eski etiket paketi
durdurur ve son başarılı çıktıyı korur. Android test projesine aynı sürüm
otomatik yazılır. Boot uyumluluk kontrolü ve telemetri de aynı etiketi okur.
Canlı sunucu ve son yayın yapılandırması 2.3.0/14 olarak ayrı kalır; imzalı
üretim derlemesi öncesi üretim yapılandırması aynı istemci sürümüne
hazırlanmadıysa yeni kontrol derlemeyi durdurur.

Mağazada alınabilir hediye varsa Kartlar ile aynı yeşil ışık yanar. Mağazaya
bakmak bildirimi silmez; sunucunun onayladığı sandık alımı siler. Soğuma,
erişilemeyen içerik ve alınmış hediye ışık yakmaz; indirim rozeti korunur.
Gerçek geçici hesapla alım ve yeniden açılış iki tarayıcıda geçti:
`qa_reports/shop-gift-light-e2e.log`.

Başlangıç ve ilk kayıt ekranlarından REVIEW / DEMO SIGN-IN kaldırıldı.
İnceleme hesabına Ayarlar → Hesap ve Gizlilik ve oturum kurtarma üzerinden
erişilebilir. Google Play ücretli alanların incelenebilmesini istediğinden
sunucudaki inceleme hesabı devre dışı bırakılmadı. Play Console App access
açıklaması yayın öncesi [güncel İngilizce yol ile](../PLAY_REVIEW_ACCESS.md)
değiştirilmeli; Console bu yerel çalışma ile güncellenmedi.

Son APK aynı ayrı test kimliğine veri silmeden kuruldu. Android binary
2.4.0/15, web hash `b7bb715fe124efdd`, APK SHA-256
`59bc114c151cee54cd729a726b606ecff684609a88dd5c3533a952ea581718ea`.
Native DOM’da iki sürüm etiketi, kaldırılmış iki giriş, Ayarlar erişimi,
aynı hesap, 24 açık modül ve44 ses dosyasının hash eşitliği doğrulandı:
`qa_reports/native-s1-20261106/native-240-final-content-proof.json`.
Son kontrolde savaş ekranı açık olduğu için yeniden yükleme/navigasyon
yapılmadı. Önceki 2.4.0 paketinde görünür açılış/ayarlar kanıtı
`native-240-version-shop-proof.json`; son düğme kaldırma sonrası görünür
başlangıç kabulü iki tarayıcıda geçti (`release240-clean-boot-e2e.log`).
781 istemci,13 build,8 ön duyuru araç testi ve492 import kontrolü geçti.
İnceleme girişi → premium erişim → asıl hesaba dönüş dört ekran boyutunda
izole aktif S1 senaryosunda geçti (`release240-review-entry-e2e.log`).
Sezon öncesindeki premium kapısı kapalı kalır; bu kabul için üretim sezonu
açılmadı ve hiçbir canlı hesap kullanılmadı.
Canlı/Play yayını ve fiziksel ses beğenisi hâlâ tamamlanmadı. Kullanıcı bu
çalışmaları commit/push etmeyi istedi; Git teslimi yayın veya cihaz ses kabulü
yerine geçmez.
