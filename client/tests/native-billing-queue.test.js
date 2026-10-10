"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {NativeStoreBridge} = require("../src/native-store.js");
const product = {store_product_id:"gridshard.flux_120"};
const state = {providers:{purchase_platforms:{google_play:true,app_store:true}}};
const metadata = {identifier:product.store_product_id,price:29.99,priceString:"₺29,99",offerToken:"fixture-offer"};
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function fixture(platform="android") {
  const calls=[], pending=[];
  let active=0, peak=0;
  const plugin={};
  for (const method of ["getProducts","getPurchases","purchaseProduct","consumePurchase"]) {
    plugin[method]=options=>{
      const wait=deferred(); active++; peak=Math.max(peak,active);
      calls.push({method,options});pending.push(wait);
      return wait.promise.finally(()=>{active--;});
    };
  }
  const bridge=new NativeStoreBridge({capacitor:{getPlatform:()=>platform,
    Plugins:{NativePurchases:plugin}},storage:null});
  return {bridge,plugin,calls,pending,peak:()=>peak};
}

test("product query holds the Android connection until its callback before recovery starts",async()=>{
  const f=fixture();
  const prices=f.bridge.refreshProductPrices([product],state);
  const recovery=f.bridge.unfinishedPurchases([product.store_product_id],{accountToken:"fixture-account"});
  await flush();assert.deepEqual(f.calls.map(c=>c.method),["getProducts"]);
  await flush();assert.equal(f.calls.length,1,"a pending native call must not release the connection");
  f.pending[0].resolve({products:[metadata]});await prices;await flush();
  assert.deepEqual(f.calls.map(c=>c.method),["getProducts","getPurchases"]);
  f.pending[1].resolve({purchases:[]});assert.deepEqual(await recovery,[]);
  assert.equal(f.peak(),1);assert.equal(f.bridge.priceForProduct(product).priceLabel,"₺29,99");
});

test("recovery, two price refreshes and consume never overlap their native lifetimes",async()=>{
  const f=fixture();
  const recovery=f.bridge.unfinishedPurchases([product.store_product_id],{accountToken:"fixture-account"});
  const prices=f.bridge.refreshProductPrices([product],state);
  const pricesAgain=f.bridge.refreshProductPrices([product],state);
  const consume=f.bridge.finishPurchase({purchaseToken:"fixture-token"},{granted:true,consumed:false});
  await flush();assert.equal(f.calls[0].method,"getPurchases");
  f.pending[0].resolve({purchases:[]});await recovery;await flush();
  assert.equal(f.calls[1].method,"getProducts");
  f.pending[1].resolve({products:[metadata]});await prices;await flush();
  assert.equal(f.calls[2].method,"consumePurchase");
  f.pending[2].resolve({});assert.equal(await consume,true);await flush();
  assert.equal(f.calls[3].method,"getProducts");
  f.pending[3].resolve({products:[metadata]});await pricesAgain;assert.equal(f.peak(),1);
});

test("failed queries release the queue without inventing a price or losing recovery filtering",async()=>{
  const f=fixture();
  const prices=f.bridge.refreshProductPrices([product],state);
  const recovery=f.bridge.unfinishedPurchases([product.store_product_id],{accountToken:"fixture-account"});
  await flush();f.pending[0].reject(new Error("fixture disconnected"));await prices;await flush();
  assert.equal(f.bridge.priceForProduct(product),null);assert.equal(f.calls[1].method,"getPurchases");
  f.pending[1].resolve({purchases:[
    {productIdentifier:product.store_product_id,purchaseToken:"fixture-valid",appAccountToken:"fixture-account",purchaseState:1},
    {productIdentifier:product.store_product_id,purchaseToken:"fixture-other",appAccountToken:"other-account",purchaseState:1},
    {productIdentifier:product.store_product_id,purchaseToken:"fixture-pending",appAccountToken:"fixture-account",purchaseState:0},
    {productIdentifier:"unknown",purchaseToken:"fixture-unknown",appAccountToken:"fixture-account",purchaseState:1},
  ]});
  assert.deepEqual((await recovery).map(p=>p.purchaseToken),["fixture-valid"]);
  await assert.rejects(f.bridge.purchase(product),/ödeme başlatılmadı/);assert.equal(f.calls.length,2);
});

