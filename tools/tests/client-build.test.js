"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { apiBaseForBuild, readBuildBlock, buildClient } = require("../build-client.js");

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "gridshard-client-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const folder of ["src", "assets", "tests", ".cache"]) {
    fs.mkdirSync(path.join(root, "client", folder), { recursive: true });
  }
  const write = (file, text) => fs.writeFileSync(path.join(root, "client", file), text);
  write("index.html", `<!doctype html><html><head>
<link href="https://fonts.example.test/font.css" rel="stylesheet">
<!-- build:styles -->
<link rel="stylesheet" href="./src/styles.css" />
<link rel="stylesheet" href="./src/canon.css" />
<!-- /build:styles -->
</head><body>
<script src="./runtime-config.js"></script>
<!-- build:scripts -->
<script src="./src/first.js"></script>
<script src="./src/last.js"></script>
<!-- /build:scripts -->
</body></html>`);
  write("src/first.js", '(function () { globalThis.order = ["first"]; })(); // boundary');
  write("src/last.js", '(function () { globalThis.order.push("last"); })();');
  write("src/styles.css", ".card { color: red; }");
  write("src/canon.css", ".card { color: blue; }");
  write("favicon.ico", "test icon");
  write("manifest.webmanifest", "{}");
  write("assets/icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write("tests/private.js", "test-only");
  write(".cache/private.txt", "local-only");
  return { root, write };
}

test("API configuration permits same-origin web, requires explicit mobile origin", () => {
  assert.equal(apiBaseForBuild({}, false), "");
  assert.throws(() => apiBaseForBuild({}, true), /zorunludur/);
  assert.equal(apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "https://game.example/api/" }, true), "https://game.example/api");
  for (const url of ["http://game.example", "https://user:pass@game.example", "https://game.example/?token=x", "https://game.example/#x"]) {
    assert.throws(() => apiBaseForBuild({ GRIDSHARD_API_BASE_URL: url }, true));
  }
  assert.equal(apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "http://localhost:8000", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1" }, true), "http://localhost:8000");
  assert.throws(() => apiBaseForBuild({ GRIDSHARD_API_BASE_URL: "file:///private", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1" }, true));
});

test("bundle order, cache hashes, deterministic output and output allowlist", async (t) => {
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
  for (const name of ["src", "tests", ".cache"]) assert.ok(!fs.existsSync(path.join(first.destination, name)));
  for (const [name, metadata] of Object.entries(first.manifest.immutable)) {
    const bytes = fs.readFileSync(path.join(first.destination, name));
    const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
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

test("CSS media stays relative to its bundle and mobile configuration stays outside it", async (t) => {
  const { root, write } = fixture(t);
  write("src/canon.css", '.card { background: url("../assets/icon.svg"); }');
  const { destination, manifest } = await buildClient({ root, mobile: true, environment: { GRIDSHARD_API_BASE_URL: "https://game.example" } });
  assert.equal(manifest.platform, "mobile");
  assert.match(fs.readFileSync(path.join(destination, "runtime-config.js"), "utf8"), /https:\/\/game\.example/);
  assert.ok(fs.readdirSync(path.join(destination, "bundles")).some((name) => /^media-icon-.*\.svg$/.test(name)));
});

test("invalid input or missing mobile API never erases the last successful output", async (t) => {
  const { root, write } = fixture(t);
  const { destination, manifest } = await buildClient({ root, environment: {} });
  await assert.rejects(buildClient({ root, mobile: true, environment: {} }), /zorunludur/);
  write("src/last.js", "function (");
  await assert.rejects(buildClient({ root, environment: {} }));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination, "client-build-manifest.json"))), manifest);
  assert.ok(!fs.readdirSync(root).some((name) => name.startsWith(".client-build-")));
});

test("unsupported async scripts cannot silently change execution order", () => {
  assert.throws(() => readBuildBlock('<!-- build:scripts --><script async src="./src/first.js"></script><!-- /build:scripts -->', "scripts"));
});
