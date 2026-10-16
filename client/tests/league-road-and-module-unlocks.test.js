"use strict";

// Devre Yolu düzenlemesi (12 Ekim 2026): lig kademeleri, modüllerin arena ve
// lig girişlerine dağıtımı, kilitli kartta lig adı, efsanevi modülde Akı
// maliyeti, lige girişte açılan modülün ekranda tanıtılması, eğitimde Kalkan
// dersi ve GRIDSHARD Sandığı kozmetikleri.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const relay = read("src", "relay-client.js");
const serverCanon = JSON.parse(read("..", "server", "data", "arena_progression_v1.json"));
const tutorialSource = read("..", "server", "app", "game", "tutorial.py");

vm.runInThisContext(read("src", "canon-data.js"));
const canonModules = globalThis.GRIDSHARD_CANON_MODULES;
const en = (text) => i18n.translateText(text, "en");

const LEAGUES = [
  ["Kıvılcım Ligi", "Spark League"], ["Voltaj Ligi", "Voltage League"],
  ["Reaktör Ligi", "Reactor League"], ["Kuantum Ligi", "Quantum League"],
  ["Nexus Ligi", "Nexus League"], ["Şampiyonlar Ligi", "Champions League"],
  ["Efsanevi Lig", "Legendary League"],
];

function slice(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start > 0 && end > start, `bölüm bulunamadı: ${startMarker}`);
  return app.slice(start, end);
}

// --- Modül dağıtımı --------------------------------------------------------
test("istemci modül tablosu sunucunun açılış sırasını taşır", () => {
  assert.equal(canonModules.length, 36);
  const server = new Map(serverCanon.modules.map((item) => [item.id, item]));
  for (const item of canonModules) {
    assert.equal(item.unlock_arena, server.get(item.id).unlock_arena, item.id);
    assert.equal(item.unlock_trophies, server.get(item.id).unlock_trophies, item.id);
  }
  const arenaOne = canonModules.filter((item) => item.unlock_arena === 1).map((item) => item.id);
  assert.deepEqual([...arenaOne].sort(), ["amplifier", "battery", "cooler", "emp", "laser", "shield"]);
  for (let arena = 2; arena <= 12; arena += 1) {
    const count = canonModules.filter((item) => item.unlock_arena === arena).length;
    assert.ok(count === 2 || count === 3, `Arena ${arena}: ${count} modül`);
  }
  const leagueModules = canonModules.filter((item) => item.unlock_arena > 12);
  assert.equal(leagueModules.length, 7);
  // Efsanevi modüllerin yedisi de ilk lige (Kıvılcım Ligi I) girişte açılır.
  assert.ok(leagueModules.every((item) => item.rarity === "legendary"
    && item.unlock_arena === 13 && item.unlock_league === "spark"));
  assert.deepEqual([...new Set(leagueModules.map((item) => item.unlock_trophies))], [5400]);
  // Açılış kupası, modülün açıldığı arenanın (ya da ilk ligin) giriş kupasıdır.
  const floors = new Map(serverCanon.arenas.map((arena) => [arena.index, arena.minimum_rating]));
  for (const item of canonModules.filter((module) => module.unlock_arena <= 12)) {
    assert.equal(item.unlock_trophies, floors.get(item.unlock_arena), item.id);
  }
  // Tablo açılış sırasına göre dizilidir; koleksiyon bu sırayı kullanır.
  const order = canonModules.map((item) => item.unlock_arena);
  assert.deepEqual(order, [...order].sort((left, right) => left - right));
});

test("yedek arena eşikleri sunucunun kupa ölçeğiyle aynıdır", () => {
  const table = JSON.parse(app.match(/const ARENA_FLOOR_RATINGS = Object\.freeze\((\[[^\]]+\])\);/)[1]);
  const arenas = serverCanon.arenas;
  assert.deepEqual(table.slice(0, 12), arenas.map((arena) => arena.minimum_rating));
  assert.equal(table[12], arenas[11].maximum_rating + 1);
  assert.deepEqual(table, [0, 300, 600, 950, 1300, 1700, 2150, 2650, 3150, 3650, 4200, 4800, 5400]);
  arenas.slice(1).forEach((arena, index) => {
    assert.equal(arena.minimum_rating, arenas[index].maximum_rating + 1, arena.id);
  });
  // Durakların kimliği değişmedi; kupası arenasının yeni aralığındadır.
  for (const arena of arenas) {
    for (const node of arena.nodes.filter((item) => Object.keys(item.rewards || {}).length)) {
      assert.ok(node.trophies > arena.minimum_rating && node.trophies <= arena.maximum_rating + 1, node.id);
    }
  }
  assert.ok(!/profileRating \/ 300/.test(app));
});

