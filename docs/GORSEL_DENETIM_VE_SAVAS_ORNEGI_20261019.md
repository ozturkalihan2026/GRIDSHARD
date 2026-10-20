# Görsel tema denetimi ve savaş alanı örneği — 19 Ekim 2026

## Karar notu

Kullanıcı 3B modelleri ikinci kez reddetti: "aynı görüntüyü veriyor ama aynı canlılığı
ve gerçekliği vermiyor." Kamera ve çizgi film gölgelendirme deneyi de yeterli olmadı.
Yön: **onaylı çizimlerin kendisi** oyunda kullanılır. Dönen modüllerde sabit kaide ve
yön karesi değişen başlık kullanılır (`turret-base` + `laser-ne/nw/se/sw` vb.). WebGL 3B yolu
bu örnekte kullanılmadı. Oyuna bağlanması kullanıcı onayı bekliyor.

## Oyuna bağlandı — ilk 10 modül (19 Ekim 2026, kullanıcı onayı: "Bu yön doğru")

- **3B kapalı:** `app.js` → `DEVICE_3D_ENABLED = false`. WebGL tuvali oluşmaz. Dosyalar
  yüklü kalır ama kullanılmaz; çekirdekler eski amblemiyle kalır.
- **Katmanlı çizim:** `module-device-art.js` içinde `renderer="layers"`. Lazer, Darbe Topu,
  Füze, Onarım ve Soğutucu sabit kaide + 4 boyalı yön başlığı kullanır; başlık ±10° eğilir.
  Onarım ve Soğutucu iş pozuna geçer. Kalkan, Batarya, Güçlendirici, EMP ve Sönümleyici tek
  çizimdir. Hizalama ve namlu uçları `tools/prepare-module-layers.cjs` ile görselden ölçülür
  ve `client/src/module-layer-data.js` dosyasına yazılır (elle koordinat yok).
- **Sahne:** pencerenin 1,6 katı, hücre tabanına oturur. Billboard ekseni tabanda
  (`module-layers-v15.css`).
- **Rakip düz görünme hatası (eski):** `.enemy-board` opaklığı .98 idi ve
  `.enemy-board-cell` 3B zincirde yoktu. İkisi de v15 CSS'te düzeltildi.
- **Efektler:** `battle/module-fx-canvas.js`. Tek tuval, mevcut savaş döngüsünde `tick`
  edilir, boşta çizmez. Olay sahibi yine `module-vfx.js`. Düşük grafik ve azaltılmış
  harekette eski SVG yolu kullanılır. Soğutucu'nun onaylı SVG soğuk havası korunur,
  üstüne parıltı eklenir. Kalkan kubbesi SVG kalır, isabet halkası eklenir.
- **Ses:** ilk 10 modül yeniden özgün WAV'ları kullanır (`laser_fire` = yumuşatılmış
  `laser_pulse_v2`). Kalkanlı isabet sesinin tek sahibi saldırı akışıdır. Konuma göre
  sağ/sol (±0,6) ve ±%3 perde farkı vardır (`gridshard-audio.js` → `triggerCue(name,{pan})`).
- **Testler:** istemci 578/595 geçti. Kalan 17 hata HEAD'de de var (HEAD 19 hata).
  Güncellenen testler: laser-yaw-v11, modules-yaw-v12, module-motion, module-vfx.
  Sunucunun statik testlerinden 28/29 geçti; `shield_hit` hatası HEAD'de de var.
- **v15b (aynı gün, kullanıcı geri bildirimi):**
  - Çekirdek, onaylı dik çizimle duruyor (`mountCore`, sahne 1,75). Modül sahnesi 1,7;
    çekirdek modülden yaklaşık 1,4 kat büyük.
  - Isı ve CAN çubukları çizimin altında ve önünde (eskiden ısı çubuğu üst kenardaydı,
    çizim onu örtüyordu).
  - Dolu hücreler sade koyu yuva. Güç durumu ince ışıkla, çekirdek hücresi sıcak hale ile
    gösteriliyor.
  - Kartın `filter` animasyonu katmanlı kartlarda kapalı. İsabet anında çizim
    düzleşiyordu; parlamayı artık `.is-struck` veriyor.
  - Yön değişiminde başlık 70 ms sıkışarak dönüyor.
  - Eldeki kartlar çizimli: 58 px, köşede bedel rozeti, altta ad.
  - Dönüş kanıtı: `artifacts/savas-baglama-20261019/donus-8-yon.png`
    (`rotation-harness.html`, gerçek CSS ile).
- **v15c — namlu hedefe bakar (kullanıcı: "8 açı karşı modüle doğru olmalı"):**
  - Başlık artık düzlem çeyreğine göre seçilmiyor. Her boyalı başlığın ölçülmüş namlu
    ekseni (pivot → namlu ucu) ile hedefin ekran yönü karşılaştırılıyor. En yakın çizim
    seçilip kalan açı kadar döndürülüyor. Silahlarda sınır 90°, Onarım 30°, Soğutucu 15°.
    Titremeyi önlemek için 8° histerezis var.
  - Boyalı namlu açıları: Lazer ne −45°, nw −134°, se 10°, sw 175°. Tam aşağı ve tam
    yukarı ~80°'ye kadar döndürülmüş çizimle gösteriliyor.
  - Önerilen iyileştirme: K/G/D/B için boyalı başlık kareleri. Dönüş en çok ±23° olur.
  - Test: `modules-yaw-v12` her 3°'de namlunun hedef yönünü 1e-6 ile gösterdiğini doğrular.
