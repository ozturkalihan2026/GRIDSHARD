# Görsel dönüşüm — Paket 7 / savaş ve kalan ekranlar

16 Ekim 2026. **Kullanıcı onayladı; on bileşen oyun kaynaklarına bağlandı.**
`client/src/battle-utility-v7.css` ortak web/native stil bloğunda en sonda.
Paket 6 kaynaklara bağlıdır. Görsel/oyun kontrolü kullanıcıdadır.

## Bağlantı ve korunan işleyiş

Onaylı yüzeyler tablodaki mevcut hedeflere uygulandı. Boş hücreler ve gerçek
`tap-drop-target` / `debris-cell` durumları, rafın `data-playable` /
`data-affordable` ayrımı, `victory/defeat/draw` ve bağlantının
`connecting/reconnecting/open/closed/error` değerleri kullanılır.
Yeni durum/ödül veya ağ protokolü eklenmedi.

Görünür sonuç başlığı `#post-match-reward-outcome` üzerinden temalandırıldı;
mevcut yerleşimde gizlenen eski hero ayrıca açılmadı. 5×3 saha, raf ölçüleri,
gerçek can pseudo-elementleri, kalıcı savaş DOM'u, hasar/enerji efektleri,
çekirdek hareketi ve ayar anahtarlarının mevcut geometrisi korunur.
Yerleştirme, can, geri sayım ve sonuç hesaplama kodları aynı kaldı.
Oturum/bağlantı kurtarma pencereleri de aynı yüzey/yeniden deneme ailesinde.
Native Play/OS ödeme ve onay pencerelerinin görünümü değişmedi.

`check-integration.cjs` ile 12 stil bellekte paketlendi; CSS uyarısı yok.
Tahta, kalıcı savaş kartı, modül çizim sahibi ve geri sayım dosyalarının
HEAD ile aynı olduğu; altı kritik işleyicinin aynı kaldığı doğrulandı.
Rapor: `qa_reports/visual-refresh-pack07-integration-20261016.json`.
Tarayıcı/oyun/birim testi, sunucu veya dağıtım çalıştırılmadı.

## Onay numaraları ve bağlantı hedefleri

| No | Bileşen | Onay sonrası mevcut hedef |
| --- | --- | --- |
| 1 | Çekirdek canı, enerji/akım HUD satırları | `.combat-summary-panel`, `.duel-side-heading`, `#shelf-credit-indicator` |
| 2 | Boş/dolu/seçili/kapalı savaş hücreleri | `.board-cell`, mevcut yerleştirme/işgal durumları |
| 3 | Raf, seçim, kullanılabilirlik | `#module-shelf`, mevcut kart/kaynak uygunluğu |
| 4 | Hazır/3–2–1/savaş geçişi | `#battle-start-countdown`, mevcut sunucu zamanlaması |
| 5 | Zafer/yenilgi/beraberlik ve ödül özeti | `#battle-result-hero`, `.post-match-panel`, gerçek makbuz |
| 6 | Ayarlar, ses, kalite ve anahtarlar | `#settings-summary-panel`, mevcut dört sekme |
| 7 | Onay/iptal yüzeyi | Uygulamanın mevcut özel onay pencereleri; native Play izin/ödeme arayüzleri hariç |
| 8 | Bildirim/eylem geri bildirimi | Mevcut bildirim ve status alanları, mesaj teslimi aynı |
| 9 | Eğitim kartı, hedef vurgusu ve ilerleme | `#tutorial-overlay`, mevcut eğitim adımları |
| 10 | Boş/yükleniyor/hata/yeniden bağlantı durum ailesi | Mevcut yükleme, hata ve bağlantı kurtarma yüzeyleri |

Aynı ortak parçanın durumları tek aile sayılır; toplam on bileşen.
Ana ekran/dock yerleşimi, 5×3 savaş sahaları, rafın gerçek kart adedi ve
mevcut arka plan/çekirdek hareketi korunacak. Önizlemedeki hücre/raf örnekleri
durum örnekleridir, yeni savaş tahtası veya üç kartlık deste önerisi değildir.

## Görsel sınırlar

Paket 2/6 ile aynı geniş pahlar, derin mavi yüzey, sakin kontur, mint seçim
ve altın birincil eylem. Buton yüzü kendi siluetini taşır; köşelerde kare
siyah dolgu yok. Savaşta sürekli parlama/blur ve yeni çizim döngüsü yok.
Durumlar yalnız renk ile anlatılmaz; metin ve kullanılamazlık da görünür.
Mevcut simgelerin 32/34px ve 64px bağlamları birlikte sunulur.

Altı onaylı raster (savaş, kupa, kredi, ayarlar, hediye, bilgi) yeniden
kullanıldı. Üç modül örneği (`Lazer`, `Kalkan`, `Onarım`) mevcut
`module-card-view.js` ve `canon.css` çizimlerinden teknik olarak gömüldü;
yeniden çizilmedi. Modüller ve çekirdekler Paket 8'e bırakıldı.

## Örnek davranış ve doğrulama

Tüm can/enerji/akım/ödül/sonuç değerleri örnektir; canlı hesap verisi veya
yeni denge önerisi değildir. Düğmeler yalnız önizlemeyi değiştirir. Ayarlar
gerçek oyuna yazılmaz, mesajlar silinmez, satın alma/ödül/ağ işlemi yapılmaz.
Geri sayım örneği düğmeyle ilerler; sonuç, sistem durumu ve eğitim değişir.
Hücre iç boşluğu ve buton pahı isteğe bağlı tasarım kontrolleridir.

- Arşiv: `artifacts/visual-refresh-pack07-20261016/` (Git dışı; ayrıca taşınır).
- `gridshard-pack07.source.html`: düzenlenebilir kaynak; final gömülü fragment 185,664 bayt.
- `prepare-preview.cjs`: bitmap teknik küçültme, mevcut vektör/font gömme.
- `check-preview.cjs`: yalıtılmış DOM etkileşimleri, kaynak/CSS/JS denetimi.
- Rapor: `qa_reports/visual-refresh-pack07-preview-20261016.json`.

On bileşenin yerel etkileşimi, geri yükleme ve tasarım ayarı kontrolleri geçti.
İlk yükleme/geri yükleme durum kaydetmez; kullanıcı etkileşimi kaydeder.
Harici kaynak/API yok, tek HTML fragment 1 MB altında; dar ekran tek sütun.
Tarayıcı/oyun/birim testi veya sunucu başlatılmadı; görsel test kullanıcıda.
Dağıtım, AAB, dist/native üretimi, commit/push yapılmadı.
