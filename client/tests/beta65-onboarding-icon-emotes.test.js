"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const manifest = JSON.parse(fs.readFileSync("./manifest.webmanifest", "utf8"));

assert.ok(html.includes('id="account-onboarding-dialog"'));
assert.ok(html.includes('id="account-onboarding-google"'));
assert.ok(html.includes('id="account-onboarding-apple"'));
assert.ok(html.includes('id="account-onboarding-email"'));
assert.ok(app.includes("function maybePresentAccountOnboarding"));
assert.ok(app.includes("accountHasPersistentIdentity"));
assert.ok(app.includes("finishAccountOnboarding({ dismiss:true })"));
assert.ok(app.includes("loadAccountPlatform({ presentOnboarding:true })"));

assert.ok(html.includes('id="profile-honor-title">DEVRE KOLEKSİYONU'));
assert.ok(!html.includes('id="profile-player-name"'));
assert.ok(!html.includes('id="profile-current-trophies"'));
assert.ok(css.includes(".profile-summary-panel > .profile-identity-card { display:block; }"));

assert.ok(css.includes("daily-meta-label-counter-spin"));
assert.ok(css.includes("var(--label-counter-angle) - var(--daily-meta-stop-angle,0deg)"));
assert.ok(app.includes("function createBattleEmojiVisual"));
assert.ok(app.includes("emoji?.mediaSrc ? \"img\" : \"span\""));
assert.ok(app.includes('dataset.mediaType = /\\.gif'));
assert.ok(app.includes('id:"core_burst"'));
assert.ok(app.includes('id:"glitch_wave"'));

assert.ok(html.includes('rel="manifest" href="./manifest.webmanifest"'));
assert.ok(fs.existsSync("./assets/branding/gridshard-store-icon-1024.png"));
assert.ok(fs.existsSync("./assets/branding/gridshard-store-icon-512.png"));
assert.deepStrictEqual(manifest.icons.map((icon) => icon.sizes), ["512x512", "1024x1024"]);

console.log("beta65 onboarding, wheel, collection, emotes and icon contract passed");
