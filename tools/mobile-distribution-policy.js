"use strict";

// Release policy, not a runtime flag. Production has no environment opt-out.
// Keep legacy sources/dependencies available for historical builds.
const policy = require("../config/mobile-distribution.json");

function versionParts(value) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error("Mobile distribution requires a canonical release version.");
  }
  return value.split(".").map(Number);
}

function withoutMonetization(version) {
  const actual = versionParts(version);
  const first = versionParts(policy.without_monetization_from);
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== first[i]) return actual[i] > first[i];
  }
  return true;
}

function packagedScripts(inputs, version) {
  return withoutMonetization(version)
    ? inputs.filter(input => input !== "./src/native-store.js") : inputs;
}

module.exports = {policy, withoutMonetization, packagedScripts};
