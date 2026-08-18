(function (global) {
  "use strict";

  const GRIDSHARD_AUDIO_STATES = Object.freeze({
    MENU: "menu",
    POOL: "pool",
    MATCHMAKING: "matchmaking",
    BATTLE_INTRO: "battle_intro",
    BATTLE: "battle",
    BATTLE_PRESSURE: "battle_pressure",
    CRITICAL_CORE: "critical_core",
    VICTORY: "victory",
    DEFEAT: "defeat",
  });

  const GRIDSHARD_AUDIO_DIRECTION = Object.freeze({
    menu: { bpm:[92,100], intensity:0.25 },
    pool: { bpm:[105,112], intensity:0.35 },
    matchmaking: { bpm:[115,120], intensity:0.50 },
    battle_intro: { bpm:[120,126], intensity:0.65 },
    battle: { bpm:[126,132], intensity:0.75 },
    battle_pressure: { bpm:[126,132], intensity:0.88 },
    critical_core: { bpm:[126,132], intensity:1.00 },
    victory: { stingSeconds:[5,7], intensity:0.90 },
    defeat: { stingSeconds:[5,7], intensity:0.72 },
  });

  class GridshardAudioDirector {
    constructor() {
      this.state = GRIDSHARD_AUDIO_STATES.MENU;
      this.enabled = true;
      this.masterVolume = 0.8;
    }

    setState(state) {
      if (!Object.values(GRIDSHARD_AUDIO_STATES).includes(state)) {
        return { ok:false, reason:"Bilinmeyen GRIDSHARD audio state." };
      }
      this.state = state;
      return {
        ok:true,
        state,
        direction:GRIDSHARD_AUDIO_DIRECTION[state],
      };
    }

    setMasterVolume(value) {
      this.masterVolume = Math.max(0,Math.min(1,Number(value)));
      return this.masterVolume;
    }
  }

  global.GRIDSHARD_AUDIO_STATES = GRIDSHARD_AUDIO_STATES;
  global.GRIDSHARD_AUDIO_DIRECTION = GRIDSHARD_AUDIO_DIRECTION;
  global.GridshardAudioDirector = GridshardAudioDirector;
})(typeof window !== "undefined" ? window : globalThis);
