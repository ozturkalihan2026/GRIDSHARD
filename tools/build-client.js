"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const TARGETS = ["chrome109", "safari15"];
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readText = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

function apiBaseForBuild(environment, mobile) {
  const raw = String(environment.GRIDSHARD_API_BASE_URL || "").trim();
  if (!raw) {
    if (mobile) throw new Error("GRIDSHARD_API_BASE_URL mobil pakette zorunludur.");
    return ""; // Web release: same-origin API, no deployment host baked in.
  }
  const url = new URL(raw);
  const insecure = environment.GRIDSHARD_ALLOW_INSECURE_MOBILE_API === "1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && insecure)) {
    throw new Error("API adresi HTTPS olmalıdır; HTTP yalnız açık yerel geliştirme bayrağıyla kullanılabilir.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API adresi kimlik bilgisi, sorgu veya fragment içeremez.");
  }
  return url.href.replace(/\/+$/, "");
}

function readBuildBlock(html, kind) {
  const start = `<!-- build:${kind} -->`;
  const end = `<!-- /build:${kind} -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2) {
    throw new Error(`Tek bir ${kind} derleme bloğu gerekli.`);
  }
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (to < from) throw new Error(`${kind} derleme bloğu kapanışı geçersiz.`);
  const body = html.slice(from + start.length, to);
  // These are explicit build blocks, not a general HTML parser. Fail closed if
  // async/module scripts or media-specific styles are introduced: order matters.
  const pattern = kind === "scripts"
    ? /<script\s+src="(\.\/src\/[^"?#]+\.js)"\s*>\s*<\/script>/g
    : /<link\s+rel="stylesheet"\s+href="(\.\/src\/[^"?#]+\.css)"\s*\/?\s*>/g;
  const inputs = [...body.matchAll(pattern)].map((match) => match[1]);
  if (!inputs.length || new Set(inputs).size !== inputs.length || body.replace(pattern, "").trim()) {
    throw new Error(`${kind} bloğunda desteklenmeyen veya yinelenen etiket var.`);
  }
  return { inputs, text: html.slice(from, to + end.length) };
}

function sourceFile(source, relative) {
  const file = fs.realpathSync(path.resolve(source, relative));
  const within = path.relative(source, file);
  if (!within || within.startsWith("..") || path.isAbsolute(within)) {
    throw new Error(`İstemci dışına çıkan kaynak: ${relative}`);
  }
  return file;
}

function assertOutputDirectory(root, directory) {
  const resolved = path.resolve(directory);
  const name = path.basename(resolved);
  if (path.dirname(resolved) !== root || !(name === "dist" || name.startsWith(".client-build-"))) {
    throw new Error("Derleme yalnız proje içindeki yönetilen çıktı klasörüne yazabilir.");
  }
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Çıktı klasörü gerçek bir dizin olmalıdır.");
  }
}

async function buildClient({ root = path.resolve(__dirname, ".."), mobile = false, environment = process.env } = {}) {
  root = fs.realpathSync(root);
  const source = fs.realpathSync(path.join(root, "client"));
  const destination = path.join(root, "dist");
  const apiBase = apiBaseForBuild(environment, mobile);
  const html = readText(path.join(source, "index.html"));
  const scripts = readBuildBlock(html, "scripts");
  const styles = readBuildBlock(html, "styles");
  const runtimeTag = '<script src="./runtime-config.js"></script>';
  if (html.split(runtimeTag).length !== 2 || html.indexOf(runtimeTag) > html.indexOf(scripts.text)) {
    throw new Error("Runtime API ayarı uygulama betiklerinden önce, bir kez yüklenmelidir.");
  }
  assertOutputDirectory(root, destination);
  const staging = fs.mkdtempSync(path.join(root, ".client-build-"));
  try {
    const bundleDirectory = path.join(staging, "bundles");
    fs.mkdirSync(bundleDirectory);
    // Preserve classic-script execution order and explicit window/globalThis
    // exports. A separator also protects boundaries from trailing comments/ASI.
    const scriptSource = scripts.inputs.map((input) => readText(sourceFile(source, input))).join("\n;\n");
    const [javascript, css] = await Promise.all([
      esbuild.transform(scriptSource, {
        loader: "js", sourcefile: "gridshard.js", target: TARGETS,
        minify: true, keepNames: true, charset: "utf8", legalComments: "inline",
        sourcemap: false,
      }),
      esbuild.build({
        stdin: {
          contents: styles.inputs.map((input) => {
            sourceFile(source, input);
            return `@import ${JSON.stringify(input)};`;
          }).join("\n"),
          resolveDir: source, sourcefile: "gridshard.css", loader: "css",
        },
        outdir: bundleDirectory, bundle: true, minify: true, target: TARGETS,
        charset: "utf8", legalComments: "inline", sourcemap: false, write: false,
        assetNames: "media-[name]-[hash]",
        loader: { ".png": "file", ".jpg": "file", ".jpeg": "file", ".svg": "file", ".webp": "file", ".woff": "file", ".woff2": "file" },
      }),
    ]);
    const cssOutputs = css.outputFiles.filter((file) => file.path.endsWith(".css"));
    if (cssOutputs.length !== 1) throw new Error("Tek bir birleşik stil çıktısı bekleniyor.");
    const immutable = {};
    function writeBundle(extension, bytes) {
      const sha256 = digest(bytes);
      const relative = `bundles/gridshard-${sha256.slice(0, 16)}.${extension}`;
      fs.writeFileSync(path.join(staging, relative), bytes);
      immutable[relative] = { sha256, bytes: Buffer.byteLength(bytes) };
      return `./${relative}`;
    }
    const jsUrl = writeBundle("js", javascript.code);
    const cssUrl = writeBundle("css", cssOutputs[0].contents);
    for (const file of css.outputFiles.filter((file) => !file.path.endsWith(".css"))) {
      if (path.dirname(file.path) !== bundleDirectory) throw new Error("Beklenmeyen CSS varlık yolu.");
      fs.writeFileSync(file.path, file.contents);
    }
    const outputHtml = html
      .replace(scripts.text, `<script src="${jsUrl}"></script>`)
      .replace(styles.text, `<link rel="stylesheet" href="${cssUrl}" />`);
    if (/(?:src|href)="\.\/src\//.test(outputHtml)) {
      throw new Error("Derleme bloğu dışında paketlenmemiş kaynak kaldı.");
    }
    fs.writeFileSync(path.join(staging, "index.html"), outputHtml);
    const runtime = `globalThis.GRIDSHARD_API_BASE_URL = ${JSON.stringify(apiBase)};\n`;
    fs.writeFileSync(path.join(staging, "runtime-config.js"), runtime);
    // Deliberate allowlist: no tests, source trees, local caches or dev reports.
    for (const name of ["favicon.ico", "manifest.webmanifest", "assets"]) {
      fs.cpSync(path.join(source, name), path.join(staging, name), {
        recursive: true,
        filter: (entry) => {
          if (fs.lstatSync(entry).isSymbolicLink()) throw new Error("Paket varlıklarında sembolik bağlantı kabul edilmez.");
          return !path.basename(entry).startsWith(".");
        },
      });
    }
    const manifest = {
      schema_version: 1, project: "GRIDSHARD", platform: mobile ? "mobile" : "web",
      build_id: digest(outputHtml + runtime + JSON.stringify(immutable)).slice(0, 16),
      toolchain: { esbuild: esbuild.version, targets: TARGETS },
      inputs: { scripts: scripts.inputs, styles: styles.inputs },
      immutable,
    };
    fs.writeFileSync(path.join(staging, "client-build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    // Do not touch the previous release until every compilation/copy succeeded.
    assertOutputDirectory(root, destination);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.renameSync(staging, destination);
    return { destination, manifest };
  } finally {
    assertOutputDirectory(root, staging);
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

module.exports = { apiBaseForBuild, readBuildBlock, buildClient };

if (require.main === module) {
  buildClient().then(({ destination, manifest }) => {
    console.log(`Web paketi hazır: ${destination} (${manifest.build_id})`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
