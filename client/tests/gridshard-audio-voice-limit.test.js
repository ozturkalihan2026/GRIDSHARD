const assert = require("assert");

require("../src/gridshard-audio.js");

const director = new global.GridshardAudioDirector();
const limit = global.GRIDSHARD_SFX_VOICE_LIMIT;

assert.strictEqual(limit.maxRoutineVoices, 3);
assert.ok(limit.priorityCues.includes("core_hit"));
assert.ok(global.GRIDSHARD_AUDIO_MIX.sfxBaseGain < 0.72);
assert.ok(global.GRIDSHARD_AUDIO_MIX.battleMusicGain > 1.22);
// v12: savaş efektleri müziğin arkasında kalır.
assert.ok(global.GRIDSHARD_AUDIO_MIX.battleSfxGain < 1);
assert.ok(global.GRIDSHARD_AUDIO_MIX.musicLimiter.threshold <= -1);

// Aynı efekt kısa aralıkla tekrar çalmaz; çağrı yine geçerli sayılır.
assert.strictEqual(director.triggerCue("laser_fire").played, true);
const repeated = director.triggerCue("laser_fire");
assert.strictEqual(repeated.ok, true);
assert.strictEqual(repeated.played, false);

// Rutin efektler kısa pencerede sınırlanır.
assert.strictEqual(director.triggerCue("railgun_fire").played, true);
assert.strictEqual(director.triggerCue("drone_fire").played, true);
assert.strictEqual(director.triggerCue("missile_fire").played, false);

// Önemli olaylar sınıra takılmaz.
assert.strictEqual(director.triggerCue("core_hit").played, true);
assert.strictEqual(director.triggerCue("kill_confirm").played, true);

// Sessizdeyken hiçbir efekt çalınmaz.
director.setPreferences({ soundVolume:1, musicVolume:1, soundMuted:true, musicMuted:true });
assert.strictEqual(director.triggerCue("warning").played, false);

console.log("gridshard audio voice limit test passed");
