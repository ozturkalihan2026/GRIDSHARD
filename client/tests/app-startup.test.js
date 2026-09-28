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
  visibilityState: "visible",
  addEventListener() {},
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
  addEventListener() {},
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
  ["src", "native-push.js"],
  ["src", "screens", "screen-controller.js"],
  ["src", "screens", "card-swipe.js"],
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

// Savaş yalnız sunucu BattleEngine'inde çalışır: sunucu anlık görüntüsü
// gelmeden sayaç ilerlemez ve istemci kendi başına savaş simüle etmez.
for (let ms = 1000; ms <= 16000; ms += 1000) {
  runAnimationFrame(ms);
}
if (getElement("battle-time").textContent !== "00:00.0") {
  throw new Error(`Sunucu olmadan savaş sayacı ilerledi: ${getElement("battle-time").textContent}`);
}
if ("rotateModule" in sandbox.window.__GRIDSHARD_TEST_API) {
  throw new Error("Eski modül döndürme komutu test API'sinde kaldı.");
}
if ("directions" in sandbox.window.__GRIDSHARD_TEST_API.getBattleState()) {
  throw new Error("Eski port yönleri savaş durumunda kaldı.");
}

// Sunucu oturumu yokken deste kartı istemcide yerleşmez.
sandbox.window.__GRIDSHARD_TEST_API.deployModule("laser");
const activeWithoutServer = sandbox.window.__GRIDSHARD_TEST_API.getBattleState().active_module_ids;
if (activeWithoutServer.some((moduleId) => moduleId !== "core-1")) {
  throw new Error(`Sunucusuz yerleşim yapıldı: ${JSON.stringify(activeWithoutServer)}`);
}

(async () => {
  // Sunucu 503 döndüğünde AI savaşı açılmaz; oyuncu hazırlık ekranına döner.
  for (let index = 0; index < 20; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  if (document.body.dataset.localStatus !== "setup") {
    throw new Error(`Sunucusuz savaş hazırlığa dönmedi: ${document.body.dataset.localStatus}`);
  }
  console.log("app startup + menu + server-only battle guard test passed");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
