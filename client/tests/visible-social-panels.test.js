const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

function extract(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}

function fixture(screen) {
  const nodes = new Map(), calls = [];
  let created = 0;
  const node = () => ({children:[], dataset:{}, value:'', resets:0,
    classList:{toggle() {}, add() {}},
    replaceChildren(...items) { this.resets++; this.children = items; },
    append(...items) { this.children.push(...items); },
    appendChild(item) { this.children.push(item); return item; },
    addEventListener() {}, setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    get options() { return this.children; }});
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const context = vm.createContext({
    document:{hidden:false, body:{dataset:{appScreen:screen}}, getElementById:get,
      querySelector:selector => selector === '[data-team-panel="management"]' ? get('management') : null,
      querySelectorAll:() => [], createElement:() => { created++; return node(); }},
    participantPlayerId:'own', activeFriendsTab:'friends', activeDirectMessagePeerId:'',
    activeTeamTab:'profile', activeTeamManagementTab:'cosmetics', activeWeeklyEventTab:'overview', activeTeamEventTab:'overview',
    socialState:{friends:[{player_id:'peer', display_name:'Peer'}], incoming_requests:[{}], outgoing_requests:[{}],
      battle_invites:[{status:'pending', challenger_id:'peer', opponent_id:'own'}]},
    sortedFriendsForBattle:() => [{player_id:'peer'}],
    createSocialPlayerCard:() => node(), createFriendsEmptyState:() => node(), createPublicPlayerName:() => node(),
    createTeamProfileLink:() => node(), createTeamMemberRow:() => node(),
    teamState:{joined:true, is_owner:true, members:[{player_id:'peer'}], messages:[{text:'Hello'}], online_opponents:[]},
    presetMessageText:m => m.text, teamDescriptionText:() => '', boundedWinRatePercent:() => 0,
    uiLocale:() => 'tr-TR', eventDateLabel:() => 'date', competitionStatusLabel:() => 'date', TEAM_TOURNAMENT_PHASE_TR:{},
    eventsState:{weekly_tournament:{standings:[{position:1,player_id:'peer'}]},
      team_tournament:{standings:[{position:1,team_id:'team'}]},viewer:{}},
    sendTeamMessage() {}, recentBattleInviteTargets:new Set(), autoLaunchedBattleSessions:new Set(),
  });
  for (const name of ['renderSocialNotificationDots','renderDirectMessageInbox','renderDirectMessageThread',
    'renderTeamSections','noteTeamApplicationsFromTeamState','renderTeamNotificationLights','renderTeamLobby',
    'renderTeamMenu','renderTeamManagement','renderTeamRequestComposer','renderTeamRequestList',
    'renderPresetMessagePicker','applyTeamAppearance','renderTrophyValue','renderTeamAppearanceEditor','renderTeamMemberManagement',
    'renderDailyMetaCard','renderEventSummary','renderEventSubpages','renderTeamTournamentCalendar',
    'renderTeamContributions','renderTeamFixtures','appendTournamentPrizeChest'])
    context[name] = () => calls.push(name);
  return {context, get, calls, created:() => created};
}

test('closed social refreshes preserve notifications without building friends or invitation DOM', () => {
  const f = fixture('menu');
  vm.runInContext(extract('  function renderFriendsScreen() {', '  // Arama kutusunu') + ';this.render=renderFriendsScreen;', f.context);
  for (let i=0;i<100;i++) f.context.render();
  assert.equal(f.created(), 0);
  assert.equal(f.get('friend-list').resets, 0);
  assert.equal(f.calls.filter(c => c === 'renderSocialNotificationDots').length, 100);
  f.context.document.body.dataset.appScreen = 'play'; f.context.render();
  f.context.document.body.dataset.appScreen = 'friends'; f.context.document.hidden = true; f.context.render();
  assert.equal(f.created(), 0);
});

