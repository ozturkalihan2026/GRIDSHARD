# Görsel dönüşüm — Paket 2: buton ve hücre ailesi

Tarih: 15 Ekim 2026. Durum: **kullanıcı "bağla" diyerek onayladı; oyuna bağlandı**.
Yerel/görsel oyun kontrolü kullanıcıda. Önizleme dosyası tasarım tarihçesidir.

## Bağlantı ve güncel durum

Ortak kaynak `client/src/ui-components-v2.css`; `client/index.html` derleme stil
bloğunda son sırada yüklenir. Web ve native aynı stil girişlerini kullanır.
10 ortak bileşen mevcut seçici/durum adlarına bağlandı; DOM kimlikleri, olaylar,
disabled/ARIA durumları, değerler ve oyun JavaScript'i değiştirilmedi.
Onaylı derinlik 4px, pah 7px, üst ışık %32; küçük varyant 3px/5px.

Buton yüzeyi tek `::before` katmanını kullanır; bildirim rozetlerinin `::after`
alanı korunur. İkon eylemleri normal/hover/basılı/açık durumda zeminsizdir.
Maliyet rozetlerinde metin butonun kontrastlı rengini devralır; ayrı koyu fiyat
levhası kaldırılır. Kozmetik arka plan renk örnekleri ve takım isteklerindeki
enderlik kenarları ortak mavi yüzeyle örtülmez. Fiziksel sandık düğmeleri,
onaylı dock, avatar/modül/çekirdek çizimleri yeni buton eşlemesine dahil edilmez.

Bellekte CSS paketlemesi, JS hedef dönüşümü, test dosyası sözdizimi ve diff
kontrolü geçti. Yeni yüzeyde dış dosya/ağ bağımlılığı yok. Metin/ana yüzey
kontrastları 4,67–9,25:1. Değişmemiş çeviri JavaScript'inde 20 mevcut yinelenen
anahtar uyarısı var; bu kapsamda düzeltilmedi. Tam derleme/dağıtım, oyun/birim
testi, tarayıcı/test sunucusu veya commit/push yapılmadı.
`client/tests/ui-components-v2.test.js` statik regresyon sözleşmesi eklendi;
yalnız sözdizimi kontrol edildi, test paketi çalıştırılmadı.
Kayıt: `qa_reports/visual-refresh-pack02-20261015.json`.

## Tasarım kararı

Onaylı keskin sandıkların geniş/sade pahları, dolu yüzeyleri ve kontrollü
üst-sol ışığı ortak arayüz yüzeylerine uyarlanır. Yeni nesne/ikon çizimi yok.
Ana eylem altın, toplama/başarı yeşil, ikincil eylem mavi, silme kırmızı;
seçim turkuaz. Bunlar aynı geometri ailesinin anlamsal varyantlarıdır.
Mevcut eylemlerin anlamı ve kullanıcı beklentisi renk uğruna değiştirilmez.
Derinlik 4px, ana köşe pahı 7px; küçük düğmede 3px/5px. Üst ışık metnin
altına gelmez. Şeffaf/neon çerçeve yerine dolu, okunaklı, hafif hacim.

Rowdies başlık/düğme, Rajdhani gövde düzeni korunur. Metinler raster görsele
gömülmez. Onaylı ikonlar ve Altın Sandık yalnız bağlam örneğidir, yeniden
üretilmedi; önizlemeye mevcut oyun dosyalarından birebir gömüldü.

## Onay numaraları ve entegrasyon hedefleri

Bu liste onaylı numaraları ve ortak stilin bağlandığı bileşen ailelerini izler.

| No | Ortak bileşen | Durum / örnek | Onay sonrası kaynak hedefi |
| --- | --- | --- | --- |
| 01 | Ana eylem | Altın; yeşil toplama varyantı; normal/basılı/pasif | Ortak düğme tokenları, ana onay ve toplama eylemleri; satın alma davranışı korunur |
| 02 | İkincil eylem | Mavi; normal/basılı/pasif | Bilgi/geri/ayrıntı düğmeleri, `.module-quick-actions` yüzeyi |
| 03 | Uyarı / silme | Kırmızı; normal/basılı/pasif | Mesaj silme, tehlikeli eylem varyantları; mevcut onay kapıları korunur |
| 04 | Kart / liste yüzeyi | Normal ve kompakt; içerik nesnesinden ayrı yüzey | `--gs3-slab` ailesi, ortak liste ve kart yüzeyleri; ekran kompozisyonları sonraki paketlerde |
| 05 | Seçim hücresi | Normal/seçili/kilitli; metin + işaret + kesikli sınır | Seçilebilir ortak hücre; kozmetik portre/modül/çekirdek çizimleri değiştirilmez |
| 06 | Sekmeler | Normal/kompakt; seçilide dolgu + alt çizgi | `.reward-inbox-tabs`, `.friends-tabs`, `.settings-category-tabs`, `.cards-page-tabs` ve ortak sekme ailesi |
| 07 | Giriş alanları | Normal/odak/kilitli; kompakt varyant | `.friend-search-form`, `.profile-name-form`, ayar metin/giriş alanlarının ortak yüzeyi |
| 08 | Aç / kapat | Açık/kapalı/kilitli; konum + tik/eksi + yazı | `.settings-toggle` içindeki mevcut checkbox; kimlik, değer ve olaylar korunur |
| 09 | İlerleme çubuğu | Normal/ince; sıfır/kısmi/tam | Ortak ilerleme yüzeyi; değer/hesap aynı kalır, savaş HUD'una özgü tasarım Paket 7'de |
| 10 | Zeminsiz ikon eylemi | 50/40px; normal/küçük/pasif; ayrı levha/kenarlık/gölge yok | Aynı tipteki tüm bağımsız ikon eylemleri; onaylı ortak ikon dosyaları değişmez |

