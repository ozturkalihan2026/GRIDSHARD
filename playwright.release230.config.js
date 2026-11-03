const {defineConfig}=require('@playwright/test');
const base=require('./playwright.release221.config');
module.exports=defineConfig({...base,
  testMatch:/(liveops-cosmetics|release221-social|navigation-back)\.spec\.js/,
  outputDir:'artifacts/release-230-v14-20261103/browser',
  reporter:[['line'],['json',{outputFile:'artifacts/release-230-v14-20261103/browser-results.json'}]],
});
