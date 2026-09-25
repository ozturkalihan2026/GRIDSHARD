(() => {
  "use strict";

  // Operational Web-test reporting is intentionally opt-in.  The player
  // client must not poll large QA snapshots or write audit files while normal
  // menu, matchmaking and progression requests are waiting for the server.
  const operationalDiagnosticsEnabled = (() => {
    try {
      return new URLSearchParams(globalThis.location?.search || "")
        .get("diagnostics") === "1";
    } catch (_error) {
      return false;
    }
  })();

  const moduleDefinitions = [
    { id: "core", name_tr: "Çekirdek", max_hp: 300, category: "çekirdek", current_cost: 0 },
    // Retain only the legacy instance handle for old diagnostic views.
    { id: "generator", name_tr: "Jeneratör", max_hp: 0, category: "enerji", current_cost: 0 },
    ...(Array.isArray(globalThis.GRIDSHARD_CANON_MODULES)
      ? globalThis.GRIDSHARD_CANON_MODULES
      : []),
  ].map(item => ({
    instanceId: item.id.replaceAll("_", "-") + "-1", definitionId: item.id,
    nameTr: item.name_tr, hp: item.max_hp, maxHp: item.max_hp,
    circuitCreditCost: item.current_cost, currentCost: item.current_cost,
    category: item.category === "sistem" ? "enerji" : item.category,
    strategicRole: item.name_tr, rarity: item.rarity,
    unlockTrophies: Math.max(0, (Number(item.unlock_arena || 1) - 1) * 300),
    status: item.id === "core" ? "active" : item.id === "generator" ? "destroyed" : "reserve",
    position: item.id === "core" ? {x: 2, y: 1} : null,
    isDeckTemplate: !["core", "generator"].includes(item.id),
    energyRequired: 0, energyReceived: 0, isPowered: true, storedEnergy: 0,
    movable: item.id !== "core",
    removable: !["core", "generator"].includes(item.id),
  }));

  const commandLog = [];
  const META_STATUS = "M1-M6 çekirdeği uygulandı";
  const COMPETITIVE_STATUS = "M7 rekabetçi altyapı doğrulanıyor";
  const BALANCE_STATUS = "Denge simülasyonu mevcut · geniş örnek bekliyor";
  const AI_STATUS = "5 AI arketipi aktif · oyuncu test telemetrisi toplanıyor";
  const PVP_STATUS = "GRIDSHARD Beta.39 · 6 Kartlık Deste + Sunucu Yerleşimi";



  const BOOSTER_FIRST_OFFER_MS = 30000;
  const BOOSTER_OFFER_INTERVAL_MS = 30000;
  const BOOSTER_OPTIONS_PER_OFFER = 3;
  let nextBoosterOfferIndex = 0;
  let boosterOfferOpen = false;
  let serverBoosterOfferId = null;
  let serverBoosterEligibleTargets = new Map();
  let activeBoosterOfferIds = new Set();

  const BOOSTER_OPTIONS = [
    { id:"overcharge_chip", nameTr:"Aşırı Yük Çipi", nameEn:"Overcharge Chip", descriptionTr:"+%25 saldırı · 15 sn", descriptionEn:"+25% attack · 15 sec", targetCategories:["saldırı"] },
    { id:"emergency_repair", nameTr:"Acil Onarım", nameEn:"Emergency Repair", descriptionTr:"%25 anlık onarım", descriptionEn:"25% instant repair", targetCategories:[] },
    { id:"cooling_burst", nameTr:"Soğutma Darbesi", nameEn:"Cooling Burst", descriptionTr:"Bir modülün ısısını sıfırlar", descriptionEn:"Resets a module's heat", targetCategories:[] },
    { id:"signal_cleanser", nameTr:"Sinyal Temizleyici", nameEn:"Signal Cleanser", descriptionTr:"Bir modüldeki anlık sabotaj etkilerini temizler", descriptionEn:"Cleanses active sabotage effects on a module", targetCategories:[] },
  ];
  const battleEventChannels =
    typeof GRIDSHARD_BATTLE_EVENT_CHANNELS === "object"
      ? GRIDSHARD_BATTLE_EVENT_CHANNELS
      : {
          GAME_EFFECT:"game_effect",
          AUDIO_STATE:"audio_state",
          BOOSTER_STATE:"booster_state",
        };
  const battleEventBus =
    typeof GridshardBattleEventBus === "function"
      ? new GridshardBattleEventBus()
      : null;
  const battleEffectAggregator =
    typeof GridshardBattleEffectAggregator === "function"
      ? new GridshardBattleEffectAggregator({
          windowMs:900,
          lifetimeMs:1200,
          maxLanes:6,
        })
      : null;
  const FLOATING_COMBAT_TEXT_ENABLED = true;
  const boosterTargetMode =
    typeof GridshardBoosterTargetMode === "function"
      ? new GridshardBoosterTargetMode()
      : {
          selectedBoosterId:null,
          handle(event) {
            const payload=event?.payload || event || {};
            this.selectedBoosterId = payload.action === "select"
              ? String(payload.boosterId || "") || null
              : null;
            return {
              active:Boolean(this.selectedBoosterId),
              selectedBoosterId:this.selectedBoosterId,
            };
          },
          snapshot() {
            return {
              active:Boolean(this.selectedBoosterId),
              selectedBoosterId:this.selectedBoosterId,
            };
          },
        };

  function emitBattleEvent(channel, payload={}) {
    return battleEventBus
      ? battleEventBus.emit(channel, payload)
      : { event:{ channel, payload, occurredAt:Date.now() }, results:[] };
  }

  function selectBoosterTargetMode(boosterId, reason="booster_selected") {
    const payload={
      action:"select",
      boosterId,
      reason,
    };
    const emitted=emitBattleEvent(
      battleEventChannels.BOOSTER_STATE,
      payload
    );
    if (!battleEventBus) {
      return boosterTargetMode.handle(payload);
    }
    return emitted.results[0] || boosterTargetMode.snapshot();
  }

  function clearBoosterTargetMode(reason="cancelled") {
    const payload={
      action:"cancel",
      reason,
    };
    const emitted=emitBattleEvent(
      battleEventChannels.BOOSTER_STATE,
      payload
    );
    if (!battleEventBus) {
      return boosterTargetMode.handle(payload);
    }
    return emitted.results[0] || boosterTargetMode.snapshot();
  }

  if (battleEventBus && battleEffectAggregator) {
    battleEventBus.subscribe(
      battleEventChannels.GAME_EFFECT,
      (event) => battleEffectAggregator.ingest(
        event.payload,
        event.occurredAt
      )
    );
  }
  if (battleEventBus) {
    battleEventBus.subscribe(
      battleEventChannels.BOOSTER_STATE,
      (event) => boosterTargetMode.handle(event)
    );
  }
  const selectablePoolModules = moduleDefinitions.filter(
    (module) => !["core-1", "generator-1"].includes(module.instanceId)
  );
  const moduleCatalogById =
    new Map();
  const POOL_CATEGORY_ORDER = [
    "enerji",
    "saldırı",
    "savunma",
    "destek",
    "sabotaj",
  ];
  const STARTER_BATTLE_POOL_PRESET = Object.freeze({
    name: "Başlangıç Devresi",
    module_definition_ids: Object.freeze([
      "laser", "shield", "repair", "cooler", "battery", "amplifier",
    ]),
    favorite: true,
    last_used_at_ms: null,
    use_count: 0,
    system: true,
  });
  const BUILT_IN_BATTLE_POOL_PRESETS = Object.freeze([
    STARTER_BATTLE_POOL_PRESET,
  ]);
  const LEGACY_BUILT_IN_BATTLE_POOL_PRESET_NAMES = new Set([
    "Enerji Dalgası",
    "Kırmızı Hat",
    "Mavi Duvar",
    "Yeşil Ağ",
    "Mor Kesinti",
    "Akış Ekonomisi",
  ]);

  function normalizeDeckDefinitionIds(moduleIds) {
    const selectable = new Set(
      selectablePoolModules.map((module) => module.definitionId)
    );
    const normalized = [];
    for (const moduleId of moduleIds || []) {
      const clean = String(moduleId || "");
      if (selectable.has(clean) && !normalized.includes(clean)) {
        normalized.push(clean);
      }
      if (normalized.length >= 6) break;
    }
    for (const moduleId of STARTER_BATTLE_POOL_PRESET.module_definition_ids) {
      if (normalized.length >= 6) break;
      if (!normalized.includes(moduleId)) normalized.push(moduleId);
    }
    return normalized;
  }

  function withStarterBattlePoolPresets(presets) {
    const savedByName = new Map((presets || []).map((preset) => [preset.name, preset]));
    return [
      ...BUILT_IN_BATTLE_POOL_PRESETS.map((preset) => ({
        ...preset,
        ...(savedByName.get(preset.name) || {}),
        module_definition_ids: normalizeDeckDefinitionIds(
          savedByName.get(preset.name)?.module_definition_ids || preset.module_definition_ids
        ),
        system: true,
      })),
      ...(presets || []).filter(
        (preset) => !BUILT_IN_BATTLE_POOL_PRESETS.some(
          (builtIn) => builtIn.name === preset.name
        ) && !LEGACY_BUILT_IN_BATTLE_POOL_PRESET_NAMES.has(preset.name)
      ).map((preset) => ({
        ...preset,
        module_definition_ids: normalizeDeckDefinitionIds(
          preset.module_definition_ids
        ),
      })),
    ];
  }
  const battlePoolSelection = new BattlePoolSelection({
    selectableModuleIds: selectablePoolModules.map((module) => module.instanceId),
    requiredSize: 6,
    requiredModuleIds: [],
  });
  battlePoolSelection.setSelection(
    definitionIdsToInstanceIds(
      STARTER_BATTLE_POOL_PRESET.module_definition_ids
    )
  );
  let focusedPoolModuleId =
    "battery-1";
  const collapsedPoolCategories = {
    global:new Set(),
    selected:new Set(),
  };
  const collapsedShelfCategories = new Set();
  let battlePoolPresets = withStarterBattlePoolPresets([]);
  let activeBattlePoolPresetName = STARTER_BATTLE_POOL_PRESET.name;
  let activeBattlePoolPresetBaseline = [];
  let quickLoadoutFilter = "all";
  let initialBattleModuleIds = [];

  const client = new RelayBattleClient({
    modules: moduleDefinitions,
    unlockAtMs: 0,
    circuitCredits: 6,
    emitCommand(command) {
      const pvpEnvelope =
        pvpState.sessionId
          ? buildPvPCommandEnvelope(command)
          : null;

      commandLog.push({
        atMs: client.elapsedMs,
        ...command,
        pvpEnvelope,
      });

      if (
        typeof pvpConnection !== "undefined"
        && pvpConnection.status === "open"
        && pvpEnvelope
      ) {
        pvpConnection.sendEnvelope(
          pvpEnvelope
        );
      } else if (
        activePlayMode === "local"
        && localServerAuthoritative
        && localServerSessionId
      ) {
        sendLocalServerCommand(
          command
        );
      } else {
        applyMockServerCommand(command);
      }

      renderLog();
    },
  });

  const gridshardE2eTimeScale =
    (
      typeof location !== "undefined"
      && new URLSearchParams(
        location.search
      ).get("e2e") === "1"
    )
      ? 25
      : 1;

  const participantIdentity =
    new RelayTestParticipantIdentity();
  const participantPlayerId =
    participantIdentity.getOrCreate();

  const pvpState = new RelayPvPClientState({
    playerId: participantPlayerId,
    sessionId: "local-preview",
    battleClient: client,
  });
  pvpState.markConnected();

  const profileState = new RelayProfileClientState();
  profileState.applyProfile({
    player_id: participantPlayerId,
    display_name: "Oyuncu",
    level: 1,
    experience: 0,
    experience_into_level: 0,
    experience_to_next_level: 1000,
    rating: 0,
    league_name_tr: "Arena 1",
    preferred_battle_pool_ids:
      battlePoolSelection.selectedIds(),
  });

  const statisticsState =
    new RelayStatisticsClientState();
  statisticsState.applyStatistics({
    player_id: participantPlayerId,
    total_matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_rate: 0,
    average_match_duration_ms: 0,
    total_damage_dealt: 0,
    module_replacements: 0,
    boosters_used: 0,
    most_used_modules: [],
  });

  const settingsState =
    new RelaySettingsClientState();
  settingsState.applySettings({
    player_id: participantPlayerId,
    sound_volume: 100,
    music_volume: 70,
    sound_muted: false,
    music_muted: false,
    vibration_enabled: true,
    graphics_quality: "yuksek",
    language: "tr",
    analytics_consent: false,
  });

  const participantContinuity =
    new RelayParticipantContinuityState({
      expectedPlayerId:
        participantPlayerId,
    });

  const participantBootstrap =
    new RelayParticipantBootstrap({
      playerId:
        participantPlayerId,
      profileState,
      statisticsState,
      settingsState,
      requestJson: requestJsonWithDeadline,
    });

  let participantBootstrapResult =
    null;

  async function bootstrapParticipant() {
    const result =
      await participantBootstrap
        .load();

    participantBootstrapResult =
      result;

    if (result.ok) {
      recordProductEvent("session_started");
      recordProductEvent("screen_view", {screen:appRouter.currentScreen});
      const preferredPoolIds = definitionIdsToInstanceIds(
        profileState.viewModel()?.battlePoolIds || []
      );
      const preferredPoolResult = battlePoolSelection.setSelection(
        preferredPoolIds
      );
      if (!preferredPoolResult.ok) {
        battlePoolSelection.setSelection(
          definitionIdsToInstanceIds(
            STARTER_BATTLE_POOL_PRESET.module_definition_ids
          )
        );
      }
      syncDeckEditorFromSelection();
      const continuity =
        participantContinuity
          .verify(
            result.payload
          );

      if (!continuity.ok) {
        showPlayError(
          "matchmaking",
          "Katılımcı kimliği sunucu hesabıyla eşleşmiyor. Oyna güvenlik amacıyla kapatıldı."
        );
      }

      renderProfileSummary();
      renderStatisticsSummary();
      renderSettingsForm();
      loadBattlePoolPresets();
      loadMetaProgression();
      const accountResult = await loadAccountPlatform({ presentOnboarding:true });
      if (accountResult.ok && !accountResult.redirecting) {
        void nativePush.start().catch(() => {
          setNativePushStatus("Bildirim cihaz kaydı tamamlanamadı. Bağlantı gelince yeniden denenecek.");
        });
      }
      if (!accountResult.presented) loadDailyMetaState({ present:true });
      loadRewardInbox();
      void consumePendingDeepLink();
    }

    renderParticipantBootstrapStatus();
    renderServerBootStatus();

    return result;
  }

  const accountDataLoader =
    new RelayAccountDataLoader({
      playerId:
        pvpState.playerId,
      profileState,
      statisticsState,
      settingsState,
      requestJson: requestJsonWithDeadline,
    });
  let selectedLaboratoryModuleId = "laser";
  let metaProgressionState = null;
  const pendingMetaRequests = new Map();
  let activeModuleFilter = "all";
  let selectedCollectionModuleId = "laser";
  let activeCardPage = "modules";
  let selectedCollectionCoreId = "core_resonance";
  let activeLeaderboardTab = "trophies";
  let activeTrophyLeaderboardScope = "general";
  let leaderboardPayload = null;
  let rewardInboxState = null;
  let publicProfileReturnDialogId = null;
  let teamProfileReturnDialogId = null;
  let teamState = null;
  let activeTeamTab = "profile";
  let activeTeamManagementTab = "cosmetics";
  let teamCosmeticDraft = null;
  let socialState = null;
  let activeFriendsTab = "friends";
  let pendingDeepLinkConsumed = false;
  let activePublicProfileId = null;
  let publicProfilePayload = null;
  let teamProfilePayload = null;
  let eventsState = null;
  let dailyMetaState = null;
  let dailyMetaRollPending = false;
  let accountPlatformState = null;
  let activeWeeklyEventTab = "overview";
  let activeTeamEventTab = "overview";
  for (const nav of document.querySelectorAll(".profile-terminal-tabs")) {
    const cosmeticButton = nav.querySelector('[data-open-screen="avatar"]');
    if (cosmeticButton) cosmeticButton.textContent = "KOZMETİK";
    if (nav.querySelector('[data-open-screen="friends"]')) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.openScreen = "friends";
    button.textContent = "ARKADAŞ";
    const settingsButton = nav.querySelector('[data-open-screen="settings"]');
    nav.insertBefore(button, settingsButton || null);
  }
  const PROFILE_AVATARS = Object.freeze([
    { id: "default", nameTr: "Devre Operatörü", glyph: "◇" },
    { id: "circuit_scout", nameTr: "Devre Kaşifi", glyph: "⌁" },
    { id: "core_guardian", nameTr: "Çekirdek Muhafızı", glyph: "⬡" },
    { id: "season_champion", nameTr: "Sezon Şampiyonu", glyph: "♛" },
    { id: "season_finalist", nameTr: "Sezon Finalisti", glyph: "◈" },
    { id: "weekly_champion", nameTr: "Haftalık Şampiyon", glyph: "✹" },
    { id: "weekly_finalist", nameTr: "Haftalık Finalist", glyph: "✧" },
    { id: "rank_spark", nameTr: "Kıvılcım Operatörü", glyph: "ϟ" },
  ]);
  const PROFILE_AVATAR_FRAMES = Object.freeze([
    { id: "none", nameTr: "Standart" },
    { id: "neon_cyan", nameTr: "Neon Akım" },
    { id: "season_gold", nameTr: "Sezon Ustası" },
    { id: "season_silver", nameTr: "Prizma Finalisti" },
    { id: "weekly_gold", nameTr: "Haftalık Altın" },
    { id: "weekly_silver", nameTr: "Haftalık Gümüş" },
    { id: "frequency_cyan", nameTr: "Frekans Akımı" },
  ]);
  const BATTLE_EMOJIS = Object.freeze([
    { id:"none", nameTr:"Kapalı", glyph:"—" },
    { id:"victory_pulse", nameTr:"Zafer Darbesi", glyph:"✦", motion:"pulse" },
    { id:"respect_signal", nameTr:"Saygı Sinyali", glyph:"◇", motion:"float" },
    { id:"team_beacon", nameTr:"Takım İşareti", glyph:"⌁", motion:"beacon" },
    { id:"core_burst", nameTr:"Çekirdek Patlaması", glyph:"✹", motion:"burst" },
    { id:"glitch_wave", nameTr:"Glitch Dalgası", glyph:"▧", motion:"glitch" },
    { id:"overload_flash", nameTr:"Aşırı Yük", glyph:"ϟ", motion:"pulse" },
  ]);
  const PROFILE_BACKGROUNDS = Object.freeze([
    { id:"default", nameTr:"Standart Terminal", colors:["#0c2944", "#173f5d"] },
    { id:"rank_crown", nameTr:"Taç Devresi", colors:["#4b3611", "#145064"] },
    { id:"rank_prism", nameTr:"Prizma Akımı", colors:["#34265c", "#126a74"] },
    { id:"rank_frequency", nameTr:"Frekans Hattı", colors:["#153b58", "#176b72"] },
    { id:"rank_relay", nameTr:"Röle Akımı", colors:["#1b3159", "#174d64"] },
  ]);
  const ACCOUNT_ONBOARDING_DISMISSED_KEY = `gridshard.account-onboarding.dismissed:${participantPlayerId}`;

  function createBattleEmojiVisual(emoji) {
    const visual = document.createElement(emoji?.mediaSrc ? "img" : "span");
    visual.className = "battle-emoji-visual";
    visual.dataset.motion = emoji?.motion || "none";
    if (emoji?.mediaSrc) {
      visual.src = emoji.mediaSrc;
      visual.alt = "";
      visual.decoding = "async";
      visual.loading = "lazy";
      visual.dataset.mediaType = /\.gif(?:$|\?)/i.test(emoji.mediaSrc) ? "gif" : "image";
    } else {
      visual.textContent = emoji?.glyph || "◇";
      visual.setAttribute("aria-hidden", "true");
    }
    return visual;
  }

  function renderBattleEmojiVisual(host, emoji) {
    if (!host) return;
    host.replaceChildren(createBattleEmojiVisual(emoji));
  }
  const PROFILE_RANK_TROPHIES = Object.freeze([
    { id:"season_first", nameTr:"Sezon Birinciliği", shortNameTr:"1. Kupa", glyph:"🏆", tone:"gold" },
    { id:"season_second", nameTr:"Sezon İkinciliği", shortNameTr:"2. Kupa", glyph:"🏆", tone:"silver" },
    { id:"season_third", nameTr:"Sezon Üçüncülüğü", shortNameTr:"3. Kupa", glyph:"🏆", tone:"bronze" },
  ]);
  const PROFILE_BADGES = Object.freeze([
    { id:"season_champion", nameTr:"Şampiyon Rozeti", shortNameTr:"Şampiyon", glyph:"✦", tone:"gold" },
    { id:"season_second", nameTr:"İkincilik Rozeti", shortNameTr:"İkinci", glyph:"✦", tone:"silver" },
    { id:"season_third", nameTr:"Üçüncülük Rozeti", shortNameTr:"Üçüncü", glyph:"✦", tone:"bronze" },
    { id:"season_top10", nameTr:"Sezon İlk 10 Rozeti", shortNameTr:"İlk 10", glyph:"✧", tone:"cyan" },
  ]);
  const CORE_RARITY_ORDER = Object.freeze(["common", "rare", "epic", "legendary"]);
  let pendingDeckModuleInstanceId = null;
  let homeMatchmakingLaunchPending = false;
  let homeMatchmakingCancelPending = false;
  let deckEditRevision = 0;
  let deckSaveQueue = Promise.resolve();
  let deckEditorSlots = battlePoolSelection.selectedIds().slice(0, 6);
  while (deckEditorSlots.length < 6) deckEditorSlots.push(null);

  // Mutations may briefly contend with the JSON persistence lock. Every
  // mutation carries an idempotent receipt id, so keep the request alive
  // while the server completes instead of surfacing a false timeout.
  async function fetchWithDeadline(input, init = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (!timedOut) throw error;
      const timeoutError = new Error(localizedMessage("error.timeout"));
      timeoutError.code = "request_timeout";
      throw timeoutError;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function requestCanRetry(options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    if (["GET", "HEAD", "PUT", "DELETE"].includes(method)) return true;
    if (method !== "POST" || typeof options.body !== "string") return false;
    try {
      return Boolean(JSON.parse(options.body)?.request_id);
    } catch (_error) {
      return false;
    }
  }

  async function requestJsonWithDeadline(path, options = {}, timeoutMs = 30000) {
    const canRetry = requestCanRetry(options);
    let lastError = null;
    for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt += 1) {
      try {
        const response = await fetchWithDeadline(
          path,
          {
            cache: "no-store",
            ...options,
            headers: {
              "content-type": "application/json",
              "accept": "application/json",
              ...(options.headers || {}),
            },
          },
          timeoutMs
        );
        const rawBody = await response.text();
        let payload = {};
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch (_parseError) {
          const parseError = new Error(localizedUiText("Sunucu okunamayan bir yanıt gönderdi."));
          parseError.status = response.status;
          throw parseError;
        }
        if (!response.ok) {
          const responseError = new Error(localizedApiError(payload, response.status));
          responseError.status = response.status;
          responseError.code = payload.code || apiErrorCodeForStatus(response.status);
          if (attempt === 0 && [500, 502, 503, 504].includes(response.status)) {
            lastError = responseError;
            await new Promise((resolve) => window.setTimeout(resolve, 150));
            continue;
          }
          throw responseError;
        }
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && canRetry && !Number(error?.status)) {
          await new Promise((resolve) => window.setTimeout(resolve, 150));
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error(localizedUiText("Sunucu işlemi tamamlanamadı."));
  }

  function recordProductEvent(eventType, dimensions = {}) {
    if (settingsState.viewModel()?.analyticsConsent !== true) return;
    if (document.getElementById("settings-analytics-consent")?.checked === false) return;
    const requestId = globalThis.crypto?.randomUUID?.().replaceAll("-", "");
    void requestJsonWithDeadline("/analytics/events", {
      method: "POST",
      body: JSON.stringify({event_type: eventType, dimensions, request_id: requestId}),
    }, 5000).catch(() => {
      // Optional analytics must never interrupt play or produce a retry queue.
    });
  }

  function syncDeckEditorFromSelection() {
    deckEditRevision += 1;
    deckEditorSlots = battlePoolSelection.selectedIds().slice(0, 6);
    while (deckEditorSlots.length < 6) deckEditorSlots.push(null);
    pendingDeckModuleInstanceId = null;
  }

  const appRouter = new RelayAppRouter();
  const screenController = new GridshardScreenController({
    router: appRouter,
    screenEnum: RelayAppScreen,
  });

  let gridshardAudioDirector = null;
  let tutorialController = null;
  let criticalCoreAudioRequested = false;
  const audioStateOwner =
    typeof GridshardAudioStateOwner === "function"
      ? new GridshardAudioStateOwner({
          applyState:(state) => {
            document.body.dataset.audioState = state;
            return gridshardAudioDirector
              ?.setState(state);
          },
        })
      : null;

  if (battleEventBus && audioStateOwner) {
    battleEventBus.subscribe(
      battleEventChannels.AUDIO_STATE,
      (event) => audioStateOwner.handle(event)
    );
  }

  document.body.dataset.appScreen =
    appRouter.currentScreen;

  function currentAudioStateContext(overrides={}) {
    return {
      screen:appRouter.currentScreen,
      onlineStatus:
        document.body.dataset.onlineStatus
        || "idle",
      localStatus:
        document.body.dataset.localStatus
        || "setup",
      critical:criticalCoreAudioRequested,
      battleElapsedMs: Number(client.elapsedMs || 0),
      battlePressure: Number(gridshardAudioDirector?.battlePressure || 0),
      ...overrides,
    };
  }

  function requestOwnedAudioState(
    reason="view_sync",
    overrides={},
    { force=false }={}
  ) {
    const payload={
      action:"sync",
      reason,
      force,
      context:currentAudioStateContext(overrides),
    };
    const emitted=emitBattleEvent(
      battleEventChannels.AUDIO_STATE,
      payload
    );
    if (!battleEventBus && audioStateOwner) {
      return audioStateOwner.handle(payload);
    }
    return emitted.results[0] || null;
  }

  function setTerminalAudioState(outcome, reason="battle_finished") {
    const payload={
      action:"terminal",
      outcome,
      reason,
    };
    const emitted=emitBattleEvent(
      battleEventChannels.AUDIO_STATE,
      payload
    );
    const result=!battleEventBus && audioStateOwner
      ? audioStateOwner.handle(payload)
      : emitted.results[0] || null;
    gridshardAudioDirector
      ?.ensureResultPlayback?.(outcome);
    return result;
  }

  function clearTerminalAudioState(reason="battle_reset") {
    const payload={
      action:"clear_terminal",
      reason,
    };
    const emitted=emitBattleEvent(
      battleEventChannels.AUDIO_STATE,
      payload
    );
    if (!battleEventBus && audioStateOwner) {
      return audioStateOwner.handle(payload);
    }
    return emitted.results[0] || null;
  }

  function syncAudioStateForCurrentView() {
    return requestOwnedAudioState("view_sync");
  }

  function renderAppScreen() {
    const current = screenController.render();
    syncAudioStateForCurrentView();
    if (current !== RelayAppScreen.MODULES) {
      document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
      document.getElementById("core-quick-actions")?.setAttribute("hidden", "");
    }
    renderMetaHubScreens();

    if (
      current
      === RelayAppScreen.PLAY
    ) {
      renderPlayModeUi();
    }
  }

  async function recordLaunchAttemptAudit() {
    if (!operationalDiagnosticsEnabled) return { ok:true, skipped:true };
    try {
      const response =
        await fetch(
          "/web-test/audit/launch-attempt",
          {
            method:"POST",
            headers:{
              "content-type":
                "application/json",
            },
            body:JSON.stringify({
              player_id:
                participantPlayerId,
              attempted_at_ms:
                Date.now(),
            }),
          }
        );

      return {
        ok:response.ok,
      };
    } catch (_error) {
      return {
        ok:false,
      };
    }
  }

  function openAppScreen(screen) {
    if (screen === "play" && operationalDiagnosticsEnabled) {
      recordLaunchAttemptAudit();
    }

    const result = appRouter.go(screen);
    if (!result.ok) {
      logClientMessage(result.reason);
      return result;
    }

    if (
      screen === "play"
      && !playReadinessGate.canPlay()
    ) {
      // Hazırlık ekranı her zaman açılır; bağlantı kapısı yalnız oyuncu
      // Eşleştir dediğinde uygulanır.
      logClientMessage(
        playReadinessGate.labelTr()
        + ". Savaş Havuzunu hazırlayabilirsin; eşleştirme için bağlantı gerekir."
      );
    }

    renderAppScreen();
    recordProductEvent("screen_view", {screen});

    if (screen === "play") {
      // Beta.26: Oyna doğrudan tek çevrimiçi hazırlık ekranını açar.
      prepareOnlineMatch();
      tutorialController?.maybeStart();
    }

    if (["profile", "avatar", "friends", "daily", "daily-rewards", "daily-missions", "rewards", "shop", "modules", "team", "events", "weekly-event", "team-event", "menu"].includes(screen)) {
      accountDataLoader
        .loadProfile()
        .then(() => markScreenNotificationsSeen(screen))
        .then(() => {
          renderProfileSummary();
          renderMetaHubScreens();
          renderRemoteDataStatus();
        });
      if (["shop", "modules", "team", "menu"].includes(screen)) {
        loadMetaProgression();
      }
      if (screen === "team") {
        activeTeamTab = "profile";
        loadTeamView();
      }
      if (screen === "friends") {
        loadSocialView();
        loadDirectMessages();
      }
      if (["events", "weekly-event", "team-event"].includes(screen)) {
        if (screen === "weekly-event") activeWeeklyEventTab = "overview";
        if (screen === "team-event") activeTeamEventTab = "overview";
        renderEventSubpages();
        loadEventsView();
      }
    } else if (
      screen === "laboratory"
    ) {
      accountDataLoader
        .loadLaboratory()
        .then(() => {
          renderLaboratory();
          renderProfileSummary();
          renderRemoteDataStatus();
        });
    } else if (
      screen === "statistics"
    ) {
      accountDataLoader
        .loadStatistics()
        .then(() => {
          renderStatisticsSummary();
          renderRemoteDataStatus();
        });
    } else if (
      screen === "settings"
    ) {
      accountDataLoader
        .loadSettings()
        .then(() => {
          renderSettingsForm();
          renderRemoteDataStatus();
        });
      loadAccountPlatform();
    }

    renderRemoteDataStatus();
    return result;
  }

  async function markScreenNotificationsSeen(screen) {
    const section = ({
      avatar: "avatar",
      "daily-rewards": "daily-login",
      "daily-missions": "daily-missions",
      rewards: "season",
    })[screen];
    if (!section) return { ok: true, skipped: true };
    try {
      const profile = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/notifications/${encodeURIComponent(section)}/seen`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "accept": "application/json" },
        },
        12000
      );
      profileState.applyProfile(profile);
      return { ok: true };
    } catch (_error) {
      // A failed acknowledgement intentionally leaves the dot visible. The
      // server remains the source of truth and a refresh cannot clear it.
      return { ok: false };
    }
  }

  function fallbackMetaProgression() {
    return {
      unavailable: true,
      flux_shards: profileState.viewModel()?.engagement?.fluxShards || 0,
      circuit_credits: Number(profileState.profile?.meta_progression?.circuit_credits || 0),
      core_shards: 0,
      module_collection: selectablePoolModules.map((module) => ({
        definition_id: module.definitionId,
        name_tr: module.nameTr,
        category: module.category,
        rarity: module.rarity || "common",
        unlocked: false,
        level: 0,
        shards: 0,
        next_upgrade_cost: null,
      })),
      chests: { slots: [], definitions: [
        { id: "field_3h", name_tr: "Bronz Sandık", visual_tier: "bronze", unlock_hours: 0, open_seconds: 1, claim_cooldown_hours: 3, claim_available: true, claim_remaining_seconds: 0 },
        { id: "circuit_8h", name_tr: "Gümüş Sandık", visual_tier: "silver", unlock_hours: 0, open_seconds: 1, claim_cooldown_hours: 8, claim_available: true, claim_remaining_seconds: 0 },
        { id: "core_24h", name_tr: "Altın Sandık", visual_tier: "gold", unlock_hours: 0, open_seconds: 1, claim_cooldown_hours: 16, claim_available: true, claim_remaining_seconds: 0 },
        { id: "diamond_24h", name_tr: "Elmas Sandık", visual_tier: "diamond", unlock_hours: 0, open_seconds: 1, claim_cooldown_hours: 24, claim_available: true, claim_remaining_seconds: 0 },
      ], inventory: [] },
      shop: { day: "", week: "", period: "weekly", reset_at: "", offers: [
        { id: "bronze_daily", name_tr: "Bronz Sandık", tier: "bronze", currency: "circuit_credits", cost: 120, purchased: false },
        { id: "silver_daily", name_tr: "Gümüş Sandık", tier: "silver", currency: "circuit_credits", cost: 400, purchased: false },
        { id: "gold_daily", name_tr: "Altın Sandık", tier: "gold", currency: "circuit_credits", cost: 900, purchased: false },
      ] },
    };
  }

  async function loadMetaProgression() {
    try {
      const response = await fetchWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Koleksiyon yüklenemedi.");
      metaProgressionState = await response.json();
      const repair = repairBattleDeckAgainstCollection();
      if (repair.changed) {
        await persistBattlePoolDefinitionIds(repair.definitionIds);
      }
    } catch (_error) {
      metaProgressionState ||= fallbackMetaProgression();
      for (const id of ["module-action-status", "shop-action-status"]) {
        const status = document.getElementById(id);
        if (status) status.textContent = "Hesap verileri yüklenemedi. Sunucu bağlantısını kontrol edip sayfayı yenile.";
      }
    }
    renderMetaHubScreens();
    return metaProgressionState;
  }

  function repairBattleDeckAgainstCollection() {
    const creatingPreset = Boolean(
      activeBattlePoolPresetName
      && !battlePoolPresets.some(
        (preset) => preset.name === activeBattlePoolPresetName
      )
    );
    if (creatingPreset) {
      return { changed: false, definitionIds: selectedBattlePoolDefinitionIds() };
    }
    const collection = metaProgressionState?.module_collection || [];
    const unlockedIds = collection
      .filter((item) => item.unlocked !== false)
      .map((item) => item.definition_id);
    if (unlockedIds.length < 6) {
      return { changed: false, definitionIds: selectedBattlePoolDefinitionIds() };
    }
    const unlocked = new Set(unlockedIds);
    const current = deckEditorSlots.filter(Boolean).map(clientDefinitionId);
    const repaired = [];
    for (const definitionId of [
      ...current,
      ...STARTER_BATTLE_POOL_PRESET.module_definition_ids,
      ...unlockedIds,
    ]) {
      if (unlocked.has(definitionId) && !repaired.includes(definitionId)) repaired.push(definitionId);
      if (repaired.length === 6) break;
    }
    const changed = current.length !== 6 || repaired.some((id, index) => id !== current[index]);
    if (changed) {
      deckEditorSlots = definitionIdsToInstanceIds(repaired);
      battlePoolSelection.setSelection(deckEditorSlots);
      if (profileState.profile) profileState.profile.preferred_battle_pool_ids = [...repaired];
      deckEditRevision += 1;
    }
    return { changed, definitionIds: repaired };
  }

  async function persistBattlePoolDefinitionIds(definitionIds) {
    const profile = await requestJsonWithDeadline(`/profile/${encodeURIComponent(participantPlayerId)}/battle-pool`, {
      method: "PUT",
      body: JSON.stringify({ battle_pool_ids: definitionIds }),
    });
    profileState.applyProfile(profile);
    return profile;
  }

  function metaModuleDefinition(item) {
    return moduleDefinitions.find(
      (module) => module.definitionId === item?.definition_id
    ) || null;
  }

  function unifiedModuleTile(item, { collection = false, selected = false } = {}) {
    const definition = metaModuleDefinition(item) || item;
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `unified-module-tile${collection ? " collection-module-tile" : ""}`;
    tile.dataset.category = item.category || definition.category || "";
    tile.dataset.moduleDefinitionId = item.definition_id || definition.definitionId || "";
    tile.dataset.selected = String(selected);
    tile.setAttribute("aria-label", localizedUiText(item.name_tr || definition.nameTr || "Modül"));
    tile.title = localizedUiText(item.name_tr || definition.nameTr || "Modül");
    if (item.unlocked === false) {
      tile.dataset.locked = "true";
    }
    const art = document.createElement("span");
    art.className = "unified-module-art";
    art.textContent = moduleIconFor({ nameTr: item.name_tr || definition.nameTr });
    art.setAttribute("aria-hidden", "true");
    tile.appendChild(art);
    if (selected) {
      const check = document.createElement("span");
      check.className = "unified-module-selected";
      check.textContent = "✓";
      tile.appendChild(check);
    }
    if (collection) {
      const level = Math.max(0, Number(item.level || 0)) + 1;
      const required = Math.max(1, Number(item.next_upgrade_cost?.shards || 1));
      const shards = Math.max(0, Number(item.shards || 0));
      const footer = document.createElement("span");
      footer.className = "unified-module-progress";
      footer.innerHTML = `<strong>${localizedMessage("module.level_short", {level:localizedNumber(level)})}</strong><span>${level >= 15 ? localizedMessage("module.maximum") : `${localizedNumber(shards)} / ${localizedNumber(required)}`}</span><i style="--module-progress:${level >= 15 ? 100 : Math.min(100, Math.round((shards / required) * 100))}%"></i>`;
      tile.appendChild(footer);
    }
    return tile;
  }

  function selectedDeckMetaModules({ editable = false } = {}) {
    const collection = metaProgressionState?.module_collection || fallbackMetaProgression().module_collection;
    const byId = new Map(collection.map((item) => [item.definition_id, item]));
    const ids = deckEditorSlots;
    return ids.map((instanceId) => {
      if (!instanceId) return null;
      const definition = clientDefinitionId(instanceId);
      return byId.get(definition) || {
        definition_id: definition,
        name_tr: client.modules.get(instanceId)?.nameTr || definition,
        category: client.modules.get(instanceId)?.category || "",
        unlocked: true,
      };
    });
  }

  function renderDeckStrip(host, { editable = false } = {}) {
    if (!host) return;
    host.replaceChildren();
    selectedDeckMetaModules({ editable }).forEach((item, index) => {
      if (!item) {
        const empty = document.createElement("button");
        empty.type = "button";
        empty.className = "unified-module-tile module-deck-empty";
        empty.dataset.deckIndex = String(index);
        empty.setAttribute("aria-label", localizedMessage("deck.empty_slot_aria", {slot:index + 1}));
        empty.textContent = "+";
        empty.disabled = true;
        host.appendChild(empty);
        return;
      }
      const tile = unifiedModuleTile(item, { selected: true });
      tile.dataset.deckIndex = String(index);
      tile.classList.toggle("is-replace-target", editable && Boolean(pendingDeckModuleInstanceId));
      if (editable) {
        tile.disabled = false;
        tile.setAttribute("aria-label", localizedMessage("deck.module_action_aria", {name:localizedUiText(item.name_tr), action:localizedMessage(pendingDeckModuleInstanceId ? "deck.replace" : "deck.remove")}));
        const badge = tile.querySelector(".unified-module-selected");
        if (badge) badge.textContent = pendingDeckModuleInstanceId ? "↔" : "−";
        tile.addEventListener("click", async () => {
          if (pendingDeckModuleInstanceId) {
            deckEditorSlots[index] = pendingDeckModuleInstanceId;
            pendingDeckModuleInstanceId = null;
            await commitDeckEditorSlots();
            return;
          }
          deckEditorSlots[index] = null;
          await commitDeckEditorSlots();
        });
      } else {
        tile.addEventListener("click", () => openAppScreen("modules"));
      }
      host.appendChild(tile);
    });
  }

  function renderPresetStrip(host) {
    if (!host) return;
    host.replaceChildren();
    for (let index = 0; index < 7; index += 1) {
      const preset = battlePoolPresets[index] || null;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = preset ? String(index + 1) : "+";
      button.title = preset?.name || localizedMessage("deck.create_empty", {slot:index + 1});
      button.setAttribute(
        "aria-label",
        preset?.name || localizedMessage("deck.create_empty_aria", {slot:index + 1})
      );
      button.classList.toggle("is-empty", !preset);
      button.classList.toggle("is-active", preset?.name === activeBattlePoolPresetName);
      if (preset) {
        button.addEventListener("click", async () => {
          await loadSelectedBattlePoolPreset(preset.name);
          renderMetaHubScreens();
        });
      } else {
        button.addEventListener("click", () => beginEmptyBattlePoolPreset(index));
      }
      host.appendChild(button);
    }
  }

  function beginEmptyBattlePoolPreset(index) {
    const slotNumber = Math.max(2, Math.min(7, Number(index) + 1));
    let name = localizedMessage("deck.default_name", {slot:localizedNumber(slotNumber)});
    let suffix = 2;
    while (battlePoolPresets.some((preset) => preset.name === name)) {
      name = localizedMessage("deck.default_name_suffix", {slot:localizedNumber(slotNumber), suffix:localizedNumber(suffix)});
      suffix += 1;
    }
    activeBattlePoolPresetName = name;
    activeBattlePoolPresetBaseline = [];
    pendingDeckModuleInstanceId = null;
    deckEditorSlots = Array(6).fill(null);
    deckEditRevision += 1;
    openAppScreen("modules");
    renderMetaHubScreens();
    const status = document.getElementById("module-action-status");
    if (status) {
      status.textContent = localizedMessage("deck.empty_hint", {slot:slotNumber});
    }
  }

  function renderHomeHub() {
    renderHomeCoreHero();
    renderDeckStrip(document.getElementById("home-active-deck"));
    renderPresetStrip(document.getElementById("home-preset-decks"));
    renderHomeArena();
    const battleButton = document.getElementById("home-battle-button");
    if (battleButton) {
      battleButton.disabled = deckEditorSlots.filter(Boolean).length !== 6
        || homeMatchmakingLaunchPending || homeMatchmakingCancelPending
        || isOnlineMatchmakingCancelable();
      const copy = battleButton.querySelector("small");
      if (copy && !homeMatchmakingLaunchPending && !isOnlineMatchmakingCancelable()) {
        copy.textContent = deckEditorSlots.filter(Boolean).length === 6
          ? "Eşleştirmeyi başlat"
          : "Altı kartlık desteni tamamla";
      }
    }
  }

  function arenaViewModel() {
    const state = metaProgressionState || fallbackMetaProgression();
    const profileRating = Number(profileState.profile?.rating || 0);
    const fallbackFloor = Math.max(0, Math.floor(profileRating / 300) * 300);
    const fallbackIndex = Math.floor(fallbackFloor / 300) + 1;
    const rank = state.rank || {
      kind: "arena",
      index: fallbackIndex,
      name_tr: `Arena ${fallbackIndex}`,
      minimum_rating: fallbackFloor,
      rating: profileRating,
      next_stage: { name_tr: `Arena ${fallbackIndex + 1}`, minimum_rating: fallbackFloor + 300 },
    };
    const rating = Number(rank.rating ?? profileState.profile?.rating ?? 0);
    const floor = Number(rank.minimum_rating || 0);
    const ceiling = Number(rank.next_stage?.minimum_rating ?? Math.max(floor + 300, rating));
    const progress = ceiling <= floor ? 100 : Math.max(0, Math.min(100, ((rating - floor) / (ceiling - floor)) * 100));
    return { rank, rating, floor, ceiling, progress };
  }

  function resourceSymbolMarkup(kind) {
    const symbols = {
      flux_shards: '<span class="resource-symbol resource-symbol-flux" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2 4 6 6 4-6 4-4 6-4-6-6-4 6-4Z"/><circle cx="12" cy="12" r="2.3"/></svg></span>',
      circuit_credits: '<span class="resource-symbol resource-symbol-credit" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7 12h3l2-4 2 8 2-4h2"/></svg></span>',
      module_shards: '<span class="resource-symbol resource-symbol-module-shard" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 4 8 2 5 7-8 7-6-6Z"/><path d="m13 6-3 6 6 2"/></svg></span>',
      core_shards: '<span class="resource-symbol resource-symbol-core-shard" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 7 4v10l-7 4-7-4V7Z"/><path d="m12 7 4 5-4 5-4-5Z"/></svg></span>',
      chest: '<span class="resource-symbol resource-symbol-chest" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9h16v11H4Z"/><path d="M3 5h18v5H3ZM12 9v11"/></svg></span>',
    };
    return symbols[kind] || '<span class="resource-symbol resource-symbol-module-shard" aria-hidden="true">◆</span>';
  }

  function moduleShardSymbolMarkup(rewards = {}) {
    const definitionId = String(
      rewards.module_shard_target
      || rewards.module_definition_id
      || rewards.module_id
      || ""
    );
    const module = moduleDefinitions.find(
      (candidate) => candidate.definitionId === definitionId
    );
    if (!module) return resourceSymbolMarkup("module_shards");
    return `<span class="resource-symbol resource-symbol-module-card" data-category="${module.category || ""}" aria-hidden="true">${moduleIconFor(module)}</span>`;
  }

  function moduleRewardIdentity(rewards = {}) {
    const definitionId = String(
      rewards.module_definition_id
      || rewards.module_shard_target
      || rewards.module_id
      || ""
    );
    const collectionItem = metaProgressionState?.module_collection?.find(
      (item) => item.definition_id === definitionId
    );
    const definition = moduleDefinitions.find(
      (item) => item.definitionId === definitionId
    );
    return {
      id: definitionId,
      nameTr: collectionItem?.name_tr || definition?.nameTr || "Modül",
      category: collectionItem?.category || definition?.category || "",
      glyph: moduleIconFor(definition || { nameTr: collectionItem?.name_tr || "Modül" }),
    };
  }

  function coreRewardIdentity(rewards = {}) {
    const requestedCoreId = String(rewards.core_type_id || "core_resonance");
    const coreId = CORE_VISUALS[requestedCoreId]
      ? requestedCoreId
      : "core_resonance";
    const core = metaProgressionState?.cores?.types?.find(
      (item) => item.id === coreId
    );
    const visual = CORE_VISUALS[coreId] || CORE_VISUALS.core_resonance;
    return {
      id: coreId,
      nameTr: core?.name_tr || visual.nameTr || "Çekirdek",
      glyph: visual.glyph,
    };
  }

  function createRewardResourceIcon(kind, rewards = {}) {
    if (kind === "module_shards") {
      const identity = moduleRewardIdentity(rewards);
      const icon = document.createElement("span");
      icon.className = "resource-symbol resource-symbol-module-card";
      icon.dataset.category = identity.category;
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = identity.glyph;
      return icon;
    }
    if (kind === "core_shards") {
      const identity = coreRewardIdentity(rewards);
      const icon = document.createElement("span");
      icon.className = "resource-symbol resource-symbol-core-card";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = identity.glyph;
      applyCoreVisualIdentity(icon, identity.id);
      return icon;
    }
    const template = document.createElement("template");
    template.innerHTML = resourceSymbolMarkup(kind);
    return template.content.firstElementChild;
  }

  function rewardRowDefinitions(rewards = {}) {
    const module = moduleRewardIdentity(rewards);
    const core = coreRewardIdentity(rewards);
    return [
      { kind:"circuit_credits", amount:Number(rewards.circuit_credits || 0), label:localizedMessage("currency.credits_label"), suffix:"" },
      { kind:"flux_shards", amount:Number(rewards.flux_shards || 0), label:localizedMessage("currency.flux_label"), suffix:"" },
      { kind:"module_shards", amount:Number(rewards.module_shards || 0), label:localizedMessage("reward.module_shard", {name:localizedUiText(module.nameTr)}), suffix:"" },
      { kind:"core_shards", amount:Number(rewards.core_shards || 0), label:localizedMessage("reward.core_shard", {name:localizedUiText(core.nameTr)}), suffix:"" },
    ].filter((item) => item.amount > 0);
  }

  function createRewardRows(rewards = {}, { compact = false } = {}) {
    const list = document.createElement("div");
    list.className = `reward-resource-list${compact ? " is-compact" : ""}`;
    for (const item of rewardRowDefinitions(rewards)) {
      const row = document.createElement("div");
      row.className = "reward-resource-row";
      row.dataset.rewardKind = item.kind;
      const icon = createRewardResourceIcon(item.kind, rewards);
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = localizedMessage("reward.signed_amount", {amount:localizedNumber(item.amount), suffix:item.suffix});
      row.setAttribute("aria-label", `${item.label} ${value.textContent}`);
      row.title = `${item.label} ${value.textContent}`;
      row.append(icon, label, value);
      list.appendChild(row);
    }
    return list;
  }

  function createSeasonCosmeticRewardRow(kind, cosmeticId) {
    const isFrame = kind === "avatar_frame";
    const definition = (isFrame ? PROFILE_AVATAR_FRAMES : PROFILE_AVATARS).find(
      (item) => item.id === cosmeticId
    );
    const name = localizedCatalogName(isFrame ? "frame" : "avatar", cosmeticId, definition?.nameTr || localizedMessage(isFrame ? "team.cosmetic_frame" : "event.prize_avatar"));
    const row = document.createElement("div");
    row.className = "reward-resource-row season-cosmetic-reward";
    row.dataset.rewardKind = kind;
    row.setAttribute("aria-label", localizedMessage("reward.single_item", {name}));
    row.title = localizedMessage("reward.single_item", {name});
    const preview = document.createElement("span");
    preview.className = "profile-avatar season-reward-cosmetic-preview";
    preview.setAttribute("aria-hidden", "true");
    applyAvatarVisual(
      preview,
      isFrame ? "default" : cosmeticId,
      isFrame ? cosmeticId : "none"
    );
    const amount = document.createElement("strong");
    amount.textContent = "×1";
    row.append(preview, amount);
    return row;
  }

  function aggregateChestRewards(receipts = []) {
    const totals = {
      circuit_credits: 0,
      flux_shards: 0,
      module_shards: 0,
      core_shards: 0,
      module_rewards: [],
      core_rewards: [],
    };
    const modules = new Map();
    const cores = new Map();
    for (const receipt of receipts) {
      const rewards = receipt?.rewards || {};
      totals.circuit_credits += Math.max(0, Number(rewards.circuit_credits || 0));
      totals.flux_shards += Math.max(0, Number(rewards.flux_shards || 0));
      const moduleAmount = Math.max(0, Number(rewards.module_shards || 0));
      const moduleId = String(rewards.module_definition_id || "");
      if (moduleAmount > 0 && moduleId) {
        const current = modules.get(moduleId) || {
          module_definition_id: moduleId,
          module_rarity: rewards.module_rarity || "common",
          module_shards: 0,
        };
        current.module_shards += moduleAmount;
        modules.set(moduleId, current);
        totals.module_shards += moduleAmount;
      }
      const coreAmount = Math.max(0, Number(rewards.core_shards || 0));
      const coreId = String(rewards.core_type_id || "");
      if (coreAmount > 0 && coreId) {
        const current = cores.get(coreId) || { core_type_id: coreId, core_shards: 0 };
        current.core_shards += coreAmount;
        cores.set(coreId, current);
        totals.core_shards += coreAmount;
      }
    }
    totals.module_rewards = [...modules.values()];
    totals.core_rewards = [...cores.values()];
    return totals;
  }

  function createBulkRewardRows(batchReceipt) {
    const receipts = batchReceipt?.receipts || [];
    const totals = batchReceipt?.reward_totals || aggregateChestRewards(receipts);
    const list = createRewardRows({
      circuit_credits: totals.circuit_credits,
      flux_shards: totals.flux_shards,
    });
    const appendRows = (rewards) => {
      const rows = createRewardRows(rewards);
      while (rows.firstChild) list.appendChild(rows.firstChild);
    };
    for (const reward of totals.module_rewards || []) appendRows(reward);
    for (const reward of totals.core_rewards || []) appendRows(reward);
    return list;
  }

  function renderArenaPath() {
    const host = document.getElementById("arena-path");
    if (!host) return;
    host.replaceChildren();
    const arenaPath = metaProgressionState?.arena_path || [];
    const arenasByIndex = new Map(arenaPath.map((arena) => [Number(arena.index), arena]));
    const stages = metaProgressionState?.rank_stages?.length
      ? metaProgressionState.rank_stages
      : arenaPath;
    const currentStageId = metaProgressionState?.rank?.id;
    const rewardIcon = (rewards = {}) => {
      if (rewards.chest_id) return resourceSymbolMarkup("chest");
      if (rewards.core_shards) {
        const identity = coreRewardIdentity(rewards);
        const visual = CORE_VISUALS[identity.id] || CORE_VISUALS.core_resonance;
        return `<span class="resource-symbol resource-symbol-core-card" data-core-type="${identity.id}" style="--core-accent:${visual.accent}" aria-hidden="true">${visual.glyph}</span>`;
      }
      if (rewards.module_shards || rewards.module_id || rewards.module_shard_target) return moduleShardSymbolMarkup(rewards);
      if (rewards.flux_shards) return resourceSymbolMarkup("flux_shards");
      if (rewards.circuit_credits) return resourceSymbolMarkup("circuit_credits");
      return resourceSymbolMarkup("module_shards");
    };
    for (const stage of stages) {
      const isLeagueStage = stage.kind && stage.kind !== "arena";
      const arena = stage.kind === "arena" || !stage.kind
        ? (arenasByIndex.get(Number(stage.index)) || stage)
        : null;
      const unlocked = arena ? Boolean(arena.unlocked) : Number(arenaViewModel().rating) >= Number(stage.minimum_rating || 0);
      const section = document.createElement("section");
      section.className = `arena-path-stage${unlocked ? " is-unlocked" : ""}${isLeagueStage ? " is-league" : ""}${stage.id === currentStageId ? " is-current" : ""}`;
      const head = document.createElement("header");
      head.className = "arena-path-stage-head";
      const marker = document.createElement("span");
      marker.className = "arena-path-marker";
      marker.textContent = isLeagueStage ? "♛" : String(stage.index || "◇");
      const copy = document.createElement("div");
      copy.className = "arena-path-stage-copy";
      const title = document.createElement("h3");
      title.textContent = isLeagueStage
        ? localizedUiText(stage.name_tr)
        : localizedMessage("arena.stage_name", {arena:localizedNumber(stage.index), name:stage.name_tr ? localizedMessage("arena.stage_name_suffix", {name:localizedUiText(stage.name_tr)}) : ""});
      const detail = document.createElement("p");
      if (arena) {
        const nodeCount = (arena.nodes || []).filter((node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= Number(stage.minimum_rating || 0)).length;
        const coreCopy = arena.core_unlock ? localizedMessage("arena.new_core_suffix") : "";
        detail.textContent = localizedMessage("arena.stage_detail", {trophies:localizedNumber(stage.minimum_rating || 0), count:localizedNumber(nodeCount), core:coreCopy});
      } else {
        const next = stages[stages.indexOf(stage) + 1];
        detail.textContent = next
          ? localizedMessage("arena.league_range", {minimum:localizedNumber(stage.minimum_rating || 0), maximum:localizedNumber(Number(next.minimum_rating) - 1)})
          : localizedMessage("arena.legendary_range", {minimum:localizedNumber(stage.minimum_rating || 0)});
      }
      copy.append(title, detail);
      head.append(marker, copy);
      section.appendChild(head);

      if (arena) {
        const unlocks = (metaProgressionState?.module_collection || [])
          .filter((item) => Number(item.unlock_arena) === Number(stage.index));
        if (unlocks.length) {
          const unlockArea = document.createElement("div");
          unlockArea.className = "arena-module-unlocks";
          const label = document.createElement("span");
          label.textContent = "BU ARENADA AÇILAN MODÜLLER";
          const cards = document.createElement("div");
          for (const item of unlocks) {
            const card = document.createElement("button");
            card.type = "button";
            card.dataset.category = item.category || "";
            card.title = localizedUiText(item.name_tr);
            card.setAttribute("aria-label", localizedUiText(item.name_tr));
            card.textContent = moduleIconFor({ nameTr: item.name_tr });
            card.addEventListener("click", () => {
              selectedCollectionModuleId = item.definition_id;
              openModuleDetail();
            });
            cards.appendChild(card);
          }
          unlockArea.append(label, cards);
          section.appendChild(unlockArea);
        }

        const nodes = (arena.nodes || []).filter((node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= Number(stage.minimum_rating || 0));
        const road = document.createElement("div");
        road.className = "arena-reward-road";
        for (const node of nodes) {
          const rewardDescription = localizedArenaRewardDescription(node);
          const reward = document.createElement("button");
          reward.type = "button";
          reward.className = `arena-reward-node${node.claimed ? " is-claimed" : ""}${node.claimable ? " is-claimable" : ""}`;
          reward.disabled = !node.claimable;
          const trophy=document.createElement("span");
          trophy.className="arena-reward-trophy";
          trophy.textContent=localizedMessage("arena.trophy_icon", {count:localizedNumber(node.trophies)});
          const icon=document.createElement("i");
          icon.setAttribute("aria-hidden","true");
          icon.textContent=rewardIcon(node.rewards);
          const caption=document.createElement("strong");
          caption.textContent=node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy,icon,caption);
          if (node.claimable) reward.setAttribute("aria-label", localizedMessage("reward.claim_aria", {reward:rewardDescription}));
          reward.addEventListener("click", async () => {
            reward.disabled = true;
            const status = document.getElementById("arena-reward-status");
            try {
              await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/arena/${encodeURIComponent(node.id)}/claim`);
               if (status) status.textContent = "";
              renderArenaPath();
            } catch (error) {
              if (status) status.textContent = error.message;
              reward.disabled = false;
            }
          });
          road.appendChild(reward);
        }
        section.appendChild(road);
      } else {
        const leagueRoad = document.createElement("div");
        leagueRoad.className = "arena-reward-road arena-league-reward-road";
        for (const node of stage.nodes || []) {
          const rewardDescription = localizedArenaRewardDescription(node);
          const reward = document.createElement("button");
          reward.type = "button";
          reward.className = `arena-reward-node${node.claimed ? " is-claimed" : ""}${node.claimable ? " is-claimable" : ""}`;
          reward.disabled = !node.claimable;
          const trophy=document.createElement("span");
          trophy.className="arena-reward-trophy";
          trophy.textContent=localizedMessage("arena.trophy_icon", {count:localizedNumber(node.trophies)});
          const icon=document.createElement("i");
          icon.setAttribute("aria-hidden","true");
          icon.textContent=rewardIcon(node.rewards);
          const caption=document.createElement("strong");
          caption.textContent=node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy,icon,caption);
          if (node.claimable) reward.setAttribute("aria-label", localizedMessage("reward.claim_aria", {reward:rewardDescription}));
          reward.addEventListener("click", async () => {
            reward.disabled = true;
            const status = document.getElementById("arena-reward-status");
            try {
              await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/arena/${encodeURIComponent(node.id)}/claim`);
              if (status) status.textContent = "";
              renderArenaPath();
            } catch (error) {
              if (status) status.textContent = error.message;
              reward.disabled = false;
            }
          });
          leagueRoad.appendChild(reward);
        }
        section.appendChild(leagueRoad);
      }
      host.appendChild(section);
    }
    if (!host.childElementCount) host.textContent = "Devre Yolu yükleniyor…";
  }

  const CORE_VISUALS = Object.freeze({
    core_resonance: Object.freeze({ nameTr:"Rezonans Çekirdeği", glyph:"◈", accent:"#56f1df" }),
    core_guardian: Object.freeze({ nameTr:"Muhafız Çekirdeği", glyph:"⬡", accent:"#79b6ff" }),
    core_overdrive: Object.freeze({ nameTr:"Aşırı Yük Çekirdeği", glyph:"ϟ", accent:"#ff6e82" }),
    core_disruptor: Object.freeze({ nameTr:"Kesinti Çekirdeği", glyph:"⌁", accent:"#bf7dff" }),
    core_capacitor: Object.freeze({ nameTr:"Kapasitör Çekirdeği", glyph:"▣", accent:"#62e4ff" }),
    core_phoenix: Object.freeze({ nameTr:"Anka Çekirdeği", glyph:"✹", accent:"#ffb85e" }),
    core_quantum: Object.freeze({ nameTr:"Kuantum Çekirdeği", glyph:"✧", accent:"#f28cff" }),
  });
  const CORE_GLYPHS = Object.freeze(Object.fromEntries(
    Object.entries(CORE_VISUALS).map(([coreId, visual]) => [coreId, visual.glyph])
  ));

  function applyCoreVisualIdentity(element, coreId) {
    const normalizedId = CORE_VISUALS[coreId] ? coreId : "core_resonance";
    const visual = CORE_VISUALS[normalizedId];
    if (element) {
      element.dataset.coreType = normalizedId;
      element.style.setProperty("--core-accent", visual.accent);
    }
    return visual;
  }

  function renderHomeCoreHero() {
    const core = metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0]
      || null;
    const button = document.getElementById("home-core-hero");
    const glyph = document.getElementById("home-core-hero-glyph");
    const level = document.getElementById("home-core-hero-level");
    const coreId = core?.id || "core_resonance";
    const visual = applyCoreVisualIdentity(button, coreId);
    if (glyph) glyph.textContent = visual.glyph;
    if (level) level.textContent = localizedMessage("module.level_short", {level:localizedNumber(core?.level || 1)});
    if (button) {
      button.setAttribute("aria-label", localizedMessage("core.select_aria", {name:localizedUiText(core?.name_tr || "Çekirdek"), level:localizedNumber(core?.level || 1)}));
    }
  }
  function openCoreCollection() {
    setCardCollectionPage("cores");
    openAppScreen("modules");
  }

  function setCardCollectionPage(page) {
    activeCardPage = page === "cores" ? "cores" : "modules";
    for (const panel of document.querySelectorAll("[data-card-page-panel]")) {
      const active = panel.dataset.cardPagePanel === activeCardPage;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    }
    for (const button of document.querySelectorAll("[data-card-page]")) {
      const active = button.dataset.cardPage === activeCardPage;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
    document.getElementById("core-quick-actions")?.setAttribute("hidden", "");
    if (activeCardPage === "cores") renderCoreCollection();
    else renderModuleCollection();
  }

  function activeMetaCore() {
    return (metaProgressionState?.cores?.types || [])
      .find((item) => item.id === selectedCollectionCoreId) || null;
  }

  function coreCollectionTile(core, { selected = false, active = false } = {}) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `core-collection-tile${active ? " active-core-tile" : ""}`;
    tile.dataset.coreType = core.id;
    tile.dataset.rarity = core.rarity || "common";
    tile.dataset.selected = String(selected);
    tile.dataset.locked = String(!core.unlocked);
    tile.setAttribute("aria-label", localizedMessage("core.tile_aria", {name:localizedUiText(core.name_tr), rarity:moduleRarityLabel(core.rarity), level:localizedNumber(core.level), selected:core.selected ? localizedMessage("core.selected_suffix") : ""}));
    const visual = applyCoreVisualIdentity(tile, core.id);
    const glyph = document.createElement("span");
    glyph.className = "core-collection-glyph";
    glyph.textContent = visual.glyph;
    glyph.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "core-collection-copy";
    const name = document.createElement("strong");
    name.textContent = localizedRecordText(core, "name");
    const rarity = document.createElement("em");
    rarity.textContent = moduleRarityLabel(core.rarity);
    const state = document.createElement("small");
    state.textContent = core.unlocked ? localizedMessage("module.level_short", {level:localizedNumber(core.level)}) : localizedMessage("arena.numbered", {arena:localizedNumber(core.unlock_arena)});
    copy.append(name, rarity, state);
    const progress = document.createElement("i");
    const required = Number(core.next_upgrade_cost?.shards || 1);
    const owned = Number(core.shards || 0) + Number(core.legacy_shards || 0);
    progress.style.setProperty("--core-progress", `${core.next_upgrade_cost ? Math.min(100, Math.round(owned / required * 100)) : 100}%`);
    tile.append(glyph, copy, progress);
    if (core.selected) {
      const check = document.createElement("b");
      check.textContent = "✓";
      tile.appendChild(check);
    }
    return tile;
  }

  function positionQuickActions(panel, anchor, screen) {
    if (!panel || !anchor || !screen) return;
    const screenRect = screen.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const panelWidth = Math.max(anchorRect.width, panel.getBoundingClientRect().width || 96);
    const anchorCenter = anchorRect.left - screenRect.left + screen.scrollLeft + (anchorRect.width / 2);
    const proposedLeft = anchorCenter - (panelWidth / 2);
    panel.style.width = `${panelWidth}px`;
    panel.style.left = `${Math.max(4, Math.min(screen.scrollWidth - panelWidth - 4, proposedLeft))}px`;
    panel.style.top = `${anchorRect.bottom - screenRect.top + screen.scrollTop - 3}px`;
  }

  function showCoreQuickActions(core, anchor) {
    selectedCollectionCoreId = core.id;
    const panel = document.getElementById("core-quick-actions");
    if (!panel) return;
    const name = document.getElementById("core-quick-name");
    const select = document.getElementById("core-quick-select");
    if (name) name.textContent = localizedRecordText(core, "name");
    if (select) {
      select.textContent = localizedMessage(core.selected ? "core.selected" : core.unlocked ? "core.select" : "reward.locked");
      select.disabled = !core.unlocked || core.selected;
    }
    panel.hidden = false;
    for (const tile of document.querySelectorAll(".core-collection-tile")) {
      tile.classList.toggle("is-focused", tile === anchor);
    }
    positionQuickActions(panel, anchor, document.getElementById("modules-screen"));
  }

  function renderCoreCollection() {
    const host = document.getElementById("core-collection-list");
    if (!host) return;
    host.replaceChildren();
    const cores = metaProgressionState?.cores?.types || [];
    const selected = cores.find((item) => item.selected) || cores[0];
    const activeHost = document.getElementById("active-core-card");
    if (activeHost) {
      activeHost.replaceChildren();
      if (selected) {
        const tile = coreCollectionTile(selected, { selected: true, active: true });
        tile.addEventListener("click", () => {
          selectedCollectionCoreId = selected.id;
          openCoreDetail();
        });
        activeHost.appendChild(tile);
      }
    }
    const count = document.getElementById("core-collection-count");
    if (count) count.textContent = localizedMessage("core.unlock_ratio", {unlocked:localizedNumber(cores.filter((core) => core.unlocked).length), total:localizedNumber(cores.length || 7)});
    for (const rarity of CORE_RARITY_ORDER) {
      const rarityCores = cores.filter((core) => (core.rarity || "common") === rarity);
      if (!rarityCores.length) continue;
      const group = document.createElement("section");
      group.className = "core-rarity-group";
      group.dataset.rarity = rarity;
      const heading = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = moduleRarityLabel(rarity);
      const summary = document.createElement("small");
      summary.textContent = localizedMessage("core.unlocked_count", {unlocked:localizedNumber(rarityCores.filter((core) => core.unlocked).length), total:localizedNumber(rarityCores.length)});
      heading.append(title, summary);
      const list = document.createElement("div");
      list.className = "core-rarity-list";
      for (const core of rarityCores) {
        const tile = coreCollectionTile(core, { selected: core.selected });
        tile.addEventListener("click", () => showCoreQuickActions(core, tile));
        list.appendChild(tile);
      }
      group.append(heading, list);
      host.appendChild(group);
    }
  }

  async function selectCollectionCore() {
    const core = activeMetaCore();
    if (!core?.unlocked || core.selected) return { ok: false };
    const button = document.getElementById("core-quick-select");
    if (button) button.disabled = true;
    try {
      const payload = await requestJsonWithDeadline(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/core`, {
        method: "PUT",
        body: JSON.stringify({ core_type_id: core.id }),
      });
      metaProgressionState = payload;
      renderMetaHubScreens();
      document.getElementById("core-quick-actions")?.setAttribute("hidden", "");
      const status = document.getElementById("core-action-status");
      if (status) status.textContent = "";
      return { ok: true };
    } catch (error) {
      const status = document.getElementById("core-action-status");
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      if (button) button.disabled = false;
      return { ok: false };
    }
  }

  async function mutateSelectedCore(suffix) {
    const core = activeMetaCore();
    if (!core) return;
    await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/cores/${core.id}/${suffix}`);
    selectedCollectionCoreId = core.id;
    openCoreDetail();
  }

  function renderCoreDetailTab(tabName) {
    const core = activeMetaCore();
    const host = document.getElementById("core-detail-tab-content");
    if (!core || !host) return;
    host.replaceChildren();
    host.dataset.tab = tabName;
    const intro = document.createElement("p");
    intro.className = "module-detail-tab-intro";
    if (tabName === "stats") {
      intro.textContent = localizedMessage("core.stats_intro");
      const list = document.createElement("dl");
      for (const [label, value] of [
        ["module.rarity", moduleRarityLabel(core.rarity)],
        ["core.battle_role", localizedRecordText(core, "role")],
        ["core.energy_generation", localizedMessage("module.energy_per_second", {energy:localizedNumber(core.energy_per_second)})],
        ["core.energy_storage", core.energy_capacity],
        ["core.level_label", `${core.level} / 15`],
      ]) {
        const row = document.createElement("div");
        const term=document.createElement("dt");
        term.textContent=localizedMessage(label);
        const description=document.createElement("dd");
        description.textContent=localizedUiText(String(value));
        row.append(term,description);
        list.appendChild(row);
      }
      host.appendChild(list);
    } else if (tabName === "skills") {
      intro.textContent = localizedMessage("core.skills_intro");
      const tree = document.createElement("div");
      tree.className = "core-skill-tree";
      for (const skill of core.skills || []) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = skill.learned ? "is-selected" : "";
        const state = skill.learned ? localizedMessage("core.skill_selected") : skill.tier_selected ? localizedMessage("core.other_branch_selected") : core.level < skill.level ? localizedMessage("core.level_required", {level:localizedNumber(skill.level)}) : localizedMessage("currency.flux", {amount:localizedNumber(skill.flux_cost)});
        const name=document.createElement("strong");
        name.textContent=localizedRecordText(skill, "name");
        const detail=document.createElement("small");
        detail.textContent=localizedMessage("core.skill_level_state", {level:localizedNumber(skill.level), state});
        button.append(name,detail);
        button.disabled = !core.unlocked || skill.learned || skill.tier_selected || core.level < skill.level || Number(metaProgressionState?.flux_shards || 0) < Number(skill.flux_cost || 0);
        button.addEventListener("click", async () => {
          button.disabled = true;
          try { await mutateSelectedCore(`skills/${skill.id}`); }
          catch (error) { document.getElementById("core-detail-status").textContent = error.message; button.disabled = false; }
        });
        tree.appendChild(button);
      }
      host.appendChild(tree);
    } else {
      intro.textContent = localizedRecordText(core, "role");
      const overview = document.createElement("div");
      overview.className = "module-overview-grid";
      for (const [label, value] of [
        ["core.rarity_upper", moduleRarityLabel(core.rarity)],
        ["module.battle_role", localizedRecordText(core, "role")],
        ["module.unlock", localizedMessage("arena.numbered", {arena:localizedNumber(core.unlock_arena)})],
        ["core.energy_upper", localizedMessage("module.energy_per_second", {energy:localizedNumber(core.energy_per_second)})],
        ["module.next_level", core.next_upgrade_cost ? localizedMessage("core.upgrade_cost", {shards:localizedNumber(core.next_upgrade_cost.shards), flux:localizedNumber(core.next_upgrade_cost.flux_shards)}) : localizedMessage("core.max_level")],
      ]) {
        const card = document.createElement("div");
        const caption=document.createElement("span");
        caption.textContent=localizedMessage(label);
        const amount=document.createElement("strong");
        amount.textContent=localizedUiText(String(value));
        card.append(caption,amount);
        overview.appendChild(card);
      }
      host.appendChild(overview);
    }
    host.prepend(intro);
  }

  function openCoreDetail(tabName = "overview") {
    const core = activeMetaCore()
      || metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0];
    if (!core) return;
    selectedCollectionCoreId = core.id;
    const dialog = document.getElementById("core-detail-dialog");
    const visual = applyCoreVisualIdentity(dialog, core.id);
    const setText = (id, value) => { const target = document.getElementById(id); if (target) target.textContent = String(value); };
    setText("core-detail-name", localizedRecordText(core, "name"));
    setText("core-detail-rarity", moduleRarityLabel(core.rarity));
    setText("core-detail-level", localizedMessage("core.level", {level:localizedNumber(core.level)}));
    setText("core-detail-selected-state", localizedMessage(core.selected ? "core.selected_upper" : core.unlocked ? "core.ready_upper" : "reward.locked_upper"));
    const cost = core.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const owned = Number(core.shards || 0) + Number(core.legacy_shards || 0);
    setText("core-detail-shards", cost ? `${localizedNumber(owned)} / ${localizedNumber(required)}` : localizedMessage("core.max_level"));
    const progress = document.getElementById("core-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, owned) : required; }
    const art = document.getElementById("core-detail-art");
    if (art) { art.textContent = visual.glyph; applyCoreVisualIdentity(art, core.id); }
    const stats = document.getElementById("core-detail-stats");
    if (stats) stats.innerHTML = `<div><span>${localizedMessage("core.energy")}</span><strong>${localizedMessage("module.energy_per_second", {energy:localizedNumber(core.energy_per_second)})}</strong></div><div><span>${localizedMessage("core.storage")}</span><strong>${localizedNumber(core.energy_capacity)}</strong></div><div><span>${localizedMessage("core.skills")}</span><strong>${localizedNumber((core.skills || []).filter((skill) => skill.learned).length)}</strong></div>`;
    const select = document.getElementById("core-detail-select");
    if (select) { select.disabled = !core.unlocked || core.selected; select.textContent = localizedMessage(core.selected ? "core.selected_upper" : core.unlocked ? "core.select_upper" : "reward.locked_upper"); }
    const upgrade = document.getElementById("core-detail-upgrade");
    const canUpgrade = core.unlocked && cost && owned >= Number(cost.shards) && Number(metaProgressionState?.flux_shards || 0) >= Number(cost.flux_shards);
    if (upgrade) { upgrade.disabled = !canUpgrade; upgrade.textContent = cost ? localizedMessage("core.upgrade_button", {flux:localizedNumber(cost.flux_shards)}) : localizedMessage("core.max_level"); }
    setText("core-detail-status", !core.unlocked ? localizedMessage("core.unlock_arena", {arena:localizedNumber(core.unlock_arena)}) : cost && !canUpgrade ? localizedMessage("core.upgrade_required", {shards:localizedNumber(cost.shards), flux:localizedNumber(cost.flux_shards)}) : "");
    for (const button of document.querySelectorAll("[data-core-detail-tab]")) button.classList.toggle("is-active", button.dataset.coreDetailTab === tabName);
    renderCoreDetailTab(tabName);
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function navigateCoreDetail(direction) {
    const items = metaProgressionState?.cores?.types || [];
    if (!items.length) return;
    const current = Math.max(0, items.findIndex((item) => item.id === selectedCollectionCoreId));
    selectedCollectionCoreId = items[(current + direction + items.length) % items.length].id;
    openCoreDetail();
  }

  function renderHomeArena() {
    const { rank, rating, floor, ceiling, progress } = arenaViewModel();
    const arenaCard = document.getElementById("home-arena-card");
    const hasClaimableRoadReward = [
      ...(metaProgressionState?.arena_path || []),
      ...(metaProgressionState?.rank_stages || []),
    ].some((stage) => (stage.nodes || []).some(
      (node) => (
        node.claimable === true
        && node.claimed !== true
        && Object.keys(node.rewards || {}).length > 0
      )
    ));
    arenaCard?.classList.toggle("is-reward-ready", hasClaimableRoadReward);
    if (arenaCard) {
      arenaCard.setAttribute(
        "aria-label",
        hasClaimableRoadReward
          ? "Devre yolu · Alınabilir ödül var"
          : "Devre yolu"
      );
    }
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("home-arena-name", rank.kind !== "arena" ? localizedUiText(rank.name_tr) : localizedMessage("arena.numbered", {arena:localizedNumber(rank.index || 1)}));
    setText("home-arena-progress-copy", rank.next_stage ? localizedMessage("arena.progress_to_next", {current:localizedNumber(rating), next:localizedNumber(ceiling)}) : localizedMessage("profile.trophies", {count:localizedNumber(rating)}));
    const arenaTitle = rank.name_tr && !/^Arena\s+\d+$/i.test(rank.name_tr)
      ? localizedMessage("arena.name_and_rank", {arena:localizedNumber(rank.index || 1), name:localizedUiText(rank.name_tr)})
      : localizedMessage("arena.numbered", {arena:localizedNumber(rank.index || 1)});
    setText("arena-detail-title", rank.kind !== "arena" ? localizedRecordText(rank, "name") : arenaTitle);
    setText("arena-detail-rating", localizedMessage("profile.trophies", {count:localizedNumber(rating)}));
    setText("arena-detail-range", rank.next_stage ? `${localizedNumber(rating - floor)} / ${localizedNumber(ceiling - floor)}` : localizedMessage("arena.max_stage"));
    setText("arena-detail-next", rank.next_stage ? localizedMessage("arena.next_stage", {name:localizedUiText(rank.next_stage.name_tr), trophies:localizedNumber(ceiling)}) : localizedMessage("arena.complete"));
    renderArenaPath();
    const segments = document.getElementById("home-arena-segments");
    if (segments) {
      segments.replaceChildren();
      const arena = rank.kind === "arena"
        ? (metaProgressionState?.arena_path || []).find((item) => Number(item.index) === Number(rank.index))
        : null;
      const league = rank.kind !== "arena"
        ? (metaProgressionState?.rank_stages || []).find((item) => item.id === rank.id)
        : null;
      const nodes = (arena?.nodes || league?.nodes || []).filter(
        (node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= floor
      );
      const stops = nodes.length ? nodes : Array.from({ length: 4 }, (_, index) => ({ trophies: floor + ((ceiling - floor) / 4) * (index + 1) }));
      stops.forEach((node, index) => {
        const segment = document.createElement("i");
        segment.className = rating >= Number(node.trophies) ? "is-complete" : (index === stops.findIndex((item) => rating < Number(item.trophies)) ? "is-current" : "");
        segment.title = localizedMessage("arena.node_title", {trophies:localizedNumber(node.trophies), reward:node.description_tr ? localizedMessage("arena.node_reward_suffix", {description:localizedArenaRewardDescription(node)}) : ""});
        segments.appendChild(segment);
      });
    }
  }

  function showCollectionQuickActions(item, anchor) {
    selectedCollectionModuleId = item.definition_id;
    pendingDeckModuleInstanceId = null;
    renderDeckStrip(document.getElementById("module-deck-strip"), { editable: true });
    const panel = document.getElementById("module-quick-actions");
    if (!panel) return;
    const name = document.getElementById("module-quick-name");
    const select = document.getElementById("module-quick-select");
    if (name) name.textContent = localizedUiText(item.name_tr);
    const selected = deckEditorSlots
      .filter(Boolean)
      .map(clientDefinitionId)
      .includes(item.definition_id);
    if (select) {
      select.textContent = localizedUiText(selected ? "Çıkar" : "Seç");
      select.disabled = item.unlocked === false && !selected;
    }
    panel.hidden = false;
    panel.dataset.category = item.category || "";
    for (const tile of document.querySelectorAll(".collection-module-tile")) {
      tile.classList.toggle("is-focused", tile === anchor);
    }
    const screen = document.getElementById("modules-screen");
    if (screen) {
      const screenRect = screen.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const panelWidth = Math.max(anchorRect.width + 12, panel.offsetWidth || 0);
      const proposedLeft = anchorRect.left - screenRect.left + screen.scrollLeft - ((panelWidth - anchorRect.width) / 2);
      panel.style.left = `${Math.max(4, Math.min(screen.scrollWidth - panelWidth - 4, proposedLeft))}px`;
      panel.style.top = `${anchorRect.bottom - screenRect.top + screen.scrollTop - 3}px`;
    }
  }

  function renderModuleCollection() {
    document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
    const state = metaProgressionState || fallbackMetaProgression();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("module-deck-count", `${deckEditorSlots.filter(Boolean).length} / 6`);
    renderDeckStrip(document.getElementById("module-deck-strip"), { editable: true });
    renderPresetStrip(document.getElementById("module-preset-strip"));
    const host = document.getElementById("module-collection-grid");
    if (!host) return;
    host.replaceChildren();
    const selected = new Set(deckEditorSlots.filter(Boolean).map(clientDefinitionId));
    for (const item of state.module_collection || []) {
      if (activeModuleFilter !== "all" && item.category !== activeModuleFilter) continue;
      const tile = unifiedModuleTile(item, { collection: true, selected: selected.has(item.definition_id) });
      tile.addEventListener("click", () => showCollectionQuickActions(item, tile));
      host.appendChild(tile);
    }
  }

  function chestTier(definition) {
    return definition?.visual_tier
      || ({field_3h:"bronze", circuit_8h:"silver", core_24h:"gold", diamond_24h:"diamond"})[definition?.id]
      || definition?.tier
      || "bronze";
  }

  function chestVisualMarkup(tier, { large = false, visualId = "" } = {}) {
    const customBase = {
      weekly_first:"diamond", weekly_second:"gold", weekly_third:"silver",
      team_first:"diamond", team_second:"gold", team_third:"silver",
    }[tier];
    const safeTier = ["bronze", "silver", "gold", "diamond"].includes(tier) ? tier : customBase || "bronze";
    const safeVisual = String(visualId || "").replace(/[^a-z0-9_-]/gi, "");
    return `<span class="chest-visual chest-visual-${safeTier}${safeVisual ? ` chest-visual-event chest-visual-${safeVisual}` : ""}${large ? " chest-visual-large" : ""}" aria-hidden="true"><i></i><b></b><em>${safeVisual.startsWith("team_") ? "⬡" : safeVisual.startsWith("weekly_") ? "✦" : "◆"}</em></span>`;
  }

  function renderShop() {
    const state = metaProgressionState || fallbackMetaProgression();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("shop-flux-balance", localizedMessage("currency.flux", {amount:localizedNumber(state.flux_shards || 0)}));
    setText("shop-credit-balance", localizedMessage("currency.credits_short", {amount:localizedNumber(state.circuit_credits || 0)}));
    const giftHost = document.getElementById("gift-chest-list");
    if (giftHost) {
      giftHost.replaceChildren();
      const definitions = state.chests?.definitions || [];
      const inventory = state.chests?.inventory || [];
      const slots = state.chests?.slots || [];
      for (const definition of definitions) {
        const owned = inventory.find(
          (item) => item.definition_id === definition.id
        ) || {
          count: slots.filter((slot) => slot.definition_id === definition.id).length,
          openable_count: slots.filter((slot) => slot.definition_id === definition.id).length,
          locked_count: 0,
        };
        const ownedCount = Math.max(0, Number(owned.count || 0));
        const openableCount = Math.max(0, Number(owned.openable_count || 0));
        const card = document.createElement("article");
        card.className = "shop-chest-card";
        const tier = chestTier(definition);
        card.dataset.tier = tier;
        const remaining = Math.max(0, Number(definition.claim_remaining_seconds || 0));
        card.dataset.definitionId = definition.id;
        card.dataset.claimRemaining = String(remaining);
        card.innerHTML = chestVisualMarkup(tier);
        const chestName=document.createElement("strong");
        chestName.textContent=localizedMessage("chest.owned_count", {name:localizedUiText(definition.name_tr), count:localizedNumber(ownedCount)});
        card.appendChild(chestName);
        if (ownedCount > 0) {
          const inventoryStatus = document.createElement("small");
          inventoryStatus.className = "chest-inventory-status";
          inventoryStatus.textContent = localizedMessage("chest.openable_count", {openable:localizedNumber(openableCount), owned:localizedNumber(ownedCount)});
          card.appendChild(inventoryStatus);
        }
        if (remaining > 0) {
          const countdown = document.createElement("small");
          countdown.className = "chest-countdown";
          countdown.textContent = localizedMessage("chest.renewal_countdown", {time:formatChestCountdown(remaining)});
          card.appendChild(countdown);
        }
        const actions = document.createElement("div");
        actions.className = "shop-chest-actions";
        const giftAction = document.createElement("button");
        giftAction.type = "button";
        giftAction.className = "gift-chest-action";
        giftAction.textContent = remaining > 0 ? formatChestCountdown(remaining) : localizedMessage("chest.open_gift");
        giftAction.disabled = Boolean(
          state.unavailable
          || remaining > 0
          || definition.claim_available === false
        );
        giftAction.addEventListener("click", () => claimGiftChest(definition.id));
        actions.appendChild(giftAction);
        if (ownedCount > 0) {
          const openAllAction = document.createElement("button");
          openAllAction.type = "button";
          openAllAction.className = "chest-open-all-action";
          openAllAction.textContent = localizedMessage("chest.open_all");
          openAllAction.disabled = Boolean(state.unavailable || openableCount === 0);
          openAllAction.addEventListener("click", () => openAllAvailableChests(definition.id));
          actions.appendChild(openAllAction);
        }
        card.appendChild(actions);
        giftHost.appendChild(card);
      }
    }
    const offerHost = document.getElementById("daily-shop-offers");
    const resetCopy = document.getElementById("shop-reset-copy");
    if (resetCopy) {
      const resetAt = state.shop?.reset_at ? new Date(state.shop.reset_at) : null;
      resetCopy.textContent = resetAt && !Number.isNaN(resetAt.getTime())
        ? `${localizedUiText("Pzt")} ${localizedDate(resetAt, {hour:"2-digit", minute:"2-digit"})}`
        : localizedMessage("shop.weekly");
    }
    if (offerHost) {
      offerHost.replaceChildren();
      for (const offer of state.shop?.offers || []) {
        const card = document.createElement("article");
        card.className = "daily-offer-card";
        card.dataset.tier = offer.tier;
        card.dataset.offerId = offer.id;
        card.innerHTML = chestVisualMarkup(offer.tier);
        const offerCopy=document.createElement("div");
        const offerName=document.createElement("strong");
        offerName.textContent=localizedUiText(offer.name_tr);
        offerCopy.appendChild(offerName);
        card.appendChild(offerCopy);
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = offer.purchased ? localizedMessage("reward.claimed") : localizedMessage(offer.currency === "flux_shards" ? "currency.flux" : "currency.credits_short", {amount:localizedNumber(offer.cost)});
        action.disabled = Boolean(state.unavailable || offer.purchased || Number(state[offer.currency] || 0) < offer.cost);
        action.addEventListener("click", () => purchaseShopOffer(offer.id));
        card.appendChild(action);
       offerHost.appendChild(card);
     }
   }
    ensureShopCountdownTimer();
 }

 function formatChestCountdown(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours) return localizedMessage("time.chest_hours", {hours:localizedNumber(hours), minutes:String(minutes).padStart(2, "0")});
    if (minutes) return localizedMessage("time.chest_minutes", {minutes:localizedNumber(minutes), seconds:String(secs).padStart(2, "0")});
    return localizedMessage("time.chest_seconds", {seconds:localizedNumber(secs)});
  }

  let shopCountdownTimer = null;
  function ensureShopCountdownTimer() {
    if (shopCountdownTimer) return;
    shopCountdownTimer = window.setInterval(() => {
      if (document.body.dataset.appScreen !== "shop") return;
      let becameAvailable = false;
      for (const card of document.querySelectorAll("[data-definition-id][data-claim-remaining]")) {
        const previous = Math.max(0, Number(card.dataset.claimRemaining || 0));
        const next = Math.max(0, previous - 1);
        card.dataset.claimRemaining = String(next);
        const countdown = card.querySelector(".chest-countdown");
        const button = card.querySelector(".gift-chest-action");
        if (countdown) countdown.textContent = localizedMessage("chest.renewal_countdown", {time:formatChestCountdown(next)});
        if (button && next === 0 && previous > 0) becameAvailable = true;
        if (button && next === 0 && !metaProgressionState?.unavailable) {
          button.disabled = false;
          button.textContent = localizedMessage("chest.open_gift");
          countdown?.remove();
        }
      }
      if (becameAvailable) loadMetaProgression();
    }, 1000);
  }

  async function metaProgressionMutation(url) {
    let entry = pendingMetaRequests.get(url);
    if (entry?.inFlight) throw new Error("Bu işlem sürüyor; lütfen bekle.");
    if (!entry) {
      entry = {requestId: laboratoryRequestId("meta"), inFlight: false};
      pendingMetaRequests.set(url, entry);
    }
    entry.inFlight = true;
    try {
      try {
        const payload = await requestJsonWithDeadline(url, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ request_id: entry.requestId }),
        }, 12000);
        // Only a confirmed response ends this logical action. A network retry
        // uses the same receipt id, so a lost response cannot duplicate a
        // chest reward, module level or currency spend.
        pendingMetaRequests.delete(url);
        metaProgressionState = payload.meta_progression || payload;
        if (payload.profile) profileState.applyProfile(payload.profile);
        renderProfileSummary();
        renderMetaHubScreens();
        return payload;
      } catch (error) {
        if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
          pendingMetaRequests.delete(url);
        }
        throw new Error(
          error?.code === "request_timeout"
            ? error.message
            : (error?.message || "Sunucu bağlantısı kesildi. İşlemi yeniden deneyebilirsin.")
        );
      }
    } finally {
      entry.inFlight = false;
    }
  }

  function showChestReveal(receipt) {
    if (!receipt) return;
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === receipt.definition_id
    );
    const offer = metaProgressionState?.shop?.offers?.find(
      (item) => item.id === receipt.offer_id
    );
    const tier = offer?.tier || chestTier(definition || { id: receipt.definition_id });
    const rewards = receipt.rewards || {};
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const title = document.getElementById("chest-reveal-title");
    const host = document.getElementById("chest-reveal-rewards");
    const kicker = document.getElementById("chest-reveal-kicker");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    if (title) title.textContent = localizedRecordText(definition, "name") || localizedRecordText(offer, "name") || localizedUiText("Sandık");
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    if (host) {
      host.replaceChildren();
      host.appendChild(createRewardRows(rewards));
    }
    const dialog = document.getElementById("chest-reveal-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function showBulkChestReveal(batchReceipt) {
    const receipts = batchReceipt?.receipts || [];
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === batchReceipt?.definition_id
    );
    const tier = chestTier(definition || { id: batchReceipt?.definition_id });
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const title = document.getElementById("chest-reveal-title");
    const host = document.getElementById("chest-reveal-rewards");
    const kicker = document.getElementById("chest-reveal-kicker");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    if (title) title.textContent = localizedMessage("chest.opened_title", {name:localizedUiText(definition?.name_tr || "Sandık"), count:localizedNumber(receipts.length)});
    if (kicker) {
      kicker.hidden = false;
      kicker.textContent = batchReceipt?.partial
        ? localizedMessage("chest.opened_remaining", {opened:localizedNumber(receipts.length), remaining:localizedNumber(batchReceipt.remaining_count || 0)})
        : "TÜM AÇILABİLİR SANDIKLAR AÇILDI";
    }
    if (host) {
      host.replaceChildren();
      const section = document.createElement("section");
      section.className = "bulk-chest-reward";
      const label = document.createElement("small");
      label.textContent = localizedMessage("chest.total_rewards", {count:localizedNumber(receipts.length)});
      section.append(label, createBulkRewardRows(batchReceipt));
      host.appendChild(section);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    const dialog = document.getElementById("chest-reveal-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function showChestOpening({ tier = "bronze", title = "Sandık" } = {}) {
    const dialog = document.getElementById("chest-reveal-dialog");
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const host = document.getElementById("chest-reveal-rewards");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "opening"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    const kicker = document.getElementById("chest-reveal-kicker");
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    const titleEl = document.getElementById("chest-reveal-title");
    if (titleEl) titleEl.textContent = title;
    // Opening is visual-only; reward details appear after the server confirms
    // the receipt, without exposing timing/status metadata to the player.
    if (host) host.innerHTML = '<div class="chest-opening-progress" aria-label="Sandık açılıyor"><strong>•••</strong></div>';
    if (close) { close.disabled = true; close.textContent = "AÇILIYOR…"; }
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function showChestFailure(error) {
    const card = document.getElementById("chest-reveal-card");
    const host = document.getElementById("chest-reveal-rewards");
    const kicker = document.getElementById("chest-reveal-kicker");
    const close = document.getElementById("chest-reveal-close");
    if (card) card.dataset.state = "error";
    if (kicker) { kicker.hidden = false; kicker.textContent = "SANDIK AÇILAMADI"; }
    if (host) {
      const box=document.createElement("div");
      const message=document.createElement("span");
      message.textContent=error instanceof Error ? error.message : String(error);
      box.appendChild(message);
      host.replaceChildren(box);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  function restoreShopAction({ chestId = null, definitionId = null, offerId = null } = {}) {
    let card = null;
    if (chestId) card = [...document.querySelectorAll("[data-chest-id]")]
      .find((item) => item.dataset.chestId === String(chestId));
    if (!card && definitionId) card = [...document.querySelectorAll("[data-definition-id]")]
      .find((item) => item.dataset.definitionId === String(definitionId));
    if (!card && offerId) card = [...document.querySelectorAll("[data-offer-id]")]
      .find((item) => item.dataset.offerId === String(offerId));
    const button = card?.querySelector("button");
    if (button) button.disabled = false;
  }

  function showClaimedChest(receipt) {
    if (receipt?.rewards) {
      showChestReveal(receipt);
      return;
    }
    const chest = receipt?.chest || {};
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === chest.definition_id
    );
    const tier = chestTier(definition || chest);
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const title = document.getElementById("chest-reveal-title");
    const kicker = document.getElementById("chest-reveal-kicker");
    const host = document.getElementById("chest-reveal-rewards");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    if (title) title.textContent = localizedRecordText(chest, "name") || localizedRecordText(definition, "name") || localizedUiText("Hediye Sandık");
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    if (host) {
      const box = document.createElement("div");
      const label = document.createElement("span");
      const readiness = document.createElement("strong");
      label.textContent = localizedUiText("SANDIK");
      readiness.textContent = localizedUiText("Açılmaya hazır");
      box.append(label, readiness);
      host.replaceChildren(box);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  async function purchaseShopOffer(offerId) {
    const status = document.getElementById("shop-action-status");
    const offer = metaProgressionState?.shop?.offers?.find((item) => item.id === offerId);
    showChestOpening({ tier: offer?.tier || "bronze", title: localizedRecordText(offer, "name") || localizedUiText("Sandık") });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/shop/${encodeURIComponent(offerId)}/purchase`
      );
      if (status) status.textContent = "";
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      restoreShopAction({ offerId });
      showChestFailure(error);
    }
  }

  async function openGiftChest(chestId) {
    const status = document.getElementById("shop-action-status");
    const chest = metaProgressionState?.chests?.slots?.find((item) => item.chest_id === chestId);
    const definition = metaProgressionState?.chests?.definitions?.find((item) => item.id === chest?.definition_id);
    showChestOpening({ tier: chestTier(definition || chest || {}), title: localizedRecordText(definition, "name") || localizedRecordText(chest, "name") || localizedUiText("Sandık") });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/chests/${encodeURIComponent(chestId)}/open`
      );
      if (status) status.textContent = "";
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      restoreShopAction({ chestId });
      showChestFailure(error);
    }
  }

  async function openAllAvailableChests(definitionId) {
    const status = document.getElementById("shop-action-status");
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === definitionId
    );
    showChestOpening({
      tier: chestTier(definition || { id: definitionId }),
      title: localizedMessage("chest.collection_title", {name:localizedUiText(definition?.name_tr || "Sandık")}),
    });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/chests/${encodeURIComponent(definitionId)}/open-all`
      );
      if (status) status.textContent = payload.receipt?.partial
        ? "Açılabilen sandıklar işlendi; açılamayan sandıklar envanterde korundu."
        : "";
      showBulkChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      restoreShopAction({ definitionId });
      showChestFailure(error);
    }
  }

  async function claimGiftChest(definitionId) {
    const status = document.getElementById("shop-action-status");
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === definitionId
    );
    showChestOpening({
      tier: chestTier(definition || { id: definitionId }),
      title: localizedRecordText(definition, "name") || localizedUiText("Hediye Sandık"),
    });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/chests/gifts/${encodeURIComponent(definitionId)}/claim`
      );
      if (status) status.textContent = "";
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      restoreShopAction({ definitionId });
      showChestFailure(error);
    }
  }

  async function commitDeckEditorSlots() {
    const status = document.getElementById("module-action-status");
    const revision = ++deckEditRevision;
    while (deckEditorSlots.length < 6) deckEditorSlots.push(null);
    pendingDeckModuleInstanceId = null;
    const ids = deckEditorSlots.filter(Boolean);
    renderMetaHubScreens();
    if (ids.length !== 6) {
      if (status) status.textContent = localizedMessage("deck.selected_count", {count:ids.length});
      return { ok: true, pending: true };
    }
    const result = battlePoolSelection.setSelection(ids);
    if (!result.ok) {
      if (status) status.textContent = result.reason;
      return result;
    }
    const presetName = activeBattlePoolPresetName;
    const definitionIds = ids.map(clientDefinitionId);
    const editedPreset = battlePoolPresets.find((preset) => preset.name === presetName);
    if (editedPreset) editedPreset.module_definition_ids = [...definitionIds];
    renderMetaHubScreens();
    if (status) status.textContent = "Deste kaydediliyor…";
    const save = async () => {
      const profile = await requestJsonWithDeadline(`/profile/${encodeURIComponent(participantPlayerId)}/battle-pool`, {
        method: "PUT",
        body: JSON.stringify({ battle_pool_ids: definitionIds }),
      });
      let presetPayload = null;
      if (presetName) {
        presetPayload = await requestJsonWithDeadline(`/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`, {
          method: "PUT",
          body: JSON.stringify({ name: presetName, battle_pool_ids: definitionIds }),
        });
      }
      return { profile, presetPayload };
    };
    // Save rapid edits in order so an older response cannot restore the old deck.
    deckSaveQueue = deckSaveQueue.catch(() => {}).then(save);
    try {
      const saved = await deckSaveQueue;
      if (revision !== deckEditRevision) return { ok: true };
      profileState.applyProfile(saved.profile);
      if (saved.presetPayload?.presets) {
        battlePoolPresets = withStarterBattlePoolPresets(
          saved.presetPayload.presets
        );
      }
      if (presetName === activeBattlePoolPresetName) activeBattlePoolPresetBaseline = [...definitionIds];
      if (status) status.textContent = localizedMessage("deck.saved", {name:presetName || localizedMessage("deck.active_name")});
    } catch (error) {
      if (revision !== deckEditRevision) return { ok: false };
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      renderBattlePoolSelection();
      renderMetaHubScreens();
      return { ok: false };
    }
    renderBattlePoolSelection();
    renderMetaHubScreens();
    return { ok: true };
  }

  async function selectCollectionModule() {
    if (activeMetaModule()?.unlocked === false) return;
    const instanceId = definitionIdsToInstanceIds([selectedCollectionModuleId])[0];
    const status = document.getElementById("module-action-status");
    if (!instanceId) {
      if (status) status.textContent = localizedMessage("module.card_not_loaded");
      return;
    }
    const existingIndex = deckEditorSlots.indexOf(instanceId);
    if (existingIndex >= 0) {
      deckEditorSlots[existingIndex] = null;
      document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
      await commitDeckEditorSlots();
      return;
    }

    // The editor is always a six-slot model. Older sessions can still contain
    // a short array, so treat its end as the first empty slot as well.
    while (deckEditorSlots.length < 6) deckEditorSlots.push(null);
    const firstEmpty = deckEditorSlots.findIndex((slot) => !slot);
    if (firstEmpty >= 0) {
      deckEditorSlots[firstEmpty] = instanceId;
      document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
      await commitDeckEditorSlots();
      return;
    }

    pendingDeckModuleInstanceId = instanceId;
    document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
    if (status) status.textContent = localizedMessage("module.deck_full_replace");
    renderMetaHubScreens();
    document.getElementById("module-deck-strip")?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  function activeMetaModule() {
    return (metaProgressionState?.module_collection || fallbackMetaProgression().module_collection)
      .find((item) => item.definition_id === selectedCollectionModuleId) || null;
  }

  function createModuleEffectList(effectLines = []) {
    const section = document.createElement("section");
    section.className = "module-effect-panel";
    const heading = document.createElement("strong");
    heading.textContent = localizedMessage("module.real_battle_effects");
    const list = document.createElement("ul");
    for (const effectLine of effectLines) {
      const item = document.createElement("li");
      item.textContent = localizedUiText(effectLine);
      list.appendChild(item);
    }
    if (!list.childElementCount) {
      const item = document.createElement("li");
      item.textContent = localizedMessage("module.no_extra_effects");
      list.appendChild(item);
    }
    section.append(heading, list);
    return section;
  }

  function renderModuleDetailTab(tabName) {
    const item = activeMetaModule();
    const host = document.getElementById("module-detail-tab-content");
    if (!item || !host) return;
    host.replaceChildren();
    host.dataset.tab = tabName;
    const text = document.createElement("p");
    text.className = "module-detail-tab-intro";
    const stats = item.stats || {};
    if (tabName === "stats") {
      text.textContent = localizedMessage("module.stats_intro");
      const rarityBonuses = stats.rarity_bonuses || {};
      const rarityPercent = (value, inverse=false) => {
        const delta = Math.round(Math.abs(Number(value || 1) - 1) * 100);
        if (delta === 0) return "0%";
        return `${inverse ? "-" : "+"}${delta}%`;
      };
      const rarityImpact = [
        localizedMessage("module.rarity_hp", {value:rarityPercent(rarityBonuses.hp)}),
        localizedMessage("module.rarity_damage", {value:rarityPercent(rarityBonuses.attack)}),
        localizedMessage("module.rarity_effect", {value:rarityPercent(rarityBonuses.effect)}),
        localizedMessage("module.rarity_cooldown", {value:rarityPercent(rarityBonuses.cooldown, true)}),
        localizedMessage("module.rarity_energy", {value:rarityPercent(rarityBonuses.energy, true)}),
      ].join(" · ");
      const entries = [["module.class", poolCategoryLabel(item.category)], ["module.rarity", moduleRarityLabel(item.rarity)], ["module.rarity_advantage", rarityImpact], ["module.hp_label", stats.max_hp], ["module.damage_label", stats.base_damage], ["module.cooldown", localizedMessage("time.seconds_short", {count:localizedNumber(Number(stats.cooldown_ms || 0) / 1000)})], ["module.effect_multiplier", localizedNumber(stats.effect_multiplier, {maximumFractionDigits:2})], ["module.energy_consumption", localizedMessage("module.energy_per_second", {energy:localizedNumber(stats.energy_consumption || 0)})], ["module.current_cost", item.current_cost]];
      const list = document.createElement("dl");
      for (const [label, rawValue] of entries) {
        const row = document.createElement("div"), name = document.createElement("dt"), value = document.createElement("dd");
        name.textContent = localizedMessage(label);
        value.textContent = String(rawValue ?? "—");
        row.append(name, value); list.appendChild(row);
      }
      host.appendChild(list);
      host.appendChild(createModuleEffectList(localizedRecordText(item, "effect_lines") || []));
      const moduleName = (id) => localizedUiText((metaProgressionState?.module_collection || []).find((module) => module.definition_id === id)?.name_tr || id);
      const counters = document.createElement("div");
      counters.className = "module-counter-grid";
      for (const [label, ids, className] of [["module.strong_against", item.strong_against, "is-strong"], ["module.weak_against", item.weak_against, "is-weak"], ["module.synergy_with", item.synergy_with, "is-synergy"]]) {
        const card = document.createElement("section");
        card.className = className;
        const heading = document.createElement("strong");
        heading.textContent = localizedMessage(label);
        const copy = document.createElement("span");
        copy.textContent = ids?.length ? ids.map(moduleName).join(" · ") : localizedMessage("module.no_special_matchup");
        card.append(heading, copy);
        counters.appendChild(card);
      }
      host.appendChild(counters);
    } else if (tabName === "talents") {
      const selectedTalent = (item.talents || [])
        .flatMap((node) => node.choices || [])
        .find((choice) => (item.talents || []).some((node) => node.selected === choice.id));
      text.textContent = selectedTalent ? localizedRecordText(selectedTalent, "description") : localizedMessage("module.tap_skill_for_description");
      for (const node of item.talents || []) {
        const row = document.createElement("section");
        row.className = "module-talent-node";
        row.dataset.selected = node.selected || "";
        const heading = document.createElement("strong");
        heading.textContent = localizedMessage("module.skill_level_cost", {level:localizedNumber(node.level), flux:localizedNumber(node.flux_cost)});
        const connector = document.createElement("span");
        connector.className = "module-talent-connector";
        connector.setAttribute("aria-hidden", "true");
        const choices = document.createElement("div");
        choices.className = "module-talent-choices";
        row.append(heading, connector, choices);
        node.choices.forEach((choice, choiceIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          const canChoose = item.unlocked
            && !node.selected
            && Number(item.level) + 1 >= node.level
            && Number(metaProgressionState?.flux_shards || 0) >= node.flux_cost;
          button.className = `${choiceIndex === 0 ? "is-left-choice" : "is-right-choice"}${node.selected === choice.id ? " is-selected" : ""}${canChoose ? "" : " is-unavailable"}`;
          const choiceState = node.selected === choice.id
            ? localizedMessage("module.skill_selected")
            : node.selected ? localizedMessage("module.other_branch_selected")
              : Number(item.level) + 1 < node.level ? localizedMessage("core.level_required", {level:localizedNumber(node.level)})
                : Number(metaProgressionState?.flux_shards || 0) < node.flux_cost ? localizedMessage("module.flux_required", {flux:localizedNumber(node.flux_cost)})
                  : localizedMessage("cosmetic.select");
          const name=document.createElement("strong");
          name.textContent=localizedRecordText(choice, "name");
          const state=document.createElement("small");
          state.textContent=choiceState;
          button.append(name,state);
          button.dataset.selectable = String(canChoose);
          button.setAttribute("aria-label", localizedMessage("module.skill_choice_aria", {name:localizedRecordText(choice, "name"), state:choiceState}));
          button.title = localizedRecordText(choice, "description") || localizedRecordText(choice, "name");
          button.addEventListener("click", async () => {
            text.textContent = localizedRecordText(choice, "description") || localizedRecordText(choice, "name");
            choices.querySelectorAll("button").forEach((candidate) => candidate.classList.toggle("is-previewed", candidate === button));
            if (!canChoose) return;
            button.disabled = true;
            try {
              await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${item.definition_id}/talents/${node.tier}/${choice.id}`);
              renderModuleDetailTab("talents");
              document.getElementById("module-detail-status").textContent = localizedMessage("module.skill_saved");
            } catch (error) { document.getElementById("module-detail-status").textContent = error.message; button.disabled = false; }
          });
          choices.appendChild(button);
        });
        host.appendChild(row);
      }
      const selectedCount = Number(
        item.selected_talent_count
        ?? (item.talents || []).filter((node) => Boolean(node.selected)).length
      );
      if (selectedCount > 0) {
        const resetCost = Number(item.talent_reset_cost_flux || selectedCount * 25);
        const resetPanel = document.createElement("section");
        resetPanel.className = "module-talent-reset-panel";
        const resetCopy = document.createElement("span");
        resetCopy.textContent = localizedMessage("module.skills_resettable", {count:localizedNumber(selectedCount)});
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "module-talent-reset";
        resetButton.textContent = localizedMessage("module.reset_skills_cost", {flux:localizedNumber(resetCost)});
        resetButton.disabled = Number(metaProgressionState?.flux_shards || 0) < resetCost;
        resetButton.addEventListener("click", async () => {
          resetButton.disabled = true;
          const status = document.getElementById("module-detail-status");
          if (status) status.textContent = localizedMessage("module.skills_resetting");
          try {
            await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${item.definition_id}/talents/reset`);
            renderModuleDetailTab("talents");
            if (status) status.textContent = localizedMessage("module.skills_reset", {count:localizedNumber(selectedCount)});
          } catch (error) {
            if (status) status.textContent = error instanceof Error ? error.message : String(error);
            resetButton.disabled = false;
          }
        });
        resetPanel.append(resetCopy, resetButton);
        host.appendChild(resetPanel);
      }
    } else {
      text.textContent = localizedRecordText(item, "description") || localizedRecordText(item, "strategic_role") || localizedUiText(item.name_tr);
      const overview = document.createElement("div");
      overview.className = "module-overview-grid";
      for (const [label, rawValue] of [["module.battle_role", localizedRecordText(item, "strategic_role") || "—"], ["module.class_upper", poolCategoryLabel(item.category)], ["module.unlock", localizedMessage("module.unlock_requirement", {arena:localizedNumber(item.unlock_arena), trophies:localizedNumber(item.unlock_trophies)})], ["module.next_level", item.next_stats ? localizedMessage("module.next_stats", {hp:localizedNumber(item.next_stats.max_hp), damage:localizedNumber(item.next_stats.base_damage)}) : localizedMessage("core.max_level")]]) {
        const card = document.createElement("div");
        const name = document.createElement("span");
        const value = document.createElement("strong");
        name.textContent = localizedMessage(label);
        value.textContent = rawValue;
        card.append(name, value);
        overview.appendChild(card);
      }
      host.appendChild(overview);
      host.appendChild(createModuleEffectList(localizedRecordText(item, "effect_lines") || []));
    }
    host.prepend(text);
  }

  function openModuleDetail(tabName = "overview") {
    const item = activeMetaModule();
    const definition = metaModuleDefinition(item);
    if (!item || !definition) return;
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("module-detail-name", localizedUiText(item.name_tr));
    setText("module-detail-rarity", moduleRarityLabel(item.rarity).toLocaleUpperCase(document.documentElement.lang === "en" ? "en-US" : "tr-TR"));
    setText("module-detail-level", localizedMessage("core.level", {level:localizedNumber(Number(item.level || 0) + 1)}));
    setText("module-detail-selected-state", localizedMessage(deckEditorSlots.filter(Boolean).map(clientDefinitionId).includes(item.definition_id) ? "module.in_deck" : "module.out_of_deck"));
    const cost = item.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const universalShards = Number(metaProgressionState?.universal_module_shards || 0);
    const totalUsableShards = Number(item.shards || 0) + universalShards;
    setText("module-detail-shards", cost ? localizedMessage("module.shard_progress", {shards:localizedNumber(item.shards || 0), universal:localizedNumber(universalShards), required:localizedNumber(required)}) : localizedMessage("core.max_level"));
    const progress = document.getElementById("module-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, totalUsableShards) : required; }
    const art = document.getElementById("module-detail-art");
    if (art) {
      art.dataset.category = item.category || "";
      art.dataset.module = item.definition_id || "";
      art.textContent = moduleIconFor(definition);
      art.setAttribute("aria-label", localizedMessage("module.art_aria", {name:localizedUiText(item.name_tr)}));
    }
    const stats = document.getElementById("module-detail-stats");
    if (stats) stats.innerHTML = `<div><span>${localizedMessage("module.hp_label")}</span><strong>${localizedNumber(item.stats?.max_hp ?? definition.maxHp)}</strong></div><div><span>${localizedMessage("module.current_label")}</span><strong>ϟ ${localizedNumber(item.current_cost ?? definition.circuitCreditCost)}</strong></div><div><span>${localizedMessage("module.damage_label")}</span><strong>${localizedNumber(item.stats?.base_damage || 0)}</strong></div>`;
    const upgrade = document.getElementById("module-detail-upgrade");
    const reason = !item.unlocked ? localizedMessage("module.unlock_trophies", {count:item.unlock_trophies ?? 0}) : !cost ? localizedMessage("core.max_level") : totalUsableShards < required ? localizedMessage("module.required_shards", {owned:localizedNumber(totalUsableShards), required:localizedNumber(required)}) : Number(metaProgressionState?.circuit_credits || 0) < Number(cost.circuit_credits) ? localizedMessage("module.required_credits", {credits:localizedNumber(cost.circuit_credits)}) : "";
    if (upgrade) {
      upgrade.disabled = Boolean(reason || metaProgressionState?.unavailable);
      upgrade.textContent = cost ? localizedMessage("module.upgrade_button", {credits:localizedNumber(cost.circuit_credits)}) : localizedMessage("core.max_level");
    }
    setText("module-detail-status", reason);
    for (const button of document.querySelectorAll("[data-module-detail-tab]")) button.classList.toggle("is-active", button.dataset.moduleDetailTab === tabName);
    renderModuleDetailTab(tabName);
    const dialog = document.getElementById("module-detail-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
  }

  function navigateModuleDetail(direction) {
    const items = metaProgressionState?.module_collection || fallbackMetaProgression().module_collection;
    if (!items.length) return;
    const current = Math.max(0, items.findIndex((item) => item.definition_id === selectedCollectionModuleId));
    selectedCollectionModuleId = items[(current + direction + items.length) % items.length].definition_id;
    openModuleDetail();
  }

  async function upgradeCollectionModule() {
    const button = document.getElementById("module-detail-upgrade");
    if (button?.disabled) return;
    if (button) button.disabled = true;
    const moduleId = selectedCollectionModuleId;
    try {
      await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${encodeURIComponent(moduleId)}/upgrade`);
      openModuleDetail();
      document.getElementById("module-detail-status").textContent = localizedMessage("module.level_up_success");
    } catch (error) {
      if (button) button.disabled = false;
      document.getElementById("module-detail-status").textContent = error.message;
    }
  }

  function setTeamActionStatus(message = "", state = "") {
    const status = document.getElementById("team-action-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.dataset.state = state;
  }

  function teamRequestId(kind) {
    return `team:${kind}:${participantPlayerId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }

  async function loadTeamView() {
    const connection = document.getElementById("team-connection-state");
    if (connection) connection.textContent = localizedMessage("team.loading");
    try {
      teamState = await requestJsonWithDeadline(
        `/teams/player/${encodeURIComponent(participantPlayerId)}`,
        { cache: "no-store" },
        10000
      );
      if (connection) connection.textContent = localizedMessage(teamState.joined ? "team.connected_upper" : "team.none_upper");
      setTeamActionStatus("");
      renderTeamHub();
      if (teamState?.application_pending) {
        setTeamActionStatus(localizedMessage("team.application_sent"), "success");
      }
      return { ok:true, state:teamState };
    } catch (error) {
      if (connection) connection.textContent = localizedMessage("team.connection_error_upper");
      setTeamActionStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    }
  }

  function setFriendsStatus(message = "", state = "") {
    const status = document.getElementById("friends-action-status");
    if (!status) return;
    status.textContent = String(message || "");
    status.dataset.state = state;
  }

  function socialRequestId(kind) {
    return `social:${kind}:${participantPlayerId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }

  async function socialMutation(path, body = {}, pendingMessage = "İşleniyor…") {
    setFriendsStatus(pendingMessage, "pending");
    try {
      const payload = await requestJsonWithDeadline(
        path,
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            request_id:socialRequestId(body.requestKind || "action"),
            ...body,
            requestKind:undefined,
          }),
        },
        30000
      );
      socialState = payload;
      setFriendsStatus("");
      renderFriendsScreen();
      return { ok:true, payload };
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    }
  }

  async function loadSocialView() {
    setFriendsStatus("Arkadaş ağı yükleniyor…", "pending");
    try {
      socialState = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}`,
        { cache:"no-store" },
        12000
      );
      setFriendsStatus("");
      renderFriendsScreen();
      return { ok:true, state:socialState };
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    }
  }

  function parseGridshardDeepLink(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return null;
    try {
      const url = new URL(
        value,
        globalThis.location?.origin || "https://play.gridshard.invalid"
      );
      if (url.protocol === "gridshard:") {
        const kind = String(url.hostname || "").toLowerCase();
        const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
        if (kind === "invite" && parts[0]) return { kind:"invite", value:parts[0] };
        if (kind === "profile" && parts[0]) return { kind:"profile", value:parts[0] };
        if (kind === "friends" && parts[0] === "messages") {
          return { kind:"message", value:parts[1] || "" };
        }
        return null;
      }
      const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      if (parts[0] === "invite" && parts[1]) return { kind:"invite", value:parts[1] };
      if (parts[0] === "profile" && parts[1]) return { kind:"profile", value:parts[1] };
    } catch (_error) {
      return null;
    }
    return null;
  }

  async function consumePendingDeepLink(rawUrl = null) {
    const explicitUrl = typeof rawUrl === "string" && Boolean(rawUrl.trim());
    if (pendingDeepLinkConsumed && !explicitUrl) {
      return { ok:true, skipped:true };
    }
    const target = parseGridshardDeepLink(
      explicitUrl ? rawUrl : globalThis.location?.href || ""
    );
    if (!target) return { ok:true, skipped:true };
    pendingDeepLinkConsumed = true;
    if (target.kind === "invite") {
      openAppScreen("friends");
      setFriendsStatus("Davet kabul ediliyor…", "pending");
      try {
        const result = await requestJsonWithDeadline(
          `/social/${encodeURIComponent(participantPlayerId)}/invite-codes/accept`,
          {
            method:"POST",
            body:JSON.stringify({ player_id:participantPlayerId, code:target.value }),
          },
          12000
        );
        socialState = result.social || socialState;
        renderFriendsScreen();
        setFriendsStatus("Davet kabul edildi; oyuncu arkadaşlarına eklendi.", "success");
      } catch (error) {
        setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
        return { ok:false, error };
      }
    } else if (target.kind === "profile") {
      await openPublicProfile(target.value);
    } else if (target.kind === "message") {
      openAppScreen("friends");
      const peer = document.getElementById("direct-message-peer");
      if (peer && target.value) peer.value = target.value;
      await loadDirectMessages();
    }
    if (["http:", "https:"].includes(globalThis.location?.protocol)) {
      globalThis.history?.replaceState?.({}, "", "/");
    }
    return { ok:true, target };
  }

  function renderAccountPlatform() {
    const state = accountPlatformState;
    if (!state) return;
    const status = document.getElementById("account-platform-status");
    const contacts = Object.entries(state.contacts || {})
      .map(([channel, item]) => localizedMessage("account.contact", {channel:localizedMessage(channel === "email" ? "account.email" : "account.phone"), value:item.masked}));
    if (status) {
      status.textContent = [
        contacts.length ? contacts.join(" · ") : "Doğrulanmış iletişim adresi yok",
        state.push?.adapter_configured ? "Push sağlayıcısı hazır" : "Push sağlayıcısı yapılandırılmadı",
      ].join(" · ");
    }
    for (const provider of ["google", "apple"]) {
      const button = document.getElementById(`account-oauth-${provider}`);
      if (!button) continue;
      const providerState = state.oauth?.[provider] || {};
      button.disabled = Boolean(providerState.linked || !providerState.configured);
      button.textContent = providerState.linked
        ? localizedMessage("account.provider_connected", {provider:provider.toUpperCase()})
        : providerState.configured
          ? localizedMessage("account.provider_connect", {provider:provider.toUpperCase()})
          : localizedMessage("account.provider_not_configured", {provider:provider.toUpperCase()});
    }
    const devices = document.getElementById("account-device-list");
    if (devices) {
      devices.replaceChildren();
      for (const device of state.devices || []) {
        const row = document.createElement("article");
        const name = document.createElement("strong");
        name.textContent = device.name || "Cihaz";
        const meta = document.createElement("small");
        meta.textContent = `${String(device.platform || "web").toUpperCase()} · ${localizedDate(Number(device.last_seen_at || 0) * 1000, {dateStyle:"medium", timeStyle:"short"})}`;
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.textContent = "OTURUMU KAPAT";
        revoke.addEventListener("click", async () => {
          try {
            accountPlatformState = await requestJsonWithDeadline(
              `/accounts/${encodeURIComponent(participantPlayerId)}/devices/${encodeURIComponent(device.device_id)}`,
              { method:"DELETE", body:JSON.stringify({player_id:participantPlayerId}) },
              12000
            );
            renderAccountPlatform();
          } catch (error) {
            if (status) status.textContent = error instanceof Error ? error.message : String(error);
          }
        });
        row.append(name, meta, revoke);
        devices.appendChild(row);
      }
    }
    renderAccountOnboarding();
  }

  function accountHasPersistentIdentity(state = accountPlatformState) {
    return Boolean(
      Object.keys(state?.contacts || {}).length
      || Object.values(state?.oauth || {}).some((provider) => Boolean(provider?.linked))
    );
  }

  function accountOnboardingWasDismissed() {
    try {
      return globalThis.localStorage?.getItem(ACCOUNT_ONBOARDING_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  }

  function renderAccountOnboarding(message = "") {
    const state = accountPlatformState;
    const status = document.getElementById("account-onboarding-status");
    if (status && message) status.textContent = message;
    for (const provider of ["google", "apple"]) {
      const button = document.getElementById(`account-onboarding-${provider}`);
      if (!button) continue;
      const providerState = state?.oauth?.[provider] || {};
      button.disabled = Boolean(providerState.linked || !providerState.configured);
      button.textContent = providerState.linked
        ? localizedMessage("account.provider_connected", {provider:provider.toUpperCase()})
        : providerState.configured
          ? localizedMessage("account.provider_continue", {provider:provider.toUpperCase()})
          : localizedMessage("account.provider_unavailable", {provider:provider.toUpperCase()});
    }
    if (status && !message && state && !accountHasPersistentIdentity(state)) {
      const configuredProviders = ["google", "apple"].filter(
        (provider) => state.oauth?.[provider]?.configured
      );
      status.textContent = configuredProviders.length
        ? "Bir sağlayıcı seç veya e-posta adresini doğrula."
        : "Google ve Apple bağlantıları sunucu ayarlarını bekliyor; e-posta ya da misafir seçeneğini kullanabilirsin.";
    }
  }

  function finishAccountOnboarding({ dismiss = false } = {}) {
    if (dismiss) {
      try {
        globalThis.localStorage?.setItem(ACCOUNT_ONBOARDING_DISMISSED_KEY, "1");
      } catch {
        // Depolama kapalıysa yalnızca mevcut oturumda devam edilir.
      }
    }
    const dialog = document.getElementById("account-onboarding-dialog");
    if (dialog?.open) dialog.close();
    loadDailyMetaState({ present:true });
  }

  function maybePresentAccountOnboarding() {
    if (accountHasPersistentIdentity() || accountOnboardingWasDismissed()) return false;
    renderAccountOnboarding();
    const dialog = document.getElementById("account-onboarding-dialog");
    if (!dialog || dialog.open) return Boolean(dialog?.open);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return true;
  }

  async function loadAccountPlatform({ presentOnboarding = false } = {}) {
    const status = document.getElementById("account-platform-status");
    const oauthParams = new URLSearchParams(globalThis.location?.search || "");
    const oauthExchange = oauthParams.get("oauth_exchange");
    try {
      if (oauthExchange) {
        const authSession = globalThis.GridshardAuth?.session;
        if (typeof authSession?.completeProviderLogin !== "function") {
          throw new Error("Sağlayıcı oturum köprüsü hazır değil.");
        }
        await authSession.completeProviderLogin(oauthExchange);
        oauthParams.delete("oauth_exchange");
        oauthParams.delete("oauth_status");
        oauthParams.delete("oauth_provider");
        const query = oauthParams.toString();
        globalThis.location?.replace?.(
          `${globalThis.location?.pathname || "/"}${query ? `?${query}` : ""}`
        );
        return {ok:true,presented:false,redirecting:true};
      }
      accountPlatformState = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}`,
        { cache:"no-store" },
        12000
      );
      renderAccountPlatform();
      const oauthStatus = oauthParams.get("oauth_status");
      const oauthProvider = (oauthParams.get("oauth_provider") || "Google").toLocaleUpperCase("tr-TR");
      if (oauthStatus) {
        const message = oauthStatus === "linked"
          ? localizedMessage("account.link_success", {provider:oauthProvider})
          : oauthStatus === "cancelled"
            ? localizedMessage("account.link_cancelled", {provider:oauthProvider})
            : localizedMessage("account.link_failed", {provider:oauthProvider});
        if (status) status.textContent = message;
        renderAccountOnboarding(message);
        oauthParams.delete("oauth_status");
        oauthParams.delete("oauth_provider");
        const query = oauthParams.toString();
        globalThis.history?.replaceState?.(
          {}, "", `${globalThis.location?.pathname || "/"}${query ? `?${query}` : ""}`
        );
      }
      const presented = presentOnboarding ? maybePresentAccountOnboarding() : false;
      return {ok:true,presented};
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return {ok:false,error,presented:false};
    }
  }

  async function loadDirectMessages() {
    const host = document.getElementById("direct-message-list");
    if (!host) return;
    try {
      const payload = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages`,
        {cache:"no-store"},
        12000
      );
      host.replaceChildren();
      for (const message of payload.messages || []) {
        const row = document.createElement("article");
        const sent = message.sender_id === participantPlayerId;
        row.className = sent ? "is-sent" : "is-received";
        const peer = sent ? message.recipient_id : message.sender_id;
        row.textContent = localizedMessage("social.message_line", {direction:sent ? localizedMessage("social.sent_arrow") : "←", peer, message:message.text});
        host.appendChild(row);
      }
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.textContent = localizedUiText("Henüz doğrudan mesaj yok.");
        host.replaceChildren(empty);
      }
    } catch (error) {
      host.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  async function sendDirectMessage() {
    const peer = document.getElementById("direct-message-peer")?.value?.trim() || "";
    const input = document.getElementById("direct-message-text");
    const message = input?.value?.trim() || "";
    if (!peer || !message) {
      setFriendsStatus("Arkadaş kimliği ve mesaj gerekli.", "error");
      return;
    }
    try {
      await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,recipient_id:peer,text:message})},
        12000
      );
      if (input) input.value = "";
      setFriendsStatus("Mesaj gönderildi.", "success");
      await loadDirectMessages();
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
    }
  }

  function createSocialPlayerCard(player, actions = []) {
    const card = document.createElement("article");
    card.className = "social-player-card";
    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    applyAvatarVisual(
      avatar,
      player.avatar?.selected_avatar_id || "default",
      player.avatar?.selected_avatar_frame_id || "none"
    );
    const identity = document.createElement("div");
    const name = createPublicPlayerName(player.player_id, player.display_name || "Oyuncu");
    const meta = document.createElement("small");
    meta.textContent = localizedMessage("social.player_meta", {rank:localizedUiText(player.rank_name_tr || "Arena"), trophies:localizedNumber(player.rating || 0), online:player.online ? localizedMessage("social.online_suffix") : ""});
    identity.append(name, meta);
    const controls = document.createElement("div");
    controls.className = "social-player-actions";
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.dataset.variant = action.variant || "primary";
      button.addEventListener("click", action.onClick);
      controls.appendChild(button);
    }
    card.append(avatar, identity, controls);
    return card;
  }

  function renderFriendsScreen() {
    if (!socialState) return;
    const setEmpty = (host, text) => {
      if (!host || host.children.length) return;
      const empty = document.createElement("p");
      empty.className = "social-empty-state";
      empty.textContent = text;
      host.appendChild(empty);
    };
    const summary = document.getElementById("friends-summary");
    if (summary) summary.textContent = localizedMessage("social.friend_limit", {count:localizedNumber(socialState.friends?.length || 0), limit:localizedNumber(socialState.friend_limit || 100)});
    const requests = document.getElementById("friend-request-list");
    if (requests) {
      requests.replaceChildren();
      for (const player of socialState.incoming_requests || []) {
        requests.appendChild(createSocialPlayerCard(player, [
          { label:"KABUL ET", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests/accept`, { requester_id:player.player_id, requestKind:"friend-accept" }, "İstek kabul ediliyor…") },
          { label:"REDDET", variant:"quiet", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests/reject`, { requester_id:player.player_id, requestKind:"friend-reject" }, "İstek reddediliyor…") },
        ]));
      }
      setEmpty(requests, "Bekleyen arkadaşlık isteği yok.");
    }
    const friends = document.getElementById("friend-list");
    if (friends) {
      friends.replaceChildren();
      for (const player of socialState.friends || []) {
        friends.appendChild(createSocialPlayerCard(player, [
          { label:"SAVAŞA ÇAĞIR", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/battle-invites`, { opponent_id:player.player_id, requestKind:"friend-battle" }, "Kupasız savaş daveti gönderiliyor…") },
        ]));
      }
      setEmpty(friends, "Henüz arkadaşın yok. Oyuncu arayarak ilk bağlantını kurabilirsin.");
    }
    const invites = document.getElementById("friend-battle-invites");
    if (invites) {
      invites.replaceChildren();
      for (const invite of [...(socialState.battle_invites || [])].reverse()) {
        const opponentId = invite.challenger_id === participantPlayerId ? invite.opponent_id : invite.challenger_id;
        const opponentName = invite.challenger_id === participantPlayerId ? invite.opponent_name : invite.challenger_name;
        const card = document.createElement("article");
        card.className = "social-battle-card";
        const copy = document.createElement("div");
        copy.append(createPublicPlayerName(opponentId, opponentName || "Oyuncu"));
        const meta = document.createElement("small");
        meta.textContent = invite.status === "completed"
          ? "KUPASIZ SAVAŞ TAMAMLANDI"
          : invite.status === "accepted" ? "KUPASIZ SAVAŞ HAZIR" : "KUPASIZ DAVET BEKLİYOR";
        copy.appendChild(meta);
        if (invite.status === "pending" && invite.opponent_id === participantPlayerId) {
          const accept = document.createElement("button");
          accept.type = "button";
          accept.textContent = "KABUL ET";
          accept.addEventListener("click", async () => {
            const result = await socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/battle-invites/${encodeURIComponent(invite.invite_id)}/accept`, { requestKind:"battle-accept" }, "Savaş alanı hazırlanıyor…");
            if (result.ok && result.payload.battle) launchSocialBattle(result.payload.battle);
          });
          card.append(copy, accept);
        } else if (invite.status === "accepted" && invite.battle_session_id) {
          const enter = document.createElement("button");
          enter.type = "button";
          enter.textContent = "SAVAŞ ALANINA GİR";
          enter.addEventListener("click", () => launchSocialBattle({ session_id:invite.battle_session_id, players:[invite.challenger_id, invite.opponent_id], opponent_type:"human" }));
          card.append(copy, enter);
        } else {
          card.appendChild(copy);
        }
        invites.appendChild(card);
      }
      setEmpty(invites, "Bekleyen arkadaş savaşı yok.");
    }
  }

  async function searchFriends(query) {
    const host = document.getElementById("friend-search-results");
    if (!host) return;
    setFriendsStatus("Oyuncular aranıyor…", "pending");
    try {
      const payload = await requestJsonWithDeadline(
        `/players/search?player_id=${encodeURIComponent(participantPlayerId)}&q=${encodeURIComponent(query)}`,
        { cache:"no-store" },
        12000
      );
      host.replaceChildren();
      for (const player of payload.players || []) {
        host.appendChild(createSocialPlayerCard(player, [
          { label:"ARKADAŞ EKLE", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests`, { target_player_id:player.player_id, requestKind:"friend-request" }, "Arkadaşlık isteği gönderiliyor…") },
        ]));
      }
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.className = "social-empty-state";
        empty.textContent = "Bu adla eşleşen oyuncu bulunamadı.";
        host.appendChild(empty);
      }
      setFriendsStatus("");
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function launchSocialBattle(battle) {
    const repair = repairBattleDeckAgainstCollection();
    if (repair.definitionIds.length !== 6) {
      setFriendsStatus("Savaş için altı kartlık geçerli bir deste gerekli.", "error");
      return { ok:false };
    }
    if (repair.changed) await persistBattlePoolDefinitionIds(repair.definitionIds);
    prepareOnlineMatch();
    try {
      const result = onlinePlay.connectSession(
        {
          session_id:battle.session_id,
          players:battle.players || [],
          opponent_type:battle.opponent_type || "human",
        },
        {
          battlePoolIds:selectedBattlePoolDefinitionIds(),
          initialModules:buildInitialOnlineSetup(),
        }
      );
      if (!result.ok) throw new Error(result.reason || "Özel savaş başlatılamadı.");
      return result;
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    }
  }

  function eventDateLabel(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? localizedDate(date, { day:"2-digit", month:"short" })
      : "—";
  }

  function renderTournamentPrizes(hostId, prizes = []) {
    const host = document.getElementById(hostId);
    if (!host) return;
    host.replaceChildren();
    for (const prize of prizes.slice(0, 3)) {
      const card = document.createElement("article");
      card.dataset.position = String(prize.position);
      const medal = document.createElement("strong");
      medal.className = "event-prize-rank";
      medal.textContent = ({ 1:"🥇", 2:"🥈", 3:"🥉" })[prize.position] ? localizedMessage("event.prize_rank_medal", {medal:({1:"🥇",2:"🥈",3:"🥉"})[prize.position], position:localizedNumber(prize.position)}) : localizedMessage("event.prize_rank", {position:localizedNumber(prize.position)});
      const chest = document.createElement("span");
      chest.className = "event-prize-chest";
      chest.innerHTML = chestVisualMarkup(prize.chest_tier || "bronze", { visualId:prize.chest_visual_id || "" });
      const detail = document.createElement("div");
      detail.className = "event-prize-detail";
      const title = document.createElement("strong");
      title.textContent = localizedRewardChestName(prize);
      const rewards = document.createElement("div");
      rewards.className = "event-prize-rewards";
      const rewardLabels = [
        localizedMessage("event.prize_credits", {amount:localizedNumber(prize.circuit_credits || 0)}),
        localizedMessage("event.prize_flux", {amount:localizedNumber(prize.flux_shards || 0)}),
        prize.avatar_id ? localizedMessage("event.prize_avatar") : prize.team_avatar_id ? localizedMessage("event.prize_team_avatar") : "",
        prize.avatar_frame_id ? localizedMessage("event.prize_avatar_frame") : prize.team_frame_id ? localizedMessage("event.prize_team_frame") : "",
        prize.team_name_frame_id ? localizedMessage("event.prize_team_name_frame") : "",
        prize.team_bar_background_id ? localizedMessage("event.prize_team_bar") : "",
        prize.emoji_id ? localizedMessage("event.prize_battle_emoji") : "",
      ].filter(Boolean);
      for (const label of rewardLabels) {
        const chip = document.createElement("small");
        chip.textContent = label;
        rewards.appendChild(chip);
      }
      detail.append(title, rewards);
      card.append(medal, chest, detail);
      host.appendChild(card);
    }
  }

  function renderEventSummary(hostId, metrics = []) {
    const host = document.getElementById(hostId);
    if (!host) return;
    host.replaceChildren();
    for (const [label, value] of metrics) {
      const card = document.createElement("article");
      const name = document.createElement("span");
      const amount = document.createElement("strong");
      name.textContent = label;
      amount.textContent = String(value);
      card.append(name, amount);
      host.appendChild(card);
    }
  }

  function renderEventSubpages() {
    for (const button of document.querySelectorAll("[data-weekly-event-tab]")) {
      button.classList.toggle("is-active", button.dataset.weeklyEventTab === activeWeeklyEventTab);
    }
    for (const panel of document.querySelectorAll("[data-weekly-event-panel]")) {
      const active = panel.dataset.weeklyEventPanel === activeWeeklyEventTab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    }
    for (const button of document.querySelectorAll("[data-team-event-tab]")) {
      button.classList.toggle("is-active", button.dataset.teamEventTab === activeTeamEventTab);
    }
    for (const panel of document.querySelectorAll("[data-team-event-panel]")) {
      const active = panel.dataset.teamEventPanel === activeTeamEventTab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    }
  }

  function renderWeeklyTournament(state) {
    const tournament = state?.weekly_tournament || {};
    const name = document.getElementById("weekly-tournament-name");
    const reset = document.getElementById("weekly-tournament-reset");
    const rules = document.getElementById("weekly-tournament-rules");
    if (name) name.textContent = localizedRecordText(tournament, "name") || localizedMessage("event.weekly_name");
    if (reset) reset.textContent = localizedMessage("event.date_range", {start:eventDateLabel(tournament.period?.starts_at), end:eventDateLabel(tournament.period?.ends_at)});
    if (rules) rules.textContent = localizedRecordText(tournament, "rules") || localizedMessage("event.weekly_rules");
    const register = document.getElementById("weekly-tournament-register");
    const viewer = state?.viewer || {};
    if (register) {
      register.disabled = Boolean(viewer.weekly_registered);
      register.textContent = viewer.weekly_registered
        ? localizedMessage("event.joined_upper")
        : localizedMessage("event.enter_tournament", {fee:localizedNumber(tournament.entry_fee || 0)});
    }
    renderTournamentPrizes("weekly-tournament-prizes", tournament.prizes || []);
    const participant = (tournament.standings || []).find((row) => row.player_id === participantPlayerId);
    renderEventSummary("weekly-event-summary", [
      [localizedMessage("event.duration"), localizedMessage("event.date_range", {start:eventDateLabel(tournament.period?.starts_at), end:eventDateLabel(tournament.period?.ends_at)})],
      [localizedMessage("event.your_rank"), participant ? localizedMessage("leaderboard.position_hash", {position:localizedNumber(participant.position)}) : localizedMessage("leaderboard.no_position")],
      [localizedMessage("event.trophies_earned"), localizedMessage("arena.trophy_icon", {count:localizedNumber(participant ? participant.trophies_earned || participant.points : 0)})],
    ]);
    const host = document.getElementById("weekly-tournament-standings");
    if (!host) return;
    host.replaceChildren();
    const standings = tournament.standings || [];
    const visibleRows = standings.slice(0, 20);
    const viewerRow = standings.find((row) => row.player_id === participantPlayerId);
    if (viewerRow && !visibleRows.includes(viewerRow)) visibleRows.push(viewerRow);
    for (const row of visibleRows) {
      const item = document.createElement("li");
      if (row.player_id === participantPlayerId) item.classList.add("is-current-player");
      const position = document.createElement("strong");
      position.className = "tournament-position";
      position.textContent = String(row.position);
      const identity = document.createElement("div");
      const player = createPublicPlayerName(row.player_id, row.display_name || "Oyuncu");
      const record = document.createElement("small");
      record.textContent = localizedMessage("event.match_record", {wins:localizedNumber(row.wins), losses:localizedNumber(row.losses), matches:localizedNumber(row.matches)});
      identity.append(player, record);
      const points = document.createElement("strong");
      points.className = "tournament-points";
      points.textContent = localizedMessage("arena.trophy_icon", {count:localizedNumber(row.trophies_earned || row.points)});
      item.append(position, identity, points);
      host.appendChild(item);
    }
  }

  function renderTeamTournament(state) {
    const tournament = state?.team_tournament || {};
    const name = document.getElementById("team-tournament-name");
    const week = document.getElementById("team-tournament-week");
    const rules = document.getElementById("team-tournament-rules");
    if (name) name.textContent = localizedRecordText(tournament, "name") || localizedMessage("event.team_name");
    if (week) week.textContent = localizedMessage("event.week_label", {week:localizedNumber(tournament.week || 1)});
    if (rules) rules.textContent = localizedRecordText(tournament, "rules") || localizedMessage("event.team_rules");
    const viewer = state?.viewer || {};
    const register = document.getElementById("team-tournament-register");
    if (register) {
      register.hidden = !viewer.team_id;
      register.disabled = Boolean(viewer.team_registered || !viewer.team_owner);
      register.textContent = viewer.team_registered
        ? localizedMessage("event.team_registered")
        : viewer.team_owner
          ? localizedMessage("event.register_team_free")
          : localizedMessage("event.leader_registers_team");
    }
    renderTournamentPrizes("team-tournament-prizes", tournament.prizes || []);
    const participantTeam = (tournament.standings || []).find((row) =>
      row.members?.some((member) => member.player_id === participantPlayerId)
    );
    renderEventSummary("team-event-summary", [
      [localizedMessage("event.period"), localizedMessage("event.date_range", {start:eventDateLabel(tournament.period?.starts_at), end:eventDateLabel(tournament.period?.ends_at)})],
      [localizedMessage("event.week"), localizedMessage("event.week_progress", {week:localizedNumber(tournament.week || 1)})],
      [localizedMessage("event.team_score"), participantTeam ? localizedMessage("event.team_points", {points:localizedNumber(participantTeam.points)}) : localizedMessage("event.no_team")],
    ]);
    const standings = document.getElementById("team-tournament-standings");
    if (standings) {
      standings.replaceChildren();
      for (const row of (tournament.standings || []).slice(0, 12)) {
        const item = document.createElement("li");
        if (row.members?.some((member) => member.player_id === participantPlayerId)) item.classList.add("is-current-player");
        const position = document.createElement("strong");
        position.className = "tournament-position";
        position.textContent = String(row.position);
        const identity = document.createElement("div");
        const teamName = createTeamProfileLink(row.team_id, row.team_name || localizedMessage("profile.team"));
        const detail = document.createElement("small");
        detail.textContent = localizedMessage("event.team_qualified", {members:localizedNumber(row.member_count), qualified:localizedNumber(row.qualified_member_count)});
        identity.append(teamName, detail);
        const points = document.createElement("strong");
        points.className = "tournament-points";
        points.textContent = localizedMessage("event.team_points", {points:localizedNumber(row.points)});
        item.append(position, identity, points);
        standings.appendChild(item);
      }
    }
    const fixtures = document.getElementById("team-tournament-fixtures");
    if (fixtures) {
      fixtures.replaceChildren();
      for (const fixture of tournament.fixtures || []) {
        const card = document.createElement("article");
        const pairing = (fixture.member_pairings || []).find((item) =>
          item.home_player_id === participantPlayerId || item.away_player_id === participantPlayerId
        );
        if (pairing) card.classList.add("is-current-fixture");
        const teams = document.createElement("div");
        teams.className = "event-fixture-team-links";
        teams.append(
          createTeamProfileLink(fixture.home_team_id, fixture.home_team_name || localizedMessage("profile.team")),
          document.createTextNode(" × "),
          createTeamProfileLink(fixture.away_team_id, fixture.away_team_name || localizedMessage("profile.team"))
        );
        const detail = document.createElement("small");
        const schedule = fixture.scheduled_at ? new Date(fixture.scheduled_at) : null;
        const scheduleLabel = schedule && !Number.isNaN(schedule.getTime())
          ? localizedDate(schedule, { weekday:"short", hour:"2-digit", minute:"2-digit" })
          : localizedMessage("event.schedule_preparing");
        detail.textContent = pairing
          ? localizedMessage("event.player_pairing", {home:pairing.home_player_name, away:pairing.away_player_name, schedule:scheduleLabel})
          : localizedMessage("event.close_trophy_pairings", {count:localizedNumber((fixture.member_pairings || []).length), schedule:scheduleLabel});
        card.append(teams, detail);
        if (pairing) {
          const action = document.createElement("button");
          action.type = "button";
          action.className = "event-fixture-enter";
          action.disabled = fixture.status !== "live";
          action.textContent = localizedMessage(fixture.status === "live" ? "event.enter_live_match" : fixture.status === "completed" ? "event.match_time_passed" : "event.wait_for_match");
          action.addEventListener("click", () => checkInTeamFixture(fixture.fixture_id));
          card.appendChild(action);
        }
        fixtures.appendChild(card);
      }
    }
  }

  function renderEventsHub() {
    if (!eventsState) return;
    renderDailyMetaCard();
    const weekly = eventsState.weekly_tournament || {};
    const team = eventsState.team_tournament || {};
    const weeklyLinkName = document.getElementById("weekly-event-link-name");
    const weeklyLinkPeriod = document.getElementById("weekly-event-link-period");
    const teamLinkName = document.getElementById("team-event-link-name");
    const teamLinkPeriod = document.getElementById("team-event-link-period");
    if (weeklyLinkName) weeklyLinkName.textContent = localizedRecordText(weekly, "name") || localizedMessage("event.weekly_name");
    if (weeklyLinkPeriod) weeklyLinkPeriod.textContent = localizedMessage("event.date_range", {start:eventDateLabel(weekly.period?.starts_at), end:eventDateLabel(weekly.period?.ends_at)});
    if (teamLinkName) teamLinkName.textContent = localizedRecordText(team, "name") || localizedMessage("event.team_name");
    if (teamLinkPeriod) teamLinkPeriod.textContent = localizedMessage("event.team_period", {week:localizedNumber(team.week || 1), date:eventDateLabel(team.period?.ends_at)});
    renderWeeklyTournament(eventsState);
    renderTeamTournament(eventsState);
    renderEventSubpages();
  }

  async function loadEventsView() {
    const statuses = ["event-action-status", "weekly-event-status", "team-event-status"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    for (const status of statuses) status.textContent = localizedMessage("event.loading");
    try {
      eventsState = await requestJsonWithDeadline(`/events?player_id=${encodeURIComponent(participantPlayerId)}`, { cache:"no-store" }, 12000);
      for (const status of statuses) status.textContent = "";
      renderEventsHub();
      loadDailyMetaState({ present:false });
      return { ok:true, state:eventsState };
    } catch (error) {
      for (const status of statuses) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok:false, error };
    }
  }

  async function registerEvent(path, statusId, pendingMessage) {
    const status = document.getElementById(statusId);
    if (status) status.textContent = pendingMessage;
    try {
      eventsState = await requestJsonWithDeadline(
        path,
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            request_id:`event:${Date.now()}:${Math.random().toString(16).slice(2)}`,
          }),
        },
        30000
      );
      if (status) status.textContent = localizedMessage("event.registration_completed");
      renderEventsHub();
      loadMetaProgression();
      return { ok:true };
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok:false, error };
    }
  }

  async function checkInTeamFixture(fixtureId) {
    const status = document.getElementById("team-event-status");
    if (status) status.textContent = localizedMessage("event.live_match_preparing");
    try {
      const payload = await requestJsonWithDeadline(
        `/events/team/fixtures/${encodeURIComponent(fixtureId)}/check-in`,
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            request_id:`fixture:${fixtureId}:${Date.now()}`,
          }),
        },
        30000
      );
      return launchSocialBattle(payload.battle);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok:false, error };
    }
  }

  function renderDailyMetaCard() {
    const name = document.getElementById("daily-meta-name");
    const description = document.getElementById("daily-meta-description");
    const card = document.getElementById("daily-meta-card");
    const selected = dailyMetaState?.selected ? dailyMetaState.meta : null;
    if (name) name.textContent = selected ? localizedMessage(`meta.${selected.id}.name`) : localizedMessage("meta.not_selected");
    if (description) {
      description.textContent = selected
        ? localizedMessage("event.daily_meta_description", {description:localizedMessage(`meta.${selected.id}.description`), effect:localizedMessage(`meta.${selected.id}.effect`)}).replace(/ · $/, "")
        : localizedMessage("meta.roll_hint");
    }
    if (card) {
      card.dataset.selected = selected ? "true" : "false";
      card.style.setProperty("--daily-meta-accent", selected?.accent || "#ffe078");
    }
  }

  function renderDailyMetaDialog() {
    const dialog = document.getElementById("daily-meta-dialog");
    if (!dialog || !dailyMetaState) return;
    const selected = dailyMetaState.selected ? dailyMetaState.meta : null;
    const wheel = document.getElementById("daily-meta-wheel");
    const result = document.getElementById("daily-meta-result");
    const copy = document.getElementById("daily-meta-dialog-copy");
    const status = document.getElementById("daily-meta-dialog-status");
    const button = document.getElementById("daily-meta-roll");
    const glyph = document.getElementById("daily-meta-result-glyph");
    const name = document.getElementById("daily-meta-result-name");
    const effect = document.getElementById("daily-meta-result-effect");
    if (wheel) {
      wheel.classList.toggle("has-result", Boolean(selected));
      wheel.style.setProperty(
        "--daily-meta-stop-angle",
        dailyMetaStopAngle(dailyMetaState)
      );
    }
    if (result) {
      result.hidden = !selected;
      result.style.setProperty("--daily-meta-accent", selected?.accent || "#61ead8");
    }
    if (copy) {
      copy.textContent = selected
        ? localizedMessage("meta.locked_today")
        : localizedMessage("meta.seven_strategies");
    }
    if (glyph) glyph.textContent = selected?.glyph || "◇";
    if (name) name.textContent = selected ? localizedMessage(`meta.${selected.id}.name`) : "—";
    if (effect) effect.textContent = selected ? localizedMessage(`meta.${selected.id}.effect`) : "";
    if (button) {
      button.disabled = dailyMetaRollPending;
      button.textContent = dailyMetaRollPending
        ? localizedMessage("meta.rolling")
        : selected ? localizedMessage("common.continue_upper") : localizedMessage("meta.roll_button");
    }
  }

  function dailyMetaStopAngle(state) {
    const options = Array.isArray(state?.options) ? state.options : [];
    const selectedId = state?.meta?.id;
    const index = options.findIndex((item) => item?.id === selectedId);
    if (index < 0 || options.length < 1) return "0deg";
    return `${-(index * 360 / options.length)}deg`;
  }

  async function loadDailyMetaState({ present = false } = {}) {
    try {
      dailyMetaState = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/daily-meta`,
        { cache:"no-store" },
        12000
      );
      const status = document.getElementById("daily-meta-dialog-status");
      if (status) status.textContent = "";
      renderDailyMetaCard();
      renderDailyMetaDialog();
      const dialog = document.getElementById("daily-meta-dialog");
      if (present && dailyMetaState.requires_roll && dialog && !dialog.open) {
        if (dialog.showModal) dialog.showModal();
        else dialog.setAttribute("open", "");
      }
      return { ok:true, state:dailyMetaState };
    } catch (error) {
      const status = document.getElementById("daily-meta-dialog-status");
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok:false, error };
    }
  }

  async function rollDailyMeta() {
    const dialog = document.getElementById("daily-meta-dialog");
    if (dailyMetaState?.selected) {
      if (dialog?.close) dialog.close();
      else dialog?.removeAttribute("open");
      return;
    }
    if (dailyMetaRollPending) return;
    dailyMetaRollPending = true;
    const wheel = document.getElementById("daily-meta-wheel");
    const status = document.getElementById("daily-meta-dialog-status");
    if (status) status.textContent = localizedMessage("meta.rolling_status");
    renderDailyMetaDialog();
    try {
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/daily-meta/roll`,
        {
          method:"POST",
          body:JSON.stringify({ request_id:laboratoryRequestId("daily-meta") }),
        },
        30000
      );
      wheel?.style.setProperty(
        "--daily-meta-stop-angle",
        dailyMetaStopAngle(payload)
      );
      wheel?.classList.remove("is-spinning");
      if (wheel) void wheel.offsetWidth;
      wheel?.classList.add("is-spinning");
      await new Promise((resolve) => window.setTimeout(resolve, 950));
      dailyMetaState = payload;
      if (status) status.textContent = localizedMessage("meta.selected_status");
      renderDailyMetaCard();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      dailyMetaRollPending = false;
      wheel?.classList.remove("is-spinning");
      renderDailyMetaDialog();
    }
  }

  async function mutateTeam(path, body, pendingMessage = localizedMessage("common.processing")) {
    setTeamActionStatus(pendingMessage, "pending");
    try {
      teamState = await requestJsonWithDeadline(
        path,
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            request_id:teamRequestId(body.requestKind || "action"),
            ...body,
            requestKind:undefined,
          }),
        },
        30000
      );
      setTeamActionStatus("");
      renderTeamHub();
      accountDataLoader.loadProfile().then(renderProfileSummary);
      if (teamState?.application_pending) {
        setTeamActionStatus(localizedMessage("team.application_sent"), "success");
      }
      return { ok:true, state:teamState };
    } catch (error) {
      setTeamActionStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    }
  }

  function renderTrophyValue(targetOrId, value) {
    const target = typeof targetOrId === "string"
      ? document.getElementById(targetOrId)
      : targetOrId;
    if (!target) return null;
    const displayValue = typeof value === "number"
      ? localizedNumber(value)
      : String(value ?? "0");
    const number = document.createElement("span");
    number.className = "trophy-value-number";
    number.textContent = displayValue;
    const icon = document.createElement("span");
    icon.className = "trophy-value-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🏆";
    target.classList.add("trophy-visual-value");
    target.setAttribute("aria-label", localizedMessage("profile.trophies", {count:displayValue}));
    target.replaceChildren(number, icon);
    return target;
  }

  function createTeamMemberRow(member, index, { compact = false, allowManagement = false } = {}) {
    const row = document.createElement(compact ? "div" : "li");
    row.className = compact ? "team-member-row is-compact" : "team-member-row";
    const rank = document.createElement("strong");
    rank.className = "team-member-rank";
    rank.textContent = String(index + 1);
    const identity = document.createElement("div");
    const name = createPublicPlayerName(
      member.player_id,
      member.display_name || localizedMessage("profile.player")
    );
    const meta = document.createElement("small");
    meta.textContent = localizedMessage("team.member_status", {leader:member.role === "owner" ? localizedMessage("team.leader_suffix") : "", presence:localizedMessage(member.online ? "team.online" : "team.offline")});
    identity.append(name, meta);
    const trophies = document.createElement("strong");
    trophies.className = "team-member-trophies";
    renderTrophyValue(trophies, Number(member.trophies || 0));
    row.append(rank, identity, trophies);
    if (!compact && allowManagement && teamState?.joined) {
      const isSelf = member.player_id === participantPlayerId;
      const canRemove = Boolean(teamState.is_owner && !isSelf);
      if (isSelf || canRemove) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = `team-member-action ${isSelf ? "is-leave" : "is-remove"}`;
        action.textContent = localizedMessage(isSelf ? "team.leave_upper" : "team.remove_upper");
        action.addEventListener("click", () => {
          if (!teamState?.team_id) return;
          const path = isSelf
            ? `/teams/${encodeURIComponent(teamState.team_id)}/leave`
            : `/teams/${encodeURIComponent(teamState.team_id)}/members/remove`;
          mutateTeam(
            path,
            isSelf
              ? { requestKind:"leave-team" }
              : { member_id:member.player_id, requestKind:"remove-member" },
            localizedMessage(isSelf ? "team.leaving" : "team.removing_member")
          );
        });
        row.appendChild(action);
      }
    }
    return row;
  }

  function renderTeamManagement() {
    const panel = document.querySelector('[data-team-panel="management"]');
    if (!panel || !teamState?.joined || !teamState.is_owner) return;
    const cosmetics = {
      selected_avatar_id:"team_default",
      selected_avatar_frame_id:"none",
      selected_bar_background_id:"team_grid",
      selected_name_frame_id:"none",
      unlocked_avatar_ids:["team_default"],
      unlocked_avatar_frame_ids:["none"],
      unlocked_bar_background_ids:["team_grid"],
      unlocked_name_frame_ids:["none"],
      ...(teamState.cosmetics || {}),
    };
    const controls = document.getElementById("team-cosmetic-controls");
    if (controls) {
      controls.replaceChildren();
      teamCosmeticDraft ||= {
        avatar_id:cosmetics.selected_avatar_id,
        avatar_frame_id:cosmetics.selected_avatar_frame_id,
        bar_background_id:cosmetics.selected_bar_background_id,
        name_frame_id:cosmetics.selected_name_frame_id,
      };
      const definitions = [
        ["team.cosmetic_avatar", "avatar_id", "unlocked_avatar_ids", ["team_default", "team_champion", "team_finalist"]],
        ["team.cosmetic_frame", "avatar_frame_id", "unlocked_avatar_frame_ids", ["none", "team_gold", "team_silver"]],
        ["team.cosmetic_bar", "bar_background_id", "unlocked_bar_background_ids", ["team_grid", "team_champion_grid", "team_finalist_grid"]],
        ["team.cosmetic_name_frame", "name_frame_id", "unlocked_name_frame_ids", ["none", "team_name_gold"]],
      ];
      for (const [labelText, field, unlockedKey, catalog] of definitions) {
        const group = document.createElement("section");
        group.className = "team-cosmetic-group";
        const heading = document.createElement("h5");
        heading.textContent = localizedMessage(labelText);
        const choices = document.createElement("div");
        choices.className = "team-cosmetic-grid";
        const unlocked = new Set(cosmetics[unlockedKey] || []);
        for (const value of new Set([...catalog, ...unlocked])) {
          const option = document.createElement("button");
          option.type = "button";
          option.className = "team-cosmetic-choice";
          option.dataset.selected = String(teamCosmeticDraft[field] === value);
          option.dataset.locked = String(!unlocked.has(value));
          option.disabled = !unlocked.has(value);
          const glyph = document.createElement("span");
          glyph.className = "team-cosmetic-glyph";
          glyph.textContent = field === "avatar_id" ? ({team_default:"⬡",team_champion:"♛",team_finalist:"✦"}[value] || "⬡") : field === "bar_background_id" ? "▰" : "▢";
          const name = document.createElement("small");
          name.textContent = localizedCatalogName("team_cosmetic", value);
          option.append(glyph, name);
          option.addEventListener("click", () => {
            teamCosmeticDraft[field] = value;
            choices.querySelectorAll("button").forEach((button) => { button.dataset.selected = String(button === option); });
          });
          choices.appendChild(option);
        }
        group.append(heading, choices);
        controls.appendChild(group);
      }
    }
    for (const button of document.querySelectorAll("[data-team-management-tab]")) button.classList.toggle("is-active", button.dataset.teamManagementTab === activeTeamManagementTab);
    for (const section of document.querySelectorAll("[data-team-management-panel]")) section.hidden = section.dataset.teamManagementPanel !== activeTeamManagementTab;
    const applications = document.getElementById("team-application-list");
    if (applications) {
      applications.replaceChildren();
      for (const applicant of teamState.applications || []) {
        const row = document.createElement("article");
        row.className = "team-management-row";
        const copy = document.createElement("div");
        copy.append(createPublicPlayerName(applicant.player_id, applicant.display_name));
        const meta = document.createElement("small");
        meta.textContent = localizedMessage("team.applicant_rank", {rank:localizedUiText(applicant.rank_name_tr), trophies:localizedNumber(applicant.trophies || 0)});
        copy.appendChild(meta);
        const actions = document.createElement("span");
        actions.className = "team-management-actions";
        for (const [label, accept] of [["team.accept_upper", true], ["team.reject_upper", false]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = localizedMessage(label);
          button.addEventListener("click", () => mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/applications/review`,
            { applicant_id:applicant.player_id, accept, requestKind:`application-${accept ? "accept" : "reject"}` },
            localizedMessage("team.reviewing_application")
          ));
          actions.appendChild(button);
        }
        row.append(copy, actions);
        applications.appendChild(row);
      }
      if (!applications.children.length) applications.textContent = localizedMessage("team.no_applications");
    }
    const managerMembers = document.getElementById("team-management-member-list");
    if (managerMembers) {
      managerMembers.replaceChildren();
      (teamState.members || []).forEach((member, index) => managerMembers.appendChild(createTeamMemberRow(member, index, {allowManagement:true})));
    }
  }

  function renderTeamHub() {
    const onboarding = document.getElementById("team-onboarding");
    const hub = document.getElementById("team-hub");
    if (!onboarding || !hub || !teamState) return;
    onboarding.hidden = Boolean(teamState.joined);
    hub.hidden = !teamState.joined;

    if (!teamState.joined) {
      const joinButton = document.getElementById("team-join-button");
      if (joinButton) {
        joinButton.disabled = Boolean(teamState.application_pending);
        joinButton.textContent = localizedMessage(teamState.application_pending ? "team.application_pending_upper" : "team.apply_upper");
      }
      const select = document.getElementById("team-join-select");
      if (select) {
        select.replaceChildren();
        const teams = teamState.available_teams || [];
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = localizedMessage(teams.length ? "team.choose_team" : "team.no_open_teams");
        select.appendChild(placeholder);
        for (const team of teams) {
          const option = document.createElement("option");
          option.value = team.team_id;
          option.textContent = localizedMessage("team.join_option", {name:team.name, members:localizedNumber(team.member_count), limit:localizedNumber(team.member_limit), trophies:localizedNumber(team.total_trophies || 0)});
          select.appendChild(option);
        }
        if (teamState.applied_team_id) select.value = teamState.applied_team_id;
        select.disabled = Boolean(teamState.application_pending);
      }
      return;
    }

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("team-name", teamState.name || localizedMessage("profile.team"));
    setText("team-member-count", localizedMessage("team.member_count", {count:localizedNumber(teamState.member_count || 0), limit:localizedNumber(teamState.member_limit || 30)}));
    renderTrophyValue("team-total-trophies", Number(teamState.total_trophies || 0));
    const statistics = teamState.statistics || {};
    const tournament = teamState.tournament || {};
    setText("team-profile-total-trophies", localizedNumber(teamState.total_trophies || 0));
    setText("team-profile-average-trophies", localizedNumber(teamState.average_trophies || 0));
    setText("team-profile-total-matches", localizedNumber(statistics.total_matches || 0));
    setText("team-profile-win-rate", localizedPercent(boundedWinRatePercent(statistics.win_rate || 0)));
    setText("team-profile-tournament-position", tournament.position ? `#${tournament.position}` : "—");
    setText("team-profile-tournament-points", localizedMessage("event.team_points", {points:localizedNumber(tournament.points || 0)}));
    const teamIdentity = document.getElementById("team-identity-card");
    const teamAvatar = document.getElementById("team-avatar-glyph");
    const managementOpen = document.getElementById("team-management-open");
    const teamCosmetics = teamState.cosmetics || {};
    if (teamIdentity) {
      teamIdentity.dataset.teamBackground = teamCosmetics.selected_bar_background_id || "team_grid";
      teamIdentity.dataset.nameFrame = teamCosmetics.selected_name_frame_id || "none";
    }
    if (teamAvatar) teamAvatar.textContent = teamCosmetics.selected_avatar_id === "team_champion" ? "♛" : "⬡";
    if (managementOpen) managementOpen.disabled = !teamState.is_owner;
    setText("team-management-hint", localizedMessage(teamState.is_owner ? "team.open_management" : "team.profile"));
    renderTeamManagement();
    const teamTabs = document.querySelector("#team-hub .team-tabs");
    if (teamTabs) teamTabs.hidden = activeTeamTab === "management";

    for (const button of document.querySelectorAll("[data-team-tab]")) {
      button.classList.toggle("is-active", button.dataset.teamTab === activeTeamTab);
    }
    for (const panel of document.querySelectorAll("[data-team-panel]")) {
      const active = panel.dataset.teamPanel === activeTeamTab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    }

    const members = teamState.members || [];
    const memberList = document.getElementById("team-member-list");
    if (memberList) {
      memberList.replaceChildren();
      members.forEach((member, index) => memberList.appendChild(createTeamMemberRow(member, index, {allowManagement:true})));
    }

    const moduleSelect = document.getElementById("team-module-request-select");
    if (moduleSelect) {
      const previous = moduleSelect.value;
      moduleSelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = localizedMessage("team.choose_module");
      moduleSelect.appendChild(placeholder);
      const modules = (metaProgressionState?.module_collection || [])
        .filter((module) => module.unlocked !== false)
        .sort((left, right) => localizedRecordText(left, "name").localeCompare(localizedRecordText(right, "name"), document.documentElement.lang === "en" ? "en" : "tr"));
      for (const module of modules) {
        const option = document.createElement("option");
        option.value = module.definition_id;
        option.textContent = localizedMessage("module.name_rarity", {name:localizedUiText(module.name_tr), rarity:moduleRarityLabel(module.rarity)});
        moduleSelect.appendChild(option);
      }
      if ([...moduleSelect.options].some((option) => option.value === previous)) moduleSelect.value = previous;
    }

    const requestList = document.getElementById("team-request-list");
    if (requestList) {
      requestList.replaceChildren();
      const requests = teamState.module_requests || [];
      if (!requests.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = localizedMessage("team.no_module_requests");
        requestList.appendChild(empty);
      }
      for (const request of requests) {
        const card = document.createElement("article");
        card.className = "team-request-card";
        card.dataset.rarity = request.rarity || "common";
        const copy = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = localizedUiText(request.module_name_tr || localizedMessage("team.module"));
        const meta = document.createElement("small");
        meta.className = "team-player-inline-meta";
        const requester = createPublicPlayerName(
          request.requester_id,
          request.requester_name || localizedMessage("profile.player")
        );
        const progress = document.createElement("span");
        progress.textContent = localizedMessage("team.donation_progress", {donated:localizedNumber(request.donated_amount || 0), requested:localizedNumber(request.requested_amount || 0)});
        meta.append(requester, progress);
        copy.append(name, meta);
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = localizedMessage(request.fulfilled ? "team.completed_upper" : request.is_own ? "team.your_request_upper" : "team.donate_one_upper");
        action.disabled = Boolean(request.fulfilled || request.is_own);
        if (!action.disabled) {
          action.addEventListener("click", () => mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/module-requests/${encodeURIComponent(request.request_id)}/donate`,
            { requestKind:"donate" },
            localizedMessage("team.donating_module")
          ));
        }
        card.append(copy, action);
        requestList.appendChild(card);
      }
    }

    const messageList = document.getElementById("team-message-list");
    if (messageList) {
      messageList.replaceChildren();
      const messages = teamState.messages || [];
      if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = localizedMessage("team.start_chat");
        messageList.appendChild(empty);
      }
      for (const message of messages) {
        const row = document.createElement("article");
        row.className = `team-message${message.is_own ? " is-own" : ""}`;
        const author = createPublicPlayerName(
          message.author_id,
          message.author_name || localizedMessage("profile.player")
        );
        const text = document.createElement("p");
        text.textContent = message.text || "";
        row.append(author, text);
        messageList.appendChild(row);
      }
      messageList.scrollTop = messageList.scrollHeight;
    }

    const opponent = document.getElementById("team-training-opponent");
    if (opponent) {
      const previous = opponent.value;
      opponent.replaceChildren();
      const options = teamState.online_opponents || [];
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = localizedMessage(options.length ? "team.choose_online_member" : "team.no_online_members");
      opponent.appendChild(placeholder);
      for (const member of options) {
        const option = document.createElement("option");
        option.value = member.player_id;
        option.textContent = member.display_name;
        opponent.appendChild(option);
      }
      if ([...opponent.options].some((option) => option.value === previous)) opponent.value = previous;
    }

    const trainingList = document.getElementById("team-training-list");
    if (trainingList) {
      trainingList.replaceChildren();
      const challenges = teamState.training_challenges || [];
      if (!challenges.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = localizedMessage("team.no_training_invitations");
        trainingList.appendChild(empty);
      }
      for (const challenge of challenges) {
        const card = document.createElement("article");
        card.className = "team-training-card";
        const copy = document.createElement("div");
        const title = document.createElement("div");
        title.className = "team-challenge-player-links";
        const challenger = createPublicPlayerName(
          challenge.challenger_id,
          challenge.challenger_name || localizedMessage("profile.player")
        );
        const arrow = document.createElement("span");
        arrow.textContent = "→";
        const opponentName = createPublicPlayerName(
          challenge.opponent_id,
          challenge.opponent_name || localizedMessage("profile.player")
        );
        title.append(challenger, arrow, opponentName);
        const meta = document.createElement("small");
        meta.textContent = localizedMessage(challenge.status === "completed"
          ? "team.training_completed"
          : challenge.status === "pending" ? "team.training_pending" : "team.training_accepted");
        copy.append(title, meta);
        if (challenge.can_accept) {
          const accept = document.createElement("button");
          accept.type = "button";
          accept.textContent = localizedMessage("team.accept_invitation_upper");
          accept.addEventListener("click", async () => {
            const result = await mutateTeam(
              `/teams/${encodeURIComponent(teamState.team_id)}/training-challenges/${encodeURIComponent(challenge.challenge_id)}/accept`,
              { requestKind:"training-accept" },
              localizedMessage("team.accepting_invitation")
            );
            if (result.ok && result.state?.operation?.battle) {
              launchSocialBattle(result.state.operation.battle);
            }
          });
          card.append(copy, accept);
        } else if (challenge.status === "accepted" && challenge.battle_session_id) {
          const enter = document.createElement("button");
          enter.type = "button";
          enter.textContent = localizedMessage("team.enter_battle_upper");
          enter.addEventListener("click", () => launchSocialBattle({
            session_id:challenge.battle_session_id,
            players:[challenge.challenger_id, challenge.opponent_id],
            opponent_type:"human",
          }));
          card.append(copy, enter);
        } else {
          card.appendChild(copy);
        }
        trainingList.appendChild(card);
      }
    }
  }

  function renderMetaHubScreens() {
    renderHomeHub();
    renderModuleCollection();
    renderShop();
    renderCoreCollection();
    renderCanonStatistics();
    renderProfileHighlights();
    renderTeamHub();
    const state = metaProgressionState;
    if (state) {
      const credits = document.getElementById("lobby-circuit-credits");
      if (credits) credits.textContent = String(state.circuit_credits || 0);
      const flux = document.getElementById("lobby-flux-shards");
      if (flux) flux.textContent = String(state.flux_shards || 0);
    }
  }

  document.querySelectorAll("[data-team-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTeamTab = button.dataset.teamTab || "profile";
      renderTeamHub();
    });
  });
  document.getElementById("daily-meta-roll")?.addEventListener("click", rollDailyMeta);
  document.getElementById("daily-meta-dialog")?.addEventListener("cancel", (event) => {
    if (dailyMetaState?.requires_roll) event.preventDefault();
  });
  document.querySelectorAll("[data-weekly-event-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeWeeklyEventTab = button.dataset.weeklyEventTab || "overview";
      renderEventSubpages();
    });
  });
  document.querySelectorAll("[data-team-event-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTeamEventTab = button.dataset.teamEventTab || "overview";
      renderEventSubpages();
    });
  });
  document.getElementById("weekly-tournament-register")?.addEventListener("click", () =>
    registerEvent("/events/weekly/register", "weekly-event-status", localizedMessage("event.registering_weekly"))
  );
  document.getElementById("team-tournament-register")?.addEventListener("click", () =>
    registerEvent("/events/team/register", "team-event-status", localizedMessage("event.registering_team"))
  );
  document.getElementById("friend-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("friend-search-input")?.value?.trim() || "";
    if (query) searchFriends(query);
  });
  document.getElementById("friend-invite-create")?.addEventListener("click", async () => {
    const output = document.getElementById("friend-invite-output");
    try {
      const invite = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/invite-codes`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId})},
        12000
      );
      if (output) output.textContent = `${invite.code} · ${invite.web_link} · QR: ${invite.qr_payload}`;
    } catch (error) {
      if (output) output.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("direct-message-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendDirectMessage();
  });
  globalThis.addEventListener?.("gridshard:deep-link", (event) => {
    const rawUrl = event?.detail?.url || event?.detail || "";
    void consumePendingDeepLink(rawUrl);
  });
  const nativeAppPlugin = globalThis.Capacitor?.Plugins?.App;
  nativeAppPlugin?.addListener?.("appUrlOpen", ({ url }) => {
    void consumePendingDeepLink(url);
  });
  const nativeLaunchUrl = nativeAppPlugin?.getLaunchUrl?.();
  nativeLaunchUrl?.then((result) => {
    if (result?.url) void consumePendingDeepLink(result.url);
  }).catch(() => {});
  document.getElementById("account-onboarding-dialog")?.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
  document.getElementById("account-onboarding-guest")?.addEventListener("click", () => {
    finishAccountOnboarding({ dismiss:true });
  });
  for (const provider of ["google", "apple"]) {
    document.getElementById(`account-onboarding-${provider}`)?.addEventListener("click", async () => {
      const status = document.getElementById("account-onboarding-status");
      try {
        const result = await requestJsonWithDeadline(
          `/accounts/${encodeURIComponent(participantPlayerId)}/oauth/${provider}/start?mode=login`,
          {cache:"no-store"},
          12000
        );
        if (result.authorization_url) globalThis.location.assign(result.authorization_url);
        else if (status) status.textContent = localizedMessage("account.provider_not_configured_message", {provider:provider.toUpperCase()});
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : String(error);
      }
    });
  }
  document.getElementById("account-onboarding-code-request")?.addEventListener("click", async () => {
    const status = document.getElementById("account-onboarding-status");
    const email = document.getElementById("account-onboarding-email")?.value?.trim() || "";
    if (!email) {
      if (status) status.textContent = "Doğrulama kodu için e-posta adresini gir.";
      return;
    }
    try {
      const result = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/verification/request`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,channel:"email",destination:email})},
        12000
      );
      const codeInput = document.getElementById("account-onboarding-code");
      if (result.development_code && codeInput) codeInput.value = result.development_code;
      if (status) status.textContent = result.delivery_configured
        ? localizedMessage("account.code_sent", {destination:result.destination})
        : result.development_code
          ? "Yerel geliştirme kodu alana yerleştirildi."
          : "E-posta sağlayıcısı henüz yapılandırılmadı; doğrulama isteği kaydedildi.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("account-onboarding-code-confirm")?.addEventListener("click", async () => {
    const status = document.getElementById("account-onboarding-status");
    const code = document.getElementById("account-onboarding-code")?.value?.trim() || "";
    if (!/^\d{6}$/.test(code)) {
      if (status) status.textContent = "Altı haneli doğrulama kodunu gir.";
      return;
    }
    try {
      const result = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/verification/confirm`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,channel:"email",code})},
        12000
      );
      accountPlatformState = result.account;
      renderAccountPlatform();
      finishAccountOnboarding();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("account-verification-request")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    const channel = document.getElementById("account-contact-channel")?.value || "email";
    const destination = document.getElementById("account-contact-destination")?.value?.trim() || "";
    try {
      const result = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/verification/request`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,channel,destination})},
        12000
      );
      const codeInput = document.getElementById("account-verification-code");
      if (result.development_code && codeInput) codeInput.value = result.development_code;
      if (status) status.textContent = result.delivery_configured
        ? localizedMessage("account.code_sent", {destination:result.destination})
        : result.development_code
          ? "Yerel geliştirme kodu doğrulama alanına yerleştirildi."
          : "E-posta teslimi için SMTP sağlayıcısı yapılandırılmalı.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("account-verification-confirm")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    const channel = document.getElementById("account-contact-channel")?.value || "email";
    const code = document.getElementById("account-verification-code")?.value?.trim() || "";
    try {
      const result = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/verification/confirm`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,channel,code})},
        12000
      );
      accountPlatformState = result.account;
      renderAccountPlatform();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  for (const provider of ["google", "apple"]) {
    document.getElementById(`account-oauth-${provider}`)?.addEventListener("click", async () => {
      const status = document.getElementById("account-platform-status");
      try {
        const result = await requestJsonWithDeadline(
          `/accounts/${encodeURIComponent(participantPlayerId)}/oauth/${provider}/start`,
          {cache:"no-store"},
          12000
        );
        if (result.authorization_url) window.location.assign(result.authorization_url);
        else if (status) status.textContent = localizedMessage("account.oauth_not_configured", {provider:provider.toUpperCase()});
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : String(error);
      }
    });
  }
  document.getElementById("account-recovery-request")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    const identifier = document.getElementById("account-recovery-identifier")?.value?.trim() || "";
    try {
      const result = await requestJsonWithDeadline(
        "/account-recovery/request",
        {method:"POST",body:JSON.stringify({identifier})},
        12000
      );
      if (status) status.textContent = result.accepted
        ? "Adres kayıtlıysa kurtarma kodu gönderildi."
        : "Kurtarma isteği işlenemedi.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("account-recovery-confirm")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    const code = document.getElementById("account-recovery-code")?.value?.trim() || "";
    if (!globalThis.crypto?.getRandomValues) {
      if (status) status.textContent = "Bu tarayıcı güvenli cihaz sırrı üretemiyor.";
      return;
    }
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    const newDeviceSecret = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    if (newDeviceSecret.length < 32) {
      if (status) status.textContent = "Bu tarayıcı güvenli cihaz sırrı üretemiyor.";
      return;
    }
    try {
      await requestJsonWithDeadline(
        "/account-recovery/confirm",
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            code,
            new_device_secret:newDeviceSecret,
            device_id:globalThis.GridshardAuth?.session?.deviceId?.() || null,
          }),
        },
        12000
      );
      globalThis.GridshardAuth?.session?.replaceDeviceSecret?.(newDeviceSecret);
      if (status) status.textContent = "Hesap kurtarıldı. Güvenli oturum yeniden açılıyor…";
      globalThis.location?.reload?.();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  function setNativePushStatus(message) {
    const status = document.getElementById("account-platform-status");
    if (status) status.textContent = message;
  }
  const nativePush = new globalThis.GridshardNativePush.NativePushController({
    request: (path, options) => requestJsonWithDeadline(path, options, 12000),
    identity: () => ({ playerId: participantPlayerId, deviceId: globalThis.GridshardAuth?.session?.deviceId?.() }),
    onStatus: setNativePushStatus,
    onOpen: (url) => consumePendingDeepLink(url),
  });
  // Install action listeners before authentication finishes (cold-start taps).
  void nativePush.listen().catch(() => {});
  for (const [id, action] of [["account-push-enable", "enable"], ["account-push-disable", "disable"]]) {
    const button = document.getElementById(id);
    if (button) button.hidden = !nativePush.plugin;
    button?.addEventListener("click", async () => {
      button.disabled = true;
      try { await nativePush[action](); }
      catch (_) { setNativePushStatus("Bildirim işlemi tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin."); }
      finally { button.disabled = false; }
    });
  }
  const resumeNativePush = () => {
    if (accountPlatformState && document.visibilityState !== "hidden") {
      void nativePush.start().catch(() => {});
    }
  };
  globalThis.addEventListener?.("online", resumeNativePush);
  document.addEventListener("visibilitychange", resumeNativePush);
  document.getElementById("account-data-export")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    try {
      const payload = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/data-export`,
        {cache:"no-store"},
        20000
      );
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = localizedMessage("account.export_filename", {id:participantPlayerId});
      anchor.click();
      URL.revokeObjectURL(url);
      if (status) status.textContent = "Kişisel veri kopyası indirildi. Bu dosya oyun kaydı değildir; değiştirilerek ilerleme yüklenemez.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("account-data-delete")?.addEventListener("click", async () => {
    const status = document.getElementById("account-platform-status");
    const confirmation = document.getElementById("account-delete-confirmation")?.value || "";
    try {
      await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/delete`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,confirmation})},
        20000
      );
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("team-create-button")?.addEventListener("click", async () => {
    const input = document.getElementById("team-create-name");
    const name = input?.value?.trim() || "";
    if (!name) {
      setTeamActionStatus(localizedMessage("team.name_required"), "error");
      return;
    }
    const result = await mutateTeam(
      "/teams",
      { name, requestKind:"create" },
      localizedMessage("team.creating")
    );
    if (result.ok && input) input.value = "";
  });
  document.getElementById("team-join-button")?.addEventListener("click", () => {
    const teamId = document.getElementById("team-join-select")?.value || "";
    if (!teamId) {
      setTeamActionStatus(localizedMessage("team.choose_to_join"), "error");
      return;
    }
    mutateTeam(
      `/teams/${encodeURIComponent(teamId)}/join`,
      { requestKind:"join" },
      localizedMessage("team.joining")
    );
  });
  document.getElementById("team-management-open")?.addEventListener("click", () => {
    if (!teamState?.is_owner) return;
    activeTeamTab = "management";
    activeTeamManagementTab = "cosmetics";
    teamCosmeticDraft = null;
    renderTeamHub();
  });
  document.getElementById("team-management-back")?.addEventListener("click", () => {
    activeTeamTab = "profile";
    renderTeamHub();
  });
  document.querySelectorAll("[data-team-management-tab]").forEach((button) => button.addEventListener("click", () => {
    activeTeamManagementTab = button.dataset.teamManagementTab || "cosmetics";
    renderTeamManagement();
  }));
  document.getElementById("team-cosmetic-save")?.addEventListener("click", async () => {
    if (!teamState?.team_id || !teamCosmeticDraft) return;
    const result = await mutateTeam(`/teams/${encodeURIComponent(teamState.team_id)}/cosmetics`, {...teamCosmeticDraft, requestKind:"team-cosmetics"}, localizedMessage("team.appearance_saving"));
    if (result.ok) teamCosmeticDraft = null;
  });
  document.getElementById("team-module-request-button")?.addEventListener("click", () => {
    const moduleId = document.getElementById("team-module-request-select")?.value || "";
    if (!moduleId || !teamState?.team_id) {
      setTeamActionStatus(localizedMessage("team.choose_module"), "error");
      return;
    }
    mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/module-requests`,
      { module_id:moduleId, requestKind:"module-request" },
      localizedMessage("team.requesting_module")
    );
  });
  async function sendTeamMessage() {
    const input = document.getElementById("team-message-input");
    const message = input?.value?.trim() || "";
    if (!message || !teamState?.team_id) return;
    const result = await mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/messages`,
      { message, requestKind:"message" },
      localizedMessage("team.sending_message")
    );
    if (result.ok && input) input.value = "";
  }
  document.getElementById("team-message-send")?.addEventListener("click", sendTeamMessage);
  document.getElementById("team-message-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendTeamMessage();
    }
  });
  document.getElementById("team-training-send")?.addEventListener("click", () => {
    const opponentId = document.getElementById("team-training-opponent")?.value || "";
    if (!opponentId || !teamState?.team_id) {
      setTeamActionStatus(localizedMessage("team.choose_training_member"), "error");
      return;
    }
    mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/training-challenges`,
      { opponent_id:opponentId, requestKind:"training" },
      localizedMessage("team.sending_training_invite")
    );
  });

  document.querySelectorAll("[data-module-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModuleFilter = button.dataset.moduleFilter || "all";
      document.querySelectorAll("[data-module-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderModuleCollection();
    });
  });
  document.querySelectorAll("[data-card-page]").forEach((button) => {
    button.addEventListener("click", () => setCardCollectionPage(button.dataset.cardPage));
  });
  document.getElementById("module-quick-info")?.addEventListener("click", openModuleDetail);
  document.getElementById("module-quick-select")?.addEventListener("click", selectCollectionModule);
  document.getElementById("core-quick-info")?.addEventListener("click", openCoreDetail);
  document.getElementById("core-quick-select")?.addEventListener("click", selectCollectionCore);
  document.getElementById("core-detail-close")?.addEventListener("click", () => document.getElementById("core-detail-dialog")?.close());
  globalThis.GridshardCardSwipe.bind(document.getElementById("core-detail-dialog"), navigateCoreDetail);
  document.getElementById("core-detail-select")?.addEventListener("click", async () => {
    const result = await selectCollectionCore();
    if (result.ok) openCoreDetail();
  });
  document.getElementById("core-detail-upgrade")?.addEventListener("click", async () => {
    const button = document.getElementById("core-detail-upgrade");
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try { await mutateSelectedCore("upgrade"); }
    catch (error) { document.getElementById("core-detail-status").textContent = error.message; if (button) button.disabled = false; }
  });
  document.querySelectorAll("[data-core-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-core-detail-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCoreDetailTab(button.dataset.coreDetailTab || "overview");
    });
  });
  document.getElementById("module-detail-close")?.addEventListener("click", () => document.getElementById("module-detail-dialog")?.close());
  globalThis.GridshardCardSwipe.bind(document.getElementById("module-detail-dialog"), navigateModuleDetail);
  document.getElementById("module-detail-upgrade")?.addEventListener("click", upgradeCollectionModule);
  document.querySelectorAll("[data-module-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-module-detail-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderModuleDetailTab(button.dataset.moduleDetailTab || "overview");
    });
  });

  function returnToMainMenu() {
    const result = appRouter.goMenu();
    renderAppScreen();
    return result;
  }

  const connectionStatusEl =
    document.getElementById(
      "pvp-connection-status"
    );

  function renderConnectionStatus(status) {
    if (!connectionStatusEl) {
      return;
    }

    const labels = {
      idle: "Bağlantı: Hazır",
      connecting: "Bağlantı: Kuruluyor",
      open: "Bağlantı: Aktif",
      reconnecting: "Bağlantı: Yeniden bağlanıyor",
      closed: "Bağlantı: Kapalı",
      error: "Bağlantı: Hata",
    };

    connectionStatusEl.textContent =
      labels[status] || localizedMessage("battle.connection_status", {status});
    connectionStatusEl.dataset.status =
      status;

    if (status === "error") {
      showPlayError(
        "websocket",
        "Savaş sunucusuna bağlantı kurulamadı. Yeniden bağlanmayı deneyebilirsin."
      );
    } else if (
      status === "open"
      && playRecoveryState.kind
      === "websocket"
    ) {
      clearPlayError();
    }
  }

  const matchmakingState =
    new RelayMatchmakingClientState();

  function trackMatchmakingStart() {
    recordProductEvent("matchmaking_started", {mode:"arena"});
    return telemetryDispatcher
      .trackMatchmakingStarted({
        rating:
          profileState.profile?.rating
          ?? 1000,
      });
  }

  function trackRematchRequest() {
    return telemetryDispatcher
      .trackRematchRequested({
        previous_session_id:
          pvpState.sessionId,
      });
  }

  const progressionState =
    new RelayProgressionClientState();

  const playerDataSnapshotState =
    new RelayPlayerDataSnapshotState();

  const webTestKpiState =
    new RelayWebTestKpiState();

  const webTestRcReportState =
    new RelayWebTestRcReportState();

  const webTestGoNoGoState =
    new RelayWebTestGoNoGoState();

  const testRunConsistency =
    new RelayTestRunConsistencyState();

  const rcCandidateState =
    new RelayRcCandidateState();

  const launchReadinessState =
    new RelayLaunchReadinessState();

  const firstRunChecklistState =
    new RelayFirstRunChecklistState();

  const preflightState =
    new RelayPreflightState();

  const webTestRunStatusState =
    new RelayWebTestRunStatusState();

  const operationStatusState =
    new RelayOperationStatusState();

  const operationStabilityState =
    new RelayOperationStabilityState();

  const monitoringState =
    new RelayMonitoringState();

  const playRecoveryState =
    new RelayPlayRecoveryState();

  const releaseCheckState =
    new RelayReleaseCheckState();

  const webTestBuildState =
    new RelayWebTestBuildState();

  const serverBootGate =
    new RelayServerBootGate({
      healthState:
        webTestBuildState,
      releaseCheckState,
      expectedVersion:
        "2.1.0-beta.43",
      expectedProtocolVersion: 1,
      operationalChecks: operationalDiagnosticsEnabled,
    });
  const playReadinessGate =
    new RelayPlayReadinessGate({
      serverBootGate,
      participantBootstrap,
      participantContinuity,
      launchReadinessState,
    });



  const telemetryStatus =
    document.getElementById(
      "telemetry-send-status"
    );

  const telemetryTransport =
    new RelayTelemetryHttpTransport({
      requestJson:
        operationalDiagnosticsEnabled
          ? null
          : async () => ({
              accepted:true,
              skipped:true,
            }),
      onStatusChange:
        renderTelemetryStatus,
    });

  const telemetryDispatcher =
    new RelayTelemetryDispatcher({
      playerId: participantPlayerId,
      sessionId: pvpState.sessionId,
      transport:
        (event) =>
          telemetryTransport
            .enqueue(event),
    });

  telemetryDispatcher.trackGameOpened({
    platform: "web",
    build: "2.1.0-beta.43",
  });

  const postMatchSync =
    new RelayPostMatchSync({
      playerId:
        pvpState.playerId,
      profileState,
      statisticsState,
      progressionState,
      requestJson:
        async (path) => {
          let lastError = null;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
              const response = await fetchWithDeadline(
                path,
                { cache: "no-store" },
                30000
              );
              const payload = await response.json();
              if (!response.ok) {
                throw new Error(
                  localizedApiError(payload, response.status)
                );
              }
              return payload;
            } catch (error) {
              lastError = error;
              if (attempt < 3) {
                await new Promise((resolve) => {
                  window.setTimeout(resolve, 180 * (attempt + 1));
                });
              }
            }
          }
          throw lastError || new Error("Maç sonucu kaydı alınamadı.");
        },
    });

  let postMatchSyncInFlight = null;
  let onlineFinishPresentedSessionId = null;
  const preparedCorePowerFx = new Set();
  const POST_MATCH_CORE_EXPLOSION_HOLD_MS = 2500;
  let postMatchRevealReady = false;
  let postMatchRevealTimer = null;
  let postMatchRevealKey = null;

  function resetPostMatchReveal() {
    window.clearTimeout(postMatchRevealTimer);
    postMatchRevealTimer = null;
    postMatchRevealKey = null;
    postMatchRevealReady = false;
  }

  function schedulePostMatchReveal(key, { waitForCoreExplosion = false } = {}) {
    const normalizedKey = String(key || "battle-result");
    if (postMatchRevealKey === normalizedKey && (postMatchRevealReady || postMatchRevealTimer)) {
      return;
    }
    window.clearTimeout(postMatchRevealTimer);
    postMatchRevealTimer = null;
    postMatchRevealKey = normalizedKey;
    postMatchRevealReady = !waitForCoreExplosion;
    if (!waitForCoreExplosion) {
      renderPlayModeUi();
      return;
    }
    postMatchRevealTimer = window.setTimeout(() => {
      postMatchRevealTimer = null;
      postMatchRevealReady = true;
      renderPlayModeUi();
    }, POST_MATCH_CORE_EXPLOSION_HOLD_MS);
  }

  function finishReasonLabel(reason) {
    const labels = {
      core_destroyed: "Çekirdek yok edildi",
      player_forfeit: "Savaştan çekilme",
      time_limit_tiebreak: "Süre sonu üstünlüğü",
      time_limit_draw: "Süre sonu beraberliği",
      simultaneous_core_tiebreak: "Çifte çekirdek yıkımı",
      simultaneous_core_draw: "Eşzamanlı çekirdek yıkımı",
      simultaneous_core_destroyed: "Eşzamanlı çekirdek yıkımı",
    };
    return localizedUiText(labels[reason] || "Savaş tamamlandı");
  }

  function onlineOutcome(result) {
    if (result?.is_draw) return "draw";
    return result?.winner_player_id === pvpState.playerId
      ? "victory"
      : "defeat";
  }

  function activeFinalBattleResult() {
    return activePlayMode === "local"
      ? localServerFinalResult
      : pvpState.finalResult;
  }

  function setBattleResultHero(outcome) {
    const hero = document.getElementById("battle-result-hero");
    const outcomeEl = document.getElementById("battle-result-outcome");
    const titleEl = document.getElementById("battle-result-title");
    const labels = {
      victory: ["ZAFER", "DEVRE ÜSTÜNLÜĞÜ SENİN"],
      defeat: ["MAĞLUBİYET", "DEVREN SAVAŞ DIŞI KALDI"],
      draw: ["BERABERLİK", "İKİ DEVRE DE AYAKTA KALDI"],
      pending: ["Maç Sonucu", "Sonuç hazırlanıyor"],
    };
    const [title, status] = labels[outcome] || labels.pending;
    if (hero) hero.dataset.outcome = outcome;
    if (titleEl) titleEl.textContent = localizedUiText(title);
    if (outcomeEl) outcomeEl.textContent = localizedUiText(status);
  }

  function showPostMatchStage(stage = "damage") {
    const rewardsVisible = stage === "rewards";
    const damage = document.getElementById("post-match-damage-stage");
    const rewards = document.getElementById("post-match-reward-stage");
    const continueButton = document.getElementById("post-match-continue");
    if (damage) damage.hidden = rewardsVisible;
    if (rewards) rewards.hidden = !rewardsVisible;
    if (continueButton) {
      continueButton.hidden = false;
      continueButton.dataset.postMatchStage = rewardsVisible ? "rewards" : "damage";
    }
  }

  function renderPostMatchRewards() {
    const result = activeFinalBattleResult();
    const progression = progressionState.viewModel();
    const outcome = result
      ? (
          result.is_draw
            ? "draw"
            : result.winner_player_id === participantPlayerId
              ? "victory"
              : "defeat"
        )
      : localBattleOutcome;
    const outcomeEl = document.getElementById("post-match-reward-outcome");
    if (outcomeEl) {
      outcomeEl.dataset.outcome = outcome;
      outcomeEl.textContent = outcome === "victory" ? "ZAFER" : outcome === "defeat" ? "MAĞLUBİYET" : outcome === "draw" ? "BERABERLİK" : "SONUÇ";
    }
    const trophy = document.getElementById("post-match-trophy-reward");
    const credits = document.getElementById("post-match-credit-reward");
    const experience = document.getElementById("post-match-experience-reward");
    const teamPoint = document.getElementById("post-match-team-point-reward");
    const heading = document.getElementById("post-match-reward-heading");
    const rewardList = document.getElementById("post-match-reward-list");
    const accountingNote = document.getElementById("post-match-accounting-note");
    const trophyCard = document.getElementById("post-match-trophy-card");
    const creditCard = document.getElementById("post-match-credit-card");
    const experienceCard = document.getElementById("post-match-experience-card");
    const teamPointCard = document.getElementById("post-match-team-point-card");
    const matchType = progression?.matchType || result?.match_type || "local_test";
    const teamTournament = matchType === "team_tournament";
    const profileNeutral = ["friend_battle", "team_training"].includes(matchType);
    const localTest = activePlayMode === "local"
      && (!result || result.match_type === "local_test");
    const pendingLabel = postMatchSync.lastError
      ? "Yüklenemedi · Tekrar dene"
      : "Kaydediliyor…";
    if (trophy) trophy.textContent = progression
      ? `${Number(progression.ratingDelta) >= 0 ? "+" : ""}${Number(progression.ratingDelta)}`
      : localTest ? "0" : pendingLabel;
    if (credits) credits.textContent = progression
      ? `+${Number(progression.circuitCreditsAwarded || 0)}`
      : localTest ? "+0" : pendingLabel;
    if (experience) experience.textContent = progression
      ? `+${Number(progression.xpAwarded || 0)}`
      : localTest ? "+0" : pendingLabel;
    if (teamPoint) teamPoint.textContent = progression
      ? `+${Number(progression.teamTournamentPointsAwarded || 0)}`
      : pendingLabel;
    if (heading) {
      heading.textContent = teamTournament
        ? "TAKIM TURNUVASI SONUCU"
        : profileNeutral
          ? "ANTRENMAN SONUCU"
          : "SAVAŞ ÖDÜLLERİ";
    }
    if (rewardList) {
      rewardList.dataset.accountingMode = teamTournament
        ? "team-tournament"
        : profileNeutral
          ? "neutral"
          : "profile";
    }
    for (const card of [trophyCard, creditCard, experienceCard]) {
      if (card) card.hidden = teamTournament || profileNeutral;
    }
    if (teamPointCard) teamPointCard.hidden = !teamTournament;
    if (accountingNote) {
      accountingNote.hidden = !(teamTournament || profileNeutral);
      accountingNote.textContent = teamTournament
        ? "Bu maç yalnız takım turnuvası katkı puanına işlendi; kupa ve profil ilerlemesi değişmedi."
        : profileNeutral
          ? "Bu antrenman maçı profile, kupaya veya Devre Yolu ilerlemesine etki etmedi."
          : "";
    }
  }

  function setAnalysisValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function renderPostMatchScoreboard(result) {
    const host = document.getElementById("post-match-scoreboard");
    if (!host || !result?.result_summary) return;
    host.replaceChildren();
    const playerIds = Object.keys(result.result_summary).sort((left, right) => {
      if (left === result.winner_player_id) return -1;
      if (right === result.winner_player_id) return 1;
      return left.localeCompare(right);
    });
    for (const playerId of playerIds) {
      const summary = result.result_summary[playerId] || {};
      const player = result.players?.[playerId] || pvpState.snapshot?.players?.[playerId] || {};
      const card = document.createElement("article");
      const outcome = result.is_draw ? "draw" : playerId === result.winner_player_id ? "winner" : "loser";
      card.className = `post-match-player-card is-${outcome}`;

      const head = document.createElement("header");
      const outcomeLabel = document.createElement("span");
      outcomeLabel.className = "post-match-player-outcome";
      outcomeLabel.textContent = result.is_draw ? "BERABERE" : outcome === "winner" ? "ZAFER" : "MAĞLUBİYET";
      const playerName = player.display_name
        || (playerId === participantPlayerId ? profileState.viewModel()?.displayName : null)
        || playerId;
      const playerLabel = isPublicProfileTarget(playerId, player)
        ? createPublicPlayerName(playerId, playerName)
        : document.createElement("strong");
      if (!isPublicProfileTarget(playerId, player)) {
        playerLabel.textContent = localizedMessage("battle.player_label", {name:playerName, you:playerId === participantPlayerId ? localizedMessage("battle.you_suffix") : ""});
      }
      head.append(outcomeLabel, playerLabel);
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "post-match-player-body";

      const coreCard = document.createElement("div");
      coreCard.className = "post-match-core-card";
      const coreType = summary.core_type || player.core_type || "core_resonance";
      const coreVisual = applyCoreVisualIdentity(coreCard, coreType);
      const coreGlyph = document.createElement("i");
      coreGlyph.textContent = coreVisual.glyph;
      const coreCopy = document.createElement("div");
      const coreName = document.createElement("strong");
      coreName.textContent = localizedUiText(coreVisual.nameTr || "Çekirdek");
      const coreLevel = document.createElement("small");
      coreLevel.textContent = localizedMessage("core.level", {level:localizedNumber(Math.max(1, Number(summary.core_level || player.core_level || 1)))});
      const trophy = document.createElement("b");
      const rating = Number(
        player.rating
        ?? (playerId === participantPlayerId ? profileState.viewModel()?.rating : 0)
        ?? 0
      );
      trophy.textContent = `🏆 ${localizedNumber(Math.max(0, Math.round(rating)))}`;
      coreCopy.append(coreName, coreLevel, trophy);
      coreCard.append(coreGlyph, coreCopy);

      const damageColumn = document.createElement("div");
      damageColumn.className = "post-match-damage-column";
      const total = document.createElement("div");
      total.className = "post-match-total-damage";
      const rows = document.createElement("div");
      rows.className = "post-match-module-damage";
      const moduleDamage = (Array.isArray(summary.damage_by_module) ? summary.damage_by_module : [])
        .filter((item) => {
          const definitionId = String(item?.definition_id || "").toLocaleLowerCase("tr");
          const name = String(item?.name_tr || "").toLocaleLowerCase("tr");
          return definitionId !== "core" && !definitionId.startsWith("core_") && name !== "çekirdek";
        });
      const damageEquivalent = (item) => Math.max(0, Math.round(
        Number(item.damage || 0)
        + Number(item.damage_absorbed || 0) * 0.8
        + Number(item.repair || 0) * 0.9
        + Number(item.heat_reduced || 0) * 0.4
        + Number(item.energy_generated || 0) * 0.35
        + Number(item.energy_discharged || 0) * 0.35
        + Number(item.energy_saved || 0) * 0.45
        + Number(item.support_value || 0) * 0.8
        + Number(item.control_seconds || 0) * 5
        + Number(item.control_actions || 0) * 30
        + Number(item.support_actions || 0) * 4
      ));
      const moduleRows = moduleDamage.map((item) => ({
        ...item,
        effectiveDamage: Number.isFinite(Number(item.damage_equivalent))
          ? Math.max(0, Math.round(Number(item.damage_equivalent)))
          : damageEquivalent(item),
      }));
      const totalEquivalent = moduleRows.reduce((sum, item) => sum + item.effectiveDamage, 0);
      const totalLabel = document.createElement("span");
      totalLabel.textContent = "TOPLAM HASAR EŞDEĞERİ";
      const totalValue = document.createElement("strong");
      totalValue.textContent = localizedNumber(totalEquivalent);
      total.append(totalLabel, totalValue);
      damageColumn.appendChild(total);

      const maximum = Math.max(1, ...moduleRows.map((item) => item.effectiveDamage));
      for (const item of moduleRows) {
        const row = document.createElement("div");
        row.className = "post-match-damage-row";
        const icon = document.createElement("span");
        icon.className = "post-match-damage-icon";
        icon.textContent = moduleIconFor({ nameTr: item.name_tr });
        const copy = document.createElement("div");
        const rowName = document.createElement("strong");
        rowName.textContent = localizedRecordText(item, "name") || item.definition_id;
        const levelCopy = document.createElement("small");
        levelCopy.textContent = localizedMessage("module.level_short", {level:localizedNumber(item.level || 1)});
        const track = document.createElement("i");
        const fill = document.createElement("b");
        fill.style.width = `${Math.max(0, Math.min(100, item.effectiveDamage / maximum * 100))}%`;
        track.appendChild(fill);
        copy.append(rowName, levelCopy, track);
        const damage = document.createElement("em");
        damage.textContent = localizedNumber(item.effectiveDamage);
        damage.title = "Hasar eşdeğeri";
        row.append(icon, copy, damage);
        rows.appendChild(row);
      }
      if (!moduleDamage.length) {
        const empty = document.createElement("p");
        empty.textContent = "Bu oyuncu için modül hasar kaydı bulunmuyor.";
        rows.appendChild(empty);
      }
      damageColumn.appendChild(rows);
      body.append(coreCard, damageColumn);
      card.appendChild(body);
      host.appendChild(card);
    }
    host.hidden = !host.childElementCount;
  }

  function renderOnlineBattleAnalysis(result) {
    const panel = document.getElementById("battle-analysis-summary");
    if (!panel || !result) return;
    const own = result.result_summary?.[pvpState.playerId] || {};
    panel.hidden = false;
    setAnalysisValue(
      "battle-analysis-duration",
      localizedMessage("time.seconds_short", {count:localizedNumber(Number(result.finished_at_ms || 0) / 1000, {minimumFractionDigits:1, maximumFractionDigits:1})})
    );
    setAnalysisValue(
      "battle-analysis-reason",
      finishReasonLabel(result.finish_reason)
    );
    setAnalysisValue("battle-analysis-damage", Number(own.damage_dealt || 0));
    setAnalysisValue("battle-analysis-core", localizedMessage("battle.hp_value", {hp:localizedNumber(own.core_hp || 0)}));
    setAnalysisValue(
      "battle-analysis-modules",
      Number(own.living_module_count || 0)
    );
    setAnalysisValue(
      "battle-analysis-hp",
      `${Number(own.remaining_hp || 0)} / ${Number(own.total_max_hp || 0)}`
    );
    renderPostMatchScoreboard(result);
  }

  function renderLocalBattleAnalysis({ won, finishReason }) {
    const panel = document.getElementById("battle-analysis-summary");
    if (!panel || !localBattleMetrics) return;
    const modules = [...client.modules.values()];
    const core = client.modules.get("core-1");
    const living = modules.filter(
      (module) => module.status === "active" && Number(module.hp || 0) > 0
    );
    const remainingHp = modules.reduce(
      (sum, module) => sum + Math.max(0, Number(module.hp || 0)),
      0
    );
    const totalHp = modules.reduce(
      (sum, module) => sum + Math.max(0, Number(module.maxHp || 0)),
      0
    );
    panel.hidden = false;
    setAnalysisValue(
      "battle-analysis-duration",
      localizedMessage("time.seconds_short", {count:localizedNumber(Number(localBattleMetrics.duration_ms || 0) / 1000, {minimumFractionDigits:1, maximumFractionDigits:1})})
    );
    setAnalysisValue(
      "battle-analysis-reason",
      finishReasonLabel(finishReason || (won ? "core_destroyed" : null))
    );
    setAnalysisValue(
      "battle-analysis-damage",
      Number(localBattleMetrics.damage_dealt || 0)
    );
    setAnalysisValue("battle-analysis-core", localizedMessage("battle.hp_value", {hp:localizedNumber(core?.hp || 0)}));
    setAnalysisValue("battle-analysis-modules", living.length);
    setAnalysisValue("battle-analysis-hp", `${remainingHp} / ${totalHp}`);
    if (localServerFinalResult) {
      renderPostMatchScoreboard(localServerFinalResult);
    }
  }

  function resetBattleResultPresentation() {
    resetPostMatchReveal();
    onlineFinishPresentedSessionId = null;
    progressionState.clear?.();
    document.body.dataset.onlineFinished = "false";
    criticalCoreAudioRequested = false;
    clearTerminalAudioState("battle_result_reset");
    setBattleResultHero("pending");
    const resultEl = document.getElementById("battle-result-summary");
    if (resultEl) {
      resultEl.hidden = true;
      resultEl.textContent = "Sonuç bekleniyor";
    }
    const analysis = document.getElementById("battle-analysis-summary");
    if (analysis) analysis.hidden = true;
    const scoreboard = document.getElementById("post-match-scoreboard");
    if (scoreboard) {
      scoreboard.hidden = true;
      scoreboard.replaceChildren();
    }
    const details = document.getElementById("post-match-analysis");
    if (details) details.open = false;
    showPostMatchStage("damage");
    renderPostMatchRewards();
  }

  function presentOnlineMatchFinished() {
    const result = pvpState.finalResult;
    if (!result) return false;

    boosterOfferOpen = false;
    clearBoosterTargetMode("online_match_finished");
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    if (boosterStatusEl) boosterStatusEl.textContent = localizedUiText("Maç tamamlandı");
    renderBoosterOptions();

    const outcome = onlineOutcome(result);
    const ownResult =
      result.result_summary?.[pvpState.playerId]
      || null;
    if (
      ownResult
      && Object.prototype.hasOwnProperty.call(
        ownResult,
        "circuit_credits"
      )
    ) {
      const remainingCredits = Number(
        ownResult.circuit_credits
      );
      if (Number.isFinite(remainingCredits)) {
        client.applyServerEconomyState({
          circuitCredits:remainingCredits,
        });
        renderCredits();
      }
    }
    const firstPresentation =
      onlineFinishPresentedSessionId !== result.session_id;
    onlineFinishPresentedSessionId = result.session_id;
    document.body.dataset.onlineFinished = "true";
    setBattleResultHero(outcome);
    showPostMatchStage("damage");

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent=localizedMessage("battle.match_finished", {result:localizedMessage(outcome === "victory" ? "battle.win" : outcome === "defeat" ? "battle.loss" : "battle.draw")});
    }

    if (firstPresentation) {
      if (["victory", "defeat"].includes(outcome)) {
        setTerminalAudioState(outcome, "online_match_finished");
      } else {
        clearTerminalAudioState("online_match_draw");
        requestOwnedAudioState("online_match_draw");
      }
      const destroyedCorePlayerIds = result.finish_reason === "core_destroyed"
        ? [result.loser_player_id]
        : result.finish_reason === "simultaneous_core_destroyed"
          ? Object.keys(pvpState.snapshot?.players || {})
          : [];
      for (const destroyedPlayerId of destroyedCorePlayerIds) {
        const destroyedPlayer = pvpState.snapshot?.players?.[destroyedPlayerId];
        const destroyedCore = destroyedPlayer?.modules?.find(
          (module) => module.definition_id === "core"
        );
        // The terminal result can arrive one render ahead of the final combat
        // snapshot.  Pin the destroyed core to zero before the 2–3 second
        // explosion presentation so no red HP sliver survives under the FX.
        if (destroyedCore) {
          destroyedCore.hp = 0;
          destroyedCore.status = "destroyed";
        }
        if (destroyedPlayerId === pvpState.playerId) {
          const ownCore = client.modules.get("core-1");
          if (ownCore) {
            ownCore.hp = 0;
            ownCore.status = "destroyed";
          }
          renderBoard({ force:true });
        } else {
          mockEnemyCoreHp = 0;
          renderEnemyBoard();
        }
        if (!emitServerModuleDestruction(destroyedPlayerId, destroyedCore)) {
          const destructionKey = destroyedCore?.instance_id
            ? `${destroyedPlayerId}:${destroyedCore.instance_id}`
            : null;
          if (!destructionKey || !destructionFxPlayed.has(destructionKey)) {
            emitModuleExplosion(
              destroyedPlayerId === pvpState.playerId ? "core-1" : "enemy-core",
              { core: true }
            );
          }
        }
      }
    }

    schedulePostMatchReveal(
      `online:${result.session_id || "finished"}`,
      {
        waitForCoreExplosion: [
          "core_destroyed",
          "simultaneous_core_destroyed",
        ].includes(result.finish_reason),
      }
    );
    renderOnlineBattleAnalysis(result);
    renderPostMatchSummary();
    const details = document.getElementById("post-match-analysis");
    if (details) details.open = true;
    renderPlayModeUi();
    return true;
  }

  async function syncFinishedMatch() {
    const battleId =
      pvpState.finalResult
        ?.session_id
      || pvpState.sessionId;

    if (!battleId) {
      return {
        ok: false,
        reason:
          "Maç sonucu için oturum kimliği bulunamadı.",
      };
    }

    presentOnlineMatchFinished();

    // QA telemetry is ancillary.  It must never hold the player-facing reward
    // projection behind a second network request.
    void finishWebTestSessionAudit(
      battleId
    );

    if (
      postMatchSyncInFlight
    ) {
      return postMatchSyncInFlight;
    }

    postMatchSyncInFlight =
      postMatchSync.sync(
        battleId
      ).finally(() => {
        postMatchSyncInFlight =
          null;
      });

    renderPostMatchRewards();

    const result =
      await postMatchSyncInFlight;

    if (!result.ok) {
      showPlayError(
        "post_match",
        result.reason
        || "Maç sonucu verileri yüklenemedi."
      );
    } else if (
      playRecoveryState.kind
      === "post_match"
    ) {
      clearPlayError();
    }

    if (result.ok) {
      renderPostMatchSummary();
      renderPostMatchRewards();
      renderOnlineBattleAnalysis(
        pvpState.finalResult
      );
      void loadMetaProgression().then(() => {
        renderPostMatchScoreboard(
          pvpState.finalResult
        );
      });
    }

    renderPostMatchSummary();
    renderPostMatchRewards();
    renderOnlineBattleAnalysis(
      pvpState.finalResult
    );
    renderProfileSummary();
    renderStatisticsSummary();

    return result;
  }

  const recoveryPanel =
    document.getElementById(
      "play-recovery-panel"
    );
  const recoveryMessage =
    document.getElementById(
      "play-recovery-message"
    );
  const recoveryRetry =
    document.getElementById(
      "play-recovery-retry"
    );

  function renderRecoveryState() {
    if (!recoveryPanel) return;

    const view =
      playRecoveryState
        .viewModel();

    recoveryPanel.hidden =
      !view.active;

    if (recoveryMessage) {
      recoveryMessage.textContent =
        view.message;
    }

    if (recoveryRetry) {
      recoveryRetry.hidden =
        !view.retryable;
    }
  }

  function showPlayError(
    kind,
    message,
    retryable = true
  ) {
    playRecoveryState.show(
      kind,
      message,
      { retryable }
    );
    renderRecoveryState();
  }

  function clearPlayError() {
    playRecoveryState.clear();
    renderRecoveryState();
  }

  function renderTelemetryStatus(
    status
  ) {
    if (!telemetryStatus) return;

    const labels = {
      idle: "Telemetri: Hazır",
      sending: "Telemetri: Gönderiliyor",
      retry_wait:
        "Telemetri: Bağlantı bekleniyor, veri korundu",
      ready: "Telemetri: Güncel",
    };

    telemetryStatus.textContent =
      labels[status]
      || localizedMessage("telemetry.status", {status});
    telemetryStatus.dataset.status =
      status;

    if (status === "retry_wait") {
      showPlayError(
        "telemetry",
        "Ölçüm verisi gönderilemedi; kuyrukta korunuyor ve otomatik yeniden denenecek.",
        false
      );
    } else if (
      playRecoveryState.kind
      === "telemetry"
    ) {
      clearPlayError();
    }
  }

  const pvpConnection =
    new RelayWebSocketConnectionManager({
      pvpState,
      onStatusChange:
        renderConnectionStatus,
      onMessageApplied:
        (_message, result) => {
          if (
            result
            && result.ok === false
            && result.reason
          ) {
            logClientMessage(
              result.reason
            );
            if (pvpState.phase === "error") {
              onlinePlay?.failSetup(new Error(result.reason));
              return;
            }
          }

          if (
            pvpState.phase
            === "battle"
            && onlinePlay?.status
              !== "battle"
          ) {
            onlinePlay
              ?.markBattleStarted();
          }

          syncOnlineServerBattle(
            _message
          );

          if (
            _message?.type
              === "match_finished"
            || (
              pvpState.phase
                === "finished"
              && pvpState.finalResult
            )
          ) {
            presentOnlineMatchFinished();
            void syncFinishedMatch();
          }

          render();
        },
    });

  function clientDefinitionId(
    instanceId
  ) {
    return instanceId
      .replace(/-\d+$/, "")
      .replaceAll("-", "_");
  }

  const WEAPON_PRESENTATION = Object.freeze({
    laser:{
      cue:"laser_fire",
      fx:"laser",
      travelMs:260,
    },
    pulse_cannon:{
      cue:"pulse_cannon_fire",
      fx:"pulse",
      travelMs:360,
    },
    railgun:{
      cue:"railgun_fire",
      fx:"railgun",
      travelMs:220,
    },
    missile_launcher:{
      cue:"missile_fire",
      fx:"missile",
      travelMs:520,
    },
    drone_bay:{
      cue:"drone_fire",
      fx:"drone",
      travelMs:430,
    },
    arc_cannon:{
      cue:"arc_cannon_fire",
      fx:"arc",
      travelMs:300,
    },
  });

  function weaponPresentation(
    definitionId
  ) {
    return WEAPON_PRESENTATION[
      String(definitionId || "")
        .trim()
        .replaceAll("-", "_")
    ] || WEAPON_PRESENTATION.laser;
  }

  function weaponCue(
    definitionId
  ) {
    return weaponPresentation(
      definitionId
    ).cue;
  }

  function scheduleAttackImpactCue({
    defended=false,
    targetDefinitionId=null,
    travelMs=0,
  }={}) {
    const cue=defended
      ? "shield_hit"
      : (
          targetDefinitionId === "core"
            ? "core_hit"
            : "module_hit"
        );
    window.setTimeout(
      () => triggerGridshardCue(cue),
      Math.max(0,Number(travelMs || 0))
    );
  }

  function selectedBattlePoolDefinitionIds() {
    return battlePoolSelection
      .selectedIds()
      .map(clientDefinitionId);
  }

  function buildInitialOnlineSetup() {
    return [
      {
        instanceId: "core-1",
        definitionId: "core",
        x: 2,
        y: 1,
      },
    ];
  }

  const matchmakingStatusEl =
    document.getElementById(
      "matchmaking-status"
    );

  function renderHomeMatchmakingOverlay(status) {
    const overlay = document.getElementById("home-matchmaking-overlay");
    if (!overlay) return;
    const active = ["matchmaking", "matched", "connecting", "readying", "error"].includes(String(status || ""));
    overlay.hidden = !active;
    document.body.dataset.homeMatchmaking = String(active);
    for (const panel of document.querySelectorAll("[data-screen-panel], #app-progress-ribbon, #app-bottom-dock")) {
      panel.inert = active;
    }
    const title = document.getElementById("home-matchmaking-title");
    const copy = document.getElementById("home-matchmaking-copy");
    if (title) title.textContent = status === "error"
      ? "EŞLEŞTİRME BAĞLANTISI KESİLDİ"
      : status === "matchmaking" ? "EŞLEŞTİRİLİYOR" : "RAKİP BULUNDU";
    if (copy) {
      copy.hidden = status !== "error";
      copy.textContent = status === "error"
        ? (onlinePlay?.lastError || "Bağlantı kurulamadı.")
        : "";
    }
    const action = document.getElementById("home-matchmaking-cancel");
    if (action && !homeMatchmakingCancelPending) action.textContent = status === "error" ? "ANA EKRANA DÖN" : "İPTAL ET";
  }

  function isOnlineMatchmakingCancelable(status = document.body.dataset.onlineStatus) {
    return ["matchmaking", "matched", "connecting", "readying"].includes(
      String(status || "")
    );
  }

  function renderPoolPrimaryAction(status = document.body.dataset.onlineStatus) {
    if (!poolConfirmEl) return;
    const cancellable =
      activePlayMode === "online"
      && isOnlineMatchmakingCancelable(status);
    poolConfirmEl.dataset.matchmaking = String(cancellable);
    if (cancellable) {
      poolConfirmEl.disabled = false;
      poolConfirmEl.textContent = localizedUiText("İptal Et");
      poolConfirmEl.setAttribute("aria-label", localizedUiText("Eşleştirmeyi iptal et"));
      return;
    }
    poolConfirmEl.removeAttribute("aria-label");
    if (["idle", "cancelled", "error", ""].includes(String(status || ""))) {
      poolConfirmEl.disabled = !battlePoolSelection.isComplete();
      poolConfirmEl.textContent = localizedUiText("Savaş");
    }
  }

  function renderOnlinePlayStatus(
    status
  ) {
    if (!matchmakingStatusEl) {
      return;
    }

    const labels = {
      idle:
        "Eşleştirme: Hazır · Arena 1",
      matchmaking:
        "Eşleştirme: Rakip aranıyor",
      matched:
        "Eşleştirme: Rakip bulundu",
      connecting:
        "Eşleştirme: Oturuma bağlanıyor",
      readying:
        "Eşleştirme: Setup + Hazır gönderildi",
      battle:
        "Eşleştirme: Savaş başladı",
      cancelled:
        "Eşleştirme: İptal edildi",
      error:
        "Eşleştirme: Bağlantı hatası",
    };

    const battleJustStarted=
      status === "battle"
      && document.body.dataset.onlineStatus !== "battle";

    matchmakingStatusEl.textContent =
      (
        matchmakingState.opponentType === "ai"
        && ["matched", "connecting", "readying", "battle"].includes(status)
          ? "Eşleştirme: arena rakibi bulundu"
          : labels[status]
      )
      || localizedMessage("battle.matchmaking_status", {status});

    matchmakingStatusEl.dataset.status =
      status;

    document.body.dataset.onlineStatus =
      status;
    document.body.dataset.opponentType =
      matchmakingState.opponentType || "unknown";

    renderPoolPrimaryAction(status);
    renderHomeMatchmakingOverlay(status);

    if (status === "error") {
      const homeCopy = document.querySelector("#home-battle-button small");
      if (homeCopy) homeCopy.textContent = onlinePlay.lastError || "Eşleştirme başlatılamadı. Tekrar deneyebilirsin.";
    }
    const battleMatchLabel = document.getElementById("battle-match-label");
    if (battleMatchLabel) {
      battleMatchLabel.textContent =
        matchmakingState.opponentType === "ai"
          ? "AI Rakip"
          : "Çevrimiçi Rakip";
    }
    if (
      activeMatchModeEl
      && [
        "matched",
        "connecting",
        "readying",
        "battle",
      ].includes(status)
    ) {
      activeMatchModeEl.textContent =
        matchmakingState.opponentType === "ai"
          ? "Maç: AI Rakip"
          : "Maç: Çevrimiçi PvP";
    }
    if (status === "battle") {
      if (appRouter.currentScreen !== RelayAppScreen.PLAY) {
        appRouter.go(RelayAppScreen.PLAY);
        screenController.render();
      }
      resetBattleVisualSurface();
      resetClientModulesForBattleStart();
      resetBattleResultPresentation();
      destructionFxPlayed.clear();
      preparedCorePowerFx.clear();
      snapshotModuleHp.clear();
      client.cancelDrag?.();
      if (document.documentElement) document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (battleJustStarted) {
        triggerGridshardCue("energy_transfer");
      }
    }
    renderPlayModeUi();
    renderHomeHub();
    requestOwnedAudioState("online_status_update");
  }

  const onlinePlay =
    new RelayOnlinePlayCoordinator({
      playerId:
        pvpState.playerId,
      pvpState,
      matchmakingState,
      connectionManager:
        pvpConnection,
      requestJson: requestJsonWithDeadline,
      onStatusChange:
        renderOnlinePlayStatus,
      onSessionBound:
        (sessionId) => {
          telemetryDispatcher
            .setSession(
              sessionId
            );
          if (currentAuditEventId) {
            bindWebTestSessionAudit(
              currentAuditEventId,
              sessionId
            );
          }
        },
    });

  let currentAuditEventId = null;
  let currentAuditSessionId = null;
  let currentTestRunId = null;

  async function recordWebTestSessionAudit(
    startedAtMs
  ) {
    if (!operationalDiagnosticsEnabled) return { ok:true, skipped:true };
    try {
      const response =
        await fetch(
          "/web-test/audit/session-start",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              player_id:
                participantPlayerId,
              matchmaking_started_at_ms:
                startedAtMs,
            }),
          }
        );

      const payload =
        response.ok
          ? await response.json()
          : null;

      const auditEventId =
        payload
          ?.audit_event_id
        || null;

      const auditTestRunId =
        payload
          ?.test_run_id
        || null;
      const consistency =
        testRunConsistency
          .applyAudit(
            auditTestRunId
          );

      if (
        response.ok
        && auditEventId
        && consistency.ok
      ) {
        currentAuditEventId =
          auditEventId;
        currentAuditSessionId =
          null;
        currentTestRunId =
          auditTestRunId;
        if (
          pvpState.sessionId
          && pvpState.sessionId
            !== "local-preview"
        ) {
          bindWebTestSessionAudit(
            auditEventId,
            pvpState.sessionId
          );
        }
      } else if (
        response.ok
        && auditEventId
        && !consistency.ok
      ) {
        currentAuditEventId =
          null;
        currentTestRunId =
          null;
      }

      renderServerBootStatus();

      return {
        ok:
          response.ok
          && consistency.ok,
        auditEventId:
          consistency.ok
            ? auditEventId
            : null,
        testRunConsistent:
          consistency.ok,
      };
    } catch (_error) {
      return {
        ok: false,
      };
    }
  }

  async function bindWebTestSessionAudit(
    auditEventId,
    sessionId
  ) {
    if (!operationalDiagnosticsEnabled) return { ok:true, skipped:true };
    if (
      !auditEventId
      || !sessionId
    ) {
      return {
        ok: false,
      };
    }

    try {
      const response =
        await fetch(
          "/web-test/audit/session-bind",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              audit_event_id:
                auditEventId,
              session_id:
                sessionId,
            }),
          }
        );

      if (
        response.ok
        && auditEventId
          === currentAuditEventId
      ) {
        currentAuditSessionId =
          sessionId;
      }

      return {
        ok: response.ok,
      };
    } catch (_error) {
      return {
        ok: false,
      };
    }
  }

  async function finishWebTestSessionAudit(
    sessionId
  ) {
    if (!operationalDiagnosticsEnabled) return { ok:true, skipped:true };
    if (
      !currentAuditEventId
      || !sessionId
    ) {
      return {
        ok: false,
      };
    }

    if (
      currentAuditSessionId
      !== sessionId
    ) {
      const binding =
        await bindWebTestSessionAudit(
          currentAuditEventId,
          sessionId
        );
      if (!binding.ok) {
        return {
          ok: false,
        };
      }
    }

    try {
      const response =
        await fetch(
          "/web-test/audit/session-finish",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              audit_event_id:
                currentAuditEventId,
              session_id:
                sessionId,
            }),
          }
        );

      return {
        ok: response.ok,
      };
    } catch (_error) {
      return {
        ok: false,
      };
    }
  }

  async function startRealOnlineMatch() {
    const matchmakingStartedAtMs =
      Date.now();

    nextBoosterOfferIndex = 0;
    boosterOfferOpen = false;
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    clearBoosterTargetMode("online_match_reset");
    if (boosterStatusEl) {
      boosterStatusEl.textContent = localizedUiText("İlk güçlendirici 30. saniyede");
    }
    renderBoosterOptions();

    trackMatchmakingStart();

    // Audit operasyon içindir; başarısızlığı eşleştirmeyi durdurmaz.
    currentAuditEventId = null;
    currentAuditSessionId = null;
    const auditPromise =
      recordWebTestSessionAudit(
        matchmakingStartedAtMs
      );

    const result =
      await onlinePlay.start({
        battlePoolIds:
          selectedBattlePoolDefinitionIds(),
        initialModules:
          buildInitialOnlineSetup(),
      });

    if (result.cancelled) return result;

    if (
      result.ok
      && result.matched
      && result.sessionId
    ) {
      recordProductEvent("matchmaking_matched", {
        opponent: String(result.sessionId).startsWith("local-ai-match-") ? "ai" : "human",
      });
      auditPromise.then(
        (audit) => {
          if (
            audit.ok
            && audit.auditEventId
          ) {
            bindWebTestSessionAudit(
              audit.auditEventId,
              result.sessionId
            );
          }
        }
      );
    }

    if (!result.ok) {
      const reason =
        result.reason
        || "Eşleştirme başlatılamadı.";
      logClientMessage(reason);
      showPlayError(
        "matchmaking",
        reason
      );
    } else if (
      playRecoveryState.kind
      === "matchmaking"
    ) {
      clearPlayError();
    }

    return result;
  }

  const diagnosticSnapshot =
    new RelayDiagnosticSnapshot({
      version:
        "2.1.0-beta.43",
      build:
        "web-test-beta.13",
      bootGate:
        serverBootGate,
      connectionManager:
        pvpConnection,
      matchmakingState,
      pvpState,
      recoveryState:
        playRecoveryState,
      telemetryTransport,
      releaseCheckState,
    });

  const diagnosticButton =
    document.getElementById(
      "diagnostic-snapshot-button"
    );
  const diagnosticOutput =
    document.getElementById(
      "diagnostic-snapshot-output"
    );

  function renderDiagnosticSnapshot() {
    if (!diagnosticOutput) {
      return null;
    }

    const text =
      diagnosticSnapshot
        .toJson();

    diagnosticOutput.value =
      text;
    diagnosticOutput.hidden =
      false;

    return text;
  }

  if (diagnosticButton) {
    diagnosticButton
      .addEventListener(
        "click",
        renderDiagnosticSnapshot
      );
  }

  function connectPvP(url) {
    pvpConnection.connect(url);
  }

  function disconnectPvP() {
    pvpConnection.disconnect();
  }

  function sendPvPCommand(command) {
    return pvpConnection.sendCommand(
      command
    );
  }

  function buildPvPCommandEnvelope(command) {
    return pvpState.buildCommandMessage(command);
  }

  function applyPvPServerEnvelope(message) {
    const result = pvpState.applyServerEnvelope(message);
    if (!result.ok) {
      logClientMessage(result.reason);
    }
    render();
    return result;
  }

  const board = document.getElementById("board");
  const battleBoardView = new GridshardBattleBoardView(board);
  const enemyBoard = document.getElementById("enemy-board");
  const enemyBoardStatusEl = document.getElementById("enemy-board-status");
  const playerBoardStatusEl = document.getElementById("player-board-status");
  const enemyBattleNameEl = document.getElementById("enemy-battle-name");
  const enemyDeckPreviewEl = document.getElementById("enemy-deck-preview");
  const playerBattleNameEl = document.getElementById("player-battle-name");
  const shelfCreditIndicatorEl = document.getElementById("shelf-credit-indicator");
  const corePowerButtonEl = document.getElementById("core-power-button");
  const corePowerChargeEl = document.getElementById("core-power-charge");
  const battleEmojiButtonEl = document.getElementById("battle-emoji-button");
  const battleEmojiButtonGlyphEl = document.getElementById("battle-emoji-button-glyph");
  const shelf = document.getElementById("module-shelf");
  let corePowerCharge = 0;
  let corePowerReady = false;
  let corePowerTargeting = false;
  const timeEl = document.getElementById("battle-time");
  const creditEl = document.getElementById("credit-indicator");
  const combatSummaryEl = document.getElementById("combat-summary");
  const energySummaryEl = document.getElementById("energy-summary");
  const battleResultSummaryEl = document.getElementById("battle-result-summary");
  const capacityEl = document.getElementById("capacity-indicator");
  const lockLabel = document.getElementById("shelf-lock-label");
  const shelfHelp = document.getElementById("shelf-help");
  const logEl = document.getElementById("event-log");
  const boosterOptionsEl = document.getElementById("booster-options");
  const boosterStatusEl = document.getElementById("booster-status");
  const boosterPanelEl = document.getElementById("booster-panel");
  const poolSelectionEl = document.getElementById("battle-pool-selection");
  const poolCountEl = document.getElementById("battle-pool-count");
  const poolConfirmEl = document.getElementById("battle-pool-confirm");
  const poolSelectedEl =
    document.getElementById(
      "battle-pool-selected"
    );
  const presetSelectEl =
    document.getElementById(
      "battle-pool-preset-select"
    );

  function renderCorePowerControl() {
    if (!corePowerButtonEl) return;
    const charge=Math.max(0,Math.min(100,Math.round(corePowerCharge)));
    corePowerButtonEl.style.setProperty("--core-charge",`${charge}%`);
    corePowerButtonEl.dataset.ready=String(corePowerReady);
    const selectedCore = metaProgressionState?.cores?.selected_core_type || "core_resonance";
    const coreVisual = applyCoreVisualIdentity(corePowerButtonEl, selectedCore);
    const glyph = coreVisual.glyph;
    const buttonArt = corePowerButtonEl.querySelector(".core-power-glyph");
    if (buttonArt) buttonArt.textContent = glyph;
    const coreCard = document.getElementById("core-1");
    if (coreCard) {
      applyCoreVisualIdentity(coreCard, selectedCore);
      coreCard.style.setProperty("--core-charge", `${charge}%`);
      coreCard.classList.toggle("core-power-ready", corePowerReady);
      coreCard.classList.add("core-charge-card");
      coreCard.setAttribute("aria-label", localizedMessage("battle.core_power_aria", {state:corePowerReady ? localizedMessage("beta.ready") : localizedMessage("battle.percent", {value:localizedNumber(charge)})}));
      const icon = coreCard.querySelector(".module-icon");
      if (icon) icon.textContent = glyph;
    }
    applyCoreVisualIdentity(board, selectedCore);
    corePowerButtonEl.dataset.targeting=String(corePowerTargeting);
    corePowerButtonEl.disabled=localBattleFinished || !corePowerReady;
    corePowerButtonEl.setAttribute("aria-pressed",String(corePowerTargeting));
    corePowerButtonEl.title=corePowerReady
      ? (corePowerTargeting
          ? localizedMessage("battle.use_core_power")
          : localizedMessage("battle.core_power_ready"))
      : localizedMessage("battle.core_power_charging", {charge:localizedNumber(charge)});
    if (corePowerChargeEl) {
      corePowerChargeEl.textContent=corePowerReady ? localizedMessage("beta.ready").toUpperCase() : localizedMessage("battle.percent", {value:localizedNumber(charge)});
    }
    const selectedEmojiId = profileState.viewModel()?.cosmetics?.selected_battle_emoji_id || "none";
    const selectedEmoji = BATTLE_EMOJIS.find((item) => item.id === selectedEmojiId);
    if (battleEmojiButtonEl) {
      battleEmojiButtonEl.hidden = !selectedEmoji || selectedEmoji.id === "none";
      battleEmojiButtonEl.disabled = localBattleFinished;
      battleEmojiButtonEl.dataset.emojiId = selectedEmoji?.id || "none";
      battleEmojiButtonEl.title = localizedUiText(selectedEmoji ? selectedEmoji.nameTr : "Savaş emojisi");
    }
    if (battleEmojiButtonGlyphEl) {
      renderBattleEmojiVisual(
        battleEmojiButtonGlyphEl,
        selectedEmoji || { glyph:"◇" }
      );
    }
  }

  function syncCorePowerFromSnapshot(player) {
    client.currentDiscountRemaining = Number(player?.discounted_deployments || 0);
    client.energyLoadRatio = Number(player?.energy_load_ratio || 0);
    client.energyStock = Number(player?.energy_stock || 0);
    document.getElementById("board")?.classList.toggle("energy-strain", client.energyLoadRatio > 1.2 && client.energyStock <= 0);
    const summary = document.getElementById("player-core-summary");
    if (summary) summary.title = localizedMessage("battle.energy_load", {load:localizedNumber(Math.round(client.energyLoadRatio * 100)), stock:localizedNumber(client.energyStock)});
    const power=player?.core_power;
    if (!power) return;
    corePowerCharge=Number(power.charge || 0);
    corePowerReady=Boolean(power.ready);
    if (!corePowerReady) corePowerTargeting=false;
    renderCorePowerControl();
  }

  function corePowerRequestId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `core-${participantPlayerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function useCorePowerOn(module) {
    if (!corePowerReady || localBattleFinished) return false;
    if (module?.nameTr !== "Çekirdek") {
      logClientMessage("Çekirdek Rezonansı için kendi Çekirdeğine dokun.");
      return true;
    }
    client.emitCommand({
      kind:"use_core_power",
      payload:{
        request_id:corePowerRequestId(),
        target_module_id:module.instanceId,
      },
    });
    corePowerTargeting=false;
    renderCorePowerControl();
    renderBoard({force:true});
    return true;
  }

  corePowerButtonEl?.addEventListener("click", () => {
    if (!corePowerReady || localBattleFinished) return;
    useCorePowerOn(client.modules.get("core-1"));
  });
  battleEmojiButtonEl?.addEventListener("click", () => {
    const emojiId = battleEmojiButtonEl.dataset.emojiId || "none";
    if (localBattleFinished || emojiId === "none") return;
    client.emitCommand({
      kind:"send_battle_emoji",
      payload:{emoji_id:emojiId},
    });
  });
  const presetGalleryEl =
    document.getElementById(
      "battle-pool-preset-gallery"
    );
  const initialPresetShortcutsEl =
    document.getElementById(
      "initial-preset-shortcuts"
    );
  const presetNewEl =
    document.getElementById(
      "battle-pool-preset-new"
    );
  const presetLoadEl =
    document.getElementById(
      "battle-pool-preset-load"
    );
  const presetDeleteEl =
    document.getElementById(
      "battle-pool-preset-delete"
    );
  const presetNameEl =
    document.getElementById(
      "battle-pool-preset-name"
    );
  const presetSaveEl =
    document.getElementById(
      "battle-pool-preset-save"
    );
  const presetStatusEl =
    document.getElementById(
      "battle-pool-preset-status"
    );
  const presetRenameEl =
    document.getElementById(
      "battle-pool-preset-rename"
    );
  const presetRenameButtonEl =
    document.getElementById(
      "battle-pool-preset-rename-button"
    );
  const activePresetEl =
    document.getElementById(
      "battle-pool-active-preset"
    );
  const presetDirtyEl =
    document.getElementById(
      "battle-pool-preset-dirty"
    );
  const quickLoadoutGalleryEl =
    document.getElementById(
      "quick-loadout-gallery"
    );
  const quickLoadoutStatusEl =
    document.getElementById(
      "quick-loadout-status"
    );
  const quickLoadoutFilterAllEl =
    document.getElementById(
      "quick-loadout-filter-all"
    );
  const quickLoadoutFilterFavoritesEl =
    document.getElementById(
      "quick-loadout-filter-favorites"
    );

  const quickLoadoutActiveSummaryEl =
    document.getElementById(
      "quick-loadout-active-summary"
    );
  const poolDetailNameEl =
    document.getElementById(
      "battle-pool-detail-name"
    );
  const poolDetailCategoryEl =
    document.getElementById(
      "battle-pool-detail-category"
    );
  const poolDetailClassEl =
    document.getElementById(
      "battle-pool-detail-class"
    );
  const poolDetailHpEl =
    document.getElementById(
      "battle-pool-detail-hp"
    );
  const poolDetailCostEl =
    document.getElementById(
      "battle-pool-detail-cost"
    );
  const poolDetailRoleEl =
    document.getElementById(
      "battle-pool-detail-role"
    );
  const poolDetailDescriptionEl =
    document.getElementById(
      "battle-pool-detail-description"
    );
  const poolDetailEnergyGenerationEl =
    document.getElementById(
      "battle-pool-detail-energy-generation"
    );
  const poolDetailEnergyConsumptionEl =
    document.getElementById(
      "battle-pool-detail-energy-consumption"
    );
  const poolDetailDamageEl =
    document.getElementById(
      "battle-pool-detail-damage"
    );
  const poolDetailCooldownEl =
    document.getElementById(
      "battle-pool-detail-cooldown"
    );
  const poolDetailEffectsEl =
    document.getElementById(
      "battle-pool-detail-effects"
    );
  const poolDetailStrongEl =
    document.getElementById(
      "battle-pool-detail-strong"
    );
  const poolDetailWeakEl =
    document.getElementById(
      "battle-pool-detail-weak"
    );
  const poolDetailSynergyEl =
    document.getElementById(
      "battle-pool-detail-synergy"
    );
  const poolDetailPreviewEl =
    document.getElementById(
      "battle-pool-detail-preview"
    );
  const poolCatalogSourceEl =
    document.getElementById(
      "battle-pool-catalog-source"
    );

  const webTestStatusEl =
    document.getElementById(
      "web-test-status"
    );
  if (webTestStatusEl) {
    webTestStatusEl.textContent =
      webTestBuildState.labelTr();
    webTestStatusEl.dataset.status =
      webTestBuildState.status;
  }

  for (
    const button
    of document.querySelectorAll(
      "[data-open-screen]"
    )
  ) {
    button.addEventListener(
      "click",
      () => openAppScreen(
        button.dataset.openScreen
      )
    );
  }

  const lobbyPanel=
    document.getElementById(
      "main-menu-panel"
    );

  if (lobbyPanel) {
    lobbyPanel.addEventListener(
      "pointermove",
      (event) => {
        const rect=
          lobbyPanel.getBoundingClientRect();
        const x=
          (
            event.clientX
            - rect.left
          ) / Math.max(
            1,
            rect.width
          );
        const y=
          (
            event.clientY
            - rect.top
          ) / Math.max(
            1,
            rect.height
          );

        lobbyPanel.style.setProperty(
          "--lobby-parallax-x",
          `${(
            x - .5
          ) * 10}px`
        );
        lobbyPanel.style.setProperty(
          "--lobby-parallax-y",
          `${(
            y - .5
          ) * 8}px`
        );
      }
    );

    lobbyPanel.addEventListener(
      "pointerleave",
      () => {
        lobbyPanel.style.setProperty(
          "--lobby-parallax-x",
          "0px"
        );
        lobbyPanel.style.setProperty(
          "--lobby-parallax-y",
          "0px"
        );
      }
    );
  }

  const returnMainMenuButton =
    document.getElementById(
      "return-main-menu"
    );
  if (returnMainMenuButton) {
    returnMainMenuButton.addEventListener(
      "click",
      returnToMainMenu
    );
  }

  const serverBootStatusEl =
    document.getElementById(
      "server-boot-status"
    );
  const serverBootRetry =
    document.getElementById(
      "server-boot-retry"
    );
  const participantBootstrapRetry =
    document.getElementById(
      "participant-bootstrap-retry"
    );

  function renderServerBootStatus() {
    if (!serverBootStatusEl) {
      return;
    }

    const labels = {
      idle: localizedMessage("beta.server_idle"),
      checking: localizedMessage("beta.server_checking"),
      ready: localizedMessage("beta.server_ready"),
      blocked: localizedMessage("beta.server_blocked"),
      error: localizedMessage("beta.server_error"),
    };

    serverBootStatusEl.textContent =
      labels[
        serverBootGate.status
      ] || serverBootGate.status;
    serverBootStatusEl.dataset.status =
      serverBootGate.status;

    const playButton =
      document.querySelector(
        '[data-open-screen="play"]'
      );
    if (playButton) {
      // Oyna ekranı ve Tek Oyunculu Test Maçı her zaman erişilebilir.
      // Online PvP readiness kontrolü prepareOnlineMatch içinde uygulanır.
      playButton.disabled = false;
      playButton.dataset.localPlayable =
        "true";
    }

    const playReadyEl =
      document.getElementById(
        "play-readiness-status"
      );
    if (playReadyEl) {
      playReadyEl.textContent =
        playReadinessGate.labelTr();
      playReadyEl.dataset.ready =
        String(
          playReadinessGate
            .canPlay()
        );
    }

    const operationEl =
      document.getElementById(
        "operation-readiness-status"
      );
    const testRunEl =
      document.getElementById(
        "test-run-status"
      );
    if (testRunEl) {
      const manifestRunId =
        serverBootGate
          .manifest
          ?.test_run_id
        || null;

      if (manifestRunId) {
        testRunConsistency
          .setExpected(
            manifestRunId
          );
        testRunEl.textContent =
          localizedMessage("beta.test_run_id", {run:manifestRunId});
      } else {
        testRunEl.textContent =
          localizedMessage("beta.test_run_waiting");
      }

      testRunEl.dataset.status =
        testRunConsistency.status;
    }

    if (operationEl) {
      const operation =
        serverBootGate
          .operationReadiness;

      if (!operation) {
        operationEl.textContent =
          localizedMessage("beta.operation_waiting");
      } else if (
        operation.ready
      ) {
        const warnings =
          operation.warnings
          || [];
        operationEl.textContent =
          warnings.length
            ? (
                localizedMessage("beta.operation_ready_warnings", {warnings:warnings.join(" | ")})
              )
            : localizedMessage("beta.operation_ready");
      } else {
        operationEl.textContent =
          localizedMessage("beta.operation_not_ready");
      }

      operationEl.dataset.ready =
        String(
          Boolean(
            operation?.ready
          )
        );
    }

    if (serverBootRetry) {
      serverBootRetry.hidden =
        serverBootGate.canPlay();
    }
  }

  async function loadMonitoringSummary() {
    const el =
      document.getElementById(
        "monitoring-summary-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/monitoring"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.monitoring_load_failed")
        );
      }

      const view =
        monitoringState.apply(
          await response.json()
        );

      const operationLabels = {
        not_ready:localizedMessage("beta.not_ready"),
        ready_not_started:localizedMessage("beta.ready_not_started"),
        running:localizedMessage("beta.test_running"),
      };
      const stabilityLabels = {
        not_running:localizedMessage("beta.not_running"),
        stable:localizedMessage("beta.stable"),
        degraded:localizedMessage("beta.degraded"),
      };

      if (el) {
        el.textContent =
          localizedMessage("beta.monitoring_status", {operation:operationLabels[view.operationState] || view.operationState, stability:stabilityLabels[view.stabilityState] || view.stabilityState, completion:localizedNumber(view.auditFinishRatePercent)});
        el.dataset.state =
          view.operationState;
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.monitoring_unavailable");
        el.dataset.state =
          "unknown";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadOperationStability() {
    const el =
      document.getElementById(
        "operation-stability-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/operation-stability"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.stability_load_failed")
        );
      }

      const view =
        operationStabilityState.apply(
          await response.json()
        );

      const labels = {
        not_running:localizedMessage("beta.test_not_running"),
        stable:localizedMessage("beta.stable"),
        degraded:localizedMessage("beta.degraded"),
      };

      if (el) {
        el.textContent =
          localizedMessage("beta.stability_status", {state:labels[view.stability] || view.stability});
        el.dataset.stability =
          view.stability;
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.stability_unavailable");
        el.dataset.stability =
          "unknown";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadOperationStatus() {
    const el =
      document.getElementById(
        "operation-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/operation-status"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.operation_load_failed")
        );
      }

      const view =
        operationStatusState.apply(
          await response.json()
        );

      const labels = {
        not_ready:localizedMessage("beta.not_ready"),
        ready_not_started:localizedMessage("beta.ready_not_started"),
        running:localizedMessage("beta.test_running"),
      };

      if (el) {
        el.textContent =
          localizedMessage("beta.operation_status", {state:labels[view.state] || view.state});
        el.dataset.state =
          view.state;
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.operation_unavailable");
        el.dataset.state =
          "unknown";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadWebTestRunStatus() {
    const el =
      document.getElementById(
        "web-test-run-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/test-run/status"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.test_run_load_failed")
        );
      }

      const view =
        webTestRunStatusState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          localizedMessage("beta.test_run_status", {state:localizedMessage(view.finished ? "beta.completed" : view.started ? "beta.started" : "beta.not_started")})
          + (
              view.testRunId
                ? ` · ${view.testRunId}`
                : ""
            );
        el.dataset.started =
          String(
            view.started
          );
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.test_run_unavailable");
        el.dataset.started =
          "false";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadPreflightStatus() {
    const el =
      document.getElementById(
        "preflight-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/preflight"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.preflight_load_failed")
        );
      }

      const view =
        preflightState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          localizedMessage("beta.preflight_status", {state:localizedMessage(view.ready ? "beta.can_start" : "beta.not_ready")})
          + (
              view.testRunId
                ? ` · ${view.testRunId}`
                : ""
            )
          + (
              view.failedChecks.length
                ? ` · ${view.failedChecks.join(", ")}`
                : ""
            );
        el.dataset.ready =
          String(view.ready);
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.preflight_unavailable");
        el.dataset.ready="false";
      }
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadFirstRunChecklist() {
    const el =
      document.getElementById(
        "first-run-checklist-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/first-run-checklist"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.first_run_load_failed")
        );
      }

      const view =
        firstRunChecklistState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          localizedMessage("beta.first_run_status", {state:localizedMessage(view.ready ? "beta.ready" : "beta.not_ready")})
          + (
              view.failedChecks.length
                ? ` · ${view.failedChecks.join(", ")}`
                : ""
            )
          + (
              view.noteCount
                ? localizedMessage("beta.operation_notes_suffix", {count:localizedNumber(view.noteCount)})
                : ""
            );
        el.dataset.ready =
          String(view.ready);
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.first_run_unavailable");
        el.dataset.ready="false";
      }
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadLaunchReadiness() {
    const el =
      document.getElementById(
        "launch-readiness-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/launch-readiness"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.launch_load_failed")
        );
      }

      const view =
        launchReadinessState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          view.ready
            ? localizedMessage("beta.launch_ready", {run:view.testRunId || "-"})
            : (
                localizedMessage("beta.launch_not_ready")
                + (
                    view.failedChecks.length
                      ? ` · ${view.failedChecks.join(", ")}`
                      : ""
                  )
              );
        el.dataset.ready =
          String(
            view.ready
          );
      }

      renderParticipantBootstrapStatus();
      renderServerBootStatus();

      return {
        ok:view.ready,
        view,
      };
    } catch (error) {
      launchReadinessState.apply({
        launch_ready:false,
        failed_checks:[
          "launch_request",
        ],
      });

      if (el) {
        el.textContent =
          localizedMessage("beta.launch_unavailable");
        el.dataset.ready =
          "false";
      }

      renderParticipantBootstrapStatus();
      renderServerBootStatus();

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadRcCandidateStatus() {
    const el =
      document.getElementById(
        "rc-candidate-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/rc-candidate"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.rc_load_failed")
        );
      }

      const view =
        rcCandidateState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          localizedMessage("beta.rc_status", {state:localizedMessage(view.ready ? "beta.ready" : "beta.not_ready")})
          + (
              view.testRunId
                ? ` · ${view.testRunId}`
                : ""
            )
          + (
              view.insufficientSignalCount
                ? localizedMessage("beta.insufficient_signals_suffix", {count:localizedNumber(view.insufficientSignalCount)})
                : ""
            );
        el.dataset.ready =
          String(
            view.ready
          );
      }

      return {
        ok:true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.rc_unavailable");
        el.dataset.ready =
          "false";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadGoNoGoStatus() {
    const el =
      document.getElementById(
        "go-no-go-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/go-no-go"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.go_no_go_load_failed")
        );
      }

      const view =
        webTestGoNoGoState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          localizedMessage("beta.go_no_go_status", {decision:view.decision})
          + (
              view.insufficientSignalCount
                ? localizedMessage("beta.insufficient_signals_suffix", {count:localizedNumber(view.insufficientSignalCount)})
                : localizedMessage("beta.signals_observable_suffix")
            );
        el.dataset.decision =
          view.decision;
      }

      return {
        ok: true,
        view,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.go_no_go_unavailable");
        el.dataset.decision =
          "UNKNOWN";
      }

      return {
        ok: false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function captureWebTestOperationalSnapshot() {
    try {
      await Promise.all([
        fetch(
          "/web-test/audit/operation-snapshot",
          {
            method:"POST",
          }
        ),
        fetch(
          "/web-test/audit/stability-snapshot",
          {
            method:"POST",
          }
        ),
      ]);
    } catch (_error) {
      // Gözlemsel snapshot hatası oyuncu akışını durdurmaz.
    }
  }

  function stopWebTestSampling() {
    if (webTestSamplingTimer) {
      clearInterval(
        webTestSamplingTimer
      );
      webTestSamplingTimer =
        null;
    }
  }

  function startWebTestSampling(
    testRunId
  ) {
    if (!operationalDiagnosticsEnabled) return;
    activeWebTestRunId =
      testRunId;

    stopWebTestSampling();
    captureWebTestOperationalSnapshot();

    webTestSamplingTimer =
      setInterval(
        () => {
          captureWebTestOperationalSnapshot();
          loadMonitoringSummary();
          loadOperationStatus();
          loadOperationStability();
        },
        10000
      );
  }

  function setFeedbackFormVisible(
    visible
  ) {
    const form =
      document.getElementById(
        "web-test-feedback-form"
      );

    if (form) {
      form.hidden =
        !visible;
    }
  }

  async function loadFeedbackSummary() {
    const el =
      document.getElementById(
        "feedback-summary-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/feedback/summary"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.feedback_load_failed")
        );
      }

      const payload =
        await response.json();
      const averages =
        payload.average_ratings
        || {};

      if (el) {
        el.textContent =
          localizedMessage("beta.feedback_summary", {
            count:localizedNumber(payload.feedback_count),
            usability:averages.usability ?? "-",
            connection:averages.connection ?? "-",
            battle:averages.battle_balance ?? "-",
            module:averages.module_booster_balance ?? "-",
          });
      }

      return {
        ok:true,
        payload,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.feedback_unavailable");
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadReviewCandidates() {
    const el=document.getElementById("beta-review-status");

    try {
      const response=await fetch("/web-test/review-candidates");
      if (!response.ok) {
        throw new Error(localizedMessage("beta.review_load_failed"));
      }

      const payload=await response.json();

      if (el) {
        if (payload.status==="waiting_for_real_data") {
          el.textContent=localizedMessage("beta.review_waiting");
        } else if (payload.status==="no_priority_issue") {
          el.textContent=localizedMessage("beta.review_no_issue");
        } else {
          const first=payload.candidates?.[0];
          el.textContent=
            localizedMessage("beta.review_areas", {count:localizedNumber(payload.candidate_count)})
            + (first ? localizedMessage("beta.review_priority_suffix", {label:localizedUiText(first.label)}) : "");
        }
        el.dataset.status=payload.status;
      }

      return {ok:true,payload};
    } catch (error) {
      if (el) {
        el.textContent=localizedMessage("beta.review_unavailable");
        el.dataset.status="error";
      }
      return {
        ok:false,
        reason:error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function loadBetaFindings() {
    const el =
      document.getElementById(
        "beta-findings-status"
      );

    try {
      const response =
        await fetch(
          "/web-test/findings"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.findings_load_failed")
        );
      }

      const payload =
        await response.json();

      if (el) {
        if (
          payload.status
          === "insufficient_data"
        ) {
          el.textContent =
            localizedMessage("beta.findings_waiting", {count:localizedNumber(payload.feedback_count), minimum:localizedNumber(payload.minimum_feedback)});
        } else {
          el.textContent =
            localizedMessage("beta.findings_ready", {concerns:localizedNumber(payload.concerns.length), matches:localizedNumber(payload.gameplay_signals.completed_matches)});
        }

        el.dataset.status =
          payload.status;
      }

      return {
        ok:true,
        payload,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.findings_unavailable");
        el.dataset.status =
          "error";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function submitWebTestFeedback() {
    const statusEl =
      document.getElementById(
        "feedback-submit-status"
      );

    const readRating =
      (id) => Number(
        document.getElementById(id)
          ?.value
        || 0
      );

    const payload = {
      test_run_id:
        activeWebTestRunId,
      submitted_at_ms:
        Date.now(),
      usability:
        readRating(
          "feedback-usability"
        ),
      connection:
        readRating(
          "feedback-connection"
        ),
      battle_balance:
        readRating(
          "feedback-battle-balance"
        ),
      module_booster_balance:
        readRating(
          "feedback-module-booster-balance"
        ),
      note:
        document.getElementById(
          "feedback-note"
        )?.value
        || "",
    };

    try {
      const response =
        await fetch(
          "/web-test/feedback",
          {
            method:"POST",
            headers:{
              "content-type":
                "application/json",
            },
            body:JSON.stringify(
              payload
            ),
          }
        );

      if (!response.ok) {
        let detail =localizedMessage("beta.feedback_submit_failed");

        try {
          const body =
            await response.json();
          detail =localizedApiError(body,response.status);
        } catch (_error) {
          // JSON gövdesi zorunlu değil.
        }

        throw new Error(
          detail
        );
      }

      if (statusEl) {
        statusEl.textContent =
          localizedMessage("beta.feedback_saved");
      }

      setFeedbackFormVisible(
        false
      );
      await loadFeedbackSummary();
      await loadBetaFindings();
      await loadReviewCandidates();

      return {
        ok:true,
      };
    } catch (error) {
      if (statusEl) {
        statusEl.textContent =
          error instanceof Error
            ? error.message
            : String(error);
      }

      return {
        ok:false,
      };
    }
  }

  async function finishActiveWebTestRun() {
    if (!activeWebTestRunId) {
      return {
        ok:false,
        reason:
          localizedMessage("beta.active_test_missing"),
      };
    }

    try {
      const response =
        await fetch(
          "/web-test/test-run/finish",
          {
            method:"POST",
            headers:{
              "content-type":
                "application/json",
            },
            body:JSON.stringify({
              test_run_id:
                activeWebTestRunId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.test_finish_failed")
        );
      }

      stopWebTestSampling();
      await loadWebTestRunStatus();
      await loadOperationStatus();
      await loadOperationStability();
      await loadMonitoringSummary();
      await loadWebTestRunReport();
      setFeedbackFormVisible(
        true
      );
      await loadFeedbackSummary();
      await loadBetaFindings();
      await loadReviewCandidates();

      return {
        ok:true,
        payload:
          await response.json(),
      };
    } catch (error) {
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function loadWebTestRunReport() {
    const el =
      document.getElementById(
        "web-test-run-report"
      );

    try {
      const response =
        await fetch(
          "/web-test/test-run/report"
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("beta.report_unavailable")
        );
      }

      const payload =
        await response.json();

      if (el) {
        const duration =
          payload.run_duration_ms == null
            ? "-"
            : localizedMessage("time.seconds_short", {count:localizedNumber(Math.round(payload.run_duration_ms / 1000))});

        el.textContent =
          localizedMessage("beta.test_report", {status:payload.status, duration, operation:payload.monitoring?.operation?.state || "-", stability:payload.monitoring?.stability?.state || "-"});
        el.dataset.status =
          payload.status;
      }

      return {
        ok:true,
        payload,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          localizedMessage("beta.report_status_unavailable");
        el.dataset.status =
          "error";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function ensureWebTestRunStarted(
    testRunId
  ) {
    if (!testRunId) {
      return {
        ok:false,
        reason:
          localizedMessage("beta.active_test_id_missing"),
      };
    }

    const status =
      await loadWebTestRunStatus();

    if (
      status.ok
      && status.view
        ?.finished
    ) {
      activeWebTestRunId =
        testRunId;
      stopWebTestSampling();
      await loadWebTestRunReport();
      setFeedbackFormVisible(
        true
      );
      await loadFeedbackSummary();
      await loadBetaFindings();
      await loadReviewCandidates();
      return {
        ok:true,
        alreadyStarted:true,
        finished:true,
      };
    }

    if (
      status.ok
      && status.view
        ?.started
    ) {
      startWebTestSampling(
        testRunId
      );
      return {
        ok:true,
        alreadyStarted:true,
      };
    }

    try {
      const response =
        await fetch(
          "/web-test/test-run/start",
          {
            method:"POST",
            headers:{
              "content-type":
                "application/json",
            },
            body:JSON.stringify({
              test_run_id:
                testRunId,
            }),
          }
        );

      if (!response.ok) {
        let detail =localizedMessage("beta.test_start_failed");

        try {
          const payload =
            await response.json();
          detail =localizedApiError(payload,response.status);
        } catch (_error) {
          // Yanıt gövdesi zorunlu değil.
        }

        throw new Error(
          detail
        );
      }

      await loadWebTestRunStatus();
      await loadOperationStatus();
      await loadOperationStability();
      await loadMonitoringSummary();
      startWebTestSampling(
        testRunId
      );

      return {
        ok:true,
        alreadyStarted:false,
      };
    } catch (error) {
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function checkServerReadiness() {
    renderServerBootStatus();

    const pending =
      serverBootGate.check();

    renderServerBootStatus();

    const result =
      await pending;

    renderServerBootStatus();

    if (!operationalDiagnosticsEnabled) {
      launchReadinessState.apply({
        launch_ready:Boolean(result.ok),
        failed_checks:result.ok ? [] : ["server_boot"],
      });
      if (!result.ok) {
        showPlayError(
          "websocket",
          result.reason || localizedMessage("beta.server_not_ready")
        );
      } else if (playRecoveryState.kind === "websocket") {
        clearPlayError();
      }
      renderParticipantBootstrapStatus();
      renderServerBootStatus();
      return {
        ...result,
        launchReady:Boolean(result.ok),
        preflightReady:Boolean(result.ok),
        runStarted:false,
        diagnosticsSkipped:true,
      };
    }

    loadGoNoGoStatus();
    loadRcCandidateStatus();
    loadFirstRunChecklist();

    const preflight =
      result.ok
        ? await loadPreflightStatus()
        : {
            ok:false,
          };

    const launch =
      result.ok
        ? await loadLaunchReadiness()
        : {
            ok:false,
          };

    let runStart = {
      ok:false,
    };

    if (
      result.ok
      && launch.ok
      && preflight.ok
      && preflight.view
        ?.ready
    ) {
      runStart =
        await ensureWebTestRunStarted(
          preflight.view.testRunId
        );
    }

    await loadWebTestRunStatus();
    await loadOperationStatus();
    await loadOperationStability();
    await loadMonitoringSummary();

    if (!result.ok) {
      showPlayError(
        "websocket",
        result.reason
        || localizedMessage("beta.release_check_not_ready")
      );
    } else if (!launch.ok) {
      showPlayError(
        "websocket",
        launch.reason
        || localizedMessage("beta.launch_approval_not_ready")
      );
    } else if (
      preflight.ok
      && preflight.view
        ?.ready
      && !runStart.ok
    ) {
      showPlayError(
        "websocket",
        runStart.reason
        || localizedMessage("beta.test_start_failed")
      );
    } else if (
      playRecoveryState.kind
      === "websocket"
    ) {
      clearPlayError();
    }

    renderParticipantBootstrapStatus();
    renderServerBootStatus();

    return {
      ...result,
      launchReady:
        Boolean(
          launch.ok
        ),
      preflightReady:
        Boolean(
          preflight.view
            ?.ready
        ),
      runStarted:
        Boolean(
          runStart.ok
        ),
    };
  }

  if (serverBootRetry) {
    serverBootRetry.addEventListener(
      "click",
      checkServerReadiness
    );
  }
  if (participantBootstrapRetry) {
    participantBootstrapRetry
      .addEventListener(
        "click",
        bootstrapParticipant
      );
  }

  const webTestFeedbackForm =
    document.getElementById(
      "web-test-feedback-form"
    );

  if (webTestFeedbackForm) {
    webTestFeedbackForm
      .addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();
          await submitWebTestFeedback();
        }
      );
  }

  const webTestFinishButton =
    document.getElementById(
      "web-test-finish-button"
    );

  if (webTestFinishButton) {
    webTestFinishButton
      .addEventListener(
        "click",
        async () => {
          const result =
            await finishActiveWebTestRun();

          if (!result.ok) {
            logClientMessage(
              result.reason
            );
          }
        }
      );
  }

  async function loadUiBuildManifest(
    providedManifest=null
  ) {
    try {
      let manifest=providedManifest;
      if (!manifest) {
        const response=await fetch(
          "/web-test/manifest",
          {
            cache:"no-store",
          }
        );
        if (!response.ok) return;
        manifest=await response.json();
      }
      const versionEl=
        document.getElementById(
          "ui-build-version"
        );
      const runEl=
        document.getElementById(
          "ui-build-run"
        );
      if (versionEl) {
        versionEl.textContent=
          manifest.version
          || "2.1.0-beta.43";
      }
      if (runEl) {
        runEl.textContent=localizedMessage("beta.manifest_cache", {run:manifest.test_run_id || "local", mode:manifest.static_cache_mode || "unknown"});
      }
    } catch (_error) {
      // Build chip is informational; startup remains available.
    }
  }

  renderAppScreen();
  renderConnectionStatus(
    pvpConnection.status
  );
  checkServerReadiness()
    .then((result) =>
      loadUiBuildManifest(
        result?.manifest || null
      )
    );

  const localPlayStartButton =
    document.getElementById(
      "local-play-start"
    );
  const onlinePlayPrepareButton =
    document.getElementById(
      "online-play-prepare"
    );
  const playModeStatusEl =
    document.getElementById(
      "play-mode-status"
    );
  const activeMatchModeEl =
    document.getElementById(
      "active-match-mode"
    );
  const playerCoreSummaryEl =
    document.getElementById(
      "player-core-summary"
    );
  const battleStateLabelEl =
    document.getElementById(
      "battle-state-label"
    );
  const battleLiveTickerEl =
    document.getElementById(
      "battle-live-ticker"
    );
  const battleSettingsButton =
    document.getElementById(
      "battle-settings-button"
    );
  const battleProfileNameEl =
    document.getElementById(
      "battle-profile-name"
    );
  const battleForfeitButton =
    document.getElementById(
      "battle-forfeit-button"
    );

  if (battleSettingsButton) {
    battleSettingsButton.addEventListener(
      "click",
      () => {
        document.body.classList.toggle(
          "battle-hud-settings-open"
        );
        trackBattleUiInteraction(
          "battle_settings_gear",
          "technical_drawer"
        );
        battleSettingsButton.title =
          document.body.classList.contains(
            "battle-hud-settings-open"
          )
            ? localizedMessage("battle.settings_open")
            : localizedMessage("ui.settings");
      }
    );
  }

  const BOARD_CELLS = Array.from({length: 15}, (_, i) => [i % 5, Math.floor(i / 5)]);
  const CORE_POSITION = { x: 2, y: 1 };
  const GATE_KEYS = new Set();
  const SPECIAL_CELL_INFO = {};
  let battleStartedAt = performance.now();
  gridshardAudioDirector =
    typeof GridshardAudioDirector === "function"
      ? new GridshardAudioDirector()
      : null;
  gridshardAudioDirector?.bindUserGestureUnlock?.(document);
  requestOwnedAudioState("audio_director_ready", {}, { force:true });

  function triggerGridshardCue(
    cueName
  ) {
    if (
      gridshardAudioDirector
      && typeof gridshardAudioDirector
        .triggerCue === "function"
    ) {
      return gridshardAudioDirector
        .triggerCue(
          cueName
        );
    }
    return {
      ok:false,
      reason:localizedMessage("audio.director_not_ready"),
    };
  }

  let activePlayMode = "idle";
  const AI_ARCHETYPE_UI = Object.freeze({
    aggressive:{
      key:"ai.aggressive",
    },
    defensive:{
      key:"ai.defensive",
    },
    balanced:{
      key:"ai.balanced",
    },
    sabotage:{
      key:"ai.sabotage",
    },
    economy:{
      key:"ai.economy",
    },
  });
  let selectedAiArchetype = "balanced";
  let activeLocalAiArchetype = "balanced";

  function aiArchetypeInfo(archetypeId=selectedAiArchetype) {
    return AI_ARCHETYPE_UI[archetypeId] || AI_ARCHETYPE_UI.balanced;
  }

  function aiArchetypeName(archetypeId=selectedAiArchetype) {
    const info=aiArchetypeInfo(archetypeId);
    return localizedMessage(`${info.key}.name`);
  }

  function renderAiArchetypePicker() {
    const picker=document.getElementById("ai-archetype-picker");
    if (!picker) return;
    const info=aiArchetypeInfo(selectedAiArchetype);
    const heading=document.getElementById("ai-archetype-title");
    const selected=document.getElementById("ai-archetype-selected");
    const description=document.getElementById("ai-archetype-description");
    if (heading) heading.textContent=localizedMessage("ai.opponent_title");
    if (selected) selected.textContent=localizedMessage(`${info.key}.name`);
    if (description) {
      const descriptionText = localizedMessage(`${info.key}.description`);
      const planText = localizedMessage(`${info.key}.plan`);
      description.textContent = localizedMessage("ai.description_plan", {description:descriptionText, plan:planText});
    }

    for (const button of picker.querySelectorAll("[data-ai-archetype]")) {
      const archetypeId=button.dataset.aiArchetype;
      const buttonInfo=aiArchetypeInfo(archetypeId);
      button.dataset.active=String(archetypeId === selectedAiArchetype);
      button.setAttribute("aria-pressed",String(archetypeId === selectedAiArchetype));
      const strong=button.querySelector("strong");
      if (strong) strong.textContent=localizedMessage(`${buttonInfo.key}.name`);
    }
  }

  function setSelectedAiArchetype(archetypeId) {
    if (!Object.prototype.hasOwnProperty.call(AI_ARCHETYPE_UI,archetypeId)) return;
    selectedAiArchetype=archetypeId;
    renderAiArchetypePicker();
  }

  let localBattleStarted = false;
  let localBattleFinished = false;
  let localEnemyAttackSecond = -1;
  let localBattleMetrics = null;
  let localServerSessionId = null;
  let localServerSyncTimer = null;
  let localServerAuthoritative = false;
  let localServerEventCursor = 0;
  let localServerLastSnapshotTick = -1;
  let localServerFinalResult = null;
  let localBattleOutcome = "pending";
  const destructionFxPlayed = new Set();
  const snapshotModuleHp = new Map();
  const moduleAnchorRects = new Map();
  const floatingFeedbackLive = new Map();
  let battleLiveTickerTimer = null;

  let webTestSamplingTimer = null;
  let activeWebTestRunId = null;
  let previousCapacity = null;
  let mockServerCredits = 6;
  let mockServerRegenPulses = 0;
  let mockEnemyCoreHp = 300;
  let mockEnemyGeneratorHp = 150;
  let mockEnemyGeneratorPosition = {
    x: 2,
    y: 1,
  };
  let mockEnemyGeneratorPower = {
    isPowered:true,
    energyReceived:11,
    energyRequired:0,
  };
  let mockEnemyModuleHp = 140;
  let mockEnemyModules = [];
  let enemyBattlePlayerId = null;
  let enemyBattleDisplayName = "";
  let enemyBattlePoolDefinitionIds = [
    ...STARTER_BATTLE_POOL_PRESET.module_definition_ids,
  ];
  let playerCellDebris = [];
  let enemyCellDebris = [];

  function resetMockEnemyCircuit() {
    mockEnemyGeneratorPosition = {
      x: 2,
      y: 1,
    };
    mockEnemyGeneratorPower = {
      isPowered:true,
      energyReceived:11,
      energyRequired:0,
    };
    mockEnemyModules = [
      {id:"enemy-shield",definitionId:"shield",name:"Kalkan",hp:140,maxHp:140,position:{x:1,y:1},kind:"defense",isPowered:true,energyReceived:2,energyRequired:2},
      {id:"enemy-laser",definitionId:"laser",name:"Lazer",hp:100,maxHp:100,position:{x:3,y:1},kind:"attack",isPowered:true,energyReceived:3,energyRequired:3},
      {id:"enemy-battery",definitionId:"battery",name:"Batarya",hp:120,maxHp:120,position:{x:3,y:0},kind:"energy",isPowered:true,energyReceived:0,energyRequired:0},
    ];
    mockEnemyModuleHp = mockEnemyModules.reduce((sum,module)=>sum+module.hp,0);
  }

  function enemyLivingModules() {
    return mockEnemyModules.filter((module)=>Number(module.hp||0)>0);
  }

  const MOCK_TARGET_CATEGORY_PRIORITY = {
    savunma:0,
    defense:0,
    sabotaj:1,
    sabotage:1,
    destek:2,
    support:2,
    enerji:3,
    energy:3,
    saldırı:4,
    attack:4,
  };

  function mockTargetPriority(
    module
  ) {
    return MOCK_TARGET_CATEGORY_PRIORITY[
      module?.category
      || module?.kind
    ] ?? 99;
  }

  function selectMockEnemyTarget() {
    return [...enemyLivingModules()]
      .sort(
        (a,b) =>
          mockTargetPriority(a)
          - mockTargetPriority(b)
          || String(a.id).localeCompare(
            String(b.id),
            "tr"
          )
      )[0] || null;
  }

  function enemyHasLivingAttackModule() {
    return enemyLivingModules()
      .some(
        (module) =>
          [
            "saldırı",
            "attack",
          ].includes(
            module.category
            || module.kind
          )
      );
  }
  let previousCombatSecond = -1;
  const mockAttackerLastAttack = new Map();
  let lastBattleAnimationNow = null;
  let battleVisualGeneration = 0;
  const BATTLE_PAUSE_GAP_THRESHOLD_MS = 1000;

  function publishBattleUxMetrics() {
    if (
      typeof window === "undefined"
    ) {
      return;
    }
    window.__GRIDSHARD_BATTLE_UX =
      localBattleMetrics
        ? {
            elapsed_ms:
              Math.round(
                client.elapsedMs
              ),
            frame_count:
              localBattleMetrics
                .frame_count,
            max_frame_gap_ms:
              Math.round(
                localBattleMetrics
                  .max_frame_gap_ms
              ),
            pause_violation_count:
              localBattleMetrics
                .pause_violation_count,
            ui_interactions:
              localBattleMetrics
                .ui_interactions,
            ui_interaction_samples:
              [
                ...localBattleMetrics
                  .ui_interaction_samples,
              ],
            ux_categories:{
              ...localBattleMetrics
                .ux_categories,
            },
            ux_matrix:
              Object.fromEntries(
                Object.entries(
                  localBattleMetrics
                    .ux_matrix
                ).map(
                  ([category,value])=>[
                    category,
                    {
                      count:
                        value.count,
                      average_frame_gap_ms:
                        value.count
                          ? Math.round(
                              value.total_frame_gap_ms
                              / value.count
                            )
                          : 0,
                      max_frame_gap_ms:
                        Math.round(
                          value.max_frame_gap_ms
                        ),
                      average_clock_delta_ms:
                        value.count
                          ? Math.round(
                              value.total_clock_delta_ms
                              / value.count
                            )
                          : 0,
                      max_clock_delta_ms:
                        Math.round(
                          value.max_clock_delta_ms
                        ),
                    },
                  ]
                )
              ),
            finished:
              localBattleFinished,
          }
        : null;
  }

  function classifyBattleUiInteraction(
    kind,
    explicitCategory=null
  ) {
    if (explicitCategory) {
      return explicitCategory;
    }

    const value=
      String(
        kind || ""
      ).toLocaleLowerCase("tr");

    if (
      value.includes("booster")
      || value.includes("aşırı yük")
      || value.includes("acil onarım")
    ) {
      return "booster";
    }

    if (
      value.includes("technical")
      || value.includes("teknik")
      || value.includes("tanılama")
    ) {
      return "technical_drawer";
    }

    return "other_ui";
  }

  function trackBattleUiInteraction(
    kind,
    explicitCategory=null
  ) {
    if (
      activePlayMode !== "local"
      || !localBattleStarted
      || localBattleFinished
      || !localBattleMetrics
    ) {
      return;
    }

    const category=
      classifyBattleUiInteraction(
        kind,
        explicitCategory
      );

    localBattleMetrics
      .ui_interactions += 1;

    if (
      Object.prototype.hasOwnProperty.call(
        localBattleMetrics
          .ux_categories,
        category
      )
    ) {
      localBattleMetrics
        .ux_categories[
          category
        ] += 1;
    } else {
      localBattleMetrics
        .ux_categories
        .other_ui += 1;
    }

    const elapsedNow=
      Math.round(
        client.elapsedMs
      );
    const frameNow=
      (
        typeof performance
        !== "undefined"
        && typeof performance.now
        === "function"
      )
        ? performance.now()
        : Date.now();
    const frameGap=
      lastBattleAnimationNow
      === null
        ? 0
        : Math.max(
            0,
            frameNow
            - lastBattleAnimationNow
          );

    const matrix=
      localBattleMetrics
        .ux_matrix[
          category
        ]
      || localBattleMetrics
        .ux_matrix
        .other_ui;

    const clockDelta=
      matrix.last_elapsed_ms
      === null
        ? 0
        : Math.max(
            0,
            elapsedNow
            - matrix.last_elapsed_ms
          );

    matrix.count += 1;
    matrix.total_frame_gap_ms +=
      frameGap;
    matrix.max_frame_gap_ms=
      Math.max(
        matrix.max_frame_gap_ms,
        frameGap
      );
    matrix.total_clock_delta_ms +=
      clockDelta;
    matrix.max_clock_delta_ms=
      Math.max(
        matrix.max_clock_delta_ms,
        clockDelta
      );
    matrix.last_elapsed_ms=
      elapsedNow;

    const sample={
      kind:String(kind || "ui"),
      category,
      elapsed_ms:
        elapsedNow,
      frame_gap_ms:
        Math.round(
          frameGap
        ),
      battle_clock_delta_ms:
        Math.round(
          clockDelta
        ),
      at_epoch_ms:
        Date.now(),
    };

    localBattleMetrics
      .ui_interaction_samples
      .push(sample);

    if (
      localBattleMetrics
        .ui_interaction_samples
        .length > 32
    ) {
      localBattleMetrics
        .ui_interaction_samples
        .shift();
    }

    telemetryDispatcher.track(
      "battle_ui_interaction",
      sample
    );

    publishBattleUxMetrics();
  }


  if (
    typeof document.addEventListener
    === "function"
  ) {
    document.addEventListener(
      "click",
      (event) => {
        if (
          activePlayMode !== "local"
          || !localBattleStarted
          || localBattleFinished
        ) {
          return;
        }

        const hasElement=
          typeof Element
          !== "undefined";
        const target=
          hasElement
          && event.target
          instanceof Element
            ? event.target.closest(
                "button,summary,[role=button],.module-card,.board-cell"
              )
            : null;

        if (!target) {
          return;
        }

        const label=
          target.id
          || target.getAttribute(
            "data-module-id"
          )
          || target.textContent
            ?.trim()
            .slice(0,48)
          || target.tagName;

        trackBattleUiInteraction(
          label,
          label
            ?.toLocaleLowerCase("tr")
            .includes("teknik")
            ? "technical_drawer"
            : null
        );
      },
      true
    );
  }

  function setActivePlayMode(mode) {
    activePlayMode = mode;
    document.body.dataset.playMode =
      mode;

    const localPreparationButton=
      document.getElementById(
        "battle-prepare-local"
      );
    const onlinePreparationButton=
      document.getElementById(
        "battle-prepare-online"
      );
    if (localPreparationButton) {
      localPreparationButton.dataset.active=
        String(mode === "local");
    }
    if (onlinePreparationButton) {
      onlinePreparationButton.dataset.active=
        String(mode === "online");
    }

    syncAudioStateForCurrentView();

    if (playModeStatusEl) {
      const labels = {
        idle:localizedMessage("battle.mode_waiting"),
        local:localizedMessage("battle.local_active"),
        online:localizedMessage("battle.online_preparing"),
      };
      playModeStatusEl.textContent =
        labels[mode] || mode;
    }

    renderPlayModeUi();
  }

  function renderPlayModeUi() {
    if (
      appRouter.currentScreen
      !== RelayAppScreen.PLAY
    ) {
      return;
    }

    const idle =
      activePlayMode === "idle";
    const local =
      activePlayMode === "local";
    const online =
      activePlayMode === "online";
    const onlineBattle =
      online
      && (
        document.body
          .dataset.onlineStatus
          === "battle"
        || ["battle", "finished"].includes(
          pvpState.phase
        )
      );
    const localBattle =
      local
      && localBattleStarted;
    const battleFinished =
      (localBattle && localBattleFinished)
      || (
        onlineBattle
        && pvpState.phase === "finished"
      );

    if (battleForfeitButton) {
      battleForfeitButton.hidden =
        !(localBattle || onlineBattle)
        || battleFinished;
      battleForfeitButton.disabled = false;
    }

    const modePanel =
      document.getElementById(
        "play-mode-panel"
      );
    if (modePanel) {
      modePanel.hidden =
        !idle
        || localBattle
        || onlineBattle;
    }

    const poolPanel =
      document.getElementById(
        "battle-pool-panel"
      );
    if (poolPanel) {
      poolPanel.hidden =
        idle
        || localBattle
        || onlineBattle;
    }

    for (
      const panel
      of document.querySelectorAll(
        ".play-live-panel"
      )
    ) {
      panel.hidden =
        !(
          localBattle
          || onlineBattle
        );
    }

    const recoveryPanel =
      document.getElementById(
        "play-recovery-panel"
      );
    if (recoveryPanel) {
      recoveryPanel.hidden =
        !online
        || !playRecoveryState
          .viewModel()
          .active;
    }

    const cancel =
      document.getElementById(
        "matchmaking-cancel"
      );
    if (cancel) {
      cancel.hidden =
        !online;
    }

    const resultPanel =
      document.querySelector(
        ".play-result-panel"
      );
    if (resultPanel) {
      resultPanel.hidden =
        !postMatchRevealReady
        || (
          !(
            localBattle
            && localBattleFinished
          )
          && !(
            onlineBattle
            && pvpState.phase
              === "finished"
          )
        );
    }

    const technicalPanel =
      document.querySelector(
        ".play-technical-panel"
      );
    if (technicalPanel) {
      technicalPanel.hidden =
        !(
          localBattle
          || onlineBattle
        );
    }

    renderBattlePoolSelection();
  }

  function createLocalBattleMetrics() {
    return {
      started_at_ms:Date.now(),
      ai_archetype:selectedAiArchetype,
      duration_ms:0,
      won:false,
      forfeited:false,
      forfeit_credit_penalty:0,
      credits_spent:0,
      generator_moves:0,
      generator_gate_visits:{
        north:0,
        east:0,
        south:1,
        west:0,
      },
      damage_dealt:0,
      damage_by_module:{},
      damage_received:0,
      shield_mitigated:0,
      module_changes:0,
      ai_hits:0,
      player_attacks:0,
      frame_count:0,
      max_frame_gap_ms:0,
      pause_violation_count:0,
      ui_interactions:0,
      ui_interaction_samples:[],
      ux_categories:{
        module_place:0,
        module_move:0,
        generator_gate:0,
        booster:0,
        technical_drawer:0,
        other_ui:0,
      },
      ux_matrix:{
        module_place:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
        module_move:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
        generator_gate:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
        booster:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
        technical_drawer:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
        other_ui:{
          count:0,
          total_frame_gap_ms:0,
          max_frame_gap_ms:0,
          total_clock_delta_ms:0,
          max_clock_delta_ms:0,
          last_elapsed_ms:null,
        },
      },
    };
  }

  function generatorGateName(position) {
    if (!position) return "unknown";
    if (position.x===2 && position.y===1) return "north";
    if (position.x===3 && position.y===2) return "east";
    if (position.x===2 && position.y===3) return "south";
    if (position.x===1 && position.y===2) return "west";
    return "unknown";
  }

  function renderBalanceDraft(
    draft
  ) {
    const status=
      document.getElementById(
        "balance-draft-status"
      );
    const list=
      document.getElementById(
        "balance-draft-items"
      );

    if (!status || !list) {
      return;
    }

    status.textContent=
      draft.review_ready
        ? localizedMessage("admin.review_ready")
        : localizedMessage("admin.review_pending");
    status.dataset.ready=
      String(
        Boolean(
          draft.review_ready
        )
      );

    list.innerHTML="";

    if (
      !draft.review_ready
      || !(draft.items || []).length
    ) {
      const p=
        document.createElement("p");
      p.textContent=
        localizedMessage("admin.three_matches_required");
      list.appendChild(p);
      return;
    }

    for (
      const item
      of draft.items
    ) {
      const card=
        document.createElement(
          "article"
        );
      card.className=
        "balance-draft-item";
      card.dataset.area=
        item.area;

      const heading=
        document.createElement(
          "strong"
        );
      heading.textContent=
        item.area;

      const reason=
        document.createElement(
          "span"
        );
      reason.textContent=
        item.reason || "";

      const before=
        document.createElement(
          "input"
        );
      before.type="text";
      before.placeholder=
        localizedMessage("admin.current_value");
      before.value=
        item.before_value ?? "";

      const proposed=
        document.createElement(
          "input"
        );
      proposed.type="text";
      proposed.placeholder=
        localizedMessage("admin.proposed_value");
      proposed.value=
        item.proposed_value ?? "";

      const approvalLabel=
        document.createElement(
          "label"
        );
      const approval=
        document.createElement(
          "input"
        );
      approval.type="checkbox";
      approval.checked=
        Boolean(item.approved);
      approvalLabel.append(
        approval,
        document.createTextNode(
          localizedMessage("admin.approve_draft")
        )
      );

      const checks=
        document.createElement(
          "small"
        );
      checks.textContent=localizedMessage("admin.draft_checks", {simulation:item.simulation_status || "pending", regression:item.regression_status || "pending", applicable:localizedMessage(item.ready_for_apply ? "admin.yes" : "admin.no")});

      const save=
        document.createElement(
          "button"
        );
      save.type="button";
      save.textContent=
        localizedMessage("admin.save_draft");

      const simulate=
        document.createElement(
          "button"
        );
      simulate.type="button";
      simulate.className=
        "simulate-button";
      simulate.textContent=
        localizedMessage("admin.run_simulation");

      const simulationResult=
        document.createElement(
          "div"
        );
      simulationResult.className=
        "balance-simulation-result";
      const regress=
        document.createElement(
          "button"
        );
      regress.type="button";
      regress.className=
        "regression-button";
      regress.textContent=
        localizedMessage("admin.run_regression");
      const structuralReview=
        [
          "generator_route",
          "defense_usage",
        ].includes(
          item.area
        );

      regress.disabled=
        structuralReview
          ? false
          : (
              item.simulation_status
              !== "passed"
            );

      if (structuralReview) {
        regress.textContent=
          localizedMessage("admin.run_structural_regression");
        before.disabled=true;
        proposed.disabled=true;
        approval.disabled=true;
        simulate.disabled=true;
      }

      const regressionResult=
        document.createElement(
          "div"
        );
      regressionResult.className=
        "balance-regression-result";
      regressionResult.textContent=
        item.regression_status
        === "passed"
          ? localizedMessage("admin.previous_regression_passed")
          : (
              item.regression_status
              === "failed"
                ? localizedMessage("admin.previous_regression_failed")
                : localizedMessage("admin.regression_pending")
            );
      simulationResult.textContent=
        structuralReview
          ? localizedMessage("admin.structural_regression_needed")
          : (
              item.simulation_status
              === "passed"
                ? localizedMessage("admin.previous_simulation_passed")
                : (
                    item.simulation_status
                    === "failed"
                      ? localizedMessage("admin.previous_simulation_failed")
                      : localizedMessage("admin.simulation_pending")
                  )
            );

      save.addEventListener(
        "click",
        async () => {
          const response=await fetch(
            `/telemetry/balance-change-draft?player_id=${encodeURIComponent(participantPlayerId)}`,
            {
              method:"PUT",
              headers:{
                "content-type":"application/json",
              },
              body:JSON.stringify({
                area:item.area,
                before_value:
                  before.value || null,
                proposed_value:
                  proposed.value || null,
                approved:
                  approval.checked,
                simulation_status:
                  item.simulation_status || "pending",
                regression_status:
                  item.regression_status || "pending",
              }),
            }
          );

          if (response.ok) {
            const updated=
              await response.json();
            renderBalanceDraft(
              updated
            );
          }
        }
      );

      simulate.addEventListener(
        "click",
        async () => {
          // Save current draft values first, then simulate stored proposal.
          const saveResponse=
            await fetch(
              `/telemetry/balance-change-draft?player_id=${encodeURIComponent(participantPlayerId)}`,
              {
                method:"PUT",
                headers:{
                  "content-type":"application/json",
                },
                body:JSON.stringify({
                  area:item.area,
                  before_value:
                    before.value || null,
                  proposed_value:
                    proposed.value || null,
                  approved:
                    approval.checked,
                  simulation_status:
                    "pending",
                  regression_status:
                    item.regression_status || "pending",
                }),
              }
            );

          if (!saveResponse.ok) {
            simulationResult.textContent=
              localizedMessage("admin.draft_save_failed");
            return;
          }

          const response=
            await fetch(
              `/telemetry/balance-change-simulate?player_id=${encodeURIComponent(participantPlayerId)}`,
              {
                method:"POST",
                headers:{
                  "content-type":"application/json",
                },
                body:JSON.stringify({
                  area:item.area,
                }),
              }
            );

          const payload=
            await response.json();

          if (
            response.ok
            && payload.ok
          ) {
            const beforeMetrics=
              JSON.stringify(
                payload.simulation
                  ?.metrics_before
                || {}
              );
            const proposedMetrics=
              JSON.stringify(
                payload.simulation
                  ?.metrics_proposed
                || {}
              );
            simulationResult.textContent=localizedMessage("admin.simulation_passed", {before:beforeMetrics, proposed:proposedMetrics});
            renderBalanceDraft(
              payload.draft
            );
          } else {
            simulationResult.textContent=
              response.ok
                ? localizedMessage("admin.simulation_failed")
                : localizedApiError(payload, response.status);
            if (payload.draft) {
              renderBalanceDraft(
                payload.draft
              );
            }
          }
        }
      );

      regress.addEventListener(
        "click",
        async () => {
          const response=
            await fetch(
              `/telemetry/balance-change-regression?player_id=${encodeURIComponent(participantPlayerId)}`,
              {
                method:"POST",
                headers:{
                  "content-type":"application/json",
                },
                body:JSON.stringify({
                  area:item.area,
                }),
              }
            );

          const payload=
            await response.json();

          if (
            response.ok
            && payload.ok
          ) {
            const scenarios=
              payload.regression
                ?.engine_scenarios
              || [];
            regressionResult.textContent=localizedMessage("admin.regression_passed", {count:localizedNumber(scenarios.length)});
          } else {
            regressionResult.textContent=
              response.ok
                ? localizedMessage("admin.regression_failed")
                : localizedApiError(payload, response.status);
          }

          if (payload.draft) {
            renderBalanceDraft(
              payload.draft
            );
          }
          loadHumanReviewQueue();
        }
      );

      card.append(
        heading,
        reason,
        before,
        proposed,
        approvalLabel,
        checks,
        save,
        simulate,
        simulationResult,
        regress,
        regressionResult
      );
      list.appendChild(card);
    }
  }

  async function loadBalanceDraft() {
    try {
      const response=
        await fetch(
          `/telemetry/balance-change-draft?player_id=${encodeURIComponent(participantPlayerId)}`
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("admin.draft_unavailable")
        );
      }

      const draft=
        await response.json();
      renderBalanceDraft(
        draft
      );
      loadHumanReviewQueue();
      return {
        ok:true,
        draft,
      };
    } catch (error) {
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  function renderHumanReviewQueue(
    queue
  ) {
    const status=
      document.getElementById(
        "human-review-status"
      );
    const list=
      document.getElementById(
        "human-review-items"
      );

    if (!status || !list) {
      return;
    }

    const numeric=
      queue.numeric_candidates || [];
    const structural=
      queue.structural_candidates || [];
    const total=
      Number(
        queue.candidate_count || 0
      );

    status.textContent=
      total
        ? localizedMessage("admin.review_candidates_ready", {count:localizedNumber(total)})
        : localizedMessage("admin.safety_gates_pending");

    list.innerHTML="";
    const evidence=
      document.getElementById(
        "human-review-evidence"
      );

    if (evidence) {
      evidence.innerHTML=
        total
          ? `<strong>${localizedMessage("admin.evidence_package")}</strong><span>${localizedMessage("admin.evidence_summary", {numeric:localizedNumber(numeric.length), structural:localizedNumber(structural.length)})}</span>`
          : `<strong>${localizedMessage("admin.evidence_package")}</strong><span>${localizedMessage("admin.no_evidence_candidates")}</span>`;
    }

    if (!total) {
      const empty=
        document.createElement(
          "p"
        );
      empty.textContent=
        localizedMessage("admin.queue_eligibility");
      list.appendChild(empty);
      return;
    }

    for (
      const item
      of [
        ...numeric,
        ...structural,
      ]
    ) {
      const card=
        document.createElement(
          "article"
        );
      card.className=
        "human-review-item";
      card.dataset.kind=
        item.numeric_change
          ? "numeric"
          : "structural";

      const title=
        document.createElement(
          "strong"
        );
      title.textContent=
        item.area;

      const detail=
        document.createElement(
          "span"
        );
      detail.textContent=
        item.numeric_change
          ? localizedMessage("admin.current_proposed", {before:item.before_value, proposed:item.proposed_value})
          : localizedMessage("admin.structural_verified");

      const safety=
        document.createElement(
          "small"
        );
      safety.textContent=
        localizedMessage("admin.manual_decision_required");

      card.append(
        title,
        detail,
        safety
      );
      list.appendChild(card);
    }
  }

  const HUMAN_REVIEW_CANDIDATE_PREFIX=
    "gridshard.balance-review.candidate.";

  function humanReviewCandidateKey(area) {
    return HUMAN_REVIEW_CANDIDATE_PREFIX + String(area || "unknown");
  }

  function readCandidateReviewDraft(area) {
    try {
      const raw=localStorage.getItem(humanReviewCandidateKey(area));
      if (!raw) return {state:"none",note:""};
      const parsed=JSON.parse(raw);
      return {
        state:Object.prototype.hasOwnProperty.call(HUMAN_REVIEW_STATE_LABELS,parsed?.state) ? parsed.state : "none",
        note:String(parsed?.note || ""),
      };
    } catch (_error) {
      return {state:"none",note:""};
    }
  }

  function saveCandidateReviewDraft(area,state,note) {
    const safeState=Object.prototype.hasOwnProperty.call(HUMAN_REVIEW_STATE_LABELS,state) ? state : "none";
    const payload={
      area:String(area),
      state:safeState,
      note:String(note || "").trim(),
      updated_at_ms:Date.now(),
      local_only:true,
      canonical_balance_changed:false,
      automatic_apply:false,
    };
    localStorage.setItem(humanReviewCandidateKey(area),JSON.stringify(payload));
    return payload;
  }

  function renderHumanReviewEvidenceDetails(
    payload
  ) {
    const host=
      document.getElementById(
        "human-review-evidence-details"
      );
    if (!host) return;

    host.innerHTML="";

    const evidence=
      payload?.evidence || [];

    if (!evidence.length) {
      const empty=
        document.createElement(
          "p"
        );
      empty.textContent=
        localizedMessage("admin.no_detailed_evidence");
      host.appendChild(empty);
      return;
    }

    for (
      const item
      of evidence
    ) {
      const details=
        document.createElement(
          "details"
        );
      details.className=
        "human-review-evidence-card";

      const summary=
        document.createElement(
          "summary"
        );
      summary.textContent=localizedMessage("admin.evidence_card_summary", {area:item.area, type:localizedMessage(item.numeric_change ? "admin.numeric" : "admin.structural"), regression:item.regression_status});

      const body=
        document.createElement(
          "div"
        );
      body.className=
        "human-review-evidence-body";

      const safeJson=
        (value)=>
          JSON.stringify(
            value ?? null,
            null,
            2
          );

      const simulationBefore=
        item.simulation
          ?.metrics_before
        || item.simulation
          ?.before
        || null;
      const simulationProposed=
        item.simulation
          ?.metrics_proposed
        || item.simulation
          ?.proposed
        || null;
      const regressionScenarioCount=
        Array.isArray(
          item.regression
            ?.engine_scenarios
        )
          ? item.regression
              .engine_scenarios
              .length
          : (
              item.regression
              ? 1
              : 0
            );

      const comparison=document.createElement("div");
      comparison.className="human-review-compare-grid";
      const addComparison=(key,value)=>{
        const row=document.createElement("div");
        const label=document.createElement("span");
        const content=document.createElement("strong");
        label.textContent=localizedMessage(key);
        content.textContent=String(value);
        row.append(label,content);
        comparison.appendChild(row);
      };
      addComparison("admin.simulation_before",simulationBefore ? safeJson(simulationBefore) : "—");
      addComparison("admin.simulation_proposed",simulationProposed ? safeJson(simulationProposed) : "—");
      addComparison("admin.regression",localizedMessage("admin.regression_scenarios", {status:item.regression_status, count:localizedNumber(regressionScenarioCount)}));
      body.appendChild(comparison);
      const addDetail=(key,value)=>{
        const row=document.createElement("p");
        const label=document.createElement("strong");
        label.textContent=localizedMessage(key);
        row.append(label,document.createTextNode(` ${value ?? "—"}`));
        body.appendChild(row);
      };
      addDetail("admin.reason",item.reason);
      addDetail("admin.proposal",item.suggestion);
      addDetail("admin.current_to_proposed",`${item.before_value ?? "—"} → ${item.proposed_value ?? "—"}`);
      addDetail("admin.simulation",item.simulation_status);
      const simulationJson=document.createElement("pre");
      simulationJson.textContent=safeJson(item.simulation);
      body.appendChild(simulationJson);
      addDetail("admin.regression",item.regression_status);
      const regressionJson=document.createElement("pre");
      regressionJson.textContent=safeJson(item.regression);
      body.appendChild(regressionJson);
      const safety=document.createElement("p");
      safety.className="human-review-safety";
      safety.textContent=localizedMessage("admin.manual_decision_required");
      body.appendChild(safety);

      const candidateDraft=readCandidateReviewDraft(item.area);
      const decisionBox=document.createElement("div");
      decisionBox.className="candidate-review-draft";
      const decisionSelect=document.createElement("select");
      for (const [value,label] of Object.entries(HUMAN_REVIEW_STATE_LABELS)) {
        const option=document.createElement("option");
        option.value=value;
        option.textContent=localizedMessage(label);
        option.selected=candidateDraft.state===value;
        decisionSelect.appendChild(option);
      }
      const noteField=document.createElement("textarea");
      noteField.maxLength=600;
      noteField.placeholder=localizedMessage("admin.candidate_note_placeholder");
      noteField.value=candidateDraft.note;
      const saveButton=document.createElement("button");
      saveButton.type="button";
      saveButton.textContent=localizedMessage("admin.save_candidate_local");
      const draftStatus=document.createElement("span");
      draftStatus.textContent=(candidateDraft.state!=="none" || candidateDraft.note)
        ? localizedMessage("admin.candidate_local_draft", {state:localizedMessage(HUMAN_REVIEW_STATE_LABELS[candidateDraft.state])})
        : localizedMessage("admin.no_candidate_decision");
      saveButton.addEventListener("click",()=>{
        try {
          const saved=saveCandidateReviewDraft(item.area,decisionSelect.value,noteField.value);
          draftStatus.textContent=localizedMessage("admin.candidate_saved", {state:localizedMessage(HUMAN_REVIEW_STATE_LABELS[saved.state]), area:item.area});
        } catch (_error) {
          draftStatus.textContent=localizedMessage("admin.candidate_save_failed");
        }
      });
      decisionBox.append(decisionSelect,noteField,saveButton,draftStatus);
      body.appendChild(decisionBox);

      details.append(
        summary,
        body
      );
      host.appendChild(
        details
      );
    }
  }

  async function loadHumanReviewEvidence() {
    try {
      const response=
        await fetch(
          `/telemetry/balance-human-review-evidence?player_id=${encodeURIComponent(participantPlayerId)}`
        );
      if (!response.ok) {
        return {
          ok:false,
        };
      }
      const payload=
        await response.json();
      renderHumanReviewEvidenceDetails(
        payload
      );
      return {
        ok:true,
        payload,
      };
    } catch (_error) {
      return {
        ok:false,
      };
    }
  }

const HUMAN_REVIEW_NOTE_KEY=
  "gridshard.balance-review.local-draft";

const HUMAN_REVIEW_STATE_LABELS={
  none:"admin.state.none",
  hold:"admin.state.hold",
  reject:"admin.state.reject",
  revisit:"admin.state.revisit",
};

function readHumanReviewLocalDraft() {
  try {
    const raw=
      localStorage.getItem(
        HUMAN_REVIEW_NOTE_KEY
      );
    if (!raw) {
      return {
        state:"none",
        note:"",
        updated_at_ms:null,
      };
    }

    const parsed=
      JSON.parse(raw);

    return {
      state:
        Object.prototype
          .hasOwnProperty.call(
            HUMAN_REVIEW_STATE_LABELS,
            parsed?.state
          )
          ? parsed.state
          : "none",
      note:
        String(
          parsed?.note || ""
        ),
      updated_at_ms:
        Number(
          parsed?.updated_at_ms
          || 0
        )
        || null,
    };
  } catch (_error) {
    return {
      state:"none",
      note:"",
      updated_at_ms:null,
    };
  }
}

function loadHumanReviewLocalNote() {
  const field=
    document.getElementById(
      "human-review-decision-note"
    );
  const stateField=
    document.getElementById(
      "human-review-decision-state"
    );
  const status=
    document.getElementById(
      "human-review-note-status"
    );

  const draft=
    readHumanReviewLocalDraft();

  if (field) {
    field.value=draft.note;
  }
  if (stateField) {
    stateField.value=
      draft.state;
  }

  if (status) {
    const label=
      HUMAN_REVIEW_STATE_LABELS[
        draft.state
      ];
    status.textContent=
      (
        draft.state !== "none"
        || draft.note
      )
        ? localizedMessage("admin.local_draft", {state:localizedMessage(label)})
        : localizedMessage("admin.no_local_decision");
  }
}

function saveHumanReviewLocalNote() {
  const field=
    document.getElementById(
      "human-review-decision-note"
    );
  const stateField=
    document.getElementById(
      "human-review-decision-state"
    );
  const status=
    document.getElementById(
      "human-review-note-status"
    );

  const state=
    Object.prototype
      .hasOwnProperty.call(
        HUMAN_REVIEW_STATE_LABELS,
        stateField?.value
      )
      ? stateField.value
      : "none";

  const draft={
    state,
    note:
      field?.value.trim()
      || "",
    updated_at_ms:
      Date.now(),
    local_only:true,
    canonical_balance_changed:
      false,
  };

  try {
    localStorage.setItem(
      HUMAN_REVIEW_NOTE_KEY,
      JSON.stringify(
        draft
      )
    );
    if (status) {
      status.textContent=
        localizedMessage("admin.review_saved_local", {state:localizedMessage(HUMAN_REVIEW_STATE_LABELS[state])});
    }
  } catch (_error) {
    if (status) {
      status.textContent=
        "Yerel inceleme kaydedilemedi";
    }
  }
}

  async function loadHumanReviewQueue() {
    try {
      const response=
        await fetch(
          `/telemetry/balance-human-review?player_id=${encodeURIComponent(participantPlayerId)}`
        );
      if (!response.ok) {
        throw new Error(
          localizedMessage("admin.queue_unavailable")
        );
      }
      const queue=
        await response.json();
      renderHumanReviewQueue(
        queue
      );
      loadHumanReviewEvidence();
      return {
        ok:true,
        queue,
      };
    } catch (error) {
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  function renderCumulativeManualReport(
    report
  ) {
    if (!report) return;

    const set=(id,value)=>{
      const el=document.getElementById(id);
      if (el) el.textContent=String(value);
    };

    set(
      "balance-review-progress",
      localizedMessage("admin.real_match_progress", {current:localizedNumber(report.battle_count || 0), required:localizedNumber(report.minimum_battles || 3)})
    );

    const route=
      report.generator_route || {};
    const visits=
      route.visits || {};

    set("gate-use-north",visits.north || 0);
    set("gate-use-east",visits.east || 0);
    set("gate-use-south",visits.south || 0);
    set("gate-use-west",visits.west || 0);

    const routeSummary=
      document.getElementById(
        "generator-route-summary"
      );
    if (routeSummary) {
      if ((route.move_count || 0) <= 0) {
        routeSummary.textContent=
        localizedMessage("admin.no_route_changes");
      } else {
        routeSummary.textContent=
          localizedMessage("admin.route_summary", {moves:localizedNumber(route.move_count), gate:route.preferred_gate_label || "-", modules:localizedNumber(route.average_connected_modules_after_move || 0), cells:localizedNumber(route.average_powered_special_cells_after_move || 0)});
      }
    }

    const list=
      document.getElementById(
        "balance-review-candidates"
      );
    if (list) {
      list.innerHTML="";
      for (
        const candidate
        of report.review_candidates || []
      ) {
        const li=
          document.createElement(
            "li"
          );
        li.className=
          `balance-candidate ${candidate.severity || "observe"}`;

        const title=
          document.createElement(
            "strong"
          );
        title.textContent=
          candidate.label || candidate.area;

        const reason=
          document.createElement(
            "span"
          );
        reason.textContent=
          candidate.reason || "";

        li.append(
          title,
          reason
        );

        if (candidate.suggestion) {
          const suggestion=
            document.createElement(
              "small"
            );
          suggestion.textContent=
            candidate.suggestion;
          li.appendChild(
            suggestion
          );
        }

        list.appendChild(li);
      }
    }

    const balanceStatus=
      document.getElementById(
        "local-report-balance-status"
      );
    if (balanceStatus) {
      const archetypeEntries=Object.entries(report.ai_archetypes || {});
      const archetypeSummary=archetypeEntries.length
        ? archetypeEntries
            .map(([id,value]) => localizedMessage("admin.archetype_match_count", {name:aiArchetypeName(id), count:localizedNumber(value.battle_count || 0)}))
            .join(" · ")
        : localizedMessage("admin.no_archetype_data");
      if (
        report.status
        === "review_ready"
      ) {
        balanceStatus.textContent=
          localizedMessage("admin.balance_review_ready", {archetypes:archetypeSummary});
      } else {
        balanceStatus.textContent=
          localizedMessage("admin.balance_review_waiting", {remaining:localizedNumber(report.battles_remaining || 0), archetypes:archetypeSummary});
      }
    }
  }

  async function loadCumulativeManualReport() {
    try {
      const response=
        await fetch(
          `/telemetry/manual-battle-report?player_id=${encodeURIComponent(participantPlayerId)}`
        );

      if (!response.ok) {
        throw new Error(
          localizedMessage("admin.manual_report_unavailable")
        );
      }

      const report=
        await response.json();

      renderCumulativeManualReport(
        report
      );
      loadBalanceDraft();

      return {
        ok:true,
        report,
      };
    } catch (error) {
      const status=
        document.getElementById(
          "local-report-balance-status"
        );
      if (status) {
        status.textContent=
          localizedMessage("admin.cumulative_report_unavailable");
      }
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  function renderLocalBattleReport() {
    const panel=document.getElementById("local-battle-report");
    if (!panel || !localBattleMetrics) return;

    panel.hidden=!localBattleFinished;
    if (!localBattleFinished) return;

    const set=(id,value)=>{
      const el=document.getElementById(id);
      if (el) el.textContent=String(value);
    };

    set("local-report-duration",
      localizedMessage("time.seconds_short", {count:localizedNumber(localBattleMetrics.duration_ms / 1000, {minimumFractionDigits:1, maximumFractionDigits:1})}));
    set("local-report-result",
      localizedMessage(localBattleMetrics.won ? "battle.win" : "battle.loss"));
    set("local-report-credits",
      localizedMessage("currency.current", {amount:localizedNumber(localBattleMetrics.credits_spent)}));
    set("local-report-forfeit-penalty",
      localizedMessage("currency.current", {amount:localizedNumber(localBattleMetrics.forfeit_credit_penalty || 0)}));
    set("local-report-generator-moves",
      localBattleMetrics.generator_moves);
    set("local-report-damage-dealt",
      localBattleMetrics.damage_dealt);
    set("local-report-damage-received",
      localBattleMetrics.damage_received);
    set("local-report-shield",
      localBattleMetrics.shield_mitigated);
    set("local-report-module-changes",
      localBattleMetrics.module_changes);
    set("local-report-ai-archetype",
      aiArchetypeName(localBattleMetrics.ai_archetype || activeLocalAiArchetype));

    const status=document.getElementById("local-report-balance-status");
    if (status) {
      status.textContent=
        localizedMessage("admin.match_recorded");
    }
  }

  function stopLocalServerPolling() {
    if (
      localServerSyncTimer
      !== null
    ) {
      window.clearInterval(
        localServerSyncTimer
      );
      localServerSyncTimer=null;
    }
  }

  function clientModuleForDefinitionId(
    definitionId
  ) {
    return [
      ...client.modules.values(),
    ].find(
      (module) =>
        (module.definitionId || clientDefinitionId(module.instanceId))
          === definitionId
    ) || null;
  }

  function ensureClientModuleForServer(serverModule) {
    if (!serverModule?.instance_id) return null;
    const exact = client.modules.get(serverModule.instance_id);
    if (exact) return exact;
    if (serverModule.definition_id === "core") {
      return client.modules.get("core-1") || null;
    }
    if (serverModule.definition_id === "generator") {
      return client.modules.get("generator-1") || null;
    }
    const template = clientModuleForDefinitionId(serverModule.definition_id);
    if (!template) return null;
    return client.registerModule({
      ...template,
      instanceId:String(serverModule.instance_id),
      definitionId:String(serverModule.definition_id),
      isDeckTemplate:false,
      hp:Number(serverModule.hp ?? template.maxHp),
      maxHp:Number(serverModule.max_hp ?? template.maxHp),
      status:serverModule.status || "active",
      position:
        serverModule.x === null || serverModule.y === null
          ? null
          : {x:Number(serverModule.x), y:Number(serverModule.y)},
    });
  }

  function localServerClientModuleId(
    serverModule
  ) {
    return ensureClientModuleForServer(serverModule)?.instanceId || null;
  }

  function serverModuleDomId(
    playerId,
    serverModule
  ) {
    if (!serverModule) return null;
    if (playerId === participantPlayerId) {
      return localServerClientModuleId(serverModule);
    }
    if (serverModule.definition_id === "core") {
      return "enemy-core";
    }
    if (serverModule.definition_id === "generator") {
      return "enemy-generator";
    }
    return serverModule.instance_id
      ? `enemy-${serverModule.instance_id}`
      : null;
  }

  function findSnapshotModule(
    snapshot,
    playerId,
    moduleId
  ) {
    const player = snapshot?.players?.[playerId];
    return (player?.modules || []).find(
      (module) => module.instance_id === moduleId
    ) || null;
  }

  function recordModuleAnchor(
    moduleId,
    element
  ) {
    if (
      !moduleId
      || !element
      || typeof element.getBoundingClientRect !== "function"
    ) {
      return;
    }
    const rect = element.getBoundingClientRect();
    moduleAnchorRects.set(String(moduleId), {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      capturedAt: Date.now(),
    });
  }

  function resolveModuleAnchor(
    moduleId,
    { core=false }={}
  ) {
    let target = document.querySelector(
      `[data-module-id="${moduleId}"]`
    );
    if (!target && core) {
      target = document.querySelector(
        String(moduleId || "").startsWith("enemy-")
          ? ".duel-enemy-side .core-cell"
          : ".duel-player-side .core-cell"
      );
    }
    if (
      target
      && typeof target.getBoundingClientRect === "function"
    ) {
      recordModuleAnchor(moduleId, target);
      return target.getBoundingClientRect();
    }
    return moduleAnchorRects.get(String(moduleId)) || null;
  }

  function setBattleLiveTicker(
    message,
    kind="neutral"
  ) {
    if (!battleLiveTickerEl || !message) {
      return;
    }
    battleLiveTickerEl.textContent = message;
    battleLiveTickerEl.dataset.kind = kind;
    battleLiveTickerEl.classList.remove("pulse");
    void battleLiveTickerEl.offsetWidth;
    battleLiveTickerEl.classList.add("pulse");
    window.clearTimeout(battleLiveTickerTimer);
    battleLiveTickerTimer = window.setTimeout(() => {
      battleLiveTickerEl.classList.remove("pulse");
      if (!localBattleFinished) {
        battleLiveTickerEl.textContent = "Devreler çalışıyor · etkiler modüllerin üzerinde görünür.";
        battleLiveTickerEl.dataset.kind = "neutral";
      }
    }, 2100);
  }

  function parseFloatingFeedbackText(text) {
    const match = String(text || "").trim().match(/^([+-]?)(\d+(?:[.,]\d+)?)(%)?(?:\s+(.+))?$/u);
    if (!match) return null;
    const sign = match[1] === "-" ? -1 : 1;
    const numeric = Number(match[2].replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    return {
      amount: sign * numeric,
      explicitSign: Boolean(match[1]),
      percent: Boolean(match[3]),
      suffix: match[4] || "",
    };
  }

  function formatFloatingFeedbackAmount(
    amount,
    suffix,
    { explicitSign=true, percent=false }={}
  ) {
    const rounded = Math.round(Number(amount) * 10) / 10;
    const prefix = rounded > 0 && explicitSign ? "+" : "";
    const unit = percent ? "%" : "";
    const numeric = `${prefix}${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${unit}`;
    return suffix ? `${numeric} ${suffix}` : numeric;
  }

  function updateFloatingFeedbackImportance(chip, amount) {
    const magnitude = Math.abs(Number(amount || 0));
    const scale = Math.min(1.12, 0.88 + Math.log10(magnitude + 1) * 0.10);
    chip.style.setProperty("--feedback-scale", scale.toFixed(3));
    chip.dataset.impact = magnitude >= 30
      ? "large"
      : (magnitude >= 10 ? "medium" : "small");
  }

  function removeFloatingFeedbackRecord(effectId) {
    const record = floatingFeedbackLive.get(effectId);
    if (!record) return false;
    window.clearTimeout(record.removalTimer);
    record.chip?.remove?.();
    floatingFeedbackLive.delete(effectId);
    battleEffectAggregator?.release?.(effectId);
    return true;
  }

  function scheduleFloatingFeedbackRemoval(effectId, lifetimeMs=1240) {
    const record = floatingFeedbackLive.get(effectId);
    if (!record) return;
    window.clearTimeout(record.removalTimer);
    record.removalTimer = window.setTimeout(
      () => removeFloatingFeedbackRecord(effectId),
      lifetimeMs
    );
  }

  function emitFloatingBattleFeedback(
    moduleId,
    text,
    variant="neutral",
    { core=false }={}
  ) {
    if (!FLOATING_COMBAT_TEXT_ENABLED) {
      return false;
    }
    const layer = document.getElementById(
      "battle-effect-layer"
    );
    const anchor = resolveModuleAnchor(
      moduleId,
      { core }
    );
    if (
      !layer
      || !anchor
      || typeof layer.getBoundingClientRect !== "function"
      || !text
    ) {
      return false;
    }

    const layerRect = layer.getBoundingClientRect();
    const parsed = parseFloatingFeedbackText(text);
    const semanticKey = parsed
      ? `${parsed.percent ? "percent" : "value"}:${parsed.suffix}`
      : String(text);
    const eventResult = emitBattleEvent(
      battleEventChannels.GAME_EFFECT,
      {
        targetId:moduleId,
        variant,
        semanticKey,
        amount:parsed?.amount ?? null,
        text,
        metadata:{
          suffix:parsed?.suffix ?? null,
          explicitSign:parsed?.explicitSign ?? false,
          percent:parsed?.percent ?? false,
        },
      }
    ).results[0] || {
      id:`battle-effect-fallback-${Date.now()}`,
      mode:"created",
      lane:0,
      amount:parsed?.amount ?? null,
      text,
      metadata:{
        suffix:parsed?.suffix ?? null,
        explicitSign:parsed?.explicitSign ?? false,
        percent:parsed?.percent ?? false,
      },
      expiredRecordIds:[],
      replacedRecordId:null,
    };

    for (const effectId of eventResult.expiredRecordIds || []) {
      removeFloatingFeedbackRecord(effectId);
    }
    if (eventResult.replacedRecordId) {
      removeFloatingFeedbackRecord(eventResult.replacedRecordId);
    }

    const existing = floatingFeedbackLive.get(eventResult.id);
    if (existing?.chip?.isConnected) {
      existing.chip.textContent = Number.isFinite(eventResult.amount)
        ? formatFloatingFeedbackAmount(
            eventResult.amount,
            eventResult.metadata?.suffix || parsed?.suffix || "",
            {
              explicitSign:Boolean(eventResult.metadata?.explicitSign),
              percent:Boolean(eventResult.metadata?.percent),
            }
          )
        : eventResult.text;
      updateFloatingFeedbackImportance(existing.chip, eventResult.amount ?? 0);
      existing.chip.classList.remove("stacked");
      void existing.chip.offsetWidth;
      existing.chip.classList.add("stacked");
      scheduleFloatingFeedbackRemoval(eventResult.id);
      return true;
    }

    const chip = document.createElement("span");
    chip.className = `battle-floating-feedback ${variant}`;
    chip.dataset.effectId = eventResult.id;
    chip.dataset.lane = String(eventResult.lane || 0);
    chip.style.setProperty(
      "--feedback-lane-offset",
      `${Math.max(0, Number(eventResult.lane || 0)) * 14}px`
    );
    chip.textContent = Number.isFinite(eventResult.amount)
      ? formatFloatingFeedbackAmount(
          eventResult.amount,
          eventResult.metadata?.suffix || parsed?.suffix || "",
          {
            explicitSign:Boolean(eventResult.metadata?.explicitSign),
            percent:Boolean(eventResult.metadata?.percent),
          }
        )
      : eventResult.text;
    updateFloatingFeedbackImportance(chip, eventResult.amount ?? 0);
    chip.style.left = `${anchor.left + anchor.width / 2 - layerRect.left}px`;
    chip.style.top = `${anchor.top + Math.max(16, anchor.height * 0.28) - layerRect.top}px`;
    layer.appendChild(chip);

    floatingFeedbackLive.set(eventResult.id, {
      chip,
      removalTimer:null,
    });
    scheduleFloatingFeedbackRemoval(eventResult.id);
    return true;
  }

  function emitServerModuleFeedback(
    snapshot,
    playerId,
    moduleId,
    text,
    variant="neutral"
  ) {
    const serverModule = findSnapshotModule(
      snapshot,
      playerId,
      moduleId
    );
    if (!serverModule) {
      return false;
    }
    const moduleDomId=serverModuleDomId(playerId, serverModule);
    const feedbackKind={
      damage:"hit",
      attack:"hit",
      heal:"heal",
      cool:"cool",
      energy:"energy",
      defense:"shield",
      boost:"boost",
      reflect:"reflect",
      sabotage:"sabotage",
      warning:"warning",
    }[variant] || "status";
    const pulsed=pulseBattleFx(moduleDomId,feedbackKind);
    const emitted = emitFloatingBattleFeedback(
      moduleDomId,
      text,
      variant,
      { core: serverModule.definition_id === "core" }
    );
    if (pulsed || emitted) {
      const tickerKind = variant === "damage" ? "danger" : variant;
      setBattleLiveTicker(
        localizedMessage("battle.module_ticker", {name:localizedUiText(serverModule.name_tr || "Modül"), text:localizedUiText(text)}),
        tickerKind
      );
    }
    return pulsed || emitted;
  }

  function emitServerModuleDestruction(
    playerId,
    serverModule
  ) {
    if (!playerId || !serverModule?.instance_id) {
      return false;
    }
    const key = `${playerId}:${serverModule.instance_id}`;
    if (destructionFxPlayed.has(key)) {
      return false;
    }
    destructionFxPlayed.add(key);
    return emitModuleExplosion(
      serverModuleDomId(playerId, serverModule),
      { core: serverModule.definition_id === "core" }
    );
  }

  function processSnapshotDestructionFx(snapshot) {
    for (const player of Object.values(snapshot?.players || {})) {
      for (const module of player.modules || []) {
        const key = `${player.player_id}:${module.instance_id}`;
        const hp = Number(module.hp || 0);
        const previousHp = snapshotModuleHp.get(key);
        if (previousHp > 0 && hp <= 0) {
          emitServerModuleDestruction(player.player_id, module);
        }
        snapshotModuleHp.set(key, hp);
      }
    }
  }

  function corePowerEffect(powerId) {
    if (powerId === "core_disruptor") return "sabotage";
    if (powerId === "core_overdrive") return "attack";
    if (powerId === "core_guardian") return "defense";
    if (powerId === "core_capacitor") return "energy";
    if (powerId === "core_quantum") return "hybrid";
    return "heal";
  }

  function coreEffectFeedback(effectKind, value, unit="") {
    const numericValue = Math.max(0, Number(value || 0));
    const rounded = Math.round(numericValue * 10) / 10;
    const rendered = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    if (effectKind === "defense") return { text:rendered, variant:"defense" };
    if (effectKind === "sabotage") return { text:`-${rendered}`, variant:"sabotage" };
    if (effectKind === "attack") return { text:`+${rendered}${unit || "%"}`, variant:"attack" };
    return { text:`+${rendered}${unit}`, variant:"energy" };
  }

  function presentCorePowerActivation(snapshot, data) {
    const waveEffect = data.effect_kind || corePowerEffect(data.power_id);
    const affectedTargets = Array.isArray(data.affected_targets)
      ? data.affected_targets
      : (data.affected_module_ids || []).map((moduleId) => ({
          player_id:data.player_id,
          module_id:moduleId,
        }));
    const wavePlayerId = waveEffect === "sabotage"
      ? (affectedTargets[0]?.player_id || data.player_id)
      : data.player_id;
    const waveBoard = wavePlayerId === participantPlayerId ? board : enemyBoard;
    if (waveBoard) waveBoard.dataset.coreWaveEffect = waveEffect;
    waveBoard?.classList.add("core-wave");
    window.setTimeout(() => {
      waveBoard?.classList.remove("core-wave");
      delete waveBoard?.dataset.coreWaveEffect;
    }, 900);
    if (waveEffect === "sabotage") {
      const sourceId = data.player_id === participantPlayerId ? "core-1" : "enemy-core";
      const targetId = data.player_id === participantPlayerId ? "enemy-core" : "core-1";
      emitDuelAttackEffect(sourceId, targetId, "core-sabotage", "core_disruptor");
    }
    const coreModule = findSnapshotModule(
      snapshot,
      data.player_id,
      data.target_module_id || data.module_id
    );
    const feedbackKind = waveEffect === "sabotage"
      ? "sabotage"
      : waveEffect === "attack"
        ? "hit"
        : waveEffect === "defense"
          ? "shield"
          : waveEffect === "energy"
            ? "energy"
            : "heal";
    if (coreModule) {
      pulseBattleFx(serverModuleDomId(data.player_id, coreModule), feedbackKind);
    }
    for (const target of affectedTargets) {
      const affectedModule = findSnapshotModule(snapshot, target.player_id, target.module_id);
      if (!affectedModule) continue;
      pulseBattleFx(serverModuleDomId(target.player_id, affectedModule), feedbackKind);
    }
    setBattleLiveTicker(localizedMessage("battle.core_power_spread", {name:localizedUiText(coreModule?.name_tr || "Çekirdek")}), waveEffect);
  }

  function presentBattleEmoji(playerId, emojiId) {
    const emoji = BATTLE_EMOJIS.find((item) => item.id === emojiId);
    if (!emoji || emoji.id === "none") return;
    const targetBoard = playerId === participantPlayerId ? board : enemyBoard;
    if (!targetBoard) return;
    const bubble = document.createElement("div");
    bubble.className = "battle-emoji-bubble";
    bubble.appendChild(createBattleEmojiVisual(emoji));
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-label", localizedUiText(emoji.nameTr));
    targetBoard.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 1900);
  }

  function processLocalServerEvents(
    events,
    snapshot
  ) {
    for (const event of events || []) {
      const data=event.data || {};
      if (event?.type === "battle_emoji") {
        presentBattleEmoji(data.player_id, data.emoji_id);
        continue;
      }
      if (event?.type === "battle_overtime_started") {
        setBattleLiveTicker(
          "AŞIRI YÜK · Hasar artıyor, onarım zayıflıyor",
          "danger"
        );
        triggerGridshardCue("warning");
        continue;
      }
      if (
        event?.type === "command_rejected"
        && data.player_id === participantPlayerId
      ) {
        logClientMessage(localizedMessage("battle.command_rejected"));
        continue;
      }
      if (
        event?.type === "battle_forfeited"
        && data.player_id === participantPlayerId
      ) {
        const penalty = Math.max(
          0,
          Number(data.credit_penalty || 0)
        );
        const remainingCredits = Math.max(
          0,
          Number(
            data.remaining_circuit_credits
            ?? client.circuitCredits
          )
        );
        client.applyServerEconomyState({
          circuitCredits:remainingCredits,
        });
        if (localBattleMetrics) {
          localBattleMetrics.forfeit_credit_penalty =
            penalty;
        }
        renderCredits();
        setBattleLiveTicker(
          localizedMessage("battle.forfeit_penalty", {penalty:localizedNumber(penalty)}),
          "danger"
        );
        continue;
      }
      if (
        event?.type === "modules_swapped"
        && data.player_id === participantPlayerId
      ) {
        logClientMessage("İki aktif modül yer değiştirdi.");
        continue;
      }
      if (
        event?.type === "core_power_ready"
        && data.player_id === participantPlayerId
      ) {
        corePowerCharge=100;
        corePowerReady=true;
        renderCorePowerControl();
        triggerGridshardCue("energy_transfer");
        setBattleLiveTicker("Çekirdek gücü hazır", "boost");
        continue;
      }
      if (event?.type === "core_power_activated") {
        const visualKey = `${data.player_id}:${data.request_id || data.power_id}`;
        preparedCorePowerFx.add(visualKey);
        presentCorePowerActivation(snapshot, data);
        continue;
      }
      if (event?.type === "core_power_used") {
        const visualKey = `${data.player_id}:${data.request_id || data.power_id}`;
        if (!preparedCorePowerFx.delete(visualKey)) {
          presentCorePowerActivation(snapshot, data);
        }
        if (data.player_id === participantPlayerId) {
          corePowerCharge=0;
          corePowerReady=false;
          corePowerTargeting=false;
          renderCorePowerControl();
        }
        triggerGridshardCue("shield_activate");
        continue;
      }
      if (event?.type === "module_damaged") {
        const damage = Math.max(0, Math.round(Number(data.damage || 0)));
        if (damage > 0) {
          const sourceModule = findSnapshotModule(
            snapshot,
            data.source_player_id,
            data.source_module_id
          );
          emitServerModuleFeedback(
            snapshot,
            data.player_id,
            data.module_id,
            `-${damage}`,
            sourceModule?.category === "sabotaj" ? "sabotage" : "damage"
          );
        }
        continue;
      }
      if (event?.type === "damage_reflected") {
        const reflectedTarget = findSnapshotModule(
          snapshot,
          data.target_player_id,
          data.target_module_id || data.module_id
        );
        if (reflectedTarget) {
          pulseBattleFx(serverModuleDomId(data.target_player_id, reflectedTarget), "reflect");
        }
        continue;
      }
      if (event?.type === "module_repaired") {
        const repair = Math.max(0, Math.round(Number(data.repair || 0)));
        if (repair > 0) {
          const feedback = () => emitServerModuleFeedback(
              snapshot,
              data.target_player_id || data.player_id,
              data.target_module_id || data.module_id,
              `+${repair}`,
              "heal"
            );
          const sourceModule = findSnapshotModule(
            snapshot,
            data.player_id,
            data.source_module_id
          );
          if (sourceModule?.definition_id === "core") {
            window.setTimeout(feedback, 170);
          } else {
            feedback();
          }
        }
        continue;
      }
      if (event?.type === "core_effect_applied") {
        const feedback = coreEffectFeedback(
          data.effect_kind,
          data.value,
          data.unit || ""
        );
        if (Number(data.value || 0) > 0) {
          window.setTimeout(() => emitServerModuleFeedback(
            snapshot,
            data.target_player_id || data.player_id,
            data.target_module_id || data.module_id,
            feedback.text,
            feedback.variant
          ), 170);
        }
        continue;
      }
      if (event?.type === "module_contribution") {
        const value = Math.max(0, Number(data.value || 0));
        if (value <= 0) {
          continue;
        }
        const category = String(data.category || "").toLocaleLowerCase("tr");
        const unit = String(data.unit || "").toLocaleLowerCase("tr");
        const rounded = Math.round(value * 10) / 10;
        const variants = {
          enerji:"energy",
          sistem:"energy",
          destek:"heal",
          savunma:"defense",
          sabotaj:"sabotage",
        };
        const contributionKind = String(data.contribution_kind || "");
        const variant = contributionKind === "cooldown_reduction"
          ? "cool"
          : (variants[category] || "neutral");
        const explicitSign = !["savunma", "sabotaj"].includes(category);
        const sign = category === "sabotaj" ? "-" : (explicitSign ? "+" : "");
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id || data.player_id,
          data.target_module_id || data.source_module_id,
          `${sign}${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${unit === "percent" ? "%" : ""}`,
          variant
        );
        continue;
      }
      if (event?.type === "module_cooled") {
        const heatBefore = Number(data.heat_before || 0);
        const heatAfter = Number(data.heat_after || 0);
        const reduced = Math.max(0, Math.round((heatBefore - heatAfter) * 10) / 10);
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          `-${reduced}`,
          "cool"
        );
        continue;
      }
      if (event?.type === "module_overclocked") {
        // Gerçek güç/hız yüzdesi saldırı gerçekleştiğinde sunucunun
        // module_contribution olayıyla gösterilir.
        continue;
      }
      if (event?.type === "attack_support_applied") {
        if (Array.isArray(data.contributions) && data.contributions.length > 0) {
          continue;
        }
        const supportBits = [];
        if (Number(data.damage_multiplier || 1) > 1) {
          supportBits.push(localizedMessage("battle.power_boost", {percent:localizedNumber(Math.round((Number(data.damage_multiplier || 1) - 1) * 100))}));
        }
        if (Number(data.cooldown_multiplier || 1) < 1) {
          supportBits.push(localizedMessage("battle.speed_boost", {percent:localizedNumber(Math.round((1 - Number(data.cooldown_multiplier || 1)) * 100))}));
        }
        if (data.targeting_active) {
          supportBits.push("+HEDEFLEME");
        }
        if (data.overclock_active && supportBits.length === 0) {
          supportBits.push("Destek");
        }
        if (supportBits.length > 0) {
          emitServerModuleFeedback(
            snapshot,
            data.player_id,
            data.module_id,
            localizedMessage("battle.support_effects", {effects:supportBits.join(" · ")}),
            "boost"
          );
        }
        continue;
      }
      if (event?.type === "booster_applied") {
        let boosterText = "Güçlendirildi";
        let boosterVariant = "boost";
        if (data.booster_id === "emergency_repair") {
          boosterVariant = "heal";
          const repair = Math.max(0, Math.round(Number(data.hp_after || 0) - Number(data.hp_before || 0)));
          boosterText = repair > 0 ? `+${localizedNumber(repair)}` : localizedMessage("battle.emergency_repair");
        } else if (data.booster_id === "overcharge_chip") {
          boosterText = "+25% GÜÇ · AŞIRI YÜK";
        } else if (data.booster_id === "cooling_burst") {
          boosterVariant = "cool";
          boosterText = "ISI SIFIRLANDI · SOĞUTMA";
        } else if (data.booster_id === "signal_cleanser") {
          boosterVariant = "sabotage";
          boosterText = "SABOTAJ TEMİZLENDİ";
        }
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          boosterText,
          boosterVariant
        );
        continue;
      }
      if (event?.type === "sabotage_applied") {
        if (data.contribution_event_emitted) {
          continue;
        }
        const durationSeconds = Math.max(
          0,
          Math.round(Number(data.duration_ms || 0) / 100) / 10
        );
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          `-${durationSeconds}`,
          "sabotage"
        );
        continue;
      }
      if (event?.type === "sabotage_blocked") {
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          "SABOTAJ ENGELLENDİ · BARİYER",
          "defense"
        );
        continue;
      }
      if (event?.type === "sabotage_cleansed") {
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          "SABOTAJ TEMİZLENDİ · DESTEK",
          data.cleanser === "cooler" ? "cool" : "heal"
        );
        continue;
      }
      if (event?.type === "sabotage_duration_reduced") {
        const reductionSeconds = Math.max(0, Math.round(Number(data.reduction_ms || 0) / 100) / 10);
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          `-${reductionSeconds}`,
          "cool"
        );
        continue;
      }
      if (event?.type === "attack_skipped_unpowered") {
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.module_id,
          "ENERJİ KESİLDİ",
          "sabotage"
        );
        continue;
      }
      if (event?.type === "support_skipped_jammed") {
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.module_id,
          "SİNYAL BOZULDU · DESTEK DURDU",
          "sabotage"
        );
        continue;
      }
      if (event?.type === "module_overheated" || event?.type === "attack_skipped_overheated") {
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.module_id,
          "AŞIRI ISI!",
          "warning"
        );
        continue;
      }
      if (event?.type === "module_destroyed") {
        const owner = snapshot.players?.[data.player_id];
        const destroyedModule = owner?.modules?.find(
          (module) => module.instance_id === data.module_id
        );
        emitServerModuleDestruction(
          data.player_id,
          destroyedModule
        );
        setBattleLiveTicker(
          localizedMessage("battle.module_destroyed", {name:localizedUiText(destroyedModule?.name_tr || "Modül")}),
          "danger"
        );
        continue;
      }
      if (
        event?.type
        !== "attack_performed"
      ) {
        continue;
      }

      const attackerIsPlayer=
        data.attacker_player_id
        === participantPlayerId;
      const sourcePlayer=
        snapshot.players?.[
          data.attacker_player_id
        ];
      const targetPlayer=
        snapshot.players?.[
          data.target_player_id
        ];
      const sourceModule=
        sourcePlayer?.modules?.find(
          (module) =>
            module.instance_id
            === data.attacker_module_id
        );
      const targetModule=
        targetPlayer?.modules?.find(
          (module) =>
            module.instance_id
            === data.target_module_id
        );
      const defenseType=String(
        data.defense_type || ""
      ).trim().toLocaleLowerCase("tr");
      const defended=
        Boolean(defenseType)
        && ![
          "none",
          "yok",
        ].includes(defenseType);
      if (
        !data.attacker_player_id
        || !data.target_player_id
        || data.attacker_player_id
          === data.target_player_id
      ) {
        continue;
      }

      const preventedDamage = Math.max(0, Math.round(Number(data.reduced_damage || 0)));
      if (preventedDamage > 0 && !data.contribution_event_emitted) {
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          `${preventedDamage}`,
          "defense"
        );
      }

      const sourceId=
        attackerIsPlayer
          ? localServerClientModuleId(
              sourceModule
            )
          : serverModuleDomId(
              data.attacker_player_id,
              sourceModule
            );
      const targetId=
        attackerIsPlayer
          ? serverModuleDomId(
              data.target_player_id,
              targetModule
            )
          : localServerClientModuleId(
              targetModule
            );

      const travelMs=emitDuelAttackEffect(
        sourceId,
        targetId,
        defended
          ? "shield"
          : (
              attackerIsPlayer
                ? "attack"
                : "enemy"
            ),
        sourceModule?.definition_id
      );

      triggerGridshardCue(
        weaponCue(
          sourceModule?.definition_id
        )
      );
      scheduleAttackImpactCue({
        defended,
        targetDefinitionId:
          targetModule?.definition_id,
        travelMs,
      });
    }
  }

  function applyEnemyServerSnapshot(
    snapshot
  ) {
    const enemy=Object.values(
      snapshot?.players || {}
    ).find(
      (item) =>
        item.player_id
        !== participantPlayerId
    );
    if (!enemy) {
      return false;
    }
    enemyBattlePlayerId = String(
      enemy.player_id || ""
    ) || null;
    enemyBattleDisplayName = String(
      enemy.display_name || ""
    ).trim();
    if (
      Array.isArray(enemy.battle_pool_ids)
      && enemy.battle_pool_ids.length
    ) {
      enemyBattlePoolDefinitionIds = [
        ...enemy.battle_pool_ids,
      ].slice(0,6);
    }
    enemyCellDebris = Array.isArray(enemy.cell_debris)
      ? enemy.cell_debris
      : [];

    const enemyCore=
      (enemy.modules || []).find(
        (module) =>
          module.definition_id
          === "core"
      );
    const enemyGenerator=
      (enemy.modules || []).find(
        (module) =>
          module.definition_id
          === "generator"
      );
    mockEnemyCoreHp=Number(
      enemyCore?.hp || 0
    );
    mockEnemyGeneratorHp=Number(
      enemyGenerator?.hp || 0
    );
    mockEnemyGeneratorPower={
      isPowered:Boolean(
        enemyGenerator?.is_powered
      ),
      energyReceived:Number(
        enemyGenerator?.energy_received || 0
      ),
      energyRequired:Number(
        enemyGenerator?.energy_required || 0
      ),
      powerReason:
        enemyGenerator?.power_reason,
      heat:Number(enemyGenerator?.heat || 0),
      debuffs:Array.isArray(enemyGenerator?.debuffs) ? enemyGenerator.debuffs : [],
      temporaryBoosters:Array.isArray(enemyGenerator?.temporary_boosters) ? enemyGenerator.temporary_boosters : [],
    };
    if (
      Number.isFinite(
        Number(enemyGenerator?.x)
      )
      && Number.isFinite(
        Number(enemyGenerator?.y)
      )
    ) {
      mockEnemyGeneratorPosition={
        x:Number(enemyGenerator.x),
        y:Number(enemyGenerator.y),
      };
    }
    mockEnemyModules=(
      enemy.modules || []
    )
      .filter(
        (module) =>
          ![
            "core",
            "generator",
          ].includes(
            module.definition_id
          )
          && module.status
            === "active"
          && module.x !== null
          && module.y !== null
      )
      .map(
        (module) => ({
          id:`enemy-${module.instance_id}`,
          definitionId:
            module.definition_id,
          name:module.name_tr,
          hp:Number(module.hp || 0),
          maxHp:Number(
            module.max_hp || 1
          ),
          position:{
            x:Number(module.x),
            y:Number(module.y),
          },
          kind:
            module.category
            || "module",
          isPowered:Boolean(
            module.is_powered
          ),
          energyReceived:Number(
            module.energy_received || 0
          ),
          energyRequired:Number(
            module.energy_required || 0
          ),
          powerReason:
            module.power_reason,
          heat:Number(module.heat || 0),
          debuffs:Array.isArray(module.debuffs) ? module.debuffs : [],
          temporaryBoosters:Array.isArray(module.temporary_boosters) ? module.temporary_boosters : [],
        })
      );
    mockEnemyModuleHp=
      enemyLivingModules().reduce(
        (sum,module) =>
          sum + module.hp,
        0
      );
    return true;
  }

  function syncOnlineServerBattle(
    message
  ) {
    if (
      !message
      || activePlayMode !== "online"
    ) {
      return false;
    }

    const payload=message.payload || {};
    const snapshot=
      message.type === "snapshot"
        ? payload
        : (
            payload.snapshot
            || pvpState.snapshot
          );
    if (
      !snapshot?.players
    ) {
      return false;
    }

    const ownPlayer = snapshot.players[participantPlayerId];
    syncBoosterOfferFromSnapshot(ownPlayer);
    syncCorePowerFromSnapshot(ownPlayer);
    if (ownPlayer) {
      playerCellDebris = Array.isArray(ownPlayer.cell_debris)
        ? ownPlayer.cell_debris
        : [];
      client.updateElapsedMs(Number(snapshot.elapsed_ms || 0));
      client.applyServerEconomyState({
        circuitCredits:Number(ownPlayer.circuit_credits || 0),
      });
      for (const serverModule of ownPlayer.modules || []) {
        const clientModuleId = localServerClientModuleId(serverModule);
        if (!clientModuleId) continue;
        client.applyServerModuleState({
          instanceId:clientModuleId,
          hp:Number(serverModule.hp || 0),
          status:serverModule.status,
          position:
            serverModule.x === null || serverModule.y === null
              ? null
              : {x:Number(serverModule.x), y:Number(serverModule.y)},
          isPowered:Boolean(serverModule.is_powered),
          powerReason:serverModule.power_reason,
          energyReceived:Number(serverModule.energy_received || 0),
          energyRequired:Number(serverModule.energy_required || 0),
          heat:Number(serverModule.heat || 0),
          debuffs:Array.isArray(serverModule.debuffs) ? serverModule.debuffs : [],
          temporaryBoosters:Array.isArray(serverModule.temporary_boosters) ? serverModule.temporary_boosters : [],
        });
      }
      client.clearPendingPlacements();
    }

    const events=
      message.type === "events"
      || message.type
        === "reconnect_state"
        ? payload.events || []
        : [];
    processLocalServerEvents(
      events,
      snapshot
    );
    processSnapshotDestructionFx(
      snapshot
    );
    if (!applyEnemyServerSnapshot(snapshot)) {
      return false;
    }

    localServerAuthoritative=true;
    document.body.dataset.battleAuthority=
      "server";
    renderEnemyBoard();
    renderCredits();
    renderPlayerCoreSummary();

    if (snapshot.status === "finished") {
      presentOnlineMatchFinished();
    }
    return true;
  }

  function applyLocalServerSnapshotEnvelope(
    envelope
  ) {
    const snapshot=
      envelope?.snapshot
      || envelope;
    if (
      !snapshot?.players
      || !snapshot.players[
        participantPlayerId
      ]
    ) {
      return false;
    }

    processLocalServerEvents(
      envelope?.events || [],
      snapshot
    );
    processSnapshotDestructionFx(
      snapshot
    );

    const player=
      snapshot.players[
        participantPlayerId
      ];
    playerCellDebris = Array.isArray(player.cell_debris)
      ? player.cell_debris
      : [];
    syncBoosterOfferFromSnapshot(player);
    syncCorePowerFromSnapshot(player);
    const enemy=Object.values(
      snapshot.players
    ).find(
      (item) =>
        item.player_id
        !== participantPlayerId
    );
    if (!enemy) {
      return false;
    }

    if (envelope?.ai_archetype && AI_ARCHETYPE_UI[envelope.ai_archetype]) {
      activeLocalAiArchetype=envelope.ai_archetype;
      selectedAiArchetype=envelope.ai_archetype;
      renderAiArchetypePicker();
      if (localBattleMetrics) localBattleMetrics.ai_archetype=activeLocalAiArchetype;
      const label=aiArchetypeName(activeLocalAiArchetype);
      if (activeMatchModeEl) activeMatchModeEl.textContent=localizedMessage("battle.ai_match_mode", {label});
      if (matchmakingStatusEl) {
        matchmakingStatusEl.textContent=localizedMessage("battle.ai_opponent", {label});
        matchmakingStatusEl.dataset.status="local";
      }
      const battleMatchLabel=document.getElementById("battle-match-label");
      if (battleMatchLabel) battleMatchLabel.textContent=localizedMessage("battle.ai_label", {label});
    }

    localServerAuthoritative=true;
    document.body.dataset.battleAuthority=
      "server";
    localServerLastSnapshotTick=
      Number(
        snapshot.tick || 0
      );
    client.updateElapsedMs(
      Number(
        snapshot.elapsed_ms || 0
      )
    );
    client.applyServerEconomyState({
      circuitCredits:
        Number(
          player.circuit_credits || 0
        ),
    });
    if (localBattleMetrics) {
      localBattleMetrics.forfeit_credit_penalty =
        Number(
          player.forfeit_credit_penalty || 0
        );
    }

    for (
      const serverModule
      of player.modules || []
    ) {
      const clientModuleId=
        localServerClientModuleId(
          serverModule
        );
      if (!clientModuleId) {
        continue;
      }
      client.applyServerModuleState({
        instanceId:clientModuleId,
        hp:Number(serverModule.hp || 0),
        status:serverModule.status,
        position:
          serverModule.x === null
          || serverModule.y === null
            ? null
            : {
                x:Number(serverModule.x),
                y:Number(serverModule.y),
              },
        isPowered:Boolean(
          serverModule.is_powered
        ),
        powerReason:
          serverModule.power_reason,
        energyReceived:Number(
          serverModule.energy_received || 0
        ),
        energyRequired:Number(
          serverModule.energy_required || 0
        ),
        heat:Number(
          serverModule.heat || 0
        ),
        debuffs:Array.isArray(serverModule.debuffs)
          ? serverModule.debuffs
          : [],
        temporaryBoosters:Array.isArray(serverModule.temporary_boosters)
          ? serverModule.temporary_boosters
          : [],
      });

    }
    client.clearPendingPlacements();

    applyEnemyServerSnapshot(
      snapshot
    );

    render();
    renderEnemyBoard();
    renderCredits();
    renderPlayerCoreSummary();
    localServerEventCursor=
      Number(
        envelope?.event_cursor
        ?? localServerEventCursor
      );

    if (
      snapshot.status
      === "finished"
      && !localBattleFinished
    ) {
      localServerFinalResult = {
        ...snapshot,
        session_id: snapshot.session_id || localServerSessionId,
        viewer_player_id: participantPlayerId,
      };
      finishLocalBattle({
        won:
          snapshot.winner_player_id
          === participantPlayerId,
        finishReason:
          snapshot.finish_reason || null,
        forfeitPenalty:
          Number(
            player.forfeit_credit_penalty || 0
          ),
      });
    }

    return true;
  }

  async function pollLocalServerBattle() {
    if (
      !localServerSessionId
      || localBattleFinished
    ) {
      return false;
    }
    try {
      const response=await fetchWithDeadline(
        `/local-ai/sessions/${encodeURIComponent(localServerSessionId)}/snapshot`
        + `?player_id=${encodeURIComponent(participantPlayerId)}`
        + `&cursor=${localServerEventCursor}`,
        { cache:"no-store" },
        5000
      );
      if (!response.ok) {
        return;
      }
      applyLocalServerSnapshotEnvelope(
        await response.json()
      );
    } catch (_error) {
      // Sunucu köprüsü açılamazsa mevcut çevrimdışı test savaşı kesilmez.
    }
  }

  async function connectLocalServerBattle() {
    try {
      const response=await fetchWithDeadline(
        "/local-ai/sessions",
        {
          method:"POST",
          headers:{
            "content-type":
              "application/json",
          },
          body:JSON.stringify({
            player_id:
              participantPlayerId,
            battle_pool_ids:
              selectedBattlePoolDefinitionIds(),
            ai_archetype:
              selectedAiArchetype,
            initial_modules:
              buildInitialOnlineSetup().map((module) => ({
                instance_id:module.instanceId,
                definition_id:module.definitionId,
                x:module.x,
                y:module.y,
              })),
          }),
        },
        8000
      );
      if (!response.ok) {
        return false;
      }
      const payload=await response.json();
      if (
        !payload?.session_id
        || !applyLocalServerSnapshotEnvelope(
          payload
        )
      ) {
        return false;
      }

      localServerSessionId=
        payload.session_id;
      telemetryDispatcher.setSession(
        localServerSessionId
      );
      stopLocalServerPolling();
      localServerSyncTimer=
        window.setInterval(
          pollLocalServerBattle,
          250
        );
      logClientMessage(
        localizedMessage("battle.ai_connected", {archetype:aiArchetypeName(activeLocalAiArchetype)})
      );
      return true;
    } catch (_error) {
      document.body.dataset.battleAuthority=
        "offline-fallback";
      return false;
    }
  }

  async function sendLocalServerCommand(
    command
  ) {
    if (
      !localServerSessionId
      || localBattleFinished
    ) {
      return;
    }
    try {
      const response=await fetchWithDeadline(
        `/local-ai/sessions/${encodeURIComponent(localServerSessionId)}/commands`,
        {
          method:"POST",
          headers:{
            "content-type":
              "application/json",
          },
          body:JSON.stringify({
            player_id:
              participantPlayerId,
            kind:command.kind,
            payload:command.payload,
          }),
        },
        5000
      );
      if (!response.ok) {
        const detail=await response
          .json()
          .catch(() => ({}));
        logClientMessage(localizedApiError(detail, response.status));
        return false;
      }
      await pollLocalServerBattle();
      return true;
    } catch (_error) {
      logClientMessage(
        "Sunucu savaş komutuna ulaşılamadı."
      );
      return false;
    }
  }

  function clearBattleVisualElement(element) {
    if (!element) return;
    if (typeof element.replaceChildren === "function") {
      element.replaceChildren();
    } else {
      element.innerHTML = "";
    }
  }

  function resetBattleVisualSurface() {
    battleVisualGeneration += 1;
    client.cancelDrag?.();
    client.clearPendingPlacements?.();
    renderedShelfSignature = null;
    renderedBoardSignature = null;
    playerCellDebris = [];
    enemyCellDebris = [];
    corePowerCharge = 0;
    corePowerReady = false;
    corePowerTargeting = false;
    renderCorePowerControl();
    clearBattleVisualElement(document.getElementById("battle-effect-layer"));
    createBoard();
    createEnemyBoard();
  }

  function resetClientModulesForBattleStart() {
    for (const [instanceId, module] of client.modules) {
      if (
        !module.isDeckTemplate
        && !["core-1", "generator-1"].includes(instanceId)
      ) {
        client.modules.delete(instanceId);
      }
    }
    const initialSetupByInstanceId = new Map(
      buildInitialOnlineSetup().map((item) => [item.instanceId, item])
    );

    for (const module of client.modules.values()) {
      const isCore = module.instanceId === "core-1";
      const isGenerator = module.instanceId === "generator-1";
      const initialSetup = initialSetupByInstanceId.get(module.instanceId);
      const initialConfig = initialSetup
        ? {
            position:{ x:initialSetup.x, y:initialSetup.y },
          }
        : null;
      const startActive = isCore;

      client.applyServerModuleState({
        instanceId:module.instanceId,
        hp:module.maxHp,
        status:startActive ? "active" : "reserve",
        position:isCore
          ? {x:2,y:1}
          : initialConfig?.position || null,
        energyReceived:0,
        isPowered:true,
        storedEnergy:0,
        heat:0,
        debuffs:[],
        temporaryBoosters:[],
      });
    }
  }

  function resetLocalBattleState() {
    resetBattleVisualSurface();
    pvpConnection.disconnect();

    stopLocalServerPolling();
    localServerSessionId=null;
    localServerAuthoritative=false;
    localServerEventCursor=0;
    localServerLastSnapshotTick=-1;
    localServerFinalResult=null;
    localBattleOutcome="pending";
    document.body.dataset.battleAuthority=
      "offline-fallback";

    localBattleStarted =
      true;
    document.body.dataset.localStatus =
      "battle";
    client.cancelDrag?.();
    if (document.documentElement) document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    globalThis.scrollTo?.({ top: 0, left: 0, behavior: "instant" });

    battleStartedAt =
      performance.now();
    localBattleFinished =
      false;
    localEnemyAttackSecond =
      -1;
    localBattleMetrics =
      createLocalBattleMetrics();
    previousCombatSecond =
      -1;
    mockAttackerLastAttack.clear();
    lastBattleAnimationNow =
      null;
    mockServerCredits =
      6;
    mockServerRegenPulses =
      0;
    mockEnemyCoreHp =
      300;
    mockEnemyGeneratorHp =
      150;
    mockEnemyModuleHp =
      360;
    resetMockEnemyCircuit();
    nextBoosterOfferIndex =
      0;
    boosterOfferOpen =
      false;
    serverBoosterOfferId =
      null;
    serverBoosterEligibleTargets =
      new Map();
    clearBoosterTargetMode(
      "local_match_reset"
    );

    client.applyServerEconomyState({
      circuitCredits:6,
    });
    client.clearPendingPlacements();
    client.updateElapsedMs(0);

    resetClientModulesForBattleStart();

    commandLog.length = 0;
    resetBattleResultPresentation();
    destructionFxPlayed.clear();
    preparedCorePowerFx.clear();
    snapshotModuleHp.clear();
    moduleAnchorRects.clear();
    for (const effectId of [...floatingFeedbackLive.keys()]) {
      removeFloatingFeedbackRecord(effectId);
    }
    battleEffectAggregator?.clear?.();
    setBattleLiveTicker(
      localizedMessage("battle.ai_start", {archetype:aiArchetypeName(selectedAiArchetype)}),
      "neutral"
    );

    document.body.dataset.localFinished =
      "false";

    activeLocalAiArchetype=selectedAiArchetype;
    const aiLabel=aiArchetypeName(activeLocalAiArchetype);
    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        localizedMessage("battle.ai_match_mode", {label:aiLabel});
    }
    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        "Savaş devam ediyor";
    }
    if (matchmakingStatusEl) {
      matchmakingStatusEl.textContent =localizedMessage("battle.ai_opponent", {label:aiLabel});
      matchmakingStatusEl.dataset.status =
        "local";
    }
    const battleMatchLabel=document.getElementById("battle-match-label");
    if (battleMatchLabel) battleMatchLabel.textContent=localizedMessage("battle.ai_label", {label:aiLabel});

    if (boosterStatusEl) boosterStatusEl.textContent = "Kapalı";
    criticalCoreAudioRequested = false;
    requestOwnedAudioState("local_battle_started");
    triggerGridshardCue("energy_transfer");

    createEnemyBoard();
    renderEnemyBoard();
    render();
    renderCredits();
    renderCapacity();
    renderPlayerCoreSummary();
    renderLog();

    telemetryDispatcher
      .trackLocalBattleStarted({
        selected_pool_size:
          battlePoolSelection.selected.size,
        initial_generator_gate:
          "south",
        initial_credits:200,
        ai_archetype:selectedAiArchetype,
      });

    renderLocalBattleReport();
    loadCumulativeManualReport();

    logClientMessage(
      "Tek Oyunculu Test Maçı başladı. Altı kartlık deste Devre Kredisine göre kullanıma hazır."
    );
  }

  function prepareLocalMatch() {
    stopLocalServerPolling();
    localServerSessionId = null;
    localServerAuthoritative = false;
    localBattleStarted =
      false;
    localBattleFinished =
      false;
    document.body.dataset.localStatus =
      "setup";
    client.cancelDrag?.();
    setActivePlayMode(
      "local"
    );
    renderAiArchetypePicker();

    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        "Maç: Tek Oyunculu · Savaş Havuzu hazırlanıyor";
    }

    renderBattlePoolSelection();
    renderPlayModeUi();
  }

  function fillBattlePoolForQuickTest() {
    const ids=[
      ...selectablePoolModules
        .map(
          (module)=>
            module.instanceId
        )
        .slice(
          0,
          battlePoolSelection
            .requiredSize
        ),
    ];

    const result=
      battlePoolSelection
        .setSelection(
          ids
        );

    if (!result.ok) {
      logClientMessage(
        result.reason
        || "Hızlı test Savaş Havuzu hazırlanamadı."
      );
      return result;
    }

    activeBattlePoolPresetName=
      null;
    activeBattlePoolPresetBaseline=
      battlePoolSelection
        .selectedIds();

    renderBattlePoolSelection();
    renderPresetOptions();
    renderActivePresetState();

    return {
      ok:true,
      selected:
        battlePoolSelection
          .selectedIds(),
    };
  }

  function startQuickLocalBattle() {
    const prepared=
      fillBattlePoolForQuickTest();

    if (!prepared.ok) {
      return prepared;
    }

    setActivePlayMode(
      "local"
    );

    commandLog.push({
      atMs:
        client.elapsedMs,
      kind:
        "quick_test_battle_pool",
      payload:{
        module_instance_ids:
          battlePoolSelection
            .selectedIds(),
        module_definition_ids:
          selectedBattlePoolDefinitionIds(),
      },
    });

    startLocalPlayableMatch();

    const status=
      document.getElementById(
        "battle-entry-status"
      );
    if (status) {
      status.textContent=
        localizedMessage("battle.arena_entered", {archetype:aiArchetypeName()});
    }

    telemetryDispatcher.track(
      "battle_area_entered",
      {
        mode:
          "quick_local_test",
        pool_size:
          battlePoolSelection
            .selectedIds()
            .length,
        elapsed_ms:
          client.elapsedMs,
        ai_archetype:selectedAiArchetype,
      }
    );

    logClientMessage(
      "Savaş testi: gömülü devre yolları, kesintisiz ses ve anlık dil geçişi aktif."
    );

    return {
      ok:true,
    };
  }

  function startLocalPlayableMatch() {
    setActivePlayMode(
      "local"
    );
    resetLocalBattleState();
    renderPlayModeUi();
    connectLocalServerBattle();
  }

  function prepareOnlineMatch() {
    localBattleStarted =
      false;
    pvpState.reset();
    onlinePlay.reset();
    resetBattleResultPresentation();
    clearPlayError();
    setActivePlayMode(
      "online"
    );
    document.body.dataset.onlineStatus =
      "idle";

    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        "Maç: Online PvP";
    }

    criticalCoreAudioRequested = false;
    requestOwnedAudioState("online_pool_prepared");

    renderBattlePoolSelection();
    renderPlayModeUi();
  }

  function syncCriticalCoreAudioState() {
    const onlineBattleActive = activePlayMode === "online" && document.body.dataset.onlineStatus === "battle";
    const localBattleActive = activePlayMode === "local" && localBattleStarted && !localBattleFinished;
    if (
      !gridshardAudioDirector
      || !(onlineBattleActive || localBattleActive)
    ) {
      if (criticalCoreAudioRequested) {
        criticalCoreAudioRequested = false;
        requestOwnedAudioState("critical_core_inactive");
      }
      return;
    }

    const core=
      client.modules.get(
        "core-1"
      );
    if (!core) return;

    const ratio=
      Math.max(
        0,
        Number(core.hp || 0)
      )
      / Math.max(
          1,
          Number(
            core.maxHp || 300
          )
        );

    criticalCoreAudioRequested = ratio > 0 && ratio <= .33;
    gridshardAudioDirector.setBattlePressure(Math.min(1, Math.max(0, 1 - ratio) + Math.min(.35, Number(client.elapsedMs || 0) / 240000)));
    requestOwnedAudioState("battle_audio_snapshot");
  }

  function renderPlayerCoreSummary() {
    if (!playerCoreSummaryEl) {
      return;
    }

    const core =
      client.modules.get(
        "core-1"
      );
    const generator =
      client.modules.get(
        "generator-1"
      );

    playerCoreSummaryEl.textContent=localizedMessage("battle.your_core_hp", {hp:localizedNumber(Math.max(0, Number(core?.hp || 0))), max:localizedNumber(core?.maxHp || 300)});

    if (playerBoardStatusEl) {
      playerBoardStatusEl.textContent=localizedMessage("battle.core_hp_energy", {hp:localizedNumber(Math.max(0,Number(core?.hp||0))), max:localizedNumber(core?.maxHp||300), energy:localizedNumber(Math.round(Number(client.energyLoadRatio || 0) * 100))});
    }

    const playerSide=
      document.querySelector(
        ".duel-player-side"
      );
    if (playerSide) {
      playerSide.dataset.coreCritical=
        String(
          Number(core?.hp || 0) > 0
          && Number(core?.hp || 0)
            / Math.max(
                1,
                Number(
                  core?.maxHp || 300
                )
              )
            <= .33
        );
    }

    syncCriticalCoreAudioState();
  }

  function buildOfflineLocalBattleResult(won, finishReason) {
    const selectedCore = metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.find(
        (item) => item.id === metaProgressionState?.cores?.selected_core_type
      )
      || null;
    const damageRows = (definitionIds, damageByDefinition = {}) =>
      definitionIds.slice(0, 6).map((definitionId) => {
        const definition = moduleDefinitions.find(
          (item) => item.definitionId === definitionId
        );
        return {
          definition_id:definitionId,
          name_tr:definition?.nameTr || definitionId,
          level:1,
          damage:Number(damageByDefinition[definitionId] || 0),
        };
      }).sort((left, right) => right.damage - left.damage);
    const enemyDamage = Math.max(0, Number(localBattleMetrics?.damage_received || 0));
    const enemyDamageMap = enemyBattlePoolDefinitionIds.includes("laser")
      ? {laser:enemyDamage}
      : {[enemyBattlePoolDefinitionIds[0]]:enemyDamage};
    return {
      session_id:localServerSessionId || `offline-${Date.now()}`,
      match_type:"local_test",
      viewer_player_id:participantPlayerId,
      winner_player_id:won ? participantPlayerId : "yerel-ai",
      loser_player_id:won ? "yerel-ai" : participantPlayerId,
      is_draw:false,
      finish_reason:finishReason || "core_destroyed",
      finished_at_ms:Math.round(client.elapsedMs),
      players:{
        [participantPlayerId]:{
          display_name:profileState.viewModel()?.displayName || "Oyuncu",
          rating:Number(profileState.viewModel()?.rating || 0),
          core_type:metaProgressionState?.cores?.selected_core_type || "core_resonance",
          core_level:Math.max(1, Number(selectedCore?.level || 1)),
        },
        "yerel-ai":{
          display_name:`${aiArchetypeName(activeLocalAiArchetype)} AI`,
          rating:Number(profileState.viewModel()?.rating || 0),
          core_type:"core_resonance",
          core_level:1,
        },
      },
      result_summary:{
        [participantPlayerId]:{
          damage_dealt:Number(localBattleMetrics?.damage_dealt || 0),
          damage_by_module:damageRows(
            selectedBattlePoolDefinitionIds(),
            localBattleMetrics?.damage_by_module || {}
          ),
          core_type:metaProgressionState?.cores?.selected_core_type || "core_resonance",
          core_level:Math.max(1, Number(selectedCore?.level || 1)),
        },
        "yerel-ai":{
          damage_dealt:enemyDamage,
          damage_by_module:damageRows(enemyBattlePoolDefinitionIds, enemyDamageMap),
          core_type:"core_resonance",
          core_level:1,
        },
      },
    };
  }

  function finishLocalBattle({
    won,
    finishReason=null,
    forfeitPenalty=0,
  }) {
    if (localBattleFinished) {
      return;
    }

    localBattleFinished =
      true;
    localBattleOutcome = won ? "victory" : "defeat";
    localServerFinalResult ||= buildOfflineLocalBattleResult(
      won,
      finishReason
    );
    setBattleLiveTicker(
      won ? "Savaş tamamlandı · Galibiyet" : "Savaş tamamlandı · Mağlubiyet",
      won ? "heal" : "danger"
    );
    document.body.dataset.localFinished =
      "true";
    stopLocalServerPolling();

    criticalCoreAudioRequested = false;
    setTerminalAudioState(
      won ? "victory" : "defeat",
      "local_match_finished"
    );

    setBattleResultHero(
      won ? "victory" : "defeat"
    );

    const waitForCoreExplosion = [
      "core_destroyed",
      "simultaneous_core_tiebreak",
      "simultaneous_core_draw",
      "simultaneous_core_destroyed",
    ].includes(finishReason || "core_destroyed");
    if (waitForCoreExplosion) {
      emitModuleExplosion(
        won ? "enemy-core" : "core-1",
        { core: true }
      );
    }
    schedulePostMatchReveal(
      `local:${battleStartedAt || "finished"}`,
      { waitForCoreExplosion }
    );

    if (battleResultSummaryEl) {
      battleResultSummaryEl.hidden =
        false;
      battleResultSummaryEl.textContent = localizedUiText(
        finishReason === "player_forfeit"
          ? localizedMessage("battle.forfeit_loss", {penalty:localizedNumber(forfeitPenalty)})
          : (
              won
                ? "KAZANDIN · Rakip Çekirdek yok edildi"
                : "KAYBETTİN · Çekirdeğin yok edildi"
            )
      );
    }

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent = localizedUiText(
        finishReason === "player_forfeit"
          ? "Maç tamamlandı · Savaşı bıraktın"
          : (
              won
                ? "Maç tamamlandı · Galibiyet"
                : "Maç tamamlandı · Mağlubiyet"
            )
      );
    }

    if (localBattleMetrics) {
      localBattleMetrics.duration_ms =
        Math.max(0,Math.round(client.elapsedMs));
      localBattleMetrics.won = Boolean(won);
      localBattleMetrics.forfeited =
        finishReason === "player_forfeit";
      localBattleMetrics.forfeit_credit_penalty =
        Math.max(
          0,
          Number(forfeitPenalty || 0)
        );

      telemetryDispatcher
        .trackLocalBattleCompleted({
          ...localBattleMetrics,
          generator_gate_visits:
            {...localBattleMetrics.generator_gate_visits},
        });
      telemetryDispatcher.track(
        "battle_ux_timing_summary",
        {
          frame_count:
            localBattleMetrics
              .frame_count,
          max_frame_gap_ms:
            Math.round(
              localBattleMetrics
                .max_frame_gap_ms
            ),
          pause_violation_count:
            localBattleMetrics
              .pause_violation_count,
          ui_interactions:
            localBattleMetrics
              .ui_interactions,
          ux_categories:{
            ...localBattleMetrics
              .ux_categories,
          },
          ux_matrix:
            Object.fromEntries(
              Object.entries(
                localBattleMetrics
                  .ux_matrix
              ).map(
                ([category,value])=>[
                  category,
                  {
                    count:
                      value.count,
                    average_frame_gap_ms:
                      value.count
                        ? Math.round(
                            value.total_frame_gap_ms
                            / value.count
                          )
                        : 0,
                    max_frame_gap_ms:
                      Math.round(
                        value.max_frame_gap_ms
                      ),
                    average_clock_delta_ms:
                      value.count
                        ? Math.round(
                            value.total_clock_delta_ms
                            / value.count
                          )
                        : 0,
                    max_clock_delta_ms:
                      Math.round(
                        value.max_clock_delta_ms
                      ),
                  },
                ]
              )
            ),
          battle_elapsed_ms:
            Math.round(
              client.elapsedMs
            ),
          paused_by_ui:
            localBattleMetrics
              .pause_violation_count
              > 0,
        }
      );
      publishBattleUxMetrics();
    }

    renderLocalBattleAnalysis({
      won,
      finishReason,
    });
    if (localServerFinalResult) {
      renderPostMatchScoreboard(localServerFinalResult);
    }
    renderPostMatchRewards();
    const analysisDetails =
      document.getElementById(
        "post-match-analysis"
      );
    if (analysisDetails) {
      analysisDetails.open = true;
    }

    commandLog.push({
      atMs:client.elapsedMs,
      kind:"battle_finished",
      winnerPlayerId:
        won
          ? participantPlayerId
          : "yerel-ai",
      isDraw:false,
    });
    renderLog();
    renderLocalBattleReport();
    window.setTimeout(
      () => {
        loadCumulativeManualReport();
      },
      350
    );
    renderPlayModeUi();
  }

  function forfeitOfflineLocalBattle() {
    const earnedDuringBattle =
      Math.max(
        0,
        Number(mockServerRegenPulses || 0)
      );
    const currentCredits =
      Math.max(
        0,
        Number(client.circuitCredits || 0)
      );
    const penalty =
      Math.min(
        currentCredits,
        earnedDuringBattle
      );

    client.applyServerEconomyState({
      circuitCredits:
        currentCredits - penalty,
    });
    commandLog.push({
      atMs:client.elapsedMs,
      kind:"battle_forfeited",
      payload:{
        credit_penalty:penalty,
      },
    });
    finishLocalBattle({
      won:false,
      finishReason:"player_forfeit",
      forfeitPenalty:penalty,
    });
  }

  async function forfeitActiveBattle() {
    if (
      activePlayMode === "local"
      && localBattleStarted
      && !localBattleFinished
    ) {
      battleForfeitButton.disabled = true;
      trackBattleUiInteraction(
        "battle_forfeit",
        "other_ui"
      );
      if (localServerSessionId) {
        const accepted =
          await sendLocalServerCommand({
            kind:"forfeit_battle",
            payload:{},
          });
        if (!accepted) {
          battleForfeitButton.disabled = false;
        }
        return;
      }
      forfeitOfflineLocalBattle();
      return;
    }

    if (
      activePlayMode === "online"
      && document.body.dataset.onlineStatus
        === "battle"
      && pvpState.phase !== "finished"
    ) {
      battleForfeitButton.disabled = true;
      const result = sendPvPCommand({
        kind:"forfeit_battle",
        payload:{},
      });
      if (!result?.ok) {
        battleForfeitButton.disabled = false;
        logClientMessage(
          result?.reason
          || "Savaşı bırakma komutu gönderilemedi."
        );
      }
    }
  }

  function pulseBattleFx(moduleId, kind="hit") {
    const element =
      document.querySelector(
        `[data-module-id="${moduleId}"]`
      );
    if (!element) return false;

    const className={
      hit:"fx-hit",
      shield:"fx-shield",
      sabotage:"fx-sabotage",
      heal:"fx-feedback-heal",
      cool:"fx-feedback-cool",
      energy:"fx-feedback-energy",
      boost:"fx-feedback-boost",
      reflect:"fx-feedback-reflect",
      warning:"fx-feedback-warning",
      status:"fx-feedback-status",
    }[kind] || "fx-feedback-status";
    const feedbackClasses=[
      "fx-hit",
      "fx-shield",
      "fx-sabotage",
      "fx-feedback-heal",
      "fx-feedback-cool",
      "fx-feedback-energy",
      "fx-feedback-boost",
      "fx-feedback-reflect",
      "fx-feedback-warning",
      "fx-feedback-status",
    ];

    element.classList.remove(
      ...feedbackClasses
    );
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(
      () => element.classList.remove(className),
      720
    );
    return true;
  }

  function emitDuelImpactEffect({
    layer,
    x,
    y,
    targetModuleId,
    kind,
    weapon,
  }) {
    const impact=
      document.createElement("span");
    impact.className="duel-hit-impact";
    impact.dataset.kind=kind;
    impact.dataset.weapon=weapon;
    impact.dataset.targetModuleId=
      targetModuleId;
    impact.style.left=`${x}px`;
    impact.style.top=`${y}px`;

    const flash=
      document.createElement("span");
    flash.className="duel-impact-flash";
    const ring=
      document.createElement("span");
    ring.className="duel-impact-ring";
    impact.append(flash,ring);
    for (let index=0;index<10;index+=1) {
      const spark=
        document.createElement("i");
      spark.style.setProperty(
        "--impact-angle",
        `${index*36+(index%2)*9}deg`
      );
      impact.appendChild(spark);
    }
    layer.appendChild(impact);
    pulseBattleFx(
      targetModuleId,
      kind === "shield"
        ? "shield"
        : "hit"
    );
    window.setTimeout(
      () => impact.remove(),
      940
    );
  }

  function emitDuelAttackEffect(
    sourceModuleId,
    targetModuleId,
    kind="attack",
    definitionId="laser"
  ) {
    if (
      !sourceModuleId
      || !targetModuleId
    ) {
      return 0;
    }
    const layer=document.getElementById(
      "battle-effect-layer"
    );
    const sourceRoot = sourceModuleId.startsWith("enemy-")
      ? document.getElementById("enemy-board")
      : document.getElementById("board");
    const targetRoot = targetModuleId.startsWith("enemy-")
      ? document.getElementById("enemy-board")
      : document.getElementById("board");
    const source=sourceRoot?.querySelector(
      `[data-module-id="${sourceModuleId}"]`
    );
    const target=targetRoot?.querySelector(
      `[data-module-id="${targetModuleId}"]`
    );
    const visualGeneration = battleVisualGeneration;
    if (
      !layer
      || !source
      || !target
      || typeof layer.getBoundingClientRect
        !== "function"
      || typeof source.getBoundingClientRect
        !== "function"
      || typeof target.getBoundingClientRect
        !== "function"
    ) {
      return 0;
    }

    const layerRect=
      layer.getBoundingClientRect();
    const sourceRect=
      source.getBoundingClientRect();
    const targetRect=
      target.getBoundingClientRect();
    const x1=
      sourceRect.left
      + sourceRect.width/2
      - layerRect.left;
    const y1=
      sourceRect.top
      + sourceRect.height/2
      - layerRect.top;
    const x2=
      targetRect.left
      + targetRect.width/2
      - layerRect.left;
    const y2=
      targetRect.top
      + targetRect.height/2
      - layerRect.top;
    const dx=x2-x1;
    const dy=y2-y1;
    const distance=Math.hypot(dx,dy);
    const presentation=
      weaponPresentation(definitionId);
    const line=document.createElement(
      "span"
    );
    line.className=
      "duel-attack-line";
    line.dataset.kind=kind;
    line.dataset.weapon=
      presentation.fx;
    line.style.left=`${x1}px`;
    line.style.top=`${y1}px`;
    line.style.width=`${distance}px`;
    line.style.setProperty(
      "--fx-angle",
      `${Math.atan2(dy,dx)}rad`
    );
    line.style.setProperty(
      "--fx-distance",
      `${distance}px`
    );
    line.style.setProperty(
      "--fx-travel",
      `${presentation.travelMs}ms`
    );

    const muzzle=
      document.createElement("span");
    muzzle.className="duel-shot-muzzle";
    const beam=
      document.createElement("span");
    beam.className="duel-shot-beam";
    line.append(muzzle,beam);
    const projectileCount=
      presentation.fx === "drone"
        ? 3
        : 1;
    for (
      let index=0;
      index<projectileCount;
      index+=1
    ) {
      const projectile=
        document.createElement("span");
      projectile.className=
        "duel-shot-projectile";
      projectile.dataset.projectileIndex=
        String(index);
      line.appendChild(projectile);
    }
    layer.appendChild(line);

    source.classList.remove("fx-fire");
    void source.offsetWidth;
    source.classList.add("fx-fire");
    window.setTimeout(
      () => {
        if (visualGeneration !== battleVisualGeneration) {
          line.remove();
          return;
        }
        source.classList.remove("fx-fire");
        emitDuelImpactEffect({
          layer,
          x:x2,
          y:y2,
          targetModuleId,
          kind,
          weapon:presentation.fx,
        });
      },
      presentation.travelMs
    );
    window.setTimeout(
      () => line.remove(),
      presentation.travelMs + 520
    );
    return presentation.travelMs;
  }

  function emitModuleExplosion(
    moduleId,
    { core=false }={}
  ) {
    const layer = document.getElementById(
      "battle-effect-layer"
    );
    const targetRect = resolveModuleAnchor(
      moduleId,
      { core }
    );
    if (
      !layer
      || !targetRect
      || typeof layer.getBoundingClientRect !== "function"
    ) {
      return false;
    }

    const layerRect = layer.getBoundingClientRect();
    const targetRoot = moduleId.startsWith("enemy-")
      ? document.getElementById("enemy-board")
      : document.getElementById("board");
    const targetElement = targetRoot?.querySelector(
      `[data-module-id="${moduleId}"]`
    );
    const effect = document.createElement("span");
    effect.className = core
      ? "module-explosion core-explosion"
      : "module-explosion";
    effect.dataset.category = core
      ? "core"
      : String(targetElement?.dataset.category || "module");
    effect.style.left =
      `${targetRect.left + targetRect.width / 2 - layerRect.left}px`;
    effect.style.top =
      `${targetRect.top + targetRect.height / 2 - layerRect.top}px`;

    const flash = document.createElement("span");
    flash.className = "explosion-flash";
    effect.appendChild(flash);
    const shockwave = document.createElement("span");
    shockwave.className = "explosion-shockwave";
    effect.appendChild(shockwave);

    if (core) {
      const secondaryShockwave = document.createElement("span");
      secondaryShockwave.className = "explosion-shockwave explosion-shockwave-secondary";
      effect.appendChild(secondaryShockwave);
    }

    const particleCount = core ? 30 : 16;
    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty(
        "--particle-angle",
        `${(360 / particleCount) * index + (index % 3) * 7}deg`
      );
      particle.style.setProperty(
        "--particle-distance",
        `${core ? 88 + (index % 5) * 15 : 44 + (index % 4) * 10}px`
      );
      particle.style.animationDelay = `${(index % 4) * 18}ms`;
      effect.appendChild(particle);
    }

    layer.appendChild(effect);
    const arena = document.getElementById("duel-arena");
    if (arena) {
      arena.classList.remove("fx-module-impact", "fx-core-impact");
      void arena.offsetWidth;
      arena.classList.add(core ? "fx-core-impact" : "fx-module-impact");
    }
    triggerGridshardCue(core ? "core_hit" : "energy_transfer");
    window.setTimeout(
      () => {
        effect.remove();
        arena?.classList.remove("fx-module-impact", "fx-core-impact");
      },
      core ? 2450 : 980
    );
    return true;
  }

  function updateLocalEnemyCombat() {
    if (
      activePlayMode !== "local"
      || localBattleFinished
    ) {
      return;
    }

    if (!enemyHasLivingAttackModule()) {
      return;
    }

    const attackSecond =
      Math.floor(
        client.elapsedMs
        / 2000
      );

    if (
      attackSecond
      === localEnemyAttackSecond
    ) {
      return;
    }

    localEnemyAttackSecond =
      attackSecond;

    const activeTargets = [
      ...client.modules.values(),
    ]
      .filter(
        (module) =>
          module.status === "active"
          && ![
            "core-1",
            "generator-1",
          ].includes(
            module.instanceId
          )
          && Number(
            module.hp || 0
          ) > 0
      )
      .sort(
        (a,b) =>
          mockTargetPriority(a)
          - mockTargetPriority(b)
          || a.instanceId.localeCompare(
            b.instanceId
          )
      );

    let target =
      activeTargets[0]
      || (
        Number(
          client.modules.get(
            "generator-1"
          )?.hp || 0
        ) > 0
          ? client.modules.get(
              "generator-1"
            )
          : client.modules.get(
              "core-1"
            )
      );

    if (
      !target
      || Number(
        target.hp || 0
      ) <= 0
    ) {
      return;
    }

    const shieldActive =
      [...client.modules.values()]
        .some(
          (module) =>
            module.instanceId
            === "shield-1"
            && module.status
              === "active"
            && Number(
              module.hp || 0
            ) > 0
        );

    const rawDamage = 8;
    const damage =
      shieldActive
        ? 5
        : rawDamage;
    const newHp =
      Math.max(
        0,
        Number(
          target.hp || 0
        )
        - damage
      );

    client.applyServerModuleState({
      instanceId:
        target.instanceId,
      hp:newHp,
    });
    emitFloatingBattleFeedback(
      target.instanceId,
      `-${damage}`,
      "damage",
      { core: target.instanceId === "core-1" }
    );
    setBattleLiveTicker(
      localizedMessage("battle.damage_ticker", {name:localizedUiText(target.nameTr || "Modül"), damage:localizedNumber(damage)}),
      "danger"
    );

    const travelMs=emitDuelAttackEffect(
      "enemy-laser",
      target.instanceId,
      shieldActive
        ? "shield"
        : "enemy",
      "laser"
    );
    triggerGridshardCue(
      weaponCue("laser")
    );
    scheduleAttackImpactCue({
      defended:shieldActive,
      targetDefinitionId:
        clientDefinitionId(
          target.instanceId
        ),
      travelMs,
    });

    if (localBattleMetrics) {
      localBattleMetrics.damage_received += damage;
      localBattleMetrics.ai_hits += 1;
      localBattleMetrics.shield_mitigated +=
        Math.max(0, rawDamage-damage);

      telemetryDispatcher.trackLocalAiHit({
        module_id:target.instanceId,
        raw_damage:rawDamage,
        final_damage:damage,
        shield_active:shieldActive,
        elapsed_ms:client.elapsedMs,
      });
    }

    commandLog.push({
      atMs:client.elapsedMs,
      kind:"module_damaged",
      moduleName:
        target.nameTr,
      damage,
      hp:newHp,
      source:"Yerel AI",
    });

    if (
      target.instanceId
      === "core-1"
      && newHp <= 0
    ) {
      finishLocalBattle({
        won:false,
      });
    }

    renderPlayerCoreSummary();
    renderBoard();
    renderLog();
  }

  function hpRatio(
    hp,
    maxHp
  ) {
    const max=
      Math.max(
        1,
        Number(maxHp || 1)
      );
    return Math.max(
      0,
      Math.min(
        1,
        Number(hp || 0)
        / max
      )
    );
  }

  function applyHpVisual(
    element,
    hp,
    maxHp
  ) {
    const ratio=
      hpRatio(
        hp,
        maxHp
      );
    const percent=
      Math.round(
        ratio * 100
      );

    if (
      element.style
      && typeof element.style.setProperty
        === "function"
    ) {
      element.style.setProperty(
        "--hp-ratio",
        String(ratio)
      );
      element.style.setProperty(
        "--hp-percent",
        `${percent}%`
      );
    } else if (element.style) {
      element.style["--hp-ratio"] =
        String(ratio);
      element.style["--hp-percent"] =
        `${percent}%`;
    }
    element.dataset.hpState=
      ratio <= 0
        ? "destroyed"
        : (
            ratio <= .33
              ? "critical"
              : (
                  ratio <= .66
                    ? "warning"
                    : "healthy"
                )
          );
  }

  function appendHpBar(
    container,
    hp,
    maxHp,
    { battle=false }={}
  ) {
    if (battle) {
      const ratio = hpRatio(hp, maxHp);
      container.classList.add("battle-module-card");
      container.style.setProperty(
        "--battle-hp-color",
        ratio <= .33
          ? "#ff5f6d"
          : ratio <= .66
            ? "#f0cb52"
            : "#60e58a"
      );
      applyHpVisual(container, hp, maxHp);
      return;
    }

    const bar=
      document.createElement(
        "span"
      );
    bar.className="hp-bar";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Modül CAN değeri");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", String(Math.max(1, Number(maxHp || 1))));
    bar.setAttribute("aria-valuenow", String(Math.max(0, Number(hp || 0))));
    bar.title = localizedMessage("battle.hp_bar_title", {hp:localizedNumber(Math.max(0, Math.round(Number(hp || 0)))), max:localizedNumber(Math.max(1, Math.round(Number(maxHp || 1))))});

    const fill=
      document.createElement(
        "span"
      );
    fill.className=
      "hp-bar-fill";
    const ratio=
      hpRatio(
        hp,
        maxHp
      );

    fill.style.width=
      `${Math.round(ratio*100)}%`;

    bar.appendChild(fill);
    container.appendChild(bar);

    applyHpVisual(
      container,
      hp,
      maxHp
    );
  }

  function definitionIdsToInstanceIds(
    ids
  ) {
    const idMap=new Map(
      selectablePoolModules.map(
        (module)=>[
          definitionIdFromInstanceId(
            module.instanceId
          ),
          module.instanceId,
        ]
      )
    );

    return (ids || [])
      .map((id)=>idMap.get(id))
      .filter(Boolean);
  }

  function selectedBattlePoolIdsForPreset() {
    return selectedBattlePoolDefinitionIds();
  }

  function canonicalPoolIds(
    ids
  ) {
    return [...(ids || [])]
      .map(String)
      .sort();
  }

  function selectedPoolMatchesBaseline() {
    if (!activeBattlePoolPresetName) {
      return false;
    }

    const current=
      canonicalPoolIds(
        selectedBattlePoolIdsForPreset()
      );
    const baseline=
      canonicalPoolIds(
        activeBattlePoolPresetBaseline
      );

    return (
      current.length === baseline.length
      && current.every(
        (value,index)=>
          value === baseline[index]
      )
    );
  }

  function renderQuickLoadoutActiveSummary() {
    if (!quickLoadoutActiveSummaryEl) {
      return;
    }

    if (!activeBattlePoolPresetName) {
      quickLoadoutActiveSummaryEl
        .dataset.state="none";
      const title = document.createElement("strong");
      title.textContent = localizedUiText("Aktif loadout yok");
      const hint = document.createElement("span");
      hint.textContent = localizedUiText("Hazır havuz seçtiğinde savaş öncesi özet burada görünecek.");
      quickLoadoutActiveSummaryEl.replaceChildren(title, hint);
      return;
    }

    const preset=
      battlePoolPresets.find(
        (item)=>
          item.name
          === activeBattlePoolPresetName
      );
    const clean=
      selectedPoolMatchesBaseline();
    const selectedCount=
      battlePoolSelection
        .selectedIds()
        .length;
    const ready=
      battlePoolSelection
        .isComplete();

    quickLoadoutActiveSummaryEl
      .dataset.state=
        ready
          ? (
              clean
                ? "ready"
                : "modified"
            )
          : "incomplete";

    const favorite=preset?.favorite ? localizedMessage("preset.favorite_prefix") : "";
    const freshness=
      preset?.last_used_at_ms
        ? presetLastUsedLabel(
            preset.last_used_at_ms
          )
        : localizedMessage("preset.never_used");

    const heading=document.createElement("strong");
    heading.textContent=`${favorite}${activeBattlePoolPresetName}`;
    const detail=document.createElement("span");
    detail.textContent=localizedMessage("preset.active_summary", {count:localizedNumber(selectedCount), state:localizedMessage(clean ? "preset.unchanged" : "preset.modified"), freshness});
    quickLoadoutActiveSummaryEl.replaceChildren(heading,detail);
  }

  function renderActivePresetState() {
    const hasActive=
      Boolean(
        activeBattlePoolPresetName
      );
    const clean=
      hasActive
      && selectedPoolMatchesBaseline();
    const activePreset = battlePoolPresets.find(
      (item) => item.name === activeBattlePoolPresetName
    );
    const enteredName=String(
      presetNameEl?.value || ""
    ).trim();
    const creatingNamedPreset=
      Boolean(enteredName)
      && enteredName
        !== activeBattlePoolPresetName;
    const poolComplete=
      battlePoolSelection.isComplete();

    if (activePresetEl) {
      activePresetEl.textContent=
        hasActive
          ? localizedMessage("preset.active_name", {name:activeBattlePoolPresetName})
          : localizedMessage("preset.no_active");
      activePresetEl.dataset.state=
        hasActive
          ? "active"
          : "none";
    }

    if (presetDirtyEl) {
      presetDirtyEl.textContent=
        !hasActive
          ? "Serbest seçim"
          : (
              clean
                ? "Kayıtla aynı"
                : "Değiştirildi"
            );
      presetDirtyEl.dataset.dirty=
        String(
          hasActive
          && !clean
        );
    }

    if (presetDeleteEl) {
      presetDeleteEl.disabled = Boolean(activePreset?.system);
      presetDeleteEl.title = activePreset?.system
        ? "Yerleşik başlangıç havuzu silinemez."
        : "";
    }

    if (
      presetSaveEl
      && creatingNamedPreset
    ) {
      presetSaveEl.textContent =
        "Yeni Hazır Havuzu Kaydet";
      presetSaveEl.disabled =
        !poolComplete;
    } else if (presetSaveEl && activePreset?.system) {
      presetSaveEl.textContent = "Yerleşik Hazır Havuz";
      presetSaveEl.disabled = true;
    } else if (
      presetSaveEl
      && hasActive
    ) {
      presetSaveEl.textContent=
        clean
          ? "Hazır Havuz Güncel"
          : "Değişiklikleri Üzerine Kaydet";
      presetSaveEl.disabled=
        clean;
    } else if (presetSaveEl) {
      presetSaveEl.textContent=
        "Hazır Havuz Kaydet";
      presetSaveEl.disabled=
        !poolComplete;
    }

    if (
      presetNameEl
      && hasActive
      && !presetNameEl.value
    ) {
      presetNameEl.placeholder=
        localizedMessage("preset.active_placeholder", {name:activeBattlePoolPresetName});
    }

    renderQuickLoadoutActiveSummary();
  }

  function presetLastUsedLabel(
    timestamp
  ) {
    if (!timestamp) {
      return "Henüz kullanılmadı";
    }

    const elapsed=
      Math.max(
        0,
        Date.now()
        - Number(timestamp)
      );
    const minutes=
      Math.floor(
        elapsed / 60000
      );

    if (minutes < 1) {
      return "Az önce kullanıldı";
    }
    if (minutes < 60) {
      return localizedMessage("time.minutes_ago", {count:minutes});
    }

    const hours=
      Math.floor(
        minutes / 60
      );
    if (hours < 24) {
      return localizedMessage("time.hours_ago", {count:localizedNumber(hours)});
    }

    const days=
      Math.floor(
        hours / 24
      );
    return localizedMessage("time.days_ago", {count:days});
  }

  async function updateBattlePoolPresetMeta(
    name,
    {
      favorite=null,
      markUsed=false,
    }={}
  ) {
    const existing = battlePoolPresets.find((preset) => preset.name === name);
    if (existing?.system) {
      battlePoolPresets = battlePoolPresets.map((preset) =>
        preset.name === name
          ? {
              ...preset,
              last_used_at_ms: markUsed ? Date.now() : preset.last_used_at_ms,
              use_count: markUsed ? Number(preset.use_count || 0) + 1 : Number(preset.use_count || 0),
            }
          : preset
      );
      renderPresetOptions();
      return { ok: true, preset: battlePoolPresets.find((preset) => preset.name === name) };
    }

    const response=await fetch(
      `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets/${encodeURIComponent(name)}/meta`,
      {
        method:"PATCH",
        headers:{
          "content-type":"application/json",
        },
        body:JSON.stringify({
          favorite,
          mark_used:markUsed,
        }),
      }
    );

    if (!response.ok) {
      return {
        ok:false,
      };
    }

    const payload=
      await response.json();
    battlePoolPresets=
      withStarterBattlePoolPresets(payload.presets);
    renderPresetOptions();

    return {
      ok:true,
      preset:payload.preset,
    };
  }

  function renderInitialPresetShortcuts() {
    if (!initialPresetShortcutsEl) return;

    initialPresetShortcutsEl.innerHTML = "";
    const presets = [...battlePoolPresets]
      .filter((preset) => !preset.system)
      .sort((a,b) =>
        Number(b.use_count || 0) - Number(a.use_count || 0)
        || Number(b.last_used_at_ms || 0) - Number(a.last_used_at_ms || 0)
        || String(a.name).localeCompare(String(b.name), "tr")
      )
      .slice(0,3);

    if (!presets.length) {
      const empty = document.createElement("p");
      empty.className = "initial-preset-empty";
      empty.textContent = "Henüz kayıtlı hazır havuz yok.";
      initialPresetShortcutsEl.appendChild(empty);
      return;
    }

    for (const preset of presets) {
      const row = document.createElement("article");
      row.className = "initial-preset-card";
      row.dataset.active = String(preset.name === activeBattlePoolPresetName);

      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = preset.name;
      const meta = document.createElement("span");
      const count = Number(preset.use_count || 0);
      meta.textContent = localizedMessage("preset.module_use_count", {modules:localizedNumber(preset.module_definition_ids.length), uses:localizedNumber(count)});
      text.append(title, meta);

      const use = document.createElement("button");
      use.type = "button";
      use.textContent = preset.name === activeBattlePoolPresetName ? "Seçili" : "Seç";
      use.disabled = preset.name === activeBattlePoolPresetName;
      use.addEventListener("click", () => {
        if (presetSelectEl) presetSelectEl.value = preset.name;
        loadSelectedBattlePoolPreset(preset.name);
      });

      row.append(text, use);
      initialPresetShortcutsEl.appendChild(row);
    }
  }

  function renderPresetGallery() {
    if (!presetGalleryEl) {
      return;
    }

    presetGalleryEl.innerHTML="";

    if (!battlePoolPresets.length) {
      const empty=
        document.createElement(
          "p"
        );
      empty.className=
        "preset-gallery-empty";
      empty.textContent=
        "Henüz hazır deste yok. 6/6 seçim yaptıktan sonra ilk desteni kaydet.";
      presetGalleryEl.appendChild(
        empty
      );
      return;
    }

    for (
      const preset
      of battlePoolPresets
    ) {
      const card=
        document.createElement(
          "article"
        );
      card.className=
        "preset-card";
      card.dataset.presetName=
        preset.name;
      card.dataset.active=
        String(
          preset.name
          === activeBattlePoolPresetName
        );

      const top=
        document.createElement(
          "div"
        );
      top.className=
        "preset-card-top";

      const title=
        document.createElement(
          "strong"
        );
      title.textContent=
        preset.name;

      const favorite=
        document.createElement(
          "button"
        );
      favorite.type="button";
      favorite.className=
        "preset-favorite";
      favorite.dataset.favorite=
        String(
          Boolean(
            preset.favorite
          )
        );
      favorite.textContent=
        preset.favorite
          ? "★"
          : "☆";
        favorite.title=
        preset.system
          ? "Yerleşik başlangıç havuzu"
          : preset.favorite
          ? "Favoriden çıkar"
          : "Favoriye ekle";
      favorite.disabled = Boolean(preset.system);
      favorite.addEventListener(
        "click",
        async (event) => {
          event.stopPropagation();
          await updateBattlePoolPresetMeta(
            preset.name,
            {
              favorite:
                !preset.favorite,
            }
          );
        }
      );

      top.append(
        title,
        favorite
      );

      const meta=
        document.createElement(
          "span"
        );
      meta.className=
        "preset-card-meta";
      meta.textContent=localizedMessage("preset.module_last_used", {modules:localizedNumber(preset.module_definition_ids.length), last:presetLastUsedLabel(preset.last_used_at_ms)});

      const actions=
        document.createElement(
          "div"
        );
      actions.className=
        "preset-card-actions";

      const use=
        document.createElement(
          "button"
        );
      use.type="button";
      use.textContent=
        preset.name
        === activeBattlePoolPresetName
          ? "Aktif"
          : "Yükle";
      use.disabled=
        preset.name
        === activeBattlePoolPresetName;
      use.addEventListener(
        "click",
        () => {
          if (presetSelectEl) {
            presetSelectEl.value=
              preset.name;
          }
          loadSelectedBattlePoolPreset(
            preset.name
          );
        }
      );

      actions.appendChild(use);

      card.append(
        top,
        meta,
        actions
      );

      card.addEventListener(
        "dblclick",
        () => {
          if (presetSelectEl) {
            presetSelectEl.value=
              preset.name;
          }
          loadSelectedBattlePoolPreset(
            preset.name
          );
        }
      );

      presetGalleryEl.appendChild(
        card
      );
    }
  }

  function renderQuickLoadoutGallery() {
    if (!quickLoadoutGalleryEl) {
      return;
    }

    quickLoadoutGalleryEl.innerHTML="";

    const lastUsedPreset=
      [...battlePoolPresets]
        .filter(
          (item)=>
            item.last_used_at_ms
        )
        .sort(
          (a,b)=>
            Number(
              b.last_used_at_ms || 0
            )
            - Number(
                a.last_used_at_ms || 0
              )
        )[0];

    const source=
      quickLoadoutFilter
      === "favorites"
        ? battlePoolPresets.filter(
            (item)=>item.favorite
          )
        : battlePoolPresets;

    const quickPresets=
      source.slice(0,4);

    if (quickLoadoutFilterAllEl) {
      quickLoadoutFilterAllEl
        .dataset.active=
          String(
            quickLoadoutFilter
            === "all"
          );
    }
    if (quickLoadoutFilterFavoritesEl) {
      quickLoadoutFilterFavoritesEl
        .dataset.active=
          String(
            quickLoadoutFilter
            === "favorites"
          );
    }

    if (!quickPresets.length) {
      const empty=
        document.createElement(
          "p"
        );
      empty.className=
        "quick-loadout-empty";
      empty.textContent=
        quickLoadoutFilter
        === "favorites"
          ? "Henüz favori hazır havuzun yok."
          : "Hazır havuz oluşturduğunda favorilerin ve son kullandıkların burada görünecek.";
      quickLoadoutGalleryEl
        .appendChild(
          empty
        );
      if (quickLoadoutStatusEl) {
        quickLoadoutStatusEl.textContent=
          "Hazır loadout yok";
      }
      renderQuickLoadoutActiveSummary();
      return;
    }

    if (quickLoadoutStatusEl) {
      const favoriteCount=
        battlePoolPresets.filter(
          (item)=>item.favorite
        ).length;
      quickLoadoutStatusEl.textContent=
        localizedMessage("preset.favorite_registered_count", {favorites:localizedNumber(favoriteCount), registered:localizedNumber(battlePoolPresets.length)});
    }

    for (
      const preset
      of quickPresets
    ) {
      const card=
        document.createElement(
          "article"
        );
      card.className=
        "quick-loadout-card";
      card.dataset.active=
        String(
          preset.name
          === activeBattlePoolPresetName
        );

      const badgeRow=
        document.createElement(
          "div"
        );
      badgeRow.className=
        "quick-loadout-badges";

      if (preset.favorite) {
        const favoriteBadge=
          document.createElement(
            "span"
          );
        favoriteBadge.textContent=
          "★ Favori";
        favoriteBadge.dataset.kind=
          "favorite";
        badgeRow.appendChild(
          favoriteBadge
        );
      }

      if (
        lastUsedPreset
        && lastUsedPreset.name
        === preset.name
      ) {
        const recentBadge=
          document.createElement(
            "span"
          );
        recentBadge.textContent=
          "Son Kullanılan";
        recentBadge.dataset.kind=
          "recent";
        badgeRow.appendChild(
          recentBadge
        );
      }

      if (
        preset.name
        === activeBattlePoolPresetName
      ) {
        const activeBadge=
          document.createElement(
            "span"
          );
        activeBadge.textContent=
          "Aktif";
        activeBadge.dataset.kind=
          "active";
        badgeRow.appendChild(
          activeBadge
        );
      }

      const title=
        document.createElement(
          "strong"
        );
      title.textContent=
        preset.name;

      const meta=
        document.createElement(
          "span"
        );
      meta.textContent=localizedMessage("preset.module_last_used", {modules:localizedNumber(preset.module_definition_ids.length), last:presetLastUsedLabel(preset.last_used_at_ms)});

      const actions=
        document.createElement(
          "div"
        );
      actions.className=
        "quick-loadout-actions";

      for (
        const mode
        of [
          {
            id:"local",
            label:"Tek Oyunculu",
          },
          {
            id:"online",
            label:"PvP",
          },
        ]
      ) {
        const button=
          document.createElement(
            "button"
          );
        button.type="button";
        button.textContent=
          mode.label;
        button.addEventListener(
          "click",
          async () => {
            if (presetSelectEl) {
              presetSelectEl.value=
                preset.name;
            }

            await loadSelectedBattlePoolPreset(
              preset.name
            );

            setActivePlayMode(
              mode.id
            );

            if (presetStatusEl) {
              presetStatusEl.textContent=
                localizedMessage("preset.quick_loaded", {name:preset.name});
            }
          }
        );
        actions.appendChild(
          button
        );
      }

      card.append(
        badgeRow,
        title,
        meta,
        actions
      );
      quickLoadoutGalleryEl
        .appendChild(
          card
        );
    }

    renderQuickLoadoutActiveSummary();
  }


  function renderPresetOptions() {
    if (!presetSelectEl) return;

    const current=
      presetSelectEl.value;
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = localizedUiText("Hazır havuz seç...");
    presetSelectEl.replaceChildren(emptyOption);

    for (
      const preset
      of battlePoolPresets
    ) {
      const option=
        document.createElement(
          "option"
        );
      option.value=preset.name;
      option.textContent=
        (
          preset.name === activeBattlePoolPresetName
            ? "★ "
            : ""
        )
        + localizedMessage("preset.option_count", {name:preset.name, count:localizedNumber(preset.module_definition_ids.length)});
      presetSelectEl.appendChild(
        option
      );
    }

    if (
      battlePoolPresets.some(
        (item)=>item.name===current
      )
    ) {
      presetSelectEl.value=current;
    }

    renderActivePresetState();
    renderPresetGallery();
    renderInitialPresetShortcuts();
    renderQuickLoadoutGallery();
    renderMetaHubScreens();
  }

  async function loadBattlePoolPresets() {
    try {
      const payload=await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`
      );
      battlePoolPresets=
        withStarterBattlePoolPresets(payload.presets);
      renderPresetOptions();

      if (presetStatusEl) {
        presetStatusEl.textContent=
          battlePoolPresets.length
            ? localizedMessage("preset.registered_count", {count:localizedNumber(battlePoolPresets.length)})
            : "Henüz kayıtlı hazır havuz yok.";
      }
      return {ok:true};
    } catch (error) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Hazır havuzlar yüklenemedi.";
      }
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async function saveCurrentBattlePoolPreset() {
    const enteredName=
      String(
        presetNameEl?.value || ""
      ).trim();
    const name=
      enteredName
      || activeBattlePoolPresetName
      || "";

    if (
      !battlePoolSelection.isComplete()
    ) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Kaydetmek için deste 6/6 olmalı.";
      }
      return;
    }

    if (!name) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Hazır havuza bir isim ver.";
      }
      return;
    }

    try {
      const response=await fetch(
        `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`,
        {
          method:"PUT",
          headers:{
            "content-type":
              "application/json",
          },
          body:JSON.stringify({
            name,
            battle_pool_ids:
              selectedBattlePoolIdsForPreset(),
          }),
        }
      );

      if (!response.ok) {
        let errorPayload={};
        try {
          errorPayload=await response.json();
        } catch (_error) {
          // Non-JSON server errors use the generic message below.
        }
        throw new Error(localizedApiError(errorPayload, response.status));
      }

      const payload=
        await response.json();
      const savedName=
        payload?.preset?.name
        || name;
      battlePoolPresets=
        withStarterBattlePoolPresets(payload.presets);
      activeBattlePoolPresetName=
        savedName;
      activeBattlePoolPresetBaseline=
        [...selectedBattlePoolIdsForPreset()];
      renderPresetOptions();
      if (presetSelectEl) {
        presetSelectEl.value=
          savedName;
      }
      if (presetNameEl) {
        presetNameEl.value="";
      }
      renderActivePresetState();
      if (presetStatusEl) {
        presetStatusEl.textContent=localizedMessage("preset.saved", {name:savedName});
      }
      return {
        ok:true,
        name:savedName,
      };
    } catch (error) {
      const reason=
        error instanceof Error
          ? error.message
          : String(error);
      if (presetStatusEl) {
        presetStatusEl.textContent=
          localizedMessage("preset.save_failed_reason", {reason:localizedUiText(reason)});
      }
      return {
        ok:false,
        reason,
      };
    }
  }

  async function loadSelectedBattlePoolPreset(
    explicitName=null
  ) {
    const name=
      explicitName
      || presetSelectEl?.value;
    const preset=
      battlePoolPresets.find(
        (item)=>item.name===name
      );

    if (!preset) return;

    const instanceIds=
      definitionIdsToInstanceIds(
        preset.module_definition_ids
      );
    const result=
      battlePoolSelection
        .setSelection(
          instanceIds
        );

    if (!result.ok) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          result.reason;
      }
      return;
    }

    activeBattlePoolPresetName=
      name;
    activeBattlePoolPresetBaseline=
      [...preset.module_definition_ids];
    syncDeckEditorFromSelection();

    try {
      await persistBattlePoolDefinitionIds(
        preset.module_definition_ids
      );
      await updateBattlePoolPresetMeta(
        name,
        {
          markUsed:true,
        }
      );
    } catch (error) {
      if (presetStatusEl) {
        presetStatusEl.textContent=localizedMessage("preset.server_save_failed", {reason:error instanceof Error ? error.message : String(error)});
      }
      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    renderBattlePoolSelection();
    renderPresetOptions();
    if (presetStatusEl) {
      presetStatusEl.textContent=
        localizedMessage("preset.loaded", {name});
    }
    return {
      ok:true,
      name,
    };
  }

  async function deleteSelectedBattlePoolPreset() {
    const name=
      presetSelectEl?.value
      || activeBattlePoolPresetName;
    if (!name) return;
    const selectedPreset = battlePoolPresets.find((preset) => preset.name === name);
    if (selectedPreset?.system) {
      if (presetStatusEl) {
        presetStatusEl.textContent = "Yerleşik başlangıç havuzu silinemez.";
      }
      return;
    }

    const response=await fetch(
      `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets/${encodeURIComponent(name)}`,
      {
        method:"DELETE",
      }
    );

    if (!response.ok) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Hazır havuz silinemedi.";
      }
      return;
    }

    const payload=
      await response.json();
    battlePoolPresets=
      withStarterBattlePoolPresets(payload.presets);

    if (
      activeBattlePoolPresetName
      === name
    ) {
      activeBattlePoolPresetName=
        null;
      activeBattlePoolPresetBaseline=
        [];
    }

    renderPresetOptions();

    if (presetStatusEl) {
      presetStatusEl.textContent=localizedMessage("preset.deleted", {name});
    }
  }

  async function renameSelectedBattlePoolPreset() {
    const oldName=
      presetSelectEl?.value
      || activeBattlePoolPresetName;
    const newName=
      String(
        presetRenameEl?.value || ""
      ).trim();

    if (!oldName) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Yeniden adlandırmak için hazır havuz seç.";
      }
      return;
    }

    if (battlePoolPresets.find((preset) => preset.name === oldName)?.system) {
      if (presetStatusEl) {
        presetStatusEl.textContent = "Yerleşik başlangıç havuzu yeniden adlandırılamaz.";
      }
      return;
    }

    if (!newName) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Yeni hazır havuz adını yaz.";
      }
      return;
    }

    const response=await fetch(
      `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets/rename`,
      {
        method:"PATCH",
        headers:{
          "content-type":"application/json",
        },
        body:JSON.stringify({
          old_name:oldName,
          new_name:newName,
        }),
      }
    );

    if (!response.ok) {
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Hazır havuz yeniden adlandırılamadı.";
      }
      return;
    }

    const payload=
      await response.json();
    battlePoolPresets=
      withStarterBattlePoolPresets(payload.presets);

    if (
      activeBattlePoolPresetName
      === oldName
    ) {
      activeBattlePoolPresetName=
        newName;
    }

    renderPresetOptions();
    presetSelectEl.value=
      newName;
    presetRenameEl.value="";

    if (presetStatusEl) {
      presetStatusEl.textContent=
        localizedMessage("preset.renamed", {old:oldName, name:newName});
    }
  }

  function poolCategoryLabel(
    category
  ) {
    const labels = {
      enerji:"Sistem",
      sistem:"Sistem",
      saldırı:"Saldırı",
      savunma:"Savunma",
      destek:"Destek",
      sabotaj:"Sabotaj",
    };
    const value=labels[category]
      || category;
    return globalThis.GridshardI18n
      ?.translateText(
        value,
        document.documentElement.lang
      ) || value;
  }

  function localizedUiText(value) {
    return globalThis.GridshardI18n
      ?.translateText(
        String(value ?? ""),
        document.documentElement.lang
      ) || String(value ?? "");
  }

  function definitionIdFromInstanceId(
    instanceId
  ) {
    return String(
      instanceId || ""
    ).replace(
      /-1$/,
      ""
    ).replaceAll(
      "-",
      "_"
    );
  }

  function catalogForModule(
    module
  ) {
    return moduleCatalogById.get(
      definitionIdFromInstanceId(
        module.instanceId
      )
    ) || null;
  }

  async function loadModuleCatalog() {
    try {
      const response =
        await fetch(
          "/game/module-catalog"
        );

      if (!response.ok) {
        throw new Error(
          "Modül kataloğu alınamadı."
        );
      }

      const payload =
        await response.json();

      moduleCatalogById.clear();

      for (
        const item
        of payload.modules || []
      ) {
        moduleCatalogById.set(
          item.id,
          item
        );
      }

      if (poolCatalogSourceEl) {
        poolCatalogSourceEl.textContent =
          "Sayısal değerler aktif sunucu savaş motoru kataloğundan doğrulandı.";
        poolCatalogSourceEl.dataset.status =
          "ready";
      }

      renderBattlePoolSelection();

      return {
        ok:true,
        count:
          moduleCatalogById.size,
      };
    } catch (error) {
      if (poolCatalogSourceEl) {
        poolCatalogSourceEl.textContent = localizedMessage("pool.catalog_fallback");
        poolCatalogSourceEl.dataset.status =
          "fallback";
      }

      return {
        ok:false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  function focusedPoolModule() {
    return selectablePoolModules
      .find(
        (module) =>
          module.instanceId
          === focusedPoolModuleId
      )
      || selectablePoolModules[0];
  }

  function fallbackPoolModuleDescription(
    module
  ) {
    if (
      module.instanceId
      === "generator-1"
    ) {
      return (
        "Devrenin sabit başlangıç enerji kaynağıdır. Çekirdek tüm aktif hücrelere otomatik enerji iletir."
      );
    }

    return localizedMessage("pool.module_description", {role:localizedUiText(module.strategicRole), hp:localizedNumber(module.maxHp), cost:localizedNumber(module.circuitCreditCost)});
  }

  function setTextOrDash(
    element,
    value
  ) {
    if (!element) return;
    element.textContent =
      value === null
      || value === undefined
      || value === ""
        ? "—"
        : String(value);
  }

  function renderBattlePoolDetail() {
    const module =
      focusedPoolModule();

    if (!module) {
      return;
    }

    const catalog =
      catalogForModule(
        module
      );
    const englishCatalog = document.documentElement?.lang === "en";

    const selected =
      battlePoolSelection
        .selected
        .has(
          module.instanceId
        );
    const required =
      battlePoolSelection
        .requiredModuleIds
        .has(
          module.instanceId
        );

    poolDetailNameEl.textContent =
      localizedUiText(module.nameTr);
    poolDetailCategoryEl.textContent =
      poolCategoryLabel(
        module.category
      );
    poolDetailClassEl.textContent =
      poolCategoryLabel(
        module.category
      );

    poolDetailHpEl.textContent =
      `${catalog?.max_hp ?? module.maxHp}`;
    poolDetailCostEl.textContent=localizedMessage("currency.current", {amount:localizedNumber(catalog?.circuit_credit_cost ?? module.circuitCreditCost)});
    renderBattlePoolModulePreview(
      module,
      catalog
    );

    setTextOrDash(
      poolDetailEnergyGenerationEl,
      catalog
        ? `${catalog.energy_generation || 0}/${localizedUiText("sn")}`
        : localizedMessage("pool.catalog_loading")
    );
    setTextOrDash(
      poolDetailEnergyConsumptionEl,
      catalog
        ? `${catalog.energy_consumption || 0}/${localizedUiText("sn")}`
        : localizedMessage("pool.catalog_loading")
    );
    setTextOrDash(
      poolDetailDamageEl,
      catalog
        ? (
            catalog.base_damage > 0
              ? `${catalog.base_damage}`
              : localizedMessage("pool.no_direct_damage")
          )
        : localizedMessage("pool.catalog_loading")
    );
    setTextOrDash(
      poolDetailCooldownEl,
      catalog
        ? (
            catalog.cooldown_ms > 0
              ? localizedMessage("time.seconds_short", {count:localizedNumber(catalog.cooldown_ms / 1000, {maximumFractionDigits:1})})
              : localizedMessage("pool.no_cooldown")
          )
        : localizedMessage("pool.catalog_loading")
    );

    poolDetailRoleEl.textContent =
      localizedUiText(
        (englishCatalog ? catalog?.strategic_role_en : catalog?.strategic_role)
        || module.strategicRole
      );

    poolDetailDescriptionEl.textContent =
      localizedUiText(
        (englishCatalog ? catalog?.description_en : catalog?.description_tr)
        || fallbackPoolModuleDescription(
          module
        )
      );

    if (poolDetailEffectsEl) {
      poolDetailEffectsEl.innerHTML =
        "";

      const lines =
        (englishCatalog ? catalog?.effect_lines_en : catalog?.effect_lines)
        || [
          localizedMessage("pool.effects_loading"),
        ];

      for (const line of lines) {
        const li =
          document.createElement(
            "li"
          );
        li.textContent =
          localizedUiText(line);
        poolDetailEffectsEl.appendChild(
          li
        );
      }
    }

    setTextOrDash(
      poolDetailStrongEl,
      catalog?.strong_against?.length
        ? catalog.strong_against.map(localizedUiText).join(", ")
        : localizedMessage("pool.no_strong_matchup")
    );
    setTextOrDash(
      poolDetailWeakEl,
      catalog?.weak_against?.length
        ? catalog.weak_against.map(localizedUiText).join(", ")
        : localizedMessage("pool.no_weak_matchup")
    );
    setTextOrDash(
      poolDetailSynergyEl,
      catalog?.synergy_with?.length
        ? catalog.synergy_with.map(localizedUiText).join(", ")
        : localizedMessage("pool.no_synergy")
    );

  }


  function createPoolCategoryGroup(
    category,
    title,
    {
      scope="global",
      count=0,
    }={}
  ) {
    const section =
      document.createElement(
        "details"
      );
    section.className =
      "pool-category-group";
    section.dataset.category =
      category;
    section.dataset.scope =
      scope;
    const collapsed =
      collapsedPoolCategories[scope]
      || collapsedPoolCategories.global;
    section.open =
      !collapsed.has(category);
    section.addEventListener(
      "toggle",
      () => {
        if (section.open) {
          collapsed.delete(category);
        } else {
          collapsed.add(category);
        }
      }
    );

    const heading =
      document.createElement(
        "summary"
      );
    heading.className =
      "pool-category-title";
    heading.textContent =localizedMessage("pool.category_heading", {title:localizedUiText(title), count:localizedNumber(count)});

    const list =
      document.createElement(
        "div"
      );
    list.className =
      "pool-category-list";

    section.append(
      heading,
      list
    );

    return {
      section,
      list,
    };
  }

  function availableInitialBattleModuleIds() {
    return [];
  }

  function moduleRarityLabel(rarity) {
    return ({
      common: "Yaygın",
      rare: "Nadir",
      epic: "Epik",
      legendary: "Efsanevi",
    })[String(rarity || "").toLowerCase()] || "Yaygın";
  }

  function localizedArenaRewardDescription(node) {
    if (!node) return "";
    if (document.documentElement.lang !== "en" || node.description_en) {
      return localizedRecordText(node, "description");
    }
    // Older arena reward nodes only contain Turkish copy. Compose the English
    // label from their reward payload so amounts and targeted cards stay exact.
    const rewards = node.rewards || {};
    const parts = [];
    if (Number(rewards.circuit_credits) > 0) {
      parts.push(localizedMessage("arena.reward_credits", {amount:localizedNumber(rewards.circuit_credits)}));
    }
    if (Number(rewards.flux_shards) > 0) {
      parts.push(localizedMessage("arena.reward_flux", {amount:localizedNumber(rewards.flux_shards)}));
    }
    if (Number(rewards.module_shards) > 0) {
      const target = rewards.module_shard_target;
      const name = target && moduleDefinitions.find((item) => item.definitionId === target)?.nameTr;
      parts.push(localizedMessage(name ? "arena.reward_targeted_shards" : "arena.reward_module_shards", {
        amount:localizedNumber(rewards.module_shards),
        name:localizedUiText(name || ""),
      }));
    }
    if (rewards.chest_id) {
      const chestName = metaProgressionState?.chests?.definitions?.find((item) => item.id === rewards.chest_id);
      const fallback = ({field_3h:"Bronz Sandık", circuit_8h:"Gümüş Sandık", core_24h:"Altın Sandık", diamond_24h:"Elmas Sandık"})[rewards.chest_id];
      parts.push(localizedRecordText(chestName, "name") || localizedUiText(fallback || "Sandık"));
    }
    return parts.length ? parts.join(" + ") : localizedRecordText(node, "description");
  }

  function normalizeInitialBattleModuleIds() {
    initialBattleModuleIds = [];
    return [];
  }

  function renderInitialModulePicker() {
    const root = document.getElementById("initial-module-picker");
    const status = document.getElementById("initial-module-status");
    if (!root) return;

    root.innerHTML = "";
    root.hidden = true;

    if (status) {
      status.textContent = localizedUiText("Çekirdek sabit başlar; diğer modülleri sistem uygun boş hücrelere otomatik yerleştirir");
      status.dataset.ready = "true";
    }
  }

  function renderBattlePoolSelection() {
    if (
      !poolSelectionEl
      || !poolSelectedEl
    ) {
      return;
    }

    poolSelectionEl.innerHTML =
      "";
    poolSelectedEl.innerHTML =
      "";

    for (
      const category
      of POOL_CATEGORY_ORDER
    ) {
      const modules =
        selectablePoolModules
          .filter(
            (module) =>
              module.category
              === category
          )
          .sort(
            (a,b) =>
              localizedUiText(a.nameTr).localeCompare(
                localizedUiText(b.nameTr),
                document.documentElement.lang === "en" ? "en" : "tr"
              )
          );

      if (!modules.length) {
        continue;
      }

      const group =
        createPoolCategoryGroup(
          category,
          poolCategoryLabel(
            category
          ),
          {
            scope:"global",
            count:modules.length,
          }
        );

      for (const module of modules) {
        const button =
          document.createElement(
            "button"
          );
        button.type =
          "button";
        button.className =
          "pool-choice pool-module-card";

        const selected =
          battlePoolSelection
            .selected
            .has(
              module.instanceId
            );
        const focused =
          module.instanceId
          === focusedPoolModuleId;

        const icon=
          document.createElement(
            "span"
          );
        icon.className=
          "module-icon pool-module-icon";
        icon.textContent=
          moduleIconFor(module);
        icon.setAttribute(
          "aria-hidden",
          "true"
        );

        const label=
          document.createElement(
            "span"
          );
        label.className=
          "pool-choice-name";
        label.textContent=
          localizedUiText(module.nameTr);

        const categoryLabel=
          document.createElement(
            "span"
          );
        categoryLabel.className=
          "pool-module-category";
        categoryLabel.textContent=
          poolCategoryLabel(
            module.category
          );

        const selectMark=
          document.createElement(
            "span"
          );
        selectMark.className=
          "pool-choice-select";
        const required=
          battlePoolSelection
            .requiredModuleIds
            .has(
              module.instanceId
            );

        selectMark.textContent=
          required
            ? "◆"
            : (
                selected
                  ? "✓"
                  : "+"
              );
        selectMark.title=localizedUiText(
          required
            ? "Zorunlu modül · çıkarılamaz"
            : (
                selected
                  ? "Savaş Havuzuna eklendi"
                  : "Havuza ekle"
              )
        );
        selectMark.dataset.action=
          required
            ? "required"
            : (
                selected
                  ? "selected"
                  : "add"
              );
        selectMark.setAttribute(
          "aria-disabled",
          String(
            required
            || selected
          )
        );

        const catalog=
          catalogForModule(
            module
          );

        button.append(
          icon,
          label,
          categoryLabel,
          selectMark
        );
        appendHpBar(
          button,
          catalog?.max_hp
            ?? module.maxHp,
          catalog?.max_hp
            ?? module.maxHp
        );

        button.dataset.category =
          module.category;
        button.setAttribute(
          "aria-label",
          `${localizedUiText(module.nameTr)} · ${poolCategoryLabel(module.category)}`
        );
        button.title =
          `${localizedUiText(module.nameTr)} · ${poolCategoryLabel(module.category)}`;

        if (selected) {
          button.classList.add(
            "selected"
          );
        }
        if (focused) {
          button.classList.add(
            "focused"
          );
        }

        if (
          battlePoolSelection
            .requiredModuleIds
            .has(
              module.instanceId
            )
        ) {
          button.classList.add(
            "required"
          );
          button.title =
            localizedMessage("pool.required_start", {name:localizedUiText(module.nameTr)});
        }

        button.addEventListener(
          "click",
          () => {
            focusedPoolModuleId =
              module.instanceId;
            renderBattlePoolSelection();
          }
        );

        selectMark.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();

            if (
              selectMark.dataset.action
              === "required"
            ) {
              logClientMessage(
                "Çekirdek sabittir; diğer modüller Savaş Havuzundan seçilebilir."
              );
              return;
            }

            if (
              selectMark.dataset.action
              === "selected"
            ) {
              logClientMessage(
                "Modülü sağdaki seçili Savaş Havuzunda − ile çıkarabilirsin."
              );
              return;
            }

            const result=
              battlePoolSelection.toggle(
                module.instanceId
              );

            if (!result.ok) {
              logClientMessage(
                result.reason
              );
            }

            focusedPoolModuleId=
              module.instanceId;
            renderBattlePoolSelection();
          }
        );

        group.list.appendChild(
          button
        );
      }

      poolSelectionEl.appendChild(
        group.section
      );
    }

    for (
      const category
      of POOL_CATEGORY_ORDER
    ) {
      const selectedModules =
        battlePoolSelection
          .selectedIds()
          .map(
            (moduleId) =>
              selectablePoolModules
                .find(
                  (item) =>
                    item.instanceId
                    === moduleId
                )
          )
          .filter(
            (module) =>
              module
              && module.category
                === category
          )
          .sort(
            (a,b) =>
              localizedUiText(a.nameTr).localeCompare(
                localizedUiText(b.nameTr),
                document.documentElement.lang === "en" ? "en" : "tr"
              )
          );

      if (!selectedModules.length) {
        continue;
      }

      const group =
        createPoolCategoryGroup(
          category,
          poolCategoryLabel(
            category
          ),
          {
            scope:"selected",
            count:selectedModules.length,
          }
        );

      for (
        const module
        of selectedModules
      ) {
        const chip =
          document.createElement(
            "button"
          );
        chip.type =
          "button";
        chip.className =
          "pool-selected-item pool-module-card";
        chip.dataset.category =
          module.category;
        const chipIcon=
          document.createElement(
            "span"
          );
        chipIcon.className=
          "module-icon pool-module-icon";
        chipIcon.textContent=
          moduleIconFor(module);
        chipIcon.setAttribute(
          "aria-hidden",
          "true"
        );
        const chipName=
          document.createElement(
            "span"
          );
        chipName.className=
          "pool-selected-name";
        chipName.textContent=
          localizedUiText(module.nameTr);
        const chipCategory=
          document.createElement(
            "span"
          );
        chipCategory.className=
          "pool-module-category";
        chipCategory.textContent=
          poolCategoryLabel(
            module.category
          );
        const required=
          battlePoolSelection
            .requiredModuleIds
            .has(
              module.instanceId
            );
        const removeMark=
          document.createElement(
            "span"
          );
        removeMark.className=
          "pool-selected-remove";
        removeMark.textContent=
          required
            ? "◆"
            : "−";
        removeMark.title=localizedUiText(
          required
            ? "Zorunlu modül · çıkarılamaz"
            : "Havuzdan çıkar"
        );
        removeMark.dataset.action=
          required
            ? "required"
            : "remove";
        removeMark.setAttribute(
          "aria-disabled",
          String(required)
        );
        chip.append(
          chipIcon,
          chipName,
          chipCategory,
          removeMark
        );
        chip.setAttribute(
          "aria-label",
          `${localizedUiText(module.nameTr)} · ${poolCategoryLabel(module.category)}`
        );
        chip.title =
          `${localizedUiText(module.nameTr)} · ${poolCategoryLabel(module.category)}`;

        const catalog=
          catalogForModule(
            module
          );
        appendHpBar(
          chip,
          catalog?.max_hp
            ?? module.maxHp,
          catalog?.max_hp
            ?? module.maxHp
        );

        chip.addEventListener(
          "click",
          () => {
            focusedPoolModuleId =
              module.instanceId;
            renderBattlePoolSelection();
          }
        );
        removeMark.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();
            if (required) {
              logClientMessage(
                "Çekirdek sabittir; diğer modüller Savaş Havuzundan seçilebilir."
              );
              return;
            }
            const result=
              battlePoolSelection.toggle(
                module.instanceId
              );
            if (!result.ok) {
              logClientMessage(
                result.reason
              );
            }
            focusedPoolModuleId=
              module.instanceId;
            renderBattlePoolSelection();
          }
        );
        group.list.appendChild(
          chip
        );
      }

      poolSelectedEl.appendChild(
        group.section
      );
    }

    poolCountEl.textContent =
      `${battlePoolSelection.selected.size} / ${battlePoolSelection.requiredSize}`;

    renderInitialModulePicker();

    poolConfirmEl.disabled =
      !battlePoolSelection
        .isComplete();

    if (
      activePlayMode
      === "local"
    ) {
      poolConfirmEl.dataset.matchmaking = "false";
      poolConfirmEl.textContent =
        localizedUiText("Savaş");
    } else if (
      activePlayMode
      === "online"
    ) {
      renderPoolPrimaryAction(document.body.dataset.onlineStatus);
    } else {
      poolConfirmEl.dataset.matchmaking = "false";
      poolConfirmEl.textContent =
        localizedUiText("Önce Maç Modu Seç");
    }

    renderBattlePoolDetail();
    renderActivePresetState();
  }

  function boosterOfferDueAtMs(index) {
    return BOOSTER_FIRST_OFFER_MS + index * BOOSTER_OFFER_INTERVAL_MS;
  }

  function rotatingBoosterOfferIds(index) {
    const offset = Math.max(0, Number(index) || 0) % BOOSTER_OPTIONS.length;
    const rotated = BOOSTER_OPTIONS.slice(offset).concat(BOOSTER_OPTIONS.slice(0, offset));
    return rotated.slice(0, BOOSTER_OPTIONS_PER_OFFER).map((booster) => booster.id);
  }

  function updateBoosterOfferAvailability() {
    if (localServerAuthoritative) return;
    const dueAtMs = boosterOfferDueAtMs(nextBoosterOfferIndex);
    if (!boosterOfferOpen && client.elapsedMs >= dueAtMs) {
      boosterOfferOpen = true;
      clearBoosterTargetMode("offer_opened");
      activeBoosterOfferIds = new Set(rotatingBoosterOfferIds(nextBoosterOfferIndex));
      boosterStatusEl.textContent = localizedUiText("HAZIR · 3 seçenekten 1'ini seç");
      renderBoosterOptions();
    } else if (!boosterOfferOpen) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((dueAtMs - client.elapsedMs) / 1000)
      );
      boosterStatusEl.textContent = localizedMessage("battle.booster_unlock_seconds", {seconds:localizedNumber(remainingSeconds)});
    }
  }

  function renderBattlePoolModulePreview(module, catalog) {
    if (!poolDetailPreviewEl) return;

    poolDetailPreviewEl.innerHTML = "";
    const card = document.createElement("div");
    card.className = "pool-detail-preview-card";
    card.dataset.category = module.category || "";

    const icon = document.createElement("span");
    icon.className = "module-icon pool-detail-preview-icon";
    icon.textContent = moduleIconFor(module);
    icon.setAttribute("aria-hidden", "true");

    card.append(icon);

    poolDetailPreviewEl.setAttribute(
      "aria-label",
      localizedMessage("pool.module_preview_aria", {name:localizedUiText(module.nameTr)})
    );
    poolDetailPreviewEl.appendChild(card);
  }

  function syncBoosterOfferFromSnapshot(player) {
    const authoritativeOfferIndex = Number(
      player?.next_booster_offer_index
    );
    if (
      Number.isInteger(authoritativeOfferIndex)
      && authoritativeOfferIndex >= 0
    ) {
      nextBoosterOfferIndex = authoritativeOfferIndex;
    }
    const offer = player?.pending_booster_offer || null;
    if (offer) {
      const offerId = String(offer.id || "");
      const offerChanged = serverBoosterOfferId !== offerId;
      serverBoosterOfferId = offerId;
      activeBoosterOfferIds = new Set((offer.booster_ids || []).map(String));
      serverBoosterEligibleTargets = new Map(
        Object.entries(offer.eligible_target_module_ids || {}).map(
          ([boosterId, moduleIds]) => [
            boosterId,
            new Set((moduleIds || []).map(String)),
          ]
        )
      );
      boosterOfferOpen = true;
      if (offerChanged) clearBoosterTargetMode("offer_changed");
      const optionCount = activeBoosterOfferIds.size || (offer.booster_ids || []).length || 0;
      boosterStatusEl.textContent = localizedUiText(boosterTargetMode.selectedBoosterId
        ? "Hedef modül seç"
        : localizedMessage("battle.booster_choose", {count:localizedNumber(optionCount)}));
      renderBoosterOptions();
      return;
    }

    const offerWasVisible =
      serverBoosterOfferId !== null
      || boosterOfferOpen;
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    activeBoosterOfferIds = new Set();
    boosterOfferOpen = false;
    clearBoosterTargetMode("offer_closed");
    boosterStatusEl.textContent = localizedMessage("battle.booster_unlock_seconds", {seconds:localizedNumber(Math.max(
      0,
      Math.ceil((boosterOfferDueAtMs(nextBoosterOfferIndex) - client.elapsedMs) / 1000)
    ))});
    if (offerWasVisible) {
      renderBoosterOptions();
    }
  }

  function renderBoosterOptions() {
    if (boosterPanelEl) {
      boosterPanelEl.dataset.state = !boosterOfferOpen
        ? "locked"
        : (boosterTargetMode.selectedBoosterId ? "target" : "ready");
    }
    boosterOptionsEl.innerHTML = "";
    const visibleBoosters = boosterOfferOpen && activeBoosterOfferIds.size
      ? BOOSTER_OPTIONS.filter((booster) => activeBoosterOfferIds.has(booster.id))
      : BOOSTER_OPTIONS;
    for (const booster of visibleBoosters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "booster-option";
      const boosterEnglish = document.documentElement?.lang === "en";
      button.textContent = boosterEnglish ? booster.nameEn : booster.nameTr;
      button.title = boosterEnglish ? booster.descriptionEn : booster.descriptionTr;
      const isOfferChoice = !boosterOfferOpen || activeBoosterOfferIds.size === 0 || activeBoosterOfferIds.has(booster.id);
      button.disabled = !boosterOfferOpen || !isOfferChoice;
      if (boosterTargetMode.selectedBoosterId === booster.id) button.classList.add("selected");
      const pickBoosterForTargeting = () => {
        if (!boosterOfferOpen || !isOfferChoice) return false;
        selectBoosterTargetMode(booster.id, "booster_button");
        trackBattleUiInteraction(
          `booster_select:${booster.id}`,
          "booster"
        );
        boosterStatusEl.textContent = localizedUiText(boosterTargetMode.selectedBoosterId ? "Hedef modül seç" : "Seçim bekleniyor");
        renderBoosterOptions();
        renderBoard();
        return true;
      };
      button.addEventListener("click", () => {
        pickBoosterForTargeting();
      });
      boosterOptionsEl.appendChild(button);
    }
  }

  function updateShelfTooltipPlacement(
    card,
    tooltip
  ) {
    if (
      !card
      || !tooltip
      || typeof card.getBoundingClientRect !== "function"
      || typeof tooltip.getBoundingClientRect !== "function"
    ) {
      return;
    }
    tooltip.classList.remove("tooltip-below");
    const shelf = card.closest(".module-shelf, .duel-arena, .battle-pool-selected-list, .battle-pool-module-grid, .laboratory-module-list");
    const cardRect = card.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const boundaryTop = shelf && typeof shelf.getBoundingClientRect === "function"
      ? shelf.getBoundingClientRect().top + 8
      : 8;
    if (cardRect.top - tooltipRect.height < boundaryTop) {
      tooltip.classList.add("tooltip-below");
    }
  }

  function isBoosterTargetEligible(module, boosterId = boosterTargetMode.selectedBoosterId) {
    if (!module || !boosterId || module.status !== "active" || Number(module.hp) <= 0) {
      return false;
    }
    if (serverBoosterEligibleTargets.has(boosterId)) {
      return serverBoosterEligibleTargets.get(boosterId).has(String(module.instanceId));
    }
    const booster = BOOSTER_OPTIONS.find((item) => item.id === boosterId);
    if (!booster) return false;
    if (booster.targetCategories.length && !booster.targetCategories.includes(module.category)) {
      return false;
    }
    if (boosterId === "emergency_repair" && Number(module.hp) >= Number(module.maxHp)) {
      return false;
    }
    if (boosterId === "cooling_burst" && Number(module.heat || 0) <= 0) {
      return false;
    }
    if (boosterId === "signal_cleanser" && (!Array.isArray(module.debuffs) || module.debuffs.length === 0)) {
      return false;
    }
    return true;
  }

  function cancelBoosterTargeting(reason="cancelled") {
    if (!boosterTargetMode.selectedBoosterId) return;
    clearBoosterTargetMode(reason);
    document.querySelectorAll(
      ".module-card.booster-target, .module-card.booster-target-ineligible"
    ).forEach((card) => card.classList.remove(
      "booster-target",
      "booster-target-ineligible"
    ));
    if (boosterOfferOpen && boosterStatusEl) {
      boosterStatusEl.textContent = localizedUiText(
        localizedMessage("battle.booster_choose", {count:localizedNumber(activeBoosterOfferIds.size || BOOSTER_OPTIONS_PER_OFFER)})
      );
    }
    renderBoosterOptions();
    return true;
  }

  function tryApplySelectedBooster(module) {
    if (!boosterTargetMode.selectedBoosterId) return false;
    const booster = BOOSTER_OPTIONS.find(item => item.id === boosterTargetMode.selectedBoosterId);
    if (!booster) return false;
    if (!isBoosterTargetEligible(module, booster.id)) {
      logClientMessage(localizedMessage("battle.booster_rejected", {name:localizedUiText(booster.nameTr)}));
      return true;
    }
    trackBattleUiInteraction(
      `booster_apply:${booster.id}`,
      "booster"
    );
    client.emitCommand({
      kind:"use_booster",
      payload:{
        offer_id:serverBoosterOfferId,
        booster_id:booster.id,
        target_module_id:module.instanceId,
      },
    });
    boosterStatusEl.textContent = localizedUiText("Sunucu hedefi doğruluyor…");
    renderLog();
    renderBoosterOptions();
    renderBoard();
    return true;
  }

  document.addEventListener?.("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!cancelBoosterTargeting("escape_key")) return;
    event.preventDefault();
  });

  document.addEventListener?.("click", (event) => {
    if (!boosterTargetMode.selectedBoosterId) return;
    if (event.target.closest(".booster-option, .module-card")) return;
    if (!event.target.closest(".battle-layout, .battle-shell, .play-live-panel")) return;
    cancelBoosterTargeting("empty_battle_area");
  });

  const CIRCUIT_CABLE_DIRECTIONS = [
    { dx:1, dy:0 },
    { dx:0, dy:1 },
  ];

  function cablePositionKey(position) {
    return `${Number(position?.x)},${Number(position?.y)}`;
  }

  function ensureBoardCableLayer(boardElement) {
    if (!boardElement) return null;
    let layer=boardElement.querySelector(":scope > .board-cable-layer");
    if (layer) return layer;
    layer=document.createElementNS("http://www.w3.org/2000/svg","svg");
    layer.classList.add("board-cable-layer");
    layer.setAttribute("viewBox","0 0 500 300");
    layer.setAttribute("preserveAspectRatio","none");
    layer.setAttribute("aria-hidden","true");
    boardElement.prepend(layer);
    return layer;
  }

  function createCircuitCableLine(layer, first, second, className) {
    const boardElement = layer.parentElement;
    const firstCell = boardElement?.querySelector(
      `.board-cell[data-x="${first.x}"][data-y="${first.y}"]`
    );
    const secondCell = boardElement?.querySelector(
      `.board-cell[data-x="${second.x}"][data-y="${second.y}"]`
    );
    if (!boardElement || !firstCell || !secondCell) return null;
    const width = Math.max(1, boardElement.clientWidth);
    const height = Math.max(1, boardElement.clientHeight);
    layer.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const firstCenter = {
      x:firstCell.offsetLeft + (firstCell.offsetWidth / 2),
      y:firstCell.offsetTop + (firstCell.offsetHeight / 2),
    };
    const secondCenter = {
      x:secondCell.offsetLeft + (secondCell.offsetWidth / 2),
      y:secondCell.offsetTop + (secondCell.offsetHeight / 2),
    };
    const horizontal = first.y === second.y;
    const forward = horizontal ? second.x > first.x : second.y > first.y;
    const start = horizontal
      ? { x:firstCell.offsetLeft + (forward ? firstCell.offsetWidth : 0), y:firstCenter.y }
      : { x:firstCenter.x, y:firstCell.offsetTop + (forward ? firstCell.offsetHeight : 0) };
    const end = horizontal
      ? { x:secondCell.offsetLeft + (forward ? 0 : secondCell.offsetWidth), y:secondCenter.y }
      : { x:secondCenter.x, y:secondCell.offsetTop + (forward ? 0 : secondCell.offsetHeight) };
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.classList.add(...className.split(" ").filter(Boolean));
    line.setAttribute("x1",String(start.x));
    line.setAttribute("y1",String(start.y));
    line.setAttribute("x2",String(end.x));
    line.setAttribute("y2",String(end.y));
    layer.appendChild(line);
    return line;
  }

  function renderBoardCables(boardElement, moduleIterable=[]) {
    const layer = ensureBoardCableLayer(boardElement);
    if (!layer) return;
    layer.replaceChildren();
    const modules = [...moduleIterable];
    const liveCore = modules.some(m => (m.definitionId === "core" || m.nameTr === "Çekirdek") && Number(m.hp) > 0);
    const cells = new Set(BOARD_CELLS.map(([x,y]) => `${x},${y}`));

    // Keep the cell itself aware of the incoming current.  This lets the
    // cable layer stay underneath the card while the cell edge still pulses
    // when a powered module is attached to that part of the circuit.
    const fedCells = new Set(
      modules
        .filter((module) =>
          module?.position
          && module.status !== "destroyed"
          && Number(module.hp ?? 1) > 0
          && (module.definitionId === "core"
            || module.nameTr === "Çekirdek"
            || module.isPowered !== false)
        )
        .map((module) => cablePositionKey(module.position))
    );
    const energizedEdges = new Set();
    if (liveCore) {
      const poweredPositions = modules
        .filter((module) => module?.position && fedCells.has(cablePositionKey(module.position)))
        .map((module) => ({
          x:Number(module.position.x),
          y:Number(module.position.y),
        }));
      // The Core row is the horizontal distribution bus. Every powered
      // column branches vertically from that row, so a module beside the Core
      // visibly carries current onward to cards above and below it.
      for (const column of new Set(poweredPositions.map((position) => position.x))) {
        let cursor = {x:2,y:1};
        while (cursor.x !== column) {
          const next = {x:cursor.x + Math.sign(column - cursor.x),y:1};
          energizedEdges.add(`${cablePositionKey(cursor)}>${cablePositionKey(next)}`);
          cursor = next;
        }
        for (const target of poweredPositions.filter((position) => position.x === column)) {
          cursor = {x:column,y:1};
          while (cursor.y !== target.y) {
            const next = {x:column,y:cursor.y + Math.sign(target.y - cursor.y)};
            energizedEdges.add(`${cablePositionKey(cursor)}>${cablePositionKey(next)}`);
            cursor = next;
          }
        }
      }
    }
    for (const cell of boardElement.querySelectorAll(".board-cell")) {
      const key = `${cell.dataset.x},${cell.dataset.y}`;
      const fed = liveCore && fedCells.has(key);
      cell.classList.toggle("energy-fed-cell", fed);
      cell.dataset.energyFed = String(fed);
    }

    for (const [x,y] of BOARD_CELLS) {
      const first = {x,y};
      for (const {dx,dy} of CIRCUIT_CABLE_DIRECTIONS) {
        const second = {x:x+dx,y:y+dy};
        if (!cells.has(cablePositionKey(second))) continue;
        createCircuitCableLine(layer, first, second, "circuit-cable-base");
        const forwardKey = `${cablePositionKey(first)}>${cablePositionKey(second)}`;
        const reverseKey = `${cablePositionKey(second)}>${cablePositionKey(first)}`;
        if (energizedEdges.has(forwardKey)) {
          createCircuitCableLine(layer, first, second, "circuit-cable-current");
        } else if (energizedEdges.has(reverseKey)) {
          createCircuitCableLine(layer, second, first, "circuit-cable-current");
        }
      }
    }
    if (boardElement === board) renderCorePowerControl();
  }

  function playerCircuitCableModules() {
    return [...client.modules.values()].filter(
      (module) => module.status === "active" && module.position
    );
  }

  function enemyCircuitCableModules() {
    const core={
      instanceId:"enemy-core",
      nameTr:"Çekirdek",
      hp:mockEnemyCoreHp,
      status:"active",
      position:{x:2,y:1},
      isPowered:mockEnemyCoreHp > 0,
    };
    const deployed=mockEnemyModules.map((module) => {
      const definition=moduleDefinitions.find(
        (candidate) => candidate.definitionId === module.definitionId
      );
      return {
        ...module,
        instanceId:module.id,
        nameTr:module.name,
        status:"active",
      };
    });
    return [core,...deployed];
  }

  function createBoard() {
    board.innerHTML = "";

    for (const [x, y] of BOARD_CELLS) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.dataset.occupied =
        "false";
      cell.tabIndex = 0;
      cell.setAttribute("role", "button");
      cell.style.gridColumn = String(x + 1);
      cell.style.gridRow = String(y + 1);

      const key = `${x},${y}`;
      if (x === CORE_POSITION.x && y === CORE_POSITION.y) {
        cell.classList.add("core-cell");
        cell.dataset.cellLabel =
          localizedUiText("Çekirdek");
        cell.title =
          "Çekirdek: sabit ana hedef";
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
        cell.dataset.cellLabel =
          localizedUiText("Kapı");
        cell.title =
          "Çekirdek Kapısı: başlangıç bağlantı noktası";
      } else if (SPECIAL_CELL_INFO[key]) {
        const special = SPECIAL_CELL_INFO[key];
        cell.classList.add("special-cell", special.css);
        cell.title = localizedMessage("battle.special_cell", {label:localizedUiText(special.label), bonus:localizedUiText(special.bonus)});
        cell.dataset.specialLabel = localizedUiText(special.label);
        cell.dataset.specialBonus = special.bonus;
      } else {
        cell.dataset.cellLabel =
          localizedMessage("battle.cell_coordinates", {x:localizedNumber(x), y:localizedNumber(y)});
      }

      board.appendChild(cell);
    }
    ensureBoardCableLayer(board);
  }

  function createEnemyBoard() {
    if (!enemyBoard) return;
    enemyBoard.innerHTML = "";
    for (const [x,y] of BOARD_CELLS) {
      const cell=document.createElement("div");
      cell.className="board-cell enemy-board-cell";
      cell.dataset.x=String(x);
      cell.dataset.y=String(y);
      cell.dataset.occupied="false";
      cell.style.gridColumn=String(x+1);
      cell.style.gridRow=String(y+1);
      const key=`${x},${y}`;
      if (x===CORE_POSITION.x && y===CORE_POSITION.y) {
        cell.classList.add("core-cell");
        cell.dataset.cellLabel=localizedUiText("Rakip Çekirdek");
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
        cell.dataset.cellLabel=localizedUiText("Kapı");
      } else if (SPECIAL_CELL_INFO[key]) {
        cell.classList.add("special-cell",SPECIAL_CELL_INFO[key].css);
        cell.dataset.specialLabel=localizedUiText(SPECIAL_CELL_INFO[key].label);
      }
      enemyBoard.appendChild(cell);
    }
    ensureBoardCableLayer(enemyBoard);
  }

  function appendEnergyFlowIndicator(
    card,
    {
      isPowered=false,
      energyReceived=0,
      energyRequired=0,
      isSource=false,
      powerReason=null,
    }={}
  ) {
    const received=Math.max(
      0,
      Number(energyReceived || 0)
    );
    const required=Math.max(
      0,
      Number(energyRequired || 0)
    );
    const flowing=Boolean(
      isSource
      ? isPowered && received > 0
      : isPowered
        && required > 0
        && received > 0
    );

    card.dataset.powerState=
      flowing
        ? "flowing"
        : (
            required > 0
              ? "disconnected"
              : "passive"
          );
    if (!flowing) {
      if (required <= 0) return false;
      const english=
        document.documentElement.lang === "en";
      const reasons={
        emp_disabled:english
          ? "An EMP effect disabled this module's energy system."
          : "EMP etkisi bu modülün enerji sistemini devre dışı bıraktı.",
        line_disrupted:english
          ? "A disruptor effect temporarily broke this module's energy line."
          : "Kesici etkisi bu modülün enerji hattını geçici olarak kopardı.",
        insufficient_supply:localizedMessage("battle.core_energy_need", {required:localizedNumber(required, {minimumFractionDigits:1, maximumFractionDigits:1}), received:localizedNumber(received, {minimumFractionDigits:1, maximumFractionDigits:1})}),
      };
      const message=reasons[powerReason]
        || (english
          ? "This module is disabled. Check sabotage effects and Core energy pressure."
          : "Bu modül devre dışı. Sabotaj etkilerini ve Çekirdek enerji baskısını kontrol edin.");
      card.classList.add("energy-disconnected");
      const tooltip=document.createElement("span");
      tooltip.className="power-state-tooltip";
      tooltip.textContent=message;
      tooltip.setAttribute("role","tooltip");
      card.appendChild(tooltip);
      const placeTooltip=()=>updateShelfTooltipPlacement(card,tooltip);
      card.addEventListener("pointerenter",placeTooltip);
      card.addEventListener("focusin",placeTooltip);
      card.title=`${card.title ? `${card.title} · ` : ""}${message}`;
      card.setAttribute("aria-label",message);
      return false;
    }

    return true;
  }

  function appendModuleLiveStatus(
    card,
    moduleLike
  ) {
    if (!card || !moduleLike) return;

    const row = document.createElement("span");
    row.className = "module-live-status-row";

    const addBadge = (label, kind, title) => {
      const badge = document.createElement("span");
      badge.className = `module-live-status ${kind}`;
      badge.textContent = label;
      badge.title = title;
      row.appendChild(badge);
    };

    const heat = Number(moduleLike.heat || 0);
    if (heat >= 70) {
      addBadge(
        "♨",
        heat >= 100 ? "heat-critical" : "heat-high",
        localizedMessage("battle.heat", {heat:localizedNumber(Math.round(heat))})
      );
    }

    const boosters = Array.isArray(moduleLike.temporaryBoosters)
      ? moduleLike.temporaryBoosters
      : [];
    if (boosters.length > 0) {
      addBadge(
        `✦${boosters.length > 1 ? boosters.length : ""}`,
        "boosted",
        localizedMessage("battle.active_boosters", {boosters:boosters.join(", ")})
      );
    }

    const debuffs = Array.isArray(moduleLike.debuffs)
      ? moduleLike.debuffs
      : [];
    if (debuffs.length > 0) {
      addBadge(
        `!${debuffs.length > 1 ? debuffs.length : ""}`,
        "debuffed",
        localizedMessage("battle.active_debuffs", {effects:debuffs.map(localizedUiText).join(", ")})
      );
    }

    if (row.children.length > 0) {
      card.appendChild(row);
    }
  }

  function enemyCard(
    moduleId,
    name,
    hp,
    maxHp,
    kind="module",
    power={}
  ) {
    const card=document.createElement("div");
    card.className="module-card enemy-module-card";
    card.dataset.moduleId=moduleId;
    card.dataset.category=kind;
    card.title=
      localizedMessage("battle.module_title_hp", {name:localizedUiText(name), hp:localizedNumber(Math.max(0, Math.round(hp))), max:localizedNumber(maxHp)});
    const icon=document.createElement("span");
    icon.className="module-icon";
    icon.textContent=moduleIconFor({nameTr:name});
    icon.setAttribute("aria-label",name);
    card.appendChild(icon);
    const label=document.createElement("span");
    label.className="name";
    label.textContent=name;
    card.appendChild(label);
    appendHpBar(card,hp,maxHp,{ battle:true });
    const isSource=
      moduleId === "enemy-generator";
    appendEnergyFlowIndicator(
      card,
      {
        ...power,
        isSource,
      }
    );
    if (
      Number(power.energyRequired || 0) > 0
      && !power.isPowered
    ) {
      card.classList.add(
        "energy-disconnected"
      );
    }
    appendModuleLiveStatus(card, power);
    window.requestAnimationFrame(
      () => recordModuleAnchor(moduleId, card)
    );
    return card;
  }

  function renderEnemyBoard() {
    if (!enemyBoard) return;
    if (!enemyBoard.children?.length) {
      createEnemyBoard();
    }
    for (const cell of enemyBoard.querySelectorAll(".board-cell")) {
      cell.innerHTML="";
      cell.dataset.occupied="false";
      cell.dataset.debris="false";
      cell.classList.remove("debris-cell");
    }
    appendCellDebris(enemyBoard, enemyCellDebris);
    const place=(x,y,card)=>{
      const cell=enemyBoard.querySelector(`.board-cell[data-x="${x}"][data-y="${y}"]`);
      if (cell) {
        cell.dataset.occupied="true";
        cell.appendChild(card);
      }
    };
    place(2,1,enemyCard("enemy-core","Çekirdek",mockEnemyCoreHp,300,"core"));
    for (const module of mockEnemyModules) {
      if (module.hp<=0) continue;
      place(
        module.position.x,
        module.position.y,
        enemyCard(
          module.id,
          module.name,
          module.hp,
          module.maxHp,
          module.kind,
          module
        )
      );
    }
    mockEnemyModuleHp=enemyLivingModules().reduce((sum,module)=>sum+module.hp,0);
    if (enemyBoardStatusEl) {
      enemyBoardStatusEl.textContent=localizedMessage("battle.enemy_core_hp", {hp:localizedNumber(Math.max(0,mockEnemyCoreHp))});
    }
    renderBattleIdentityPanels();
    renderBoardCables(
      enemyBoard,
      enemyCircuitCableModules()
    );
  }

  function opponentBattleDisplayName() {
    if (enemyBattleDisplayName) return enemyBattleDisplayName;
    if (
      activePlayMode === "local"
      || matchmakingState.opponentType === "ai"
      || String(enemyBattlePlayerId || "").includes("ai-")
    ) {
      return localizedMessage("battle.ai_label", {label:aiArchetypeName(activeLocalAiArchetype)});
    }
    if (enemyBattleDisplayName) return enemyBattleDisplayName;
    if (!enemyBattlePlayerId) return localizedUiText("Rakip Oyuncu");
    const clean=String(enemyBattlePlayerId);
    const short=clean.length > 18
      ? `${clean.slice(0,8)}…${clean.slice(-5)}`
      : clean;
    return short;
  }

  function renderBattleIdentityPanels() {
    const playerName=
      profileState.viewModel()?.displayName
      || "Oyuncu";
    if (playerBattleNameEl) {
      playerBattleNameEl.textContent=playerName;
    }
    if (enemyBattleNameEl) {
      enemyBattleNameEl.textContent=opponentBattleDisplayName();
      const canOpenProfile = isPublicProfileTarget(enemyBattlePlayerId)
        && matchmakingState.opponentType !== "ai";
      enemyBattleNameEl.disabled = !canOpenProfile;
      enemyBattleNameEl.classList.toggle("is-profile-enabled", canOpenProfile);
      enemyBattleNameEl.title = canOpenProfile ? "Oyuncu profilini gör" : "";
    }
    if (!enemyDeckPreviewEl) return;
    enemyDeckPreviewEl.replaceChildren();
    const label=document.createElement("span");
    label.className="enemy-deck-label";
    label.textContent=localizedUiText("Deste");
    enemyDeckPreviewEl.appendChild(label);
    const ids=(enemyBattlePoolDefinitionIds.length
      ? enemyBattlePoolDefinitionIds
      : STARTER_BATTLE_POOL_PRESET.module_definition_ids
    ).slice(0,6);
    for (const definitionId of ids) {
      const module=moduleDefinitions.find(
        (candidate) => candidate.definitionId === definitionId
      );
      if (!module) continue;
      const card=document.createElement("span");
      card.className="enemy-deck-card";
      card.dataset.category=module.category || "";
      card.textContent=moduleIconFor(module);
      card.title=localizedUiText(module.nameTr);
      card.setAttribute("aria-label",localizedUiText(module.nameTr));
      enemyDeckPreviewEl.appendChild(card);
    }
  }

  function appendCellDebris(boardElement, debrisItems) {
    for (const debris of debrisItems || []) {
      const cell = boardElement.querySelector(
        `.board-cell[data-x="${Number(debris.x)}"][data-y="${Number(debris.y)}"]`
      );
      if (!cell) continue;
      const seconds = Math.max(
        1,
        Math.ceil(Number(debris.remaining_ms || 0) / 1000)
      );
      cell.dataset.debris = "true";
      cell.classList.add("debris-cell");
      const marker = document.createElement("span");
      marker.className = "cell-debris";
      marker.setAttribute("role", "status");
      marker.setAttribute(
        "aria-label",
        localizedMessage("battle.debris_seconds", {seconds:localizedNumber(seconds)})
      );
      const shards = document.createElement("span");
      shards.className = "cell-debris-shards";
      shards.setAttribute("aria-hidden", "true");
      const countdown = document.createElement("strong");
      countdown.textContent = localizedMessage("time.seconds_short", {count:localizedNumber(seconds)});
      marker.append(shards, countdown);
      cell.appendChild(marker);
    }
  }

  function renderRemoteDataStatus() {
    const mapping = {
      profile:
        document.getElementById(
          "profile-load-status"
        ),
      statistics:
        document.getElementById(
          "statistics-load-status"
        ),
      settings:
        document.getElementById(
          "settings-load-status"
        ),
      laboratory:
        document.getElementById(
          "laboratory-load-status"
        ),
    };

    const labels = {
      idle: "Yerel önizleme",
      loading: "Sunucudan yükleniyor...",
      ready: "Sunucu verisi",
      error: "Sunucu yükleme hatası",
    };

    for (
      const [key, element]
      of Object.entries(mapping)
    ) {
      if (!element) continue;

      const status =
        accountDataLoader
          .status[key];

      element.textContent =
        labels[status] || status;
      element.dataset.status =
        status;
    }

    const dailyStatus = document.getElementById("daily-load-status");
    if (dailyStatus) {
      const status = accountDataLoader.status.profile;
      dailyStatus.textContent = labels[status] || status;
      dailyStatus.dataset.status = status;
    }
  }

  function applyLanguagePreference(
    language
  ) {
    const normalized =
      language === "en"
        ? "en"
        : "tr";

    document.documentElement.lang =
      normalized;

    const text = (
      normalized === "en"
      ? {
          menu:"GRIDSHARD",
          play:"Play",
          profile:"Profile",
          statistics:"Statistics",
          settings:"Settings",
          settingsSave:"Save Settings",
          playMode:"Match Mode",
          battlePool:"Build Battle Pool",
        }
      : {
          menu:"GRIDSHARD",
          play:"Oyna",
          profile:"Profil",
          statistics:"İstatistikler",
          settings:"Ayarlar",
          settingsSave:"Ayarları Kaydet",
          playMode:"Maç Modu",
          battlePool:"Savaş Havuzu Oluştur",
        }
    );

    const direct = {
      "main-menu-title":
        text.menu,
      "settings-title":
        text.settings,
      "settings-save":
        text.settingsSave,
      "play-mode-title":
        text.playMode,
      "battle-pool-title":
        text.battlePool,
    };

    for (
      const [id,value]
      of Object.entries(
        direct
      )
    ) {
      const el =
        document.getElementById(
          id
        );
      if (el) {
        el.textContent =
          value;
      }
    }

    const menuLabels = {
      play:text.play,
      profile:text.profile,
      statistics:
        text.statistics,
      settings:
        text.settings,
    };

    for (
      const [screen,value]
      of Object.entries(
        menuLabels
      )
    ) {
      const title =
        document.querySelector(
          `[data-open-screen="${screen}"] .menu-action-title`
        );
      if (title) {
        title.textContent =
          value;
      }
    }

    renderAiArchetypePicker();

    globalThis.GridshardI18n
      ?.apply(normalized);

    // Dynamic server-backed panels must be rebuilt so they can select the
    // language-specific catalog payload instead of keeping stale text nodes.
    renderHomeHub();
    renderModuleCollection();
    renderCoreCollection();
    renderBattlePoolSelection();
    renderBattlePoolDetail();
    renderBoosterOptions();
    renderArenaPath();
    renderShop();
    renderPresetOptions();
    renderFriendsScreen();
    renderTeamHub();
    renderEventsHub();
    if (document.getElementById("daily-meta-dialog")?.open) renderDailyMetaDialog();
    renderProfileSummary();
    renderEngagementSummary(profileState.viewModel()?.engagement);
    renderLaboratory();
    renderStatisticsSummary();
    renderLeaderboard();
    renderRewardInbox();
    renderPostMatchSummary();
    if (document.getElementById("module-detail-dialog")?.open) {
      openModuleDetail(document.getElementById("module-detail-tab-content")?.dataset.tab || "overview");
    }
    if (document.getElementById("core-detail-dialog")?.open) {
      openCoreDetail(document.getElementById("core-detail-tab-content")?.dataset.tab || "overview");
    }
    if (publicProfilePayload && document.getElementById("public-profile-dialog")?.open) {
      renderPublicProfile(publicProfilePayload);
      renderPublicProfileFriendAction(publicProfilePayload);
    }
    if (teamProfilePayload && document.getElementById("team-profile-dialog")?.open) renderTeamProfile(teamProfilePayload);
    // Newly rebuilt panels contain static labels as well as keyed dynamic text.
    globalThis.GridshardI18n?.apply(normalized);
  }

  function localizedRecordText(record, field) {
    if (!record) return "";
    const english = document.documentElement.lang === "en";
    const englishValue = record[`${field}_en`];
    const turkishValue = record[`${field}_tr`] ?? record[field];
    const value = english && englishValue !== undefined && englishValue !== "" && (!Array.isArray(englishValue) || englishValue.length)
      ? englishValue : turkishValue;
    return Array.isArray(value) ? value.map(localizedUiText) : localizedUiText(value);
  }

  function localizedCatalogName(kind, id, fallback = "") {
    const key = `cosmetic.${kind}.${id}`;
    const value = localizedMessage(key);
    return value === key ? localizedUiText(fallback || id.replaceAll("_", " ")) : value;
  }

  function localizedRewardChestName(reward = {}) {
    const key = `chest.visual.${reward.chest_visual_id || ""}`;
    const byVisual = localizedMessage(key);
    if (byVisual !== key) return byVisual;
    const byTierKey = `event.chest.${reward.chest_tier || ""}`;
    const byTier = localizedMessage(byTierKey);
    if (byTier !== byTierKey) return byTier;
    return localizedRecordText(reward, "chest_name") || localizedMessage("reward.chest_generic");
  }

  function renderSettingsPersistenceStatus(
    message,
    status="idle"
  ) {
    const el =
      document.getElementById(
        "settings-persistence-status"
      );
    if (!el) return;

    el.textContent =
      message;
    el.dataset.status =
      status;
  }

  function renderSettingsSaveStatus(
    message,
    status="idle"
  ) {
    const el =
      document.getElementById(
        "settings-save-status"
      );
    if (!el) return;

    el.textContent =
      message;
    el.dataset.status =
      status;
  }

  function applyAudioSettings(
    view
  ) {
    if (
      !gridshardAudioDirector
      || !view
    ) {
      return;
    }

    gridshardAudioDirector
      .setPreferences({
        soundVolume:
          Number(
            view.soundVolume ?? 100
          ) / 100,
        musicVolume:
          Number(
            view.musicVolume ?? 70
          ) / 100,
        soundMuted:
          Boolean(
            view.soundMuted
          ),
        musicMuted:
          Boolean(
            view.musicMuted
          ),
      });
  }

  function renderSettingsForm() {
    const view =
      settingsState.viewModel();
    if (!view) return;

    const sound =
      document.getElementById(
        "settings-sound"
      );
    const music =
      document.getElementById(
        "settings-music"
      );
    const soundMuted =
      document.getElementById(
        "settings-sound-muted"
      );
    const musicMuted =
      document.getElementById(
        "settings-music-muted"
      );
    const vibration =
      document.getElementById(
        "settings-vibration"
      );
    const graphics =
      document.getElementById(
        "settings-graphics"
      );
    const language =
      document.getElementById(
        "settings-language"
      );
    const analyticsConsent = document.getElementById("settings-analytics-consent");

    if (sound) {
      sound.value =
        view.soundVolume;
    }
    if (music) {
      music.value =
        view.musicVolume;
    }
    if (soundMuted) {
      soundMuted.checked =
        Boolean(
          view.soundMuted
        );
    }
    if (musicMuted) {
      musicMuted.checked =
        Boolean(
          view.musicMuted
        );
    }
    if (vibration) {
      vibration.checked =
        view.vibrationEnabled;
    }
    if (graphics) {
      graphics.value =
        view.graphicsQuality;
    }
    if (language) {
      language.value =
        view.language;
    }
    if (analyticsConsent) analyticsConsent.checked = view.analyticsConsent === true;

    applyLanguagePreference(
      view.language
    );
    applyAudioSettings(
      view
    );
  }

  let settingsAutoSaveTimer = null;
  function scheduleSettingsAutoSave(delayMs = 240) {
    if (settingsAutoSaveTimer) {
      clearTimeout(settingsAutoSaveTimer);
    }
    renderSettingsSaveStatus(
      localizedUiText("Ayarlar otomatik kaydedilecek..."),
      "saving"
    );
    settingsAutoSaveTimer = setTimeout(() => {
      settingsAutoSaveTimer = null;
      saveSettingsForm();
    }, delayMs);
  }

  async function saveSettingsForm() {
    if (settingsAutoSaveTimer) {
      clearTimeout(settingsAutoSaveTimer);
      settingsAutoSaveTimer = null;
    }
    const sound =
      document.getElementById(
        "settings-sound"
      );
    const music =
      document.getElementById(
        "settings-music"
      );
    const soundMuted =
      document.getElementById(
        "settings-sound-muted"
      );
    const musicMuted =
      document.getElementById(
        "settings-music-muted"
      );
    const vibration =
      document.getElementById(
        "settings-vibration"
      );
    const graphics =
      document.getElementById(
        "settings-graphics"
      );
    const language =
      document.getElementById(
        "settings-language"
      );
    const analyticsConsent = document.getElementById("settings-analytics-consent");

    renderSettingsSaveStatus(
      localizedUiText("Kaydediliyor..."),
      "saving"
    );

    const wasAnalyticsEnabled = settingsState.viewModel()?.analyticsConsent === true;
    const result =
      await accountDataLoader
        .saveSettings({
          sound_volume:
            Number(sound?.value ?? 100),
          music_volume:
            Number(music?.value ?? 70),
          sound_muted:
            Boolean(
              soundMuted?.checked
            ),
          music_muted:
            Boolean(
              musicMuted?.checked
            ),
          vibration_enabled:
            Boolean(
              vibration?.checked
            ),
          graphics_quality:
            graphics?.value
            || "yuksek",
          language:
            language?.value
            || "tr",
          analytics_consent: analyticsConsent?.checked === true,
        });

    renderSettingsForm();
    renderRemoteDataStatus();

    if (!result.ok) {
      renderSettingsSaveStatus(
        localizedUiText(result.reason || "Ayarlar kaydedilemedi."),
        "error"
      );
      logClientMessage(
        result.reason
      );
    } else {
      if (!wasAnalyticsEnabled && result.payload?.analytics_consent === true) {
        recordProductEvent("session_started");
      }
      const languageValue =
        result.payload
          ?.language
        || language?.value
        || "tr";

      applyLanguagePreference(
        languageValue
      );
      renderSettingsSaveStatus(
        languageValue === "en"
          ? "Settings saved · English"
          : "Ayarlar kaydedildi · Türkçe",
        "saved"
      );

      const verify =
        await accountDataLoader
          .loadSettings();

      renderRemoteDataStatus();
      renderSettingsForm();

      const persistedLanguage =
        settingsState
          .viewModel()
          ?.language;

      if (
        verify.ok
        && persistedLanguage
          === languageValue
      ) {
        renderSettingsPersistenceStatus(
          languageValue === "en"
            ? "Persistence: Verified on server"
            : "Kalıcılık: Sunucuda doğrulandı",
          "verified"
        );
      } else {
        renderSettingsPersistenceStatus(
          languageValue === "en"
            ? "Persistence: Could not be verified"
            : "Kalıcılık: Doğrulanamadı",
          "error"
        );
      }
    }

    return result;
  }

  function renderPostMatchSummary() {
    const resultEl =
      document.getElementById(
        "battle-result-summary"
      );
    if (!resultEl) {
      return;
    }

    const result =
      pvpState.finalResult;
    if (!result) {
      resultEl.hidden = true;
      return;
    }

    setBattleResultHero(
      result.is_draw
        ? "draw"
        : (
            result.winner_player_id
              === pvpState.playerId
              ? "victory"
              : "defeat"
          )
    );

    resultEl.hidden = true;
    resultEl.textContent = "";
    renderPostMatchRewards();
  }

  function renderParticipantBootstrapStatus() {
    const el =
      document.getElementById(
        "participant-bootstrap-status"
      );
    if (!el) {
      return;
    }

    const labels = {
      idle: "Hesap: Hazır değil",
      loading:
        "Hesap: Sunucuda hazırlanıyor",
      ready: "Hesap: Hazır",
      error:
        "Hesap: Sunucu bağlantı hatası",
    };

    el.textContent =
      labels[
        participantBootstrap.status
      ]
      || participantBootstrap.status;
    el.dataset.status =
      participantBootstrap.status;

    const continuityEl =
      document.getElementById(
        "participant-continuity-status"
      );
    if (continuityEl) {
      const labels = {
        unknown:
          "Oturum Sürekliliği: Kontrol bekliyor",
        verified:
          "Oturum Sürekliliği: Doğrulandı",
        mismatch:
          "Oturum Sürekliliği: Kimlik uyuşmazlığı",
      };
      continuityEl.textContent =
        labels[
          participantContinuity.status
        ]
        || participantContinuity.status;
      continuityEl.dataset.status =
        participantContinuity.status;
    }

    const retry =
      document.getElementById(
        "participant-bootstrap-retry"
      );
    if (retry) {
      retry.hidden =
        participantBootstrap.status
        !== "error";
    }
  }

  function renderParticipantIdentity() {
    const el =
      document.getElementById(
        "participant-id-summary"
      );
    if (!el) {
      return;
    }

    const shortId =
      participantPlayerId.length > 18
        ? (
            participantPlayerId
              .slice(0, 10)
            + "…"
            + participantPlayerId
              .slice(-6)
          )
        : participantPlayerId;

    el.textContent =
      localizedMessage("beta.web_test_id", {id:shortId});
  }

  function renderProfileSummary() {
    const el =
      document.getElementById(
        "profile-live-summary"
      );
    const view =
      profileState.viewModel();

    if (!el || !view) {
      return;
    }

    const statistics = statisticsState.viewModel();
    const wins = Math.max(0, Number(statistics?.wins || 0));
    const stages = view.operatorTitleProgression?.stages || [];
    const achievedStages = stages.filter(
      (stage) => view.rating >= Number(stage.required_trophies || 0)
        && wins >= Number(stage.required_wins || 0)
    );
    const activeTitle = localizedRecordText(achievedStages.at(-1), "title")
      || view.operatorTitle
      || "Devre Çırağı";
    const leagueName = document.documentElement.lang === "en" ? view.leagueNameEn || view.leagueNameTr : view.leagueNameTr;
    el.textContent = localizedMessage("profile.identity_summary", {name:view.displayName, title:localizedUiText(activeTitle), league:localizedUiText(leagueName), trophies:localizedNumber(view.rating)});

    const setText = (id, value) => {
      const target = document.getElementById(id);
      if (target) target.textContent = String(value);
    };
    setText("profile-clan-title", view.teamName || localizedMessage("profile.no_team"));
    const profileTeamButton = document.getElementById("profile-clan-title");
    if (profileTeamButton) {
      profileTeamButton.dataset.teamId = view.teamId || "";
      profileTeamButton.disabled = !view.teamId;
    }
    setText(
      "profile-clan-copy",
      view.teamName
        ? localizedMessage("profile.team_id", {id:view.teamId || "—"})
        : localizedMessage("profile.no_team_description")
    );

    const engagement = view.engagement || {};
    const seasonSummary = view.seasonSummary || {};
    const archives = metaProgressionState?.season_archives || [];
    const previous = seasonSummary.previous || archives.at(-1) || null;
    const best = seasonSummary.best || archives.reduce(
      (current, item) => Number(item?.final_rating || 0) > Number(current?.final_rating || 0) ? item : current,
      null
    );
    const seasonEndsAt = new Date(engagement.season_ends_at || 0).getTime();
    const remainingMs = Math.max(0, seasonEndsAt - Date.now());
    const remainingDays = Math.floor(remainingMs / 86400000);
    const remainingHours = Math.floor((remainingMs % 86400000) / 3600000);
    setText("profile-current-season-name", localizedRecordText(engagement, "season_name") || localizedMessage("profile.current_season"));
    setText("profile-season-countdown", Number.isFinite(seasonEndsAt) && seasonEndsAt > 0 ? localizedMessage("season.time_remaining", {days:localizedNumber(remainingDays), hours:localizedNumber(remainingHours)}) : localizedMessage("season.time_preparing"));
    renderTrophyValue("profile-season-trophies", Number(view.rating || 0));
    setText("profile-season-league", localizedUiText(leagueName || localizedMessage("arena.first")));
    renderTrophyValue("profile-last-season-trophies", previous ? Number(previous.final_rating || 0) : "—");
    renderTrophyValue("profile-best-season-trophies", best ? Number(best.final_rating || 0) : "—");

    const nameInput =
      document.getElementById(
        "profile-display-name"
      );
    if (nameInput) {
      nameInput.value =
        view.displayName;
    }
    if (battleProfileNameEl) {
      battleProfileNameEl.textContent =
        view.displayName;
    }
    renderBattleIdentityPanels();
    const lobbyPlayerName=
      document.getElementById(
        "lobby-player-name"
      );
    const lobbyPlayerDetails=
      document.getElementById(
        "lobby-player-details"
      );
    if (lobbyPlayerName) {
      lobbyPlayerName.textContent=
        view.displayName;
    }
    if (lobbyPlayerDetails) {
      lobbyPlayerDetails.textContent=localizedMessage("profile.lobby_title_trophies", {title:localizedUiText(activeTitle), trophies:localizedNumber(view.rating)});
    }

    renderProfileHighlights();
    renderProfileHonorShowcase();
    renderAvatarCustomization(activeTitle);
    renderEngagementSummary(view.engagement);
  }

  function renderProfileHonorShowcase() {
    const cosmetics = profileState.viewModel()?.cosmetics || {};
    const groups = [
      {
        hostId:"profile-rank-trophy-collection",
        ids:cosmetics.unlockedRankTrophyIds || [],
        definitions:PROFILE_RANK_TROPHIES,
        kind:"trophy",
        emptyCopy:localizedMessage("profile.no_rank_trophies"),
      },
      {
        hostId:"profile-badge-collection",
        ids:cosmetics.unlockedBadgeIds || [],
        definitions:PROFILE_BADGES,
        kind:"badge",
        emptyCopy:localizedMessage("profile.no_rank_badges"),
      },
    ];

    for (const group of groups) {
      const host = document.getElementById(group.hostId);
      if (!host) continue;
      host.replaceChildren();
      const ids = [...new Set(group.ids.map((id) => String(id || "")).filter(Boolean))];
      if (!ids.length) {
        const empty = document.createElement("span");
        empty.className = "profile-honor-empty";
        empty.textContent = group.emptyCopy;
        host.appendChild(empty);
        continue;
      }
      for (const id of ids) {
        const definition = group.definitions.find((item) => item.id === id) || {
          id,
          nameTr:id.replaceAll("_", " "),
          shortNameTr:id.replaceAll("_", " "),
          glyph:group.kind === "trophy" ? "🏆" : "✦",
          tone:"cyan",
        };
        const item = document.createElement("article");
        item.className = "profile-honor-item";
        item.dataset.kind = group.kind;
        item.dataset.tone = definition.tone;
        item.title = localizedCatalogName(group.kind, id, definition.nameTr);
        item.setAttribute("aria-label", item.title);
        const glyph = document.createElement("span");
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = definition.glyph;
        const label = document.createElement("small");
        label.textContent = localizedCatalogName(`${group.kind}_short`, id, definition.shortNameTr);
        item.append(glyph, label);
        host.appendChild(item);
      }
    }
  }

  function deckDisplayName(deck) {
    if (!deck?.module_ids?.length) return localizedMessage("profile.no_matches_yet");
    return deck.module_ids
      .map((id) => localizedUiText(moduleDefinitions.find((module) => module.definitionId === id)?.nameTr || id))
      .join(" · ");
  }

  function renderProfileHighlights() {
    const view = profileState.viewModel();
    const highest = document.getElementById("profile-highest-trophies");
    if (highest && view) renderTrophyValue(highest, Number(view.highestRating || view.rating || 0));
    const deckHost = document.getElementById("profile-most-used-deck");
    const deck = metaProgressionState?.statistics?.most_used_decks?.[0];
    if (deckHost) {
      deckHost.replaceChildren();
      const ids = deck?.module_ids?.length ? deck.module_ids : view?.battlePoolIds || [];
      for (const definitionId of ids.slice(0, 6)) {
        const module = moduleDefinitions.find((candidate) => candidate.definitionId === definitionId);
        const tile = document.createElement("span");
        tile.className = "profile-deck-module";
        tile.dataset.category = module?.category || "";
        tile.textContent = moduleIconFor(module || null);
        tile.title = localizedUiText(module?.nameTr || definitionId);
        deckHost.appendChild(tile);
      }
      const matchCount = document.createElement("small");
      matchCount.textContent = deck ? localizedMessage("deck.matches_used", {count:deck.matches}) : localizedUiText("Aktif savaş destesi");
      deckHost.appendChild(matchCount);
    }
    const coreHost = document.getElementById("profile-featured-core");
    if (coreHost) {
      const core = metaProgressionState?.cores?.types?.find((item) => item.selected)
        || metaProgressionState?.cores?.types?.[0];
      const visual = applyCoreVisualIdentity(coreHost, core?.id || "core_resonance");
      const icon = document.getElementById("profile-featured-core-glyph");
      const label = document.getElementById("profile-featured-core-name");
      const level = document.getElementById("profile-featured-core-level");
      if (icon) icon.textContent = visual.glyph;
      if (label) label.textContent = localizedUiText(core?.name_tr || localizedMessage("core.resonance"));
      if (level) level.textContent = localizedMessage("core.level", {level:localizedNumber(core?.level || 1)});
    }
  }

  function applyAvatarVisual(element, avatarId, frameId) {
    if (!element) return;
    const avatar = PROFILE_AVATARS.find((item) => item.id === avatarId) || PROFILE_AVATARS[0];
    element.dataset.avatar = avatar.id;
    element.dataset.frame = frameId || "none";
    element.textContent = avatar.glyph;
  }

  async function selectProfileCosmetic(kind, id) {
    const status = document.getElementById("avatar-action-status");
    if (status) status.textContent = localizedMessage("cosmetic.saving_choice");
    try {
      const current = profileState.viewModel()?.cosmetics || {};
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/cosmetics`,
        {
          method: "PUT",
          body: JSON.stringify({
            avatar_id: kind === "avatar" ? id : current.selected_avatar_id,
            avatar_frame_id: kind === "frame" ? id : current.selected_avatar_frame_id,
            battle_emoji_id: kind === "emoji" ? id : current.selected_battle_emoji_id,
            profile_background_id: kind === "background" ? id : current.selected_profile_background_id,
          }),
        }
      );
      profileState.applyProfile(payload);
      renderProfileSummary();
      if (status) status.textContent = "";
      return { ok: true };
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok: false };
    }
  }

  function renderAvatarCustomization(activeTitle = null) {
    const view = profileState.viewModel();
    if (!view) return;
    const cosmetics = view.cosmetics || {};
    const avatarId = cosmetics.selected_avatar_id || "default";
    const frameId = cosmetics.selected_avatar_frame_id || "none";
    const emojiId = cosmetics.selected_battle_emoji_id || "none";
    const backgroundId = cosmetics.selected_profile_background_id || "default";
    applyAvatarVisual(document.getElementById("profile-avatar"), avatarId, frameId);
    applyAvatarVisual(document.getElementById("avatar-preview"), avatarId, frameId);
    applyAvatarVisual(document.getElementById("lobby-profile-avatar"), avatarId, frameId);
    document.getElementById("app-progress-ribbon")?.setAttribute("data-profile-background", backgroundId);
    document.querySelector(".profile-identity-card")?.setAttribute("data-profile-background", backgroundId);
    const profileName = document.getElementById("avatar-preview-name");
    const profileTitle = document.getElementById("avatar-preview-title");
    if (profileName) profileName.textContent = view.displayName;
    if (profileTitle) profileTitle.textContent = localizedUiText(activeTitle || view.operatorTitle || localizedMessage("profile.default_title"));

    const avatarHost = document.getElementById("avatar-choice-list");
    if (avatarHost) {
      avatarHost.replaceChildren();
      const unlocked = new Set(cosmetics.unlockedAvatarIds || ["default"]);
      for (const avatar of PROFILE_AVATARS) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.avatarId = avatar.id;
        button.dataset.state = !unlocked.has(avatar.id) ? "locked" : avatar.id === avatarId ? "selected" : "available";
        button.disabled = !unlocked.has(avatar.id);
        const glyph=document.createElement("span");
        glyph.textContent=avatar.glyph;
        const name=document.createElement("strong");
        name.textContent=localizedCatalogName("avatar", avatar.id, avatar.nameTr);
        const state=document.createElement("small");
        state.textContent=localizedMessage(unlocked.has(avatar.id) ? (avatar.id === avatarId ? "cosmetic.selected" : "cosmetic.select") : "cosmetic.season_path");
        button.append(glyph,name,state);
        button.addEventListener("click", () => selectProfileCosmetic("avatar", avatar.id));
        avatarHost.appendChild(button);
      }
    }

    const frameHost = document.getElementById("avatar-frame-choice-list");
    if (frameHost) {
      frameHost.replaceChildren();
      const unlocked = new Set(cosmetics.unlockedAvatarFrameIds || ["none"]);
      for (const frame of PROFILE_AVATAR_FRAMES) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.frameId = frame.id;
        button.dataset.frame = frame.id;
        button.dataset.state = !unlocked.has(frame.id) ? "locked" : frame.id === frameId ? "selected" : "available";
        button.disabled = !unlocked.has(frame.id);
        const glyph=document.createElement("span");
        glyph.textContent="◇";
        const name=document.createElement("strong");
        name.textContent=localizedCatalogName("frame", frame.id, frame.nameTr);
        const state=document.createElement("small");
        state.textContent=localizedMessage(unlocked.has(frame.id) ? (frame.id === frameId ? "cosmetic.selected" : "cosmetic.select") : "cosmetic.season_path");
        button.append(glyph,name,state);
        button.addEventListener("click", () => selectProfileCosmetic("frame", frame.id));
        frameHost.appendChild(button);
      }
    }

    const emojiHost = document.getElementById("battle-emoji-choice-list");
    if (emojiHost) {
      emojiHost.replaceChildren();
      const unlocked = new Set(cosmetics.unlockedBattleEmojiIds || ["none"]);
      for (const emoji of BATTLE_EMOJIS) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.state = !unlocked.has(emoji.id) ? "locked" : emoji.id === emojiId ? "selected" : "available";
        button.disabled = !unlocked.has(emoji.id);
        const name = document.createElement("strong");
        name.textContent = localizedCatalogName("emoji", emoji.id, emoji.nameTr);
        const state = document.createElement("small");
        state.textContent = localizedMessage(unlocked.has(emoji.id)
          ? (emoji.id === emojiId ? "cosmetic.selected" : "cosmetic.select")
          : "cosmetic.competition_reward");
        button.append(createBattleEmojiVisual(emoji), name, state);
        button.addEventListener("click", () => selectProfileCosmetic("emoji", emoji.id));
        emojiHost.appendChild(button);
      }
    }

    const backgroundHost = document.getElementById("profile-background-choice-list");
    if (backgroundHost) {
      backgroundHost.replaceChildren();
      const unlocked = new Set(cosmetics.unlockedProfileBackgroundIds || ["default"]);
      for (const background of PROFILE_BACKGROUNDS) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "profile-background-choice";
        button.style.setProperty("--profile-bg-a", background.colors[0]);
        button.style.setProperty("--profile-bg-b", background.colors[1]);
        button.dataset.state = !unlocked.has(background.id) ? "locked" : background.id === backgroundId ? "selected" : "available";
        button.disabled = !unlocked.has(background.id);
        const glyph=document.createElement("span");
        glyph.textContent="▰";
        const name=document.createElement("strong");
        name.textContent=localizedCatalogName("background", background.id, background.nameTr);
        const state=document.createElement("small");
        state.textContent=localizedMessage(unlocked.has(background.id) ? (background.id === backgroundId ? "cosmetic.selected" : "cosmetic.select") : "cosmetic.competition_reward");
        button.append(glyph,name,state);
        button.addEventListener("click", () => selectProfileCosmetic("background", background.id));
        backgroundHost.appendChild(button);
      }
    }
  }

  function isPublicProfileTarget(playerId, player = null) {
    const clean = String(playerId || "").trim();
    return Boolean(
      clean
      && clean !== participantPlayerId
      && !player?.is_bot
      && !clean.startsWith("local-ai-")
    );
  }

  function boundedWinRatePercent(rawValue, wins = 0, matches = 0) {
    const raw = Number(rawValue);
    const fallback = Number(matches) > 0 ? Number(wins) / Number(matches) : 0;
    const ratioOrPercent = Number.isFinite(raw) ? raw : fallback;
    const percent = ratioOrPercent <= 1 ? ratioOrPercent * 100 : ratioOrPercent;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  function createTeamProfileLink(teamId, teamName, { className = "" } = {}) {
    const cleanTeamId = String(teamId || "").trim();
    const node = document.createElement(cleanTeamId ? "button" : "strong");
    node.className = `${cleanTeamId ? "team-profile-link" : ""} ${className}`.trim();
    node.textContent = teamName || localizedMessage("profile.team");
    if (cleanTeamId) {
      node.type = "button";
      node.title = localizedMessage("profile.open_team");
      node.setAttribute("aria-label", localizedMessage("profile.open_team_aria", {name:teamName || localizedMessage("profile.team")}));
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        openTeamProfile(cleanTeamId);
      });
    }
    return node;
  }

  function createPublicPlayerName(playerId, displayName, { suffix = "", className = "" } = {}) {
    const canOpen = isPublicProfileTarget(playerId);
    const node = document.createElement(canOpen ? "button" : "strong");
    if (canOpen) {
      node.type = "button";
      node.className = `public-player-link ${className}`.trim();
      node.setAttribute("aria-label", localizedMessage("profile.open_player_aria", {name:displayName}));
      node.title = localizedMessage("profile.open_player");
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        openPublicProfile(playerId);
      });
    } else if (className) {
      node.className = className;
    }
    node.textContent = `${displayName}${suffix}`;
    return node;
  }

  function publicProfileMetric(label, value) {
    const article = document.createElement("article");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    name.textContent = label;
    amount.textContent = String(value);
    article.append(name, amount);
    return article;
  }

  function renderPublicProfile(payload) {
    const host = document.getElementById("public-profile-content");
    if (!host) return;
    host.replaceChildren();

    const identity = document.createElement("article");
    identity.className = "profile-identity-card public-profile-identity";
    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    applyAvatarVisual(
      avatar,
      payload.avatar?.selected_avatar_id || "default",
      payload.avatar?.selected_avatar_frame_id || "none"
    );
    const identityCopy = document.createElement("div");
    const playerName = document.createElement("strong");
    playerName.textContent = payload.display_name || localizedMessage("profile.player");
    const title = document.createElement("span");
    title.textContent = localizedRecordText(payload, "operator_title") || localizedMessage("profile.default_title");
    const rank = document.createElement("small");
    rank.textContent = localizedRecordText(payload, "rank_name") || localizedMessage("arena.first");
    identityCopy.append(playerName, title, rank);
    const trophies = document.createElement("strong");
    renderTrophyValue(trophies, Number(payload.rating || 0));
    identity.append(avatar, identityCopy, trophies);
    host.appendChild(identity);

    const deckSection = document.createElement("section");
    deckSection.className = "profile-deck-showcase";
    const deckHeading = document.createElement("div");
    deckHeading.className = "profile-section-heading";
    const deckKicker = document.createElement("span");
    deckKicker.textContent = localizedMessage("profile.circuit_habit");
    const deckTitle = document.createElement("h3");
    deckTitle.textContent = localizedMessage("profile.most_used_deck");
    deckHeading.append(deckKicker, deckTitle);
    const deckVisual = document.createElement("div");
    deckVisual.className = "profile-deck-visual";
    const core = document.createElement("div");
    core.className = "profile-featured-core";
    const coreGlyph = document.createElement("span");
    coreGlyph.className = "profile-featured-core-glyph";
    const coreCopy = document.createElement("span");
    coreCopy.className = "profile-featured-core-copy";
    const coreName = document.createElement("strong");
    coreName.textContent = localizedRecordText(payload.selected_core, "name") || localizedMessage("core.resonance");
    const coreLevel = document.createElement("em");
    coreLevel.textContent = localizedMessage("core.level", {level:localizedNumber(payload.selected_core?.level || 1)});
    const coreVisual = applyCoreVisualIdentity(core, payload.selected_core?.id || "core_resonance");
    coreGlyph.textContent = coreVisual.glyph;
    coreCopy.append(coreName, coreLevel);
    core.append(coreGlyph, coreCopy);
    const modules = document.createElement("div");
    modules.className = "profile-featured-modules";
    for (const definitionId of (payload.featured_deck?.module_ids || []).slice(0, 6)) {
      const definition = moduleDefinitions.find((item) => item.definitionId === definitionId);
      const tile = document.createElement("span");
      tile.className = "profile-deck-module";
      tile.dataset.category = definition?.category || "";
      tile.textContent = moduleIconFor(definition || null);
      tile.title = localizedUiText(definition?.nameTr || definitionId);
      modules.appendChild(tile);
    }
    const deckUse = document.createElement("small");
    const matches = Number(payload.featured_deck?.matches || 0);
    deckUse.textContent = matches > 0 ? localizedMessage("deck.matches_used", {count:matches}) : localizedMessage("profile.active_deck");
    modules.appendChild(deckUse);
    deckVisual.append(core, modules);
    deckSection.append(deckHeading, deckVisual);
    host.appendChild(deckSection);

    const team = document.createElement("section");
    team.className = "profile-clan-card";
    const teamLabel = document.createElement("span");
    teamLabel.textContent = localizedMessage("profile.team_info");
    const teamName = createTeamProfileLink(
      payload.team?.team_id,
      payload.team?.team_name || localizedMessage("profile.no_team")
    );
    const teamCopy = document.createElement("small");
    teamCopy.textContent = payload.team?.team_name
      ? localizedMessage("profile.players_team")
      : localizedMessage("profile.player_no_team");
    team.append(teamLabel, teamName, teamCopy);
    host.appendChild(team);

    const seasonSection = document.createElement("section");
    seasonSection.className = "profile-season-history";
    const seasonHeading = document.createElement("div");
    seasonHeading.className = "profile-section-heading";
    const seasonKicker = document.createElement("span");
    seasonKicker.textContent = localizedMessage("profile.seasons_upper");
    const seasonTitle = document.createElement("h3");
    seasonTitle.textContent = localizedMessage("profile.season_history");
    seasonHeading.append(seasonKicker, seasonTitle);
    const currentSeason = document.createElement("article");
    currentSeason.className = "profile-current-season public-profile-current-season";
    const currentSeasonName = document.createElement("div");
    const currentSeasonLabel = document.createElement("small");
    currentSeasonLabel.textContent = localizedMessage("profile.current_season_upper");
    const currentSeasonValue = document.createElement("strong");
    currentSeasonValue.textContent = localizedRecordText(payload.season, "name") || localizedMessage("profile.current_season");
    currentSeasonName.append(currentSeasonLabel, currentSeasonValue);
    const seasonTrophies = document.createElement("strong");
    renderTrophyValue(seasonTrophies, Number(payload.rating || 0));
    const seasonRank = document.createElement("div");
    const seasonRankLabel = document.createElement("small");
    seasonRankLabel.textContent = localizedMessage("profile.current_league_upper");
    const seasonRankValue = document.createElement("strong");
    seasonRankValue.textContent = localizedRecordText(payload, "rank_name") || localizedMessage("arena.first");
    seasonRank.append(seasonRankLabel, seasonRankValue);
    currentSeason.append(currentSeasonName, seasonTrophies, seasonRank);
    const past = document.createElement("div");
    past.className = "profile-past-seasons";
    const previous = payload.season?.summary?.previous;
    const best = payload.season?.summary?.best;
    for (const [label, value] of [
      ["profile.last_season_upper", previous ? Number(previous.final_rating || 0) : "—"],
      ["profile.best_season_upper", best ? Number(best.final_rating || 0) : "—"],
      ["profile.all_time_upper", Number(payload.highest_rating || payload.rating || 0)],
    ]) {
      const card = document.createElement("article");
      const cardLabel = document.createElement("small");
      cardLabel.textContent = localizedMessage(label);
      const valueNode = document.createElement("strong");
      renderTrophyValue(valueNode, value);
      card.append(cardLabel, valueNode);
      past.appendChild(card);
    }
    seasonSection.append(seasonHeading, currentSeason, past);
    host.appendChild(seasonSection);

    const statistics = payload.statistics || {};
    const statsSection = document.createElement("section");
    statsSection.className = "public-profile-statistics";
    const statsHeading = document.createElement("div");
    statsHeading.className = "profile-section-heading";
    const statsKicker = document.createElement("span");
    statsKicker.textContent = localizedMessage("profile.battle_archive");
    const statsTitle = document.createElement("h3");
    statsTitle.textContent = localizedMessage("profile.statistics");
    statsHeading.append(statsKicker, statsTitle);
    const statsGrid = document.createElement("div");
    statsGrid.className = "statistics-metrics-grid public-profile-stat-grid";
    const durationSeconds = Math.max(0, Math.round(Number(statistics.average_match_duration_ms || 0) / 1000));
    const durationText = durationSeconds < 60
      ? localizedMessage("time.seconds_short", {count:localizedNumber(durationSeconds)})
      : localizedMessage("time.minutes_seconds_short", {minutes:localizedNumber(Math.floor(durationSeconds / 60)), seconds:localizedNumber(durationSeconds % 60)});
    for (const metric of [
      [localizedMessage("profile.total_matches"), localizedNumber(statistics.total_matches || 0)],
      [localizedMessage("profile.win_rate"), localizedPercent(boundedWinRatePercent(statistics.win_rate, statistics.wins, statistics.total_matches))],
      [localizedMessage("profile.average_battle"), durationText],
      [localizedMessage("profile.total_damage"), localizedNumber(statistics.total_damage_dealt || 0)],
    ]) statsGrid.appendChild(publicProfileMetric(...metric));
    statsSection.append(statsHeading, statsGrid);
    host.appendChild(statsSection);
  }

  function renderPublicProfileFriendAction(payload = null) {
    const button = document.getElementById("public-profile-friend-action");
    if (!button) return;
    const playerId = String(payload?.player_id || activePublicProfileId || "");
    button.hidden = !playerId || Boolean(payload?.is_bot);
    if (button.hidden) return;
    const isFriend = socialState?.friends?.some((item) => item.player_id === playerId);
    const incoming = socialState?.incoming_requests?.some((item) => item.player_id === playerId);
    const outgoing = socialState?.outgoing_requests?.some((item) => item.player_id === playerId);
    button.disabled = Boolean(isFriend || outgoing);
    button.dataset.relationship = isFriend ? "friend" : incoming ? "incoming" : outgoing ? "outgoing" : "none";
    button.textContent = localizedMessage(isFriend
      ? "profile.your_friend"
      : incoming
        ? "profile.accept_request"
        : outgoing
          ? "profile.request_sent"
          : "profile.add_friend");
    for (const id of ["public-profile-share", "public-profile-report", "public-profile-block"]) {
      const action = document.getElementById(id);
      if (action) action.hidden = !playerId || Boolean(payload?.is_bot);
    }
  }

  async function openPublicProfile(playerId) {
    if (!isPublicProfileTarget(playerId)) return;
    const dialog = document.getElementById("public-profile-dialog");
    const status = document.getElementById("public-profile-status");
    const content = document.getElementById("public-profile-content");
    const sourceDialog = ["leaderboard-dialog", "arena-detail-dialog", "team-profile-dialog"]
      .map((id) => document.getElementById(id))
      .find((candidate) => candidate?.open);
    publicProfileReturnDialogId = sourceDialog?.id || null;
    if (sourceDialog?.close) sourceDialog.close();
    else sourceDialog?.removeAttribute("open");
    if (content) content.replaceChildren();
    if (status) status.textContent = localizedMessage("profile.player_loading");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    activePublicProfileId = playerId;
    publicProfilePayload = null;
    renderPublicProfileFriendAction();
    try {
      const payload = await requestJsonWithDeadline(
        `/public-profiles/${encodeURIComponent(playerId)}`,
        { cache: "no-store" },
        8000
      );
      const title = document.getElementById("public-profile-title");
      if (title) title.textContent = localizedMessage("profile.public_title", {name:payload.display_name || localizedMessage("profile.player")});
      if (status) status.textContent = "";
      publicProfilePayload = payload;
      renderPublicProfile(payload);
      if (!payload.is_bot) await loadSocialView();
      renderPublicProfileFriendAction(payload);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function closePublicProfile() {
    const dialog = document.getElementById("public-profile-dialog");
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
    const returnDialog = publicProfileReturnDialogId
      ? document.getElementById(publicProfileReturnDialogId)
      : null;
    publicProfileReturnDialogId = null;
    activePublicProfileId = null;
    publicProfilePayload = null;
    if (returnDialog?.showModal && !returnDialog.open) returnDialog.showModal();
    else returnDialog?.setAttribute("open", "");
  }

  function renderTeamProfile(payload) {
    const host = document.getElementById("team-profile-content");
    if (!host) return;
    host.replaceChildren();

    const identity = document.createElement("article");
    identity.className = "team-public-identity";
    const emblem = document.createElement("span");
    emblem.className = "team-public-emblem";
    emblem.textContent = "♟";
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = payload.name || localizedMessage("profile.team");
    const size = document.createElement("small");
    size.textContent = localizedMessage("team.member_count_lower", {count:localizedNumber(payload.member_count || 0), limit:localizedNumber(payload.member_limit || 30)});
    copy.append(name, size);
    const trophies = document.createElement("strong");
    renderTrophyValue(trophies, Number(payload.total_trophies || 0));
    identity.append(emblem, copy, trophies);
    host.appendChild(identity);

    const statistics = payload.statistics || {};
    const tournament = payload.tournament || {};
    const statsSection = document.createElement("section");
    statsSection.className = "team-profile-statistics";
    const heading = document.createElement("div");
    heading.className = "profile-section-heading";
    const kicker = document.createElement("span");
    kicker.textContent = localizedMessage("team.archive_upper");
    const title = document.createElement("h3");
    title.textContent = localizedMessage("team.statistics");
    heading.append(kicker, title);
    const grid = document.createElement("div");
    grid.className = "statistics-metrics-grid public-profile-stat-grid team-profile-stat-grid";
    for (const metric of [
      [localizedMessage("team.total_trophies"), localizedNumber(payload.total_trophies || 0)],
      [localizedMessage("team.average_trophies"), localizedNumber(payload.average_trophies || 0)],
      [localizedMessage("profile.total_matches"), localizedNumber(statistics.total_matches || 0)],
      [localizedMessage("profile.win_rate"), localizedPercent(boundedWinRatePercent(statistics.win_rate, statistics.wins, statistics.total_matches))],
      [localizedMessage("team.tournament_rank"), tournament.position ? `#${tournament.position}` : "—"],
      [localizedMessage("team.tournament_points"), localizedMessage("event.team_points", {points:localizedNumber(tournament.points || 0)})],
    ]) grid.appendChild(publicProfileMetric(...metric));
    statsSection.append(heading, grid);
    host.appendChild(statsSection);

    const membersSection = document.createElement("section");
    membersSection.className = "team-profile-members";
    const membersHeading = document.createElement("div");
    membersHeading.className = "profile-section-heading";
    const membersKicker = document.createElement("span");
    membersKicker.textContent = localizedMessage("team.roster_upper");
    const membersTitle = document.createElement("h3");
    membersTitle.textContent = localizedMessage("team.members");
    membersHeading.append(membersKicker, membersTitle);
    const memberList = document.createElement("ol");
    memberList.className = "team-member-list team-profile-member-list";
    for (const [index, member] of (payload.members || []).entries()) {
      const row = createTeamMemberRow(member, index);
      const meta = row.querySelector("small");
      if (meta) meta.textContent = localizedMessage("team.member_rank_title", {leader:member.role === "owner" ? localizedMessage("team.leader_suffix") : "", rank:localizedRecordText(member, "rank_name") || localizedMessage("team.arena"), title:localizedRecordText(member, "operator_title") || localizedMessage("team.operator")});
      memberList.appendChild(row);
    }
    membersSection.append(membersHeading, memberList);
    host.appendChild(membersSection);
  }

  async function openTeamProfile(teamId) {
    const cleanTeamId = String(teamId || "").trim();
    if (!cleanTeamId) return;
    const dialog = document.getElementById("team-profile-dialog");
    const status = document.getElementById("team-profile-status");
    const content = document.getElementById("team-profile-content");
    const sourceDialog = ["leaderboard-dialog", "public-profile-dialog"]
      .map((id) => document.getElementById(id))
      .find((candidate) => candidate?.open);
    teamProfileReturnDialogId = sourceDialog?.id || null;
    if (sourceDialog?.close) sourceDialog.close();
    else sourceDialog?.removeAttribute("open");
    if (content) content.replaceChildren();
    teamProfilePayload = null;
    if (status) status.textContent = localizedMessage("team.profile_loading");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    try {
      const payload = await requestJsonWithDeadline(
        `/team-profiles/${encodeURIComponent(cleanTeamId)}`,
        { cache:"no-store" },
        8000
      );
      const title = document.getElementById("team-profile-title");
      if (title) title.textContent = payload.name || localizedMessage("team.profile");
      if (status) status.textContent = "";
      teamProfilePayload = payload;
      renderTeamProfile(payload);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function closeTeamProfile() {
    const dialog = document.getElementById("team-profile-dialog");
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
    const returnDialog = teamProfileReturnDialogId
      ? document.getElementById(teamProfileReturnDialogId)
      : null;
    teamProfileReturnDialogId = null;
    teamProfilePayload = null;
    if (returnDialog?.showModal && !returnDialog.open) returnDialog.showModal();
    else returnDialog?.setAttribute("open", "");
  }

  function createLeaderboardRewardPopover(reward, position) {
    const popover = document.createElement("span");
    popover.className = "leaderboard-reward-popover";
    popover.id = `leaderboard-reward-popover-${position}`;
    popover.setAttribute("role", "tooltip");

    const title = document.createElement("strong");
    title.textContent = reward.chest_visual_id || reward.chest_name_tr
      ? localizedRewardChestName(reward)
      : localizedMessage("reward.position_prize", {position:localizedNumber(position)});
    const list = document.createElement("span");
    list.className = "leaderboard-reward-popover-list";
    const rewards = [
      ["◉", localizedMessage("currency.credits_full", {amount:localizedNumber(reward.circuit_credits || 0)})],
      ["◇", localizedMessage("currency.flux", {amount:localizedNumber(reward.flux_shards || 0)})],
      ["🧩", localizedMessage("reward.universal_shards", {amount:localizedNumber(reward.universal_module_shards || 0)})],
      ...[
        ["rank_trophy_id", "trophy"], ["badge_id", "badge"],
        ["avatar_id", "avatar"], ["avatar_frame_id", "frame"],
        ["emoji_id", "emoji"], ["profile_background_id", "background"],
        ["team_avatar_id", "team_cosmetic"], ["team_frame_id", "team_cosmetic"],
        ["team_name_frame_id", "team_cosmetic"], ["team_bar_background_id", "team_cosmetic"],
      ].filter(([field]) => reward[field]).map(([field, kind]) => ["✦", localizedCatalogName(kind, reward[field])]),
    ];
    for (const [glyph, label] of rewards) {
      const row = document.createElement("span");
      const icon = document.createElement("i");
      icon.textContent = glyph;
      const text = document.createElement("span");
      text.textContent = label;
      row.append(icon, text);
      list.appendChild(row);
    }
    const note = document.createElement("small");
    note.textContent = "Sezon sonunda mesaj kutusuna teslim edilir.";
    popover.append(title, list, note);
    return popover;
  }

  function renderLeaderboard() {
    const host = document.getElementById("leaderboard-list");
    const status = document.getElementById("leaderboard-status");
    const season = document.getElementById("leaderboard-season-label");
    if (!host) return;
    host.replaceChildren();
    if (season && leaderboardPayload?.season) {
      season.textContent = localizedMessage("leaderboard.season_period", {name:localizedUiText(leaderboardPayload.season.name_tr), start:localizedDate(leaderboardPayload.season.starts_at, {dateStyle:"medium"}), end:localizedDate(leaderboardPayload.season.ends_at, {dateStyle:"medium"})});
    }
    const scopeNav = document.getElementById("leaderboard-trophy-scope");
    const currentGroupLabel = document.getElementById("leaderboard-current-group");
    if (scopeNav) scopeNav.hidden = activeLeaderboardTab !== "trophies";
    const groups = leaderboardPayload?.trophy_groups || [];
    const viewerGroup = leaderboardPayload?.viewer_trophy_group
      || groups.find((group) => (group.standings || []).some((row) => row.player_id === participantPlayerId))
      || groups[0]
      || null;
    if (currentGroupLabel) {
      currentGroupLabel.hidden = activeLeaderboardTab !== "trophies"
        || activeTrophyLeaderboardScope !== "group";
      currentGroupLabel.textContent = viewerGroup
        ? localizedMessage("leaderboard.current_group", {name:localizedUiText(viewerGroup.name_tr)})
        : localizedMessage("leaderboard.no_current_group");
    }
    let rows = leaderboardPayload?.[activeLeaderboardTab] || [];
    if (activeLeaderboardTab === "trophies" && activeTrophyLeaderboardScope === "group") {
      rows = viewerGroup?.standings || [];
    }
    const labels = {
      trophies: "Sezon Kupası",
      core_damage: "Toplam Çekirdek Hasarı",
      teams: "Takım Kupası",
    };
    if (status) status.textContent = rows.length
      ? localizedMessage("leaderboard.list_summary", {name:localizedUiText(labels[activeLeaderboardTab]), scope:activeLeaderboardTab === "trophies" ? localizedMessage("leaderboard.scope_suffix", {name:activeTrophyLeaderboardScope === "general" ? localizedMessage("leaderboard.general") : localizedUiText(viewerGroup?.name_tr || "Grup")}) : "", count:localizedNumber(rows.length)})
      : localizedMessage("leaderboard.empty");
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "İlk tamamlanan savaşla bu liste oluşacak.";
      host.appendChild(empty);
      return;
    }
    for (const row of rows) {
      const item = document.createElement("li");
      item.className = "leaderboard-row";
      if (row.player_id === participantPlayerId) item.classList.add("is-current-player");
      const rank = document.createElement("strong");
      rank.className = "leaderboard-rank";
      const medal = { 1:"🥇", 2:"🥈", 3:"🥉" }[Number(row.position)];
      rank.textContent = medal || String(row.position);
      rank.classList.toggle("is-medal", Boolean(medal));
      rank.setAttribute("aria-label", localizedMessage("leaderboard.position_aria", {position:localizedNumber(row.position)}));
      const identity = document.createElement("div");
      identity.className = "leaderboard-identity";
      const name = row.team_name || row.display_name || "Oyuncu";
      const detail = activeLeaderboardTab === "teams"
        ? localizedMessage("team.members_lower", {count:localizedNumber(row.member_count)})
        : row.rank_name_tr || "Arena";
      const nameNode = activeLeaderboardTab === "teams"
        ? createTeamProfileLink(row.team_id, name)
        : createPublicPlayerName(row.player_id, name);
      const detailNode = document.createElement("small");
      detailNode.textContent = detail;
      identity.append(nameNode, detailNode);
      const score = document.createElement("strong");
      score.className = "leaderboard-score";
      if (activeLeaderboardTab === "core_damage") {
        score.textContent = localizedMessage("leaderboard.damage_score", {damage:localizedNumber(row.value || 0)});
      } else {
        renderTrophyValue(score, Number(row.value || 0));
        if (activeLeaderboardTab === "trophies" && activeTrophyLeaderboardScope === "general" && Number(row.position) <= 10) {
          const reward = (leaderboardPayload?.top_ten_rewards || []).find((item) => Number(item.position) === Number(row.position));
          if (reward) {
            const chest = document.createElement("button");
            chest.type = "button";
            chest.className = "leaderboard-reward-chest";
            chest.dataset.rank = String(row.position);
            const previewTier = Number(row.position) === 1
              ? "diamond"
              : Number(row.position) <= 3
                ? "gold"
                : Number(row.position) <= 5
                  ? "silver"
                  : "bronze";
            chest.innerHTML = chestVisualMarkup(reward.chest_tier || previewTier, {
              visualId:reward.chest_visual_id || "",
            });
            chest.setAttribute("aria-label", localizedMessage("reward.chest_contents_aria", {name:localizedUiText(reward.chest_name_tr || "Ödül sandığı")}));
            chest.setAttribute("aria-describedby", `leaderboard-reward-popover-${row.position}`);
            chest.appendChild(createLeaderboardRewardPopover(reward, row.position));
            score.appendChild(chest);
          }
        }
      }
      item.append(rank, identity, score);
      host.appendChild(item);
    }
  }

  async function loadLeaderboard() {
    const status = document.getElementById("leaderboard-status");
    if (status) status.textContent = "Sıralama yükleniyor…";
    try {
      const response = await fetchWithDeadline(
        `/leaderboards?player_id=${encodeURIComponent(participantPlayerId)}`,
        { cache: "no-store" },
        8000
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(localizedApiError(payload, response.status));
      leaderboardPayload = payload;
      renderLeaderboard();
      return { ok: true };
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok: false };
    }
  }

  function openLeaderboard() {
    const arena = document.getElementById("arena-detail-dialog");
    if (arena?.open && arena.close) arena.close();
    const dialog = document.getElementById("leaderboard-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    loadLeaderboard();
  }

  function renderRewardInbox() {
    const host = document.getElementById("reward-inbox-list");
    const button = document.getElementById("reward-inbox-button");
    const notification = document.getElementById("reward-inbox-notification");
    const unclaimed = Number(rewardInboxState?.unclaimed_count || 0);
    button?.classList.toggle("has-reward", unclaimed > 0);
    if (notification) notification.hidden = unclaimed < 1;
    if (!host) return;
    host.replaceChildren();
    const messages = rewardInboxState?.messages || [];
    if (!messages.length) {
      const empty = document.createElement("p");
      empty.className = "leaderboard-empty";
      empty.textContent = "Yeni rekabet ödülü yok. Sezon ve hafta kapanışları burada teslim edilir.";
      host.appendChild(empty);
      return;
    }
    for (const message of messages) {
      const card = document.createElement("article");
      card.className = "reward-inbox-card";
      const reward = message.chest || {};
      const chest = document.createElement("i");
      chest.innerHTML = chestVisualMarkup(reward.chest_tier || "bronze", {
        visualId:reward.chest_visual_id || "",
      });
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const sourceKey = `reward.source.${message.source}`;
      const sourceName = localizedMessage(sourceKey);
      title.textContent = sourceName !== sourceKey
        ? localizedMessage("reward.competition_title", {source:sourceName, position:localizedNumber(message.position || 0)})
        : localizedRecordText(message, "title") || localizedMessage("reward.competition");
      const detail = document.createElement("small");
      const cosmeticCount = [
        "rank_trophy_id", "badge_id", "avatar_id", "avatar_frame_id",
        "emoji_id", "profile_background_id", "team_avatar_id",
        "team_frame_id", "team_name_frame_id", "team_bar_background_id",
      ].filter((key) => reward[key]).length;
      detail.textContent = [
        localizedRewardChestName(reward),
        localizedMessage("currency.credits_short", {amount:localizedNumber(reward.circuit_credits || 0)}),
        localizedMessage("currency.flux", {amount:localizedNumber(reward.flux_shards || 0)}),
        reward.universal_module_shards ? localizedMessage("reward.universal_shards_lower", {amount:localizedNumber(reward.universal_module_shards)}) : "",
        cosmeticCount ? localizedMessage("reward.cosmetic_count", {count:localizedNumber(cosmeticCount)}) : "",
      ].filter(Boolean).join(" · ");
      copy.append(title, detail);
      const claim = document.createElement("button");
      claim.type = "button";
      claim.textContent = localizedMessage(message.status === "claimed" ? "reward.claimed_upper" : "reward.claim_and_open_upper");
      claim.disabled = message.status === "claimed";
      claim.addEventListener("click", async () => {
        claim.disabled = true;
        const status = document.getElementById("reward-inbox-status");
        if (status) status.textContent = localizedMessage("reward.chest_opening");
        try {
          const payload = await requestJsonWithDeadline(
            `/profile/${encodeURIComponent(participantPlayerId)}/reward-inbox/${encodeURIComponent(message.message_id)}/claim`,
            { method:"POST", body:JSON.stringify({ request_id:`inbox:${message.message_id}:${Date.now()}` }) },
            30000
          );
          rewardInboxState = payload;
          if (payload.profile) profileState.applyProfile(payload.profile);
          await loadMetaProgression();
          renderRewardInbox();
          renderProfileSummary();
          if (status) status.textContent = localizedMessage("reward.chest_opened", {name:localizedRewardChestName(reward)});
        } catch (error) {
          claim.disabled = false;
          if (status) status.textContent = error instanceof Error ? error.message : String(error);
        }
      });
      card.append(chest, copy, claim);
      host.appendChild(card);
    }
  }

  async function loadRewardInbox({ open=false } = {}) {
    const status = document.getElementById("reward-inbox-status");
    try {
      rewardInboxState = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/reward-inbox`,
        { cache:"no-store" },
        12000
      );
      if (status) status.textContent = "";
      renderRewardInbox();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
    if (open) {
      const dialog = document.getElementById("reward-inbox-dialog");
      if (dialog?.showModal && !dialog.open) dialog.showModal();
      else dialog?.setAttribute("open", "");
    }
  }

  function renderEngagementSummary(engagement) {
    if (!engagement) return;

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    const progress = Math.max(0, Number(engagement.tier_progress || 0));
    const required = Math.max(1, Number(engagement.tier_progress_required || 1));
    const percentage = Math.min(100, Math.round((progress / required) * 100));
    const rewardList = engagement.rewardTrack || [];
    const nextReward = rewardList.find(
      (reward) => Number(engagement.season_xp || 0) < Number(reward.required_xp || 0)
    );

    setText("season-rewards-kicker", localizedMessage("season.rewards_kicker"));
    setText("season-rewards-subtitle", localizedMessage("season.rewards_subtitle", {season:localizedRecordText(engagement, "season_name") || localizedMessage("season.this_season")}));
    setText("season-rewards-name", localizedRecordText(engagement, "season_name") || localizedMessage("season.rewards_kicker"));
    setText("season-flux-shards", engagement.flux_shards || 0);
    setText("season-equipped-title", localizedRecordText(engagement, "equipped_title") || localizedMessage("profile.default_title"));
    setText(
      "season-tier-label",
      localizedMessage("season.tier_progress", {current:localizedNumber(engagement.current_tier || 0), maximum:localizedNumber(engagement.max_tier || 40)})
    );
    const seasonXp = Number(engagement.season_xp || 0);
    setText("season-progress-copy", nextReward ? localizedMessage("season.xp_remaining", {count:Math.max(0, Number(nextReward.required_xp || 0) - seasonXp)}) : localizedMessage("season.path_completed"));
    const nextTierExperience = Number(nextReward?.required_xp || rewardList.at(-1)?.required_xp || seasonXp);
    setText("season-progress-ratio", localizedMessage("season.progress", {current:seasonXp, next:nextTierExperience}));
    setText("lobby-season-tier", localizedMessage("season.tier_progress", {current:localizedNumber(engagement.current_tier || 0), maximum:localizedNumber(engagement.max_tier || 40)}));
    setText("lobby-season-progress-copy", nextReward ? localizedMessage("season.xp_remaining", {count:Math.max(0, Number(nextReward.required_xp || 0) - seasonXp)}) : localizedMessage("season.path_completed"));
    setText("lobby-flux-shards", engagement.flux_shards || 0);

    const missionList = engagement.dailyMissions || [];
    const loginRewards = engagement.daily_login?.rewards || [];
    const claimableLoginRewards = loginRewards.filter((reward) => reward.claimable).length;
    const claimableMissions = missionList.filter(
      (mission) => mission.completed && !mission.claimed
    ).length;
    const notifications = engagement.notifications || {};
    const loginHasNotification = notifications.daily_login
      ?? (claimableLoginRewards > 0);
    const missionHasNotification = notifications.daily_missions
      ?? (claimableMissions > 0);
    const dailyHasNotification = notifications.daily
      ?? (loginHasNotification || missionHasNotification);
    const activeMissions = missionList.filter((mission) => !mission.claimed).length;
    setText(
      "lobby-daily-summary",
      claimableMissions + claimableLoginRewards > 0
        ? localizedMessage("rewards.available", {count:claimableMissions + claimableLoginRewards})
        : localizedMessage("daily.active_orders", {count:localizedNumber(activeMissions)})
    );
    setText(
      "daily-mission-page-summary",
      claimableMissions > 0
        ? localizedMessage("rewards.available", {count:claimableMissions})
        : localizedMessage("daily.active_missions", {count:localizedNumber(activeMissions)})
    );
    const dailyNotification = document.getElementById("lobby-daily-notification");
    if (dailyNotification) dailyNotification.hidden = !dailyHasNotification;
    const claimableRewards = rewardList.filter(
      (reward) => reward.claimable && !reward.claimed
    ).length;
    const seasonHasNotification = notifications.season
      ?? (claimableRewards > 0);
    setText(
      "lobby-reward-summary",
      claimableRewards > 0
        ? localizedMessage("season.tier_rewards", {count:claimableRewards})
        : localizedMessage("season.free_tiers", {count:engagement.max_tier || 40})
    );
    const rewardNotification = document.getElementById("lobby-reward-notification");
    if (rewardNotification) rewardNotification.hidden = !seasonHasNotification;

    const notificationByScreen = {
      profile: false,
      // Profile terminalinde okunmamış durum tek bir hedefte görünür:
      // Ödüller sekmesi. Avatar açılır ekranı kendi başına nokta taşımaz.
      avatar: false,
      daily: notifications.rewards ?? (dailyHasNotification || seasonHasNotification),
      "daily-rewards": Boolean(loginHasNotification),
      "daily-missions": Boolean(missionHasNotification),
      rewards: Boolean(seasonHasNotification),
    };
    for (const button of document.querySelectorAll("[data-open-screen]")) {
      const target = button.dataset.openScreen;
      if (!(target in notificationByScreen)) continue;
      const hasOwnLobbyDot = Boolean(button.querySelector(".lobby-notification-dot"));
      button.classList.toggle(
        "has-persistent-notification",
        Boolean(notificationByScreen[target]) && !hasOwnLobbyDot
      );
    }
    const lobbyProfileButton = document.getElementById("lobby-profile-button");
    lobbyProfileButton?.classList.toggle(
      "has-avatar-notification",
      Boolean(dailyHasNotification || seasonHasNotification || notifications.avatar)
    );

    const progressTrack = document.querySelector(".season-progress-track");
    const progressFill = document.getElementById("season-progress-fill");
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(percentage));
    if (progressFill) progressFill.style.width = `${percentage}%`;
    const lobbyProgressTrack = document.querySelector(".lobby-season-track");
    const lobbyProgressFill = document.getElementById("lobby-season-progress-fill");
    if (lobbyProgressTrack) lobbyProgressTrack.setAttribute("aria-valuenow", String(percentage));
    if (lobbyProgressFill) lobbyProgressFill.style.width = `${percentage}%`;

    const loginTrack = document.getElementById("monthly-login-track");
    setText(
      "monthly-login-summary",
      claimableLoginRewards
        ? localizedMessage("daily.today_reward_ready")
        : localizedMessage("daily.claimed_days", {count:localizedNumber(engagement.daily_login?.claimed_days?.length || 0)})
    );
    if (loginTrack) {
      loginTrack.replaceChildren();
      const today = Number(engagement.daily_login?.today || 1);
      for (const reward of loginRewards) {
        const card = document.createElement("article");
        card.className = "monthly-login-card";
        card.dataset.state = reward.claimed
          ? "claimed"
          : reward.claimable
            ? "claimable"
            : Number(reward.day) < today
              ? "missed"
              : "locked";
        card.dataset.major = String(Boolean(reward.is_major));
        const day = document.createElement("strong");
        day.textContent = localizedMessage("daily.day_label", {day:localizedNumber(reward.day)});
        const prize = createRewardRows(reward, { compact:true });
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.loginClaim = String(reward.day);
        action.disabled = !reward.claimable;
        action.textContent = localizedMessage(reward.claimed
          ? "reward.claimed_upper"
          : reward.claimable
            ? "reward.claim_upper"
            : Number(reward.day) < today
              ? "reward.missed_upper"
              : "reward.locked_upper");
        card.append(day, prize, action);
        loginTrack.appendChild(card);
      }
    }

    const missions = document.getElementById("daily-mission-list");
    if (missions) {
      missions.replaceChildren();
      for (const mission of engagement.dailyMissions || []) {
        const card = document.createElement("article");
        card.className = "daily-mission-card";
        card.dataset.state = mission.claimed
          ? "claimed"
          : mission.completed
            ? "claimable"
            : "active";
        const copy = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = localizedRecordText(mission, "name");
        const description = document.createElement("span");
        description.textContent = localizedRecordText(mission, "description");
        const meter = document.createElement("small");
        meter.textContent = localizedMessage("daily.mission_meter", {progress:localizedNumber(mission.progress), target:localizedNumber(mission.target), xp:localizedNumber(mission.season_xp_reward), flux:localizedNumber(mission.flux_shard_reward)});
        copy.append(name, description, meter);
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.missionClaim = mission.id;
        action.disabled = !mission.completed || mission.claimed;
        action.textContent = localizedMessage(mission.claimed
          ? "reward.claimed_title"
          : mission.completed
            ? "reward.claim"
            : "daily.in_progress");
        card.append(copy, action);
        missions.appendChild(card);
      }
    }

    const rewards = document.getElementById("season-reward-track");
    if (rewards) {
      rewards.replaceChildren();
      for (const reward of engagement.rewardTrack || []) {
        const card = document.createElement("article");
        card.className = "season-reward-card";
        card.dataset.major = String(Boolean(reward.is_major));
        card.dataset.state = reward.claimed
          ? "claimed"
          : reward.claimable
            ? "claimable"
            : "locked";
        const tier = document.createElement("span");
        tier.textContent = localizedMessage("season.tier_label", {tier:localizedNumber(reward.tier)});
        const prize = document.createElement("div");
        prize.className = "season-reward-prize";
        const rewardItems = createRewardRows(reward, { compact:true });
        rewardItems.classList.add("season-reward-items");
        if (reward.chest_tier) {
          const chestRow = document.createElement("div");
          chestRow.className = "reward-resource-row season-reward-chest-item";
          chestRow.dataset.rewardKind = "chest";
          const chestPrize = document.createElement("div");
          const chestTierName = {
            bronze:"Bronz",
            silver:"Gümüş",
            gold:"Altın",
            diamond:"Elmas",
          }[reward.chest_tier] || "Sandık";
          const chestName = localizedMessage("chest.tier_name", {tier:localizedUiText(chestTierName)});
          chestPrize.className = "season-reward-chest";
          chestPrize.dataset.tier = reward.chest_tier;
          chestPrize.innerHTML = chestVisualMarkup(reward.chest_tier);
          chestPrize.setAttribute("aria-label", chestName);
          chestPrize.title = chestName;
          const chestAmount = document.createElement("strong");
          chestAmount.textContent = "×1";
          chestRow.setAttribute("aria-label", localizedMessage("reward.single_item", {name:chestName}));
          chestRow.title = localizedMessage("reward.single_item", {name:chestName});
          chestRow.append(chestPrize, chestAmount);
          rewardItems.prepend(chestRow);
        }
        if (reward.avatar_id) {
          rewardItems.appendChild(createSeasonCosmeticRewardRow("avatar", reward.avatar_id));
        }
        if (reward.avatar_frame_id) {
          rewardItems.appendChild(
            createSeasonCosmeticRewardRow("avatar_frame", reward.avatar_frame_id)
          );
        }
        prize.appendChild(rewardItems);
        const requirement = document.createElement("small");
        requirement.textContent = localizedMessage("season.xp_unlock", {xp:localizedNumber(reward.required_xp)});
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.tierClaim = String(reward.tier);
        action.disabled = !reward.claimable;
        action.textContent = localizedMessage(reward.claimed
          ? "reward.claimed_title"
          : reward.claimable
            ? "reward.claim_short"
            : "reward.locked");
        const actionColumn = document.createElement("div");
        actionColumn.className = "season-reward-action";
        actionColumn.append(action, requirement);
        card.append(tier, prize, actionColumn);
        rewards.appendChild(card);
      }
    }

    globalThis.GridshardI18n?.apply(document.documentElement.lang || "tr");
  }

  function laboratoryRequestId(prefix) {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}:${participantPlayerId}:${suffix}`;
  }

  function renderLaboratoryModulePreview(module) {
    const host = document.getElementById("laboratory-detail-icon");
    if (!host || !module) return;

    host.replaceChildren();
    const card = document.createElement("div");
    card.className = "pool-detail-preview-card laboratory-board-preview";
    card.dataset.category = module.category || "";

    const icon = document.createElement("span");
    icon.className = "module-icon pool-detail-preview-icon";
    icon.textContent = moduleIconFor({ nameTr: module.name_tr });
    icon.setAttribute("aria-hidden", "true");

    card.append(icon);

    host.setAttribute(
      "aria-label",
      localizedMessage("laboratory.preview_aria", {name:localizedUiText(module.name_tr)})
    );
    host.appendChild(card);
  }

  function laboratoryStatSummary(stats) {
    if (!stats) return localizedMessage("laboratory.maximum_calibration");
    const parts = [];
    if (Number(stats.base_damage) > 0) {
      parts.push(localizedMessage("laboratory.damage", {value:localizedNumber(stats.base_damage, {minimumFractionDigits:1, maximumFractionDigits:1})}));
    }
    if (Number(stats.energy_generation) > 0) {
      parts.push(localizedMessage("laboratory.generation", {value:localizedNumber(stats.energy_generation, {minimumFractionDigits:1, maximumFractionDigits:1})}));
    }
    if (Number(stats.energy_consumption) > 0) {
      parts.push(localizedMessage("laboratory.consumption", {value:localizedNumber(stats.energy_consumption, {minimumFractionDigits:1, maximumFractionDigits:1})}));
    }
    if (Number(stats.cooldown_ms) > 0) {
      parts.push(localizedMessage("laboratory.cooldown", {value:localizedNumber(Number(stats.cooldown_ms) / 1000, {minimumFractionDigits:1, maximumFractionDigits:1})}));
    }
    parts.push(localizedMessage("laboratory.hp", {value:localizedNumber(Math.round(Number(stats.max_hp || 0)))}));
    return parts.join(" · ");
  }

  function renderLaboratory() {
    const view = accountDataLoader.laboratory;
    if (!view) return;
    const modules = Array.isArray(view.modules) ? view.modules : [];
    let selected = modules.find(
      (module) => module.id === selectedLaboratoryModuleId
    );
    if (!selected) {
      selected = modules[0] || null;
      selectedLaboratoryModuleId = selected?.id || "";
    }

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("laboratory-flux-balance", view.flux_shards || 0);
    setText("laboratory-invested-flux", localizedMessage("laboratory.invested", {flux:localizedNumber(view.invested_flux || 0)}));
    setText("lobby-flux-shards", view.flux_shards || 0);
    setText(
      "lobby-laboratory-summary",
      Number(view.calibrated_module_count || 0) > 0
        ? localizedMessage("laboratory.calibrated_count", {count:localizedNumber(view.calibrated_module_count)})
        : localizedMessage("laboratory.calibrate_favorites")
    );

    const list = document.getElementById("laboratory-module-list");
    if (list) {
      list.replaceChildren();
      const categories = ["enerji", "saldırı", "savunma", "destek", "sabotaj"];
      for (const category of categories) {
        const groupModules = modules.filter((module) => module.category === category);
        if (!groupModules.length) continue;
        const group = document.createElement("section");
        group.className = "laboratory-category-group";
        group.dataset.category = category;
        const heading = document.createElement("strong");
        heading.textContent = localizedMessage("laboratory.category_count", {category:localizedUiText(groupModules[0].category_label), count:localizedNumber(groupModules.length)});
        const grid = document.createElement("div");
        for (const module of groupModules) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.laboratoryModule = module.id;
          button.dataset.category = module.category;
          button.className = "laboratory-module-card";
          button.setAttribute(
            "aria-pressed",
            String(module.id === selectedLaboratoryModuleId)
          );
          if (module.id === selectedLaboratoryModuleId) {
            button.classList.add("is-selected");
          }
          const icon = document.createElement("span");
          icon.className = "laboratory-module-icon";
          icon.textContent = moduleIconFor({ nameTr: module.name_tr });
          const copy = document.createElement("span");
          const name = document.createElement("strong");
          name.textContent = localizedUiText(module.name_tr);
          const level = document.createElement("small");
          level.textContent = localizedMessage("module.level_range", {level:localizedNumber(module.level), max:localizedNumber(module.max_level)});
          copy.append(name, level);
          button.append(icon, copy);
          grid.appendChild(button);
        }
        group.append(heading, grid);
        list.appendChild(group);
      }
    }

    if (selected) {
      renderLaboratoryModulePreview(selected);
      setText("laboratory-detail-category", String(localizedRecordText(selected, "category_label") || "").toLocaleUpperCase(document.documentElement.lang === "en" ? "en-US" : "tr-TR"));
      setText("laboratory-detail-name", localizedUiText(selected.name_tr));
      setText("laboratory-detail-role", localizedRecordText(selected, "strategic_role"));
      setText("laboratory-detail-level", localizedMessage("module.level_range", {level:localizedNumber(selected.level), max:localizedNumber(selected.max_level)}));
      setText("laboratory-detail-effect", localizedRecordText(selected, "experimental_effect"));
      setText(
        "laboratory-current-efficiency",
        localizedMessage("laboratory.efficiency_percent", {percent:localizedNumber(selected.current_stats?.efficiency_bonus_percent || 0)})
      );
      setText("laboratory-current-stats", laboratoryStatSummary(selected.current_stats));
      setText(
        "laboratory-next-efficiency",
        selected.next_stats
          ? localizedMessage("laboratory.efficiency_percent", {percent:localizedNumber(selected.next_stats.efficiency_bonus_percent)})
          : localizedMessage("laboratory.max_upper")
      );
      setText("laboratory-next-stats", laboratoryStatSummary(selected.next_stats));
      const upgrade = document.getElementById("laboratory-upgrade-button");
      if (upgrade) {
        upgrade.dataset.moduleId = selected.id;
        upgrade.disabled = !selected.can_upgrade;
        upgrade.textContent = selected.next_cost == null
          ? localizedMessage("laboratory.maximum_calibration")
          : selected.can_upgrade
            ? localizedMessage("laboratory.calibrate_cost", {flux:localizedNumber(selected.next_cost)})
            : localizedMessage("laboratory.flux_required", {flux:localizedNumber(selected.next_cost)});
      }
    }

    const history = document.getElementById("laboratory-transaction-list");
    if (history) {
      history.replaceChildren();
      const transactions = Array.isArray(view.transactions) ? view.transactions : [];
      if (!transactions.length) {
        const empty = document.createElement("p");
        empty.className = "laboratory-empty-state";
        empty.textContent = localizedUiText("Henüz laboratuvar işlemi yok.");
        history.appendChild(empty);
      } else {
        for (const transaction of transactions) {
          const item = document.createElement("article");
          item.dataset.kind = transaction.kind;
          const copy = document.createElement("span");
          const title = document.createElement("strong");
          title.textContent = transaction.kind === "free_beta_reset"
            ? localizedUiText("Ücretsiz Beta Sıfırlaması")
            : localizedMessage("laboratory.transaction_level", {name:localizedUiText(transaction.module_name_tr), level:localizedNumber(transaction.level)});
          const date = document.createElement("small");
          date.textContent = localizedDate(transaction.created_at, {dateStyle:"medium", timeStyle:"short"});
          copy.append(title, date);
          const amount = document.createElement("strong");
          amount.textContent = localizedMessage("currency.signed_flux", {sign:transaction.flux_delta > 0 ? "+" : "", amount:localizedNumber(transaction.flux_delta)});
          item.append(copy, amount);
          history.appendChild(item);
        }
      }
    }

    const reset = document.getElementById("laboratory-reset-button");
    if (reset) reset.disabled = Number(view.invested_flux || 0) <= 0;
    globalThis.GridshardI18n?.apply(document.documentElement.lang || "tr");
  }

  async function upgradeLaboratorySelection() {
    const button = document.getElementById("laboratory-upgrade-button");
    const status = document.getElementById("laboratory-action-status");
    const moduleId = button?.dataset.moduleId;
    if (!moduleId || button?.disabled) return;
    button.disabled = true;
    if (status) status.textContent = localizedMessage("laboratory.verifying_calibration");
    const result = await accountDataLoader.upgradeLaboratoryModule(
      moduleId,
      laboratoryRequestId("upgrade")
    );
    renderLaboratory();
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok
        ? localizedMessage("laboratory.calibration_saved")
        : (result.reason || localizedMessage("laboratory.calibration_failed"));
      status.dataset.status = result.ok ? "success" : "error";
    }
  }

  async function resetLaboratorySelection() {
    const reset = document.getElementById("laboratory-reset-button");
    const status = document.getElementById("laboratory-action-status");
    if (reset?.disabled) return;
    reset.disabled = true;
    if (status) status.textContent = localizedMessage("laboratory.verifying_refund");
    const result = await accountDataLoader.resetLaboratory(
      laboratoryRequestId("reset")
    );
    renderLaboratory();
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok
        ? localizedMessage("laboratory.reset_refund", {flux:localizedNumber(result.payload.receipt.refund)})
        : (result.reason || localizedMessage("laboratory.reset_failed"));
      status.dataset.status = result.ok ? "success" : "error";
    }
  }

  async function claimEngagementReward(kind, id, button) {
    const status = document.getElementById(
      kind === "tiers" ? "season-action-status" : "daily-action-status"
    );
    const selectedReward = kind === "tiers"
      ? profileState.viewModel()?.engagement?.rewardTrack?.find(
          (reward) => String(reward.tier) === String(id)
        )
      : null;
    const opensChest = Boolean(selectedReward?.chest_tier);
    if (opensChest) {
      showChestOpening({
        tier: selectedReward.chest_tier,
        title: localizedMessage("season.tier_chest", {tier:localizedNumber(selectedReward.tier)}),
      });
    }
    if (button) button.disabled = true;
    if (status) status.textContent = localizedMessage("reward.claiming");
    const engagement = profileState.viewModel()?.engagement || {};
    const claimScope = kind === "missions"
      ? (engagement.daily_mission_day || new Date().toISOString().slice(0, 10))
      : kind === "login"
        ? (engagement.daily_login?.month || new Date().toISOString().slice(0, 7))
        : (engagement.season_id || "current");
    const requestId = `engagement:${participantPlayerId}:${claimScope}:${kind}:${id}`;
    const result = await accountDataLoader.claimEngagementReward(kind, id, requestId);
    // A failed request must remain retryable.  The deterministic request id
    // makes a retry safe even when the server committed the reward before a
    // network response was lost.
    if (!result.ok && button) button.disabled = false;
    if (result.ok) {
      await loadMetaProgression();
      if (result.payload?.season_chest_receipt) {
        showChestReveal(result.payload.season_chest_receipt);
      }
    } else if (opensChest) {
      showChestFailure(result.reason || localizedMessage("season.chest_failed"));
    }
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok ? "" : (result.reason || localizedMessage("reward.claim_failed"));
      status.dataset.status = result.ok ? "success" : "error";
    }
    return result;
  }

  async function saveProfileDisplayName() {
    const input =
      document.getElementById(
        "profile-display-name"
      );
    const status =
      document.getElementById(
        "profile-name-save-status"
      );

    const button = document.getElementById("profile-display-name-save");
    if (button?.disabled) return { ok:false, pending:true };
    if (button) button.disabled = true;
    if (status) status.textContent = localizedMessage("profile.saving_name");

    let result;
    try {
      result = await accountDataLoader.saveDisplayName(input?.value);
    } finally {
      if (button) button.disabled = false;
    }

    if (status) {
      status.textContent =
        result.ok
          ? localizedMessage("profile.name_saved")
          : (
              result.reason
              || localizedMessage("profile.name_save_failed")
            );
    }

    renderProfileSummary();
    renderRemoteDataStatus();

    return result;
  }

  function renderCanonStatistics() {
    const stats = metaProgressionState?.statistics;
    const summary = document.getElementById("statistics-live-summary");
    if (!stats || !summary) return;
    let host = document.getElementById("statistics-canon");
    if (!host) { host = document.createElement("div"); host.id = "statistics-canon"; host.className = "statistics-canon"; summary.after(host); }
    host.replaceChildren();
    const matches = Math.max(1, Number(stats.matches || 0));
    const entries = [
      [localizedMessage("stats.trophies_peak"), `${localizedNumber(stats.current_trophies)} / ${localizedNumber(stats.highest_trophies)}`],
      [localizedMessage("stats.arena_league"), localizedUiText(stats.rank)],
      [localizedMessage("stats.longest_streak"), stats.longest_streak || 0],
      [localizedMessage("stats.deployments_per_match"), localizedNumber((stats.deployments || 0) / matches, {minimumFractionDigits:1, maximumFractionDigits:1})],
      [localizedMessage("stats.current_total_average"), `${localizedNumber(stats.current_spent || 0)} / ${localizedNumber((stats.current_spent || 0) / matches, {minimumFractionDigits:1, maximumFractionDigits:1})}`],
      [localizedMessage("stats.core_power_uses"), stats.core_power_uses || 0],
      [localizedMessage("stats.peak_damage"), stats.peak_damage || 0],
      [localizedMessage("stats.unlocked_modules"), `${localizedNumber(stats.unlocked_modules)} / 36`],
      [localizedMessage("stats.upgraded_modules"), stats.upgraded_modules],
      [localizedMessage("stats.highest_module_level"), stats.highest_module_level],
      [localizedMessage("stats.unlocked_cores"), `${localizedNumber(stats.unlocked_cores)} / 7`],
      [localizedMessage("stats.opened_chests"), stats.opened_chests],
    ];
    for (const [id, count] of Object.entries(stats.cores || {})) entries.push([localizedUiText(metaProgressionState.cores?.types.find(c => c.id === id)?.name_tr || id), localizedPercent(Math.round(count / matches * 100))]);
    for (const [name, value] of entries) { const card=document.createElement("div"), label=document.createElement("small"), number=document.createElement("strong"); label.textContent=name; number.textContent=String(value ?? 0); card.append(label,number); host.appendChild(card); }
  }

  function renderStatisticsSummary() {
    renderCanonStatistics();
    const el =
      document.getElementById(
        "statistics-live-summary"
      );
    const view =
      statisticsState.viewModel();

    if (!el || !view) {
      return;
    }

    el.textContent=localizedMessage("stats.match_summary", {matches:localizedNumber(view.totalMatches), wins:localizedNumber(view.wins), losses:localizedNumber(view.losses), draws:localizedNumber(view.draws), rate:localizedNumber(view.winRatePercent)});

    const language =
      document.documentElement.lang === "en"
        ? "en-US"
        : "tr-TR";
    const number = (value) =>
      Math.max(0, Number(value || 0))
        .toLocaleString(language);
    const duration = (value) => {
      const seconds = Math.max(
        0,
        Math.round(Number(value || 0) / 1000)
      );
      if (seconds < 60) {
        return localizedMessage("time.seconds_short", {count:localizedNumber(seconds)});
      }
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return localizedMessage("time.minutes_seconds_short", {minutes:localizedNumber(minutes), seconds:localizedNumber(remainder)});
    };
    const setValue = (id, value) => {
      const target = document.getElementById(id);
      if (target) target.textContent = String(value);
    };

    setValue("statistics-total-matches", number(view.totalMatches));
    setValue(
      "statistics-record",
      localizedMessage("stats.win_loss_draw_record", {wins:number(view.wins), losses:number(view.losses), draws:number(view.draws)})
    );
    setValue("statistics-win-rate", localizedPercent(view.winRatePercent));
    setValue(
      "statistics-average-duration",
      duration(view.averageMatchDurationMs)
    );
    setValue("statistics-total-damage", number(view.totalDamageDealt));
    setValue(
      "statistics-module-replacements",
      number(view.moduleReplacements)
    );
    setValue("statistics-boosters-used", number(view.boostersUsed));

    const deckList = document.getElementById("statistics-most-used-decks");
    if (!deckList) return;
    deckList.replaceChildren();
    const decks = metaProgressionState?.statistics?.most_used_decks || [];
    if (!decks.length) {
      const empty = document.createElement("p");
      empty.className = "statistics-empty-state";
      empty.textContent = localizedUiText(
        "Henüz tamamlanmış maç verisi yok."
      );
      deckList.appendChild(empty);
      return;
    }
    for (const [index, deck] of decks.entries()) {
      const card = document.createElement("article");
      card.className = "statistics-deck-card";
      const heading = document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=localizedMessage("deck.numbered", {number:localizedNumber(index + 1)});
      const count=document.createElement("small");
      count.textContent=localizedMessage("match.count", {count:Number(deck.matches || 0)});
      heading.replaceChildren(title,count);
      const strip = document.createElement("div");
      strip.className = "statistics-deck-strip";
      for (const definitionId of deck.module_ids || []) {
        const module = moduleDefinitions.find((candidate) => candidate.definitionId === definitionId);
        const tile = document.createElement("span");
        tile.className = "statistics-deck-module";
        tile.dataset.category = module?.category || "";
        tile.textContent = moduleIconFor(module || null);
        tile.title = localizedUiText(module?.nameTr || definitionId);
        strip.appendChild(tile);
      }
      card.append(heading, strip);
      deckList.appendChild(card);
    }
  }

  function render() {
    renderShelf();
    renderBoard();
    renderLockState();
    updateTapPlacementState();
  }

  let renderedShelfSignature = null;
  let renderedBoardSignature = null;

  function modulePlacementSlotState() {
    const limit = 15;
    const currentLimit = 15;
    const active = client.activeModuleCount();
    const pending = client.pendingPlacementCount();
    const debrisCount = playerCellDebris.filter(d => Number(d.expires_at_ms ?? d.until_ms ?? 0) > client.elapsedMs).length;
    const available = Math.max(0, currentLimit - active - pending - debrisCount);
    return {
      limit,
      currentLimit,
      active,
      pending,
      available,
      ready:
        !localBattleFinished
        && available > 0,
    };
  }

  function localizedMessage(key, params = {}) {
    return globalThis.GridshardI18n?.t(key, params, document.documentElement.lang) || key;
  }

  function apiErrorCodeForStatus(status) {
    return ({400:"bad_request",401:"unauthorized",403:"forbidden",404:"not_found",409:"conflict",410:"gone",422:"invalid_request",429:"rate_limited",500:"internal_error",502:"unavailable",503:"unavailable",504:"timeout"})[status] || "request_failed";
  }

  function localizedApiError(payload, status) {
    const candidate = String(payload?.code || apiErrorCodeForStatus(status));
    const code = /^[a-z][a-z0-9_]{0,63}$/u.test(candidate) ? candidate : "request_failed";
    const key = `error.${code}`;
    const translated = localizedMessage(key, {status});
    return translated === key ? localizedMessage("error.request_failed", {status}) : translated;
  }

  function localizedNumber(value, options = {}) {
    return globalThis.GridshardI18n?.formatNumber(value, options, document.documentElement.lang)
      || String(value);
  }

  function localizedPercent(percent) {
    return localizedNumber(Number(percent || 0) / 100, {style:"percent", maximumFractionDigits:0});
  }

  function localizedDate(value, options = {}) {
    return globalThis.GridshardI18n?.formatDate(value, options, document.documentElement.lang) || "";
  }

  const LIVE_UTILITY_CATEGORIES = new Set([
    "savunma", "destek", "enerji", "sabotaj",
  ]);
  const LIVE_CATEGORY_LIMITS = Object.freeze({
    savunma:3,
    destek:3,
    enerji:3,
    sabotaj:3,
  });

  function deploymentCompositionRejection(module) {
    if (!module || !LIVE_UTILITY_CATEGORIES.has(module.category)) return null;
    const definitionId = module.definitionId || clientDefinitionId(module.instanceId);
    const active = [...client.modules.values()].filter((candidate) => (
      candidate.status === "active"
      && Number(candidate.hp || 0) > 0
      && !["core", "generator"].includes(
        candidate.definitionId || clientDefinitionId(candidate.instanceId)
      )
    ));
    const sameDefinitionCount = active.filter((candidate) => (
      (candidate.definitionId || clientDefinitionId(candidate.instanceId)) === definitionId
    )).length;
    if (sameDefinitionCount >= 2) {
      return localizedMessage("pool.copy_limit", {name:localizedUiText(module.nameTr)});
    }
    const categoryCount = active.filter(
      (candidate) => candidate.category === module.category
    ).length;
    const categoryLimit = LIVE_CATEGORY_LIMITS[module.category];
    if (categoryCount >= categoryLimit) {
      return localizedMessage("pool.category_limit", {category:poolCategoryLabel(module.category), count:localizedNumber(categoryCount), limit:localizedNumber(categoryLimit)});
    }
    const attackCount = active.filter(
      (candidate) => candidate.category === "saldırı"
    ).length;
    const utilityCount = active.filter(
      (candidate) => LIVE_UTILITY_CATEGORIES.has(candidate.category)
    ).length;
    if (utilityCount + 1 > attackCount + 2) {
      return "Devre dengesi için önce bir Saldırı modülü yerleştir.";
    }
    return null;
  }

  function deployDeckModule(module) {
    const compositionRejection = deploymentCompositionRejection(module);
    if (compositionRejection) {
      logClientMessage(compositionRejection);
      renderShelf();
      return false;
    }
    telemetryDispatcher.trackModuleShelfUsed({
      module_id: module.instanceId,
      elapsed_ms: client.elapsedMs,
    });
    const result = client.deployDefinition(
      module.definitionId || clientDefinitionId(module.instanceId),
      module.circuitCreditCost
    );
    if (!result.ok) {
      const deploymentError = result.code
        ? localizedMessage(`deployment.${result.code}`, result.details || {})
        : localizedMessage("error.request_failed", {status:""});
      logClientMessage(deploymentError);
      if (result.code === "insufficient_current") {
        flashInsufficientCredits();
      }
      renderShelf();
      return false;
    }
    trackBattleUiInteraction("deploy_module", "module_place");
    logClientMessage(
      localizedMessage("pool.server_placing", {name:localizedUiText(module.nameTr)})
    );
    renderShelf();
    return true;
  }

  function createDeckModuleCard(module, enabled, compositionRejection = null) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "module-card deck-module-card";
    card.dataset.moduleId = module.instanceId;
    card.dataset.category = module.category || "";
    card.disabled = !enabled;
    card.setAttribute("aria-disabled", String(!enabled));
    card.title = enabled
      ? localizedMessage("pool.place_hint", {name:localizedUiText(module.nameTr), cost:localizedNumber(module.circuitCreditCost)})
      : compositionRejection || localizedMessage("pool.cannot_place_hint", {name:localizedUiText(module.nameTr), cost:localizedNumber(module.circuitCreditCost)});

    const icon = document.createElement("span");
    icon.className = "module-icon";
    icon.textContent = moduleIconFor(module);
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = localizedUiText(module.nameTr);
    const stats = document.createElement("span");
    stats.className = "module-stats";
    const cost = document.createElement("span");
    cost.className = "module-stat credit";
    cost.textContent = localizedMessage("currency.current", {amount:localizedNumber(module.circuitCreditCost)});
    stats.append(cost);
    card.append(icon, name, stats);
    const currentBadge = document.createElement("span");
    currentBadge.className = "current-cost-badge";
    currentBadge.textContent = `ϟ ${module.circuitCreditCost}`;
    card.appendChild(currentBadge);
    card.addEventListener("click", () => deployDeckModule(module));
    return card;
  }

  function renderShelf() {
    const placement = modulePlacementSlotState();
    const deckModules = battlePoolSelection.selectedIds().map(id => client.modules.get(id)).filter(Boolean);
    const discounted = Number(client.currentDiscountRemaining || 0) > 0;
    const costFor = m => Math.max(1, Number(m.currentCost ?? m.circuitCreditCost) - (discounted ? 1 : 0));
    const signature = JSON.stringify([
      placement.ready,
      client.circuitCredits,
      discounted,
      deckModules.map(m => m.instanceId),
      [...client.modules.values()]
        .filter((module) => module.status === "active" && Number(module.hp || 0) > 0)
        .map((module) => [
          module.definitionId || clientDefinitionId(module.instanceId),
          module.category,
        ]),
    ]);
    if (signature === renderedShelfSignature) return;
    renderedShelfSignature = signature;
    shelf.replaceChildren();
    const anyAffordable = placement.ready && deckModules.some(
      (module) => costFor(module) <= client.circuitCredits
        && !deploymentCompositionRejection(module)
    );
    shelf.dataset.placementReady = String(anyAffordable);
    shelf.setAttribute("aria-disabled", String(!anyAffordable));
    for (const module of deckModules) {
      const cost = costFor(module);
      const compositionRejection = deploymentCompositionRejection(module);
      const enabled = placement.ready && client.circuitCredits >= cost && !compositionRejection;
      const card = createDeckModuleCard(module, enabled, compositionRejection);
      if (enabled && cost !== module.circuitCreditCost) {
        card.title = localizedMessage("pool.place_hint", {name:localizedUiText(module.nameTr), cost:localizedNumber(cost)});
      }
      const badge = card.querySelector(".current-cost-badge");
      if (badge) badge.textContent = `ϟ ${cost}`;
      if (!enabled) card.classList.add("locked", "placement-locked");
      shelf.appendChild(card);
    }
  }

  function renderBoard(
    { force=false }={}
  ) {
    const boardSignature = JSON.stringify({
      battleFinished:localBattleFinished,
      selectedBoosterId:boosterTargetMode.selectedBoosterId,
      corePowerTargeting,
      cellDebris:playerCellDebris,
      modules:[...client.modules.values()].map(module => ({
        id:module.instanceId,
        status:module.status,
        position:module.position,
        hp:module.hp,
        maxHp:module.maxHp,
        heat:module.heat,
        isPowered:module.isPowered,
        energyReceived:module.energyReceived,
        energyRequired:module.energyRequired,
        powerReason:module.powerReason,
        debuffs:module.debuffs,
        temporaryBoosters:module.temporaryBoosters,
      })),
    });
    if (!force && boardSignature === renderedBoardSignature) {
      return;
    }
    renderedBoardSignature = boardSignature;
    battleBoardView.render(
      client.modules.values(),
      {
        selectedModuleId: null,
        battleFinished: localBattleFinished,
        createModuleCard,
        cellDebris: playerCellDebris,
        debrisLabel: localizedUiText("Enkaz"),
      }
    );
    renderBoardCables(
      board,
      playerCircuitCableModules()
    );
  }

  function moduleIconFor(module) {
    return GridshardModuleCardView.iconFor(module);
  }

  function createModuleCard(module) {
    const card = document.createElement("div");
    card.className = "module-card";
    const reservePlacementReady =
      module.status !== "reserve"
      || modulePlacementSlotState().ready;
    card.dataset.moduleId =
      module.instanceId;
    card.dataset.category =
      module.category || "";
    const hasTargetInteraction = Boolean(
      boosterTargetMode.selectedBoosterId
      || (module.nameTr === "Çekirdek" && corePowerTargeting)
    );
    if (hasTargetInteraction) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
    }

    if (
      module.movable === false
    ) {
      card.classList.add(
        "fixed-module"
      );
      card.title =
        localizedMessage("pool.fixed_start_module", {name:localizedUiText(module.nameTr)});
    } else {
      card.title = localizedMessage("pool.fixed_during_battle", {name:localizedUiText(module.nameTr)});
    }
    if (module.nameTr === "Çekirdek" && corePowerTargeting) {
      card.classList.add("core-power-target");
      card.title=localizedUiText("Çekirdek Rezonansını kullan");
    }

    const icon=
      document.createElement(
        "span"
      );
    icon.className=
      "module-icon";
    icon.textContent=
      moduleIconFor(module);
    icon.setAttribute(
      "aria-label",
      localizedUiText(module.nameTr)
    );

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = localizedUiText(module.nameTr);

    const stats =
      document.createElement("span");
    stats.className =
      "module-stats";

    const hp =
      document.createElement("span");
    hp.className =
      "module-stat hp";
    hp.textContent =localizedMessage("battle.module_hp", {hp:localizedNumber(module.hp), max:localizedNumber(module.maxHp)});
    stats.appendChild(hp);

    if (
      module.status === "reserve"
      && module.circuitCreditCost > 0
    ) {
      const cost =
        document.createElement("span");
      cost.className =
        "module-stat credit";
      cost.textContent =localizedMessage("currency.credits_short", {amount:localizedNumber(module.circuitCreditCost)});
      stats.appendChild(cost);
    }

    if (module.status === "active") {
      const power =
        document.createElement("span");
      power.className =
        "module-stat energy";
      power.textContent =
        Number(module.energyRequired || 0) > 0
          ? localizedMessage("battle.energy_received_required", {received:localizedNumber(Math.round(module.energyReceived || 0)), required:localizedNumber(Math.round(module.energyRequired || 0))})
          : "Pasif";
      stats.appendChild(power);

      if (
        !module.isPowered
        && Number(module.energyRequired || 0) > 0
      ) {
        const warning =
          document.createElement("span");
        warning.className =
          "module-stat warning";
        warning.textContent =
          "ENERJİSİZ";
        stats.appendChild(warning);
      }
    }

    const meta =
      document.createElement("span");
    meta.className =
      "meta";

    const detailParts = [];
    const supportLabel =
      supportLabelForModule(module);
    const sabotageLabel =
      sabotageLabelForModule(module);

    if (supportLabel) {
      detailParts.push(
        supportLabel
      );
    }
    if (sabotageLabel) {
      detailParts.push(
        sabotageLabel
      );
    }
    if (module.status === "active") {
      detailParts.push(
        heatStatusLabel(module)
      );
    }

    meta.textContent =
      detailParts.join(" · ");

    card.append(icon,name);
    if (module.status !== "active") {
      card.appendChild(stats);
    }
    appendHpBar(
      card,
      module.hp,
      module.maxHp,
      { battle:module.status === "active" }
    );
    if (
      module.status !== "active"
      && meta.textContent
    ) {
      card.appendChild(meta);
    }

    if (
      module.status === "active"
      && !module.isPowered
      && Number(module.energyRequired || 0) > 0
    ) {
      card.classList.add(
        "energy-disconnected"
      );
    }

    if (module.status === "active") {
      appendEnergyFlowIndicator(
        card,
        {
          isPowered:
            Boolean(module.isPowered),
          energyReceived:
            Number(module.energyReceived || 0),
          energyRequired:
            Number(module.energyRequired || 0),
          isSource:
            module.nameTr === "Çekirdek",
          powerReason:
            module.powerReason,
        }
      );
      appendModuleLiveStatus(card, module);
    }

    if (
      boosterTargetMode.selectedBoosterId
      && module.status === "active"
    ) {
      card.classList.add(
        isBoosterTargetEligible(module)
          ? "booster-target"
          : "booster-target-ineligible"
      );
    }

    card.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        if (module.definitionId === "core" && corePowerReady) {
          useCorePowerOn(module);
          return;
        }
        if (boosterTargetMode.selectedBoosterId) {
          tryApplySelectedBooster(module);
          return;
        }
        if (module.status === "reserve") {
          if (!modulePlacementSlotState().ready) {
            logClientMessage("Yeni modül yerleştirme hakkı için geri sayımı bekleyin.");
            return;
          }
          deployDeckModule(module);
          return;
        }
      }
    );

    card.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        card.click();
      }
    );

    window.requestAnimationFrame(
      () => recordModuleAnchor(module.instanceId, card)
    );
    return card;
  }

  function applyMockServerCommand(command) {
    // Alpha.6: Bu katman yalnızca UI demosu için sahte sunucu cevabıdır.
    // Gerçek savaş içi Akım otoritesi Python savaş motorundadır.
    if (localBattleFinished) {
      logClientMessage(
        "Maç tamamlandı; savaş komutları kilitli."
      );
      return;
    }

    if (command.kind === "send_battle_emoji") {
      presentBattleEmoji(participantPlayerId, command.payload.emoji_id);
      return;
    }

    if (command.kind === "use_core_power") {
      const core=client.modules.get("core-1");
      if (!corePowerReady || !core || core.hp >= core.maxHp) {
        logClientMessage(
          !corePowerReady
            ? "Çekirdek Gücü henüz dolmadı."
            : "Çekirdek zaten tam canlı; dolum korunuyor."
        );
        return;
      }
      core.hp=Math.min(core.maxHp,core.hp + 45);
      corePowerCharge=0;
      corePowerReady=false;
      corePowerTargeting=false;
      triggerGridshardCue("shield_activate");
      logClientMessage("Çekirdek Rezonansı kullanıldı · +45 CAN sınırı.");
      renderCorePowerControl();
      renderBoard({force:true});
      return;
    }

    const moduleCost = (moduleId) =>
      client.requireModule(moduleId).circuitCreditCost || 0;
    const deployTemplate = command.kind === "deploy_module"
      ? clientModuleForDefinitionId(command.payload.definition_id)
      : null;

    let cost = 0;
    if (command.kind === "deploy_module") {
      if (!deployTemplate) {
        logClientMessage("Deste kartı istemcide bulunamadı.");
        client.clearPendingPlacements();
        return;
      }
      cost = Number(deployTemplate.circuitCreditCost || 0);
    } else if (command.kind === "place_module") {
      cost = moduleCost(command.payload.module_id);
    } else if (command.kind === "move_module") {
      cost = 10;
    } else if (command.kind === "swap_modules") {
      cost = 10;
    } else if (command.kind === "replace_module") {
      cost = moduleCost(command.payload.incoming_module_id);
    }

    if (mockServerCredits < cost) {
      logClientMessage(
        localizedMessage("deployment.insufficient_current", {required:localizedNumber(cost), available:localizedNumber(mockServerCredits)})
      );
      flashInsufficientCredits();
      return;
    }

    mockServerCredits -= cost;
    client.applyServerEconomyState({ circuitCredits: mockServerCredits });

    if (
      activePlayMode === "local"
      && localBattleStarted
      && !localBattleFinished
    ) {
      if (command.kind === "place_module") {
        trackBattleUiInteraction(
          command.kind,
          "module_place"
        );
      } else if (
        command.kind === "move_module"
        || command.kind === "swap_modules"
      ) {
        const movedModule=
          client.requireModule(
            command.payload.module_id
          );
        trackBattleUiInteraction(
          command.kind,
          command.kind === "move_module"
          && movedModule.instanceId
          === "generator-1"
            ? "generator_gate"
            : "module_move"
        );
      }
    }

    if (
      activePlayMode === "local"
      && localBattleMetrics
      && cost > 0
    ) {
      localBattleMetrics.credits_spent += cost;
      telemetryDispatcher.track(
        "circuit_credit_spent",
        {
          amount:cost,
          command_kind:command.kind,
          elapsed_ms:client.elapsedMs,
        }
      );
    }

    if (command.kind === "deploy_module") {
      const occupied = new Set(
        [...client.modules.values()]
          .filter((module) => module.status === "active" && module.position)
          .map((module) => `${module.position.x},${module.position.y}`)
      );
      const candidates = BOARD_CELLS.filter(([x, y]) => {
        const key = `${x},${y}`;
        if (key === "2,1" || occupied.has(key)) return false;
        const special = SPECIAL_CELL_INFO[key];
        if (special?.definitionId && special.definitionId !== deployTemplate.definitionId) return false;
        if (special?.category && special.category !== deployTemplate.category) return false;
        const cell = board.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        return cell?.dataset.debris !== "true";
      });
      const validPlacements = candidates.map(([x, y]) => ({ x, y }));
      const requestedPosition = (
        Number.isInteger(command.payload.x)
        && Number.isInteger(command.payload.y)
      )
        ? { x:command.payload.x, y:command.payload.y }
        : null;
      const selected = requestedPosition
        ? validPlacements.find(
            ({ x, y }) => x === requestedPosition.x && y === requestedPosition.y
          ) || null
        : (
            validPlacements.length
              ? validPlacements[Math.floor(Math.random() * validPlacements.length)]
              : null
          );
      if (!selected) {
        mockServerCredits += cost;
        client.applyServerEconomyState({ circuitCredits:mockServerCredits });
        client.clearPendingPlacements();
        logClientMessage("Bu kart için enerjiye bağlı uygun boş hücre bulunamadı.");
        render();
        renderCredits();
        return;
      }
      const instanceId = `mock-${deployTemplate.definitionId}-${Date.now()}`;
      client.registerModule({
        ...deployTemplate,
        instanceId,
        isDeckTemplate:false,
        status:"active",
        position:{x:selected.x, y:selected.y},
        hp:deployTemplate.maxHp,
      });
      client.clearPendingPlacements();
      triggerGridshardCue("energy_transfer");
    } else if (command.kind === "place_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "active",
        position: { x: command.payload.x, y: command.payload.y },
      });
      triggerGridshardCue("energy_transfer");
    } else if (command.kind === "move_module") {
      const module = client.requireModule(command.payload.module_id);
      const previousPosition =
        module.position
          ? {...module.position}
          : null;

      client.applyServerModuleState({
        instanceId: module.instanceId,
        position: { x: command.payload.x, y: command.payload.y },
      });

      if (
        activePlayMode === "local"
        && localBattleMetrics
      ) {
        localBattleMetrics.module_changes += 1;

        if (module.instanceId === "generator-1") {
          localBattleMetrics.generator_moves += 1;
          const toGate=generatorGateName(module.position);
          localBattleMetrics.generator_gate_visits[toGate] =
            (localBattleMetrics.generator_gate_visits[toGate] || 0) + 1;

          const active=[...client.modules.values()]
            .filter((item)=>item.status==="active");
          const connected=connectedEnergyModuleIds(active);
          const poweredSpecialCount=active.filter(
            (item)=>
              item.position
              && SPECIAL_CELL_INFO[`${item.position.x},${item.position.y}`]
              && connected.has(item.instanceId)
          ).length;

          telemetryDispatcher.trackGeneratorGateMoved({
            from_gate:generatorGateName(previousPosition),
            to_gate:toGate,
            elapsed_ms:client.elapsedMs,
            connected_module_count:connected.size,
            powered_special_cell_count:poweredSpecialCount,
          });
          triggerGridshardCue(
            "generator_move"
          );
        }
      }
    } else if (command.kind === "swap_modules") {
      const first = client.requireModule(
        command.payload.module_id
      );
      const second = client.requireModule(
        command.payload.target_module_id
      );
      const firstPosition = first.position
        ? {...first.position}
        : null;
      const secondPosition = second.position
        ? {...second.position}
        : null;
      if (!firstPosition || !secondPosition) {
        logClientMessage(
          "Yer değiştirilecek modüllerin konumu bulunamadı."
        );
        return;
      }
      client.applyServerModuleState({
        instanceId:first.instanceId,
        position:secondPosition,
        isPowered:false,
      });
      client.applyServerModuleState({
        instanceId:second.instanceId,
        position:firstPosition,
        isPowered:false,
      });
      if (localBattleMetrics) {
        localBattleMetrics.module_changes += 1;
      }
    } else if (command.kind === "remove_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "reserve",
        position: null,
      });
    } else if (command.kind === "replace_module") {
      const outgoing = client.requireModule(command.payload.outgoing_module_id);
      const incoming = client.requireModule(command.payload.incoming_module_id);
      const position = outgoing.position;
      client.applyServerModuleState({
        instanceId: outgoing.instanceId,
        status: "reserve",
        position: null,
      });
      client.applyServerModuleState({
        instanceId: incoming.instanceId,
        status: "active",
        position,
      });
    }

    if (
      activePlayMode === "local"
      && localBattleMetrics
      && [
        "deploy_module",
        "place_module",
        "remove_module",
        "replace_module",
      ].includes(command.kind)
    ) {
      localBattleMetrics.module_changes += 1;
    }

    render();
    renderCredits();
  }

  function updateMockServerPassiveCredits(elapsedMs) {
    const regenPulses = Math.floor(elapsedMs / 2500);
    if (regenPulses <= mockServerRegenPulses) return;

    const gainedPulses = regenPulses - mockServerRegenPulses;
    mockServerCredits = Math.min(12, mockServerCredits + gainedPulses);
    mockServerRegenPulses = regenPulses;
    client.applyServerEconomyState({ circuitCredits: mockServerCredits });
  }

  function connectedEnergyModuleIds(active) {
    // Gömülü devre yolları her dolu hücreyi besler; kart yönü güç aktarımını
    // etkilemez.
    return new Set(active.map((module) => module.instanceId));
  }

  function updateMockEnergy() {
    const active = [...client.modules.values()].filter(
      (module) => module.status === "active"
    );
    const connected = connectedEnergyModuleIds(active);

    const generated = active.some(
      (module) => module.nameTr === "Çekirdek"
    ) ? 10 : 0;

    const demandByName = {
      "Lazer": 3,
      "Darbe Topu": 5,
      "Ray Topu": 6,
      "Kalkan": 2,
      "Yansıtıcı": 2,
      "Bariyer": 1,
      "Onarım Modülü": 2,
      "Soğutucu": 1,
      "Güçlendirici": 1,
      "Hedefleme Bilgisayarı": 1,
      "EMP": 4,
      "Sinyal Bozucu": 3,
      "Füze Fırlatıcı": 5,
      "Dron Üssü": 4,
      "Ark Topu": 5,
      "Aşırı Hızlandırıcı": 2,
      "Virüs": 3,
      "Enerji Sömürücü": 3,
      "Kesici": 4,
    };

    let available =
      generated *
      (active.some((module) => module.nameTr === "Dağıtıcı")
        ? 0.98
        : 0.90);

    let totalDemand = 0;

    for (const module of active) {
      const demand = demandByName[module.nameTr] || 0;
      module.energyRequired = demand;
      totalDemand += demand;

      if (!connected.has(module.instanceId) && demand > 0) {
        module.energyReceived = 0;
        module.isPowered = false;
      } else if (demand <= 0) {
        module.energyReceived =
          module.nameTr === "Jeneratör"
            ? generated
            : 0;
        module.isPowered =
          connected.has(module.instanceId) ||
          module.nameTr === "Çekirdek";
      } else if (available >= demand) {
        available -= demand;
        module.energyReceived = demand;
        module.isPowered = true;
      } else {
        module.energyReceived = 0;
        module.isPowered = false;
      }
    }

    energySummaryEl.textContent =
      localizedMessage("battle.energy_generation_demand", {generated:localizedNumber(generated, {minimumFractionDigits:1, maximumFractionDigits:1}), demand:localizedNumber(totalDemand, {minimumFractionDigits:1, maximumFractionDigits:1})});
  }

  function sabotageLabelForModule(module) {
    if (module.nameTr === "EMP") return "Enerji Kesme";
    if (module.nameTr === "Sinyal Bozucu") return "Destek Susturma";
    if (module.nameTr === "Virüs") return "Periyodik Hasar";
    if (module.nameTr === "Enerji Sömürücü") return "Üretim -%30";
    if (module.nameTr === "Kesici") return "Hat Kesme";
    return "";
  }

  function heatStatusLabel(module) {
    const heat = Number(module.heat || 0);
    if (heat >= 100) return localizedMessage("battle.heat_critical", {heat:localizedNumber(heat.toFixed(0))});
    if (heat >= 70) return localizedMessage("battle.heat_high", {heat:localizedNumber(heat.toFixed(0))});
    return localizedMessage("battle.heat", {heat:localizedNumber(heat.toFixed(0))});
  }

  function supportLabelForModule(module) {
    if (module.nameTr === "Onarım Modülü") return "Onarım";
    if (module.nameTr === "Soğutucu") return "Soğutma";
    if (module.nameTr === "Güçlendirici") return "Hasar +%15";
    if (module.nameTr === "Hedefleme Bilgisayarı") return "Cooldown -%15";
    if (module.nameTr === "Aşırı Hızlandırıcı") return "Hasar +%20 · Cooldown -%20 · Isı +";
    return "";
  }

  function updateMockBattleResult() {
    if (
      activePlayMode !== "local"
    ) {
      return;
    }

    if (mockEnemyCoreHp > 0) {
      if (
        battleResultSummaryEl
        && !localBattleFinished
      ) {
        battleResultSummaryEl.textContent =
          "Maç sürüyor";
      }
      return;
    }

    finishLocalBattle({
      won:true,
    });
  }

  function updateMockCombat() {
    if (
      activePlayMode !== "local"
      || localBattleFinished
    ) {
      return;
    }

    const currentSecond=
      Math.floor(
        client.elapsedMs / 1000
      );
    if (
      currentSecond
      === previousCombatSecond
    ) {
      return;
    }
    previousCombatSecond=
      currentSecond;

    const attackers=[
      ...client.modules.values(),
    ]
      .filter(
        (module)=>
          module.status === "active"
          && module.category === "saldırı"
          && module.isPowered
          && Number(module.hp||0)>0
      )
      .sort(
        (a,b)=>
          a.instanceId.localeCompare(
            b.instanceId
          )
      );

    if (!attackers.length) {
      return;
    }

    const damageByName={
      "Lazer":12,
      "Darbe Topu":32,
      "Ray Topu":40,
      "Füze Fırlatıcı":28,
      "Dron Üssü":8,
      "Ark Topu":20,
    };
    const cooldownSeconds={
      "Lazer":1,
      "Darbe Topu":3,
      "Ray Topu":4,
      "Füze Fırlatıcı":3,
      "Dron Üssü":1,
      "Ark Topu":2,
    };

    for (const attacker of attackers) {
      const last=
        mockAttackerLastAttack.get(
          attacker.instanceId
        );
      const cooldown=
        cooldownSeconds[
          attacker.nameTr
        ] || 2;

      if (
        last !== undefined
        && currentSecond-last
          < cooldown
      ) {
        continue;
      }

      const rawDamage=
        damageByName[
          attacker.nameTr
        ] || 0;
      if (rawDamage<=0) {
        continue;
      }

      mockAttackerLastAttack.set(
        attacker.instanceId,
        currentSecond
      );

      const targetModule=
        selectMockEnemyTarget();

      let targetName=
        targetModule
          ? `Rakip ${targetModule.name}`
          : (
              mockEnemyGeneratorHp>0
                ? "Rakip Jeneratör"
                : "Rakip Çekirdek"
            );
      let defenseType="Yok";
      let reducedDamage=0;
      let finalDamage=rawDamage;

      if (
        targetModule
        && targetModule.name
          === "Kalkan"
      ) {
        defenseType="Kalkan";
        finalDamage=Math.max(
          1,
          Math.round(
            rawDamage*0.65
          )
        );
        reducedDamage=
          rawDamage-finalDamage;
      }

      if (targetModule) {
        targetModule.hp=Math.max(
          0,
          targetModule.hp
          - finalDamage
        );
      } else if (
        mockEnemyGeneratorHp>0
      ) {
        mockEnemyGeneratorHp=
          Math.max(
            0,
            mockEnemyGeneratorHp
            - finalDamage
          );
      } else {
        mockEnemyCoreHp=
          Math.max(
            0,
            mockEnemyCoreHp
            - finalDamage
          );
      }

      const targetDomId=
        targetModule
          ? targetModule.id
          : (
              targetName
              === "Rakip Jeneratör"
                ? "enemy-generator"
                : "enemy-core"
            );
      const attackerDefinitionId=
        clientDefinitionId(
          attacker.instanceId
        );
      emitFloatingBattleFeedback(
        targetDomId,
        `-${finalDamage}`,
        "damage",
        { core: targetDomId === "enemy-core" }
      );
      setBattleLiveTicker(
        localizedMessage("battle.mock_attack_ticker", {attacker:localizedUiText(attacker.nameTr), target:targetModule ? localizedMessage("battle.enemy_module", {name:localizedUiText(targetModule.name)}) : localizedUiText(targetName), damage:localizedNumber(finalDamage)}),
        "attack"
      );
      const travelMs=emitDuelAttackEffect(
        attacker.instanceId,
        targetDomId,
        defenseType === "Kalkan"
          ? "shield"
          : "attack",
        attackerDefinitionId
      );

      mockEnemyModuleHp=
        enemyLivingModules()
          .reduce(
            (sum,module)=>
              sum+module.hp,
            0
          );

      triggerGridshardCue(
        weaponCue(
          attackerDefinitionId
        )
      );
      scheduleAttackImpactCue({
        defended:
          defenseType === "Kalkan",
        targetDefinitionId:
          targetName === "Rakip Çekirdek"
            ? "core"
            : targetModule?.definitionId,
        travelMs,
      });

      if (localBattleMetrics) {
        localBattleMetrics
      .damage_dealt +=
            finalDamage;
        localBattleMetrics.damage_by_module[attackerDefinitionId] =
          Number(localBattleMetrics.damage_by_module[attackerDefinitionId] || 0)
          + finalDamage;
        localBattleMetrics
          .player_attacks += 1;
        telemetryDispatcher
          .trackLocalPlayerAttack({
            attacker:
              attacker.nameTr,
            target:
              targetName,
            damage:
              finalDamage,
            elapsed_ms:
              client.elapsedMs,
          });
      }

      commandLog.push({
        atMs:client.elapsedMs,
        kind:
          "attack_performed",
        attacker:
          attacker.nameTr,
        target:targetName,
        rawDamage,
        reducedDamage,
        damage:finalDamage,
        defenseType,
      });

      if (mockEnemyCoreHp<=0) {
        break;
      }
    }

    combatSummaryEl.textContent=
      localizedMessage("battle.mock_enemy_hp", {module:localizedNumber(mockEnemyModuleHp), core:localizedNumber(mockEnemyCoreHp)});

    renderEnemyBoard();
    updateMockBattleResult();
    renderLog();
  }

  function renderCredits() {
    const battleValue = document.getElementById("credit-indicator-value");
    if (battleValue) battleValue.textContent = localizedMessage("battle.current_meter", {current:localizedNumber(client.circuitCredits)});
    if (shelfCreditIndicatorEl) {
      const value = document.getElementById("shelf-credit-value");
      if (value) value.textContent = `${client.circuitCredits} / 12`;
    }
    const lobbyCredits = document.getElementById("lobby-circuit-credits");
    if (lobbyCredits) lobbyCredits.textContent = String(metaProgressionState?.circuit_credits ?? 0);
  }

  function flashInsufficientCredits() {
    creditEl.classList.add("credit-insufficient");
    window.setTimeout(() => {
      creditEl.classList.remove("credit-insufficient");
    }, 700);
  }


  function renderCapacity() {
    if (!capacityEl) return;
    const placement = modulePlacementSlotState();
    capacityEl.textContent = localizedMessage("battle.circuit_capacity", {active:localizedNumber(placement.active), limit:localizedNumber(placement.currentLimit)});
    capacityEl.dataset.state = placement.available > 0 ? "ready" : "complete";
    capacityEl.classList.remove("capacity-opened");
    previousCapacity = placement.currentLimit;
  }

  function renderLockState() {
    if (localBattleFinished) {
      lockLabel.dataset.active =
        "false";
      lockLabel.textContent =
        "Maç Bitti";
      if (shelfHelp) {
        shelfHelp.textContent =
          "Savaş tamamlandı; modül hareketleri kilitlendi.";
      }
      return;
    }

    const placement = modulePlacementSlotState();
    const affordable = battlePoolSelection.selectedIds().some((instanceId) => {
      const module = client.modules.get(instanceId);
      return module && client.circuitCredits >= Number(module.circuitCreditCost || 0);
    });
    const unlocked = placement.ready && affordable;
    lockLabel.dataset.active = String(unlocked);
    lockLabel.textContent = unlocked ? "Aktif" : "Beklemede";

    if (unlocked) {
      if (shelfHelp) {
        shelfHelp.textContent = localizedUiText("Deste kartına tıkla; sunucu uygun hücreye otomatik yerleştirsin.");
      }
    } else if (shelfHelp) {
      shelfHelp.textContent = placement.available <= 0
        ? "Devre dolu; boş hücre açılınca yerleştirebilirsin."
        : "Akım yenileniyor: 2,5 saniyede +1.";
    }
  }

  function formatBattleLogEntry(entry) {
    if (!entry) return "";
    if (entry.kind === "attack_performed") {
      const reduced = Number(entry.reducedDamage ?? 0);
      const defense = entry.defenseType ?? "Yok";
      return localizedMessage("battle.damage_log", {attacker:localizedUiText(entry.attacker), target:localizedUiText(entry.target), damage:localizedNumber(entry.damage), reduction:reduced > 0 ? localizedMessage("battle.damage_reduction_suffix", {amount:localizedNumber(reduced)}) : "", defense:localizedUiText(defense)});
    }
    if (entry.kind === "damage_reflected") {
      return localizedMessage("battle.reflected_damage", {damage:localizedNumber(entry.damage)});
    }
    if (entry.kind === "module_repaired") {
      return localizedMessage("battle.repair_event", {repair:localizedNumber(entry.repair)});
    }
    if (entry.kind === "module_cooled") {
      return localizedMessage("battle.cooling_event", {before:localizedNumber(Math.round(entry.heatBefore)), after:localizedNumber(Math.round(entry.heatAfter))});
    }
    if (entry.kind === "module_overclocked") {
      return localizedMessage("battle.overclocked");
    }
    if (entry.kind === "module_heat_changed") {
      const before = Number(entry.heatBefore || 0);
      const after = Number(entry.heatAfter || 0);
      if (Math.abs(after - before) < 10) return "";
      return localizedMessage("battle.heat_event", {before:localizedNumber(Math.round(before)), after:localizedNumber(Math.round(after))});
    }
    if (entry.kind === "module_overheated") {
      return localizedMessage("battle.overload_self_damage", {damage:localizedNumber(entry.selfDamage)});
    }
    if (entry.kind === "attack_skipped_overheated") {
      return localizedMessage("battle.attack_blocked_overheat");
    }
    if (entry.kind === "sabotage_applied") {
      return localizedMessage("battle.sabotage_event", {effect:localizedUiText(entry.effectId || entry.effect_id)});
    }
    if (entry.kind === "virus_damage") {
      return localizedMessage("battle.virus_damage", {damage:localizedNumber(entry.damage)});
    }
    if (entry.kind === "support_skipped_jammed") {
      return localizedMessage("battle.support_jammed");
    }
    if (entry.kind === "sabotage_resisted") {
      return localizedMessage("battle.sabotage_resisted");
    }
    if (entry.kind === "sabotage_blocked") {
      return localizedMessage("battle.sabotage_blocked");
    }
    if (entry.kind === "sabotage_cleansed") {
      return localizedMessage("battle.sabotage_cleansed", {effect:localizedUiText(entry.effectId || entry.effect_id)});
    }
    if (entry.kind === "sabotage_duration_reduced") {
      return localizedMessage("battle.sabotage_reduced");
    }
    if (entry.kind === "battle_finished") {
      if (entry.isDraw || entry.is_draw) return localizedMessage("battle.match_draw");
      return localizedMessage("battle.match_winner", {winner:entry.winnerPlayerId || entry.winner_player_id});
    }
    if (entry.kind === "module_damaged") {
      return localizedMessage("battle.damage_ticker", {name:localizedUiText(entry.moduleName || "Modül"), damage:localizedNumber(entry.damage)});
    }
    if (entry.kind === "client_notice") {
      return localizedMessage("battle.client_notice", {message:localizedUiText(entry.payload?.message || "")});
    }
    if (entry.kind === "battle_forfeited") {
      return localizedMessage("battle.forfeited");
    }
    return String(entry.kind || "Olay").replaceAll("_", " ");
  }

  function renderLog() {
    const lines = commandLog
      .map(formatBattleLogEntry)
      .filter(Boolean)
      .slice(-8);
    logEl.textContent = lines.join("\n");
  }

  function logClientMessage(message) {
    commandLog.push({
      atMs: client.elapsedMs,
      kind: "client_notice",
      payload: { message },
    });
    renderLog();
  }

  let analyticsFrameWindowStart = null;
  let analyticsFrameCount = 0;
  let analyticsLastFrameReport = -60_000;
  function updateClock(now) {
    const analyticsBattleActive = activePlayMode === "online"
      ? document.body.dataset.onlineStatus === "battle"
      : activePlayMode === "local" && localBattleStarted && !localBattleFinished;
    if (analyticsBattleActive && !document.hidden && settingsState.viewModel()?.analyticsConsent === true && Number.isFinite(now)) {
      if (analyticsFrameWindowStart === null) analyticsFrameWindowStart = now;
      analyticsFrameCount += 1;
      if (now - analyticsFrameWindowStart >= 5000) {
        if (now - analyticsLastFrameReport >= 60_000) {
          const fps = analyticsFrameCount * 1000 / Math.max(1, now - analyticsFrameWindowStart);
          const bucket = fps < 20 ? "under_20" : fps < 30 ? "20_29" : fps < 45 ? "30_44" : fps < 60 ? "45_59" : "60_plus";
          recordProductEvent("performance_sample", {screen:"play", fps:bucket});
          analyticsLastFrameReport = now;
        }
        analyticsFrameWindowStart = now;
        analyticsFrameCount = 0;
      }
    } else {
      analyticsFrameWindowStart = null;
      analyticsFrameCount = 0;
    }
    let elapsedMs =
      client.elapsedMs;

    if (
      activePlayMode
      === "local"
    ) {
      if (
        localBattleStarted
        && !localBattleFinished
        && localBattleMetrics
      ) {
        if (
          lastBattleAnimationNow
          !== null
        ) {
          const frameGap=
            Math.max(
              0,
              now
              - lastBattleAnimationNow
            );
          localBattleMetrics
            .frame_count += 1;
          localBattleMetrics
            .max_frame_gap_ms=
              Math.max(
                localBattleMetrics
                  .max_frame_gap_ms,
                frameGap
              );
          if (
            frameGap
            > BATTLE_PAUSE_GAP_THRESHOLD_MS
          ) {
            localBattleMetrics
              .pause_violation_count += 1;
          }
        }
        lastBattleAnimationNow=now;
      }

      if (
        localBattleStarted
        && !localBattleFinished
        && !localServerAuthoritative
      ) {
        elapsedMs =
          Math.max(
            0,
            (
              now
              - battleStartedAt
            )
            * gridshardE2eTimeScale
          );
        client.updateElapsedMs(
          elapsedMs
        );
        updateMockServerPassiveCredits(
          elapsedMs
        );
        corePowerCharge=Math.min(100,(elapsedMs / 35000) * 100);
        corePowerReady=corePowerCharge >= 100;
        renderCorePowerControl();
      } else {
        // Sunucu otoritesinde snapshot zamanı kullanılır; sonuçtan sonra
        // son değer korunarak sayaç kesin biçimde dondurulur.
        elapsedMs=
          client.elapsedMs;
      }
    } else if (
      activePlayMode
      === "idle"
    ) {
      elapsedMs = 0;
    }

    const seconds = elapsedMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds - minutes * 60;
    timeEl.textContent =
      `${String(minutes).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
    timeEl.classList.toggle(
      "is-overtime",
      elapsedMs >= 180000
      && (localServerAuthoritative || activePlayMode === "online")
    );

    renderLockState();
    renderCapacity();
    if (
      activePlayMode
      === "local"
      && !localBattleFinished
    ) {
      if (!localServerAuthoritative) {
        updateMockEnergy();
        updateMockCombat();
        updateLocalEnemyCombat();
      }
      renderEnemyBoard();
      publishBattleUxMetrics();
    }

    renderCredits();
    renderPlayerCoreSummary();
    if (Math.floor(elapsedMs / 250) !== Math.floor((elapsedMs - 16) / 250)) {
      renderShelf();
      renderBoard();
    }

    requestAnimationFrame(updateClock);
  }

  if (quickLoadoutFilterAllEl) {
    quickLoadoutFilterAllEl.addEventListener(
      "click",
      () => {
        quickLoadoutFilter="all";
        renderQuickLoadoutGallery();
      }
    );
  }

  if (quickLoadoutFilterFavoritesEl) {
    quickLoadoutFilterFavoritesEl.addEventListener(
      "click",
      () => {
        quickLoadoutFilter="favorites";
        renderQuickLoadoutGallery();
      }
    );
  }

  if (presetNewEl) {
    presetNewEl.addEventListener(
      "click",
      () => {
        activeBattlePoolPresetName=
          null;
        activeBattlePoolPresetBaseline=
          [];
        if (presetSelectEl) {
          presetSelectEl.value="";
        }
        if (presetNameEl) {
          presetNameEl.value="";
          presetNameEl.focus();
        }
        renderPresetOptions();
        if (presetStatusEl) {
          presetStatusEl.textContent=
            "Yeni hazır deste için mevcut 6/6 seçimini isimlendirip kaydet.";
        }
      }
    );
  }

  if (presetLoadEl) {
    presetLoadEl.addEventListener(
      "click",
      loadSelectedBattlePoolPreset
    );
  }

  if (presetSaveEl) {
    presetSaveEl.addEventListener(
      "click",
      () => {
        saveCurrentBattlePoolPreset();
      }
    );
  }

  if (presetNameEl) {
    presetNameEl.addEventListener(
      "input",
      renderActivePresetState
    );
  }

  if (presetDeleteEl) {
    presetDeleteEl.addEventListener(
      "click",
      () => {
        deleteSelectedBattlePoolPreset();
      }
    );
  }

  if (presetRenameButtonEl) {
    presetRenameButtonEl.addEventListener(
      "click",
      () => {
        renameSelectedBattlePoolPreset();
      }
    );
  }

  const humanReviewNoteSaveEl =
    document.getElementById(
      "human-review-note-save"
    );
  if (humanReviewNoteSaveEl) {
    humanReviewNoteSaveEl.addEventListener(
      "click",
      saveHumanReviewLocalNote
    );
  }

  const humanReviewNoteClearEl =
    document.getElementById(
      "human-review-note-clear"
    );
  if (humanReviewNoteClearEl) {
    humanReviewNoteClearEl.addEventListener(
      "click",
      () => {
        const field=
          document.getElementById(
            "human-review-decision-note"
          );
        try {
          localStorage.removeItem(
            HUMAN_REVIEW_NOTE_KEY
          );
        } catch (_error) {}
        if (field) {
          field.value="";
        }
        const stateField=
          document.getElementById(
            "human-review-decision-state"
          );
        if (stateField) {
          stateField.value=
            "none";
        }
        const status=
          document.getElementById(
            "human-review-note-status"
          );
        if (status) {
          status.textContent=
            "Yerel inceleme taslağı temizlendi";
        }
      }
    );
  }

  loadHumanReviewLocalNote();

  const presetDialog = document.getElementById("battle-pool-preset-dialog");
  document.getElementById("battle-pool-preset-open")?.addEventListener(
    "click",
    () => {
      if (typeof presetDialog?.showModal === "function") {
        presetDialog.showModal();
      } else {
        presetDialog?.setAttribute("open", "");
      }
    }
  );
  document.getElementById("battle-pool-preset-close")?.addEventListener(
    "click",
    () => {
      if (typeof presetDialog?.close === "function") {
        presetDialog.close();
      } else {
        presetDialog?.removeAttribute("open");
      }
    }
  );

  const humanReviewRefreshEl =
    document.getElementById(
      "human-review-refresh"
    );
  if (humanReviewRefreshEl) {
    humanReviewRefreshEl.addEventListener(
      "click",
      () => {
        loadHumanReviewQueue();
      }
    );
  }

  for (const button of document.querySelectorAll("[data-ai-archetype]")) {
    button.addEventListener("click",() => {
      setSelectedAiArchetype(button.dataset.aiArchetype);
      telemetryDispatcher.track("ai_archetype_selected",{
        ai_archetype:selectedAiArchetype,
      });
    });
  }
  renderAiArchetypePicker();

  const balanceDraftRefreshEl =
    document.getElementById(
      "balance-draft-refresh"
    );
  if (balanceDraftRefreshEl) {
    balanceDraftRefreshEl.addEventListener(
      "click",
      () => {
        loadBalanceDraft();
      }
    );
  }

  const localBattleQuickStartButton=
    document.getElementById(
      "local-battle-quick-start"
    );

  if (localBattleQuickStartButton) {
    localBattleQuickStartButton
      .addEventListener(
        "click",
        startQuickLocalBattle
      );
  }

  if (localPlayStartButton) {
    localPlayStartButton
      .addEventListener(
        "click",
        prepareLocalMatch
      );
  }

  if (onlinePlayPrepareButton) {
    onlinePlayPrepareButton
      .addEventListener(
        "click",
        prepareOnlineMatch
      );
  }

  const battlePrepareLocalButton=
    document.getElementById(
      "battle-prepare-local"
    );
  const battlePrepareOnlineButton=
    document.getElementById(
      "battle-prepare-online"
    );
  if (battlePrepareLocalButton) {
    battlePrepareLocalButton
      .addEventListener(
        "click",
        prepareLocalMatch
      );
  }
  if (battlePrepareOnlineButton) {
    battlePrepareOnlineButton
      .addEventListener(
        "click",
        prepareOnlineMatch
      );
  }

  if (recoveryRetry) {
    recoveryRetry.addEventListener(
      "click",
      async () => {
        const kind =
          playRecoveryState.kind;
        clearPlayError();

        if (
          kind === "post_match"
        ) {
          await syncFinishedMatch();
          return;
        }

        if (
          kind === "websocket"
          && pvpState.sessionId
        ) {
          pvpConnection.connect(
            onlinePlay
              .webSocketUrlFactory(
                pvpState.sessionId
              )
          );
          return;
        }

        if (
          kind === "matchmaking"
          || kind === "setup_ready"
        ) {
          await startRealOnlineMatch();
        }
      }
    );
  }

  const profileNameSaveButton =
    document.getElementById(
      "profile-display-name-save"
    );
  if (profileNameSaveButton) {
    profileNameSaveButton
      .addEventListener(
        "click",
        saveProfileDisplayName
      );
  }

  const dailyMissionList = document.getElementById("daily-mission-list");
  dailyMissionList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mission-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("missions", button.dataset.missionClaim, button);
  });

  const monthlyLoginTrack = document.getElementById("monthly-login-track");
  monthlyLoginTrack?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-login-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("login", button.dataset.loginClaim, button);
  });

  const seasonRewardTrack = document.getElementById("season-reward-track");
  seasonRewardTrack?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tier-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("tiers", button.dataset.tierClaim, button);
  });

  const laboratoryModuleList = document.getElementById("laboratory-module-list");
  laboratoryModuleList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-laboratory-module]");
    if (!button) return;
    selectedLaboratoryModuleId = button.dataset.laboratoryModule;
    renderLaboratory();
  });

  document.getElementById("laboratory-upgrade-button")
    ?.addEventListener("click", upgradeLaboratorySelection);
  document.getElementById("laboratory-reset-button")
    ?.addEventListener("click", resetLaboratorySelection);

  function previewAudioSettingsFromControls() {
    const sound=
      document.getElementById(
        "settings-sound"
      );
    const music=
      document.getElementById(
        "settings-music"
      );
    const soundMuted=
      document.getElementById(
        "settings-sound-muted"
      );
    const musicMuted=
      document.getElementById(
        "settings-music-muted"
      );

    if (!gridshardAudioDirector) {
      return;
    }

    gridshardAudioDirector
      .setPreferences({
        soundVolume:
          Number(
            sound?.value ?? 100
          ) / 100,
        musicVolume:
          Number(
            music?.value ?? 70
          ) / 100,
        soundMuted:
          Boolean(
            soundMuted?.checked
          ),
        musicMuted:
          Boolean(
            musicMuted?.checked
          ),
      });
  }

  const settingsPreviewMusicEl =
    document.getElementById(
      "settings-preview-music"
    );
  if (settingsPreviewMusicEl) {
    settingsPreviewMusicEl.addEventListener(
      "click",
      () => {
        previewAudioSettingsFromControls();
        const result=
          gridshardAudioDirector
            ?.previewMusic(
              "menu"
            );
        const status=
          document.getElementById(
            "settings-save-status"
          );
        if (status) {
          status.textContent=
            result?.ok
              ? "GRIDSHARD müzik önizlemesi çalıyor"
              : "Müzik önizlemesi kullanılamadı";
        }
      }
    );
  }

  const settingsPreviewSfxEl =
    document.getElementById(
      "settings-preview-sfx"
    );
  if (settingsPreviewSfxEl) {
    settingsPreviewSfxEl.addEventListener(
      "click",
      () => {
        previewAudioSettingsFromControls();
        const result=
          gridshardAudioDirector
            ?.previewSfx(
              "core_hit"
            );
        const status=
          document.getElementById(
            "settings-save-status"
          );
        if (status) {
          status.textContent=
            result?.ok
              ? "Çekirdek hasarı SFX önizlemesi çalındı"
              : "SFX önizlemesi kullanılamadı";
        }
      }
    );
  }

  for (
    const controlId
    of [
      "settings-sound",
      "settings-music",
      "settings-sound-muted",
      "settings-music-muted",
      "settings-vibration",
      "settings-graphics",
      "settings-language",
      "settings-analytics-consent",
    ]
  ) {
    const control=
      document.getElementById(
        controlId
      );
    if (control) {
      const eventName = control.type === "range" ? "input" : "change";
      control.addEventListener(
        eventName,
        () => {
          previewAudioSettingsFromControls();
          if (controlId !== "settings-language") {
            scheduleSettingsAutoSave(controlId === "settings-analytics-consent" ? 0 : control.type === "range" ? 320 : 120);
          }
        }
      );
    }
  }

  const settingsLanguageEl =
    document.getElementById(
      "settings-language"
    );
  if (settingsLanguageEl) {
    settingsLanguageEl.addEventListener(
      "change",
      async () => {
        const languageValue =
          settingsLanguageEl.value
          === "en"
            ? "en"
            : "tr";
        applyLanguagePreference(
          languageValue
        );
        renderSettingsSaveStatus(
          languageValue === "en"
            ? "Language selected · saving automatically..."
            : "Dil seçildi · otomatik kaydediliyor...",
          "saving"
        );
        await saveSettingsForm();
      }
    );
  }

  if (battleForfeitButton) {
    battleForfeitButton.addEventListener(
      "click",
      forfeitActiveBattle
    );
  }

  function returnHomeAfterMatch() {
    postMatchSync.clear();
    pvpConnection.disconnect();
    pvpState.reset();
    onlinePlay.reset();
    resetBattleResultPresentation();
    returnToMainMenu();
    renderPlayModeUi();
    void loadSocialView();
    void loadTeamView();
  }

  document.getElementById("post-match-continue")?.addEventListener(
    "click",
    (event) => {
      if (event.currentTarget.dataset.postMatchStage === "rewards") {
        returnHomeAfterMatch();
        return;
      }
      renderPostMatchRewards();
      showPostMatchStage("rewards");
    }
  );

  poolConfirmEl.addEventListener(
    "click",
    async () => {
      gridshardAudioDirector
        ?.prepareBattlePlayback?.();
      if (
        activePlayMode === "online"
        && isOnlineMatchmakingCancelable()
      ) {
        poolConfirmEl.disabled = true;
        poolConfirmEl.textContent = localizedUiText("İptal ediliyor…");
        await onlinePlay.cancel();
        clearPlayError();
        renderOnlinePlayStatus("cancelled");
        return;
      }

      if (
        !battlePoolSelection
          .isComplete()
      ) {
        return;
      }

      commandLog.push({
        atMs:
          client.elapsedMs,
        kind:
          "set_battle_pool",
        payload: {
          module_instance_ids:
            battlePoolSelection
              .selectedIds(),
          module_definition_ids:
            selectedBattlePoolDefinitionIds(),
        },
      });
      renderLog();

      if (
        activePlayMode
        === "local"
      ) {
        poolConfirmEl.disabled =
          true;
        poolConfirmEl.textContent =
          "Savaş";
        startLocalPlayableMatch();
        return;
      }

      if (
        activePlayMode
        !== "online"
      ) {
        return;
      }

      poolConfirmEl.disabled =
        false;
      poolConfirmEl.dataset.matchmaking =
        "true";
      poolConfirmEl.textContent =
        localizedUiText("İptal Et");

      const result =
        await startRealOnlineMatch();

      const stillMatching = result.ok && isOnlineMatchmakingCancelable(onlinePlay.status);
      poolConfirmEl.dataset.matchmaking =
        String(stillMatching);
      poolConfirmEl.textContent =
        stillMatching
          ? localizedUiText("İptal Et")
          : localizedUiText("Savaş");

      if (!result.ok) {
        poolConfirmEl.disabled =
          false;
      }
    }
  );

  document.getElementById("home-battle-button")?.addEventListener(
    "click",
    async () => {
      if (homeMatchmakingLaunchPending || homeMatchmakingCancelPending || isOnlineMatchmakingCancelable()) return;
      homeMatchmakingLaunchPending = true;
      try {
        const repair = repairBattleDeckAgainstCollection();
        if (repair.definitionIds.length !== 6) {
          throw new Error("Savaş için altı kartlık geçerli bir deste gerekli.");
        }
        if (repair.changed) await persistBattlePoolDefinitionIds(repair.definitionIds);
        gridshardAudioDirector?.prepareBattlePlayback?.();
        prepareOnlineMatch();
        requestOwnedAudioState(
          "home_matchmaking_started",
          { onlineStatus: "matchmaking" },
          { force: true }
        );
        const result = await startRealOnlineMatch();
        if (!result.ok && !result.cancelled) {
          renderHomeMatchmakingOverlay("error");
          const copy = document.querySelector("#home-battle-button small");
          if (copy) copy.textContent = result.reason || "Eşleştirme başlatılamadı";
        }
      } catch (error) {
        onlinePlay.reset();
        onlinePlay.lastError = error instanceof Error ? error.message : String(error);
        renderHomeMatchmakingOverlay("error");
        const copy = document.querySelector("#home-battle-button small");
        if (copy) copy.textContent = error.message || "Eşleştirme başlatılamadı";
      } finally {
        homeMatchmakingLaunchPending = false;
        renderHomeHub();
      }
    }
  );

  document.getElementById("home-matchmaking-cancel")?.addEventListener("click", async () => {
    const button = document.getElementById("home-matchmaking-cancel");
    if (document.body.dataset.onlineStatus === "error") {
      onlinePlay.reset();
      clearPlayError();
      renderHomeMatchmakingOverlay("idle");
      const copy = document.querySelector("#home-battle-button small");
      if (copy) copy.textContent = "Eşleştirmeyi başlat";
      renderHomeHub();
      return;
    }
    homeMatchmakingCancelPending = true;
    if (button) { button.disabled = true; button.textContent = localizedMessage("matchmaking.cancelling"); }
    await onlinePlay.cancel();
    // İptal yerelde anlıktır. Önceki /join isteği ağda sürse bile yeni
    // SAVAŞ dokunuşunu kilitlememeli; koordinatör yeni başlangıcı sunucu
    // iptal isteğinin arkasında güvenle sıraya alır.
    homeMatchmakingLaunchPending = false;
    onlinePlay.reset();
    clearPlayError();
    renderOnlinePlayStatus("idle");
    if (button) { button.disabled = false; button.textContent = "İPTAL ET"; }
    homeMatchmakingCancelPending = false;
    const copy = document.querySelector("#home-battle-button small");
    if (copy) copy.textContent = "Eşleştirmeyi başlat";
    renderHomeHub();
  });

  const arenaDetailDialog = document.getElementById("arena-detail-dialog");
  document.getElementById("home-arena-card")?.addEventListener("click", () => {
    renderHomeArena();
    if (arenaDetailDialog?.showModal && !arenaDetailDialog.open) arenaDetailDialog.showModal();
    else arenaDetailDialog?.setAttribute("open", "");
    if (arenaDetailDialog) arenaDetailDialog.scrollTop = 0;
    const path = document.getElementById("arena-path");
    requestAnimationFrame(() => {
      const current = path?.querySelector(".arena-path-stage.is-current");
      if (!path || !current) return;
      path.scrollTop = Math.max(0, current.offsetHeight >= path.clientHeight
        ? current.offsetTop
        : current.offsetTop - ((path.clientHeight - current.offsetHeight) / 2));
    });
  });
  document.getElementById("arena-detail-close")?.addEventListener("click", () => {
    if (arenaDetailDialog?.close) arenaDetailDialog.close();
    else arenaDetailDialog?.removeAttribute("open");
  });
  document.getElementById("arena-leaderboard-button")?.addEventListener("click", () => {
    openLeaderboard();
  });
  document.getElementById("profile-open-leaderboard")?.addEventListener("click", () => {
    openLeaderboard();
  });
  document.getElementById("leaderboard-back")?.addEventListener("click", () => {
    const leaderboard = document.getElementById("leaderboard-dialog");
    if (leaderboard?.close) leaderboard.close();
    else leaderboard?.removeAttribute("open");
    if (arenaDetailDialog?.showModal && !arenaDetailDialog.open) arenaDetailDialog.showModal();
    else arenaDetailDialog?.setAttribute("open", "");
  });
  document.getElementById("public-profile-close")?.addEventListener("click", closePublicProfile);
  document.getElementById("public-profile-friend-action")?.addEventListener("click", async (event) => {
    if (!activePublicProfileId) return;
    const relationship = event.currentTarget.dataset.relationship || "none";
    const result = relationship === "incoming"
      ? await socialMutation(
          `/social/${encodeURIComponent(participantPlayerId)}/requests/accept`,
          { requester_id:activePublicProfileId, requestKind:"profile-friend-accept" },
          "Arkadaşlık isteği kabul ediliyor…"
        )
      : await socialMutation(
          `/social/${encodeURIComponent(participantPlayerId)}/requests`,
          { target_player_id:activePublicProfileId, requestKind:"profile-friend-request" },
          "Arkadaşlık isteği gönderiliyor…"
        );
    if (result.ok) renderPublicProfileFriendAction();
  });
  document.getElementById("public-profile-share")?.addEventListener("click", async () => {
    if (!activePublicProfileId) return;
    const status = document.getElementById("public-profile-status");
    try {
      const links = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/share/${encodeURIComponent(activePublicProfileId)}`,
        {cache:"no-store"},
        12000
      );
      if (navigator.share) await navigator.share({title:"GRIDSHARD Profili",url:links.web_link});
      else await navigator.clipboard.writeText(links.web_link);
      if (status) status.textContent = "Profil bağlantısı paylaşıldı.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("public-profile-block")?.addEventListener("click", async () => {
    if (!activePublicProfileId || !window.confirm("Bu oyuncuyu engellemek ve arkadaşlıktan çıkarmak istiyor musun?")) return;
    const status = document.getElementById("public-profile-status");
    try {
      socialState = (await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/block`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,target_player_id:activePublicProfileId,blocked:true})},
        12000
      )).social;
      if (status) status.textContent = "Oyuncu engellendi.";
      renderPublicProfileFriendAction();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("public-profile-report")?.addEventListener("click", async () => {
    if (!activePublicProfileId) return;
    const detail = window.prompt("Şikâyet nedenini kısaca yaz:", "uygunsuz davranış");
    if (!detail) return;
    const status = document.getElementById("public-profile-status");
    try {
      await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/reports`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,target_player_id:activePublicProfileId,reason:"player_report",detail})},
        12000
      );
      if (status) status.textContent = "Şikâyet inceleme kuyruğuna alındı.";
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  document.getElementById("reward-inbox-button")?.addEventListener("click", () => loadRewardInbox({ open:true }));
  document.getElementById("reward-inbox-close")?.addEventListener("click", () => document.getElementById("reward-inbox-dialog")?.close());
  document.getElementById("team-profile-close")?.addEventListener("click", closeTeamProfile);
  document.getElementById("profile-clan-title")?.addEventListener("click", (event) => {
    const teamId = event.currentTarget?.dataset?.teamId || "";
    if (teamId) openTeamProfile(teamId);
  });
  enemyBattleNameEl?.addEventListener("click", () => {
    if (
      isPublicProfileTarget(enemyBattlePlayerId)
      && matchmakingState.opponentType !== "ai"
    ) openPublicProfile(enemyBattlePlayerId);
  });
  document.querySelectorAll("[data-leaderboard-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLeaderboardTab = button.dataset.leaderboardTab || "trophies";
      document.querySelectorAll("[data-leaderboard-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderLeaderboard();
    });
  });
  document.querySelectorAll("[data-leaderboard-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTrophyLeaderboardScope = button.dataset.leaderboardScope || "general";
      document.querySelectorAll("[data-leaderboard-scope]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderLeaderboard();
    });
  });
  document.getElementById("home-core-hero")?.addEventListener("click", openCoreCollection);
  document.getElementById("chest-reveal-close")?.addEventListener("click", () => {
    const dialog = document.getElementById("chest-reveal-dialog");
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
  });

  if (
    typeof window
    !== "undefined"
  ) {
    window.__GRIDSHARD_TEST_API={
      startQuickLocalBattle,
      fillBattlePoolForQuickTest,
      getAudioState:() =>
        audioStateOwner
          ?.currentState
        || null,
      getAudioPlaybackStatus:() =>
        gridshardAudioDirector
          ?.playbackStatus?.()
        || null,
      getBattleEventState:() => ({
        effects:battleEffectAggregator?.snapshot?.() || [],
        booster:boosterTargetMode.snapshot?.() || null,
        audio:{
          state:audioStateOwner?.currentState || null,
          terminalState:audioStateOwner?.terminalState || null,
          revision:audioStateOwner?.revision || 0,
        },
      }),
      emitFloatingFeedback:(moduleId, text, variant="neutral") =>
        emitFloatingBattleFeedback(moduleId, text, variant),
      selectBoosterForTest:(boosterId) => {
        const known = BOOSTER_OPTIONS.some((booster) => booster.id === boosterId);
        if (!known) return { ok:false, reason:"unknown_booster" };
        boosterOfferOpen = true;
        activeBoosterOfferIds = new Set([boosterId]);
        selectBoosterTargetMode(boosterId, "test_api");
        renderBoosterOptions();
        renderBoard({ force:true });
        return { ok:true, state:boosterTargetMode.snapshot?.() || null };
      },
      deployModule:(definitionId) => {
        const module = clientModuleForDefinitionId(definitionId);
        return Boolean(module && deployDeckModule(module));
      },
      getBattleState:()=>({
        mode:
          activePlayMode,
        started:
          localBattleStarted,
        finished:
          localBattleFinished,
        pool_size:
          battlePoolSelection
            .selectedIds()
            .length,
        local_status:
          document.body
            .dataset
            .localStatus,
        elapsed_ms:
          client.elapsedMs,
        authority:
          document.body
            .dataset
            .battleAuthority,
        active_module_ids:[...client.modules.values()]
          .filter((module) => module.status === "active")
          .map((module) => module.instanceId),
      }),
    };
  }

  tutorialController = new GridshardTutorialController({
    root: document.getElementById("tutorial-overlay"),
    storageKey: "gridshard.tutorial.v1",
    steps: [
      {
        title: "Hazır devreyle başla",
        body: "Dengeli 6 kartlık Başlangıç Destesi ilk maçın için hazır. Tek dokunuşla yükleyebilirsin.",
        target: "#battle-pool-panel",
        action: "load-starter-pool",
        actionLabel: "Başlangıç Devresini Yükle",
        hint: "Deste 6/6 olduğunda savaş düğmesi açılır.",
      },
      {
        title: "Savaşı başlat",
        body: "Beta boyunca Arena/Lig ve kupa aralığına uygun sunucu AI rakibi doğrudan atanır.",
        target: "#battle-pool-confirm",
        action: "start-matchmaking",
        actionLabel: "Savaş",
        hint: "Çekirdek sabit enerji kaynağıdır; altı kartlık havuzu sen seçersin.",
      },
      {
        title: "Dokun, sistem yerleştirsin",
        body: "Savaşta altı karttan birine dokun. Sunucu uygun boş hücreyi otomatik seçip yeni modülü yerleştirir.",
        target: "#module-shelf",
        hint: "Masaüstü ve mobilde hücre seçmeden tek dokunuş yeterlidir.",
      },
    ],
    onAction: async (action) => {
      if (action === "load-starter-pool") {
        await loadSelectedBattlePoolPreset(STARTER_BATTLE_POOL_PRESET.name);
        return battlePoolSelection.isComplete();
      }
      if (action === "start-matchmaking") {
        if (!battlePoolSelection.isComplete()) return false;
        setActivePlayMode("online");
        const result = await startRealOnlineMatch();
        return Boolean(result.ok);
      }
      return true;
    },
  });

  document.getElementById("tutorial-replay")?.addEventListener("click", () => {
    tutorialController.start({ force: true });
  });

  document.body.dataset.onlineStatus = "idle";
  setActivePlayMode(
    "online"
  );
  renderBattlePoolSelection();
  loadModuleCatalog();
  renderParticipantIdentity();
  renderParticipantBootstrapStatus();
  bootstrapParticipant();
  renderBoosterOptions();
  createBoard();
  render();
  renderCapacity();
  renderCredits();
  requestAnimationFrame(updateClock);
})();
