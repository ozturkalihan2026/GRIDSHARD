const {defineConfig}=require('@playwright/test');
const base=require('./playwright.release221.config');
module.exports=defineConfig({...base,
  testMatch:/(liveops-cosmetics|release221-social)\.spec\.js/,
  outputDir:'artifacts/release-230-20261103/browser',
  reporter:[['line'],['json',{outputFile:'artifacts/release-230-20261103/browser-results.json'}]],
});
