(function(global) {
  "use strict";
  class StartupLoading {
    constructor(document) {
      this.document = document;
      this.root = document.getElementById("startup-loading");
      this.progress = document.getElementById("startup-progress");
      this.status = document.getElementById("startup-status");
      this.retry = document.getElementById("startup-retry");
      this.steps = new Set();
      this.required = ["server", "profile", "collection", "account"];
    }
    text(value) { return global.GridshardI18n?.translateText?.(value) || value; }
    begin() {
      this.steps.clear();
      this.root.hidden = false;
      this.retry.hidden = true;
      this.progress.value = 0;
      this.stage("Sunucuya bağlanılıyor…");
    }
    stage(message) { this.status.textContent = this.text(message); }
    complete(step) {
      if (!this.required.includes(step)) throw new Error("Unknown startup step");
      this.steps.add(step);
      // Counts completed API-backed steps, never elapsed time or estimated bytes.
      this.progress.value = this.steps.size;
    }
    fail() {
      this.stage("Bağlantı tamamlanamadı. Yeniden deneyebilirsin.");
      this.retry.hidden = false;
    }
    finish() {
      if (this.steps.size !== this.required.length) throw new Error("Startup is not ready");
      this.root.hidden = true;
    }
  }
  global.GridshardStartupLoading = StartupLoading;
})(globalThis);
