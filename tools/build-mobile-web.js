const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "client");
const destination = path.join(root, "dist");
const apiBase = String(process.env.GRIDSHARD_API_BASE_URL || "").trim().replace(/\/$/, "");
const allowInsecure = process.env.GRIDSHARD_ALLOW_INSECURE_MOBILE_API === "1";

if (!apiBase) {
  throw new Error("GRIDSHARD_API_BASE_URL mobil paket üretiminde zorunludur.");
}

const parsed = new URL(apiBase);
if (parsed.protocol !== "https:" && !allowInsecure) {
  throw new Error("Mobil paket yalnız HTTPS API kullanabilir.");
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, {
  recursive: true,
  filter: (entry) => !entry.includes(`${path.sep}build${path.sep}`)
});
fs.writeFileSync(
  path.join(destination, "runtime-config.js"),
  `globalThis.GRIDSHARD_API_BASE_URL = ${JSON.stringify(apiBase)};\n`,
  "utf8"
);

console.log(`Mobil web çıktısı hazır: ${destination}`);
