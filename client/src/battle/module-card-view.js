(() => {
  "use strict";

  const ICONS = Object.freeze({
    "Çekirdek":"◆", "Jeneratör":"✦", "Batarya":"▣", "Dağıtıcı":"⑂",
    "Kapasitör":"▤", "Lazer":"↯", "Darbe Topu":"◉", "Ray Topu":"➤",
    "Füze Fırlatıcı":"▲", "Dron Üssü":"✣", "Ark Topu":"ϟ", "Kalkan":"⬡",
    "Zırh":"▰", "Yansıtıcı":"◇", "Bariyer":"▥", "Onarım Modülü":"✚",
    "Soğutucu":"❄", "Güçlendirici":"＋", "Hedefleme Bilgisayarı":"⌖",
    "Aşırı Hızlandırıcı":"≫", "EMP":"⊘", "Sinyal Bozucu":"≋", "Virüs":"⌁",
    "Enerji Sömürücü":"∿", "Kesici":"╳"
  });

  class GridshardModuleCardView {
    static iconFor(module) {
      return ICONS[module?.nameTr] || "●";
    }
  }

  globalThis.GridshardModuleCardView = GridshardModuleCardView;
})();
