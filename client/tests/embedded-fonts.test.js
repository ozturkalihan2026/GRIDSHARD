"use strict";

// Yazı tipleri pakete gömülüdür: açılışta dış adrese istek gitmez
// (docs/CHILD_AUDIENCE_AUDIT.md, devam planı 4).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CLIENT_ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(CLIENT_ROOT, "index.html"), "utf8");
const fonts = fs.readFileSync(path.join(CLIENT_ROOT, "src", "fonts.css"), "utf8");
const styles = fs.readFileSync(path.join(CLIENT_ROOT, "src", "styles.css"), "utf8");

// Sayfa hiçbir dış adresten stil, betik ya da yazı tipi istemez.
const external = [...html.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)="(https?:)?\/\/[^"]+"/g)].map((match) => match[0]);
assert.deepEqual(external, []);
assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html + fonts + styles));
assert.ok(!/@import\s+url\(\s*["']?https?:/.test(fonts + styles));

// Yazı tipi kuralları derleme bloğunun ilk stilidir.
const block = html.slice(html.indexOf("<!-- build:styles -->"), html.indexOf("<!-- /build:styles -->"));
assert.match(block, /^<!-- build:styles -->\s*<link rel="stylesheet" href="\.\/src\/fonts\.css" \/>/);

// Her kural var olan, gerçek bir woff2 dosyasını gösterir.
const faces = [...fonts.matchAll(/@font-face \{([^}]+)\}/g)].map((match) => match[1]);
assert.equal(faces.length, 9);
for (const face of faces) {
  const file = /src:url\("\.\.\/assets\/fonts\/([a-z0-9-]+\.woff2)"\) format\("woff2"\);/.exec(face)?.[1];
  assert.ok(file, face);
  const bytes = fs.readFileSync(path.join(CLIENT_ROOT, "assets", "fonts", file));
  assert.equal(bytes.subarray(0, 4).toString("latin1"), "wOF2", file);
  assert.match(face, /font-display:swap;/);
  assert.match(face, /unicode-range:U\+/);
}
// Oyunun kullandığı iki aile ve ağırlıklar karşılanır; Türkçe harfler için
// Rajdhani'nin genişletilmiş Latin dosyaları da vardır.
const families = (name) => faces.filter((face) => face.includes(`font-family:"${name}"`));
assert.equal(families("Orbitron").length, 1);
assert.match(families("Orbitron")[0], /font-weight:600 900;/);
assert.deepEqual(
  families("Rajdhani").map((face) => /font-weight:(\d+);/.exec(face)[1]).sort(),
  ["400", "400", "500", "500", "600", "600", "700", "700"]
);
assert.equal(families("Rajdhani").filter((face) => /latin-ext\.woff2/.test(face)).length, 4);
assert.match(styles, /--gs-font-display:"Orbitron"/);
assert.match(styles, /--gs-font-copy:"Rajdhani"/);

// Lisans metni pakete giren sayfada da vardır ve dosyalardakinin aynısıdır
// (SIL OFL 1.1: her kopya telif bildirimini ve lisans metnini taşır).
const unescape = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
for (const name of ["OFL-Orbitron.txt", "OFL-Rajdhani.txt"]) {
  const license = fs.readFileSync(path.join(CLIENT_ROOT, "assets", "fonts", name), "utf8").replace(/\r\n/g, "\n").trim();
  assert.match(license, /^Copyright /);
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/);
  const shown = new RegExp(`<pre translate="no" data-license="${name}">([\\s\\S]*?)</pre>`).exec(html);
  assert.ok(shown, `oyunda yok: ${name}`);
  assert.equal(unescape(shown[1]).replace(/\r\n/g, "\n").trim(), license, name);
}
assert.ok(html.includes('<details id="open-source-licenses"'));

console.log("gridshard embedded fonts test passed");
