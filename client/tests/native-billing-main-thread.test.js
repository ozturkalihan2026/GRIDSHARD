"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {FLOW_MARKER,FLOW_ORIGINAL,FLOW_MANAGED,billingMainThreadSource} = require("../../tools/configure-native-billing.js");

test("Billing main-thread patch changes only launch dispatch, is idempotent and fails closed on drift",()=>{
  const before="unchanged product/offer/account construction\n",after="\nunchanged receipt callback";
  const original=before+FLOW_ORIGINAL+after,managed=before+FLOW_MANAGED+after;
  assert.equal(billingMainThreadSource(original),managed);
  assert.equal(billingMainThreadSource(managed),managed);
  assert.equal(billingMainThreadSource(original.replace(/\n/g,"\r\n")),managed);
  for(const malformed of ["unknown source",original+original,managed+managed,
    managed.replace("runOnUiThread", "unexpectedDispatcher"),
    managed.replace("billingActivity, billingFlowParams", "billingActivity, alteredParams"),
    original+"\nbillingClient.launchBillingFlow(otherActivity, alteredParams);",
    original+"\n"+FLOW_MARKER]) assert.throws(()=>billingMainThreadSource(malformed));
  assert.match(FLOW_MANAGED,/final android\.app\.Activity billingActivity = getActivity\(\)/);
  assert.doesNotMatch(FLOW_MANAGED,/setOfferToken|setObfuscatedAccountId|consumeAsync|acknowledgePurchase|call\.resolve|call\.reject|premium_policy/);
});