test('friends tab navigation builds the selected live list, not every hidden list', () => {
  const f = fixture('friends');
  vm.runInContext(extract('  function openFriendsTab(tab) {', '  function openDirectMessageThread(')
    + extract('  function renderFriendsScreen() {', '  // Arama kutusunu') + ';this.open=openFriendsTab;', f.context);
  const hosts = ['friend-list','friend-request-list','friend-outgoing-list','friend-battle-list','friend-battle-invites'];
  for (const [tab, expected] of [['friends',[1,0,0,0,0]],['incoming',[1,1,0,0,0]],
    ['outgoing',[1,1,1,0,0]],['battle',[1,1,1,1,1]],['messages',[1,1,1,1,1]]]) {
    f.context.open(tab);
    assert.deepEqual(hosts.map(id => f.get(id).resets), expected, tab);
  }
  assert.equal(f.get('friend-battle-invites').children.length, 1, 'pending incoming challenge remains actionable');
  assert.equal(f.calls.filter(c => c === 'renderDirectMessageInbox').length, 1);
  assert.equal(f.calls.filter(c => c === 'renderDirectMessageThread').length, 1);
  f.context.socialState.social_closed = true; f.context.open('friends');
  assert.equal(f.get('friend-invite-create').disabled, true, 'parental social controls still apply');
});

test('closed team renders maintain application notifications without rebuilding team subpanels', () => {
  const f = fixture('menu');
  vm.runInContext(extract('  function renderTeamHub() {', '  // Veri değişikliği') + ';this.render=renderTeamHub;', f.context);
  for (let i=0;i<100;i++) f.context.render();
  assert.equal(f.created(), 0);
  assert.equal(f.calls.filter(c => c === 'noteTeamApplicationsFromTeamState').length, 100);
  assert.equal(f.calls.filter(c => c === 'renderTeamNotificationLights').length, 100);
  assert.equal(f.calls.includes('renderTeamLobby'), false);
});

test('team lists, requests, chat and training render only on their selected tab', () => {
  const f = fixture('team');
  vm.runInContext(extract('  function renderTeamHub() {', '  // Veri değişikliği') + ';this.render=renderTeamHub;', f.context);
  const hosts = ['team-member-list','team-message-list','team-training-opponent','team-training-list'];
  for (const [tab, expected] of [['profile',[0,0,0,0]],['members',[1,0,0,0]],
    ['requests',[1,0,0,0]],['chat',[1,1,0,0]],['battle',[1,1,1,1]]]) {
    f.context.activeTeamTab = tab; f.context.render();
    assert.deepEqual(hosts.map(id => f.get(id).resets), expected, tab);
  }
  assert.equal(f.calls.filter(c => c === 'renderTeamRequestList').length, 1);
  assert.equal(f.calls.filter(c => c === 'renderPresetMessagePicker').length, 1);
  f.context.teamState.joined = false; f.context.render();
  assert.equal(f.calls.at(-1), 'renderTeamLobby');
});

test('team management builds only the visible editor and respects ownership loss', () => {
  const f = fixture('team');
  vm.runInContext(extract('  function renderTeamManagement() {', '  // --- Takım: modül parçası') + ';this.render=renderTeamManagement;', f.context);
  f.context.render(); assert.deepEqual(f.calls, []);
  f.context.activeTeamTab = 'management'; f.context.render();
  assert.deepEqual(f.calls, ['renderTeamAppearanceEditor']);
  f.context.activeTeamManagementTab = 'members'; f.context.render();
  assert.deepEqual(f.calls, ['renderTeamAppearanceEditor','renderTeamMemberManagement']);
  f.context.teamState.is_owner = false; f.context.render(); assert.equal(f.calls.length, 2);
});

