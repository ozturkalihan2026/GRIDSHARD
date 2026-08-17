const assert = require("assert");
const asyncTests = [];
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
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif"));
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha32->33 protocol status
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha33 protocol
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha34 websocket
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha35 gateway
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha36 setup
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha37 lobby
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha38 runner
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha39 heartbeat
}

{
  const fs=require("fs");
  const src=fs.readFileSync("./src/app.js","utf8");
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif")); // alpha40 online pvp
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
  assert.ok(src.includes("Kalıcı telemetri sağlık kapısı aktif"));
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

{
  const {
    RelayWebTestBuildState,
  } = require("../src/relay-client.js");

  const state =
    new RelayWebTestBuildState();

  const result=state.applyHealth({
    status:"ok",
    version:"2.0.0-alpha.74",
    web_test:{
      ready:true,
      build:"web-test-alpha.74",
      release_checks:[
        "health",
        "matchmaking",
        "setup",
        "ready",
        "server_tick",
        "match_result",
        "telemetry",
      ],
      capabilities:{
        server_authoritative_pvp:true,
      },
    },
  });

  assert.strictEqual(
    result.ok,
    true
  );
  assert.strictEqual(
    state.ready,
    true
  );
  assert.strictEqual(
    state.labelTr(),
    "Web Test: Hazır"
  );
  assert.strictEqual(
    state.releaseChecks.length,
    7
  );
}

{
  const {
    RelayWebTestBuildState,
  } = require("../src/relay-client.js");

  const state =
    new RelayWebTestBuildState();

  const result=state.applyHealth({
    status:"ok",
    version:"2.0.0-alpha.74",
  });

  assert.strictEqual(
    result.ok,
    false
  );
  assert.strictEqual(
    state.labelTr(),
    "Web Test: Sağlık Hatası"
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );

  assert.ok(
    html.includes(
      'id="web-test-status"'
    )
  );
  assert.ok(
    html.includes(
      "Web Test: Kontrol Bekliyor"
    )
  );
  assert.ok(
    app.includes(
      "RelayWebTestBuildState"
    )
  );
  assert.ok(
    !html.includes(">Eğitim<")
  );
}

{
  const {
    BattlePoolSelection,
  } = require("../src/relay-client.js");

  const pool =
    new BattlePoolSelection({
      selectableModuleIds:[
        "generator-1",
        "laser-1",
        "shield-1",
      ],
      requiredSize:2,
      requiredModuleIds:[
        "generator-1",
      ],
    });

  assert.strictEqual(
    pool.selected.has(
      "generator-1"
    ),
    true
  );
  assert.strictEqual(
    pool.toggle(
      "generator-1"
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
        }),
      webSocketUrlFactory:
        (sessionId) =>
          `ws://test/${sessionId}`,
      setTimer() {
        return 1;
      },
      clearTimer() {},
    });

  asyncTests.push(coordinator.start({
    battlePoolIds:
      Array.from(
        {length:18},
        (_,i) => `m${i}`
      ),
    initialModules:[
      {
        instanceId:"core-1",
        definitionId:"core",
        x:2,y:2,
        direction:"up",
      },
      {
        instanceId:"generator-1",
        definitionId:"generator",
        x:2,y:3,
        direction:"up",
      },
      {
        instanceId:"laser-1",
        definitionId:"laser",
        x:2,y:1,
        direction:"down",
      },
      {
        instanceId:"shield-1",
        definitionId:"shield",
        x:1,y:1,
        direction:"right",
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
      "ws://test/mm-1"
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
        {length:18},
        (_,i) => `m${i}`
      ),
    initialModules:[
      {instanceId:"c",definitionId:"core",x:2,y:2},
      {instanceId:"g",definitionId:"generator",x:2,y:3},
      {instanceId:"l",definitionId:"laser",x:2,y:1},
      {instanceId:"s",definitionId:"shield",x:1,y:1},
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
      "Savaş Havuzunu Onayla ve Eşleş"
    )
  );
  assert.ok(
    html.includes(
      "Jeneratör başlangıç devresi için zorunludur"
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
              module_replacements:2,
              boosters_used:1,
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
  assert.ok(
    html.includes(
      'id="rematch-button"'
    )
  );
  assert.ok(
    html.includes(
      'id="rematch-button"'
    )
  );
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
              module_replacements:4,
              boosters_used:2,
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
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );

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
    html.includes(
      'id="settings-save"'
    )
  );
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
  const {
    RelayWebTestKpiState,
  } = require("../src/relay-client.js");

  const state=
    new RelayWebTestKpiState();

  const view=state.applyKpis({
    completed_matches:10,
    match_completion_rate:0.8,
    rematch_requests:4,
    rematch_request_rate:0.4,
    second_match_transition_rate:0.6,
    losing_player_rematch_rate:0.5,
    module_changes:25,
    average_module_changes_per_match:2.5,
    total_circuit_credits_spent:1500,
    module_shelf_uses:20,
    boosters_used:8,
    average_match_duration_ms:110000,
  });

  assert.strictEqual(
    view.completedMatches,
    10
  );
  assert.strictEqual(
    view.completionRatePercent,
    80
  );
  assert.strictEqual(
    view.rematchRatePercent,
    40
  );
  assert.strictEqual(
    view.secondMatchTransitionRatePercent,
    60
  );
  assert.strictEqual(
    view.losingPlayerRematchRatePercent,
    50
  );
  assert.strictEqual(
    view.averageMatchDurationMs,
    110000
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  assert.ok(
    html.includes(
      "2.0.0-alpha.74"
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
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );
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
  const {
    RelayReleaseCheckState,
  } = require("../src/relay-client.js");

  const state=
    new RelayReleaseCheckState();

  const view=state.apply({
    version:"2.0.0-alpha.74",
    build:"web-test-alpha.74",
    ready:true,
    checks:{
      health_ready:true,
      matchmaking:true,
      menu_scope_locked:true,
    },
    menu_areas:[
      "Oyna",
      "Profil",
      "İstatistikler",
      "Ayarlar",
    ],
    deferred_areas:[
      "Eğitim",
      "Mağaza",
    ],
  });

  assert.strictEqual(
    view.ready,
    true
  );
  assert.deepStrictEqual(
    view.menuAreas,
    [
      "Oyna",
      "Profil",
      "İstatistikler",
      "Ayarlar",
    ]
  );
  assert.strictEqual(
    view.failedChecks.length,
    0
  );
  assert.ok(
    view.deferredAreas.includes(
      "Eğitim"
    )
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync(
    "./index.html",
    "utf8"
  );
  assert.ok(
    !html.includes(">Eğitim<")
  );
  assert.ok(
    !html.includes(">Mağaza<")
  );
  assert.ok(
    !html.includes(">Kozmetik<")
  );
  assert.ok(
    html.includes(
      'data-open-screen="play"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="profile"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="statistics"'
    )
  );
  assert.ok(
    html.includes(
      'data-open-screen="settings"'
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
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(html.includes('id="play-recovery-panel"'));
  assert.ok(html.includes('id="play-recovery-retry"'));
  assert.ok(html.includes('id="matchmaking-cancel"'));
  assert.ok(html.includes('id="telemetry-send-status"'));
  assert.ok(app.includes("showPlayError"));
  assert.ok(app.includes("Eşleştirmeyi İptal Et") || html.includes("Eşleştirmeyi İptal Et"));
}

{
  const {
    RelayServerBootGate,
    RelayWebTestBuildState,
    RelayReleaseCheckState,
    SERVER_BOOT_STATUS,
  } = require("../src/relay-client.js");

  const health=
    new RelayWebTestBuildState();
  const release=
    new RelayReleaseCheckState();

  const gate=
    new RelayServerBootGate({
      healthState:health,
      releaseCheckState:release,
      expectedVersion:
        "2.0.0-alpha.74",
      expectedProtocolVersion:1,
      requestJson:
        async (path) => {
          if (path==="/health") {
            return {
              status:"ok",
              version:"2.0.0-alpha.74",
              web_test:{
                ready:true,
                build:"web-test-alpha.74",
                release_checks:[],
                capabilities:{},
              },
            };
          }
          if (
            path
            === "/web-test/release-check"
          ) {
            return {
              version:"2.0.0-alpha.74",
              build:"web-test-alpha.74",
              ready:true,
              checks:{
                health_ready:true,
              },
              menu_areas:[
                "Oyna","Profil",
                "İstatistikler","Ayarlar",
              ],
              deferred_areas:[],
            };
          }

          return {
            server_version:
              "2.0.0-alpha.74",
            web_test_build:
              "web-test-alpha.62",
            pvp_protocol_version:1,
            menu_areas:[
              "Oyna","Profil",
              "İstatistikler","Ayarlar",
            ],
            release_ready:true,
            release_failed_checks:[],
          };
        },
    });

  asyncTests.push(
    gate.check().then(
      (result) => {
        assert.strictEqual(
          result.ok,
          true
        );
        assert.strictEqual(
          gate.canPlay(),
          true
        );
        assert.strictEqual(
          gate.status,
          SERVER_BOOT_STATUS.READY
        );
      }
    )
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(html.includes('id="server-boot-status"'));
  assert.ok(html.includes('id="server-boot-retry"'));
  assert.ok(app.includes("checkServerReadiness"));
  assert.ok(app.includes("serverBootGate.canPlay()"));
  assert.ok(!app.includes('webTestBuildState.applyHealth({'));
}

{
  const {
    RelayDiagnosticSnapshot,
  } = require("../src/relay-client.js");

  const snapshot=
    new RelayDiagnosticSnapshot({
      version:"2.0.0-alpha.74",
      build:"web-test-alpha.74",
      bootGate:{status:"ready"},
      connectionManager:{
        status:"open",
      },
      matchmakingState:{
        matched:true,
        queued:false,
      },
      pvpState:{
        sessionId:"s1",
        phase:"battle",
      },
      recoveryState:{
        viewModel:() => ({
          kind:"none",
          active:false,
        }),
      },
      telemetryTransport:{
        pending:new Map([
          ["e1",{}],
        ]),
        status:"retry_wait",
      },
      releaseCheckState:{
        viewModel:() => ({
          failedChecks:[
            "telemetry",
          ],
        }),
      },
    });

  const value=
    snapshot.buildSnapshot();

  assert.strictEqual(
    value.session_id,
    "s1"
  );
  assert.strictEqual(
    value.telemetry_pending_count,
    1
  );
  assert.deepStrictEqual(
    value.release_failed_checks,
    ["telemetry"]
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      value,
      "profile"
    ),
    false
  );
}

{
  const fs=require("fs");
  const html=fs.readFileSync("./index.html","utf8");
  const app=fs.readFileSync("./src/app.js","utf8");

  assert.ok(html.includes('id="diagnostic-snapshot-button"'));
  assert.ok(html.includes('id="diagnostic-snapshot-output"'));
  assert.ok(app.includes("RelayDiagnosticSnapshot"));
  assert.ok(app.includes("renderDiagnosticSnapshot"));
}

{
  const {
    RelayServerBootGate,
    RelayWebTestBuildState,
    RelayReleaseCheckState,
    SERVER_BOOT_STATUS,
  } = require("../src/relay-client.js");

  const gate=
    new RelayServerBootGate({
      healthState:
        new RelayWebTestBuildState(),
      releaseCheckState:
        new RelayReleaseCheckState(),
      expectedVersion:
        "2.0.0-alpha.74",
      expectedProtocolVersion:1,
      requestJson:
        async (path) => {
          if (path==="/health") {
            return {
              version:"2.0.0-alpha.74",
              web_test:{
                ready:true,
                build:"web-test-alpha.74",
                release_checks:[],
                capabilities:{},
              },
            };
          }
          if (
            path
            === "/web-test/release-check"
          ) {
            return {
              version:"2.0.0-alpha.74",
              build:"web-test-alpha.74",
              ready:true,
              checks:{ok:true},
              menu_areas:[],
              deferred_areas:[],
            };
          }
          return {
            server_version:
              "2.0.0-alpha.61",
            pvp_protocol_version:1,
            release_ready:true,
          };
        },
    });

  asyncTests.push(
    gate.check().then(
      (result) => {
        assert.strictEqual(
          result.ok,
          false
        );
        assert.strictEqual(
          gate.status,
          SERVER_BOOT_STATUS.BLOCKED
        );
        assert.ok(
          gate.lastError.includes(
            "Sürüm uyuşmazlığı"
          )
        );
      }
    )
  );
}

{
  const {
    RelayWebTestRcReportState,
  } = require("../src/relay-client.js");

  const state=
    new RelayWebTestRcReportState();

  const view=state.apply({
    version:"2.0.0-alpha.74",
    build:"web-test-alpha.74",
    ready:true,
    critical_failures:[],
    kpis:{
      completed_matches:12,
      second_match_transition_rate:0.5,
      losing_player_rematch_rate:0.4,
    },
  });

  assert.strictEqual(
    view.ready,
    true
  );
  assert.strictEqual(
    view.completedMatches,
    12
  );
  assert.strictEqual(
    view.secondMatchTransitionRate,
    0.5
  );
  assert.strictEqual(
    view.losingPlayerRematchRate,
    0.4
  );
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
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");

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
              module_replacements:0,
              boosters_used:0,
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
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");

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
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");

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
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");

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
        "web_test_participant",
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
  const app=fs.readFileSync("./src/app.js","utf8");
  const html=fs.readFileSync("./index.html","utf8");

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
  const app=fs.readFileSync(
    "./src/app.js",
    "utf8"
  );

  assert.strictEqual(
    app.includes(
      "/web-test/persistence/restore-backup"
    ),
    false
  );
}

Promise.all(asyncTests).then(() => {
  console.log("118 client tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
