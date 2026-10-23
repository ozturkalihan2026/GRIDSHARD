"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const CanvasFx = require("../src/battle/module-fx-canvas.js");

const source = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
const between = (start, end) => {
  const index = source.indexOf(start);
  assert.ok(index >= 0, start);
  const finish = source.indexOf(end, index);
  assert.ok(finish > index, end);
  return source.slice(index, finish);
};

// Execute the app's actual frame owner with a real effect engine and virtual
// browser scheduling. This catches wakes *inside* a frame, not just two clicks.
function fixture({ effects = true, motion = false, sampling = false } = {}) {
  const frames = new Map(), timers = new Map();
  let serial = 0, now = 0, hudRenders = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (target, key) =>
    target[key] ?? (key === "createRadialGradient" ? () => gradient : () => {}) });
  const layer = { clientWidth:300, clientHeight:500, appendChild(c) { c.parentElement = this; } };
  const document = {
    hidden:false, body:{ dataset:{ onlineStatus:"battle",appScreen:"play" } },
    createElement:() => ({ setAttribute() {}, remove() {}, getContext:() => ctx }),
  };
  const context = vm.createContext({
    document, activePlayMode:"online",
    frameSamplingActive:() => sampling, sampleBattlePerformance() {},
    syncFirstMatchTutorial() {}, trackAutoGraphics() {},
    settingsState:{ analyticsConsent:false, viewModel() { throw new Error("frame cloned settings"); } },
    analyticsLastFrameAt:null, analyticsFrameDurationMs:0, analyticsFrameCount:0,
    lastBattleHudRenderAt:-Infinity, BATTLE_HUD_RENDER_INTERVAL_MS:250,
    renderBattleHud(time) { hudRenders++; context.lastBattleHudRenderAt = time; },
    moduleMotion:{ needsFrame:motion, tick() {},clear(){this.needsFrame=false;} },
    battlePerformanceSampler:null,
    moduleFx:null, emitCoreIdleMotes() {},
    requestAnimationFrame(run) { frames.set(++serial, run); return serial; },
    window:{
      setTimeout(run) { timers.set(++serial, run); return serial; },
      clearTimeout(id) { timers.delete(id); },
    },
  });
  if (effects) context.moduleFx = new CanvasFx({
    doc:document, layer:() => layer, now:() => now,
    wake:() => context.requestBattleMotionFrame(),
  });
  vm.runInContext(
    between("  let battleClockFrame = null;", "  function renderAppScreen()")
    + between("  function requestBattleMotionFrame()", "  // Otomatik grafik kademesi:")
    + between("  function updateClock(now) {", "  // Savaş saati, HUD,")
    + "\nbattleClockFrame = requestAnimationFrame(updateClock);", context);
  return {
    context, frames, timers,
    get hudRenders() { return hudRenders; },
    step(time) {
      now = time;
      const batch = [...frames.values()];
      frames.clear();
      for (const run of batch) run(time);
      return batch.length;
    },
    timer() {
      assert.equal(timers.size, 1);
      const [id, run] = timers.entries().next().value;
      timers.delete(id);
      run();
    },
  };
}

test("core idle and impact wakes keep exactly one frame owner through a long battle", () => {
  const f = fixture();
  let lastCore = -Infinity, lastShot = -Infinity;
  f.context.emitCoreIdleMotes = now => {
    if (now - lastCore >= 220) {
      lastCore = now;
      f.context.moduleFx.coreIdle({ x:100, y:200 });
      f.context.moduleFx.coreIdle({ x:150, y:100 }, { ready:true });
    }
    if (now - lastShot >= 500) {
      lastShot = now;
      // Finishing a shot invokes impact -> start -> wake inside tick().
      f.context.moduleFx.pulse({ x:100, y:200 }, { x:150, y:100 }, 140);
      f.context.moduleFx.later(50, () => f.context.moduleFx.shieldHit({ x:150, y:100 }));
    }
  };
  for (let time = 16; time <= 90_000; time += 16) {
    assert.equal(f.step(time), 1, `callbacks at ${time} ms`);
    assert.equal(f.frames.size, 1, `pending frames at ${time} ms`);
    assert.equal(f.timers.size, 0);
  }
  assert.ok(f.hudRenders <= 360, "animation never bypasses the 250 ms HUD throttle");
});

test("an idle HUD timer is cancelled by motion and wakes coalesce", () => {
  const f = fixture({ effects:false });
  f.step(16);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 1);
  f.context.moduleMotion.needsFrame = true;
  for (let i = 0; i < 100; i++) f.context.requestBattleMotionFrame();
  assert.equal(f.frames.size, 1);
  assert.equal(f.timers.size, 0);
  f.context.moduleMotion.tick = () => {
    for (let i = 0; i < 100; i++) f.context.requestBattleMotionFrame();
    f.context.moduleMotion.needsFrame = false;
  };
  f.step(32);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 1, "return to idle without a stray frame");
  f.timer();
  assert.equal(f.frames.size, 1);
  assert.equal(f.timers.size, 0);
});

test("hidden effects clear and suspend polling until the visibility owner wakes it", () => {
  const f = fixture();
  f.context.moduleFx.coreIdle({ x:100, y:200 });
  f.context.document.hidden = true;
  f.step(16);
  assert.equal(f.context.moduleFx.active, false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
  f.context.requestBattleMotionFrame();
  assert.equal(f.frames.size, 0);
});

test("a presentation exception stays observable but cannot strand the frame owner", () => {
  const f = fixture({ effects:false, motion:true });
  f.context.moduleMotion.tick = () => { throw new Error("transient drawing failure"); };
  assert.throws(() => f.step(16), /transient drawing failure/);
  assert.equal(f.frames.size, 1);
  f.context.moduleMotion.tick = () => {};
  assert.equal(f.step(32), 1);
  assert.equal(f.frames.size, 1);
});

test("continuous performance sampling owns one frame even without effects", () => {
  const f = fixture({ effects:false, sampling:true });
  for (let time = 16; time <= 1000; time += 16) {
    assert.equal(f.step(time), 1);
    assert.equal(f.frames.size, 1);
    assert.equal(f.timers.size, 0);
  }
});

test("deployed artwork keeps non-intrinsic host and rig dimensions after renderer cleanup",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  const host=css.match(/\.module-icon\.has-module-device\s*\{([^}]+)\}/)[1];
  assert.match(host,/inline-size:calc\(100% - 14px\) !important/);
  assert.match(host,/block-size:calc\(100% - 14px\) !important/);
  assert.match(host,/justify-self:stretch !important/);assert.match(host,/grid-area:auto !important/);
  const rig=css.match(/^\.module-device-rig\s*\{([^}]+)\}/m)[1];
  assert.match(rig,/width:100%/);assert.match(rig,/height:100%/);
});
