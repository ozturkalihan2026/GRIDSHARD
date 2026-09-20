"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(html.includes('gridshard-favicon-32.png?v=beta66'));
assert.ok(html.includes('gridshard-favicon-192.png?v=beta66'));
assert.ok(fs.existsSync("./assets/branding/gridshard-favicon-32.png"));
assert.ok(fs.existsSync("./assets/branding/gridshard-favicon-192.png"));

assert.ok(html.includes("<span><b>HASAR</b></span>"));
assert.ok(css.includes(".daily-meta-wheel-labels span > b"));
assert.ok(css.includes("translateY(calc(-1 * var(--wheel-label-radius)))"));
assert.ok(app.includes('selected.effect_tr || ""'));

assert.ok(app.includes('oauthParams.get("oauth_status")'));
assert.ok(app.includes("Yerel geliştirme kodu doğrulama alanına yerleştirildi."));
assert.ok(app.includes('document.getElementById("account-verification-code")'));

console.log("beta66 meta, provider auth and favicon contract passed");
