/* Server-owned offers. No local grants, prices, counters or cosmetic ownership. */
(function(root){
  'use strict';
  const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
  const integer=v=>Number.isSafeInteger(v)&&v>=0;
  const declined=new Set(['offer_not_found','offer_revision_stale','offer_preview_stale','purchase_limit_reached','offer_expired','offer_not_started','offer_rollout_closed','offer_unpublished','arena_locked','account_ineligible','purchase_request_invalid','insufficient_funds','already_owned']);
  const asset=v=>v&&typeof v.path==='string'&&/^assets\/ui\/(?:[a-z0-9_/-]+\.webp|cosmetics-shop-v1\/[a-z_]+\.svg)$/.test(v.path)&&hex(v.sha256);
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  async function fingerprint(value){
    const bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(value))));
    return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function sealed(value,key){
    if(!value||!hex(value[key]))throw Error('Invalid shop snapshot');
    const body={...value};delete body[key];
    if(await fingerprint(body)!==value[key])throw Error('Invalid shop hash');
  }
  async function verifyOffer(o){
    if(!o||o.protocol!=='shop-offer-preview-v1'||typeof o.id!=='string'||!integer(o.revision)||!o.revision
      ||!hex(o.offer_hash)||!asset(o.art)
      ||!['circuit_credits','flux_shards'].includes(o.price?.currency)||!integer(o.price.amount)||!o.price.amount
      ||!['utc_week','account'].includes(o.limit?.period)||!integer(o.limit.count)||!o.limit.count
      ||!Number.isFinite(Date.parse(o.starts_at))||!(Date.parse(o.ends_at)>Date.parse(o.starts_at)))throw Error('Invalid shop offer');
    const reward=o.reward_snapshot;
    if(reward?.kind!=='fixed')throw Error('Invalid shop reward');
    if(o.kind==='cosmetic_set'){
      if(o.price.currency!=='circuit_credits'||o.limit.period!=='account'||o.limit.count!==1||!Array.isArray(o.cosmetics)||o.cosmetics.length!==2
        ||Object.keys(reward.payload||{}).sort().join(',')!=='avatar_frame_id,profile_background_id')throw Error('Invalid cosmetic set');
      const fields=['avatar_frame_id','profile_background_id'];
      for(const [i,c] of o.cosmetics.entries())if(c.field!==fields[i]||c.id!==reward.payload[fields[i]]||c.inventory_pool!=='shop'||!c.name_tr||!c.name_en||!asset(c.look?.asset))throw Error('Invalid cosmetic art');
      if(await fingerprint(o.art)!==await fingerprint(o.cosmetics[0].look.asset))throw Error('Invalid set cover');
    }else if(o.kind!==undefined||o.limit.period!=='utc_week'||!asset(o.target?.art)||!o.target.name_tr||!o.target.name_en
      ||Object.keys(reward.payload||{}).sort().join(',')!=='module_definition_id,module_shards'
      ||reward.payload.module_definition_id!==o.target.module_definition_id||!integer(reward.payload.module_shards)||!reward.payload.module_shards)throw Error('Invalid shop reward');
    await sealed(reward,'content_hash');await sealed(o,'preview_hash');
    return o;
  }
  async function verifyReceipt(payload,pending,owner){
    const r=payload?.shop_purchase_receipt,o=pending.offer;
    if(!r||r.format_version!==1||r.player_id!==owner||payload.profile?.player_id!==owner||!payload.meta_progression
      ||r.request_hash!==await fingerprintRequest(pending.request_id)||r.offer_snapshot?.preview_hash!==pending.preview_hash
      ||r.offer_snapshot.id!==pending.id||r.offer_snapshot.revision!==pending.revision
      ||r.charged?.currency!==o.price.currency||r.charged.amount!==o.price.amount
      ||await fingerprint(r.rewards)!==await fingerprint(o.reward_snapshot.payload))throw Error('Invalid shop receipt');
    await verifyOffer(r.offer_snapshot);await sealed(r,'receipt_hash');return r;
  }
  async function fingerprintRequest(value){
    const bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.trim()));
    return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function create({document,playerId,request,requestId,applyPayload,previewCollections}){
    const $=id=>document.getElementById(id),dialog=$('shop-offer-dialog'),body=$('shop-offer-body');
    let owner=null,epoch=0,detailEpoch=0,loading=false,busy=false,problem=null,list=[],item=null,phase='detail',pending=null,corrupt=false,delivered=null,returnFocus=null,returnOfferId=null,tab='featured',artReady=false;
    const lang=()=>document.documentElement.lang==='en'?'en':'tr';
    const t=(key,params={})=>root.GridshardI18n.t('shop.'+key,params,lang());
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const btn=(key,fn,primary=false)=>{const b=el('button',primary?'shop-offer-primary gs-action-button':'shop-offer-secondary',t(key));b.type='button';if(primary)b.dataset.tone='primary';b.addEventListener('click',fn);return b;};
    const key=who=>'gridshard.shop.pending.v1:'+encodeURIComponent(who);
    const base=who=>'/profile/'+encodeURIComponent(who)+'/shop-offers';
    const current=(who,stamp)=>playerId()===who&&owner===who&&epoch===stamp;
    const currency=code=>t(code==='flux_shards'?'flux':'credits');
    const number=value=>root.GridshardI18n.formatNumber(value,{},lang());
    const message=code=>t(({insufficient_funds:'funds',purchase_limit_reached:'limit_reached',arena_locked:'locked',already_owned:'owned',offer_expired:'expired',offer_revision_stale:'stale',offer_preview_stale:'stale'})[code]||'failed');
    function image(value,cls){const img=el('img',cls);img.src='./'+value.path;img.alt='';img.width=112;img.height=112;return img;}
    function syncOwner(){
      if(owner===playerId())return;
      epoch++;detailEpoch++;owner=playerId();list=[];item=null;pending=null;corrupt=false;delivered=null;problem=null;busy=false;loading=false;
      if(dialog?.open)dialog.close();
    }
    async function readPending(who){
      let raw;
      try{raw=root.localStorage.getItem(key(who));if(!raw)return null;const value=JSON.parse(raw);
        if(value.version!==1||value.owner!==who||typeof value.request_id!=='string'||!value.request_id.trim()||value.request_id.length>160||value.id!==value.offer?.id||value.revision!==value.offer?.revision||value.preview_hash!==value.offer?.preview_hash)throw Error('Invalid pending purchase');
        await verifyOffer(value.offer);return value;
      }catch(error){if(raw)throw error;return null;}
    }
    function storePending(value){
      const raw=JSON.stringify(value);root.localStorage.setItem(key(value.owner),raw);
      if(root.localStorage.getItem(key(value.owner))!==raw)throw Error('Storage unavailable');
    }
    function clearPending(who){try{root.localStorage.removeItem(key(who));}catch(_error){}pending=null;}
    function selectTab(next,focus=false){
      tab=next;const featured=$('shop-panel-featured'),chests=$('shop-panel-chests'),modules=$('shop-panel-modules');
      const chestSection=document.querySelector('#shop-screen .chest-store-section'),offerSection=$('shop-offers-section');
      (tab==='chests'?chests:featured).append(chestSection);(tab==='modules'?modules:featured).append(offerSection);
      for(const b of document.querySelectorAll('[data-shop-tab]')){const active=b.dataset.shopTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(focus&&active)b.focus();}
      for(const panel of document.querySelectorAll('#shop-screen > [role="tabpanel"]'))panel.hidden=panel.id!=='shop-panel-'+tab;
    }
    function showPending(){
      const host=$('shop-pending-purchase');host.replaceChildren();host.hidden=!pending&&!corrupt;
      if(host.hidden)return;
      host.append(el('span','',t(corrupt?'corrupt_pending':'pending')));
      if(pending)host.append(btn('check',event=>{item={offer:pending.offer};phase='uncertain';returnOfferId=null;openDialog(event.currentTarget);}));
    }
    function product(o,detail=false){
      const hero=el('div','shop-offer-hero');
      const cosmetic=o.kind==='cosmetic_set';
      const art=image(cosmetic?o.art:o.target.art,'shop-module-art');
      if(detail){
        artReady=false;
        const active=()=>art.isConnected&&dialog.open&&item?.offer?.preview_hash===o.preview_hash;
        art.addEventListener('error',()=>{if(active()&&!pending&&phase!=='delivered'){phase='error';problem='preview_error';renderDialog();}},{once:true});
        art.addEventListener('load',()=>{if(!active()||cosmetic)return;artReady=Boolean(art.naturalWidth);const action=body.querySelector('[data-shop-action]');if(action)action.disabled=!artReady||!item?.can_purchase||Boolean(pending)||corrupt;},{once:true});
      }
      const copy=el('div','shop-offer-copy');copy.append(el('small','shop-offer-eyebrow',t('guaranteed')),
        el('h3','',cosmetic?(lang()==='en'?o.title_en:o.title_tr):(lang()==='en'?o.target.name_en:o.target.name_tr)),
        el('strong','shop-offer-quantity',cosmetic?t('set_contents'):t('pieces',{count:o.reward_snapshot.payload.module_shards})));
      hero.append(art,copy);
      if(!cosmetic)return hero;
      const wrap=el('div','shop-set-product');wrap.append(hero);
      const background=o.cosmetics[1],swatch=image(background.look.asset,'shop-set-background');swatch.alt=lang()==='en'?background.name_en:background.name_tr;
      // Both authored sources must load before confirming, including the background.
      if(detail){let frameLoaded=false,bgLoaded=false;
        const enable=()=>{if(!wrap.isConnected||item?.offer?.preview_hash!==o.preview_hash)return;artReady=frameLoaded&&bgLoaded;const action=body.querySelector('[data-shop-action]');if(action)action.disabled=!artReady||!item?.can_purchase||Boolean(pending)||corrupt;};
        art.addEventListener('load',()=>{frameLoaded=true;enable();},{once:true});swatch.addEventListener('load',()=>{bgLoaded=true;enable();},{once:true});
        swatch.addEventListener('error',()=>{if(wrap.isConnected&&!pending&&phase!=='delivered'){phase='error';problem='preview_error';renderDialog();}},{once:true});
      }
      wrap.append(swatch);for(const c of o.cosmetics)wrap.append(el('small','shop-set-item',lang()==='en'?c.name_en:c.name_tr));return wrap;
    }
    function renderList(){
      const host=$('shop-offer-list'),state=$('shop-offers-state'),cosmeticHost=$('shop-cosmetic-list'),cosmeticState=$('shop-cosmetic-state');
      const focusedId=document.activeElement?.closest?.('[data-shop-offer]')?.dataset.shopOffer;
      host.replaceChildren();state.replaceChildren();cosmeticHost.replaceChildren();cosmeticState.replaceChildren();
      if(loading)state.textContent=t('loading');
      else if(problem){state.append(el('span','',t(problem)),btn('retry',()=>load()));}
      else if(!list.some(q=>q.offer?.kind!=='cosmetic_set'))state.textContent=t('closed');
      if(problem)cosmeticState.append(el('span','',t(problem)),btn('retry',()=>load()));
      else if(loading||!list.some(q=>q.offer?.kind==='cosmetic_set'))cosmeticState.textContent=loading?t('loading'):t('cosmetic_closed');
      for(const q of list){
        const o=q.offer,card=el('article','shop-offer-card');card.dataset.shopOffer=o.id;
        if(o.target||o.cosmetics)card.append(product(o));else card.append(el('h3','',lang()==='en'?o.title_en:o.title_tr));
        if(o.price)card.append(el('p','shop-offer-price',t('price',{amount:number(o.price.amount),currency:currency(o.price.currency)})));
        if(integer(q.purchases_remaining))card.append(el('small','',t(o.kind==='cosmetic_set'?'account_limit':'limit',{remaining:q.purchases_remaining,total:o.limit.count})));
        if(q.blocking_code)card.append(el('p','shop-offer-reason',message(q.blocking_code)));
        const inspect=btn('inspect',event=>open(o.id,o.revision,event.currentTarget));inspect.disabled=busy||corrupt||Boolean(pending);card.append(inspect);(o.kind==='cosmetic_set'?cosmeticHost:host).append(card);
      }
      showPending();
      if(focusedId&&!dialog.open)[...host.children,...cosmeticHost.children].find(n=>n.dataset.shopOffer===focusedId)?.querySelector('button')?.focus();
    }
    function render(){
      syncOwner();
      for(const b of document.querySelectorAll('[data-shop-tab]'))b.textContent=t(b.dataset.shopTab);
      $('shop-tabs').setAttribute('aria-label',t('tabs'));$('shop-offers-title').textContent=t('heading');
      $('shop-cosmetics-title').textContent=t('collections');$('shop-cosmetics-copy').textContent=t('collection_copy');$('shop-collections-preview').textContent=t('collection_button');
      renderList();if(dialog.open)renderDialog();
    }
    async function load(){
      syncOwner();if(busy)return;const who=owner,stamp=++epoch;loading=true;problem=null;renderList();
      try{const saved=await readPending(who);if(!current(who,stamp))return;pending=saved;corrupt=false;}
      catch(_error){if(current(who,stamp))corrupt=true;}
      try{
        const response=await request(base(who),{cache:'no-store'});
        if(response.protocol!=='shop-offers-v1'||!Array.isArray(response.offers))throw Error('Invalid shop list');
        for(const q of response.offers){
          if(q.blocking_code==='arena_locked'&&!q.offer?.target){if(!asset(q.offer.art))throw Error('Invalid locked preview');continue;}
          await verifyQuote(q);
        }
        if(!current(who,stamp))return;list=response.offers;
      }catch(error){if(!current(who,stamp))return;list=[];problem=error.status===404?null:root.navigator?.onLine===false?'offline':'failed';}
      finally{if(current(who,stamp)){loading=false;renderList();}}
    }
    async function verifyQuote(q){
      await verifyOffer(q.offer);
      if(typeof q.can_purchase!=='boolean'||!integer(q.purchases_remaining)||!integer(q.purchases_used)||!Number.isSafeInteger(q.balance)
        ||(q.can_purchase&&(q.purchases_remaining<1||q.balance<q.offer.price.amount)))throw Error('Invalid quote state');
      return q;
    }
    function openDialog(origin){returnFocus=origin||document.activeElement;if(!dialog.open)dialog.showModal();renderDialog();}
    function restoreFocus(){
      const replacement=[...document.querySelectorAll('[data-shop-offer]')].find(n=>n.dataset.shopOffer===returnOfferId)?.querySelector('button');
      (returnFocus?.isConnected?returnFocus:replacement||document.querySelector('[data-shop-tab][aria-selected="true"]'))?.focus();
    }
    function close(){if(busy)return;if(phase==='review'){phase='detail';renderDialog();return;}detailEpoch++;dialog.close();restoreFocus();}
    async function open(id,revision,origin){
      syncOwner();if(pending||corrupt||busy)return;const who=owner,stamp=epoch,detailStamp=++detailEpoch;
      const active=()=>current(who,stamp)&&detailStamp===detailEpoch&&dialog.open;
      phase='loading';item=null;problem=null;returnOfferId=id;openDialog(origin);
      try{const q=await request(base(who)+'/'+encodeURIComponent(id)+'?revision='+revision,{cache:'no-store'});if(!active())return;await verifyQuote(q);
        if(!active())return;item=q;phase='detail';
      }catch(error){if(!active())return;phase='error';problem=error.code?messageKey(error.code):'preview_error';}
      if(active())renderDialog();
    }
    function messageKey(code){return ({insufficient_funds:'funds',purchase_limit_reached:'limit_reached',already_owned:'owned',arena_locked:'locked',offer_expired:'expired',offer_revision_stale:'stale',offer_preview_stale:'stale'})[code]||'failed';}
    function renderDialog(){
      if(!dialog.open)return;
      const action=document.activeElement?.dataset?.shopAction;
      body.replaceChildren();dialog.dataset.state=phase;$('shop-offer-title').textContent=t(phase==='review'?'review_title':phase==='delivered'?(delivered.offer_snapshot.kind==='cosmetic_set'?'set_delivered':'delivered'):'detail');
      $('shop-offer-back').disabled=busy;$('shop-offer-back').setAttribute('aria-label',t('back'));
      if(phase==='loading'){body.append(el('p','shop-offer-status',t('loading')));return;}
      if(phase==='error'){body.append(el('p','shop-offer-status',t(problem||'failed')),btn('retry',()=>{dialog.close();load();}));return;}
      const o=phase==='delivered'?delivered.offer_snapshot:item?.offer;
      if(o?.target||o?.cosmetics)body.append(product(o,true));
      if(phase==='delivered'){
        body.append(el('p','shop-offer-price',t('charged',{amount:number(delivered.charged.amount),currency:currency(delivered.charged.currency)})),btn('done',()=>{dialog.close();restoreFocus();},true));return;
      }
      if(phase==='sending'){body.append(el('p','shop-offer-status',t('sending')));return;}
      if(phase==='uncertain'){
        body.append(el('p','shop-offer-status',t('pending')),btn('check',()=>submit(),true),btn('later',()=>{dialog.close();restoreFocus();}));return;
      }
      if(!o)return;
      body.append(el('p','shop-offer-price',t('price',{amount:number(o.price.amount),currency:currency(o.price.currency)})),
        el('p','',t('balance',{amount:number(item.balance)})),el('p','',t(o.kind==='cosmetic_set'?'account_limit':'limit',{remaining:item.purchases_remaining,total:o.limit.count})),
        el('p','shop-offer-dates',t('ends',{date:new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(o.ends_at))+' UTC'})),
        el('p','shop-offer-note',t(o.kind==='cosmetic_set'?'set_note':'fixed')));
      if(!item.can_purchase)body.append(el('p','shop-offer-reason',message(item.blocking_code)));
      const confirm=btn(phase==='review'?'confirm':'review',()=>{if(phase==='review')submit();else{phase='review';renderDialog();body.querySelector('[data-shop-action="confirm"]')?.focus();}},true);
      confirm.dataset.shopAction=phase==='review'?'confirm':'review';confirm.disabled=!artReady||!item.can_purchase||Boolean(pending)||corrupt;body.append(confirm);
      if(action)body.querySelector('[data-shop-action="'+action+'"]')?.focus();
    }
    async function submit(){
      syncOwner();if(busy||corrupt||(!pending&&phase!=='review'))return;
      const who=owner,stamp=epoch;
      if(!pending){
        const o=item.offer;
        const value={version:1,owner:who,id:o.id,revision:o.revision,preview_hash:o.preview_hash,request_id:requestId(),offer:o};
        try{storePending(value);pending=value;}catch(_error){phase='error';problem='storage';renderDialog();return;}
      }
      const operation=pending;busy=true;phase='sending';renderList();renderDialog();
      try{
        const payload=await request(base(who)+'/'+encodeURIComponent(operation.id)+'/purchase',{method:'POST',body:JSON.stringify({request_id:operation.request_id,revision:operation.revision,preview_hash:operation.preview_hash})});
        const receipt=await verifyReceipt(payload,operation,who);
        if(!current(who,stamp))return;
        applyPayload(payload);delivered=receipt;clearPending(who);phase='delivered';
      }catch(error){
        if(!current(who,stamp))return;
        if([400,403,404,409,422].includes(error.status)&&declined.has(error.code)){
          clearPending(who);phase='error';problem=messageKey(error.code);
        }else phase='uncertain';
      }finally{
        if(current(who,stamp)){busy=false;renderList();renderDialog();if(phase==='delivered')void load();}
      }
    }
    for(const b of document.querySelectorAll('[data-shop-tab]'))b.addEventListener('click',()=>selectTab(b.dataset.shopTab));
    $('shop-tabs').addEventListener('keydown',event=>{
      const keys=['featured','chests','modules','cosmetics'];let index=keys.indexOf(tab);
      if(event.key==='ArrowRight')index=(index+1)%4;else if(event.key==='ArrowLeft')index=(index+3)%4;else if(event.key==='Home')index=0;else if(event.key==='End')index=3;else return;
      event.preventDefault();selectTab(keys[index],true);
    });
    $('shop-offer-back').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    $('shop-collections-preview').addEventListener('click',()=>previewCollections());
    const observer=new root.MutationObserver(()=>render());observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    selectTab('featured');render();
    return {load,render,selectTab};
  }
  root.GridshardShopOffers={create,verifyOffer,verifyReceipt,fingerprint};
  if(typeof module!=='undefined')module.exports=root.GridshardShopOffers;
})(typeof globalThis!=='undefined'?globalThis:window);
