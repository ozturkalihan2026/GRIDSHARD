(function (global) {
  "use strict";

  // A session reset fences old HTTP completions without letting their finally
  // blocks clear a newer session's in-flight request.
  class GridshardBattleRequestScope {
    constructor() { this.generation = 0; this.inFlight = null; }
    reset() { this.generation += 1; this.inFlight = null; }
    isCurrent(generation) { return generation === this.generation; }
    async run(load, apply) {
      if (this.inFlight) return false;
      const flight = { generation:this.generation };
      this.inFlight = flight;
      try {
        const payload = await load();
        return this.isCurrent(flight.generation) ? apply(payload) : false;
      } finally {
        if (this.inFlight === flight) this.inFlight = null;
      }
    }
  }

  class GridshardBattleDeferredQueue {
    constructor({ now = () => performance.now(), onError = () => {} } = {}) {
      this.now = now;
      this.onError = onError;
      this.generation = 0;
      this.entries = [];
    }
    reset() { this.generation += 1; this.entries.length = 0; }
    schedule(delayMs, run, generation = this.generation) {
      const entry = { at:this.now() + Math.max(0, Number(delayMs) || 0), run, generation, cancelled:false };
      if (generation === this.generation) this.entries.push(entry);
      return entry;
    }
    flush(now = this.now()) {
      // Detach the batch: callbacks can reset or schedule new work safely.
      const batch = this.entries;
      this.entries = [];
      for (const entry of batch) {
        if (entry.cancelled || entry.generation !== this.generation) continue;
        if (entry.at > now) { this.entries.push(entry); continue; }
        try { entry.run(); } catch (error) { this.onError(error); }
      }
    }
  }
  global.GridshardBattleRequestScope = GridshardBattleRequestScope;
  global.GridshardBattleDeferredQueue = GridshardBattleDeferredQueue;
  if (typeof module !== "undefined" && module.exports) module.exports = { GridshardBattleRequestScope, GridshardBattleDeferredQueue };
})(typeof window !== "undefined" ? window : globalThis);
