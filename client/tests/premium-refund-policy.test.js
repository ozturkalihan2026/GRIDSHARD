const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const policy = require("../src/premium-refund-policy.js");
const source = fs.readFileSync("./src/app.js", "utf8");
const product = {id:"season_pass_premium", store_product_id:"gridshard.season_pass_premium",
  refund_policy_version:policy.VERSION, reward_recovery_on_refund:true};

test("capability query preserves ad parameters and legacy checkout never demands consent", () => {
  assert.equal(policy.query(), `?premium_refund_policy=${policy.VERSION}`);
  assert.equal(policy.query("?ad_protocol=child-safe-v1"), `?ad_protocol=child-safe-v1&premium_refund_policy=${policy.VERSION}`);
  assert.equal(policy.acknowledge({...product, reward_recovery_on_refund:false}, () => assert.fail()), "");
  assert.equal(policy.acknowledge({...product, id:"battle_rewards_premium"}, () => assert.fail()), "");
  assert.equal(policy.acknowledge({...product, refund_policy_version:"future-v2"}, () => assert.fail()), null);
  assert.equal(policy.acknowledge(product, () => false), null);
  assert.equal(policy.acknowledge(product, text => text.includes("zorunlu alım değildir")), policy.VERSION);
  assert.ok(policy.confirmation("en").includes("no cash debt or forced purchase"));
});

test("deficit disclosure accepts only known resource types and positive exact amounts", () => {
  const lines = policy.deficits({deficits:{flux_shards:110, "module_shards:laser":7,
    rating:9000, circuit_credits:-1, "core_shards_by_type:<script>":4, universal_module_shards:NaN}}, "en", () => "Laser pieces");
  assert.deepEqual(lines, ["Flux: 110", "Laser pieces: 7"]);
});

function fixture(confirm = true) {
  const calls = [];
  const native = {transactionId:"fixture", purchaseToken:"fixture-only", productIdentifier:product.store_product_id};
  const state = {season_pass:product, account_token:"fixture-account"};
  const context = vm.createContext({
    document:{documentElement:{lang:"tr"}, getElementById:() => null},
    window:{confirm:() => {calls.push("confirm"); return confirm;}},
    GridshardPremiumRefundPolicy:policy,
    currentPurchaseProvider:() => "google_play", participantPlayerId:"fixture-player", storeState:state,
    purchaseInFlight:false, pendingNativePurchases:new Map(), pendingPurchaseIds:new Map(), declinedPremiumRecoveries:new Set(),
    paidProductById:() => product, paidProductByStoreId:() => product,
    storePolicyQuery:() => policy.query(),
    nativeStore:{purchase:async () => {calls.push("checkout"); return native;},
      finishPurchase:async (_native, value) => calls.push(["finish", value.granted]),
      markProcessed:() => calls.push("processed"), isProcessed:() => false, purchaseKey:() => "fixture"},
    requestJsonWithDeadline:async (_path, options) => {calls.push(JSON.parse(options.body)); return {receipt:{consumed:true}};},
    renderPaidStore:() => {}, renderSeasonPremiumPurchase:() => {}, renderPostMatchPremium:() => {},
    renderProfileSummary:() => {}, renderMetaHubScreens:() => {}, profileState:{applyProfile:() => {}},
  });
  const confirmation = source.slice(source.indexOf("  function confirmPremiumRefundPolicy("), source.indexOf("  async function submitRecoveredPurchase("));
  const purchase = source.slice(source.indexOf("  async function purchasePaidProduct("), source.indexOf("  function renderSeasonPremiumPurchase("));
  const recovery = source.slice(source.indexOf("  async function submitRecoveredPurchase("), source.indexOf("  async function recoverNativePurchases("));
  vm.runInContext(`${confirmation}\n${purchase}\n${recovery}`, context);
  return {context, calls, native};
}

test("declining before checkout produces no store call, no POST and no finish", async () => {
  const {context, calls} = fixture(false);
  const result = await context.purchasePaidProduct(product.id);
  assert.equal(result.cancelled, true);
  assert.deepEqual(calls, ["confirm"]);
  assert.equal(context.purchaseInFlight, false);
});

test("acceptance occurs before native checkout and sends the exact policy version", async () => {
  const {context, calls} = fixture(true);
  const result = await context.purchasePaidProduct(product.id);
  assert.equal(result.ok, true);
  assert.equal(calls[0], "confirm");
  assert.equal(calls[1], "checkout");
  assert.equal(calls[2].premium_policy_ack, policy.VERSION);
  assert.deepEqual(calls[3], ["finish", true]);
});

test("legacy purchases retain the old request shape for old servers", async () => {
  const {context, calls} = fixture(true);
  context.paidProductById = () => ({...product, reward_recovery_on_refund:false});
  assert.equal((await context.purchasePaidProduct(product.id)).ok, true);
  assert.equal(calls[0], "checkout");
  assert.ok(!Object.hasOwn(calls[1], "premium_policy_ack"));
});

for (const consent of [false, true]) test(`recovered paid receipt requires explicit consent (${consent}) and no new checkout`, async () => {
  const {context, calls, native} = fixture(consent);
  context.requestJsonWithDeadline = async (_path, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if (!body.premium_policy_ack) throw Object.assign(new Error("consent required"), {status:503, code:"premium_policy_ack_required"});
    return {receipt:{consumed:true}};
  };
  await context.submitRecoveredPurchase(native);
  assert.ok(!calls.includes("checkout"));
  assert.equal(calls[1], "confirm");
  if (consent) {
    assert.equal(calls[2].premium_policy_ack, policy.VERSION);
    assert.deepEqual(calls[3], ["finish", true]);
  } else {
    assert.equal(calls.length, 2);
    assert.equal(context.pendingNativePurchases.get(product.id), native);
    await context.submitRecoveredPurchase(native);
    assert.equal(calls.filter(item => item === "confirm").length, 1);
    assert.ok(!calls.includes("processed"));
  }
});

test("after declining recovered consent, a later explicit Store retry reuses the paid receipt", async () => {
  const {context, calls, native} = fixture(false);
  context.requestJsonWithDeadline = async (_path, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if (!body.premium_policy_ack) throw Object.assign(new Error("consent required"), {status:503, code:"premium_policy_ack_required"});
    return {receipt:{consumed:true}};
  };
  await context.submitRecoveredPurchase(native);
  context.window.confirm = () => {calls.push("confirm"); return true;};
  assert.equal((await context.purchasePaidProduct(product.id)).ok, true);
  assert.ok(!calls.includes("checkout"));
  assert.equal(context.pendingNativePurchases.size, 0);
  assert.ok(calls.includes("processed"));
});

test("the policy script loads before the app; disclosures use textContent", () => {
  const html = fs.readFileSync("./index.html", "utf8");
  assert.ok(html.indexOf("./src/premium-refund-policy.js") < html.indexOf("./src/app.js"));
  assert.match(source, /notice\.textContent =/);
  assert.match(source, /responseError\.code = payload\.detail\?\.code/);
});
