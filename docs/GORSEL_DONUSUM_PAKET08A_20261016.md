# Görsel dönüşüm — Paket 8A / ilk on modül

18 Ekim durum notu: Aşağıdaki dört-yön/üstten Lazer/eksik VFX notları tarihçedir.
İlk 10 cihazın güncel sunumu 30° ortak kamera + 8-yön atlasıdır:
`MODUL_KAMERA_VFX_20261017.md`, son rötuşlar V17 ve Soğutucu V18 kayıtlarıdır.
Sonraki 10 cihaz için `GORSEL_DONUSUM_PAKET08B_20261018.md` açıldı;
tekli çizimler onay bekliyor, hedef 16 yöndür.

## Güncel yön — amblem yerine fiziksel cihaz ve hareket

**23:21 sonrası ek:** Yalnız saha Lazer'i artık sabit kaide üzerinde üstten
çizilmiş tek başlıkla kesintisiz 360° hedef açısı kullanır. Kırmızı ışın namlu
ucuna bağlıdır; diğer cihazlar dört yönlü kalır. Detay ve kontroller:
`LAZER_360_DENEYIM_20261016.md`. Aşağıdaki dört yönlü Lazer notları tarihçedir.

**Son uygulama:** Kullanıcı cihazların göründüğünü teyit etti. Hücre büyütme,
grafit/petrol devre levhası, bakır temaslar ve sabit parlayan kablo bağlantıları
kaynaklara işlendi. Isı üst, CAN alt iç kenarda; oyun mekaniği ve 5×3 korundu.
Yerel görsel deneme kullanıcıda. Ayrıntılar hareket planının ilk bölümündedir.

**Son karar:** Teknik 3D Lazer modeli kullanıcı tarafından sanat diline uygun
bulunmadı ve oyundan çıkarıldı. İlk 10 cihaz çizilmiş WebP görsellerini kullanır;
beş hareketli cihaz şimdilik dört yönlüdür. Hücre görünmezliği için açık kutu
ölçüleri ve hareket bağlantıları korundu. Deney kodu oyuna yüklenmez. Yeni bir
saha görseli onaylanmadan 3D sanat bağlanmayacak. Güncel ayrıntılar hareket
planının ilk bölümündedir; gerçek oyun denemesi kullanıcıdadır.

**Güncelleme:** Sönümleyici onaylandı; ilk 10 fiziksel cihaz ve beş yönelen
cihazın dört yönlü hareket bağlantısı kaynaklara işlendi. Ayrı sabit kaideler,
Onarım çalışma pozları, fan kareleri ve sabit CAN/ısı sunumu var. 39 WebP
999.974 bayt; 25 yalıtılmış kontrol geçti. Yerel oyun denemesi kullanıcıda,
VFX ayrı. Güncel kapsam ve promptlar:
`GORSEL_DONUSUM_PAKET08A_HAREKET_PLANI_20261016.md`.
Aşağıdaki v2/v3 ve eski amblem notları önceki üretim aşamalarının tarihçesidir.

16 Ekim sonraki kullanıcı talimatları önceki siluet zorunluluklarını değiştirdi:
Lazer artık yıldırım değil silah; Onarım hilal değil insansız robot;
Güçlendirici artı değil bobin/iletim cihazı. İlk 10 modül fiziksel v2 olarak
yeniden üretildi. Aşağıdaki amblem tablosu artık **önceki sürümün tarihçesidir**,
yeni üretime zorunlu siluet şartı olarak uygulanmaz.

- Yeni 10 cihaz: `artifacts/visual-refresh-pack08a-20261016/rev2-physical/`.
- Tam prompt: `GORSEL_DONUSUM_PAKET08A_FIZIKSEL_REV2_20261016.json`.
- Ek talimat: hücrede kart çerçevesi yok; fiziksel cihaz, sabit can/ısı çubukları;
  hedefe yönelme/çalışma hareketleri. VFX sonra ayrı. Giysi Zırh yerine aynı
  `armor` ID/mekanikle **Sönümleyici** isim/cihaz adayı.
- Yeni poz/kaide/alternatif: `rev3-motion-concepts/`; Lazer 4 yön pozu, Onarım
  bekleme/kollar kalkık, döner kaideli Soğutucu ve Sönümleyici. Bunlar nihai
  hizalanmış parça/yön atlası değildir; diğer cihaz hareketleri henüz yapılmadı.
- Ayrıntılı hareket/performans ve onay sırası:
  `GORSEL_DONUSUM_PAKET08A_HAREKET_PLANI_20261016.md`.

İlk v2/v3 önizleme aşamasında oyuna bağlanmamıştı; mevcut sınıf kimlikleri/değerleri değişmedi. Kullanıcı
gerekirse her sınıfın görsel renginin değişmesine izin verdi; bu taslakta mevcut
beş renk kimliği korundu. Önceki dosyalar silinmedi/üzerine yazılmadı.

## Önceki amblem paketi

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
