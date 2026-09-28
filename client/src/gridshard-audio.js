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
    version:"shardglass-seamless-v12",
    crossfadeMs:1200,
    menuPoolCrossfadeMs:480,
    resultCrossfadeMs:320,
    musicBaseGain:0.72,
    // v11: savaş efektleri müziği bastırmasın; efektler kısık, savaş
    // müziği açık, efekt kanalı sıkıştırıcıdan geçer.
    sfxBaseGain:0.55,
    // v12: savaşta katmanlı müzik baskın, silah/darbe efektleri arka planda.
    // Müzik kazancı yükseldi; efekt kanalı savaş durumlarında ayrıca kısılır.
    // Katman toplamı kırpılmasın diye müzik hattı sınırlayıcıdan geçer.
    battleMusicGain:1.85,
    battleSfxGain:0.5,
    sfxCompressor:Object.freeze({ threshold:-20, knee:12, ratio:4, attack:.004, release:.22 }),
    musicLimiter:Object.freeze({ threshold:-3, knee:0, ratio:20, attack:.003, release:.25 }),
    criticalLayerGain:0.28,
    criticalLayerMaxGain:0.52,
    musicPeakDbfs:-6,
    sfxPeakDbfs:-3,
  });

  const GRIDSHARD_MUSIC_ASSETS = Object.freeze({
    menu:"./assets/audio/menu_ensemble_v6.wav",
    pool:"./assets/audio/pool_ensemble_v6.wav",
    matchmaking:"./assets/audio/matchmaking_rise.wav",
    // Savaş durumları katmanlı çalar; buradaki değer o durumu tanımlayan
    // imza stem'idir. Durumlar artık aynı dosyayı paylaşmaz.
    battle_intro:"./assets/audio/battle_tension_v7_02_pulse.wav",
    battle:"./assets/audio/battle_tension_v7_04_ostinato.wav",
    battle_pressure:"./assets/audio/battle_tension_v7_06_dissonance.wav",
    critical_core:"./assets/audio/battle_tension_v7_07_pressure.wav",
    victory:"./assets/audio/victory_sting.wav",
    defeat:"./assets/audio/defeat_sting.wav",
  });

  const GRIDSHARD_CRITICAL_LAYER =
    "./assets/audio/battle_tension_v7_07_pressure.wav";

  const GRIDSHARD_CONTINUOUS_LOOP_SECONDS = 32;
  const GRIDSHARD_BATTLE_MUSIC_ENABLED = true;

  // Her savaş durumu yalnız kendi stem kümesini duyurur; baskı değeri bu
  // küme içindeki kazançları değiştirir.
  const GRIDSHARD_BATTLE_STATE_LAYERS = Object.freeze({
    battle_intro:Object.freeze(["sub", "pulse", "percussion"]),
    battle:Object.freeze(["sub", "pulse", "percussion", "ostinato", "shards"]),
    battle_pressure:Object.freeze(["sub", "pulse", "percussion", "ostinato", "shards", "dissonance"]),
    critical_core:Object.freeze(["sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure"]),
  });

  // navigator.deviceMemory <= 2 GB cihazlarda çözülmüş PCM bütçesini
  // yarıya indirmek için yalnız omurga ve kritik stem'ler yüklenir.
  const GRIDSHARD_LOW_MEMORY_BATTLE_LAYERS = Object.freeze([
    "sub", "pulse", "percussion", "pressure",
  ]);

  // tools/encode_mobile_audio.py üretir: ./assets/audio/mobile/<ad>.<uzantı>
  const GRIDSHARD_AUDIO_ENCODING_PROBES = Object.freeze([
    {extension:"ogg", mime:'audio/ogg; codecs="vorbis"', accept:["probably"]},
    {extension:"m4a", mime:'audio/mp4; codecs="mp4a.40.2"', accept:["probably", "maybe"]},
  ]);

  let gridshardPreferredEncodingCache;

  function gridshardPreferredEncoding() {
    if (gridshardPreferredEncodingCache !== undefined) {
      return gridshardPreferredEncodingCache;
    }
    gridshardPreferredEncodingCache = null;
    const manifest = global.GRIDSHARD_AUDIO_ENCODINGS;
    if (!manifest?.formats || typeof global.Audio !== "function") {
      return gridshardPreferredEncodingCache;
    }
    let probe;
    try {
      probe = new global.Audio();
    } catch (_) {
      return gridshardPreferredEncodingCache;
    }
    if (typeof probe?.canPlayType !== "function") {
      return gridshardPreferredEncodingCache;
    }
    for (const candidate of GRIDSHARD_AUDIO_ENCODING_PROBES) {
      const available = manifest.formats[candidate.extension];
      if (!Array.isArray(available) || !available.length) continue;
      if (candidate.accept.includes(probe.canPlayType(candidate.mime))) {
        gridshardPreferredEncodingCache = {
          extension:candidate.extension,
          names:new Set(available),
        };
        break;
      }
    }
    return gridshardPreferredEncodingCache;
  }

  function gridshardResolveAudioAsset(asset) {
    const match = /^(.*\/assets\/audio\/)([\w.-]+)\.wav$/.exec(String(asset || ""));
    const encoding = match && gridshardPreferredEncoding();
    if (!encoding || !encoding.names.has(match[2])) return asset;
    return `${match[1]}mobile/${match[2]}.${encoding.extension}`;
  }

  function gridshardDecodeAudioAsset(context, asset) {
    const load = (src) => global.fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Audio asset could not be loaded: ${src}`);
        }
        return response.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes));
    const resolved = gridshardResolveAudioAsset(asset);
    if (resolved === asset) return load(asset);
    // Mobil türev eksik veya çözülemiyorsa kanonik WAV'a düşülür.
    return load(resolved).catch(() => load(asset));
  }

  const GRIDSHARD_BATTLE_LAYERS = Object.freeze([
    {id:"sub", asset:"./assets/audio/battle_tension_v7_01_sub.wav", baseGain:.41, pressureGain:.10},
    {id:"pulse", asset:"./assets/audio/battle_tension_v7_02_pulse.wav", baseGain:.35, pressureGain:.14},
    {id:"percussion", asset:"./assets/audio/battle_tension_v7_03_percussion.wav", baseGain:.31, pressureGain:.18},
    {id:"ostinato", asset:"./assets/audio/battle_tension_v7_04_ostinato.wav", baseGain:.28, pressureGain:.20},
    {id:"shards", asset:"./assets/audio/battle_tension_v7_05_shards.wav", baseGain:.18, pressureGain:.24},
    {id:"dissonance", asset:"./assets/audio/battle_tension_v7_06_dissonance.wav", baseGain:.15, pressureGain:.27},
    {id:"pressure", asset:"./assets/audio/battle_tension_v7_07_pressure.wav", baseGain:.07, pressureGain:.36},
  ]);

  // Savaşta iki tarafın her saldırısı ateş ve isabet efekti çalar; yığılan
  // efektler müziği bastırıyordu. Aynı efekt kısa aralıkla tekrar çalmaz ve
  // rutin efektler (ateş, isabet, akım) kısa bir pencerede sınırlanır.
  // Önemli olaylar sınıra takılmaz.
  const GRIDSHARD_SFX_VOICE_LIMIT = Object.freeze({
    retriggerMs:90,
    voiceWindowMs:320,
    maxRoutineVoices:3,
    priorityCues:Object.freeze([
      "core_hit", "kill_confirm", "module_lost", "warning",
      "shield_activate", "phoenix_revive", "core_rebirth", "emp",
    ]),
  });

  const GRIDSHARD_SFX_CUES = Object.freeze({
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
    core_hit:{
      asset:"./assets/audio/core_hit.wav",
      identity:"derin bass transient + elektrik çatlağı",
    },
    module_hit:{
      asset:"./assets/audio/energy_transfer.wav",
      identity:"kısa gövde darbesi + elektrik boşalması",
    },
    // Beta.72 — imza ipuçları. Yeni ses dosyası yoktur; her ad mevcut bir
    // varlığa bağlanır, böylece mobil ogg/m4a seçimi aynen çalışır.
    plasma_mortar_fire:{
      asset:"./assets/audio/missile_fire.wav",
      identity:"ağır plazma havan fırlatması",
    },
    quantum_repeater_fire:{
      asset:"./assets/audio/laser_fire.wav",
      identity:"kısa kuantum atımı",
    },
    ion_spear_fire:{
      asset:"./assets/audio/railgun_fire.wav",
      identity:"delici iyon mızrağı",
    },
    swarm_fabricator_fire:{
      asset:"./assets/audio/drone_fire.wav",
      identity:"sürü dronu salvosu",
    },
    quantum_cannon_fire:{
      asset:"./assets/audio/pulse_cannon_fire.wav",
      identity:"kuantum top boşalması",
    },
    quantum_charge:{
      asset:"./assets/audio/pulse_cannon_fire.wav",
      identity:"birikmiş kuantum yükünün çöküşü",
    },
    repeat_echo:{
      asset:"./assets/audio/laser_fire.wav",
      identity:"aynı hedefe kuantum yankısı",
    },
    swarm_release:{
      asset:"./assets/audio/drone_fire.wav",
      identity:"depolanan dronların toplu salınımı",
    },
    phoenix_revive:{
      asset:"./assets/audio/tier_up.wav",
      identity:"yükselen diriliş tonu",
    },
    prism_shield:{
      asset:"./assets/audio/shield_hit.wav",
      identity:"prizmanın hasarı enerjiye çevirmesi",
    },
    phase_evade:{
      asset:"./assets/audio/shield_hit.wav",
      identity:"faz penceresinde boşa çıkan vuruş",
    },
    singularity_field:{
      asset:"./assets/audio/emp.wav",
      identity:"tekillik alanının ikinci sisteme sıçraması",
    },
    sabotage_echo:{
      asset:"./assets/audio/virus_glitch.wav",
      identity:"kesinti yankısı",
    },
    omega_link:{
      asset:"./assets/audio/port_connect.wav",
      identity:"omega rezonans bağlantısı",
    },
    chrono_shift:{
      asset:"./assets/audio/port_connect.wav",
      identity:"kronos penceresinin açılması",
    },
    target_lock:{
      asset:"./assets/audio/port_connect.wav",
      identity:"hedefe kilitlenme",
    },
    nano_pulse:{
      asset:"./assets/audio/energy_transfer.wav",
      identity:"nano onarım darbesi",
    },
    kill_confirm:{
      asset:"./assets/audio/core_hit.wav",
      identity:"rakip modülün yok edilmesi",
    },
    module_lost:{
      asset:"./assets/audio/energy_transfer.wav",
      identity:"kendi modülünün düşmesi",
    },
    shield_activate:{
      asset:"./assets/audio/shield_hit.wav",
      identity:"çekirdek gücünün devreye girmesi",
    },
    warning:{
      asset:"./assets/audio/emp.wav",
      identity:"devre gerilimi uyarısı",
    },
    core_rebirth:{
      asset:"./assets/audio/tier_up.wav",
      identity:"Anka Çekirdeğinin küllerden doğuşu",
    },
    overdrive_chain:{
      asset:"./assets/audio/arc_cannon_fire.wav",
      identity:"Aşırı Yük zincirinin uzaması",
    },
  });

  class GridshardSeamlessLoopTrack {
    constructor(context, asset, bufferCache, output = context.destination) {
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
      this._gain.connect(output || context.destination);
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
          gridshardDecodeAudioAsset(this.context, this.src)
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

    _startSource(when = 0) {
      if (!this._buffer || this.paused) return;
      this._stopSource();
      const source = this.context.createBufferSource();
      source.buffer = this._buffer;
      source.loop = this.loop;
      source.loopStart = 0;
      source.loopEnd = this._buffer.duration;
      source.playbackRate.value = this._playbackRate;
      source.connect(this._gain);
      this._startedAt = Math.max(when, this.context.currentTime);
      source.start(when, this._offset % this._buffer.duration);
      this._source = source;
    }

    // Katman grubunun bütün stem'leri aynı bağlam zamanında başlar; bağlam
    // askıdaysa saat ilerlemediği için devam ettiğinde de birlikte başlarlar.
    startAt(buffer, when, offset = 0) {
      this.paused = false;
      this._playToken += 1;
      this._buffer = buffer;
      this._offset = offset % buffer.duration;
      this._startSource(when);
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
      this._battleLayerState = null;
      this.battlePressure = .32;
      this._fadeTimers = new Set();
      this._fadeTimerByAudio = new Map();
      this._musicContext = null;
      this._musicBufferCache = new Map();
      this._sfxGainNode = null;
      this._resultGainNode = null;
      this._musicOutputNode = null;
      this._activeBufferSources = new Set();
      this._resultBufferSource = null;
      this._resultBufferOutcome = null;
      this._resultPlaybackPromise = null;
      this._pendingResultOutcome = null;
      this._pendingPlayback = new Map();
      this._activeSfx = new Set();
      this._sfxLastTriggeredAt = new Map();
      this._routineSfxStarts = [];
      this._preloadedAudio = new Map();
      this._resultTrack = null;
      this._lastPlaybackError = null;
      this._unlockTarget = null;
      this._unlockHandler = null;
      this._gestureObserved = false;
    }

    _ensureAudioContext() {
      if (this._musicContext) return this._musicContext;
      const AudioContextClass =
        global.AudioContext
        || global.webkitAudioContext;
      if (typeof AudioContextClass !== "function") return null;
      try {
        this._musicContext = new AudioContextClass();
        this._sfxGainNode = this._musicContext.createGain();
        this._resultGainNode = this._musicContext.createGain();
        this._sfxGainNode.connect(this._createSfxCompressor(this._musicContext));
        this._resultGainNode.connect(this._musicContext.destination);
        this._musicOutputNode = this._createMusicLimiter(this._musicContext);
        this._syncWebAudioVolumes();
        this._musicContext.addEventListener?.(
          "statechange",
          ()=>this._publishPlaybackState()
        );
        this._publishPlaybackState();
      } catch (error) {
        this._musicContext = null;
        this._sfxGainNode = null;
        this._resultGainNode = null;
        this._musicOutputNode = null;
        this._lastPlaybackError = {
          name:String(error?.name || "AudioContextError"),
          message:String(error?.message || error || "Audio context could not be created."),
          src:"AudioContext",
          at:Date.now(),
        };
      }
      return this._musicContext;
    }

    // Katmanlı savaş müziğinin toplam tepesini -3 dBFS altında tutar; tarayıcı
    // desteklemiyorsa müzik doğrudan çıkışa bağlanır.
    _createMusicLimiter(context) {
      if (typeof context.createDynamicsCompressor !== "function") {
        return context.destination;
      }
      try {
        const limiter = context.createDynamicsCompressor();
        const settings = GRIDSHARD_AUDIO_MIX.musicLimiter;
        limiter.threshold.value = settings.threshold;
        limiter.knee.value = settings.knee;
        limiter.ratio.value = settings.ratio;
        limiter.attack.value = settings.attack;
        limiter.release.value = settings.release;
        limiter.connect(context.destination);
        return limiter;
      } catch (_) {
        return context.destination;
      }
    }

    // Üst üste binen efektlerin tepe seviyesini yumuşatır; tarayıcı
    // desteklemiyorsa efekt kanalı doğrudan çıkışa bağlanır.
    _createSfxCompressor(context) {
      if (typeof context.createDynamicsCompressor !== "function") {
        return context.destination;
      }
      try {
        const compressor = context.createDynamicsCompressor();
        const settings = GRIDSHARD_AUDIO_MIX.sfxCompressor;
        compressor.threshold.value = settings.threshold;
        compressor.knee.value = settings.knee;
        compressor.ratio.value = settings.ratio;
        compressor.attack.value = settings.attack;
        compressor.release.value = settings.release;
        compressor.connect(context.destination);
        return compressor;
      } catch (_) {
        return context.destination;
      }
    }

    // Efekt çalınacaksa true döner ve zamanını kaydeder.
    _admitSfxVoice(name) {
      const now = Date.now();
      const rules = GRIDSHARD_SFX_VOICE_LIMIT;
      const lastAt = this._sfxLastTriggeredAt.get(name) ?? -Infinity;
      if (now - lastAt < rules.retriggerMs) return false;
      if (!rules.priorityCues.includes(name)) {
        this._routineSfxStarts = this._routineSfxStarts.filter(
          (startedAt) => now - startedAt < rules.voiceWindowMs
        );
        if (this._routineSfxStarts.length >= rules.maxRoutineVoices) return false;
        this._routineSfxStarts.push(now);
      }
      this._sfxLastTriggeredAt.set(name, now);
      return true;
    }

    _publishPlaybackState() {
      const body=global.document?.body;
      if (!body?.dataset) return;
      body.dataset.audioContextState=
        this._musicContext?.state || "unavailable";
      body.dataset.audioResult=
        this._resultBufferOutcome || "none";
      body.dataset.audioActiveSources=
        String(this._activeBufferSources.size);
    }

    _createMusicTrack(asset, {seamless=false}={}) {
      const context = this._ensureAudioContext();
      if (
        seamless
        && context
        && typeof global.fetch === "function"
      ) {
        return new GridshardSeamlessLoopTrack(
          context,
          asset,
          this._musicBufferCache,
          this._musicOutputNode
        );
      }
      return this._createHtmlAudio(asset);
    }

    _createHtmlAudio(asset) {
      const resolved = gridshardResolveAudioAsset(asset);
      const audio = new global.Audio(resolved);
      audio._gridshardAsset = asset;
      if (resolved !== asset && typeof audio.addEventListener === "function") {
        // Mobil türev yüklenemezse aynı öğe kanonik WAV ile yeniden denenir.
        audio.addEventListener("error", () => {
          audio.src = asset;
          if (typeof audio.load === "function") {
            try { audio.load(); } catch (_) {}
          }
          if (audio._gridshardPlayRequested) this._safePlay(audio);
        }, {once:true});
      }
      return audio;
    }

    _canPlayAudio() {
      return (
        typeof global.Audio
        === "function"
      );
    }

    _syncWebAudioVolumes() {
      const context=this._musicContext;
      if (!context) return;
      const now=context.currentTime;
      const setGain=(node,value)=>{
        if (!node?.gain) return;
        const normalized=Math.max(0,Math.min(1,Number(value || 0)));
        if (typeof node.gain.setValueAtTime === "function") {
          node.gain.setValueAtTime(normalized,now);
        } else {
          node.gain.value=normalized;
        }
      };
      setGain(
        this._sfxGainNode,
        this.soundMuted || !this.sfxEnabled
          ? 0
          : this._sfxTargetVolume()
      );
      setGain(
        this._resultGainNode,
        this.musicMuted
          ? 0
          : this._musicTargetVolume()
      );
    }

    _loadAudioBuffer(asset) {
      const context=this._ensureAudioContext();
      if (!context || typeof global.fetch !== "function") {
        return Promise.reject(new Error("Web Audio is unavailable."));
      }
      if (!this._musicBufferCache.has(asset)) {
        this._musicBufferCache.set(
          asset,
          gridshardDecodeAudioAsset(context,asset)
        );
      }
      return this._musicBufferCache.get(asset);
    }

    _preloadAudioBuffers(assets=[]) {
      if (!this._ensureAudioContext()) return;
      for (const asset of new Set(assets.filter(Boolean))) {
        this._loadAudioBuffer(asset).catch((error)=>{
          this._lastPlaybackError = {
            name:String(error?.name || "AudioBufferError"),
            message:String(error?.message || error || "Audio buffer could not be loaded."),
            src:String(asset),
            at:Date.now(),
          };
        });
      }
    }

    async _resumeAudioContext() {
      const context=this._ensureAudioContext();
      if (!context) return false;
      if (
        context.state !== "running"
        && context.state !== "closed"
      ) {
        try {
          await context.resume();
        } catch (error) {
          this._lastPlaybackError = {
            name:String(error?.name || "AudioContextError"),
            message:String(error?.message || error || "Audio context could not resume."),
            src:"AudioContext",
            at:Date.now(),
          };
          return false;
        }
      }
      this._publishPlaybackState();
      return context.state === "running";
    }

    async _playAudioBuffer(asset,{channel="sfx",outcome=null}={}) {
      const context=this._ensureAudioContext();
      const destination=channel === "result"
        ? this._resultGainNode
        : this._sfxGainNode;
      if (!context || !destination) return false;
      try {
        const buffer=await this._loadAudioBuffer(asset);
        if (channel === "result" && this._resultBufferOutcome !== outcome) {
          return false;
        }
        if (!await this._resumeAudioContext()) return false;
        const source=context.createBufferSource();
        source.buffer=buffer;
        source.loop=false;
        source.connect(destination);
        this._activeBufferSources.add(source);
        if (channel === "result") {
          this._resultBufferSource=source;
          this._pendingResultOutcome=null;
        }
        this._publishPlaybackState();
        source.onended=()=>{
          this._activeBufferSources.delete(source);
          try { source.disconnect(); } catch (_) {}
          if (this._resultBufferSource === source) {
            this._resultBufferSource=null;
            this._resultPlaybackPromise=null;
          }
          this._publishPlaybackState();
        };
        source.start(0);
        this._lastPlaybackError=null;
        return true;
      } catch (error) {
        this._lastPlaybackError = {
          name:String(error?.name || "AudioBufferPlaybackError"),
          message:String(error?.message || error || "Audio buffer could not play."),
          src:String(asset),
          at:Date.now(),
        };
        return false;
      }
    }

    _preloadAudioAssets(assets=[]) {
      if (!this._canPlayAudio()) return;
      for (const asset of new Set(assets.filter(Boolean))) {
        if (this._preloadedAudio.has(asset)) continue;
        const audio=this._createHtmlAudio(asset);
        audio.preload="auto";
        this._preloadedAudio.set(asset,audio);
        if (typeof audio.load === "function") {
          try {
            audio.load();
          } catch (_) {
            // Preload desteği olmayan ortamlarda normal oynatma yolu kullanılır.
          }
        }
      }
    }

    _createPreloadedAudio(asset) {
      const template=this._preloadedAudio.get(asset);
      if (
        template
        && template.paused !== false
        && !this._activeSfx.has(template)
        && template!==this._resultTrack
      ) {
        try {
          template.currentTime=0;
        } catch (_) {
          // Metadata henüz hazır değilse play() başlangıç konumunu belirler.
        }
        return template;
      }
      if (template && typeof template.cloneNode === "function") {
        const clone=template.cloneNode(true);
        clone.preload="none";
        return clone;
      }
      const audio=this._createHtmlAudio(asset);
      audio.preload="none";
      return audio;
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

    _battleMusicTargetVolume() {
      return Math.max(
        0,
        Math.min(
          1,
          this._musicTargetVolume()
          * GRIDSHARD_AUDIO_MIX.battleMusicGain
        )
      );
    }

    _sfxTargetVolume() {
      // Savaş durumlarında efektler katmanlı müziğin arkasında kalır.
      const battleDuck = GRIDSHARD_BATTLE_STATE_LAYERS[this.state]
        ? GRIDSHARD_AUDIO_MIX.battleSfxGain
        : 1;
      return Math.max(
        0,
        Math.min(
          1,
          this.masterVolume
          * this.sfxVolume
          * GRIDSHARD_AUDIO_MIX.sfxBaseGain
          * battleDuck
        )
      );
    }

    _safePlay(audio) {
      if (!audio || typeof audio.play !== "function") {
        return Promise.resolve(false);
      }
      audio._gridshardPlayRequested=true;
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
      const contextReady=await this._resumeAudioContext();
      this._syncWebAudioVolumes();
      const candidates = new Set([
        ...this._pendingPlayback.keys(),
        ...[
          this.currentTrack,
          this._resultTrack,
          this.criticalLayerTrack,
          ...this.battleLayerTracks,
        ].filter((audio) => audio && audio.paused !== false),
      ]);
      const results = await Promise.all(
        [...candidates].map((audio) => this._safePlay(audio))
      );
      if (
        contextReady
        && this._pendingResultOutcome
        && this.state === this._pendingResultOutcome
      ) {
        this.playResultSting(this._pendingResultOutcome,{restart:true});
      }
      return {
        ok:contextReady || results.every(Boolean),
        attempted:results.length,
        pending:this._pendingPlayback.size,
        state:this.state,
      };
    }

    prepareBattlePlayback() {
      this._gestureObserved=true;
      const context=this._ensureAudioContext();
      const resumePromise=this._resumeAudioContext();
      this._syncWebAudioVolumes();
      return {
        ok:Boolean(context),
        contextState:context?.state || "unavailable",
        ready:resumePromise,
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
        this._ensureAudioContext();
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
        contextState:this._musicContext?.state || "unavailable",
        decodedAssets:[...this._musicBufferCache.keys()].length,
        activeSfx:this._activeBufferSources.size,
        currentAsset:String(
          (
            this._resultBufferOutcome
              ? GRIDSHARD_MUSIC_ASSETS[this._resultBufferOutcome]
              : ""
          )
          || this._resultTrack?.src
          || this.currentTrack?.src
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
      audio._gridshardPlayRequested=false;
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
        this._battleLayerState = GRIDSHARD_AUDIO_STATES.CRITICAL_CORE;
        this.criticalLayerTrack = this._battleLayerTrack("pressure");
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
        this._createHtmlAudio(
          GRIDSHARD_CRITICAL_LAYER
        );
      layer.loop=true;
      layer.volume=0;
      this.criticalLayerTrack=layer;
      this._safePlay(layer);

      this._fade(
        layer,
        0,
        this._battleMusicTargetVolume()
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

    _battleLayerSet() {
      const memory = Number(global.navigator?.deviceMemory);
      if (Number.isFinite(memory) && memory > 0 && memory <= 2) {
        return GRIDSHARD_BATTLE_LAYERS.filter(
          layer => GRIDSHARD_LOW_MEMORY_BATTLE_LAYERS.includes(layer.id)
        );
      }
      return [...GRIDSHARD_BATTLE_LAYERS];
    }

    _battleLayerTrack(id) {
      return this.battleLayerTracks.find(
        track => track._gridshardLayer?.id === id
      ) || null;
    }

    _applyBattleLayerMix(pressure=this.battlePressure, {fade=false}={}) {
      const normalized = Math.max(0, Math.min(1, Number(pressure)));
      this.battlePressure = normalized;
      const activeIds =
        GRIDSHARD_BATTLE_STATE_LAYERS[this._battleLayerState]
        || GRIDSHARD_BATTLE_STATE_LAYERS[GRIDSHARD_AUDIO_STATES.BATTLE];
      for (const track of this.battleLayerTracks) {
        const layer = track?._gridshardLayer;
        if (!layer) continue;
        const target = activeIds.includes(layer.id)
          ? Math.min(
              1,
              this._battleMusicTargetVolume()
                * (layer.baseGain + layer.pressureGain * normalized)
            )
          : 0;
        if (fade) {
          this._fade(track, Number(track.volume || 0), target, 420);
        } else {
          // Süren bir geçiş, yeni baskı değerini bitişinde ezmemeli.
          this._cancelFade(track);
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
      this._battleLayerState = null;
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

    _createBattleLayerTracks() {
      const context = this._ensureAudioContext();
      const webAudio = Boolean(context) && typeof global.fetch === "function";
      return this._battleLayerSet().map(layer => {
        const track = webAudio
          ? new GridshardSeamlessLoopTrack(context, layer.asset, this._musicBufferCache, this._musicOutputNode)
          : this._createHtmlAudio(layer.asset);
        track._gridshardLayer = layer;
        track._gridshardAsset = layer.asset;
        track.loop = true;
        track.volume = 0;
        return track;
      });
    }

    _startBattleLayerTracks(tracks) {
      if (!tracks.length) return;
      if (!(tracks[0] instanceof GridshardSeamlessLoopTrack)) {
        // Web Audio yoksa HTML öğeleri ayrı başlar; senkron garanti edilmez.
        for (const track of tracks) this._safePlay(track);
        return;
      }
      // Stem'ler tek tek oynatılırsa çözümleme süreleri faz kayması yaratır.
      // Hepsi çözülene kadar beklenir ve aynı bağlam zamanında başlatılır.
      // paused=false, unlock() yolunun stem'leri tek tek başlatmasını önler.
      for (const track of tracks) track.paused = false;
      const context = tracks[0].context;
      Promise.all(tracks.map(track => track._loadBuffer()))
        .then((buffers) => {
          if (this.battleLayerTracks !== tracks) return;
          const when = context.currentTime + .05;
          tracks.forEach((track, index) => track.startAt(buffers[index], when, 0));
          this._lastPlaybackError = null;
        })
        .catch((error) => {
          this._lastPlaybackError = {
            name:String(error?.name || "AudioBufferError"),
            message:String(error?.message || error || "Battle layers could not be loaded."),
            src:"battle_layers",
            at:Date.now(),
          };
        });
      this._resumeAudioContext();
    }

    _transitionToBattleLayers(state) {
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume <= 0
        || !this._canPlayAudio()
      ) return;

      const pressure = this._battlePressureForState(state);
      if (this.battleLayerTracks.length) {
        this._battleLayerState = state;
        this.currentTrack = this.battleLayerTracks[0];
        this.criticalLayerTrack =
          state === GRIDSHARD_AUDIO_STATES.CRITICAL_CORE
            ? this._battleLayerTrack("pressure")
            : null;
        this._applyBattleLayerMix(pressure, {fade:true});
        return;
      }

      const previous = this.currentTrack;
      this._stopCriticalLayer({fade:false});
      this._stopBattleLayers({fade:false});
      const tracks = this._createBattleLayerTracks();
      this.battleLayerTracks = tracks;
      this._battleLayerState = state;
      this.currentTrack = tracks[0] || null;
      this.criticalLayerTrack =
        state === GRIDSHARD_AUDIO_STATES.CRITICAL_CORE
          ? this._battleLayerTrack("pressure")
          : null;
      this._applyBattleLayerMix(pressure, {fade:true});
      this._startBattleLayerTracks(tracks);

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

      if (
        this._isLayeredBattleState(state)
        && !GRIDSHARD_BATTLE_MUSIC_ENABLED
      ) {
        this._stopAllMusic();
        return;
      }

      this._stopResultTrack();
      this._stopResultBuffer();

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

      const terminalState=[
        GRIDSHARD_AUDIO_STATES.VICTORY,
        GRIDSHARD_AUDIO_STATES.DEFEAT,
      ].includes(state);
      next.volume=terminalState
        ? this._musicTargetVolume()
        : 0;
      this.currentTrack=next;
      this._safePlay(next);

      if (!terminalState) {
        this._fade(
          next,
          0,
          this._musicTargetVolume(),
          transitionMs
        );
      }

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

    ensureResultPlayback(outcome) {
      if (
        ![
          GRIDSHARD_AUDIO_STATES.VICTORY,
          GRIDSHARD_AUDIO_STATES.DEFEAT,
        ].includes(outcome)
      ) {
        return Promise.resolve(false);
      }
      if (
        !this.enabled
        || this.musicMuted
        || this.musicVolume<=0
      ) {
        return Promise.resolve(false);
      }
      if (
        this._resultBufferOutcome===outcome
        && this._resultBufferSource
      ) {
        return Promise.resolve(true);
      }
      if (
        this._resultBufferOutcome===outcome
        && this._resultPlaybackPromise
      ) {
        return this._resultPlaybackPromise;
      }
      return this.playResultSting(outcome,{restart:false});
    }

    _stopResultTrack() {
      const track=this._resultTrack;
      this._resultTrack=null;
      if (this.currentTrack===track) this.currentTrack=null;
      if (track) this._stopAudio(track);
    }

    _stopResultBuffer() {
      const source=this._resultBufferSource;
      this._resultBufferSource=null;
      this._resultBufferOutcome=null;
      this._resultPlaybackPromise=null;
      this._pendingResultOutcome=null;
      if (!source) {
        this._publishPlaybackState();
        return;
      }
      this._activeBufferSources.delete(source);
      try {
        source.onended=null;
        source.stop();
        source.disconnect();
      } catch (_) {
        // AudioBufferSourceNode may already have completed.
      }
      this._publishPlaybackState();
    }

    _playHtmlResultSting(outcome) {
      if (!this._canPlayAudio()) return Promise.resolve(false);
      this._stopResultTrack();
      const asset=GRIDSHARD_MUSIC_ASSETS[outcome];
      const track=this._createPreloadedAudio(asset);
      track._gridshardState=outcome;
      track._gridshardAsset=asset;
      track.loop=false;
      track.volume=this._musicTargetVolume();
      this._resultTrack=track;
      this.currentTrack=track;
      this._pendingResultOutcome=null;
      if (typeof track.addEventListener === "function") {
        track.addEventListener("ended",()=>{
          if (this._resultTrack===track) this._resultTrack=null;
          if (this.currentTrack===track) this.currentTrack=null;
        },{once:true});
      }
      return this._safePlay(track);
    }

    playResultSting(outcome,{restart=true}={}) {
      if (
        ![
          GRIDSHARD_AUDIO_STATES.VICTORY,
          GRIDSHARD_AUDIO_STATES.DEFEAT,
        ].includes(outcome)
        || !this.enabled
        || this.musicMuted
        || this.musicVolume<=0
      ) {
        return Promise.resolve(false);
      }

      if (
        !restart
        && this._resultBufferOutcome===outcome
      ) {
        if (this._resultBufferSource) return Promise.resolve(true);
        if (this._resultPlaybackPromise) return this._resultPlaybackPromise;
      }
      if (
        !restart
        && this._resultTrack?._gridshardState===outcome
      ) {
        this._resultTrack.volume=this._musicTargetVolume();
        return this._safePlay(this._resultTrack);
      }

      this._stopAllMusic();
      const asset=GRIDSHARD_MUSIC_ASSETS[outcome];
      if (this._ensureAudioContext()) {
        this._resultBufferOutcome=outcome;
        this._pendingResultOutcome=outcome;
        this._publishPlaybackState();
        const playback=this._playAudioBuffer(
          asset,
          {channel:"result",outcome}
        ).then((played)=>{
          if (played) return true;
          if (
            this.state!==outcome
            || this._resultBufferOutcome!==outcome
          ) {
            return false;
          }
          return this._playHtmlResultSting(outcome);
        });
        this._resultPlaybackPromise=playback;
        return playback;
      }
      this._resultBufferOutcome=outcome;
      this._publishPlaybackState();
      return this._playHtmlResultSting(outcome);
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
      this._stopResultTrack();
      this._stopResultBuffer();
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
      // Savaşa girişte/çıkışta efekt kanalının kısma çarpanı güncellenir.
      if (changed) this._syncWebAudioVolumes();

      if (
        [
          GRIDSHARD_AUDIO_STATES.VICTORY,
          GRIDSHARD_AUDIO_STATES.DEFEAT,
        ].includes(state)
      ) {
        this.playResultSting(state,{restart:changed});
        return {
          ok:true,
          state,
          asset:GRIDSHARD_MUSIC_ASSETS[state],
          criticalLayer:null,
          direction:GRIDSHARD_AUDIO_DIRECTION[state],
          mix:GRIDSHARD_AUDIO_MIX,
        };
      }

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

    _playHtmlCue(cue) {
      if (!cue || !this._canPlayAudio()) return Promise.resolve(false);
      const audio=this._createPreloadedAudio(cue.asset);
      audio.volume=this._sfxTargetVolume();
      this._activeSfx.add(audio);
      const release=()=>{
        this._activeSfx.delete(audio);
        if (typeof audio.removeEventListener === "function") {
          audio.removeEventListener("ended",release);
          audio.removeEventListener("error",release);
        }
      };
      if (typeof audio.addEventListener === "function") {
        audio.addEventListener("ended",release);
        audio.addEventListener("error",release);
      }
      return this._safePlay(audio).then((played)=>{
        if (!played && !this._pendingPlayback.has(audio)) release();
        return played;
      });
    }

    _stopActiveSfx() {
      for (const source of [...this._activeBufferSources]) {
        if (source === this._resultBufferSource) continue;
        this._activeBufferSources.delete(source);
        try {
          source.onended=null;
          source.stop();
          source.disconnect();
        } catch (_) {
          // The short-lived source may already have completed.
        }
      }
      for (const audio of [...this._activeSfx]) {
        this._activeSfx.delete(audio);
        this._stopAudio(audio);
      }
      this._publishPlaybackState();
    }

    triggerCue(name) {
      const cue=GRIDSHARD_SFX_CUES[name];

      if (!cue) {
        return {
          ok:false,
          reason:"Bilinmeyen GRIDSHARD ses efekti.",
        };
      }

      const audible=
        this.enabled
        && this.sfxEnabled
        && !this.soundMuted
        && this.sfxVolume>0;
      const played=audible && this._admitSfxVoice(name);
      if (played) {
        if (this._ensureAudioContext()) {
          this._playAudioBuffer(cue.asset,{channel:"sfx"})
            .then((played)=>{
              if (!played) this._playHtmlCue(cue);
            });
        } else {
          this._playHtmlCue(cue);
        }
      }

      return {
        ok:true,
        name,
        played,
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
          this._battleMusicTargetVolume()
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
      this._syncWebAudioVolumes();

      if (
        this.soundMuted
        || this.sfxVolume<=0
      ) {
        this._stopActiveSfx();
      }

      if (
        this.musicMuted
        || this.musicVolume<=0
      ) {
        this._stopAllMusic();
      } else if (
        [
          GRIDSHARD_AUDIO_STATES.VICTORY,
          GRIDSHARD_AUDIO_STATES.DEFEAT,
        ].includes(this.state)
      ) {
        this.playResultSting(this.state,{restart:true});
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
              this._battleMusicTargetVolume()
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
            this._battleMusicTargetVolume()
            * GRIDSHARD_AUDIO_MIX
              .criticalLayerGain;
      }

      return this.masterVolume;
    }
  }

  global.GRIDSHARD_SFX_VOICE_LIMIT=
    GRIDSHARD_SFX_VOICE_LIMIT;
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
  global.GRIDSHARD_BATTLE_STATE_LAYERS=
    GRIDSHARD_BATTLE_STATE_LAYERS;
  global.GRIDSHARD_BATTLE_MUSIC_ENABLED=
    GRIDSHARD_BATTLE_MUSIC_ENABLED;
  global.gridshardResolveAudioAsset=
    gridshardResolveAudioAsset;
  global.GRIDSHARD_SFX_CUES=
    GRIDSHARD_SFX_CUES;
  global.GridshardAudioDirector=
    GridshardAudioDirector;
})(
  typeof window!=="undefined"
    ? window
    : globalThis
);