test("başlangıç destesi Arena 1'in altı modülüdür", () => {
  const block = slice("const STARTER_BATTLE_POOL_PRESET", "function withStarterBattlePoolPresets");
  for (const id of ["laser", "shield", "battery", "cooler", "emp", "amplifier"]) {
    assert.ok(block.includes(`"${id}"`), id);
  }
  assert.ok(!block.includes('"repair"'));
});

// --- Kilitli kart etiketi ve maliyet ---------------------------------------
const rules = {
  metaProgressionState: { circuit_credits: 0, flux_shards: 0, universal_module_shards: 0 },
  document: { documentElement: { lang: "tr" } },
  localizedUiText: (value) => (rules.document.documentElement.lang === "en" ? en(value) : value),
  localizedMessage: (key, params) => i18n.t(key, params, rules.document.documentElement.lang),
  localizedNumber: (value) => String(value),
  GRIDSHARD_CANON_MODULES: canonModules,
};
rules.globalThis = rules;
vm.runInNewContext(`${slice("  function moduleUpgradeBlockReason(item) {", "  function moduleTalentSelectable(")}
Object.assign(this, { moduleUpgradeBlockReason, moduleUnlockStage, moduleUnlockBadge, moduleUnlockRequirement });`, rules);

test("kilitli kart arenada arena numarasını, ligde ligin adını yazar", () => {
  const repair = { definition_id:"repair", unlock_arena:2, unlock_trophies:300, unlock_stage_kind:"arena" };
  const spear = {
    definition_id:"ion_spear", unlock_arena:13, unlock_trophies:5400,
    unlock_stage_kind:"league", unlock_stage_name_tr:"Kıvılcım Ligi",
  };
  assert.equal(rules.moduleUnlockBadge(repair, "repair"), "ARENA 2");
  assert.equal(rules.moduleUnlockBadge(spear, "ion_spear"), "KIVILCIM");
  assert.equal(rules.moduleUnlockRequirement(repair), "Arena 2 · 300 Kupa");
  assert.equal(rules.moduleUnlockRequirement(spear), "Kıvılcım Ligi · 5400 Kupa");
  rules.document.documentElement.lang = "en";
  assert.equal(rules.moduleUnlockBadge(spear, "ion_spear"), "SPARK");
  assert.equal(rules.moduleUnlockRequirement(spear), "Spark League · 5400 trophies");
  rules.document.documentElement.lang = "tr";
});

test("sunucu aşama adını göndermese de lig modülü tablodan tanınır", () => {
  // Eski kayıtlı görünüm: yalnız kimlik var; sıra ve kupa istemci tablosundan gelir.
  assert.equal(rules.moduleUnlockBadge({ definition_id:"omega_amplifier" }, "omega_amplifier"), "KIVILCIM");
  assert.equal(rules.moduleUnlockStage({ definition_id:"omega_amplifier" }).trophies, 5400);
  assert.equal(rules.moduleUnlockRequirement({ definition_id:"omega_amplifier" }), "Kıvılcım Ligi · 5400 Kupa");
  assert.equal(rules.moduleUnlockBadge({ definition_id:"barrier" }, "barrier"), "ARENA 4");
});

test("efsanevi modülde Akı yetmezse yükseltme kapalıdır ve nedeni yazar", () => {
  const item = {
    definition_id:"ion_spear", unlocked:true, shards:14,
    next_upgrade_cost:{ circuit_credits:6600, shards:14, flux_shards:20 },
  };
  rules.metaProgressionState = { circuit_credits:6600, flux_shards:19, universal_module_shards:0 };
  assert.equal(rules.moduleUpgradeBlockReason(item), "Gerekli Akı: 20");
  assert.equal(en("Gerekli Akı: 20"), "Flux required: 20");
  rules.metaProgressionState.flux_shards = 20;
  assert.equal(rules.moduleUpgradeBlockReason(item), "");
  // Akı istemeyen modülde (eski sunucu alanı göndermez) kural değişmez.
  const common = { definition_id:"laser", unlocked:true, shards:2, next_upgrade_cost:{ circuit_credits:100, shards:2 } };
  rules.metaProgressionState = { circuit_credits:100, flux_shards:0, universal_module_shards:0 };
  assert.equal(rules.moduleUpgradeBlockReason(common), "");
});

test("yükselt düğmesi bedeli simgeyle gösterir; Akı bedeli de yazar", () => {
  // "DK" ve "AKI" yazısı yerine kaynakların simgesi (13 Ekim 2026).
  assert.match(app, /setCostButtonLabel\(upgrade, localizedUiText\(cost \? "YÜKSELT" : "AZAMİ SEVİYE"\), cost\s*\? \[\["credit", cost\.circuit_credits\], \.\.\.\(Number\(cost\.flux_shards\) > 0 \? \[\["flux", cost\.flux_shards\]\] : \[\]\)\]\s*: \[\]\);/);
  assert.ok(!/YÜKSELT · \$\{cost\.circuit_credits\} DK/.test(app));
  assert.equal(en("YÜKSELT"), "UPGRADE");
  assert.equal(en("AZAMİ SEVİYE"), "MAX LEVEL");
});

