const assert = require("assert");

class FakeAudio {
  constructor(src = "") {
    this.src = src;
    this.volume = 0;
    this.loop = false;
    this.currentTime = 0;
    this.paused = true;
  }
  canPlayType(mime) {
    return mime.startsWith("audio/ogg") ? "probably" : "";
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
    this.playbackRate = {value: 1};
    this.startedAt = null;
  }
  connect() {}
  disconnect() {}
  start(when, offset) { this.startedAt = when; this.offset = offset; }
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 4;
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
  decodeAudioData(bytes) { return Promise.resolve({duration: 32, bytes}); }
  resume() { return Promise.resolve(); }
}

const fetched = [];
global.Audio = FakeAudio;
global.AudioContext = FakeAudioContext;
global.fetch = async (src) => {
  fetched.push(src);
  // Pulse stem'inin mobil türevi sunucuda yokmuş gibi davranır.
  if (src.endsWith("battle_tension_v7_02_pulse.ogg")) return {ok: false};
  return {ok: true, arrayBuffer: async () => new ArrayBuffer(8)};
};
global.GRIDSHARD_AUDIO_ENCODINGS = {
  version: 1,
  formats: {
    ogg: [
      "menu_v8_01_durgun_devre",
      "menu_v8_02_akim_hatti",
      "menu_v8_03_cekirdek_odasi",
      "battle_tension_v7_01_sub",
      "battle_tension_v7_02_pulse",
      "battle_tension_v7_03_percussion",
      "battle_tension_v7_04_ostinato",
      "battle_tension_v7_05_shards",
      "battle_tension_v7_06_dissonance",
      "battle_tension_v7_07_pressure",
    ],
    m4a: [],
  },
};

require("../src/gridshard-audio.js");

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

(async () => {
  const resolve = global.gridshardResolveAudioAsset;
  assert.strictEqual(
    resolve("./assets/audio/menu_v8_02_akim_hatti.wav"),
    "./assets/audio/mobile/menu_v8_02_akim_hatti.ogg"
  );
  assert.strictEqual(
    resolve("./assets/audio/core_hit.wav"),
    "./assets/audio/core_hit.wav",
    "Manifestte olmayan ses kanonik WAV olarak kalmalı"
  );

  // Menü çalma listesi belleğe açılmaz; ses öğesi mobil türevi akıtır.
  const menuDirector = new global.GridshardAudioDirector();
  menuDirector.setState("menu");
  assert.ok(menuDirector.currentTrack instanceof FakeAudio);
  assert.match(
    menuDirector.currentTrack.src,
    /^\.\/assets\/audio\/mobile\/menu_v8_0[123]_[a-z_]+\.ogg$/
  );
  assert.deepStrictEqual(fetched, []);
  menuDirector.setAppActive(false);

  assert.strictEqual(global.GRIDSHARD_BATTLE_MUSIC_ENABLED, true);
  const battleAssets = ["battle_intro", "battle", "battle_pressure", "critical_core"]
    .map((state) => global.GRIDSHARD_MUSIC_ASSETS[state]);
  assert.strictEqual(new Set(battleAssets).size, 4);
  const layerSizes = ["battle_intro", "battle", "battle_pressure", "critical_core"]
    .map((state) => global.GRIDSHARD_BATTLE_STATE_LAYERS[state].length);
  assert.deepStrictEqual(layerSizes, [3, 5, 6, 7]);

  const director = new global.GridshardAudioDirector();
  director.setState("battle");
  const tracks = [...director.battleLayerTracks];
  assert.strictEqual(tracks.length, 7);
  await settle();
  await settle();

  const context = director._musicContext;
  assert.strictEqual(context.sources.length, 7);
  const starts = new Set(context.sources.map((source) => source.startedAt));
  assert.strictEqual(starts.size, 1, "Yedi stem aynı bağlam zamanında başlamalı");
  assert.ok([...starts][0] > context.currentTime);

  assert.ok(fetched.includes("./assets/audio/mobile/battle_tension_v7_02_pulse.ogg"));
  assert.ok(
    fetched.includes("./assets/audio/battle_tension_v7_02_pulse.wav"),
    "Eksik mobil türev WAV'a düşmeli"
  );

  const volumeOf = (id) => tracks.find((track) => track._gridshardLayer.id === id).volume;
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.ok(volumeOf("ostinato") > 0);
  assert.strictEqual(volumeOf("dissonance"), 0);
  assert.strictEqual(volumeOf("pressure"), 0);

  director.setState("critical_core");
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.strictEqual(director.battleLayerTracks.length, 7);
  assert.ok(volumeOf("pressure") > 0);
  assert.strictEqual(director.criticalLayerTrack._gridshardLayer.id, "pressure");

  director.setState("victory");
  assert.strictEqual(director.battleLayerTracks.length, 0);
  assert.ok(tracks.every((track) => track.paused));
  console.log("gridshard mobile audio formats test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
