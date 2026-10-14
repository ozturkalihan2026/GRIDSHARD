# Profesyonel görsel rötuş — 13 Ekim 2026

Kullanıcı görsel inceleme önerilerini uygulamamı istedi; **modül bilgi penceresine kapatma düğmesi eklenmesini açıkça hariç tuttu**. Bu çalışma mevcut görsel tur 6 üzerindedir. Eski/başka araç değişiklikleri korunmuştur.

## Yapılanlar

- `client/src/canon.css` sonunda ayrı `Profesyonel rötuş` bloğu: açıklamalar 12 px, kart adları 11–12 px, fiyatlar 14 px, bölüm başlıkları 16 px. Gövde 500–600, başlık 700–800; font aileleri korunur.
- Açık turkuaz sekmelerde koyu lacivert yazı; iki degrade ucunun normal-metni kontrastı regresyon testiyle >= 4,5:1.
- Arka plan deseninin beyaz katmanı 0,04 → 0,018; gömük okuma yüzeyleri düz. Kartların dış halkası, renkli alt dudağı ve güçlü halo katmanları azaltıldı.
- Premium kartlarda sakin mor yüzey; sandık, modül sınıfı ve enderlik renkleri korunur.
- Pasif alt gezinme ikonları çelik tonunda; aktif ekranın rengi, mevcut yükselme/genişleme ve bildirim noktaları korunur.
- Aynı SVG'nin küçük kullanımında yalnız dekoratif ışık/gölge/parıltı yolları gizlenir; mekanik işaretler, siluetler ve sınıf eşlemeleri değişmez. Büyük bilgi amblemleri yeniden çizilmedi.
- Savaş hasar yazısının konturu 3 → 1,25 px; sıradan kıvılcım ve sürekli hazır-güç halosu sadeleşti. Ağır darbe, yok olma ve çekirdek patlaması katmanları korunur.
- Sandıkların dört satırlı ızgarasında bilgi alanı esner; hediye geri sayımı olsa da aynı sıradaki eylem düğmeleri hizalı kalır. Dar ekranda günlük-limit etiketi 10 px ve bölünmeden görünür.

## Değişmeyenler

Uygulama JS'i, sunucu, ekonomi, ödeme/iade akışı, ödül teslimi, marka görselleri, sürüm kodu ve modal kapatma davranışı bu çalışmada değiştirilmedi. Commit/push, APK/AAB üretimi, sunucu/site/Play yayını yapılmadı. Faz 4 bu talebin kapsamı değildir.

## Doğrulama

- İlgili 5 görsel test dosyası: **52 / 52 geçti** (yeni `professional-polish.test.js` içinde 6 test dahil).
- Paketleme regresyonu: **9 / 9 geçti**. İlk koşu Windows sandbox `rename` iznine takıldı; aynı test kontrollü olarak dışarıda yeniden koşuldu. Geçersiz kaynak testi bilerek hata çıktısı üretir.
- CSS, chrome109 / safari15 hedeflerinde esbuild ile bellekte derlendi: **0 uyarı**. Mevcut `dist/` veya yayın paketleri üzerine yazılmadı.
- Genel istemci testleri: **412 geçti, 1 başarısız**. Başarısız `beta50-visual-feedback.test.js`, değiştirmediğim `app.js` içinde artık bulunmayan `scheduleBattleSweep(170, feedback)` metnini arıyor. Bu çalışma başlamadan `app.js` ve `battle-presentation.js` başka savaş düzenlemeleriyle zaten değiştirilmişti. Test beklentisi körlemesine kaldırılmadı; geniş savaş düzenlemesiyle birlikte değerlendirilmelidir. Sandbox hard-link engeline takılan native-billing testi ayrı izinli koşuda 4/4 geçti ve genel izinli koşuda da geçti.
- Görsel tur 6 testinin blok sınırı yeni rötuş işaretinde bitirilir; eski VFX kontrolü sonraki bağımsız yüzey gölgelerini yanlışlıkla taramaz. Asıl VFX beklentileri korunmuştur.
- Codex iç tarayıcısında yalıtılmış yerel hesap; 393×852 ve 320×568 mağaza, modül kartları ve Lazer bilgi paneli. Sandık düğmeleri aynı sırada hizalı, günlük limitlerde ve sayfada yatay taşma yok; açıklamalar 12 px, fiyatlar 14 px. Dar bilgi panelinin gövdesi kaydırılabilir; üç üst istatistik iki satırda ve taşmasız.
- Gerçek Android cihazda görülmedi; tüm 36 modülün her bilgi sayfası/efekti ve bütün dil/ekran kombinasyonları denenmedi. Canlı ödeme testi yapılmadı.

## Görseller ve ölçüm kaydı

`artifacts/professional-visual-audit-20261013/` içindeki eski inceleme görselleri korunur; bu çalışmanın dosyaları `*-after-*` adını taşır. `PROFESYONEL_GORSEL_INCELEME.md` öneri aşamasının tarihsel kaydıdır, uygulama sonucu değildir.

Bir sonraki paket öncesi genel savaş regresyonundaki tek hata çözülmeli; gerçek telefon görünümü kullanıcı tarafından değerlendirilmelidir. Görsel blok doğrudan `canon.css`'tedir; eski `apply4.py` / `apply6.py` dosya sonunu yeniden üretirse bu bloğu silmemelidir.