test("managed native launch dispatches once on UI, preserves Activity/params and leaves launch results unchanged",t=>{
  // JVM contract with a queued Activity stub, not an Android/Google purchase.
  const extension=process.platform==="win32"?".exe":"";
  const candidates=[process.env.JAVA_HOME&&path.join(process.env.JAVA_HOME,"bin"),
    process.platform==="win32"&&path.join(process.env.ProgramFiles||"C:/Program Files","Android/Android Studio/jbr/bin")].filter(Boolean);
  const bin=candidates.find(candidate=>fs.existsSync(path.join(candidate,`javac${extension}`)));
  const javac=bin?path.join(bin,`javac${extension}`):"javac",java=bin?path.join(bin,`java${extension}`):"java";
  if(spawnSync(javac,["-version"],{encoding:"utf8"}).error){t.skip("JDK unavailable; native compile and device test remain required");return;}
  const tmp=fs.realpathSync(os.tmpdir());
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(tmp,"gridshard-billing-main-test-")));
  t.after(()=>{
    const relative=path.relative(tmp,fs.realpathSync(directory));
    assert.ok(relative.startsWith("gridshard-billing-main-test-")&&!relative.includes(path.sep));
    fs.rmSync(directory,{recursive:true,force:true});
  });
  const sources=[];
  function write(name,source){const filename=path.join(directory,name);fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,source);sources.push(filename);}
  write("android/app/Activity.java",`package android.app;
    public class Activity {
      public final Thread uiThread=Thread.currentThread();
      private final java.util.Queue<Runnable> pending=new java.util.concurrent.ConcurrentLinkedQueue<>();
      public int scheduled=0;
      public void runOnUiThread(Runnable work){if(Thread.currentThread()==uiThread)work.run();else{scheduled++;pending.add(work);}}
      public void drain(){if(Thread.currentThread()!=uiThread)throw new AssertionError("Not UI thread");Runnable work;while((work=pending.poll())!=null)work.run();}
    }`);
  write("android/util/Log.java",`package android.util;
    public class Log {public static final java.util.List<String> lines=new java.util.ArrayList<>();
      public static int d(String tag,String message){lines.add(message);return 0;}public static int i(String tag,String message){lines.add(message);return 0;}}
  `);
  write("BillingResult.java",`public class BillingResult {private final int code;public BillingResult(int c){code=c;}public int getResponseCode(){return code;}public String getDebugMessage(){return "fixture";}}`);
  write("BillingFlowParams.java",`public class BillingFlowParams {public final String product;public BillingFlowParams(String p){product=p;}}`);
  write("BillingClient.java",`public class BillingClient {
    public final android.app.Activity expectedActivity;public final BillingFlowParams expectedParams;public final int code;public int launches=0;
    public BillingClient(android.app.Activity a,BillingFlowParams p,int c){expectedActivity=a;expectedParams=p;code=c;}
    public BillingResult launchBillingFlow(android.app.Activity a,BillingFlowParams p){
      if(Thread.currentThread()!=a.uiThread||a!=expectedActivity||p!=expectedParams)throw new AssertionError("Wrong thread/Activity/params");launches++;return new BillingResult(code);}
  }`);
  write("NativePurchasesPlugin.java",`import android.util.Log; public class NativePurchasesPlugin {
    public static final String TAG="fixture";final android.app.Activity activity;final BillingClient billingClient;final BillingFlowParams billingFlowParams;
    public NativePurchasesPlugin(android.app.Activity a,BillingClient b,BillingFlowParams p){activity=a;billingClient=b;billingFlowParams=p;}
    public android.app.Activity getActivity(){return activity;}
    public void purchaseCallback(){${FLOW_MANAGED}}
    public void originalPurchaseCallback(){${FLOW_ORIGINAL}}
  }`);
  write("MainThreadContract.java",`public class MainThreadContract {
    public static void main(String[] args)throws Exception{
      // Negative control: the original worker-thread launch must fail this
      // exact contract, otherwise the test would not detect the observed bug.
      android.app.Activity oldActivity=new android.app.Activity();BillingFlowParams oldParams=new BillingFlowParams("gridshard.flux_120");
      BillingClient oldClient=new BillingClient(oldActivity,oldParams,0);NativePurchasesPlugin oldPlugin=new NativePurchasesPlugin(oldActivity,oldClient,oldParams);
      final java.util.concurrent.atomic.AtomicReference<Throwable> originalFailure=new java.util.concurrent.atomic.AtomicReference<>();
      Thread originalWorker=new Thread(()->{try{oldPlugin.originalPurchaseCallback();}catch(Throwable error){originalFailure.set(error);}});
      originalWorker.start();originalWorker.join();if(!(originalFailure.get() instanceof AssertionError)||oldClient.launches!=0)throw new AssertionError("Original launch did not violate fixture contract");
      String[] products={"gridshard.season_pass_premium","gridshard.battle_rewards_premium","gridshard.flux_120","gridshard.flux_260","gridshard.flux_480","gridshard.flux_1050","gridshard.credits_1000","gridshard.credits_2200","gridshard.credits_4000","gridshard.credits_9000"};
      for(String product:products)for(int code:new int[]{0,1,4,7})for(boolean worker:new boolean[]{false,true}){
        android.util.Log.lines.clear();android.app.Activity activity=new android.app.Activity();BillingFlowParams params=new BillingFlowParams(product);
        BillingClient client=new BillingClient(activity,params,code);NativePurchasesPlugin plugin=new NativePurchasesPlugin(activity,client,params);
        final java.util.concurrent.atomic.AtomicReference<Throwable> failure=new java.util.concurrent.atomic.AtomicReference<>();
        if(worker){Thread thread=new Thread(()->{try{plugin.purchaseCallback();}catch(Throwable error){failure.set(error);}});thread.start();thread.join();
          if(failure.get()!=null)throw new AssertionError(failure.get());if(client.launches!=0||activity.scheduled!=1)throw new AssertionError("Did not queue exactly once");activity.drain();
        }else{plugin.purchaseCallback();if(activity.scheduled!=0)throw new AssertionError("UI caller should execute directly");}
        activity.drain();if(client.launches!=1)throw new AssertionError("Duplicate or missing launch");
        if(!android.util.Log.lines.get(1).equals("Billing flow launch result: "+code+" - fixture"))throw new AssertionError("Launch result changed");
      }
      System.out.println("80 main-thread launch contracts passed");
    }
  }`);
  const compile=spawnSync(javac,["-encoding","UTF-8","-d",directory,...sources],{encoding:"utf8",timeout:30000});
  assert.equal(compile.status,0,compile.stderr);
  const run=spawnSync(java,["-cp",directory,"MainThreadContract"],{encoding:"utf8",timeout:10000});
  assert.equal(run.status,0,run.stderr);assert.equal(run.stdout.trim(),"80 main-thread launch contracts passed");
});
