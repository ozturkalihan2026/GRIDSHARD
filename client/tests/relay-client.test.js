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

console.log("27 client tests passed");
