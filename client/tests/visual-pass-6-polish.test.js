"use strict";

// Görsel tur 6 (13 Ekim 2026): mesaj kutusu, bilgi pencereleri, kart karoları, yazı
// boyları, alt çubuk geçişi, bildirim noktaları, giriş ekranı ve savaş efektleri.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const app = read("src/app.js");
const html = read("index.html");
const canon = read("src/canon.css");
// Later polish has its own surface shadows; pass 6's VFX assertions concern
// only the original pass 6 block, not subsequent independent style passes.
const pass6End = canon.indexOf("/* === Profesyonel rötuş (13 Ekim 2026)");
const pass6 = canon.slice(canon.indexOf("/* === Görsel tur 6 (13 Ekim 2026)"), pass6End < 0 ? undefined : pass6End);
const slice = (source, start, end) => {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `bulunamadı: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.ok(to > from, `bulunamadı: ${end}`);
  return source.slice(from, to);
};

test("tur 6 bloğu dosyanın sonundadır ve 8 pikselin altında yazı boyu tanımlamaz", () => {
  assert.ok(pass6.length > 2000);
  assert.ok(canon.indexOf("/* === Görsel tur 6") > canon.indexOf("/* === Görsel tur 5"));
  // Android WebView 8 pikselden küçük yazıyı 8 piksele büyütür; düzen bozulur.
  const sizes = [...pass6.matchAll(/font(?:-size)?:[^;{}]*?(\d*\.?\d+)rem/g)].map((match) => Number(match[1]));
  assert.ok(sizes.length > 20);
  assert.deepEqual(sizes.filter((size) => size < 0.5), []);
});

test("Devre Yolu'nda mağaza sandığı veren durak mağazadaki çizimi kullanır", () => {
  const icon = slice(app, "    const rewardIcon = (rewards = {}) => {", "    for (const stage of stages) {");
  assert.match(icon, /const storeChestTier = rewards\.chest_id \? chestTier\(\{ id:rewards\.chest_id \}\) : "";/);
  assert.match(icon, /return chestVisualMarkup\(storeChestTier\);/);
  assert.ok(icon.indexOf("chestVisualMarkup(storeChestTier)") < icon.indexOf('resourceSymbolMarkup("chest")'));
  assert.match(pass6, /\.arena-reward-node > i > \.chest-visual \{ width:34px; height:30px; display:block; \}/);
});

test("modülün adı her yerde Onarım yazılır", () => {
  assert.match(app, /if \(item\?\.name_tr === "Onarım Modülü"\) item\.name_tr = "Onarım";/);
  assert.match(app, /text\.includes\("Onarım Modülü"\) \? text\.replaceAll\("Onarım Modülü", "Onarım"\) : text/);
  assert.equal((app.match(/withCanonicalModuleNames\(/g) || []).length, 6);
  assert.ok(read("src/canon-data.js").includes('"name_tr": "Onarım"'));
  const server = fs.readFileSync(path.join(root, "..", "server", "data", "arena_progression_v1.json"), "utf8");
  assert.ok(!server.includes("Onarım Modülü"));
});

test("mesaj kutusu sabit boydadır, gövdesi kayar ve her alan en çok 20 kayıt gösterir", () => {
  const dialog = slice(html, '<dialog id="reward-inbox-dialog"', "</dialog>");
  const body = dialog.slice(dialog.indexOf('<div class="reward-inbox-body">'));
  for (const id of ["inbox-panel-battle", "inbox-panel-purchase", "inbox-panel-reward", "reward-inbox-notices"]) {
    assert.ok(body.includes(`id="${id}"`), id);
  }
  assert.ok(dialog.indexOf('class="reward-inbox-tabs"') < dialog.indexOf('class="reward-inbox-body"'));
  assert.match(app, /const INBOX_AREA_LIMIT = 20;/);
  assert.match(app, /for \(const item of items\.slice\(0, INBOX_AREA_LIMIT\)\) host\.appendChild\(createCard\(item\)\);/);
  const rule = slice(pass6, ".reward-inbox-dialog[open] {", "}");
  assert.match(rule, /height:min\(600px,calc\(100dvh - 32px\)\) !important;/);
  assert.match(rule, /overflow:hidden !important;/);
  assert.match(slice(pass6, ".reward-inbox-dialog > .reward-inbox-body {", "}"), /overflow-y:auto;/);
  const delivery = fs.readFileSync(path.join(root, "..", "server", "app", "reward_delivery.py"), "utf8");
  assert.match(delivery, /MAILBOX_AREA_LIMIT = 20/);
});

test("kaydırma çubuğu hiçbir sayfada görünmez", () => {
  assert.match(pass6, /html, body, \* \{ scrollbar-width:none !important; \}/);
  assert.match(pass6, /\*::-webkit-scrollbar \{ width:0 !important; height:0 !important; display:none !important; \}/);
});

test("yükseltme oku ve bildirim noktaları yeni görsel dildedir", () => {
  const arrow = slice(app, "  function createUpgradeArrow() {", "    return arrow;");
  for (const part of ["ua-s", "ua-m", "ua-l", "ua-d", "ua-o"]) assert.ok(arrow.includes(`class="${part}"`), part);
  assert.match(pass6, /\.upgrade-arrow > svg \.ua-o \{ fill:none; stroke:#0a1024;/);
  assert.match(pass6, /--gs-notification-light:radial-gradient\(/);
  assert.match(pass6, /--gs-upgrade-light:radial-gradient\(/);
  assert.match(pass6, /--gs-notification-ring:#0a1024;/);
  // Işıma yok: nokta kontur ve alt dudakla durur.
  assert.match(pass6, /--gs-notification-glow:0 1\.5px 0 #0a1024;/);
});

test("ev ekranında deste çekirdeğin zemininde durur; arkadaki soluk çekirdek katmanı yoktur", () => {
  const tray = slice(pass6, 'body[data-app-screen="menu"] .home-loadout-front {', "}");
  assert.match(tray, /background:none !important;/);
  assert.match(tray, /box-shadow:none !important;/);
  assert.match(pass6, /\.lobby-backdrop \{ display:none !important; \}/);
  assert.ok(!app.includes("lobby-parallax"));
});

test("alt çubukta gezinme: yol yalnız açıkken çizilir, tazeleme geçiş bitince yapılır", () => {
  const home = slice(app, "  function renderHomeArena() {", "  function showCollectionQuickActions(");
  assert.match(home, /if \(document\.getElementById\("arena-detail-dialog"\)\?\.open\) renderArenaPath\(\);/);
  assert.equal((home.match(/renderArenaPath\(\)/g) || []).length, 1);
  const open = slice(app, "  function openArenaDetail(", "  arenaDetailDialog?.addEventListener(");
  assert.match(open, /renderHomeArena\(\);\s*if \(!arenaDetailDialog\?\.open\) renderArenaPath\(\);/);
  assert.match(app, /const NAVIGATION_SETTLE_MS = 360;/);
  const navigate = slice(app, "  function openAppScreen(", "  async function markScreenNotificationsSeen(");
  assert.match(navigate, /if \(screen !== previousScreen\) navigationSettleUntil = performance\.now\(\) \+ NAVIGATION_SETTLE_MS;/);
  assert.match(navigate, /\.then\(\(\) => afterNavigationSettle\(\(\) => \{/);
  assert.match(navigate, /loadMetaProgression\(\{ afterSettle:true \}\);/);
  assert.match(slice(app, "  function scheduleMetaHubFlush() {", "  function renderMetaHubScreens() {"), /const settleWait = navigationSettleUntil - performance\.now\(\);/);
  // Hareket yalnız transform ve opaklıkla yapılır; genişlik ve yükseklik geçişi yoktur.
  assert.match(pass6, /#app-bottom-dock \.menu-action \{ transition:transform \.12s ease !important; \}/);
  assert.match(pass6, /@keyframes gs6-dock-rise \{ from \{ transform:translateY\(7px\) scale\(\.94\); \} \}/);
  assert.match(pass6, /@keyframes gs6-dock-title \{ from \{ opacity:0; transform:translateY\(4px\); \} \}/);
});

test("kart karosu küçüldü; desteye ekleyen düğme yeşil, çıkaran kırmızıdır", () => {
  assert.match(slice(pass6, ".collection-module-tile {", "}"), /grid-template-rows:30px auto auto !important;/);
  const quick = slice(app, "  function showCollectionQuickActions(", "  function sortModuleCollection(");
  assert.match(quick, /select\.dataset\.action = selected \? "remove" : "add";/);
  assert.match(pass6, /\.module-quick-actions button \{ min-height:26px !important;/);
  assert.match(pass6, /\.module-quick-actions > button\[data-action="add"\] \{ --b-a:#74d384;/);
  assert.match(pass6, /\.module-quick-actions > button\[data-action="remove"\] \{ --b-a:#f0788c;/);
});

test("bilgi pencereleri: başlık alanı alçaldı, üç hücre en çok iki satırdır", () => {
  assert.match(pass6, /\.module-detail-dialog \.module-detail-hero \{ min-height:88px !important; \}/);
  assert.match(slice(pass6, ".module-detail-stats > div {", "}"), /grid-template-rows:auto auto !important;/);
  assert.match(slice(pass6, ".module-detail-stats > div > span {", "}"), /white-space:nowrap !important;/);
  assert.match(slice(pass6, ".module-detail-stats > div > strong {", "}"), /white-space:nowrap;/);
  // Çekirdek istatistiklerinde savaş rolü satırı doldurur ve metin boyunda yazılır.
  assert.match(app, /if \(label === "Savaş rolü"\) row\.dataset\.wide = "true";/);
  assert.match(pass6, /dl\.core-stat-tiles > div\[data-wide="true"\] \{ grid-column:1 \/ -1; order:-1; \}/);
});

test("savaş efektleri kademelidir: sıradan vuruş sade, ağır vuruşta halka ve bütün kıvılcımlar", () => {
  const impact = slice(app, "  function emitDuelImpactEffect({", "  function emitDuelAttackEffect(");
  assert.match(impact, /impactLevel="light",/);
  assert.match(impact, /impact\.dataset\.impact=heavy \? "heavy" : "light";/);
  assert.match(impact, /if \(heavy\) \{\s*const ring=/);
  assert.match(impact, /const sparkCount=heavy \? 10 : 4;/);
  assert.match(app, /const heavyHit=!defended && \(hitDamage >= 40 \|\| hitDamage \/ targetMaxHp >= \.25\);/);
  assert.match(pass6, /\.duel-impact-flash \{ width:24px; height:24px; animation-duration:\.34s; \}/);
  assert.match(pass6, /\.duel-hit-impact\[data-impact="heavy"\] \.duel-impact-flash \{ width:46px; height:46px;/);
  // Işıma ve bulanık gölge yok: tur 6 efekt kurallarında bulanıklık yarıçapı olan gölge tanımlanmaz.
  const fx = pass6.slice(pass6.indexOf("/* Savaş efektleri yeni görsel dilde"));
  assert.ok(fx.length > 1500);
  for (const shadow of fx.matchAll(/box-shadow:([^;]+);/g)) {
    for (const layer of shadow[1].split(/,(?![^(]*\))/)) {
      const lengths = layer.replace(/rgba?\([^)]*\)|var\([^)]*\)|#[0-9a-f]+|inset|!important/gi, " ").trim().split(/\s+/).filter(Boolean);
      assert.ok(lengths.length < 3 || parseFloat(lengths[2]) === 0, `bulanık gölge: ${layer.trim()}`);
    }
  }
  // Güç alan hücre sürekli parlamaz.
  const fed = slice(fx, ".board-cell.energy-fed-cell {", "}");
  assert.match(fed, /animation:none !important;/);
  assert.match(fed, /filter:none !important;/);
});

test("giriş ekranı ve marka amblemi yeni görsel dildedir", () => {
  const boot = pass6.slice(pass6.indexOf("/* Giriş (yükleme) ekranı yeni görsel dilde"), pass6.indexOf("/* Savaş efektleri yeni görsel dilde"));
  assert.match(boot, /\.boot-trace \{ display:none; \}/);
  assert.match(boot, /-webkit-text-stroke:5px #0a1024;/);
  assert.match(boot, /@keyframes gs-boot-glow \{ 50% \{ transform:translateY\(-2px\); text-shadow:0 6px 0 #0a1024; \} \}/);
  assert.ok(!/rgba\(72,244,224/.test(boot));
  const brand = fs.readFileSync(path.join(root, "..", "tools", "generate_brand_assets.py"), "utf8");
  assert.match(brand, /INK = \(10, 16, 36\)/);
  assert.match(brand, /def render_emblem\(s, ring_radius, \*, halo=1\.0, particles=None, seed=SEED\):/);
  assert.match(brand, /def tapered\(size, points, width\):/);
  // Bulanıklık yalnız konturu genişleten yardımcıda kullanılır; ışıma katmanı yoktur.
  assert.equal((brand.match(/GaussianBlur/g) || []).length, 1);
});
