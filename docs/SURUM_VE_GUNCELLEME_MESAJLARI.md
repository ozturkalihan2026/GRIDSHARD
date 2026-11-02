# Sürüm ve oyun içi güncelleme mesajları

2 Kasım 2026 tarihli kullanıcı kararı: sürüm biçimi `MAJOR.MINOR.PATCH`.

- Hata düzeltmesi: son sayı artar (`2.2.0 → 2.2.1`).
- Küçük özellik/değişiklik: orta sayı artar, son sayı sıfırlanır (`2.2.1 → 2.3.0`).
- Büyük değişiklik: ilk sayı artar, diğerleri sıfırlanır (`2.3.0 → 3.0.0`).
- Android `versionCode`, her yeni yükleme paketinde ayrıca artar: 2.2.1 için 12.

Her sürümde `server/data/game_updates.json` dosyasına sürüm, sürüm tarihi,
Türkçe ve İngilizce oyuncu notları eklenir. Önceki kayıtlar silinmez veya yeni
sürüm olarak yeniden adlandırılmaz. `release_updates.py` bu veriden sabit
`update-MAJOR-MINOR-PATCH` kimliğini üretir. Aynı sürüm iki kez eklenemez;
çalışan sürümün notları yoksa kaynak kontrolü ve sunucu başlangıcı başarısız olur.
Gelecek sürüm taslakları çalışan sürümün mesaj kutusunda gösterilmez.

Mesajlar normal mesaj kutusu isteğinde Sistem sekmesine gelir. Oyuncunun
gördüğü liste en yeniden eskiye sıralanır: 2.2.1, 2.2.0, 2.1.1.
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