test("purchase holds the connection through cancellation; consume can then continue",async()=>{
  const f=fixture();f.bridge.storePrices.set(product.store_product_id,{priceLabel:"₺29,99",offerToken:"fixture-offer"});
  const purchase=f.bridge.purchase(product,{accountToken:"fixture-account"});
  const rejected=assert.rejects(purchase,/fixture canceled/);
  const consume=f.bridge.finishPurchase({purchaseToken:"fixture-paid"},{granted:true});
  await flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0].method,"purchaseProduct");
  assert.equal(f.calls[0].options.offerToken,"fixture-offer");
  assert.equal(f.calls[0].options.autoAcknowledgePurchases,false);
  assert.equal(f.calls[0].options.isConsumable,false);
  f.pending[0].reject(new Error("fixture canceled"));await rejected;await flush();
  assert.equal(f.calls[1].method,"consumePurchase");f.pending[1].resolve({});assert.equal(await consume,true);
  assert.equal(f.peak(),1);
});

test("a queued purchase revalidates price after a failed preceding refresh",async()=>{
  const f=fixture();f.bridge.storePrices.set(product.store_product_id,{priceLabel:"₺29,99",offerToken:"stale-offer"});
  const prices=f.bridge.refreshProductPrices([product],state);
  const purchase=assert.rejects(f.bridge.purchase(product),/ödeme başlatılmadı/);
  await flush();f.pending[0].reject(new Error("fixture missing"));await prices;await purchase;
  assert.equal(f.calls.length,1);assert.equal(f.bridge.priceForProduct(product),null);
});

test("transaction listeners may enqueue finish during purchase without deadlocking",async()=>{
  const f=fixture();let listener, finish;
  f.plugin.addListener=(_event,handler)=>{listener=handler;};
  f.bridge.onTransactionUpdated(native=>{finish=f.bridge.finishPurchase(native,{granted:true});},{accountToken:"fixture-account"});
  f.bridge.storePrices.set(product.store_product_id,{priceLabel:"₺29,99",offerToken:"fixture-offer"});
  const purchase=f.bridge.purchase(product);await flush();
  listener({productIdentifier:product.store_product_id,purchaseToken:"fixture-token",appAccountToken:"fixture-account"});
  await flush();assert.equal(f.calls.length,1);
  f.pending[0].resolve({productIdentifier:product.store_product_id,purchaseToken:"fixture-token"});await purchase;await flush();
  assert.equal(f.calls[1].method,"consumePurchase");f.pending[1].resolve({});assert.equal(await finish,true);
  assert.equal(f.peak(),1);
});

test("failed recovery or consume releases the queue; rejected/unverified receipts are never consumed",async()=>{
  const f=fixture();
  assert.equal(await f.bridge.finishPurchase({purchaseToken:"fixture-token"},{granted:false}),false);
  assert.equal(await f.bridge.finishPurchase({purchaseToken:"fixture-token"},{granted:true,consumed:true}),false);
  const recovery=f.bridge.unfinishedPurchases([product.store_product_id],{accountToken:"fixture-account"});
  const consume=f.bridge.finishPurchase({purchaseToken:"fixture-token"},{granted:true});
  const prices=f.bridge.refreshProductPrices([product],state);
  await flush();f.pending[0].reject(new Error("fixture recovery failed"));assert.deepEqual(await recovery,[]);await flush();
  f.pending[1].reject(new Error("fixture consume failed"));assert.equal(await consume,false);await flush();
  f.pending[2].resolve({products:[metadata]});await prices;assert.equal(f.peak(),1);
});

test("missing plugin is fail-closed and iOS keeps its existing price-query serialization",async()=>{
  const empty=new NativeStoreBridge({capacitor:{getPlatform:()=>"android",Plugins:{}},storage:null});
  assert.deepEqual(await empty.unfinishedPurchases([product.store_product_id],{accountToken:"fixture-account"}),[]);
  await assert.rejects(empty.purchase(product),/eklenti/);
  const f=fixture("ios");
  const first=f.bridge.refreshProductPrices([product],state),second=f.bridge.refreshProductPrices([product],state);
  await flush();assert.equal(f.calls.length,1);f.pending[0].resolve({products:[metadata]});await first;await flush();
  assert.equal(f.calls.length,2);f.pending[1].resolve({products:[metadata]});await second;assert.equal(f.peak(),1);
});
