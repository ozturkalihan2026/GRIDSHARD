(() => {
  "use strict";


  // Savaş kartı dardır (tahtada ~46 px, rafta ~44 px). On iki karakteri aşan
  // adlar için kart üstünde kısa ad yazılır; tam ad başlık ve erişilebilirlik
  // etiketinde kalır.
  const SHORT_NAMES = Object.freeze({
    "Onarım Modülü":"Onarım",
    "Hedefleme Bilgisayarı":"Hedefleme",
    "Aşırı Hızlandırıcı":"Hızlandırıcı",
    "Füze Fırlatıcı":"Füze",
    "Sinyal Bozucu":"Bozucu",
    "Akım Dengeleyici":"Dengeleyici",
    "Plazma Havanı":"Plazma",
    "Muhafız Kubbesi":"Kubbe",
    "Nano Sağlıkçı":"Nano",
    "Kuantum Tekrarlayıcı":"Tekrarlayıcı",
    "Sürü Fabrikatörü":"Sürü",
    "Hassasiyet Matrisi":"Matris",
    "Prizma Kalkanı":"Prizma",
    "Tekillik Projektörü":"Tekillik",
    "Omega Güçlendirici":"Omega",
  });

  // Current modules use registered physical paintings. Only unknown data
  // needs one safe generic chip; do not build/retain an obsolete named SVG set.
  const EMBLEM_FALLBACK = '<path class="me-fill me-c" d="M10 6h28q4 0 4 4v28q0 4-4 4H10q-4 0-4-4V10q0-4 4-4Z"/>'
    + '<path class="me-light me-c" d="M10 6h28q4 0 4 4v3H6v-3q0-4 4-4Z"/>'
    + '<path class="me-ink" d="M10 6h28q4 0 4 4v28q0 4-4 4H10q-4 0-4-4V10q0-4 4-4Z"/>'
    + '<path class="me-fill me-w" d="M17 25a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z"/>'
    + '<path class="me-ink" d="M17 25a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z"/>';
  const CATEGORIES = Object.freeze(["saldırı", "savunma", "destek", "sistem", "sabotaj"]);

  class GridshardModuleCardView {
    // Painted canon identity first; unknown/unsupported IDs get a generic chip.
    static emblemFor(module) {
      const device = globalThis.GridshardModuleDeviceArt?.markup(module);
      if (device) return device;
      const fallbackCategory = String(module?.category || "");
      const core = (module?.definition_id || module?.definitionId || module?.id) === "core" || module?.nameTr === "Çekirdek";
      const category = core ? "sistem" : (CATEGORIES.includes(fallbackCategory) ? fallbackCategory : "");
      return `<svg class="module-emblem" data-cat="${category}" viewBox="0 0 48 48" focusable="false" aria-hidden="true">${EMBLEM_FALLBACK}</svg>`;
    }

    static shortNameFor(module) {
      if (globalThis.GridshardModuleDeviceArt?.idFor(module) === "armor") return "Sönümleyici";
      const name = String(module?.nameTr || "");
      return SHORT_NAMES[name] || name;
    }
  }

  globalThis.GridshardModuleCardView = GridshardModuleCardView;
})();
