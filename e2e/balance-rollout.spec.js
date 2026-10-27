const {test,expect}=require('@playwright/test');
const {balancePanels}=require('./balance-ui-checks');

for(const width of [320,393])test(`36-card balance values and new status panels fit ${width}px phones`,async({page},info)=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const rows=await balancePanels(page,{widths:[width],screenshotDir:info.outputPath('balance-panels')});
  await info.attach('36-authoritative-card-values',{body:JSON.stringify(rows),contentType:'application/json'});
  expect(errors).toEqual([]);
});
