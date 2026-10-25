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

assert.deepStrictEqual(
  [...global.GRIDSHARD_MENU_PLAYLIST],
  [
    "./assets/audio/menu_v8_01_durgun_devre.wav",
    "./assets/audio/menu_v8_02_akim_hatti.wav",
    "./assets/audio/menu_v8_03_cekirdek_odasi.wav",
  ]
);
assert.strictEqual(
  global.GRIDSHARD_MUSIC_ASSETS.menu,
  global.GRIDSHARD_MENU_PLAYLIST[0]
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
    "missing"
  ).ok,
  false
);

// The amplifier reused the full-scale UI/energy source (~0.466 RMS), much
// louder than the other crafted module WAVs. Its own alias trims both audio
// backends through _cueGain without changing the shared source or bus.
const amplifierCue=global.GRIDSHARD_SFX_CUES.amplifier_charge;
assert.strictEqual(amplifierCue.asset,global.GRIDSHARD_SFX_CUES.energy_transfer.asset);
assert.strictEqual(director._cueGain("amplifier_charge"),0.045);
assert.strictEqual(director._cueGain("energy_transfer"),1);
function wavRms(asset) {
  const fs=require("node:fs"),path=require("node:path");
  const bytes=fs.readFileSync(path.resolve(__dirname,"..",asset));
  let chunk=12;
  while(bytes.toString("ascii",chunk,chunk+4)!=="data")chunk+=8+bytes.readUInt32LE(chunk+4)+(bytes.readUInt32LE(chunk+4)%2);
  const length=bytes.readUInt32LE(chunk+4);let sum=0;
  for(let i=chunk+8;i<chunk+8+length;i+=2)sum+=(bytes.readInt16LE(i)/32768)**2;
  return Math.sqrt(sum/(length/2));
}
const amplifierRms=wavRms(amplifierCue.asset)*director._cueGain("amplifier_charge");
const repairRms=wavRms(global.GRIDSHARD_SFX_CUES.repair_beam.asset)*director._cueGain("repair_beam");
assert.ok(amplifierRms<=repairRms && amplifierRms>=repairRms*.5,"support pulse stays audible without dominating repair");



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
  "shardglass-seamless-v19"
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
  [118,122]
);
assert.ok(
  global.GRIDSHARD_CRITICAL_LAYER
    .includes("battle_v9_07_pressure.wav")
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
