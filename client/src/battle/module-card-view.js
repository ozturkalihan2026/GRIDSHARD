(() => {
  "use strict";

  const ICONS = Object.freeze({
    "Çekirdek":"◆", "Batarya":"▣",
    "Kapasitör":"▤", "Lazer":"↯", "Darbe Topu":"◉", "Ray Topu":"➤",
    "Füze Fırlatıcı":"▲", "Dron Üssü":"✣", "Ark Topu":"ϟ", "Kalkan":"⬡",
    "Zırh":"▰", "Yansıtıcı":"◇", "Bariyer":"▥", "Onarım":"☾", "Onarım Modülü":"☾",
    "Soğutucu":"❄", "Güçlendirici":"＋", "Hedefleme Bilgisayarı":"⌖",
    "Aşırı Hızlandırıcı":"≫", "EMP":"⊘", "Sinyal Bozucu":"≋", "Virüs":"⌁",
    "Kesici":"╳",
    "Akım Dengeleyici":"⇌", "Plazma Havanı":"◍", "Muhafız Kubbesi":"⏣",
    "Nano Sağlıkçı":"✜", "Kuantum Tekrarlayıcı":"⋈", "Krono Rölesi":"◷",
    "İyon Mızrağı":"↗", "Faz Zırhı":"▱", "Sürü Fabrikatörü":"✥",
    "Hassasiyet Matrisi":"⊞", "Kuantum Topu":"◎", "Anka Onarım":"✺",
    "Prizma Kalkanı":"⬢", "Tekillik Projektörü":"⊛", "Omega Güçlendirici":"Ω"
  });

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

  // Modül amblemleri: her modül, sandıklar ve kaynak simgeleriyle aynı dilde çizilir
  // (dolu gövde, aydınlık ve gölge yüz, koyu kontur). Renk modülün sınıfından gelir
  // (`data-cat`; canon.css, "Görsel tur 5"). Çizim alanı 48×48'dir. Parça tonları:
  // c sınıf rengi (cl açık, cd koyu), m metal, w beyaz, g enerji sarısı, v boşluk.
  const fixed = (value) => Number(value.toFixed(2));
  const shape = (cls, d) => `<path class="${cls}" d="${d}"/>`;
  const ring = (cx, cy, r) => `M${fixed(cx - r)} ${cy}a${r} ${r} 0 1 0 ${fixed(2 * r)} 0a${r} ${r} 0 1 0 ${fixed(-2 * r)} 0Z`;
  // Dolu parça: gövde, aydınlık yüz, gölge yüz ve üstüne yeniden çizilen kontur.
  const solid = (tone, d, light = "", dark = "") => shape(`me-fill me-${tone}`, d)
    + (light ? shape(`me-light me-${tone}`, light) : "")
    + (dark ? shape(`me-dark me-${tone}`, dark) : "")
    + shape("me-ink", d);
  // Küre: sol üstte aydınlık, sağ altta gölge hilali (kalınlık t).
  const orb = (tone, cx, cy, r, t) => solid(
    tone,
    ring(cx, cy, r),
    `M${fixed(cx - r)} ${cy}a${r} ${r} 0 0 1 ${r} ${-r}v${t}a${fixed(r - t)} ${fixed(r - t)} 0 0 0 ${fixed(t - r)} ${fixed(r - t)}Z`,
    `M${fixed(cx + r)} ${cy}a${r} ${r} 0 0 1 ${-r} ${r}v${-t}a${fixed(r - t)} ${fixed(r - t)} 0 0 0 ${fixed(r - t)} ${fixed(t - r)}Z`
  );
  // Çizgiden oluşan işaret: altta koyu kalın çizgi, üstte renkli çizgi.
  const stroke = (tone, d, width, extra = "") => `<path class="me-rail" d="${d}" stroke-width="${fixed(width + 4.4)}"${extra}/>`
    + `<path class="me-line me-${tone}" d="${d}" stroke-width="${width}"${extra}/>`;
  const cut = (d) => shape("me-cut", d);
  const shine = (d) => shape("me-shine", d);

  const HEX = "M24 3 42 13.5v21L24 45 6 34.5v-21Z";
  const HEX_LIGHT = "M24 3 6 13.5v21L24 24Z";
  const HEX_DARK = "M42 13.5v21L24 45V24Z";
  const SNOW_ARM = "M24 4v40M18.5 9l5.5 5.5L29.5 9M18.5 39l5.5-5.5 5.5 5.5";
  const snowArms = (cls, width) => `<g class="${cls}" stroke-width="${width}"><path d="${SNOW_ARM}"/>`
    + `<path d="${SNOW_ARM}" transform="rotate(60 24 24)"/><path d="${SNOW_ARM}" transform="rotate(120 24 24)"/></g>`;
  const WAVE = "q4.75-7 9.5 0t9.5 0 9.5 0 9.5 0";
  const ORBIT = 'cx="24" cy="24" rx="21" ry="7.5" transform="rotate(-24 24 24)"';

  const EMBLEMS = Object.freeze({
    "Çekirdek": ["sistem",
      solid("m", HEX, HEX_LIGHT, HEX_DARK)
      + solid("c", "M24 11 35 24 24 37 13 24Z", "M24 11 13 24h11Z", "M35 24 24 37V24Z")],
    "Batarya": ["sistem",
      solid("m", "M19 4h10v7H19Z")
      + solid("c", "M13 10h22q3 0 3 3v28q0 3-3 3H13q-3 0-3-3V13q0-3 3-3Z", "M13 10h6v34h-6q-3 0-3-3V13q0-3 3-3Z", "M31 10h4q3 0 3 3v28q0 3-3 3h-4Z")
      + solid("g", "M27 15 17 29h6l-2 10 10-14h-6Z")],
    "Kapasitör": ["sistem",
      solid("m", "M15 33h5v12h-5Z") + solid("m", "M28 33h5v12h-5Z")
      + solid("c", "M10 9q0-5 14-5t14 5v22q0 5-14 5t-14-5Z", "M10 9q0-3.5 7-4.5v31q-7-1-7-4.5Z", "M32 4.7q6 1.1 6 4.3v22q0 3.2-6 4.3Z")
      + solid("w", "M26 4.1 33 4.9V35.1L26 35.9Z")
      + cut("M27.9 12.5h3.2M27.9 20h3.2M27.9 27.5h3.2")],
    "Akım Dengeleyici": ["sistem",
      solid("c", "M5 10h21V4l16 11-16 11v-6H5Z", "M5 10h21V4l16 11H5Z")
      + solid("w", "M43 28H22v-6L6 33l16 11v-6h21Z", "", "M6 33h37v5H22v6Z")],
    "Lazer": ["saldırı",
      solid("c", "M29 3 11 26h10l-5 19 21-25H26l8-17Z", "M29 3 11 26h10l5-6 8-17Z", "M37 20 16 45l10-22Z")],
    "Darbe Topu": ["saldırı",
      orb("c", 24, 24, 19, 6) + solid("v", ring(24, 24, 11.5)) + solid("g", ring(24, 24, 5.5))
      + shine(ring(22.4, 22.4, 1.5))],
    "Ray Topu": ["saldırı",
      solid("m", "M6 5h25v5H6Z", "M6 5h25v2H6Z") + solid("m", "M6 38h25v5H6Z", "M6 38h25v2H6Z")
      + solid("c", "M4 15h18l22 9-22 9H4l7-9Z", "M4 15h18l22 9H11Z")
      + shine("M13 19h8l5 2H12Z")],
    "Füze Fırlatıcı": ["saldırı",
      solid("cd", "M16 25 7 39h9Z") + solid("cd", "M32 25l9 14h-9Z")
      + solid("g", "M18 37h12l-6 9Z")
      + solid("c", "M24 3q9 9 9 20v14H15V23q0-11 9-20Z", "M24 3q-9 9-9 20v14h5V23q0-12 4-20Z", "M28 8q5 7 5 15v14h-5Z")
      + solid("w", "M24 3q5.5 5.5 7.7 12H16.3Q18.5 8.5 24 3Z", "", "M24 3q5.5 5.5 7.7 12H27Q26.5 8 24 3Z")
      + solid("v", ring(24, 24, 3.4))],
    "Dron Üssü": ["saldırı",
      stroke("m", "M12 12 36 36M36 12 12 36", 4)
      + stroke("w", ring(11, 11, 6) + ring(37, 11, 6) + ring(11, 37, 6) + ring(37, 37, 6), 2.8)
      + solid("c", "M24 12.5l10 5.75v11.5L24 35.5l-10-5.75v-11.5Z", "M24 12.5l-10 5.75v11.5L24 24Z", "M34 18.25v11.5L24 35.5V24Z")
      + solid("g", ring(24, 24, 3.2))],
    "Ark Topu": ["saldırı",
      solid("m", "M11 35h26l4 9H7Z", "M11 35h26l1.2 2.6H9.8Z")
      + solid("m", "M19 22h10v13H19Z", "M19 22h3v13h-3Z") + cut("M19 26.4h10M19 30.7h10")
      + orb("c", 24, 14, 10, 4)
      + solid("g", "M9 4 3 13h4l-2 8 8-11H9l3-6Z") + solid("g", "M39 4l6 9h-4l2 8-8-11h4l-3-6Z")],
    "Plazma Havanı": ["saldırı",
      solid("m", "M3 40h22v5H3Z", "M3 40h22v2H3Z")
      + solid("c", "M6 34 14 42 30 26 22 18Z", "M6 34l3 3 16-16-3-3Z", "M11 39l3 3 16-16-3-3Z")
      + solid("m", "M19 15l14 14 3.5-3.5-14-14Z")
      + orb("g", 37.5, 10.5, 7.5, 3)],
    "Kuantum Tekrarlayıcı": ["saldırı",
      solid("c", "M4 7 22 24 4 41Z", "M4 7 22 24H4Z") + solid("c", "M44 7 26 24 44 41Z", "M44 7 26 24h18Z")
      + orb("g", 24, 24, 6.5, 2.6)],
    "Sürü Fabrikatörü": ["saldırı",
      solid("c", "M24 3l10 19-10-5-10 5Z", "M24 3 14 22l10-5Z")
      + solid("c", "M12 24l9 17-9-4.5-9 4.5Z", "M12 24 3 41l9-4.5Z")
      + solid("c", "M36 24l9 17-9-4.5-9 4.5Z", "M36 24l-9 17 9-4.5Z")],
    "İyon Mızrağı": ["saldırı",
      solid("m", "M5 40l3 3 23-23-3-3Z")
      + solid("g", "M15 25l8 8 3-3-8-8Z")
      + solid("c", "M45 3 24 13l11 11Z", "M45 3 24 13l5.5 5.5Z", "M45 3 35 24l-5.5-5.5Z")],
    "Kuantum Topu": ["saldırı",
      `<ellipse class="me-rail" ${ORBIT} stroke-width="6.6"/><ellipse class="me-line me-g" ${ORBIT} stroke-width="2.6"/>`
      + orb("c", 24, 24, 12.5, 4.5)
      + stroke("g", "M3 24a21 7.5 0 0 0 42 0", 2.6, ' transform="rotate(-24 24 24)"')
      + solid("w", ring(43.2, 15.5, 3.4))],
    "Kalkan": ["savunma",
      solid("c", "M24 3 41 9v13q0 15-17 23Q7 37 7 22V9Z", "M24 3 7 9v13q0 15 17 23Z")
      + solid("w", "M24 13l7 10-7 12-7-12Z", "", "M24 13l7 10-7 12Z")],
    "Zırh": ["savunma",
      solid("c", "M13 8h31l-7 32H6Z", "M13 8h31l-1.3 6H11.7Z", "M7.3 34h31L37 40H6Z")
      + solid("w", ring(17, 20, 2.3)) + solid("w", ring(37, 20, 2.3)) + solid("w", ring(14.5, 29, 2.3)) + solid("w", ring(34.5, 29, 2.3))],
    "Bariyer": ["savunma",
      solid("c", "M12 9h24v30H12Z", "M12 9h24v6H12ZM12 20h24v6H12ZM12 31h24v5H12Z")
      + solid("m", "M5 4h9v40H5Z", "M5 4h3.5v40H5Z") + solid("m", "M34 4h9v40h-9Z", "M34 4h3.5v40H34Z")
      + solid("g", "M5 4h9v6H5Z") + solid("g", "M34 4h9v6h-9Z")],
    "Yansıtıcı": ["savunma",
      solid("c", "M24 3 45 24 24 45 3 24Z", "M24 3 3 24h21Z", "M45 24 24 45V24Z")
      + solid("w", "M24 12 36 24 24 36 12 24Z", "", "M36 24 24 36V24Z")
      + shine("M16.5 23.5l7-7 1.6 1.6-7 7Z")],
    "Muhafız Kubbesi": ["savunma",
      solid("c", "M5 35a19 19 0 0 1 38 0Z", "M5 35a19 19 0 0 1 19-19v5a14 14 0 0 0-14 14Z")
      + solid("w", "M19 25h10v10H19Z", "", "M25 25h4v10h-4Z")
      + solid("m", "M3 35h42v8H3Z", "M3 35h42v3H3Z")
      + solid("g", ring(24, 15, 3.4))],
    "Faz Zırhı": ["savunma",
      solid("cl", "M18 4h27l-6 26H12Z")
      + solid("c", "M10 16h27l-6 28H4Z", "M10 16h27l-1.2 5.5H8.8Z", "M5.2 38.5h27L31 44H4Z")],
    "Prizma Kalkanı": ["savunma",
      solid("c", HEX, HEX_LIGHT, HEX_DARK)
      + solid("w", "M24 11 35 30H13Z", "", "M24 11 35 30H24Z")
      + solid("g", "M24 31.5l3.5 4-3.5 4-3.5-4Z")],
    "Soğutucu": ["destek",
      snowArms("me-rail", 8.4) + snowArms("me-line me-c", 4)
      + solid("w", "M24 18.5l4.8 2.75v5.5L24 29.5l-4.8-2.75v-5.5Z")],
    "Güçlendirici": ["destek",
      solid("c", "M17 5h14v12h12v14H31v12H17V31H5V17h12Z", "M17 5h14v4H21v12H9v10H5V17h12Z", "M43 27v4H31v12H17v-4h10V27Z")],
    "Onarım": ["destek",
      stroke("c", "M41 15.2A9 9 0 1 1 32.8 7M25.6 22.4 9 39", 6)
      + shape("me-line me-cl", "M23 25 11 37") ],
    "Hedefleme Bilgisayarı": ["destek",
      stroke("c", `${ring(24, 24, 13)}M24 3v9M24 36v9M3 24h9M36 24h9`, 4.6)
      + solid("g", ring(24, 24, 4.2))],
    "Aşırı Hızlandırıcı": ["destek",
      solid("c", "M4 7h11l12 17-12 17H4l12-17Z", "M4 7h11l12 17H16Z")
      + solid("c", "M21 7h11l12 17-12 17H21l12-17Z", "M21 7h11l12 17H33Z")],
    "Nano Sağlıkçı": ["destek",
      solid("c", "M30 30 21 39A8.5 8.5 0 0 1 9 27L18 18Z", "M18 18 9 27a8.5 8.5 0 0 0-1.6 9.8L22 22Z")
      + solid("w", "M18 18 27 9A8.5 8.5 0 0 1 39 21L30 30Z", "", "M39 21l-9 9-4-4 11.2-11.2A8.5 8.5 0 0 1 39 21Z")
      + shape("me-fill me-c", "M27 15.5h3V18h2.5v3H30v2.5h-3V21h-2.5v-3H27Z")
      + solid("g", ring(9.5, 9.5, 3.4)) + solid("g", ring(38.5, 38.5, 3.4))],
    "Krono Rölesi": ["destek",
      solid("m", "M20 2h8v8h-8Z") + solid("m", "M36 7.5l4.5 4.5-3.5 3.5L32.5 11Z")
      + orb("c", 24, 27, 17, 5) + solid("w", ring(24, 27, 11))
      + cut("M24 19.5V27l5.5 3.2")],
    "Hassasiyet Matrisi": ["destek",
      solid("c", "M5 5h17v17H5Z", "M5 5h17v5H5Z") + solid("g", "M26 5h17v17H26Z", "M26 5h17v5H26Z")
      + solid("c", "M5 26h17v17H5Z", "M5 26h17v5H5Z") + solid("c", "M26 26h17v17H26Z", "M26 26h17v5H26Z")
      + solid("v", ring(34.5, 14.5, 3))],
    "Anka Onarım": ["destek",
      solid("c", "M24 3c3 9 15 14 15 27a15 15 0 0 1-30 0c0-6 3-10 6-13 0 5 2 8 5 9-1-8 0-16 4-23Z")
      + solid("g", "M24 23c1.5 5 7 7 7 13a7 7 0 0 1-14 0c0-3 1.5-5 3-6.5 0 2.5 1 4 2.5 4.500-.5-4 0-8 1.5-11Z")],
    "Omega Güçlendirici": ["destek",
      stroke("c", "M8 41h11v-7C13 31 10 26 10 20a14 14 0 0 1 28 0c0 6-3 11-9 14v7h11", 6)
      + solid("g", ring(24, 20, 4.6))],
    "EMP": ["sabotaj",
      stroke("c", `${ring(24, 24, 15)}M13.4 34.6 34.6 13.4`, 6)],
    "Sinyal Bozucu": ["sabotaj",
      stroke("c", `M5 13${WAVE}M5 35${WAVE}`, 4.6) + stroke("w", `M5 24${WAVE}`, 4.6)],
    "Virüs": ["sabotaj",
      `<path class="me-rail" stroke-width="3.6" d="M24 5v38M5 24h38M10.6 10.6l26.8 26.8M37.4 10.6 10.6 37.4"/>`
      + [[24, 5], [24, 43], [5, 24], [43, 24], [10.6, 10.6], [37.4, 37.4], [37.4, 10.6], [10.6, 37.4]]
        .map(([x, y]) => solid("cl", ring(x, y, 3.4))).join("")
      + orb("c", 24, 24, 12, 4)
      + solid("g", "M24 18.5l4.5 5.5-4.5 5.5-4.5-5.5Z")],
    "Kesici": ["sabotaj",
      solid("c", "M10 3 24 17 38 3l7 7-14 14 14 14-7 7-14-14-14 14-7-7 14-14L3 10Z", "M10 3 24 17l-3.5 3.5-14-14Z", "M27.5 27.5l14 14L38 45 24 31Z")
      + solid("g", "M24 19l5 5-5 5-5-5Z")],
    "Tekillik Projektörü": ["sabotaj",
      solid("cl", "M3 3l10 3.5L6.5 13Z") + solid("cl", "M45 3l-3.5 10L35 6.5Z")
      + solid("cl", "M45 45l-10-3.5 6.5-6.5Z") + solid("cl", "M3 45l3.5-10 6.5 6.5Z")
      + orb("c", 24, 24, 15.5, 5) + solid("v", ring(24, 24, 8.5))
      + shine(ring(21, 21, 1.6))],
  });
  const EMBLEM_FALLBACK = solid("c", "M10 6h28q4 0 4 4v28q0 4-4 4H10q-4 0-4-4V10q0-4 4-4Z", "M10 6h28q4 0 4 4v3H6v-3q0-4 4-4Z")
    + solid("w", ring(24, 25, 7));

  const SHORT_ALIASES = Object.freeze({ "Onarım Modülü":"Onarım" });
  const CATEGORIES = Object.freeze(["saldırı", "savunma", "destek", "sistem", "sabotaj"]);

  class GridshardModuleCardView {
    static iconFor(module) {
      if ((module?.definition_id || module?.definitionId || module?.id) === "repair") return ICONS["Onarım"];
      return ICONS[module?.nameTr] || "●";
    }

    // Modülün amblemi (SVG). Bilinmeyen ad için sınıf renginde genel bir yonga çizilir.
    static emblemFor(module) {
      const device = globalThis.GridshardModuleDeviceArt?.markup(module);
      if (device) return device;
      const isRepair = (module?.definition_id || module?.definitionId || module?.id) === "repair";
      const entry = EMBLEMS[isRepair ? "Onarım" : module?.nameTr] || EMBLEMS[SHORT_ALIASES[module?.nameTr]];
      const fallbackCategory = String(module?.category || "");
      const category = entry ? entry[0] : (CATEGORIES.includes(fallbackCategory) ? fallbackCategory : "");
      return `<svg class="module-emblem" data-cat="${category}" viewBox="0 0 48 48" focusable="false" aria-hidden="true">${entry ? entry[1] : EMBLEM_FALLBACK}</svg>`;
    }

    static shortNameFor(module) {
      if (globalThis.GridshardModuleDeviceArt?.idFor(module) === "armor") return "Sönümleyici";
      const name = String(module?.nameTr || "");
      return SHORT_NAMES[name] || name;
    }
  }

  globalThis.GridshardModuleCardView = GridshardModuleCardView;
})();
