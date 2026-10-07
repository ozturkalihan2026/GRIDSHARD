const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

test("both premium button placeholders and JS fallbacks use 199,99 TL",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  for (const id of ["season-premium-buy","post-match-premium-buy"]) {
    const button=html.match(new RegExp(`<button\\b[^>]*id="${id}"[^>]*>([^<]*)</button>`));
    assert.ok(button,`Missing premium button: ${id}`);
    assert.ok(button[1].endsWith("· 199,99 TL"));
  }
  assert.match(app,/paidProductPrice\(pass,\s*engagementPass\?\.price_label_tr\s*\|\|\s*"199,99 TL"\)/);
  assert.match(app,/paidProductPrice\(product,\s*"199,99 TL"\)/);
});

test("both premiums display Play's 199,99 regional price and buy the matching offer",async()=>{
  const products=["season_pass_premium","battle_rewards_premium"].map(id=>({store_product_id:`gridshard.${id}`}));
  const metadata=products.map((item,index)=>({identifier:item.store_product_id,price:199.99,priceString:"₺199,99",offerToken:`premium-offer-${index}`}));
  const {calls,bridge}=fixture(metadata);
  await bridge.refreshProductPrices(products,state);
  for (const [index,item] of products.entries()) {
    assert.equal(bridge.priceForProduct(item).priceLabel,"₺199,99");
    await bridge.purchase(item,{accountToken:"fixture-premium-account"});
    assert.equal(calls[index+1].productIdentifier,item.store_product_id);
    assert.equal(calls[index+1].offerToken,metadata[index].offerToken);
  }
});
