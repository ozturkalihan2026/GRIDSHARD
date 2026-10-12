"use strict";

// Üst bardaki üç çizgi menüsü: Kozmetik, Ödüller, Arkadaş ve Ayarlar mesaj
// kutusunun sağındaki düğmeden açılır. Profil, profil simgesinden doğrudan
// açılır; profil sayfalarının altındaki sekme çubuğu yoktur.
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
const styles = read("src", "styles.css");

// Eski sekme çubuğundan iz kalmadı.
for (const source of [html, app, css, styles]) {
  assert.ok(!source.includes("profile-terminal-tabs"), "profil sekme çubuğu kalmamalı");
}

// Düğme barın içinde, mesaj kutusundan sonra gelir; liste kapalı başlar.
const ribbon = html.slice(html.indexOf('<section id="app-progress-ribbon"'), html.indexOf('<div class="lobby-season-progress"'));
assert.ok(ribbon.length > 0);
assert.ok(ribbon.indexOf('id="reward-inbox-button"') < ribbon.indexOf('id="lobby-menu-button"'));
assert.match(ribbon, /<button id="lobby-menu-button" class="lobby-menu-button" type="button" aria-label="Menüyü aç" title="Menü" aria-haspopup="true" aria-expanded="false" aria-controls="lobby-menu">/);
assert.match(ribbon, /<nav id="lobby-menu" class="dropdown-menu lobby-menu" aria-label="Menü" hidden>/);

// Dört satır, kullanıcının verdiği sırayla; Profil satırı yoktur.
const menu = ribbon.slice(ribbon.indexOf('<nav id="lobby-menu"'), ribbon.indexOf("</nav>", ribbon.indexOf('<nav id="lobby-menu"')));
const rows = [...menu.matchAll(/<button type="button" data-open-screen="([a-z-]+)">([^<]+)<\/button>/g)].map((match) => [match[1], match[2]]);
assert.deepEqual(rows, [
  ["avatar", "KOZMETİK"],
  ["daily", "ÖDÜLLER"],
  ["friends", "ARKADAŞ"],
  ["settings", "AYARLAR"],
]);
for (const [, label] of rows) {
  assert.notEqual(i18n.translateText(label, "en"), label, `${label} çevrilmeli`);
}
assert.equal(i18n.translateText("Menüyü aç", "en"), "Open menu");
assert.equal(i18n.translateText("Menü", "en"), "Menu");

// Profil simgesi profili doğrudan açar; profil sayfalarında başka sayfaya
// götüren görünür düğme yalnız ödül alt sayfalarının geri bağlantısıdır.
assert.match(ribbon, /<button id="lobby-profile-button" class="lobby-profile-button" type="button" data-open-screen="profile"/);
const profilePages = html.slice(html.indexOf('id="profile-summary-panel"'), html.indexOf('id="play-recovery-panel"'));
for (const target of ["profile", "avatar", "friends", "settings"]) {
  assert.ok(!new RegExp(`<button[^>]*data-open-screen="${target}"`).test(profilePages), `${target} sekme düğmesi kalmamalı`);
}

// Bildirim ışığı profil simgesinden üç çizgi düğmesine taşındı.
assert.ok(!css.includes("#lobby-profile-button.has-"));
assert.ok(!app.includes('getElementById("lobby-profile-button")'));
assert.ok(css.includes("#lobby-menu-button.has-avatar-notification::after,"));
assert.ok(app.includes('document.getElementById("lobby-menu-button")?.classList.toggle("has-social-notification", hasSocial);'));
assert.ok(app.includes(`document.querySelectorAll('#lobby-menu [data-open-screen="friends"]')`));
assert.match(app, /lobbyMenuButton\?\.classList\.toggle\(\s*"has-avatar-notification",/);

// Düzen: düğme dördüncü sütunda; liste düğmenin altında, öğelerin üstünde.
assert.match(css, /body\[data-app-screen="menu"\] \.app-progress-ribbon \{[^}]*grid-template-columns:50px minmax\(0,1fr\) 42px 42px !important;/);
assert.match(css, /body\[data-app-screen="menu"\] \.app-progress-ribbon #lobby-menu-button \{ grid-column:4; \}/);
assert.match(css, /\.dropdown-menu \{[^}]*position:absolute;[^}]*top:calc\(100% \+ 6px\);[^}]*right:0;/);
assert.match(css, /\.dropdown-menu\[hidden\] \{ display:none !important; \}/);
// Açık menü alt çubuğun üstünde kalır; sığmayan liste kendi içinde kayar.
assert.match(css, /\.app-progress-ribbon\.has-open-dropdown \{ z-index:110 !important; \}/);
assert.match(css, /\.lobby-menu \{ max-height:calc\(100vh - 128px\);overflow-y:auto; \}/);
assert.match(css, /\.dropdown-menu > button \{[^}]*min-height:44px;/);

