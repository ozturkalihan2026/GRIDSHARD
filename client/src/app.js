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
    ["core-1","Çekirdek",300,0,"çekirdek","Ana hedef ve devre merkezi","active",{x:2,y:2}],
    ["generator-1","Jeneratör",150,0,"enerji","Ana enerji kaynağı","active",{x:2,y:3}],
    ["battery-1","Batarya",120,70,"enerji","Enerji rezervi","reserve",null],
    ["splitter-1","Dağıtıcı",85,60,"enerji","Enerji hattını dallandırma","reserve",null],
    ["capacitor-1","Kapasitör",90,75,"enerji","Kısa süreli güç boşaltımı","reserve",null],
    ["laser-1","Lazer",100,90,"saldırı","Sürekli tek hedef hasarı","reserve",null],
    ["pulse-cannon-1","Darbe Topu",115,120,"saldırı","Yüksek ani hasar","reserve",null],
    ["railgun-1","Ray Topu",95,135,"saldırı","Yüksek delici hasar","reserve",null],
    ["missile-launcher-1","Füze Fırlatıcı",105,125,"saldırı","Gecikmeli yüksek alan baskısı","reserve",null],
    ["drone-bay-1","Dron Üssü",110,115,"saldırı","Dağıtık ve sürekli baskı","reserve",null],
    ["arc-cannon-1","Ark Topu",100,130,"saldırı","Zincirleme çoklu hedef hasarı","reserve",null],
    ["shield-1","Kalkan",140,100,"savunma","Aktif hasar emme","reserve",null],
    ["armor-1","Zırh",180,95,"savunma","Pasif dayanıklılık","reserve",null],
    ["reflector-1","Yansıtıcı",110,115,"savunma","Enerji saldırısını geri çevirme","reserve",null],
    ["barrier-1","Bariyer",165,105,"savunma","Bağlantı hattını koruma","reserve",null],
    ["repair-1","Onarım Modülü",100,80,"destek","Can onarımı","reserve",null],
    ["cooler-1","Soğutucu",100,65,"destek","Isı kontrolü","reserve",null],
    ["amplifier-1","Güçlendirici",90,85,"destek","Saldırı hattını güçlendirme","reserve",null],
    ["targeting-computer-1","Hedefleme Bilgisayarı",85,90,"destek","Hedefleme desteği","reserve",null],
    ["overclock-unit-1","Aşırı Hızlandırıcı",80,105,"destek","Yüksek performans ve ısı riski","reserve",null],
    ["emp-1","EMP",80,110,"sabotaj","Geçici sistem bozma","reserve",null],
    ["jammer-1","Sinyal Bozucu",85,100,"sabotaj","Destek hatlarını bozma","reserve",null],
    ["virus-1","Virüs",70,115,"sabotaj","Zamanla yayılan sistem zayıflatması","reserve",null],
    ["energy-leech-1","Enerji Sömürücü",75,120,"sabotaj","Enerji ekonomisini baskılama","reserve",null],
    ["disruptor-1","Kesici",80,125,"sabotaj","Kritik bağlantıyı geçici kesme","reserve",null],
  ].map(([instanceId,nameTr,hp,circuitCreditCost,category,strategicRole,status,position]) => ({
    instanceId,nameTr,hp,maxHp:hp,circuitCreditCost,category,strategicRole,status,position,
    energyRequired: 0,
    energyReceived: 0,
    isPowered: true,
    storedEnergy: 0,
    portCount: PORT_COUNT_BY_NAME[nameTr] || 1,
    movable:
      nameTr !== "Çekirdek",
    removable:
      ![
        "Çekirdek",
        "Jeneratör",
      ].includes(nameTr),
    allowedMovePositions:
      nameTr === "Jeneratör"
        ? [
            {x:2,y:1},
            {x:3,y:2},
            {x:2,y:3},
            {x:1,y:2},
          ]
        : null,
    rotatable:
      ![
        "Çekirdek",
        "Jeneratör",
      ].includes(nameTr),
    direction: "up",
  }));

  const commandLog = [];
  const META_STATUS = "M1-M6 çekirdeği uygulandı";
  const COMPETITIVE_STATUS = "M7 rekabetçi altyapı doğrulanıyor";
  const BALANCE_STATUS = "Denge simülasyonu mevcut · geniş örnek bekliyor";
  const AI_STATUS = "AI altyapısı mevcut · arketip testleri bekliyor";
  const PVP_STATUS = "GRIDSHARD Beta.35 · Rekabet Bütünlüğü + Atomik Güçlendiriciler";



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
  let nextBoosterOfferIndex = 0;
  let boosterOfferOpen = false;
  let serverBoosterOfferId = null;
  let serverBoosterEligibleTargets = new Map();

  const BOOSTER_OPTIONS = [
    { id:"overcharge_chip", nameTr:"Aşırı Yük Çipi", descriptionTr:"+%25 saldırı · 15 sn", targetCategories:["saldırı"] },
    { id:"emergency_repair", nameTr:"Acil Onarım", descriptionTr:"%25 anlık onarım", targetCategories:[] },
    { id:"dual_port_adapter", nameTr:"Çift Port Adaptörü", descriptionTr:"+1 geçici port · 15 sn", targetCategories:[] },
  ];
  let selectedBoosterId = null;
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
      "generator", "battery", "splitter", "capacitor",
      "laser", "pulse_cannon", "railgun", "missile_launcher",
      "drone_bay", "arc_cannon", "shield", "armor",
      "reflector", "barrier", "repair", "cooler",
      "amplifier", "targeting_computer",
    ]),
    favorite: true,
    last_used_at_ms: null,
    system: true,
  });

  function withStarterBattlePoolPresets(presets) {
    return [
      { ...STARTER_BATTLE_POOL_PRESET },
      ...(presets || []).filter(
        (preset) => preset.name !== STARTER_BATTLE_POOL_PRESET.name
      ),
    ];
  }
  const battlePoolSelection = new BattlePoolSelection({
    selectableModuleIds: selectablePoolModules.map((module) => module.instanceId),
    requiredSize: 18,
    requiredModuleIds: ["generator-1"],
  });
  battlePoolSelection.setSelection(
    definitionIdsToInstanceIds(
      STARTER_BATTLE_POOL_PRESET.module_definition_ids
    )
  );
  let focusedPoolModuleId =
    "generator-1";
  const collapsedPoolCategories = {
    global:new Set(),
    selected:new Set(),
  };
  const collapsedShelfCategories = new Set();
  let battlePoolPresets = withStarterBattlePoolPresets([]);
  let activeBattlePoolPresetName = null;
  let activeBattlePoolPresetBaseline = [];
  let quickLoadoutFilter = "all";
  let initialBattleModuleIds = [
    "laser-1",
    "pulse-cannon-1",
  ];

  const client = new RelayBattleClient({
    modules: moduleDefinitions,
    unlockAtMs: 15000,
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

  const appRouter = new RelayAppRouter();
  const screenController = new GridshardScreenController({
    router: appRouter,
    screenEnum: RelayAppScreen,
  });

  let gridshardAudioDirector = null;
  let tutorialController = null;

  document.body.dataset.appScreen =
    appRouter.currentScreen;

  function syncAudioStateForCurrentView() {
    if (!gridshardAudioDirector) return;
    if (appRouter.currentScreen === RelayAppScreen.MENU) {
      gridshardAudioDirector.setState("menu");
      return;
    }
    if (appRouter.currentScreen !== RelayAppScreen.PLAY) return;

    const onlineStatus = document.body.dataset.onlineStatus || "idle";
    const localStatus = document.body.dataset.localStatus || "setup";
    if (onlineStatus === "battle" || localStatus === "battle") {
      gridshardAudioDirector.setState("battle");
    } else if (
      ["matchmaking", "matched", "connecting", "readying"]
        .includes(onlineStatus)
    ) {
      gridshardAudioDirector.setState("matchmaking");
    } else {
      gridshardAudioDirector.setState("pool");
    }
  }

  function renderAppScreen() {
    const current = screenController.render();
    syncAudioStateForCurrentView();

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

    if (["profile", "daily", "rewards"].includes(screen)) {
      accountDataLoader
        .loadProfile()
        .then(() => {
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
        "2.0.0-beta.35",
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
    build: "2.0.0-beta.35",
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
    return labels[reason] || "Savaş tamamlandı";
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
      victory: ["GALİBİYET", "DEVRE ÜSTÜNLÜĞÜ SENİN"],
      defeat: ["MAĞLUBİYET", "DEVREN SAVAŞ DIŞI KALDI"],
      draw: ["BERABERLİK", "İKİ DEVRE DE AYAKTA KALDI"],
      pending: ["Maç Sonucu", "Sonuç hazırlanıyor"],
    };
    const [title, status] = labels[outcome] || labels.pending;
    if (hero) hero.dataset.outcome = outcome;
    if (titleEl) titleEl.textContent = title;
    if (outcomeEl) outcomeEl.textContent = status;
  }

  function setAnalysisValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
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
    setBattleResultHero("pending");
    const resultEl = document.getElementById("battle-result-summary");
    if (resultEl) {
      resultEl.hidden = true;
      resultEl.textContent = "Sonuç bekleniyor";
    }
    const analysis = document.getElementById("battle-analysis-summary");
    if (analysis) analysis.hidden = true;
    const details = document.getElementById("post-match-analysis");
    if (details) details.open = false;
  }

  function presentOnlineMatchFinished() {
    const result = pvpState.finalResult;
    if (!result) return false;

    boosterOfferOpen = false;
    selectedBoosterId = null;
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    if (boosterStatusEl) boosterStatusEl.textContent = "Maç tamamlandı";
    renderBoosterOptions();

    const outcome = onlineOutcome(result);
    const firstPresentation =
      onlineFinishPresentedSessionId !== result.session_id;
    onlineFinishPresentedSessionId = result.session_id;
    document.body.dataset.onlineFinished = "true";
    setBattleResultHero(outcome);

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        `Maç tamamlandı · ${
          outcome === "victory"
            ? "Galibiyet"
            : outcome === "defeat"
              ? "Mağlubiyet"
              : "Beraberlik"
        }`;
    }

    if (firstPresentation) {
      if (gridshardAudioDirector) {
        gridshardAudioDirector.setState(
          outcome === "victory"
            ? "victory"
            : outcome === "defeat"
              ? "defeat"
              : "pool"
        );
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
      presentTierCelebration(
        result.payload?.progression?.tier_advanced
      );
    }

    renderPostMatchSummary();
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
  const matchmakingCancel =
    document.getElementById(
      "matchmaking-cancel"
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
            : null
        );
    if (!cue) return;
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
    normalizeInitialBattleModuleIds();
    const selectedModules = [...initialBattleModuleIds];

    if (selectedModules.length < 2) {
      throw new Error(
        "Başlangıç devresi için Jeneratör ve Çekirdek dışında tam 2 modül seçilmelidir."
      );
    }

    return [
      {
        instanceId: "core-1",
        definitionId: "core",
        x: 2,
        y: 2,
        direction: "up",
      },
      {
        instanceId: "generator-1",
        definitionId: "generator",
        x: 2,
        y: 3,
        direction: "up",
      },
      {
        instanceId:
          selectedModules[0],
        definitionId:
          clientDefinitionId(
            selectedModules[0]
          ),
        x: 1,
        y: 3,
        direction: "right",
      },
      {
        instanceId:
          selectedModules[1],
        definitionId:
          clientDefinitionId(
            selectedModules[1]
          ),
        x: 3,
        y: 3,
        direction: "left",
      },
    ];
  }

  const matchmakingStatusEl =
    document.getElementById(
      "matchmaking-status"
    );

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

    matchmakingStatusEl.textContent =
      (
        matchmakingState.opponentType === "ai"
        && ["matched", "connecting", "readying", "battle"].includes(status)
          ? "Eşleştirme: 10 sn doldu · AI rakip devraldı"
          : labels[status]
      )
      || `Eşleştirme: ${status}`;

    matchmakingStatusEl.dataset.status =
      status;

    document.body.dataset.onlineStatus =
      status;
    document.body.dataset.opponentType =
      matchmakingState.opponentType || "unknown";

    if (poolConfirmEl) {
      const matching = status === "matchmaking";
      poolConfirmEl.dataset.matchmaking =
        String(matching);
      if (matching) {
        poolConfirmEl.disabled = true;
        poolConfirmEl.textContent = "Eşleştiriliyor";
      } else {
        poolConfirmEl.dataset.matchmaking = "false";
        if (["idle", "cancelled", "error"].includes(status)) {
          poolConfirmEl.disabled = !battlePoolSelection.isComplete();
          poolConfirmEl.textContent = "Savaş";
        }
      }
    }

    if (gridshardAudioDirector) {
      if (["matchmaking", "matched", "connecting", "readying"].includes(status)) {
        gridshardAudioDirector.setState("matchmaking");
      } else if (status === "battle") {
        gridshardAudioDirector.setState("battle");
      }
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
      resetBattleResultPresentation();
      destructionFxPlayed.clear();
      snapshotModuleHp.clear();
      clearTapSelection({ rerender: false });
      mobileBattleController.reset();
      if (document.documentElement) document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    renderPlayModeUi();
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
    if (!playReadinessGate.canPlay()) {
      const reason = playReadinessGate.labelTr()
        + ". Eşleştirme bağlantısı henüz hazır değil.";
      showPlayError("matchmaking", reason);
      return { ok:false, reason };
    }
    const matchmakingStartedAtMs =
      Date.now();

    nextBoosterOfferIndex = 0;
    boosterOfferOpen = false;
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    selectedBoosterId = null;
    if (boosterStatusEl) {
      boosterStatusEl.textContent = "İlk güçlendirici 30. saniyede";
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
        "2.0.0-beta.35",
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
  const shelf = document.getElementById("module-shelf");
  const mobileSelectedModuleEl = document.getElementById("mobile-selected-module");
  const mobileRotateModuleEl = document.getElementById("mobile-rotate-module");
  const mobileReturnModuleEl = document.getElementById("mobile-return-module");
  const mobileCancelPlacementEl = document.getElementById("mobile-cancel-placement");
  const mobileBattleController = new GridshardMobileBattleController();
  let tapSelectedModuleId = null;
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
  const presetGalleryEl =
    document.getElementById(
      "battle-pool-preset-gallery"
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
          || "2.0.0-beta.35";
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

  const BOARD_CELLS = [
    [1,0],[2,0],[3,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],
    [1,4],[2,4],[3,4],
  ];
  const CORE_POSITION = { x: 2, y: 2 };
  const GATE_KEYS = new Set(["2,1","3,2","2,3","1,2"]);
const SPECIAL_CELL_INFO = {
  "2,0": { css: "attack-cell", label: "Saldırı Hücresi", bonus: "+%15 saldırı" },
  "4,2": { css: "defense-cell", label: "Savunma Hücresi", bonus: "+%15 dayanıklılık" },
  "2,4": { css: "energy-cell", label: "Enerji Hücresi", bonus: "+%15 enerji etkinliği" },
  "0,2": { css: "cooling-cell", label: "Soğutma Hücresi", bonus: "-%20 ısı oluşumu" },
  "1,1": { css: "repair-cell", label: "Onarım Hücresi", bonus: "+%20 onarım" },
  "3,3": { css: "signal-cell", label: "Sinyal Hücresi", bonus: "-%15 bekleme süresi" },
};
  let battleStartedAt = performance.now();
  gridshardAudioDirector =
    typeof GridshardAudioDirector === "function"
      ? new GridshardAudioDirector()
      : null;

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
      {id:"enemy-battery",definitionId:"battery",name:"Batarya",hp:120,maxHp:120,position:{x:2,y:0},kind:"energy",isPowered:true,energyReceived:0,energyRequired:0},
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
      if (
        report.status
        === "review_ready"
      ) {
        balanceStatus.textContent=
          "İlk denge incelemesi için yeterli manuel örnek oluştu. Öneriler otomatik uygulanmaz.";
      } else {
        balanceStatus.textContent=
          `Denge incelemesi için ${report.battles_remaining || 0} gerçek maç daha gerekli.`;
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
      `${localBattleMetrics.credits_spent} DK`);
    set("local-report-forfeit-penalty",
      `${localBattleMetrics.forfeit_credit_penalty || 0} DK`);
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
        clientDefinitionId(
          module.instanceId
        ) === definitionId
    ) || null;
  }

  function localServerClientModuleId(
    serverModule
  ) {
    const exact=
      client.modules.get(
        serverModule?.instance_id
      );
    if (exact) {
      return exact.instanceId;
    }
    return clientModuleForDefinitionId(
      serverModule?.definition_id
    )?.instanceId || null;
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
        event?.type === "modules_swapped"
        && data.player_id === participantPlayerId
      ) {
        logClientMessage("İki aktif modül yer değiştirdi; portlar otomatik bağlandı.");
        triggerGridshardCue("port_connect");
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
      ports:Array.isArray(enemyGenerator?.ports)
        ? enemyGenerator.ports
        : undefined,
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
          ports:Array.isArray(module.ports)
            ? module.ports
            : undefined,
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

    syncBoosterOfferFromSnapshot(
      snapshot.players[participantPlayerId]
    );

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
    syncBoosterOfferFromSnapshot(player);
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
      });
    }

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
        "Yerel AI savaşı sunucu BattleEngine otoritesine bağlandı."
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

  function resetLocalBattleState() {
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
    selectedBoosterId =
      null;

    client.applyServerEconomyState({
      circuitCredits:200,
    });
    client.clearPendingPlacements();
    client.updateElapsedMs(0);

    const initialSetupByInstanceId = new Map(
      buildInitialOnlineSetup().map((item) => [item.instanceId, item])
    );

    for (
      const module
      of client.modules.values()
    ) {
      const isCore =
        module.instanceId
        === "core-1";
      const isGenerator =
        module.instanceId
        === "generator-1";
      const initialSetup = initialSetupByInstanceId.get(module.instanceId);
      const initialConfig = initialSetup
        ? {
            position:{x:initialSetup.x,y:initialSetup.y},
            direction:initialSetup.direction,
          }
        : null;
      const selectedForBattle =
        battlePoolSelection.selected.has(
          module.instanceId
        );
      const startActive =
        isCore
        || isGenerator
        || Boolean(
          initialConfig
          && selectedForBattle
        );

      client.applyServerModuleState({
        instanceId:
          module.instanceId,
        hp:
          module.maxHp,
        status:
          startActive
            ? "active"
            : "reserve",
        position:
          isCore
            ? {x:2,y:2}
            : (
                isGenerator
                  ? {x:2,y:3}
                  : (
                      initialConfig
                        ? initialConfig.position
                        : null
                    )
              ),
        direction:
          initialConfig
            ? initialConfig.direction
            : "up",
        energyReceived:0,
        isPowered:true,
        storedEnergy:0,
        heat:0,
      });
    }

    commandLog.length = 0;
    resetBattleResultPresentation();
    destructionFxPlayed.clear();
    snapshotModuleHp.clear();

    document.body.dataset.localFinished =
      "false";

    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        "Maç: Tek Oyunculu · Yerel AI";
    }
    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        "Savaş devam ediyor";
    }
    if (matchmakingStatusEl) {
      matchmakingStatusEl.textContent =
        "Rakip: Yerel AI";
      matchmakingStatusEl.dataset.status =
        "local";
    }

    boosterStatusEl.textContent =
      "İlk güçlendirici 30. saniyede";
    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        "battle"
      );
    }

    createEnemyBoard();
    renderEnemyBoard();
    renderBoosterOptions();
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
      });

    renderLocalBattleReport();
    loadCumulativeManualReport();

    logClientMessage(
      "Tek Oyunculu Test Maçı başladı. Modül Rafı 15. saniyede açılır."
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

    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        "Maç: Tek Oyunculu · Savaş Havuzu hazırlanıyor";
    }

    renderBattlePoolSelection();
    renderPlayModeUi();
  }

  function fillBattlePoolForQuickTest() {
    const ids=[
      "generator-1",
      ...selectablePoolModules
        .map(
          (module)=>
            module.instanceId
        )
        .filter(
          (moduleId)=>
            moduleId
            !== "generator-1"
        )
        .slice(
          0,
          battlePoolSelection
            .requiredSize
          - 1
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
        "Savaş alanına giriş başarılı · 18/18 test havuzu hazır · Yerel AI aktif";
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

    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        "pool"
      );
    }

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
      gridshardAudioDirector
        .setState(
          "critical_core"
        );
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
    } else if (
      gridshardAudioDirector.state
      === "critical_core"
    ) {
      gridshardAudioDirector
        .setState(
          "battle"
        );
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
      }/${core?.maxHp || 300}`
      + ` · Jeneratör ${
        Math.max(
          0,
          Number(
            generator?.hp || 0
          )
        )
      }/${generator?.maxHp || 150}`;

    if (playerBoardStatusEl) {
      playerBoardStatusEl.textContent=
        `Çekirdek ${Math.max(0,Number(core?.hp||0))}/${core?.maxHp||300} · Jeneratör ${Math.max(0,Number(generator?.hp||0))}/${generator?.maxHp||150}`;
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
    document.body.dataset.localFinished =
      "true";
    stopLocalServerPolling();

    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        won
          ? "victory"
          : "defeat"
      );
    }

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
      battleResultSummaryEl.textContent =
        finishReason === "player_forfeit"
          ? `KAYBETTİN · Savaşı bıraktın · ${forfeitPenalty} DK ceza`
          : (
              won
                ? "KAZANDIN · Rakip Çekirdek yok edildi"
                : "KAYBETTİN · Çekirdeğin yok edildi"
            );
    }

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        finishReason === "player_forfeit"
          ? "Maç tamamlandı · Savaşı bıraktın"
          : (
              won
                ? "Maç tamamlandı · Galibiyet"
                : "Maç tamamlandı · Mağlubiyet"
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
    if (!element) return;

    const className =
      kind === "shield"
        ? "fx-shield"
        : (
            kind === "sabotage"
              ? "fx-sabotage"
              : "fx-hit"
          );

    element.classList.remove(
      "fx-hit",
      "fx-shield",
      "fx-sabotage"
    );
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(
      () => element.classList.remove(className),
      520
    );
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
    const source=document.querySelector(
      `[data-module-id="${sourceModuleId}"]`
    );
    const target=document.querySelector(
      `[data-module-id="${targetModuleId}"]`
    );
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
    let target = document.querySelector(
      `[data-module-id="${moduleId}"]`
    );
    if (!target && core) {
      target = document.querySelector(
        moduleId.startsWith("enemy-")
          ? ".duel-enemy-side .core-cell"
          : ".duel-player-side .core-cell"
      );
    }
    if (
      !layer
      || !target
      || typeof layer.getBoundingClientRect !== "function"
      || typeof target.getBoundingClientRect !== "function"
    ) {
      return false;
    }

    const layerRect = layer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const effect = document.createElement("span");
    effect.className = core
      ? "module-explosion core-explosion"
      : "module-explosion";
    effect.dataset.category = core
      ? "core"
      : String(target.dataset.category || "module");
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
      || client.elapsedMs < 5000
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
        + `<span>${selectedCount}/18 modül · ${clean ? "Kayıtla aynı" : "Değiştirildi"} · ${freshness}</span>`;
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
          ? { ...preset, last_used_at_ms: markUsed ? Date.now() : preset.last_used_at_ms }
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
        "Henüz hazır havuz yok. 18/18 seçim yaptıktan sonra ilk loadout'unu kaydet.";
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
    renderQuickLoadoutGallery();
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
          "Kaydetmek için havuz 18/18 olmalı.";
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
      enerji:"Enerji",
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
        "Devrenin başlangıç enerji kaynağıdır. "
        + "Bir Çekirdek kapısında başlar; savaş sırasında dört Çekirdek kapısı arasında taşınabilir fakat rafa alınamaz."
      );
    }

    return (
      `${module.strategicRole}. `
      + `${module.portCount} bağlantı portu bulunur; `
      + `Canı ${module.maxHp}, savaş içi yerleştirme maliyeti `
      + `${module.circuitCreditCost} DK'dır.`
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
      `${catalog?.circuit_credit_cost ?? module.circuitCreditCost} DK`;
    poolDetailPortsEl.textContent =
      `${catalog?.port_count ?? module.portCount}`;

    renderBattlePoolModulePreview(
      module,
      catalog
    );

    setTextOrDash(
      poolDetailEnergyGenerationEl,
      catalog
        ? `${catalog.energy_generation || 0}/sn`
        : "Sunucu kataloğu bekleniyor"
    );
    setTextOrDash(
      poolDetailEnergyConsumptionEl,
      catalog
        ? `${catalog.energy_consumption || 0}/sn`
        : "Sunucu kataloğu bekleniyor"
    );
    setTextOrDash(
      poolDetailDamageEl,
      catalog
        ? (
            catalog.base_damage > 0
              ? `${catalog.base_damage}`
              : "Doğrudan hasar yok"
          )
        : "Sunucu kataloğu bekleniyor"
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
              : "Bekleme yok"
          )
        : "Sunucu kataloğu bekleniyor"
    );

    poolDetailRoleEl.textContent =
      localizedUiText(
        catalog?.strategic_role
        || module.strategicRole
      );

    poolDetailDescriptionEl.textContent =
      localizedUiText(
        catalog?.description_tr
        || fallbackPoolModuleDescription(
          module
        )
      );

    if (poolDetailEffectsEl) {
      poolDetailEffectsEl.innerHTML =
        "";

      const lines =
        catalog?.effect_lines
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
    return battlePoolSelection
      .selectedIds()
      .filter((instanceId) => instanceId !== "generator-1");
  }

  function normalizeInitialBattleModuleIds() {
    const available = availableInitialBattleModuleIds();
    const availableSet = new Set(available);
    initialBattleModuleIds = initialBattleModuleIds
      .filter((instanceId, index, ids) =>
        availableSet.has(instanceId)
        && ids.indexOf(instanceId) === index
      )
      .slice(0, 2);

    const preferred = [
      "laser-1",
      "pulse-cannon-1",
      ...available,
    ];
    for (const instanceId of preferred) {
      if (
        initialBattleModuleIds.length >= 2
        || !availableSet.has(instanceId)
        || initialBattleModuleIds.includes(instanceId)
      ) {
        continue;
      }
      initialBattleModuleIds.push(instanceId);
    }
    return [...initialBattleModuleIds];
  }

  function renderInitialModulePicker() {
    const root = document.getElementById("initial-module-picker");
    const status = document.getElementById("initial-module-status");
    if (!root) return;

    const available = availableInitialBattleModuleIds();
    normalizeInitialBattleModuleIds();
    root.innerHTML = "";

    for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
      const label = document.createElement("label");
      label.className = "initial-module-slot";
      label.textContent = localizedUiText(`Seçim ${slotIndex + 1}`);
      const select = document.createElement("select");
      select.className = "initial-module-choice";
      select.dataset.slot = String(slotIndex);
      select.disabled = available.length < 2;

      for (const instanceId of available) {
        const module = client.modules.get(instanceId);
        if (!module) continue;
        const option = document.createElement("option");
        option.value = instanceId;
        option.textContent = localizedUiText(module.nameTr);
        option.selected = initialBattleModuleIds[slotIndex] === instanceId;
        option.disabled = initialBattleModuleIds.some(
          (selectedId, index) => index !== slotIndex && selectedId === instanceId
        );
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        initialBattleModuleIds[slotIndex] = select.value;
        normalizeInitialBattleModuleIds();
        renderInitialModulePicker();
      });
      label.appendChild(select);
      root.appendChild(label);
    }

    if (status) {
      status.textContent = localizedUiText(
        initialBattleModuleIds.length === 2
          ? "2 / 2 oyuncu modülü seçili · değişiklikler sınırsız"
          : `${initialBattleModuleIds.length} / 2 · önce Savaş Havuzunu tamamla`
      );
      status.dataset.ready = String(initialBattleModuleIds.length === 2);
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
        "Savaş";
    } else if (
      activePlayMode
      === "online"
    ) {
      const isMatchmaking =
        document.body
          .dataset.onlineStatus
        === "matchmaking";
      poolConfirmEl.dataset.matchmaking =
        String(isMatchmaking);
      if (isMatchmaking) {
        poolConfirmEl.disabled = true;
        poolConfirmEl.textContent =
          "Eşleştiriliyor";
      } else {
        poolConfirmEl.textContent =
          "Savaş";
      }
    } else {
      poolConfirmEl.dataset.matchmaking = "false";
      poolConfirmEl.textContent =
        "Önce Maç Modu Seç";
    }

    renderBattlePoolDetail();
    renderActivePresetState();
  }

  function boosterOfferDueAtMs(index) {
    return BOOSTER_FIRST_OFFER_MS + index * BOOSTER_OFFER_INTERVAL_MS;
  }

  function updateBoosterOfferAvailability() {
    if (localServerAuthoritative) return;
    const dueAtMs = boosterOfferDueAtMs(nextBoosterOfferIndex);
    if (!boosterOfferOpen && client.elapsedMs >= dueAtMs) {
      boosterOfferOpen = true;
      selectedBoosterId = null;
      boosterStatusEl.textContent = "HAZIR · 3 seçenekten 1'ini seç";
      renderBoosterOptions();
    } else if (!boosterOfferOpen) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((dueAtMs - client.elapsedMs) / 1000)
      );
      boosterStatusEl.textContent = `${remainingSeconds} sn sonra açılır`;
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
    const portCount = Number(
      catalog?.port_count
      ?? module.portCount
      ?? 0
    );
    const card = document.createElement("div");
    card.className = "pool-detail-preview-card";
    card.dataset.category = module.category || "";

    const icon = document.createElement("span");
    icon.className = "module-icon pool-detail-preview-icon";
    icon.textContent = moduleIconFor(module);
    icon.setAttribute("aria-hidden", "true");

    const portLabel = document.createElement("small");
    portLabel.className = "pool-detail-preview-port-label";
    portLabel.textContent = `${portCount} ${localizedUiText("Port")}`;

    card.append(icon, portLabel);
    for (const side of poolPreviewPortDirections(portCount)) {
      const port = document.createElement("span");
      port.className = `port-dot port-${side}`;
      port.setAttribute("aria-hidden", "true");
      card.appendChild(port);
    }

    poolDetailPreviewEl.setAttribute(
      "aria-label",
      `${localizedUiText(module.nameTr)} · ${portCount} ${localizedUiText("Port")}`
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
      serverBoosterEligibleTargets = new Map(
        Object.entries(offer.eligible_target_module_ids || {}).map(
          ([boosterId, moduleIds]) => [
            boosterId,
            new Set((moduleIds || []).map(String)),
          ]
        )
      );
      boosterOfferOpen = true;
      if (offerChanged) selectedBoosterId = null;
      boosterStatusEl.textContent = selectedBoosterId
        ? "Hedef modül seç"
        : "HAZIR · 3 seçenekten 1'ini seç";
      renderBoosterOptions();
      return;
    }

    const offerWasVisible =
      serverBoosterOfferId !== null
      || boosterOfferOpen;
    serverBoosterOfferId = null;
    serverBoosterEligibleTargets = new Map();
    boosterOfferOpen = false;
    selectedBoosterId = null;
    boosterStatusEl.textContent = `${Math.max(
      0,
      Math.ceil((boosterOfferDueAtMs(nextBoosterOfferIndex) - client.elapsedMs) / 1000)
    )} sn sonra açılır`;
    if (offerWasVisible) {
      renderBoosterOptions();
    }
  }

  function renderBoosterOptions() {
    if (boosterPanelEl) {
      boosterPanelEl.dataset.state = !boosterOfferOpen
        ? "locked"
        : (selectedBoosterId ? "target" : "ready");
    }
    boosterOptionsEl.innerHTML = "";
    for (const booster of BOOSTER_OPTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "booster-option";
      button.textContent = booster.nameTr;
      button.title = booster.descriptionTr;
      button.disabled = !boosterOfferOpen;
      button.draggable = boosterOfferOpen;
      if (selectedBoosterId === booster.id) button.classList.add("selected");
      button.addEventListener("click", () => {
        if (!boosterOfferOpen) return;
        selectedBoosterId = booster.id;
        trackBattleUiInteraction(
          `booster_select:${booster.id}`,
          "booster"
        );
        boosterStatusEl.textContent = selectedBoosterId ? "Hedef modül seç" : "Seçim bekleniyor";
        renderBoosterOptions();
        renderBoard();
      });
      button.addEventListener("dragstart", (event) => {
        if (!boosterOfferOpen) {
          event.preventDefault();
          return;
        }
        selectedBoosterId = booster.id;
        event.dataTransfer?.setData(
          "application/x-gridshard-booster",
          booster.id
        );
        event.dataTransfer?.setData("text/plain", booster.id);
        boosterStatusEl.textContent = "Uygun, parlayan modüle bırak";
        renderBoosterOptions();
        renderBoard();
      });
      boosterOptionsEl.appendChild(button);
    }
  }

  function isBoosterTargetEligible(module, boosterId = selectedBoosterId) {
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
    return true;
  }

  function tryApplySelectedBooster(module) {
    if (!selectedBoosterId) return false;
    const booster = BOOSTER_OPTIONS.find(item => item.id === selectedBoosterId);
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
    boosterStatusEl.textContent = "Sunucu hedefi doğruluyor…";
    renderLog();
    renderBoosterOptions();
    renderBoard();
    return true;
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
          "Çekirdek";
        cell.title =
          "Çekirdek: sabit ana hedef";
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
        cell.dataset.cellLabel =
          "Kapı";
        cell.title =
          "Çekirdek Kapısı: başlangıç bağlantı noktası";
      } else if (SPECIAL_CELL_INFO[key]) {
        const special = SPECIAL_CELL_INFO[key];
        cell.classList.add("special-cell", special.css);
        cell.title = `${special.label}: ${special.bonus}`;
        cell.dataset.specialLabel = special.label;
        cell.dataset.specialBonus = special.bonus;
      } else {
        cell.dataset.cellLabel =
          `Hücre ${x},${y}`;
      }

      cell.addEventListener("dragover", (event) => {
        if (
          localBattleFinished
          || cell.classList.contains("core-cell")
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
        cell.dataset.cellLabel="Rakip Çekirdek";
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
        cell.dataset.cellLabel="Kapı";
      } else if (SPECIAL_CELL_INFO[key]) {
        cell.classList.add("special-cell",SPECIAL_CELL_INFO[key].css);
        cell.dataset.specialLabel=SPECIAL_CELL_INFO[key].label;
      }
      enemyBoard.appendChild(cell);
    }
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
          ? "There is no reciprocal port chain from this module to the Generator."
          : "Bu modülden Jeneratöre uzanan karşılıklı bir port zinciri yok.",
        insufficient_supply:english
          ? `The port chain is valid, but supply is insufficient. Required ${required.toFixed(1)} U, received ${received.toFixed(1)} U.`
          : `Port zinciri geçerli ancak üretim yetersiz. İhtiyaç ${required.toFixed(1)} Ü, gelen ${received.toFixed(1)} Ü.`,
      };
      const message=reasons[powerReason]
        || (english
          ? "This module is not receiving usable energy. Check reciprocal ports and total generation."
          : "Bu modül kullanılabilir enerji almıyor. Karşılıklı portları ve toplam üretimi kontrol edin.");
      card.classList.add("energy-disconnected");
      const tooltip=document.createElement("span");
      tooltip.className="power-state-tooltip";
      tooltip.textContent=message;
      tooltip.setAttribute("role","tooltip");
      card.appendChild(tooltip);
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
    }
    const place=(x,y,card)=>{
      const cell=enemyBoard.querySelector(`.board-cell[data-x="${x}"][data-y="${y}"]`);
      if (cell) {
        cell.dataset.occupied="true";
        cell.appendChild(card);
      }
    };
    place(2,2,enemyCard("enemy-core","Çekirdek",mockEnemyCoreHp,300,"core"));
    place(
      mockEnemyGeneratorPosition.x,
      mockEnemyGeneratorPosition.y,
      enemyCard(
        "enemy-generator",
        "Jeneratör",
        mockEnemyGeneratorHp,
        150,
        "energy",
        mockEnemyGeneratorPower
      )
    );
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
      enemyBoardStatusEl.textContent=`Çekirdek ${Math.max(0,mockEnemyCoreHp)}/300 · Jeneratör ${Math.max(0,mockEnemyGeneratorHp)}/150 · Modül ${enemyLivingModules().length}`;
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

    globalThis.GridshardI18n
      ?.apply(normalized);
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

  async function saveSettingsForm() {
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
              : "Derece puanı değişmedi"
          )
        : "DP hesaplanıyor";

    const xpText =
      progression
        ? `+${progression.xpAwarded} XP`
        : "XP hesaplanıyor";

    resultEl.hidden = false;
    resultEl.textContent =
      `${progression?.matchLabelTr || "Maç"} · ${finishReasonLabel(result.finish_reason)} · ${ratingText} · ${xpText}`;
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

    el.textContent =
      `${view.displayName} · `
      + `Seviye ${view.level} · `
      + `${view.leagueNameTr} · `
      + `${view.rating} Derece Puanı · `
      + `${view.experience} XP`;

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
      lobbyPlayerDetails.textContent=
        `${view.engagement?.equipped_title || "Devre Çırağı"} · Seviye ${view.level} · Lig: ${view.leagueNameTr} · ${view.rating} RP`;
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

  function renderStatisticsSummary() {
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

  function renderShelf() {
    const unlocked =
      client.isShelfUnlocked()
      && !localBattleFinished;
    const reserveModules=[
      ...client.modules.values(),
    ].filter(
      (module) =>
        module.status === "reserve"
        && battlePoolSelection
          .selected
          .has(
            module.instanceId
          )
    );
    const shelfSignature=JSON.stringify({
      unlocked,
      finished:localBattleFinished,
      selected:tapSelectedModuleId,
      modules:reserveModules.map(
        (module) => [
          module.instanceId,
          module.hp,
          module.maxHp,
          module.category,
        ]
      ),
    });
    if (
      shelfSignature
      === renderedShelfSignature
    ) {
      return;
    }
    renderedShelfSignature=
      shelfSignature;
    shelf.innerHTML = "";

    for (
      const category
      of POOL_CATEGORY_ORDER
    ) {
      const modules=
        reserveModules.filter(
          (module) =>
            module.category
            === category
        );
      if (!modules.length) {
        continue;
      }

      const group=
        document.createElement(
          "details"
        );
      group.className=
        "shelf-category-group";
      group.dataset.category=
        category;
      group.open =
        !collapsedShelfCategories
          .has(category);
      group.addEventListener(
        "toggle",
        () => {
          if (group.open) {
            collapsedShelfCategories
              .delete(category);
          } else {
            collapsedShelfCategories
              .add(category);
          }
        }
      );
      const title=
        document.createElement(
          "summary"
        );
      title.className=
        "shelf-category-title";
      title.textContent=
        `${poolCategoryLabel(category)} · ${modules.length}`;
      const list =
        document.createElement(
          "div"
        );
      list.className =
        "shelf-category-list";
      group.append(title, list);

      for (const module of modules) {
        const card=
          createModuleCard(module);
        const tooltip =
          document.createElement(
            "span"
          );
        tooltip.className =
          "shelf-module-tooltip";
        tooltip.textContent =
          `${localizedUiText("Devre Kredisi")}: ${module.circuitCreditCost} DK · `
          + `${localizedUiText("Port")}: ${module.portCount}`;
        tooltip.setAttribute(
          "role",
          "tooltip"
        );
        card.appendChild(tooltip);
        card.title =
          `${localizedUiText(module.nameTr)} · `
          + `${localizedUiText("Devre Kredisi")}: ${module.circuitCreditCost} DK · `
          + `${localizedUiText("Port")}: ${module.portCount}`;
        if (!unlocked) {
          card.classList.add(
            "locked"
          );
        }
        list.appendChild(card);
      }
      shelf.appendChild(group);
    }

    shelf.ondragover = (event) =>
      event.preventDefault();
    shelf.ondrop = (event) => {
      event.preventDefault();
      if (localBattleFinished) {
        logClientMessage(
          "Maç bittikten sonra modüller hareket ettirilemez."
        );
        return;
      }
      const result = client.dropOnShelf();
      if (!result.ok) {
        logClientMessage(result.reason);
      }
    };
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
      selectedBoosterId,
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
      }
    );
  }

  function moduleIconFor(module) {
    return GridshardModuleCardView.iconFor(module);
  }

  function createModuleCard(module) {
    const card = document.createElement("div");
    card.className = "module-card";
    card.draggable =
      !localBattleFinished
      && module.movable !== false;
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

    for (const side of modulePorts(module)) {
      const port =
        document.createElement("span");
      port.className =
        `port-dot port-${side}`;
      port.title =
        `Port: ${side}`;
      card.appendChild(port);
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
    }

    if (
      selectedBoosterId
      && module.status === "active"
    ) {
      card.classList.add(
        isBoosterTargetEligible(module)
          ? "booster-target"
          : "booster-target-ineligible"
      );
    }

    card.addEventListener("dragover", (event) => {
      if (!selectedBoosterId) return;
      event.preventDefault();
      event.stopPropagation();
      if (isBoosterTargetEligible(module)) {
        card.classList.add("booster-drop-ready");
      }
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("booster-drop-ready");
    });
    card.addEventListener("drop", (event) => {
      if (!selectedBoosterId) return;
      event.preventDefault();
      event.stopPropagation();
      card.classList.remove("booster-drop-ready");
      tryApplySelectedBooster(module);
    });

    card.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        if (
          tryApplySelectedBooster(
            module
          )
        ) {
          return;
        }
        if (module.status === "reserve") {
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
      }
    );

    card.addEventListener(
      "dragend",
      () => {
        client.cancelDrag();
      }
    );

    return card;
  }

  function applyMockServerCommand(command) {
    // Alpha.6: Bu katman yalnızca UI demosu için sahte sunucu cevabıdır.
    // Gerçek Devre Kredisi otoritesi Python savaş motorundadır.
    if (localBattleFinished) {
      logClientMessage(
        "Maç tamamlandı; savaş komutları kilitli."
      );
      return;
    }

    const moduleCost = (moduleId) =>
      client.requireModule(moduleId).circuitCreditCost || 0;

    let cost = 0;
    if (command.kind === "place_module") {
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
        `Yetersiz Devre Kredisi: gerekli ${cost} DK, mevcut ${mockServerCredits} DK.`
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

    if (command.kind === "place_module") {
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
    creditEl.textContent = `Devre Kredisi: ${client.circuitCredits} DK`;
    const lobbyCredits = document.getElementById("lobby-circuit-credits");
    if (lobbyCredits) lobbyCredits.textContent = `${client.circuitCredits} DK`;
  }

  function flashInsufficientCredits() {
    creditEl.classList.add("credit-insufficient");
    window.setTimeout(() => {
      creditEl.classList.remove("credit-insufficient");
    }, 700);
  }


  function renderCapacity() {
    const limit = client.maxActiveModules();
    const active = client.activeModuleCount();

    if (limit === null) {
      capacityEl.textContent = `Aktif Modül: ${active} / Başlangıç`;
      capacityEl.classList.remove("capacity-opened");
      previousCapacity = null;
      return;
    }

    capacityEl.textContent = `Aktif Modül: ${active} / ${limit}`;

    if (previousCapacity !== null && limit > previousCapacity) {
      capacityEl.classList.add("capacity-opened");
      logClientMessage(`Aktif modül kapasitesi ${limit} oldu.`);
      window.setTimeout(() => {
        capacityEl.classList.remove("capacity-opened");
      }, 900);
    }

    previousCapacity = limit;
  }

  function renderLockState() {
    if (localBattleFinished) {
      lockLabel.dataset.active =
        "false";
      lockLabel.textContent =
        "Maç Bitti";
      shelfHelp.textContent =
        "Savaş tamamlandı; modül hareketleri ve port dönüşleri kilitlendi.";
      return;
    }

    const unlocked = client.isShelfUnlocked();
    lockLabel.dataset.active = String(unlocked);
    lockLabel.textContent = unlocked ? "Aktif" : "Kilitli";

    if (unlocked) {
      shelfHelp.textContent = "Modülü sürükle veya seçip hedef hücreye dokun.";
    } else {
      const remaining = Math.max(0, 15000 - client.elapsedMs);
      shelfHelp.textContent =
        `Modül müdahalesi ${(remaining / 1000).toFixed(1)} sn sonra açılacak.`;
    }
  }

  function renderLog() {
    logEl.textContent = commandLog
      .slice(-12)
      .map((entry) => {
        if (entry.kind === "attack_performed") {
          const raw = entry.rawDamage ?? entry.damage;
          const reduced = entry.reducedDamage ?? 0;
          const defense = entry.defenseType ?? "Yok";
          return `${entry.attacker} → ${entry.target}: Ham ${raw} · Azaltılan ${reduced} · Final ${entry.damage} · Savunma ${defense}`;
        }
        if (entry.kind === "damage_reflected") {
          return `Yansıtılan hasar: ${entry.damage}`;
        }
        if (entry.kind === "module_repaired") {
          return `Onarım: +${entry.repair} Can`;
        }
        if (entry.kind === "module_cooled") {
          return `Soğutma: Isı ${entry.heatBefore} → ${entry.heatAfter}`;
        }
        if (entry.kind === "module_overclocked") {
          return `Aşırı Hızlandırma: Isı ${entry.heatAfter}`;
        }
        if (entry.kind === "module_heat_changed") {
          return `Isı: ${entry.heatBefore} → ${entry.heatAfter}`;
        }
        if (entry.kind === "module_overheated") {
          return `AŞIRI YÜK: Isı ${entry.heat} · ${entry.selfDamage} öz hasar`;
        }
        if (entry.kind === "attack_skipped_overheated") {
          return `Saldırı engellendi: kritik ısı`;
        }
        if (entry.kind === "sabotage_applied") {
          return `Sabotaj: ${entry.effectId || entry.effect_id} · ${entry.durationMs || entry.duration_ms} ms`;
        }
        if (entry.kind === "virus_damage") {
          return `Virüs: ${entry.damage} hasar`;
        }
        if (entry.kind === "support_skipped_jammed") {
          return `Destek engellendi: Sinyal Bozma`;
        }
        if (entry.kind === "sabotage_resisted") {
          return `Sabotaj direnci: ${entry.baseDurationMs || entry.base_duration_ms} ms → ${entry.effectiveDurationMs || entry.effective_duration_ms} ms`;
        }
        if (entry.kind === "sabotage_blocked") {
          return `Sabotaj engellendi`;
        }
        if (entry.kind === "sabotage_cleansed") {
          return `Sabotaj temizlendi: ${entry.effectId || entry.effect_id}`;
        }
        if (entry.kind === "sabotage_duration_reduced") {
          return `Sabotaj süresi azaltıldı: -${entry.reductionMs || entry.reduction_ms} ms`;
        }
        if (entry.kind === "battle_finished") {
          if (entry.isDraw || entry.is_draw) return `MAÇ BİTTİ: Berabere`;
          return `MAÇ BİTTİ: Kazanan ${entry.winnerPlayerId || entry.winner_player_id}`;
        }
        if (entry.kind === "module_damaged") {
          return `${entry.moduleName || "Modül"}: ${entry.damage} hasar · Can ${entry.hp}`;
        }
        return JSON.stringify(entry);
      })
      .join("\n");
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
    if (!localBattleFinished) {
      updateBoosterOfferAvailability();
    }

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
            "Yeni hazır havuz için mevcut 18/18 seçimini isimlendirip kaydet.";
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

  if (matchmakingCancel) {
    matchmakingCancel.addEventListener(
      "click",
      async () => {
        await onlinePlay.cancel();
        poolConfirmEl.disabled = false;
        poolConfirmEl.textContent =
          "Savaş";
        clearPlayError();
        renderOnlinePlayStatus(
          "cancelled"
        );
      }
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
    ]
  ) {
    const control=
      document.getElementById(
        controlId
      );
    if (control) {
      control.addEventListener(
        control.type === "range"
          ? "input"
          : "change",
        previewAudioSettingsFromControls
      );
    }
  }

  const settingsSaveButton =
    document.getElementById(
      "settings-save"
    );
  if (settingsSaveButton) {
    settingsSaveButton.addEventListener(
      "click",
      saveSettingsForm
    );
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
        if (activePlayMode === "local") {
          prepareLocalMatch();
        } else {
          pvpConnection.disconnect();
          prepareOnlineMatch();
        }
        renderPlayModeUi();
      }
    );
  }

  const rematchButton =
    document.getElementById(
      "rematch-button"
    );

  if (rematchButton) {
    rematchButton.addEventListener(
      "click",
      async () => {
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
        true;
      poolConfirmEl.dataset.matchmaking =
        "true";
      poolConfirmEl.textContent =
        "Eşleştiriliyor";

      const result =
        await startRealOnlineMatch();

      const stillMatching =
        result.ok
        && onlinePlay.status
          === "matchmaking";
      poolConfirmEl.dataset.matchmaking =
        String(stillMatching);
      poolConfirmEl.textContent =
        stillMatching
          ? "Eşleştiriliyor"
          : "Savaş";

      if (!result.ok) {
        poolConfirmEl.disabled =
          false;
      }
    }
  );

  if (
    typeof window
    !== "undefined"
  ) {
    window.__GRIDSHARD_TEST_API={
      startQuickLocalBattle,
      fillBattlePoolForQuickTest,
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
      }),
    };
  }

  tutorialController = new GridshardTutorialController({
    root: document.getElementById("tutorial-overlay"),
    storageKey: "gridshard.tutorial.v1",
    steps: [
      {
        title: "Hazır devreyle başla",
        body: "Dengeli 18 modüllük Başlangıç Devresi ilk maçın için hazır. Tek dokunuşla yükleyebilirsin.",
        target: "#battle-pool-panel",
        action: "load-starter-pool",
        actionLabel: "Başlangıç Devresini Yükle",
        hint: "Havuz 18/18 olduğunda savaş düğmesi açılır.",
      },
      {
        title: "Savaşı başlat",
        body: "Önce çevrimiçi rakip aranır; 10 saniye içinde bulunamazsa sunucudaki AI oyuncu aynı maç protokolünü devralır.",
        target: "#battle-pool-confirm",
        action: "start-matchmaking",
        actionLabel: "Savaş",
        hint: "Çekirdek ve jeneratör sabittir; diğer iki başlangıç modülünü sen seçersin.",
      },
      {
        title: "Dokun, sonra yerleştir",
        body: "15. saniyede Modül Rafını aç. Bir modüle dokun, boş hücreyi seç; Döndür ve Rafa Al düğmeleriyle düzenle.",
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
