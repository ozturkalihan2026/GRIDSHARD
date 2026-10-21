"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../src/gridshard-audio.js"), "utf8");

function fixture() {
  const nodes = [];
  let startFails = false, stopFails = false;
  const makeNode = type => {
    const node = {
      type, connected:false, gain:{ value:1 }, pan:{ value:0 }, playbackRate:{ value:1 },
      connect() { this.connected = true; }, disconnect() { this.connected = false; },
      start(when) { if (startFails) throw new Error("start failed"); this.when = when; },
      stop() { if (stopFails) throw new Error("already stopped"); },
    };
    nodes.push(node);
    return node;
  };
  const audio = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.listeners = new Map(); audio.push(this); }
    play() { return Promise.reject(new Error("autoplay or network failure")); }
    pause() {}
    addEventListener(name, run) { this.listeners.set(name, run); }
    removeEventListener(name) { this.listeners.delete(name); }
  }
  const sandbox = { console, Audio:FakeAudio };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);
  const director = new sandbox.GridshardAudioDirector();
  const context = {
    state:"running", currentTime:0, createBufferSource:() => makeNode("source"),
    createGain:() => makeNode("gain"), createStereoPanner:() => makeNode("panner"),
  };
  director._sfxGainNode = {};
  director._resultGainNode = {};
  director._ensureAudioContext = () => context;
  director._resumeAudioContext = async () => true;
  const load = director._loadAudioBuffer.bind(director);
  director._loadAudioBuffer = async () => ({ duration:1 });
  return { director, nodes, audio, sandbox, context, load,
    failStart:() => { startFails = true; }, failStop:() => { stopFails = true; },
    play:options => director._playAudioBuffer("cue.wav", { gain:.5, pan:.5, ...options }),
  };
}

test("natural end and forced stop release the complete voice graph", async () => {
  for (const mode of ["end", "stop", "stop-throws"]) {
    const f = fixture();
    for (let battle = 0; battle < 40; battle++) {
      assert.equal(await f.play(), true);
      const node = [...f.director._activeBufferSources][0], ended = node.onended;
      if (mode === "end") ended();
      else {
        if (mode === "stop-throws") f.failStop();
        f.director._stopActiveSfx();
      }
      ended(); // Already queued ended events are harmless.
      assert.equal(f.director._activeBufferSources.size, 0);
      assert.equal(f.nodes.filter(n => n.connected).length, 0, mode);
      assert.equal(node.onended, null);
    }
  }
});

test("start failure cannot leave phantom active voices or connected gain/pan nodes", async () => {
  const f = fixture();
  f.failStart();
  for (let attempt = 0; attempt < 40; attempt++) {
    assert.equal(await f.play(), false);
    assert.equal(f.director._activeBufferSources.size, 0);
    assert.equal(f.nodes.filter(n => n.connected).length, 0);
  }
  assert.match(f.director._lastPlaybackError.message, /start failed/);
});

test("stopping result audio releases its per-voice gain without stopping other cues", async () => {
  const f = fixture(), d = f.director;
  d._resultBufferOutcome = "victory";
  assert.equal(await f.play({ channel:"result", outcome:"victory", resultGeneration:d._resultPlaybackGeneration }), true);
  const resultNodes = [...f.nodes];
  assert.equal(await f.play(), true);
  d._stopResultBuffer();
  assert.equal(d._activeBufferSources.size, 1);
  assert.ok(resultNodes.every(n => !n.connected));
  d._stopActiveSfx();
  assert.ok(f.nodes.every(n => !n.connected));
});

test("failed short HTML cues do not accumulate for replay on a later gesture", async () => {
  const f = fixture();
  for (let i = 0; i < 100; i++) {
    assert.equal(await f.director._playHtmlCue({ asset:"cue.wav" }), false);
    assert.equal(f.director._activeSfx.size, 0);
    assert.equal(f.director._pendingPlayback.size, 0);
  }
  assert.ok(f.audio.every(a => a.listeners.size === 0));
});

test("failed decodes can retry while concurrent and successful loads remain cached", async () => {
  const f = fixture();
  let attempts = 0;
  f.sandbox.fetch = async () => {
    attempts++;
    if (attempts === 1) throw new Error("offline");
    return { ok:true, arrayBuffer:async () => new ArrayBuffer(8) };
  };
  f.context.decodeAudioData = async () => ({ duration:1 });
  const first = f.load("cue.wav"), concurrent = f.load("cue.wav");
  assert.equal(first, concurrent);
  await assert.rejects(first, /offline/);
  assert.equal(f.director._musicBufferCache.size, 0);
  const retry = f.load("cue.wav");
  assert.equal(f.load("cue.wav"), retry);
  await retry;
  assert.equal(f.load("cue.wav"), retry);
  assert.equal(attempts, 2);
});

