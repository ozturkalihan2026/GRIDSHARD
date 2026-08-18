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

const sandbox = {
  ...relayApi,
  RelayAppScreen: { MENU:"menu", PLAY:"play", PROFILE:"profile", STATISTICS:"statistics", SETTINGS:"settings" },
  document,
  console,
  performance: { now: () => 0 },
  requestAnimationFrame: () => 0,
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


// Oyna → Tek Oyunculu → 18 modüllük havuz → AI savaşına giriş
// gerçek app.js başlangıç zinciri üzerinde test edilir.
const playButton = menuButtons.find((x) => x.dataset.openScreen === "play");
playButton.disabled = false;
playButton._listeners.click();

if (document.body.dataset.appScreen !== "play") {
  throw new Error(`Oyna menüsü açılmadı: ${document.body.dataset.appScreen}`);
}

const localStart = getElement("local-play-start");
if (typeof localStart._listeners.click !== "function") {
  throw new Error("Tek Oyunculu Test Maçı handler bağlanmadı.");
}
localStart._listeners.click();

if (document.body.dataset.playMode !== "local") {
  throw new Error(`Yerel mod hazırlanmadı: ${document.body.dataset.playMode}`);
}

const catalog = getElement("battle-pool-selection");
const confirm = getElement("battle-pool-confirm");

if (playButton.disabled) {
  throw new Error("Oyna butonu readiness nedeniyle pasif kaldı.");
}

const catalogChoices = [];
for (const group of catalog.children) {
  const list = group.children?.[1];
  if (!list) continue;
  for (const choice of list.children || []) {
    catalogChoices.push(choice);
  }
}

if (catalogChoices.length < 18) {
  throw new Error(`Global modül listesi eksik: ${catalogChoices.length}`);
}

// Jeneratör zaten zorunlu seçili. İlk jeneratör dışındaki 17 modülü seç.
let selected = 1;
for (const choice of catalogChoices) {
  if (selected >= 18) break;
  const choiceLabel =
    choice.children?.[0]?.textContent
    || choice.textContent;
  if (choiceLabel === "Jeneratör") continue;

  if (typeof choice._listeners.click !== "function") {
    throw new Error(`Katalog modül handler yok: ${choice.textContent}`);
  }
  choice._listeners.click();

  const selectMark =
    choice.children?.[1];
  if (
    !selectMark
    || typeof selectMark._listeners.click !== "function"
  ) {
    throw new Error("Modül hücresi seçim işareti handler bağlanmadı.");
  }
  selectMark._listeners.click({
    stopPropagation() {},
  });
  selected += 1;
}

if (confirm.disabled) {
  throw new Error("18 modül sonrası AI eşleştirme düğmesi etkinleşmedi.");
}

if (typeof confirm._listeners.click !== "function") {
  throw new Error("Eşleştir handler bağlanmadı.");
}

confirm._listeners.click();

if (document.body.dataset.localStatus !== "battle") {
  throw new Error(`Yerel AI savaş alanına geçilmedi: ${document.body.dataset.localStatus}`);
}

console.log("app startup + menu + local playable flow test passed");
process.exit(0);
