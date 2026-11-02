const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('native public team profiles go to the production API with the viewer token', async () => {
  const calls = [];
  const storage = new Map([['project-relay.web-test.participant-id', 'viewer']]);
  const context = {URL, Headers, GRIDSHARD_API_BASE_URL:'https://play.gridshardgame.com',
    location:{href:'https://localhost/',origin:'https://localhost'},
    localStorage:{getItem:key=>storage.get(key)},
    GridshardDeviceSecretStore:class {},
    fetch:async (input, init)=>{calls.push({input, init});return {status:200};}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/auth-session.js','utf8'),context);
  const session = context.GridshardAuth.session;
  Object.assign(session,{playerId:'viewer',accessToken:'viewer-token',expiresAt:9999999999});
  await context.fetch('/team-profiles/team-foreign', {cache:'no-store'});
  assert.equal(calls[0].input,'https://play.gridshardgame.com/team-profiles/team-foreign');
  assert.equal(calls[0].init.headers.get('authorization'),'Bearer viewer-token');
  assert.equal(session.playerId,'viewer');
  await context.fetch('./assets/ui/events-v2/daily-meta-wheel.webp');
  assert.equal(calls[1].input,'./assets/ui/events-v2/daily-meta-wheel.webp');
  assert.equal(calls[1].init.headers,undefined);
});
