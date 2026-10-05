// İlk oyun deneyimi: adım akışı (src/tutorial/onboarding.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

function loadFlow(extra = {}) {
  const sandbox = { ...extra };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "src", "tutorial", "onboarding.js"), "utf8"),
    sandbox
  );
  return sandbox.GridshardOnboardingFlow;
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function fakeOverlay() {
  return {
    views: [],
    hidden: 0,
    render(view) { this.views.push(view); this.current = view; },
    hide() { this.hidden += 1; this.current = null; },
  };
}

function build(steps, { storage = memoryStorage(), clock = { now: 0 } } = {}) {
  const Flow = loadFlow();
  const overlay = fakeOverlay();
  const flow = new Flow({
    steps,
    overlay,
    storage,
    completeKey: "done",
    progressKey: "step",
    now: () => clock.now,
    stuckAfterMs: 1000,
  });
  return { flow, overlay, storage, clock };
}

const target = (name) => ({ name, disabled: false });

test("oyuncu işi yapınca akış kendiliğinden ilerler ve kaldığı adımı saklar", () => {
  const shop = target("shop");
  const { flow, overlay, storage } = build([
    { id: "welcome", title: "Hoş geldin", body: "Başlayalım" },
    { id: "open-shop", title: "Mağaza", target: () => shop, done: (c) => c.screen === "shop" },
    { id: "last", title: "Bitti" },
  ]);

  assert.equal(flow.start(), true);
  flow.update({ screen: "menu" });
  assert.equal(overlay.current.mode, "next");
  assert.equal(overlay.current.title, "Hoş geldin");

  overlay.current.onNext();
  assert.equal(overlay.current.mode, "tap");
  assert.equal(overlay.current.target, shop);
  assert.equal(storage.getItem("step"), "open-shop");

  flow.update({ screen: "shop" });
  assert.equal(overlay.current.title, "Bitti");
  overlay.current.onNext();
  assert.equal(flow.active, false);
  assert.equal(storage.getItem("done"), "complete");
  assert.equal(storage.getItem("step"), null);
});

test("uygulama yeniden açılınca akış kaldığı adımdan sürer; tamamlanan akış başlamaz", () => {
  const steps = [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }];
  const resumed = build(steps, { storage: memoryStorage({ step: "b" }) });
  resumed.flow.start();
  resumed.flow.update({});
  assert.equal(resumed.overlay.current.title, "B");

  const completed = build(steps, { storage: memoryStorage({ done: "complete" }) });
  assert.equal(completed.flow.start(), false);
  assert.equal(completed.flow.start({ force: true }), true);
});

test("gerekmeyen ve zaten tamamlanmış adımlar görünmeden geçilir", () => {
  const { flow, overlay } = build([
    { id: "gift", title: "Sandık", target: () => target("gift"), skip: (c) => !c.giftAvailable },
    { id: "upgrade", title: "Yükselt", target: () => target("upgrade"), done: (c) => c.level > 0 },
    { id: "team", title: "Takım" },
  ]);

  flow.start();
  flow.update({ giftAvailable: false, level: 1 });

  assert.equal(overlay.current.title, "Takım");
  assert.equal(overlay.views.length, 1);
});

test("adım bağlamı uymuyorsa ya da başka bir pencere açıksa eğitim kenara çekilir", () => {
  const button = target("button");
  const dialog = { contains: (element) => element === button };
  const stranger = { contains: () => false };
  const { flow, overlay } = build([
    { id: "shop", title: "Mağaza", when: (c) => c.screen === "shop", target: () => button, done: () => false },
  ]);

  flow.start();
  flow.update({ screen: "menu" });
  assert.equal(overlay.current, null);

  flow.update({ screen: "shop", modals: [stranger] });
  assert.equal(overlay.current, null);

  // Hedef açık pencerenin içindeyse adım gösterilir.
  flow.update({ screen: "shop", modals: [dialog] });
  assert.equal(overlay.current.target, button);
});

test("hedef bulunamazsa oyuncu kilitlenmez: adım İLERİ ile geçilebilir olur", () => {
  let navigated = false;
  const { flow, overlay, clock } = build([
    { id: "open", title: "Aç", target: () => null, done: (c) => c.opened, onNext: () => { navigated = true; } },
    { id: "after", title: "Sonra" },
  ]);

  flow.start();
  flow.update({});
  assert.equal(overlay.current.mode, "tap");
  clock.now = 999;
  flow.update({});
  assert.equal(overlay.current.mode, "tap");
  clock.now = 1001;
  flow.update({});
  assert.equal(overlay.current.mode, "next");

  overlay.current.onNext();
  assert.equal(navigated, true);
  assert.equal(overlay.current.title, "Sonra");
});

