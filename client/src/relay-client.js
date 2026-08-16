(function (global) {
  "use strict";

  const MODULE_STATUS = Object.freeze({
    RESERVE: "reserve",
    ACTIVE: "active",
    DESTROYED: "destroyed",
  });


  function maxActiveModulesForElapsedMs(elapsedMs) {
    if (elapsedMs < 15000) return null;
    if (elapsedMs < 25000) return 4;
    if (elapsedMs < 35000) return 5;
    if (elapsedMs < 45000) return 6;
    if (elapsedMs < 55000) return 7;
    if (elapsedMs < 65000) return 8;
    if (elapsedMs < 75000) return 9;
    return 10;
  }

  const DRAG_KIND = Object.freeze({
    SHELF_MODULE: "shelf-module",
    ACTIVE_MODULE: "active-module",
  });

  class BattlePoolSelection {
    constructor({ selectableModuleIds, requiredSize = 18 }) {
      this.selectableModuleIds = [...selectableModuleIds];
      this.requiredSize = requiredSize;
      this.selected = new Set();
    }

    toggle(moduleId) {
      if (!this.selectableModuleIds.includes(moduleId)) {
        return { ok: false, reason: "Modül global oyuncu havuzunda değil." };
      }

      if (this.selected.has(moduleId)) {
        this.selected.delete(moduleId);
        return { ok: true, selected: false };
      }

      if (this.selected.size >= this.requiredSize) {
        return { ok: false, reason: `En fazla ${this.requiredSize} modül seçilebilir.` };
      }

      this.selected.add(moduleId);
      return { ok: true, selected: true };
    }

    isComplete() {
      return this.selected.size === this.requiredSize;
    }

    selectedIds() {
      return [...this.selected];
    }
  }

  class RelayBattleClient {
    constructor({ modules, unlockAtMs = 15000, circuitCredits = 0, emitCommand }) {
      this.unlockAtMs = unlockAtMs;
      this.emitCommand = emitCommand;
      this.elapsedMs = 0;
      this.circuitCredits = Math.max(0, Math.floor(circuitCredits));
      this.dragState = null;
      this.modules = new Map(
        modules.map((module) => [
          module.instanceId,
          {
            ...module,
            status: module.status || MODULE_STATUS.RESERVE,
            position: module.position || null,
          },
        ])
      );
    }

    updateElapsedMs(elapsedMs) {
      this.elapsedMs = Math.max(0, elapsedMs);
    }

    isShelfUnlocked() {
      return this.elapsedMs >= this.unlockAtMs;
    }

    maxActiveModules() {
      return maxActiveModulesForElapsedMs(this.elapsedMs);
    }

    activeModuleCount() {
      let count = 0;
      for (const module of this.modules.values()) {
        if (module.status === MODULE_STATUS.ACTIVE) count += 1;
      }
      return count;
    }

    beginDrag(moduleId) {
      const module = this.requireModule(moduleId);

      if (module.status === MODULE_STATUS.DESTROYED) {
        return { ok: false, reason: "Yok edilmiş modül sürüklenemez." };
      }

      if (
        module.status === MODULE_STATUS.RESERVE &&
        !this.isShelfUnlocked()
      ) {
        return { ok: false, reason: "Modül Rafı henüz kilitli." };
      }

      this.dragState = {
        moduleId,
        kind:
          module.status === MODULE_STATUS.ACTIVE
            ? DRAG_KIND.ACTIVE_MODULE
            : DRAG_KIND.SHELF_MODULE,
      };

      return { ok: true };
    }

    cancelDrag() {
      this.dragState = null;
    }

    dropOnCell(targetX, targetY, targetModuleId = null) {
      if (!this.dragState) {
        return { ok: false, reason: "Aktif sürükleme yok." };
      }

      const source = this.requireModule(this.dragState.moduleId);
      let command;

      if (targetModuleId && targetModuleId !== source.instanceId) {
        command = {
          kind: "replace_module",
          payload: {
            outgoing_module_id: targetModuleId,
            incoming_module_id: source.instanceId,
          },
        };
      } else if (source.status === MODULE_STATUS.RESERVE) {
        if (!this.isShelfUnlocked()) {
          return { ok: false, reason: "Modül Rafı henüz kilitli." };
        }

        command = {
          kind: "place_module",
          payload: {
            module_id: source.instanceId,
            x: targetX,
            y: targetY,
          },
        };
      } else {
        command = {
          kind: "move_module",
          payload: {
            module_id: source.instanceId,
            x: targetX,
            y: targetY,
          },
        };
      }

      this.emitCommand(command);
      this.dragState = null;
      return { ok: true, command };
    }

    dropOnShelf() {
      if (!this.dragState) {
        return { ok: false, reason: "Aktif sürükleme yok." };
      }

      const module = this.requireModule(this.dragState.moduleId);
      if (module.status !== MODULE_STATUS.ACTIVE) {
        this.dragState = null;
        return { ok: false, reason: "Yalnızca aktif modül rafa çekilebilir." };
      }

      const command = {
        kind: "remove_module",
        payload: {
          module_id: module.instanceId,
        },
      };

      this.emitCommand(command);
      this.dragState = null;
      return { ok: true, command };
    }

    applyServerModuleState(moduleState) {
      const module = this.requireModule(moduleState.instanceId);
      Object.assign(module, moduleState);
    }

    applyServerEconomyState({ circuitCredits }) {
      this.circuitCredits = Math.max(0, Math.floor(circuitCredits));
    }

    requireModule(moduleId) {
      const module = this.modules.get(moduleId);
      if (!module) {
        throw new Error(`Bilinmeyen modül: ${moduleId}`);
      }
      return module;
    }
  }


    const PVP_PHASE = Object.freeze({
    IDLE: "idle",
    LOBBY: "lobby",
    SETUP: "setup",
    READY: "ready",
    BATTLE: "battle",
    RECONNECTING: "reconnecting",
    FINISHED: "finished",
    ERROR: "error",
  });

  class RelayPvPClientState {
    constructor({
      playerId,
      sessionId = null,
      battleClient = null,
      protocolVersion = 1,
    }) {
      if (!playerId) {
        throw new Error("PvP oyuncu kimliği zorunludur.");
      }

      this.playerId = playerId;
      this.sessionId = sessionId;
      this.protocolVersion = protocolVersion;
      this.battleClient = battleClient;
      this.phase = PVP_PHASE.IDLE;
      this.connected = false;
      this.requestSequence = 0;
      this.commandSequence = 0;
      this.eventCursor = 0;
      this.snapshotRevision = 0;
      this.lobby = null;
      this.snapshot = null;
      this.finalResult = null;
      this.events = [];
      this.lastError = null;
    }

    bindSession(sessionId) {
      if (!sessionId) throw new Error("PvP oturum kimliği zorunludur.");
      this.sessionId = sessionId;
      this.phase = PVP_PHASE.LOBBY;
    }

    markConnected() {
      this.connected = true;
      if (this.phase === PVP_PHASE.RECONNECTING) {
        return;
      }
      if (this.phase === PVP_PHASE.IDLE && this.sessionId) {
        this.phase = PVP_PHASE.LOBBY;
      }
    }

    markDisconnected() {
      this.connected = false;
      if (this.phase !== PVP_PHASE.FINISHED) {
        this.phase = PVP_PHASE.RECONNECTING;
      }
    }

    nextRequestId(prefix = "req") {
      this.requestSequence += 1;
      return `${prefix}-${this.requestSequence}`;
    }

    envelope(type, payload = {}, requestId = null) {
      if (!this.sessionId) {
        throw new Error("PvP oturumu henüz bağlanmadı.");
      }
      return {
        version: this.protocolVersion,
        type,
        session_id: this.sessionId,
        player_id: this.playerId,
        request_id: requestId || this.nextRequestId(type),
        payload,
      };
    }

    buildLobbyRequest() {
      return this.envelope("request_lobby");
    }

    buildSetupMessage({
      battlePoolIds,
      initialModules,
    }) {
      return this.envelope("submit_setup", {
        battle_pool_ids: [...battlePoolIds],
        initial_modules: initialModules.map((module) => ({
          instance_id: module.instanceId,
          definition_id: module.definitionId,
          x: module.x,
          y: module.y,
          direction: module.direction || "up",
        })),
      });
    }

    buildReadyMessage(ready = true) {
      return this.envelope("set_ready", { ready: Boolean(ready) });
    }

    buildSnapshotRequest() {
      return this.envelope("request_snapshot");
    }

    buildReconnectRequest() {
      return this.envelope("reconnect");
    }

    buildHeartbeat(sentAtMs) {
      return this.envelope("heartbeat", {
        sent_at_ms: sentAtMs,
      });
    }

    buildCommandMessage(command) {
      this.commandSequence += 1;
      return this.envelope("command", {
        sequence: this.commandSequence,
        kind: command.kind,
        command_payload: { ...(command.payload || {}) },
      });
    }

    buildAckEventsMessage(cursor = this.eventCursor) {
      return this.envelope("ack_events", {
        cursor,
      });
    }

    applyServerEnvelope(message) {
      if (!message || message.version !== this.protocolVersion) {
        this.phase = PVP_PHASE.ERROR;
        this.lastError = "Desteklenmeyen PvP sunucu mesajı.";
        return { ok: false, reason: this.lastError };
      }

      const payload = message.payload || {};

      if (message.type === "error") {
        this.phase = PVP_PHASE.ERROR;
        this.lastError = payload.message || "PvP sunucu hatası.";
        return { ok: false, reason: this.lastError };
      }

      if (message.type === "lobby_state") {
        this.lobby = payload;
        this._phaseFromLobby(payload);
        return { ok: true };
      }

      if (message.type === "setup_accepted") {
        this.lobby = payload;
        this.phase = PVP_PHASE.READY;
        return { ok: true };
      }

      if (message.type === "ready_state") {
        this.lobby = payload;
        if (payload.status === "running") {
          this.phase = PVP_PHASE.BATTLE;
        } else {
          this.phase = PVP_PHASE.READY;
        }
        return { ok: true };
      }

      if (message.type === "snapshot") {
        this.applySnapshot(payload);
        return { ok: true };
      }

      if (message.type === "events") {
        this.applyEventsPage(payload);
        return { ok: true };
      }

      if (message.type === "reconnect_state") {
        this.connected = true;
        this.commandSequence = Math.max(
          this.commandSequence,
          Number(payload.last_command_sequence || 0)
        );
        this.eventCursor = Number(payload.event_cursor || this.eventCursor);
        if (payload.snapshot) this.applySnapshot(payload.snapshot);
        if (Array.isArray(payload.events)) {
          this.events.push(...payload.events);
        }
        if (payload.final_result) {
          this.finalResult = payload.final_result;
          this.phase = PVP_PHASE.FINISHED;
        }
        return { ok: true };
      }

      if (message.type === "match_finished") {
        this.finalResult = payload;
        this.phase = PVP_PHASE.FINISHED;
        this.connected = false;
        return { ok: true };
      }

      if (message.type === "command_accepted") {
        this.commandSequence = Math.max(
          this.commandSequence,
          Number(payload.sequence || 0)
        );
        return { ok: true };
      }

      if (message.type === "heartbeat_ack") {
        return { ok: true };
      }

      return { ok: false, reason: "Bilinmeyen PvP sunucu mesaj türü." };
    }

    applyEventsPage(page) {
      const incoming = Array.isArray(page.events) ? page.events : [];
      this.events.push(...incoming);
      this.eventCursor = Math.max(
        this.eventCursor,
        Number(page.cursor || 0)
      );
      this.snapshotRevision = Math.max(
        this.snapshotRevision,
        Number(page.snapshot_revision || 0)
      );
    }

    applySnapshot(snapshot) {
      this.snapshot = snapshot;
      this.snapshotRevision = Math.max(
        this.snapshotRevision,
        Number(snapshot.snapshot_revision || snapshot.tick || 0)
      );

      if (snapshot.status === "finished") {
        this.phase = PVP_PHASE.FINISHED;
        this.finalResult = {
          session_id: snapshot.session_id,
          viewer_player_id: snapshot.viewer_player_id,
          status: snapshot.status,
          winner_player_id: snapshot.winner_player_id,
          loser_player_id: snapshot.loser_player_id,
          is_draw: snapshot.is_draw,
          finish_reason: snapshot.finish_reason,
          finished_at_ms: snapshot.finished_at_ms,
          result_summary: snapshot.result_summary,
        };
      } else if (snapshot.status === "running") {
        this.phase = PVP_PHASE.BATTLE;
      }

      const own = snapshot.players?.[this.playerId];
      if (own && this.battleClient) {
        if (typeof own.circuit_credits === "number") {
          this.battleClient.applyServerEconomyState({
            circuitCredits: own.circuit_credits,
          });
        }

        for (const serverModule of own.modules || []) {
          const module = this.battleClient.modules.get(
            serverModule.instance_id
          );
          if (!module) continue;

          this.battleClient.applyServerModuleState({
            instanceId: serverModule.instance_id,
            hp: serverModule.hp,
            maxHp: serverModule.max_hp,
            status: serverModule.status,
            position:
              serverModule.x === null || serverModule.y === null
                ? null
                : { x: serverModule.x, y: serverModule.y },
            direction: serverModule.direction,
            isPowered: serverModule.is_powered,
            heat: serverModule.heat,
          });
        }

        if (typeof snapshot.elapsed_ms === "number") {
          this.battleClient.updateElapsedMs(
            snapshot.elapsed_ms
          );
        }
      }
    }

    _phaseFromLobby(lobby) {
      if (lobby.status === "running") {
        this.phase = PVP_PHASE.BATTLE;
        return;
      }
      if (lobby.status === "finished") {
        this.phase = PVP_PHASE.FINISHED;
        return;
      }

      const own = (lobby.players || []).find(
        (player) => player.player_id === this.playerId
      );

      if (!own || !own.setup_submitted) {
        this.phase = PVP_PHASE.SETUP;
      } else {
        this.phase = PVP_PHASE.READY;
      }
    }
  }



  class RelayProfileClientState {
    constructor() {
      this.profile = null;
      this.activeSection = "Genel";
      this.allowedSections = [
        "Genel",
        "İlerleme",
        "Savaş Havuzu",
      ];
    }

    applyProfile(profile) {
      if (!profile || !profile.player_id) {
        throw new Error(
          "Geçerli oyuncu profili gerekli."
        );
      }

      this.profile = {
        ...profile,
        preferred_battle_pool_ids: [
          ...(profile.preferred_battle_pool_ids || []),
        ],
      };

      return this.profile;
    }

    setSection(section) {
      if (!this.allowedSections.includes(section)) {
        return {
          ok: false,
          reason: "Bu Profil bölümü mevcut kapsamda yok.",
        };
      }

      this.activeSection = section;
      return { ok: true };
    }

    viewModel() {
      if (!this.profile) return null;

      return {
        playerId: this.profile.player_id,
        displayName: this.profile.display_name,
        level: this.profile.level,
        experience: this.profile.experience,
        experienceIntoLevel:
          this.profile.experience_into_level,
        experienceToNextLevel:
          this.profile.experience_to_next_level,
        rating: this.profile.rating,
        leagueNameTr: this.profile.league_name_tr,
        battlePoolIds: [
          ...this.profile.preferred_battle_pool_ids,
        ],
        activeSection: this.activeSection,
      };
    }
  }


  const api = {
    RelayBattleClient,
    RelayPvPClientState,
    RelayProfileClientState,
    BattlePoolSelection,
    PVP_PHASE,
    MODULE_STATUS,
    DRAG_KIND,
    maxActiveModulesForElapsedMs,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.RelayBattleClient = RelayBattleClient;
  global.RelayPvPClientState = RelayPvPClientState;
  global.RelayProfileClientState = RelayProfileClientState;
  global.RelayPvPPhase = PVP_PHASE;
  global.BattlePoolSelection = BattlePoolSelection;
  global.RelayModuleStatus = MODULE_STATUS;
})(typeof globalThis !== "undefined" ? globalThis : window);
