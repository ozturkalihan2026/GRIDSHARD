const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {verifyOffer,verifyReceipt,fingerprint}=require('../src/shop/offer-view');
async function seal(value,key){return {...value,[key]:await fingerprint(value)};}
async function sample(){
  const art={path:'assets/ui/modules/laser.webp',sha256:'a'.repeat(64)};
  const reward=await seal({id:'fixed',revision:1,kind:'fixed',payload:{module_definition_id:'laser',module_shards:12}},'content_hash');
  const offer=await seal({protocol:'shop-offer-preview-v1',id:'parts',revision:1,offer_hash:'b'.repeat(64),art,
    target:{module_definition_id:'laser',name_tr:'Lazer',name_en:'Laser',art},price:{currency:'circuit_credits',amount:500},
    limit:{period:'utc_week',count:2},starts_at:'2026-12-28T00:00:00Z',ends_at:'2027-01-04T00:00:00Z',reward_snapshot:reward},'preview_hash');
  const pending={request_id:'buy-1',id:offer.id,revision:1,preview_hash:offer.preview_hash,offer};
  const receipt=await seal({format_version:1,player_id:'owner',request_hash:createHash('sha256').update('buy-1').digest('hex'),
    offer_snapshot:offer,charged:offer.price,rewards:reward.payload},'receipt_hash');
  return {offer,pending,payload:{profile:{player_id:'owner'},meta_progression:{},shop_purchase_receipt:receipt}};
}
test('canonical hashes match server UTF-8 sorted-key representation',async()=>{
  assert.equal(await fingerprint({z:[{b:2,a:'Çekirdek'}],a:1}),createHash('sha256').update('{"a":1,"z":[{"a":"Çekirdek","b":2}]}').digest('hex'));
});
test('validated receipt binds owner, exact request and quoted reward without a local grant',async()=>{
  const {offer,pending,payload}=await sample();assert.equal(await verifyOffer(offer),offer);
  assert.equal(await verifyReceipt(payload,pending,'owner'),payload.shop_purchase_receipt);
  await assert.rejects(verifyReceipt(payload,pending,'another-owner'));
  await assert.rejects(verifyReceipt(payload,{...pending,request_id:'another-request'},'owner'));
});
test('even resealed receipts cannot change charged amount, reward or quoted revision',async()=>{
  for(const mutate of [r=>r.charged.amount++,r=>r.rewards.module_shards++,r=>r.offer_snapshot.revision++]){
    const {pending,payload}=await sample();const r=structuredClone(payload.shop_purchase_receipt);mutate(r);delete r.receipt_hash;
    payload.shop_purchase_receipt=await seal(r,'receipt_hash');await assert.rejects(verifyReceipt(payload,pending,'owner'));
  }
});
test('corrupt prices, unsafe art paths and mismatched reward targets never become purchasable',async()=>{
  for(const mutate of [o=>delete o.price,o=>o.price.amount=0,o=>o.art.path='https://foreign/image.webp',o=>o.reward_snapshot.payload.module_definition_id='locked',o=>o.preview_hash='0'.repeat(64)]){
    const {offer}=await sample();mutate(offer);await assert.rejects(verifyOffer(offer));
  }
});
test('cosmetic quotes bind two exact ownership IDs and reject a real-money currency',async()=>{
  const {offer,pending,payload}=await sample();delete offer.target;delete offer.preview_hash;
  offer.kind='cosmetic_set';offer.price={currency:'circuit_credits',amount:1500};offer.limit={period:'account',count:1};
  offer.cosmetics=['avatar_frame_id','profile_background_id'].map((field,i)=>({id:i?'deck':'frame',field,inventory_pool:'shop',name_tr:'Öğe',name_en:'Item',look:{asset:{path:'assets/ui/cosmetics-shop-v1/'+(i?'dockyard_deck':'dockyard_latch')+'.svg',sha256:'a'.repeat(64)}}}));
  offer.art=offer.cosmetics[0].look.asset;
  offer.reward_snapshot=await seal({id:'set',revision:1,kind:'fixed',payload:{avatar_frame_id:'frame',profile_background_id:'deck'}},'content_hash');
  const sealed=await seal(offer,'preview_hash');await verifyOffer(sealed);
  const binding={...pending,offer:sealed,preview_hash:sealed.preview_hash};
  const r={...payload.shop_purchase_receipt,offer_snapshot:sealed,charged:sealed.price,rewards:sealed.reward_snapshot.payload};delete r.receipt_hash;
  const receipt=await seal(r,'receipt_hash');await verifyReceipt({...payload,shop_purchase_receipt:receipt},binding,'owner');
  await assert.rejects(verifyOffer(await seal({...offer,price:{currency:'TRY',amount:1500}},'preview_hash')));
  const altered={...r,rewards:{...r.rewards,avatar_frame_id:'another-frame'}};
  await assert.rejects(verifyReceipt({...payload,shop_purchase_receipt:await seal(altered,'receipt_hash')},binding,'owner'));
});
