// Grafik kademesi kararları (src/battle/graphics-tier.js): başlangıç kademesi,
// Otomatik/elle seçimi, savaşta otomatik düşürme ve inen kademenin hatırlanması.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function loadModule() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "src", "battle", "graphics-tier.js"), "utf8"),
    sandbox
  );
  return sandbox.GridshardGraphicsTier;
}

const REALME_8_PRO = { mobile: true, deviceMemory: 4, hardwareConcurrency: 8 };
const FLAGSHIP = { mobile: true, deviceMemory: 8, hardwareConcurrency: 8 };

// Tarayıcının bildirdiği değerler: Chromium belleği ikinin kuvvetine yuvarlar;
// WebKit belleği vermez ve çekirdek sayısını 4 ya da 8 olarak bildirir.
const DEVICES = [
  ["masaüstü", { mobile: false, deviceMemory: 8, hardwareConcurrency: 16 }, "yuksek"],
  ["zayıf masaüstü", { mobile: false, deviceMemory: 2, hardwareConcurrency: 2 }, "yuksek"],
  ["2 GB Android", { mobile: true, deviceMemory: 2, hardwareConcurrency: 8 }, "dusuk"],
  ["dört çekirdekli 4 GB Android", { mobile: true, deviceMemory: 4, hardwareConcurrency: 4 }, "dusuk"],
  ["realme 8 Pro (6 GB, 8 çekirdek)", REALME_8_PRO, "orta"],
  ["altı çekirdekli 8 GB Android", { mobile: true, deviceMemory: 8, hardwareConcurrency: 6 }, "orta"],
  ["amiral gemisi Android", FLAGSHIP, "yuksek"],
  ["iPhone (çekirdek 4 görünür)", { mobile: true, hardwareConcurrency: 4 }, "yuksek"],
  ["sekiz çekirdekli iPad", { mobile: true, hardwareConcurrency: 8 }, "yuksek"],
  ["hiç bilgi vermeyen mobil tarayıcı", { mobile: true }, "yuksek"],
];

for (const [name, device, expected] of DEVICES) {
  test(`başlangıç kademesi: ${name} → ${expected}`, () => {
    assert.equal(loadModule().detect(device), expected);
  });
}

test("eksik ya da bozuk değerler oyunu en düşük kademeye itmez", () => {
  const { detect } = loadModule();

  assert.equal(detect(), "yuksek");
  assert.equal(detect({ mobile: true, deviceMemory: "yok", hardwareConcurrency: null }), "yuksek");
  // Bellek biliniyor, çekirdek bilinmiyor: karar yalnız belleğe göre verilir.
  assert.equal(detect({ mobile: true, deviceMemory: 4 }), "orta");
  assert.equal(detect({ mobile: true, deviceMemory: 8 }), "yuksek");
});

function build({ device = REALME_8_PRO, account = "yuksek", version = "2.1.0", store = new Map() } = {}) {
  const state = { account, version };
  const controller = new (loadModule().Controller)({
    read: (key) => (store.has(key) ? store.get(key) : null),
    write: (key, value) => store.set(key, value),
    version: () => state.version,
    accountTier: () => state.account,
    device: () => device,
  });
  return { controller, store, state };
}

// Sabit kare süresiyle bir ölçüm penceresi oynatır ve pencereyi kapatır.
// `slowEvery` verilirse her o kadar karede bir kare 60 ms sürer.
function playWindow(controller, { start, frameMs, durationMs = 1200, slowEvery = 0 }) {
  let now = start;
  let lowered = controller.trackFrame(now);
  for (let frame = 1; now - start < durationMs; frame += 1) {
    now += slowEvery && frame % slowEvery === 0 ? 60 : frameMs;
    lowered = controller.trackFrame(now) || lowered;
  }
  return controller.trackFrame(now, { sampling: false }) || lowered;
}

const SMOOTH = 16;
const SLOW = 40;

