(function (global) {
  "use strict";
  class PlayGames {
    constructor({capacitor = global.Capacitor, auth = global.GridshardAuth?.session,
      request, apiBaseUrl = global.GridshardAuth?.apiBaseUrl} = {}) {
      this.native = capacitor?.getPlatform?.() === "android";
      this.plugin = this.native ? capacitor?.Plugins?.GridshardPlayGames || capacitor?.registerPlugin?.("GridshardPlayGames") : null;
      this.auth = auth;
      this.request = request;
      this.apiBaseUrl = apiBaseUrl;
      this.configured = false;
      this.busy = false;
    }
    async prepare() {
      if (!this.plugin?.getStatus) return false;
      try {
        const url = new URL(this.apiBaseUrl);
        if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.port
            || !["", "/"].includes(url.pathname)) return false;
        this.config = await this.plugin.getStatus();
        this.configured = this.config?.configured === true;
      } catch (_) { this.configured = false; }
      return this.configured;
    }
    async begin(playerId, mode = "link") {
      if (this.busy) throw new Error("Play Games girişi zaten sürüyor.");
      if (!this.configured || !["link", "login", "recover"].includes(mode)) throw new Error("Play Games uygulamada henüz hazır değil.");
      this.busy = true;
      try {
        const bytes = global.crypto.getRandomValues(new Uint8Array(32));
        const verifier = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
        const digest = new Uint8Array(await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
        const challenge = global.btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const recovery = mode === "recover";
        const base = recovery ? "/auth/play-games/recovery" : `/accounts/${encodeURIComponent(playerId)}/play-games`;
        const started = await this.request(`${base}/start`, {method:"POST", cache:"no-store",
          body:JSON.stringify(recovery ? {expected_player_id:playerId, code_challenge:challenge}
            : {mode, code_challenge:challenge})}, 12000);
        if (!started.configured) throw new Error("Play Games sunucuda henüz hazır değil.");
        if (started.game_id !== this.config.gameId || started.server_client_id !== this.config.serverClientId
            || !/^[A-Za-z0-9_-]{32,256}$/.test(started.state || "")) throw new Error("Play Games uygulama ve sunucu ayarları eşleşmiyor.");
        const result = await this.plugin.signIn({interactive:true});
        if (!result?.code || typeof result.code !== "string") throw new Error(recovery
          ? "Play Games yeniden girişi tamamlanamadı. Mevcut profil değiştirilmedi."
          : "Play Games girişi tamamlanamadı. Misafir olarak devam edebilirsin.");
        const completed = await this.request(`${base}/complete`, {method:"POST", cache:"no-store",
          body:JSON.stringify({state:started.state, code:result.code, code_verifier:verifier})}, 30000);
        if (!/^[A-Za-z0-9_-]{32,256}$/.test(completed.exchange || "")) throw new Error("Play Games sunucu yanıtı geçersiz.");
        return await this.auth.completeProviderLogin(completed.exchange, {codeVerifier:verifier});
      } finally { this.busy = false; }
    }
  }
  global.GridshardPlayGames = PlayGames;
})(globalThis);
