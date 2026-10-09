const path = require("path");
const ROOT = path.join(__dirname, "..");
process.chdir(ROOT);
const assert = require("assert");
const asyncTests = [];
const {
  RelayBattleClient,
  BattlePoolSelection,
  MODULE_STATUS,
  MAX_ACTIVE_MODULES,
} = require("../src/relay-client.js");

function createClient() {
  const emitted = [];
  const client = new RelayBattleClient({
    modules: [
      {
        instanceId: "laser-1",
        nameTr: "Lazer",
        hp: 43,
        maxHp: 100,
        circuitCreditCost: 90,
        status: MODULE_STATUS.RESERVE,
        position: null,
      },
      {
        instanceId: "shield-1",
        nameTr: "Kalkan",
        hp: 140,
        maxHp: 140,
        circuitCreditCost: 100,
        status: MODULE_STATUS.ACTIVE,
        position: { x: 2, y: 2 },
      },
    ],
    circuitCredits: 200,
    emitCommand(command) {
      emitted.push(command);
    },
  });
  return { client, emitted };
}

{
  const { client } = createClient();
  client.updateElapsedMs(30000);
  assert.strictEqual(client.maxActiveModules(), 15);
  assert.strictEqual(client.activeModuleCount(), 1);
}

{
  const emitted = [];
  const modules = [
    "core", "armor", "laser", "pulse", "shield", "battery",
  ].map((id, index) => ({
    instanceId: `${id}-1`,
    nameTr: id,
    status: index < 4 ? MODULE_STATUS.ACTIVE : MODULE_STATUS.RESERVE,
    position: index < 4 ? { x: index, y: 1 } : null,
  }));
  const battle = new RelayBattleClient({
    modules,
    circuitCredits: 1000,
    emitCommand(command) { emitted.push(command); },
  });

  battle.updateElapsedMs(0);
  for (let index = 0; index < 11; index += 1) {
    assert.strictEqual(battle.deployDefinition("shield", 0).ok, true);
  }
  assert.strictEqual(battle.pendingPlacementCount(), 11);
  const blockedPending = battle.deployDefinition("shield", 0);
  assert.strictEqual(blockedPending.ok, false);
  assert.ok(blockedPending.reason.includes("15/15"));
  assert.strictEqual(emitted.length, 11);
  assert.strictEqual(emitted[0].kind, "deploy_module");
}

{
  const { client } = createClient();
  assert.strictEqual(client.circuitCredits, 200);
  client.applyServerEconomyState({ circuitCredits: 137 });
  assert.strictEqual(client.circuitCredits, 137);
}

{
  const { client } = createClient();
  assert.strictEqual(client.requireModule("laser-1").circuitCreditCost, 90);
  assert.strictEqual(client.requireModule("shield-1").circuitCreditCost, 100);
}



{
  const fs = require("fs");
  const appSource = fs.readFileSync(path.join(ROOT,"src/canon-data.js"),"utf8");
  for (const name of ["Güçlendirici", "Darbe Topu", "Zırh", "EMP"]) {
    assert.ok(appSource.includes(`"${name}"`));
  }
}

{
  const fs = require("fs");
  const canonSource = fs.readFileSync(path.join(ROOT,"src/canon-data.js"),"utf8");
  const definitionIds = [
    "laser",
    "shield",
    "battery",
    "amplifier",
    "cooler",
    "repair",
    "pulse_cannon",
    "armor",
    "emp",
  ];
  for (const definitionId of definitionIds) {
    assert.ok(canonSource.includes(`"id": "${definitionId}"`));
  }
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/canon-data.js"),"utf8");
  for (const name of ["Kapasitör","Ray Topu","Yansıtıcı","Bariyer","Hedefleme Bilgisayarı","Sinyal Bozucu"]) {
    assert.ok(src.includes(`"${name}"`));
  }
}


{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/canon-data.js"),"utf8");
  for (const name of ["Füze Fırlatıcı","Dron Üssü","Ark Topu","Aşırı Hızlandırıcı","Virüs","Kesici"]) {
    assert.ok(src.includes(`"${name}"`));
  }
}


