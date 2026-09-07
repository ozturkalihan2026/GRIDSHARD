const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function load(relativePath, extra = {}) {
  const sandbox = { ...extra };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), sandbox);
  return sandbox;
}

test("screen controller ekran panellerini tek yerde yönetir", () => {
  const panels = ["play", "profile"].map(screen => ({ dataset: { screenPanel: screen }, hidden: false }));
  const shellButtons = ["menu", "profile"].map(screen => ({
    dataset: { shellScreen: screen },
    attributes: {},
    classList: { toggle(name, enabled) { this[name] = enabled; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  }));
  const elements = {
    "main-menu-panel": { hidden: false },
    "current-screen-label": { textContent: "" }
  };
  const document = {
    body: { dataset: {} },
    querySelectorAll: selector => selector === "[data-shell-screen]" ? shellButtons : panels,
    getElementById: id => elements[id] || null
  };
  const sandbox = load(path.join("src", "screens", "screen-controller.js"), { document });
  const controller = new sandbox.GridshardScreenController({
    router: { currentScreen: "profile" },
    screenEnum: { MENU: "menu" },
    documentRef: document
  });

  assert.equal(controller.render(), "profile");
  assert.equal(document.body.dataset.appScreen, "profile");
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[1].hidden, false);
  assert.equal(shellButtons[0].classList["is-active"], false);
  assert.equal(shellButtons[1].classList["is-active"], true);
  assert.equal(shellButtons[1].attributes["aria-current"], "page");
  assert.equal(elements["current-screen-label"].textContent, "Profil");
});

test("battle board view yalnız aktif modülleri hedef hücrelerine yerleştirir", () => {
  const cells = new Map();
  for (const [x, y] of [[0, 0], [1, 1]]) {
    cells.set(`${x},${y}`, {
      innerHTML: "old",
      dataset: { occupied: "true" },
      classList: {
        contains: () => false,
        remove(name) { delete this[name]; },
        toggle(name, enabled) { this[name] = enabled; }
      },
      children: [],
      appendChild(child) { this.children.push(child); }
    });
  }
  const board = {
    querySelectorAll: () => [...cells.values()],
    querySelector(selector) {
      const match = selector.match(/data-x="(\d+)".*data-y="(\d+)"/);
      return match ? cells.get(`${match[1]},${match[2]}`) : null;
    }
  };
  const sandbox = load(path.join("src", "battle", "board-view.js"));
  const view = new sandbox.GridshardBattleBoardView(board);
  view.render([
    { instanceId: "active", status: "active", position: { x: 1, y: 1 } },
    { instanceId: "reserve", status: "reserve", position: null }
  ], {
    selectedModuleId: "reserve",
    createModuleCard: module => ({ id: module.instanceId })
  });

  assert.equal(cells.get("0,0").dataset.occupied, "false");
  assert.equal(cells.get("1,1").dataset.occupied, "true");
  assert.deepEqual(cells.get("1,1").children, [{ id: "active" }]);
});

test("battle board view enkazlı hücreyi geri sayımla kilitli gösterir", () => {
  const classState = new Set();
  const cell = {
    innerHTML: "",
    dataset: { x: "1", y: "1", occupied: "false" },
    classList: {
      contains: name => classState.has(name),
      add: name => classState.add(name),
      remove: name => classState.delete(name),
      toggle(name, enabled) {
        if (enabled) classState.add(name);
        else classState.delete(name);
      }
    },
    children: [],
    appendChild(child) { this.children.push(child); }
  };
  const board = {
    querySelectorAll: () => [cell],
    querySelector: () => cell
  };
  const document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        textContent: "",
        children: [],
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        append(...items) { this.children.push(...items); }
      };
    }
  };
  const sandbox = load(
    path.join("src", "battle", "board-view.js"),
    { document }
  );
  const view = new sandbox.GridshardBattleBoardView(board);

  view.render([], {
    cellDebris: [{ x: 1, y: 1, remaining_ms: 4_200 }],
    debrisLabel: "Enkaz",
    createModuleCard: () => ({})
  });

  assert.equal(cell.dataset.debris, "true");
  assert.equal(classState.has("debris-cell"), true);
  assert.equal(cell.children[0].children[1].textContent, "5 sn");
});

test("module card view bilinmeyen modüle güvenli simge verir", () => {
  const sandbox = load(path.join("src", "battle", "module-card-view.js"));
  assert.equal(sandbox.GridshardModuleCardView.iconFor({ nameTr: "Lazer" }), "↯");
  assert.equal(sandbox.GridshardModuleCardView.iconFor({ nameTr: "Bilinmeyen" }), "●");
});

