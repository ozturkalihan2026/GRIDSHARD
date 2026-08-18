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

console.log(
  "gridshard audio identity test passed"
);
