const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const crypto = require("node:crypto");

function setup({language = "tr", clipboard = null} = {}) {
  const elements = new Map();
  const element = () => ({
    hidden:false, dataset:{}, attributes:{}, listeners:{},
    style:{setProperty(name, value) { this[name] = value; }},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, fn) { this.listeners[name] = fn; }, focus() {},
  });
  const shell = element();
  const document = {
    body:{dataset:{}}, documentElement:{lang:language},
    querySelectorAll:() => [shell],
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
  };
  const context = {setTimeout, clearTimeout};
  vm.createContext(context);
  for (const file of ["i18n-catalog.js", "i18n.js", "boot-screen.js"]) {
    vm.runInContext(fs.readFileSync(`src/${file}`, "utf8"), context);
  }
  vm.runInContext(fs.readFileSync("src/startup-loading.js", "utf8"), context);
  let elapsed = 0;
  const waits = [];
  const loading = new context.GridshardStartupLoading(document, {
    clipboard, now:() => elapsed,
    wait:async ms => { waits.push(ms); elapsed += ms; },
  });
  const value = () => Number(loading.barEl.attributes["aria-valuenow"] || 0);
  return {loading, value, shell, document, waits};
}

test("startup progress advances only on real completed stages and failures stay visible", async () => {
  const {loading, value, shell} = setup();
  loading.begin();
  assert.equal(value(),0);
  assert.equal(shell.inert,true);
  loading.complete("server");
  loading.complete("server");
  assert.equal(value(),25);
  loading.stage("boot.stage.profile");
  assert.equal(value(),25, "an animated bar does not invent completed work");
  loading.fail();
  assert.equal(loading.root.hidden,false);
  assert.equal(loading.errorEl.hidden,false);
  assert.equal(loading.root.dataset.state,"error");
  assert.equal(shell.inert,true);
  assert.throws(()=>loading.finish(), /not ready/);
  assert.throws(()=>loading.complete("unknown"), /Unknown startup step/);
  loading.begin();
  assert.equal(value(),0);
  assert.equal(loading.errorEl.hidden,true);
  for (const step of ["server","profile","collection","account"]) loading.complete(step);
  await loading.finish();
  assert.equal(loading.root.hidden,true);
  assert.equal(value(),100);
  assert.equal(shell.inert,false);
});

test("source fade and ready hold finish before deferred dialogs are released", async () => {
  const {loading, waits, document} = setup();
  let presented = false;
  loading.finished.then(() => { presented = true; });
  loading.begin();
  for (const step of loading.required) loading.complete(step);
  const finish = loading.finish();
  assert.equal(loading.finish(),finish);
  assert.equal(loading.root.dataset.state,"ready");
  assert.equal(presented,false);
  await finish;
  await Promise.resolve();
  assert.deepEqual(waits,[1200,460]);
  assert.equal(presented,true);
  assert.equal(document.body.dataset.boot,"ready");
  loading.begin();
  loading.fail();
  assert.equal(loading.root.hidden,true, "late profile refresh does not restart the splash");
});

test("retry button resumes the guarded server startup", () => {
  const {loading} = setup();
  let attempts = 0;
  loading.onRetry = () => { attempts++; loading.begin(); };
  loading.begin();
  loading.fail();
  loading.retryEl.listeners.click();
  assert.equal(attempts,1);
  assert.equal(loading.state,"loading");
  assert.equal(loading.errorEl.hidden,true);
});

test("player ID is shortened on screen but copied in full, not an auth token", async () => {
  const copied = [];
  const {loading} = setup({clipboard:{writeText:async text => copied.push(text)}});
  const playerId = "wt-9ba222e4-1122-3344-5566-123456789abc";
  loading.setPlayerId(playerId);
  assert.equal(loading.playerButtonEl.hidden,false);
  assert.ok(loading.playerValueEl.textContent.length < playerId.length);
  assert.equal(await loading.copyPlayerId(),true);
  assert.deepEqual(copied,[playerId]);
  assert.equal(loading.playerValueEl.textContent,"Kopyalandı");
  clearTimeout(loading._copiedTimer);
});

test("boot labels, percentages, errors and ready text use language keys", async () => {
  const {loading} = setup({language:"en"});
  loading.begin();
  assert.equal(loading.statusEl.textContent,"Connecting to server…");
  loading.complete("server");
  assert.equal(loading.percentEl.textContent,"25%");
  loading.fail();
  assert.equal(loading.errorMessageEl.textContent,"Connection could not be completed. You can retry.");
  loading.begin();
  for (const step of loading.required) loading.complete(step);
  await loading.finish();
  assert.equal(loading.statusEl.textContent,"Ready!");
});

test("original source artwork and the entire animation CSS block are unchanged", () => {
  const hash = data => crypto.createHash("sha256").update(data).digest("hex");
  const art = fs.readFileSync("assets/branding/gridshard-emblem.webp");
  assert.equal(hash(art),"c5b44663c45dd516f33f07aadeb31d0d3f84dd919d4b4dbc193579c26fbfa913");
  const css = fs.readFileSync("src/canon.css","utf8").replace(/\r\n/g,"\n");
  const block = css.slice(css.indexOf("/* === Beta.72 tur 17: yükleme ekranı"),css.indexOf("/* Operator title progression */")).trim();
  assert.equal(hash(block),"5b9f8d3a4997e2ab33751e004528d92094dddb02236a996c4c7c1390dbbff009");
  const html = fs.readFileSync("index.html","utf8");
  assert.ok(html.includes('src="./assets/branding/gridshard-emblem.webp"'));
  assert.ok(html.indexOf('src="./src/boot-screen.js"') < html.indexOf('src="./src/startup-loading.js"'));
  assert.equal(html.match(/id="boot-version"[^>]*>Sürüm: ([^<]+)/)[1], JSON.parse(fs.readFileSync(path.join(__dirname,"../../package.json"),"utf8")).version);
  const app = fs.readFileSync("src/app.js","utf8");
  assert.ok(app.includes("await startupLoading?.finish();"));
  assert.ok(app.includes("void afterStartup(() => consumePendingDeepLink());"));
  assert.ok(app.includes("onOpen: (url) => afterStartup(() => consumePendingDeepLink(url)),"));
  assert.ok(app.includes("|| startupLoading?.active"));
});
