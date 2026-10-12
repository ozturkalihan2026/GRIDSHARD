"use strict";

// Takım sayfası: takım durumu gelene kadar "katıl / oluştur" ekranı görünmez;
// takım yönetiminin iki sayfası (Kozmetik, Üye Yönetimi) başlıktaki üç çizgi
// menüsünden açılır; üye sayısı istatistiklerin başındadır; fazla çerçeveler
// yoktur. Profil, Üyeler, İstek, Sohbet ve Savaş alt sekme çubuğunda kalır.
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

const screen = html.slice(html.indexOf('<section id="team-screen"'), html.indexOf('<section id="events-screen"'));
assert.ok(screen.length > 0);

// --- Açılış: yalnız yükleme bölümü görünür --------------------------------
assert.match(screen, /<section id="team-loading" class="team-loading">\s*<p id="team-loading-text" class="team-empty-state">Yükleniyor…<\/p>\s*<button id="team-loading-retry" type="button" hidden>BAĞLANTIYI YENİDEN DENE<\/button>/);
assert.match(screen, /<section id="team-onboarding" class="team-onboarding" hidden>/);
assert.match(screen, /<section id="team-hub" class="team-hub" hidden>/);
assert.ok(screen.indexOf('id="team-loading"') < screen.indexOf('id="team-onboarding"'));
assert.equal(i18n.translateText("Yükleniyor…", "en"), "Loading…");
assert.equal(i18n.translateText("BAĞLANTIYI YENİDEN DENE", "en"), "RETRY CONNECTION");

// Gerçek kod, küçük bir sahte belgeyle çalıştırılır.
function teamSandbox() {
  const elements = {};
  for (const id of ["team-loading", "team-loading-text", "team-loading-retry", "team-onboarding", "team-hub", "team-action-status"]) {
    elements[id] = { hidden: false, textContent: "", dataset: {} };
  }
  // Şablondaki başlangıç durumu.
  elements["team-loading-retry"].hidden = true;
  elements["team-onboarding"].hidden = true;
  elements["team-hub"].hidden = true;
  const requests = [];
  const sandbox = {
    document: { getElementById: (id) => elements[id] || null },
    participantPlayerId: "player-1",
    requestJsonWithDeadline: (url) => new Promise((resolve, reject) => { requests.push({ url, resolve, reject }); }),
    encodeURIComponent,
    Error,
  };
  vm.runInNewContext(`let teamState = null;
function renderTeamHub() { renderTeamSections(); }
${app.slice(app.indexOf("function setTeamActionStatus("), app.indexOf("function setFriendsStatus("))}
this.loadTeamView = loadTeamView;`, sandbox);
  const visible = () => Object.fromEntries(
    ["team-loading", "team-loading-text", "team-loading-retry", "team-onboarding", "team-hub"].map((id) => [id, !elements[id].hidden])
  );
  return { elements, requests, sandbox, visible };
}

