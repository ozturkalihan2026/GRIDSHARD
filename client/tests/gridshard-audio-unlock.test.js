const test = require("node:test");
const assert = require("node:assert/strict");

class UnlockableAudio {
  static unlocked = false;

  constructor(src) {
    this.src = src;
    this.volume = 0;
    this.loop = false;
    this.currentTime = 0;
    this.paused = true;
  }

  play() {
    if (!UnlockableAudio.unlocked) {
      this.paused = true;
      return Promise.reject(
        Object.assign(new Error("User gesture required"), { name:"NotAllowedError" })
      );
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

global.Audio = UnlockableAudio;
require("../src/gridshard-audio.js");

test("blocked autoplay is visible and retried after user gesture", async () => {
  const director = new global.GridshardAudioDirector();
  director.setState("menu");
  await new Promise((resolve) => setImmediate(resolve));

  const blocked = director.playbackStatus();
  assert.equal(blocked.pending, 1);
  assert.equal(blocked.lastError.name, "NotAllowedError");

  UnlockableAudio.unlocked = true;
  const unlocked = await director.unlock();
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.pending, 0);
  assert.equal(director.currentTrack.paused, false);
  assert.equal(director.playbackStatus().gestureObserved, true);
});

test("gesture listeners are bound once", () => {
  const director = new global.GridshardAudioDirector();
  const listeners = [];
  const target = {
    addEventListener:(name) => listeners.push(name),
    removeEventListener() {},
  };
  assert.equal(director.bindUserGestureUnlock(target).ok, true);
  assert.equal(director.bindUserGestureUnlock(target).ok, true);
  assert.deepEqual(listeners, ["pointerdown", "keydown", "touchstart"]);
});
