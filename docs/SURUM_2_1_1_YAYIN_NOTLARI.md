# GRIDSHARD 2.1.1 / Android v9 — yayın adayı

Bu dosya **yayın tamamlandı** kaydı değildir. Commit/push, yeni CI, canlı sunucu geçişi ve imzalı AAB bu tur henüz yapılmadı. Performans kabulü kapanmadan bu adımlar başlatılmamalı.

## Değişiklikler

- Çekirdek patlamasında 1.7 saniyelik tek ışık yayılımı, ek son halka ve mevcut 2.5 saniyelik sonuç beklemesinde erişilebilir “SAVAŞ SONA ERDİ” etiketi var. Aynı terminal tekrar gelirse çoğalmaz; çıkış/yeni savaşta temizlenir. Azaltılmış harekette sabit yumuşak sönme kullanılır; tam ekran strobe/blur yoktur. Sunucu sonucu, ödül ve oyun kuralları değişmez.
- Mesaj kutusu, en yeni okunmamış/işlem bekleyen mesajın sekmesini seçer. Bunlar yoksa boş sekme yerine mesaj içeren sekmeye gider. Okunmamış sandıklar ve toplama/silme korumaları değişmedi.
- Çekirdek daha baskın, normal cihazlar daha küçük; isabette zorunlu layout yok; projeksiyon, ölçü ve glow tile cache sınırları var. Tek kare sahibi korunur. Sürekli zıplama/sıkışma kalkar, gerçek atış tepkileri kalır.
- Otomatik kalite, dört saniyede on kare bile üretilemeyen pencereyi artık atmaz. Art arda üç ön plan >1 saniye karesi de aşırı yük sayılır. Tek arka plan dönüşü ve oyuncunun manuel seçimi yanlış düşürülmez.
- Üretimden ayıklanan geliştirme API'si, ana savaş aşamalarının sürelerini ölçebilir. Normal oyuna yeni ölçüm RAF zinciri eklenmez.
- Aktif web/sunucu/paketleme/Android kaynakları ve açılış/ayarlar etiketi 2.1.1; Android config/Gradle kodu 9. Tarihsel Beta notları yeniden yazılmadı.

## V8 kurulumlarını koruyan sürüm geçişi

Kurulu v8 istemci `/health.version` alanını tam olarak `2.1.0-beta.72` ile karşılaştırıyor. O alanın tek başına 2.1.1 yapılması mevcut oyuncuları sunucu güncellenir güncellenmez engellerdi.

- `server/app/version.py::VERSION`, OpenAPI ve yeni uygulamanın görünen sürümü: **2.1.1**.
- `/health.release_version`: gerçek sunucu yayını **2.1.1**.
- `/health.version`: yalnız v8 geçiş uyumluluğu için eski wire alias.
- Yeni boot gate ve operatörün HIZLI_SAVAS_TESTI başlatıcısı önce `release_version` okur. Hazırlık ve protokol kontrolleri atlanmaz.
- İki alanın doğru olması testlerde birlikte doğrulanır. Sağlık yanıtı bir yayın onayı değildir.
- Eski alias ancak v8 kullanıcılarının geçişi doğrulandıktan sonra ayrı bir minimum-istemci kararıyla kaldırılabilir.

V9, yerel kaynakta v8'in sonraki kodudur. Play Console'daki en yüksek yüklenmiş kod imzalı paket üretim/yükleme öncesinde ayrıca doğrulanmalıdır.

## Doğrulama

- 658 istemci testi geçti.
- 1659 sunucu testi geçti, 44 dış servis koşullu test atlandı; bunlar geçti sayılmaz.
- 10 üretim web paketleme testi geçti.
- 22 operatör/yayın aracı testi geçti.
- 417 Python dosyası, 0 import sorunu.
- İzole üretim web build: `80f76fbd4d5328d2`, 619 varlık; `artifacts/web-2.1.1-h5FJ1n/dist/`. Mevcut dist ezilmedi. Test API'si ve faz probu üretim bundle'ında yok.
- Son 3 tarayıcı × 3 senaryo E2E: **8 geçti / 1 başarısız**. Tek kalan hata Windows WebKit FPS bütçesi. Sonradan eklenen gerçek mesaj-düğmesi → Sistem sekmesi kontrolü de üç tarayıcıda geçti. İşlevsel geçiş veya sıfır 1-saniye donma, oynanabilir FPS kanıtı değildir.

Son ölçüm (headless, 18s gerçek UI-deploy akışı; fiziksel cihaz onayı değil):