test("tercih yokken hesap ayarı varsayılansa Otomatik, değilse oyuncunun seçimi geçerlidir", () => {
  const automatic = build({ account: "yuksek" });
  assert.equal(automatic.controller.isAuto(), true);
  assert.equal(automatic.controller.tier(), "orta");

  const chosen = build({ account: "dusuk", device: FLAGSHIP });
  assert.equal(chosen.controller.isAuto(), false);
  assert.equal(chosen.controller.tier(), "dusuk");

  // Hesap ayarı henüz yüklenmediyse de Otomatik başlar.
  assert.equal(build({ account: undefined }).controller.tier(), "orta");
});

test("Ayarlar'daki seçim kipi belirler; elle seçilen kademe cihazdan bağımsızdır", () => {
  const { controller, store, state } = build({ account: "yuksek" });

  controller.setMode("manual");
  assert.equal(store.get("gridshard.graphics-mode"), "manual");
  assert.equal(controller.tier(), "yuksek");
  state.account = "bilinmeyen";
  assert.equal(controller.tier(), "yuksek");

  controller.setMode("auto");
  state.account = "dusuk";
  assert.equal(controller.isAuto(), true);
  assert.equal(controller.tier(), "orta");
});

test("art arda iki kötü ölçüm kademeyi bir indirir ve Düşük'ün altına inilmez", () => {
  const { controller } = build();

  assert.equal(playWindow(controller, { start: 0, frameMs: SLOW }), null);
  assert.equal(playWindow(controller, { start: 10000, frameMs: SLOW }), "dusuk");
  assert.equal(controller.tier(), "dusuk");

  assert.equal(playWindow(controller, { start: 20000, frameMs: SLOW }), null);
  assert.equal(playWindow(controller, { start: 30000, frameMs: SLOW }), null);
  assert.equal(controller.tier(), "dusuk");
});

test("araya giren iyi ölçüm sayacı sıfırlar", () => {
  const { controller } = build({ device: FLAGSHIP });

  playWindow(controller, { start: 0, frameMs: SLOW });
  playWindow(controller, { start: 10000, frameMs: SMOOTH });
  assert.equal(playWindow(controller, { start: 20000, frameMs: SLOW }), null);
  assert.equal(controller.tier(), "yuksek");
  assert.equal(playWindow(controller, { start: 30000, frameMs: SLOW }), "orta");
});

test("ortalama iyi olsa da takılan kare oranı %8'i aşarsa ölçüm kötüdür", () => {
  const { controller } = build({ device: FLAGSHIP });

  // Her on karede bir 60 ms'lik kare: oran %10, ortalama ~20 ms.
  playWindow(controller, { start: 0, frameMs: SMOOTH, slowEvery: 10 });
  assert.equal(playWindow(controller, { start: 10000, frameMs: SMOOTH, slowEvery: 10 }), "orta");

  // Her yirmi karede bir: oran yaklaşık %5, kademe inmez.
  const steady = build({ device: FLAGSHIP }).controller;
  playWindow(steady, { start: 0, frameMs: SMOOTH, slowEvery: 20 });
  assert.equal(playWindow(steady, { start: 10000, frameMs: SMOOTH, slowEvery: 20 }), null);
});

test("çok kısa ölçüm hüküm vermez: ne kötü sayılır ne de sayacı sıfırlar", () => {
  const { controller } = build({ device: FLAGSHIP });

  playWindow(controller, { start: 0, frameMs: SLOW });
  assert.equal(playWindow(controller, { start: 10000, frameMs: SMOOTH, durationMs: 400 }), null);
  assert.equal(playWindow(controller, { start: 20000, frameMs: SLOW }), "orta");
});

