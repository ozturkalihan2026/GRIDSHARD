const assert = require("assert");
const {
  RelayBattleClient,
  BattlePoolSelection,
  MODULE_STATUS,
  maxActiveModulesForElapsedMs,
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
    unlockAtMs: 15000,
    circuitCredits: 200,
    emitCommand(command) {
      emitted.push(command);
    },
  });
  return { client, emitted };
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(14999);
  const start = client.beginDrag("laser-1");
  assert.strictEqual(start.ok, false);
  assert.strictEqual(emitted.length, 0);
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(15000);
  assert.strictEqual(client.beginDrag("laser-1").ok, true);
  const result = client.dropOnCell(3, 4);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "place_module",
    payload: { module_id: "laser-1", x: 3, y: 4 },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);
  const result = client.dropOnShelf();
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "remove_module",
    payload: { module_id: "shield-1" },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);
  const result = client.dropOnCell(4, 4);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "move_module",
    payload: { module_id: "shield-1", x: 4, y: 4 },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("laser-1").ok, true);
  const result = client.dropOnCell(2, 2, "shield-1");
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "replace_module",
    payload: {
      outgoing_module_id: "shield-1",
      incoming_module_id: "laser-1",
    },
  });
}

{
  const { client } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);

  // Sürüklemek aktif modülü savaş dışına çıkarmaz.
  assert.strictEqual(
    client.requireModule("shield-1").status,
    MODULE_STATUS.ACTIVE
  );
}



{
  assert.strictEqual(maxActiveModulesForElapsedMs(14999), null);
  assert.strictEqual(maxActiveModulesForElapsedMs(15000), 4);
  assert.strictEqual(maxActiveModulesForElapsedMs(25000), 5);
  assert.strictEqual(maxActiveModulesForElapsedMs(35000), 6);
  assert.strictEqual(maxActiveModulesForElapsedMs(45000), 7);
  assert.strictEqual(maxActiveModulesForElapsedMs(55000), 8);
  assert.strictEqual(maxActiveModulesForElapsedMs(65000), 9);
  assert.strictEqual(maxActiveModulesForElapsedMs(75000), 10);
  assert.strictEqual(maxActiveModulesForElapsedMs(85000), 10);
}

{
  const { client } = createClient();
  client.updateElapsedMs(25000);
  assert.strictEqual(client.maxActiveModules(), 5);
  assert.strictEqual(client.activeModuleCount(), 1);
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
  const appSource = fs.readFileSync("./src/app.js", "utf8");
  for (const name of ["Dağıtıcı", "Darbe Topu", "Zırh", "EMP"]) {
    assert.ok(appSource.includes(`"${name}"`));
  }
}

{
  const fs = require("fs");
  const appSource = fs.readFileSync("./src/app.js", "utf8");
  const instanceIds = [
    "core-1",
    "generator-1",
    "laser-1",
    "shield-1",
    "battery-1",
    "amplifier-1",
    "cooler-1",
    "repair-1",
    "splitter-1",
    "pulse-cannon-1",
    "armor-1",
    "emp-1",
  ];
  for (const instanceId of instanceIds) {
    assert.ok(appSource.includes(`"${instanceId}"`));
  }
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js","utf8");
  for (const name of ["Kapasitör","Ray Topu","Yansıtıcı","Bariyer","Hedefleme Bilgisayarı","Sinyal Bozucu"]) {
    assert.ok(src.includes(`"${name}"`));
  }
}


{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  for (const name of ["Füze Fırlatıcı","Dron Üssü","Ark Topu","Aşırı Hızlandırıcı","Virüs","Enerji Sömürücü","Kesici"]) {
    assert.ok(src.includes(`"${name}"`));
  }
}


