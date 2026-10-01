(function (global) {
  "use strict";
  // Pinned SecureStorage 8.0.1 native bridge. Do not use its web adapter,
  // which intentionally stores plaintext in localStorage.
  class DeviceSecretStore {
    constructor({capacitor = global.Capacitor, storage = null} = {}) {
      this.storage = storage;
      this.native = ["android", "ios"].includes(capacitor?.getPlatform?.());
      this.plugin = this.native
        ? capacitor?.Plugins?.SecureStorage || capacitor?.registerPlugin?.("SecureStorage") : null;
    }
    async read(key) {
      if (!this.native) return this.storage?.getItem(key) || null;
      if (!this.plugin) throw new Error("Güvenli cihaz deposu yüklenemedi. Uygulamayı güncelle.");
      const result = await this.plugin.internalGetItem({prefixedKey:key, sync:false});
      if (result.data == null) return null;
      const value = JSON.parse(result.data);
      if (typeof value !== "string" || value.length < 32) throw new Error("Güvenli cihaz kaydı geçersiz.");
      return value;
    }
    async write(key, value) {
      if (!this.native) { this.storage?.setItem(key, value); return; }
      if (!this.plugin) throw new Error("Güvenli cihaz deposu yüklenemedi. Uygulamayı güncelle.");
      await this.plugin.internalSetItem({prefixedKey:key, data:JSON.stringify(value), sync:false, access:1});
      if (await this.read(key) !== value) throw new Error("Cihaz sırrı güvenli kaydedilemedi.");
      // Delete the legacy copy only after the native write was read back.
      this.storage?.removeItem(key);
    }
    async existing(key) {
      const secure = await this.read(key);
      if (secure) {
        if (this.native) this.storage?.removeItem(key);
        return secure;
      }
      if (!this.native) return null;
      const legacy = this.storage?.getItem(key);
      if (!legacy) return null;
      if (legacy.length < 32) throw new Error("Eski cihaz kaydı geçersiz; hesap kurtarma gerekli.");
      await this.write(key, legacy);
      return legacy;
    }
    async remove(key) {
      if (this.native) {
        if (!this.plugin) throw new Error("Güvenli cihaz deposu yüklenemedi.");
        await this.plugin.internalRemoveItem({prefixedKey:key, sync:false});
      }
      this.storage?.removeItem(key);
    }
  }
  global.GridshardDeviceSecretStore = DeviceSecretStore;
})(globalThis);
