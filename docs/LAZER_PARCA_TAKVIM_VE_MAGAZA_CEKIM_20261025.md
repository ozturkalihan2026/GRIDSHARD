# Lazer parça artışı ve mağaza savaş görüntüsü — 25 Ekim 2026

## Pilot-081F6296 için salt okunur inceleme

Yerel kayıt dosyasındaki günlük giriş makbuzu, 2026-09-28 döneminin
28. günü için **126 Lazer parçası** verildiğini gösteriyor. Bu ödül için
tek makbuz ve `claimed_days: [28]` var. İnceleme anında Lazer bakiyesi119;
önceki yükseltmeler ayrıca parça harcamış. Hesabın bakiyesi değiştirilmedi.

Kaynak `server/app/player_profile.py` içindeki `_login_period_reward` ve
`claim_login_reward`: haftalık büyük ödülde ortak modül parçası tabanı
`3 * (14 + day)`, yani 28. gün126. Oyuncuya atanmış modül Lazer.
Bu ortak 28 günlük takvimin günüdür; ardışık28 giriş koşulu değildir.
Bu nedenle yeni katılan oyuncunun takvimin son gününü alabilmesi mevcut
tasarımın sonucudur. Ekonomik değerler bu incelemede değiştirilmedi.

Aynı istek kimliği önceki makbuzu döndürür; yeni istek kimliğiyle aynı günü
almak reddedilir. Bugünden farklı gün de reddedilir. HTTP giriş ödülü yolu
kalıcı işlem kilidiyle sarılır. Çift ödül hatası kanıtı bulunmadı.

Eklenen `server/tests/test_login_day28_replay.py`, gerçek28. gün önizlemesi,
verilen parça farkı, aynı/farklı/eksik istek kimliği ve yanlış günleri kontrol
eder. İlgili üç dosyada **27 test geçti**. Test yeni, bellek içi profil kullanır.

## Platformların anlamı

Android paket Chromium tabanlı Android WebView, iOS Capacitor paketi WKWebView
kullanır. Windows Playwright WebKit ölçümü gerçek iPhone FPS ölçümü değildir.
Chromium masaüstü/mobil emülasyon sonuçları da fiziksel Android ölçümü değildir.
Ortak boyama ve katman maliyetleri her ikisini etkileyebilir; önceki WebKit FPS
kapısı hâlâ başarısızdır. Ayrıntı `SAVAS_KOK_BOYAMA_WEBKIT_20261025.md`.

Resmi kaynaklar:
- https://capacitorjs.com/docs/android
- https://capacitorjs.com/docs/ios
- https://playwright.dev/docs/browsers

## Savaş görüntüsü

Çekim `e2e/store-battle-capture.spec.js` ve
`tools/playwright-store-shot.config.js` ile ayrı geçici sunucu/veri dizininde
iki gerçek misafir oyuncunun sunucu yönetimindeki arkadaş savaşı üzerinden
yapılır. Kullanıcının yerel profili kullanılmaz. Modül yerleştirme gerçek oyun
komutudur; savaş durumu, canlar ve saldırılar görsel için uydurulmaz.
Sadece gözlem amacıyla gerçek saldırı sunumu zamanları izlenir.

Hedef360×640 CSS piksel / DPR3 = **1080×1920 PNG,9:16**.
Son dosya ve boyut doğrulaması `artifacts/play-store-battle-20261025/` içindedir.
Play Console'a yükleme yapılmaz; mevcut8/8 slot dolu olduğundan eski savaş
görüntüsünün yerine yeni dosya kullanılmalıdır. Video güncellenmedi.
