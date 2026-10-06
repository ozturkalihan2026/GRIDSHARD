(function (global) {
  "use strict";

  const MODULE_STATUS = Object.freeze({
    RESERVE: "reserve",
    ACTIVE: "active",
    DESTROYED: "destroyed",
  });

  // Çekirdek + 14 hücre; kartlar sunucuda rastgele boş hücreye yerleşir.
  const MAX_ACTIVE_MODULES = 15;

  class BattlePoolSelection {
    constructor({
      selectableModuleIds,
      requiredSize = 6,
      attackModuleIds = [],
    }) {
      this.selectableModuleIds = [...selectableModuleIds];
      this.requiredSize = requiredSize;
      // Sabotaj Çekirdeği hedefleyemez; destede en az bir saldırı kartı olmalı.
      this.attackModuleIds = new Set(attackModuleIds);
      this.selected = new Set();
    }

    hasAttackCard(moduleIds = this.selected) {
      if (this.attackModuleIds.size === 0) {
        return true;
      }
      return [...moduleIds].some(
        (moduleId) => this.attackModuleIds.has(moduleId)
      );
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

    setSelection(moduleIds) {
      const candidate=new Set(
        moduleIds || []
      );

      for (
        const moduleId
        of candidate
      ) {
        if (
          !this.selectableModuleIds
            .includes(moduleId)
        ) {
          return {
            ok:false,
            reason:
              "Hazır havuz global oyuncu havuzunda bulunmayan modül içeriyor.",
          };
        }
      }

      if (
        candidate.size
        !== this.requiredSize
      ) {
        return {
          ok:false,
          reason:
            `Hazır havuz tam ${this.requiredSize} modül içermelidir.`,
        };
      }

      if (!this.hasAttackCard(candidate)) {
        return {
          ok:false,
          reason:
            "Destede en az bir saldırı kartı olmalı.",
        };
      }

      this.selected=candidate;
      return {
        ok:true,
        selected:
          this.selectedIds(),
      };
    }

    isComplete() {
      return (
        this.selected.size === this.requiredSize
        && this.hasAttackCard()
      );
    }

    selectedIds() {
      return [...this.selected];
    }
  }

  class RelayBattleClient {
    constructor({ modules, circuitCredits = 0, emitCommand }) {
      this.emitCommand = emitCommand;
      this.elapsedMs = 0;
      this.circuitCredits = Math.max(0, Math.floor(circuitCredits));
      this.pendingDeployments = 0;
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

    maxActiveModules() {
      return MAX_ACTIVE_MODULES;
    }

    activeModuleCount() {
      let count = 0;
      for (const module of this.modules.values()) {
        if (module.status === MODULE_STATUS.ACTIVE) count += 1;
      }
      return count;
    }

    pendingPlacementCount() {
      return this.pendingDeployments;
    }

    clearPendingPlacements() {
      this.pendingDeployments = 0;
    }

    deployDefinition(
      definitionId,
      currentCost = 0
    ) {
      const cleanDefinitionId = String(definitionId || "").trim();
      if (!cleanDefinitionId) {
        return { ok: false, reason: "Yerleştirilecek deste kartı seçilmedi." };
      }
      const activeCount = this.activeModuleCount() + this.pendingPlacementCount();
      if (activeCount >= MAX_ACTIVE_MODULES) {
        return { ok: false, reason: `Devre dolu: ${activeCount}/${MAX_ACTIVE_MODULES}.` };
      }
      const cost = Math.max(1, Math.floor(Number(currentCost) || 0) - (this.currentDiscountRemaining > 0 ? 1 : 0));
      if (this.circuitCredits < cost) {
        return {
          ok: false,
          reason: `Yetersiz Akım: gerekli ${cost}, mevcut ${this.circuitCredits}.`,
        };
      }
      const command = {
        kind: "deploy_module",
        payload: {
          definition_id:cleanDefinitionId,
        },
      };
      this.pendingDeployments += 1;
      this.emitCommand(command);
      return { ok: true, command };
    }

    registerModule(module) {
      if (!module?.instanceId) {
        throw new Error("Modül örnek kimliği zorunludur.");
      }
      this.modules.set(module.instanceId, {
        ...module,
        status: module.status || MODULE_STATUS.RESERVE,
        position: module.position || null,
      });
      return this.modules.get(module.instanceId);
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

    reset() {
      this.sessionId = null;
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
      return this.phase;
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
            isPowered: serverModule.is_powered,
            powerReason: serverModule.power_reason,
            energyReceived:
              serverModule.energy_received,
            energyRequired:
              serverModule.energy_required,
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
        "Sezon",
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
        engagement: profile.engagement
          ? {
              ...profile.engagement,
              daily_missions: [
                ...(profile.engagement.daily_missions || []),
              ],
              reward_track: [
                ...(profile.engagement.reward_track || []),
              ],
              unlocked_titles: [
                ...(profile.engagement.unlocked_titles || []),
              ],
              daily_login: profile.engagement.daily_login
                ? {
                    ...profile.engagement.daily_login,
                    claimed_days: [
                      ...(profile.engagement.daily_login.claimed_days || []),
                    ],
                    rewards: [
                      ...(profile.engagement.daily_login.rewards || []),
                    ],
                  }
                : null,
            }
          : null,
        cosmetics: {
          selected_avatar_id: "default",
          selected_avatar_frame_id: "none",
          unlocked_avatar_ids: ["default"],
          unlocked_avatar_frame_ids: ["none"],
          ...(profile.cosmetics || {}),
        },
        season_summary: {
          ...(profile.season_summary || {}),
        },
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
        teamId: this.profile.team_id || null,
        teamName: this.profile.team_name || null,
        highestRating: Math.max(
          Number(this.profile.rating || 0),
          Number(this.profile.highest_rating || 0)
        ),
        leagueNameTr: this.profile.league_name_tr,
        operatorTitle: this.profile.operator_title || "Devre Çırağı",
        operatorTitleProgression: this.profile.operator_title_progression || null,
        cosmetics: {
          ...this.profile.cosmetics,
          unlockedAvatarIds: [
            ...(this.profile.cosmetics?.unlocked_avatar_ids || ["default"]),
          ],
          unlockedAvatarFrameIds: [
            ...(this.profile.cosmetics?.unlocked_avatar_frame_ids || ["none"]),
          ],
          unlockedBattleEmojiIds: [
            ...(this.profile.cosmetics?.unlocked_battle_emoji_ids || ["none"]),
          ],
          unlockedProfileBackgroundIds: [
            ...(this.profile.cosmetics?.unlocked_profile_background_ids || ["default"]),
          ],
          unlockedBadgeIds: [
            ...(this.profile.cosmetics?.unlocked_badge_ids || []),
          ],
          unlockedRankTrophyIds: [
            ...(this.profile.cosmetics?.unlocked_rank_trophy_ids || []),
          ],
        },
        seasonSummary: {
          ...this.profile.season_summary,
        },
        battlePoolIds: [
          ...this.profile.preferred_battle_pool_ids,
        ],
        engagement: this.profile.engagement
          ? {
              ...this.profile.engagement,
              dailyMissions: [
                ...(this.profile.engagement.daily_missions || []),
              ],
              rewardTrack: [
                ...(this.profile.engagement.reward_track || []),
              ],
              premiumRewardTrack: [
                ...(this.profile.engagement.premium_reward_track || []),
              ],
              unlockedTitles: [
                ...(this.profile.engagement.unlocked_titles || []),
              ],
            }
          : null,
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
        soundMuted:
          Boolean(
            this.settings.sound_muted
          ),
        musicMuted:
          Boolean(
            this.settings.music_muted
          ),
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
        analyticsConsent:
          this.settings.analytics_consent === true,
        // Analitiği açmadan önce doğum yılı sorulur; karar sunucudadır.
        // "adult": soru yanıtlandı, izin serbestçe açılıp kapanır.
        // "minor": sorulduğu takvim yılı boyunca açılamaz.
        analyticsAgeGate:
          ["adult", "minor"].includes(this.settings.analytics_age_gate)
            ? this.settings.analytics_age_gate
            : "",
        analyticsAgeAskedYear:
          Number(this.settings.analytics_age_asked_year) || 0,
      };
    }
  }



  const APP_SCREEN = Object.freeze({
    MENU: "menu",
    SHOP: "shop",
    MODULES: "modules",
    TEAM: "team",
    EVENTS: "events",
    WEEKLY_EVENT: "weekly-event",
    TEAM_EVENT: "team-event",
    PLAY: "play",
    PROFILE: "profile",
    AVATAR: "avatar",
    FRIENDS: "friends",
    DAILY: "daily",
    DAILY_REWARDS: "daily-rewards",
    DAILY_MISSIONS: "daily-missions",
    REWARDS: "rewards",
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
        if (this.socket !== socket || this.manualClose) return;
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
        if (this.socket !== socket || this.manualClose) return;
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
        if (this.socket !== socket) return;
        if (!this.manualClose) {
          this._setStatus(
            WS_CONNECTION_STATUS.ERROR
          );
        }
      };

      socket.onclose = (event = {}) => {
        if (this.socket !== socket) return;
        this._clearHeartbeatTimer();

        if (this.pvpState.phase === PVP_PHASE.FINISHED) {
          this.socket = null;
          this._clearReconnectTimer();
          this._setStatus(
            WS_CONNECTION_STATUS.CLOSED
          );
          return;
        }

        if (this.manualClose) {
          this._setStatus(
            WS_CONNECTION_STATUS.CLOSED
          );
          return;
        }

        if ([4401, 4403, 4404].includes(event.code)) {
          this.socket = null;
          this.outgoingQueue = [];
          this._clearReconnectTimer();
          this.pvpState.connected = false;
          this.pvpState.phase = PVP_PHASE.ERROR;
          this.pvpState.lastError = event.code === 4404
            ? "Savaş oturumu sona erdi. Ana ekrandan yeni bir maç başlatabilirsin."
            : "Oturum doğrulanamadı. Yeniden giriş yapmalısın.";
          this._setStatus(WS_CONNECTION_STATUS.ERROR);
          this.onMessageApplied?.({type:"error", payload:{code:"session_closed", message:this.pvpState.lastError}}, {ok:false, reason:this.pvpState.lastError});
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
      this.opponentType = null;
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
        this.opponentType = response.opponent_type || "human";
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
          opponent_type:
            status.opponent_type,
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

    reset() {
      this.queued = false;
      this.matched = false;
      this.sessionId = null;
      this.players = [];
      this.ratingDifference = null;
      this.opponentType = null;
      this.queue = null;
      return this.viewModel();
    }

    viewModel() {
      return {
        queued: this.queued,
        matched: this.matched,
        sessionId: this.sessionId,
        players: [...this.players],
        ratingDifference:
          this.ratingDifference,
        opponentType:
          this.opponentType,
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
        circuitCreditsAwarded:
          Number(result.circuit_credits_awarded || 0),
        xpAwarded:
          result.xp_awarded,
        levelAfter:
          result.level_after,
        experienceAfter:
          result.experience_after,
        matchType: result.match_type,
        matchLabelTr: result.match_label_tr,
        rankedEligible: Boolean(result.ranked_eligible),
        profileProgressionApplied:
          result.profile_progression_applied !== false,
        teamTournamentPointsAwarded:
          Number(result.team_tournament_points_awarded || 0),
        teamTournamentPointsAfter:
          Number(result.team_tournament_points_after || 0),
        tierAdvanced: result.tier_advanced || null,
        battlePremiumApplied: Boolean(result.battle_premium_applied),
      };
    }

    clear() {
      this.lastResult = null;
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
    CIRCUIT_CREDIT_SPENT: "circuit_credit_spent",
    REMATCH_REQUESTED: "rematch_requested",
    LOCAL_BATTLE_STARTED: "local_battle_started",
    LOCAL_BATTLE_COMPLETED: "local_battle_completed",
    LOCAL_AI_HIT: "local_ai_hit",
    LOCAL_PLAYER_ATTACK: "local_player_attack",
    BATTLE_PERFORMANCE: "battle_performance",
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

    trackLocalBattleStarted(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.LOCAL_BATTLE_STARTED,
        metadata
      );
    }

    trackLocalBattleCompleted(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.LOCAL_BATTLE_COMPLETED,
        metadata
      );
    }

    trackLocalAiHit(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.LOCAL_AI_HIT,
        metadata
      );
    }

    trackLocalPlayerAttack(metadata = {}) {
      return this.track(
        TELEMETRY_EVENT_TYPE.LOCAL_PLAYER_ATTACK,
        metadata
      );
    }

    drain() {
      const events = [...this.buffer];
      this.buffer.length = 0;
      return events;
    }
  }





  class RelayServerHealthState {
    constructor() {
      this.status = "unknown";
      this.version = null;
      this.protocolVersion = null;
      this.ready = false;
    }

    applyHealth(health) {
      if (!health || typeof health !== "object") {
        this.status = "error";
        this.ready = false;
        return {
          ok: false,
          reason: "Sunucu sağlık bilgisi bulunamadı.",
        };
      }

      this.version = health.version || null;
      this.protocolVersion =
        health.pvp_protocol_version ?? null;
      this.ready = health.status === "ok";
      this.status = this.ready ? "ready" : "blocked";

      return {
        ok: true,
        ready: this.ready,
      };
    }

    labelTr() {
      if (this.status === "ready") {
        return "Sunucu: Hazır";
      }
      if (this.status === "blocked") {
        return "Sunucu: Kalıcılık sorunu";
      }
      if (this.status === "error") {
        return "Sunucu: Sağlık hatası";
      }
      return "Sunucu: Kontrol bekliyor";
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
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          try {
            const response = await fetch(path, {
              ...options,
              cache: "no-store",
              signal: controller.signal,
              headers: {
                "content-type":
                  "application/json",
                ...(options.headers || {}),
              },
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(typeof payload.detail === "string" ? payload.detail : `Sunucu isteği başarısız: ${response.status}`);
            }
            return payload;
          } catch (error) {
            if (error.name === "AbortError") {
              const timeoutError = new Error("Eşleştirme sunucusu hazırlanıyor; bağlantı sorgulanmaya devam ediyor.");
              timeoutError.code = "matchmaking_request_timeout";
              throw timeoutError;
            }
            throw error;
          } finally {
            clearTimeout(timeout);
          }
        });

      this.webSocketUrlFactory =
        webSocketUrlFactory
        || ((sessionId, websocketBaseUrl = null) => {
          if (
            typeof window
            === "undefined"
            || !window.location
          ) {
            throw new Error(
              "Tarayıcı WebSocket adresi oluşturulamadı."
            );
          }

          const apiBase = websocketBaseUrl
            ? new URL(websocketBaseUrl, window.location.href)
            : globalThis.GridshardAuth?.apiBaseUrl
              ? new URL(globalThis.GridshardAuth.apiBaseUrl)
              : window.location;
          const scheme =
            apiBase.protocol === "https:"
            || apiBase.protocol === "wss:"
              ? "wss"
              : "ws";

          const basePath = websocketBaseUrl
            ? apiBase.pathname.replace(/\/$/, "")
            : "";

          return (
            `${scheme}://${apiBase.host}${basePath}`
            + `/ws/pvp/${encodeURIComponent(sessionId)}`
            + `?player_id=${encodeURIComponent(this.playerId)}`
            + `&access_token=${encodeURIComponent(
              globalThis.GridshardAuth?.session
                ?.accessTokenFor(this.playerId)
              || ""
            )}`
          );
        });

      this.status =
        ONLINE_PLAY_STATUS.IDLE;
      this.pollTimer = null;
      this.readyTimer = null;
      this.pendingSetup = null;
      // Eğitim maçında sunucunun bildirdiği deste (tanım kimlikleri); diğer
      // maçlarda null. Raf bu maç boyunca bu desteyi gösterir.
      this.tutorialDeckIds = null;
      this.lastError = null;
      this.attemptId = 0;
      this.cancelRequest = null;
    }

    async start({
      battlePoolIds,
      initialModules,
      tutorial = false,
    }) {
      if (
        !Array.isArray(battlePoolIds)
        || battlePoolIds.length !== 6
      ) {
        throw new Error(
          "Online maç için tam 6 kartlık deste gerekli."
        );
      }

      if (
        !Array.isArray(initialModules)
        || initialModules.length !== 1
      ) {
        throw new Error(
          "Maç başlangıcında merkezde yalnız Çekirdek olmalı."
        );
      }

      const attemptId = ++this.attemptId;
      this._clearPoll();
      this._clearReadyTimeout();
      this.connectionManager.disconnect?.();
      this.connectionManager.clearOutgoingQueue();
      this.matchmakingState.reset();
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
      this.tutorialDeckIds = null;

      this.lastError = null;

      try {
        this._setStatus(ONLINE_PLAY_STATUS.MATCHMAKING);
        // A new attempt may be requested immediately after the user cancels.
        // Wait for that DELETE only inside the new attempt so the UI can return
        // to its ready state at once without letting a late delete cancel it.
        const pendingCancel = this.cancelRequest;
        if (pendingCancel) {
          await pendingCancel;
          if (attemptId !== this.attemptId) return { ok: false, cancelled: true };
        }
        const response =
          await this.requestJson(
            "/matchmaking/join",
            {
              method: "POST",
              body: JSON.stringify({
                player_id:
                  this.playerId,
                // İlk oyun deneyimi: yönetmenli ilk savaş isteği.
                ...(tutorial ? { tutorial: true } : {}),
              }),
            }
          );

        if (attemptId !== this.attemptId) return { ok: false, cancelled: true };
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
        if (attemptId !== this.attemptId) return { ok: false, cancelled: true };
        if (["matchmaking_request_timeout", "request_timeout"].includes(error?.code)) {
          // The server may have accepted the join and still be provisioning the
          // AI battle. Keep the full-screen matching state and discover that
          // session through the idempotent status endpoint.
          this._setStatus(ONLINE_PLAY_STATUS.MATCHMAKING);
          this._schedulePoll();
          return { ok: true, matched: false, pending: true };
        }
        this._fail(error);
        return {
          ok: false,
          reason:
            this.lastError,
        };
      }
    }

    connectSession(
      response,
      {
        battlePoolIds,
        initialModules,
      }
    ) {
      if (!Array.isArray(battlePoolIds) || battlePoolIds.length !== 6) {
        throw new Error("Özel savaş için tam 6 kartlık deste gerekli.");
      }
      if (!Array.isArray(initialModules) || initialModules.length !== 1) {
        throw new Error("Özel savaş başlangıcında merkezde yalnız Çekirdek olmalı.");
      }
      this.attemptId += 1;
      this._clearPoll();
      this._clearReadyTimeout();
      this.connectionManager.disconnect?.();
      this.connectionManager.clearOutgoingQueue();
      this.matchmakingState.reset();
      this.pendingSetup = {
        battlePoolIds:[...battlePoolIds],
        initialModules:initialModules.map((module) => ({ ...module })),
      };
      this.lastError = null;
      return this._activateMatch({
        matched:true,
        opponent_type:"human",
        ...response,
      });
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

      const attemptId = this.attemptId;
      try {
        const status =
          await this.requestJson(
            `/matchmaking/${encodeURIComponent(this.playerId)}`
          );

        if (attemptId !== this.attemptId) return { ok: false, cancelled: true };
        this.matchmakingState
          .applyQueueStatus(
            status
          );

        if (status.matched) {
          return this._activateMatch(
            status
          );
        }

        if (!status.queued) {
          throw new Error("Eşleştirme kuyruğu sona erdi. Savaş düğmesiyle tekrar deneyebilirsin.");
        }
        this._setStatus(ONLINE_PLAY_STATUS.MATCHMAKING);
        this._schedulePoll();

        return {
          ok: true,
          matched: false,
        };
      } catch (error) {
        if (attemptId !== this.attemptId) return { ok: false, cancelled: true };
        if (["matchmaking_request_timeout", "request_timeout"].includes(error?.code)) {
          this._setStatus(ONLINE_PLAY_STATUS.MATCHMAKING);
          this._schedulePoll();
          return { ok: true, matched: false, pending: true };
        }
        this._fail(error);
        return {
          ok: false,
          reason:
            this.lastError,
        };
      }
    }

    async cancel() {
      this.attemptId += 1;
      this._clearPoll();
      this._clearReadyTimeout();
      this.connectionManager.disconnect?.();
      this.connectionManager.clearOutgoingQueue();
      this.matchmakingState.reset();
      this.pendingSetup = null;
      this.tutorialDeckIds = null;
      this._setStatus(ONLINE_PLAY_STATUS.CANCELLED);

      const cancelRequest = Promise.resolve().then(() => this.requestJson(
          `/matchmaking/${encodeURIComponent(this.playerId)}`,
          {
            method: "DELETE",
          }
        )).catch(() => null);
      this.cancelRequest = cancelRequest;
      cancelRequest.finally(() => {
        if (this.cancelRequest === cancelRequest) this.cancelRequest = null;
      });

      return {
        ok: true,
      };
    }

    reset() {
      this.attemptId += 1;
      this._clearPoll();
      this._clearReadyTimeout();
      this.connectionManager.disconnect?.();
      this.connectionManager.clearOutgoingQueue();
      this.pendingSetup = null;
      this.tutorialDeckIds = null;
      this.lastError = null;
      this.matchmakingState.reset();
      this._setStatus(
        ONLINE_PLAY_STATUS.IDLE
      );
      return {
        ok: true,
        status: this.status,
      };
    }

    markBattleStarted() {
      this._clearReadyTimeout();
      this._setStatus(
        ONLINE_PLAY_STATUS.BATTLE
      );
    }

    failSetup(error) {
      if ([ONLINE_PLAY_STATUS.MATCHED, ONLINE_PLAY_STATUS.CONNECTING, ONLINE_PLAY_STATUS.READYING].includes(this.status)) {
        this._fail(error);
      }
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
      // Queue setup only after the previous session's socket is closed.
      this.connectionManager.disconnect?.();
      this.matchmakingState
        .applyJoinResponse({
          matched: true,
          session_id: sessionId,
          players:
            response.players || [],
          rating_difference:
            response.rating_difference,
          opponent_type:
            response.opponent_type,
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

      // Eğitim maçı (ilk oyun deneyimi yeniden başlatıldığında): oyuncu kendi
      // destesiyle değil sunucunun bildirdiği desteyle girer. Kayıtlı deste
      // değişmez; yalnız bu maçın kurulumu ve rafı etkilenir.
      const tutorialDeck = response.tutorial_deck;
      this.tutorialDeckIds =
        Array.isArray(tutorialDeck) && tutorialDeck.length === 6 && this.pendingSetup
          ? tutorialDeck.map(String)
          : null;
      if (this.tutorialDeckIds) {
        this.pendingSetup = {
          ...this.pendingSetup,
          battlePoolIds: [...this.tutorialDeckIds],
        };
      }

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
          sessionId,
          response.websocket_base_url || null
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
      this._clearReadyTimeout();
      this.readyTimer = this.setTimer(() => {
        this.readyTimer = null;
        this.failSetup(new Error("Savaş bağlantısı zamanında kurulamadı. Savaş düğmesiyle tekrar deneyebilirsin."));
      }, 15000);

      return {
        ok: true,
        matched: true,
        sessionId,
        webSocketUrl: wsUrl,
        opponentType:
          response.opponent_type || "human",
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

    _clearReadyTimeout() {
      if (this.readyTimer !== null) {
        this.clearTimer(this.readyTimer);
        this.readyTimer = null;
      }
    }

    _fail(error) {
      this.attemptId += 1;
      this._clearPoll();
      this._clearReadyTimeout();
      this.connectionManager.disconnect?.();
      this.connectionManager.clearOutgoingQueue();
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

    async claimEngagementReward(kind, id, requestId = null) {
      if (![
        "login",
        "missions",
        "tiers",
        "premium-tiers",
      ].includes(kind)) {
        return {
          ok: false,
          reason: "Bilinmeyen sezon ödülü.",
        };
      }

      this.status.profile = REMOTE_DATA_STATUS.LOADING;
      this.errors.profile = null;

      try {
        const payload = await this.requestJson(
          kind === "premium-tiers"
            ? `/profile/${encodeURIComponent(this.playerId)}/engagement/tiers/${encodeURIComponent(id)}/premium/claim`
            : `/profile/${encodeURIComponent(this.playerId)}/engagement/${kind}/${encodeURIComponent(id)}/claim`,
          {
            method: "POST",
            ...(requestId
              ? { body: JSON.stringify({ request_id: requestId }) }
              : {}),
          }
        );
        this.profileState.applyProfile(payload);
        this.status.profile = REMOTE_DATA_STATUS.READY;
        return { ok: true, payload };
      } catch (error) {
        this.status.profile = REMOTE_DATA_STATUS.ERROR;
        this.errors.profile = error instanceof Error
          ? error.message
          : String(error);
        return {
          ok: false,
          reason: this.errors.profile,
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
            const error = new Error(
              `Telemetri gönderimi başarısız: ${response.status}`
            );
            error.permanent = response.status >= 400
              && response.status < 500
              && ![408, 429].includes(response.status);
            throw error;
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
          try {
            await this.requestJson(event);
          } catch (error) {
            if (!error?.permanent) throw error;
          }
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
      expectedVersion = null,
      expectedProtocolVersion = 1,
      requestJson = null,
    }) {
      this.healthState = healthState;
      this.expectedVersion =
        expectedVersion;
      this.expectedProtocolVersion =
        expectedProtocolVersion;
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
    }

    async check() {
      this.status =
        SERVER_BOOT_STATUS.CHECKING;
      this.lastError = null;

      try {
        const health =
          await this.requestJson(
            "/health"
          );
        this.health = health;

        const healthResult =
          this.healthState
            .applyHealth(
              health
            );

        const versionMatches =
          !this.expectedVersion
          || health.version
          === this.expectedVersion;

        const protocolMatches =
          Number(
            health.pvp_protocol_version
          )
          === Number(
            this.expectedProtocolVersion
          );

        const ready =
          healthResult.ok
          && healthResult.ready
          && versionMatches
          && protocolMatches;

        if (!versionMatches) {
          this.lastError =
            `Sürüm uyuşmazlığı: istemci ${this.expectedVersion}, sunucu ${health.version}`;
        } else if (
          !protocolMatches
        ) {
          this.lastError =
            "PvP protokol sürümü uyuşmuyor.";
        } else if (!ready) {
          this.lastError =
            "Sunucu kalıcılık katmanı hazır değil.";
        }

        this.status = ready
          ? SERVER_BOOT_STATUS.READY
          : SERVER_BOOT_STATUS.BLOCKED;

        return {
          ok: ready,
          ready,
          health,
          versionMatches,
          protocolMatches,
          reason: this.lastError,
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







  class RelayTestParticipantIdentity {
    // Historical web-test name/prefix, now also used by real game accounts.
    // Keep persisted IDs unchanged: provider linking maps to this account and
    // must not replace it with a Google Play Games subject or discard progress.
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
          "Oyuncu kimliği üretilemedi."
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
        // Syntax only: review identities still need server device/token proof.
        && /^(?:wt-[a-z0-9_-]{6,69}|review-[0-9a-f]{32})$/
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





  class RelayPlayReadinessGate {
    constructor({
      serverBootGate,
      participantBootstrap,
      participantContinuity = null,
    }) {
      this.serverBootGate =
        serverBootGate;
      this.participantBootstrap =
        participantBootstrap;
      this.participantContinuity =
        participantContinuity;
    }

    canPlay() {
      const continuityReady =
        !this.participantContinuity
        || this.participantContinuity
          .isVerified();

      return Boolean(
        this.serverBootGate
          ?.canPlay?.()
      ) && (
        this.participantBootstrap
          ?.status
        === "ready"
      ) && continuityReady;
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
    RelayServerHealthState,
    RelayOnlinePlayCoordinator,
    RelayPostMatchSync,
    RelayAccountDataLoader,
    RelayTelemetryHttpTransport,
    RelayPlayRecoveryState,
    RelayServerBootGate,
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
    MAX_ACTIVE_MODULES,
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
  global.RelayServerHealthState = RelayServerHealthState;
  global.RelayOnlinePlayCoordinator = RelayOnlinePlayCoordinator;
  global.RelayPostMatchSync = RelayPostMatchSync;
  global.RelayAccountDataLoader = RelayAccountDataLoader;
  global.RelayTelemetryHttpTransport = RelayTelemetryHttpTransport;
  global.RelayPlayRecoveryState = RelayPlayRecoveryState;
  global.RelayServerBootGate = RelayServerBootGate;
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
