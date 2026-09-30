const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.paused = true;
    this.currentTime = 0;
    this.volume = 0;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
}

class FakeEvents {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(handler);
  }
  removeEventListener(name, handler) { this.listeners.get(name)?.delete(handler); }
  dispatch(name) { for (const handler of this.listeners.get(name) || []) handler(); }
}

global.Audio = FakeAudio;
require("../src/gridshard-audio.js");

test("Capacitor game starts with both system bars hidden and uses the full viewport", () => {
  const root = path.resolve(__dirname, "../..");
  const config = require(path.join(root, "capacitor.config.js"));
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "client/src/app.js"), "utf8");
  assert.equal(config.plugins.SystemBars.hidden, true);
  assert.match(html, /viewport-fit=cover/);
  assert.match(app, /systemBars\.hide\(\)/);
});

test("native background stops music and effects; foreground restarts current state", async () => {
  const director = new global.GridshardAudioDirector();
  const doc = new FakeEvents();
  const win = new FakeEvents();
  doc.hidden = false;
  win.Capacitor = {isNativePlatform: () => true};
  assert.equal(director.bindAppLifecycle(doc, win), true);

  director.previewMusic("menu");
  const first = director.currentTrack;
  assert.equal(first.paused, false);
  director.triggerCue("laser_fire");
  await Promise.resolve();
  assert.ok([...director._activeSfx].some((audio) => !audio.paused));

  win.dispatch("blur");
  assert.equal(first.paused, true);
  assert.equal(director.currentTrack, null);
  assert.equal(director._activeSfx.size, 0);
  assert.equal(director.triggerCue("laser_fire").played, false);

  win.dispatch("focus");
  assert.notEqual(director.currentTrack, first);
  assert.equal(director.currentTrack.paused, false);

  doc.hidden = true;
  doc.dispatch("visibilitychange");
  assert.equal(director.currentTrack, null);
  doc.hidden = false;
  doc.dispatch("visibilitychange");
  assert.equal(director.currentTrack.paused, false);

  director.unbindAppLifecycle();
  director.setAppActive(false);
});
