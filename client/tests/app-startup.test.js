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

console.log("app startup + menu binding test passed");
process.exit(0);
