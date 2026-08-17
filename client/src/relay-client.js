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
    constructor({
      selectableModuleIds,
      requiredSize = 18,
      requiredModuleIds = [],
    }) {
      this.selectableModuleIds = [...selectableModuleIds];
      this.requiredSize = requiredSize;
      this.requiredModuleIds = new Set(
        requiredModuleIds
      );

      for (const moduleId of this.requiredModuleIds) {
        if (!this.selectableModuleIds.includes(moduleId)) {
          throw new Error(
            `Zorunlu Savaş Havuzu modülü seçilebilir değil: ${moduleId}`
          );
        }
      }

      if (
        this.requiredModuleIds.size
        > this.requiredSize
      ) {
        throw new Error(
          "Zorunlu modül sayısı Savaş Havuzu sınırını aşıyor."
        );
      }

      this.selected = new Set(
        this.requiredModuleIds
      );
    }

    toggle(moduleId) {
      if (!this.selectableModuleIds.includes(moduleId)) {
        return { ok: false, reason: "Modül global oyuncu havuzunda değil." };
      }

      if (this.selected.has(moduleId)) {
        if (
          this.requiredModuleIds.has(
            moduleId
          )
        ) {
          return {
            ok: false,
            reason:
              "Bu modül başlangıç devresi için Savaş Havuzu'nda zorunludur.",
          };
        }

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
      this.connected = false;
      this.commandSequence = 0;
      this.eventCursor = 0;
      this.snapshotRevision = 0;
      this.lobby = null;
      this.snapshot = null;
      this.finalResult = null;
      this.events = [];
      this.lastError = null;
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

    clearOutgoingQueue() {
      const removed =
        this.outgoingQueue.length;
      this.outgoingQueue.length = 0;
      return removed;
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
      if (
        status
        && status.matched
      ) {
        return this.applyJoinResponse({
          matched: true,
          session_id:
            status.session_id,
          players:
            status.players || [],
          rating_difference:
            status.rating_difference,
        });
      }

      this.queued = Boolean(
        status && status.queued
      );
      this.matched = false;
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



  class RelayPlayerDataSnapshotState {
    constructor() {
      this.snapshot = null;
    }

    applySnapshot(snapshot) {
      if (
        !snapshot
        || !snapshot.player_id
        || !snapshot.profile
        || !snapshot.statistics
        || !snapshot.settings
      ) {
        throw new Error(
          "Geçerli oyuncu veri snapshot'ı gerekli."
        );
      }

      this.snapshot = {
        player_id: snapshot.player_id,
        profile: {
          ...snapshot.profile,
        },
        statistics: {
          ...snapshot.statistics,
        },
        settings: {
          ...snapshot.settings,
        },
      };

      return this.snapshot;
    }

    clear() {
      this.snapshot = null;
    }
  }



  const TELEMETRY_EVENT_TYPE = Object.freeze({
    GAME_OPENED: "game_opened",
    MATCHMAKING_STARTED: "matchmaking_started",
    MATCHMAKING_MATCHED: "matchmaking_matched",
    MATCH_STARTED: "match_started",
    MATCH_COMPLETED: "match_completed",
    MODULE_CHANGED: "module_changed",
    CIRCUIT_CREDIT_SPENT: "circuit_credit_spent",
    MODULE_SHELF_USED: "module_shelf_used",
    BOOSTER_USED: "booster_used",
    REMATCH_REQUESTED: "rematch_requested",
  });

  class RelayTelemetryDispatcher {
    constructor({
      playerId = null,
      sessionId = null,
      now = () => Date.now(),
      eventIdFactory = null,
      transport = null,
    } = {}) {
      this.playerId = playerId;
      this.sessionId = sessionId;
      this.now = now;
      this.transport = transport;
      this.sequence = 0;
      this.buffer = [];
      this.allowedTypes = new Set(
        Object.values(TELEMETRY_EVENT_TYPE)
      );
      this.eventIdFactory =
        eventIdFactory
        || ((type, sequence) =>
          `client-${type}-${sequence}`);
    }

    setSession(sessionId) {
      this.sessionId = sessionId || null;
    }

    track(
      eventType,
      metadata = {},
      {
        playerId = this.playerId,
        sessionId = this.sessionId,
      } = {}
    ) {
      if (!this.allowedTypes.has(eventType)) {
        return {
          ok: false,
          reason: "Desteklenmeyen telemetri olay türü.",
        };
      }

      this.sequence += 1;

      const event = {
        event_id: this.eventIdFactory(
          eventType,
          this.sequence
        ),
        event_type: eventType,
        timestamp_ms: Math.max(
          0,
          Math.floor(this.now())
        ),
        player_id: playerId || null,
        session_id: sessionId || null,
        metadata: { ...metadata },
      };

      this.buffer.push(event);

      if (typeof this.transport === "function") {
        this.transport(event);
      }

      return {
        ok: true,
        event,
      };
    }

    trackGameOpened(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.GAME_OPENED,
        metadata
      );
    }

    trackModuleShelfUsed(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.MODULE_SHELF_USED,
        metadata
      );
    }

    trackRematchRequested(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.REMATCH_REQUESTED,
        metadata
      );
    }

    trackMatchmakingStarted(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.MATCHMAKING_STARTED,
        metadata
      );
    }

    drain() {
      const events = [...this.buffer];
      this.buffer.length = 0;
      return events;
    }
  }



  class RelayWebTestBuildState {
    constructor() {
      this.status = "unknown";
      this.version = null;
      this.build = null;
      this.ready = false;
      this.releaseChecks = [];
      this.capabilities = {};
    }

    applyHealth(health) {
      const webTest =
        health && health.web_test;

      if (!webTest) {
        this.status = "error";
        this.ready = false;
        return {
          ok: false,
          reason:
            "Web test sağlık bilgisi bulunamadı.",
        };
      }

      this.version =
        health.version || null;
      this.build =
        webTest.build || null;
      this.ready =
        Boolean(webTest.ready);
      this.releaseChecks = [
        ...(webTest.release_checks || []),
      ];
      this.capabilities = {
        ...(webTest.capabilities || {}),
      };
      this.status =
        this.ready
          ? "ready"
          : "blocked";

      return {
        ok: true,
        ready: this.ready,
      };
    }

    labelTr() {
      if (this.status === "ready") {
        return "Web Test: Hazır";
      }
      if (this.status === "blocked") {
        return "Web Test: Engelli";
      }
      if (this.status === "error") {
        return "Web Test: Sağlık Hatası";
      }
      return "Web Test: Kontrol Bekliyor";
    }
  }



  const ONLINE_PLAY_STATUS = Object.freeze({
    IDLE: "idle",
    MATCHMAKING: "matchmaking",
    MATCHED: "matched",
    CONNECTING: "connecting",
    READYING: "readying",
    BATTLE: "battle",
    CANCELLED: "cancelled",
    ERROR: "error",
  });

  class RelayOnlinePlayCoordinator {
    constructor({
      playerId,
      pvpState,
      matchmakingState,
      connectionManager,
      requestJson = null,
      setTimer = (fn, ms) =>
        setTimeout(fn, ms),
      clearTimer = (id) =>
        clearTimeout(id),
      pollIntervalMs = 1000,
      webSocketUrlFactory = null,
      onStatusChange = null,
      onSessionBound = null,
    }) {
      if (!playerId) {
        throw new Error(
          "Online Oyna oyuncu kimliği zorunludur."
        );
      }
      if (
        !pvpState
        || !matchmakingState
        || !connectionManager
      ) {
        throw new Error(
          "Online Oyna için PvP, eşleştirme ve bağlantı yöneticisi zorunludur."
        );
      }

      this.playerId = playerId;
      this.pvpState = pvpState;
      this.matchmakingState =
        matchmakingState;
      this.connectionManager =
        connectionManager;
      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.pollIntervalMs =
        pollIntervalMs;
      this.onStatusChange =
        onStatusChange;
      this.onSessionBound =
        onSessionBound;

      this.requestJson =
        requestJson
        || (async (path, options = {}) => {
          const response =
            await fetch(path, {
              ...options,
              headers: {
                "content-type":
                  "application/json",
                ...(options.headers || {}),
              },
            });

          if (!response.ok) {
            throw new Error(
              `Sunucu isteği başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.webSocketUrlFactory =
        webSocketUrlFactory
        || ((sessionId) => {
          if (
            typeof window
            === "undefined"
            || !window.location
          ) {
            throw new Error(
              "Tarayıcı WebSocket adresi oluşturulamadı."
            );
          }

          const scheme =
            window.location.protocol
            === "https:"
              ? "wss"
              : "ws";

          return (
            `${scheme}://${window.location.host}`
            + `/ws/pvp/${encodeURIComponent(sessionId)}`
            + `?player_id=${encodeURIComponent(this.playerId)}`
          );
        });

      this.status =
        ONLINE_PLAY_STATUS.IDLE;
      this.pollTimer = null;
      this.pendingSetup = null;
      this.lastError = null;
    }

    async start({
      battlePoolIds,
      initialModules,
    }) {
      if (
        !Array.isArray(battlePoolIds)
        || battlePoolIds.length !== 18
      ) {
        throw new Error(
          "Online maç için tam 18 modüllük Savaş Havuzu gerekli."
        );
      }

      if (
        !Array.isArray(initialModules)
        || initialModules.length !== 4
      ) {
        throw new Error(
          "Online maç için tam 4 başlangıç modülü gerekli."
        );
      }

      this.pendingSetup = {
        battlePoolIds: [
          ...battlePoolIds,
        ],
        initialModules:
          initialModules.map(
            (module) => ({
              ...module,
            })
          ),
      };

      this.lastError = null;
      this._setStatus(
        ONLINE_PLAY_STATUS.MATCHMAKING
      );

      try {
        const response =
          await this.requestJson(
            "/matchmaking/join",
            {
              method: "POST",
              body: JSON.stringify({
                player_id:
                  this.playerId,
              }),
            }
          );

        this.matchmakingState
          .applyJoinResponse(
            response
          );

        if (response.matched) {
          return this._activateMatch(
            response
          );
        }

        this._schedulePoll();

        return {
          ok: true,
          matched: false,
        };
      } catch (error) {
        this._fail(error);
        return {
          ok: false,
          reason:
            this.lastError,
        };
      }
    }

    async pollNow() {
      if (
        this.status
        !== ONLINE_PLAY_STATUS.MATCHMAKING
      ) {
        return {
          ok: false,
          reason:
            "Eşleştirme sorgusu aktif değil.",
        };
      }

      try {
        const status =
          await this.requestJson(
            `/matchmaking/${encodeURIComponent(this.playerId)}`
          );

        this.matchmakingState
          .applyQueueStatus(
            status
          );

        if (status.matched) {
          return this._activateMatch(
            status
          );
        }

        this._schedulePoll();

        return {
          ok: true,
          matched: false,
        };
      } catch (error) {
        this._fail(error);
        return {
          ok: false,
          reason:
            this.lastError,
        };
      }
    }

    async cancel() {
      this._clearPoll();

      try {
        await this.requestJson(
          `/matchmaking/${encodeURIComponent(this.playerId)}`,
          {
            method: "DELETE",
          }
        );
      } catch (_error) {
        // Kullanıcı iptali yerel akışı yine de durdurur.
      }

      this.matchmakingState.cancel();
      this.pendingSetup = null;
      this._setStatus(
        ONLINE_PLAY_STATUS.CANCELLED
      );

      return {
        ok: true,
      };
    }

    markBattleStarted() {
      this._setStatus(
        ONLINE_PLAY_STATUS.BATTLE
      );
    }

    _activateMatch(response) {
      const sessionId =
        response.session_id;

      if (!sessionId) {
        this._fail(
          new Error(
            "Eşleşme sonucu session_id içermiyor."
          )
        );
        return {
          ok: false,
          reason:
            this.lastError,
        };
      }

      this._clearPoll();
      this.matchmakingState
        .applyJoinResponse({
          matched: true,
          session_id: sessionId,
          players:
            response.players || [],
          rating_difference:
            response.rating_difference,
        });

      this.pvpState.bindSession(
        sessionId
      );

      if (
        typeof this.onSessionBound
        === "function"
      ) {
        this.onSessionBound(
          sessionId
        );
      }

      this.connectionManager
        .clearOutgoingQueue();

      this.connectionManager.sendSetup(
        this.pendingSetup
      );
      this.connectionManager.sendReady(
        true
      );

      this._setStatus(
        ONLINE_PLAY_STATUS.MATCHED
      );

      const wsUrl =
        this.webSocketUrlFactory(
          sessionId
        );

      this._setStatus(
        ONLINE_PLAY_STATUS.CONNECTING
      );
      this.connectionManager.connect(
        wsUrl
      );

      this._setStatus(
        ONLINE_PLAY_STATUS.READYING
      );

      return {
        ok: true,
        matched: true,
        sessionId,
        webSocketUrl: wsUrl,
      };
    }

    _schedulePoll() {
      this._clearPoll();

      this.pollTimer =
        this.setTimer(
          () => {
            this.pollTimer = null;
            this.pollNow();
          },
          this.pollIntervalMs
        );
    }

    _clearPoll() {
      if (this.pollTimer !== null) {
        this.clearTimer(
          this.pollTimer
        );
        this.pollTimer = null;
      }
    }

    _setStatus(status) {
      this.status = status;

      if (
        typeof this.onStatusChange
        === "function"
      ) {
        this.onStatusChange(
          status
        );
      }
    }

    _fail(error) {
      this._clearPoll();
      this.lastError =
        error instanceof Error
          ? error.message
          : String(error);
      this._setStatus(
        ONLINE_PLAY_STATUS.ERROR
      );
    }
  }



  class RelayPostMatchSync {
    constructor({
      playerId,
      profileState,
      statisticsState,
      progressionState,
      requestJson = null,
    }) {
      if (!playerId) {
        throw new Error(
          "Maç sonu senkronizasyonu için oyuncu kimliği zorunludur."
        );
      }

      this.playerId = playerId;
      this.profileState = profileState;
      this.statisticsState =
        statisticsState;
      this.progressionState =
        progressionState;
      this.requestJson =
        requestJson
        || (async (path) => {
          const response =
            await fetch(path);

          if (!response.ok) {
            throw new Error(
              `Maç sonu senkronizasyonu başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.lastBattleId = null;
      this.lastPayload = null;
      this.loading = false;
      this.lastError = null;
    }

    async sync(battleId) {
      if (!battleId) {
        return {
          ok: false,
          reason:
            "Maç sonu senkronizasyonu için battle_id gerekli.",
        };
      }

      if (
        this.lastBattleId === battleId
        && this.lastPayload
      ) {
        return {
          ok: true,
          cached: true,
          payload:
            this.lastPayload,
        };
      }

      this.loading = true;
      this.lastError = null;

      try {
        const payload =
          await this.requestJson(
            `/post-match/${encodeURIComponent(battleId)}/${encodeURIComponent(this.playerId)}`
          );

        this.progressionState
          ?.applyResult(
            payload.progression
          );
        this.profileState
          ?.applyProfile(
            payload.profile
          );
        this.statisticsState
          ?.applyStatistics(
            payload.statistics
          );

        this.lastBattleId =
          battleId;
        this.lastPayload = {
          ...payload,
        };

        return {
          ok: true,
          cached: false,
          payload:
            this.lastPayload,
        };
      } catch (error) {
        this.lastError =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          ok: false,
          reason:
            this.lastError,
        };
      } finally {
        this.loading = false;
      }
    }

    clear() {
      this.lastBattleId = null;
      this.lastPayload = null;
      this.lastError = null;
      this.loading = false;
    }
  }



  const REMOTE_DATA_STATUS = Object.freeze({
    IDLE: "idle",
    LOADING: "loading",
    READY: "ready",
    ERROR: "error",
  });

  class RelayAccountDataLoader {
    constructor({
      playerId,
      profileState,
      statisticsState,
      settingsState,
      requestJson = null,
    }) {
      if (!playerId) {
        throw new Error(
          "Oyuncu verisi yüklemek için oyuncu kimliği zorunludur."
        );
      }

      this.playerId = playerId;
      this.profileState = profileState;
      this.statisticsState = statisticsState;
      this.settingsState = settingsState;
      this.requestJson =
        requestJson
        || (async (path, options = {}) => {
          const response = await fetch(
            path,
            {
              ...options,
              headers: {
                "content-type":
                  "application/json",
                ...(options.headers || {}),
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `Oyuncu verisi isteği başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.status = {
        profile:
          REMOTE_DATA_STATUS.IDLE,
        statistics:
          REMOTE_DATA_STATUS.IDLE,
        settings:
          REMOTE_DATA_STATUS.IDLE,
      };
      this.errors = {
        profile: null,
        statistics: null,
        settings: null,
      };
    }

    async loadProfile() {
      return this._load(
        "profile",
        `/profile/${encodeURIComponent(this.playerId)}`,
        (payload) =>
          this.profileState
            .applyProfile(payload)
      );
    }

    async loadStatistics() {
      return this._load(
        "statistics",
        `/statistics/${encodeURIComponent(this.playerId)}`,
        (payload) =>
          this.statisticsState
            .applyStatistics(payload)
      );
    }

    async loadSettings() {
      return this._load(
        "settings",
        `/settings/${encodeURIComponent(this.playerId)}`,
        (payload) =>
          this.settingsState
            .applySettings(payload)
      );
    }

    async saveDisplayName(displayName) {
      const normalized =
        String(
          displayName || ""
        ).trim();

      if (!normalized) {
        return {
          ok: false,
          reason:
            "Görünen oyuncu adı boş olamaz.",
        };
      }

      this.status.profile =
        REMOTE_DATA_STATUS.LOADING;
      this.errors.profile = null;

      try {
        const payload =
          await this.requestJson(
            `/profile/${encodeURIComponent(this.playerId)}/display-name`,
            {
              method: "PUT",
              body: JSON.stringify({
                display_name:
                  normalized,
              }),
            }
          );

        this.profileState
          .applyProfile(
            payload
          );
        this.status.profile =
          REMOTE_DATA_STATUS.READY;

        return {
          ok: true,
          payload,
        };
      } catch (error) {
        this.status.profile =
          REMOTE_DATA_STATUS.ERROR;
        this.errors.profile =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          ok: false,
          reason:
            this.errors.profile,
        };
      }
    }

    async saveSettings(patch) {
      this.status.settings =
        REMOTE_DATA_STATUS.LOADING;
      this.errors.settings = null;

      try {
        const payload =
          await this.requestJson(
            `/settings/${encodeURIComponent(this.playerId)}`,
            {
              method: "PUT",
              body: JSON.stringify(
                patch
              ),
            }
          );

        this.settingsState
          .applySettings(
            payload
          );
        this.status.settings =
          REMOTE_DATA_STATUS.READY;

        return {
          ok: true,
          payload,
        };
      } catch (error) {
        this.status.settings =
          REMOTE_DATA_STATUS.ERROR;
        this.errors.settings =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          ok: false,
          reason:
            this.errors.settings,
        };
      }
    }

    async loadAll() {
      const results =
        await Promise.all([
          this.loadProfile(),
          this.loadStatistics(),
          this.loadSettings(),
        ]);

      return {
        ok: results.every(
          (result) => result.ok
        ),
        results,
      };
    }

    async _load(
      key,
      path,
      apply
    ) {
      this.status[key] =
        REMOTE_DATA_STATUS.LOADING;
      this.errors[key] = null;

      try {
        const payload =
          await this.requestJson(
            path
          );
        apply(payload);
        this.status[key] =
          REMOTE_DATA_STATUS.READY;

        return {
          ok: true,
          payload,
        };
      } catch (error) {
        this.status[key] =
          REMOTE_DATA_STATUS.ERROR;
        this.errors[key] =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          ok: false,
          reason:
            this.errors[key],
        };
      }
    }
  }



  class RelayWebTestKpiState {
    constructor() {
      this.kpis = null;
    }

    applyKpis(kpis) {
      if (!kpis) {
        throw new Error(
          "Web test KPI verisi gerekli."
        );
      }

      this.kpis = {
        ...kpis,
      };
      return this.viewModel();
    }

    viewModel() {
      if (!this.kpis) {
        return null;
      }

      return {
        completedMatches:
          this.kpis.completed_matches,
        completionRatePercent:
          Math.round(
            Number(
              this.kpis.match_completion_rate
              || 0
            ) * 10000
          ) / 100,
        rematchRequests:
          this.kpis.rematch_requests,
        rematchRatePercent:
          Math.round(
            Number(
              this.kpis.rematch_request_rate
              || 0
            ) * 10000
          ) / 100,
        secondMatchTransitionRatePercent:
          Math.round(
            Number(
              this.kpis.second_match_transition_rate
              || 0
            ) * 10000
          ) / 100,
        losingPlayerRematchRatePercent:
          Math.round(
            Number(
              this.kpis.losing_player_rematch_rate
              || 0
            ) * 10000
          ) / 100,
        moduleChanges:
          this.kpis.module_changes,
        averageModuleChangesPerMatch:
          this.kpis.average_module_changes_per_match,
        totalCircuitCreditsSpent:
          this.kpis.total_circuit_credits_spent,
        moduleShelfUses:
          this.kpis.module_shelf_uses,
        boostersUsed:
          this.kpis.boosters_used,
        averageMatchDurationMs:
          this.kpis.average_match_duration_ms,
        launchAttempts:
          this.kpis.launch_attempts
          || 0,
        launchReadyAttempts:
          this.kpis.launch_ready_attempts
          || 0,
        launchReadyRatePercent:
          Math.round(
            Number(
              this.kpis.launch_ready_rate
              || 0
            ) * 10000
          ) / 100,
        auditSessionStarts:
          this.kpis.audit_session_starts
          || 0,
        auditSessionBounds:
          this.kpis.audit_session_bounds
          || 0,
        auditToSessionRatePercent:
          Math.round(
            Number(
              this.kpis.audit_to_session_rate
              || 0
            ) * 10000
          ) / 100,
        auditSessionFinishes:
          this.kpis.audit_session_finishes
          || 0,
        auditToFinishRatePercent:
          Math.round(
            Number(
              this.kpis.audit_to_finish_rate
              || 0
            ) * 10000
          ) / 100,
        boundToFinishRatePercent:
          Math.round(
            Number(
              this.kpis.bound_to_finish_rate
              || 0
            ) * 10000
          ) / 100,
      };
    }
  }



  const TELEMETRY_TRANSPORT_STATUS = Object.freeze({
    IDLE: "idle",
    SENDING: "sending",
    RETRY_WAIT: "retry_wait",
    READY: "ready",
  });

  class RelayTelemetryHttpTransport {
    constructor({
      requestJson = null,
      setTimer = (fn, ms) =>
        setTimeout(fn, ms),
      clearTimer = (id) =>
        clearTimeout(id),
      retryBaseDelayMs = 1000,
      retryMaxDelayMs = 10000,
      onStatusChange = null,
    } = {}) {
      this.requestJson =
        requestJson
        || (async (event) => {
          const response =
            await fetch(
              "/telemetry/events",
              {
                method: "POST",
                headers: {
                  "content-type":
                    "application/json",
                },
                body: JSON.stringify(
                  event
                ),
              }
            );

          if (!response.ok) {
            throw new Error(
              `Telemetri gönderimi başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.setTimer = setTimer;
      this.clearTimer = clearTimer;
      this.retryBaseDelayMs =
        retryBaseDelayMs;
      this.retryMaxDelayMs =
        retryMaxDelayMs;
      this.onStatusChange =
        onStatusChange;

      this.pending = new Map();
      this.retryAttempts = 0;
      this.retryTimer = null;
      this.inFlight = false;
      this.status =
        TELEMETRY_TRANSPORT_STATUS.IDLE;
    }

    enqueue(event) {
      if (
        !event
        || !event.event_id
      ) {
        return {
          ok: false,
          reason:
            "Gönderilecek telemetri event_id içermelidir.",
        };
      }

      if (
        !this.pending.has(
          event.event_id
        )
      ) {
        this.pending.set(
          event.event_id,
          {
            ...event,
            metadata: {
              ...(event.metadata || {}),
            },
          }
        );
      }

      this.flush();

      return {
        ok: true,
        pending:
          this.pending.size,
      };
    }

    async flush() {
      if (
        this.inFlight
        || this.pending.size === 0
      ) {
        if (
          this.pending.size === 0
          && !this.inFlight
        ) {
          this._setStatus(
            TELEMETRY_TRANSPORT_STATUS.READY
          );
        }
        return {
          ok: true,
          pending:
            this.pending.size,
        };
      }

      this._clearRetry();
      this.inFlight = true;
      this._setStatus(
        TELEMETRY_TRANSPORT_STATUS.SENDING
      );

      try {
        for (
          const [eventId, event]
          of [...this.pending.entries()]
        ) {
          await this.requestJson(
            event
          );
          this.pending.delete(
            eventId
          );
        }

        this.retryAttempts = 0;
        this._setStatus(
          TELEMETRY_TRANSPORT_STATUS.READY
        );

        return {
          ok: true,
          pending: 0,
        };
      } catch (error) {
        this.retryAttempts += 1;
        this._scheduleRetry();

        return {
          ok: false,
          reason:
            error instanceof Error
              ? error.message
              : String(error),
          pending:
            this.pending.size,
        };
      } finally {
        this.inFlight = false;
      }
    }

    pendingEvents() {
      return [
        ...this.pending.values()
      ].map((event) => ({
        ...event,
        metadata: {
          ...(event.metadata || {}),
        },
      }));
    }

    _scheduleRetry() {
      this._clearRetry();

      const exponent = Math.max(
        0,
        this.retryAttempts - 1
      );
      const delay = Math.min(
        this.retryBaseDelayMs
          * (2 ** exponent),
        this.retryMaxDelayMs
      );

      this._setStatus(
        TELEMETRY_TRANSPORT_STATUS.RETRY_WAIT
      );

      this.retryTimer =
        this.setTimer(
          () => {
            this.retryTimer = null;
            this.flush();
          },
          delay
        );
    }

    _clearRetry() {
      if (
        this.retryTimer !== null
      ) {
        this.clearTimer(
          this.retryTimer
        );
        this.retryTimer = null;
      }
    }

    _setStatus(status) {
      this.status = status;

      if (
        typeof this.onStatusChange
        === "function"
      ) {
        this.onStatusChange(
          status
        );
      }
    }
  }



  class RelayReleaseCheckState {
    constructor() {
      this.result = null;
    }

    apply(result) {
      if (!result) {
        throw new Error(
          "Release-check sonucu gerekli."
        );
      }

      this.result = {
        ...result,
        checks: {
          ...(result.checks || {}),
        },
        menu_areas: [
          ...(result.menu_areas || []),
        ],
        deferred_areas: [
          ...(result.deferred_areas || []),
        ],
      };

      return this.viewModel();
    }

    viewModel() {
      if (!this.result) {
        return null;
      }

      return {
        ready:
          Boolean(
            this.result.ready
          ),
        version:
          this.result.version,
        build:
          this.result.build,
        menuAreas: [
          ...this.result.menu_areas,
        ],
        deferredAreas: [
          ...this.result.deferred_areas,
        ],
        failedChecks:
          Object.entries(
            this.result.checks
          )
            .filter(
              ([, ok]) => !ok
            )
            .map(
              ([name]) => name
            ),
      };
    }
  }



  const PLAY_RECOVERY_KIND = Object.freeze({
    NONE: "none",
    MATCHMAKING: "matchmaking",
    WEBSOCKET: "websocket",
    SETUP_READY: "setup_ready",
    POST_MATCH: "post_match",
    TELEMETRY: "telemetry",
  });

  class RelayPlayRecoveryState {
    constructor() {
      this.kind = PLAY_RECOVERY_KIND.NONE;
      this.message = "";
      this.retryable = false;
      this.active = false;
    }

    show(kind, message, {
      retryable = true,
    } = {}) {
      this.kind = kind;
      this.message = String(
        message || "Bilinmeyen hata"
      );
      this.retryable =
        Boolean(retryable);
      this.active = true;
      return this.viewModel();
    }

    clear() {
      this.kind =
        PLAY_RECOVERY_KIND.NONE;
      this.message = "";
      this.retryable = false;
      this.active = false;
    }

    viewModel() {
      return {
        kind: this.kind,
        message: this.message,
        retryable: this.retryable,
        active: this.active,
      };
    }
  }



  const SERVER_BOOT_STATUS = Object.freeze({
    IDLE: "idle",
    CHECKING: "checking",
    READY: "ready",
    BLOCKED: "blocked",
    ERROR: "error",
  });

  class RelayServerBootGate {
    constructor({
      healthState,
      releaseCheckState,
      expectedVersion = null,
      expectedProtocolVersion = 1,
      requestJson = null,
    }) {
      this.healthState = healthState;
      this.releaseCheckState =
        releaseCheckState;
      this.expectedVersion =
        expectedVersion;
      this.expectedProtocolVersion =
        expectedProtocolVersion;
      this.manifest = null;
      this.operationReadiness = null;
      this.requestJson =
        requestJson
        || (async (path) => {
          const response =
            await fetch(path);

          if (!response.ok) {
            throw new Error(
              `Sunucu sağlık isteği başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.status =
        SERVER_BOOT_STATUS.IDLE;
      this.lastError = null;
      this.health = null;
      this.releaseCheck = null;
    }

    async check() {
      this.status =
        SERVER_BOOT_STATUS.CHECKING;
      this.lastError = null;

      try {
        const [
          health,
          releaseCheck,
          manifest,
          operationReadiness,
        ] = await Promise.all([
          this.requestJson(
            "/health"
          ),
          this.requestJson(
            "/web-test/release-check"
          ),
          this.requestJson(
            "/web-test/manifest"
          ),
          this.requestJson(
            "/web-test/operation-readiness"
          ),
        ]);

        this.health = health;
        this.releaseCheck =
          releaseCheck;
        this.manifest =
          manifest;
        this.operationReadiness =
          operationReadiness;

        const healthResult =
          this.healthState
            .applyHealth(
              health
            );
        const releaseView =
          this.releaseCheckState
            .apply(
              releaseCheck
            );

        const versionMatches =
          !this.expectedVersion
          || (
            manifest.server_version
            === this.expectedVersion
          );

        const protocolMatches =
          Number(
            manifest.pvp_protocol_version
          )
          === Number(
            this.expectedProtocolVersion
          );

        const ready =
          healthResult.ok
          && healthResult.ready
          && releaseView.ready
          && Boolean(
            manifest.release_ready
          )
          && Boolean(
            operationReadiness.ready
          )
          && versionMatches
          && protocolMatches;

        if (!versionMatches) {
          this.lastError =
            `Sürüm uyuşmazlığı: istemci ${this.expectedVersion}, sunucu ${manifest.server_version}`;
        } else if (
          !protocolMatches
        ) {
          this.lastError =
            "PvP protokol sürümü uyuşmuyor.";
        } else if (
          !operationReadiness.ready
        ) {
          const failedChecks =
            Object.entries(
              operationReadiness.checks
              || {}
            )
              .filter(
                ([, ok]) => !ok
              )
              .map(
                ([name]) => name
              );

          this.lastError =
            failedChecks.length
              ? (
                  "Web test operasyon hazırlığı tamamlanmadı: "
                  + failedChecks.join(", ")
                )
              : "Web test operasyon hazırlığı tamamlanmadı.";
        }

        this.status = ready
          ? SERVER_BOOT_STATUS.READY
          : SERVER_BOOT_STATUS.BLOCKED;

        return {
          ok: ready,
          ready,
          health,
          releaseCheck,
          manifest,
          operationReadiness,
          versionMatches,
          protocolMatches,
        };
      } catch (error) {
        this.status =
          SERVER_BOOT_STATUS.ERROR;
        this.lastError =
          error instanceof Error
            ? error.message
            : String(error);

        return {
          ok: false,
          ready: false,
          reason:
            this.lastError,
        };
      }
    }

    canPlay() {
      return (
        this.status
        === SERVER_BOOT_STATUS.READY
      );
    }
  }



  class RelayDiagnosticSnapshot {
    constructor({
      version,
      build,
      bootGate,
      connectionManager,
      matchmakingState,
      pvpState,
      recoveryState,
      telemetryTransport,
      releaseCheckState,
    }) {
      this.version = version;
      this.build = build;
      this.bootGate = bootGate;
      this.connectionManager =
        connectionManager;
      this.matchmakingState =
        matchmakingState;
      this.pvpState = pvpState;
      this.recoveryState =
        recoveryState;
      this.telemetryTransport =
        telemetryTransport;
      this.releaseCheckState =
        releaseCheckState;
    }

    buildSnapshot() {
      const release =
        this.releaseCheckState
          ?.viewModel?.()
        || null;
      const recovery =
        this.recoveryState
          ?.viewModel?.()
        || {};

      return {
        schema_version: 1,
        version: this.version,
        build: this.build,
        server_boot_status:
          this.bootGate?.status
          || "unknown",
        websocket_status:
          this.connectionManager
            ?.status
          || "unknown",
        matchmaking_status:
          this.matchmakingState
            ?.matched
            ? "matched"
            : (
                this.matchmakingState
                  ?.queued
                  ? "queued"
                  : "idle"
              ),
        session_id:
          this.pvpState
            ?.sessionId
          || null,
        pvp_phase:
          this.pvpState
            ?.phase
          || "unknown",
        recovery_kind:
          recovery.kind
          || "none",
        recovery_active:
          Boolean(
            recovery.active
          ),
        telemetry_pending_count:
          this.telemetryTransport
            ?.pending?.size
          || 0,
        telemetry_status:
          this.telemetryTransport
            ?.status
          || "unknown",
        release_failed_checks:
          release
            ?.failedChecks
          ? [
              ...release
                .failedChecks
            ]
          : [],
      };
    }

    toJson() {
      return JSON.stringify(
        this.buildSnapshot(),
        null,
        2
      );
    }
  }



  class RelayWebTestRcReportState {
    constructor() {
      this.report = null;
    }

    apply(report) {
      if (!report) {
        throw new Error(
          "Web test RC raporu gerekli."
        );
      }

      this.report = {
        ...report,
        critical_failures: [
          ...(report.critical_failures || []),
        ],
        kpis: {
          ...(report.kpis || {}),
        },
      };

      return this.viewModel();
    }

    viewModel() {
      if (!this.report) {
        return null;
      }

      return {
        ready:
          Boolean(
            this.report.ready
          ),
        version:
          this.report.version,
        build:
          this.report.build,
        criticalFailures: [
          ...this.report
            .critical_failures,
        ],
        completedMatches:
          Number(
            this.report.kpis
              ?.completed_matches
            || 0
          ),
        secondMatchTransitionRate:
          Number(
            this.report.kpis
              ?.second_match_transition_rate
            || 0
          ),
        losingPlayerRematchRate:
          Number(
            this.report.kpis
              ?.losing_player_rematch_rate
            || 0
          ),
      };
    }
  }



  class RelayTestParticipantIdentity {
    constructor({
      storage = null,
      storageKey =
        "project-relay.web-test.participant-id",
      idFactory = null,
    } = {}) {
      this.storage =
        storage
        || (
          typeof localStorage
          !== "undefined"
            ? localStorage
            : null
        );
      this.storageKey =
        storageKey;
      this.idFactory =
        idFactory
        || (() => {
          if (
            typeof crypto
            !== "undefined"
            && typeof crypto.randomUUID
            === "function"
          ) {
            return crypto.randomUUID();
          }

          return (
            `${Date.now().toString(36)}-`
            + `${Math.random()
              .toString(36)
              .slice(2, 12)}`
          );
        });
      this.playerId = null;
    }

    getOrCreate() {
      if (this.playerId) {
        return this.playerId;
      }

      const stored =
        this._readStored();
      if (
        this._isValid(stored)
      ) {
        this.playerId = stored;
        return stored;
      }

      const rawId =
        String(
          this.idFactory()
        )
          .trim()
          .toLowerCase();

      const playerId =
        `wt-${rawId}`
          .replace(
            /[^a-z0-9_-]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .slice(0, 72);

      if (!this._isValid(playerId)) {
        throw new Error(
          "Web test katılımcı kimliği üretilemedi."
        );
      }

      this.playerId =
        playerId;
      this._writeStored(
        playerId
      );

      return playerId;
    }

    reset() {
      this.playerId = null;

      if (
        this.storage
        && typeof this.storage
          .removeItem
          === "function"
      ) {
        this.storage.removeItem(
          this.storageKey
        );
      }
    }

    _readStored() {
      if (
        !this.storage
        || typeof this.storage
          .getItem
          !== "function"
      ) {
        return null;
      }

      try {
        return this.storage
          .getItem(
            this.storageKey
          );
      } catch (_error) {
        return null;
      }
    }

    _writeStored(playerId) {
      if (
        !this.storage
        || typeof this.storage
          .setItem
          !== "function"
      ) {
        return;
      }

      try {
        this.storage.setItem(
          this.storageKey,
          playerId
        );
      } catch (_error) {
        // Kimlik bellekte kullanılmaya devam eder.
      }
    }

    _isValid(value) {
      return (
        typeof value === "string"
        && /^wt-[a-z0-9_-]{6,69}$/
          .test(value)
      );
    }
  }



  const PARTICIPANT_BOOTSTRAP_STATUS =
    Object.freeze({
      IDLE: "idle",
      LOADING: "loading",
      READY: "ready",
      ERROR: "error",
    });

  class RelayParticipantBootstrap {
    constructor({
      playerId,
      profileState,
      statisticsState,
      settingsState,
      requestJson = null,
    }) {
      this.playerId = playerId;
      this.profileState = profileState;
      this.statisticsState =
        statisticsState;
      this.settingsState =
        settingsState;
      this.requestJson =
        requestJson
        || (async (path, options = {}) => {
          const response =
            await fetch(
              path,
              {
                method:
                  options.method
                  || "POST",
                headers: {
                  "content-type":
                    "application/json",
                },
              }
            );

          if (!response.ok) {
            throw new Error(
              `Katılımcı bootstrap başarısız: ${response.status}`
            );
          }

          return response.json();
        });

      this.status =
        PARTICIPANT_BOOTSTRAP_STATUS.IDLE;
      this.lastError = null;
      this.payload = null;
    }

    async load() {
      this.status =
        PARTICIPANT_BOOTSTRAP_STATUS.LOADING;
      this.lastError = null;

      try {
        const payload =
          await this.requestJson(
            `/participants/${encodeURIComponent(this.playerId)}/bootstrap`,
            {
              method: "POST",
            }
          );

        this.profileState
          .applyProfile(
            payload.profile
          );
        this.statisticsState
          .applyStatistics(
            payload.statistics
          );
        this.settingsState
          .applySettings(
            payload.settings
          );

        this.payload = {
          ...payload,
        };
        this.status =
          PARTICIPANT_BOOTSTRAP_STATUS.READY;

        return {
          ok: true,
          payload:
            this.payload,
        };
      } catch (error) {
        this.lastError =
          error instanceof Error
            ? error.message
            : String(error);
        this.status =
          PARTICIPANT_BOOTSTRAP_STATUS.ERROR;

        return {
          ok: false,
          reason:
            this.lastError,
        };
      }
    }
  }




  class RelayLaunchReadinessState {
    constructor() {
      this.value = null;
      this.status = "unknown";
    }

    apply(value) {
      this.value = {
        ...(value || {}),
      };
      this.status =
        this.value.launch_ready
          ? "ready"
          : "blocked";

      return this.viewModel();
    }

    isReady() {
      return (
        this.status === "ready"
      );
    }

    viewModel() {
      return {
        status:this.status,
        ready:this.isReady(),
        failedChecks:
          Array.isArray(
            this.value?.failed_checks
          )
            ? [...this.value.failed_checks]
            : [],
        testRunId:
          this.value?.test_run_id
          || null,
        insufficientSignalCount:
          Number(
            this.value
              ?.behavior_insufficient_signal_count
            || 0
          ),
      };
    }
  }


  class RelayPlayReadinessGate {
    constructor({
      serverBootGate,
      participantBootstrap,
      participantContinuity = null,
      launchReadinessState = null,
    }) {
      this.serverBootGate =
        serverBootGate;
      this.participantBootstrap =
        participantBootstrap;
      this.participantContinuity =
        participantContinuity;
      this.launchReadinessState =
        launchReadinessState;
    }

    canPlay() {
      const continuityReady =
        !this.participantContinuity
        || this.participantContinuity
          .isVerified();

      const launchReady =
        !this.launchReadinessState
        || this.launchReadinessState
          .isReady();

      return Boolean(
        this.serverBootGate
          ?.canPlay?.()
      ) && (
        this.participantBootstrap
          ?.status
        === "ready"
      ) && continuityReady
        && launchReady;
    }

    blockers() {
      const blockers = [];

      if (
        !this.serverBootGate
          ?.canPlay?.()
      ) {
        blockers.push(
          "server"
        );
      }

      if (
        this.participantBootstrap
          ?.status
        !== "ready"
      ) {
        blockers.push(
          "participant"
        );
      }

      if (
        this.participantContinuity
        && !this.participantContinuity
          .isVerified()
      ) {
        blockers.push(
          "continuity"
        );
      }

      if (
        this.launchReadinessState
        && !this.launchReadinessState
          .isReady()
      ) {
        blockers.push(
          "launch"
        );
      }

      return blockers;
    }

    labelTr() {
      if (this.canPlay()) {
        return "Oyna: Hazır";
      }

      const blockers =
        this.blockers();

      if (
        blockers.includes("server")
        && blockers.includes(
          "participant"
        )
      ) {
        return "Oyna: Sunucu ve hesap hazırlanıyor";
      }

      if (
        blockers.includes(
          "continuity"
        )
      ) {
        return "Oyna: Katılımcı kimliği doğrulanıyor";
      }

      if (
        blockers.includes("launch")
      ) {
        return "Oyna: Web test çıkış onayı bekleniyor";
      }

      if (
        blockers.includes("server")
      ) {
        return "Oyna: Sunucu bekleniyor";
      }

      return "Oyna: Hesap hazırlanıyor";
    }
  }



  const PARTICIPANT_CONTINUITY_STATUS =
    Object.freeze({
      UNKNOWN: "unknown",
      VERIFIED: "verified",
      MISMATCH: "mismatch",
    });

  class RelayParticipantContinuityState {
    constructor({
      expectedPlayerId,
    }) {
      this.expectedPlayerId =
        expectedPlayerId;
      this.status =
        PARTICIPANT_CONTINUITY_STATUS.UNKNOWN;
      this.lastPlayerId = null;
    }

    verify(payload) {
      const returnedPlayerId =
        payload?.identity?.player_id
        || payload?.player_id
        || null;

      this.lastPlayerId =
        returnedPlayerId;

      const ok =
        returnedPlayerId
        === this.expectedPlayerId;

      this.status = ok
        ? PARTICIPANT_CONTINUITY_STATUS.VERIFIED
        : PARTICIPANT_CONTINUITY_STATUS.MISMATCH;

      return {
        ok,
        expectedPlayerId:
          this.expectedPlayerId,
        returnedPlayerId,
      };
    }

    isVerified() {
      return (
        this.status
        === PARTICIPANT_CONTINUITY_STATUS.VERIFIED
      );
    }
  }



  class RelayWebTestGoNoGoState {
    constructor() {
      this.value = null;
    }

    apply(value) {
      if (!value) {
        throw new Error(
          "Web test Go/No-Go özeti gerekli."
        );
      }

      this.value = {
        ...value,
        behavior_signals: {
          ...(value.behavior_signals || {}),
        },
      };

      return this.viewModel();
    }

    viewModel() {
      if (!this.value) {
        return null;
      }

      const signals =
        this.value.behavior_signals
        || {};
      const insufficient =
        Object.values(signals)
          .filter(
            (item) =>
              item?.status
              === "insufficient_data"
          )
          .length;

      return {
        decision:
          this.value.decision
          || "NO_GO",
        technicalReady:
          Boolean(
            this.value.technical_ready
          ),
        insufficientSignalCount:
          insufficient,
        minimumBehaviorSample:
          Number(
            this.value
              .minimum_behavior_sample
            || 0
          ),
      };
    }
  }



  class RelayTestRunConsistencyState {
    constructor() {
      this.expectedTestRunId = null;
      this.auditTestRunId = null;
      this.status = "unknown";
    }

    setExpected(testRunId) {
      this.expectedTestRunId =
        String(
          testRunId || ""
        ).trim() || null;
      return this._evaluate();
    }

    applyAudit(testRunId) {
      this.auditTestRunId =
        String(
          testRunId || ""
        ).trim() || null;
      return this._evaluate();
    }

    _evaluate() {
      if (
        !this.expectedTestRunId
        || !this.auditTestRunId
      ) {
        this.status = "unknown";
        return {
          ok: false,
          status:
            this.status,
        };
      }

      const ok =
        this.expectedTestRunId
        === this.auditTestRunId;

      this.status = ok
        ? "verified"
        : "mismatch";

      return {
        ok,
        status:
          this.status,
        expectedTestRunId:
          this.expectedTestRunId,
        auditTestRunId:
          this.auditTestRunId,
      };
    }

    isVerified() {
      return (
        this.status
        === "verified"
      );
    }
  }



  class RelayRcCandidateState {
    constructor() {
      this.value = null;
    }

    apply(value) {
      if (!value) {
        throw new Error(
          "RC aday özeti gerekli."
        );
      }

      this.value = {
        ...value,
      };

      return this.viewModel();
    }

    viewModel() {
      if (!this.value) {
        return null;
      }

      return {
        ready:
          Boolean(
            this.value.rc_candidate
          ),
        decision:
          this.value.decision
          || "NO_GO",
        testRunId:
          this.value.test_run_id
          || null,
        lifecycleState:
          this.value.test_run
            ?.lifecycle_state
          || "empty",
        insufficientSignalCount:
          Number(
            this.value.behavior
              ?.insufficient_signal_count
            || 0
          ),
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
    RelayPlayerDataSnapshotState,
    RelayTelemetryDispatcher,
    RelayWebTestBuildState,
    RelayOnlinePlayCoordinator,
    RelayPostMatchSync,
    RelayAccountDataLoader,
    RelayWebTestKpiState,
    RelayTelemetryHttpTransport,
    RelayReleaseCheckState,
    RelayPlayRecoveryState,
    RelayServerBootGate,
    RelayDiagnosticSnapshot,
    RelayWebTestRcReportState,
    RelayWebTestGoNoGoState,
    RelayTestRunConsistencyState,
    RelayRcCandidateState,
    RelayLaunchReadinessState,
    RelayTestParticipantIdentity,
    RelayParticipantBootstrap,
    RelayPlayReadinessGate,
    RelayParticipantContinuityState,
    BattlePoolSelection,
    APP_SCREEN,
    WS_CONNECTION_STATUS,
    TELEMETRY_EVENT_TYPE,
    ONLINE_PLAY_STATUS,
    REMOTE_DATA_STATUS,
    TELEMETRY_TRANSPORT_STATUS,
    PLAY_RECOVERY_KIND,
    SERVER_BOOT_STATUS,
    PARTICIPANT_BOOTSTRAP_STATUS,
    PARTICIPANT_CONTINUITY_STATUS,
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
  global.RelayPlayerDataSnapshotState = RelayPlayerDataSnapshotState;
  global.RelayTelemetryDispatcher = RelayTelemetryDispatcher;
  global.RelayWebTestBuildState = RelayWebTestBuildState;
  global.RelayOnlinePlayCoordinator = RelayOnlinePlayCoordinator;
  global.RelayPostMatchSync = RelayPostMatchSync;
  global.RelayAccountDataLoader = RelayAccountDataLoader;
  global.RelayWebTestKpiState = RelayWebTestKpiState;
  global.RelayTelemetryHttpTransport = RelayTelemetryHttpTransport;
  global.RelayReleaseCheckState = RelayReleaseCheckState;
  global.RelayPlayRecoveryState = RelayPlayRecoveryState;
  global.RelayServerBootGate = RelayServerBootGate;
  global.RelayDiagnosticSnapshot = RelayDiagnosticSnapshot;
  global.RelayWebTestRcReportState = RelayWebTestRcReportState;
  global.RelayWebTestGoNoGoState = RelayWebTestGoNoGoState;
  global.RelayTestRunConsistencyState = RelayTestRunConsistencyState;
  global.RelayRcCandidateState = RelayRcCandidateState;
  global.RelayLaunchReadinessState = RelayLaunchReadinessState;
  global.RelayTestParticipantIdentity = RelayTestParticipantIdentity;
  global.RelayParticipantBootstrap = RelayParticipantBootstrap;
  global.RelayPlayReadinessGate = RelayPlayReadinessGate;
  global.RelayParticipantContinuityState = RelayParticipantContinuityState;
  global.RelayParticipantContinuityStatus = PARTICIPANT_CONTINUITY_STATUS;
  global.RelayParticipantBootstrapStatus = PARTICIPANT_BOOTSTRAP_STATUS;
  global.RelayServerBootStatus = SERVER_BOOT_STATUS;
  global.RelayPlayRecoveryKind = PLAY_RECOVERY_KIND;
  global.RelayTelemetryTransportStatus = TELEMETRY_TRANSPORT_STATUS;
  global.RelayRemoteDataStatus = REMOTE_DATA_STATUS;
  global.RelayOnlinePlayStatus = ONLINE_PLAY_STATUS;
  global.RelayTelemetryEventType = TELEMETRY_EVENT_TYPE;
  global.RelayAppScreen = APP_SCREEN;
  global.RelayWebSocketStatus = WS_CONNECTION_STATUS;
  global.RelayPvPPhase = PVP_PHASE;
  global.BattlePoolSelection = BattlePoolSelection;
  global.RelayModuleStatus = MODULE_STATUS;
})(typeof globalThis !== "undefined" ? globalThis : window);
