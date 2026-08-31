const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const audio = fs.readFileSync("./src/gridshard-audio.js", "utf8");
const events = fs.readFileSync("./src/battle/battle-event-bus.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");

assert.ok(html.includes('./src/battle/battle-event-bus.js'));
assert.ok(events.includes('GAME_EFFECT: "game_effect"'));
assert.ok(events.includes("class GridshardBattleEffectAggregator"));
assert.ok(events.includes("windowMs = 900"));
assert.ok(app.includes("battleEffectAggregator.ingest"));
assert.ok(app.includes('chip.dataset.lane = String(eventResult.lane || 0)'));
assert.ok(css.includes("--feedback-lane-offset"));

assert.ok(events.includes("class GridshardAudioStateOwner"));
assert.ok(app.includes('requestOwnedAudioState("audio_director_ready"'));
assert.ok(app.includes('setTerminalAudioState(outcome, "online_match_finished")'));
assert.ok(audio.includes("bindUserGestureUnlock"));
assert.ok(audio.includes("playbackStatus()"));

assert.ok(events.includes("class GridshardBoosterTargetMode"));
assert.ok(app.includes('cancelBoosterTargeting("normal_module_click")'));
assert.ok(app.includes('cancelBoosterTargeting("escape_key")'));
assert.ok(app.includes('cancelBoosterTargeting("empty_battle_area")'));
assert.ok(app.includes("tryApplySelectedBooster(module)"));

assert.ok(app.includes("BOOSTER_OPTIONS_PER_OFFER = 3"));
assert.ok(app.includes("getBattleEventState:() =>"));

console.log("beta38.1 battle event regression test passed");
