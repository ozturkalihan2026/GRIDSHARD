"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
function choose(state,read=[]){const start=source.indexOf("  function preferredRewardInboxTab()"),end=source.indexOf("  async function loadRewardInbox",start);
  const sandbox={rewardInboxState:state,activeInboxTab:"reward",inboxReadStore:new Set(read),inboxReadKey:item=>item.notice_id};
  vm.runInNewContext(source.slice(start,end)+";this.choose=preferredRewardInboxTab",sandbox);return sandbox.choose();}
test("inbox opens the category holding the newest actionable or unread message",()=>{
  assert.equal(choose({purchases:[{notice_id:"p",created_at:"2026-10-22T01:00:00Z"}]}),"purchase");
  assert.equal(choose({notices:[{notice_id:"s",created_at:"2026-10-22T02:00:00Z"}],purchases:[{notice_id:"p",created_at:"2026-10-22T01:00:00Z"}]}),"system");
  assert.equal(choose({messages:[{status:"unclaimed",category:"battle"}]}),"battle");
  assert.equal(choose({messages:[{status:"unclaimed",category:"season"}]}),"reward");
  assert.equal(choose({invitations:[{status:"pending",incoming:true}]}),"battle");
});
test("read messages provide a non-empty fallback without overriding actionable rewards",()=>{
  assert.equal(choose({notices:[{notice_id:"s",seen:true}]}),"system");
  assert.equal(choose({purchases:[{notice_id:"p",seen:false}]},["p"]),"purchase");
  assert.equal(choose({invitations:[],messages:[{status:"claimed",category:"battle"}]}),"reward");
  assert.equal(choose({notices:[{notice_id:"s",seen:true}],messages:[{status:"unclaimed",category:"battle"}]}),"battle");
});
