# Savaş performans bütçesi

"Son Öneriler" #8, Beta.72 tur 10. Ölçüm kodu `client/src/battle/battle-performance.js`, bağlantısı `client/src/app.js` (`sampleBattlePerformance`), yayın kapısı `server/app/mobile_release_gate.py`. **Eşikler başlangıç değeridir; henüz hiçbir gerçek cihazda ölçülmedi** (test, tarayıcı ve cihaz çalıştırılmadı — kullanıcı kararı). İlk gerçek cihaz koşuları eşikleri doğrulamalıdır.

## Ne ölçülür

Savaş sürerken (yerel AI savaşı ya da çevrimiçi `onlineStatus = battle`) animasyon karelerinin süresi. Oyuncunun cihazında kareler yalnız kısa ölçüm pencerelerinde izlenir: her 10 saniyenin ilk 1,2 saniyesi (`FRAME_SAMPLING_PERIOD_MS`, `FRAME_SAMPLING_WINDOW_MS`). Pencere dışında oyun döngüsü HUD hızında (250 ms) döner; her karede boş bir `requestAnimationFrame` çalıştırmak tarayıcıyı bütün animasyonları ana iş parçacığında yeniden hesaplamaya zorluyordu. Tarayıcı testleri ve gerçek cihaz kanıtı (`?e2e=1`) savaşın tamamını ölçer; bütçe bu tam ölçüme göre değerlendirilir.

