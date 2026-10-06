(function (global) {
  "use strict";

  // Grafik kademesi kararları (docs/PERFORMANCE_BUDGET.md, "Grafik kademeleri").
  // Hesaptaki ayar her cihaza taşınır; "Otomatik" ise cihaza özeldir: donanıma
  // göre başlar ve savaşta kare hızı düşük kalırsa bir kademe iner. Sonucu
  // ekrana app.js uygular (`body[data-graphics]`); burada ekran kodu yoktur.
  const TIERS = Object.freeze(["dusuk", "orta", "yuksek"]);
  const DEFAULT_TIER = "yuksek";
  const MODE_STORAGE_KEY = "gridshard.graphics-mode";
  const AUTO_TIER_STORAGE_KEY = "gridshard.graphics-auto-tier";

  // Otomatik düşürme: bir ölçüm penceresi en çok 4 sn sürer. Ortalama kare
  // süresi 26 ms'yi ya da 50 ms'yi aşan karelerin oranı %8'i geçerse pencere
  // kötüdür; art arda iki kötü pencere kademeyi bir indirir.
  const WINDOW_MS = 4000;
  const MIN_WINDOW_MS = 1000;
  const MIN_WINDOW_FRAMES = 10;
  const SLOW_AVERAGE_MS = 26;
  const SLOW_FRAME_MS = 50;
  const SLOW_FRAME_RATIO = 0.08;
  const RESUME_GAP_MS = 1000;
  const BAD_WINDOWS_TO_LOWER = 2;

  // Başlangıç kademesi yalnız cihazın bildirdiği donanıma bakar.
  //
  // Bellek bilgisini (`navigator.deviceMemory`) yalnız Chromium verir ve
  // ikinin kuvvetine yuvarlar: 6 GB'lık telefon 4 görünür. WebKit (iPhone,
  // iPad) belleği bildirmez; çekirdek sayısını da gizlilik için 4 ya da 8'e
  // yuvarlar, altı çekirdekli iPhone 4 görünür. Bu yüzden çekirdek sayısı
  // yalnız bellek bilgisiyle birlikte kullanılır: bellek bilgisi vermeyen
  // cihaz Yüksek başlar ve gerekirse savaşta iner.
  function detectGraphicsTier({ mobile = false, deviceMemory = 0, hardwareConcurrency = 0 } = {}) {
    if (!mobile) return "yuksek";
    const memory = Number(deviceMemory) || 0;
    const cores = Number(hardwareConcurrency) || 0;
    if (!memory) return "yuksek";
    if (memory <= 2 || (cores && cores <= 4)) return "dusuk";
    if (memory <= 4 || (cores && cores <= 6)) return "orta";
    return "yuksek";
  }

  class GraphicsTierController {
    // read/write: cihaza özel tercih deposu. version: derleme sürümü.
    // accountTier: hesaptaki kayıtlı kademe. device: cihazın bildirdikleri.
    constructor({ read, write, version, accountTier, device }) {
      this.readPreference = read;
      this.writePreference = write;
      this.version = version;
      this.accountTier = accountTier;
      this.device = device;
      this.cachedAutoTier = null;
      this.window = null;
      this.badWindows = 0;
    }

    read(key) {
      try {
        return this.readPreference(key) ?? null;
      } catch (_) {
        return null;
      }
    }

    write(key, value) {
      try {
        this.writePreference(key, value);
      } catch (_) {
        // Depolama kapalıysa tercih yalnız bu oturumda geçerlidir.
      }
    }

    isAuto() {
      const mode = this.read(MODE_STORAGE_KEY);
      if (mode === "auto") return true;
      if (mode === "manual") return false;
      // Tercih yokken: hesap ayarı varsayılandan farklıysa oyuncu kendi seçmiştir.
      return (this.accountTier() || DEFAULT_TIER) === DEFAULT_TIER;
    }

    setMode(mode) {
      this.write(MODE_STORAGE_KEY, mode === "auto" ? "auto" : "manual");
    }

    autoTier() {
      if (this.cachedAutoTier) return this.cachedAutoTier;
      // Savaşta düşürülen kademe aynı sürüm boyunca hatırlanır; yeni sürüm
      // iyileştirme getirmiş olabileceği için ölçüm baştan yapılır.
      const [tier, version] = String(this.read(AUTO_TIER_STORAGE_KEY) || "").split("@");
      this.cachedAutoTier =
        TIERS.includes(tier) && version === this.version()
          ? tier
          : detectGraphicsTier(this.device());
      return this.cachedAutoTier;
    }

    tier() {
      if (this.isAuto()) return this.autoTier();
      const stored = this.accountTier();
      return TIERS.includes(stored) ? stored : DEFAULT_TIER;
    }

    // Otomatik kipte kademeyi bir indirir; inilen kademeyi, inilemiyorsa null döndürür.
    lower() {
      if (!this.isAuto()) return null;
      const index = TIERS.indexOf(this.autoTier());
      if (index <= 0) return null;
      this.cachedAutoTier = TIERS[index - 1];
      this.write(AUTO_TIER_STORAGE_KEY, `${this.cachedAutoTier}@${this.version()}`);
      return this.cachedAutoTier;
    }

    // Savaşta her kare için çağrılır. Kademe indiyse yeni kademeyi döndürür.
    trackFrame(now, { sampling = true, hidden = false } = {}) {
      if (!sampling || hidden || !Number.isFinite(now)) return this.closeWindow();
      if (!this.window) {
        this.window = { start: now, last: now, frames: 0, slow: 0 };
        return null;
      }
      const gap = now - this.window.last;
      if (gap < 0 || gap > RESUME_GAP_MS) {
        // Arka plandan dönüş: pencere baştan başlar.
        this.window = null;
        return null;
      }
      this.window.last = now;
      this.window.frames += 1;
      if (gap > SLOW_FRAME_MS) this.window.slow += 1;
      return now - this.window.start >= WINDOW_MS ? this.closeWindow() : null;
    }

    closeWindow() {
      const current = this.window;
      this.window = null;
      if (!current) return null;
      const elapsed = current.last - current.start;
      // Çok kısa pencere hüküm vermez: ne kötü sayılır ne de sayacı sıfırlar.
      if (elapsed < MIN_WINDOW_MS || current.frames < MIN_WINDOW_FRAMES) return null;
      const bad =
        elapsed / current.frames > SLOW_AVERAGE_MS
        || current.slow / current.frames > SLOW_FRAME_RATIO;
      this.badWindows = bad ? this.badWindows + 1 : 0;
      if (this.badWindows < BAD_WINDOWS_TO_LOWER) return null;
      this.badWindows = 0;
      return this.lower();
    }
  }

  const GridshardGraphicsTier = Object.freeze({
    tiers: TIERS,
    detect: detectGraphicsTier,
    Controller: GraphicsTierController,
  });

  global.GridshardGraphicsTier = GridshardGraphicsTier;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GridshardGraphicsTier };
  }
})(typeof window !== "undefined" ? window : globalThis);
