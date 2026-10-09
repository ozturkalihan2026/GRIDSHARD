(function (global) {
  "use strict";

  // Transport state is applied immediately; presentation is bounded to one
  // frame. Old particles are not gameplay and must never become a replay queue.
  const IMPORTANT_EVENTS = new Set([
    "command_rejected", "inactivity_warning", "player_inactive",
    "battle_forfeited", "battle_overtime_started",
  ]);
  class GridshardBattlePresentationQueue {
    constructor({ requestFrame, cancelFrame, present, rememberEvents = () => {}, maxEffects = 80, maxAgeMs = 1200 }) {
      Object.assign(this, { requestFrame, cancelFrame, present, rememberEvents, maxEffects, maxAgeMs });
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
        else this.effects.push(event);
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
      const cutoff = Number(snapshot?.elapsed_ms || 0) - this.maxAgeMs;
      const effects = this.effects.filter(event => Number(event.at_ms || 0) >= cutoff);
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
