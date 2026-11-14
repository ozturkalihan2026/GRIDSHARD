# GRIDSHARD web sitesi — 14 Kasım 2026 teslimi

Kullanıcı web sitesinin de güncellenmesini istedi; ardından Edge üzerinden
dosyayı kendisinin yükleyeceğini belirtti. Cloudflare oturumu açılmadı,
site yayımlanmadı. Mevcut `gridshard-public` projesi/Production ortamı kullanılır;
yeni proje, DNS, sunucu veya AAB değişikliği yapılmaz.

## Hazır paket

`deliverables/GRIDSHARD_WEB_2.4.0_2026-11-14.zip`

- 29 dosya doğrudan ZIP kökünde; 909.226 byte.
- SHA256: `780c8d7ad58749f2005505e2eeea99688f5b526bb85b5bedbf4f2fab586d37d0`.
- Bütün ZIP girdileri son build manifestiyle boyut/SHA256 olarak eşleşti;
  ZIP bütünlüğü ve yol sınırları doğrulandı.
- Talimatlar ve manifestler aynı adlı teslim klasöründedir; yüklenen ZIP'e
  kaynak kod, README, manifest, hesap veya anahtar eklenmedi.

## İçerik ve doğrulama

TR/EN ana sayfa gerçek 2.4.0 görsellerini, 6 başlangıç modülü/18 ilerleme
açılımını, 7 çekirdeği ve 30 Kasım 03.00 TR planlanan sezon başlangıcını gösterir.
2.4.0'ın incelemede olduğu açıkça yazılıdır; güncelleme onaylanıp dağıtılınca
bu durum metni ayrıca güncellenir. Dört haftalık dönem 28 Aralık 03.00 TR'de biter.
Reklam ve gerçek para satın alma açıklamaları 2.4.0'a özgü güncellenmiştir;
eski sürümlerdeki işlem kayıtları ve iade/tüketici hakları korunur.

Gizlilik, destek, kullanım şartları ve hesap silme metinleri iki dilde yenilendi.
14 kullanım maddesi korunur; eski iade maddesinin metni geçmiş işlemler notunun
ardında değişmeden kalır. Analitik 18+ izin kapısı, mevcut veri işleme,
ebeveyn kontrolleri, saklama süreleri ve geçmiş işlem destek yolları silinmedi.
Logo/favicon/alan adı/app-ads.txt korunur; yeni galeri gerçek oyun sanatını kullanır.
Site statik ve scriptsizdir; oyun API'si, takip SDK'sı veya form eklenmedi.

18 içerik/güvenlik testi PASS. TR/EN on rota 1280/393/320px'de toplam 30
tarayıcı/taşma kontrolü PASS. Masaüstü Türkçe ana sayfa görsel olarak incelendi.
Son ek tarayıcı tekrar isteği otomatik onay servisinin kullanım kotası nedeniyle
çalışmadı; bu çağrı dosya değiştirmedi. Daha önceki tarayıcı sonucu korunur;
son kaynak yeniden derlendi ve teslim baytları yerel manifestle doğrulandı.

Kullanıcı yüklemeden canlı eşleşme sonucu veya yeni yayın başarısı iddia edilmez.
Yükleme teyidinden sonra `node tools/verify-public-site-live.js` ile canlı
TR/EN dosyaları, CSP, mailto ve byte/SHA256 eşleşmesi kontrol edilir.

## Kullanıcı yüklemesi sonrasında canlı doğrulama

Kullanıcı14 Kasım yüklemeyi teyit etti.14 Kasım2026 05:46:16UTC
(08:46:16TR) anonim HTTPS denetimi: **11 HTML/app-ads +15 asset PASS**.
Bütün boyut/SHA256 değerleri teslim manifestiyle aynı; CSP/no-transform,
plain mailto ve scriptsiz sunum korunuyor. Yayın durumu artık doğrulanmıştır.
ZIP'in içeriği/hash'i değiştirilmedi. Ayrı teslim kaydı published=true yapıldı.