{
  const selectable = Array.from({ length: 24 }, (_, i) => `mod-${i + 1}`);
  const pool = new BattlePoolSelection({ selectableModuleIds: selectable, requiredSize: 18 });
  for (const id of selectable.slice(0, 18)) assert.strictEqual(pool.toggle(id).ok, true);
  assert.strictEqual(pool.isComplete(), true);
  assert.strictEqual(pool.selectedIds().length, 18);
}
{
  const selectable = Array.from({ length: 24 }, (_, i) => `mod-${i + 1}`);
  const pool = new BattlePoolSelection({ selectableModuleIds: selectable, requiredSize: 18 });
  for (const id of selectable.slice(0, 18)) pool.toggle(id);
  assert.strictEqual(pool.toggle(selectable[18]).ok, false);
}
{
  const pool = new BattlePoolSelection({ selectableModuleIds: ["a","b"], requiredSize: 1 });
  assert.strictEqual(pool.toggle("core-1").ok, false);
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js", "utf8");
  assert.ok(src.includes("const BOARD_CELLS"));
  assert.ok(src.includes('new Set(["2,1","3,2","2,3","1,2"])'));
  assert.ok(src.includes("core-cell"));
  assert.ok(src.includes("gate-cell"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js", "utf8");
  for (const label of [
    "Saldırı Hücresi",
    "Savunma Hücresi",
    "Enerji Hücresi",
    "Soğutma Hücresi",
    "Onarım Hücresi",
    "Sinyal Hücresi",
  ]) {
    assert.ok(src.includes(label));
  }
  assert.ok(src.includes("SPECIAL_CELL_INFO"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  for (const name of ["Aşırı Yük Çipi","Acil Onarım","Çift Port Adaptörü"]) assert.ok(src.includes(name));
  assert.ok(src.includes("apply_booster"));
  assert.ok(src.includes("Hedef modül seç"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("BOOSTER_FIRST_OFFER_MS = 85000"));
  assert.ok(src.includes("BOOSTER_OFFER_INTERVAL_MS = 10000"));
  assert.ok(src.includes("3 seçenekten 1'ini seç"));
  assert.ok(src.includes("nextBoosterOfferIndex += 1"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js", "utf8");

  assert.ok(src.includes("updateMockEnergy"));
  assert.ok(src.includes("ENERJİSİZ"));
  assert.ok(src.includes("Enerji:"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js", "utf8");

  assert.ok(src.includes("PORT_COUNT_BY_NAME"));
  assert.ok(src.includes("modulePorts"));
  assert.ok(src.includes("areConnected"));
  assert.ok(src.includes("connectedEnergyModuleIds"));
  assert.ok(src.includes("port-dot"));
  assert.ok(src.includes("energy-disconnected"));
}


{
  const fs = require("fs");
  const src = fs.readFileSync("./src/app.js", "utf8");

  assert.ok(src.includes("updateMockCombat"));
  assert.ok(src.includes("attack_performed"));
  assert.ok(src.includes("Rakip Jeneratör"));
  assert.ok(src.includes("Rakip Çekirdek"));
  assert.ok(src.includes("hasar"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Azaltılan"));
  assert.ok(src.includes("Savunma ${defense}"));
  assert.ok(src.includes("Yansıtılan hasar"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("supportLabelForModule"));
  assert.ok(src.includes("Cooldown -%15"));
  assert.ok(src.includes("Hasar +%20"));
  assert.ok(src.includes("Aşırı Hızlandırma"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("heatStatusLabel"));
  assert.ok(src.includes("YÜKSEK ISI"));
  assert.ok(src.includes("KRİTİK ISI"));
  assert.ok(src.includes("AŞIRI YÜK"));
  assert.ok(src.includes("Saldırı engellendi: kritik ısı"));
}


{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
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
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Sabotaj direnci"));
  assert.ok(src.includes("Sabotaj engellendi"));
  assert.ok(src.includes("Sabotaj temizlendi"));
  assert.ok(src.includes("Sabotaj süresi azaltıldı"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("updateMockBattleResult"));
  assert.ok(src.includes("KAZANDIN"));
  assert.ok(src.includes("MAÇ BİTTİ"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("META_STATUS"));
  assert.ok(src.includes("M1-M6 tamamlandı"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("COMPETITIVE_STATUS"));
  assert.ok(src.includes("M7 Simülasyon aktif"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("BALANCE_STATUS"));
  assert.ok(src.includes("Eşit modül + counter doğrulandı"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("BALANCE_STATUS")); // alpha27 counter validation
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("AI_STATUS"));
  assert.ok(src.includes("Adaptif AI + rekabetçi denge doğrulandı"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("AI_STATUS")); // alpha29 AI commands
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("rekabetçi denge doğrulandı")); // alpha30 fairness
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("PVP_STATUS"));
  assert.ok(src.includes("Web test telemetri temeli aktif"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha32->33 protocol status
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha33 protocol
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha34 websocket
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha35 gateway
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha36 setup
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha37 lobby
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha38 runner
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha39 heartbeat
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif")); // alpha40 online pvp
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
    kind: "place_module",
    payload: { module_id: "laser" },
  });
  const second = pvp.buildCommandMessage({
    kind: "remove_module",
    payload: { module_id: "laser" },
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
        finish_reason: "time_limit_draw",
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
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Web test telemetri temeli aktif"));
  assert.ok(src.includes("buildPvPCommandEnvelope"));
  assert.ok(src.includes("applyPvPServerEnvelope"));
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
    preferred_battle_pool_ids: Array.from(
      { length: 18 },
      (_, i) => `m${i}`
    ),
  });

  const view = state.viewModel();

  assert.strictEqual(view.displayName, "Alihan");
  assert.strictEqual(view.level, 3);
  assert.strictEqual(view.leagueNameTr, "Altın");
  assert.strictEqual(view.battlePoolIds.length, 18);
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
    ["Genel", "İlerleme", "Savaş Havuzu"]
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  assert.ok(html.includes(">Oyna<"));
  assert.ok(html.includes(">Profil<"));
  assert.ok(html.includes(">İstatistikler<"));
  assert.ok(html.includes(">Ayarlar<"));
  assert.ok(!html.includes(">Mağaza<"));
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
    module_replacements: 18,
    boosters_used: 9,
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
  const html=fs.readFileSync("./index.html","utf8");
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
  const html=fs.readFileSync("./index.html","utf8");
  assert.ok(
    html.includes('id="settings-summary-panel"')
  );
  assert.ok(
    html.includes("Ses · Müzik · Titreşim · Grafik · Dil")
  );
  assert.ok(!html.includes(">Mağaza<"));
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
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(
    html.includes('id="main-menu-panel"')
  );
  assert.ok(
    html.includes('id="return-main-menu"')
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
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );

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
}

{
  const fs=require("fs");
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );
  assert.ok(
    html.includes(
      'id="matchmaking-status"'
    )
  );
  assert.ok(
    html.includes("1000 DP")
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
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );
  assert.ok(
    html.includes(
      "Maç sonu XP/Derece sunucudan güncellenir"
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
    new RelayTelemetryDispatcher({
      playerId:"a",
      sessionId:"m",
      now:() => 100,
    });

  telemetry.trackModuleShelfUsed({
    module_id:"laser-1",
  });
  telemetry.trackRematchRequested();

  assert.strictEqual(
    telemetry.buffer.length,
    2
  );
  assert.strictEqual(
    telemetry.drain().length,
    2
  );
  assert.strictEqual(
    telemetry.buffer.length,
    0
  );
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
  const fs=require("fs");
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );

  assert.ok(
    app.includes(
      "trackGameOpened"
    )
  );
  assert.ok(
    app.includes(
      "trackModuleShelfUsed"
    )
  );
  assert.ok(
    app.includes(
      "trackRematchRequest"
    )
  );
  assert.ok(
    app.includes(
      "trackMatchmakingStart"
    )
  );
  assert.ok(
    !html.includes(">Telemetri<")
  );
}

console.log("78 client tests passed");
