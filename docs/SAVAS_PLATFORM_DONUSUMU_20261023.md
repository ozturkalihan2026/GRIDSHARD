# Savaş zemini: boyalı devre platformu — 23 Ekim 2026

> Tarihi V1 çalışma kaydıdır. Kullanıcı bu tekrarlanan mavi soket yaklaşımını
> uygun bulmadı. Güncel birleşik metal platform ve çevre uygulaması:
> `docs/SAVAS_PLATFORM_V2_20261023.md`. Bu belgedeki video güncellemesi önceki
> tura aittir; V2 turunda kullanıcının isteğiyle video değiştirilmedi.

## Kapsam / uygulama

Kullanıcının onayladığı öneri gerçek savaş alanına bağlandı: kalın, köşeleri
kırılmış mavi bloklar, modül soketleri, gömülü devre kanalları; oyuncuda mint,
rakipte kırmızı vurgular. Bu bir özellikler grafiğini arka plana yapıştırma
işi değil: modüller/çekirdekler, hedefleme, kalkanlar ve VFX hâlâ ayrı çalışır.

- `battle-platform-v17.css` zemin malzemesinin tek sahibidir. V8'deki eski
  çoklu-gradient hücre boyası ve V15'teki onu tekrar örten dolu/güçlü hücre
  boyaları kaldırıldı. Bu dosyalardaki boyut, kamera, sprite ve bar kuralları korundu.
- Bir adet 256×256 alfa WebP, **19.732 bayt**; iki tahtada da aynı kaynak
  kullanılır. Ham tek RGBA görüntü 262.144 bayttır; bu tarayıcının toplam RAM
  kullanımı iddiası değildir. Katmanların belleği tarayıcıya bağlıdır.
- Hacim resimde boyalıdır. Yeni 3D yüz, transform zinciri, canvas, rAF,
  timer, DOM düğümü, animasyon veya ek hücre renderer'ı yoktur.
- Önceki 5×3 düzen, hücre boyutları, 8px boşluklar, iki piksellik border'ın
  içerik kutusu, fiziksel sprite kayıt noktası ve mevcut kamera korunur.
  Sadece border rengi şeffaftır; resim border-box'a kadar çizilir.
- Mevcut SVG kanal düğümleri korunur. Koyu gömülü kanal, iki yandaki boyalı
  soket bağlantılarını birleştirir; canlı renk yalnız mevcut güç durumu
  tarafından açılır. Boş geçiş soketi modül gibi güç almış gösterilmez.
- Güçlü sokette yalnız hafif, sabit bir merkez ışığı vardır; sürekli ışık
  döngüsü, blur veya tüm tahtayı parlatma eklenmedi. Klavye/dokunma hedef
  çizgisi ve enkazın kesikli uyarısı korundu.
- Bu tur savaş motoru, sunucu, ekonomi, modül/çekirdek özellikleri veya
  yerleştirme komutları değiştirilmedi.

## Doğrulama

- **717/717** istemci testi geçti. Eski düz hücre gölgesinin kaynak satırını
  bekleyen iki test yeni malzeme sahibine taşındı; VFX/ses kontrolleri korunur.
- Yeni zemin E2E: üç tarayıcıda **3/3** geçti. Her birinde 320×568,
  393×852, 1280×720 ve1920×853 yerleşimleri; 30hücre kimliği sabit, 5×3
  düzen korunur, yatay taşma yok, alt-sağ hücre gerçekten hedeflenebilir,
  fazladan img düğümü veya animasyonlu enerji SVG'si yok.
- Mevcut çekirdek/kalkan/patlama regresyonu üç tarayıcıda **3/3** geçti;
  yedi çekirdeğin kayıtlı çizim oranları ve kırpılma korumaları değişmedi.
