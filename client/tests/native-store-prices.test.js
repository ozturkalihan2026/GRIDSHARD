const {test} = require("node:test");
const assert = require("node:assert/strict");
const {NativeStoreBridge} = require("../src/native-store.js");
const product = {store_product_id:"gridshard.flux_120"};
const state = {providers:{purchase_platforms:{google_play:true}}};
function fixture(products) {
  const calls=[];
  const plugin={getProducts:async options=>{calls.push(options);return {products};},
    purchaseProduct:async options=>{calls.push(options);return {purchaseToken:"fixture-token"};}};
  return {calls,plugin,bridge:new NativeStoreBridge({capacitor:{getPlatform:()=>"android",
    Plugins:{NativePurchases:plugin}},storage:null})};
}
test("real purchases require native regional price and use its exact offer",async()=>{
  const {calls,bridge}=fixture([{identifier:product.store_product_id,price:1.99,priceString:"€1.99",offerToken:"offer-1"}]);
  await assert.rejects(bridge.purchase(product),/ödeme başlatılmadı/);
  assert.equal(calls.length,0);
  await bridge.refreshProductPrices([product],state);
  assert.equal(bridge.priceForProduct(product).priceLabel,"€1.99");
  await bridge.purchase(product,{accountToken:"fixture-account"});
  assert.deepEqual(calls[0],{productIdentifiers:[product.store_product_id],productType:"inapp"});
  assert.equal(calls[1].offerToken,"offer-1");
  assert.equal(calls[1].autoAcknowledgePurchases,false);
  assert.equal(calls[1].appAccountToken,"fixture-account");
});
test("missing, ambiguous and failed metadata queries never invent a payable price",async()=>{
  const item={identifier:product.store_product_id,price:29.99,priceString:"₺29,99"};
  for (const products of [[],[item,item],[{...item,priceString:""}],[{...item,price:NaN}]]) {
    const {bridge}=fixture(products);
    await bridge.refreshProductPrices([product],state);
    assert.equal(bridge.priceForProduct(product),null);
    await assert.rejects(bridge.purchase(product));
  }
  const {bridge,plugin}=fixture([item]);
  await bridge.refreshProductPrices([product],state);
  plugin.getProducts=async()=>{throw new Error("offline")};
  await bridge.refreshProductPrices([product],state);
  assert.equal(bridge.priceForProduct(product),null);
});
