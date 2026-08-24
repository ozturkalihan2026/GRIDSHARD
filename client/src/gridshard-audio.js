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
    victory: { bpm:[142,146], stingSeconds:[9,11], intensity:1.00 },
    defeat: { stingSeconds:[5,7], intensity:0.72 },
  });

  const GRIDSHARD_AUDIO_MIX = Object.freeze({
    version:"shardglass-seven-layer-v7",
    crossfadeMs:1200,
    resultCrossfadeMs:320,
    musicBaseGain:0.72,
    sfxBaseGain:0.86,
    criticalLayerGain:0.28,
    criticalLayerMaxGain:0.52,
    musicPeakDbfs:-6,
    sfxPeakDbfs:-3,
  });

  const GRIDSHARD_MUSIC_ASSETS = Object.freeze({
    menu:"./assets/audio/menu_ensemble_v6.wav",
    pool:"./assets/audio/pool_ensemble_v6.wav",
    matchmaking:"./assets/audio/matchmaking_rise.wav",
    battle_intro:"./assets/audio/battle_tension_v7_01_sub.wav",
    battle:"./assets/audio/battle_tension_v7_01_sub.wav",
    battle_pressure:"./assets/audio/battle_tension_v7_01_sub.wav",
    critical_core:"./assets/audio/battle_tension_v7_01_sub.wav",
    victory:"./assets/audio/victory_sting.wav",
    defeat:"./assets/audio/defeat_sting.wav",
  });

  const GRIDSHARD_CRITICAL_LAYER =
    "./assets/audio/battle_tension_v7_07_pressure.wav";

  const GRIDSHARD_BATTLE_LAYERS = Object.freeze([
    {id:"sub", asset:"./assets/audio/battle_tension_v7_01_sub.wav", baseGain:.36, pressureGain:.10},
    {id:"pulse", asset:"./assets/audio/battle_tension_v7_02_pulse.wav", baseGain:.30, pressureGain:.14},
    {id:"percussion", asset:"./assets/audio/battle_tension_v7_03_percussion.wav", baseGain:.27, pressureGain:.18},
    {id:"ostinato", asset:"./assets/audio/battle_tension_v7_04_ostinato.wav", baseGain:.24, pressureGain:.20},
    {id:"shards", asset:"./assets/audio/battle_tension_v7_05_shards.wav", baseGain:.16, pressureGain:.24},
    {id:"dissonance", asset:"./assets/audio/battle_tension_v7_06_dissonance.wav", baseGain:.13, pressureGain:.27},
    {id:"pressure", asset:"./assets/audio/battle_tension_v7_07_pressure.wav", baseGain:.06, pressureGain:.36},
  ]);

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
      identity:"ince kapasitör dolumu → keskin foton boşalması",
    },
    pulse_cannon_fire:{
      asset:"./assets/audio/pulse_cannon_fire.wav",
      identity:"çift plazma basıncı → tok darbe",
    },
    railgun_fire:{
      asset:"./assets/audio/railgun_fire.wav",
      identity:"manyetik ray yükselişi → metalik kırbaç",
    },
    missile_fire:{
      asset:"./assets/audio/missile_fire.wav",
      identity:"ateşleyici klik → roket motoru fırlayışı",
    },
    drone_fire:{
      asset:"./assets/audio/drone_fire.wav",
      identity:"üçlü mikro taret salvosu",
    },
    arc_cannon_fire:{
      asset:"./assets/audio/arc_cannon_fire.wav",
      identity:"iyon yükü → dallanan elektrik çatlağı",
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
      this.criticalLayerTrack = null;
      this.battleLayerTracks = [];
      this.battlePressure = .32;
      this._fadeTimers = new Set();
    }

    _canPlayAudio() {
      return (
        typeof global.Audio
        === "function"
      );
    }

    _musicTargetVolume() {
      return Math.max(
        0,
        Math.min(
          1,
          this.masterVolume
          * this.musicVolume
          * GRIDSHARD_AUDIO_MIX.musicBaseGain
        )
      );
    }

    _sfxTargetVolume() {
      return Math.max(
        0,
        Math.min(
          1,
          this.masterVolume
          * this.sfxVolume
          * GRIDSHARD_AUDIO_MIX.sfxBaseGain
        )
      );
    }

    _safePlay(audio) {
      if (!audio) return;
      const result=audio.play();
      if (
        result
        && typeof result.catch
        === "function"
      ) {
        result.catch(
          () => {
            // Browser autoplay policy never blocks gameplay.
          }
        );
      }
    }

    _stopAudio(audio) {
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime=0;
      } catch (_) {
        // Browser implementation detail.
      }
    }

    _fade(
      audio,
      from,
      to,
      durationMs,
      onDone=null
    ) {
      if (!audio) {
        if (onDone) onDone();
        return;
      }

      audio.volume=Math.max(
        0,
        Math.min(1,from)
      );

      if (
        durationMs <= 0
        || typeof global.setInterval
          !== "function"
      ) {
        audio.volume=Math.max(
          0,
          Math.min(1,to)
        );
        if (onDone) onDone();
        return;
      }

      const started=Date.now();
      const timer=global.setInterval(
        () => {
          const progress=Math.min(
            1,
            (
              Date.now()-started
            )/durationMs
          );
          audio.volume=
            from
            + (
              to-from
            )*progress;

          if (progress>=1) {
            global.clearInterval(
              timer
            );
            this._fadeTimers.delete(
              timer
            );
            if (onDone) onDone();
          }
        },
        30
      );
      this._fadeTimers.add(timer);
    }

    _stopCriticalLayer({
      fade=true,
    }={}) {
      const layer=
        this.criticalLayerTrack;
      if (!layer) return;

      this.criticalLayerTrack=null;

      if (this.battleLayerTracks.includes(layer)) {
        return;
      }

      const finish=()=>{
        this._stopAudio(
          layer
        );
      };

      if (fade) {
        this._fade(
          layer,
          Number(layer.volume || 0),
          0,
          GRIDSHARD_AUDIO_MIX.crossfadeMs,
          finish
        );
      } else {
        finish();
      }
    }

    _startCriticalLayer() {
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume<=0
        || !this._canPlayAudio()
      ) {
        return;
      }

      if (this.battleLayerTracks.length) {
        this.criticalLayerTrack =
          this.battleLayerTracks[
            this.battleLayerTracks.length - 1
          ];
        this._applyBattleLayerMix(1);
        return;
      }

      if (
        this.criticalLayerTrack
        && !this.battleLayerTracks.includes(this.criticalLayerTrack)
      ) {
        return;
      }

      const layer=
        new global.Audio(
          GRIDSHARD_CRITICAL_LAYER
        );
      layer.loop=true;
      layer.volume=0;
      this.criticalLayerTrack=layer;
      this._safePlay(layer);

      this._fade(
        layer,
        0,
        this._musicTargetVolume()
          * GRIDSHARD_AUDIO_MIX
            .criticalLayerGain,
        GRIDSHARD_AUDIO_MIX
          .crossfadeMs
      );
    }

    _isLayeredBattleState(state) {
      return [
        GRIDSHARD_AUDIO_STATES.BATTLE_INTRO,
        GRIDSHARD_AUDIO_STATES.BATTLE,
        GRIDSHARD_AUDIO_STATES.BATTLE_PRESSURE,
        GRIDSHARD_AUDIO_STATES.CRITICAL_CORE,
      ].includes(state);
    }

    _battlePressureForState(state) {
      if (state === GRIDSHARD_AUDIO_STATES.CRITICAL_CORE) return 1;
      if (state === GRIDSHARD_AUDIO_STATES.BATTLE_PRESSURE) {
        return Math.max(.72, this.battlePressure);
      }
      if (state === GRIDSHARD_AUDIO_STATES.BATTLE_INTRO) return .24;
      return Math.max(.32, this.battlePressure);
    }

    _applyBattleLayerMix(pressure=this.battlePressure, {fade=false}={}) {
      const normalized = Math.max(0, Math.min(1, Number(pressure)));
      this.battlePressure = normalized;
      for (let index = 0; index < this.battleLayerTracks.length; index += 1) {
        const track = this.battleLayerTracks[index];
        const layer = GRIDSHARD_BATTLE_LAYERS[index];
        if (!track || !layer) continue;
        const target = this._musicTargetVolume()
          * (layer.baseGain + layer.pressureGain * normalized);
        if (fade) {
          this._fade(track, Number(track.volume || 0), target, 420);
        } else {
          track.volume = target;
        }
        if ("playbackRate" in track) track.playbackRate = 1;
      }
    }

    _stopBattleLayers({fade=true}={}) {
      const tracks = [...this.battleLayerTracks];
      this.battleLayerTracks = [];
      if (tracks.includes(this.currentTrack)) this.currentTrack = null;
      if (tracks.includes(this.criticalLayerTrack)) this.criticalLayerTrack = null;
      for (const track of tracks) {
        if (fade) {
          this._fade(
            track,
            Number(track.volume || 0),
            0,
            GRIDSHARD_AUDIO_MIX.crossfadeMs,
            () => this._stopAudio(track)
          );
        } else {
          this._stopAudio(track);
        }
      }
    }

    _transitionToBattleLayers(state) {
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume <= 0
        || !this._canPlayAudio()
      ) return;

      const pressure = this._battlePressureForState(state);
      if (this.battleLayerTracks.length === GRIDSHARD_BATTLE_LAYERS.length) {
        this.currentTrack = this.battleLayerTracks[0];
        this.criticalLayerTrack =
          state === GRIDSHARD_AUDIO_STATES.CRITICAL_CORE
            ? this.battleLayerTracks[this.battleLayerTracks.length - 1]
            : null;
        this._applyBattleLayerMix(pressure, {fade:true});
        return;
      }

      const previous = this.currentTrack;
      this._stopCriticalLayer({fade:false});
      this._stopBattleLayers({fade:false});
      const tracks = GRIDSHARD_BATTLE_LAYERS.map(layer => {
        const audio = new global.Audio(layer.asset);
        audio.loop = true;
        audio.volume = 0;
        this._safePlay(audio);
        return audio;
      });
      this.battleLayerTracks = tracks;
      this.currentTrack = tracks[0] || null;
      this.criticalLayerTrack =
        state === GRIDSHARD_AUDIO_STATES.CRITICAL_CORE
          ? tracks[tracks.length - 1] || null
          : null;
      this._applyBattleLayerMix(pressure, {fade:true});

      if (previous && !tracks.includes(previous)) {
        this._fade(
          previous,
          Number(previous.volume || 0),
          0,
          GRIDSHARD_AUDIO_MIX.crossfadeMs,
          () => this._stopAudio(previous)
        );
      }
    }

    _transitionToStateAsset(
      state
    ) {
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume<=0
        || !this._canPlayAudio()
      ) {
        return;
      }

      if (this._isLayeredBattleState(state)) {
        this._transitionToBattleLayers(state);
        return;
      }

      const asset=
        GRIDSHARD_MUSIC_ASSETS[
          state
        ];
      if (!asset) return;

      const previous=
        this.currentTrack;
      const leavingLayeredBattle = this.battleLayerTracks.length > 0;
      if (leavingLayeredBattle) {
        this._stopBattleLayers();
      }
      const next=
        new global.Audio(asset);
      const transitionMs =
        [
          GRIDSHARD_AUDIO_STATES
            .VICTORY,
          GRIDSHARD_AUDIO_STATES
            .DEFEAT,
        ].includes(state)
          ? GRIDSHARD_AUDIO_MIX
            .resultCrossfadeMs
          : GRIDSHARD_AUDIO_MIX
            .crossfadeMs;

      next.loop=
        ![
          GRIDSHARD_AUDIO_STATES
            .VICTORY,
          GRIDSHARD_AUDIO_STATES
            .DEFEAT,
          GRIDSHARD_AUDIO_STATES
            .MATCHMAKING,
        ].includes(state);

      next.volume=0;
      this.currentTrack=next;
      this._safePlay(next);

      this._fade(
        next,
        0,
        this._musicTargetVolume(),
        transitionMs
      );

      if (
        previous
        && !leavingLayeredBattle
        && previous!==next
      ) {
        this._fade(
          previous,
          Number(
            previous.volume || 0
          ),
          0,
          transitionMs,
          ()=>{
            this._stopAudio(
              previous
            );
          }
        );
      }

      if (
        state
        === GRIDSHARD_AUDIO_STATES
          .CRITICAL_CORE
      ) {
        this._startCriticalLayer();
      } else {
        this._stopCriticalLayer();
      }
    }

    _stopAllMusic() {
      const current=
        this.currentTrack;
      this.currentTrack=null;
      if (current) {
        this._stopAudio(
          current
        );
      }
      this._stopBattleLayers({fade:false});
      this._stopCriticalLayer({
        fade:false,
      });
    }

    setState(state) {
      if (
        !Object.values(
          GRIDSHARD_AUDIO_STATES
        ).includes(state)
      ) {
        return {
          ok:false,
          reason:
            "Bilinmeyen GRIDSHARD audio state.",
        };
      }

      const changed=
        this.state!==state;
      this.state=state;

      if (changed) {
        this._transitionToStateAsset(
          state
        );
      } else if (
        state
        === GRIDSHARD_AUDIO_STATES
          .CRITICAL_CORE
      ) {
        this._startCriticalLayer();
      }

      return {
        ok:true,
        state,
        asset:
          GRIDSHARD_MUSIC_ASSETS[
            state
          ],
        criticalLayer:
          state
          === GRIDSHARD_AUDIO_STATES
            .CRITICAL_CORE
            ? GRIDSHARD_CRITICAL_LAYER
            : null,
        direction:
          GRIDSHARD_AUDIO_DIRECTION[
            state
          ],
        mix:
          GRIDSHARD_AUDIO_MIX,
      };
    }

    triggerCue(name) {
      const cue=
        GRIDSHARD_SFX_CUES[name];

      if (!cue) {
        return {
          ok:false,
          reason:
            "Bilinmeyen GRIDSHARD ses efekti.",
        };
      }

      if (
        this.enabled
        && this.sfxEnabled
        && !this.soundMuted
        && this.sfxVolume>0
        && this._canPlayAudio()
      ) {
        const audio=
          new global.Audio(
            cue.asset
          );
        audio.volume=
          this._sfxTargetVolume();
        this._safePlay(audio);
      }

      return {
        ok:true,
        name,
        normalizedPeakDbfs:
          GRIDSHARD_AUDIO_MIX
            .sfxPeakDbfs,
        ...cue,
      };
    }

    previewMusic(
      state=GRIDSHARD_AUDIO_STATES.MENU
    ) {
      if (
        !GRIDSHARD_MUSIC_ASSETS[
          state
        ]
      ) {
        return {
          ok:false,
          reason:
            "Önizlenecek müzik state'i bulunamadı.",
        };
      }

      this._transitionToStateAsset(
        state
      );

      return {
        ok:true,
        state,
        asset:
          GRIDSHARD_MUSIC_ASSETS[
            state
          ],
      };
    }

    previewSfx(
      cue="core_hit"
    ) {
      return this.triggerCue(
        cue
      );
    }

    setBattlePressure(value=0.5) {
      const pressure=Math.max(
        0,
        Math.min(
          1,
          Number(value)
        )
      );

      const stage=
        pressure >= .72
          ? "high"
          : (
              pressure >= .38
                ? "medium"
                : "low"
            );

      this.battlePressure = pressure;
      if (this.battleLayerTracks.length) {
        this._applyBattleLayerMix(pressure);
      }

      if (
        this.criticalLayerTrack
        && !this.battleLayerTracks.includes(this.criticalLayerTrack)
      ) {
        const stageGain={
          low:
            GRIDSHARD_AUDIO_MIX
              .criticalLayerGain,
          medium:
            (
              GRIDSHARD_AUDIO_MIX
                .criticalLayerGain
              + GRIDSHARD_AUDIO_MIX
                .criticalLayerMaxGain
            ) / 2,
          high:
            GRIDSHARD_AUDIO_MIX
              .criticalLayerMaxGain,
        }[stage];

        this.criticalLayerTrack.volume=
          this._musicTargetVolume()
          * stageGain;

        if (
          "playbackRate"
          in this.criticalLayerTrack
        ) {
          this.criticalLayerTrack
            .playbackRate={
              low:.96,
              medium:1.0,
              high:1.06,
            }[stage];
        }
      }

      return {
        pressure,
        stage,
      };
    }

    setPreferences({
      soundVolume =
        this.sfxVolume,
      musicVolume =
        this.musicVolume,
      soundMuted =
        this.soundMuted,
      musicMuted =
        this.musicMuted,
    }={}) {
      this.sfxVolume=Math.max(
        0,
        Math.min(
          1,
          Number(soundVolume)
        )
      );
      this.musicVolume=Math.max(
        0,
        Math.min(
          1,
          Number(musicVolume)
        )
      );
      this.soundMuted=
        Boolean(soundMuted);
      this.musicMuted=
        Boolean(musicMuted);

      if (
        this.musicMuted
        || this.musicVolume<=0
      ) {
        this._stopAllMusic();
      } else if (
        this.battleLayerTracks.length
      ) {
        this._applyBattleLayerMix(this.battlePressure);
      } else if (
        this.currentTrack
      ) {
        this.currentTrack.volume=
          this._musicTargetVolume();

        if (
          this.criticalLayerTrack
        ) {
          this.criticalLayerTrack
            .volume=
              this._musicTargetVolume()
              * GRIDSHARD_AUDIO_MIX
                .criticalLayerGain;
        }
      } else {
        this._transitionToStateAsset(
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
        mixVersion:
          GRIDSHARD_AUDIO_MIX
            .version,
      };
    }

    setMasterVolume(value) {
      this.masterVolume=Math.max(
        0,
        Math.min(
          1,
          Number(value)
        )
      );

      if (this.currentTrack) {
        this.currentTrack.volume=
          this._musicTargetVolume();
      }
      if (this.battleLayerTracks.length) {
        this._applyBattleLayerMix(this.battlePressure);
      }
      if (
        this.criticalLayerTrack
        && !this.battleLayerTracks.includes(this.criticalLayerTrack)
      ) {
        this.criticalLayerTrack
          .volume=
            this._musicTargetVolume()
            * GRIDSHARD_AUDIO_MIX
              .criticalLayerGain;
      }

      return this.masterVolume;
    }
  }

  global.GRIDSHARD_AUDIO_STATES=
    GRIDSHARD_AUDIO_STATES;
  global.GRIDSHARD_AUDIO_DIRECTION=
    GRIDSHARD_AUDIO_DIRECTION;
  global.GRIDSHARD_AUDIO_MIX=
    GRIDSHARD_AUDIO_MIX;
  global.GRIDSHARD_MUSIC_ASSETS=
    GRIDSHARD_MUSIC_ASSETS;
  global.GRIDSHARD_CRITICAL_LAYER=
    GRIDSHARD_CRITICAL_LAYER;
  global.GRIDSHARD_BATTLE_LAYERS=
    GRIDSHARD_BATTLE_LAYERS;
  global.GRIDSHARD_SFX_CUES=
    GRIDSHARD_SFX_CUES;
  global.GridshardAudioDirector=
    GridshardAudioDirector;
})(
  typeof window!=="undefined"
    ? window
    : globalThis
);
