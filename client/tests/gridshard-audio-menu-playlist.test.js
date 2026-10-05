// Menü müziği çalma listesi (src/gridshard-audio.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeAudio {
  static instances = [];

  constructor(src = "") {
    this.src = src;
    this.volume = 1;
    this.loop = false;
    this.currentTime = 0;
    this.duration = 128;
    this.paused = true;
    FakeAudio.instances.push(this);
  }

  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

// iOS: HTML ses öğesinin seviyesi yazılamaz, hep 1 okunur.
class LockedVolumeAudio extends FakeAudio {
  get volume() { return 1; }
  set volume(_) {}
}

class FakeGain {
  constructor() { this.gain = {value: 0}; }
  connect() {}
}

class FakeSource {
  constructor() { this.playbackRate = {value: 1}; }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
  }
  createGain() { return new FakeGain(); }
  createBufferSource() { return new FakeSource(); }
  decodeAudioData() { return Promise.resolve({duration: 128}); }
  resume() { this.state = "running"; return Promise.resolve(); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
}

const fetched = [];
global.Audio = FakeAudio;
global.AudioContext = FakeAudioContext;
global.fetch = async (src) => {
  fetched.push(src);
  return {ok: true, arrayBuffer: async () => new ArrayBuffer(8)};
};

require("../src/gridshard-audio.js");

const TRACKS = [
  "./assets/audio/menu_a.wav",
  "./assets/audio/menu_b.wav",
  "./assets/audio/menu_c.wav",
];
const LEAD_SECONDS = global.GRIDSHARD_AUDIO_MIX.playlistCrossfadeMs / 1000;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function playlistDirector(t, {start = 0, playlist = TRACKS} = {}) {
  const random = Math.random;
  // İlk parça: floor(random * parça sayısı).
  Math.random = () => (start + 0.5) / playlist.length;
  const director = new global.GridshardAudioDirector({menuPlaylist: playlist});
  t.after(() => {
    Math.random = random;
    director.setAppActive(false);
  });
  return director;
}

const asset = (director) => director.currentTrack?._gridshardAsset;

test("varsayılan liste üç parçadır ve akıtılarak çalınır", (t) => {
  const playlist = global.GRIDSHARD_MENU_PLAYLIST;
  assert.equal(playlist.length, 3);
  assert.equal(new Set(playlist).size, 3);
  assert.equal(playlist[0], global.GRIDSHARD_MUSIC_ASSETS.menu);
  const director = new global.GridshardAudioDirector();
  t.after(() => director.setAppActive(false));

  director.setState("menu");

  assert.ok(director.currentTrack instanceof FakeAudio);
  assert.ok(playlist.includes(asset(director)));
  assert.notEqual(director._menuAdvanceTimer, null);
});

test("listedeki her parçanın kaynağı ve mobil türevleri yerindedir", () => {
  const audio = path.join(__dirname, "..", "assets", "audio");
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "src", "gridshard-audio-formats.js"), "utf8"),
    context
  );
  const formats = context.GRIDSHARD_AUDIO_ENCODINGS.formats;
  for (const entry of global.GRIDSHARD_MENU_PLAYLIST) {
    // Paketleme yalnız bu biçimdeki adları tanır (tools/build-client.js).
    const name = /^\.\/assets\/audio\/([a-z0-9_]+)\.wav$/.exec(entry)?.[1];
    assert.ok(name, entry);
    assert.ok(fs.existsSync(path.join(audio, `${name}.wav`)), `${name}.wav`);
    for (const extension of ["ogg", "m4a"]) {
      assert.ok(formats[extension].includes(name), `${name}: ${extension} listede yok`);
      assert.ok(fs.existsSync(path.join(audio, "mobile", `${name}.${extension}`)), `${name}.${extension}`);
    }
  }
});

