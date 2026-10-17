# Bilgi kartları ve sekme ikonları — 16 Ekim 2026

> Pencere yerleşimi ve sayfalama bölümleri 17 Ekim'de değiştirildi.
> Güncel kayıt: `BILGI_KARTLARI_V16_20261017.md`. İkon üretim kökeni geçerlidir.

## Uygulanan kapsam

- Çekirdek/Takım lider panosu sekmeleri ve Kartlar/Çekirdek sekmesi yeni raster ikonlara bağlandı.
- 10 ayrı built-in image_gen çağrısı: Çekirdek, Takım, Enderlik, CAN, Hasar, Aralık, Enerji, Yetenek, Sınıf, Savunma.
- Stil referansı onaylı `battle-swords-v2.webp`: canlı renk, belirgin koyu kontur, hacimli metal kenar, üst-sol ışık; bağımsız buton zemini yok.
- Enderlik için ayrı `rarity` anlam anahtarı var; hediye kutusu kullanılmıyor. Hediye/paket simgesinin diğer kullanım anlamları değişmedi.
- Özel modül etkilerinde Onarım/Soğutucu/Batarya'nın mevcut onaylı fiziksel çizimleri tekrar kullanıldı.
- Modül ve çekirdek pencereleri aynı kompakt başlık, koyu gövde, belirgin çerçeve ve okunur buton ailesini kullanıyor. Başlıkta kapat düğmesi var.
- Tekrar eden üst istatistik özeti kaldırıldı; sayısal bilgiler İstatistik'te. Sınıf/enderlik ve değer kutuları ortak 11px etiket / 13px değer ölçüsünde.
- Genel'de rol açıklaması, imza, karşı hamle, açılış ve modül uyumları; İstatistik'te tüm sunucu değerleri; Yetenekler'de mevcut seçimler, maliyet ve sıfırlama korunur.
- Tekrarlanan uzun enderlik açıklaması ve ayrı sayısal etki paragrafı gösterilmiyor. Sunucu verisi veya mekanikler değiştirilmedi.

## Kaydırma yerine alana göre sayfa

`detail-card-layout.js` gerçek panel yüksekliğinde içerik bloklarını ölçer. Sığan bilgi tek sayfadır; uzun istatistik/yetenek listesi aynı alanda önceki/sonraki düğmeleriyle açılır. Satır, seçenek veya değer kırpılmaz. Başlık/işlem/ana sekmeler yerinde kalır.

Gerçek düğümler taşınır; seçim/yükseltme dinleyicileri yeniden oluşturulmaz. Yeniden boyutlandırma ve font yüklenmesi ölçümü yeniler; eski gözlemci temizlenir. Odak taşınırken korunur. Aşırı kısa yatay ekran veya büyük erişilebilirlik yazısında tek bölünemez blok bile sığmazsa güvenlik amaçlı kaydırma kalır; içerik gizlenmez.

Gerçek tarayıcı/telefon yerleşimi bu turda doğrulanmadı. Kullanıcının mevcut yerel testi esastır; normal dikey ekran hedeflenir.

## Dosyalar ve üretim

- Runtime: `client/assets/ui/detail-icons-v1/` — 10 gerçek alpha WebP, 192×192, toplam **137.552 bayt**. PNG asılları Git'e eklenmedi.
- Eşleme/yüzey: `client/src/detail-cards-v10.css`; çağrı adları `client/src/app.js`.
- Promptlar ve üretim kökeni: `docs/GORSEL_DONUSUM_BILGI_KARTLARI_PROMPTLARI_20261016.json` (built-in mod; CLI/API kullanılmadı).
- Mekanik küçültme: `tools/prepare-detail-icons.cjs`; üretimden gelen şekil ve alpha korunur.
- Önizleme: `artifacts/visual-refresh-detail-cards-20261016/detail-icons-preview.webp` (Git dışında).
- Kontrol: `tools/audit-detail-cards.cjs`; bellekte gerçek CSS paket çözümlemesi tüm 10 dosyayı içeriyor. Diskte dist üretilmedi.
- Sonuçlar: `qa_reports/detail-icons-v10-20261016.json`, `qa_reports/detail-cards-v10-audit-20261016.json`.

## Doğrulama

Yeni testler: sayfa paketleme, eksiksiz sıralama, büyük blok güvenliği, gerçek düğmelerin/dinleyicilerin korunması, boyut değişimi, gözlemci temizliği, iki pencere bağlantısı, ikon anlamları ve ortak tipografi. Eski SVG-only görsel testleri mevcut ilk 10 fiziksel modül ve kart biçimli parça kaynağına uyarlandı.

37 betik / 15 stil hedef sözdizimi kontrolü başarılı; CSS uyarısı yok, mevcut 20 çeviri-anahtarı uyarısı değişmedi. Yeni tarayıcı/sunucu başlatılmadı; canlı oyun, hesap, sunucu mekaniği, dağıtım ve Git commit/push değiştirilmedi.

Odaklı Node paketi: **122/122 başarılı**. Ayrı çalışma dizini gerektiren beta62 regresyon sözleşmesi de başarılı. Relay dosyasının içindeki 176 alt doğrulama ayrıca geçti; toplam sayıya ikinci kez eklenmedi.