| Alan | Anlam |
| --- | --- |
| `duration_ms`, `frame_count`, `fps_avg` | Ölçülen savaş süresi (arka planda geçen süre hariç), kare sayısı, ortalama kare hızı |
| `frame_ms_p50` / `p95` / `p99` / `max` | Kare süresi yüzdelikleri (1 ms kovalı histogram, kova ortası) |
| `jank_count`, `jank_ratio` | 50 ms'yi aşan kareler (60 Hz'de üç ve daha fazla atlanan tarama) |
| `freeze_count` | 1 sn'yi aşan kareler (donma) |
| `effect_nodes_max` | Efekt katmanındaki (`#battle-effect-layer`) en yüksek öğe sayısı — sızıntı göstergesi |
| `dom_nodes_max` | Belgedeki en yüksek öğe sayısı (saniyede bir örneklenir) |
| `js_heap_mb_max` | JS belleği (yalnız Chromium; Safari'de `null`) |
| `graphics_quality`, `battle_perspective`, `device_memory_gb`, `cpu_cores`, `platform`, `mode` | Karşılaştırma bağlamı |
| `budget_passed`, `budget_violations` | Aşağıdaki bütçenin sonucu |

Sekme arka plana geçince (`visibilitychange`) ölçüm bekletilir; dönüşteki ilk aralık kare ya da donma sayılmaz. Histogram sabit boyutludur; uzun savaşta bellek büyümez. Sayaçlar hata verirse oyun etkilenmez.

## Bütçe

| Kural | Eşik | İhlal kodu |
| --- | --- | --- |
| Örnek uzunluğu | en az 15 sn ve 300 kare | `sample_too_short` |
| Kare süresi p95 | ≤ 34 ms (30 fps tabanı; iki taramalık 33,3 ms kare geçer) | `p95_frame_time` |
| Takılma oranı | 50 ms'yi aşan kare ≤ %3 | `jank_ratio` |
| Donma | 1 sn'yi aşan kare yok | `freeze` |

Aynı sayılar `GRIDSHARD_PERFORMANCE_BUDGET` (istemci) ve `PERFORMANCE_BUDGET` (yayın kapısı) içinde tutulur; `server/tests/test_mobile_release_gate.py` ikisinin eşit olduğunu denetler.

Gözlem (kapıyı kapatmaz, eğilim için): `effect_nodes_max`, `dom_nodes_max`, `js_heap_mb_max`. Gerçek cihaz verisi birikince bunlar için de eşik konulabilir.

## Grafik kademeleri

Ayarlar → Grafik sekmesi → Grafik: **Otomatik** (varsayılan), Düşük, Orta, Yüksek. Kademe `body[data-graphics]` ile uygulanır; kuralları `client/src/canon.css` içindeki "Savaş performansı ve grafik kademeleri" bölümündedir.

| Kademe | Fark |
| --- | --- |
| Yüksek | Bütün efektler; vuruşta on ayrı kıvılcım; kart parlamaları kartın kendisinde |
| Orta | Kablo akımı tek katmanın opaklığıyla canlanır, hücre ve tahta filtreleri yoktur; vuruş tek öğelik patlamadır; kart geri bildirimi kartın üstündeki katmanda (`.module-fx-overlay`) oynar; parçacık sayısı yarıdır |
| Düşük | Orta kademeye ek olarak tahta eğimi (perspektif) kapanır ve parçacıklar en fazla dörttür |

Aynı anda yaşayan efekt kökü sayısı kademeye göre sınırlıdır (`BATTLE_EFFECT_ROOT_BUDGET`: 8 / 14 / 32); sınır aşılınca yeni efektler sadeleşir.

**Otomatik** kip cihaza göre başlar (`client/src/battle/graphics-tier.js`): masaüstü Yüksek; bellek bilgisi veren mobil cihazda (Android) bellek ≤ 2 GB ya da ≤ 4 çekirdek Düşük, bellek ≤ 4 GB ya da ≤ 6 çekirdek Orta, diğerleri Yüksek. `navigator.deviceMemory` ikinin kuvvetine yuvarlandığından 6 GB bellekli telefon 4 olarak görünür ve Orta kademede başlar. Bellek bilgisi vermeyen cihaz (iPhone, iPad) Yüksek başlar: WebKit çekirdek sayısını gizlilik için 4 ya da 8 olarak bildirir, altı çekirdekli iPhone 4 görünür; bu sayı tek başına kademe seçmek için kullanılmaz. Ölçüm pencerelerinde ortalama kare süresi 26 ms'yi ya da 50 ms'yi aşan kare oranı %8'i art arda iki kez aşarsa kademe bir iner (`GridshardGraphicsTier.Controller`, aynı dosya). İnen kademe cihazda aynı sürüm boyunca hatırlanır; yeni sürümde ölçüm baştan yapılır. Oyuncu elle kademe seçerse otomatik düşürme yapılmaz.

Ekim 2026 turunda ölçümler masaüstü Chrome'da işlemci 4× ve 6× yavaşlatılarak yapıldı; gerçek telefonda doğrulanmadı.

## Nereden okunur

- Tarayıcıda: `window.__GRIDSHARD_PERF.current` (süren savaş), `.last` (son biten savaş), `.budget`.
- Ürün analitiği: mevcut rızaya bağlı akış yalnız kaba FPS kategorisi gönderir (`docs/ANALYTICS.md`); ayrıntılı performans özeti sunucuya otomatik gönderilmez. Cihaz, bellek ve işlemci bağlamı yalnız yerel kanıtta kalır.
- Gerçek cihaz E2E (`e2e/real-device-browserstack.js`): ev ekranından savaşa girer, bir kart yerleştirir, **20 sn** oynar, teslim olur ve `.last` özetini `qa_reports/device_evidence/<hedef>.json` içine `performance` olarak yazar.

## Yayın kapısı

`python tools/mobile_release_gate.py --stage android|ios …` gerçek cihaz kanıtında `performance` yoksa ya da bütçe aşılmışsa `ready: false` verir ve nedeni `blockers` içinde yazar (ör. "Kare süresi p95 41 ms; bütçe 34 ms."). Varsayılan cihazlar üst seviyedir (Galaxy S23 Ultra, iPhone 16); bütçe ayrıca düşük seviye bir Android (ör. 3–4 GB bellek) ve daha eski bir iPhone ile ölçülmelidir. Cihaz `REAL_DEVICE_NAME` ve `REAL_DEVICE_OS_VERSION` ile BrowserStack cihaz listesinden seçilir; kanıt dosyası cihaz adını ve sürümünü kaydeder.

## Bütçe aşılırsa ilk bakılacaklar

1. `effect_nodes_max` yüksekse efekt öğeleri temizlenmiyordur (`clearBattleVisualElement`, efekt havuzu).
2. `battle_perspective: true` ve p95 yüksekse perspektifi kapatıp karşılaştırın (Ayarlar → Savaş Alanı Perspektifi); eğik tahta düşük GPU'larda bileşim maliyeti getirebilir.
3. `graphics_quality` düşürülünce iyileşme yoksa darboğaz DOM güncellemeleridir. Tahtalar hücre imzasıyla karşılaştırılır ve yalnız değişen hücre yeniden kurulur (`GridshardBattleBoardView`, `renderEnemyBoard`); kablo geometrisi tahta boyutu değişmedikçe yeniden ölçülmez (`renderBoardCables`). Chrome izinde "Forced reflow" uyarıları artmışsa bir çizim yolu yerleşim okumayı (`getBoundingClientRect`, `offsetLeft`) yazmalarla iç içe yapıyordur.

