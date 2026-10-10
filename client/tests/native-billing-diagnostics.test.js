"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {ORIGINAL,MANAGED,billingDiagnosticsSource,configureNativeBilling} = require("../../tools/configure-native-billing.js");
const root = path.resolve(__dirname,"../..");
const helper = fs.readFileSync(path.join(root,"tools/native-templates/GridshardBillingDiagnostics.java"),"utf8");
function temporary(t) {
  const tmp=fs.realpathSync(os.tmpdir());
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(tmp,"gridshard-billing-test-")));
  t.after(()=>{
    const relative=path.relative(tmp,fs.realpathSync(directory));
    assert.ok(relative.startsWith("gridshard-billing-test-") && !relative.includes(path.sep));
    fs.rmSync(directory,{recursive:true,force:true});
  });
  return directory;
}

test("managed product diagnostics patch is exact, idempotent and rejects template drift",()=>{
  const source=`before\n${ORIGINAL}\nafter\n`;
  const once=billingDiagnosticsSource(source);
  assert.equal(once,`before\n${MANAGED}\nafter\n`);
  assert.equal(billingDiagnosticsSource(once),once);
  assert.equal(billingDiagnosticsSource(source.replace(/\n/g,"\r\n")),once);
  for (const bad of ["unreviewed",source+source,once+once,once.replace(".report(",".unsafeReport(")]) {
    assert.throws(()=>billingDiagnosticsSource(bad));
  }
  assert.doesNotMatch(once,/getDebugMessage/);
});

test("fresh pinned dependencies receive reproducible diagnostic sources without a pnpm-store inode write",t=>{
  const directory=temporary(t);
  const dependency=path.join(directory,"node_modules/@capgo/native-purchases");
  const java=path.join(dependency,"android/src/main/java/ee/forgr/nativepurchases");
  fs.mkdirSync(java,{recursive:true});fs.mkdirSync(path.join(directory,"tools/native-templates"),{recursive:true});
  const plugin=path.join(java,"NativePurchasesPlugin.java");
  fs.writeFileSync(path.join(dependency,"package.json"),JSON.stringify({version:"8.8.1"}));
  fs.writeFileSync(path.join(dependency,"android/build.gradle"),'def billing_version = "9.1.0"\n');
  fs.writeFileSync(path.join(directory,"tools/native-templates/GridshardBillingDiagnostics.java"),helper);
  const shared=path.join(directory,"shared-store-fixture.java");
  fs.writeFileSync(shared,ORIGINAL);fs.linkSync(shared,plugin);
  configureNativeBilling(directory);
  assert.equal(fs.readFileSync(shared,"utf8"),ORIGINAL,"hard-linked pnpm store must remain untouched");
  assert.equal(fs.readFileSync(plugin,"utf8"),MANAGED);
  assert.equal(fs.readFileSync(path.join(java,"GridshardBillingDiagnostics.java"),"utf8"),helper);
  configureNativeBilling(directory);assert.equal(fs.readFileSync(plugin,"utf8"),MANAGED);
  assert.equal(fs.readdirSync(java).some(name=>name.endsWith(".tmp")),false);
  fs.writeFileSync(path.join(dependency,"package.json"),JSON.stringify({version:"8.9.0"}));
  assert.throws(()=>configureNativeBilling(directory),/reviewed/);
  fs.writeFileSync(path.join(dependency,"package.json"),JSON.stringify({version:"8.8.1"}));
  fs.writeFileSync(path.join(dependency,"android/build.gradle"),'def billing_version = "9.2.0"');
  assert.throws(()=>configureNativeBilling(directory),/Unreviewed/);
});

