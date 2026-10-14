(function (global) {
  "use strict";

  // Transport state is applied immediately; presentation is bounded to one
  // frame. Old particles are not gameplay and must never become a replay queue.
  const IMPORTANT_EVENTS = new Set([
    "command_rejected", "inactivity_warning", "player_inactive",
    "battle_forfeited", "battle_overtime_started",
  ]);
  // Rare events that explain a visible state change; they keep the long age
  // window. Everything else is routine combat feedback: after a stall (slow
  // frame, network hiccup, return from background) only its newest part is
  // shown, so a late batch never plays back as a pile of effects.
  const DECISIVE_EVENTS = new Set([
    "module_destroyed", "module_overheated", "phoenix_rebirth",
    "core_power_ready", "core_power_activated", "core_power_used",
    "core_signature_triggered", "battle_emoji",
  ]);
  class GridshardBattlePresentationQueue {
    constructor({
      requestFrame, cancelFrame, present, rememberEvents = () => {},
      maxEffects = 80, maxAgeMs = 1200, routineMaxAgeMs = 500, maxRoutinePerFrame = 36,
      // Event types the presenter draws nothing for; they must not use up the
      // effect budgets (about a third of a dense battle's events).
      ignoredTypes = [],
    }) {
      Object.assign(this, {
        requestFrame, cancelFrame, present, rememberEvents,
        maxEffects, maxAgeMs, routineMaxAgeMs, maxRoutinePerFrame,
      });
      this.ignoredTypes = new Set(ignoredTypes);
      this.reset();
    }
    reset() {
      if (this.frame != null) this.cancelFrame(this.frame);
      this.frame = null;
      this.sessionId = null;
      this.snapshot = null;
      this.snapshotChanged = false;
      this.effects = [];
      this.important = new Map();
      this.droppedEffects = 0;
    }
    // Drops the queued particles but keeps the newest state, e.g. when the
    // page was hidden and nothing of the backlog should be replayed.
    discardEffects() {
      this.droppedEffects += this.effects.length;
      this.effects = [];
    }
    push(message, result = {}) {
      if (!["snapshot", "events", "reconnect_state"].includes(message?.type)) return false;
      const payload = message.payload || {};
      // A delayed reconnect snapshot can be stale while its event page still
      // contains new events. Keep those events, but never roll state back.
      const snapshot = result.ignored ? null : message.type === "snapshot" ? payload : payload.snapshot;
      const events = result.events || [];
      if (!snapshot?.players && !events.length) return false;
      if (snapshot?.session_id && snapshot.session_id !== this.sessionId) {
        this.reset();
        this.sessionId = snapshot.session_id;
      }
      if (snapshot?.players) {
        this.snapshot = snapshot;
        this.snapshotChanged = true;
      }
      this.rememberEvents(events);
      for (const event of events) {
        if (IMPORTANT_EVENTS.has(event.type)) this.important.set(`${event.type}:${event.data?.player_id || ""}`, event);
        else if (!this.ignoredTypes.has(event.type)) this.effects.push(event);
      }
      if (this.effects.length > this.maxEffects) {
        this.droppedEffects += this.effects.length - this.maxEffects;
        this.effects.splice(0, this.effects.length - this.maxEffects);
      }
      if (this.frame == null) this.frame = this.requestFrame(() => this.flush());
      return true;
    }
    flush() {
      if (this.frame != null) this.cancelFrame(this.frame);
      this.frame = null;
      const snapshot = this.snapshot;
      // Snapshots arrive about once a second and events every tick, so the
      // newest battle time is the later of the two.
      let latest = Number(snapshot?.elapsed_ms || 0);
      for (const event of this.effects) latest = Math.max(latest, Number(event.at_ms || 0));
      const decisiveCutoff = latest - this.maxAgeMs;
      const routineCutoff = latest - this.routineMaxAgeMs;
      let effects = this.effects.filter(event => (
        Number(event.at_ms || 0) >= (DECISIVE_EVENTS.has(event.type) ? decisiveCutoff : routineCutoff)
      ));
      let routineExcess = effects.reduce((count, event) => count + (DECISIVE_EVENTS.has(event.type) ? 0 : 1), 0)
        - this.maxRoutinePerFrame;
      if (routineExcess > 0) {
        // Events are queued in arrival order: the oldest routine ones go first.
        effects = effects.filter(event => DECISIVE_EVENTS.has(event.type) || routineExcess-- <= 0);
      }
      this.droppedEffects += this.effects.length - effects.length;
      const events = [...this.important.values(), ...effects].sort((a, b) => Number(a.at_ms || 0) - Number(b.at_ms || 0));
      const snapshotChanged = this.snapshotChanged;
      this.effects = [];
      this.important.clear();
      this.snapshotChanged = false;
      if (snapshot && (snapshotChanged || events.length)) this.present({ snapshot, events, snapshotChanged });
    }
  }
  global.GridshardBattlePresentationQueue = GridshardBattlePresentationQueue;
  if (typeof module !== "undefined" && module.exports) module.exports = { GridshardBattlePresentationQueue };
})(typeof window !== "undefined" ? window : globalThis);
