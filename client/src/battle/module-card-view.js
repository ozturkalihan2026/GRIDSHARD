(() => {
  "use strict";

  const ICONS = Object.freeze({
    "Çekirdek":"◆", "Batarya":"▣",
    "Kapasitör":"▤", "Lazer":"↯", "Darbe Topu":"◉", "Ray Topu":"➤",
    "Füze Fırlatıcı":"▲", "Dron Üssü":"✣", "Ark Topu":"ϟ", "Kalkan":"⬡",
    "Zırh":"▰", "Yansıtıcı":"◇", "Bariyer":"▥", "Onarım Modülü":"✚",
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

  class GridshardModuleCardView {
    static iconFor(module) {
      return ICONS[module?.nameTr] || "●";
    }

    static shortNameFor(module) {
      const name = String(module?.nameTr || "");
      return SHORT_NAMES[name] || name;
    }
  }

  globalThis.GridshardModuleCardView = GridshardModuleCardView;
})();
