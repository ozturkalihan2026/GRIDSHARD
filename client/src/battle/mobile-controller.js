(() => {
  "use strict";

  class GridshardMobileBattleController {
    constructor({ root = document, body = document.body, onPanelChange = null } = {}) {
      this.root = root;
      this.body = body;
      this.onPanelChange = onPanelChange;
      this.tabs = Array.from(
        root.querySelectorAll("[data-mobile-battle-panel]")
      );
      this.panel = "player";
      for (const tab of this.tabs) {
        tab.addEventListener("click", () => this.show(tab.dataset.mobileBattlePanel));
      }
      this.show("player", { focus: false });
    }

    show(panel, { focus = true } = {}) {
      if (!["player", "enemy", "shelf"].includes(panel)) return false;
      this.panel = panel;
      this.body.dataset.mobileBattlePanel = panel;
      for (const tab of this.tabs) {
        const active = tab.dataset.mobileBattlePanel === panel;
        tab.setAttribute("aria-pressed", String(active));
        tab.dataset.active = String(active);
        if (active && focus) tab.focus({ preventScroll: true });
      }
      this.onPanelChange?.(panel);
      return true;
    }

    reset() {
      this.show("player", { focus: false });
    }
  }

  globalThis.GridshardMobileBattleController = GridshardMobileBattleController;
})();
