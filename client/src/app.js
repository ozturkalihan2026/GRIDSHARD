(() => {
  "use strict";

  // İstemci telemetrisi yalnız ?diagnostics=1 ile gönderilir; normal oyunda
  // menü, eşleştirme ve ilerleme istekleri ek ağ trafiğiyle yavaşlatılmaz.
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
    ...(Array.isArray(globalThis.GRIDSHARD_CANON_MODULES)
      ? globalThis.GRIDSHARD_CANON_MODULES
      : []),
  ].map(item => ({
    instanceId: item.id.replaceAll("_", "-") + "-1", definitionId: item.id,
    nameTr: item.name_tr, hp: item.max_hp, maxHp: item.max_hp,
    currentCost: item.current_cost,
    category: item.category === "sistem" ? "enerji" : item.category,
    strategicRole: item.name_tr, rarity: item.rarity,
    unlockTrophies: Math.max(0, (Number(item.unlock_arena || 1) - 1) * 300),
    status: item.id === "core" ? "active" : "reserve",
    position: item.id === "core" ? {x: 2, y: 1} : null,
    isDeckTemplate: item.id !== "core",
    energyRequired: 0, energyReceived: 0, isPowered: true, storedEnergy: 0,
  }));

  const commandLog = [];
  const battleEventChannels =
    typeof GRIDSHARD_BATTLE_EVENT_CHANNELS === "object"
      ? GRIDSHARD_BATTLE_EVENT_CHANNELS
      : {
          GAME_EFFECT:"game_effect",
          AUDIO_STATE:"audio_state",
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
  function emitBattleEvent(channel, payload={}) {
    return battleEventBus
      ? battleEventBus.emit(channel, payload)
      : { event:{ channel, payload, occurredAt:Date.now() }, results:[] };
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
  const selectablePoolModules = moduleDefinitions.filter(
    (module) => module.instanceId !== "core-1"
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
    attackModuleIds: selectablePoolModules
      .filter((module) => module.category === "saldırı")
      .map((module) => module.instanceId),
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
  let battlePoolPresets = withStarterBattlePoolPresets([]);
  let activeBattlePoolPresetName = STARTER_BATTLE_POOL_PRESET.name;
  let activeBattlePoolPresetBaseline = [];
  let quickLoadoutFilter = "all";
  const client = new RelayBattleClient({
    modules: moduleDefinitions,
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
        logClientMessage(
          "Komut gönderilemedi: sunucu savaş oturumu bağlı değil."
        );
      }

      renderLog();
    },
  });

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

  // Grafik kademesi. Sunucudaki ayar hesapla birlikte her cihaza taşınır;
  // "Otomatik" ise cihaza özeldir: donanıma göre başlar ve savaşta kare hızı
  // düşük kalırsa bir kademe iner. Kademe `body[data-graphics]` ile CSS'e,
  // parçacık bütçesiyle de efekt koduna yansır.
  const GRAPHICS_TIERS = Object.freeze(["dusuk", "orta", "yuksek"]);
  const GRAPHICS_MODE_STORAGE_KEY = "gridshard.graphics-mode";
  const GRAPHICS_AUTO_TIER_STORAGE_KEY = "gridshard.graphics-auto-tier";
  let autoGraphicsTier = null;

  function readDevicePreference(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch (_) {
      return null;
    }
  }

  function writeDevicePreference(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch (_) {
      // Depolama kapalıysa tercih yalnız bu oturumda geçerlidir.
    }
  }

  function graphicsBuildVersion() {
    return document.getElementById("boot-version")?.dataset?.version || "";
  }

  function detectDeviceGraphicsTier() {
    const nav = globalThis.navigator || {};
    const native = Boolean(globalThis.Capacitor?.isNativePlatform?.());
    const mobile = native || /Android|iPhone|iPad|iPod/i.test(String(nav.userAgent || ""));
    if (!mobile) return "yuksek";
    // deviceMemory en yakın ikinin kuvvetine yuvarlanır (6 GB → 4); iOS vermez.
    const memory = Number(nav.deviceMemory) || 0;
    const cores = Number(nav.hardwareConcurrency) || 0;
    if ((memory && memory <= 2) || (cores && cores <= 4)) return "dusuk";
    if ((memory && memory <= 4) || (cores && cores <= 6)) return "orta";
    return "yuksek";
  }

  function resolveAutoGraphicsTier() {
    if (autoGraphicsTier) return autoGraphicsTier;
    // Savaşta düşürülen kademe aynı sürüm boyunca hatırlanır; yeni sürüm
    // iyileştirme getirmiş olabileceği için ölçüm baştan yapılır.
    const [tier, version] = String(
      readDevicePreference(GRAPHICS_AUTO_TIER_STORAGE_KEY) || ""
    ).split("@");
    autoGraphicsTier =
      GRAPHICS_TIERS.includes(tier) && version === graphicsBuildVersion()
        ? tier
        : detectDeviceGraphicsTier();
    return autoGraphicsTier;
  }

  function graphicsModeIsAuto() {
    const mode = readDevicePreference(GRAPHICS_MODE_STORAGE_KEY);
    if (mode === "auto") return true;
    if (mode === "manual") return false;
    // Tercih yokken: hesap ayarı varsayılandan farklıysa oyuncu kendi seçmiştir.
    return (settingsState.settings?.graphics_quality || "yuksek") === "yuksek";
  }

  function battleGraphicsQuality() {
    if (graphicsModeIsAuto()) return resolveAutoGraphicsTier();
    const stored = settingsState.settings?.graphics_quality;
    return GRAPHICS_TIERS.includes(stored) ? stored : "yuksek";
  }

  function applyGraphicsQuality() {
    const tier = battleGraphicsQuality();
    if (document.body.dataset.graphics !== tier) {
      document.body.dataset.graphics = tier;
    }
    // Düşük kademede kamera eğimi kapanır; oyuncunun tercihi saklı kalır.
    const perspective =
      tier !== "dusuk" && readDevicePreference("gridshard.battle-perspective") !== "off"
        ? "on"
        : "off";
    if (document.body.dataset.battlePerspective !== perspective) {
      document.body.dataset.battlePerspective = perspective;
    }
    return tier;
  }

  // Otomatik kademede savaş kare hızı kötü kalırsa bir kademe iner.
  function lowerAutoGraphicsTier() {
    if (!graphicsModeIsAuto()) return null;
    const index = GRAPHICS_TIERS.indexOf(resolveAutoGraphicsTier());
    if (index <= 0) return null;
    autoGraphicsTier = GRAPHICS_TIERS[index - 1];
    writeDevicePreference(
      GRAPHICS_AUTO_TIER_STORAGE_KEY,
      `${autoGraphicsTier}@${graphicsBuildVersion()}`
    );
    applyGraphicsQuality();
    return autoGraphicsTier;
  }

  // Savaş düzeni dönemi: tahta boyutu değişince artar. Kablo geometrisi bir
  // dönem boyunca bir kez ölçülür; her çizimde düzen okumak (offsetLeft)
  // yazmalarla iç içe geçip tarayıcıyı saniyede binlerce kez düzen hesabına
  // zorluyordu.
  let battleLayoutEpoch = 0;
  const boardCableStates = new WeakMap();
  let battleLayoutObserver = null;
  let battleLayoutRefreshQueued = false;

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
  const startupLoading = globalThis.GridshardStartupLoading ? new globalThis.GridshardStartupLoading(document) : null;
  function afterStartup(callback) {
    return (startupLoading?.finished || Promise.resolve()).then(callback);
  }
  let startupFlight = null;

  async function bootstrapParticipant() {
    if (startupFlight) return startupFlight;
    startupFlight = performParticipantBootstrap().catch((error) => {
      startupLoading?.fail();
      if (globalThis.GridshardAuth?.session?.requiresReauthentication) {
        void accountSessionControls?.openRecovery();
      }
      return {ok:false, reason:error instanceof Error ? error.message : String(error)};
    }).finally(() => { startupFlight = null; });
    return startupFlight;
  }

  async function performParticipantBootstrap() {
    startupLoading?.begin();
    const readiness = await checkServerReadiness();
    if (!readiness.ok) throw new Error(readiness.reason || "Sunucu bağlantısı hazır değil.");
    startupLoading?.complete("server");
    startupLoading?.stage("boot.stage.profile");
    const result =
      await participantBootstrap
        .load();

    participantBootstrapResult =
      result;
    if (!result.ok) throw new Error(result.reason || "Hesap verileri yüklenemedi.");
    startupLoading?.complete("profile");

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
        throw new Error("Katılımcı kimliği sunucu hesabıyla eşleşmiyor.");
      }

      // Show the server-confirmed game account, not a provisional local ID
      // or a provider's Play Games subject. Linking keeps this account stable.
      startupLoading?.setPlayerId(continuity.returnedPlayerId);
      renderProfileSummary();
      renderStatisticsSummary();
      renderSettingsForm();
      recordProductEvent("session_started");
      recordProductEvent("screen_view", {screen:appRouter.currentScreen});
      loadBattlePoolPresets();
      startupLoading?.stage("boot.stage.collection");
      await loadMetaProgression({required:true});
      startupLoading?.complete("collection");
      startupLoading?.stage("boot.stage.account");
      const accountResult = await loadAccountPlatform({ presentOnboarding:true });
      if (!accountResult.ok) throw new Error("Hesap bağlantıları hazırlanamadı.");
      startupLoading?.complete("account");
      await startupLoading?.finish();
      void loadStoreState(); // Native UMP info refresh; never blocks game startup.
      if (accountResult.ok && !accountResult.redirecting) {
        void nativePush?.start().catch(() => {
          setNativePushStatus("Bildirim cihaz kaydı tamamlanamadı. Bağlantı gelince yeniden denenecek.");
        });
      }
      if (!accountResult.presented) loadDailyMetaState({ present:true });
      loadRewardInbox();
      void loadSocialView({ quiet:true });
      startSocialPolling();
      void afterStartup(() => consumePendingDeepLink());
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
  let metaProgressionState = null;
  // Gerçek para mağazası (/store): ürünler, sağlayıcılar, geçiş ve premium durumu.
  let storeState = null;
  let purchaseInFlight = false;
  const pendingPurchaseIds = new Map();
  // Mağazada ödenmiş ama sunucuya henüz işlenmemiş alımlar (ürün → alım bilgisi).
  // Sunucu yanıtı gelmezse aynı alım ikinci ödeme olmadan yeniden gönderilir.
  const pendingNativePurchases = new Map();
  // Yerel uygulamada mağaza ve reklam eklentisi köprüsü; web'de null.
  const nativeStore = globalThis.GridshardNativeStore?.NativeStoreBridge
    ? new globalThis.GridshardNativeStore.NativeStoreBridge()
    : null;
  // Reklamla ikiye katlanan savaşlar (savaş kimliği → sunucu makbuzu).
  const adRewardReceipts = new Map();
  let adRewardPending = false;
  // Günlük meta çarkının birikimli açısı (derece). Dönüş hep saat yönünde
  // ileri gider; geri sarma olmaz, aynı yöndeki açıya yeniden dokunulmaz.
  let dailyMetaWheelRotation = 0;
  const DAILY_META_SPIN_MS = 2600;
  const DAILY_META_SPIN_TURNS = 5;
  const pendingMetaRequests = new Map();
  let activeModuleFilter = "all";
  let selectedCollectionModuleId = "laser";
  let activeCardPage = "modules";
  let activeCosmeticTab = "avatar";
  let selectedCollectionCoreId = "core_resonance";
  let activeLeaderboardTab = "trophies";
  let activeTrophyLeaderboardScope = "general";
  let leaderboardPayload = null;
  let rewardInboxState = null;
  let publicProfileReturnDialogId = null;
  let teamProfileReturnDialogId = null;
  let teamState = null;
  let activeTeamTab = "profile";
  let socialState = null;
  let pendingDeepLinkConsumed = false;
  let activePublicProfileId = null;
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
    { id: "season_crown", nameTr: "Şampiyon Tacı" },
    { id: "season_silver", nameTr: "Prizma Finalisti" },
    { id: "weekly_gold", nameTr: "Haftalık Altın" },
    { id: "weekly_silver", nameTr: "Haftalık Gümüş" },
    { id: "frequency_cyan", nameTr: "Frekans Akımı" },
  ]);
  const BATTLE_EMOJIS = Object.freeze([
    { id:"none", nameTr:"Kapalı", glyph:"—" },
    // Gerçek emojiler: ilk altısı herkese açık, diğerleri sezon yolunda.
    { id:"thumbs_up", nameTr:"Beğendim", glyph:"👍", real:true },
    { id:"laugh", nameTr:"Kahkaha", glyph:"😂", real:true },
    { id:"wow", nameTr:"Vay Canına", glyph:"😮", real:true },
    { id:"cry", nameTr:"Gözyaşı", glyph:"😢", real:true },
    { id:"angry", nameTr:"Öfke", glyph:"😠", real:true },
    { id:"good_game", nameTr:"İyi Oyun", glyph:"🤝", real:true },
    { id:"fire", nameTr:"Alev Aldı", glyph:"🔥", real:true },
    { id:"cool", nameTr:"Havalı", glyph:"😎", real:true },
    { id:"mind_blown", nameTr:"Beyin Yandı", glyph:"🤯", real:true },
    { id:"crown", nameTr:"Taç", glyph:"👑", real:true },
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
    if (emoji?.real) visual.dataset.real = "true";
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

  // Savaşta paylaşılabilen emojiler: herkese açıklar + kazanılanlar.
  function availableBattleEmojis(cosmetics) {
    const unlocked = new Set(cosmetics?.unlockedBattleEmojiIds || cosmetics?.unlocked_battle_emoji_ids || []);
    return BATTLE_EMOJIS.filter((emoji) => emoji.id !== "none" && unlocked.has(emoji.id));
  }

  // Savaştaki emoji düğmesinin yüzü: seçili emoji açıksa o, değilse ilk açık emoji.
  function quickBattleEmoji(cosmetics) {
    const available = availableBattleEmojis(cosmetics);
    return available.find((emoji) => emoji.id === cosmetics?.selected_battle_emoji_id) || available[0] || null;
  }

  // Kilitli kozmetiğin nereden açıldığı: sunucunun unlock_sources listesinden.
  function cosmeticUnlockLabels(kind, id, cosmetics) {
    const sources = cosmetics?.unlock_sources?.[kind]?.[id] || [];
    const labels = sources.map((source) => {
      if (source.kind === "season_road") return `SEZON YOLU ${source.tier}`;
      if (source.kind === "leaderboard") return `LİDER PANOSU ${source.position}.`;
      if (source.kind === "weekly_tournament") return `HAFTALIK TURNUVA ${source.position}.`;
      if (source.kind === "team_tournament") return `TAKIM TURNUVASI ${source.position}.`;
      return "";
    }).filter(Boolean);
    return labels.length ? [...new Set(labels)] : ["REKABET ÖDÜLÜ"];
  }

  function cosmeticStateLabel({ unlocked, selected, kind, id, cosmetics }) {
    const state = document.createElement("small");
    if (unlocked) {
      state.textContent = selected ? "SEÇİLİ" : "SEÇ";
      return state;
    }
    state.className = "cosmetic-lock-source";
    for (const text of cosmeticUnlockLabels(kind, id, cosmetics)) {
      const part = document.createElement("span");
      part.textContent = text;
      state.appendChild(part);
    }
    return state;
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
      const timeoutError = new Error(
        "Sunucu yanıt süresini aştı. İşlemi yeniden deneyebilirsin."
      );
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
          const parseError = new Error("Sunucu okunamayan bir yanıt gönderdi.");
          parseError.status = response.status;
          throw parseError;
        }
        if (!response.ok) {
          const responseError = new Error(
            payload.detail || `Sunucu işlemi reddetti (${response.status}).`
          );
          responseError.status = response.status;
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
    throw lastError || new Error("Sunucu işlemi tamamlanamadı.");
  }

  function recordProductEvent(eventType, dimensions = {}) {
    if (settingsState.viewModel()?.analyticsConsent !== true) return;
    if (document.getElementById("settings-analytics-consent")?.checked === false) return;
    const requestId = globalThis.crypto?.randomUUID?.().replaceAll("-", "");
    void requestJsonWithDeadline("/analytics/events", {
      method:"POST",
      body:JSON.stringify({event_type:eventType, dimensions, request_id:requestId}),
    }).catch(() => {
      // İsteğe bağlı analitik, oyun/ayar kaydetme akışını engellemez.
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
  // Savaş müziği evresi yalnız ileri gider: giriş → savaş → baskı.
  const BATTLE_MUSIC_INTRO_MS = 20000;
  const BATTLE_MUSIC_PHASE_ORDER = Object.freeze({ intro:0, battle:1, pressure:2 });
  let battleMusicPhase = "intro";
  let battleMusicTension = 0;
  let battleOvertimeActive = false;
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
      battlePhase:battleMusicPhase,
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

  function openAppScreen(screen, { keepSubTab=false }={}) {
    const previousScreen = appRouter.currentScreen;
    const result = appRouter.go(screen);
    if (!result.ok) {
      logClientMessage(result.reason);
      return result;
    }
    if (!keepSubTab) resetScreenSubTabs(screen, previousScreen);

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
      if (["shop", "rewards"].includes(screen)) void loadStoreState();
      if (screen === "team") {
        activeTeamTab = "profile";
        loadTeamView();
      }
      if (screen === "friends") {
        void loadSocialView();
        if (activeDirectMessagePeerId) void loadDirectMessageThread();
      }
      if (["events", "weekly-event", "team-event"].includes(screen)) {
        if (screen === "weekly-event") activeWeeklyEventTab = "overview";
        if (screen === "team-event") activeTeamEventTab = "overview";
        renderEventSubpages();
        loadEventsView();
      }
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
        { id: "field_3h", name_tr: "Bronz Sandık", visual_tier: "bronze", unlock_hours: 0, open_seconds: 1, claim_cooldown_hours: 8, gift: true, claim_available: true, claim_remaining_seconds: 0 },
        { id: "circuit_8h", name_tr: "Gümüş Sandık", visual_tier: "silver", unlock_hours: 0, open_seconds: 1, gift: false, claim_available: false, claim_remaining_seconds: 0 },
        { id: "core_24h", name_tr: "Altın Sandık", visual_tier: "gold", unlock_hours: 0, open_seconds: 1, gift: false, claim_available: false, claim_remaining_seconds: 0 },
        { id: "diamond_24h", name_tr: "Elmas Sandık", visual_tier: "diamond", unlock_hours: 0, open_seconds: 1, gift: false, claim_available: false, claim_remaining_seconds: 0 },
      ], inventory: [] },
      shop: { chest_store: { sale_active: false, discount_percent: 40, sale_ends_at: null, items: [
        { definition_id: "field_3h", name_tr: "Bronz Sandık", tier: "bronze", currency: "circuit_credits", cost: 300, base_cost: 300 },
        { definition_id: "circuit_8h", name_tr: "Gümüş Sandık", tier: "silver", currency: "circuit_credits", cost: 1000, base_cost: 1000 },
        { definition_id: "core_24h", name_tr: "Altın Sandık", tier: "gold", currency: "flux_shards", cost: 250, base_cost: 250 },
        { definition_id: "diamond_24h", name_tr: "Elmas Sandık", tier: "diamond", currency: "flux_shards", cost: 1000, base_cost: 1000 },
      ] } },
    };
  }

  async function loadMetaProgression({required = false} = {}) {
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
      if (required) throw _error;
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
      // Koleksiyon kartı: üstte seviye rozeti, ortada simge ve modülün adı,
      // altta yükseltme için toplanan parça sayısı ve ilerleme çubuğu. Seviye,
      // parça simgesi ve sayı ayrı satırlardadır; dar kartta üst üste binmez.
      const level = Math.max(0, Number(item.level || 0)) + 1;
      const maxed = level >= 15;
      const required = Math.max(1, Number(item.next_upgrade_cost?.shards || 1));
      const shards = Math.max(0, Number(item.shards || 0));
      const unlocked = item.unlocked !== false;
      const moduleName = item.name_tr || definition.nameTr || "Modül";
      const levelBadge = document.createElement("span");
      levelBadge.className = "unified-module-level";
      if (unlocked) {
        levelBadge.textContent = `SV ${level}`;
      } else {
        const unlockArena = globalThis.GRIDSHARD_CANON_MODULES
          ?.find((module) => module.id === tile.dataset.moduleDefinitionId)?.unlock_arena;
        levelBadge.textContent = unlockArena ? `ARENA ${unlockArena}` : "KİLİTLİ";
        levelBadge.dataset.locked = "true";
      }
      const name = document.createElement("span");
      name.className = "unified-module-name";
      name.textContent = moduleName;
      const footer = document.createElement("span");
      footer.className = "unified-module-progress";
      const upgradeReady = unlocked && !maxed && shards >= required;
      footer.dataset.ready = String(upgradeReady);
      const count = document.createElement("span");
      count.className = "unified-module-shards";
      if (maxed) {
        count.textContent = "AZAMİ";
      } else {
        const amount = document.createElement("b");
        amount.textContent = `${shards}/${required}`;
        count.append(createModulePuzzlePiece({ category:tile.dataset.category }), amount);
      }
      const bar = document.createElement("i");
      bar.style.setProperty(
        "--module-progress",
        `${maxed ? 100 : Math.min(100, Math.round((shards / required) * 100))}%`
      );
      footer.append(count, bar);
      tile.append(levelBadge, name, footer);
      tile.setAttribute(
        "aria-label",
        localizedUiText(
          unlocked
            ? `${moduleName} · Seviye ${level} · ${maxed ? "Azami seviye" : `Parça ${shards} / ${required}`}`
            : `${moduleName} · Kilitli`
        )
      );
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
        tile.setAttribute("aria-label", `${item.name_tr} · ${pendingDeckModuleInstanceId ? "Yerine koy" : "Çıkar"}`);
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
      button.title = preset?.name || `Boş deste ${index + 1} · Oluştur`;
      button.setAttribute(
        "aria-label",
        preset?.name || `${index + 1}. boş deste yuvası oluştur`
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
    let name = `Deste ${slotNumber}`;
    let suffix = 2;
    while (battlePoolPresets.some((preset) => preset.name === name)) {
      name = `Deste ${slotNumber}.${suffix}`;
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
      status.textContent = `${slotNumber}. deste boş. Modüllerde Seç düğmesine dokun; ilk boş yuvaya otomatik yerleşir.`;
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
      core_shards: '<span class="resource-symbol resource-symbol-core-shard" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 7 4v10l-7 4-7-4V7Z"/><path d="m12 7 4 5-4 5-4-5Z"/></svg></span>',
      chest: '<span class="resource-symbol resource-symbol-chest" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9h16v11H4Z"/><path d="M3 5h18v5H3ZM12 9v11"/></svg></span>',
      experience: '<span class="resource-symbol resource-symbol-experience" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2 2.4 5.4L20 8l-4.2 3.8 1.2 5.7-5-2.9-5 2.9 1.2-5.7L4 8l5.6-.6Z"/><circle cx="12" cy="11" r="2.3"/></svg></span>',
    };
    return symbols[kind] || createModulePuzzlePiece().outerHTML;
  }

  // Modül kartı parçaları her yerde yapboz parçası olarak görünür. Parça,
  // modülün sınıf rengini ve simgesini taşır; evrensel parça yıldızlıdır.
  function createModulePuzzlePiece({ category = "", glyph = "", universal = false } = {}) {
    // Gövde 8..48 × 16..56; üstte ve sağda çıkıntı, altta ve solda girinti.
    const outline = "M8 16H22A7 7 0 1 1 34 16H48V30A7 7 0 1 1 48 42V56H34A7 7 0 1 0 22 56H8V42A7 7 0 1 0 8 30Z";
    const piece = document.createElement("span");
    piece.className = "resource-symbol resource-symbol-module-piece";
    piece.dataset.category = universal ? "universal" : category;
    piece.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "7 4.4 52.6 52.6");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", outline);
    svg.appendChild(shape);
    piece.appendChild(svg);
    const mark = universal ? "✦" : glyph;
    if (mark) {
      const symbol = document.createElement("b");
      symbol.textContent = mark;
      piece.appendChild(symbol);
    }
    return piece;
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
    return createModulePuzzlePiece({
      category:module.category || "",
      glyph:moduleIconFor(module),
    }).outerHTML;
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
    if (kind === "universal_module_shards") return createModulePuzzlePiece({ universal:true });
    if (kind === "module_shards") {
      const identity = moduleRewardIdentity(rewards);
      if (!identity.id) return createModulePuzzlePiece();
      return createModulePuzzlePiece({ category:identity.category, glyph:identity.glyph });
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
      { kind:"circuit_credits", amount:Number(rewards.circuit_credits || 0), label:"Devre Kredisi", suffix:"" },
      { kind:"flux_shards", amount:Number(rewards.flux_shards || 0), label:"Akı", suffix:"" },
      { kind:"module_shards", amount:Number(rewards.module_shards || 0), label:`${module.nameTr} Parçası`, suffix:"" },
      { kind:"core_shards", amount:Number(rewards.core_shards || 0), label:`${core.nameTr} Parçası`, suffix:"" },
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
      value.textContent = `+${item.amount}${item.suffix}`;
      row.setAttribute("aria-label", `${item.label} ${value.textContent}`);
      row.title = `${item.label} ${value.textContent}`;
      row.append(icon, label, value);
      list.appendChild(row);
    }
    return list;
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

  // Ödül sandığı önizlemesi. Sandığın içindeki her ödül gerçek görseliyle
  // (kaynak simgesi, modül/çekirdek kartı, avatar, çerçeve, emoji, profil
  // çubuğu, rozet ve kupa) gösterilir. Önizleme kaydırılan listenin dışında
  // tek bir katmanda çizilir: açılması satırları kaydırmaz; farede üzerine
  // gelince, dokunmatikte dokununca açılır, dışarı dokununca kapanır.
  const CHEST_TIER_NAMES = Object.freeze({
    bronze:"Bronz", silver:"Gümüş", gold:"Altın", diamond:"Elmas",
  });

  function rewardPreviewEntries(reward = {}) {
    const entries = [];
    const icon = (kind) => createRewardResourceIcon(kind, reward);
    const amount = (value) => `+${Number(value || 0).toLocaleString(uiLocale())}`;
    if (Number(reward.circuit_credits) > 0) {
      entries.push({ visual:icon("circuit_credits"), label:"Devre Kredisi", amount:amount(reward.circuit_credits) });
    }
    if (Number(reward.flux_shards) > 0) {
      entries.push({ visual:icon("flux_shards"), label:"Akı", amount:amount(reward.flux_shards) });
    }
    if (Number(reward.universal_module_shards) > 0) {
      entries.push({ visual:createRewardResourceIcon("universal_module_shards"), label:"Evrensel Kart Parçası", amount:amount(reward.universal_module_shards) });
    }
    if (Number(reward.module_shards) > 0) {
      entries.push({ visual:icon("module_shards"), label:`${moduleRewardIdentity(reward).nameTr} Parçası`, amount:amount(reward.module_shards) });
    }
    if (Number(reward.core_shards) > 0) {
      entries.push({ visual:icon("core_shards"), label:`${coreRewardIdentity(reward).nameTr} Parçası`, amount:amount(reward.core_shards) });
    }
    const chestCount = Number(reward.chest_count ?? (reward.chest_tier ? 1 : 0));
    if (reward.chest_tier && chestCount > 0 && !reward.chest_is_container) {
      const chest = document.createElement("span");
      chest.className = "reward-preview-chest";
      chest.innerHTML = chestVisualMarkup(reward.chest_tier);
      entries.push({ visual:chest, label:`${CHEST_TIER_NAMES[reward.chest_tier] || "Ödül"} Sandık`, amount:`×${chestCount}` });
    }
    if (reward.avatar_id) {
      const avatar = document.createElement("span");
      avatar.className = "profile-avatar reward-preview-avatar";
      applyAvatarVisual(avatar, reward.avatar_id, "none");
      const name = PROFILE_AVATARS.find((item) => item.id === reward.avatar_id)?.nameTr || "Avatar";
      entries.push({ visual:avatar, label:`Avatar · ${name}`, amount:"×1" });
    }
    if (reward.avatar_frame_id) {
      const frame = document.createElement("span");
      frame.className = "profile-avatar reward-preview-avatar";
      applyAvatarVisual(frame, "default", reward.avatar_frame_id);
      const name = PROFILE_AVATAR_FRAMES.find((item) => item.id === reward.avatar_frame_id)?.nameTr || "Çerçeve";
      entries.push({ visual:frame, label:`Avatar Çerçevesi · ${name}`, amount:"×1" });
    }
    if (reward.emoji_id) {
      const emoji = BATTLE_EMOJIS.find((item) => item.id === reward.emoji_id);
      const holder = document.createElement("span");
      holder.className = "reward-preview-emoji";
      holder.appendChild(createBattleEmojiVisual(emoji || { glyph:"✦" }));
      entries.push({ visual:holder, label:`Savaş Emojisi · ${emoji?.nameTr || "Emoji"}`, amount:"×1" });
    }
    if (reward.profile_background_id) {
      const background = PROFILE_BACKGROUNDS.find((item) => item.id === reward.profile_background_id);
      const swatch = document.createElement("span");
      swatch.className = "reward-preview-swatch";
      const [from, to] = background?.colors || ["#153b58", "#176b72"];
      swatch.style.background = `linear-gradient(135deg,${from},${to})`;
      entries.push({ visual:swatch, label:`Profil Çubuğu · ${background?.nameTr || "Arka plan"}`, amount:"×1" });
    }
    for (const [key, definitions, fallbackGlyph] of [
      ["rank_trophy_id", PROFILE_RANK_TROPHIES, "🏆"],
      ["badge_id", PROFILE_BADGES, "✦"],
    ]) {
      if (!reward[key]) continue;
      const definition = definitions.find((item) => item.id === reward[key]);
      const honor = document.createElement("span");
      honor.className = "reward-preview-honor";
      honor.dataset.tone = definition?.tone || "cyan";
      honor.textContent = definition?.glyph || fallbackGlyph;
      entries.push({ visual:honor, label:definition?.nameTr || "Onur", amount:"×1" });
    }
    // Takım turnuvası: takım profilindeki görünüm seçeneklerini açar.
    if (reward.team_emblem_id && TEAM_EMBLEMS[reward.team_emblem_id]) {
      const emblem = TEAM_EMBLEMS[reward.team_emblem_id];
      const visual = document.createElement("span");
      visual.className = "reward-preview-team-emblem";
      visual.style.setProperty("--team-emblem-color", emblem.color);
      visual.innerHTML = teamEmblemSvg(reward.team_emblem_id);
      entries.push({ visual, label:`Takım Amblemi · ${emblem.nameTr}`, amount:"×1" });
    }
    if (reward.team_frame_id && TEAM_FRAMES[reward.team_frame_id]) {
      const frame = TEAM_FRAMES[reward.team_frame_id];
      const visual = document.createElement("span");
      visual.className = "reward-preview-team-frame";
      visual.style.setProperty("--team-frame-color", frame.color);
      entries.push({ visual, label:`Takım Çerçevesi · ${frame.nameTr}`, amount:"×1" });
    }
    if (reward.team_name_color_id && TEAM_NAME_COLORS[reward.team_name_color_id]) {
      const color = TEAM_NAME_COLORS[reward.team_name_color_id];
      const visual = document.createElement("span");
      visual.className = "reward-preview-team-color";
      visual.style.background = color.color;
      entries.push({ visual, label:`Takım İsim Rengi · ${color.nameTr}`, amount:"×1" });
    }
    return entries;
  }

  let rewardPreviewState = null;

  function hideRewardPreview() {
    if (!rewardPreviewState) return;
    rewardPreviewState.panel.remove();
    rewardPreviewState.trigger.setAttribute("aria-expanded", "false");
    rewardPreviewState.trigger.removeAttribute("aria-describedby");
    rewardPreviewState = null;
  }

  function positionRewardPreview(trigger, panel) {
    const margin = 8;
    panel.style.left = "0px";
    panel.style.top = "0px";
    // Kapsayıcı blok (açık diyalog ya da görüntü alanı) ne olursa olsun
    // paneli tetikleyiciye göre görüntü alanı koordinatlarında konumlar.
    const origin = panel.getBoundingClientRect();
    const target = trigger.getBoundingClientRect();
    const width = origin.width;
    const height = origin.height;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    let left = target.left + target.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    let top = target.bottom + margin;
    if (top + height > viewportHeight - margin) top = target.top - height - margin;
    top = Math.max(margin, top);
    panel.style.left = `${Math.round(left - origin.left)}px`;
    panel.style.top = `${Math.round(top - origin.top)}px`;
  }

  function showRewardPreview(trigger, { title, reward, note }) {
    if (rewardPreviewState?.trigger === trigger) return;
    hideRewardPreview();
    const host = trigger.closest("dialog[open]") || document.body;
    const panel = document.createElement("div");
    panel.className = "reward-preview-panel";
    panel.setAttribute("role", "tooltip");
    panel.id = `reward-preview-${Date.now()}`;
    const accent = trigger.style.getPropertyValue("--reward-accent");
    if (accent) panel.style.setProperty("--reward-accent", accent);
    const heading = document.createElement("strong");
    heading.textContent = localizedUiText(title || "Ödül Sandığı");
    const list = document.createElement("div");
    list.className = "reward-preview-list";
    for (const entry of rewardPreviewEntries(reward)) {
      const row = document.createElement("div");
      row.className = "reward-preview-row";
      const visual = document.createElement("span");
      visual.className = "reward-preview-visual";
      visual.appendChild(entry.visual);
      const label = document.createElement("span");
      label.className = "reward-preview-label";
      label.textContent = localizedUiText(entry.label);
      const value = document.createElement("strong");
      value.className = "reward-preview-amount";
      value.textContent = entry.amount;
      row.append(visual, label, value);
      list.appendChild(row);
    }
    if (!list.children.length) {
      const empty = document.createElement("small");
      empty.textContent = localizedUiText("Bu sandığın içeriği hazırlanıyor.");
      list.appendChild(empty);
    }
    panel.append(heading, list);
    if (note) {
      const noteNode = document.createElement("small");
      noteNode.className = "reward-preview-note";
      noteNode.textContent = localizedUiText(note);
      panel.appendChild(noteNode);
    }
    host.appendChild(panel);
    positionRewardPreview(trigger, panel);
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", panel.id);
    rewardPreviewState = { trigger, panel, pinned:false };
  }

  function createRewardChestButton({
    tier = "bronze",
    visualId = "",
    reward = {},
    title = "",
    note = "",
    count = 1,
    locked = false,
    accent = "",
    className = "",
  } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-chest-button${className ? ` ${className}` : ""}`;
    button.dataset.tier = tier;
    button.dataset.locked = String(Boolean(locked));
    if (accent) button.style.setProperty("--reward-accent", accent);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", `${title || "Ödül sandığı"} · içeriği göster`);
    button.innerHTML = chestVisualMarkup(tier, { visualId });
    if (count > 1) {
      const badge = document.createElement("span");
      badge.className = "reward-chest-count";
      badge.textContent = `×${count}`;
      button.appendChild(badge);
    }
    if (locked) {
      const lock = document.createElement("span");
      lock.className = "reward-chest-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "🔒";
      button.appendChild(lock);
    }
    const options = { title, reward, note };
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") showRewardPreview(button, options);
    });
    button.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && rewardPreviewState?.trigger === button && !rewardPreviewState.pinned) {
        hideRewardPreview();
      }
    });
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible")) showRewardPreview(button, options);
    });
    button.addEventListener("blur", () => {
      if (rewardPreviewState?.trigger === button && !rewardPreviewState.pinned) hideRewardPreview();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (rewardPreviewState?.trigger === button && rewardPreviewState.pinned) {
        hideRewardPreview();
        return;
      }
      showRewardPreview(button, options);
      if (rewardPreviewState) rewardPreviewState.pinned = true;
    });
    return button;
  }

  document.addEventListener("pointerdown", (event) => {
    if (!rewardPreviewState) return;
    if (rewardPreviewState.panel.contains(event.target)) return;
    if (rewardPreviewState.trigger.contains(event.target)) return;
    hideRewardPreview();
  }, true);
  document.addEventListener("scroll", hideRewardPreview, true);
  window.addEventListener("resize", hideRewardPreview);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideRewardPreview();
  });

  // Maçta yeni açılan Devre Yolu ödülü; yol yeniden çizilse de vurgulu kalır.
  let highlightedArenaNodeId = "";

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
        ? (document.documentElement.lang === "en" && stage.name_en || localizedUiText(stage.name_tr))
        : localizedMessage("arena.stage_name", {
          arena:localizedNumber(stage.index),
          name:stage.name_tr ? localizedMessage("arena.stage_name_suffix", {name:localizedUiText(stage.name_tr)}) : "",
        });
      const detail = document.createElement("p");
      if (arena) {
        const nodeCount = (arena.nodes || []).filter((node) => Object.keys(node.rewards || {}).length && Number(node.trophies) >= Number(stage.minimum_rating || 0)).length;
        const coreCopy = arena.core_unlock ? localizedMessage("arena.new_core_suffix") : "";
        detail.textContent = localizedMessage("arena.stage_detail", {
          trophies:localizedNumber(stage.minimum_rating || 0),
          count:localizedNumber(nodeCount), core:coreCopy,
        });
      } else {
        const next = stages[stages.indexOf(stage) + 1];
        detail.textContent = next
          ? localizedMessage("arena.league_range", {
            minimum:localizedNumber(stage.minimum_rating || 0),
            maximum:localizedNumber(Number(next.minimum_rating) - 1),
          })
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
          label.textContent = localizedUiText("BU ARENADA AÇILAN MODÜLLER");
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
          reward.dataset.arenaNodeId = String(node.id);
          reward.classList.toggle("is-new-reward", Boolean(node.claimable) && String(node.id) === highlightedArenaNodeId);
          const trophy = document.createElement("span");
          trophy.className = "arena-reward-trophy";
          trophy.textContent = localizedMessage("arena.trophy_icon", {count:localizedNumber(node.trophies)});
          const glyph = document.createElement("i");
          glyph.setAttribute("aria-hidden", "true");
          glyph.innerHTML = rewardIcon(node.rewards);
          const caption = document.createElement("strong");
          caption.textContent = node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy, glyph, caption);
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
          reward.dataset.arenaNodeId = String(node.id);
          reward.classList.toggle("is-new-reward", Boolean(node.claimable) && String(node.id) === highlightedArenaNodeId);
          const trophy = document.createElement("span");
          trophy.className = "arena-reward-trophy";
          trophy.textContent = localizedMessage("arena.trophy_icon", {count:localizedNumber(node.trophies)});
          const glyph = document.createElement("i");
          glyph.setAttribute("aria-hidden", "true");
          glyph.innerHTML = rewardIcon(node.rewards);
          const caption = document.createElement("strong");
          caption.textContent = node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy, glyph, caption);
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
    if (!host.childElementCount) host.textContent = localizedUiText("Devre Yolu yükleniyor…");
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
    if (level) level.textContent = `SV ${Number(core?.level || 1)}`;
    if (button) {
      button.setAttribute("aria-label", `${core?.name_tr || "Çekirdek"} · Seviye ${Number(core?.level || 1)} · Çekirdek seçimini aç`);
    }
  }
  function openCoreCollection() {
    setCardCollectionPage("cores");
    openAppScreen("modules", { keepSubTab:true });
  }

  // Kozmetik alt sekmeleri: Avatar, Çerçeve, Emoji, Arka Plan.
  function openCosmeticTab(tab) {
    activeCosmeticTab = ["avatar", "frame", "emoji", "background"].includes(tab)
      ? tab
      : "avatar";
    for (const button of document.querySelectorAll("[data-cosmetic-tab]")) {
      const active = button.dataset.cosmeticTab === activeCosmeticTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const panel of document.querySelectorAll("[data-cosmetic-panel]")) {
      panel.hidden = panel.dataset.cosmeticPanel !== activeCosmeticTab;
    }
  }

  // Bir bölüme yeniden girildiğinde ilk alt sekmesi açılır (ör. Kartlar →
  // Modüller) ve liste başa döner. Bölümün kendi içinde gezinirken sekme
  // korunur.
  function resetScreenSubTabs(screen, previousScreen) {
    if (screen === previousScreen) return;
    if (screen === "modules" && activeCardPage !== "modules") {
      setCardCollectionPage("modules");
    }
    if (screen === "avatar") openCosmeticTab("avatar");
    if (screen === "team") activeTeamLobbyTab = "list";
    if (screen === "friends" && activeFriendsTab !== "friends") {
      if (activeDirectMessagePeerId) closeDirectMessageThread();
      openFriendsTab("friends");
    }
    if (screen === "settings") {
      const general = document.getElementById("settings-tab-general");
      if (general && general.getAttribute("aria-selected") !== "true") {
        selectSettingsCategory(general);
      }
    }
    const panel = document.querySelector(`[data-screen-panel="${screen}"]`);
    if (panel) panel.scrollTop = 0;
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
    tile.setAttribute("aria-label", `${core.name_tr} · ${moduleRarityLabel(core.rarity)} · Seviye ${core.level}${core.selected ? " · seçili" : ""}`);
    const visual = applyCoreVisualIdentity(tile, core.id);
    const glyph = document.createElement("span");
    glyph.className = "core-collection-glyph";
    glyph.textContent = visual.glyph;
    glyph.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "core-collection-copy";
    const name = document.createElement("strong");
    name.textContent = core.name_tr;
    const rarity = document.createElement("em");
    rarity.textContent = moduleRarityLabel(core.rarity);
    const state = document.createElement("small");
    state.textContent = core.unlocked ? `SV ${core.level}` : `ARENA ${core.unlock_arena}`;
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
    if (name) name.textContent = core.name_tr;
    if (select) {
      select.textContent = core.selected ? "Seçildi" : core.unlocked ? "Seç" : "Kilitli";
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
    if (count) count.textContent = `${cores.filter((core) => core.unlocked).length} / ${cores.length || 7}`;
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
      summary.textContent = `${rarityCores.filter((core) => core.unlocked).length} / ${rarityCores.length} AÇIK`;
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
      intro.textContent = "Çekirdeğin savaş alanına sağladığı kalıcı enerji ve dayanıklılık değerleri.";
      const list = document.createElement("dl");
      list.className = "module-stat-tiles core-stat-tiles";
      for (const [label, value] of [
        ["Nadirlik", moduleRarityLabel(core.rarity)],
        ["Savaş rolü", core.role_tr],
        ["İmza", core.signature_name_tr || "—"],
        ["Enerji üretimi", `${core.energy_per_second}/sn`],
        ["Enerji deposu", core.energy_capacity],
        ["Seviye", `${core.level} / 15`],
      ]) {
        const row = document.createElement("div");
        row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
        list.appendChild(row);
      }
      host.appendChild(list);
    } else if (tabName === "skills") {
      intro.textContent = "Her eşikte tek bir çekirdek yeteneği seçilebilir.";
      const tree = document.createElement("div");
      tree.className = "core-skill-tree";
      for (const skill of core.skills || []) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = skill.learned ? "is-selected" : "";
        const state = skill.learned ? "SEÇİLDİ" : skill.tier_selected ? "DİĞER DAL SEÇİLDİ" : core.level < skill.level ? `SV ${skill.level} GEREKLİ` : `${skill.flux_cost} AKI`;
        button.innerHTML = `<strong>${skill.name_tr}</strong><small>SV ${skill.level} · ${state}</small>`;
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
      intro.textContent = core.role_tr;
      host.appendChild(createModuleIdentityPanel(core, {
        noAdvantageTr:"Enderlik CAN, enerji üretimi, dolum hızı veya güç etkisi avantajı vermez.",
      }));
      const overview = document.createElement("div");
      overview.className = "module-overview-grid";
      for (const [label, value] of [
        ["NADİRLİK", moduleRarityLabel(core.rarity)],
        ["SAVAŞ ROLÜ", core.role_tr],
        ["İMZA", core.signature_name_tr || "—"],
        ["AÇILIŞ", `Arena ${core.unlock_arena}`],
        ["ENERJİ", `${core.energy_per_second}/sn`],
        ["SONRAKİ SEVİYE", core.next_upgrade_cost ? `${core.next_upgrade_cost.shards} parça · ${core.next_upgrade_cost.flux_shards} Akı` : "Azami seviye"],
      ]) {
        const card = document.createElement("div");
        card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        overview.appendChild(card);
      }
      host.appendChild(overview);
    }
    host.prepend(intro);
  }

  function openCoreDetail() {
    const core = activeMetaCore()
      || metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0];
    if (!core) return;
    selectedCollectionCoreId = core.id;
    const dialog = document.getElementById("core-detail-dialog");
    const visual = applyCoreVisualIdentity(dialog, core.id);
    const setText = (id, value) => { const target = document.getElementById(id); if (target) target.textContent = String(value); };
    setText("core-detail-name", core.name_tr);
    setText("core-detail-rarity", moduleRarityLabel(core.rarity));
    setText("core-detail-level", `SEVİYE ${core.level}`);
    setText("core-detail-selected-state", core.selected ? "SEÇİLDİ" : core.unlocked ? "HAZIR" : "KİLİTLİ");
    const cost = core.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const owned = Number(core.shards || 0) + Number(core.legacy_shards || 0);
    setText("core-detail-shards", cost ? `${owned} / ${required}` : "AZAMİ SEVİYE");
    const progress = document.getElementById("core-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, owned) : required; }
    const art = document.getElementById("core-detail-art");
    if (art) { art.textContent = visual.glyph; applyCoreVisualIdentity(art, core.id); }
    const stats = document.getElementById("core-detail-stats");
    if (stats) stats.innerHTML = `<div><span>ENERJİ</span><strong>${core.energy_per_second}/sn</strong></div><div><span>DEPO</span><strong>${core.energy_capacity}</strong></div><div><span>YETENEK</span><strong>${(core.skills || []).filter((skill) => skill.learned).length}</strong></div>`;
    const select = document.getElementById("core-detail-select");
    if (select) { select.disabled = !core.unlocked || core.selected; select.textContent = core.selected ? "SEÇİLDİ" : core.unlocked ? "SEÇ" : "KİLİTLİ"; }
    const upgrade = document.getElementById("core-detail-upgrade");
    const canUpgrade = core.unlocked && cost && owned >= Number(cost.shards) && Number(metaProgressionState?.flux_shards || 0) >= Number(cost.flux_shards);
    if (upgrade) { upgrade.disabled = !canUpgrade; upgrade.textContent = cost ? `YÜKSELT · ${cost.flux_shards} AKI` : "AZAMİ SEVİYE"; }
    setText("core-detail-status", !core.unlocked ? `Arena ${core.unlock_arena} seviyesinde açılır.` : cost && !canUpgrade ? `${cost.shards} parça ve ${cost.flux_shards} Akı gerekli.` : "");
    for (const button of document.querySelectorAll("[data-core-detail-tab]")) button.classList.toggle("is-active", button.dataset.coreDetailTab === "overview");
    renderCoreDetailTab("overview");
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
    setText("home-arena-name", rank.kind !== "arena" ? rank.name_tr : `Arena ${rank.index || 1}`);
    setText("home-arena-progress-copy", rank.next_stage ? `${rating} / ${ceiling} Kupa` : `${rating} Kupa`);
    const arenaTitle = rank.name_tr && !/^Arena\s+\d+$/i.test(rank.name_tr)
      ? `Arena ${rank.index || 1} · ${rank.name_tr}`
      : `Arena ${rank.index || 1}`;
    setText("arena-detail-title", rank.kind !== "arena" ? rank.name_tr : arenaTitle);
    setText("arena-detail-rating", `${rating} Kupa`);
    setText("arena-detail-range", rank.next_stage ? `${rating - floor} / ${ceiling - floor}` : "Azami aşama");
    setText("arena-detail-next", rank.next_stage ? `Sonraki: ${rank.next_stage.name_tr} · ${ceiling} Kupa` : "Efsanevi yol tamamlandı");
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
        segment.title = localizedMessage("arena.node_title", {
          trophies:localizedNumber(node.trophies),
          reward:node.description_tr ? localizedMessage("arena.node_reward_suffix", {
            description:localizedArenaRewardDescription(node),
          }) : "",
        });
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

  function sortModuleCollection(items) {
    const rarityOrder = { common:0, rare:1, epic:2, legendary:3 };
    const canon = new Map((globalThis.GRIDSHARD_CANON_MODULES || []).map(
      (item, index) => [item.id, { ...item, index }]
    ));
    const arena = (item) => Number(item.unlock_arena || canon.get(item.definition_id)?.unlock_arena || 1);
    const rarity = (item) => rarityOrder[item.rarity || canon.get(item.definition_id)?.rarity] ?? 4;
    // Arena progression first, then rarity and the stable canon order. Never
    // sort by a translated name: switching language must not move the cards.
    return [...items].sort((a, b) =>
      arena(a) - arena(b)
      || rarity(a) - rarity(b)
      || (canon.get(a.definition_id)?.index ?? Infinity) - (canon.get(b.definition_id)?.index ?? Infinity)
      || String(a.definition_id).localeCompare(String(b.definition_id), "en")
    );
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
    const sortedModules = sortModuleCollection(state.module_collection || []);
    for (const item of sortedModules) {
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
    setText("shop-flux-balance", `${state.flux_shards || 0} Akı`);
    setText("shop-credit-balance", `${state.circuit_credits || 0} DK`);
    const giftHost = document.getElementById("gift-chest-list");
    const inventory = state.chests?.inventory || [];
    const slots = state.chests?.slots || [];
    const ownedChests = (definitionId) => inventory.find((item) => item.definition_id === definitionId) || {
      count: slots.filter((slot) => slot.definition_id === definitionId).length,
      openable_count: slots.filter((slot) => slot.definition_id === definitionId).length,
      locked_count: 0,
    };
    if (giftHost) {
      giftHost.replaceChildren();
      // Hediye olarak yalnız Bronz Sandık kalır; 8 saatte bir yenilenir.
      const giftDefinitions = (state.chests?.definitions || []).filter(
        (definition) => definition.gift ?? definition.id === "field_3h"
      );
      for (const definition of giftDefinitions) {
        const card = document.createElement("article");
        card.className = "shop-chest-card gift-chest-card";
        const tier = chestTier(definition);
        card.dataset.tier = tier;
        const remaining = Math.max(0, Number(definition.claim_remaining_seconds || 0));
        card.dataset.definitionId = definition.id;
        card.dataset.claimRemaining = String(remaining);
        card.innerHTML = `${chestVisualMarkup(tier)}<strong>${definition.name_tr}</strong>`;
        if (remaining > 0) {
          const countdown = document.createElement("small");
          countdown.className = "chest-countdown";
          countdown.textContent = "Yenilenmesine " + formatChestCountdown(remaining);
          card.appendChild(countdown);
        }
        const actions = document.createElement("div");
        actions.className = "shop-chest-actions";
        const giftAction = document.createElement("button");
        giftAction.type = "button";
        giftAction.className = "gift-chest-action";
        giftAction.textContent = remaining > 0 ? formatChestCountdown(remaining) : "HEDİYE SANDIK AÇ";
        giftAction.disabled = Boolean(
          state.unavailable
          || remaining > 0
          || definition.claim_available === false
        );
        giftAction.addEventListener("click", () => claimGiftChest(definition.id));
        actions.appendChild(giftAction);
        card.appendChild(actions);
        giftHost.appendChild(card);
      }
    }
    const chestStore = state.shop?.chest_store || null;
    const saleCopy = document.getElementById("chest-store-sale");
    if (saleCopy) {
      saleCopy.textContent = chestStore?.sale_active
        ? `BUGÜN %${chestStore.discount_percent || 40} İNDİRİM`
        : "Her ay sürpriz bir günde %40 indirim";
      saleCopy.dataset.sale = String(Boolean(chestStore?.sale_active));
    }
    const storeHost = document.getElementById("chest-store-list");
    if (storeHost) {
      storeHost.replaceChildren();
      for (const item of chestStore?.items || []) {
        const owned = ownedChests(item.definition_id);
        const ownedCount = Math.max(0, Number(owned.count || 0));
        const openableCount = Math.max(0, Number(owned.openable_count || 0));
        const currency = item.currency === "flux_shards" ? "Akı" : "DK";
        const card = document.createElement("article");
        card.className = "shop-chest-card chest-store-card";
        card.dataset.tier = item.tier;
        card.dataset.storeChestId = item.definition_id;
        card.dataset.sale = String(Number(item.cost) < Number(item.base_cost));
        card.innerHTML = `${chestVisualMarkup(item.tier)}<strong>${item.name_tr}</strong>`;
        if (ownedCount > 0) {
          const inventoryStatus = document.createElement("small");
          inventoryStatus.className = "chest-inventory-status";
          inventoryStatus.textContent = `Envanter ${openableCount} / ${ownedCount} açılabilir`;
          card.appendChild(inventoryStatus);
        }
        const actions = document.createElement("div");
        actions.className = "shop-chest-actions";
        const buy = document.createElement("button");
        buy.type = "button";
        buy.className = "chest-store-buy";
        if (Number(item.cost) < Number(item.base_cost)) {
          const base = document.createElement("s");
          base.textContent = `${item.base_cost} ${currency}`;
          buy.append(base, document.createTextNode(` ${item.cost} ${currency}`));
        } else {
          buy.textContent = `${item.cost} ${currency}`;
        }
        buy.disabled = Boolean(state.unavailable || Number(state[item.currency] || 0) < Number(item.cost));
        buy.addEventListener("click", () => buyStoreChest(item.definition_id));
        actions.appendChild(buy);
        if (ownedCount > 0) {
          const openAllAction = document.createElement("button");
          openAllAction.type = "button";
          openAllAction.className = "chest-open-all-action";
          openAllAction.textContent = "HEPSİNİ AÇ";
          openAllAction.disabled = Boolean(state.unavailable || openableCount === 0);
          openAllAction.addEventListener("click", () => openAllAvailableChests(item.definition_id));
          actions.appendChild(openAllAction);
        }
        card.appendChild(actions);
        storeHost.appendChild(card);
      }
    }
    renderPaidStore();
    ensureShopCountdownTimer();
 }

 function formatChestCountdown(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours) return `${hours}s ${String(minutes).padStart(2, "0")}dk`;
    if (minutes) return `${minutes}dk ${String(secs).padStart(2, "0")}sn`;
    return `${secs}sn`;
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
        if (countdown) countdown.textContent = "Yenilenmesine " + formatChestCountdown(next);
        if (button && next === 0 && previous > 0) becameAvailable = true;
        if (button && next === 0 && !metaProgressionState?.unavailable) {
          button.disabled = false;
          button.textContent = "HEDİYE SANDIK AÇ";
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
      entry = {requestId: operationRequestId("meta"), inFlight: false};
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
    const storeItem = metaProgressionState?.shop?.chest_store?.items?.find(
      (item) => item.definition_id === (receipt.store_chest_id || receipt.definition_id)
    );
    const tier = storeItem?.tier || chestTier(definition || { id: receipt.definition_id });
    const rewards = receipt.rewards || {};
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const title = document.getElementById("chest-reveal-title");
    const host = document.getElementById("chest-reveal-rewards");
    const kicker = document.getElementById("chest-reveal-kicker");
    const close = document.getElementById("chest-reveal-close");
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (visual) visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
    if (title) title.textContent = definition?.name_tr || storeItem?.name_tr || "Sandık";
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
    if (title) title.textContent = `${definition?.name_tr || "Sandık"} · ${receipts.length} açıldı`;
    if (kicker) {
      kicker.hidden = false;
      kicker.textContent = batchReceipt?.partial
        ? `${receipts.length} AÇILDI · ${batchReceipt.remaining_count || 0} KALDI`
        : "TÜM AÇILABİLİR SANDIKLAR AÇILDI";
    }
    if (host) {
      host.replaceChildren();
      const section = document.createElement("section");
      section.className = "bulk-chest-reward";
      const label = document.createElement("small");
      label.textContent = `${receipts.length} SANDIĞIN TOPLAM ÖDÜLÜ`;
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
    if (host) host.innerHTML = `<div><span>${error instanceof Error ? error.message : String(error)}</span></div>`;
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  function restoreShopAction({ chestId = null, definitionId = null, storeChestId = null } = {}) {
    let card = null;
    if (chestId) card = [...document.querySelectorAll("[data-chest-id]")]
      .find((item) => item.dataset.chestId === String(chestId));
    if (!card && definitionId) card = [...document.querySelectorAll("[data-definition-id]")]
      .find((item) => item.dataset.definitionId === String(definitionId));
    if (!card && storeChestId) card = [...document.querySelectorAll("[data-store-chest-id]")]
      .find((item) => item.dataset.storeChestId === String(storeChestId));
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
    if (title) title.textContent = chest.name_tr || definition?.name_tr || "Hediye Sandık";
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    if (host) {
      host.innerHTML = "<div><span>SANDIK</span><strong>Açılmaya hazır</strong></div>";
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  async function buyStoreChest(definitionId) {
    const status = document.getElementById("shop-action-status");
    const item = metaProgressionState?.shop?.chest_store?.items?.find(
      (entry) => entry.definition_id === definitionId
    );
    showChestOpening({ tier: item?.tier || "bronze", title: item?.name_tr || "Sandık" });
    try {
      const payload = await metaProgressionMutation(
        `/store/${encodeURIComponent(participantPlayerId)}/chests/${encodeURIComponent(definitionId)}/buy`
      );
      if (status) status.textContent = payload.receipt?.sale
        ? `İndirimli alım: liste fiyatı ${payload.receipt.base_cost}, ödenen ${payload.receipt.cost}.`
        : "";
      showChestReveal(payload.receipt);
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      restoreShopAction({ storeChestId: definitionId });
      showChestFailure(error);
    }
  }

  const PAID_ICON_MARKUP = {
    flux_shards: '<svg viewBox="0 0 24 24"><path d="m12 2 4 6 6 4-6 4-4 6-4-6-6-4 6-4Z"/><circle cx="12" cy="12" r="2.3"/></svg>',
    circuit_credits: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7 12h3l2-4 2 8 2-4h2"/></svg>',
  };

  async function loadStoreState() {
    try {
      storeState = await requestJsonWithDeadline(
        `/store/${encodeURIComponent(participantPlayerId)}${nativeStore?.adQuery() || ""}`,
        { cache:"no-store" },
        12000
      );
    } catch (_error) {
      return { ok:false };
    }
    renderPaidStore();
    renderSeasonPremiumPurchase();
    renderPostMatchPremium();
    renderPostMatchAdReward();
    void refreshNativeProductPrices();
    void refreshNativeAdConsent();
    void recoverNativePurchases();
    return { ok:true, state:storeState };
  }

  function createPaidProductCard(product, { premium = false, provider = null } = {}) {
    const card = document.createElement("article");
    card.className = `paid-product-card${premium ? " is-premium" : ""}`;
    card.dataset.productId = product.id;
    card.dataset.active = String(Boolean(product.active));
    if (product.currency) card.dataset.currency = product.currency;
    const icon = document.createElement("i");
    icon.className = `resource-symbol ${product.currency === "flux_shards" ? "resource-symbol-flux" : product.currency === "circuit_credits" ? "resource-symbol-credit" : "resource-symbol-premium"}`;
    icon.setAttribute("aria-hidden", "true");
    if (PAID_ICON_MARKUP[product.currency]) icon.innerHTML = PAID_ICON_MARKUP[product.currency];
    else icon.textContent = "★";
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.name_tr;
    copy.appendChild(name);
    const detail = document.createElement("small");
    detail.textContent = premium
      ? String(product.description_tr || "")
      : product.bonus_percent ? `+%${product.bonus_percent} bonus` : "Temel paket";
    copy.appendChild(detail);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = product.active ? "ETKİN" : paidProductPrice(product);
    button.disabled = Boolean(product.active || !provider || purchaseInFlight || !paidProductAvailable(product));
    button.addEventListener("click", () => purchasePaidProduct(product.id));
    card.append(icon, copy, button);
    return card;
  }

  // Satın alma ve reklam sağlayıcısı: yerel uygulamada sunucunun açtığı gerçek
  // mağaza/AdMob, aksi hâlde sunucunun deneme sağlayıcısı (üretimde yok).
  function currentPurchaseProvider() {
    return nativeStore
      ? nativeStore.purchaseProvider(storeState)
      : storeState?.providers?.purchase || null;
  }

  function paidProductAvailable(product) {
    return !["google_play","app_store"].includes(currentPurchaseProvider())
      || Boolean(nativeStore?.priceForProduct?.(product));
  }

  function paidProductPrice(product, fallback = "") {
    if (["google_play","app_store"].includes(currentPurchaseProvider())) {
      return nativeStore?.priceForProduct?.(product)?.priceLabel || "Şu an kullanılamıyor";
    }
    return String(product?.price_label_tr || fallback);
  }

  async function refreshNativeProductPrices() {
    const state = storeState;
    await nativeStore?.refreshProductPrices?.(paidProducts(),state);
    if (storeState !== state) return; // Do not rerender an old account response.
    renderPaidStore(); renderSeasonPremiumPurchase(); renderPostMatchPremium();
  }

  function currentAdProvider() {
    return nativeStore
      ? nativeStore.adProvider(storeState)
      : storeState?.providers?.ads || null;
  }

  function renderAdsPrivacyOptions() {
    const panel = document.getElementById("ad-privacy-panel");
    const button = document.getElementById("ad-privacy-options");
    const required = currentAdProvider() === "admob" && nativeStore?.adsPrivacyOptionsRequired === true;
    if (panel) panel.hidden = !required;
    if (button) button.disabled = !required || nativeStore?.adsBusy === true;
  }

  async function refreshNativeAdConsent() {
    // A background store refresh must not overlap the native consent/reward UI.
    if (nativeStore?.adsBusy) { renderAdsPrivacyOptions(); return; }
    try {
      await nativeStore?.refreshAdsConsent({ storeState });
    } catch (_error) {
      // Failed UMP refresh leaves ads gated, not gameplay or account startup.
    } finally { renderAdsPrivacyOptions(); }
  }

  function paidProducts() {
    return [
      storeState?.season_pass,
      storeState?.battle_premium,
      ...(storeState?.flux_packs || []),
      ...(storeState?.credit_packs || []),
    ].filter(Boolean);
  }

  function paidProductById(productId) {
    return paidProducts().find((product) => product.id === productId) || null;
  }

  function paidProductByStoreId(storeProductId) {
    return paidProducts().find((product) => product.store_product_id === storeProductId) || null;
  }

  // Uygulama ödeme ile sunucu yanıtı arasında kapanırsa alım mağazada
  // bitirilmemiş kalır. Açılışta ve mağaza yeni işlem bildirdiğinde bu hesaba
  // bağlı alımlar sessizce sunucuya gönderilir; sunucu aynı makbuzu ikinci kez
  // vermez (docs/STORE_PURCHASES.md).
  let nativePurchaseRecoveryStarted = false;

  async function submitRecoveredPurchase(native) {
    const provider = currentPurchaseProvider();
    const product = paidProductByStoreId(native.productIdentifier);
    if (
      (provider !== "google_play" && provider !== "app_store")
      || !product
      || nativeStore.isProcessed(native)
      || [...pendingNativePurchases.values()].some((item) => (
        nativeStore.purchaseKey(item) === nativeStore.purchaseKey(native)
      ))
    ) {
      return;
    }
    try {
      const payload = await requestJsonWithDeadline(
        `/store/${encodeURIComponent(participantPlayerId)}/purchases${nativeStore?.adQuery() || ""}`,
        {
          method:"POST",
          body:JSON.stringify({
            product_id:product.id,
            provider,
            transaction_id:native.transactionId,
            purchase_token:native.purchaseToken,
          }),
        },
        20000
      );
      await nativeStore.finishPurchase(native, {
        granted:true,
        consumed:Boolean(payload.receipt?.consumed),
      });
      nativeStore.markProcessed(native);
      storeState = payload.store || storeState;
      if (payload.meta_progression) metaProgressionState = payload.meta_progression;
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      renderMetaHubScreens();
      renderPaidStore();
    } catch (error) {
      if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
        await nativeStore.finishPurchase(native, { granted:false });
        nativeStore.markProcessed(native);
      }
      // Geçici hata (503, ağ): bir sonraki açılışta yeniden denenir.
    }
  }

  async function recoverNativePurchases() {
    const provider = currentPurchaseProvider();
    const accountToken = storeState?.account_token || "";
    if (
      !nativeStore
      || nativePurchaseRecoveryStarted
      || (provider !== "google_play" && provider !== "app_store")
      || !accountToken
    ) {
      return;
    }
    nativePurchaseRecoveryStarted = true;
    nativeStore.onTransactionUpdated(
      (native) => { void submitRecoveredPurchase(native); },
      { accountToken }
    );
    const storeProductIds = paidProducts()
      .map((product) => product.store_product_id)
      .filter(Boolean);
    for (const native of await nativeStore.unfinishedPurchases(storeProductIds, { accountToken })) {
      await submitRecoveredPurchase(native);
    }
  }

  function renderPaidStore() {
    const premiumHost = document.getElementById("paid-store-premium");
    const fluxHost = document.getElementById("paid-flux-packs");
    const creditHost = document.getElementById("paid-credit-packs");
    const mode = document.getElementById("paid-store-mode");
    const provider = currentPurchaseProvider();
    if (mode) {
      mode.textContent = !storeState
        ? "Yükleniyor…"
        : provider === "test"
          ? "DENEME MODU · gerçek ödeme alınmaz"
          : provider ? "" : "Ödeme altyapısı hazırlanıyor";
      mode.dataset.mode = provider || "unavailable";
    }
    if (premiumHost) {
      premiumHost.replaceChildren();
      for (const product of [storeState?.season_pass, storeState?.battle_premium].filter(Boolean)) {
        premiumHost.appendChild(createPaidProductCard(product, { premium:true, provider }));
      }
    }
    for (const [host, packs] of [[fluxHost, storeState?.flux_packs], [creditHost, storeState?.credit_packs]]) {
      if (!host) continue;
      host.replaceChildren();
      for (const pack of packs || []) host.appendChild(createPaidProductCard(pack, { provider }));
    }
  }

  async function purchasePaidProduct(productId, { status = null } = {}) {
    const statusElement = status || document.getElementById("shop-action-status");
    const setStatus = (message, state = "") => {
      if (!statusElement) return;
      statusElement.textContent = message;
      statusElement.dataset.status = state;
    };
    const provider = currentPurchaseProvider();
    if (!provider) {
      setStatus("Ödeme altyapısı hazırlanıyor; gerçek ödeme henüz açılmadı.", "error");
      return { ok:false };
    }
    if (purchaseInFlight) return { ok:false };
    purchaseInFlight = true;
    const realStore = provider === "google_play" || provider === "app_store";
    let transactionId = "";
    let purchaseToken = "";
    let native = null;
    renderPaidStore();
    try {
      if (realStore) {
        // Mağazada ödenmiş ama sunucuya işlenmemiş alım varsa yeniden ödeme
        // penceresi açılmaz; aynı makbuz sunucuya tekrar gönderilir.
        native = pendingNativePurchases.get(productId) || null;
        if (!native) {
          const product = paidProductById(productId);
          if (!product?.store_product_id) throw new Error("Ürün mağazada bulunamadı.");
          setStatus("Mağaza ödeme penceresi açılıyor…", "pending");
          // Alım ödeme penceresinde bu hesaba bağlanır; sunucu başka hesabın
          // makbuzunu kabul etmez.
          native = await nativeStore.purchase(product, {
            accountToken:storeState?.account_token || "",
          });
          pendingNativePurchases.set(productId, native);
        }
        transactionId = native.transactionId;
        purchaseToken = native.purchaseToken;
        setStatus("Ödeme doğrulanıyor…", "pending");
      } else {
        // Aynı ürün için yarım kalan istek aynı işlem kimliğiyle yinelenir; ürün iki kez verilmez.
        transactionId = pendingPurchaseIds.get(productId);
        if (!transactionId) {
          transactionId = operationRequestId("purchase");
          pendingPurchaseIds.set(productId, transactionId);
        }
        setStatus(
          provider === "test" ? "Deneme alımı işleniyor… Gerçek ödeme alınmaz." : "Ödeme doğrulanıyor…",
          "pending"
        );
      }
      const payload = await requestJsonWithDeadline(
        `/store/${encodeURIComponent(participantPlayerId)}/purchases${nativeStore?.adQuery() || ""}`,
        {
          method:"POST",
          body:JSON.stringify({
            product_id:productId,
            provider,
            transaction_id:transactionId,
            purchase_token:purchaseToken,
          }),
        },
        20000
      );
      pendingPurchaseIds.delete(productId);
      pendingNativePurchases.delete(productId);
      if (native) {
        // iOS'ta işlem bitirilir; Android'de sunucu tüketemediyse tüketilir.
        await nativeStore.finishPurchase(native, {
          granted:true,
          consumed:Boolean(payload.receipt?.consumed),
        });
        nativeStore.markProcessed(native);
      }
      storeState = payload.store || storeState;
      if (payload.meta_progression) metaProgressionState = payload.meta_progression;
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      renderMetaHubScreens();
      setStatus(
        payload.receipt?.test
          ? "Deneme alımı tamamlandı; gerçek ödeme alınmadı."
          : "Satın alma tamamlandı.",
        "success"
      );
      return { ok:true, payload };
    } catch (error) {
      if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
        pendingPurchaseIds.delete(productId);
        // Sunucu makbuzu reddetti (ör. hak zaten etkin): aynı makbuz yeniden
        // gönderilmez. Google onaylanmamış alımı iade eder; iOS'ta işlem
        // bitirilir, iadeyi oyuncu Apple'dan ister (bkz. STORE_PURCHASES.md).
        // 503 (geçici doğrulama sorunu) ve ağ hatasında alım saklanır.
        pendingNativePurchases.delete(productId);
        if (native) {
          await nativeStore.finishPurchase(native, { granted:false });
          nativeStore.markProcessed(native);
        }
      }
      setStatus(error instanceof Error ? error.message : String(error), "error");
      return { ok:false, error };
    } finally {
      purchaseInFlight = false;
      renderPaidStore();
      renderSeasonPremiumPurchase();
      renderPostMatchPremium();
    }
  }

  function renderSeasonPremiumPurchase() {
    const button = document.getElementById("season-premium-buy");
    if (!button) return;
    const pass = storeState?.season_pass || null;
    const engagementPass = profileState.profile?.engagement?.premium_pass || null;
    const active = Boolean(pass?.active ?? engagementPass?.active);
    button.hidden = active || !(pass || engagementPass?.purchasable);
    button.disabled = Boolean(!currentPurchaseProvider() || purchaseInFlight || !paidProductAvailable(pass));
    button.textContent = `ÜCRETLİ GEÇİŞİ AÇ · ${paidProductPrice(pass, engagementPass?.price_label_tr || "99,99 TL")}`;
  }

  function renderPostMatchPremium() {
    const host = document.getElementById("post-match-premium");
    if (!host) return;
    const progression = progressionState.viewModel();
    const product = storeState?.battle_premium || null;
    const bonus = Number(product?.bonus_percent || 50);
    const eligible = Boolean(progression?.profileProgressionApplied)
      && (Number(progression?.circuitCreditsAwarded || 0) > 0 || Number(progression?.xpAwarded || 0) > 0);
    const applied = Boolean(progression?.battlePremiumApplied);
    const copy = document.getElementById("post-match-premium-copy");
    const buy = document.getElementById("post-match-premium-buy");
    host.hidden = !eligible || (!applied && !product);
    host.dataset.active = String(applied || Boolean(product?.active));
    if (copy) {
      copy.textContent = applied
        ? `Bu savaşta Savaş Premium uygulandı: Devre Kredisi ve Deneyim +%${bonus} (kupa hariç).`
        : product?.active
          ? `Savaş Premium etkin: sonraki savaşlarda Devre Kredisi ve Deneyim +%${bonus} (kupa hariç).`
          : `Savaş Premium ile bu sezon Devre Kredisi ve Deneyim +%${bonus} (kupa hariç).`;
    }
    if (buy) {
      buy.hidden = applied || Boolean(product?.active) || !product;
      buy.disabled = Boolean(!currentPurchaseProvider() || purchaseInFlight || !paidProductAvailable(product));
      buy.textContent = `SAVAŞ PREMIUM · ${paidProductPrice(product,"99,99 TL")}`;
    }
  }

  function renderPostMatchAdReward() {
    const host = document.getElementById("post-match-ad-reward");
    if (!host) return;
    const progression = progressionState.viewModel();
    const battleId = postMatchSync.lastBattleId;
    const hasRewards = Boolean(progression?.profileProgressionApplied)
      && (Number(progression?.circuitCreditsAwarded || 0) > 0 || Number(progression?.xpAwarded || 0) > 0);
    const provider = currentAdProvider();
    const claimed = battleId ? adRewardReceipts.get(battleId) : null;
    const isPublisherTest = provider === "admob" && storeState?.providers?.ad_policy?.mode === "test";
    host.hidden = !battleId || !hasRewards;
    host.dataset.claimed = String(Boolean(claimed));
    const button = document.getElementById("post-match-ad-button");
    const copy = document.getElementById("post-match-ad-copy");
    const heading = document.getElementById("post-match-ad-heading");
    if (heading) heading.textContent = localizedUiText(isPublisherTest
      ? "ÖDÜLLÜ REKLAM TESTİ" : "REKLAM İZLE, ÖDÜLÜ İKİYE KATLA");
    if (button) {
      button.disabled = !provider || Boolean(claimed) || adRewardPending;
      button.textContent = claimed
        ? "x2 ÖDÜL ALINDI"
        : !provider ? "REKLAM HENÜZ HAZIR DEĞİL"
        : adRewardPending ? "REKLAM OYNATILIYOR…"
        : isPublisherTest ? localizedUiText("▶ TEST REKLAMINI AÇ") : "▶ REKLAM İZLE · x2";
    }
    if (copy) {
      copy.textContent = claimed
        ? `+${claimed.circuit_credits} Devre Kredisi ve +${claimed.xp} Deneyim eklendi · kupa hariç`
        : !provider ? "Ödüllü reklam sağlayıcısı bu sunucuda henüz etkin değil."
        : isPublisherTest ? localizedUiText("Test reklamı · gerçek ek ödül verilmez")
        : "Devre Kredisi ve Deneyim x2 · kupa hariç";
    }
  }

  function playTestRewardAd(seconds = 5) {
    const dialog = document.getElementById("reward-ad-dialog");
    const countdown = document.getElementById("reward-ad-countdown");
    return new Promise((resolve) => {
      let remaining = seconds;
      if (countdown) countdown.textContent = String(remaining);
      if (dialog?.showModal && !dialog.open) dialog.showModal();
      else dialog?.setAttribute("open", "");
      const timer = window.setInterval(() => {
        remaining -= 1;
        if (countdown) countdown.textContent = String(Math.max(0, remaining));
        if (remaining > 0) return;
        window.clearInterval(timer);
        if (dialog?.close) dialog.close();
        else dialog?.removeAttribute("open");
        resolve();
      }, 1000);
    });
  }

  async function claimAdReward(battleId, provider) {
    const request = () => requestJsonWithDeadline(
      `/profile/${encodeURIComponent(participantPlayerId)}/battles/${encodeURIComponent(battleId)}/ad-reward`,
      {
        method:"POST",
        body:JSON.stringify({ request_id:operationRequestId("ad"), provider, ...(provider === "admob" ? nativeStore?.adCapability() : {}) }),
      },
      15000
    );
    if (provider !== "admob") return request();
    // AdMob'un imzalı SSV geri çağrısı sunucuya reklam kapandıktan birkaç
    // saniye sonra ulaşabilir; ödül talebi kısa aralıklarla yinelenir.
    let lastError = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        if (Number(error?.status) !== 422) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    }
    throw lastError;
  }

  async function watchRewardAd() {
    const battleId = postMatchSync.lastBattleId;
    const provider = currentAdProvider();
    const status = document.getElementById("post-match-store-status");
    if (!battleId || !provider || adRewardPending || adRewardReceipts.has(battleId)) return;
    adRewardPending = true;
    renderPostMatchAdReward();
    try {
      if (provider === "admob") {
        await nativeStore.showRewardedAd({ storeState, userId:participantPlayerId, battleId });
        if (storeState?.providers?.ad_policy?.mode === "test") {
          if (status) status.textContent = localizedUiText("Test reklamı tamamlandı; gerçek ek ödül verilmez.");
          return; // Test ads are not proof of a signed SSV callback.
        }
      } else {
        await playTestRewardAd();
      }
      const payload = await claimAdReward(battleId, provider);
      adRewardReceipts.set(battleId, payload.receipt);
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      if (status) status.textContent = "";
      renderPostMatchRewards();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      adRewardPending = false;
      renderPostMatchAdReward();
      renderAdsPrivacyOptions();
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
      title: `${definition?.name_tr || "Sandık"} sandıkları`,
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
      title: definition?.name_tr || "Hediye Sandık",
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
      if (status) status.textContent = `${presetName || "Aktif savaş destesi"} kaydedildi.`;
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

  function createModuleEffectList(effectLines = []) {
    const section = document.createElement("section");
    section.className = "module-effect-panel";
    const heading = document.createElement("strong");
    heading.textContent = "GERÇEK SAVAŞ ETKİLERİ";
    const list = document.createElement("ul");
    for (const effectLine of effectLines) {
      const item = document.createElement("li");
      item.textContent = localizedUiText(effectLine);
      list.appendChild(item);
    }
    if (!list.childElementCount) {
      const item = document.createElement("li");
      item.textContent = "Bu modülün ek sayısal etkisi yok.";
      list.appendChild(item);
    }
    section.append(heading, list);
    return section;
  }

  const MODULE_RARITY_RULE_TR = {
    common: "Tek ve net davranış.",
    rare: "Temel davranışa oyuncunun kurduğu bir koşul ekler.",
    epic: "Zamanla biriken bir durum ya da risk–ödül taşır.",
    legendary: "Savaşın bir kuralını değiştiren imza mekaniği taşır.",
  };

  function createModuleIdentityPanel(
    item,
    { noAdvantageTr="Enderlik CAN, hasar, bekleme veya enerji avantajı vermez." }={}
  ) {
    const panel = document.createElement("section");
    panel.className = "module-identity-panel";
    const rarity = String(item.rarity || "common").toLowerCase();
    const signature = item.signature_mechanic
      || (item.shared_behavior_tr ? `Şimdilik ${item.shared_behavior_tr} ile aynı temel davranışı kullanır.` : "");
    const rows = [
      [`ENDERLİK · ${moduleRarityLabel(rarity).toLocaleUpperCase("tr-TR")}`, `${MODULE_RARITY_RULE_TR[rarity] || MODULE_RARITY_RULE_TR.common} ${noAdvantageTr}`, "is-rarity"],
      ["İMZA MEKANİĞİ", signature, ""],
      ["SAVAŞTA NASIL GÖRÜLÜR", item.telegraph_tr, ""],
      ["KARŞI OYUN", item.counterplay_tr, ""],
    ];
    for (const [label, value, className] of rows) {
      if (!value) continue;
      const row = document.createElement("div");
      row.className = `module-identity-row${className ? ` ${className}` : ""}`;
      row.dataset.rarity = rarity;
      const name = document.createElement("span");
      name.textContent = label;
      const copy = document.createElement("strong");
      copy.textContent = localizedUiText(value);
      row.append(name, copy);
      panel.appendChild(row);
    }
    return panel;
  }

  // İstatistik sekmesinin değer karoları. CAN, hasar ve etki çubukları
  // koleksiyondaki en yüksek değere oranlanır; enderlik bu değerleri artırmaz.
  function createModuleStatTiles(item) {
    const stats = item.stats || {};
    const collection = metaProgressionState?.module_collection || [];
    const peak = (key) => Math.max(1, ...collection.map((module) => Number(module.stats?.[key] || 0)));
    const number = (value, digits = 0) => Number(value || 0).toLocaleString(uiLocale(), { maximumFractionDigits:digits });
    const list = document.createElement("dl");
    list.className = "module-stat-tiles";
    for (const tile of [
      { key:"hp", glyph:"✚", label:"CAN", value:number(stats.max_hp), meter:Number(stats.max_hp || 0) / peak("max_hp") },
      { key:"damage", glyph:"✹", label:"HASAR", value:number(stats.base_damage), meter:Number(stats.base_damage || 0) / peak("base_damage") },
      { key:"cooldown", glyph:"◷", label:"BEKLEME", value:`${number(Number(stats.cooldown_ms || 0) / 1000, 1)} sn` },
      { key:"effect", glyph:"✦", label:"ETKİ ÇARPANI", value:`×${number(stats.effect_multiplier, 2)}`, meter:Number(stats.effect_multiplier || 0) / peak("effect_multiplier") },
      { key:"energy", glyph:"◌", label:"ENERJİ TÜKETİMİ", value:`${number(stats.energy_consumption, 1)}/sn` },
      { key:"current", glyph:"ϟ", label:"AKIM MALİYETİ", value:number(item.current_cost) },
    ]) {
      const row = document.createElement("div");
      row.dataset.stat = tile.key;
      const name = document.createElement("dt");
      const glyph = document.createElement("i");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = tile.glyph;
      name.append(glyph, document.createTextNode(tile.label));
      const value = document.createElement("dd");
      value.textContent = tile.value;
      row.append(name, value);
      if (tile.meter !== undefined) {
        const meter = document.createElement("span");
        meter.className = "module-stat-meter";
        meter.setAttribute("aria-hidden", "true");
        meter.style.setProperty("--stat-fill", `${Math.round(Math.max(0, Math.min(1, tile.meter)) * 100)}%`);
        row.appendChild(meter);
      }
      list.appendChild(row);
    }
    return list;
  }

  // Güçlü, zayıf ve uyumlu olduğu modüller simgeli etiketler olarak dizilir.
  function createModuleCounterGrid(item) {
    const collection = metaProgressionState?.module_collection || [];
    const counters = document.createElement("div");
    counters.className = "module-counter-grid";
    for (const [label, ids, className] of [["GÜÇLÜ OLDUĞU", item.strong_against, "is-strong"], ["ZAYIF OLDUĞU", item.weak_against, "is-weak"], ["UYUMLU OLDUĞU", item.synergy_with, "is-synergy"]]) {
      const card = document.createElement("section");
      card.className = className;
      const heading = document.createElement("strong");
      heading.textContent = label;
      const chips = document.createElement("span");
      chips.className = "module-counter-chips";
      for (const id of ids || []) {
        const collectionItem = collection.find((module) => module.definition_id === id);
        const definition = moduleDefinitions.find((module) => module.definitionId === id);
        const chip = document.createElement("span");
        chip.className = "module-counter-chip";
        chip.dataset.category = collectionItem?.category || definition?.category || "";
        const glyph = document.createElement("b");
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = moduleIconFor(definition || { nameTr:collectionItem?.name_tr || id });
        const name = document.createElement("em");
        name.textContent = collectionItem?.name_tr || definition?.nameTr || id;
        chip.append(glyph, name);
        chips.appendChild(chip);
      }
      if (!chips.childElementCount) {
        const none = document.createElement("em");
        none.className = "module-counter-empty";
        none.textContent = "Özel karşılık yok";
        chips.appendChild(none);
      }
      card.append(heading, chips);
      counters.appendChild(card);
    }
    return counters;
  }

  // Modül bilgi penceresi sekmeleri koyu zeminli kartlardan oluşur: Genel
  // kimlik ve etkileri, İstatistik değer karolarını, Yetenekler iki dallı
  // seviye yolunu gösterir. İçerik uzarsa sekme alanı kendi içinde kayar.
  function renderModuleDetailTab(tabName) {
    const item = activeMetaModule();
    const host = document.getElementById("module-detail-tab-content");
    if (!item || !host) return;
    host.replaceChildren();
    host.dataset.tab = tabName;
    host.dataset.category = item.category || "";
    host.scrollTop = 0;
    const text = document.createElement("p");
    text.className = "module-detail-tab-intro";
    if (tabName === "stats") {
      text.textContent = "Savaş değerleri seviye ve yeteneklerden gelir; enderlik bu değerleri artırmaz.";
      const chips = document.createElement("div");
      chips.className = "module-stat-chips";
      for (const [label, value, kind] of [
        ["SINIF", poolCategoryLabel(item.category), "category"],
        ["ENDERLİK", moduleRarityLabel(item.rarity), "rarity"],
      ]) {
        const chip = document.createElement("span");
        chip.dataset.chip = kind;
        chip.dataset.category = item.category || "";
        chip.dataset.rarity = String(item.rarity || "common").toLowerCase();
        const name = document.createElement("small");
        name.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = value;
        chip.append(name, valueNode);
        chips.appendChild(chip);
      }
      host.appendChild(chips);
      host.appendChild(createModuleStatTiles(item));
      host.appendChild(createModuleCounterGrid(item));
    } else if (tabName === "talents") {
      const selectedTalent = (item.talents || [])
        .flatMap((node) => node.choices || [])
        .find((choice) => (item.talents || []).some((node) => node.selected === choice.id));
      text.textContent = selectedTalent?.description_tr || "Yetenekler seviye ilerlemesidir, enderlik bonusu değildir. Açıklamasını görmek için bir yeteneğe dokun.";
      const tree = document.createElement("div");
      tree.className = "module-talent-path";
      for (const node of item.talents || []) {
        const row = document.createElement("section");
        row.className = "module-talent-node";
        row.dataset.selected = node.selected || "";
        row.dataset.reachable = String(Number(item.level) + 1 >= node.level);
        // Seviye rozeti iki dalın ortasında durur: sol dal · rozet · sağ dal.
        const level = document.createElement("span");
        level.className = "module-talent-level";
        const levelValue = document.createElement("strong");
        levelValue.textContent = `SV ${node.level}`;
        const levelCost = document.createElement("small");
        levelCost.textContent = `${node.flux_cost} Akı`;
        level.append(levelValue, levelCost);
        const choices = document.createElement("div");
        choices.className = "module-talent-choices";
        row.appendChild(choices);
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
          if (choiceIndex === 0) choices.appendChild(level);
        });
        tree.appendChild(row);
      }
      host.appendChild(tree);
      const selectedCount = Number(
        item.selected_talent_count
        ?? (item.talents || []).filter((node) => Boolean(node.selected)).length
      );
      if (selectedCount > 0) {
        const resetCost = Number(item.talent_reset_cost_flux || selectedCount * 25);
        const resetPanel = document.createElement("section");
        resetPanel.className = "module-talent-reset-panel";
        const resetCopy = document.createElement("span");
        resetCopy.textContent = `${selectedCount} seçili yetenek yeniden dağıtılabilir.`;
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "module-talent-reset";
        resetButton.textContent = `YETENEKLERİ SIFIRLA · ${resetCost} AKI`;
        resetButton.disabled = Number(metaProgressionState?.flux_shards || 0) < resetCost;
        resetButton.addEventListener("click", async () => {
          resetButton.disabled = true;
          const status = document.getElementById("module-detail-status");
          if (status) status.textContent = "Yetenek seçimleri sıfırlanıyor…";
          try {
            await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${item.definition_id}/talents/reset`);
            renderModuleDetailTab("talents");
            if (status) status.textContent = `${selectedCount} yetenek seçimi sıfırlandı.`;
          } catch (error) {
            if (status) status.textContent = error instanceof Error ? error.message : String(error);
            resetButton.disabled = false;
          }
        });
        resetPanel.append(resetCopy, resetButton);
        host.appendChild(resetPanel);
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
      host.appendChild(createModuleIdentityPanel(item));
      host.appendChild(overview);
      host.appendChild(createModuleEffectList(item.effect_lines));
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
    const universalShards = Number(metaProgressionState?.universal_module_shards || 0);
    const totalUsableShards = Number(item.shards || 0) + universalShards;
    setText("module-detail-shards", cost ? `${item.shards || 0} + ${universalShards} evrensel / ${required}` : "AZAMİ SEVİYE");
    document.getElementById("module-detail-shard-icon")?.replaceChildren(
      createModulePuzzlePiece({ category:item.category || "", glyph:moduleIconFor(definition) })
    );
    const progress = document.getElementById("module-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, totalUsableShards) : required; }
    const art = document.getElementById("module-detail-art");
    if (art) {
      art.dataset.category = item.category || "";
      art.dataset.module = item.definition_id || "";
      art.textContent = moduleIconFor(definition);
      art.setAttribute("aria-label", `${item.name_tr} görseli`);
    }
    const stats = document.getElementById("module-detail-stats");
    if (stats) stats.innerHTML = `<div><span>CAN</span><strong>${item.stats?.max_hp ?? definition.maxHp}</strong></div><div><span>AKIM</span><strong>ϟ ${item.current_cost ?? definition.currentCost}</strong></div><div><span>HASAR</span><strong>${item.stats?.base_damage || 0}</strong></div>`;
    const upgrade = document.getElementById("module-detail-upgrade");
    const reason = !item.unlocked ? `${item.unlock_trophies ?? 0} kupada açılır.` : !cost ? "Azami seviye." : totalUsableShards < required ? `Gerekli parça: ${totalUsableShards}/${required}` : Number(metaProgressionState?.circuit_credits || 0) < Number(cost.circuit_credits) ? `Gerekli Devre Kredisi: ${cost.circuit_credits}` : "";
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
      document.getElementById("module-detail-status").textContent = "Modül seviyesi yükseltildi.";
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
    if (connection) connection.textContent = "Yükleniyor…";
    try {
      teamState = await requestJsonWithDeadline(
        `/teams/player/${encodeURIComponent(participantPlayerId)}`,
        { cache: "no-store" },
        10000
      );
      if (connection) connection.textContent = teamState.joined ? "BAĞLI" : "TAKIM YOK";
      setTeamActionStatus("");
      renderTeamHub();
      if (teamState?.application_pending) {
        setTeamActionStatus("Başvurun takım yöneticisinin onayına gönderildi.", "success");
      }
      return { ok:true, state:teamState };
    } catch (error) {
      if (connection) connection.textContent = "BAĞLANTI HATASI";
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

  async function loadSocialView({ quiet = false } = {}) {
    if (!quiet) setFriendsStatus("Arkadaş ağı yükleniyor…", "pending");
    try {
      socialState = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}`,
        { cache:"no-store" },
        12000
      );
      if (!quiet) setFriendsStatus("");
      renderFriendsScreen();
      return { ok:true, state:socialState };
    } catch (error) {
      if (!quiet) setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
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
        if (kind === "inbox" && !parts.length) return { kind:"inbox", value:"" };
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
            body:JSON.stringify({ player_id:participantPlayerId, code:target.value, request_id:socialRequestId("invite-code-accept") }),
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
      if (target.value) openDirectMessageThread(target.value);
      else openFriendsTab("messages");
    } else if (target.kind === "inbox") {
      // Savaş daveti bildirimi: davet yalnız gelen kutusunda gösterilir, kendiliğinden kabul edilmez.
      await loadRewardInbox({ open:true });
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
      .map(([channel, item]) => `${channel === "email" ? "E-posta" : "Telefon"}: ${item.masked}`);
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
        ? `${provider.toUpperCase()} BAĞLI`
        : providerState.configured
          ? `${provider.toUpperCase()} BAĞLA`
          : `${provider.toUpperCase()} YAPILANDIRILMADI`;
    }
    renderPlayGamesButtons();
    const devices = document.getElementById("account-device-list");
    if (devices) {
      devices.replaceChildren();
      for (const device of state.devices || []) {
        const row = document.createElement("article");
        const name = document.createElement("strong");
        name.textContent = accountSessionControls?.deviceLabel(device) || device.name || "Cihaz";
        const meta = document.createElement("small");
        meta.textContent = `${String(device.platform || "web").toUpperCase()} · ${new Date(Number(device.last_seen_at || 0) * 1000).toLocaleString(uiLocale())}`;
        const revoke = document.createElement("button");
        revoke.type = "button";
        revoke.textContent = "OTURUMU KAPAT";
        revoke.addEventListener("click", async () => {
          revoke.disabled = true;
          try {
            const result = await accountSessionControls.revokeDevice(device);
            if (result.blocked && status) status.textContent = result.message;
          } catch (error) {
            if (status) status.textContent = error instanceof Error ? error.message : String(error);
          } finally { revoke.disabled = false; }
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
        ? `${provider.toUpperCase()} BAĞLI`
        : providerState.configured
          ? `${provider.toUpperCase()} İLE DEVAM ET`
          : `${provider.toUpperCase()} HENÜZ HAZIR DEĞİL`;
    }
    renderPlayGamesButtons();
    if (status && !message && state && !accountHasPersistentIdentity(state)) {
      const configuredProviders = ["google", "apple"].filter(
        (provider) => state.oauth?.[provider]?.configured
      );
      status.textContent = playGames?.configured && state.oauth?.google_play_games?.configured
        ? "Play Games ile profilini güvenceye al veya misafir olarak devam et."
        : configuredProviders.length
        ? "Bir sağlayıcı seç veya e-posta adresini doğrula."
        : "Google ve Apple bağlantıları sunucu ayarlarını bekliyor; e-posta ya da misafir seçeneğini kullanabilirsin.";
    }
  }

  function finishAccountOnboarding({ dismiss = false } = {}) {
    if (dismiss) {
      try {
        globalThis.localStorage?.setItem(ACCOUNT_ONBOARDING_DISMISSED_KEY, "1");
        if (playGames?.configured) globalThis.localStorage?.setItem("gridshard.play-games.prompt-seen", "1");
      } catch {
        // Depolama kapalıysa yalnızca mevcut oturumda devam edilir.
      }
    }
    const dialog = document.getElementById("account-onboarding-dialog");
    if (dialog?.open) dialog.close();
    loadDailyMetaState({ present:true });
  }

  function maybePresentAccountOnboarding() {
    const dismissed = () => {
      // Existing guest installs get one explicit choice after this feature update.
      let seen = true;
      try { seen = globalThis.localStorage?.getItem("gridshard.play-games.prompt-seen") === "1"; } catch (_) {}
      const newPlayGamesChoice = playGames?.configured && accountPlatformState?.oauth?.google_play_games?.configured && !seen;
      return accountOnboardingWasDismissed() && !newPlayGamesChoice;
    };
    if (accountHasPersistentIdentity() || dismissed()) return false;
    renderAccountOnboarding();
    const dialog = document.getElementById("account-onboarding-dialog");
    if (!dialog || dialog.open) return Boolean(dialog?.open);
    void afterStartup(() => {
      if (dialog.open || accountHasPersistentIdentity() || dismissed()) return;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
    return true;
  }

  async function loadAccountPlatform({ presentOnboarding = false } = {}) {
    const status = document.getElementById("account-platform-status");
    const oauthParams = new URLSearchParams(globalThis.location?.search || "");
    let returnError = "";
    let returnedOAuth = null;
    try {
      await playGamesReady;
      if (oauthParams.has("oauth_status") && !["android", "ios"].includes(globalThis.Capacitor?.getPlatform?.())) {
        const returnUrl = globalThis.location.href;
        // Scrub the one-time code from the address before sending API requests.
        oauthParams.delete("oauth_exchange");
        oauthParams.delete("oauth_status");
        oauthParams.delete("oauth_provider");
        oauthParams.delete("oauth_handoff");
        const query = oauthParams.toString();
        const cleanUrl = `${globalThis.location?.pathname || "/"}${query ? `?${query}` : ""}`;
        globalThis.history?.replaceState?.({}, "", cleanUrl);
        try {
          const result = await nativeOAuth?.consume(returnUrl);
          if (!result?.handled) throw new Error("Hesap dönüş bağlantısı doğrulanamadı.");
          if (result.status === "linked") {
            globalThis.location?.replace?.(cleanUrl);
            return {ok:true,presented:false,redirecting:true};
          }
          returnedOAuth = {status:result.status, provider:new URL(returnUrl).searchParams.get("oauth_provider")};
        } catch (error) {
          // An unsolicited/expired link must not stop ordinary guest startup.
          returnError = error instanceof Error ? error.message : String(error);
        }
      }
      accountPlatformState = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}`,
        { cache:"no-store" },
        12000
      );
      renderAccountPlatform();
      if (returnError && status) status.textContent = returnError;
      const oauthStatus = returnedOAuth?.status;
      const oauthProvider = (returnedOAuth?.provider || "Google").toUpperCase();
      if (oauthStatus) {
        const message = oauthStatus === "linked"
          ? `${oauthProvider} hesabı başarıyla bağlandı.`
          : oauthStatus === "cancelled"
            ? `${oauthProvider} hesap bağlantısı iptal edildi.`
            : `${oauthProvider} hesap bağlantısı tamamlanamadı. Sunucu sağlayıcı ayarlarını kontrol et.`;
        if (status) status.textContent = message;
        renderAccountOnboarding(message);
        oauthParams.delete("oauth_status");
        oauthParams.delete("oauth_provider");
        oauthParams.delete("oauth_handoff");
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

  // Doğrudan mesajlar oyuncu başına ayrı sohbetlerdir: Mesajlar sekmesi sohbet
  // listesini, bir sohbete dokunmak takım sohbeti gibi yazışma alanını açar.
  let directMessagesCache = [];
  let activeDirectMessagePeerId = "";
  let directMessageLoadSequence = 0;
  // Önbellekteki mesajların ait olduğu sohbet; ilk yükleme bitene kadar boş.
  let directMessageLoadedPeerId = "";
  // Sohbet başına sunucuya okundu bildirilen son gelen mesaj.
  const directMessageSeenMarks = new Map();

  function directMessageConversations() {
    return Array.isArray(socialState?.conversations) ? socialState.conversations : [];
  }

  function directMessagePeer(playerId) {
    return directMessageConversations().find((item) => item.peer_id === playerId)?.peer
      || socialState?.friends?.find((item) => item.player_id === playerId)
      || null;
  }

  function directMessageTimeLabel(seconds) {
    const value = Number(seconds || 0);
    if (!value) return "";
    const date = new Date(value * 1000);
    return date.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString(uiLocale(), { hour:"2-digit", minute:"2-digit" })
      : date.toLocaleDateString(uiLocale(), { day:"numeric", month:"short" });
  }

  function createDirectMessageAvatar(peer) {
    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    avatar.setAttribute("aria-hidden", "true");
    applyAvatarVisual(
      avatar,
      peer?.avatar?.selected_avatar_id || "default",
      peer?.avatar?.selected_avatar_frame_id || "none"
    );
    return avatar;
  }

  function createDirectMessageThreadCard(conversation) {
    const peer = conversation.peer || {};
    const card = document.createElement("button");
    card.type = "button";
    card.className = "direct-message-thread-card";
    card.dataset.peerId = conversation.peer_id;
    const unread = Number(conversation.unread_count || 0);
    card.dataset.unread = String(unread > 0);
    const copy = document.createElement("span");
    copy.className = "direct-message-thread-copy";
    const name = document.createElement("strong");
    name.textContent = peer.display_name || "Oyuncu";
    const preview = document.createElement("small");
    const last = conversation.last_message || {};
    if (last.sender_id === participantPlayerId) {
      const self = document.createElement("span");
      self.textContent = "Sen: ";
      preview.appendChild(self);
    }
    // Oyuncu yazısı çeviri katmanına girmez.
    const previewText = document.createElement("span");
    previewText.setAttribute("translate", "no");
    previewText.textContent = last.text || "";
    preview.appendChild(previewText);
    copy.append(name, preview);
    const meta = document.createElement("span");
    meta.className = "direct-message-thread-meta";
    const time = document.createElement("time");
    time.textContent = directMessageTimeLabel(last.sent_at);
    meta.appendChild(time);
    if (unread > 0) {
      const badge = document.createElement("b");
      badge.className = "direct-message-unread";
      badge.textContent = unread > 99 ? "99+" : String(unread);
      meta.appendChild(badge);
    }
    card.setAttribute(
      "aria-label",
      `${peer.display_name || "Oyuncu"} ile sohbet${unread > 0 ? ` · ${unread} okunmamış` : ""}`
    );
    card.append(createDirectMessageAvatar(peer), copy, meta);
    card.addEventListener("click", () => openDirectMessageThread(conversation.peer_id));
    return card;
  }

  function renderDirectMessageInbox() {
    const conversations = directMessageConversations();
    const count = document.getElementById("direct-message-thread-count");
    if (count) count.textContent = `${conversations.length} sohbet`;
    const threads = document.getElementById("direct-message-threads");
    if (threads) {
      threads.replaceChildren(...conversations.map(createDirectMessageThreadCard));
      if (!conversations.length) {
        threads.appendChild(createFriendsEmptyState(
          "HENÜZ SOHBET YOK",
          "Aşağıdan bir arkadaşını seçip ilk mesajı gönder."
        ));
      }
    }
    const starters = document.getElementById("direct-message-starters");
    if (starters) {
      starters.replaceChildren();
      const active = new Set(conversations.map((item) => item.peer_id));
      for (const friend of sortedFriendsForBattle()) {
        if (active.has(friend.player_id)) continue;
        starters.appendChild(createSocialPlayerCard(friend, [
          { label:"YAZ", variant:"quiet", onClick:() => openDirectMessageThread(friend.player_id) },
        ]));
      }
      if (!starters.children.length) {
        const empty = document.createElement("p");
        empty.className = "social-empty-state";
        empty.textContent = socialState?.friends?.length
          ? "Bütün arkadaşlarınla bir sohbetin var."
          : "Mesajlaşmak için önce arkadaş ekle.";
        starters.appendChild(empty);
      }
    }
  }

  function renderDirectMessageThread() {
    const inbox = document.getElementById("direct-message-inbox");
    const thread = document.getElementById("direct-message-thread");
    const peerId = activeDirectMessagePeerId;
    if (inbox) inbox.hidden = Boolean(peerId);
    if (thread) thread.hidden = !peerId;
    renderSocialNotificationDots();
    if (!peerId) return;

    const peer = directMessagePeer(peerId);
    const conversation = directMessageConversations().find((item) => item.peer_id === peerId);
    const isFriend = conversation
      ? Boolean(conversation.is_friend)
      : Boolean(socialState?.friends?.some((item) => item.player_id === peerId));
    const avatar = document.getElementById("direct-message-peer-avatar");
    if (avatar) {
      applyAvatarVisual(
        avatar,
        peer?.avatar?.selected_avatar_id || "default",
        peer?.avatar?.selected_avatar_frame_id || "none"
      );
    }
    const name = document.getElementById("direct-message-peer-name");
    if (name) name.textContent = peer?.display_name || "Oyuncu";
    const meta = document.getElementById("direct-message-peer-meta");
    if (meta) {
      meta.textContent = peer
        ? `${peer.rank_name_tr || "Arena"} · ${Number(peer.rating || 0).toLocaleString(uiLocale())} 🏆${peer.online ? " · ÇEVRİMİÇİ" : ""}`
        : "";
    }

    const host = document.getElementById("direct-message-list");
    // Liste yalnız sohbet değişince yeniden çizilir; yukarı kaydırılmış okuma
    // konumu periyodik yenilemede kaybolmaz.
    const signature = [
      peerId,
      directMessagesCache.length,
      directMessagesCache.at(-1)?.message_id || "",
      peer?.display_name || "",
      directMessageLoadedPeerId === peerId,
    ].join("|");
    if (host && host.dataset.signature !== signature) {
      const previousScrollTop = host.scrollTop;
      const stickToBottom = host.scrollHeight - host.scrollTop - host.clientHeight < 48;
      host.replaceChildren();
      for (const message of directMessagesCache) {
        const own = message.sender_id === participantPlayerId;
        const row = document.createElement("article");
        row.className = `team-message direct-message${own ? " is-own" : ""}`;
        const author = document.createElement("strong");
        author.textContent = own ? "Sen" : (peer?.display_name || "Oyuncu");
        const text = document.createElement("p");
        text.setAttribute("translate", "no");
        text.textContent = message.text || "";
        const time = document.createElement("time");
        time.textContent = directMessageTimeLabel(message.sent_at);
        row.append(author, text, time);
        host.appendChild(row);
      }
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = directMessageLoadedPeerId === peerId
          ? "Sohbeti başlatmak için ilk mesajı yaz."
          : "Mesajlar yükleniyor…";
        host.appendChild(empty);
      }
      host.scrollTop = stickToBottom || host.dataset.peerId !== peerId
        ? host.scrollHeight
        : previousScrollTop;
      host.dataset.peerId = peerId;
      host.dataset.signature = signature;
    }

    const input = document.getElementById("direct-message-text");
    const submit = document.querySelector("#direct-message-form button[type=submit]");
    if (input) input.disabled = !isFriend;
    if (submit) submit.disabled = !isFriend;
    const note = document.getElementById("direct-message-note");
    if (note) {
      note.hidden = isFriend;
      note.textContent = isFriend ? "" : "Bu oyuncu artık arkadaş listende değil; yeni mesaj gönderilemez.";
    }
  }

  async function loadDirectMessageThread() {
    const peerId = activeDirectMessagePeerId;
    if (!peerId) return;
    const sequence = ++directMessageLoadSequence;
    try {
      const payload = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages?peer_id=${encodeURIComponent(peerId)}`,
        { cache:"no-store" },
        12000
      );
      // Yanıt gelmeden başka bir sohbete geçildiyse eski sonuç çizilmez.
      if (sequence !== directMessageLoadSequence || peerId !== activeDirectMessagePeerId) return;
      directMessagesCache = payload.messages || [];
      directMessageLoadedPeerId = peerId;
      renderDirectMessageThread();
      const lastIncoming = [...directMessagesCache].reverse().find((message) => message.sender_id === peerId);
      const conversation = directMessageConversations().find((item) => item.peer_id === peerId);
      if (
        Number(conversation?.unread_count || 0) > 0
        || (lastIncoming && directMessageSeenMarks.get(peerId) !== lastIncoming.message_id)
      ) {
        directMessageSeenMarks.set(peerId, lastIncoming?.message_id || "");
        void markDirectMessageThreadSeen(peerId);
      }
    } catch (error) {
      if (sequence === directMessageLoadSequence) {
        setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
      }
    }
  }

  async function markDirectMessageThreadSeen(peerId) {
    try {
      socialState = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages/seen`,
        {
          method:"POST",
          body:JSON.stringify({
            player_id:participantPlayerId,
            peer_id:peerId,
            request_id:socialRequestId("messages-seen"),
          }),
        },
        12000
      );
      renderFriendsScreen();
    } catch (_error) {
      // Okundu işareti bir sonraki yenilemede tekrar denenir.
    }
  }

  async function sendDirectMessage() {
    const peer = activeDirectMessagePeerId;
    const input = document.getElementById("direct-message-text");
    const message = input?.value?.trim() || "";
    if (!peer || !message) return;
    const submit = document.querySelector("#direct-message-form button[type=submit]");
    if (submit) submit.disabled = true;
    try {
      await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,recipient_id:peer,text:message,request_id:socialRequestId("message-send")})},
        12000
      );
      if (input) input.value = "";
      setFriendsStatus("");
      await loadDirectMessageThread();
      void loadSocialView({ quiet:true });
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
    } finally {
      if (submit) submit.disabled = false;
      renderDirectMessageThread();
    }
  }

  function closeDirectMessageThread() {
    // Önbellek kalır: aynı sohbet yeniden açılınca mesajlar hemen görünür.
    activeDirectMessagePeerId = "";
    directMessageLoadSequence += 1;
    renderDirectMessageInbox();
    renderDirectMessageThread();
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
    meta.textContent = `${player.rank_name_tr || "Arena"} · ${Number(player.rating || 0).toLocaleString(uiLocale())} 🏆${player.online ? " · ÇEVRİMİÇİ" : ""}`;
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

  let activeFriendsTab = "friends";
  // Bu oturumda savaşa çağrılan arkadaşlar: davet kabul edilince otomatik giriş.
  const recentBattleInviteTargets = new Set();
  const autoLaunchedBattleSessions = new Set();

  function socialNotificationCounts() {
    const counts = socialState?.notifications || {};
    return {
      incoming:Number(counts.incoming_requests || 0),
      messages:Number(counts.unread_messages || 0),
      battle:Number(counts.battle_invites || 0),
    };
  }

  function renderSocialNotificationDots() {
    const counts = socialNotificationCounts();
    const hasSocial = counts.incoming + counts.messages + counts.battle > 0;
    for (const button of document.querySelectorAll('.profile-terminal-tabs [data-open-screen="friends"]')) {
      button.classList.toggle("has-persistent-notification", hasSocial);
    }
    document.getElementById("lobby-profile-button")?.classList.toggle("has-social-notification", hasSocial);
    for (const button of document.querySelectorAll("[data-friends-tab]")) {
      const tab = button.dataset.friendsTab;
      button.classList.toggle("is-active", tab === activeFriendsTab);
      button.setAttribute("aria-pressed", String(tab === activeFriendsTab));
      button.classList.toggle("has-friends-notification", Number(counts[tab] || 0) > 0);
    }
    for (const panel of document.querySelectorAll("[data-friends-panel]")) {
      panel.hidden = panel.dataset.friendsPanel !== activeFriendsTab;
    }
    // Açık sohbette başlık ve arama gizlenir; yazışma alanı ekranı doldurur.
    const friendsScreen = document.getElementById("friends-screen");
    if (friendsScreen) {
      friendsScreen.dataset.dmThread =
        activeFriendsTab === "messages" && activeDirectMessagePeerId ? "open" : "closed";
    }
  }

  function createFriendsEmptyState(title, copy) {
    const empty = document.createElement("div");
    empty.className = "friends-empty-state";
    empty.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="16" r="7"/><circle cx="32" cy="18" r="5"/><path d="M5 40c1-8 6-12 13-12s12 4 13 12M29 30c6-1 11 2 13 9"/></svg>';
    const heading = document.createElement("strong");
    heading.textContent = title;
    const text = document.createElement("small");
    text.textContent = copy;
    empty.append(heading, text);
    return empty;
  }

  function sortedFriendsForBattle() {
    return [...(socialState?.friends || [])].sort((left, right) =>
      Number(Boolean(right.online)) - Number(Boolean(left.online))
      || String(left.display_name || "").localeCompare(String(right.display_name || ""), "tr")
    );
  }

  function openFriendsTab(tab) {
    const next = tab || "friends";
    // Mesajlar sekmesine yeniden dokunmak açık sohbetten listeye döndürür.
    if (next === "messages" && activeFriendsTab === "messages" && activeDirectMessagePeerId) {
      closeDirectMessageThread();
    }
    activeFriendsTab = next;
    renderSocialNotificationDots();
    if (activeFriendsTab === "messages") {
      renderDirectMessageInbox();
      renderDirectMessageThread();
    }
  }

  function openDirectMessageThread(playerId) {
    if (!playerId) return;
    if (directMessageLoadedPeerId !== playerId) {
      directMessagesCache = [];
      directMessageLoadedPeerId = "";
    }
    activeDirectMessagePeerId = playerId;
    activeFriendsTab = "messages";
    renderSocialNotificationDots();
    renderDirectMessageThread();
    void loadDirectMessageThread();
    // Dokunmatik ekranda klavye kendiliğinden açılıp sohbeti örtmesin.
    if (globalThis.matchMedia?.("(pointer: fine)")?.matches) {
      document.getElementById("direct-message-text")?.focus({ preventScroll:true });
    }
  }

  function renderFriendsScreen() {
    if (!socialState) return;
    const summary = document.getElementById("friends-summary");
    if (summary) summary.textContent = `${socialState.friends?.length || 0} / ${socialState.friend_limit || 100} arkadaş`;

    const friends = document.getElementById("friend-list");
    if (friends) {
      friends.replaceChildren();
      for (const player of sortedFriendsForBattle()) {
        friends.appendChild(createSocialPlayerCard(player, [
          { label:"MESAJ", variant:"quiet", onClick:() => openDirectMessageThread(player.player_id) },
        ]));
      }
      if (!friends.children.length) {
        friends.appendChild(createFriendsEmptyState(
          "HENÜZ ARKADAŞ YOK",
          "Davet kodu paylaş veya yukarıdan oyuncu adıyla ara."
        ));
      }
    }

    const requests = document.getElementById("friend-request-list");
    if (requests) {
      requests.replaceChildren();
      for (const player of socialState.incoming_requests || []) {
        requests.appendChild(createSocialPlayerCard(player, [
          { label:"KABUL ET", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests/accept`, { requester_id:player.player_id, requestKind:"friend-accept" }, "İstek kabul ediliyor…") },
          { label:"REDDET", variant:"quiet", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests/reject`, { requester_id:player.player_id, requestKind:"friend-reject" }, "İstek reddediliyor…") },
        ]));
      }
      if (!requests.children.length) {
        requests.appendChild(createFriendsEmptyState("GELEN İSTEK YOK", "Sana gönderilen arkadaşlık istekleri burada görünür."));
      }
    }

    const outgoing = document.getElementById("friend-outgoing-list");
    if (outgoing) {
      outgoing.replaceChildren();
      for (const player of socialState.outgoing_requests || []) {
        outgoing.appendChild(createSocialPlayerCard(player, [
          { label:"İPTAL", variant:"quiet", onClick:() => socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/requests/cancel`, { target_player_id:player.player_id, requestKind:"friend-cancel" }, "İstek geri çekiliyor…") },
        ]));
      }
      if (!outgoing.children.length) {
        outgoing.appendChild(createFriendsEmptyState("GÖNDERİLEN İSTEK YOK", "Gönderdiğin arkadaşlık istekleri yanıtlanana kadar burada bekler."));
      }
    }

    const battleList = document.getElementById("friend-battle-list");
    if (battleList) {
      battleList.replaceChildren();
      const pendingTargets = new Set(
        (socialState.battle_invites || [])
          .filter((invite) => invite.status === "pending" && invite.challenger_id === participantPlayerId)
          .map((invite) => invite.opponent_id)
      );
      for (const player of sortedFriendsForBattle()) {
        const pending = pendingTargets.has(player.player_id);
        const card = createSocialPlayerCard(player, [
          {
            label:pending ? "DAVET GÖNDERİLDİ" : "SAVAŞA ÇAĞIR",
            variant:pending ? "quiet" : "primary",
            onClick:async (event) => {
              if (pending) return;
              event.currentTarget.disabled = true;
              recentBattleInviteTargets.add(player.player_id);
              const result = await socialMutation(
                `/social/${encodeURIComponent(participantPlayerId)}/battle-invites`,
                { opponent_id:player.player_id, requestKind:"friend-battle" },
                "Kupasız savaş daveti gönderiliyor…"
              );
              if (result.ok) {
                setFriendsStatus(`${player.display_name || "Arkadaşın"} davet edildi; kabul ettiğinde savaş alanına geçeceksin.`, "success");
              } else {
                recentBattleInviteTargets.delete(player.player_id);
              }
            },
          },
        ]);
        card.dataset.online = String(Boolean(player.online));
        if (pending) card.querySelector(".social-player-actions button")?.setAttribute("disabled", "");
        battleList.appendChild(card);
      }
      if (!battleList.children.length) {
        battleList.appendChild(createFriendsEmptyState("SAVAŞILACAK ARKADAŞ YOK", "Arkadaş ekledikten sonra onları kupasız savaşa çağırabilirsin."));
      }
    }

    const invites = document.getElementById("friend-battle-invites");
    if (invites) {
      invites.replaceChildren();
      for (const invite of [...(socialState.battle_invites || [])].reverse()) {
        if (!["pending", "accepted"].includes(invite.status)) continue;
        const opponentId = invite.challenger_id === participantPlayerId ? invite.opponent_id : invite.challenger_id;
        const opponentName = invite.challenger_id === participantPlayerId ? invite.opponent_name : invite.challenger_name;
        const card = document.createElement("article");
        card.className = "social-battle-card";
        const copy = document.createElement("div");
        copy.append(createPublicPlayerName(opponentId, opponentName || "Oyuncu"));
        const meta = document.createElement("small");
        meta.textContent = invite.status === "accepted"
          ? "KUPASIZ SAVAŞ HAZIR"
          : invite.opponent_id === participantPlayerId ? "SENİ SAVAŞA ÇAĞIRDI" : "YANIT BEKLENİYOR";
        copy.appendChild(meta);
        if (invite.status === "pending" && invite.opponent_id === participantPlayerId) {
          const accept = document.createElement("button");
          accept.type = "button";
          accept.textContent = "KABUL ET";
          accept.addEventListener("click", async () => {
            const result = await socialMutation(`/social/${encodeURIComponent(participantPlayerId)}/battle-invites/${encodeURIComponent(invite.invite_id)}/accept`, { requestKind:"battle-accept" }, "Savaş alanı hazırlanıyor…");
            if (result.ok && result.payload.battle) {
              autoLaunchedBattleSessions.add(result.payload.battle.session_id);
              launchSocialBattle(result.payload.battle);
            }
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
    }

    renderDirectMessageInbox();
    renderDirectMessageThread();
    renderSocialNotificationDots();
  }

  // Arama kutusunu ve sonuç panelini kapatır (× düğmesi ve istek gönderimi).
  function clearFriendSearch() {
    const panel = document.getElementById("friend-search-panel");
    if (panel) panel.hidden = true;
    document.getElementById("friend-search-results")?.replaceChildren();
    const input = document.getElementById("friend-search-input");
    if (input) {
      input.value = "";
      input.blur?.();
    }
  }

  async function searchFriends(query) {
    const host = document.getElementById("friend-search-results");
    if (!host) return;
    const panel = document.getElementById("friend-search-panel");
    if (panel) panel.hidden = false;
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
          {
            label:"ARKADAŞ EKLE",
            onClick:async (event) => {
              const button = event?.currentTarget;
              if (button) button.disabled = true;
              const result = await socialMutation(
                `/social/${encodeURIComponent(participantPlayerId)}/requests`,
                { target_player_id:player.player_id, requestKind:"friend-request" },
                "Arkadaşlık isteği gönderiliyor…"
              );
              if (result?.ok) {
                // İstek gitti: arama sonucu ve kutusu kendiliğinden temizlenir.
                clearFriendSearch();
                setFriendsStatus(
                  localizedMessage("friends.request_sent", {
                    name:player.display_name || localizedUiText("Oyuncu"),
                  }),
                  "success"
                );
              } else if (button) {
                button.disabled = false;
              }
            },
          },
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

  // Etkinlik dönemleri sunucuda UTC gün sınırlarıyla tanımlıdır; etiket de
  // UTC gününü gösterir, yerel saat farkı bitiş gününü kaydırmaz.
  function eventDateLabel(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(uiLocale(), { day:"2-digit", month:"short", timeZone:"UTC" })
      : "—";
  }

  // Sıralamada ilk üç satırın yanında ödül sandığı ve içeriği görünür.
  function appendTournamentPrizeChest(item, prizes, position, note) {
    const prize = (prizes || []).find((candidate) => Number(candidate.position) === Number(position));
    if (!prize || Number(position) > 3) return;
    item.classList.add("has-prize");
    const chest = createRewardChestButton({
      tier:prize.chest_tier || "bronze",
      visualId:prize.chest_visual_id || "",
      reward:{ ...prize, chest_is_container:true },
      title:prize.chest_name_tr || `${position}. Sıra Ödülü`,
      note,
      accent:({ 1:"#ffe16f", 2:"#c9e1ef", 3:"#dd9864" })[Number(position)] || "#8fd8ff",
      className:"tournament-prize-chest",
    });
    chest.dataset.rank = String(position);
    item.appendChild(chest);
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
    if (name) name.textContent = tournament.name_tr || "Haftalık Devre Turnuvası";
    if (reset) reset.textContent = `${eventDateLabel(tournament.period?.starts_at)} — ${eventDateLabel(tournament.period?.ends_at)}`;
    if (rules) rules.textContent = tournament.rules_tr || "";
    const register = document.getElementById("weekly-tournament-register");
    const viewer = state?.viewer || {};
    if (register) {
      register.disabled = Boolean(viewer.weekly_registered);
      register.textContent = viewer.weekly_registered
        ? "TURNUVAYA KATILDIN"
        : `${Number(tournament.entry_fee || 0)} DK · TURNUVAYA KATIL`;
    }
    const participant = (tournament.standings || []).find((row) => row.player_id === participantPlayerId);
    renderEventSummary("weekly-event-summary", [
      ["SÜRE", `${eventDateLabel(tournament.period?.starts_at)} — ${eventDateLabel(tournament.period?.ends_at)}`],
      ["SIRAN", participant ? `#${participant.position}` : "Henüz yok"],
      ["KAZANILAN KUPA", participant ? `${participant.trophies_earned || participant.points} 🏆` : "0 🏆"],
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
      record.textContent = `${row.wins}G · ${row.losses}M · ${row.matches} maç`;
      identity.append(player, record);
      const points = document.createElement("strong");
      points.className = "tournament-points";
      points.textContent = `${row.trophies_earned || row.points} 🏆`;
      item.append(position, identity, points);
      appendTournamentPrizeChest(item, tournament.prizes || [], row.position, "Hafta sonunda mesaj kutusuna teslim edilir.");
      host.appendChild(item);
    }
  }

  // Takımlar arası turnuva (sunucu: team_tournament.py). Sezonla aynı dört
  // haftalık dönem Pazartesi başlar: ilk haftanın Pazartesi–Çarşamba günleri
  // kayıt, her Perşembe eşleşme, Cuma–Pazar rövanşlı maçlar.
  const TEAM_TOURNAMENT_PHASE_TR = Object.freeze({
    registration:"Kayıt açık",
    waiting:"Eşleşme bekleniyor",
    paired:"Eşleşmeler açıklandı",
    matches:"Maç günleri",
    finished:"Turnuva bitti",
  });

  // Bitiş anı hariç tutulan aralığın son gününü gösterir (ör. 5–7 Eyl).
  function eventDayRangeLabel(startIso, endIso) {
    const start = startIso ? new Date(startIso) : null;
    const end = endIso ? new Date(Date.parse(endIso) - 1) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
    const format = (date) => date.toLocaleDateString(uiLocale(), { day:"numeric", month:"short", timeZone:"UTC" });
    return start.getUTCMonth() === end.getUTCMonth()
      ? `${start.getUTCDate()}–${format(end)}`
      : `${format(start)} – ${format(end)}`;
  }

  function renderTeamTournament(state) {
    const tournament = state?.team_tournament || {};
    const name = document.getElementById("team-tournament-name");
    const week = document.getElementById("team-tournament-week");
    const rules = document.getElementById("team-tournament-rules");
    const phaseLabel = TEAM_TOURNAMENT_PHASE_TR[tournament.phase] || "";
    if (name) name.textContent = tournament.name_tr || "Takımlar Arası Turnuva";
    if (week) week.textContent = `${Number(tournament.week || 1)}. HAFTA · ${phaseLabel}`;
    if (rules) rules.textContent = tournament.rules_tr || "";
    const viewer = state?.viewer || {};
    const register = document.getElementById("team-tournament-register");
    if (register) {
      const open = Boolean(tournament.registration_open);
      register.hidden = !viewer.team_id;
      register.disabled = !(open && viewer.team_owner);
      register.textContent = viewer.team_registered
        ? (open && viewer.team_owner ? "KADROYU GÜNCELLE" : "TAKIM KAYITLI")
        : !open
          ? "KAYIT SÜRESİ DOLDU"
          : viewer.team_owner
            ? "TAKIMI ÜCRETSİZ KAYDET"
            : "KAYDI TAKIM LİDERİ YAPAR";
    }
    const standingsRows = tournament.standings || [];
    const viewerTeam = standingsRows.find((row) => row.team_id === viewer.team_id && !row.is_ai) || null;
    renderEventSummary("team-event-summary", [
      ["DÖNEM", `${eventDateLabel(tournament.period?.starts_at)} — ${eventDateLabel(tournament.period?.ends_at)}`],
      ["HAFTA", `${Number(tournament.week || 1)} / ${Number(tournament.weeks_total || 4)}`],
      ["TAKIM PUANI", viewerTeam ? `${viewerTeam.points} P` : viewer.team_id ? "Kayıtlı değil" : "Takımın yok"],
    ]);
    renderTeamTournamentCalendar(tournament);
    const standings = document.getElementById("team-tournament-standings");
    if (standings) {
      standings.replaceChildren();
      for (const row of standingsRows.slice(0, 12)) {
        const item = document.createElement("li");
        if (row.team_id === viewer.team_id && !row.is_ai) item.classList.add("is-current-player");
        const position = document.createElement("strong");
        position.className = "tournament-position";
        position.textContent = String(row.position);
        const identity = document.createElement("div");
        const teamName = row.is_ai
          ? Object.assign(document.createElement("strong"), { textContent:row.team_name || "Takım" })
          : createTeamProfileLink(row.team_id, row.team_name || "Takım");
        const detail = document.createElement("small");
        detail.textContent = `${row.member_count} oyuncu · ${row.qualified_member_count} ödüle uygun`;
        identity.append(teamName, detail);
        const points = document.createElement("strong");
        points.className = "tournament-points";
        points.textContent = `${row.points} P`;
        item.append(position, identity, points);
        appendTournamentPrizeChest(item, tournament.prizes || [], row.position, `Turnuva bitince en az ${Number(tournament.minimum_reward_points || 4)} katkı puanı olan oyuncuların mesaj kutusuna teslim edilir. Takım görünümü zaten açıksa sıradaki kilitli seçenek açılır.`);
        standings.appendChild(item);
      }
    }
    renderTeamContributions(tournament, viewer, viewerTeam);
    renderTeamFixtures(state);
  }

  function renderTeamTournamentCalendar(tournament) {
    const host = document.getElementById("team-tournament-calendar");
    if (!host) return;
    host.replaceChildren();
    const calendar = tournament.calendar || {};
    const addRow = (title, rows, { current = false, done = false } = {}) => {
      const item = document.createElement("li");
      item.classList.toggle("is-current", current);
      item.classList.toggle("is-done", done);
      const heading = document.createElement("strong");
      heading.textContent = title;
      item.appendChild(heading);
      for (const [label, value] of rows) {
        const part = document.createElement("span");
        const name = document.createElement("small");
        name.textContent = label;
        const date = document.createElement("b");
        date.textContent = value;
        part.append(name, date);
        item.appendChild(part);
      }
      host.appendChild(item);
    };
    const now = Date.now();
    const registrationCloses = Date.parse(calendar.registration_closes_at || "");
    addRow("KAYIT", [["Takım lideri", eventDayRangeLabel(calendar.registration_opens_at, calendar.registration_closes_at)]], {
      current:tournament.phase === "registration",
      done:Number.isFinite(registrationCloses) && now >= registrationCloses,
    });
    for (const week of calendar.weeks || []) {
      const closes = Date.parse(week.matches_close_at || "");
      addRow(`${week.week}. HAFTA`, [
        ["Eşleşme", eventDateLabel(week.pairing_at)],
        ["Maçlar", eventDayRangeLabel(week.matches_open_at, week.matches_close_at)],
      ], {
        current:tournament.phase !== "registration" && tournament.phase !== "finished" && Number(week.week) === Number(tournament.week),
        done:Number.isFinite(closes) && now >= closes,
      });
    }
  }

  // Takım kendi kadrosunun katkısını görür: kim kaç puan getirdi, kim ödüle uygun.
  function renderTeamContributions(tournament, viewer, viewerTeam) {
    const host = document.getElementById("team-tournament-contributions");
    const note = document.getElementById("team-tournament-contribution-note");
    if (!host) return;
    host.replaceChildren();
    const minimum = Number(tournament.minimum_reward_points || 4);
    if (note) {
      note.textContent = !viewer.team_id
        ? "Katkı listesini görmek için bir takıma katıl."
        : !viewerTeam
          ? "Takımın bu dönem turnuvada değil; kayıt dönemin ilk Pazartesi–Çarşamba günlerinde takım lideri tarafından yapılır."
          : viewer.team_roster_member === false
            ? "Takıma kayıttan sonra katıldın; kadro kayıtta sabitlendiği için bu dönem maçın yok."
            : `Her galibiyet 1, mağlubiyet 0 puan. Ödül için en az ${minimum} puan katkı gerekir.`;
    }
    for (const member of viewerTeam?.members || []) {
      const item = document.createElement("li");
      item.classList.toggle("is-current-player", member.player_id === participantPlayerId);
      item.dataset.eligible = String(Boolean(member.reward_eligible));
      const identity = document.createElement("div");
      const record = document.createElement("small");
      record.textContent = `${Number(member.wins || 0)}G · ${Math.max(0, Number(member.matches || 0) - Number(member.wins || 0))}M · ${Number(member.matches || 0)} maç`;
      identity.append(createPublicPlayerName(member.player_id, member.display_name || "Oyuncu"), record);
      const points = document.createElement("strong");
      points.className = "team-contribution-points";
      points.textContent = `${Number(member.contribution_points || 0)} P`;
      const state = document.createElement("span");
      state.className = "team-contribution-state";
      const missing = Math.max(0, minimum - Number(member.contribution_points || 0));
      state.textContent = member.reward_eligible ? "✓ Ödüle uygun" : `${missing} puan daha`;
      item.append(identity, points, state);
      host.appendChild(item);
    }
  }

  // Maç günleri istemcide de saate göre açılır; ayak sonuçları sunucudan gelir.
  function teamFixtureWindow(fixture, now = Date.now()) {
    const opens = Date.parse(fixture?.matches_open_at || "");
    const closes = Date.parse(fixture?.matches_close_at || "");
    if (Number.isFinite(opens) && Number.isFinite(closes)) {
      if (now < opens) return "upcoming";
      if (now < closes) return "live";
      return "completed";
    }
    return fixture?.status || "upcoming";
  }

  function teamLegLabel(leg, ownPlayerId) {
    if (leg.status === "played") {
      if (leg.draw) return "Berabere";
      return leg.winner_player_id === ownPlayerId ? "Galibiyet" : "Mağlubiyet";
    }
    return {
      open:"Açık",
      locked:"İlk maçtan sonra",
      missed:"Oynanmadı",
      upcoming:"Bekliyor",
    }[leg.status] || "Bekliyor";
  }

  function renderTeamFixtures(state = eventsState) {
    const host = document.getElementById("team-tournament-fixtures");
    if (!host) return;
    host.replaceChildren();
    const tournament = state?.team_tournament || {};
    const viewer = state?.viewer || {};
    const viewerTeamId = viewer.team_id || "";
    const empty = (text) => {
      const note = document.createElement("p");
      note.className = "team-fixture-empty";
      note.textContent = text;
      host.appendChild(note);
    };
    if (!viewerTeamId) {
      empty("Takım eşleşmelerini görmek için bir takıma katıl.");
      return;
    }
    if (!viewer.team_registered) {
      empty(tournament.registration_open
        ? "Takımın turnuvaya kayıtlı değil; kaydı takım lideri yapar."
        : "Takımın bu dönem turnuvada değil; kayıt dönemin ilk Pazartesi–Çarşamba günlerinde yapılır.");
      return;
    }
    if (viewer.team_roster_member === false) {
      empty("Takıma kayıttan sonra katıldın; kadro kayıtta sabitlendiği için bu dönem maçın yok.");
    }
    const ownFixtures = (tournament.fixtures || []).filter((fixture) =>
      fixture.home_team_id === viewerTeamId || fixture.away_team_id === viewerTeamId
    );
    if (!ownFixtures.length) {
      const nextWeek = (tournament.calendar?.weeks || []).find((week) => Date.parse(week.pairing_at) > Date.now());
      empty(tournament.bye_team_id === viewerTeamId
        ? "Takım sayısı tek olduğu için takımın bu hafta bay geçiyor."
        : nextWeek
          ? `Eşleşmeler ${eventDateLabel(nextWeek.pairing_at)} tarihinde açıklanır.`
          : "Bu dönemin eşleşmeleri tamamlandı.");
      return;
    }
    for (const fixture of ownFixtures) {
      const isHome = fixture.home_team_id === viewerTeamId;
      const windowState = teamFixtureWindow(fixture);
      const card = document.createElement("article");
      card.className = "team-fixture-card";
      card.dataset.state = windowState;
      const heading = document.createElement("header");
      heading.className = "event-fixture-team-links";
      const rivalName = (isHome ? fixture.away_team_name : fixture.home_team_name) || "Rakip";
      const rivalLink = (isHome ? fixture.away_is_ai : fixture.home_is_ai)
        ? Object.assign(document.createElement("strong"), { textContent:rivalName })
        : createTeamProfileLink(isHome ? fixture.away_team_id : fixture.home_team_id, rivalName);
      const score = document.createElement("b");
      score.className = "team-fixture-score";
      score.textContent = `${isHome ? fixture.home_points : fixture.away_points} – ${isHome ? fixture.away_points : fixture.home_points}`;
      heading.append(
        createTeamProfileLink(isHome ? fixture.home_team_id : fixture.away_team_id, (isHome ? fixture.home_team_name : fixture.away_team_name) || "Takımın"),
        score,
        rivalLink
      );
      const windowNote = document.createElement("small");
      windowNote.className = "team-fixture-window";
      windowNote.textContent = `${Number(fixture.week || tournament.week || 1)}. HAFTA · Maçlar ${eventDayRangeLabel(fixture.matches_open_at, fixture.matches_close_at)}`;
      const list = document.createElement("ol");
      list.className = "team-fixture-pairings";
      for (const pairing of fixture.member_pairings || []) {
        const ownPlayerId = isHome ? pairing.home_player_id : pairing.away_player_id;
        const ownName = isHome ? pairing.home_player_name : pairing.away_player_name;
        const rivalPlayerId = isHome ? pairing.away_player_id : pairing.home_player_id;
        const rivalPlayerName = isHome ? pairing.away_player_name : pairing.home_player_name;
        const row = document.createElement("li");
        row.className = "team-fixture-pairing";
        const isViewer = ownPlayerId === participantPlayerId;
        row.classList.toggle("is-current-player", isViewer);
        const players = document.createElement("div");
        players.className = "team-fixture-players";
        const versus = document.createElement("span");
        versus.textContent = "×";
        players.append(
          createPublicPlayerName(ownPlayerId, ownName || "Üye"),
          versus,
          createPublicPlayerName(rivalPlayerId, rivalPlayerName || "Rakip")
        );
        const legs = document.createElement("div");
        legs.className = "team-fixture-legs";
        const legViews = pairing.legs || [];
        legViews.forEach((leg, index) => {
          const chip = document.createElement("span");
          chip.className = "team-fixture-leg";
          chip.dataset.status = leg.status;
          if (leg.status === "played" && !leg.draw) {
            chip.dataset.result = leg.winner_player_id === ownPlayerId ? "win" : "loss";
          }
          const label = document.createElement("small");
          label.textContent = index === 0 ? "1. MAÇ" : "RÖVANŞ";
          const value = document.createElement("b");
          value.textContent = teamLegLabel(leg, ownPlayerId);
          chip.append(label, value);
          legs.appendChild(chip);
        });
        row.append(players, legs);
        if (isViewer) {
          // Sunucu görüntüsü eski kalsa da maç günleri saatle açılır; oynanmış
          // ilk ayaktan sonra rövanş, ikisi de oynandıysa tamamlandı gösterilir.
          const nextIndex = legViews.findIndex((leg) => leg.status !== "played");
          const action = document.createElement("button");
          action.type = "button";
          action.className = "event-fixture-enter";
          action.disabled = windowState !== "live" || nextIndex < 0;
          action.textContent = windowState === "upcoming"
            ? `MAÇLAR ${eventDateLabel(fixture.matches_open_at)} AÇILIR`
            : windowState === "completed"
              ? "HAFTA TAMAMLANDI"
              : nextIndex < 0
                ? "MAÇLAR TAMAMLANDI"
                : nextIndex === 0
                  ? "1. MAÇA GİR"
                  : "RÖVANŞA GİR";
          action.addEventListener("click", () => checkInTeamFixture(fixture.fixture_id));
          row.appendChild(action);
        }
        list.appendChild(row);
      }
      card.append(heading, windowNote, list);
      host.appendChild(card);
    }
  }

  // Açık eşleşme sayfasında maç saati gelince düğme sayfa yenilenmeden açılır.
  window.setInterval(() => {
    if (document.body.dataset.appScreen === "team-event" && activeTeamEventTab === "fixtures" && eventsState) {
      renderTeamFixtures(eventsState);
    }
  }, 20000);

  function renderEventsHub() {
    if (!eventsState) return;
    renderDailyMetaCard();
    const weekly = eventsState.weekly_tournament || {};
    const team = eventsState.team_tournament || {};
    const weeklyLinkName = document.getElementById("weekly-event-link-name");
    const weeklyLinkPeriod = document.getElementById("weekly-event-link-period");
    const teamLinkName = document.getElementById("team-event-link-name");
    const teamLinkPeriod = document.getElementById("team-event-link-period");
    if (weeklyLinkName) weeklyLinkName.textContent = weekly.name_tr || "Haftalık Devre Turnuvası";
    if (weeklyLinkPeriod) weeklyLinkPeriod.textContent = `${eventDateLabel(weekly.period?.starts_at)} — ${eventDateLabel(weekly.period?.ends_at)}`;
    if (teamLinkName) teamLinkName.textContent = team.name_tr || "Takımlar Arası Turnuva";
    if (teamLinkPeriod) teamLinkPeriod.textContent = `${Number(team.week || 1)}. hafta · ${eventDateLabel(team.period?.ends_at)} tarihinde yenilenir`;
    renderWeeklyTournament(eventsState);
    renderTeamTournament(eventsState);
    renderEventSubpages();
  }

  async function loadEventsView() {
    const statuses = ["event-action-status", "weekly-event-status", "team-event-status"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    for (const status of statuses) status.textContent = "Turnuva verileri yükleniyor…";
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
      if (status) status.textContent = "Kayıt tamamlandı.";
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
    if (status) status.textContent = "Canlı savaş oturumu hazırlanıyor…";
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
    if (name) name.textContent = selected?.meta_name_tr || "Henüz belirlenmedi";
    if (description) {
      description.textContent = selected
        ? (selected.description_tr || "Günlük meta etkin.")
        : "Meta çarkını çevirerek bugünkü oyun planını belirle.";
    }
    const effect = document.getElementById("daily-meta-effect");
    if (effect) {
      effect.textContent = selected?.effect_tr || "";
      effect.hidden = !selected?.effect_tr;
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
      wheel.classList.toggle("has-result", Boolean(selected) && !dailyMetaRollPending);
      // Dönüş sürerken açı elle değiştirilmez; bitince aynı açıdaysa dokunulmaz.
      if (!dailyMetaRollPending) settleDailyMetaWheel(wheel, dailyMetaTargetAngle(dailyMetaState) ?? 0);
    }
    if (result) {
      result.hidden = !selected;
      result.style.setProperty("--daily-meta-accent", selected?.accent || "#61ead8");
    }
    if (copy) {
      copy.textContent = selected
        ? "Bugünkü meta kilitlendi. Yarın yeniden çark çevirebilirsin."
        : "Yedi eşit olasılıklı stratejiden biri bugünkü savaş planın olacak.";
    }
    if (glyph) glyph.textContent = selected?.glyph || "◇";
    if (name) name.textContent = selected?.meta_name_tr || "—";
    if (effect) effect.textContent = selected?.effect_tr || "";
    if (button) {
      button.disabled = dailyMetaRollPending;
      button.textContent = dailyMetaRollPending
        ? "META BELİRLENİYOR…"
        : selected ? "DEVAM" : "METAYI BELİRLE";
    }
  }

  function dailyMetaTargetAngle(state) {
    const options = Array.isArray(state?.options) ? state.options : [];
    const selectedId = state?.meta?.id;
    const index = options.findIndex((item) => item?.id === selectedId);
    if (index < 0 || options.length < 1) return null;
    return -(index * 360 / options.length);
  }

  function sameWheelDirection(first, second) {
    const difference = Math.abs((((first - second) % 360) + 360) % 360);
    return Math.min(difference, 360 - difference) < 0.01;
  }

  function settleDailyMetaWheel(wheel, target) {
    if (!wheel || sameWheelDirection(dailyMetaWheelRotation, target)) return;
    wheel.classList.add("is-instant");
    wheel.style.setProperty("--daily-meta-rotation", `${target}deg`);
    dailyMetaWheelRotation = target;
    void wheel.offsetWidth;
    wheel.classList.remove("is-instant");
  }

  function spinDailyMetaWheel(wheel, target) {
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!wheel || reducedMotion) {
      settleDailyMetaWheel(wheel, target);
      return Promise.resolve();
    }
    const current = dailyMetaWheelRotation;
    const forward = (((target - current) % 360) + 360) % 360;
    const next = current + DAILY_META_SPIN_TURNS * 360 + forward;
    wheel.classList.add("is-spinning");
    wheel.style.setProperty("--daily-meta-rotation", `${next}deg`);
    dailyMetaWheelRotation = next;
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        wheel.removeEventListener("transitionend", onEnd);
        wheel.classList.remove("is-spinning");
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === wheel && event.propertyName === "transform") finish();
      };
      wheel.addEventListener("transitionend", onEnd);
      window.setTimeout(finish, DAILY_META_SPIN_MS + 150);
    });
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
        void afterStartup(() => {
          if (dialog.open || !dailyMetaState?.requires_roll) return;
          if (dialog.showModal) dialog.showModal();
          else dialog.setAttribute("open", "");
        });
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
    if (status) status.textContent = "Yedi yüzlü meta zarı atılıyor…";
    renderDailyMetaDialog();
    try {
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/daily-meta/roll`,
        {
          method:"POST",
          body:JSON.stringify({ request_id:operationRequestId("daily-meta") }),
        },
        30000
      );
      const target = dailyMetaTargetAngle(payload);
      if (target !== null) await spinDailyMetaWheel(wheel, target);
      dailyMetaState = payload;
      if (status) status.textContent = "Günlük meta belirlendi.";
      renderDailyMetaCard();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      dailyMetaRollPending = false;
      renderDailyMetaDialog();
    }
  }

  async function mutateTeam(path, body, pendingMessage = "İşleniyor…") {
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
        setTeamActionStatus("Başvurun takım yöneticisinin onayına gönderildi.", "success");
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
      ? value.toLocaleString(uiLocale())
      : String(value ?? "0");
    const number = document.createElement("span");
    number.className = "trophy-value-number";
    number.textContent = displayValue;
    const icon = document.createElement("span");
    icon.className = "trophy-value-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🏆";
    target.classList.add("trophy-visual-value");
    target.setAttribute("aria-label", `${displayValue} Kupa`);
    target.replaceChildren(number, icon);
    return target;
  }

  function createTeamMemberRow(member, index, { compact = false, manageable = false } = {}) {
    const row = document.createElement(compact ? "div" : "li");
    row.className = compact ? "team-member-row is-compact" : "team-member-row";
    const rank = document.createElement("strong");
    rank.className = "team-member-rank";
    rank.textContent = String(index + 1);
    const identity = document.createElement("div");
    const name = createPublicPlayerName(
      member.player_id,
      member.display_name || "Oyuncu"
    );
    const meta = document.createElement("small");
    meta.textContent = `${member.role === "owner" ? "LİDER · " : ""}${member.online ? "ÇEVRİMİÇİ" : "ÇEVRİMDIŞI"}`;
    identity.append(name, meta);
    const trophies = document.createElement("strong");
    trophies.className = "team-member-trophies";
    renderTrophyValue(trophies, Number(member.trophies || 0));
    row.append(rank, identity, trophies);
    // Eylemler yalnız oyuncunun kendi takım listesinde görünür; başka bir
    // takımın herkese açık profilinde "takımdan çıkar" düğmesi çıkmaz.
    if (!compact && manageable && teamState?.joined) {
      const isSelf = member.player_id === participantPlayerId;
      if (isSelf) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "team-member-action is-leave";
        action.textContent = "TAKIMDAN AYRIL";
        action.addEventListener("click", () => {
          if (!teamState?.team_id) return;
          mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/leave`,
            { requestKind:"leave-team" },
            "Takımdan ayrılma işleniyor…"
          );
        });
        row.appendChild(action);
      }
    }
    return row;
  }

  // Lider Görünümü: amblem, çerçeve ve isim rengi (sunucu kimlikleriyle aynı).
  const TEAM_EMBLEMS = Object.freeze({
    shield:{ nameTr:"Kalkan", color:"#6ff1e0", path:'<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6Z"/>' },
    crown:{ nameTr:"Taç", color:"#ffd76a", path:'<path d="m3.5 8 4.5 4 4-7 4 7 4.5-4-2 11h-13Z"/>' },
    bolt:{ nameTr:"Yıldırım", color:"#ffb347", path:'<path d="M13.5 2 5 13h6l-1 9 9-12h-6Z"/>' },
    star:{ nameTr:"Yıldız", color:"#ffe26f", path:'<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6-4.5-4.2 6.1-.8Z"/>' },
    orbit:{ nameTr:"Yörünge", color:"#9fd8ff", path:'<circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-28 12 12)"/>' },
    gear:{ nameTr:"Dişli", color:"#c4d2e0", path:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.3 2.3M16.4 16.4l2.3 2.3M5.3 18.7l2.3-2.3M16.4 7.6l2.3-2.3"/>' },
    swords:{ nameTr:"Kılıç", color:"#ff9aaa", path:'<path d="m5 4 10 10M4 5l1-1M15 14l-2 3 1 1 3-2M19 4 9 14M20 5l-1-1M9 14l2 3-1 1-3-2"/>' },
    wing:{ nameTr:"Kanat", color:"#d9b8ff", path:'<path d="M12 3c.8 4.4 3.6 7.2 9 9-5.4 1.8-8.2 4.6-9 9-.8-4.4-3.6-7.2-9-9 5.4-1.8 8.2-4.6 9-9Z"/>' },
    circuit:{ nameTr:"Devre", color:"#7ff3ff", path:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5ZM12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5"/>' },
    lens:{ nameTr:"Mercek", color:"#8fe8ff", path:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v2M12 18.5v2"/>' },
  });
  const TEAM_FRAMES = Object.freeze({
    steel:{ nameTr:"Çelik", color:"#8aa3b8" },
    gold:{ nameTr:"Altın", color:"#ffd24a" },
    neon:{ nameTr:"Neon", color:"#4ff0e6" },
    crimson:{ nameTr:"Kızıl", color:"#ff6b82" },
    violet:{ nameTr:"Mor", color:"#b98cff" },
    royal:{ nameTr:"Kraliyet", color:"#6fa9ff" },
  });
  const TEAM_NAME_COLORS = Object.freeze({
    cyan:{ nameTr:"Camgöbeği", color:"#5ff0da" },
    gold:{ nameTr:"Altın", color:"#ffd76a" },
    red:{ nameTr:"Kızıl", color:"#ff9aa8" },
    violet:{ nameTr:"Mor", color:"#c9a2ff" },
    green:{ nameTr:"Yeşil", color:"#7ff0a8" },
    sky:{ nameTr:"Gök", color:"#a6e3ff" },
  });
  const TEAM_APPEARANCE_DEFAULT = Object.freeze({ emblem_id:"shield", frame_id:"steel", name_color_id:"cyan" });
  let activeTeamManagementTab = "cosmetics";
  let teamAppearanceDraft = null;

  function normalizedTeamAppearance(appearance = {}) {
    return {
      emblem_id:TEAM_EMBLEMS[appearance?.emblem_id] ? appearance.emblem_id : TEAM_APPEARANCE_DEFAULT.emblem_id,
      frame_id:TEAM_FRAMES[appearance?.frame_id] ? appearance.frame_id : TEAM_APPEARANCE_DEFAULT.frame_id,
      name_color_id:TEAM_NAME_COLORS[appearance?.name_color_id] ? appearance.name_color_id : TEAM_APPEARANCE_DEFAULT.name_color_id,
    };
  }

  function teamEmblemSvg(emblemId) {
    const emblem = TEAM_EMBLEMS[emblemId] || TEAM_EMBLEMS.shield;
    return `<svg class="team-emblem-svg" viewBox="0 0 24 24" aria-hidden="true">${emblem.path}</svg>`;
  }

  // Amblemi, çerçeve rengini ve isim rengini bir kimlik kutusuna uygular.
  function applyTeamAppearance(element, appearance, { emblemHost = null, nameHost = null } = {}) {
    if (!element) return;
    const look = normalizedTeamAppearance(appearance);
    element.dataset.teamEmblem = look.emblem_id;
    element.dataset.teamFrame = look.frame_id;
    element.style.setProperty("--team-emblem-color", TEAM_EMBLEMS[look.emblem_id].color);
    element.style.setProperty("--team-frame-color", TEAM_FRAMES[look.frame_id].color);
    element.style.setProperty("--team-name-color", TEAM_NAME_COLORS[look.name_color_id].color);
    if (emblemHost) emblemHost.innerHTML = teamEmblemSvg(look.emblem_id);
    if (nameHost) nameHost.style.color = TEAM_NAME_COLORS[look.name_color_id].color;
  }

  function renderTeamAppearanceEditor() {
    const current = normalizedTeamAppearance(teamState?.appearance);
    if (!teamAppearanceDraft || teamAppearanceDraft.team_id !== teamState?.team_id) {
      teamAppearanceDraft = { ...current, team_id:teamState?.team_id };
    }
    const preview = document.getElementById("team-appearance-preview");
    if (preview) {
      preview.replaceChildren();
      const badge = document.createElement("span");
      badge.className = "team-appearance-badge";
      const name = document.createElement("strong");
      name.textContent = teamState?.name || "Takım";
      applyTeamAppearance(preview, teamAppearanceDraft, { emblemHost:badge, nameHost:name });
      preview.append(badge, name);
    }
    const groups = [
      ["team-emblem-options", "emblem_id", TEAM_EMBLEMS, (item, id) => {
        const visual = document.createElement("span");
        visual.className = "team-option-emblem";
        visual.style.setProperty("--team-emblem-color", item.color);
        visual.innerHTML = teamEmblemSvg(id);
        return visual;
      }],
      ["team-frame-options", "frame_id", TEAM_FRAMES, (item) => {
        const visual = document.createElement("span");
        visual.className = "team-option-frame";
        visual.style.setProperty("--team-frame-color", item.color);
        return visual;
      }],
      ["team-name-color-options", "name_color_id", TEAM_NAME_COLORS, (item) => {
        const visual = document.createElement("span");
        visual.className = "team-option-color";
        visual.style.background = item.color;
        return visual;
      }],
    ];
    for (const [hostId, field, catalog, visualFor] of groups) {
      const host = document.getElementById(hostId);
      if (!host) continue;
      host.replaceChildren();
      const allowed = teamState?.appearance_options?.[field] || Object.keys(catalog);
      // Varsayılanlar dışındaki seçenekler takım turnuvasında kazanılır.
      const unlocked = teamState?.appearance_unlocked?.[field] || null;
      const sources = teamState?.appearance_unlock_sources?.[field] || {};
      for (const id of allowed) {
        const item = catalog[id];
        if (!item) continue;
        const locked = Boolean(unlocked) && !unlocked.includes(id);
        const selected = teamAppearanceDraft[field] === id;
        const option = document.createElement("button");
        option.type = "button";
        option.className = "team-appearance-option";
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(selected));
        option.classList.toggle("is-selected", selected);
        option.dataset.locked = String(locked);
        option.disabled = locked;
        const label = document.createElement("strong");
        label.textContent = item.nameTr;
        const state = document.createElement("small");
        state.textContent = locked
          ? (sources[id] ? `TURNUVA ${sources[id]}.` : "TURNUVA ÖDÜLÜ")
          : selected ? "SEÇİLİ" : "SEÇ";
        option.append(visualFor(item, id), label, state);
        if (locked) {
          const lock = document.createElement("i");
          lock.className = "team-appearance-lock";
          lock.setAttribute("aria-hidden", "true");
          lock.textContent = "🔒";
          option.appendChild(lock);
        } else {
          option.addEventListener("click", () => {
            teamAppearanceDraft = { ...teamAppearanceDraft, [field]:id };
            renderTeamAppearanceEditor();
          });
        }
        host.appendChild(option);
      }
    }
    const save = document.getElementById("team-appearance-save");
    if (save) {
      const changed = ["emblem_id", "frame_id", "name_color_id"].some(
        (key) => teamAppearanceDraft[key] !== current[key]
      );
      save.disabled = !changed;
      save.textContent = changed ? "KAYDET" : "KAYDEDİLDİ";
    }
  }

  function renderTeamMemberManagement() {
    const applications = document.getElementById("team-application-list");
    if (applications) {
      applications.replaceChildren();
      for (const applicant of teamState.applications || []) {
        const row = document.createElement("article");
        row.className = "team-management-row";
        const copy = document.createElement("div");
        copy.append(createPublicPlayerName(applicant.player_id, applicant.display_name));
        const meta = document.createElement("small");
        meta.textContent = `${applicant.rank_name_tr} · ${Number(applicant.trophies || 0).toLocaleString(uiLocale())} 🏆`;
        copy.appendChild(meta);
        const actions = document.createElement("span");
        actions.className = "team-management-actions";
        for (const [label, accept] of [["KABUL", true], ["REDDET", false]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.dataset.variant = accept ? "primary" : "quiet";
          button.addEventListener("click", () => mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/applications/review`,
            { applicant_id:applicant.player_id, accept, requestKind:`application-${accept ? "accept" : "reject"}` },
            "Başvuru değerlendiriliyor…"
          ));
          actions.appendChild(button);
        }
        row.append(copy, actions);
        applications.appendChild(row);
      }
      if (!applications.children.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = "Bekleyen başvuru yok.";
        applications.appendChild(empty);
      }
    }
    const members = document.getElementById("team-member-management-list");
    if (members) {
      members.replaceChildren();
      for (const member of teamState.members || []) {
        if (member.player_id === participantPlayerId) continue;
        const row = document.createElement("article");
        row.className = "team-management-row";
        const copy = document.createElement("div");
        copy.append(createPublicPlayerName(member.player_id, member.display_name || "Üye"));
        const meta = document.createElement("small");
        meta.textContent = `${member.online ? "ÇEVRİMİÇİ" : "ÇEVRİMDIŞI"} · ${Number(member.trophies || 0).toLocaleString(uiLocale())} 🏆`;
        copy.appendChild(meta);
        const actions = document.createElement("span");
        actions.className = "team-management-actions";
        const promote = document.createElement("button");
        promote.type = "button";
        promote.textContent = "LİDER YAP";
        promote.dataset.variant = "quiet";
        promote.addEventListener("click", () => {
          if (!window.confirm(localizedUiText(`${member.display_name || "Bu üye"} takım lideri olsun mu? Yönetim yetkisi ona geçer.`))) return;
          mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/owner/transfer`,
            { member_id:member.player_id, requestKind:"owner-transfer" },
            "Liderlik devrediliyor…"
          );
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "TAKIMDAN ÇIKAR";
        remove.dataset.variant = "danger";
        remove.addEventListener("click", () => {
          if (!window.confirm(localizedUiText(`${member.display_name || "Bu üye"} takımdan çıkarılsın mı?`))) return;
          mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/members/remove`,
            { member_id:member.player_id, requestKind:"remove-member" },
            "Üye takımdan çıkarılıyor…"
          );
        });
        actions.append(promote, remove);
        row.append(copy, actions);
        members.appendChild(row);
      }
      if (!members.children.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = "Takımda yönetilecek başka üye yok.";
        members.appendChild(empty);
      }
    }
  }

  function renderTeamManagement() {
    const panel = document.querySelector('[data-team-panel="management"]');
    if (!panel || !teamState?.joined || !teamState.is_owner) return;
    for (const button of panel.querySelectorAll("[data-team-management-tab]")) {
      const active = button.dataset.teamManagementTab === activeTeamManagementTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const section of panel.querySelectorAll("[data-team-management-panel]")) {
      section.hidden = section.dataset.teamManagementPanel !== activeTeamManagementTab;
    }
    renderTeamAppearanceEditor();
    renderTeamMemberManagement();
  }

  // --- Takım: modül parçası isteği ----------------------------------------
  const TEAM_REQUEST_AMOUNTS = Object.freeze({ common:4, rare:3, epic:2, legendary:1 });
  const TEAM_REQUEST_RARITY_ORDER = Object.freeze(["common", "rare", "epic", "legendary"]);
  let selectedTeamRequestModuleId = "";
  let activeTeamRequestRarity = "all";

  function teamRequestAmount(rarity) {
    const key = String(rarity || "common");
    return Number(teamState?.request_policy?.[key]?.amount || TEAM_REQUEST_AMOUNTS[key] || 0);
  }

  function teamRequestModule(definitionId) {
    return (metaProgressionState?.module_collection || [])
      .find((item) => item.definition_id === definitionId) || null;
  }

  // Koleksiyondaki modül kartının görseli: kategori rengi + modül simgesi.
  function teamRequestModuleArt(item) {
    const art = document.createElement("span");
    art.className = "unified-module-tile team-request-art";
    art.dataset.category = item?.category || "";
    art.setAttribute("aria-hidden", "true");
    const glyph = document.createElement("span");
    glyph.className = "unified-module-art";
    glyph.textContent = moduleIconFor({ nameTr: item?.name_tr });
    art.appendChild(glyph);
    return art;
  }

  function teamRequestShardProgress(item) {
    const owned = Math.max(0, Number(item?.shards || 0));
    const required = Number(item?.next_upgrade_cost?.shards || 0);
    return { owned, required, percent: required > 0 ? Math.min(100, Math.round((owned / required) * 100)) : 100 };
  }

  function createTeamRequestModuleOption(item, { selected = false, available = true } = {}) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "team-request-module";
    option.dataset.rarity = item.rarity || "common";
    option.dataset.moduleDefinitionId = item.definition_id;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(selected));
    option.setAttribute("aria-label", `${item.name_tr} · ${moduleRarityLabel(item.rarity)} · ${teamRequestAmount(item.rarity)} parça`);
    option.disabled = !available;
    const name = document.createElement("strong");
    name.textContent = item.name_tr || "Modül";
    const rarity = document.createElement("small");
    rarity.textContent = moduleRarityLabel(item.rarity);
    const amount = document.createElement("em");
    amount.append(
      createModulePuzzlePiece({ category:item.category || "" }),
      document.createTextNode(`${teamRequestAmount(item.rarity)} parça`)
    );
    const { percent } = teamRequestShardProgress(item);
    const progress = document.createElement("i");
    progress.className = "team-request-module-progress";
    progress.style.setProperty("--module-progress", `${percent}%`);
    progress.setAttribute("aria-hidden", "true");
    option.append(teamRequestModuleArt(item), name, rarity, amount, progress);
    option.addEventListener("click", () => {
      selectedTeamRequestModuleId = item.definition_id;
      renderTeamRequestComposer();
    });
    return option;
  }

  function renderTeamRequestComposer() {
    const available = teamState?.module_request_available !== false;
    const quota = document.getElementById("team-request-quota");
    if (quota) {
      quota.dataset.available = String(available);
      quota.textContent = available ? "HAFTALIK HAK: 1" : "BU HAFTA KULLANILDI";
    }
    const composer = document.getElementById("team-request-composer");
    if (composer) composer.dataset.available = String(available);

    const modules = (metaProgressionState?.module_collection || [])
      .filter((item) => item.unlocked !== false)
      .sort((left, right) => (
        TEAM_REQUEST_RARITY_ORDER.indexOf(right.rarity) - TEAM_REQUEST_RARITY_ORDER.indexOf(left.rarity)
        || String(left.name_tr).localeCompare(String(right.name_tr), "tr")
      ));
    if (!modules.some((item) => item.definition_id === selectedTeamRequestModuleId)) {
      selectedTeamRequestModuleId = "";
    }
    if (activeTeamRequestRarity !== "all" && !modules.some((item) => item.rarity === activeTeamRequestRarity)) {
      activeTeamRequestRarity = "all";
    }
    for (const button of document.querySelectorAll("[data-request-rarity]")) {
      const rarity = button.dataset.requestRarity;
      const active = rarity === activeTeamRequestRarity;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.hidden = rarity !== "all" && !modules.some((item) => item.rarity === rarity);
    }

    const grid = document.getElementById("team-module-request-grid");
    if (grid) {
      grid.replaceChildren();
      const visible = modules.filter((item) => activeTeamRequestRarity === "all" || item.rarity === activeTeamRequestRarity);
      for (const item of visible) {
        grid.appendChild(createTeamRequestModuleOption(item, {
          selected:item.definition_id === selectedTeamRequestModuleId,
          available,
        }));
      }
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = metaProgressionState ? "İstenebilecek açık modül yok." : "Modül koleksiyonu yükleniyor…";
        grid.appendChild(empty);
      }
    }

    const summary = document.getElementById("team-module-request-selected");
    const selected = teamRequestModule(selectedTeamRequestModuleId);
    if (summary) {
      summary.replaceChildren();
      summary.dataset.rarity = selected?.rarity || "";
      if (selected) {
        const { owned, required } = teamRequestShardProgress(selected);
        const copy = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = selected.name_tr || "Modül";
        const detail = document.createElement("small");
        detail.textContent = `${teamRequestAmount(selected.rarity)} parça istenir`;
        const ownedLine = document.createElement("small");
        ownedLine.textContent = required > 0 ? `Sende ${owned} / ${required}` : `Sende ${owned}`;
        copy.append(name, detail, ownedLine);
        summary.append(teamRequestModuleArt(selected), copy);
      } else {
        const hint = document.createElement("small");
        hint.textContent = available ? "Yukarıdan bir modül seç." : "Yeni istek hakkın pazartesi açılır.";
        summary.appendChild(hint);
      }
    }
    const submit = document.getElementById("team-module-request-button");
    if (submit) {
      submit.disabled = !available || !selected;
      submit.textContent = available ? "İSTE" : "KULLANILDI";
    }
  }

  function renderTeamRequestList() {
    const requestList = document.getElementById("team-request-list");
    if (!requestList) return;
    requestList.replaceChildren();
    const requests = teamState?.module_requests || [];
    const openCount = requests.filter((request) => !request.fulfilled).length;
    const count = document.getElementById("team-request-count");
    if (count) count.textContent = `${openCount} açık istek`;
    if (!requests.length) {
      const empty = document.createElement("p");
      empty.className = "team-empty-state";
      empty.textContent = "Henüz modül parçası isteği yok.";
      requestList.appendChild(empty);
    }
    for (const request of requests) {
      const module = teamRequestModule(request.module_id);
      const card = document.createElement("article");
      card.className = "team-request-card";
      card.dataset.rarity = request.rarity || "common";
      card.dataset.fulfilled = String(Boolean(request.fulfilled));
      const copy = document.createElement("div");
      copy.className = "team-request-copy";
      const name = document.createElement("strong");
      name.textContent = request.module_name_tr || module?.name_tr || "Modül";
      const meta = document.createElement("small");
      meta.className = "team-player-inline-meta";
      const requester = createPublicPlayerName(
        request.requester_id,
        request.requester_name || "Oyuncu"
      );
      const rarity = document.createElement("span");
      rarity.className = "team-request-rarity";
      rarity.textContent = moduleRarityLabel(request.rarity);
      meta.append(requester, rarity);
      const requested = Math.max(1, Number(request.requested_amount || 0));
      const donated = Math.min(requested, Math.max(0, Number(request.donated_amount || 0)));
      const meter = document.createElement("span");
      meter.className = "team-request-meter";
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(requested));
      meter.setAttribute("aria-valuenow", String(donated));
      meter.setAttribute("aria-label", `${donated} / ${requested} parça`);
      meter.style.setProperty("--request-progress", `${Math.round((donated / requested) * 100)}%`);
      const amount = document.createElement("small");
      amount.className = "team-request-amount";
      const ownShards = Math.max(0, Number(module?.shards || 0));
      amount.append(
        createModulePuzzlePiece({ category:module?.category || "" }),
        document.createTextNode(request.is_own || !module
          ? `${donated} / ${requested} parça`
          : `${donated} / ${requested} parça · Sende ${ownShards}`)
      );
      copy.append(name, meta, meter, amount);
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = request.fulfilled ? "TAMAMLANDI" : request.is_own ? "SENİN İSTEĞİN" : "1 BAĞIŞLA";
      action.disabled = Boolean(request.fulfilled || request.is_own || (module && ownShards < 1));
      if (!action.disabled) {
        action.addEventListener("click", async () => {
          action.disabled = true;
          const result = await mutateTeam(
            `/teams/${encodeURIComponent(teamState.team_id)}/module-requests/${encodeURIComponent(request.request_id)}/donate`,
            { requestKind:"donate" },
            "Modül parçası aktarılıyor…"
          );
          // Bağışlanan parça koleksiyondan düştüğü için "Sende" sayısı tazelenir;
          // yükleme ekranları (takım dahil) yeniden çizer.
          if (result.ok) await loadMetaProgression();
          else renderTeamHub();
        });
      }
      card.append(teamRequestModuleArt(module || { name_tr:request.module_name_tr }), copy, action);
      requestList.appendChild(card);
    }
  }

  // --- Takım: takımı olmayan oyuncunun ekranı ------------------------------
  // İlk sekme mevcut takımların listesidir (yeri olan takımın karşısında
  // BAŞVUR); ikinci sekmede takım oluşturulur.
  let activeTeamLobbyTab = "list";

  function openTeamLobbyTab(tab) {
    activeTeamLobbyTab = tab === "create" ? "create" : "list";
    for (const button of document.querySelectorAll("[data-team-lobby-tab]")) {
      const active = button.dataset.teamLobbyTab === activeTeamLobbyTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const panel of document.querySelectorAll("[data-team-lobby-panel]")) {
      panel.hidden = panel.dataset.teamLobbyPanel !== activeTeamLobbyTab;
    }
  }

  function createTeamDirectoryRow(team) {
    const pending = Boolean(teamState.application_pending);
    const applied = pending && teamState.applied_team_id === team.team_id;
    const viewerTrophies = Number(teamState.viewer_trophies || 0);
    const minTrophies = Number(team.min_trophies || 0);
    const row = document.createElement("article");
    row.className = "team-directory-row";
    row.dataset.teamId = team.team_id;
    row.dataset.applied = String(applied);
    row.dataset.full = String(Boolean(team.full));

    const badge = document.createElement("span");
    badge.className = "team-directory-badge";
    const copy = document.createElement("div");
    copy.className = "team-directory-copy";
    const name = createTeamProfileLink(team.team_id, team.name, { className:"team-directory-name" });
    applyTeamAppearance(row, team.appearance, { emblemHost:badge, nameHost:name });
    const meta = document.createElement("small");
    const trophies = Number(team.total_trophies || 0).toLocaleString(uiLocale());
    meta.textContent = localizedMessage("team.directory_meta", {
      members:team.member_count,
      limit:team.member_limit,
      trophies,
    }) + (minTrophies > 0
      ? localizedMessage("team.directory_requirement", { trophies:localizedNumber(minTrophies) })
      : "");
    copy.append(name, meta);
    if (team.description) {
      const description = document.createElement("p");
      description.textContent = team.description;
      copy.appendChild(description);
    }

    const action = document.createElement("button");
    action.type = "button";
    action.className = "team-directory-action";
    if (applied) {
      action.textContent = "BAŞVURUYU GERİ ÇEK";
      action.dataset.variant = "quiet";
      action.addEventListener("click", () => mutateTeam(
        `/teams/${encodeURIComponent(team.team_id)}/applications/withdraw`,
        { requestKind:"withdraw" },
        "Başvuru geri çekiliyor…"
      ));
    } else if (team.full) {
      action.textContent = "DOLU";
      action.disabled = true;
    } else if (viewerTrophies < minTrophies) {
      action.textContent = "KUPA YETERSİZ";
      action.disabled = true;
    } else {
      action.textContent = "BAŞVUR";
      // Aynı anda tek başvuru yapılabilir; diğer takımlar bekleme süresince kapalıdır.
      action.disabled = pending;
      action.addEventListener("click", () => mutateTeam(
        `/teams/${encodeURIComponent(team.team_id)}/join`,
        { requestKind:"join" },
        "Takım başvurusu gönderiliyor…"
      ));
    }
    row.append(badge, copy, action);
    return row;
  }

  function renderTeamLobby() {
    openTeamLobbyTab(activeTeamLobbyTab);
    const list = document.getElementById("team-directory-list");
    if (list) {
      list.replaceChildren();
      // Eski sunucu yalnız yeri olan takımları gönderir.
      const teams = teamState.teams || teamState.available_teams || [];
      // Başvurulan takım en üstte durur.
      const ordered = [...teams].sort((left, right) =>
        Number(right.team_id === teamState.applied_team_id) - Number(left.team_id === teamState.applied_team_id)
      );
      for (const team of ordered) list.appendChild(createTeamDirectoryRow(team));
      if (!list.children.length) {
        const empty = document.createElement("div");
        empty.className = "friends-empty-state";
        const title = document.createElement("strong");
        title.textContent = "HENÜZ TAKIM YOK";
        const text = document.createElement("small");
        text.textContent = "İlk takımı sen kur: Takım Oluştur sekmesine geç.";
        empty.append(title, text);
        list.appendChild(empty);
      }
    }

    const creation = teamState.creation || {};
    const cost = Math.max(0, Number(creation.cost_circuit_credits || 0));
    const credits = Number(creation.circuit_credits ?? metaProgressionState?.circuit_credits ?? 0);
    const costCopy = document.getElementById("team-create-cost");
    if (costCopy) {
      costCopy.textContent = cost > 0
        ? localizedMessage("team.creation_cost", {
            cost:localizedNumber(cost),
            credits:localizedNumber(credits),
          })
        : "Takım kurmak ücretsiz.";
      costCopy.dataset.affordable = String(credits >= cost);
    }
    const createButton = document.getElementById("team-create-button");
    if (createButton) {
      createButton.disabled = Boolean(teamState.application_pending) || credits < cost;
      createButton.textContent = teamState.application_pending
        ? "ÖNCE BAŞVURUNU GERİ ÇEK"
        : credits < cost ? "DEVRE KREDİSİ YETERSİZ" : "OLUŞTUR";
    }
    const requirement = document.getElementById("team-create-min-trophies");
    const options = creation.min_trophy_options || [0];
    if (requirement && requirement.dataset.options !== options.join(",")) {
      const previous = requirement.value;
      requirement.dataset.options = options.join(",");
      requirement.replaceChildren();
      for (const value of options) {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = Number(value) > 0
          ? localizedMessage("team.minimum_trophies", { trophies:localizedNumber(value) })
          : "Şart yok";
        requirement.appendChild(option);
      }
      if (options.map(String).includes(previous)) requirement.value = previous;
    }
    const description = document.getElementById("team-create-description");
    if (description && creation.description_max_length) {
      description.maxLength = Number(creation.description_max_length);
    }
  }

  // Takım liderine bekleyen başvuru ışığı: alt gezinmedeki TAKIM düğmesi,
  // takım amblemi (yönetim girişi) ve Üye Yönetimi sekmesi. Sayı takım
  // ekranı açıkken takım durumundan, diğer ekranlarda mesaj kutusu
  // tazelemesinden gelir.
  let pendingTeamApplications = 0;

  function noteTeamApplicationsFromTeamState() {
    if (!teamState) return;
    pendingTeamApplications = teamState.joined && teamState.is_owner
      ? Math.max(0, Number(teamState.pending_application_count ?? teamState.applications?.length ?? 0))
      : 0;
  }

  function noteTeamApplicationsFromInbox() {
    if (!rewardInboxState?.team) return;
    pendingTeamApplications = Math.max(0, Number(rewardInboxState.team.pending_applications || 0));
    renderTeamNotificationLights();
  }

  function renderTeamNotificationLights() {
    const count = pendingTeamApplications;
    const has = count > 0;
    for (const button of document.querySelectorAll('#app-bottom-dock [data-open-screen="team"]')) {
      button.classList.toggle("has-persistent-notification", has);
    }
    document.getElementById("team-management-open")?.classList.toggle("has-team-application", has);
    const badge = document.getElementById("team-application-badge");
    if (badge) {
      badge.hidden = !has;
      badge.textContent = has ? String(Math.min(99, count)) : "";
    }
  }

  function renderTeamHub() {
    const onboarding = document.getElementById("team-onboarding");
    const hub = document.getElementById("team-hub");
    if (!onboarding || !hub || !teamState) return;
    onboarding.hidden = Boolean(teamState.joined);
    hub.hidden = !teamState.joined;

    noteTeamApplicationsFromTeamState();
    renderTeamNotificationLights();
    if (!teamState.joined) {
      renderTeamLobby();
      return;
    }

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("team-name", teamState.name || "Takım");
    const teamDescription = document.getElementById("team-description");
    if (teamDescription) {
      teamDescription.textContent = teamState.description || "";
      teamDescription.hidden = !teamState.description;
    }
    setText("team-member-count", `${teamState.member_count || 0} / ${teamState.member_limit || 30} ÜYE`);
    renderTrophyValue("team-total-trophies", Number(teamState.total_trophies || 0));
    const statistics = teamState.statistics || {};
    const tournament = teamState.tournament || {};
    setText("team-profile-total-trophies", Number(teamState.total_trophies || 0).toLocaleString(uiLocale()));
    setText("team-profile-average-trophies", Number(teamState.average_trophies || 0).toLocaleString(uiLocale()));
    setText("team-profile-total-matches", Number(statistics.total_matches || 0).toLocaleString(uiLocale()));
    setText("team-profile-win-rate", `%${boundedWinRatePercent(statistics.win_rate || 0)}`);
    setText("team-profile-tournament-position", tournament.position ? `#${tournament.position}` : "—");
    setText("team-profile-tournament-points", `${Number(tournament.points || 0).toLocaleString(uiLocale())} P`);
    const teamIdentity = document.getElementById("team-identity-card");
    const teamAvatar = document.getElementById("team-avatar-glyph");
    const managementOpen = document.getElementById("team-management-open");
    const teamNameNode = document.getElementById("team-name");
    applyTeamAppearance(teamIdentity, teamState.appearance, { emblemHost:teamAvatar, nameHost:teamNameNode });
    if (managementOpen) managementOpen.disabled = !teamState.is_owner;
    renderTeamManagement();

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
      members.forEach((member, index) => memberList.appendChild(createTeamMemberRow(member, index, { manageable:true })));
    }

    renderTeamRequestComposer();
    renderTeamRequestList();

    const messageList = document.getElementById("team-message-list");
    if (messageList) {
      messageList.replaceChildren();
      const messages = teamState.messages || [];
      if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = "Takım sohbetini başlatabilirsin.";
        messageList.appendChild(empty);
      }
      for (const message of messages) {
        const row = document.createElement("article");
        row.className = `team-message${message.is_own ? " is-own" : ""}`;
        const author = createPublicPlayerName(
          message.author_id,
          message.author_name || "Oyuncu"
        );
        const text = document.createElement("p");
        text.setAttribute("translate", "no");
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
      placeholder.textContent = options.length ? "Çevrimiçi üye seç" : "Çevrimiçi üye yok";
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
        empty.textContent = "Bekleyen antrenman daveti yok.";
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
          challenge.challenger_name || "Oyuncu"
        );
        const arrow = document.createElement("span");
        arrow.textContent = "→";
        const opponentName = createPublicPlayerName(
          challenge.opponent_id,
          challenge.opponent_name || "Oyuncu"
        );
        title.append(challenger, arrow, opponentName);
        const meta = document.createElement("small");
        meta.textContent = challenge.status === "completed"
          ? "ANTRENMAN TAMAMLANDI · ÖDÜLSÜZ"
          : challenge.status === "pending" ? "DAVET BEKLİYOR · ÖDÜLSÜZ" : "KABUL EDİLDİ · ÖDÜLSÜZ";
        copy.append(title, meta);
        if (challenge.can_accept) {
          const accept = document.createElement("button");
          accept.type = "button";
          accept.textContent = "KABUL ET";
          accept.addEventListener("click", async () => {
            const result = await mutateTeam(
              `/teams/${encodeURIComponent(teamState.team_id)}/training-challenges/${encodeURIComponent(challenge.challenge_id)}/accept`,
              { requestKind:"training-accept" },
              "Antrenman daveti kabul ediliyor…"
            );
            if (result.ok && result.state?.operation?.battle) {
              launchSocialBattle(result.state.operation.battle);
            }
          });
          card.append(copy, accept);
        } else if (challenge.status === "accepted" && challenge.battle_session_id) {
          const enter = document.createElement("button");
          enter.type = "button";
          enter.textContent = "SAVAŞ ALANINA GİR";
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

  // Merkez ekranları. Her veri tazelemesinde ve ekran geçişinde hepsini baştan
  // kurmak düşük donanımda geçişleri ağırlaştırıyor, savaş başında da
  // takılma yaratıyordu. Görünen ekran hemen çizilir; diğerleri kirli
  // işaretlenip tarayıcı boştayken sırayla çizilir. Savaş ekranında bekletilir.
  const META_HUB_SECTIONS = Object.freeze([
    { id:"home", screens:["menu"], render:() => renderHomeHub() },
    {
      id:"cards",
      screens:["modules"],
      render:() => {
        renderModuleCollection();
        renderCoreCollection();
      },
    },
    { id:"shop", screens:["shop"], render:() => renderShop() },
    {
      id:"profile",
      screens:["profile", "statistics"],
      render:() => {
        renderCanonStatistics();
        renderProfileHighlights();
      },
    },
    { id:"team", screens:["team"], render:() => renderTeamHub() },
  ]);
  const metaHubDirtySections = new Set();
  let metaHubFlushHandle = null;

  function flushMetaHubSections({ all=false }={}) {
    metaHubFlushHandle = null;
    if (!all && appRouter.currentScreen === RelayAppScreen.PLAY) return;
    for (const section of META_HUB_SECTIONS) {
      if (!metaHubDirtySections.has(section.id)) continue;
      metaHubDirtySections.delete(section.id);
      section.render();
      if (!all) break;
    }
    scheduleMetaHubFlush();
  }

  // Ev ekranı görünmüyorken (ör. savaş başlarken) çizimi ekrana dönüşe bırakır.
  function renderHomeHubWhenVisible() {
    if (appRouter.currentScreen === RelayAppScreen.PLAY) {
      metaHubDirtySections.add("home");
      return;
    }
    metaHubDirtySections.delete("home");
    renderHomeHub();
  }

  function scheduleMetaHubFlush() {
    if (metaHubFlushHandle !== null || !metaHubDirtySections.size) return;
    if (appRouter.currentScreen === RelayAppScreen.PLAY) return;
    metaHubFlushHandle = typeof globalThis.requestIdleCallback === "function"
      ? globalThis.requestIdleCallback(() => flushMetaHubSections(), { timeout:900 })
      : window.setTimeout(() => flushMetaHubSections(), 60);
  }

  function renderMetaHubScreens() {
    const current = appRouter.currentScreen;
    for (const section of META_HUB_SECTIONS) {
      if (section.screens.includes(current)) {
        metaHubDirtySections.delete(section.id);
        section.render();
      } else {
        metaHubDirtySections.add(section.id);
      }
    }
    const state = metaProgressionState;
    if (state) {
      const credits = document.getElementById("lobby-circuit-credits");
      if (credits) credits.textContent = String(state.circuit_credits || 0);
      const flux = document.getElementById("lobby-flux-shards");
      if (flux) flux.textContent = String(state.flux_shards || 0);
    }
    scheduleMetaHubFlush();
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
    registerEvent("/events/weekly/register", "weekly-event-status", "Turnuva kaydı yapılıyor…")
  );
  document.getElementById("team-tournament-register")?.addEventListener("click", () =>
    registerEvent("/events/team/register", "team-event-status", "Takım turnuvaya kaydediliyor…")
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
      if (output) {
        output.hidden = false;
        output.textContent = `Davet kodu: ${invite.code} · ${invite.web_link}`;
      }
    } catch (error) {
      if (output) {
        output.hidden = false;
        output.textContent = error instanceof Error ? error.message : String(error);
      }
    }
  });
  document.getElementById("direct-message-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendDirectMessage();
  });
  document.getElementById("direct-message-back")?.addEventListener("click", closeDirectMessageThread);
  document.querySelectorAll("[data-friends-tab]").forEach((button) => {
    button.addEventListener("click", () => openFriendsTab(button.dataset.friendsTab));
  });
  document.getElementById("friend-search-close")?.addEventListener("click", clearFriendSearch);
  globalThis.addEventListener?.("gridshard:deep-link", (event) => {
    const rawUrl = event?.detail?.url || event?.detail || "";
    void afterStartup(() => handleApplicationUrl(rawUrl));
  });
  const nativeOAuth = globalThis.GridshardNativeOAuth
    ? new globalThis.GridshardNativeOAuth({request:requestJsonWithDeadline}) : null;
  const playGames = globalThis.GridshardPlayGames
    ? new globalThis.GridshardPlayGames({request:requestJsonWithDeadline}) : null;
  const playGamesReady = playGames ? Promise.race([
    playGames.prepare(), new Promise(resolve => setTimeout(() => resolve(false), 8000)),
  ]) : Promise.resolve(false);
  const accountSessionControls = globalThis.GridshardAccountSessionControls
    ? new globalThis.GridshardAccountSessionControls({
      document, auth:globalThis.GridshardAuth?.session, playGames, ready:playGamesReady,
      playerId:participantPlayerId, request:requestJsonWithDeadline,
      canRecoverCurrent:() => Boolean(playGames?.configured && accountPlatformState?.oauth?.google_play_games?.linked
        && accountPlatformState?.oauth?.google_play_games?.configured),
      onRevoked:state => { accountPlatformState = state; renderAccountPlatform(); },
    }) : null;
  function renderPlayGamesButtons() {
    const provider = accountPlatformState?.oauth?.google_play_games || {};
    for (const [id, label] of [["account-onboarding-play-games", "PLAY GAMES İLE DEVAM ET"], ["account-oauth-play-games", "PLAY GAMES BAĞLA"]]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.hidden = !playGames?.configured;
      button.disabled = Boolean(playGames?.busy || provider.linked || !provider.configured);
      button.textContent = localizedMessage(provider.linked ? "PLAY GAMES BAĞLI" : provider.configured ? label : "PLAY GAMES SUNUCUDA HAZIR DEĞİL");
    }
    const guest = document.getElementById("account-onboarding-guest");
    if (guest) guest.disabled = Boolean(playGames?.busy);
  }
  for (const [id, mode, statusId] of [["account-onboarding-play-games", "login", "account-onboarding-status"], ["account-oauth-play-games", "link", "account-platform-status"]]) {
    document.getElementById(id)?.addEventListener("click", async () => {
      const status = document.getElementById(statusId);
      if (playGames?.busy) return;
      try {
        if (status) status.textContent = localizedMessage("Play Games hesabı doğrulanıyor…");
        const signingIn = playGames.begin(participantPlayerId, mode);
        renderPlayGamesButtons();
        await signingIn;
        globalThis.location.replace("/");
      } catch (error) {
        if (status) status.textContent = localizedMessage(error instanceof Error ? error.message : String(error));
      } finally { renderPlayGamesButtons(); }
    });
  }
  async function handleApplicationUrl(url) {
    try {
      const result = await nativeOAuth?.consume(url);
      if (result?.handled) {
        if (result.status === "linked" && !result.duplicate) {
          // Bootstrap again from the server-selected profile, not the old guest.
          globalThis.location.replace("/");
        } else if (!result.duplicate) {
          const message = result.status === "cancelled" ? "Hesap bağlantısı iptal edildi." : "Hesap bağlantısı tamamlanamadı.";
          renderAccountOnboarding(message);
          const status = document.getElementById("account-platform-status");
          if (status) status.textContent = message;
        }
        return;
      }
      await consumePendingDeepLink(url);
    } catch (error) {
      const status = document.getElementById("account-platform-status");
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
      renderAccountOnboarding(error instanceof Error ? error.message : String(error));
    }
  }
  async function beginAccountOAuth(provider, mode, status) {
    if (!nativeOAuth) throw new Error("Sağlayıcı oturum köprüsü hazır değil.");
    const result = await nativeOAuth.begin(participantPlayerId, provider, mode);
    if (!result.configured && status) status.textContent = `${provider.toUpperCase()} bağlantısı sunucuda henüz yapılandırılmadı.`;
  }
  const nativeAppPlugin = globalThis.Capacitor?.Plugins?.App
    || (["android", "ios"].includes(globalThis.Capacitor?.getPlatform?.()) ? globalThis.Capacitor?.registerPlugin?.("App") : null);
  nativeAppPlugin?.addListener?.("appUrlOpen", ({ url }) => {
    void afterStartup(() => handleApplicationUrl(url));
  });
  const nativeLaunchUrl = nativeAppPlugin?.getLaunchUrl?.();
  nativeLaunchUrl?.then((result) => {
    if (result?.url) void afterStartup(() => handleApplicationUrl(result.url));
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
        await beginAccountOAuth(provider, "login", status);
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
        ? `Kod ${result.destination} adresine gönderildi.`
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
        ? `Kod ${result.destination} adresine gönderildi.`
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
        await beginAccountOAuth(provider, "link", status);
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
      const authSession = globalThis.GridshardAuth?.session;
      if (!authSession) throw new Error("Güvenli cihaz oturumu yüklenemedi.");
      await authSession.stageRecoverySecret(participantPlayerId, newDeviceSecret);
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
      await authSession.finishRecoverySecret(newDeviceSecret);
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
  // native-push.js yüklenemezse yalnız bildirimler kapanır; oyun açılmaya devam eder.
  const NativePushController = globalThis.GridshardNativePush?.NativePushController;
  const nativePush = NativePushController ? new NativePushController({
    request: (path, options) => requestJsonWithDeadline(path, options, 12000),
    identity: () => ({ playerId: participantPlayerId, deviceId: globalThis.GridshardAuth?.session?.deviceId?.() }),
    onStatus: setNativePushStatus,
    onOpen: (url) => afterStartup(() => consumePendingDeepLink(url)),
  }) : null;
  // Soğuk açılıştaki bildirim dokunuşu kaçmasın diye dinleyiciler kimlikten önce kurulur.
  void nativePush?.listen().catch(() => {});
  for (const [id, action] of [["account-push-enable", "enable"], ["account-push-disable", "disable"]]) {
    const button = document.getElementById(id);
    if (button) button.hidden = !nativePush?.plugin;
    button?.addEventListener("click", async () => {
      button.disabled = true;
      try { await nativePush?.[action](); }
      catch (_) { setNativePushStatus("Bildirim işlemi tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin."); }
      finally { button.disabled = false; }
    });
  }
  const resumeNativePush = () => {
    if (accountPlatformState && document.visibilityState !== "hidden") {
      void nativePush?.start().catch(() => {});
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
      anchor.download = `gridshard-${participantPlayerId}-veri.json`;
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
    const description = document.getElementById("team-create-description");
    const requirement = document.getElementById("team-create-min-trophies");
    const name = input?.value?.trim() || "";
    if (!name) {
      setTeamActionStatus("Takım adı gerekli.", "error");
      input?.focus?.();
      return;
    }
    const result = await mutateTeam(
      "/teams",
      {
        name,
        description:description?.value?.trim() || "",
        min_trophies:Number(requirement?.value || 0),
        requestKind:"create",
      },
      "Takım oluşturuluyor…"
    );
    if (result.ok) {
      if (input) input.value = "";
      if (description) description.value = "";
      // Kurma bedeli düştü: kaynak barı ve mağaza güncellensin.
      void loadMetaProgression();
    }
  });
  document.querySelectorAll("[data-team-lobby-tab]").forEach((button) => {
    button.addEventListener("click", () => openTeamLobbyTab(button.dataset.teamLobbyTab));
  });
  document.getElementById("team-management-open")?.addEventListener("click", () => {
    if (!teamState?.is_owner) return;
    activeTeamTab = "management";
    renderTeamHub();
  });
  document.getElementById("team-management-back")?.addEventListener("click", () => {
    activeTeamTab = "profile";
    renderTeamHub();
  });
  document.querySelectorAll("[data-team-management-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTeamManagementTab = button.dataset.teamManagementTab || "cosmetics";
      renderTeamManagement();
    });
  });
  document.getElementById("team-appearance-save")?.addEventListener("click", async () => {
    if (!teamState?.team_id || !teamAppearanceDraft) return;
    const status = document.getElementById("team-management-status");
    const result = await mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/cosmetics`,
      {
        emblem_id:teamAppearanceDraft.emblem_id,
        frame_id:teamAppearanceDraft.frame_id,
        name_color_id:teamAppearanceDraft.name_color_id,
        requestKind:"team-appearance",
      },
      "Takım görünümü kaydediliyor…"
    );
    if (status) status.textContent = result.ok ? "Takım görünümü kaydedildi." : "";
    if (result.ok) teamAppearanceDraft = null;
    renderTeamHub();
  });
  document.getElementById("team-module-request-button")?.addEventListener("click", async () => {
    const moduleId = selectedTeamRequestModuleId;
    if (!moduleId || !teamState?.team_id) {
      setTeamActionStatus("İstemek için bir modül seç.", "error");
      return;
    }
    const result = await mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/module-requests`,
      { module_id:moduleId, requestKind:"module-request" },
      "Modül isteği oluşturuluyor…"
    );
    if (result.ok) {
      selectedTeamRequestModuleId = "";
      renderTeamHub();
    }
  });
  document.getElementById("team-module-request-filters")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-request-rarity]");
    if (!button) return;
    activeTeamRequestRarity = button.dataset.requestRarity || "all";
    renderTeamRequestComposer();
  });
  async function sendTeamMessage() {
    const input = document.getElementById("team-message-input");
    const message = input?.value?.trim() || "";
    if (!message || !teamState?.team_id) return;
    const result = await mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/messages`,
      { message, requestKind:"message" },
      "Mesaj gönderiliyor…"
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
      setTeamActionStatus("Antrenman için çevrimiçi bir üye seç.", "error");
      return;
    }
    recentBattleInviteTargets.add(opponentId);
    mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/training-challenges`,
      { opponent_id:opponentId, requestKind:"training" },
      "Antrenman daveti gönderiliyor…"
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
  document.querySelectorAll("[data-cosmetic-tab]").forEach((button) => {
    button.addEventListener("click", () => openCosmeticTab(button.dataset.cosmeticTab));
  });
  // Kaynak barındaki Akı / Devre Kredisi mağazayı ilgili paketlerin önünde açar.
  document.querySelectorAll("[data-resource-shop]").forEach((button) => {
    button.addEventListener("click", () => {
      // Ekran geçişi aynı dokunuşla başlar; kaydırma mağaza çizildikten sonra yapılır.
      window.setTimeout(() => {
        const target = document.getElementById(
          button.dataset.resourceShop === "flux" ? "paid-flux-packs" : "paid-credit-packs"
        );
        const heading = target?.previousElementSibling || target;
        heading?.scrollIntoView?.({ block:"start", behavior:"auto" });
      }, 0);
    });
  });
  document.getElementById("module-quick-info")?.addEventListener("click", openModuleDetail);
  document.getElementById("module-quick-select")?.addEventListener("click", selectCollectionModule);
  document.getElementById("core-quick-info")?.addEventListener("click", openCoreDetail);
  document.getElementById("core-quick-select")?.addEventListener("click", selectCollectionCore);
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

  const playRecoveryState =
    new RelayPlayRecoveryState();

  const serverHealthState =
    new RelayServerHealthState();

  const serverBootGate =
    new RelayServerBootGate({
      healthState:
        serverHealthState,
      expectedVersion:
        "2.1.0-beta.72",
      expectedProtocolVersion: 1,
    });
  const playReadinessGate =
    new RelayPlayReadinessGate({
      serverBootGate,
      participantBootstrap,
      participantContinuity,
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
    build: "2.1.0-beta.72",
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
                  payload.detail
                  || `Maç sonucu kaydı alınamadı (${response.status}).`
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
      player_inactive: "Hareketsizlik",
      mutual_inactivity: "Karşılıklı hareketsizlik",
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
    const adReceipt = postMatchSync.lastBattleId ? adRewardReceipts.get(postMatchSync.lastBattleId) : null;
    const adMultiplier = adReceipt ? 2 : 1;
    if (credits) credits.textContent = progression
      ? `+${Number(progression.circuitCreditsAwarded || 0) * adMultiplier}${adReceipt ? " · x2" : ""}`
      : localTest ? "+0" : pendingLabel;
    if (experience) experience.textContent = progression
      ? `+${Number(progression.xpAwarded || 0) * adMultiplier}${adReceipt ? " · x2" : ""}`
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
    if (!storeState) void loadStoreState();
    renderPostMatchPremium();
    renderPostMatchAdReward();
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
        playerLabel.textContent = `${playerName}${playerId === participantPlayerId ? " · SEN" : ""}`;
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
      coreName.textContent = coreVisual.nameTr || "Çekirdek";
      const coreLevel = document.createElement("small");
      coreLevel.textContent = `SEVİYE ${Math.max(1, Number(summary.core_level || player.core_level || 1))}`;
      const trophy = document.createElement("b");
      const rating = Number(
        player.rating
        ?? (playerId === participantPlayerId ? profileState.viewModel()?.rating : 0)
        ?? 0
      );
      trophy.textContent = `🏆 ${Math.max(0, Math.round(rating)).toLocaleString(uiLocale())}`;
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
      totalValue.textContent = totalEquivalent.toLocaleString(uiLocale());
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
        rowName.textContent = item.name_tr || item.definition_id;
        const levelCopy = document.createElement("small");
        levelCopy.textContent = `SV ${Number(item.level || 1)}`;
        const track = document.createElement("i");
        const fill = document.createElement("b");
        fill.style.width = `${Math.max(0, Math.min(100, item.effectiveDamage / maximum * 100))}%`;
        track.appendChild(fill);
        copy.append(rowName, levelCopy, track);
        const damage = document.createElement("em");
        damage.textContent = item.effectiveDamage.toLocaleString(uiLocale());
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
    // Verilen hasar sunucu maç özetinden okunur.
    const ownSummary =
      localServerFinalResult?.result_summary?.[participantPlayerId] || {};
    setAnalysisValue(
      "battle-analysis-damage",
      Number(ownSummary.damage_dealt || 0)
    );
    setAnalysisValue("battle-analysis-core", `${Number(core?.hp || 0)} HP`);
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
    // İmza saldırı kartları en yakın temel silahın atış görselini kullanır;
    // ayırt edici görüntüleri imza efektlerinden gelir.
    plasma_mortar:{
      cue:"plasma_mortar_fire",
      fx:"missile",
      travelMs:600,
    },
    quantum_repeater:{
      cue:"quantum_repeater_fire",
      fx:"laser",
      travelMs:240,
    },
    ion_spear:{
      cue:"ion_spear_fire",
      fx:"railgun",
      travelMs:220,
    },
    swarm_fabricator:{
      cue:"swarm_fabricator_fire",
      fx:"drone",
      travelMs:430,
    },
    quantum_cannon:{
      cue:"quantum_cannon_fire",
      fx:"pulse",
      travelMs:380,
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
    for (const panel of document.querySelectorAll("[data-screen-panel], #app-resource-bar, #app-progress-ribbon, #app-bottom-dock")) {
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
      preparedCorePowerFx.clear();
      snapshotModuleHp.clear();
      serverDestroyedModuleAt.clear();
      if (document.documentElement) document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (battleJustStarted) {
        triggerGridshardCue("energy_transfer");
      }
    }
    renderPlayModeUi();
    renderHomeHubWhenVisible();
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
        },
    });

  async function startRealOnlineMatch() {
    trackMatchmakingStart();

    const result =
      await onlinePlay.start({
        battlePoolIds:
          selectedBattlePoolDefinitionIds(),
        initialModules:
          buildInitialOnlineSetup(),
        // İlk oyun deneyimi: sunucudan yönetmenli ilk savaş istenir.
        tutorial:
          onboardingWantsDirectedBattle(),
      });

    if (result.cancelled) return result;

    if (result.ok && result.sessionId) {
      recordProductEvent("matchmaking_matched", {
        opponent:String(result.sessionId).startsWith("local-ai-match-") ? "ai" : "human",
      });
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
  const battleEmojiTrayEl = document.getElementById("battle-emoji-tray");
  const BATTLE_EMOJI_COOLDOWN_MS = 3000; // sunucudaki bekleme ile aynı
  let battleEmojiCooldownUntil = 0;
  let battleEmojiCooldownTimer = 0;
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

  let renderedCorePowerSignature = null;

  function renderCorePowerControl() {
    if (!corePowerButtonEl) return;
    const charge=Math.max(0,Math.min(100,Math.round(corePowerCharge)));
    const selectedCore = metaProgressionState?.cores?.selected_core_type || "core_resonance";
    // Her sunucu mesajında çağrılır; görünüm değişmediyse DOM'a dokunma.
    const signature = [
      charge,
      corePowerReady,
      corePowerTargeting,
      localBattleFinished,
      selectedCore,
      document.documentElement?.lang || "tr",
    ].join("|");
    if (signature === renderedCorePowerSignature) {
      renderBattleEmojiControl();
      return;
    }
    renderedCorePowerSignature = signature;
    corePowerButtonEl.style.setProperty("--core-charge",`${charge}%`);
    corePowerButtonEl.dataset.ready=String(corePowerReady);
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
      coreCard.setAttribute("aria-label", `Çekirdek gücü · ${corePowerReady ? "Hazır" : "%" + charge}`);
      const icon = coreCard.querySelector(".module-icon");
      if (icon) icon.textContent = glyph;
    }
    applyCoreVisualIdentity(board, selectedCore);
    corePowerButtonEl.dataset.targeting=String(corePowerTargeting);
    corePowerButtonEl.disabled=localBattleFinished || !corePowerReady;
    corePowerButtonEl.setAttribute("aria-pressed",String(corePowerTargeting));
    // Kuantum · Yarım Faz: güç %50'de kullanılabilir, tam dolmadan yalnız kalkan verir.
    const halfPhaseReady = corePowerReady && charge < 100;
    corePowerButtonEl.dataset.halfPhase=String(halfPhaseReady);
    corePowerButtonEl.title=corePowerReady
      ? (halfPhaseReady
          ? "Yarım Faz hazır · yalnız kalkan; tam dolumda onarım da gelir"
          : (corePowerTargeting
              ? "Çekirdek gücünü kullan"
              : "Çekirdek gücü hazır"))
      : `Çekirdek gücü doluyor · %${charge}`;
    if (corePowerChargeEl) {
      corePowerChargeEl.textContent=corePowerReady
        ? (halfPhaseReady ? "YARIM" : "HAZIR")
        : `%${charge}`;
    }
    renderBattleEmojiControl();
  }

  // Savaş emojileri: düğme, oyuncunun açtığı bütün emojileri gösteren tepsiyi
  // açar; seçilen emoji rakibin de gördüğü savaş olayı olarak gönderilir.

  function closeBattleEmojiTray() {
    if (!battleEmojiTrayEl || battleEmojiTrayEl.hidden) return;
    battleEmojiTrayEl.hidden = true;
    battleEmojiButtonEl?.setAttribute("aria-expanded", "false");
  }

  let renderedBattleEmojiSignature = null;

  function renderBattleEmojiControl() {
    if (!battleEmojiButtonEl) return;
    const cosmetics = profileState.viewModel()?.cosmetics;
    const available = availableBattleEmojis(cosmetics);
    const coolingDown = Date.now() < battleEmojiCooldownUntil;
    const quick = quickBattleEmoji(cosmetics) || { glyph:"🙂", real:true };
    if (localBattleFinished || coolingDown) closeBattleEmojiTray();
    // Düğme görseli yeniden kurulursa animasyonu baştan başlar; değişmediyse bırak.
    const signature = [
      available.map((emoji) => emoji.id).join(","),
      coolingDown,
      localBattleFinished,
      quick.id || quick.glyph,
    ].join("|");
    if (signature === renderedBattleEmojiSignature) return;
    renderedBattleEmojiSignature = signature;
    battleEmojiButtonEl.hidden = !available.length;
    battleEmojiButtonEl.disabled = localBattleFinished || coolingDown;
    battleEmojiButtonEl.dataset.cooldown = String(coolingDown);
    if (battleEmojiButtonGlyphEl) {
      renderBattleEmojiVisual(battleEmojiButtonGlyphEl, quick);
    }
  }

  function openBattleEmojiTray() {
    if (!battleEmojiTrayEl) return;
    const available = availableBattleEmojis(profileState.viewModel()?.cosmetics);
    battleEmojiTrayEl.replaceChildren(...available.map((emoji) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "battle-emoji-option";
      option.setAttribute("role", "menuitem");
      option.setAttribute("aria-label", emoji.nameTr);
      option.title = emoji.nameTr;
      option.appendChild(createBattleEmojiVisual(emoji));
      option.addEventListener("click", () => sendBattleEmoji(emoji.id));
      return option;
    }));
    positionBattleEmojiTray();
    battleEmojiTrayEl.hidden = false;
    battleEmojiButtonEl?.setAttribute("aria-expanded", "true");
  }

  // Raf paneli taşanı kestiği için tepsi sabit konumda, düğmenin üstünde açılır.
  function positionBattleEmojiTray() {
    const anchor = battleEmojiButtonEl?.getBoundingClientRect();
    if (!battleEmojiTrayEl || !anchor) return;
    battleEmojiTrayEl.style.right = `${Math.max(8, window.innerWidth - anchor.right)}px`;
    battleEmojiTrayEl.style.bottom = `${Math.max(8, window.innerHeight - anchor.top + 8)}px`;
  }

  function sendBattleEmoji(emojiId) {
    if (localBattleFinished || Date.now() < battleEmojiCooldownUntil) return;
    client.emitCommand({
      kind:"send_battle_emoji",
      payload:{emoji_id:emojiId},
    });
    battleEmojiCooldownUntil = Date.now() + BATTLE_EMOJI_COOLDOWN_MS;
    closeBattleEmojiTray();
    renderBattleEmojiControl();
    window.clearTimeout(battleEmojiCooldownTimer);
    battleEmojiCooldownTimer = window.setTimeout(
      renderBattleEmojiControl,
      BATTLE_EMOJI_COOLDOWN_MS + 30
    );
  }

  function syncCorePowerFromSnapshot(player) {
    client.currentDiscountRemaining = Number(player?.discounted_deployments || 0);
    client.energyLoadRatio = Number(player?.energy_load_ratio || 0);
    client.energyStock = Number(player?.energy_stock || 0);
    // Enerji sırası rezervi bekleyen aksiyon için biriktirdiği için rezerv
    // sıfıra nadiren iner; açığı yük oranı gösterir.
    document.getElementById("board")?.classList.toggle("energy-strain", client.energyLoadRatio > 1.1);
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
  battleEmojiButtonEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (battleEmojiTrayEl?.hidden === false) closeBattleEmojiTray();
    else openBattleEmojiTray();
  });
  document.addEventListener("pointerdown", (event) => {
    if (battleEmojiTrayEl?.hidden !== false) return;
    if (event.target.closest?.("#battle-emoji-tray, #battle-emoji-button")) return;
    closeBattleEmojiTray();
  }, true);
  // Mobil tarayıcı çubuğu kayınca görüntü alanı değişir; tepsi düğmeye bağlı kalır.
  window.addEventListener("resize", () => {
    if (battleEmojiTrayEl?.hidden === false) positionBattleEmojiTray();
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

    if (serverBootRetry) {
      serverBootRetry.hidden =
        serverBootGate.canPlay();
    }
  }

  async function checkServerReadiness() {
    renderServerBootStatus();

    const pending =
      serverBootGate.check();

    renderServerBootStatus();

    const result =
      await pending;

    if (!result.ok) {
      showPlayError(
        "websocket",
        result.reason || "Sunucu bağlantısı hazır değil."
      );
    } else if (playRecoveryState.kind === "websocket") {
      clearPlayError();
    }
    renderParticipantBootstrapStatus();
    renderServerBootStatus();
    return result;
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

  renderAppScreen();
  renderConnectionStatus(
    pvpConnection.status
  );
  if (startupLoading) startupLoading.onRetry = () => { void bootstrapParticipant(); };

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
  let battleStartedAt = performance.now();
  gridshardAudioDirector =
    typeof GridshardAudioDirector === "function"
      ? new GridshardAudioDirector()
      : null;
  gridshardAudioDirector?.bindUserGestureUnlock?.(document);
  gridshardAudioDirector?.bindAppLifecycle?.(document, globalThis);
  if (globalThis.Capacitor?.isNativePlatform?.()) {
    const systemBars = globalThis.Capacitor.Plugins?.SystemBars;
    const restoreImmersiveMode = () => {
      if (document.hidden || typeof systemBars?.hide !== "function") return;
      try { Promise.resolve(systemBars.hide()).catch(() => {}); } catch (_) {}
    };
    document.addEventListener("visibilitychange", restoreImmersiveMode);
    globalThis.addEventListener?.("focus", restoreImmersiveMode);
    globalThis.addEventListener?.("pageshow", restoreImmersiveMode);
    restoreImmersiveMode();
  }
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

  let activePlayMode = "idle";
  const AI_ARCHETYPE_UI = Object.freeze({
    aggressive:{
      name_tr:"Saldırgan", name_en:"Aggressive",
      description_tr:"Erken hasar temposu kurar; saldırı modüllerini öne alır.",
      description_en:"Builds early damage pressure and prioritizes attack modules.",
    },
    defensive:{
      name_tr:"Savunmacı", name_en:"Defensive",
      description_tr:"Çekirdeği ayakta tutar; savunma ve onarım katmanını saldırı baskısına göre büyütür.",
      description_en:"Protects the core by layering defense and repair against incoming pressure.",
    },
    balanced:{
      name_tr:"Dengeli", name_en:"Balanced",
      description_tr:"Rakibin devresine göre karşı modül seçer; saldırı ve savunmayı dengeler.",
      description_en:"Counters the opponent while balancing offense and defense.",
    },
    balanced_control:{
      name_tr:"Dengeli Kontrol", name_en:"Balanced Control",
      description_tr:"Dengeli oynar; rakibin kilit sistemini EMP ve Sinyal Bozucu ile susturur, Batarya ve Soğutucuyla temposunu korur.",
      description_en:"Plays balanced; silences a key enemy system with EMP and Jammer and keeps its tempo with Battery and Cooler.",
    },
    balanced_economy:{
      name_tr:"Dengeli Ekonomi", name_en:"Balanced Economy",
      description_tr:"Dengeli oynar; Batarya ve Akım Dengeleyiciyle enerjisini sağlam tutar, Sinyal Bozucu ile rakibin destek hattını keser.",
      description_en:"Plays balanced; keeps its energy steady with Battery and Current Balancer and cuts the enemy support line with Jammer.",
    },
  });
  let selectedAiArchetype = "balanced";
  let activeLocalAiArchetype = "balanced";

  function aiArchetypeInfo(archetypeId=selectedAiArchetype) {
    return AI_ARCHETYPE_UI[archetypeId] || AI_ARCHETYPE_UI.balanced;
  }

  function aiArchetypeName(archetypeId=selectedAiArchetype) {
    const info=aiArchetypeInfo(archetypeId);
    // Metin Türkçe yazılır; İngilizce görünümü i18n katmanı üretir.
    return info.name_tr;
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
      description.textContent = english ? info.description_en : info.description_tr;
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
  // Oyuncu:modül → sunucudaki yok etme anı (at_ms). Anlık görüntü saniyede bir
  // gelir; olaydan önce alınmış bayat bir görüntü ölü modülü geri getirmez.
  const serverDestroyedModuleAt = new Map();
  const moduleAnchorRects = new Map();
  // Modül kimliği → en son çizildiği hücre (düzen okumadan tutulur).
  const moduleAnchorCells = new Map();
  const floatingFeedbackLive = new Map();
  let battleLiveTickerTimer = null;

  let previousCapacity = null;
  let mockEnemyCoreHp = 300;
  let mockEnemyCoreMaxHp = 300;
  let mockEnemyCoreBadges = [];
  let mockEnemyModuleHp = 140;
  let mockEnemyModules = [];
  let enemyBattlePlayerId = null;
  let enemyBattleDisplayName = "";
  let enemyBattlePoolDefinitionIds = [
    ...STARTER_BATTLE_POOL_PRESET.module_definition_ids,
  ];
  let playerCellDebris = [];
  let enemyCellDebris = [];

  function enemyLivingModules() {
    return mockEnemyModules.filter((module)=>Number(module.hp||0)>0);
  }

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
      frame_count:0,
      max_frame_gap_ms:0,
      pause_violation_count:0,
      ui_interactions:0,
      ui_interaction_samples:[],
      ux_categories:{
        module_place:0,
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

  // Efekt çapaları. Bir sunucu mesajı onlarca efekt üretir; her efektin kendi
  // getBoundingClientRect okuması, araya giren DOM yazmalarıyla tarayıcıyı her
  // seferinde düzen hesabına zorluyordu. Aynı görev içindeki ilk istek katmanı
  // ve tahtadaki bütün kartları tek okuma turunda ölçer; kalan istekler bu
  // ölçümden yanıtlanır. Ölçüm görev bitince atılır, böylece bayatlamaz.
  let battleAnchorBatch = null;

  function battleAnchorRects() {
    if (battleAnchorBatch) return battleAnchorBatch;
    const batch = { layer:null, modules:new Map() };
    const layer = document.getElementById("battle-effect-layer");
    if (layer && typeof layer.getBoundingClientRect === "function") {
      batch.layer = layer.getBoundingClientRect();
    }
    for (const root of [board, enemyBoard]) {
      if (!root || typeof root.querySelectorAll !== "function") continue;
      for (const element of root.querySelectorAll("[data-module-id]")) {
        if (typeof element.getBoundingClientRect !== "function") continue;
        batch.modules.set(String(element.dataset.moduleId), element.getBoundingClientRect());
      }
    }
    battleAnchorBatch = batch;
    const release = () => {
      if (battleAnchorBatch === batch) battleAnchorBatch = null;
    };
    if (typeof queueMicrotask === "function") queueMicrotask(release);
    else Promise.resolve().then(release);
    return batch;
  }

  function battleEffectLayerRect(layer) {
    const batch = battleAnchorRects();
    if (batch.layer) return batch.layer;
    return layer.getBoundingClientRect();
  }

  function rememberModuleAnchor(moduleId, rect) {
    moduleAnchorRects.set(String(moduleId), {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      capturedAt: Date.now(),
    });
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
    rememberModuleAnchor(moduleId, element.getBoundingClientRect());
  }

  function resolveModuleAnchor(
    moduleId,
    { core=false }={}
  ) {
    const key = String(moduleId);
    const batch = battleAnchorRects();
    const measured = batch.modules.get(key);
    if (measured) {
      rememberModuleAnchor(key, measured);
      return measured;
    }
    // Kartı tahtadan kalkmış modül (ör. imha sonrası gecikmeli geri bildirim):
    // önce son çizildiği hücre, sonra Çekirdek hücresi, en son eski ölçüm.
    let target = document.querySelector(
      `[data-module-id="${moduleId}"]`
    );
    if (!target) {
      const cell = moduleAnchorCells.get(key);
      if (cell?.isConnected) target = cell;
    }
    if (!target && core) {
      target = document.querySelector(
        key.startsWith("enemy-")
          ? ".duel-enemy-side .core-cell"
          : ".duel-player-side .core-cell"
      );
    }
    if (
      target
      && typeof target.getBoundingClientRect === "function"
    ) {
      const rect = target.getBoundingClientRect();
      batch.modules.set(key, rect);
      rememberModuleAnchor(key, rect);
      return rect;
    }
    return moduleAnchorRects.get(key) || null;
  }

  // Efekt süpürücüsü. Her efekt öğesi ve vurgu sınıfı için ayrı zamanlayıcı
  // kurmak yoğun savaşta ana iş parçacığını saniyede onlarca kez uyandırıyordu;
  // her uyanışta da o an çalışan bütün animasyonların stili yeniden
  // hesaplanır (animasyonlu öğe sıradan öğenin on katından pahalıdır). Süresi
  // dolan işler HUD turunda ve her sunucu mesajında topluca çalışır;
  // animasyonu biten öğe o ana kadar görünmez bekler.
  const battleSweepQueue = [];

  function scheduleBattleSweep(delayMs, run) {
    const entry = {
      at:performance.now() + Math.max(0, Number(delayMs) || 0),
      run,
      cancelled:false,
    };
    battleSweepQueue.push(entry);
    return entry;
  }

  function runBattleSweep(now=performance.now()) {
    if (!battleSweepQueue.length) return;
    let kept = 0;
    for (let index = 0; index < battleSweepQueue.length; index += 1) {
      const entry = battleSweepQueue[index];
      if (entry.cancelled) continue;
      if (entry.at <= now) {
        try {
          entry.run();
        } catch (_error) {
          // Temizlik hatası savaşı durdurmamalı.
        }
        continue;
      }
      battleSweepQueue[kept] = entry;
      kept += 1;
    }
    battleSweepQueue.length = kept;
  }

  // Kart/öğe üzerinde süreli vurgu sınıfı. Eski yöntem (`void el.offsetWidth`)
  // her çağrıda eşzamanlı stil ve düzen hesabı yaptırıyordu. Sınıf yoksa doğrudan
  // eklenir. Süren bir vurgu varken: Yüksek kademede sınıf kaldırılıp iki kare
  // sonra geri eklenir (animasyon baştan oynar); diğer kademelerde yalnız sınıf
  // değişir ve süre uzar, çünkü baştan başlatma iki ek ana kare ister.
  const battleFxStates = new WeakMap();

  function playBattleFxClass(element, className, durationMs, groupClasses=[className]) {
    if (!element?.classList) return;
    const previous = battleFxStates.get(element);
    if (previous) {
      if (previous.entry) previous.entry.cancelled = true;
      if (previous.frame && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(previous.frame);
      }
    }
    const state = { entry:null, frame:null };
    battleFxStates.set(element, state);
    const scheduleRemoval = () => {
      state.entry = scheduleBattleSweep(durationMs, () => {
        element.classList.remove(className);
        if (battleFxStates.get(element) === state) battleFxStates.delete(element);
      });
    };
    const active = groupClasses.some((name) => element.classList.contains(name));
    if (
      !active
      || battleGraphicsQuality() !== "yuksek"
      || typeof window.requestAnimationFrame !== "function"
    ) {
      for (const name of groupClasses) {
        if (name !== className) element.classList.remove(name);
      }
      element.classList.add(className);
      scheduleRemoval();
      return;
    }
    element.classList.remove(...groupClasses);
    state.frame = window.requestAnimationFrame(() => {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = null;
        element.classList.add(className);
        scheduleRemoval();
      });
    });
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
    // Bir mesajda onlarca olay gelebilir; süren vurguyu her biri için baştan
    // başlatmak yerine yalnız metin güncellenir.
    if (!battleLiveTickerEl.classList.contains("pulse")) {
      playBattleFxClass(battleLiveTickerEl, "pulse", 420);
    }
    window.clearTimeout(battleLiveTickerTimer);
    battleLiveTickerTimer = window.setTimeout(() => {
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
    if (record.removal) record.removal.cancelled = true;
    record.chip?.remove?.();
    floatingFeedbackLive.delete(effectId);
    battleEffectAggregator?.release?.(effectId);
    return true;
  }

  function scheduleFloatingFeedbackRemoval(effectId, lifetimeMs=1240) {
    const record = floatingFeedbackLive.get(effectId);
    if (!record) return;
    if (record.removal) record.removal.cancelled = true;
    record.removal = scheduleBattleSweep(
      lifetimeMs,
      () => removeFloatingFeedbackRecord(effectId)
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

    const layerRect = battleEffectLayerRect(layer);
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

    // Biriken değer güncellenince yazı baştan canlanmalı. Animasyonu yerinde
    // yeniden başlatmak (zorunlu düzen ya da iki ek kare) yerine yazı öğesi
    // yenisiyle değiştirilir; yeni öğe animasyonuna kendiliğinden baştan başlar.
    const existing = floatingFeedbackLive.get(eventResult.id);
    const stacked = Boolean(existing?.chip?.isConnected);
    if (existing) {
      if (existing.removal) existing.removal.cancelled = true;
      existing.chip?.remove?.();
    }

    const chip = document.createElement("span");
    chip.className = stacked
      ? `battle-floating-feedback ${variant} stacked`
      : `battle-floating-feedback ${variant}`;
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
      removal:null,
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
    const moduleDomId = serverModuleDomId(playerId, serverModule);
    const core = serverModule.definition_id === "core";
    if (!core && playerId !== participantPlayerId) {
      emitSignatureBattleEffect("kill_confirm", moduleDomId, { label:"İMHA" });
    }
    return emitModuleExplosion(moduleDomId, { core });
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
    setBattleLiveTicker(`${coreModule?.name_tr || "Çekirdek"} gücü devreye yayıldı`, waveEffect);
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
    bubble.setAttribute("aria-label", emoji.nameTr);
    targetBoard.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 1900);
  }

  // Beta.72 imza mekaniklerinin yalnız görsel/ses karşılığı olan olayları.
  const SIGNATURE_EVENT_TYPES = new Set([
    "quantum_repeat",
    "quantum_collapse",
    "swarm_released",
    "phoenix_rebirth",
    "prism_energy_converted",
    "sabotage_echo_applied",
    "signature_secondary_hit",
    "nano_repair_pulse",
    "chrono_window_started",
    "chrono_debt_started",
    "attack_windup_started",
    "core_signature_triggered",
  ]);

  // Çekirdek imzası → efekt türü, etiket ve (varsa) canlı şerit metni.
  const CORE_SIGNATURE_PRESENTATION = Object.freeze({
    ember_rebirth:{
      effect:"core_rebirth",
      label:"DOĞUŞ",
      ownTicker:"Küllerden Doğuş · Çekirdeğin ayakta kaldı",
      rivalTicker:"Rakip Çekirdek küllerden doğdu",
    },
    last_stand:{ effect:"core_last_stand", label:"SON HAT" },
    overdrive_chain:{ effect:"core_chain", label:"ZİNCİR" },
    static_charge:{ effect:"core_static", label:"STATİK" },
    reserve_discharge:{ effect:"core_discharge", label:"DEŞARJ" },
    half_phase:{ effect:"core_half_phase", label:"YARIM FAZ" },
  });

  function snapshotOpponentId(snapshot, playerId) {
    return Object.keys(snapshot?.players || {}).find(
      (candidate) => candidate !== playerId
    ) || null;
  }

  function snapshotModuleDomId(snapshot, playerId, moduleId) {
    if (!playerId || !moduleId) return null;
    return serverModuleDomId(
      playerId,
      findSnapshotModule(snapshot, playerId, moduleId)
    );
  }

  // İmza olayını sahnede gösterir. Yalnız imzaya ait olaylar için true döner;
  // saldırı ve katkı olayları ayrıca kendi işleyicilerinden de geçer.
  function presentSignatureEvent(event, snapshot) {
    const type = event?.type;
    const data = event?.data || {};
    if (type === "attack_performed") {
      if (String(data.defense_type || "").startsWith("Faz Zırhı · Faz")) {
        emitSignatureBattleEffect(
          "phase_evade",
          snapshotModuleDomId(snapshot, data.target_player_id, data.target_module_id),
          { label:"FAZ" }
        );
      }
      return false;
    }
    if (type === "module_contribution") {
      const sourcePlayerId = data.source_player_id || data.player_id;
      const source = findSnapshotModule(snapshot, sourcePlayerId, data.source_module_id);
      if (source?.definition_id === "omega_amplifier") {
        const omegaId = serverModuleDomId(sourcePlayerId, source);
        const attackId = snapshotModuleDomId(
          snapshot,
          data.target_player_id || data.player_id,
          data.target_module_id
        );
        emitSignatureBattleEffect("omega_link", attackId, {
          links:[[omegaId, attackId]],
          throttleKey:omegaId,
        });
      }
      return false;
    }
    if (!SIGNATURE_EVENT_TYPES.has(type)) {
      return false;
    }

    const ownerId = data.player_id;
    const rivalId = snapshotOpponentId(snapshot, ownerId);
    const own = (moduleId) => snapshotModuleDomId(snapshot, ownerId, moduleId);
    const rival = (moduleId) => snapshotModuleDomId(snapshot, rivalId, moduleId);
    if (type === "quantum_repeat") {
      const sourceId = own(data.module_id);
      const targetId = rival(data.target_module_id);
      emitSignatureBattleEffect("repeat_echo", targetId, {
        links:[[sourceId, targetId]],
        label:"YANKI",
      });
    } else if (type === "quantum_collapse") {
      emitSignatureBattleEffect("quantum_charge", own(data.module_id), {
        label:"ÇÖKÜŞ",
        arena:Number(data.charge_consumed || 0) >= 20 ? "heavy" : "light",
      });
    } else if (type === "swarm_released") {
      const sourceId = own(data.module_id);
      const targetIds = (data.target_module_ids || []).map(rival).filter(Boolean);
      emitSignatureBattleEffect("swarm_release", sourceId, {
        links:targetIds.map((targetId) => [sourceId, targetId]),
        label:"SÜRÜ",
      });
    } else if (type === "phoenix_rebirth") {
      // Dirilen modül yeniden düşerse patlaması tekrar oynatılabilsin.
      destructionFxPlayed.delete(`${ownerId}:${data.target_module_id}`);
      const sourceId = own(data.source_module_id);
      const revivedId = own(data.target_module_id);
      emitSignatureBattleEffect("phoenix_revive", revivedId, {
        links:[[sourceId, revivedId]],
        label:"DİRİLİŞ",
      });
    } else if (type === "prism_energy_converted") {
      emitSignatureBattleEffect("prism_shield", own(data.module_id), {
        label:"PRİZMA",
      });
    } else if (type === "sabotage_echo_applied") {
      const sourceId = snapshotModuleDomId(
        snapshot,
        data.attacker_player_id,
        data.attacker_module_id
      );
      const targetId = snapshotModuleDomId(
        snapshot,
        data.target_player_id,
        data.target_module_id
      );
      const singularity = data.definition_id === "singularity_projector";
      emitSignatureBattleEffect(
        singularity ? "singularity_field" : "disruptor_echo",
        targetId,
        {
          links:[[sourceId, targetId]],
          label:singularity ? "TEKİLLİK" : "YANKI",
        }
      );
    } else if (type === "signature_secondary_hit") {
      const sourceId = own(data.module_id);
      const targetId = snapshotModuleDomId(
        snapshot,
        data.target_player_id,
        data.target_module_id
      );
      emitSignatureBattleEffect("secondary_hit", targetId, {
        links:[[sourceId, targetId]],
      });
    } else if (type === "nano_repair_pulse") {
      const sourceId = own(data.source_module_id);
      const targetIds = (data.target_module_ids || []).map(own).filter(Boolean);
      emitSignatureBattleEffect("nano_pulse", sourceId, {
        links:targetIds.map((targetId) => [sourceId, targetId]),
      });
    } else if (type === "chrono_window_started") {
      emitSignatureBattleEffect("chrono_window", own(data.source_module_id), {
        label:"KRONOS",
      });
    } else if (type === "chrono_debt_started") {
      emitSignatureBattleEffect("chrono_debt", own(data.source_module_id), {
        label:"BORÇ",
      });
    } else if (type === "core_signature_triggered") {
      const presentation = CORE_SIGNATURE_PRESENTATION[data.signature_id];
      const coreId = own(data.module_id)
        || (ownerId === participantPlayerId ? "core-1" : "enemy-core");
      if (presentation) {
        emitSignatureBattleEffect(presentation.effect, coreId, {
          label:presentation.label,
        });
        const ticker = ownerId === participantPlayerId
          ? presentation.ownTicker
          : presentation.rivalTicker;
        if (ticker) {
          setBattleLiveTicker(ticker, ownerId === participantPlayerId ? "heal" : "danger");
        }
      }
    } else if (type === "attack_windup_started") {
      const sourceId = own(data.module_id);
      const targetId = rival(data.target_module_id);
      const windupMs = Number(data.ready_at_ms) - Number(event.at_ms);
      emitSignatureBattleEffect("target_lock", targetId, {
        links:[[sourceId, targetId]],
        label:"KİLİT",
        lifetimeMs:Number.isFinite(windupMs) && windupMs > 0
          ? Math.min(1400, windupMs + 160)
          : null,
      });
    }
    return true;
  }

  function processLocalServerEvents(
    events,
    snapshot
  ) {
    for (const event of events || []) {
      const data=event.data || {};
      if (presentSignatureEvent(event, snapshot)) {
        continue;
      }
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
        battleOvertimeActive = true;
        syncCriticalCoreAudioState();
        continue;
      }
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
        setBattleLiveTicker(
          "Savaştan çekildin",
          "danger"
        );
        continue;
      }
      if (
        event?.type === "inactivity_warning"
        && data.player_id === participantPlayerId
      ) {
        const seconds = Math.max(1, Math.ceil(Number(data.remaining_ms || 0) / 1000));
        const warning = localizedUiText(
          `Hareketsizlik: ${seconds} sn içinde kart basmazsan savaştan çekilmiş sayılırsın`
        );
        setBattleLiveTicker(warning, "danger");
        logClientMessage(warning);
        continue;
      }
      if (event?.type === "player_inactive") {
        setBattleLiveTicker(
          data.player_id === participantPlayerId
            ? "Hareketsiz kaldın · savaştan çekilmiş sayıldın"
            : "Rakip hareketsiz kaldı",
          data.player_id === participantPlayerId ? "danger" : "heal"
        );
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
          // Çekirdeğe gelen ağır vuruş arenayı sarsar; kendi çekirdeğin daha güçlü.
          const damagedModule = findSnapshotModule(snapshot, data.player_id, data.module_id);
          if (damagedModule?.definition_id === "core" && damage >= 18) {
            pulseArenaImpact(data.player_id === participantPlayerId ? "medium" : "light");
          }
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

  function rememberServerDestructions(events) {
    for (const event of events || []) {
      if (event?.type !== "module_destroyed") continue;
      const data = event.data || {};
      if (!data.player_id || !data.module_id) continue;
      serverDestroyedModuleAt.set(`${data.player_id}:${data.module_id}`, Number(event.at_ms ?? 0));
    }
  }

  // Görüntü yok etme anında ya da öncesinde alınmışsa modül ölü sayılır;
  // sonraki görüntüler (ör. aynı kart yeniden basıldıysa) yine belirleyicidir.
  function destroyedAfterSnapshot(playerId, instanceId, snapshot) {
    const destroyedAt = serverDestroyedModuleAt.get(`${playerId}:${instanceId}`);
    return destroyedAt !== undefined && Number(snapshot?.elapsed_ms ?? 0) <= destroyedAt;
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
    mockEnemyCoreHp=Number(
      enemyCore?.hp || 0
    );
    mockEnemyCoreMaxHp=Number(enemyCore?.max_hp || 300);
    mockEnemyCoreBadges=normalizeSignatureBadges(enemyCore?.signature_badges);
    mockEnemyModules=(
      enemy.modules || []
    )
      .filter(
        (module) =>
          module.definition_id !== "core"
          && module.status
            === "active"
          && module.x !== null
          && module.y !== null
          && !destroyedAfterSnapshot(enemy.player_id, module.instance_id, snapshot)
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
          heatPenalty:Number(module.heat_penalty || 0),
          energyWaiting:Boolean(module.energy_waiting),
          overheated:Boolean(module.overheated),
          debuffs:Array.isArray(module.debuffs) ? module.debuffs : [],
          signatureBadges:normalizeSignatureBadges(module.signature_badges),
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

    const events=
      message.type === "events"
      || message.type
        === "reconnect_state"
        ? payload.events || []
        : [];
    rememberServerDestructions(events);

    const ownPlayer = snapshot.players[participantPlayerId];
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
        const destroyed = destroyedAfterSnapshot(participantPlayerId, serverModule.instance_id, snapshot);
        client.applyServerModuleState({
          instanceId:clientModuleId,
          hp:destroyed ? 0 : Number(serverModule.hp || 0),
          status:destroyed ? "destroyed" : serverModule.status,
          position:
            destroyed || serverModule.x === null || serverModule.y === null
              ? null
              : {x:Number(serverModule.x), y:Number(serverModule.y)},
          isPowered:Boolean(serverModule.is_powered),
          powerReason:serverModule.power_reason,
          energyReceived:Number(serverModule.energy_received || 0),
          energyRequired:Number(serverModule.energy_required || 0),
          heat:Number(serverModule.heat || 0),
          heatPenalty:Number(serverModule.heat_penalty || 0),
          energyWaiting:Boolean(serverModule.energy_waiting),
          overheated:Boolean(serverModule.overheated),
          debuffs:Array.isArray(serverModule.debuffs) ? serverModule.debuffs : [],
          signatureBadges:normalizeSignatureBadges(serverModule.signature_badges),
        });
      }
      client.clearPendingPlacements();
    }

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
    if (document.body.dataset.battleAuthority !== "server") {
      document.body.dataset.battleAuthority="server";
    }
    renderEnemyBoard();
    // Durum bu mesajla değişti: HUD, raf ve kendi tahtan hemen yenilenir.
    renderBattleHud();

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
        heatPenalty:Number(serverModule.heat_penalty || 0),
        energyWaiting:Boolean(serverModule.energy_waiting),
        overheated:Boolean(serverModule.overheated),
        debuffs:Array.isArray(serverModule.debuffs)
          ? serverModule.debuffs
          : [],
        signatureBadges:normalizeSignatureBadges(serverModule.signature_badges),
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
        isDraw:
          Boolean(snapshot.is_draw),
        finishReason:
          snapshot.finish_reason || null,
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
        `${aiArchetypeName(activeLocalAiArchetype)} AI savaşı sunucu BattleEngine otoritesine bağlandı.`
      );
      return true;
    } catch (_error) {
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
    clearArenaPulse();
    signatureEffectsLive = 0;
    signatureEffectLastAt.clear();
    battleCueLastAt.clear();
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
        && instanceId !== "core-1"
      ) {
        client.modules.delete(instanceId);
      }
    }
    const initialSetupByInstanceId = new Map(
      buildInitialOnlineSetup().map((item) => [item.instanceId, item])
    );

    for (const module of client.modules.values()) {
      const isCore = module.instanceId === "core-1";
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
        signatureBadges:[],
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
      "connecting";

    localBattleStarted =
      true;
    document.body.dataset.localStatus =
      "battle";
    if (document.documentElement) document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    globalThis.scrollTo?.({ top: 0, left: 0, behavior: "instant" });

    battleStartedAt =
      performance.now();
    localBattleFinished =
      false;
    localBattleMetrics =
      createLocalBattleMetrics();
    lastBattleAnimationNow =
      null;
    // Rakip devresi sunucunun ilk anlık görüntüsüyle dolar.
    mockEnemyCoreHp =
      300;
    mockEnemyCoreBadges =
      [];
    mockEnemyModules =
      [];
    mockEnemyModuleHp =
      0;

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
    serverDestroyedModuleAt.clear();
    moduleAnchorRects.clear();
    moduleAnchorCells.clear();
    for (const effectId of [...floatingFeedbackLive.keys()]) {
      removeFloatingFeedbackRecord(effectId);
    }
    battleEffectAggregator?.clear?.();
    setBattleLiveTicker(
      `${aiArchetypeName(selectedAiArchetype)} AI · sunucuya bağlanıyor`,
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
        ai_archetype:selectedAiArchetype,
      });


    logClientMessage(
      "Tek Oyunculu Test Maçı başladı. Altı kartlık deste Akıma göre kullanıma hazır."
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

    // Geliştirme kısayolu artık ana ekrandan çağrılıyor; savaş görünümünü de aç.
    openAppScreen("play");

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
      "Savaş testi: gömülü devre yolları, kesintisiz ses ve anlık dil geçişi aktif."
    );

    return {
      ok:true,
    };
  }

  async function startLocalPlayableMatch() {
    setActivePlayMode(
      "local"
    );
    resetLocalBattleState();
    renderPlayModeUi();
    const connected =
      await connectLocalServerBattle();
    if (!connected) {
      // Savaş yalnız sunucu BattleEngine'inde çalışır; bağlantı yoksa maç açılmaz.
      prepareLocalMatch();
      showPlayError(
        "websocket",
        "AI savaşı başlatılamadı: sunucuya ulaşılamıyor."
      );
    }
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

  // Savaş müziği durumunu yerel AI ve çevrimiçi savaşta aynı kuralla
  // belirler: ilk 20 sn giriş, sonra savaş; Devre Gerilimi başlayınca ya da
  // çekirdeklerden biri zayıflayınca baskı; kendi çekirdeğin %33'ün altına
  // inince kritik çekirdek. Gerilim (0–1) katman karışımını sürekli besler.
  function syncCriticalCoreAudioState() {
    const battleActive =
      Boolean(gridshardAudioDirector)
      && (
        (activePlayMode === "local" && localBattleStarted && !localBattleFinished)
        || (activePlayMode === "online" && document.body.dataset.onlineStatus === "battle")
      );
    if (!battleActive) {
      const wasActive =
        criticalCoreAudioRequested
        || battleMusicPhase !== "intro"
        || battleOvertimeActive;
      criticalCoreAudioRequested = false;
      battleMusicPhase = "intro";
      battleMusicTension = 0;
      battleOvertimeActive = false;
      if (wasActive) requestOwnedAudioState("critical_core_inactive");
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
    const enemyRatio =
      Math.max(0, Number(mockEnemyCoreHp || 0))
      / Math.max(1, Number(mockEnemyCoreMaxHp || 300));
    const critical = ratio > 0 && ratio <= .33;
    const targetPhase =
      battleOvertimeActive || ratio <= .6 || enemyRatio <= .4
        ? "pressure"
        : Number(client.elapsedMs || 0) < BATTLE_MUSIC_INTRO_MS
          ? "intro"
          : "battle";
    const phase =
      BATTLE_MUSIC_PHASE_ORDER[targetPhase] > BATTLE_MUSIC_PHASE_ORDER[battleMusicPhase]
        ? targetPhase
        : battleMusicPhase;
    const tension = Math.round(
      Math.max(0, Math.min(1, 1 - Math.min(ratio, enemyRatio))) * 20
    ) / 20;

    if (critical !== criticalCoreAudioRequested || phase !== battleMusicPhase) {
      const reason = critical && !criticalCoreAudioRequested
        ? "critical_core_entered"
        : !critical && criticalCoreAudioRequested
          ? "critical_core_cleared"
          : `battle_music_${phase}`;
      criticalCoreAudioRequested = critical;
      battleMusicPhase = phase;
      requestOwnedAudioState(reason);
    }
    if (tension !== battleMusicTension) {
      battleMusicTension = tension;
      if (typeof gridshardAudioDirector.setBattlePressure === "function") {
        gridshardAudioDirector.setBattlePressure(tension);
      }
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

  function localBattleResultCopy(outcome, finishReason) {
    if (outcome === "draw") {
      return {
        summary: finishReason === "mutual_inactivity"
          ? "BERABERE · İki taraf da hareketsiz kaldı"
          : "BERABERE · İki Çekirdek aynı anda yok edildi",
        state: "Maç tamamlandı · Beraberlik",
        ticker: "Savaş tamamlandı · Beraberlik",
      };
    }
    const won = outcome === "victory";
    const reasons = {
      player_forfeit: won
        ? ["KAZANDIN · Rakip savaştan çekildi", "Maç tamamlandı · Galibiyet"]
        : ["KAYBETTİN · Savaşı bıraktın", "Maç tamamlandı · Savaşı bıraktın"],
      player_inactive: won
        ? ["KAZANDIN · Rakip hareketsiz kaldı", "Maç tamamlandı · Galibiyet"]
        : ["KAYBETTİN · Hareketsiz kaldın", "Maç tamamlandı · Hareketsizlik"],
    };
    const [summary, state] = reasons[finishReason] || (
      won
        ? ["KAZANDIN · Rakip Çekirdek yok edildi", "Maç tamamlandı · Galibiyet"]
        : ["KAYBETTİN · Çekirdeğin yok edildi", "Maç tamamlandı · Mağlubiyet"]
    );
    return {
      summary,
      state,
      ticker: won ? "Savaş tamamlandı · Galibiyet" : "Savaş tamamlandı · Mağlubiyet",
    };
  }

  function finishLocalBattle({
    won,
    isDraw=false,
    finishReason=null,
  }) {
    if (localBattleFinished) {
      return;
    }

    localBattleFinished =
      true;
    const outcome = isDraw ? "draw" : (won ? "victory" : "defeat");
    const resultCopy = localBattleResultCopy(outcome, finishReason);
    localBattleOutcome = outcome;
    setBattleLiveTicker(
      resultCopy.ticker,
      outcome === "defeat" ? "danger" : "heal"
    );
    document.body.dataset.localFinished =
      "true";
    stopLocalServerPolling();

    criticalCoreAudioRequested = false;
    setTerminalAudioState(
      outcome,
      "local_match_finished"
    );

    setBattleResultHero(
      outcome
    );

    const waitForCoreExplosion = [
      "core_destroyed",
      "simultaneous_core_destroyed",
    ].includes(finishReason || "core_destroyed");
    if (waitForCoreExplosion) {
      const explodedCores = outcome === "draw"
        ? ["enemy-core", "core-1"]
        : [won ? "enemy-core" : "core-1"];
      for (const coreId of explodedCores) {
        emitModuleExplosion(coreId, { core: true });
      }
    }
    schedulePostMatchReveal(
      `local:${battleStartedAt || "finished"}`,
      { waitForCoreExplosion }
    );

    if (battleResultSummaryEl) {
      battleResultSummaryEl.hidden =
        false;
      battleResultSummaryEl.textContent = localizedUiText(
        resultCopy.summary
      );
    }

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent = localizedUiText(
        resultCopy.state
      );
    }

    if (localBattleMetrics) {
      localBattleMetrics.duration_ms =
        Math.max(0,Math.round(client.elapsedMs));
      localBattleMetrics.won = Boolean(won);
      localBattleMetrics.forfeited =
        finishReason === "player_forfeit";

      telemetryDispatcher
        .trackLocalBattleCompleted({
          ...localBattleMetrics,
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
    renderPlayModeUi();
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
      if (!localServerSessionId) {
        battleForfeitButton.disabled = false;
        return;
      }
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

    playBattleFxClass(element, className, 720, feedbackClasses);
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
    impact.appendChild(flash);
    // Kalabalık savaşta yalnız parlama kalır. Yüksek kademede on ayrı kıvılcım,
    // Orta kademede aynı görüntüyü veren tek öğelik patlama çizilir.
    if (battleEffectLoad(layer) === 0) {
      const ring=
        document.createElement("span");
      ring.className="duel-impact-ring";
      impact.appendChild(ring);
      const quality=battleGraphicsQuality();
      if (quality === "yuksek") {
        for (let index=0;index<10;index+=1) {
          const spark=
            document.createElement("i");
          spark.style.setProperty(
            "--impact-angle",
            `${index*36+(index%2)*9}deg`
          );
          impact.appendChild(spark);
        }
      } else if (quality === "orta") {
        const burst=
          document.createElement("span");
        burst.className="duel-impact-burst";
        impact.appendChild(burst);
      }
    }
    layer.appendChild(impact);
    pulseBattleFx(
      targetModuleId,
      kind === "shield"
        ? "shield"
        : "hit"
    );
    scheduleBattleSweep(940, () => impact.remove());
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
      battleEffectLayerRect(layer);
    const sourceRect=
      resolveModuleAnchor(sourceModuleId)
      || source.getBoundingClientRect();
    const targetRect=
      resolveModuleAnchor(targetModuleId)
      || target.getBoundingClientRect();
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

    // Efekt bütçesi aşıldıysa atış çizgisi sadeleşir; iki katı aşıldıysa hiç
    // çizilmez (vuruş parlaması ve hasar yazısı yine gösterilir).
    const effectLoad=battleEffectLoad(layer);
    const beam=
      document.createElement("span");
    beam.className="duel-shot-beam";
    if (effectLoad === 0) {
      const muzzle=
        document.createElement("span");
      muzzle.className="duel-shot-muzzle";
      line.appendChild(muzzle);
    }
    line.appendChild(beam);
    const projectileCount=
      presentation.fx === "drone" && effectLoad === 0
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
    if (effectLoad < 2) layer.appendChild(line);

    playBattleFxClass(source, "fx-fire", presentation.travelMs);
    window.setTimeout(
      () => {
        if (visualGeneration !== battleVisualGeneration) {
          line.remove();
          return;
        }
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
    scheduleBattleSweep(presentation.travelMs + 520, () => line.remove());
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

    const layerRect = battleEffectLayerRect(layer);
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

    const particleCount = battleParticleBudget(core ? 30 : 16);
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
    pulseArenaImpact(core ? "core" : "medium");
    triggerGridshardCue(
      core
        ? "core_hit"
        : (moduleId.startsWith("enemy-") ? "kill_confirm" : "module_lost")
    );
    scheduleBattleSweep(core ? 2450 : 980, () => effect.remove());
    return true;
  }

  // Beta.72 — arena sarsıntısı. Güçlü bir sarsıntı sürerken daha zayıfı onu
  // kesmez; hareket azaltma tercihinde yalnız parlama kalır (CSS).
  const ARENA_PULSE_LEVELS = Object.freeze({
    light:{ className:"fx-arena-pulse-light", rank:1, durationMs:360, vibrate:null },
    medium:{ className:"fx-arena-pulse-medium", rank:2, durationMs:460, vibrate:18 },
    heavy:{ className:"fx-arena-pulse-heavy", rank:3, durationMs:540, vibrate:[26, 40, 18] },
    core:{ className:"fx-arena-pulse-core", rank:4, durationMs:780, vibrate:[45, 45, 70] },
  });
  const ARENA_PULSE_CLASSES = Object.values(ARENA_PULSE_LEVELS).map(
    (level) => level.className
  );
  const BATTLE_VIBRATION_MIN_GAP_MS = 260;
  let arenaPulseLevel = null;
  let arenaPulseTimer = 0;
  let lastBattleVibrationAt = -Infinity;

  function clearArenaPulse() {
    window.clearTimeout(arenaPulseTimer);
    arenaPulseLevel = null;
    document.getElementById("duel-arena")?.classList.remove(...ARENA_PULSE_CLASSES);
  }

  function vibrateBattle(pattern) {
    if (!pattern || settingsState.settings?.vibration_enabled === false) {
      return false;
    }
    const now = performance.now();
    if (now - lastBattleVibrationAt < BATTLE_VIBRATION_MIN_GAP_MS) {
      return false;
    }
    lastBattleVibrationAt = now;
    try {
      return Boolean(navigator.vibrate?.(pattern));
    } catch (_error) {
      return false;
    }
  }

  function pulseArenaImpact(level="light") {
    const config = ARENA_PULSE_LEVELS[level];
    const arena = document.getElementById("duel-arena");
    if (!config || !arena) {
      return false;
    }
    if (
      arenaPulseLevel
      && ARENA_PULSE_LEVELS[arenaPulseLevel].rank > config.rank
    ) {
      return false;
    }
    // Eşzamanlı düzen zorlamadan yeniden başlatma (bkz. playBattleFxClass).
    const restarting = ARENA_PULSE_CLASSES.some((name) => arena.classList.contains(name));
    arena.classList.remove(...ARENA_PULSE_CLASSES);
    if (restarting && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (arenaPulseLevel === level) arena.classList.add(config.className);
      }));
    } else {
      arena.classList.add(config.className);
    }
    arenaPulseLevel = level;
    window.clearTimeout(arenaPulseTimer);
    arenaPulseTimer = window.setTimeout(() => {
      arena.classList.remove(config.className);
      arenaPulseLevel = null;
    }, config.durationMs);
    vibrateBattle(config.vibrate);
    return true;
  }

  // Sık tekrarlanan imza seslerinin üst üste binmesini önler.
  const battleCueLastAt = new Map();

  function triggerBattleCue(
    cueName,
    { minIntervalMs=160 }={}
  ) {
    if (!cueName) return false;
    const now = performance.now();
    if (now - (battleCueLastAt.get(cueName) ?? -Infinity) < minIntervalMs) {
      return false;
    }
    battleCueLastAt.set(cueName, now);
    return triggerGridshardCue(cueName).ok === true;
  }

  // Beta.72 — imza efektleri. Her tür motorun gerçek bir olayına bağlıdır.
  // Aynı anda çok efekt birikirse önceliği düşük olanlar atlanır; Grafik
  // ayarı Düşük/Orta iken parçacık ve efekt bütçesi küçülür.
  const SIGNATURE_EFFECTS = Object.freeze({
    kill_confirm:{ priority:4, lifetimeMs:980, particles:8, cue:null },
    quantum_charge:{ priority:3, lifetimeMs:1180, particles:10, cue:"quantum_charge", arena:"heavy" },
    phoenix_revive:{ priority:3, lifetimeMs:1280, particles:12, cue:"phoenix_revive", arena:"medium" },
    singularity_field:{ priority:3, lifetimeMs:1200, particles:10, cue:"singularity_field", arena:"medium" },
    swarm_release:{ priority:3, lifetimeMs:1040, particles:8, cue:"swarm_release", arena:"light" },
    prism_shield:{ priority:3, lifetimeMs:900, particles:6, cue:"prism_shield", minRepeatMs:700 },
    omega_link:{ priority:2, lifetimeMs:820, particles:0, cue:"omega_link", minRepeatMs:1400, cueIntervalMs:1400 },
    nano_pulse:{ priority:2, lifetimeMs:900, particles:6, cue:"nano_pulse" },
    chrono_window:{ priority:2, lifetimeMs:1000, particles:6, cue:"chrono_shift" },
    phase_evade:{ priority:2, lifetimeMs:820, particles:6, cue:"phase_evade", minRepeatMs:400 },
    target_lock:{ priority:2, lifetimeMs:900, particles:0, cue:"target_lock", cueIntervalMs:500 },
    disruptor_echo:{ priority:2, lifetimeMs:900, particles:6, cue:"sabotage_echo" },
    repeat_echo:{ priority:1, lifetimeMs:860, particles:6, cue:"repeat_echo", arena:"light" },
    chrono_debt:{ priority:1, lifetimeMs:900, particles:0, cue:null },
    secondary_hit:{ priority:1, lifetimeMs:760, particles:0, cue:null },
    // Çekirdek imzaları. Güç kullanımının zaten sesi olduğu için yalnız güç
    // dışında tetiklenen Doğuş ve Zincir kendi sesini çalar.
    core_rebirth:{ priority:4, lifetimeMs:1400, particles:14, cue:"core_rebirth", arena:"heavy" },
    core_last_stand:{ priority:3, lifetimeMs:1100, particles:8, cue:null },
    core_chain:{ priority:3, lifetimeMs:900, particles:6, cue:"overdrive_chain", arena:"light" },
    core_static:{ priority:3, lifetimeMs:1100, particles:10, cue:null },
    core_discharge:{ priority:3, lifetimeMs:1000, particles:8, cue:null },
    core_half_phase:{ priority:3, lifetimeMs:1000, particles:6, cue:null },
  });
  const signatureEffectLastAt = new Map();
  let signatureEffectsLive = 0;

  // Efekt yükü. Savaş kalabalıklaştıkça aynı anda yaşayan efekt öğeleri artar
  // ve her biri her ana karede stil hesabına girer; düşük donanımda kareleri
  // asıl düşüren budur. Katmandaki canlı efekt kökü sayısı kademe bütçesini
  // aşınca süs parçaları (namlu parlaması, halka, kıvılcım), iki katını aşınca
  // atış çizgisi atlanır. Hasar yazısı ve kart vurgusu her zaman kalır.
  const BATTLE_EFFECT_ROOT_BUDGET = Object.freeze({ dusuk:8, orta:14, yuksek:32 });
  function battleEffectLoad(layer) {
    const budget = BATTLE_EFFECT_ROOT_BUDGET[battleGraphicsQuality()] || 32;
    const live = Number(layer?.childElementCount || 0);
    if (live >= budget * 2) return 2;
    return live >= budget ? 1 : 0;
  }

  // Patlama parçacığı bütçesi; her parçacık ayrı bir animasyonlu öğedir.
  function battleParticleBudget(baseCount) {
    const quality = battleGraphicsQuality();
    if (quality === "dusuk") return Math.min(4, Math.ceil(baseCount / 4));
    return quality === "orta" ? Math.ceil(baseCount / 2) : baseCount;
  }

  function signatureEffectMinimumPriority() {
    const quality = battleGraphicsQuality();
    if (quality === "dusuk") {
      return signatureEffectsLive >= 3 ? 4 : 3;
    }
    const steps = quality === "orta"
      ? [[6, 4], [4, 3], [2, 2]]
      : [[9, 4], [6, 3], [4, 2]];
    for (const [liveCount, priority] of steps) {
      if (signatureEffectsLive >= liveCount) return priority;
    }
    return 1;
  }

  function signatureParticleCount(baseCount) {
    const quality = battleGraphicsQuality();
    if (quality === "dusuk") return 0;
    return quality === "orta" ? Math.ceil(baseCount / 2) : baseCount;
  }

  function isCoreDomId(moduleId) {
    return moduleId === "enemy-core" || moduleId === "core-1";
  }

  function signatureAnchorPoint(layerRect, moduleId) {
    if (!moduleId) return null;
    const rect = resolveModuleAnchor(moduleId, { core:isCoreDomId(moduleId) });
    if (!rect) return null;
    return {
      x:rect.left + rect.width / 2 - layerRect.left,
      y:rect.top + rect.height / 2 - layerRect.top,
      size:Math.max(28, Math.min(rect.width, rect.height)),
    };
  }

  function buildSignatureEffectNodes(
    kind,
    anchorId,
    { links, label, lifetimeMs, particleCount }
  ) {
    const layer = document.getElementById("battle-effect-layer");
    if (!layer || typeof layer.getBoundingClientRect !== "function") {
      return [];
    }
    const layerRect = battleEffectLayerRect(layer);
    const anchor = signatureAnchorPoint(layerRect, anchorId);
    if (!anchor) return [];
    const nodes = [];
    for (const [fromId, toId] of links) {
      const from = signatureAnchorPoint(layerRect, fromId);
      const to = signatureAnchorPoint(layerRect, toId);
      if (!from || !to) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) continue;
      const link = document.createElement("span");
      link.className = "signature-link-effect";
      link.dataset.signature = kind;
      link.style.left = `${from.x}px`;
      link.style.top = `${from.y}px`;
      link.style.width = `${distance}px`;
      link.style.setProperty("--fx-angle", `${Math.atan2(dy, dx)}rad`);
      link.style.setProperty("--fx-distance", `${distance}px`);
      link.style.setProperty("--signature-life", `${lifetimeMs}ms`);
      const beam = document.createElement("span");
      beam.className = "signature-link-beam";
      const pulse = document.createElement("span");
      pulse.className = "signature-link-pulse";
      link.append(beam, pulse);
      nodes.push(link);
    }

    const effect = document.createElement("span");
    effect.className = "module-signature-effect";
    effect.dataset.signature = kind;
    effect.style.left = `${anchor.x}px`;
    effect.style.top = `${anchor.y}px`;
    effect.style.setProperty("--signature-size", `${Math.round(anchor.size)}px`);
    effect.style.setProperty("--signature-life", `${lifetimeMs}ms`);
    const halo = document.createElement("span");
    halo.className = "signature-halo";
    const ring = document.createElement("span");
    ring.className = "signature-ring";
    effect.append(halo, ring);
    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty(
        "--signature-angle",
        `${(360 / particleCount) * index + (index % 2) * 11}deg`
      );
      effect.appendChild(particle);
    }
    if (label) {
      const tag = document.createElement("span");
      tag.className = "signature-label";
      tag.textContent = localizedUiText(label);
      effect.appendChild(tag);
    }
    nodes.push(effect);
    layer.append(...nodes);
    return nodes;
  }

  function emitSignatureBattleEffect(
    kind,
    anchorId,
    {
      links=[],
      label=null,
      arena,
      lifetimeMs=null,
      throttleKey=null,
    }={}
  ) {
    const config = SIGNATURE_EFFECTS[kind];
    if (!config || !anchorId) {
      return false;
    }
    const now = performance.now();
    const repeatKey = `${kind}:${throttleKey || anchorId}`;
    if (
      config.minRepeatMs
      && now - (signatureEffectLastAt.get(repeatKey) ?? -Infinity) < config.minRepeatMs
    ) {
      return false;
    }
    if (config.priority < signatureEffectMinimumPriority()) {
      return false;
    }
    signatureEffectLastAt.set(repeatKey, now);
    signatureEffectsLive += 1;
    const lifetime = Math.max(400, Math.round(lifetimeMs ?? config.lifetimeMs));
    const visualGeneration = battleVisualGeneration;
    const validLinks = links.filter(
      (pair) => Array.isArray(pair) && pair[0] && pair[1] && pair[0] !== pair[1]
    );
    // Olaylar yeni anlık görüntü çizilmeden işlenir; konumu çizimden sonra ölç.
    // Sekme arka plandayken bekleyen kareler dönüşte topluca çizilmez.
    window.requestAnimationFrame(() => {
      const fresh = performance.now() - now < 600;
      const nodes = fresh && visualGeneration === battleVisualGeneration
        ? buildSignatureEffectNodes(kind, anchorId, {
            links:validLinks,
            label,
            lifetimeMs:lifetime,
            particleCount:signatureParticleCount(config.particles),
          })
        : [];
      scheduleBattleSweep(lifetime, () => {
        for (const node of nodes) node.remove();
        signatureEffectsLive = Math.max(0, signatureEffectsLive - 1);
      });
    });
    if (config.cue) {
      triggerBattleCue(config.cue, { minIntervalMs:config.cueIntervalMs ?? 160 });
    }
    const arenaLevel = arena === undefined ? config.arena : arena;
    if (arenaLevel) {
      pulseArenaImpact(arenaLevel);
    }
    return true;
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
    bar.title = `CAN ${Math.max(0, Math.round(Number(hp || 0)))}/${Math.max(1, Math.round(Number(maxHp || 1)))}`;

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
      const payload=await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/battle-pool-presets`
      );
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
        presetStatusEl.textContent=
          `Deste sunucuya kaydedilemedi: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`;
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
        `${name} yüklendi; istersen modülleri değiştirebilirsin.`;
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

  function uiLocale() {
    return document.documentElement?.lang === "en" ? "en-US" : "tr-TR";
  }

  function localizedUiText(value) {
    return globalThis.GridshardI18n
      ?.translateText(
        String(value ?? ""),
        document.documentElement.lang
      ) || String(value ?? "");
  }

  function localizedMessage(key, params = {}) {
    return globalThis.GridshardI18n?.t(key, params, document.documentElement.lang) || key;
  }

  function localizedNumber(value, options = {}) {
    return globalThis.GridshardI18n?.formatNumber(value, options, document.documentElement.lang)
      || String(value);
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
    return (
      `${module.strategicRole}. `
      + `Canı ${module.maxHp}, savaş içi yerleştirme maliyeti `
      + `${module.currentCost} Akım'dır.`
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
      `${catalog?.current_cost ?? module.currentCost} Akım`;
    renderBattlePoolModulePreview(
      module,
      catalog
    );

    setTextOrDash(
      poolDetailEnergyGenerationEl,
      catalog
        ? `${catalog.energy_generation || 0}/sn`
        : localizedUiText("Sunucu kataloğu bekleniyor")
    );
    setTextOrDash(
      poolDetailEnergyConsumptionEl,
      catalog
        ? `${catalog.energy_consumption || 0}/sn`
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

  function moduleRarityLabel(rarity) {
    return ({
      common: "Yaygın",
      rare: "Nadir",
      epic: "Epik",
      legendary: "Efsanevi",
    })[String(rarity || "").toLowerCase()] || "Yaygın";
  }

  function localizedRewardDescription(value) {
    return localizedUiText(String(value || "")
      .replace(/\blegendary\b/gi, "Efsanevi")
      .replace(/\bcommon\b/gi, "Yaygın")
      .replace(/\brare\b/gi, "Nadir")
      .replace(/\bepic\b/gi, "Epik"));
  }

  function localizedArenaRewardDescription(node) {
    if (!node) return "";
    if (document.documentElement.lang !== "en") {
      return localizedRewardDescription(node.description_tr || node.description_en);
    }
    if (node.description_en) return node.description_en;
    // Eski ödül düğümleri yalnız Türkçe açıklama taşır. Sayı ve hedef kart
    // adını korumak için İngilizce metni ödül yükünden kur.
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
    if (Number(rewards.core_shards) > 0) {
      const core = coreRewardIdentity(rewards);
      parts.push(localizedMessage("arena.reward_core_shards", {
        name:localizedUiText(core.nameTr), amount:localizedNumber(rewards.core_shards),
      }));
    }
    if (rewards.chest_id) {
      const chest = metaProgressionState?.chests?.definitions?.find((item) => item.id === rewards.chest_id);
      const fallback = ({field_3h:"Bronz Sandık", circuit_8h:"Gümüş Sandık", core_24h:"Altın Sandık", diamond_24h:"Elmas Sandık"})[rewards.chest_id];
      parts.push(chest?.name_en || localizedUiText(chest?.name_tr || fallback || "Sandık"));
    }
    return parts.length ? parts.join(" + ") : localizedRewardDescription(node.description_tr);
  }

  function renderInitialModulePicker() {
    const status = document.getElementById("initial-module-status");
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
        selectMark.textContent=
          selected
            ? "✓"
            : "+";
        selectMark.title=localizedUiText(
          selected
            ? "Savaş Havuzuna eklendi"
            : "Havuza ekle"
        );
        selectMark.dataset.action=
          selected
            ? "selected"
            : "add";
        selectMark.setAttribute(
          "aria-disabled",
          String(selected)
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
          `${module.nameTr} · ${poolCategoryLabel(module.category)}`
        );
        button.title =
          `${module.nameTr} · ${poolCategoryLabel(module.category)}`;

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
        const removeMark=
          document.createElement(
            "span"
          );
        removeMark.className=
          "pool-selected-remove";
        removeMark.textContent="−";
        removeMark.title=localizedUiText(
          "Havuzdan çıkar"
        );
        removeMark.dataset.action="remove";
        chip.append(
          chipIcon,
          chipName,
          chipCategory,
          removeMark
        );
        chip.setAttribute(
          "aria-label",
          `${module.nameTr} · ${poolCategoryLabel(module.category)}`
        );
        chip.title =
          `${module.nameTr} · ${poolCategoryLabel(module.category)}`;

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
      battlePoolSelection.selected.size === battlePoolSelection.requiredSize
      && !battlePoolSelection.hasAttackCard()
        ? `${battlePoolSelection.selected.size} / ${battlePoolSelection.requiredSize} · saldırı kartı gerekli`
        : `${battlePoolSelection.selected.size} / ${battlePoolSelection.requiredSize}`;

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
      `${module.nameTr} · Modül önizlemesi`
    );
    poolDetailPreviewEl.appendChild(card);
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
    const shelf = card.closest(".module-shelf, .duel-arena, .battle-pool-selected-list, .battle-pool-module-grid");
    const cardRect = card.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const boundaryTop = shelf && typeof shelf.getBoundingClientRect === "function"
      ? shelf.getBoundingClientRect().top + 8
      : 8;
    if (cardRect.top - tooltipRect.height < boundaryTop) {
      tooltip.classList.add("tooltip-below");
    }
  }

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

  // Akım çizgileri ayrı katmandadır: animasyon yalnız bu ince katmanı yeniden
  // boyar, hücre ve kartların bulunduğu tahta katmanı boyanmış kalır.
  function ensureBoardCurrentLayer(boardElement, baseLayer) {
    let layer=boardElement.querySelector(":scope > .board-cable-current-layer");
    if (layer) return layer;
    layer=document.createElementNS("http://www.w3.org/2000/svg","svg");
    layer.classList.add("board-cable-current-layer");
    layer.setAttribute("viewBox","0 0 500 300");
    layer.setAttribute("preserveAspectRatio","none");
    layer.setAttribute("aria-hidden","true");
    if (typeof baseLayer.after === "function") baseLayer.after(layer);
    else boardElement.prepend(layer);
    return layer;
  }

  function invalidateBattleLayout() {
    battleLayoutEpoch += 1;
    if (battleLayoutRefreshQueued) return;
    battleLayoutRefreshQueued = true;
    const refresh = () => {
      battleLayoutRefreshQueued = false;
      if (board) renderBoardCables(board, playerCircuitCableModules());
      if (enemyBoard) renderBoardCables(enemyBoard, enemyCircuitCableModules());
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(refresh);
    else refresh();
  }

  function observeBattleLayout(element) {
    if (!element || typeof ResizeObserver !== "function") return;
    if (!battleLayoutObserver) {
      battleLayoutObserver = new ResizeObserver(() => invalidateBattleLayout());
    }
    battleLayoutObserver.observe(element);
  }

  function measureBoardCableGeometry(boardElement) {
    // Yalnız okuma: tek düzen hesabı yeter.
    const geometry = {
      width:Math.max(1, boardElement.clientWidth),
      height:Math.max(1, boardElement.clientHeight),
      cells:new Map(),
    };
    for (const cell of boardElement.querySelectorAll(".board-cell")) {
      geometry.cells.set(`${cell.dataset.x},${cell.dataset.y}`, {
        left:cell.offsetLeft,
        top:cell.offsetTop,
        width:cell.offsetWidth,
        height:cell.offsetHeight,
      });
    }
    return geometry;
  }

  function createCircuitCableLine(layer, geometry, first, second, className) {
    const firstCell = geometry.cells.get(cablePositionKey(first));
    const secondCell = geometry.cells.get(cablePositionKey(second));
    if (!firstCell || !secondCell) return null;
    const firstCenter = {
      x:firstCell.left + (firstCell.width / 2),
      y:firstCell.top + (firstCell.height / 2),
    };
    const secondCenter = {
      x:secondCell.left + (secondCell.width / 2),
      y:secondCell.top + (secondCell.height / 2),
    };
    const horizontal = first.y === second.y;
    const forward = horizontal ? second.x > first.x : second.y > first.y;
    const start = horizontal
      ? { x:firstCell.left + (forward ? firstCell.width : 0), y:firstCenter.y }
      : { x:firstCenter.x, y:firstCell.top + (forward ? firstCell.height : 0) };
    const end = horizontal
      ? { x:secondCell.left + (forward ? 0 : secondCell.width), y:secondCenter.y }
      : { x:secondCenter.x, y:secondCell.top + (forward ? 0 : secondCell.height) };
    const line=document.createElementNS("http://www.w3.org/2000/svg","line");
    line.classList.add(...className.split(" ").filter(Boolean));
    line.setAttribute("x1",String(start.x));
    line.setAttribute("y1",String(start.y));
    line.setAttribute("x2",String(end.x));
    line.setAttribute("y2",String(end.y));
    layer.appendChild(line);
    return line;
  }

  function boardCableState(boardElement, layer) {
    const hasObserver = typeof ResizeObserver === "function";
    let state = boardCableStates.get(layer);
    if (
      state
      && state.epoch === battleLayoutEpoch
      && hasObserver
      && layer.childElementCount > 0
    ) {
      return state;
    }
    if (!state) observeBattleLayout(boardElement);
    const geometry = measureBoardCableGeometry(boardElement);
    const currentLayer = ensureBoardCurrentLayer(boardElement, layer);
    layer.replaceChildren();
    currentLayer.replaceChildren();
    layer.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
    currentLayer.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
    const cells = new Set(BOARD_CELLS.map(([x,y]) => `${x},${y}`));
    const edges = [];
    for (const [x,y] of BOARD_CELLS) {
      const first = {x,y};
      for (const {dx,dy} of CIRCUIT_CABLE_DIRECTIONS) {
        const second = {x:x+dx,y:y+dy};
        if (!cells.has(cablePositionKey(second))) continue;
        createCircuitCableLine(layer, geometry, first, second, "circuit-cable-base");
        edges.push({
          first,
          second,
          forwardKey:`${cablePositionKey(first)}>${cablePositionKey(second)}`,
          reverseKey:`${cablePositionKey(second)}>${cablePositionKey(first)}`,
          direction:"none",
          current:null,
          glow:null,
        });
      }
    }
    state = { epoch:battleLayoutEpoch, geometry, edges, currentLayer, fedSignature:null };
    boardCableStates.set(layer, state);
    return state;
  }

  function renderBoardCables(boardElement, moduleIterable=[]) {
    const layer = ensureBoardCableLayer(boardElement);
    if (!layer) return;
    const cableState = boardCableState(boardElement, layer);
    const modules = [...moduleIterable];
    const liveCore = modules.some(m => (m.definitionId === "core" || m.nameTr === "Çekirdek") && Number(m.hp) > 0);

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
      // Current spreads along every shortest route from the Core to each
      // powered module: the whole rectangle between them carries it. The top
      // and bottom rows therefore show left/right flow as well, and every
      // cable points away from the Core, so directions never conflict.
      const core = {x:2,y:1};
      for (const target of poweredPositions) {
        const stepX = Math.sign(target.x - core.x);
        const stepY = Math.sign(target.y - core.y);
        for (let x = Math.min(core.x, target.x); x <= Math.max(core.x, target.x); x += 1) {
          for (let y = Math.min(core.y, target.y); y <= Math.max(core.y, target.y); y += 1) {
            const from = {x,y};
            if (stepX && x !== target.x) {
              energizedEdges.add(`${cablePositionKey(from)}>${cablePositionKey({x:x + stepX,y})}`);
            }
            if (stepY && y !== target.y) {
              energizedEdges.add(`${cablePositionKey(from)}>${cablePositionKey({x,y:y + stepY})}`);
            }
          }
        }
      }
    }
    const fedSignature = liveCore ? [...fedCells].sort().join("|") : "";
    if (cableState.fedSignature !== fedSignature) {
      cableState.fedSignature = fedSignature;
      for (const cell of boardElement.querySelectorAll(".board-cell")) {
        const key = `${cell.dataset.x},${cell.dataset.y}`;
        const fed = liveCore && fedCells.has(key);
        cell.classList.toggle("energy-fed-cell", fed);
        cell.dataset.energyFed = String(fed);
      }
    }

    // Kablo tabanı sabittir; yalnız akım yönü değişen kenarın çizgisi yenilenir.
    for (const edge of cableState.edges) {
      const direction = energizedEdges.has(edge.forwardKey)
        ? "forward"
        : energizedEdges.has(edge.reverseKey)
          ? "reverse"
          : "none";
      if (direction === edge.direction) continue;
      edge.direction = direction;
      edge.current?.remove();
      edge.glow?.remove();
      edge.current = null;
      edge.glow = null;
      if (direction === "none") continue;
      const from = direction === "forward" ? edge.first : edge.second;
      const to = direction === "forward" ? edge.second : edge.first;
      // Parıltı, çizgi başına SVG filtresi yerine geniş ve soluk bir alt çizgidir.
      edge.glow = createCircuitCableLine(
        cableState.currentLayer, cableState.geometry, from, to, "circuit-cable-glow"
      );
      edge.current = createCircuitCableLine(
        cableState.currentLayer, cableState.geometry, from, to, "circuit-cable-current"
      );
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

      if (x === CORE_POSITION.x && y === CORE_POSITION.y) {
        cell.classList.add("core-cell");
        cell.dataset.cellLabel =
          localizedUiText("Çekirdek");
        cell.title =
          "Çekirdek: sabit ana hedef";
      } else {
        cell.dataset.cellLabel =
          localizedUiText(`Hücre ${x},${y}`);
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
      if (x===CORE_POSITION.x && y===CORE_POSITION.y) {
        cell.classList.add("core-cell");
        cell.dataset.cellLabel=localizedUiText("Rakip Çekirdek");
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
      // Türkçe yazılır; İngilizce görünümü i18n katmanı üretir.
      const reasons={
        emp_disabled:"EMP etkisi bu modülün enerji sistemini devre dışı bıraktı.",
        line_disrupted:"Kesici etkisi bu modülün enerji hattını geçici olarak kopardı.",
        insufficient_supply:`Çekirdek enerji ihtiyacı: ${required.toFixed(1)} Ü, gelen: ${received.toFixed(1)} Ü.`,
        waiting_energy:"Enerji rezervi bu modülün sıradaki eylemine yetmiyor; enerji birikince ateşler.",
      };
      const message=reasons[powerReason]
        || "Bu modül devre dışı. Sabotaj etkilerini ve Çekirdek enerji baskısını kontrol edin.";
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

  // Isı barı kartın üst kenarında durur: CAN barından ince, iki yandan içeride
  // ve termometre gibi sarıdan kırmızıya ilerler. Isı yüzdedir: %40 (üstünde
  // her %5 modülü %5 yavaşlatır) ve %70 (yüksek ısı; susmuş modül bunun altında
  // yeniden çalışır) çentikle işaretlidir; bar %100'de dolar ve modül susar.
  // Isısı olmayan kartta çizilmez.
  const MODULE_MAX_HEAT = 100;
  const MODULE_HEAT_SLOWDOWN_START = 40;
  const MODULE_HEAT_SLOWDOWN_STEP = 5;
  const MODULE_HEAT_HIGH = 70;
  // Isı eylem modüllerinin aralığını uzatır, sürekli sistemlerin etkisini düşürür.
  const HEAT_ACTION_DEFINITION_IDS = new Set(["repair", "nano_medic", "phoenix_repair"]);

  function moduleHeatPenaltyPercent(moduleLike) {
    const reported = Number(moduleLike?.heatPenalty);
    if (Number.isFinite(reported) && reported > 0) return Math.round(reported);
    const heat = Math.min(MODULE_MAX_HEAT, Math.max(0, Number(moduleLike?.heat || 0)));
    if (heat < MODULE_HEAT_SLOWDOWN_START + MODULE_HEAT_SLOWDOWN_STEP) return 0;
    return Math.floor((heat - MODULE_HEAT_SLOWDOWN_START) / MODULE_HEAT_SLOWDOWN_STEP) * 5;
  }

  function moduleHeatEffectLabel(moduleLike) {
    const penalty = moduleHeatPenaltyPercent(moduleLike);
    if (penalty <= 0) return "";
    const category = String(moduleLike?.category || moduleLike?.kind || "");
    if (category === "saldırı") return `Atış aralığı +%${penalty}`;
    if (category === "sabotaj" || HEAT_ACTION_DEFINITION_IDS.has(String(moduleLike?.definitionId || ""))) {
      return `Eylem aralığı +%${penalty}`;
    }
    return `Etki -%${Math.round(100 - 100 / (1 + penalty / 100))}`;
  }

  function appendModuleHeatBar(card, moduleLike) {
    const heat = Math.min(MODULE_MAX_HEAT, Math.max(0, Number(moduleLike?.heat || 0)));
    const overheated = Boolean(moduleLike?.overheated);
    if (!card || (heat <= 0 && !overheated)) return;
    const percent = overheated ? 100 : Math.round(heat);
    const bar = document.createElement("span");
    bar.className = "module-heat-bar";
    bar.dataset.heatState = overheated
      ? "overheated"
      : heat >= MODULE_MAX_HEAT
        ? "critical"
        : heat >= MODULE_HEAT_HIGH
          ? "high"
          : heat >= MODULE_HEAT_SLOWDOWN_START + MODULE_HEAT_SLOWDOWN_STEP
            ? "slowed"
            : "warm";
    bar.style.setProperty("--heat-percent", `${percent}%`);
    bar.setAttribute("role", "img");
    const heatEffect = moduleHeatEffectLabel(moduleLike);
    bar.setAttribute("aria-label", overheated
      ? `Aşırı ısındı · Isı %${Math.round(heat)}`
      : heatEffect
        ? `Isı %${Math.round(heat)} · ${heatEffect}`
        : `Isı %${Math.round(heat)}`);
    const fill = document.createElement("i");
    fill.setAttribute("aria-hidden", "true");
    bar.appendChild(fill);
    card.classList.add("has-heat-bar");
    card.appendChild(bar);
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
    if (moduleLike.overheated) {
      addBadge(
        "♨",
        "heat-critical overheated",
        `Aşırı ısındı · Isı %${Math.round(heat)} · %70'in altına inince yeniden çalışır`
      );
    } else if (heat >= MODULE_HEAT_HIGH) {
      const heatEffect = moduleHeatEffectLabel(moduleLike);
      addBadge(
        "♨",
        heat >= MODULE_MAX_HEAT ? "heat-critical" : "heat-high",
        heatEffect ? `Isı %${Math.round(heat)} · ${heatEffect}` : `Isı %${Math.round(heat)}`
      );
    }

    if (moduleLike.energyWaiting) {
      addBadge(
        "ϟ",
        "energy-waiting",
        "Enerji bekliyor · enerji sırası gelince çalışır"
      );
    }

    // Aşırı ısınma kendi rozetiyle gösterilir; genel etki sayacına katılmaz.
    const debuffs = Array.isArray(moduleLike.debuffs)
      ? moduleLike.debuffs.filter((effectId) => effectId !== "overheated")
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
    appendSignatureBadges(card, moduleLike.signatureBadges);
  }

  // Beta.72 — kart üstü imza rozetleri. Başlıklar sabit metindir (çeviri
  // sözlüğünden geçer); sayı yalnız rozetin kendi yazısındadır.
  const SIGNATURE_BADGE_KINDS = Object.freeze({
    repeat:{
      label:(badge) => `↻${badge.value}/${badge.max}`,
      title:"Kuantum Tekrar · aynı hedefe 4. vuruşta yankı",
    },
    swarm:{
      label:(badge) => `✥${badge.value}/${badge.max}`,
      title:"Sürü deposu · 4 dronda toplu salınım",
    },
    quantum:{
      label:(badge) => `◎${badge.value}%`,
      title:"Kuantum yükü · sonraki atışta boşalır",
    },
    lock:{
      label:() => "⌖",
      title:"Hedefe kilitleniyor",
    },
    chrono:{
      label:(badge) => (badge.phase === "debt" ? "⧗−" : "⧗+"),
      title:(badge) => (
        badge.phase === "debt"
          ? "Kronos borcu · saldırılar yavaşladı"
          : "Kronos penceresi · saldırılar hızlandı"
      ),
    },
    phase:{
      label:() => "FAZ",
      title:"Faz penceresi · saldırılar boşa çıkar",
    },
    resonance:{
      label:(badge) => `Ω${badge.value}`,
      title:"Omega rezonansı · devredeki farklı kategori sayısı",
    },
    focus:{
      label:(badge) => `⊕${badge.value}`,
      title:"Hassas odak · aynı hedefe art arda vuruş",
    },
    reborn:{
      label:() => "✦",
      title:"Anka ile dirildi · yeniden diriltilemez",
    },
    ember:{
      label:() => "✹",
      title:"Küllerden Doğuş hazır · Çekirdek bir kez yok olmaz",
    },
    static:{
      label:(badge) => `⚡${badge.value}/${badge.max}`,
      title:"Statik Birikim · Kesinti gücü uzuyor",
    },
    last_stand:{
      label:() => "◆",
      title:"Son Hat · Muhafız kalkanı güçlü",
    },
    chain:{
      label:(badge) => `⛓${badge.value}`,
      title:"Zincir · Aşırı Yük uzadı",
    },
  });
  const SIGNATURE_BADGE_LIMIT = 2;

  function normalizeSignatureBadges(badges) {
    if (!Array.isArray(badges)) return [];
    return badges
      .filter((badge) => SIGNATURE_BADGE_KINDS[badge?.kind])
      .slice(0, SIGNATURE_BADGE_LIMIT)
      .map((badge) => ({
        kind:badge.kind,
        value:Math.max(0, Math.round(Number(badge.value || 0))),
        max:Math.max(0, Math.round(Number(badge.max || 0))),
        phase:badge.phase === "debt" ? "debt" : (badge.phase ? "boost" : null),
      }));
  }

  function appendSignatureBadges(card, badges) {
    if (!card || !Array.isArray(badges) || badges.length === 0) return;
    const row = document.createElement("span");
    row.className = "module-signature-row";
    for (const badge of badges.slice(0, SIGNATURE_BADGE_LIMIT)) {
      const kind = SIGNATURE_BADGE_KINDS[badge.kind];
      if (!kind) continue;
      const element = document.createElement("span");
      element.className = "module-signature-badge";
      element.dataset.badge = badge.kind;
      if (badge.phase) element.dataset.phase = badge.phase;
      element.textContent = kind.label(badge);
      element.title = localizedUiText(
        typeof kind.title === "function" ? kind.title(badge) : kind.title
      );
      row.appendChild(element);
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
    fillBattleCardName(label, {nameTr:name});
    card.appendChild(label);
    appendHpBar(card,hp,maxHp,{ battle:true });
    const isSource=
      moduleId === "enemy-core";
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
    if (!isSource) appendModuleHeatBar(card, power);
    appendModuleFxOverlay(card);
    return card;
  }

  // Vuruş/destek geri bildirimi katmanı. Orta ve Düşük grafik kademesinde kart
  // yerine bu katmanın opaklığı canlandırılır (bkz. canon.css, grafik kademeleri).
  function appendModuleFxOverlay(card) {
    const overlay = document.createElement("span");
    overlay.className = "module-fx-overlay";
    overlay.setAttribute("aria-hidden", "true");
    card.appendChild(overlay);
  }

  // Kartın görünümünü belirleyen alanlar. Hücre imzası değişmedikçe kart
  // yeniden kurulmaz (bkz. GridshardBattleBoardView).
  function battleModuleRenderSignature(moduleLike) {
    return JSON.stringify([
      moduleLike.instanceId ?? moduleLike.id,
      moduleLike.nameTr ?? moduleLike.name,
      moduleLike.category ?? moduleLike.kind,
      moduleLike.status ?? "active",
      moduleLike.hp,
      moduleLike.maxHp,
      Math.round(Number(moduleLike.heat || 0)),
      moduleLike.heatPenalty || 0,
      Boolean(moduleLike.overheated),
      Boolean(moduleLike.energyWaiting),
      moduleLike.isPowered,
      Math.round(Number(moduleLike.energyReceived || 0) * 10),
      Math.round(Number(moduleLike.energyRequired || 0) * 10),
      moduleLike.powerReason || "",
      moduleLike.debuffs || [],
      moduleLike.signatureBadges || [],
    ]);
  }

  const enemyBoardCellSignatures = new WeakMap();

  function renderEnemyBoard({ force=false }={}) {
    if (!enemyBoard) return;
    if (!enemyBoard.children?.length) {
      createEnemyBoard();
    }
    const language = document.documentElement?.lang || "tr";
    const debrisByCell = new Map(
      (enemyCellDebris || []).map((debris) => [
        `${Number(debris.x)},${Number(debris.y)}`,
        debris,
      ])
    );
    const cardByCell = new Map();
    cardByCell.set("2,1", {
      id:"enemy-core",
      signature:JSON.stringify([mockEnemyCoreHp, mockEnemyCoreBadges]),
      build:() => enemyCard("enemy-core","Çekirdek",mockEnemyCoreHp,300,"core",{ signatureBadges:mockEnemyCoreBadges }),
    });
    for (const module of mockEnemyModules) {
      if (module.hp<=0) continue;
      cardByCell.set(`${Number(module.position.x)},${Number(module.position.y)}`, {
        id:module.id,
        signature:battleModuleRenderSignature(module),
        build:() => enemyCard(
          module.id,
          module.name,
          module.hp,
          module.maxHp,
          module.kind,
          module
        ),
      });
    }
    for (const cell of enemyBoard.querySelectorAll(".board-cell")) {
      const key=`${Number(cell.dataset.x)},${Number(cell.dataset.y)}`;
      const debris=debrisByCell.get(key) || null;
      const entry=cardByCell.get(key) || null;
      const seconds=debris
        ? Math.max(1, Math.ceil(Number(debris.remaining_ms || 0) / 1000))
        : 0;
      const signature=`${language}|${seconds}|${entry ? entry.signature : ""}`;
      if (!force && enemyBoardCellSignatures.get(cell) === signature) continue;
      enemyBoardCellSignatures.set(cell, signature);
      cell.innerHTML="";
      cell.dataset.occupied="false";
      cell.dataset.debris="false";
      cell.classList.remove("debris-cell");
      if (debris) appendCellDebris(enemyBoard, [debris]);
      if (entry) {
        cell.dataset.occupied="true";
        cell.appendChild(entry.build());
        moduleAnchorCells.set(String(entry.id), cell);
      }
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

  let renderedBattleIdentitySignature = null;

  function renderBattleIdentityPanels() {
    const playerName=
      profileState.viewModel()?.displayName
      || "Oyuncu";
    const opponentName=opponentBattleDisplayName();
    const canOpenProfile = isPublicProfileTarget(enemyBattlePlayerId)
      && matchmakingState.opponentType !== "ai";
    const deckIds=(enemyBattlePoolDefinitionIds.length
      ? enemyBattlePoolDefinitionIds
      : STARTER_BATTLE_POOL_PRESET.module_definition_ids
    ).slice(0,6);
    // Her sunucu mesajında çağrılır; kimlik ve deste değişmediyse DOM'a dokunma.
    const signature=JSON.stringify([
      playerName,
      opponentName,
      canOpenProfile,
      deckIds,
      moduleDefinitions.length,
      document.documentElement?.lang || "tr",
    ]);
    if (signature === renderedBattleIdentitySignature) return;
    renderedBattleIdentitySignature = signature;
    if (playerBattleNameEl) {
      playerBattleNameEl.textContent=playerName;
    }
    if (enemyBattleNameEl) {
      enemyBattleNameEl.textContent=opponentName;
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
    for (const definitionId of deckIds) {
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
        `Enkaz: ${seconds}`
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
          profile:"Profile",
          statistics:"Statistics",
          settings:"Settings",
          settingsSave:"Save Settings",
          playMode:"Match Mode",
          battlePool:"Build Battle Pool",
        }
      : {
          profile:"Profil",
          statistics:"İstatistikler",
          settings:"Ayarlar",
          settingsSave:"Ayarları Kaydet",
          playMode:"Maç Modu",
          battlePool:"Savaş Havuzu Oluştur",
        }
    );

    const direct = {
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
    renderProfileSummary();
    renderPostMatchSummary();
    // Tarih/sayı biçimi taşıyan ve sunucu verisinden kurulan paneller de
    // yeni dilde yeniden çizilir; biri başarısız olursa diğerleri sürer.
    for (const rerender of [
      renderMetaHubScreens,
      renderFriendsScreen,
      () => socialState && renderDirectMessageInbox(),
      renderEventsHub,
      () => dailyMetaState && renderDailyMetaDialog(),
      renderRewardInbox,
      () => leaderboardPayload && renderLeaderboard(),
      renderAccountPlatform,
      renderStatisticsSummary,
    ]) {
      try {
        rerender();
      } catch (error) {
        console.warn("Dil değişiminde panel yenilenemedi", error);
      }
    }
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
        graphicsModeIsAuto()
          ? "otomatik"
          : view.graphicsQuality;
    }
    if (language) {
      language.value =
        view.language;
    }
    if (analyticsConsent) analyticsConsent.checked = view.analyticsConsent === true;

    applyGraphicsQuality();
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
      "Kaydediliyor...",
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
          // "Otomatik" sunucuya gitmez; hesaptaki son seçim korunur.
          graphics_quality:
            GRAPHICS_TIERS.includes(graphics?.value)
              ? graphics.value
              : (settingsState.settings?.graphics_quality || "yuksek"),
          language:
            language?.value
            || "tr",
          analytics_consent: analyticsConsent?.checked === true,
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
      `Oyuncu Kimliği: ${shortId}`;
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
    const activeTitle = achievedStages.at(-1)?.title_tr
      || view.operatorTitle
      || "Devre Çırağı";
    el.textContent = localizedUiText(
      `${view.displayName} · ${activeTitle} · ${view.leagueNameTr} · ${view.rating} 🏆`
    );

    const setText = (id, value) => {
      const target = document.getElementById(id);
      if (target) target.textContent = String(value);
    };
    setText("profile-clan-title", view.teamName || "Takıma dahil değil");
    const profileTeamButton = document.getElementById("profile-clan-title");
    if (profileTeamButton) {
      profileTeamButton.dataset.teamId = view.teamId || "";
      profileTeamButton.disabled = !view.teamId;
    }
    setText(
      "profile-clan-copy",
      view.teamName
        ? `Takım kimliği: ${view.teamId || "—"}`
        : "Bir takıma katıldığında takım bilgilerin burada görünecek."
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
    setText("profile-current-season-name", engagement.season_name_tr || "Güncel Sezon");
    setText("profile-season-countdown", Number.isFinite(seasonEndsAt) && seasonEndsAt > 0 ? `${remainingDays} gün ${remainingHours} sa kaldı` : "Sezon süresi hazırlanıyor");
    renderTrophyValue("profile-season-trophies", Number(view.rating || 0));
    setText("profile-season-league", view.leagueNameTr || "Arena 1");
    renderTrophyValue("profile-last-season-trophies", previous ? Number(previous.final_rating || 0) : "—");
    renderTrophyValue("profile-best-season-trophies", best ? Number(best.final_rating || 0) : "—");

    const nameInput =
      document.getElementById(
        "profile-display-name"
      );
    if (nameInput) {
      nameInput.value =
        view.displayName;
      nameInput.disabled = profileState.profile?.display_name_changes_remaining !== 1;
    }
    const nameSave = document.getElementById("profile-display-name-save");
    if (nameSave) nameSave.disabled = profileState.profile?.display_name_changes_remaining !== 1;
    setText("profile-name-change-note", profileState.profile?.display_name_changes_remaining === 1
      ? localizedUiText("Oyuncu adını yalnız bir kez değiştirebilirsin.")
      : localizedUiText("Ad değiştirme hakkın kullanıldı. Oyuncu adın artık sabit."));
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
        `${activeTitle} · 🏆 ${view.rating}`
      );
      lobbyPlayerDetails.dataset.claimable = String(
        (view.operatorTitleProgression?.stages || []).some((stage) => stage.claimable)
      );
    }
    // Profil barı yalnız Ev ekranındadır; Profil ekranı kimliği kendi başlığında gösterir.
    const profileHeroName = document.getElementById("profile-hero-name");
    const profileHeroDetails = document.getElementById("profile-hero-details");
    if (profileHeroName) profileHeroName.textContent = view.displayName;
    if (profileHeroDetails) {
      profileHeroDetails.textContent = localizedUiText(
        `${activeTitle} · 🏆 ${view.rating}`
      );
      profileHeroDetails.dataset.claimable = lobbyPlayerDetails?.dataset.claimable || "false";
    }
    if (document.getElementById("operator-titles-dialog")?.open) renderOperatorTitles();

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
        emptyCopy:"Henüz sıralama kupası kazanılmadı.",
      },
      {
        hostId:"profile-badge-collection",
        ids:cosmetics.unlockedBadgeIds || [],
        definitions:PROFILE_BADGES,
        kind:"badge",
        emptyCopy:"Henüz sıralama rozeti kazanılmadı.",
      },
    ];

    for (const group of groups) {
      fillHonorCollection(document.getElementById(group.hostId), group);
    }
  }

  function fillHonorCollection(host, group) {
    if (!host) return;
    host.replaceChildren();
    const ids = [...new Set(group.ids.map((id) => String(id || "")).filter(Boolean))];
    if (!ids.length) {
      const empty = document.createElement("span");
      empty.className = "profile-honor-empty";
      empty.textContent = group.emptyCopy;
      host.appendChild(empty);
      return;
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
      item.title = definition.nameTr;
      item.setAttribute("aria-label", definition.nameTr);
      const glyph = document.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = definition.glyph;
      const label = document.createElement("small");
      label.textContent = definition.shortNameTr;
      item.append(glyph, label);
      host.appendChild(item);
    }
  }

  function deckDisplayName(deck) {
    if (!deck?.module_ids?.length) return "Henüz maç yok";
    return deck.module_ids
      .map((id) => moduleDefinitions.find((module) => module.definitionId === id)?.nameTr || id)
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
      matchCount.textContent = deck ? `${deck.matches} maçta kullanıldı` : "Aktif savaş destesi";
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
      if (label) label.textContent = core?.name_tr || "Rezonans Çekirdeği";
      if (level) level.textContent = `SEVİYE ${Number(core?.level || 1)}`;
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
    if (status) status.textContent = "Seçim kaydediliyor…";
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
    const backgroundId = cosmetics.selected_profile_background_id || "default";
    applyAvatarVisual(document.getElementById("profile-avatar"), avatarId, frameId);
    applyAvatarVisual(document.getElementById("lobby-profile-avatar"), avatarId, frameId);
    applyAvatarVisual(document.getElementById("profile-hero-avatar"), avatarId, frameId);
    document.getElementById("app-progress-ribbon")?.setAttribute("data-profile-background", backgroundId);
    document.querySelector(".profile-identity-card")?.setAttribute("data-profile-background", backgroundId);

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
        button.innerHTML = `<span>${avatar.glyph}</span><strong>${avatar.nameTr}</strong>`;
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(avatar.id), selected:avatar.id === avatarId, kind:"avatar", id:avatar.id, cosmetics }));
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
        button.innerHTML = `<span>◇</span><strong>${frame.nameTr}</strong>`;
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(frame.id), selected:frame.id === frameId, kind:"avatar_frame", id:frame.id, cosmetics }));
        button.addEventListener("click", () => selectProfileCosmetic("frame", frame.id));
        frameHost.appendChild(button);
      }
    }

    const emojiHost = document.getElementById("battle-emoji-choice-list");
    if (emojiHost) {
      emojiHost.replaceChildren();
      const unlocked = new Set(cosmetics.unlockedBattleEmojiIds || []);
      const quickEmojiId = quickBattleEmoji(cosmetics)?.id;
      for (const emoji of BATTLE_EMOJIS) {
        if (emoji.id === "none") continue;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.state = !unlocked.has(emoji.id) ? "locked" : emoji.id === quickEmojiId ? "selected" : "available";
        button.disabled = !unlocked.has(emoji.id);
        const name = document.createElement("strong");
        name.textContent = emoji.nameTr;
        button.append(
          createBattleEmojiVisual(emoji),
          name,
          cosmeticStateLabel({ unlocked:unlocked.has(emoji.id), selected:emoji.id === quickEmojiId, kind:"battle_emoji", id:emoji.id, cosmetics })
        );
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
        button.innerHTML = `<span>▰</span><strong>${background.nameTr}</strong>`;
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(background.id), selected:background.id === backgroundId, kind:"profile_background", id:background.id, cosmetics }));
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
    node.textContent = teamName || "Takım";
    if (cleanTeamId) {
      node.type = "button";
      node.title = "Takım profilini gör";
      node.setAttribute("aria-label", `${teamName || "Takım"} takım profilini aç`);
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
      node.setAttribute("aria-label", `${displayName} adlı oyuncunun profilini aç`);
      node.title = "Oyuncu profilini gör";
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

  // Ziyaret edilen oyuncunun adı, ünvanı, ligi ve kupası profilin sabit üst
  // barında durur; içerik kaydırılsa da kimlik görünür kalır. payload yoksa
  // (profil yüklenirken) önceki oyuncunun kimliği temizlenir.
  function renderPublicProfileIdentity(payload = null) {
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    const avatar = document.getElementById("public-profile-avatar");
    if (avatar) {
      applyAvatarVisual(
        avatar,
        payload?.avatar?.selected_avatar_id || "default",
        payload?.avatar?.selected_avatar_frame_id || "none"
      );
    }
    setText("public-profile-title", payload?.display_name || "Oyuncu");
    setText("public-profile-operator-title", payload ? payload.operator_title || "Devre Çırağı" : "");
    setText("public-profile-rank", payload ? payload.rank_name_tr || "Arena 1" : "");
    const trophies = document.getElementById("public-profile-trophies");
    if (trophies) {
      trophies.hidden = !payload;
      if (payload) renderTrophyValue(trophies, Number(payload.rating || 0));
    }
  }

  function renderPublicProfile(payload) {
    const host = document.getElementById("public-profile-content");
    if (!host) return;
    host.replaceChildren();
    renderPublicProfileIdentity(payload);

    const honors = document.createElement("section");
    honors.className = "profile-honor-showcase public-profile-honors";
    const honorsHeader = document.createElement("header");
    const honorsTitle = document.createElement("strong");
    honorsTitle.textContent = "DEVRE KOLEKSİYONU";
    honorsHeader.appendChild(honorsTitle);
    const honorGroups = document.createElement("div");
    honorGroups.className = "profile-honor-groups";
    for (const group of [
      {
        label:"SIRALAMA KUPALARI",
        ids:payload.honors?.rank_trophy_ids || [],
        definitions:PROFILE_RANK_TROPHIES,
        kind:"trophy",
        emptyCopy:"Henüz sıralama kupası kazanılmadı.",
      },
      {
        label:"ROZETLER",
        ids:payload.honors?.badge_ids || [],
        definitions:PROFILE_BADGES,
        kind:"badge",
        emptyCopy:"Henüz sıralama rozeti kazanılmadı.",
      },
    ]) {
      const section = document.createElement("section");
      const label = document.createElement("small");
      label.textContent = group.label;
      const collection = document.createElement("div");
      collection.className = "profile-honor-collection";
      fillHonorCollection(collection, group);
      section.append(label, collection);
      honorGroups.appendChild(section);
    }
    honors.append(honorsHeader, honorGroups);
    host.appendChild(honors);

    const deckSection = document.createElement("section");
    deckSection.className = "profile-deck-showcase";
    const deckHeading = document.createElement("div");
    deckHeading.className = "profile-section-heading";
    const deckTitle = document.createElement("h3");
    deckTitle.textContent = "En Çok Kullanılan Deste";
    deckHeading.append(deckTitle);
    const deckVisual = document.createElement("div");
    deckVisual.className = "profile-deck-visual";
    const core = document.createElement("div");
    core.className = "profile-featured-core";
    const coreGlyph = document.createElement("span");
    coreGlyph.className = "profile-featured-core-glyph";
    const coreCopy = document.createElement("span");
    coreCopy.className = "profile-featured-core-copy";
    const coreName = document.createElement("strong");
    coreName.textContent = payload.selected_core?.name_tr || "Rezonans Çekirdeği";
    const coreLevel = document.createElement("em");
    coreLevel.textContent = `SEVİYE ${Number(payload.selected_core?.level || 1)}`;
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
    deckUse.textContent = matches > 0 ? `${matches} maçta kullanıldı` : "Aktif savaş destesi";
    modules.appendChild(deckUse);
    deckVisual.append(core, modules);
    deckSection.append(deckHeading, deckVisual);
    host.appendChild(deckSection);

    const team = document.createElement("section");
    team.className = "profile-clan-card";
    const teamLabel = document.createElement("span");
    teamLabel.textContent = "TAKIM BİLGİSİ";
    const teamName = createTeamProfileLink(
      payload.team?.team_id,
      payload.team?.team_name || "Takıma dahil değil"
    );
    const teamCopy = document.createElement("small");
    teamCopy.textContent = payload.team?.team_name
      ? "Oyuncunun mevcut takımı"
      : "Bu oyuncu henüz bir takıma katılmadı.";
    team.append(teamLabel, teamName, teamCopy);
    host.appendChild(team);

    const seasonSection = document.createElement("section");
    seasonSection.className = "profile-season-history";
    const seasonHeading = document.createElement("div");
    seasonHeading.className = "profile-section-heading";
    const seasonTitle = document.createElement("h3");
    seasonTitle.textContent = "Sezon Geçmişi";
    seasonHeading.append(seasonTitle);
    // Güncel sezon tek satırdır: solda sezon adı, sağ üstte lig ve kupa.
    const currentSeason = document.createElement("article");
    currentSeason.className = "profile-current-season public-profile-current-season";
    const currentSeasonName = document.createElement("div");
    const currentSeasonLabel = document.createElement("small");
    currentSeasonLabel.textContent = "GÜNCEL SEZON";
    const currentSeasonValue = document.createElement("strong");
    currentSeasonValue.textContent = payload.season?.name_tr || "Güncel Sezon";
    currentSeasonName.append(currentSeasonLabel, currentSeasonValue);
    const seasonRank = document.createElement("div");
    seasonRank.className = "public-profile-season-league";
    const seasonRankLabel = document.createElement("small");
    seasonRankLabel.textContent = "MEVCUT LİG";
    const seasonRankLine = document.createElement("span");
    const seasonRankValue = document.createElement("strong");
    seasonRankValue.textContent = payload.rank_name_tr || "Arena 1";
    const seasonTrophies = document.createElement("strong");
    renderTrophyValue(seasonTrophies, Number(payload.rating || 0));
    seasonRankLine.append(seasonRankValue, seasonTrophies);
    seasonRank.append(seasonRankLabel, seasonRankLine);
    currentSeason.append(currentSeasonName, seasonRank);
    const past = document.createElement("div");
    past.className = "profile-past-seasons";
    const previous = payload.season?.summary?.previous;
    const best = payload.season?.summary?.best;
    for (const [label, value] of [
      ["SON SEZON", previous ? Number(previous.final_rating || 0) : "—"],
      ["EN İYİ SEZON", best ? Number(best.final_rating || 0) : "—"],
      ["TÜM ZAMANLAR", Number(payload.highest_rating || payload.rating || 0)],
    ]) {
      const card = document.createElement("article");
      const cardLabel = document.createElement("small");
      cardLabel.textContent = label;
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
    const statsTitle = document.createElement("h3");
    statsTitle.textContent = "İstatistikler";
    statsHeading.append(statsTitle);
    const statsGrid = document.createElement("div");
    statsGrid.className = "statistics-metrics-grid public-profile-stat-grid";
    const durationSeconds = Math.max(0, Math.round(Number(statistics.average_match_duration_ms || 0) / 1000));
    const durationText = durationSeconds < 60
      ? `${durationSeconds} sn`
      : `${Math.floor(durationSeconds / 60)} dk ${durationSeconds % 60} sn`;
    for (const metric of [
      ["Toplam Maç", Number(statistics.total_matches || 0).toLocaleString(uiLocale())],
      ["Galibiyet Oranı", `%${boundedWinRatePercent(statistics.win_rate, statistics.wins, statistics.total_matches)}`],
      ["Ortalama Savaş", durationText],
      ["Toplam Hasar", Number(statistics.total_damage_dealt || 0).toLocaleString(uiLocale())],
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
    button.textContent = isFriend
      ? "ARKADAŞIN"
      : incoming
        ? "İSTEĞİ KABUL ET"
        : outgoing
          ? "İSTEK GÖNDERİLDİ"
          : "+ ARKADAŞ";
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
    renderPublicProfileIdentity(null);
    if (status) status.textContent = "Oyuncu profili yükleniyor…";
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    activePublicProfileId = playerId;
    renderPublicProfileFriendAction();
    try {
      const payload = await requestJsonWithDeadline(
        `/public-profiles/${encodeURIComponent(playerId)}`,
        { cache: "no-store" },
        8000
      );
      if (status) status.textContent = "";
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
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = payload.name || "Takım";
    applyTeamAppearance(identity, payload.appearance, { emblemHost:emblem, nameHost:name });
    const size = document.createElement("small");
    size.textContent = `${Number(payload.member_count || 0)} / ${Number(payload.member_limit || 30)} üye`;
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
    heading.classList.add("team-stats-heading");
    const title = document.createElement("h3");
    title.textContent = "Takım İstatistikleri";
    heading.append(title);
    const grid = document.createElement("div");
    grid.className = "statistics-metrics-grid public-profile-stat-grid team-profile-stat-grid";
    for (const metric of [
      ["Toplam Kupa", Number(payload.total_trophies || 0).toLocaleString(uiLocale())],
      ["Ortalama Kupa", Number(payload.average_trophies || 0).toLocaleString(uiLocale())],
      ["Toplam Maç", Number(statistics.total_matches || 0).toLocaleString(uiLocale())],
      ["Galibiyet Oranı", `%${boundedWinRatePercent(statistics.win_rate, statistics.wins, statistics.total_matches)}`],
      ["Turnuva Sırası", tournament.position ? `#${tournament.position}` : "—"],
      ["Turnuva Puanı", `${Number(tournament.points || 0)} P`],
    ]) grid.appendChild(publicProfileMetric(...metric));
    statsSection.append(heading, grid);
    host.appendChild(statsSection);

    const membersSection = document.createElement("section");
    membersSection.className = "team-profile-members";
    const membersHeading = document.createElement("div");
    membersHeading.className = "profile-section-heading";
    const membersTitle = document.createElement("h3");
    membersTitle.textContent = "Üyeler";
    membersHeading.append(membersTitle);
    const memberList = document.createElement("ol");
    memberList.className = "team-member-list team-profile-member-list";
    for (const [index, member] of (payload.members || []).entries()) {
      const row = createTeamMemberRow(member, index);
      const meta = row.querySelector("small");
      if (meta) meta.textContent = `${member.role === "owner" ? "LİDER · " : ""}${member.rank_name_tr || "Arena"} · ${member.operator_title || "Operatör"}`;
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
    if (status) status.textContent = "Takım profili yükleniyor…";
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    try {
      const payload = await requestJsonWithDeadline(
        `/team-profiles/${encodeURIComponent(cleanTeamId)}`,
        { cache:"no-store" },
        8000
      );
      const title = document.getElementById("team-profile-title");
      if (title) title.textContent = payload.name || "Takım Profili";
      if (status) status.textContent = "";
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
    if (returnDialog?.showModal && !returnDialog.open) returnDialog.showModal();
    else returnDialog?.setAttribute("open", "");
  }

  function renderLeaderboard() {
    const host = document.getElementById("leaderboard-list");
    const status = document.getElementById("leaderboard-status");
    const season = document.getElementById("leaderboard-season-label");
    if (!host) return;
    host.replaceChildren();
    if (season && leaderboardPayload?.season) {
      season.textContent = `${leaderboardPayload.season.name_tr} · ${leaderboardPayload.season.starts_at.slice(0, 10)} — ${leaderboardPayload.season.ends_at.slice(0, 10)}`;
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
        ? `MEVCUT GRUBUN · ${viewerGroup.name_tr}`
        : "MEVCUT GRUP BULUNAMADI";
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
      ? `${labels[activeLeaderboardTab]}${activeLeaderboardTab === "trophies" ? ` · ${activeTrophyLeaderboardScope === "general" ? "Genel" : viewerGroup?.name_tr || "Grup"}` : ""} · ilk ${rows.length}`
      : "Bu sıralamada henüz kayıt yok.";
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
      rank.setAttribute("aria-label", `${Number(row.position)}. sıra`);
      const identity = document.createElement("div");
      identity.className = "leaderboard-identity";
      const name = row.team_name || row.display_name || "Oyuncu";
      const detail = activeLeaderboardTab === "teams"
        ? `${row.member_count} üye`
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
        score.textContent = `${Number(row.value || 0).toLocaleString(uiLocale())} HASAR`;
      } else {
        renderTrophyValue(score, Number(row.value || 0));
        if (activeLeaderboardTab === "trophies" && activeTrophyLeaderboardScope === "general" && Number(row.position) <= 10) {
          const reward = (leaderboardPayload?.top_ten_rewards || []).find((item) => Number(item.position) === Number(row.position));
          if (reward) {
            const previewTier = Number(row.position) === 1
              ? "diamond"
              : Number(row.position) <= 3
                ? "gold"
                : Number(row.position) <= 5
                  ? "silver"
                  : "bronze";
            const chest = createRewardChestButton({
              tier:reward.chest_tier || previewTier,
              visualId:reward.chest_visual_id || "",
              reward:{ ...reward, chest_is_container:true },
              title:reward.chest_name_tr || `${row.position}. Sıra Ödülü`,
              note:"Sezon sonunda mesaj kutusuna teslim edilir.",
              accent:({ 1:"#ffe16f", 2:"#c9e1ef", 3:"#dd9864" })[Number(row.position)] || "#8fd8ff",
              className:"leaderboard-reward-chest",
            });
            chest.dataset.rank = String(row.position);
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
      if (!response.ok) throw new Error(payload.detail || "Lider panosu yüklenemedi.");
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

  function closeRewardInbox() {
    const dialog = document.getElementById("reward-inbox-dialog");
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
  }

  async function acceptInboxInvitation(item, button) {
    if (button) button.disabled = true;
    const status = document.getElementById("reward-inbox-status");
    if (status) status.textContent = "Savaş alanı hazırlanıyor…";
    try {
      let battle = null;
      const body = JSON.stringify({
        player_id:participantPlayerId,
        request_id:`inbox:accept:${item.invitation_id}`,
      });
      if (item.kind === "team_training") {
        const payload = await requestJsonWithDeadline(
          `/teams/${encodeURIComponent(item.team_id)}/training-challenges/${encodeURIComponent(item.invitation_id)}/accept`,
          { method:"POST", body },
          30000
        );
        teamState = payload;
        battle = payload.operation?.battle || null;
      } else {
        const payload = await requestJsonWithDeadline(
          `/social/${encodeURIComponent(participantPlayerId)}/battle-invites/${encodeURIComponent(item.invitation_id)}/accept`,
          { method:"POST", body },
          30000
        );
        socialState = payload;
        battle = payload.battle || null;
      }
      if (!battle?.session_id) throw new Error("Savaş oturumu hazırlanamadı.");
      autoLaunchedBattleSessions.add(battle.session_id);
      closeRewardInbox();
      await launchSocialBattle(battle);
    } catch (error) {
      if (button) button.disabled = false;
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  async function declineInboxInvitation(item, button) {
    if (button) button.disabled = true;
    const status = document.getElementById("reward-inbox-status");
    try {
      const path = item.kind === "team_training"
        ? `/teams/${encodeURIComponent(item.team_id)}/training-challenges/${encodeURIComponent(item.invitation_id)}/decline`
        : `/social/${encodeURIComponent(participantPlayerId)}/battle-invites/${encodeURIComponent(item.invitation_id)}/decline`;
      const payload = await requestJsonWithDeadline(
        path,
        {
          method:"POST",
          body:JSON.stringify({ player_id:participantPlayerId, request_id:`inbox:decline:${item.invitation_id}` }),
        },
        30000
      );
      if (payload.inbox) rewardInboxState = payload.inbox;
      if (item.kind === "team_training") teamState = payload;
      else socialState = payload;
      renderRewardInbox();
      renderFriendsScreen();
      if (status) status.textContent = "Davet reddedildi.";
    } catch (error) {
      if (button) button.disabled = false;
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function createInboxInvitationCard(item) {
    const card = document.createElement("article");
    card.className = "reward-inbox-card inbox-invitation-card";
    card.dataset.kind = item.kind;
    card.dataset.status = item.status;
    const icon = document.createElement("span");
    icon.className = "inbox-card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.kind === "team_training" ? "⬡" : "⚔";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.kind === "team_training" ? "Takım antrenman maçı" : "Arkadaş savaşı";
    const detail = document.createElement("small");
    detail.textContent = item.incoming && item.status === "pending"
      ? `${item.peer_name} seni kupasız savaşa çağırdı.`
      : `${item.peer_name} ile kupasız savaş alanı hazır.`;
    copy.append(title, detail);
    const actions = document.createElement("span");
    actions.className = "inbox-card-actions";
    if (item.incoming && item.status === "pending") {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.textContent = "KABUL ET";
      accept.addEventListener("click", () => acceptInboxInvitation(item, accept));
      const decline = document.createElement("button");
      decline.type = "button";
      decline.textContent = "REDDET";
      decline.dataset.variant = "quiet";
      decline.addEventListener("click", () => declineInboxInvitation(item, decline));
      actions.append(accept, decline);
    } else if (item.status === "accepted" && item.battle_session_id) {
      const enter = document.createElement("button");
      enter.type = "button";
      enter.textContent = "SAVAŞ ALANINA GİR";
      enter.addEventListener("click", () => {
        autoLaunchedBattleSessions.add(item.battle_session_id);
        closeRewardInbox();
        launchSocialBattle({ session_id:item.battle_session_id, players:item.players || [], opponent_type:"human" });
      });
      actions.appendChild(enter);
    }
    card.append(icon, copy, actions);
    return card;
  }

  function createInboxNoticeCard(notice) {
    const card = document.createElement("article");
    card.className = "reward-inbox-card inbox-notice-card";
    card.dataset.kind = notice.kind || "update";
    card.dataset.seen = String(Boolean(notice.seen));
    const icon = document.createElement("span");
    icon.className = "inbox-card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = notice.kind === "game" ? "◈" : "✦";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = notice.title_tr || "Bildirim";
    const detail = document.createElement("small");
    const schedule = notice.scheduled_at ? new Date(notice.scheduled_at) : null;
    const scheduleLabel = schedule && !Number.isNaN(schedule.getTime())
      ? ` · ${schedule.toLocaleString(uiLocale(), { weekday:"short", hour:"2-digit", minute:"2-digit" })}`
      : "";
    detail.textContent = `${notice.body_tr || ""}${scheduleLabel}`;
    copy.append(title, detail);
    card.append(icon, copy);
    return card;
  }

  function createInboxRewardCard(message) {
    const card = document.createElement("article");
    card.className = "reward-inbox-card";
    const reward = message.chest || {};
    const chest = createRewardChestButton({
      tier:reward.chest_tier || "bronze",
      visualId:reward.chest_visual_id || "",
      reward:{ ...reward, chest_is_container:true },
      title:reward.chest_name_tr || "Ödül Kasası",
      note:message.status === "claimed" ? "Bu kasa açıldı." : "AL VE AÇ ile ödüller hesabına eklenir.",
      className:"inbox-reward-chest",
    });
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = message.title_tr || "Rekabet Ödülü";
    const detail = document.createElement("small");
    detail.textContent = reward.chest_name_tr || "Ödül Kasası";
    copy.append(title, detail);
    const claim = document.createElement("button");
    claim.type = "button";
    claim.textContent = message.status === "claimed" ? "ALINDI" : "AL VE AÇ";
    claim.disabled = message.status === "claimed";
    claim.addEventListener("click", async () => {
      claim.disabled = true;
      const status = document.getElementById("reward-inbox-status");
      if (status) status.textContent = "Ödül kasası açılıyor…";
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
        if (status) status.textContent = `${reward.chest_name_tr || "Ödül kasası"} açıldı.`;
      } catch (error) {
        claim.disabled = false;
        if (status) status.textContent = error instanceof Error ? error.message : String(error);
      }
    });
    card.append(chest, copy, claim);
    return card;
  }

  function renderRewardInbox() {
    noteTeamApplicationsFromInbox();
    const button = document.getElementById("reward-inbox-button");
    const notification = document.getElementById("reward-inbox-notification");
    const unclaimed = Number(rewardInboxState?.unclaimed_count || 0);
    const unread = Number(rewardInboxState?.unread_count ?? unclaimed);
    button?.classList.toggle("has-reward", unclaimed > 0);
    button?.classList.toggle("has-unread", unread > 0);
    if (notification) {
      notification.hidden = unread < 1;
      notification.textContent = unread > 9 ? "9+" : String(unread);
    }
    if (button) {
      button.title = unread > 0 ? `Mesaj Kutusu · ${unread} yeni` : "Mesaj Kutusu";
    }
    const fill = (hostId, items, createCard, emptyCopy) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      host.replaceChildren();
      for (const item of items) host.appendChild(createCard(item));
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.className = "reward-inbox-empty";
        empty.textContent = emptyCopy;
        host.appendChild(empty);
      }
    };
    fill("reward-inbox-invitations", rewardInboxState?.invitations || [], createInboxInvitationCard, "Bekleyen savaş daveti yok.");
    fill("reward-inbox-list", rewardInboxState?.messages || [], createInboxRewardCard, "Yeni ödül sandığı yok. Sezon, hafta ve takım turnuvası ödülleri burada teslim edilir.");
    fill("reward-inbox-notices", rewardInboxState?.notices || [], createInboxNoticeCard, "Yeni oyun bildirimi yok.");
  }

  // Arkadaşın ya da takım üyen daveti kabul edince davet eden oyuncu da savaş
  // alanına otomatik girer (yalnız bu oturumda gönderilen davetler için).
  function maybeAutoLaunchAcceptedInvite() {
    if (document.body.dataset.appScreen === "play") return false;
    const item = (rewardInboxState?.invitations || []).find((candidate) =>
      !candidate.incoming
      && candidate.status === "accepted"
      && candidate.battle_session_id
      && recentBattleInviteTargets.has(candidate.peer_id)
      && !autoLaunchedBattleSessions.has(candidate.battle_session_id)
    );
    if (!item) return false;
    autoLaunchedBattleSessions.add(item.battle_session_id);
    recentBattleInviteTargets.delete(item.peer_id);
    closeRewardInbox();
    void launchSocialBattle({ session_id:item.battle_session_id, players:item.players || [], opponent_type:"human" });
    return true;
  }

  async function markInboxNoticesSeen() {
    const unseen = (rewardInboxState?.notices || []).filter((notice) => !notice.seen);
    if (!unseen.length) return;
    try {
      rewardInboxState = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/reward-inbox/notices/seen`,
        {
          method:"POST",
          body:JSON.stringify({ player_id:participantPlayerId, notice_ids:unseen.map((notice) => notice.notice_id) }),
        },
        12000
      );
      renderRewardInbox();
    } catch (_error) {
      // Okundu işareti bir sonraki açılışta yeniden denenir.
    }
  }

  let socialPollTimer = null;
  let socialPollTick = 0;

  // Mesaj kutusu ve arkadaş bildirimleri arka planda tazelenir; savaş
  // sırasında ya da sekme gizliyken istek atılmaz. Gönderilmiş bir davet
  // varken kabulü hızlı yakalamak için sıklık artar.
  function startSocialPolling() {
    if (socialPollTimer) return;
    socialPollTimer = window.setInterval(() => {
      if (document.hidden || document.body.dataset.appScreen === "play") return;
      socialPollTick += 1;
      // Açık sohbet her turda tazelenir; karşı tarafın mesajı birkaç saniyede görünür.
      if (
        activeDirectMessagePeerId
        && activeFriendsTab === "messages"
        && document.body.dataset.appScreen === "friends"
      ) {
        void loadDirectMessageThread();
      }
      const urgent = recentBattleInviteTargets.size > 0;
      if (!urgent && socialPollTick % 4 !== 0) return;
      void loadRewardInbox({ quiet:true });
      void loadSocialView({ quiet:true });
    }, 5000);
  }

  async function loadRewardInbox({ open=false, quiet=false } = {}) {
    const status = document.getElementById("reward-inbox-status");
    try {
      rewardInboxState = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/reward-inbox`,
        { cache:"no-store" },
        12000
      );
      if (status && !quiet) status.textContent = "";
      renderRewardInbox();
      maybeAutoLaunchAcceptedInvite();
    } catch (error) {
      if (status && !quiet) status.textContent = error instanceof Error ? error.message : String(error);
    }
    if (open) {
      const dialog = document.getElementById("reward-inbox-dialog");
      if (dialog?.showModal && !dialog.open) dialog.showModal();
      else dialog?.setAttribute("open", "");
      void markInboxNoticesSeen();
    }
  }

  // Sezon yolu hücresi: ödül sandık olarak görünür, içeriği önizlemede.
  function seasonPassCell(reward, { premium = false, tierNumber = 0, passActive = false } = {}) {
    const cell = document.createElement("div");
    cell.className = `season-pass-cell${premium ? " is-premium" : ""}`;
    if (!reward) {
      cell.dataset.state = "empty";
      return cell;
    }
    const state = reward.claimed
      ? "claimed"
      : reward.claimable
        ? "claimable"
        : premium && !passActive
          ? "pass-locked"
          : "locked";
    cell.dataset.state = state;
    const chest = createRewardChestButton({
      tier:reward.chest_tier || (reward.is_major ? "gold" : "bronze"),
      reward,
      count:premium ? 2 : 1,
      title:`${premium ? "Ücretli Geçiş · " : ""}Kademe ${tierNumber} Ödülü`,
      note:state === "claimed"
        ? "Bu ödül alındı."
        : state === "pass-locked"
          ? "Ücretli geçiş etkin olduğunda alınabilir."
          : state === "claimable"
            ? "Ödül alınmaya hazır."
            : `${Number(reward.required_xp || 0).toLocaleString(uiLocale())} Deneyim ile açılır.`,
      locked:state === "locked" || state === "pass-locked",
      accent:premium ? "#ffd36e" : "#6ff1e0",
      className:"season-pass-chest",
    });
    const action = document.createElement("button");
    action.type = "button";
    action.className = "season-pass-claim";
    if (premium) action.dataset.premiumTierClaim = String(tierNumber);
    else action.dataset.tierClaim = String(tierNumber);
    action.disabled = state !== "claimable";
    action.textContent = state === "claimed"
      ? "ALINDI"
      : state === "claimable"
        ? "AL"
        : state === "pass-locked"
          ? "GEÇİŞ GEREKLİ"
          : "KİLİTLİ";
    cell.append(chest, action);
    return cell;
  }

  // Günlük devre emirleri: her emir tek satırdır. Solda emrin simgesi,
  // ortada ilerleme çubuğu, sağda ödül rozetleri ve durum düğmesi durur.
  const DAILY_MISSION_ICONS = Object.freeze({
    complete_battles:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    deal_damage:'<circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
    circuit_actions:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 14v6M14 17h6"/>',
    win_battles:'<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>',
    destroy_modules:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m13 4-3 6 4 3-3 7"/>',
    core_power:'<path d="m12 3 6 9-6 9-6-9Z"/><path d="M2 12h3M19 12h3"/>',
  });
  const DAILY_MISSION_STATE_ORDER = Object.freeze({ claimable:0, active:1, claimed:2 });

  function dailyMissionState(mission) {
    return mission.claimed ? "claimed" : mission.completed ? "claimable" : "active";
  }

  function createDailyMissionCard(mission) {
    const state = dailyMissionState(mission);
    const target = Math.max(1, Number(mission.target || 1));
    const progress = Math.max(0, Math.min(target, Number(mission.progress || 0)));
    const card = document.createElement("article");
    card.className = "daily-mission-card";
    card.dataset.state = state;
    card.dataset.mission = String(mission.id || "");
    const icon = document.createElement("span");
    icon.className = "daily-mission-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 24 24">${DAILY_MISSION_ICONS[mission.id] || DAILY_MISSION_ICONS.complete_battles}</svg>`;
    const copy = document.createElement("div");
    copy.className = "daily-mission-copy";
    const name = document.createElement("strong");
    name.textContent = mission.name_tr;
    const description = document.createElement("span");
    description.textContent = mission.description_tr;
    const meter = document.createElement("span");
    meter.className = "daily-mission-meter";
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", String(target));
    meter.setAttribute("aria-valuenow", String(progress));
    meter.setAttribute("aria-label", `${mission.name_tr} · ${progress} / ${target}`);
    meter.style.setProperty("--mission-progress", `${Math.round((progress / target) * 100)}%`);
    const count = document.createElement("small");
    count.className = "daily-mission-count";
    count.textContent = `${progress.toLocaleString(uiLocale())} / ${target.toLocaleString(uiLocale())}`;
    copy.append(name, description, meter, count);
    const side = document.createElement("div");
    side.className = "daily-mission-side";
    const rewards = document.createElement("span");
    rewards.className = "daily-mission-rewards";
    for (const [kind, amount, label] of [
      ["experience", Number(mission.season_xp_reward || 0), "Deneyim"],
      ["flux_shards", Number(mission.flux_shard_reward || 0), "Akı"],
    ]) {
      if (amount <= 0) continue;
      const reward = document.createElement("em");
      reward.className = "daily-mission-reward";
      reward.dataset.rewardKind = kind;
      reward.title = `+${amount} ${label}`;
      reward.innerHTML = `${resourceSymbolMarkup(kind)}<b>+${amount}</b>`;
      rewards.appendChild(reward);
    }
    const action = document.createElement("button");
    action.type = "button";
    action.className = "daily-mission-action";
    action.dataset.missionClaim = String(mission.id || "");
    action.disabled = state !== "claimable";
    action.textContent = state === "claimed" ? "Alındı" : state === "claimable" ? "Ödülü Al" : "Devam Ediyor";
    side.append(rewards, action);
    card.append(icon, copy, side);
    return card;
  }

  // Emirler sunucuda UTC gün değişiminde yenilenir (utc_day_key).
  function updateDailyMissionReset() {
    const target = document.getElementById("daily-mission-reset");
    if (!target) return;
    const now = new Date();
    const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const minutes = Math.max(1, Math.ceil((nextReset - now.getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    target.textContent = hours > 0
      ? `Yenilenme ${hours} sa ${minutes % 60} dk`
      : `Yenilenme ${minutes} dk`;
  }

  const LOGIN_WEEKDAYS_TR = Object.freeze(["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]);

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

    setText(
      "season-tier-label",
      `Kademe ${engagement.current_tier || 0} / ${engagement.max_tier || 40}`
    );
    const seasonXp = Number(engagement.season_xp || 0);
    setText("season-progress-copy", nextReward ? `${Math.max(0, Number(nextReward.required_xp || 0) - seasonXp)} Deneyim kaldı` : "Sezon yolu tamamlandı");
    const nextTierExperience = Number(nextReward?.required_xp || rewardList.at(-1)?.required_xp || seasonXp);
    setText("season-progress-ratio", `${seasonXp.toLocaleString(uiLocale())} / ${nextTierExperience.toLocaleString(uiLocale())} Deneyim`);
    setText("lobby-season-tier", `Kademe ${engagement.current_tier || 0} / ${engagement.max_tier || 40}`);
    setText("lobby-season-progress-copy", nextReward ? `${Math.max(0, Number(nextReward.required_xp || 0) - seasonXp)} Deneyim kaldı` : "Sezon yolu tamamlandı");
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
      "daily-mission-page-summary",
      claimableMissions > 0
        ? `${claimableMissions} ödül alınmaya hazır`
        : `${activeMissions} görev aktif`
    );
    const claimableRewards = rewardList.filter(
      (reward) => reward.claimable && !reward.claimed
    ).length;
    const seasonHasNotification = notifications.season
      ?? (claimableRewards > 0);

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
      button.classList.toggle(
        "has-persistent-notification",
        Boolean(notificationByScreen[target])
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
    const loginDayCount = Number(engagement.daily_login?.day_count || loginRewards.length || 28);
    setText(
      "monthly-login-summary",
      claimableLoginRewards
        ? "Bugünün ödülü hazır"
        : `${engagement.daily_login?.claimed_days?.length || 0} / ${loginDayCount} gün alındı`
    );
    setText(
      "monthly-login-period",
      engagement.daily_login?.starts_at
        ? `BU DÖNEM · ${eventDayRangeLabel(engagement.daily_login.starts_at, engagement.daily_login.ends_at)}`
        : "BU DÖNEM"
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
        // Dönem Pazartesi başlar; 7, 14, 21 ve 28. günler Pazar'dır.
        day.textContent = `${reward.day}. GÜN · ${LOGIN_WEEKDAYS_TR[(Number(reward.day) - 1) % 7]}`;
        const prize = createRewardRows(reward, { compact:true });
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.loginClaim = String(reward.day);
        action.disabled = !reward.claimable;
        action.textContent = reward.claimed
          ? "ALINDI"
          : reward.claimable
            ? "AL"
            : Number(reward.day) < today
              ? "KAÇIRILDI"
              : "KİLİTLİ";
        card.append(day, prize, action);
        loginTrack.appendChild(card);
      }
    }

    const missions = document.getElementById("daily-mission-list");
    if (missions) {
      missions.replaceChildren();
      // Alınabilir emirler üstte, sürenler ortada, alınanlar altta durur.
      const orderedMissions = [...missionList].sort(
        (left, right) => DAILY_MISSION_STATE_ORDER[dailyMissionState(left)]
          - DAILY_MISSION_STATE_ORDER[dailyMissionState(right)]
      );
      for (const mission of orderedMissions) missions.appendChild(createDailyMissionCard(mission));
    }
    const completedMissions = missionList.filter((mission) => mission.completed || mission.claimed).length;
    setText("daily-mission-overview-copy", `${completedMissions} / ${missionList.length} emir tamamlandı`);
    const missionOverview = document.getElementById("daily-mission-overview-meter");
    if (missionOverview) {
      missionOverview.setAttribute("aria-valuemax", String(missionList.length));
      missionOverview.setAttribute("aria-valuenow", String(completedMissions));
      missionOverview.style.setProperty(
        "--mission-overview",
        `${missionList.length ? Math.round((completedMissions / missionList.length) * 100) : 0}%`
      );
    }
    updateDailyMissionReset();

    const rewards = document.getElementById("season-reward-track");
    if (rewards) {
      rewards.replaceChildren();
      const premiumPass = engagement.premium_pass || {};
      const premiumTrack = engagement.premiumRewardTrack || engagement.premium_reward_track || [];
      const premiumStatus = document.getElementById("season-premium-status");
      if (premiumStatus) {
        premiumStatus.textContent = localizedUiText(premiumPass.status_tr || "");
        premiumStatus.dataset.active = String(Boolean(premiumPass.active));
        premiumStatus.hidden = !premiumPass.status_tr;
      }
      renderSeasonPremiumPurchase();
      const seasonXp = Number(engagement.season_xp || 0);
      for (const reward of engagement.rewardTrack || []) {
        const premium = premiumTrack.find((item) => Number(item.tier) === Number(reward.tier)) || null;
        const row = document.createElement("article");
        row.className = "season-pass-row";
        row.dataset.major = String(Boolean(reward.is_major));
        row.dataset.unlocked = String(seasonXp >= Number(reward.required_xp || 0));
        const tier = document.createElement("header");
        tier.className = "season-pass-tier";
        const tierName = document.createElement("strong");
        tierName.textContent = `KADEME ${reward.tier}`;
        const requirement = document.createElement("small");
        requirement.textContent = `${Number(reward.required_xp || 0).toLocaleString(uiLocale())} Deneyim`;
        tier.append(tierName, requirement);
        row.append(
          tier,
          seasonPassCell(reward, { tierNumber:reward.tier }),
          seasonPassCell(premium, { premium:true, tierNumber:reward.tier, passActive:Boolean(premiumPass.active) })
        );
        rewards.appendChild(row);
      }
    }

    globalThis.GridshardI18n?.apply(document.documentElement.lang || "tr");
  }

  function operationRequestId(prefix) {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}:${participantPlayerId}:${suffix}`;
  }

  async function claimEngagementReward(kind, id, button) {
    const isSeasonTrack = kind === "tiers" || kind === "premium-tiers";
    const status = document.getElementById(
      isSeasonTrack ? "season-action-status" : "daily-action-status"
    );
    const viewEngagement = profileState.viewModel()?.engagement || {};
    const selectedReward = isSeasonTrack
      ? (kind === "premium-tiers"
          ? viewEngagement.premiumRewardTrack
          : viewEngagement.rewardTrack
        )?.find((reward) => String(reward.tier) === String(id))
      : null;
    const opensChest = Boolean(selectedReward?.chest_tier);
    if (opensChest) {
      showChestOpening({
        tier: selectedReward.chest_tier,
        title: `Kademe ${selectedReward.tier} Sandığı`,
      });
    }
    if (button) button.disabled = true;
    if (status) status.textContent = "Ödül alınıyor…";
    const engagement = profileState.viewModel()?.engagement || {};
    const claimScope = kind === "missions"
      ? (engagement.daily_mission_day || new Date().toISOString().slice(0, 10))
      : kind === "login"
        ? (engagement.daily_login?.period || new Date().toISOString().slice(0, 10))
        : (engagement.season_id || "current");
    const requestId = `engagement:${participantPlayerId}:${claimScope}:${kind}:${id}`;
    const result = await accountDataLoader.claimEngagementReward(kind, id, requestId);
    // A failed request must remain retryable.  The deterministic request id
    // makes a retry safe even when the server committed the reward before a
    // network response was lost.
    if (!result.ok && button) button.disabled = false;
    if (result.ok) {
      await loadMetaProgression();
      const premiumReceipts = result.payload?.season_chest_receipts || [];
      if (premiumReceipts.length > 1) {
        showBulkChestReveal({
          receipts:premiumReceipts,
          definition_id:premiumReceipts[0]?.definition_id,
        });
      } else if (premiumReceipts.length === 1) {
        showChestReveal(premiumReceipts[0]);
      } else if (result.payload?.season_chest_receipt) {
        showChestReveal(result.payload.season_chest_receipt);
      }
    } else if (opensChest) {
      showChestFailure(result.reason || "Sezon sandığı açılamadı.");
    }
    renderProfileSummary();
    renderRemoteDataStatus();
    if (status) {
      status.textContent = result.ok ? "" : (result.reason || "Ödül alınamadı.");
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
    if (!window.confirm(localizedUiText("Oyuncu adını yalnız bir kez değiştirebilirsin. Bu adı kaydetmek istiyor musun?"))) return { ok:false, cancelled:true };
    if (button) button.disabled = true;
    if (status) status.textContent = "Oyuncu adı kaydediliyor…";

    let result;
    try {
      result = await accountDataLoader.saveDisplayName(input?.value);
    } finally {
      if (button) button.disabled = false;
    }

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
    const entries = [["🏆 / En yüksek", `${stats.current_trophies} / ${stats.highest_trophies}`], ["Arena / Lig", stats.rank], ["En uzun galibiyet serisi", stats.longest_streak || 0], ["Maç başı yerleştirme", ((stats.deployments || 0)/matches).toFixed(1)], ["Toplam / Ortalama Akım", `${stats.current_spent || 0} / ${((stats.current_spent || 0)/matches).toFixed(1)}`], ["Çekirdek gücü kullanımı", stats.core_power_uses || 0], ["En yüksek maç hasarı", stats.peak_damage || 0], ["Açılan modül", `${stats.unlocked_modules} / 36`], ["Yükseltilen modül", stats.upgraded_modules], ["En yüksek modül seviyesi", stats.highest_module_level], ["Açılan çekirdek", `${stats.unlocked_cores} / 7`], ["Açılan sandık", stats.opened_chests]];
    for (const [id, count] of Object.entries(stats.cores || {})) entries.push([metaProgressionState.cores?.types.find(c => c.id === id)?.name_tr || id, `%${Math.round(count / matches * 100)}`]);
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
        return `${seconds} sn`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return `${minutes} dk ${remainder} sn`;
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
      heading.innerHTML = `<strong>${index + 1}. DESTE</strong><small>${number(deck.matches)} maç</small>`;
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
      && (candidate.definitionId || clientDefinitionId(candidate.instanceId)) !== "core"
    ));
    const sameDefinitionCount = active.filter((candidate) => (
      (candidate.definitionId || clientDefinitionId(candidate.instanceId)) === definitionId
    )).length;
    if (sameDefinitionCount >= 2) {
      return `${module.nameTr} için aynı anda en fazla 2 kopya kullanılabilir.`;
    }
    const categoryCount = active.filter(
      (candidate) => candidate.category === module.category
    ).length;
    const categoryLimit = LIVE_CATEGORY_LIMITS[module.category];
    if (categoryCount >= categoryLimit) {
      return `${poolCategoryLabel(module.category)} sınırı dolu: ${categoryCount}/${categoryLimit}.`;
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
    const result = client.deployDefinition(
      module.definitionId || clientDefinitionId(module.instanceId),
      module.currentCost
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
      `${module.nameTr} için sunucu uygun hücreyi seçiyor.`
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
      ? `${module.nameTr} · ${module.currentCost} Akım · Tıkla, sistem yerleştirsin`
      : compositionRejection || `${module.nameTr} · ${module.currentCost} Akım · Yetersiz Akım veya devre dolu`;

    const icon = document.createElement("span");
    icon.className = "module-icon";
    icon.textContent = moduleIconFor(module);
    const name = document.createElement("span");
    name.className = "name";
    fillBattleCardName(name, module);
    const stats = document.createElement("span");
    stats.className = "module-stats";
    const cost = document.createElement("span");
    cost.className = "module-stat credit";
    cost.textContent = `${module.currentCost} Akım`;
    stats.append(cost);
    card.append(icon, name, stats);
    const currentBadge = document.createElement("span");
    currentBadge.className = "current-cost-badge";
    currentBadge.textContent = `ϟ ${module.currentCost}`;
    card.appendChild(currentBadge);
    card.addEventListener("click", () => deployDeckModule(module));
    return card;
  }

  function renderShelf() {
    const placement = modulePlacementSlotState();
    const deckModules = battlePoolSelection.selectedIds().map(id => client.modules.get(id)).filter(Boolean);
    const discounted = Number(client.currentDiscountRemaining || 0) > 0;
    const costFor = m => Math.max(1, Number(m.currentCost) - (discounted ? 1 : 0));
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
      // Akımı yeten kart aktif, yetmeyen ya da yerleşemeyen kart pasif görünür.
      card.dataset.affordable = String(client.circuitCredits >= cost);
      card.dataset.playable = String(enabled);
      if (enabled && cost !== module.currentCost) {
        card.title = `${module.nameTr} · ${cost} Akım · Tıkla, sistem yerleştirsin`;
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
        signatureBadges:module.signatureBadges,
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
        // Çekirdek kartı hedefleme durumuna göre de değişir.
        moduleSignature: (module) => (
          `${battleModuleRenderSignature(module)}|${
            module.nameTr === "Çekirdek" && corePowerTargeting ? 1 : 0
          }|${document.documentElement?.lang || "tr"}`
        ),
        onCardPlaced: (module, cell) => {
          moduleAnchorCells.set(String(module.instanceId), cell);
        },
        force,
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

  // Savaş kartına sığan kısa ad (bkz. module-card-view.js).
  function moduleShortNameFor(module) {
    return typeof GridshardModuleCardView.shortNameFor === "function"
      ? GridshardModuleCardView.shortNameFor(module)
      : String(module?.nameTr || "");
  }

  // Savaş kartındaki ad satırı: etkin dile çevrilmiş kısa ad. On bir harf ve
  // üstü adlar dar kartta taşmasın diye işaretlenir (bkz. canon.css,
  // "Savaşta modül adları").
  function fillBattleCardName(element, moduleLike) {
    const text = localizedUiText(moduleShortNameFor(moduleLike));
    element.textContent = text;
    if (text.length >= 11) element.dataset.long = "true";
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
      module.nameTr === "Çekirdek" && corePowerTargeting
    );
    if (hasTargetInteraction) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
    }

    if (
      module.definitionId === "core"
    ) {
      card.classList.add(
        "fixed-module"
      );
      card.title =
        `${module.nameTr} sabit başlangıç modülüdür.`;
    } else {
      card.title = `${module.nameTr} · savaş sırasında sabit`;
    }
    if (module.nameTr === "Çekirdek" && corePowerTargeting) {
      card.classList.add("core-power-target");
      card.title="Çekirdek Rezonansını kullan";
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
    fillBattleCardName(name, module);

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
      && module.currentCost > 0
    ) {
      const cost =
        document.createElement("span");
      cost.className =
        "module-stat credit";
      cost.textContent =
        `${module.currentCost} Akım`;
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
      if (module.definitionId !== "core") appendModuleHeatBar(card, module);
      appendModuleFxOverlay(card);
    }

    card.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        if (module.definitionId === "core" && corePowerReady) {
          useCorePowerOn(module);
          return;
        }
        if (module.status === "reserve") {
          if (!modulePlacementSlotState().ready) {
            logClientMessage("Devre dolu; boş hücre açılınca yerleştirebilirsin.");
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

    return card;
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
    const heatEffect = moduleHeatEffectLabel(module);
    const suffix = heatEffect ? ` · ${heatEffect}` : "";
    if (module.overheated || heat >= MODULE_MAX_HEAT) return `AŞIRI ISI %${heat.toFixed(0)}`;
    if (heat >= MODULE_HEAT_HIGH) return `YÜKSEK ISI %${heat.toFixed(0)}${suffix}`;
    return `Isı %${heat.toFixed(0)}${suffix}`;
  }

  function supportLabelForModule(module) {
    if (module.nameTr === "Onarım Modülü") return "Onarım";
    if (module.nameTr === "Soğutucu") return "Soğutma";
    if (module.nameTr === "Güçlendirici") return "Hasar +%15";
    if (module.nameTr === "Hedefleme Bilgisayarı") return "Cooldown -%15";
    if (module.nameTr === "Aşırı Hızlandırıcı") return "Hasar +%20 · Cooldown -%20 · Isı +";
    return "";
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
    if (!capacityEl) return;
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
          "Savaş tamamlandı; yeni kart basılamaz.";
      }
      return;
    }

    const placement = modulePlacementSlotState();
    const affordable = battlePoolSelection.selectedIds().some((instanceId) => {
      const module = client.modules.get(instanceId);
      return module && client.circuitCredits >= Number(module.currentCost || 0);
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
    const commandLabels = {
      deploy_module: "Modül yerleştirme isteği",
      use_core_power: "Çekirdek gücü kullanıldı",
      send_battle_emoji: "Savaş emojisi gönderildi",
      set_battle_pool: "Savaş Havuzu ayarlandı",
      quick_test_battle_pool: "Hızlı test havuzu yüklendi",
    };
    if (commandLabels[entry.kind]) return commandLabels[entry.kind];
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

  // Gerçek cihaz savaş bütçesi için kare ve DOM ölçümü; mevcut rızaya bağlı
  // ürün analitiği akışından bağımsızdır ve kendi başına sunucuya gönderilmez.
  const battlePerformanceSampler =
    typeof GridshardBattlePerformanceSampler === "function"
      ? new GridshardBattlePerformanceSampler({
          probe:() => ({
            effectNodes: document.getElementById("battle-effect-layer")?.childElementCount || 0,
            domNodes: document.getElementsByTagName?.("*").length || 0,
          }),
        })
      : null;
  let lastBattlePerformance = null;
  if (typeof window !== "undefined") {
    window.__GRIDSHARD_PERF = Object.freeze({
      budget:globalThis.GRIDSHARD_PERFORMANCE_BUDGET || null,
      get active() { return Boolean(battlePerformanceSampler?.active); },
      get current() {
        return battlePerformanceSampler?.active ? battlePerformanceSampler.summary() : null;
      },
      get last() { return lastBattlePerformance; },
    });
  }
  if (battlePerformanceSampler && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) battlePerformanceSampler.suspend();
    });
  }
  // Kare ölçümü pencereleri. Her karede rAF istemek tarayıcıyı her taramada
  // ana iş parçacığında kare üretmeye zorlar; o zaman çalışan bütün CSS
  // animasyonlarının (bileşimcinin kendi oynattıkları dahil) stili her karede
  // yeniden hesaplanır. Bu yüzden oyun döngüsü HUD hızında döner ve kareler
  // yalnız kısa ölçüm pencerelerinde tek tek izlenir. `?e2e=1` (cihaz kanıtı
  // ve tarayıcı testleri) savaşın tamamını ölçer.
  const FRAME_SAMPLING_FULL = (() => {
    try {
      return new URLSearchParams(globalThis.location?.search || "").get("e2e") === "1";
    } catch (_) {
      return false;
    }
  })();
  const FRAME_SAMPLING_PERIOD_MS = 10000;
  const FRAME_SAMPLING_WINDOW_MS = 1200;
  function frameSamplingActive(now, battleActive) {
    if (!battleActive || !Number.isFinite(now)) return false;
    if (FRAME_SAMPLING_FULL) return true;
    return now % FRAME_SAMPLING_PERIOD_MS < FRAME_SAMPLING_WINDOW_MS;
  }

  function sampleBattlePerformance(now, sampling=true) {
    if (!battlePerformanceSampler) return;
    const battleActive =
      (activePlayMode === "local" && localBattleStarted && !localBattleFinished)
      || (activePlayMode === "online" && document.body.dataset.onlineStatus === "battle");
    if (battleActive && !sampling) {
      // Pencere dışı: aradaki süre kare sayılmasın.
      if (battlePerformanceSampler.active) battlePerformanceSampler.suspend();
      return;
    }
    if (battleActive && !battlePerformanceSampler.active) {
      battlePerformanceSampler.start({
        mode:activePlayMode,
        platform:globalThis.Capacitor?.getPlatform?.() || "web",
        graphics_quality:battleGraphicsQuality(),
        graphics_auto:graphicsModeIsAuto(),
        battle_perspective:document.body.dataset.battlePerspective !== "off",
        device_memory_gb:Number(globalThis.navigator?.deviceMemory) || null,
        cpu_cores:Number(globalThis.navigator?.hardwareConcurrency) || null,
      });
    }
    if (!battlePerformanceSampler.active) return;
    if (battleActive) battlePerformanceSampler.frame(now);
    else lastBattlePerformance = battlePerformanceSampler.stop();
  }

  let analyticsFrameDurationMs = 0;
  let analyticsFrameCount = 0;
  let analyticsLastFrameAt = null;
  let analyticsLastFrameReport = -60_000;
  const BATTLE_HUD_RENDER_INTERVAL_MS = 250;
  let lastBattleHudRenderAt = -Infinity;
  let renderedClockText = null;
  let renderedClockOvertime = null;

  // Otomatik grafik kademesi: ölçüm pencerelerinde ortalama kare süresi ya da
  // takılma oranı art arda iki kez kötü çıkarsa kademe bir iner.
  const AUTO_GRAPHICS_WINDOW_MS = 4000;
  const AUTO_GRAPHICS_MIN_WINDOW_MS = 1000;
  const AUTO_GRAPHICS_SLOW_AVERAGE_MS = 26;
  const AUTO_GRAPHICS_SLOW_RATIO = 0.08;
  let autoGraphicsWindow = null;
  let autoGraphicsBadWindows = 0;
  function closeAutoGraphicsWindow() {
    const window_ = autoGraphicsWindow;
    autoGraphicsWindow = null;
    if (!window_) return;
    const elapsed = window_.last - window_.start;
    if (elapsed < AUTO_GRAPHICS_MIN_WINDOW_MS || window_.frames < 10) return;
    const bad =
      elapsed / window_.frames > AUTO_GRAPHICS_SLOW_AVERAGE_MS
      || window_.slow / window_.frames > AUTO_GRAPHICS_SLOW_RATIO;
    autoGraphicsBadWindows = bad ? autoGraphicsBadWindows + 1 : 0;
    if (autoGraphicsBadWindows >= 2) {
      autoGraphicsBadWindows = 0;
      lowerAutoGraphicsTier();
    }
  }
  function trackAutoGraphics(now, sampling) {
    if (!sampling || document.hidden || !Number.isFinite(now)) {
      closeAutoGraphicsWindow();
      return;
    }
    if (!autoGraphicsWindow) {
      autoGraphicsWindow = { start:now, last:now, frames:0, slow:0 };
      return;
    }
    const gap = now - autoGraphicsWindow.last;
    if (gap < 0 || gap > 1000) {
      // Arka plandan dönüş: pencere baştan başlar.
      autoGraphicsWindow = null;
      return;
    }
    autoGraphicsWindow.last = now;
    autoGraphicsWindow.frames += 1;
    if (gap > 50) autoGraphicsWindow.slow += 1;
    if (now - autoGraphicsWindow.start >= AUTO_GRAPHICS_WINDOW_MS) closeAutoGraphicsWindow();
  }

  function updateClock(now) {
    const analyticsBattleActive = activePlayMode === "online"
      ? document.body.dataset.onlineStatus === "battle"
      : activePlayMode === "local" && localBattleStarted && !localBattleFinished;
    const frameSampling = frameSamplingActive(now, analyticsBattleActive);
    sampleBattlePerformance(now, frameSampling);
    syncFirstMatchTutorial(now);
    trackAutoGraphics(now, frameSampling);
    if (frameSampling && !document.hidden && settingsState.viewModel()?.analyticsConsent === true) {
      // Yalnız ölçüm penceresindeki ardışık kareler sayılır.
      const gap = analyticsLastFrameAt === null ? null : now - analyticsLastFrameAt;
      analyticsLastFrameAt = now;
      if (gap !== null && gap >= 0 && gap <= 1000) {
        analyticsFrameCount += 1;
        analyticsFrameDurationMs += gap;
      }
      if (analyticsFrameDurationMs >= 5000) {
        if (now - analyticsLastFrameReport >= 60_000) {
          const fps = analyticsFrameCount * 1000 / Math.max(1, analyticsFrameDurationMs);
          const bucket = fps < 20 ? "under_20" : fps < 30 ? "20_29" : fps < 45 ? "30_44" : fps < 60 ? "45_59" : "60_plus";
          recordProductEvent("performance_sample", {screen:"play", fps:bucket});
          analyticsLastFrameReport = now;
        }
        analyticsFrameDurationMs = 0;
        analyticsFrameCount = 0;
      }
    } else {
      analyticsLastFrameAt = null;
      if (!analyticsBattleActive) {
        analyticsFrameDurationMs = 0;
        analyticsFrameCount = 0;
      }
    }
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
    }

    // HUD ve tahta denetimi her karede çalışmaz: sunucu mesajı uygulanınca
    // (bkz. syncOnlineServerBattle) ve yedek olarak bu turda yenilenir.
    if (
      !frameSampling
      || !Number.isFinite(now)
      || now - lastBattleHudRenderAt >= BATTLE_HUD_RENDER_INTERVAL_MS
      || now < lastBattleHudRenderAt
    ) {
      renderBattleHud(now);
    }

    if (frameSampling || typeof window.setTimeout !== "function") {
      requestAnimationFrame(updateClock);
    } else {
      // rAF sekme arka plandayken bekler; zamanlayıcı yalnız aralığı belirler.
      window.setTimeout(
        () => requestAnimationFrame(updateClock),
        BATTLE_HUD_RENDER_INTERVAL_MS - 16
      );
    }
  }

  // Savaş saati, HUD, raf ve tahta denetimi; süresi dolan efektleri de süpürür.
  // Saat her zaman sunucu anlık görüntüsünü izler; sonuçtan sonra son değer
  // korunarak dondurulur.
  function renderBattleHud(now=performance.now()) {
    lastBattleHudRenderAt = Number.isFinite(now) ? now : 0;
    runBattleSweep();
    const elapsedMs = activePlayMode === "idle" ? 0 : client.elapsedMs;
    const seconds = elapsedMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds - minutes * 60;
    const clockText =
      `${String(minutes).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
    if (clockText !== renderedClockText) {
      renderedClockText = clockText;
      timeEl.textContent = clockText;
    }
    const overtime =
      elapsedMs >= 180000
      && (localServerAuthoritative || activePlayMode === "online");
    if (overtime !== renderedClockOvertime) {
      renderedClockOvertime = overtime;
      timeEl.classList.toggle("is-overtime", overtime);
    }

    renderLockState();
    renderCapacity();
    if (
      activePlayMode
      === "local"
      && !localBattleFinished
    ) {
      renderEnemyBoard();
      publishBattleUxMetrics();
    }

    renderCredits();
    renderPlayerCoreSummary();
    renderShelf();
    renderBoard();
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

  for (const button of document.querySelectorAll("[data-ai-archetype]")) {
    button.addEventListener("click",() => {
      setSelectedAiArchetype(button.dataset.aiArchetype);
      telemetryDispatcher.track("ai_archetype_selected",{
        ai_archetype:selectedAiArchetype,
      });
    });
  }
  renderAiArchetypePicker();

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

  const settingsTabs = [...document.querySelectorAll("[data-settings-tab]")];
  function selectSettingsCategory(tab, focus = false) {
    for (const candidate of settingsTabs) {
      const active = candidate === tab;
      candidate.setAttribute("aria-selected", String(active));
      candidate.tabIndex = active ? 0 : -1;
    }
    for (const panel of document.querySelectorAll("[data-settings-panel]")) {
      panel.hidden = panel.dataset.settingsPanel !== tab.dataset.settingsTab;
    }
    if (focus) tab.focus();
    const settingsPanel = document.getElementById("settings-summary-panel");
    if (settingsPanel) settingsPanel.scrollTop = 0;
  }
  settingsTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectSettingsCategory(tab));
    tab.addEventListener("keydown", event => {
      const offset = {ArrowRight:1, ArrowLeft:-1}[event.key];
      const target = event.key === "Home" ? 0 : event.key === "End" ? settingsTabs.length - 1
        : offset ? (index + offset + settingsTabs.length) % settingsTabs.length : null;
      if (target === null) return;
      event.preventDefault();
      selectSettingsCategory(settingsTabs[target], true);
    });
  });

  const dailyMissionList = document.getElementById("daily-mission-list");
  dailyMissionList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mission-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("missions", button.dataset.missionClaim, button);
  });
  // Açık günlük emir ekranında yenilenme sayacı dakikada bir güncellenir.
  window.setInterval(() => {
    if (document.body.dataset.appScreen === "daily-missions") updateDailyMissionReset();
  }, 30000);

  const monthlyLoginTrack = document.getElementById("monthly-login-track");
  monthlyLoginTrack?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-login-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("login", button.dataset.loginClaim, button);
  });

  const seasonRewardTrack = document.getElementById("season-reward-track");
  seasonRewardTrack?.addEventListener("click", (event) => {
    const premiumButton = event.target.closest("[data-premium-tier-claim]");
    if (premiumButton && !premiumButton.disabled) {
      claimEngagementReward("premium-tiers", premiumButton.dataset.premiumTierClaim, premiumButton);
      return;
    }
    const button = event.target.closest("[data-tier-claim]");
    if (!button || button.disabled) return;
    claimEngagementReward("tiers", button.dataset.tierClaim, button);
  });

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

  document.getElementById("ad-privacy-options")?.addEventListener("click", async () => {
    const status = document.getElementById("ad-privacy-status");
    try {
      const pending = nativeStore?.showAdsPrivacyOptions({ storeState });
      renderAdsPrivacyOptions();
      const shown = await pending;
      if (status) status.textContent = shown ? "Reklam gizlilik tercihlerin güncellendi." : "";
    } catch (_error) {
      if (status) status.textContent = "Reklam gizlilik tercihleri açılamadı. Daha sonra yeniden deneyebilirsin.";
    } finally { renderAdsPrivacyOptions(); }
  });

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

  // Savaş perspektifi cihazda saklanan görsel bir tercihtir.
  const BATTLE_PERSPECTIVE_STORAGE_KEY = "gridshard.battle-perspective";
  function readBattlePerspectivePreference() {
    try {
      return window.localStorage?.getItem(BATTLE_PERSPECTIVE_STORAGE_KEY) !== "off";
    } catch (_) {
      return true;
    }
  }
  // Eğim, grafik kademesiyle birlikte uygulanır (Düşük kademede kapalıdır).
  function applyBattlePerspectivePreference(enabled) {
    document.body.dataset.battlePerspective =
      enabled && battleGraphicsQuality() !== "dusuk" ? "on" : "off";
  }
  const settingsBattlePerspectiveEl = document.getElementById("settings-battle-perspective");
  applyGraphicsQuality();
  if (settingsBattlePerspectiveEl) {
    settingsBattlePerspectiveEl.checked = readBattlePerspectivePreference();
    settingsBattlePerspectiveEl.addEventListener("change", () => {
      const enabled = settingsBattlePerspectiveEl.checked;
      try {
        window.localStorage?.setItem(BATTLE_PERSPECTIVE_STORAGE_KEY, enabled ? "on" : "off");
      } catch (_) {
        // Depolama kapalıysa tercih yalnız bu oturumda geçerli olur.
      }
      applyBattlePerspectivePreference(enabled);
    });
  }

  // Grafik seçimi: "Otomatik" cihaza özeldir, diğerleri hesap ayarıdır.
  document.getElementById("settings-graphics")?.addEventListener("change", (event) => {
    writeDevicePreference(
      GRAPHICS_MODE_STORAGE_KEY,
      event.target.value === "otomatik" ? "auto" : "manual"
    );
    if (GRAPHICS_TIERS.includes(event.target.value) && settingsState.settings) {
      // Seçim sunucuya kaydedilene kadar da hemen uygulanır.
      settingsState.patch({ graphics_quality:event.target.value });
    }
    applyGraphicsQuality();
  });

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
    // Sunum sıfırlaması ilerleme sonucunu da temizlediği için önce alınır.
    const progression = progressionState.viewModel();
    postMatchSync.clear();
    pvpConnection.disconnect();
    pvpState.reset();
    onlinePlay.reset();
    resetBattleResultPresentation();
    returnToMainMenu();
    renderPlayModeUi();
    void loadSocialView();
    void loadTeamView();
    void presentArenaRewardEarnedInMatch(progression);
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
        renderHomeHubWhenVisible();
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

  function renderOperatorTitles() {
    const list = document.getElementById("operator-titles-list");
    if (!list) return;
    const profile = profileState.viewModel();
    const progression = profile?.operatorTitleProgression || {};
    const stages = Array.isArray(progression.stages) ? progression.stages : [];
    const trophies = Math.max(0, Number(progression.trophies ?? profile?.rating ?? 0));
    const wins = Math.max(0, Number(progression.wins ?? statisticsState.viewModel()?.wins ?? 0));
    const reached = (stage) => stage.reached ?? (trophies >= Number(stage.required_trophies || 0) && wins >= Number(stage.required_wins || 0));
    const currentIndex = stages.reduce((found, stage, index) => reached(stage) ? index : found, 0);
    const next = stages[currentIndex + 1];
    const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
    setText("operator-titles-title", localizedUiText(stages[currentIndex]?.title_tr || "Devre Çırağı"));
    setText("operator-titles-summary", localizedMessage("title.summary", {trophies: localizedNumber(trophies), wins: localizedNumber(wins)}));
    const nextSection = document.getElementById("operator-titles-next");
    if (nextSection) nextSection.hidden = !next;
    setText("operator-titles-complete", next ? "" : localizedUiText("En yüksek unvana ulaştın."));
    if (next) {
      setText("operator-titles-next-title", localizedMessage("title.next", {title: localizedUiText(next.title_tr)}));
      for (const [kind, value, required] of [["trophy", trophies, next.required_trophies], ["win", wins, next.required_wins]]) {
        const bar = document.getElementById(`operator-titles-${kind}-progress`);
        if (bar) { bar.max = Math.max(1, Number(required)); bar.value = Math.min(value, Number(required)); }
        setText(`operator-titles-${kind}-copy`, `${localizedNumber(Math.min(value, Number(required)))} / ${localizedNumber(required)}`);
      }
    }
    list.replaceChildren(...stages.map((stage, index) => {
      const item = document.createElement("li");
      item.className = "operator-title-stage";
      item.dataset.state = index === currentIndex ? "current" : (reached(stage) ? "reached" : "locked");
      const copy = document.createElement("div");
      copy.className = "operator-title-copy";
      const name = document.createElement("strong");
      name.textContent = localizedUiText(stage.title_tr);
      const requirement = document.createElement("small");
      requirement.textContent = index === 0 ? localizedUiText("Başlangıç unvanı") : localizedMessage("title.requirement", {trophies: localizedNumber(stage.required_trophies), wins: localizedNumber(stage.required_wins)});
      copy.append(name, requirement);
      const reward = Math.max(0, Number(stage.reward_circuit_credits || 0));
      if (reward) {
        const rewardText = document.createElement("small");
        rewardText.className = "operator-title-reward";
        rewardText.textContent = localizedMessage("title.reward", {credits: localizedNumber(reward)});
        copy.append(rewardText);
      }
      let action;
      if (stage.claimable) {
        action = document.createElement("button");
        action.type = "button";
        action.className = "operator-title-claim";
        action.dataset.operatorTitleClaim = stage.id;
        action.textContent = localizedUiText("ÖDÜLÜ AL");
      } else {
        action = document.createElement("span");
        action.className = "operator-title-badge";
        action.textContent = localizedUiText(stage.claimed ? "ALINDI" : (index === currentIndex ? "ŞU ANKİ" : (reached(stage) ? "AÇILDI" : "KİLİTLİ")));
      }
      item.append(copy, action);
      return item;
    }));
  }

  const openOperatorTitlesDialog = () => {
    renderOperatorTitles();
    const dialog = document.getElementById("operator-titles-dialog");
    const status = document.getElementById("operator-titles-status");
    if (status) status.textContent = "";
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  };
  document.getElementById("lobby-player-details")?.addEventListener("click", openOperatorTitlesDialog);
  document.getElementById("profile-hero-details")?.addEventListener("click", openOperatorTitlesDialog);
  document.getElementById("operator-titles-close")?.addEventListener("click", () => {
    const dialog = document.getElementById("operator-titles-dialog");
    if (dialog?.close) dialog.close();
    else dialog?.removeAttribute("open");
  });
  document.getElementById("operator-titles-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-operator-title-claim]");
    if (!button || button.disabled) return;
    const status = document.getElementById("operator-titles-status");
    button.disabled = true;
    try {
      const payload = await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/operator-titles/${encodeURIComponent(button.dataset.operatorTitleClaim)}/claim`);
      const credits = Number(payload?.receipt?.rewards?.circuit_credits || 0);
      if (status) status.textContent = credits ? localizedMessage("title.reward_claimed", {credits: localizedNumber(credits)}) : localizedUiText("Bu ödül zaten alınmış.");
    } catch (error) {
      if (status) status.textContent = localizedUiText(error?.message || "Ödül alınamadı.");
    } finally {
      renderOperatorTitles();
    }
  });

  const arenaDetailDialog = document.getElementById("arena-detail-dialog");
  // focusNodeId verilirse yol o ödül durağına kaydırılır ve durak vurgulanır;
  // verilmezse oyuncunun bulunduğu aşama ortalanır.
  function openArenaDetail({ focusNodeId = "" } = {}) {
    highlightedArenaNodeId = focusNodeId;
    renderHomeArena();
    const status = document.getElementById("arena-reward-status");
    if (status) status.textContent = "";
    if (arenaDetailDialog?.showModal && !arenaDetailDialog.open) arenaDetailDialog.showModal();
    else arenaDetailDialog?.setAttribute("open", "");
    if (arenaDetailDialog) arenaDetailDialog.scrollTop = 0;
    const path = document.getElementById("arena-path");
    if (!path) return;
    const node = focusNodeId
      ? [...path.querySelectorAll("[data-arena-node-id]")]
        .find((item) => item.dataset.arenaNodeId === focusNodeId)
      : null;
    if (node) {
      // getBoundingClientRect düzeni hemen hesaplar; kare beklemeye gerek yok.
      const pathBox = path.getBoundingClientRect();
      const nodeBox = node.getBoundingClientRect();
      path.scrollTop = Math.max(0, path.scrollTop + nodeBox.top - pathBox.top
        - ((path.clientHeight - nodeBox.height) / 2));
      node.focus({ preventScroll:true });
      return;
    }
    requestAnimationFrame(() => {
      const current = path.querySelector(".arena-path-stage.is-current");
      if (!current) return;
      path.scrollTop = Math.max(0, current.offsetHeight >= path.clientHeight
        ? current.offsetTop
        : current.offsetTop - ((path.clientHeight - current.offsetHeight) / 2));
    });
  }
  arenaDetailDialog?.addEventListener("close", () => {
    highlightedArenaNodeId = "";
  });

  // PvP'de kazanılan kupalar Devre Yolu'nda yeni bir ödül durağı açtıysa ana
  // ekrana dönüşte önce o durak gösterilir. Bilgi notu yazılmaz; kazanılan
  // durak kendi parıltısıyla öne çıkar (canon.css .is-new-reward).
  async function presentArenaRewardEarnedInMatch(progression) {
    const before = Number(progression?.ratingBefore);
    const after = Number(progression?.ratingAfter);
    if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) return false;
    await loadMetaProgression();
    if (document.body.dataset.appScreen !== "menu" || arenaDetailDialog?.open) return false;
    const earned = [
      ...(metaProgressionState?.arena_path || []),
      ...(metaProgressionState?.rank_stages || []),
    ]
      .flatMap((stage) => stage.nodes || [])
      .filter((node) => (
        node.claimable === true
        && node.claimed !== true
        && Object.keys(node.rewards || {}).length > 0
        && Number(node.trophies) > before
        && Number(node.trophies) <= after
      ))
      .sort((left, right) => Number(left.trophies) - Number(right.trophies));
    if (!earned.length) return false;
    openArenaDetail({ focusNodeId:String(earned[0].id) });
    return true;
  }

  document.getElementById("home-arena-card")?.addEventListener("click", () => openArenaDetail());
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
    if (!activePublicProfileId || !window.confirm(localizedUiText("Bu oyuncuyu engellemek ve arkadaşlıktan çıkarmak istiyor musun?"))) return;
    const status = document.getElementById("public-profile-status");
    try {
      socialState = (await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/block`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,target_player_id:activePublicProfileId,blocked:true,request_id:socialRequestId("player-block")})},
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
    const detail = window.prompt(localizedUiText("Şikâyet nedenini kısaca yaz:"), localizedUiText("uygunsuz davranış"));
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
  document.getElementById("season-premium-buy")?.addEventListener("click", () => {
    void purchasePaidProduct("season_pass_premium", { status:document.getElementById("season-action-status") });
  });
  document.getElementById("post-match-premium-buy")?.addEventListener("click", () => {
    void purchasePaidProduct("battle_rewards_premium", { status:document.getElementById("post-match-store-status") });
  });
  document.getElementById("post-match-ad-button")?.addEventListener("click", () => void watchRewardAd());
  // Deneme reklamı süresi dolmadan kapatılamaz; ödül yalnız izleme bitince istenir.
  document.getElementById("reward-ad-dialog")?.addEventListener("cancel", (event) => event.preventDefault());
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

  /* build:development-only */
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
        audio:{
          state:audioStateOwner?.currentState || null,
          terminalState:audioStateOwner?.terminalState || null,
          revision:audioStateOwner?.revision || 0,
        },
      }),
      emitFloatingFeedback:(moduleId, text, variant="neutral") =>
        emitFloatingBattleFeedback(moduleId, text, variant),
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
  /* /build:development-only */

  // İlk oyun deneyimi (Ekim 2026). Hiç maç bitirmemiş oyuncu, atlama seçeneği
  // olmadan ve hareketli okla adım adım yönlendirilir: mağazada hediye sandığı,
  // kartlarda Lazer yükseltme, takım ve etkinlik ekranları, haftalık turnuva
  // kaydı ve ilk savaş. Akış ile katman tutorial/onboarding.js içindedir;
  // burada adımlar ve uygulama bağlamı tanımlanır.
  //
  // İlk savaşı sunucu sahne sahne yönetir (server/app/game/tutorial.py):
  // oyuncu okurken savaş durur; sahne anlık görüntüdeki `tutorial` alanıyla
  // gelir, "İLERİ" sunucuya `tutorial_ack` komutuyla bildirilir. Sunucu savaşı
  // yönetmiyorsa (değiştirilmiş deste, Ayarlar'dan tekrar) savaşı durdurmayan
  // ipucu kartları gösterilir.
  const TUTORIAL_MATCH_FLOW_STATUSES = new Set([
    "matchmaking",
    "matched",
    "connecting",
    "readying",
    "battle",
  ]);
  const ONBOARDING_HUB_SCREENS = new Set(["menu", "shop", "modules", "team", "events"]);
  const ONBOARDING_COMPLETE_KEY = "gridshard.tutorial.v1";
  const ONBOARDING_PROGRESS_KEY = "gridshard.onboarding.step.v1";
  // Tarayıcı testleri (?e2e=1) taze hesaplarla menüleri dolaşır; eğitimi yalnız
  // açıkça isteyen (&onboarding=1) görür.
  const ONBOARDING_AUTOMATION_OPT_OUT = (() => {
    try {
      const query = new URLSearchParams(globalThis.location?.search || "");
      return query.get("e2e") === "1" && query.get("onboarding") !== "1";
    } catch (_) {
      return false;
    }
  })();

  // Yönetmensiz savaşta gösterilen, savaşı durdurmayan ipucu kartları.
  const FIRST_MATCH_TUTORIAL_STEPS = [
    {
      id:"arena",
      title:"İki devre, tek arena",
      body:"Üstteki devre rakibin, alttaki senin. Rakibin Çekirdeğini yok eden kazanır.",
      target:"#enemy-board",
      when:(context) => context.battle,
    },
    {
      id:"current",
      title:"Akım",
      body:"Kart oynamak Akım harcar; Akım zamanla dolar. Kartın altındaki sayı bedelidir.",
      target:"#shelf-credit-indicator",
      when:(context) => context.battle,
    },
    {
      id:"place",
      title:"Dokun, yerleşsin",
      body:"Parlayan bir karta dokun. Kart devrende uygun boş hücreye kendiliğinden yerleşir; hücre seçmen gerekmez.",
      hint:"Akımın yetmeyen kart sönük görünür; biraz bekle.",
      target:"#module-shelf",
      when:(context) => context.battle,
      until:(context, start) => context.boardCards > start.boardCards,
    },
    {
      id:"auto",
      title:"Modüller kendi savaşır",
      body:"Yerleşen modüller kendiliğinden saldırır, savunur ya da enerji üretir. Saldırı, savunma ve desteği dengeli kur.",
      target:"#board",
      when:(context) => context.battle,
    },
    {
      id:"core-power",
      title:"Çekirdek Gücü",
      body:"Düğme dolunca dokun: Çekirdeğinin özel gücü savaşın gidişini değiştirir.",
      target:"#core-power-button",
      when:(context) => context.battle,
    },
    {
      id:"finish",
      title:"Hazırsın",
      body:"3. dakikadan sonra Devre Gerilimi başlar ve saldırılar hızlanır. İyi savaşlar!",
      target:null,
      when:(context) => context.battle,
    },
  ];

  tutorialController = new GridshardTutorialController({
    root: document.getElementById("tutorial-overlay"),
    // Tamamlanma izini akış tutar; ipucu kartları iz bırakmaz.
    storage: { getItem:() => null, setItem() {}, removeItem() {} },
    storageKey: "gridshard.tutorial.hints",
    steps: FIRST_MATCH_TUTORIAL_STEPS,
  });

  function onboardingVisible(element) {
    const rect = element?.getBoundingClientRect?.();
    return rect && rect.width > 0 && rect.height > 0 ? element : null;
  }

  function onboardingDock(screen) {
    return onboardingVisible(
      document.querySelector(`#app-bottom-dock [data-open-screen="${screen}"]`)
    );
  }

  function onboardingShelfCard(definitionId) {
    return [...document.querySelectorAll("#module-shelf .deck-module-card")].find(
      (card) => clientDefinitionId(card.dataset.moduleId || "") === definitionId
    ) || null;
  }

  function onboardingBoardCard(definitionId) {
    if (!definitionId) return null;
    const cards = [...document.querySelectorAll("#board .module-card")];
    for (const module of client.modules.values()) {
      if (module.status !== "active" || Number(module.hp || 0) <= 0) continue;
      if ((module.definitionId || clientDefinitionId(module.instanceId)) !== definitionId) continue;
      const card = cards.find((item) => item.dataset.moduleId === module.instanceId);
      if (card) return card;
    }
    return null;
  }

  function closeOnboardingModuleDetail() {
    const dialog = document.getElementById("module-detail-dialog");
    if (dialog?.open) dialog.close();
    document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
  }

  function openOnboardingLaserDetail() {
    selectedCollectionModuleId = "laser";
    openModuleDetail();
  }

  // Yönetmenli savaşın sahne metinleri. Sahne kimlikleri sunucudaki
  // tutorial.STAGES ile aynıdır; hedefi sunucunun `deploy` ve `focus` alanları
  // ya da buradaki `target` belirler.
  const DIRECTED_BATTLE_STAGES = Object.freeze({
    arena:{
      title:"Savaş alanı",
      body:"Üstteki devre rakibin, alttaki senin. Ortadaki elmas Çekirdek: rakibin Çekirdeğini yok eden kazanır.",
      target:() => document.getElementById("enemy-board"),
    },
    current:{
      title:"Akım",
      body:"Kart oynamak Akım harcar; Akım zamanla dolar. Kartın altındaki sayı o kartın bedelidir.",
      target:() => document.getElementById("shelf-credit-indicator"),
    },
    deploy_laser:{
      title:"İlk modülün",
      body:"Lazer kartına dokun. Kart devrende boş bir hücreye kendiliğinden yerleşir.",
    },
    watch_laser:{
      title:"Lazer ateş ediyor",
      body:"Modüller kendiliğinden savaşır. Lazerin rakibin Çekirdeğine ateş ediyor.",
    },
    type_attack:{
      title:"Saldırı modülleri",
      body:"Lazer bir SALDIRI modülüdür: rakibin modüllerine ve Çekirdeğine hasar verir. Maçı saldırı modülleri kazandırır.",
      target:() => onboardingShelfCard("laser"),
    },
    type_defense:{
      title:"Savunma modülleri",
      body:"Kalkan bir SAVUNMA modülüdür. Rakip önce savunma modüllerine ateş eder; Kalkan hasarı emer, diğer modüllerin ayakta kalır.",
      target:() => onboardingShelfCard("shield"),
    },
    type_support:{
      title:"Destek modülleri",
      body:"Onarım hasarlı modülleri onarır, Soğutucu ısınan modülleri soğutur, Güçlendirici saldırı gücünü artırır. Bunlar DESTEK modülleridir.",
      target:() => document.getElementById("module-shelf"),
      emphasize:() => ["repair", "cooler", "amplifier"].map(onboardingShelfCard),
    },
    type_system:{
      title:"Sistem modülleri",
      body:"Batarya bir SİSTEM modülüdür: devrene ek enerji sağlar. Devren büyüdükçe enerji ihtiyacın artar.",
      target:() => onboardingShelfCard("battery"),
    },
    limits:{
      title:"Devre sınırları",
      body:[
        "Devrende Çekirdek dışında 14 hücre var.",
        "Savunma, Destek ve Sistem modüllerinden aynı anda en çok 3'er tane, aynı karttan en çok 2 tane kurabilirsin.",
        "Saldırı dışı modüllerin sayısı, saldırı modüllerini en fazla 2 geçebilir.",
      ],
      target:() => document.getElementById("board"),
    },
    hp_bar:{
      title:"Can çubuğu",
      body:"Her modülün altındaki yeşil çubuk CAN'ıdır. Hasar aldıkça kısalır; bitince modül yok olur.",
    },
    heat_bar:{
      title:"Isı çubuğu",
      body:"Üstteki çubuk ISI'dır. Modül çalıştıkça ısınır; ısı %100'e ulaşınca modül susar ve soğuyana kadar çalışmaz. Lazerin aşırı ısındı: ateş edemiyor!",
    },
    deploy_cooler:{
      title:"Soğutucu",
      body:"Soğutucu kartına dokun; ısınan modüllerini soğutur.",
    },
    watch_cooler:{
      title:"Lazer soğuyor",
      body:"Soğutucu Lazeri soğutuyor; birazdan yeniden ateş edecek.",
    },
    enemy_attack:{
      title:"Rakip saldırıyor!",
      body:"Rakip bir Lazer kurdu ve modüllerine ateş ediyor.",
    },
    deploy_repair:{
      title:"Onarım",
      body:"Soğutucunun canı azaldı. Onarım kartına dokun; hasarlı modüllerini onarır.",
    },
    watch_repair:{
      title:"Onarılıyor",
      body:"Onarım modülü, canı en az olan modülünü onarıyor.",
    },
    energy_low:{
      title:"Enerji azaldı",
      body:"Devren büyüdü; modüllerin enerji bekliyor.",
    },
    deploy_battery:{
      title:"Batarya",
      body:"Modüller enerjiyle çalışır; ϟ işareti enerji bekleyen modülü gösterir. Batarya kartına dokun; devrene enerji sağlar.",
    },
    watch_battery:{
      title:"Enerji geldi",
      body:"Batarya devreni besliyor; modüllerin yeniden çalışıyor.",
    },
    enemy_boost:{
      title:"Rakip güçlendi",
      body:"Rakip devresine Kalkan ve Güçlendirici ekledi: artık daha dayanıklı ve daha sert vuruyor. Sen de devreni güçlendir.",
      target:() => document.getElementById("enemy-board"),
    },
    deploy_laser_2:{
      title:"Devre dengesi",
      body:"Güçlendirici için önce saldırı gücün artmalı: saldırı dışı modüller, saldırı modüllerini en fazla 2 geçebilir. İkinci bir Lazer koy.",
    },
    deploy_amplifier:{
      title:"Güçlendirici",
      body:"Güçlendirici kartına dokun; Lazerlerinin hasarını artırır.",
    },
    finale:{
      title:"Sıra sende!",
      body:"Akımın doldukça kart oyna ve rakibin Çekirdeğini yok et!",
    },
  });
  // Serbest oyunda kart oyuncunun önünü kapatmaz; bir süre sonra kaybolur.
  const DIRECTED_FINALE_BANNER_MS = 9000;
  const DIRECTED_TAP_DEBOUNCE_MS = 1500;
  let directedStageSeen = { stage:"", at:0 };
  let directedTapAt = -Infinity;

  function sendTutorialAcknowledgement(stageId) {
    sendPvPCommand({ kind:"tutorial_ack", payload:{ stage:stageId } });
  }

  function directedBattleView(stage) {
    const copy = DIRECTED_BATTLE_STAGES[stage.stage];
    if (!copy) return null;
    const now = performance.now();
    if (directedStageSeen.stage !== stage.stage) directedStageSeen = { stage:stage.stage, at:now };
    const finale = stage.stage === "finale";
    if (finale && now - directedStageSeen.at > DIRECTED_FINALE_BANNER_MS) return null;
    const deploy = stage.kind === "deploy";
    return {
      key:stage.stage,
      part:Number(stage.index || 0) / Math.max(1, Number(stage.total || 1)),
      tone:"battle",
      place:"top",
      title:copy.title,
      body:copy.body,
      target:deploy
        ? onboardingShelfCard(stage.deploy)
        : copy.target ? copy.target() : onboardingBoardCard(stage.focus),
      emphasize:copy.emphasize ? copy.emphasize() : [],
      mode:stage.kind === "ack" ? "next" : deploy ? "tap" : "wait",
      shade:stage.kind === "watch" ? "none" : "soft",
      blocking:!finale,
      stuck:"release",
      onNext:() => sendTutorialAcknowledgement(stage.stage),
      // Sunucu sahneyi değiştirene kadar ikinci dokunuş ikinci kart koymasın.
      onTargetTap:() => {
        const tappedAt = performance.now();
        if (tappedAt - directedTapAt < DIRECTED_TAP_DEBOUNCE_MS) return;
        const card = onboardingShelfCard(stage.deploy);
        if (!card || card.disabled) return;
        directedTapAt = tappedAt;
        card.click();
      },
    };
  }

  const ONBOARDING_START_BATTLE = Object.freeze({
    key:"start",
    target:"#home-battle-button",
    mode:"tap",
    // Düğme kapalıysa (ör. bağlantı yok) adım geçilmez; oyuncu serbest kalır.
    stuck:"release",
    title:"İlk savaşın",
    body:"Sıra savaşta. SAVAŞ'a dokun; ilk savaşında sana adım adım eşlik edeceğim.",
  });

  const ONBOARDING_STEPS = [
    {
      id:"welcome",
      when:(c) => c.screen === "menu" && !c.inMatchFlow,
      title:"GRIDSHARD'a hoş geldin!",
      body:"Birkaç dakikada ekranları tanıyacak, ilk ödülünü alacak ve ilk savaşını kazanacaksın.",
      nextLabel:"BAŞLA",
    },
    {
      id:"open-shop",
      when:(c) => c.hub,
      target:() => onboardingDock("shop"),
      done:(c) => c.screen === "shop",
      onNext:() => openAppScreen("shop"),
      title:"Mağaza",
      body:"Önce hediyeni alalım. Alttaki MAĞAZA sekmesine dokun.",
    },
    {
      id:"gift-chest",
      when:(c) => c.screen === "shop" && c.metaReady,
      skip:(c) => c.metaReady && !c.giftAvailable && !c.chestDialogOpen,
      target:"#gift-chest-list .gift-chest-action",
      done:(c) => c.chestDialogOpen,
      title:"Hediye Sandık",
      body:"Her 8 saatte bir bedava sandık açabilirsin. HEDİYE SANDIK AÇ'a dokun.",
    },
    {
      id:"chest-reward",
      when:(c) => c.chestDialogOpen,
      target:"#chest-reveal-close",
      // Kart üstte durur ve karartma hafiftir; sandıktan çıkanlar okunur.
      place:"top",
      shade:"soft",
      done:(c) => !c.chestDialogOpen,
      title:"İlk ödülün!",
      body:"Sandıklardan Devre Kredisi ve modül parçaları çıkar; bunlarla kartlarını yükseltirsin. DEVAM'a dokun.",
    },
    {
      id:"currencies",
      when:(c) => c.screen === "shop",
      target:"#app-resource-bar",
      title:"Akı ve Devre Kredisi",
      body:"Üstte iki paran var. Devre Kredisiyle kart yükseltir, turnuvalara katılırsın; Akı daha değerlidir. Yanlarındaki + seni mağazaya getirir.",
    },
    {
      id:"open-cards",
      when:(c) => c.hub,
      target:() => onboardingDock("modules"),
      done:(c) => c.screen === "modules",
      onNext:() => openAppScreen("modules"),
      title:"Kartlar",
      body:"Şimdi kartlarına bakalım. KARTLAR sekmesine dokun.",
    },
    {
      id:"deck",
      when:(c) => c.screen === "modules",
      target:"#module-deck-strip",
      title:"Savaş desten",
      body:"Savaşa bu altı kartla girersin. Aşağıdaki koleksiyondan kart seçerek desteni değiştirebilirsin.",
    },
    {
      id:"select-laser",
      when:(c) => c.screen === "modules" && c.metaReady,
      target:'#module-collection-grid .collection-module-tile[data-module-definition-id="laser"]',
      done:(c) => c.laserQuickOpen || c.moduleDetailOpen,
      onNext:openOnboardingLaserDetail,
      title:"Lazer",
      body:"Koleksiyondaki Lazer kartına dokun.",
    },
    {
      id:"laser-info",
      when:(c) => c.screen === "modules",
      target:"#module-quick-info",
      done:(c) => c.moduleDetailOpen,
      onNext:openOnboardingLaserDetail,
      title:"Kart bilgisi",
      body:"Bilgi'ye dokun; kartın gücünü, seviyesini ve ne işe yaradığını gör.",
    },
    {
      id:"laser-upgrade",
      when:(c) => c.moduleDetailOpen,
      // Uygulama bu adımda yeniden açıldıysa pencere kapalıdır; adım geçilir.
      skip:(c, start) => !start.moduleDetailOpen,
      target:"#module-detail-upgrade",
      mode:(c, start) => (start.laserUpgradable ? "tap" : "next"),
      done:(c, start) => start.laserUpgradable && c.laserLevel > start.laserLevel,
      title:"Yükselt",
      body:(c, start) => (start.laserUpgradable
        ? "Hesabına 2 Lazer parçası hediye edildi. Parça ve Devre Kredisi yetince kart seviye atlar. YÜKSELT'e dokun."
        : "Kart yükseltmek için modül parçası ve Devre Kredisi gerekir. Parçalar sandıklardan çıkar; yetince bu düğme açılır."),
    },
    {
      id:"laser-upgraded",
      when:(c) => c.moduleDetailOpen,
      skip:(c, start) => !start.moduleDetailOpen || c.laserLevel < 1,
      target:"#module-detail-level",
      title:"Lazer güçlendi!",
      body:"Seviye atlayan kartın hasarı ve canı artar. Parça topladıkça diğer kartlarını da yükselt.",
    },
    {
      id:"open-team",
      when:(c) => c.hub,
      onEnter:closeOnboardingModuleDetail,
      target:() => onboardingDock("team"),
      done:(c) => c.screen === "team",
      onNext:() => openAppScreen("team"),
      title:"Takım",
      body:"Oyuncular takım kurar, birbirine modül parçası bağışlar ve takım turnuvasına katılır. TAKIM sekmesine dokun.",
    },
    {
      id:"team",
      when:(c) => c.screen === "team",
      target:() => onboardingVisible(document.querySelector(".team-lobby-tabs")),
      title:"Takımlar",
      body:"Burada açık takımları görürsün: BAŞVUR ile birine katılır ya da TAKIM OLUŞTUR ile kendi takımını kurarsın. Buna sonra dönersin.",
    },
    {
      id:"open-events",
      when:(c) => c.hub,
      target:() => onboardingDock("events"),
      done:(c) => c.screen === "events" || c.screen === "weekly-event",
      onNext:() => openAppScreen("events"),
      title:"Etkinlikler",
      body:"Sırada turnuvalar var. ETKİNLİK sekmesine dokun.",
    },
    {
      id:"open-weekly",
      when:(c) => c.screen === "events",
      target:'.event-directory [data-open-screen="weekly-event"]',
      done:(c) => c.screen === "weekly-event",
      onNext:() => openAppScreen("weekly-event"),
      title:"Haftalık Devre Turnuvası",
      body:"Her hafta yenilenen bireysel turnuva. Üstüne dokun.",
    },
    {
      id:"weekly-register",
      when:(c) => c.screen === "weekly-event" && c.eventsReady,
      target:"#weekly-tournament-register",
      mode:(c, start) => (start.weeklyRegistered || !c.weeklyAffordable ? "next" : "tap"),
      done:(c, start) => !start.weeklyRegistered && c.weeklyRegistered,
      title:"Turnuvaya katıl",
      body:(c, start) => (start.weeklyRegistered
        ? "Bu haftanın turnuvasına kayıtlısın. Arena savaşlarında kazandığın kupalar haftalık sıralamana eklenir."
        : !c.weeklyAffordable
          ? "Katılım 100 Devre Kredisidir; şu an kredin yetmiyor. Kredin olunca buradan katılabilirsin."
          : "Katılım 100 Devre Kredisidir. Katıldıktan sonra Arena savaşlarında kazandığın kupalar haftalık sıralamana eklenir; hafta sonunda ödül sandığı kazanırsın. TURNUVAYA KATIL'a dokun."),
    },
    {
      id:"weekly-joined",
      when:(c) => c.screen === "weekly-event",
      skip:(c) => !c.weeklyRegistered,
      target:"#weekly-event-summary",
      title:"Kaydın tamam",
      body:"Sıran ve kazandığın kupalar burada görünür. Her zafer seni yukarı taşır.",
    },
    {
      id:"leave-weekly",
      when:(c) => c.screen === "weekly-event",
      skip:(c) => c.screen !== "weekly-event" || Boolean(onboardingDock("menu")),
      target:'#weekly-event-screen [data-open-screen="events"]',
      done:(c) => c.screen !== "weekly-event",
      onNext:() => openAppScreen("events"),
      title:"Geri dön",
      body:"Sol üstteki okla etkinlik listesine dön.",
    },
    {
      id:"open-home",
      when:(c) => c.hub || c.screen === "weekly-event",
      target:() => onboardingDock("menu"),
      done:(c) => c.screen === "menu",
      onNext:() => openAppScreen("menu"),
      title:"Ev",
      body:"Artık hazırsın. EV sekmesine dön.",
    },
    {
      id:"home",
      when:(c) => c.screen === "menu" && !c.inMatchFlow,
      target:"#app-progress-ribbon",
      title:"Profilin",
      body:"Adın, unvanın ve kupaların burada. Sağdaki mesaj kutusuna ödüller ve duyurular gelir.",
    },
    {
      id:"battle",
      // İlerleme çubuğunda savaş, menü turunun yarısı kadar yer tutar.
      weight:12,
      done:(c) => c.finished,
      present:(c) => {
        // Eşleştirme iptal edildiyse ok yeniden SAVAŞ düğmesini gösterir.
        if (!c.inMatchFlow) return c.screen === "menu" ? ONBOARDING_START_BATTLE : null;
        if (!c.snapshotReady || !c.directed) return null;
        return directedBattleView(c.directed);
      },
    },
    {
      id:"victory",
      // Maç ekranı kapandıysa (ya da savaş kaybedildiyse) kutlama gösterilmez.
      skip:(c) => !c.finished || c.screen !== "play" || !c.won,
      // Sonuç paneli (Çekirdek patlamasından sonra) görününce kutlanır.
      present:(c) => (!c.postMatchVisible ? null : c.postMatchStage === "rewards"
        ? {
            key:"rewards",
            target:"#post-match-continue",
            mode:"tap",
            place:"top",
            shade:"soft",
            title:"Savaş ödülleri",
            body:"Her zaferde kupa, Devre Kredisi ve deneyim kazanırsın. Kupa topladıkça yeni arenalar ve kartlar açılır. DEVAM'a dokun.",
          }
        : {
            key:"damage",
            target:"#post-match-continue",
            mode:"tap",
            place:"top",
            shade:"soft",
            title:"Tebrikler, kazandın!",
            body:"İlk savaşını kazandın. Bu ekranda hangi modülünün ne kadar hasar verdiğini görürsün. DEVAM'a dokun.",
          }),
    },
    {
      id:"farewell",
      when:(c) => c.screen === "menu" && !c.inMatchFlow,
      title:"Hazırsın!",
      body:"Artık oyunu tanıyorsun: sandıklarını aç, kartlarını yükselt, turnuvalarda yüksel. İyi savaşlar!",
      nextLabel:"TAMAM",
    },
  ];

  const onboardingOverlay = new GridshardGuideOverlay();
  const onboardingFlow = new GridshardOnboardingFlow({
    steps: ONBOARDING_STEPS,
    overlay: onboardingOverlay,
    completeKey: ONBOARDING_COMPLETE_KEY,
    progressKey: ONBOARDING_PROGRESS_KEY,
  });

  function onboardingContext() {
    const status = document.body.dataset.onlineStatus || "idle";
    const finished = document.body.dataset.onlineFinished === "true";
    const screen = document.body.dataset.appScreen || "menu";
    const battle = status === "battle" && !finished;
    const meta = metaProgressionState;
    const gift = (meta?.chests?.definitions || []).find(
      (definition) => definition.gift ?? definition.id === "field_3h"
    );
    const laser = (meta?.module_collection || []).find((item) => item.definition_id === "laser");
    const laserCost = laser?.next_upgrade_cost;
    const credits = Number(meta?.circuit_credits || 0);
    const snapshot = battle ? pvpState.snapshot : null;
    const result = pvpState.finalResult;
    const weeklyFee = Number(eventsState?.weekly_tournament?.entry_fee ?? 100);
    return {
      screen,
      status,
      finished,
      battle,
      hub: ONBOARDING_HUB_SCREENS.has(screen),
      inMatchFlow: TUTORIAL_MATCH_FLOW_STATUSES.has(status) && !finished,
      modals: [...document.querySelectorAll("dialog[open]")].filter(
        (dialog) => !dialog.classList.contains("guide-overlay") && dialog.matches(":modal")
      ),
      metaReady: Boolean(meta) && !meta.unavailable,
      giftAvailable: Boolean(gift)
        && gift.claim_available !== false
        && Number(gift.claim_remaining_seconds || 0) <= 0,
      chestDialogOpen: Boolean(document.getElementById("chest-reveal-dialog")?.open),
      moduleDetailOpen: Boolean(document.getElementById("module-detail-dialog")?.open),
      laserQuickOpen: selectedCollectionModuleId === "laser"
        && document.getElementById("module-quick-actions")?.hidden === false,
      laserLevel: Number(laser?.level || 0),
      laserUpgradable: Boolean(laser && laser.unlocked !== false && laserCost)
        && Number(laser.shards || 0) + Number(meta?.universal_module_shards || 0) >= Number(laserCost.shards || 0)
        && credits >= Number(laserCost.circuit_credits || 0),
      eventsReady: Boolean(eventsState?.weekly_tournament),
      weeklyRegistered: Boolean(eventsState?.viewer?.weekly_registered),
      weeklyAffordable: credits >= weeklyFee,
      snapshotReady: Boolean(snapshot?.players),
      directed: snapshot?.tutorial || null,
      postMatchStage: document.getElementById("post-match-continue")?.dataset.postMatchStage || "",
      postMatchVisible: finished
        && Boolean(onboardingVisible(document.getElementById("post-match-continue"))),
      won: Boolean(result) && result.winner_player_id === participantPlayerId,
      boardCards: battle ? document.querySelectorAll("#board .module-card").length : 0,
    };
  }

  // İlk savaş yönetmenli istenir; yalnız akış savaş adımına geldiyse.
  function onboardingWantsDirectedBattle() {
    return onboardingFlow.active && onboardingFlow.currentStep()?.id === "battle";
  }

  // Yönetmensiz ilk savaşta eski ipucu kartları gösterilir.
  function syncBattleHints(context) {
    const wanted = onboardingFlow.active
      && onboardingFlow.currentStep()?.id === "battle"
      && context.battle
      && context.snapshotReady
      && !context.directed;
    if (!wanted) {
      if (tutorialController.active) tutorialController.finish();
      return;
    }
    if (!tutorialController.active) tutorialController.start({ force: true });
    tutorialController.update(context);
  }

  let lastTutorialSyncAt = -Infinity;
  function syncFirstMatchTutorial(now, { force = false } = {}) {
    if (!force && now - lastTutorialSyncAt < 200) return;
    lastTutorialSyncAt = now;
    const context = onboardingContext();
    if (!onboardingFlow.active) {
      // Yalnız hiç maç bitirmemiş oyuncu; istatistik sunucudan gelmeden başlamaz.
      if (
        ONBOARDING_AUTOMATION_OPT_OUT
        || onboardingFlow.isCompleted()
        || startupLoading?.active
        || (startupLoading?.root && !startupLoading.root.hidden)
        || !context.hub
        || context.inMatchFlow
      ) {
        return;
      }
      const totalMatches = statisticsState.viewModel()?.totalMatches;
      if (totalMatches !== 0) {
        // Yarıda kalan akış ilk maçtan sonra sürdürülmez; izi kapatılır.
        if (totalMatches > 0 && onboardingFlow.read(ONBOARDING_PROGRESS_KEY)) onboardingFlow.finish();
        return;
      }
      onboardingFlow.start();
    }
    onboardingFlow.update(context);
    syncBattleHints(context);
  }
  // Hedefe dokunuş ekranı değiştirdiyse sıradaki adım beklemeden görünür.
  onboardingOverlay.afterTap = () => {
    requestAnimationFrame(() => syncFirstMatchTutorial(performance.now(), { force: true }));
  };

  document.getElementById("settings-tutorial-replay")?.addEventListener("click", () => {
    onboardingFlow.reset();
    onboardingFlow.start({ force: true });
    openAppScreen("menu");
    syncFirstMatchTutorial(performance.now(), { force: true });
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
  createBoard();
  render();
  renderCapacity();
  renderCredits();
  requestAnimationFrame(updateClock);
})();
