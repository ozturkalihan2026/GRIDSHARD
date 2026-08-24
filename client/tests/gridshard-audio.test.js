const assert = require("assert");

require("../src/gridshard-audio.js");

const director =
  new global.GridshardAudioDirector();

assert.strictEqual(
  director.state,
  "menu"
);

const battle =
  director.setState(
    "battle"
  );

assert.strictEqual(
  battle.ok,
  true
);
assert.deepStrictEqual(
  global.GRIDSHARD_AUDIO_DIRECTION.battle.bpm,
  [126,132]
);

assert.strictEqual(
  director.setState(
    "unknown"
  ).ok,
  false
);

assert.ok(
  global.GRIDSHARD_MUSIC_ASSETS.menu
    .includes("menu_ensemble_v6.wav")
);
assert.ok(
  global.GRIDSHARD_SFX_CUES.core_hit
);
for (const cue of [
  "laser_fire",
  "pulse_cannon_fire",
  "railgun_fire",
  "missile_fire",
  "drone_fire",
  "arc_cannon_fire",
]) {
  assert.ok(
    global.GRIDSHARD_SFX_CUES[cue],
    `${cue} cue should exist`
  );
  assert.strictEqual(
    director.triggerCue(cue).ok,
    true
  );
}
assert.strictEqual(
  director.triggerCue(
    "generator_move"
  ).ok,
  true
);
assert.strictEqual(
  director.triggerCue(
    "missing"
  ).ok,
  false
);



const preferences=
  director.setPreferences({
    soundVolume:0.25,
    musicVolume:0.35,
    soundMuted:true,
    musicMuted:true,
  });

assert.strictEqual(
  preferences.soundMuted,
  true
);
assert.strictEqual(
  preferences.musicMuted,
  true
);
assert.strictEqual(
  preferences.soundVolume,
  0.25
);
assert.strictEqual(
  preferences.musicVolume,
  0.35
);



assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.version,
  "shardglass-seamless-v8"
);
assert.strictEqual(global.GRIDSHARD_BATTLE_LAYERS.length, 7);
assert.strictEqual(
  new Set(global.GRIDSHARD_BATTLE_LAYERS.map(layer => layer.asset)).size,
  7
);
assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.crossfadeMs,
  1200
);
assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.menuPoolCrossfadeMs,
  480
);
assert.strictEqual(
  global.GRIDSHARD_AUDIO_MIX.resultCrossfadeMs,
  320
);
assert.deepStrictEqual(
  global.GRIDSHARD_AUDIO_DIRECTION.victory.bpm,
  [142,146]
);
assert.ok(
  global.GRIDSHARD_CRITICAL_LAYER
    .includes("battle_tension_v7_07_pressure.wav")
);
assert.strictEqual(
  director.previewMusic("menu").ok,
  true
);
assert.strictEqual(
  director.previewSfx("core_hit").ok,
  true
);

console.log(
  "gridshard audio identity test passed"
);
