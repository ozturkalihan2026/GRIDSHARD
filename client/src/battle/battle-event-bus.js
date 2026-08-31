(function (global) {
  "use strict";

  const GRIDSHARD_BATTLE_EVENT_CHANNELS = Object.freeze({
    GAME_EFFECT: "game_effect",
    AUDIO_STATE: "audio_state",
    BOOSTER_STATE: "booster_state",
  });

  class GridshardBattleEventBus {
    constructor({ now = () => Date.now() } = {}) {
      this._now = now;
      this._sequence = 0;
      this._listeners = new Map();
    }

    subscribe(channel, handler) {
      if (typeof handler !== "function") {
        throw new TypeError("Battle event handler must be a function.");
      }
      const key = String(channel || "");
      if (!this._listeners.has(key)) {
        this._listeners.set(key, new Set());
      }
      const listeners = this._listeners.get(key);
      listeners.add(handler);
      return () => listeners.delete(handler);
    }

    emit(channel, payload = {}) {
      const key = String(channel || "");
      const event = Object.freeze({
        id: ++this._sequence,
        channel: key,
        occurredAt: this._now(),
        payload,
      });
      const results = [];
      for (const handler of this._listeners.get(key) || []) {
        results.push(handler(event));
      }
      return { event, results };
    }
  }

  class GridshardBattleEffectAggregator {
    constructor({
      now = () => Date.now(),
      windowMs = 900,
      lifetimeMs = 1200,
      maxLanes = 6,
    } = {}) {
      this._now = now;
      this.windowMs = Math.max(0, Number(windowMs) || 0);
      this.lifetimeMs = Math.max(this.windowMs, Number(lifetimeMs) || 0);
      this.maxLanes = Math.max(1, Math.floor(Number(maxLanes) || 1));
      this._sequence = 0;
      this._records = new Map();
      this._recordIdByKey = new Map();
    }

    _effectKey(effect) {
      return [
        String(effect.targetId || "unknown"),
        String(effect.variant || "neutral"),
        String(effect.semanticKey || effect.text || "effect"),
      ].join(":");
    }

    _publicRecord(record, extra = {}) {
      return {
        id: record.id,
        key: record.key,
        targetId: record.targetId,
        variant: record.variant,
        semanticKey: record.semanticKey,
        amount: record.amount,
        text: record.text,
        lane: record.lane,
        occurrences: record.occurrences,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt,
        metadata: record.metadata,
        ...extra,
      };
    }

    release(recordId) {
      const record = this._records.get(recordId);
      if (!record) return false;
      this._records.delete(recordId);
      if (this._recordIdByKey.get(record.key) === recordId) {
        this._recordIdByKey.delete(record.key);
      }
      return true;
    }

    prune(now = this._now()) {
      const expiredRecordIds = [];
      for (const record of this._records.values()) {
        if (record.expiresAt <= now) {
          expiredRecordIds.push(record.id);
        }
      }
      expiredRecordIds.forEach((recordId) => this.release(recordId));
      return expiredRecordIds;
    }

    _nextLane(targetId, now) {
      const live = [...this._records.values()]
        .filter((record) => record.targetId === targetId && record.expiresAt > now)
        .sort((left, right) => left.updatedAt - right.updatedAt);
      const used = new Set(live.map((record) => record.lane));
      for (let lane = 0; lane < this.maxLanes; lane += 1) {
        if (!used.has(lane)) {
          return { lane, replacedRecordId: null };
        }
      }
      const oldest = live[0];
      return {
        lane: oldest?.lane || 0,
        replacedRecordId: oldest?.id || null,
      };
    }

    ingest(effect, now = this._now()) {
      const expiredRecordIds = this.prune(now);
      const targetId = String(effect?.targetId || "unknown");
      const variant = String(effect?.variant || "neutral");
      const semanticKey = String(effect?.semanticKey || effect?.text || "effect");
      const key = this._effectKey({ targetId, variant, semanticKey });
      const existingId = this._recordIdByKey.get(key);
      const existing = existingId ? this._records.get(existingId) : null;
      const numericAmount = Number(effect?.amount);
      const hasAmount = effect?.amount !== null
        && effect?.amount !== undefined
        && Number.isFinite(numericAmount);

      if (
        existing
        && now - existing.updatedAt <= this.windowMs
        && existing.expiresAt > now
      ) {
        if (hasAmount && Number.isFinite(existing.amount)) {
          existing.amount += numericAmount;
        } else if (hasAmount) {
          existing.amount = numericAmount;
        }
        existing.text = String(effect?.text || existing.text || "");
        existing.metadata = { ...existing.metadata, ...(effect?.metadata || {}) };
        existing.occurrences += 1;
        existing.updatedAt = now;
        existing.expiresAt = now + this.lifetimeMs;
        return this._publicRecord(existing, {
          mode: "updated",
          expiredRecordIds,
          replacedRecordId: null,
        });
      }

      if (existing) {
        this.release(existing.id);
        expiredRecordIds.push(existing.id);
      }

      const laneResult = this._nextLane(targetId, now);
      if (laneResult.replacedRecordId) {
        this.release(laneResult.replacedRecordId);
      }
      const record = {
        id: `battle-effect-${++this._sequence}`,
        key,
        targetId,
        variant,
        semanticKey,
        amount: hasAmount ? numericAmount : null,
        text: String(effect?.text || ""),
        lane: laneResult.lane,
        occurrences: 1,
        updatedAt: now,
        expiresAt: now + this.lifetimeMs,
        metadata: { ...(effect?.metadata || {}) },
      };
      this._records.set(record.id, record);
      this._recordIdByKey.set(key, record.id);
      return this._publicRecord(record, {
        mode: "created",
        expiredRecordIds,
        replacedRecordId: laneResult.replacedRecordId,
      });
    }

    clear() {
      const recordIds = [...this._records.keys()];
      this._records.clear();
      this._recordIdByKey.clear();
      return recordIds;
    }

    snapshot() {
      return [...this._records.values()].map((record) => this._publicRecord(record));
    }
  }

  class GridshardAudioStateOwner {
    constructor({ applyState = () => null } = {}) {
      this._applyState = applyState;
      this.currentState = null;
      this.terminalState = null;
      this.lastContext = null;
      this.revision = 0;
    }

    derive(context = {}) {
      const screen = String(context.screen || "menu");
      const onlineStatus = String(context.onlineStatus || "idle");
      const localStatus = String(context.localStatus || "setup");
      const battleActive = onlineStatus === "battle" || localStatus === "battle";

      if (screen === "play" && this.terminalState) {
        return this.terminalState;
      }
      if (screen !== "play") return "menu";
      if (context.critical && battleActive) return "critical_core";
      if (battleActive) return "battle";
      if (["matchmaking", "matched", "connecting", "readying"].includes(onlineStatus)) {
        return "matchmaking";
      }
      return "pool";
    }

    sync(context = {}, { reason = "sync", force = false } = {}) {
      this.lastContext = { ...context };
      if (String(context.screen || "menu") !== "play") {
        this.terminalState = null;
      }
      const nextState = this.derive(context);
      const changed = force || nextState !== this.currentState;
      this.currentState = nextState;
      if (changed) {
        this.revision += 1;
        this._applyState(nextState, {
          reason,
          revision: this.revision,
          context: this.lastContext,
        });
      }
      return {
        state: nextState,
        terminalState: this.terminalState,
        changed,
        revision: this.revision,
        reason,
      };
    }

    setTerminal(outcome, { reason = "battle_finished" } = {}) {
      this.terminalState = ["victory", "defeat"].includes(outcome)
        ? outcome
        : null;
      return this.sync(this.lastContext || { screen: "play" }, {
        reason,
        force: true,
      });
    }

    clearTerminal({ reason = "battle_reset" } = {}) {
      const hadTerminalState = Boolean(this.terminalState);
      this.terminalState = null;
      if (!this.lastContext) {
        return {
          state: this.currentState,
          terminalState: null,
          changed: false,
          revision: this.revision,
          reason,
        };
      }
      return this.sync(this.lastContext, {
        reason,
        force: hadTerminalState,
      });
    }

    handle(event) {
      const payload = event?.payload || event || {};
      if (payload.action === "terminal") {
        return this.setTerminal(payload.outcome, { reason: payload.reason });
      }
      if (payload.action === "clear_terminal") {
        return this.clearTerminal({ reason: payload.reason });
      }
      return this.sync(payload.context || payload, {
        reason: payload.reason,
        force: Boolean(payload.force),
      });
    }
  }

  class GridshardBoosterTargetMode {
    constructor() {
      this.selectedBoosterId = null;
      this.revision = 0;
      this.lastReason = "initial";
    }

    select(boosterId, { reason = "booster_selected" } = {}) {
      const next = String(boosterId || "") || null;
      const changed = next !== this.selectedBoosterId;
      this.selectedBoosterId = next;
      this.lastReason = reason;
      if (changed) this.revision += 1;
      return this.snapshot({ changed });
    }

    cancel({ reason = "cancelled" } = {}) {
      const changed = this.selectedBoosterId !== null;
      this.selectedBoosterId = null;
      this.lastReason = reason;
      if (changed) this.revision += 1;
      return this.snapshot({ changed });
    }

    handle(event) {
      const payload = event?.payload || event || {};
      if (payload.action === "select") {
        return this.select(payload.boosterId, { reason: payload.reason });
      }
      return this.cancel({ reason: payload.reason || payload.action || "cancelled" });
    }

    snapshot(extra = {}) {
      return {
        active: Boolean(this.selectedBoosterId),
        selectedBoosterId: this.selectedBoosterId,
        revision: this.revision,
        reason: this.lastReason,
        ...extra,
      };
    }
  }

  global.GRIDSHARD_BATTLE_EVENT_CHANNELS = GRIDSHARD_BATTLE_EVENT_CHANNELS;
  global.GridshardBattleEventBus = GridshardBattleEventBus;
  global.GridshardBattleEffectAggregator = GridshardBattleEffectAggregator;
  global.GridshardAudioStateOwner = GridshardAudioStateOwner;
  global.GridshardBoosterTargetMode = GridshardBoosterTargetMode;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      GRIDSHARD_BATTLE_EVENT_CHANNELS,
      GridshardBattleEventBus,
      GridshardBattleEffectAggregator,
      GridshardAudioStateOwner,
      GridshardBoosterTargetMode,
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
