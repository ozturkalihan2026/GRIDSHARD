"use strict";

// Kartlar: yükseltilebilir modül ve çekirdek kartında yeşil yukarı ok, alt
// çubuktaki Kartlar düğmesinde yeşil ışık, seçilebilir yetenek varken bilgi
// ekranındaki Yetenekler sekmesinde ok. Ok yalın ve hareketlidir (yeşil daire
// içinde değil). Bilgi ekranında bir sonraki seviyenin farkı değerin yanında
// yeşil yazar; CAN ile HASAR arasında modülün bekleme süresi durur. Sandık
// indirimi günü alt çubuktaki Mağaza düğmesinde indirim oranı görünür.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");

// --- Gerçek kod, küçük bir sahte belgeyle çalıştırılır ----------------------
function fakeElement(tag) {
  const element = {
    tag,
    children: [],
    className: "",
    textContent: "",
    title: "",
    hidden: false,
    dataset: {},
    attributes: {},
    classes: new Set(),
    setAttribute(key, value) { this.attributes[key] = String(value); },
    getAttribute(key) { return this.attributes[key]; },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    remove() { this.removed = true; },
    querySelector(selector) {
      return this.children.find((child) => typeof child === "object" && `.${child.className}` === selector) || null;
    },
  };
  element.classList = {
    toggle(name, on) { if (on) element.classes.add(name); else element.classes.delete(name); },
    contains: (name) => element.classes.has(name),
  };
  return element;
}

const cardsButton = fakeElement("button");
const shopButton = fakeElement("button");
const saleBadge = fakeElement("span");
const sandbox = {
  metaProgressionState: null,
  uiLocale: () => "tr-TR",
  localizedUiText: (value) => value,
  document: {
    createElement: fakeElement,
    getElementById: (id) => (id === "dock-shop-sale" ? saleBadge : null),
    querySelector: (selector) => (selector.includes('"modules"') ? cardsButton : selector.includes('"shop"') ? shopButton : null),
  },
};
const start = app.indexOf("  // Bilgi ekranının başındaki değer kutuları.");
const end = app.indexOf("  function unifiedModuleTile(");
assert.ok(start > 0 && end > start, "yükseltme göstergeleri bölümü bulunamadı");
vm.runInNewContext(`${app.slice(start, end)}
Object.assign(this, { moduleUpgradeBlockReason, moduleTalentSelectable, coreUpgradeAvailable, coreSkillLearnable,
  moduleUpgradeAvailable, moduleTalentAvailable, coreSkillAvailable, cardNeedsAttention, createUpgradeArrow,
  setDetailTabUpgradeArrow, renderDockIndicators, renderDetailStatRow });`, sandbox);

const moduleItem = (overrides = {}) => ({
  definition_id:"laser", unlocked:true, unlock_trophies:0, level:0, shards:2,
  next_upgrade_cost:{ shards:2, circuit_credits:100 },
  talents:[{ tier:"t1", level:5, flux_cost:15, selected:null }],
  ...overrides,
});
const coreItem = (overrides = {}) => ({
  id:"core_resonance", unlocked:true, level:1, shards:2, legacy_shards:0,
  next_upgrade_cost:{ shards:2, flux_shards:20 },
  skills:[{ id:"a", tier:"t1", level:3, flux_cost:10, learned:false, tier_selected:false }],
  ...overrides,
});
const withState = (state, run) => { sandbox.metaProgressionState = state; return run(); };
const rich = { circuit_credits:500, flux_shards:500, universal_module_shards:0 };

