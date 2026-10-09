"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../src/gridshard-audio.js"), "utf8");

function fixture({webAudio=false, delayedDecode=false}={}) {
  let now = 0, nextTimer = 0, decode;
  const timers = new Map(), audio = [];
  class FakeAudio {
    constructor(src) { this.src=src; this.volume=0; this.paused=true; this.currentTime=0; this.listeners={}; audio.push(this); }
    play() { this.paused=false; return Promise.resolve(); }
    pause() { this.paused=true; }
    addEventListener(name, callback) { this.listeners[name]=callback; }
  }
  class FakeGain {
    constructor() {
      this.events=[];
      this.gain={value:0, setValueAtTime:(value,time) => { this.gain.value=value; this.events.push(["set",value,time]); },
        linearRampToValueAtTime:(value,time) => this.events.push(["ramp",value,time])};
    }
    connect() {}
    disconnect() {}
  }
  class FakeContext {
    constructor() { this.currentTime=10; this.state="running"; this.destination={}; this.sources=[]; this.gains=[]; }
    createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain; }
    createBufferSource() {
      const node={started:false,connect() {},disconnect() {},start() { this.started=true; },stop() { this.started=false; }};
      this.sources.push(node); return node;
    }
    decodeAudioData() { return delayedDecode ? new Promise(resolve => { decode=resolve; }) : Promise.resolve({duration:10}); }
    resume() { this.state="running"; return Promise.resolve(); }
    suspend() { this.state="suspended"; return Promise.resolve(); }
  }
  const sandbox = {Audio:FakeAudio,console,Date:class extends Date { static now() { return now; } },
    setInterval:run => { timers.set(++nextTimer,run); return nextTimer; }, clearInterval:id => timers.delete(id),
    setTimeout:() => 0, clearTimeout() {},
    fetch:async () => ({ok:true,arrayBuffer:async () => new ArrayBuffer(8)})};
  if (webAudio) sandbox.AudioContext=FakeContext;
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox);
  const director = new sandbox.GridshardAudioDirector();
  return {director,audio,sandbox,advance:ms => { now+=ms; for (const run of [...timers.values()]) run(); },
    decode:() => decode({duration:10}), flush:async () => { for (let index=0; index<12; index++) await Promise.resolve(); }};
}

test("HTML result has a trimmed soft attack; renders/preferences never restart it", async () => {
  const f = fixture();
  const d = f.director;
  d.setState("victory");
  const track = d.currentTrack;
  assert.equal(track.volume,0);
  await d.ensureResultPlayback("victory");
  assert.equal(track.volume,0);
  f.advance(160);
  assert.ok(track.volume>0 && track.volume<d._resultMusicTargetVolume());
  f.advance(160);
  assert.equal(track.volume,d._resultMusicTargetVolume());
  track.currentTime=3;
  d.setPreferences({musicVolume:.35});
  assert.equal(d.currentTrack,track);
  assert.equal(track.currentTime,3);
  assert.equal(track.volume,d._resultMusicTargetVolume());
  d.setMasterVolume(.5);
  assert.equal(track.volume,d._resultMusicTargetVolume());
});

test("reward-ad stop survives render, preferences, unlock and foreground; new battle resets it", async () => {
  const f = fixture();
  const d = f.director;
  d.setState("victory");
  const track = d.currentTrack;
  d.stopResultPlayback();
  assert.equal(track.paused,true);
  d.setState("victory");
  d.setPreferences({musicVolume:.6});
  await d.unlock();
  d.setAppActive(false);
  d.setAppActive(true);
  assert.equal(await d.ensureResultPlayback("victory"),false);
  assert.equal(d.currentTrack,null);
  d.setState("battle");
  d.setState("victory");
  assert.ok(d.currentTrack && d.currentTrack!==track);
});

test("Web Audio result uses trim plus 320 ms attack; combat tail stays attenuated", async () => {
  const f = fixture({webAudio:true});
  const d = f.director;
  d.state="battle";
  d._ensureAudioContext();
  d._sfxMakeupGain=2;
  d._syncWebAudioVolumes();
  const combatGain=d._sfxGainNode.gain.value;
  const combatTrim=d._sfxTrimNode.gain.value;
  d.setState("victory");
  await d.ensureResultPlayback("victory");
  assert.equal(d._sfxGainNode.gain.value,combatGain);
  assert.equal(d._sfxTrimNode.gain.value,combatTrim);
  assert.equal(d._resultGainNode.gain.value,d._resultMusicTargetVolume());
  assert.deepEqual(d._musicContext.gains.at(-1).events,[["set",0,10],["ramp",1,10.32]]);
  const sting=d._resultBufferSource;
  assert.equal(sting.started,true);
  d.setPreferences({musicVolume:.5});
  assert.equal(d._resultBufferSource,sting);
  d.stopResultPlayback();
  assert.equal(sting.started,false);
  assert.equal(d._activeBufferSources.size,0);
});

