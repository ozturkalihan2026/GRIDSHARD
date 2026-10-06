"use strict";

// Telefonda görülen iki yerleşim kusurunun sözleşmesi:
// 1) Kartlar ekranında karta dokununca açılan Bilgi / Seç kutusu kartın yanında
//    küçük kalıyordu; artık kart genişliğindedir ve kartın altına ortalanır.
// 2) Takım modül isteği kutucuklarında modül adı alttan kesiliyordu: Android web
//    görünümü 8 pikselden küçük yazıyı büyütür, yükseklik sınırı olan ızgara da
//    satırları sıkıştırır.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const rule = (selector) => {
  const start = css.lastIndexOf(`\n${selector} {`);
  assert.ok(start >= 0, `kural yok: ${selector}`);
  return css.slice(start, css.indexOf("}", start));
};
const remSize = (text) => Number(/font-size:(\d*\.?\d+)rem/.exec(text)?.[1]);

// Modül ve çekirdek kartları aynı yerleştirme kuralını kullanır.
const moduleQuick = app.slice(app.indexOf("function showCollectionQuickActions"), app.indexOf("function sortModuleCollection"));
const coreQuick = app.slice(app.indexOf("function showCoreQuickActions"), app.indexOf("function renderCoreCollection"));
for (const source of [moduleQuick, coreQuick]) {
  assert.ok(source.includes('positionQuickActions(panel, anchor, document.getElementById("modules-screen"));'));
}

// Kutu en az kart genişliğindedir, kartın altına ortalanır ve ekranın dışına taşmaz.
const position = {};
vm.runInNewContext(`${app.slice(app.indexOf("function positionQuickActions"), app.indexOf("function showCoreQuickActions"))}
this.position = positionQuickActions;`, position);
const place = ({ anchorLeft, anchorWidth, panelWidth }) => {
  const panel = { style:{}, getBoundingClientRect:() => ({ width:panelWidth }) };
  const anchor = { getBoundingClientRect:() => ({ left:anchorLeft, width:anchorWidth, bottom:300 }) };
  const screen = { scrollLeft:0, scrollTop:40, scrollWidth:369, getBoundingClientRect:() => ({ left:12, top:60 }) };
  position.position(panel, anchor, screen);
  return panel.style;
};
assert.deepEqual({ ...place({ anchorLeft:106, anchorWidth:86, panelWidth:66 }) }, { width:"86px", left:"94px", top:"277px" });
assert.deepEqual({ ...place({ anchorLeft:106, anchorWidth:86, panelWidth:120 }) }, { width:"120px", left:"77px", top:"277px" });
assert.equal(place({ anchorLeft:14, anchorWidth:86, panelWidth:120 }).left, "4px");
assert.equal(place({ anchorLeft:290, anchorWidth:86, panelWidth:120 }).left, "245px");

// Yazı ve düğmeler parmakla basılacak boydadır.
const quickRules = css.slice(css.indexOf("/* Karta dokununca altında açılan Bilgi / Seç kutusu."));
const quickButton = /\.module-quick-actions button \{([^}]*)\}/.exec(quickRules)?.[1] || "";
const quickName = /\.module-quick-actions strong \{([^}]*)\}/.exec(quickRules)?.[1] || "";
assert.ok(Number(/min-height:(\d+)px/.exec(quickButton)?.[1]) >= 36);
assert.ok(remSize(quickButton) >= 0.56);
assert.ok(remSize(quickName) >= 0.56);
assert.ok(quickName.includes("white-space:normal"));

// Takım isteği kutucukları: satırlar içerik kadar yüksek, ad satırı sıkışmaz ve
// hiçbir yazı web görünümünün en küçük yazı boyunun (8 piksel = .5rem) altında değil.
const grid = rule(".team-request-module-grid");
assert.ok(grid.includes("grid-auto-rows:max-content;"));
assert.ok(grid.includes("max-height:300px;"));
const name = rule(".team-request-module strong");
assert.ok(name.includes("min-height:min-content;"));
assert.ok(name.includes("-webkit-line-clamp:2;"));
for (const selector of [".team-request-module strong", ".team-request-module small", ".team-request-module em"]) {
  const size = Number(/font:\d+ (\d*\.?\d+)rem/.exec(rule(selector))?.[1]);
  assert.ok(size >= 0.5, `${selector} yazısı en küçük boyun altında: ${size}rem`);
}

console.log("gridshard cards popover and team tiles test passed");
