/* UI-01 design fixture. No fetch, game imports, account state or persistence. */
(() => {
  'use strict';
  const root = '../../../../client/assets/ui/';
  const $ = id => document.getElementById(id);
  const names = {
    home:['Ana ekran','Home'], shop:['Mağaza','Shop'], product:['Teklif detayı','Offer details'],
    choice:['Mühendis Kasası','Engineer Case'], season:['Sezon','Season'], profile:['Profil','Profile'], post:['Maç sonrası','Post-battle'],
  };
  const states = {
    ready:['Hazır','Ready'], new:['İlk6 / yeni oyuncu','Starter six / new player'], returning:['Geri dönen','Returning'],
    loading:['Yükleniyor','Loading'], error:['Hata','Error'], offline:['Çevrimdışı','Offline'], empty:['Boş','Empty'],
    locked:['Kilitli','Locked'], insufficient:['Yetersiz bakiye','Insufficient balance'], limit:['Limit doldu','Limit reached'],
    expired:['Süresi doldu','Expired'], review:['Seçimi incele','Review choice'], result:['Örnek teslim sonucu','Example receipt'],
    scheduled:['Sezon başlamadı','Not started'], intermission:['Sezon arası','Intermission'], public:['Ziyaretçi','Public view'],
    team:['Takım','Team'], training:['Eğitim','Training'], loss:['Yenilgi','Defeat'],
  };
  const allowed = {
    home:['ready','new','returning','loading','offline'], shop:['ready','empty','loading','error','offline'],
    product:['ready','locked','insufficient','limit','expired','loading','error','offline'],
    choice:['ready','review','result','locked','empty','loading','error','offline'],
    season:['ready','scheduled','intermission','empty','loading','error','offline'],
    profile:['ready','public','team','locked','empty','loading','error','offline'],
    post:['ready','loss','training','loading','offline'],
  };
  const params = new URLSearchParams(location.search);
  let language = params.get('lang') === 'en' ? 'en' : 'tr';
  let screen = Object.hasOwn(names, params.get('screen')) ? params.get('screen') : 'home';
  let state = allowed[screen].includes(params.get('state')) ? params.get('state') : 'ready';
  let selection = 'laser';
  const modules = [
    ['laser','Lazer','Laser','Saldırı','Attack'], ['shield','Kalkan','Shield','Savunma','Defense'],
    ['amplifier','Yükselteç','Amplifier','Taktik','Tactic'],
  ];
  const t = (tr,en) => language === 'en' ? en : tr;
  const img = (path, cls = '', alt = '') => `<img class="${cls}" src="${root}${path}" alt="${alt}">`;
  const button = (tr,en,action,cls='') => `<button type="button" class="${cls}" data-action="${action}">${t(tr,en)}</button>`;
  const panel = content => `<section class="panel">${content}</section>`;
  const badge = (tr,en) => `<span class="tag">${t(tr,en)}</span>`;
  const deck = () => `<div class="deck" aria-label="${t('Başlangıç Devresi','Starter Circuit')}">${['laser','pulse_cannon','shield','armor','repair','amplifier'].map(id=>`<span>${img('modules-physical-v1/'+id+'.webp')}</span>`).join('')}</div>`;
  function goto(next, variant = 'ready') { screen=next; state=variant; render(); $('content').focus(); }
  function sharedState() {
    const copy = {
      loading:t('Hesabın güncel durumu yükleniyor.','Loading the current account state.'),
      error:t('Bilgi alınamadı. Kazanılmış hakların korunur.','Unable to load. Your earned entitlements are preserved.'),
      offline:t('Bağlantı yok. Kayıt veya teslim doğrulanamadı.','Offline. Saving or delivery could not be confirmed.'),
      empty:t('Şu anda gösterilecek içerik yok.','There is no content to show right now.'),
    };
    return panel(`<span class="eyebrow">${t('DURUM','STATUS')}</span><h2>${states[state][language==='en'?1:0]}</h2><p>${copy[state]}</p>${state==='loading'?'<progress class="meter" aria-label="'+t('Yükleniyor','Loading')+'"></progress>':''}${state==='error'||state==='offline'?button('Tekrar Dene','Retry','retry','wide'):''}${button('Ana Ekrana Dön','Back to Home','home','wide')}`);
  }
  function home() {
    return panel(`<span class="eyebrow">${t('BAŞLANGIÇ DEVRESİ','STARTER CIRCUIT')}</span><div class="hero"><div><h2>${t('Uç','Uç')}</h2><p class="muted">${t('Desten hazır. Sıradaki hamle senin.','Your deck is ready. Make your next move.')}</p></div>${img('cores-physical-v1/core_resonance.webp','hero-art core-art')}</div>${deck()}${button('SAVAŞ','BATTLE','battle','primary wide')}`)
      +panel(`<span class="eyebrow">${t('BUGÜNÜN HEDEFİ','TODAY’S GOAL')}</span><h2>${state==='new'?t('İlk savaşın','Your first battle'):t('Seçimin hazır','Your choice is ready')}</h2><p>${state==='new'?t('Saldırını büyüt veya savunmayla alan tut. Başlangıçtaki altı modülün yeterli.','Build your attack or hold ground with defence. Your six starter modules are enough.'):t('Kazandığın Mühendis Kasası için üç paketten birini seç.','Choose one of three packs from your earned Engineer Case.')}</p>${button(state==='new'?'Savaş Yardımı':'Seçenekleri Gör',state==='new'?'Battle Help':'View Choices',state==='new'?'help':'choice','wide')}`)
      +(state==='returning'?panel(`<h3>${t('Gelişmeleri tekrar oku','Read what changed')}</h3><p>${t('Duyuru Mesaj Kutusu → Sistem’de. Desten ve kazanılmış hakların korunur.','The announcement stays in Inbox → System. Your deck and earned entitlements are preserved.')}</p>${button('Sistem Mesajlarını Gör','View System Messages','inbox','wide')}`):'');
  }
  function shop() {
    return `<div class="tabs">${button('Öne Çıkanlar','Featured','featured')}${button('Sandıklar','Chests','chests')}</div>`
      +panel(`<span class="eyebrow">${t('HEDİYE','GIFT')}</span><div class="hero">${img('chests-casual-v2/bronze.webp','hero-art')}<div><h2>${t('Hediye Sandık','Gift Chest')}</h2>${badge('Alınabilir','Available')}<p>${t('Sunucunun doğruladığı ücretsiz sandık.','A free chest confirmed by the server.')}</p></div></div>${button('Sandığı İncele','Inspect Chest','chest','primary wide')}`)
      +panel(`<span class="eyebrow">${t('OYUN PARASIYLA','IN-GAME CURRENCY')}</span><h2>${t('Garantili modül parçası','Guaranteed module shards')}</h2><div class="row">${img('modules-physical-v1/laser.webp')}<div><strong>${t('Lazer · 12 parça','Laser · 12 shards')}</strong><small>${t('Haftalık kalan alım: 2 / 2','Purchases left this week: 2 / 2')}</small></div><span class="price">500</span>${img('currency-v1/credit.webp')}</div>${button('Teklifi İncele','View Offer','product','wide')}`)
      +`<section class="panel collection-preview"><span class="eyebrow">${t('KOLEKSİYON VİTRİNİ','COLLECTION PREVIEW')}</span><h3>${t('Gelecek koleksiyonlar','Upcoming collections')}</h3><p>${t('Önizleme, sahiplik veya kuşanma hakkı vermez.','Previewing does not grant ownership or equip rights.')}</p>${button('Yeni Koleksiyonları Önizle','Preview New Collections','preview','accent wide')}</section>`;
  }
  function product() {
    const reason = {locked:t('Bu teklif için gerekli arena henüz açılmadı.','The required arena is not unlocked.'),insufficient:t('500 kredi gerekiyor. Örnek bakiye: 120.','500 credits required. Example balance: 120.'),limit:t('Bu haftanın iki alımı da kullanıldı.','Both purchases for this week have been used.'),expired:t('Teklif penceresi kapandı; güncel teklifi yenile.','The offer window closed. Refresh to see the current offer.')}[state];
    return panel(`<span class="eyebrow">${t('GARANTİLİ İÇERİK','GUARANTEED CONTENT')}</span><div class="hero">${img('modules-physical-v1/laser.webp','hero-art')}<div><h2>${t('Lazer parçaları','Laser shards')}</h2><p class="result-number">12 ${t('parça','shards')}</p>${badge('Sıradan','Common')}</div></div><p>${t('Hedef oyuncu ve hafta için sabit; desteni değiştirmek teklifi yenilemez.','The target is fixed per player and week. Changing your deck does not reroll it.')}</p><div class="row"><div><strong>${t('Fiyat','Price')}</strong><small>${t('Kalan alım: 2 / 2 · Süre: örnek hafta','Remaining: 2 / 2 · Window: example week')}</small></div><span class="price">500 ${t('Devre Kredisi','Circuit Credits')}</span></div>${reason?`<p class="state-message">${reason}</p><button class="wide" disabled>${t('Alım kullanılamıyor','Purchase unavailable')}</button>`:button('Alımı İncele · 500','Review Purchase · 500','purchase','primary wide')}${button('Mağazaya Dön','Back to Shop','shop','wide')}<p class="status" role="status" id="local-status"></p>`);
  }
  function choice() {
    if(state==='locked')return panel(`<h2>${t('Yeni kazanım kapalı','New accrual is closed')}</h2><p>${t('Sürüm ve yürürlük koşulu açılmadı. Önceden kazanılmış haklar ayrı listelenir.','Version and rollout requirements are not active. Previously earned entitlements remain separate.')}</p>${button('Kazanılmış Hakları Gör','View Earned Entitlements','choice-empty','wide')}`);
    const selected = modules.find(m=>m[0]===selection);
    let body = `<div class="hero">${img('engineer-case-v1/'+(state==='result'?'open':'closed')+'.webp','hero-art')}<div><span class="eyebrow">${t('KAZANILMIŞ HAK','EARNED ENTITLEMENT')}</span><h2>${t('Mühendis Kasası','Engineer Case')}</h2><p>${t('Üç paketten yalnız birini alırsın.','You receive only one of three packs.')}</p></div></div>`;
    if(state==='ready')body+=modules.map(m=>`<button class="option" data-option="${m[0]}" aria-pressed="${selection===m[0]}">${img('modules-physical-v1/'+m[0]+'.webp')}<span><small>${t(m[3],m[4])}</small><strong>${t(m[1],m[2])}</strong><small>${t('Örnek paket · 20 parça','Example pack · 20 shards')}</small></span></button>`).join('')+button('Seçimi İncele','Review Choice','review','primary wide')+button('Sonra Seç','Choose Later','home','wide');
    else if(state==='review')body+=`<h3>${t('Seçimini onayla','Confirm your choice')}</h3><div class="row">${img('modules-physical-v1/'+selection+'.webp')}<div><strong>${t(selected[1],selected[2])}</strong><small>${t('Yalnız bu paket teslim edilir.','Only this pack will be delivered.')}</small></div></div><p>${t('Gerçek oyunda miktar, hak anındaki sabit sunucu paketinden gelir.','In the game, the amount comes from the fixed entitlement snapshot.')}</p>${button('Örnek Onayı Göster','Simulate Confirmation','result','primary wide')}${button('Seçeneklere Dön','Back to Choices','choice','wide')}`;
    else body+=`<h3>${t('Örnek sonuç görünümü','Example result view')}</h3><p>${t(selected[1],selected[2])} · ${t('tek seçimin makbuzu burada gösterilir.','the receipt for your one choice appears here.')}</p><p class="state-message">${t('Bu prototip teslim yapmaz. Gerçek ekran yalnız sunucu makbuzundan sonra sonuç gösterir.','This prototype grants nothing. The game shows a result only after a server receipt.')}</p>${button('Tamam','Done','home','primary wide')}`;
    return panel(body);
  }
  function season() {
    const closed=state==='scheduled'||state==='intermission';
    return panel(`<span class="eyebrow">${t('ÜCRETSİZ SEZON YOLU','FREE SEASON ROAD')}</span><h2>${t('Sezon ilerlemen','Season progress')}</h2>${badge(closed?(state==='scheduled'?'Başlangıç bekleniyor':'Sezon arası'):'Sezon aktif',closed?(state==='scheduled'?'Not started':'Intermission'):'Season active')}<p>${closed?t('Yeni sezon ancak onaylanan takvimle açılır. Kazanılmış hakların korunur.','The next season opens only on its approved schedule. Earned entitlements are preserved.'):t('Örnek dönem · 4 tam hafta. Gerçek tarihler sunucudan gelir.','Example period · four full weeks. Actual dates come from the server.')}</p>${closed?'':'<progress class="meter" max="100" value="40" aria-label="'+t('Sezon ilerlemesi','Season progress')+'"></progress>'}`)
      +panel(`<h3>${t('Sıradaki hedef','Next milestone')}</h3>${[1,2,3].map((n)=>`<div class="road-item">${img(n===2?'chests-casual-v2/silver.webp':'currency-v1/credit.webp')}<div><strong>${t('Örnek yol ödülü','Example road reward')} ${n}</strong><small>${closed?t('Yeni kazanım kapalı','New accrual closed'):t(n===1?'Alındı':'Eşiği tamamla',n===1?'Claimed':'Reach the milestone')}</small></div><span aria-hidden="true">${n===1?'✓':'◇'}</span></div>`).join('')}<p class="muted">${t('Ücretli geçiş gösterilmez. Kozmetik kaynağı ve kilit nedeni detayda açıklanır.','The paid pass is hidden. Cosmetic source and lock reason are shown in details.')}</p>${button('Kazanılmış Hakları Gör','View Earned Entitlements','choice','wide')}`);
  }
  function profile() {
    const team=state==='team', publicView=state==='public';
    return panel(`<div class="hero">${img(team?'dock-casual-v1/team.webp':'common-icons-v1/profile.webp','avatar')}<div><span class="eyebrow">${t(team?'TAKIM PROFİLİ':publicView?'OYUNCU ZİYARETİ':'OYUNCU PROFİLİ',team?'TEAM PROFILE':publicView?'PLAYER VISIT':'PLAYER PROFILE')}</span><h2>${team?'Giresunlular':'Uç'}</h2><p class="muted">${t('Örnek profil · korunmuş ilerleme','Example profile · preserved progress')}</p></div></div>`)
      +panel(`<h3>${t(team?'Takım koleksiyonu':'En Çok Kullanılan Deste',team?'Team collection':'Most Used Deck')}</h3>${team?`<p>${t('Üyeler ve takım kazanımları burada sıralanır.','Members and team achievements appear here.')}</p>`:deck()}${state==='locked'?`<p class="state-message">${t('Kilitli koleksiyon · kaynağı ve dönemini inceleyebilirsin. Kuşanılamaz.','Locked collection · inspect its source and period. It cannot be equipped.')}</p>`:''}`)
      +`<section class="panel collection-preview"><h3>${t('Koleksiyon vitrini','Collection preview')}</h3><p>${t('Sahip olunanlar ve kilitli önizleme birbirinden ayrılır.','Owned items and locked previews remain distinct.')}</p>${button('Yeni Koleksiyonları Önizle','Preview New Collections','preview','accent wide')}</section>`
      +(publicView?panel(`${button('Takım Profilini Aç','Open Team Profile','team','wide')}`):'');
  }
  function post() {
    const training=state==='training';
    return panel(`<span class="eyebrow">${t('KESİNLEŞMİŞ SONUÇ','FINAL RESULT')}</span><h2>${t(training?'Eğitim tamamlandı':state==='loss'?'Yenilgi':'Zafer',training?'Training complete':state==='loss'?'Defeat':'Victory')}</h2><div class="hero">${img('cores-physical-v1/core_resonance.webp','hero-art')}<div>${training?`<p>${t('Bu tekrar eğitimi kupa, XP ve ödül vermez.','This replay training grants no trophies, XP or rewards.')}</p>`:`<p>${t('Örnek maç · sunucu sonucu esas alınır.','Example battle · the server result is authoritative.')}</p><span class="tag">${t('Ödül makbuzu alanı','Reward receipt area')}</span>`}</div></div>`)
      +panel(`<h3>${t('Sıradaki hamlen','Your next move')}</h3><p>${t('Uygun yeni modülün varsa desteni inceleyebilirsin. Başlangıç altılısında değişiklik zorunlu değil.','Review your deck if you have a valid alternative. No change is required with only the starter six.')}</p>${button('Tekrar Savaş','Battle Again','battle','primary wide')}${button('Desteyi İncele','Review Deck','deck','wide')}${button('Ana Ekran','Home','home','wide')}`);
  }
  function render() {
    document.documentElement.lang=language;
    $('language').value=language;
    $('screen').innerHTML=Object.entries(names).map(([id,label])=>`<option value="${id}">${label[language==='en'?1:0]}</option>`).join(''); $('screen').value=screen;
    $('state').innerHTML=allowed[screen].map(id=>`<option value="${id}">${states[id][language==='en'?1:0]}</option>`).join(''); $('state').value=state;
    $('prototype-note').textContent=t('Tasarım prototipi · örnek veriler · sunucuya bağlanmaz.','Design prototype · sample data · no server connection.');
    $('scope-note').textContent=t('Yerleşim ve durum örneğidir; gerçek oyun kabulü değildir.','Layout and state fixture; this is not game acceptance.');
    $('screen-label').textContent=t('Ekran','Screen'); $('state-label').textContent=t('Durum','State'); $('language-label').textContent=t('Dil','Language');
    $('spec-link').textContent=t('Ekran sözleşmesi','Screen specification'); $('back').setAttribute('aria-label',t('Geri','Back'));
    $('resources').setAttribute('aria-label',t('Örnek kaynaklar','Example resources'));
    $('resources').innerHTML=`<span class="currency">${img('currency-v1/flux.webp','',t('Akı','Flux'))}240</span><span class="currency">${img('currency-v1/credit.webp','',t('Devre Kredisi','Circuit Credits'))}${state==='insufficient'?'120':'1.200'}</span>`;
    $('title').textContent=names[screen][language==='en'?1:0];
    $('content').innerHTML=['loading','error','offline','empty'].includes(state)?sharedState():({home,shop,product,choice,season,profile,post}[screen])();
    $('dock').className='dock'; $('dock').setAttribute('aria-label',t('Ana menü','Main navigation'));
    const docks=[['shop','shop-chamfer-v2','Mağaza','Shop'],['profile','cards','Kartlar','Cards'],['home','battle-swords-v2','Savaş','Battle'],['profile','team','Takım','Team'],['season','events','Etkinlik','Events']];
    $('dock').innerHTML=docks.map(([target,art,tr,en],i)=>`<button data-action="${i===1?'deck':i===3?'team':target}" ${target===screen&&i!==1&&i!==3?'aria-current="page"':''}>${img('dock-casual-v1/'+art+'.webp')}<span>${t(tr,en)}</span>${i===0&&state==='ready'?'<i class="notification" aria-label="'+t('Hediye sandık alınabilir','Gift chest available')+'"></i>':''}</button>`).join('');
    $('footnote').textContent=t('Hiçbir satın alma, ödül teslimi veya kalıcı kayıt yapılmaz.','No purchases, reward grants or persistent writes occur.');
    history.replaceState(null,'',`?screen=${screen}&state=${state}&lang=${language}`);
  }
  document.addEventListener('click', event=>{
    const option=event.target.closest('[data-option]');
    if(option){selection=option.dataset.option;render();document.querySelector(`[data-option="${selection}"]`)?.focus();return;}
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    if(Object.hasOwn(names,action))return goto(action);
    if(action==='retry')return goto(screen);
    if(action==='review'||action==='result')return goto('choice',action);
    if(action==='team')return goto('profile','team');
    if(action==='choice-empty')return goto('choice','empty');
    const messages={battle:t('Örnek savaş eylemi. Bu prototip maç başlatmaz.','Example battle action. This prototype does not start a match.'),help:t('Saldırını büyüt veya savunmayla alan tut. Gerçek savaşta ipuçları engellemez.','Build attack or hold ground with defence. In-game cues do not block combat.'),inbox:t('Duyuru Sistem mesajında kalır; bu prototip mesaj göndermez.','The announcement remains in System mail. This prototype sends no messages.'),purchase:t('Alım incelemesi: Lazer, 12 parça, 500 kredi. Gerçek işlem yalnız sunucuda tamamlanır.','Purchase review: Laser, 12 shards, 500 credits. Actual purchase completes only on the server.'),preview:t('Kilitli önizleme. Sahiplik/kuşanma verilmez; yeni sanat teslimi değildir.','Locked preview. No ownership or equip rights; no new art delivery.'),deck:t('Başlangıç Devresi: altı modül. Geçerli alternatif yoksa değişiklik istenmez.','Starter Circuit: six modules. No change is requested without a valid alternative.'),chest:t('Normal sandık ayrı açılır; Mühendis Kasası seçim hakkıyla karışmaz.','Normal chest opening is separate from the Engineer Case choice.'),featured:t('Öne çıkan ürün örnekleri gösteriliyor.','Showing example featured offers.'),chests:t('Normal sandıklar kendi garanti/olasılık ve limit bilgisiyle listelenir.','Normal chests list their own guarantees, odds and limits.')};
    let status=$('local-status');if(!status){status=document.createElement('p');status.id='local-status';status.className='state-message';status.setAttribute('role','status');$('content').append(status);}status.textContent=messages[action]||'';status.scrollIntoView({block:'nearest'});
  });
  $('back').addEventListener('click',()=>goto(screen==='product'?'shop':'home'));
  $('screen').addEventListener('change',e=>goto(e.target.value));
  $('state').addEventListener('change',e=>{state=e.target.value;render();});
  $('language').addEventListener('change',e=>{language=e.target.value;render();});
  render();
})();
