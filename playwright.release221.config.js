const {defineConfig} = require('@playwright/test');
const base = require('./playwright.config');
module.exports = defineConfig({...base,
  testMatch:'release221-social.spec.js',
  timeout:90000,
  outputDir:'artifacts/release-221-20261102/browser',
  reporter:[['line'],['json',{outputFile:'artifacts/release-221-20261102/browser-results.json'}]],
  projects:[
    {name:'phone-320',use:{viewport:{width:320,height:568},isMobile:true,hasTouch:true,channel:'chrome'}},
    {name:'phone-393',use:{viewport:{width:393,height:852},isMobile:true,hasTouch:true,channel:'chrome'}},
  ],
});