// Davranış: gerçek kod, küçük bir sahte belgeyle çalıştırılır.
function fakeElement(name) {
  const listeners = {};
  const attributes = {};
  return {
    name,
    hidden: false,
    focused: 0,
    addEventListener: (type, handler) => { (listeners[type] ||= []).push(handler); },
    setAttribute: (key, value) => { attributes[key] = value; },
    getAttribute: (key) => attributes[key],
    contains(target) { return target === this || target?.parent === this; },
    focus() { this.focused += 1; },
    fire: (type, event = {}) => { for (const handler of listeners[type] || []) handler(event); },
  };
}
const documentListeners = {};
const sandbox = {
  document: { addEventListener: (type, handler) => { (documentListeners[type] ||= []).push(handler); } },
};
vm.runInNewContext(`${app.slice(app.indexOf("const dropdownMenus = [];"), app.indexOf("function renderAppScreen()"))}
this.bindDropdownMenu = bindDropdownMenu;
this.closeDropdownMenus = closeDropdownMenus;`, sandbox);
const fireDocument = (type, event) => { for (const handler of documentListeners[type] || []) handler(event); };
const clickEvent = () => ({ prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });

const button = fakeElement("button");
const list = fakeElement("menu");
list.hidden = true;
const host = { classes: {}, classList: { toggle: (name, on) => { host.classes[name] = on; } } };
list.parentElement = host;
const row = { parent: list, closest: (selector) => (selector === "button" ? row : null) };
const outside = { closest: () => null };
sandbox.bindDropdownMenu(button, list);
sandbox.bindDropdownMenu(null, list); // eksik öğe hataya yol açmaz

// Düğme açar ve kapatır.
button.fire("click");
assert.equal(list.hidden, false);
assert.equal(button.getAttribute("aria-expanded"), "true");
assert.equal(host.classes["has-open-dropdown"], true);
button.fire("click");
assert.equal(list.hidden, true);
assert.equal(button.getAttribute("aria-expanded"), "false");
assert.equal(host.classes["has-open-dropdown"], false);

// Satıra dokunmak kapatır; satırın kendi tıklaması yutulmaz.
button.fire("click");
fireDocument("pointerdown", { target: row });
const rowClick = clickEvent();
fireDocument("click", rowClick);
assert.equal(rowClick.stopped, false);
list.fire("click", { target: row });
assert.equal(list.hidden, true);

// Dışarıya dokunmak yalnız menüyü kapatır: o dokunuşun tıklaması yutulur,
// bir sonraki dokunuş olağan çalışır.
button.fire("click");
fireDocument("pointerdown", { target: outside });
assert.equal(list.hidden, true);
assert.equal(button.getAttribute("aria-expanded"), "false");
const dismissClick = clickEvent();
fireDocument("click", dismissClick);
assert.equal(dismissClick.stopped && dismissClick.prevented, true);
fireDocument("pointerdown", { target: outside });
const nextClick = clickEvent();
fireDocument("click", nextClick);
assert.equal(nextClick.stopped, false);

// Escape kapatır ve odağı düğmeye verir; menü kapalıyken odak oynamaz.
button.fire("click");
fireDocument("keydown", { key: "Escape" });
assert.equal(list.hidden, true);
assert.equal(button.focused, 1);
fireDocument("keydown", { key: "Escape" });
assert.equal(button.focused, 1);

// Ekran değişimi açık menüyü kapatır.
button.fire("click");
sandbox.closeDropdownMenus();
assert.equal(list.hidden, true);
const open = app.slice(app.indexOf("function openAppScreen("), app.indexOf("async function markScreenNotificationsSeen"));
assert.ok(open.includes("closeDropdownMenus();"));
assert.ok(app.includes('bindDropdownMenu(document.getElementById("lobby-menu-button"), document.getElementById("lobby-menu"));'));

console.log("lobby menu contract passed");
