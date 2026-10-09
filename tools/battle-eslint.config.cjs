"use strict";

const fs = require("node:fs");
const path = require("node:path");
const globals = require("globals");
const sourceRoot = path.join(__dirname, "..", "client", "src");
const shared = {};
// The source build uses classic scripts with explicitly published APIs.
// Recognize those API names, not all lexical names (which would hide typos).
function collectPublished(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collectPublished(file);
    else if (entry.name.endsWith(".js")) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/\b(?:global|globalThis|window)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) shared[match[1]] = "readonly";
    }
  }
}
collectPublished(sourceRoot);

module.exports = [{
  files:["client/src/battle/*.js", "client/src/app.js", "client/src/relay-client.js", "client/src/gridshard-audio.js"],
  languageOptions:{ecmaVersion:2022, sourceType:"script", globals:{...globals.browser, ...globals.commonjs, ...shared}},
  rules:{
    "no-undef":"error", "no-unreachable":"error", "no-dupe-args":"error",
    "no-dupe-keys":"error", "no-duplicate-case":"error", "no-unsafe-finally":"error",
    "no-constant-condition":["error", {checkLoops:false}], "no-async-promise-executor":"error",
    "no-promise-executor-return":"error", "no-loss-of-precision":"error",
    "valid-typeof":"error", "use-isnan":"error", "no-self-assign":"error",
    "no-unused-vars":["warn", {args:"none", caughtErrors:"none", varsIgnorePattern:"^_"}],
  },
}];
