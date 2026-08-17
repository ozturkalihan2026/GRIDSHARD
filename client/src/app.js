(() => {
  "use strict";

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
    direction: "up",
  }));

  const commandLog = [];
  const META_STATUS = "M1-M6 tamamlandı";
  const COMPETITIVE_STATUS = "M7 Simülasyon aktif";
  const BALANCE_STATUS = "Eşit modül + counter doğrulandı";
  const AI_STATUS = "Adaptif AI + rekabetçi denge doğrulandı";
  const PVP_STATUS = "Operasyon snapshot audit aktif";

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
  const battlePoolSelection = new BattlePoolSelection({
    selectableModuleIds: selectablePoolModules.map((module) => module.instanceId),
    requiredSize: 18,
    requiredModuleIds: ["generator-1"],
  });

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

  function renderAppScreen() {
    const current = appRouter.currentScreen;

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
      showPlayError(
        "websocket",
        playReadinessGate.labelTr()
        + ". Hazırlık kontrollerini yeniden dene."
      );
      appRouter.goMenu();
      renderAppScreen();
      return {
        ok: false,
        reason:
          "Sunucu hazır değil.",
      };
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
        "2.0.0-alpha.119",
      expectedProtocolVersion: 1,
    });
  const playReadinessGate =
    new RelayPlayReadinessGate({
      serverBootGate,
      participantBootstrap,
      participantContinuity,
      launchReadinessState,
    });



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
    build: "2.0.0-alpha.119",
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
  const telemetryStatus =
    document.getElementById(
      "telemetry-send-status"
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
        "2.0.0-alpha.119",
      build:
        "web-test-alpha.119",
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
      playButton.disabled =
        !playReadinessGate.canPlay();
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
            view.started
              ? "Başlatıldı"
              : "Başlatılmadı"
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
    loadPreflightStatus();
    loadWebTestRunStatus();
    loadOperationStatus();

    const launch =
      result.ok
        ? await loadLaunchReadiness()
        : {
            ok:false,
          };

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

  renderAppScreen();
  renderConnectionStatus(
    pvpConnection.status
  );
  checkServerReadiness();

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
  const startedAt = performance.now();
  let previousCapacity = null;
  let mockServerCredits = 200;
  let mockServerPassiveSeconds = 0;
  let mockEnemyCoreHp = 300;
  let mockEnemyGeneratorHp = 150;
  let mockEnemyModuleHp = 140;
  let previousCombatSecond = -1;

  function renderBattlePoolSelection() {
    poolSelectionEl.innerHTML = "";

    for (const module of selectablePoolModules) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pool-choice";
      button.textContent = `${module.nameTr} · ${module.category}`;

      if (battlePoolSelection.selected.has(module.instanceId)) {
        button.classList.add("selected");
      }

      if (
        battlePoolSelection
          .requiredModuleIds
          .has(module.instanceId)
      ) {
        button.classList.add(
          "required"
        );
        button.title =
          "Başlangıç devresi için zorunlu";
      }

      button.addEventListener("click", () => {
        const result = battlePoolSelection.toggle(module.instanceId);
        if (!result.ok) logClientMessage(result.reason);
        renderBattlePoolSelection();
      });

      poolSelectionEl.appendChild(button);
    }

    poolCountEl.textContent =
      `${battlePoolSelection.selected.size} / ${battlePoolSelection.requiredSize}`;
    poolConfirmEl.disabled = !battlePoolSelection.isComplete();
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
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
      } else if (SPECIAL_CELL_INFO[key]) {
        const special = SPECIAL_CELL_INFO[key];
        cell.classList.add("special-cell", special.css);
        cell.title = `${special.label}: ${special.bonus}`;
        cell.dataset.specialLabel = special.label;
        cell.dataset.specialBonus = special.bonus;
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

    const result =
      await accountDataLoader
        .saveSettings({
          sound_volume:
            Number(sound?.value ?? 100),
          music_volume:
            Number(music?.value ?? 70),
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
      logClientMessage(
        result.reason
      );
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
    card.draggable = true;
    card.dataset.moduleId = module.instanceId;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = module.nameTr;

    const meta = document.createElement("span");
    meta.className = "meta";
    const costText = module.circuitCreditCost > 0
      ? ` · ${module.circuitCreditCost} DK`
      : "";
    const energyText =
      module.status === "active"
        ? ` · E ${Number(module.energyReceived || 0).toFixed(1)}/${Number(module.energyRequired || 0).toFixed(1)}${module.isPowered ? "" : " · ENERJİSİZ"}`
        : "";
    const supportLabel = supportLabelForModule(module);
    const supportText = supportLabel ? ` · ${supportLabel}` : "";
    const sabotageLabel = sabotageLabelForModule(module);
    const sabotageText = sabotageLabel ? ` · ${sabotageLabel}` : "";
    const heatText = module.status === "active"
      ? ` · ${heatStatusLabel(module)}`
      : "";
    meta.textContent =
      `Can ${module.hp}/${module.maxHp}${costText}${energyText}${supportText}${sabotageText}${heatText}`;

    card.append(name, meta);

    for (const side of modulePorts(module)) {
      const port = document.createElement("span");
      port.className = `port-dot port-${side}`;
      port.title = `Port: ${side}`;
      card.appendChild(port);
    }

    if (
      module.status === "active" &&
      !module.isPowered &&
      Number(module.energyRequired || 0) > 0
    ) {
      card.classList.add("energy-disconnected");
    }

    if (selectedBoosterId && module.status === "active") {
      card.classList.add("booster-target");
    }
    card.addEventListener("click", () => {
      tryApplySelectedBooster(module);
    });

    card.addEventListener("dragstart", (event) => {
      const result = client.beginDrag(module.instanceId);
      if (!result.ok) {
        event.preventDefault();
        logClientMessage(result.reason);
        return;
      }

      if (module.status === "reserve") {
        telemetryDispatcher
          .trackModuleShelfUsed({
            module_id:
              module.instanceId,
            elapsed_ms:
              client.elapsedMs,
          });
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", module.instanceId);
    });

    card.addEventListener("dragend", () => {
      client.cancelDrag();
    });

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

    if (command.kind === "place_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "active",
        position: { x: command.payload.x, y: command.payload.y },
      });
    } else if (command.kind === "move_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        position: { x: command.payload.x, y: command.payload.y },
      });
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
    if (mockEnemyCoreHp > 0) {
      battleResultSummaryEl.textContent = "Maç sürüyor";
      return;
    }
    battleResultSummaryEl.textContent = "KAZANDIN · Rakip Çekirdek yok edildi";
  }

  function updateMockCombat() {
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
    const elapsedMs = now - startedAt;
    client.updateElapsedMs(elapsedMs);
    updateMockServerPassiveCredits(elapsedMs);

    const seconds = elapsedMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds - minutes * 60;
    timeEl.textContent =
      `${String(minutes).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;

    renderLockState();
    renderCapacity();
    updateMockEnergy();
    updateMockCombat();
    renderCredits();
    updateBoosterOfferAvailability();

    if (Math.floor(elapsedMs / 250) !== Math.floor((elapsedMs - 16) / 250)) {
      renderShelf();
      renderBoard();
    }

    requestAnimationFrame(updateClock);
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
        !battlePoolSelection.isComplete()
      ) {
        return;
      }

      commandLog.push({
        atMs: client.elapsedMs,
        kind: "set_battle_pool",
        payload: {
          module_instance_ids:
            battlePoolSelection
              .selectedIds(),
          module_definition_ids:
            selectedBattlePoolDefinitionIds(),
        },
      });
      renderLog();

      poolConfirmEl.disabled = true;
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
        poolConfirmEl.disabled = false;
      }
    }
  );

  renderBattlePoolSelection();
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
