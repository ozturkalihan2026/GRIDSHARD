/* Engineer Case presentation. Only authenticated server records award pieces. */
(function(root) {
  'use strict';
  function create({document,playerId,request,applyProfile,refreshProfile=async()=>{},moduleArt,requestId,onChange=()=>{},navigate=()=>{},cue=()=>{}}) {
    const hub=document.getElementById('engineer-case-hub');
    const inbox=document.getElementById('engineer-case-inbox');
    const dialog=document.getElementById('engineer-case-dialog');
    const card=document.getElementById('engineer-case-card');
    const body=document.getElementById('engineer-case-body');
    const art=document.getElementById('engineer-case-stage');
    let listing=null,listError=false,loading=false,item=null,receipt=null,selected=null;
    let phase='choices',busy=false,problem=false,skip=false,moreBusy=false;
    let lastLoad=0,flight=null,returnFocus=null;
    const words={
      title:['Mühendis Kasası','Engineer Case'],weekly:['HAFTALIK ATÖLYE','WEEKLY WORKSHOP'],
      intro:['Savaşarak kazan. Geliştireceğin modülü sen seç.','Earn it in battle. Choose the module you will improve.'],
      rules:['12 tamamlanmış Dereceli veya Arena maçı · haftada 1 kasa · zafer şartı yok.','12 completed Ranked or Arena matches · 1 case per week · no wins required.'],
      reset:['İlerleme Pazartesi UTC 00.00’da yenilenir. Kazandığın kasalar sende kalır.','Progress resets Monday at 00:00 UTC. Earned cases stay yours.'],
      closed:['Bu haftanın kazanımı henüz açık değil. Kazandığın eski kasaları seçebilirsin.','Earning is currently closed. You can still choose from previously earned cases.'],
      guarantee:['GARANTİLİ PARÇA · 3 SEÇENEKTEN 1’İ','GUARANTEED PIECES · 1 OF 3 OPTIONS'],
      saved:['Kazandığın kasalar','Your earned cases'],open:['SEÇENEKLERİ GÖR','VIEW OPTIONS'],
      loading:['Kasaların yükleniyor…','Loading your cases…'],loadError:['Kasalar yüklenemedi. Hakların korunuyor.','Cases could not be loaded. Your rights are safe.'],
      retry:['YENİDEN DENE','TRY AGAIN'],more:['DAHA ESKİ KASALAR','OLDER CASES'],empty:['Bu hafta ilerlemeni tamamla; üç seçenekten birini al.','Complete this week’s progress and claim one of three options.'],
      receipt:['BU HAFTANIN KASASI','THIS WEEK’S CASE'],choose:['BİR MODÜL SEÇ','CHOOSE ONE MODULE'],
      weekDone:['Bu haftanın kasası kazanıldı. Yeni ilerleme Pazartesi başlar.','This week’s case has been earned. New progress starts on Monday.'],
      detail:['Yalnız seçtiğin modülün parçaları verilir. Seçimin teslimden sonra değişmez.','Only the chosen module’s pieces are awarded. Your choice is final after delivery.'],
      attack:['Saldırı','Attack'],defense:['Savunma','Defense'],tactical:['Taktik','Tactical'],
      pieces:['modül parçası','module pieces'],confirm:['SEÇİMİ ONAYLA','CONFIRM CHOICE'],
      review:['SEÇİMİ İNCELE','REVIEW CHOICE'],
      change:['SEÇİMİ DEĞİŞTİR','CHANGE CHOICE'],cancel:['SONRA SEÇ','CHOOSE LATER'],close:['Kapat','Close'],
      awaiting:['Parçaların hazırlanıyor…','Preparing your pieces…'],safe:['Çıkarsan hakkın korunur.','Your right is safe if you leave.'],
      delivered:['PARÇALAR TESLİM EDİLDİ','PIECES DELIVERED'],done:['DEVAM','CONTINUE'],
      error:['Bağlantı doğrulanamadı. Aynı seçimi yeniden kontrol edebilirsin; ikinci kasa harcanmaz.','Connection could not be verified. Retry the same choice; no second case is used.'],
      skip:['ANİMASYONU ATLA','SKIP ANIMATION'],inbox:['Kasa seçimin bekliyor','Your case choice is waiting'],
      preserved:['Önceki haftalardan kalan kasalar dahil. Birer birer seçebilirsin.','Includes cases from previous weeks. Choose them one at a time.'],
      reviewing:['Kasan kontrol ediliyor…','Checking your case…'],failed:['Kasa okunamadı. Hakkın korunuyor.','Case could not be read. Your right is safe.'],
      offline:['Bağlantı yok. Bağlanınca aynı seçime devam edebilirsin.','You are offline. Reconnect to continue the same choice.']
    };
    const t=k=>words[k][document.documentElement.lang==='en'?1:0];
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const button=(text,fn,cls='')=>{const n=el('button',cls,text);n.type='button';if(cls.includes('engineer-primary')){n.classList.add('gs-action-button');n.dataset.tone='primary';}n.addEventListener('click',fn);return n;};
    const base=()=>`/profile/${encodeURIComponent(playerId())}/reward-choices`;
    const storageKey=id=>`gridshard.engineer.pending.v1:${playerId()}:${id}`;
    function pending(id,value) {
      try {
        if(value===null)root.localStorage.removeItem(storageKey(id));
        else if(value)root.localStorage.setItem(storageKey(id),JSON.stringify(value));
        else {const v=JSON.parse(root.localStorage.getItem(storageKey(id))||'null');return v&&['attack','defense','tactical'].includes(v.option_id)&&typeof v.request_id==='string'?v:null;}
      } catch(_error) {} return null;
    }
    const name=o=>document.documentElement.lang==='en'
      ? (o.module_name_en===o.module_definition_id ? root.GridshardI18n?.translateText(o.module_name_tr,'en')||o.module_name_tr : o.module_name_en)
      : o.module_name_tr;
    function optionCard(o,interactive=false) {
      const n=el(interactive?'button':'article','engineer-option');
      if(interactive){n.type='button';n.setAttribute('aria-pressed',String(selected===o.option_id));n.addEventListener('click',()=>{selected=o.option_id;renderDialog();body.querySelector(`[data-option="${selected}"]`)?.focus();});}
      n.dataset.option=o.option_id;n.classList.toggle('is-selected',selected===o.option_id);
      const visual=moduleArt(o);visual.classList.add('engineer-module-art');
      const copy=el('span','engineer-option-copy');
      copy.append(el('small','',t(o.option_id)),el('strong','',name(o)),el('span','engineer-piece-count',`+${o.module_shards} ${t('pieces')}`));
      n.append(visual,copy);return n;
    }
    function render() {
      if(!hub)return;
      hub.replaceChildren();
      const hero=el('div','engineer-hub-hero');
      const image=el('img','engineer-hub-art');image.src='./assets/ui/engineer-case-v1/closed.webp';image.alt='';image.width=192;image.height=192;
      const copy=el('div','engineer-hub-copy');copy.append(el('small','engineer-eyebrow',t('weekly')),el('h2','',t('title')),el('p','',t('intro')));hero.append(image,copy);hub.append(hero);
      const progress=listing?.week?.progress||0,target=listing?.week?.target||12;
      const meter=el('progress','engineer-progress');meter.max=target;meter.value=progress;meter.setAttribute('aria-label',t('title'));
      hub.append(el('strong','engineer-progress-copy',`${progress} / ${target}`),meter,el('p','engineer-rules',t('rules')),el('p','engineer-reset',t('reset')));
      if(listing&&!listing.earning_enabled)hub.append(el('p','engineer-source-closed',t('closed')));
      if(listError)hub.append(el('p','engineer-error',t('loadError')),button(t('retry'),()=>load({force:true}),'engineer-secondary'));
      else if(loading&&!listing)hub.append(el('p','',t('loading')));
      if(listing?.pending?.length){
        hub.append(el('h3','',t('saved')),el('p','engineer-reset',t('preserved')));
        const list=el('div','engineer-pending-list');
        for(const entry of listing.pending){
          const row=button('',()=>open(entry.entitlement_id),'engineer-pending');
          row.dataset.entitlement=entry.entitlement_id;
          row.append(el('span','',`${t('title')} · ${entry.period_id}`),el('strong','',t('open')));list.append(row);
        }hub.append(list);
      }else if(listing&&!listError)hub.append(el('p','engineer-reset',t(listing.week?.earned?'weekDone':'empty')));
      if(listing?.next_cursor){const more=button(t('more'),loadMore,'engineer-secondary');more.disabled=moreBusy;hub.append(more);}
      if(listing?.week?.earned&&!listing.pending.some(x=>x.entitlement_id===listing.week.entitlement_id))hub.append(button(t('receipt'),()=>open(listing.week.entitlement_id),'engineer-secondary engineer-receipt-link'));
      renderInbox();
    }
    function renderInbox() {
      if(!inbox)return;inbox.replaceChildren();inbox.hidden=!listing?.pending?.length;
      if(inbox.hidden)return;
      const img=el('img','');img.src='./assets/ui/engineer-case-v1/closed.webp';img.alt='';img.width=72;img.height=72;
      const copy=el('div','');copy.append(el('strong','',t('inbox')),el('small','',`${listing.pending.length}${listing.next_cursor?'+':''} · ${t('title')}`));
      inbox.append(img,copy,button(t('open'),()=>{document.getElementById('reward-inbox-dialog')?.close();navigate();open(listing.pending[0].entitlement_id);},'engineer-primary'));
    }
    async function load({force=false}={}) {
      if(flight){if(!force)return flight;await flight;}
      if(!force&&listing&&Date.now()-lastLoad<15000)return listing;
      loading=true;listError=false;render();
      flight=(async()=>{try {
        const data=await request(base()+'?limit=20',{cache:'no-store'});
        if(data.protocol!=='engineer-choice-v1'||!Array.isArray(data.pending))throw new Error('Invalid choice protocol');
        listing=data;lastLoad=Date.now();return listing;
      }catch(_error){listError=true;}finally{loading=false;flight=null;render();onChange();}})();
      return flight;
    }
    async function loadMore() {
      if(moreBusy||!listing?.next_cursor)return;moreBusy=true;render();
      try {
        const cursor=listing.next_cursor;
        const data=await request(base()+`?limit=20&after=${encodeURIComponent(cursor)}`,{cache:'no-store'});
        const entries=new Map([...listing.pending,...data.pending].map(x=>[x.entitlement_id,x]));
        listing={...data,pending:[...entries.values()]};listError=false;
      }catch(_error){listError=true;}finally{moreBusy=false;render();}
    }
    function setReceipt(value) {
      const o=item?.options.find(x=>x.option_id===value?.option_id);
      if(!o||value.entitlement_id!==item.entitlement_id||value.definition_hash!==item.content_hash
          ||value.rewards?.module_definition_id!==o.module_definition_id||value.rewards?.module_shards!==o.module_shards)throw new Error('Receipt mismatch');
      receipt=value;selected=value.option_id;phase='revealed';pending(item.entitlement_id,null);
    }
    async function open(id) {
      if(busy){if(!dialog.open)dialog.showModal();return;}
      returnFocus=document.activeElement;item=null;receipt=null;selected=null;problem=false;skip=false;phase='loading';
      dialog.dataset.entitlement=id;card.dataset.animationFinished='false';renderDialog();if(!dialog.open)dialog.showModal();
      try {
        const data=await request(`${base()}/${encodeURIComponent(id)}`,{cache:'no-store'});
        if(dialog.dataset.entitlement!==id)return;
        item=data.reward_choice;
        if(data.reward_choice_receipt){skip=true;setReceipt(data.reward_choice_receipt);}
        else {const saved=pending(id);selected=saved?.option_id||null;phase=saved?'confirm':'choices';}
      }catch(_error){if(dialog.dataset.entitlement===id)phase='load-error';}
      renderDialog();
    }
    function renderDialog() {
      card.dataset.state=phase;card.dataset.skip=String(skip);
      document.getElementById('engineer-case-title').textContent=t('title');
      const closer=document.getElementById('engineer-case-close');closer.setAttribute('aria-label',t('close'));
      art.setAttribute('aria-hidden','true');body.replaceChildren();
      const live=document.getElementById('engineer-case-live');
      live.textContent=phase==='submitting'?t('awaiting'):phase==='revealed'?t('delivered'):phase==='load-error'?t('failed'):'';
      if(phase==='loading'){body.append(el('p','',t('reviewing')));return;}
      if(phase==='load-error'){body.append(el('p','engineer-error',t('failed')),button(t('retry'),()=>open(dialog.dataset.entitlement),'engineer-primary'));return;}
      if(phase==='revealed'){
        const reward=el('div','engineer-delivered');reward.append(optionCard(item.options.find(x=>x.option_id===receipt.option_id)));
        body.append(el('small','engineer-eyebrow',t('delivered')),reward,button(t('skip'),()=>{skip=true;renderDialog();},'engineer-secondary engineer-skip'),button(t('done'),()=>dialog.close(),'engineer-primary'));
        return;
      }
      body.append(el('small','engineer-eyebrow',t('guarantee')));
      if(phase==='choices'){
        body.append(el('h3','',t('choose')),el('p','engineer-reset',t('detail')));
        const options=el('div','engineer-options');for(const o of item.options)options.append(optionCard(o,true));body.append(options);
        const next=button(t('review'),()=>{phase='confirm';renderDialog();document.getElementById('engineer-final-confirm')?.focus();},'engineer-primary');next.disabled=!selected;body.append(next);
      }else{
        body.append(optionCard(item.options.find(o=>o.option_id===selected)),el('p','engineer-reset',t('detail')));
        if(problem)body.append(el('p','engineer-error',root.navigator?.onLine===false?t('offline'):t('error')));
        const confirm=button(phase==='submitting'?t('awaiting'):problem?t('retry'):t('confirm'),submit,'engineer-primary');confirm.id='engineer-final-confirm';confirm.disabled=busy;body.append(confirm);
        if(phase!=='submitting'&&!pending(item.entitlement_id))body.append(button(t('change'),()=>{phase='choices';renderDialog();},'engineer-secondary'));
      }
      body.append(button(t('cancel'),()=>dialog.close(),'engineer-secondary'),el('small','engineer-safe',t('safe')));
    }
    async function submit() {
      if(busy||!item||!selected)return;
      busy=true;problem=false;phase='submitting';renderDialog();
      const identity=item.entitlement_id;
      const action=pending(identity)||{option_id:selected,request_id:requestId()};pending(identity,action);
      try {
        const data=await request(`${base()}/${identity}/claim`,{method:'POST',body:JSON.stringify(action)});
        setReceipt(data.reward_choice_receipt);
        if(data.profile)applyProfile(data.profile);
        if(dialog.open)cue();
      }catch(_error){
        // A response can be lost after commit. Read the authoritative receipt
        // before presenting a retry; never reroll options or grant locally.
        try {const data=await request(`${base()}/${identity}`,{cache:'no-store'});
          if(data.reward_choice_receipt){setReceipt(data.reward_choice_receipt);await refreshProfile();}
          else {phase='confirm';problem=true;}
        }catch(_readError){phase='confirm';problem=true;}
      }finally{
        busy=false;renderDialog();await load({force:true});onChange();
      }
    }
    document.getElementById('engineer-case-close')?.addEventListener('click',()=>dialog.close());
    card?.addEventListener('animationend',event=>{if(event.animationName==='engineer-card-rise')card.dataset.animationFinished='true';});
    dialog?.addEventListener('close',()=>{skip=true;if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus();});
    // Changing language updates dynamic labels without fetching or changing
    // the earned choices. CSS alone handles reduced-motion and low graphics.
    new MutationObserver(()=>{render();if(dialog.open)renderDialog();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    render();
    return Object.freeze({load,open,renderInbox,pendingCount:()=>listing?.pending?.length||0});
  }
  root.GridshardRewardChoices=Object.freeze({create});
})(globalThis);
