const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(app.includes('if (powerId === "core_quantum") return "hybrid"'));
assert.ok(app.includes("data.effect_kind || corePowerEffect(data.power_id)"));
assert.ok(app.includes('event?.type === "core_effect_applied"'));
assert.ok(app.includes('variant:"defense"'));
assert.ok(app.includes('variant:"sabotage"'));
assert.ok(app.includes('variant:"attack"'));
assert.ok(app.includes('variant:"energy"'));

assert.ok(!app.includes('badge.className="energy-flow-badge"'));
assert.ok(!app.includes('powered ? "⚡" : "×"'));

assert.ok(app.includes('bar.setAttribute("role", "progressbar")'));
assert.ok(app.includes('bar.setAttribute("aria-valuenow"'));
assert.ok(css.includes('.board[data-core-wave-effect="hybrid"]'));
assert.ok(css.includes('.battle-floating-feedback.attack { color:#ff6677'));
assert.ok(css.includes('.battle-floating-feedback.energy { color:#57f5e2'));
assert.ok(css.includes('.board-cell[data-occupied="true"] > .module-card > .hp-bar'));

console.log("beta51 core feedback and battle hp contract passed");