test("geçilmesi anlamsız adım takılınca katman kalkar, akış yerinde kalır", () => {
  const disabled = { disabled: true };
  const { flow, overlay, clock } = build([
    { id: "battle", title: "Savaş", target: () => disabled, done: (c) => c.finished, stuck: "release" },
    { id: "after", title: "Sonra" },
  ]);

  flow.start();
  flow.update({});
  clock.now = 5000;
  flow.update({});

  assert.equal(overlay.current, null);
  assert.equal(flow.currentStep().id, "battle");
  // Hedef yeniden kullanılabilir olunca adım geri gelir.
  disabled.disabled = false;
  flow.update({});
  assert.equal(overlay.current.title, "Savaş");
});

test("özel sunumlu adım kendi sahnelerini gösterir; İLERİ akışı değil sahneyi ilerletir", () => {
  const acknowledged = [];
  const { flow, overlay } = build([
    {
      id: "battle",
      weight: 3,
      done: (c) => c.finished,
      present: (c) => (c.stage ? {
        key: c.stage,
        part: 0.5,
        mode: "next",
        title: `Sahne ${c.stage}`,
        onNext: () => acknowledged.push(c.stage),
      } : null),
    },
    { id: "after", title: "Sonra" },
  ]);

  flow.start();
  flow.update({});
  assert.equal(overlay.current, null);

  flow.update({ stage: "arena" });
  assert.equal(overlay.current.key, "battle:arena");
  assert.equal(overlay.current.progress, 1.5 / 4);
  overlay.current.onNext();
  assert.deepEqual(acknowledged, ["arena"]);
  assert.equal(flow.currentStep().id, "battle");

  flow.update({ stage: "current", finished: true });
  assert.equal(overlay.current.title, "Sonra");
});

test("adım başındaki bağlam saklanır: sonradan değişen durumla karşılaştırılır", () => {
  const { flow, overlay } = build([
    {
      id: "upgrade",
      title: "Yükselt",
      target: () => target("upgrade"),
      mode: (c, start) => (start.upgradable ? "tap" : "next"),
      done: (c, start) => c.level > start.level,
    },
    { id: "after", title: "Sonra" },
  ]);

  flow.start();
  flow.update({ level: 0, upgradable: true });
  assert.equal(overlay.current.mode, "tap");
  // Yükseltince parça biter; adım yine de başlangıç durumuna göre değerlendirilir.
  flow.update({ level: 1, upgradable: false });
  assert.equal(overlay.current.title, "Sonra");
});

test("yeniden gösterme tamamlandı izini ve ilerlemeyi siler", () => {
  const { flow, overlay, storage } = build(
    [{ id: "a", title: "A" }],
    { storage: memoryStorage({ done: "complete", step: "a" }) }
  );

  flow.reset();

  assert.equal(storage.getItem("done"), null);
  assert.equal(storage.getItem("step"), null);
  assert.equal(flow.isCompleted(), false);
  assert.ok(overlay.hidden >= 1);
});

test("yönetmenli savaşa akış dışında bağlanılınca akış savaş adımından sürer", () => {
  const { flow, overlay, storage } = build([
    { id: "welcome", title: "Hoş geldin" },
    { id: "battle", title: "Savaş", done: (c) => c.finished },
    { id: "after", title: "Sonra" },
  ], { storage: memoryStorage({ done: "complete" }) });

  assert.equal(flow.startAt("yok"), false);
  assert.equal(flow.active, false);

  assert.equal(flow.startAt("battle"), true);
  flow.update({});
  assert.equal(overlay.current.title, "Savaş");
  assert.equal(storage.getItem("step"), "battle");

  flow.update({ finished: true });
  assert.equal(overlay.current.title, "Sonra");
  overlay.current.onNext();
  assert.equal(flow.active, false);
  assert.equal(storage.getItem("done"), "complete");
});

test("eğitimde takım kurdurulmaz: takım adımı ekranı yalnız gösterir", () => {
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const steps = app.slice(
    app.indexOf("const ONBOARDING_STEPS = ["),
    app.indexOf("const onboardingOverlay = new GridshardGuideOverlay()")
  );
  const start = steps.indexOf('id:"team",');
  const teamStep = steps.slice(start, steps.indexOf('id:"open-events"', start));

  assert.ok(start > 0 && teamStep.length > 0);
  // `done` ve dokunma kipi yok: adım İLERİ ile geçilir; katman dokunuşu ekrana iletmez.
  assert.equal(/\b(done|mode|onNext|onTargetTap):/.test(teamStep), false);
  assert.equal(steps.includes("team-create"), false);
});