test("music loop stop, restart and failed start release the complete track graph", () => {
  const f = fixture();
  f.sandbox.fetch = async () => {};
  for (let transition = 0; transition < 100; transition++) {
    const tracks = f.director._createBattleLayerTracks();
    assert.ok(f.nodes.every(n => !n.connected), "unstarted tracks must not connect gains");
    for (const track of tracks) track.startAt({ duration:30 }, 0);
    assert.equal(f.nodes.filter(n => n.connected).length, 14);
    if (transition === 99) f.failStop();
    for (const track of tracks) track.pause();
    assert.ok(f.nodes.every(n => !n.connected));
    tracks[0].startAt({ duration:30 }, 0, 3);
    assert.equal(f.nodes.filter(n => n.connected).length, 2);
    tracks[0].pause();
    assert.ok(f.nodes.every(n => !n.connected));
  }
  const track = f.director._createBattleLayerTracks()[0];
  f.failStart();
  assert.throws(() => track.startAt({ duration:30 }, 0), /start failed/);
  assert.ok(f.nodes.every(n => !n.connected));
});

test("music loops evict failed loads and retry on the same track", async () => {
  const f = fixture();
  let attempts = 0;
  f.sandbox.fetch = async () => {
    if (++attempts === 1) throw new Error("offline music");
    return { ok:true, arrayBuffer:async () => new ArrayBuffer(8) };
  };
  f.context.decodeAudioData = async () => ({ duration:30 });
  const track = f.director._createBattleLayerTracks()[0];
  await assert.rejects(track.play(), /offline music/);
  assert.equal(f.director._musicBufferCache.size, 0);
  await track.play();
  assert.equal(attempts, 2);
  assert.equal(track.paused, false);
  track.pause();
  assert.ok(f.nodes.every(n => !n.connected));
});

const settle = () => new Promise(resolve => setImmediate(resolve));

test("a failed battle layer batch releases every stem and retries in sync on unlock", async () => {
  const f = fixture(), d = f.director;
  let attempts = 0;
  f.sandbox.fetch = async () => {
    if (++attempts === 3) throw new Error("one stem offline");
    return { ok:true, arrayBuffer:async () => new ArrayBuffer(8) };
  };
  f.context.decodeAudioData = async () => ({ duration:30 });
  const tracks = d._createBattleLayerTracks();
  d.battleLayerTracks = tracks;
  d.currentTrack = tracks[0];
  d._startBattleLayerTracks(tracks);
  await settle();
  assert.ok(tracks.every(track => track.paused), "failed batch must become retryable");
  assert.ok(f.nodes.every(n => !n.connected));
  assert.match(d._lastPlaybackError.message, /offline/);
  await d.unlock();
  assert.equal(attempts, 8, "only the failed stem must be downloaded again");
  assert.ok(tracks.every(track => !track.paused));
  const sources = f.nodes.filter(n => n.type === "source" && n.connected);
  assert.equal(sources.length, 7);
  assert.equal(new Set(sources.map(n => n.when)).size, 1);
  assert.equal(sources[0].when, .05);
  assert.equal(d._lastPlaybackError, null);
  d._stopBattleLayers({ fade:false });
  assert.ok(f.nodes.every(n => !n.connected));
});

test("partial batch start failure stops already started stems before recovery", async () => {
  const f = fixture(), d = f.director;
  f.sandbox.fetch = async () => {};
  const tracks = d._createBattleLayerTracks();
  for (const track of tracks) track._loadBuffer = async () => ({ duration:30 });
  const start = tracks[3].startAt;
  tracks[3].startAt = () => { throw new Error("start unavailable"); };
  d.battleLayerTracks = tracks;
  d._startBattleLayerTracks(tracks);
  await settle();
  assert.ok(tracks.every(track => track.paused));
  assert.ok(f.nodes.every(n => !n.connected), "no partial, unbalanced score remains playing");
  tracks[3].startAt = start;
  await d.unlock();
  assert.equal(f.nodes.filter(n => n.type === "source" && n.connected).length, 7);
  d._stopBattleLayers({ fade:false });
});

test("repeated gestures share a pending batch and late failures cannot affect a new scene", async () => {
  const f = fixture(), d = f.director;
  f.sandbox.fetch = async () => {};
  const tracks = d._createBattleLayerTracks();
  let rejectLoad, loads = 0;
  const pending = new Promise((_, reject) => { rejectLoad = reject; });
  for (const track of tracks) track._loadBuffer = () => { loads++; return pending; };
  d.battleLayerTracks = tracks;
  const first = d._startBattleLayerTracks(tracks);
  for (let i = 0; i < 10; i++) assert.equal(d._startBattleLayerTracks(tracks), first);
  assert.equal(loads, 7);
  d._stopBattleLayers({ fade:false });
  const currentError = { message:"new scene error" };
  d._lastPlaybackError = currentError;
  rejectLoad(new Error("obsolete batch"));
  await settle();
  assert.equal(d._lastPlaybackError, currentError);
  assert.ok(f.nodes.every(n => !n.connected));
});

test("stopping during decode prevents late battle audio from starting", async () => {
  const f = fixture(), d = f.director;
  f.sandbox.fetch = async () => {};
  const tracks = d._createBattleLayerTracks();
  let resolveLoad;
  const pending = new Promise(resolve => { resolveLoad = resolve; });
  for (const track of tracks) track._loadBuffer = () => pending;
  d.battleLayerTracks = tracks;
  d._startBattleLayerTracks(tracks);
  d._stopBattleLayers({ fade:false });
  resolveLoad({ duration:30 });
  await settle();
  assert.ok(tracks.every(track => track.paused));
  assert.ok(f.nodes.every(n => !n.connected));
});