- İlk yeni zemin WebKit koşusu geri sayımın3ekranı aktifken dokunma ölçtü.
  Transport BATTLE durumuna ilk snapshot/countdown'dan önce girebildiği için
  başlangıçta gizli overlay yeterli hazır-olma koşulu değildi. Test artık
  gerçek `data-placement-ready=true` ve yerleştirilen modül çizimini bekler.
  Ürün sayımı/hazır olma mantığı veya testin hedeflenebilirlik şartı gevşetilmedi.
- Derleme regresyonları **10/10** geçti. Yalıtılmış web paketi
  `8f0501929efce1a1`, 44 betik/614 izin-listesi varlığı. Soket CSS üzerinden
  `bundles/media-socket-block-B2OGW4ZU.webp` olarak pakete girer; HTML'de ayrıca
  sahte preload/img eklenmez. Ana dist ve Android çıktısı değiştirilmedi.

Kanıt dizini: `artifacts/battle-platform-20261023/`.
`client-tests.tap`, `platform-visual-results.json`, `first-visual-results.json`
(mevcut çekirdek testleri ve ilk WebKit tanısı) korunur.

## Performans karşılaştırmasının yöntemi ve sınırı

`baseline/` V8/V15 stillerinin değişiklik öncesi kopyasıdır. Tanı koşusunda bu
iki dosya aynı URL'lere karşılık verilir, yeni V17 stili boş bırakılır. Böylece
aynı güncel JS ile gerçek eski zemin çizilir; yeni koşulda gerçek yeni CSS
kullanılır. Ürün kaynakları zamanlama sırasında düzenlenmez.

`platform-probe.spec.cjs` iki koşulu aynı tarayıcı projelerinde seri çalıştırır:
geçici yerel hesap, gerçek sunucu/ilk AI maçı, sabit manuel Yüksek grafik ve
perspektif açık, gerçek yerleştirmeye hazır durumundan sonra 2snısınma ve18sn
kayıtsız ölçüm. Her koşul ayrı bağlamdır. rAF FPS, p95 kare aralığı, gerçek
cihaz/deploy sayıları, sahne düğümleri, istemci bütçesi ve Chromium CDP maliyetleri
JSON'a yazılır. Yapay savaş/çoğaltılmış modül veya video kaydı yoktur.

Bu kısa örnekler aynı deterministik savaşı tekrar oynatmaz; gerçek AI/yerleşim
sonuçları ve modül sayıları değişebilir. Küçük farklar nedensellik veya istatistiksel
kazanç kanıtı değildir. Emüle Android fiziksel telefon değildir; Windows WebKit
de fiziksel iPhone/WKWebView değildir. Sayfa hatasız ölçüm toplanması testinin
geçmesi, FPS kalite kapısının geçmesi anlamına gelmez. Mevcut Windows WebKit
savaş FPS açığı devam eder; eşik/CI kapısı bu işte değiştirilmedi.

Önceki acele örnekler `probe-before-readiness-guard.json` olarak korundu;
son sonuçlar `*-baseline.json`, `*-painted.json` ve `platform-probe-results.json`.

Son 18 saniyelik örnekler (sabit manuel Yüksek):

| Ortam | Eski → yeni rAF FPS | Eski → yeni p95 aralık | Sahnedeki cihaz sayısı | FPS bütçesi |
| --- | --- | --- | --- | --- |
| Masaüstü Chromium | 142,70 → 143,31 | 7,2 → 7,2ms | 8 → 8 | İkisinde de geçti |
| Emüle Android Chrome | 142,31 → 143,25 | 7,2 → 7,2ms | 8 → 7 | İkisinde de geçti |
| Windows WebKit / iPhone emülasyonu | 2,62 → 3,86 | 403 → 310ms | 9 → 7 | **İkisinde de başarısız** |

