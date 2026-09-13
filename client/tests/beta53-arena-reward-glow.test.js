const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

const homeArena = app.match(
  /function renderHomeArena\(\)[\s\S]*?function showCollectionQuickActions/
)?.[0] || "";

assert.ok(homeArena.includes("node.claimable === true"));
assert.ok(homeArena.includes("node.claimed !== true"));
assert.ok(homeArena.includes("Object.keys(node.rewards || {}).length > 0"));
assert.ok(homeArena.includes('classList.toggle("is-reward-ready", hasClaimableRoadReward)'));
assert.match(
  css,
  /\.home-arena-card:not\(\.is-reward-ready\)[\s\S]*animation:none !important;[\s\S]*filter:none !important;/
);
assert.match(
  css,
  /\.home-arena-card\.is-reward-ready[\s\S]*border-color:#ffe16d !important;[\s\S]*animation:gs-arena-reward-ready/
);

console.log("beta53 arena reward glow contract passed");
