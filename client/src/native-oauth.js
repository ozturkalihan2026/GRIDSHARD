(function (global) {
  "use strict";
  const PENDING_KEY = "gridshard.auth.native-oauth";
  const TARGETS = new Map([
    ["com.gridshardgame.app", "android"],
    ["com.gridshard.remotedebug", "android-test"],
  ]);
  const AUTH_PATHS = {google:"/o/oauth2/v2/auth", apple:"/auth/authorize"};
  const AUTH_HOSTS = {google:"accounts.google.com", apple:"appleid.apple.com"};
  const token = value => typeof value === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(value);

  class NativeOAuth {
    constructor({capacitor = global.Capacitor, auth = global.GridshardAuth?.session,
      apiBaseUrl = global.GridshardAuth?.apiBaseUrl, request, storage, now = () => Date.now()} = {}) {
      this.platform = capacitor?.getPlatform?.() || "web";
      this.native = ["android", "ios"].includes(this.platform);
      this.auth = auth;
      this.request = request;
      this.apiBaseUrl = apiBaseUrl;
      // Web proof is tab-scoped, never a persistent localStorage credential.
      let tabStorage = null;
      try { if (!this.native) tabStorage = global.sessionStorage; } catch (_) { /* Sign-in fails closed; guest startup remains available. */ }
      this.store = this.native ? new global.GridshardDeviceSecretStore({capacitor, storage}) : {
        read:async key=>tabStorage?.getItem(key) || null,
        write:async (key,value)=>{
          if (!tabStorage) throw new Error("Giriş denemesi güvenli kaydedilemedi.");
          tabStorage.setItem(key,value);
          if (tabStorage.getItem(key) !== value) throw new Error("Giriş denemesi güvenli kaydedilemedi.");
        },
        remove:async key=>tabStorage?.removeItem(key),
      };
      this.app = this.native ? capacitor?.Plugins?.App || capacitor?.registerPlugin?.("App") : null;
      this.browser = this.native ? capacitor?.Plugins?.Browser || capacitor?.registerPlugin?.("Browser") : null;
      this.now = now;
      this.starting = false;
      this.consuming = null;
      this.completed = new Set();
    }

    origin() {
      const url = new URL(this.native ? this.apiBaseUrl || "" : global.location?.origin || "");
      const localWeb = !this.native && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((!localWeb && url.protocol !== "https:") || url.username || url.password || url.search || url.hash
        || (this.native && url.port) || !["", "/"].includes(url.pathname)) throw new Error("Native giriş için HTTPS oyun adresi gerekli.");
      return url.origin;
    }

    async begin(playerId, provider, mode = "link") {
      if (!["google", "apple"].includes(provider) || !["link", "login"].includes(mode)) {
        throw new Error("Geçersiz native giriş isteği.");
      }
      if (this.starting || this.consuming) throw new Error("Hesap bağlantısı zaten başlatılıyor.");
      this.starting = true;
      try {
        // iOS universal-link entitlements and real-device gate are separate.
        if (this.native && (this.platform !== "android" || !this.app?.getInfo || !this.browser?.open)) {
          throw new Error("Bu uygulamanın native giriş köprüsü henüz hazır değil.");
        }
        const target = this.native ? TARGETS.get((await this.app.getInfo()).id) : "web";
        if (!target) throw new Error("Bu uygulama kimliği HTTPS hesap girişi için kayıtlı değil.");
        const origin = this.origin();
        if (!global.crypto?.getRandomValues || !global.crypto?.subtle) throw new Error("Güvenli giriş anahtarı üretilemedi.");
        const bytes = global.crypto.getRandomValues(new Uint8Array(32));
        const verifier = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        const digest = new Uint8Array(await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
        const challenge = global.btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const params = new URLSearchParams({mode, code_challenge:challenge});
        if (this.native) params.set("native_target",target);
        const result = await this.request(`/accounts/${encodeURIComponent(playerId)}/oauth/${provider}/start?${params}`, {cache:"no-store"}, 12000);
        if (!result.configured || !result.authorization_url) return {configured:false};
        const authorization = new URL(result.authorization_url);
        if (authorization.protocol !== "https:" || authorization.hostname !== AUTH_HOSTS[provider]
          || authorization.pathname !== AUTH_PATHS[provider] || authorization.username || authorization.password
          || authorization.port || authorization.hash || !authorization.searchParams.get("state") || !token(result.handoff)) {
          throw new Error("Sağlayıcı giriş adresi doğrulanamadı.");
        }
        // Persist and read back BEFORE leaving the app; survive process death.
        await this.store.write(PENDING_KEY, JSON.stringify({provider, target, origin, verifier,
          handoff:result.handoff, expiresAt:this.now() + 10 * 60 * 1000}));
        if (this.native) await this.browser.open({url:authorization.href, toolbarColor:"#07142B"});
        else global.location.assign(authorization.href);
        return {configured:true};
      } finally { this.starting = false; }
    }

    consume(rawUrl) {
      let url;
      try { url = new URL(rawUrl); } catch (_) { return Promise.resolve({handled:false}); }
      if (this.native ? !/^\/native-auth\/(android|android-test)$/.test(url.pathname)
        : url.pathname !== "/" || !url.searchParams.has("oauth_status")) return Promise.resolve({handled:false});
      if (this.consuming) return this.consuming.then(result => ({...result, duplicate:true}));
      this.consuming = this._consume(url).finally(() => { this.consuming = null; });
      return this.consuming;
    }

    async _consume(url) {
      // URL dispatch is untrusted. A matching pending device attempt is mandatory.
      if (url.origin !== this.origin() || url.username || url.password || url.hash) {
        throw new Error("Hesap dönüş bağlantısı doğrulanamadı.");
      }
      for (const key of ["oauth_provider", "oauth_status", "oauth_handoff", "oauth_exchange"]) {
        if (url.searchParams.getAll(key).length > 1) throw new Error("Hesap dönüş bağlantısı doğrulanamadı.");
      }
      const handoff = url.searchParams.get("oauth_handoff");
      if (this.completed.has(handoff)) return {handled:true, duplicate:true};
      const stored = await this.store.read(PENDING_KEY);
      let pending;
      try { pending = JSON.parse(stored || "null"); } catch (_) {}
      if (!pending || pending.expiresAt <= this.now() || !token(handoff) || handoff !== pending.handoff
        || url.origin !== pending.origin || url.pathname !== (pending.target === "web" ? "/" : `/native-auth/${pending.target}`)
        || url.searchParams.get("oauth_provider") !== pending.provider) {
        throw new Error("Bu giriş denemesi bu cihazda başlatılmadı veya süresi doldu.");
      }
      const status = url.searchParams.get("oauth_status");
      if (["cancelled", "error"].includes(status)) {
        await this.store.remove(PENDING_KEY);
        this.completed.add(handoff);
        await this.closeBrowser();
        return {handled:true, status};
      }
      const exchange = url.searchParams.get("oauth_exchange");
      if (status !== "linked" || !token(exchange)) throw new Error("Hesap dönüş bağlantısı doğrulanamadı.");
      // Only the server chooses the player; no player ID or bearer token in links.
      await this.auth.completeProviderLogin(exchange, {codeVerifier:pending.verifier});
      this.completed.add(handoff);
      try { await this.store.remove(PENDING_KEY); } catch (_) { /* Session already committed; do not sign out. */ }
      await this.closeBrowser();
      return {handled:true, status:"linked"};
    }

    async closeBrowser() {
      try { await this.browser?.close?.(); } catch (_) { /* Custom Tabs may already be closed. */ }
    }
  }
  global.GridshardNativeOAuth = NativeOAuth;
})(globalThis);
