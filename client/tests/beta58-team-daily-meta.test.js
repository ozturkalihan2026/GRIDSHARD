"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

const tabOrder = ["profile", "members", "requests", "chat", "battle"];
let cursor = -1;
for (const tab of tabOrder) {
  const next = html.indexOf(`data-team-tab="${tab}"`);
  assert.ok(next > cursor, `Takım sekmesi sırası bozuk: ${tab}`);
  cursor = next;
}
assert.ok(html.includes('data-team-tab="profile" class="is-active"'));
assert.ok(app.includes('activeTeamTab = "profile"'));
assert.match(css, /\.team-tabs \{ display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);

assert.ok(app.includes("loadDailyMetaState({ present:true })"));
assert.ok(app.includes('if (dailyMetaState?.requires_roll) event.preventDefault()'));
assert.ok(app.includes("function dailyMetaStopAngle"));
assert.ok(app.includes('wheel?.classList.add("is-spinning")'));
assert.match(css, /1080deg \+ var\(--daily-meta-stop-angle,0deg\)/);
assert.strictEqual((html.match(/<span><b>(HASAR|SAVUNMA|DESTEK|SABOTAJ|SİSTEM|ÇEKİRDEK|AKIM)<\/b><\/span>/g) || []).length, 7);

console.log("beta58 team profile and daily meta contract passed");
