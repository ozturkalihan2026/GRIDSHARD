(function(global) {
  "use strict";
  class AccountSessionControls {
    constructor({document, auth, playGames, ready, playerId, request, onRevoked,
      canRecoverCurrent, reload = () => global.location.reload(), confirm = text => global.confirm(text)} = {}) {
      Object.assign(this, {document, auth, playGames, ready, playerId, request, onRevoked, canRecoverCurrent, reload, confirm});
      this.dialog = document.getElementById("account-session-recovery");
      this.message = document.getElementById("account-session-recovery-status");
      this.button = document.getElementById("account-session-recovery-login");
      this.busy = false;
      this.button?.addEventListener("click", () => { void this.recover(); });
      document.getElementById("account-session-recovery-retry")?.addEventListener("click", () => {
        if (!this.busy) this.reload();
      });
      this.dialog?.addEventListener("cancel", event => event.preventDefault());
    }
    text(key, params = {}) {
      return global.GridshardI18n?.t?.(key, params, this.document.documentElement?.lang || "tr") || key;
    }
    setMessage(key) { if (this.message) this.message.textContent = this.text(key); }
    async openRecovery() {
      this.setMessage("account.session.expired");
      if (this.dialog && !this.dialog.open) this.dialog.showModal();
      if (this.button) this.button.disabled = true;
      try { await this.ready; } catch (_error) {
        this.setMessage("account.session.provider_unavailable");
        return;
      }
      if (this.button) this.button.disabled = this.busy || !this.playGames?.configured;
      if (!this.playGames?.configured) this.setMessage("account.session.provider_unavailable");
      else if (!this.busy) this.button?.focus?.();
    }
    isCurrent(device) { return device.device_id === this.auth?.deviceId(); }
    deviceLabel(device) {
      return `${device.name || this.text("account.session.device")}${this.isCurrent(device)
        ? ` · ${this.text("account.session.this_device")}` : ""}`;
    }
    async revokeDevice(device) {
      const current = this.isCurrent(device);
      if (current && !this.canRecoverCurrent?.()) {
        this.setMessage("account.session.link_first");
        return {blocked:true, message:this.text("account.session.link_first")};
      }
      const confirmed = await this.confirm(this.text(current ? "account.session.confirm_current"
        : "account.session.confirm_other", {device:device.name || this.text("account.session.device")}));
      if (!confirmed) return {cancelled:true};
      const state = await this.request(`/accounts/${encodeURIComponent(this.playerId)}/devices/${encodeURIComponent(device.device_id)}`,
        {method:"DELETE", body:JSON.stringify({player_id:this.playerId})}, 12000);
      if (current) this.auth.markSignedOut();
      this.onRevoked?.(state);
      if (current) await this.openRecovery();
      return {signedOut:true, current};
    }
    async recover() {
      if (this.busy || !this.playGames?.configured) return;
      this.busy = true;
      if (this.button) this.button.disabled = true;
      this.setMessage("account.session.verifying");
      try {
        await this.playGames.begin(this.playerId, "recover");
        // Only a server-selected, provider-proven existing owner can reach this point.
        this.reload();
      } catch (_error) {
        this.setMessage("account.session.recovery_failed");
      } finally {
        this.busy = false;
        if (this.button) this.button.disabled = !this.playGames?.configured;
        if (!this.button?.disabled && this.dialog?.open && !this.dialog.contains?.(this.document.activeElement)) {
          this.button?.focus?.();
        }
      }
    }
  }
  global.GridshardAccountSessionControls = AccountSessionControls;
})(globalThis);
