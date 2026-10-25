# Savaş kök boyaması ve WebKit ölçümü — 25 Ekim 2026

## Ürüne uygulanan düzeltme

`styles.css` içindeki eski global `body` temasının dört CSS gradyanı,
güncel savaş kaidelerinin arkasında gerçekten computed style'a giriyordu.
Menüler bu temayı kullandığı için tüm dosyayı silmek doğru değildi.

`battle-platform-v17.css` savaş görünümünün kök yüzeyini opak `#07142b`
yapıyor. `body[data-app-screen="play"]` kapsamı hazırlık, savaş ve maç sonu
geçişini de kapsar; menüye dönünce mevcut menü arka planı geri gelir.
Çalışma anında savaş body'sinde `background-image:none` doğrulandı.

Aynı görünümde `.arena-panel` üzerinde kalan eski 44px iç / 24px dış bulanık
gölgeler kaldırıldı. Devrelerin WebP kaideleri, arka plan blokları ve renkli
enerji kanalları korunur. Kamera, cihaz/çekirdek boyutları, bar konumları,
çizim sırası, ses ve savaş kuralları değiştirilmedi. Yeni katman, bitmap,
zamanlayıcı veya animasyon eklenmedi.

## Gerçek bütçe testi

Aynı mevcut 18 saniyelik savaş senaryosu, eşikler düşürülmeden çalıştırıldı.
Windows üzerindeki tarayıcı/emülasyon örnekleri:

| Profil | Önce ortalama FPS | Sonra ortalama FPS | Sonra p95 ms | Bütçe |
| --- | ---: | ---: | ---: | --- |
| Desktop Chromium | 140.6 | 141.3 | 7.5 | Geçti |
| Android Chrome emülasyonu | 140.7 | 139.8 | 7.5 | Geçti |
| iPhone WebKit emülasyonu | 4.3 | 7.6 | 174.5 | **Başarısız** |

Bu farklı canlı maç örnekleri tek başına bir yüzde kazancı veya fiziksel
telefon FPS garantisi vermez. Özellikle WebKit otomatik kaliteyle Düşük'e
indi. Kök gradyan/blur maliyeti giderildi; **genel WebKit FPS sorunu çözülmüş
sayılmaz**. Bütçe testinin kırmızısı gizlenmedi, eşikler ve ana FPS iddiaları
gevşetilmedi. Bu çalışma sunucu dağıtımı veya AAB üretimi yapmaz.

## Kalan darboğazı ayıran deneyler

Ürün koduna eklenmeyen, sabit Yüksek kalite WebKit tanıları:

- Kontrol: yaklaşık7.6 FPS.
- Aynı ekran geometrisini veren affine2B kamera: yaklaşık7.6; konum farkı0.
- İki statik zemin için `will-change:transform`: yaklaşık7.6.
- Panelde `contain:paint`: yaklaşık7.5.
- Zemini gizlemek: yaklaşık9.2; cihazları gizlemek: yaklaşık7.7.
- Efekt boyamasını gizlemek: yaklaşık9.0.
- Canvas tick'ini durdurmak: yaklaşık7.6.
- Sahneyi gizlemek ve canvas tick'ini durdurmak: yaklaşık11.7.
- Filtre/gölge/metin gölgesini kaldırmak: yaklaşık8.0.
- CSS animasyonlarını durdurmak: yaklaşık8.1.
- Bütün CSS arka plan görsellerini gizlemek: yaklaşık7.5.
- Arena size-container'ını kaldırmak: yaklaşık4.0; **daha kötü**, ürüne alınmadı.
- Bütün DOM'u display:none yapmak: yaklaşık61.6. Bu hem düzen/ölçüm yolunu
  hem boyamayı değiştirir; tek başına belirli bir CSS satırını suçlamaz.
- Aynı393×659/DPR3 boş sayfa: yaklaşık62 FPS; tek hareketli kare: yaklaşık66.
  Dolayısıyla bu ortam için7 FPS'lik mutlak emülatör sınırı iddia edilemez.

Deneyler ürün kabul testi değildir. Görselleri gizleyerek alınan FPS,
oyunun oynanabilirliği diye raporlanamaz. İşe yaramayan kamera/containment/
önbellek değişiklikleri veya görsel/efekt kapatmaları ürüne taşınmadı.
Canvas DPR1 tanısında her ensure çağrısında layoutDirty kullanılmıştır;
bu örnek ek ölçüm maliyeti içerir ve DPI kazancı hakkında karar verdirmez.

## Kanıt ve tekrar üretim

- `artifacts/battle-root-paint-before.log`, `battle-root-paint-after.log`
- `artifacts/battle-root-paint-before-20261025/`, `battle-root-paint-after-20261025/`
- `artifacts/battle-paint-probe-20261025/`: tanı kaynakları ve ayrı ham günlükler
- `artifacts/battle-root-paint-visual-20261025/`: görsel/geometri regresyonları
- `e2e/battle-render-budget.spec.js`: asıl kabul testi; artık gerçekten
  boyanan kök/ata yüzeylerin computed style'larını da raporlar.

İstemci734/734, paketleyici10/10 ve üç tarayıcıda3/3 görsel regresyon testi
geçti. Devre görüntüsü, yerleşim, bar/enerji katmanları ve darbe çerçeveleri
korundu; savaş kökünde gradyan ve panelde eski blur olmadığı doğrulandı.
Üretim öncesi genel WebKit
FPS kapısının başarısızlığı açık bir kalan iştir; fiziksel WKWebView testi
bu çalışmada yapılmadı.
