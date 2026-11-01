const test=require('node:test');
const assert=require('node:assert/strict');
const {progress,copy}=require('../src/battle/current-economy-v8.js');

test('one full counter cannot claim a completed joint bonus',()=>{
 const view=progress({current_bonus:{damage:100,defense:0,damage_threshold:100,defense_threshold:50}});
 assert.equal(view.percent,0);assert.equal(view.damagePercent,100);assert.equal(view.defensePercent,0);
 assert.match(view.text,/100\/100.*0\/50/);
});
test('both real owner counters are rendered and joint progress follows the smaller fraction',()=>{
 const view=progress({current_bonus:{damage:150,defense:49,damage_threshold:100,defense_threshold:50}},true);
 assert.equal(view.percent,98);assert.equal(view.damagePercent,100);assert.equal(view.defensePercent,98);
 assert.match(view.text,/Defense HP lost 49\/50/);
});
test('missing, negative or invalid snapshot values cannot create progress',()=>{
 assert.equal(progress().percent,0);
 const v=progress({current_bonus:{damage:-10,defense:'bad',damage_threshold:0,defense_threshold:0}});
 assert.equal(v.percent,0);assert.doesNotMatch(v.text,/NaN/);
});
test('both languages teach AND, actual Defense HP and the passive recovery',()=>{
 assert.match(copy.tr.bonus,/VE Savunma/);assert.match(copy.en.bonus,/AND.*Defense/);
 assert.match(copy.tr.detail,/Engellenen hasar/);assert.match(copy.tr.passive,/7.*12.*3/);
 assert.match(copy.en.core,/talents.*as described/);
});
