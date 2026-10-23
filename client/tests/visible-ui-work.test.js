const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

function hubFixture() {
  const paints = [], jobs = new Map(), events = {};
  let sequence = 0;
  const enqueue = fn => { jobs.set(++sequence, fn); return sequence; };
  const context = {
    appRouter:{currentScreen:'menu'}, RelayAppScreen:{MENU:'menu', PLAY:'play'},
    document:{hidden:false, body:{dataset:{appScreen:'menu'}}, getElementById:() => null, addEventListener:(type, fn) => { events[type] = fn; }},
    window:{setTimeout:enqueue}, requestIdleCallback:enqueue, performance:{now:() => 0},
    navigationSettleUntil:0, activeCardPage:'modules', metaProgressionState:null,
    renderDockIndicators:() => {},
  };
  for (const name of ['HomeHub', 'ModuleCollection', 'CoreCollection', 'Shop', 'CanonStatistics', 'ProfileHighlights', 'TeamHub'])
    context['render' + name] = () => paints.push(name);
  const start = source.indexOf('  const META_HUB_SECTIONS = Object.freeze([');
  const end = source.indexOf('  document.querySelectorAll("[data-team-tab]")', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end)
    + ';this.render=renderMetaHubScreens;this.home=renderHomeHubWhenVisible;', context);
  return {context, paints, jobs, events, drain() {
    let count = 0;
    while (jobs.size) {
      assert.ok(++count < 20, 'idle work must not keep queuing hidden screens');
      const [id, fn] = jobs.entries().next().value; jobs.delete(id); fn();
    }
  }};
}

test('repeated data refreshes never pre-render hidden hub screens', () => {
  const f = hubFixture();
  for (let n = 0; n < 100; n++) f.context.render();
  f.drain();
  assert.equal(f.paints.length, 100);
  assert.ok(f.paints.every(name => name === 'HomeHub'));
  assert.equal(f.jobs.size, 0);
  f.context.appRouter.currentScreen = 'team'; f.context.render(); f.drain();
  assert.equal(f.paints.at(-1), 'TeamHub');
  f.context.home();
  assert.equal(f.paints.at(-1), 'TeamHub', 'match status must not rebuild hidden Home');
});

test('Cards renders only the selected collection and battle has no hidden hub work', () => {
  const f = hubFixture();
  f.context.appRouter.currentScreen = 'modules'; f.context.render();
  assert.deepEqual(f.paints, ['ModuleCollection']);
  f.context.activeCardPage = 'cores'; f.context.render();
  assert.deepEqual(f.paints, ['ModuleCollection', 'CoreCollection']);
  f.context.appRouter.currentScreen = 'play';
  for (let n = 0; n < 100; n++) { f.context.render(); f.context.home(); }
  f.drain();
  assert.equal(f.paints.length, 2);
  f.context.appRouter.currentScreen = 'shop'; f.context.render();
  assert.equal(f.paints.at(-1), 'Shop', 'returning to a dirty screen uses current state');
});

test('hidden-tab updates coalesce and pending navigation work cannot run inside battle', () => {
  const f = hubFixture();
  f.context.document.hidden = true;
  for (let n = 0; n < 100; n++) f.context.render();
  assert.equal(f.paints.length, 0); assert.equal(f.jobs.size, 0);
  f.context.document.hidden = false; f.events.visibilitychange();
  assert.equal(f.jobs.size, 1); f.drain();
  assert.deepEqual(f.paints, ['HomeHub']);
  f.context.document.hidden = true; f.context.render();
  f.context.document.hidden = false; f.context.navigationSettleUntil = 1000;
  f.events.visibilitychange();
  f.context.appRouter.currentScreen = 'play'; f.drain();
  assert.deepEqual(f.paints, ['HomeHub']);
});

