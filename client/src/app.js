(() => {
  "use strict";

  const PORT_COUNT_BY_NAME = {
    "Çekirdek":4,
    "Jeneratör":4,
    "Batarya":2,
    "Dağıtıcı":3,
    "Kapasitör":2,
    "Lazer":1,
    "Darbe Topu":1,
    "Ray Topu":1,
    "Füze Fırlatıcı":1,
    "Dron Üssü":2,
    "Ark Topu":1,
    "Kalkan":2,
    "Zırh":2,
    "Yansıtıcı":2,
    "Bariyer":2,
    "Onarım Modülü":2,
    "Soğutucu":2,
    "Güçlendirici":2,
    "Hedefleme Bilgisayarı":2,
    "Aşırı Hızlandırıcı":2,
    "EMP":1,
    "Sinyal Bozucu":1,
    "Virüs":1,
    "Enerji Sömürücü":1,
    "Kesici":1,
  };

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
    strategicRole: item.name_tr, rarity: item.rarity, unlockTrophies: item.unlock_trophies,
    status: item.id === "core" ? "active" : item.id === "generator" ? "destroyed" : "reserve",
    position: item.id === "core" ? {x: 2, y: 1} : null,
    isDeckTemplate: !["core", "generator"].includes(item.id),
    energyRequired: 0, energyReceived: 0, isPowered: true, storedEnergy: 0,
    portCount: 0, movable: false, removable: false, rotatable: false, direction: "up",
  }));

  const commandLog = [];
  const META_STATUS = "M1-M6 çekirdeği uygulandı";
  const COMPETITIVE_STATUS = "M7 rekabetçi altyapı doğrulanıyor";
  const BALANCE_STATUS = "Denge simülasyonu mevcut · geniş örnek bekliyor";
  const AI_STATUS = "5 AI arketipi aktif · oyuncu test telemetrisi toplanıyor";
  const PVP_STATUS = "GRIDSHARD Beta.39 · 6 Kartlık Deste + Sunucu Yerleşimi";



  const OPPOSITE = {
    up:"down",
    right:"left",
    down:"up",
    left:"right",
  };

  const LEFT_OF = {
    up:"left",
    right:"up",
    down:"right",
    left:"down",
  };

  const RIGHT_OF = {
    up:"right",
    right:"down",
    down:"left",
    left:"up",
  };
  const BOOSTER_FIRST_OFFER_MS = 30000;
  const BOOSTER_OFFER_INTERVAL_MS = 30000;
  const BOOSTER_OPTIONS_PER_OFFER = 3;
  const BOOSTER_DRAG_TYPE = "application/x-gridshard-booster";
  let nextBoosterOfferIndex = 0;
  let boosterOfferOpen = false;
  let serverBoosterOfferId = null;
  let serverBoosterEligibleTargets = new Map();
  let activeBoosterOfferIds = new Set();
  let activeDragGhostPreview = null;

  const BOOSTER_OPTIONS = [
    { id:"overcharge_chip", nameTr:"Aşırı Yük Çipi", nameEn:"Overcharge Chip", descriptionTr:"+%25 saldırı · 15 sn", descriptionEn:"+25% attack · 15 sec", targetCategories:["saldırı"] },
    { id:"emergency_repair", nameTr:"Acil Onarım", nameEn:"Emergency Repair", descriptionTr:"%25 anlık onarım", descriptionEn:"25% instant repair", targetCategories:[] },
    { id:"dual_port_adapter", nameTr:"Çift Port Adaptörü", nameEn:"Dual Port Adapter", descriptionTr:"+1 geçici port · 15 sn", descriptionEn:"+1 temporary port · 15 sec", targetCategories:[] },
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
  const FLOATING_COMBAT_TEXT_ENABLED = false;
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
    { name:"Enerji Dalgası", module_definition_ids:["battery","splitter","capacitor","laser","shield","repair"] },
    { name:"Kırmızı Hat", module_definition_ids:["battery","laser","pulse_cannon","missile_launcher","drone_bay","targeting_computer"] },
    { name:"Mavi Duvar", module_definition_ids:["battery","shield","armor","reflector","barrier","repair"] },
    { name:"Yeşil Ağ", module_definition_ids:["battery","laser","repair","cooler","amplifier","targeting_computer"] },
    { name:"Mor Kesinti", module_definition_ids:["battery","laser","emp","jammer","virus","energy_leech"] },
    { name:"Akış Ekonomisi", module_definition_ids:["splitter","capacitor","laser","shield","cooler","disruptor"] },
  ].map((preset, index) => Object.freeze({
    ...preset,
    favorite: index === 0,
    last_used_at_ms: null,
    use_count: 0,
    system: true,
  })));

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
        )
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
  let activeBattlePoolPresetName = null;
  let activeBattlePoolPresetBaseline = [];
  let quickLoadoutFilter = "all";
  let initialBattleModuleIds = [];

  const client = new RelayBattleClient({
    modules: moduleDefinitions,
    unlockAtMs: 0,
    circuitCredits: 200,
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
    rating: 1000,
    league_name_tr: "Gümüş",
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
    });
  let selectedLaboratoryModuleId = "generator";
  let metaProgressionState = null;
  const pendingMetaRequests = new Map();
  let activeModuleFilter = "all";
  let selectedCollectionModuleId = "laser";
  let pendingDeckModuleInstanceId = null;
  let homeMatchmakingLaunchPending = false;
  let homeMatchmakingCancelPending = false;
  let deckEditRevision = 0;
  let deckSaveQueue = Promise.resolve();
  let deckEditorSlots = battlePoolSelection.selectedIds().slice(0, 6);
  while (deckEditorSlots.length < 6) deckEditorSlots.push(null);

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
    if (screen === "play") {
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

    if (screen === "play") {
      // Beta.26: Oyna doğrudan tek çevrimiçi hazırlık ekranını açar.
      prepareOnlineMatch();
      tutorialController?.maybeStart();
    }

    if (["profile", "daily", "rewards", "shop", "modules", "events", "menu"].includes(screen)) {
      accountDataLoader
        .loadProfile()
        .then(() => {
          renderProfileSummary();
          renderMetaHubScreens();
          renderRemoteDataStatus();
        });
      if (["shop", "modules", "menu"].includes(screen)) {
        loadMetaProgression();
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
    }

    renderRemoteDataStatus();
    return result;
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
        { id: "field_3h", name_tr: "Bronz Sandık", visual_tier: "bronze", unlock_hours: 3 },
        { id: "circuit_8h", name_tr: "Gümüş Sandık", visual_tier: "silver", unlock_hours: 8 },
        { id: "core_24h", name_tr: "Altın Sandık", visual_tier: "gold", unlock_hours: 24 },
        { id: "diamond_24h", name_tr: "Elmas Sandık", visual_tier: "diamond", unlock_hours: 24 },
      ] },
      shop: { day: "", offers: [
        { id: "bronze_daily", name_tr: "Bronz Sandık", tier: "bronze", currency: "circuit_credits", cost: 120, purchased: false },
        { id: "silver_daily", name_tr: "Gümüş Sandık", tier: "silver", currency: "circuit_credits", cost: 400, purchased: false },
        { id: "gold_daily", name_tr: "Altın Sandık", tier: "gold", currency: "circuit_credits", cost: 900, purchased: false },
      ] },
    };
  }

  async function loadMetaProgression() {
    try {
      const response = await fetch(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression`
      );
      if (!response.ok) throw new Error("Koleksiyon yüklenemedi.");
      metaProgressionState = await response.json();
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
      footer.innerHTML = `<strong>SV ${level}</strong><span>${level >= 15 ? "AZAMİ" : `${shards} / ${required}`}</span><i style="--module-progress:${level >= 15 ? 100 : Math.min(100, Math.round((shards / required) * 100))}%"></i>`;
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
        empty.setAttribute("aria-label", `${index + 1}. boş deste yuvası`);
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
        tile.setAttribute("aria-label", `${localizedUiText(item.name_tr)} · ${pendingDeckModuleInstanceId ? "Yerine koy" : "Çıkar"}`);
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
      const preset = battlePoolPresets[index];
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1);
      button.title = preset?.name || `Hazır deste ${index + 1}`;
      button.disabled = !preset;
      button.classList.toggle("is-active", preset?.name === activeBattlePoolPresetName);
      if (preset) {
        button.addEventListener("click", async () => {
          await loadSelectedBattlePoolPreset(preset.name);
          renderMetaHubScreens();
        });
      }
      host.appendChild(button);
    }
  }

  function renderHomeHub() {
    renderHomeCoreHero();
    renderDeckStrip(document.getElementById("home-active-deck"));
    renderPresetStrip(document.getElementById("home-preset-decks"));
    renderHomeArena();
    const battleButton = document.getElementById("home-battle-button");
    if (battleButton) {
      const locked = selectedDeckMetaModules().some(item => item?.unlocked === false);
      battleButton.disabled = locked || deckEditorSlots.filter(Boolean).length !== 6
        || homeMatchmakingLaunchPending || homeMatchmakingCancelPending
        || isOnlineMatchmakingCancelable();
      const copy = battleButton.querySelector("small");
      if (copy && !homeMatchmakingLaunchPending && !isOnlineMatchmakingCancelable()) copy.textContent = locked ? "Destendeki kilitli kartları değiştir" : "Eşleştirmeyi başlat";
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
      if (rewards.core_shards) return resourceSymbolMarkup("core_shards");
      if (rewards.module_shards || rewards.module_id) return resourceSymbolMarkup("module_shards");
      if (rewards.flux_shards) return resourceSymbolMarkup("flux_shards");
      if (rewards.circuit_credits) return resourceSymbolMarkup("circuit_credits");
      return resourceSymbolMarkup("module_shards");
    };
    for (const stage of stages) {
      const arena = stage.kind === "arena" || !stage.kind
        ? (arenasByIndex.get(Number(stage.index)) || stage)
        : null;
      const unlocked = arena ? Boolean(arena.unlocked) : Number(arenaViewModel().rating) >= Number(stage.minimum_rating || 0);
      const section = document.createElement("section");
      section.className = `arena-path-stage${unlocked ? " is-unlocked" : ""}${stage.kind === "league" ? " is-league" : ""}${stage.id === currentStageId ? " is-current" : ""}`;
      const head = document.createElement("header");
      head.className = "arena-path-stage-head";
      const marker = document.createElement("span");
      marker.className = "arena-path-marker";
      marker.textContent = stage.kind === "league" ? "♛" : String(stage.index || "◇");
      const copy = document.createElement("div");
      copy.className = "arena-path-stage-copy";
      const title = document.createElement("h3");
      title.textContent = stage.kind === "league"
        ? stage.name_tr
        : `Arena ${stage.index}${stage.name_tr ? ` · ${stage.name_tr}` : ""}`;
      const detail = document.createElement("p");
      if (arena) {
        const nodeCount = (arena.nodes || []).filter((node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= Number(stage.minimum_rating || 0)).length;
        const coreCopy = arena.core_unlock ? " · Yeni çekirdek" : "";
        detail.textContent = `${stage.minimum_rating || 0} Kupa · ${nodeCount} ödül durağı${coreCopy}`;
      } else {
        const next = stages[stages.indexOf(stage) + 1];
        detail.textContent = next
          ? `${stage.minimum_rating || 0}–${Number(next.minimum_rating) - 1} Kupa · Sezonluk rekabet ligi`
          : `${stage.minimum_rating || 0}+ Kupa · Efsanevi rekabet ligi`;
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
          const rewardDescription = localizedRewardDescription(node.description_tr);
          const reward = document.createElement("button");
          reward.type = "button";
          reward.className = `arena-reward-node${node.claimed ? " is-claimed" : ""}${node.claimable ? " is-claimable" : ""}`;
          reward.disabled = !node.claimable;
          reward.innerHTML = `<span class="arena-reward-trophy">${Number(node.trophies)} 🏆</span><i aria-hidden="true">${rewardIcon(node.rewards)}</i><strong>${node.claimed ? "ALINDI" : rewardDescription}</strong>`;
          if (node.claimable) reward.setAttribute("aria-label", `${rewardDescription} ödülünü al`);
          reward.addEventListener("click", async () => {
            reward.disabled = true;
            const status = document.getElementById("arena-reward-status");
            try {
              await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/arena/${encodeURIComponent(node.id)}/claim`);
              if (status) status.textContent = `${rewardDescription} hesabına eklendi.`;
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
        leagueRoad.className = "arena-league-road";
        const next = stages[stages.indexOf(stage) + 1];
        const end = Number(next?.minimum_rating || Number(stage.minimum_rating || 0) + 200);
        for (let trophy = Number(stage.minimum_rating || 0) + 50; trophy <= end; trophy += 50) {
          const stop = document.createElement("span");
          stop.className = Number(arenaViewModel().rating) >= trophy ? "is-reached" : "";
          stop.textContent = `${trophy} 🏆`;
          leagueRoad.appendChild(stop);
        }
        section.appendChild(leagueRoad);
      }
      host.appendChild(section);
    }
    if (!host.childElementCount) host.textContent = "Devre Yolu yükleniyor…";
  }

  const CORE_GLYPHS = {core_resonance:"◈",core_guardian:"⬡",core_overdrive:"ϟ",core_disruptor:"⌁",core_capacitor:"▣",core_phoenix:"✹",core_quantum:"✧"};

  function renderHomeCoreHero() {
    const core = metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0]
      || null;
    const button = document.getElementById("home-core-hero");
    const glyph = document.getElementById("home-core-hero-glyph");
    const name = document.getElementById("home-core-hero-name");
    const level = document.getElementById("home-core-hero-level");
    if (glyph) glyph.textContent = CORE_GLYPHS[core?.id] || "◈";
    if (name) name.textContent = core?.name_tr || "Rezonans Çekirdeği";
    if (level) level.textContent = `SEVİYE ${Number(core?.level || 1)}`;
    if (button) {
      button.dataset.coreType = core?.id || "core_resonance";
      button.setAttribute("aria-label", `${core?.name_tr || "Çekirdek"} · Seviye ${Number(core?.level || 1)} · Çekirdek seçimini aç`);
    }
  }
  function openCoreCollection() {
    renderCoreCollection();
    const dialog = document.getElementById("core-collection-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function renderCoreCollection() {
    const host = document.getElementById("core-collection-list");
    if (!host) return;
    host.replaceChildren();
    for (const core of metaProgressionState?.cores?.types || []) {
      const card = document.createElement("article");
      card.className = "core-collection-card";
      const title = document.createElement("h3");
      title.textContent = `${CORE_GLYPHS[core.id] || "◈"} ${core.name_tr} · SV ${core.level}`;
      const copy = document.createElement("p");
      copy.textContent = `${core.role_tr} Enerji: ${core.energy_per_second}/sn · Depo ${core.energy_capacity}. Arena ${core.unlock_arena}.`;
      const pieces = document.createElement("p");
      const cost = core.next_upgrade_cost;
      pieces.textContent = `${core.shards} çekirdek parçası${core.legacy_shards ? ` + ${core.legacy_shards} eski ortak parça` : ""}${cost ? ` / ${cost.shards}` : " · AZAMİ"}`;
      const select = document.createElement("button");
      select.type = "button";
      select.textContent = core.selected ? "SEÇİLDİ" : core.unlocked ? "SEÇ" : "KİLİTLİ";
      select.disabled = !core.unlocked || core.selected;
      select.addEventListener("click", async () => {
        select.disabled = true;
        try {
          const response = await fetch(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/core`, {method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify({core_type_id:core.id})});
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.detail || "Çekirdek seçilemedi.");
          metaProgressionState = payload;
          renderMetaHubScreens();
          document.getElementById("core-action-status").textContent = "Çekirdek seçildi.";
        } catch (error) { document.getElementById("core-action-status").textContent = error.message; select.disabled = false; }
      });
      const upgrade = document.createElement("button");
      upgrade.type = "button";
      upgrade.textContent = cost ? `YÜKSELT · ${cost.flux_shards} AKI` : "AZAMİ SEVİYE";
      upgrade.disabled = !core.unlocked || !cost || core.shards + core.legacy_shards < cost.shards || metaProgressionState.flux_shards < cost.flux_shards;
      const mutateCore = async (button, suffix) => {
        button.disabled = true;
        try {
          await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/cores/${core.id}/${suffix}`);
          document.getElementById("core-action-status").textContent = "Çekirdek gelişimi kaydedildi.";
        } catch (error) { document.getElementById("core-action-status").textContent = error.message; button.disabled = false; }
      };
      upgrade.addEventListener("click", () => mutateCore(upgrade, "upgrade"));
      card.append(title, copy, pieces, select, upgrade);
      for (const skill of core.skills || []) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `SV ${skill.level} · ${skill.name_tr} · ${skill.learned ? "SEÇİLDİ" : skill.flux_cost + " Akı"}`;
        button.disabled = !core.unlocked || skill.tier_selected || core.level < skill.level || metaProgressionState.flux_shards < skill.flux_cost;
        button.addEventListener("click", () => mutateCore(button, `skills/${skill.id}`));
        card.appendChild(button);
      }
      host.appendChild(card);
    }
  }

  function renderHomeArena() {
    const { rank, rating, floor, ceiling, progress } = arenaViewModel();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("home-arena-name", rank.kind === "league" ? rank.name_tr : `Arena ${rank.index || 1}`);
    setText("home-arena-progress-copy", rank.next_stage ? `${rating - floor} / ${ceiling - floor} Kupa` : `${rating} Kupa`);
    const arenaTitle = rank.name_tr && !/^Arena\s+\d+$/i.test(rank.name_tr)
      ? `Arena ${rank.index || 1} · ${rank.name_tr}`
      : `Arena ${rank.index || 1}`;
    setText("arena-detail-title", rank.kind === "league" ? rank.name_tr : arenaTitle);
    setText("arena-detail-rating", `${rating} Kupa`);
    setText("arena-detail-range", rank.next_stage ? `${rating - floor} / ${ceiling - floor}` : "Azami aşama");
    setText("arena-detail-next", rank.next_stage ? `Sonraki: ${rank.next_stage.name_tr} · ${ceiling} Kupa` : "Efsanevi yol tamamlandı");
    renderArenaPath();
    const segments = document.getElementById("home-arena-segments");
    if (segments) {
      segments.replaceChildren();
      const arena = (metaProgressionState?.arena_path || []).find((item) => Number(item.index) === Number(rank.index));
      const nodes = (arena?.nodes || []).filter((node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= floor);
      const stops = nodes.length ? nodes : Array.from({ length: 4 }, (_, index) => ({ trophies: floor + ((ceiling - floor) / 4) * (index + 1) }));
      stops.forEach((node, index) => {
        const segment = document.createElement("i");
        segment.className = rating >= Number(node.trophies) ? "is-complete" : (index === stops.findIndex((item) => rating < Number(item.trophies)) ? "is-current" : "");
        segment.title = `${Number(node.trophies)} Kupa${node.description_tr ? ` · ${localizedRewardDescription(node.description_tr)}` : ""}`;
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

  function chestVisualMarkup(tier, { large = false } = {}) {
    const safeTier = ["bronze", "silver", "gold", "diamond"].includes(tier) ? tier : "bronze";
    return `<span class="chest-visual chest-visual-${safeTier}${large ? " chest-visual-large" : ""}" aria-hidden="true"><i></i><b></b><em>◆</em></span>`;
  }

  function renderShop() {
    const state = metaProgressionState || fallbackMetaProgression();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("shop-flux-balance", `${state.flux_shards || 0} Akı`);
    setText("shop-credit-balance", `${state.circuit_credits || 0} DK`);
    const giftHost = document.getElementById("gift-chest-list");
    if (giftHost) {
      giftHost.replaceChildren();
      const definitions = state.chests?.definitions || [];
      // Every owned slot is rendered, including multiple chests of one type.
      const entries = (state.chests?.slots || []).map(slot => ({slot, definition: definitions.find(d => d.id === slot.definition_id)}));
      for (const definition of definitions) {
        if (!entries.some(entry => entry.definition?.id === definition.id)) entries.push({definition, slot: null});
      }
      for (const {definition, slot} of entries) {
        if (!definition) continue;
        const card = document.createElement("article");
        card.className = "shop-chest-card";
        const tier = chestTier(definition);
        card.dataset.tier = tier;
        const ready = slot && new Date(slot.unlocks_at).getTime() <= Date.now();
        const remainingMinutes = slot ? Math.max(0, Math.ceil((new Date(slot.unlocks_at).getTime() - Date.now()) / 60000)) : 0;
        card.innerHTML = `${chestVisualMarkup(tier)}<strong>${definition.name_tr}</strong><small>${slot ? (ready ? "Açılmaya hazır" : `${Math.floor(remainingMinutes / 60)} sa ${remainingMinutes % 60} dk`) : `${definition.unlock_hours} saat`}</small>`;
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = slot
          ? (ready ? "AÇ" : "SÜRE İŞLİYOR")
          : (definition.claim_available === false ? "BUGÜN ALINDI" : "HEDİYEYİ AL");
        action.disabled = Boolean(state.unavailable || (slot && !ready) || (!slot && definition.claim_available === false));
        if (ready) action.addEventListener("click", () => openGiftChest(slot.chest_id));
        else if (!slot && definition.claim_available !== false) {
          action.addEventListener("click", () => claimGiftChest(definition.id));
        }
        card.appendChild(action);
        giftHost.appendChild(card);
      }
    }
    const offerHost = document.getElementById("daily-shop-offers");
    if (offerHost) {
      offerHost.replaceChildren();
      for (const offer of state.shop?.offers || []) {
        const card = document.createElement("article");
        card.className = "daily-offer-card";
        card.dataset.tier = offer.tier;
        const currency = offer.currency === "flux_shards" ? "Akı" : "DK";
        card.innerHTML = `${chestVisualMarkup(offer.tier)}<div><strong>${offer.name_tr}</strong><small>DK · Akı · Modül ve Çekirdek Parçası</small></div>`;
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = offer.purchased ? "ALINDI" : `${offer.cost} ${currency}`;
        action.disabled = Boolean(state.unavailable || offer.purchased || Number(state[offer.currency] || 0) < offer.cost);
        action.addEventListener("click", () => purchaseShopOffer(offer.id));
        card.appendChild(action);
        offerHost.appendChild(card);
      }
    }
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
      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ request_id: entry.requestId }),
        });
      } catch (_networkError) {
        throw new Error("Sunucu bağlantısı kesildi. Beta.42 hızlı savaş başlatıcısını yeniden açıp işlemi tekrar dene.");
      }
      const rawBody = await response.text();
      let payload = {};
      try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch (_parseError) { payload = {}; }
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) pendingMetaRequests.delete(url);
        throw new Error(payload.detail || `Sunucu işlemi reddetti (${response.status}).`);
      }
      // Only a confirmed response ends this logical action. A network retry uses
      // the same receipt id, so a lost response cannot purchase another level.
      pendingMetaRequests.delete(url);
      metaProgressionState = payload.meta_progression || payload;
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      renderMetaHubScreens();
      return payload;
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
    const module = metaProgressionState?.module_collection?.find(
      (item) => item.definition_id === rewards.module_definition_id
    );
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const title = document.getElementById("chest-reveal-title");
    const host = document.getElementById("chest-reveal-rewards");
    const kicker = document.getElementById("chest-reveal-kicker");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    if (title) title.textContent = definition?.name_tr || offer?.name_tr || "Sandık";
    if (kicker) { kicker.hidden = false; kicker.textContent = "ÖDÜLLER HESABA EKLENDİ"; }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    if (host) {
      host.replaceChildren();
      const rewardLines = [
        ["DEVRE KREDİSİ", `+${rewards.circuit_credits || 0} DK`],
        ["AKI", `+${rewards.flux_shards || 0}`],
        [module?.name_tr || "MODÜL PARÇASI", `+${rewards.module_shards || 0}`],
        ["ÇEKİRDEK PARÇASI", `+${rewards.core_shards || 0}`],
      ];
      for (const [label, value] of rewardLines) {
        const row = document.createElement("div");
        row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        host.appendChild(row);
      }
    }
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
    if (host) host.innerHTML = '<div class="chest-opening-progress"><span>Ödüller profile kaydediliyor</span><strong>•••</strong></div>';
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
    if (host) host.innerHTML = `<div><span>${error instanceof Error ? error.message : String(error)}</span></div>`;
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  async function purchaseShopOffer(offerId) {
    const status = document.getElementById("shop-action-status");
    const offer = metaProgressionState?.shop?.offers?.find((item) => item.id === offerId);
    showChestOpening({ tier: offer?.tier || "bronze", title: offer?.name_tr || "Sandık" });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/shop/${encodeURIComponent(offerId)}/purchase`
      );
      const reward = payload.receipt?.rewards || {};
      if (status) status.textContent = `Sandık açıldı: +${reward.circuit_credits || 0} DK · +${reward.flux_shards || 0} Akı · +${reward.module_shards || 0} modül parçası · +${reward.core_shards || 0} çekirdek parçası.`;
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      showChestFailure(error);
    }
  }

  async function openGiftChest(chestId) {
    const status = document.getElementById("shop-action-status");
    const chest = metaProgressionState?.chests?.slots?.find((item) => item.chest_id === chestId);
    const definition = metaProgressionState?.chests?.definitions?.find((item) => item.id === chest?.definition_id);
    showChestOpening({ tier: chestTier(definition || chest || {}), title: definition?.name_tr || chest?.name_tr || "Sandık" });
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/chests/${encodeURIComponent(chestId)}/open`
      );
      const reward = payload.receipt?.rewards || {};
      if (status) status.textContent = `Hediye açıldı: +${reward.circuit_credits || 0} DK · +${reward.flux_shards || 0} Akı · +${reward.module_shards || 0} modül parçası · +${reward.core_shards || 0} çekirdek parçası.`;
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      showChestFailure(error);
    }
  }

  async function claimGiftChest(definitionId) {
    const status = document.getElementById("shop-action-status");
    try {
      const payload = await metaProgressionMutation(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/chests/gifts/${encodeURIComponent(definitionId)}/claim`
      );
      const chest = payload.receipt?.chest || {};
      if (status) status.textContent = `${chest.name_tr || "Hediye sandık"} alındı; açılma süresi başladı.`;
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
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
      if (status) status.textContent = `${ids.length} / 6 modül seçildi. İlk boş yuva yeni seçimle doldurulacak.`;
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
      const response = await fetch(`/profile/${encodeURIComponent(participantPlayerId)}/battle-pool`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ battle_pool_ids: definitionIds }),
      });
      if (!response.ok) throw new Error("Deste sunucuya kaydedilemedi. Tekrar deneyebilirsin.");
      const profile = await response.json();
      if (presetName) {
        const savedPreset = await fetch(`/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: presetName, battle_pool_ids: definitionIds }),
        });
        if (!savedPreset.ok) throw new Error("Aktif deste kaydedildi ancak hazır deste kaydedilemedi. Tekrar deneyebilirsin.");
      }
      return profile;
    };
    // Save rapid edits in order so an older response cannot restore the old deck.
    deckSaveQueue = deckSaveQueue.catch(() => {}).then(save);
    try {
      const profile = await deckSaveQueue;
      if (revision !== deckEditRevision) return { ok: true };
      profileState.applyProfile(profile);
      if (presetName === activeBattlePoolPresetName) activeBattlePoolPresetBaseline = [...definitionIds];
      if (status) status.textContent = "Aktif savaş destesi kaydedildi.";
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
      if (status) status.textContent = "Bu modülün savaş kartı henüz yüklenmedi. Sayfayı yenileyip tekrar deneyebilirsin.";
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
    if (status) status.textContent = "Deste dolu. Yer değiştirmek istediğin deste kartına dokun.";
    renderMetaHubScreens();
    document.getElementById("module-deck-strip")?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  function activeMetaModule() {
    return (metaProgressionState?.module_collection || fallbackMetaProgression().module_collection)
      .find((item) => item.definition_id === selectedCollectionModuleId) || null;
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
      text.textContent = "Savaş değerleri, sınıf karşılıkları ve uyumlu modüller.";
      const entries = [["Sınıf", poolCategoryLabel(item.category)], ["Nadirlik", moduleRarityLabel(item.rarity)], ["CAN", stats.max_hp], ["Hasar", stats.base_damage], ["Bekleme", `${Number(stats.cooldown_ms || 0) / 1000} sn`], ["Etki çarpanı", Number(stats.effect_multiplier || 0).toLocaleString("tr-TR", {maximumFractionDigits:2})], ["Enerji tüketimi", `${stats.energy_consumption || 0}/sn`], ["Akım maliyeti", item.current_cost]];
      const list = document.createElement("dl");
      for (const [label, rawValue] of entries) {
        const row = document.createElement("div"), name = document.createElement("dt"), value = document.createElement("dd");
        name.textContent = label;
        value.textContent = String(rawValue ?? "—");
        row.append(name, value); list.appendChild(row);
      }
      host.appendChild(list);
      const moduleName = (id) => (metaProgressionState?.module_collection || []).find((module) => module.definition_id === id)?.name_tr || id;
      const counters = document.createElement("div");
      counters.className = "module-counter-grid";
      for (const [label, ids, className] of [["GÜÇLÜ OLDUĞU", item.strong_against, "is-strong"], ["ZAYIF OLDUĞU", item.weak_against, "is-weak"], ["UYUMLU OLDUĞU", item.synergy_with, "is-synergy"]]) {
        const card = document.createElement("section");
        card.className = className;
        const heading = document.createElement("strong");
        heading.textContent = label;
        const copy = document.createElement("span");
        copy.textContent = ids?.length ? ids.map(moduleName).join(" · ") : "Özel karşılık yok";
        card.append(heading, copy);
        counters.appendChild(card);
      }
      host.appendChild(counters);
    } else if (tabName === "talents") {
      const selectedTalent = (item.talents || [])
        .flatMap((node) => node.choices || [])
        .find((choice) => (item.talents || []).some((node) => node.selected === choice.id));
      text.textContent = selectedTalent?.description_tr || "Açıklamasını görmek için bir yeteneğe dokun.";
      for (const node of item.talents || []) {
        const row = document.createElement("section");
        row.className = "module-talent-node";
        row.dataset.selected = node.selected || "";
        const heading = document.createElement("strong");
        heading.textContent = `Seviye ${node.level} · ${node.flux_cost} Akı`;
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
            ? "SEÇİLDİ"
            : node.selected ? "DİĞER DAL SEÇİLDİ"
              : Number(item.level) + 1 < node.level ? `SV ${node.level} GEREKLİ`
                : Number(metaProgressionState?.flux_shards || 0) < node.flux_cost ? `${node.flux_cost} AKI GEREKLİ`
                  : "SEÇ";
          button.innerHTML = `<strong>${choice.name_tr}</strong><small>${choiceState}</small>`;
          button.dataset.selectable = String(canChoose);
          button.setAttribute("aria-label", `${choice.name_tr} · ${choiceState} · Açıklamayı göster`);
          button.title = choice.description_tr || choice.name_tr;
          button.addEventListener("click", async () => {
            text.textContent = choice.description_tr || choice.name_tr;
            choices.querySelectorAll("button").forEach((candidate) => candidate.classList.toggle("is-previewed", candidate === button));
            if (!canChoose) return;
            button.disabled = true;
            try {
              await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${item.definition_id}/talents/${node.tier}/${choice.id}`);
              renderModuleDetailTab("talents");
              document.getElementById("module-detail-status").textContent = "Uzmanlık kaydedildi.";
            } catch (error) { document.getElementById("module-detail-status").textContent = error.message; button.disabled = false; }
          });
          choices.appendChild(button);
        });
        host.appendChild(row);
      }
    } else {
      text.textContent = item.description_tr || item.strategic_role || item.name_tr;
      const overview = document.createElement("div");
      overview.className = "module-overview-grid";
      for (const [label, rawValue] of [["SAVAŞ ROLÜ", item.strategic_role || "—"], ["SINIF", poolCategoryLabel(item.category)], ["AÇILIŞ", `Arena ${item.unlock_arena} · ${item.unlock_trophies} Kupa`], ["SONRAKİ SEVİYE", item.next_stats ? `CAN ${item.next_stats.max_hp} · HASAR ${item.next_stats.base_damage}` : "Azami seviye"]]) {
        const card = document.createElement("div");
        const name = document.createElement("span");
        const value = document.createElement("strong");
        name.textContent = label;
        value.textContent = rawValue;
        card.append(name, value);
        overview.appendChild(card);
      }
      host.appendChild(overview);
    }
    host.prepend(text);
  }

  function openModuleDetail() {
    const item = activeMetaModule();
    const definition = metaModuleDefinition(item);
    if (!item || !definition) return;
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("module-detail-name", localizedUiText(item.name_tr));
    setText("module-detail-rarity", moduleRarityLabel(item.rarity).toLocaleUpperCase("tr-TR"));
    setText("module-detail-level", `SEVİYE ${Number(item.level || 0) + 1}`);
    setText("module-detail-selected-state", deckEditorSlots.filter(Boolean).map(clientDefinitionId).includes(item.definition_id) ? "DESTEDE" : "DESTE DIŞI");
    const cost = item.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    setText("module-detail-shards", cost ? `${item.shards || 0} / ${required}` : "AZAMİ SEVİYE");
    const progress = document.getElementById("module-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, Number(item.shards || 0)) : required; }
    const art = document.getElementById("module-detail-art");
    if (art) {
      art.dataset.category = item.category || "";
      art.dataset.module = item.definition_id || "";
      art.textContent = moduleIconFor(definition);
      art.setAttribute("aria-label", `${localizedUiText(item.name_tr)} görseli`);
    }
    const stats = document.getElementById("module-detail-stats");
    if (stats) stats.innerHTML = `<div><span>CAN</span><strong>${item.stats?.max_hp ?? definition.maxHp}</strong></div><div><span>AKIM</span><strong>ϟ ${item.current_cost ?? definition.circuitCreditCost}</strong></div><div><span>HASAR</span><strong>${item.stats?.base_damage || 0}</strong></div>`;
    const upgrade = document.getElementById("module-detail-upgrade");
    const reason = !item.unlocked ? `${item.unlock_trophies ?? 0} kupada açılır.` : !cost ? "Azami seviye." : Number(item.shards || 0) < required ? `Gerekli parça: ${item.shards || 0}/${required}` : Number(metaProgressionState?.circuit_credits || 0) < Number(cost.circuit_credits) ? `Gerekli Devre Kredisi: ${cost.circuit_credits}` : "";
    if (upgrade) {
      upgrade.disabled = Boolean(reason || metaProgressionState?.unavailable);
      upgrade.textContent = cost ? `YÜKSELT · ${cost.circuit_credits} DK` : "AZAMİ SEVİYE";
    }
    setText("module-detail-status", reason);
    for (const button of document.querySelectorAll("[data-module-detail-tab]")) button.classList.toggle("is-active", button.dataset.moduleDetailTab === "overview");
    renderModuleDetailTab("overview");
    const dialog = document.getElementById("module-detail-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
  }

  async function upgradeCollectionModule() {
    const button = document.getElementById("module-detail-upgrade");
    if (button?.disabled) return;
    if (button) button.disabled = true;
    const moduleId = selectedCollectionModuleId;
    try {
      await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${encodeURIComponent(moduleId)}/upgrade`);
      openModuleDetail();
      document.getElementById("module-detail-status").textContent = "Modül seviyesi yükseltildi.";
    } catch (error) {
      if (button) button.disabled = false;
      document.getElementById("module-detail-status").textContent = error.message;
    }
  }

  function renderMetaHubScreens() {
    renderHomeHub();
    renderModuleCollection();
    renderShop();
    renderCoreCollection();
    renderCanonStatistics();
    const state = metaProgressionState;
    if (state) {
      const credits = document.getElementById("lobby-circuit-credits");
      if (credits) credits.textContent = String(state.circuit_credits || 0);
      const flux = document.getElementById("lobby-flux-shards");
      if (flux) flux.textContent = String(state.flux_shards || 0);
    }
  }

  document.querySelectorAll("[data-module-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModuleFilter = button.dataset.moduleFilter || "all";
      document.querySelectorAll("[data-module-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderModuleCollection();
    });
  });
  document.getElementById("module-quick-info")?.addEventListener("click", openModuleDetail);
  document.getElementById("module-quick-select")?.addEventListener("click", selectCollectionModule);
  document.getElementById("module-detail-close")?.addEventListener("click", () => document.getElementById("module-detail-dialog")?.close());
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
      labels[status] || `Bağlantı: ${status}`;
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
        "2.1.0-beta.42",
      expectedProtocolVersion: 1,
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
    build: "2.1.0-beta.42",
  });

  const postMatchSync =
    new RelayPostMatchSync({
      playerId:
        pvpState.playerId,
      profileState,
      statisticsState,
      progressionState,
    });

  let postMatchSyncInFlight = null;
  let onlineFinishPresentedSessionId = null;

  function finishReasonLabel(reason) {
    const labels = {
      core_destroyed: "Çekirdek yok edildi",
      player_forfeit: "Savaştan çekilme",
      time_limit_tiebreak: "Süre sonu üstünlüğü",
      time_limit_draw: "Süre sonu beraberliği",
      simultaneous_core_tiebreak: "Çifte çekirdek yıkımı",
      simultaneous_core_draw: "Eşzamanlı çekirdek yıkımı",
    };
    return localizedUiText(labels[reason] || "Savaş tamamlandı");
  }

  function onlineOutcome(result) {
    if (result?.is_draw) return "draw";
    return result?.winner_player_id === pvpState.playerId
      ? "victory"
      : "defeat";
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
    const homeButton = document.getElementById("return-preparation-button");
    const rematchButton = document.getElementById("rematch-button");
    if (damage) damage.hidden = rewardsVisible;
    if (rewards) rewards.hidden = !rewardsVisible;
    if (continueButton) continueButton.hidden = rewardsVisible;
    if (homeButton) homeButton.hidden = !rewardsVisible;
    if (rematchButton) rematchButton.hidden = !rewardsVisible;
  }

  function renderPostMatchRewards() {
    const result = pvpState.finalResult;
    const progression = progressionState.viewModel();
    const outcome = result ? onlineOutcome(result) : "pending";
    const outcomeEl = document.getElementById("post-match-reward-outcome");
    if (outcomeEl) {
      outcomeEl.dataset.outcome = outcome;
      outcomeEl.textContent = outcome === "victory" ? "ZAFER" : outcome === "defeat" ? "MAĞLUBİYET" : outcome === "draw" ? "BERABERLİK" : "SONUÇ";
    }
    const trophy = document.getElementById("post-match-trophy-reward");
    const credits = document.getElementById("post-match-credit-reward");
    if (trophy) trophy.textContent = progression
      ? `${Number(progression.ratingDelta) >= 0 ? "+" : ""}${Number(progression.ratingDelta)} Kupa`
      : "Hesaplanıyor";
    if (credits) credits.textContent = progression
      ? `+${Number(progression.circuitCreditsAwarded || 0)} DK`
      : "Hesaplanıyor";
    const chest = document.getElementById("post-match-chest-reward");
    if (chest) {
      const awarded = postMatchSync.lastPayload?.progression?.chest_awarded;
      chest.hidden = !awarded;
      chest.textContent = awarded ? `${awarded.name_tr || "Savaş sandığı"} sandık yuvasına eklendi.` : "";
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
      const core = document.createElement("div");
      core.className = "post-match-core-card";
      const outcomeLabel = document.createElement("span");
      outcomeLabel.textContent = result.is_draw ? "BERABERE" : outcome === "winner" ? "KAZANAN" : "KAYBEDEN";
      const glyph = document.createElement("i");
      const coreType = summary.core_type || player.core_type || "core_resonance";
      glyph.textContent = CORE_GLYPHS[coreType] || "◈";
      const coreCopy = document.createElement("div");
      const coreName = (metaProgressionState?.cores?.types || []).find((item) => item.id === coreType)?.name_tr || "Çekirdek";
      const playerName = player.display_name || (playerId === pvpState.playerId ? profileState.viewModel()?.displayName : null) || playerId;
      const name = document.createElement("strong");
      name.textContent = coreName;
      const level = document.createElement("small");
      level.textContent = `${playerName} · SV ${Number(summary.core_level || player.core_level || 1)}${playerId === pvpState.playerId ? " · SEN" : ""}`;
      coreCopy.append(name, level);
      core.append(outcomeLabel, glyph, coreCopy);

      const total = document.createElement("div");
      total.className = "post-match-total-damage";
      const totalLabel = document.createElement("span");
      totalLabel.textContent = "TOPLAM HASAR";
      const totalValue = document.createElement("strong");
      totalValue.textContent = Number(summary.damage_dealt || 0).toLocaleString("tr-TR");
      total.append(totalLabel, totalValue);
      head.append(core, total);
      card.appendChild(head);

      const rows = document.createElement("div");
      rows.className = "post-match-module-damage";
      const moduleDamage = Array.isArray(summary.damage_by_module) ? summary.damage_by_module : [];
      const maximum = Math.max(1, ...moduleDamage.map((item) => Number(item.damage || 0)));
      for (const item of moduleDamage) {
        const row = document.createElement("div");
        row.className = "post-match-damage-row";
        const icon = document.createElement("span");
        icon.className = "post-match-damage-icon";
        icon.textContent = moduleIconFor({ nameTr: item.name_tr });
        const copy = document.createElement("div");
        const rowName = document.createElement("strong");
        rowName.textContent = item.name_tr || item.definition_id;
        const levelCopy = document.createElement("small");
        levelCopy.textContent = `SV ${Number(item.level || 1)}`;
        const track = document.createElement("i");
        const fill = document.createElement("b");
        fill.style.width = `${Math.max(0, Math.min(100, Number(item.damage || 0) / maximum * 100))}%`;
        track.appendChild(fill);
        copy.append(rowName, levelCopy, track);
        const damage = document.createElement("em");
        damage.textContent = Number(item.damage || 0).toLocaleString("tr-TR");
        row.append(icon, copy, damage);
        rows.appendChild(row);
      }
      if (!moduleDamage.length) {
        const empty = document.createElement("p");
        empty.textContent = "Bu oyuncu için modül hasar kaydı bulunmuyor.";
        rows.appendChild(empty);
      }
      card.appendChild(rows);
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
      `${(Number(result.finished_at_ms || 0) / 1000).toFixed(1)} sn`
    );
    setAnalysisValue(
      "battle-analysis-reason",
      finishReasonLabel(result.finish_reason)
    );
    setAnalysisValue("battle-analysis-damage", Number(own.damage_dealt || 0));
    setAnalysisValue("battle-analysis-core", `${Number(own.core_hp || 0)} HP`);
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
      `${(Number(localBattleMetrics.duration_ms || 0) / 1000).toFixed(1)} sn`
    );
    setAnalysisValue(
      "battle-analysis-reason",
      finishReasonLabel(finishReason || (won ? "core_destroyed" : null))
    );
    setAnalysisValue(
      "battle-analysis-damage",
      Number(localBattleMetrics.damage_dealt || 0)
    );
    setAnalysisValue("battle-analysis-core", `${Number(core?.hp || 0)} HP`);
    setAnalysisValue("battle-analysis-modules", living.length);
    setAnalysisValue("battle-analysis-hp", `${remainingHp} / ${totalHp}`);
  }

  function resetBattleResultPresentation() {
    onlineFinishPresentedSessionId = null;
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
      battleStateLabelEl.textContent =
        localizedUiText(`Maç tamamlandı · ${
          outcome === "victory"
            ? "Galibiyet"
            : outcome === "defeat"
              ? "Mağlubiyet"
              : "Beraberlik"
        }`);
    }

    if (firstPresentation) {
      if (["victory", "defeat"].includes(outcome)) {
        setTerminalAudioState(outcome, "online_match_finished");
      } else {
        clearTerminalAudioState("online_match_draw");
        requestOwnedAudioState("online_match_draw");
      }
      if (result.finish_reason === "core_destroyed") {
        const loser = pvpState.snapshot?.players?.[result.loser_player_id];
        const destroyedCore = loser?.modules?.find(
          (module) => module.definition_id === "core"
        );
        if (!emitServerModuleDestruction(result.loser_player_id, destroyedCore)) {
          const destructionKey = destroyedCore?.instance_id
            ? `${result.loser_player_id}:${destroyedCore.instance_id}`
            : null;
          if (!destructionKey || !destructionFxPlayed.has(destructionKey)) {
            emitModuleExplosion(
              result.loser_player_id === pvpState.playerId
                ? "core-1"
                : "enemy-core",
              { core: true }
            );
          }
        }
      }
    }

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

    await finishWebTestSessionAudit(
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
      await loadMetaProgression();
      presentTierCelebration(
        result.payload?.progression?.tier_advanced
      );
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
      || `Telemetri: ${status}`;
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
        direction: "up",
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
        "Eşleştirme: Hazır · 1000 DP",
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
      || `Eşleştirme: ${status}`;

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
      snapshotModuleHp.clear();
      clearTapSelection({ rerender: false });
      mobileBattleController.reset();
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
        "2.1.0-beta.42",
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
  const shelf = document.getElementById("module-shelf");
  const mobileSelectedModuleEl = document.getElementById("mobile-selected-module");
  const mobileRotateModuleEl = document.getElementById("mobile-rotate-module");
  const mobileReturnModuleEl = document.getElementById("mobile-return-module");
  const mobileCancelPlacementEl = document.getElementById("mobile-cancel-placement");
  const mobileBattleController = new GridshardMobileBattleController();
  let tapSelectedModuleId = null;
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
    const glyph = CORE_GLYPHS[selectedCore] || "◈";
    const buttonArt = corePowerButtonEl.querySelector(".core-power-glyph");
    if (buttonArt) buttonArt.textContent = glyph;
    const coreCard = document.getElementById("core-1");
    if (coreCard) {
      coreCard.style.setProperty("--core-charge", `${charge}%`);
      coreCard.classList.toggle("core-power-ready", corePowerReady);
      coreCard.classList.add("core-charge-card");
      coreCard.setAttribute("aria-label", `Çekirdek gücü · ${corePowerReady ? "Hazır" : "%" + charge}`);
      const icon = coreCard.querySelector(".module-icon");
      if (icon) icon.textContent = glyph;
    }
    corePowerButtonEl.dataset.targeting=String(corePowerTargeting);
    corePowerButtonEl.disabled=localBattleFinished || !corePowerReady;
    corePowerButtonEl.setAttribute("aria-pressed",String(corePowerTargeting));
    corePowerButtonEl.title=corePowerReady
      ? (corePowerTargeting
          ? "Çekirdek gücünü kullan"
          : "Çekirdek gücü hazır")
      : `Çekirdek gücü doluyor · %${charge}`;
    if (corePowerChargeEl) {
      corePowerChargeEl.textContent=corePowerReady ? "HAZIR" : `%${charge}`;
    }
  }

  function syncCorePowerFromSnapshot(player) {
    client.currentDiscountRemaining = Number(player?.discounted_deployments || 0);
    client.energyLoadRatio = Number(player?.energy_load_ratio || 0);
    client.energyStock = Number(player?.energy_stock || 0);
    document.getElementById("board")?.classList.toggle("energy-strain", client.energyLoadRatio > 1.2 && client.energyStock <= 0);
    const summary = document.getElementById("player-core-summary");
    if (summary) summary.title = `Enerji yükü %${Math.round(client.energyLoadRatio * 100)} · Depo ${client.energyStock}`;
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

  function isTapPlacementUi() {
    return (
      Number(globalThis.innerWidth || 0) <= 1100
      || Boolean(globalThis.matchMedia?.("(pointer: coarse)").matches)
    );
  }

  function selectedTapModule() {
    return tapSelectedModuleId
      ? client.modules.get(tapSelectedModuleId) || null
      : null;
  }

  function updateMobilePlacementControls() {
    const module = selectedTapModule();
    if (mobileSelectedModuleEl) {
      mobileSelectedModuleEl.textContent = module
        ? `${module.nameTr} seçildi · hedef hücreye dokun`
        : "Yerleştirmek için bir modül seç";
    }
    if (mobileRotateModuleEl) {
      mobileRotateModuleEl.disabled = !(
        module
        && module.status === "active"
        && module.rotatable !== false
        && client.isShelfUnlocked()
        && !localBattleFinished
      );
    }
    if (mobileReturnModuleEl) {
      mobileReturnModuleEl.disabled = !(
        module
        && module.status === "active"
        && module.removable !== false
        && client.isShelfUnlocked()
        && !localBattleFinished
      );
    }
    if (mobileCancelPlacementEl) {
      mobileCancelPlacementEl.disabled = !module;
    }
    document.body.dataset.tapPlacement = module ? "selected" : "idle";
  }

  function clearTapSelection({ cancelDrag = true, rerender = true } = {}) {
    tapSelectedModuleId = null;
    if (cancelDrag) client.cancelDrag();
    updateMobilePlacementControls();
    if (rerender) {
      renderShelf();
      renderBoard();
    }
  }

  function selectModuleForTap(module) {
    if (!module || localBattleFinished) return false;
    if (tapSelectedModuleId === module.instanceId) {
      clearTapSelection();
      return true;
    }
    const result = client.beginDrag(module.instanceId);
    if (!result.ok) {
      logClientMessage(result.reason);
      return false;
    }
    tapSelectedModuleId = module.instanceId;
    if (module.status === "reserve") {
      telemetryDispatcher.trackModuleShelfUsed({
        module_id: module.instanceId,
        elapsed_ms: client.elapsedMs,
      });
      if (isTapPlacementUi()) mobileBattleController.show("player", { focus: false });
    }
    updateMobilePlacementControls();
    renderShelf();
    renderBoard({ force: true });
    trackBattleUiInteraction("tap_select_module", "module_place");
    return true;
  }

  function placeTapSelectionOnCell(cell) {
    if (!tapSelectedModuleId || localBattleFinished || cell.classList.contains("core-cell")) {
      return false;
    }
    const selectedModule = client.requireModule(tapSelectedModuleId);
    const rejection = cellPlacementRejection(cell, selectedModule);
    if (rejection) {
      logClientMessage(rejection);
      return false;
    }
    const targetCard = cell.querySelector(".module-card");
    const result = client.dropOnCell(
      Number(cell.dataset.x),
      Number(cell.dataset.y),
      targetCard?.dataset.moduleId || null
    );
    if (!result.ok) {
      logClientMessage(result.reason);
      return false;
    }
    clearTapSelection({ cancelDrag: false, rerender: false });
    render();
    return true;
  }

  function cellPlacementRejection(cell, module) {
    if (cell?.dataset?.debris === "true") {
      return "Bu hücredeki enkaz temizlenene kadar modül yerleştirilemez.";
    }
    const special = SPECIAL_CELL_INFO[
      `${cell?.dataset?.x},${cell?.dataset?.y}`
    ];
    if (!special || !module) return null;
    const definitionId = String(
      module.definitionId
      || module.definition_id
      || module.instanceId
      || ""
    )
      .replace(/-\d+$/u, "")
      .replace(/-/gu, "_");
    if (special.definitionId && definitionId !== special.definitionId) {
      return `${localizedUiText(special.label)} yalnızca ${localizedUiText("Onarım Modülü")} kabul eder.`;
    }
    if (special.category && module.category !== special.category) {
      return `${localizedUiText(special.label)} yalnızca ${localizedUiText(special.category)} sınıfını kabul eder.`;
    }
    return null;
  }

  mobileRotateModuleEl?.addEventListener("click", () => {
    const module = selectedTapModule();
    if (!module || mobileRotateModuleEl.disabled) return;
    client.emitCommand({
      kind: "rotate_module",
      payload: { module_id: module.instanceId },
    });
    trackBattleUiInteraction("tap_rotate_module", "module_move");
  });

  mobileReturnModuleEl?.addEventListener("click", () => {
    if (mobileReturnModuleEl.disabled) return;
    const result = client.dropOnShelf();
    if (!result.ok) {
      logClientMessage(result.reason);
      return;
    }
    clearTapSelection({ cancelDrag: false });
    mobileBattleController.show("shelf", { focus: false });
  });

  mobileCancelPlacementEl?.addEventListener("click", () => clearTapSelection());
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
  const poolDetailPortsEl =
    document.getElementById(
      "battle-pool-detail-ports"
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
      idle: "Sunucu: Kontrol bekliyor",
      checking: "Sunucu: Kontrol ediliyor",
      ready: "Sunucu: Hazır",
      blocked: "Sunucu: Oyna geçici olarak kapalı",
      error: "Sunucu: Sağlık kontrolü başarısız",
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
          `Test Koşusu: ${manifestRunId}`;
      } else {
        testRunEl.textContent =
          "Test Koşusu: Kontrol bekliyor";
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
          "Operasyon: Kontrol bekliyor";
      } else if (
        operation.ready
      ) {
        const warnings =
          operation.warnings
          || [];
        operationEl.textContent =
          warnings.length
            ? (
                "Operasyon: Hazır · "
                + warnings.join(" | ")
              )
            : "Operasyon: Hazır";
      } else {
        operationEl.textContent =
          "Operasyon: Hazır değil";
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
          "Operasyon izleme özeti alınamadı."
        );
      }

      const view =
        monitoringState.apply(
          await response.json()
        );

      const operationLabels = {
        not_ready:"Hazır Değil",
        ready_not_started:
          "Hazır, Başlatılmadı",
        running:"Test Çalışıyor",
      };
      const stabilityLabels = {
        not_running:"Çalışmıyor",
        stable:"Stabil",
        degraded:"Bozulmuş",
      };

      if (el) {
        el.textContent =
          `İzleme: ${
            operationLabels[
              view.operationState
            ] || view.operationState
          } · ${
            stabilityLabels[
              view.stabilityState
            ] || view.stabilityState
          } · Tamamlama %${
            view.auditFinishRatePercent
          }`;
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
          "İzleme: Alınamadı";
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
          "Operasyon stabilitesi alınamadı."
        );
      }

      const view =
        operationStabilityState.apply(
          await response.json()
        );

      const labels = {
        not_running:
          "Test Çalışmıyor",
        stable:
          "Stabil",
        degraded:
          "Bozulmuş",
      };

      if (el) {
        el.textContent =
          `Stabilite: ${
            labels[view.stability]
            || view.stability
          }`;
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
          "Stabilite: Alınamadı";
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
          "Operasyon durumu alınamadı."
        );
      }

      const view =
        operationStatusState.apply(
          await response.json()
        );

      const labels = {
        not_ready:
          "Hazır Değil",
        ready_not_started:
          "Hazır, Başlatılmadı",
        running:
          "Test Çalışıyor",
      };

      if (el) {
        el.textContent =
          `Operasyon Durumu: ${
            labels[view.state]
            || view.state
          }`;
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
          "Operasyon Durumu: Alınamadı";
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
          "Web test run durumu alınamadı."
        );
      }

      const view =
        webTestRunStatusState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          `Gerçek Test: ${
            view.finished
              ? "Tamamlandı"
              : (
                  view.started
                    ? "Başlatıldı"
                    : "Başlatılmadı"
                )
          }`
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
          "Gerçek Test: Durum alınamadı";
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
          "Web test preflight raporu alınamadı."
        );
      }

      const view =
        preflightState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          `Gerçek Web Testi: ${
            view.ready
              ? "Başlatılabilir"
              : "Hazır Değil"
          }`
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
          "Gerçek Web Testi: Preflight alınamadı";
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
          "İlk koşu checklist alınamadı."
        );
      }

      const view =
        firstRunChecklistState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          `İlk Koşu: ${
            view.ready
              ? "Hazır"
              : "Hazır Değil"
          }`
          + (
              view.failedChecks.length
                ? ` · ${view.failedChecks.join(", ")}`
                : ""
            )
          + (
              view.noteCount
                ? ` · ${view.noteCount} operasyon notu`
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
          "İlk Koşu: Checklist alınamadı";
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
          "Web test çıkış onayı alınamadı."
        );
      }

      const view =
        launchReadinessState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          view.ready
            ? `Çıkış Onayı: Hazır · ${view.testRunId || "-"}`
            : (
                "Çıkış Onayı: Hazır Değil"
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
          "Çıkış Onayı: Durum alınamadı";
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
          "RC aday özeti alınamadı."
        );
      }

      const view =
        rcCandidateState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          `RC Adayı: ${
            view.ready
              ? "Hazır"
              : "Hazır Değil"
          }`
          + (
              view.testRunId
                ? ` · ${view.testRunId}`
                : ""
            )
          + (
              view.insufficientSignalCount
                ? ` · ${view.insufficientSignalCount} davranış sinyalinde yetersiz veri`
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
          "RC Adayı: Durum alınamadı";
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
          "Go/No-Go özeti alınamadı."
        );
      }

      const view =
        webTestGoNoGoState.apply(
          await response.json()
        );

      if (el) {
        el.textContent =
          `Web Test: ${view.decision}`
          + (
              view.insufficientSignalCount
                ? ` · ${view.insufficientSignalCount} davranış sinyalinde yetersiz veri`
                : " · davranış örnekleri gözlemlenebilir"
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
          "Web Test: Go/No-Go özeti alınamadı";
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
          "Geri bildirim özeti alınamadı."
        );
      }

      const payload =
        await response.json();
      const averages =
        payload.average_ratings
        || {};

      if (el) {
        el.textContent =
          `Geri Bildirim Özeti: ${
            payload.feedback_count
          } kayıt`
          + ` · Kullanılabilirlik ${
              averages.usability ?? "-"
            }`
          + ` · Bağlantı ${
              averages.connection ?? "-"
            }`
          + ` · Savaş Dengesi ${
              averages.battle_balance ?? "-"
            }`
          + ` · Modül/Booster ${
              averages.module_booster_balance ?? "-"
            }`;
      }

      return {
        ok:true,
        payload,
      };
    } catch (error) {
      if (el) {
        el.textContent =
          "Geri Bildirim Özeti: Alınamadı";
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
        throw new Error("İnceleme adayları alınamadı.");
      }

      const payload=await response.json();

      if (el) {
        if (payload.status==="waiting_for_real_data") {
          el.textContent="İnceleme Adayları: Gerçek veri bekleniyor";
        } else if (payload.status==="no_priority_issue") {
          el.textContent="İnceleme Adayları: Öncelikli sorun yok";
        } else {
          const first=payload.candidates?.[0];
          el.textContent=
            `İnceleme Adayları: ${payload.candidate_count} alan`
            + (first ? ` · Öncelik: ${first.label}` : "");
        }
        el.dataset.status=payload.status;
      }

      return {ok:true,payload};
    } catch (error) {
      if (el) {
        el.textContent="İnceleme Adayları: Alınamadı";
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
          "Beta bulguları alınamadı."
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
            `Beta Bulguları: Veri bekleniyor · ${
              payload.feedback_count
            }/${payload.minimum_feedback} geri bildirim`;
        } else {
          el.textContent =
            `Beta Bulguları: Analiz hazır`
            + ` · ${payload.concerns.length} izleme alanı`
            + ` · ${payload.gameplay_signals.completed_matches} tamamlanan maç`;
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
          "Beta Bulguları: Alınamadı";
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
        let detail =
          "Geri bildirim gönderilemedi.";

        try {
          const body =
            await response.json();
          detail =
            body?.detail
            || detail;
        } catch (_error) {
          // JSON gövdesi zorunlu değil.
        }

        throw new Error(
          detail
        );
      }

      if (statusEl) {
        statusEl.textContent =
          "Geri bildirim kaydedildi.";
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
          "Aktif test koşusu bulunamadı.",
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
          "Gerçek Web test koşusu tamamlanamadı."
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
          "Test koşusu raporu alınamadı."
        );
      }

      const payload =
        await response.json();

      if (el) {
        const duration =
          payload.run_duration_ms == null
            ? "-"
            : `${Math.round(
                payload.run_duration_ms
                / 1000
              )} sn`;

        el.textContent =
          `Test Raporu: ${payload.status}`
          + ` · Süre ${duration}`
          + ` · Operasyon ${
              payload.monitoring
                ?.operation?.state
              || "-"
            }`
          + ` · Stabilite ${
              payload.monitoring
                ?.stability?.state
              || "-"
            }`;
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
          "Test Raporu: Alınamadı";
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
          "Aktif test koşusu kimliği bulunamadı.",
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
        let detail =
          "Gerçek Web test koşusu başlatılamadı.";

        try {
          const payload =
            await response.json();
          detail =
            payload?.detail
            || detail;
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
        || "Sunucu Web test release-check hazır değil."
      );
    } else if (!launch.ok) {
      showPlayError(
        "websocket",
        launch.reason
        || "Web test çıkış onayı hazır değil."
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
        || "Gerçek Web test koşusu başlatılamadı."
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

  async function loadUiBuildManifest() {
    try {
      const response=await fetch(
        "/web-test/manifest",
        {
          cache:"no-store",
        }
      );
      if (!response.ok) return;
      const manifest=await response.json();
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
          || "2.1.0-beta.42";
      }
      if (runEl) {
        runEl.textContent=
          `${manifest.test_run_id || "local"} · cache ${manifest.static_cache_mode || "unknown"}`;
      }
    } catch (_error) {
      // Build chip is informational; startup remains available.
    }
  }

  renderAppScreen();
  renderConnectionStatus(
    pvpConnection.status
  );
  checkServerReadiness();
  loadUiBuildManifest();

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
            ? "Ayarlar açık · savaş devam ediyor"
            : "Ayarlar";
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
      reason:"Audio director hazır değil.",
    };
  }

  let tierCelebrationTimer = null;

  function presentTierCelebration(event) {
    if (!event?.event_id || !Number(event.tier_after)) return false;
    const storageKey = `gridshard.tier-celebrated.${participantPlayerId}`;
    try {
      if (window.localStorage.getItem(storageKey) === event.event_id) {
        return false;
      }
      window.localStorage.setItem(storageKey, event.event_id);
    } catch (_) {
      // Gizli/kapalı depolama kutlamayı engellemez; yalnız tekrar koruması devre dışı kalır.
    }

    const layer = document.getElementById("tier-celebration");
    const tier = document.getElementById("tier-celebration-value");
    if (!layer || !tier) return false;
    tier.textContent = `KADEME ${Number(event.tier_after)}`;
    layer.hidden = false;
    layer.dataset.active = "true";
    triggerGridshardCue("tier_up");
    window.clearTimeout(tierCelebrationTimer);
    tierCelebrationTimer = window.setTimeout(() => {
      layer.dataset.active = "false";
      window.setTimeout(() => {
        if (layer.dataset.active === "false") layer.hidden = true;
      }, 260);
    }, 2400);
    return true;
  }

  let activePlayMode = "idle";
  const AI_ARCHETYPE_UI = Object.freeze({
    aggressive:{
      name_tr:"Saldırgan", name_en:"Aggressive",
      description_tr:"Erken hasar temposu kurar; saldırı modüllerini ve Aşırı Yük'ü öne alır.",
      description_en:"Builds early damage pressure and prioritizes attack modules and Overcharge.",
      plan_tr:"5. hak Dron Üssü · 6. hak Güçlendirici",
      plan_en:"Slot 5 Drone Bay · Slot 6 Amplifier",
    },
    defensive:{
      name_tr:"Savunmacı", name_en:"Defensive",
      description_tr:"Çekirdeği ayakta tutar; savunma ve onarım katmanını saldırı baskısına göre büyütür.",
      description_en:"Protects the core by layering defense and repair against incoming pressure.",
      plan_tr:"5. hak Bariyer · 6. hak Onarım Modülü",
      plan_en:"Slot 5 Barrier · Slot 6 Repair Module",
    },
    balanced:{
      name_tr:"Dengeli", name_en:"Balanced",
      description_tr:"Rakibin devresine göre karşı modül seçer; saldırı ve savunmayı dengeler.",
      description_en:"Counters the opponent while balancing offense and defense.",
      plan_tr:"5. hak Darbe Topu · 6. hak Onarım Modülü",
      plan_en:"Slot 5 Pulse Cannon · Slot 6 Repair Module",
    },
    sabotage:{
      name_tr:"Sabotaj Odaklı", name_en:"Sabotage",
      description_tr:"Enerji ve destek hattını bozar; EMP, Kesici ve bozucu etkilerle tempo kırar.",
      description_en:"Disrupts energy and support lines with EMP, Disruptor and control effects.",
      plan_tr:"5. hak Sinyal Bozucu · 6. hak EMP",
      plan_en:"Slot 5 Jammer · Slot 6 EMP",
    },
    economy:{
      name_tr:"Ekonomi Odaklı", name_en:"Economy",
      description_tr:"Önce enerji rezervi ve dağıtımı kurar; sonra yüksek maliyetli saldırılara geçer.",
      description_en:"Builds energy reserve and distribution first, then transitions into expensive attacks.",
      plan_tr:"5. hak Batarya · 6. hak Dağıtıcı",
      plan_en:"Slot 5 Battery · Slot 6 Splitter",
    },
  });
  let selectedAiArchetype = "balanced";
  let activeLocalAiArchetype = "balanced";

  function aiArchetypeInfo(archetypeId=selectedAiArchetype) {
    return AI_ARCHETYPE_UI[archetypeId] || AI_ARCHETYPE_UI.balanced;
  }

  function aiArchetypeName(archetypeId=selectedAiArchetype) {
    const info=aiArchetypeInfo(archetypeId);
    return (document.documentElement?.lang || "tr") === "en"
      ? info.name_en
      : info.name_tr;
  }

  function renderAiArchetypePicker() {
    const picker=document.getElementById("ai-archetype-picker");
    if (!picker) return;
    const info=aiArchetypeInfo(selectedAiArchetype);
    const english=(document.documentElement?.lang || "tr") === "en";
    const heading=document.getElementById("ai-archetype-title");
    const selected=document.getElementById("ai-archetype-selected");
    const description=document.getElementById("ai-archetype-description");
    if (heading) heading.textContent=english ? "AI OPPONENT" : "AI RAKİBİ";
    if (selected) selected.textContent=english ? info.name_en : info.name_tr;
    if (description) {
      const descriptionText = english ? info.description_en : info.description_tr;
      const planText = english ? info.plan_en : info.plan_tr;
      description.textContent = `${descriptionText} · ${planText}`;
    }

    for (const button of picker.querySelectorAll("[data-ai-archetype]")) {
      const archetypeId=button.dataset.aiArchetype;
      const buttonInfo=aiArchetypeInfo(archetypeId);
      button.dataset.active=String(archetypeId === selectedAiArchetype);
      button.setAttribute("aria-pressed",String(archetypeId === selectedAiArchetype));
      const strong=button.querySelector("strong");
      if (strong) strong.textContent=english ? buttonInfo.name_en : buttonInfo.name_tr;
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
  const destructionFxPlayed = new Set();
  const snapshotModuleHp = new Map();
  const moduleAnchorRects = new Map();
  const floatingFeedbackLive = new Map();
  let battleLiveTickerTimer = null;

  let webTestSamplingTimer = null;
  let activeWebTestRunId = null;
  let previousCapacity = null;
  let mockServerCredits = 200;
  let mockServerPassiveSeconds = 0;
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
      || value.includes("çift port")
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
        idle:
          "Mod seçimi bekleniyor",
        local:
          "Tek Oyunculu Test Maçı aktif",
        online:
          "Online PvP hazırlanıyor",
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
        !(
          localBattle
          && localBattleFinished
        )
        && !(
          onlineBattle
          && pvpState.phase
            === "finished"
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
        ? "Review-ready · Manuel taslak açık"
        : "Review-ready bekleniyor";
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
        "Gerçek 3 maç review-ready olmadan sayısal değişiklik taslağı açılamaz.";
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
        "Mevcut değer";
      before.value=
        item.before_value ?? "";

      const proposed=
        document.createElement(
          "input"
        );
      proposed.type="text";
      proposed.placeholder=
        "Önerilen değer";
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
          " Manuel taslağı onayla"
        )
      );

      const checks=
        document.createElement(
          "small"
        );
      checks.textContent=
        `Simülasyon: ${item.simulation_status || "pending"} · Regresyon: ${item.regression_status || "pending"} · Uygulanabilir: ${item.ready_for_apply ? "Evet" : "Hayır"}`;

      const save=
        document.createElement(
          "button"
        );
      save.type="button";
      save.textContent=
        "Taslağı Kaydet";

      const simulate=
        document.createElement(
          "button"
        );
      simulate.type="button";
      simulate.className=
        "simulate-button";
      simulate.textContent=
        "İzole Simülasyonu Çalıştır";

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
        "Battle-Engine Regresyonunu Çalıştır";
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
          "Yapısal Engine Regresyonunu Çalıştır";
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
          ? "Son battle-engine regresyonu başarılı. Kanonik değer değişmedi."
          : (
              item.regression_status
              === "failed"
                ? "Son battle-engine regresyonu başarısız veya bu alan engine adaptörüne bağlı değil."
                : "Battle-engine regresyonu bekleniyor."
            );
      simulationResult.textContent=
        structuralReview
          ? "Bu aday sayısal değişiklik değildir; yapısal BattleEngine regresyonu ile doğrulanır."
          : (
              item.simulation_status
              === "passed"
                ? "Son izole simülasyon başarılı. Kanonik değer değişmedi."
                : (
                    item.simulation_status
                    === "failed"
                      ? "Son izole simülasyon başarısız veya bu alan henüz desteklenmiyor."
                      : "Simülasyon bekleniyor."
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
              "Taslak kaydedilemedi; simülasyon çalıştırılmadı.";
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
            simulationResult.textContent=
              `İzole simülasyon geçti · Önce ${beforeMetrics} · Öneri ${proposedMetrics} · Kanonik değer değişmedi.`;
            renderBalanceDraft(
              payload.draft
            );
          } else {
            simulationResult.textContent=
              payload.reason
              || payload.detail
              || "İzole simülasyon başarısız.";
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
            regressionResult.textContent=
              `Battle-engine regresyonu geçti · ${scenarios.length} engine senaryosu doğrulandı · Kanonik değer değişmedi.`;
          } else {
            regressionResult.textContent=
              payload.reason
              || payload.detail
              || "Battle-engine regresyonu başarısız.";
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
          "Denge değişiklik taslağı alınamadı."
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
        ? `${total} aday insan değerlendirmesine hazır`
        : "Güvenlik kapıları bekleniyor";

    list.innerHTML="";
    const evidence=
      document.getElementById(
        "human-review-evidence"
      );

    if (evidence) {
      evidence.innerHTML=
        total
          ? `<strong>Kanıt Paketi</strong><span>${numeric.length} sayısal · ${structural.length} yapısal aday · simulation/regression kanıtları doğrulandı · otomatik apply kapalı</span>`
          : "<strong>Kanıt Paketi</strong><span>Henüz güvenlik kapılarını geçen aday yok.</span>";
    }

    if (!total) {
      const empty=
        document.createElement(
          "p"
        );
      empty.textContent=
        "Yalnız simulation + regression geçen sayısal adaylar veya yapısal engine regresyonu geçen incelemeler burada görünür.";
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
          ? `Mevcut ${item.before_value} → Öneri ${item.proposed_value}`
          : "Yapısal engine doğrulaması geçti · sayısal değişiklik yok";

      const safety=
        document.createElement(
          "small"
        );
      safety.textContent=
        "İnsan kararı zorunlu · otomatik uygulama kapalı";

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
        "Simulation ve regression güvenlik kapılarını geçen ayrıntılı kanıt henüz yok.";
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
      summary.textContent=
        `${item.area} · ${item.numeric_change ? "Sayısal" : "Yapısal"} · ${item.regression_status}`;

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

      body.innerHTML=
        `<div class="human-review-compare-grid">`
        + `<div><span>Simulation Önce</span><strong>${simulationBefore ? safeJson(simulationBefore) : "—"}</strong></div>`
        + `<div><span>Simulation Öneri</span><strong>${simulationProposed ? safeJson(simulationProposed) : "—"}</strong></div>`
        + `<div><span>Regression</span><strong>${item.regression_status} · ${regressionScenarioCount} senaryo</strong></div>`
        + `</div>`
        + `<p><strong>Gerekçe:</strong> ${item.reason || "—"}</p>`
        + `<p><strong>Öneri:</strong> ${item.suggestion || "—"}</p>`
        + `<p><strong>Mevcut → Önerilen:</strong> ${item.before_value ?? "—"} → ${item.proposed_value ?? "—"}</p>`
        + `<p><strong>Simulation:</strong> ${item.simulation_status}</p>`
        + `<pre>${safeJson(item.simulation)}</pre>`
        + `<p><strong>Regression:</strong> ${item.regression_status}</p>`
        + `<pre>${safeJson(item.regression)}</pre>`
        + `<p class="human-review-safety">Otomatik apply kapalı · insan kararı zorunlu</p>`;

      const candidateDraft=readCandidateReviewDraft(item.area);
      const decisionBox=document.createElement("div");
      decisionBox.className="candidate-review-draft";
      const decisionSelect=document.createElement("select");
      for (const [value,label] of Object.entries(HUMAN_REVIEW_STATE_LABELS)) {
        const option=document.createElement("option");
        option.value=value;
        option.textContent=label;
        option.selected=candidateDraft.state===value;
        decisionSelect.appendChild(option);
      }
      const noteField=document.createElement("textarea");
      noteField.maxLength=600;
      noteField.placeholder="Bu adaya özel yerel inceleme notu";
      noteField.value=candidateDraft.note;
      const saveButton=document.createElement("button");
      saveButton.type="button";
      saveButton.textContent="Bu Adayın Kararını Yerelde Kaydet";
      const draftStatus=document.createElement("span");
      draftStatus.textContent=(candidateDraft.state!=="none" || candidateDraft.note)
        ? `${HUMAN_REVIEW_STATE_LABELS[candidateDraft.state]} · yalnız bu adaya ait yerel taslak`
        : "Bu aday için yerel karar yok";
      saveButton.addEventListener("click",()=>{
        try {
          const saved=saveCandidateReviewDraft(item.area,decisionSelect.value,noteField.value);
          draftStatus.textContent=`${HUMAN_REVIEW_STATE_LABELS[saved.state]} · ${item.area} için kaydedildi · canonical denge değişmedi`;
        } catch (_error) {
          draftStatus.textContent="Aday kararı yerelde kaydedilemedi";
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
  none:"Karar verilmedi",
  hold:"Beklet",
  reject:"Reddet",
  revisit:"İleride değerlendir",
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
        ? `${label} · yerel taslak · canonical dengeye uygulanmaz`
        : "Yerel inceleme kararı yok";
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
        `${HUMAN_REVIEW_STATE_LABELS[state]} · yerel inceleme kaydedildi · sunucuya gönderilmedi`;
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
          "İnsan değerlendirme kuyruğu alınamadı."
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
      `${report.battle_count || 0} / ${report.minimum_battles || 3} gerçek maç`
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
          "Henüz Jeneratör kapı taşıma verisi yok.";
      } else {
        routeSummary.textContent=
          `Toplam ${route.move_count} taşıma`
          + ` · Tercih ${route.preferred_gate_label || "-"}`
          + ` · Taşıma sonrası bağlı modül ort. ${route.average_connected_modules_after_move || 0}`
          + ` · Enerjili özel hücre ort. ${route.average_powered_special_cells_after_move || 0}`;
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
            .map(([id,value]) => `${aiArchetypeName(id)} ${value.battle_count || 0}`)
            .join(" · ")
        : "Arketip verisi yok";
      if (
        report.status
        === "review_ready"
      ) {
        balanceStatus.textContent=
          `İlk denge incelemesi için yeterli manuel örnek oluştu. ${archetypeSummary}. Öneriler otomatik uygulanmaz.`;
      } else {
        balanceStatus.textContent=
          `Denge incelemesi için ${report.battles_remaining || 0} gerçek maç daha gerekli. ${archetypeSummary}.`;
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
          "Manuel savaş raporu alınamadı."
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
          "Toplu manuel savaş raporu alınamadı; bu maçın yerel özeti korunuyor.";
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
      `${(localBattleMetrics.duration_ms/1000).toFixed(1)} sn`);
    set("local-report-result",
      localBattleMetrics.won ? "Galibiyet" : "Mağlubiyet");
    set("local-report-credits",
      `${localBattleMetrics.credits_spent} Akım`);
    set("local-report-forfeit-penalty",
      `${localBattleMetrics.forfeit_credit_penalty || 0} Akım`);
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
        "Bu maç telemetriye kaydedildi. İlk sayısal denge kararı en az 3 gerçek manuel maçtan sonra incelenecek.";
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
    const match = String(text || "").trim().match(/^([+-]?)(\d+(?:[.,]\d+)?)(%)?\s+(.+)$/u);
    if (!match) return null;
    const sign = match[1] === "-" ? -1 : 1;
    const numeric = Number(match[2].replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    return {
      amount: sign * numeric,
      explicitSign: Boolean(match[1]),
      percent: Boolean(match[3]),
      suffix: match[4],
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
    return `${prefix}${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${unit} ${suffix}`;
  }

  function updateFloatingFeedbackImportance(chip, amount) {
    const magnitude = Math.abs(Number(amount || 0));
    const scale = Math.min(1.48, 0.88 + Math.log10(magnitude + 1) * 0.28);
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
      `${Math.max(0, Number(eventResult.lane || 0)) * 24}px`
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
        `${serverModule.name_tr || "Modül"} · ${text}`,
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

  function processLocalServerEvents(
    events,
    snapshot
  ) {
    for (const event of events || []) {
      const data=event.data || {};
      if (
        event?.type === "command_rejected"
        && data.player_id === participantPlayerId
      ) {
        logClientMessage(
          `Savaş komutu reddedildi: ${data.reason || "Bilinmeyen neden"}`
        );
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
          `Savaştan çekilme · ${penalty} Akım silindi`,
          "danger"
        );
        continue;
      }
      if (
        event?.type === "modules_swapped"
        && data.player_id === participantPlayerId
      ) {
        logClientMessage("İki aktif modül yer değiştirdi; portlar otomatik bağlandı.");
        triggerGridshardCue("port_connect");
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
      if (event?.type === "core_power_used") {
        const waveBoard = data.player_id === participantPlayerId ? board : enemyBoard;
        waveBoard?.classList.add("core-wave");
        window.setTimeout(() => waveBoard?.classList.remove("core-wave"), 850);
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          "ÇEKİRDEK GÜCÜ",
          data.power_id === "core_disruptor" ? "sabotage" : data.power_id === "core_overdrive" ? "boost" : data.power_id === "core_guardian" ? "shield" : "heal"
        );
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
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.module_id,
          `-${Math.max(0, Math.round(Number(data.damage || 0)))} CAN · DARBE`,
          "damage"
        );
        continue;
      }
      if (event?.type === "damage_reflected") {
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          `${Math.max(0, Math.round(Number(data.damage || 0)))} YANSITMA · YANSITICI`,
          "reflect"
        );
        continue;
      }
      if (event?.type === "module_repaired") {
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id || data.player_id,
          data.target_module_id,
          `+${Math.max(0, Math.round(Number(data.repair || 0)))} CAN · ONARIM`,
          "heal"
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
          reduced > 0 ? `-${reduced} ISI · SOĞUTUCU` : "ISI DÜŞTÜ · SOĞUTUCU",
          "cool"
        );
        continue;
      }
      if (event?.type === "module_overclocked") {
        emitServerModuleFeedback(
          snapshot,
          data.player_id,
          data.target_module_id,
          "+GÜÇ · GÜÇLENDİRİCİ",
          "boost"
        );
        continue;
      }
      if (event?.type === "attack_support_applied") {
        const supportBits = [];
        if (Number(data.damage_multiplier || 1) > 1) {
          supportBits.push(`+${Math.round((Number(data.damage_multiplier || 1) - 1) * 100)}% GÜÇ`);
        }
        if (Number(data.cooldown_multiplier || 1) < 1) {
          supportBits.push(`+${Math.round((1 - Number(data.cooldown_multiplier || 1)) * 100)}% HIZ`);
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
            `${supportBits.join(" · ")} · DESTEK`,
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
          boosterText = repair > 0 ? `+${repair} CAN · ACİL ONARIM` : "ACİL ONARIM";
        } else if (data.booster_id === "overcharge_chip") {
          boosterText = "+25% GÜÇ · AŞIRI YÜK";
        } else if (data.booster_id === "dual_port_adapter") {
          boosterText = "+1 PORT · ADAPTÖR";
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
        const sabotageLabels = {
          emp_disabled: "EMP · ENERJİ KESİLDİ",
          support_jammed: "SİNYAL BOZULDU",
          virus: "VİRÜS · SABOTAJ",
          energy_leech: "ENERJİ SÖMÜRÜSÜ",
          line_disrupted: "HAT KESİLDİ",
        };
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          sabotageLabels[data.effect_id] || "SABOTAJ",
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
          reductionSeconds > 0
            ? `-${reductionSeconds} sn SABOTAJ · SOĞUTUCU`
            : "SABOTAJ AZALDI · SOĞUTUCU",
          "sabotage"
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
          `${destroyedModule?.name_tr || "Modül"} devre dışı kaldı`,
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
      if (preventedDamage > 0) {
        emitServerModuleFeedback(
          snapshot,
          data.target_player_id,
          data.target_module_id,
          `${preventedDamage} ENGELLENDİ · ${defenseType === "shield" || defenseType === "kalkan" ? "KALKAN" : "SAVUNMA"}`,
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
      portCount:Number(
        enemyGenerator?.port_count || 4
      ),
      direction:
        enemyGenerator?.direction
        || "up",
      ports:Array.isArray(enemyGenerator?.ports)
        ? enemyGenerator.ports
        : undefined,
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
          portCount:Number(
            module.port_count || 1
          ),
          direction:
            module.direction
            || "up",
          ports:Array.isArray(module.ports)
            ? module.ports
            : undefined,
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
          direction:serverModule.direction || "up",
          portCount:Number(serverModule.port_count || 1),
          ports:Array.isArray(serverModule.ports) ? serverModule.ports : undefined,
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
      if (activeMatchModeEl) activeMatchModeEl.textContent=`Maç: Tek Oyunculu · ${label} AI`;
      if (matchmakingStatusEl) {
        matchmakingStatusEl.textContent=`Rakip: ${label} AI`;
        matchmakingStatusEl.dataset.status="local";
      }
      const battleMatchLabel=document.getElementById("battle-match-label");
      if (battleMatchLabel) battleMatchLabel.textContent=`${label} AI`;
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
        direction:
          serverModule.direction
          || "up",
        portCount:Number(
          serverModule.port_count || 1
        ),
        ports:Array.isArray(serverModule.ports)
          ? serverModule.ports
          : undefined,
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
      const response=await fetch(
        `/local-ai/sessions/${encodeURIComponent(localServerSessionId)}/snapshot`
        + `?player_id=${encodeURIComponent(participantPlayerId)}`
        + `&cursor=${localServerEventCursor}`
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
      const response=await fetch(
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
                direction:module.direction,
              })),
          }),
        }
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
        `${aiArchetypeName(activeLocalAiArchetype)} AI savaşı sunucu BattleEngine otoritesine bağlandı.`
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
      const response=await fetch(
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
        }
      );
      if (!response.ok) {
        const detail=await response
          .json()
          .catch(() => ({}));
        logClientMessage(
          detail.detail
          || "Sunucu savaş komutunu reddetti."
        );
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
            direction:initialSetup.direction,
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
        direction:initialConfig?.direction || "up",
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
    document.body.dataset.battleAuthority=
      "offline-fallback";

    localBattleStarted =
      true;
    document.body.dataset.localStatus =
      "battle";
    clearTapSelection({ rerender: false });
    mobileBattleController.reset();
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
      200;
    mockServerPassiveSeconds =
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
      circuitCredits:200,
    });
    client.clearPendingPlacements();
    client.updateElapsedMs(0);

    resetClientModulesForBattleStart();

    commandLog.length = 0;
    resetBattleResultPresentation();
    destructionFxPlayed.clear();
    snapshotModuleHp.clear();
    moduleAnchorRects.clear();
    for (const effectId of [...floatingFeedbackLive.keys()]) {
      removeFloatingFeedbackRecord(effectId);
    }
    battleEffectAggregator?.clear?.();
    setBattleLiveTicker(
      `${aiArchetypeName(selectedAiArchetype)} AI · Kalkan + Lazer başlangıcı`,
      "neutral"
    );

    document.body.dataset.localFinished =
      "false";

    activeLocalAiArchetype=selectedAiArchetype;
    const aiLabel=aiArchetypeName(activeLocalAiArchetype);
    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        `Maç: Tek Oyunculu · ${aiLabel} AI`;
    }
    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        "Savaş devam ediyor";
    }
    if (matchmakingStatusEl) {
      matchmakingStatusEl.textContent =
        `Rakip: ${aiLabel} AI`;
      matchmakingStatusEl.dataset.status =
        "local";
    }
    const battleMatchLabel=document.getElementById("battle-match-label");
    if (battleMatchLabel) battleMatchLabel.textContent=`${aiLabel} AI`;

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
    clearTapSelection({ rerender: false });
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
        `Savaş alanına giriş başarılı · 6/6 deste hazır · ${aiArchetypeName()} AI aktif`;
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
      "Beta.34 geliştirici testi: oyuncu kontrollü portlar, kesintisiz ses ve anlık dil geçişi aktif."
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
    if (
      !gridshardAudioDirector
      || activePlayMode !== "local"
      || !localBattleStarted
      || localBattleFinished
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

    if (
      ratio > 0
      && ratio <= .33
    ) {
      criticalCoreAudioRequested = true;
      requestOwnedAudioState("critical_core_entered");
      if (
        typeof gridshardAudioDirector
          .setBattlePressure
        === "function"
      ) {
        const hits=
          Number(
            localBattleMetrics?.ai_hits
            || 0
          );
        gridshardAudioDirector
          .setBattlePressure(
            Math.min(
              1,
              .35 + hits/18
            )
          );
      }
    } else if (criticalCoreAudioRequested) {
      criticalCoreAudioRequested = false;
      requestOwnedAudioState("critical_core_cleared");
    }
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

    playerCoreSummaryEl.textContent =
      `Sen: Çekirdek ${
        Math.max(
          0,
          Number(core?.hp || 0)
        )
      }/${core?.maxHp || 300}`;

    if (playerBoardStatusEl) {
      playerBoardStatusEl.textContent=
        `Çekirdek ${Math.max(0,Number(core?.hp||0))}/${core?.maxHp||300} · Enerji %${Math.round(Number(client.energyLoadRatio || 0) * 100)}`;
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

    if (finishReason !== "player_forfeit") {
      emitModuleExplosion(
        won ? "enemy-core" : "core-1",
        { core: true }
      );
    }

    if (battleResultSummaryEl) {
      battleResultSummaryEl.hidden =
        false;
      battleResultSummaryEl.textContent = localizedUiText(
        finishReason === "player_forfeit"
          ? `KAYBETTİN · Savaşı bıraktın · ${forfeitPenalty} Akım silindi`
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
        Number(mockServerPassiveSeconds || 0)
        * 10
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
      core ? 1650 : 980
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
      `-${damage} Can`,
      "damage",
      { core: target.instanceId === "core-1" }
    );
    setBattleLiveTicker(
      `${target.nameTr || "Modül"} · -${damage} Can`,
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
    maxHp
  ) {
    const bar=
      document.createElement(
        "span"
      );
    bar.className="hp-bar";

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
      quickLoadoutActiveSummaryEl
        .innerHTML=
          "<strong>Aktif loadout yok</strong>"
          + "<span>Hazır havuz seçtiğinde savaş öncesi özet burada görünecek.</span>";
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

    const favorite=
      preset?.favorite
        ? "★ Favori · "
        : "";
    const freshness=
      preset?.last_used_at_ms
        ? presetLastUsedLabel(
            preset.last_used_at_ms
          )
        : "Henüz kullanılmadı";

    quickLoadoutActiveSummaryEl
      .innerHTML=
        `<strong>${favorite}${activeBattlePoolPresetName}</strong>`
        + `<span>${selectedCount}/6 kart · ${clean ? "Kayıtla aynı" : "Değiştirildi"} · ${freshness}</span>`;
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
          ? `Aktif hazır havuz: ${activeBattlePoolPresetName}`
          : "Aktif hazır havuz: Yok";
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
        `Aktif: ${activeBattlePoolPresetName}`;
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
      return `${minutes} dk önce`;
    }

    const hours=
      Math.floor(
        minutes / 60
      );
    if (hours < 24) {
      return `${hours} sa önce`;
    }

    const days=
      Math.floor(
        hours / 24
      );
    return `${days} gün önce`;
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
      meta.textContent = `${preset.module_definition_ids.length} modül · ${count} kullanım`;
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
      meta.textContent=
        `${preset.module_definition_ids.length} modül · ${presetLastUsedLabel(preset.last_used_at_ms)}`;

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
        `${favoriteCount} favori · ${battlePoolPresets.length} kayıtlı havuz`;
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
      meta.textContent=
        `${preset.module_definition_ids.length} modül · ${presetLastUsedLabel(preset.last_used_at_ms)}`;

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
                `${preset.name} hızlı loadout olarak yüklendi. Savaş Havuzunu doğrulayıp maça geçebilirsin.`;
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
    presetSelectEl.innerHTML=
      '<option value="">Hazır havuz seç...</option>';

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
        + `${preset.name} · ${preset.module_definition_ids.length}`;
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
      const response=await fetch(
        `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`
      );
      if (!response.ok) {
        throw new Error(
          "Hazır havuzlar alınamadı."
        );
      }
      const payload=await response.json();
      battlePoolPresets=
        withStarterBattlePoolPresets(payload.presets);
      renderPresetOptions();

      if (presetStatusEl) {
        presetStatusEl.textContent=
          battlePoolPresets.length
            ? `${battlePoolPresets.length} hazır havuz kayıtlı`
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
        let detail="";
        try {
          detail=String(
            (await response.json())
              ?.detail || ""
          );
        } catch (_error) {
          // Non-JSON server errors use the generic message below.
        }
        throw new Error(
          detail
          || "Sunucu kaydı kabul etmedi."
        );
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
        presetStatusEl.textContent=
          `${savedName} kaydedildi.`;
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
          `Hazır havuz kaydedilemedi: ${reason}`;
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

    await updateBattlePoolPresetMeta(
      name,
      {
        markUsed:true,
      }
    );

    renderBattlePoolSelection();
    renderPresetOptions();
    if (presetStatusEl) {
      presetStatusEl.textContent=
        `${name} yüklendi; istersen modülleri değiştirebilirsin.`;
    }
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
      presetStatusEl.textContent=
        `${name} silindi.`;
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
        `${oldName} → ${newName} olarak değiştirildi.`;
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
        poolCatalogSourceEl.textContent =
          "Sunucu kataloğu yüklenemedi; temel modül bilgileri gösteriliyor. Sayısal savaş etkileri doğrulanamadı.";
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

    return (
      `${module.strategicRole}. `
      + `Canı ${module.maxHp}, savaş içi yerleştirme maliyeti `
      + `${module.circuitCreditCost} Akım'dır.`
    );
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
    poolDetailCostEl.textContent =
      `${catalog?.circuit_credit_cost ?? module.circuitCreditCost} Akım`;
    if (poolDetailPortsEl) poolDetailPortsEl.textContent = "0";

    renderBattlePoolModulePreview(
      module,
      catalog
    );

    setTextOrDash(
      poolDetailEnergyGenerationEl,
      catalog
        ? `${catalog.energy_generation || 0}/${localizedUiText("sn")}`
        : localizedUiText("Sunucu kataloğu bekleniyor")
    );
    setTextOrDash(
      poolDetailEnergyConsumptionEl,
      catalog
        ? `${catalog.energy_consumption || 0}/${localizedUiText("sn")}`
        : localizedUiText("Sunucu kataloğu bekleniyor")
    );
    setTextOrDash(
      poolDetailDamageEl,
      catalog
        ? (
            catalog.base_damage > 0
              ? `${catalog.base_damage}`
              : localizedUiText("Doğrudan hasar yok")
          )
        : localizedUiText("Sunucu kataloğu bekleniyor")
    );
    setTextOrDash(
      poolDetailCooldownEl,
      catalog
        ? (
            catalog.cooldown_ms > 0
              ? `${(catalog.cooldown_ms / 1000).toFixed(
                  catalog.cooldown_ms % 1000 === 0
                    ? 0
                    : 1
                )} sn`
              : localizedUiText("Bekleme yok")
          )
        : localizedUiText("Sunucu kataloğu bekleniyor")
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
          "Sayısal savaş etkileri sunucu kataloğu yüklendiğinde gösterilir.",
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
        : localizedUiText("Belirgin karşı üstünlük yok")
    );
    setTextOrDash(
      poolDetailWeakEl,
      catalog?.weak_against?.length
        ? catalog.weak_against.map(localizedUiText).join(", ")
        : localizedUiText("Belirgin zayıflık yok")
    );
    setTextOrDash(
      poolDetailSynergyEl,
      catalog?.synergy_with?.length
        ? catalog.synergy_with.map(localizedUiText).join(", ")
        : localizedUiText("Tanımlı özel sinerji yok")
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
    heading.textContent =
      `${title} · ${count}`;

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

  function localizedRewardDescription(value) {
    return String(value || "")
      .replace(/\blegendary\b/gi, "Efsanevi")
      .replace(/\bcommon\b/gi, "Yaygın")
      .replace(/\brare\b/gi, "Nadir")
      .replace(/\bepic\b/gi, "Epik");
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
      status.textContent = localizedUiText("Çekirdek ve Jeneratör sabit başlar");
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
              a.nameTr.localeCompare(
                b.nameTr,
                "tr"
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
            `${localizedUiText(module.nameTr)} · ${localizedUiText("Başlangıç devresi için zorunlu")}`;
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
                "Jeneratör zorunlu Savaş Havuzu modülüdür ve çıkarılamaz."
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
              a.nameTr.localeCompare(
                b.nameTr,
                "tr"
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
                "Jeneratör zorunlu Savaş Havuzu modülüdür ve çıkarılamaz."
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
      boosterStatusEl.textContent = localizedUiText(`${remainingSeconds} sn sonra açılır`);
    }
  }

  function poolPreviewPortDirections(portCount) {
    const count = Math.max(
      0,
      Math.min(4, Number(portCount || 0))
    );
    if (count === 1) return ["up"];
    if (count === 2) return ["up", "down"];
    if (count === 3) return ["up", "left", "right"];
    if (count === 4) return ["up", "right", "down", "left"];
    return [];
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
      `${localizedUiText(module.nameTr)} · ${localizedUiText("Modül önizlemesi")}`
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
        : `HAZIR · ${optionCount} seçenekten 1'ini seç`);
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
    boosterStatusEl.textContent = localizedUiText(`${Math.max(
      0,
      Math.ceil((boosterOfferDueAtMs(nextBoosterOfferIndex) - client.elapsedMs) / 1000)
    )} sn sonra açılır`);
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
      button.draggable = boosterOfferOpen && isOfferChoice;
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
      button.addEventListener("pointerdown", () => {
        if (pickBoosterForTargeting()) {
          boosterStatusEl.textContent = localizedUiText("Uygun, parlayan modüle bırak");
        }
      });
      button.addEventListener("dragstart", (event) => {
        if (!boosterOfferOpen || !isOfferChoice) {
          event.preventDefault();
          return;
        }
        selectBoosterTargetMode(booster.id, "booster_drag");
        event.dataTransfer?.setData(
          BOOSTER_DRAG_TYPE,
          booster.id
        );
        event.dataTransfer?.setData("text/plain", booster.id);
        event.dataTransfer.effectAllowed = "move";
        attachDragGhostPreview(event, {
          title: boosterEnglish ? booster.nameEn : booster.nameTr,
          subtitle: boosterEnglish ? booster.descriptionEn : booster.descriptionTr,
          accentClass: `drag-ghost-preview--${booster.id}`
        });
        boosterStatusEl.textContent = localizedUiText("Uygun, parlayan modüle bırak");
      });
      button.addEventListener("dragend", () => {
        clearDragGhostPreview();
        renderBoosterOptions();
        renderBoard();
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
    if (boosterId === "dual_port_adapter" && Number(module.portCount || 0) >= 4) {
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

  function draggedBoosterId(event) {
    const transfer = event?.dataTransfer;
    const transferTypes = Array.from(transfer?.types || []);
    if (!transfer || !transferTypes.includes(BOOSTER_DRAG_TYPE)) return "";
    const boosterId = transfer.getData(BOOSTER_DRAG_TYPE) || boosterTargetMode.selectedBoosterId || "";
    return BOOSTER_OPTIONS.some((booster) => booster.id === boosterId)
      ? boosterId
      : "";
  }

  function cancelBoosterTargeting(reason="cancelled") {
    if (!boosterTargetMode.selectedBoosterId) return;
    clearBoosterTargetMode(reason);
    document.querySelectorAll(
      ".module-card.booster-target, .module-card.booster-target-ineligible, .module-card.booster-drop-ready"
    ).forEach((card) => card.classList.remove(
      "booster-target",
      "booster-target-ineligible",
      "booster-drop-ready"
    ));
    if (boosterOfferOpen && boosterStatusEl) {
      boosterStatusEl.textContent = localizedUiText(
        `HAZIR · ${activeBoosterOfferIds.size || BOOSTER_OPTIONS_PER_OFFER} seçenekten 1'ini seç`
      );
    }
    renderBoosterOptions();
    return true;
  }

  function cancelBoosterTargetingForModuleDrag() {
    return cancelBoosterTargeting("module_drag");
  }

  function tryApplySelectedBooster(module) {
    if (!boosterTargetMode.selectedBoosterId) return false;
    const booster = BOOSTER_OPTIONS.find(item => item.id === boosterTargetMode.selectedBoosterId);
    if (!booster) return false;
    if (!isBoosterTargetEligible(module, booster.id)) {
      logClientMessage(`${booster.nameTr}, bu modülde etkili olmayacağı için hak korunarak reddedildi.`);
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

  function circuitModuleIdentity(module, fallback="module") {
    return String(
      module?.instanceId
      || module?.id
      || `${fallback}-${cablePositionKey(module?.position)}`
    );
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
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.classList.add(...className.split(" ").filter(Boolean));
    line.setAttribute("x1",String((first.x * 100) + 50));
    line.setAttribute("y1",String((first.y * 100) + 50));
    line.setAttribute("x2",String((second.x * 100) + 50));
    line.setAttribute("y2",String((second.y * 100) + 50));
    layer.appendChild(line);
    return line;
  }

  function circuitEnergyDistances(modules) {
    const active=modules.filter(
      (module) =>
        module?.position
        && module.status !== "destroyed"
        && Number(module.hp ?? 1) > 0
    );
    const distances=new Map();
    const queue=[];
    for (const module of active) {
      if ((module.nameTr || module.name) !== "Jeneratör") continue;
      const id=circuitModuleIdentity(module,"generator");
      distances.set(id,0);
      queue.push(module);
    }
    while (queue.length) {
      const current=queue.shift();
      const currentId=circuitModuleIdentity(current);
      for (const candidate of active) {
        const candidateId=circuitModuleIdentity(candidate);
        if (distances.has(candidateId)) continue;
        if (!areConnected(current,candidate)) continue;
        distances.set(candidateId,(distances.get(currentId) || 0) + 1);
        queue.push(candidate);
      }
    }
    return distances;
  }

  function renderBoardCables(boardElement, moduleIterable=[]) {
    const layer = ensureBoardCableLayer(boardElement);
    if (!layer) return;
    layer.replaceChildren();
    const modules = [...moduleIterable];
    const liveCore = modules.some(m => (m.definitionId === "core" || m.nameTr === "Çekirdek") && Number(m.hp) > 0);
    const cells = new Set(BOARD_CELLS.map(([x,y]) => `${x},${y}`));
    for (const [x,y] of BOARD_CELLS) {
      const first = {x,y};
      for (const {dx,dy} of CIRCUIT_CABLE_DIRECTIONS) {
        const second = {x:x+dx,y:y+dy};
        if (!cells.has(cablePositionKey(second))) continue;
        createCircuitCableLine(layer, first, second, "circuit-cable-base");
        if (liveCore) {
          const distance = p => Math.abs(p.x-2)+Math.abs(p.y-1);
          const outward = distance(first) <= distance(second);
          createCircuitCableLine(layer, outward ? first : second, outward ? second : first, "circuit-cable-current");
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
      portCount:4,
      ports:["up","right","down","left"],
      isPowered:mockEnemyCoreHp > 0,
    };
    const generator={
      instanceId:"enemy-generator",
      nameTr:"Jeneratör",
      hp:mockEnemyGeneratorHp,
      status:"active",
      position:{...mockEnemyGeneratorPosition},
      portCount:4,
      direction:mockEnemyGeneratorPower.direction || "up",
      ports:mockEnemyGeneratorPower.ports,
      isPowered:Boolean(mockEnemyGeneratorPower.isPowered),
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
        direction:module.direction || definition?.direction || "up",
        portCount:Number(module.portCount || definition?.portCount || 1),
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
        cell.title = `${special.label}: ${special.bonus}`;
        cell.dataset.specialLabel = localizedUiText(special.label);
        cell.dataset.specialBonus = special.bonus;
      } else {
        cell.dataset.cellLabel =
          localizedUiText(`Hücre ${x},${y}`);
      }

      cell.addEventListener("dragover", (event) => {
        if (
          localBattleFinished
          || cell.classList.contains("core-cell")
          || cell.dataset.debris === "true"
        ) return;
        event.preventDefault();
        cell.classList.add("drag-over");
      });

      cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));

      cell.addEventListener("drop", (event) => {
        if (
          localBattleFinished
          || cell.classList.contains("core-cell")
        ) return;
        event.preventDefault();
        cell.classList.remove("drag-over");

        const sourceModuleId = client.dragState?.moduleId;
        const sourceModule = sourceModuleId
          ? client.requireModule(sourceModuleId)
          : null;
        const rejection = cellPlacementRejection(cell, sourceModule);
        if (rejection) {
          logClientMessage(rejection);
          client.cancelDrag();
          return;
        }

        const targetCard = cell.querySelector(".module-card");
        const targetModuleId = targetCard?.dataset.moduleId || null;

        const result = client.dropOnCell(
          Number(cell.dataset.x),
          Number(cell.dataset.y),
          targetModuleId
        );

        if (!result.ok) logClientMessage(result.reason);
      });

      cell.addEventListener("click", () => {
        placeTapSelectionOnCell(cell);
      });

      cell.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (!tapSelectedModuleId) return;
        event.preventDefault();
        placeTapSelectionOnCell(cell);
      });

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
        port_disconnected:english
          ? "This module is not active in the Core energy network."
          : "Bu modül Çekirdek enerji ağında etkin değil.",
        insufficient_supply:english
          ? `Core energy demand: ${required.toFixed(1)} U, received: ${received.toFixed(1)} U.`
          : `Çekirdek enerji ihtiyacı: ${required.toFixed(1)} Ü, gelen: ${received.toFixed(1)} Ü.`,
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

    card.classList.add("energy-flowing");
    const badge=
      document.createElement("span");
    badge.className="energy-flow-badge";
    const energyValue=(
      received < 1
        ? received.toFixed(1)
        : received.toFixed(1).replace(/\.0$/u,"")
    );
    badge.textContent=localizedUiText(
      isSource
        ? `KAYNAK ${energyValue} Ü`
        : `AKIŞ ${energyValue} Ü`
    );
    card.appendChild(badge);
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

    const required = Number(moduleLike.energyRequired || 0);
    const powered = Boolean(moduleLike.isPowered);
    if (required > 0) {
      addBadge(
        powered ? "⚡" : "×",
        powered ? "powered" : "unpowered",
        powered ? "Enerji akışı aktif" : "Enerji bağlantısı yok"
      );
    }

    const heat = Number(moduleLike.heat || 0);
    if (heat >= 70) {
      addBadge(
        "♨",
        heat >= 100 ? "heat-critical" : "heat-high",
        `Isı ${Math.round(heat)}`
      );
    }

    const boosters = Array.isArray(moduleLike.temporaryBoosters)
      ? moduleLike.temporaryBoosters
      : [];
    if (boosters.length > 0) {
      addBadge(
        `✦${boosters.length > 1 ? boosters.length : ""}`,
        "boosted",
        `Aktif güçlendirici: ${boosters.join(", ")}`
      );
    }

    const debuffs = Array.isArray(moduleLike.debuffs)
      ? moduleLike.debuffs
      : [];
    if (debuffs.length > 0) {
      addBadge(
        `!${debuffs.length > 1 ? debuffs.length : ""}`,
        "debuffed",
        `Aktif olumsuz etki: ${debuffs.join(", ")}`
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
      `${name} · HP ${Math.max(0,Math.round(hp))}/${maxHp}`;
    const icon=document.createElement("span");
    icon.className="module-icon";
    icon.textContent=moduleIconFor({nameTr:name});
    icon.setAttribute("aria-label",name);
    card.appendChild(icon);
    const label=document.createElement("span");
    label.className="name";
    label.textContent=name;
    card.appendChild(label);
    appendHpBar(card,hp,maxHp);
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
      enemyBoardStatusEl.textContent=`Çekirdek ${Math.max(0,mockEnemyCoreHp)}/300`;
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
      return `${aiArchetypeName(activeLocalAiArchetype)} AI`;
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
        `${localizedUiText("Enkaz")}: ${seconds}`
      );
      const shards = document.createElement("span");
      shards.className = "cell-debris-shards";
      shards.setAttribute("aria-hidden", "true");
      const countdown = document.createElement("strong");
      countdown.textContent = `${seconds} sn`;
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
    renderBattlePoolSelection();
    renderBattlePoolDetail();
    renderBoosterOptions();
    renderProfileSummary();
    renderPostMatchSummary();
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

    renderSettingsSaveStatus(
      "Kaydediliyor...",
      "saving"
    );

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
        });

    renderSettingsForm();
    renderRemoteDataStatus();

    if (!result.ok) {
      renderSettingsSaveStatus(
        result.reason
        || "Ayarlar kaydedilemedi.",
        "error"
      );
      logClientMessage(
        result.reason
      );
    } else {
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

    const progression =
      progressionState.viewModel();

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

    const ratingText =
      progression
        ? (
            progression.rankedEligible
              ? (
                  `${progression.ratingDelta >= 0 ? "+" : ""}`
                  + `${progression.ratingDelta} DP`
                )
              : localizedUiText("Derece puanı değişmedi")
          )
        : localizedUiText("DP hesaplanıyor");

    const xpText =
      progression
        ? `+${progression.xpAwarded} XP`
        : localizedUiText("XP hesaplanıyor");

    const ownResult =
      result.result_summary?.[pvpState.playerId]
      || {};
    const viewerForfeited =
      result.finish_reason === "player_forfeit"
      && result.loser_player_id === pvpState.playerId;
    const penaltyText = viewerForfeited
      ? ` · ${Math.max(
          0,
          Number(
            ownResult.forfeit_credit_penalty
            || 0
          )
        )} Akım silindi`
      : "";

    resultEl.hidden = false;
    resultEl.textContent = localizedUiText(
      `${progression?.matchLabelTr || "Maç"} · ${finishReasonLabel(result.finish_reason)}${penaltyText} · ${ratingText} · ${xpText}`
    );
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
      `Web Test Kimliği: ${shortId}`;
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

    el.textContent = localizedUiText(
      `${view.displayName} · `
      + `Seviye ${view.level} · `
      + `${view.leagueNameTr} · `
      + `${view.rating} Derece Puanı · `
      + `${view.experience} XP`
    );

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
      lobbyPlayerDetails.textContent= localizedUiText(
        `${view.engagement?.equipped_title || "Devre Çırağı"} · Seviye ${view.level} · 🏆 ${view.rating}`
      );
    }

    renderEngagementSummary(view.engagement);
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

    setText("season-flux-shards", engagement.flux_shards || 0);
    setText("season-equipped-title", engagement.equipped_title || "Devre Çırağı");
    setText(
      "season-tier-label",
      `Kademe ${engagement.current_tier || 0} / ${engagement.max_tier || 10}`
    );
    setText("season-progress-copy", `${progress} / ${required} Sezon XP`);
    setText("lobby-season-tier", `Kademe ${engagement.current_tier || 0} / ${engagement.max_tier || 10}`);
    setText("lobby-season-progress-copy", `${progress} / ${required} SXP`);
    setText("lobby-flux-shards", engagement.flux_shards || 0);

    const missionList = engagement.dailyMissions || [];
    const claimableMissions = missionList.filter(
      (mission) => mission.completed && !mission.claimed
    ).length;
    const activeMissions = missionList.filter((mission) => !mission.claimed).length;
    setText(
      "lobby-daily-summary",
      claimableMissions > 0
        ? `${claimableMissions} ödül alınmaya hazır`
        : `${activeMissions} devre emri aktif`
    );
    setText(
      "daily-mission-page-summary",
      claimableMissions > 0
        ? `${claimableMissions} ödül alınmaya hazır`
        : `${activeMissions} görev aktif`
    );
    const dailyNotification = document.getElementById("lobby-daily-notification");
    if (dailyNotification) dailyNotification.hidden = claimableMissions === 0;
    const rewardList = engagement.rewardTrack || [];
    const claimableRewards = rewardList.filter(
      (reward) => reward.claimable && !reward.claimed
    ).length;
    setText(
      "lobby-reward-summary",
      claimableRewards > 0
        ? `${claimableRewards} kademe ödülü hazır`
        : `${engagement.max_tier || 10} ücretsiz kademe`
    );
    const rewardNotification = document.getElementById("lobby-reward-notification");
    if (rewardNotification) rewardNotification.hidden = claimableRewards === 0;

    const progressTrack = document.querySelector(".season-progress-track");
    const progressFill = document.getElementById("season-progress-fill");
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(percentage));
    if (progressFill) progressFill.style.width = `${percentage}%`;
    const lobbyProgressTrack = document.querySelector(".lobby-season-track");
    const lobbyProgressFill = document.getElementById("lobby-season-progress-fill");
    if (lobbyProgressTrack) lobbyProgressTrack.setAttribute("aria-valuenow", String(percentage));
    if (lobbyProgressFill) lobbyProgressFill.style.width = `${percentage}%`;

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
        name.textContent = mission.name_tr;
        const description = document.createElement("span");
        description.textContent = mission.description_tr;
        const meter = document.createElement("small");
        meter.textContent = `${mission.progress} / ${mission.target} · +${mission.season_xp_reward} SXP · +${mission.flux_shard_reward} Akı`;
        copy.append(name, description, meter);
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.missionClaim = mission.id;
        action.disabled = !mission.completed || mission.claimed;
        action.textContent = mission.claimed
          ? "Alındı"
          : mission.completed
            ? "Ödülü Al"
            : "Devam Ediyor";
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
        card.dataset.state = reward.claimed
          ? "claimed"
          : reward.claimable
            ? "claimable"
            : "locked";
        const tier = document.createElement("span");
        tier.textContent = `KADEME ${reward.tier}`;
        const prize = document.createElement("strong");
        const prizeParts = [
          reward.title_tr,
          `+${reward.season_xp_reward || 0} SXP`,
          `+${reward.flux_shards} Akı`,
        ].filter(Boolean);
        prize.textContent = prizeParts.join(" · ");
        const requirement = document.createElement("small");
        requirement.textContent = `${reward.required_xp} SXP ile açılır`;
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.tierClaim = String(reward.tier);
        action.disabled = !reward.claimable;
        action.textContent = reward.claimed
          ? "Alındı"
          : reward.claimable
            ? "Al"
            : "Kilitli";
        card.append(tier, prize, requirement, action);
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
      `${localizedUiText(module.name_tr)} · devre kartı önizlemesi`
    );
    host.appendChild(card);
  }

  function laboratoryStatSummary(stats) {
    if (!stats) return "En yüksek kalibrasyon";
    const parts = [];
    if (Number(stats.base_damage) > 0) {
      parts.push(`Hasar ${Number(stats.base_damage).toFixed(1)}`);
    }
    if (Number(stats.energy_generation) > 0) {
      parts.push(`Üretim ${Number(stats.energy_generation).toFixed(1)}/sn`);
    }
    if (Number(stats.energy_consumption) > 0) {
      parts.push(`Tüketim ${Number(stats.energy_consumption).toFixed(1)}/sn`);
    }
    if (Number(stats.cooldown_ms) > 0) {
      parts.push(`Bekleme ${(Number(stats.cooldown_ms) / 1000).toFixed(1)} sn`);
    }
    parts.push(`Can ${Math.round(Number(stats.max_hp || 0))}`);
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
    setText("laboratory-invested-flux", `Yatırım ${view.invested_flux || 0}`);
    setText("lobby-flux-shards", view.flux_shards || 0);
    setText(
      "lobby-laboratory-summary",
      Number(view.calibrated_module_count || 0) > 0
        ? `${view.calibrated_module_count} modül kalibre edildi`
        : "Akı ile favori modüllerini kalibre et"
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
        heading.textContent = `${groupModules[0].category_label} · ${groupModules.length}`;
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
          name.textContent = module.name_tr;
          const level = document.createElement("small");
          level.textContent = `SV ${module.level} / ${module.max_level}`;
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
      setText("laboratory-detail-category", String(selected.category_label || "").toUpperCase());
      setText("laboratory-detail-name", selected.name_tr);
      setText("laboratory-detail-role", selected.strategic_role);
      setText("laboratory-detail-level", `SV ${selected.level} / ${selected.max_level}`);
      setText("laboratory-detail-effect", selected.experimental_effect_tr);
      setText(
        "laboratory-current-efficiency",
        `%${selected.current_stats?.efficiency_bonus_percent || 0}`
      );
      setText("laboratory-current-stats", laboratoryStatSummary(selected.current_stats));
      setText(
        "laboratory-next-efficiency",
        selected.next_stats
          ? `%${selected.next_stats.efficiency_bonus_percent}`
          : "MAKS"
      );
      setText("laboratory-next-stats", laboratoryStatSummary(selected.next_stats));
      const upgrade = document.getElementById("laboratory-upgrade-button");
      if (upgrade) {
        upgrade.dataset.moduleId = selected.id;
        upgrade.disabled = !selected.can_upgrade;
        upgrade.textContent = selected.next_cost == null
          ? "En Yüksek Kalibrasyon"
          : selected.can_upgrade
            ? `${selected.next_cost} Akı ile Kalibre Et`
            : `${selected.next_cost} Akı Gerekli`;
      }
    }

    const history = document.getElementById("laboratory-transaction-list");
    if (history) {
      history.replaceChildren();
      const transactions = Array.isArray(view.transactions) ? view.transactions : [];
      if (!transactions.length) {
        const empty = document.createElement("p");
        empty.className = "laboratory-empty-state";
        empty.textContent = "Henüz laboratuvar işlemi yok.";
        history.appendChild(empty);
      } else {
        for (const transaction of transactions) {
          const item = document.createElement("article");
          item.dataset.kind = transaction.kind;
          const copy = document.createElement("span");
          const title = document.createElement("strong");
          title.textContent = transaction.kind === "free_beta_reset"
            ? "Ücretsiz Beta Sıfırlaması"
            : `${transaction.module_name_tr} · SV ${transaction.level}`;
          const date = document.createElement("small");
          date.textContent = new Date(transaction.created_at).toLocaleString(
            document.documentElement.lang === "en" ? "en-US" : "tr-TR"
          );
          copy.append(title, date);
          const amount = document.createElement("strong");
          amount.textContent = `${transaction.flux_delta > 0 ? "+" : ""}${transaction.flux_delta} Akı`;
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
    if (status) status.textContent = "Kalibrasyon sunucuda doğrulanıyor…";
    const result = await accountDataLoader.upgradeLaboratoryModule(
      moduleId,
      laboratoryRequestId("upgrade")
    );
    renderLaboratory();
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok
        ? "Kalibrasyon tamamlandı ve Akı işlemi kalıcı olarak kaydedildi."
        : (result.reason || "Kalibrasyon tamamlanamadı.");
      status.dataset.status = result.ok ? "success" : "error";
    }
  }

  async function resetLaboratorySelection() {
    const reset = document.getElementById("laboratory-reset-button");
    const status = document.getElementById("laboratory-action-status");
    if (reset?.disabled) return;
    reset.disabled = true;
    if (status) status.textContent = "Akı iadesi sunucuda doğrulanıyor…";
    const result = await accountDataLoader.resetLaboratory(
      laboratoryRequestId("reset")
    );
    renderLaboratory();
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok
        ? `${result.payload.receipt.refund} Akı iade edildi; kalibrasyonlar sıfırlandı.`
        : (result.reason || "Laboratuvar sıfırlanamadı.");
      status.dataset.status = result.ok ? "success" : "error";
    }
  }

  async function claimEngagementReward(kind, id, button) {
    const status = document.getElementById(
      kind === "missions" ? "daily-action-status" : "season-action-status"
    );
    if (button) button.disabled = true;
    if (status) status.textContent = "Ödül sunucuda doğrulanıyor…";
    const result = await accountDataLoader.claimEngagementReward(kind, id);
    if (result.ok) {
      presentTierCelebration(result.payload?.tier_advanced);
    }
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok
        ? "Ödül alındı ve profil hesabına kaydedildi."
        : (result.reason || "Ödül alınamadı.");
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

    const result =
      await accountDataLoader
        .saveDisplayName(
          input?.value
        );

    if (status) {
      status.textContent =
        result.ok
          ? "Görünen ad kaydedildi"
          : (
              result.reason
              || "Görünen ad kaydedilemedi"
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
    const entries = [["Kupa / En yüksek", `${stats.current_trophies} / ${stats.highest_trophies}`], ["Arena / Lig", stats.rank], ["En uzun galibiyet serisi", stats.longest_streak || 0], ["Maç başı yerleştirme", ((stats.deployments || 0)/matches).toFixed(1)], ["Toplam / Ortalama Akım", `${stats.current_spent || 0} / ${((stats.current_spent || 0)/matches).toFixed(1)}`], ["Çekirdek gücü kullanımı", stats.core_power_uses || 0], ["En yüksek maç hasarı", stats.peak_damage || 0], ["Açılan modül", `${stats.unlocked_modules} / 36`], ["Yükseltilen modül", stats.upgraded_modules], ["En yüksek modül seviyesi", stats.highest_module_level], ["Açılan çekirdek", `${stats.unlocked_cores} / 7`], ["Açılan sandık", stats.opened_chests]];
    for (const [id, count] of Object.entries(stats.cores || {})) entries.push([metaProgressionState.cores?.types.find(c => c.id === id)?.name_tr || id, `%${Math.round(count / matches * 100)}`]);
    for (const [i, deck] of (stats.most_used_decks || []).entries()) entries.push([`${i+1}. En çok kullanılan deste · ${deck.matches} maç`, deck.module_ids.map(id => moduleDefinitions.find(m => m.definitionId === id)?.nameTr || id).join(" · ")]);
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

    el.textContent =
      `Maç ${view.totalMatches} · `
      + `Galibiyet ${view.wins} · `
      + `Mağlubiyet ${view.losses} · `
      + `Beraberlik ${view.draws} · `
      + `Galibiyet %${view.winRatePercent}`;

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
        return `${seconds} ${localizedUiText("sn")}`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return `${minutes} ${localizedUiText("dk")} ${remainder} ${localizedUiText("sn")}`;
    };
    const setValue = (id, value) => {
      const target = document.getElementById(id);
      if (target) target.textContent = String(value);
    };

    setValue("statistics-total-matches", number(view.totalMatches));
    setValue(
      "statistics-record",
      `${number(view.wins)}G · ${number(view.losses)}M · ${number(view.draws)}B`
    );
    setValue("statistics-win-rate", `%${number(view.winRatePercent)}`);
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

    const moduleList = document.getElementById(
      "statistics-most-used-modules"
    );
    if (!moduleList) return;
    moduleList.replaceChildren();

    const usage = Array.isArray(view.mostUsedModules)
      ? view.mostUsedModules
          .filter((item) => !["core", "generator"].includes(
            String(item?.definition_id || "")
          ))
          .slice(0, 8)
      : [];
    if (!usage.length) {
      const empty = document.createElement("p");
      empty.className = "statistics-empty-state";
      empty.textContent = localizedUiText(
        "Henüz tamamlanmış maç verisi yok."
      );
      moduleList.appendChild(empty);
      return;
    }

    for (const item of usage) {
      const definitionId = String(item.definition_id || "");
      const module = moduleDefinitions.find((candidate) =>
        candidate.instanceId
          .replace(/-1$/u, "")
          .replace(/-/gu, "_") === definitionId
      );
      const card = document.createElement("article");
      card.className = "statistics-module-card";
      if (module?.category) card.dataset.category = module.category;

      const icon = document.createElement("span");
      icon.className = "statistics-module-icon";
      icon.textContent = moduleIconFor(module || null);

      const copy = document.createElement("span");
      copy.className = "statistics-module-copy";
      const name = document.createElement("strong");
      name.textContent = localizedUiText(
        module?.nameTr || definitionId || "Modül"
      );
      const count = document.createElement("small");
      count.textContent = `${number(item.matches_used)} ${localizedUiText("maçta kullanıldı")}`;
      copy.append(name, count);
      card.append(icon, copy);
      moduleList.appendChild(card);
    }
  }

  function render() {
    renderShelf();
    renderBoard();
    renderLockState();
    updateMobilePlacementControls();
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

  function deployDeckModule(module) {
    const result = client.deployDefinition(
      module.definitionId || clientDefinitionId(module.instanceId),
      module.circuitCreditCost
    );
    if (!result.ok) {
      logClientMessage(result.reason);
      if (String(result.reason).includes("Akım")) {
        flashInsufficientCredits();
      }
      renderShelf();
      return false;
    }
    trackBattleUiInteraction("deploy_module", "module_place");
    logClientMessage(
      `${localizedUiText(module.nameTr)} için sunucu uygun hücreyi seçiyor.`
    );
    renderShelf();
    return true;
  }

  function createDeckModuleCard(module, enabled) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "module-card deck-module-card";
    card.dataset.moduleId = module.instanceId;
    card.dataset.category = module.category || "";
    card.disabled = !enabled;
    card.setAttribute("aria-disabled", String(!enabled));
    card.title = enabled
      ? `${localizedUiText(module.nameTr)} · ${module.circuitCreditCost} Akım · Tıkla ve yerleştir`
      : `${localizedUiText(module.nameTr)} · ${module.circuitCreditCost} Akım · Yetersiz Akım veya devre dolu`;

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
    cost.textContent = `${module.circuitCreditCost} Akım`;
    stats.append(cost);
    card.append(icon, name, stats);
    const currentBadge = document.createElement("span");
    currentBadge.className = "current-cost-badge";
    currentBadge.textContent = `ϟ ${module.circuitCreditCost}`;
    card.appendChild(currentBadge);
    appendHpBar(card, module.maxHp, module.maxHp);
    card.addEventListener("click", () => deployDeckModule(module));
    return card;
  }

  function renderShelf() {
    const placement = modulePlacementSlotState();
    const deckModules = battlePoolSelection.selectedIds().map(id => client.modules.get(id)).filter(Boolean);
    const discounted = Number(client.currentDiscountRemaining || 0) > 0;
    const costFor = m => Math.max(1, Number(m.currentCost ?? m.circuitCreditCost) - (discounted ? 1 : 0));
    const signature = JSON.stringify([placement.ready, client.circuitCredits, discounted, deckModules.map(m => m.instanceId)]);
    if (signature === renderedShelfSignature) return;
    renderedShelfSignature = signature;
    shelf.replaceChildren();
    const anyAffordable = placement.ready && deckModules.some(m => costFor(m) <= client.circuitCredits);
    shelf.dataset.placementReady = String(anyAffordable);
    shelf.setAttribute("aria-disabled", String(!anyAffordable));
    for (const module of deckModules) {
      const cost = costFor(module);
      const enabled = placement.ready && client.circuitCredits >= cost;
      const card = createDeckModuleCard(module, enabled);
      card.title = `${localizedUiText(module.nameTr)} · ${cost} Akım`;
      const badge = card.querySelector(".current-cost-badge");
      if (badge) badge.textContent = `ϟ ${cost}`;
      if (!enabled) card.classList.add("locked", "placement-locked");
      shelf.appendChild(card);
    }
    shelf.ondragover = null;
    shelf.ondrop = null;
  }

  function renderBoard(
    { force=false }={}
  ) {
    if (
      !force
      && client.dragState
    ) {
      return;
    }
    const boardSignature = JSON.stringify({
      selectedModuleId:tapSelectedModuleId,
      battleFinished:localBattleFinished,
      selectedBoosterId:boosterTargetMode.selectedBoosterId,
      corePowerTargeting,
      cellDebris:playerCellDebris,
      modules:[...client.modules.values()].map(module => ({
        id:module.instanceId,
        status:module.status,
        position:module.position,
        direction:module.direction,
        ports:module.ports,
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
        selectedModuleId: tapSelectedModuleId,
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

  function clearDragGhostPreview() {
    if (activeDragGhostPreview?.isConnected) {
      activeDragGhostPreview.remove();
    }
    activeDragGhostPreview = null;
  }

  function attachDragGhostPreview(
    event,
    { title = "", subtitle = "", accentClass = "" } = {}
  ) {
    const transfer = event.dataTransfer;
    if (!transfer) return;
    clearDragGhostPreview();
    const ghost = document.createElement("div");
    ghost.className = `drag-ghost-preview ${accentClass}`.trim();
    const heading = document.createElement("strong");
    heading.textContent = title;
    const detail = document.createElement("span");
    detail.textContent = subtitle;
    ghost.append(heading, detail);
    ghost.style.position = "fixed";
    ghost.style.left = "-9999px";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    activeDragGhostPreview = ghost;
    const rect = ghost.getBoundingClientRect();
    transfer.setDragImage(
      ghost,
      Math.max(16, Math.round(rect.width / 2)),
      Math.max(16, Math.round(rect.height / 2))
    );
    window.setTimeout(clearDragGhostPreview, 0);
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
    card.draggable = false;
    card.dataset.moduleId =
      module.instanceId;
    card.dataset.category =
      module.category || "";
    card.dataset.rotatable =
      String(
        module.status === "active"
        && module.rotatable !== false
      );
    card.setAttribute(
      "aria-pressed",
      String(tapSelectedModuleId === module.instanceId)
    );
    if (tapSelectedModuleId === module.instanceId) {
      card.classList.add("tap-selected");
    }
    if (module.movable !== false) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
    }
    if (module.nameTr === "Çekirdek" && corePowerTargeting) {
      card.classList.add("core-power-target");
      card.tabIndex=0;
      card.setAttribute("role","button");
      card.title="Çekirdek Rezonansını kullan";
    }

    if (
      module.movable === false
    ) {
      card.classList.add(
        "fixed-module"
      );
      card.title =
        `${module.nameTr} sabit başlangıç modülüdür.`;
    } else {
      card.title =
        module.strategicRole
        || module.nameTr;
      if (
        module.status === "active"
        && module.rotatable !== false
      ) {
        card.title +=
          " · Port yönünü saat yönünde çevirmek için tıkla";
      }
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
      module.nameTr
    );

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = module.nameTr;

    const stats =
      document.createElement("span");
    stats.className =
      "module-stats";

    const hp =
      document.createElement("span");
    hp.className =
      "module-stat hp";
    hp.textContent =
      `HP ${module.hp}/${module.maxHp}`;
    stats.appendChild(hp);

    if (
      module.status === "reserve"
      && module.circuitCreditCost > 0
    ) {
      const cost =
        document.createElement("span");
      cost.className =
        "module-stat credit";
      cost.textContent =
        `${module.circuitCreditCost} DK`;
      stats.appendChild(cost);
    }

    if (module.status === "active") {
      const power =
        document.createElement("span");
      power.className =
        "module-stat energy";
      power.textContent =
        Number(module.energyRequired || 0) > 0
          ? (
              `E ${Number(module.energyReceived || 0).toFixed(0)}`
              + `/${Number(module.energyRequired || 0).toFixed(0)}`
            )
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
      module.maxHp
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
            module.nameTr === "Jeneratör",
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

    card.addEventListener("dragover", (event) => {
      const boosterId = draggedBoosterId(event);
      if (!boosterId) return;
      if (boosterId !== boosterTargetMode.selectedBoosterId) {
        selectBoosterTargetMode(boosterId, "booster_drag_over");
      }
      event.preventDefault();
      event.stopPropagation();
      if (isBoosterTargetEligible(module, boosterId)) {
        card.classList.add("booster-drop-ready");
      }
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("booster-drop-ready");
    });
    card.addEventListener("drop", (event) => {
      const boosterId = draggedBoosterId(event);
      if (!boosterId) return;
      selectBoosterTargetMode(boosterId, "booster_drop");
      event.preventDefault();
      event.stopPropagation();
      card.classList.remove("booster-drop-ready");
      tryApplySelectedBooster(module);
    });

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
          selectModuleForTap(module);
          return;
        }
        if (
          localBattleFinished
        ) {
          logClientMessage(
            "Maç bittikten sonra port yönleri değiştirilemez."
          );
          return;
        }
        if (
          module.status
          !== "active"
          || module.rotatable
            === false
        ) {
          return;
        }
        if (!client.isShelfUnlocked()) {
          logClientMessage(
            "Port dönüşü 15. saniyede açılır."
          );
          return;
        }
        if (
          isTapPlacementUi()
          && tapSelectedModuleId
            !== module.instanceId
        ) {
          selectModuleForTap(module);
          return;
        }
        client.emitCommand({
          kind:"rotate_module",
          payload:{
            module_id:
              module.instanceId,
          },
        });
        trackBattleUiInteraction(
          "tap_rotate_module",
          "module_move"
        );
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

    card.addEventListener(
      "dragstart",
      (event) => {
        cancelBoosterTargetingForModuleDrag();
        if (tapSelectedModuleId) {
          clearTapSelection({ rerender: false });
        }
        if (localBattleFinished) {
          event.preventDefault();
          logClientMessage(
            "Maç bittikten sonra modüller hareket ettirilemez."
          );
          return;
        }
        if (module.status === "reserve" && !modulePlacementSlotState().ready) {
          event.preventDefault();
          logClientMessage("Yeni modül yerleştirme hakkı için geri sayımı bekleyin.");
          return;
        }
        const result =
          client.beginDrag(
            module.instanceId
          );
        if (!result.ok) {
          event.preventDefault();
          logClientMessage(
            result.reason
          );
          return;
        }

        if (
          module.status
          === "reserve"
        ) {
          telemetryDispatcher
            .trackModuleShelfUsed({
              module_id:
                module.instanceId,
              elapsed_ms:
                client.elapsedMs,
            });
        }

        event.dataTransfer
          .effectAllowed =
          "move";
        event.dataTransfer
          .setData(
            "text/plain",
            module.instanceId
          );
        attachDragGhostPreview(event, {
          title: module.nameTr,
          subtitle: module.status === "reserve"
            ? `${localizedUiText("Akım")}: ${module.circuitCreditCost}`
            : `${localizedUiText("Can")}: ${module.hp}/${module.maxHp}`,
          accentClass: `drag-ghost-preview--module drag-ghost-preview--${module.category || "neutral"}`
        });
      }
    );

    card.addEventListener(
      "dragend",
      () => {
        clearDragGhostPreview();
        client.cancelDrag();
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
    } else if (command.kind === "rotate_module") {
      cost = 0;
    }

    if (mockServerCredits < cost) {
      logClientMessage(
        `Yetersiz Akım: gerekli ${cost}, mevcut ${mockServerCredits}.`
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
      } else if (
        command.kind
        === "rotate_module"
      ) {
        trackBattleUiInteraction(
          command.kind,
          "module_move"
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
        if (key === "2,2" || occupied.has(key)) return false;
        const special = SPECIAL_CELL_INFO[key];
        if (special?.definitionId && special.definitionId !== deployTemplate.definitionId) return false;
        if (special?.category && special.category !== deployTemplate.category) return false;
        const cell = board.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        return cell?.dataset.debris !== "true";
      });
      const validPlacements = [];
      for (const [x, y] of candidates) {
        for (const direction of ["up", "right", "down", "left"]) {
          const probe = {
            ...deployTemplate,
            instanceId:"mock-deployment-probe",
            status:"active",
            position:{x, y},
            direction,
          };
          const active = [...client.modules.values()]
            .filter((module) => module.status === "active")
            .concat(probe);
          if (connectedEnergyModuleIds(active).has(probe.instanceId)) {
            validPlacements.push({x, y, direction});
          }
        }
      }
      const selected = validPlacements.length
        ? validPlacements[Math.floor(Math.random() * validPlacements.length)]
        : null;
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
        direction:selected.direction,
        hp:deployTemplate.maxHp,
      });
      client.clearPendingPlacements();
      triggerGridshardCue("port_connect");
    } else if (command.kind === "place_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "active",
        position: { x: command.payload.x, y: command.payload.y },
      });
      triggerGridshardCue(
        "port_connect"
      );
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
        ports:undefined,
        isPowered:false,
      });
      client.applyServerModuleState({
        instanceId:second.instanceId,
        position:firstPosition,
        ports:undefined,
        isPowered:false,
      });
      autoOrientMockSwap(first, second);
      if (localBattleMetrics) {
        localBattleMetrics.module_changes += 1;
      }
      triggerGridshardCue("port_connect");
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
    } else if (
      command.kind
      === "rotate_module"
    ) {
      const module=
        client.requireModule(
          command.payload.module_id
        );
      if (
        module.rotatable
        === false
      ) {
        logClientMessage(
          `${module.nameTr} döndürülemez.`
        );
        return;
      }
      client.applyServerModuleState({
        instanceId:
          module.instanceId,
        direction:
          RIGHT_OF[
            module.direction
            || "up"
          ],
      });
      if (localBattleMetrics) {
        localBattleMetrics
          .module_changes += 1;
      }
      triggerGridshardCue(
        "port_connect"
      );
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
    const passiveSeconds = Math.floor(elapsedMs / 1000);
    if (passiveSeconds <= mockServerPassiveSeconds) return;

    const gainedSeconds = passiveSeconds - mockServerPassiveSeconds;
    mockServerCredits += gainedSeconds * 10;
    mockServerPassiveSeconds = passiveSeconds;
    client.applyServerEconomyState({ circuitCredits: mockServerCredits });
  }

  function modulePorts(module) {
    if (
      Array.isArray(module.ports)
      && module.ports.length > 0
    ) {
      return [...module.ports];
    }
    if (module.nameTr === "Çekirdek") {
      return ["up","right","down","left"];
    }

    const count = module.portCount || 1;

    const forward =
      module.nameTr === "Jeneratör" && module.position
        ? (
            module.position.x === 2 && module.position.y === 3 ? "up" :
            module.position.x === 2 && module.position.y === 1 ? "down" :
            module.position.x === 1 && module.position.y === 2 ? "right" :
            module.position.x === 3 && module.position.y === 2 ? "left" :
            module.direction
          )
        : module.direction;

    if (count === 1) return [forward];
    if (count === 2) return [forward, OPPOSITE[forward]];
    if (count === 3) {
      return [
        forward,
        LEFT_OF[forward],
        RIGHT_OF[forward],
      ];
    }

    return ["up","right","down","left"];
  }

  function areConnected(first, second) {
    if (!first.position || !second.position) {
      return false;
    }

    const dx = second.position.x - first.position.x;
    const dy = second.position.y - first.position.y;

    const direction =
      dx === 0 && dy === -1 ? "up" :
      dx === 1 && dy === 0 ? "right" :
      dx === 0 && dy === 1 ? "down" :
      dx === -1 && dy === 0 ? "left" :
      null;

    if (!direction) return false;

    return (
      modulePorts(first).includes(direction) &&
      modulePorts(second).includes(OPPOSITE[direction])
    );
  }

  function connectedEnergyModuleIds(active) {
    const sources = active.filter(
      (module) => module.nameTr === "Jeneratör"
    );
    const reachable = new Set(
      sources.map((module) => module.instanceId)
    );
    const queue = [...sources];

    while (queue.length) {
      const current = queue.shift();

      for (const candidate of active) {
        if (reachable.has(candidate.instanceId)) continue;
        if (!areConnected(current, candidate)) continue;

        reachable.add(candidate.instanceId);
        queue.push(candidate);
      }
    }

    return reachable;
  }

  function autoOrientMockSwap(first, second) {
    const directions = ["up","right","down","left"];
    const active = [...client.modules.values()].filter(
      (module) => module.status === "active"
    );
    const originalFirst = first.direction || "up";
    const originalSecond = second.direction || "up";
    let best = null;

    for (const firstDirection of directions) {
      first.direction = firstDirection;
      for (const secondDirection of directions) {
        second.direction = secondDirection;
        const reachable = connectedEnergyModuleIds(active);
        if (
          !reachable.has(first.instanceId)
          || !reachable.has(second.instanceId)
        ) {
          continue;
        }
        let connectionCount = 0;
        for (let index = 0; index < active.length; index += 1) {
          for (let other = index + 1; other < active.length; other += 1) {
            if (areConnected(active[index], active[other])) {
              connectionCount += 1;
            }
          }
        }
        const score = [
          reachable.size,
          connectionCount,
          Number(firstDirection === originalFirst)
            + Number(secondDirection === originalSecond),
        ];
        if (
          !best
          || score.some((value, index) =>
            value > best.score[index]
            && score.slice(0, index).every(
              (prefix, prefixIndex) => prefix === best.score[prefixIndex]
            )
          )
        ) {
          best = {score, firstDirection, secondDirection};
        }
      }
    }

    first.direction = best?.firstDirection || originalFirst;
    second.direction = best?.secondDirection || originalSecond;
    first.ports = undefined;
    second.ports = undefined;
  }

  function updateMockEnergy() {
    const active = [...client.modules.values()].filter(
      (module) => module.status === "active"
    );
    const connected = connectedEnergyModuleIds(active);

    const generated =
      active.filter(
        (module) =>
          module.nameTr === "Jeneratör" &&
          connected.has(module.instanceId)
      ).length * 11;

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
      `Enerji: ${generated.toFixed(1)} Ü / ${totalDemand.toFixed(1)} T`;
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
    if (heat >= 100) return `KRİTİK ISI ${heat.toFixed(0)}`;
    if (heat >= 70) return `YÜKSEK ISI ${heat.toFixed(0)}`;
    return `Isı ${heat.toFixed(0)}`;
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
        `-${finalDamage} Can`,
        "damage",
        { core: targetDomId === "enemy-core" }
      );
      setBattleLiveTicker(
        `${attacker.nameTr} → ${targetName} · ${finalDamage} hasar`,
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
      `Rakip: Modül ${mockEnemyModuleHp} HP · Jeneratör ${mockEnemyGeneratorHp}/150 · Çekirdek ${mockEnemyCoreHp}/300`;

    renderEnemyBoard();
    updateMockBattleResult();
    renderLog();
  }

  function renderCredits() {
    const battleValue = document.getElementById("credit-indicator-value");
    if (battleValue) battleValue.textContent = `Akım: ${client.circuitCredits} / 12`;
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
    const placement = modulePlacementSlotState();
    capacityEl.textContent = localizedUiText(
      `Devrede ${placement.active} / ${placement.currentLimit}`
    );
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
          "Savaş tamamlandı; modül hareketleri ve port dönüşleri kilitlendi.";
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
      return `${entry.attacker} → ${entry.target} · Final ${entry.damage}${reduced > 0 ? ` · Azaltılan ${reduced}` : ""} · Savunma ${defense}`;
    }
    if (entry.kind === "damage_reflected") {
      return `Yansıtılan hasar · ${entry.damage}`;
    }
    if (entry.kind === "module_repaired") {
      return `Onarım · +${entry.repair} Can`;
    }
    if (entry.kind === "module_cooled") {
      return `Soğutma · Isı ${Math.round(entry.heatBefore)} → ${Math.round(entry.heatAfter)}`;
    }
    if (entry.kind === "module_overclocked") {
      return `Aşırı Hızlandırma · saldırı temposu arttı`;
    }
    if (entry.kind === "module_heat_changed") {
      const before = Number(entry.heatBefore || 0);
      const after = Number(entry.heatAfter || 0);
      if (Math.abs(after - before) < 10) return "";
      return `Isı · ${Math.round(before)} → ${Math.round(after)}`;
    }
    if (entry.kind === "module_overheated") {
      return `AŞIRI YÜK · ${entry.selfDamage} öz hasar`;
    }
    if (entry.kind === "attack_skipped_overheated") {
      return `Saldırı engellendi: kritik ısı`;
    }
    if (entry.kind === "sabotage_applied") {
      return `Sabotaj uygulandı · ${entry.effectId || entry.effect_id}`;
    }
    if (entry.kind === "virus_damage") {
      return `Virüs: ${entry.damage} hasar`;
    }
    if (entry.kind === "support_skipped_jammed") {
      return `Destek engellendi · Sinyal Bozma`;
    }
    if (entry.kind === "sabotage_resisted") {
      return `Sabotaj direnci çalıştı`;
    }
    if (entry.kind === "sabotage_blocked") {
      return `Sabotaj engellendi`;
    }
    if (entry.kind === "sabotage_cleansed") {
      return `Sabotaj temizlendi · ${entry.effectId || entry.effect_id}`;
    }
    if (entry.kind === "sabotage_duration_reduced") {
      return `Sabotaj süresi azaltıldı`;
    }
    if (entry.kind === "battle_finished") {
      if (entry.isDraw || entry.is_draw) return `MAÇ BİTTİ · Berabere`;
      return `MAÇ BİTTİ · Kazanan ${entry.winnerPlayerId || entry.winner_player_id}`;
    }
    if (entry.kind === "module_damaged") {
      return `${entry.moduleName || "Modül"} · -${entry.damage} Can`;
    }
    if (entry.kind === "client_notice") {
      return `Bilgi · ${entry.payload?.message || ""}`;
    }
    if (entry.kind === "battle_forfeited") {
      return `Savaş bırakıldı`;
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

  function updateClock(now) {
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
            scheduleSettingsAutoSave(control.type === "range" ? 320 : 120);
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

  const returnPreparationButton =
    document.getElementById(
      "return-preparation-button"
    );

  if (returnPreparationButton) {
    returnPreparationButton.addEventListener(
      "click",
      () => {
        postMatchSync.clear();
        pvpConnection.disconnect();
        pvpState.reset();
        onlinePlay.reset();
        resetBattleResultPresentation();
        returnToMainMenu();
        renderPlayModeUi();
      }
    );
  }

  document.getElementById("post-match-continue")?.addEventListener(
    "click",
    () => {
      renderPostMatchRewards();
      showPostMatchStage("rewards");
    }
  );

  const rematchButton =
    document.getElementById(
      "rematch-button"
    );

  if (rematchButton) {
    rematchButton.addEventListener(
      "click",
      async () => {
        gridshardAudioDirector
          ?.prepareBattlePlayback?.();
        trackRematchRequest();

        if (
          activePlayMode
          === "local"
        ) {
          localBattleStarted =
            false;
          renderPlayModeUi();
          startLocalPlayableMatch();
          return;
        }

        postMatchSync.clear();
        pvpConnection.disconnect();
        pvpState.reset();
        onlinePlay.reset();
        resetBattleResultPresentation();

        const result =
          await startRealOnlineMatch();

        if (!result.ok) {
          logClientMessage(
            result.reason
            || "Tekrar maç başlatılamadı."
          );
        }
      }
    );
  }

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
      if (deckEditorSlots.filter(Boolean).length !== 6 || homeMatchmakingLaunchPending || homeMatchmakingCancelPending || isOnlineMatchmakingCancelable()) return;
      homeMatchmakingLaunchPending = true;
      try {
        gridshardAudioDirector?.prepareBattlePlayback?.();
        prepareOnlineMatch();
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
    if (button) { button.disabled = true; button.textContent = "İPTAL EDİLİYOR…"; }
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
    const status = document.getElementById("arena-reward-status");
    if (status) status.textContent = "Lider Panosu bir sonraki içerik adımında doldurulacak.";
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
      rotateModule:(moduleId) => {
        const module=
          client.requireModule(
            moduleId
          );
        if (
          localBattleFinished
          || !client.isShelfUnlocked()
          || module.status
            !== "active"
          || module.rotatable
            === false
        ) {
          return false;
        }
        client.emitCommand({
          kind:"rotate_module",
          payload:{
            module_id:moduleId,
          },
        });
        return true;
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
        directions:
          Object.fromEntries(
            [...client.modules.values()]
              .map(
                (module) => [
                  module.instanceId,
                  module.direction,
                ]
              )
          ),
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
        hint: "Çekirdek ve jeneratör sabittir; diğer iki başlangıç modülünü sen seçersin.",
      },
      {
        title: "Dokun, sonra yerleştir",
        body: "Savaşta altı karttan birine dokun. Yeterli Devre Kredin varsa sunucu yeni örneği uygun hücreye yerleştirir.",
        target: "#mobile-battle-tabs",
        hint: "Masaüstünde sürükle-bırak da kullanılmaya devam eder.",
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
  loadBattlePoolPresets();
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
