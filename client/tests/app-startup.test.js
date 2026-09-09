const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CLIENT_ROOT = path.join(__dirname, "..");
const relayApi = require(path.join(CLIENT_ROOT, "src", "relay-client.js"));

process.on("unhandledRejection", (error) => {
  console.error(error);
  process.exit(1);
});

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.className = "";
    this.children = [];
    this.style = { setProperty(name, value) { this[name] = value; } };
    this._listeners = {};
    this.classList = {
      add() {}, remove() {}, toggle() {}, contains() { return false; },
    };
  }
  addEventListener(type, callback) { this._listeners[type] = callback; }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { this.children.push(...items); }
  prepend(...items) { this.children.unshift(...items); }
  replaceChildren(...items) { this.children = [...items]; }
  removeChild(child) { this.children = this.children.filter((x) => x !== child); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  getAttribute() { return null; }
  removeAttribute() {}
  focus() {}
}

const elements = new Map();
const getElement = (id) => {
  if (!elements.has(id)) elements.set(id, new FakeElement(id));
  return elements.get(id);
};

const menuButtons = ["play", "profile", "statistics", "settings"].map((screen) => {
  const button = new FakeElement(`menu-${screen}`);
  button.dataset.openScreen = screen;
  return button;
});

const genericPanel = () => new FakeElement("generic-panel");
const document = {
  body: getElement("body"),
  getElementById: getElement,
  createElement: (tag) => new FakeElement(tag),
  createElementNS: (_namespace, tag) => new FakeElement(tag),
  querySelector(selector) {
    if (selector === '[data-open-screen="play"]') return menuButtons[0];
    if (selector === ".play-result-panel") return getElement("result-panel");
    if (selector === ".play-technical-panel") return getElement("technical-panel");
    return genericPanel();
  },
  querySelectorAll(selector) {
    if (selector === "[data-open-screen]") return menuButtons;
    if (selector === "[data-screen-panel]") return [];
    if (selector === ".play-live-panel") return [];
    return [];
  },
};

const rafCallbacks = [];
const runAnimationFrame = (now) => {
  const callbacks = rafCallbacks.splice(0, rafCallbacks.length);
  for (const callback of callbacks) callback(now);
  return callbacks.length;
};

