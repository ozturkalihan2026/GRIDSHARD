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
  "shardglass-seamless-v15"
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
const battleLayers = [...director.battleLayerTracks];
assert.strictEqual(battleLayers.length, 7);
assert.strictEqual(director.currentTrack, battleLayers[0]);
assert.ok(battleLayers.every((track) => track.loop && track.paused === false));
assert.strictEqual(director.criticalLayerTrack, null);
const pressureLayer = battleLayers.find(
  (track) => track._gridshardLayer.id === "pressure"
);
assert.ok(pressureLayer.src.includes("battle_tension_v7_07_pressure.wav"));

director.setState("critical_core");
assert.strictEqual(director.battleLayerTracks.length, 7);
assert.strictEqual(director.criticalLayerTrack, pressureLayer);

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
  assert.ok(pressureLayer.volume > 0, "Kritik durumda pressure stem'i duyulmalı");

  director.setState("victory");
  assert.strictEqual(director.battleLayerTracks.length, 0);
  assert.ok(battleLayers.every((track) => track.paused));
  const victoryTrack = director.currentTrack;
  assert.ok(
    victoryTrack.src.includes(
      "victory_sting.wav"
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
