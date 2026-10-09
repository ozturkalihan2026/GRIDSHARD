(function (global) {
  "use strict";

  class GridshardBattleCountdown {
    constructor({ element, now = () => performance.now(), setTimer = (run, ms) => global.setTimeout(run, ms), clearTimer = id => global.clearTimeout(id), onChange = () => {} }) {
      Object.assign(this, { element, now, setTimer, clearTimer, onChange });
      this.deadline = 0;
      this.sessionId = null;
      this.timer = null;
      this.lastActive = false;
    }
    get active() { return this.deadline > this.now(); }
    sync(snapshot) {
      const remaining = Math.max(0, Math.min(3000, Number(snapshot?.countdown_remaining_ms) || 0));
      const id = snapshot?.session_id;
      // A reconnect into a running match never starts a new countdown.
      if (id !== this.sessionId) {
        this.cancel();
        this.sessionId = id;
      }
      this.deadline = snapshot?.status === "running" ? this.now() + remaining : 0;
      this.update();
    }
    update() {
      if (this.timer != null) this.clearTimer(this.timer);
      this.timer = null;
      const remaining = Math.max(0, this.deadline - this.now());
      if (this.element) {
        this.element.hidden = remaining <= 0;
        const number = this.element.querySelector("strong");
        const text = String(Math.ceil(remaining / 1000));
        if (number && remaining > 0 && number.textContent !== text) number.textContent = text;
      }
      if (this.lastActive !== this.active) {
        this.lastActive = this.active;
        this.onChange(this.active);
      }
      if (remaining > 0) this.timer = this.setTimer(() => this.update(), Math.min(remaining, (remaining - 1) % 1000 + 1));
    }
    cancel() {
      if (this.timer != null) this.clearTimer(this.timer);
      this.timer = null;
      this.deadline = 0;
      this.lastActive = false;
      if (this.element) this.element.hidden = true;
    }
  }
  global.GridshardBattleCountdown = GridshardBattleCountdown;
  if (typeof module !== "undefined" && module.exports) module.exports = { GridshardBattleCountdown };
})(typeof window !== "undefined" ? window : globalThis);
