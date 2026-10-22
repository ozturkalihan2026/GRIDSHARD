// Isolated real-game capture, never a live/production account.
const path=require('node:path');
const base=require('../playwright.config');
module.exports={...base,testDir:path.resolve(__dirname,'../e2e'),timeout:120000,
  reporter:[['line']],outputDir:path.resolve(__dirname,'../artifacts/store-2.1.1-20261022/test-output'),
  webServer:{...base.webServer,cwd:path.resolve(__dirname,'../server')},
  use:{...base.use,viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,trace:'off',video:'off',screenshot:'only-on-failure',channel:'chrome'},
  projects:[{name:'store-capture',testMatch:/store-gallery\.spec\.js/}],
};
