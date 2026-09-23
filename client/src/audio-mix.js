(function (global) {
  "use strict";
  // Shared by the live seven-stem mixer and the compressed single-track fallback
  // renderer. Order: sub, pulse, percussion, ostinato, shards, dissonance, pressure.
  const mixes = Object.freeze({
    battle_intro: Object.freeze({ asset: "./assets/audio/battle_intro_v10.wav", gains: Object.freeze([.45, .22, .12, 0, 0, 0, 0]) }),
    battle: Object.freeze({ asset: "./assets/audio/battle_main_v10.wav", gains: Object.freeze([.42, .42, .40, .32, .16, .06, 0]) }),
    battle_pressure: Object.freeze({ asset: "./assets/audio/battle_pressure_v10.wav", gains: Object.freeze([.42, .50, .48, .40, .28, .20, .14]) }),
    critical_core: Object.freeze({ asset: "./assets/audio/battle_critical_v10.wav", gains: Object.freeze([.40, .52, .52, .42, .36, .32, .34]) }),
  });
  global.GRIDSHARD_BATTLE_MIXES = mixes;
  if (typeof module !== "undefined" && module.exports) module.exports = mixes;
})(typeof window !== "undefined" ? window : globalThis);
