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
    pool: { bpm:[96,100], intensity:0.35 },
    matchmaking: { bpm:[115,120], intensity:0.50 },
    battle_intro: { bpm:[120,126], intensity:0.65 },
    battle: { bpm:[126,132], intensity:0.75 },
    battle_pressure: { bpm:[126,132], intensity:0.88 },
    critical_core: { bpm:[126,132], intensity:1.00 },
    victory: { bpm:[142,146], stingSeconds:[9,11], intensity:1.00 },
    defeat: { stingSeconds:[5,7], intensity:0.72 },
  });

  const GRIDSHARD_AUDIO_MIX = Object.freeze({
    version:"shardglass-seamless-v9",
    crossfadeMs:1200,
    menuPoolCrossfadeMs:480,
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

  const GRIDSHARD_CONTINUOUS_LOOP_SECONDS = 32;

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
    tier_up:{
      asset:"./assets/audio/tier_up.wav",
      identity:"parlak yükseliş + çok katmanlı kademe mührü",
    },
  });

  class GridshardSeamlessLoopTrack {
    constructor(context, asset, bufferCache) {
      this.context = context;
      this.src = asset;
      this._bufferCache = bufferCache;
      this._buffer = null;
      this._source = null;
      this._offset = 0;
      this._startedAt = 0;
      this._volume = 0;
      this._playbackRate = 1;
      this._playToken = 0;
      this.loop = true;
      this.paused = true;
      this.preload = "auto";
      this._gain = context.createGain();
      this._gain.gain.value = 0;
      this._gain.connect(context.destination);
    }

    get volume() {
      return this._volume;
    }

    set volume(value) {
      this._volume = Math.max(0, Math.min(1, Number(value || 0)));
      this._gain.gain.value = this._volume;
    }

    get playbackRate() {
      return this._playbackRate;
    }

    set playbackRate(value) {
      this._playbackRate = Math.max(.25, Math.min(4, Number(value || 1)));
      if (this._source) {
        this._source.playbackRate.value = this._playbackRate;
      }
    }

    get currentTime() {
      if (!this.paused && this._buffer) {
        const elapsed = Math.max(0, this.context.currentTime - this._startedAt);
        return (
          this._offset
          + elapsed * this._playbackRate
        ) % this._buffer.duration;
      }
      return this._offset;
    }

    set currentTime(value) {
      const next = Math.max(0, Number(value || 0));
      this._offset = this._buffer?.duration
        ? next % this._buffer.duration
        : next;
      if (!this.paused && this._buffer) {
        this._startSource();
      }
    }

    _loadBuffer() {
      if (!this._bufferCache.has(this.src)) {
        this._bufferCache.set(
          this.src,
          global.fetch(this.src)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Music asset could not be loaded: ${this.src}`);
              }
              return response.arrayBuffer();
            })
            .then((bytes) => this.context.decodeAudioData(bytes))
        );
      }
      return this._bufferCache.get(this.src);
    }

    _stopSource() {
      const source = this._source;
      this._source = null;
      if (!source) return;
      try {
        source.stop();
        source.disconnect();
      } catch (_) {
        // AudioBufferSourceNode may already be stopped by the browser.
      }
    }

    _startSource() {
      if (!this._buffer || this.paused) return;
      this._stopSource();
      const source = this.context.createBufferSource();
      source.buffer = this._buffer;
      source.loop = this.loop;
      source.loopStart = 0;
      source.loopEnd = this._buffer.duration;
      source.playbackRate.value = this._playbackRate;
      source.connect(this._gain);
      this._startedAt = this.context.currentTime;
      source.start(0, this._offset % this._buffer.duration);
      this._source = source;
    }

    async play() {
      this.paused = false;
      const token = ++this._playToken;
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      const buffer = await this._loadBuffer();
      if (this.paused || token !== this._playToken) return;
      this._buffer = buffer;
      this._offset %= buffer.duration;
      this._startSource();
    }

    pause() {
      if (!this.paused && this._buffer) {
        this._offset = this.currentTime;
      }
      this.paused = true;
      this._playToken += 1;
      this._stopSource();
    }
  }

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
      this._fadeTimerByAudio = new Map();
      this._musicContext = null;
      this._musicBufferCache = new Map();
      this._pendingPlayback = new Map();
      this._lastPlaybackError = null;
      this._unlockTarget = null;
      this._unlockHandler = null;
      this._gestureObserved = false;
    }

    _createMusicTrack(asset, {seamless=false}={}) {
      const AudioContextClass =
        global.AudioContext
        || global.webkitAudioContext;
      if (
        seamless
        && typeof AudioContextClass === "function"
        && typeof global.fetch === "function"
      ) {
        this._musicContext =
          this._musicContext
          || new AudioContextClass();
        return new GridshardSeamlessLoopTrack(
          this._musicContext,
          asset,
          this._musicBufferCache
        );
      }
      return new global.Audio(asset);
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
      if (!audio || typeof audio.play !== "function") {
        return Promise.resolve(false);
      }
      let result;
      try {
        result=audio.play();
      } catch (error) {
        this._recordPlaybackFailure(audio, error);
        return Promise.resolve(false);
      }
      return Promise.resolve(result)
        .then(() => {
          this._pendingPlayback.delete(audio);
          this._lastPlaybackError = null;
          return true;
        })
        .catch((error) => {
          this._recordPlaybackFailure(audio, error);
          return false;
        });
    }

    _recordPlaybackFailure(audio, error) {
      const failure = {
        name:String(error?.name || "PlaybackError"),
        message:String(error?.message || error || "Audio playback failed."),
        src:String(audio?.src || audio?._gridshardAsset || ""),
        at:Date.now(),
      };
      this._pendingPlayback.set(audio, failure);
      this._lastPlaybackError = failure;
      return failure;
    }

    async unlock() {
      this._gestureObserved = true;
      if (this._musicContext?.state === "suspended") {
        try {
          await this._musicContext.resume();
        } catch (error) {
          this._lastPlaybackError = {
            name:String(error?.name || "AudioContextError"),
            message:String(error?.message || error || "Audio context could not resume."),
            src:"AudioContext",
            at:Date.now(),
          };
        }
      }
      const candidates = new Set([
        ...this._pendingPlayback.keys(),
        ...[
          this.currentTrack,
          this.criticalLayerTrack,
          ...this.battleLayerTracks,
        ].filter((audio) => audio && audio.paused !== false),
      ]);
      const results = await Promise.all(
        [...candidates].map((audio) => this._safePlay(audio))
      );
      return {
        ok:results.every(Boolean),
        attempted:results.length,
        pending:this._pendingPlayback.size,
        state:this.state,
      };
    }

    bindUserGestureUnlock(target=global.document) {
      if (!target || typeof target.addEventListener !== "function") {
        return { ok:false, reason:"Gesture target is unavailable." };
      }
      if (this._unlockTarget === target && this._unlockHandler) {
        return { ok:true, bound:true };
      }
      this.unbindUserGestureUnlock();
      this._unlockHandler = () => {
        this.unlock();
      };
      this._unlockTarget = target;
      for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
        target.addEventListener(eventName, this._unlockHandler, {
          capture:true,
          passive:true,
        });
      }
      return { ok:true, bound:true };
    }

    unbindUserGestureUnlock() {
      if (!this._unlockTarget || !this._unlockHandler) return false;
      for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
        this._unlockTarget.removeEventListener(
          eventName,
          this._unlockHandler,
          { capture:true }
        );
      }
      this._unlockTarget = null;
      this._unlockHandler = null;
      return true;
    }

    playbackStatus() {
      return {
        state:this.state,
        gestureObserved:this._gestureObserved,
        pending:this._pendingPlayback.size,
        currentAsset:String(
          this.currentTrack?.src
          || this.currentTrack?._gridshardAsset
          || ""
        ),
        lastError:this._lastPlaybackError
          ? { ...this._lastPlaybackError }
          : null,
      };
    }

    _stopAudio(audio) {
      if (!audio) return;
      this._pendingPlayback.delete(audio);
      this._cancelFade(audio);
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

      this._cancelFade(audio);

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
            if (this._fadeTimerByAudio.get(audio) === timer) {
              this._fadeTimerByAudio.delete(audio);
            }
            if (onDone) onDone();
          }
        },
        30
      );
      this._fadeTimers.add(timer);
      this._fadeTimerByAudio.set(audio, timer);
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

    _cancelFade(audio) {
      const timer = this._fadeTimerByAudio.get(audio);
      if (timer === undefined) return;
      if (typeof global.clearInterval === "function") {
        global.clearInterval(timer);
      }
      this._fadeTimers.delete(timer);
      this._fadeTimerByAudio.delete(audio);
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
      const seamlessState = [
        GRIDSHARD_AUDIO_STATES.MENU,
        GRIDSHARD_AUDIO_STATES.POOL,
        GRIDSHARD_AUDIO_STATES.MATCHMAKING,
      ].includes(state);
      const next=
        this._createMusicTrack(
          asset,
          {seamless:seamlessState}
        );
      const previousState = previous?._gridshardState || null;
      const phaseLockedTransition =
        [GRIDSHARD_AUDIO_STATES.MENU, GRIDSHARD_AUDIO_STATES.POOL]
          .includes(previousState)
        && [GRIDSHARD_AUDIO_STATES.MENU, GRIDSHARD_AUDIO_STATES.POOL]
          .includes(state);
      const transitionMs =
        phaseLockedTransition
          ? GRIDSHARD_AUDIO_MIX.menuPoolCrossfadeMs
          : (
              [
                GRIDSHARD_AUDIO_STATES.VICTORY,
                GRIDSHARD_AUDIO_STATES.DEFEAT,
              ].includes(state)
                ? GRIDSHARD_AUDIO_MIX.resultCrossfadeMs
                : GRIDSHARD_AUDIO_MIX.crossfadeMs
            );

      next._gridshardState = state;
      next._gridshardAsset = asset;
      next.preload = "auto";
      if (
        phaseLockedTransition
        && Number.isFinite(Number(previous?.currentTime))
      ) {
        next.currentTime = (
          Math.max(0, Number(previous.currentTime))
          % GRIDSHARD_CONTINUOUS_LOOP_SECONDS
        );
      }

      next.loop=
        ![
          GRIDSHARD_AUDIO_STATES
            .VICTORY,
          GRIDSHARD_AUDIO_STATES
            .DEFEAT,
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

      if (changed || (!this.currentTrack && !this.battleLayerTracks.length)) {
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
  global.GRIDSHARD_CONTINUOUS_LOOP_SECONDS=
    GRIDSHARD_CONTINUOUS_LOOP_SECONDS;
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
