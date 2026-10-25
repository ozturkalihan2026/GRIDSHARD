const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const app = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

test("entering an online or local battlefield does not trigger a fake production SFX", () => {
  const online = app.slice(app.indexOf("  function renderOnlinePlayStatus("), app.indexOf("  const onlinePlay ="));
  const localEnd = app.indexOf('requestOwnedAudioState("local_battle_started")');
  assert.ok(online.includes("if (battleJustStarted)"));
  assert.doesNotMatch(online, /triggerGridshardCue\(/);
  assert.ok(localEnd > 0);
  assert.doesNotMatch(app.slice(localEnd, app.indexOf("createEnemyBoard();",localEnd)), /triggerGridshardCue\(/);
  // Remove the two entry calls, not the cue itself or meaningful reward/ready cues.
  assert.equal((app.match(/triggerGridshardCue\("energy_transfer"\)/g) || []).length, 2);
  assert.match(app, /event\?\.type === "core_power_ready"[\s\S]{0,280}triggerGridshardCue\("energy_transfer"\)/);
});
