# Ortak kamera, dik modüller ve ilk 10 VFX — 17 Ekim 2026

Bu kayıt önceki `MODUL_360_KAMERA_SEZON_20261017.md` dosyasındaki cihazı eğip
tahtayı düz tutan v12 sunumunun yerini alır. Devir notu değildir.

## Kamera / çizim

- İki devre, hücreler ve kablolar **ortak eksende tepeden 30°** eğilir.
  VS aralığının yarısı olan 26px, iki tahtanın aynı kamera eksenidir.
- Merkez ölçeği `.92 → .98`; kamera uzaklığı `950 → 1400px`. Bu, merkezde
  yaklaşık %6,5 büyüme ve kenarlarda daha az perspektif şişmesi demektir.
  32px genişlik payı, yakın tahtanın mobilde kenarlardan taşmasını sınırlar.
- Gövde çizimleri kamera karşısında dik tutulur; üzerine ikinci perspektif
  uygulanmaz. EMP kuleleri ve fan paneli zemine yatırılmaz. CAN/ısı çubukları
  hücrede, gövde ve VFX uçları ayrı kayıttadır.
- İlk 10 modül için **8 yönlü 2.5D atlas** bağlıdır. Hedef hesabı 360° ve
  sayısaldır; resimli görünüş 45° aralıklıdır, gerçek hacimli/kesintisiz 3D
  model değildir. Hazırlık sırasında kısa yoldan yön örneklemesi, mevcut
  savaş saatiyle yapılır; yeni cihaz başına rAF/zamanlayıcı yoktur.
- Kart/koleksiyon/raf sanatına dokunulmadı. Savaşta eski düz üst resim
  döndürme ve aynı resmi üç kez üst üste koyma yolu kullanılmaz.
- Built-in image_gen ile üretilen son promptlar ve kaynaklar:
  `MODUL_KAMERA_V13_PROMPTLARI_20261017.json`. İki hedefli düzeltme yapıldı:
  Soğutucu kamerası ve Onarım'ın sağ/sol yönleri.
- Runtime: `client/assets/ui/modules-views-v3/`: 10 gerçek alpha WebP,
  her biri 512×256 (8 adet 128px kare), toplam **461.046 bayt**.
- Hazırlama: `tools/prepare-module-views-v13.cjs`. Yalnız otomatik ayırma,
  ortak ölçekte küçültme ve kaide/namlu/alet/göz/bobin ucu kaydı yapar.

## Bağlanan VFX

| Modül | Sunum |
|---|---|
| Kalkan | Gerçek savunma anında devre üzerinde petek kubbe; desteklenen fiziksel silahın vuruşu kubbe sınırında sonlanır |
| Lazer | Kayıtlı namlu ucundan 1sn kırmızı ışın; aynı kaynağın sonraki atışı öncekini değiştirir |
| Soğutucu | Fan/çıkış ucundan gerçek alıcıya geniş, kesikli soğuk hava huzmesi |
| Onarım | Kayıtlı alet ucundan gerçek alıcıya yeşil ışın |
| Güçlendirici | İki bobin arasında çalışır durumda yeşil elektrik; gerçek şarj alıcılarına sarı ışın |
| Sönümleyici | Gerçek hasar azaltmada üst mavi bölgede kısa sönümleme alanı |
| Batarya | Çalışır gövdenin çevresinde elektrik; gizli/düşük grafikte sürekli animasyon yok |
| EMP | İki kayıtlı gözden birleşen mor elektrik ve gerçek rakip hedefine ışın |
| Darbe Topu | Namludan turuncu mermi; varışta hedefte patlama |
| Füze Fırlatıcı | Kayıtlı uçtan fiziksel füze; varışta patlama |

Kalkanın geniş kubbesi kozmetiktir; sunucuda diğer hücreleri koruyan yeni bir
kural oluşturmaz. Lazerin 1sn görünmesi, mekanik ateş hızını 1sn yapmaz.
Onarım koluna bağımsız eklem iskeleti, fana ayrı hareketli kanat geometrisi
eklenmedi; ışın/üfleme ucu yeni çizime kaydedildi. İlk 10 dışındaki silahlar
mevcut sunum yolunda kalır.

