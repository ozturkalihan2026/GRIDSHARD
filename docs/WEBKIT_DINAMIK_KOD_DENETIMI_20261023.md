# WebKit / FPS ve dinamik tanım denetimi — 23 Ekim 2026

## Sonuç ve sınır

Dinamik erişimi yalnız fonksiyon adının metinde geçmesine göre sınıflandırmadık.
Sunucu kataloğu → istemci kataloğu → görsel/ses profili → gerçek DOM üreticisi
zinciri üzerinden doğruladık. Bu, bütün uygulama için eksiksiz bir AST çağrı
grafiği veya her olası kullanıcı akışının çalıştırıldığı iddiası değildir.

Windows WebKit savaş FPS kapısı **hâlâ açık**. İşlevsel testlerin geçmesi,
WebKit performansının düzeldiği anlamına gelmez. Fiziksel iPhone ölçümü yok;
bu Windows Playwright WebKit sonucudur. Sunucuya geçiş/AAB/push yapılmadı.

## Dinamik yolların sınıflandırılması

| Yol | Kanıt / karar |
| --- | --- |
| 36 modül kimliği | `server/data/arena_progression_v1.json`, `canon-data.js`, `module-presentation-profiles.js` ve `module-layer-data.js` aynı küme. İki oyuncu yönünde de gerçek `mount()` çağrısı yalnız `layers` üretir. Eksik veya sahipsiz modül kaydı yok. |
| 7 çekirdek kimliği | `CORE_VISUALS` ile katman kaydındaki `core` kimlikleri eşleşir; hepsi `mountCore()` ile fiziksel resim üretir. |
| 373 dinamik katman görseli | Başlık/çalışma pozu/taban/resim yollarının tümü dosya ve WebP imzasıyla doğrulandı. Paketleyici bu kayıtları dolaşır; HTML'de tek tek yazılmamaları atıl oldukları anlamına gelmez. |
| `module-view-data.js` | Normal montaj eski atlasa düşmüyor; ancak atlas yedek çizimi ve elektrik bobini geometrisi bu veriyi kullanıyor. Topluca silinmedi. |
| `views8` / `static` yedekleri | Katman kaydı yokken gerçekten seçilebilen, yalnız tek resim üreten yollar. Ayrı testte çalıştırıldı; arka planda ikinci arayüz kurmuyor. Mevcut tam kayıtta kullanılmıyorlar; bu ayrım açıkça korunuyor. |
| `laser-aim.js` / düzlem işaretleri | Güncel katmanlı namlu konumunun hedefe projeksiyonunda kullanılıyor. Eski dosya adı, kullanılmadığı anlamına gelmiyor. 360° ve iki oyunculu geometri testleri korundu. |
| `CANON_MECHANICS` / `mechanic_id` | Güncel sunucu kataloğundaki türetilmiş kartların açık davranış devri; eski UI değil. `engine.py` onarım/soğutma ve katalog açıklamalarında tüketiliyor. Kimlik/özgün davranış testleri çalıştırıldı; oyun dengesi değiştirilmedi. |
| Eski SVG çekirdek ödülü | **Gerçekten aktif eski görsel yoldu.** Ödül satırı ve Devre Yolu ödül durakları hâlâ `coreEmblemSvg()` çağırıyordu. Güncel `coreEmblemMarkup()` resmine taşındı; SVG fonksiyonu, yedi işaret tablosu ve eski çizim stilleri kaldırıldı. |
| Kart çizicisindeki eski SVG tablosu | `emblemFor()` önce fiziksel resmi döndürdüğünden 36 güncel modül için ada göre SVG tablosuna ulaşılmıyordu. Buna rağmen başlangıçta yardımcı çizim fonksiyonları tüm tabloyu oluşturup tutuyordu. Yaklaşık 10 KB kaynak ve gereksiz başlangıç string üretimi kaldırıldı. Bilinmeyen tanım için tek genel yonga kaldı; desteklenmeyen açık kimlik artık bilinen bir adı kullanıp eski modül çizimini devralamaz. |
| Eski metin simgeleri / `iconFor` | Tek uygulama tüketicisi, mevcut sınıfın her zaman sağladığı `emblemFor` metodunun yokluğu dalıydı. Güncel betik sözleşmesinde bu yol çalışmıyor. Metin tablosu, yöntem, app yardımcısı ve ulaşılamayan dal kaldırıldı; belirsiz veri güvenli genel çizimden geçer. Eski metoda bağlı testler güncel resim/sanitizasyon davranışına taşındı. |
| `module-device-head/base`, `laser-yaw-rotor` | Güncel katman üreticisi, atlas yedeği ve statik yedek bu düğümleri oluşturmuyor. Kullanılmayan eski stiller/rotor animasyonu kaldırıldı; gerçek `module-layer-head` hedefleme/geri tepmesi korunuyor. |
| 12 eski rotor resmi | `laser-yaw-v1` (2) ve `modules-yaw-v2` (10) yalnız inert HTML paket izin listesinde kalmıştı. Güncel katmanlarda kullanılmıyor. Paket listesinden çıkarıldı: 166.700 bayt. Kaynak dosyalar ve çevrimdışı hazırlama araçları korunuyor; arşiv denetimi artık paketlenmemelerini bekler. |

