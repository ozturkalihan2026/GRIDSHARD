"use strict";

const assert = require("assert");
const fs = require("fs");
const { RelayProgressionClientState } = require("../src/relay-client.js");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");

assert.ok(html.includes('id="post-match-team-point-card"'));
assert.ok(html.includes('id="post-match-accounting-note"'));
assert.ok(app.includes('matchType === "team_tournament"'));
assert.ok(app.includes('["friend_battle", "team_training"]'));
assert.ok(app.includes("Bu antrenman maçı profile, kupaya veya Devre Yolu ilerlemesine etki etmedi."));

const state = new RelayProgressionClientState();
const view = state.applyResult({
  player_id: "a",
  rating_before: 1000,
  rating_after: 1000,
  rating_delta: 0,
  circuit_credits_awarded: 0,
  xp_awarded: 0,
  level_after: 1,
  experience_after: 0,
  match_type: "team_tournament",
  profile_progression_applied: false,
  team_tournament_points_awarded: 1,
  team_tournament_points_after: 4,
});

assert.strictEqual(view.profileProgressionApplied, false);
assert.strictEqual(view.teamTournamentPointsAwarded, 1);
assert.strictEqual(view.teamTournamentPointsAfter, 4);

console.log("beta60 match accounting contract passed");