// Modül: yükseltmeyi engelleyen neden bilgi ekranındaki düğmeyle aynı kuraldır.
withState(rich, () => {
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem()), "");
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem({ unlocked:false, unlock_trophies:300 })), "300 kupada açılır.");
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem({ next_upgrade_cost:null })), "Azami seviye.");
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem({ shards:1 })), "Gerekli parça: 1/2");
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem()), true);
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem({ shards:1 })), false);
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem({ unlocked:false })), false);
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem({ next_upgrade_cost:null })), false);
});
// Evrensel parça eksik parçayı tamamlar.
withState({ ...rich, universal_module_shards:1 }, () => {
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem({ shards:1 })), "");
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem({ shards:1 })), true);
});
// Parça yetse de Devre Kredisi yetmiyorsa yükseltme yoktur, ok da yanmaz.
withState({ ...rich, circuit_credits:99 }, () => {
  assert.equal(sandbox.moduleUpgradeBlockReason(moduleItem()), "Gerekli Devre Kredisi: 100");
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem()), false);
});
// Yetenek: seviye yetmeli, dal seçilmemiş olmalı, Akı yetmeli.
withState(rich, () => {
  const reachable = moduleItem({ shards:0, level:4 });
  assert.equal(sandbox.moduleTalentAvailable(moduleItem({ shards:0, level:3 })), false);
  assert.equal(sandbox.moduleTalentAvailable(reachable), true);
  assert.equal(sandbox.cardNeedsAttention("module", reachable), true, "yalnız yetenek seçilebilirken de ok yanar");
  assert.equal(sandbox.moduleTalentAvailable(moduleItem({ level:4, talents:[{ tier:"t1", level:5, flux_cost:15, selected:"power" }] })), false);
  assert.equal(sandbox.moduleTalentAvailable(moduleItem({ level:4, unlocked:false })), false);
});
withState({ ...rich, flux_shards:14 }, () => {
  assert.equal(sandbox.moduleTalentAvailable(moduleItem({ shards:0, level:4 })), false);
});
// Çekirdek: parça ve Akı; yetenekte seviye, dal ve Akı.
withState(rich, () => {
  assert.equal(sandbox.coreUpgradeAvailable(coreItem()), true);
  assert.equal(sandbox.coreUpgradeAvailable(coreItem({ shards:1, legacy_shards:1 })), true);
  assert.equal(sandbox.coreUpgradeAvailable(coreItem({ shards:1 })), false);
  assert.equal(sandbox.coreUpgradeAvailable(coreItem({ unlocked:false })), false);
  assert.equal(sandbox.coreUpgradeAvailable(coreItem({ next_upgrade_cost:null })), false);
  assert.equal(sandbox.cardNeedsAttention("core", coreItem()), true);
  assert.equal(sandbox.coreSkillAvailable(coreItem({ shards:0 })), false);
  assert.equal(sandbox.coreSkillAvailable(coreItem({ shards:0, level:3 })), true);
  assert.equal(sandbox.cardNeedsAttention("core", coreItem({ shards:0, level:3 })), true);
  const taken = coreItem({ level:3, skills:[{ id:"a", tier:"t1", level:3, flux_cost:10, learned:false, tier_selected:true }] });
  assert.equal(sandbox.coreSkillAvailable(taken), false);
});
withState({ ...rich, flux_shards:19 }, () => {
  assert.equal(sandbox.cardNeedsAttention("core", coreItem()), false);
});
// Sunucu durumu yokken ya da geçici önizlemede gösterge yanmaz.
withState(null, () => {
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem()), false);
  assert.equal(sandbox.cardNeedsAttention("core", coreItem()), false);
});
withState({ ...rich, unavailable:true }, () => {
  assert.equal(sandbox.cardNeedsAttention("module", moduleItem({ level:4 })), false);
  assert.equal(sandbox.cardNeedsAttention("core", coreItem({ level:3 })), false);
});

