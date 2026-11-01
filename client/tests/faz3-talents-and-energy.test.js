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

test("çekirdek yetenekleri modül yetenek ağacıyla aynı tasarımdadır", () => {
  // Görsel tur 6: iki dal ve ortada seviye rozeti; açıklama düğmede değil, dokununca üstte yazar.
  const tab = slice('    } else if (tabName === "skills") {', "      host.appendChild(tree);");
  assert.match(tab, /tree\.className = "module-talent-path core-talent-path";/);
  assert.match(tab, /row\.className = "module-talent-node";/);
  assert.match(tab, /appendTalentCosts\(level, threshold\);/);
  assert.match(tab, /skillName\.textContent = talentDisplayName\(skill\);/);
  assert.match(tab, /skillState\.textContent = state;/);
  assert.match(tab, /intro\.textContent = talentDisplayDescription\(skill\);/);
  assert.match(tab, /const canLearn = coreSkillLearnable\(core, skill\);/);
  assert.match(tab, /if \(!canLearn\) return;/);
  // Seçimden sonra Yetenekler sekmesinde kalınır.
  assert.match(tab, /await mutateSelectedCore\(`skills\/\$\{skill\.id\}`\);[\s\S]*renderCoreDetailTab\("skills"\);/);
  assert.ok(!/skill\.name_tr\}<\/strong>/.test(tab));
  assert.equal(en("EŞİK 2"), "TIER 2");
});

test("current talents retain localized names and specialize the existing job",()=>{
 assert.ok(app.includes('talentDisplayName(choice)'));
 assert.ok(!app.includes('module_talent_triggered'));
 const v7=JSON.parse(read('..','server','data','module_talents_v7.json'));
 assert.equal(Object.keys(v7.modules).length,24);
 for(const m of Object.values(v7.modules))for(const o of m.specializations)assert.ok(o.name_tr&&o.name_en);
});

test("bilgi ekranı gerçek enerji tüketimini, Batarya'da üretimi gösterir",()=>{
  const tiles=app.slice(app.indexOf("  function createModuleStatTiles("),app.indexOf("  function renderModuleDetailTab("));
  assert.doesNotMatch(tiles,/ENERJİ TÜKETİMİ|ENERJİ ÜRETİMİ|ETKİ ÇARPANI/);
  for(const label of ['CAN','HASAR','AKIM MALİYETİ'])assert.ok(tiles.includes(label));
});

test("Akım Desteği metasının açıklaması yeni kuralı anlatır", () => {
  const catalog = globalThis.GridshardI18nCatalog.messages;
  assert.equal(catalog["meta.current_support.description"].tr, "Savaşta Akım bugün daha hızlı yenilenir.");
  assert.equal(catalog["meta.current_support.description"].en, "Current regenerates faster in battle today.");
  assert.equal(catalog["meta.current_support.effect"].tr, "Akım üretimi +%15");
  assert.equal(en("Savaşta Akım bugün daha hızlı yenilenir."), "Current regenerates faster in battle today.");
});

test("every current module and core talent has an English name",()=>{
 const {spawnSync}=require('node:child_process');
 const script="import json;from app.game.module_talents_v3 import tree;from app.module_roster import MODULE_SPECS;from app.meta_progression import CORE_TYPES;from app.game.core_talents_v5 import tree as ct;print(json.dumps([o for k in MODULE_SPECS for tier in tree(k) for o in tier['choices']]+[o for c in CORE_TYPES for o in ct(c['id'],c['rarity'])]))";
 const r=spawnSync('python',['-X','utf8','-c',script],{cwd:path.join(CLIENT_ROOT,'..','server'),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const choices=JSON.parse(r.stdout);assert.equal(choices.length,24*8+7*6);
 for(const o of choices)assert.ok(o.name_tr.trim()&&o.name_en.trim());
});
