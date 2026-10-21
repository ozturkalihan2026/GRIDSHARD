"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const CanvasFx = require("../src/battle/module-fx-canvas.js");

const queues = ["parts", "rings", "beams", "shots", "arcs", "timers"];
function fixture(quality = "orta") {
  let now = 0, wakes = 0, visible = true, activeOnWake = false;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (target, key) =>
    target[key] ?? (key === "createRadialGradient" ? () => gradient : () => {}) });
  const layer = { clientWidth:300, clientHeight:500, appendChild(c) { c.parentElement = this; } };
  const fx = new CanvasFx({
    doc:{ createElement:() => ({ setAttribute() {}, remove() {}, getContext:() => ctx }) },
    layer:() => visible ? layer : null, now:() => now, quality:() => quality,
    wake() { wakes++; activeOnWake = fx.active; },
  });
  const attack = () => {
    const a = { x:80, y:400 }, b = { x:120, y:80 };
    fx.laser(a,b); fx.missiles(a,b,500); fx.emp(a,b); fx.repair(a,b); fx.cool(a,b);
  };
  return { fx, attack, get wakes() { return wakes; }, get activeOnWake() { return activeOnWake; },
    setTime(time) { now = time; }, tick(time) { now = time; return fx.tick(time); },
    hide() { visible = false; },
  };
}

test("an effect publishes its work before waking an idle clock, and coalesces further wakes", () => {
  const f = fixture();
  f.fx.coreIdle({ x:10, y:20 });
  assert.equal(f.wakes, 1);
  assert.equal(f.activeOnWake, true);
  f.attack();
  assert.equal(f.wakes, 1);
  f.fx.clear();
  f.fx.coreIdle({ x:10, y:20 });
  assert.equal(f.wakes, 2);
});

test("all six effect queues stay bounded even if frames stop while events arrive", () => {
  for (const quality of ["orta", "yuksek"]) {
    const f = fixture(quality), scale = quality === "yuksek" ? 2 : 1;
    const limits = { parts:260, rings:32, beams:24, shots:48, arcs:32, timers:512 };
    for (let i = 0; i < 600; i++) {
      f.attack();
      f.fx.pulse({ x:1, y:1 }, { x:10, y:10 }, 200);
    }
    for (const key of queues) {
      assert.ok(f.fx[key].length > 0, key);
      assert.ok(f.fx[key].length <= limits[key] * scale, `${quality}/${key}: ${f.fx[key].length}`);
    }
    f.fx.clear();
    assert.equal(f.fx.active, false);
    for (const key of queues) assert.equal(f.fx[key].length, 0);
  }
});

test("stalled effects expire in wall time; delayed projectiles and impacts do not burst on resume", () => {
  for (const tickBeforeStall of [true, false]) {
    const f = fixture();
    let expiredCallback = 0;
    f.attack();
    f.fx.pulse({ x:1, y:1 }, { x:10, y:10 }, 200);
    f.fx.later(100, () => expiredCallback++);
    if (tickBeforeStall) f.tick(16);
    assert.equal(f.tick(5000), false);
    assert.equal(expiredCallback, 0);
    for (const key of queues) assert.equal(f.fx[key].length, 0, key);
  }
});

test("fresh effects arriving after a stall survive while old effects are discarded", () => {
  const f = fixture();
  f.attack();
  f.tick(16);
  f.setTime(5000);
  f.fx.coreIdle({ x:10, y:20 });
  let recent = 0;
  f.fx.later(30, () => recent++);
  assert.equal(f.tick(5016), true);
  assert.ok(f.fx.parts.every(part => part.born === 5000));
  f.tick(5040);
  assert.equal(recent, 1);
  assert.equal(f.tick(7000), false);
});

test("ordinary projectile arrival still creates exactly one impact", () => {
  const f = fixture();
  let impacts = 0;
  f.fx.impact = () => impacts++;
  f.fx.pulse({ x:1, y:1 }, { x:10, y:10 }, 200);
  f.tick(16);
  f.tick(199);
  assert.equal(impacts, 0);
  f.tick(208);
  f.tick(224);
  assert.equal(impacts, 1);
});

test("repeated battles release callbacks and unavailable surfaces clear effects", () => {
  const f = fixture();
  for (let battle = 0; battle < 100; battle++) {
    f.attack();
    f.tick(battle * 1000 + 16);
    f.fx.clear();
    assert.equal(f.fx.active, false);
    assert.equal(f.fx.last, null);
  }
  f.attack();
  f.hide();
  assert.equal(f.tick(200_000), false);
  for (const key of queues) assert.equal(f.fx[key].length, 0);
});
