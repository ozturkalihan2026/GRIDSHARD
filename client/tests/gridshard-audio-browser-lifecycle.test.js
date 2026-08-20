const assert = require("assert");

class FakeAudio {
  static instances = [];

  constructor(src) {
    this.src = src;
    this.volume = 0;
    this.loop = false;
    this.currentTime = 0;
    this.paused = true;
    FakeAudio.instances.push(this);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

global.Audio = FakeAudio;

require("../src/gridshard-audio.js");

const director = new global.GridshardAudioDirector();

assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.version,
  "mix-v4"
);

assert.strictEqual(
  director.previewMusic("menu").ok,
  true
);

const menuTrack = director.currentTrack;
assert.ok(menuTrack);
assert.strictEqual(menuTrack.paused, false);

director.setState("battle");
const battleTrack = director.currentTrack;
assert.ok(battleTrack);
assert.notStrictEqual(battleTrack, menuTrack);

director.setState("critical_core");
assert.ok(director.criticalLayerTrack);

const pressure =
  director.setBattlePressure(1);
assert.strictEqual(
  pressure.pressure,
  1
);
assert.strictEqual(
  pressure.stage,
  "high"
);

setTimeout(() => {
  assert.strictEqual(menuTrack.paused, true);
  assert.ok(battleTrack.volume >= 0);
  assert.ok(
    director.criticalLayerTrack.volume > 0
  );

  director.setState("victory");

  setTimeout(() => {
    assert.strictEqual(
      director.criticalLayerTrack,
      null
    );
    console.log(
      "gridshard audio browser lifecycle test passed"
    );
  }, 1350);
}, 1350);
