(function(global) {
  "use strict";
  // Original GRIDSHARD2.1 presentation, driven by the current transition's
  // four real API-backed steps. No elapsed-time or estimated progress.
  class StartupLoading extends global.GridshardBootScreen {
    constructor(document, options = {}) {
      super({
        root:document.getElementById("startup-loading"),
        doc:document,
        inertTargets:Array.from(document.querySelectorAll?.(".battle-shell") || []),
        ...options,
      });
      this.required = this.steps.map(step => step.id);
      this.root?.setAttribute?.("aria-busy", "true");
    }
    begin() {
      if (this.state === "done") return;
      this.completed.clear();
      this.startedAt = this.now();
      this.restart();
      this._render(0, 0);
      this.stage("boot.stage.server");
    }
    stage(message) { this._setStatus(message); }
    complete(step) {
      if (!this.required.includes(step)) throw new Error("Unknown startup step");
      super.complete(step);
    }
    fail() { super.fail("boot.failed"); }
    finish() {
      if (this.state !== "done" && this.completed.size !== this.required.length) {
        throw new Error("Startup is not ready");
      }
      this.root?.setAttribute?.("aria-busy", "false");
      return super.finish();
    }
  }
  global.GridshardStartupLoading = StartupLoading;
})(globalThis);
