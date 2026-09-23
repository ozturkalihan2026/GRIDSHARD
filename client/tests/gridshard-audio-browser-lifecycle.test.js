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
  FakeAudio.instances.length,
  0,
  "Ses efektleri oyuncu kullanmadan topluca yüklenmemeli"
);

assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.version,
  "shardglass-mobile-v10"
);

assert.strictEqual(
  director.previewMusic("menu").ok,
  true
);

const menuTrack = director.currentTrack;
assert.ok(menuTrack);
assert.strictEqual(menuTrack.paused, false);

menuTrack.currentTime = 17.25;
director.setState("pool");
const poolTrack = director.currentTrack;
assert.notStrictEqual(poolTrack, menuTrack);
assert.strictEqual(poolTrack.currentTime, 17.25);
assert.strictEqual(poolTrack.loop, true);

director.setState("matchmaking");
const matchmakingTrack = director.currentTrack;
assert.strictEqual(matchmakingTrack.loop, true);

director.setState("battle");
const battleTrack = director.currentTrack;
assert.ok(battleTrack);
assert.ok(battleTrack.src.includes("battle_main_v10"));
assert.strictEqual(director.battleLayerTracks.length, 0);

director.setState("critical_core");
assert.ok(director.currentTrack.src.includes("battle_critical_v10"));
assert.strictEqual(director.criticalLayerTrack, null);

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
    assert.strictEqual(poolTrack.paused, true);
    assert.strictEqual(director.battleLayerTracks.length, 0);
  assert.strictEqual(director.criticalLayerTrack, null);

  director.setState("victory");
  const victoryTrack = director.currentTrack;
  assert.ok(
    victoryTrack.src.includes(
      "victory_sting."
    )
  );
  assert.strictEqual(
    victoryTrack.loop,
    false
  );

  setTimeout(() => {
    assert.strictEqual(
      director.criticalLayerTrack,
      null
    );
    assert.ok(victoryTrack.volume > 0);
    console.log(
      "gridshard audio browser lifecycle test passed"
    );
  }, 1350);
}, 1350);
