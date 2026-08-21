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
    "/local-ai/",
    "/pvp/",
  ];
  const API_PREFIXES = [
    "/auth/",
    ...PROTECTED_PREFIXES,
    "/health",
    "/game/",
    "/telemetry/",
    "/web-test/",
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
  const PLAYER_ID_KEY = "project-relay.web-test.participant-id";

  class GridshardAuthSession {
    constructor({ fetchImpl = null, storage = null } = {}) {
      this.fetchImpl = fetchImpl || globalThis.fetch.bind(globalThis);
      this.storage = storage || globalThis.localStorage || null;
      this.accessToken = null;
      this.expiresAt = 0;
      this.playerId = null;
      this.pendingLogin = null;
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

    async _openSession(playerId) {
      const response = await this.fetchImpl(this._apiInput("/auth/session"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          device_secret: this._deviceSecret(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Oyuncu kimliği doğrulanamadı: ${response.status}`);
      }
      const payload = await response.json();
      if (payload.player_id !== playerId || !payload.access_token) {
        throw new Error("Kimlik sunucusu geçersiz yanıt döndürdü.");
      }
      this.playerId = playerId;
      this.accessToken = payload.access_token;
      this.expiresAt = Number(payload.expires_at || 0);
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
      if (!playerId && ["participants", "player-data", "settings", "statistics", "profile"].includes(segments[0])) {
        playerId = segments[1] || null;
      }
      if (!playerId && segments[0] === "matchmaking" && segments[1] !== "join") {
        playerId = segments[1] || null;
      }
      if (!playerId && ["progression", "post-match"].includes(segments[0])) {
        playerId = segments.at(-1) || null;
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

    _deviceSecret() {
      try {
        const existing = this.storage?.getItem(DEVICE_SECRET_KEY);
        if (existing && existing.length >= 32) {
          return existing;
        }
      } catch (_error) {
        // Bellekte üretilen sırla devam edilir.
      }

      let secret;
      if (globalThis.crypto?.getRandomValues) {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        secret = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      } else {
        secret = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-gridshard`;
      }
      try {
        this.storage?.setItem(DEVICE_SECRET_KEY, secret);
      } catch (_error) {
        // Gizli değer yalnızca bu sayfa ömründe kullanılabilir.
      }
      return secret;
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