// Alt çubuk: Kartlar ışığı ve Mağaza indirim rozeti.
const dockState = (overrides = {}) => ({
  ...rich,
  module_collection:[moduleItem({ shards:0 })],
  cores:{ types:[coreItem({ shards:0 })] },
  shop:{ chest_store:{ sale_active:false, discount_percent:40 } },
  ...overrides,
});
withState(dockState(), () => {
  sandbox.renderDockIndicators();
  assert.equal(cardsButton.classes.has("has-upgrade-notification"), false);
  assert.equal(cardsButton.attributes["aria-label"], "Kartlar");
  assert.equal(saleBadge.hidden, true);
  assert.equal(saleBadge.textContent, "");
  assert.equal(shopButton.classes.has("has-sale-badge"), false);
  assert.equal(shopButton.attributes["aria-label"], "Mağaza");
});
withState(dockState({ module_collection:[moduleItem({ shards:0 }), moduleItem()] }), () => {
  sandbox.renderDockIndicators();
  assert.equal(cardsButton.classes.has("has-upgrade-notification"), true);
  assert.equal(cardsButton.attributes["aria-label"], "Kartlar · Yükseltme mevcut");
});
withState(dockState({ cores:{ types:[coreItem()] } }), () => {
  sandbox.renderDockIndicators();
  assert.equal(cardsButton.classes.has("has-upgrade-notification"), true, "yükseltilebilir çekirdek de ışığı yakar");
});
withState(dockState({ shop:{ chest_store:{ sale_active:true, discount_percent:40 } } }), () => {
  sandbox.renderDockIndicators();
  assert.equal(cardsButton.classes.has("has-upgrade-notification"), false, "yükseltme bitince ışık söner");
  assert.equal(saleBadge.hidden, false);
  assert.equal(saleBadge.textContent, "-%40");
  assert.equal(shopButton.classes.has("has-sale-badge"), true);
  assert.equal(shopButton.attributes["aria-label"], "Mağaza · %40 indirim");
});
withState(dockState({ shop:{ chest_store:{ sale_active:true, discount_percent:0 } } }), () => {
  sandbox.renderDockIndicators();
  assert.equal(saleBadge.hidden, true, "oran yoksa rozet çıkmaz");
});
withState(null, () => {
  sandbox.renderDockIndicators();
  assert.equal(cardsButton.classes.has("has-upgrade-notification"), false);
  assert.equal(saleBadge.hidden, true);
});

// Bilgi ekranı: değerin yanında bir sonraki seviyenin farkı.
const statHost = fakeElement("div");
sandbox.renderDetailStatRow(statHost, [
  { label:"CAN", value:100, current:100, next:103 },
  { label:"BEKLEME", value:"1,5 sn", current:1.5, next:1.488 },
  { label:"HASAR", value:12, current:12, next:12.6 },
  { label:"DEĞİŞMEYEN", value:5, current:5, next:5 },
  { label:"AZAMİ", value:9, current:9, next:null },
  { label:"YUVARLANINCA SIFIR", value:"0,5 sn", current:0.5, next:0.496 },
  { label:"DEĞERSİZ", value:"—", current:undefined, next:undefined },
]);
const boxes = statHost.children.map((box) => {
  const [name, amount] = box.children;
  const gain = amount.children.find((child) => typeof child === "object");
  return [name.textContent, amount.textContent, gain?.textContent ?? null, gain?.className ?? null];
});
assert.deepEqual(boxes, [
  ["CAN", "100", "+3", "stat-next-gain"],
  // Kısalan bekleme süresi "-" ile yazar.
  ["BEKLEME", "1,5 sn", "-0,01", "stat-next-gain"],
  ["HASAR", "12", "+0,6", "stat-next-gain"],
  ["DEĞİŞMEYEN", "5", null, null],
  ["AZAMİ", "9", null, null],
  ["YUVARLANINCA SIFIR", "0,5 sn", null, null],
  ["DEĞERSİZ", "—", null, null],
]);
sandbox.renderDetailStatRow(null, []); // eksik öğe hataya yol açmaz

// Sekme oku eklenir ve kaldırılır.
const tab = fakeElement("button");
sandbox.setDetailTabUpgradeArrow(tab, true);
assert.equal(tab.classes.has("has-upgrade-arrow"), true);
assert.equal(tab.children.filter((child) => child.className === "upgrade-arrow").length, 1);
assert.equal(tab.children[0].attributes["aria-hidden"], "true");
sandbox.setDetailTabUpgradeArrow(tab, false);
assert.equal(tab.classes.has("has-upgrade-arrow"), false);
assert.equal(tab.children[0].removed, true);
sandbox.setDetailTabUpgradeArrow(null, true);

