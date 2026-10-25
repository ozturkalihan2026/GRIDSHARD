# Paylaşılan WebKit araştırmasının kod ve ölçüm karşılaştırması

23 Ekim 2026. Girdi: kullanıcının masaüstündeki `webkit fps.txt`.
Bu tur **inceleme ve tanı** yapıldı; uygulama/CI kaynakları değiştirilmedi.
Önceki commit edilmemiş çalışmalar korundu. Tanı dosyaları yalnız
`artifacts/cleanup-20261023/research-probe*` altında; ürün paketine girmez.

## Sonuç

Araştırma yararlı bir kontrol listesi, fakat genel WebGL tavsiyeleri bu oyuna
doğrudan uygulanamaz. GRIDSHARD savaş sahnesi DOM/resim/SVG + saydam Canvas2D
efektlerinden oluşuyor. Kaynakta çalışan WebGL renderer/context yok.

Yeni somut bulgu: **perspektif kapalı görünüm hâlâ gerçek 2B çizim yolu değil.**
`modules-yaw-v12.css` içindeki board transform, açı sıfır olsa bile
`perspective(...) rotateX(0deg) scale(.98)` kullanır. Board → hücre → kart →
ikon → rig → billboard zincirinde `preserve-3d` kalır. Düşük kalite/perspektif
kapalı ayarı device-height'ı sıfırlasa bile `presentation-refinements-v16.css`
billboard'a `translateZ(max(2px,var(--device-height,7px)))` uygular. HP/ısı
çubuklarında da 6px Z kalır. Bu bir maliyet adayıdır; tek kök neden diye
kanıtlanmadı. Tüm zinciri zorla düzleştiren tanı da bütçeyi geçmedi.

Ölçülen JS frame süreleri, görülen yüzlerce milisaniyelik frame aralıklarını
tek başına açıklamıyor. Bulgular native style/paint/compositing tarafını
inceleme önceliği yapıyor; sürücü hatası veya belirli bir CSS kuralının tek
suçlu olduğu sonucunu kanıtlamıyor.

## Araştırmanın altı maddesi bizde ne durumda?

| Madde | Mevcut kod / değerlendirme |
| --- | --- |
| devicePixelRatio en çok 2 | `module-fx-canvas.js:41` zaten 1–2 arasında sınırlar. Canvas buffer'ı yalnız boyut/DPR/layout kirlenince yenilenir. Ölçülen cihaz DPR3, gerçek efekt buffer DPR2. DPR1 tanısı çözmedi. |
| WebGL high-performance, antialias, alpha | Aktif bağlam `getContext("2d")`; WebGL seçeneklerini eklemek çözüm değil. Efekt yüzeyi saydam olarak tahtanın üzerinde olduğundan alpha:false önermek de görünümü bozabilir. |
| Object pooling / GC | Bazı küçük sıcak-yol tahsisleri var; aşağıda listeli. Ama her yeni nesne bellek sızıntısı değildir. Kuyruklar sınırlı, bitenler bırakılır, glow cache en fazla 24 öğe. Mevcut kısa tanıda GC kök neden olarak kanıtlanmadı; fiziksel WebKit heap/GC profili yok. |
| Touch/selection | Görsel resimlerde user-select/drag engeli var; efekt canvas'ında pointer-events:none, touch-action:auto. Canvas dokunmanın hedefi olmadığı için ona touch-action:none eklemek tahta etkileşimini tek başına değiştirmez. Ölçüm boyunca sürükleme/kaydırma yapılmadığı halde FPS çok düşük. Tahta etkileşimi ayrı test edilmeli; tüm uygulamada pinch/scroll kapatılmamalı. |
| DOM okumalarını döngüden çıkarma | Kısmen uygulanmış: canvas boyutu layout epoch'unda; kablolar ResizeObserver/epoch ile; hedef düzlemi rig başına cache'li. Ama task-scope anchor cache ve çekirdek idle ölçümleri hâlâ var. Geçici donmuş ölçüm tanısında native rect çağrısı ciddi azaldı, FPS düzelmedi. |
| Web Audio ve background lifecycle | Web Audio yolu ve HTML medya yedeği var. Gizlenince ses kaynakları durdurulup context suspend edilir; savaş rAF/timer'ı menü/gizli durumda iptal edilir. Testte Windows WebKit Web Audio context'i unavailable bildiriyor; bu ortam gerçek WKWebView ses davranışını temsil etmez. Sabit kalitede bütün ses yöneticisini devreden çıkarmak da büyük yavaşlığı çözmedi. |

## Kalan gerçek sıcak yollar ve etkin eski stil

1. `app.js:11214` / `battleAnchorRects`: her yeni görevde layer, iki board ve
   kart rect'leri yeniden toplanıyor; beş yeni Map oluşturuluyor. Cache
   `queueMicrotask` ile bırakılıyor. Rig içi göreli düzlemler ayrı cache'de.
   Uzun ömürlü cache düşünülürse yalnız resize değil yeni kart, yer değişimi,
   scroll, kamera ve gerçek layout değişiklikleriyle invalidation gerekir.
2. `app.js:20657` / `emitCoreIdleMotes`: en sık 220ms'de bir layer/pulse rect'i
   ve `--core-accent` için computed style okur. Frame başındaki HUD yazımından
   sonra çalışabildiği için kirli layout/style'ı flush etme ihtimali vardır.
3. `module-motion.js:227` aim lock nesnesi, `:236` pose nesnesi, `:242`
   dirty Set'inin array kopyası; `module-fx-canvas.js:230` her beam çiziminde
   dört alt array oluşturur. Küçük ama gerçek tahsis adaylarıdır. Her snapshot'ta
   oluşturulan record Map'i her rAF'te oluşturuluyor diye sunulmamalı.
