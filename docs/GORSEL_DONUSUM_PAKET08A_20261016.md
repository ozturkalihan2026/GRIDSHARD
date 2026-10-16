# Görsel dönüşüm — Paket 8A / ilk on modül

16 Ekim 2026. **Çizimler ve etkileşimli önizleme hazır; onay bekliyor.**
Paket 7 oyuna bağlıdır. Bu on modül henüz oyuna bağlanmadı.

Katalogdaki ilk on tanım, mevcut kimlik/sınıf/anlamıyla ele alındı:

| No | Kimlik | Modül / sınıf | Siluet |
| --- | --- | --- | --- |
| 1 | laser | Lazer / Saldırı | Kırmızı keskin yıldırım |
| 2 | shield | Kalkan / Savunma | Mavi sivri kalkan, tek merkez taşı |
| 3 | cooler | Soğutucu / Destek | Mint altı kollu kar tanesi |
| 4 | battery | Batarya / Sistem | Turkuaz batarya, tek enerji işareti |
| 5 | amplifier | Güçlendirici / Destek | Kalın yeşil artı |
| 6 | emp | EMP / Sabotaj | İçi şeffaf mor engelleme halkası |
| 7 | repair | Onarım / Destek | Mint hilal; artıdan ayrı |
| 8 | armor | Zırh / Savunma | Mavi eğik plaka, dört perçin |
| 9 | pulse_cannon | Darbe Topu / Saldırı | Kırmızı geniş namlu, tek merkez |
| 10 | missile_launcher | Füze Fırlatıcı / Saldırı | Kırmızı sade füze |

## Görsel üretim ve önizleme

Built-in imagegen ile her nesne ayrı üretildi. Onaylı Altın Sandık ve
Savaş kılıçları yalnız stil referansı: geniş pahlar, dolgun renkli yüzey,
indigo kontur, kontrollü üst-sol ışık. Şeffaf fonda bağımsız nesneler;
ortak kare/daire plaka, yazı, büyük dış parıltı veya gerçekçi metal yok.
Kalkanın ilk altın çerçeveli varyantı sadeleştirilip ince indigo kenarlı
varyant seçildi; toplam on ayrı modül var.

Onarım hilali ve Güçlendirici artısı farklı siluetlerle korunur. Sınıf
renkleri: saldırı mercan, savunma mavi, destek yeşil/mint, sistem turkuaz,
sabotaj mor. Çizimlere modül adı veya sayısal veri gömülmedi.

Önizleme her modülü büyük boy + 32px/48px olarak gösterir. Normal, seçili,
kilitli durumları ve büyük örnek boyutu yerel değiştirilebilir. Bunlar oyun
seçimi/hesap/ödül işlemi yapmaz. Modül başına açıklama sadece önizlemededir;
oyundaki savaş hücrelerine yeni metin ekleme önerisi değildir.

## Dosyalar

- Tasarım prompt seti: `GORSEL_DONUSUM_PAKET08A_PROMPTLAR_20261016.json`.
- Kullanılan tam ortak prompt, nesne ekleri ve Kalkan revizyonu:
  `GORSEL_DONUSUM_PAKET08A_URETIM_KAYDI_20261016.json`.
- Git dışı arşiv: `artifacts/visual-refresh-pack08a-20261016/`; ayrıca taşınır.
- `masters/{kimlik}.png`: seçilen on orijinal üretim; değiştirilmeden saklanır.
- `{kimlik}.webp`: 384px teknik türev, onay sonrası kullanılmaya hazır adaylar.
- `generated-masters.json`: her seçili kaynağın üretim konumu.
- `gridshard-pack08a.source.html`, `prepare-preview.cjs`, `check-preview.cjs`.
- `gridshard-pack08a.html`: tek çevrimdışı fragment, 1 MB altında.
- `qa_reports/visual-refresh-pack08a-assets-20261016.json` ve
  `visual-refresh-pack08a-preview-20261016.json`.

Kodla yeniden çizim, fon silme veya boyama yapılmadı; yalnız şeffaflığı
koruyarak küçültme/WebP ve gömme. Bütün ana dosyalarda gerçek 0–255 alpha
doğrulandı; dosya hashleri ve boyutları raporlandı. Türevlerde 2px şeffaf
teknik pay ile dört kenarın tamamı temiz; ana dosyalara dokunulmadı.
384px on WebP toplam 262.488 bayt, gömülü önizleme 213.400 bayt.
CSS/JS dönüşümü ve yalıtılmış önizleme etkileşimi kontrol edildi.
Gerçek tarayıcı/oyun/birim testleri kullanıcıda; sunucu/dağıtım/AAB yok.

## Onaydan sonra bağlantı

Tek ortak modül eşlemesiyle koleksiyon, deste, ana ekran, savaş/raf,
modül bilgisi, ödül önizlemesi, profil ve istatistikte aynı kimlik aynı
görseli kullanacak. Mevcut sembolik vektör fallback korunacak; önce bu
grubun bütün kullanımları taranacak. Kalıcı savaş DOM'u her karede yeniden
kurulmayacak, oyun değerleri/sınıf/denge etkilenmeyecek.

Katalog toplam 36 modül: 8B sonraki 10 (Hedefleme Bilgisayarı → Nano Sağlıkçı),
8C sonraki 10 (Virüs → İyon Mızrağı), 8D son 6 (Prizma Kalkanı → Tekillik
Projektörü); her grup ayrı önizleme/onay. Çekirdekler bu modül gruplarından
sonra, en son ele alınacak. Henüz bu sonraki çizimler üretilmedi.