test("Android sync always regenerates the pinned helper, with no pricing or purchase authority",()=>{
  const sync=fs.readFileSync(path.join(root,"tools/configure-native-orientation.js"),"utf8");
  assert.match(sync,/configureNativeBilling\(root\)/);
  assert.match(helper,/getUnfetchedProductList\(\)/);
  assert.match(helper,/KNOWN_PRODUCTS\.contains\(product\.getProductId\(\)\)/);
  assert.match(helper,/ProductType\.INAPP\.equals\(product\.getProductType\(\)\)/);
  assert.doesNotMatch(helper,/getDebugMessage\(|\.toString\(|getOfferToken\(|getPurchaseToken\(|getAccountIdentifiers\(|launchBillingFlow\(|consumeAsync\(|acknowledgePurchase\(/);
  assert.equal((helper.match(/"gridshard\.[a-z0-9_]+"/g)||[]).length,10);
});

test("Java diagnostic helper emits only numeric summaries and allowlisted INAPP failure codes",t=>{
  const extension=process.platform==="win32"?".exe":"";
  const candidates=[process.env.JAVA_HOME && path.join(process.env.JAVA_HOME,"bin"),
    process.platform==="win32" && path.join(process.env.ProgramFiles||"C:/Program Files","Android/Android Studio/jbr/bin")].filter(Boolean);
  const bin=candidates.find(candidate=>fs.existsSync(path.join(candidate,`javac${extension}`)));
  const javac=bin?path.join(bin,`javac${extension}`):"javac";
  const java=bin?path.join(bin,`java${extension}`):"java";
  const available=spawnSync(javac,["-version"],{encoding:"utf8"});
  if (available.error) {t.skip("JDK unavailable; real Android compile remains a required release gate");return;}
  const directory=temporary(t),sources=[];
  function write(name,source) {
    const filename=path.join(directory,name);fs.mkdirSync(path.dirname(filename),{recursive:true});
    fs.writeFileSync(filename,source);sources.push(filename);
  }
  write("android/util/Log.java",'package android.util; public class Log { public static final java.util.List<String> lines = new java.util.ArrayList<>(); public static int d(String tag,String message) { if (!tag.equals("GridshardBilling")) throw new AssertionError(); lines.add(message); return 0; } }');
  write("com/android/billingclient/api/BillingClient.java",'package com.android.billingclient.api; public class BillingClient { public static class ProductType { public static final String INAPP="inapp"; } }');
  write("com/android/billingclient/api/BillingResult.java",'package com.android.billingclient.api; public class BillingResult { public int getResponseCode(){return 0;} public String getDebugMessage(){throw new AssertionError("Must never read free-form SDK text");} }');
  write("com/android/billingclient/api/UnfetchedProduct.java",'package com.android.billingclient.api; public class UnfetchedProduct { final String id,type;final int status;public UnfetchedProduct(String i,String t,int s){id=i;type=t;status=s;}public String getProductId(){return id;}public String getProductType(){return type;}public int getStatusCode(){return status;}public String toString(){throw new AssertionError();} }');
  write("com/android/billingclient/api/QueryProductDetailsResult.java",'package com.android.billingclient.api; public class QueryProductDetailsResult { final java.util.List<UnfetchedProduct> list;public QueryProductDetailsResult(java.util.List<UnfetchedProduct> l){list=l;}public java.util.List<Object> getProductDetailsList(){return java.util.Collections.emptyList();}public java.util.List<UnfetchedProduct> getUnfetchedProductList(){return list;} }');
  write("ee/forgr/nativepurchases/GridshardBillingDiagnostics.java",helper);
  write("ee/forgr/nativepurchases/DiagnosticContract.java",`package ee.forgr.nativepurchases;
    import com.android.billingclient.api.*;
    public class DiagnosticContract {
      public static void main(String[] args) {
        GridshardBillingDiagnostics.report(new BillingResult(),new QueryProductDetailsResult(java.util.Arrays.asList(
          new UnfetchedProduct("gridshard.flux_120","inapp",3),
          new UnfetchedProduct("unknown-fixture-sensitive-value","inapp",99),
          new UnfetchedProduct("gridshard.flux_120","subs",99))));
        if (!android.util.Log.lines.equals(java.util.Arrays.asList("query code=0 fetched=0 unfetched=3","unfetched product=gridshard.flux_120 status=3"))) throw new AssertionError();
        android.util.Log.lines.clear();
        GridshardBillingDiagnostics.report(new BillingResult(),new QueryProductDetailsResult(java.util.Collections.emptyList()));
        if (!android.util.Log.lines.equals(java.util.Collections.singletonList("query code=0 fetched=0 unfetched=0"))) throw new AssertionError();
        System.out.println("safe diagnostic contract passed");
      }
    }`);
  const compile=spawnSync(javac,["-encoding","UTF-8","-d",directory,...sources],{encoding:"utf8",timeout:30000});
  assert.equal(compile.status,0,compile.stderr);
  const run=spawnSync(java,["-cp",directory,"ee.forgr.nativepurchases.DiagnosticContract"],{encoding:"utf8",timeout:10000});
  assert.equal(run.status,0,run.stderr);assert.equal(run.stdout.trim(),"safe diagnostic contract passed");
});
