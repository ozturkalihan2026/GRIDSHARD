"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const audio = fs.readFileSync("./src/gridshard-audio.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");

assert.ok(app.includes('kind:"use_booster"'));
assert.ok(app.includes("offer_id:serverBoosterOfferId"));
assert.ok(app.includes("eligible_target_module_ids"));
assert.ok(app.includes("isBoosterTargetEligible"));
assert.ok(!app.includes('kind:"select_booster"'));
assert.ok(!app.includes('kind:"apply_booster"'));
assert.ok(css.includes(".module-card.booster-target-ineligible"));
assert.ok(css.includes("gs-booster-eligible-pulse"));
assert.ok(html.includes('id="tier-celebration"'));
assert.ok(app.includes('triggerGridshardCue("tier_up")'));
assert.ok(audio.includes('tier_up.wav'));
assert.ok(css.includes("explosion-shockwave-secondary"));
assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"));
assert.ok(css.includes("text-transform:uppercase"));

console.log("beta35 client experience test passed");
