"use strict";

// Görsel tur 4 (13 Ekim 2026): tek Çekirdek amblemi (ev, Kartlar → Çekirdek, bilgi
// penceresi, savaş, maç sonu, profil, Devre Yolu), sakinleşen yüzey dili, Oxanium,
// profildeki Devre Koleksiyonu, takım ve turnuva sayfaları, savaşta emoji düğmesi.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8").replace(/\r\n/g, "\n");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const html = read("index.html");
const catalog = read("src", "i18n-catalog.js");

const block3Start = css.indexOf("/* === Görsel tur 3 ");
const blockStart = css.indexOf("/* === Görsel tur 4 ");
const block3 = css.slice(block3Start, blockStart);
const block = css.slice(blockStart);
const rule = (selector, source = block) => {
  const at = source.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} kuralı bulunamadı`);
  return source.slice(at, source.indexOf("}", at) + 1);
};

test("tur 4 bloğu tur 3'ten sonra, dosyanın sonundadır ve color-mix kullanmaz", () => {
  assert.ok(block3Start > 0 && blockStart > block3Start);
  assert.equal(block.includes("color-mix("), false);
});

test("profesyonel dokunuş: tur 3 yüzeyleri ince konturlu ve alçak dudaklıdır", () => {
  // Kalın kontur (1,5-2 piksel), 3-6 piksel dudak ve dış mürekkep halkası kalmadı.
  assert.equal(/0 0 0 (?:1\.5|2)px var\(--gs3-ink\)/.test(block3), false, "kontur 1 piksel");
  assert.equal(/0 [3-9]px 0 [\d.]+px var\(--gs3-ink\)/.test(block3), false, "dış mürekkep halkası yok");
  assert.equal(/0 [4-9]px 0 [\d.]+px (?:#[0-9a-f]{6}|var\(--[a-z0-9-]+\))/.test(block3), false, "alt dudak en çok 3 piksel");
  assert.equal(/border:2px solid/.test(block3), false, "renkli çerçeve 1,5 piksel");
  assert.equal(/translateY\(2px\)/.test(block3), false, "düğme basınca 1 piksel iner");
  assert.match(block3, /--gs3-slab-shadow:inset 0 1px 0 rgba\(255,255,255,\.14\),inset 0 -1px 0 rgba\(3,10,24,\.34\),0 0 0 1px var\(--gs3-ink\),0 2px 0 1px #06173a,0 6px 14px rgba\(1,8,22,\.3\);/);
});

test("Çekirdek amblemi onaylı fiziksel çizimdir ve her yerde aynı işlevle çizilir", () => {
  const start = app.indexOf("  const CORE_EMBLEM_MARKS = Object.freeze({");
  const end = app.indexOf("  function renderHomeCoreHero() {");
  assert.ok(start > 0 && end > start);
  const sandbox = {CORE_VISUALS:{core_phoenix:{},core_resonance:{}}};
  vm.runInNewContext(`${app.slice(start, end)}\nObject.assign(this, { coreEmblemSvg, coreEmblemMarkup, CORE_EMBLEM_ORBITS, CORE_EMBLEM_SPARK });`, sandbox);
  const markup = sandbox.coreEmblemMarkup("core_phoenix");
  assert.match(markup, /cores-physical-v1\/core_phoenix.webp/);
  assert.doesNotMatch(markup, /<svg|core-emblem-orbits|core-emblem-spark/);
  assert.match(sandbox.coreEmblemMarkup("unknown"), /cores-physical-v1\/core_resonance.webp/);
  // Hareketli parçalar gövdenin içinde değildir (gövde yeniden çizilmez).
  assert.equal(/ce-orbits|ce-spark/.test(sandbox.coreEmblemSvg("core_resonance")), false);
  assert.equal((sandbox.CORE_EMBLEM_ORBITS.match(/<ellipse /g) || []).length, 2);

  for (const call of [
    "mountCoreEmblem(glyph, coreId);",
    "mountCoreEmblem(glyph, core.id);",
    "mountCoreEmblem(art, core.id);",
    "mountCoreEmblem(coreGlyph, coreType);",
    'mountCoreEmblem(corePowerButtonEl.querySelector(".core-power-glyph"), selectedCore);',
    "if (coreIcon && !standing && !GridshardModuleDeviceArt.mountCore?.(coreIcon, selectedCore)) mountCoreEmblem(coreIcon, selectedCore);",
    'mountCoreEmblem(icon, model.coreType);',
    'mountCoreEmblem(document.getElementById("profile-featured-core-glyph"), core?.id || "core_resonance");',
    'mountCoreEmblem(coreGlyph, payload.selected_core?.id || "core_resonance");',
  ]) assert.ok(app.includes(call), call);
  // Eski tek harfli simge çekirdek için hiçbir yerde yazılmaz.
  assert.equal(/textContent\s*=\s*(?:visual|coreVisual|identity)\.glyph/.test(app), false);
  // Aynı çekirdek zaten çiziliyse DOM'a dokunulmaz (savaşta her sunucu mesajında çağrılır).
  assert.ok(app.includes("if (element.dataset.coreEmblem === normalizedId && element.firstElementChild) return;"));
  // Rakibin çekirdek türü anlık görüntüden gelir ve kartın imzasına girer.
  assert.ok(app.includes('mockEnemyCoreType=CORE_VISUALS[enemy.core_type] ? enemy.core_type : "core_resonance";'));
  assert.ok(app.includes('moduleSignature:module => battleModuleRenderSignature(module) + "|" + language + "|" + mockEnemyCoreType,'));
});

test("amblemin hareketi katmanlardadır; hareket azaltma ve düşük grafikte durur", () => {
  assert.match(rule(".core-emblem-orbits"), /animation:ce-orbit 16s linear infinite;will-change:transform;/);
  assert.match(rule(".core-emblem-spark"), /animation:ce-spark 2\.6s ease-in-out infinite;/);
  assert.match(block, /@media \(prefers-reduced-motion:reduce\) \{\n  \.core-emblem-orbits,\n  \.core-emblem-spark \{ animation:none; \}/);
  assert.match(block, /body\[data-graphics="dusuk"\] \.core-emblem-orbits,\nbody\[data-graphics="dusuk"\] \.core-emblem-spark \{ animation:none; \}/);
  // Dönen katmanı taşıyan öğelerde süzgeç yoktur (her karede yeniden boyama olmasın).
  assert.match(rule(".home-core-hero-glyph.is-emblem"), /filter:none !important;/);
  assert.match(rule('body[data-app-screen="play"] .core-power-button .core-power-glyph.is-emblem'), /filter:none !important;/);
  assert.match(rule(".core-collection-tile .core-collection-glyph.is-emblem"), /filter:none !important;/);
});

test("savaşta çekirdek amblemi hücrenin ortasındadır", () => {
  const icon = rule('body[data-app-screen="play"] .vertical-circuit-arena .module-card.battle-module-card > .module-icon.is-emblem');
  // Izgara alanına bağlı kalırsa kutu 2 piksel sağa kayar; yerleşim bırakılır ve dört
  // kenardan aynı oranda içeri çekilir.
  assert.match(icon, /grid-area:auto !important;/);
  assert.match(icon, /inset:12% !important;/);
  assert.match(icon, /justify-self:stretch !important;[^}]*align-self:stretch !important;/);
  // v15: savaşta çekirdek onaylı dik çizimle durur; çizim yüklenemezse aynı amblem kullanılır.
  assert.ok(app.includes("if (!GridshardModuleDeviceArt.mountCore?.(icon, model.coreType)) mountCoreEmblem(icon, model.coreType);"));
  assert.ok(app.includes('const coreType = enemy ? mockEnemyCoreType : metaProgressionState?.cores?.selected_core_type || "core_resonance";'));
});

test("savaşta emoji düğmesi savaş alanının içinde, sağ alt köşededir", () => {
  const arena = html.slice(html.indexOf('<div class="duel-arena vertical-circuit-arena" id="duel-arena">'), html.indexOf('<aside class="shelf-panel">'));
  assert.ok(arena.includes('<button id="battle-emoji-button" class="battle-emoji-button"'), "düğme #duel-arena içinde");
  const shelf = html.slice(html.indexOf('<aside class="shelf-panel">'), html.indexOf('<section class="post-match-panel'));
  assert.equal(shelf.includes('id="battle-emoji-button"'), false, "rafta kalmadı");
  assert.ok(shelf.includes('id="battle-emoji-tray"'), "tepsi yerinde (sabit konumlu, düğmeye göre açılır)");
  assert.equal((html.match(/id="battle-emoji-button"/g) || []).length, 1);
  assert.match(rule('body[data-app-screen="play"] #duel-arena > .battle-emoji-button'), /top:auto !important;\n  right:5px !important;\n  bottom:5px !important;\n  width:34px !important;\n  height:34px !important;/);
});

test("Kartlar → Çekirdek: karolar aynı boydadır, kilitli çekirdeğin amblemi durur", () => {
  assert.match(rule(".core-rarity-list > .core-collection-tile:only-child"), /width:100% !important;justify-self:stretch !important;/);
  assert.match(rule('.core-collection-tile[data-locked="true"] .core-emblem-orbits'), /animation:none;/);
  // Bilgi penceresinde amblem arkada, aşağıda ortadadır (görsel tur 5; tur 4'te soldaydı).
  assert.match(rule(".core-detail-dialog .core-detail-art.is-emblem"), /inset:0 !important;\n  z-index:2;/);
});

test("ev ekranı: amblem küçülür, tepsinin arkasına iner, lig kartı ile panel arasında boşluk kalır", () => {
  assert.match(rule('body[data-app-screen="menu"] .mobile-home-hub'), /grid-template-rows:auto auto minmax\(10px,1fr\) auto clamp\(6px,calc\(32px \+ \(100dvh - 640px\) \* \.35\),36px\) auto !important;/);
  assert.match(rule(".home-core-hero-glyph.is-emblem"), /height:min\(100%,14\.5dvh,132px\) !important;/);
  assert.match(rule(".home-core-hero-glyph.is-emblem"), /align-self:flex-end !important;/);
  const front = rule('body[data-app-screen="menu"] .home-loadout-front');
  assert.match(front, /z-index:2;/);
  assert.match(rule(".home-core-hero-glyph.is-emblem"), /z-index:1;/);
  // Uzun ekrandaki çekirdek adı satırı görsel tur 5'te kalktı (panel her ekranda aynı).
  assert.equal(html.includes("home-core-hero-name"), false);
});

test("alt çubuk amblemleri: Ev ve Takımın renk kimliği ayrıdır", () => {
  const tone = (screen) => /--dock-a:(#[0-9a-f]{6});--dock-b:(#[0-9a-f]{6});/.exec(rule(`body:not([data-app-screen="play"]) #app-bottom-dock .menu-action[data-open-screen="${screen}"]`)).slice(1).join(" ");
  const tones = ["shop", "modules", "menu", "team", "events"].map(tone);
  assert.equal(new Set(tones).size, 5);
  assert.equal(tone("team"), "#a78bf5 #6540cf");
  assert.equal(tone("menu"), "#43cfc2 #12938e");
});

