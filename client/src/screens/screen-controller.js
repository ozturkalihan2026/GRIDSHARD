(() => {
  "use strict";

  const DEFAULT_LABELS = Object.freeze({
    menu: "Ev",
    shop: "Mağaza",
    modules: "Modüller",
    team: "Takım",
    events: "Etkinlik",
    play: "Oyna",
    profile: "Profil",
    daily: "Günlük Görevler",
    rewards: "Ödül Yolu",
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
      const shellCurrent = ["daily", "rewards", "statistics"].includes(current)
        ? "profile"
        : current;
      this.document.body.dataset.appScreen = current;

      for (const panel of this.document.querySelectorAll("[data-screen-panel]")) {
        panel.hidden = panel.dataset.screenPanel !== current;
      }

      const menu = this.document.getElementById("main-menu-panel");
      if (menu) menu.hidden = current !== this.screenEnum.MENU;

      const backButton = this.document.getElementById("return-main-menu");
      if (backButton) backButton.hidden = true;

      for (const button of this.document.querySelectorAll("[data-shell-screen]")) {
        const active = button.dataset.shellScreen === shellCurrent;
        button.classList.toggle("is-active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }

      const profileButton = this.document.getElementById("lobby-profile-button");
      if (profileButton) {
        const profileActive = ["profile", "daily", "rewards", "statistics"].includes(current);
        profileButton.classList.toggle("is-active", profileActive);
        if (profileActive) profileButton.setAttribute("aria-current", "page");
        else profileButton.removeAttribute("aria-current");
      }

      const label = this.document.getElementById("current-screen-label");
      if (label) label.textContent = this.labels[current] || current;

      return current;
    }
  }

  globalThis.GridshardScreenController = GridshardScreenController;
})();
