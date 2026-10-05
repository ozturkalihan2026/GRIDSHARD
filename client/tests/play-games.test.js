const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto, createHash} = require('node:crypto');
const {SDK, playGamesConfig, playGamesGradle, playGamesManifest} = require('../../tools/configure-native-play-games.js');

const CLIENT = '123456789-testclient.apps.googleusercontent.com';
const STATE = 's'.repeat(43), EXCHANGE = 'e'.repeat(43);
function harness({platform='android', mismatch=false, failure=false}={}) {
  const calls = [];
  const native = {getStatus:async()=>({configured:true,gameId:'123456789',serverClientId:CLIENT}),
    signIn:async options=>{calls.push(['native',options]); if(failure)throw new Error('cancelled'); return {code:'one-use-google-code'};}};
  const context = {crypto:webcrypto, URL, TextEncoder, Uint8Array, btoa:value=>Buffer.from(value,'binary').toString('base64'),
    Capacitor:{getPlatform:()=>platform,Plugins:{GridshardPlayGames:native}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/play-games.js','utf8'),context);
  let verifier;
  const auth = {completeProviderLogin:async(exchange,options)=>{calls.push(['session',exchange,options]);return {player_id:'server-owner'};}};
  const request = async(path,init)=>{
    const body = JSON.parse(init.body); calls.push([path,body]);
    if(path.endsWith('/start'))return {configured:true, state:STATE,game_id:'123456789',server_client_id:mismatch?'different':CLIENT};
    verifier=body.code_verifier;
    assert.equal(body.code,'one-use-google-code');
    assert.equal(body.state,STATE);
    assert.equal(Object.keys(body).sort().join(','),'code,code_verifier,state');
    return {exchange:EXCHANGE};
  };
  const instance = new context.GridshardPlayGames({auth,request,apiBaseUrl:'https://play.gridshard.test'});
  return {instance,calls,getVerifier:()=>verifier};
}

test('native PGS passes only code and device proof; server selects profile',async()=>{
  const {instance,calls,getVerifier}=harness();
  assert.equal(await instance.prepare(),true);
  assert.equal((await instance.begin('own-guest','login')).player_id,'server-owner');
  const start=calls[0][1];
  assert.equal(start.mode,'login');
  assert.equal(start.code_challenge,createHash('sha256').update(getVerifier()).digest('base64url'));
  assert.equal(calls.at(-1)[1],EXCHANGE);
  assert.equal(calls.at(-1)[2].codeVerifier,getVerifier());
  assert.equal(instance.busy,false);
});
test('mismatched configuration fails before native auth; cancellation never creates a session',async()=>{
  for(const options of [{mismatch:true},{failure:true}]){
    const {instance,calls}=harness(options); await instance.prepare();
    await assert.rejects(instance.begin('guest'));
    assert.ok(!calls.some(call=>call[0]==='session'));
    if(options.mismatch)assert.ok(!calls.some(call=>call[0]==='native'));
    assert.equal(instance.busy,false);
  }
});
test('web/iOS do not start Android Play Games; no credential storage',async()=>{
  for(const platform of ['web','ios']){
    const {instance,calls}=harness({platform});
    assert.equal(await instance.prepare(),false); await assert.rejects(instance.begin('guest')); assert.deepEqual(calls,[]);
  }
  const source=fs.readFileSync('src/play-games.js','utf8');
  assert.doesNotMatch(source,/localStorage|sessionStorage|console\.|client_secret|(?:^|[,{]\s*)player_id\s*:/);
});
test('duplicate clicks cannot run concurrent sign-in',async()=>{
  const {instance}=harness(); await instance.prepare();
  const first=instance.begin('guest');
  await assert.rejects(instance.begin('guest'),/zaten sürüyor/); await first;
});
test('recovery uses public proof routes, preserves remembered owner binding and never creates a guest',async()=>{
  const {instance,calls,getVerifier}=harness();
  await instance.prepare();
  assert.equal((await instance.begin('remembered-owner','recover')).player_id,'server-owner');
  assert.equal(calls[0][0],'/auth/play-games/recovery/start');
  assert.equal(calls[0][1].expected_player_id,'remembered-owner');
  assert.equal(calls[0][1].mode,undefined);
  assert.equal(calls[0][1].code_challenge,createHash('sha256').update(getVerifier()).digest('base64url'));
  assert.equal(calls[2][0],'/auth/play-games/recovery/complete');
  assert.equal(calls[3][0],'session');
});
test('native sync pins SDK, preserves metadata/activity/provider and is idempotent',()=>{
  assert.equal(SDK,'com.google.android.gms:play-services-games-v2:22.1.0');
  const env={GRIDSHARD_PLAY_GAMES_ID:'123456789',GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID:CLIENT};
  assert.equal(playGamesConfig(env).clientId,CLIENT);
  assert.throws(()=>playGamesConfig({...env,GRIDSHARD_PLAY_GAMES_ID:''}));
  assert.throws(()=>playGamesConfig({...env,GRIDSHARD_PLAY_GAMES_ID:'123</string>'}));
  const source='<manifest><application android:label="GRIDSHARD"><activity android:name=".MainActivity"/><provider android:name="FileProvider"><meta-data android:name="paths" android:resource="@xml/paths"/></provider></application></manifest>';
  const manifest=playGamesManifest(source,true);
  assert.equal(playGamesManifest(manifest,true),manifest);
  assert.match(manifest,/GridshardApplication/);assert.match(manifest,/FileProvider/); assert.match(manifest,/APP_ID/);
  assert.match(manifest,/SUPPRESS_GAME_PROFILE_CREATION/);
  assert.doesNotMatch(playGamesManifest(manifest,false),/games\.APP_ID/);
  assert.throws(()=>playGamesManifest('<application android:name="ExistingApp"></application>',true),/korunmalı/);
  const gradle=playGamesGradle('dependencies { implementation project(\":capacitor-android\") }');
  assert.equal(playGamesGradle(gradle),gradle); assert.match(gradle,/22\.1\.0/);
  const activity=fs.readFileSync('../tools/native-templates/GridshardActivity.java','utf8');
  assert.ok(activity.indexOf('registerPlugin(GridshardPlayGames.class)')<activity.indexOf('super.onCreate'));
  const plugin=fs.readFileSync('../tools/native-templates/GridshardPlayGames.java','utf8');
  assert.match(plugin,/requestServerSideAccess\(client, false\)/);
  assert.doesNotMatch(plugin,/getPlayerId|Log\.|client_secret/);
});
