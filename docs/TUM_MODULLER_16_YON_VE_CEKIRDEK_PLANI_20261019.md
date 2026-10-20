# Tüm modüller 16 yön + çekirdek çalışma animasyonu — iş planı (19 Ekim 2026)

Kullanıcı isteği: "tüm modülleri bu şekilde tamamla. Modülleri tamamladıktan sonra yeni
çekirdeklere savaş alanındayken çalıştığını gösteren bir animasyon ekle."
"Bu şekilde" = Lazer'deki yöntem (`docs/LAZER_16_YON_URETIM_20261019.md`). Lazer bitti.
Kullanıcı Canva kullanımını onayladı.

## Kurallar (değişmez)

- Kamera: zeminin 60° üstü (tepeden 30°), güneyden kuzeye bakış; tüm karelerde aynı.
- Yalnız dikey eksende dönüş; namlu ya da çıkış zemine paralel. Ekran düzleminde döndürme YOK.
- Kare sırası 4×4: 0 = D (sağ), saat yönünde 22,5°; 4 = G (kameraya), 8 = B, 12 = K (uzağa).
- Çizim referansı: onaylı resim (v1: `client/assets/ui/modules-physical-v1/<id>.webp`,
  v2: `client/assets/ui/modules-physical-v2/<id>.webp`). Aynı tasarım, renk, kontur.

## 1) Dönen 21 modül (16 yönlü sayfa üret)

`laser-3d-pilot.js` içindeki `ROTATION_RULES` listesinde 180° ya da 360° olanlar:
- v1: pulse_cannon, missile_launcher, emp, cooler, repair
- v2: arc_cannon, drone_bay, jammer, railgun, reflector, virus, plasma_mortar,
  quantum_repeater, swarm_fabricator, ion_spear, disruptor, quantum_cannon,
  singularity_projector, nano_medic, overclock_unit, phoenix_repair

`tools/prepare-module-layers.cjs` içindeki `RIGS` listesine v2 kimlikleri de eklenmeli
(`base` gerekmez; 16 kare varsa `registerYaw16` kullanılır). Repair ve Cooler'ın iş
pozları 16 yönde yok; dinlenme kareleri kullanılır, iş hali efektle gösterilir.

### Modül başına akış (Lazer'de denendi)

1. Yükleme: Canva `create-upload-url` →
   `curl --ssl-no-revoke -X POST -H "Content-Type: application/octet-stream" --data-binary @<referans.webp> "<url>"`
   → `mediaId`.
