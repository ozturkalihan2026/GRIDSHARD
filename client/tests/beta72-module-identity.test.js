const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

// Enderlik kanunu: bilgi ekranı enderliği bir güç avantajı olarak göstermez.
assert.ok(!app.includes("Nadirlik avantajı"));
assert.ok(/function createModuleIdentityPanel\(\s*item,/.test(app));
assert.ok(app.includes("host.appendChild(createModuleIdentityPanel(item));"));
assert.ok(app.includes("Enderlik CAN, hasar, bekleme veya enerji avantajı vermez."));
assert.ok(app.includes("item.shared_behavior_tr"));
assert.ok(app.includes("Yetenekler seviye ilerlemesidir, enderlik bonusu değildir."));

// Koyu zeminli içerik kartlarında (tur 4) yazı/zemin kontrastı en az 4.5:1 olmalı.
function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}
function luminance(color) {
  const [r, g, b] = color.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(foreground, background) {
  const [high, low] = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}
function ruleColor(selector, property) {
  // Seçici satır başında aranır; daha uzun bir seçicinin kuyruğu eşleşmez.
  const start = css.lastIndexOf(`
${selector} {`);
  assert.ok(start >= 0, `${selector} kuralı bulunamadı`);
  const body = css.slice(start, css.indexOf("}", start));
  const match = body.match(new RegExp(`(?:^|[;{\\s])${property}:(#[0-9a-fA-F]{6})`));
  assert.ok(match, `${selector} ${property} bulunamadı`);
  return match[1];
}

for (const [label, foreground, background] of [
  ["kimlik etiketi", ruleColor(".module-identity-row > span", "color"), "#10263f"],
  ["kimlik değeri", ruleColor(".module-identity-row > strong", "color"), "#10263f"],
  ["genel kart etiketi", ruleColor(".module-overview-grid span", "color"), "#10263f"],
  ["yetenek alt yazısı", ruleColor(".module-talent-choices button small", "color"), "#143150"],
  ["kullanılamaz yetenek", ruleColor(".module-talent-node .module-talent-choices button.is-unavailable:not(.is-selected)", "color"), "#0c1f35"],
  ["sıfırlama açıklaması", ruleColor(".module-talent-reset-panel > span", "color"), "#2a2110"],
]) {
  assert.ok(contrast(foreground, background) >= 4.5, `${label} kontrastı yetersiz`);
}
// Kullanılamaz yetenek dalı opaklıkla soldurulmaz.
assert.ok(!css.includes(".module-talent-choices button.is-unavailable { opacity:.58"));

console.log("beta72 module identity and contrast contract passed");
