"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { apiBaseForBuild, readBuildBlock, buildClient } = require("../build-client.js");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function fixture(t, { audio = false } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gridshard-client-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const folder of ["src", "assets/audio/mobile", "tests", ".cache"]) {
    fs.mkdirSync(path.join(root, "client", folder), { recursive: true });
  }
  const write = (file, text) => fs.writeFileSync(path.join(root, "client", file), text);
  const audioScripts = audio
    ? '\n<script src="./src/gridshard-audio-formats.js"></script>\n<script src="./src/gridshard-audio.js"></script>'
    : "";
  write("index.html", `<!doctype html><html><head>
<link href="https://fonts.example.test/font.css" rel="stylesheet">
<link rel="icon" href="./assets/icon.svg">
<!-- build:styles -->
<link rel="stylesheet" href="./src/styles.css" />
<link rel="stylesheet" href="./src/canon.css" />
<!-- /build:styles -->
</head><body>
<script src="./runtime-config.js"></script>
<!-- build:scripts -->
<script src="./src/first.js"></script>${audioScripts}
<script src="./src/last.js"></script>
<!-- /build:scripts -->
</body></html>`);
  write("src/first.js", '(function () { globalThis.order = ["first"]; })(); /* build:development-only */ globalThis.__GRIDSHARD_TEST_API = { secret: "fixture" }; /* /build:development-only */ // boundary');
  write("src/last.js", '(function () { globalThis.order.push("last"); })();');
  write("src/styles.css", ".card { color: red; }");
  write("src/canon.css", ".card { color: blue; }");
  write("favicon.ico", "test icon");
  write("manifest.webmanifest", "{}");
  write("assets/icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write("assets/unused-key.txt", "private-test-key");
  write("assets/old-icon.svg", "old-identity");
  write("assets/audio/mobile/README.md", "development-only");
  write("tests/private.js", "test-only");
  write(".cache/private.txt", "local-only");
  if (audio) {
    // encode_mobile_audio.py çıktısının küçük bir eşi: "hit" türevli, "raw" türevsiz.
    write("src/gridshard-audio.js", 'globalThis.audioSources = ["./assets/audio/hit.wav", "./assets/audio/raw.wav"];');
    write("src/gridshard-audio-formats.js", `globalThis.GRIDSHARD_AUDIO_ENCODINGS = Object.freeze({
  version: 1,
  formats: Object.freeze({ ogg: Object.freeze(["hit"]), m4a: Object.freeze(["hit"]) }),
});`);
    write("assets/audio/hit.wav", "RIFF-hit");
    write("assets/audio/raw.wav", "RIFF-raw");
    write("assets/audio/mobile/hit.ogg", "ogg-bytes");
    write("assets/audio/mobile/hit.m4a", "m4a-bytes!");
    write("assets/audio/mobile/manifest.json", JSON.stringify({
      version: 1, formats: ["ogg", "m4a"],
      sources: {
        hit: { sha256: sha256("RIFF-hit"), wav_bytes: 8, ogg_bytes: 9, m4a_bytes: 10 },
        // Kaynağı silinmiş ve çalışma zamanı listesinde olmayan eski kayıt pakete dokunmaz.
        removed: { sha256: "0".repeat(64), wav_bytes: 1, ogg_bytes: 1, m4a_bytes: 1 },
      },
    }));
  }
  return { root, write };
}

test("API ayarı web için aynı origin'e izin verir, mobilde açık adres ister", () => {
  assert.equal(apiBaseForBuild({}, false), "");
  assert.throws(() => apiBaseForBuild({}, true), /zorunludur/);
  assert.equal(apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "https://game.example/api/" }, true), "https://game.example/api");
  for (const url of ["http://game.example", "https://user:pass@game.example", "https://game.example/?token=x", "https://game.example/#x"]) {
    assert.throws(() => apiBaseForBuild({ GRIDSHARD_API_BASE_URL: url }, true));
  }
  assert.equal(apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "http://localhost:8000", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1" }, true), "http://localhost:8000");
  assert.throws(() => apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "file:///private", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1" }, true));
});

