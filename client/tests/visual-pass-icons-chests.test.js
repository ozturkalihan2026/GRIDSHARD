"use strict";

// Görsel tur (13 Ekim 2026): yazıların yanında eşleşen renkli simgeler, simgeli
// maliyet rozetleri, modüle özgü değer karoları, dolu çizilen lig sandıkları ve
// açılışı, ayrık hücreli alt çubuk, Çekirdek gücü düğmesi ve savaşta modül
// çevrimlerinin görünmesi.
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
const sheet = read("..", "server", "app", "game", "module_sheet.py");
const en = (text) => i18n.translateText(text, "en");

function slice(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start > 0 && end > start, `bölüm bulunamadı: ${startMarker}`);
  return app.slice(start, end);
}

function fakeElement(tag) {
  const element = {
    tag, children: [], className: "", textContent: "", innerHTML: "", dataset: {}, attributes: {}, classes: new Set(),
    setAttribute(key, value) { this.attributes[key] = String(value); },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
  };
  element.classList = { toggle(name, on) { if (on) element.classes.add(name); else element.classes.delete(name); } };
  return element;
}

function iconSandbox(lang = "tr") {
  const sandbox = {
    document: { documentElement: { lang }, createElement: fakeElement },
    uiLocale: () => (sandbox.document.documentElement.lang === "en" ? "en-US" : "tr-TR"),
    localizedUiText: (value) => (sandbox.document.documentElement.lang === "en" ? en(value) : value),
  };
  vm.runInNewContext(`${slice("  const UI_ICON_PATHS = Object.freeze({", "  function resourceSymbolMarkup(kind) {")}
Object.assign(this, { UI_ICON_PATHS, UI_ART_ICONS, STAT_ICONS, resourceTokenVisual, uiIconMarkup, createCostChip, setCostButtonLabel });`, sandbox);
  return sandbox;
}

