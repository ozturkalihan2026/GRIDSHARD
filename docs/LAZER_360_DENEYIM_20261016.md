# Lazer 360° yönelme ve deneyim simgesi

16 Ekim 2026. Kullanıcı mevcut hedef kilidini doğruladı; Lazer'in kesintisiz hedef açısına dönmesini ve namludan kırmızı ışın göndermesini istedi.

## Kaynaklara bağlanan değişiklik

- Yalnız savaş alanındaki Lazer yeni **üstten görünüşlü 2D başlık + sabit kaide** kullanır. Tam 3D model değildir. Tek tek 360 kare yok; tek çizilmiş başlık CSS dönüşüyle ara açılar dahil her yöne bakar.
- Kart/koleksiyon/raf Lazer çizimi değişmedi. Diğer dört hareketli cihazın dört yönlü sunumu değiştirilmedi. Reddedilen teknik WebGL pilotu yeniden bağlanmadı.
- Hedef kilidi korunur; yeni gerçek hedef geldiğinde en kısa dönüş yolu seçilir. Her atış arasında boş yere başlangıç yönüne dönmez. Taban ve CAN/ısı çubukları dönmez.
- Gerçek `attack_performed` olayında başlık hedefe hizalanır; ışının başlangıcı kayıtlı namlu noktasıdır. Sadece hazırlık/hedef kilidi olayı ışın üretmez. Hasar, bekleme, hedef ve enerji sunucuda kalır.
- Kırmızı ışın iki oyuncu ve savunulmuş vuruşlar için aynı renktedir. Başka silahların lazer efektini kullanması onların rengini değiştirmez.
- `laser-aim.js` dört sabit düzlem köşesinden perspektif dönüşümünü hesaplar; hem düz hem eğimli kamera için başlık açısı ve namlu başlangıcı aynı geometriyi kullanır. Okumalar mevcut görev-bazlı çapa ölçümüne katılır, her Lazer için dört ek nokta ölçülür. Her başlığa ayrı saat/rAF/canvas eklenmez.
- Yeniden boyutlandırma/kamera değişimi kilit yönünü yeniler. Eksik DOM için sınırsız rAF tekrarına girmez. Düşük grafik ve azaltılmış hareket durumunda yön doğru açıya anında geçer.
- Deneyim simgesi: altın çerçeveli turkuaz/yeşil ilerleme arması. Zafer ekranındaki sabit HTML ve bütün dinamik deneyim ödülleri aynı `.experience-art` kaynağını kullanır; eski yıldız SVG'si kaldırıldı.

## Varlıklar ve promptlar

Built-in image_gen kullanıldı; CLI/API kullanılmadı. İlk başlık yan perspektifi koruduğundan reddedildi; üstten plan görünüşü için yeniden üretildi. Sonrasında yalnız uniform küçültme ve şeffaf dolgu ile mil/namlu kaydı yapıldı; elle yeniden çizim yok.

- `client/assets/ui/laser-yaw-v1/head.webp`: 256px, 9.256 bayt.
- `client/assets/ui/laser-yaw-v1/base.webp`: 256px, 15.534 bayt.
- `client/assets/ui/experience-v1/experience.webp`: 192px, 15.006 bayt.
- Toplam **39.796 bayt**; gerçek alpha doğrulandı, PNG asılları Git'e eklenmedi.
- Tam promptlar, referanslar ve kayıt ölçüleri: `docs/LAZER_360_DENEYIM_PROMPTLARI_20261016.json`.
- Hazırlama/önizleme: `tools/prepare-laser-yaw.cjs`.
- Yön levhası: `artifacts/laser-yaw-v11-20261016/laser-directions-preview.webp`. Bu bir asset önizlemesidir, gerçek oyun ekran görüntüsü değildir.
- Hafif çıktı raporu: `qa_reports/laser-yaw-v11-assets-20261016.json`.

## Kontrol ve sınırlar

129 odaklı Node testi başarılı. Yeni kontroller: 360° boyunca kesintisiz açı, kısa yol/sınır geçişi, eğimli kamera izdüşümü, namlu/hedef doğrultusu, gerçek atış fonksiyonunda başlangıç/bitiş noktası, sabit kaide ve kalıcı düğümler, kamera değişiminde hedef kilidi ve sınırlı uyandırma, ortak deneyim kaynağı ve web/native asset listesi.

38 betik / 16 stil kaynak denetimi başarılı. CSS uyarısı yok; mevcut 20 çeviri anahtarı uyarısı değişmedi. Gerçek oyun/tarayıcı/telefon görüntüsü ve FPS ölçülmedi; kullanıcı yerelde deneyecek. Sunucu, çalışan tarayıcı, dist/native paket, commit/push değiştirilmedi.