test("profil: Devre Koleksiyonu yalnız kazanılmış kupa/rozetleri, boşken metni gösterir", () => {
  const start = app.indexOf("  const PROFILE_HONOR_ICONS = Object.freeze({");
  const end = app.indexOf("  function deckDisplayName(deck) {");
  assert.ok(start > 0 && end > start);
  const element = (tag) => ({ tag, dataset:{}, attributes:{}, children:[], className:"", textContent:"", innerHTML:"", setAttribute(name, value) { this.attributes[name] = value; }, append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); }, replaceChildren() { this.children = []; } });
  const sandbox = { document:{ createElement:element }, localizedUiText:(text) => text, COMPETITION_TROPHY_ASSET:"./assets/ui/rating-trophy-v1/rating-trophy.webp" };
  vm.runInNewContext(`${app.slice(start, end)}\nObject.assign(this, { fillHonorCollection, PROFILE_HONOR_ICONS });`, sandbox);
  const definitions = [
    { id:"season_first", nameTr:"Sezon Birinciliği", shortNameTr:"1. Kupa", tone:"gold" },
    { id:"season_second", nameTr:"Sezon İkinciliği", shortNameTr:"2. Kupa", tone:"silver" },
    { id:"season_third", nameTr:"Sezon Üçüncülüğü", shortNameTr:"3. Kupa", tone:"bronze" },
  ];
  const host = element("div");
  sandbox.fillHonorCollection(host, { ids:["season_third", "yeni_kupa"], definitions, kind:"trophy" });
  assert.deepEqual(host.children.map((item) => [item.dataset.tone, item.dataset.earned]), [["bronze", "true"], ["cyan", "true"]]);
  assert.ok(host.children.every((item) => item.children[0].innerHTML.includes('class="competition-honor-art"') && item.children[0].innerHTML.includes(sandbox.COMPETITION_TROPHY_ASSET)));
  assert.equal(host.children[0].attributes["aria-label"], "Sezon Üçüncülüğü · Kazanıldı");
  // Kullanıcının 14 Ekim kararı: kazanılmayan görsel/yuva çizilmez.
  const empty = element("div");
  sandbox.fillHonorCollection(empty, { ids:[], definitions, kind:"badge" });
  assert.equal(empty.children.length, 1);
  assert.equal(empty.children[0].tag, "p");
  assert.equal(empty.children[0].textContent, "Henüz kazanılmadı");
  assert.equal(empty.children[0].innerHTML, "");
  sandbox.fillHonorCollection(empty, { ids:["season_first"], definitions, kind:"trophy" });
  assert.equal(empty.children.length, 1);
  assert.equal(empty.children[0].dataset.earned, "true");
  assert.ok(catalog.includes('"Henüz kazanılmadı":"Not earned yet",') && catalog.includes('"Kazanıldı":"Earned",'));
  assert.match(rule(".profile-honor-collection"), /grid-template-columns:repeat\(4,minmax\(0,1fr\)\);/);
  assert.match(rule('.profile-honor-item[data-earned="false"]'), /--honor-color:#54698a;/);
});