// --- Bağlantılar: göstergeler ve düğmeler aynı kuralı kullanır --------------
assert.ok(app.includes("const reason = moduleUpgradeBlockReason(item);"));
assert.ok(app.includes("const canChoose = moduleTalentSelectable(item, node);"));
assert.ok(app.includes("const canUpgrade = coreUpgradeAvailable(core);"));
assert.ok(app.includes("button.disabled = !coreSkillLearnable(core, skill);"));
assert.ok(app.includes('const needsAttention = cardNeedsAttention("module", item);'));
assert.ok(app.includes('const needsAttention = cardNeedsAttention("core", core);'));
assert.match(app, /setDetailTabUpgradeArrow\(document\.querySelector\('\[data-module-detail-tab="talents"\]'\), moduleTalentAvailable\(item\)\);/);
assert.match(app, /setDetailTabUpgradeArrow\(document\.querySelector\('\[data-core-detail-tab="skills"\]'\), coreSkillAvailable\(core\)\);/);
// Alt çubuk, hangi sayfa açık olursa olsun her durum güncellemesinde yenilenir.
assert.match(app, /function renderMetaHubScreens\(\) \{[\s\S]*?renderDockIndicators\(\);\s*scheduleMetaHubFlush\(\);/);

// "Sonraki seviye" kutusu bilgi ekranından kalktı; değerler baştaki satırda.
assert.ok(!app.includes('"SONRAKİ SEVİYE"'));
assert.ok(app.includes('{ label:"CAN", value:item.stats?.max_hp ?? definition.maxHp, current:item.stats?.max_hp, next:nextStats?.max_hp },'));
assert.ok(app.includes('{ label:"HASAR", value:item.stats?.base_damage || 0, current:item.stats?.base_damage, next:nextStats?.base_damage },'));
// Modül bilgi ekranında CAN ile HASAR arasında bekleme süresi durur; Akım maliyeti orada yazmaz.
const moduleHeader = app.slice(app.indexOf('renderDetailStatRow(document.getElementById("module-detail-stats"), ['), app.indexOf('const upgrade = document.getElementById("module-detail-upgrade");'));
assert.deepEqual([...moduleHeader.matchAll(/label:"([^"]+)"/g)].map((match) => match[1]), ["CAN", "BEKLEME", "HASAR"]);
assert.ok(!moduleHeader.includes("current_cost"));
assert.ok(moduleHeader.includes("current:cooldown,") && moduleHeader.includes("next:cooldownSeconds(nextStats),"));
assert.ok(app.includes("Number(stats.cooldown_ms) / 1000"));
// Akım maliyeti İstatistik sekmesinde durmaya devam eder.
assert.ok(app.includes('{ key:"current", glyph:"ϟ", label:"AKIM MALİYETİ", value:number(item.current_cost) },'));
assert.equal(i18n.translateText("BEKLEME", "en"), "COOLDOWN");
assert.ok(app.includes('{ label:"ENERJİ", value:`${core.energy_per_second}/sn`, current:core.energy_per_second, next:nextStats?.energy_per_second },'));
assert.ok(app.includes('{ label:"DEPO", value:core.energy_capacity, current:core.energy_capacity, next:nextStats?.energy_capacity },'));
// Kilitli kartta fark yazmaz.
assert.ok(app.includes("const nextStats = item.unlocked ? item.next_stats : null;"));
assert.ok(app.includes("const nextStats = core.unlocked ? core.next_stats : null;"));

// --- Şablon ve stil ---------------------------------------------------------
const dock = html.slice(html.indexOf('<nav id="app-bottom-dock"'), html.indexOf("</nav>", html.indexOf('<nav id="app-bottom-dock"')));
const shopDockButton = dock.slice(dock.indexOf('data-open-screen="shop"'), dock.indexOf("</button>"));
assert.match(shopDockButton, /<span id="dock-shop-sale" class="dock-sale-badge" aria-hidden="true" hidden><\/span>/);
// Ok yalın bir yeşil oktur: daire zemini, çerçevesi ya da gölgesi yoktur ve sürekli hareket eder.
const arrowRule = css.match(/\.upgrade-arrow \{[^}]*\}/)?.[0] || "";
assert.ok(arrowRule.length > 0);
for (const gone of ["background", "border", "box-shadow"]) {
  assert.ok(!arrowRule.includes(gone), `ok kuralında ${gone} olmamalı`);
}
assert.match(arrowRule, /animation:upgrade-arrow-rise 1\.1s ease-in-out infinite;/);
assert.match(css, /\.upgrade-arrow > svg \{[^}]*fill:#4be38a;[^}]*stroke:#052416;[^}]*paint-order:stroke;/);
assert.match(css, /@keyframes upgrade-arrow-rise \{\s*0%,100% \{ transform:translateY\(2px\);opacity:\.72; \}\s*50% \{ transform:translateY\(-2px\);opacity:1; \}\s*\}/);
// Hareket azaltma tercihinde ve düşük grafik ayarında ok durur.
assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{ \.upgrade-arrow \{ animation:none; \} \}/);
assert.match(css, /body\[data-graphics="dusuk"\] \.upgrade-arrow \{ animation:none; \}/);
assert.match(css, /\.collection-module-tile > \.upgrade-arrow,\s*\.core-collection-tile > \.upgrade-arrow \{ position:absolute;z-index:2;top:4px;right:3px; \}/);
// Destedeki modülde ok ✓ işaretinin altına iner; seçili çekirdekte sol üste geçer.
assert.match(css, /\.collection-module-tile\[data-selected="true"\] > \.upgrade-arrow \{ top:21px; \}/);
assert.match(css, /\.core-collection-tile > b \+ \.upgrade-arrow \{ right:auto;left:3px; \}/);
assert.match(css, /#app-bottom-dock \.menu-action\.has-upgrade-notification::after \{[^}]*background:var\(--gs-upgrade-light\) !important;/);
assert.match(css, /:root \{ --gs-upgrade-light:#4be38a; \}/);
assert.match(css, /\.module-detail-stats \.stat-next-gain \{[^}]*color:#5ff09a;/);
assert.match(css, /\.module-overview-grid > div:last-child:nth-child\(odd\) \{ grid-column:1 \/ -1; \}/);
assert.match(css, /\.dock-sale-badge\[hidden\] \{ display:none !important; \}/);
// Android web görünümü .5rem altındaki yazıyı büyütür; rozet ve fark yazısı o sınırın altına inmez.
assert.match(css, /\.dock-sale-badge \{[^}]*font:900 \.5rem\/1\.3 var\(--gs-font-display\);/);
assert.match(css, /\.module-detail-stats \.stat-next-gain \{[^}]*font:800 \.56rem var\(--gs-font-display\);/);

// --- İngilizce --------------------------------------------------------------
assert.equal(i18n.translateText("Yükseltme mevcut", "en"), "Upgrade available");
assert.equal(i18n.translateText("Kartlar · Yükseltme mevcut", "en"), "Cards · Upgrade available");
assert.equal(i18n.translateText("Sonraki seviye", "en"), "Next level");
assert.equal(i18n.translateText("-%40", "en"), "-40%");
assert.equal(i18n.translateText("Mağaza · %40 indirim", "en"), "Store · 40% off");
// Harfsiz yüzde yazısı ("%40" gibi) düğüm belleğiyle Türkçeye döner; eski kural da sürer.
assert.equal(i18n.translateText("%40", "en"), "40%");
assert.equal(i18n.translateText("Store · 40% off", "tr"), "Mağaza · %40 indirim");

console.log("card upgrade indicators contract passed");