// --- Çeviriler -------------------------------------------------------------
test("36 lig kademesinin ve yeni unvanların İngilizcesi var", () => {
  for (const [nameTr, nameEn] of LEAGUES) {
    for (const numeral of ["I", "II", "III", "IV", "V"]) {
      assert.equal(en(`${nameTr} ${numeral}`), `${nameEn} ${numeral}`);
    }
    assert.equal(en(nameTr), nameEn);
  }
  assert.equal(en("GRIDSHARD Ligi"), "GRIDSHARD League");
  assert.equal(en("GRIDSHARD Sandığı"), "GRIDSHARD Chest");
  for (const [title, expected] of [
    ["Lig Öncüsü", "League Pioneer"], ["Nexus Stratejisti", "Nexus Strategist"],
    ["Şampiyon Operatör", "Champion Operator"], ["Efsane Mühendisi", "Legend Engineer"],
    ["GRIDSHARD Efsanesi", "GRIDSHARD Legend"],
  ]) assert.equal(en(title), expected);
  assert.equal(i18n.t("arena.legendary_range", { minimum:"8600" }, "tr"), "8600+ Kupa · Devre Yolu'nun zirvesi");
});

// --- Devre Yolu ------------------------------------------------------------
test("yol ekranı lige girişte açılan modülü ve ana ödülleri ayırır", () => {
  const road = slice("  function renderArenaPath() {", "  const CORE_VISUALS = Object.freeze({");
  assert.match(road, /item\.unlock_stage_id && item\.unlock_stage_id === stage\.id/);
  assert.match(road, /"BU LİGDE AÇILAN MODÜL"/);
  assert.match(road, /node\.is_main_reward \|\| node\.is_final_reward \? " is-main-reward" : ""/);
  assert.match(road, /rewards\.chest_id \|\| rewards\.profile_background_id/);
  assert.match(css, /\.arena-reward-node\.is-main-reward \{/);
  assert.match(css, /\.arena-reward-node\.is-final-reward \{/);
  assert.equal(en("BU LİGDE AÇILAN MODÜL"), "MODULE UNLOCKED IN THIS LEAGUE");
});

// --- Arenaya ve lige girişte modül tanıtımı --------------------------------
function fakeElement(tag) {
  const listeners = {};
  const element = {
    tag, children: [], className: "", textContent: "", dataset: {}, attributes: {}, open: false,
    setAttribute(key, value) { this.attributes[key] = String(value); },
    removeAttribute(key) { delete this.attributes[key]; },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    dispatchEvent(event) { for (const handler of listeners[event.type] || []) handler(event); },
    click() { this.dispatchEvent({ type:"click" }); },
  };
  if (tag === "dialog") {
    element.showModal = () => { element.open = true; };
    element.close = () => { element.open = false; element.dispatchEvent({ type:"close" }); };
  }
  return element;
}

function unlockSandbox() {
  const elements = {
    "module-unlock-dialog": fakeElement("dialog"),
    "module-unlock-list": fakeElement("div"),
    "module-unlock-title": fakeElement("h2"),
    "module-unlock-stage": fakeElement("p"),
    "module-unlock-close": fakeElement("button"),
  };
  const sandbox = {
    elements,
    opened: [],
    presented: [],
    loads: 0,
    selectedCollectionModuleId: null,
    metaProgressionState: { module_collection: [
      { definition_id:"ion_spear", name_tr:"İyon Mızrağı", rarity:"legendary", category:"saldırı",
        description_tr:"Delici ışın.", unlock_arena:13, unlock_stage_kind:"league", unlock_stage_name_tr:"Kıvılcım Ligi" },
      { definition_id:"prism_shield", name_tr:"Prizma Kalkanı", rarity:"legendary", category:"savunma",
        description_tr:"Yansıtır.", unlock_arena:13, unlock_stage_kind:"league", unlock_stage_name_tr:"Kıvılcım Ligi" },
      { definition_id:"disruptor", name_tr:"Kesici", rarity:"legendary", category:"sabotaj",
        description_tr:"Keser.", unlock_arena:13, unlock_stage_kind:"league", unlock_stage_name_tr:"Kıvılcım Ligi" },
      { definition_id:"repair", name_tr:"Onarım", rarity:"common", category:"destek",
        description_tr:"Onarır.", unlock_arena:2, unlock_stage_kind:"arena", unlock_stage_name_tr:"Röle Sokakları" },
      { definition_id:"armor", name_tr:"Zırh", rarity:"common", category:"savunma",
        description_tr:"Korur.", unlock_arena:2, unlock_stage_kind:"arena", unlock_stage_name_tr:"Röle Sokakları" },
    ] },
    document: {
      body: { dataset: { appScreen:"menu" } },
      documentElement: { lang:"tr" },
      getElementById: (id) => elements[id] || null,
      createElement: fakeElement,
    },
    Event: function Event(type) { this.type = type; },
    localizedUiText: (value) => value,
    serverCopy: (turkish) => turkish || "",
    localizedMessage: (key, params) => i18n.t(key, params, "tr"),
    localizedNumber: (value) => String(value),
    moduleIconFor: () => "◆",
    mountModuleEmblem: (element) => { element.textContent = "◆"; },
    moduleRarityLabel: (rarity) => (rarity === "legendary" ? "Efsanevi" : "Sıradan"),
    poolCategoryLabel: (category) => ({ "saldırı":"Saldırı", savunma:"Savunma" }[category] || "Destek"),
    openModuleDetail: () => sandbox.opened.push(sandbox.selectedCollectionModuleId),
    loadMetaProgression: async () => { sandbox.loads += 1; },
    presentArenaRewardEarnedInMatch: async (progression) => { sandbox.presented.push(progression); return false; },
  };
  vm.runInNewContext(`${slice("  // Yeni arenaya ya da lige girişte açılan modül ekrana gelerek tanıtılır.", "  // PvP'de kazanılan kupalar Devre Yolu'nda yeni bir ödül durağı açtıysa ana")}
Object.assign(this, { presentModuleUnlocks, presentRoadNewsEarnedInMatch });`, sandbox);
  return sandbox;
}

test("lige girişte açılan modül pencerede tanıtılır; kapanınca ödül durağına geçilir", async () => {
  const sandbox = unlockSandbox();
  const progression = { ratingBefore:5390, ratingAfter:5415, newlyUnlockedModuleIds:["ion_spear"] };
  await sandbox.presentRoadNewsEarnedInMatch(progression);

  const { elements } = sandbox;
  assert.equal(sandbox.loads, 1);
  assert.equal(elements["module-unlock-dialog"].open, true);
  assert.equal(elements["module-unlock-title"].textContent, "İyon Mızrağı");
  assert.equal(elements["module-unlock-stage"].textContent, "Kıvılcım Ligi açıldı");
  const cards = elements["module-unlock-list"].children;
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.moduleDefinitionId, "ion_spear");
  assert.deepEqual(cards[0].children.map((child) => child.textContent),
    ["◆", "İyon Mızrağı", "Efsanevi · Saldırı", "Delici ışın.", "KARTA BAK"]);
  assert.equal(sandbox.presented.length, 0, "pencere açıkken ödül durağı açılmaz");

  elements["module-unlock-close"].click();
  assert.equal(elements["module-unlock-dialog"].open, false);
  assert.deepEqual(sandbox.presented, [progression]);
});

test("tanıtılan karta dokunan oyuncu kart ayrıntısına gider, ödül durağı ayrıca açılmaz", async () => {
  const sandbox = unlockSandbox();
  await sandbox.presentRoadNewsEarnedInMatch({ newlyUnlockedModuleIds:["ion_spear"] });
  sandbox.elements["module-unlock-list"].children[0].click();
  assert.equal(sandbox.elements["module-unlock-dialog"].open, false);
  assert.deepEqual(sandbox.opened, ["ion_spear"]);
  assert.equal(sandbox.presented.length, 0);
});

test("arenada açılan modüller de pencerede tanıtılır; alt yazı arenayı söyler", async () => {
  const sandbox = unlockSandbox();
  const progression = { ratingBefore:290, ratingAfter:315, newlyUnlockedModuleIds:["repair", "armor"] };
  await sandbox.presentRoadNewsEarnedInMatch(progression);

  const { elements } = sandbox;
  assert.equal(elements["module-unlock-dialog"].open, true);
  assert.equal(elements["module-unlock-title"].textContent, "2 yeni modül");
  assert.equal(elements["module-unlock-stage"].textContent, "Arena 2 açıldı");
  assert.equal(elements["module-unlock-list"].dataset.layout, "full");
  const cards = elements["module-unlock-list"].children;
  assert.deepEqual(cards.map((card) => card.dataset.moduleDefinitionId), ["repair", "armor"]);
  assert.deepEqual(cards[1].children.map((child) => child.textContent),
    ["◆", "Zırh", "Sıradan · Savunma", "Korur.", "KARTA BAK"]);
  assert.equal(sandbox.presented.length, 0, "pencere açıkken ödül durağı açılmaz");

  elements["module-unlock-close"].click();
  assert.deepEqual(sandbox.presented, [progression]);
});

test("ilk lige girişte açılan efsanevi modüller tek pencerede, sıkışık satırlarla tanıtılır", async () => {
  const sandbox = unlockSandbox();
  await sandbox.presentRoadNewsEarnedInMatch({ newlyUnlockedModuleIds:["ion_spear", "prism_shield", "disruptor"] });
  const { elements } = sandbox;
  assert.equal(elements["module-unlock-dialog"].open, true);
  assert.equal(elements["module-unlock-title"].textContent, "3 yeni modül");
  assert.equal(elements["module-unlock-stage"].textContent, "Kıvılcım Ligi açıldı");
  assert.equal(elements["module-unlock-list"].children.length, 3);
  assert.equal(elements["module-unlock-list"].dataset.layout, "compact");
  // Başlık ve TAMAM düğmesi yerinde durur; yalnız kart listesi kayar.
  assert.match(css, /\.module-unlock-dialog\[open\] \{ display:flex;flex-direction:column; \}/);
  assert.match(css, /\.module-unlock-list \{[^}]*min-height:0;overflow-y:auto/);
  assert.match(css, /\.module-unlock-list\[data-layout="compact"\] \.module-unlock-card \{/);
});

test("yeni modül yoksa ya da koleksiyonda bulunmuyorsa pencere açılmaz, ödül durağı akışı sürer", async () => {
  for (const ids of [["bilinmeyen_modul"], [], undefined]) {
    const sandbox = unlockSandbox();
    const progression = { ratingBefore:290, ratingAfter:315, newlyUnlockedModuleIds:ids };
    await sandbox.presentRoadNewsEarnedInMatch(progression);
    assert.equal(sandbox.elements["module-unlock-dialog"].open, false);
    assert.deepEqual(sandbox.presented, [progression]);
  }
  // Ana ekranda değilken (ör. doğrudan yeni maça giren oyuncu) pencere açılmaz.
  const sandbox = unlockSandbox();
  sandbox.document.body.dataset.appScreen = "battle";
  await sandbox.presentRoadNewsEarnedInMatch({ newlyUnlockedModuleIds:["ion_spear"] });
  assert.equal(sandbox.elements["module-unlock-dialog"].open, false);
  assert.equal(sandbox.presented.length, 1);
});

test("maç sonucu yeni açılan modülleri taşır ve pencere sayfada tanımlıdır", () => {
  assert.match(relay, /newlyUnlockedModuleIds: Array\.isArray\(result\.newly_unlocked_module_ids\)/);
  assert.match(app, /void presentRoadNewsEarnedInMatch\(progression\);/);
  assert.match(html, /<dialog id="module-unlock-dialog" class="module-unlock-dialog" aria-labelledby="module-unlock-title">/);
  for (const id of ["module-unlock-title", "module-unlock-stage", "module-unlock-list", "module-unlock-close"]) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(css, /\.module-unlock-card \{[^}]*animation:module-unlock-arrive/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{ \.module-unlock-card \{ animation:none; \} \}/);
  assert.equal(en("YENİ MODÜL AÇILDI"), "NEW MODULE UNLOCKED");
  assert.equal(en("KARTA BAK"), "VIEW CARD");
  assert.equal(i18n.t("unlock.league_reached", { league:"Spark League" }, "en"), "Spark League reached");
  assert.equal(i18n.t("unlock.arena_reached", { arena:"12" }, "en"), "Arena 12 reached");
});

// --- Eğitim savaşı ---------------------------------------------------------
test("eğitim sahnelerinin hepsinin metni var; Onarım dersi Kalkan dersi oldu", () => {
  const stages = [...tutorialSource.matchAll(/TutorialStage\("([a-z_0-9]+)"/g)].map((match) => match[1]);
  assert.ok(stages.includes("deploy_shield") && stages.includes("watch_shield") && stages.includes("type_sabotage"));
  assert.ok(!stages.some((stage) => stage.includes("repair")));
  const block = slice("  const DIRECTED_BATTLE_STAGES = Object.freeze({", "  const DIRECTED_FINALE_BANNER_MS");
  for (const stage of stages) assert.ok(block.includes(`    ${stage}:{`), `metni yok: ${stage}`);
  assert.ok(!block.includes("deploy_repair") && !block.includes("Onarım kartına"));
  for (const text of [
    "Sabotaj modülleri",
    "EMP bir SABOTAJ modülüdür: rakibin enerji ve destek hatlarını kısa süre aksatır.",
    "Soğutucunun canı azaldı. Kalkan kartına dokun; rakibin ateşini üstüne çeker.",
    "Kalkan koruyor",
    "Rakip artık Kalkana ateş ediyor. Kalkan hasarı emiyor; Soğutucun güvende.",
    "Soğutucu ısınan modülleri soğutur, Güçlendirici saldırı gücünü artırır. Bunlar DESTEK modülleridir.",
  ]) {
    assert.ok(block.includes(text), text);
    assert.notEqual(en(text), text, `İngilizcesi yok: ${text}`);
  }
});

// --- GRIDSHARD Sandığı kozmetikleri ----------------------------------------
test("GRIDSHARD Sandığı'nın dört kozmetiği seçim listelerinde ve çizimi var", () => {
  for (const [list, end] of [
    ["const PROFILE_AVATARS = Object.freeze([", "const PROFILE_AVATAR_FRAMES"],
    ["const PROFILE_AVATAR_FRAMES = Object.freeze([", "const BATTLE_EMOJIS"],
    ["const BATTLE_EMOJIS = Object.freeze([", "const PROFILE_BACKGROUNDS"],
    ["const PROFILE_BACKGROUNDS = Object.freeze([", "const ACCOUNT_ONBOARDING_DISMISSED_KEY"],
  ]) {
    assert.match(slice(list, end), /id: ?"gridshard_apex"/, list);
  }
  assert.match(css, /\.profile-avatar\[data-avatar="gridshard_apex"\] \{/);
  assert.match(css, /\.profile-avatar\[data-frame="gridshard_apex"\] \{/);
  assert.match(css, /\.avatar-choice-list button\[data-frame="gridshard_apex"\] > span \{/);
  assert.match(css, /\.app-progress-ribbon\[data-profile-background="gridshard_apex"\],\.profile-identity-card\[data-profile-background="gridshard_apex"\] \{/);
  for (const kind of ["avatar", "frame", "emoji", "background"]) {
    assert.notEqual(i18n.t(`cosmetic.${kind}.gridshard_apex`, {}, "en"), `cosmetic.${kind}.gridshard_apex`);
  }
});

// --- Devre Yolu görünümü: çekirdek satırı, lig amblemleri, havada duran sandık ---
test("her ligin kendi amblemi vardır; kademe çentiklerle okunur", () => {
  const sandbox = {};
  vm.runInNewContext(`${slice("  const LEAGUE_EMBLEMS = Object.freeze({", "  // Maçta yeni açılan Devre Yolu ödülü")}
Object.assign(this, { LEAGUE_EMBLEMS, LEAGUE_EMBLEM_ASSETS, leagueEmblemMarkup });`, sandbox);
  const leagues = ["spark", "volt", "reactor", "quantum", "nexus", "champions", "legendary", "gridshard"];
  assert.deepEqual(Object.keys(sandbox.LEAGUE_EMBLEMS), leagues);
  assert.equal(new Set(Object.values(sandbox.LEAGUE_EMBLEMS)).size, 8, "sekiz farklı çizim");
  const accents = leagues.map((league) => {
    const marker = `.arena-path-stage[data-league="${league}"] { --league-accent:`;
    const at = css.indexOf(marker);
    assert.ok(at > 0, `rengi yok: ${league}`);
    return css.slice(at + marker.length, at + marker.length + 7);
  });
  assert.ok(accents.every((value) => /^#[0-9a-f]{6}$/.test(value)), accents.join(" "));
  assert.equal(new Set(accents).size, 8, "sekiz farklı renk");

  const third = sandbox.leagueEmblemMarkup({ league:"volt", league_tier:3, league_tiers:5 });
  assert.ok(third.includes(sandbox.LEAGUE_EMBLEM_ASSETS.volt));
  assert.equal((third.match(/<i(?:\s|>)/g) || []).length, 5);
  assert.equal((third.match(/class="is-on"/g) || []).length, 3);
  const single = sandbox.leagueEmblemMarkup({ league:"gridshard", league_tier:1, league_tiers:1 });
  assert.ok(single.includes(sandbox.LEAGUE_EMBLEM_ASSETS.gridshard) && !single.includes("league-emblem-tier"));
  // Lig bilgisini göndermeyen eski sunucuda eski taç simgesi kalır.
  assert.equal(sandbox.leagueEmblemMarkup({ id:"league_1", kind:"league" }), "♛");
});

test("yol ekranı çekirdeği ayrı satırda, lig sonu sandığını hücresiz çizer", () => {
  const road = slice("  function renderArenaPath() {", "  const CORE_VISUALS = Object.freeze({");
  // Çekirdek satırı modül satırından sonra ve ondan ayrı bir bölümdür.
  const modules = road.indexOf('localizedUiText("BU ARENADA AÇILAN MODÜLLER")');
  const cores = road.indexOf('localizedUiText("BU ARENADA AÇILAN ÇEKİRDEK")');
  assert.ok(modules > 0 && cores > modules);
  assert.match(road, /if \(arena\.core_unlock\?\.id\) \{/);
  assert.match(road, /coreArea\.className = "arena-module-unlocks arena-core-unlocks";/);
  assert.match(road, /selectedCollectionCoreId = core\.id;\s*openCoreDetail\(\);/);
  assert.equal(en("BU ARENADA AÇILAN ÇEKİRDEK"), "CORE UNLOCKED IN THIS ARENA");
  // Amblem ve renk
  assert.match(road, /if \(isLeagueStage\) marker\.innerHTML = leagueEmblemMarkup\(stage\);/);
  assert.match(road, /section\.dataset\.league = stage\.league;/);
  assert.match(road, /section\.style\.setProperty\("--stage-hue"/);
  // Hücresiz sandık: yalnız lig sandığı ve son durak; yol çizgisinin dışında durur.
  assert.match(road, /if \(node\.league_chest \|\| node\.is_final_reward\) \{\s*const stop = document\.createElement\("div"\);\s*stop\.className = `arena-reward-node is-floating-chest\$\{stateClass\}`;/);
  // Alınmış sandık açık (kapağı kalkmış) çizilir.
  assert.match(road, /chest\.innerHTML = leagueChestMarkup\(node\.league_chest \|\| stage\.league \|\| "gridshard", \{ open:Boolean\(node\.claimed\) \}\);/);
  // İçerik sandığın altında yazmaz; diğer sandıklardaki önizleme paneliyle görünür.
  assert.match(road, /bindRewardPreview\(chest, \{ title:rewardDescription, reward:node\.rewards \|\| \{\} \}\);/);
  assert.ok(!road.includes("arena-chest-contents") && !app.includes("leagueChestContents"));
  // Sandığa dokunmak önizlemeyi açar; almak için ayrı düğme vardır.
  assert.match(road, /claim\.className = "arena-league-chest-claim";/);
  assert.match(road, /claim\.addEventListener\("click", \(\) => claimLeagueNode\(node, claim\)\);/);
  assert.match(road, /chestStop\.className = "arena-league-chest-stop";/);
  assert.match(road, /if \(leagueRoad\.childElementCount\) section\.appendChild\(leagueRoad\);\s*if \(chestStop\) section\.appendChild\(chestStop\);/);
  // Lig sandığı mağaza sandığının çizimini kullanmaz; mağaza sandığı veren arena durağı ise
  // (Bronz, Gümüş, Altın, Elmas) mağazadaki çizimiyle görünür (görsel tur 6).
  const leagueChestBranch = road.slice(road.indexOf("if (node.league_chest || node.is_final_reward) {"), road.indexOf("chestStop.appendChild(stop);"));
  assert.ok(leagueChestBranch.length > 200 && !leagueChestBranch.includes("chestVisualMarkup("));
  assert.match(road, /if \(storeChestTier && STORE_CHEST_DEFINITION_IDS\.has\(rewards\.chest_id\)\) return chestVisualMarkup\(storeChestTier\);/);
  assert.match(app, /const STORE_CHEST_DEFINITION_IDS = new Set\(\["field_3h", "circuit_8h", "core_24h", "diamond_24h"\]\);/);
  const floating = css.match(/\.arena-reward-node\.is-floating-chest,[^{]*\{([^}]*)\}/)[1];
  assert.match(floating, /border:0;/);
  assert.match(floating, /background:none;/);
  assert.match(floating, /box-shadow:none;/);
  // Sandık havada süzülmez (13 Ekim 2026): yerinde durur, yalnız alınabilir olan zıplar.
  assert.ok(!css.includes("arena-chest-float"));
  assert.match(css, /\.arena-reward-node\.is-floating-chest\.is-claimable > \.league-chest-button \{ animation:arena-chest-hop/);
  assert.match(css, /body\[data-graphics="dusuk"\] \.arena-reward-node\.is-floating-chest\.is-claimable > \.league-chest-button,/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{\s*\.arena-reward-node\.is-floating-chest\.is-claimable > \.league-chest-button,/);
  // Ulaşılmamış aşamada sandık rengini korur.
  assert.match(css, /\.arena-path-stage:not\(\.is-unlocked\) > \.arena-league-chest-stop \{ filter:saturate\(\.72\) brightness\(\.84\); \}/);
  // Desenli arka plan ve opak kalan kilitli aşama kartı
  assert.match(css, /\.arena-detail-dialog\[open\] > \.arena-path \{\s*background:\s*radial-gradient/);
  assert.match(css, /\.arena-path-stage:not\(\.is-unlocked\) \{ opacity:1 !important; \}/);
});

// --- Lig sandıkları: mağaza sandıklarından ayrı ad, içerik ve çizim ---------
test("lig sandığı lige özel çizilir; içeriği önizleme panelinde görünür", () => {
  const sandbox = {};
  vm.runInNewContext(`${slice("  const LEAGUE_EMBLEMS = Object.freeze({", "  // Maçta yeni açılan Devre Yolu ödülü")}
Object.assign(this, { LEAGUE_EMBLEMS, leagueChestMarkup });`, sandbox);

  const spark = sandbox.leagueChestMarkup("spark");
  const volt = sandbox.leagueChestMarkup("volt");
  assert.match(spark, /^<svg class="league-chest" data-league-chest="spark"/);
  assert.ok(spark.includes(sandbox.LEAGUE_EMBLEMS.spark) && volt.includes(sandbox.LEAGUE_EMBLEMS.volt));
  assert.notEqual(spark, volt);
  // Mağaza sandığının çizim sınıfı (chest-visual) kullanılmaz.
  assert.ok(!spark.includes("chest-visual"));
  // Sandık dolu çizilir: gövde, metal köşebent ve kapak ayrı ayrı boyanır; çizgi
  // resim (yalnız kenar çizgisi) değildir.
  for (const part of ["lc-box", "lc-trim", "lc-lid", "lc-lock-plate", "lc-gem", "lc-rivet", "lc-inside"]) {
    assert.ok(spark.includes(`class="${part}"`), `${part} parçası yok`);
  }
  // color-mix tanımayan eski WebView için ilk dolgu ligin düz rengidir.
  assert.match(css, /\.league-chest \.lc-box \{ fill:var\(--lc-main\);fill:color-mix\(in srgb,var\(--lc-main\) 80%,#160d2c\); \}/);
  assert.match(css, /\.league-chest \.lc-trim \{ fill:var\(--lc-trim\); \}/);
  const colors = ["spark", "volt", "reactor", "quantum", "nexus", "champions", "legendary", "gridshard"]
    .map((league) => css.match(new RegExp(`\\.league-chest\\[data-league-chest="${league}"\\] \\{ --lc-main:(#[0-9a-f]{6});`))?.[1]);
  assert.ok(colors.every(Boolean), "her ligin sandık rengi tanımlı olmalı");
  assert.equal(new Set(colors).size, 8);
  // Açık sandık: kapak kalkar.
  const opened = sandbox.leagueChestMarkup("spark", { open:true });
  assert.match(opened, /^<svg class="league-chest is-open" data-league-chest="spark"/);
  assert.match(css, /\.league-chest\.is-open \.lc-lid \{ transform:translateY\(-23px\) rotate\(-7deg\) scaleY\(\.74\); \}/);

  // Önizleme davranışı mağaza ve sezon sandıklarıyla ortaktır.
  const shared = slice("  function createRewardChestButton({", "  document.addEventListener(\"pointerdown\", (event) => {");
  assert.match(shared, /bindRewardPreview\(button, \{ title, reward, note \}\);\s*return button;/);
  assert.match(shared, /function bindRewardPreview\(button, options\) \{/);
  assert.match(shared, /if \(event\.pointerType === "mouse"\) showRewardPreview\(button, options\);/);
  for (const [nameTr, nameEn] of [
    ["Kıvılcım Sandığı", "Spark Chest"], ["Voltaj Sandığı", "Voltage Chest"], ["Reaktör Sandığı", "Reactor Chest"],
    ["Kuantum Sandığı", "Quantum Chest"], ["Nexus Sandığı", "Nexus Chest"],
    ["Şampiyonlar Sandığı", "Champions Chest"], ["Efsane Sandığı", "Legend Chest"],
  ]) assert.equal(en(nameTr), nameEn);
  assert.equal(i18n.t("reward.chest_preview_aria", { name:"Spark Chest" }, "en"), "Spark Chest · show contents");
});

test("istemcinin bildirdiği eğitim betiği sürümü sunucununkiyle aynıdır", () => {
  const server = Number(tutorialSource.match(/^TUTORIAL_SCRIPT_VERSION = (\d+)$/m)[1]);
  const client = Number(relay.match(/tutorial_script: (\d+)/)[1]);
  assert.equal(client, server);
});

test("yol penceresinin satırları açıkça verilir; alt çubuk yolun sonunu örtmez", () => {
  // Durum yazısı boşken gizlendiği için satırlar kendiliğinden kayar ve alt çubuk
  // 0 piksellik satıra düşerdi: son ligin altı alt çubuğun arkasında kalıyordu.
  assert.match(html, /<dialog id="arena-detail-dialog"[^>]*>\s*<header class="arena-road-header">/);
  assert.match(css, /\.arena-detail-dialog\[open\] > \.arena-road-header \{ grid-row:1; \}/);
  assert.match(css, /\.arena-detail-dialog\[open\] > #arena-reward-status \{ grid-row:2; \}/);
  assert.match(css, /\.arena-detail-dialog\[open\] > \.arena-path \{ grid-row:3; \}/);
  assert.match(css, /\.arena-detail-dialog\[open\] > \.arena-path-footer \{ grid-row:4; \}/);
});
