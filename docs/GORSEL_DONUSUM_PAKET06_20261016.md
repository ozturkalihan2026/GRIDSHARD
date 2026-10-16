# Görsel dönüşüm — Paket 6 / mağaza ve ödüller

16 Ekim 2026. **Kullanıcı onayladı; on bileşen oyun kaynaklarına bağlandı.**
`client/src/shop-rewards-v6.css` ortak web/native stil bloğunun sonundadır.
Satın alma/ödül işleyicileri, gerçek fiyatlar, ekonomi, ürünler, haklar,
iade koşulları ve sunucu ödül miktarları değişmez. Görsel/oyun kontrolü kullanıcıda.

## Kaynak bağlantısı ve 2.lik önizlemesi

- 1–2: `.chest-store-card`, `.shop-chest-action`; aynı eylem hizası,
  hediye → stok → maliyet önceliği ve fiyat simgeleri korunur.
- 3–4: `.paid-product-card` / `.is-premium`; premium onaylı hediye çizimi,
  gerçek Play fiyatı ve etkin/pasif düğme durumları.
- 5: `.reward-preview-panel`, `#chest-odds-dialog`; okunabilir satırlar,
  %40 duyurusu yalnız ödül listesinin içinde.
- 6–7: `.monthly-login-card`, `.daily-mission-card`; gerçek ilerleme/ödül,
  zeminsiz savaş/deste/kupa ikonları ve dar ekranda görev eylemi alt satırda.
- 8–9: `.season-pass-row`, `.season-pass-cell`, `.reward-resource-row`;
  mevcut sütunlar, kilitler, mesaj kutusuna teslim ve alma işleyicileri korunur.
- 10: `#chest-reveal-card`; mevcut kapalı/açık görsel, kendi renkli efekti
  ve sunucu makbuzuna bağlı sonuç zamanlaması korunur.

2.lik Prizma Kasası önizlemesinde uzun panelin tetikleyici üzerine taşması
mouseleave ile hemen kapanmaya yol açabiliyordu. Panel açık diyalog/görüntü
sınırlarında uygun tarafa yerleşir, yüksekliği sınırlanır ve içi kaydırılır.
180 ms geçiş aralığı fareyi panele taşımaya izin verir; panel içi kaydırma
kapatmaz. Dokunarak sabitleme, dışarı dokunma, Escape ve klavye odağı korunur.
Canlı tarayıcıda birebir yeniden üretim yapılmadı; görsel doğrulama kullanıcıda.

`check-integration.cjs`: sunucudaki gerçek ilk 10 ödül sözlüğünün tamamı ve
2.lik için sekiz içerik satırı, dört dar/geniş ekran/diyalog yerleşimi,
hover geçişi, kaydırma, sabitleme ve kapanma yalıtılmış kontrolden geçti.
`qa_reports/visual-refresh-pack06-integration-20261016.json` ayrıntıları içerir.
11 stil / 34 betik bellekte dönüştürüldü; CSS uyarısı yok. Önceden var olan
20 çeviri anahtarı uyarısı ve 7 istatistik DOM kimliği tekrarına yenisi eklenmedi.

## Onay numaraları — on ortak bileşen

1. Sandık kartları: aynı hizada tek eylem, standart sandık resmi ve para simgesi.
2. Tek düğme durumları: önce hediye, sonra eldeki adet, sonra gerçek maliyet.
3. Para birimi paketi: miktar/fiyat ayrımı ve fiyat bekleniyor/pasif durumu.
4. Premium sezon teklifi: açık teklif ve bu sezon etkin durumları.
5. İçerik önizlemesi/ödül listesi; %40 sürpriz indirim duyurusu içeride kalır.
6. Günlük giriş: alınmış/bugün/gelecek gün ve toplama eylemi.
7. Günlük görev: gerçek ilerleme göstergesine uygun devam/alınabilir/alındı.
8. Sezon ödül hattı: ücretsiz/premium ayrımı, seviye, deneyim ve kilitli durumu.
9. Ödül alma satırı: sandığın mesaj kutusuna aktarılması ile kilitli premium ayrımı.
10. Açılış/sonuç: mevcut Altın Sandık ve açık eşi, kendi renginde kontrollü ışık.

Onaylı sandıklar, ortak ikonlar, Akı/Devre Kredisi ve Rowdies/Rajdhani korunur;
yeni raster veya logo üretimi yok. Premium teklif işareti mevcut altın/mor
hediye çizimini kullanır; yeni lig/kazanılmış kupa işareti eklenmez.
Standart simgelerde 32/48px karşılaştırma, bağlamlarda büyük hâl bulunur.
Yeni ana ekran yerleşimi, dock veya modül/çekirdek çizimi bu pakete eklenmez.

## Önizleme sınırı

Tüm veriler açıkça örnektir. 120 Akı / 29,99 TL ve Sezon Geçişi / 199,99 TL
önceki kullanıcı ekranlarından alınan örnek fiyatlardır; canlı ürün sorgusu
değildir. Görev/sezon seviyeleri de örnektir. Bağlantıda miktar ve uygunluk
mevcut sunucu/Play verisinden okunacak, önizleme değerleri taşınmayacaktır.

Düğmeler yalnız yerel önizlemeyi değiştirir: hediye→stok→maliyet, premium
etkinliği, toplama/alındı, sandık önizlemesi ve kapalı/açık örneği. Hiçbiri
gerçek satın alma, mesaj, ödül veya hesap işlemi yapmaz. Harici kaynak/API yok.
Hücre iç boşluğu, buton pahı ve sandık boyutu isteğe bağlı tasarım kontrolleridir.
320px'de tek sütun; iki sütun yalnız yeterli alan olduğunda kullanılır.

## Dosyalar ve doğrulama

- Kaynak/arşiv: `artifacts/visual-refresh-pack06-20261016/` (Git dışı, ayrıca taşı).
- `gridshard-pack06.source.html`: düzenlenebilir, işaretli yerel asset kaynağı.
- `prepare-preview.cjs`: yalnız teknik küçültme/şeffaflık koruma ve gömme.
- `gridshard-pack06.html`: çevrimdışı/sohbet önizlemesi, 1 MB altında.
- `embedded-assets.json`: mevcut kaynak dosya/ölçü/alpha kaydı.
- `check-preview.cjs`: sözdizimi + yalıtılmış etkileşim kontrolü.
- Rapor: `qa_reports/visual-refresh-pack06-preview-20261016.json`.

CSS/JS dönüşümü ve stok/premium/günlük/görev/toplama/açılış/hover/geri yükleme/
tasarım kontrolü yalıtılmış doğrulaması geçti. İlk yüklemede durum kaydı yok;
yalnız anlamlı yerel etkileşimden sonra kaydedilir. Gerçek tarayıcı çizimi ve
oyun denemesi yapılmadı; kullanıcı kontrol edecek. Yeni tarayıcı, sunucu,
oyun/birim testi, dist/native/AAB, dağıtım, commit/push yok.
