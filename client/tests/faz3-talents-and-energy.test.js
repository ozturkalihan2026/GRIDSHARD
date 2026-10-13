"use strict";

// Faz 3 (12 Ekim 2026): yetenek ekranı (modül ve çekirdek), savaşta tetiklenen
// yeteneğin gösterimi ve bilgi ekranındaki gerçek enerji tüketimi.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const talentsSource = read("..", "server", "app", "game", "talents.py");
const en = (text) => i18n.translateText(text, "en");

function slice(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start > 0 && end > start, `bölüm bulunamadı: ${startMarker}`);
  return app.slice(start, end);
}

test("yetenek adı ve açıklaması dile göre sunucunun metninden gelir", () => {
  const sandbox = {
    document: { documentElement: { lang: "tr" } },
    localizedUiText: (value) => (sandbox.document.documentElement.lang === "en" ? en(value) : value),
  };
  vm.runInNewContext(`${slice("  function talentDisplayName(choice) {", "  // Beta.72 imza mekaniklerinin yalnız görsel/ses karşılığı olan olayları.")}
Object.assign(this, { talentDisplayName, talentDisplayDescription });`, sandbox);
  const choice = {
    name_tr: "Yayılım Işını", name_en: "Spreading Beam",
    description_tr: "Her 30 saniyede bir…", description_en: "Every 30 sec…",
  };
  assert.equal(sandbox.talentDisplayName(choice), "Yayılım Işını");
  assert.equal(sandbox.talentDisplayDescription(choice), "Her 30 saniyede bir…");
  sandbox.document.documentElement.lang = "en";
  assert.equal(sandbox.talentDisplayName(choice), "Spreading Beam");
  assert.equal(sandbox.talentDisplayDescription(choice), "Every 30 sec…");
  // Eski sunucu İngilizce alan göndermez: Türkçe metin çeviri sözlüğünden geçer.
  assert.equal(sandbox.talentDisplayName({ name_tr: "CAN +%5" }), en("CAN +%5"));
  assert.equal(sandbox.talentDisplayDescription({ name_tr: "CAN +%5" }), en("CAN +%5"));
});

test("yetenek ekranı eşiğin türünü yazar ve dal adını güvenli biçimde basar", () => {
  const tab = slice('    } else if (tabName === "talents") {', "      const selectedCount = Number(");
  assert.match(tab, /if \(node\.kind\) row\.dataset\.kind = node\.kind;/);
  assert.match(tab, /const kindLabel = TALENT_KIND_LABELS\[node\.kind\];/);
  // Etiket dal kutusundan önce eklenir; kutu etiketten önce tanımlanmış olmalıdır.
  assert.ok(tab.indexOf('const choices = document.createElement("div");') < tab.indexOf("row.appendChild(kind);"));
  assert.ok(tab.indexOf("row.appendChild(kind);") < tab.indexOf("row.appendChild(choices);"));
  assert.match(tab, /choiceTitle\.textContent = choiceName;/);
  assert.match(tab, /text\.textContent = talentDisplayDescription\(choice\);/);
  // Sunucudan gelen ad HTML olarak basılmaz.
  assert.ok(!/button\.innerHTML = `<strong>\$\{choice\.name_tr\}/.test(tab));
  assert.match(app, /basic:"TEMEL", signature:"İMZA", tuning:"İNCE AYAR", mastery:"USTALIK",/);
  for (const [label, expected] of [["TEMEL", "BASIC"], ["İMZA", "SIGNATURE"], ["İNCE AYAR", "TUNING"], ["USTALIK", "MASTERY"]]) {
    assert.equal(en(label), expected);
  }
  assert.match(css, /\.module-talent-kind \{[^}]*font:800 \.5rem/);
  assert.match(css, /\.module-talent-node\[data-kind="signature"\] \.module-talent-kind \{/);
});

test("çekirdek yetenek düğmesi adı, durumu ve açıklamayı gösterir", () => {
  const tab = slice('    } else if (tabName === "skills") {', "      host.appendChild(tree);");
  assert.match(tab, /skillName\.textContent = talentDisplayName\(skill\);/);
  assert.match(tab, /skillDescription\.textContent = talentDisplayDescription\(skill\);/);
  assert.match(tab, /button\.disabled = !coreSkillLearnable\(core, skill\);/);
  assert.ok(!/skill\.name_tr\}<\/strong>/.test(tab));
  assert.match(css, /\.core-skill-tree button em \{[^}]*font-size:\.5rem/);
});

test("savaşta tetiklenen modül ve çekirdek yeteneği adıyla gösterilir", () => {
  const types = slice("  const SIGNATURE_EVENT_TYPES = new Set([", "  ]);");
  assert.ok(types.includes('"module_talent_triggered"') && types.includes('"core_talent_triggered"'));
  assert.match(app, /talent:\{ priority:2, lifetimeMs:1100, particles:6, cue:null, minRepeatMs:900 \},/);
  const handler = slice('    } else if (type === "module_talent_triggered") {', '    } else if (type === "attack_windup_started") {');
  assert.match(handler, /emitSignatureBattleEffect\("talent", own\(data\.module_id\), \{/);
  assert.match(handler, /type === "core_talent_triggered"/);
  assert.match(handler, /talentDisplayName\(data\)\.toLocaleUpperCase\(uiLocale\(\)\)/);
  assert.match(css, /\.battle-effect-layer \[data-signature="talent"\] \{ --signature-color:#ffe98a;/);
});

test("bilgi ekranı gerçek enerji tüketimini, Batarya'da üretimi gösterir", () => {
  const tiles = slice("  function createModuleStatTiles(item) {", "      row.dataset.stat = tile.key;");
  assert.match(tiles, /Number\(stats\.energy_generation\) > 0/);
  assert.match(tiles, /label:"ENERJİ ÜRETİMİ", value:`\+\$\{number\(stats\.energy_generation, 1\)\}\/sn`/);
  // Eski sunucu yeni alanı göndermez; o zaman bakım değeri yazılır.
  assert.match(tiles, /number\(stats\.energy_per_second \?\? stats\.energy_consumption, 1\)/);
  assert.equal(en("ENERJİ ÜRETİMİ"), "ENERGY OUTPUT");
  assert.equal(en("ENERJİ TÜKETİMİ"), "ENERGY USE");
});

test("Akım Desteği metasının açıklaması yeni kuralı anlatır", () => {
  const catalog = globalThis.GridshardI18nCatalog.messages;
  assert.equal(catalog["meta.current_support.description"].tr, "Savaşta Akım bugün daha hızlı yenilenir.");
  assert.equal(catalog["meta.current_support.description"].en, "Current regenerates faster in battle today.");
  assert.equal(catalog["meta.current_support.effect"].tr, "Akım üretimi +%15");
  assert.equal(en("Savaşta Akım bugün daha hızlı yenilenir."), "Current regenerates faster in battle today.");
});

test("sunucudaki her yeteneğin İngilizce adı vardır", () => {
  // talents.py içindeki tanımlar: _signature("kanca", "Türkçe ad", "English name", …)
  const names = [...talentsSource.matchAll(/_(?:signature|core_talent)\("[a-z_]+", "([^"]+)", "([^"]+)"/g)];
  assert.equal(names.length, 36 * 2 + 7 * 6);
  for (const [, nameTr, nameEn] of names) {
    assert.ok(nameTr.trim() && nameEn.trim());
    assert.ok(/^[\x20-\x7E]+$/.test(nameEn), `İngilizce ad ASCII değil: ${nameEn}`);
  }
});
