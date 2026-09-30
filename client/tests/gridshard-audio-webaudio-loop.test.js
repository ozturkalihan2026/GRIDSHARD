const assert = require("assert");

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.volume = 0;
    this.loop = false;
    this.currentTime = 0;
    this.paused = true;
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

class FakeGain {
  constructor() { this.gain = {value: 0}; }
  connect() {}
}

class FakeSource {
  constructor() {
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.playbackRate = {value: 1};
    this.started = false;
  }
  connect() {}
  disconnect() {}
  start() { this.started = true; }
  stop() { this.started = false; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
    this.sources = [];
  }
  createGain() { return new FakeGain(); }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  decodeAudioData() { return Promise.resolve({duration: 32}); }
  resume() { this.state = "running"; return Promise.resolve(); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
}

global.Audio = FakeAudio;
global.AudioContext = FakeAudioContext;
global.fetch = async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
});

require("../src/gridshard-audio.js");

(async () => {
  const director = new global.GridshardAudioDirector();
  assert.strictEqual(director.previewMusic("menu").ok, true);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const menuTrack = director.currentTrack;
  assert.strictEqual(menuTrack.loop, true);
  assert.strictEqual(menuTrack.paused, false);
  assert.strictEqual(director._musicContext.sources.length, 1);
  assert.strictEqual(director._musicContext.sources[0].loopEnd, 32);

  menuTrack.currentTime = 12;
  director.setState("pool");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(director.currentTrack.currentTime, 12);

  director.setState("matchmaking");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(director.currentTrack.loop, true);
  const playingSource = director._musicContext.sources.at(-1);
  director.setAppActive(false);
  await Promise.resolve();
  assert.strictEqual(playingSource.started, false);
  assert.strictEqual(director._musicContext.state, "suspended");
  director.setState("battle");
  assert.strictEqual(director.battleLayerTracks.length, 0);
  director.setAppActive(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(director._musicContext.state, "running");
  assert.strictEqual(director.battleLayerTracks.length, 7);
  director.setAppActive(false);
  console.log("gridshard Web Audio seamless loop test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
