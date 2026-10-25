const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
const start=source.indexOf('  async function fetchWithDeadline('), end=source.indexOf('  function recordProductEvent(',start);
assert.ok(start>0&&end>start);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
  const timers=new Map(), calls=[], bodies=[];let id=0;
  const context=vm.createContext({AbortController, Error, JSON,
    window:{setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(key){timers.delete(key);}},
    fetch:async(url,options)=>{
      calls.push({url,options});
      return {ok:true,status:200,text:()=>new Promise((resolve,reject)=>{
        const abort=()=>reject(new Error('body aborted'));
        options.signal.addEventListener('abort',abort,{once:true});
        bodies.push({resolve:value=>{options.signal.removeEventListener('abort',abort);resolve(value);}});
      })};
    }});
  vm.runInContext(source.slice(start,end)+';this.request=requestJsonWithDeadline;this.raw=fetchWithDeadline;',context);
  const fire=ms=>{const entry=[...timers].find(([,value])=>value.ms===ms);assert.ok(entry,`missing ${ms}ms timer`);
    timers.delete(entry[0]);entry[1].fn();};
  return {context,timers,calls,bodies,fire};
}
test('a stalled response body remains under the deadline, aborts and releases its timer',async()=>{
  const f=fixture();
  const pending=f.context.raw('/read',{},200,response=>response.text());await flush();
  assert.equal(f.bodies.length,1);assert.equal(f.timers.size,1,'headers must not clear the deadline');
  f.fire(200);
  await assert.rejects(pending,error=>error.code==='request_timeout');
  assert.equal(f.calls[0].options.signal.aborted,true);assert.equal(f.timers.size,0);
});
test('a complete body returns parsed data and releases the timer without aborting',async()=>{
  const f=fixture(), pending=f.context.request('/read',{},200);await flush();
  f.bodies[0].resolve('{"value":7}');
  assert.equal((await pending).value,7);assert.equal(f.timers.size,0);
  assert.equal(f.calls[0].options.signal.aborted,false);
});
test('a consumer catching AbortError cannot turn an expired deadline into success',async()=>{
  const f=fixture(), pending=f.context.raw('/read',{},200,response=>response.text().catch(()=>''));
  await flush();f.fire(200);await assert.rejects(pending,error=>error.code==='request_timeout');
  assert.equal(f.timers.size,0);
});
test('an idempotent mutation can retry a body timeout with the exact same receipt/body',async()=>{
  const f=fixture(), options={method:'POST',body:JSON.stringify({request_id:'same-receipt',value:1})};
  const pending=f.context.request('/mutation',options,200);await flush();f.fire(200);await flush();
  f.fire(150);await flush();assert.equal(f.calls.length,2);
  assert.equal(f.calls[0].options.body,f.calls[1].options.body);
  f.bodies[1].resolve('{"accepted":true}');assert.equal((await pending).accepted,true);assert.equal(f.timers.size,0);
});
test('a mutation without an idempotency key never retries a timed-out body',async()=>{
  const f=fixture(), pending=f.context.request('/mutation',{method:'POST',body:'{}'},200);
  await flush();f.fire(200);await assert.rejects(pending,error=>error.code==='request_timeout');
  assert.equal(f.calls.length,1);assert.equal(f.timers.size,0);
});
test('invalid JSON releases the body deadline and is not retried as a network failure',async()=>{
  const f=fixture(), pending=f.context.request('/read',{},200);await flush();f.bodies[0].resolve('not-json');
  await assert.rejects(pending,error=>error.status===200);assert.equal(f.timers.size,0);assert.equal(f.calls.length,1);
});
