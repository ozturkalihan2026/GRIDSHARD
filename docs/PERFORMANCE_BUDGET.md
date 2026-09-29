# Savaş performans bütçesi

"Son Öneriler" #8, Beta.72 tur 10. Ölçüm kodu `client/src/battle/battle-performance.js`, bağlantısı `client/src/app.js` (`sampleBattlePerformance`), yayın kapısı `server/app/mobile_release_gate.py`. **Eşikler başlangıç değeridir; henüz hiçbir gerçek cihazda ölçülmedi** (test, tarayıcı ve cihaz çalıştırılmadı — kullanıcı kararı). İlk gerçek cihaz koşuları eşikleri doğrulamalıdır.

## Ne ölçülür

Savaş başladığı andan (yerel AI savaşı ya da çevrimiçi `onlineStatus = battle`) bittiği ana kadar her animasyon karesinin süresi:

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

## Nereden okunur

- Tarayıcıda: `window.__GRIDSHARD_PERF.current` (süren savaş), `.last` (son biten savaş), `.budget`.
- Ürün analitiği: mevcut rızaya bağlı akış yalnız kaba FPS kategorisi gönderir (`docs/ANALYTICS.md`); ayrıntılı performans özeti sunucuya otomatik gönderilmez. Cihaz, bellek ve işlemci bağlamı yalnız yerel kanıtta kalır.
- Gerçek cihaz E2E (`e2e/real-device-browserstack.js`): ev ekranından savaşa girer, bir kart yerleştirir, **20 sn** oynar, teslim olur ve `.last` özetini `qa_reports/device_evidence/<hedef>.json` içine `performance` olarak yazar.

## Yayın kapısı

`python tools/mobile_release_gate.py --stage android|ios …` gerçek cihaz kanıtında `performance` yoksa ya da bütçe aşılmışsa `ready: false` verir ve nedeni `blockers` içinde yazar (ör. "Kare süresi p95 41 ms; bütçe 34 ms."). Varsayılan cihazlar üst seviyedir (Galaxy S23 Ultra, iPhone 16); bütçe ayrıca düşük seviye bir Android (ör. 3–4 GB bellek) ve daha eski bir iPhone ile ölçülmelidir. Cihaz `REAL_DEVICE_NAME` ve `REAL_DEVICE_OS_VERSION` ile BrowserStack cihaz listesinden seçilir; kanıt dosyası cihaz adını ve sürümünü kaydeder.

## Bütçe aşılırsa ilk bakılacaklar

1. `effect_nodes_max` yüksekse efekt öğeleri temizlenmiyordur (`clearBattleVisualElement`, efekt havuzu).
2. `battle_perspective: true` ve p95 yüksekse perspektifi kapatıp karşılaştırın (Ayarlar → Savaş Alanı Perspektifi); eğik tahta düşük GPU'larda bileşim maliyeti getirebilir.
3. `graphics_quality` düşürülünce iyileşme yoksa darboğaz DOM güncellemeleridir (`renderShelf`/`renderBoard` her 250 ms'de bir çalışır).