test("eğitim yeniden başlatılınca savaş eğitim maçıdır: metin, deste ve maç sonu", () => {
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const relay = fs.readFileSync(path.join(ROOT, "src", "relay-client.js"), "utf8");

  // Oyuncunun maçı varsa (tekrar gösterim) metinler eğitim savaşını anlatır.
  assert.match(app, /veteran: Number\(statisticsState\.viewModel\(\)\?\.totalMatches\) > 0/);
  assert.match(app, /trainingMatch: pvpState\.snapshot\?\.match_type === "tutorial_training"/);
  assert.match(app, /c\.veteran\s*\?\s*"Sıra eğitim savaşında\./);
  assert.match(app, /c\.trainingMatch\s*\?\s*"Eğitim savaşını kazandın\./);
  // Sunucu deste bildirirse kurulum ve raf o desteyi kullanır.
  assert.match(relay, /const tutorialDeck = response\.tutorial_deck;/);
  assert.match(app, /const deckModules = battleDeckInstanceIds\(\)\.map/);
  assert.match(app, /const affordable = battleDeckInstanceIds\(\)\.some/);
  // Maç sonu ekranı ödül kartlarını göstermez.
  assert.match(app, /const tutorialTraining = matchType === "tutorial_training";/);
  assert.match(app, /const profileNeutral = tutorialTraining\s*\|\| \["friend_battle", "team_training"\]\.includes\(matchType\);/);
  // Yönetmenli savaşa akış dışında bağlanılırsa akış savaş adımından sürer.
  assert.match(app, /context\.directed && !ONBOARDING_AUTOMATION_OPT_OUT\) \{[\s\S]{0,400}onboardingFlow\.startAt\("battle"\);/);
});

test("eğitim metinlerinin hepsinin İngilizcesi vardır", () => {
  require(path.join(ROOT, "src", "i18n-catalog.js"));
  const i18n = require(path.join(ROOT, "src", "i18n.js"));
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const block = app.slice(
    app.indexOf("const FIRST_MATCH_TUTORIAL_STEPS = ["),
    app.indexOf("const onboardingOverlay = new GridshardGuideOverlay()")
  );
  const texts = new Set();
  // Tek kelimelik başlıklar ve düğme etiketleri.
  for (const match of block.matchAll(/(?:title|nextLabel|hint):\s*"([^"\n]+)"/g)) texts.add(match[1]);
  // Cümleler: boşluk içeren, seçici olmayan çift tırnaklı metinler (koşullu
  // metinler dahil). Yorumlar ve diğer dizgi türleri sırayla tüketilir ki
  // içlerindeki tırnaklar yanlış eşleşmesin.
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"((?:[^"\\\n]|\\.)*)"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  for (const match of block.matchAll(tokens)) {
    const text = match[1];
    if (text && text.includes(" ") && !/^[#.\[]/.test(text)) texts.add(text);
  }

  assert.ok(texts.size > 80, `beklenenden az metin bulundu: ${texts.size}`);
  const missing = [...texts].filter((text) => i18n.translateText(text, "en") === text);
  assert.deepEqual(missing, []);
});

test("uygulama adımları: atlama düğmesi yoktur ve savaş sunucudan yönetmenli istenir", () => {
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const relay = fs.readFileSync(path.join(ROOT, "src", "relay-client.js"), "utf8");
  const overlay = fs.readFileSync(path.join(ROOT, "src", "tutorial", "onboarding.js"), "utf8");

  assert.equal(html.includes("data-tutorial-skip"), false);
  assert.equal(/skip|atla/i.test(overlay.match(/root\.innerHTML = `[\s\S]*?`;/)[0]), false);
  assert.ok(html.indexOf("tutorial/onboarding.js") < html.indexOf("src/app.js"));
  for (const id of ["open-shop", "gift-chest", "laser-upgrade", "open-team", "weekly-register", "battle", "victory"]) {
    assert.ok(app.includes(`id:"${id}"`), `adım eksik: ${id}`);
  }
  assert.match(app, /tutorial:\s*onboardingWantsDirectedBattle\(\)/);
  assert.match(relay, /tutorial \? \{ tutorial: true \} : \{\}/);
  assert.match(app, /kind:"tutorial_ack"/);
});

test("yönetmenli savaşın her sahnesinin istemcide metni vardır", () => {
  const app = fs.readFileSync(path.join(ROOT, "src", "app.js"), "utf8");
  const server = fs.readFileSync(
    path.join(ROOT, "..", "server", "app", "game", "tutorial.py"),
    "utf8"
  );
  const stageIds = [...server.matchAll(/TutorialStage\("([a-z0-9_]+)"/g)].map((match) => match[1]);
  const block = app.slice(
    app.indexOf("const DIRECTED_BATTLE_STAGES = Object.freeze({"),
    app.indexOf("const DIRECTED_FINALE_BANNER_MS")
  );

  assert.ok(stageIds.length >= 20);
  for (const stageId of stageIds) {
    assert.match(block, new RegExp(`\\n    ${stageId}:\\{`), `sahne metni eksik: ${stageId}`);
  }
});