| Proje | Ortalama FPS | p95 kare | >1s donma | Bütçe |
|---|---:|---:|---:|---|
| Masaüstü Chromium | 126.6 | 8.5ms | 0 | Geçti |
| Android boyutlu Chromium | 125.9 | 8.5ms | 0 | Geçti |
| Windows iPhone/WebKit öykünmesi | 1.9 | 590.5ms | 0 | Kaldı |

Üçünde de rig offsetWidth okuması sıfır. WebKit sonunda Düşük/perspektif kapalıydı; raporun başlangıç bağlamındaki Yüksek etiketiyle karıştırılmamalı. Son matris kanıtı: `artifacts/performance-2.1.1-20261022/final-matrix-results.json`.

## Açık performans kapısı

Masaüstü Chromium ve Android boyutlu Chromium önceki ölçümlerde p95 7.5–14.5 ms, sıfır >1 saniye donma gösterdi. Windows WebKit'te bağımsız requestAnimationFrame sayacı da ~2 FPS gördü. Ölçülen JS savaş aşamaları toplamı kare başına birkaç ms iken sunum aralığı 500–600 ms civarındaydı.

İz kaydı kapatma, DPR 1 kontrolü ve tekil çizim grubu probları sorunu çözmedi. Yüksek özgüllüklü kuralları gerçekten aşan birleşik statik çizim probu yaklaşık 18 FPS verdi; tek size-container sabitlemesi iyileştirmedi. Önceki düşük özgüllüklü CSS izolasyonları tüm oyun kurallarını aşamadığı için tekil efektleri kesin aklamaz. Oyun tasarımı bu teşhisler uğruna kalıcı olarak gizlenmedi/sadeleştirilmedi.

Playwright WebKit, Safari uygulamasının kendisi değildir. Resmî belgeler Safari'ye en yakın kontrol için macOS WebKit'i önerir:
https://playwright.dev/docs/browsers#webkit

Bu, bizim yavaşlığın kesin olarak test aracından geldiğini ispatlamaz ve başarısız FPS kapısını kaldırma gerekçesi değildir. Başarısız ölçüm: `artifacts/performance-2.1.1-20261022/webkit-diagnostic-results.json`. Gerçek telefon/uygun platform ölçümü ve/veya kalan çizim düzeltmesi olmadan “performans bitti” denmemeli.

## Mağaza teslimi

`docs/MAGAZA_GORSELLERI_2_1_1.md`: iki yerleşik görsel üretim promptu, dosyalar, Google Play ölçüleri ve gerçek oyun ekranı çekim aracı. İkon/özellik görseli ayrı adaydır; mevcut launcher/amblem otomatik ezilmedi. Sekiz ekran, canlı hesaba dokunmayan geçici E2E oturumundan gelir.

ZIP: `artifacts/GRIDSHARD-2.1.1-magaza-gorselleri-20261022.zip`, 12 dosya, 11283416 bayt. Boyut/renk kanalları ve bütün görsellerin SHA256 özetleri doğrulandı; trace veya hesap kaydı ZIP'e alınmadı. ZIP SHA256: `43636164af3b280f3504406ae0cd608822ae016be74298306b3f0f5dc2b800ba`.

Ek görsel açık iş: savaş çekirdeği diğer cihazlardan daha yumuşak/pikselli görünüyor. Kaynak gerçek tarayıcıda 384×384, image-rendering:auto, normal filtreyle yükleniyor; düşük çözünürlüklü dosya değil. Sabit ek GPU katmanı denemesi görünümü düzeltmedi ve geri alındı. Görseller bu mevcut davranışı dürüstçe gösteren inceleme adayıdır; kaynak resim veya ekran görüntüsü rötuşlanmadı. Keskinlik/örnekleme ayrıca çözülmeli. Son üretim build'i tekrar aynı `80f76fbd4d5328d2` çıktı.

## Güvenli sonraki sıra

1. Gerçek kullanıcı yerel savaş deneyimini ve uygun cihazdaki uzun savaş kare/bellek ölçümünü doğrula; WebKit başarısızlığını çöz veya platform sınırını kanıtla. Eşik/skip değiştirerek yeşile çevrilmez.
2. Tam testler, üretim paket kontrolü ve fark incelemesi; kullanıcı değişikliklerini koru.
3. Ancak hazır olduğunda commit/push; yeni commit'in CI sonucunu izle.
4. CI ve performans kapıları geçerse kontrollü sunucu geçişi, sağlıkta iki sürüm alanı/protokol doğrulaması; imzalı 2.1.1 AAB, sertifika/varlık denetimi.
5. Play kapalı test yüklemesi/onayı ayrı aşamadır. Bu belge yükleme yapıldığını söylemez.

