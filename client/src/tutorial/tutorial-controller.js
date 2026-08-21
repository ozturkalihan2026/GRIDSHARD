(() => {
  "use strict";

  class GridshardTutorialController {
    constructor({ root, steps, storage = globalThis.localStorage, storageKey, onAction = async () => true }) {
      this.root = root;
      this.steps = steps;
      this.storage = storage;
      this.storageKey = storageKey;
      this.onAction = onAction;
      this.index = 0;
      this.activeTarget = null;
      this.busy = false;

      this.title = root?.querySelector("[data-tutorial-title]");
      this.body = root?.querySelector("[data-tutorial-body]");
      this.progress = root?.querySelector("[data-tutorial-progress]");
      this.back = root?.querySelector("[data-tutorial-back]");
      this.next = root?.querySelector("[data-tutorial-next]");
      this.skip = root?.querySelector("[data-tutorial-skip]");
      this.action = root?.querySelector("[data-tutorial-action]");
      this.status = root?.querySelector("[data-tutorial-status]");

      this.back?.addEventListener("click", () => this.go(this.index - 1));
      this.next?.addEventListener("click", () => this.go(this.index + 1));
      this.skip?.addEventListener("click", () => this.finish());
      this.action?.addEventListener("click", () => this.runAction());
    }

    isCompleted() {
      try { return this.storage?.getItem(this.storageKey) === "complete"; }
      catch (_) { return false; }
    }

    maybeStart() {
      if (this.isCompleted()) return false;
      return this.start();
    }

    start({ force = false } = {}) {
      if (!this.root || (!force && this.isCompleted())) return false;
      this.index = 0;
      this.root.hidden = false;
      this.root.dataset.active = "true";
      this.render();
      return true;
    }

    go(index) {
      if (index >= this.steps.length) return this.finish();
      this.index = Math.max(0, index);
      this.render();
      return true;
    }

    async runAction() {
      if (this.busy) return;
      const step = this.steps[this.index];
      this.busy = true;
      if (this.action) this.action.disabled = true;
      if (this.status) this.status.textContent = "Uygulanıyor...";
      try {
        const result = await this.onAction(step.action, step);
        if (result === false) {
          if (this.status) this.status.textContent = "Bu adım henüz tamamlanmadı.";
          return;
        }
        this.go(this.index + 1);
      } finally {
        this.busy = false;
        if (this.action) this.action.disabled = false;
      }
    }

    render() {
      const step = this.steps[this.index];
      if (!step) return this.finish();
      this.clearTarget();
      if (this.title) this.title.textContent = step.title;
      if (this.body) this.body.textContent = step.body;
      if (this.progress) this.progress.textContent = `${this.index + 1} / ${this.steps.length}`;
      if (this.status) this.status.textContent = step.hint || "";
      if (this.back) this.back.hidden = this.index === 0;
      if (this.next) {
        this.next.hidden = Boolean(step.action);
        this.next.textContent = this.index === this.steps.length - 1 ? "Tamamla" : "İleri";
      }
      if (this.action) {
        this.action.hidden = !step.action;
        this.action.textContent = step.actionLabel || "Uygula";
      }
      if (step.target) {
        this.activeTarget = globalThis.document?.querySelector(step.target) || null;
        this.activeTarget?.setAttribute("data-tutorial-target", "true");
        this.activeTarget?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }
    }

    clearTarget() {
      this.activeTarget?.removeAttribute?.("data-tutorial-target");
      this.activeTarget = null;
    }

    finish() {
      this.clearTarget();
      if (this.root) {
        this.root.hidden = true;
        this.root.dataset.active = "false";
      }
      try { this.storage?.setItem(this.storageKey, "complete"); } catch (_) {}
      return true;
    }
  }

  globalThis.GridshardTutorialController = GridshardTutorialController;
})();
