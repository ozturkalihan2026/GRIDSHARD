const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
const between = (start, end) => {
  const i = source.indexOf(start), j = source.indexOf(end, i);
  assert.ok(i >= 0 && j > i, start);
  return source.slice(i, j);
};
const loaders = [
  ['team', 'teamState', 'teamViewReads', '  async function loadTeamView()', '  function setFriendsStatus('],
  ['social', 'socialState', 'socialViewReads', '  async function loadSocialView(', '  function parseGridshardDeepLink('],
  ['events', 'eventsState', 'eventViewReads', '  async function loadEventsView()', '  async function registerEvent('],
  ['daily', 'dailyMetaState', 'dailyMetaReads', '  async function loadDailyMetaState(', '  async function rollDailyMeta('],
  ['leaderboard', 'leaderboardPayload', 'leaderboardReads', '  async function loadLeaderboard()', '  function openLeaderboard('],
];

function fixture(spec) {
  const pending = [], paints = [], startup = [], nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'',open:true,shown:0,
      showModal() { this.open = true; this.shown++; }, setAttribute() {}});
    return nodes.get(id);
  };
  get('review-access-dialog').open = false;
  get('daily-meta-dialog').open = false;
  const request = (url, response = false) => new Promise((resolve, reject) => pending.push({url, reject,
    resolve:payload => resolve(response ? {ok:true, json:async () => payload} : payload)}));
  const context = vm.createContext({
    document:{hidden:false,getElementById:get}, participantPlayerId:'own',
    teamState:null, socialState:null, eventsState:null, dailyMetaState:null, leaderboardPayload:null,
    requestJsonWithDeadline:url => request(url),
    fetchWithDeadline:async (url, _options, _timeout, consume) => {
      const response=await request(url, true); return consume ? consume(response) : response;
    },
    renderTeamSections() {}, setTeamActionStatus() {}, setFriendsStatus() {},
    renderTeamHub:() => paints.push('team'), renderFriendsScreen:() => paints.push('social'),
    renderEventsHub:() => paints.push('events'), renderDailyMetaCard:() => paints.push('daily-card'),
    renderDailyMetaDialog:() => paints.push('daily'), renderLeaderboard:() => paints.push('leaderboard'),
    loadDailyMetaState:() => paints.push('daily-load'), afterStartup:fn => startup.push(fn),
  });
  const [, state, owner, start, end] = spec;
  vm.runInContext(between('  function createViewReadOwner(', '  const teamViewReads =')
    + `const ${owner}=createViewReadOwner(()=>${state});`
    + between(start,end) + `;this.load=${start.match(/function (\w+)/)[1]};`, context);
  return {context,pending,paints,startup,get,state};
}

for (const spec of loaders) {
  test(`${spec[0]}: out-of-order reads and stale errors cannot replace the latest data/UI`, async () => {
    const f = fixture(spec);
    const old = f.context.load(), latest = f.context.load();
    const payload = {name:'latest'};
    f.pending[1].resolve(payload); assert.equal((await latest).ok, true);
    const count = f.paints.length;
    f.pending[0].resolve({name:'old'}); assert.equal((await old).stale, true);
    assert.equal(f.context[f.state], payload); assert.equal(f.paints.length, count);
    const failedOld = f.context.load(), next = f.context.load();
    f.pending[3].resolve(payload); await next;
    f.pending[2].reject(new Error('stale-error')); assert.equal((await failedOld).stale, true);
    for (const node of ['team-connection-state','event-action-status','daily-meta-dialog-status','leaderboard-status'])
      assert.notEqual(f.get(node).textContent, 'stale-error');
  });

  test(`${spec[0]}: account switch discards a pending reply before state/UI/child work`, async () => {
    const f = fixture(spec), pending = f.context.load();
    assert.match(f.pending[0].url, /own/, 'the URL captures the initiating account');
    f.context.participantPlayerId = 'other';
    f.pending[0].resolve({name:'previous-account'});
    assert.equal((await pending).stale, true);
    assert.equal(f.context[f.state], null); assert.equal(f.paints.length, 0);
    assert.equal(f.startup.length, 0);
  });

  test(`${spec[0]}: a read cannot overwrite a newer mutation's state object`, async () => {
    const f = fixture(spec), pending = f.context.load();
    const mutation = {name:'mutation'}; f.context[f.state] = mutation;
    f.pending[0].resolve({name:'before-mutation'});
    assert.equal((await pending).stale, true);
    assert.equal(f.context[f.state], mutation); assert.equal(f.paints.length, 0);
  });
}

test('closed/hidden leaderboard may refresh its cache, never its detached or invisible UI', async () => {
  const f = fixture(loaders[4]);
  const closed = f.context.load(); f.get('leaderboard-dialog').open = false;
  f.pending[0].resolve({name:'cached'}); assert.equal((await closed).ok, true);
  assert.equal(f.context.leaderboardPayload.name, 'cached'); assert.equal(f.paints.length, 0);
  const hidden = f.context.load(); f.get('leaderboard-dialog').open = true; f.context.document.hidden = true;
  f.pending[1].resolve({name:'hidden'}); await hidden; assert.equal(f.paints.length, 0);
});

test('queued daily-meta presentation cannot reopen the dialog after an account or data change', async () => {
  for (const change of ['account','state']) {
    const f = fixture(loaders[3]), pending = f.context.load({present:true});
    f.pending[0].resolve({requires_roll:true}); await pending;
    assert.equal(f.startup.length, 1);
    if (change === 'account') f.context.participantPlayerId = 'other';
    else f.context.dailyMetaState = {requires_roll:false,selected:true};
    f.startup[0](); assert.equal(f.get('daily-meta-dialog').shown, 0);
  }
});
