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

## 2.3.0 sağlık yanıtı ve istemci geçiş uyumu

2.2.1 kurulu istemci `/health.release_version` alanını birebir eşleştirir.
Bu yüzden 2.3.0 kaynağında bu alan `2.2.1` uyumluluk değeri olarak korunur;
gerçek sunucu sürümü **`server_release_version`** alanıdır. Çok eski v8
istemciler için `version=2.1.0-beta.72` de korunur. Operatör ve yeni istemci
gerçek sürümü önce `server_release_version`, yoksa `release_version` alanından okur.

Yeni 2.3.0 istemcisi yalnız açıkça incelenen 2.2.1 sunucu köprüsünü kabul eder;
PvP protokolü 2 ve kalıcılık hazır olma koşulları yine zorunludur. Bilinmeyen
ileri sürüm veya farklı protokol otomatik uyumlu sayılmaz. Bu, mağaza yayılımı
sırasında eski uygulamayı kesmeden sunucu/istemci sırasını yönetmek içindir.
Uyumluluk alanı gerçek sürümü gizlemek için kullanılmaz; ikisi yan yana döner.