2. Üretim: `generate-image`, `imageReferences:[{type:"MEDIA",id}]`, `SQUARE_1_1`.
   İstem `LAZER_16_YON_URETIM_20261019.md` dosyasındaki metindir; cihazın adı/tarifi ve
   "dönen parça" değiştirilir. Taret olmayan cihazlarda tüm gövde döner.
   Arka plan düz koyu lacivert (#0b1a26) istenir.
3. `get-generate-image-job` ile sonucu bekle → MEDIA id.
4. İndirme (bağlantı yalnız 200 px önizleme veriyor): uygulama tarayıcısında
   `https://www.canva.com/M/<mediaId>` aç, sağ alttaki indirme düğmesine bas.
   Dosya `C:\Users\SERVER\Downloads\<ad>.jpg` olarak iner (içi PNG, 1264 px). Canva
   oturumu açık. Mobil düzende düğme ≈ (620, 838).
5. `node tools/slice-yaw-atlas.cjs <dosya> <id> 4 4 384`
   (arka plan kenardan bağlı bölge doldurmayla ayıklanır).
6. `node tools/prepare-module-layers.cjs`
7. Kontrol: `artifacts/savas-baglama-20261019/yaw-compare.html` (`ids` listesine ekle),
   `node yaw16.js`. Her yönde ışın namludan çıkmalı, sıra doğru olmalı. Hatalıysa
   o modülü yeniden üret.
8. Arşiv: kaynak sayfayı `artifacts/moduller16-20261019/<id>-16-yon-1264.png` olarak sakla.

## 2) Sabit 14 modül (dönmez, tek dik çizim)

shield, battery, amplifier, armor (v1 kayıtlı) + targeting_computer, barrier, capacitor,
current_balancer, guardian_dome, chrono_relay, phase_armor, precision_matrix,
prism_shield, omega_amplifier (v2). v2 olanlar `SINGLES` listesine `modules-physical-v2`
yoluyla eklenmeli. Şu an `renderer="static"` ile küçük çiziliyorlar.

## 3) Çekirdek çalışma animasyonu (modüllerden sonra)

7 çekirdek dik çizimle duruyor (`mountCore`, sahne 1,75). İstenen: savaşta "çalışıyor"
hissi. Öneri (yeni rAF yok, savaş döngüsü + CSS):
- Çekirdek taşında renkli nabız: çekirdek kimliğine göre renk, 1,6 sn. CSS ile çizimin
  üstünde `mix-blend-mode:screen` radyal parıltı katmanı.
- `module-fx-canvas.js` içinde `coreIdle(center, color)`: 220 ms'de bir yükselen 1-2
  enerji zerresi. Düşük grafikte kapalı.
- Çekirdek gücü dolunca (`core-power-ready`) halkanın hızlanması ve parlaması.
- Hasar alınca kısa titreme + çatlak ışığı (`is-struck` zaten var).
- Çekirdek kimliği → renk: `CORE_VISUALS` (app.js) içinden.

## Doğrulama ve testler

- `client`: `node --test tests/*.test.js`. Beklenen: yeni hata yok. HEAD'den kalan 17 eski
  hata var (`docs/GORSEL_DENETIM_VE_SAVAS_ORNEGI_20261019.md`).
- Gerçek savaş: `artifacts/savas-baglama-20261019/battle.js` (8879 açık olmalı). Rakip
  yapay zekâ bazen pasif kalıyor; birkaç deneme gerekir.

## Durum (19 Ekim akşamı)

### Bitenler
- **16 yönle bağlandı, `yaw-compare.html` düzeneğinde 8 yönde doğrulandı:**
  - laser, pulse_cannon, missile_launcher, cooler
  - repair: 14 ve 15. kareler ayna
  - arc_cannon
  - drone_bay: 0, 14 ve 15. kareler ayna; `fit:"bbox"`
  - jammer: 9←8, 10←11, 14←13 kopya; `bodyCut .45`
  - railgun: `baseW .5`
  - reflector: 14. kare ayna; `bodyCut .5`
  
  Kanıt: `artifacts/moduller16-20261019/yon8-dogrulama.png`, `artifacts/savas-baglama-20261019/yon16-*.png`.
- **EMP:** sırası bozuk geldi (0–7 hep önden). Kareler `artifacts/moduller16-20261019/emp-kareler-reddedildi/` altına alındı; EMP tek çizimde kaldı. Yeniden üretilmeli.
- **Sabit 10 v2 modül:** `SINGLES_V2` ile büyük dik çizimde (renderer `layers`).
- **Çekirdek animasyonu:**
  - `.module-core-pulse` (CSS, `--core-accent`): 1,6 sn; `core-power-ready` iken 0,8 sn.
  - `module-fx-canvas.js` `coreIdle` + `app.js` `emitCoreIdleMotes`: 220 ms'de bir zerre; düşük grafikte kapalı.
- **Gerçek savaşta görülenler:** Soğutucu y13/y08 ve çekirdek nabzı (`artifacts/savas-baglama-20261019/battle16.js`, `shots/m16-500.png`). Sunucu Darbe, Füze ve Tamir'i desteye almadı (oyuncuda kilitli olabilir). Bunlar yalnız düzenekte doğrulandı.

### Araçlar
- `tools/prepare-module-layers.cjs`:
  - v2 dönen modüller `RIGS` içinde; yalnız 16 kare varken kaydedilir.
  - Her makineye ayrı ayar: `baseW`, `fit:"bbox"`, `bodyCut`.
  - Mercek tespiti yalnız `lens:true` olanlarda (lazer, darbe).
- `tools/mirror-yaw-frame.cjs <id> <i>…`: hatalı kareyi eşinin aynasıyla değiştirir (i ↔ 8−i). Ayna yalnız sağ–sol simetrik makinede kullanılır; simetrik değilse komşu kare kopyalanır.

### Canva akışı (değişti)
- Uygulama tarayıcısındaki Canva oturumu başka bir hesap. Bu hesap, ilk hesabın görsellerini açamıyor.
- Tam boy alma yolu: kullanıcının onayıyla kopyalanan "GRIDSHARD 16 yon sayfalari" tasarımı (`DAHYdVXgdQA`).
  1. 1264×1264 sayfa ekle (`add_page`).
  2. Sayfayı `insert_fill` ile koy, sonra `commit`.
  3. `export-design` ile `png`, `pages:[n]` dışa aktar → 1264 px.
  
  `width` parametresi reddediliyor; çıktı boyunu sayfa boyu belirler.
- `generate-image` sık sık `quota_exceeded` döndürüyor; birkaç dakikada yaklaşık 1 iş açılıyor.
- Referans ve sayfa kimlikleri: `artifacts/moduller16-20261019/canva-ids.json`.

### Kalanlar
- 11 v2 modül: virus, plasma_mortar, quantum_repeater, swarm_fabricator, ion_spear, disruptor, quantum_cannon, singularity_projector, nano_medic, overclock_unit, phoenix_repair.
- EMP.

Referansları Canva'ya yüklü (`canva-ids.json` → `ref`). İstem kalıbı için `canva-ids.json` yanındaki önceki istemlere bakılabilir: kaideli taretlerde yalnız üst döner, kaidesizlerde tüm gövde döner.

## 20 Ekim — yerel devam

Onaylı boyalı çizim ve 16 yön seçimi korunuyor; eski prosedürel WebGL modellerine
geri dönülmedi. Üretim yerleşik imagegen ile; ücretli/kredili servis çağrısı yok.

- [x] Virüs: 16 ayrı çizim, saydam kesim, yön sırası ve yeşil enjektör ucu ölçümü; oyuna bağlı.
- [x] Kuantum Tekrarlayıcı: 16 ayrı çizim; dört namlu / kapalı arka gövde; oyuna bağlı.
- [x] Nano Onarıcı: 16 yön, cyan çıkış ucu ölçümü.
- [x] Anka Onarımı: 16 yön, altın pençeler / arka kafes ayrımı.
- [x] İyon Mızrağı: 16 yön, cyan uç ölçümü.
- [x] Kuantum Topu: 16 yön, cyan mercek ölçümü.
- [x] Plazma Havanı: ikinci üretim bağlandı; ilk tekrarlı deneme arşivde reddedildi.
- [x] EMP: ikinci üretim bağlandı; yandan dar görünüş / önden açık kollar / arka zırh ayrımı; efekt merkezi.
- [x] Sürü Fabrikatörü: üç yuvalı platform, 16 yön.
- [x] Bozucu: çift gümüş çene ve magenta çıkış, 16 yön.
- [x] Tekillik Projektörü: yan/ön/arka halka, 16 yön, efekt merkezi.
- [x] Hız Aşırtma Birimi: çift bobin, arka gövde, 16 yön.

Toplam: 22 dönen modül × 16 kare; 14 sabit modül; 7 sabit, nabızlı çekirdek.
Yeni kareler çizim tabanlıdır; matematiksel olarak kusursuz 22,5° kamera taraması
ve kullanıcı görsel kabulü anlamına gelmez. Özellikle halka ve simetrik cihazlarda
komşu görünümler yakın olabilir. Gerçek savaşta görsel kabul kullanıcıda.

### Araç düzeltmeleri

- `slice-yaw-atlas.cjs` ve `prepare-module-layers.cjs` Sharp ile yerelde çalışır;
  tarayıcı veya oyun başlatmaz. Sharp yolu gerekirse `GRIDSHARD_SHARP_MODULE` ile verilir.
- `--components`: saydam sayfada 16 ayrı çizimi alfa bileşeninden bulur; eşit
  aralıklı olmayan çizimleri veya hücre sınırını aşan namluları kırpmaz.
  16 çizim bulamazsa çıktı yazmadan durur. İnce kenarlar 2 piksel payla korunur.
- `--order=...`: görsel denetimden sonra 0–15 yön sırasını düzenler. Virüs için
  sıra `0,1,2,3,4,7,6,5,8,9,10,11,12,13,14,15`.
- `prepare-module-layers.cjs --only=virus`: yalnız seçilen kaydı yeniler;
  önceden kabul edilmiş modüllerin hizalamasını korur.
- `review-module-yaw.cjs <id> <output.webp>`: 16 yönü tarayıcısız gösterir.
- `audit-painted-module-frames.cjs`: 36 modül, 7 çekirdek, 352 yön karesi;
  dosya/ölçüm/alfa/paket kapsamını denetler. Sonuç `audit.json`.
- `build-client.js`: katman verisinde referans verilen bütün kareleri dağıtım
  paketine alır. Önceden yalnız HTML'deki varlıklar toplanıyordu; yeni resimler
  geliştirme ortamında görünse bile paket dışında kalabiliyordu.

Kaynak sayfalar ve statik inceleme görselleri: `artifacts/moduller16-20261020/`.
Referans / yan / ön / arka karşılaştırması: aynı klasörde `overview.webp`.
Yerleşik üretim istemleri: `docs/MODUL_16_YON_ISTEMLERI_20261020.md`.

Kontrol: hedef/dönüş/başlangıç 30/30; yeni yön varlıklarını paketleme testi geçti.
Tam paketleme testinde Windows geçici klasör yeniden adlandırma (`EPERM`) hatası
aralıklı görülüyor; sonuç tam paketleme yeşil diye raporlanmadı.
Gerçek savaş/FPS/ses denemesi bu tur yapılmadı; kullanıcı yerelde test ediyor.

Son denetim: 36 modül + 7 çekirdek, 22 × 16 = 352 yön karesinin tümü saydam,
384×384, dosyaları mevcut ve paket kapsamına dahil. Yön kareleri toplamı
11.371.034 bayt. Tüm kayıtlı dönen modüllerin yön seçimi, ölçülmüş efekt çıkışı
ve yeni DOM elemanı oluşturmadan dönüşü 30/30 testte doğrulandı.
