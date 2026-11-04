# Sürüm ve oyun içi güncelleme mesajları

2 Kasım 2026 tarihli kullanıcı kararı: sürüm biçimi `MAJOR.MINOR.PATCH`.

- Hata düzeltmesi: son sayı artar (`2.2.0 → 2.2.1`).
- Küçük özellik/değişiklik: orta sayı artar, son sayı sıfırlanır (`2.2.1 → 2.3.0`).
- Büyük değişiklik: ilk sayı artar, diğerleri sıfırlanır (`2.3.0 → 3.0.0`).
- Android `versionCode`, her yeni yükleme paketinde ayrıca artar: 2.2.1 için 12; ilk 2.3.0 adayı 13, geri düğmeleri tamamlanmış yayın paketi 14.

Her sürümde `server/data/game_updates.json` dosyasına sürüm, sürüm tarihi,
Türkçe ve İngilizce oyuncu notları eklenir. Önceki kayıtlar silinmez veya yeni
sürüm olarak yeniden adlandırılmaz. `release_updates.py` bu veriden sabit
`update-MAJOR-MINOR-PATCH` kimliğini üretir. Aynı sürüm iki kez eklenemez;
çalışan sürümün notları yoksa kaynak kontrolü ve sunucu başlangıcı başarısız olur.
Gelecek sürüm taslakları çalışan sürümün mesaj kutusunda gösterilmez.

Mesajlar normal mesaj kutusu isteğinde Sistem sekmesine gelir. Oyuncunun
gördüğü liste en yeniden eskiye sıralanır: 2.3.0, 2.2.1, 2.2.0, 2.1.1.
kalıcı okunma/silinme kayıtları bu sürüm kimliğiyle korunur; yeniden giriş,
yeniden dağıtım veya sunucu yeniden başlatma mesajı tekrar okunmamış yapmaz.
Eski `update-2-1-1` kimliği korunmuştur. Eksik 2.2.0 mesajı ve 2.2.1 düzeltme
mesajı bu yöntemle eklenmiştir. Oyuncu verilerine toplu yazma gerekmez.

Sürüm etiketleri: `package.json`, `server/app/version.py`,
`config/android-production.json`, `android/app/build.gradle`, `client/index.html`,
`client/src/app.js`, `tools/release_guard.py`, `tools/package_release.py`.
`client/tests/release-version.test.js` bu etiketlerin eşleşmesini denetler.
Eski teslim paketlerinin sürüm/manifest bilgileri değiştirilmez.

2.2.1 profil düzeltmesi: artık geçerli olmayan kartlar içeren eski desteler,
profil vitrini ve en çok kullanılan desteler listesinden süzülür. Güncel
kartlarla oynanmış en çok kullanılan deste seçilir; yoksa aktif deste
"Aktif savaş destesi" olarak gösterilir. Hiç oynanmamış bir desteye geçmiş
maç sayısı atanmaz. Tarihsel maç sayaçları ve diğer ilerleme kayıtları korunur.

## COMPAT-01 sağlık yanıtı ve istemci geçiş uyumu

2.2.1 kurulu istemci `/health.release_version` alanını birebir eşleştirir.
Bu alan `2.2.1` uyumluluk değeri olarak korunur. Kurulu 2.3 istemcisi ise
`server_release_version` alanını karşılaştırır; o alan da artık `2.3.0`
uyumluluk değeridir. Çok eski v8 istemciler için `version=2.1.0-beta.72` korunur.
**Gerçek sunucu derlemesi `runtime_release_version` alanıdır.** Operatör/new
istemci önce bu alanı; eski sunucuda yoksa `server_release_version`, ardından
`release_version` alanını okur. 2.3 yayını ilk çıktığında gerçek sürüm ikinci
alandaydı; yeni alan bu nedenle ayrıca eklenmiştir.

Yeni istemci `client_compatibility` şemasını, API sözleşmesini, minimum/izinli
istemci sürümünü ve gerekli yetenekleri doğrular. Yeni sözleşme eksikse eski
sürüm alanına düşmez. Yeni alanları olmayan eski API yalnız incelenmiş
2.2.1/2.3.0 köprüsüyle kabul edilir. PvP protokolü 2 ve kalıcılık hazır olma
koşulları ayrıca zorunludur. Sağlık yanıtı `Cache-Control: no-store` taşır.
Yetenek desteği, sezonun veya ödül dağıtımının açıldığı anlamına gelmez.

Minimumun altında kalan yeni istemci Google Play üzerinden güncelleme ve
ilerlemenin korunması açıklamasını görür; uygulama kendi web/native paketini
indirmez ve kullanıcıdan eski kurulumu silmesini istemez. Kurulu eski
istemciler bu yeni minimum alanını tanımadığı için minimumu artırmak tek
başına onları engelleyen bir güvenlik kapısı değildir; eski API desteğini
kaldırmak ayrı yayın/migration kararı gerektirir.

Kabul ve tekrar üretim: [2.4 istemci uyumluluğu](planning/release-240-client-compatibility.md).