test('event directory and hidden screens never build tournament standings or fixtures', () => {
  const f = fixture('events');
  f.context.renderWeeklyTournament = () => f.calls.push('weekly');
  f.context.renderTeamTournament = () => f.calls.push('team');
  vm.runInContext(extract('  function renderEventsHub() {', '  const eventViewReads =') + ';this.render=renderEventsHub;', f.context);
  f.context.render(); assert.deepEqual(f.calls, ['renderDailyMetaCard']);
  f.context.document.body.dataset.appScreen = 'weekly-event'; f.context.render();
  assert.deepEqual(f.calls.slice(-2), ['weekly','renderEventSubpages']);
  f.context.document.body.dataset.appScreen = 'team-event'; f.context.render();
  assert.deepEqual(f.calls.slice(-2), ['team','renderEventSubpages']);
  const count = f.calls.length;
  f.context.document.hidden = true; f.context.render();
  f.context.document.hidden = false; f.context.document.body.dataset.appScreen = 'play'; f.context.render();
  assert.equal(f.calls.length, count);
});

test('weekly and team tournament tabs build only their visible standings, calendar or fixtures', () => {
  const f = fixture('weekly-event');
  vm.runInContext(extract('  function renderWeeklyTournament(state) {', '  // Takımlar arası turnuva')
    + extract('  function renderTeamTournament(state) {', '  function renderTeamTournamentCalendar(')
    + ';this.weekly=()=>renderWeeklyTournament(eventsState);this.team=()=>renderTeamTournament(eventsState);', f.context);
  f.context.weekly(); assert.equal(f.get('weekly-tournament-standings').resets, 0);
  f.context.activeWeeklyEventTab = 'standings'; f.context.weekly();
  assert.equal(f.get('weekly-tournament-standings').children.length, 1);
  f.context.team(); assert.equal(f.get('team-tournament-standings').resets, 0);
  assert.equal(f.calls.filter(c => c === 'renderTeamTournamentCalendar').length, 1);
  f.context.activeTeamEventTab = 'standings'; f.context.team();
  assert.equal(f.get('team-tournament-standings').children.length, 1);
  assert.equal(f.calls.filter(c => c === 'renderTeamContributions').length, 1);
  f.context.activeTeamEventTab = 'fixtures'; f.context.team();
  assert.equal(f.get('team-tournament-standings').resets, 1);
  assert.equal(f.calls.filter(c => c === 'renderTeamFixtures').length, 1);
  assert.equal(f.calls.filter(c => c === 'renderTeamTournamentCalendar').length, 1);
});

test('hidden profile details never read profile data or build deck/honor cards', () => {
  const f = fixture('menu'); let reads=0, mounted=0, honors=0;
  Object.assign(f.context, {
    profileState:{viewModel:() => {reads++; return {battlePoolIds:['laser'],cosmetics:{}};}},
    metaProgressionState:null, moduleDefinitions:[{definitionId:'laser',nameTr:'Lazer'}],
    mountModuleEmblem:() => {mounted++;}, mountCoreEmblem() {}, applyCoreVisualIdentity() {},
    localizedUiText:s => s, fillHonorCollection:() => {honors++;}, PROFILE_RANK_TROPHIES:[], PROFILE_BADGES:[],
  });
  vm.runInContext(extract('  function renderProfileHighlights() {', '  const renderedAvatarArt =')
    + extract('  function renderProfileHonorShowcase() {', '  // Devre Koleksiyonu')
    + ';this.details=()=>{renderProfileHighlights();renderProfileHonorShowcase();};', f.context);
  for(const screen of ['menu','shop','modules','statistics','play']) {
    f.context.document.body.dataset.appScreen=screen;
    for(let i=0;i<100;i++)f.context.details();
  }
  assert.equal(reads,0);assert.equal(mounted,0);assert.equal(honors,0);assert.equal(f.created(),0);
  f.context.document.body.dataset.appScreen='profile';f.context.document.hidden=true;f.context.details();
  assert.equal(reads,0);
  f.context.document.hidden=false;f.context.details();
  assert.equal(reads,2);assert.equal(mounted,1);assert.equal(honors,2);
});