test("Devre Yolu: parlak alınabilir durak ve sandık doğrudan tıklanır, AL rozeti yok", () => {
  assert.equal((app.match(/chip\.className = "arena-reward-claim-chip";/g) || []).length,0);
  assert.ok(app.includes('chest.addEventListener("click", () => claimLeagueNode(node, chest))'));
  assert.match(read("src","visual-polish-v9.css"),/\.arena-reward-node\.is-claimable/);
});

test("takım ve turnuva sayfaları yüzey dilindedir", () => {
  assert.match(rule("#team-screen"), /var\(--gs-pattern-diamond\)/);
  assert.match(block, /#team-screen \.team-identity-card,\n#team-screen \.team-action-card,\n#team-screen \.team-profile-statistics,[^{]*\{[^}]*background:var\(--gs3-slab\) !important;/);
  assert.match(rule("#team-screen .team-profile-stat-grid"), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\) !important;/);
  assert.match(rule(".event-detail-screen .tournament-panel"), /background:var\(--gs3-slab\) !important;/);
  assert.match(block, /\.event-detail-screen \.event-detail-tabs > button,\n#team-screen \.team-tabs > button \{ font-size:\.5rem !important;/);
});

test("başlık yazı tipi Rowdies Bold'dur; marka yazısı Orbitron'da kalır", () => {
  const styles = read("src", "styles.css");
  const fonts = read("src", "fonts.css");
  assert.match(styles, /--gs-font-display:"Rowdies","Oxanium","Bahnschrift SemiBold","Segoe UI Semibold","Arial Black",sans-serif;/);
  assert.match(styles, /content:"GRIDSHARD";[^}]*font-family:var\(--gs-font-brand\);/);
  assert.match(rule(".boot-title"), /font-family:var\(--gs-font-brand\) !important;/);
  // Dar yazı tipi biraz büyük çizilir; böylece ölçüler yeniden yazılmadan okunur kalır.
  assert.equal((fonts.match(/font-family:"Oxanium";[^}]*size-adjust:109%;/g) || []).length, 2);
  assert.equal(/font-family:"Orbitron"/.test(css), false);
});