{
  const selectable = Array.from({ length: 24 }, (_, i) => `mod-${i + 1}`);
  const pool = new BattlePoolSelection({ selectableModuleIds: selectable, requiredSize: 6 });
  for (const id of selectable.slice(0, 6)) assert.strictEqual(pool.toggle(id).ok, true);
  assert.strictEqual(pool.isComplete(), true);
  assert.strictEqual(pool.selectedIds().length, 6);
}
{
  const selectable = Array.from({ length: 24 }, (_, i) => `mod-${i + 1}`);
  const pool = new BattlePoolSelection({ selectableModuleIds: selectable, requiredSize: 6 });
  for (const id of selectable.slice(0, 6)) pool.toggle(id);
  assert.strictEqual(pool.toggle(selectable[6]).ok, false);
}
{
  const pool = new BattlePoolSelection({ selectableModuleIds: ["a","b"], requiredSize: 1 });
  assert.strictEqual(pool.toggle("core-1").ok, false);
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("Array.from({length: 15}"));
  assert.ok(src.includes("core-cell"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(!src.includes("cellPlacementRejection"));
  assert.ok(src.includes("playerCellDebris"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("deployDefinition"));
  assert.ok(src.includes('"deploy_module"'));
  assert.ok(src.includes("createDeckModuleCard"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(src.includes("ENERJİSİZ"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(!src.includes("PORT_COUNT_BY_NAME"));
  assert.ok(!src.includes("modulePorts"));
  assert.ok(!src.includes("areConnected"));
  assert.ok(src.includes("energy-disconnected"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(src.includes("attack_performed"));
  assert.ok(src.includes("Rakip Çekirdek"));
  assert.ok(src.includes("hasar"));
}

{
  const fs = require("fs");
  const appSrc = fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const cssSrc = fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");
  const htmlSrc = fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(appSrc.includes("id:`enemy-${module.instance_id}`"));
  assert.ok(appSrc.includes("function serverModuleDomId"));
  assert.ok(appSrc.includes("? `enemy-${serverModule.instance_id}`"));
  assert.ok(/data\.attacker_player_id\s*===\s*data\.target_player_id/.test(appSrc));
  assert.ok(cssSrc.includes(
    'body[data-app-screen="play"][data-play-mode="online"]:not([data-online-status="battle"])'
  ));
  assert.ok(htmlSrc.includes('id="battle-pool-confirm" type="button" disabled>Savaş</button>'));
  assert.ok(!htmlSrc.includes('id="battle-pool-confirm" type="button" disabled>Eşleştir'));
  assert.ok(appSrc.includes("function isOnlineMatchmakingCancelable"));
  assert.ok(appSrc.includes('localizedUiText("İptal Et")'));
  assert.ok(appSrc.includes("presentOnlineMatchFinished"));
  assert.ok(appSrc.includes("pvpState.reset();"));
  assert.ok(appSrc.includes("onlinePlay.reset();"));
  assert.ok(appSrc.includes("emitModuleExplosion"));
  assert.ok(htmlSrc.includes('id="battle-analysis-summary"'));
  assert.ok(cssSrc.includes(".core-explosion"));
  assert.ok(cssSrc.includes('data-matchmaking="true"'));
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("Azaltılan"));
  assert.ok(src.includes("Savunma ${defense}"));
  assert.ok(src.includes("Yansıtılan hasar"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("supportLabelForModule"));
  assert.ok(src.includes("Tüm saldırılara paylaşılan hasar desteği"));
  assert.ok(src.includes("Tüm saldırılara paylaşılan hız desteği"));
  assert.ok(!src.includes('return "Hasar +%15"'));
  assert.ok(!src.includes('return "Cooldown -%15"'));
  assert.ok(src.includes("En ağır saldırıya ısı karşılığında hız ve hasar"));
  assert.ok(src.includes("Aşırı Hızlandırma"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("heatStatusLabel"));
  assert.ok(src.includes("YÜKSEK ISI"));
  assert.ok(src.includes("AŞIRI ISI"));
  assert.ok(src.includes("AŞIRI YÜK"));
  assert.ok(src.includes("Saldırı engellendi: kritik ısı"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("sabotageLabelForModule"));
  assert.ok(src.includes("Enerji Kesme"));
  assert.ok(src.includes("Destek Susturma"));
  assert.ok(src.includes("Periyodik Hasar"));
  assert.ok(src.includes("Üretim -%30"));
  assert.ok(src.includes("Hat Kesme"));
  assert.ok(src.includes("Virüs:"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("Sabotaj direnci"));
  assert.ok(src.includes("Sabotaj engellendi"));
  assert.ok(src.includes("Sabotaj temizlendi"));
  assert.ok(src.includes("Sabotaj süresi azaltıldı"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("KAZANDIN"));
  assert.ok(src.includes("MAÇ BİTTİ"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
}

{
  const {
    RelayPvPClientState,
    PVP_PHASE,
  } = require("../src/relay-client.js");

  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  assert.strictEqual(pvp.phase, PVP_PHASE.IDLE);
  pvp.markConnected();
  assert.strictEqual(pvp.phase, PVP_PHASE.LOBBY);

  const lobbyResult = pvp.applyServerEnvelope({
    version: 1,
    type: "lobby_state",
    payload: {
      status: "waiting",
      players: [
        {
          player_id: "a",
          setup_submitted: false,
          ready: false,
        },
      ],
    },
  });
  assert.strictEqual(lobbyResult.ok, true);
  assert.strictEqual(pvp.phase, PVP_PHASE.SETUP);
}

{
  const { RelayPvPClientState } = require("../src/relay-client.js");
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  const setup = pvp.buildSetupMessage({
    battlePoolIds: Array.from({ length: 18 }, (_, i) => `m${i}`),
    initialModules: [
      {
        instanceId: "a-core",
        definitionId: "core",
        x: 2,
        y: 2,
        direction: "up",
      },
    ],
  });

  assert.strictEqual(setup.type, "submit_setup");
  assert.strictEqual(setup.payload.battle_pool_ids.length, 18);
  assert.strictEqual(
    setup.payload.initial_modules[0].instance_id,
    "a-core"
  );
}

{
  const { RelayPvPClientState } = require("../src/relay-client.js");
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  const first = pvp.buildCommandMessage({
    kind: "deploy_module",
    payload: { definition_id: "laser" },
  });
  const second = pvp.buildCommandMessage({
    kind: "deploy_module",
    payload: { definition_id: "shield" },
  });

  assert.strictEqual(first.payload.sequence, 1);
  assert.strictEqual(second.payload.sequence, 2);
  assert.strictEqual(first.player_id, "a");
}

{
  const {
    RelayPvPClientState,
    RelayBattleClient,
    PVP_PHASE,
  } = require("../src/relay-client.js");

  const battle = new RelayBattleClient({
    modules: [
      {
        instanceId: "a-core",
        nameTr: "Çekirdek",
        hp: 300,
        maxHp: 300,
        status: "active",
        position: { x: 2, y: 2 },
      },
    ],
    circuitCredits: 0,
    emitCommand() {},
  });

  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
    battleClient: battle,
  });

  pvp.applyServerEnvelope({
    version: 1,
    type: "snapshot",
    payload: {
      session_id: "m",
      viewer_player_id: "a",
      status: "running",
      tick: 150,
      snapshot_revision: 150,
      elapsed_ms: 15000,
      players: {
        a: {
          circuit_credits: 240,
          modules: [
            {
              instance_id: "a-core",
              definition_id: "core",
              status: "active",
              hp: 250,
              max_hp: 300,
              x: 2,
              y: 2,
              direction: "up",
              is_powered: true,
              heat: 5,
            },
          ],
        },
      },
    },
  });

  assert.strictEqual(pvp.phase, PVP_PHASE.BATTLE);
  assert.strictEqual(battle.elapsedMs, 15000);
  assert.strictEqual(battle.circuitCredits, 240);
  assert.strictEqual(battle.requireModule("a-core").hp, 250);
}

{
  const {
    RelayPvPClientState,
    PVP_PHASE,
  } = require("../src/relay-client.js");
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  pvp.applyServerEnvelope({
    version: 1,
    type: "match_finished",
    payload: {
      session_id: "m",
      status: "finished",
      winner_player_id: "a",
      is_draw: false,
      finish_reason: "core_destroyed",
      result_summary: {},
    },
  });

  assert.strictEqual(pvp.phase, PVP_PHASE.FINISHED);
  assert.strictEqual(pvp.finalResult.winner_player_id, "a");
  assert.strictEqual(pvp.connected, false);

  assert.strictEqual(pvp.reset(), PVP_PHASE.IDLE);
  assert.strictEqual(pvp.sessionId, null);
  assert.strictEqual(pvp.finalResult, null);
  assert.strictEqual(pvp.snapshot, null);
}

{
  const {
    RelayPvPClientState,
    PVP_PHASE,
  } = require("../src/relay-client.js");
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });
  pvp.commandSequence = 2;
  pvp.markDisconnected();

  pvp.applyServerEnvelope({
    version: 1,
    type: "reconnect_state",
    payload: {
      last_command_sequence: 7,
      event_cursor: 12,
      snapshot: {
        session_id: "m",
        viewer_player_id: "a",
        status: "finished",
        snapshot_revision: 20,
        players: {},
        winner_player_id: null,
        loser_player_id: null,
        is_draw: true,
        finish_reason: "simultaneous_core_destroyed",
        finished_at_ms: 180000,
        result_summary: {},
      },
      events: [],
      final_result: {
        status: "finished",
        is_draw: true,
      },
    },
  });

  assert.strictEqual(pvp.commandSequence, 7);
  assert.strictEqual(pvp.eventCursor, 12);
  assert.strictEqual(pvp.phase, PVP_PHASE.FINISHED);
}

{
  const fs=require("fs");
  const src=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(src.includes("buildPvPCommandEnvelope"));
  assert.ok(src.includes("new GridshardBattlePresentationQueue"));
  assert.ok(!src.includes("function applyPvPServerEnvelope")); // Removed unused per-message renderer.
}

{
  const {
    RelayProfileClientState,
  } = require("../src/relay-client.js");

  const state = new RelayProfileClientState();
  state.applyProfile({
    player_id: "a",
    display_name: "Alihan",
    level: 3,
    experience: 2500,
    experience_into_level: 500,
    experience_to_next_level: 500,
    rating: 1200,
    league_name_tr: "Altın",
    cosmetics: {
      unlocked_badge_ids: ["season_champion"],
      unlocked_rank_trophy_ids: ["season_first"],
    },
    preferred_battle_pool_ids: Array.from(
      { length: 18 },
      (_, i) => `m${i}`
    ),
    engagement: {
      season_id: "core_awakening_s0",
      current_tier: 2,
      daily_missions: [{ id: "complete_battles", progress: 1 }],
      reward_track: [{ tier: 1, claimed: true }],
      unlocked_titles: ["Devre Çırağı"],
    },
  });

  const view = state.viewModel();

  assert.strictEqual(view.displayName, "Alihan");
  assert.strictEqual(view.level, 3);
  assert.strictEqual(view.leagueNameTr, "Altın");
  assert.strictEqual(view.battlePoolIds.length, 18);
  assert.strictEqual(view.engagement.current_tier, 2);
  assert.strictEqual(view.engagement.dailyMissions.length, 1);
  assert.deepStrictEqual(view.cosmetics.unlockedBadgeIds, ["season_champion"]);
  assert.deepStrictEqual(view.cosmetics.unlockedRankTrophyIds, ["season_first"]);
}

{
  const {
    RelayProfileClientState,
  } = require("../src/relay-client.js");

  const state = new RelayProfileClientState();

  assert.strictEqual(
    state.setSection("İlerleme").ok,
    true
  );
  assert.strictEqual(
    state.setSection("Kozmetik").ok,
    false
  );
  assert.deepStrictEqual(
    state.allowedSections,
    ["Genel", "İlerleme", "Sezon", "Savaş Havuzu"]
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(html.includes("Oyna"));
  assert.ok(html.includes(">PROFİL<"));
  assert.ok(html.includes(">İstatistikler<"));
  assert.ok(html.includes(">Ayarlar<"));
  assert.ok(!html.includes('data-screen-panel="laboratory"'));
  assert.ok(!html.includes(">Kozmetik<"));
}

{
  const {
    RelayStatisticsClientState,
  } = require("../src/relay-client.js");

  const state =
    new RelayStatisticsClientState();

  state.applyStatistics({
    player_id: "a",
    total_matches: 10,
    wins: 6,
    losses: 3,
    draws: 1,
    win_rate: 0.6,
    average_match_duration_ms: 125000,
    total_damage_dealt: 8400,
    most_used_modules: [
      {
        definition_id: "laser",
        matches_used: 8,
      },
    ],
  });

  const view=state.viewModel();

  assert.strictEqual(view.totalMatches,10);
  assert.strictEqual(view.winRatePercent,60);
  assert.strictEqual(
    view.mostUsedModules[0].definition_id,
    "laser"
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    html.includes('id="statistics-summary-panel"')
  );
  assert.ok(
    html.includes("Sunucu otoriteli maç sonuçları")
  );
}

{
  const {
    RelaySettingsClientState,
  } = require("../src/relay-client.js");

  const state =
    new RelaySettingsClientState();

  state.applySettings({
    player_id: "a",
    sound_volume: 80,
    music_volume: 40,
    vibration_enabled: false,
    graphics_quality: "orta",
    language: "tr",
  });

  const view=state.viewModel();

  assert.strictEqual(view.soundVolume,80);
  assert.strictEqual(view.musicVolume,40);
  assert.strictEqual(
    view.vibrationEnabled,
    false
  );
  assert.strictEqual(
    view.graphicsQualityTr,
    "Orta"
  );
  assert.strictEqual(view.language,"tr");
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    html.includes('id="settings-summary-panel"')
  );
  assert.ok(
    html.includes("Ses · Müzik · Titreşim · Grafik · Dil")
  );
  assert.ok(!html.includes('data-screen-panel="laboratory"'));
  assert.ok(!html.includes(">Sezon<"));
  assert.ok(!html.includes(">Battle Pass<"));
}

{
  const {
    RelayAppRouter,
    APP_SCREEN,
  } = require("../src/relay-client.js");

  const router = new RelayAppRouter();

  assert.strictEqual(
    router.currentScreen,
    APP_SCREEN.MENU
  );

  assert.strictEqual(
    router.go(APP_SCREEN.PLAY).ok,
    true
  );
  assert.strictEqual(
    router.currentScreen,
    APP_SCREEN.PLAY
  );

  router.goMenu();
  assert.strictEqual(
    router.currentScreen,
    APP_SCREEN.MENU
  );
}

{
  const {
    RelayAppRouter,
  } = require("../src/relay-client.js");

  const router = new RelayAppRouter();
  const result = router.go("store");

  assert.strictEqual(result.ok,false);
  assert.strictEqual(
    router.currentScreen,
    "menu"
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(
    html.includes('id="main-menu-panel"')
  );
  assert.ok(
    !html.includes('id="return-main-menu"')
  );
  assert.ok(
    html.includes('data-screen-panel="play"')
  );
  assert.ok(
    html.includes('data-screen-panel="profile"')
  );
  assert.ok(
    html.includes('data-screen-panel="statistics"')
  );
  assert.ok(
    html.includes('data-screen-panel="settings"')
  );
  assert.ok(
    html.includes('data-screen-panel="daily"')
  );
  assert.ok(
    html.includes('data-screen-panel="rewards"')
  );
  assert.ok(
    app.includes("returnToMainMenu")
  );
  assert.ok(
    app.includes("renderAppScreen")
  );
}

{
  const {
    RelayPvPClientState,
    RelayWebSocketConnectionManager,
    WS_CONNECTION_STATUS,
  } = require("../src/relay-client.js");

  class FakeSocket {
    constructor() {
      this.readyState = 0;
      this.sent = [];
      this.closed = false;
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
    }

    send(data) {
      this.sent.push(data);
    }

    close() {
      this.closed = true;
      this.readyState = 3;
      if (this.onclose) {
        this.onclose({});
      }
    }

    open() {
      this.readyState = 1;
      if (this.onopen) {
        this.onopen({});
      }
    }

    message(message) {
      if (this.onmessage) {
        this.onmessage({
          data: JSON.stringify(message),
        });
      }
    }
  }

  const sockets = [];
  const timers = [];
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  const manager =
    new RelayWebSocketConnectionManager({
      pvpState: pvp,
      createWebSocket() {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      setTimer(fn, ms) {
        const timer = { fn, ms };
        timers.push(timer);
        return timer;
      },
      clearTimer() {},
      heartbeatIntervalMs: 5000,
    });

  manager.connect("ws://test");
  assert.strictEqual(
    manager.status,
    WS_CONNECTION_STATUS.CONNECTING
  );

  sockets[0].open();

  assert.strictEqual(
    manager.status,
    WS_CONNECTION_STATUS.OPEN
  );

  const first = JSON.parse(
    sockets[0].sent[0]
  );
  assert.strictEqual(
    first.type,
    "request_lobby"
  );
  assert.ok(timers.length >= 1);
}

{
  const {
    RelayPvPClientState,
    RelayWebSocketConnectionManager,
  } = require("../src/relay-client.js");

  class FakeSocket {
    constructor() {
      this.readyState = 0;
      this.sent = [];
    }
    send(data) {
      this.sent.push(data);
    }
    close() {}
  }

  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });
  let socket;

  const manager =
    new RelayWebSocketConnectionManager({
      pvpState: pvp,
      createWebSocket() {
        socket = new FakeSocket();
        return socket;
      },
      setTimer() {
        return 1;
      },
      clearTimer() {},
    });

  manager.connect("ws://test");

  const result = manager.sendEnvelope(
    pvp.buildLobbyRequest()
  );

  assert.strictEqual(result.queued,true);
  assert.strictEqual(
    manager.outgoingQueue.length,
    1
  );

  socket.readyState = 1;
  assert.strictEqual(
    manager.flushQueue(),
    1
  );
  assert.strictEqual(
    manager.outgoingQueue.length,
    0
  );
}

{
  const {
    RelayPvPClientState,
    RelayWebSocketConnectionManager,
    WS_CONNECTION_STATUS,
  } = require("../src/relay-client.js");

  class FakeSocket {
    constructor() {
      this.readyState = 0;
      this.sent = [];
    }
    send(data) {
      this.sent.push(data);
    }
    close() {}
  }

  const sockets = [];
  const scheduled = [];
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });

  const manager =
    new RelayWebSocketConnectionManager({
      pvpState: pvp,
      createWebSocket() {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      setTimer(fn, ms) {
        scheduled.push({ fn, ms });
        return scheduled.length;
      },
      clearTimer() {},
      reconnectBaseDelayMs: 1000,
      reconnectMaxDelayMs: 4000,
    });

  manager.connect("ws://test");
  sockets[0].onclose({});

  assert.strictEqual(
    manager.status,
    WS_CONNECTION_STATUS.RECONNECTING
  );
  assert.strictEqual(
    scheduled[0].ms,
    1000
  );

  scheduled[0].fn();

  assert.strictEqual(
    sockets.length,
    2
  );
}

{
  const {
    RelayPvPClientState,
    RelayWebSocketConnectionManager,
    WS_CONNECTION_STATUS,
  } = require("../src/relay-client.js");

  const scheduled = [];
  const socket = {
    readyState: 1,
    send() {},
    close() {},
  };
  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "finished-match",
  });
  const manager = new RelayWebSocketConnectionManager({
    pvpState: pvp,
    createWebSocket: () => socket,
    setTimer(fn, ms) {
      scheduled.push({ fn, ms });
      return scheduled.length;
    },
    clearTimer() {},
  });

  manager.connect("ws://test");
  pvp.applyServerEnvelope({
    version: 1,
    type: "match_finished",
    payload: {
      session_id: "finished-match",
      status: "finished",
      winner_player_id: "a",
      is_draw: false,
      result_summary: {},
    },
  });
  socket.onclose({});

  assert.strictEqual(manager.status, WS_CONNECTION_STATUS.CLOSED);
  assert.strictEqual(
    scheduled.filter((item) => item.ms >= 1000 && item.ms <= 8000).length,
    0
  );
}

{
  const {
    RelayPvPClientState,
    RelayWebSocketConnectionManager,
  } = require("../src/relay-client.js");

  class FakeSocket {
    constructor() {
      this.readyState = 1;
      this.sent = [];
    }
    send(data) {
      this.sent.push(data);
    }
    close() {}
  }

  const pvp = new RelayPvPClientState({
    playerId: "a",
    sessionId: "m",
  });
  const socket = new FakeSocket();

  const manager =
    new RelayWebSocketConnectionManager({
      pvpState: pvp,
      createWebSocket() {
        return socket;
      },
      setTimer() {
        return 1;
      },
      clearTimer() {},
      now() {
        return 12345;
      },
    });

  manager.socket = socket;
  manager.status = "open";
  manager._scheduleHeartbeat();

  // Direct heartbeat envelope path is deterministic.
  const heartbeat = pvp.buildHeartbeat(
    12345
  );
  manager.sendEnvelope(heartbeat);

  const sent = JSON.parse(
    socket.sent[0]
  );
  assert.strictEqual(
    sent.type,
    "heartbeat"
  );
  assert.strictEqual(
    sent.payload.sent_at_ms,
    12345
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "RelayWebSocketConnectionManager"
    )
  );
  assert.ok(
    app.includes(
      "renderConnectionStatus"
    )
  );
  assert.ok(
    html.includes(
      'id="pvp-connection-status"'
    )
  );
}

{
  const {
    RelayMatchmakingClientState,
  } = require("../src/relay-client.js");

  const state =
    new RelayMatchmakingClientState();

  state.applyJoinResponse({
    matched:false,
    queue:{
      queued:true,
      player_id:"a",
      rating:1000,
      league_name_tr:"Gümüş",
      level:1,
      accepted_rating_window:100,
    },
  });

  assert.strictEqual(
    state.queued,
    true
  );
  assert.strictEqual(
    state.queue.rating,
    1000
  );

  state.applyJoinResponse({
    matched:true,
    session_id:"mm-1",
    players:["a","b"],
    rating_difference:40,
  });

  assert.strictEqual(
    state.matched,
    true
  );
  assert.strictEqual(
    state.sessionId,
    "mm-1"
  );
  assert.strictEqual(
    state.ratingDifference,
    40
  );

  state.reset();
  assert.strictEqual(state.queued, false);
  assert.strictEqual(state.matched, false);
  assert.strictEqual(state.sessionId, null);
  assert.deepStrictEqual(state.players, []);
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    html.includes(
      'id="matchmaking-status"'
    )
  );
  assert.ok(
    html.includes("Arena 1")
  );
}

{
  const {
    RelayProgressionClientState,
  } = require("../src/relay-client.js");

  const state =
    new RelayProgressionClientState();

  const view=state.applyResult({
    player_id:"a",
    rating_before:1000,
    rating_after:1020,
    rating_delta:20,
    xp_awarded:120,
    level_after:1,
    experience_after:120,
  });

  assert.strictEqual(
    view.ratingDelta,
    20
  );
  assert.strictEqual(
    view.xpAwarded,
    120
  );
  assert.strictEqual(
    view.ratingAfter,
    1020
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    html.includes(
      'id="profile-live-summary"'
    )
  );
}

{
  const {
    RelayPlayerDataSnapshotState,
  } = require("../src/relay-client.js");

  const state =
    new RelayPlayerDataSnapshotState();

  const snapshot=state.applySnapshot({
    player_id:"a",
    profile:{
      player_id:"a",
      display_name:"Alihan",
    },
    statistics:{
      player_id:"a",
      total_matches:5,
    },
    settings:{
      player_id:"a",
      language:"tr",
    },
  });

  assert.strictEqual(
    snapshot.profile.display_name,
    "Alihan"
  );
  assert.strictEqual(
    snapshot.statistics.total_matches,
    5
  );
  assert.strictEqual(
    snapshot.settings.language,
    "tr"
  );

  state.clear();
  assert.strictEqual(
    state.snapshot,
    null
  );
}

{
  const {
    RelayTelemetryDispatcher,
    TELEMETRY_EVENT_TYPE,
  } = require("../src/relay-client.js");

  const sent=[];
  const telemetry=
    new RelayTelemetryDispatcher({
      playerId:"a",
      sessionId:"m",
      now:() => 12345.9,
      eventIdFactory:
        (type,sequence) =>
          `${type}-${sequence}`,
      transport:
        (event) => sent.push(event),
    });

  const result=
    telemetry.trackGameOpened({
      platform:"web",
    });

  assert.strictEqual(result.ok,true);
  assert.strictEqual(
    result.event.event_type,
    TELEMETRY_EVENT_TYPE.GAME_OPENED
  );
  assert.strictEqual(
    result.event.timestamp_ms,
    12345
  );
  assert.strictEqual(sent.length,1);
}

{
  const {
    RelayTelemetryDispatcher,
  } = require("../src/relay-client.js");

  const telemetry=
    new RelayTelemetryDispatcher();

  assert.strictEqual(
    telemetry.track(
      "not_supported"
    ).ok,
    false
  );
}

{
  const {
    RelayMatchmakingClientState,
  } = require("../src/relay-client.js");

  const state =
    new RelayMatchmakingClientState();

  state.applyQueueStatus({
    queued:false,
    matched:true,
    session_id:"mm-1",
    players:["a","b"],
    rating_difference:25,
  });

  assert.strictEqual(
    state.matched,
    true
  );
  assert.strictEqual(
    state.sessionId,
    "mm-1"
  );
}

{
  const {
    RelayPvPClientState,
    RelayMatchmakingClientState,
    RelayOnlinePlayCoordinator,
  } = require("../src/relay-client.js");

  const pvp =
    new RelayPvPClientState({
      playerId:"a",
    });
  const matchmaking =
    new RelayMatchmakingClientState();

  const sent=[];
  const connection={
    clearOutgoingQueue() {
      sent.length=0;
      return 0;
    },
    sendSetup(setup) {
      sent.push({
        type:"setup",
        setup,
      });
      return {
        ok:true,
        queued:true,
      };
    },
    sendReady(ready) {
      sent.push({
        type:"ready",
        ready,
      });
      return {
        ok:true,
        queued:true,
      };
    },
    connect(url) {
      sent.push({
        type:"connect",
        url,
      });
    },
  };

  const coordinator =
    new RelayOnlinePlayCoordinator({
      playerId:"a",
      pvpState:pvp,
      matchmakingState:
        matchmaking,
      connectionManager:
        connection,
      requestJson:
        async () => ({
          matched:true,
          session_id:"mm-1",
          players:["a","b"],
          rating_difference:15,
          websocket_base_url:
            "wss://node-b.example.test",
        }),
      webSocketUrlFactory:
        (sessionId, websocketBaseUrl) =>
          `${websocketBaseUrl}/${sessionId}`,
      setTimer() {
        return 1;
      },
      clearTimer() {},
    });

  asyncTests.push(coordinator.start({
    battlePoolIds:
      Array.from(
        {length:6},
        (_,i) => `m${i}`
      ),
    initialModules:[
      {
        instanceId:"core-1",
        definitionId:"core",
        x:2,y:2,
        direction:"up",
      },
    ],
  }).then((result) => {
    assert.strictEqual(
      result.ok,
      true
    );
    assert.strictEqual(
      result.matched,
      true
    );
    assert.strictEqual(
      pvp.sessionId,
      "mm-1"
    );
    assert.strictEqual(
      sent[0].type,
      "setup"
    );
    assert.strictEqual(
      sent[1].type,
      "ready"
    );
    assert.strictEqual(
      sent[2].url,
      "wss://node-b.example.test/mm-1"
    );
    assert.strictEqual(
      coordinator.reset().status,
      "idle"
    );
    assert.strictEqual(
      matchmaking.matched,
      false
    );
  }));
}

{
  const {
    RelayPvPClientState,
    RelayMatchmakingClientState,
    RelayOnlinePlayCoordinator,
  } = require("../src/relay-client.js");

  const scheduled=[];
  const requestTimeout = new Error("İstek zaman aşımına uğradı.");
  requestTimeout.code="request_timeout";
  const coordinator = new RelayOnlinePlayCoordinator({
    playerId:"timeout-recovery-player",
    pvpState:new RelayPvPClientState({playerId:"timeout-recovery-player"}),
    matchmakingState:new RelayMatchmakingClientState(),
    connectionManager:{
      disconnect(){},
      clearOutgoingQueue(){},
      sendSetup(){},
      sendReady(){},
      connect(){},
    },
    requestJson:async () => {
      throw requestTimeout;
    },
    setTimer(fn,ms) {
      scheduled.push({fn,ms});
      return scheduled.length;
    },
    clearTimer(){},
  });

  asyncTests.push(coordinator.start({
    battlePoolIds:Array.from({length:6},(_,index) => `m${index}`),
    initialModules:[{instanceId:"core",definitionId:"core",x:2,y:1}],
  }).then((result) => {
    assert.deepStrictEqual(result,{ok:true,matched:false,pending:true});
    assert.strictEqual(coordinator.status,"matchmaking");
    assert.strictEqual(scheduled.length,1);
    assert.strictEqual(scheduled[0].ms,1000);
  }));
}

{
  const {
    RelayPvPClientState,
    RelayMatchmakingClientState,
    RelayOnlinePlayCoordinator,
  } = require("../src/relay-client.js");

  const scheduled=[];
  const pvp =
    new RelayPvPClientState({
      playerId:"a",
    });
  const matchmaking =
    new RelayMatchmakingClientState();

  const connection={
    clearOutgoingQueue(){},
    sendSetup(){},
    sendReady(){},
    connect(){},
  };

  let call=0;
  const coordinator =
    new RelayOnlinePlayCoordinator({
      playerId:"a",
      pvpState:pvp,
      matchmakingState:
        matchmaking,
      connectionManager:
        connection,
      requestJson:
        async () => {
          call += 1;
          if (call===1) {
            return {
              matched:false,
              queue:{
                queued:true,
                matched:false,
              },
            };
          }
          return {
            queued:false,
            matched:true,
            session_id:"mm-polled",
            players:["a","b"],
            rating_difference:40,
          };
        },
      setTimer(fn,ms) {
        scheduled.push({
          fn,ms
        });
        return scheduled.length;
      },
      clearTimer(){},
      webSocketUrlFactory:
        () => "ws://test",
    });

  asyncTests.push(coordinator.start({
    battlePoolIds:
      Array.from(
        {length:6},
        (_,i) => `m${i}`
      ),
    initialModules:[
      {instanceId:"c",definitionId:"core",x:2,y:2},
    ],
  }).then(async (first) => {
    assert.strictEqual(
      first.matched,
      false
    );
    assert.strictEqual(
      scheduled[0].ms,
      1000
    );

    const polled =
      await coordinator.pollNow();

    assert.strictEqual(
      polled.matched,
      true
    );
    assert.strictEqual(
      pvp.sessionId,
      "mm-polled"
    );
  }));
}

{
  const {
    RelayPvPClientState,
    RelayMatchmakingClientState,
    RelayOnlinePlayCoordinator,
  } = require("../src/relay-client.js");

  let releaseDelete;
  const calls=[];
  const coordinator = new RelayOnlinePlayCoordinator({
    playerId:"cancel-retry-player",
    pvpState:new RelayPvPClientState({playerId:"cancel-retry-player"}),
    matchmakingState:new RelayMatchmakingClientState(),
    connectionManager:{
      disconnect(){},
      clearOutgoingQueue(){},
      sendSetup(){},
      sendReady(){},
      connect(){},
    },
    requestJson:async (requestPath, options={}) => {
      calls.push({requestPath,method:options.method || "GET"});
      if (options.method === "DELETE") {
        return new Promise((resolve) => { releaseDelete=resolve; });
      }
      return {matched:false,queue:{queued:true,matched:false}};
    },
    setTimer(){ return 1; },
    clearTimer(){},
  });

  asyncTests.push((async () => {
    const cancelled = await coordinator.cancel();
    assert.strictEqual(cancelled.ok,true);
    assert.strictEqual(coordinator.status,"cancelled");

    let restarted=false;
    const restart=coordinator.start({
      battlePoolIds:Array.from({length:6},(_,index) => `m${index}`),
      initialModules:[{instanceId:"core",definitionId:"core",x:2,y:1}],
    }).then((result) => {
      restarted=true;
      return result;
    });

    await Promise.resolve();
    assert.strictEqual(restarted,false);
    assert.strictEqual(calls.filter((call) => call.requestPath === "/matchmaking/join").length,0);
    releaseDelete({ok:true});
    const result=await restart;
    assert.strictEqual(result.ok,true);
    assert.strictEqual(calls.filter((call) => call.requestPath === "/matchmaking/join").length,1);
  })());
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "startRealOnlineMatch"
    )
  );
  assert.ok(
    app.includes(
      "buildInitialOnlineSetup"
    )
  );
  assert.ok(
    app.includes(
      "selectedBattlePoolDefinitionIds"
    )
  );
  assert.ok(
    app.includes(
      "RelayOnlinePlayCoordinator"
    )
  );
  assert.ok(
    html.includes(
      "Savaş Havuzu"
    )
  );
  assert.ok(
    !html.includes(
      'id="battle-pool-toggle-selected"'
    )
  );
  assert.ok(
    html.includes(
      'id="battle-pool-preset-select"'
    )
  );
  assert.ok(
    !html.includes(">Eğitim<")
  );
}

{
  const {
    RelayPostMatchSync,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelayProgressionClientState,
  } = require("../src/relay-client.js");

  const profile=
    new RelayProfileClientState();
  const statistics=
    new RelayStatisticsClientState();
  const progression=
    new RelayProgressionClientState();

  const sync=
    new RelayPostMatchSync({
      playerId:"a",
      profileState:profile,
      statisticsState:statistics,
      progressionState:progression,
      requestJson:
        async (path) => {
          assert.strictEqual(
            path,
            "/post-match/mm-1/a"
          );

          return {
            battle_id:"mm-1",
            player_id:"a",
            progression:{
              player_id:"a",
              rating_before:1000,
              rating_after:1020,
              rating_delta:20,
              circuit_credits_awarded:50,
              xp_awarded:120,
              level_after:1,
              experience_after:120,
            },
            profile:{
              player_id:"a",
              display_name:"Alihan",
              level:1,
              experience:120,
              experience_into_level:120,
              experience_to_next_level:880,
              rating:1020,
              league_name_tr:"Gümüş",
              preferred_battle_pool_ids:[],
            },
            statistics:{
              player_id:"a",
              total_matches:1,
              wins:1,
              losses:0,
              draws:0,
              win_rate:1,
              average_match_duration_ms:90000,
              total_damage_dealt:500,
              most_used_modules:[],
            },
          };
        },
    });

  asyncTests.push(
    sync.sync("mm-1")
      .then((result) => {
        assert.strictEqual(
          result.ok,
          true
        );
        assert.strictEqual(
          progression.viewModel()
            .ratingDelta,
          20
        );
        assert.strictEqual(
          progression.viewModel()
            .circuitCreditsAwarded,
          50
        );
        assert.strictEqual(
          profile.viewModel().rating,
          1020
        );
        assert.strictEqual(
          statistics.viewModel()
            .totalMatches,
          1
        );

        return sync.sync("mm-1");
      })
      .then((cached) => {
        assert.strictEqual(
          cached.cached,
          true
        );
      })
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "syncFinishedMatch"
    )
  );
  assert.ok(
    app.includes(
      "renderPostMatchSummary"
    )
  );
  assert.ok(
    app.includes(
      "renderProfileSummary"
    )
  );
  assert.ok(
    app.includes(
      "renderStatisticsSummary"
    )
  );
  assert.ok(
    html.includes(
      'id="battle-result-summary"'
    )
  );
  assert.ok(html.includes('id="post-match-continue"'));
  assert.ok(!html.includes('id="rematch-button"'));
  assert.ok(!html.includes('id="return-preparation-button"'));
  assert.ok(
    !html.includes(">Eğitim<")
  );
}

{
  const {
    RelayAccountDataLoader,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelaySettingsClientState,
    REMOTE_DATA_STATUS,
  } = require("../src/relay-client.js");

  const profile=
    new RelayProfileClientState();
  const statistics=
    new RelayStatisticsClientState();
  const settings=
    new RelaySettingsClientState();

  const loader=
    new RelayAccountDataLoader({
      playerId:"a",
      profileState:profile,
      statisticsState:statistics,
      settingsState:settings,
      requestJson:
        async (path,options={}) => {
          if (
            path==="/profile/a"
          ) {
            return {
              player_id:"a",
              display_name:"Alihan",
              level:2,
              experience:1200,
              experience_into_level:200,
              experience_to_next_level:800,
              rating:1110,
              league_name_tr:"Altın",
              preferred_battle_pool_ids:[],
            };
          }

          if (
            path==="/statistics/a"
          ) {
            return {
              player_id:"a",
              total_matches:4,
              wins:2,
              losses:1,
              draws:1,
              win_rate:0.5,
              average_match_duration_ms:100000,
              total_damage_dealt:1000,
              most_used_modules:[],
            };
          }

          if (
            path==="/settings/a"
            && !options.method
          ) {
            return {
              player_id:"a",
              sound_volume:80,
              music_volume:50,
              vibration_enabled:false,
              graphics_quality:"orta",
              language:"tr",
            };
          }

          if (
            path==="/settings/a"
            && options.method==="PUT"
          ) {
            return {
              player_id:"a",
              sound_volume:25,
              music_volume:10,
              vibration_enabled:true,
              graphics_quality:"dusuk",
              language:"en",
            };
          }

          throw new Error("unexpected path");
        },
    });

  asyncTests.push(
    loader.loadAll()
      .then((result) => {
        assert.strictEqual(
          result.ok,
          true
        );
        assert.strictEqual(
          loader.status.profile,
          REMOTE_DATA_STATUS.READY
        );
        assert.strictEqual(
          profile.viewModel().rating,
          1110
        );
        assert.strictEqual(
          statistics.viewModel()
            .totalMatches,
          4
        );
        assert.strictEqual(
          settings.viewModel()
            .graphicsQuality,
          "orta"
        );

        return loader.saveSettings({
          sound_volume:25,
        });
      })
      .then((result) => {
        assert.strictEqual(
          result.ok,
          true
        );
        assert.strictEqual(
          settings.viewModel()
            .soundVolume,
          25
        );
      })
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(
    html.includes(
      'id="profile-load-status"'
    )
  );
  assert.ok(
    html.includes(
      'id="statistics-load-status"'
    )
  );
  assert.ok(
    html.includes(
      'id="settings-load-status"'
    )
  );
  assert.ok(
    !html.includes(
      'id="settings-save"'
    )
  );
  assert.ok(!html.includes('id="settings-save-status"'));
  assert.ok(!html.includes('id="settings-persistence-status"'));
  assert.ok(
    app.includes(
      ".loadProfile()"
    )
  );
  assert.ok(
    app.includes(
      ".loadStatistics()"
    )
  );
  assert.ok(
    app.includes(
      ".loadSettings()"
    )
  );
  assert.ok(
    app.includes(
      "saveSettingsForm"
    )
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    html.includes(
      "2.1.0-beta.72"
    )
  );
  assert.ok(
    !html.includes(">KPI<")
  );
}

{
  const {
    RelayTelemetryHttpTransport,
    TELEMETRY_TRANSPORT_STATUS,
  } = require("../src/relay-client.js");

  const sent=[];
  const transport=
    new RelayTelemetryHttpTransport({
      requestJson:
        async (event) => {
          sent.push(
            event.event_id
          );
          return {
            accepted:true,
          };
        },
      setTimer() {
        return 1;
      },
      clearTimer() {},
    });

  const first={
    event_id:"e1",
    event_type:"game_opened",
    timestamp_ms:1,
    metadata:{},
  };

  transport.enqueue(first);
  transport.enqueue(first);

  asyncTests.push(
    transport.flush()
      .then(() => {
        assert.strictEqual(
          transport.pending.size,
          0
        );
        assert.strictEqual(
          sent.filter(
            (id) => id==="e1"
          ).length,
          1
        );
        assert.strictEqual(
          transport.status,
          TELEMETRY_TRANSPORT_STATUS.READY
        );
      })
  );
}

{
  const {
    RelayTelemetryHttpTransport,
    TELEMETRY_TRANSPORT_STATUS,
  } = require("../src/relay-client.js");

  const timers=[];
  let attempts=0;

  const transport=
    new RelayTelemetryHttpTransport({
      requestJson:
        async () => {
          attempts += 1;
          if (attempts===1) {
            throw new Error(
              "network"
            );
          }
          return {
            accepted:true,
          };
        },
      setTimer(fn,ms) {
        timers.push({
          fn,ms
        });
        return timers.length;
      },
      clearTimer() {},
      retryBaseDelayMs:1000,
      retryMaxDelayMs:4000,
    });

  const result=
    transport.enqueue({
      event_id:"retry-1",
      event_type:
        "rematch_requested",
      timestamp_ms:1,
      metadata:{},
    });

  assert.strictEqual(
    result.ok,
    true
  );

  asyncTests.push(
    new Promise(
      (resolve) =>
        setImmediate(resolve)
    )
      .then(() => {
        assert.strictEqual(
          transport.pending.size,
          1
        );
        assert.strictEqual(
          transport.status,
          TELEMETRY_TRANSPORT_STATUS.RETRY_WAIT
        );
        assert.strictEqual(
          timers[0].ms,
          1000
        );

        timers[0].fn();

        return new Promise(
          (resolve) =>
            setImmediate(resolve)
        );
      })
      .then(() => {
        assert.strictEqual(
          transport.pending.size,
          0
        );
        assert.strictEqual(
          attempts,
          2
        );
      })
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  assert.ok(
    app.includes(
      "RelayTelemetryHttpTransport"
    )
  );
  assert.ok(
    app.includes(
      "telemetryTransport"
    )
  );
  assert.ok(
    app.includes(
      ".enqueue(event)"
    )
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  assert.ok(
    !html.includes(">Eğitim<")
  );
  assert.ok(
    !html.includes('data-screen-panel="laboratory"')
  );
  assert.ok(
    !html.includes(">Kozmetik<")
  );
  assert.ok(
    html.includes(
      'id="home-battle-button"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="modules"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="statistics"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="events"'
    )
  );
}

{
  const {
    RelayPlayRecoveryState,
    PLAY_RECOVERY_KIND,
  } = require("../src/relay-client.js");

  const state=
    new RelayPlayRecoveryState();

  state.show(
    PLAY_RECOVERY_KIND.WEBSOCKET,
    "Bağlantı hatası"
  );
  assert.strictEqual(
    state.viewModel().active,
    true
  );
  assert.strictEqual(
    state.viewModel().retryable,
    true
  );

  state.clear();
  assert.strictEqual(
    state.viewModel().active,
    false
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(html.includes('id="play-recovery-panel"'));
  assert.ok(html.includes('id="play-recovery-retry"'));
  assert.ok(!html.includes('id="matchmaking-cancel"'));
  assert.ok(html.includes('id="telemetry-send-status"'));
  assert.ok(app.includes("showPlayError"));
  assert.ok(app.includes("isOnlineMatchmakingCancelable"));
  assert.ok(app.includes("İptal Et"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(html.includes('id="server-boot-status"'));
  assert.ok(html.includes('id="server-boot-retry"'));
  assert.ok(app.includes("checkServerReadiness"));
  assert.ok(app.includes("serverBootGate.canPlay()"));
}

{
  const {
    RelayTestParticipantIdentity,
  } = require("../src/relay-client.js");

  const values=new Map();
  const storage={
    getItem(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },
    setItem(key,value) {
      values.set(key,value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  const first=
    new RelayTestParticipantIdentity({
      storage,
      idFactory:
        () => "ABCDEF-123456",
    });
  const firstId=
    first.getOrCreate();

  const reopened=
    new RelayTestParticipantIdentity({
      storage,
      idFactory:
        () => "OTHER-999999",
    });

  assert.strictEqual(
    firstId,
    "wt-abcdef-123456"
  );
  assert.strictEqual(
    reopened.getOrCreate(),
    firstId
  );

  first.reset();

  const resetIdentity=
    new RelayTestParticipantIdentity({
      storage,
      idFactory:
        () => "NEW-654321",
    });

  assert.strictEqual(
    resetIdentity.getOrCreate(),
    "wt-new-654321"
  );
}

{
  const {
    RelayTestParticipantIdentity,
  } = require("../src/relay-client.js");

  const a=
    new RelayTestParticipantIdentity({
      storage:{
        getItem:() => null,
        setItem() {},
      },
      idFactory:
        () => "browser-a-123456",
    });
  const b=
    new RelayTestParticipantIdentity({
      storage:{
        getItem:() => null,
        setItem() {},
      },
      idFactory:
        () => "browser-b-123456",
    });

  assert.notStrictEqual(
    a.getOrCreate(),
    b.getOrCreate()
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "RelayTestParticipantIdentity"
    )
  );
  assert.ok(
    app.includes(
      "participantPlayerId"
    )
  );
  assert.strictEqual(
    app.includes(
      'playerId: "local-player"'
    ),
    false
  );
  assert.strictEqual(
    app.includes(
      'player_id: "local-player"'
    ),
    false
  );
  assert.ok(
    html.includes(
      'id="participant-id-summary"'
    )
  );
}

{
  const {
    RelayParticipantBootstrap,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelaySettingsClientState,
    PARTICIPANT_BOOTSTRAP_STATUS,
  } = require("../src/relay-client.js");

  const profile=
    new RelayProfileClientState();
  const statistics=
    new RelayStatisticsClientState();
  const settings=
    new RelaySettingsClientState();

  const bootstrap=
    new RelayParticipantBootstrap({
      playerId:
        "wt-test-123456",
      profileState:profile,
      statisticsState:statistics,
      settingsState:settings,
      requestJson:
        async (path,options) => {
          assert.strictEqual(
            path,
            "/participants/wt-test-123456/bootstrap"
          );
          assert.strictEqual(
            options.method,
            "POST"
          );
          return {
            player_id:
              "wt-test-123456",
            profile:{
              player_id:
                "wt-test-123456",
              display_name:"Oyuncu",
              level:1,
              experience:0,
              experience_into_level:0,
              experience_to_next_level:1000,
              rating:1000,
              league_name_tr:"Gümüş",
              preferred_battle_pool_ids:[],
            },
            statistics:{
              player_id:
                "wt-test-123456",
              total_matches:0,
              wins:0,
              losses:0,
              draws:0,
              win_rate:0,
              average_match_duration_ms:0,
              total_damage_dealt:0,
              most_used_modules:[],
            },
            settings:{
              player_id:
                "wt-test-123456",
              sound_volume:100,
              music_volume:70,
              vibration_enabled:true,
              graphics_quality:"yuksek",
              language:"tr",
            },
          };
        },
    });

  asyncTests.push(
    bootstrap.load()
      .then((result) => {
        assert.strictEqual(
          result.ok,
          true
        );
        assert.strictEqual(
          bootstrap.status,
          PARTICIPANT_BOOTSTRAP_STATUS.READY
        );
        assert.strictEqual(
          profile.viewModel().rating,
          1000
        );
        assert.strictEqual(
          statistics.viewModel()
            .totalMatches,
          0
        );
        assert.strictEqual(
          settings.viewModel()
            .language,
          "tr"
        );
      })
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "RelayParticipantBootstrap"
    )
  );
  assert.ok(
    app.includes(
      "bootstrapParticipant"
    )
  );
  assert.ok(
    html.includes(
      'id="participant-bootstrap-status"'
    )
  );
}

{
  const {
    RelayPlayReadinessGate,
  } = require("../src/relay-client.js");

  const server={
    canPlay:() => true,
  };
  const participant={
    status:"ready",
  };

  const gate=
    new RelayPlayReadinessGate({
      serverBootGate:server,
      participantBootstrap:
        participant,
    });

  assert.strictEqual(
    gate.canPlay(),
    true
  );
  assert.strictEqual(
    gate.labelTr(),
    "Oyna: Hazır"
  );

  participant.status="error";

  assert.strictEqual(
    gate.canPlay(),
    false
  );
  assert.deepStrictEqual(
    gate.blockers(),
    ["participant"]
  );
}

{
  const {
    RelayPlayReadinessGate,
  } = require("../src/relay-client.js");

  const gate=
    new RelayPlayReadinessGate({
      serverBootGate:{
        canPlay:() => false,
      },
      participantBootstrap:{
        status:"loading",
      },
    });

  assert.strictEqual(
    gate.canPlay(),
    false
  );
  assert.deepStrictEqual(
    gate.blockers(),
    [
      "server",
      "participant",
    ]
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "playReadinessGate.canPlay()"
    )
  );
  assert.ok(
    html.includes(
      'id="play-readiness-status"'
    )
  );
  assert.ok(
    html.includes(
      'id="participant-bootstrap-retry"'
    )
  );
}

{
  const {
    RelayAccountDataLoader,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelaySettingsClientState,
  } = require("../src/relay-client.js");

  const profile=
    new RelayProfileClientState();
  profile.applyProfile({
    player_id:"wt-a-123456",
    display_name:"Oyuncu",
    level:1,
    experience:0,
    experience_into_level:0,
    experience_to_next_level:1000,
    rating:1000,
    league_name_tr:"Gümüş",
    preferred_battle_pool_ids:[],
  });

  const loader=
    new RelayAccountDataLoader({
      playerId:"wt-a-123456",
      profileState:profile,
      statisticsState:
        new RelayStatisticsClientState(),
      settingsState:
        new RelaySettingsClientState(),
      requestJson:
        async (path,options) => {
          assert.strictEqual(
            path,
            "/profile/wt-a-123456/display-name"
          );
          assert.strictEqual(
            options.method,
            "PUT"
          );
          const body=
            JSON.parse(
              options.body
            );
          assert.strictEqual(
            body.display_name,
            "Relay Ustası"
          );

          return {
            player_id:"wt-a-123456",
            display_name:"Relay Ustası",
            level:1,
            experience:0,
            experience_into_level:0,
            experience_to_next_level:1000,
            rating:1000,
            league_name_tr:"Gümüş",
            preferred_battle_pool_ids:[],
          };
        },
    });

  asyncTests.push(
    loader.saveDisplayName(
      " Relay Ustası "
    ).then((result) => {
      assert.strictEqual(
        result.ok,
        true
      );
      assert.strictEqual(
        profile.viewModel()
          .displayName,
        "Relay Ustası"
      );
    })
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "saveProfileDisplayName"
    )
  );
  assert.ok(
    html.includes(
      'id="profile-display-name"'
    )
  );
  assert.ok(
    html.includes(
      'id="profile-display-name-save"'
    )
  );
  assert.ok(
    html.includes(
      'id="participant-id-summary"'
    )
  );
}

{
  const {
    RelayParticipantContinuityState,
    PARTICIPANT_CONTINUITY_STATUS,
  } = require("../src/relay-client.js");

  const continuity=
    new RelayParticipantContinuityState({
      expectedPlayerId:
        "wt-a-123456",
    });

  const ok=continuity.verify({
    player_id:"wt-a-123456",
    identity:{
      kind:
        "participant",
      player_id:
        "wt-a-123456",
    },
  });

  assert.strictEqual(
    ok.ok,
    true
  );
  assert.strictEqual(
    continuity.status,
    PARTICIPANT_CONTINUITY_STATUS.VERIFIED
  );
  assert.strictEqual(
    continuity.isVerified(),
    true
  );

  const bad=continuity.verify({
    player_id:"wt-b-654321",
  });

  assert.strictEqual(
    bad.ok,
    false
  );
  assert.strictEqual(
    continuity.status,
    PARTICIPANT_CONTINUITY_STATUS.MISMATCH
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

  assert.ok(
    app.includes(
      "participantContinuity"
    )
  );
  assert.ok(
    app.includes(
      ".verify("
    )
  );
  assert.ok(
    html.includes(
      'id="participant-continuity-status"'
    )
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(
    app.includes(
      "pvpState.sessionId"
    )
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");

  assert.ok(
    app.includes(
      'if (screen === "play")'
    )
  );
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");

  assert.ok(app.includes("document.body.dataset.appScreen"));
  assert.ok(html.includes('class="mobile-home-hub"'));
  assert.ok(!html.includes("main-menu-lead"));
  assert.ok(!html.includes("lobby-feature-grid"));
  assert.ok(css.includes('body[data-app-screen="menu"] .battle-status-cluster'));
  assert.ok(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(!html.includes('data-open-screen="education"'));
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");
  assert.ok(html.includes("Olay Günlüğü"));
  assert.ok(html.includes("screen-subtitle"));
  assert.ok(css.includes('body[data-app-screen="profile"] .battle-status-cluster'));
  assert.ok(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))") || css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");

  assert.ok(css.includes("color-scheme:dark"));
  assert.ok(!app.includes("+${reward.season_xp_reward || 0} SXP"));
  assert.ok(app.includes("reward.required_xp"));
  assert.ok(app.includes('"daily-action-status"'));
  assert.ok(app.includes('"has-persistent-notification"'));
  assert.ok(!app.includes("lobby-notification-dot"));
  assert.ok(html.includes('id="lobby-season-progress-fill"'));
  assert.ok(html.includes('class="main-scope-nav lobby-bottom-dock app-bottom-dock"'));
  assert.ok(html.includes('id="daily-missions-screen"'));
  assert.ok(html.includes('id="season-rewards-screen"'));
}

{
  const fs=require("fs");
  const app=fs.readFileSync(path.join(ROOT,"src/app.js"),"utf8");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const css=fs.readFileSync(path.join(ROOT,"src/styles.css"),"utf8");

  assert.ok(!html.includes('id="local-play-start"'));
  assert.ok(!html.includes('id="online-play-prepare"'));
  assert.ok(html.includes('id="battle-pool-preset-dialog"'));
  assert.ok(app.includes("startLocalPlayableMatch"));
  assert.ok(app.includes("resetLocalBattleState"));
  assert.ok(app.includes("finishLocalBattle"));
  assert.ok(app.includes('activePlayMode === "local"'));
  assert.ok(css.includes('body[data-play-mode="idle"]'));
  assert.ok(css.includes(".technical-status-drawer"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync(path.join(ROOT, "index.html"),"utf8");
  const app=fs.readFileSync(path.join(ROOT, "src", "app.js"),"utf8");

  assert.ok(html.includes('class="battle-pool-builder"'));
  assert.ok(html.includes('id="battle-pool-detail"'));
  assert.ok(html.includes('id="battle-pool-selected"'));
  assert.ok(!html.includes('id="battle-pool-toggle-selected"'));
  assert.ok(html.includes('id="battle-pool-preset-select"'));
  assert.ok(!html.includes('id="settings-save-status"'));
  assert.ok(!html.includes('id="settings-persistence-status"'));

  assert.ok(app.includes("prepareLocalMatch"));
  assert.ok(app.includes("pool-choice-select"));
  assert.ok(app.includes("applyLanguagePreference"));
  assert.ok(app.includes('activePlayMode === "local"'));
}

{
  const fs=require("fs");
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(!html.includes('id="settings-persistence-status"'));
  assert.ok(app.includes("renderSettingsPersistenceStatus"));
  assert.ok(app.includes("Kalıcılık: Sunucuda doğrulandı"));
  assert.ok(app.includes('cell.dataset.cellLabel'));
  assert.ok(css.includes(".module-stats"));
  assert.ok(css.includes(".board-cell::before"));
}

{
  const fs=require("fs");
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(app.includes('playButton.disabled = false'));
  assert.ok(app.includes('loadModuleCatalog'));
  assert.ok(app.includes('createPoolCategoryGroup'));
  assert.ok(app.includes('moduleCatalogById'));
  assert.ok(html.includes('id="battle-pool-detail-effects"'));
  assert.ok(html.includes('id="battle-pool-detail-damage"'));
  assert.ok(css.includes(".pool-category-group"));
  assert.ok(css.includes(".pool-detail-matchups"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(!html.includes("GRIDSHARD // CORE ARENA"));
  assert.ok(!html.includes("CORE ARENA"));
  assert.ok(css.includes(".lobby-core-orbit"));
  assert.ok(css.includes("@keyframes relay-hit"));
  assert.ok(css.includes("@keyframes gs-core-breath"));
  assert.ok(app.includes("BOARD_CELLS"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(html.includes('id="battle-pool-preset-select"'));
  assert.ok(html.includes('id="battle-pool-preset-save"'));
  assert.ok(!html.includes('id="battle-pool-toggle-selected"'));
  assert.ok(app.includes("saveCurrentBattlePoolPreset"));
  assert.ok(app.includes("pool-choice-select"));
  assert.ok(app.includes("appendHpBar"));
  assert.ok(app.includes("pool-module-icon"));
  assert.ok(app.includes("moduleIconFor(module)"));
  assert.ok(css.includes(".hp-bar-fill"));
  assert.ok(css.includes('[data-hp-state="destroyed"]'));
  assert.ok(css.includes(".battle-pool-selection .pool-category-list"));
  assert.ok(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(html.includes("<title>GRIDSHARD — Devreni kur. Stratejini konuştur.</title>"));
  assert.ok(html.includes('<p class="boot-tagline">Devreni kur. Stratejini konuştur.</p>'));
  assert.ok(!html.includes("Çekirdeği Kır"));
  assert.ok(html.includes("shard-core-mark"));
  assert.ok(css.includes("--gs-arc-cyan:#36D9FF"));
  assert.ok(css.includes("--gs-reactor-gold:#F4C85A"));
  assert.ok(css.includes(".shard-core-crack"));
  assert.ok(app.includes("gridshardAudioDirector"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(html.includes('id="battle-pool-preset-rename"'));
  assert.ok(html.includes('id="battle-pool-active-preset"'));
  assert.ok(html.includes('id="battle-pool-preset-dirty"'));
  assert.ok(app.includes("renameSelectedBattlePoolPreset"));
  assert.ok(app.includes("renderActivePresetState"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");
  const audio=fs.readFileSync("./src/gridshard-audio.js","utf8");

  assert.ok(html.includes('id="battle-pool-preset-gallery"'));
  assert.ok(!html.includes("Tek Oyunculu · Dereceli PvP"));
  assert.ok(html.includes('id="lobby-player-name"'));
  assert.ok(html.includes('id="lobby-player-details"'));
  assert.ok(app.includes('"−"'));
  assert.ok(app.includes('dataset.action'));
  assert.ok(app.includes("renderPresetGallery"));
  assert.ok(app.includes("updateBattlePoolPresetMeta"));
  assert.ok(app.includes("lobby-parallax-x"));
  assert.ok(css.includes(".lobby-board-grid"));
  assert.ok(css.includes(".preset-card"));
  assert.ok(css.includes('[data-action="remove"]'));
  assert.ok(audio.includes("GRIDSHARD_SFX_CUES"));
  assert.ok(audio.includes("core_hit"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(html.includes('id="settings-sound-muted"'));
  assert.ok(html.includes('id="settings-music-muted"'));
  assert.ok(html.includes('id="battle-pool-preset-dialog"'));
  assert.ok(app.includes("renderQuickLoadoutGallery"));
  assert.ok(app.includes("previewAudioSettingsFromControls"));
  assert.ok(css.includes(".quick-loadout-card"));
  assert.ok(css.includes(".balance-regression-result"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");
  const audio=fs.readFileSync("./src/gridshard-audio.js","utf8");

  assert.ok(html.includes('id="settings-preview-music"'));
  assert.ok(html.includes('id="settings-preview-sfx"'));
  assert.ok(html.includes('id="battle-pool-preset-open"'));
  assert.ok(app.includes("quickLoadoutFilter"));
  assert.ok(app.includes("renderQuickLoadoutActiveSummary"));
  assert.ok(app.includes("syncCriticalCoreAudioState"));
  assert.ok(app.includes('previewMusic('));
  assert.ok(app.includes('previewSfx('));
  assert.ok(css.includes(".quick-loadout-badges"));
  assert.ok(audio.includes("GRIDSHARD_AUDIO_MIX"));
  assert.ok(audio.includes("crossfadeMs:1200"));
  assert.ok(audio.includes("battle_tension_v7_07_pressure.wav"));
  assert.ok(audio.includes("GRIDSHARD_BATTLE_LAYERS"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const audio=fs.readFileSync("./src/gridshard-audio.js","utf8");

  assert.ok(html.includes('id="ui-build-version"'));
  assert.ok(app.includes("setBattlePressure"));
  assert.ok(/version:"shardglass-seamless-v\d+"/.test(audio));
  assert.ok(audio.includes("menuPoolCrossfadeMs:480"));
  assert.ok(audio.includes("phaseLockedTransition"));
  assert.ok(audio.includes("criticalLayerMaxGain"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");
  const audio=fs.readFileSync("./src/gridshard-audio.js","utf8");

  assert.ok(app.includes("__GRIDSHARD_BATTLE_UX"));
  assert.ok(app.includes("battle_ui_interaction"));
  assert.ok(app.includes("battle_ux_timing_summary"));
  assert.ok(app.includes("pause_violation_count"));
  assert.ok(audio.includes('stage="high"') || audio.includes('"high"'));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  assert.ok(app.includes("ux_categories"));
  assert.ok(app.includes('"module_place"'));
  assert.ok(app.includes('"technical_drawer"'));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(app.includes("ux_matrix"));
  assert.ok(app.includes("average_frame_gap_ms"));
  assert.ok(app.includes("average_clock_delta_ms"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  assert.ok(!html.includes('id="local-battle-quick-start"'));
  assert.ok(app.includes("startQuickLocalBattle"));
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");
  const css=fs.readFileSync("./src/styles.css","utf8");

  for (const id of [
    "statistics-total-matches",
    "statistics-win-rate",
    "statistics-average-duration",
    "statistics-total-damage",
    "statistics-most-used-decks",
  ]) {
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.ok(!html.includes('id="statistics-module-replacements"'));
  assert.ok(app.includes("most_used_decks"));
  assert.ok(app.includes("statistics-deck-card"));
  assert.ok(css.includes(".statistics-metrics-grid"));
  assert.ok(css.includes(".statistics-empty-state"));
  assert.ok(app.includes('"deploy_module"'));
  assert.ok(app.includes("createDeckModuleCard"));
  assert.ok(css.includes("GRIDSHARD Beta.32 — fixed battle viewport"));
  assert.ok(css.includes("GRIDSHARD Beta.32 Fix.1 — invariant card geometry"));
  assert.ok(css.includes("gs-card-impact-static"));
  assert.ok(css.includes("gs-card-fire-static"));
}

{
  const {
    RelayAccountDataLoader,
    RelayProfileClientState,
    RelayStatisticsClientState,
    RelaySettingsClientState,
  } = require("../src/relay-client.js");
  const profile = new RelayProfileClientState();
  const loader = new RelayAccountDataLoader({
    playerId: "season-player",
    profileState: profile,
    statisticsState: new RelayStatisticsClientState(),
    settingsState: new RelaySettingsClientState(),
    requestJson: async (requestPath, options) => {
      assert.strictEqual(
        requestPath,
        "/profile/season-player/engagement/tiers/2/claim"
      );
      assert.strictEqual(options.method, "POST");
      return {
        player_id: "season-player",
        display_name: "Operator",
        level: 1,
        experience: 250,
        experience_into_level: 250,
        experience_to_next_level: 750,
        rating: 1000,
        league_name_tr: "Gümüş",
        preferred_battle_pool_ids: [],
        engagement: {
          current_tier: 2,
          equipped_title: "Devre Öncüsü",
          daily_missions: [],
          reward_track: [{ tier: 2, claimed: true }],
          unlocked_titles: ["Devre Çırağı", "Devre Öncüsü"],
        },
      };
    },
  });
  asyncTests.push(
    loader.claimEngagementReward("tiers", 2).then((result) => {
      assert.strictEqual(result.ok, true);
      assert.strictEqual(
        profile.viewModel().engagement.equipped_title,
        "Devre Öncüsü"
      );
    })
  );
}

{
  const {
    RelayServerBootGate,
    RelayServerHealthState,
    SERVER_BOOT_STATUS,
  } = require("../src/relay-client.js");

  const health = new RelayServerHealthState();
  const requested = [];
  const gate = new RelayServerBootGate({
    healthState: health,
    expectedVersion: "2.1.0-beta.72",
    expectedProtocolVersion: 1,
    requestJson: async (requestPath) => {
      requested.push(requestPath);
      return { status: "ok", version: "2.1.0-beta.72", pvp_protocol_version: 1 };
    },
  });

  asyncTests.push(
    gate.check().then((result) => {
      assert.strictEqual(result.ok, true);
      assert.strictEqual(gate.canPlay(), true);
      assert.strictEqual(gate.status, SERVER_BOOT_STATUS.READY);
      // Açılış kapısı yalnız /health okur.
      assert.deepStrictEqual(requested, ["/health"]);
      assert.strictEqual(health.labelTr(), "Sunucu: Hazır");
    })
  );
}

{
  const {
    RelayServerBootGate,
    RelayServerHealthState,
    SERVER_BOOT_STATUS,
  } = require("../src/relay-client.js");

  const mismatch = new RelayServerBootGate({
    healthState: new RelayServerHealthState(),
    expectedVersion: "2.1.0-beta.72",
    requestJson: async () => ({ status: "ok", version: "2.1.0-beta.42", pvp_protocol_version: 1 }),
  });
  const degraded = new RelayServerBootGate({
    healthState: new RelayServerHealthState(),
    expectedVersion: "2.1.0-beta.72",
    requestJson: async () => ({ status: "degraded", version: "2.1.0-beta.72", pvp_protocol_version: 1 }),
  });
  const unreachable = new RelayServerBootGate({
    healthState: new RelayServerHealthState(),
    requestJson: async () => { throw new Error("unreachable"); },
  });

  asyncTests.push(
    Promise.all([mismatch.check(), degraded.check(), unreachable.check()]).then(
      ([versionResult, degradedResult, unreachableResult]) => {
        assert.strictEqual(versionResult.ok, false);
        assert.match(versionResult.reason, /Sürüm uyuşmazlığı/);
        assert.strictEqual(degradedResult.ok, false);
        assert.strictEqual(degraded.status, SERVER_BOOT_STATUS.BLOCKED);
        assert.strictEqual(unreachableResult.ok, false);
        assert.strictEqual(unreachable.status, SERVER_BOOT_STATUS.ERROR);
      }
    )
  );
}

{
  assert.strictEqual(MAX_ACTIVE_MODULES, 15);
}

{
  const pool = new BattlePoolSelection({
    selectableModuleIds: ["laser-1", "shield-1", "armor-1", "repair-1", "cooler-1", "battery-1", "emp-1"],
    requiredSize: 6,
    attackModuleIds: ["laser-1"],
  });
  const noAttack = pool.setSelection(["shield-1", "armor-1", "repair-1", "cooler-1", "battery-1", "emp-1"]);
  assert.strictEqual(noAttack.ok, false);
  assert.match(noAttack.reason, /saldırı kartı/);
  assert.strictEqual(pool.isComplete(), false);
  assert.strictEqual(
    pool.setSelection(["laser-1", "shield-1", "armor-1", "repair-1", "cooler-1", "battery-1"]).ok,
    true
  );
  assert.strictEqual(pool.isComplete(), true);
}

{
  // Eğitim maçı: sunucu deste bildirirse kurulum oyuncunun destesiyle değil
  // o desteyle gönderilir; sonraki normal maçta iz kalmaz.
  const {
    RelayPvPClientState,
    RelayMatchmakingClientState,
    RelayOnlinePlayCoordinator,
  } = require("../src/relay-client.js");

  const ownDeck = ["rail", "armor", "emp", "virus", "drone", "barrier"];
  const tutorialDeck = ["laser", "shield", "repair", "cooler", "battery", "amplifier"];
  const core = [{instanceId:"core-1",definitionId:"core",x:2,y:1}];
  const setups = [];
  let response = {matched:true,session_id:"training-1",players:["a","b"],tutorial_deck:tutorialDeck};
  const coordinator = new RelayOnlinePlayCoordinator({
    playerId:"a",
    pvpState:new RelayPvPClientState({playerId:"a"}),
    matchmakingState:new RelayMatchmakingClientState(),
    connectionManager:{
      disconnect(){},
      clearOutgoingQueue(){},
      sendSetup(setup) { setups.push(setup); },
      sendReady(){},
      connect(){},
    },
    requestJson:async () => response,
    webSocketUrlFactory:(sessionId) => `ws://test/${sessionId}`,
    setTimer() { return 1; },
    clearTimer() {},
  });

  asyncTests.push((async () => {
    assert.strictEqual(coordinator.tutorialDeckIds, null);
    await coordinator.start({battlePoolIds:ownDeck,initialModules:core,tutorial:true});
    assert.deepStrictEqual(setups[0].battlePoolIds, tutorialDeck);
    assert.deepStrictEqual(coordinator.tutorialDeckIds, tutorialDeck);
    // Oyuncunun kendi listesi değişmez.
    assert.deepStrictEqual(ownDeck, ["rail", "armor", "emp", "virus", "drone", "barrier"]);

    response = {matched:true,session_id:"arena-1",players:["a","b"]};
    await coordinator.start({battlePoolIds:ownDeck,initialModules:core});
    assert.deepStrictEqual(setups[1].battlePoolIds, ownDeck);
    assert.strictEqual(coordinator.tutorialDeckIds, null);

    // Geçersiz deste bildirimi yok sayılır.
    response = {matched:true,session_id:"arena-2",players:["a","b"],tutorial_deck:["laser"]};
    await coordinator.start({battlePoolIds:ownDeck,initialModules:core});
    assert.deepStrictEqual(setups[2].battlePoolIds, ownDeck);
    assert.strictEqual(coordinator.tutorialDeckIds, null);

    // Özel savaş (arkadaş, takım) eğitim destesinden etkilenmez.
    response = {matched:true,session_id:"training-2",players:["a","b"],tutorial_deck:tutorialDeck};
    await coordinator.start({battlePoolIds:ownDeck,initialModules:core,tutorial:true});
    assert.deepStrictEqual(coordinator.tutorialDeckIds, tutorialDeck);
    coordinator.connectSession({session_id:"friend-1",players:["a","b"]},{battlePoolIds:ownDeck,initialModules:core});
    assert.deepStrictEqual(setups[4].battlePoolIds, ownDeck);
    assert.strictEqual(coordinator.tutorialDeckIds, null);

    await coordinator.start({battlePoolIds:ownDeck,initialModules:core,tutorial:true});
    assert.deepStrictEqual(coordinator.tutorialDeckIds, tutorialDeck);
    coordinator.reset();
    assert.strictEqual(coordinator.tutorialDeckIds, null);
  })());
}

Promise.all(asyncTests).then(() => {
  console.log("176 client tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