Chromium'da bu örneklerde belirgin yeni bir maliyet görünmedi. WebKit örneği
daha yüksek olsa da cihaz/etki sayıları farklı; %47 kazanım veya kök nedenin
çözüldüğü iddiası yapılmaz. İki WebKit sonucu da oynanabilirlik eşiğinin altında.
Chromium tek-anlık heap 10,7–12,1MB çevresinde; tek snapshot, sızıntı/GC
profilinin yerine geçmez. Yeni yüzey üretim JS'ine hiçbir kalıcı referans eklemez.
Ölçüm toplama testleri 6/6 geçti; bu satır WebKit FPS başarısı değildir.

## Önizleme ve tanıtım

`savas-masaustu.png` / `savas-telefon.png` gerçek yerel savaş ekranlarıdır.
`savas-onizleme.mp4` gerçek savaş kaydından 7sn /1080×1920 H.264/AAC örneğidir.
Ana tanıtım da yeni zeminle yenilendi: `artifacts/promo-20261023/GRIDSHARD-tanitim-1080x1920.mp4`,
40,7sn /8.052.669 bayt. Kayıt testi geçti, sayfa hatası yok. Menü/savaş
müzikleri kurgu sırasında eklenir; ham kaynak 540×960, çıktı ölçeklenmiştir.
Görüntü kontrol kareleri ve kesim/ffprobe raporu aynı promo dizinindedir.
Bu video FPS ölçümü değildir; performans ölçümleri kayıtsız yapıldı.

## Görsel üretim kaydı

Yerleşik **imagegen** kullanıldı; CLI/API veya üçüncü taraf indirme değil.
Referans: `artifacts/store-2.1.1-20261022/feature-graphic-1024x500.png`.
Kaynak yeni bir boş soket çizimidir; referanstaki modüller/grafik düzeni
oyuna gömülmedi. Gerçek alfa korundu. `prepare-battle-platform-art.py`
yalnız 256px/WebP teknik dışa aktarımı yapar, renk veya resim boyamaz.

Kaynak: `artifacts/battle-platform-20261023/source/socket-block.png`.
Oyuna bağlı dosya: `client/assets/ui/battle-platform-v1/socket-block.webp`.
Üreticinin `.codex/generated_images/.../exec-e5bcff8a-fb8b-47bb-9281-c2a43c6d4db6.png`
orijinali de yerinde bırakıldı.

Tam istem; referans1stil girdisi, `transparent_background:true`:

```text
Use case: stylized-concept. Asset type: ONE reusable transparent mobile strategy game terrain tile, not a scene or mockup. Image 1 is STYLE REFERENCE ONLY, GRIDSHARD's approved feature graphic. Create a single empty square blue modular battlefield socket block in precisely that chunky painted casual sci-fi art family: thick blue stone/composite platform, crisp chamfered angular corners, broad hand-painted blue highlight facets, deep cobalt front thickness, restrained bold dark outline, clear slightly recessed navy equipment socket in the centre. Upper face parallel to canvas axes, square viewed almost straight down with a very shallow bottom/front edge visible; NOT a diamond/isometric rotated tile. The game's existing board supplies camera tilt. Fill about 94 percent of a square image, centred, equal left/right margins, full square silhouette intact. Top surface at least 84 percent of total height so active device sprites fit. One socket occupies central 65 percent of tile, simple flat octagonal recessed navy plate; don't create a second nested cube. Light from upper left. Small unlit brass connectors centred on all four edges, no cyan or red permanent luminous channel, since real power lines are overlaid by game code. The blue material must be saturated and shaped like the feature graphic's blue raised floor blocks, not realistic metal and not old flat grey PCB UI. Genuinely transparent outside silhouette with a minimal safe alpha margin. NO devices, NO reactors, NO weapons, NO text, NO UI, NO bolts clutter, NO animation, NO cast glow, NO surrounding floor, NO background. This one tile is repeated in a 5-column by 3-row interactive board; keep the empty socket understated enough for bright devices and HP bars to read.
```

Canlı sunucu, commit/push, AAB veya yayın yapılmadı. Bu çalışma yerel istemciye
bağlandı; kullanıcı yerelde görünümü değerlendirebilir. Önceki kirli çalışma korunur.