- **v15d — v15c geri alındı (kullanıcı: "karşılıklı iki devre; namlu neden yukarı/aşağı
  bakıyor; kamera açısını hesaba kat"):**
  - Ekran düzleminde döndürme tamamen kaldırıldı. Cihaz yalnız dikey eksende döner.
    Hedefin ZEMİN yönüne (düzlem açısı) en yakın boyalı yön karesi seçilir.
    `GROUND_YAW` 8 yönü tanır (K, KD, D, GD, G, GB, B, KB); hangi yönün çizimi varsa o kullanılır.
  - Kamera kuralı (`MODUL_KAMERA_V13_PROMPTLARI_20261017.json`): zeminin 60° üstü
    (tepeden 30°), güneyden kuzeye bakış.
  - v1 başlıklarında yalnız 4 çapraz yön var ve daha alçak kamerayla çizilmişler.
    D/B/K/G hedeflerinde namlu 45° sapar.
  - Karşılaştırma: `artifacts/savas-baglama-20261019/yon-karsilastirma.png`.
    A: v1, 4 yön. B: v3 atlas, oyun kamerasında 8 gerçek yön; aynı ölçeğe büyütüldü.
  - **Karar kullanıcıda:** B'yi bağlamak mı, v1 kalitesinde 8 yön yeniden çizdirmek mi
    (görsel üretim Codex'in image_gen aracında).
- **Açık:** savaş ekranı yerleşimi (tahtalar örnekteki kadar büyük değil), kalan 26 modül,
  gerçek telefonda FPS ölçümü ve ses dinleme kabulü.

## Savaş alanı örneği (oyuna bağlı değil)

- Dosya: `artifacts/savas-ornegi-20261019/index.html` (depoda izlenmez).
- Aç: `.claude/launch.json` → `gridshard-battle-sample` (8890), sonra
  `http://localhost:8890/artifacts/savas-ornegi-20261019/index.html`.
- Başlık kareleri ve namlu ucu, görselin alfa sınırından ölçülür (elle koordinat yok).
- Örnekteki davranışlar: yerleştirme (iniş, toz, devre ışığı); Lazer (dönüş, şarj, ışın,
  yanma izi); Darbe Topu (geri tepme, küre, şok halkası); Füze (3 ayrı yay, duman, ayrı
  patlamalar); Kalkan (isabet anında yerel kubbe ve dalga); Onarım ve Soğutucu (iş pozu);
  Batarya (izlerden enerji); EMP (susturma); yıkım ve çekirdek darbesi.
- Ses: mevcut WAV'lar katmanlı çalınır (tetik + çarpma). Konuma göre stereo yön ve
  ±%4 perde farkı vardır, ana çıkışta sıkıştırıcı kullanılır. 17/17 ses çözüldü.
- Eksik çizim: Soğutucu'nun yalnız se/sw iş pozu var. ne/nw yönleri düz poza düşer.
  EMP ve diğer 26 modülün yön kareleri yok.

## Sayfa denetimi bulguları (modül/çekirdek çizimleri hariç)

Çekim düzeneği: `artifacts/gorsel-denetim-20261019/survey.js` (360×640, ölçek 3).
Toplu görüntüler aynı klasörde, `sheet-1..6.png`.

1. **Savaş:** hücredeki cihazlar hücrenin ~%35'i kadar, sönük 3B. Üstteki rakip deste
   şeridi ise canlı çizimler. Aynı ekranda iki farklı dil var. El kartları yalnız yazı,
   resim yok. Lazer ince düz çizgi. Rakip adı ile tahta arasında büyük boşluk var.
2. **Kartlar (Modüller):** kilitli kartlarda tek renk çizgi simgeler var (Darbe Topu, Füze,
   Hedefleme…). Açık kartlarda ve Arena 2 kilitlerinde ise boyalı çizimler var. Karışık.
3. **Avatar / Profil:** avatarlar ince çizgi simgeler. Boyalı alt çubuk ve sandıklarla uyuşmuyor.
4. **Mağaza:** sandıklar boyalı. Akı (mor yıldız) ve Devre Kredisi (düz altın para) ise
   düz vektör. Paket kartlarında aynı simge tekrar ediyor.
5. **Etkinlik:** "Günlük Meta" çizgi simge, turnuva kupası boyalı.
6. **Günlük Emirler:** her görevde aynı çapraz kılıç simgesi var. "DEVAM EDİYOR" düğmesi
   devre dışı gibi gri ve büyük.
7. **Günlük Giriş / Sezon Ödülleri:** "← ÖDÜL BÖLÜMLERİ" düğmesi altlıksız yüzüyor ve
   kaydırınca satırların ("KAÇIRILDI") üstüne biniyor.
8. **Profil:** Sezon Geçmişi içindeki "SON SEZON / EN İYİ SEZON" yazıları okunmayacak kadar küçük.
9. **Günlük merkez, Takım, Mesaj Kutusu:** boş durumlarda yalnız metin var, büyük ölü alan kalıyor.
10. Ana ekran: Arena 1 yolu ince altın çizgi. Devre Yolu ilerlemesi kesik ince çubuk.

Not: `statistics` ekranı gizli bir bağlantı (`index.html` içindeki gizli span). Çekimde
boş göründü ama kullanıcıya açık değil, hata sayılmadı.