test("tutorial controller etkileşimli adımı tamamlayıp ilerler", async () => {
  const fields = new Map();
  const field = key => {
    if (!fields.has(key)) fields.set(key, { hidden: false, disabled: false, textContent: "", addEventListener() {} });
    return fields.get(key);
  };
  const root = {
    hidden: true,
    dataset: {},
    querySelector: field
  };
  const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  const document = { querySelector: () => null };
  const sandbox = load(path.join("src", "tutorial", "tutorial-controller.js"), { document, localStorage: storage });
  const actions = [];
  const controller = new sandbox.GridshardTutorialController({
    root,
    storage,
    storageKey: "tutorial",
    steps: [
      { title: "Havuz", body: "Yükle", action: "load", actionLabel: "Yükle" },
      { title: "Bitti", body: "Tamam" }
    ],
    onAction: async action => { actions.push(action); return true; }
  });

  assert.equal(controller.start(), true);
  await controller.runAction();
  assert.deepEqual(actions, ["load"]);
  assert.equal(controller.index, 1);
  controller.finish();
  assert.equal(storage.value, "complete");
  assert.equal(root.hidden, true);
});

test("mobil runtime yapılandırması API isteklerini HTTPS backend'e yönlendirir", async () => {
  const calls = [];
  const sandbox = load(path.join("src", "auth-session.js"), {
    GRIDSHARD_API_BASE_URL: "https://api.gridshard.example/",
    fetch: async input => {
      calls.push(typeof input === "string" ? input : input.url);
      return { ok: true, status: 200, json: async () => ({}) };
    },
    location: { href: "capacitor://localhost/", origin: "null" },
    localStorage: { getItem() { return null; }, setItem() {} },
    URL,
    Request,
    Headers,
    crypto
  });

  await sandbox.fetch("/health");
  await sandbox.fetch("/leaderboards");
  assert.deepEqual(calls, [
    "https://api.gridshard.example/health",
    "https://api.gridshard.example/leaderboards"
  ]);
  assert.equal(sandbox.GridshardAuth.apiBaseUrl, "https://api.gridshard.example");
});

test("Beta.42.3 ana ekran ve ilerleme yüzeyleri tek bakışta kullanılabilir", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "src", "canon.css"), "utf8");

  assert.equal(html.includes('id="modules-coin-balance"'), false);
  assert.equal(html.includes('id="modules-flux-balance"'), false);
  assert.equal(html.includes('id="module-detail-role"'), false);
  assert.match(app, /kicker\.hidden = true/);
  assert.match(app, /arena-path-stage\.is-current/);
  assert.match(css, /\.home-arena-segments > i[\s\S]*grid-column:auto !important/);
  assert.match(css, /\.module-detail-tab-content\[data-tab="talents"\][\s\S]*overflow:hidden !important/);
});

test("Beta.43 kartlar, çekirdek ayrıntısı ve lider panosu akışlarını sunar", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "src", "canon.css"), "utf8");

  assert.match(html, />KARTLAR</);
  assert.match(html, /data-card-page="modules"/);
  assert.match(html, /data-card-page="cores"/);
  assert.match(html, /id="core-detail-dialog"/);
  assert.match(html, /data-core-detail-tab="overview"/);
  assert.match(html, /data-core-detail-tab="stats"/);
  assert.match(html, /data-core-detail-tab="skills"/);
  assert.match(html, /data-leaderboard-tab="trophies"/);
  assert.match(html, /data-leaderboard-tab="core_damage"/);
  assert.match(html, /data-leaderboard-tab="teams"/);
  assert.equal(html.includes('id="settings-persistence-status"'), false);
  assert.match(app, /repairBattleDeckAgainstCollection/);
  assert.match(app, /onlineStatus:\s*"matchmaking"/);
  assert.match(app, /renderBoardCables/);
  assert.match(app, /energy-fed-cell/);
  assert.match(css, /\.module-detail-art[\s\S]*place-items:center/);
  assert.match(css, /\.vertical-circuit-arena \.board[\s\S]*gap: 8px !important/);
  assert.match(css, /\.board-cable-layer[\s\S]*z-index:2 !important/);
  assert.match(css, /\.board-cell > \.module-card[\s\S]*z-index:4 !important/);
  assert.match(css, /\.circuit-cable-current[\s\S]*animation:gs-circuit-current-travel/);
  assert.match(css, /\.home-core-hero-copy[\s\S]*top:7px !important/);
});
