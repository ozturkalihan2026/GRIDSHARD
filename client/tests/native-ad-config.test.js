const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {adTestConfig,adSafetyManifest,adSafetyGradle,DEMO_APP_ID} = require("../../tools/configure-native-ad-safety.js");

test("publisher configuration is explicit, debug/HTTPS-only, identifier-safe and never present in normal builds", t => {
  assert.deepEqual(adTestConfig({}),{mode:"disabled",appId:DEMO_APP_ID,adUnitId:"",testingDevices:[]});
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"gridshard-ad-test-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,"artifacts"));
  const filename=path.join(root,"artifacts","fixture.json");
  const data={appId:"ca-app-pub-1111111111111111~1111111111",adUnitId:"ca-app-pub-1111111111111111/1111111111",testingDevices:["A".repeat(32)]};
  fs.writeFileSync(filename,JSON.stringify(data));
  const env={GRIDSHARD_LOCAL_DEBUG:"1",GRIDSHARD_REMOTE_DEBUG:"1",GRIDSHARD_API_BASE_URL:"https://api.example.test",GRIDSHARD_ADMOB_TEST_CONFIG:filename};
  assert.equal(adTestConfig(env,root).mode,"test");
  for(const bad of [{GRIDSHARD_LOCAL_DEBUG:"0"},{GRIDSHARD_REMOTE_DEBUG:"0"},{GRIDSHARD_API_BASE_URL:"http://api.example.test"}]) assert.throws(()=>adTestConfig({...env,...bad},root));
  fs.writeFileSync(filename,JSON.stringify({...data,testingDevices:[]}));
  assert.equal(adTestConfig(env,root).mode,"ump-only");
  for(const bad of [{testingDevices:["raw-device-identifier"]},{adUnitId:"ca-app-pub-2222222222222222/1111111111"},{secret:"forbidden"}]) {
    fs.writeFileSync(filename,JSON.stringify({...data,...bad}));assert.throws(()=>adTestConfig(env,root));
  }
});

test("unknown-age manifest removes advertising permissions and defers app measurement; transforms are idempotent", () => {
  const initial='<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application></application></manifest>';
  const once=adSafetyManifest(initial);
  assert.equal(adSafetyManifest(once),once);
  assert.match(once,/DELAY_APP_MEASUREMENT_INIT" android:value="true"/);
  for(const p of ["AD_ID","ACCESS_ADSERVICES_AD_ID","ACCESS_ADSERVICES_ATTRIBUTION","ACCESS_ADSERVICES_TOPICS"]) assert.match(once,new RegExp(`${p}" tools:node="remove"`));
  assert.equal(adSafetyGradle(adSafetyGradle("plugins {}\n")),adSafetyGradle("plugins {}\n"));
  const java=fs.readFileSync("../tools/native-templates/GridshardAdSafety.java","utf8");
  assert.match(java,/isTestDevice\(getContext\(\)\)/);assert.match(java,/FLAG_DEBUGGABLE/);
  assert.match(java,/com\.gridshard\.remotedebug/);assert.match(java,/TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE/);
  assert.match(java,/verifyLiveBuild[\s\S]*?FLAG_DEBUGGABLE\) != 0[\s\S]*?!"live"\.equals\(resource\("mode"\)\)/);
  assert.doesNotMatch(java,/RewardedAd\.load|\.show\(|Log\./);
});