Kullanıcı revizyonu: **yalnız profil barı değil, bu tipteki tüm bağımsız ikon
eylemleri zeminsiz olacak.** Bilgi, ayarlar, posta, menü ve benzeri bağımsız
ikonların arkasında ayrıca levha/dolgu/kenarlık/gölge/parlama olmaz; hover,
basılı ve seçili durumda da düğme zemini geri gelmez. İkonun kendi onaylı
çizimi değişmez. Görünmez tıklama alanı, erişilebilir ad, bildirim rozeti ve
klavye odağı korunur; pasiflik disabled + düşük ikon opaklığıyla ayrılır.
Bu kural metinli eylem butonlarını, sekme/kart yüzeylerini veya onaylı dock'u
zeminsiz yapma talebi değildir. Bu ayrımla oyun entegrasyonu yapıldı.
Onaylı dock'un zemini/ikonları, sandık çizimleri,
para birimleri, kupa ve Paket 1 dosyaları korunur. Modül bilgi penceresine
yeni kapatma düğmesi eklenmez. Pencere/ekran yerleşimlerinin yeniden tasarımı
bu paketin ortak yüzey hazırlığını aşmaz.

## Önizleme ve onay süreci

- Numaralı tek tasarım ailesi; büyük/küçük kullanımlar ve durum örnekleri.
  Sekme, seçim hücresi ve anahtarlar yalnız önizleme içinde çalışır.
- Tweak üzerinden pah/derinlik/üst ışık ayarlanabilir; bu oyun ayarı değildir.
- Kullanıcı topluca veya numara bazında onaylar. Onaydan önce runtime bağlantısı
  yapılmaz; itiraz edilen parçalar revize edilir.
- Onay sonrası ayrı ve ortak kaynaklı CSS uygulaması; geniş `button` geçersiz
  kılmaları yerine kapsamlı seçiciler/ortak tokenlar. Mevcut DOM kimlikleri,
  disabled/ARIA durumları, tıklama alanları ve oyun işleyicileri korunur.
- Dokunmada en az 44px hedef; dar ekranda satır kaydırma; klavye odağı görünür.
  Seçili/pasif/kilitli durumlar yalnız renk farkından oluşmaz. Sürekli animasyon,
  dış parlama ve pahalı blur/filter yok. Görsel kontrol kullanıcıda.

## Dosyalar ve doğrulama

Taşınabilir önizleme: `artifacts/visual-refresh-pack02-20261015/gridshard-pack02.html`.
Statik/yalıtılmış etkileşim kontrolü: aynı klasörde `check-preview.cjs`.
Bu klasör Git dışıdır; iş/ev bilgisayarları arasında ayrıca taşınmalıdır.
Önizleme 1 MB altında, tüm font/resimler içinde; dış ağ isteği yok.
Rowdies 700, Rajdhani 600 Latin/genişletilmiş Latin mevcut lisanslı dosyalardır.

Kontrol: 10 benzersiz parça, benzersiz DOM kimlikleri, HTML fragment sözleşmesi,
JS/CSS chrome109/safari15 sözdizimi dönüşümü geçti. Yalıtılmış önizleme kontrolü
düğme sonucu, seçim, sekme, anahtar ve durum geri yükleme işlemlerini doğruladı.
Bu kontrol gerçek tarayıcı çizimi veya oyun/birim testi değildir. Büyük/küçük
yerleşimin gerçek tarayıcı görsel doğrulaması yapılmadı. Yeni tarayıcı/test
sunucusu, oyun testi, web/native dağıtım, commit/push başlatılmadı.

Kontrolü yeniden çalıştırma (oyun başlamaz):

```powershell
node artifacts/visual-refresh-pack02-20261015/check-preview.cjs
```
