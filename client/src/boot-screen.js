(function (global) {
  "use strict";

  // Açılış (yükleme) ekranı — Beta.72 tur 17.
  //
  // Uygulama uzak sunucuya bağlanırken oyuncu hangi adımın yüklendiğini
  // görür; adımlar bittikçe çubuk dolar, en sonda ekran söner ve Ev açılır.
  // İşaretleme index.html'dedir, betikler inmeden de görünür. Bu sınıf
  // yalnız ilerlemeyi, hata/yeniden deneme durumunu ve kapanışı yönetir;
  // adımları app.js çalıştırır.
  const GRIDSHARD_BOOT_STEPS = Object.freeze([
    Object.freeze({ id:"server", label:"boot.stage.server", weight:25 }),
    Object.freeze({ id:"profile", label:"boot.stage.profile", weight:25 }),
    Object.freeze({ id:"collection", label:"boot.stage.collection", weight:25 }),
    Object.freeze({ id:"account", label:"boot.stage.account", weight:25 }),
  ]);
  const GRIDSHARD_BOOT_READY_LABEL = "boot.ready";
  const GRIDSHARD_BOOT_COPIED_LABEL = "boot.copied";
  // Adım sürerken çubuk o adımın bu kadarına yavaşça ilerler; ağ beklenirken
  // ekran donmuş görünmez. Adım bitince kalan kısım hızla dolar.
  const CREEP_SHARE = .7;
  const CREEP_SECONDS = 2.8;
  const SETTLE_SECONDS = .32;

  function shortPlayerId(playerId) {
    const value = String(playerId || "");
    return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
  }

  // Oyuncu kimliği açılış ekranında değil, Ayarlar → Genel'de ad değiştirme
  // alanının altında gösterilir (hesap silerken tamamı gerekir). Kimlik yine
  // yalnız sunucu hesabı doğruladıktan sonra yayımlanır; bu sınıf onu, yeniden
  // denemede gizlemeyi ve kopyalamayı yönetir.
  const PLAYER_ID_PARTS = Object.freeze({
    button:"account-player-id",
    label:"account-player-id-label",
    value:"account-player-id-value",
  });

  class GridshardBootScreen {
    constructor({
      root = null,
      doc = global.document,
      steps = GRIDSHARD_BOOT_STEPS,
      minVisibleMs = 1200,
      readyHoldMs = 360,
      fadeMs = 460,
      inertTargets = [],
      now = () => (global.performance?.now ? global.performance.now() : Date.now()),
      wait = (ms) => new Promise((resolve) => global.setTimeout(resolve, ms)),
      clipboard = global.navigator?.clipboard || null,
    } = {}) {
      this.doc = doc || null;
      this.root = root || null;
      this.steps = steps;
      this.totalWeight = steps.reduce((sum, step) => sum + step.weight, 0) || 1;
      this.minVisibleMs = minVisibleMs;
      this.readyHoldMs = readyHoldMs;
      this.fadeMs = fadeMs;
      this.inertTargets = inertTargets.filter(Boolean);
      this.now = now;
      this.wait = wait;
      this.clipboard = clipboard;
      this.startedAt = now();
      this.completed = new Set();
      this.activeId = null;
      this.state = "loading";
      this.progress = 0;
      this.playerId = "";
      this.onRetry = null;
      this._finishing = null;
      this._copiedTimer = null;
      this.finished = new Promise((resolve) => { this._resolveFinished = resolve; });

      this.statusEl = this._part("boot-status");
      this.barEl = this._part("boot-bar");
      this.fillEl = this._part("boot-bar-fill");
      this.percentEl = this._part("boot-percent");
      this.errorEl = this._part("boot-error");
      this.errorMessageEl = this._part("boot-error-message");
      this.retryEl = this._part("boot-retry");
      this.playerButtonEl = this._part(PLAYER_ID_PARTS.button);
      this.playerLabelEl = this._part(PLAYER_ID_PARTS.label);
      this.playerValueEl = this._part(PLAYER_ID_PARTS.value);
      this.versionEl = this._part("boot-version");

      this.setPlayerId("");
      this.retryEl?.addEventListener?.("click", () => this.retry());
      this.playerButtonEl?.addEventListener?.("click", () => { void this.copyPlayerId(); });

      if (!this.root) {
        // İşaretleme yoksa (ör. eski önbellekli sayfa) açılış beklenmez.
        this.state = "done";
        this._resolveFinished();
        return;
      }
      this._setBodyState("loading");
      for (const target of this.inertTargets) target.inert = true;
      this.root.dataset.state = "loading";
      this.root.hidden = false;
    }

    get active() {
      return this.state !== "done";
    }

    _part(id) {
      return this.doc?.getElementById?.(id) || null;
    }

    _setBodyState(value) {
      const body = this.doc?.body;
      if (body?.dataset) body.dataset.boot = value;
    }

    _step(id) {
      return this.steps.find((step) => step.id === id) || null;
    }

    _completedWeight() {
      return this.steps
        .filter((step) => this.completed.has(step.id))
        .reduce((sum, step) => sum + step.weight, 0);
    }

    _render(percent, seconds) {
      this.progress = Math.max(0, Math.min(100, percent));
      const style = this.fillEl?.style;
      if (style?.setProperty) {
        style.setProperty("--boot-progress-seconds", `${seconds}s`);
        style.setProperty("--boot-progress", String(this.progress / 100));
      }
      const rounded = Math.round(this.progress);
      if (this.versionEl?.dataset.version) {
        this.versionEl.textContent = this.text("boot.version", { version:this.versionEl.dataset.version });
      }
      if (this.barEl?.setAttribute) this.barEl.setAttribute("aria-valuenow", String(rounded));
      if (this.percentEl) this.percentEl.textContent = this.text("boot.percent", { value:rounded });
    }

    text(key, params = {}) {
      const language = this.doc?.documentElement?.lang || "tr";
      return global.GridshardI18n?.t?.(key, params, language) || key;
    }

    _setStatus(text) {
      if (this.statusEl) this.statusEl.textContent = this.text(text);
    }

    setPlayerId(playerId) {
      global.clearTimeout?.(this._copiedTimer);
      this._copiedTimer = null;
      this.playerId = String(playerId || "");
      if (this.playerLabelEl) this.playerLabelEl.textContent = this.text("boot.player_id.label");
      if (!this.playerButtonEl || !this.playerValueEl) return;
      delete this.playerButtonEl.dataset.copied;
      this.playerButtonEl.setAttribute("aria-label", this.text("boot.player_id.copy"));
      this.playerButtonEl.setAttribute("title", this.text("boot.player_id.explanation"));
      this.playerValueEl.textContent = this.playerId;
      this.playerButtonEl.hidden = !this.playerId;
    }

    async copyPlayerId() {
      if (!this.playerId || typeof this.clipboard?.writeText !== "function") return false;
      const copiedPlayerId = this.playerId;
      try {
        await this.clipboard.writeText(copiedPlayerId);
      } catch (_error) {
        return false;
      }
      // Retry/provider return may change or clear the displayed account while
      // clipboard permission is pending. Never mark a different ID as copied.
      if (this.playerId !== copiedPlayerId) return true;
      if (this.playerButtonEl?.dataset) this.playerButtonEl.dataset.copied = "true";
      if (this.playerValueEl) this.playerValueEl.textContent = this.text(GRIDSHARD_BOOT_COPIED_LABEL);
      global.clearTimeout?.(this._copiedTimer);
      this._copiedTimer = global.setTimeout?.(() => {
        if (this.playerButtonEl?.dataset) delete this.playerButtonEl.dataset.copied;
        if (this.playerValueEl) this.playerValueEl.textContent = this.playerId;
      }, 1600);
      return true;
    }

    // Yeniden denemede tamamlanmış adımlar korunur; çubuk geri gitmez.
    restart() {
      if (this.state === "done") return;
      this.state = "loading";
      if (this.root) this.root.dataset.state = "loading";
      if (this.errorEl) this.errorEl.hidden = true;
    }

    begin(id) {
      const step = this._step(id);
      if (!step || this.state === "done") return;
      this.activeId = id;
      if (this.root) this.root.dataset.step = id;
      this._setStatus(step.label);
      if (this.completed.has(id)) return;
      const base = this._completedWeight();
      this._render(((base + step.weight * CREEP_SHARE) / this.totalWeight) * 100, CREEP_SECONDS);
    }

    complete(id) {
      if (!this._step(id) || this.state === "done") return;
      this.completed.add(id);
      if (this.activeId === id) this.activeId = null;
      this._render((this._completedWeight() / this.totalWeight) * 100, SETTLE_SECONDS);
    }

    fail(message) {
      if (this.state === "done") return;
      this.state = "error";
      if (this.root) this.root.dataset.state = "error";
      if (this.errorMessageEl) this.errorMessageEl.textContent = this.text(message);
      if (this.errorEl) this.errorEl.hidden = false;
      // Çubuk tamamlanan adımlara geri çekilir; yarım kalan adım yeniden denenir.
      this._render((this._completedWeight() / this.totalWeight) * 100, SETTLE_SECONDS);
      this.retryEl?.focus?.();
    }

    retry() {
      if (this.state !== "error") return;
      this.restart();
      if (typeof this.onRetry === "function") this.onRetry();
    }

    finish() {
      if (this._finishing) return this._finishing;
      if (this.state === "done") return this.finished;
      this._finishing = (async () => {
        for (const step of this.steps) this.completed.add(step.id);
        this.activeId = null;
        this._setStatus(GRIDSHARD_BOOT_READY_LABEL);
        this._render(100, SETTLE_SECONDS);
        if (this.root) {
          this.root.dataset.state = "ready";
          delete this.root.dataset.step;
        }
        // Hızlı bağlantıda ekran bir anlık parlayıp kaybolmaz.
        const elapsed = this.now() - this.startedAt;
        await this.wait(Math.max(this.readyHoldMs, this.minVisibleMs - elapsed));
        this.state = "done";
        if (this.root) this.root.dataset.state = "done";
        this._setBodyState("ready");
        for (const target of this.inertTargets) target.inert = false;
        await this.wait(this.fadeMs);
        if (this.root) this.root.hidden = true;
        this._resolveFinished();
      })();
      return this._finishing;
    }
  }

  global.GRIDSHARD_BOOT_STEPS = GRIDSHARD_BOOT_STEPS;
  global.GridshardBootScreen = GridshardBootScreen;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GridshardBootScreen, GRIDSHARD_BOOT_STEPS, shortPlayerId };
  }
})(typeof window !== "undefined" ? window : globalThis);

