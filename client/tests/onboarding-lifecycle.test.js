const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

function harness() {
  const timers = new Map();
  const events = new Map();
  let sequence = 0;
  const flow = { active:false, completed:false, isCompleted() { return this.completed; } };
  const context = {
    document:{ hidden:false, body:{ dataset:{ appScreen:"menu" } }, addEventListener:(name, fn) => events.set(name, fn) },
    window:{ setTimeout:(fn, delay) => { const id = ++sequence; timers.set(id, {fn, delay}); return id; }, clearTimeout:id => timers.delete(id) },
    performance:{ now:() => 1000 },
    onboardingFlow:flow,
    ONBOARDING_AUTOMATION_OPT_OUT:false,
    matches:0,
    statisticsState:{ viewModel:() => ({totalMatches:context.matches}) },
    syncs:0,
    syncFirstMatchTutorial:() => { context.syncs++; },
  };
  vm.createContext(context);
  const start = app.indexOf("  let onboardingSyncTimer = null;");
  const end = app.indexOf("  // Hedefe dokunuş", start);
  assert.ok(start > 0 && end > start);
  vm.runInContext(app.slice(start, end), context);
  const tick = () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id);
    timer.fn();
  };
  return { context, flow, timers, events, tick };
}

test("guide wakeups coalesce; only an active visible menu guide owns a 200ms timer", () => {
  const {context:c, flow, timers, events, tick} = harness();
  events.get("click")();
  events.get("close")();
  c.requestOnboardingSync();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 0);
  flow.active = true;
  tick();
  assert.equal(c.syncs, 1);
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 200);
  c.requestOnboardingSync();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 0);
  tick();
  c.document.hidden = true;
  events.get("visibilitychange")();
  assert.equal(timers.size, 0);
  c.document.hidden = false;
  events.get("visibilitychange")();
  tick();
  c.document.body.dataset.appScreen = "play";
  tick();
  assert.equal(timers.size, 0, "battle frame owns battle guide updates; no second loop");
  c.document.body.dataset.appScreen = "menu";
  events.get("click")();
  tick();
  assert.equal(timers.size, 1);
  flow.active = false;
  flow.completed = true;
  tick();
  assert.equal(timers.size, 0);
  c.requestOnboardingSync();
  assert.equal(timers.size, 0);
});

test("veteran and automation sessions do not poll, but explicit replay still updates", () => {
  for (const kind of ["veteran", "automation"]) {
    const {context:c, flow, timers, tick} = harness();
    if (kind === "veteran") c.matches = 5;
    else c.ONBOARDING_AUTOMATION_OPT_OUT = true;
    c.requestOnboardingSync();
    assert.equal(timers.size, 0);
    flow.active = true;
    c.requestOnboardingSync();
    tick();
    assert.equal(timers.size, 1);
    assert.equal(c.syncs, 1);
  }
});

test("automatic first-launch guide waits for confirmed bootstrap, not seeded zero statistics", () => {
  const start = app.indexOf("  function syncFirstMatchTutorial(");
  const end = app.indexOf("  // Menu presentation", start);
  const c = {
    lastTutorialSyncAt:-Infinity,
    document:{getElementById:() => null}, globalThis:{},
    onboardingOverlay:{hide() {}},
    onboardingFlow:{active:false, isCompleted:() => false, start() { this.active = true; }, update() {}, read:() => null},
    pvpState:{}, localServerState:{},
    onboardingContext:() => ({hub:true, inMatchFlow:false}),
    ONBOARDING_AUTOMATION_OPT_OUT:false,
    participantBootstrapResult:null,
    startupLoading:{active:false, root:{hidden:true}},
    statisticsState:{viewModel:() => ({totalMatches:0})},
    syncBattleHints() {},
  };
  vm.createContext(c);
  vm.runInContext(app.slice(start, end), c);
  c.syncFirstMatchTutorial(0, {force:true});
  assert.equal(c.onboardingFlow.active, false);
  c.participantBootstrapResult = {ok:false};
  c.syncFirstMatchTutorial(0, {force:true});
  assert.equal(c.onboardingFlow.active, false);
  c.participantBootstrapResult = {ok:true};
  c.syncFirstMatchTutorial(0, {force:true});
  assert.equal(c.onboardingFlow.active, true);
  assert.match(app, /renderParticipantBootstrapStatus\(\);\s*renderServerBootStatus\(\);\s*requestOnboardingSync\(\);/);
});
