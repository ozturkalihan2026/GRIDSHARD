# 28 Ekim 2026 — güncel APK ile gerçek Android testi

Güncel kaynaklar bağlı telefona **GRIDSHARD TEST** adıyla kuruldu.
Paket `com.gridshard.localdebug`; mağaza paketi `com.gridshardgame.app`
korundu. Test yeni yerel misafir hesabı ve yalıtılmış sunucuyla yapıldı.
Canlı sunucu, gerçek hesap, satın alma ve Play yayını değiştirilmedi.

## Paket

- APK: `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`
- Mobil build: `64a5da0c3bfa4ecb`.
- JS: `gridshard-e0813b0692b6ee0b.js`.
- APK SHA256: `206E594BBF3DE1A976D7520395F71955F20B33487058B85AED7CBB055E76AE4D`.
- JDK 21, SDK 36; Gradle `assembleDebug` başarılı, APK v2 imzası doğrulandı.
- Paket denetimi: 671 web dosyası güncel `dist` ile eşleşiyor; ayrı paket
  kimliği, yerel API, ağ politikası ve native güvenli depo köprüsü doğrulandı.
- APK geliştirme test kancası içermiyor. Onaylı ikonlar sync kancasıyla aktarıldı.
- İlk kurulum telefondaki USB yükleme kısıtıyla reddedildi. Kullanıcı izni
  açtıktan sonra ikinci kurulum başarılı oldu; mevcut uygulama kaldırılmadı.

## Doğrulamalar

Android 16 / WebView Chrome 155, model 25113PN0EG. WebView 375×771 CSS px,
DPR 3,25. Kontroller paket içindeki `https://localhost` sayfasında çalıştı;
önceki fiziksel Chrome testinden farklı olarak gerçek Capacitor uygulamasıdır.

- 36 modülün sunucudaki maliyet ve 1. seviye temel değerleri kanonla eşleşti.
  Değişen altı kartın bilgi panelleri ve özel değerleri görüntülendi.
- Çekirdek sekmesi `core_resonance.webp` gösteriyor.
- Ödül Listesi başlığın sağında aynı satırda: yaklaşık 77,9×22 px, yazı 9 px.
- İki tahta da 15 hücre; ekrana sığıyor. Yatay taşma yok. Mavi adanın alt
  resim payı yaklaşık 7,24 px. Alt rafta altı kart 58 px, görseller yaklaşık
  49,15 px yüksekliğinde ve rafın içinde.
- Gerçek sunuculu AI savaşında görünür kart düğmesiyle modül yerleştirme geçti.
- Emoji gönderme, balonun sona ermesi, bekleme sonrası açılma ve 100 aç/kapa
  döngüsü geçti. Kapalı tepside seçenek ve sona eren balon kalmadı.
- JavaScript çalışma hatası yok. 10 saniyelik rAF örneği yaklaşık 119,1 FPS,
  p95 kare aralığı 8,4 ms. Bu kısa, az modüllü örnek tam tahta/uzun oturum
  performans veya genel bellek sızıntısı garantisi değildir.
- Ana ekrana geçiş/uygulamaya dönüş aynı test misafiriyle geçti.

Uzaktan CDP ekran yakalaması bu WebView'da sabit alt katmanları görselde
sıkıştırıyor. Gerçek ADB ekran görüntüsünde raf doğru; CSS değiştirilmedi.
Görsel değerlendirmede `phone-*.png` kullanılır; `native-*.png` CDP çıktıları
bu nedenle gerçek ekranın alt kısmını doğru temsil etmiyor.

## Kullanıcının denemesi

Uygulama telefonda ana ekranda hazır bırakıldı. Test sunucusu bu bilgisayarda
çalışıyor; **USB bağlantısı ve bilgisayar açık kalmalı**. `adb reverse`
8891 portunu bilgisayardaki 127.0.0.1:8891 adresine bağlıyor. Sunucu
`tools/e2e_server.py` ile geçici test verileri kullanıyor; bu oturumun
hesabı ana oyun hesabı değildir. Sunucu yeniden başlatılırsa test verileri
yenilenir. Buradaki güncellemeler canlı oyunculara henüz dağıtılmadı.

Kanıt: `artifacts/native-android-20261028/result.json`, `lifecycle.json`,
`phone-shop.png`, `phone-cores.png`, `phone-battle-emoji.png`,
`phone-battle.png`, `phone-ready.png`.
Tekrar aracı: `tools/check_native_balance_on_android.cjs`; yalnız test
APK'sının WebView portu 9224 ve yalıtılmış API portu 8891 için tasarlanmıştır.
ADB forward 9224 test sonunda kaldırıldı; reverse 8891 kullanıcı denemesi
için bırakıldı. Sunucunun süreç bilgisi `qa_reports/e2e-server.pid.json` içinde.
