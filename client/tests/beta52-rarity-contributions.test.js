const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(app.includes('event?.type === "module_contribution"'));
assert.ok(app.includes('enerji:"energy"'));
assert.ok(app.includes('savunma:"defense"'));
assert.ok(app.includes('sabotaj:"sabotage"'));
assert.ok(app.includes('unit === "percent" ? "%" : ""'));
assert.ok(app.includes('Number(item.energy_saved || 0)'));
assert.ok(app.includes('Number(item.support_value || 0)'));
assert.ok(app.includes('Number(item.control_seconds || 0)'));
assert.ok(app.includes('["Nadirlik avantajı", rarityImpact]'));
assert.ok(app.includes('`Rol etkisi ${rarityPercent(rarityBonuses.effect)}`'));
assert.ok(css.includes("font-size:.68rem !important"));

console.log("beta52 rarity and module contribution contract passed");
