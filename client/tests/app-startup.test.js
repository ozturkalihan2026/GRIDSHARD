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
    this.style = {};
    this._listeners = {};
    this.classList = {
      add() {}, remove() {}, toggle() {}, contains() { return false; },
    };
  }
  addEventListener(type, callback) { this._listeners[type] = callback; }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { this.children.push(...items); }
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

let rafCallback = null;

const sandbox = {
  ...relayApi,
  RelayAppScreen: { MENU:"menu", PLAY:"play", PROFILE:"profile", STATISTICS:"statistics", SETTINGS:"settings" },
  document,
  console,
  performance: { now: () => 0 },
  requestAnimationFrame: (callback) => { rafCallback = callback; return 1; },
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


// Beta.22: Oyna → Savaş Alanını Hemen Aç → gerçek yerel AI savaş alanı.
const playButton = menuButtons.find((x) => x.dataset.openScreen === "play");
playButton.disabled = false;
playButton._listeners.click();

if (document.body.dataset.appScreen !== "play") {
  throw new Error(`Oyna menüsü açılmadı: ${document.body.dataset.appScreen}`);
}
if (document.body.dataset.playMode !== "local") {
  throw new Error(`Oyna doğrudan hazırlık modunu açmadı: ${document.body.dataset.playMode}`);
}
if (document.body.dataset.localStatus !== "setup") {
  throw new Error(`Oyna hazırlık ekranına gitmedi: ${document.body.dataset.localStatus}`);
}

const quickStart = getElement("local-battle-quick-start");
if (typeof quickStart._listeners.click !== "function") {
  throw new Error("Savaş Alanını Hemen Aç handler bağlanmadı.");
}

quickStart._listeners.click();

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
if (!quickState || quickState.pool_size !== 18 || quickState.started !== true) {
  throw new Error(`Hızlı savaş durumu geçersiz: ${JSON.stringify(quickState)}`);
}

if (typeof rafCallback !== "function") {
  throw new Error("Savaş requestAnimationFrame döngüsü kurulmadı.");
}

// Saat ve 15. saniye raf kilidini gerçek updateClock üzerinden ilerlet.
for (let ms = 1000; ms <= 16000; ms += 1000) {
  const cb = rafCallback;
  cb(ms);
}

if (getElement("battle-time").textContent === "00:00.0") {
  throw new Error("Savaş sayacı ilerlemedi.");
}
if (getElement("shelf-lock-label").textContent !== "Aktif") {
  throw new Error(`Modül Rafı 15. saniyede açılmadı: ${getElement("shelf-lock-label").textContent}`);
}

const beforeRotation = sandbox.window.__GRIDSHARD_TEST_API.getBattleState().directions["laser-1"];
if (!sandbox.window.__GRIDSHARD_TEST_API.rotateModule("laser-1")) {
  throw new Error("Aktif modül tıklama/port dönüş komutu üretmedi.");
}
const afterRotation = sandbox.window.__GRIDSHARD_TEST_API.getBattleState().directions["laser-1"];
if (beforeRotation === afterRotation) {
  throw new Error(`Port yönü değişmedi: ${beforeRotation}`);
}
// Savaş sonuç regresyonunu port bağlantısı değişikliğinden izole etmek için
// üç ek dönüşle başlangıç yönüne dön.
for (let i = 0; i < 3; i += 1) {
  sandbox.window.__GRIDSHARD_TEST_API.rotateModule("laser-1");
}

// Yerel savaşın karşılıklı hasarla gerçek sonuca ulaştığını doğrula.
for (let ms = 17000; ms <= 120000 && document.body.dataset.localFinished !== "true"; ms += 1000) {
  const cb = rafCallback;
  cb(ms);
}

if (document.body.dataset.localFinished !== "true") {
  throw new Error("Yerel AI savaşı 120 saniye içinde sonuca ulaşmadı.");
}
if (!getElement("enemy-board")) {
  throw new Error("Rakip devresi render alanı bulunamadı.");
}

const frozenState = sandbox.window.__GRIDSHARD_TEST_API.getBattleState();
const frozenElapsed = frozenState.elapsed_ms;
const frozenDirection = frozenState.directions["laser-1"];
rafCallback(130000);
const afterFinishState = sandbox.window.__GRIDSHARD_TEST_API.getBattleState();
if (afterFinishState.elapsed_ms !== frozenElapsed) {
  throw new Error(`Maç sonu sayaç donmadı: ${frozenElapsed} -> ${afterFinishState.elapsed_ms}`);
}
if (sandbox.window.__GRIDSHARD_TEST_API.rotateModule("laser-1")) {
  throw new Error("Maç bittikten sonra port dönüşü kabul edildi.");
}
if (afterFinishState.directions["laser-1"] !== frozenDirection) {
  throw new Error("Maç bittikten sonra modül yönü değişti.");
}

const returnPreparation = getElement("return-preparation-button");
if (typeof returnPreparation._listeners.click !== "function") {
  throw new Error("Hazırlık Ekranına Dön handler bağlanmadı.");
}
returnPreparation._listeners.click();
if (document.body.dataset.localStatus !== "setup") {
  throw new Error(`Sonuçtan hazırlığa dönülmedi: ${document.body.dataset.localStatus}`);
}

quickStart._listeners.click();
for (let ms = 1000; ms <= 5000; ms += 1000) {
  rafCallback(ms);
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

console.log("app startup + preparation return + forfeit penalty + timer freeze + reciprocal local battle test passed");
process.exit(0);
