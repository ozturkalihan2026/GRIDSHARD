"use strict";

// One policy for the web build, Capacitor config and Android manifest. A
// temporary debug identity alone must never enable plaintext network traffic.
function localHost(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const parts = hostname.split(".").map(Number);
  if (parts.some((part) => part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

function apiBaseForBuild(environment, mobile) {
  const remoteDebug = environment.GRIDSHARD_REMOTE_DEBUG === "1";
  if (remoteDebug && environment.GRIDSHARD_LOCAL_DEBUG !== "1") {
    throw new Error("Uzak debug modu ayrıca GRIDSHARD_LOCAL_DEBUG=1 gerektirir.");
  }
  const raw = String(environment.GRIDSHARD_API_BASE_URL || "").trim();
  if (!raw) {
    if (mobile || remoteDebug) throw new Error("GRIDSHARD_API_BASE_URL mobil pakette zorunludur.");
    return "";
  }
  const url = new URL(raw);
  const insecure = environment.GRIDSHARD_LOCAL_DEBUG === "1"
    && !remoteDebug
    && environment.GRIDSHARD_ALLOW_INSECURE_MOBILE_API === "1"
    && localHost(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && insecure)) {
    throw new Error("API adresi HTTPS olmalıdır; HTTP yalnız açık yerel debug bayraklarıyla özel ağda kullanılabilir.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API adresi kimlik bilgisi, sorgu veya fragment içeremez.");
  }
  return url.href.replace(/\/+$/, "");
}

function insecureLocalDebugForBuild(environment) {
  const apiBase = apiBaseForBuild(environment, false);
  return Boolean(apiBase) && new URL(apiBase).protocol === "http:";
}

module.exports = { apiBaseForBuild, insecureLocalDebugForBuild };