test("result stopped during decode cannot start later, even in a new same-outcome battle", async () => {
  const f = fixture({webAudio:true,delayedDecode:true});
  const d = f.director;
  d.setState("victory");
  const old = d.ensureResultPlayback("victory");
  await f.flush();
  d.stopResultPlayback();
  d.setPreferences({musicMuted:true});
  d.setState("battle");
  d.setState("victory");
  d.setPreferences({musicMuted:false});
  const current=d.ensureResultPlayback("victory");
  await f.flush();
  // Old/new requests share the decoded asset but not playback ownership.
  f.decode();
  assert.equal(await old,false);
  assert.equal(await current,true);
  assert.equal(d._musicContext.sources.filter(node => node.started).length,1);
  d.stopResultPlayback();
});

test("late HTML play rejection after ad stop cannot become a gesture-unlock retry", async () => {
  const f = fixture();
  const d = f.director;
  let reject;
  f.sandbox.Audio.prototype.play=function() { this.paused=false; return new Promise((_,fail) => { reject=fail; }); };
  d.setState("victory");
  d.stopResultPlayback();
  reject(new Error("backgrounded"));
  await f.flush();
  assert.equal(d._pendingPlayback.size,0);
  await d.unlock();
  assert.equal(d.currentTrack,null);
});

test("v15 changes only the intended battle/result gain controls", () => {
  const {director:d,sandbox} = fixture();
  assert.equal(sandbox.GRIDSHARD_AUDIO_MIX.battleMusicGain,2.85);
  assert.equal(sandbox.GRIDSHARD_AUDIO_MIX.battleSfxGain,.28);
  assert.equal(sandbox.GRIDSHARD_AUDIO_MIX.resultMusicGain,.55);
  assert.equal(d._musicTargetVolume(),.504);
  d.state="battle";
  assert.ok(Math.abs(d._sfxTargetVolume()-.154)<1e-12);
});

test("HTML battle stems clamp only the final gain, preserving the requested music boost", () => {
  const f = fixture();
  const d=f.director;
  d.setState("battle");
  f.advance(420);
  for (const track of d.battleLayerTracks) {
    const layer=track._gridshardLayer;
    const active=f.sandbox.GRIDSHARD_BATTLE_STATE_LAYERS.battle.includes(layer.id);
    const expected=active ? Math.min(1,d._musicTargetVolume()*2.85*(layer.baseGain+layer.pressureGain*d.battlePressure)) : 0;
    assert.equal(track.volume,expected);
  }
});

test("volume changes during HTML soft attack retarget without an abrupt jump or stale gain", async () => {
  const f = fixture();
  const d=f.director;
  d.setState("victory");
  await f.flush();
  f.advance(80);
  const track=d.currentTrack, previous=track.volume;
  d.setPreferences({musicVolume:.2});
  assert.equal(track.volume,previous);
  f.advance(240);
  assert.equal(track.volume,d._resultMusicTargetVolume());
});

test("cold HTML loading starts its soft attack only when playback really succeeds", async () => {
  const f=fixture(), d=f.director;
  let start;
  f.sandbox.Audio.prototype.play=function() { return new Promise(resolve => {start=() => {this.paused=false; resolve();};}); };
  d.setState("victory");
  const pending=d.ensureResultPlayback("victory"), track=d.currentTrack;
  f.advance(500);
  d.setPreferences({musicVolume:.5});
  assert.equal(track.volume,0);
  start();
  assert.equal(await pending,true);
  assert.equal(track.volume,0);
  f.advance(160);
  assert.ok(track.volume>0 && track.volume<d._resultMusicTargetVolume());
  f.advance(160);
  assert.equal(track.volume,d._resultMusicTargetVolume());
});

test("pending SFX decode cannot replay old hits after background/foreground or fall back to HTML", async () => {
  const f=fixture({webAudio:true,delayedDecode:true}), d=f.director;
  d.state="battle";
  assert.equal(d.triggerCue("laser_fire").played,true);
  await f.flush();
  d.setPreferences({musicMuted:true});
  d.setAppActive(false);
  d.setAppActive(true);
  f.decode();
  await f.flush();
  assert.equal(d._musicContext.sources.length,0);
  assert.equal(d._activeSfx.size,0);
  assert.equal(f.audio.length,0);
});

test("a reusable preloaded result starts a fresh attack at the same preference volume", async () => {
  const f=fixture(), d=f.director;
  const asset=f.sandbox.GRIDSHARD_MUSIC_ASSETS.victory;
  d._preloadedAudio.set(asset,new f.sandbox.Audio(asset));
  d.setState("victory");
  await d.ensureResultPlayback("victory");
  const track=d.currentTrack;
  f.advance(320);
  assert.equal(track.volume,d._resultMusicTargetVolume());
  d.stopResultPlayback();
  d.setState("battle");
  d.setState("victory");
  await d.ensureResultPlayback("victory");
  assert.equal(d.currentTrack,track);
  f.advance(320);
  assert.equal(track.volume,d._resultMusicTargetVolume());
});