test("paket sırası, içerik özetleri, deterministik çıktı ve izin listesi", async (t) => {
  const { root, write } = fixture(t);
  const first = await buildClient({ root, environment: {} });
  const names = Object.keys(first.manifest.immutable);
  const js = names.find((name) => name.endsWith(".js"));
  const css = names.find((name) => name.endsWith(".css"));
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(first.destination, js), "utf8"), context);
  assert.equal(JSON.stringify(context.order), '["first","last"]');
  const styles = fs.readFileSync(path.join(first.destination, css), "utf8");
  assert.match(styles, /color:(?:#00f|blue)/);
  assert.ok(styles.indexOf("red") < Math.max(styles.indexOf("#00f"), styles.indexOf("blue")));
  const html = fs.readFileSync(path.join(first.destination, "index.html"), "utf8");
  assert.ok(html.indexOf("runtime-config.js") < html.indexOf(js));
  assert.ok(html.includes("https://fonts.example.test/font.css"));
  assert.ok(!html.includes("./src/"));
  assert.ok(fs.existsSync(path.join(first.destination, "assets/icon.svg")));
  for (const name of ["assets/unused-key.txt", "assets/old-icon.svg", "assets/audio/mobile/README.md"]) {
    assert.ok(!fs.existsSync(path.join(first.destination, name)));
  }
  assert.ok(!fs.readFileSync(path.join(first.destination, js), "utf8").includes("__GRIDSHARD_TEST_API"));
  for (const name of ["src", "tests", ".cache"]) assert.ok(!fs.existsSync(path.join(first.destination, name)));
  for (const [name, metadata] of Object.entries(first.manifest.immutable)) {
    const bytes = fs.readFileSync(path.join(first.destination, name));
    const checksum = sha256(bytes);
    assert.equal(metadata.sha256, checksum);
    assert.equal(metadata.bytes, bytes.length);
    assert.ok(name.includes(checksum.slice(0, 16)));
  }
  const repeated = await buildClient({ root, environment: {} });
  assert.deepEqual(repeated.manifest, first.manifest);
  write("src/last.js", 'globalThis.order.push("changed");');
  const changed = await buildClient({ root, environment: {} });
  assert.notEqual(changed.manifest.build_id, first.manifest.build_id);
  assert.ok(!Object.hasOwn(changed.manifest.immutable, js));
  assert.ok(Object.hasOwn(changed.manifest.immutable, css));
});

test("CSS varlığı pakete göreli kalır, mobil ayar paketin dışında durur", async (t) => {
  const { root, write } = fixture(t);
  write("src/canon.css", '.card { background: url("../assets/icon.svg"); }');
  const { destination, manifest } = await buildClient({ root, mobile: true, environment: { GRIDSHARD_API_BASE_URL: "https://game.example" } });
  assert.equal(manifest.platform, "mobile");
  assert.ok(!fs.existsSync(path.join(destination, "client-build-manifest.json")));
  assert.match(fs.readFileSync(path.join(destination, "runtime-config.js"), "utf8"), /https:\/\/game\.example/);
  assert.ok(fs.readdirSync(path.join(destination, "bundles")).some((name) => /^media-icon-.*\.svg$/.test(name)));
});

test("geçersiz girdi veya eksik mobil API son başarılı çıktıyı silmez", async (t) => {
  const { root, write } = fixture(t);
  const { destination, manifest } = await buildClient({ root, environment: {} });
  await assert.rejects(buildClient({ root, mobile: true, environment: {} }), /zorunludur/);
  write("src/last.js", "function (");
  await assert.rejects(buildClient({ root, environment: {} }));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination, "client-build-manifest.json"))), manifest);
  assert.ok(!fs.readdirSync(root).some((name) => name.startsWith(".client-build-")));
});

test("desteklenmeyen async betik yürütme sırasını sessizce değiştiremez", () => {
  assert.throws(() => readBuildBlock('<!-- build:scripts --><script async src="./src/first.js"></script><!-- /build:scripts -->', "scripts"));
});

test("türevi doğrulanan WAV pakete girmez, türevsiz WAV kalır", async (t) => {
  const { root } = fixture(t, { audio: true });
  const { destination, manifest } = await buildClient({ root, environment: {} });
  assert.deepEqual(manifest.audio.omitted_wav, ["assets/audio/hit.wav"]);
  assert.ok(!fs.existsSync(path.join(destination, "assets/audio/hit.wav")));
  assert.ok(fs.existsSync(path.join(destination, "assets/audio/raw.wav")));
  for (const name of ["hit.ogg", "hit.m4a"]) {
    assert.ok(fs.existsSync(path.join(destination, "assets/audio/mobile", name)));
  }
  assert.ok(!fs.existsSync(path.join(destination, "assets/audio/mobile/manifest.json")));
  const kept = await buildClient({ root, environment: { GRIDSHARD_MOBILE_KEEP_WAV: "1" } });
  assert.deepEqual(kept.manifest.audio.omitted_wav, []);
  assert.ok(fs.existsSync(path.join(kept.destination, "assets/audio/hit.wav")));
});

test("eski veya bozuk ses türevi paketi durdurur", async (t) => {
  const { root, write } = fixture(t, { audio: true });
  const { destination, manifest } = await buildClient({ root, environment: {} });
  write("assets/audio/hit.wav", "RIFF-hit-v2");
  await assert.rejects(buildClient({ root, environment: {} }), /encode_mobile_audio/);
  // KEEP_WAV eski türevin çalınmasını engellemez; yine durur.
  await assert.rejects(buildClient({ root, environment: { GRIDSHARD_MOBILE_KEEP_WAV: "1" } }), /encode_mobile_audio/);
  write("assets/audio/hit.wav", "RIFF-hit");
  write("assets/audio/mobile/hit.m4a", "truncated");
  await assert.rejects(buildClient({ root, environment: {} }), /hit\.m4a/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination, "client-build-manifest.json"))), manifest);
});
