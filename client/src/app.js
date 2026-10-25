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
    unlockTrophies: Math.max(0, Number(item.unlock_trophies ?? 0)),
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
      "laser", "shield", "battery", "cooler", "emp", "amplifier",
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

      let delivery;
      if (
        typeof pvpConnection !== "undefined"
        && pvpConnection.status === "open"
        && pvpEnvelope
      ) {
        delivery = pvpConnection.sendEnvelope(
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
        delivery = { ok:true };
      } else {
        logClientMessage(
          "Komut gönderilemedi: sunucu savaş oturumu bağlı değil."
        );
        delivery = { ok:false, reason:"Sunucu bağlantısı bekleniyor." };
      }

      renderLog();
      return delivery;
    },
  });

  const participantIdentity =
    new RelayTestParticipantIdentity();
  const participantPlayerId =
    participantIdentity.getOrCreate();

  const pvpState = new RelayPvPClientState({
    playerId: participantPlayerId,
    sessionId: "local-preview",
    // app.js applies the mapped, dynamic module instances once per UI frame.
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
    analytics_age_gate: "",
    analytics_age_asked_year: 0,
  });

  // Grafik kademesi. Sunucudaki ayar hesapla birlikte her cihaza taşınır;
  // "Otomatik" ise cihaza özeldir: donanıma göre başlar ve savaşta kare hızı
  // düşük kalırsa bir kademe iner. Kademe `body[data-graphics]` ile CSS'e,
  // parçacık bütçesiyle de efekt koduna yansır.
  const GRAPHICS_TIERS = GridshardGraphicsTier.tiers;

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

  // Kademe kararları battle/graphics-tier.js içindedir; burada cihazın
  // bildirdikleri toplanır ve sonuç ekrana uygulanır.
  const graphicsTier = new GridshardGraphicsTier.Controller({
    read: readDevicePreference,
    write: writeDevicePreference,
    version: () => document.getElementById("boot-version")?.dataset?.version || "",
    accountTier: () => settingsState.settings?.graphics_quality,
    device: () => {
      const nav = globalThis.navigator || {};
      const native = Boolean(globalThis.Capacitor?.isNativePlatform?.());
      return {
        mobile: native || /Android|iPhone|iPad|iPod/i.test(String(nav.userAgent || "")),
        deviceMemory: nav.deviceMemory,
        hardwareConcurrency: nav.hardwareConcurrency,
      };
    },
  });

  function graphicsModeIsAuto() {
    return graphicsTier.isAuto();
  }

  function battleGraphicsQuality() {
    return graphicsTier.tier();
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
      invalidateBattleLayout();
    }
    return tier;
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
    requestOnboardingSync();

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
  // Modülün adı yalnız "Onarım"dır; eski sunucu verisi "Onarım Modülü" gönderir.
  function withCanonicalModuleNames(state) {
    for (const item of state?.module_collection || []) {
      if (item?.name_tr === "Onarım Modülü") item.name_tr = "Onarım";
      if (item?.definition_id === "armor" || item?.module_id === "armor" || item?.name_tr === "Zırh") {
        item.name_tr = "Sönümleyici";
        if (item.name_en) item.name_en = "Dampener";
      }
    }
    return state;
  }
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
  // Yalnız bu profilin açık uygulama oturumunda tamamladığı canlı reklamlar.
  // SSV/bağlantı gecikirse yeniden reklam oynatmadan ödül talebi yinelenir.
  // Bu işaret ödül kanıtı değildir; sunucu yine imzalı SSV'yi zorunlu tutar.
  const pendingAdRewardClaims = new Set();
  let adRewardPending = false;
  let adRewardClaimPending = false;
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
  const PROFILE_AVATARS = Object.freeze([
    { id: "default", nameTr: "Devre Operatörü", glyph: "◇" },
    { id: "circuit_scout", nameTr: "Devre Kaşifi", glyph: "⌁" },
    { id: "core_guardian", nameTr: "Çekirdek Muhafızı", glyph: "⬡" },
    { id: "season_champion", nameTr: "Sezon Şampiyonu", glyph: "♛" },
    { id: "season_finalist", nameTr: "Sezon Finalisti", glyph: "◈" },
    { id: "weekly_champion", nameTr: "Haftalık Şampiyon", glyph: "✹" },
    { id: "weekly_finalist", nameTr: "Haftalık Finalist", glyph: "✧" },
    { id: "rank_spark", nameTr: "Kıvılcım Operatörü", glyph: "ϟ" },
    // Yalnız Devre Yolu'nun sonundaki GRIDSHARD Sandığı ile açılan set.
    { id: "gridshard_apex", nameTr: "Zirve Pilotu", glyph: "❖" },
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
    { id: "gridshard_apex", nameTr: "Zirve Halkası" },
  ]);
  // Approved physical emblems shared by own/public profiles, chat and rewards.
  // These are display assets only; existing server ownership IDs remain intact.
  const PROFILE_AVATAR_ART = Object.freeze({
    circuit_scout:"./assets/ui/home-v3/route.webp",
    core_guardian:"./assets/ui/leagues-v1/reactor.webp",
    season_champion:"./assets/ui/leagues-v1/legendary.webp",
    season_finalist:"./assets/ui/leagues-v1/nexus.webp",
    weekly_champion:"./assets/ui/rating-trophy-v1/rating-trophy.webp",
    weekly_finalist:"./assets/ui/leagues-v1/quantum.webp",
    rank_spark:"./assets/ui/leagues-v1/volt.webp",
    gridshard_apex:"./assets/ui/leagues-v1/gridshard.webp",
  });
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
    { id:"gridshard_apex", nameTr:"Zirve Işığı", glyph:"❖", motion:"burst" },
  ]);
  const PROFILE_BACKGROUNDS = Object.freeze([
    { id:"default", nameTr:"Standart Terminal", colors:["#0c2944", "#173f5d"] },
    { id:"rank_crown", nameTr:"Taç Devresi", colors:["#4b3611", "#145064"] },
    { id:"rank_prism", nameTr:"Prizma Akımı", colors:["#34265c", "#126a74"] },
    { id:"rank_frequency", nameTr:"Frekans Hattı", colors:["#153b58", "#176b72"] },
    { id:"rank_relay", nameTr:"Röle Akımı", colors:["#1b3159", "#174d64"] },
    { id:"gridshard_apex", nameTr:"Zirve Devresi", colors:["#5a3a10", "#3b1f63"] },
  ]);
  const ACCOUNT_ONBOARDING_DISMISSED_KEY = `gridshard.account-onboarding.dismissed:${participantPlayerId}`;

  const SYMBOLIC_EMOJI_ART = Object.freeze({
    victory_pulse:"./assets/ui/leagues-v1/spark.webp",
    respect_signal:"./assets/ui/leagues-v1/gridshard.webp",
    team_beacon:"./assets/ui/home-v3/route.webp",
    core_burst:"./assets/ui/leagues-v1/reactor.webp",
    glitch_wave:"./assets/ui/leagues-v1/quantum.webp",
    overload_flash:"./assets/ui/leagues-v1/volt.webp",
    gridshard_apex:"./assets/ui/leagues-v1/gridshard.webp",
  });
  function createBattleEmojiVisual(emoji) {
    const source = emoji?.mediaSrc || (Object.hasOwn(SYMBOLIC_EMOJI_ART, emoji?.id || "") ? SYMBOLIC_EMOJI_ART[emoji.id] : "");
    const visual = document.createElement(source ? "img" : "span");
    visual.className = "battle-emoji-visual";
    visual.dataset.motion = emoji?.motion || "none";
    if (emoji?.real) visual.dataset.real = "true";
    if (source) {
      visual.src = source;
      visual.alt = "";
      visual.decoding = "async";
      visual.loading = "lazy";
      visual.dataset.mediaType = /\.gif(?:$|\?)/i.test(source) ? "gif" : "image";
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

  // Kilitli kozmetiğin altında nereden kazanıldığı yazmaz: ödüller dönemden
  // döneme değişeceği için yalnız kilitli olduğu gösterilir.
  function cosmeticStateLabel({ unlocked, selected }) {
    const state = document.createElement("small");
    if (unlocked) {
      state.textContent = selected ? "SEÇİLİ" : "SEÇ";
      return state;
    }
    state.className = "cosmetic-locked-label";
    state.textContent = "KİLİTLİ";
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
  async function fetchWithDeadline(input, init = {}, timeoutMs = 30000, consume = null) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      // A server may send headers and then stall mid-body. Keep the same
      // abort/deadline owner alive until the requested body has been consumed.
      const result = consume ? await consume(response) : response;
      if (timedOut) throw new Error("Response body deadline elapsed");
      return result;
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
        const {response, rawBody} = await fetchWithDeadline(
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
          timeoutMs,
          async response => ({response, rawBody:await response.text()})
        );
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
            payload.detail?.message || payload.detail || `Sunucu işlemi reddetti (${response.status}).`
          );
          responseError.status = response.status;
          responseError.code = payload.detail?.code || "";
          if (attempt === 0 && [500, 502, 503, 504].includes(response.status)) {
            lastError = responseError;
            await new Promise((resolve) => { window.setTimeout(resolve, 150); });
            continue;
          }
          throw responseError;
        }
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && canRetry && !Number(error?.status)) {
          await new Promise((resolve) => { window.setTimeout(resolve, 150); });
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

  // Açılır menü (üç çizgi düğmesi): düğme listeyi açar ve kapatır; listenin
  // dışına dokunmak, Escape, bir seçeneğe dokunmak ve ekran değişimi kapatır.
  const dropdownMenus = [];

  function setDropdownMenuOpen(entry, open, { restoreFocus=false }={}) {
    entry.menu.hidden = !open;
    entry.button.setAttribute("aria-expanded", String(open));
    // Açık menünün kabı alt çubuğun üstüne çıkar (stil: .has-open-dropdown).
    entry.menu.parentElement?.classList.toggle("has-open-dropdown", open);
    if (!open && restoreFocus) entry.button.focus();
  }

  function closeDropdownMenus({ except=null, restoreFocus=false }={}) {
    for (const entry of dropdownMenus) {
      if (entry === except || entry.menu.hidden) continue;
      setDropdownMenuOpen(entry, false, { restoreFocus });
    }
  }

  function bindDropdownMenu(button, menu) {
    if (!button || !menu) return;
    const entry = { button, menu };
    dropdownMenus.push(entry);
    button.addEventListener("click", () => {
      closeDropdownMenus({ except:entry });
      setDropdownMenuOpen(entry, menu.hidden);
    });
    menu.addEventListener("click", (event) => {
      if (event.target.closest("button")) setDropdownMenuOpen(entry, false);
    });
  }

  // Dışarıya dokunmak yalnız menüyü kapatır; aynı dokunuş alttaki düğmeyi
  // (ör. SAVAŞ) çalıştırmaz.
  let swallowDropdownDismissClick = false;
  document.addEventListener("pointerdown", (event) => {
    swallowDropdownDismissClick = false;
    for (const entry of dropdownMenus) {
      if (entry.menu.hidden) continue;
      if (entry.menu.contains(event.target) || entry.button.contains(event.target)) continue;
      setDropdownMenuOpen(entry, false);
      swallowDropdownDismissClick = true;
    }
  }, true);
  document.addEventListener("click", (event) => {
    if (!swallowDropdownDismissClick) return;
    swallowDropdownDismissClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.addEventListener("keydown", (event) => {
    swallowDropdownDismissClick = false;
    if (event.key === "Escape") closeDropdownMenus({ restoreFocus:true });
  });

  let battleClockFrame = null;
  let battleClockTimer = null;
  let battleClockUpdating = false;

  function renderAppScreen() {
    const current = screenController.render();
    syncScreenLifecycle(current);
    syncBattleClockVisibility();
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

  // Ekran geçişinde (alt çubuk hareketi sürerken) tazelenen verinin yeniden
  // çizimi bekletilir; aynı karede yapılınca geçiş takılarak görünüyordu.
  const NAVIGATION_SETTLE_MS = 360;
  let navigationSettleUntil = 0;
  let navigationRevision = 0;
  const navigationTasks = new Set();
  let lifecycleScreen = null;

  function syncScreenLifecycle(screen){
    const previousScreen=lifecycleScreen;
    lifecycleScreen=screen;
    if(previousScreen===null || screen===previousScreen)return;
    navigationRevision += 1;
    for (const timer of navigationTasks) window.clearTimeout(timer);
    navigationTasks.clear();
    navigationSettleUntil = performance.now() + NAVIGATION_SETTLE_MS;
    hideRewardPreview();
    for(const id of ["module-detail-dialog","core-detail-dialog","chest-odds-dialog","battle-pool-preset-dialog"]){
      const dialog=document.getElementById(id);
      if(dialog?.open)dialog.close?.();
    }
    if(previousScreen === "play")clearBattleEffects();
    if(screen !== "shop")stopShopCountdownTimer();
  }

  function afterNavigationSettle(task) {
    const wait = navigationSettleUntil - performance.now();
    if (wait <= 0) task();
    else {
      const revision=navigationRevision;
      const timer=window.setTimeout(()=>{
        navigationTasks.delete(timer);
        if(revision===navigationRevision && !document.hidden)task();
      },wait);
      navigationTasks.add(timer);
    }
  }

  function openAppScreen(screen, { keepSubTab=false }={}) {
    const previousScreen = appRouter.currentScreen;
    const result = appRouter.go(screen);
    if (!result.ok) {
      logClientMessage(result.reason);
      return result;
    }
    syncScreenLifecycle(screen);
    const requestRevision=navigationRevision;
    closeDropdownMenus();
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
        .then(() => requestRevision === navigationRevision ? markScreenNotificationsSeen(screen) : null)
        .then(() => {
          if(requestRevision !== navigationRevision)return;
          afterNavigationSettle(() => {
          renderProfileSummary();
          renderMetaHubScreens({defer:true});
          renderRemoteDataStatus();
          focusEarnedReward(screen);
          });
        });
      if (["shop", "modules", "team", "menu"].includes(screen)) {
        loadMetaProgression({ afterSettle:true });
      }
      if (["shop", "rewards"].includes(screen)) void loadStoreState();
      if (screen === "team") {
        activeTeamTab = "profile";
        loadTeamView();
      }
      if (screen === "friends") {
        renderFriendsScreen();
        void loadSocialView();
        if (activeDirectMessagePeerId) void loadDirectMessageThread();
      }
      if (["events", "weekly-event", "team-event"].includes(screen)) {
        if (screen === "weekly-event") activeWeeklyEventTab = "overview";
        if (screen === "team-event") activeTeamEventTab = "overview";
        renderEventSubpages();
        renderEventsHub();
        loadEventsView();
      }
    } else if (
      screen === "statistics"
    ) {
      accountDataLoader
        .loadStatistics()
        .then(() => {
          if(requestRevision !== navigationRevision)return;
          renderStatisticsSummary();
          renderRemoteDataStatus();
        });
    } else if (
      screen === "settings"
    ) {
      accountDataLoader
        .loadSettings()
        .then(() => {
          if(requestRevision !== navigationRevision)return;
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
        { definition_id: "field_3h", name_tr: "Bronz Sandık", tier: "bronze", currency: "circuit_credits", cost: 1000, base_cost: 1000 },
        { definition_id: "circuit_8h", name_tr: "Gümüş Sandık", tier: "silver", currency: "circuit_credits", cost: 2000, base_cost: 2000 },
        { definition_id: "core_24h", name_tr: "Altın Sandık", tier: "gold", currency: "flux_shards", cost: 500, base_cost: 500 },
        { definition_id: "diamond_24h", name_tr: "Elmas Sandık", tier: "diamond", currency: "flux_shards", cost: 1000, base_cost: 1000 },
      ] } },
    };
  }

  async function loadMetaProgression({required = false, afterSettle = false} = {}) {
    try {
      const {response, payload} = await fetchWithDeadline(
        `/profile/${encodeURIComponent(participantPlayerId)}/meta-progression`,
        { cache: "no-store" },
        30000,
        async response => ({response, payload:response.ok ? await response.json() : null})
      );
      if (!response.ok) throw new Error("Koleksiyon yüklenemedi.");
      metaProgressionState = withCanonicalModuleNames(payload);
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
    if (afterSettle) afterNavigationSettle(() => renderMetaHubScreens({defer:true}));
    else renderMetaHubScreens({defer:true});
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

  // Bilgi ekranının başındaki değer kutuları. Bir sonraki seviyede değişen
  // değerin yanında fark yeşil yazar: artan değerde "+değer", kısalan bekleme
  // süresinde "−değer sn". Değişmeyen değerde bir şey yazmaz.
  function renderDetailStatRow(host, entries) {
    if (!host) return;
    host.replaceChildren();
    for (const { label, value, current, next, icon, tone, unit } of entries) {
      const box = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = label;
      const amount = document.createElement("strong");
      amount.textContent = String(value);
      const change = Math.round((Number(next) - Number(current)) * 100) / 100;
      if (next !== undefined && next !== null && Number.isFinite(change) && change !== 0) {
        const changeLabel = document.createElement("em");
        changeLabel.className = "stat-next-gain";
        changeLabel.textContent = statGainText(change, unit);
        changeLabel.title = localizedUiText("Sonraki seviye");
        amount.append(" ", changeLabel);
      }
      // Overview only: centered icon, label, then value + next-level gain.
      if (icon) {
        box.dataset.tone = tone || "";
        box.appendChild(createUiIcon(icon, tone));
      }
      box.append(name, amount);
      host.appendChild(box);
    }
  }

  // Bir sonraki seviyenin farkı değerin kendi birimiyle yazılır: "+3",
  // "−0,01 sn", "+%2", "+0,4/sn". Azalan değerde eksi işareti (−) kullanılır.
  function statGainText(change, unit = "") {
    const english = document.documentElement.lang === "en";
    const number = Math.abs(change).toLocaleString(uiLocale(), { maximumFractionDigits:2 });
    const sign = change > 0 ? "+" : "−";
    if (unit === "percent" || unit === "heat") return english ? `${sign}${number}%` : `${sign}%${number}`;
    if (unit === "seconds") return `${sign}${number} ${english ? "sec" : "sn"}`;
    if (unit === "per_second") return `${sign}${number}/${english ? "sec" : "sn"}`;
    return `${sign}${number}`;
  }

  // --- Yükseltme göstergeleri -------------------------------------------------
  // Yükseltme ve yetenek koşulları tek yerdedir: bilgi ekranındaki düğmeler,
  // kartlardaki yeşil ok, Yetenekler sekmesindeki ok ve alt çubuktaki Kartlar
  // ışığı aynı kurala bakar.
  function moduleUpgradeBlockReason(item) {
    const cost = item?.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const specificShards = Number(item?.shards || 0);
    const usableShards = specificShards + Math.max(0, Number(metaProgressionState?.universal_module_shards || 0));
    if (!item?.unlocked) return `${item?.unlock_trophies ?? 0} kupada açılır.`;
    if (!cost) return "Azami seviye.";
    if (specificShards < 0) return "Bu modül parçasının iade açığını oynayarak kapatmalısın.";
    if (usableShards < required) return `Gerekli parça: ${usableShards}/${required}`;
    if (Number(metaProgressionState?.circuit_credits || 0) < Number(cost.circuit_credits)) return `Gerekli Devre Kredisi: ${cost.circuit_credits}`;
    // Efsanevi modül seviye 8'den sonra Akı da ister.
    if (Number(metaProgressionState?.flux_shards || 0) < Number(cost.flux_shards || 0)) return `Gerekli Akı: ${cost.flux_shards}`;
    return "";
  }

  // Modülü açan aşama: arena numarası ya da (sıra 12'den büyükse) lige giriş.
  const LEAGUE_NAME_BY_UNLOCK_ORDER = Object.freeze({
    13:"Kıvılcım Ligi", 14:"Voltaj Ligi", 15:"Reaktör Ligi", 16:"Kuantum Ligi",
    17:"Nexus Ligi", 18:"Şampiyonlar Ligi", 19:"Efsanevi Lig", 20:"GRIDSHARD Ligi",
  });

  function moduleUnlockStage(item, definitionId = item?.definition_id) {
    const canon = globalThis.GRIDSHARD_CANON_MODULES?.find((module) => module.id === definitionId);
    const order = Number(item?.unlock_arena || canon?.unlock_arena || 0);
    const league = item?.unlock_stage_kind === "league" || order > 12;
    return {
      order,
      league,
      trophies: Number(item?.unlock_trophies ?? canon?.unlock_trophies ?? 0),
      leagueNameTr: league ? (item?.unlock_stage_name_tr || LEAGUE_NAME_BY_UNLOCK_ORDER[order] || "") : "",
    };
  }

  // Kart rozeti dardır ("ARENA 12" kadar); ligin kısa adı yazılır.
  const LEAGUE_BADGE_KEY_BY_UNLOCK_ORDER = Object.freeze({
    13:"spark", 14:"volt", 15:"reactor", 16:"quantum", 17:"nexus", 18:"champions", 19:"legendary", 20:"gridshard",
  });

  function moduleUnlockBadge(item, definitionId) {
    const stage = moduleUnlockStage(item, definitionId);
    const leagueKey = stage.league ? LEAGUE_BADGE_KEY_BY_UNLOCK_ORDER[stage.order] : "";
    if (leagueKey) return localizedMessage(`league.badge.${leagueKey}`);
    return stage.order ? `ARENA ${stage.order}` : "KİLİTLİ";
  }


  function moduleTalentSelectable(item, node) {
    return Boolean(item?.unlocked)
      && !node.selected
      && Number(item.level) + 1 >= node.level
      && talentAffordable(node);
  }

  function coreUpgradeAvailable(core) {
    const cost = core?.next_upgrade_cost;
    const specific = Number(core?.shards || 0);
    const owned = specific + Math.max(0, Number(core?.legacy_shards || 0));
    return Boolean(core?.unlocked && cost && specific >= 0 && owned >= Number(cost.shards)
      && Number(metaProgressionState?.circuit_credits || 0) >= Number(cost.circuit_credits || 0)
      && Number(metaProgressionState?.flux_shards || 0) >= Number(cost.flux_shards || 0));
  }

  function coreSkillLearnable(core, skill) {
    return Boolean(core?.unlocked) && !skill.learned && !skill.tier_selected
      && core.level >= skill.level
      && talentAffordable(skill);
  }

  function talentAffordable(node) {
    return Number(metaProgressionState?.circuit_credits || 0) >= Number(node.circuit_credits_cost || 0)
      && Number(metaProgressionState?.flux_shards || 0) >= Number(node.flux_cost || 0);
  }

  function talentCostShortfall(node) {
    if (Number(metaProgressionState?.circuit_credits || 0) < Number(node.circuit_credits_cost || 0)) {
      return document.documentElement.lang === "en"
        ? `${Number(node.circuit_credits_cost).toLocaleString(uiLocale())} CREDITS REQUIRED`
        : `${Number(node.circuit_credits_cost).toLocaleString(uiLocale())} DK GEREKLİ`;
    }
    return Number(metaProgressionState?.flux_shards || 0) < Number(node.flux_cost || 0)
        ? (document.documentElement.lang === "en"
          ? `${Number(node.flux_cost).toLocaleString(uiLocale())} FLUX REQUIRED`
          : `${Number(node.flux_cost).toLocaleString(uiLocale())} AKI GEREKLİ`) : "";
  }

  function appendTalentCosts(element, node) {
    if (Number(node.circuit_credits_cost) > 0) element.append(createCostChip("credit", node.circuit_credits_cost));
    if (Number(node.flux_cost) > 0) element.append(createCostChip("flux", node.flux_cost));
  }

  // Göstergeler yalnız sunucudan gelen gerçek durumla yanar (yerel önizlemede değil).
  function metaIndicatorsLive() {
    return Boolean(metaProgressionState) && !metaProgressionState.unavailable;
  }
  function moduleUpgradeAvailable(item) {
    return metaIndicatorsLive() && Boolean(item) && !moduleUpgradeBlockReason(item);
  }
  function moduleTalentAvailable(item) {
    return metaIndicatorsLive() && (item?.talents || []).some((node) => moduleTalentSelectable(item, node));
  }
  function coreSkillAvailable(core) {
    return metaIndicatorsLive() && (core?.skills || []).some((skill) => coreSkillLearnable(core, skill));
  }
  function cardNeedsAttention(kind, item) {
    return kind === "core"
      ? (metaIndicatorsLive() && coreUpgradeAvailable(item)) || coreSkillAvailable(item)
      : moduleUpgradeAvailable(item) || moduleTalentAvailable(item);
  }

  function createUpgradeArrow() {
    const arrow = document.createElement("span");
    arrow.className = "upgrade-arrow";
    arrow.setAttribute("aria-hidden", "true");
    // Yalın ok, yeni görsel dilde: aydınlık sol yüz, gölgeli sağ yüz, koyu kontur.
    arrow.innerHTML = '<svg viewBox="0 0 24 24" focusable="false">'
      + '<path class="ua-s" d="M12 4 21.4 14.4h-5.6v8.4H8.2v-8.4H2.6Z"/>'
      + '<path class="ua-m" d="M12 2.2 21.4 12.6h-5.6v8.4H8.2v-8.4H2.6Z"/>'
      + '<path class="ua-l" d="M12 2.2 2.6 12.6h3.6L12 6.2ZM8.2 12.6h2.1v8.4H8.2Z"/>'
      + '<path class="ua-d" d="M12 2.2v4l5.8 6.4h3.6ZM13.7 12.6h2.1v8.4h-2.1Z"/>'
      + '<path class="ua-o" d="M12 2.2 21.4 12.6h-5.6v8.4H8.2v-8.4H2.6Z"/>'
      + "</svg>";
    return arrow;
  }

  // Bilgi ekranındaki Yetenekler sekmesinde, seçilebilir yetenek varken yeşil ok.
  function setDetailTabUpgradeArrow(button, available) {
    if (!button) return;
    const arrow = button.querySelector(".upgrade-arrow");
    button.classList.toggle("has-upgrade-arrow", Boolean(available));
    if (!available) arrow?.remove();
    else if (!arrow) button.appendChild(createUpgradeArrow());
  }

  // Alt çubuk: yükseltilebilir kart ya da seçilebilir yetenek varken Kartlar
  // düğmesinde yeşil ışık; sandık indirimi günü Mağaza düğmesinde indirim oranı.
  function renderDockIndicators() {
    const state = metaProgressionState;
    for (const button of document.querySelectorAll("[data-card-page]")) {
      const cores = button.dataset.cardPage === "cores";
      const available = cores
        ? (state?.cores?.types || []).some(item => cardNeedsAttention("core", item))
        : (state?.module_collection || []).some(item => cardNeedsAttention("module", item));
      setDetailTabUpgradeArrow(button, available);
    }
    const cardsButton = document.querySelector('#app-bottom-dock [data-open-screen="modules"]');
    if (cardsButton) {
      const ready = (state?.module_collection || []).some((item) => cardNeedsAttention("module", item))
        || (state?.cores?.types || []).some((core) => cardNeedsAttention("core", core));
      cardsButton.classList.toggle("has-upgrade-notification", ready);
      cardsButton.setAttribute("aria-label", ready ? "Kartlar · Yükseltme mevcut" : "Kartlar");
    }
    const shopButton = document.querySelector('#app-bottom-dock [data-open-screen="shop"]');
    const badge = document.getElementById("dock-shop-sale");
    if (shopButton && badge) {
      const store = state?.shop?.chest_store || null;
      const percent = Math.round(Number(store?.discount_percent || 0));
      const onSale = Boolean(store?.sale_active) && percent > 0;
      badge.hidden = !onSale;
      badge.textContent = onSale ? `-%${percent}` : "";
      shopButton.classList.toggle("has-sale-badge", onSale);
      shopButton.setAttribute("aria-label", onSale ? `Mağaza · %${percent} indirim` : "Mağaza");
    }
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
    mountModuleEmblem(art, { nameTr: item.name_tr || definition.nameTr });
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
        levelBadge.textContent = moduleUnlockBadge(item, tile.dataset.moduleDefinitionId);
        if (moduleUnlockStage(item, tile.dataset.moduleDefinitionId).league) levelBadge.dataset.leagueLock = "true";
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
      // Yükseltilebilir kart ya da seçilebilir yetenek: sağ üstte yeşil ok.
      const needsAttention = cardNeedsAttention("module", item);
      tile.dataset.upgradeAvailable = String(needsAttention);
      if (needsAttention) tile.appendChild(createUpgradeArrow());
      tile.setAttribute(
        "aria-label",
        localizedUiText(
          unlocked
            ? `${moduleName} · Seviye ${level} · ${maxed ? "Azami seviye" : `Parça ${shards} / ${required}`}`
            : `${moduleName} · Kilitli`
        ) + (needsAttention ? ` · ${localizedUiText("Yükseltme mevcut")}` : "")
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

  let renderedHomeHubSignature = null;
  function renderHomeHub() {
    const signature = JSON.stringify([metaProgressionState, profileState.profile?.rating, deckEditorSlots, battlePoolPresets,
      activeBattlePoolPresetName, document.documentElement.lang, homeMatchmakingLaunchPending,
      homeMatchmakingCancelPending, isOnlineMatchmakingCancelable()]);
    if (signature === renderedHomeHubSignature) return;
    renderedHomeHubSignature = signature;
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

  // Arenaların giriş kupaları; son değer liglerin başladığı kupadır. Yalnız
  // sunucudan aşama bilgisi gelmediğinde yedek olarak kullanılır.
  const ARENA_FLOOR_RATINGS = Object.freeze([0, 300, 600, 950, 1300, 1700, 2150, 2650, 3150, 3650, 4200, 4800, 5400]);

  function arenaViewModel() {
    const state = metaProgressionState || fallbackMetaProgression();
    const profileRating = Number(profileState.profile?.rating || 0);
    const fallbackIndex = Math.max(1, ARENA_FLOOR_RATINGS.slice(0, 12).filter((floor) => profileRating >= floor).length);
    const fallbackFloor = ARENA_FLOOR_RATINGS[fallbackIndex - 1];
    const fallbackCeiling = ARENA_FLOOR_RATINGS[fallbackIndex];
    const rank = state.rank || {
      kind: "arena",
      index: fallbackIndex,
      name_tr: `Arena ${fallbackIndex}`,
      minimum_rating: fallbackFloor,
      rating: profileRating,
      next_stage: { name_tr: `Arena ${fallbackIndex + 1}`, minimum_rating: fallbackCeiling },
    };
    const rating = Number(rank.rating ?? profileState.profile?.rating ?? 0);
    const floor = Number(rank.minimum_rating || 0);
    const ceiling = Number(rank.next_stage?.minimum_rating ?? Math.max(floor + 300, rating));
    const progress = ceiling <= floor ? 100 : Math.max(0, Math.min(100, ((rating - floor) / (ceiling - floor)) * 100));
    return { rank, rating, floor, ceiling, progress };
  }

  // --- Renkli arayüz simgeleri ---------------------------------------------------
  // Onaylı ortak ikonlar UI_ART_ICONS üzerinden tek WebP kaynağına gider.
  // Henüz dönüşmeyen savaş/değer simgeleri 24×24 SVG olarak korunur.
  const UI_ICON_PATHS = Object.freeze({
    hp:'<path class="f" d="M12 20.6 4.7 13.5a4.7 4.7 0 0 1 6.6-6.7l.7.7.7-.7a4.7 4.7 0 0 1 6.6 6.7Z"/>',
    damage:'<path class="f" d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    cycle:'<circle cx="12" cy="13.5" r="7.3"/><path d="M12 9.6v4l2.7 1.7M9.6 2.9h4.8M12 2.9v3.2"/>',
    shield:'<path d="M12 2.8 19.3 5.2v6c0 4.5-2.9 8-7.3 10-4.4-2-7.3-5.5-7.3-10v-6Z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
    reduction:'<path d="M12 2.8 19.3 5.2v6c0 4.5-2.9 8-7.3 10-4.4-2-7.3-5.5-7.3-10v-6Z"/><path d="M8.5 12h7"/>',
    reflect:'<path d="M20 5.5h-9a5.2 5.2 0 0 0 0 10.4h8.5"/><path d="m16.5 12.5 3.4 3.4-3.4 3.4"/><path d="M4 3.5v17"/>',
    wrench:'<path d="M14.8 6.2a4.1 4.1 0 0 0-5.3 5.3l-6 6 3 3 6-6a4.1 4.1 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4Z"/>',
    dome:'<path d="M3.6 18a8.4 8.4 0 0 1 16.8 0Z"/><path d="M2 18h20M12 9.6V18M7 13.2 12 18l5-4.8"/>',
    phase:'<circle cx="12" cy="12" r="8.2" stroke-dasharray="3.3 3"/><circle class="f" cx="12" cy="12" r="2.8"/>',
    convert:'<path d="M5 9.2a7.4 7.4 0 0 1 13-2.4M19 4v3.4h-3.4M19 14.8a7.4 7.4 0 0 1-13 2.4M5 20v-3.4h3.4"/><path class="f" d="M12.8 8.5 9.6 12.6h2.2l-.6 3.4 3.2-4.1h-2.2Z"/>',
    guard:'<path d="M12 2.8 19.3 5.2v6c0 4.5-2.9 8-7.3 10-4.4-2-7.3-5.5-7.3-10v-6Z"/><path class="f" d="M12.9 6.8 8.8 12.4h2.6l-.8 4.8 4.4-5.9h-2.7Z"/>',
    snow:'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M9.6 4.4 12 6.6l2.4-2.2M9.6 19.6l2.4-2.2 2.4 2.2"/>',
    boost:'<path class="f" d="M12 3 4.6 11h4.2v10h6.4V11h4.2Z"/>',
    speed:'<path class="f" d="M3 5.6 11 12l-8 6.4ZM12.4 5.6l8 6.4-8 6.4Z"/>',
    flame:'<path class="f" d="M12 2.5c.9 3.4 5.4 5.3 5.4 10.3a5.4 5.4 0 0 1-10.8 0c0-1.9.9-3.4 1.9-4.4.3 1.6 1 2.4 2 2.8-.4-3 .3-6.3 1.5-8.7Z"/>',
    hourglass:'<path d="M6.6 3h10.8v3.3L13.6 12l3.8 5.7V21H6.6v-3.3L10.4 12 6.6 6.3Z"/><path d="M9.5 18.5h5"/>',
    battery:'<rect x="3.2" y="7" width="15.2" height="10" rx="2.2"/><path d="M20.8 10.2v3.6M7 10.4v3.2M10.4 10.4v3.2M13.8 10.4v3.2"/>',
    bolt:'<path class="f" d="M13.6 2 5 13.4h5.4L9 22l9-12.4h-5.7Z"/>',
    energy:'<circle cx="12" cy="12" r="9"/><path class="f" d="M12.9 6.4 8.6 12.5h2.8l-.7 5.1 4.6-6.4h-2.9Z"/>',
    gauge:'<path d="M4 16.5a8 8 0 1 1 16 0"/><path d="m12 16.5 4.4-5.8"/><circle class="f" cx="12" cy="16.5" r="1.7"/>',
    pierce:'<path d="M2.5 12h14M13 8l4 4-4 4M20.5 4v16"/>',
    lock:'<circle cx="12" cy="12" r="6.4"/><path d="M12 2v4.6M12 17.4V22M2 12h4.6M17.4 12H22"/><circle class="f" cx="12" cy="12" r="1.8"/>',
    branch:'<path d="M3.5 12h6l5.5-6h5.5M9.5 12l5.5 6h5.5"/><path d="m18 3.6 2.5 2.4L18 8.4M18 15.6l2.5 2.4-2.5 2.4"/>',
    echo:'<circle class="f" cx="12" cy="12" r="2.6"/><path d="M7.2 7.2a6.8 6.8 0 0 0 0 9.6M16.8 7.2a6.8 6.8 0 0 1 0 9.6M4 4a11.3 11.3 0 0 0 0 16M20 4a11.3 11.3 0 0 1 0 16"/>',
    swarm:'<circle class="f" cx="12" cy="6" r="2.6"/><circle class="f" cx="6" cy="16.5" r="2.6"/><circle class="f" cx="18" cy="16.5" r="2.6"/><path d="M12 8.6v3.4M10.4 13.6 8 15M13.6 13.6 16 15"/>',
    percent:'<path d="M6 18.5 18 5.5"/><circle cx="7.4" cy="7.4" r="2.6"/><circle cx="16.6" cy="16.6" r="2.6"/>',
    revive:'<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7M19.5 3.5v4h-4"/><path d="M12 8.6v6.8M8.6 12h6.8"/>',
    bug:'<ellipse cx="12" cy="13" rx="4.6" ry="5.8"/><path d="M9 6.4 7.4 4M15 6.4 16.6 4M7.4 11 3.6 9.6M7.4 15l-3.8 1.4M16.6 11l3.8-1.4M16.6 15l3.8 1.4M12 8.6v9"/>',
    rings:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="9.6" stroke-dasharray="2.6 2.6"/>',
    star:'<path class="f" d="m12 2.6 2.8 6 6.5.8-4.8 4.5 1.3 6.5-5.8-3.3-5.8 3.3 1.3-6.5-4.8-4.5 6.5-.8Z"/>',
    gem:'<path d="M7 4h10l4 5.4L12 21 3 9.4Z"/><path d="M3 9.4h18M9.2 9.4 12 21l2.8-11.6M7 4l2.2 5.4L12 4l2.8 5.4L17 4"/>',
    eye:'<path d="M2.2 12S5.8 5.6 12 5.6 21.8 12 21.8 12 18.2 18.4 12 18.4 2.2 12 2.2 12Z"/><circle class="f" cx="12" cy="12" r="2.8"/>',
    swords:'<path d="M4 4l10.5 10.5M4 4v3.4L13 16.4M20 4 9.5 14.5M20 4v3.4L11 16.4M6.4 14l3.6 3.6M17.6 14 14 17.6M5 19l2.4-2.4M19 19l-2.4-2.4"/>',
    target:'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle class="f" cx="12" cy="12" r="1.5"/>',
    grid:'<rect x="3.6" y="3.6" width="7" height="7" rx="1.6"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.6"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.6"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.6"/>',
    key:'<circle cx="8" cy="15.5" r="4.4"/><path d="m11.2 12.4 8.6-8.6M16.4 7.2l2.8 2.8M13.6 10l2.2 2.2"/>',
    trophy:'<path d="M7.5 3.6h9v5a4.5 4.5 0 0 1-9 0Z"/><path d="M7.5 5H4.4c0 3.2 1.3 4.8 3.4 5M16.5 5h3.1c0 3.2-1.3 4.8-3.4 5M12 13v3.6M8.4 20h7.2M9.6 16.6h4.8V20H9.6Z"/>',
    chest:'<path d="M4 10.2h16v9.4H4Z"/><path d="M4 10.2 5.6 5.6Q12 3.2 18.4 5.6L20 10.2"/><path class="f" d="M10.3 9h3.4v4.6h-3.4Z"/>',
    chat:'<path d="M4 5h16v10.6h-9.4L6 19.6v-4H4Z"/><path d="M8 9h8M8 12.2h5"/>',
    core:'<path d="M12 2.8 21.2 12 12 21.2 2.8 12Z"/><path class="f" d="M12 7.8 16.2 12 12 16.2 7.8 12Z"/>',
    current:'<path class="f" d="M13.5 2 5 13h6l-1 9 9-12h-6Z"/>',
    card:'<rect x="5" y="3" width="14" height="18" rx="2.6"/><path d="M9 8h6M9 12h6M9 16h3.4"/>',
    shop:'<path d="M4 9h16l-1.2 11H5.2Z"/><path d="M8 9V6.6a4 4 0 0 1 8 0V9M9.4 13.4h5.2"/>',
    home:'<path d="M4 11.4 12 4l8 7.4V20h-5.2v-5.4H9.2V20H4Z"/>',
  });
  // Eski çağrı adları ve yeni anlam adları aynı onaylı dosyaya yönlenir.
  // Dosya yolları yalnız canon.css "Common UI artwork" bölümündedir.
  const UI_ART_ICONS = Object.freeze({
    gear:"settings", settings:"settings", mail:"message", message:"message",
    people:"friends", friends:"friends", profile:"profile", gift:"gift",
    calendar:"calendar", bars:"statistics", statistics:"statistics",
    palette:"cosmetics", cosmetics:"cosmetics", info:"info", menu:"menu",
    swords:"battle", battle:"battle", card:"deck", deck:"deck",
    shop:"purchase", purchase:"purchase", chest:"chest",
    target:"battle", gem:"gift",
    core:"detail-core", team:"detail-team", rarity:"detail-rarity",
    hp:"detail-hp", damage:"battle", dps:"detail-damage", cycle:"detail-cycle",
    energy:"detail-battery", current:"detail-energy", bolt:"detail-energy",
    star:"detail-talent", grid:"detail-grid", shield:"detail-guard",
    guard:"detail-guard", dome:"detail-guard", reduction:"detail-guard",
    reflect:"detail-guard", phase:"detail-guard", lock:"detail-guard",
    gauge:"statistics", boost:"detail-talent", speed:"detail-cycle",
    hourglass:"detail-cycle", rings:"detail-core", echo:"detail-core",
    convert:"detail-energy", percent:"statistics", branch:"detail-talent",
    flame:"detail-damage", bug:"detail-damage", pierce:"detail-damage", swarm:"detail-damage",
    wrench:"detail-repair", revive:"detail-repair", snow:"detail-cooler", battery:"detail-battery",
    key:"detail-unlock", eye:"profile",
  });
  // Değer anahtarı → simge ve renk tonu.
  const STAT_ICONS = Object.freeze({
    hp:["hp", "green"], damage:["damage", "red"], cycle:["cycle", "blue"], dps:["dps", "red"],
    energy:["energy", "cyan"], current:["current", "gold"],
    block:["shield", "blue"], reduction:["reduction", "steel"], reflect:["reflect", "violet"],
    regen:["wrench", "green"], sabotage_guard:["guard", "violet"], dome_guard:["dome", "cyan"],
    phase:["phase", "violet"], conversion:["convert", "cyan"],
    repair:["wrench", "green"], revive:["revive", "orange"], revive_hp:["hp", "orange"],
    cooling:["snow", "cyan"], damage_boost:["boost", "red"], speed_boost:["speed", "gold"],
    heat:["flame", "orange"], boost:["hourglass", "gold"], debt:["hourglass", "steel"],
    resonance:["rings", "pink"], duration:["hourglass", "violet"], virus_damage:["bug", "green"],
    echo:["echo", "violet"], storage:["battery", "cyan"], saving:["percent", "green"],
    pierce:["pierce", "orange"], lock:["lock", "gold"], secondary:["branch", "orange"],
    swarm:["swarm", "orange"], charge_bonus:["bolt", "violet"],
  });

  function uiIconMarkup(name, tone = "") {
    // Para birimi başlıklarında da ayrı, eski bir levha/çizim üretme.
    if (name === "flux" || name === "credit") return resourceTokenMarkup(name, "i");
    if (name === "trophy") return `<i class="ui-icon is-artwork" aria-hidden="true">${createRatingTrophyIcon().outerHTML}</i>`;
    if (name === "back") return '<i class="ui-icon ui-back-arrow" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path d="M14 5 3 16l11 11v-7h15v-8H14Z" fill="#81f1de" stroke="#04121e" stroke-width="2" stroke-linejoin="round"/><path d="m14 5-9 11h8v-4h16" fill="none" stroke="#d8fff1" stroke-width="1.5"/></svg></i>';
    const safeTone = /^[a-z][a-z0-9-]{0,30}$/.test(tone) ? tone : "";
    if (Object.hasOwn(UI_ART_ICONS, name)) {
      return `<i class="ui-icon is-artwork" data-icon="${name}"${safeTone ? ` data-tone="${safeTone}"` : ""} aria-hidden="true"><span class="ui-art" data-ui-art="${UI_ART_ICONS[name]}" aria-hidden="true"></span></i>`;
    }
    const iconName = Object.hasOwn(UI_ICON_PATHS, name) ? name : "star";
    const paths = UI_ICON_PATHS[iconName];
    return `<i class="ui-icon" data-icon="${iconName}"${safeTone ? ` data-tone="${safeTone}"` : ""} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${paths}</svg></i>`;
  }

  function createUiIcon(name, tone = "") {
    const template = document.createElement("template");
    template.innerHTML = uiIconMarkup(name, tone);
    return template.content.firstElementChild;
  }

  // --- Kaynak simgeleri ------------------------------------------------------------
  // Akı/Devre Kredisi: tek merkezden onaylı WebP; kalan kaynaklar 24×24 SVG.
  // SVG renkleri canon.css `data-token`, para birimi dosyaları Currency artwork.
  const tokenFacets = (body, light, dark, extra = "") =>
    `<path class="tk-m" d="${body}"/><path class="tk-l" d="${light}"/><path class="tk-d" d="${dark}"/>${extra}<path class="tk-o" d="${body}"/>`;
  const RESOURCE_TOKEN_SVG = Object.freeze({
    // Akım: şimşek.
    current:tokenFacets(
      "M13.9 1.5 4.3 13.5h5.8L8.5 22.5 19.7 10.1h-5.9Z",
      "M13.9 1.5 4.3 13.5h3.4L13.85 5.6Z",
      "M19.7 10.1 8.5 22.5 9.3 18 16.4 10.1Z"
    ),
    // Çekirdek parçası: altıgen kristal.
    core:tokenFacets(
      "M12 1.8 20.6 6.6v10.8L12 22.2 3.4 17.4V6.6Z",
      "M12 1.8 3.4 6.6v10.8L12 12Z",
      "M20.6 6.6v10.8L12 22.2V12Z",
      '<path class="tk-w" d="m12 8 3.2 4-3.2 4-3.2-4Z"/>'
    ),
    chest:'<path class="tk-m" d="M3.5 10.5h17v8.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path class="tk-l" d="M3.5 10.5 5.6 5.2h12.8l2.1 5.3Z"/>'
      + '<path class="tk-d" d="M3.5 16.6h17v2.1a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>'
      + '<path class="tk-o" d="M3.5 10.5 5.6 5.2h12.8l2.1 5.3v8.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2ZM3.5 10.5h17"/>'
      + '<path class="tk-w tk-ink" d="M12 8.2 14.8 11 12 13.8 9.2 11Z"/>',
    trophy:'<path class="tk-handle" d="M7.2 5H4c0 3.3 1.4 5 3.6 5.3M16.8 5H20c0 3.3-1.4 5-3.6 5.3"/>'
      + '<path class="tk-d tk-ink" d="M10.3 12.6h3.4v4h-3.4Z"/><path class="tk-m tk-ink" d="M7.4 16.4h9.2l1.2 4.6H6.2Z"/>'
      + '<path class="tk-m tk-ink" d="M6.8 2.6h10.4v5.8a5.2 5.2 0 0 1-10.4 0Z"/>'
      + '<path class="tk-l" d="M8.6 4.2h2.2v4.6a3.4 3.4 0 0 0 1 2.4 3.6 3.6 0 0 1-3.2-3.6Z"/>',
    // Takım puanı: baklava taş.
    team_point:tokenFacets("M12 1.8 21.4 12 12 22.2 2.6 12Z", "M12 1.8 2.6 12H12Z", "M21.4 12 12 22.2V12Z"),
    // Ücretli ürün: yıldızlı madalya.
    premium:'<circle class="tk-d tk-ink" cx="12" cy="13" r="9.6"/><circle class="tk-m tk-ink" cx="12" cy="11" r="9.6"/>'
      + '<circle class="tk-l" cx="12" cy="11" r="7"/>'
      + '<path class="tk-k" d="m12 5.4 1.7 3.6 3.9.5-2.9 2.7.8 3.9-3.5-2-3.5 2 .8-3.9-2.9-2.7 3.9-.5Z"/>',
  });
  const RESOURCE_TOKEN_CLASS = Object.freeze({
    flux:"resource-symbol-flux", credit:"resource-symbol-credit", current:"resource-symbol-current",
    core:"resource-symbol-core-shard", chest:"resource-symbol-chest", experience:"resource-symbol-experience",
    trophy:"resource-symbol-trophy", team_point:"resource-symbol-team-point", premium:"resource-symbol-premium",
  });

  function resourceTokenVisual(kind) {
    const token = Object.prototype.hasOwnProperty.call(RESOURCE_TOKEN_CLASS, kind) ? kind : "credit";
    // Tek görsel kaynağı canon.css Currency artwork bölümündedir. Sabit HTML,
    // ödüller, önizlemeler, mağaza paketleri ve maliyetler aynı sınıfı kullanır.
    if (token === "flux" || token === "credit") {
      return `<span class="currency-art" data-currency="${token}" aria-hidden="true"></span>`;
    }
    if (token === "experience") return '<span class="experience-art" aria-hidden="true"></span>';
    return `<svg viewBox="0 0 24 24" focusable="false">${RESOURCE_TOKEN_SVG[token]}</svg>`;
  }

  function resourceTokenMarkup(kind, tag = "span") {
    const token = Object.prototype.hasOwnProperty.call(RESOURCE_TOKEN_CLASS, kind) ? kind : "credit";
    if (token === "trophy") return `<${tag} class="resource-symbol resource-symbol-trophy is-token is-rating-trophy" data-token="trophy" aria-hidden="true"><img class="trophy-value-icon" src="./assets/ui/rating-trophy-v1/rating-trophy.webp" width="128" height="128" alt="" aria-hidden="true" draggable="false" decoding="async" /></${tag}>`;
    return `<${tag} class="resource-symbol ${RESOURCE_TOKEN_CLASS[token]} is-token" data-token="${token}" aria-hidden="true">${resourceTokenVisual(token)}</${tag}>`;
  }

  // Maliyet rozeti: para biriminin adı yerine kendi simgesi ("100 DK" → ◎ 100).
  const COST_CHIP_LABELS = Object.freeze({ credit:"Devre Kredisi", flux:"Akı", current:"Akım" });
  function createCostChip(kind, amount) {
    const chip = document.createElement("span");
    chip.className = "cost-chip";
    chip.dataset.kind = kind;
    const label = localizedUiText(COST_CHIP_LABELS[kind] || "");
    chip.setAttribute("role", "img");
    chip.setAttribute("aria-label", `${Number(amount || 0).toLocaleString(uiLocale())} ${label}`.trim());
    const icon = document.createElement("i");
    icon.className = "cost-chip-icon is-token";
    icon.dataset.token = kind;
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = resourceTokenVisual(kind);
    const value = document.createElement("b");
    value.textContent = Number(amount || 0).toLocaleString(uiLocale());
    chip.append(icon, value);
    return chip;
  }

  // Düğme yazısı + maliyet rozetleri ("YÜKSELT" ◎ 100 ◈ 20).
  function setCostButtonLabel(button, label, costs = []) {
    if (!button) return;
    button.replaceChildren();
    button.classList.toggle("has-cost-chips", costs.length > 0);
    const text = document.createElement("span");
    text.className = "cost-button-label";
    text.textContent = label;
    button.appendChild(text);
    for (const [kind, amount] of costs) button.appendChild(createCostChip(kind, amount));
    const spoken = costs.map(([kind, amount]) => `${amount} ${localizedUiText(COST_CHIP_LABELS[kind] || "")}`).join(" · ");
    button.setAttribute("aria-label", spoken ? `${label} · ${spoken}` : label);
  }

  function resourceSymbolMarkup(kind) {
    const tokens = {
      flux_shards:"flux", circuit_credits:"credit", core_shards:"core", chest:"chest", experience:"experience",
    };
    return tokens[kind] ? resourceTokenMarkup(tokens[kind]) : createModulePuzzlePiece().outerHTML;
  }

  // Legacy helper name retained for callers. Presentation is now a miniature
  // module card, never a puzzle shape. Amount/identity remain in adjacent copy.
  function createModulePuzzlePiece({ category = "", glyph = "", universal = false } = {}) {
    const piece = document.createElement("span");
    piece.className = "resource-symbol module-reward-card";
    piece.dataset.category = universal ? "universal" : category;
    piece.setAttribute("aria-hidden", "true");
    piece.innerHTML = glyph || uiIconMarkup("deck");
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
      glyph:moduleEmblemMarkup(module),
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
      glyph: moduleEmblemMarkup(definition || { nameTr: collectionItem?.name_tr || "Modül" }),
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
      // Rewards use the same approved physical painting as every other core view.
      icon.className = "resource-symbol resource-symbol-core-card is-emblem";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = coreEmblemMarkup(identity.id);
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
      { kind:"universal_module_shards", amount:Number(rewards.universal_module_shards || 0), label:"Evrensel Modül Parçası", suffix:"" },
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
      universal_module_shards: 0,
      module_rewards: [],
      core_rewards: [],
    };
    const modules = new Map();
    const cores = new Map();
    for (const receipt of receipts) {
      const rewards = receipt?.rewards || {};
      totals.circuit_credits += Math.max(0, Number(rewards.circuit_credits || 0));
      totals.flux_shards += Math.max(0, Number(rewards.flux_shards || 0));
      totals.universal_module_shards += Math.max(0, Number(rewards.universal_module_shards || 0));
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
      universal_module_shards: totals.universal_module_shards,
    });
    const appendRows = (rewards) => {
      const rows = createRewardRows(rewards);
      while (rows.firstChild) list.appendChild(rows.firstChild);
    };
    for (const reward of totals.module_rewards || []) appendRows(reward);
    for (const reward of totals.core_rewards || []) appendRows(reward);
    for (const receipt of receipts) appendChestCosmeticRows(list, receipt.rewards);
    return list;
  }

  function appendChestCosmeticRows(list, rewards = {}) {
    const cosmetics = Object.fromEntries(["avatar_id", "avatar_frame_id", "emoji_id", "profile_background_id", "badge_id", "rank_trophy_id", "team_emblem_id", "team_frame_id", "team_name_color_id"].filter((key) => rewards[key]).map((key) => [key, rewards[key]]));
    for (const entry of rewardPreviewEntries(cosmetics)) {
      const row = document.createElement("div");
      row.className = "reward-resource-row";
      const label = document.createElement("span");
      label.textContent = entry.label;
      const amount = document.createElement("strong");
      amount.textContent = entry.amount;
      row.append(entry.visual, label, amount);
      list.appendChild(row);
    }
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
  let rewardPreviewCloseTimer = null;

  function cancelRewardPreviewClose() {
    clearTimeout(rewardPreviewCloseTimer);
    rewardPreviewCloseTimer = null;
  }

  function scheduleRewardPreviewClose(event) {
    if (!rewardPreviewState || rewardPreviewState.pinned) return;
    const { panel, trigger } = rewardPreviewState;
    if (event?.relatedTarget && (panel.contains(event.relatedTarget) || trigger.contains(event.relatedTarget))) return;
    cancelRewardPreviewClose();
    // Bridge the gap between chest and scrollable contents for mouse/pen users.
    rewardPreviewCloseTimer = setTimeout(() => {
      if (rewardPreviewState?.trigger === trigger && !rewardPreviewState.pinned) hideRewardPreview();
    }, 180);
  }

  function hideRewardPreview() {
    cancelRewardPreviewClose();
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
    const target = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const host = trigger.closest("dialog[open]")?.getBoundingClientRect();
    const bounds = {
      left:Math.max(margin, host ? host.left + margin : margin),
      right:Math.min(viewportWidth - margin, host ? host.right - margin : viewportWidth - margin),
      top:Math.max(margin, host ? host.top + margin : margin),
      bottom:Math.min(viewportHeight - margin, host ? host.bottom - margin : viewportHeight - margin),
    };
    const below = Math.max(0, bounds.bottom - target.bottom - margin);
    const above = Math.max(0, target.top - margin - bounds.top);
    panel.style.maxWidth = `${Math.max(1, bounds.right - bounds.left)}px`;
    panel.style.maxHeight = `${Math.max(1, Math.max(above, below))}px`;
    const origin = panel.getBoundingClientRect();
    const { width, height } = origin;
    let left = target.left + target.width / 2 - width / 2;
    left = Math.max(bounds.left, Math.min(left, bounds.right - width));
    // Long cosmetic bundles (notably the second-place prize) must never cover
    // their own hover target: that immediately triggered mouseleave before.
    const top = below >= height || below >= above
      ? target.bottom + margin
      : target.top - height - margin;
    panel.style.left = `${Math.round(left - origin.left)}px`;
    panel.style.top = `${Math.round(top - origin.top)}px`;
  }

  function showRewardPreview(trigger, { title, reward, note }) {
    cancelRewardPreviewClose();
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
    panel.addEventListener("pointerenter", cancelRewardPreviewClose);
    panel.addEventListener("mouseenter", cancelRewardPreviewClose);
    panel.addEventListener("pointerleave", scheduleRewardPreviewClose);
    panel.addEventListener("mouseleave", scheduleRewardPreviewClose);
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
    bindRewardPreview(button, { title, reward, note });
    return button;
  }

  // Sandık düğmesinin önizleme davranışı: fareyle üzerine gelince, klavyeyle
  // odaklanınca ya da dokununca içerik paneli açılır; dokunuş paneli sabitler.
  function bindRewardPreview(button, options) {
    button.addEventListener("pointerenter", (event) => {
      if (!event.pointerType || event.pointerType === "mouse" || event.pointerType === "pen") showRewardPreview(button, options);
    });
    button.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch" && rewardPreviewState?.trigger === button && !rewardPreviewState.pinned) {
        scheduleRewardPreviewClose(event);
      }
    });
    // Mouse-only fallback for hosts that do not dispatch pointerenter.
    button.addEventListener("mouseenter", (event) => {
      if (!event.sourceCapabilities?.firesTouchEvents) showRewardPreview(button, options);
    });
    button.addEventListener("mouseleave", (event) => {
      if (rewardPreviewState?.trigger === button && !rewardPreviewState.pinned) scheduleRewardPreviewClose(event);
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
  }

  document.addEventListener("pointerdown", (event) => {
    if (!rewardPreviewState) return;
    if (rewardPreviewState.panel.contains(event.target)) return;
    if (rewardPreviewState.trigger.contains(event.target)) return;
    hideRewardPreview();
  }, true);
  document.addEventListener("scroll", (event) => {
    if (rewardPreviewState?.panel.contains(event.target)) return;
    hideRewardPreview();
  }, true);
  window.addEventListener("resize", hideRewardPreview);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideRewardPreview();
  });

  // Lig amblemleri: her ligin kendi simgesi ve rengi vardır; kademe, simgenin
  // altındaki beş çentikten okunur. Lig bilgisini göndermeyen eski sunucuda
  // bütün ligler eskisi gibi taç simgesiyle görünür.
  const LEAGUE_EMBLEMS = Object.freeze({
    spark:'<path d="M12 2.5 13.8 9l6.7-1.6-4.9 4.6 4.9 4.6-6.7-1.6L12 21.5 10.2 15l-6.7 1.6L8.4 12 3.5 7.4 10.2 9Z"/>',
    volt:'<path d="M13.5 2 5 13.5h5.5L9 22l9-12.5h-5.8Z"/>',
    reactor:'<path d="M12 3 19.8 7.5v9L12 21 4.2 16.5v-9Z"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v5.8M19.8 16.5l-5-2.9M4.2 16.5l5-2.9"/>',
    quantum:'<ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.7"/>',
    nexus:'<path d="M12 3.2 20 12l-8 8.8L4 12Z"/><path d="M12 3.2v17.6M4 12h16"/><circle cx="12" cy="12" r="2.3"/>',
    champions:'<path d="M7 4h10v4.5a5 5 0 0 1-10 0Z"/><path d="M7 5.5H4.2c0 3 1.2 4.6 3.3 4.9M17 5.5h2.8c0 3-1.2 4.6-3.3 4.9M12 13.5V17M8.5 20h7M9.5 17h5v3h-5Z"/>',
    legendary:'<path d="M4 17.5 5.5 8l4 3.6L12 5l2.5 6.6 4-3.6 1.5 9.5Z"/><path d="M4.5 20.2h15"/><circle cx="12" cy="14.2" r="1.3"/>',
    gridshard:'<path d="M12 2 21 12 12 22 3 12Z"/><path d="M12 6.5 16.9 12 12 17.5 7.1 12Z"/><path d="M12 2v4.5M12 17.5V22M3 12h4.1M16.9 12H21"/>',
  });

  // Approved Package 4A assets. Keep the legacy paths above for chest artwork
  // until its separate preview is approved; league identity stays the same.
  const COMPETITION_TROPHY_ASSET = "./assets/ui/rating-trophy-v1/rating-trophy.webp";
  const LEAGUE_EMBLEM_ASSETS = Object.freeze({
    spark:"./assets/ui/leagues-v1/spark.webp",
    volt:"./assets/ui/leagues-v1/volt.webp",
    reactor:"./assets/ui/leagues-v1/reactor.webp",
    quantum:"./assets/ui/leagues-v1/quantum.webp",
    nexus:"./assets/ui/leagues-v1/nexus.webp",
    champions:COMPETITION_TROPHY_ASSET,
    legendary:"./assets/ui/leagues-v1/legendary.webp",
    gridshard:"./assets/ui/leagues-v1/gridshard.webp",
  });

  function leagueEmblemMarkup(stage) {
    const asset = Object.hasOwn(LEAGUE_EMBLEM_ASSETS, stage?.league || "")
      ? LEAGUE_EMBLEM_ASSETS[stage.league] : null;
    if (!asset) return "♛";
    const tiers = stage.league === "gridshard" ? 1 : 5;
    const rawTier = Number(stage.league_tier || 1);
    const tier = Number.isFinite(rawTier) ? Math.max(1, Math.min(tiers, Math.floor(rawTier))) : 1;
    const pips = tiers > 1
      ? `<span class="league-emblem-tier" aria-hidden="true">${Array.from({ length:tiers }, (_, index) => `<i${index < tier ? ' class="is-on"' : ""}></i>`).join("")}</span>`
      : "";
    return `<img class="league-emblem league-emblem-art" src="${asset}" width="44" height="44" alt="" aria-hidden="true" decoding="async">${pips}`;
  }

  // Mağaza sandığı (Bronz, Gümüş, Altın, Elmas) lig sandıklarıyla aynı dildedir
  // (dolu gövde, metal, koyu kontur) ama aynı sandık değildir: kapağı kubbe değil
  // pahlı düz kapaktır, ortasında tek geniş kuşak ve baklava kilit vardır. Kademe
  // yükseldikçe süsü artar: Bronz'da tahta oluklar, Gümüş'te köşebent ve perçin,
  // Altın'da kapakta taç, Elmas'ta kapaktan çıkan kristaller. Renkleri canon.css
  // `.chest-visual-<kademe>` ile verir. Aynı çizim mağazada, posta kutusunda,
  // sezon yolunda, turnuva ödüllerinde ve sandık açılışında kullanılır.
  const SHOP_CHEST_GROOVES = '<path class="sc-groove" d="M14 54.5h28M58 54.5h28M14 66h28M58 66h28"/>';
  const SHOP_CHEST_CAPS = '<path class="sc-cap" d="M14 62v11a6 6 0 0 0 6 6h11ZM86 62v11a6 6 0 0 1-6 6H69Z"/>'
    + '<circle class="sc-rivet" cx="18.6" cy="74.4" r="1.5"/><circle class="sc-rivet" cx="81.4" cy="74.4" r="1.5"/>';
  const SHOP_CHEST_RIVETS = '<circle class="sc-rivet" cx="18" cy="43" r="1.6"/><circle class="sc-rivet" cx="30" cy="43" r="1.6"/>'
    + '<circle class="sc-rivet" cx="70" cy="43" r="1.6"/><circle class="sc-rivet" cx="82" cy="43" r="1.6"/>';
  const SHOP_CHEST_ORNAMENTS = Object.freeze({
    bronze:{ body:SHOP_CHEST_GROOVES, lid:"", top:"" },
    silver:{ body:SHOP_CHEST_GROOVES + SHOP_CHEST_CAPS, lid:SHOP_CHEST_RIVETS, top:"" },
    gold:{
      body:SHOP_CHEST_CAPS,
      lid:SHOP_CHEST_RIVETS,
      top:'<path class="sc-crest" d="M38 16 36 5 44 10 50 2 56 10 64 5 62 16Z"/><circle class="sc-crest-gem" cx="50" cy="10.6" r="2.2"/>',
    },
    diamond:{
      body:SHOP_CHEST_CAPS,
      lid:SHOP_CHEST_RIVETS,
      top:'<path class="sc-crystal" d="M27 16 31 6 36 16ZM64 16 69 6 73 16ZM43 16 50 1 57 16Z"/>'
        + '<path class="sc-crystal-light" d="M43 16 50 1V16ZM27 16 31 6V16ZM64 16 69 6V16Z"/>'
        + '<path class="sc-spark" d="m84 9 1.3 3.2 3.2 1.3-3.2 1.3L84 18l-1.3-3.2-3.2-1.3 3.2-1.3ZM15 20l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L12 23l2.1-.9Z"/>',
    },
  });
  // Kilit taşı: mağaza sandığında baklava, haftalık turnuva sandığında yıldız,
  // takım turnuvası sandığında altıgen.
  const SHOP_CHEST_GEMS = Object.freeze({
    diamond:'<path class="sc-gem" d="M50 36.5 57.5 44 50 51.5 42.5 44Z"/><path class="sc-gem-light" d="M46.4 43.4 50 39.8"/>',
    star:'<path class="sc-gem" d="m50 35.4 2.5 6.1 6.1 2.5-6.1 2.5-2.5 6.1-2.5-6.1-6.1-2.5 6.1-2.5Z"/>',
    hex:'<path class="sc-gem" d="M50 36 57 40v8l-7 4-7-4v-8Z"/><path class="sc-gem-light" d="M45.6 41.4 50 38.9"/>',
  });

  function shopChestSvg(tier, mark = "diamond") {
    const ornament = SHOP_CHEST_ORNAMENTS[tier] || SHOP_CHEST_ORNAMENTS.bronze;
    return '<svg class="shop-chest" viewBox="0 0 100 86" focusable="false">'
      + '<ellipse class="sc-ground" cx="50" cy="80.5" rx="39" ry="4.8"/>'
      + '<g class="sc-rays"><path d="M50 44 27-24h12ZM50 44 44-30h12ZM50 44 61-24h12ZM50 44 0 2l7-9ZM50 44 93-7l7 9Z"/></g>'
      + '<path class="sc-inside" d="M16 44 20 30h60l4 14Z"/>'
      + '<path class="sc-inside-glow" d="M21 44 24 33h52l3 11Z"/>'
      + '<g class="sc-body">'
      + '<path class="sc-box" d="M14 42h72v31a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z"/>'
      + '<path class="sc-box-shade" d="M14 68h72v5a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z"/>'
      + '<path class="sc-box-light" d="M17 49.5h66v2.6H17Z"/>'
      + '<path class="sc-outline" d="M14 42h72v31a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z"/>'
      + ornament.body
      + '<path class="sc-band" d="M42 42h16v37H42Z"/>'
      + '<path class="sc-band-light" d="M44.2 46h2.6v31h-2.6Z"/>'
      + "</g>"
      + '<g class="sc-lid">'
      + ornament.top
      + '<path class="sc-lid-top" d="M12 44V29L23 15h54l11 14v15Z"/>'
      + '<path class="sc-lid-light" d="M23 15h54l6 7.6H17Z"/>'
      + '<path class="sc-lid-shade" d="M12 34h76v10H12Z"/>'
      + '<path class="sc-outline" d="M12 44V29L23 15h54l11 14v15Z"/>'
      + '<path class="sc-band" d="M42 15h16v29H42Z"/>'
      + '<path class="sc-band-light" d="M44.2 17h2.6v22h-2.6Z"/>'
      + '<path class="sc-rim" d="M9 38h82v8a3.4 3.4 0 0 1-3.4 3.4H12.4A3.4 3.4 0 0 1 9 46Z"/>'
      + '<path class="sc-rim-light" d="M12 40.2h76v1.9H12Z"/>'
      + ornament.lid
      + '<path class="sc-lock" d="M50 30.5 63.5 44 50 57.5 36.5 44Z"/>'
      + (SHOP_CHEST_GEMS[mark] || SHOP_CHEST_GEMS.diamond)
      + "</g>"
      + "</svg>";
  }

  // Lig sandığı fiziksel bir kasadır: dolu gövde, metal köşebentler, perçinler,
  // kapak ve kilidinde ligin amblemi. Rengi ligin rengidir (canon.css,
  // data-league-chest). Kapak ayrı bir gruptur: sandık açılınca kalkar, içinden
  // ışık çıkar. Çizim ortak; açık hali `open` ile verilir.
  function leagueChestMarkup(league, { open = false, reveal = false } = {}) {
    const safeLeague = String(league || "").replace(/[^a-z]/g, "");
    const painted = globalThis.GRIDSHARD_REWARD_CHEST_ART?.markup(`league_${safeLeague}`, { open, reveal });
    if (painted) return painted;
    const emblem = LEAGUE_EMBLEMS[safeLeague] || LEAGUE_EMBLEMS.gridshard;
    return `<svg class="league-chest${open ? " is-open" : ""}" data-league-chest="${safeLeague}" viewBox="0 0 100 96" aria-hidden="true">`
      + '<ellipse class="lc-ground" cx="50" cy="87.5" rx="39" ry="6.2"/>'
      + '<ellipse class="lc-pad" cx="50" cy="86" rx="33" ry="4.4"/>'
      + '<g class="lc-rays"><path d="M50 46 31 2h10ZM50 46 45 0h10ZM50 46 59 2h10ZM50 46 14 12l8-6ZM50 46 78 6l8 6Z"/></g>'
      + '<path class="lc-inside" d="M15 48 20 31h60l5 17Z"/>'
      + '<path class="lc-inside-glow" d="M20 48 24 35h52l4 13Z"/>'
      + '<g class="lc-body">'
      + '<path class="lc-box" d="M12 47h76v32a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z"/>'
      + '<path class="lc-box-shade" d="M12 70h76v9a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z"/>'
      + '<path class="lc-box-light" d="M22 50.5h56v3.6H22Z"/>'
      + '<rect class="lc-panel" x="24" y="58" width="17" height="19" rx="3"/>'
      + '<rect class="lc-panel" x="59" y="58" width="17" height="19" rx="3"/>'
      + '<path class="lc-trim" d="M8 46h13v40h-7a6 6 0 0 1-6-6Z"/>'
      + '<path class="lc-trim" d="M79 46h13v34a6 6 0 0 1-6 6h-7Z"/>'
      + '<path class="lc-trim-light" d="M10.6 49h3v32h-3ZM81.6 49h3v32h-3Z"/>'
      + '<path class="lc-trim-dark" d="M8 79h13v7h-7a6 6 0 0 1-6-6ZM79 79h13v1a6 6 0 0 1-6 6h-7Z"/>'
      + '<circle class="lc-rivet" cx="14.5" cy="54" r="1.9"/><circle class="lc-rivet" cx="14.5" cy="74" r="1.9"/>'
      + '<circle class="lc-rivet" cx="85.5" cy="54" r="1.9"/><circle class="lc-rivet" cx="85.5" cy="74" r="1.9"/>'
      + "</g>"
      + '<g class="lc-lid">'
      + '<path class="lc-lid-top" d="M11 46 17 24Q50 10 83 24l6 22Z"/>'
      + '<path class="lc-lid-shade" d="M11 46l2.6-9.6h72.8L89 46Z"/>'
      + '<path class="lc-lid-light" d="M25 24.5Q50 14.8 75 24.5"/>'
      + '<path class="lc-trim" d="M27.5 19.6 36 16.9 34.4 46H23.6Z"/>'
      + '<path class="lc-trim" d="M72.5 19.6 64 16.9 65.6 46H76.4Z"/>'
      + '<path class="lc-lip" d="M6.5 39.5h87V49a3.4 3.4 0 0 1-3.4 3.4H9.9A3.4 3.4 0 0 1 6.5 49Z"/>'
      + '<path class="lc-lip-light" d="M10 42h80v2.2H10Z"/>'
      + '<path class="lc-lock-plate" d="M38 36.5h24v15.5l-12 10-12-10Z"/>'
      + '<circle class="lc-gem" cx="50" cy="47.2" r="7.6"/>'
      + '<path class="lc-gem-light" d="M45.2 44.4a5.6 5.6 0 0 1 5-2.9"/>'
      + `<g class="lc-emblem" transform="translate(44.3 41.5) scale(.475)">${emblem}</g>`
      + "</g>"
      + "</svg>";
  }

  // Lig sandığının açılışı: sandık ortada büyür ve titrer, sunucu ödülü
  // onaylayınca kapak kalkar, ışık patlar ve ödüller sırayla belirir. Lig
  // sandığının içeriği sabittir (şansa bağlı değildir); gösterilen ödül
  // durağın kendi ödülüdür.
  const LEAGUE_CHEST_OPENING_MIN_MS = 950;

  function setChestRevealVisual({ tier = "bronze", league = "", visualId = "" } = {}) {
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    if (card) {
      card.dataset.tier = tier;
      if (league) card.dataset.league = league;
      else delete card.dataset.league;
    }
    if (!visual) return;
    const artId = league ? `league_${league}` : visualId;
    const paintedReward = globalThis.GRIDSHARD_REWARD_CHEST_ART?.markup(artId, { reveal:true, large:true });
    if (paintedReward) {
      visual.className = "chest-visual chest-visual-large chest-casual-reveal reward-chest-reveal";
      visual.innerHTML = paintedReward;
    } else if (league) {
      visual.className = "chest-reveal-league";
      visual.innerHTML = `${leagueChestMarkup(league)}<span class="chest-reveal-sparks" aria-hidden="true">${"<i></i>".repeat(10)}</span>`;
    } else {
      visual.className = `chest-visual chest-visual-large chest-visual-${tier}`;
      const painted = casualChestAsset(tier, { reveal:true });
      if (painted) {
        visual.className += " chest-casual-reveal";
        visual.innerHTML = painted;
      } else {
        visual.innerHTML = shopChestSvg(tier);
      }
    }
  }

  function showLeagueChestOpening(league, title) {
    setChestRevealVisual({ tier:"gold", league });
    const dialog = document.getElementById("chest-reveal-dialog");
    const card = document.getElementById("chest-reveal-card");
    const host = document.getElementById("chest-reveal-rewards");
    const close = document.getElementById("chest-reveal-close");
    const kicker = document.getElementById("chest-reveal-kicker");
    const titleEl = document.getElementById("chest-reveal-title");
    if (card) card.dataset.state = "opening";
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    if (titleEl) titleEl.textContent = title;
    if (host) host.innerHTML = '<div class="chest-opening-progress" aria-label="Sandık açılıyor"><strong>•••</strong></div>';
    if (close) { close.disabled = true; close.textContent = "AÇILIYOR…"; }
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function showLeagueChestReveal(rewards = {}) {
    const card = document.getElementById("chest-reveal-card");
    const host = document.getElementById("chest-reveal-rewards");
    const close = document.getElementById("chest-reveal-close");
    const kicker = document.getElementById("chest-reveal-kicker");
    if (card) card.dataset.state = "revealed";
    document.querySelector("#chest-reveal-visual .league-chest")?.classList.add("is-open");
    if (kicker) { kicker.hidden = false; kicker.textContent = "SANDIK AÇILDI"; }
    if (host) {
      host.replaceChildren();
      const rows = createRewardRows(rewards);
      appendChestCosmeticRows(rows, rewards);
      // Ödüller sırayla belirir.
      [...rows.children].forEach((row, index) => row.style.setProperty("--reveal-index", String(index)));
      host.appendChild(rows);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    triggerGridshardCue("energy_transfer");
  }

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
      // Duraktaki mağaza sandığı (Bronz, Gümüş, Altın, Elmas) mağazadaki çizimiyle görünür.
      const storeChestTier = rewards.chest_id ? chestTier({ id:rewards.chest_id }) : "";
      if (storeChestTier && STORE_CHEST_DEFINITION_IDS.has(rewards.chest_id)) return chestVisualMarkup(storeChestTier);
      // GRIDSHARD Sandığı kozmetik seti taşır; o da sandık simgesiyle görünür.
      if (rewards.chest_id || rewards.profile_background_id) return resourceSymbolMarkup("chest");
      if (rewards.core_shards) {
        const identity = coreRewardIdentity(rewards);
        const visual = CORE_VISUALS[identity.id] || CORE_VISUALS.core_resonance;
        return `<span class="resource-symbol resource-symbol-core-card is-emblem" data-core-type="${identity.id}" style="--core-accent:${visual.accent}" aria-hidden="true">${coreEmblemMarkup(identity.id)}</span>`;
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
      // Yol boyunca renk değişir: arenalar camgöbeğinden mora, ligler kendi rengine.
      if (isLeagueStage && stage.league) section.dataset.league = stage.league;
      else if (!isLeagueStage) section.style.setProperty("--stage-hue", String(178 + (Number(stage.index || 1) - 1) * 9));
      const head = document.createElement("header");
      head.className = "arena-path-stage-head";
      const marker = document.createElement("span");
      marker.className = "arena-path-marker";
      if (isLeagueStage) marker.innerHTML = leagueEmblemMarkup(stage);
      else marker.textContent = String(stage.index || "◇");
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
        renderTrophyCaption(detail, "", Number(stage.minimum_rating || 0), localizedMessage("arena.stage_rewards", {
          count:localizedNumber(nodeCount), core:coreCopy,
        }));
      } else {
        const next = stages[stages.indexOf(stage) + 1];
        renderTrophyCaption(detail, "", next
          ? `${localizedNumber(stage.minimum_rating || 0)}–${localizedNumber(Number(next.minimum_rating) - 1)}`
          : `${localizedNumber(stage.minimum_rating || 0)}+`,
        localizedMessage(next ? "arena.league_context" : "arena.peak_context"));
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
            mountModuleEmblem(card, { nameTr: item.name_tr });
            card.addEventListener("click", () => {
              selectedCollectionModuleId = item.definition_id;
              openModuleDetail();
            });
            cards.appendChild(card);
          }
          unlockArea.append(label, cards);
          section.appendChild(unlockArea);
        }
        // Bu arenada açılan çekirdek, modüllerden ayrı bir satırda durur.
        if (arena.core_unlock?.id) {
          const core = arena.core_unlock;
          const visual = CORE_VISUALS[core.id] || CORE_VISUALS.core_resonance;
          const coreArea = document.createElement("div");
          coreArea.className = "arena-module-unlocks arena-core-unlocks";
          const label = document.createElement("span");
          label.textContent = localizedUiText("BU ARENADA AÇILAN ÇEKİRDEK");
          const row = document.createElement("div");
          const card = document.createElement("button");
          card.type = "button";
          card.dataset.coreType = core.id;
          card.style.setProperty("--arena-module", visual.accent);
          card.setAttribute("aria-label", localizedUiText(core.name_tr || visual.nameTr));
          card.title = localizedUiText(core.name_tr || visual.nameTr);
          const glyph = document.createElement("i");
          glyph.setAttribute("aria-hidden", "true");
          mountCoreEmblem(glyph, core.id);
          card.appendChild(glyph);
          card.addEventListener("click", () => {
            selectedCollectionCoreId = core.id;
            openCoreDetail();
          });
          row.appendChild(card);
          coreArea.append(label, row);
          section.appendChild(coreArea);
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
          renderTrophyValue(trophy, Number(node.trophies));
          const glyph = document.createElement("i");
          glyph.setAttribute("aria-hidden", "true");
          glyph.innerHTML = rewardIcon(node.rewards);
          const caption = document.createElement("strong");
          caption.textContent = node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy, glyph, caption);
          if (node.claimable) {
            reward.setAttribute("aria-label", localizedMessage("reward.claim_aria", {reward:rewardDescription}));
          }
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
        // Lige girişte açılan modül (yalnız ligin ilk kademesinde).
        const leagueUnlocks = (metaProgressionState?.module_collection || [])
          .filter((item) => item.unlock_stage_id && item.unlock_stage_id === stage.id);
        if (leagueUnlocks.length) {
          const unlockArea = document.createElement("div");
          unlockArea.className = "arena-module-unlocks arena-league-module-unlocks";
          const label = document.createElement("span");
          label.textContent = localizedUiText(leagueUnlocks.length > 1 ? "BU LİGDE AÇILAN MODÜLLER" : "BU LİGDE AÇILAN MODÜL");
          const cards = document.createElement("div");
          for (const item of leagueUnlocks) {
            const card = document.createElement("button");
            card.type = "button";
            card.dataset.category = item.category || "";
            card.title = localizedUiText(item.name_tr);
            card.setAttribute("aria-label", localizedUiText(item.name_tr));
            mountModuleEmblem(card, { nameTr: item.name_tr });
            card.addEventListener("click", () => {
              selectedCollectionModuleId = item.definition_id;
              openModuleDetail();
            });
            cards.appendChild(card);
          }
          unlockArea.append(label, cards);
          section.appendChild(unlockArea);
        }
        const leagueRoad = document.createElement("div");
        leagueRoad.className = "arena-reward-road arena-league-reward-road";
        let chestStop = null;
        const claimLeagueNode = async (node, control) => {
          control.disabled = true;
          const status = document.getElementById("arena-reward-status");
          // Lig sandığı açılış penceresiyle alınır; ara ödüller yerinde alınır.
          const chestLeague = node.league_chest || (node.is_final_reward ? (stage.league || "gridshard") : "");
          const startedAt = performance.now();
          if (chestLeague) showLeagueChestOpening(chestLeague, localizedArenaRewardDescription(node));
          try {
            await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/arena/${encodeURIComponent(node.id)}/claim`);
            if (status) status.textContent = "";
            renderArenaPath();
            if (chestLeague) {
              const wait = Math.max(0, LEAGUE_CHEST_OPENING_MIN_MS - (performance.now() - startedAt));
              window.setTimeout(() => showLeagueChestReveal(node.rewards || {}), wait);
            }
          } catch (error) {
            if (status) status.textContent = error.message;
            control.disabled = false;
            if (chestLeague) showChestFailure(error);
          }
        };
        for (const node of stage.nodes || []) {
          const rewardDescription = localizedArenaRewardDescription(node);
          // Lig geçişindeki sandık ve modül ana ödüldür; kademe içindekiler ara ödül.
          const stateClass = `${node.claimed ? " is-claimed" : ""}${node.claimable ? " is-claimable" : ""}${node.is_main_reward || node.is_final_reward ? " is-main-reward" : ""}${node.is_final_reward ? " is-final-reward" : ""}`;
          const isNewReward = Boolean(node.claimable) && String(node.id) === highlightedArenaNodeId;
          const trophy = document.createElement("span");
          trophy.className = "arena-reward-trophy";
          renderTrophyValue(trophy, Number(node.trophies));
          // Lig sandığı hücre içinde durmaz; yolun ucunda, ulaşılacak hedef olarak
          // havada bekler. İçeriği diğer sandıklardaki gibi üzerine gelince ya da
          // dokununca açılan önizlemede görünür; almak için ayrı düğme vardır.
          if (node.league_chest || node.is_final_reward) {
            const stop = document.createElement("div");
            stop.className = `arena-reward-node is-floating-chest${stateClass}`;
            stop.dataset.arenaNodeId = String(node.id);
            stop.tabIndex = -1;
            stop.classList.toggle("is-new-reward", isNewReward);
            const chest = document.createElement("button");
            chest.type = "button";
            chest.className = "league-chest-button";
            chest.setAttribute("aria-expanded", "false");
            chest.setAttribute("aria-label", localizedMessage("reward.chest_preview_aria", {name:rewardDescription}));
            // Alınmış sandık açık durur: kapağı kalkmış, içi boş.
            chest.innerHTML = leagueChestMarkup(node.league_chest || stage.league || "gridshard", { open:Boolean(node.claimed) });
            if (!node.claimable) bindRewardPreview(chest, { title:rewardDescription, reward:node.rewards || {} });
            const name = document.createElement("strong");
            name.textContent = rewardDescription;
            stop.append(chest, name, trophy);
            if (node.claimable) {
              stop.classList.add("is-claimable");
              chest.setAttribute("aria-label", localizedMessage("reward.claim_aria", {reward:rewardDescription}));
              chest.addEventListener("click", () => claimLeagueNode(node, chest));
            } else if (node.claimed) {
              const state = document.createElement("small");
              state.className = "arena-league-chest-state";
              state.textContent = localizedMessage("reward.claimed");
              stop.appendChild(state);
            }
            chestStop = document.createElement("div");
            chestStop.className = "arena-league-chest-stop";
            chestStop.appendChild(stop);
            continue;
          }
          const reward = document.createElement("button");
          reward.type = "button";
          reward.className = `arena-reward-node${stateClass}`;
          reward.disabled = !node.claimable;
          reward.dataset.arenaNodeId = String(node.id);
          reward.classList.toggle("is-new-reward", isNewReward);
          const glyph = document.createElement("i");
          glyph.setAttribute("aria-hidden", "true");
          glyph.innerHTML = rewardIcon(node.rewards);
          const caption = document.createElement("strong");
          caption.textContent = node.claimed ? localizedMessage("reward.claimed") : rewardDescription;
          reward.append(trophy, glyph, caption);
          if (node.claimable) {
            reward.setAttribute("aria-label", localizedMessage("reward.claim_aria", {reward:rewardDescription}));
          }
          reward.addEventListener("click", () => claimLeagueNode(node, reward));
          leagueRoad.appendChild(reward);
        }
        if (leagueRoad.childElementCount) section.appendChild(leagueRoad);
        if (chestStop) section.appendChild(chestStop);
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

  function applyCoreVisualIdentity(element, coreId) {
    const normalizedId = CORE_VISUALS[coreId] ? coreId : "core_resonance";
    const visual = CORE_VISUALS[normalizedId];
    if (element) {
      element.dataset.coreType = normalizedId;
      element.style.setProperty("--core-accent", visual.accent);
    }
    return visual;
  }

  // One current physical painting for menus, rewards and deployed-core fallback.
  function coreEmblemMarkup(coreId) {
    const id = CORE_VISUALS[coreId] ? coreId : "core_resonance";
    return `<span class="core-emblem-set"><img class="core-physical-art" src="./assets/ui/cores-physical-v1/${id}.webp" alt="" aria-hidden="true" draggable="false"></span>`;
  }
  // Bir öğeyi çekirdek amblemine çevirir. Aynı çekirdek zaten çiziliyse dokunmaz
  // (savaşta her sunucu mesajında çağrılır).
  function mountCoreEmblem(element, coreId) {
    if (!element) return;
    const normalizedId = CORE_VISUALS[coreId] ? coreId : "core_resonance";
    if (element.dataset.coreEmblem === normalizedId && element.firstElementChild) return;
    element.innerHTML = coreEmblemMarkup(normalizedId);
    element.dataset.coreEmblem = normalizedId;
    element.classList.add("is-emblem");
    applyCoreVisualIdentity(element, normalizedId);
  }

  function renderHomeCoreHero() {
    const core = metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0]
      || null;
    const button = document.getElementById("home-core-hero");
    const glyph = document.getElementById("home-core-hero-glyph");
    const level = document.getElementById("home-core-hero-level");
    const coreId = core?.id || "core_resonance";
    applyCoreVisualIdentity(button, coreId);
    mountCoreEmblem(glyph, coreId);
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
    applyCoreVisualIdentity(tile, core.id);
    const glyph = document.createElement("span");
    glyph.className = "core-collection-glyph";
    mountCoreEmblem(glyph, core.id);
    glyph.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "core-collection-copy";
    const name = document.createElement("strong");
    name.textContent = core.name_tr;
    // Enderlik, bilgi penceresindeki rozetle aynı dilde yazar (renk enderlikten).
    const rarity = document.createElement("em");
    const rarityId = String(core.rarity || "common").toLowerCase();
    rarity.className = "rarity-chip";
    rarity.dataset.rarity = RARITY_ICON_TONES[rarityId] ? rarityId : "common";
    rarity.textContent = moduleRarityLabel(core.rarity).toLocaleUpperCase("tr-TR");
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
    // Yükseltilebilir çekirdek ya da seçilebilir yetenek: sağ üstte yeşil ok.
    const needsAttention = cardNeedsAttention("core", core);
    tile.dataset.upgradeAvailable = String(needsAttention);
    if (needsAttention) {
      tile.appendChild(createUpgradeArrow());
      tile.setAttribute("aria-label", `${tile.getAttribute("aria-label")} · ${localizedUiText("Yükseltme mevcut")}`);
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

  let renderedCoreCollection = null;
  function renderCoreCollection() {
    const host = document.getElementById("core-collection-list");
    if (!host) return;
    // Availability also changes when another operation spends/awards currency.
    const signature = JSON.stringify([metaProgressionState?.cores?.types,
      metaProgressionState?.flux_shards, metaProgressionState?.circuit_credits,
      metaProgressionState?.unavailable, document.documentElement.lang]);
    if (renderedCoreCollection?.host === host && renderedCoreCollection.signature === signature) return;
    renderedCoreCollection = {host, signature};
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
      metaProgressionState = withCanonicalModuleNames(payload);
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

  // Çekirdek yetenek eşiklerinin rozet rengi: modül yetenek ağacındaki tür renkleri.
  const CORE_SKILL_TIER_KINDS = Object.freeze(["basic", "tuning", "mastery"]);

  function renderCoreDetailTab(tabName) {
    const core = activeMetaCore();
    const host = document.getElementById("core-detail-tab-content");
    if (!core || !host) return;
    setDetailTabUpgradeArrow(document.querySelector('[data-core-detail-tab="skills"]'), coreSkillAvailable(core));
    host.replaceChildren();
    host.dataset.tab = tabName;
    document.getElementById("core-detail-dialog").dataset.detailTab = tabName;
    const intro = document.createElement("p");
    intro.className = "module-detail-tab-intro";
    if (tabName === "stats") {
      intro.textContent = "Seviye ve yeteneklerle gelişir; enderlik güç katmaz.";
      const list = document.createElement("dl");
      list.className = "module-stat-tiles core-stat-tiles";
      for (const [label, value, icon, tone] of [
        ["Enderlik", moduleRarityLabel(core.rarity), "rarity", "gold"],
        ["Sınıf", "Sistem", "grid", "blue"],
        ["Enerji üretimi", `${core.energy_per_second}/sn`, "energy", "cyan"],
        ["Enerji deposu", core.energy_capacity, "battery", "blue"],
        ["Seviye", `${core.level} / 15`, "boost", "green"],
        ["Yetenek", (core.skills || []).filter(skill => skill.learned).length, "star", "violet"],
      ]) {
        const row = document.createElement("div");
        row.dataset.tone = tone;
        // Savaş rolü bir cümledir; satırı doldurur ve metin boyunda yazılır (canon.css).
        if (label === "Savaş rolü") row.dataset.wide = "true";
        const name = document.createElement("dt");
        name.textContent = label;
        const amount = document.createElement("dd");
        amount.textContent = String(value);
        if (core.unlocked && core.next_stats) {
          const key = label === "Enerji üretimi" ? "energy_per_second" : label === "Enerji deposu" ? "energy_capacity" : null;
          const gain = key && createStatGain(core[key], core.next_stats[key], key === "energy_per_second" ? "per_second" : "");
          if (gain) amount.append(" ", gain);
        }
        row.append(createUiIcon(icon, tone), name, amount);
        list.appendChild(row);
      }
      host.appendChild(list);
      const signature = createStatSignature(core);
      if (signature) host.appendChild(signature);
    } else if (tabName === "skills") {
      // Modül yetenek ağacıyla aynı tasarım: her eşikte iki dal, ortada seviye rozeti
      // ve Akı bedeli. Açıklama düğmede değil, dokununca üstteki satırda yazar.
      const learnedSkills = (core.skills || []).filter((skill) => skill.learned);
      intro.textContent = learnedSkills.length
        ? talentDisplayDescription(learnedSkills[learnedSkills.length - 1])
        : "Her eşikte bir dal seç. Dokun: açıklama ve seçim.";
      const tree = document.createElement("div");
      tree.className = "module-talent-path core-talent-path";
      const tiers = new Map();
      for (const skill of core.skills || []) {
        const tierKey = String(skill.tier ?? skill.level);
        if (!tiers.has(tierKey)) tiers.set(tierKey, []);
        tiers.get(tierKey).push(skill);
      }
      [...tiers.values()].forEach((tierSkills, tierIndex) => {
        const threshold = tierSkills[0];
        const row = document.createElement("section");
        row.className = "module-talent-node";
        row.dataset.selected = tierSkills.find((skill) => skill.learned)?.id || "";
        row.dataset.reachable = String(Number(core.level) >= Number(threshold.level));
        const tierKind = CORE_SKILL_TIER_KINDS[Math.min(tierIndex, CORE_SKILL_TIER_KINDS.length - 1)];
        row.dataset.kind = tierKind;
        const level = document.createElement("span");
        level.className = "module-talent-level";
        level.title = localizedUiText(TALENT_KIND_LABELS[tierKind] || "Yetenek");
        const levelValue = document.createElement("strong");
        levelValue.textContent = `SV ${threshold.level}`;
        level.append(levelValue);
        appendTalentCosts(level, threshold);
        const kind = document.createElement("em");
        kind.className = "module-talent-kind";
        kind.textContent = localizedUiText(`EŞİK ${tierIndex + 1}`);
        const [kindIcon, kindTone] = TALENT_KIND_ICONS[tierKind] || ["star", "cyan"];
        kind.prepend(createUiIcon(kindIcon, kindTone));
        const choices = document.createElement("div");
        choices.className = "module-talent-choices";
        row.append(kind, choices);
        tierSkills.forEach((skill, skillIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          const canLearn = coreSkillLearnable(core, skill);
          button.className = `${skillIndex === 0 ? "is-left-choice" : "is-right-choice"}${skill.learned ? " is-selected" : ""}${canLearn ? "" : " is-unavailable"}`;
          const state = skill.learned
            ? "SEÇİLDİ"
            : skill.tier_selected ? "DİĞER DAL SEÇİLDİ"
              : core.level < skill.level ? `SV ${skill.level} GEREKLİ`
                : !talentAffordable(skill) ? talentCostShortfall(skill)
                  : "SEÇ";
          const skillName = document.createElement("strong");
          skillName.textContent = talentDisplayName(skill);
          const skillState = document.createElement("small");
          skillState.textContent = state;
          button.append(createUiIcon(kindIcon, kindTone), skillName, skillState);
          button.dataset.selectable = String(canLearn);
          button.setAttribute("aria-label", `${talentDisplayName(skill)} · ${state} · ${localizedUiText(TALENT_KIND_LABELS[tierKind] || "Yetenek")} · Açıklamayı göster`);
          button.title = talentDisplayDescription(skill);
          button.addEventListener("click", async () => {
            intro.textContent = talentDisplayDescription(skill);
            tree.querySelectorAll("button").forEach((candidate) => candidate.classList.toggle("is-previewed", candidate === button));
            if (!canLearn) return;
            button.disabled = true;
            try {
              await mutateSelectedCore(`skills/${skill.id}`);
              // Pencere yeniden çizilince Genel sekmesi açılır; seçim yapılan sekmede kalınır.
              for (const tab of document.querySelectorAll("[data-core-detail-tab]")) tab.classList.toggle("is-active", tab.dataset.coreDetailTab === "skills");
              renderCoreDetailTab("skills");
              document.getElementById("core-detail-status").textContent = "Yetenek kaydedildi.";
            } catch (error) { document.getElementById("core-detail-status").textContent = error.message; button.disabled = false; }
          });
          choices.appendChild(button);
          if (skillIndex === 0) choices.appendChild(level);
        });
        tree.appendChild(row);
      });
      host.appendChild(tree);
    } else {
      intro.textContent = GridshardDetailPages.description(core, {core:true, english:document.documentElement.lang === "en"});
      intro.title = serverCopy(core.role_tr, core.role_en);
    }
    host.prepend(intro);
    window.GridshardDetailPages?.mount(host, {item:core, core:true});
  }

  function openCoreDetail() {
    const core = activeMetaCore()
      || metaProgressionState?.cores?.types?.find((item) => item.selected)
      || metaProgressionState?.cores?.types?.[0];
    if (!core) return;
    selectedCollectionCoreId = core.id;
    const dialog = document.getElementById("core-detail-dialog");
    applyCoreVisualIdentity(dialog, core.id);
    const setText = (id, value) => { const target = document.getElementById(id); if (target) target.textContent = String(value); };
    setText("core-detail-name", core.name_tr);
    setRarityBadge("core-detail-rarity", String(core.rarity || "common").toLowerCase(), moduleRarityLabel(core.rarity).toLocaleUpperCase("tr-TR"));
    setText("core-detail-level", `SEVİYE ${core.level}`);
    setText("core-detail-selected-state", core.selected ? "SEÇİLDİ" : core.unlocked ? "HAZIR" : "KİLİTLİ");
    const cost = core.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const owned = Number(core.shards || 0) + Number(core.legacy_shards || 0);
    setText("core-detail-shards", cost ? `${owned} / ${required}` : "AZAMİ SEVİYE");
    const progress = document.getElementById("core-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, owned) : required; }
    const art = document.getElementById("core-detail-art");
    mountCoreEmblem(art, core.id);
    const nextStats = core.unlocked ? core.next_stats : null;
    renderDetailStatRow(document.getElementById("core-detail-stats"), [
      { label:"ENERJİ", value:`${core.energy_per_second}/sn`, current:core.energy_per_second, next:nextStats?.energy_per_second, unit:"per_second", icon:"energy", tone:"cyan" },
      { label:"DEPO", value:core.energy_capacity, current:core.energy_capacity, next:nextStats?.energy_capacity, icon:"battery", tone:"blue" },
      { label:"YETENEK", value:(core.skills || []).filter((skill) => skill.learned).length, icon:"star", tone:"gold" },
    ]);
    const select = document.getElementById("core-detail-select");
    if (select) { select.disabled = !core.unlocked || core.selected; select.textContent = core.selected ? "SEÇİLDİ" : core.unlocked ? "SEÇ" : "KİLİTLİ"; }
    const upgrade = document.getElementById("core-detail-upgrade");
    const canUpgrade = metaIndicatorsLive() && coreUpgradeAvailable(core);
    if (upgrade) {
      upgrade.disabled = !canUpgrade;
      upgrade.setAttribute("aria-disabled", String(upgrade.disabled));
      setCostButtonLabel(upgrade, localizedUiText(cost ? "YÜKSELT" : "AZAMİ SEVİYE"), cost
        ? [["credit", cost.circuit_credits], ["flux", cost.flux_shards]].filter(([, amount]) => Number(amount) > 0)
        : []);
    }
    const costCopy = cost ? [
      `${cost.shards} çekirdek parçası`,
      ...(Number(cost.circuit_credits) > 0 ? [`${Number(cost.circuit_credits).toLocaleString(uiLocale())} Devre Kredisi`] : []),
      ...(Number(cost.flux_shards) > 0 ? [`${Number(cost.flux_shards).toLocaleString(uiLocale())} Akı`] : []),
    ].join(" + ") : "";
    setText("core-detail-status", !core.unlocked ? `Arena ${core.unlock_arena} seviyesinde açılır.` : cost && !canUpgrade ? `${costCopy} gerekli.` : "");
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
    const { rank, rating, floor, ceiling } = arenaViewModel();
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
    renderTrophyCaption(document.getElementById("home-arena-progress-copy"), "", rank.next_stage ? `${localizedNumber(rating)} / ${localizedNumber(ceiling)}` : rating);
    const arenaTitle = rank.name_tr && !/^Arena\s+\d+$/i.test(rank.name_tr)
      ? `Arena ${rank.index || 1} · ${rank.name_tr}`
      : `Arena ${rank.index || 1}`;
    setText("arena-detail-title", rank.kind !== "arena" ? rank.name_tr : arenaTitle);
    renderTrophyValue("arena-detail-rating", rating);
    setText("arena-detail-range", rank.next_stage ? `${rating - floor} / ${ceiling - floor}` : "Azami aşama");
    if (rank.next_stage) renderTrophyCaption(document.getElementById("arena-detail-next"), localizedMessage("arena.next_stage_name", {name:rank.next_stage.name_tr}), ceiling);
    else setText("arena-detail-next", localizedMessage("arena.complete"));
    // Devre Yolu yüzlerce durak çizer. Pencere kapalıyken çizilmez (her ekran
    // değişiminde yeniden kurulması gezinmeyi takıltıyordu); açılırken çizilir.
    if (document.getElementById("arena-detail-dialog")?.open) renderArenaPath();
    const segments = document.getElementById("home-arena-segments");
    if (segments) {
      segments.replaceChildren();
      const arena = rank.kind === "arena"
        ? (metaProgressionState?.arena_path || []).find((item) => Number(item.index) === Number(rank.index))
        : null;
      const league = rank.kind !== "arena"
        ? (metaProgressionState?.rank_stages || []).find((item) => item.id === rank.id)
        : null;
      const road = GridshardHomeInterface.roadProgress(
        arena?.nodes || league?.nodes || [], floor, ceiling, rating, !rank.next_stage
      );
      segments.hidden = !road.stops.length;
      segments.style.setProperty("--road-stops", String(Math.max(1, road.stops.length)));
      segments.setAttribute("aria-valuemin", String(floor));
      segments.setAttribute("aria-valuemax", String(Math.max(floor + 1, road.ceiling)));
      segments.setAttribute("aria-valuenow", String(Math.max(floor, Math.min(road.ceiling, rating))));
      segments.setAttribute("aria-label", localizedMessage("arena.threshold_progress", {
        current:localizedNumber(road.completed), total:localizedNumber(road.stops.length),
      }));
      if (road.stops.length) renderTrophyCaption(document.getElementById("home-arena-progress-copy"), "",
      `${localizedNumber(rating)} / ${localizedNumber(road.ceiling)}`, localizedMessage("arena.threshold_progress", {
        current:localizedNumber(road.completed), total:localizedNumber(road.stops.length),
      }));
      road.stops.forEach((node) => {
        const segment = document.createElement("i");
        segment.className = node.fill >= 100 ? "is-complete" : node.fill > 0 ? "is-current" : "";
        segment.style.setProperty("--stop-fill", `${node.fill}%`);
        segment.setAttribute("aria-hidden", "true");
        segment.title = localizedMessage("arena.node_title", {
          trophies:localizedNumber(node.trophies),
          reward:"",
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
      // Desteye ekleyen düğme yeşil, desteden çıkaran kırmızıdır (canon.css).
      select.dataset.action = selected ? "remove" : "add";
      select.disabled = item.unlocked === false && !selected;
    }
    panel.hidden = false;
    panel.dataset.category = item.category || "";
    for (const tile of document.querySelectorAll(".collection-module-tile")) {
      tile.classList.toggle("is-focused", tile === anchor);
    }
    // Kutu en az kart genişliğindedir ve kartın altına ortalanır (çekirdeklerle aynı kural).
    positionQuickActions(panel, anchor, document.getElementById("modules-screen"));
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

  let renderedModuleCollection = null;
  function renderModuleCollection() {
    const state = metaProgressionState || fallbackMetaProgression();
    const host = document.getElementById("module-collection-grid");
    const signature = JSON.stringify([state.module_collection, deckEditorSlots, battlePoolPresets,
      activeBattlePoolPresetName, pendingDeckModuleInstanceId, activeModuleFilter,
      state.circuit_credits, state.flux_shards, state.universal_module_shards,
      state.unavailable, document.documentElement.lang]);
    if (renderedModuleCollection?.host === host && renderedModuleCollection.signature === signature) return;
    renderedModuleCollection = {host, signature};
    document.getElementById("module-quick-actions")?.setAttribute("hidden", "");
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("module-deck-count", `${deckEditorSlots.filter(Boolean).length} / 6`);
    renderDeckStrip(document.getElementById("module-deck-strip"), { editable: true });
    renderPresetStrip(document.getElementById("module-preset-strip"));
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

  const STORE_CHEST_DEFINITION_IDS = new Set(["field_3h", "circuit_8h", "core_24h", "diamond_24h"]);

  function chestTier(definition) {
    return definition?.visual_tier
      || ({field_3h:"bronze", circuit_8h:"silver", core_24h:"gold", diamond_24h:"diamond"})[definition?.id]
      || definition?.tier
      || "bronze";
  }

  function chestVisualMarkup(tier, { large = false, visualId = "" } = {}) {
    const customArt = globalThis.GRIDSHARD_REWARD_CHEST_ART?.markup(visualId, { large });
    if (customArt) return customArt;
    const customBase = {
      weekly_first:"diamond", weekly_second:"gold", weekly_third:"silver",
      team_first:"diamond", team_second:"gold", team_third:"silver",
    }[tier];
    const safeTier = ["bronze", "silver", "gold", "diamond"].includes(tier) ? tier : customBase || "bronze";
    const safeVisual = String(visualId || "").replace(/[^a-z0-9_-]/gi, "");
    // The same four standard chests appear in shop, inbox and reward tracks.
    // Keep custom tournament marks and the legacy large SVG fallback separate.
    if (!large && !safeVisual && ["bronze", "silver", "gold", "diamond"].includes(tier)) {
      const painted = casualChestAsset(safeTier);
      if (painted) return painted;
    }
    const mark = safeVisual.startsWith("team_") ? "hex" : safeVisual.startsWith("weekly_") ? "star" : "diamond";
    return `<span class="chest-visual chest-visual-${safeTier}${safeVisual ? ` chest-visual-event chest-visual-${safeVisual}` : ""}${large ? " chest-visual-large" : ""}" aria-hidden="true">${shopChestSvg(safeTier, mark)}</span>`;
  }

  // Inert templates declare every runtime image to the package whitelist.
  // Empty result is deliberate: callers may use the original SVG fallback.
  function casualChestAsset(tier, { reveal = false } = {}) {
    if (!["bronze", "silver", "gold", "diamond"].includes(tier) || typeof document === "undefined") return "";
    const asset = document.getElementById(reveal ? "casual-chest-reveal-assets" : "painted-shop-chest-assets")?.content
      ?.querySelector(`[data-painted-chest-tier="${tier}"]`);
    return asset?.outerHTML || "";
  }

  function paintedShopChestMarkup(tier) {
    return casualChestAsset(tier) || chestVisualMarkup(tier);
  }

  function shopChestAction({ gift, ownedCount, openableCount, item, state }) {
    const giftReady = gift && Number(gift.claim_remaining_seconds || 0) === 0 && gift.claim_available !== false;
    if (giftReady) return { kind:"gift", label:"HEDİYE SANDIK AÇ", disabled:Boolean(state.unavailable) };
    if (ownedCount > 0) return { kind:"open-all", label:`SANDIK AÇ (${ownedCount})`, disabled:Boolean(state.unavailable || openableCount === 0) };
    const exhausted = Number(item.daily_limit || 0) > 0 && Number(item.remaining_today ?? item.daily_limit) === 0;
    return { kind:"buy", label:exhausted ? "SINIR DOLDU" : `${item.cost} ${item.currency === "flux_shards" ? "Akı" : "DK"}`,
      disabled:Boolean(state.unavailable || exhausted || Number(state[item.currency] || 0) < Number(item.cost)) };
  }

  function renderShop() {
    const state = metaProgressionState || fallbackMetaProgression();
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    };
    setText("shop-flux-balance", `${state.flux_shards || 0} Akı`);
    setText("shop-credit-balance", `${state.circuit_credits || 0} DK`);
    const inventory = state.chests?.inventory || [];
    const slots = state.chests?.slots || [];
    const ownedChests = (definitionId) => inventory.find((item) => item.definition_id === definitionId) || {
      count: slots.filter((slot) => slot.definition_id === definitionId).length,
      openable_count: slots.filter((slot) => slot.definition_id === definitionId).length,
      locked_count: 0,
    };
    // Hediye olarak yalnız Bronz Sandık verilir; 8 saatte bir yenilenir. Ayrı bir
    // bölümü yoktur: düğmesi, satın alınan Bronz Sandık kartında durur.
    const giftDefinitions = (state.chests?.definitions || []).filter(
      (definition) => definition.gift ?? definition.id === "field_3h"
    );
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
        card.innerHTML = paintedShopChestMarkup(item.tier);
        const chestName = document.createElement("strong");
        chestName.textContent = item.name_tr;
        card.appendChild(chestName);
        const metadata = document.createElement("div");
        metadata.className = "chest-store-metadata";
        // Günlük alım hakkı: sayımı sunucu yapar. Bu alanları göndermeyen eski
        // sunucuda satır çıkmaz ve düğme yalnız bakiyeye bakar.
        const dailyLimit = Math.max(0, Number(item.daily_limit || 0));
        const remainingToday = dailyLimit > 0
          ? Math.max(0, Number(item.remaining_today ?? dailyLimit))
          : null;
        const limitReached = remainingToday === 0;
        if (dailyLimit > 0) {
          const limitStatus = document.createElement("small");
          limitStatus.className = "chest-store-limit";
          limitStatus.dataset.exhausted = String(limitReached);
          limitStatus.textContent = `Günlük alım hakkı ${remainingToday} / ${dailyLimit}`;
          metadata.appendChild(limitStatus);
        }
        const actions = document.createElement("div");
        actions.className = "shop-chest-actions";
        const gift = giftDefinitions.find((definition) => definition.id === item.definition_id);
        const remaining = gift ? Math.max(0, Number(gift.claim_remaining_seconds || 0)) : 0;
        if (gift) {
          // Geri sayım zamanlayıcısı kartı bu iki öznitelikle bulur.
          card.dataset.definitionId = gift.id;
          card.dataset.claimRemaining = String(remaining);
          card.dataset.claimReadyAt = String(Date.now() + remaining * 1000);
        }
        if (gift && remaining > 0) {
          const timer = document.createElement("small");
          timer.className = "chest-gift-countdown";
          timer.textContent = giftChestActionLabel(remaining);
          metadata.appendChild(timer);
        }
        const selectedAction = shopChestAction({ gift, ownedCount, openableCount, item, state });
        const action = document.createElement("button");
        action.type = "button";
        action.className = `shop-chest-action ${{ gift:"gift-chest-action", "open-all":"chest-open-all-action", buy:"chest-store-buy" }[selectedAction.kind]}`;
        action.textContent = selectedAction.label;
        action.dataset.limitReached = String(limitReached);
        action.disabled = selectedAction.disabled;
        if (selectedAction.kind === "buy" && !limitReached) {
          // Fiyat "DK" / "Akı" yazısıyla değil, kaynağın simgesiyle gösterilir;
          // adı ekran okuyucu için etikette durur.
          action.replaceChildren(createCostChip(item.currency === "flux_shards" ? "flux" : "credit", item.cost));
          action.classList.add("has-cost-chips");
          action.setAttribute("aria-label", `${item.name_tr} · ${selectedAction.label}`);
          if (Number(item.cost) < Number(item.base_cost)) {
            const base = document.createElement("s");
            base.textContent = Number(item.base_cost).toLocaleString(uiLocale());
            base.setAttribute("aria-label", `${item.base_cost} ${currency}`);
            action.prepend(base);
          }
        }
        action.addEventListener("click", () => {
          action.disabled = true;
          if (selectedAction.kind === "gift") void claimGiftChest(gift.id);
          else if (selectedAction.kind === "open-all") void openAllAvailableChests(item.definition_id);
          else void buyStoreChest(item.definition_id);
        });
        actions.appendChild(action);
        card.append(metadata, actions);
        storeHost.appendChild(card);
      }
    }
    // Alım haklarının yenilendiği saat oyuncunun kendi saatiyle yazılır.
    const limitNote = document.getElementById("chest-store-limit-note");
    if (limitNote) {
      const resetsAt = chestStore?.limit_resets_at ? new Date(chestStore.limit_resets_at) : null;
      const known = Boolean(resetsAt && !Number.isNaN(resetsAt.getTime()));
      limitNote.hidden = !known;
      limitNote.textContent = known
        ? `Alım hakları her gün yenilenir (saat ${String(resetsAt.getHours()).padStart(2, "0")}:${String(resetsAt.getMinutes()).padStart(2, "0")}).`
        : "";
    }
    const oddsTab = document.getElementById("chest-odds-open");
    if (oddsTab) {
      oddsTab.hidden = !(chestStore?.items || []).some((item) => chestOddsSummary(item));
      oddsTab.onclick = openChestOdds;
    }
    renderPaidStore();
    ensureShopCountdownTimer();
 }

  function giftChestActionLabel(remainingSeconds) {
    return remainingSeconds > 0
      ? `HEDİYE · ${formatChestCountdown(remainingSeconds)}`
      : "HEDİYE SANDIK AÇ";
  }

  // Mağaza sandığının içerik olasılıkları. Sunucudan gelir ve satın almadan
  // önce, satın alma düğmesinin yanında gösterilir (Google Play ödeme
  // politikası; docs/CHILD_AUDIENCE_AUDIT.md). Yüzde, sandığın o ödülü içerme
  // olasılığıdır.
  function chestOddsPercent(value) {
    return localizedNumber(Math.round(Number(value || 0) * 1000) / 10);
  }

  function chestOddsSummary(item) {
    if (item?.module_drop_chance === undefined || !item.module_rarity_drop_odds) return "";
    const module = chestOddsPercent(item.module_drop_chance);
    return Number(item.core_drop_chance || 0) > 0
      ? localizedMessage("store.odds_card_core", { module, core:chestOddsPercent(item.core_drop_chance) })
      : localizedMessage("store.odds_card", { module });
  }

  function chestOddsLines(item) {
    const preview = item.reward_preview || {};
    const range = (values) => {
      const low = Number(values?.[0] ?? 0);
      const high = Number(values?.[1] ?? low);
      return low === high ? localizedNumber(low) : `${localizedNumber(low)}–${localizedNumber(high)}`;
    };
    const lines = [
      { text:localizedMessage("store.odds_guaranteed", { label:localizedUiText("Devre Kredisi"), range:range(preview.circuit_credits) }) },
      { text:localizedMessage("store.odds_guaranteed", { label:localizedUiText("Akı"), range:range(preview.flux_shards) }) },
      { text:localizedMessage("store.odds_module", { chance:chestOddsPercent(item.module_drop_chance) }) },
    ];
    const rarityNames = { common:"Yaygın", rare:"Nadir", epic:"Epik", legendary:"Efsanevi" };
    for (const rarity of ["common", "rare", "epic", "legendary"]) {
      const chance = Number(item.module_rarity_drop_odds?.[rarity] || 0);
      if (!(chance > 0)) continue;
      lines.push({
        nested:true,
        text:localizedMessage("store.odds_rarity", {
          rarity:localizedUiText(rarityNames[rarity]),
          chance:chestOddsPercent(chance),
          range:range(item.shards_by_rarity?.[rarity]),
          count:Number(item.shards_by_rarity?.[rarity]?.[1] ?? 0),
        }),
      });
    }
    if (Number(item.core_drop_chance || 0) > 0) {
      const corePieces = Math.max(1, Number(item.core_drop_shards || 1));
      lines.push({ text:localizedMessage("store.odds_core", {
        chance:chestOddsPercent(item.core_drop_chance), amount:localizedNumber(corePieces), count:corePieces,
      }) });
    }
    return lines;
  }

  // Ödül listesi: mağazadaki bütün sandıkların içeriği ve olasılıkları tek pencerede.
  function openChestOdds() {
    const items = (metaProgressionState?.shop?.chest_store?.items || [])
      .filter((item) => chestOddsSummary(item));
    const dialog = document.getElementById("chest-odds-dialog");
    const host = document.getElementById("chest-odds-list");
    if (!items.length || !dialog || !host) return;
    host.replaceChildren(...items.map((item) => {
      const group = document.createElement("section");
      group.className = "chest-odds-group";
      group.dataset.tier = item.tier;
      const heading = document.createElement("h3");
      heading.textContent = item.name_tr || "Sandık";
      const list = document.createElement("ul");
      list.className = "chest-odds-list";
      list.replaceChildren(...chestOddsLines(item).map((line) => {
        const row = document.createElement("li");
        if (line.nested) row.className = "is-nested";
        row.textContent = line.text;
        return row;
      }));
      group.append(heading, list);
      return group;
    }));
    host.scrollTop = 0;
    const close = document.getElementById("chest-odds-close");
    if (close) close.onclick = () => dialog.close();
    // Pencerenin dışındaki boş yere dokunmak kapatır; içine dokunmak kapatmaz.
    dialog.onclick = (event) => {
      const box = dialog.getBoundingClientRect();
      const inside = event.clientX >= box.left && event.clientX <= box.right
        && event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) dialog.close();
    };
    if (!dialog.open) dialog.showModal();
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
  function stopShopCountdownTimer(){
    if(shopCountdownTimer !== null)window.clearInterval(shopCountdownTimer);
    shopCountdownTimer=null;
  }
  function ensureShopCountdownTimer() {
    if (shopCountdownTimer !== null || document.hidden || document.body.dataset.appScreen !== "shop") return;
    shopCountdownTimer = window.setInterval(() => {
      if (document.hidden || document.body.dataset.appScreen !== "shop") return;
      let becameAvailable = false;
      for (const card of document.querySelectorAll("[data-definition-id][data-claim-remaining]")) {
        const previous = Math.max(0, Number(card.dataset.claimRemaining || 0));
        // Background tabs throttle timers: elapsed time, not callback count,
        // determines the display. The server still decides when a gift is claimable.
        const readyAt = Number(card.dataset.claimReadyAt);
        const next = Number.isFinite(readyAt)
          ? Math.max(0, Math.ceil((readyAt - Date.now()) / 1000))
          : Math.max(0, previous - 1);
        card.dataset.claimRemaining = String(next);
        const timer = card.querySelector(".chest-gift-countdown");
        if (timer && next > 0) timer.textContent = giftChestActionLabel(next);
        // Hediye düğmesi o an görünmüyor olabilir (kartta SANDIK AÇ duruyorsa);
        // süre dolunca mağaza yine yenilenir ve düğme hediyeye döner.
        if (next === 0 && previous > 0) becameAvailable = true;
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
        metaProgressionState = withCanonicalModuleNames(payload.meta_progression || payload);
        if (payload.profile) profileState.applyProfile(payload.profile);
        renderProfileSummary();
        renderMetaHubScreens();
        void loadRewardInbox({ quiet:true });
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
    setChestRevealVisual({ tier, visualId:receipt.chest_visual_id || rewards.chest_visual_id || definition?.chest_visual_id || "" });
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (title) title.textContent = rewards.chest_name_tr || definition?.name_tr || storeItem?.name_tr || "Sandık";
    if (kicker) { kicker.hidden = true; kicker.textContent = ""; }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    if (host) {
      host.replaceChildren();
      const rows = createRewardRows(rewards);
      appendChestCosmeticRows(rows, rewards);
      [...rows.children].forEach((row, index) => row.style.setProperty("--reveal-index", String(index)));
      host.appendChild(rows);
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
    // A mixed batch cannot truthfully use one player's rank chest artwork.
    const visualIds = [...new Set(receipts.map(item => item.chest_visual_id || item.rewards?.chest_visual_id || ""))];
    setChestRevealVisual({ tier, visualId:visualIds.length === 1 ? visualIds[0] : "" });
    if (card) { card.dataset.tier = tier; card.dataset.state = "revealed"; }
    if (title) title.textContent = `${visualIds.length === 1 && receipts[0]?.rewards?.chest_name_tr || definition?.name_tr || "Sandık"} · ${receipts.length} açıldı`;
    if (kicker) {
      kicker.hidden = !batchReceipt?.partial;
      kicker.textContent = batchReceipt?.partial
        ? `${receipts.length} AÇILDI · ${batchReceipt.remaining_count || 0} KALDI`
        : "";
    }
    if (host) {
      host.replaceChildren();
      const section = document.createElement("section");
      section.className = "bulk-chest-reward";
      const label = document.createElement("small");
      label.textContent = `${receipts.length} SANDIĞIN TOPLAM ÖDÜLÜ`;
      const rows = createBulkRewardRows(batchReceipt);
      [...rows.children].forEach((row, index) => row.style.setProperty("--reveal-index", String(index)));
      section.append(label, rows);
      host.appendChild(section);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
    const dialog = document.getElementById("chest-reveal-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
  }

  function showChestOpening({ tier = "bronze", title = "Sandık", visualId = "" } = {}) {
    const dialog = document.getElementById("chest-reveal-dialog");
    const card = document.getElementById("chest-reveal-card");
    const visual = document.getElementById("chest-reveal-visual");
    const host = document.getElementById("chest-reveal-rewards");
    const close = document.getElementById("chest-reveal-close");
    setChestRevealVisual({ tier, visualId });
    if (card) { card.dataset.tier = tier; card.dataset.state = "opening"; }
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
      // Hata metni sunucudan gelebilir; HTML olarak yorumlanmaz.
      const message = document.createElement("span");
      message.textContent = localizedUiText(error instanceof Error ? error.message : String(error));
      const wrap = document.createElement("div");
      wrap.appendChild(message);
      host.replaceChildren(wrap);
    }
    if (close) { close.disabled = false; close.textContent = "DEVAM"; }
  }

  // Başarısız işlemden sonra o işlemin düğmesini yeniden açar. Sandık kartında
  // birden çok düğme olabilir (satın al, hediye, hepsini aç); `action` hangisi
  // olduğunu söyler.
  function restoreShopAction({ chestId = null, definitionId = null, storeChestId = null, action = "" } = {}) {
    const find = (attribute, value) => [...document.querySelectorAll(`[${attribute}]`)]
      .find((item) => item.getAttribute(attribute) === String(value));
    const card = (chestId && find("data-chest-id", chestId))
      || (definitionId && (find("data-definition-id", definitionId) || find("data-store-chest-id", definitionId)))
      || (storeChestId && find("data-store-chest-id", storeChestId))
      || null;
    const selector = { gift:".gift-chest-action", "open-all":".chest-open-all-action", buy:".chest-store-buy" }[action];
    const button = card?.querySelector(selector || "button");
    // Geri sayımı süren hediye düğmesi kapalı kalır.
    const waiting = action === "gift" && Number(card?.dataset.claimRemaining || 0) > 0;
    if (button && !waiting) button.disabled = false;
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
    setChestRevealVisual({ tier, visualId:chest.chest_visual_id || definition?.chest_visual_id || "" });
    if (card) { card.dataset.tier = tier; card.dataset.state = "claimed"; }
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
      restoreShopAction({ storeChestId: definitionId, action:"buy" });
      showChestFailure(error);
    }
  }

  const PAID_ICON_TOKENS = Object.freeze({ flux_shards:"flux", circuit_credits:"credit" });

  async function loadStoreState() {
    try {
      storeState = await requestJsonWithDeadline(
        `/store/${encodeURIComponent(participantPlayerId)}${storePolicyQuery()}`,
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

  function createPaidProductCard(product, { premium = false, provider = null, rank = 0 } = {}) {
    const card = document.createElement("article");
    card.className = `paid-product-card${premium ? " is-premium" : ""}`;
    card.dataset.productId = product.id;
    card.dataset.active = String(Boolean(product.active));
    if (product.currency) card.dataset.currency = product.currency;
    // Bonuslu paketin etiketi rozet olarak çizilir; büyük pakette simge büyür.
    if (!premium) {
      card.dataset.bonus = String(Boolean(product.bonus_percent));
      card.dataset.packRank = String(Math.max(0, Math.min(3, Number(rank) || 0)));
    }
    const icon = premium ? createUiIcon("gift") : document.createElement("i");
    const token = PAID_ICON_TOKENS[product.currency] || "premium";
    if (premium) icon.classList.add("premium-offer-art");
    else {
      icon.className = `resource-symbol ${RESOURCE_TOKEN_CLASS[token]} is-token`;
      icon.dataset.token = token;
      icon.innerHTML = resourceTokenVisual(token);
    }
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.name_tr;
    copy.appendChild(name);
    const detail = document.createElement("small");
    detail.textContent = premium
      ? String((document.documentElement.lang === "en" && product.description_en) || product.description_tr || "")
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
    if (product?.purchasable === false || product?.update_required) return false;
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
  const declinedPremiumRecoveries = new Set();

  function storePolicyQuery() {
    return globalThis.GridshardPremiumRefundPolicy.query(nativeStore?.adQuery() || "");
  }

  function confirmPremiumRefundPolicy(product) {
    return globalThis.GridshardPremiumRefundPolicy.acknowledge(
      product, (message) => window.confirm(message), document.documentElement.lang
    );
  }

  async function submitRecoveredPurchase(native, premiumPolicyAck = "") {
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
        `/store/${encodeURIComponent(participantPlayerId)}/purchases${storePolicyQuery()}`,
        {
          method:"POST",
          body:JSON.stringify({
            product_id:product.id,
            provider,
            transaction_id:native.transactionId,
            purchase_token:native.purchaseToken,
            ...(premiumPolicyAck ? {premium_policy_ack:premiumPolicyAck} : {}),
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
      if (payload.meta_progression) metaProgressionState = withCanonicalModuleNames(payload.meta_progression);
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      renderMetaHubScreens();
      renderPaidStore();
      void loadRewardInbox({ quiet:true });
    } catch (error) {
      if (error?.code === "premium_policy_ack_required" && !premiumPolicyAck) {
        const key = nativeStore.purchaseKey(native);
        if (!declinedPremiumRecoveries.has(key)) {
          const acknowledgement = confirmPremiumRefundPolicy({...product,
            reward_recovery_on_refund:true,
            refund_policy_version:globalThis.GridshardPremiumRefundPolicy.VERSION});
          if (acknowledgement) return submitRecoveredPurchase(native, acknowledgement);
          declinedPremiumRecoveries.add(key);
        }
        // Retain this already-paid receipt for an explicit later retry from
        // the Store button, rather than opening a second payment window.
        pendingNativePurchases.set(product.id, native);
        // Never consume or mark a paid receipt as granted on declined consent.
        return;
      }
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
      const language = document.documentElement.lang;
      const deficits = globalThis.GridshardPremiumRefundPolicy.deficits(
        storeState?.premium_refund_status, language, (resource) => {
          const [kind, id] = resource.split(":");
          const name = localizedUiText(metaModuleDefinition({definition_id:id})?.nameTr || id);
          return `${name} ${language === "en" ? "pieces" : kind === "module_shards" ? "modül parçası" : "çekirdek parçası"}`;
        }
      );
      if (deficits.length) {
        const notice = document.createElement("p");
        notice.className = "paid-refund-deficits";
        notice.setAttribute("role", "status");
        notice.textContent = `${language === "en" ? "Refund deficits (clear by playing; no cash debt)" : "İade açıkları (oynayarak kapanır; para borcu değildir)"}: ${deficits.join(" · ")}`;
        premiumHost.appendChild(notice);
      }
    }
    for (const [host, packs] of [[fluxHost, storeState?.flux_packs], [creditHost, storeState?.credit_packs]]) {
      if (!host) continue;
      host.replaceChildren();
      for (const [rank, pack] of (packs || []).entries()) host.appendChild(createPaidProductCard(pack, { provider, rank }));
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
    let premiumPolicyAck = "";
    renderPaidStore();
    try {
      const product = paidProductById(productId);
      premiumPolicyAck = confirmPremiumRefundPolicy(product);
      if (premiumPolicyAck === null) return {ok:false, cancelled:true};
      if (realStore) {
        // Mağazada ödenmiş ama sunucuya işlenmemiş alım varsa yeniden ödeme
        // penceresi açılmaz; aynı makbuz sunucuya tekrar gönderilir.
        native = pendingNativePurchases.get(productId) || null;
        if (!native) {
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
        `/store/${encodeURIComponent(participantPlayerId)}/purchases${storePolicyQuery()}`,
        {
          method:"POST",
          body:JSON.stringify({
            product_id:productId,
            provider,
            transaction_id:transactionId,
            purchase_token:purchaseToken,
            ...(premiumPolicyAck ? {premium_policy_ack:premiumPolicyAck} : {}),
          }),
        },
        20000
      );
      pendingPurchaseIds.delete(productId);
      pendingNativePurchases.delete(productId);
      void loadRewardInbox({ quiet:true });
      if (native) {
        // iOS'ta işlem bitirilir; Android'de sunucu tüketemediyse tüketilir.
        await nativeStore.finishPurchase(native, {
          granted:true,
          consumed:Boolean(payload.receipt?.consumed),
        });
        nativeStore.markProcessed(native);
      }
      storeState = payload.store || storeState;
      if (payload.meta_progression) metaProgressionState = withCanonicalModuleNames(payload.meta_progression);
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
    if (pass?.season_active === false || profileState.profile?.engagement?.season_active === false) button.hidden = true;
    button.disabled = Boolean(!currentPurchaseProvider() || purchaseInFlight || !paidProductAvailable(pass));
    button.textContent = `ÜCRETLİ GEÇİŞİ AÇ · ${paidProductPrice(pass, engagementPass?.price_label_tr || "199,99 TL")}`;
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
      buy.textContent = `SAVAŞ PREMIUM · ${paidProductPrice(product,"199,99 TL")}`;
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
    const awaitingClaim = provider === "admob" && !isPublisherTest && pendingAdRewardClaims.has(battleId);
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
        : adRewardPending ? (adRewardClaimPending ? localizedUiText("ÖDÜL DOĞRULANIYOR…") : "REKLAM OYNATILIYOR…")
        : awaitingClaim ? localizedUiText("ÖDÜLÜ KONTROL ET")
        : isPublisherTest ? localizedUiText("▶ TEST REKLAMINI AÇ") : "▶ REKLAM İZLE · x2";
    }
    if (copy) {
      copy.textContent = claimed
        ? `+${claimed.circuit_credits} Devre Kredisi ve +${claimed.xp} Deneyim eklendi · kupa hariç`
        : !provider ? "Ödüllü reklam sağlayıcısı bu sunucuda henüz etkin değil."
        : isPublisherTest ? localizedUiText("Test reklamı · gerçek ek ödül verilmez")
        : awaitingClaim ? localizedUiText("Reklam tamamlandı. Ödülü yeniden reklam izlemeden kontrol edebilirsin.")
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
    const requestId = operationRequestId("ad");
    const request = () => requestJsonWithDeadline(
      `/profile/${encodeURIComponent(participantPlayerId)}/battles/${encodeURIComponent(battleId)}/ad-reward`,
      {
        method:"POST",
        body:JSON.stringify({ request_id:requestId, provider, ...(provider === "admob" ? nativeStore?.adCapability() : {}) }),
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
        if (attempt < 5) await new Promise((resolve) => { window.setTimeout(resolve, 1500); });
      }
    }
    throw lastError;
  }

  async function watchRewardAd() {
    const battleId = postMatchSync.lastBattleId;
    const provider = currentAdProvider();
    const adStoreState = storeState;
    const isPublisherTest = provider === "admob" && adStoreState?.providers?.ad_policy?.mode === "test";
    const status = document.getElementById("post-match-store-status");
    if (!battleId || !provider || adRewardPending || adRewardReceipts.has(battleId)) return;
    gridshardAudioDirector?.stopResultPlayback();
    adRewardPending = true;
    adRewardClaimPending = provider === "admob" && !isPublisherTest && pendingAdRewardClaims.has(battleId);
    if (status) status.textContent = "";
    renderPostMatchAdReward();
    try {
      if (provider === "admob") {
        if (isPublisherTest || !pendingAdRewardClaims.has(battleId)) {
          await nativeStore.showRewardedAd({ storeState:adStoreState, userId:participantPlayerId, battleId });
        }
        if (isPublisherTest) {
          if (status) status.textContent = localizedUiText("Test reklamı tamamlandı; gerçek ek ödül verilmez.");
          return; // Test ads are not proof of a signed SSV callback.
        }
        pendingAdRewardClaims.add(battleId);
      } else {
        await playTestRewardAd();
      }
      adRewardClaimPending = true;
      renderPostMatchAdReward();
      const payload = await claimAdReward(battleId, provider);
      adRewardReceipts.set(battleId, payload.receipt);
      pendingAdRewardClaims.delete(battleId);
      if (payload.profile) profileState.applyProfile(payload.profile);
      renderProfileSummary();
      if (status) status.textContent = "";
      renderPostMatchRewards();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      adRewardPending = false;
      adRewardClaimPending = false;
      renderPostMatchAdReward();
      renderAdsPrivacyOptions();
    }
  }


  async function openAllAvailableChests(definitionId) {
    const status = document.getElementById("shop-action-status");
    const definition = metaProgressionState?.chests?.definitions?.find(
      (item) => item.id === definitionId
    );
    const visualIds = [...new Set((metaProgressionState?.chests?.slots || [])
      .filter(item => item.definition_id === definitionId).map(item => item.chest_visual_id || ""))];
    showChestOpening({
      tier: chestTier(definition || { id: definitionId }),
      title: `${definition?.name_tr || "Sandık"} sandıkları`,
      visualId:visualIds.length === 1 ? visualIds[0] : "",
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
      restoreShopAction({ definitionId, action:"open-all" });
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
      restoreShopAction({ definitionId, action:"gift" });
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


  // Enderliğin rengi her yerde aynıdır: sıradan çelik, ender mavi, destansı mor,
  // efsanevi altın (bilgi penceresinin başlığı, kimlik satırı ve değer rozetleri).
  const RARITY_ICON_TONES = Object.freeze({ common:"steel", rare:"blue", epic:"violet", legendary:"gold" });
  function setRarityBadge(id, rarity, label) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = String(label);
    badge.dataset.rarity = RARITY_ICON_TONES[rarity] ? rarity : "common";
  }

  // Sunucudan iki dilde gelen metin; İngilizcesi yoksa çeviri sözlüğünden geçer.
  function serverCopy(turkish, english) {
    return document.documentElement.lang === "en" && english ? english : localizedUiText(turkish || "");
  }

  // Modüle özgü değerin yazımı: "%60", "1,2 sn", "2×9", "12/sn".
  function specialDisplayValue(special) {
    const english = document.documentElement.lang === "en";
    const unit = special?.unit;
    const number = Number(special?.value || 0).toLocaleString(uiLocale(), {
      maximumFractionDigits:unit === "percent" || unit === "hp" || unit === "energy" || unit === "damage" ? 1 : 2,
    });
    const times = Number(special?.times) > 1 ? `${special.times}×` : "";
    if (unit === "percent" || unit === "heat") return `${times}${english ? `${number}%` : `%${number}`}`;
    if (unit === "seconds") return `${times}${number} ${english ? "sec" : "sn"}`;
    if (unit === "per_second") return `${times}${number}/${english ? "sec" : "sn"}`;
    return `${times}${number}`;
  }

  function specialLabel(special) {
    // Also clarify the metric when talking to an older local server.
    if (special?.key === "dps") return document.documentElement.lang === "en" ? "THEORETICAL DPS" : "TEORİK HASAR/SN";
    return serverCopy(special?.label_tr, special?.label_en);
  }

  // Authoritative identity, not an invented talent or a second damage source.
  function createStatSignature(item) {
    const signature = item.signature_mechanic || item.shared_behavior_tr;
    if (!signature) return null;
    const panel = document.createElement("section");
    panel.className = "module-stat-signature";
    const heading = document.createElement("strong"), copy = document.createElement("p");
    heading.append(createUiIcon("star", "gold"), document.documentElement.lang === "en" ? "SIGNATURE MECHANIC" : "İMZA MEKANİĞİ");
    copy.textContent = serverCopy(signature, item.signature_mechanic_en);
    panel.append(heading, copy);
    return panel;
  }

  // Çevrim karosu: adı modüle özeldir ("BLOK ARALIĞI", "SALDIRI ARALIĞI" …).
  function moduleCycleEntry(stats, nextStats) {
    const seconds = (source) => (source?.cooldown_ms === undefined || source?.cooldown_ms === null
      ? undefined
      : Number(source.cooldown_ms) / 1000);
    const current = seconds(stats);
    const label = serverCopy(stats?.cycle_label_tr, stats?.cycle_label_en) || localizedUiText("BEKLEME");
    if (!(current > 0)) {
      // Çevrimi olmayan modül sürekli çalışır (eski sunucuda "0 sn" yazardı).
      return { label:localizedUiText("ÇALIŞMA"), value:current === undefined ? "—" : localizedUiText("SÜREKLİ") };
    }
    return {
      label,
      value:`${current.toLocaleString(uiLocale(), { maximumFractionDigits:2 })} ${document.documentElement.lang === "en" ? "sec" : "sn"}`,
      current,
      next:seconds(nextStats),
      unit:"seconds",
    };
  }

  function specialEntries(stats, nextStats) {
    const upcoming = new Map((nextStats?.specials || []).map((special) => [special.key, special]));
    return (stats?.specials || []).map((special) => ({
      key:special.key,
      label:specialLabel(special),
      value:specialDisplayValue(special),
      current:Number(special.value),
      next:upcoming.has(special.key) ? Number(upcoming.get(special.key).value) : undefined,
      unit:special.unit || "",
      times:special.times,
      icon:(STAT_ICONS[special.key] || ["star", "cyan"])[0],
      tone:(STAT_ICONS[special.key] || ["star", "cyan"])[1],
    }));
  }

  // Bir sonraki seviyenin farkı: artan değerde "+", kısalan sürede "−"; birimiyle.
  function createStatGain(current, next, unit = "") {
    const change = Math.round((Number(next) - Number(current)) * 100) / 100;
    if (next === undefined || next === null || !Number.isFinite(change) || change === 0) return null;
    const gain = document.createElement("em");
    gain.className = "stat-next-gain";
    gain.textContent = statGainText(change, unit);
    gain.title = localizedUiText("Sonraki seviye");
    return gain;
  }

  // İstatistik sekmesinin değer karoları. CAN, hasar ve etki çubukları
  // koleksiyondaki en yüksek değere oranlanır; enderlik bu değerleri artırmaz.
  const TALENT_KIND_LABELS = Object.freeze({
    basic:"TEMEL", signature:"İMZA", tuning:"İNCE AYAR", mastery:"USTALIK",
  });
  const TALENT_KIND_ICONS = Object.freeze({
    basic:["boost", "green"], signature:["star", "gold"], tuning:["gear", "blue"], mastery:["rarity", "violet"],
  });

  function createModuleStatTiles(item) {
    const stats = item.stats || {};
    const nextStats = item.unlocked ? item.next_stats : null;
    const collection = metaProgressionState?.module_collection || [];
    const peak = (key) => Math.max(1, ...collection.map((module) => Number(module.stats?.[key] || 0)));
    const number = (value, digits = 0) => Number(value || 0).toLocaleString(uiLocale(), { maximumFractionDigits:digits });
    const list = document.createElement("dl");
    list.className = "module-stat-tiles";
    const cycle = moduleCycleEntry(stats, nextStats);
    // Modüle özgü değerler sunucudan gelir (seviye ve yetenek dahil); eski
    // sunucu göndermezse soyut etki çarpanı yazılır.
    const specials = specialEntries(stats, nextStats);
    for (const tile of [
      { key:"hp", icon:"hp", tone:"green", label:"CAN", value:number(stats.max_hp), current:stats.max_hp, next:nextStats?.max_hp, meter:Number(stats.max_hp || 0) / peak("max_hp") },
      ...(Number(stats.base_damage) > 0
        ? [{ key:"damage", icon:"damage", tone:"red", label:"HASAR", value:number(stats.base_damage, 1), current:stats.base_damage, next:nextStats?.base_damage, meter:Number(stats.base_damage || 0) / peak("base_damage") }]
        : []),
      { key:"cooldown", icon:"cycle", tone:"blue", ...cycle },
      ...(specials.length
        ? specials.map((special) => ({ ...special, key:`special-${special.key}` }))
        : [{ key:"effect", icon:"star", tone:"violet", label:"ETKİ ÇARPANI", value:`×${number(stats.effect_multiplier, 2)}`, meter:Number(stats.effect_multiplier || 0) / peak("effect_multiplier") }]),
      // Tüketim, bakım ile aksiyon bedelinin saniyeye düşen payının toplamıdır;
      // üretici modül (Batarya) tüketim yerine üretimini gösterir.
      Number(stats.energy_generation) > 0
        ? { key:"energy", icon:"energy", tone:"cyan", label:"ENERJİ ÜRETİMİ", value:`+${number(stats.energy_generation, 1)}/sn`, current:stats.energy_generation, next:nextStats?.energy_generation, unit:"per_second" }
        : { key:"energy", icon:"energy", tone:"cyan", label:"ENERJİ TÜKETİMİ", value:`${number(stats.energy_per_second ?? stats.energy_consumption, 1)}/sn`, current:stats.energy_per_second, next:nextStats?.energy_per_second, unit:"per_second" },
      { key:"current", icon:"current", tone:"gold", label:"AKIM MALİYETİ", value:number(item.current_cost) },
    ]) {
      const row = document.createElement("div");
      row.dataset.stat = tile.key;
      row.dataset.tone = tile.tone || "";
      const name = document.createElement("dt");
      name.textContent = tile.label;
      const value = document.createElement("dd");
      value.textContent = tile.value;
      const gain = createStatGain(tile.current, tile.next, tile.unit);
      if (gain) value.append(" ", gain);
      row.append(createUiIcon(tile.icon, tile.tone), name, value);
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

  // Three distinct views: static art + next level, full stats, talent cards.
  // No automatic pagination/reparenting or battle simulation in the dialog.
  function renderModuleDetailTab(tabName) {
    const item = activeMetaModule();
    const host = document.getElementById("module-detail-tab-content");
    if (!item || !host) return;
    setDetailTabUpgradeArrow(document.querySelector('[data-module-detail-tab="talents"]'), moduleTalentAvailable(item));
    host.replaceChildren();
    host.dataset.tab = tabName;
    document.getElementById("module-detail-dialog").dataset.detailTab = tabName;
    host.dataset.category = item.category || "";
    host.scrollTop = 0;
    const text = document.createElement("p");
    text.className = "module-detail-tab-intro";
    if (tabName === "stats") {
      text.textContent = "Seviye ve yeteneklerle gelişir; enderlik güç katmaz.";
      const chips = document.createElement("div");
      chips.className = "module-stat-chips";
      for (const [label, value, kind, icon, tone] of [
        ["SINIF", poolCategoryLabel(item.category), "category", "grid", "blue"],
        ["ENDERLİK", moduleRarityLabel(item.rarity), "rarity", "rarity", "gold"],
      ]) {
        const chip = document.createElement("span");
        chip.dataset.chip = kind;
        chip.dataset.category = item.category || "";
        chip.dataset.rarity = String(item.rarity || "common").toLowerCase();
        const name = document.createElement("small");
        name.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = value;
        chip.append(createUiIcon(icon, tone), name, valueNode);
        chips.appendChild(chip);
      }
      host.appendChild(chips);
      host.appendChild(createModuleStatTiles(item));
      const signature = createStatSignature(item);
      if (signature) host.appendChild(signature);
      if ((item.stats?.specials || []).some((entry) => entry.key === "dps")) {
        const note = document.createElement("p");
        note.className = "module-stat-note";
        note.textContent = document.documentElement.lang === "en"
          ? "Theoretical DPS = raw damage / interval; not an extra hit. Heat, energy, defenses and tick rounding affect actual output."
          : "Teorik hasar/sn = ham hasar / aralık; ek vuruş değildir. Isı, enerji, savunma ve zaman adımı/yuvarlama gerçek sonucu değiştirir.";
        host.appendChild(note);
      }
    } else if (tabName === "talents") {
      // Açılışta seçilmiş imza yeteneğinin, o yoksa en ileri seçilmiş eşiğin
      // açıklaması yazar (dal kimlikleri her eşikte aynıdır; eşiğe göre aranır).
      const selectedNodes = (item.talents || []).filter((node) => node.selected);
      const describedNode = selectedNodes.find((node) => node.kind === "signature")
        || selectedNodes[selectedNodes.length - 1];
      const selectedTalent = describedNode?.choices?.find((choice) => choice.id === describedNode.selected);
      text.textContent = selectedTalent
        ? talentDisplayDescription(selectedTalent)
        : "Her eşikte bir dal seç. Dokun: açıklama ve seçim.";
      const tree = document.createElement("div");
      tree.className = "module-talent-path";
      for (const node of item.talents || []) {
        const row = document.createElement("section");
        row.className = "module-talent-node";
        row.dataset.selected = node.selected || "";
        row.dataset.reachable = String(Number(item.level) + 1 >= node.level);
        // Eşiğin türü: temel uzmanlık, imza yeteneği, ince ayar ya da ustalık.
        if (node.kind) row.dataset.kind = node.kind;
        // Seviye rozeti iki dalın ortasında durur: sol dal · rozet · sağ dal.
        const level = document.createElement("span");
        level.className = "module-talent-level";
        level.title = localizedUiText(TALENT_KIND_LABELS[node.kind] || "Yetenek");
        const levelValue = document.createElement("strong");
        levelValue.textContent = `SV ${node.level}`;
        // Display only charged currencies, from the authoritative server node.
        level.append(levelValue);
        appendTalentCosts(level, node);
        const choices = document.createElement("div");
        choices.className = "module-talent-choices";
        const kindLabel = TALENT_KIND_LABELS[node.kind];
        if (kindLabel) {
          const kind = document.createElement("em");
          kind.className = "module-talent-kind";
          kind.textContent = localizedUiText(kindLabel);
          const [kindIcon, kindTone] = TALENT_KIND_ICONS[node.kind] || ["star", "cyan"];
          kind.prepend(createUiIcon(kindIcon, kindTone));
          row.appendChild(kind);
        }
        row.appendChild(choices);
        node.choices.forEach((choice, choiceIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          const canChoose = moduleTalentSelectable(item, node);
          button.className = `${choiceIndex === 0 ? "is-left-choice" : "is-right-choice"}${node.selected === choice.id ? " is-selected" : ""}${canChoose ? "" : " is-unavailable"}`;
          const choiceState = node.selected === choice.id
            ? "SEÇİLDİ"
            : node.selected ? "DİĞER DAL SEÇİLDİ"
              : Number(item.level) + 1 < node.level ? `SV ${node.level} GEREKLİ`
                : !talentAffordable(node) ? talentCostShortfall(node)
                  : "SEÇ";
          const choiceName = talentDisplayName(choice);
          const choiceTitle = document.createElement("strong");
          choiceTitle.textContent = choiceName;
          const choiceStatus = document.createElement("small");
          choiceStatus.textContent = choiceState;
          const [choiceIcon, choiceTone] = TALENT_KIND_ICONS[node.kind] || ["star", "cyan"];
          button.append(createUiIcon(choiceIcon, choiceTone), choiceTitle, choiceStatus);
          button.dataset.selectable = String(canChoose);
          button.setAttribute("aria-label", `${choiceName} · ${choiceState} · ${localizedUiText(TALENT_KIND_LABELS[node.kind] || "Yetenek")} · Açıklamayı göster`);
          button.title = talentDisplayDescription(choice);
          button.addEventListener("click", async () => {
            text.textContent = talentDisplayDescription(choice);
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
        resetCopy.textContent = `${selectedCount} seçim`;
        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.className = "module-talent-reset";
        setCostButtonLabel(resetButton, localizedUiText("SIFIRLA"), [["flux", resetCost]]);
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
      text.textContent = GridshardDetailPages.description(item, {english:document.documentElement.lang === "en"});
      text.title = serverCopy(item.description_tr, item.description_en);
    }
    host.prepend(text);
    window.GridshardDetailPages?.mount(host, {item});
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
    setRarityBadge("module-detail-rarity", String(item.rarity || "common").toLowerCase(), moduleRarityLabel(item.rarity).toLocaleUpperCase("tr-TR"));
    setText("module-detail-level", `SEVİYE ${Number(item.level || 0) + 1}`);
    setText("module-detail-selected-state", deckEditorSlots.filter(Boolean).map(clientDefinitionId).includes(item.definition_id) ? "DESTEDE" : "DESTE DIŞI");
    const cost = item.next_upgrade_cost;
    const required = Number(cost?.shards || 1);
    const universalShards = Number(metaProgressionState?.universal_module_shards || 0);
    const totalUsableShards = Number(item.shards || 0) + universalShards;
    // Kartın kendi parçası ile evrensel parça stoğu ayrı yazılır ("500 / 28" ve
    // yanında evrensel parça rozeti); ilerleme çubuğu ikisinin toplamını gösterir.
    setText("module-detail-shards", cost ? `${Number(item.shards || 0).toLocaleString(uiLocale())} / ${required.toLocaleString(uiLocale())}` : "AZAMİ SEVİYE");
    const universalBadge = document.getElementById("module-detail-universal");
    if (universalBadge) {
      universalBadge.hidden = !cost;
      const universalLabel = `${localizedUiText("Evrensel parça")}: ${universalShards.toLocaleString(uiLocale())}`;
      universalBadge.title = universalLabel;
      universalBadge.setAttribute("aria-label", universalLabel);
      const count = document.createElement("b");
      count.textContent = universalShards.toLocaleString(uiLocale());
      universalBadge.replaceChildren(createModulePuzzlePiece({ universal:true }), count);
    }
    document.getElementById("module-detail-shard-icon")?.replaceChildren(
      createModulePuzzlePiece({ category:item.category || "", glyph:moduleEmblemMarkup(definition) })
    );
    const progress = document.getElementById("module-detail-progress");
    if (progress) { progress.max = required; progress.value = cost ? Math.min(required, totalUsableShards) : required; }
    const art = document.getElementById("module-detail-art");
    if (art) {
      art.dataset.category = item.category || "";
      art.dataset.module = item.definition_id || "";
      mountModuleEmblem(art, definition);
      art.setAttribute("aria-label", `${item.name_tr} görseli`);
    }
    const nextStats = item.unlocked ? item.next_stats : null;
    // Üç kutu: CAN, modülün kendi çevrimi ve asıl işi. Saldırı modülünde asıl iş
    // hasardır; diğerlerinde modüle özgü ilk değer (blok, onarım, soğutma …).
    // Akım maliyeti İstatistik sekmesindedir.
    const headline = Number(item.stats?.base_damage) > 0
      ? { label:"HASAR", value:Number(item.stats.base_damage).toLocaleString(uiLocale(), { maximumFractionDigits:1 }), current:item.stats.base_damage, next:nextStats?.base_damage, icon:"damage", tone:"red" }
      : specialEntries(item.stats, nextStats)[0]
        || { label:"HASAR", value:item.stats?.base_damage || 0, icon:"damage", tone:"red" };
    renderDetailStatRow(document.getElementById("module-detail-stats"), [
      { label:"CAN", value:item.stats?.max_hp ?? definition.maxHp, current:item.stats?.max_hp, next:nextStats?.max_hp, icon:"hp", tone:"green" },
      { ...moduleCycleEntry(item.stats, nextStats), icon:"cycle", tone:"blue" },
      headline,
    ]);
    const upgrade = document.getElementById("module-detail-upgrade");
    const reason = moduleUpgradeBlockReason(item);
    if (upgrade) {
      upgrade.disabled = !moduleUpgradeAvailable(item);
      upgrade.setAttribute("aria-disabled", String(upgrade.disabled));
      // Bedel "DK" ve "AKI" yazısıyla değil, kaynakların simgesiyle gösterilir.
      setCostButtonLabel(upgrade, localizedUiText(cost ? "YÜKSELT" : "AZAMİ SEVİYE"), cost
        ? [["credit", cost.circuit_credits], ...(Number(cost.flux_shards) > 0 ? [["flux", cost.flux_shards]] : [])]
        : []);
    }
    setText("module-detail-status", reason);
    const select = document.getElementById("module-detail-select");
    if (select) {
      const inDeck = deckEditorSlots.filter(Boolean).map(clientDefinitionId).includes(item.definition_id);
      select.disabled = !item.unlocked || inDeck || !metaIndicatorsLive();
      select.textContent = localizedUiText(inDeck ? "DESTEDE" : item.unlocked ? "SEÇ" : "KİLİTLİ");
    }
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
    if (button?.disabled || !moduleUpgradeAvailable(activeMetaModule())) return;
    if (button) button.disabled = true;
    const moduleId = selectedCollectionModuleId;
    try {
      await metaProgressionMutation(`/profile/${encodeURIComponent(participantPlayerId)}/meta-progression/modules/${encodeURIComponent(moduleId)}/upgrade`);
      openModuleDetail();
      document.getElementById("module-detail-status").textContent = "Modül seviyesi yükseltildi.";
    } catch (error) {
      if (button) { button.disabled = !moduleUpgradeAvailable(activeMetaModule()); button.setAttribute("aria-disabled", String(button.disabled)); }
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

  // Read ownership is distinct from navigation: background data may update a
  // cache, but an older read must never replace a newer read/mutation/account.
  function createViewReadOwner(readState) {
    let generation = 0;
    const isCurrent = ticket => ticket.generation === generation
      && ticket.playerId === participantPlayerId && ticket.state === readState();
    return Object.freeze({
      begin:() => ({generation:++generation, playerId:participantPlayerId, state:readState()}),
      isCurrent,
      commit(ticket, apply) {
        if (!isCurrent(ticket)) return false;
        apply();
        ticket.state = readState();
        return true;
      },
    });
  }
  const teamViewReads = createViewReadOwner(() => teamState);

  // Takım durumu sunucudan gelene kadar ne takım sayfası ne de "katıl /
  // oluştur" ekranı gösterilir; ilk yükleme başarısız olursa yeniden deneme
  // düğmesi çıkar.
  function renderTeamSections({ failed=false }={}) {
    const loaded = Boolean(teamState);
    const joined = Boolean(teamState?.joined);
    const setHidden = (id, hidden) => {
      const element = document.getElementById(id);
      if (element) element.hidden = hidden;
    };
    setHidden("team-loading", loaded);
    setHidden("team-loading-text", failed);
    setHidden("team-loading-retry", !failed);
    setHidden("team-onboarding", !loaded || joined);
    setHidden("team-hub", !joined);
  }

  async function loadTeamView() {
    const ticket = teamViewReads.begin();
    const connection = document.getElementById("team-connection-state");
    if (connection) connection.textContent = "Yükleniyor…";
    renderTeamSections();
    try {
      const payload = await requestJsonWithDeadline(
        `/teams/player/${encodeURIComponent(ticket.playerId)}`,
        { cache: "no-store" },
        10000
      );
      if (!teamViewReads.commit(ticket, () => { teamState = payload; })) return {ok:false, stale:true};
      if (connection) connection.textContent = teamState.joined ? "BAĞLI" : "TAKIM YOK";
      setTeamActionStatus("");
      renderTeamHub();
      if (teamState?.application_pending) {
        setTeamActionStatus("Başvurun takım yöneticisinin onayına gönderildi.", "success");
      }
      return { ok:true, state:teamState };
    } catch (error) {
      if (!teamViewReads.isCurrent(ticket)) return {ok:false, stale:true};
      if (connection) connection.textContent = "BAĞLANTI HATASI";
      setTeamActionStatus(error instanceof Error ? error.message : String(error), "error");
      renderTeamSections({ failed:true });
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

  const socialViewReads = createViewReadOwner(() => socialState);
  async function loadSocialView({ quiet = false } = {}) {
    const ticket = socialViewReads.begin();
    if (!quiet) setFriendsStatus("Arkadaş ağı yükleniyor…", "pending");
    try {
      const payload = await requestJsonWithDeadline(
        `/social/${encodeURIComponent(ticket.playerId)}`,
        { cache:"no-store" },
        12000
      );
      if (!socialViewReads.commit(ticket, () => { socialState = payload; })) return {ok:false, stale:true};
      if (!quiet) setFriendsStatus("");
      renderFriendsScreen();
      return { ok:true, state:socialState };
    } catch (error) {
      if (!socialViewReads.isCurrent(ticket)) return {ok:false, stale:true};
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

  // Ebeveyn denetimi (Ayarlar → Hesap ve Gizlilik): yetişkin, sohbeti, özel
  // mesajı ve arkadaşlık isteklerini 4 haneli bir şifreyle kapatır. Durum
  // sunucudan gelir (hesap görünümü); şifre cihazda saklanmaz, yalnız istekle
  // gönderilir.
  function renderParentalControls() {
    const closed = Boolean(accountPlatformState?.parental?.social_closed);
    const state = document.getElementById("parental-controls-state");
    if (state) {
      state.dataset.closed = String(closed);
      state.textContent = closed ? "Sosyal özellikler kapalı." : "Sosyal özellikler açık.";
    }
    const repeat = document.getElementById("parental-controls-pin-repeat");
    if (repeat) repeat.hidden = closed;
    const submit = document.getElementById("parental-controls-submit");
    if (submit) submit.textContent = closed ? "SOSYAL ÖZELLİKLERİ AÇ" : "SOSYAL ÖZELLİKLERİ KAPAT";
  }

  async function submitParentalControls() {
    const status = document.getElementById("parental-controls-status");
    const pinInput = document.getElementById("parental-controls-pin");
    const repeatInput = document.getElementById("parental-controls-pin-repeat");
    const submit = document.getElementById("parental-controls-submit");
    const closed = Boolean(accountPlatformState?.parental?.social_closed);
    const pin = pinInput?.value?.trim() || "";
    const say = (message) => { if (status) status.textContent = message; };
    if (!/^[0-9]{4}$/.test(pin)) {
      say("Ebeveyn şifresi 4 rakam olmalıdır.");
      return;
    }
    if (!closed && pin !== (repeatInput?.value?.trim() || "")) {
      say("Şifreler aynı değil.");
      return;
    }
    if (submit) submit.disabled = true;
    try {
      const result = await requestJsonWithDeadline(
        `/accounts/${encodeURIComponent(participantPlayerId)}/parental-controls/${closed ? "open-social" : "close-social"}`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,pin})},
        12000
      );
      accountPlatformState = result.account;
      renderAccountPlatform();
      say(closed ? "Sosyal özellikler açıldı." : "Sosyal özellikler kapatıldı.");
      // Arkadaş ve takım ekranları yeni duruma göre yenilenir.
      void loadSocialView({ quiet:true });
      void loadTeamView();
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    } finally {
      if (pinInput) pinInput.value = "";
      if (repeatInput) repeatInput.value = "";
      if (submit) submit.disabled = false;
    }
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
    renderParentalControls();
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
        ? "Bir sağlayıcı seç veya misafir olarak devam et."
        : "Google ve Apple bağlantıları sunucu ayarlarını bekliyor; misafir olarak devam edebilirsin.";
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
    // The isolated review profile uses private demo credentials, never an
    // automatic personal Play Games link prompt. Normal onboarding is unchanged.
    if (globalThis.GridshardAuth?.session?.isReviewProfile?.()
        || document.getElementById("review-access-dialog")?.open) return false;
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
      if (document.getElementById("review-access-dialog")?.open) return;
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

  // Hazır mesajlar (social/safe-chat.js): takım sohbetinde ve özel mesajda
  // serbest yazı yoktur. Gösterilen metin her zaman listeden gelir; hazır
  // mesaj olmayan kayıt (eski serbest yazı) boş döner ve çizilmez.
  function presetMessageText(message) {
    return globalThis.GridshardSafeChat?.messageText(message) || "";
  }

  function teamDescriptionText(team) {
    return globalThis.GridshardSafeChat?.teamDescriptionText(team) || "";
  }

  // Hazır mesaj seçici: grup sekmeleri ve seçili grubun mesajları. Dokunulan
  // mesajın yalnız kimliği gönderilir. Durum kutunun kendisinde durur
  // (data-group, data-locked, data-sending); çizim işlevleri her tazelemede
  // çağırabilir, grup değişmedikçe düğmeler yeniden kurulmaz.
  function renderPresetMessagePicker(hostId, send, { locked = false } = {}) {
    const host = document.getElementById(hostId);
    const catalog = globalThis.GridshardSafeChat;
    if (!host || !catalog) return;
    if (!host.dataset.group) {
      host.dataset.group = catalog.groups[0].id;
      const tabs = document.createElement("div");
      tabs.className = "preset-message-tabs";
      for (const group of catalog.groups) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.dataset.presetGroup = group.id;
        tab.textContent = group.label;
        tabs.appendChild(tab);
      }
      const chips = document.createElement("div");
      chips.className = "preset-message-chips";
      host.replaceChildren(tabs, chips);
      host.addEventListener("click", async (event) => {
        const tab = event.target.closest("[data-preset-group]");
        const chip = event.target.closest("[data-preset-id]");
        if (tab) {
          host.dataset.group = tab.dataset.presetGroup;
        } else if (chip && !chip.disabled) {
          host.dataset.sending = "true";
          drawPresetMessagePicker(host);
          try {
            await send(chip.dataset.presetId);
            // Tek dokunuşla gönderilir; art arda dokunuş sohbeti doldurmasın.
            await new Promise((resolve) => { setTimeout(resolve, 1000); });
          } finally {
            host.dataset.sending = "false";
          }
        } else {
          return;
        }
        drawPresetMessagePicker(host);
      });
    }
    host.dataset.locked = String(Boolean(locked));
    drawPresetMessagePicker(host);
  }

  function drawPresetMessagePicker(host) {
    const { group, locked, sending } = host.dataset;
    const chips = host.querySelector(".preset-message-chips");
    if (!chips) return;
    if (chips.dataset.group !== group) {
      chips.dataset.group = group;
      chips.replaceChildren(...globalThis.GridshardSafeChat.messages
        .filter((message) => message.group === group)
        .map((message) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.dataset.presetId = message.id;
          chip.textContent = message.text;
          return chip;
        }));
      // Kısa ekranda mesajlar yana kayar; yeni grup baştan görünür.
      chips.scrollLeft = 0;
      for (const tab of host.querySelectorAll("[data-preset-group]")) {
        const active = tab.dataset.presetGroup === group;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      }
    }
    const disabled = locked === "true" || sending === "true";
    for (const chip of chips.children) chip.disabled = disabled;
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
    // Hazır mesaj: metin listeden gelir ve oyuncunun diline çevrilir.
    const previewText = document.createElement("span");
    previewText.textContent = presetMessageText(last);
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
          socialState?.social_closed ? "SOHBET KAPALI" : "HENÜZ SOHBET YOK",
          socialState?.social_closed
            ? "Sosyal özellikler ebeveyn ayarıyla kapalı."
            : "Aşağıdan bir arkadaşını seçip ilk mesajı gönder."
        ));
      }
    }
    const starters = document.getElementById("direct-message-starters");
    if (starters) {
      starters.replaceChildren();
      const active = new Set(conversations.map((item) => item.peer_id));
      for (const friend of socialState?.social_closed ? [] : sortedFriendsForBattle()) {
        if (active.has(friend.player_id)) continue;
        starters.appendChild(createSocialPlayerCard(friend, [
          { label:"YAZ", variant:"quiet", onClick:() => openDirectMessageThread(friend.player_id) },
        ]));
      }
      if (!starters.children.length) {
        const empty = document.createElement("p");
        empty.className = "social-empty-state";
        empty.textContent = socialState?.social_closed
          ? "Sosyal özellikler ebeveyn ayarıyla kapalı."
          : socialState?.friends?.length
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
      if (peer) renderTrophyCaption(meta, peer.rank_name_tr || "Arena", Number(peer.rating || 0), peer.online ? "ÇEVRİMİÇİ" : "");
      else meta.replaceChildren();
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
        const messageText = presetMessageText(message);
        if (!messageText) continue;
        const own = message.sender_id === participantPlayerId;
        const row = document.createElement("article");
        row.className = `team-message direct-message${own ? " is-own" : ""}`;
        const author = document.createElement("strong");
        author.textContent = own ? "Sen" : (peer?.display_name || "Oyuncu");
        const text = document.createElement("p");
        text.textContent = messageText;
        const time = document.createElement("time");
        time.textContent = directMessageTimeLabel(message.sent_at);
        row.append(author, text, time);
        host.appendChild(row);
      }
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = directMessageLoadedPeerId === peerId
          ? "Sohbeti başlatmak için aşağıdan bir mesaj seç."
          : "Mesajlar yükleniyor…";
        host.appendChild(empty);
      }
      host.scrollTop = stickToBottom || host.dataset.peerId !== peerId
        ? host.scrollHeight
        : previousScrollTop;
      host.dataset.peerId = peerId;
      host.dataset.signature = signature;
    }

    renderPresetMessagePicker("direct-message-picker", sendDirectMessage, {
      locked:!isFriend || Boolean(socialState?.social_closed),
    });
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

  async function sendDirectMessage(presetId) {
    const peer = activeDirectMessagePeerId;
    if (!peer || !presetId) return;
    try {
      await requestJsonWithDeadline(
        `/social/${encodeURIComponent(participantPlayerId)}/messages`,
        {method:"POST",body:JSON.stringify({player_id:participantPlayerId,recipient_id:peer,preset_id:presetId,request_id:socialRequestId("message-send")})},
        12000
      );
      setFriendsStatus("");
      await loadDirectMessageThread();
      void loadSocialView({ quiet:true });
    } catch (error) {
      setFriendsStatus(error instanceof Error ? error.message : String(error), "error");
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
    renderTrophyCaption(meta, player.rank_name_tr || "Arena", Number(player.rating || 0), player.online ? "ÇEVRİMİÇİ" : "");
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
    for (const button of document.querySelectorAll('#lobby-menu [data-open-screen="friends"]')) {
      button.classList.toggle("has-persistent-notification", hasSocial);
    }
    document.getElementById("lobby-menu-button")?.classList.toggle("has-social-notification", hasSocial);
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
    empty.appendChild(createUiIcon("people", "green"));
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
    renderFriendsScreen();
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
  }

  function renderFriendsScreen() {
    // Notification ownership stays live even when the friends page is closed.
    renderSocialNotificationDots();
    if (!socialState || document.hidden || document.body.dataset.appScreen !== "friends") return;

    // Ebeveyn ayarı: sohbet, özel mesaj ve arkadaşlık isteği yolları kapanır;
    // arkadaş listesi ve arkadaş savaşı durur. Asıl engel sunucudadır.
    const socialClosed = Boolean(socialState.social_closed);
    const closedNote = document.getElementById("friends-social-closed");
    if (closedNote) closedNote.hidden = !socialClosed;
    for (const control of [
      document.getElementById("friend-invite-create"),
      document.getElementById("friend-search-input"),
      document.querySelector("#friend-search-form button"),
    ]) {
      if (control) control.disabled = socialClosed;
    }

    const friends = document.getElementById("friend-list");
    if (friends && activeFriendsTab === "friends") {
      friends.replaceChildren();
      for (const player of sortedFriendsForBattle()) {
        friends.appendChild(createSocialPlayerCard(player, socialClosed ? [] : [
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
    if (requests && activeFriendsTab === "incoming") {
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
    if (outgoing && activeFriendsTab === "outgoing") {
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
    if (battleList && activeFriendsTab === "battle") {
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
    if (invites && activeFriendsTab === "battle") {
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

    if (activeFriendsTab === "messages") {
      renderDirectMessageInbox();
      renderDirectMessageThread();
    }
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

  function competitionStatusLabel(tournament) {
    if (tournament?.status === "waiting_for_launch") return "Başlangıç bekleniyor";
    if (tournament?.status === "waiting_for_participants") return `Kayıt bekliyor · ${Number(tournament.participant_count || 0)} / ${Number(tournament.minimum_participants || 4)}`;
    return `${eventDateLabel(tournament?.period?.starts_at)} — ${eventDateLabel(tournament?.period?.ends_at)}`;
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
    for (const [label, value, trophy = false] of metrics) {
      const card = document.createElement("article");
      const name = document.createElement("span");
      const amount = document.createElement("strong");
      name.textContent = label;
      if (trophy) renderTrophyValue(amount, value);
      else amount.textContent = String(value);
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
    if (reset) reset.textContent = competitionStatusLabel(tournament);
    if (rules) rules.textContent = tournament.rules_tr || "";
    const register = document.getElementById("weekly-tournament-register");
    const viewer = state?.viewer || {};
    if (register) {
      register.disabled = tournament.registration_open === false || Boolean(viewer.weekly_registered);
      register.textContent = tournament.registration_open === false ? "BAŞLANGIÇ BEKLENİYOR" : viewer.weekly_registered
        ? "TURNUVAYA KATILDIN"
        : `${Number(tournament.entry_fee || 0)} DK · TURNUVAYA KATIL`;
    }
    const participant = (tournament.standings || []).find((row) => row.player_id === participantPlayerId);
    renderEventSummary("weekly-event-summary", [
      ["SÜRE", `${eventDateLabel(tournament.period?.starts_at)} — ${eventDateLabel(tournament.period?.ends_at)}`],
      ["SIRAN", participant ? `#${participant.position}` : "Henüz yok"],
      ["KAZANILAN KUPA", participant ? participant.trophies_earned || participant.points : 0, true],
    ]);
    if (activeWeeklyEventTab !== "standings") return;
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
      renderTrophyValue(points, row.trophies_earned || row.points);
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
    if (week) week.textContent = String(tournament.status || "").startsWith("waiting_for_") ? competitionStatusLabel(tournament) : `${Number(tournament.week || 1)}. HAFTA · ${phaseLabel}`;
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
    if (activeTeamEventTab === "overview") renderTeamTournamentCalendar(tournament);
    const standings = document.getElementById("team-tournament-standings");
    if (standings && activeTeamEventTab === "standings") {
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
    if (activeTeamEventTab === "standings") renderTeamContributions(tournament, viewer, viewerTeam);
    if (activeTeamEventTab === "fixtures") renderTeamFixtures(state);
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
    if (!document.hidden && document.body.dataset.appScreen === "team-event" && activeTeamEventTab === "fixtures" && eventsState) {
      renderTeamFixtures(eventsState);
    }
  }, 20000);

  function renderEventsHub() {
    if (!eventsState) return;
    const screen = document.body.dataset.appScreen;
    if (document.hidden || !["events", "weekly-event", "team-event"].includes(screen)) return;
    if (screen === "weekly-event" || screen === "team-event") {
      if (screen === "weekly-event") renderWeeklyTournament(eventsState);
      else renderTeamTournament(eventsState);
      renderEventSubpages();
      return;
    }
    renderDailyMetaCard();
    const weekly = eventsState.weekly_tournament || {};
    const team = eventsState.team_tournament || {};
    const weeklyLinkName = document.getElementById("weekly-event-link-name");
    const weeklyLinkPeriod = document.getElementById("weekly-event-link-period");
    const teamLinkName = document.getElementById("team-event-link-name");
    const teamLinkPeriod = document.getElementById("team-event-link-period");
    if (weeklyLinkName) weeklyLinkName.textContent = weekly.name_tr || "Haftalık Devre Turnuvası";
    if (weeklyLinkPeriod) weeklyLinkPeriod.textContent = competitionStatusLabel(weekly);
    if (teamLinkName) teamLinkName.textContent = team.name_tr || "Takımlar Arası Turnuva";
    if (teamLinkPeriod) teamLinkPeriod.textContent = String(team.status || "").startsWith("waiting_for_") ? competitionStatusLabel(team) : `${Number(team.week || 1)}. hafta · ${eventDateLabel(team.period?.ends_at)} tarihinde yenilenir`;
  }

  const eventViewReads = createViewReadOwner(() => eventsState);
  async function loadEventsView() {
    const ticket = eventViewReads.begin();
    const statuses = ["event-action-status", "weekly-event-status", "team-event-status"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    for (const status of statuses) status.textContent = "Turnuva verileri yükleniyor…";
    try {
      const payload = await requestJsonWithDeadline(`/events?player_id=${encodeURIComponent(ticket.playerId)}`, { cache:"no-store" }, 12000);
      if (!eventViewReads.commit(ticket, () => { eventsState = payload; })) return {ok:false, stale:true};
      for (const status of statuses) status.textContent = "";
      renderEventsHub();
      loadDailyMetaState({ present:false });
      return { ok:true, state:eventsState };
    } catch (error) {
      if (!eventViewReads.isCurrent(ticket)) return {ok:false, stale:true};
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

  const dailyMetaReads = createViewReadOwner(() => dailyMetaState);
  async function loadDailyMetaState({ present = false } = {}) {
    const ticket = dailyMetaReads.begin();
    try {
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(ticket.playerId)}/daily-meta`,
        { cache:"no-store" },
        12000
      );
      if (!dailyMetaReads.commit(ticket, () => { dailyMetaState = payload; })) return {ok:false, stale:true};
      const status = document.getElementById("daily-meta-dialog-status");
      if (status) status.textContent = "";
      renderDailyMetaCard();
      renderDailyMetaDialog();
      const dialog = document.getElementById("daily-meta-dialog");
      if (present && dailyMetaState.requires_roll && dialog && !dialog.open) {
        void afterStartup(() => {
          if (!dailyMetaReads.isCurrent(ticket) || dialog.open || !dailyMetaState?.requires_roll
            || document.getElementById("review-access-dialog")?.open) return;
          if (dialog.showModal) dialog.showModal();
          else dialog.setAttribute("open", "");
        });
      }
      return { ok:true, state:dailyMetaState };
    } catch (error) {
      if (!dailyMetaReads.isCurrent(ticket)) return {ok:false, stale:true};
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

  function createRatingTrophyIcon() {
    const icon = document.createElement("img");
    icon.className = "trophy-value-icon";
    icon.src = "./assets/ui/rating-trophy-v1/rating-trophy.webp";
    icon.width = 128;
    icon.height = 128;
    icon.alt = "";
    icon.draggable = false;
    icon.decoding = "async";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function renderTrophyCaption(target, prefix, value, suffix = "", iconFirst = false) {
    if (!target) return;
    const amount = document.createElement("span");
    renderTrophyValue(amount, value);
    if (iconFirst) amount.classList.add("trophy-icon-first");
    target.replaceChildren(
      document.createTextNode(prefix ? `${localizedUiText(String(prefix))} · ` : ""),
      amount,
      document.createTextNode(suffix ? ` · ${localizedUiText(String(suffix))}` : "")
    );
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
    const icon = createRatingTrophyIcon();
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
    const key = Object.hasOwn(TEAM_EMBLEMS, emblemId) ? emblemId : "shield";
    return `<svg class="team-emblem-svg team-emblem-relief" data-team-symbol="${key}" viewBox="0 0 24 26" aria-hidden="true"><g class="team-emblem-depth" transform="translate(0 1.4)">${emblem.path}</g><g class="team-emblem-face">${emblem.path}</g><g class="team-emblem-bevel" transform="translate(-.15 -.3)">${emblem.path}</g></svg>`;
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
      // Varsayılanlar dışındaki seçenekler takım turnuvasında kazanılır;
      // kilitli seçeneğin altında nereden kazanıldığı yazmaz.
      const unlocked = teamState?.appearance_unlocked?.[field] || null;
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
        state.textContent = locked ? "KİLİTLİ" : selected ? "SEÇİLİ" : "SEÇ";
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
        renderTrophyCaption(meta, applicant.rank_name_tr || "Arena", Number(applicant.trophies || 0));
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
        renderTrophyCaption(meta, member.online ? "ÇEVRİMİÇİ" : "ÇEVRİMDIŞI", Number(member.trophies || 0));
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
    if (!panel || !teamState?.joined || !teamState.is_owner || activeTeamTab !== "management") return;
    for (const section of panel.querySelectorAll("[data-team-management-panel]")) {
      section.hidden = section.dataset.teamManagementPanel !== activeTeamManagementTab;
    }
    if (activeTeamManagementTab === "cosmetics") renderTeamAppearanceEditor();
    else renderTeamMemberManagement();
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
    mountModuleEmblem(glyph, { nameTr: item?.name_tr });
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
    renderTrophyCaption(meta, localizedMessage("team.directory_members", {
      members:team.member_count,
      limit:team.member_limit,
    }), Number(team.total_trophies || 0));
    if (minTrophies > 0) {
      const requirement = document.createElement("span");
      renderTrophyCaption(requirement, localizedMessage("team.directory_minimum"), minTrophies);
      meta.append(document.createTextNode(" · "), requirement);
    }
    copy.append(name, meta);
    const descriptionText = teamDescriptionText(team);
    if (descriptionText) {
      const description = document.createElement("p");
      description.textContent = descriptionText;
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
          ? localizedNumber(value)
          : "Şart yok";
        requirement.appendChild(option);
      }
      if (options.map(String).includes(previous)) requirement.value = previous;
    }
    if (requirement && typeof globalThis.GridshardTrophySelect === "function") {
      requirement._trophyPicker ||= new GridshardTrophySelect(requirement, {
        formatNumber:localizedNumber, trophyLabel:() => localizedUiText("Kupa"),
      });
      requirement._trophyPicker.update();
    }
    // Açıklama serbest yazı değildir; hazır seçenekler bir kez doldurulur.
    const description = document.getElementById("team-create-description");
    if (description && description.options.length <= 1) {
      for (const item of globalThis.GridshardSafeChat?.teamDescriptions || []) {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.text;
        description.appendChild(option);
      }
    }
  }

  // Takım liderine bekleyen başvuru ışığı: alt gezinmedeki TAKIM düğmesi,
  // takım başlığındaki üç çizgi düğmesi ve menüdeki Üye Yönetimi satırı. Sayı takım
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
    document.getElementById("team-menu-button")?.classList.toggle("has-team-application", has);
    const badge = document.getElementById("team-application-badge");
    if (badge) {
      badge.hidden = !has;
      badge.textContent = has ? String(Math.min(99, count)) : "";
    }
  }

  // Takım başlığındaki üç çizgi menüsü (Kozmetik, Üye Yönetimi) yalnız liderde
  // görünür. Liderliği devreden oyuncu yönetim bölümündeyse profile döner.
  function renderTeamMenu() {
    const owner = Boolean(teamState?.is_owner);
    if (activeTeamTab === "management" && !owner) activeTeamTab = "profile";
    const button = document.getElementById("team-menu-button");
    if (button) button.hidden = !owner;
  }

  function renderTeamHub() {
    const onboarding = document.getElementById("team-onboarding");
    const hub = document.getElementById("team-hub");
    if (!onboarding || !hub || !teamState) return;
    renderTeamSections();

    noteTeamApplicationsFromTeamState();
    renderTeamNotificationLights();
    if (document.hidden || document.body.dataset.appScreen !== "team") return;
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
      const descriptionText = teamDescriptionText(teamState);
      teamDescription.textContent = descriptionText;
      teamDescription.hidden = !descriptionText;
    }
    setText("team-member-count", `${teamState.member_count || 0} / ${teamState.member_limit || 30}`);
    const statistics = teamState.statistics || {};
    const tournament = teamState.tournament || {};
    renderTrophyValue("team-profile-total-trophies", Number(teamState.total_trophies || 0));
    renderTrophyValue("team-profile-average-trophies", Number(teamState.average_trophies || 0));
    setText("team-profile-total-matches", Number(statistics.total_matches || 0).toLocaleString(uiLocale()));
    setText("team-profile-win-rate", `%${boundedWinRatePercent(statistics.win_rate || 0)}`);
    setText("team-profile-tournament-position", tournament.position ? `#${tournament.position}` : "—");
    setText("team-profile-tournament-points", `${Number(tournament.points || 0).toLocaleString(uiLocale())} P`);
    const teamIdentity = document.getElementById("team-identity-card");
    const teamAvatar = document.getElementById("team-avatar-glyph");
    const teamNameNode = document.getElementById("team-name");
    applyTeamAppearance(teamIdentity, teamState.appearance, { emblemHost:teamAvatar, nameHost:teamNameNode });
    renderTeamMenu();
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
    if (memberList && activeTeamTab === "members") {
      memberList.replaceChildren();
      members.forEach((member, index) => memberList.appendChild(createTeamMemberRow(member, index, { manageable:true })));
    }

    if (activeTeamTab === "requests") {
      renderTeamRequestComposer();
      renderTeamRequestList();
    }

    const messageList = document.getElementById("team-message-list");
    if (messageList && activeTeamTab === "chat") {
      messageList.replaceChildren();
      const messages = (teamState.messages || []).filter((message) => presetMessageText(message));
      if (!messages.length) {
        const empty = document.createElement("p");
        empty.className = "team-empty-state";
        empty.textContent = teamState.social_closed
          ? "Sosyal özellikler ebeveyn ayarıyla kapalı."
          : "Takım sohbetini başlatabilirsin.";
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
        text.textContent = presetMessageText(message);
        row.append(author, text);
        messageList.appendChild(row);
      }
      messageList.scrollTop = messageList.scrollHeight;
    }
    if (activeTeamTab === "chat") renderPresetMessagePicker("team-message-picker", sendTeamMessage);
    const teamMessagePicker = document.getElementById("team-message-picker");
    if (teamMessagePicker) teamMessagePicker.hidden = Boolean(teamState.social_closed);

    const opponent = document.getElementById("team-training-opponent");
    if (opponent && activeTeamTab === "battle") {
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
    if (trainingList && activeTeamTab === "battle") {
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

  // Veri değişikliği gizli ekranları yalnız kirli işaretler. Sıra onlara
  // gelmeden DOM kurmayız: eski idle kuyruğu her tazelemede mağaza, kartlar,
  // profil ve takımı oyuncu bakmasa da yeniden çiziyordu.
  const META_HUB_SECTIONS = Object.freeze([
    { id:"home", screens:["menu"], render:() => renderHomeHub() },
    {
      id:"cards",
      screens:["modules"],
      render:() => {
        if (activeCardPage === "cores") renderCoreCollection();
        else renderModuleCollection();
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

  function flushMetaHubSections() {
    metaHubFlushHandle = null;
    const current = appRouter.currentScreen;
    if (document.hidden || current === RelayAppScreen.PLAY) return;
    for (const section of META_HUB_SECTIONS) {
      if (!section.screens.includes(current) || !metaHubDirtySections.has(section.id)) continue;
      metaHubDirtySections.delete(section.id);
      section.render();
    }
  }

  // Ev ekranı görünmüyorken (ör. savaş başlarken) çizimi ekrana dönüşe bırakır.
  function renderHomeHubWhenVisible() {
    if (document.hidden || appRouter.currentScreen !== RelayAppScreen.MENU) {
      metaHubDirtySections.add("home");
      return;
    }
    metaHubDirtySections.delete("home");
    renderHomeHub();
  }

  function scheduleMetaHubFlush() {
    if (metaHubFlushHandle !== null || !metaHubDirtySections.size) return;
    const current = appRouter.currentScreen;
    if (document.hidden || current === RelayAppScreen.PLAY) return;
    if (!META_HUB_SECTIONS.some(section => section.screens.includes(current) && metaHubDirtySections.has(section.id))) return;
    const settleWait = navigationSettleUntil - performance.now();
    if (settleWait > 0) {
      // Geçiş bitene kadar görünmeyen ekranlar çizilmez.
      metaHubFlushHandle = window.setTimeout(() => {
        metaHubFlushHandle = null;
        scheduleMetaHubFlush();
      }, settleWait);
      return;
    }
    metaHubFlushHandle = typeof globalThis.requestIdleCallback === "function"
      ? globalThis.requestIdleCallback(() => flushMetaHubSections(), { timeout:900 })
      : window.setTimeout(() => flushMetaHubSections(), 60);
  }

  function renderMetaHubScreens({defer=false}={}) {
    const current = appRouter.currentScreen;
    for (const section of META_HUB_SECTIONS) {
      if (!defer && !document.hidden && section.screens.includes(current)) {
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
    renderDockIndicators();
    scheduleMetaHubFlush();
  }

  document.addEventListener("visibilitychange", () => {
    if(document.hidden)stopShopCountdownTimer();
    else if(document.body.dataset.appScreen === "shop")ensureShopCountdownTimer();
    if (!document.hidden) {
      // Data may have arrived while hidden. Repaint only the resumed surface.
      const screen = document.body.dataset.appScreen;
      if (screen === "team") metaHubDirtySections.add("team");
      scheduleMetaHubFlush();
      if (screen === "friends") renderFriendsScreen();
      else if (["events", "weekly-event", "team-event"].includes(screen)) renderEventsHub();
    }
  });

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
      renderEventsHub();
    });
  });
  document.querySelectorAll("[data-team-event-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTeamEventTab = button.dataset.teamEventTab || "overview";
      renderEventSubpages();
      renderEventsHub();
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
    playGames.prepare(), new Promise(resolve => { setTimeout(() => resolve(false), 8000); }),
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
  document.getElementById("parental-controls-submit")?.addEventListener("click", submitParentalControls);
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
        description_id:description?.value || "",
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
  document.getElementById("team-loading-retry")?.addEventListener("click", () => {
    void loadTeamView();
  });
  // Takım menüsü: satır, takım yönetiminin ilgili sayfasını açar.
  document.querySelectorAll("#team-menu [data-team-management-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!teamState?.is_owner) return;
      activeTeamManagementTab = button.dataset.teamManagementTab || "cosmetics";
      activeTeamTab = "management";
      renderTeamHub();
    });
  });
  document.getElementById("team-management-back")?.addEventListener("click", () => {
    activeTeamTab = "profile";
    renderTeamHub();
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
  async function sendTeamMessage(presetId) {
    if (!presetId || !teamState?.team_id) return;
    await mutateTeam(
      `/teams/${encodeURIComponent(teamState.team_id)}/messages`,
      { preset_id:presetId, requestKind:"message" },
      "Mesaj gönderiliyor…"
    );
  }
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
    if (button?.disabled || !metaIndicatorsLive() || !coreUpgradeAvailable(activeMetaCore())) return;
    if (button) button.disabled = true;
    try { await mutateSelectedCore("upgrade"); }
    catch (error) { document.getElementById("core-detail-status").textContent = error.message; if (button) button.disabled = !metaIndicatorsLive() || !coreUpgradeAvailable(activeMetaCore()); }
  });
  document.querySelectorAll("[data-core-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-core-detail-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCoreDetailTab(button.dataset.coreDetailTab || "overview");
    });
  });
  globalThis.GridshardCardSwipe.bind(document.getElementById("module-detail-dialog"), navigateModuleDetail);
  document.getElementById("module-detail-upgrade")?.addEventListener("click", upgradeCollectionModule);
  document.getElementById("module-detail-select")?.addEventListener("click", async () => {
    const button = document.getElementById("module-detail-select");
    if (button?.disabled) return;
    if (button) button.disabled = true;
    await selectCollectionModule();
    if (pendingDeckModuleInstanceId) document.getElementById("module-detail-dialog")?.close();
    else openModuleDetail();
  });
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

  const progressionState =
    new RelayProgressionClientState();

  const playRecoveryState =
    new RelayPlayRecoveryState();

  const serverHealthState =
    new RelayServerHealthState();

  const serverBootGate =
    new RelayServerBootGate({
      healthState:
        serverHealthState,
      expectedVersion:
        "2.1.1",
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
    build: "2.1.1",
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
              const {response, payload} = await fetchWithDeadline(
                path,
                { cache: "no-store" },
                30000,
                async response => ({response, payload:await response.json()})
              );
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
    // Eğitim maçı: ilk oyun deneyimi Ayarlar'dan yeniden başlatıldığında oynanır.
    const tutorialTraining = matchType === "tutorial_training";
    const profileNeutral = tutorialTraining
      || ["friend_battle", "team_training"].includes(matchType);
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
        : tutorialTraining
          ? "EĞİTİM SAVAŞI SONUCU"
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
        : tutorialTraining
          ? "Bu bir eğitim savaşıydı; kupa, ödül veya ilerleme vermez."
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
      mountCoreEmblem(coreGlyph, coreType);
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
      renderTrophyValue(trophy, Math.max(0, Math.round(rating)));
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
        mountModuleEmblem(icon, { nameTr: item.name_tr });
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
    if (!pvpState.resultDeliveryReady) return { ok:false, pending:true };
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

  const battleCountdown = new GridshardBattleCountdown({
    element:document.getElementById("battle-start-countdown"),
    onChange:() => { renderShelf(); renderCorePowerControl(); },
  });
  // Approved painted devices are the sole deployed-art renderer.
  const motionPlaneCache = new WeakMap();
  const moduleMotion = new GridshardModuleMotion({
    now:() => performance.now(),
    hidden:() => document.hidden || document.body.dataset.appScreen !== "play",
    reduced:() => battleGraphicsQuality() === "dusuk" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    pointFor:record => {
      const batch=battleAnchorRects();
      const laser=(batch.devices || batch.lasers).get(String(record.domId));
      if (laser) return GridshardLaserAim.project(laser.plane,GridshardLaserAim.PIVOT);
      const rect = batch.modules.get(String(record.domId));
      return rect ? { x:rect.left + rect.width / 2, y:rect.top + rect.height / 2 } : null;
    },
    draw:(record, pose) => {
      const cell = moduleAnchorCells.get(String(record.domId));
      const card = cell?.querySelector(".module-card");
      if (!card || card.dataset.moduleId !== String(record.domId)) return false;
      const icon = card.querySelector(".module-icon.has-module-device");
      const rig=icon?.querySelector(".module-device-rig");
      let projection=rig && motionPlaneCache.get(rig);
      if(rig && (!projection || projection.epoch!==battleLayoutEpoch)) {
        const batch=battleAnchorRects();
        projection={epoch:battleLayoutEpoch,plane:(batch.devices || batch.lasers).get(String(record.domId))?.plane};
        // Missing geometry is retried on a later draw, never cached as valid.
        if(projection.plane)motionPlaneCache.set(rig,projection);
      }
      const plane=projection?.plane;
      return icon ? GridshardModuleDeviceArt.pose(icon, {...pose,plane}) : true;
    },
  });
  // v15 canvas effects for the first ten modules; ticked by the battle loop.
  const moduleFx = typeof globalThis.GridshardModuleFxCanvas === "function" ? new GridshardModuleFxCanvas({
    doc:document, now:() => performance.now(),
    layer:() => document.getElementById("battle-effect-layer"),
    quality:battleGraphicsQuality,
    wake:() => requestBattleMotionFrame(),
  }) : null;
  const moduleVfx = new GridshardModuleVfx({
    doc:document, now:() => performance.now(), fx:moduleFx,
    layer:() => document.getElementById("battle-effect-layer"),
    anchor:moduleVfxAnchor,
    boardRect:id => {
      const root=id.startsWith("enemy-") ? enemyBoard : board;
      const batch=battleAnchorRects(),rect=batch.boards.get(root),layer=batch.layer;
      return rect && layer ? {left:rect.left-layer.left,top:rect.top-layer.top,width:rect.width,height:rect.height} : null;
    },
    // Ambient art needs the persistent DOM, not a successfully projected muzzle.
    rigFor:id => moduleAnchorCells.get(String(id))?.querySelector(".module-device-rig"),
    domId:serverModuleDomId,
    schedule:(delay,run) => scheduleBattleSweep(delay,run),
    sound:(cue,options) => triggerGridshardCue(cue,options),
    quality:battleGraphicsQuality,
    reduced:() => battleGraphicsQuality() === "dusuk" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    hidden:() => document.hidden || document.body.dataset.appScreen !== "play",
    load:() => battleEffectLoad(document.getElementById("battle-effect-layer")),
  });
  // State/DOM presentation completes synchronously after transport events.
  // Flush new VFX once afterward, so newly placed modules have real anchors.
  let pendingModuleVfx = null;
  function queueModuleVfx(events,snapshot) {
    if(pendingModuleVfx){pendingModuleVfx.events.push(...events||[]);pendingModuleVfx.snapshot=snapshot;return;}
    const batch={events:[...events||[]],snapshot,attacks:[],generation:battleVisualGeneration};
    pendingModuleVfx=batch;
    const flush=()=>{
      if(pendingModuleVfx!==batch)return;pendingModuleVfx=null;
      if(batch.generation!==battleVisualGeneration||document.hidden)return;
      battleAnchorBatch=null; // discard the pre-presentation geometry batch
      moduleVfx.receive(batch.events,batch.snapshot);
      for(const args of batch.attacks)moduleVfx.attack(...args);
    };
    if(typeof queueMicrotask==="function")queueMicrotask(flush);else Promise.resolve().then(flush);
  }
  const onlineBattlePresentation = new GridshardBattlePresentationQueue({
    requestFrame:(run) => window.requestAnimationFrame(run),
    cancelFrame:(id) => window.cancelAnimationFrame(id),
    rememberEvents:rememberServerDestructions,
    // Sahnede karşılığı olmayan olaylar (bkz. processLocalServerEvents).
    ignoredTypes:["module_cooldown_started", "module_heat_changed"],
    present:({ snapshot, events, snapshotChanged }) => syncOnlineServerBattle({
      type:"presentation", payload:{ snapshot, events, snapshotChanged },
    }),
  });
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

          onlineBattlePresentation.push(_message, result);

          if (
            _message?.type
              === "match_finished"
            || (
              pvpState.phase
                === "finished"
              && pvpState.finalResult
              && pvpState.resultDeliveryReady
            )
          ) {
            onlineBattlePresentation.flush();
            presentOnlineMatchFinished();
            void syncFinishedMatch();
          }

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
      impactCue:null, // Burning beam already owns the contact sound; no extra ping.
      fx:"laser",
      travelMs:260,
    },
    pulse_cannon:{
      cue:"pulse_cannon_fire",
      impactCue:"kinetic_hit",
      fx:"pulse",
      travelMs:360,
    },
    railgun:{
      cue:"railgun_fire",
      impactCue:"kinetic_hit",
      fx:"railgun",
      travelMs:220,
    },
    missile_launcher:{
      cue:"missile_fire",
      impactCue:"missile_explosion",
      fx:"missile",
      travelMs:520,
    },
    drone_bay:{
      cue:"drone_fire",
      impactCue:"kinetic_hit",
      fx:"drone",
      travelMs:430,
    },
    arc_cannon:{
      cue:"arc_cannon_fire",
      impactCue:"electrical_hit",
      fx:"arc",
      travelMs:300,
    },
    // İmza saldırı kartları en yakın temel silahın atış görselini kullanır;
    // ayırt edici görüntüleri imza efektlerinden gelir.
    plasma_mortar:{
      cue:"plasma_mortar_fire",
      impactCue:"missile_explosion",
      fx:"missile",
      travelMs:600,
    },
    quantum_repeater:{
      cue:"quantum_repeater_fire",
      impactCue:null,
      fx:"laser",
      travelMs:240,
    },
    ion_spear:{
      cue:"ion_spear_fire",
      impactCue:"electrical_hit",
      fx:"railgun",
      travelMs:220,
    },
    swarm_fabricator:{
      cue:"swarm_fabricator_fire",
      impactCue:"kinetic_hit",
      fx:"drone",
      travelMs:430,
    },
    quantum_cannon:{
      cue:"quantum_cannon_fire",
      impactCue:"kinetic_hit",
      fx:"pulse",
      travelMs:380,
    },
  });

  const CRAFTED_WEAPON_IDS = new Set(["laser","shield","cooler","battery","amplifier","emp","repair","armor","pulse_cannon","missile_launcher"]);

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
    // v15: the first ten keep their crafted WAVs; later modules use their own cue.
    if(!CRAFTED_WEAPON_IDS.has(definitionId)&&globalThis.GridshardModulePresentation?.[definitionId])return globalThis.GridshardModulePresentation[definitionId].cue;
    return weaponPresentation(
      definitionId
    ).cue;
  }

  function attackImpactCue({sourceDefinitionId=null, defended=false, targetDefinitionId=null}={}) {
    if (defended) return CRAFTED_WEAPON_IDS.has(targetDefinitionId)||!globalThis.GridshardModulePresentation?.[targetDefinitionId] ? "shield_absorb" : globalThis.GridshardModulePresentation[targetDefinitionId].cue;
    if(!CRAFTED_WEAPON_IDS.has(sourceDefinitionId)&&globalThis.GridshardModulePresentation?.[sourceDefinitionId])return null; // One quiet, complete shot sound, no layered impact ping.
    const presentation=WEAPON_PRESENTATION[String(sourceDefinitionId || "").trim().replaceAll("-", "_")];
    if (presentation && Object.hasOwn(presentation, "impactCue")) return presentation.impactCue;
    return targetDefinitionId === "core" ? "core_hit" : "module_hit";
  }

  function scheduleAttackImpactCue({
    sourceDefinitionId=null,
    defended=false,
    targetDefinitionId=null,
    travelMs=0,
    pan=0,
  }={}) {
    const cue=attackImpactCue({sourceDefinitionId, defended, targetDefinitionId});
    if (!cue) return;
    const delay=Math.max(0,Number(travelMs || 0));
    const dueAt=performance.now()+delay;
    const generation=battleVisualGeneration;
    // Reuse the battle's shared deferred queue, not one new timer per shot.
    scheduleBattleSweep(delay, () => {
      // Takılmadan sonra birikmiş vuruş sesleri topluca çalmaz.
      if (
        generation !== battleVisualGeneration
        || document.hidden
        || performance.now()-dueAt > BATTLE_FX_LATE_LIMIT_MS
      ) {
        return;
      }
      triggerGridshardCue(cue,{pan});
    });
  }

  // Left/right placement of a battle sound from its device on screen (±0.6).
  function battleCuePan(domId) {
    const rect=battleAnchorRects().modules.get(String(domId)),width=window.innerWidth || 0;
    if (!rect || !(width > 0)) return 0;
    return Math.max(-1,Math.min(1,(rect.left+rect.width/2)/width*2-1))*.6;
  }

  function selectedBattlePoolDefinitionIds() {
    return battlePoolSelection
      .selectedIds()
      .map(clientDefinitionId);
  }

  // Savaşta rafın gösterdiği deste. Eğitim maçında (ilk oyun deneyimi
  // Ayarlar'dan yeniden başlatıldığında) oyuncunun destesi değil, sunucunun
  // bildirdiği ve kurulumda gönderilen eğitim destesidir.
  function battleDeckInstanceIds() {
    const tutorialDeck = activePlayMode === "online" ? onlinePlay.tutorialDeckIds : null;
    const instanceIds = tutorialDeck ? definitionIdsToInstanceIds(tutorialDeck) : [];
    return instanceIds.length === 6 ? instanceIds : battlePoolSelection.selectedIds();
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
        closeDropdownMenus();
        screenController.render();
        syncScreenLifecycle(RelayAppScreen.PLAY);
        syncBattleClockVisibility();
      }
      if (battleJustStarted) {
        resetBattleVisualSurface();
        resetClientModulesForBattleStart();
        resetBattleResultPresentation();
        destructionFxPlayed.clear();
        preparedCorePowerFx.clear();
        snapshotModuleHp.clear();
        serverDestroyedModuleAt.clear();
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
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

  function sendPvPCommand(command) {
    if (battleCountdown.active && command.kind !== "forfeit_battle") return { ok:false, reason:"Savaş başlangıç geri sayımı devam ediyor." };
    if (!battleTransportReady()) return { ok:false, reason:"Sunucu bağlantısı bekleniyor." };
    return pvpConnection.sendCommand(
      command
    );
  }

  function buildPvPCommandEnvelope(command) {
    return pvpState.buildCommandMessage(command);
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
  const pendingBattleDeployments = [];
  const liveBattleDeployments = new Set();
  let corePowerCharge = 0;
  let corePowerReady = false;
  let corePowerTargeting = false;
  const timeEl = document.getElementById("battle-time");
  const creditEl = document.getElementById("credit-indicator");
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

  // Savaş göstergeleri her sunucu mesajında yeniden hesaplanır. Değişmeyen
  // metni yeniden yazmak metin düğümünü yeniler, düzeni geçersiz kılar ve aynı
  // turda yapılan konum ölçümünü pahalı bir düzen hesabına çevirir. Bu yüzden
  // yalnız değişen değer yazılır. Karşılaştırma yazılan kaynak metinle yapılır;
  // ekrandaki metin çeviri katmanınca değiştirilmiş olabilir. Bu öğelere başka
  // yerden yazılmaz.
  const hudTextSources = new WeakMap();

  function setHudText(element, text) {
    if (!element || hudTextSources.get(element) === text) return;
    hudTextSources.set(element, text);
    element.textContent = text;
  }

  function setHudData(element, key, value) {
    if (element && element.dataset[key] !== value) element.dataset[key] = value;
  }

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
      battleCountdown.active,
      battleTransportReady(),
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
    applyCoreVisualIdentity(corePowerButtonEl, selectedCore);
    mountCoreEmblem(corePowerButtonEl.querySelector(".core-power-glyph"), selectedCore);
    const coreCard = board?.querySelector('[data-module-id="core-1"]');
    if (coreCard && coreCard.dataset.coreWreck !== "true") {
      applyCoreVisualIdentity(coreCard, selectedCore);
      coreCard.style.setProperty("--core-charge", `${charge}%`);
      coreCard.classList.toggle("core-power-ready", corePowerReady);
      coreCard.classList.add("core-charge-card");
      coreCard.setAttribute("aria-label", `Çekirdek gücü · ${corePowerReady ? "Hazır" : "%" + charge}`);
      // v15: keep the upright core painting; rebuild only when the core type changes.
      const coreIcon=coreCard.querySelector(".module-icon");
      const standing=coreIcon?.querySelector('.module-device-rig[data-core="true"]')?.dataset.device === selectedCore;
      if (coreIcon && !standing && !GridshardModuleDeviceArt.mountCore?.(coreIcon, selectedCore)) mountCoreEmblem(coreIcon, selectedCore);
    }
    applyCoreVisualIdentity(board, selectedCore);
    corePowerButtonEl.dataset.targeting=String(corePowerTargeting);
    corePowerButtonEl.disabled=localBattleFinished || battleCountdown.active || !corePowerReady || !battleTransportReady();
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
    cueName,
    options
  ) {
    if (
      gridshardAudioDirector
      && typeof gridshardAudioDirector
        .triggerCue === "function"
    ) {
      return gridshardAudioDirector
        .triggerCue(
          cueName,
          options
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
  const localServerRequests = new GridshardBattleRequestScope();
  const localServerState = new RelayPvPClientState({ playerId:participantPlayerId });
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

  let mockEnemyCoreHp = 300;
  let mockEnemyCoreMaxHp = 300;
  let mockEnemyCoreBadges = [];
  let mockEnemyCoreType = "core_resonance";
  let mockEnemyModules = [];
  let enemyBattlePlayerId = null;
  let enemyBattleDisplayName = "";
  let enemyBattlePoolDefinitionIds = [
    ...STARTER_BATTLE_POOL_PRESET.module_definition_ids,
  ];
  let playerCellDebris = [];
  let enemyCellDebris = [];

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
    if (activePlayMode === "local" && mode !== "local" && localServerSessionId && !localBattleFinished) {
      void closeLocalServerSession(localServerSessionId);
      stopLocalServerPolling();
      localServerSessionId = null;
    }
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
    localServerRequests.reset();
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
  const devicePlaneCache = new WeakMap();

  function battleAnchorRects() {
    if (battleAnchorBatch) return battleAnchorBatch;
    const batch = { layer:null, boards:new Map(), modules:new Map(), lasers:new Map(), devices:new Map() };
    const layer = document.getElementById("battle-effect-layer");
    if (layer && typeof layer.getBoundingClientRect === "function") {
      batch.layer = layer.getBoundingClientRect();
    }
    for (const root of [board, enemyBoard]) {
      if (!root || typeof root.querySelectorAll !== "function") continue;
      if (typeof root.getBoundingClientRect === "function") batch.boards.set(root,root.getBoundingClientRect());
      for (const element of root.querySelectorAll("[data-module-id]")) {
        if (typeof element.getBoundingClientRect !== "function") continue;
        const cardRect=element.getBoundingClientRect();
        batch.modules.set(String(element.dataset.moduleId), cardRect);
        const rig=element.querySelector?.('.module-device-rig[data-yaw="continuous"]');
        if (rig) {
          let cached=devicePlaneCache.get(rig);
          if (!cached || cached.epoch!==battleLayoutEpoch || cached.width!==cardRect.width || cached.height!==cardRect.height) {
            const measureRelative=selector=>[...rig.querySelectorAll(selector)].map(marker=>{
              const r=marker.getBoundingClientRect(); return {x:r.left-cardRect.left,y:r.top-cardRect.top};
            });
            cached={epoch:battleLayoutEpoch,width:cardRect.width,height:cardRect.height,
              relative:measureRelative(".laser-plane-point"),
              sprite:["views8","layers"].includes(rig.dataset.renderer) ? measureRelative(".sprite-plane-point") : []};
            devicePlaneCache.set(rig,cached);
          }
          const points=cached.relative.map(p=>({x:p.x+cardRect.left,y:p.y+cardRect.top}));
          const plane=GridshardLaserAim.plane(points) || GridshardLaserAim.plane(null,rig.getBoundingClientRect());
          if (plane) {
            if (cached.sprite.length === 4) plane.sprite=GridshardLaserAim.plane(cached.sprite.map(p=>({x:p.x+cardRect.left,y:p.y+cardRect.top})));
            const entry={plane,host:rig.parentElement,definition:rig.dataset.device};
            batch.devices.set(String(element.dataset.moduleId),entry);
            if (rig.dataset.device === "laser") batch.lasers.set(String(element.dataset.moduleId),entry);
          }
        }
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

  function moduleVfxAnchor(moduleId, aimAt=null) {
    const batch=battleAnchorRects(),layer=batch.layer,entry=batch.devices.get(String(moduleId));
    const rect=batch.modules.get(String(moduleId));if(!layer||!rect)return null;
    const local=p=>({x:p.x-layer.left,y:p.y-layer.top});
    let center={x:rect.left+rect.width/2,y:rect.top+rect.height/2},emitter=center,pair=null;
    if(entry){
      center=GridshardLaserAim.project(entry.plane,GridshardLaserAim.PIVOT) || center;
      if(aimAt)GridshardModuleDeviceArt.aimDevice(entry.host,entry.plane,{x:aimAt.x+layer.left,y:aimAt.y+layer.top});
      const rig=entry.host.querySelector(".module-device-rig"),frame=Number(rig?.dataset.view||0);
      const data=globalThis.GridshardModuleViewData?.[entry.definition];
      const layered=entry.plane.sprite&&GridshardModuleDeviceArt.emitter?.(entry.host);
      if(layered){
        emitter=GridshardLaserAim.project(entry.plane.sprite,layered) || center;
        const coils=GridshardModuleDeviceArt.pair?.(entry.host);
        if(coils)pair=coils.map(p=>local(GridshardLaserAim.project(entry.plane.sprite,p)));
      }else if(entry.plane.sprite&&data){
        emitter=GridshardLaserAim.project(entry.plane.sprite,data.emitters[frame]) || center;
        if(data.pairs?.[frame])pair=data.pairs[frame].map(p=>local(GridshardLaserAim.project(entry.plane.sprite,p)));
      }else emitter=center;
    }
    return {center:local(center),emitter:local(emitter),pair,definition:entry?.definition,size:Math.min(rect.width,rect.height)};
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
  const battleSweepQueue = new GridshardBattleDeferredQueue();

  function scheduleBattleSweep(delayMs, run) {
    return battleSweepQueue.schedule(delayMs, run);
  }

  // Zamanı gelen bir efekt bundan uzun gecikirse (uzun kare, arka plandan
  // dönüş) gösterilmez. Gecikenlerin hepsi aynı anda çalışacağı için aksi hâlde
  // takılmanın ardından efektler ve sesler yığın hâlinde gelir.
  const BATTLE_FX_LATE_LIMIT_MS = 300;

  // Ana iş parçacığının sıkışıklığı. Savaş zamanlayıcıları (ör. merminin
  // varış anı) ne kadar geç çalışıyorsa ana iş parçacığı o kadar doludur.
  // Yumuşatılmış gecikme eşiği aşınca süs efektleri kısılır (bkz.
  // battleEffectLoad); böylece yetişemeyen cihazda efektler birikip savaşı
  // dondurmaz, yük geçince kendiliğinden geri gelir. Yetişen cihazda gecikme
  // birkaç milisaniyedir ve hiçbir şey kısılmaz.
  const BATTLE_TIMER_LAG_BUSY_MS = 30;
  const BATTLE_TIMER_LAG_OVERLOADED_MS = 60;
  let battleTimerLagMs = 0;

  function noteBattleTimerLag(dueAt) {
    // Arka plandaki sekmede zamanlayıcılar bilerek seyreltilir; yük sayılmaz.
    if (document.hidden) return;
    const lag = Math.min(1000, Math.max(0, performance.now() - dueAt));
    battleTimerLagMs += (lag - battleTimerLagMs) * 0.25;
  }

  // Gecikmeli geri bildirim (ör. Çekirdek onarımının yazısı). Süpürme HUD
  // turunda çalıştığı için o aralık kadar gecikme olağandır.
  function scheduleBattleFeedback(delayMs, run) {
    const dueAt = performance.now() + delayMs;
    return scheduleBattleSweep(delayMs, () => {
      if (performance.now() - dueAt <= BATTLE_FX_LATE_LIMIT_MS + BATTLE_HUD_RENDER_INTERVAL_MS) run();
    });
  }

  function runBattleSweep(now=performance.now()) {
    battleSweepQueue.flush(now);
  }

  // Kart/öğe üzerinde süreli vurgu sınıfı. Eski yöntem (`void el.offsetWidth`)
  // her çağrıda eşzamanlı stil ve düzen hesabı yaptırıyordu. Sınıf yoksa doğrudan
  // eklenir. Süren bir vurgu varken: Yüksek kademede sınıf kaldırılıp iki kare
  // sonra geri eklenir (animasyon baştan oynar); diğer kademelerde yalnız sınıf
  // değişir ve süre uzar, çünkü baştan başlatma iki ek ana kare ister.
  const battleFxStates = new WeakMap();

  function playBattleFxClass(element, className, durationMs, groupClasses=[className]) {
    if (!element?.classList) return;
    const generation = battleVisualGeneration;
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
      if (generation !== battleVisualGeneration) return;
      state.frame = window.requestAnimationFrame(() => {
        if (generation !== battleVisualGeneration) return;
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
    if (battleLiveTickerTimer) battleLiveTickerTimer.cancelled = true;
    battleLiveTickerTimer = scheduleBattleSweep(2100, () => {
      if (!localBattleFinished) {
        battleLiveTickerEl.textContent = "Devreler çalışıyor · etkiler modüllerin üzerinde görünür.";
        battleLiveTickerEl.dataset.kind = "neutral";
      }
    });
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
    const feedbackText = Number.isFinite(eventResult.amount)
      ? formatFloatingFeedbackAmount(
          eventResult.amount,
          eventResult.metadata?.suffix || parsed?.suffix || "",
          {
            explicitSign:Boolean(eventResult.metadata?.explicitSign),
            percent:Boolean(eventResult.metadata?.percent),
          }
        )
      : eventResult.text;
    chip.dataset.i18nSource = String(feedbackText ?? "");
    chip.textContent = battleUiText(feedbackText);
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

  const coreWaveEntries = new WeakMap();

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
    if (waveBoard) {
      const previous = coreWaveEntries.get(waveBoard);
      if (previous) previous.cancelled = true;
      waveBoard.dataset.coreWaveEffect = waveEffect;
      waveBoard.classList.add("core-wave");
      const cleanup = scheduleBattleSweep(900, () => {
        waveBoard.classList.remove("core-wave");
        delete waveBoard.dataset.coreWaveEffect;
        coreWaveEntries.delete(waveBoard);
      });
      coreWaveEntries.set(waveBoard, cleanup);
    }
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

  // Yetenek adı ve açıklaması sunucudan iki dilde gelir; İngilizce yoksa
  // (eski sunucu) Türkçe metin çeviri sözlüğünden geçer.
  function talentDisplayName(choice) {
    return document.documentElement.lang === "en" && choice?.name_en
      ? choice.name_en
      : localizedUiText(choice?.name_tr || "");
  }

  function talentDisplayDescription(choice) {
    return document.documentElement.lang === "en" && choice?.description_en
      ? choice.description_en
      : localizedUiText(choice?.description_tr || choice?.name_tr || "");
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
    "module_talent_triggered",
    "core_talent_triggered",
    "module_cycle_pulse",
    "amplifier_pulse",
  ]);

  // Modül çevrimi iş yaptığında savaşta görünen karşılık. Savunma tepkileri
  // (blok, ayna, kubbe, sabotaj direnci) adıyla; destek darbeleri yalnız bir
  // halkayla gösterilir.
  const CYCLE_PULSE_PRESENTATION = Object.freeze({
    block:{ effect:"cycle_block", label:"BLOK" },
    mirror:{ effect:"cycle_mirror", label:"AYNA" },
    dome_guard:{ effect:"cycle_dome", label:"KUBBE" },
    sabotage_guard:{ effect:"cycle_guard", label:"DİRENÇ" },
  });

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
    } else if (type === "module_cycle_pulse" || type === "amplifier_pulse") {
      const source = findSnapshotModule(snapshot, ownerId, data.module_id);
      if ((type === "amplifier_pulse" && source?.definition_id === "amplifier")
        || (type === "module_cycle_pulse" && source?.definition_id === "battery")) {
        // moduleVfx.receive already owns their physical/canvas pulses. The old
        // generic ring/link was a second presentation of the same server event.
        return true;
      }
      const sourceId = own(data.module_id);
      const presentation = CYCLE_PULSE_PRESENTATION[data.kind];
      if (!presentation) {
        // Destek darbesi: kaynağın üstünde halka, yüklenen modüllere ince bağ.
        emitSignatureBattleEffect("cycle_pulse", sourceId, {
          links:(data.charged_module_ids || []).slice(0, 4).map((moduleId) => [sourceId, own(moduleId)]),
        });
      } else {
        const links = [];
        if (data.kind === "mirror" && data.attacker_module_id) links.push([sourceId, rival(data.attacker_module_id)]);
        if (data.kind === "dome_guard" && data.target_module_id) links.push([sourceId, own(data.target_module_id)]);
        emitSignatureBattleEffect(presentation.effect, sourceId, {
          links,
          label:localizedUiText(presentation.label),
        });
      }
    } else if (type === "module_talent_triggered") {
      emitSignatureBattleEffect("talent", own(data.module_id), {
        label:talentDisplayName(data).toLocaleUpperCase(uiLocale()),
      });
    } else if (type === "core_talent_triggered") {
      const coreId = own(data.module_id)
        || (ownerId === participantPlayerId ? "core-1" : "enemy-core");
      emitSignatureBattleEffect("talent", coreId, {
        label:talentDisplayName(data).toLocaleUpperCase(uiLocale()),
      });
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
    moduleMotion.receive(events, snapshot, { ownPlayerId:participantPlayerId, domId:serverModuleDomId });
    queueModuleVfx(events, snapshot);
    requestBattleMotionFrame();
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
            scheduleBattleFeedback(170, feedback);
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
          scheduleBattleFeedback(170, () => emitServerModuleFeedback(
            snapshot,
            data.target_player_id || data.player_id,
            data.target_module_id || data.module_id,
            feedback.text,
            feedback.variant
          ));
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

      // Ağır vuruş: savunulmamış ve 40 ya da üstü hasar, ya da hedefin azami CAN'ının dörtte biri.
      const hitDamage=Math.max(0, Number(data.damage || 0));
      const targetMaxHp=Math.max(1, Number(targetModule?.max_hp || targetModule?.maxHp || 0));
      const heavyHit=!defended && (hitDamage >= 40 || hitDamage / targetMaxHp >= .25);
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
        sourceModule?.definition_id,
        heavyHit ? "heavy" : "light"
      );

      triggerGridshardCue(
        weaponCue(
          sourceModule?.definition_id
        ),
        {pan:battleCuePan(sourceId)}
      );
      scheduleAttackImpactCue({
        sourceDefinitionId:sourceModule?.definition_id,
        defended,
        targetDefinitionId:
          targetModule?.definition_id,
        travelMs,
        pan:battleCuePan(targetId),
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
    mockEnemyCoreType=CORE_VISUALS[enemy.core_type] ? enemy.core_type : "core_resonance";
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

    const events = payload.events || [];
    const applyState = payload.snapshotChanged !== false || events.some(event => event.type === "module_destroyed");

    if (applyState && !applyOnlineBattleSnapshot(snapshot)) return false;
    processLocalServerEvents(events, snapshot);
    renderBattleHud();
    if (snapshot.status === "finished") presentOnlineMatchFinished();
    return true;
  }

  function applyOnlineBattleSnapshot(snapshot) {
    battleCountdown.sync(snapshot);
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
          maxHp:Number(serverModule.max_hp ?? client.requireModule(clientModuleId).maxHp),
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
    // Transport applies state immediately; its owner does one presentation pass.
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

    if (snapshot.session_id !== localServerSessionId) return false;
    const changed = localServerState.applySnapshot(snapshot) !== false;
    const events = localServerState.applyEventsPage({
      events:envelope?.events || [], cursor:envelope?.event_cursor,
    });
    localServerEventCursor = localServerState.eventCursor;
    if (!changed) {
      processLocalServerEvents(events, localServerState.snapshot);
      return false;
    }

    battleCountdown.sync(snapshot);
    processLocalServerEvents(
      events,
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
        hp:destroyedAfterSnapshot(participantPlayerId, serverModule.instance_id, snapshot) ? 0 : Number(serverModule.hp || 0),
        maxHp:Number(serverModule.max_hp ?? client.requireModule(clientModuleId).maxHp),
        status:destroyedAfterSnapshot(participantPlayerId, serverModule.instance_id, snapshot) ? "destroyed" : serverModule.status,
        position:
          destroyedAfterSnapshot(participantPlayerId, serverModule.instance_id, snapshot) || serverModule.x === null
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

    renderBattleHud();

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
    const sessionId = localServerSessionId;
    try {
      return await localServerRequests.run(async () => {
        return await fetchWithDeadline(
          `/local-ai/sessions/${encodeURIComponent(sessionId)}/snapshot`
          + `?player_id=${encodeURIComponent(participantPlayerId)}`
          + `&cursor=${localServerEventCursor}`,
          { cache:"no-store" },
          5000,
          response => response.ok ? response.json() : null
        );
      }, payload => sessionId === localServerSessionId && applyLocalServerSnapshotEnvelope(payload));
    } catch (_error) {
      // Sunucu köprüsü açılamazsa mevcut çevrimdışı test savaşı kesilmez.
    }
  }

  async function connectLocalServerBattle() {
    stopLocalServerPolling();
    const generation = localServerRequests.generation;
    try {
      const {response, payload}=await fetchWithDeadline(
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
        8000,
        async response => ({response, payload:response.ok ? await response.json() : null})
      );
      if (!response.ok) {
        return false;
      }
      if (!payload?.session_id) return false;
      if (!localServerRequests.isCurrent(generation)) {
        void closeLocalServerSession(payload.session_id);
        return false;
      }

      localServerSessionId=
        payload.session_id;
      localServerState.bindSession(localServerSessionId);
      if (!applyLocalServerSnapshotEnvelope(payload)) return false;
      telemetryDispatcher.setSession(
        localServerSessionId
      );
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

  async function closeLocalServerSession(sessionId) {
    if (!sessionId) return false;
    try {
      const response = await fetchWithDeadline(
        `/local-ai/sessions/${encodeURIComponent(sessionId)}?player_id=${encodeURIComponent(participantPlayerId)}`,
        { method:"DELETE" }, 5000
      );
      return response.ok;
    } catch (_error) {
      // Offline exit remains responsive; server inactivity cleanup is the fallback.
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
    const sessionId = localServerSessionId;
    const generation = localServerRequests.generation;
    try {
      const {response, detail}=await fetchWithDeadline(
        `/local-ai/sessions/${encodeURIComponent(sessionId)}/commands`,
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
        5000,
        async response => ({response, detail:response.ok ? null : await response.json().catch(() => ({}))})
      );
      if (!localServerRequests.isCurrent(generation) || sessionId !== localServerSessionId) return false;
      if (!response.ok) {
        logClientMessage(
          detail.detail
          || "Sunucu savaş komutunu reddetti."
        );
        return false;
      }
      await pollLocalServerBattle();
      return true;
    } catch (_error) {
      if (localServerRequests.isCurrent(generation)) logClientMessage(
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

  const BATTLE_CARD_FX_CLASSES = Object.freeze([
    "fx-fire",
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
  ]);

  // Sahnedeki bütün geçici efektleri ve bekleyen efekt işlerini bırakır; savaş
  // durumu (tahta, Akım, Çekirdek gücü) yerinde kalır.
  function clearBattleEffects() {
    clearBattleDeployments();
    moduleMotion.reset();
    pendingModuleVfx=null;
    moduleVfx.reset();
    battleVisualGeneration += 1;
    if (signatureEffectFrame !== null) window.cancelAnimationFrame?.(signatureEffectFrame);
    signatureEffectFrame = null;
    pendingSignatureEffects.length = 0;
    battleSweepQueue.reset();
    battleLiveTickerTimer = null;
    battleLiveTickerEl?.classList.remove("pulse");
    for (const battleBoard of [board, enemyBoard]) {
      battleBoard?.classList.remove("core-wave");
      if (battleBoard) delete battleBoard.dataset.coreWaveEffect;
    }
    creditEl?.classList.remove("credit-insufficient");
    clearArenaPulse();
    signatureEffectsLive = 0;
    for (const effectId of [...floatingFeedbackLive.keys()]) {
      removeFloatingFeedbackRecord(effectId);
    }
    battleEffectAggregator?.clear?.();
    clearBattleVisualElement(document.getElementById("battle-effect-layer"));
  }

  // Uygulama arka plandan dönünce: beklemiş olaylar ve yarım kalmış efektler
  // oynatılmaz, sahne en yeni durumdan devam eder.
  const BATTLE_RESUME_DISCARD_AFTER_MS = 700;
  let battleHiddenAt = null;

  function handleBattleVisibilityChange() {
    syncBattleClockVisibility();
    if (document.hidden) {
      clearBattleDeployments();
      moduleMotion.clear();
      pendingModuleVfx=null;
      moduleVfx.clearEffects();
      battleHiddenAt = performance.now();
      return;
    }
    const hiddenFor = battleHiddenAt === null ? 0 : performance.now() - battleHiddenAt;
    battleHiddenAt = null;
    if (hiddenFor < BATTLE_RESUME_DISCARD_AFTER_MS || activePlayMode === "idle") return;
    onlineBattlePresentation.discardEffects();
    clearBattleEffects();
    battleTimerLagMs = 0;
    for (const card of document.querySelectorAll("#board .module-card, #enemy-board .module-card")) {
      card.classList.remove(...BATTLE_CARD_FX_CLASSES);
    }
  }

  document.addEventListener("visibilitychange", handleBattleVisibilityChange);

  function resetBattleVisualSurface() {
    battleCountdown.cancel();
    onlineBattlePresentation.reset();
    clearBattleEffects();
    battleTimerLagMs = 0;
    moduleAnchorRects.clear();
    moduleAnchorCells.clear();
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
    if (localServerSessionId) void closeLocalServerSession(localServerSessionId);
    resetBattleVisualSurface();
    pvpConnection.disconnect();

    stopLocalServerPolling();
    localServerSessionId=null;
    localServerAuthoritative=false;
    localServerEventCursor=0;
    localServerState.reset();
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
    mockEnemyCoreType =
      "core_resonance";
    mockEnemyModules =
      [];

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
    if (localServerSessionId && !localBattleFinished) void closeLocalServerSession(localServerSessionId);
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

    setHudText(
      playerCoreSummaryEl,
      `Sen: Çekirdek ${
        Math.max(
          0,
          Number(core?.hp || 0)
        )
      }/${core?.maxHp || 300}`
    );

    setHudText(
      playerBoardStatusEl,
      `Çekirdek ${Math.max(0,Number(core?.hp||0))}/${core?.maxHp||300} · Enerji %${Math.round(Number(client.energyLoadRatio || 0) * 100)}`
    );

    const playerSide=
      document.querySelector(
        ".duel-player-side"
      );
    setHudData(
      playerSide,
      "coreCritical",
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
      )
    );

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

  // Sıradan vuruş küçük ve kısadır; yalnız ağır vuruşta (impact "heavy") halka ve
  // bütün kıvılcımlar çizilir. Sürekli atışta ekran parlamayla dolmaz.
  function emitDuelImpactEffect({
    layer,
    x,
    y,
    targetModuleId,
    kind,
    weapon,
    impactLevel="light",
  }) {
    const heavy=impactLevel === "heavy";
    // Efekt bütçesinin iki katı aşıldıysa vuruş parlaması da çizilmez; kart
    // vurgusu ve hasar yazısı kalır.
    if (battleEffectLoad(layer) >= 2) {
      pulseBattleFx(
        targetModuleId,
        kind === "shield"
          ? "shield"
          : "hit"
      );
      return;
    }
    const impact=
      document.createElement("span");
    impact.className="duel-hit-impact";
    impact.dataset.kind=kind;
    impact.dataset.weapon=weapon;
    impact.dataset.impact=heavy ? "heavy" : "light";
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
      if (heavy) {
        const ring=
          document.createElement("span");
        ring.className="duel-impact-ring";
        impact.appendChild(ring);
      }
      const quality=battleGraphicsQuality();
      if (quality === "yuksek") {
        const sparkCount=heavy ? 10 : 4;
        for (let index=0;index<sparkCount;index+=1) {
          const spark=
            document.createElement("i");
          spark.style.setProperty(
            "--impact-angle",
            `${index*(360/sparkCount)+(index%2)*9}deg`
          );
          impact.appendChild(spark);
        }
      } else if (quality === "orta" && heavy) {
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
    definitionId="laser",
    impactLevel="light"
  ) {
    if (
      !sourceModuleId
      || !targetModuleId
    ) {
      return 0;
    }
    // First-ten physical projectiles/laser have one VFX owner. Later weapons
    // retain their existing presentation; do not draw both old and new beams.
    if (typeof moduleVfx !== "undefined") {
      const duration=GridshardModuleVfx.travelFor(definitionId);
      if(duration!==null&&pendingModuleVfx){pendingModuleVfx.attacks.push([sourceModuleId,targetModuleId,definitionId,kind === "shield"]);return duration;}
      const result=moduleVfx.attack(sourceModuleId,targetModuleId,definitionId,kind === "shield");
      if(result !== null)return result;
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
    let x1=
      sourceRect.left
      + sourceRect.width/2
      - layerRect.left;
    let y1=
      sourceRect.top
      + sourceRect.height/2
      - layerRect.top;
    const targetBatch=battleAnchorRects();
    const targetLaser = (targetBatch.devices || targetBatch.lasers).get(String(targetModuleId));
    const targetPoint = targetLaser ? GridshardLaserAim.project(targetLaser.plane,GridshardLaserAim.PIVOT)
      : {x:targetRect.left+targetRect.width/2,y:targetRect.top+targetRect.height/2};
    const x2=targetPoint.x-layerRect.left;
    const y2=targetPoint.y-layerRect.top;
    // Resolve from the same batched plane geometry as the rotating head. The
    // instantaneous server shot aligns its head before this beam is painted.
    const shotBatch=battleAnchorRects();
    const laser = (shotBatch.devices || shotBatch.lasers).get(String(sourceModuleId));
    const aimFn=GridshardModuleDeviceArt.aimDevice || GridshardModuleDeviceArt.aimLaser;
    const aim = laser && aimFn(laser.host,laser.plane,{x:x2+layerRect.left,y:y2+layerRect.top});
    if (aim) { x1=aim.muzzle.x-layerRect.left; y1=aim.muzzle.y-layerRect.top; }
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
    if (aim) line.dataset.emitter=definitionId;
    line.dataset.weapon=
      presentation.fx;
    line.dataset.impact=impactLevel === "heavy" ? "heavy" : "light";
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
    const impactDueAt = performance.now() + presentation.travelMs;
    window.setTimeout(
      () => {
        noteBattleTimerLag(impactDueAt);
        // Savaş değiştiyse ya da vuruş anı çoktan geçtiyse (takılma) vuruş çizilmez.
        if (
          visualGeneration !== battleVisualGeneration
          || performance.now() - impactDueAt > BATTLE_FX_LATE_LIMIT_MS
        ) {
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
          impactLevel,
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
    effect.dataset.material = "painted-device";
    if (core && targetElement) {
      const accent = getComputedStyle(targetElement).getPropertyValue("--core-accent").trim();
      if (accent) effect.style.setProperty("--explosion-color", accent);
    }
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
      const collapse=document.createElement("span");collapse.className="core-collapse-ring";
      effect.appendChild(collapse);
    }

    const particleCount = battleParticleBudget(core ? 20 : 12);
    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("i");
      particle.dataset.fragment = index % 3 === 0 ? "casing" : index % 3 === 1 ? "crystal" : "spark";
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
  // Aynı düzeydeki sarsıntı bu aralıktan sık yinelenmez: sürekli atış altında
  // arena durmadan sarsılmaz. Çekirdek patlaması her zaman oynar.
  const ARENA_PULSE_REPEAT_GAP_MS = Object.freeze({ light:900, medium:700, heavy:450, core:0 });
  const arenaPulseLastAt = new Map();
  let arenaPulseLevel = null;
  let arenaPulseTimer = 0;
  let lastBattleVibrationAt = -Infinity;

  function clearArenaPulse() {
    window.clearTimeout(arenaPulseTimer);
    arenaPulseLevel = null;
    arenaPulseLastAt.clear();
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
    const pulseAt = performance.now();
    if (pulseAt - (arenaPulseLastAt.get(level) ?? -Infinity) < ARENA_PULSE_REPEAT_GAP_MS[level]) {
      return false;
    }
    arenaPulseLastAt.set(level, pulseAt);
    // Süren sarsıntı başka düzeye geçerse sınıf değişir ve yeni animasyon
    // kendiliğinden başlar; kare beklenmez (bkz. playBattleFxClass).
    for (const name of ARENA_PULSE_CLASSES) {
      if (name !== config.className) arena.classList.remove(name);
    }
    arena.classList.add(config.className);
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
    // Modül imza yeteneği tetiklendi: modülün üstünde yeteneğin adı belirir.
    talent:{ priority:2, lifetimeMs:1100, particles:6, cue:null, minRepeatMs:900 },
    // Modül çevrimleri: savunma tepkileri ve destek darbeleri.
    cycle_block:{ priority:2, lifetimeMs:760, particles:4, cue:null, minRepeatMs:500 },
    cycle_mirror:{ priority:2, lifetimeMs:820, particles:4, cue:null, minRepeatMs:500 },
    cycle_dome:{ priority:2, lifetimeMs:820, particles:4, cue:null, minRepeatMs:600 },
    cycle_guard:{ priority:2, lifetimeMs:900, particles:4, cue:null, minRepeatMs:600 },
    cycle_pulse:{ priority:1, lifetimeMs:680, particles:0, cue:null, minRepeatMs:900 },
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
  const pendingSignatureEffects = [];
  let signatureEffectFrame = null;

  function queueSignatureEffect(effect) {
    pendingSignatureEffects.push(effect);
    if (signatureEffectFrame === null) signatureEffectFrame = window.requestAnimationFrame(flushSignatureEffects);
  }

  function flushSignatureEffects() {
    signatureEffectFrame = null;
    const queued = pendingSignatureEffects.splice(0);
    const ready = [];
    for (const effect of queued) {
      if (effect.generation !== battleVisualGeneration) continue;
      if (performance.now() - effect.createdAt >= 600) {
        signatureEffectsLive = Math.max(0, signatureEffectsLive - 1);
      } else ready.push(effect);
    }
    if (!ready.length) return;
    // All geometry is read before any effect enters the connected DOM. This
    // also prevents microtasks between separate rAF callbacks invalidating it.
    battleAnchorBatch = null;
    battleAnchorRects();
    const allNodes = [];
    for (const effect of ready) {
      const nodes = buildSignatureEffectNodes(effect.kind, effect.anchorId, {
        links:effect.links, label:effect.label, lifetimeMs:effect.lifetime,
        particleCount:signatureParticleCount(effect.particles), append:false,
      });
      allNodes.push(...nodes);
      scheduleBattleSweep(effect.lifetime, () => {
        for (const node of nodes) node.remove();
        signatureEffectsLive = Math.max(0, signatureEffectsLive - 1);
      });
    }
    document.getElementById("battle-effect-layer")?.append(...allNodes);
    battleAnchorBatch = null;
  }

  // Efekt yükü. Savaş kalabalıklaştıkça aynı anda yaşayan efekt öğeleri artar
  // ve her biri her ana karede stil hesabına girer; düşük donanımda kareleri
  // asıl düşüren budur. Katmandaki canlı efekt kökü sayısı kademe bütçesini
  // aşınca süs parçaları (namlu parlaması, halka, kıvılcım), iki katını aşınca
  // atış çizgisi atlanır. Hasar yazısı ve kart vurgusu her zaman kalır.
  const BATTLE_EFFECT_ROOT_BUDGET = Object.freeze({ dusuk:8, orta:14, yuksek:32 });

  // Ana iş parçacığının sıkışıklığı (bkz. noteBattleTimerLag): 0 rahat,
  // 1 sıkışık, 2 yetişemiyor.
  function battleTimerLoad() {
    if (battleTimerLagMs >= BATTLE_TIMER_LAG_OVERLOADED_MS) return 2;
    return battleTimerLagMs >= BATTLE_TIMER_LAG_BUSY_MS ? 1 : 0;
  }

  function battleEffectLoad(layer) {
    const budget = BATTLE_EFFECT_ROOT_BUDGET[battleGraphicsQuality()] || 32;
    const live = Number(layer?.childElementCount || 0);
    const crowding = live >= budget * 2 ? 2 : (live >= budget ? 1 : 0);
    return Math.max(crowding, battleTimerLoad());
  }

  // Patlama parçacığı bütçesi; her parçacık ayrı bir animasyonlu öğedir.
  // Sıkışık anda yarıya, yetişemezken dörtte bire iner.
  function battleParticleBudget(baseCount) {
    const quality = battleGraphicsQuality();
    const count = quality === "dusuk"
      ? Math.min(4, Math.ceil(baseCount / 4))
      : (quality === "orta" ? Math.ceil(baseCount / 2) : baseCount);
    const load = battleTimerLoad();
    return load === 0 ? count : Math.min(count, Math.ceil(baseCount / (load === 1 ? 2 : 4)));
  }

  function signatureEffectMinimumPriority() {
    const quality = battleGraphicsQuality();
    // Yük altında yalnız belirleyici imza efektleri çizilir.
    const floor = [1, 2, 3][battleTimerLoad()];
    if (quality === "dusuk") {
      return Math.max(floor, signatureEffectsLive >= 3 ? 4 : 3);
    }
    const steps = quality === "orta"
      ? [[6, 4], [4, 3], [2, 2]]
      : [[9, 4], [6, 3], [4, 2]];
    for (const [liveCount, priority] of steps) {
      if (signatureEffectsLive >= liveCount) return Math.max(floor, priority);
    }
    return floor;
  }

  function signatureParticleCount(baseCount) {
    const quality = battleGraphicsQuality();
    if (quality === "dusuk" || battleTimerLoad() === 2) return 0;
    return quality === "orta" || battleTimerLoad() === 1 ? Math.ceil(baseCount / 2) : baseCount;
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
    { links, label, lifetimeMs, particleCount, append=true }
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
      tag.dataset.i18nSource = String(label);
      tag.textContent = battleUiText(label);
      effect.appendChild(tag);
    }
    nodes.push(effect);
    if (append) layer.append(...nodes);
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
    queueSignatureEffect({kind, anchorId, links:validLinks, label, lifetime,
      particles:config.particles, createdAt:now, generation:visualGeneration});
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

    // Deste adını oyuncu yazar; HTML olarak yorumlanmaz.
    const summaryName = document.createElement("strong");
    summaryName.textContent = `${favorite}${activeBattlePoolPresetName}`;
    const summaryDetail = document.createElement("span");
    summaryDetail.textContent =
      `${selectedCount}/6 kart · ${clean ? "Kayıtla aynı" : "Değiştirildi"} · ${freshness}`;
    quickLoadoutActiveSummaryEl.replaceChildren(summaryName, summaryDetail);
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
    const text = globalThis.GridshardI18n
      ?.translateText(
        String(value ?? ""),
        document.documentElement.lang
      ) || String(value ?? "");
    // Modülün adı yalnız "Onarım"dır; eski sunucu verisi "Onarım Modülü" gönderir.
    return text.includes("Onarım Modülü") ? text.replaceAll("Onarım Modülü", "Onarım") : text;
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
        mountModuleEmblem(icon, module);
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
        mountModuleEmblem(chipIcon, module);
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
    mountModuleEmblem(icon, module);
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

  // Sabit bağlantı ışığı ayrı SVG katmanında; akış animasyonu yoktur.
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
    battleAnchorBatch=null;
    moduleMotion.invalidateGeometry();
    moduleFx?.invalidateLayout();
    requestBattleMotionFrame();
    if (battleLayoutRefreshQueued) return;
    battleLayoutRefreshQueued = true;
    const refresh = () => {
      battleLayoutRefreshQueued = false;
      fitCircuitScene();
      if (board) renderBoardCables(board, playerCircuitCableModules());
      if (enemyBoard) renderBoardCables(enemyBoard, enemyCircuitCableModules());
      positionCircuitVs();
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(refresh);
    else refresh();
  }

  function circuitSceneLayout({width,height,headerHeight,footerHeight,tilt=30,zoom=1.08}) {
    const baseGap=Math.max(8,Math.min(10,width*.02));
    const baseBetween=Math.max(24,Math.min(30,height*.04));
    const yScale=Math.cos(tilt*Math.PI/180)*zoom;
    // Identity and deck must finish BEFORE the rear metal rim. Equipment can
    // stand above its socket, so keep the complete upper rim clear as well.
    const usable=Math.max(1,height-headerHeight-footerHeight-50-baseBetween);
    const byHeight=(usable/(3.6*yScale)-2*baseGap)/3;
    const byWidth=(width*.9/zoom-4*baseGap)/5;
    const baseSize=Math.max(12,Math.min(84,byHeight,byWidth));
    const baseHeight=(3*baseSize+2*baseGap)*yScale;
    const available=Math.max(1,height-headerHeight-footerHeight-9);
    // Enlarge the complete live circuit, including its sockets and gutters.
    // Reclaim empty outer margins first; very short/narrow viewports still fit.
    const growth=Math.min(1.10,(available-8)/(3.6*baseHeight));
    const size=baseSize*growth,gap=baseGap*growth;
    const boardHeight=3*size+2*gap,projectedHeight=boardHeight*yScale;
    const between=Math.max(8,Math.min(baseBetween,available-3.6*projectedHeight));
    const sceneTop=4+headerHeight;
    const inset=(boardHeight-projectedHeight)/2;
    const enemyTop=sceneTop+.32*projectedHeight-inset;
    const playerTop=sceneTop+1.8*projectedHeight+between+.32*projectedHeight-inset;
    // Preserve earlier increases and apply this revision's additional 10%.
    // Circuit enlargement stays independent. Core/module normalization is .85.
    const equipmentSize=baseSize*.92*1.15*1.10*1.10;
    return {size,gap,enemyTop,playerTop,boardHeight,projectedHeight,equipmentSize,growth,
      rimBottom:sceneTop+3.6*projectedHeight+between};
  }

  function fitCircuitScene() {
    const arena=board?.closest?.('.vertical-circuit-arena');
    if(!arena?.clientWidth || !arena.clientHeight)return;
    const header=arena.querySelector('.duel-enemy-identity');
    const footer=arena.querySelector('.duel-player-identity');
    if(!header || !footer)return;
    const style=getComputedStyle(arena);
    const layout=circuitSceneLayout({width:arena.clientWidth,height:arena.clientHeight,
      headerHeight:header.offsetHeight,footerHeight:footer.offsetHeight,
      tilt:parseFloat(style.getPropertyValue('--gs-camera-tilt'))||0,
      zoom:parseFloat(style.getPropertyValue('--gs-camera-zoom'))||1});
    for(const [key,value] of [['--gs-battle-card-size',layout.size],['--gs-board-gap',layout.gap],
      ['--scene-enemy-top',layout.enemyTop],['--scene-player-top',layout.playerTop],
      ['--gs-equipment-size',layout.equipmentSize]]){
      const next=`${Math.floor(value*1000)/1000}px`;
      if(arena.style.getPropertyValue(key)!==next)arena.style.setProperty(key,next);
    }
  }

  function positionCircuitVs() {
    // Only on layout invalidation, never on combat ticks. The two paintings
    // have asymmetric rim depth, so the grid-row midpoint is not their visual
    // midpoint. Invisible registration points share the actual terrain camera.
    const arena=board?.closest?.('.vertical-circuit-arena');
    const vs=arena?.querySelector('.duel-vs');
    const upper=arena?.querySelector('[data-circuit-rim="bottom"]');
    const lower=arena?.querySelector('[data-circuit-rim="top"]');
    if(!vs || !upper || !lower || !board.clientWidth || !enemyBoard?.clientWidth)return;
    const a=upper.getBoundingClientRect(),b=lower.getBoundingClientRect(),r=vs.getBoundingClientRect();
    if(!r.height)return;
    const current=parseFloat(vs.style.getPropertyValue('--circuit-vs-offset')) || 0;
    const offset=Math.round((current+(a.top+b.top)/2-(r.top+r.height/2))*100)/100;
    if(Math.abs(offset-current)>.1)vs.style.setProperty('--circuit-vs-offset',`${offset}px`);
  }

  function observeBattleLayout(element) {
    if (!element || typeof ResizeObserver !== "function") return;
    if (!battleLayoutObserver) {
      battleLayoutObserver = new ResizeObserver(() => invalidateBattleLayout());
    }
    battleLayoutObserver.observe(element);
    const arena=element.closest?.('.vertical-circuit-arena');
    if(arena)battleLayoutObserver.observe(arena);
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
    // Transparent equal hitboxes register to the island's single native
    // floor. Cables use their real recessed seams, never a second drawn grid.
    const cell=(x,y)=>geometry.cells.get(`${x},${y}`);
    if(cell(0,0) && cell(4,2)){
      geometry.channelX=[0,...[1,2,3,4].map(x=>{
        const a=cell(x-1,0),b=cell(x,0);return (a.left+a.width+b.left)/2/geometry.width;
      }),1];
      geometry.channelY=[0,...[1,2].map(y=>{
        const a=cell(0,y-1),b=cell(0,y);return (a.top+a.height+b.top)/2/geometry.height;
      }),1];
    }
    return geometry;
  }

  // Channels are a measured graph of the gutters around the 15 sockets.
  // Equipment can tap its upper OR lower channel. Dijkstra selects the
  // shortest physical length; equal lengths prefer fewer bends. No path can
  // use a socket interior as a shortcut.
  function circuitGutterGraph(geometry) {
    const nodes=[], junctions=new Map(), ports=new Map();
    const cell=(x,y)=>geometry.cells.get(`${x},${y}`);
    if (!cell(0,0) || !cell(4,2)) return {nodes,ports};
    const gapX=cell(1,0).left-cell(0,0).left-cell(0,0).width;
    const gapY=cell(0,1).top-cell(0,0).top-cell(0,0).height;
    const xs=geometry.channelX?.map(x=>x*geometry.width) || Array.from({length:6},(_,x)=>x===0 ? cell(0,0).left-gapX/2
      : cell(x-1,0).left+cell(x-1,0).width+gapX/2);
    const ys=geometry.channelY?.map(y=>y*geometry.height) || Array.from({length:4},(_,y)=>y===0 ? cell(0,0).top-gapY/2
      : cell(0,y-1).top+cell(0,y-1).height+gapY/2);
    const add=(x,y)=>{const id=nodes.length;nodes.push({x,y,id,links:[]});return id;};
    const link=(a,b)=>{const length=Math.abs(nodes[a].x-nodes[b].x)+Math.abs(nodes[a].y-nodes[b].y);
      nodes[a].links.push({id:b,length});nodes[b].links.push({id:a,length});};
    for(let y=0;y<4;y++)for(let x=0;x<6;x++)junctions.set(`${x},${y}`,add(xs[x],ys[y]));
    for(let y=0;y<4;y++)for(let x=0;x<6;x++){
      const a=junctions.get(`${x},${y}`);
      if(y<3)link(a,junctions.get(`${x},${y+1}`));
      if(x<5){
        {
          const c=cell(x,Math.min(y,2));
          const midpoint=add(c.left+c.width/2,ys[y]);
          link(a,midpoint);link(midpoint,junctions.get(`${x+1},${y}`));
          for(const row of [y-1,y]){
            if(row<0 || row>2)continue;
            const socket=cell(x,row),key=`${x},${row}`;
            if(!ports.has(key))ports.set(key,{taps:[]});
            ports.get(key).taps.push({node:midpoint,side:row===y ? "top" : "bottom",
              point:{x:socket.left+socket.width/2,y:socket.top+(row===y ? 0 : socket.height)}});
          }
        }
      }
    }
    return {nodes,ports,bevel:geometry.channelX ? Math.min(1.5,geometry.width*.003) : Math.max(0,Math.min(3,Math.min(gapX,gapY)/2-4))};
  }

  function circuitCableRoutes(modules) {
    const validCells=new Set(BOARD_CELLS.map(([x,y])=>`${x},${y}`));
    const live=modules.filter(m=>m?.position && validCells.has(cablePositionKey(m.position))
      && m.status!=="destroyed" && Number(m.hp??1)>0);
    const core=live.find(m=>m.definitionId==="core" || m.nameTr==="Çekirdek");
    const fedCells=new Set(),energizedEdges=new Set();
    if(core)for(const m of live){
      if(m!==core && m.isPowered===false)continue;
      const key=cablePositionKey(m.position);fedCells.add(key);
      if(m!==core)energizedEdges.add(key);
    }
    return {coreKey:core ? cablePositionKey(core.position) : null,fedCells,energizedEdges};
  }

  function circuitChamferPath(points, bevel) {
    const compact=[];
    for(const p of points){
      if(compact.length && compact.at(-1).x===p.x && compact.at(-1).y===p.y)continue;
      while(compact.length>1){
        const a=compact.at(-2),b=compact.at(-1);
        if((a.x===b.x && b.x===p.x)||(a.y===b.y && b.y===p.y))compact.pop();else break;
      }
      compact.push(p);
    }
    if(!compact.length)return "";
    const coordinate=p=>`${Math.round(p.x*100)/100} ${Math.round(p.y*100)/100}`;
    let path=`M ${coordinate(compact[0])}`;
    for(let i=1;i<compact.length-1;i++){
      const a=compact[i-1],b=compact[i],c=compact[i+1];
      const before=Math.abs(b.x-a.x)+Math.abs(b.y-a.y),after=Math.abs(c.x-b.x)+Math.abs(c.y-b.y);
      const cut=Math.min(bevel,before/2,after/2);
      path+=` L ${coordinate({x:b.x+(a.x-b.x)*cut/before,y:b.y+(a.y-b.y)*cut/before})}`;
      path+=` L ${coordinate({x:b.x+(c.x-b.x)*cut/after,y:b.y+(c.y-b.y)*cut/after})}`;
    }
    return path+` L ${coordinate(compact.at(-1))}`;
  }

  function shortestCircuitPaths(graph, sourceKey) {
    const source=graph.ports.get(sourceKey),paths=new Map();
    if(!source)return paths;
    const distance=graph.nodes.map(()=>Infinity),turns=graph.nodes.map(()=>Infinity);
    const previous=graph.nodes.map(()=>-1),origins=graph.nodes.map(()=>null),done=new Set();
    for(const tap of source.taps){
      distance[tap.node]=Math.abs(tap.point.y-graph.nodes[tap.node].y);
      turns[tap.node]=0;origins[tap.node]=tap;
    }
    while(done.size<graph.nodes.length){
      let id=-1;
      for(const node of graph.nodes)if(!done.has(node.id) && (id<0 || distance[node.id]<distance[id]
        || (distance[node.id]===distance[id] && turns[node.id]<turns[id])))id=node.id;
      if(id<0 || !Number.isFinite(distance[id]))break;
      done.add(id);
      const node=graph.nodes[id],prior=graph.nodes[previous[id]];
      for(const edge of node.links){
        if(done.has(edge.id))continue;
        const next=graph.nodes[edge.id],length=distance[id]+edge.length;
        const bend=turns[id]+(prior && (prior.x===node.x)!==(node.x===next.x) ? 1 : 0);
        if(length<distance[edge.id]-1e-6 || (Math.abs(length-distance[edge.id])<1e-6 && bend<turns[edge.id])){
          distance[edge.id]=length;turns[edge.id]=bend;previous[edge.id]=id;origins[edge.id]=origins[id];
        }
      }
    }
    for(const [key,target] of graph.ports){
      if(key===sourceKey)continue;
      const end=target.taps.reduce((best,tap)=>{
        const length=distance[tap.node]+Math.abs(tap.point.y-graph.nodes[tap.node].y);
        return !best || length<best.length ? {tap,length} : best;
      },null);
      const start=origins[end.tap.node];
      const points=[end.tap.point];let at=end.tap.node;
      while(at>=0){points.push(graph.nodes[at]);at=previous[at];}
      points.push(start.point);points.reverse();
      paths.set(key,{d:circuitChamferPath(points,graph.bevel),points,
        length:end.length,startSide:start.side,endSide:end.tap.side});
    }
    return paths;
  }

  function boardCableState(boardElement, layer) {
    let state=boardCableStates.get(layer);
    if(state && state.epoch===battleLayoutEpoch && typeof ResizeObserver==="function" && state.graph.ports.size>0)return state;
    if(!state)observeBattleLayout(boardElement);
    const geometry=measureBoardCableGeometry(boardElement),currentLayer=ensureBoardCurrentLayer(boardElement,layer);
    layer.replaceChildren();currentLayer.replaceChildren();
    boardElement.querySelector(":scope > .board-cable-flow-layer")?.remove();
    for(const svg of [layer,currentLayer])svg.setAttribute("viewBox",`0 0 ${geometry.width} ${geometry.height}`);
    const wires=new Map();
    for(const [x,y] of BOARD_CELLS){
      const paths=[];
      for(const [parent,name] of [[layer,"jacket"],[layer,"base"],[currentLayer,"glow"],[currentLayer,"current"]]){
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.classList.add(`circuit-cable-${name}`);path.setAttribute("visibility","hidden");
        parent.appendChild(path);paths.push(path);
      }
      wires.set(`${x},${y}`,{paths,d:null,visible:false});
    }
    state={epoch:battleLayoutEpoch,geometry,graph:circuitGutterGraph(geometry),wires,routeCache:new Map(),fedSignature:null};
    boardCableStates.set(layer,state);return state;
  }

  function renderBoardCables(boardElement, moduleIterable=[]) {
    const layer=ensureBoardCableLayer(boardElement);
    if(!layer)return;
    const state=boardCableState(boardElement,layer);
    const {coreKey,fedCells,energizedEdges}=circuitCableRoutes([...moduleIterable]);
    const signature=[...fedCells].sort().join("|");
    if(signature!==state.fedSignature){
      state.fedSignature=signature;
      for(const cell of boardElement.querySelectorAll(".board-cell")){
        const fed=fedCells.has(`${cell.dataset.x},${cell.dataset.y}`);
        cell.classList.toggle("energy-fed-cell",fed);cell.dataset.energyFed=String(fed);
      }
    }
    if(coreKey && !state.routeCache.has(coreKey))state.routeCache.set(coreKey,shortestCircuitPaths(state.graph,coreKey));
    const routes=state.routeCache.get(coreKey);
    for(const [key,wire] of state.wires){
      const route=routes?.get(key),visible=Boolean(route && energizedEdges.has(key));
      if(visible && route.d!==wire.d){for(const path of wire.paths)path.setAttribute("d",route.d);wire.d=route.d;}
      if(visible!==wire.visible){for(const path of wire.paths)path.setAttribute("visibility",visible ? "visible" : "hidden");wire.visible=visible;}
    }
    if(boardElement===board)renderCorePowerControl();
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
      .filter((badge) => Object.hasOwn(SIGNATURE_BADGE_KINDS, badge?.kind))
      .slice(0, SIGNATURE_BADGE_LIMIT)
      .map((badge) => ({
        kind:badge.kind,
        value:Math.max(0, Math.round(Number(badge.value || 0))),
        max:Math.max(0, Math.round(Number(badge.max || 0))),
        phase:badge.phase === "debt" ? "debt" : (badge.phase ? "boost" : null),
      }));
  }


  const battleCardStateView = new GridshardBattleCardStateView({
    document,
    mountIcon:(icon, model, card) => {
      icon.classList.remove("has-module-device");
      if (model.core) {
        // Deployed core uses the approved upright painting, fitted to one socket.
        delete icon.dataset.coreEmblem;
        if (!GridshardModuleDeviceArt.mountCore?.(icon, model.coreType, {destroyed:model.coreDestroyed})) mountCoreEmblem(icon, model.coreType);
        applyCoreVisualIdentity(card, model.coreType);
      } else if (model.physical) {
        GridshardModuleDeviceArt.mount(icon, model.module, model.enemy);
      }
      else mountModuleEmblem(icon, model.module);
    },
    onTooltip:updateShelfTooltipPlacement,
  });

  function battleUiText(value) {
    const source = String(value ?? "").replaceAll("Onarım Modülü", "Onarım");
    return document.documentElement.lang === "en" ? localizedUiText(source) : source;
  }

  function battleCardModel(moduleLike, { enemy=false }={}) {
    const name = GridshardModuleDeviceArt.idFor(moduleLike) === "armor"
      ? "Sönümleyici" : moduleLike.nameTr ?? moduleLike.name ?? "";
    const core = moduleLike.definitionId === "core" || moduleLike.kind === "core" || name === "Çekirdek";
    const coreDestroyed = core && Number(moduleLike.hp) <= 0;
    const coreType = enemy ? mockEnemyCoreType : metaProgressionState?.cores?.selected_core_type || "core_resonance";
    const received = Math.max(0, Number(moduleLike.energyReceived || 0));
    const required = Math.max(0, Number(moduleLike.energyRequired || 0));
    const flowing = core ? moduleLike.isPowered && received > 0 : moduleLike.isPowered && required > 0 && received > 0;
    let powerMessage = "";
    if (!flowing && required > 0) powerMessage = battleUiText({
      emp_disabled:"EMP etkisi bu modülün enerji sistemini devre dışı bıraktı.",
      line_disrupted:"Kesici etkisi bu modülün enerji hattını geçici olarak kopardı.",
      insufficient_supply:"Çekirdek enerji ihtiyacı: " + required.toFixed(1) + " Ü, gelen: " + received.toFixed(1) + " Ü.",
      waiting_energy:"Enerji rezervi bu modülün sıradaki eylemine yetmiyor; enerji birikince ateşler.",
    }[moduleLike.powerReason] || "Bu modül devre dışı. Sabotaj etkilerini ve Çekirdek enerji baskısını kontrol edin.");
    const heat = Math.min(MODULE_MAX_HEAT, Math.max(0, Number(moduleLike.heat || 0)));
    const heatEffect = moduleHeatEffectLabel(moduleLike);
    const heatText = "Isı %" + Math.round(heat);
    const liveBadges = [];
    const addLive = (key, label, kind, title) => liveBadges.push({
      key, label, className:"module-live-status " + kind, title:battleUiText(title),
    });
    if (moduleLike.overheated) addLive("heat", "♨", "heat-critical overheated",
      "Aşırı ısındı · " + heatText + " · %70'in altına inince yeniden çalışır");
    else if (heat >= MODULE_HEAT_HIGH) addLive("heat", "♨", heat >= MODULE_MAX_HEAT ? "heat-critical" : "heat-high",
      heatEffect ? heatText + " · " + heatEffect : heatText);
    if (moduleLike.energyWaiting) addLive("waiting", "ϟ", "energy-waiting", "Enerji bekliyor · enerji sırası gelince çalışır");
    const debuffs = (Array.isArray(moduleLike.debuffs) ? moduleLike.debuffs : []).filter(id => id !== "overheated");
    if (debuffs.length) addLive("debuff", "!" + (debuffs.length > 1 ? debuffs.length : ""), "debuffed", "Aktif olumsuz etki: " + debuffs.join(", "));
    const signatureBadges = normalizeSignatureBadges(moduleLike.signatureBadges).map((badge, index) => {
      const kind = SIGNATURE_BADGE_KINDS[badge.kind];
      return {key:badge.kind + ":" + index, kind:badge.kind, phase:badge.phase, className:"module-signature-badge",
        label:kind.label(badge), title:battleUiText(typeof kind.title === "function" ? kind.title(badge) : kind.title)};
    });
    const targeting = core && !enemy && !coreDestroyed && corePowerTargeting;
    const title = enemy ? name + " · HP " + Math.max(0, Math.round(moduleLike.hp)) + "/" + moduleLike.maxHp
      : targeting ? "Çekirdek Rezonansını kullan" : core ? name + " sabit başlangıç modülüdür." : name + " · savaş sırasında sabit";
    const coreCharge = Math.max(0, Math.min(100, Math.round(corePowerCharge)));
    // Cores use physical paintings too. Leaving the legacy card plate active
    // intersects the upright enemy reactor and hides its upper half.
    const physical = core || (moduleLike.status === "active" && Boolean(moduleLike.position)
      && Boolean(GridshardModuleDeviceArt.idFor(moduleLike)));
    return {
      module:moduleLike, id:moduleLike.instanceId ?? moduleLike.id, enemy, core, coreType, coreDestroyed, targeting, physical,
      category:moduleLike.category ?? moduleLike.kind ?? "", name:battleUiText(name),
      shortName:battleUiText(moduleShortNameFor(moduleLike)), title:battleUiText(title),
      artwork:core ? "core:" + coreType + (coreDestroyed ? ":wreck" : "") : (moduleLike.definitionId || "") + ":" + name + ":" + physical,
      hp:moduleLike.hp, maxHp:moduleLike.maxHp, heat, overheated:Boolean(moduleLike.overheated),
      coreCharge, coreReady:corePowerReady && !coreDestroyed,
      coreLabel:coreDestroyed ? battleUiText("Çekirdek enkazı") : core && !enemy ? battleUiText("Çekirdek gücü · " + (corePowerReady ? "Hazır" : "%" + coreCharge)) : "",
      powerState:flowing ? "flowing" : required > 0 ? "disconnected" : "passive", powerMessage,
      heatState:moduleLike.overheated ? "overheated" : heat >= 100 ? "critical" : heat >= 70 ? "high" : heat >= 45 ? "slowed" : "warm",
      heatLabel:battleUiText(moduleLike.overheated ? "Aşırı ısındı · " + heatText : heatEffect ? heatText + " · " + heatEffect : heatText),
      liveBadges, signatureBadges,
    };
  }

  function updateBattleModuleCard(card, module, options={}) {
    battleCardStateView.update(card, battleCardModel(module, options));
  }

  function enemyCard(moduleId, name, hp, maxHp, kind="module", power={}) {
    return battleCardStateView.create(battleCardModel({
      ...power, instanceId:moduleId, nameTr:name, hp, maxHp, category:kind,
      definitionId:kind === "core" ? "core" : power.definitionId,
    }, {enemy:true}));
  }


  // Kartın görünümünü belirleyen alanlar. Hücre imzası değişmedikçe kart
  // yeniden kurulmaz (bkz. GridshardBattleBoardView).
  function battleModuleRenderSignature(moduleLike) {
    return JSON.stringify([
      moduleLike.instanceId ?? moduleLike.id,
      moduleLike.definitionId ?? moduleLike.definition_id,
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

  const enemyBattleBoardView = new GridshardBattleBoardView(enemyBoard);

  function renderEnemyBoard({ force=false }={}) {
    if (!enemyBoard) return;
    if (!enemyBoard.children?.length) createEnemyBoard();
    const language = document.documentElement?.lang || "tr";
    const modules = [{
      instanceId:"enemy-core", nameTr:"Çekirdek", category:"core", definitionId:"core",
      status:"active", position:{x:2,y:1}, hp:mockEnemyCoreHp, maxHp:mockEnemyCoreMaxHp,
      signatureBadges:mockEnemyCoreBadges,
    }, ...mockEnemyModules.filter(module => module.hp > 0).map(module => ({
      ...module, instanceId:module.id, nameTr:module.name, category:module.kind, status:"active",
    }))];
    enemyBattleBoardView.render(modules, {
      cellDebris:enemyCellDebris || [], debrisLabel:localizedUiText("Enkaz"),
      secondsLabel:language === "en" ? "s" : "sn",
      moduleSignature:module => battleModuleRenderSignature(module) + "|" + language + "|" + mockEnemyCoreType,
      createModuleCard:module => enemyCard(module.instanceId, module.nameTr, module.hp, module.maxHp, module.category, module),
      updateModuleCard:(card, module) => updateBattleModuleCard(card, module, {enemy:true}),
      onCardPlaced:(module, cell) => moduleAnchorCells.set(String(module.instanceId), cell), force,
    });
    if (enemyBoardStatusEl) setHudText(enemyBoardStatusEl, "Çekirdek " + Math.max(0, mockEnemyCoreHp) + "/" + mockEnemyCoreMaxHp);
    renderBattleIdentityPanels();
    renderBoardCables(enemyBoard, enemyCircuitCableModules());
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
      profileState.displayName
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
      mountModuleEmblem(card, module);
      card.title=localizedUiText(module.nameTr);
      card.setAttribute("aria-label",localizedUiText(module.nameTr));
      enemyDeckPreviewEl.appendChild(card);
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
    renderAnalyticsAgeGate();

    applyGraphicsQuality();
    applyLanguagePreference(
      view.language
    );
    applyAudioSettings(
      view
    );
  }

  let settingsAutoSaveTimer = null;
  // Ürün analitiği yaş sorusu. İzin kapalı gelir; açmak isteyene doğum yılı
  // sorulur. Kararı sunucu verir ve yılı saklamaz; istemci yalnız sorar ve
  // sonucu gösterir, yılı cihazda tutmaz.
  let analyticsBirthYearAnswer = null;

  function analyticsAgeLocked(view = settingsState.viewModel()) {
    return view?.analyticsAgeGate === "minor"
      && view.analyticsAgeAskedYear >= new Date().getFullYear();
  }

  function renderAnalyticsAgeGate({ asking = false, message = "" } = {}) {
    const locked = analyticsAgeLocked();
    const checkbox = document.getElementById("settings-analytics-consent");
    const panel = document.getElementById("analytics-age-panel");
    const status = document.getElementById("analytics-age-status");
    if (checkbox) checkbox.disabled = locked;
    if (panel) panel.hidden = !asking || locked;
    const text = message || (locked ? "Ürün analitiği bu hesapta açılamıyor." : "");
    if (status) {
      status.hidden = !text;
      status.textContent = localizedUiText(text);
    }
  }

  function onAnalyticsConsentChanged() {
    const checkbox = document.getElementById("settings-analytics-consent");
    const input = document.getElementById("analytics-age-year");
    analyticsBirthYearAnswer = null;
    if (input) input.value = "";
    if (checkbox?.checked && settingsState.viewModel()?.analyticsAgeGate !== "adult") {
      // İlk açılış: önce soru. Yanıt gelene kadar izin gönderilmez.
      renderAnalyticsAgeGate({ asking:true });
      input?.focus();
      return;
    }
    renderAnalyticsAgeGate();
    scheduleSettingsAutoSave(0);
  }

  function confirmAnalyticsBirthYear() {
    const input = document.getElementById("analytics-age-year");
    const value = String(input?.value || "").trim();
    if (!/^\d{4}$/.test(value)) {
      renderAnalyticsAgeGate({ asking:true, message:"Doğum yılını dört rakamla yaz." });
      return;
    }
    analyticsBirthYearAnswer = Number(value);
    if (input) input.value = "";
    renderAnalyticsAgeGate();
    void saveSettingsForm();
  }

  function cancelAnalyticsBirthYear() {
    const checkbox = document.getElementById("settings-analytics-consent");
    const input = document.getElementById("analytics-age-year");
    analyticsBirthYearAnswer = null;
    if (checkbox) checkbox.checked = false;
    if (input) input.value = "";
    renderAnalyticsAgeGate();
  }

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
    // Yaş sorusu yanıtlanmadan izin gönderilmez (sunucu da reddeder).
    const analyticsAnswered = settingsState.viewModel()?.analyticsAgeGate === "adult";
    const analyticsBirthYear = analyticsBirthYearAnswer;
    analyticsBirthYearAnswer = null;
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
          analytics_consent: analyticsConsent?.checked === true
            && (analyticsAnswered || analyticsBirthYear !== null),
          ...(analyticsBirthYear !== null ? { analytics_birth_year:analyticsBirthYear } : {}),
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
    setText("profile-season-countdown", engagement.season_active === false ? "Sezon başlangıcı bekleniyor" : Number.isFinite(seasonEndsAt) && seasonEndsAt > 0 ? `${remainingDays} gün ${remainingHours} sa kaldı` : "Sezon süresi hazırlanıyor");
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
      renderTrophyCaption(lobbyPlayerDetails, activeTitle, view.rating, "", true);
      lobbyPlayerDetails.dataset.claimable = String(
        (view.operatorTitleProgression?.stages || []).some((stage) => stage.claimable)
      );
    }
    // Profil barı yalnız Ev ekranındadır; Profil ekranı kimliği kendi başlığında gösterir.
    const profileHeroName = document.getElementById("profile-hero-name");
    const profileHeroDetails = document.getElementById("profile-hero-details");
    if (profileHeroName) profileHeroName.textContent = view.displayName;
    if (profileHeroDetails) {
      renderTrophyCaption(profileHeroDetails, activeTitle, view.rating, "", true);
      profileHeroDetails.dataset.claimable = lobbyPlayerDetails?.dataset.claimable || "false";
    }
    if (document.getElementById("operator-titles-dialog")?.open) renderOperatorTitles();

    renderProfileHighlights();
    renderProfileHonorShowcase();
    renderAvatarCustomization();
    renderEngagementSummary(view.engagement);
  }

  function renderProfileHonorShowcase() {
    if (document.hidden || document.body.dataset.appScreen !== "profile") return;
    const cosmetics = profileState.viewModel()?.cosmetics || {};
    const groups = [
      {
        hostId:"profile-rank-trophy-collection",
        ids:cosmetics.unlockedRankTrophyIds || [],
        definitions:PROFILE_RANK_TROPHIES,
        kind:"trophy",
      },
      {
        hostId:"profile-badge-collection",
        ids:cosmetics.unlockedBadgeIds || [],
        definitions:PROFILE_BADGES,
        kind:"badge",
      },
    ];

    for (const group of groups) {
      fillHonorCollection(document.getElementById(group.hostId), group);
    }
  }

  // Devre Koleksiyonu simgeleri: kaynak simgeleriyle aynı dilde (dolu gövde, aydınlık
  // ve gölge yüzey, koyu kontur); rengi `--honor-color` verir.
  const PROFILE_HONOR_ICONS = Object.freeze({
    trophy:'<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'
      + '<path class="hn-handle" d="M7.200 5H4.300v1.400a3.300 3.300 0 0 0 3.500 3.300M16.800 5h2.900v1.400a3.300 3.300 0 0 1-3.500 3.300"/>'
      + '<path class="hn-m" d="M6.800 2.800h10.400v5.400a5.200 5.200 0 0 1-10.400 0Z"/><path class="hn-l" d="M6.800 2.800H12v10.600a5.200 5.200 0 0 1-5.200-5.200Z"/>'
      + '<path class="hn-m" d="M10.500 13h3v3.400h-3Z"/><path class="hn-m" d="M7.400 16.200h9.200l1.100 4.600H6.300Z"/><path class="hn-s" d="M7.400 16.200h9.200l1.100 4.600H6.300Z"/>'
      + '<path class="hn-o" d="M6.800 2.800h10.400v5.400a5.200 5.200 0 0 1-10.400 0ZM10.500 13.200v3M13.500 13.200v3M7.400 16.200h9.200l1.100 4.600H6.300Z"/>'
      + '<path class="hn-w" d="m12 4.800.900 1.900 2.100.300-1.500 1.400.400 2-1.900-1-1.900 1 .400-2L9 7l2.100-.300Z"/></svg>',
    badge:'<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'
      + '<path class="hn-m" d="M6.400 2.200h4.300l2.300 6.400-3.900 1.700Z"/><path class="hn-s" d="M6.400 2.200h4.300l2.300 6.400-3.900 1.700Z"/>'
      + '<path class="hn-m" d="M17.600 2.200h-4.300L11 8.600l3.900 1.700Z"/><path class="hn-s" d="M17.600 2.200h-4.300L11 8.600l3.900 1.700Z"/>'
      + '<path class="hn-o" d="M6.400 2.200h4.300l2.300 6.400-3.900 1.700ZM17.600 2.200h-4.300L11 8.600l3.900 1.700Z"/>'
      + '<circle class="hn-m" cx="12" cy="14.900" r="6.700"/><path class="hn-l" d="M12 8.200a6.700 6.700 0 0 0 0 13.400Z"/><circle class="hn-o" cx="12" cy="14.900" r="6.700"/>'
      + '<path class="hn-w" d="m12 10.800 1.300 2.700 2.900.400-2.100 2 .500 2.900-2.600-1.400-2.600 1.400.500-2.900-2.100-2 2.900-.400Z"/></svg>',
  });

  // Yalnız sunucunun kazanılmış kimlikleri çizilir; boş koleksiyon metindir.
  // Tanımı olmayan yeni bir kazanım da kaybolmadan gösterilir.
  function fillHonorCollection(host, group) {
    if (!host) return;
    host.replaceChildren();
    const earned = new Set(group.ids.map((id) => String(id || "")).filter(Boolean));
    const known = new Set(group.definitions.map((item) => item.id));
    const extra = [...earned].filter((id) => !known.has(id)).map((id) => ({
      id,
      nameTr:id.replaceAll("_", " "),
      shortNameTr:id.replaceAll("_", " "),
      tone:"cyan",
    }));
    host.dataset.kind = group.kind;
    if (!earned.size) {
      const empty = document.createElement("p");
      empty.className = "profile-honor-empty";
      empty.textContent = localizedUiText("Henüz kazanılmadı");
      host.appendChild(empty);
      return;
    }
    for (const definition of [...group.definitions.filter(item => earned.has(item.id)), ...extra]) {
      const has = earned.has(definition.id);
      const item = document.createElement("article");
      item.className = "profile-honor-item";
      item.dataset.kind = group.kind;
      item.dataset.tone = definition.tone;
      item.dataset.earned = String(has);
      item.title = localizedUiText(definition.nameTr);
      item.setAttribute("aria-label", `${localizedUiText(definition.nameTr)} · ${localizedUiText(has ? "Kazanıldı" : "Henüz kazanılmadı")}`);
      const glyph = document.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.innerHTML = group.kind === "trophy"
        ? `<img class="competition-honor-art" src="${COMPETITION_TROPHY_ASSET}" width="36" height="36" alt="" decoding="async">`
        : PROFILE_HONOR_ICONS[group.kind] || PROFILE_HONOR_ICONS.badge;
      const label = document.createElement("small");
      label.textContent = definition.shortNameTr;
      item.append(glyph, label);
      host.appendChild(item);
    }
  }


  function renderProfileHighlights() {
    if (document.hidden || document.body.dataset.appScreen !== "profile") return;
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
        mountModuleEmblem(tile, module || null);
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
      applyCoreVisualIdentity(coreHost, core?.id || "core_resonance");
      const label = document.getElementById("profile-featured-core-name");
      const level = document.getElementById("profile-featured-core-level");
      mountCoreEmblem(document.getElementById("profile-featured-core-glyph"), core?.id || "core_resonance");
      if (label) label.textContent = core?.name_tr || "Rezonans Çekirdeği";
      if (level) level.textContent = `SEVİYE ${Number(core?.level || 1)}`;
    }
  }

  const renderedAvatarArt = new WeakMap();
  function applyAvatarVisual(element, avatarId, frameId) {
    if (!element) return;
    const avatar = PROFILE_AVATARS.find((item) => item.id === avatarId) || PROFILE_AVATARS[0];
    const source = PROFILE_AVATAR_ART[avatar.id];
    const previous = renderedAvatarArt.get(element);
    if (element.dataset.avatar !== avatar.id) element.dataset.avatar = avatar.id;
    const frame = frameId || "none";
    if (element.dataset.frame !== frame) element.dataset.frame = frame;
    if (previous?.id === avatar.id && previous.source === source && previous.art === element.firstElementChild) return;
    if (avatar.id === "default") {
      const artwork = document.createElement("span");
      artwork.className = "ui-art";
      artwork.dataset.uiArt = "profile";
      artwork.setAttribute("aria-hidden", "true");
      element.replaceChildren(artwork);
    } else {
      const artwork = document.createElement("img");
      artwork.className = "profile-avatar-art";
      artwork.src = PROFILE_AVATAR_ART[avatar.id];
      artwork.alt = "";
      artwork.decoding = "async";
      artwork.setAttribute("aria-hidden", "true");
      element.replaceChildren(artwork);
    }
    renderedAvatarArt.set(element, {id:avatar.id, source, art:element.firstElementChild});
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

  let renderedCosmeticChoices = null;
  function renderAvatarCustomization() {
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

    const choiceSignature = JSON.stringify([cosmetics, document.documentElement.lang]);
    const choiceHosts = ["avatar-choice-list", "avatar-frame-choice-list", "battle-emoji-choice-list", "profile-background-choice-list"]
      .map(id => document.getElementById(id));
    if (renderedCosmeticChoices?.signature === choiceSignature && choiceHosts.every((host, index) =>
      host === renderedCosmeticChoices.hosts[index].host && host?.firstElementChild === renderedCosmeticChoices.hosts[index].first
    )) return;

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
        const glyph = document.createElement("span");
        glyph.className = "profile-avatar";
        applyAvatarVisual(glyph, avatar.id, "none");
        const name = document.createElement("strong");
        name.textContent = avatar.nameTr;
        button.append(glyph, name);
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(avatar.id), selected:avatar.id === avatarId }));
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
        const glyph = document.createElement("span");
        glyph.className = "profile-avatar";
        applyAvatarVisual(glyph, avatarId, frame.id);
        const name = document.createElement("strong");
        name.textContent = frame.nameTr;
        button.append(glyph, name);
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(frame.id), selected:frame.id === frameId }));
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
          cosmeticStateLabel({ unlocked:unlocked.has(emoji.id), selected:emoji.id === quickEmojiId })
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
        const glyph = document.createElement("span");
        glyph.className = "profile-background-swatch";
        glyph.setAttribute("aria-hidden", "true");
        const name = document.createElement("strong");
        name.textContent = background.nameTr;
        button.append(glyph, name);
        button.appendChild(cosmeticStateLabel({ unlocked:unlocked.has(background.id), selected:background.id === backgroundId }));
        button.addEventListener("click", () => selectProfileCosmetic("background", background.id));
        backgroundHost.appendChild(button);
      }
    }
    renderedCosmeticChoices = {signature:choiceSignature,
      hosts:choiceHosts.map(host => ({host, first:host?.firstElementChild}))};
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

  function publicProfileMetric(label, value, trophy = false) {
    const article = document.createElement("article");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    name.textContent = label;
    if (trophy) renderTrophyValue(amount, value);
    else amount.textContent = String(value);
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
      },
      {
        label:"ROZETLER",
        ids:payload.honors?.badge_ids || [],
        definitions:PROFILE_BADGES,
        kind:"badge",
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
    deckTitle.prepend(createUiIcon("card", "blue"));
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
    applyCoreVisualIdentity(core, payload.selected_core?.id || "core_resonance");
    mountCoreEmblem(coreGlyph, payload.selected_core?.id || "core_resonance");
    coreCopy.append(coreName, coreLevel);
    core.append(coreGlyph, coreCopy);
    const modules = document.createElement("div");
    modules.className = "profile-featured-modules";
    for (const definitionId of (payload.featured_deck?.module_ids || []).slice(0, 6)) {
      const definition = moduleDefinitions.find((item) => item.definitionId === definitionId);
      const tile = document.createElement("span");
      tile.className = "profile-deck-module";
      tile.dataset.category = definition?.category || "";
      mountModuleEmblem(tile, definition || null);
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
    seasonTitle.prepend(createUiIcon("star", "violet"));
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
    statsTitle.prepend(createUiIcon("bars", "gold"));
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

  let publicProfileRequestVersion = 0;
  async function openPublicProfile(playerId) {
    if (!isPublicProfileTarget(playerId)) return;
    const requestVersion = ++publicProfileRequestVersion;
    const viewerId = participantPlayerId;
    const dialog = document.getElementById("public-profile-dialog");
    const isCurrent = () => requestVersion === publicProfileRequestVersion
      && viewerId === participantPlayerId && activePublicProfileId === playerId && Boolean(dialog?.open);
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
      if (!isCurrent()) return;
      if (status) status.textContent = "";
      renderPublicProfile(payload);
      if (!payload.is_bot) await loadSocialView();
      if (!isCurrent()) return;
      renderPublicProfileFriendAction(payload);
    } catch (error) {
      if (isCurrent() && status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function closePublicProfile() {
    publicProfileRequestVersion += 1;
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
    title.prepend(createUiIcon("bars", "gold"));
    heading.append(title);
    const grid = document.createElement("div");
    grid.className = "statistics-metrics-grid public-profile-stat-grid team-profile-stat-grid";
    for (const metric of [
      ["Toplam Kupa", Number(payload.total_trophies || 0).toLocaleString(uiLocale()), true],
      ["Ortalama Kupa", Number(payload.average_trophies || 0).toLocaleString(uiLocale()), true],
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

  let teamProfileRequestVersion = 0;
  async function openTeamProfile(teamId) {
    const cleanTeamId = String(teamId || "").trim();
    if (!cleanTeamId) return;
    const requestVersion = ++teamProfileRequestVersion;
    const viewerId = participantPlayerId;
    const dialog = document.getElementById("team-profile-dialog");
    const isCurrent = () => requestVersion === teamProfileRequestVersion
      && viewerId === participantPlayerId && Boolean(dialog?.open);
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
      if (!isCurrent()) return;
      const title = document.getElementById("team-profile-title");
      if (title) title.textContent = payload.name || "Takım Profili";
      if (status) status.textContent = "";
      renderTeamProfile(payload);
    } catch (error) {
      if (isCurrent() && status) status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function closeTeamProfile() {
    teamProfileRequestVersion += 1;
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
      // Rank is a position, not an earned medal. Reward ownership remains
      // server-backed and is rendered only by fillHonorCollection.
      rank.textContent = String(row.position);
      item.dataset.position = String(row.position);
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

  const leaderboardReads = createViewReadOwner(() => leaderboardPayload);
  async function loadLeaderboard() {
    const ticket = leaderboardReads.begin();
    const dialog = document.getElementById("leaderboard-dialog");
    const status = document.getElementById("leaderboard-status");
    if (status) status.textContent = "Sıralama yükleniyor…";
    try {
      const {response, payload} = await fetchWithDeadline(
        `/leaderboards?player_id=${encodeURIComponent(ticket.playerId)}`,
        { cache: "no-store" },
        8000,
        async response => ({response, payload:await response.json()})
      );
      if (!leaderboardReads.isCurrent(ticket)) return {ok:false, stale:true};
      if (!response.ok) throw new Error(payload.detail || "Lider panosu yüklenemedi.");
      leaderboardReads.commit(ticket, () => { leaderboardPayload = payload; });
      if (dialog?.open && !document.hidden) renderLeaderboard();
      return { ok: true };
    } catch (error) {
      if (!leaderboardReads.isCurrent(ticket)) return {ok:false, stale:true};
      if (status && dialog?.open && !document.hidden) status.textContent = error instanceof Error ? error.message : String(error);
      return { ok: false };
    }
  }

  function openLeaderboard() {
    activeLeaderboardTab = "trophies";
    activeTrophyLeaderboardScope = "general";
    for (const button of document.querySelectorAll("[data-leaderboard-tab]")) {
      button.classList.toggle("is-active", button.dataset.leaderboardTab === activeLeaderboardTab);
    }
    for (const button of document.querySelectorAll("[data-leaderboard-scope]")) {
      button.classList.toggle("is-active", button.dataset.leaderboardScope === activeTrophyLeaderboardScope);
    }
    const arena = document.getElementById("arena-detail-dialog");
    if (arena?.open && arena.close) arena.close();
    const dialog = document.getElementById("leaderboard-dialog");
    if (dialog?.showModal && !dialog.open) dialog.showModal();
    else dialog?.setAttribute("open", "");
    renderLeaderboard();
    loadLeaderboard();
  }

  // Run once after the navigation's profile read/render, not after each claim.
  // Move only this page's scroll container; do not scroll the app shell/body.
  function focusEarnedReward(screen) {
    if (appRouter.currentScreen !== screen || document.hidden) return;
    const panel = document.querySelector(`[data-screen-panel="${screen}"]`);
    if (!panel || panel.hidden) return;
    let target;
    if (screen === "daily-rewards") {
      const today = profileState.viewModel()?.engagement?.daily_login?.today;
      target = panel.querySelector(`[data-login-claim="${Number(today || 1)}"]`)?.closest(".monthly-login-card");
    } else if (screen === "rewards") {
      target = panel.querySelector('.season-pass-cell[data-state="claimable"]')?.closest(".season-pass-row")
        || [...panel.querySelectorAll('.season-pass-row[data-unlocked="true"]')].at(-1)
        || panel.querySelector(".season-pass-row");
    }
    if (!target) return;
    // Some desktop layouts scroll a nested track; mobile scrolls the panel.
    let scroller = target.parentElement;
    while (scroller && scroller !== panel && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    if (!scroller) return;
    const bounds = scroller.getBoundingClientRect(), rect = target.getBoundingClientRect();
    scroller.scrollTop += rect.top - bounds.top - Math.max(0, (scroller.clientHeight - rect.height) / 2);
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

  function createInboxCardMeta(item, detailText) {
    const meta = document.createElement("div");
    meta.className = "inbox-card-meta";
    const detail = document.createElement("small");
    detail.textContent = detailText;
    const stamp = document.createElement("time");
    stamp.className = "inbox-card-date";
    const raw = item.created_at || item.awarded_at || "";
    const date = raw ? new Date(raw) : null;
    if (date && Number.isFinite(date.getTime())) {
      stamp.dateTime = date.toISOString();
      stamp.textContent = date.toLocaleString(uiLocale(), {
        year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit",
      });
      stamp.title = localizedUiText("Mesaj tarihi");
    } else {
      // Eski kayıtta tarih yoksa bugünü mesaj tarihi diye göstermeyiz.
      stamp.textContent = localizedUiText("Tarih kaydı yok");
    }
    meta.append(detail, stamp);
    return meta;
  }

  function createInboxInvitationCard(item) {
    const card = document.createElement("article");
    card.className = "reward-inbox-card inbox-invitation-card";
    card.dataset.kind = item.kind;
    card.dataset.status = item.status;
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.kind === "team_training" ? "Takım antrenman maçı" : "Arkadaş savaşı";
    title.prepend(createUiIcon("swords"));
    const detailText = item.incoming && item.status === "pending"
      ? `${item.peer_name} seni kupasız savaşa çağırdı.`
      : `${item.peer_name} ile kupasız savaş alanı hazır.`;
    copy.append(title, createInboxCardMeta(item, detailText));
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
    card.append(createInboxReadButton(card, item, "invitation", copy), copy, actions);
    return card;
  }

  function createInboxNoticeCard(notice) {
    const card = document.createElement("article");
    card.className = "reward-inbox-card inbox-notice-card";
    card.dataset.kind = notice.kind || "update";
    card.dataset.seen = String(Boolean(notice.seen));
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = notice.category === "purchase" ? "Satın alım tamamlandı" : notice.title_tr || "Bildirim";
    const schedule = notice.scheduled_at ? new Date(notice.scheduled_at) : null;
    const scheduleLabel = schedule && !Number.isNaN(schedule.getTime())
      ? ` · ${schedule.toLocaleString(uiLocale(), { weekday:"short", hour:"2-digit", minute:"2-digit" })}`
      : "";
    const purchaseDetail = notice.product_name_tr || String(notice.title_tr || "").split(" · ").slice(1).join(" · ");
    copy.append(title, createInboxCardMeta(notice, `${purchaseDetail ? purchaseDetail + " · " : ""}${notice.body_tr || ""}${scheduleLabel}`));
    if (notice.category === "purchase") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "inbox-message-delete";
    remove.textContent = localizedUiText("SİL");
    remove.setAttribute("aria-label", `${localizedUiText("SİL")} · ${notice.title_tr || "Bildirim"}`);
    remove.disabled = inboxDismissBusy;
    remove.addEventListener("click", () => void dismissInboxMessages(
      notice.category === "purchase" ? "purchase" : "system", [notice.notice_id], remove
    ));
    copy.appendChild(remove);
    }
    card.append(createInboxReadButton(card, notice, "notice", copy), copy);
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
      note:"Topla ile mağazadaki sandık stoğuna ekle; içeriği açtığında verilir.",
      className:"inbox-reward-chest",
    });
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = message.category === "battle" ? "Savaş Zaferi Sandığı" : message.title_tr || "Rekabet Ödülü";
    copy.append(title, createInboxCardMeta(message, reward.chest_name_tr || "Ödül Kasası"), chest);
    const claim = document.createElement("button");
    claim.type = "button";
    claim.textContent = message.status === "claimed" ? "ALINDI" : "TOPLA";
    claim.disabled = message.status === "claimed" || inboxClaimBusy;
    claim.addEventListener("click", () => void collectInboxRewards([message.message_id], claim));
    card.append(createInboxReadButton(card, message, "reward", copy), copy, claim);
    return card;
  }

  let activeInboxTab = "reward";
  const INBOX_AREA_LIMIT = 20;
  let inboxDismissBusy = false;
  let inboxClaimBusy = false;
  const inboxExpanded = new Set();
  let lastInboxDismiss = null;
  let inboxMutationVersion = 0;
  let pendingInboxDismiss = null;
  const inboxReadStore = GridshardHomeInterface.createReadStore({
    read:readDevicePreference, write:writeDevicePreference, playerId:() => participantPlayerId,
  });

  function inboxReadKey(item, kind) {
    const id = kind === "notice" ? item.notice_id : kind === "reward" ? item.message_id : item.invitation_id;
    return id ? `${kind}:${id}` : "";
  }

  function pruneInboxExpansionState() {
    if (!rewardInboxState || !inboxExpanded.size) return;
    // Expansion is presentation-only. Keep it for present messages, never
    // retain every message/account ever opened during a long app session.
    const current = new Set();
    for (const [kind, items] of [
      ["invitation", rewardInboxState.invitations], ["reward", rewardInboxState.messages],
      ["notice", rewardInboxState.purchases], ["notice", rewardInboxState.notices],
    ]) for (const item of items || []) current.add(`${participantPlayerId}:${inboxReadKey(item, kind)}`);
    for (const key of inboxExpanded) if (!current.has(key)) inboxExpanded.delete(key);
  }

  function createInboxReadButton(card, item, kind, copy) {
    const key = inboxReadKey(item, kind);
    const playerId = participantPlayerId;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inbox-message-read gs-icon-action";
    const artwork = document.createElement("span");
    artwork.className = "ui-art";
    artwork.setAttribute("aria-hidden", "true");
    button.appendChild(artwork);
    const expansionKey = `${playerId}:${key}`;
    const title = copy.firstElementChild;
    const content = document.createElement("div");
    content.className = "inbox-message-content";
    for (const child of [...copy.children].slice(1)) content.appendChild(child);
    copy.appendChild(content);
    if (title) { title.setAttribute("role", "button"); title.tabIndex = 0; title.classList.add("inbox-message-title"); }
    const paint = () => {
      const seen = Boolean(item.seen || inboxReadStore.has(key));
      card.dataset.seen = String(seen);
      artwork.dataset.uiArt = seen ? "message-open" : "message";
      const expanded = inboxExpanded.has(expansionKey);
      content.hidden = !expanded;
      button.setAttribute("aria-label", expanded ? "İçeriği kapat" : "İçeriği göster");
      button.setAttribute("aria-expanded", String(expanded));
      title?.setAttribute("aria-expanded", String(expanded));
    };
    paint();
    button.addEventListener("click", () => {
      if (playerId !== participantPlayerId) return;
      const expanding = !inboxExpanded.has(expansionKey);
      if (expanding) { inboxExpanded.add(expansionKey); inboxReadStore.mark(key); }
      else inboxExpanded.delete(expansionKey);
      paint();
      if (expanding && kind === "notice" && item.notice_id) void markInboxNoticesSeen([item.notice_id]);
    });
    title?.addEventListener("click", () => button.click());
    title?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); button.click(); }
    });
    return button;
  }

  async function collectInboxRewards(ids = null, button = null) {
    if (inboxClaimBusy || inboxDismissBusy) return;
    const playerId = participantPlayerId, tab = activeInboxTab;
    const wanted = ids ? new Set(ids) : null;
    const visited = new Set();
    const status = document.getElementById("reward-inbox-status");
    inboxClaimBusy = true; inboxMutationVersion += 1;
    if (button) button.disabled = true;
    renderRewardInbox();
    let collected = 0;
    try {
      // Serial, deterministic per-message request IDs. Each response supplies
      // the next mailbox page; retries never grant a chest a second time.
      while (participantPlayerId === playerId && visited.size < 200) {
        const message = (rewardInboxState?.messages || []).find(item => item.status === "unclaimed"
          && !visited.has(item.message_id) && (wanted ? wanted.has(item.message_id)
            : tab === "battle" ? item.category === "battle" : tab === "reward" && item.category !== "battle"));
        if (!message) break;
        visited.add(message.message_id);
        const payload = await requestJsonWithDeadline(
          `/profile/${encodeURIComponent(playerId)}/reward-inbox/${encodeURIComponent(message.message_id)}/claim`,
          {method:"POST", body:JSON.stringify({request_id:`inbox:${message.message_id}`})}, 30000);
        if (participantPlayerId !== playerId) return;
        rewardInboxState = payload;
        if (payload.profile) profileState.applyProfile(payload.profile);
        collected += 1;
      }
      if (status) status.textContent = collected ? `${collected} sandık mağazadaki stoğuna eklendi.` : "";
    } catch (error) {
      if (participantPlayerId === playerId && status) status.textContent = `${collected ? collected + " sandık toplandı. " : ""}${error instanceof Error ? error.message : String(error)}`;
    } finally {
      inboxClaimBusy = false; inboxMutationVersion += 1;
      if (participantPlayerId === playerId) {
        if (collected) await loadMetaProgression();
        if (participantPlayerId === playerId) await loadRewardInbox({quiet:true});
        if (participantPlayerId === playerId) { renderRewardInbox(); renderProfileSummary(); }
      }
    }
  }

  function renderInboxDismissControls() {
    const removable = activeInboxTab === "purchase";
    const entries = activeInboxTab === "purchase" ? rewardInboxState?.purchases : rewardInboxState?.notices;
    const removeAll = document.getElementById("inbox-delete-all");
    if (removeAll) { removeAll.hidden = activeInboxTab === "system"; removeAll.disabled = inboxDismissBusy || inboxClaimBusy || !removable || !entries?.length; }
    const collectAll = document.getElementById("inbox-collect-all");
    if (collectAll) {
      collectAll.hidden = !["battle", "reward"].includes(activeInboxTab);
      collectAll.disabled = inboxDismissBusy || inboxClaimBusy || !(rewardInboxState?.messages || []).some(item => item.status === "unclaimed"
        && (activeInboxTab === "battle" ? item.category === "battle" : item.category !== "battle"));
    }
    const note = document.getElementById("inbox-delete-note");
    if (note) note.hidden = true;
    const undo = document.getElementById("inbox-delete-undo");
    if (undo) {
      undo.hidden = activeInboxTab === "system" || !lastInboxDismiss || lastInboxDismiss.playerId !== participantPlayerId;
      undo.disabled = inboxDismissBusy;
    }
  }

  async function dismissInboxMessages(category, noticeIds, button, { all = false, restore = false } = {}) {
    if (inboxDismissBusy || inboxClaimBusy || category === "system" || (!all && !noticeIds.length)) return;
    const playerId = participantPlayerId;
    const status = document.getElementById("reward-inbox-status");
    inboxDismissBusy = true;
    inboxMutationVersion += 1;
    if (button) button.disabled = true;
    renderInboxDismissControls();
    try {
      // Geri alma, çok eski bir satın alım geçmişinde de istek boyunu sınırlı tutar.
      const batches = all ? [[]] : Array.from({ length:Math.ceil(noticeIds.length / 200) },
        (_, index) => noticeIds.slice(index * 200, (index + 1) * 200));
      let payload;
      for (const batch of batches) {
        payload = await requestJsonWithDeadline(
          `/profile/${encodeURIComponent(playerId)}/reward-inbox/messages/dismiss`,
          { method:"POST", body:JSON.stringify({ player_id:playerId, category, notice_ids:batch, all_in_category:all, restore }) },
          12000
        );
      }
      if (participantPlayerId !== playerId) return;
      rewardInboxState = payload;
      const changedIds = payload.changed_notice_ids || [];
      lastInboxDismiss = restore || !changedIds.length ? null : { playerId, category, ids:changedIds };
      if (status) status.textContent = localizedUiText(restore ? "Mesajlar geri alındı." : "Mesajlar silindi. Geri al ile geri getirebilirsin.");
    } catch (error) {
      if (participantPlayerId === playerId && status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      inboxDismissBusy = false;
      inboxMutationVersion += 1;
      renderRewardInbox();
    }
  }

  function setRewardInboxTab(tab, { focus = false } = {}) {
    if (!["battle", "purchase", "reward", "system"].includes(tab)) return;
    activeInboxTab = tab;
    for (const button of document.querySelectorAll("[data-inbox-tab]")) {
      const selected = button.dataset.inboxTab === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
      if (selected && focus) button.focus();
    }
    renderInboxDismissControls();
    if (document.getElementById("reward-inbox-dialog")?.open) void markInboxNoticesSeen();
  }

  function renderRewardInbox() {
    noteTeamApplicationsFromInbox();
    pruneInboxExpansionState();
    const button = document.getElementById("reward-inbox-button");
    const notification = document.getElementById("reward-inbox-notification");
    const unclaimed = Number(rewardInboxState?.unclaimed_count || 0);
    const locallyReadNotices = [...(rewardInboxState?.purchases || []), ...(rewardInboxState?.notices || [])]
      .filter((notice) => !notice.seen && inboxReadStore.has(inboxReadKey(notice, "notice"))).length;
    // A read envelope never dismisses an unclaimed chest or pending invitation.
    const unread = Math.max(unclaimed, Number(rewardInboxState?.unread_count ?? unclaimed) - locallyReadNotices);
    button?.classList.toggle("has-reward", unclaimed > 0);
    button?.classList.toggle("has-unread", unread > 0);
    if (notification) {
      notification.hidden = unread < 1;
      notification.textContent = unread > 9 ? "9+" : String(unread);
    }
    if (button) {
      button.title = unread > 0 ? `Mesaj Kutusu · ${unread} yeni` : "Mesaj Kutusu";
    }
    // Kapalı kutunun içindeki bütün sekmeleri her sosyal yoklamada kurmayız.
    // Üstteki sayaçlar canlı kalır; içerik kutu açılınca son veriden kurulur.
    if (!document.getElementById("reward-inbox-dialog")?.open) return;
    const fill = (hostId, items, createCard, emptyCopy) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      host.replaceChildren();
      // Her alan en çok INBOX_AREA_LIMIT kayıt gösterir (sunucu da aynı sınırla gönderir).
      for (const item of items.slice(0, INBOX_AREA_LIMIT)) host.appendChild(createCard(item));
      if (!host.children.length) {
        const empty = document.createElement("p");
        empty.className = "reward-inbox-empty";
        empty.textContent = emptyCopy;
        host.appendChild(empty);
      }
    };
    fill("reward-inbox-invitations", rewardInboxState?.invitations || [], createInboxInvitationCard, "Bekleyen savaş daveti yok.");
    const rewards = (rewardInboxState?.messages || []).filter((item) => item.status === "unclaimed");
    fill("reward-inbox-battle-rewards", rewards.filter((item) => item.category === "battle"), createInboxRewardCard, "Yeni savaş sandığı yok.");
    fill("reward-inbox-list", rewards.filter((item) => item.category !== "battle"), createInboxRewardCard, "Yeni ödül sandığı yok. Sezon, lig ve turnuva sandıkları burada teslim edilir.");
    fill("reward-inbox-purchases", rewardInboxState?.purchases || [], createInboxNoticeCard, "Henüz satın alım mesajı yok.");
    fill("reward-inbox-notices", rewardInboxState?.notices || [], createInboxNoticeCard, "Yeni oyun bildirimi yok.");
    renderInboxDismissControls();
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

  async function markInboxNoticesSeen(noticeIds = null) {
    if (inboxDismissBusy || inboxClaimBusy) return;
    const playerId = participantPlayerId;
    const version = inboxMutationVersion;
    const wanted = noticeIds ? new Set(noticeIds) : null;
    const unseen = [...(activeInboxTab === "system" ? rewardInboxState?.notices || [] : []), ...(activeInboxTab === "purchase" ? rewardInboxState?.purchases || [] : [])].filter((notice) =>
      !notice.seen && notice.notice_id && (wanted ? wanted.has(notice.notice_id) : inboxReadStore.has(inboxReadKey(notice, "notice")))
    );
    if (!unseen.length) return;
    try {
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(playerId)}/reward-inbox/notices/seen`,
        {
          method:"POST",
          body:JSON.stringify({ player_id:playerId, notice_ids:unseen.map((notice) => notice.notice_id) }),
        },
        12000
      );
      if (version !== inboxMutationVersion || inboxDismissBusy || inboxClaimBusy || playerId !== participantPlayerId) return;
      rewardInboxState = payload;
      renderRewardInbox();
    } catch (_error) {
      // Okundu işareti bir sonraki açılışta yeniden denenir.
    }
  }

  let socialPollTimer = null;
  let socialPollTick = 0;
  let socialPollPending = false;

  // Mesaj kutusu ve arkadaş bildirimleri arka planda tazelenir; savaş
  // sırasında ya da sekme gizliyken istek atılmaz. Gönderilmiş bir davet
  // varken kabulü hızlı yakalamak için sıklık artar.
  function startSocialPolling() {
    if (socialPollTimer) return;
    socialPollTimer = window.setInterval(() => { void refreshSocialPolling(); }, 5000);
  }

  async function refreshSocialPolling() {
    if (socialPollPending || document.hidden || document.body.dataset.appScreen === "play") return;
    socialPollPending = true;
    try {
      socialPollTick += 1;
      const requests = [];
      // Açık sohbet her turda tazelenir; karşı tarafın mesajı birkaç saniyede görünür.
      if (
        activeDirectMessagePeerId
        && activeFriendsTab === "messages"
        && document.body.dataset.appScreen === "friends"
      ) {
        requests.push(loadDirectMessageThread());
      }
      const urgent = recentBattleInviteTargets.size > 0;
      if (urgent || socialPollTick % 4 === 0) {
        requests.push(loadRewardInbox({ quiet:true }), loadSocialView({ quiet:true }));
      }
      // A slow network must not stack new requests every five seconds or
      // continually invalidate chat replies before they can be displayed.
      await Promise.allSettled(requests);
    } finally {
      socialPollPending = false;
    }
  }

  function preferredRewardInboxTab() {
    const candidates=[];
    const add=(tab,item)=>candidates.push({tab,at:Date.parse(item.created_at || item.created_at_utc || "") || 0});
    for(const item of rewardInboxState?.invitations || [])if(item.incoming && item.status === "pending")add("battle",item);
    for(const item of rewardInboxState?.messages || [])if(item.status === "unclaimed")add(item.category === "battle" ? "battle" : "reward",item);
    for(const [tab,items] of [["purchase",rewardInboxState?.purchases],["system",rewardInboxState?.notices]])
      for(const item of items || [])if(!item.seen && !inboxReadStore.has(inboxReadKey(item,"notice")))add(tab,item);
    if(!candidates.length) {
      for(const [tab,items] of [["battle",rewardInboxState?.invitations],["purchase",rewardInboxState?.purchases],["system",rewardInboxState?.notices]])
        for(const item of items || [])add(tab,item);
      if(!candidates.length)return activeInboxTab;
      if(candidates.some(item=>item.tab===activeInboxTab))return activeInboxTab;
    }
    return candidates.reduce((latest,item)=>item.at>latest.at ? item : latest).tab;
  }

  async function loadRewardInbox({ open=false, quiet=false } = {}) {
    const status = document.getElementById("reward-inbox-status");
    const playerId = participantPlayerId;
    const version = inboxMutationVersion;
    if (inboxDismissBusy || inboxClaimBusy) return;
    try {
      const payload = await requestJsonWithDeadline(
        `/profile/${encodeURIComponent(playerId)}/reward-inbox`,
        { cache:"no-store" },
        12000
      );
      if (version !== inboxMutationVersion || inboxDismissBusy || inboxClaimBusy || playerId !== participantPlayerId) return;
      rewardInboxState = payload;
      if (status && !quiet) status.textContent = "";
      renderRewardInbox();
      maybeAutoLaunchAcceptedInvite();
    } catch (error) {
      if (status && !quiet) status.textContent = error instanceof Error ? error.message : String(error);
    }
    if (open) {
      setRewardInboxTab(preferredRewardInboxTab());
      const dialog = document.getElementById("reward-inbox-dialog");
      if (dialog?.showModal && !dialog.open) dialog.showModal();
      else dialog?.setAttribute("open", "");
      renderRewardInbox();
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
    if (mission.id === "win_battles") icon.appendChild(createRatingTrophyIcon());
    else if (["complete_battles", "deal_damage"].includes(mission.id)) icon.appendChild(createUiIcon("battle"));
    else if (["circuit_actions", "destroy_modules"].includes(mission.id)) icon.appendChild(createUiIcon("deck"));
    else icon.innerHTML = uiIconMarkup(mission.id === "core_power" ? "core" : "info");
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

  // Aylık giriş, günlük emir ve sezon yolu listeleri (yüzden fazla kart) yalnız
  // verisi değişince yeniden kurulur. Bu işlev her ekran geçişinden sonra
  // çağrılır; listeleri her seferinde baştan kurmak, o an görünmeseler de
  // geçişten hemen sonra uzun bir kare üretiyordu.
  let renderedEngagementListsSignature = null;

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
      // Menüde okunmamış durum tek bir hedefte görünür: Ödüller satırı.
      // Kozmetik satırı kendi başına nokta taşımaz.
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
    // Işık, bu sayfalara götüren üç çizgi düğmesinde yanar.
    const lobbyMenuButton = document.getElementById("lobby-menu-button");
    lobbyMenuButton?.classList.toggle(
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
    const missions = document.getElementById("daily-mission-list");
    const rewards = document.getElementById("season-reward-track");
    const listsSignature = `${document.documentElement.lang || "tr"}|${JSON.stringify(engagement)}`;
    // Liste başka bir yerden boşaltıldıysa imza aynı olsa da yeniden kurulur.
    const rebuildLists = listsSignature !== renderedEngagementListsSignature
      || (loginTrack && loginTrack.childElementCount !== loginRewards.length)
      || (missions && missions.childElementCount !== missionList.length)
      || (rewards && rewards.childElementCount !== rewardList.length);
    renderedEngagementListsSignature = listsSignature;
    const loginDayCount = Number(engagement.daily_login?.day_count || loginRewards.length || 28);
    setText(
      "monthly-login-summary",
      engagement.season_active === false ? "Sezon başlangıcı bekleniyor" : claimableLoginRewards
        ? "Bugünün ödülü hazır"
        : `${engagement.daily_login?.claimed_days?.length || 0} / ${loginDayCount} gün alındı`
    );
    setText(
      "monthly-login-period",
      engagement.daily_login?.starts_at
        ? `BU DÖNEM · ${eventDayRangeLabel(engagement.daily_login.starts_at, engagement.daily_login.ends_at)}`
        : "BU DÖNEM"
    );
    if (loginTrack && rebuildLists) {
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
        const startDay = engagement.daily_login?.starts_at ? (new Date(engagement.daily_login.starts_at).getUTCDay() + 6) % 7 : 0;
        day.textContent = `${reward.day}. GÜN · ${LOGIN_WEEKDAYS_TR[(startDay + Number(reward.day) - 1) % 7]}`;
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

    if (missions && rebuildLists) {
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

    if (rewards) renderSeasonPremiumPurchase();
    if (rewards && rebuildLists) {
      rewards.replaceChildren();
      const premiumPass = engagement.premium_pass || {};
      const premiumTrack = engagement.premiumRewardTrack || engagement.premium_reward_track || [];
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

    // Yeni kurulan kartların metni çevrilir; liste değişmediyse belgenin
    // tamamını yeniden taramaya gerek yoktur (tek tek değişen metinleri çeviri
    // katmanının kendi gözlemcisi izler).
    if (rebuildLists) globalThis.GridshardI18n?.apply(document.documentElement.lang || "tr");
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
    if (button) button.disabled = true;
    if (status) status.textContent = "Ödül alınıyor…";
    // Every season tile is a presentation container: it opens now, even when
    // there is no nested inventory chest in its contents.
    if (isSeasonTrack) showChestOpening({tier:selectedReward?.chest_tier || "bronze", title:`Kademe ${id} Ödülü`});
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
      await loadRewardInbox({ quiet:true });
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
      } else if (isSeasonTrack && result.payload?.season_reward_receipt) {
        const reward = result.payload.season_reward_receipt;
        showChestReveal({
          definition_id:({bronze:"field_3h",silver:"circuit_8h",gold:"core_24h",diamond:"diamond_24h"})[selectedReward?.chest_tier] || "field_3h",
          rewards:{...reward, chest_name_tr:`Kademe ${id} Ödülü`},
        });
        // Only explicit unopened chests INSIDE the season reward are stocked.
        // Never treat the outer animation/presentation chest as inventory.
        const stocks = [result.payload.season_chest_delivery, ...(result.payload.season_chest_deliveries || [])].filter(item => item?.delivery === "inventory");
        const host = document.getElementById("chest-reveal-rewards");
        for (const stock of stocks) {
          const row = document.createElement("div"); row.className = "season-stock-reward";
          const caption = document.createElement("span");
          caption.textContent = `${stock.chest?.name_tr || "Sandık"} · Mağaza stoğuna eklendi`;
          row.append(createRewardChestButton({tier:selectedReward?.chest_tier || "bronze", title:stock.chest?.name_tr || "Sandık",
            reward:{chest_is_container:true}, note:"Mağazadan açabilirsin."}), caption);
          host?.appendChild(row);
        }
      } else if (isSeasonTrack) {
        showChestFailure("Ödül alındı ancak içerik kaydı sunucudan alınamadı. Sayfayı yenileyebilirsin.");
      }
    } else if (isSeasonTrack) {
      showChestFailure(result.reason || "Ödül alınamadı.");
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
    for (const [name, value] of entries) {
      const card=document.createElement("div"), label=document.createElement("small"), number=document.createElement("strong");
      if (name === "🏆 / En yüksek") label.replaceChildren(createRatingTrophyIcon(), document.createTextNode(localizedMessage("stats.trophies_peak").replace("🏆", "")));
      else label.textContent=name;
      number.textContent=String(value ?? 0);
      card.append(label,number);
      host.appendChild(card);
    }
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
        mountModuleEmblem(tile, module || null);
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

  function battleTransportReady() {
    return activePlayMode === "local"
      ? Boolean(localServerAuthoritative && localServerSessionId)
      : pvpConnection.status === "open" && pvpState.connected;
  }

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
        && !battleCountdown.active
        && battleTransportReady()
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

  function normalizeBattleCategory(category) {
    return category === "sistem" ? "enerji" : category;
  }

  function deploymentCompositionRejection(module) {
    if (!module || !LIVE_UTILITY_CATEGORIES.has(normalizeBattleCategory(module.category))) return null;
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
      (candidate) => normalizeBattleCategory(candidate.category) === normalizeBattleCategory(module.category)
    ).length;
    const categoryLimit = LIVE_CATEGORY_LIMITS[normalizeBattleCategory(module.category)];
    if (categoryCount >= categoryLimit) {
      return `${poolCategoryLabel(module.category)} sınırı dolu: ${categoryCount}/${categoryLimit}.`;
    }
    const attackCount = active.filter(
      (candidate) => candidate.category === "saldırı"
    ).length;
    const utilityCount = active.filter(
      (candidate) => LIVE_UTILITY_CATEGORIES.has(normalizeBattleCategory(candidate.category))
    ).length;
    if (utilityCount + 1 > attackCount + 2) {
      return "Devre dengesi için önce bir Saldırı modülü yerleştir.";
    }
    return null;
  }

  function battleDeploymentMotionAllowed() {
    return !document.hidden && document.body.dataset.appScreen === 'play'
      && !localBattleFinished && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function rememberBattleDeployment(module) {
    if(!battleDeploymentMotionAllowed())return;
    const now=performance.now();
    while(pendingBattleDeployments.length && now-pendingBattleDeployments[0].at>5000)pendingBattleDeployments.shift();
    const card=[...shelf.querySelectorAll('.deck-module-card')].find(card=>card.dataset.moduleId===module.instanceId);
    const image=card?.querySelector('img');
    if(!image?.animate)return;
    const r=image.getBoundingClientRect();
    if(!r.width || !r.height)return;
    pendingBattleDeployments.push({definition:module.definitionId || clientDefinitionId(module.instanceId),
      at:now,src:image.currentSrc || image.src,left:r.left,top:r.top,width:r.width,height:r.height});
    if(pendingBattleDeployments.length>15)pendingBattleDeployments.shift();
  }

  function releaseBattleDeployment(record) {
    if(!liveBattleDeployments.delete(record))return;
    for(const animation of [record.travel,record.arrival]){
      if(!animation)continue;
      animation.onfinish=animation.oncancel=null;
      animation.cancel();
    }
    record.flight.remove();
  }

  function clearBattleDeployments() {
    pendingBattleDeployments.length=0;
    for(const record of [...liveBattleDeployments])releaseBattleDeployment(record);
  }

  // Only a newly confirmed player card consumes a shelf click. Ordinary HUD
  // updates, initial cores and reconnect snapshots never replay a placement.
  function presentBattleDeployment(module, cell, card) {
    const now=performance.now();
    while(pendingBattleDeployments.length && now-pendingBattleDeployments[0].at>5000)pendingBattleDeployments.shift();
    const definition=module.definitionId || clientDefinitionId(module.instanceId);
    const index=pendingBattleDeployments.findIndex(request=>request.definition===definition);
    if(index<0)return;
    const request=pendingBattleDeployments.splice(index,1)[0];
    const host=card.querySelector('.has-module-device');
    if(!battleDeploymentMotionAllowed() || !host?.animate || !cell.isConnected)return;
    const target=host.getBoundingClientRect();
    if(!target.width || !target.height)return;
    const flight=document.createElement('img');
    flight.className='battle-deployment-flight';flight.src=request.src;flight.alt='';
    flight.setAttribute('aria-hidden','true');flight.draggable=false;
    flight.style.width=`${request.width}px`;flight.style.height=`${request.height}px`;
    document.body.appendChild(flight);
    const startX=request.left,startY=request.top;
    const endX=target.left+(target.width-request.width)/2;
    const endY=target.top+(target.height-request.height)/2;
    const scale=target.width/request.width;
    const travel=flight.animate([
      {transform:`translate(${startX}px,${startY}px) scale(1)`,opacity:1},
      {transform:`translate(${endX}px,${endY}px) scale(${scale})`,opacity:0}
    ],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
    // Animate art only: authoritative position, routing and meters stay put.
    const arrival=host.animate([{opacity:0},{opacity:1}],{duration:240,delay:120,fill:'both'});
    const record={flight,travel,arrival};liveBattleDeployments.add(record);
    travel.onfinish=travel.oncancel=()=>releaseBattleDeployment(record);
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
    rememberBattleDeployment(module);
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
    mountModuleEmblem(icon, module);
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
    const deckModules = battleDeckInstanceIds().map(id => client.modules.get(id)).filter(Boolean);
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
      language:document.documentElement?.lang || "tr",
      coreType:metaProgressionState?.cores?.selected_core_type,
      cellDebris:playerCellDebris,
      modules:[...client.modules.values()].map(module => ({
        id:module.instanceId,
        definitionId:module.definitionId,
        nameTr:module.nameTr,
        category:module.category,
        status:module.status,
        position:module.position,
        hp:module.hp,
        maxHp:module.maxHp,
        heat:module.heat,
        heatPenalty:module.heatPenalty,
        overheated:module.overheated,
        energyWaiting:module.energyWaiting,
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
        updateModuleCard:updateBattleModuleCard,
        cellDebris: playerCellDebris,
        debrisLabel: localizedUiText("Enkaz"),
        secondsLabel:document.documentElement?.lang === "en" ? "s" : "sn",
        // Çekirdek kartı hedefleme durumuna göre de değişir.
        moduleSignature: (module) => (
          `${battleModuleRenderSignature(module)}|${
            module.nameTr === "Çekirdek" && corePowerTargeting ? 1 : 0
          }|${document.documentElement?.lang || "tr"}|${module.definitionId === "core" ? metaProgressionState?.cores?.selected_core_type || "core_resonance" : ""}`
        ),
        onCardPlaced: (module, cell) => {
          moduleAnchorCells.set(String(module.instanceId), cell);
        },
        onCardCreated:presentBattleDeployment,
        force,
      }
    );
    renderBoardCables(
      board,
      playerCircuitCableModules()
    );
  }

  // Modülün amblemi: sandıklar ve Çekirdek amblemiyle aynı dilde çizilmiş simge
  // (bkz. module-card-view.js). Oyunda modülün göründüğü her yerde aynı çizim durur.
  function moduleEmblemMarkup(module) {
    return GridshardModuleCardView.emblemFor(module);
  }

  function mountModuleEmblem(element, module) {
    if (!element) return;
    element.innerHTML = moduleEmblemMarkup(module);
    element.classList.add("has-module-emblem");
  }

  // Savaş kartına sığan kısa ad (bkz. module-card-view.js).
  function moduleShortNameFor(module) {
    return typeof GridshardModuleCardView.shortNameFor === "function"
      ? GridshardModuleCardView.shortNameFor(module)
      : String(module?.nameTr || "");
  }

  // Savaş kartındaki ad satırı: etkin dile çevrilmiş kısa ad. Ad yalnız raf
  // kartında görünür; devreye yerleşen kartta gizlidir. On bir harf ve üstü
  // adlar dar kartta taşmasın diye işaretlenir (bkz. canon.css, "Savaşta
  // modül adları").
  function fillBattleCardName(element, moduleLike) {
    const text = localizedUiText(moduleShortNameFor(moduleLike));
    element.textContent = text;
    if (text.length >= 11) element.dataset.long = "true";
  }

  function createModuleCard(module) {
    const card = battleCardStateView.create(battleCardModel(module));
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      const current = client.modules.get(card.dataset.moduleId);
      if (!current) return;
      if (current.definitionId === "core" && corePowerReady) {
        useCorePowerOn(current);
        return;
      }
      if (current.status === "reserve") {
        if (!modulePlacementSlotState().ready) {
          logClientMessage("Devre dolu; boş hücre açılınca yerleştirebilirsin.");
          return;
        }
        deployDeckModule(current);
      }
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      card.click();
    });
    return card;
  }




  function renderCredits() {
    setHudText(
      document.getElementById("credit-indicator-value"),
      `Akım: ${client.circuitCredits} / 12`
    );
    if (shelfCreditIndicatorEl) {
      setHudText(
        document.getElementById("shelf-credit-value"),
        `${client.circuitCredits} / 12`
      );
    }
    const current = Math.max(0,Math.min(12,Number(client.circuitCredits)||0));
    const fill = document.getElementById('battle-current-fill');
    const meter = document.getElementById('battle-current-bar');
    const transform = `scaleX(${current/12})`;
    const balance=String(current),changed=meter?.getAttribute('aria-valuenow')!==balance;
    // CSSOM rounds fractional transforms. Compare the server balance so a
    // steady 1/12 does not repeatedly write a longer float on every HUD tick.
    if(fill && (!fill.style.transform || changed))fill.style.transform=transform;
    if(meter && changed)meter.setAttribute('aria-valuenow',balance);
    // Bu sayaca merkez ekranı da yazar; karşılaştırma ekrandaki sayıyla yapılır.
    const lobbyCredits = document.getElementById("lobby-circuit-credits");
    const lobbyValue = String(metaProgressionState?.circuit_credits ?? 0);
    if (lobbyCredits && lobbyCredits.textContent !== lobbyValue) lobbyCredits.textContent = lobbyValue;
  }

  function flashInsufficientCredits() {
    creditEl.classList.add("credit-insufficient");
    scheduleBattleSweep(700, () => {
      creditEl.classList.remove("credit-insufficient");
    });
  }


  function renderCapacity() {
    if (!capacityEl) return;
    const placement = modulePlacementSlotState();
    setHudText(capacityEl, localizedUiText(
      `Devrede ${placement.active} / ${placement.currentLimit}`
    ));
    setHudData(capacityEl, "state", placement.available > 0 ? "ready" : "complete");
    capacityEl.classList.remove("capacity-opened");
  }

  function renderLockState() {
    if (localBattleFinished) {
      setHudData(lockLabel, "active", "false");
      setHudText(lockLabel, "Maç Bitti");
      setHudText(shelfHelp, "Savaş tamamlandı; yeni kart basılamaz.");
      return;
    }

    const placement = modulePlacementSlotState();
    const affordable = battleDeckInstanceIds().some((instanceId) => {
      const module = client.modules.get(instanceId);
      return module && client.circuitCredits >= Number(module.currentCost || 0);
    });
    const unlocked = placement.ready && affordable;
    setHudData(lockLabel, "active", String(unlocked));
    setHudText(lockLabel, unlocked ? "Aktif" : "Beklemede");

    if (unlocked) {
      setHudText(shelfHelp, localizedUiText("Deste kartına tıkla; sunucu uygun hücreye otomatik yerleştirsin."));
    } else {
      setHudText(shelfHelp, placement.available <= 0
        ? "Devre dolu; boş hücre açılınca yerleştirebilirsin."
        : "Akım yenileniyor: 2,5 saniyede +1.");
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

  // Kayıt yalnız son satırları gösterir; çevrimiçi savaşlar arasında
  // sıfırlanmadığı için oturum boyunca büyümesin diye kırpılır.
  const COMMAND_LOG_LIMIT = 200;

  function renderLog() {
    if (commandLog.length > COMMAND_LOG_LIMIT) {
      commandLog.splice(0, commandLog.length - COMMAND_LOG_LIMIT);
    }
    const lines = [];
    for (let index = commandLog.length - 1; index >= 0 && lines.length < 8; index -= 1) {
      const text = formatBattleLogEntry(commandLog[index]);
      if (text) lines.push(text);
    }
    lines.reverse();
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
      // Savaş zamanlayıcılarının yumuşatılmış gecikmesi ve ondan türeyen yük düzeyi (0-2).
      get pulseLagMs() { return Math.round(battleTimerLagMs); },
      get pulseLoad() { return battleTimerLoad(); },
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

  function requestBattleMotionFrame() {
    // Effects can wake us from inside tick(). The current frame owns that
    // handoff; queuing here as well would multiply rAF chains every core pulse.
    if (battleClockUpdating || document.hidden || document.body.dataset.appScreen !== "play" || !(moduleMotion.needsFrame || moduleFx?.active)) return;
    if (battleClockTimer !== null) { window.clearTimeout(battleClockTimer); battleClockTimer = null; }
    if (battleClockFrame === null) battleClockFrame = requestAnimationFrame(updateClock);
  }

  // Otomatik grafik kademesi: ölçüm pencerelerinde kare hızı art arda iki kez
  // kötü çıkarsa kademe bir iner (eşikler battle/graphics-tier.js içinde).
  function trackAutoGraphics(now, sampling) {
    if (graphicsTier.trackFrame(now, { sampling, hidden:document.hidden })) {
      applyGraphicsQuality();
    }
  }

  // Deployed cores "work" in battle: motes rise from the stone every 220 ms
  // (inside the battle loop; off on low graphics via moduleFx.coreIdle).
  let lastCoreIdleAt = 0;
  // Static socket geometry lives for one layout epoch. Weak keys release
  // destroyed/replaced core art without retaining an old battlefield.
  const coreIdleEmitterGeometry = new WeakMap();
  function isBattlePresentationRunning(){
    return activePlayMode === "online"
      ? document.body.dataset.onlineStatus === "battle"
      : activePlayMode === "local" && localBattleStarted && !localBattleFinished;
  }
  function emitCoreIdleMotes(now) {
    if (!moduleFx || document.hidden || document.body.dataset.appScreen !== "play" || !isBattlePresentationRunning() || !Number.isFinite(now) || now - lastCoreIdleAt < 220 || battleGraphicsQuality() === "dusuk") return;
    lastCoreIdleAt = now;
    let layer = null;
    for (const pulse of document.querySelectorAll('.module-device-rig[data-core="true"] .module-core-pulse')) {
      let emitter = coreIdleEmitterGeometry.get(pulse);
      const card = emitter?.card || pulse.closest("[data-module-id]");
      const ready = !!card?.classList.contains("core-power-ready");
      // Ready art changes the stone's width (46% -> 58%). Preserve that
      // geometry, while ordinary pulses still perform no layout reads.
      if (!emitter || emitter.epoch !== battleLayoutEpoch || emitter.ready !== ready) {
        layer ||= document.getElementById("battle-effect-layer")?.getBoundingClientRect();
        if (!layer?.width) return;
        const r = pulse.getBoundingClientRect();
        if (!r.width) continue;
        const accent = card ? getComputedStyle(card).getPropertyValue("--core-accent").trim() : "";
        emitter = {epoch:battleLayoutEpoch,card,ready,color:accent || "#56f1df",
          point:{x:r.left + r.width / 2 - layer.left,y:r.top + r.height / 2 - layer.top},
          k:Math.max(.6,Math.min(1.6,r.width / 40))};
        coreIdleEmitterGeometry.set(pulse,emitter);
      }
      moduleFx.coreIdle(emitter.point,
        {color:emitter.color,k:emitter.k,ready});
    }
  }

  function syncBattleClockVisibility(){
    if(document.hidden || document.body.dataset.appScreen !== "play"){
      if(battleClockFrame !== null)window.cancelAnimationFrame?.(battleClockFrame);
      if(battleClockTimer !== null)window.clearTimeout(battleClockTimer);
      battleClockFrame=battleClockTimer=null;
    }else if(!battleClockUpdating && battleClockFrame === null && battleClockTimer === null){
      battleClockFrame=requestAnimationFrame(updateClock);
    }
  }

  function updateClock(now) {
    battleClockFrame = null;
    battleClockTimer = null;
    battleClockUpdating = true;
    let frameSampling = false;
    try {
      frameSampling = renderBattleFrame(now);
    } finally {
      // A transient render error must remain visible to error reporting, but
      // must not permanently kill the clock while transport/audio keep running.
      battleClockUpdating = false;
      if(document.hidden || document.body.dataset.appScreen !== "play"){
        // The visible screen / visibility handler owns the next wakeup.
      }else if (frameSampling || moduleMotion.needsFrame || moduleFx?.active || typeof window.setTimeout !== "function") {
        battleClockFrame = requestAnimationFrame(updateClock);
      } else {
        // rAF waits in background tabs; the timer only sets the HUD interval.
        battleClockTimer = window.setTimeout(
          () => { battleClockTimer = null; battleClockFrame = requestAnimationFrame(updateClock); },
          BATTLE_HUD_RENDER_INTERVAL_MS - 16
        );
      }
    }
  }

  function renderBattleFrame(now) {
    if(document.hidden || document.body.dataset.appScreen !== "play"){
      moduleMotion.clear();
      if(moduleFx?.active)moduleFx.clear();
      if(battlePerformanceSampler?.active)battlePerformanceSampler.suspend();
      analyticsLastFrameAt=null;
      return false;
    }
    const analyticsBattleActive = activePlayMode === "online"
      ? document.body.dataset.onlineStatus === "battle"
      : activePlayMode === "local" && localBattleStarted && !localBattleFinished;
    const frameSampling = frameSamplingActive(now, analyticsBattleActive);
    sampleBattlePerformance(now, frameSampling);
    syncFirstMatchTutorial(now);
    trackAutoGraphics(now, frameSampling);
    if (frameSampling && !document.hidden && settingsState.analyticsConsent) {
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

    // Read before this frame's HUD/board writes. A 220ms pulse must not force
    // synchronous layout immediately after updating the battlefield.
    if (!document.hidden) emitCoreIdleMotes(now);

    // HUD ve tahta denetimi her karede çalışmaz: sunucu mesajı uygulanınca
    // (bkz. syncOnlineServerBattle) ve yedek olarak bu turda yenilenir.
    if (
      !Number.isFinite(now)
      || now - lastBattleHudRenderAt >= BATTLE_HUD_RENDER_INTERVAL_MS
      || now < lastBattleHudRenderAt
    ) {
      renderBattleHud(now);
    }

    moduleMotion.tick(now);
    if (document.hidden) moduleFx?.clear(); else moduleFx?.tick(now);
    return frameSampling;
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
    if (activePlayMode === "online" || (activePlayMode === "local" && !localBattleFinished)) {
      renderEnemyBoard();
      if (activePlayMode === "local") publishBattleUxMetrics();
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
    if (!document.hidden && document.body.dataset.appScreen === "daily-missions") updateDailyMissionReset();
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
          if (controlId === "settings-analytics-consent") {
            onAnalyticsConsentChanged();
          } else if (controlId !== "settings-language") {
            scheduleSettingsAutoSave(control.type === "range" ? 320 : 120);
          }
        }
      );
    }
  }
  document.getElementById("analytics-age-confirm")?.addEventListener("click", confirmAnalyticsBirthYear);
  document.getElementById("analytics-age-cancel")?.addEventListener("click", cancelAnalyticsBirthYear);
  document.getElementById("analytics-age-year")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmAnalyticsBirthYear();
  });

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
    invalidateBattleLayout();
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
    graphicsTier.setMode(event.target.value === "otomatik" ? "auto" : "manual");
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
    void presentRoadNewsEarnedInMatch(progression);
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
    if (!arenaDetailDialog?.open) renderArenaPath();
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

  // Yeni arenaya ya da lige girişte açılan modül ekrana gelerek tanıtılır.
  // Pencere kapanınca, varsa aynı maçta kazanılan ödül durağı gösterilir.
  const moduleUnlockDialog = document.getElementById("module-unlock-dialog");
  let moduleUnlockAfterClose = null;

  function closeModuleUnlockDialog() {
    if (moduleUnlockDialog?.close) moduleUnlockDialog.close();
    else {
      moduleUnlockDialog?.removeAttribute("open");
      moduleUnlockDialog?.dispatchEvent(new Event("close"));
    }
  }

  function presentModuleUnlocks(moduleIds, { onClose = null } = {}) {
    const collection = metaProgressionState?.module_collection || [];
    const items = (moduleIds || [])
      .map((id) => collection.find((item) => item.definition_id === id))
      .filter(Boolean);
    const host = document.getElementById("module-unlock-list");
    if (!items.length || !host || !moduleUnlockDialog || moduleUnlockDialog.open) return false;
    host.replaceChildren();
    // İkiden çok kart (Arena 12: üç, ilk lig: yedi) sıkışık satırlarla dizilir.
    host.dataset.layout = items.length > 2 ? "compact" : "full";
    for (const item of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "module-unlock-card";
      card.dataset.category = item.category || "";
      card.dataset.rarity = item.rarity || "";
      card.dataset.moduleDefinitionId = item.definition_id;
      const art = document.createElement("i");
      art.setAttribute("aria-hidden", "true");
      mountModuleEmblem(art, { nameTr: item.name_tr });
      const name = document.createElement("strong");
      name.textContent = localizedUiText(item.name_tr);
      const kind = document.createElement("span");
      kind.textContent = `${localizedUiText(moduleRarityLabel(item.rarity))} · ${localizedUiText(poolCategoryLabel(item.category))}`;
      const description = document.createElement("p");
      description.textContent = serverCopy(item.description_tr, item.description_en)
        || localizedUiText(item.strategic_role || "");
      const more = document.createElement("small");
      more.textContent = localizedUiText("KARTA BAK");
      card.append(art, name, kind, description, more);
      card.addEventListener("click", () => {
        // Kart ayrıntısına geçen oyuncuya ayrıca ödül durağı açılmaz.
        moduleUnlockAfterClose = null;
        closeModuleUnlockDialog();
        selectedCollectionModuleId = item.definition_id;
        openModuleDetail();
      });
      host.appendChild(card);
    }
    const title = document.getElementById("module-unlock-title");
    if (title) {
      title.textContent = items.length === 1
        ? localizedUiText(items[0].name_tr)
        : localizedMessage("unlock.module_count", {count:localizedNumber(items.length)});
    }
    const stage = document.getElementById("module-unlock-stage");
    if (stage) {
      // Aynı maçta açılan modüller aynı aşamaya aittir; ilki yeterlidir.
      const arena = items[0].unlock_stage_kind === "arena" ? Number(items[0].unlock_arena || 0) : 0;
      stage.textContent = arena
        ? localizedMessage("unlock.arena_reached", {arena:localizedNumber(arena)})
        : localizedMessage("unlock.league_reached", {
          league:localizedUiText(items[0].unlock_stage_name_tr || ""),
        });
    }
    moduleUnlockAfterClose = onClose;
    if (moduleUnlockDialog.showModal) moduleUnlockDialog.showModal();
    else moduleUnlockDialog.setAttribute("open", "");
    return true;
  }
  document.getElementById("module-unlock-close")?.addEventListener("click", closeModuleUnlockDialog);
  moduleUnlockDialog?.addEventListener("close", () => {
    const next = moduleUnlockAfterClose;
    moduleUnlockAfterClose = null;
    if (typeof next === "function") next();
  });

  async function presentRoadNewsEarnedInMatch(progression) {
    const unlockedIds = progression?.newlyUnlockedModuleIds || [];
    if (unlockedIds.length) {
      await loadMetaProgression();
      if (document.body.dataset.appScreen === "menu" && presentModuleUnlocks(unlockedIds, {
        onClose:() => { void presentArenaRewardEarnedInMatch(progression); },
      })) return;
    }
    await presentArenaRewardEarnedInMatch(progression);
  }

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
  bindDropdownMenu(document.getElementById("lobby-menu-button"), document.getElementById("lobby-menu"));

  // Sabit sayfadaki yazıların yanına eşleşen renkli simgeler: bilgi penceresi
  // sekmeleri, üç çizgi menüsü ve takım menüsü. Sayfa kaynağı yalın kalır;
  // simgeler tek takımdan (UI_ICON_PATHS) gelir.
  // Fixed SVG artwork: physical rim, light/shadow faces and dark contour.
  // Mounted once; no animation loop, measured layout or player text in HTML.
  const EVENT_HUB_EMBLEMS = Object.freeze({
    trophy:`<img class="event-approved-trophy" src="${COMPETITION_TROPHY_ASSET}" width="64" height="64" alt="" decoding="async">`,
    wheel:'<svg viewBox="0 0 80 80" focusable="false" aria-hidden="true">'
      + '<path class="eb-shadow" d="M19 69h42l5 5H14Z"/>'
      + '<path class="eb-steel eb-outline" d="M34 57h12v11H34Z M26 67h28l5 7H21Z"/>'
      + '<circle class="eb-steel eb-outline" cx="40" cy="34" r="29"/>'
      + '<circle class="eb-dark eb-outline" cx="40" cy="34" r="23"/>'
      + '<path class="eb-cyan eb-outline" d="M40 13 52 16 40 34 28 16Z M61 34 58 46 40 34 58 22Z M40 55 28 52 40 34 52 52Z M19 34 22 22 40 34 22 46Z"/>'
      + '<path class="eb-gold eb-outline" d="M52 16 58 22 40 34Z M58 46 52 52 40 34Z M28 52 22 46 40 34Z M22 22 28 16 40 34Z"/>'
      + '<path class="eb-light" d="M12 29A29 29 0 0 1 40 5v4a25 25 0 0 0-24 21Z"/>'
      + '<circle class="eb-steel eb-outline" cx="40" cy="34" r="8"/>'
      + '<path class="eb-gold eb-outline" d="M40 1 46 9 40 16 34 9Z"/>'
      + '<circle class="eb-light" cx="40" cy="34" r="3"/></svg>',
    banner:'<svg viewBox="0 0 80 80" focusable="false" aria-hidden="true">'
      + '<path class="eb-shadow" d="M10 71h60l5 4H5Z"/>'
      + '<path class="eb-steel eb-outline" d="M13 8h5v64h-5Z M62 8h5v64h-5Z"/>'
      + '<path class="eb-gold eb-outline" d="m15.5 2 5 6-5 6-5-6Z m49 0 5 6-5 6-5-6Z"/>'
      + '<path class="eb-violet eb-outline" d="M18 14h44v40L40 69 18 54Z"/>'
      + '<path class="eb-light" d="M18 14h44v5H23v34l-5 1Z"/>'
      + '<path class="eb-shade" d="M40 19h17v32L40 63Z"/>'
      + '<path class="eb-gold eb-outline" d="M40 25 53 30v10c0 8-5 14-13 19-8-5-13-11-13-19V30Z"/>'
      + '<path class="eb-dark eb-outline" d="m40 33 7 9-7 9-7-9Z"/>'
      + '<path class="eb-cyan" d="m40 37 4 5-4 5-4-5Z"/></svg>',
  });

  function decorateStaticIcons() {
    for (const host of document.querySelectorAll("[data-rating-trophy]")) {
      if (!host.querySelector(".trophy-value-icon")) host.prepend(createRatingTrophyIcon());
      host.classList.add("has-ui-icon");
    }
    for (const host of document.querySelectorAll("[data-event-emblem]")) {
      const kind = host.dataset.eventEmblem;
      if (kind === "banner") host.innerHTML = '<span class="ui-art" data-ui-art="team-tournament" aria-hidden="true"></span>';
      else if (Object.hasOwn(EVENT_HUB_EMBLEMS, kind)) host.innerHTML = EVENT_HUB_EMBLEMS[kind];
    }
    for (const [selector, icon, tone] of [
      ['[data-module-detail-tab="overview"], [data-core-detail-tab="overview"]', "info", "cyan"],
      ['[data-module-detail-tab="stats"], [data-core-detail-tab="stats"]', "bars", "gold"],
      ['[data-module-detail-tab="talents"], [data-core-detail-tab="skills"]', "star", "violet"],
      ['#lobby-menu [data-open-screen="avatar"]', "palette", "pink"],
      ['#lobby-menu [data-open-screen="daily"]', "gift", "gold"],
      ['#lobby-menu [data-open-screen="friends"]', "people", "green"],
      ['#lobby-menu [data-open-screen="settings"]', "gear", "steel"],
      ['#team-menu [data-team-management-tab="cosmetics"]', "palette", "pink"],
      ['#team-menu [data-team-management-tab="members"]', "people", "green"],
      ['[data-card-page="modules"]', "deck", "blue"],
      ['[data-card-page="cores"]', "core", "cyan"],
      ['[data-leaderboard-tab="teams"]', "team", "violet"],
    ]) {
      for (const button of document.querySelectorAll(selector)) {
        if (button.querySelector(".ui-icon")) continue;
        const glyph = button.querySelector(":scope > span");
        const symbol = createUiIcon(icon, tone);
        if (glyph) glyph.replaceWith(symbol);
        else button.prepend(symbol);
        button.dataset.tone = tone;
        button.classList.add("has-ui-icon");
      }
    }
    const coreRanking = document.querySelector('[data-leaderboard-tab="core_damage"] > span');
    if (coreRanking) mountCoreEmblem(coreRanking, "core_resonance");
    for (const button of document.querySelectorAll("#arena-detail-close,#leaderboard-back,.event-detail-header > button")) {
      button.innerHTML = uiIconMarkup("back"); button.classList.add("refresh-back-button");
    }
    const leaderboardButton = document.getElementById("arena-leaderboard-button");
    if (leaderboardButton) {
      leaderboardButton.textContent = "LİDER PANOSU";
      leaderboardButton.prepend(createRatingTrophyIcon());
    }
    // Sayfa kaynağında işaretli başlıklar: data-ui-icon="simge:ton".
    for (const element of document.querySelectorAll("[data-ui-icon]")) {
      if (element.querySelector(":scope > .ui-icon, :scope > .resource-symbol.is-token")) continue;
      const [icon, tone] = String(element.dataset.uiIcon).split(":");
      element.prepend(createUiIcon(icon, tone || ""));
      element.classList.add("has-ui-icon");
    }
    // Düğme yazısının solundaki yalın simge (zemini düğmenin kendisidir).
    for (const element of document.querySelectorAll("[data-ui-glyph]")) {
      if (element.querySelector(":scope > .ui-glyph")) continue;
      const glyph = document.createElement("i");
      glyph.className = "ui-glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${UI_ICON_PATHS[element.dataset.uiGlyph] || ""}</svg>`;
      element.prepend(glyph);
    }
  }
  decorateStaticIcons();
  bindDropdownMenu(document.getElementById("team-menu-button"), document.getElementById("team-menu"));
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
  document.getElementById("inbox-collect-all")?.addEventListener("click", event => void collectInboxRewards(null, event.currentTarget));
  document.getElementById("inbox-delete-all")?.addEventListener("click", () => {
    if (inboxDismissBusy || inboxClaimBusy || activeInboxTab !== "purchase") return;
    const dialog = document.getElementById("inbox-delete-confirm-dialog");
    if (!dialog?.showModal || dialog.open) return;
    pendingInboxDismiss = { playerId:participantPlayerId, category:activeInboxTab };
    dialog.showModal();
  });
  document.getElementById("inbox-delete-cancel")?.addEventListener("click", () => {
    document.getElementById("inbox-delete-confirm-dialog")?.close();
  });
  document.getElementById("inbox-delete-confirm-dialog")?.addEventListener("close", () => {
    pendingInboxDismiss = null;
  });
  document.getElementById("inbox-delete-confirm")?.addEventListener("click", () => {
    const pending = pendingInboxDismiss;
    document.getElementById("inbox-delete-confirm-dialog")?.close();
    if (!pending || pending.playerId !== participantPlayerId) return;
    void dismissInboxMessages(pending.category, [], document.getElementById("inbox-delete-all"), { all:true });
  });
  document.getElementById("inbox-delete-undo")?.addEventListener("click", (event) => {
    if (!lastInboxDismiss || lastInboxDismiss.playerId !== participantPlayerId) return;
    void dismissInboxMessages(lastInboxDismiss.category, lastInboxDismiss.ids, event.currentTarget, { restore:true });
  });
  for (const tab of document.querySelectorAll("[data-inbox-tab]")) {
    tab.addEventListener("click", () => setRewardInboxTab(tab.dataset.inboxTab));
    tab.addEventListener("keydown", (event) => {
      const tabs = ["battle", "purchase", "reward", "system"];
      const index = tabs.indexOf(activeInboxTab);
      const next = { ArrowRight:(index + 1) % tabs.length, ArrowLeft:(index + tabs.length - 1) % tabs.length, Home:0, End:tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      setRewardInboxTab(tabs[next], { focus:true });
    });
  }
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
      startRenderCostProbe:() => {
        if(window.__battlePhaseCost)return;
        const stats=window.__battlePhaseCost={};
        const wrap=(name,fn)=>{const s=stats[name]={calls:0,totalMs:0,maxMs:0};return function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const ms=performance.now()-start;s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);}};};
        renderBattleFrame=wrap("frame",renderBattleFrame);
        renderBattleHud=wrap("hud",renderBattleHud);
        syncOnlineServerBattle=wrap("snapshot",syncOnlineServerBattle);
        renderEnemyBoard=wrap("enemy",renderEnemyBoard);
        renderBoard=wrap("board",renderBoard);
        renderShelf=wrap("shelf",renderShelf);
        syncFirstMatchTutorial=wrap("tutorial",syncFirstMatchTutorial);
        renderPlayerCoreSummary=wrap("coreSummary",renderPlayerCoreSummary);
      },
      startQuickLocalBattle,
      fillBattlePoolForQuickTest,
      // Visual-only chest previews. This API is removed by production builds.
      showChestOpening,
      showChestReveal,
      showBulkChestReveal,
      showClaimedChest,
      showChestFailure,
      // Uses the same authenticated setup/ready/render path as an accepted
      // friend invitation. This entire API is removed by production builds.
      launchSocialBattle,
      dropOnlineConnection:() => pvpConnection.socket?.close(4000, "e2e-network-drop"),
      getOnlineBattleState:() => ({
        phase:pvpState.phase,
        connected:pvpState.connected,
        onlineStatus:onlinePlay.status,
        lastError:pvpState.lastError || onlinePlay.lastError || null,
        lobby:pvpState.lobby,
        cursor:pvpState.eventCursor,
        historySize:pvpState.events.length,
        elapsedMs:pvpState.snapshot?.elapsed_ms || 0,
        countdownActive:battleCountdown.active,
        droppedEffects:onlineBattlePresentation.droppedEffects,
      }),
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
      emitModuleExplosion,
      // Presentation-only activation preview; same handler as server events.
      previewCoreActivation:(effectKind="energy")=>{
        if(!["heal","attack","sabotage","defense","energy","hybrid"].includes(effectKind))return false;
        presentCorePowerActivation(pvpState.snapshot || localServerState.snapshot || {players:[]},
          {player_id:participantPlayerId,effect_kind:effectKind,power_id:"core_capacitor",affected_targets:[]});
        return true;
      },
      // Presentation-only death/rebirth preview; never mutates authoritative
      // modules, rewards or the server. Removed with this API in production.
      previewCoreState:({hp=0}={})=>{
        const module=client.modules.get("core-1"),card=document.getElementById("board")?.querySelector('[data-module-id="core-1"]');
        if(!module||!card)return false;
        battleCardStateView.update(card,battleCardModel({...module,hp}));
        return true;
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
  /* /build:development-only */

  // İlk oyun deneyimi (Ekim 2026). Hiç maç bitirmemiş oyuncu, atlama seçeneği
  // olmadan ve hareketli okla adım adım yönlendirilir: mağazada hediye sandığı,
  // kartlarda Lazer yükseltme, takım ve etkinlik ekranları, haftalık turnuva
  // kaydı ve ilk savaş. Akış ile katman tutorial/onboarding.js içindedir;
  // burada adımlar ve uygulama bağlamı tanımlanır.
  //
  // İlk savaşı sunucu sahne sahne yönetir (server/app/game/tutorial.py):
  // oyuncu okurken savaş durur; sahne anlık görüntüdeki `tutorial` alanıyla
  // gelir, "İLERİ" sunucuya `tutorial_ack` komutuyla bildirilir. İlk savaş
  // normal Arena maçıdır. Eğitim Ayarlar'dan yeniden başlatıldığında aynı
  // savaş eğitim maçı olarak oynanır: kupa ve ödül vermez, oyuncu Başlangıç
  // Devresi ile girer (bkz. battleDeckInstanceIds). Sunucu savaşı
  // yönetmiyorsa (ör. ilk maçta değiştirilmiş deste) savaşı durdurmayan ipucu
  // kartları gösterilir.
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
      body:"Soğutucu ısınan modülleri soğutur, Güçlendirici saldırı gücünü artırır. Bunlar DESTEK modülleridir.",
      target:() => document.getElementById("module-shelf"),
      emphasize:() => ["cooler", "amplifier"].map(onboardingShelfCard),
    },
    type_sabotage:{
      title:"Sabotaj modülleri",
      body:"EMP bir SABOTAJ modülüdür: rakibin enerji ve destek hatlarını kısa süre aksatır.",
      target:() => onboardingShelfCard("emp"),
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
    deploy_shield:{
      title:"Kalkan",
      body:"Soğutucunun canı azaldı. Kalkan kartına dokun; rakibin ateşini üstüne çeker.",
    },
    watch_shield:{
      title:"Kalkan koruyor",
      body:"Rakip artık Kalkana ateş ediyor. Kalkan hasarı emiyor; Soğutucun güvende.",
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

  // `c.veteran`: oyuncunun bitmiş maçı var, yani eğitimi Ayarlar'dan yeniden
  // başlatmış; sunucu bu savaşı eğitim maçı olarak kurar.
  const ONBOARDING_START_BATTLE = Object.freeze({
    // İstatistik geç yüklenirse metin doğru sürüme döner.
    key:(c) => (c.veteran ? "start-training" : "start"),
    target:"#home-battle-button",
    mode:"tap",
    // Düğme kapalıysa (ör. bağlantı yok) adım geçilmez; oyuncu serbest kalır.
    stuck:"release",
    title:(c) => (c.veteran ? "Eğitim savaşı" : "İlk savaşın"),
    body:(c) => (c.veteran
      ? "Sıra eğitim savaşında. SAVAŞ'a dokun; sana adım adım eşlik edeceğim. Bu savaş Başlangıç Devresi ile oynanır; kupa ve ödül vermez."
      : "Sıra savaşta. SAVAŞ'a dokun; ilk savaşında sana adım adım eşlik edeceğim."),
  });

  const ONBOARDING_STEPS = [
    {
      id:"welcome",
      when:(c) => c.screen === "menu" && !c.inMatchFlow,
      key:(c) => (c.veteran ? "veteran" : ""),
      title:"GRIDSHARD'a hoş geldin!",
      body:(c) => (c.veteran
        ? "Ekranları yeniden dolaşacak ve bir eğitim savaşı oynayacaksın. Eğitim savaşı kupa ve ödül vermez."
        : "Birkaç dakikada ekranları tanıyacak, ilk ödülünü alacak ve ilk savaşını kazanacaksın."),
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
      target:"#chest-store-list .gift-chest-action",
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
      body:"Üstte iki paran var. Devre Kredisiyle kart yükseltir, turnuvalara katılırsın. Akı daha nadirdir; değerli sandıklar ve yetenekler içindir. Yanlarındaki + seni mağazaya getirir.",
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
      body:"Burada açık takımları görürsün: BAŞVUR ile bir takıma başvurur ya da TAKIM OLUŞTUR ile kendi takımını kurarsın. Buna sonra dönersin.",
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
          : "Katılım 100 Devre Kredisidir. Katıldıktan sonra Arena savaşlarında kazandığın kupalar haftalık sıralamana eklenir; hafta sonunda ilk üçe girenler ödül kasası kazanır. TURNUVAYA KATIL'a dokun."),
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
      title:"Savaş",
      body:"Artık hazırsın. SAVAŞ sekmesine dön.",
    },
    {
      id:"home",
      when:(c) => c.screen === "menu" && !c.inMatchFlow,
      target:"#app-progress-ribbon",
      title:"Profilin",
      body:"Adın, unvanın ve kupaların burada. Mesaj kutusuna ödüller ve duyurular gelir; yanındaki menüden kozmetik, ödül, arkadaş ve ayar sayfaları açılır.",
    },
    {
      id:"battle",
      // İlerleme çubuğunda savaş, menü turunun yarısı kadar yer tutar.
      weight:12,
      done:(c) => c.finished,
      present:(c) => {
        // Leave the error/return action reachable; resume this step on home.
        if (c.status === "error") return null;
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
      // `c.trainingMatch`: biten savaş eğitim maçıydı (eğitim yeniden başlatıldı).
      present:(c) => (!c.postMatchVisible ? null : c.postMatchStage === "rewards"
        ? {
            key:c.trainingMatch ? "rewards-training" : "rewards",
            target:"#post-match-continue",
            mode:"tap",
            place:"top",
            shade:"soft",
            title:c.trainingMatch ? "Eğitim savaşı" : "Savaş ödülleri",
            body:c.trainingMatch
              ? "Bu bir eğitim savaşıydı; kupa, Devre Kredisi ve deneyim vermez. Arena savaşlarında her zaferde bunları kazanırsın. DEVAM'a dokun."
              : "Her zaferde kupa, Devre Kredisi ve deneyim kazanırsın. Kupa topladıkça yeni arenalar ve kartlar açılır. DEVAM'a dokun.",
          }
        : {
            key:c.trainingMatch ? "damage-training" : "damage",
            target:"#post-match-continue",
            mode:"tap",
            place:"top",
            shade:"soft",
            title:"Tebrikler, kazandın!",
            body:c.trainingMatch
              ? "Eğitim savaşını kazandın. Bu ekranda hangi modülünün ne kadar hasar verdiğini görürsün. DEVAM'a dokun."
              : "İlk savaşını kazandın. Bu ekranda hangi modülünün ne kadar hasar verdiğini görürsün. DEVAM'a dokun.",
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
      // Oyuncunun bitmiş maçı var: eğitim Ayarlar'dan yeniden başlatılmıştır.
      veteran: Number(statisticsState.viewModel()?.totalMatches) > 0,
      // Süren ya da biten savaş eğitim maçı (son anlık görüntü maç sonunda da durur).
      trainingMatch: pvpState.snapshot?.match_type === "tutorial_training",
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

  let reviewTutorialRequested = false;
  let lastTutorialSyncAt = -Infinity;
  function syncFirstMatchTutorial(now, { force = false } = {}) {
    if (!force && now - lastTutorialSyncAt < 200) return;
    lastTutorialSyncAt = now;
    // A private demo must be freely inspectable, not trapped by the automatic
    // first-player guide. This is UI only; it grants no server access. Reviewers
    // can still request the tutorial explicitly from Settings.
    if (document.getElementById("review-access-dialog")?.open
      || (globalThis.GridshardAuth?.session?.isReviewProfile?.() && !reviewTutorialRequested)) {
      onboardingOverlay.hide();
      return;
    }
    if (!onboardingFlow.active && onboardingFlow.isCompleted()
      && !pvpState.snapshot?.tutorial && !localServerState.snapshot?.tutorial) return;
    const context = onboardingContext();
    if (!onboardingFlow.active && context.directed && !ONBOARDING_AUTOMATION_OPT_OUT) {
      // Yönetmenli savaşa akış dışında bağlanıldı (ör. eğitim maçı sürerken
      // uygulama yeniden açıldı). Akış savaş adımından sürer; yoksa savaş,
      // oyuncuyu bekleyen sahnede yönlendirmesiz kalırdı.
      onboardingFlow.startAt("battle");
    }
    if (!onboardingFlow.active) {
      // Yalnız hiç maç bitirmemiş oyuncu; istatistik sunucudan gelmeden başlamaz.
      if (
        ONBOARDING_AUTOMATION_OPT_OUT
        || onboardingFlow.isCompleted()
        || participantBootstrapResult?.ok !== true
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
  // Menu presentation deliberately has no battle rAF. The guide owns a small
  // timer ONLY while its menu flow is active, and wakes after startup/UI events.
  // Finished/veteran/automation sessions keep no polling timer; battle keeps
  // using renderBattleFrame. Coalesce clicks/close/visibility into one wakeup.
  let onboardingSyncTimer = null;
  let onboardingSyncImmediate = false;
  function cancelOnboardingSync() {
    if (onboardingSyncTimer !== null) window.clearTimeout(onboardingSyncTimer);
    onboardingSyncTimer = null;
    onboardingSyncImmediate = false;
  }
  function runOnboardingSync() {
    onboardingSyncTimer = null;
    onboardingSyncImmediate = false;
    if (document.hidden) return;
    syncFirstMatchTutorial(performance.now(), { force:true });
    if (onboardingFlow.active && !document.hidden && document.body.dataset.appScreen !== "play") {
      onboardingSyncTimer = window.setTimeout(runOnboardingSync, 200);
    }
  }
  function requestOnboardingSync() {
    if (document.hidden) { cancelOnboardingSync(); return; }
    if (!onboardingFlow.active && (ONBOARDING_AUTOMATION_OPT_OUT
      || onboardingFlow.isCompleted() || Number(statisticsState.viewModel()?.totalMatches) > 0)) return;
    if (onboardingSyncImmediate) return;
    cancelOnboardingSync();
    onboardingSyncImmediate = true;
    onboardingSyncTimer = window.setTimeout(runOnboardingSync, 0);
  }
  document.addEventListener("click", requestOnboardingSync, true);
  document.addEventListener("close", requestOnboardingSync, true);
  document.addEventListener("visibilitychange", requestOnboardingSync);

  // Hedefe dokunuş ekranı değiştirdiyse sıradaki adım beklemeden görünür.
  onboardingOverlay.afterTap = () => {
    requestAnimationFrame(() => syncFirstMatchTutorial(performance.now(), { force: true }));
  };

  document.getElementById("settings-tutorial-replay")?.addEventListener("click", () => {
    reviewTutorialRequested = true;
    onboardingFlow.reset();
    onboardingFlow.start({ force: true });
    openAppScreen("menu");
    syncFirstMatchTutorial(performance.now(), { force: true });
    requestOnboardingSync();
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
  syncBattleClockVisibility();
})();
