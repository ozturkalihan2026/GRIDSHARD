// One authentic battle screenshot, isolated accounts/server, no video recorder.
const path=require('node:path'),base=require('../playwright.config');
module.exports={...base,testDir:path.resolve(__dirname,'../e2e'),timeout:180000,
  reporter:[['line']],outputDir:path.resolve(__dirname,'../artifacts/play-store-battle-20261025/test-output'),
  webServer:{...base.webServer,cwd:path.resolve(__dirname,'../server')},
  use:{...base.use,viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,
    trace:'off',video:'off',screenshot:'only-on-failure',channel:'chrome'},
  projects:[{name:'store-battle',testMatch:/store-battle-capture\.spec\.js/}]};
