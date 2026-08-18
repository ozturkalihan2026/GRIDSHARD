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
    .includes("menu_pulse.wav")
);
assert.ok(
  global.GRIDSHARD_SFX_CUES.core_hit
);
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

console.log(
  "gridshard audio identity test passed"
);