test('resuming social and event pages paints only that current surface', () => {
  const f = hubFixture();
  const visible = [];
  f.context.renderFriendsScreen = () => visible.push('friends');
  f.context.renderEventsHub = () => visible.push('events');
  for (const screen of ['friends','team-event','play']) {
    f.context.document.body.dataset.appScreen = screen;
    f.context.appRouter.currentScreen = screen;
    f.events.visibilitychange();
  }
  assert.deepEqual(visible, ['friends','events']);
  assert.equal(f.paints.length, 0);
  f.context.document.body.dataset.appScreen = 'team';
  f.context.appRouter.currentScreen = 'team';
  f.events.visibilitychange(); f.drain();
  assert.deepEqual(f.paints, ['TeamHub'], 'a team reply arriving while hidden is painted on resume');
});

test('closed inbox polls update notification counts without constructing message cards', () => {
  const nodes = new Map(); let cards = 0, created = 0;
  const node = () => ({children:[], flags:{}, classList:{toggle() {}},
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); }});
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  get('reward-inbox-dialog').open = false;
  get('reward-inbox-button').classList.toggle = (key, value) => { get('reward-inbox-button').flags[key] = value; };
  const context = {document:{getElementById:get, createElement:() => { created++; return node(); }},
    noteTeamApplicationsFromInbox() {}, pruneInboxExpansionState() {}, inboxReadStore:{has:() => false}, inboxReadKey:n => n.notice_id,
    INBOX_AREA_LIMIT:50, renderInboxDismissControls() {},
    rewardInboxState:{unclaimed_count:1, unread_count:3, messages:[{status:'unclaimed', category:'battle'}],
      purchases:[{notice_id:'purchase'}], notices:[{notice_id:'system'}]},
  };
  for (const name of ['createInboxInvitationCard', 'createInboxRewardCard', 'createInboxNoticeCard'])
    context[name] = () => { cards++; return node(); };
  const start = source.indexOf('  function renderRewardInbox() {');
  const end = source.indexOf('  // Arkadaşın ya da takım üyen', start);
  vm.runInNewContext(source.slice(start, end) + ';this.render=renderRewardInbox;', context);
  for (let n = 0; n < 100; n++) context.render();
  assert.equal(cards, 0); assert.equal(created, 0);
  assert.equal(get('reward-inbox-notification').textContent, '3');
  assert.equal(get('reward-inbox-button').flags['has-reward'], true);
  get('reward-inbox-dialog').open = true; context.render();
  assert.equal(cards, 3);
  assert.equal(get('reward-inbox-battle-rewards').children.length, 1);
  assert.equal(get('reward-inbox-notices').children.length, 1);
});