Ana kod `client/src/battle/module-vfx.js`, stiller `module-vfx-v14.css`.
İlk üç fiziksel silah için tek efekt sahibi vardır; eski ışın ikinci kez çizilmez.
Mermi varışı animasyon bitişinde gösterilir; ortak temizleme kuyruğu yedektir
ve aynı patlamayı ikinci kez çıkarmaz. Gecikme/ölüm/hedef kaybı/oturum değişimi
eski işi iptal eder. Gizlenmede etkiler kaldırılır. Bütçe 8/16/24 kök ve mevcut
global yoğunluk sınırıdır. Blur/filtre yığını, cihaz başına canvas/rAF yoktur.

### Hücre enerjisi ve kubbe okunaklılığı

- Enerji alan dolu hücrelerde sabit zemin ışığı ve keskin parlak kenar vardır:
  kendi devrinde turkuaz, rakipte sıcak bakır. Çekirdeğin altın çerçevesi korunur.
  Boş geçiş hücreleri aydınlatılmaz; güç kesildiğinde veya modül/çekirdek imha
  edildiğinde aynı mevcut sınıf kapanır.
- Bu gösterim mevcut `energy-fed-cell` durumunun CSS arka planı/kenarıdır.
  Yeni öğe, animasyon döngüsü, zamanlayıcı veya tahta oluşturma yolu eklenmedi.
  Sabit durumda 1.000 tekrar testinde DOM düğümü oluşturma, geometri okuma ve
  DOM yazımı artmadı; güç değişimlerinde hücre ve cihaz düğümlerinin kimliği korundu.
  Bu, gerçek cihaz heap/FPS ölçümü değildir.
- Kalkan artık tam elips değil: yüksek üst kapak ve sığ ön tabandan oluşan
  kapalı yüzey, hacim çizgileri ve zemine oturan taban yayıdır. Petek çizgilerinin
  etkin opaklığı yaklaşık %14'ten %56'ya yükseldi; modüller yüzey arkasında okunur.
  Petekler tek SVG desenidir, her petek için ayrı DOM düğümü oluşturulmaz.
- Silahın görsel çarpışması da aynı üst/alt yarım elips sınırını kullanır.
  Savunma kuralları değişmedi; kalkan hâlâ yalnız gerçek savunma olayında görünür.
- Çevrimdışı gerçek efekt SVG önizlemesi:
  `artifacts/modules-camera-v13-20261017/shield-dome-preview.webp`.
  Üretici: `tools/preview-circuit-shield-v14.cjs`; oyun ekran görüntüsü değildir.

### Savaş destesi ve geri sayım

- Raf kartında görsel kendi ilk satırına sınırlandı: görsel mutlak olarak yalnız
  simge yuvasını doldurur ve bu yuvada kırpılır. İsim ve bedelin 12/14px satırları
  korunur; büyük görsel bu yazıların üzerine taşamaz. Uzun adların küçük punto
  kuralı korunur. Bu kırpma, savaş tahtasındaki 3D gövdelere uygulanmaz.
- Akım simgesi/sayısı arkasındaki koyu rozet kaldırıldı; yetersiz akımın metin
  rengi hâlâ gerçek durumdan gelir.
- 3–2–1 katmanının ve rakam levhasının zemini şeffaf, bulanıklaştırma yoktur.
  Rakam okunur kalır; devreyi karartan perde yoktur. Sunucunun geri sayımı,
  süre dolana kadar giriş engeli ve mevcut gizlenme kuralları değişmedi.
- Yalnız CSS değişti; yeni öğe, animasyon veya savaş yenileme yolu eklenmedi.

### Pus hissi / silaha özgü ses düzeltmesi

