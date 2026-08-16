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



  class RelayStatisticsClientState {
    constructor() {
      this.statistics = null;
    }

    applyStatistics(statistics) {
      if (!statistics || !statistics.player_id) {
        throw new Error(
          "Geçerli oyuncu istatistiği gerekli."
        );
      }

      this.statistics = {
        ...statistics,
        most_used_modules: [
          ...(statistics.most_used_modules || []),
        ],
      };

      return this.statistics;
    }

    viewModel() {
      if (!this.statistics) return null;

      return {
        playerId:
          this.statistics.player_id,
        totalMatches:
          this.statistics.total_matches,
        wins:
          this.statistics.wins,
        losses:
          this.statistics.losses,
        draws:
          this.statistics.draws,
        winRatePercent:
          Math.round(
            Number(
              this.statistics.win_rate || 0
            ) * 10000
          ) / 100,
        averageMatchDurationMs:
          this.statistics.average_match_duration_ms,
        totalDamageDealt:
          this.statistics.total_damage_dealt,
        moduleReplacements:
          this.statistics.module_replacements,
        boostersUsed:
          this.statistics.boosters_used,
        mostUsedModules: [
          ...this.statistics.most_used_modules,
        ],
      };
    }
  }



  class RelaySettingsClientState {
    constructor() {
      this.settings = null;
    }

    applySettings(settings) {
      if (!settings || !settings.player_id) {
        throw new Error(
          "Geçerli oyuncu ayarları gerekli."
        );
      }

      this.settings = {
        ...settings,
      };
      return this.settings;
    }

    patch(patch) {
      if (!this.settings) {
        throw new Error(
          "Önce oyuncu ayarları yüklenmelidir."
        );
      }

      this.settings = {
        ...this.settings,
        ...patch,
      };
      return this.settings;
    }

    viewModel() {
      if (!this.settings) return null;

      const qualityLabels = {
        dusuk: "Düşük",
        orta: "Orta",
        yuksek: "Yüksek",
      };

      return {
        soundVolume:
          this.settings.sound_volume,
        musicVolume:
          this.settings.music_volume,
        vibrationEnabled:
          this.settings.vibration_enabled,
        graphicsQuality:
          this.settings.graphics_quality,
        graphicsQualityTr:
          qualityLabels[
            this.settings.graphics_quality
          ] || this.settings.graphics_quality,
        language:
          this.settings.language,
      };
    }
  }



  const APP_SCREEN = Object.freeze({
    MENU: "menu",
    PLAY: "play",
    PROFILE: "profile",
    STATISTICS: "statistics",
    SETTINGS: "settings",
  });

  class RelayAppRouter {
    constructor() {
      this.currentScreen = APP_SCREEN.MENU;
      this.history = [];
      this.allowedScreens = new Set(
        Object.values(APP_SCREEN)
      );
    }

    go(screen) {
      if (!this.allowedScreens.has(screen)) {
        return {
          ok: false,
          reason: "Bu ekran mevcut ilk sürüm kapsamında değil.",
        };
      }

      if (screen !== this.currentScreen) {
        this.history.push(this.currentScreen);
      }

      this.currentScreen = screen;
      return {
        ok: true,
        screen,
      };
    }

    goMenu() {
      if (this.currentScreen !== APP_SCREEN.MENU) {
        this.history.push(this.currentScreen);
      }
      this.currentScreen = APP_SCREEN.MENU;
      return {
        ok: true,
        screen: APP_SCREEN.MENU,
      };
    }

    back() {
      if (!this.history.length) {
        return this.goMenu();
      }

      const previous = this.history.pop();

      if (!this.allowedScreens.has(previous)) {
        return this.goMenu();
      }

      this.currentScreen = previous;
      return {
        ok: true,
        screen: previous,
      };
    }

    is(screen) {
      return this.currentScreen === screen;
    }
  }



  const WS_CONNECTION_STATUS = Object.freeze({
    IDLE: "idle",
    CONNECTING: "connecting",
    OPEN: "open",
    RECONNECTING: "reconnecting",
    CLOSED: "closed",
    ERROR: "error",
  });

  class RelayWebSocketConnectionManager {
    constructor({
      pvpState,
      createWebSocket = (url) => new WebSocket(url),
      now = () => Date.now(),
      setTimer = (fn, ms) => setTimeout(fn, ms),
      clearTimer = (id) => clearTimeout(id),
      heartbeatIntervalMs = 5000,
      reconnectBaseDelayMs = 1000,
      reconnectMaxDelayMs = 8000,
      maxReconnectAttempts = 8,
      onStatusChange = null,
      onMessageApplied = null,
    }) {
      if (!pvpState) {
        throw new Error("PvP istemci durumu zorunludur.");
      }

      this.pvpState = pvpState;
      this.createWebSocket = createWebSocket;
      this.now = now;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.heartbeatIntervalMs = heartbeatIntervalMs;
      this.reconnectBaseDelayMs = reconnectBaseDelayMs;
      this.reconnectMaxDelayMs = reconnectMaxDelayMs;
      this.maxReconnectAttempts = maxReconnectAttempts;
      this.onStatusChange = onStatusChange;
      this.onMessageApplied = onMessageApplied;

      this.socket = null;
      this.url = null;
      this.status = WS_CONNECTION_STATUS.IDLE;
      this.manualClose = false;
      this.reconnectAttempts = 0;
      this.heartbeatTimer = null;
      this.reconnectTimer = null;
      this.outgoingQueue = [];
      this.lastHeartbeatSentAtMs = null;
      this.lastHeartbeatAckAtMs = null;
    }

    connect(url) {
      if (!url) {
        throw new Error("WebSocket adresi zorunludur.");
      }

      this.url = url;
      this.manualClose = false;
      this._clearReconnectTimer();
      this._openSocket(false);
    }

    disconnect() {
      this.manualClose = true;
      this._clearHeartbeatTimer();
      this._clearReconnectTimer();

      if (
        this.socket &&
        typeof this.socket.close === "function"
      ) {
        this.socket.close(1000, "client_disconnect");
      }

      this.socket = null;
      this.pvpState.markDisconnected();
      this._setStatus(WS_CONNECTION_STATUS.CLOSED);
    }

    sendEnvelope(envelope) {
      const serialized = JSON.stringify(envelope);

      if (this._socketIsOpen()) {
        this.socket.send(serialized);
        return {
          ok: true,
          queued: false,
        };
      }

      this.outgoingQueue.push(serialized);
      return {
        ok: true,
        queued: true,
      };
    }

    sendCommand(command) {
      return this.sendEnvelope(
        this.pvpState.buildCommandMessage(command)
      );
    }

    sendLobbyRequest() {
      return this.sendEnvelope(
        this.pvpState.buildLobbyRequest()
      );
    }

    sendSetup(setup) {
      return this.sendEnvelope(
        this.pvpState.buildSetupMessage(setup)
      );
    }

    sendReady(ready = true) {
      return this.sendEnvelope(
        this.pvpState.buildReadyMessage(ready)
      );
    }

    sendReconnect() {
      return this.sendEnvelope(
        this.pvpState.buildReconnectRequest()
      );
    }

    flushQueue() {
      if (!this._socketIsOpen()) {
        return 0;
      }

      let sent = 0;
      while (this.outgoingQueue.length) {
        this.socket.send(
          this.outgoingQueue.shift()
        );
        sent += 1;
      }
      return sent;
    }

    _openSocket(isReconnect) {
      this._clearHeartbeatTimer();

      this._setStatus(
        isReconnect
          ? WS_CONNECTION_STATUS.RECONNECTING
          : WS_CONNECTION_STATUS.CONNECTING
      );

      const socket = this.createWebSocket(this.url);
      this.socket = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.pvpState.markConnected();
        this._setStatus(WS_CONNECTION_STATUS.OPEN);

        if (isReconnect) {
          this.sendReconnect();
        } else {
          this.sendLobbyRequest();
        }

        this.flushQueue();
        this._scheduleHeartbeat();
      };

      socket.onmessage = (event) => {
        let message;

        try {
          message = JSON.parse(event.data);
        } catch (_error) {
          this._setStatus(
            WS_CONNECTION_STATUS.ERROR
          );
          return;
        }

        const result =
          this.pvpState.applyServerEnvelope(
            message
          );

        if (
          message.type === "heartbeat_ack"
        ) {
          this.lastHeartbeatAckAtMs =
            this.now();
        }

        if (
          typeof this.onMessageApplied
          === "function"
        ) {
          this.onMessageApplied(
            message,
            result
          );
        }
      };

      socket.onerror = () => {
        if (!this.manualClose) {
          this._setStatus(
            WS_CONNECTION_STATUS.ERROR
          );
        }
      };

      socket.onclose = () => {
        this._clearHeartbeatTimer();

        if (this.manualClose) {
          this._setStatus(
            WS_CONNECTION_STATUS.CLOSED
          );
          return;
        }

        this.pvpState.markDisconnected();
        this._scheduleReconnect();
      };
    }

    _scheduleHeartbeat() {
      this._clearHeartbeatTimer();

      this.heartbeatTimer = this.setTimer(
        () => {
          if (!this._socketIsOpen()) {
            return;
          }

          const sentAtMs = this.now();
          this.lastHeartbeatSentAtMs = sentAtMs;
          this.sendEnvelope(
            this.pvpState.buildHeartbeat(
              sentAtMs
            )
          );
          this._scheduleHeartbeat();
        },
        this.heartbeatIntervalMs
      );
    }

    _scheduleReconnect() {
      this._clearReconnectTimer();

      if (
        this.reconnectAttempts
        >= this.maxReconnectAttempts
      ) {
        this._setStatus(
          WS_CONNECTION_STATUS.CLOSED
        );
        return;
      }

      const delay = Math.min(
        this.reconnectBaseDelayMs
          * (2 ** this.reconnectAttempts),
        this.reconnectMaxDelayMs
      );

      this.reconnectAttempts += 1;
      this._setStatus(
        WS_CONNECTION_STATUS.RECONNECTING
      );

      this.reconnectTimer = this.setTimer(
        () => {
          this.reconnectTimer = null;
          if (!this.manualClose) {
            this._openSocket(true);
          }
        },
        delay
      );
    }

    _socketIsOpen() {
      if (!this.socket) {
        return false;
      }

      const openValue =
        typeof WebSocket !== "undefined"
          ? WebSocket.OPEN
          : 1;

      return this.socket.readyState === openValue
        || this.socket.readyState === 1;
    }

    _setStatus(status) {
      this.status = status;

      if (
        typeof this.onStatusChange
        === "function"
      ) {
        this.onStatusChange(status);
      }
    }

    _clearHeartbeatTimer() {
      if (this.heartbeatTimer !== null) {
        this.clearTimer(
          this.heartbeatTimer
        );
        this.heartbeatTimer = null;
      }
    }

    _clearReconnectTimer() {
      if (this.reconnectTimer !== null) {
        this.clearTimer(
          this.reconnectTimer
        );
        this.reconnectTimer = null;
      }
    }
  }



  class RelayMatchmakingClientState {
    constructor() {
      this.queued = false;
      this.matched = false;
      this.sessionId = null;
      this.players = [];
      this.ratingDifference = null;
      this.queue = null;
    }

    applyJoinResponse(response) {
      if (response.matched) {
        this.queued = false;
        this.matched = true;
        this.sessionId = response.session_id;
        this.players = [
          ...(response.players || []),
        ];
        this.ratingDifference =
          response.rating_difference;
        this.queue = null;
      } else {
        this.queued = true;
        this.matched = false;
        this.queue = response.queue || null;
      }

      return this.viewModel();
    }

    applyQueueStatus(status) {
      this.queued = Boolean(
        status && status.queued
      );
      this.queue =
        this.queued ? { ...status } : null;
      return this.viewModel();
    }

    cancel() {
      this.queued = false;
      this.queue = null;
    }

    viewModel() {
      return {
        queued: this.queued,
        matched: this.matched,
        sessionId: this.sessionId,
        players: [...this.players],
        ratingDifference:
          this.ratingDifference,
        queue: this.queue
          ? { ...this.queue }
          : null,
      };
    }
  }



  class RelayProgressionClientState {
    constructor() {
      this.lastResult = null;
    }

    applyResult(result) {
      if (!result || !result.player_id) {
        throw new Error(
          "Geçerli maç ilerleme sonucu gerekli."
        );
      }

      this.lastResult = {
        ...result,
      };

      return this.viewModel();
    }

    viewModel() {
      if (!this.lastResult) {
        return null;
      }

      const result=this.lastResult;

      return {
        playerId: result.player_id,
        ratingBefore:
          result.rating_before,
        ratingAfter:
          result.rating_after,
        ratingDelta:
          result.rating_delta,
        xpAwarded:
          result.xp_awarded,
        levelAfter:
          result.level_after,
        experienceAfter:
          result.experience_after,
      };
    }
  }


  const api = {
    RelayBattleClient,
    RelayPvPClientState,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelaySettingsClientState,
    RelayAppRouter,
    RelayWebSocketConnectionManager,
    RelayMatchmakingClientState,
    RelayProgressionClientState,
    BattlePoolSelection,
    APP_SCREEN,
    WS_CONNECTION_STATUS,
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
  global.RelayStatisticsClientState = RelayStatisticsClientState;
  global.RelaySettingsClientState = RelaySettingsClientState;
  global.RelayAppRouter = RelayAppRouter;
  global.RelayWebSocketConnectionManager = RelayWebSocketConnectionManager;
  global.RelayMatchmakingClientState = RelayMatchmakingClientState;
  global.RelayProgressionClientState = RelayProgressionClientState;
  global.RelayAppScreen = APP_SCREEN;
  global.RelayWebSocketStatus = WS_CONNECTION_STATUS;
  global.RelayPvPPhase = PVP_PHASE;
  global.BattlePoolSelection = BattlePoolSelection;
  global.RelayModuleStatus = MODULE_STATUS;
})(typeof globalThis !== "undefined" ? globalThis : window);