function cosmeticFixture() {
  let allocations = 0;
  class Element {
    constructor(tag) { allocations++; this.tag = tag; this.children = []; this.dataset = {}; this.style = {setProperty() {}}; }
    get firstElementChild() { return this.children[0] || null; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    addEventListener() {}
  }
  const ids = ['profile-avatar', 'lobby-profile-avatar', 'profile-hero-avatar', 'app-progress-ribbon',
    'avatar-choice-list', 'avatar-frame-choice-list', 'battle-emoji-choice-list', 'profile-background-choice-list'];
  const nodes = new Map(ids.map(id => [id, new Element('div')]));
  const context = {document:{getElementById:id => nodes.get(id), querySelector:() => null,
      createElement:tag => new Element(tag), documentElement:{lang:'tr'}},
    PROFILE_AVATARS:[{id:'default', nameTr:'Pilot'}, {id:'neon', nameTr:'Neon'}],
    PROFILE_AVATAR_ART:{neon:'neon.webp'}, PROFILE_AVATAR_FRAMES:[{id:'none'}, {id:'gold'}],
    PROFILE_BACKGROUNDS:[{id:'default', colors:['red','blue']}], BATTLE_EMOJIS:[{id:'none'}, {id:'wave'}],
    quickBattleEmoji:() => ({id:'wave'}), cosmeticStateLabel:() => new Element('small'),
    createBattleEmojiVisual:() => new Element('img'), selectProfileCosmetic() {}, view:{cosmetics:{}},
  };
  context.profileState = {viewModel:() => context.view};
  const avatarStart = source.indexOf('  const renderedAvatarArt = new WeakMap();');
  const avatarEnd = source.indexOf('  async function selectProfileCosmetic(', avatarStart);
  const choicesStart = source.indexOf('  let renderedCosmeticChoices = null;');
  const choicesEnd = source.indexOf('  function isPublicProfileTarget(', choicesStart);
  vm.runInNewContext(source.slice(avatarStart, avatarEnd) + source.slice(choicesStart, choicesEnd)
    + ';this.avatar=applyAvatarVisual;this.render=renderAvatarCustomization;', context);
  return {context, nodes, allocations:() => allocations};
}

test('unchanged avatars retain their artwork; changing only the frame does not recreate the image', () => {
  const f = cosmeticFixture(), host = f.nodes.get('profile-avatar');
  f.context.avatar(host, 'neon', 'none');
  const image = host.firstElementChild, count = f.allocations();
  for (let n = 0; n < 100; n++) f.context.avatar(host, 'neon', 'none');
  f.context.avatar(host, 'neon', 'gold');
  assert.equal(host.firstElementChild, image); assert.equal(f.allocations(), count);
  assert.equal(host.dataset.frame, 'gold');
  host.replaceChildren(); f.context.avatar(host, 'neon', 'gold');
  assert.notEqual(host.firstElementChild, image, 'cleared art must be repaired');
  f.context.avatar(host, 'unknown', 'none');
  assert.equal(host.dataset.avatar, 'default');
  assert.equal(host.firstElementChild.dataset.uiArt, 'profile');
});

test('cosmetic choices survive identical profile refreshes and invalidate on ownership, language or cleared DOM', () => {
  const f = cosmeticFixture(), host = f.nodes.get('avatar-choice-list');
  f.context.render();
  const first = host.firstElementChild, count = f.allocations();
  for (let n = 0; n < 100; n++) f.context.render();
  assert.equal(host.firstElementChild, first); assert.equal(f.allocations(), count);
  assert.equal(host.children[1].disabled, true);
  f.context.view.cosmetics = {selected_avatar_id:'neon', unlockedAvatarIds:['default','neon']};
  f.context.render();
  assert.equal(host.children[1].disabled, false); assert.equal(host.children[1].dataset.state, 'selected');
  const selected = host.firstElementChild;
  f.context.document.documentElement.lang = 'en'; f.context.render();
  assert.notEqual(host.firstElementChild, selected);
  host.replaceChildren(); f.context.render();
  assert.equal(host.children.length, 2);
});

test('gift countdown uses elapsed time after a stall and does no DOM work in a hidden tab', () => {
  let now = 1000, tick, timers = 0, loads = 0;
  const label = {}, card = {dataset:{claimRemaining:'10', claimReadyAt:'11000'}, querySelector:() => label};
  const context = {Date:{now:() => now}, document:{hidden:false, body:{dataset:{appScreen:'shop'}}, querySelectorAll:() => [card]},
    window:{setInterval:fn => { tick = fn; return ++timers; }}, giftChestActionLabel:n => String(n), loadMetaProgression:() => { loads++; }};
  const start = source.indexOf('  let shopCountdownTimer = null;');
  const end = source.indexOf('  async function metaProgressionMutation(', start);
  vm.runInNewContext(source.slice(start, end) + ';this.ensure=ensureShopCountdownTimer;', context);
  context.ensure(); context.ensure(); assert.equal(timers, 1);
  now = 7000; tick(); assert.equal(card.dataset.claimRemaining, '4');
  context.document.hidden = true; now = 12000; tick();
  assert.equal(card.dataset.claimRemaining, '4'); assert.equal(loads, 0);
  context.document.hidden = false; tick(); tick();
  assert.equal(card.dataset.claimRemaining, '0'); assert.equal(loads, 1);
  context.document.body.dataset.appScreen = 'play'; card.dataset.claimRemaining = '10'; tick();
  assert.equal(card.dataset.claimRemaining, '10');
});

function profileRequestFixture() {
  const pending = [], rendered = [], friendActions = [], nodes = new Map();
  for (const id of ['public-profile-dialog','team-profile-dialog','leaderboard-dialog','arena-detail-dialog',
    'public-profile-status','team-profile-status','public-profile-content','team-profile-content','team-profile-title'])
    nodes.set(id, {id, open:false, textContent:'', replaceChildren() {}, showModal() { this.open = true; },
      close() { this.open = false; }, setAttribute(name) { if (name === 'open') this.open = true; },
      removeAttribute(name) { if (name === 'open') this.open = false; }});
  const context = {document:{getElementById:id => nodes.get(id)}, participantPlayerId:'viewer', activePublicProfileId:null,
    publicProfileReturnDialogId:null, teamProfileReturnDialogId:null, isPublicProfileTarget:id => Boolean(id),
    renderPublicProfileIdentity() {}, renderPublicProfile:p => rendered.push(['public',p.player_id]),
    renderTeamProfile:p => rendered.push(['team',p.name]), renderPublicProfileFriendAction:p => { if (p) friendActions.push(p.player_id); },
    loadSocialView:async () => {}, requestJsonWithDeadline:url => new Promise((resolve,reject) => pending.push({url,resolve,reject})),
  };
  const publicStart = source.indexOf('  let publicProfileRequestVersion = 0;');
  const publicEnd = source.indexOf('  function renderTeamProfile(', publicStart);
  const teamStart = source.indexOf('  let teamProfileRequestVersion = 0;');
  const teamEnd = source.indexOf('  function renderLeaderboard(', teamStart);
  vm.runInNewContext(source.slice(publicStart, publicEnd) + source.slice(teamStart, teamEnd)
    + ';this.public=openPublicProfile;this.team=openTeamProfile;this.closePublic=closePublicProfile;this.closeTeam=closeTeamProfile;', context);
  return {context, nodes, pending, rendered, friendActions};
}

test('out-of-order player profile replies cannot replace the latest visit, including repeat visits to the same player', async () => {
  const f = profileRequestFixture();
  const old = f.context.public('same'), latest = f.context.public('same');
  f.pending[1].resolve({player_id:'new',is_bot:true}); await latest;
  f.pending[0].resolve({player_id:'old',is_bot:true}); await old;
  assert.deepEqual(f.rendered, [['public','new']]);
  const closed = f.context.public('closed'); f.context.closePublic();
  f.pending[2].resolve({player_id:'closed',is_bot:true}); await closed;
  const switched = f.context.public('previous-account'); f.context.participantPlayerId = 'another-viewer';
  f.pending[3].resolve({player_id:'previous-account',is_bot:true}); await switched;
  assert.deepEqual(f.rendered, [['public','new']]);
});

test('native modal closure and a later social reply cannot repaint a dismissed player profile', async () => {
  const f = profileRequestFixture(); let socialDone, socialStarted;
  const ready = new Promise(resolve => { socialStarted = resolve; });
  f.context.loadSocialView = () => new Promise(resolve => { socialDone = resolve; socialStarted(); });
  const work = f.context.public('person');
  f.pending[0].resolve({player_id:'person',is_bot:false});
  await ready;
  assert.deepEqual(f.rendered, [['public','person']]);
  f.nodes.get('public-profile-dialog').close(); socialDone(); await work;
  assert.deepEqual(f.friendActions, []);
  const failed = f.context.public('failed'); f.context.closePublic();
  const status = f.nodes.get('public-profile-status'), before = status.textContent;
  f.pending[1].reject(new Error('stale failure')); await failed;
  assert.equal(status.textContent, before);
});

test('team profile replies respect the latest request, closure and current account', async () => {
  const f = profileRequestFixture();
  const old = f.context.team('old'), latest = f.context.team('new');
  f.pending[1].resolve({name:'new'}); await latest;
  f.pending[0].resolve({name:'old'}); await old;
  assert.deepEqual(f.rendered, [['team','new']]);
  const closed = f.context.team('closed'); f.context.closeTeam();
  f.pending[2].resolve({name:'closed'}); await closed;
  const switched = f.context.team('other'); f.context.participantPlayerId = 'another-viewer';
  f.pending[3].resolve({name:'other'}); await switched;
  assert.deepEqual(f.rendered, [['team','new']]);
});