test("arka plandan dönüşte ölçüm baştan başlar; gizli sekmede ölçüm kapanır", () => {
  const { controller } = build({ device: FLAGSHIP });

  playWindow(controller, { start: 0, frameMs: SLOW });
  // Pencerenin ortasında 5 sn'lik boşluk: önceki kareler atılır, kalan süre kısadır.
  let now = 10000;
  controller.trackFrame(now);
  for (let frame = 0; frame < 20; frame += 1) controller.trackFrame(now += SLOW);
  controller.trackFrame(now += 5000);
  for (let frame = 0; frame < 5; frame += 1) controller.trackFrame(now += SLOW);
  assert.equal(controller.trackFrame(now, { sampling: false }), null);
  assert.equal(controller.tier(), "yuksek");

  // Sekme gizlenince açık pencere değerlendirilir: ikinci kötü ölçüm kademeyi indirir.
  now = 30000;
  controller.trackFrame(now);
  for (let frame = 0; frame < 30; frame += 1) controller.trackFrame(now += SLOW);
  assert.equal(controller.trackFrame(now + SLOW, { hidden: true }), "orta");
});

test("kesintisiz ölçümde (tarayıcı testleri) pencere dört saniyede bir kapanır", () => {
  const { controller } = build({ device: FLAGSHIP });
  const lowered = [];

  for (let now = 0; now <= 9000; now += SLOW) {
    const tier = controller.trackFrame(now);
    if (tier) lowered.push([tier, now]);
  }

  assert.deepEqual(lowered, [["orta", 8040]]);
});

test("oyuncunun elle seçtiği kademe savaşta düşürülmez", () => {
  const { controller, store } = build({ account: "yuksek" });
  controller.setMode("manual");

  playWindow(controller, { start: 0, frameMs: SLOW });
  assert.equal(playWindow(controller, { start: 10000, frameMs: SLOW }), null);
  assert.equal(controller.tier(), "yuksek");
  assert.equal(store.has("gridshard.graphics-auto-tier"), false);
});

test("inen kademe aynı sürümde hatırlanır, yeni sürümde ölçüm baştan yapılır", () => {
  const first = build({ device: FLAGSHIP, version: "2.1.0" });
  playWindow(first.controller, { start: 0, frameMs: SLOW });
  playWindow(first.controller, { start: 10000, frameMs: SLOW });
  assert.equal(first.store.get("gridshard.graphics-auto-tier"), "orta@2.1.0");

  // Uygulama yeniden açıldı: aynı depolama, yeni denetleyici.
  assert.equal(build({ device: FLAGSHIP, version: "2.1.0", store: first.store }).controller.tier(), "orta");
  assert.equal(build({ device: FLAGSHIP, version: "2.2.0", store: first.store }).controller.tier(), "yuksek");

  // Bozuk kayıt yok sayılır.
  const broken = new Map([["gridshard.graphics-auto-tier", "ultra@2.1.0"]]);
  assert.equal(build({ device: FLAGSHIP, version: "2.1.0", store: broken }).controller.tier(), "yuksek");
});

test("depolama kapalıyken kademe yine belirlenir ve oturum içinde iner", () => {
  const controller = new (loadModule().Controller)({
    read: () => { throw new Error("depolama kapalı"); },
    write: () => { throw new Error("depolama kapalı"); },
    version: () => "2.1.0",
    accountTier: () => "yuksek",
    device: () => FLAGSHIP,
  });

  assert.equal(controller.tier(), "yuksek");
  controller.setMode("auto");
  playWindow(controller, { start: 0, frameMs: SLOW });
  assert.equal(playWindow(controller, { start: 10000, frameMs: SLOW }), "orta");
  assert.equal(controller.tier(), "orta");
});

test("uygulama kademe kararlarını bu dosyadan alır", () => {
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  assert.match(app, /new GridshardGraphicsTier\.Controller\(\{/);
  assert.match(app, /graphicsTier\.trackFrame\(now, \{ sampling, hidden:document\.hidden \}\)/);
  assert.match(app, /graphicsTier\.setMode\(/);
  assert.ok(html.indexOf("battle/graphics-tier.js") > 0);
  assert.ok(html.indexOf("battle/graphics-tier.js") < html.indexOf("src/app.js"));
});
