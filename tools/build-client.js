"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require("esbuild");
const { apiBaseForBuild } = require("./mobile-network-policy.js");

const TARGETS = ["chrome109", "safari15"];
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readText = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

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
  // Bunlar genel bir HTML ayrıştırıcısı değil, açık derleme bloklarıdır. Sıra
  // önemli olduğundan async/module betik veya media'lı stil gelirse derleme durur.
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

// Mobil ses türevlerini (tools/encode_mobile_audio.py) doğrular ve pakete
// alınmayacak kanonik WAV'ları döndürür. İstemci yalnız
// gridshard-audio-formats.js listesindeki türevi çalar; türevi her biçimde
// doğrulanan WAV pakete girmez. Türevi olmayan WAV'lar paket içinde kalır.
function compressedAudioReplacements(source, scripts, environment) {
  const replaced = new Set();
  if (!scripts.includes("./src/gridshard-audio.js") || !scripts.includes("./src/gridshard-audio-formats.js")) {
    return replaced;
  }
  const audioRoot = path.join(source, "assets", "audio");
  const manifestPath = path.join(audioRoot, "mobile", "manifest.json");
  if (!fs.existsSync(manifestPath)) return replaced; // Türev yok: istemci WAV çalar.
  const manifest = JSON.parse(readText(manifestPath));
  const formats = manifest.formats;
  if (manifest.version !== 1 || !Array.isArray(formats) || !formats.length
      || !formats.every((extension) => /^[a-z0-9]+$/.test(extension))
      || !manifest.sources || typeof manifest.sources !== "object") {
    throw new Error("Mobil ses manifesti geçersiz; python tools/encode_mobile_audio.py ile yeniden üretin.");
  }
  const context = vm.createContext({});
  vm.runInContext(readText(sourceFile(source, "./src/gridshard-audio-formats.js")), context);
  const runtime = context.GRIDSHARD_AUDIO_ENCODINGS;
  if (runtime?.version !== manifest.version
      || JSON.stringify(Object.keys(runtime.formats || {}).sort()) !== JSON.stringify([...formats].sort())) {
    throw new Error("Ses türevi listesi manifestle eşleşmiyor; python tools/encode_mobile_audio.py çalıştırın.");
  }
  const listed = formats.map((extension) => new Set(runtime.formats[extension]));
  for (const name of new Set(listed.flatMap((names) => [...names]))) {
    const entry = manifest.sources[name];
    if (!/^[a-z0-9_]+$/.test(name) || !entry) throw new Error(`Manifestte olmayan ses türevi: ${name}`);
    const wav = path.join(audioRoot, `${name}.wav`);
    if (!fs.existsSync(wav)) throw new Error(`Türevi listelenen sesin kanonik WAV dosyası yok: ${name}.wav`);
    if (digest(fs.readFileSync(wav)) !== entry.sha256) {
      throw new Error(`${name}.wav mobil türevinden yeni; önce python tools/encode_mobile_audio.py çalıştırın.`);
    }
    formats.forEach((extension, index) => {
      if (!listed[index].has(name)) return;
      const file = path.join(audioRoot, "mobile", `${name}.${extension}`);
      if (!fs.existsSync(file) || fs.statSync(file).size !== entry[`${extension}_bytes`]) {
        throw new Error(`Ses türevi eksik veya bozuk: ${name}.${extension}`);
      }
    });
    if (listed.every((names) => names.has(name))) replaced.add(path.resolve(wav));
  }
  // Kanonik WAV'ları korumak isteyen paket (ör. yedek çözümleme denemesi) için.
  return environment.GRIDSHARD_MOBILE_KEEP_WAV === "1" ? new Set() : replaced;
}

