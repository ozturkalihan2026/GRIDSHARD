(() => {
  "use strict";

  const PROTECTED_PREFIXES = [
    "/participants/",
    "/player-data/",
    "/matchmaking",
    "/settings/",
    "/progression/",
    "/post-match/",
    "/statistics/",
    "/profile/",
    "/public-profiles/",
    "/teams",
    "/social/",
    "/accounts/",
    "/notifications/",
    "/players/",
    "/events",
    "/local-ai/",
    "/pvp/",
    "/store/",
    "/analytics/",
    "/telemetry/",
  ];
  const API_PREFIXES = [
    "/auth/",
    "/account-recovery/",
    ...PROTECTED_PREFIXES,
    "/health",
    "/leaderboards",
    "/game/",
  ];
  const API_BASE_URL = (() => {
    const configured = String(globalThis.GRIDSHARD_API_BASE_URL || "").trim();
    if (!configured) return "";
    try {
      const url = new URL(configured);
      if (!['http:', 'https:'].includes(url.protocol)) return "";
      return url.href.replace(/\/$/, "");
    } catch (_error) {
      return "";
    }
  })();
  const DEVICE_SECRET_KEY = "gridshard.auth.device-secret";
  const RECOVERY_SECRET_KEY = "gridshard.auth.recovery-candidate";
  const DEVICE_ID_KEY = "gridshard.auth.device-id";
  const PLAYER_ID_KEY = "project-relay.web-test.participant-id";

  class GridshardAuthSession {
    constructor({ fetchImpl = null, storage = null } = {}) {
      this.fetchImpl = fetchImpl || globalThis.fetch.bind(globalThis);
      this.storage = storage || globalThis.localStorage || null;
      this.accessToken = null;
      this.expiresAt = 0;
      this.playerId = null;
      this.pendingLogin = null;
      this.requiresReauthentication = false;
      this.secretStore = new globalThis.GridshardDeviceSecretStore({storage:this.storage});
      this.secretPromise = null;
    }

    isProtected(input) {
      const url = this._url(input);
      return this._isApiOrigin(url)
        && PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    }

    async authorizedFetch(input, init = {}) {
      const requestInput = this._apiInput(input);
      if (!this.isProtected(requestInput)) {
        return this.fetchImpl(requestInput, init);
      }

      const playerId = this._inferPlayerId(requestInput, init) || this._storedPlayerId();
      if (!playerId) {
        throw new Error("Güvenli istek için oyuncu kimliği bulunamadı.");
      }

      await this.ensureAuthenticated(playerId);
      let response = await this.fetchImpl(
        requestInput,
        this._withAuthorization(init, this.accessToken)
      );
      if (response.status === 401) {
        this.accessToken = null;
        this.expiresAt = 0;
        await this.ensureAuthenticated(playerId, { force: true });
        response = await this.fetchImpl(
          requestInput,
          this._withAuthorization(init, this.accessToken)
        );
      }
      return response;
    }

    async ensureAuthenticated(playerId, { force = false } = {}) {
      if (
        !force
        && this.accessToken
        && this.playerId === playerId
        && this.expiresAt > Math.floor(Date.now() / 1000) + 30
      ) {
        return this.accessToken;
      }
      if (this.pendingLogin && this.playerId === playerId && !force) {
        return this.pendingLogin;
      }

      this.playerId = playerId;
      this.pendingLogin = this._openSession(playerId).finally(() => {
        this.pendingLogin = null;
      });
      return this.pendingLogin;
    }

    accessTokenFor(playerId) {
      if (
        this.playerId === playerId
        && this.accessToken
        && this.expiresAt > Math.floor(Date.now() / 1000) + 30
      ) {
        return this.accessToken;
      }
      return null;
    }

    deviceId() {
      return this._deviceId();
    }

    markSignedOut() {
      this.accessToken = null;
      this.expiresAt = 0;
      this.requiresReauthentication = true;
      // Preserve the remembered player ID and device secret until a real provider proof succeeds.
    }

    async replaceDeviceSecret(secret) {
      const value = String(secret || "");
      if (value.length < 32) {
        throw new Error("Yeni cihaz sırrı en az 32 karakter olmalıdır.");
      }
      await this.secretStore.write(DEVICE_SECRET_KEY, value);
      this.secretPromise = Promise.resolve(value);
      this.accessToken = null;
      this.expiresAt = 0;
      return value;
    }

    async stageRecoverySecret(playerId, secret) {
      if (!playerId || String(secret || "").length < 32) throw new Error("Geçersiz kurtarma cihaz kaydı.");
      // Must succeed BEFORE the server consumes the code/rotates the verifier.
      await this.secretStore.write(RECOVERY_SECRET_KEY, JSON.stringify({playerId, secret}));
    }

    async finishRecoverySecret(secret) {
      await this.replaceDeviceSecret(secret);
      // A failed cleanup is harmless: the primary secret was verified first.
      try { await this.secretStore.remove(RECOVERY_SECRET_KEY); } catch (_error) {}
    }

    async completeProviderLogin(exchange, {codeVerifier = ""} = {}) {
      const response = await this.fetchImpl(
        this._apiInput("/auth/provider-session"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            exchange,
            ...(codeVerifier ? {code_verifier:codeVerifier} : {}),
            device_secret: await this._deviceSecret(),
            device_id: this._deviceId(),
            device_name: this._deviceName(),
            platform: this._platform(),
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Sağlayıcı oturumu açılamadı: ${response.status}`);
      }
      const payload = await response.json();
      if (!payload.player_id || !payload.access_token) {
        throw new Error("Sağlayıcı kimlik sunucusu geçersiz yanıt döndürdü.");
      }
      this.storage?.setItem(PLAYER_ID_KEY, payload.player_id);
      this.playerId = payload.player_id;
      this.accessToken = payload.access_token;
      this.expiresAt = Number(payload.expires_at || 0);
      this.requiresReauthentication = false;
      return payload;
    }

    async _openSession(playerId) {
      const open = (deviceSecret) => this.fetchImpl(this._apiInput("/auth/session"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          device_secret: deviceSecret,
          device_id: this._deviceId(),
          device_name: this._deviceName(),
          platform: this._platform(),
        }),
      });
      let response = await open(await this._deviceSecret());
      let recoveredSecret = null;
      if (response.status === 401) {
        const staged = await this.secretStore.read(RECOVERY_SECRET_KEY);
        if (staged) {
          const candidate = JSON.parse(staged);
          if (candidate.playerId === playerId && typeof candidate.secret === "string" && candidate.secret.length >= 32) {
            response = await open(candidate.secret);
            if (response.ok) recoveredSecret = candidate.secret;
          }
        }
      }
      if (!response.ok) {
        if (response.status === 401) this.markSignedOut();
        const error = new Error(`Oyuncu kimliği doğrulanamadı: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      if (payload.player_id !== playerId || !payload.access_token) {
        throw new Error("Kimlik sunucusu geçersiz yanıt döndürdü.");
      }
      if (recoveredSecret) await this.finishRecoverySecret(recoveredSecret);
      this.playerId = playerId;
      this.accessToken = payload.access_token;
      this.expiresAt = Number(payload.expires_at || 0);
      this.requiresReauthentication = false;
      return this.accessToken;
    }

    _withAuthorization(init, token) {
      const headers = new Headers(init.headers || {});
      headers.set("authorization", `Bearer ${token}`);
      return { ...init, headers };
    }

    _inferPlayerId(input, init) {
      const url = this._url(input);
      const segments = url.pathname.split("/").filter(Boolean);
      let playerId = url.searchParams.get("player_id");
      if (!playerId && ["participants", "player-data", "settings", "statistics", "profile", "accounts", "notifications", "social", "store"].includes(segments[0])) {
        playerId = segments[1] || null;
      }
      if (!playerId && segments[0] === "matchmaking" && segments[1] !== "join") {
        playerId = segments[1] || null;
      }
      if (!playerId && ["progression", "post-match"].includes(segments[0])) {
        playerId = segments.at(-1) || null;
      }
      if (!playerId && segments[0] === "teams" && segments[1] === "player") {
        playerId = segments[2] || null;
      }
      if (!playerId && typeof init.body === "string") {
        try {
          const body = JSON.parse(init.body);
          playerId = typeof body.player_id === "string" ? body.player_id : null;
        } catch (_error) {
          playerId = null;
        }
      }
      return playerId;
    }

    _storedPlayerId() {
      try {
        return this.storage?.getItem(PLAYER_ID_KEY) || null;
      } catch (_error) {
        return null;
      }
    }

    async _deviceSecret() {
      if (!this.secretPromise) {
        this.secretPromise = (async () => {
          const existing = await this.secretStore.existing(DEVICE_SECRET_KEY);
          if (existing && existing.length >= 32) return existing;
          if (!globalThis.crypto?.getRandomValues) throw new Error("Güvenli cihaz sırrı üretilemiyor.");
          const bytes = new Uint8Array(32);
          globalThis.crypto.getRandomValues(bytes);
          const secret = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
          await this.secretStore.write(DEVICE_SECRET_KEY, secret);
          return secret;
        })().catch((error) => { this.secretPromise = null; throw error; });
      }
      return this.secretPromise;
    }

    _deviceId() {
      try {
        const existing = this.storage?.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
      } catch (_error) {
        // Geçici kimlikle devam edilir.
      }
      const value = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      try {
        this.storage?.setItem(DEVICE_ID_KEY, value);
      } catch (_error) {
        // Geçici kimlikle devam edilir.
      }
      return value;
    }

    _platform() {
      if (globalThis.Capacitor?.getPlatform) return globalThis.Capacitor.getPlatform();
      return "web";
    }

    _deviceName() {
      const platform = this._platform();
      // WebView's Chrome/Safari user agent describes the engine, not a browser
      // session. Keep the existing device ID so a native update renames it.
      if (platform === "android" || platform === "ios") {
        return `${platform.toUpperCase()} · GRIDSHARD`;
      }
      const userAgent = String(globalThis.navigator?.userAgent || "");
      const browser = /Edg\//.test(userAgent)
        ? "Edge"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Tarayıcı";
      return `${platform.toUpperCase()} · ${browser}`;
    }

    _url(input) {
      const raw = typeof input === "string" ? input : input.url;
      return new URL(raw, globalThis.location?.href || "http://localhost/");
    }

    _apiInput(input) {
      if (!API_BASE_URL) return input;
      const raw = typeof input === "string" ? input : input.url;
      if (!API_PREFIXES.some((prefix) => raw === prefix || raw.startsWith(prefix))) {
        return input;
      }
      const resolved = `${API_BASE_URL}${raw}`;
      if (typeof input === "string") return resolved;
      return new Request(resolved, input);
    }

    _isApiOrigin(url) {
      if (API_BASE_URL) return url.origin === new URL(API_BASE_URL).origin;
      if (!globalThis.location?.origin) return true;
      return url.origin === globalThis.location.origin;
    }
  }

  const authSession = new GridshardAuthSession();
  const originalFetch = authSession.fetchImpl;
  globalThis.fetch = authSession.authorizedFetch.bind(authSession);
  globalThis.GridshardAuth = Object.freeze({
    session: authSession,
    originalFetch,
    GridshardAuthSession,
    apiBaseUrl: API_BASE_URL,
  });
})();