test("tek parçalı listede parça Web Audio ile kesintisiz döner", async (t) => {
  const single = [TRACKS[0]];
  const director = playlistDirector(t, {playlist: single});

  director.setState("menu");
  await settle();

  const track = director.currentTrack;
  // Web Audio döngüsü: parça belleğe açılır ve kesintisiz döner.
  assert.ok(track.context instanceof FakeAudioContext);
  assert.equal(track.loop, true);
  assert.equal(asset(director), single[0]);
  assert.equal(director._menuAdvanceTimer, null);
  assert.equal(director._checkMenuAdvance(), false);
  assert.equal(director.currentTrack, track);

  director.setState("battle");
  assert.ok(director._musicBufferCache.has(single[0]), "tek parçalı listede döngü önbellekte kalır");
});

test("çok parçalı listede parça akıtılır, bitmeden sıradakine geçilir ve sıra döner", async (t) => {
  const director = playlistDirector(t, {start: 1});
  fetched.length = 0;

  director.setState("menu");
  const first = director.currentTrack;

  assert.ok(first instanceof FakeAudio, "uzun parça belleğe açılmaz, ses öğesiyle akıtılır");
  assert.equal(fetched.filter((src) => src.includes("menu_")).length, 0);
  assert.equal(asset(director), TRACKS[1]);
  assert.equal(first.loop, true);
  assert.notEqual(director._menuAdvanceTimer, null);

  first.currentTime = 100;
  assert.equal(director._checkMenuAdvance(), false);
  first.currentTime = first.duration - LEAD_SECONDS + 0.1;
  assert.equal(director._checkMenuAdvance(), true);

  const second = director.currentTrack;
  assert.notEqual(second, first);
  assert.equal(asset(director), TRACKS[2]);
  assert.equal(second.currentTime, 0);
  assert.equal(first.paused, false, "önceki parça geçiş boyunca sönerek çalar");

  const seen = [asset(director)];
  for (let turn = 0; turn < 4; turn += 1) {
    director.currentTrack.currentTime = 127;
    assert.equal(director._checkMenuAdvance(), true);
    seen.push(asset(director));
  }
  assert.deepEqual(seen, [TRACKS[2], TRACKS[0], TRACKS[1], TRACKS[2], TRACKS[0]]);

  await wait(global.GRIDSHARD_AUDIO_MIX.playlistCrossfadeMs + 200);
  assert.equal(first.paused, true, "geçiş bitince önceki parça durur");
  assert.equal(director.currentTrack.paused, false);
  assert.ok(director.currentTrack.volume > 0);

  director.setState("matchmaking");
  assert.equal(director._menuAdvanceTimer, null, "menüden çıkınca bitiş denetimi durur");
});

test("süresi henüz bilinmeyen parçada sıradakine geçilmez", (t) => {
  const director = playlistDirector(t);
  director.setState("menu");
  const track = director.currentTrack;
  track.duration = NaN;
  track.currentTime = 500;

  assert.equal(director._checkMenuAdvance(), false);
  assert.equal(director.currentTrack, track);
});

test("savaştan menüye dönüşte sıradaki parça baştan başlar", (t) => {
  const director = playlistDirector(t, {start: 0});
  director.setState("menu");
  assert.equal(asset(director), TRACKS[0]);
  director.currentTrack.currentTime = 40;

  director.setState("matchmaking");
  director.setState("battle");
  director.setState("victory");
  director.setState("menu");

  assert.equal(asset(director), TRACKS[1]);
  assert.equal(director.currentTrack.currentTime, 0);
});

test("savaş sonrası Hazırlık ekranından dönüşte de sıradaki parça baştan başlar", async (t) => {
  const director = playlistDirector(t, {start: 0});
  director.setState("menu");
  director.setState("matchmaking");
  director.setState("battle");
  director.setState("pool");
  await settle();
  director.currentTrack.currentTime = 9;

  director.setState("menu");

  // Kalınan yer yok: yeni parça Hazırlık döngüsünün fazını devralmaz.
  assert.equal(asset(director), TRACKS[1]);
  assert.equal(director.currentTrack.currentTime, 0);
});

test("müzik önizlemesi sıradaki parçayı baştan başlatır", (t) => {
  const director = playlistDirector(t, {start: 0});
  director.setState("menu");
  director.currentTrack.currentTime = 45;

  assert.equal(director.previewMusic("menu").ok, true);

  assert.equal(asset(director), TRACKS[1]);
  assert.equal(director.currentTrack.currentTime, 0);
});