function runtimeAssets(source, html, scripts, omittedWav) {
  const assets = new Set();
  const add = (raw) => {
    const relative = String(raw).split(/[?#]/, 1)[0].replace(/^\.\//, "");
    if (!/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(relative)
        || relative.split("/").some((part) => part.startsWith("."))) {
      throw new Error(`Geçersiz paket varlığı: ${raw}`);
    }
    if (!/\.(?:png|jpe?g|webp|svg|gif|woff2?|wav|ogg|m4a)$/.test(relative)
        || /(?:^|[\/_-])(?:secret|private|test|debug|old|backup|keystore|credential|token|key)(?:[\/_-]|\.)/i.test(relative)) {
      throw new Error(`Paket için yasaklı varlık: ${raw}`);
    }
    let component = source;
    for (const part of relative.split("/")) {
      component = path.join(component, part);
      if (fs.lstatSync(component).isSymbolicLink()) throw new Error(`Paket varlığında sembolik bağlantı: ${raw}`);
    }
    const file = sourceFile(source, `./${relative}`);
    if (!fs.statSync(file).isFile()) throw new Error(`Paket varlığı dosya değil: ${raw}`);
    if (!omittedWav.has(file)) assets.add(relative);
  };
  for (const match of html.matchAll(/(?:src|href)="(\.\/assets\/[^"\s]+)"/g)) add(match[1]);
  const webManifest = JSON.parse(readText(sourceFile(source, "./manifest.webmanifest")));
  for (const icon of webManifest.icons || []) add(icon.src);
  if (scripts.includes("./src/gridshard-audio.js")) {
    const audioScript = readText(sourceFile(source, "./src/gridshard-audio.js"));
    const audioNames = new Set();
    for (const match of audioScript.matchAll(/["']\.\/assets\/audio\/([a-z0-9_]+)\.wav["']/g)) {
      audioNames.add(match[1]);
      add(`./assets/audio/${match[1]}.wav`);
    }
    if (scripts.includes("./src/gridshard-audio-formats.js")) {
      const context = vm.createContext({});
      vm.runInContext(readText(sourceFile(source, "./src/gridshard-audio-formats.js")), context);
      for (const [extension, names] of Object.entries(context.GRIDSHARD_AUDIO_ENCODINGS?.formats || {})) {
        for (const name of names) {
          if (audioNames.has(name)) add(`./assets/audio/mobile/${name}.${extension}`);
        }
      }
    }
  }
  return [...assets].sort();
}

function stripDevelopmentBlocks(script) {
  const start = "/* build:development-only */";
  const end = "/* /build:development-only */";
  const starts = script.split(start).length - 1;
  const ends = script.split(end).length - 1;
  if (starts !== ends) throw new Error("Geliştirme bloğu kapanışı geçersiz.");
  for (let i = 0; i < starts; i += 1) {
    const from = script.indexOf(start);
    const to = script.indexOf(end, from + start.length);
    if (to < from) throw new Error("Geliştirme bloğu sırası geçersiz.");
    script = script.slice(0, from) + script.slice(to + end.length);
  }
  return script;
}

async function buildClient({ root = path.resolve(__dirname, ".."), mobile = false, environment = process.env } = {}) {
  root = fs.realpathSync(root);
  const source = fs.realpathSync(path.join(root, "client"));
  const destination = path.join(root, "dist");
  const apiBase = apiBaseForBuild(environment, mobile);
  const html = readText(path.join(source, "index.html"));
  const scripts = readBuildBlock(html, "scripts");
  const styles = readBuildBlock(html, "styles");
  const omittedWav = compressedAudioReplacements(source, scripts.inputs, environment);
  const runtimeTag = '<script src="./runtime-config.js"></script>';
  if (html.split(runtimeTag).length !== 2 || html.indexOf(runtimeTag) > html.indexOf(scripts.text)) {
    throw new Error("Runtime API ayarı uygulama betiklerinden önce, bir kez yüklenmelidir.");
  }
  assertOutputDirectory(root, destination);
  const staging = fs.mkdtempSync(path.join(root, ".client-build-"));
  try {
    const bundleDirectory = path.join(staging, "bundles");
    fs.mkdirSync(bundleDirectory);
    // Klasik betiklerin yürütme sırası ve window/globalThis dışa aktarımları
    // korunur. Ayırıcı, sondaki yorum/ASI kaynaklı sınır hatalarını da önler.
    const scriptSource = scripts.inputs.map((input) => stripDevelopmentBlocks(readText(sourceFile(source, input)))).join("\n;\n");
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
    if (/__GRIDSHARD_TEST_API|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|com\.example\.gridshard/.test(javascript.code)) {
      throw new Error("Derlenmiş JavaScript test kancası, eski kimlik veya özel anahtar içeriyor.");
    }
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
    // Bilinçli izin listesi: testler, kaynak ağaçları, yerel önbellek ve
    // geliştirme raporları dağıtılmaz.
    for (const name of ["favicon.ico", "manifest.webmanifest"]) {
      fs.copyFileSync(sourceFile(source, `./${name}`), path.join(staging, name));
    }
    const assets = runtimeAssets(source, outputHtml, scripts.inputs, omittedWav);
    for (const relative of assets) {
      const output = path.join(staging, relative);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.copyFileSync(sourceFile(source, `./${relative}`), output);
    }
    const manifest = {
      schema_version: 1, project: "GRIDSHARD", platform: mobile ? "mobile" : "web",
      build_id: digest(outputHtml + runtime + JSON.stringify(immutable)).slice(0, 16),
      toolchain: { esbuild: esbuild.version, targets: TARGETS },
      inputs: { scripts: scripts.inputs, styles: styles.inputs },
      immutable,
      audio: {
        omitted_wav: [...omittedWav].map((file) => path.relative(source, file).split(path.sep).join("/")).sort(),
      },
      assets,
    };
    // Native WebView manifesti kullanmaz; mobil varlığa derleme girdilerini taşımayız.
    if (!mobile) fs.writeFileSync(path.join(staging, "client-build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    // Önceki sürüme, bütün derleme/kopyalama başarıyla bitmeden dokunulmaz.
    assertOutputDirectory(root, destination);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.renameSync(staging, destination);
    return { destination, manifest };
  } finally {
    assertOutputDirectory(root, staging);
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

module.exports = { apiBaseForBuild, readBuildBlock, compressedAudioReplacements, buildClient };

if (require.main === module) {
  buildClient().then(({ destination, manifest }) => {
    const omitted = manifest.audio.omitted_wav.length;
    console.log(`Web paketi hazır: ${destination} (${manifest.build_id})`);
    if (omitted) console.log(`Ses türevi kullanılan ${omitted} WAV pakete alınmadı.`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
