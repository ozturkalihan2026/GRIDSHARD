const {defineConfig} = require('@playwright/test');
const base = require('./playwright.release221.config');
module.exports = defineConfig({...base,
  testMatch:'liveops-cosmetics.spec.js',
  outputDir:'artifacts/liveops-foundations-20261102/browser',
  reporter:[['line'],['json',{outputFile:'artifacts/liveops-foundations-20261102/browser-results.json'}]],
});
