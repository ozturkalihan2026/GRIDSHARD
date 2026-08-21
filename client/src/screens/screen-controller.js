(() => {
  "use strict";

  const DEFAULT_LABELS = Object.freeze({
    menu: "Ana Menü",
    play: "Oyna",
    profile: "Profil",
    statistics: "İstatistikler",
    settings: "Ayarlar"
  });

  class GridshardScreenController {
    constructor({ router, screenEnum, documentRef = globalThis.document, labels = DEFAULT_LABELS }) {
      this.router = router;
      this.screenEnum = screenEnum;
      this.document = documentRef;
      this.labels = labels;
    }

    render() {
      const current = this.router.currentScreen;
      this.document.body.dataset.appScreen = current;

      for (const panel of this.document.querySelectorAll("[data-screen-panel]")) {
        panel.hidden = panel.dataset.screenPanel !== current;
      }

      const menu = this.document.getElementById("main-menu-panel");
      if (menu) menu.hidden = current !== this.screenEnum.MENU;

      const backButton = this.document.getElementById("return-main-menu");
      if (backButton) backButton.hidden = current === this.screenEnum.MENU;

      const label = this.document.getElementById("current-screen-label");
      if (label) label.textContent = this.labels[current] || current;

      return current;
    }
  }

  globalThis.GridshardScreenController = GridshardScreenController;
})();
