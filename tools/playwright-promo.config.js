// Real gameplay, owned local server and temporary guest. Never a production account.
const path=require('node:path');
const base=require('../playwright.config');
module.exports={...base,testDir:path.resolve(__dirname,'../e2e'),timeout:180000,
  reporter:[['line']],outputDir:path.resolve(__dirname,'../artifacts/promo-20261023/test-output'),
  webServer:{...base.webServer,cwd:path.resolve(__dirname,'../server')},
  use:{...base.use,viewport:{width:540,height:960},deviceScaleFactor:2,isMobile:true,hasTouch:true,
    trace:'off',video:{mode:'on',size:{width:540,height:960}},screenshot:'only-on-failure',channel:'chrome'},
  projects:[{name:'promo-capture',testMatch:/promo-capture\.spec\.js/}],
};