`template` içindeki izin listesi resimleri zaten yüklemiyor/çizmiyordu. Bu 12
görselin kaldırılması indirme/paket temizliğidir; savaş FPS kazanımı olarak
sunulamaz. Meşru atlas yedeğinin 10 resmi ve metaverisi ayrı olarak korunuyor.

## Hedefleme sıcak yolu

`applyLayer()` her hareket karesinde `Object.entries(GROUND_YAW)` ve aday
nesnelerini yeniden oluşturuyordu. Artık her değişmez katman kaydı için yön
planı bir `WeakMap` içinde bir kez derlenir; örnekler aynı planı paylaşır.
En yakın yön ve 4° histerezis, çalışma pozu, namlu kaydı ve görüntü değişim
sınırları korunur. 1.000 poz + 20 yeni örnekte ikinci enumerasyon yapılmadığı
test edilir. Bu bir tahsis azaltımıdır; tek başına WebKit FPS çözümü değildir.

## WebKit tanı deneyleri

Tüm deneyler `artifacts/cleanup-20261023/painter-probe.spec.cjs` altında,
gerçek 18 saniyelik savaş/deploy/FPS testinin çevresinde geçici CSS ile yapıldı.
Ürün CSS'ine kaliteyi/görünümü azaltan bir kural taşınmadı; eşikler değiştirilmedi.

- İlk filtre/gölge/gradyan/root deneylerinde yaklaşık 2.5–3.2 FPS görüldü.
  Düşük öncelikli genel CSS mevcut ID-scoped `!important` kuralların tamamını
  bastırmayabileceğinden bunlar tam kategori izolasyonu sayılmaz.
- Daha güçlü tanı seçicisiyle tüm CSS animasyonları gerçekten kapandı
  (`document.getAnimations()` boş). 7 fiziksel resmin görünürlüğü/yüklenmesi
  doğrulandı. Sonuç 2.1 FPS, p95 633.5 ms, 0 bir-saniyelik donma; hâlâ başarısız.
- Aynı yüksek öncelikli maske/filtre/backdrop/clip-path izolasyonu 2.1 FPS,
  p95 540.5 ms verdi. 8 fiziksel resim görünür kaldı.
- Bu koşularda ölçülen JS frame gövdesi maksimum 23–25 ms, motion 2–3 ms,
  canvas 1–2 ms. Bunlar bütün tarayıcının native stil/paint/compositor maliyetini
  kapsamaz. Sonucu kanıtsız biçimde sürücü hatasına bağlamıyoruz.

Dolayısıyla yalnız yeni VFX, CSS animasyonu veya eski modül tanımının varlığı
kök neden olarak doğrulanmadı. Sonraki izolasyon native stil/paint maliyeti ve
gerçek cihaz karşılaştırması olmalı; görünümü bozarak FPS kapısını geçmek değil.

## Doğrulama

- İstemci 700/700; yeni 7 dinamik kayıt/erişilebilirlik testi dahil.
- Paketleme 10/10; syntax ve `git diff --check` başarılı.
- Sunucu katalog + çekirdek + modül kimlik testleri 27/27.
- Normal FPS + arayüz matrisi 20/21: 18 işlevsel vaka ve iki Chromium FPS
  kapısı geçti, yalnız WebKit FPS kaldı (5.3 dakika). Ardından eski modül
  tablosu temizliği için ilgili 9 vaka tekrarlandı: 8 geçti, yine yalnız
  WebKit FPS başarısız. Son WebKit modül/ödül vakaları son temizliği de kapsar.
- Son normal FPS: desktop Chromium 138.4 / p95 7.5 ms; Android Chrome
  emülasyonu 138.7 / p95 7.5 ms; Windows iPhone/WebKit emülasyonu 2.0 /
  p95 551.5 ms. Üçünde bir-saniyelik donma sayısı 0; WebKit buna rağmen
  `sample_too_short,p95_frame_time,jank_ratio` nedeniyle geçmiyor.
- Son izole üretim web paketi `967d22aea1ce8167`, 44 betik / 607 varlık:
  `artifacts/web-dynamic-audit-B8L48j/dist`. Ana `dist`/Android değiştirilmedi.
- Kanıtlar: `artifacts/cleanup-20261023/client-dynamic-audit.tap`,
  `e2e-dynamic-21-results.json`, `e2e-dynamic-final-9-results.json` (aynı klasör).
- Sandbox Windows hardlink/rename testlerine izin vermediğinde aynı testler
  yükseltilmiş yerel süreçte, hiçbir test atlanmadan tekrar çalıştırıldı.

İlgili testler: `dynamic-art-reachability.test.js`, `modules-yaw-v12.test.js`,
`laser-yaw-v11.test.js`, `visual-pass-3-surfaces.test.js`,
`visual-pass-4-emblem-surfaces.test.js`, `presentation-refinements.spec.js`.
