(() => {
  "use strict";

  // İlk maç eğitimi (Beta.72 tur 11). Savaşı durdurmayan, hedef öğeyi
  // vurgulayan adım adım ipucu kartı. Her adım bir bağlama bağlıdır
  // (`when`): bağlam uymuyorsa kart gizlenir ve adım bekler. `until`
  // tanımlı adım, oyuncu işi yapınca kendiliğinden ilerler (ör. savaşa
  // girmek, kart yerleştirmek); kart görünmese de denetlenir, çünkü işin
  // kendisi bağlamı değiştirebilir (savaş başlayınca Ev ekranı kapanır).
  // `until(context, start)`: `start` adımın başladığı andaki bağlamdır.
  // Diğer adımlar "İleri" ile geçilir. Bağlamı uygulama verir:
  // `update(context)` saniyede birkaç kez çağrılır.
  class GridshardTutorialController {
    constructor({ root, steps, storage = globalThis.localStorage, storageKey }) {
      this.root = root;
      this.steps = steps;
      this.storage = storage;
      this.storageKey = storageKey;
      this.index = 0;
      this.active = false;
      this.context = {};
      this.stepStartContext = null;
      this.activeTarget = null;

      this.title = root?.querySelector("[data-tutorial-title]");
      this.body = root?.querySelector("[data-tutorial-body]");
      this.progress = root?.querySelector("[data-tutorial-progress]");
      this.next = root?.querySelector("[data-tutorial-next]");
      this.skip = root?.querySelector("[data-tutorial-skip]");
      this.status = root?.querySelector("[data-tutorial-status]");

      this.next?.addEventListener("click", () => this.go(this.index + 1));
      this.skip?.addEventListener("click", () => this.finish());
    }

    isCompleted() {
      try { return this.storage?.getItem(this.storageKey) === "complete"; }
      catch (_) { return false; }
    }

    // Ayarlar'dan yeniden gösterme: tamamlandı işareti silinir.
    reset() {
      try { this.storage?.removeItem(this.storageKey); } catch (_) {}
    }

    start({ force = false } = {}) {
      if (!this.root || (!force && this.isCompleted())) return false;
      this.active = true;
      this.index = 0;
      this.stepStartContext = { ...this.context };
      this.root.dataset.active = "true";
      this.render();
      return true;
    }

    currentStep() {
      return this.active ? this.steps[this.index] || null : null;
    }

    update(context = {}) {
      this.context = context;
      const step = this.currentStep();
      if (!step) return;
      if (
        typeof step.until === "function"
        && step.until(context, this.stepStartContext || context)
      ) {
        this.go(this.index + 1);
        return;
      }
      const visible = typeof step.when === "function" ? Boolean(step.when(context)) : true;
      this.setVisible(visible);
      if (visible) this.place();
    }

    go(index) {
      if (!this.active) return false;
      if (index >= this.steps.length) return this.finish();
      this.index = Math.max(0, index);
      this.stepStartContext = { ...this.context };
      this.render();
      this.update(this.context);
      return true;
    }

    render() {
      const step = this.currentStep();
      if (!step) return;
      this.clearTarget();
      if (this.title) this.title.textContent = step.title;
      if (this.body) this.body.textContent = step.body;
      if (this.progress) this.progress.textContent = `${this.index + 1} / ${this.steps.length}`;
      if (this.status) this.status.textContent = step.hint || "";
      if (this.next) {
        // Oyuncu işiyle ilerleyen adımda "İleri" yoktur.
        this.next.hidden = typeof step.until === "function";
        this.next.textContent = this.index === this.steps.length - 1 ? "Tamamla" : "İleri";
      }
      if (step.target) {
        this.activeTarget = globalThis.document?.querySelector(step.target) || null;
        this.activeTarget?.setAttribute("data-tutorial-target", "true");
      }
    }

    setVisible(visible) {
      if (!this.root) return;
      this.root.hidden = !visible;
      if (this.activeTarget) {
        if (visible) this.activeTarget.setAttribute("data-tutorial-target", "true");
        else this.activeTarget.removeAttribute("data-tutorial-target");
      }
    }

    // Kart hedefin karşı yarısına yerleşir; hedefi örtmez.
    place() {
      if (!this.root) return;
      let placement = "bottom";
      const rect = this.activeTarget?.getBoundingClientRect?.();
      const viewport = Number(globalThis.innerHeight) || 0;
      if (rect && viewport > 0 && (rect.top + rect.bottom) / 2 > viewport / 2) {
        placement = "top";
      }
      this.root.dataset.placement = placement;
    }

    clearTarget() {
      this.activeTarget?.removeAttribute?.("data-tutorial-target");
      this.activeTarget = null;
    }

    finish() {
      this.clearTarget();
      this.active = false;
      this.stepStartContext = null;
      if (this.root) {
        this.root.hidden = true;
        this.root.dataset.active = "false";
      }
      try { this.storage?.setItem(this.storageKey, "complete"); } catch (_) {}
      return true;
    }
  }

  globalThis.GridshardTutorialController = GridshardTutorialController;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GridshardTutorialController };
  }
})();
