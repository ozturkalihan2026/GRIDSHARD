(function (global) {
  "use strict";

  const PREFERENCE = "gridshard.push.enabled";
  // Bildirim yükü güvenilmezdir: yalnız bu salt açma hedefleri desteklenir.
  // Savaş daveti gelen kutusunu açar; daveti kendiliğinden kabul etmez.
  const OPEN_TARGETS = new Map([
    ["profile", /^\/[^/]+$/],
    ["friends", /^\/messages\/[^/]+$/],
    ["inbox", /^\/?$/],
  ]);

  class NativePushController {
    constructor({ capacitor = global.Capacitor, storage, request, identity, onStatus, onOpen }) {
      this.capacitor = capacitor;
      this.storage = storage;
      if (storage === undefined) {
        try { this.storage = global.localStorage; } catch (_) { this.storage = null; }
      }
      this.request = request;
      this.identity = identity;
      this.onStatus = onStatus;
      this.onOpen = onOpen;
      this.platform = capacitor?.getPlatform?.() || "web";
      this.plugin = ["android", "ios"].includes(this.platform)
        ? capacitor?.Plugins?.PushNotifications || capacitor?.registerPlugin?.("PushNotifications") : null;
      this.ready = false;
      this.token = null; // Yerel cihaz belirteci diske yazılmaz, loglanmaz.
      this.pendingActions = [];
      this.seenActions = new Set();
      this.listenerPromise = null;
      this.syncPromise = null;
      this.unregisterPromise = null;
      this.mutations = Promise.resolve();
      this.lastResume = 0;
      this.intent = 0;
      this.wanted = this.readPreference();
    }

    readPreference() {
      try { return this.storage?.getItem(PREFERENCE) === "true"; } catch (_) { return false; }
    }

    setPreference(value) {
      this.wanted = value;
      try { this.storage?.setItem(PREFERENCE, String(value)); } catch (_) { /* Bellekteki tercih yine geçerli. */ }
    }

    status(message) { this.onStatus?.(message); }

    async listen() {
      if (!this.plugin) return;
      if (!this.listenerPromise) {
        this.listenerPromise = (async () => {
          const handles = [];
          try {
            handles.push(await this.plugin.addListener("registration", ({ value }) => {
              this.token = value;
              void this.saveToken().catch(() => this.status("Bildirim cihaz kaydı tamamlanamadı. Bağlantı gelince yeniden denenecek."));
            }));
            handles.push(await this.plugin.addListener("registrationError", () => {
              if (this.wanted) this.status("Mobil bildirim kaydı başarısız. Cihaz ve sağlayıcı ayarlarını kontrol edin.");
            }));
            handles.push(await this.plugin.addListener("pushNotificationActionPerformed", ({ notification }) => {
              if (!this.ready) this.pendingActions.push(notification?.data);
              else void this.openAction(notification?.data);
              this.pendingActions = this.pendingActions.slice(-10);
            }));
          } catch (error) {
            await Promise.allSettled(handles.map((handle) => handle.remove()));
            throw error;
          }
        })().catch((error) => { this.listenerPromise = null; throw error; });
      }
      return this.listenerPromise;
    }

    async openAction(data) {
      const account = this.identity();
      if (!data || data.recipient_id !== account.playerId || !data.notification_id || this.seenActions.has(data.notification_id)) return;
      // Keyfi adres açılmaz, davet kendiliğinden kabul edilmez.
      try {
        const url = new URL(data.deep_link);
        const validPath = OPEN_TARGETS.get(url.hostname);
        if (url.protocol !== "gridshard:" || !validPath
            || url.username || url.password || url.port || url.search || url.hash || !validPath.test(url.pathname)) return;
        this.seenActions.add(data.notification_id);
        if (this.seenActions.size > 100) this.seenActions.delete(this.seenActions.values().next().value);
        await this.onOpen?.(url.href);
      } catch (_) { /* Bozuk veya ulaşılamayan hedef açılışı bozmamalı. */ }
    }

    serialize(action) {
      const pending = this.mutations.catch(() => {}).then(action);
      this.mutations = pending;
      return pending;
    }

    saveToken() {
      const token = this.token;
      const account = this.identity();
      return this.serialize(async () => {
        if (!this.ready || !this.wanted || !token || !account.playerId || !account.deviceId
            || this.identity().playerId !== account.playerId) return;
        await this.request(`/notifications/${encodeURIComponent(account.playerId)}/push-subscriptions`, {
          method: "POST", body: JSON.stringify({ player_id: account.playerId, device_id: account.deviceId, platform: this.platform, token }),
        });
        if (this.wanted) this.status("Mobil bildirim cihazı kaydedildi.");
      });
    }

    removeSubscription() {
      const account = this.identity();
      return this.serialize(async () => {
        if (!this.ready || !account.playerId || !account.deviceId) return;
        await this.request(`/notifications/${encodeURIComponent(account.playerId)}/push-subscriptions/${encodeURIComponent(account.deviceId)}`, { method: "DELETE" });
      });
    }

    async start() {
      if (!this.plugin) return;
      await this.listen();
      const firstStart = !this.ready;
      this.ready = true;
      for (const data of this.pendingActions.splice(0)) await this.openAction(data);
      if (this.wanted) await this.resume(firstStart);
      // Çevrimdışıyken yapılan kapatma, yeni kayıttan önce sunucuya iletilir.
      else await this.removeSubscription();
    }

    async enable() {
      const intent = ++this.intent;
      if (!this.plugin) {
        this.status("Bildirimler yalnız Android ve iOS uygulamasında kullanılabilir.");
        return;
      }
      if (!this.ready) { this.status("Önce güvenli hesap oturumunun açılmasını bekleyin."); return; }
      await this.listen();
      const permission = await this.plugin.requestPermissions();
      if (intent !== this.intent) return;
      if (permission.receive !== "granted") {
        this.setPreference(false);
        await this.removeSubscription();
        this.status("Bildirim izni verilmedi. Cihaz ayarlarından izin verebilirsiniz.");
        return;
      }
      this.setPreference(true);
      await this.resume(true);
    }

    async disable() {
      const intent = ++this.intent;
      // Tercih önce kapanır: geç gelen kayıt çağrısı aboneliği yeniden açamaz.
      this.setPreference(false);
      await this.removeSubscription();
      if (intent !== this.intent) return;
      this.token = null;
      this.unregisterPromise = Promise.resolve().then(() => this.plugin?.unregister?.())
        .catch(() => {}) // Sunucudaki kapatma zaten kaydedildi.
        .finally(() => { this.unregisterPromise = null; });
      await this.unregisterPromise;
      if (intent === this.intent) this.status("Bu cihazın mobil bildirimleri kapatıldı.");
    }

    async resume(force = false) {
      if (!this.plugin || !this.ready || !this.wanted) return;
      if (this.syncPromise) {
        await this.syncPromise;
        if (force && this.wanted) return this.resume(true);
        return;
      }
      if (!force && Date.now() - this.lastResume < 60000) return;
      this.lastResume = Date.now();
      const intent = this.intent;
      this.syncPromise = (async () => {
        if (this.unregisterPromise) await this.unregisterPromise;
        const permission = await this.plugin.checkPermissions();
        if (intent !== this.intent) return;
        if (permission.receive !== "granted") {
          this.setPreference(false);
          await this.removeSubscription();
          this.status("Bildirim izni verilmedi. Cihaz ayarlarından izin verebilirsiniz.");
          return;
        }
        if (this.platform === "android") await this.plugin.createChannel({
          id: "gridshard_social", name: "GRIDSHARD", importance: 3, visibility: 0,
        });
        if (!this.wanted || intent !== this.intent) return;
        this.status("Cihaz bildirim kaydı bekleniyor…");
        // register açılışta/öne dönüşte ve belirteç değişince son belirteci yayar.
        await this.plugin.register();
      })().finally(() => { this.syncPromise = null; });
      return this.syncPromise;
    }
  }

  global.GridshardNativePush = Object.freeze({ NativePushController });
  if (typeof module !== "undefined" && module.exports) module.exports = { NativePushController };
})(globalThis);