// --- Simge takımı --------------------------------------------------------------
test("her değer anahtarının simgesi ve tonu tanımlıdır", () => {
  const sandbox = iconSandbox();
  const tones = new Set([...css.matchAll(/\.ui-icon\[data-tone="([a-z]+)"\]/g)].map((match) => match[1]));
  for (const [key, [icon, tone]] of Object.entries(sandbox.STAT_ICONS)) {
    assert.ok(sandbox.UI_ICON_PATHS[icon] || sandbox.UI_ART_ICONS[icon], `${key}: ${icon} simgesi yok`);
    assert.ok(tones.has(tone), `${key}: ${tone} tonu stil dosyasında yok`);
  }
  // Sunucunun gönderdiği her modüle özgü değerin kendi simgesi vardır.
  const serverKeys = new Set([...sheet.matchAll(/_(?:special|percent|seconds)\(\s*"([a-z_]+)"/g)].map((match) => match[1]));
  assert.ok(serverKeys.size >= 25);
  for (const key of serverKeys) assert.ok(sandbox.STAT_ICONS[key], `${key} değerinin simgesi yok`);
  const markup = sandbox.uiIconMarkup("shield", "blue");
  assert.match(markup, /^<i class="ui-icon is-artwork" data-icon="shield" data-tone="blue" aria-hidden="true">/);
  assert.ok(markup.includes('data-ui-art="detail-guard"'));
  // Bilinmeyen simge boş çizmez.
  assert.ok(sandbox.uiIconMarkup("yok").includes(sandbox.UI_ICON_PATHS.star));
});

test("maliyet rozeti para biriminin adını değil simgesini gösterir", () => {
  const sandbox = iconSandbox();
  const chip = sandbox.createCostChip("credit", 2200);
  assert.equal(chip.className, "cost-chip");
  assert.equal(chip.dataset.kind, "credit");
  const [icon, value] = chip.children;
  // Simge, üst bardaki ve ödül satırlarındaki Devre Kredisi çizimiyle aynıdır.
  assert.equal(icon.className, "cost-chip-icon is-token");
  assert.equal(icon.dataset.token, "credit");
  assert.equal(icon.innerHTML, sandbox.resourceTokenVisual("credit"));
  assert.equal(value.textContent, "2.200");
  // Ekran okuyucu için adı etikette durur.
  assert.equal(chip.attributes["aria-label"], "2.200 Devre Kredisi");

  const button = fakeElement("button");
  sandbox.setCostButtonLabel(button, "YÜKSELT", [["credit", 100], ["flux", 20]]);
  assert.equal(button.children[0].textContent, "YÜKSELT");
  assert.deepEqual(button.children.slice(1).map((child) => child.dataset.kind), ["credit", "flux"]);
  assert.ok(button.classes.has("has-cost-chips"));
  assert.equal(button.attributes["aria-label"], "YÜKSELT · 100 Devre Kredisi · 20 Akı");
  // Görünen yazıda "DK" ve "AKI" kalmaz.
  const visible = button.children.map((child) => child.textContent || child.children.map((part) => part.textContent).join("")).join(" ");
  assert.ok(!/DK|AKI/.test(visible), visible);
  sandbox.setCostButtonLabel(button, "AZAMİ SEVİYE", []);
  assert.equal(button.children.length, 1);
  assert.ok(!button.classes.has("has-cost-chips"));
  sandbox.setCostButtonLabel(null, "x", []);

  const english = iconSandbox("en");
  assert.equal(english.createCostChip("flux", 60).attributes["aria-label"], "60 Flux");
  assert.match(css, /\.resource-symbol\.is-token,\s*\.cost-chip-icon\.is-token \{/);
});

test("bilgi penceresinde bedeller ve yetenek Akı'sı simgeyle yazılır", () => {
  assert.match(app, /setCostButtonLabel\(upgrade, localizedUiText\(cost \? "YÜKSELT" : "AZAMİ SEVİYE"\), cost \? \[\["flux", cost\.flux_shards\]\] : \[\]\);/);
  assert.match(app, /level\.append\(levelValue, createCostChip\("flux", node\.flux_cost\)\);/);
  assert.match(app, /setCostButtonLabel\(resetButton, localizedUiText\("SIFIRLA"\), \[\["flux", resetCost\]\]\);/);
  assert.ok(!app.includes("levelCost.textContent = `${node.flux_cost} Akı`;"));
  assert.equal(en("YETENEKLERİ SIFIRLA"), "RESET TALENTS");
});

// --- Modüle özgü değer karoları ------------------------------------------------
test("istatistik sekmesi soyut çarpan yerine modülün kendi değerlerini ve farkını yazar", () => {
  const tiles = slice("  function createModuleStatTiles(item) {", "  // Three distinct views:");
  assert.match(tiles, /const cycle = moduleCycleEntry\(stats, nextStats\);/);
  assert.match(tiles, /const specials = specialEntries\(stats, nextStats\);/);
  assert.match(tiles, /\.\.\.\(specials\.length\s*\? specials\.map\(\(special\) => \(\{ \.\.\.special, key:`special-\$\{special\.key\}` \}\)\)/);
  // Eski sunucu değerleri göndermezse etki çarpanı yazılır.
  assert.match(tiles, /: \[\{ key:"effect", icon:"star", tone:"violet", label:"ETKİ ÇARPANI"/);
  // Hasar karosu yalnız hasar veren modülde çıkar.
  assert.match(tiles, /\.\.\.\(Number\(stats\.base_damage\) > 0\s*\? \[\{ key:"damage", icon:"damage", tone:"red", label:"HASAR"/);
  assert.match(tiles, /const gain = createStatGain\(tile\.current, tile\.next, tile\.unit\);\s*if \(gain\) value\.append\(" ", gain\);/);
  assert.match(tiles, /name\.textContent = tile\.label;/);
  assert.match(tiles, /row\.append\(createUiIcon\(tile\.icon, tile\.tone\), name, value\);/);
  for (const [label, expected] of [["ÇALIŞMA", "OPERATION"], ["SÜREKLİ", "ALWAYS ON"]]) assert.equal(en(label), expected);
});

test("sunucunun değer etiketleri iki dildedir ve başlık kutusuna sığacak kısalıktadır", () => {
  const labels = [...sheet.matchAll(/_(?:special|percent|seconds)\(\s*"[a-z_]+", "([^"]+)", "([^"]+)"/g)];
  assert.ok(labels.length >= 30);
  for (const [, labelTr, labelEn] of labels) {
    assert.ok(labelTr.length <= 16, `Türkçe etiket uzun: ${labelTr}`);
    assert.ok(labelEn.length <= 18, `İngilizce etiket uzun: ${labelEn}`);
    assert.ok(/^[\x20-\x7E]+$/.test(labelEn), `İngilizce etiket ASCII değil: ${labelEn}`);
  }
  // Çevrim adları
  const cycles = [...sheet.matchAll(/"[a-zçğıöşü_]+": \("([^"]+)", "([^"]+)"\),/g)];
  assert.ok(cycles.length >= 18);
  for (const [, labelTr, labelEn] of cycles) assert.ok(labelTr.length <= 16 && labelEn.length <= 18, `${labelTr} / ${labelEn}`);
});

// --- Sabit sayfadaki simgeler ---------------------------------------------------
test("başlıklar, sekmeler ve menü satırları eşleşen simgeyle süslenir", () => {
  const sandbox = iconSandbox();
  const marked = [...html.matchAll(/<h[23][^>]* data-ui-icon="([a-z]+):([a-z]+)"[^>]*>([^<]+)</g)];
  assert.ok(marked.length >= 28, String(marked.length));
  for (const [, icon, , heading] of marked) assert.ok(sandbox.UI_ICON_PATHS[icon] || sandbox.UI_ART_ICONS[icon], `${heading}: ${icon} simgesi yok`);
  // Kullanıcının örneği: "Arkadaşlar" yazısının solunda iki kişi.
  assert.match(html, /<h3 data-ui-icon="people:green">Arkadaşlar<\/h3>/);
  assert.match(html, /<h3 id="chest-store-title" data-ui-icon="chest:gold">Sandık Satın Al<\/h3>/);
  assert.match(html, /id="home-battle-button"[\s\S]*?src="\.\/assets\/ui\/dock-casual-v1\/battle-swords-v2\.webp"[\s\S]*?<span>SAVAŞ<\/span>/);

  const decorate = slice("  function decorateStaticIcons() {", "  decorateStaticIcons();");
  for (const [selector, icon] of [
    ['#lobby-menu [data-open-screen="avatar"]', "palette"],
    ['#lobby-menu [data-open-screen="daily"]', "gift"],
    ['#lobby-menu [data-open-screen="friends"]', "people"],
    ['#lobby-menu [data-open-screen="settings"]', "gear"],
    ['[data-module-detail-tab="stats"], [data-core-detail-tab="stats"]', "bars"],
  ]) {
    assert.ok(decorate.includes(`['${selector}', "${icon}",`), `${selector} süslenmiyor`);
    assert.ok(sandbox.UI_ICON_PATHS[icon] || sandbox.UI_ART_ICONS[icon]);
  }
  assert.match(decorate, /for \(const element of document\.querySelectorAll\("\[data-ui-icon\]"\)\) \{/);
  // Aynı öğe iki kez süslenmez.
  assert.match(decorate, /if \(element\.querySelector\(":scope > \.ui-icon, :scope > \.resource-symbol\.is-token"\)\) continue;/);
  assert.match(css, /\.dropdown-menu > button\.has-ui-icon \{/);
});

test("alt çubuk ayrık hücrelidir; adı yalnız açık sayfanın düğmesi taşır ve o düğme büyür", () => {
  for (const screen of ["shop", "modules", "menu", "team", "events"]) {
    assert.match(css, new RegExp(`#app-bottom-dock \\.menu-action\\[data-open-screen="${screen}"\\] \\{ --dock-a:#[0-9a-f]{6};--dock-b:#[0-9a-f]{6};--dock-tone:#[0-9a-f]{6}; \\}`));
  }
  const title = css.match(/body:not\(\[data-app-screen="play"\]\) #app-bottom-dock \.menu-action \.menu-action-title \{([^}]*)\}/)[1];
  // Kullanıcının kararı (13 Ekim 2026): "tıklanan butonun ismi yazsın ve buton
  // biraz büyüsün" — diğer dört düğme yalnız simgedir.
  assert.match(title, /display:none !important;/);
  assert.match(css, /#app-bottom-dock \.menu-action\.is-active \.menu-action-title \{ display:block !important; \}/);
  // Android en küçük yazı boyu 8 pikseldir.
  assert.match(title, /font:800 \.56rem\/1\.1 var\(--gs-font-display\) !important;/);
  const cell = css.match(/body:not\(\[data-app-screen="play"\]\) #app-bottom-dock \.menu-action \{([^}]*)\}/)[1];
  assert.match(cell, /border:1px solid rgba\(120,170,210,\.24\) !important;/);
  assert.match(cell, /flex:1 1 0 !important;/);
  // Açık düğme genişler, yukarı doğru uzar ve simgesi büyür.
  const active = css.match(/#app-bottom-dock \.menu-action\.is-active \{([^}]*)\}/)[1];
  assert.match(active, /flex-grow:1\.62 !important;/);
  assert.match(active, /height:60px !important;/);
  assert.match(active, /margin-top:-10px !important;/);
  assert.match(css, /#app-bottom-dock \.menu-action\.is-active \.lobby-dock-icon \{ width:36px !important;height:36px !important;filter:none; \}/);
  // Gizlenen adlar ekran okuyucuda durur.
  for (const [screen, label] of [["shop", "Mağaza"], ["modules", "Kartlar"], ["menu", "Savaş"], ["team", "Takım"], ["events", "Etkinlik"]]) {
    assert.match(html, new RegExp(`data-open-screen="${screen}" data-shell-screen="${screen}" aria-label="${label}" title="${label}"`));
  }
});

// --- Lig sandığının açılışı ------------------------------------------------------
test("lig sandığı açılış penceresiyle alınır; ödüller sunucu onayından sonra görünür", () => {
  const road = slice("  function renderArenaPath() {", "  const CORE_VISUALS = Object.freeze({");
  const claim = road.slice(road.indexOf("const claimLeagueNode = async (node, control) => {"), road.indexOf("for (const node of stage.nodes || []) {"));
  assert.match(claim, /const chestLeague = node\.league_chest \|\| \(node\.is_final_reward \? \(stage\.league \|\| "gridshard"\) : ""\);/);
  // Önce açılış (titreyen kapalı sandık), sunucu onaylayınca ödüller.
  assert.ok(claim.indexOf("showLeagueChestOpening(chestLeague") < claim.indexOf("await metaProgressionMutation("));
  assert.ok(claim.indexOf("await metaProgressionMutation(") < claim.indexOf("showLeagueChestReveal(node.rewards || {})"));
  assert.match(claim, /if \(chestLeague\) showChestFailure\(error\);/);
  // Ara ödüller (sandık olmayan duraklar) pencere açmaz.
  assert.match(claim, /if \(chestLeague\) showLeagueChestOpening\(/);

  const sandbox = { casualChestAsset:()=>"", document: { getElementById: () => null, querySelector: () => null } };
  vm.runInNewContext(`${slice("  const LEAGUE_EMBLEMS = Object.freeze({", "  // Maçta yeni açılan Devre Yolu ödülü")}
Object.assign(this, { leagueChestMarkup, setChestRevealVisual, LEAGUE_CHEST_OPENING_MIN_MS });`, sandbox);
  assert.ok(sandbox.LEAGUE_CHEST_OPENING_MIN_MS >= 600);
  sandbox.setChestRevealVisual({ league:"volt" }); // öğeler yokken hata vermez
  const card = { dataset: {} };
  const visual = { className: "", innerHTML: "" };
  sandbox.document.getElementById = (id) => ({ "chest-reveal-card": card, "chest-reveal-visual": visual }[id] || null);
  sandbox.setChestRevealVisual({ tier:"gold", league:"volt" });
  assert.equal(card.dataset.league, "volt");
  assert.equal(visual.className, "chest-reveal-league");
  assert.match(visual.innerHTML, /^<svg class="league-chest" data-league-chest="volt"/);
  assert.equal((visual.innerHTML.match(/<i><\/i>/g) || []).length, 10);
  // Mağaza sandığı açılırken pencere kendi çizimine döner.
  sandbox.setChestRevealVisual({ tier:"silver" });
  assert.equal(card.dataset.league, undefined);
  assert.equal(visual.className, "chest-visual chest-visual-large chest-visual-silver");
  assert.match(visual.innerHTML, /^<svg class="shop-chest" viewBox="0 0 100 86"/);
  for (const name of ["showChestReveal", "showBulkChestReveal", "showChestOpening", "showClaimedChest"]) {
    const body = app.slice(app.indexOf(`  function ${name}(`), app.indexOf("\n  }\n", app.indexOf(`  function ${name}(`)));
    assert.ok(body.includes("setChestRevealVisual({ tier,"), `${name} pencerenin çizimini sıfırlamıyor`);
  }

  const reveal = slice("  function showLeagueChestReveal(rewards = {}) {", "  // Maçta yeni açılan Devre Yolu ödülü");
  assert.match(reveal, /document\.querySelector\("#chest-reveal-visual \.league-chest"\)\?\.classList\.add\("is-open"\);/);
  assert.match(reveal, /const rows = createRewardRows\(rewards\);/);
  assert.match(reveal, /row\.style\.setProperty\("--reveal-index", String\(index\)\)/);

  for (const keyframes of ["lc-opening-shake", "lc-rays-burst", "lc-spark-fly", "lc-reward-in", "arena-chest-hop"]) {
    assert.ok(css.includes(`@keyframes ${keyframes} `), `${keyframes} yok`);
  }
  assert.match(css, /\.chest-reveal-card\[data-league\]\[data-state="revealed"\] \.reward-resource-row \{\s*animation:lc-reward-in/);
  // Hareket azaltma ve düşük grafik: açılış animasyonsuz da okunur.
  assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{\s*\.chest-reveal-league > \.league-chest,/);
  assert.match(css, /body\[data-graphics="dusuk"\] \.chest-reveal-league \.lc-rays,/);
});

// --- Savaş ----------------------------------------------------------------------
test("Çekirdek gücü düğmesi halkayla dolar; hazır olunca döner, atar ve etiketi değişir", () => {
  const base = css.match(/\nbody\[data-app-screen="play"\] \.core-power-button \{([^}]*)\}/g).pop();
  assert.match(base, /width:54px !important;/);
  assert.match(base, /overflow:visible !important;/);
  const ring = css.match(/body\[data-app-screen="play"\] \.core-power-button::before \{([^}]*)\}/)[1];
  assert.match(ring, /background:conic-gradient\(from 0deg,var\(--core-ring\) var\(--core-charge\),rgba\(46,74,104,\.95\) 0\);/);
  assert.match(ring, /mask:radial-gradient\(farthest-side,transparent calc\(100% - 7px\),#000 calc\(100% - 6px\)\);/);
  assert.match(css, /\.core-power-button\[data-ready="true"\] \{\s*cursor:pointer;\s*animation:gs-core-button-beat/);
  assert.match(css, /\.core-power-button\[data-ready="true"\]::before \{[^}]*animation:gs-core-button-spin 1\.6s linear infinite;/);
  assert.match(css, /\.core-power-button\[data-ready="true"\] \.core-power-glyph::after \{[^}]*animation:gs-core-button-ping/);
  // Etiket 8 pikselden küçük değildir (Android WebView en küçük yazı boyu).
  assert.match(css, /\.core-power-button > small \{[^}]*font:900 \.5rem\/1\.15 var\(--gs-font-display\) !important;/);
  assert.match(css, /body\[data-graphics="dusuk"\]\[data-app-screen="play"\] \.core-power-button\[data-ready="true"\]::before,/);
  // Düğmenin yapısı ve durum yazıları değişmedi.
  assert.match(html, /<button id="core-power-button" class="core-power-button" type="button" aria-pressed="false" disabled>\s*<span class="core-power-glyph" aria-hidden="true">◈<\/span>\s*<small id="core-power-charge">0%<\/small>/);
  assert.match(app, /\? \(halfPhaseReady \? "YARIM" : "HAZIR"\)/);
});

test("modül çevrimleri savaşta görünür: blok, ayna, kubbe, direnç ve destek darbesi", () => {
  const types = slice("  const SIGNATURE_EVENT_TYPES = new Set([", "  ]);");
  assert.ok(types.includes('"module_cycle_pulse"') && types.includes('"amplifier_pulse"'));
  const presentation = slice("  const CYCLE_PULSE_PRESENTATION = Object.freeze({", "  });");
  for (const [kind, effect, label, labelEn] of [
    ["block", "cycle_block", "BLOK", "BLOCK"], ["mirror", "cycle_mirror", "AYNA", "MIRROR"],
    ["dome_guard", "cycle_dome", "KUBBE", "DOME"], ["sabotage_guard", "cycle_guard", "DİRENÇ", "RESIST"],
  ]) {
    assert.ok(presentation.includes(`${kind}:{ effect:"${effect}", label:"${label}" }`), kind);
    assert.equal(en(label), labelEn);
    assert.match(app, new RegExp(`${effect}:\\{ priority:2, lifetimeMs:\\d+, particles:4, cue:null, minRepeatMs:\\d+ \\},`));
    assert.match(css, new RegExp(`\\.battle-effect-layer \\[data-signature="${effect}"\\] \\{ --signature-color:#[0-9a-f]{6};`));
  }
  // Destek darbesi sık gelir: etiketsiz, düşük öncelikli ve seyreltilmiş.
  assert.match(app, /cycle_pulse:\{ priority:1, lifetimeMs:680, particles:0, cue:null, minRepeatMs:900 \},/);
  const handler = slice('    } else if (type === "module_cycle_pulse" || type === "amplifier_pulse") {', '    } else if (type === "module_talent_triggered") {');
  assert.match(handler, /if \(data\.kind === "mirror" && data\.attacker_module_id\) links\.push\(\[sourceId, rival\(data\.attacker_module_id\)\]\);/);
  assert.match(handler, /if \(data\.kind === "dome_guard" && data\.target_module_id\) links\.push\(\[sourceId, own\(data\.target_module_id\)\]\);/);
  assert.match(handler, /emitSignatureBattleEffect\("cycle_pulse", sourceId, \{/);
});

// --- Sunucu metinlerinin çevirisi ---------------------------------------------------
test("değişen imza ve karşı oyun metinlerinin İngilizcesi vardır", () => {
  const catalog = read("..", "server", "app", "game", "catalog.py");
  const block = (name) => catalog.slice(catalog.indexOf(`${name} = {`), catalog.indexOf("\n}\n", catalog.indexOf(`${name} = {`)));
  const texts = [
    ...[...block("SIGNATURE_MECHANICS").matchAll(/"[a-z_]+": "([^"]+)",/g)].map((match) => match[1]),
    ...[...block("COUNTERPLAY_TR").matchAll(/"[a-z_]+": "([^"]+)",/g)].map((match) => match[1]),
  ];
  assert.ok(texts.length >= 55, String(texts.length));
  for (const text of texts) assert.notEqual(en(text), text, `çevirisi yok: ${text}`);
});

test("bilgi penceresi İngilizce arayüzde sunucunun İngilizce metnini kullanır", () => {
  const sandbox = { document: { documentElement: { lang:"tr" } }, localizedUiText: (value) => `~${value}` };
  vm.runInNewContext(`${slice("  function serverCopy(turkish, english) {", "  // Modüle özgü değerin yazımı")}
this.serverCopy = serverCopy;`, sandbox);
  assert.equal(sandbox.serverCopy("Türkçe", "English"), "~Türkçe");
  sandbox.document.documentElement.lang = "en";
  assert.equal(sandbox.serverCopy("Türkçe", "English"), "English");
  // Eski sunucu İngilizce alan göndermez: sözlükten çevrilir.
  assert.equal(sandbox.serverCopy("Türkçe", ""), "~Türkçe");
  assert.ok(app.includes('text.textContent = GridshardDetailPages.description(item, {english:document.documentElement.lang === "en"});'));
  assert.ok(app.includes('text.title = serverCopy(item.description_tr, item.description_en);'));
  const detailPages=require('../src/detail-card-layout.js');
  const item={definition_id:'laser',description_tr:'Türkçe açıklama. İkinci cümle.',description_en:'English description. Second sentence.'};
  assert.equal(detailPages.description(item,{english:true}),'English description.');
  assert.equal(detailPages.description({...item,description_en:''},{english:true}),'Türkçe açıklama.');
  assert.equal(detailPages.description({name_tr:'Onarım'},{english:true}),'Onarım');
});