4. `app.js:9338`/`:9386` civarındaki reduced getter'ları yinelenen
   `matchMedia(...)` çağrıları yapar; tek MediaQueryList paylaşılması düşünülebilir.
5. `styles.css:3957` global eski tema hâlâ etkin: savaş body arka planında dört
   gradient katmanı gerçekten computed style'a giriyor. Bu dosya atıl değil;
   modern sahnenin altında aktif eski global stil var. Düz kök arka plan tanısı
   da yeterli değil. Doğrudan silmek görünümü değiştirir; mevcut görünüm korunarak
   yeniden boyama sınırı incelenmeli.

Bir DOM boyut okuması her durumda tam reflow demek değildir; hesap kirliyken
senkron güncelleme gerektirebilir. Dolayısıyla yalnız çağrı sayısına bakıp
"bu satır FPS'i 10'a düşürüyor" hükmü verilemez.

## Geçici WebKit tanıları

Windows Playwright WebKit / iPhone emülasyonu. Her koşu ~18 saniye, aynı deploy
listesi; gerçek sunucu maçı izole test hesabında sürer. Sahnede kabul edilen
kart/olay sayıları farklı olabilir. İlk grup otomatik kalitededir; ölçüm
sonunda kademe genelde Orta'ya inmiştir. Bu nedenle küçük farklar nedensellik
veya istatistiksel performans kazancı sayılmaz.

| Tanı | Bağımsız rAF FPS | p95 aralık ms | Not |
| --- | ---: | ---: | --- |
| Normal, otomatik | 1,49 | 679 | 346 native rect okuması; toplam 88ms |
| Efekt canvas DPR1 | 1,43 | 737 | Buffer 766×1090 yerine 383×545; piksel alanı dörtte bir |
| Donmuş konum önbelleği | 1,43 | 776 | 378 rect isteğinin yalnız 59'u native; toplam 23ms |
| Zorla flat/transform:none | 2,42 | 477 | Gerçek flat olduğu computed style ile doğrulandı; görünüm değişir |
| Sahne/efekt/raf boyaması gizli | 6,00 | 461 | visibility:hidden; JS/sunucu akışı sürer; oyun için çözüm değildir |
| Kök arka planı tek renk | 2,20 | 528 | body background-image:none doğrulandı; görünüm değişir |

İlk ses-kapalı denemesi 2,70 FPS verdi, ancak kalite Düşük/perspektif kapalı
hale geldiği için ses etkisi diye yorumlanmadı. Sabit Yüksek/manuel kalite ve
perspektif açık karşılaştırması yeniden yapıldı:

| Sabit kalite | Bağımsız rAF FPS | p95 ms |
| --- | ---: | ---: |
| Ses yöneticisi normal | 2,44 | 440 |
| Ses yöneticisi hiç oluşturulmadı | 2,64 | 390 |

İkisinde de budget_passed:false. Bu küçük ve farklı savaş yükleriyle alınmış
fark, sesin büyük darboğaz olduğunu kanıtlamaz. Normal sabit koşuda body ve
document 393×659 görünüm boyutundaydı: devasa taşan belge hipotezi bu örnekte
doğrulanmadı. Canvas tick toplamı 18 saniyede 2–6ms; motion tick 8–9ms;
ölçülen JS frame gövdesi maksimum 15–23ms. Bunlar native boyama süresini
kapsamaz ve iç içe süreler toplanmamalıdır.

**9 tanı koşusu teknik olarak tamamlandı; hiçbirinin FPS bütçesi geçmedi.**
Tanı testlerinin yeşil çıkması yalnız örneğin geçerli olmasıdır; mevcut
`battle-render-budget.spec.js` ve yayın eşikleri aynen duruyor. Donmuş cache,
gizli sahne, flat ve tek renk tanıları ürüne uygulanmadı.

14 ilgili mevcut canvas/yaşam döngüsü/ses testi yeniden geçti. Kaynak kod
incelemesinde WebGL context'i bulunmadı; yalnız iki Canvas2D context yolu var.

Kanıt: `artifacts/cleanup-20261023/research-probe-results.json`,
`research-probe-render-results.json`, `research-probe-fixed-quality-results.json`.
Yeniden üretim senaryosu ve config aynı klasörde `research-probe.spec.cjs`,
`research-probe.config.cjs`. GRIDSHARD_RESEARCH_MODES/LOCK_QUALITY/REPORT yalnız
bu tanı senaryosunu etkiler; ürün bayrağı veya eşik değildir.

## Sonraki doğru adım

1. Aynı sabit sahne üzerinde native style/layout/paint/compositing ayrımı;
   gerçek Safari/WKWebView Rendering Frames kaydıyla karşılaştırma.
2. Onaylı kamera/çizim görünümünü koruyan, düşük kalite/perspektif kapalı
   koşulunda gerçekten hafif bir katman yolu tasarlama. Körlemesine tüm
   transformları silmek, daha önce çözülen çekirdek kırpılması/namlu hizasını
   geri bozabilir.
3. Ardından doğru invalidation'lı geometri cache'i, idle accent cache'i ve
   ölçülen sıcak tahsisleri azaltma. Bunlar tek başına FPS çözümü diye sunulmaz.

Fiziksel iPhone/iPad ölçümü, uzun WebKit heap/GC kaydı veya WKWebView context
kaybı kanıtı yok. Windows WebKit sonucunu gerçek iOS cihaz sonucu diye
sunmuyoruz. Commit/push, sunucu değişimi veya AAB yapılmadı.

Resmî referanslar:
[WebKit güç/verimlilik ve gizli sayfa davranışı](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/),
[Rendering Frames: JS, layout, paint ve compositing ayrımı](https://webkit.org/blog/3996/introducing-the-rendering-frames-timeline/).