(async () => {
  // Takımı olan oyuncu: yanıt gelene kadar ne takım ne de "katıl / oluştur".
  {
    const { requests, sandbox, visible } = teamSandbox();
    const pending = sandbox.loadTeamView();
    assert.equal(requests[0].url, "/teams/player/player-1");
    assert.deepEqual(visible(), { "team-loading": true, "team-loading-text": true, "team-loading-retry": false, "team-onboarding": false, "team-hub": false });
    requests[0].resolve({ joined: true });
    assert.equal((await pending).ok, true);
    assert.deepEqual(visible(), { "team-loading": false, "team-loading-text": true, "team-loading-retry": false, "team-onboarding": false, "team-hub": true });
  }

  // Takımı olmayan oyuncu: "katıl / oluştur" ekranı yanıttan sonra açılır.
  {
    const { requests, sandbox, visible } = teamSandbox();
    const pending = sandbox.loadTeamView();
    assert.equal(visible()["team-onboarding"], false);
    requests[0].resolve({ joined: false });
    await pending;
    assert.deepEqual(visible(), { "team-loading": false, "team-loading-text": true, "team-loading-retry": false, "team-onboarding": true, "team-hub": false });
  }

  // İlk yükleme başarısız: hata ve yeniden deneme; yanlış ekran yine açılmaz.
  {
    const { elements, requests, sandbox, visible } = teamSandbox();
    const failed = sandbox.loadTeamView();
    requests[0].reject(new Error("Sunucuya ulaşılamadı."));
    assert.equal((await failed).ok, false);
    assert.deepEqual(visible(), { "team-loading": true, "team-loading-text": false, "team-loading-retry": true, "team-onboarding": false, "team-hub": false });
    assert.equal(elements["team-action-status"].textContent, "Sunucuya ulaşılamadı.");
    assert.equal(elements["team-action-status"].dataset.state, "error");
    // Yeniden deneme yükleme yazısına döner, sonra takımı açar.
    const retry = sandbox.loadTeamView();
    assert.deepEqual(visible(), { "team-loading": true, "team-loading-text": true, "team-loading-retry": false, "team-onboarding": false, "team-hub": false });
    requests[1].resolve({ joined: true });
    await retry;
    assert.equal(visible()["team-hub"], true);
    assert.equal(elements["team-action-status"].textContent, "");
    // Sonraki tazeleme başarısız olursa eldeki takım sayfası kalır.
    const refresh = sandbox.loadTeamView();
    assert.equal(visible()["team-hub"], true);
    requests[2].reject(new Error("Zaman aşımı."));
    await refresh;
    assert.deepEqual(visible(), { "team-loading": false, "team-loading-text": false, "team-loading-retry": true, "team-onboarding": false, "team-hub": true });
  }

  assert.match(app, /function renderTeamHub\(\) \{[^}]*if \(!onboarding \|\| !hub \|\| !teamState\) return;\s*renderTeamSections\(\);/);
  assert.ok(!app.includes("onboarding.hidden = Boolean(teamState.joined)"));
  assert.ok(app.includes('document.getElementById("team-loading-retry")?.addEventListener("click", () => {'));

  // --- Başlık: yönetim menüsü -------------------------------------------------
  const hub = screen.slice(screen.indexOf('<section id="team-hub"'));
  const profilePanel = hub.slice(hub.indexOf('<section data-team-panel="profile"'), hub.indexOf('<section data-team-panel="members"'));
  const header = profilePanel.slice(profilePanel.indexOf('<header id="team-identity-card"'), profilePanel.indexOf("</header>"));
  assert.ok(header.length > 0);
  // Amblem artık düğme değildir; yönetime üç çizgi menüsünden girilir.
  assert.match(header, /<span class="team-avatar-button" aria-hidden="true"><span id="team-avatar-glyph">/);
  for (const source of [html, app, css]) {
    for (const gone of ["team-management-open", "team-management-tabs", "team-summary-metrics", "team-total-trophies"]) {
      assert.ok(!source.includes(gone), `${gone} kalmamalı`);
    }
  }
  // Düğme adın sağındadır ve şablonda kapalıdır (yalnız liderde açılır).
  assert.match(header, /<button id="team-menu-button" class="lobby-menu-button team-menu-button" type="button" aria-label="Takım yönetimini aç" title="Takım Yönetimi" aria-haspopup="true" aria-expanded="false" aria-controls="team-menu" hidden>/);
  assert.match(header, /<nav id="team-menu" class="dropdown-menu team-menu" aria-label="Takım yönetimi bölümleri" hidden>/);
  assert.ok(header.indexOf('id="team-name"') < header.indexOf('id="team-menu-button"'));

  // Menüde yalnız takım yönetiminin iki sayfası vardır.
  const menu = header.slice(header.indexOf('<nav id="team-menu"'));
  const rows = [...menu.matchAll(/<button type="button" ([^>]*)>([^<]+)/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(rows, [
    ['data-team-management-tab="cosmetics"', "KOZMETİK"],
    ['data-team-management-tab="members"', "ÜYE YÖNETİMİ"],
  ]);
  assert.ok(!menu.includes("data-team-tab"));
  assert.match(menu, /ÜYE YÖNETİMİ<i id="team-application-badge" class="team-application-badge" hidden><\/i><\/button>/);
  for (const text of ["KOZMETİK", "ÜYE YÖNETİMİ", "Takım yönetimini aç", "Takım Yönetimi", "Takım yönetimi bölümleri", "Takım profiline dön", "ÜYE SAYISI"]) {
    assert.notEqual(i18n.translateText(text, "en"), text, `${text} çevrilmeli`);
  }
  // Yönetim bölümünde alt sekme yoktur; iki sayfa ve geri düğmesi durur.
  const management = hub.slice(hub.indexOf('<section data-team-panel="management"'), hub.indexOf('<nav class="team-tabs"'));
  assert.equal((management.match(/data-team-management-tab=/g) || []).length, 0);
  assert.ok(management.includes('<button id="team-management-back" type="button" aria-label="Takım profiline dön">'));
  assert.ok(management.includes('<section data-team-management-panel="cosmetics"'));
  assert.ok(management.includes('<section data-team-management-panel="members"'));

  // --- Alt sekme çubuğu yerinde ------------------------------------------------
  const tabs = hub.slice(hub.indexOf('<nav class="team-tabs"'));
  assert.deepEqual(
    [...tabs.matchAll(/<button type="button" data-team-tab="([a-z]+)"(?: class="is-active")?>([^<]+)<\/button>/g)].map((match) => [match[1], match[2]]),
    [["profile", "PROFİL"], ["members", "ÜYELER"], ["requests", "İSTEK"], ["chat", "SOHBET"], ["battle", "SAVAŞ"]]
  );
  assert.equal((html.match(/data-team-tab="/g) || []).length, 5);
  assert.match(css, /#team-hub \.team-tabs \{[\s\S]*?position:fixed !important;/);
  assert.match(css, /#team-screen \{ padding-bottom:calc\(88px \+ env\(safe-area-inset-bottom\)\) !important; \}/);

  // --- Üye sayısı ilk istatistik; kupa başlıkta yinelenmez --------------------
  const stats = [...profilePanel.matchAll(/<article><span>([^<]+)<\/span><strong id="([a-z-]+)">([^<]*)</g)].map((match) => [match[1], match[2], match[3]]);
  assert.deepEqual(stats.slice(0, 2), [["ÜYE SAYISI", "team-member-count", "0 / 30"], ["TOPLAM KUPA", "team-profile-total-trophies", "0"]]);
  assert.equal(stats.length, 7);
  assert.ok(app.includes('setText("team-member-count", `${teamState.member_count || 0} / ${teamState.member_limit || 30}`);'));
  assert.ok(!header.includes("ÜYE") || header.indexOf("ÜYE") > header.indexOf('<nav id="team-menu"'));

  // --- Menü davranışı: gerçek kod -----------------------------------------------
  const menuButton = { hidden: true };
  const menuSandbox = { document: { getElementById: (id) => (id === "team-menu-button" ? menuButton : null) } };
  vm.runInNewContext(`let teamState = null; let activeTeamTab = "profile";
${app.slice(app.indexOf("function renderTeamMenu()"), app.indexOf("function renderTeamHub()"))}
this.render = (state, tab) => { teamState = state; activeTeamTab = tab; renderTeamMenu(); return activeTeamTab; };`, menuSandbox);
  // Lider düğmeyi görür; yönetim bölümünde kalabilir.
  assert.equal(menuSandbox.render({ joined: true, is_owner: true }, "profile"), "profile");
  assert.equal(menuButton.hidden, false);
  assert.equal(menuSandbox.render({ joined: true, is_owner: true }, "management"), "management");
  // Üye düğmeyi görmez; diğer sekmeleri etkilenmez.
  assert.equal(menuSandbox.render({ joined: true, is_owner: false }, "chat"), "chat");
  assert.equal(menuButton.hidden, true);
  // Liderliği devreden oyuncu yönetim bölümünde kalmaz.
  assert.equal(menuSandbox.render({ joined: true, is_owner: false }, "management"), "profile");
  assert.match(app, /renderTeamMenu\(\);\s*renderTeamManagement\(\);\s*for \(const button of document\.querySelectorAll\("\[data-team-tab\]"\)\) \{/);

  // Bağlantılar: menü satırı yönetimin ilgili sayfasını açar; menü ortak açılır
  // menü kalıbıyla çalışır; başvuru ışığı üç çizgi düğmesindedir.
  assert.match(app, /document\.querySelectorAll\("#team-menu \[data-team-management-tab\]"\)\.forEach\(\(button\) => \{\s*button\.addEventListener\("click", \(\) => \{\s*if \(!teamState\?\.is_owner\) return;\s*activeTeamManagementTab = button\.dataset\.teamManagementTab \|\| "cosmetics";\s*activeTeamTab = "management";\s*renderTeamHub\(\);/);
  assert.match(app, /document\.getElementById\("team-management-back"\)\?\.addEventListener\("click", \(\) => \{\s*activeTeamTab = "profile";\s*renderTeamHub\(\);/);
  assert.ok(app.includes('bindDropdownMenu(document.getElementById("team-menu-button"), document.getElementById("team-menu"));'));
  assert.ok(app.includes('document.getElementById("team-menu-button")?.classList.toggle("has-team-application", has);'));
  assert.ok(css.includes("#team-menu-button.has-team-application::after {"));
  // Düğme sınıfı display'i zorladığı için gizleme kuralı açıkça yazılır.
  assert.match(css, /\.team-menu-button \{ width:42px;height:42px; \}\s*\.team-menu-button\[hidden\] \{ display:none !important; \}/);

  // --- Düzen: fazla çerçeveler yok ----------------------------------------------
  assert.match(css, /#team-screen \{ border-color:transparent !important;background:none !important;box-shadow:none !important; \}/);
  assert.match(css, /\.team-profile-panel,\.team-management-panel \{ min-height:0 !important;padding:0 !important;border:0;background:none;box-shadow:none; \}/);
  assert.match(css, /\.team-profile-panel > \.team-identity-card \{ position:relative;/);

  console.log("team screen contract passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
