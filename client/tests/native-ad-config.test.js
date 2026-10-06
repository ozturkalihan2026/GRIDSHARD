const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {adTestConfig,adBuildConfig,adSafetyManifest,adSafetyGradle,DEMO_APP_ID,STARTUP_META_DATA} = require("../../tools/configure-native-ad-safety.js");

test("production ads require explicit canonical HTTPS build and cannot promote a debug package", () => {
  const root = path.resolve("..");
  const env = {GRIDSHARD_ANDROID_PRODUCTION:"1",GRIDSHARD_APP_ID:"com.gridshardgame.app",
    GRIDSHARD_API_BASE_URL:"https://play.gridshardgame.com"};
  const config = adBuildConfig(env,root);
  assert.equal(config.mode,"live"); assert.deepEqual(config.testingDevices,[]);
  assert.notEqual(config.appId,DEMO_APP_ID);
  for (const change of [{GRIDSHARD_LOCAL_DEBUG:"1"},{GRIDSHARD_REMOTE_DEBUG:"1"},
      {GRIDSHARD_ADMOB_TEST_CONFIG:"fixture.json"},{GRIDSHARD_APP_ID:"com.gridshard.remotedebug"},
      {GRIDSHARD_API_BASE_URL:"https://other.example.test"},{GRIDSHARD_ALLOW_INSECURE_MOBILE_API:"1"}]) {
    assert.throws(()=>adBuildConfig({...env,...change},root));
  }
  assert.equal(adBuildConfig({}).mode,"disabled");
});

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
  // Bildirim altyapısı açılışta kendiliğinden başlamaz; oyuncu bildirimi açınca eklenti başlatır.
  assert.match(once,/firebase_messaging_auto_init_enabled" android:value="false"/);
  assert.match(once,/firebase_analytics_collection_enabled" android:value="false"/);
  // Elle açılmış bir ayar derlemede yeniden kapatılır ve tek kayıt kalır.
  const reopened=adSafetyManifest(once.replace('firebase_messaging_auto_init_enabled" android:value="false"','firebase_messaging_auto_init_enabled" android:value="true"'));
  assert.equal(reopened,once);
  for(const [name] of STARTUP_META_DATA) assert.equal(once.split(`android:name="${name}"`).length,2,name);
  // Depodaki manifest aracın çıktısıyla aynıdır.
  const committed=fs.readFileSync("../android/app/src/main/AndroidManifest.xml","utf8").replace(/\r\n/g,"\n");
  assert.equal(adSafetyManifest(committed),committed);
  const push=fs.readFileSync("../node_modules/@capacitor/push-notifications/android/src/main/java/com/capacitorjs/plugins/pushnotifications/PushNotificationsPlugin.java","utf8");
  assert.match(push,/public void register\(PluginCall call\) \{\s*FirebaseMessaging\.getInstance\(\)\.setAutoInitEnabled\(true\);/);
  for(const p of ["AD_ID","ACCESS_ADSERVICES_AD_ID","ACCESS_ADSERVICES_ATTRIBUTION","ACCESS_ADSERVICES_TOPICS"]) assert.match(once,new RegExp(`${p}" tools:node="remove"`));
  assert.equal(adSafetyGradle(adSafetyGradle("plugins {}\n")),adSafetyGradle("plugins {}\n"));
  const java=fs.readFileSync("../tools/native-templates/GridshardAdSafety.java","utf8");
  assert.match(java,/isTestDevice\(getContext\(\)\)/);assert.match(java,/FLAG_DEBUGGABLE/);
  assert.match(java,/com\.gridshard\.remotedebug/);assert.match(java,/TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE/);
  assert.match(java,/verifyLiveBuild[\s\S]*?FLAG_DEBUGGABLE\) != 0[\s\S]*?!"live"\.equals\(resource\("mode"\)\)/);
  assert.doesNotMatch(java,/RewardedAd\.load|\.show\(|Log\./);
});