const sandbox = {
  ...relayApi,
  RelayAppScreen: { MENU:"menu", PLAY:"play", PROFILE:"profile", STATISTICS:"statistics", SETTINGS:"settings" },
  document,
  console,
  performance: { now: () => 0 },
  requestAnimationFrame: (callback) => { rafCallbacks.push(callback); return rafCallbacks.length; },
  cancelAnimationFrame: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  WebSocket: function WebSocket() {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  crypto: { randomUUID: () => "test-uuid" },
  URL,
  Date,
  Math,
  JSON,
  Set,
  Map,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Promise,
  Error,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const relativePath of [
  ["src", "screens", "screen-controller.js"],
  ["src", "tutorial", "tutorial-controller.js"],
  ["src", "battle", "board-view.js"],
  ["src", "battle", "module-card-view.js"],
]) {
  const moduleSource = fs.readFileSync(
    path.join(CLIENT_ROOT, ...relativePath),
    "utf8"
  );
  vm.runInContext(moduleSource, sandbox, { filename: relativePath.at(-1) });
}

const mobileControllerSource = fs.readFileSync(
  path.join(CLIENT_ROOT, "src", "battle", "mobile-controller.js"),
  "utf8"
);
vm.runInContext(mobileControllerSource, sandbox, { filename: "mobile-controller.js" });
const canonDataSource = fs.readFileSync(
  path.join(CLIENT_ROOT, "src", "canon-data.js"),
  "utf8"
);
vm.runInContext(canonDataSource, sandbox, { filename: "canon-data.js" });
const source = fs.readFileSync(path.join(CLIENT_ROOT, "src", "app.js"), "utf8");
vm.runInContext(source, sandbox, { filename: "app.js" });

for (const button of menuButtons) {
  if (typeof button._listeners.click !== "function") {
    throw new Error(`Menü click handler bağlanmadı: ${button.dataset.openScreen}`);
  }
}

// Profil menüsü sunucu hazır olmasa bile router seviyesinde açılabilmeli.
menuButtons.find((x) => x.dataset.openScreen === "profile")._listeners.click();
if (document.body.dataset.appScreen !== "profile") {
  throw new Error(`Profil menüsü açılmadı: ${document.body.dataset.appScreen}`);
}


// Beta.26: Oyna doğrudan tek çevrimiçi hazırlık akışını açar.
const playButton = menuButtons.find((x) => x.dataset.openScreen === "play");
playButton.disabled = false;
playButton._listeners.click();

if (document.body.dataset.appScreen !== "play") {
  throw new Error(`Oyna menüsü açılmadı: ${document.body.dataset.appScreen}`);
}
if (document.body.dataset.playMode !== "online") {
  throw new Error(`Oyna doğrudan hazırlık modunu açmadı: ${document.body.dataset.playMode}`);
}
if (document.body.dataset.onlineStatus !== "idle") {
  throw new Error(`Oyna çevrimiçi hazırlık ekranına gitmedi: ${document.body.dataset.onlineStatus}`);
}

// Ürün arayüzünde yerel mod seçimi yoktur; otomatik savaş regresyonu yalnız
// test API'sindeki sunucu AI yardımcısıyla sürdürülür.
sandbox.window.__GRIDSHARD_TEST_API.startQuickLocalBattle();

if (document.body.dataset.playMode !== "local") {
  throw new Error(`Yerel savaş modu açılmadı: ${document.body.dataset.playMode}`);
}

if (document.body.dataset.localStatus !== "battle") {
  throw new Error(`Savaş alanına doğrudan geçilemedi: ${document.body.dataset.localStatus}`);
}

const battleBoard = getElement("board");
if (!battleBoard) {
  throw new Error("Savaş alanı board elementi bulunamadı.");
}

const quickState = sandbox.window.__GRIDSHARD_TEST_API?.getBattleState?.();
if (!quickState || quickState.pool_size !== 6 || quickState.started !== true) {
  throw new Error(`Hızlı savaş durumu geçersiz: ${JSON.stringify(quickState)}`);
}

if (rafCallbacks.length === 0) {
  throw new Error("Savaş requestAnimationFrame döngüsü kurulmadı.");
}

// Saat ilerlerken krediye bağlı raf durumu korunmalı; yerleştirme sayacı yoktur.
for (let ms = 1000; ms <= 16000; ms += 1000) {
  runAnimationFrame(ms);
}

if (getElement("battle-time").textContent === "00:00.0") {
  throw new Error("Savaş sayacı ilerlemedi.");
}
if (getElement("shelf-lock-label").textContent !== "Aktif") {
  throw new Error(
    `Modül Rafı 15. saniyede açılmadı: ${getElement("shelf-lock-label").textContent}`
    + ` · durum ${JSON.stringify(sandbox.window.__GRIDSHARD_TEST_API.getBattleState())}`
  );
}

if (!sandbox.window.__GRIDSHARD_TEST_API.deployModule("laser")) {
  throw new Error("Krediye bağlı deste kartı yerleştirilemedi.");
}
const deployedLaserId = sandbox.window.__GRIDSHARD_TEST_API
  .getBattleState().active_module_ids.find((moduleId) => moduleId.startsWith("mock-laser-"));
if (!deployedLaserId) {
  throw new Error("Sunucu yerleşimli Lazer örneği bulunamadı.");
}
if ("rotateModule" in sandbox.window.__GRIDSHARD_TEST_API) {
  throw new Error("Eski modül döndürme komutu test API'sinde kaldı.");
}
if ("directions" in sandbox.window.__GRIDSHARD_TEST_API.getBattleState()) {
  throw new Error("Eski port yönleri savaş durumunda kaldı.");
}

// Çevrimdışı UI yedeğinde rakip deste üretimi yoktur; sonuç ve sayaç donmasını
// kullanıcı çekilmesiyle doğrula. Gerçek AI akışı sunucu E2E testindedir.
const firstForfeitButton = getElement("battle-forfeit-button");
firstForfeitButton._listeners.click();
if (document.body.dataset.localFinished !== "true") {
  throw new Error("Çevrimdışı savaş çekilme sonucuna ulaşmadı.");
}
if (!getElement("enemy-board")) {
  throw new Error("Rakip devresi render alanı bulunamadı.");
}

const frozenState = sandbox.window.__GRIDSHARD_TEST_API.getBattleState();
const frozenElapsed = frozenState.elapsed_ms;
runAnimationFrame(130000);
const afterFinishState = sandbox.window.__GRIDSHARD_TEST_API.getBattleState();
if (afterFinishState.elapsed_ms !== frozenElapsed) {
  throw new Error(`Maç sonu sayaç donmadı: ${frozenElapsed} -> ${afterFinishState.elapsed_ms}`);
}

const postMatchContinue = getElement("post-match-continue");
if (typeof postMatchContinue._listeners.click !== "function") {
  throw new Error("Maç sonu Devam handler bağlanmadı.");
}
postMatchContinue._listeners.click({ currentTarget: postMatchContinue });
if (postMatchContinue.dataset.postMatchStage !== "rewards") {
  throw new Error("İlk Devam ödül aşamasını açmadı.");
}
postMatchContinue._listeners.click({ currentTarget: postMatchContinue });
if (document.body.dataset.appScreen !== "menu") {
  throw new Error(`İkinci Devam ile EV ekranına dönülmedi: ${document.body.dataset.appScreen}`);
}

sandbox.window.__GRIDSHARD_TEST_API.startQuickLocalBattle();
for (let ms = 1000; ms <= 5000; ms += 1000) {
  runAnimationFrame(ms);
}

const forfeitButton = getElement("battle-forfeit-button");
if (typeof forfeitButton._listeners.click !== "function") {
  throw new Error("Savaşı Bırak handler bağlanmadı.");
}
forfeitButton._listeners.click();
if (document.body.dataset.localFinished !== "true") {
  throw new Error("Savaşı Bırak çevrimdışı geri dönüş savaşını sonuçlandırmadı.");
}
if (!getElement("battle-result-summary").textContent.includes("Savaşı bıraktın")) {
  throw new Error(`Savaşı bırakma sonucu görünmedi: ${getElement("battle-result-summary").textContent}`);
}
if (getElement("local-report-forfeit-penalty").textContent === "0 DK") {
  throw new Error("Savaşta kazanılan kredi için kaçış cezası uygulanmadı.");
}

console.log("app startup + two-step result return + forfeit penalty + timer freeze + reciprocal local battle test passed");
process.exit(0);
