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

  const GRIDSHARD_MUSIC_ASSETS = Object.freeze({
    menu:"./assets/audio/menu_pulse.wav",
    pool:"./assets/audio/pool_pulse.wav",
    matchmaking:"./assets/audio/matchmaking_rise.wav",
    battle_intro:"./assets/audio/battle_pulse.wav",
    battle:"./assets/audio/battle_pulse.wav",
    battle_pressure:"./assets/audio/battle_pulse.wav",
    critical_core:"./assets/audio/battle_pulse.wav",
    victory:"./assets/audio/victory_sting.wav",
    defeat:"./assets/audio/defeat_sting.wav",
  });

  const GRIDSHARD_SFX_CUES = Object.freeze({
    port_connect:{
      asset:"./assets/audio/port_connect.wav",
      identity:"mekanik klik → elektrik kilidi → enerji pulse",
    },
    energy_transfer:{
      asset:"./assets/audio/energy_transfer.wav",
      identity:"kısa dijital akım",
    },
    laser_fire:{
      asset:"./assets/audio/laser_fire.wav",
      identity:"kapasitör dolumu → sert elektrik boşalması",
    },
    shield_hit:{
      asset:"./assets/audio/shield_hit.wav",
      identity:"camsı / plazma savunma darbesi",
    },
    emp:{
      asset:"./assets/audio/emp.wav",
      identity:"yüksek frekans kırılması → kısa sessizlik",
    },
    virus_glitch:{
      asset:"./assets/audio/virus_glitch.wav",
      identity:"dijital glitch",
    },
    generator_move:{
      asset:"./assets/audio/generator_move.wav",
      identity:"manyetik kilit aç / yön değişimi / kilit",
    },
    core_hit:{
      asset:"./assets/audio/core_hit.wav",
      identity:"derin bass transient + elektrik çatlağı",
    },
  });

  class GridshardAudioDirector {
    constructor() {
      this.state = GRIDSHARD_AUDIO_STATES.MENU;
      this.enabled = true;
      this.sfxEnabled = true;
      this.musicMuted = false;
      this.soundMuted = false;
      this.masterVolume = 1.0;
      this.musicVolume = 0.70;
      this.sfxVolume = 1.0;
      this.currentTrack = null;
    }

    _canPlayAudio() {
      return (
        typeof global.Audio
        === "function"
      );
    }

    _stopCurrentTrack() {
      if (!this.currentTrack) return;
      try {
        this.currentTrack.pause();
        this.currentTrack.currentTime = 0;
      } catch (_) {
        // Browser implementation detail; never block gameplay.
      }
      this.currentTrack = null;
    }

    _startStateAsset(state) {
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume <= 0
        || !this._canPlayAudio()
      ) {
        return;
      }

      const asset =
        GRIDSHARD_MUSIC_ASSETS[state];

      if (!asset) {
        return;
      }

      this._stopCurrentTrack();

      const audio =
        new global.Audio(asset);
      audio.volume =
        Math.max(
          0,
          Math.min(
            1,
            this.masterVolume
            * this.musicVolume
          )
        );
      audio.loop =
        ![
          GRIDSHARD_AUDIO_STATES.VICTORY,
          GRIDSHARD_AUDIO_STATES.DEFEAT,
          GRIDSHARD_AUDIO_STATES.MATCHMAKING,
        ].includes(state);

      this.currentTrack = audio;
      const playPromise =
        audio.play();

      if (
        playPromise
        && typeof playPromise.catch
          === "function"
      ) {
        playPromise.catch(
          () => {
            // Autoplay policy can block audio before a user gesture.
          }
        );
      }
    }

    setState(state) {
      if (!Object.values(GRIDSHARD_AUDIO_STATES).includes(state)) {
        return {
          ok:false,
          reason:"Bilinmeyen GRIDSHARD audio state.",
        };
      }

      const changed =
        this.state !== state;
      this.state = state;

      if (changed) {
        this._startStateAsset(
          state
        );
      }

      return {
        ok:true,
        state,
        asset:
          GRIDSHARD_MUSIC_ASSETS[state],
        direction:
          GRIDSHARD_AUDIO_DIRECTION[state],
      };
    }

    triggerCue(name) {
      const cue =
        GRIDSHARD_SFX_CUES[name];

      if (!cue) {
        return {
          ok:false,
          reason:"Bilinmeyen GRIDSHARD ses efekti.",
        };
      }

      if (
        this.enabled
        && this.sfxEnabled
        && !this.soundMuted
        && this.sfxVolume > 0
        && this._canPlayAudio()
      ) {
        const audio =
          new global.Audio(
            cue.asset
          );
        audio.volume =
          Math.max(
            0,
            Math.min(
              1,
              this.masterVolume
              * this.sfxVolume
            )
          );

        const playPromise =
          audio.play();
        if (
          playPromise
          && typeof playPromise.catch
            === "function"
        ) {
          playPromise.catch(
            () => {}
          );
        }
      }

      return {
        ok:true,
        name,
        ...cue,
      };
    }

    setPreferences({
      soundVolume = this.sfxVolume,
      musicVolume = this.musicVolume,
      soundMuted = this.soundMuted,
      musicMuted = this.musicMuted,
    } = {}) {
      this.sfxVolume =
        Math.max(
          0,
          Math.min(
            1,
            Number(soundVolume)
          )
        );
      this.musicVolume =
        Math.max(
          0,
          Math.min(
            1,
            Number(musicVolume)
          )
        );
      this.soundMuted =
        Boolean(soundMuted);
      this.musicMuted =
        Boolean(musicMuted);

      if (this.currentTrack) {
        if (
          this.musicMuted
          || this.musicVolume <= 0
        ) {
          this._stopCurrentTrack();
        } else {
          this.currentTrack.volume =
            this.masterVolume
            * this.musicVolume;
        }
      } else if (
        !this.musicMuted
        && this.musicVolume > 0
      ) {
        this._startStateAsset(
          this.state
        );
      }

      return this.preferences();
    }

    preferences() {
      return {
        soundVolume:
          this.sfxVolume,
        musicVolume:
          this.musicVolume,
        soundMuted:
          this.soundMuted,
        musicMuted:
          this.musicMuted,
      };
    }

    setMasterVolume(value) {
      this.masterVolume =
        Math.max(
          0,
          Math.min(
            1,
            Number(value)
          )
        );

      if (this.currentTrack) {
        this.currentTrack.volume =
          this.masterVolume
          * this.musicVolume;
      }

      return this.masterVolume;
    }
  }

  global.GRIDSHARD_AUDIO_STATES =
    GRIDSHARD_AUDIO_STATES;
  global.GRIDSHARD_AUDIO_DIRECTION =
    GRIDSHARD_AUDIO_DIRECTION;
  global.GRIDSHARD_MUSIC_ASSETS =
    GRIDSHARD_MUSIC_ASSETS;
  global.GRIDSHARD_SFX_CUES =
    GRIDSHARD_SFX_CUES;
  global.GridshardAudioDirector =
    GridshardAudioDirector;
})(
  typeof window !== "undefined"
    ? window
    : globalThis
);