- Kodda savaş tahtasına uygulanmış etkin bir blur tespit edilmedi; gerçek cihazın
  perspektif rasterleştirmesi ölçülmedi. Geniş renk yıkamasını azaltmak için hücre
  taban ışığı %30'dan %17'ye, iç yayılım 12px'den 5px'e indirildi. Parlak kenar
  korunur. Kalkan dolgusunun orta opaklığı %10'dan %2,5'e indirildi; petek
  çizgilerinin görünürlüğü değişmedi. Bu değişiklikler pusun kesin kök nedeninin
  bulunduğu anlamına gelmez; oyun içinde görsel karşılaştırma gerekir.
- Eski `module_hit`, `energy_transfer.wav` sesine bağlıydı. Normal isabetler artık
  akım aktarımı çınlamasını kullanmaz. Ses ailesi kaynak silah kimliğinden seçilir:
  Lazer = tek yakma/cızırtı sesi (ikinci genel isabet sesi yok), Füze = roket çıkışı
  ve gerçek seyahat süresi sonunda patlama, top/drone = tok darbe,
  elektrik silahları = ark çatırdaması; savunulan isabet = enerji emilimi.
- Soğutucu gerçek soğutma olayında mevcut `cooling_air` üzerinden daha belirgin
  fan motoru/kanat ritmi ve geniş bant hava üfler. Özel ses döngüsü eklenmedi.
- Altı özgün yeni kısa ses 111.396 bayt, 22.050Hz mono PCM; tepe yaklaşık -6,7dBFS.
  Üretici `tools/generate_battle_sfx_v15.py`. Eski müzik/silah kaynakları ve
  sıkıştırılmış türevler silinmedi/değiştirilmedi; yeni adlar güncel WAV'a bağlanır.
  Soğutucu üreticisi `tools/generate_support_vfx_audio.py` güncellendi.
- İsabet sesi için atış başına `setTimeout` kaldırıldı; mevcut ortak savaş
  süpürme kuyruğu kullanılır. Oturum değişimi/gizlenme/gecikme koruması vardır;
  mute, ön/arka plan ve ses eşzamanlılık bütçesinin sahibi yine ses yöneticisidir.
- Ek olarak tüm `gridshard-audio*.test.js` dosyalarındaki 32 ses kontrolü geçti
  (genel regresyon kümesiyle kısmen örtüşür). Gerçek hoparlör/kulaklık dinlemesi
  yapılmadı; kullanıcı oyunda kabul edecek.

## Ses

Silah/Kalkan/EMP ve elektrik için mevcut ses yöneticisi kullanılır.
Yeni `cooling_air.wav` ve `repair_beam.wav`, kısa özgün sentez sesleridir;
toplam 38.896 bayt, 22.050Hz mono. Üretim:
`tools/generate_support_vfx_audio.py`. Ses/mute/uygulama görünürlüğü ve ses
eşzamanlılık bütçeleri korunur. Mobil türevi olmayan bu iki küçük WAV,
mevcut paketleyici/çözücü tarafından WAV olarak kullanılır.

## Doğrulama / sınırlar

**173 Node kontrolü geçti.** Yön kaydı, kamera boyutları, hedef kilidi, VFX olayları,
tekrar/yanlış zamanlı olaylar, imha, gizlenme, bütçe, ses yaşam döngüsü ve eski
ödül/kart regresyonlarını kapsar. Paket JS/CSS hedef sözdizimi ve native/web
asset listesi denetlendi: 40 betik / 18 stil, CSS uyarısı yok; önceki
20 çeviri anahtarı uyarısı değişmedi. QA raporu:
`qa_reports/module-vfx-v14-audit-20261017.json`.

Tarayıcı/oyun/sunucu başlatılmadı; gerçek cihazda görüntü, ses ve FPS kabulü
yapılmadı. Sunucu mekanikleri, dist/native/AAB ve Git commit/push değişmedi.

Önizleme: `artifacts/modules-camera-v13-20261017/shared-board-camera-preview.webp`.
Bu, geometri/varlık levhasıdır; gerçek oyun görüntüsü veya VFX animasyon kaydı değildir.
