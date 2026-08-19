(() => {
  "use strict";

  const PORT_COUNT_BY_NAME = {
    "Çekirdek":4,
    "Jeneratör":3,
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
  const PVP_STATUS = "GRIDSHARD Beta.17 · Engine Regresyonu + Audio Mix V2 + Hızlı Loadout";



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
  const BOOSTER_FIRST_OFFER_MS = 85000;
  const BOOSTER_OFFER_INTERVAL_MS = 10000;
  let nextBoosterOfferIndex = 0;
  let boosterOfferOpen = false;

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
  const battlePoolSelection = new BattlePoolSelection({
    selectableModuleIds: selectablePoolModules.map((module) => module.instanceId),
    requiredSize: 18,
    requiredModuleIds: ["generator-1"],
  });
  let focusedPoolModuleId =
    "generator-1";
  let battlePoolPresets = [];
  let activeBattlePoolPresetName = null;
  let activeBattlePoolPresetBaseline = [];
  let quickLoadoutFilter = "all";

  const client = new RelayBattleClient({
    modules: moduleDefinitions,
    unlockAtMs: 15000,
    circuitCredits: 200,
    emitCommand(command) {
      const pvpEnvelope =
        buildPvPCommandEnvelope(command);

      commandLog.push({
        atMs: client.elapsedMs,
        ...command,
        pvpEnvelope,
      });

      if (
        typeof pvpConnection !== "undefined"
        && pvpConnection.status === "open"
      ) {
        pvpConnection.sendEnvelope(
          pvpEnvelope
        );
      } else {
        applyMockServerCommand(command);
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

  let gridshardAudioDirector = null;

  document.body.dataset.appScreen =
    appRouter.currentScreen;

  function renderAppScreen() {
    const current = appRouter.currentScreen;

    document.body.dataset.appScreen =
      current;

    for (
      const panel
      of document.querySelectorAll(
        "[data-screen-panel]"
      )
    ) {
      panel.hidden =
        panel.dataset.screenPanel !== current;
    }

    const menu = document.getElementById(
      "main-menu-panel"
    );
    if (menu) {
      menu.hidden =
        current !== RelayAppScreen.MENU;
    }

    const backButton = document.getElementById(
      "return-main-menu"
    );
    if (backButton) {
      backButton.hidden =
        current === RelayAppScreen.MENU;
    }

    const label = document.getElementById(
      "current-screen-label"
    );
    if (label) {
      const names = {
        menu: "Ana Menü",
        play: "Oyna",
        profile: "Profil",
        statistics: "İstatistikler",
        settings: "Ayarlar",
      };
      label.textContent =
        names[current] || current;
    }

    if (
      gridshardAudioDirector
    ) {
      if (current === RelayAppScreen.MENU) {
        gridshardAudioDirector.setState(
          "menu"
        );
      } else if (current === RelayAppScreen.PLAY) {
        gridshardAudioDirector.setState(
          activePlayMode === "idle"
            ? "pool"
            : "battle"
        );
      }
    }

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
      // Tek Oyunculu Test Maçı, operasyon/online hazırlık kapıları
      // tamamlanmasa bile Oyna ekranından erişilebilir kalır.
      // Online PvP hazırlığı ayrıca kendi girişinde engellenir.
      logClientMessage(
        playReadinessGate.labelTr()
        + ". Tek Oyunculu Test Maçı kullanılabilir; Online PvP için hazırlık kontrolleri gerekir."
      );
    }

    renderAppScreen();

    if (screen === "profile") {
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
        "2.0.0-beta.17",
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
    build: "2.0.0-beta.17",
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

    finishWebTestSessionAudit(
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

    renderPostMatchSummary();
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
          ) {
            onlinePlay
              ?.markBattleStarted();
          }

          if (
            _message?.type
              === "match_finished"
            || (
              pvpState.phase
                === "finished"
              && pvpState.finalResult
            )
          ) {
            syncFinishedMatch();
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

  function selectedBattlePoolDefinitionIds() {
    return battlePoolSelection
      .selectedIds()
      .map(clientDefinitionId);
  }

  function buildInitialOnlineSetup() {
    const selectedModules =
      battlePoolSelection
        .selectedIds()
        .filter(
          (instanceId) =>
            instanceId
            !== "generator-1"
        );

    if (selectedModules.length < 2) {
      throw new Error(
        "Başlangıç devresi için Jeneratör dışında en az 2 modül seçilmelidir."
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
        x: 2,
        y: 1,
        direction: "down",
      },
      {
        instanceId:
          selectedModules[1],
        definitionId:
          clientDefinitionId(
            selectedModules[1]
          ),
        x: 1,
        y: 1,
        direction: "right",
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
      labels[status]
      || `Eşleştirme: ${status}`;

    matchmakingStatusEl.dataset.status =
      status;

    document.body.dataset.onlineStatus =
      status;
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
        },
    });

  let currentAuditEventId = null;
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
        currentTestRunId =
          auditTestRunId;
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

    trackMatchmakingStart();

    // Audit operasyon içindir; başarısızlığı eşleştirmeyi durdurmaz.
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
      && pvpState.sessionId
    ) {
      auditPromise.then(
        (audit) => {
          if (
            audit.ok
            && audit.auditEventId
          ) {
            bindWebTestSessionAudit(
              audit.auditEventId,
              pvpState.sessionId
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
        "2.0.0-beta.17",
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
  const shelf = document.getElementById("module-shelf");
  const timeEl = document.getElementById("battle-time");
  const creditEl = document.getElementById("credit-indicator");
  const combatSummaryEl = document.getElementById("combat-summary");
  const battleResultSummaryEl = document.getElementById("battle-result-summary");
  const capacityEl = document.getElementById("capacity-indicator");
  const lockLabel = document.getElementById("shelf-lock-label");
  const shelfHelp = document.getElementById("shelf-help");
  const logEl = document.getElementById("event-log");
  const boosterOptionsEl = document.getElementById("booster-options");
  const boosterStatusEl = document.getElementById("booster-status");
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

  renderAppScreen();
  renderConnectionStatus(
    pvpConnection.status
  );
  checkServerReadiness();

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

  let activePlayMode = "idle";
  let localBattleStarted = false;
  let localBattleFinished = false;
  let localEnemyAttackSecond = -1;
  let localBattleMetrics = null;

  let webTestSamplingTimer = null;
  let activeWebTestRunId = null;
  let previousCapacity = null;
  let mockServerCredits = 200;
  let mockServerPassiveSeconds = 0;
  let mockEnemyCoreHp = 300;
  let mockEnemyGeneratorHp = 150;
  let mockEnemyModuleHp = 140;
  let previousCombatSecond = -1;

  function setActivePlayMode(mode) {
    activePlayMode = mode;
    document.body.dataset.playMode =
      mode;

    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        mode === "online"
          ? "matchmaking"
          : (
              mode === "local"
                ? (
                    localBattleStarted
                      ? "battle"
                      : "pool"
                  )
                : "pool"
            )
      );
    }

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
      && document.body
        .dataset.onlineStatus
        === "battle";
    const localBattle =
      local
      && localBattleStarted;

    const modePanel =
      document.getElementById(
        "play-mode-panel"
      );
    if (modePanel) {
      modePanel.hidden = false;
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
    if (
      recoveryPanel
      && !online
    ) {
      recoveryPanel.hidden =
        true;
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

  function resetLocalBattleState() {
    pvpConnection.disconnect();

    localBattleStarted =
      true;
    document.body.dataset.localStatus =
      "battle";

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
    mockServerCredits =
      200;
    mockServerPassiveSeconds =
      0;
    mockEnemyCoreHp =
      300;
    mockEnemyGeneratorHp =
      150;
    mockEnemyModuleHp =
      140;
    nextBoosterOfferIndex =
      0;
    boosterOfferOpen =
      false;
    selectedBoosterId =
      null;

    client.applyServerEconomyState({
      circuitCredits:200,
    });
    client.updateElapsedMs(0);

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

      client.applyServerModuleState({
        instanceId:
          module.instanceId,
        hp:
          module.maxHp,
        status:
          (
            isCore
            || isGenerator
          )
            ? "active"
            : "reserve",
        position:
          isCore
            ? {x:2,y:2}
            : (
                isGenerator
                  ? {x:2,y:3}
                  : null
              ),
        direction:"up",
        energyReceived:0,
        isPowered:true,
        storedEnergy:0,
        heat:0,
      });
    }

    commandLog.length = 0;

    if (battleResultSummaryEl) {
      battleResultSummaryEl.hidden =
        true;
      battleResultSummaryEl.textContent =
        "Sonuç bekleniyor";
    }

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
      "İlk güçlendirici 85. saniyede";
    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        "battle"
      );
    }

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
    localBattleStarted =
      false;
    localBattleFinished =
      false;
    document.body.dataset.localStatus =
      "setup";
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

  function startLocalPlayableMatch() {
    setActivePlayMode(
      "local"
    );
    resetLocalBattleState();
    renderPlayModeUi();
  }

  function prepareOnlineMatch() {
    if (
      !playReadinessGate.canPlay()
    ) {
      showPlayError(
        "websocket",
        playReadinessGate.labelTr()
        + ". Online PvP için hazırlık kontrollerini yeniden dene."
      );
      return;
    }

    localBattleStarted =
      false;
    setActivePlayMode(
      "online"
    );
    document.body.dataset.onlineStatus =
      "idle";

    if (activeMatchModeEl) {
      activeMatchModeEl.textContent =
        "Maç: Online PvP";
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

    syncCriticalCoreAudioState();
  }

  function finishLocalBattle({
    won,
  }) {
    if (localBattleFinished) {
      return;
    }

    localBattleFinished =
      true;
    document.body.dataset.localFinished =
      "true";

    if (gridshardAudioDirector) {
      gridshardAudioDirector.setState(
        won
          ? "victory"
          : "defeat"
      );
    }

    if (battleResultSummaryEl) {
      battleResultSummaryEl.hidden =
        false;
      battleResultSummaryEl.textContent =
        won
          ? "KAZANDIN · Rakip Çekirdek yok edildi"
          : "KAYBETTİN · Çekirdeğin yok edildi";
    }

    if (battleStateLabelEl) {
      battleStateLabelEl.textContent =
        won
          ? "Maç tamamlandı · Galibiyet"
          : "Maç tamamlandı · Mağlubiyet";
    }

    if (localBattleMetrics) {
      localBattleMetrics.duration_ms =
        Math.max(0,Math.round(client.elapsedMs));
      localBattleMetrics.won = Boolean(won);

      telemetryDispatcher
        .trackLocalBattleCompleted({
          ...localBattleMetrics,
          generator_gate_visits:
            {...localBattleMetrics.generator_gate_visits},
        });
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

  function updateLocalEnemyCombat() {
    if (
      activePlayMode !== "local"
      || localBattleFinished
      || client.elapsedMs < 5000
    ) {
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
          a.instanceId.localeCompare(
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

    pulseBattleFx(
      target.instanceId,
      shieldActive
        ? "shield"
        : "hit"
    );
    triggerGridshardCue(
      shieldActive
        ? "shield_hit"
        : (
            target.instanceId
            === "core-1"
              ? "core_hit"
              : "energy_transfer"
          )
    );

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

    if (
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
      presetSaveEl.disabled=false;
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
      payload.presets || [];
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
        preset.favorite
          ? "Favoriden çıkar"
          : "Favoriye ekle";
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
        payload.presets || [];
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
      if (presetStatusEl) {
        presetStatusEl.textContent=
          "Hazır havuz kaydedilemedi.";
      }
      return;
    }

    const payload=
      await response.json();
    battlePoolPresets=
      payload.presets || [];
    activeBattlePoolPresetName=
      name;
    activeBattlePoolPresetBaseline=
      [...selectedBattlePoolIdsForPreset()];
    renderPresetOptions();
    presetSelectEl.value=name;
    presetNameEl.value="";
    if (presetStatusEl) {
      presetStatusEl.textContent=
        `${name} kaydedildi.`;
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
      payload.presets || [];

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
      payload.presets || [];

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
    return labels[category]
      || category;
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
      module.nameTr;
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
      catalog?.strategic_role
      || module.strategicRole;

    poolDetailDescriptionEl.textContent =
      catalog?.description_tr
      || fallbackPoolModuleDescription(
        module
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
          line;
        poolDetailEffectsEl.appendChild(
          li
        );
      }
    }

    setTextOrDash(
      poolDetailStrongEl,
      catalog?.strong_against?.length
        ? catalog.strong_against.join(", ")
        : "Belirgin karşı üstünlük yok"
    );
    setTextOrDash(
      poolDetailWeakEl,
      catalog?.weak_against?.length
        ? catalog.weak_against.join(", ")
        : "Belirgin zayıflık yok"
    );
    setTextOrDash(
      poolDetailSynergyEl,
      catalog?.synergy_with?.length
        ? catalog.synergy_with.join(", ")
        : "Tanımlı özel sinerji yok"
    );

  }


  function createPoolCategoryGroup(
    category,
    title
  ) {
    const section =
      document.createElement(
        "section"
      );
    section.className =
      "pool-category-group";
    section.dataset.category =
      category;

    const heading =
      document.createElement(
        "h4"
      );
    heading.className =
      "pool-category-title";
    heading.textContent =
      title;

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
          )
        );

      for (const module of modules) {
        const button =
          document.createElement(
            "button"
          );
        button.type =
          "button";
        button.className =
          "pool-choice";

        const selected =
          battlePoolSelection
            .selected
            .has(
              module.instanceId
            );
        const focused =
          module.instanceId
          === focusedPoolModuleId;

        const label=
          document.createElement(
            "span"
          );
        label.className=
          "pool-choice-name";
        label.textContent=
          `${module.nameTr}`;

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
                  ? "−"
                  : "+"
              );
        selectMark.title=
          required
            ? "Zorunlu modül · çıkarılamaz"
            : (
                selected
                  ? "Havuzdan çıkar"
                  : "Havuza ekle"
              );
        selectMark.dataset.action=
          required
            ? "required"
            : (
                selected
                  ? "remove"
                  : "add"
              );
        selectMark.setAttribute(
          "aria-disabled",
          String(required)
        );

        const catalog=
          catalogForModule(
            module
          );

        button.append(
          label,
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
          poolCategoryLabel(
            module.category
          );

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
            "Başlangıç devresi için zorunlu";
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
          )
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
          "pool-selected-item";
        const chipName=
          document.createElement(
            "span"
          );
        chipName.textContent=
          module.nameTr;
        chip.appendChild(
          chipName
        );

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

    poolConfirmEl.disabled =
      !battlePoolSelection
        .isComplete();

    if (
      activePlayMode
      === "local"
    ) {
      poolConfirmEl.textContent =
        battlePoolSelection
          .isComplete()
          ? "AI ile Eşleştir ve Savaşa Başla"
          : "18 Modülü Tamamla";
    } else if (
      activePlayMode
      === "online"
    ) {
      if (
        document.body
          .dataset.onlineStatus
        !== "searching"
      ) {
        poolConfirmEl.textContent =
          battlePoolSelection
            .isComplete()
            ? "Eşleştir"
            : "18 Modülü Tamamla";
      }
    } else {
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
    if (!boosterOfferOpen && client.elapsedMs >= boosterOfferDueAtMs(nextBoosterOfferIndex)) {
      boosterOfferOpen = true;
      selectedBoosterId = null;
      boosterStatusEl.textContent = "3 seçenekten 1'ini seç";
      renderBoosterOptions();
    }
  }

  function renderBoosterOptions() {
    boosterOptionsEl.innerHTML = "";
    for (const booster of BOOSTER_OPTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "booster-option";
      button.textContent = `${booster.nameTr} · ${booster.descriptionTr}`;
      button.disabled = !boosterOfferOpen;
      if (selectedBoosterId === booster.id) button.classList.add("selected");
      button.addEventListener("click", () => {
        if (!boosterOfferOpen) return;
        selectedBoosterId = booster.id;
        boosterStatusEl.textContent = selectedBoosterId ? "Hedef modül seç" : "Seçim bekleniyor";
        renderBoosterOptions();
        renderBoard();
      });
      boosterOptionsEl.appendChild(button);
    }
  }

  function tryApplySelectedBooster(module) {
    if (!selectedBoosterId) return false;
    const booster = BOOSTER_OPTIONS.find(item => item.id === selectedBoosterId);
    if (!booster) return false;
    if (booster.targetCategories.length && !booster.targetCategories.includes(module.category)) {
      logClientMessage(`${booster.nameTr}, ${module.nameTr} modülüne uygulanamaz.`);
      return true;
    }
    commandLog.push({
      atMs: client.elapsedMs,
      kind: "apply_booster",
      payload: { booster_id: booster.id, target_module_id: module.instanceId },
    });
    selectedBoosterId = null;
    boosterOfferOpen = false;
    nextBoosterOfferIndex += 1;
    boosterStatusEl.textContent =
      `${((boosterOfferDueAtMs(nextBoosterOfferIndex) - client.elapsedMs) / 1000).toFixed(1)} sn sonra yeni hak`;
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
        if (cell.classList.contains("core-cell")) return;
        event.preventDefault();
        cell.classList.add("drag-over");
      });

      cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));

      cell.addEventListener("drop", (event) => {
        if (cell.classList.contains("core-cell")) return;
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

      board.appendChild(cell);
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
          menu:"Main Menu",
          play:"Play",
          profile:"Profile",
          statistics:"Statistics",
          settings:"Settings",
          settingsSave:"Save Settings",
          playMode:"Match Mode",
          battlePool:"Build Battle Pool",
        }
      : {
          menu:"Ana Menü",
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

    let outcome =
      result.is_draw
        ? "Beraberlik"
        : (
            result.winner_player_id
              === pvpState.playerId
              ? "Galibiyet"
              : "Mağlubiyet"
          );

    const ratingText =
      progression
        ? (
            `${progression.ratingDelta >= 0 ? "+" : ""}`
            + `${progression.ratingDelta} DP`
          )
        : "DP hesaplanıyor";

    const xpText =
      progression
        ? `+${progression.xpAwarded} XP`
        : "XP hesaplanıyor";

    resultEl.hidden = false;
    resultEl.textContent =
      `${outcome} · ${ratingText} · ${xpText}`;
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
  }

  function render() {
    renderShelf();
    renderBoard();
    renderLockState();
  }

  function renderShelf() {
    shelf.innerHTML = "";
    const unlocked = client.isShelfUnlocked();

    for (const module of client.modules.values()) {
      if (module.status !== "reserve") continue;

      if (
        !battlePoolSelection
          .selected
          .has(
            module.instanceId
          )
      ) {
        continue;
      }

      const card = createModuleCard(module);
      if (!unlocked) {
        card.classList.add("locked");
      }
      shelf.appendChild(card);
    }

    shelf.addEventListener("dragover", (event) => event.preventDefault());
    shelf.ondrop = (event) => {
      event.preventDefault();
      const result = client.dropOnShelf();
      if (!result.ok) {
        logClientMessage(result.reason);
      }
    };
  }

  function renderBoard() {
    for (const cell of board.querySelectorAll(".board-cell")) {
      cell.innerHTML = "";
    }

    for (const module of client.modules.values()) {
      if (module.status !== "active" || !module.position) continue;
      const selector =
        `.board-cell[data-x="${module.position.x}"][data-y="${module.position.y}"]`;
      const cell = board.querySelector(selector);
      if (!cell) continue;
      cell.appendChild(createModuleCard(module));
    }
  }

  function createModuleCard(module) {
    const card = document.createElement("div");
    card.className = "module-card";
    card.draggable =
      module.movable !== false;
    card.dataset.moduleId =
      module.instanceId;
    card.dataset.category =
      module.category || "";

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
    }

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

    card.append(
      name,
      stats
    );
    appendHpBar(
      card,
      module.hp,
      module.maxHp
    );
    if (meta.textContent) {
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

    if (
      selectedBoosterId
      && module.status === "active"
    ) {
      card.classList.add(
        "booster-target"
      );
    }

    card.addEventListener(
      "click",
      () => {
        tryApplySelectedBooster(
          module
        );
      }
    );

    card.addEventListener(
      "dragstart",
      (event) => {
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
    const moduleCost = (moduleId) =>
      client.requireModule(moduleId).circuitCreditCost || 0;

    let cost = 0;
    if (command.kind === "place_module") {
      cost = moduleCost(command.payload.module_id);
    } else if (command.kind === "move_module") {
      cost = 10;
    } else if (command.kind === "replace_module") {
      cost = moduleCost(command.payload.incoming_module_id);
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
      ).length * 8;

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
        module.energyReceived = 0;
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

    const currentSecond = Math.floor(client.elapsedMs / 1000);
    if (currentSecond === previousCombatSecond) return;
    previousCombatSecond = currentSecond;

    const attackers = [...client.modules.values()]
      .filter(
        (module) =>
          module.status === "active" &&
          module.category === "saldırı" &&
          module.isPowered
      )
      .sort((a, b) => a.instanceId.localeCompare(b.instanceId));

    if (!attackers.length) return;

    const attacker = attackers[0];
    const damageByName = {
      "Lazer": 12,
      "Darbe Topu": 32,
      "Ray Topu": 40,
      "Füze Fırlatıcı": 28,
      "Dron Üssü": 8,
      "Ark Topu": 20,
    };
    const damage = damageByName[attacker.nameTr] || 0;
    if (damage <= 0) return;

    let targetName = "Rakip Modül";
    if (mockEnemyModuleHp <= 0 && mockEnemyGeneratorHp > 0) {
      targetName = "Rakip Jeneratör";
    } else if (mockEnemyModuleHp <= 0 && mockEnemyGeneratorHp <= 0) {
      targetName = "Rakip Çekirdek";
    }

    const rawDamage = damage;
    let defenseType = "Yok";
    let reducedDamage = 0;
    let finalDamage = rawDamage;

    if (targetName === "Rakip Modül") {
      defenseType = "Kalkan";
      finalDamage = Math.max(0, Math.round(rawDamage * 0.65));
      reducedDamage = rawDamage - finalDamage;
    }

    if (targetName === "Rakip Modül") {
      mockEnemyModuleHp = Math.max(0, mockEnemyModuleHp - finalDamage);
    } else if (targetName === "Rakip Jeneratör") {
      mockEnemyGeneratorHp = Math.max(0, mockEnemyGeneratorHp - finalDamage);
    } else {
      mockEnemyCoreHp = Math.max(0, mockEnemyCoreHp - finalDamage);
    }

    triggerGridshardCue(
      attacker.nameTr
        .toLocaleLowerCase("tr")
        .includes("lazer")
        ? "laser_fire"
        : "energy_transfer"
    );
    if (
      targetName
      === "Rakip Çekirdek"
    ) {
      triggerGridshardCue(
        "core_hit"
      );
    }

    if (
      activePlayMode === "local"
      && localBattleMetrics
    ) {
      localBattleMetrics.damage_dealt += finalDamage;
      localBattleMetrics.player_attacks += 1;
      telemetryDispatcher.trackLocalPlayerAttack({
        attacker:attacker.nameTr,
        target:targetName,
        damage:finalDamage,
        elapsed_ms:client.elapsedMs,
      });
    }

    commandLog.push({
      atMs: client.elapsedMs,
      kind: "attack_performed",
      attacker: attacker.nameTr,
      target: targetName,
      rawDamage,
      reducedDamage,
      damage: finalDamage,
      defenseType,
    });

    combatSummaryEl.textContent =
      `Rakip: Modül ${mockEnemyModuleHp}/140 · Jeneratör ${mockEnemyGeneratorHp}/150 · Çekirdek ${mockEnemyCoreHp}/300`;

    updateMockBattleResult();
    renderLog();
  }

  function renderCredits() {
    creditEl.textContent = `Devre Kredisi: ${client.circuitCredits} DK`;
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
    const unlocked = client.isShelfUnlocked();
    lockLabel.dataset.active = String(unlocked);
    lockLabel.textContent = unlocked ? "Aktif" : "Kilitli";

    if (unlocked) {
      shelfHelp.textContent = "Modülleri sürükleyerek savaş alanına müdahale edebilirsin.";
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
      elapsedMs =
        Math.max(
          0,
          now
          - battleStartedAt
        );
      client.updateElapsedMs(
        elapsedMs
      );
      updateMockServerPassiveCredits(
        elapsedMs
      );
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
    ) {
      updateMockEnergy();
      updateMockCombat();
      updateLocalEnemyCombat();
    }

    renderCredits();
    renderPlayerCoreSummary();
    updateBoosterOfferAvailability();

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

  if (matchmakingCancel) {
    matchmakingCancel.addEventListener(
      "click",
      async () => {
        await onlinePlay.cancel();
        poolConfirmEl.disabled = false;
        poolConfirmEl.textContent =
          "Savaş Havuzunu Onayla ve Eşleş";
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
          "Yerel AI hazırlanıyor...";
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
      poolConfirmEl.textContent =
        "Eşleştirme Başlatılıyor...";

      const result =
        await startRealOnlineMatch();

      poolConfirmEl.textContent =
        result.ok
          ? (
              result.matched
                ? "Rakip Bulundu"
                : "Rakip Aranıyor..."
            )
          : "Eşleştirmeyi Yeniden Dene";

      if (!result.ok) {
        poolConfirmEl.disabled =
          false;
      }
    }
  );

  setActivePlayMode(
    "idle"
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