test("arka plandan dönüşte aynı parça kaldığı yerden sürer", (t) => {
  const director = playlistDirector(t, {start: 2});
  director.setState("menu");
  const before = director.currentTrack;
  before.currentTime = 73.5;

  director.setAppActive(false);
  assert.equal(before.paused, true);
  assert.equal(director._menuAdvanceTimer, null);
  director.setAppActive(true);

  assert.notEqual(director.currentTrack, before);
  assert.equal(asset(director), TRACKS[2]);
  assert.equal(director.currentTrack.currentTime, 73.5);
  assert.notEqual(director._menuAdvanceTimer, null);
});

test("Hazırlık ekranından dönüşte aynı parça ileriden sürer; faz korunur", (t) => {
  const director = playlistDirector(t, {start: 1});
  director.setState("menu");
  director.currentTrack.currentTime = 50;

  director.setState("pool");
  const pool = director.currentTrack;
  assert.equal(pool._gridshardState, "pool");
  assert.equal(pool.currentTime, 50 % global.GRIDSHARD_CONTINUOUS_LOOP_SECONDS);

  director.setState("menu");
  assert.equal(asset(director), TRACKS[1]);
  assert.ok(director.currentTrack.currentTime >= 50);
  assert.ok(director.currentTrack.currentTime < 51);
});

test("Hazırlık ekranında parçanın sonu geçildiyse liste ilerlemiş sayılır", (t) => {
  const director = playlistDirector(t, {start: 1});
  director.setState("menu");
  director.currentTrack.currentTime = 100;
  director.setState("pool");

  // Hazırlık ekranında 40 saniye: parça 128. saniyede bitti, sıradaki 12 saniyedir çalıyor.
  director._menuResume.at -= 40_000;
  director.setState("menu");

  assert.equal(asset(director), TRACKS[2]);
  assert.ok(director.currentTrack.currentTime >= 12);
  assert.ok(director.currentTrack.currentTime < 13);
  assert.equal(director._checkMenuAdvance(), false);

  // İki parça boyu kalındıysa iki parça ilerlenir.
  director.currentTrack.currentTime = 20;
  director.setState("pool");
  director._menuResume.at -= 250_000;
  director.setState("menu");

  assert.equal(asset(director), TRACKS[1]);
  assert.ok(director.currentTrack.currentTime >= 14);
  assert.ok(director.currentTrack.currentTime < 15);
});

test("müzik sessize alınınca bitiş denetimi durur; açılınca çalma sürer", (t) => {
  const director = playlistDirector(t);
  director.setState("menu");
  assert.notEqual(director._menuAdvanceTimer, null);

  director.setPreferences({musicMuted: true});
  assert.equal(director.currentTrack, null);
  assert.equal(director._menuAdvanceTimer, null);

  director.setPreferences({musicMuted: false});
  assert.ok(TRACKS.includes(asset(director)));
  assert.notEqual(director._menuAdvanceTimer, null);
});

test("ses öğesinin seviyesi ayarlanamıyorsa Web Audio kullanılır ve eski parça bellekten bırakılır", async (t) => {
  global.Audio = LockedVolumeAudio;
  t.after(() => { global.Audio = FakeAudio; });
  const director = playlistDirector(t, {start: 0});

  director.setState("menu");
  await settle();
  const first = director.currentTrack;

  assert.ok(first.context instanceof FakeAudioContext, "geçişler ve müzik ayarı Web Audio kazancıyla yapılır");
  assert.equal(first.duration, 128);
  assert.ok(director._musicBufferCache.has(TRACKS[0]));

  director._musicContext.currentTime += 128 - LEAD_SECONDS + 0.1;
  assert.equal(director._checkMenuAdvance(), true);
  await settle();

  assert.equal(asset(director), TRACKS[1]);
  assert.ok(director._musicBufferCache.has(TRACKS[1]));
  assert.equal(director._musicBufferCache.has(TRACKS[0]), false);

  director.setState("battle");
  assert.equal(director._musicBufferCache.has(TRACKS[1]), false, "savaşa girince menü parçaları bırakılır");
});
